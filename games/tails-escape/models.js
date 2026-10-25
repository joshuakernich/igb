/*
 * Tails Escape: the models. Tails flying (the shared speedster build as the
 * fox, his two tails up over his head spinning like a rotor), the conveyor
 * belt round the room, the machines riding it (presses, swinging robot arms,
 * fire jets, buzzsaws, laser gates, crates), gold rings, Robotnik in his egg
 * pod, and the factory hall round it all (its dark sky, walls, pipes and
 * lamps).
 *
 * Every machine is built facing +Z with the belt along x and its top at
 * y = 0: the game turns it to face the middle of the room.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { SkyDome, canvasTexture } from '../../lib/three/walls.js';
import { buildSpeedster } from '../../shared/speedster3d.js';
import { buildRobotnik } from '../../shared/robotnik3d.js';

const TAU = Math.PI * 2;

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 }, extra));
}
const steel = (color = 0x6a7280, roughness = 0.35) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness });
const glowing = (color, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });   // (past white: it blooms)

const shadows = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
function add(parent, geo, mat, x = 0, y = 0, z = 0) {
	const m = new THREE.Mesh(geo, mat);
	m.position.set(x, y, z);
	parent.add(m);
	return m;
}

// Yellow and black hazard stripes, tiling.
export function stripeTexture() {
	const t = canvasTexture(128, 32, function (g, w, h) {
		g.fillStyle = '#16161a';
		g.fillRect(0, 0, w, h);
		g.fillStyle = '#f2b705';
		for (let x = -h; x < w + h; x += 32) {
			g.beginPath();
			g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0);
			g.fill();
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	return t;
}

let MATS = null;
function mats() {
	if (MATS) return MATS;
	const stripes = stripeTexture();
	MATS = {
		dark: steel(0x30343c, 0.45),
		steel: steel(0x7a8290, 0.3),
		bright: steel(0xc8cfd8, 0.18),
		red: glossy(0xd8262e, { roughness: 0.35 }),
		yellow: glossy(0xf2b705, { roughness: 0.4 }),
		rubber: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.8 }),
		stripes: new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.55, metalness: 0.2 }),
		chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 }),
		gold: glossy(0xffc21a, { metalness: 0.9, roughness: 0.18, emissive: 0x7a4a00, emissiveIntensity: 0.5 }),
	};
	// (shared by every machine: never disposed with one)
	for (const m of Object.values(MATS)) { m.userData.shared = true; if (m.map) m.map.userData.shared = true; }
	return MATS;
}

/* ---------- Tails, flying ---------- */

// Tails: the shared speedster build as the fox, in the player's colour, his
// two tails swung up over his head and spinning like a helicopter's blades
// the whole time. Flying low he tucks up; high, he reaches up; hit, he
// tumbles. The root is at the middle of his body (what touches things).
export function buildFlyer(colour, middle = 0.6) {
	const root = new THREE.Group();
	const yaw = new THREE.Group();       // turned to the way he's heading
	root.add(yaw);
	const lean = new THREE.Group();      // leaning into the way he's going
	yaw.add(lean);
	const tumble = new THREE.Group();    // spinning head over heels when hit
	lean.add(tumble);

	const s = buildSpeedster(colour, { tails: true });
	s.root.rotation.y = Math.PI;         // (the speedster's built facing -Z; these models face +Z)
	s.root.position.y = -middle;
	tumble.add(s.root);
	// the tails on a spinning pivot over his head
	const spin = new THREE.Group();
	s.torso.add(spin);
	spin.add(s.tailRig);
	s.tailRig.position.set(0, 1.02, 0.02);
	s.tailRig.rotation.x = 0.74;
	let time = 0;

	// st: { mode ('low' | 'mid' | 'high'), rising (0..1), hurt, lean (radians), turn (radians) }
	function pose(dt, st) {
		time += dt;
		const mode = st.hurt ? 'hurt' : st.mode === 'low' ? 'crouch' : 'spring';
		s.animate(dt, mode, 0, 30, time);
		spin.rotation.y += dt * (st.hurt ? 14 : 30 + st.rising * 14);
		lean.rotation.z = st.lean;
		yaw.rotation.y = st.turn;
		// a little bob under the rotor
		s.root.position.y = -middle + Math.sin(time * 9) * 0.03;
		if (st.hurt) tumble.rotation.z += dt * 12;
		else tumble.rotation.z *= Math.exp(-dt * 12);
	}

	return { root, yaw, pose, setColour: s.setColour };
}

/* ---------- the belt ---------- */

// The belt's rubber: dark, ribbed across, yellow chevrons along both edges
// (u runs along the belt, a metre a tile; v across it).
export function beltTexture(aniso = 4) {
	const t = canvasTexture(256, 256, function (g, w, h) {
		g.fillStyle = '#1b1c21';
		g.fillRect(0, 0, w, h);
		for (let x = 0; x < w; x += 32) {
			g.fillStyle = '#2c2e35';
			g.fillRect(x, 0, 12, h);
			g.fillStyle = '#0e0f12';
			g.fillRect(x + 12, 0, 3, h);
		}
		g.fillStyle = '#f2b705';
		for (const y0 of [6, h - 34]) {
			for (let x = 0; x < w; x += 64) {
				// a chevron pointing the way the belt runs (toward -u)
				g.beginPath();
				g.moveTo(x + 40, y0); g.lineTo(x + 18, y0 + 14); g.lineTo(x + 40, y0 + 28);
				g.lineTo(x + 50, y0 + 28); g.lineTo(x + 28, y0 + 14); g.lineTo(x + 50, y0);
				g.fill();
			}
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

// A ribbon along the path: from s0 to s1, at offsets a and b from the
// middle line (outward), heights ya and yb; u is s / tile.
export function ribbon(path, s0, s1, a, b, ya, yb, tile = 1, step = 0.25) {
	const pos = [], uv = [], idx = [];
	const n = Math.ceil((s1 - s0) / step);
	for (let i = 0; i <= n; i++) {
		const s = s0 + (s1 - s0) * i / n;
		const p = path.at(s);
		pos.push(p.x + p.nx * a, ya, p.z + p.nz * a, p.x + p.nx * b, yb, p.z + p.nz * b);
		uv.push(s / tile, 0, s / tile, 1);
		if (i < n) {
			const k = i * 2;
			idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

// The conveyor: the moving belt on top, a deep striped body under it, rails
// along both edges, and legs down to the floor. Returns { group, belt
// (the moving texture) }.
export function buildConveyor(path, { y, width, s0, s1, floor, aniso }) {
	const M = mats();
	const group = new THREE.Group();
	const tex = beltTexture(aniso);
	const top = new THREE.Mesh(ribbon(path, s0, s1, -width / 2, width / 2, y, y, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.1 }));
	top.receiveShadow = true;
	group.add(top);
	// the body: striped along the front, dark steel behind
	const stripes = M.stripes.map.clone();
	stripes.repeat.set(1, 1);
	const front = new THREE.Mesh(ribbon(path, s0, s1, -width / 2 - 0.02, -width / 2 - 0.02, y - 1.7, y + 0.08, 2), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
	group.add(front);
	// (a dark band over the stripes, so the rail reads)
	group.add(new THREE.Mesh(ribbon(path, s0, s1, -width / 2 - 0.03, -width / 2 - 0.03, y - 0.28, y + 0.1, 2), M.dark));
	group.add(new THREE.Mesh(ribbon(path, s0, s1, width / 2, width / 2, y - 1.7, y + 0.2, 2), M.dark));
	// rails: rounded tubes along both edges
	for (const off of [-width / 2 - 0.05, width / 2 + 0.05]) {
		const pts = [];
		for (let s = s0; s <= s1; s += 0.5) { const p = path.at(s); pts.push(new THREE.Vector3(p.x + p.nx * off, y + 0.12, p.z + p.nz * off)); }
		const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.07, 8), M.bright);
		rail.castShadow = true;
		group.add(rail);
	}
	// legs, every few metres
	const leg = new THREE.BoxGeometry(0.3, y - 1.7 - floor, 0.3);
	for (let s = Math.ceil(s0 / 3) * 3; s < s1; s += 3) {
		const p = path.at(s);
		for (const off of [-width / 2 + 0.3, width / 2 - 0.3]) {
			const m = add(group, leg, M.dark, p.x + p.nx * off, (y - 1.7 + floor) / 2, p.z + p.nz * off);
			m.castShadow = true;
		}
	}
	return { group, belt: tex };
}

/* ---------- the machines ---------- */

// (a machine's mast: standing at the back edge of the belt, and up)
function mast(g, height) {
	const M = mats();
	add(g, new THREE.BoxGeometry(0.5, height + 1.7, 0.5), M.dark, 0, (height - 1.7) / 2, -1.65);
	add(g, new THREE.BoxGeometry(0.9, 0.3, 0.9), M.yellow, 0, 0.15, -1.65);
}

// A press: a heavy striped steel ram on a piston, hanging from a beam over
// the belt, a warning lamp on top. userData: ram (its bottom at ram.position.y),
// piston, lamp (a material, its brightness the warning).
export function buildPress(top = 5.4) {
	const M = mats();
	const g = new THREE.Group();
	mast(g, top + 0.4);
	add(g, new THREE.BoxGeometry(0.7, 0.55, 2.4), M.steel, 0, top + 0.1, -0.55);
	const ram = new THREE.Group();
	g.add(ram);
	add(ram, new THREE.BoxGeometry(2.0, 0.85, 2.0), M.dark, 0, 0.6, 0);
	const band = add(ram, new THREE.BoxGeometry(2.04, 0.36, 2.04), M.stripes, 0, 0.62, 0);
	band.material = M.stripes.clone();
	band.material.map = M.stripes.map.clone();
	band.material.userData = {};
	band.material.map.userData = {};
	band.material.map.repeat.set(2, 0.6);
	add(ram, new THREE.BoxGeometry(2.1, 0.18, 2.1), M.steel, 0, 0.09, 0);   // (the striking plate)
	add(ram, new THREE.BoxGeometry(1.3, 0.25, 1.3), M.steel, 0, 1.15, 0);
	const piston = add(g, new THREE.CylinderGeometry(0.2, 0.2, 1, 16), M.chrome, 0, 0, 0);
	const lampMat = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
	add(g, new THREE.SphereGeometry(0.2, 14, 10), lampMat, 0, top + 0.5, 0.45);
	add(g, new THREE.CylinderGeometry(0.24, 0.24, 0.1, 14), M.dark, 0, top + 0.38, 0.45);
	g.userData = { ram, piston, lamp: lampMat, top };
	return shadows(g);
}

// A robot arm: a mast with an arm out over the belt, and from its end a
// jointed arm swinging along the belt, a three-fingered claw and a red eye
// at its end. userData: swing (turn its rotation.z), eye (a material),
// pivot (the swing's height), reach (pivot to the claw's middle).
export function buildArm(pivot = 5.6, reach = 3.7) {
	const M = mats();
	const g = new THREE.Group();
	mast(g, pivot + 0.5);
	add(g, new THREE.BoxGeometry(0.8, 0.8, 0.9), M.yellow, 0, pivot + 0.5, -1.65);
	add(g, new THREE.BoxGeometry(0.45, 0.45, 1.8), M.steel, 0, pivot + 0.5, -0.75);
	add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.6, 20), M.dark, 0, pivot, 0).rotation.x = Math.PI / 2;
	const swing = new THREE.Group();
	swing.position.y = pivot;
	g.add(swing);
	add(swing, new THREE.BoxGeometry(0.42, reach - 0.6, 0.42), M.yellow, 0, -(reach - 0.6) / 2, 0);
	add(swing, new THREE.BoxGeometry(0.3, 0.5, 0.5), M.dark, 0, -reach * 0.45, 0);   // (a hydraulic sleeve)
	add(swing, new THREE.SphereGeometry(0.34, 18, 12), M.steel, 0, -reach + 0.55, 0);
	const claw = new THREE.Group();
	claw.position.y = -reach;
	swing.add(claw);
	add(claw, new THREE.CylinderGeometry(0.42, 0.3, 0.4, 18), M.dark, 0, 0.3, 0);
	for (let i = 0; i < 3; i++) {
		const a = i / 3 * TAU;
		const finger = new THREE.Group();
		finger.rotation.y = a;
		claw.add(finger);
		const f = add(finger, new THREE.BoxGeometry(0.12, 0.6, 0.16), M.bright, 0.32, -0.12, 0);
		f.rotation.z = -0.45;
		const tip = add(finger, new THREE.ConeGeometry(0.08, 0.3, 8), M.bright, 0.38, -0.5, 0);
		tip.rotation.z = Math.PI + 0.5;
	}
	const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.2) });
	add(claw, new THREE.SphereGeometry(0.12, 12, 8), eyeMat, 0, 0.3, 0.38);
	g.userData = { swing, eye: eyeMat, pivot, reach };
	return shadows(g);
}

// A fire jet: a grated burner on the belt, its ring glowing hotter as it's
// about to fire, then a roaring column of flame. userData: flame (scale y
// 0..1), flames (materials), ring (a material).
export function buildJet(height = 4.6) {
	const M = mats();
	const g = new THREE.Group();
	add(g, new THREE.BoxGeometry(1.5, 0.3, 1.8), M.dark, 0, 0.15, 0);
	add(g, new THREE.BoxGeometry(1.56, 0.12, 1.86), M.stripes, 0, 0.26, 0);
	add(g, new THREE.CylinderGeometry(0.42, 0.5, 0.35, 20), M.steel, 0, 0.45, 0);
	const ringMat = new THREE.MeshBasicMaterial({ color: 0x401008 });
	add(g, new THREE.TorusGeometry(0.36, 0.06, 8, 24), ringMat, 0, 0.63, 0).rotation.x = Math.PI / 2;
	const flame = new THREE.Group();
	flame.position.y = 0.6;
	g.add(flame);
	const flames = [];
	for (const [r, c, k, o] of [[0.62, 0xff4a10, 1.6, 0.75], [0.44, 0xff9a2a, 2.2, 0.85], [0.24, 0xfff0a0, 2.8, 1]]) {
		const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
		const geo = new THREE.CylinderGeometry(r * 0.5, r, height, 18, 1, true);
		geo.translate(0, height / 2, 0);
		add(flame, geo, m);
		flames.push(m);
	}
	flame.scale.y = 0.001;
	g.userData = { flame, flames, ring: ringMat, height };
	g.traverse((o) => { if (o.isMesh && o.material.blending !== THREE.AdditiveBlending) { o.castShadow = true; o.receiveShadow = true; } });
	return g;
}

// A buzzsaw: a big toothed chrome disc spinning up out of a slot in the belt.
// userData: disc (turn its rotation.z), radius.
export function buildSaw(radius = 1.5) {
	const M = mats();
	const g = new THREE.Group();
	add(g, new THREE.BoxGeometry(radius * 2.3, 0.22, 0.9), M.stripes, 0, 0.11, 0);
	add(g, new THREE.BoxGeometry(radius * 2.1, 0.06, 0.2), new THREE.MeshBasicMaterial({ color: 0x050505 }), 0, 0.23, 0);
	const disc = new THREE.Group();
	disc.position.y = 0.1;
	g.add(disc);
	const blade = add(disc, new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.07, 48), M.chrome);
	blade.rotation.x = Math.PI / 2;
	const teeth = 26;
	const tooth = new THREE.ConeGeometry(radius * 0.13, radius * 0.22, 4);
	for (let i = 0; i < teeth; i++) {
		const a = i / teeth * TAU;
		const t = add(disc, tooth, M.bright, Math.cos(a) * radius * 0.96, Math.sin(a) * radius * 0.96, 0);
		t.rotation.z = a - Math.PI / 2 - 0.35;
		t.scale.z = 0.3;
	}
	for (const z of [-0.06, 0.06]) {
		const hub = add(disc, new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, 0.08, 24), M.red, 0, 0, z);
		hub.rotation.x = Math.PI / 2;
	}
	for (let i = 0; i < 4; i++) {
		const a = i / 4 * TAU;
		add(disc, new THREE.BoxGeometry(radius * 0.5, 0.06, 0.09), M.dark, Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0).rotation.z = a;
	}
	g.userData = { disc, radius };
	return shadows(g);
}

// A laser gate: two posts at the back of the belt, a glowing red beam
// between them at each height. userData: beams (meshes), beam (a material),
// emitters (a material), half (half its span).
export function buildLaser(heights, half = 1.7) {
	const M = mats();
	const g = new THREE.Group();
	const tall = Math.max(...heights) + 0.8;
	const emitMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.15) });
	for (const x of [-half, half]) {
		add(g, new THREE.BoxGeometry(0.34, tall + 1.7, 0.34), M.dark, x, (tall - 1.7) / 2, -1.35);
		add(g, new THREE.BoxGeometry(0.4, 0.3, 0.4), M.yellow, x, tall, -1.35);
		for (const h of heights) add(g, new THREE.BoxGeometry(0.18, 0.22, 0.2), emitMat, x - Math.sign(x) * 0.2, h, -1.35);
	}
	const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.25, 0.2) });
	const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.08, 0.06), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
	const beams = [];
	for (const h of heights) {
		const beam = new THREE.Group();
		beam.position.set(0, h, -1.35);
		g.add(beam);
		add(beam, new THREE.CylinderGeometry(0.05, 0.05, half * 2 - 0.4, 8), beamMat).rotation.z = Math.PI / 2;
		add(beam, new THREE.CylinderGeometry(0.16, 0.16, half * 2 - 0.4, 10, 1, true), glowMat).rotation.z = Math.PI / 2;
		beams.push(beam);
	}
	g.userData = { beams, beam: beamMat, glow: glowMat, emitters: emitMat, half };
	g.traverse((o) => { if (o.isMesh && o.material === M.dark) { o.castShadow = true; o.receiveShadow = true; } });
	return g;
}

// A crate: a steel-banded orange crate with the hazard mark, dropped onto
// the belt from the dark above.
let crateTex = null;
export function buildCrate(size = 1.6) {
	if (!crateTex) crateTex = canvasTexture(128, 128, function (g, w, h) {
		g.fillStyle = '#c8641e';
		g.fillRect(0, 0, w, h);
		g.fillStyle = '#a24c12';
		for (let y = 0; y < h; y += 26) g.fillRect(0, y, w, 3);
		g.strokeStyle = '#3a3f48';
		g.lineWidth = 12;
		g.strokeRect(6, 6, w - 12, h - 12);
		g.lineWidth = 9;
		g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
		g.fillStyle = '#f2b705';
		g.beginPath(); g.moveTo(64, 34); g.lineTo(96, 92); g.lineTo(32, 92); g.closePath(); g.fill();
		g.fillStyle = '#16161a';
		g.fillRect(60, 52, 8, 22);
		g.fillRect(60, 79, 8, 7);
	});
	crateTex.userData.shared = true;
	const g = new THREE.Group();
	const box = add(g, new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6, metalness: 0.15 }), 0, size / 2, 0);
	box.castShadow = box.receiveShadow = true;
	g.userData = { size };
	return g;
}

// A drop's warning: a red glowing ring on the belt under where it'll land.
export function buildTarget() {
	const geo = new THREE.RingGeometry(0.55, 0.8, 32);
	geo.rotateX(-Math.PI / 2);
	geo.translate(0, 0.03, 0);
	return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.2, 0.1), transparent: true, opacity: 0.8, depthWrite: false }));
}

/* ---------- rings ---------- */

const RING_GEO = new THREE.TorusGeometry(0.3, 0.075, 12, 32);
RING_GEO.userData.shared = true;
export function buildRing() {
	const g = new THREE.Group();
	const spin = new THREE.Group();
	g.add(spin);
	spin.add(new THREE.Mesh(RING_GEO, mats().gold));
	g.userData = { spin };
	return g;
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

/* ---------- Robotnik ---------- */

// Robotnik in his egg pod: a silver half egg with a red band, a windscreen,
// a jet glowing under it, him standing in it. userData: robotnik (from
// buildRobotnik), jet (a material).
export function buildEggPod() {
	const M = mats();
	const g = new THREE.Group();
	const pod = new THREE.Group();
	g.add(pod);
	const shell = add(pod, new THREE.SphereGeometry(1, 40, 24, 0, TAU, Math.PI * 0.42, Math.PI * 0.58), glossy(0xdfe4ea, { metalness: 0.5, roughness: 0.2 }));
	shell.scale.set(1.1, 0.9, 1.0);
	shell.position.y = 0.55;
	const band = add(pod, new THREE.TorusGeometry(1.08, 0.08, 10, 48), M.red, 0, 0.62, 0);
	band.rotation.x = Math.PI / 2;
	band.scale.y = 0.92;
	// the windscreen, round the front (+Z)
	const glass = add(pod, new THREE.SphereGeometry(1.02, 32, 12, Math.PI / 2 - 0.9, 1.8, Math.PI * 0.3, Math.PI * 0.14), new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, side: THREE.DoubleSide }));
	glass.position.y = 0.55;
	const jetMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 3.2), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
	const jet = add(pod, new THREE.ConeGeometry(0.35, 1.1, 18, 1, true), jetMat, 0, -0.75, 0);
	jet.rotation.x = Math.PI;
	add(pod, new THREE.CylinderGeometry(0.32, 0.42, 0.3, 18), M.dark, 0, -0.36, 0);
	const robotnik = buildRobotnik();
	robotnik.root.position.y = -0.15;
	robotnik.root.rotation.y = Math.PI;   // (he's built facing -Z: turned to face the room)
	g.add(robotnik.root);
	g.userData = { robotnik, jet: jetMat, jetMesh: jet };
	return shadows(g);
}

/* ---------- the factory ---------- */

// The hall's own darkness: soot black overhead with the cold glow of strip
// lights, and the molten orange of the furnaces low down all round.
const SKY = `
	uniform float heat;
	vec3 skyColor(vec3 d) {
		float up = d.y;
		vec3 col = mix(vec3(0.05, 0.035, 0.03), vec3(0.012, 0.016, 0.026), smoothstep(-0.1, 0.6, up));
		col += vec3(1.1, 0.38, 0.08) * (0.55 + 0.25 * heat) * exp(-abs(up + 0.08) * 9.0);
		col += vec3(0.35, 0.5, 0.7) * 0.25 * smoothstep(0.55, 0.95, up);
		return col;
	}
`;

// The factory hall: the sky (and the light it gives), the walls a way back
// on all sides (panelled steel, furnace windows glowing), girders, pipes
// along the walls, a floor, strip lights high up and amber lamps that spin.
// Returns { group, sky, update(time) }.
export function buildFactory(renderer, scene, { far, floor, aniso }) {
	const M = mats();
	const group = new THREE.Group();
	const sky = new SkyDome(SKY, { heat: { value: 0 } }, 900);
	scene.add(sky);
	scene.environment = sky.environment(renderer);

	// the walls: one panelled texture, its windows glowing (an emissive map)
	const paint = (glow) => function (g, w, h) {
		g.fillStyle = glow ? '#000' : '#23262d';
		g.fillRect(0, 0, w, h);
		if (!glow) {
			for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 96) {
				g.fillStyle = (x / 128 + y / 96) % 2 ? '#2a2e36' : '#262930';
				g.fillRect(x + 3, y + 3, 122, 90);
				g.fillStyle = '#3a3f49';
				for (const [cx, cy] of [[10, 10], [118, 10], [10, 86], [118, 86]]) g.fillRect(x + cx - 2, y + cy - 2, 4, 4);
			}
			g.fillStyle = '#f2b705';
			for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, h - 40); g.lineTo(x + 12, h - 40); g.lineTo(x + 24, h - 24); g.lineTo(x + 12, h - 24); g.fill(); }
		}
		// tall furnace windows, molten behind
		for (let x = 64; x < w; x += 256) {
			const grad = g.createLinearGradient(0, 300, 0, 620);
			grad.addColorStop(0, glow ? '#ff8a1c' : '#5a2a10');
			grad.addColorStop(1, glow ? '#ffd04a' : '#7a3a12');
			g.fillStyle = grad;
			g.fillRect(x, 300, 128, 320);
			g.fillStyle = glow ? '#000' : '#16181d';
			for (let k = 1; k < 4; k++) g.fillRect(x + k * 32 - 3, 300, 6, 320);
			for (let k = 1; k < 4; k++) g.fillRect(x, 300 + k * 80 - 3, 128, 6);
		}
	};
	const wallTex = canvasTexture(1024, 768, paint(false));
	const glowTex = canvasTexture(1024, 768, paint(true));
	for (const t of [wallTex, glowTex]) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = aniso; }
	const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, emissiveMap: glowTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.6, metalness: 0.5 });
	const tall = far * 1.15;
	for (let w = 0; w < 3; w++) {
		const m = new THREE.Mesh(new THREE.PlaneGeometry(far * 2, tall), wallMat);
		m.rotation.y = [Math.PI / 2, 0, -Math.PI / 2][w];
		m.position.set([-far, 0, far][w], floor + tall / 2, [0, -far, 0][w]);
		m.receiveShadow = true;
		group.add(m);
	}
	// the floor: dark concrete, yellow lines
	const floorTex = canvasTexture(256, 256, function (g, w, h) {
		g.fillStyle = '#1d1f23';
		g.fillRect(0, 0, w, h);
		for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
		g.fillStyle = '#a07a10';
		g.fillRect(0, 120, w, 10);
		g.fillRect(120, 0, 10, h);
	});
	floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
	floorTex.repeat.set(far / 3, far / 3);
	floorTex.anisotropy = aniso;
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(far * 2, far * 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.2 }));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = floor;
	ground.receiveShadow = true;
	group.add(ground);

	// girders up the walls, a beam across the top, pipes along them
	const lamps = [];
	const girder = new THREE.BoxGeometry(0.8, tall, 0.8);
	const pipeMat = steel(0x8a5a3a, 0.4);
	const greenPipe = steel(0x3a6a5a, 0.4);
	for (let w = 0; w < 3; w++) {
		const side = new THREE.Group();
		side.rotation.y = [Math.PI / 2, 0, -Math.PI / 2][w];
		group.add(side);
		const d = far - 1.2;
		for (let x = -far + 4; x <= far - 4; x += 8) add(side, girder, M.dark, x, floor + tall / 2, -d);
		add(side, new THREE.BoxGeometry(far * 2, 0.9, 0.9), M.dark, 0, floor + 11, -d + 0.2);
		for (const [y, r, mat] of [[floor + 4.2, 0.45, pipeMat], [floor + 5.3, 0.3, greenPipe], [floor + 13, 0.6, pipeMat]]) {
			const p = add(side, new THREE.CylinderGeometry(r, r, far * 2, 14), mat, 0, y, -d + 0.9);
			p.rotation.z = Math.PI / 2;
			for (let x = -far + 6; x < far; x += 8) add(side, new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.25, 14), M.dark, x, y, -d + 0.9).rotation.z = Math.PI / 2;
		}
		// strip lights high up, amber lamps on the girders
		for (let x = -far + 8; x < far - 4; x += 8) {
			add(side, new THREE.BoxGeometry(3, 0.15, 0.3), glowing(0xcfe4ff, 2.2), x, floor + 15, -d + 1.5);
			const lamp = new THREE.Group();
			lamp.position.set(x - 4, floor + 9, -d + 0.6);
			side.add(lamp);
			add(lamp, new THREE.CylinderGeometry(0.22, 0.26, 0.3, 14), M.dark);
			const beam = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.0, 0.1), transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
			beam.rotation.z = Math.PI / 2;
			beam.position.x = 0.8;
			const spin = new THREE.Group();
			spin.position.y = 0.25;
			lamp.add(spin);
			spin.add(beam);
			add(spin, new THREE.SphereGeometry(0.2, 12, 8), glowing(0xffa020, 2.4));
			lamps.push({ spin, ph: Math.random() * TAU });
		}
	}
	scene.add(group);

	return {
		group, sky,
		update(time, heat = 0) {
			sky.uniforms.heat.value = heat;
			for (const l of lamps) l.spin.rotation.y = time * 4 + l.ph;
		},
		dispose() {
			if (sky.env) sky.env.dispose();
			for (const t of [wallTex, glowTex, floorTex]) t.dispose();
		},
	};
}
