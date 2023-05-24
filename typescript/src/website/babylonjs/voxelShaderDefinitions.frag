#version 300 es
precision highp float;

struct TraceResult {
    vec4 position;
    vec4 normal;
    int materialId;
    bool hit;
};

const int testVolumeWidth = 50;

vec4 calcPlaceholderTexel(ivec3 pos) {
    pos = clamp(pos, ivec3(0), ivec3(testVolumeWidth));
    vec4 result = vec4(0.0, 0.0, 0.0, 0.0);

    vec3 posf = vec3(pos);
    float testVolumeWidthF = float(testVolumeWidth);
    float radius = testVolumeWidthF / 2.0;

    // vec3 delta = abs(radius - posf);
    // if ( ( delta.x + delta.y + delta.z) < radius - 1.0) result.a = 1.0;
    // if(posf.y + sin(posf.x / 5.) * 10. < radius) result.a = 1.0;
    // if(float(pos.y) < float(pos.x)) result.a = 1.0;
    // if(posf.y < radius) result.a = 1.0;

    float l = length(posf - vec3(radius));
    if (l < radius && l > radius * .5) result.a = 1.0;

    if (posf.x >= radius && posf.z >= radius)
        result.a = 0.0;

    if (pos.x <= 0 || pos.x >= testVolumeWidth - 1) result.a = 0.0;
    if (pos.y <= 0 || pos.y >= testVolumeWidth - 1) result.a = 0.0;
    if (pos.z <= 0 || pos.z >= testVolumeWidth - 1) result.a = 0.0;

    return result;
}

vec3 noSmallComponents(vec3 v) {
    const float eps = 0.0025;
    return sign(v) * max(abs(v), vec3(eps));
}

vec3 sort3(vec3 v) {
    // Manual bubble sort:
    if (v.x > v.y) v.xy = v.yx;
    if (v.y > v.z) v.yz = v.zy;
    if (v.x > v.y) v.xy = v.yx;
    return v;
}

TraceResult raytraceVoxels(vec3 posWorld, vec3 headingWorld) { //, mediump sampler3D voxels, mat4 worldToTexel) {
    TraceResult result;

    headingWorld = noSmallComponents(headingWorld);

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
    vec3 heading = (worldToTexel * vec4(headingWorld, 0.0)).xyz;
    heading = noSmallComponents( normalize( heading ) );

    // pos -= heading * 1.0;

    int iter = 0;
    bool hasEnteredVolume = false;
    while(iter++ <= testVolumeWidth * 3) {
        vec3 cellMin = floor(pos);
        vec3 cellMax = cellMin + vec3(1.0);

        vec3 dtMin = noSmallComponents((cellMin - pos) / heading);
        vec3 dtMax = noSmallComponents((cellMax - pos) / heading);
        vec3 dts = max(dtMin, dtMax);
        vec3 dtSort = sort3(dts);
        float dt = dtSort.x;
        float gap = dtSort.y - dt; // Time difference between closest face and second closest face.
        float fudge = min(0.001, gap * 0.5);
        pos += heading * (dt + fudge);

        // vec4 texel = texelFetch(voxels, ivec3(pos + heading * .25), 0);
        vec4 texel = calcPlaceholderTexel(ivec3(pos));
        int materialId = int(texel.a);

        if(materialId > 0) {

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

        bool isOutOfBounds = 
            pos.x < 0.0 || pos.x > texSize.x ||
            pos.y < 0.0 || pos.y > texSize.y ||
            pos.z < 0.0 || pos.z > texSize.z;
        if(isOutOfBounds) {
            if (hasEnteredVolume) {
                result.hit = false;
                return result;
            }
        } else {
            hasEnteredVolume = true;
        }
    }

}