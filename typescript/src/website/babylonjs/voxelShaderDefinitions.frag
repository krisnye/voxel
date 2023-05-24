#version 300 es
precision highp float;

struct TraceResult {
    vec4 position;
    vec4 normal;
    int materialId;
    bool hit;
};

const int testVolumeWidth = 200;

vec4 calcPlaceholderTexel(ivec3 pos) {
    vec4 result = vec4(0.0, 0.0, 0.0, 0.0);

    vec3 posf = vec3(pos);
    float testVolumeWidthF = float(testVolumeWidth);
    float radius = testVolumeWidthF / 2.0;
    
    // if(posf.y + sin(posf.x / 5.) * 10. < radius) result.a = 1.0;
    
    // if(posf.y < testVolumeWidthF - posf.z) result.a = 1.0;

    // if(posf.y < radius) result.a = 1.0;

    float l = length(posf - vec3(radius));
    if (l < radius) result.a = 1.0;
    // if (l < radius * .5) result.a = 0.0;

    // if (posf.x >= radius && posf.z >= radius && posf.y >= radius)
    //     result.a = 0.0;

    vec3 delta = abs(radius - posf);
    if ( ( delta.x + delta.z) < radius - posf.y) result.a = 1.0;

    // if (l < radius * .6) result.a = 0.0;
    
    // result.a = 1.0;

    return result;
}

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

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld, vec3 initialNormalWorld) { //, mediump sampler3D voxels, mat4 worldToTexel) {
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
    vec3 pos = multVec3(worldToTexel, posWorld, 1.0);
    vec3 initialNormal = normalize(multVec3(worldToTexel, initialNormalWorld, 0.0));
    vec3 heading = normalize( multVec3(worldToTexel, headingWorld, 0.0) );

    // Offset a bit by our normal so we don't start inside a voxel.
    pos += initialNormal * .001;

    int iter = 0;
    bool hasEnteredVolume = false;
    while(iter++ <= testVolumeWidth * 3) {
        vec3 cellMin = floor(pos);
        vec3 cellMax = cellMin + vec3(1.0);

        vec3 dtMin = (cellMin - pos) / heading;
        vec3 dtMax = (cellMax - pos) / heading;
        vec3 dts = max(dtMin, dtMax);
        vec3 dtSort = sort3(dts);
        float dt = dtSort.x;
        float gap = dtSort.y - dt; // Time difference between closest face and second closest face.
        float fudge = min(0.5, gap * 0.5);
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

        // vec4 texel = texelFetch(voxels, ivec3(pos), 0);
        vec4 texel = calcPlaceholderTexel(ivec3(pos));
        int materialId = int(texel.a);

        if (materialId <= 0)
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
        result.position = texelToWorld * vec4(pos, 1.0);
        result.materialId = materialId;
        result.hit = true;

        return result;

    }

}