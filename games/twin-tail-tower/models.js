/*
 * Twin Tail Tower: the models. The foxes (a glossy, toy-like two-tailed fox
 * kit in each player's colour, aviator goggles up on its forehead), the
 * platforms in every look (grass, cloud, candy, dusk, metal; the moving
 * ones and the crumbly ones), springs, tail rotors, the hovering robots,
 * gold rings, the respawn bubble, the island at the bottom with its palms,
 * and the height markers.
 *
 * Every model is built facing +Z: the game turns it to face the middle of
 * the room.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildSpeedster } from '../../shared/speedster3d.js';

const TAU = Math.PI * 2;

function canvasTexture(w, h, paint) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 }, extra));
}
const chrome = () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 });
const glow = (color) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3.5) });   // (past white: it blooms)

// (geometry shared between many meshes is marked, so the game never disposes it)
const shared = (g) => { g.userData.shared = true; return g; };
const shadows = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };

/* ---------- a fox ---------- */

// The fox: the shared speedster build as Tails (the same family as the Sonic
// models) in the player's colour, two big white-tipped tails behind. Bouncing,
// it squashes on landing and stretches on the way up; with a tail rotor the
// tails swing up over its head and spin like a helicopter's blades.
export function buildFox(colour) {
	const root = new THREE.Group();      // its feet, on the ring of platforms
	const yaw = new THREE.Group();       // turned toward the way it's going
	root.add(yaw);
	const lean = new THREE.Group();      // leaning into a turn
	yaw.add(lean);
	const tumble = new THREE.Group();    // spinning head over heels when hit
	tumble.position.y = 0.6;
	lean.add(tumble);
	const squash = new THREE.Group();    // squashed and stretched, about its feet
	squash.position.y = -0.6;
	tumble.add(squash);

	const s = buildSpeedster(colour, { tails: true });
	s.root.rotation.y = Math.PI;   // (the speedster's built facing -Z; these models face +Z)
	s.root.scale.setScalar(0.95);
	squash.add(s.root);
	// the tails spin on a rotor above the head: a spinning pivot carrying the tails' rig
	const spin = new THREE.Group();
	s.torso.add(spin);
	spin.add(s.tailRig);
	const REST = s.tailRig.position.clone(), ROTOR = new THREE.Vector3(0, 1.02, 0.02);
	let time = 0, rotorK = 0;

	// st: { vy, v0 (a bounce's speed), rotor, hurt, squash (0..1), lean (radians), idle }
	function pose(dt, st) {
		time += dt;
		const rise = Math.max(-1, Math.min(1, st.vy / st.v0));

		// squashed flat on landing, stretched tall on the way up
		const stretch = st.rotor ? 0 : Math.max(0, rise) * 0.12;
		const sq = st.squash;
		squash.scale.set(1 + 0.24 * sq - stretch * 0.4, 1 - 0.32 * sq + stretch, 1 + 0.24 * sq - stretch * 0.4);
		lean.rotation.z = st.lean;

		// arms up on the way up and under the rotor, idle at rest, flailing when hit
		const mode = st.hurt ? 'hurt' : st.rotor || rise > 0.1 ? 'spring' : 'idle';
		s.animate(dt, mode, 0, 30, time);

		// the tails: up over its head and spinning, flat out like blades
		rotorK += ((st.rotor ? 1 : 0) - rotorK) * Math.min(1, dt * 9);
		s.tailRig.position.lerpVectors(REST, ROTOR, rotorK);
		s.tailRig.rotation.x = 0.74 * rotorK;
		if (rotorK > 0.04) spin.rotation.y += dt * (6 + rotorK * 38);
		else spin.rotation.y = Math.sin(time * 7) * 0.12;   // (a wag)

		// head over heels when hit
		if (st.hurt) tumble.rotation.z += dt * 11;
		else tumble.rotation.z = 0;
	}

	return { root, yaw, pose };
}

/* ---------- platforms ---------- */

const pillCache = new Map();
function pill(w) {
	const key = Math.round(w * 10);
	if (!pillCache.has(key)) {
		const g = new THREE.CapsuleGeometry(0.3, Math.max(0.1, key / 10 - 0.6), 6, 18);
		g.rotateZ(Math.PI / 2);
		pillCache.set(key, shared(g));
	}
	return pillCache.get(key);
}

const PUFF = shared(new THREE.SphereGeometry(1, 16, 12));
const ARROW = shared(new THREE.ConeGeometry(0.13, 0.3, 4));
const CRACK = shared(new THREE.BoxGeometry(0.035, 0.03, 0.5));
const STRIP = shared(new THREE.BoxGeometry(1, 0.05, 0.05));

let looks = null;
function lookMaterials() {
	return looks || (looks = {
		grass: { base: glossy(0x9a6a3c, { clearcoat: 0.4, roughness: 0.6 }), top: glossy(0x5fd35a) },
		cloud: { base: glossy(0xf2f6ff, { clearcoat: 0.2, roughness: 0.85 }), top: glossy(0xffffff, { clearcoat: 0.2, roughness: 0.85 }) },
		candy: { base: glossy(0xff6fa0), top: glossy(0xffc66b) },
		dusk: { base: glossy(0x3b3480), top: glossy(0x9d8cff, { emissive: 0x2a1f70, emissiveIntensity: 0.5 }) },
		metal: { base: new THREE.MeshStandardMaterial({ color: 0x5a6480, metalness: 0.9, roughness: 0.3 }), top: new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 0.85, roughness: 0.18 }), glow: glow(0x6ff6ff) },
		moving: { base: glossy(0x1f6fd6), top: glossy(0x5fe0ff), glow: glow(0xffffff) },
		crumble: { base: glossy(0xa8703c, { clearcoat: 0.3, roughness: 0.7 }), top: glossy(0xe0a868, { clearcoat: 0.3, roughness: 0.6 }), crack: glossy(0x4a2a10, { roughness: 0.8 }) },
	});
}

// A floating platform w metres across, its top at y = 0. look: grass,
// cloud, candy, dusk or metal (by height), or moving or crumble (by type).
export function buildPlatform(look, w) {
	const M = lookMaterials()[look];
	const g = new THREE.Group();
	const base = new THREE.Mesh(pill(w), M.base);
	base.scale.y = 0.72;
	base.position.y = -0.24;
	g.add(base);
	if (look === 'cloud') {
		// puffs along the top
		const n = Math.max(3, Math.round(w / 0.8));
		for (let i = 0; i < n; i++) {
			const p = new THREE.Mesh(PUFF, M.top);
			const r = 0.26 + Math.random() * 0.12;
			p.scale.set(r * 1.2, r * 0.7, r);
			p.position.set((i / (n - 1) - 0.5) * (w - 0.7), -0.04, (Math.random() - 0.5) * 0.15);
			g.add(p);
		}
	} else {
		const top = new THREE.Mesh(pill(w + 0.1), M.top);
		top.scale.set(1, 0.3, 1.06);
		top.position.y = -0.04;
		g.add(top);
	}
	if (look === 'metal') {
		const s = new THREE.Mesh(STRIP, M.glow);
		s.scale.x = w - 0.5;
		s.position.set(0, -0.2, 0.3);
		g.add(s);
	}
	if (look === 'moving') {
		// arrows at both ends: this one slides
		for (const side of [-1, 1]) {
			const a = new THREE.Mesh(ARROW, M.glow);
			a.rotation.z = -side * Math.PI / 2;
			a.position.set(side * (w / 2 + 0.22), -0.2, 0);
			g.add(a);
		}
	}
	if (look === 'crumble') {
		// cracks across the top
		for (let i = 0; i < 3; i++) {
			const c = new THREE.Mesh(CRACK, M.crack);
			c.position.set((i - 1) * w * 0.28 + (Math.random() - 0.5) * 0.3, 0.06, 0);
			c.rotation.y = (Math.random() - 0.5) * 0.9;
			g.add(c);
		}
	}
	return shadows(g);
}

/* ---------- springs and tail rotors ---------- */

class Helix extends THREE.Curve {
	constructor(r, h, turns) { super(); this.r = r; this.h = h; this.turns = turns; }
	getPoint(t, out = new THREE.Vector3()) {
		const a = t * this.turns * TAU;
		return out.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r);
	}
}
let springParts = null;
// A spring on a platform: a chrome coil and a red pad on top. The game
// stretches userData.coil when it fires.
export function buildSpring() {
	springParts = springParts || {
		coil: shared(new THREE.TubeGeometry(new Helix(0.17, 0.36, 4), 64, 0.035, 8)),
		pad: shared(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 20)),
		foot: shared(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 20)),
		chrome: chrome(),
		red: glossy(0xff3b4a),
	};
	const p = springParts;
	const g = new THREE.Group();
	g.add(new THREE.Mesh(p.foot, p.chrome));
	const coil = new THREE.Group();
	g.add(coil);
	coil.add(new THREE.Mesh(p.coil, p.chrome));
	const pad = new THREE.Mesh(p.pad, p.red);
	pad.position.y = 0.38;
	coil.add(pad);
	g.userData.coil = coil;
	return shadows(g);
}

let rotorParts = null;
// A tail rotor to pick up: two little fluffy tails crossed on a gold hub,
// spinning in a glowing ring. Grab it and your own tails spin you up.
export function buildRotor() {
	rotorParts = rotorParts || {
		hub: shared(new THREE.SphereGeometry(0.15, 16, 12)),
		tail: shared(new THREE.SphereGeometry(1, 16, 12)),
		ring: shared(new THREE.TorusGeometry(0.62, 0.035, 8, 40)),
		gold: new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.15, emissive: 0x6a3a00, emissiveIntensity: 0.4 }),
		fur: glossy(0xffa23a),
		tip: glossy(0xfff4e2),
		glow: glow(0xffe56a),
	};
	const p = rotorParts;
	const g = new THREE.Group();
	const spin = new THREE.Group();
	g.add(spin);
	spin.add(new THREE.Mesh(p.hub, p.gold));
	for (const side of [-1, 1]) {
		const t = new THREE.Mesh(p.tail, p.fur);
		t.scale.set(0.3, 0.09, 0.09);
		t.position.x = side * 0.32;
		spin.add(t);
		const tip = new THREE.Mesh(p.tail, p.tip);
		tip.scale.setScalar(0.08);
		tip.position.x = side * 0.6;
		spin.add(tip);
	}
	const ring = new THREE.Mesh(p.ring, p.glow);
	g.add(ring);
	g.userData.spin = spin;
	g.userData.ring = ring;
	return g;
}

/* ---------- a robot ---------- */

let robotParts = null;
// A hovering robot: a round red shell with a chrome belt, one big glaring
// eye, little pincers, a whirring rotor on top and a jet of flame below.
export function buildRobot() {
	robotParts = robotParts || {
		shell: shared(new THREE.SphereGeometry(0.48, 24, 16)),
		belt: shared(new THREE.TorusGeometry(0.48, 0.05, 8, 32)),
		eye: shared(new THREE.SphereGeometry(0.19, 16, 12)),
		pupil: shared(new THREE.SphereGeometry(0.09, 12, 8)),
		claw: shared(new THREE.ConeGeometry(0.08, 0.3, 8)),
		mast: shared(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8)),
		blade: shared(new THREE.BoxGeometry(0.9, 0.025, 0.1)),
		flame: shared(new THREE.ConeGeometry(0.14, 0.45, 12)),
		red: glossy(0xe8363f),
		chrome: chrome(),
		white: glossy(0xffffff),
		pupilMat: glow(0xff2a2a),
		flameMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa23a).multiplyScalar(3), transparent: true, opacity: 0.85, depthWrite: false }),
	};
	const p = robotParts;
	const g = new THREE.Group();
	const body = new THREE.Group();
	g.add(body);
	const shell = new THREE.Mesh(p.shell, p.red);
	shell.scale.set(1, 0.85, 1);
	body.add(shell);
	const belt = new THREE.Mesh(p.belt, p.chrome);
	belt.rotation.x = Math.PI / 2;
	body.add(belt);
	const eye = new THREE.Mesh(p.eye, p.white);
	eye.position.set(0, 0.06, 0.36);
	eye.scale.set(1, 1, 0.6);
	body.add(eye);
	const pupil = new THREE.Mesh(p.pupil, p.pupilMat);
	pupil.position.set(0, 0.06, 0.47);
	body.add(pupil);
	for (const side of [-1, 1]) {
		const c = new THREE.Mesh(p.claw, p.chrome);
		c.position.set(side * 0.55, -0.1, 0.1);
		c.rotation.z = side * 2.3;
		body.add(c);
	}
	const mast = new THREE.Mesh(p.mast, p.chrome);
	mast.position.y = 0.48;
	body.add(mast);
	const rotor = new THREE.Group();
	rotor.position.y = 0.6;
	body.add(rotor);
	rotor.add(new THREE.Mesh(p.blade, p.chrome));
	const b2 = new THREE.Mesh(p.blade, p.chrome);
	b2.rotation.y = Math.PI / 2;
	rotor.add(b2);
	const flame = new THREE.Mesh(p.flame, p.flameMat);
	flame.rotation.x = Math.PI;
	flame.position.y = -0.58;
	body.add(flame);
	g.userData = { body, rotor, flame, pupil };
	shadows(g);
	flame.castShadow = false;
	return g;
}

/* ---------- rings, bubbles, sparkles ---------- */

const RING_GEO = shared(new THREE.TorusGeometry(0.42, 0.09, 14, 36));
let ringMat = null;
export function buildRing() {
	ringMat = ringMat || new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.14, emissive: 0x9a5a00, emissiveIntensity: 1.1 });
	const g = new THREE.Group();
	const m = new THREE.Mesh(RING_GEO, ringMat);
	m.castShadow = true;
	g.add(m);
	g.userData.spin = m;
	return g;
}

// The bubble that carries a fallen fox back up: a soap bubble's sheen.
const BUBBLE_GEO = shared(new THREE.SphereGeometry(1.15, 32, 20));
export function buildBubble() {
	return new THREE.Mesh(BUBBLE_GEO, new THREE.MeshPhysicalMaterial({
		color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, depthWrite: false,
		iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600], transmission: 0.9, thickness: 0.1, envMapIntensity: 2,
	}));
}

export function sparkleTexture() {
	return canvasTexture(64, 64, function (g, w, h) {
		const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
		grad.addColorStop(0, 'rgba(255,255,255,1)');
		grad.addColorStop(0.25, 'rgba(255,240,170,0.8)');
		grad.addColorStop(1, 'rgba(255,200,60,0)');
		g.fillStyle = grad;
		g.fillRect(0, 0, w, h);
		g.fillStyle = 'white';
		g.beginPath();
		g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35);
		g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29);
		g.fill();
	});
}

/* ---------- height markers ---------- */

// A faint ring round the whole tower at a round height, with the height
// written on it at the middle of each wall.
export function buildMarker(metres, radius, font) {
	const g = new THREE.Group();
	const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.05, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), transparent: true, opacity: 0.5, depthWrite: false }));
	ring.rotation.x = Math.PI / 2;
	g.add(ring);
	const tex = canvasTexture(512, 160, function (c, w, h) {
		c.font = `110px "${font}", sans-serif`;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		c.lineWidth = 14;
		c.strokeStyle = 'rgba(20,16,48,0.85)';
		c.strokeText(metres + ' M', w / 2, h / 2);
		c.fillStyle = '#ffffff';
		c.fillText(metres + ' M', w / 2, h / 2);
	});
	for (const a of [-Math.PI / 2, 0, Math.PI / 2]) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 }));
		s.position.set(Math.sin(a) * radius, 0.7, -Math.cos(a) * radius);
		s.scale.set(3.2, 1, 1);
		g.add(s);
	}
	g.userData.tex = tex;
	return g;
}

/* ---------- the island at the bottom ---------- */

const frondGeo = (function () {
	const g = new THREE.PlaneGeometry(1.4, 6.5, 2, 10);
	g.translate(0, 3.25, 0);
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const y = p.getY(i);
		const x = p.getX(i);
		const t = y / 6.5;
		p.setX(i, x * Math.sin(Math.PI * Math.min(1, t * 1.15)) * 1.2);
		p.setZ(i, -Math.pow(t, 2) * 3.2);
		p.setY(i, y * 0.85);
	}
	g.computeVertexNormals();
	return shared(g);
})();

let palmMats = null;
function buildPalm(height) {
	palmMats = palmMats || {
		trunk: new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.9 }),
		frond: new THREE.MeshStandardMaterial({ color: 0x2fa84a, roughness: 0.6, side: THREE.DoubleSide }),
		frond2: new THREE.MeshStandardMaterial({ color: 0x55c94a, roughness: 0.6, side: THREE.DoubleSide }),
	};
	const g = new THREE.Group();
	const bend = (Math.random() - 0.5) * 0.5 * height;
	const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(bend * t * t, height * t, bend * 0.3 * t * t));
	g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, height * 0.035, 7), palmMats.trunk));
	const top = pts[3];
	const n = 8 + Math.floor(Math.random() * 3);
	for (let i = 0; i < n; i++) {
		const f = new THREE.Mesh(frondGeo, i % 2 ? palmMats.frond : palmMats.frond2);
		f.position.copy(top);
		f.rotation.order = 'YXZ';
		f.rotation.y = i / n * TAU + Math.random() * 0.3;
		f.rotation.x = -0.9 - Math.random() * 0.4;
		f.scale.setScalar(height / 11);
		g.add(f);
	}
	return shadows(g);
}

let landMat = null;
// An island of radius r and peak h: a lathed hill, sandy at the shore.
function hill(r, h) {
	landMat = landMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
	const prof = [[0, h], [0.25, h * 0.92], [0.5, h * 0.62], [0.72, h * 0.3], [0.84, 1.6], [0.93, 0.9], [1.0, 0.2], [1.08, -2]];
	const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * r, y)).reverse(), 36);   // (climbing profile: faces outward)
	const pos = geo.attributes.position;
	const seeds = [Math.random() * TAU, Math.random() * TAU];
	const colors = [];
	const c = new THREE.Color();
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		const y = pos.getY(i);
		const a = Math.atan2(z, x);
		const wob = 1 + 0.16 * Math.sin(a * 2 + seeds[0]) + 0.08 * Math.sin(a * 5 + seeds[1]);
		pos.setX(i, x * wob);
		pos.setZ(i, z * wob);
		pos.setY(i, y + (y > 2 ? (Math.random() - 0.5) * h * 0.08 : 0));
		c.set(y < 0.6 ? 0xd8c48a : y < 2 ? 0xf4e2a8 : 0x46b44c);
		if (y >= 2) c.lerp(new THREE.Color(0x2a8a3e), Math.random() * 0.5);
		colors.push(c.r, c.g, c.b);
	}
	geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();
	const m = new THREE.Mesh(geo, landMat);
	m.receiveShadow = true;
	return m;
}

// The island the tower starts from: a flat lawn round the middle of the
// room ringed by a sandy beach and palms, a lagoon, and more islands out at
// sea. Its top is at y = 0.
export function buildIsland(ringRadius) {
	const g = new THREE.Group();
	const R = ringRadius + 16;
	const prof = [[0, 0], [ringRadius + 3, 0], [R * 0.85, -0.05], [R, -0.5], [R * 1.12, -2.5]];
	const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)).reverse(), 64);   // (climbing profile: faces outward)
	const pos = geo.attributes.position;
	const colors = [];
	const c = new THREE.Color();
	for (let i = 0; i < pos.count; i++) {
		const d = Math.hypot(pos.getX(i), pos.getZ(i));
		c.set(d < ringRadius + 2.5 ? 0x5cc95a : d < R * 0.95 ? 0xf4e2a8 : 0xd8c48a);
		if (d < ringRadius + 2.5) c.lerp(new THREE.Color(0x3fae4c), Math.random() * 0.3);
		colors.push(c.r, c.g, c.b);
	}
	geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();
	const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
	ground.receiveShadow = true;
	g.add(ground);

	// a lagoon of pale turquoise round it
	const lagoon = new THREE.Mesh(new THREE.RingGeometry(R * 0.9, R * 2.2, 64), new THREE.MeshBasicMaterial({
		map: canvasTexture(256, 16, function (x, w, h) {
			const grad = x.createLinearGradient(0, 0, w, 0);
			grad.addColorStop(0, 'rgba(120,240,225,1)');
			grad.addColorStop(0.5, 'rgba(60,205,215,0.7)');
			grad.addColorStop(1, 'rgba(20,140,190,0)');
			x.fillStyle = grad;
			x.fillRect(0, 0, w, h);
		}),
		transparent: true, depthWrite: false,
	}));
	// (the ring's u runs round it; turn the texture so it runs outward)
	const uv = lagoon.geometry.attributes.uv;
	const lp = lagoon.geometry.attributes.position;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.hypot(lp.getX(i), lp.getY(i)) - R * 0.9) / (R * 1.3), 0.5);
	lagoon.rotation.x = -Math.PI / 2;
	lagoon.position.y = -0.2;
	lagoon.renderOrder = 1;
	g.add(lagoon);

	// palms on the beach, behind the ring of platforms
	for (let i = 0; i < 26; i++) {
		const a = Math.random() * TAU;
		const d = ringRadius + 5 + Math.random() * (R - ringRadius - 7);
		const p = buildPalm(7 + Math.random() * 5);
		p.position.set(Math.sin(a) * d, -0.1, -Math.cos(a) * d);
		p.rotation.y = Math.random() * TAU;
		g.add(p);
	}

	// islands out at sea
	for (let i = 0; i < 9; i++) {
		const a = Math.random() * TAU;
		const d = 180 + Math.random() * 520;
		const r = 20 + Math.random() * 50;
		const isle = hill(r, 8 + Math.random() * r * 0.8);
		isle.position.set(Math.sin(a) * d, 0, -Math.cos(a) * d);
		isle.rotation.y = Math.random() * TAU;
		g.add(isle);
	}
	return g;
}
