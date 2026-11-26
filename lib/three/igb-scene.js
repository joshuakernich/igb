/*
 * IGB scenes: what artists make in the Studio (studio.html), loaded into a game.
 *
 * A scene is one JSON file (assets/<game>/scenes/<name>.json): a tree of
 * objects (shapes, imported models, the games' own code-built characters,
 * lights, markers), how it's rendered (tone mapping, exposure, environment,
 * background, fog, bloom, shadows) and where the three wall cameras stand.
 * The Studio builds the scene with this same file, so what the artist sees
 * there is exactly what the game draws.
 *
 *   import { loadScene, createWallComposer, createWallRig } ...
 *   const s = await loadScene('assets/my-game/scenes/main.json', { renderer, live: true });
 *   scene.add(s.root);
 *   const post = createWallComposer(renderer, scene);
 *   const walls = createWallRig();
 *   s.applyRender(scene, post);       // tone mapping, exposure, sky, fog, bloom, shadows
 *   s.applyRig(walls);                // where the wall cameras stand
 *   every frame: s.update(dt); post.render(walls.views(w, h));
 *
 *   s.find('Door')                    the object called Door (null if none)
 *   s.findAll('coin')                 every object tagged coin (or named so)
 *   s.marker('Spawn')                 a marker's world position (a Vector3)
 *   s.instantiate('Player', edit?)    a fresh copy of an object (templates are
 *                                     objects ticked "template" in the Studio:
 *                                     not in the scene, only for copying)
 *   s.play(obj, 'Walk_Loop', { fade: 0.25, speed: 1, loop: true })
 *   s.setMode(obj, 'run')             a code-built character's animation
 *   s.onReload(fn)                    with live: true, the Studio's edits (and
 *                                     saves) rebuild the scene in a running
 *                                     game; find things again in fn
 *   s.dispose()
 *
 * Every object's three.js node has userData.igb (its JSON) and .igbId.
 * Units: metres. Rotations in the JSON: degrees (X, Y, Z order).
 */
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from './addons/utils/SkeletonUtils.js';
import { environmentFromShader } from './walls.js';

export const FORMAT = 1;
const DEG = Math.PI / 180;

/* ---------- defaults ---------- */

export function defaultRender() {
	return {
		toneMapping: 'ACES', exposure: 1,
		background: { type: 'color', color: '#1a1f2e' },
		environment: { preset: 'studio', intensity: 1 },
		fog: { enabled: false, color: '#1a1f2e', near: 10, far: 60 },
		bloom: { strength: 0.5, radius: 0.5, threshold: 0.9, cap: 2.5 },
		shadows: { enabled: true, soft: true },
	};
}
export function defaultRig() { return { position: [0, 1.35, 0], pitch: -6, yaw: 0, fov: 64 }; }
export function emptyScene(name = 'Untitled') {
	return { igbScene: FORMAT, name, render: defaultRender(), rig: defaultRig(), objects: [] };
}
// fill in anything an older or hand-written file leaves out
export function normalize(json) {
	const d = emptyScene(json.name);
	const out = Object.assign(d, json);
	out.render = deepMerge(defaultRender(), json.render || {});
	out.rig = Object.assign(defaultRig(), json.rig || {});
	out.objects = json.objects || [];
	walk(out.objects, (n) => { if (!n.id) n.id = newId(); });
	return out;
}
function deepMerge(a, b) {
	for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? deepMerge(a[k], b[k]) : b[k];
	return a;
}
export function walk(nodes, fn, parent = null) {
	for (const n of nodes || []) { fn(n, parent); walk(n.children, fn, n); }
}
export const newId = () => Math.random().toString(36).slice(2, 10);

/* ---------- presets ---------- */

export const TONE_MAPPINGS = { None: THREE.NoToneMapping, Linear: THREE.LinearToneMapping, Reinhard: THREE.ReinhardToneMapping, Cineon: THREE.CineonToneMapping, ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };

// environments: GLSL vec3 envColor(vec3 d), linear HDR. They light every
// standard material (reflections and soft fill) and can be the background.
export const ENVIRONMENTS = {
	studio: `vec3 envColor(vec3 d) {
		vec3 c = mix(vec3(0.06, 0.07, 0.10), vec3(0.22, 0.24, 0.30), smoothstep(-0.2, 0.6, d.y));
		c += vec3(1.6) * smoothstep(0.82, 0.95, d.y);
		c += vec3(1.4, 1.15, 0.9) * smoothstep(0.75, 0.92, dot(d, normalize(vec3(-0.7, 0.35, -0.6))));
		c += vec3(0.7, 0.85, 1.3) * smoothstep(0.8, 0.95, dot(d, normalize(vec3(0.8, 0.25, 0.5))));
		return c; }`,
	day: `vec3 envColor(vec3 d) {
		vec3 sky = mix(vec3(0.55, 0.75, 1.0), vec3(0.12, 0.35, 0.85), pow(max(d.y, 0.0), 0.5));
		vec3 ground = vec3(0.18, 0.16, 0.13);
		vec3 c = mix(ground, sky, smoothstep(-0.08, 0.04, d.y));
		vec3 sun = normalize(vec3(-0.4, 0.6, -0.5));
		c += vec3(6.0, 5.4, 4.4) * pow(max(dot(d, sun), 0.0), 600.0) + vec3(0.6, 0.5, 0.35) * pow(max(dot(d, sun), 0.0), 8.0);
		return c; }`,
	sunset: `vec3 envColor(vec3 d) {
		float h = max(d.y, 0.0);
		vec3 c = mix(vec3(1.2, 0.5, 0.25), vec3(0.15, 0.12, 0.35), pow(h, 0.45));
		c = mix(vec3(0.08, 0.05, 0.07), c, smoothstep(-0.06, 0.02, d.y));
		vec3 sun = normalize(vec3(0.0, 0.08, -1.0));
		c += vec3(8.0, 3.6, 1.4) * pow(max(dot(d, sun), 0.0), 300.0) + vec3(0.9, 0.35, 0.12) * pow(max(dot(d, sun), 0.0), 6.0);
		return c; }`,
	night: `vec3 envColor(vec3 d) {
		vec3 c = mix(vec3(0.01, 0.012, 0.02), vec3(0.03, 0.05, 0.12), smoothstep(-0.1, 0.8, d.y));
		vec3 moon = normalize(vec3(0.5, 0.55, -0.6));
		c += vec3(1.6, 1.7, 2.0) * pow(max(dot(d, moon), 0.0), 900.0) + vec3(0.05, 0.07, 0.12) * pow(max(dot(d, moon), 0.0), 6.0);
		return c; }`,
	neon: `vec3 envColor(vec3 d) {
		vec3 c = vec3(0.02, 0.01, 0.04);
		c += vec3(1.8, 0.2, 1.2) * smoothstep(0.85, 0.97, dot(d, normalize(vec3(-1.0, 0.3, -0.3))));
		c += vec3(0.2, 1.2, 1.8) * smoothstep(0.85, 0.97, dot(d, normalize(vec3(1.0, 0.3, -0.3))));
		c += vec3(0.6) * smoothstep(0.9, 0.98, d.y);
		return c; }`,
};

export const SHAPES = {
	box: () => new THREE.BoxGeometry(1, 1, 1),
	sphere: () => new THREE.SphereGeometry(0.5, 48, 24),
	cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 48),
	cone: () => new THREE.ConeGeometry(0.5, 1, 48),
	plane: () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
	disc: () => new THREE.CircleGeometry(0.5, 64).rotateX(-Math.PI / 2),
	torus: () => new THREE.TorusGeometry(0.4, 0.1, 16, 64),
	ring: () => new THREE.TorusGeometry(0.5, 0.008, 8, 128).rotateX(-Math.PI / 2),   // (a thin flat hoop, 1 m across: glowing rims and markings)
	capsule: () => new THREE.CapsuleGeometry(0.5, 1, 8, 24),
};

// The games' own code-built characters, placeable like models.
// make(module, params) → { root, step(dt, time, mode) }
const speedsterModes = ['idle', 'jog', 'run', 'flat out', 'ball', 'crouch', 'spring', 'hurt'];
function speedsterStep(s) {
	return (dt, t, mode) => {
		const pace = { jog: 0.35, run: 0.7, 'flat out': 1 }[mode];
		if (pace) s.animate(dt, 'run', pace, 0, t); else s.animate(dt, mode, 0, 30, t);
	};
}
// (game: where it's used, for labels; height: about how tall it stands, in metres, before scaling)
const lifted = (root) => () => { root.position.y = root.userData.lift || 0; };
export const PREFABS = {
	speedster: {
		label: 'Speedster', from: 'shared/speedster3d.js', game: 'Sonic Dash · Sonic Classic', height: 1.6,
		load: () => import('../../shared/speedster3d.js'),
		params: { color: '#2f6cf0', kind: { value: 'sonic', options: ['sonic', 'metal', 'super', 'shadow', 'amy', 'rouge'] } },
		modes: speedsterModes,
		make(m, p) { const s = m.buildSpeedster(new THREE.Color(p.color).getHex(), { kind: p.kind }); return { root: s.root, step: speedsterStep(s) }; },
	},
	robotnik: {
		label: 'Dr Robotnik', from: 'shared/robotnik3d.js', game: 'Super Sonic Battle', height: 2.0,
		load: () => import('../../shared/robotnik3d.js'),
		params: {}, modes: ['idle', 'run'],
		make(m) { const r = m.buildRobotnik(); return { root: r.root, step: (dt, t, mode) => r.animate(dt, mode, mode === 'run' ? 0.7 : 0, 0, t) }; },
	},
	knuckles: {
		label: 'Knuckles', from: 'games/knuckles-quest/models.js', game: 'Knuckles Quest', height: 1.6,
		load: () => import('../../games/knuckles-quest/models.js'),
		params: {}, modes: ['idle', 'run', 'climb', 'glide', 'jump', 'fall'],
		make(m) { const c = m.buildClimber(); return { root: c.root, step: (dt, t, mode) => c.animate(dt, mode, mode === 'climb' ? 1 : mode === 'run' ? 0.8 : 0, t) }; },
	},
	tails: {
		label: 'Tails', from: 'games/twin-tail-tower/models.js', game: 'Tails Jump', height: 1.6,
		load: () => import('../../games/twin-tail-tower/models.js'),
		params: { color: '#f08a12' }, modes: ['idle', 'bounce', 'rotor', 'hurt'],
		make(m, p) {
			const f = m.buildFox(new THREE.Color(p.color).getHex());
			const st = { vy: 0, v0: 9, rotor: false, hurt: false, squash: 0, lean: 0, idle: true };
			let y = 0;
			const lift = lifted(f.root);
			return {
				root: f.root,
				step(dt, t, mode) {
					st.idle = mode === 'idle'; st.rotor = mode === 'rotor'; st.hurt = mode === 'hurt';
					if (mode === 'bounce') { st.vy -= 22 * dt; y += st.vy * dt; if (y <= 0) { y = 0; st.vy = st.v0; st.squash = 1; } }
					else if (mode === 'rotor') { y += (1.2 + Math.sin(t * 2) * 0.15 - y) * Math.min(1, dt * 3); st.vy = 0; }
					else { y *= Math.exp(-dt * 6); st.vy = 0; }
					st.squash *= Math.exp(-dt * 10);
					f.root.userData.lift = y * 0.35;
					f.pose(dt, st);
					lift();
				},
			};
		},
	},
	hoverbot: {
		label: 'Hover Bot', from: 'games/twin-tail-tower/models.js', game: 'Tails Jump', height: 1.3,
		load: () => import('../../games/twin-tail-tower/models.js'),
		params: {}, modes: ['hover'],
		make(m) { const g = m.buildRobot(); return { root: g, step: (dt, t) => { g.position.y = Math.sin(t * 2.4) * 0.12; } }; },
	},
	strider: {
		label: 'Strider', from: 'games/iron-stride/models.js', game: 'Sonic Robot', height: 9.2,
		load: () => import('../../games/iron-stride/models.js'),
		params: {}, modes: ['idle', 'walk', 'turn'],
		make(m) {
			const r = m.buildRobot();
			let pl = 0, pr = Math.PI;
			return {
				root: r.root,
				step(dt, t, mode) {
					if (mode === 'walk') { pl += dt * 2.6; pr += dt * 2.6; r.walk(pl, pr, 1, 1, t); }
					else if (mode === 'turn') { pl += dt * 2.6; pr -= dt * 2.6; r.walk(pl, pr, 0.8, 0.8, t); }
					else r.walk(pl, pr, 0, 0, t);
				},
			};
		},
	},
	crab: {
		label: 'Crab Tank', from: 'games/iron-stride/models.js', game: 'Sonic Robot', height: 1.8,
		load: () => import('../../games/iron-stride/models.js'),
		params: {}, modes: ['idle', 'scuttling'],
		make(m) { const b = m.buildCrab(); return { root: b.root, step: (dt, t, mode) => b.animate(t, dt, mode === 'idle' ? 0 : 3) }; },
	},
	beetle: {
		label: 'Beetle Bot', from: 'games/iron-stride/models.js', game: 'Sonic Robot', height: 2.3,
		load: () => import('../../games/iron-stride/models.js'),
		params: {}, modes: ['idle', 'rolling'],
		make(m) { const b = m.buildBeetle(); return { root: b.root, step: (dt, t, mode) => b.animate(t, dt, mode === 'idle' ? 0 : 3) }; },
	},
	buzzer: {
		label: 'Buzz Drone', from: 'games/iron-stride/models.js', game: 'Sonic Robot', height: 1.8,
		load: () => import('../../games/iron-stride/models.js'),
		params: {}, modes: ['idle', 'buzzing'],
		make(m) { const b = m.buildBuzzer(); return { root: b.root, step: (dt, t, mode) => b.animate(t, dt, mode === 'idle' ? 0 : 3) }; },
	},
};
export function prefabParams(kind, given = {}) {
	const def = PREFABS[kind] ? PREFABS[kind].params : {};
	const out = {};
	for (const k in def) out[k] = given[k] !== undefined ? given[k] : (def[k] && typeof def[k] === 'object' ? def[k].value : def[k]);
	return out;
}

/* ---------- loading assets ---------- */

const gltfCache = new Map();
const texCache = new Map();
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

// A glTF (shared: clone before use). Hosts that won't serve .glb (the claude.ai
// artifact) get the same bytes from <file>.glb.js, which the Studio writes
// beside every .glb it imports.
export function loadGLTF(src, resolve = defaultResolve) {
	const url = resolve(src);
	if (gltfCache.has(url)) return gltfCache.get(url);
	const p = gltfLoader.loadAsync(url).catch(async (e) => {
		if (!/\.glb$/i.test(src)) throw e;
		const m = await import(new URL(src + '.js', document.baseURI).href);
		const bin = Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0));
		return gltfLoader.parseAsync(bin.buffer, '');
	});
	gltfCache.set(url, p);
	p.catch(() => gltfCache.delete(url));
	return p;
}
export function forget(src, resolve = defaultResolve) { gltfCache.delete(resolve(src)); texCache.delete(resolve(src)); }
function loadTexture(src, resolve, srgb = true) {
	const url = resolve(src);
	const key = url + (srgb ? '' : '#lin');
	if (!texCache.has(key)) {
		const t = texLoader.load(url);
		if (srgb) t.colorSpace = THREE.SRGBColorSpace;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		texCache.set(key, t);
	}
	return texCache.get(key);
}
function defaultResolve(src) { return /^(blob:|data:|https?:)/.test(src) ? src : new URL(src, document.baseURI).href; }

/* ---------- building ---------- */

// the material of a shape, from its JSON
export function makeMaterial(m = {}, resolve = defaultResolve) {
	const color = new THREE.Color(m.color || '#cccccc');
	let mat;
	if (m.unlit) {
		mat = new THREE.MeshBasicMaterial({ color: color.multiplyScalar(m.glow || 1) });
	} else {
		mat = new THREE.MeshPhysicalMaterial({
			color,
			metalness: m.metalness ?? 0, roughness: m.roughness ?? 0.6,
			emissive: new THREE.Color(m.emissive || '#000000'), emissiveIntensity: m.emissiveIntensity ?? 1,
			clearcoat: m.clearcoat ?? 0, clearcoatRoughness: 0.15,
			flatShading: !!m.flat,
		});
	}
	if (m.opacity !== undefined && m.opacity < 1) { mat.transparent = true; mat.opacity = m.opacity; mat.depthWrite = m.opacity > 0.6; }
	if (m.map) {
		const t = loadTexture(m.map, resolve).clone();
		t.repeat.set(...(m.repeat || [1, 1]));
		t.needsUpdate = true;
		mat.map = t;
	}
	if (m.normalMap && !m.unlit) {
		const t = loadTexture(m.normalMap, resolve, false).clone();
		t.repeat.set(...(m.repeat || [1, 1]));
		t.needsUpdate = true;
		mat.normalMap = t;
	}
	if (m.side === 'double') mat.side = THREE.DoubleSide;
	return mat;
}

// overrides artists set on an imported model's own materials (by material name)
function overrideMaterial(mat, o) {
	if (!o) return mat;
	mat = mat.clone();
	if (o.color && mat.color) mat.color.set(o.color);
	if (o.emissive && mat.emissive) mat.emissive.set(o.emissive);
	for (const k of ['metalness', 'roughness', 'emissiveIntensity', 'opacity']) if (o[k] !== undefined && k in mat) mat[k] = o[k];
	if (o.opacity !== undefined) mat.transparent = o.opacity < 1;
	return mat;
}

function makeLight(L) {
	const color = new THREE.Color(L.color || '#ffffff');
	const g = new THREE.Group();
	let light;
	switch (L.kind) {
		case 'ambient': light = new THREE.AmbientLight(color, L.intensity ?? 0.4); break;
		case 'hemisphere': light = new THREE.HemisphereLight(color, new THREE.Color(L.groundColor || '#2a2430'), L.intensity ?? 0.6); break;
		case 'point':
			light = new THREE.PointLight(color, L.intensity ?? 10, L.distance ?? 0, L.decay ?? 2); break;
		case 'spot': {
			light = new THREE.SpotLight(color, L.intensity ?? 20, L.distance ?? 0, (L.angle ?? 30) * DEG, L.penumbra ?? 0.3, L.decay ?? 2);
			light.target.position.set(0, 0, -1);
			light.add(light.target);
			break;
		}
		default: {
			// a sun: it shines along the object's forward (-Z); the object marks
			// the middle of the area its shadows cover (shadowArea metres across)
			light = new THREE.DirectionalLight(color, L.intensity ?? 2.5);
			const a = L.shadowArea ?? 24;
			light.position.set(0, 0, a);
			const target = new THREE.Object3D();
			g.add(target);
			light.target = target;
			Object.assign(light.shadow.camera, { left: -a / 2, right: a / 2, top: a / 2, bottom: -a / 2, near: 0.5, far: a * 2 });
		}
	}
	if (L.castShadow && light.shadow) {
		light.castShadow = true;
		const s = L.shadowSize || 2048;
		light.shadow.mapSize.set(s, s);
		light.shadow.bias = L.shadowBias ?? -0.0004;
		light.shadow.normalBias = 0.03;
		light.shadow.camera.updateProjectionMatrix();
	}
	g.add(light);
	g.userData.light = light;
	return g;
}

/*
 * One object: a holder (a Group carrying the object's transform and its
 * children) with its content inside (the mesh, model, light...). Editing a
 * transform never rebuilds; editing a component rebuilds only the content.
 */
export function buildNode(n, ctx) {
	const holder = new THREE.Group();
	holder.name = n.name || '';
	holder.userData.igb = n;
	holder.userData.igbId = n.id;
	applyTransform(holder, n);
	ctx.byId.set(n.id, holder);
	setContent(holder, n, ctx);
	for (const c of n.children || []) if (!c.template || ctx.editor) holder.add(buildNode(c, ctx));
	return holder;
}
export function applyTransform(o, n) {
	o.position.fromArray(n.position || [0, 0, 0]);
	const r = n.rotation || [0, 0, 0];
	o.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
	o.scale.fromArray(n.scale || [1, 1, 1]);
	o.visible = n.visible !== false && (!n.template || !!ctx_editorShowsTemplates);
}
let ctx_editorShowsTemplates = false;
export function editorShowsTemplates(v) { ctx_editorShowsTemplates = v; }

export function setContent(holder, n, ctx) {
	const old = holder.userData.content;
	if (old) { holder.remove(old); disposeContent(old); }
	ctx.anims.delete(n.id);
	const content = new THREE.Group();
	content.name = '(content)';
	content.userData.isContent = true;
	holder.userData.content = content;
	holder.add(content);
	const shadows = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = n.castShadow !== false; m.receiveShadow = n.receiveShadow !== false; } });
	const ready = (o) => { ctx.onReady && ctx.onReady(holder, o); };

	switch (n.type) {
		case 'mesh': {
			const geo = (SHAPES[n.mesh?.shape] || SHAPES.box)();
			const mesh = new THREE.Mesh(geo, makeMaterial(n.material, ctx.resolve));
			content.add(mesh);
			shadows(content);
			break;
		}
		case 'light':
			content.add(makeLight(n.light || {}));
			break;
		case 'model': {
			const src = n.model?.src;
			if (!src) break;
			const token = {};
			content.userData.token = token;
			ctx.pending.push(loadGLTF(src, ctx.resolve).then((gltf) => {
				if (holder.userData.content !== content || content.userData.token !== token) return;
				const obj = cloneSkinned(gltf.scene);
				const ov = n.model.materials || {};
				obj.traverse((m) => {
					if (!m.isMesh) return;
					m.material = Array.isArray(m.material) ? m.material.map((x) => overrideMaterial(x, ov[x.name])) : overrideMaterial(m.material, ov[m.material.name]);
					if (n.model.tint && !ov[m.material.name]) { m.material = m.material.clone(); m.material.color && m.material.color.multiply(new THREE.Color(n.model.tint)); }
				});
				shadows(obj);
				content.add(obj);
				const clips = gltf.animations || [];
				const mixer = new THREE.AnimationMixer(obj);
				const anim = { kind: 'mixer', mixer, clips, current: null, root: obj };
				ctx.anims.set(n.id, anim);
				const a = n.model.anim;
				if (a && a.clip) playClip(anim, a.clip, { speed: a.speed ?? 1, loop: a.loop !== false, fade: 0 });
				ready(obj);
			}).catch((e) => { console.warn('IGB scene: could not load', src, e); ctx.onError && ctx.onError(holder, src, e); }));
			break;
		}
		case 'prefab': {
			const P = PREFABS[n.prefab?.kind];
			if (!P) break;
			const token = {};
			content.userData.token = token;
			ctx.pending.push(P.load().then((mod) => {
				if (holder.userData.content !== content || content.userData.token !== token) return;
				const made = P.make(mod, prefabParams(n.prefab.kind, n.prefab.params));
				shadows(made.root);
				content.add(made.root);
				ctx.anims.set(n.id, { kind: 'prefab', step: made.step, mode: n.prefab.mode || P.modes[0], root: made.root });
				made.step(0, 0, n.prefab.mode || P.modes[0]);
				ready(made.root);
			}).catch((e) => console.warn('IGB scene: prefab', n.prefab.kind, e)));
			break;
		}
		default: break;   // group, marker
	}
	return content;
}

function disposeContent(o) {
	o.traverse((m) => {
		if (m.isMesh && m.userData.ownGeometry !== false && m.geometry && !m.isSkinnedMesh) m.geometry.dispose();
		if (m.isLight && m.shadow && m.shadow.map) m.shadow.map.dispose();
	});
}

function playClip(anim, name, { fade = 0.25, speed = 1, loop = true } = {}) {
	if (anim.kind !== 'mixer') return null;
	const clip = anim.clips.find((c) => c.name === name);
	if (!clip) return null;
	const action = anim.mixer.clipAction(clip);
	action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
	action.clampWhenFinished = !loop;
	action.timeScale = speed;
	if (anim.current === action) return action;
	action.reset().play();
	if (anim.current && fade > 0) anim.current.crossFadeTo(action, fade, false);
	else if (anim.current) anim.current.stop();
	anim.current = action;
	return action;
}

/* ---------- a whole scene ---------- */

export class IGBScene {
	constructor(json, opts = {}) {
		this.opts = opts;
		this.renderer = opts.renderer || null;
		this.resolve = opts.resolve || defaultResolve;
		this.root = new THREE.Group();
		this.root.name = 'IGB Scene';
		this.time = 0;
		this.reloaders = [];
		this.env = null;
		this.envKey = '';
		this.build(json);
	}
	build(json) {
		this.json = normalize(json);
		for (const c of [...this.root.children]) { this.root.remove(c); c.traverse((o) => o.userData.isContent && disposeContent(o)); }
		this.ctx = { byId: new Map(), anims: new Map(), pending: [], resolve: this.resolve, editor: !!this.opts.editor, onReady: this.opts.onReady, onError: this.opts.onError };
		for (const n of this.json.objects) if (!n.template || this.opts.editor) this.root.add(buildNode(n, this.ctx));
		this.ready = Promise.allSettled(this.ctx.pending).then(() => this);
		return this.ready;
	}
	get byId() { return this.ctx.byId; }

	find(name) {
		let hit = null;
		walk(this.json.objects, (n) => { if (!hit && n.name === name && !n.template) hit = this.ctx.byId.get(n.id) || null; });
		return hit;
	}
	findAll(tag) {
		const out = [];
		walk(this.json.objects, (n) => { if (!n.template && (n.tag === tag || n.name === tag) && this.ctx.byId.get(n.id)) out.push(this.ctx.byId.get(n.id)); });
		return out;
	}
	marker(name) {
		const o = this.find(name);
		return o ? o.getWorldPosition(new THREE.Vector3()) : null;
	}
	node(name) { let hit = null; walk(this.json.objects, (n) => { if (!hit && n.name === name) hit = n; }); return hit; }

	// a fresh copy of an object (or template), with its own animations; add it where you like
	// (edit(json) can change the copy first: s.instantiate('Player', (n) => { n.model.tint = colour; }))
	instantiate(name, edit) {
		const n = typeof name === 'string' ? this.node(name) : name;
		if (!n) { console.warn('IGB scene: nothing called', name); return null; }
		const copy = JSON.parse(JSON.stringify(n));
		walk([copy], (c) => { c.id = newId(); c.template = false; });
		if (edit) edit(copy);
		const o = buildNode(copy, this.ctx);
		o.visible = true;
		return o;
	}
	anim(obj) {
		const o = typeof obj === 'string' ? this.find(obj) : obj;
		return o ? this.ctx.anims.get(o.userData.igbId) : null;
	}
	// a model's clip (crossfading from whatever it was playing)
	play(obj, clip, opts) { const a = this.anim(obj); return a ? playClip(a, clip, opts) : null; }
	clips(obj) { const a = this.anim(obj); return a && a.kind === 'mixer' ? a.clips.map((c) => c.name) : []; }
	// a code-built character's mode ('run', 'idle'...)
	setMode(obj, mode) { const a = this.anim(obj); if (a && a.kind === 'prefab') a.mode = mode; }

	update(dt) {
		this.time += dt;
		for (const a of this.ctx.anims.values()) {
			if (a.kind === 'mixer') a.mixer.update(dt);
			else a.step(dt, this.time, a.mode);
		}
	}

	// rendering settings onto a renderer, a three.js scene and (optionally) the walls.js composer
	applyRender(scene, post, renderer = this.renderer) {
		const r = this.json.render;
		if (renderer) {
			renderer.toneMapping = TONE_MAPPINGS[r.toneMapping] ?? THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = r.exposure;
			renderer.shadowMap.enabled = !!r.shadows.enabled;
			renderer.shadowMap.type = r.shadows.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
		}
		const preset = r.environment.preset;
		if (renderer && preset !== this.envKey) {
			if (this.env) this.env.dispose();
			this.env = ENVIRONMENTS[preset] ? environmentFromShader(renderer, ENVIRONMENTS[preset]) : null;
			this.envKey = preset;
		}
		scene.environment = this.env;
		scene.environmentIntensity = r.environment.intensity;
		const bg = r.background;
		if (bg.type === 'environment' && this.env) { scene.background = this.env; scene.backgroundIntensity = bg.intensity ?? 1; scene.backgroundBlurriness = bg.blur ?? 0; }
		else if (bg.type === 'none') scene.background = null;
		else scene.background = new THREE.Color(bg.color);
		scene.fog = r.fog.enabled ? new THREE.Fog(r.fog.color, r.fog.near, r.fog.far) : null;
		if (post) {
			post.bloom.strength = r.bloom.strength;
			post.bloom.radius = r.bloom.radius;
			post.bloom.threshold = r.bloom.threshold;
			post.cap = r.bloom.cap;
		}
	}
	// where the three wall cameras stand (a createWallRig from walls.js)
	applyRig(walls) {
		const g = this.json.rig;
		walls.rig.position.fromArray(g.position);
		walls.rig.rotation.set(g.pitch * DEG, g.yaw * DEG, 0, 'YXZ');
		for (const c of walls.cameras) { c.fov = g.fov; c.updateProjectionMatrix(); }
	}

	onReload(fn) { this.reloaders.push(fn); }
	// rebuild from new JSON (the Studio's live edits)
	async reload(json) {
		await this.build(json);
		for (const fn of this.reloaders) fn(this);
	}
	dispose() {
		if (this.channel) this.channel.close();
		for (const c of [...this.root.children]) c.traverse((o) => o.userData.isContent && disposeContent(o));
		if (this.env) this.env.dispose();
	}
}

// Load a scene file (or JSON). live: rebuild whenever the Studio edits or saves it.
export async function loadScene(src, opts = {}) {
	let json = src, path = null;
	if (typeof src === 'string') {
		path = src;
		const res = await fetch(src, { cache: 'no-store' });
		if (!res.ok) throw new Error('IGB scene: ' + src + ' ' + res.status);
		json = await res.json();
	}
	const s = new IGBScene(json, opts);
	s.path = path;
	if (opts.live && path && 'BroadcastChannel' in window) {
		s.channel = new BroadcastChannel('igb-studio');
		s.channel.onmessage = (e) => {
			const m = e.data || {};
			if (m.path && samePath(m.path, path) && m.json) s.reload(m.json);
		};
	}
	await s.ready;
	return s;
}
const samePath = (a, b) => a.replace(/^\.?\//, '') === b.replace(/^\.?\//, '');
