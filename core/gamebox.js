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
	f.tap = function (up) { f.reach = 1; f.reachUp = up; };
	f.dispose = function () { scene.remove(root); };
	return f;
}

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
	// one runner per wall: run along it, jump now and then
	walls(n) {
		const ps = Array.from({ length: n }, (_, i) => ({ ...nearWall(i % 3, 0.5, 0.25), Y: 0, face: FACE[i % 3], jumpAt: 1.5 + i * 0.7 }));
		return { ps, step(t, dt) {
			ps.forEach((p, i) => {
				const w = i % 3;
				const along = 0.5 + Math.sin(t * 0.45 + i * 1.7) * 0.36;
				approach(p, nearWall(w, along, 0.25), 1.0, dt);
				p.face = FACE[w];
				if (t > p.jumpAt) { p.jumpAt = t + rnd(1.6, 2.8); p.jumpEnd = t + 0.45; }
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
	if (f) f.tap((0.5 - tap.y) * 1.6);
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
	figures = bot.ps.map((_, i) => Figure(i));
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
function resize() {
	let w, h;
	if (fixed[0] > 0 && fixed[1] > 0) { [w, h] = fixed; renderer.setPixelRatio(1); }
	else { w = window.innerWidth; h = Math.round(w / 1.6); if (h > window.innerHeight) { h = window.innerHeight; w = Math.round(h * 1.6); } }
	renderer.setSize(w, h, false);
	Object.assign(canvas.style, { width: w + 'px', height: h + 'px', left: (window.innerWidth - w) / 2 + 'px', top: (window.innerHeight - h) / 2 + 'px' });
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
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
	renderer.render(scene, camera);
});

window.gamebox = { canvas, start: startGame, setView(v) { if (VIEWS[v]) { view = v; showView(); } }, games: SONIC, get game() { return game; }, get beat() { return game && game.state ? (game.state() || {}).beat : null; } };
startGame(params.get('game') || SONIC[0].id, +(params.get('players') || 3));
