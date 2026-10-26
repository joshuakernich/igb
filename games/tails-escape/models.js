/*
 * Tails Escape: the models. Tails flying (the shared speedster build as the
 * fox, his two tails up over his head spinning like a rotor), the tunnels of
 * the maze (every surface a moving conveyor belt, steel ribs and strip lights
 * in the tunnel's colour), the junctions where they meet (a closed side shows
 * a red barrier), the machines in the tunnels (laser grids, crates riding the
 * floor, buzzsaws, ceiling crushers, swinging robot arms, fire jets across
 * the tunnel), gold rings, and Robotnik in his egg pod.
 *
 * A tunnel's pieces are built in its own frame: x across it (to the right as
 * you fly), y up from the floor, and -z the way you fly. Every machine is
 * built at the tunnel's middle line facing +z, toward the incoming foxes.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { canvasTexture } from '../../lib/three/walls.js';
import { buildSpeedster, hose } from '../../shared/speedster3d.js';
import { buildRobotnik } from '../../shared/robotnik3d.js';

const TAU = Math.PI * 2;

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 }, extra));
}
const steel = (color = 0x6a7280, roughness = 0.35) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness });
const glowing = (color, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });   // (past white: it blooms)
const additive = (color, k, opacity) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

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

// The tunnels' colours: each tunnel's strip lights (and its name over the walls).
export const KIND_COLOURS = { plain: 0x8fd4ff, rings: 0xffc21a, danger: 0xff2a20 };

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
		stripes: new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.55, metalness: 0.2 }),
		chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 }),
		gold: glossy(0xffc21a, { metalness: 0.9, roughness: 0.18, emissive: 0x7a4a00, emissiveIntensity: 0.5 }),
		cap: new THREE.MeshBasicMaterial({ color: 0x000000 }),
		strip: {},
		lamp: {},
	};
	for (const [k, c] of Object.entries(KIND_COLOURS)) {
		MATS.strip[k] = glowing(c, 1.5);
		MATS.lamp[k] = glowing(c, 2);
	}
	// (shared by every tunnel and machine: never disposed with one)
	const mark = (m) => { m.userData.shared = true; if (m.map) m.map.userData.shared = true; };
	for (const m of Object.values(MATS)) if (m.isMaterial) mark(m);
	for (const m of [...Object.values(MATS.strip), ...Object.values(MATS.lamp)]) mark(m);
	return MATS;
}

/* ---------- Tails, flying ---------- */

// Tails: the shared speedster build as the fox, in the player's colour,
// flying the classic way: his two tails rise from his rear and spin like a
// helicopter's blades over him, and he hangs under them tipped forward, his
// butt up high, head up looking ahead, arms reaching forward and down, legs
// trailing (back a little more as he climbs); hit, he tumbles. The root is
// at the middle of his body (what touches things), and he faces +Z (the
// game turns him the way he's flying).
export function buildFlyer(colour) {
	const HIPS = 0.1;                    // (how far over his middle his hips are)
	const TIP = 1.05;                    // (radians the whole body tips forward from the hips: his butt up high, his legs trailing)
	const ROTOR = 0.45;                  // (how far over his butt the rotor spins)
	const root = new THREE.Group();
	const yaw = new THREE.Group();       // turned a little into a swerve
	root.add(yaw);
	const lean = new THREE.Group();      // banking into it
	yaw.add(lean);
	const tumble = new THREE.Group();    // spinning head over heels when hit
	lean.add(tumble);
	const tip = new THREE.Group();       // tipped forward about his hips
	tip.position.y = HIPS;
	tip.rotation.x = TIP;
	tumble.add(tip);

	const s = buildSpeedster(colour, { tails: true });
	s.root.rotation.y = Math.PI;         // (the speedster's built facing -Z; these models face +Z)
	const base = -0.56;                  // (the speedster's hips are 0.56 over its feet)
	s.root.position.y = base;
	tip.add(s.root);
	// where his tails grow from (on his torso, so it moves with him)
	const butt = new THREE.Object3D();
	butt.position.copy(s.tailRig.position);
	s.torso.add(butt);
	// the tails: a stem rising from there to a spinning pivot over him
	const [fur, tipFur] = s.tailRig.children.filter((o) => o.isMesh).map((o) => o.material);   // (the tails' orange fur and white tips)
	const stemGeo = new THREE.CylinderGeometry(0.035, 0.09, 1, 12);
	stemGeo.translate(0, 0.5, 0);   // (from its base up)
	const stem = new THREE.Mesh(stemGeo, fur);
	tumble.add(stem);
	const spin = new THREE.Group();
	tumble.add(spin);
	// the blades: his two tails straight out either side of the hub, flat,
	// swept back a little the same way round, white tips at their ends (in
	// place of the speedster's own tails, which curl back behind him)
	s.tailRig.visible = false;
	const point = (x, y, z) => new THREE.Vector3(x, y, z);
	const BLADE = { len: 0.66, R: 0.12, T: 0.7 };
	for (const side of [-1, 1]) {
		const a = point(0, 0, 0), c = point(side * BLADE.len * 0.5, 0.04, side * 0.06), b = point(side * BLADE.len, 0.06, side * 0.16);
		const q = (t) => point(0, 0, 0).addScaledVector(a, (1 - t) * (1 - t)).addScaledVector(c, 2 * (1 - t) * t).addScaledVector(b, t * t);
		const m = q(BLADE.T), c1 = point(0, 0, 0).lerpVectors(a, c, BLADE.T), c2 = point(0, 0, 0).lerpVectors(c, b, BLADE.T);
		const body = hose(fur, 0, 0, { segs: 24, radial: 16, capA: true, capB: false, profile: (u) => BLADE.R * (0.45 + 0.55 * Math.sin(Math.PI / 2 * Math.min(1, u * 1.25))) });
		body.update(a, c1, m);
		const tip = hose(tipFur, 0, 0, { segs: 16, radial: 16, capA: false, capB: true, profile: (u) => Math.max(0.004, BLADE.R * Math.pow(Math.max(0, 1 - u * u), 0.6)) });
		tip.update(m, c2, b);
		for (const h of [body, tip]) { h.geometry.computeBoundingSphere(); h.castShadow = true; spin.add(h); }
	}
	const from = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
	let time = 0;

	// st: { rising (0..1), hurt, lean (radians), turn (radians) }
	function pose(dt, st) {
		time += dt;
		s.animate(dt, st.hurt ? 'hurt' : 'tailhang', 0.25 + st.rising * 0.5, 30, time);
		spin.rotation.y += dt * (st.hurt ? 14 : 30 + st.rising * 14);
		lean.rotation.z = st.lean;
		yaw.rotation.y = st.turn;
		// a little bob under the rotor
		s.root.position.y = base + Math.sin(time * 9) * 0.03;
		if (st.hurt) tumble.rotation.x += dt * 12;
		else tumble.rotation.x *= Math.exp(-dt * 12);
		// the rotor over his butt, the stem from his butt up to it
		tumble.updateMatrixWorld(true);
		tumble.worldToLocal(butt.getWorldPosition(from));
		spin.position.set(from.x, from.y + ROTOR, from.z);
		stem.position.copy(from);
		dir.subVectors(spin.position, from);
		stem.scale.set(1, dir.length(), 1);
		stem.quaternion.setFromUnitVectors(up, dir.normalize());
	}

	return { root, yaw, pose, setColour: s.setColour };
}

// A soft dark blob on the floor under a fox (so you can tell how high he is).
let blobTex = null;
export function buildBlob() {
	if (!blobTex) {
		blobTex = canvasTexture(64, 64, function (g) {
			const grad = g.createRadialGradient(32, 32, 0, 32, 32, 31);
			grad.addColorStop(0, 'rgba(0,0,0,0.7)');
			grad.addColorStop(1, 'rgba(0,0,0,0)');
			g.fillStyle = grad;
			g.fillRect(0, 0, 64, 64);
		});
	}
	const geo = new THREE.PlaneGeometry(1.4, 1.4);
	geo.rotateX(-Math.PI / 2);
	return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
}

/* ---------- the tunnels ---------- */

// The belts' rubber: dark, ribbed across, yellow chevrons along both edges
// (u runs along the belt; v across it). Every surface of every tunnel shares
// it, so they all run together (toward the foxes).
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

// A flat four-cornered piece of belt: a and b at the start, c and d at the
// end (c across from b, d from a); u from u0 at the start to u1 at the end.
function quad(a, b, c, d, u0, u1) {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u0, 1, u1, 1, u1, 0], 2));
	g.setIndex([0, 1, 2, 0, 2, 3]);
	g.computeVertexNormals();
	return g;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;

// A stretch of tunnel, from a0 to a1 metres along (its frame: -z ahead):
// belts all round (floor, ceiling and both walls), steel ribs every few
// metres with lamps, strip lights along its four corners in its kind's
// colour. T: { half, height, rib, tile }.
export function buildTunnel(a0, a1, kind, T, belt) {
	const M = mats();
	const g = new THREE.Group();
	const { half: w, height: h } = T;
	const u0 = a0 / T.tile, u1 = a1 / T.tile;
	const z0 = -a0, z1 = -a1;
	for (const [a, b, c, d] of [
		[[-w, 0, z0], [w, 0, z0], [w, 0, z1], [-w, 0, z1]],       // the floor
		[[-w, h, z0], [w, h, z0], [w, h, z1], [-w, h, z1]],       // the ceiling
		[[-w, 0, z0], [-w, h, z0], [-w, h, z1], [-w, 0, z1]],     // the left wall
		[[w, 0, z0], [w, h, z0], [w, h, z1], [w, 0, z1]],         // the right wall
	]) add(g, quad(a, b, c, d, u0, u1), belt);
	// ribs: two posts and a beam over, and a roller across the floor
	const ribs = [];
	for (let a = Math.ceil(a0 / T.rib) * T.rib; a < a1; a += T.rib) ribs.push(a);
	const parts = new THREE.InstancedMesh(BOX, M.dark, ribs.length * 4);
	const lamps = new THREE.InstancedMesh(BOX, M.lamp[kind], ribs.length * 2);
	const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
	const put = (mesh, i, x, y, z, sx, sy, sz) => mesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz)));
	ribs.forEach(function (a, i) {
		put(parts, i * 4, -w + 0.15, h / 2, -a, 0.35, h, 0.5);
		put(parts, i * 4 + 1, w - 0.15, h / 2, -a, 0.35, h, 0.5);
		put(parts, i * 4 + 2, 0, h - 0.15, -a, w * 2, 0.35, 0.5);
		put(parts, i * 4 + 3, 0, 0.05, -a, w * 2, 0.14, 0.3);
		put(lamps, i * 2, -w + 0.36, h * 0.55, -a, 0.08, 0.9, 0.22);
		put(lamps, i * 2 + 1, w - 0.36, h * 0.55, -a, 0.08, 0.9, 0.22);
	});
	g.add(parts, lamps);
	// strip lights along the corners
	const len = a1 - a0;
	for (const [x, y] of [[-w + 0.12, 0.1], [w - 0.12, 0.1], [-w + 0.12, h - 0.1], [w - 0.12, h - 0.1]]) {
		const strip = add(g, BOX, M.strip[kind], x, y, -(a0 + a1) / 2);
		strip.scale.set(0.1, 0.1, len);
	}
	return g;
}

// The dark end of a tunnel not (yet) taken.
export function buildCap(a, T) {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(T.half * 2, T.height), mats().cap);
	m.position.set(0, T.height / 2, -a);
	return m;
}

// A junction: a square room where tunnels meet, a steel grate floor and
// ceiling, a post at each corner, and a striped barrier with a red X on
// every side with no tunnel. open: { left, ahead, right } (the way in is
// always open: +z).
let barrierTex = null, grateTex = null;
export function buildJunction(open, T) {
	const M = mats();
	const g = new THREE.Group();
	const { half: w, height: h } = T;
	if (!grateTex) {
		grateTex = canvasTexture(128, 128, function (c, cw, ch) {
			c.fillStyle = '#2a2d34';
			c.fillRect(0, 0, cw, ch);
			c.fillStyle = '#121318';
			for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) c.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
		});
		grateTex.wrapS = grateTex.wrapT = THREE.RepeatWrapping;
		grateTex.repeat.set(4, 4);
		grateTex.userData.shared = true;
		barrierTex = canvasTexture(512, 400, function (c, cw, ch) {
			c.fillStyle = '#1e2026';
			c.fillRect(0, 0, cw, ch);
			c.fillStyle = '#f2b705';
			for (let x = -60; x < cw + 60; x += 60) {
				for (const y of [0, ch - 40]) {
					c.beginPath(); c.moveTo(x, y + 40); c.lineTo(x + 30, y + 40); c.lineTo(x + 70, y); c.lineTo(x + 40, y); c.fill();
				}
			}
			c.strokeStyle = '#ff3020';
			c.lineWidth = 40;
			c.lineCap = 'round';
			c.beginPath(); c.moveTo(cw / 2 - 90, ch / 2 - 90); c.lineTo(cw / 2 + 90, ch / 2 + 90);
			c.moveTo(cw / 2 + 90, ch / 2 - 90); c.lineTo(cw / 2 - 90, ch / 2 + 90); c.stroke();
		});
		barrierTex.userData.shared = true;
	}
	const grate = new THREE.MeshStandardMaterial({ map: grateTex, metalness: 0.7, roughness: 0.4 });
	const floor = add(g, new THREE.PlaneGeometry(w * 2, w * 2), grate, 0, 0, 0);
	floor.rotation.x = -Math.PI / 2;
	const ceil = add(g, new THREE.PlaneGeometry(w * 2, w * 2), grate, 0, h, 0);
	ceil.rotation.x = Math.PI / 2;
	for (const [x, z] of [[-w, -w], [w, -w], [-w, w], [w, w]]) {
		const post = add(g, BOX, M.dark, x, h / 2, z);
		post.scale.set(0.7, h, 0.7);
		const lamp = add(g, BOX, M.stripes, x, 0.4, z);
		lamp.scale.set(0.76, 0.8, 0.76);
	}
	const barrier = new THREE.MeshStandardMaterial({ map: barrierTex, emissiveMap: barrierTex, emissive: 0xff6040, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.3 });
	const sides = { left: [-w, 0, Math.PI / 2], ahead: [0, -w, 0], right: [w, 0, -Math.PI / 2] };
	for (const [k, [x, z, ry]] of Object.entries(sides)) {
		if (open[k]) continue;
		const b = add(g, new THREE.PlaneGeometry(w * 2, h), barrier, x, h / 2, z);
		b.rotation.y = ry;
	}
	return g;
}

/* ---------- the machines ---------- */

// (the cross-section's cells: B.u, the lanes' edges across, B.v, the levels'
// edges up: three by three)
const cell = (B, lane, level) => ({ x0: B.u[lane], x1: B.u[lane + 1], y0: B.v[level], y1: B.v[level + 1] });

// A laser grid: a frame round the tunnel, and in every blocked cell a curtain
// of red beams. userData: glow (a material, to flicker).
export function buildGrid(blocked, B) {
	const M = mats();
	const g = new THREE.Group();
	const w = B.u[3], h = B.v[3];
	for (const [x, y, sx, sy] of [[-w + 0.2, h / 2, 0.4, h], [w - 0.2, h / 2, 0.4, h], [0, h - 0.2, w * 2, 0.4], [0, 0.1, w * 2, 0.2]]) {
		const m = add(g, BOX, M.stripes, x, y, 0);
		m.scale.set(sx, sy, 0.35);
	}
	const beam = glowing(0xff2a20, 4);
	const glow = additive(0xff2010, 0.9, 0.35);
	for (const [lane, level] of blocked) {
		const c = cell(B, lane, level);
		const cw = c.x1 - c.x0 - 0.15, ch = c.y1 - c.y0 - 0.15;
		const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
		add(g, new THREE.PlaneGeometry(cw, ch), glow, cx, cy, 0);
		for (let k = 0; k < 4; k++) {
			const b = add(g, BOX, beam, cx, c.y0 + 0.1 + (ch - 0.05) * k / 3, 0);
			b.scale.set(cw, 0.05, 0.05);
		}
	}
	g.userData = { glow };
	return g;
}

// A crate: a steel-banded orange crate with the hazard mark.
let crateTex = null;
export function buildCrate(size = 2) {
	if (!crateTex) {
		crateTex = canvasTexture(128, 128, function (g, w, h) {
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
	}
	const g = new THREE.Group();
	add(g, new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6, metalness: 0.15 }), 0, size / 2, 0);
	return g;
}

// Crates riding the floor belt, one in every blocked cell (stacked for the
// middle level).
export function buildCrates(blocked, B) {
	const g = new THREE.Group();
	for (const [lane, level] of blocked) {
		const c = cell(B, lane, level);
		const size = Math.min(c.x1 - c.x0, c.y1 - c.y0) - 0.15;
		const crate = buildCrate(size);
		crate.position.set((c.x0 + c.x1) / 2, c.y0, (Math.random() - 0.5) * 0.3);
		crate.rotation.y = (Math.random() - 0.5) * 0.2;
		g.add(crate);
	}
	return g;
}

// A buzzsaw: a big toothed chrome disc standing up out of a striped slot in
// the floor, spinning, facing you. userData: disc (turn its rotation.z; its
// position.x slides it across), radius.
export function buildSaw(radius = 2, centre = 0.9) {
	const M = mats();
	const g = new THREE.Group();
	const disc = new THREE.Group();
	disc.position.y = centre;
	g.add(disc);
	add(disc, new THREE.BoxGeometry(radius * 1.6, 0.3, 1.2), M.stripes, 0, -centre + 0.15, 0);   // (the slot, sliding with it)
	const blade = add(disc, new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.07, 48), M.chrome);
	blade.rotation.x = Math.PI / 2;
	const teeth = 28;
	const tooth = new THREE.ConeGeometry(radius * 0.12, radius * 0.2, 4);
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
	g.userData = { disc, radius, centre };
	return g;
}

// Crushers: in each crushed lane, a heavy striped ram on a piston from the
// ceiling, slamming down to the floor, its lamp flashing before it drops,
// and stripes on the floor under it. userData: rams [{ lane, ram, piston,
// lamp (a material) }], top (the ram's bottom, up).
export function buildCrusher(lanes, B) {
	const M = mats();
	const g = new THREE.Group();
	const h = B.v[3];
	const rams = [];
	for (const lane of lanes) {
		const c = cell(B, lane, 0);
		const x = (c.x0 + c.x1) / 2, cw = c.x1 - c.x0 - 0.2;
		add(g, BOX, M.dark, x, h - 0.2, 0).scale.set(cw * 0.6, 0.4, 1.4);
		const mark = add(g, BOX, M.stripes, x, 0.03, 0);
		mark.scale.set(cw, 0.06, 1.6);
		const ram = new THREE.Group();
		ram.position.x = x;
		g.add(ram);
		add(ram, BOX, M.dark, 0, 0.5, 0).scale.set(cw, 0.7, 1.5);
		const band = add(ram, BOX, M.stripes, 0, 0.55, 0);
		band.scale.set(cw + 0.04, 0.3, 1.54);
		add(ram, BOX, M.steel, 0, 0.08, 0).scale.set(cw + 0.08, 0.16, 1.6);
		const piston = add(g, new THREE.CylinderGeometry(0.22, 0.22, 1, 16), M.chrome, x, 0, 0);
		const lampMat = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
		add(ram, new THREE.SphereGeometry(0.16, 12, 8), lampMat, 0, 0.62, 0.8);
		rams.push({ lane, ram, piston, lamp: lampMat });
	}
	g.userData = { rams, top: h - 1.1 };
	return g;
}

// A robot arm hanging from the ceiling, swinging from side to side across
// the tunnel, a three-fingered claw and a red eye at its end. userData:
// swing (turn its rotation.z), eye (a material), pivot (its height), reach
// (pivot to the claw's middle).
export function buildArm(B, reach = 3.3) {
	const M = mats();
	const g = new THREE.Group();
	const h = B.v[3];
	const pivot = h - 0.35;
	add(g, BOX, M.yellow, 0, h - 0.15, 0).scale.set(1.4, 0.3, 1.2);
	add(g, new THREE.CylinderGeometry(0.36, 0.36, 0.7, 20), M.dark, 0, pivot, 0).rotation.x = Math.PI / 2;
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
		const finger = new THREE.Group();
		finger.rotation.y = i / 3 * TAU;
		claw.add(finger);
		add(finger, new THREE.BoxGeometry(0.12, 0.6, 0.16), M.bright, 0.32, -0.12, 0).rotation.z = -0.45;
		add(finger, new THREE.ConeGeometry(0.08, 0.3, 8), M.bright, 0.38, -0.5, 0).rotation.z = Math.PI + 0.5;
	}
	const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.2) });
	add(claw, new THREE.SphereGeometry(0.12, 12, 8), eyeMat, 0, 0.3, 0.38);
	g.userData = { swing, eye: eyeMat, pivot, reach };
	return g;
}

// Fire jets: a row of burners in both walls at each burning level, their
// rings glowing hotter as they're about to fire, then a roaring sheet of
// flame right across the tunnel. userData: rows [{ level, flame (scale x
// 0..1), rings (a material) }].
export function buildJets(levels, B) {
	const M = mats();
	const g = new THREE.Group();
	const w = B.u[3];
	const rows = [];
	for (const level of levels) {
		const y = (B.v[level] + B.v[level + 1]) / 2;
		const ringMat = new THREE.MeshBasicMaterial({ color: 0x401008 });
		for (const sx of [-1, 1]) {
			const n = add(g, new THREE.CylinderGeometry(0.4, 0.5, 0.6, 18), M.steel, sx * (w - 0.3), y, 0);
			n.rotation.z = Math.PI / 2;
			const r = add(g, new THREE.TorusGeometry(0.34, 0.07, 8, 24), ringMat, sx * (w - 0.62), y, 0);
			r.rotation.y = Math.PI / 2;
			add(g, BOX, M.stripes, sx * (w - 0.1), y, 0).scale.set(0.2, 1.3, 1.3);
		}
		const flame = new THREE.Group();
		flame.position.y = y;
		g.add(flame);
		for (const [r, c, k, o] of [[0.75, 0xff4a10, 1.6, 0.7], [0.5, 0xff9a2a, 2.2, 0.8], [0.25, 0xfff0a0, 2.8, 1]]) {
			const geo = new THREE.CylinderGeometry(r, r, w * 2 - 1.2, 16, 1, true);
			geo.rotateZ(Math.PI / 2);
			add(flame, geo, additive(c, k, o));
		}
		flame.scale.x = 0.001;
		rows.push({ level, flame, rings: ringMat });
	}
	g.userData = { rows };
	return g;
}

/* ---------- rings ---------- */

const RING_GEO = new THREE.TorusGeometry(0.32, 0.08, 12, 32);
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
// a jet glowing under it, him standing in it, facing +Z. userData: robotnik
// (from buildRobotnik), jetMesh.
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
	const jet = add(pod, new THREE.ConeGeometry(0.35, 1.1, 18, 1, true), additive(0xa0c8ff, 2.2, 0.85), 0, -0.75, 0);
	jet.rotation.x = Math.PI;
	add(pod, new THREE.CylinderGeometry(0.32, 0.42, 0.3, 18), M.dark, 0, -0.36, 0);
	const robotnik = buildRobotnik();
	robotnik.root.position.y = -0.15;
	robotnik.root.rotation.y = Math.PI;   // (he's built facing -Z)
	g.add(robotnik.root);
	g.userData = { robotnik, jetMesh: jet };
	return g;
}
