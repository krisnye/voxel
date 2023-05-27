#version 300 es
precision highp float;
uniform float resolution;
uniform mat4 worldToTexel;
uniform mat4 texelToWorld;
// @end-defs

struct TraceResult {
    vec4 position;
    ivec3 cell;
    vec4 normal;
    bool hit;
    bool error;
};

vec3 sort3(vec3 v) {
    // Manual bubble sort:
    if (v.x > v.y) v.xy = v.yx;
    if (v.y > v.z) v.yz = v.zy;
    if (v.x > v.y) v.xy = v.yx;
    return v;
}

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

    int stepIter = 0;
    bool hasEnteredVolume = false;
    while(stepIter++ < int(resolution) * 3) {

        vec3 cellMin = floor(pos);
        vec3 cellMax = cellMin + vec3(1.0);
        vec3 dtMin = (cellMin - pos) / heading;
        vec3 dtMax = (cellMax - pos) / heading;
        vec3 dts = max(dtMin, dtMax);

        vec3 previousPos = pos;
        pos += heading;

        ivec3 iposTarget = ivec3(pos);
        ivec3 iposDelta = iposTarget - ipos;
        vec3 currentDts = dts;
        // Step through each x/y/z face crossed in order of time to impact.
        for (int i = 0; i < 3; i++) {

            // Pick the nearest face we haven't stepped through yet.
            float minDt = min(currentDts.x, min(currentDts.y, currentDts.z));
            if(minDt == currentDts.x) {
                currentDts.x = 1e+15;
                ipos.x += iposDelta.x;
            } else if(minDt == currentDts.y) {
                currentDts.y = 1e+15;
                ipos.y += iposDelta.y;
            } else if(minDt == currentDts.z) {
                currentDts.z = 1e+15;
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

            bool occupied = getIsOccupided(ipos, 0u);
            if (!occupied)
                continue;
            
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

}

