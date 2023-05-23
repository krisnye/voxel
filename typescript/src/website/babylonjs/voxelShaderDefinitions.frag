#version 300 es
precision highp float;

struct TraceResult {
    vec4 position;
    vec4 normal;
    int materialId;
    bool hit;
};

const int testVolumeWidth = 100;

vec4 calcPlaceholderTexel(ivec3 pos) {
    pos = clamp(pos, ivec3(0), ivec3(testVolumeWidth));
    vec4 result = vec4(0.0, 0.0, 0.0, 0.0);

    // if(float(pos.y) + sin(float(pos.x)) * 3.0 < 10.0)

    vec3 delta = abs(vec3(testVolumeWidth / 2) - vec3(pos));
    if ( ( delta.x + delta.y + delta.z) < float(testVolumeWidth / 2))
    // if(float(pos.y) < float(pos.x))
    // if(float(pos.y) < 10.0)
        result.a = 1.0;

    return result;
}

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld) { //, mediump sampler3D voxels, mat4 worldToTexel) {
    TraceResult result;

    // vec3 texSize = vec3(textureSize(voxels, 0));
    vec3 texSize = vec3(testVolumeWidth);
    vec3 boxSize = vec3(1.0);
    vec3 s = texSize / boxSize;
    mat4 worldToTexel = mat4(
        s.x, 0.0, 0.0, 0.0, 
        0.0, s.y, 0.0, 0.0, 
        0.0, 0.0, s.z, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    // Convert to texel space.
    vec3 pos = (worldToTexel * vec4(posWorld, 1.0)).xyz;
    vec3 heading = normalize(worldToTexel * vec4(headingWorld, 0.0)).xyz;

    pos -= heading * 1.0;

    int iter = 0;
    bool hasEnteredVolume = false;
    while(iter++ <= 1000) {
        // vec3 cellMin = floor(pos + heading * .1);
        vec3 cellMin = floor(pos + heading * .0);
        vec3 cellMax = cellMin + vec3(1.0);

        vec3 dtMin = (cellMin - pos) / heading;
        vec3 dtMax = (cellMax - pos) / heading;
        vec3 dts = max(dtMin, dtMax);
        float dt = min(dts.x, min(dts.y, dts.z));

        pos += heading * (dt + 0.01);
        // pos += heading * (dt + 0.0);

        // vec4 texel = texelFetch(voxels, ivec3(pos + heading * .25), 0);
        // vec4 texel = calcPlaceholderTexel(ivec3(pos + heading * .25));
        vec4 texel = calcPlaceholderTexel(ivec3(pos + heading * .0));
        int materialId = int(texel.a);

        if(materialId > 0) {
            result.normal = vec4(0.0);
            if(dt == dts.x)
                result.normal.x = -sign(heading.x);
            else if(dt == dts.y)
                result.normal.y = -sign(heading.y);
            else if(dt == dts.z)
                result.normal.z = -sign(heading.z);

            mat4 texelToWorld = inverse(worldToTexel);
            result.normal = normalize(texelToWorld * result.normal);
            result.position = texelToWorld * vec4(pos, 1.0);
            result.materialId = materialId;
            result.hit = true;

            return result;
        }

        if(pos.x < 0.0 || pos.x > texSize.x ||
            pos.y < 0.0 || pos.y > texSize.y ||
            pos.z < 0.0 || pos.z > texSize.z) {
            if (hasEnteredVolume) {
                result.hit = false;
                return result;
            }
        } else {
            hasEnteredVolume = true;
        }
    }

}