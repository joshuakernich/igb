/*
 * The virtual gamebox (gamebox.html).
 *
 * A real IGB game runs, unchanged, on a stage hidden under the page. Every
 * frame, once the stage has drawn, its canvases are copied into one strip
 * (left | front | right, like the world) and that strip is the texture on the
 * three walls of a 3D room. Bot players move about the room: their positions
 * go to the game through the tracker's own message path (forceMessage) and
 * the same positions place their figures in the room, so what the walls show
 * is what those figures are doing. Taps go through the game's test.tap.
 * The storyboard embeds it (?embed=1) and draws window.gamebox.canvas.
 *
 *   gamebox.html?game=loop-island&players=3&view=outside
 */
import * as THREE from '../lib/three/three.module.min.js';
import { GLTFLoader } from '../lib/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../lib/three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from '../lib/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../lib/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../lib/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../lib/three/addons/postprocessing/OutputPass.js';

const SONIC = [
	{ id: 'loop-island', name: 'Sonic Dash', bot: 'weave' },
	{ id: 'knuckles-quest', name: 'Knuckles Quest', bot: 'tapper' },
	{ id: 'quill-relay', name: 'Sonic Classic', bot: 'walls' },
	{ id: 'iron-stride', name: 'Sonic Robot', bot: 'mech', players: 2 },
	{ id: 'tails-escape', name: 'Tails Escape', bot: 'escape' },
	{ id: 'super-sonic-battle', name: 'Super Sonic Battle', bot: 'battle' },
	{ id: 'twin-tail-tower', name: 'Tails Jump', bot: 'weave', hidden: true },
];
const COLORS = ['#ff2a2a', '#2f6bff', '#32cd32', '#dd00ff', '#ff6600', '#ffbb00'];

// The room in metres: walls 16:10, square floor. Tracking X/Z run -1..1 across it.
const ROOM = { w: 5, d: 5, h: 3.125 };
const SCALE = 0.5;                 // the hidden stage's scale (world 4800 x 1000 -> 2400 x 500)
const STRIP = { w: 3072, h: 640 }; // the copied walls: 1024 x 640 each

const params = new URLSearchParams(location.search);
const $world = $('igb-world');
const $status = $('#status');

/* ---------- the hidden stage ---------- */

$world.css({ transform: `scale(${SCALE})` });
IGB.setScale(SCALE);

let game = null, entry = null, starting = 0;
const strip = document.createElement('canvas');
strip.width = STRIP.w; strip.height = STRIP.h;
const sctx = strip.getContext('2d');

// Copy every canvas the stage shows into the strip, where it sits in the world.
function copyWalls() {
	sctx.fillStyle = '#000';
	sctx.fillRect(0, 0, STRIP.w, STRIP.h);
	if (!game || !game.stage || game.stage.stopped) return;
	const box = game.stage.$el[0].getBoundingClientRect();
	if (!box.width) return;
	const kx = STRIP.w / box.width, ky = STRIP.h / box.height;
	for (const c of game.stage.$el[0].querySelectorAll('canvas')) {
		if (!c.width || !c.height) continue;
		const st = getComputedStyle(c);
		if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
		const r = c.getBoundingClientRect();
		if (r.width < 2 || r.height < 2) continue;
		try { sctx.drawImage(c, (r.left - box.left) * kx, (r.top - box.top) * ky, r.width * kx, r.height * ky); } catch (e) { /* (a canvas mid-resize) */ }
	}
}

/* ---------- the room ---------- */

const canvas = document.getElementById('room');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0e0726');
scene.fog = new THREE.Fog('#0e0726', 14, 30);
const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.05, 80);

const wallTex = new THREE.CanvasTexture(strip);
wallTex.colorSpace = THREE.SRGBColorSpace;
wallTex.anisotropy = 8;
const wallMat = new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false });

// One plane per wall, its UVs covering that wall's third of the strip.
function wall(n) {
	const g = new THREE.PlaneGeometry(n === 1 ? ROOM.w : ROOM.d, ROOM.h);
	const uv = g.attributes.uv;
	for (let i = 0; i < uv.count; i++) uv.setX(i, (n + uv.getX(i)) / 3);
	const m = new THREE.Mesh(g, wallMat);
	m.position.y = ROOM.h / 2;
	// (the left wall's left edge is the back of the room; the right wall's is the front corner)
	if (n === 0) { m.rotation.y = Math.PI / 2; m.position.x = -ROOM.w / 2; }
	if (n === 1) { m.position.z = -ROOM.d / 2; }
	if (n === 2) { m.rotation.y = -Math.PI / 2; m.position.x = ROOM.w / 2; }
	scene.add(m);
	return m;
}
const walls = [wall(0), wall(1), wall(2)];

// The floor: dark, with a faint drafting grid and the room's outline.
const floorTex = (() => {
	const c = document.createElement('canvas'); c.width = c.height = 1024;
	const x = c.getContext('2d');
	x.fillStyle = '#140a33'; x.fillRect(0, 0, 1024, 1024);
	x.strokeStyle = 'rgba(150,120,255,0.16)'; x.lineWidth = 2;
	for (let i = 0; i <= 10; i++) { const p = i * 102.4; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 1024); x.moveTo(0, p); x.lineTo(1024, p); x.stroke(); }
	x.strokeStyle = 'rgba(205,178,255,0.5)'; x.lineWidth = 6; x.strokeRect(3, 3, 1018, 1018);
	const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
	return t;
})();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// The box's frame: thin edges along the top and the open back.
const edge = new THREE.LineBasicMaterial({ color: '#cdb2ff', transparent: true, opacity: 0.55 });
const hw = ROOM.w / 2, hd = ROOM.d / 2, H = ROOM.h;
scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
	new THREE.Vector3(-hw, H, hd), new THREE.Vector3(-hw, H, -hd), new THREE.Vector3(-hw, H, -hd), new THREE.Vector3(hw, H, -hd),
	new THREE.Vector3(hw, H, -hd), new THREE.Vector3(hw, H, hd), new THREE.Vector3(-hw, 0, hd), new THREE.Vector3(-hw, H, hd),
	new THREE.Vector3(hw, 0, hd), new THREE.Vector3(hw, H, hd),
]), edge));

// Light: a dim fill, a key from above the open back, and each wall's own glow.
scene.add(new THREE.HemisphereLight('#8a7ad8', '#120828', 0.9));
const key = new THREE.DirectionalLight('#ffffff', 1.1);
key.position.set(1.5, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 15 });
scene.add(key);
const glows = [0, 1, 2].map((n) => {
	const l = new THREE.PointLight('#ffffff', 6, 7, 1.6);
	l.position.set(n === 0 ? -hw + 0.4 : n === 2 ? hw - 0.4 : 0, H * 0.55, n === 1 ? -hd + 0.4 : 0);
	scene.add(l);
	return l;
});
// (each wall's average colour, a few times a second)
const tiny = document.createElement('canvas'); tiny.width = 3; tiny.height = 1;
const tctx = tiny.getContext('2d', { willReadFrequently: true });
let glowAt = 0;
function updateGlow(now) {
	if (now - glowAt < 200) return;
	glowAt = now;
	tctx.drawImage(strip, 0, 0, 3, 1);
	const d = tctx.getImageData(0, 0, 3, 1).data;
	glows.forEach((l, n) => l.color.setRGB(d[n * 4] / 255, d[n * 4 + 1] / 255, d[n * 4 + 2] / 255, THREE.SRGBColorSpace));
}

/* ---------- the players' figures ---------- */

function Figure(n) {
	const col = new THREE.Color(COLORS[n % COLORS.length]);
	const skin = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.05 });
	const dark = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.45), roughness: 0.6 });
	const visor = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2, metalness: 0.6 });
	const root = new THREE.Group();
	const body = new THREE.Group();
	root.add(body);
	const cast = (m) => { m.castShadow = true; return m; };
	const torso = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), skin));
	torso.position.y = 1.12;
	const head = cast(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), skin));
	head.position.y = 1.62;
	const hat = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.16, 0.08, 20), visor));   // (the tracking hat)
	hat.position.y = 1.7;
	body.add(torso, head, hat);
	const limb = (len, r, mat) => {
		const pivot = new THREE.Group();
		const m = cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat));
		m.position.y = -len / 2 - r;
		pivot.add(m);
		return pivot;
	};
	const legs = [limb(0.55, 0.075, dark), limb(0.55, 0.075, dark)];
	legs[0].position.set(-0.1, 0.78, 0); legs[1].position.set(0.1, 0.78, 0);
	const arms = [limb(0.42, 0.06, skin), limb(0.42, 0.06, skin)];
	arms[0].position.set(-0.27, 1.38, 0); arms[1].position.set(0.27, 1.38, 0);
	body.add(...legs, ...arms);
	// the tracker's marker under their feet
	const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.32, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 }));
	ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01;
	root.add(ring);
	scene.add(root);

	const f = { root, body, legs, arms, x: 0, z: 0, y: 0, face: 0, phase: Math.random() * 6, reach: 0, reachTo: null };
	f.update = function (s, dt) {
		// s: { X, Y, Z, face }, the very values the game was sent
		const x = s.X * hw * 0.92, z = -s.Z * hd * 0.92;
		const v = Math.hypot(x - f.x, z - f.z) / Math.max(dt, 1e-3);
		f.x = x; f.z = z;
		root.position.set(x, 0, z);
		// turn smoothly toward the way they face
		let d = s.face - f.face; d = Math.atan2(Math.sin(d), Math.cos(d));
		f.face += d * Math.min(1, dt * 8);
		root.rotation.y = f.face + Math.PI;   // (the figure's own front is +z; face 0 looks at the front wall, -z)
		// walking, squatting, jumping
		const stride = Math.min(1, v / 1.6);
		f.phase += dt * (4 + v * 3);
		const sw = Math.sin(f.phase) * 0.65 * stride;
		legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
		const lift = Math.max(0, s.Y) * 0.9, squat = Math.min(0, s.Y) * 0.7;
		body.position.y = lift + squat * 0.6 + Math.abs(Math.cos(f.phase)) * 0.04 * stride;
		const bend = lift > 0.05 ? -0.5 : squat < -0.05 ? 0.9 : 0;
		legs[0].rotation.x += bend * 0.6; legs[1].rotation.x += bend * 0.6;
		// arms swing, or one reaches out to touch the wall
		f.reach = Math.max(0, f.reach - dt * 2.4);
		arms[0].rotation.x = -sw * 0.8 + (lift > 0.05 ? -2.4 : 0);
		arms[1].rotation.x = sw * 0.8 + (lift > 0.05 ? -2.4 : 0);
		if (f.reach > 0) {
			const k = Math.sin(Math.min(1, f.reach) * Math.PI);
			arms[1].rotation.x = -1.2 - 0.5 * k + (f.reachUp || 0) * k;
		}
	};
	f.tap = function (tap) { f.reach = 1; f.reachUp = (0.5 - tap.y) * 1.6; };
	f.dispose = function () { scene.remove(root); };
	return f;
}


/* ---------- the players as glowing ghosts ----------
   Quaternius's Mannequin (assets/shared/mannequin.glb, CC0), one clone per
   player: idle / walk / jog / sprint blended by how fast they're really
   moving, crouch and jump from the height the game reads, and the right arm
   reaching to the very spot on the wall a tap lands. Drawn as a ghost: a
   rim glow in the player's colour, bright at the silhouette and nearly clear
   through the body, with a thin glowing outline; bloom spills it into the room. */

const MANNEQUIN = 'assets/shared/mannequin.glb';
const HEIGHT = 1.75;   // metres
let ghostKit = null;   // { scene, clips, scale }
// (the .glb, or where a host won't serve .glb, the same bytes from a module)
async function loadMannequin() {
	const loader = new GLTFLoader();
	try { return await loader.loadAsync(MANNEQUIN); } catch (e) {
		const m = await import('../' + MANNEQUIN + '.js');
		const bin = Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0));
		return await loader.parseAsync(bin.buffer, '');
	}
}
// How fast the ground goes by in a locomotion clip (metres a second, at our
// scale): while a foot is planted it slides back under the hips at exactly
// the speed the body moves, so sample the clip and time the planted feet.
function groundSpeed(scene, clip, scale) {
	const c = cloneSkinned(scene), mixer = new THREE.AnimationMixer(c);
	mixer.clipAction(clip).play();
	const feet = ['DEF-foot.L', 'DEF-foot.R'].map((k) => boneNamed(c, k)).filter(Boolean);
	const N = 120, dt = clip.duration / N, pts = feet.map(() => []), v = new THREE.Vector3();
	for (let i = 0; i <= N; i++) {
		mixer.setTime(i * dt);
		c.updateMatrixWorld(true);
		feet.forEach((f, k) => { f.getWorldPosition(v); pts[k].push({ y: v.y, z: v.z }); });
	}
	// the stance: the longest run (round the loop) of samples with the foot in
	// the low third of its height range; how far it slid back over that run
	const speeds = [];
	for (const ps of pts) {
		const n = ps.length - 1;   // (the last sample repeats the first)
		const ys = ps.slice(0, n).map((p) => p.y), lo = Math.min(...ys), hi = Math.max(...ys), th = lo + (hi - lo) * 0.35;
		const down = ys.map((y) => y < th);
		if (down.every(Boolean) || !down.some(Boolean)) continue;
		let start = down.findIndex((d, i) => d && !down[(i - 1 + n) % n]), best = null;
		for (let i = 0; i < n; i++) {
			const s0 = (start + i) % n;
			if (!down[s0] || down[(s0 - 1 + n) % n]) continue;
			let len = 0; while (len < n && down[(s0 + len) % n]) len++;
			if (!best || len > best.len) best = { s0, len };
		}
		if (!best || best.len < 3) continue;
		const z0 = ps[best.s0].z, z1 = ps[(best.s0 + best.len - 1) % n].z;
		speeds.push((z0 - z1) / ((best.len - 1) * dt) * scale);
	}
	return speeds.length ? speeds.reduce((a, b) => a + b) / speeds.length : 0;
}
// (glTF node names lose their dots on loading: 'DEF-foot.L' becomes 'DEF-footL')
const boneNamed = (obj, name) => obj.getObjectByName(name) || obj.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
const GAITS = { Walk_Loop: 1.3, Jog_Fwd_Loop: 3.0, Sprint_Loop: 5.5, Crouch_Fwd_Loop: 0.9 };   // (fallbacks, m/s)
const ghostReady = loadMannequin().then((gltf) => {
	const box = new THREE.Box3().setFromObject(gltf.scene);
	const clips = {};
	for (const c of gltf.animations) clips[c.name] = c;
	const scale = HEIGHT / Math.max(0.01, box.max.y - box.min.y);
	const speed = {};
	for (const k in GAITS) { const v = clips[k] ? groundSpeed(gltf.scene, clips[k], scale) : 0; speed[k] = v > 0.2 && v < 12 ? v : GAITS[k]; }
	ghostKit = { scene: gltf.scene, clips, scale, floor: box.min.y, speed };
	window.gamebox && (window.gamebox.gaits = speed);
}).catch((e) => console.warn('No mannequin, using the simple figures', e));

const GHOST_VERT = `
	#include <common>
	#include <skinning_pars_vertex>
	uniform float grow;
	varying vec3 vN;
	varying vec3 vV;
	void main() {
		#include <beginnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <begin_vertex>
		#include <skinning_vertex>
		float nl = length(objectNormal);
		vec3 nrm = nl > 1e-4 ? objectNormal / nl : vec3(0.0, 1.0, 0.0);   // (a few vertices carry no normal)
		if (grow > 0.0) transformed += nrm * grow;
		vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
		vN = normalize(normalMatrix * nrm);
		vV = normalize(-mv.xyz);
		gl_Position = projectionMatrix * mv;
	}`;
const GHOST_FRAG = `
	uniform vec3 color;
	uniform float core, rim, power, alpha;
	varying vec3 vN;
	varying vec3 vV;
	void main() {
		float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
		float r = pow(f, power);
		gl_FragColor = vec4(color * (core + r * rim), (core + r) * alpha);
	}`;
function ghostMaterial(col, outline) {
	return new THREE.ShaderMaterial({
		uniforms: {
			color: { value: col.clone() },
			grow: { value: outline ? 0.012 : 0 },
			core: { value: outline ? 0.0 : 0.05 },
			rim: { value: outline ? 2.6 : 2.2 },
			power: { value: outline ? 1.2 : 2.4 },
			alpha: { value: outline ? 0.9 : 0.85 },
		},
		vertexShader: GHOST_VERT,
		fragmentShader: GHOST_FRAG,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: outline ? THREE.BackSide : THREE.FrontSide,
		toneMapped: false,
	});
}

// a soft pool of the player's colour on the floor
const poolTex = (() => {
	const c = document.createElement('canvas'); c.width = c.height = 128;
	const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
	x.fillStyle = g; x.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(c);
})();

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), Y_AXIS = new THREE.Vector3(0, 1, 0);

function GhostFigure(n) {
	const col = new THREE.Color(COLORS[n % COLORS.length]).multiplyScalar(1.4);
	const root = new THREE.Group();
	const body = cloneSkinned(ghostKit.scene);
	body.scale.setScalar(ghostKit.scale);
	body.position.y = -ghostKit.floor * ghostKit.scale;
	const skinned = [];
	body.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
	for (const m of skinned) {
		m.material = ghostMaterial(col, false);
		m.frustumCulled = false;
		const shell = m.clone();
		shell.material = ghostMaterial(col, true);
		shell.frustumCulled = false;
		shell.bind(m.skeleton, m.bindMatrix);
		m.parent.add(shell);
	}
	const lift = new THREE.Group();
	lift.add(body);
	root.add(lift);
	const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: poolTex, color: col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
	pool.rotation.x = -Math.PI / 2; pool.position.y = 0.012;
	root.add(pool);
	scene.add(root);

	const mixer = new THREE.AnimationMixer(body);
	const act = {};
	for (const name of ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Jump_Loop']) {
		const clip = ghostKit.clips[name];
		if (!clip) continue;
		const a = mixer.clipAction(clip);
		a.play(); a.setEffectiveWeight(0);
		a.time = Math.random() * clip.duration;   // (out of step with each other)
		act[name] = a;
	}
	const bone = (k) => boneNamed(body, k);
	const arm = { upper: bone('DEF-upper_arm.R'), fore: bone('DEF-forearm.R'), hand: bone('DEF-hand.R') };
	if (!arm.upper || !arm.fore || !arm.hand) console.warn('Ghost: arm bones not found');
	const GAIT = ['Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop'];
	for (const k of [...GAIT, 'Crouch_Fwd_Loop']) if (act[k]) act[k].timeScale = 0;   // (these are stepped by hand, in phase: see below)
	const vOf = ghostKit.speed;

	// The body stands where the tracker puts them, but its feet stay planted
	// through small drifts: it only sets off once they're a few centimetres
	// away, steps over at a walking pace at least, and stops dead once there.
	const f = { x: 0, z: 0, placed: false, moving: false, face: 0, speed: 0, tSpeed: 0, tx: 0, tz: 0, phase: Math.random(), reachT: -1, reachTo: new THREE.Vector3(), blend: {} };
	const START = 0.06, STOP = 0.012, MIN_STEP = 0.55;   // metres, metres, m/s
	const REACH = { up: 0.28, hold: 0.32, down: 0.3 };   // seconds
	const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

	f.update = function (s, dt) {
		const tx = s.X * hw * 0.92, tz = -s.Z * hd * 0.92;
		if (!f.placed) { f.x = f.tx = tx; f.z = f.tz = tz; f.placed = true; }
		// how fast the tracked person is going (smoothed)
		const tv = Math.hypot(tx - f.tx, tz - f.tz) / Math.max(dt, 1e-3);
		f.tSpeed += (tv - f.tSpeed) * Math.min(1, dt * 5);
		f.tx = tx; f.tz = tz;
		// the body follows
		const ex = tx - f.x, ez = tz - f.z, dist = Math.hypot(ex, ez);
		if (!f.moving && dist > START) f.moving = true;
		if (f.moving && dist < STOP && f.tSpeed < 0.15) f.moving = false;
		let step = 0;
		if (f.moving && dist > 1e-5) {
			const want = Math.min(7, Math.max(f.tSpeed, dist * 3, MIN_STEP));
			step = Math.min(dist, want * dt);
			f.x += ex / dist * step; f.z += ez / dist * step;
		}
		const v = step / Math.max(dt, 1e-3);
		f.speed += (v - f.speed) * Math.min(1, dt * 10);
		root.position.set(f.x, 0, f.z);

		// facing: the way they're walking while they walk (feet don't skate
		// sideways), otherwise where the game has them looking
		const reaching = f.reachT >= 0;
		const want = f.speed > 0.25 && !reaching ? Math.atan2(-ex, -ez) : s.face;
		let d = want - f.face; d = Math.atan2(Math.sin(d), Math.cos(d));
		f.face += d * Math.min(1, dt * (f.speed > 0.25 ? 7 : 3.5));
		root.rotation.y = f.face + Math.PI;

		// the blend
		const sp = f.speed, crouch = s.Y < -0.06, jump = s.Y > 0.06;
		const w = { Idle_Loop: 0, Walk_Loop: 0, Jog_Fwd_Loop: 0, Sprint_Loop: 0, Crouch_Idle_Loop: 0, Crouch_Fwd_Loop: 0, Jump_Loop: 0 };
		const vW = vOf.Walk_Loop, vJ = vOf.Jog_Fwd_Loop, vS = vOf.Sprint_Loop;
		if (jump) w.Jump_Loop = 1;
		else if (crouch) { const k = smooth(0.03, 0.3, sp); w.Crouch_Idle_Loop = 1 - k; w.Crouch_Fwd_Loop = k; }
		else if (sp <= vW) { const k = smooth(0.03, 0.3, sp); w.Idle_Loop = 1 - k; w.Walk_Loop = k; }
		else if (sp <= vJ) { const k = (sp - vW) / (vJ - vW); w.Walk_Loop = 1 - k; w.Jog_Fwd_Loop = k; }
		else { const k = Math.min(1, (sp - vJ) / (vS - vJ)); w.Jog_Fwd_Loop = 1 - k; w.Sprint_Loop = k; }
		for (const k in act) {
			f.blend[k] = (f.blend[k] || 0) + (w[k] - (f.blend[k] || 0)) * Math.min(1, dt * 10);
			act[k].setEffectiveWeight(f.blend[k]);
		}
		// One stride phase for walk, jog and sprint, advanced at the rate that
		// makes the planted foot keep pace with the ground (each clip at
		// speed / its own ground speed), so blending between gaits never slips.
		let rate = 0, tot = 0;
		for (const k of GAIT) if (act[k] && f.blend[k] > 0.001) { rate += f.blend[k] * (Math.max(sp, 0.12) / vOf[k]) / act[k].getClip().duration; tot += f.blend[k]; }
		if (tot > 0) f.phase = (f.phase + dt * rate / tot) % 1;
		for (const k of GAIT) if (act[k]) act[k].time = f.phase * act[k].getClip().duration;
		if (act.Crouch_Fwd_Loop) { const c = act.Crouch_Fwd_Loop; c.time = (c.time + dt * Math.max(sp, 0.1) / vOf.Crouch_Fwd_Loop) % c.getClip().duration; }
		lift.position.y = jump ? s.Y * 0.9 : 0;
		mixer.update(dt);

		// the touch: a two-bone reach, shoulder and elbow solved together so
		// the hand lands on the spot, the elbow bending down and out
		if (reaching) {
			f.reachT += dt;
			const t = f.reachT;
			const k = t < REACH.up ? smooth(0, REACH.up, t) : t < REACH.up + REACH.hold ? 1 : 1 - smooth(REACH.up + REACH.hold, REACH.up + REACH.hold + REACH.down, t);
			if (t > REACH.up + REACH.hold + REACH.down) f.reachT = -1;
			if (k > 0 && arm.upper && arm.fore && arm.hand) reachTo(k);
		}
	};

	const S = new THREE.Vector3(), E = new THREE.Vector3(), H = new THREE.Vector3(), T = new THREE.Vector3(), dir = new THREE.Vector3(), pole = new THREE.Vector3(), side = new THREE.Vector3(), elbow = new THREE.Vector3();
	const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion();
	// turn a bone (it runs along its own +y) so it points from its head at `to`, by k
	function aim(b, to, k) {
		b.updateWorldMatrix(true, false);
		const head = b.getWorldPosition(new THREE.Vector3());
		const cur = Y_AXIS.clone().applyQuaternion(b.getWorldQuaternion(qa)).normalize();
		const want = to.clone().sub(head).normalize();
		const worldQ = qa.premultiply(qb.setFromUnitVectors(cur, want));
		const local = b.parent.getWorldQuaternion(qp).invert().multiply(worldQ);
		b.quaternion.slerp(local, k);
		b.updateWorldMatrix(false, true);
	}
	function reachTo(k) {
		body.updateMatrixWorld(true);
		arm.upper.getWorldPosition(S);
		arm.fore.getWorldPosition(E);
		arm.hand.getWorldPosition(H);
		const a = S.distanceTo(E), b = E.distanceTo(H);
		// the hand stops on the wall's surface, a touch short of fully straight
		T.copy(f.reachTo);
		dir.copy(T).sub(S);
		const d = Math.min(dir.length(), (a + b) * 0.985);
		dir.normalize();
		T.copy(S).addScaledVector(dir, d);
		// the elbow: down and out to their right, and a little back
		side.set(-1, 0, 0).applyQuaternion(root.quaternion);   // (their right: the figure faces +z before root's turn)
		pole.set(0, -1, 0).addScaledVector(side, 0.7).add(new THREE.Vector3(0, 0, -0.3).applyQuaternion(root.quaternion));
		pole.addScaledVector(dir, -pole.dot(dir)).normalize();
		const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
		const sinA = Math.sqrt(1 - cosA * cosA);
		elbow.copy(S).addScaledVector(dir, a * cosA).addScaledVector(pole, a * sinA);
		aim(arm.upper, elbow, k);
		aim(arm.fore, T, k);
	}
	// tap: { wall, x, y } (fractions along that wall as you face it, y 0 at the top)
	f.tap = function (tap) {
		const along = tap.x, h = (1 - tap.y) * ROOM.h;
		if (tap.wall === 1) f.reachTo.set((along - 0.5) * ROOM.w, h, -hd);
		else if (tap.wall === 0) f.reachTo.set(-hw, h, (0.5 - along) * ROOM.d);
		else f.reachTo.set(hw, h, (along - 0.5) * ROOM.d);
		f.reachT = 0;
	};
	f.dispose = function () { scene.remove(root); mixer.stopAllAction(); };
	return f;
}
const makeFigure = (i) => (ghostKit ? GhostFigure(i) : Figure(i));

/* ---------- the bots ---------- */

// Each bot keeps every player's { X, Y, Z, face }; tracking X/Z are -1..1,
// Z = +1 at the front wall. face: 0 looks at the front wall, +PI/2 the left, -PI/2 the right.
const FACE = [Math.PI / 2, 0, -Math.PI / 2];
const rnd = (a, b) => a + Math.random() * (b - a);
// a point in front of wall w, `along` it (0..1 as you face it), `off` in from it (tracking units)
function nearWall(w, along, off = 0.12) {
	const a = along * 2 - 1, e = 1 - off;
	if (w === 0) return { X: -e, Z: a };
	if (w === 1) return { X: a, Z: e };
	return { X: e, Z: -a };
}
function approach(p, to, speed, dt) {
	const dx = to.X - p.X, dz = to.Z - p.Z, d = Math.hypot(dx, dz);
	if (d < 1e-4) return true;
	const s = Math.min(d, speed * dt);
	p.X += dx / d * s; p.Z += dz / d * s;
	return d < 0.04;
}
function faceToward(p, to) { return Math.atan2(-(to.X - p.X), (to.Z - p.Z)); }

const BOTS = {
	// steering by standing left or right: weave, each out of step, with dodges
	weave(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i + 0.5) / n * 1.6 - 0.8, Y: 0, Z: 0.1, face: 0 }));
		return { ps, step(t, dt) {
			ps.forEach((p, i) => {
				const lane = Math.sin(t * 0.55 + i * 2.3) * 0.62 + Math.sin(t * 1.9 + i * 1.1) * 0.18;
				const to = { X: Math.max(-0.88, Math.min(0.88, lane)), Z: 0.15 + Math.sin(t * 0.37 + i) * 0.35 };
				approach(p, to, 1.4, dt);
				p.face = Math.max(-0.5, Math.min(0.5, -(to.X - p.X) * 2));
			});
		} };
	},
	// Sonic Classic: each player walks right along their hero's wall (that's
	// what runs him to the checkpoint), jumping now and then; when he zips
	// round to the next wall they go to the start of that one.
	walls(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ ...nearWall(i % 3, 0.15, 0.25), Y: 0, face: FACE[i % 3], jumpAt: 1.5 + i * 0.7, along: 0.15 }));
		let st = null, stAt = -1;
		return { ps, step(t, dt) {
			if (t - stAt > 0.25) { stAt = t; st = stateNow(); }
			ps.forEach((p, i) => {
				const h = st && st.heroes && st.heroes[i];
				const w = h && h.wall >= 0 ? h.wall : i % 3;
				const running = !h || h.state === 'run';
				if (p.wall !== w) { p.wall = w; p.along = 0.12; }
				if (running) p.along = Math.min(0.92, p.along + dt * (0.06 + 0.02 * Math.sin(t * 0.7 + i)));
				else if (h && (h.state === 'banner' || h.state === 'wait')) p.along = Math.max(0.1, p.along - dt * 0.5);
				approach(p, nearWall(w, p.along, 0.25), 1.2, dt);
				p.face = FACE[w];
				if (running && t > p.jumpAt) { p.jumpAt = t + rnd(1.4, 2.6); p.jumpEnd = t + 0.45; }
				p.Y = t < (p.jumpEnd || 0) ? 0.34 * Math.sin((p.jumpEnd - t) / 0.45 * Math.PI) : 0;
			});
		} };
	},
	// two drivers: forward and back across the middle line drives each leg; walk up to the front wall to fire
	mech(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: i % 2 ? 0.45 : -0.45, Y: 0, Z: 0.3, face: 0, next: 1 + i * 0.9 }));
		return { ps, step(t, dt, taps) {
			ps.forEach((p, i) => {
				if (i > 1) { approach(p, { X: (i - 2) * 0.4, Z: -0.6 }, 1, dt); return; }   // (only two can drive)
				if (!p.goal && t > p.next) p.goal = { X: p.X + rnd(-0.15, 0.15), Z: 0.86, tap: { wall: 1, x: rnd(0.15, 0.85), y: rnd(0.3, 0.55) } };
				if (p.goal) {
					if (approach(p, p.goal, 1.2, dt)) { taps(i, p.goal.tap); p.goal = null; p.next = t + rnd(1.0, 1.8); }
				} else {
					// stride: mostly forward, one leg back now and then to turn
					const turn = Math.sin(t * 0.3 + i * Math.PI) > 0.75 ? -0.35 : 0.55;
					approach(p, { X: i % 2 ? 0.45 : -0.45, Z: turn }, 0.9, dt);
				}
				p.face = 0;
			});
		} };
	},
	// walk up to a wall and touch where to go next
	tapper(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i - (n - 1) / 2) * 0.5, Y: 0, Z: -0.2, face: 0 }));
		let turn = 0, nextAt = 1.2;
		return { ps, step(t, dt, taps) {
			if (t > nextAt) {
				const i = turn++ % n, p = ps[i];
				const w = Math.random() < 0.72 ? 1 : (Math.random() < 0.5 ? 0 : 2);
				const along = w === 1 ? rnd(0.3, 0.7) : rnd(0.55, 0.9);
				p.goal = { ...nearWall(w, w === 0 ? along : w === 2 ? 1 - along : along), tap: { wall: w, x: w === 0 ? along : w === 2 ? 1 - along : along, y: rnd(0.42, 0.62) } };
				nextAt = t + rnd(1.8, 2.6);
			}
			ps.forEach((p, i) => {
				if (p.goal) {
					p.face = faceToward(p, p.goal);
					if (approach(p, p.goal, 1.0, dt)) { taps(i, p.goal.tap); p.goal = null; p.back = t + 0.5; }
				} else if (t > (p.back || 0)) {
					approach(p, { X: (i - (n - 1) / 2) * 0.5, Z: -0.25 + Math.sin(t * 0.4 + i) * 0.15 }, 0.6, dt);
					p.face *= 1 - Math.min(1, dt * 2);
				}
			});
		} };
	},

	// Tails Escape: one pilot at a time flies Tails along the wall he's on
	// (left and right along it steers, nearer and further sets his height);
	// the rest stand back watching. At a junction a couple of them walk up and
	// tap the wall of the branch they want (gold ring tunnels first).
	escape(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i - (n - 1) / 2) * 0.5, Y: 0, Z: -0.3, face: 0 }));
		let st = null, stAt = -1, voted = null;
		return { ps, step(t, dt, taps) {
			if (t - stAt > 0.2) { stAt = t; try { st = game && game.state ? game.state() : null; } catch (e) { st = null; } }
			const w = st && st.wall >= 0 ? st.wall : 1, pilot = st && st.pilot >= 0 ? st.pilot : 0;
			const j = st && st.junction;
			if (j && j.prompting && voted !== j.sJ) {
				voted = j.sJ;
				const ways = (j.ways || []).map((s) => s.split(':')).map(([dir, kind]) => ({ wall: { W: 0, N: 1, E: 2 }[dir], kind })).filter((o) => o.wall !== undefined);
				const pick = ways.find((o) => o.kind === 'gold') || ways[Math.floor(Math.random() * ways.length)];
				// (two of the watchers vote; on your own, the pilot does)
				const voters = n > 1 ? ps.map((_, i) => i).filter((i) => i !== pilot).slice(0, 2) : [0];
				if (pick) voters.forEach((i) => {
					ps[i].goal = { ...nearWall(pick.wall, rnd(0.35, 0.65), 0.1), tap: { wall: pick.wall, x: 0.5, y: 0.5, escape: true } };
				});
			}
			ps.forEach((p, i) => {
				if (p.goal) {
					p.face = faceToward(p, p.goal);
					if (approach(p, p.goal, 1.1, dt)) { taps(i, p.goal.tap); p.goal = null; p.back = t + 0.6; }
					return;
				}
				if (t < (p.back || 0)) return;
				if (i === pilot) {
					const along = 0.5 + Math.sin(t * 0.6) * 0.28 + Math.sin(t * 1.7 + 1) * 0.1;
					const off = 1.0 + Math.sin(t * 0.45) * 0.55;   // (nearer the wall flies higher)
					approach(p, nearWall(w, along, off), 1.2, dt);
				} else {
					const k = (i - (n - 1) / 2) * 0.32;
					approach(p, nearWall(w, 0.5 + k, 1.6), 0.7, dt);
				}
				let d = FACE[w] - p.face; d = Math.atan2(Math.sin(d), Math.cos(d));
				p.face += d * Math.min(1, dt * 3);
			});
		} };
	},

	// Super Sonic Battle: one player at a time is Sonic. On foot they sweep
	// wide, so he runs laps of the machine for the emeralds; if they haven't
	// all been gathered after a while the bot hands them over (test.emeralds),
	// so the battle gets to Super Sonic. In the sky, when targets light up, a
	// watcher walks to the front wall and taps to send him through the machine.
	// At a hand-over the next Sonic steps into the middle.
	battle(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i - (n - 1) / 2) * 0.5, Y: 0, Z: -0.5, face: 0 }));
		let st = null, stAt = -1, groundSince = null, gifted = -1, nextTap = 0;
		return { ps, step(t, dt, taps) {
			if (t - stAt > 0.2) { stAt = t; try { st = game && game.state ? game.state() : null; } catch (e) { st = null; } }
			const phase = st && st.phase, ctrl = st && st.ctrl >= 0 ? st.ctrl : 0;
			if (phase === 'ground') {
				if (groundSince === null) groundSince = t;
				const round = st.turns ? st.turns.length : 0;
				if (t - groundSince > 12 && gifted !== round && game.test && game.test.emeralds) { gifted = round; game.test.emeralds(); }
			} else groundSince = null;
			if ((phase === 'super') && st.targets > 0 && t > nextTap) {
				const i = ps.findIndex((p, k) => k !== ctrl && !p.goal);
				if (i >= 0) { ps[i].goal = { ...nearWall(1, rnd(0.35, 0.65), 0.1), tap: { wall: 1, x: 0.5, y: 0.4, hit: true } }; nextTap = t + 3; }
			}
			ps.forEach((p, i) => {
				if (p.goal) {
					p.face = faceToward(p, p.goal);
					if (approach(p, p.goal, 1.2, dt)) { taps(i, p.goal.tap); p.goal = null; p.back = t + 0.5; }
					return;
				}
				if (t < (p.back || 0)) return;
				if (i === ctrl) {
					if (phase === 'handover' || phase === 'wait' || phase === 'transform') approach(p, { X: 0, Z: 0 }, 1.0, dt);
					else approach(p, { X: Math.sin(t * 0.45) * 0.82, Z: Math.sin(t * 0.3) * 0.25 }, 1.4, dt);
				} else {
					const k = ps.length > 1 ? (i - (n - 1) / 2) * 0.55 : 0;
					approach(p, { X: k, Z: -0.72 }, 0.7, dt);
				}
				p.face *= 1 - Math.min(1, dt * 2);
			});
		} };
	},
};

let bot = null, figures = [], botT = 0;

function sendTracking() {
	if (!bot) return;
	const msg = bot.ps.map((p, i) => ({ Id: i, X: p.X, Y: p.Y, Z: p.Z }));
	msg.push({ Id: 0, X: 0, Y: -0.2, Z: -0.5 });   // (the wand: the message's last entry)
	IGB.players.receive(JSON.stringify(msg) + '|');
}

function doTap(i, tap) {
	const f = figures[i];
	if (f) f.tap(tap);
	const x = (tap.wall + tap.x) * IGB.W, y = tap.y * IGB.H;
	if (!game || !game.test) return;
	if (tap.hit) { if (game.test.hit) game.test.hit(); return; }   // (Super Sonic Battle: dive at a lit target)
	if (!game.test.tap) return;
	if (tap.escape) game.test.tap(i, tap.wall);   // (Tails Escape: a vote for that wall's branch)
	else game.test.tap(x, y);
}

IGB.players.onUpdate(function (players) {
	if (game && game.setPlayers) game.setPlayers(players);
});

/* ---------- starting a game ---------- */

async function startGame(id, n) {
	const token = ++starting;
	if (game) { IGB.stop(game); game = null; }
	$world.empty();
	figures.forEach((f) => f.dispose());
	figures = []; bot = null;
	entry = SONIC.find((g) => g.id === id) || SONIC[0];
	n = entry.players || n;
	$status.text(entry.name + ' · loading');
	$('#games button').removeClass('on').filter(`[data-id="${entry.id}"]`).addClass('on');
	const squad = Array.from({ length: n }, (_, i) => ({ name: 'P' + (i + 1) }));
	const g = await IGB.start(entry.id, $world, squad);
	if (token !== starting) { IGB.stop(g); return; }
	game = g;
	IGB.current = g;
	bot = BOTS[entry.bot](n);
	await ghostReady;
	if (token !== starting) return;
	figures = bot.ps.map((_, i) => makeFigure(i));
	botT = 0;
	// straight into the run, once it has had a moment to build its world
	const jump = () => { try { if (game === g && g.test && g.test.jump) g.test.jump('play'); } catch (e) { console.warn(e); } };
	setTimeout(jump, 1200);
	setTimeout(() => { if (game === g) $status.text(entry.name + ' · ' + n + (n > 1 ? ' players' : ' player')); }, 1300);
	const q = new URLSearchParams(location.search);
	q.set('game', entry.id); q.set('players', n);
	if (!embedded) history.replaceState(null, '', '?' + q.toString());
}

$('#games').html(SONIC.filter((g) => !g.hidden).map((g) => `<button type="button" data-id="${g.id}">${g.name}</button>`).join(''));
$('#games').on('click', 'button', function () { startGame(this.dataset.id, +$('#count').val()); });
$('#count').on('change', function () { if (entry) startGame(entry.id, +this.value); });

/* ---------- cameras ---------- */

const VIEWS = {
	Outside: (t) => { const a = Math.sin(t * 0.15) * 0.16; return { pos: [Math.sin(a) * 6.4, 3.3, hd + Math.cos(a) * 4.3], at: [0, 1.45, -1.1] }; },
	Corner: () => ({ pos: [hw + 2.6, 3.6, hd + 3.4], at: [-0.4, 1.2, -0.8] }),
	Overhead: () => ({ pos: [0, 10.5, hd + 2.2], at: [0, 0.6, -0.4] }),
	Inside: (t) => ({ pos: [Math.sin(t * 0.2) * 0.4, 1.7, hd + 0.2], at: [0, 1.5, -hd] }),
};
let view = VIEWS[params.get('view')] ? params.get('view') : 'Outside';
const showView = () => $('#view').text('View: ' + view);
showView();
$('#view').on('click', function () {
	const names = Object.keys(VIEWS);
	view = names[(names.indexOf(view) + 1) % names.length];
	showView();
});
const camPos = new THREE.Vector3(), camAt = new THREE.Vector3();
// Keep the box framed: the camera eases back or in until the box fills about
// 85% of the view's height (and fits its width), then pitches so the box sits
// exactly in the vertical middle. Projected from the box's eight corners.
const CORNERS = [];
for (const x of [-1, 1]) for (const y of [0, 1]) for (const z of [-1, 1]) CORNERS.push(new THREE.Vector3(x * ROOM.w / 2, y * ROOM.h, z * ROOM.d / 2));
const FILL = { y: 1.7, x: 1.86 };   // (of the 2 units of NDC each way)
const cp = new THREE.Vector3(), off = new THREE.Vector3();
function bounds() {
	camera.updateMatrixWorld();
	const b = { lx: Infinity, hx: -Infinity, ly: Infinity, hy: -Infinity };
	for (const c of CORNERS) { cp.copy(c).project(camera); b.lx = Math.min(b.lx, cp.x); b.hx = Math.max(b.hx, cp.x); b.ly = Math.min(b.ly, cp.y); b.hy = Math.max(b.hy, cp.y); }
	return b;
}
function centreBox() {
	for (let pass = 0; pass < 3; pass++) {
		camera.lookAt(camAt);
		const b = bounds();
		const k = Math.max((b.hy - b.ly) / FILL.y, (b.hx - b.lx) / FILL.x);
		if (!isFinite(k) || Math.abs(k - 1) < 0.01) break;
		off.copy(camera.position).sub(camAt).multiplyScalar(Math.max(0.6, Math.min(1.6, k)));
		camera.position.copy(camAt).add(off);
	}
	camera.lookAt(camAt);
	for (let pass = 0; pass < 2; pass++) {
		const b = bounds(), mid = (b.ly + b.hy) / 2;
		if (!isFinite(mid) || Math.abs(mid) < 1e-4) return;
		camera.rotateX(Math.atan(mid * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
	}
}
let camReady = false;

// Embedded in another page (?embed=1, the storyboard): no bar, and quiet unless ?sound=1.
// (?clean=1 just hides the bar.)
const embedded = !!params.get('embed');
if (embedded || params.get('clean')) $('gamebox-bar').css('display', 'none');
if (embedded && !params.get('sound')) IGB.setVolume(0);

/* ---------- each frame ---------- */

// The view is always 16:10 (a wall's shape), letterboxed in the window, or a
// fixed pixel size (?size=1600x1000).
const fixed = (params.get('size') || '').split('x').map(Number);
let resize = function () {
	let w, h;
	if (fixed[0] > 0 && fixed[1] > 0) { [w, h] = fixed; renderer.setPixelRatio(1); }
	else { w = window.innerWidth; h = Math.round(w / 1.6); if (h > window.innerHeight) { h = window.innerHeight; w = Math.round(h * 1.6); } }
	renderer.setSize(w, h, false);
	Object.assign(canvas.style, { width: w + 'px', height: h + 'px', left: (window.innerWidth - w) / 2 + 'px', top: (window.innerHeight - h) / 2 + 'px' });
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
};
window.addEventListener('resize', () => resize());

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1024, 640), 0.9, 0.55, 1.0);   // (threshold 1: the walls top out there, the ghosts go past it)
composer.addPass(bloom);
composer.addPass(new OutputPass());
const resizeRender = resize;
resize = function () { resizeRender(); const s = renderer.getDrawingBufferSize(new THREE.Vector2()); composer.setSize(s.x / renderer.getPixelRatio(), s.y / renderer.getPixelRatio()); };
resize();

let last = performance.now(), sendAt = 0;
IGB.onFrame(function (now) {
	const dt = Math.min(0.1, (now - last) / 1000);
	last = now;
	if (bot) {
		botT += dt;
		bot.step(botT, dt, doTap);
		if (now - sendAt > 33) { sendAt = now; sendTracking(); }
		figures.forEach((f, i) => f.update(bot.ps[i], dt));
	}
	copyWalls();
	wallTex.needsUpdate = true;
	updateGlow(now);
	const v = VIEWS[view](now / 1000);
	const k = camReady ? Math.min(1, dt * 2.5) : 1;
	camPos.lerp(new THREE.Vector3(...v.pos), k);
	camAt.lerp(new THREE.Vector3(...v.at), k);
	camReady = true;
	camera.position.copy(camPos);
	camera.lookAt(camAt);
	if (view !== 'Inside') centreBox();   // (inside the room there's no box to frame)
	composer.render();
});

/* ---------- one loop of the game ----------
   The storyboard's animatic holds on a live frame for one full loop of its
   game: startLoop() when the frame comes up, then loopState().done. Counted
   from the moment the game is actually in play. */
const destroyedOf = (st) => (st.compounds || []).filter((c) => c.destroyed).length;
const wallsOf = (st) => (st.heroes || []).map((h) => h.wall).join('');
const LOOPS = {
	'loop-island': { max: 24 },                                                                              // (a stretch of the run)
	'knuckles-quest': { min: 8, max: 40, done: (a, b) => (b.found || 0) > (a.found || 0) },                 // an emerald fragment found
	'quill-relay': { min: 6, max: 40, done: (a, b) => wallsOf(a) !== '' && wallsOf(b) !== wallsOf(a) },     // a hero reaches his checkpoint and zips on to the next wall
	'iron-stride': { min: 10, max: 40, done: (a, b) => destroyedOf(b) > destroyedOf(a) },                   // a compound brought down
	'tails-escape': { min: 6, max: 45, done: (a, b) => b.pilot !== a.pilot },                               // a junction taken, the next pilot up
	'super-sonic-battle': { min: 10, max: 60, done: (a, b) => b.phase === 'handover' || b.phase === 'finale' },   // a whole turn as Sonic
};
let loopStart = null, loopFrom = null;
const stateNow = () => { try { return (game && game.state && game.state()) || {}; } catch (e) { return {}; } };
function startLoop() { loopStart = performance.now(); loopFrom = stateNow(); }
function loopState() {
	if (loopStart === null) return { t: 0, done: false };
	const L = LOOPS[entry && entry.id] || { max: 20 }, now = stateNow();
	// (start counting once it's really playing)
	if (loopFrom.beat !== 'play' && now.beat === 'play') { loopFrom = now; loopStart = performance.now(); }
	const t = (performance.now() - loopStart) / 1000;
	let done = t >= L.max;
	if (!done && L.done && now.beat === 'play' && t >= (L.min || 0)) { try { done = !!L.done(loopFrom, now); } catch (e) { /* (keep waiting) */ } }
	return { t, done, max: L.max };
}

window.gamebox = { canvas, startLoop, loopState, start: startGame, setView(v) { if (VIEWS[v]) { view = v; showView(); } }, games: SONIC, get game() { return game; }, get beat() { return game && game.state ? (game.state() || {}).beat : null; } };
startGame(params.get('game') || SONIC[0].id, +(params.get('players') || 3));
