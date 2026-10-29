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
	{ id: 'red-light-green-light', name: 'Red Light Green Light', bot: 'rlgl', hidden: true },
	{ id: 'temple-of-coins', name: 'Temple of Coins', bot: 'roam', hidden: true },
	{ id: 'small-talk', name: 'Small Talk', bot: 'spotter', hidden: true },
];
const COLORS = ['#ff2a2a', '#2f6bff', '#32cd32', '#dd00ff', '#ff6600', '#ffbb00'];

// The room in metres: a 3.6 m x 3.6 m floor, each wall 16:10 (3.6 m x 2.25 m),
// all of it picture. Tracking X/Z run -1..1 across it: one unit is 1.8 m.
const ROOM = { w: 3.6, d: 3.6, h: 2.25 };
ROOM.ceiling = ROOM.h;
const SCALE = 0.5;                 // the hidden stage's scale (world 4800 x 1000 -> 2400 x 500)
const STRIP = { w: 3072, h: 640 }; // the copied walls: 1024 x 640 each

const params = new URLSearchParams(location.search);
const embedded = !!params.get('embed');   // (in the storyboard: ?embed=1)
const $world = $('igb-world');
const $status = $('#status');

/* ---------- the hidden stage ---------- */

$world.css({ transform: `scale(${SCALE})` });
// (the games render at the strip's resolution, not the screen's: 4800 world units -> 3072 pixels)
const setScale = IGB.setScale;
IGB.setScale = function (k) { setScale(k); IGB.pixelRatio = STRIP.w / (4800 * k); };
IGB.setScale(SCALE);

let game = null, entry = null, starting = 0;
const strip = document.createElement('canvas');
strip.width = STRIP.w; strip.height = STRIP.h;
const sctx = strip.getContext('2d');

// Copy every canvas the stage shows into the strip, where it sits in the world.
// (which canvases, and where, is looked up a few times a second, not every frame)
let layers = [], layersAt = 0, layersOf = null;
function findLayers(now) {
	layersAt = now; layersOf = game; layers = [];
	const box = game.stage.$el[0].getBoundingClientRect();
	if (!box.width) return;
	const kx = STRIP.w / box.width, ky = STRIP.h / box.height;
	for (const c of game.stage.$el[0].querySelectorAll('canvas')) {
		if (!c.width || !c.height) continue;
		const st = getComputedStyle(c);
		if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
		const r = c.getBoundingClientRect();
		if (r.width < 2 || r.height < 2) continue;
		layers.push({ c, x: (r.left - box.left) * kx, y: (r.top - box.top) * ky, w: r.width * kx, h: r.height * ky });
	}
}
function copyWalls(now) {
	sctx.fillStyle = '#000';
	sctx.fillRect(0, 0, STRIP.w, STRIP.h);
	if (!game || !game.stage || game.stage.stopped) return;
	if (layersOf !== game || now - layersAt > 400) findLayers(now);
	for (const l of layers) {
		if (!l.c.width || !l.c.height) continue;
		try { sctx.drawImage(l.c, l.x, l.y, l.w, l.h); } catch (e) { /* (a canvas mid-resize) */ }
	}
}

/* ---------- the room ---------- */

const canvas = document.getElementById('room');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });   // (no MSAA: the bloom composer draws off-screen anyway)
let pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#200033');
scene.fog = new THREE.Fog('#200033', 14, 30);
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
	x.fillStyle = '#2e143b'; x.fillRect(0, 0, 1024, 1024);
	x.strokeStyle = 'rgba(158,0,255,0.22)'; x.lineWidth = 2;
	for (let i = 0; i <= 10; i++) { const p = i * 102.4; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 1024); x.moveTo(0, p); x.lineTo(1024, p); x.stroke(); }
	x.strokeStyle = 'rgba(252,25,146,0.55)'; x.lineWidth = 6; x.strokeRect(3, 3, 1018, 1018);
	const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
	return t;
})();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.3, metalness: 0.35 }));   // (glossy: the walls' light shines in it)
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// The box's frame: thin edges along the top and the open back.
const edge = new THREE.LineBasicMaterial({ color: '#ae2bff', transparent: true, opacity: 0.7 });
const hw = ROOM.w / 2, hd = ROOM.d / 2, H = ROOM.h, C = ROOM.ceiling;
scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
	new THREE.Vector3(-hw, C, hd), new THREE.Vector3(-hw, C, -hd), new THREE.Vector3(-hw, C, -hd), new THREE.Vector3(hw, C, -hd),
	new THREE.Vector3(hw, C, -hd), new THREE.Vector3(hw, C, hd), new THREE.Vector3(-hw, 0, hd), new THREE.Vector3(-hw, C, hd),
	new THREE.Vector3(hw, 0, hd), new THREE.Vector3(hw, C, hd),
]), edge));

/* the box itself: framed walls, a shell round the outside, a truss of lights overhead */

const shellMat = new THREE.MeshStandardMaterial({ color: '#1b0b26', roughness: 0.7, metalness: 0.2 });
const frameMat = new THREE.MeshStandardMaterial({ color: '#0d0612', roughness: 0.4, metalness: 0.6 });
const trimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#c04dff').multiplyScalar(1.6), toneMapped: false });
const T = 0.14;   // (the shell's thickness)
const boxAt = (w, h, d, x, y, z, mat, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; };
// the shell behind each wall, up to a lip over the top
boxAt(T, C + 0.12, ROOM.d + 2 * T, -hw - T / 2 - 0.012, (C + 0.12) / 2, 0, shellMat);   // (a centimetre behind the screen, or they fight)
boxAt(ROOM.w + 2 * T, C + 0.12, T, 0, (C + 0.12) / 2, -hd - T / 2 - 0.012, shellMat);
boxAt(T, C + 0.12, ROOM.d + 2 * T, hw + T / 2 + 0.012, (C + 0.12) / 2, 0, shellMat);
// frames round the walls: corner posts, a header, a skirting with a glowing line
for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]]) boxAt(0.07, C, 0.07, x, C / 2, z, frameMat);
boxAt(ROOM.w + 0.14, 0.09, 0.09, 0, C + 0.02, -hd, frameMat);
boxAt(0.09, 0.09, ROOM.d + 0.14, -hw, C + 0.02, 0, frameMat);
boxAt(0.09, 0.09, ROOM.d + 0.14, hw, C + 0.02, 0, frameMat);
boxAt(ROOM.w, 0.012, 0.012, 0, 0.03, -hd + 0.01, trimMat, false);
boxAt(0.012, 0.012, ROOM.d, -hw + 0.01, 0.03, 0, trimMat, false);
boxAt(0.012, 0.012, ROOM.d, hw - 0.01, 0.03, 0, trimMat, false);
// the truss over the open top, with its tracking cameras and lamps
for (const z of [-hd * 0.33, hd * 0.33]) boxAt(ROOM.w, 0.05, 0.05, 0, C + 0.08, z, frameMat);
for (const x of [-hw * 0.5, hw * 0.5]) boxAt(0.05, 0.05, ROOM.d, x, C + 0.08, 0, frameMat);
const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.8), toneMapped: false });
for (const x of [-hw * 0.5, hw * 0.5]) for (const z of [-hd * 0.33, hd * 0.33]) {
	const can = boxAt(0.1, 0.12, 0.1, x, C + 0.0, z, frameMat);
	const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), lampMat);
	lens.rotation.x = Math.PI / 2; lens.position.set(x, C - 0.061, z); scene.add(lens);
}
// the ground outside the box: dark, fading out
const groundTex = (() => {
	const c = document.createElement('canvas'); c.width = c.height = 512;
	const x = c.getContext('2d'), g = x.createRadialGradient(256, 256, 40, 256, 256, 256);
	g.addColorStop(0, '#2a1238'); g.addColorStop(1, '#14001f');
	x.fillStyle = g; x.fillRect(0, 0, 512, 512);
	const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true;
scene.add(ground);
// light pooling on the floor in front of each wall, in that wall's colour
const spillTex = (() => {
	const c = document.createElement('canvas'); c.width = 4; c.height = 256;
	const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
	g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
	x.fillStyle = g; x.fillRect(0, 0, 4, 256);
	return new THREE.CanvasTexture(c);
})();
const spills = [0, 1, 2].map((n) => {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(n === 1 ? ROOM.w : ROOM.d, 1.3), new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
	m.rotation.x = -Math.PI / 2;
	m.position.y = 0.008;
	if (n === 1) m.position.z = -hd + 0.65;
	if (n === 0) { m.rotation.z = -Math.PI / 2; m.position.x = -hw + 0.65; }
	if (n === 2) { m.rotation.z = Math.PI / 2; m.position.x = hw - 0.65; }
	scene.add(m);
	return m;
});

// Light: a dim fill, a key from above the open back, and each wall's own glow.
scene.add(new THREE.HemisphereLight('#a06bd8', '#14001f', 0.9));
const key = new THREE.DirectionalLight('#ffffff', 1.1);
key.position.set(1.5, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 15 });
scene.add(key);
const glows = [0, 1, 2].map((n) => {
	const l = new THREE.PointLight('#ffffff', 4.5, 6, 1.6);
	l.position.set(n === 0 ? -hw + 0.4 : n === 2 ? hw - 0.4 : 0, H * 0.55, n === 1 ? -hd + 0.4 : 0);
	scene.add(l);
	return l;
});
// (each wall's average colour, a few times a second: averaged on the GPU into
// three pixels and read back without waiting, so the frame never stalls on it)
const glowRT = new THREE.WebGLRenderTarget(3, 1, { depthBuffer: false });
const glowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const glowScene = new THREE.Scene();
glowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
	uniforms: { map: { value: wallTex } },
	vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
	fragmentShader: `uniform sampler2D map; varying vec2 vUv;
		void main() {
			float x0 = floor(vUv.x * 3.0) / 3.0; vec3 c = vec3(0.0);
			for (int i = 0; i < 12; i++) for (int j = 0; j < 6; j++)
				c += textureLod(map, vec2(x0 + (float(i) + 0.5) / 36.0, (float(j) + 0.5) / 6.0), 5.0).rgb;
			gl_FragColor = vec4(pow(c / 72.0, vec3(1.0 / 2.2)), 1.0);
		}`,
	depthTest: false, depthWrite: false,
})));
const glowPx = new Uint8Array(12);
let glowAt = 0, glowBusy = false;
function updateGlow(now) {
	if (glowBusy || now - glowAt < 200) return;
	glowAt = now; glowBusy = true;
	renderer.setRenderTarget(glowRT);
	renderer.render(glowScene, glowCam);
	renderer.setRenderTarget(null);
	renderer.readRenderTargetPixelsAsync(glowRT, 0, 0, 3, 1, glowPx).then(() => {
		const d = glowPx;
		glows.forEach((l, n) => l.color.setRGB(d[n * 4] / 255, d[n * 4 + 1] / 255, d[n * 4 + 2] / 255, THREE.SRGBColorSpace));
		spills.forEach((m, n) => m.material.color.copy(glows[n].color).multiplyScalar(0.9));
	}).catch(() => {}).finally(() => { glowBusy = false; });
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
   reaching to the very spot on the wall a tap lands. Drawn as a plain outline
   in the player's colour: the body itself is invisible (it only hides what's
   inside it), a shell grown round it shows past its edge; no glow, no bloom. */

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
	if (!outline) return new THREE.ShaderMaterial({   // (the body: depth only, so just the outline's edge shows round it)
		uniforms: { color: { value: col.clone() }, grow: { value: 0 }, core: { value: 0 }, rim: { value: 0 }, power: { value: 1 }, alpha: { value: 0 } },
		vertexShader: GHOST_VERT,
		fragmentShader: GHOST_FRAG,
		colorWrite: false,
	});
	return new THREE.ShaderMaterial({
		uniforms: {
			color: { value: col.clone() },
			grow: { value: 0.014 },
			core: { value: 0.85 },   // (flat: the same all over, under the bloom's threshold)
			rim: { value: 0 },
			power: { value: 1 },
			alpha: { value: 0.75 },
		},
		vertexShader: GHOST_VERT,
		fragmentShader: GHOST_FRAG,
		transparent: true,
		depthWrite: false,
		side: THREE.BackSide,
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
	const col = new THREE.Color(COLORS[n % COLORS.length]);
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
		shell.renderOrder = 1;   // (after the body has laid down its depth)
		shell.frustumCulled = false;
		shell.bind(m.skeleton, m.bindMatrix);
		m.parent.add(shell);
	}
	const lift = new THREE.Group();
	lift.add(body);
	root.add(lift);
	const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: poolTex, color: col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
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
	f.setHeight = (k) => root.scale.setScalar(k);
	f.root = root;
	return f;
}
const makeFigure = (i) => (ghostKit ? GhostFigure(i) : Figure(i));

/* ---------- the bots ---------- */

// Each bot keeps every player's { X, Y, Z, face }; tracking X/Z are -1..1,
// Z = +1 at the front wall. face: 0 looks at the front wall, +PI/2 the left, -PI/2 the right.
const FACE = [Math.PI / 2, 0, -Math.PI / 2];
const rnd = (a, b) => a + Math.random() * (b - a);
// a point in front of wall w, `along` it (0..1 as you face it), `off` in from it (tracking units)
function nearWall(w, along, off = 0.18) {   // (off in tracking units: 0.18 is about 32 cm, an arm's reach)
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
	// Temple of Coins: wandering all over the floor, each on a loop of their own
	roam(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i + 0.5) / n * 1.4 - 0.7, Y: 0, Z: 0, face: 0 }));
		return { ps, step(t, dt) {
			ps.forEach((p, i) => {
				const to = { X: Math.sin(t * 0.31 + i * 2.1) * 0.7, Z: Math.cos(t * 0.23 + i * 1.7) * 0.7 };
				approach(p, to, 1.2, dt);
				p.face = Math.atan2(to.X - p.X, -(to.Z - p.Z));
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
	// Red Light Green Light: everyone wanders the room on green light (the track
	// scrolls on by itself) and freezes dead still from the warning until green
	rlgl(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i - (n - 1) / 2) * 0.5, Y: 0, Z: 0, face: 0 }));
		let st = null, stAt = -1;
		return { ps, step(t, dt) {
			if (t - stAt > 0.1) { stAt = t; try { st = game && game.state ? game.state() : null; } catch (e) { st = null; } }
			const ph = st && st.phase;
			if (ph === 'warning' || ph === 'turning' || ph === 'red' || ph === 'drill-red') return;   // (frozen: not a hair)
			ps.forEach((p, i) => {
				const to = { X: Math.max(-0.8, Math.min(0.8, Math.sin(t * 0.6 + i * 2.1) * 0.55 + (i - (n - 1) / 2) * 0.22)), Z: Math.max(-0.7, Math.min(0.7, Math.sin(t * 0.45 + i * 1.7) * 0.5)) };
				approach(p, to, 1.1, dt);
				p.face = Math.max(-0.5, Math.min(0.5, -(to.X - p.X) * 2));
			});
		} };
	},
	// Small Talk: while the scene plays they turn slowly round the room,
	// taking it in; once it's time to tap, each in turn walks up to something
	// weird on the wall and taps it (most of them, not all: the rest are
	// shown at the end of the round).
	spotter(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ X: (i - (n - 1) / 2) * 0.5, Y: 0, Z: 0.1, face: 0 }));
		let st = null, stAt = -1, next = 0, claimed = new Set(), level = -1;
		return { ps, step(t, dt, taps) {
			if (t - stAt > 0.2) { stAt = t; try { st = game && game.state ? game.state() : null; } catch (e) { st = null; } }
			if (st && st.level !== level) { level = st.level; claimed = new Set(); }
			const tapping = st && st.phase === 'tap';
			const left = tapping ? (st.differences || []).filter((d) => !d.found && !claimed.has(d.id)) : [];
			// send the next free player to the next anomaly (leaving one or two unfound)
			if (tapping && t > next && left.length > 1) {
				const free = ps.findIndex((p) => !p.goal);
				if (free >= 0) {
					const d = left[Math.floor(Math.random() * left.length)];
					const along = (d.x - d.wall * IGB.W) / IGB.W;
					claimed.add(d.id);
					ps[free].goal = { ...nearWall(d.wall, along, 0.2), tap: { wall: d.wall, x: along, y: d.y / IGB.H } };
					next = t + 1.6 + Math.random() * 1.4;
				}
			}
			ps.forEach((p, i) => {
				if (p.goal) {
					p.face = faceToward(p, p.goal);
					if (approach(p, p.goal, 1.1, dt)) { taps(i, p.goal.tap); p.goal = null; p.back = t + 0.8; }
					return;
				}
				if (t < (p.back || 0)) return;
				// drifting about the middle, looking round the walls
				const to = { X: Math.sin(t * 0.25 + i * 2.1) * 0.35, Z: 0.1 + Math.cos(t * 0.2 + i * 1.3) * 0.3 };
				approach(p, to, 0.5, dt);
				const look = Math.sin(t * 0.3 + i * 1.9) * 1.4;
				let d = look - p.face; d = Math.atan2(Math.sin(d), Math.cos(d));
				p.face += d * Math.min(1, dt * 1.5);
			});
		} };
	},
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
					ps[i].goal = { ...nearWall(pick.wall, rnd(0.35, 0.65), 0.18), tap: { wall: pick.wall, x: 0.5, y: 0.5, escape: true } };
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
				if (i >= 0) { ps[i].goal = { ...nearWall(1, rnd(0.35, 0.65), 0.18), tap: { wall: 1, x: 0.5, y: 0.4, hit: true } }; nextTap = t + 3; }
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
	const msg = bot.ps.map((p, i) => (i === you.me ? you.message(i) : { Id: i, X: p.X, Y: p.Y, Z: p.Z }));
	msg.push({ Id: 0, X: 0, Y: -0.2, Z: -0.5 });   // (the wand: the message's last entry)
	IGB.players.receive(JSON.stringify(msg) + '|');
}

function doTap(i, tap) {
	if (i === you.me && !tap.mine) return;   // (you're driving this one)
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

/* ---------- you: driving one of the players ---------- */

// Take over a player (Tab, or the YOU button; 0 hands them back to the bots):
// walk with WASD or the arrows (or click the floor), hold Shift to squat, Space
// to jump, Q / E to be shorter or taller, point at the walls to look at them,
// and click a wall to touch it (you walk over first if it's out of reach).
// Your position, height and head's rotation go to the game in the tracking
// message, exactly as the real tracker sends them; touches go in as clicks.
const HEIGHTS = [110, 130, 150, 170, 190];   // cm
const keys = new Set();
const orbit = { yaw: 0, drag: null };
const you = (function () {
	const Y = {
		me: embedded && !params.get('play') ? -1 : 0, n: 0,
		X: 0, Z: -0.2, cm: 170, sq: 0, jumpT: -1, face: 0, look: null, gaze: null, gazeAt: new THREE.Vector3(),
		goal: null, pendingTap: null, ripples: [], help: true,
	};
	const base = () => (Y.cm - 170) / 112.5;   // (tracking Y: 1 unit is 1.125 m of height; 0 is a standing 170 cm adult)
	const jumpOff = () => (Y.jumpT >= 0 ? 0.34 * Math.sin(Math.PI * Math.min(1, Y.jumpT / 0.55)) : 0);
	const toWorld = (X, Z) => ({ x: X * hw * 0.92, z: -Z * hd * 0.92 });
	const headY = () => Y.cm / 100 * 0.93 * (1 - Y.sq * 0.36) + jumpOff() * 1.125;
	Y.reset = function (n) {
		Y.n = n;
		if (Y.me >= n) Y.me = n - 1;
		if (Y.me >= 0 && bot && bot.ps[Y.me]) { Y.X = bot.ps[Y.me].X; Y.Z = bot.ps[Y.me].Z; }
		Y.goal = null; Y.pendingTap = null;
		hud();
	};
	Y.message = function (i) {
		const m = { Id: i, X: Y.X, Y: base() - Y.sq * 0.32 + jumpOff(), Z: Y.Z };
		if (Y.look) {   // (the head's rotation: the hat's +z turned to where you look)
			const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), Y.look);
			Object.assign(m, { rW: q.w, rX: q.x, rY: q.y, rZ: q.z });
		}
		return m;
	};
	Y.pose = () => ({ X: Y.X, Y: -Y.sq * 0.32 + jumpOff(), Z: Y.Z, face: Y.face });
	Y.step = function (dt) {
		if (Y.me < 0) return;
		// walking: the keys, relative to the view; or toward where you clicked
		let ix = 0, iz = 0;
		if (keys.has('w') || keys.has('arrowup')) iz += 1;
		if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
		if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
		if (keys.has('d') || keys.has('arrowright')) ix += 1;
		const speed = (Y.sq > 0.5 ? 0.5 : 1) * 1.4 / 1.8;   // (tracking units a second: 1.4 m/s, slower squatting)
		if (ix || iz) {
			Y.goal = null; Y.pendingTap = null;
			const fw = new THREE.Vector3(); camera.getWorldDirection(fw); fw.y = 0; fw.normalize();
			const rt = new THREE.Vector3(-fw.z, 0, fw.x);
			const mx = fw.x * iz + rt.x * ix, mz = fw.z * iz + rt.z * ix, l = Math.hypot(mx, mz) || 1;
			Y.X += mx / l * speed * dt; Y.Z += -mz / l * speed * dt;
		} else if (Y.goal) {
			const dx = Y.goal.X - Y.X, dz = Y.goal.Z - Y.Z, d = Math.hypot(dx, dz);
			if (d < 0.02) {
				Y.goal = null;
				if (Y.pendingTap) { touch(Y.pendingTap); Y.pendingTap = null; }
			} else { const st = Math.min(d, speed * 1.3 * dt); Y.X += dx / d * st; Y.Z += dz / d * st; }
		}
		Y.X = Math.max(-0.97, Math.min(0.97, Y.X)); Y.Z = Math.max(-0.97, Math.min(0.97, Y.Z));
		// squat and jump
		const wantSq = keys.has('shift') || keys.has('c') ? 1 : 0;
		Y.sq += (wantSq - Y.sq) * Math.min(1, dt * 8);
		if (Y.jumpT >= 0) { Y.jumpT += dt; if (Y.jumpT > 0.55) Y.jumpT = -1; }
		// looking: from your head to the point on the wall you're pointing at
		if (Y.gaze) {
			const w = toWorld(Y.X, Y.Z);
			const d = new THREE.Vector3(Y.gaze.point.x - w.x, Y.gaze.point.y - headY(), Y.gaze.point.z - w.z).normalize();
			Y.look = new THREE.Vector3(d.x, d.y, -d.z);   // (into the tracker's axes: z toward the front wall)
			Y.face = Math.atan2(-(d.x), -d.z);
		}
		hudState();
	};
	// a touch on a wall: { wall, x, y } (fractions as you face it, y 0 at the top)
	function touch(t) {
		const f = figures[Y.me];
		if (f) f.tap(t);
		Y.ripples.push({ t: 0, point: t.point.clone(), normal: t.normal.clone() });
		const x = (t.wall + t.x) * IGB.W, y = t.y * IGB.H;
		if (game && game.test && game.test.tap && entry && entry.bot && entry.bot !== 'roam') { doTap(Y.me, Object.assign({ mine: true }, t)); return; }
		clickStage(x, y);
		flash('TOUCH!');
	}
	// a click on the hidden stage, where that point of the world is: the game hears a real tap
	function clickStage(x, y) {
		if (!game || !game.stage) return;
		const el = game.stage.$el[0], r = $world[0].getBoundingClientRect();
		const cx = r.left + x * IGB.scale, cy = r.top + y * IGB.scale;
		const hit = document.elementsFromPoint(cx, cy).find((e) => el.contains(e)) || el;
		const o = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, pointerId: 1, isPrimary: true };
		hit.dispatchEvent(new PointerEvent('pointerdown', o));
		hit.dispatchEvent(new MouseEvent('mousedown', o));
		hit.dispatchEvent(new PointerEvent('pointerup', o));
		hit.dispatchEvent(new MouseEvent('mouseup', o));
		hit.dispatchEvent(new MouseEvent('click', o));
	}
	// is that spot on the wall in arm's reach of where you stand?
	function reachable(t) {
		const w = toWorld(Y.X, Y.Z), p = t.point;
		const out = t.wall === 1 ? w.z - (-hd) : t.wall === 0 ? w.x - (-hw) : hw - w.x;
		const along = t.wall === 1 ? Math.abs(w.x - p.x) : Math.abs(w.z - p.z);
		return out < 0.7 && along < 0.55 && p.y < Y.cm / 100 * 1.25;
	}
	Y.touchWall = function (t) {
		if (reachable(t)) { touch(t); return; }
		Y.goal = nearWall(t.wall, t.x, 0.2);
		Y.pendingTap = t;
	};
	Y.walkTo = function (pt) { Y.goal = { X: pt.x / (hw * 0.92), Z: -pt.z / (hd * 0.92) }; Y.pendingTap = null; };
	Y.jump = function () { if (Y.jumpT < 0 && Y.me >= 0) Y.jumpT = 0; };
	Y.height = function (d) { const k = Math.max(0, Math.min(HEIGHTS.length - 1, HEIGHTS.indexOf(Y.cm) + d)); Y.cm = HEIGHTS[k]; flash(Y.cm + ' CM'); hud(); };
	Y.take = function (i) {
		Y.me = i;
		if (i >= 0 && bot && bot.ps[i]) { Y.X = bot.ps[i].X; Y.Z = bot.ps[i].Z; }
		Y.goal = null; Y.pendingTap = null;
		hud();
	};
	// the view from your eyes
	Y.eyes = function (cam) {
		if (Y.me < 0) return;
		const w = toWorld(Y.X, Y.Z);
		cam.position.set(w.x, headY() + 0.05, w.z);
		if (Y.gaze) cam.lookAt(Y.gaze.point);
		else cam.lookAt(w.x - Math.sin(Y.face) * 3, headY() - 0.1, w.z - Math.cos(Y.face) * 3);
	};

	/* what you see of it in the room: a YOU ring, your gaze on the wall, touch ripples, where you're walking */
	const col = () => new THREE.Color(COLORS[Math.max(0, Y.me) % COLORS.length]);
	const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
	ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015; scene.add(ring);
	const dotTex = poolTex;
	const gazeDot = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
	scene.add(gazeDot);
	const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0.55, toneMapped: false }));
	beam.frustumCulled = false; scene.add(beam);
	const goalMark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
	goalMark.rotation.x = -Math.PI / 2; goalMark.position.y = 0.02; scene.add(goalMark);
	const rippleMeshes = [];
	const label = (() => {
		const c = document.createElement('canvas'); c.width = 256; c.height = 96;
		const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
		const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
		sp.scale.set(0.5, 0.19, 1); sp.renderOrder = 10; scene.add(sp);
		sp.userData.paint = (cc) => { const x = c.getContext('2d'); x.clearRect(0, 0, 256, 96); x.font = '700 64px Rubik, sans-serif'; x.textAlign = 'center'; x.lineWidth = 12; x.strokeStyle = '#14001f'; x.strokeText('YOU', 128, 70); x.fillStyle = cc; x.fillText('YOU', 128, 70); t.needsUpdate = true; };
		return sp;
	})();
	let labelFor = -2;
	Y.draw = function (t, dt) {
		const on = Y.me >= 0 && figures[Y.me];
		ring.visible = gazeDot.visible = beam.visible = label.visible = !!on;
		goalMark.visible = !!(on && Y.goal);
		if (!on) return;
		const c = col(), w = toWorld(Y.X, Y.Z);
		ring.material.color.copy(c).multiplyScalar(1.8);
		ring.position.x = w.x; ring.position.z = w.z;
		ring.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
		if (labelFor !== Y.me) { label.userData.paint('#' + c.getHexString()); labelFor = Y.me; }
		label.position.set(w.x, headY() + 0.42, w.z);
		label.visible = view !== 'You';
		if (Y.goal) { const g = toWorld(Y.goal.X, Y.goal.Z); goalMark.position.x = g.x; goalMark.position.z = g.z; goalMark.material.color.copy(c).multiplyScalar(1.5); }
		gazeDot.visible = beam.visible = !!Y.gaze;
		if (Y.gaze) {
			gazeDot.position.copy(Y.gaze.point).addScaledVector(Y.gaze.normal, 0.01);
			gazeDot.lookAt(gazeDot.position.clone().add(Y.gaze.normal));
			gazeDot.material.color.copy(c).multiplyScalar(2);
			gazeDot.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
			const a = beam.geometry.attributes.position;
			a.setXYZ(0, w.x, headY(), w.z); a.setXYZ(1, Y.gaze.point.x, Y.gaze.point.y, Y.gaze.point.z); a.needsUpdate = true;
			beam.computeLineDistances(); beam.material.color.copy(c).multiplyScalar(1.5);
			beam.visible = view !== 'You';
		}
		// touch ripples on the wall
		for (const r of Y.ripples) {
			r.t += dt;
			if (!r.m) { r.m = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.09, 40), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); scene.add(r.m); r.m.position.copy(r.point).addScaledVector(r.normal, 0.012); r.m.lookAt(r.m.position.clone().add(r.normal)); }
			r.m.scale.setScalar(1 + r.t * 9); r.m.material.opacity = Math.max(0, 1 - r.t / 0.6);
		}
		for (const r of Y.ripples) if (r.t > 0.6) { scene.remove(r.m); r.m.geometry.dispose(); }
		Y.ripples = Y.ripples.filter((r) => r.t <= 0.6);
	};

	/* the panel: who you are, how to drive, what you're doing */
	const $hud = $('<gamebox-hud>').appendTo('body');
	function hud() {
		if (embedded && !params.get('play')) { $hud.hide(); return; }
		const n = Y.n || (bot ? bot.ps.length : 0);
		const who = Y.me >= 0 ? `<b style="color:${COLORS[Y.me % COLORS.length]}">YOU ARE P${Y.me + 1}</b>` : '<b>WATCHING</b>';
		$hud.html(`<div class=row>${who}<span class=chips></span></div>` + (Y.help ? `<dl>
			<dt>Walk</dt><dd>W A S D · click the floor</dd>
			<dt>Touch</dt><dd>click a wall</dd>
			<dt>Look</dt><dd>point at the walls</dd>
			<dt>Squat</dt><dd>hold Shift</dd>
			<dt>Jump</dt><dd>Space</dd>
			<dt>Height</dt><dd>Q / E · <i>${Y.cm} cm</i></dd>
			<dt>Player</dt><dd>Tab · 1–${n} · 0 to watch</dd>
			<dt>View</dt><dd>V · drag to orbit · <i>H</i> hides this</dd></dl>` : ''));
	}
	function hudState() {
		const c = [];
		if (Y.me < 0) return;
		if (Y.sq > 0.5) c.push('SQUATTING');
		if (Y.jumpT >= 0) c.push('JUMPING');
		if (Y.gaze) c.push('LOOKING ' + ['LEFT', 'FRONT', 'RIGHT'][Y.gaze.wall]);
		if (Y.pendingTap) c.push('WALKING TO TOUCH');
		const s = c.map((x) => `<span>${x}</span>`).join('');
		const $c = $hud.find('.chips');
		if ($c.html() !== s) $c.html(s);
	}
	let flashT = 0;
	const $flash = $('<gamebox-flash>').appendTo('body');
	function flash(text) { $flash.text(text).addClass('on'); clearTimeout(flashT); flashT = setTimeout(() => $flash.removeClass('on'), 700); }
	Y.hud = hud;
	hud();
	return Y;
})();

/* the pointer: point to look, click a wall to touch it, click the floor to walk, drag to orbit */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
	const r = canvas.getBoundingClientRect();
	ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	ray.setFromCamera(ndc, camera);
	const hit = ray.intersectObjects([...walls, floor], false)[0];
	if (!hit) return null;
	const n = walls.indexOf(hit.object);
	if (n < 0) return { floor: true, point: hit.point.clone() };
	const u = hit.uv.x * 3 - n, v = hit.uv.y;
	const normal = new THREE.Vector3(n === 0 ? 1 : n === 2 ? -1 : 0, 0, n === 1 ? 1 : 0);
	return { wall: n, x: Math.max(0, Math.min(1, u)), y: Math.max(0, Math.min(1, 1 - v)), point: hit.point.clone(), normal };
}
const driving = () => you.me >= 0 && !(embedded && !params.get('play'));
canvas.addEventListener('pointermove', (e) => {
	if (orbit.drag) { orbit.yaw = orbit.drag.yaw - (e.clientX - orbit.drag.x) * 0.006; return; }
	if (!driving()) return;
	const h = pick(e);
	you.gaze = h && !h.floor ? h : null;
});
canvas.addEventListener('pointerleave', () => { you.gaze = null; });
canvas.addEventListener('pointerdown', (e) => {
	const h = driving() ? pick(e) : null;
	if (h && !h.floor && e.button === 0) { you.touchWall(h); return; }
	if (h && h.floor && e.button === 0) { you.walkTo(h.point); return; }
	orbit.drag = { x: e.clientX, yaw: orbit.yaw };
	canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => { orbit.drag = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
	if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
	const k = e.key.toLowerCase();
	if (k === ' ') { you.jump(); e.preventDefault(); return; }
	if (k === 'tab') { const n = bot ? bot.ps.length : 0; you.take(n ? (you.me + 1) % n : -1); e.preventDefault(); return; }
	if (k === '0') { you.take(-1); return; }
	if (/^[1-6]$/.test(k) && bot && +k <= bot.ps.length) { you.take(+k - 1); return; }
	if (k === 'q' || k === '[') { you.height(-1); return; }
	if (k === 'e' || k === ']') { you.height(1); return; }
	if (k === 'h') { you.help = !you.help; you.hud(); return; }
	if (k === 'v') { $('#view').trigger('click'); return; }
	keys.add(k);
	if (k.startsWith('arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

/* ---------- starting a game ---------- */

async function startGame(id, n) {
	const token = ++starting;
	if (game) { IGB.stop(game); game = null; }
	$world.empty();
	figures.forEach((f) => f.dispose());
	figures = []; bot = null;
	entry = ALL.find((g) => g.id === id) || SONIC.find((g) => g.id === id) || { id, name: NAMES[id] || id, bot: 'roam' };
	n = entry.players || n;
	$status.text(entry.name + ' · loading');
	$('#games button').removeClass('on').filter(`[data-id="${entry.id}"]`).addClass('on');
	const squad = Array.from({ length: n }, (_, i) => ({ name: 'P' + (i + 1) }));
	const g = await IGB.start(entry.id, $world, squad);
	if (token !== starting) { IGB.stop(g); return; }
	game = g;
	IGB.current = g;
	bot = (BOTS[entry.bot] || BOTS.roam)(n);
	you.reset(n);
	await ghostReady;
	if (token !== starting) return;
	figures = bot.ps.map((_, i) => makeFigure(i));
	botT = 0;
	// straight into the run, once it has had a moment to build its world
	const jump = () => { try { const j = g.test && (g.test.jump || g.test.skipTo); if (game === g && j) j('play'); } catch (e) { console.warn(e); } };   // (RLGL calls it skipTo)
	setTimeout(jump, 1200);
	setTimeout(() => { if (game === g) $status.text(entry.name + ' · ' + n + (n > 1 ? ' players' : ' player')); }, 1300);
	const q = new URLSearchParams(location.search);
	q.set('game', entry.id); q.set('players', n);
	if (!embedded) history.replaceState(null, '', '?' + q.toString());
}

// (every game on the hub's menu: the Sonic ones have their own bots, the rest roam)
const NAMES = {};
for (const folder of IGB.manifest || []) for (const g of folder.games) NAMES[g.id] = g.name;
const ALL = SONIC.filter((g) => !g.hidden).concat((IGB.menu || []).filter((id) => !SONIC.some((g) => g.id === id && !g.hidden) && !['show-debug', 'gaze-test', 'sonic-characters'].includes(id)).map((id) => SONIC.find((g) => g.id === id) || { id, name: NAMES[id] || id, bot: 'roam' }));
$('#games').html(ALL.map((g) => `<button type="button" data-id="${g.id}">${g.name}</button>`).join(''));
$('#games').on('click', 'button', function () { startGame(this.dataset.id, +$('#count').val()); });
$('#count').on('change', function () { if (entry) startGame(entry.id, +this.value); });

/* ---------- cameras ---------- */

const VIEWS = {
	Outside: (t) => { const a = Math.sin(t * 0.15) * 0.16; return { pos: [Math.sin(a) * 6.4, 3.3, hd + Math.cos(a) * 4.3], at: [0, 1.45, -1.1] }; },
	Corner: () => ({ pos: [hw + 2.6, 3.6, hd + 3.4], at: [-0.4, 1.2, -0.8] }),
	Overhead: () => ({ pos: [0, 10.5, hd + 2.2], at: [0, 0.6, -0.4] }),
	Inside: (t) => ({ pos: [Math.sin(t * 0.2) * 0.4, 1.7, hd + 0.2], at: [0, 1.5, -hd] }),
	You: () => ({ pos: [0, 1.6, 0], at: [0, 1.5, -hd] }),   // (from your own eyes: you.eyes sets it)
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
for (const x of [-1, 1]) for (const y of [0, 1]) for (const z of [-1, 1]) CORNERS.push(new THREE.Vector3(x * ROOM.w / 2, y * ROOM.ceiling, z * ROOM.d / 2));
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
		you.step(dt);
		if (now - sendAt > 33) { sendAt = now; sendTracking(); }
		figures.forEach((f, i) => {
			if (i === you.me) { f.update(you.pose(), dt); if (f.setHeight) f.setHeight(you.cm / 175); }
			else { f.update(bot.ps[i], dt); if (f.setHeight) f.setHeight(1); }
		});
	}
	copyWalls(now);
	wallTex.needsUpdate = true;
	updateGlow(now);
	const v = VIEWS[view](now / 1000);
	if (orbit.yaw && view !== 'You' && view !== 'Inside') { const c0 = Math.cos(orbit.yaw), s0 = Math.sin(orbit.yaw), [px, py, pz] = v.pos; v.pos = [px * c0 + pz * s0, py, -px * s0 + pz * c0]; }
	const k = camReady ? Math.min(1, dt * 2.5) : 1;
	camPos.lerp(new THREE.Vector3(...v.pos), k);
	camAt.lerp(new THREE.Vector3(...v.at), k);
	camReady = true;
	camera.position.copy(camPos);
	camera.lookAt(camAt);
	const fov = view === 'You' ? 78 : 42;
	if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
	if (view === 'You') you.eyes(camera);
	else if (view !== 'Inside') centreBox();   // (inside the room there's no box to frame)
	you.draw(now / 1000, dt);
	composer.render();
	adapt(now, dt);
});

// If frames run slow for a couple of seconds, draw the room at a lower resolution.
let slowT = 0, fastT = 0;
function adapt(now, dt) {
	if (fixed[0] > 0 || document.hidden || dt >= 0.1) return;   // (a hidden or paused page isn't slow)
	if (dt > 1 / 40) { slowT += dt; fastT = 0; } else { fastT += dt; slowT = Math.max(0, slowT - dt * 0.5); }
	const top = Math.min(1.5, window.devicePixelRatio || 1);
	if (slowT > 2 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); slowT = 0; renderer.setPixelRatio(pixelRatio); resize(); }
	else if (fastT > 8 && pixelRatio < top) { pixelRatio = Math.min(top, pixelRatio + 0.25); fastT = 0; renderer.setPixelRatio(pixelRatio); resize(); }
}

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
	'red-light-green-light': { min: 10, max: 45, done: (a, b) => b.phase === 'cleared' && a.phase !== 'cleared' },   // a round cleared
	'super-sonic-battle': { min: 10, max: 60, done: (a, b) => b.phase === 'handover' || b.phase === 'finale' },   // a whole turn as Sonic
	'small-talk': { min: 15, max: 70, done: (a, b) => b.phase === 'reveal' && a.phase !== 'reveal' },          // a round: the scene, the hunt, the reveal
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

window.gamebox = { canvas, strip, startLoop, loopState, start: startGame, setView(v) { if (VIEWS[v]) { view = v; showView(); } }, games: SONIC, get game() { return game; }, get beat() { return game && game.state ? (game.state() || {}).beat : null; } };
startGame(params.get('game') || SONIC[0].id, +(params.get('players') || 3));
