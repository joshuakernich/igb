/*
 * Loop Island: the sky and the sea. A bright tropical sky with a low, hot
 * sun; an ocean of rolling waves that mirrors that sky (more of it the
 * flatter you look) with a blazing path of sun glitter; soft clouds; and an
 * environment map of the sky, so everything shiny reflects it.
 *
 *   const world = createSky(renderer, scene);
 *   world.update(time, camPos);      // every frame: follow the eye
 */
import * as THREE from '../../lib/three/three.module.min.js';

export const SUN = new THREE.Vector3(-0.45, 0.32, -0.83).normalize();   // toward the sun (ahead and to the left, as it sets off)
export const HORIZON = new THREE.Color(0xa9d6f6);

// The sky's colour in a direction (shared by the sky, the sea's reflection
// and the haze). Worked in sRGB-ish values, returned linear; the sun's own
// disc is added on top, far brighter than white.
const SKY_GLSL = /* glsl */`
	uniform vec3 sunDir;
	vec3 skyColor(vec3 d) {
		float y = d.y;
		vec3 zenith = vec3(0.10, 0.40, 0.88);
		vec3 horizon = vec3(0.66, 0.84, 0.97);
		vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.5));
		float s = max(dot(d, sunDir), 0.0);
		col += vec3(1.0, 0.82, 0.55) * pow(s, 6.0) * 0.28;     // the warm sky round the sun
		col += vec3(1.0, 0.92, 0.75) * pow(s, 48.0) * 0.55;    // the glare
		if (y < 0.0) col = mix(col, vec3(0.04, 0.34, 0.50), clamp(-y * 5.0, 0.0, 1.0));   // (the sea, for reflections)
		return pow(col, vec3(2.2));
	}
`;

function skyMaterial(sunBoost) {
	return new THREE.ShaderMaterial({
		uniforms: { sunDir: { value: SUN }, sunBoost: { value: sunBoost } },
		vertexShader: /* glsl */`
			varying vec3 vDir;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				vDir = w.xyz - cameraPosition;
				gl_Position = projectionMatrix * viewMatrix * w;
				gl_Position.z = gl_Position.w * 0.99999;   // always the furthest thing
			}
		`,
		fragmentShader: /* glsl */`
			uniform float sunBoost;
			varying vec3 vDir;
			${SKY_GLSL}
			void main() {
				vec3 d = normalize(vDir);
				vec3 col = skyColor(d);
				float s = dot(d, sunDir);
				col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99935, 0.99965, s) * sunBoost;   // the sun's disc
				col += vec3(1.0, 0.9, 0.7) * pow(max(s, 0.0), 900.0) * sunBoost * 0.3;
				gl_FragColor = vec4(col, 1.0);
				#include <tonemapping_fragment>
				#include <colorspace_fragment>
			}
		`,
		side: THREE.BackSide,
		depthWrite: false,
	});
}

function oceanMaterial() {
	return new THREE.ShaderMaterial({
		uniforms: { sunDir: { value: SUN }, uTime: { value: 0 } },
		vertexShader: /* glsl */`
			varying vec3 vWorld;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				vWorld = w.xyz;
				gl_Position = projectionMatrix * viewMatrix * w;
			}
		`,
		fragmentShader: /* glsl */`
			uniform float uTime;
			varying vec3 vWorld;
			${SKY_GLSL}
			// the slope of one train of waves
			vec2 wave(vec2 p, vec2 dir, float freq, float amp, float speed) {
				dir = normalize(dir);
				return dir * freq * amp * cos(dot(dir, p) * freq + uTime * speed);
			}
			void main() {
				vec3 toCam = cameraPosition - vWorld;
				float dist = length(toCam);
				vec3 V = toCam / dist;
				vec2 p = vWorld.xz;
				vec2 g = vec2(0.0);
				g += wave(p, vec2(1.0, 0.35), 0.045, 0.9, 0.9);
				g += wave(p, vec2(-0.6, 1.0), 0.07, 0.55, 1.1);
				g += wave(p, vec2(0.3, -1.0), 0.13, 0.28, 1.6);
				g += wave(p, vec2(1.0, 1.0), 0.23, 0.14, 2.1);
				g += wave(p, vec2(-1.0, 0.2), 0.41, 0.07, 2.9);
				g += wave(p, vec2(0.2, 1.0), 0.73, 0.035, 3.7);
				g += wave(p, vec2(-0.8, -0.5), 1.31, 0.018, 5.1);
				g += wave(p, vec2(0.9, -0.4), 2.3, 0.009, 6.3);
				float fade = exp(-dist / 420.0);
				vec3 N = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
				float ndv = clamp(dot(N, V), 0.0, 1.0);
				float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
				vec3 R = reflect(-V, N);
				R.y = abs(R.y);
				vec3 refl = skyColor(R);
				vec3 deep = pow(vec3(0.0, 0.20, 0.36), vec3(2.2));
				vec3 shallow = pow(vec3(0.02, 0.62, 0.70), vec3(2.2));
				vec3 water = mix(deep, shallow, pow(ndv, 3.0) * 0.55);
				float sd = max(dot(R, sunDir), 0.0);
				vec3 sun = vec3(1.0, 0.92, 0.78) * (pow(sd, 1400.0) * 90.0 + pow(sd, 160.0) * 2.4 + pow(sd, 18.0) * 0.12);
				vec3 col = mix(water, refl, F) + sun;
				// haze toward the horizon
				vec3 hz = skyColor(normalize(vec3(-V.x, 0.0, -V.z)));
				col = mix(col, hz, smoothstep(500.0, 3200.0, dist) * 0.85);
				gl_FragColor = vec4(col, 1.0);
				#include <tonemapping_fragment>
				#include <colorspace_fragment>
			}
		`,
	});
}

// A soft cloud puff, painted once.
function cloudTexture() {
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 128;
	const g = c.getContext('2d');
	const puffs = [[70, 82, 44], [118, 64, 56], [170, 80, 46], [140, 92, 40], [96, 96, 36], [200, 96, 28]];
	for (const [x, y, r] of puffs) {
		const grad = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
		grad.addColorStop(0, 'rgba(255,255,255,0.95)');
		grad.addColorStop(0.6, 'rgba(250,252,255,0.75)');
		grad.addColorStop(1, 'rgba(235,242,252,0)');
		g.fillStyle = grad;
		g.beginPath();
		g.arc(x, y, r, 0, Math.PI * 2);
		g.fill();
	}
	// a cooler underside
	const shade = g.createLinearGradient(0, 60, 0, 128);
	shade.addColorStop(0, 'rgba(160,190,225,0)');
	shade.addColorStop(1, 'rgba(160,190,225,0.35)');
	g.globalCompositeOperation = 'source-atop';
	g.fillStyle = shade;
	g.fillRect(0, 0, 256, 128);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export function createSky(renderer, scene) {
	// the sky, round the eye
	const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), skyMaterial(30));
	sky.renderOrder = -10;
	sky.frustumCulled = false;
	scene.add(sky);

	// the sea: a wide disc that follows the eye
	const ocean = new THREE.Mesh(new THREE.CircleGeometry(3600, 96), oceanMaterial());
	ocean.rotation.x = -Math.PI / 2;
	ocean.frustumCulled = false;
	scene.add(ocean);

	// the environment everything shiny reflects: the same sky, sun a little tamer
	const envScene = new THREE.Scene();
	envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(12)));
	const pmrem = new THREE.PMREMGenerator(renderer);
	const env = pmrem.fromScene(envScene, 0, 0.1, 200);
	scene.environment = env.texture;
	pmrem.dispose();

	// far clouds, so far off they keep pace with the eye
	const tex = cloudTexture();
	const far = new THREE.Group();
	scene.add(far);
	for (let i = 0; i < 40; i++) {
		const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 + Math.random() * 0.15 });
		const s = new THREE.Sprite(m);
		const a = Math.random() * Math.PI * 2;
		const r = 1300 + Math.random() * 1300;
		const w = 260 + Math.random() * 420;
		s.position.set(Math.cos(a) * r, 70 + Math.random() * 260, Math.sin(a) * r);
		s.scale.set(w, w * 0.45, 1);
		far.add(s);
	}

	const world = { sky, ocean, far, cloudTex: tex, env };

	world.update = function (time, eye) {
		sky.position.copy(eye);
		ocean.position.set(eye.x, 0, eye.z);
		far.position.set(eye.x, 0, eye.z);
		ocean.material.uniforms.uTime.value = time;
	};

	// a cloud close enough to whip past
	world.cloud = function (x, y, z, size) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
		s.position.set(x, y, z);
		s.scale.set(size, size * 0.45, 1);
		return s;
	};

	world.dispose = function () {
		env.dispose();
		tex.dispose();
	};

	return world;
}
