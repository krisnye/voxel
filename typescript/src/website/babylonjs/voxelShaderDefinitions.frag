#version 300 es
precision highp float;
uniform float resolution;
uniform mat4 worldToTexel;
// @end-defs

struct TraceResult {
    vec4 position;
    ivec3 cell;
    vec4 normal;
    uint materialId;
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

const int testVolumeWidth = 200;
uvec4 calcPlaceholderTexel(ivec3 pos) {
    uvec4 result = uvec4(0);

    vec3 posf = vec3(pos);
    float radius = float(testVolumeWidth) / 2.0;
    
    float l = length(posf - vec3(radius - .5));
    if (l < radius) result.r = 1u;
    
    return result;
}

uvec4 getTexel(ivec3 pos) {
    // @get-texel
    return uvec4(0u);
}
vec3 getDiffuse(TraceResult traceResult) {
    // @get-diffuse
    return vec3(0.0);
}

const int maxFudgeIters = 2;

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld, vec3 initialNormalWorld ) { //, mediump sampler3D voxels, mat4 worldToTexel) {
    TraceResult result;

    vec3 texSize = vec3(resolution);

    // Convert to texel space.
    vec3 pos = multVec3(worldToTexel, posWorld, 1.0);
    vec3 initialNormal = normalize(multVec3(worldToTexel, initialNormalWorld, 0.0));
    vec3 heading = normalize( multVec3(worldToTexel, headingWorld, 0.0) );

    // Offset a bit by our normal so we don't start inside a voxel.
    pos += initialNormal * .001;

    int stepIter = 0;
    bool hasEnteredVolume = false;
    while(stepIter++ < int(texSize.x) * 3) {
        vec3 cellMin = floor(pos);
        vec3 cellMax = cellMin + vec3(1.0);

        vec3 dts;
        float dt;
        float fudge;
        int fudgeIter = 0;
        while (fudgeIter++ < maxFudgeIters) {
            vec3 dtMin = (cellMin - pos) / heading;
            vec3 dtMax = (cellMax - pos) / heading;
            dts = max(dtMin, dtMax);
            vec3 dtSort = sort3(dts);
            dt = dtSort.x;

            // Time difference between closest face and second closest face.
            float gap = dtSort.y - dt;

            fudge = min(0.5, gap * 0.5);
            if (fudge < 0.0001) {
                // Small fudge values are numerically unstable.
                // Nudge the ray to try and break the tie.
                pos = mix(pos, cellMin + vec3(.5, .25, .125), 0.01);
                result.error = true;
            } else {
                result.error = false;
                break;
            }
        }

        pos += heading * (dt + fudge);

        bool isOutOfBounds = 
            pos.x < 0.0 || pos.x >= texSize.x ||
            pos.y < 0.0 || pos.y >= texSize.y ||
            pos.z < 0.0 || pos.z >= texSize.z;
            
        if(isOutOfBounds) {
            if (hasEnteredVolume) {
                result.hit = false;
                return result;
            }
            continue;
        }

        hasEnteredVolume = true;

        uvec4 texel = getTexel(ivec3(pos));
        uint materialId = texel.r;

        if (materialId <= 0u)
            continue;

        result.normal = vec4(0.0);
        if(dt == dts.x)
            result.normal.x = -sign(heading.x);
        else if(dt == dts.y)
            result.normal.y = -sign(heading.y);
        else //if(dt == dts.z)
            result.normal.z = -sign(heading.z);

        mat4 texelToWorld = inverse(worldToTexel);
        result.normal = normalize(texelToWorld * result.normal);
        result.cell = ivec3(pos);
        result.position = texelToWorld * vec4(pos, 1.0);
        result.materialId = materialId;
        result.hit = true;

        return result;

    }

}
