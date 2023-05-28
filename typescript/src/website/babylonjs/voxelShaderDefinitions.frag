#version 300 es
precision highp float;
uniform float resolution;
uniform uint maxLod;
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

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld, vec3 initialNormalWorld ) { //, mediump sampler3D voxels, mat4 worldToTexel) {
    TraceResult result;

    vec3 texSize = vec3(resolution);

    // Convert to texel space.
    vec3 pos = multVec3(worldToTexel, posWorld, 1.0);
    vec3 initialNormal = normalize(multVec3(worldToTexel, initialNormalWorld, 0.0));
    vec3 heading = normalize( multVec3(worldToTexel, headingWorld, 0.0) );

    // Offset a bit by our normal so we don't start inside a voxel.
    pos += initialNormal * .001;

    ivec3 ipos = ivec3(pos);
    uint lodLevel = 5u;

    int stepIter = 0;
    bool hasEnteredVolume = false;
    while(stepIter++ < int(resolution)) {

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
            float minDt = min(currentDts.x, min(currentDts.y, currentDts.z));
            if(minDt == currentDts.x) {
                currentDts.x = 1e+15;
                if (iposDelta.x == 0) continue;
                ipos.x += iposDelta.x;
            } else if(minDt == currentDts.y) {
                currentDts.y = 1e+15;
                if (iposDelta.y == 0) continue;
                ipos.y += iposDelta.y;
            } else if(minDt == currentDts.z) {
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

                uint largerLod = lodLevel + 1u;
                if (largerLod <= 5u) {
                    bool largerLodOccupied = getIsOccupided(ipos, largerLod);
                    if (!largerLodOccupied)
                        lodLevel = largerLod;
                }

                continue;
            }

            if (lodLevel > 0u) {
                lodLevel--;
                pos = previousPos + displacement * (minDt - .00001);
                ipos = ivec3(pos);
                break;
            }
            
            result.hit = true;
            result.cell = ipos;

            vec3 hitPos = previousPos + heading * minDt;
            result.position = texelToWorld * vec4(hitPos, 1.0);

            if(minDt == dts.x)
                result.normal.x = -sign(heading.x);
            else if(minDt == dts.y)
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

