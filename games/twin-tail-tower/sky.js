/*
 * Twin Tail Tower: the sky, which changes with height. A bright tropical
 * sky over a sparkling sea at the bottom; paler and whiter up among the
 * clouds (a deck of them to climb through and look down on); a blazing
 * sunset; then night, the stars coming out; and space, black and starry,
 * the sun sharp and white again and a ringed planet hanging off to one side.
 * The sky is a SkyDome (lib/three/walls.js) and the sea a ShaderMaterial, sharing one set of
 * uniforms; the dome's environment (rebuilt every few metres as the colours
 * change) keeps everything shiny reflecting the sky of the moment.
 *
 *   const world = createSky(renderer, scene, { clouds, sunset, night, space });   // heights, metres
 *   world.update(time, eye, height);    // every frame
 *   world.light                         // the sun, sky light and haze for this height
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { SkyDome } from '../../lib/three/walls.js';

const TAU = Math.PI * 2;
const SUN_AZ = -0.6;   // radians round from straight ahead (the front wall's middle): ahead and to the left

// The sky at each height (colours sRGB, 0..1): the zenith, the horizon, below
// the horizon (the sea, then the cloud deck, then the dark), the sun's height
// (radians) and colour, its warm glow, how bright the light is, and the stars.
function stops(Z) {
	return [
		{ at: 0, zenith: [0.10, 0.42, 0.90], horizon: [0.70, 0.87, 0.98], below: [0.04, 0.34, 0.50], el: 0.62, sun: [1.0, 0.95, 0.86], glow: 1, light: 3.2, hemi: 0.8, stars: 0 },
		{ at: Z.clouds, zenith: [0.20, 0.52, 0.96], horizon: [0.88, 0.93, 1.0], below: [0.86, 0.90, 0.97], el: 0.45, sun: [1.0, 0.95, 0.88], glow: 1, light: 3.0, hemi: 0.85, stars: 0 },
		{ at: Z.sunset, zenith: [0.30, 0.22, 0.58], horizon: [1.0, 0.55, 0.30], below: [0.85, 0.45, 0.42], el: 0.07, sun: [1.0, 0.62, 0.34], glow: 2.6, light: 2.5, hemi: 0.6, stars: 0.05 },
		{ at: Z.night, zenith: [0.03, 0.04, 0.16], horizon: [0.20, 0.13, 0.38], below: [0.07, 0.06, 0.16], el: -0.1, sun: [0.6, 0.7, 1.0], glow: 0.5, light: 1.4, hemi: 0.5, stars: 0.85 },
		{ at: Z.space, zenith: [0.0, 0.0, 0.012], horizon: [0.03, 0.03, 0.09], below: [0.01, 0.01, 0.04], el: 0.28, sun: [1.0, 1.0, 1.0], glow: 0.25, light: 3.0, hemi: 0.38, stars: 1 },
	];
}

const SKY_GLSL = /* glsl */`
	uniform vec3 uZenith;
	uniform vec3 uHorizon;
	uniform vec3 uBelow;
	uniform vec3 sunDir;
	uniform vec3 uSun;
	uniform float uGlow;
	vec3 skyColor(vec3 d) {
		float y = d.y;
		vec3 col = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.5));
		float s = max(dot(d, sunDir), 0.0);
		col += uSun * pow(s, 5.0) * 0.26 * uGlow;      // the warm sky round the sun
		col += uSun * pow(s, 48.0) * 0.5;              // the glare
		if (y < 0.0) col = mix(col, uBelow, clamp(-y * 5.0, 0.0, 1.0));
		return pow(col, vec3(2.2));
	}
`;

// The dome's own extras, seen but never reflected: the sun's blazing disc,
// and the stars.
const EXTRA_GLSL = /* glsl */`
	uniform float sunBoost;
	uniform float uStars;
	float hash(vec3 p) {
		p = fract(p * 0.3183099 + 0.1);
		p *= 17.0;
		return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
	}
	// a starfield: one star in a few of the cells round the sky
	vec3 stars(vec3 d) {
		vec3 p = d * 150.0;
		vec3 c = floor(p);
		float h = hash(c);
		if (h < 0.972) return vec3(0.0);
		vec3 o = vec3(hash(c + 1.3), hash(c + 2.7), hash(c + 5.1)) * 0.6 + 0.2;
		float dd = length(fract(p) - o);
		float b = smoothstep(0.2, 0.0, dd) * (h - 0.972) / 0.028 * 3.0;
		b *= 0.7 + 0.3 * sin(dot(c, vec3(1.0)) + h * 40.0);
		return vec3(b) * mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash(c + 9.0));
	}
	#define SKY_EXTRA
	vec3 skyExtra(vec3 d) {
		float s = dot(d, sunDir);
		vec3 col = uSun * smoothstep(0.9993, 0.99965, s) * sunBoost;   // the sun's disc
		col += uSun * pow(max(s, 0.0), 900.0) * sunBoost * 0.3;
		col += stars(d) * uStars * smoothstep(-0.02, 0.06, d.y);
		return col;
	}
`;

function oceanMaterial(uniforms) {
	return new THREE.ShaderMaterial({
		uniforms: Object.assign({}, uniforms, { uTime: { value: 0 } }),
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
			uniform float uSea;
			varying vec3 vWorld;
			${SKY_GLSL}
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
				float fade = exp(-dist / 420.0);
				vec3 N = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
				float ndv = clamp(dot(N, V), 0.0, 1.0);
				float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
				vec3 R = reflect(-V, N);
				R.y = abs(R.y);
				vec3 refl = skyColor(R);
				vec3 deep = pow(vec3(0.0, 0.20, 0.36), vec3(2.2));
				vec3 shallow = pow(vec3(0.02, 0.62, 0.70), vec3(2.2));
				vec3 water = mix(deep, shallow, pow(ndv, 3.0) * 0.55) * uSea;
				float sd = max(dot(R, sunDir), 0.0);
				vec3 sun = uSun * (pow(sd, 1400.0) * 90.0 + pow(sd, 160.0) * 2.4 + pow(sd, 18.0) * 0.12);
				vec3 col = mix(water, refl, F) + sun;
				vec3 hz = skyColor(normalize(vec3(-V.x, -0.001, -V.z)));
				col = mix(col, hz, smoothstep(400.0, 3000.0, dist) * 0.9);
				gl_FragColor = vec4(col, 1.0);   // (linear HDR: the engine tone maps)
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
	for (const [x, y, r] of [[70, 82, 44], [118, 64, 56], [170, 80, 46], [140, 92, 40], [96, 96, 36], [200, 96, 28]]) {
		const grad = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
		grad.addColorStop(0, 'rgba(255,255,255,0.95)');
		grad.addColorStop(0.6, 'rgba(250,252,255,0.75)');
		grad.addColorStop(1, 'rgba(235,242,252,0)');
		g.fillStyle = grad;
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.fill();
	}
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

// A tiling sheet of cloud, for the deck: soft blobs, wrapped at the edges.
function deckTexture() {
	const c = document.createElement('canvas');
	c.width = c.height = 512;
	const g = c.getContext('2d');
	for (let i = 0; i < 160; i++) {
		const x = Math.random() * 512;
		const y = Math.random() * 512;
		const r = 20 + Math.random() * 60;
		for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
			const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
			grad.addColorStop(0, 'rgba(255,255,255,0.55)');
			grad.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = grad;
			g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
		}
	}
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(30, 30);
	return t;
}

// A banded gas giant with a ring.
function buildPlanet() {
	const g = new THREE.Group();
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 128;
	const x = c.getContext('2d');
	const bands = ['#f2c48a', '#e09a5e', '#f6dcb0', '#c9784a', '#f0b878', '#e8a066', '#f8e2bc'];
	for (let y = 0; y < 128; y += 8) {
		x.fillStyle = bands[Math.floor(Math.random() * bands.length)];
		x.fillRect(0, y, 256, 8 + Math.random() * 6);
	}
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false });
	const ball = new THREE.Mesh(new THREE.SphereGeometry(130, 48, 32), mat);
	g.add(ball);
	const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8d2b0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, fog: false, depthWrite: false });
	const ring = new THREE.Mesh(new THREE.RingGeometry(170, 260, 96), ringMat);
	ring.rotation.set(-1.25, 0.25, 0);
	g.add(ring);
	g.rotation.z = 0.3;
	g.userData = { mats: [mat, ringMat], tex };
	g.renderOrder = -8;
	return g;
}

export function createSky(renderer, scene, Z) {
	const STOPS = stops(Z);
	const uniforms = {
		uZenith: { value: new THREE.Vector3() },
		uHorizon: { value: new THREE.Vector3() },
		uBelow: { value: new THREE.Vector3() },
		sunDir: { value: new THREE.Vector3(0, 1, 0) },
		sunBoost: { value: 30 },
		uSun: { value: new THREE.Vector3(1, 1, 1) },
		uGlow: { value: 1 },
		uStars: { value: 0 },
		uSea: { value: 1 },
	};

	// the sky, round the eye
	const sky = new SkyDome(SKY_GLSL + EXTRA_GLSL, uniforms, 3000);
	scene.add(sky);

	// the sea, a wide disc under the eye
	const ocean = new THREE.Mesh(new THREE.CircleGeometry(3600, 96), oceanMaterial(uniforms));
	ocean.rotation.x = -Math.PI / 2;
	ocean.position.y = -0.3;
	ocean.frustumCulled = false;
	ocean.renderOrder = -5;
	ocean.material.depthWrite = false;
	scene.add(ocean);

	// (the environment everything shiny reflects: the dome's sky, remade as it changes)
	let envAt = -Infinity;

	// clouds: far ones low over the sea; a band of them to climb through; a deck of cloud to look down on
	const tex = cloudTexture();
	const clouds = new THREE.Group();
	scene.add(clouds);
	const puff = (x, y, z, w, opacity) => {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity }));
		s.position.set(x, y, z);
		s.scale.set(w, w * 0.45, 1);
		clouds.add(s);
	};
	for (let i = 0; i < 40; i++) {
		const a = Math.random() * TAU;
		const r = 900 + Math.random() * 1500;
		puff(Math.sin(a) * r, 60 + Math.random() * 200, -Math.cos(a) * r, 260 + Math.random() * 420, 0.85);
	}
	for (let i = 0; i < 90; i++) {
		const a = Math.random() * TAU;
		const r = 18 + Math.pow(Math.random(), 1.6) * 260;
		puff(Math.sin(a) * r, Z.clouds - 50 + Math.random() * 170, -Math.cos(a) * r, 14 + r * 0.35 + Math.random() * 30, 0.9);
	}
	const deckY = Z.clouds + 60;
	const deckTex = deckTexture();
	const deck = new THREE.Mesh(new THREE.CircleGeometry(3000, 64), new THREE.MeshBasicMaterial({ map: deckTex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0 }));
	deck.rotation.x = -Math.PI / 2;
	deck.position.y = deckY;
	deck.renderOrder = -4;
	scene.add(deck);

	const planet = buildPlanet();
	scene.add(planet);

	const WHITE = new THREE.Color(1, 1, 1);
	const light = { dir: new THREE.Vector3(), sun: new THREE.Color(), sunI: 3, hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0.8, fog: new THREE.Color() };
	const world = { sky, ocean, light };

	const mix3 = (out, a, b, k) => out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
	const mix = (a, b, k) => a + (b - a) * k;
	const lin = (v) => new THREE.Color(Math.pow(v.x, 2.2), Math.pow(v.y, 2.2), Math.pow(v.z, 2.2));   // (the stops are sRGB-ish; the lights want linear)
	const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

	world.update = function (time, eye, height) {
		// where this height sits between two of the stops
		let i = 0;
		while (i < STOPS.length - 2 && height > STOPS[i + 1].at) i++;
		const a = STOPS[i];
		const b = STOPS[i + 1];
		const k = smooth(a.at, b.at, height);
		const u = uniforms;
		mix3(u.uZenith.value, a.zenith, b.zenith, k);
		mix3(u.uHorizon.value, a.horizon, b.horizon, k);
		mix3(u.uBelow.value, a.below, b.below, k);
		mix3(u.uSun.value, a.sun, b.sun, k);
		u.uGlow.value = mix(a.glow, b.glow, k);
		u.uStars.value = mix(a.stars, b.stars, k);
		u.uSea.value = 1 - smooth(Z.sunset, Z.night, height) * 0.85;
		const el = mix(a.el, b.el, k);
		u.sunDir.value.set(Math.sin(SUN_AZ) * Math.cos(el), Math.sin(el), -Math.cos(SUN_AZ) * Math.cos(el)).normalize();

		// the light: from the sun (or, by night, from high up), the sky's own
		// light, and the haze
		const lel = Math.max(el, 0.35);
		light.dir.set(Math.sin(SUN_AZ) * Math.cos(lel), Math.sin(lel), -Math.cos(SUN_AZ) * Math.cos(lel)).normalize();
		light.sun.copy(lin(u.uSun.value));
		light.sunI = mix(a.light, b.light, k);
		light.hemiSky.copy(lin(u.uZenith.value)).lerp(WHITE, 0.45);
		light.hemiGround.copy(lin(u.uHorizon.value)).multiplyScalar(0.6);
		light.hemiI = mix(a.hemi, b.hemi, k);
		light.fog.copy(lin(u.uHorizon.value));

		sky.follow(eye);
		ocean.position.set(eye.x, -0.3, eye.z);
		ocean.material.uniforms.uTime.value = time;
		ocean.visible = height < Z.night + 200;

		// the deck: seen from well below or above, faded out as you pass through it
		const off = Math.abs(eye.y - deckY);
		deck.material.opacity = smooth(8, 70, off) * (1 - smooth(Z.night, Z.space, height)) * 0.95;
		deck.visible = deck.material.opacity > 0.01;
		deckTex.offset.x = time * 0.002;

		// the planet, keeping pace with the eye, coming out with the stars
		planet.position.set(eye.x - 900, eye.y + 380, eye.z - 1400);
		const pk = smooth(Z.night - 100, Z.space, height);
		for (const m of planet.userData.mats) m.opacity = pk * (m.map ? 1 : 0.6);
		planet.visible = pk > 0.01;
		planet.rotation.y = time * 0.01;

		// a fresh reflection of the sky, now and then as it changes
		if (Math.abs(height - envAt) > 12) {
			envAt = height;
			scene.environment = sky.environment(renderer);   // (it refills the same cubes)
		}
	};

	world.dispose = function () {
		if (sky.env) sky.env.dispose();
		tex.dispose();
		deckTex.dispose();
		planet.userData.tex.dispose();
	};

	return world;
}
