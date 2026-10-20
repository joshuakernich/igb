/*
 * Glint: the shaders, as GLSL ES 3.00 source built from feature defines.
 *
 * The lit shader is physically based: GGX specular with height-correlated
 * Smith visibility and Schlick Fresnel, Lambert diffuse, image-based light
 * from a prefiltered environment (with multiple-scattering energy
 * compensation), clearcoat as a second specular lobe, Charlie sheen, a thin
 * film tint for iridescence, soft PCF shadows with rotated Poisson taps,
 * and geometric specular anti-aliasing. Everything renders in linear HDR;
 * the post pass tone maps.
 */

export const MAX_DIR = 2;
export const MAX_POINT = 8;

const HEADER = (defines) => `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
precision highp sampler2DShadow;
${Object.entries(defines).filter(([, v]) => v !== false && v !== undefined).map(([k, v]) => `#define ${k}${v === true ? '' : ' ' + v}`).join('\n')}
#define PI 3.141592653589793
#define RECIPROCAL_PI 0.3183098861837907
#define MAX_DIR ${MAX_DIR}
#define MAX_POINT ${MAX_POINT}
`;

// Back from the tone mapper: the HDR colour that tone maps to y (so an
// unlit "toneMapped: false" colour shows exactly as given, and blooms).
const UNTONEMAP = `
uniform float exposure;
vec3 untonemap(vec3 y) {
	const mat3 ACES_IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
	const mat3 ACES_OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
	vec3 v = clamp(inverse(ACES_OUT) * clamp(y, 0.0, 1.0), 0.0, 1.0);
	vec3 A = 1.0 - 0.983729 * v;
	vec3 B = 0.0245786 - 0.4329510 * v;
	vec3 C = -0.000090537 - 0.238081 * v;
	vec3 x = (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A);
	return max(inverse(ACES_IN) * x, 0.0) * 0.6 / max(exposure, 1e-4);
}
`;

const LOGDEPTH_FRAG = `
#ifdef LOGDEPTH
	gl_FragDepth = log2(vFragDepth) * logDepthFC * 0.5;
#endif
`;

/* ---------- the lit (and unlit) mesh shader ---------- */

export function standardSource(defines) {
	const vs = HEADER(defines) + `
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;
layout(location = 3) in vec4 color;
#ifdef INSTANCED
layout(location = 4) in mat4 instanceMatrix;
layout(location = 8) in vec3 instanceColor;
#endif
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 uvTransform;
#ifdef SHADOW
uniform mat4 shadowMatrix;
uniform float shadowNormalBias;
out vec4 vShadow;
#endif
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vColor;
#ifdef LOGDEPTH
out float vFragDepth;
#endif
void main() {
	mat4 M = modelMatrix;
#ifdef INSTANCED
	M = modelMatrix * instanceMatrix;
	mat3 NM = transpose(inverse(mat3(M)));
#else
	mat3 NM = normalMatrix;
#endif
	vec4 w = M * vec4(position, 1.0);
	vWorld = w.xyz;
	vNormal = normalize(NM * normal);
	vUv = (uvTransform * vec3(uv, 1.0)).xy;
	vColor = vec4(1.0);
#ifdef VCOLOR
	vColor = color;
#endif
#ifdef ICOLOR
	vColor.rgb *= instanceColor;
#endif
#ifdef SHADOW
	vShadow = shadowMatrix * vec4(w.xyz + vNormal * shadowNormalBias, 1.0);
#endif
	gl_Position = projectionMatrix * viewMatrix * w;
#ifdef LOGDEPTH
	vFragDepth = 1.0 + gl_Position.w;
#endif
}
`;

	const fs = HEADER(defines) + `
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in vec4 vColor;
#ifdef SHADOW
in vec4 vShadow;
#endif
#ifdef LOGDEPTH
in float vFragDepth;
uniform float logDepthFC;
#endif
out vec4 fragColor;

uniform vec3 diffuse;
uniform float opacity;
uniform float alphaTest;
uniform vec3 cameraPosition;
#ifdef MAP
uniform sampler2D map;
#endif
#ifdef FOG
uniform vec3 fogColor;
uniform vec3 fogParams;   // near, far, density (density > 0: exponential squared)
#endif
${UNTONEMAP}

#ifndef UNLIT
uniform float roughness;
uniform float metalness;
uniform vec3 emissive;
uniform float envMapIntensity;
#ifdef NORMALMAP
uniform sampler2D normalMap;
uniform vec2 normalScale;
#endif
#ifdef EMISSIVEMAP
uniform sampler2D emissiveMap;
#endif
#ifdef ROUGHMAP
uniform sampler2D roughnessMap;
#endif
#ifdef METALMAP
uniform sampler2D metalnessMap;
#endif
#ifdef CLEARCOAT
uniform float clearcoat;
uniform float clearcoatRoughness;
#endif
#ifdef SHEEN
uniform float sheen;
uniform vec3 sheenColor;
uniform float sheenRoughness;
#endif
#ifdef IRIDESCENCE
uniform float iridescence;
uniform float iridescenceThickness;
#endif
#ifdef TRANSMISSION
uniform float transmission;
#endif

uniform vec3 ambientColor;
uniform vec3 hemiSky;
uniform vec3 hemiGround;
uniform int numDir;
uniform vec3 dirColor[MAX_DIR];
uniform vec3 dirDirection[MAX_DIR];
uniform int numPoint;
uniform vec3 pointColor[MAX_POINT];
uniform vec3 pointPosition[MAX_POINT];
uniform vec2 pointFalloff[MAX_POINT];
#ifdef SHADOW
uniform sampler2DShadow shadowMap;
uniform vec2 shadowTexel;
uniform float shadowRadius;
uniform float shadowBias;
#endif
#ifdef ENVMAP
uniform samplerCube envRadiance;
uniform samplerCube envIrradiance;
uniform float envMaxLod;
uniform float envIntensity;
#endif

float pow2(float x) { return x * x; }
float pow5(float x) { float x2 = x * x; return x2 * x2 * x; }
vec3 F_Schlick(vec3 f0, float c) { return f0 + (1.0 - f0) * pow5(1.0 - c); }
float D_GGX(float a, float NoH) {
	float a2 = a * a;
	float d = NoH * NoH * (a2 - 1.0) + 1.0;
	return a2 / (PI * d * d);
}
float V_SmithGGX(float a, float NoV, float NoL) {
	float a2 = a * a;
	float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
	float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
	return 0.5 / max(gv + gl, 1e-6);
}
// The split-sum environment BRDF, analytically (Karis).
vec2 envBRDF(float r, float NoV) {
	const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
	const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
	vec4 q = r * c0 + c1;
	float a004 = min(q.x * q.x, exp2(-9.28 * NoV)) * q.x + q.y;
	return vec2(-1.04, 1.04) * a004 + q.zw;
}
#ifdef SHEEN
float D_Charlie(float r, float NoH) {
	float inv = 1.0 / max(r * r, 1e-3);
	float sin2 = max(1.0 - NoH * NoH, 0.0078125);
	return (2.0 + inv) * pow(sin2, inv * 0.5) / (2.0 * PI);
}
float V_Neubelt(float NoV, float NoL) { return clamp(1.0 / (4.0 * (NoL + NoV - NoL * NoV)), 0.0, 1.0); }
#endif

#ifdef SHADOW
const vec2 POISSON[16] = vec2[](
	vec2(-0.94201624, -0.39906216), vec2(0.94558609, -0.76890725), vec2(-0.094184101, -0.92938870), vec2(0.34495938, 0.29387760),
	vec2(-0.91588581, 0.45771432), vec2(-0.81544232, -0.87912464), vec2(-0.38277543, 0.27676845), vec2(0.97484398, 0.75648379),
	vec2(0.44323325, -0.97511554), vec2(0.53742981, -0.47373420), vec2(-0.26496911, -0.41893023), vec2(0.79197514, 0.19090188),
	vec2(-0.24188840, 0.99706507), vec2(-0.81409955, 0.91437590), vec2(0.19984126, 0.78641367), vec2(0.14383161, -0.14100790));
float shadowFactor() {
	vec3 c = vShadow.xyz / vShadow.w;
	if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
	float z = c.z + shadowBias;
	// rotate the taps per pixel, so banding turns into fine grain
	float ang = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
	mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
	float s = 0.0;
	for (int i = 0; i < 16; i++) s += texture(shadowMap, vec3(c.xy + rot * POISSON[i] * shadowTexel * shadowRadius, z));
	s /= 16.0;
	// fade out toward the edges of the shadow's box
	vec2 e = smoothstep(0.0, 0.06, c.xy) * (1.0 - smoothstep(0.94, 1.0, c.xy));
	return mix(1.0, s, e.x * e.y);
}
#endif

// what one light adds
vec3 gN, gV, gDiff, gF0, gCcN;
float gA, gNoV, gCcA, gCcNoV;
vec3 gDirDiff, gDirSpec, gCcSpec, gSheen;
void addLight(vec3 L, vec3 radiance) {
	float NoL = clamp(dot(gN, L), 0.0, 1.0);
	vec3 H = normalize(L + gV);
	float VoH = clamp(dot(gV, H), 0.0, 1.0);
	if (NoL > 0.0) {
		float NoH = clamp(dot(gN, H), 0.0, 1.0);
		vec3 irr = radiance * NoL;
		gDirSpec += irr * F_Schlick(gF0, VoH) * D_GGX(gA, NoH) * V_SmithGGX(gA, gNoV, NoL);
		gDirDiff += irr * gDiff * RECIPROCAL_PI;
#ifdef SHEEN
		gSheen += irr * sheenColor * D_Charlie(sheenRoughness, NoH) * V_Neubelt(gNoV, NoL);
#endif
	}
#ifdef CLEARCOAT
	float cNoL = clamp(dot(gCcN, L), 0.0, 1.0);
	if (cNoL > 0.0) {
		float cNoH = clamp(dot(gCcN, H), 0.0, 1.0);
		gCcSpec += radiance * cNoL * F_Schlick(vec3(0.04), VoH) * D_GGX(gCcA, cNoH) * V_SmithGGX(gCcA, gCcNoV, cNoL);
	}
#endif
}

#ifdef NORMALMAP
vec3 perturbNormal(vec3 N, vec3 p, vec2 uv, vec3 mapN) {
	vec3 dp1 = dFdx(p), dp2 = dFdy(p);
	vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
	vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
	vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
	vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
	float det = max(dot(T, T), dot(B, B));
	float s = det == 0.0 ? 0.0 : inversesqrt(det);
	return normalize(T * (mapN.x * s) + B * (mapN.y * s) + N * mapN.z);
}
#endif
#endif

void main() {
	vec4 base = vec4(diffuse, opacity) * vColor;
#ifdef MAP
	base *= texture(map, vUv);
#endif
#ifdef ALPHATEST
	if (base.a < alphaTest) discard;
#endif

#ifdef UNLIT
	vec3 col = base.rgb;
	float alpha = base.a;
#else
	// the surface's normal
#ifdef FLAT
	vec3 Ng = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
#else
	vec3 Ng = normalize(vNormal);
#ifdef DOUBLE
	Ng *= gl_FrontFacing ? 1.0 : -1.0;
#endif
#endif
	vec3 N = Ng;
#ifdef NORMALMAP
	vec3 mapN = texture(normalMap, vUv).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	N = perturbNormal(Ng, vWorld, vUv, mapN);
#endif
	vec3 V = normalize(cameraPosition - vWorld);

	float rough = roughness;
#ifdef ROUGHMAP
	rough *= texture(roughnessMap, vUv).g;
#endif
	float metal = metalness;
#ifdef METALMAP
	metal *= texture(metalnessMap, vUv).b;
#endif
	// widen highlights where the normal changes fast across a pixel (no sparkly aliasing)
	vec3 dxy = max(abs(dFdx(Ng)), abs(dFdy(Ng)));
	float geo = max(max(dxy.x, dxy.y), dxy.z);
	rough = clamp(max(rough, 0.0525) + geo, 0.0, 1.0);

	gN = N;
	gV = V;
	gNoV = clamp(dot(N, V), 1e-4, 1.0);
	gA = rough * rough;
	gDiff = base.rgb * (1.0 - metal);
	gF0 = mix(vec3(0.04), base.rgb, metal);
#ifdef IRIDESCENCE
	vec3 film = 0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + iridescenceThickness * (1.0 - gNoV) * 1.6 + 0.15));
	gF0 = mix(gF0, film, iridescence);
#endif
	gCcN = Ng;
#ifdef CLEARCOAT
	float ccRough = clamp(max(clearcoatRoughness, 0.0525) + geo, 0.0, 1.0);
	gCcA = ccRough * ccRough;
	gCcNoV = clamp(dot(gCcN, V), 1e-4, 1.0);
#endif
	gDirDiff = vec3(0.0);
	gDirSpec = vec3(0.0);
	gCcSpec = vec3(0.0);
	gSheen = vec3(0.0);

	for (int i = 0; i < MAX_DIR; i++) {
		if (i >= numDir) break;
		vec3 radiance = dirColor[i];
#ifdef SHADOW
		if (i == 0) radiance *= shadowFactor();
#endif
		addLight(dirDirection[i], radiance);
	}
	for (int i = 0; i < MAX_POINT; i++) {
		if (i >= numPoint) break;
		vec3 Lv = pointPosition[i] - vWorld;
		float d = length(Lv);
		float att = 1.0 / max(pow(d, pointFalloff[i].y), 0.01);
		if (pointFalloff[i].x > 0.0) att *= pow2(clamp(1.0 - pow(d / pointFalloff[i].x, 4.0), 0.0, 1.0));
		addLight(Lv / max(d, 1e-4), pointColor[i] * att);
	}

	// light from all round: the ambient and hemisphere lights, and the environment
	vec3 skyIrr = ambientColor + mix(hemiGround, hemiSky, 0.5 * N.y + 0.5);
	vec3 envRad = vec3(0.0), envIrr = vec3(0.0);
#ifdef ENVMAP
	vec3 R = reflect(-V, N);
	R = normalize(mix(R, N, rough * rough));
	envRad = textureLod(envRadiance, R, rough * envMaxLod).rgb * envIntensity * envMapIntensity;
	envIrr = texture(envIrradiance, N).rgb * envIntensity * envMapIntensity;
#endif
	vec2 AB = envBRDF(rough, gNoV);
	vec3 FssEss = gF0 * AB.x + AB.y;
	float Ems = 1.0 - (AB.x + AB.y);
	vec3 Favg = gF0 + (1.0 - gF0) / 21.0;
	vec3 Fms = FssEss * Favg / (1.0 - Ems * Favg);
	vec3 indSpec = envRad * FssEss + Fms * Ems * envIrr;
	vec3 indDiff = gDiff * (1.0 - FssEss - Fms * Ems) * envIrr + gDiff * skyIrr * RECIPROCAL_PI;

	vec3 col = gDirDiff + gDirSpec + indDiff + indSpec;
	vec3 em = emissive;
#ifdef EMISSIVEMAP
	em *= texture(emissiveMap, vUv).rgb;
#endif
#ifdef SHEEN
	col += sheen * (gSheen + sheenColor * (envIrr + skyIrr * RECIPROCAL_PI) * 0.25 * pow(1.0 - gNoV, 2.0));
#endif
#ifdef CLEARCOAT
	vec3 ccR = reflect(-V, gCcN);
	vec3 ccEnv = vec3(0.0);
#ifdef ENVMAP
	ccEnv = textureLod(envRadiance, ccR, ccRough * envMaxLod).rgb * envIntensity * envMapIntensity;
#endif
	vec2 ccAB = envBRDF(ccRough, gCcNoV);
	float ccF = 0.04 + 0.96 * pow5(1.0 - gCcNoV);
	col = col * (1.0 - clearcoat * ccF) + clearcoat * (gCcSpec + ccEnv * (0.04 * ccAB.x + ccAB.y));
#endif
	float alpha = base.a;
#ifdef TRANSMISSION
	// glass: reflections over a see-through body, blended premultiplied
	// (what's behind shows through, dimmed by the reflection)
	float fr = clamp(max(max(FssEss.r, FssEss.g), FssEss.b), 0.0, 1.0);
	float through = transmission * (1.0 - fr);
	col = mix(col, gDirSpec + indSpec, transmission) * alpha;
	alpha = alpha * (1.0 - through);
#endif
	col += em;
#endif

#ifdef FOG
	float dist = length(vWorld - cameraPosition);
	float fogF = fogParams.z > 0.0 ? 1.0 - exp(-fogParams.z * fogParams.z * dist * dist) : smoothstep(fogParams.x, fogParams.y, dist);
	col = mix(col, fogColor, fogF);
#endif
#ifdef NOTONEMAP
	col = untonemap(col);
#endif
	fragColor = vec4(col, alpha);
${LOGDEPTH_FRAG}
}
`;
	return { vs, fs };
}

/* ---------- sprites ---------- */

export function spriteSource(defines) {
	const vs = HEADER(defines) + `
layout(location = 0) in vec3 position;
layout(location = 2) in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 center;
uniform float rotation;
uniform mat3 uvTransform;
uniform float sizeAttenuation;
out vec2 vUv;
out float vDist;
#ifdef LOGDEPTH
out float vFragDepth;
#endif
void main() {
	vec4 mv = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
	vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
	if (sizeAttenuation < 0.5) scale *= -mv.z * 2.0 / projectionMatrix[1][1] * 0.5;
	vec2 p = (position.xy - (center - 0.5)) * scale;
	float c = cos(rotation), s = sin(rotation);
	mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
	vUv = (uvTransform * vec3(uv, 1.0)).xy;
	vDist = length(mv.xyz);
	gl_Position = projectionMatrix * mv;
#ifdef LOGDEPTH
	vFragDepth = 1.0 + gl_Position.w;
#endif
}
`;
	const fs = HEADER(defines) + `
in vec2 vUv;
in float vDist;
#ifdef LOGDEPTH
in float vFragDepth;
uniform float logDepthFC;
#endif
out vec4 fragColor;
uniform vec3 diffuse;
uniform float opacity;
uniform float alphaTest;
#ifdef MAP
uniform sampler2D map;
#endif
#ifdef FOG
uniform vec3 fogColor;
uniform vec3 fogParams;
#endif
${UNTONEMAP}
void main() {
	vec4 c = vec4(diffuse, opacity);
#ifdef MAP
	c *= texture(map, vUv);
#endif
#ifdef ALPHATEST
	if (c.a < alphaTest) discard;
#endif
#ifdef FOG
	float fogF = fogParams.z > 0.0 ? 1.0 - exp(-fogParams.z * fogParams.z * vDist * vDist) : smoothstep(fogParams.x, fogParams.y, vDist);
	c.rgb = mix(c.rgb, fogColor, fogF);
#endif
#ifdef NOTONEMAP
	c.rgb = untonemap(c.rgb);
#endif
	fragColor = c;
${LOGDEPTH_FRAG}
}
`;
	return { vs, fs };
}

/* ---------- the shadow map's depth pass ---------- */

export function depthSource(defines) {
	const vs = HEADER(defines) + `
layout(location = 0) in vec3 position;
layout(location = 2) in vec2 uv;
#ifdef INSTANCED
layout(location = 4) in mat4 instanceMatrix;
#endif
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 uvTransform;
out vec2 vUv;
void main() {
	mat4 M = modelMatrix;
#ifdef INSTANCED
	M = modelMatrix * instanceMatrix;
#endif
	vUv = (uvTransform * vec3(uv, 1.0)).xy;
	gl_Position = projectionMatrix * viewMatrix * M * vec4(position, 1.0);
}
`;
	const fs = HEADER(defines) + `
in vec2 vUv;
uniform float opacity;
uniform float alphaTest;
#ifdef MAP
uniform sampler2D map;
#endif
out vec4 fragColor;
void main() {
#ifdef ALPHATEST
	float a = opacity;
#ifdef MAP
	a *= texture(map, vUv).a;
#endif
	if (a < alphaTest) discard;
#endif
	fragColor = vec4(1.0);
}
`;
	return { vs, fs };
}

/* ---------- your own shaders ---------- */

// Wraps a ShaderMaterial's GLSL: declares the usual attributes and uniforms,
// takes 'varying', 'attribute', texture2D and gl_FragColor as older GLSL
// wrote them, drops tone mapping includes (the post pass does that), and
// keeps logarithmic depth in step with everything else.
export function customSource(material, defines) {
	const strip = (s) => s.replace(/#include\s*<[^>]+>/g, '');
	const rename = (s) => s.replace(/void\s+main\s*\(\s*(void)?\s*\)/, 'void glint_main()');
	const all = { ...defines, ...material.defines };
	const vs = HEADER(all) + `
#define attribute in
#define varying out
#define texture2D texture
#define textureCube texture
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;
layout(location = 3) in vec4 color;
#ifdef INSTANCED
layout(location = 4) in mat4 instanceMatrix;
#endif
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
#ifdef LOGDEPTH
out float vFragDepth;
#endif
${rename(strip(material.vertexShader))}
void main() {
	glint_main();
#ifdef LOGDEPTH
	vFragDepth = 1.0 + gl_Position.w;
#endif
}
`;
	const fs = HEADER(all) + `
#define varying in
#define texture2D texture
#define textureCube texture
out vec4 glint_FragColor;
#define gl_FragColor glint_FragColor
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
#ifdef LOGDEPTH
in float vFragDepth;
uniform float logDepthFC;
#endif
${UNTONEMAP}
${rename(strip(material.fragmentShader))}
void main() {
	glint_main();
${LOGDEPTH_FRAG}
}
`;
	return { vs, fs };
}

/* ---------- full-screen passes ---------- */

export const FULLSCREEN_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
	vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;
