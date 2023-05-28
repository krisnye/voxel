#version 300 es
precision highp float;
uniform float resolution;
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

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld, vec3 initialNormalWorld ) {
    TraceResult result;

    vec3 texSize = vec3(resolution);
    uint uMaxLod = uint(maxLod);

    // Convert to texel space.
    vec3 pos = multVec3(worldToTexel, posWorld, 1.0);
    vec3 initialNormal = normalize(multVec3(worldToTexel, initialNormalWorld, 0.0));
    vec3 heading = normalize( multVec3(worldToTexel, headingWorld, 0.0) );

    if (getIsOccupided(ivec3(pos), 0u)) {
        result.normal.xyz = initialNormalWorld;
        result.position = vec4(posWorld, 1.0);
        result.hit = true;
        return result;
    }

    // Todo: Step to the edge of the volume before raymarching.
    vec2 intersectTime = intersectAABB( pos, heading, vec3(0), vec3(resolution) );
    float nearTime = intersectTime.x;
    if (intersectTime.x > intersectTime.y) {
        result.error = true;
        return result;
    }
    if (nearTime > 1.0)
        pos += heading * (nearTime  - .001);

    // Offset a bit by our normal so we don't start inside a voxel.
    pos += initialNormal * .001;

    ivec3 ipos = ivec3(pos);
    uint lodLevel = uMaxLod;

    while (lodLevel > 0u && getIsOccupided(ipos, lodLevel))
        lodLevel--;

    int stepIter = 0;
    bool hasEnteredVolume = false;
    uint consecutiveEmpties = 0u;
    while(stepIter++ < int(256)) {

        float stepSize = float(1 << lodLevel);
        vec3 displacement = heading * stepSize;

        vec3 cellMin = floor(pos / stepSize) * stepSize;
        vec3 cellMax = cellMin + vec3(stepSize);
        vec3 dtMin = (cellMin - pos) / displacement;
        vec3 dtMax = (cellMax - pos) / displacement;
        vec3 dts = max(dtMin, dtMax);

        vec3 previousPos = pos;
        pos += displacement;

        ivec3 iposTarget = ivec3(pos);
        ivec3 iposDelta = iposTarget - ipos;
        vec3 currentDts = dts;
        // Step through each x/y/z face crossed in order of time to impact.
        for (int i = 0; i < 3; i++) {

            // Pick the nearest face we haven't stepped through yet.
            float dt = min(currentDts.x, min(currentDts.y, currentDts.z));
            if(dt == currentDts.x) {
                currentDts.x = 1e+15;
                if (iposDelta.x == 0) continue;
                ipos.x += iposDelta.x;
            } else if(dt == currentDts.y) {
                currentDts.y = 1e+15;
                if (iposDelta.y == 0) continue;
                ipos.y += iposDelta.y;
            } else if(dt == currentDts.z) {
                currentDts.z = 1e+15;
                if (iposDelta.z == 0) continue;
                ipos.z += iposDelta.z;
            } else {
                break;
            }

            bool isOutOfBounds = 
                ipos.x < 0 || ipos.x >= int(texSize.x) ||
                ipos.y < 0 || ipos.y >= int(texSize.y) ||
                ipos.z < 0 || ipos.z >= int(texSize.z);
                
            if(isOutOfBounds) {
                if (hasEnteredVolume) {
                    result.hit = false;
                    return result;
                }
                continue;
            }

            hasEnteredVolume = true;

            result.voxelReads++;
            bool occupied = getIsOccupided(ipos, lodLevel);
            if (!occupied) {
                consecutiveEmpties++;

                if (consecutiveEmpties > 8u && lodLevel + 1u <= uMaxLod) {
                    result.voxelReads++;
                    bool largerLodOccupied = getIsOccupided(ipos, lodLevel + 1u);
                    if (!largerLodOccupied)
                        lodLevel++;
                }

                continue;
            }
            consecutiveEmpties = 0u;

            if (lodLevel > 0u) {
                lodLevel--;
                pos = previousPos + displacement * (dt - .001);
                ipos = ivec3(pos);
                break;
            }
            
            result.hit = true;
            result.cell = ipos;

            vec3 hitPos = previousPos + heading * dt;
            result.position = texelToWorld * vec4(hitPos, 1.0);

            if(dt == dts.x)
                result.normal.x = -sign(heading.x);
            else if(dt == dts.y)
                result.normal.y = -sign(heading.y);
            else //if(dt == dts.z)
                result.normal.z = -sign(heading.z);
            //
            result.normal = normalize(texelToWorld * result.normal);
            
            return result;

        }

    }

    return result;

}

