#version 300 es
precision highp float;
uniform vec3 resolution;
uniform float maxLod;
uniform mat4 worldToTexel;
uniform mat4 texelToWorld;
// @end-defs

struct TraceResult {
    vec4 position;
    ivec3 cell;
    vec4 normal;
    bool hit;
    bool error;
    uint voxelReads;
};

vec3 multVec3(mat4 mat, vec3 v, float w) {
    return (mat * vec4(v, w)).xyz;
}

const int testVolumeWidth = 100;
bool getIsOccupided_placeHolder(ivec3 pos, uint lod) {
    bool result = false;

    vec3 posf = vec3(pos);
    float radius = float(testVolumeWidth) / 2.0;
    
    float l = length(posf - vec3(radius - .5));
    if (l < radius) result = true;
    
    return result;
}

vec3 getDiffuse(TraceResult traceResult) {
    // @get-diffuse
    return vec3(0.0);
}
bool getIsOccupided(ivec3 pos, uint lod) {
    // @get-is-occupied
    return true;
}

// Source https://gist.github.com/DomNomNom/46bb1ce47f68d255fd5d
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
    vec3 tMin = (boxMin - rayOrigin) / rayDir;
    vec3 tMax = (boxMax - rayOrigin) / rayDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
}

vec3 sort3(vec3 a) {
    // Manual bubble sort.
    if (a.y < a.x) a.xy = a.yx;
    if (a.z < a.y) a.yz = a.zy;
    if (a.y < a.x) a.xy = a.yx;
    return a;
}

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld, vec3 initialNormalWorld ) {
    TraceResult result;

    uint uMaxLod = uint(maxLod);

    // Convert to texel space.
    vec3 pos = multVec3(worldToTexel, posWorld, 1.0);
    vec3 heading = normalize( multVec3(worldToTexel, headingWorld, 0.0) );

    if (getIsOccupided(ivec3(pos), 0u)) {
        result.normal.xyz = -headingWorld;
        result.position = vec4(posWorld + headingWorld * .001, 1.0);
        result.hit = true;
        return result;
    }

    // Todo: Step to the edge of the volume before raymarching.
    vec2 intersectTime = intersectAABB( pos, heading, vec3(0.0), resolution );
    float nearTime = intersectTime.x;
    if (intersectTime.x > intersectTime.y) {
        result.error = true;
        return result;
    }
    if (nearTime > 1.0)
        pos += heading * (nearTime  - .001);

    vec3 startPos = pos;
    ivec3 ipos = ivec3(floor(pos));
    uint lodLevel = uMaxLod;
    uint consecutiveEmpties = 0u;

    while (lodLevel > 0u && getIsOccupided(ipos, lodLevel))
        lodLevel--;

    for(int stepIter = 0; stepIter < int(256); stepIter++) {

        float stepSize = float(1 << lodLevel);
        vec3 displacement = heading * stepSize;

        vec3 cellMin = floor(pos / stepSize) * stepSize;
        vec3 cellMax = cellMin + vec3(stepSize);
        vec3 dtMin = (cellMin - pos) / displacement;
        vec3 dtMax = (cellMax - pos) / displacement;
        vec3 dts = max(dtMin, dtMax);

        vec3 previousPos = pos;
        pos += displacement;

        ivec3 iposTarget = ivec3(floor(pos));
        ivec3 iposDelta = iposTarget - ipos;
        
        vec3 sortedDts = sort3(dts);

        // Step through each x/y/z face crossed in order of time to impact.
        for (int i = 0; i < 3; i++) {

            float dt = sortedDts[i];
            bvec3 mask = equal(vec3(dt), dts);
            ipos += iposDelta * ivec3(mask);

            bool isOutOfBounds = 
                ipos.x < 0 || ipos.x >= int(resolution.x) ||
                ipos.y < 0 || ipos.y >= int(resolution.y) ||
                ipos.z < 0 || ipos.z >= int(resolution.z);
                
            if(isOutOfBounds)
                return result;

            result.voxelReads++;
            bool occupied = getIsOccupided(ipos, lodLevel);
            if (!occupied) {
                consecutiveEmpties++;
                if (consecutiveEmpties > 4u && lodLevel + 1u <= uMaxLod) {
                    result.voxelReads++;
                    bool largerLodOccupied = getIsOccupided(ipos, lodLevel + 1u);
                    if (!largerLodOccupied)
                        lodLevel++;
                    else
                        consecutiveEmpties = 0u;
                }
                continue;
            }
            consecutiveEmpties = 0u;

            // Todo: Compute distance-based-lod in a way that different fragments would agree.
            vec3 octreeCellCenter = floor(vec3(ipos) / stepSize) * stepSize + vec3(stepSize * .5);
            float dist = dot(octreeCellCenter - startPos, heading);
             // Todo: Pull this out into a uniform.
            float lodFactor = .00125;
            if (stepSize > dist * lodFactor && lodLevel > 0u) {
                lodLevel--;
                // Even if we're crossing a whole octree-cell, going 75% of the way should
                // `put us in the middle of the child cell adjacent to the obstacle.
                pos = previousPos + displacement * dt * .75;
                ipos = ivec3(floor(pos));
                break;
            }
            
            result.hit = true;
            result.cell = ipos;
            vec3 hitPos = previousPos + displacement * dt;
            result.position = texelToWorld * vec4(hitPos, 1.0);
            result.normal.xyz = -sign(heading) * vec3(mask);
            result.normal = normalize(texelToWorld * result.normal);
            return result;

        }

    }

    return result;

}

