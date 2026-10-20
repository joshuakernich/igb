/*
 * Iron Stride: the world outside the cockpit (drawn with Glint). A bright
 * sky whose own GLSL also lights the scene (after Loop Island's sky), rolling green hills that rise
 * into a ring of mountains at the arena's edge, puffball trees, pines,
 * rocks, sandstone buttes and arches, and Doctor Klank's factory smoking on
 * the far hills.
 *
 *   const world = createWorld(renderer, scene);
 *   heightAt(x, z)                   // the ground's height anywhere
 *   world.update(time, eye, dt);     // every frame: follow the eye, puff the smoke
 */
import * as G from '../../lib/glint/glint.js';

export const SUN = new G.Vector3(-0.42, 0.62, -0.66).normalize();
export const HORIZON = new G.Color(0xbfe0f2);
export const ARENA = 470;          // metres from the middle the robot can walk
export const FACTORY = new G.Vector3(0, 0, -760);   // Doctor Klank's factory (dead ahead at the start)

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The ground's height: rolling hills, a gentle basin at the start, and
// steep hills past the arena's edge.
export function heightAt(x, z) {
	let h = 7 * Math.sin(x * 0.011 + 1.3) * Math.cos(z * 0.009 - 0.4)
		+ 4 * Math.sin((x + z) * 0.017 + 2.1)
		+ 2.2 * Math.sin(x * 0.043 - z * 0.037)
		+ 1.0 * Math.cos(x * 0.09 + z * 0.071);
	const r = Math.hypot(x, z);
	h *= 0.3 + 0.7 * smooth(0, 90, r);
	// (hills rising past the edge, levelling off at about 90 m, so they ring
	// the arena without walling off the sky)
	const edge = Math.max(0, r - (ARENA + 40));
	h += 90 * smooth(0, 320, edge) * (1 + Math.sin(Math.atan2(z, x) * 7) * 0.35);
	return h;
}

// a seeded random, so the world's the same every time
function seeded(seed) {
	return function () {
		seed |= 0; seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

const SKY_GLSL = /* glsl */`
	uniform vec3 sunDir;
	vec3 skyColor(vec3 d) {
		float y = d.y;
		vec3 zenith = vec3(0.16, 0.45, 0.90);
		vec3 horizon = vec3(0.75, 0.88, 0.95);
		vec3 col = mix(horizon, zenith, pow(clamp(y, 0.0, 1.0), 0.55));
		float s = max(dot(d, sunDir), 0.0);
		col += vec3(1.0, 0.86, 0.6) * pow(s, 6.0) * 0.22;
		col += vec3(1.0, 0.94, 0.8) * pow(s, 48.0) * 0.5;
		if (y < 0.0) col = mix(col, vec3(0.42, 0.62, 0.40), clamp(-y * 4.0, 0.0, 1.0));   // (the ground, far off)
		return pow(col, vec3(2.2));
	}
`;

function skyMaterial(sunBoost) {
	return new G.ShaderMaterial({
		uniforms: { sunDir: { value: SUN }, sunBoost: { value: sunBoost } },
		vertexShader: /* glsl */`
			varying vec3 vDir;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				vDir = w.xyz - cameraPosition;
				gl_Position = projectionMatrix * viewMatrix * w;
				gl_Position.z = gl_Position.w * 0.99999;
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
				col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9996, s) * sunBoost;
				col += vec3(1.0, 0.9, 0.7) * pow(max(s, 0.0), 900.0) * sunBoost * 0.3;
				gl_FragColor = vec4(col, 1.0);
			}
		`,
		side: G.BackSide,
		depthWrite: false,
	});
}

// Soft canvas textures: a cloud, the grass (grey stripes, the hue comes from
// the ground's vertex colours), a bullseye.
function canvasTex(w, h, paint, srgb = true) {
	return G.canvasTexture(w, h, paint, srgb);
}

export function cloudTexture() {
	return canvasTex(256, 128, function (g) {
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
	});
}

function grassTexture(aniso) {
	const rand = seeded(7);
	const t = canvasTex(256, 256, function (g, w, h) {
		g.fillStyle = '#e6e6e6';
		g.fillRect(0, 0, w, h);
		g.fillStyle = '#ffffff';
		g.fillRect(0, 0, w / 2, h);   // mown stripes
		for (let i = 0; i < 2600; i++) {
			const v = 180 + Math.floor(rand() * 75);
			g.fillStyle = `rgb(${v},${v},${v})`;
			g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 2 + rand() * 4);
		}
	});
	t.wrapS = t.wrapT = G.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

export function createWorld(renderer, scene) {
	const rand = seeded(1234);
	const R = (a, b) => a + rand() * (b - a);
	const aniso = renderer.capabilities.getMaxAnisotropy();
	const disposables = [];

	// the sky
	const sky = new G.Mesh(new G.SphereGeometry(2600, 48, 24), skyMaterial(30));
	sky.renderOrder = -10;
	sky.frustumCulled = false;
	scene.add(sky);

	// the light from all round: the same sky, its sun a little tamer
	const env = renderer.environmentFromShader(SKY_GLSL + `
		vec3 envColor(vec3 d) { return skyColor(d) + vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9996, dot(d, sunDir)) * 10.0; }
	`, { uniforms: { sunDir: { value: SUN } } });
	scene.environment = env;

	// the ground
	const SIZE = 2400;
	const SEG = 300;
	const geo = new G.PlaneGeometry(SIZE, SIZE, SEG, SEG);
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
	geo.computeVertexNormals();
	const nrm = geo.attributes.normal;
	const cols = new Float32Array(pos.count * 3);
	const grassA = new G.Color(0x6cc644), grassB = new G.Color(0x3f9e3a), dirt = new G.Color(0xc9925a), rock = new G.Color(0x9c8f84), c = new G.Color();
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
		const n = 0.5 + 0.5 * Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2) * Math.cos(z * 0.019 - x * 0.007);
		c.copy(grassA).lerp(grassB, n);
		const slope = 1 - nrm.getY(i);
		c.lerp(dirt, smooth(0.12, 0.3, slope));
		c.lerp(rock, smooth(25, 70, y) * 0.8);
		cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
	}
	geo.setAttribute('color', new G.BufferAttribute(cols, 3));
	const grass = grassTexture(aniso);
	grass.repeat.set(SIZE / 22, SIZE / 22);
	const ground = new G.Mesh(geo, new G.MeshStandardMaterial({ vertexColors: true, map: grass, roughness: 0.95, metalness: 0 }));
	ground.receiveShadow = true;
	scene.add(ground);
	disposables.push(geo, ground.material, grass);

	// where things may stand: not on the start, not too steep
	function spot(rMin, rMax) {
		for (let tries = 0; tries < 30; tries++) {
			const a = rand() * Math.PI * 2;
			const r = Math.sqrt(R(rMin * rMin, rMax * rMax));
			const x = Math.cos(a) * r, z = Math.sin(a) * r;
			const slope = Math.abs(heightAt(x + 2, z) - heightAt(x - 2, z)) + Math.abs(heightAt(x, z + 2) - heightAt(x, z - 2));
			if (slope < 3.5) return { x, z, y: heightAt(x, z) };
		}
		return null;
	}

	const M = new G.Matrix4(), Q = new G.Quaternion(), S = new G.Vector3(), P = new G.Vector3(), UP = new G.Vector3(0, 1, 0);
	function instanced(geometry, material, n, place, colours) {
		const mesh = new G.InstancedMesh(geometry, material, n);
		let k = 0;
		for (let i = 0; i < n; i++) {
			const at = place(i);
			if (!at) continue;
			Q.setFromAxisAngle(UP, at.rot || 0);
			if (at.tilt) Q.multiply(new G.Quaternion().setFromEuler(new G.Euler(at.tilt[0], 0, at.tilt[1])));
			S.set(at.sx || at.s, at.sy || at.s, at.sz || at.s);
			P.set(at.x, at.y, at.z);
			mesh.setMatrixAt(k, M.compose(P, Q, S));
			if (colours) mesh.setColorAt(k, colours[i % colours.length]);
			k++;
		}
		mesh.count = k;
		mesh.instanceMatrix.needsUpdate = true;
		if (colours) mesh.instanceColor.needsUpdate = true;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		scene.add(mesh);
		disposables.push(geometry, material);
		return mesh;
	}

	// puffball trees: a trunk and a round canopy
	const trees = [];
	for (let i = 0; i < 420; i++) { const s = spot(35, ARENA + 120); if (s) trees.push(Object.assign(s, { s: R(0.8, 1.9), rot: rand() * 6.3 })); }
	const trunkGeo = new G.CylinderGeometry(0.35, 0.55, 4.2, 7).translate(0, 2.1, 0);
	instanced(trunkGeo, new G.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.9 }), trees.length, (i) => trees[i]);
	const crownGeo = new G.IcosahedronGeometry(2.7, 1).scale(1, 0.9, 1).translate(0, 5.6, 0);
	const leafColours = [0x3fbf4a, 0x58d04a, 0x2fa86a, 0x8bd43a].map((h) => new G.Color(h));
	instanced(crownGeo, new G.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: true }), trees.length, (i) => trees[i], leafColours);

	// pines
	const pines = [];
	for (let i = 0; i < 240; i++) { const s = spot(60, ARENA + 160); if (s) pines.push(Object.assign(s, { s: R(0.9, 2.2), rot: rand() * 6.3 })); }
	const pineGeo = new G.ConeGeometry(2.4, 6, 7).translate(0, 5, 0);
	instanced(pineGeo, new G.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.8, flatShading: true }), pines.length, (i) => pines[i]);
	const pineTop = new G.ConeGeometry(1.7, 4.5, 7).translate(0, 8.6, 0);
	instanced(pineTop, new G.MeshStandardMaterial({ color: 0x37a05a, roughness: 0.8, flatShading: true }), pines.length, (i) => pines[i]);
	instanced(new G.CylinderGeometry(0.3, 0.4, 2.2, 6).translate(0, 1.1, 0), new G.MeshStandardMaterial({ color: 0x6a3f22 }), pines.length, (i) => pines[i]);

	// rocks
	const rocks = [];
	for (let i = 0; i < 180; i++) { const s = spot(25, ARENA + 150); if (s) rocks.push(Object.assign(s, { s: R(0.6, 2.6), sy: R(0.4, 1.4), rot: rand() * 6.3, tilt: [R(-0.3, 0.3), R(-0.3, 0.3)] })); }
	for (const r of rocks) r.sy *= r.s;
	instanced(new G.DodecahedronGeometry(1.4, 0), new G.MeshStandardMaterial({ color: 0xa79d92, roughness: 0.85, flatShading: true }), rocks.length, (i) => rocks[i]);

	// sandstone buttes: banded columns with a grassy cap
	const buttes = new G.Group();
	scene.add(buttes);
	const bands = [0xd9884a, 0xe8a862, 0xc8703c, 0xf0bf7a];
	for (let i = 0; i < 14; i++) {
		const s = spot(140, ARENA - 20);
		if (!s) continue;
		const rad = R(8, 16), tall = R(22, 55), sides = 7 + Math.floor(rand() * 3);
		const n = 4 + Math.floor(rand() * 3);
		for (let b = 0; b < n; b++) {
			const g = new G.CylinderGeometry(rad * (1 - b * 0.03), rad * (1 - (b - 1) * 0.03), tall / n, sides);
			const m = new G.Mesh(g, new G.MeshStandardMaterial({ color: bands[(b + i) % bands.length], roughness: 0.9, flatShading: true }));
			m.position.set(s.x, s.y - 4 + tall / n * (b + 0.5), s.z);
			m.castShadow = m.receiveShadow = true;
			buttes.add(m);
			disposables.push(g, m.material);
		}
		const cap = new G.Mesh(new G.CylinderGeometry(rad * 0.9, rad * 0.88, 1.6, sides), new G.MeshStandardMaterial({ color: 0x58c044, roughness: 0.9, flatShading: true }));
		cap.position.set(s.x, s.y - 4 + tall + 0.6, s.z);
		cap.castShadow = true;
		buttes.add(cap);
		disposables.push(cap.geometry, cap.material);
	}
	// stone arches
	for (let i = 0; i < 6; i++) {
		const s = spot(110, ARENA - 30);
		if (!s) continue;
		const g = new G.TorusGeometry(R(12, 18), R(2.6, 3.8), 7, 18, Math.PI);
		const m = new G.Mesh(g, new G.MeshStandardMaterial({ color: 0xd39058, roughness: 0.9, flatShading: true }));
		m.position.set(s.x, s.y - 1, s.z);
		m.rotation.y = rand() * Math.PI;
		m.castShadow = m.receiveShadow = true;
		scene.add(m);
		disposables.push(g, m.material);
	}

	// far mountains, beyond the hills
	const far = new G.Group();
	scene.add(far);
	for (let i = 0; i < 46; i++) {
		const a = i / 46 * Math.PI * 2 + R(-0.05, 0.05);
		const r = R(1050, 1350);
		const h = R(160, 380);
		const g = new G.ConeGeometry(R(140, 260), h, 6 + Math.floor(rand() * 3));
		const m = new G.Mesh(g, new G.MeshStandardMaterial({ color: rand() < 0.5 ? 0x7c9a8a : 0x8a9ab0, roughness: 1, flatShading: true }));
		m.position.set(Math.cos(a) * r, h / 2 + 40, Math.sin(a) * r);
		m.rotation.y = rand() * 6;
		far.add(m);
		disposables.push(g, m.material);
	}

	// Doctor Klank's factory, smoking on the far hills
	const factory = new G.Group();
	const fy = heightAt(FACTORY.x, FACTORY.z) - 6;
	factory.position.set(FACTORY.x, fy, FACTORY.z);
	scene.add(factory);
	const steel = new G.MeshStandardMaterial({ color: 0x5b5470, roughness: 0.5, metalness: 0.6 });
	const dark = new G.MeshStandardMaterial({ color: 0x2a2633, roughness: 0.6, metalness: 0.5 });
	const glow = new G.MeshBasicMaterial({ color: 0xff3b2a, toneMapped: false });
	const stripeTex = canvasTex(64, 256, function (g, w, h) {
		for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#d8262a'; g.fillRect(0, i * h / 8, w, h / 8); }
	});
	disposables.push(steel, dark, glow, stripeTex);
	const add = (geo, mat, x, y, z) => { const m = new G.Mesh(geo, mat); m.position.set(x, y, z); factory.add(m); disposables.push(geo); return m; };
	add(new G.BoxGeometry(180, 50, 70), steel, 0, 25, 0);
	add(new G.BoxGeometry(120, 30, 60), dark, 0, 65, 0);
	add(new G.SphereGeometry(36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 80, 0);
	add(new G.SphereGeometry(18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel, -70, 50, 10);
	add(new G.SphereGeometry(18, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel, 70, 50, 10);
	for (let i = 0; i < 12; i++) add(new G.BoxGeometry(8, 4, 1), glow, -66 + i * 12, 30, 35.6);
	const stacks = [];
	for (const [x, z, h] of [[-60, -20, 130], [-25, -25, 160], [30, -22, 145], [65, -18, 120]]) {
		const s = add(new G.CylinderGeometry(6, 8, h, 16), new G.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 }), x, h / 2, z);
		disposables.push(s.material);
		add(new G.SphereGeometry(2.2, 8, 6), glow, x, h + 1, z).userData.stackTop = true;
	}
	// his emblem: a gear with a monocle
	add(new G.TorusGeometry(22, 5, 8, 12), glow, 0, 80, 34);
	for (let i = 0; i < 10; i++) {
		const tooth = add(new G.BoxGeometry(6, 8, 6), dark, 0, 0, 0);
		const a = i / 10 * Math.PI * 2;
		tooth.position.set(Math.cos(a) * 28, 80 + Math.sin(a) * 28, 34);
		tooth.rotation.z = a;
	}
	add(new G.CircleGeometry(10, 24), new G.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }), 6, 84, 39.6);
	// (it faces the arena)
	factory.lookAt(0, fy, 0);

	// smoke from the stacks
	const cloudTex = cloudTexture();
	disposables.push(cloudTex);
	const smoke = [];
	for (let i = 0; i < 36; i++) {
		const m = new G.SpriteMaterial({ map: cloudTex, color: 0x6a6470, transparent: true, depthWrite: false, opacity: 0 });
		const s = new G.Sprite(m);
		scene.add(s);
		smoke.push({ s, age: rand() * 6, stack: i % 4, life: 6 });
		disposables.push(m);
	}
	// (the stacks' tops, now that the factory has turned to face us)
	factory.updateMatrixWorld(true);
	stacks.length = 0;
	factory.children.forEach(function (m) {
		if (m.userData.stackTop) stacks.push(m.getWorldPosition(new G.Vector3()).add(new G.Vector3(0, 3, 0)));
	});

	// clouds: far ones that keep pace with the eye
	const clouds = new G.Group();
	scene.add(clouds);
	for (let i = 0; i < 44; i++) {
		const m = new G.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 + rand() * 0.2 });
		const s = new G.Sprite(m);
		const a = rand() * Math.PI * 2;
		const r = 900 + rand() * 1200;
		const w = 300 + rand() * 500;
		s.position.set(Math.cos(a) * r, 220 + rand() * 380, Math.sin(a) * r);
		s.scale.set(w, w * 0.45, 1);
		clouds.add(s);
		disposables.push(m);
	}

	const world = { sky, ground, clouds, cloudTex, env, factory };

	world.update = function (time, eye, dt) {
		sky.position.copy(eye);
		clouds.position.set(eye.x * 0.7, 0, eye.z * 0.7);
		for (const p of smoke) {
			p.age += dt;
			if (p.age > p.life) p.age -= p.life;
			const k = p.age / p.life;
			const at = stacks[p.stack];
			if (!at) continue;
			p.s.position.set(at.x + k * 40, at.y + k * 70, at.z + k * 10);
			const sz = 14 + k * 50;
			p.s.scale.set(sz, sz * 0.7, 1);
			p.s.material.opacity = Math.sin(Math.PI * k) * 0.7;
		}
	};

	world.dispose = function () {
		env.dispose();
		for (const d of disposables) d.dispose && d.dispose();
	};

	return world;
}
