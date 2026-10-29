/*
 * The coworkers: Quaternius's Mannequin (assets/shared/mannequin.glb, CC0,
 * the same rig the virtual gamebox's ghosts use), posed once per pose and
 * baked into plain meshes, so a room full of them costs no skinning. Their
 * clothes, skin and hair are painted on in the shader from where each vertex
 * sits on the mannequin at rest (its bind pose: T-pose, facing +z, 1.83 m),
 * and their faces are cartoon line drawings on the front of the head, picked
 * from a sheet of sixteen expressions drawn here on a canvas.
 *
 *   person(props)     a Group: { seed, pose, expr, head, h, glasses, outfit }
 *   drawFace(ctx, expr, x, y, size, opts)   one face on a 2D canvas
 *   EXPR, FAMILY      the expressions by name, and which go together
 *   peopleReady       resolves once the mannequin has loaded
 *
 * Poses: 'stand', 'sit' (hands at a keyboard), 'slump' (sat, hands in lap),
 * 'wave', 'reach', 'push', 'crouch'. `head` turns the head (radians, + to
 * the person's left), as far as right round. Until the mannequin loads, a
 * person is just its invisible hit boxes; the body arrives when it does.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { GLTFLoader } from '../../lib/three/addons/loaders/GLTFLoader.js';

const TALL = 1.83;            // the mannequin's height at rest, metres
export const SEAT = 0.505;    // the top of a desk chair's seat (models.js chair)

/* ---------- the faces ---------- */

// The expressions, as numbers into the face sheet.
export const EXPR = {
	smile: 0, grin: 1, smug: 2, bored: 3, sideEye: 4, worried: 5, surprised: 6, scared: 7,
	angry: 8, wink: 9, sad: 10, sleepy: 11, stare: 12, beam: 13, blank: 14, suspicious: 15,
	cyclops: 16, threeEyes: 17, hypnotised: 18, upsideDown: 19,
};
// Faces nobody should have: only ever a difference.
export const WEIRD = [EXPR.cyclops, EXPR.threeEyes, EXPR.hypnotised, EXPR.upsideDown];
// Families: a subtle change stays in the family, a bold one leaves it.
export const FAMILY = [
	[EXPR.smile, EXPR.grin, EXPR.wink, EXPR.smug],
	[EXPR.bored, EXPR.sleepy, EXPR.suspicious, EXPR.sideEye],
	[EXPR.worried, EXPR.sad, EXPR.scared, EXPR.angry],
	[EXPR.surprised, EXPR.stare, EXPR.beam, EXPR.blank],
];
// Fine for the top floors; the rest creep in lower down.
export const CALM = [EXPR.smile, EXPR.grin, EXPR.smug, EXPR.bored, EXPR.sideEye, EXPR.wink, EXPR.sleepy, EXPR.suspicious, EXPR.worried];
export const ODD = [EXPR.surprised, EXPR.scared, EXPR.angry, EXPR.sad, EXPR.stare, EXPR.beam, EXPR.blank];

// Each face in unit space: x -0.5..0.5 across, y 0..1 down. Eyes sit at
// y 0.42, 0.19 either side (the glasses in the shader assume so).
const E = (o) => Object.assign({ w: 0.075, h: 0.105, lid: 0, look: [0, 0], pupil: 0.032, shape: 'oval' }, o);
const BROW = (o) => Object.assign({ y: 0.25, w: 0.085, tilt: 0, bend: 0.025, t: 0.032 }, o);
const FACES = [
	// smile
	{ eyes: [E({}), E({})], brows: [BROW({}), BROW({})], mouth: { type: 'curve', w: 0.15, bend: 0.075, y: 0.72, dimples: true } },
	// grin: happy eyes, open mouth
	{ eyes: [E({ shape: 'happy' }), E({ shape: 'happy' })], brows: [BROW({ y: 0.22 }), BROW({ y: 0.22 })], mouth: { type: 'open', w: 0.16, top: 0.02, depth: 0.13, y: 0.68 } },
	// smug
	{ eyes: [E({ lid: 0.45, look: [0.5, 0] }), E({ lid: 0.45, look: [0.5, 0] })], brows: [BROW({ y: 0.27, tilt: -0.1 }), BROW({ y: 0.22, tilt: 0.15 })], mouth: { type: 'curve', w: 0.11, bend: 0.05, y: 0.72, x: 0.05, tilt: -0.25, dimples: true } },
	// bored
	{ eyes: [E({ lid: 0.55 }), E({ lid: 0.55 })], brows: [BROW({ y: 0.28, bend: 0.005 }), BROW({ y: 0.28, bend: 0.005 })], mouth: { type: 'curve', w: 0.08, bend: -0.004, y: 0.73 } },
	// side-eye
	{ eyes: [E({ look: [-0.75, -0.1], lid: 0.2 }), E({ look: [-0.75, -0.1], lid: 0.2 })], brows: [BROW({ y: 0.26, tilt: 0.12 }), BROW({ y: 0.25, bend: 0.01 })], mouth: { type: 'curve', w: 0.07, bend: -0.02, y: 0.73, x: -0.05 } },
	// worried
	{ eyes: [E({ look: [0, -0.3] }), E({ look: [0, -0.3] })], brows: [BROW({ y: 0.22, tilt: 0.35 }), BROW({ y: 0.22, tilt: 0.35 })], mouth: { type: 'wavy', w: 0.11, y: 0.74 } },
	// surprised
	{ eyes: [E({ w: 0.09, h: 0.13, pupil: 0.026 }), E({ w: 0.09, h: 0.13, pupil: 0.026 })], brows: [BROW({ y: 0.17, bend: 0.035 }), BROW({ y: 0.17, bend: 0.035 })], mouth: { type: 'o', w: 0.035, h: 0.05, y: 0.75 } },
	// scared
	{ eyes: [E({ w: 0.095, h: 0.135, pupil: 0.016 }), E({ w: 0.095, h: 0.135, pupil: 0.016 })], brows: [BROW({ y: 0.17, tilt: 0.4 }), BROW({ y: 0.17, tilt: 0.4 })], mouth: { type: 'open', w: 0.09, top: -0.03, depth: 0.08, y: 0.74 }, sweat: true },
	// angry
	{ eyes: [E({ lid: 0.3, look: [0, 0.2] }), E({ lid: 0.3, look: [0, 0.2] })], brows: [BROW({ y: 0.27, tilt: -0.55, t: 0.045, bend: -0.005 }), BROW({ y: 0.27, tilt: -0.55, t: 0.045, bend: -0.005 })], mouth: { type: 'curve', w: 0.1, bend: -0.05, y: 0.75 } },
	// wink
	{ eyes: [E({ shape: 'happy' }), E({ look: [0.2, 0] })], brows: [BROW({ y: 0.27, tilt: -0.1 }), BROW({ y: 0.21 })], mouth: { type: 'curve', w: 0.15, bend: 0.08, y: 0.71, x: 0.02, dimples: true, tongue: true } },
	// sad
	{ eyes: [E({ look: [0, 0.6] }), E({ look: [0, 0.6] })], brows: [BROW({ y: 0.24, tilt: 0.4 }), BROW({ y: 0.24, tilt: 0.4 })], mouth: { type: 'curve', w: 0.1, bend: -0.06, y: 0.76 }, tear: true },
	// sleepy
	{ eyes: [E({ shape: 'shut' }), E({ shape: 'shut' })], brows: [BROW({ y: 0.29, bend: 0.01 }), BROW({ y: 0.29, bend: 0.01 })], mouth: { type: 'o', w: 0.025, h: 0.022, y: 0.75 } },
	// stare: wide eyes, pinprick pupils, a long thin smile
	{ eyes: [E({ w: 0.1, h: 0.13, pupil: 0.012 }), E({ w: 0.1, h: 0.13, pupil: 0.012 })], brows: null, mouth: { type: 'curve', w: 0.24, bend: 0.03, y: 0.73 } },
	// beam: the smile right across, every tooth
	{ eyes: [E({ shape: 'happy', w: 0.08 }), E({ shape: 'happy', w: 0.08 })], brows: [BROW({ y: 0.2 }), BROW({ y: 0.2 })], mouth: { type: 'teeth', w: 0.3, top: 0.03, depth: 0.16, y: 0.64 } },
	// blank: two dots
	{ eyes: [E({ shape: 'dot', pupil: 0.03 }), E({ shape: 'dot', pupil: 0.03 })], brows: null, mouth: null },
	// suspicious
	{ eyes: [E({ lid: 0.5, look: [0.6, 0] }), E({ lid: 0.3, look: [0.6, 0] })], brows: [BROW({ y: 0.29, tilt: -0.25 }), BROW({ y: 0.18, bend: 0.04 })], mouth: { type: 'curve', w: 0.07, bend: 0, y: 0.74, x: 0.06, tilt: 0.2 } },
	// cyclops: one big eye in the middle
	{ eyes: [E({ x: 0, y: 0.4, w: 0.14, h: 0.17, pupil: 0.05 })], brows: [BROW({ x: 0, y: 0.17, w: 0.13, bend: 0.04, t: 0.04 })], mouth: { type: 'curve', w: 0.15, bend: 0.075, y: 0.72, dimples: true } },
	// three eyes
	{ eyes: [E({ x: -0.24, w: 0.06, h: 0.085 }), E({ x: 0, y: 0.36, w: 0.06, h: 0.085 }), E({ x: 0.24, w: 0.06, h: 0.085 })], brows: null, mouth: { type: 'curve', w: 0.13, bend: 0.06, y: 0.72, dimples: true } },
	// hypnotised: spirals
	{ eyes: [E({ shape: 'spiral', w: 0.09 }), E({ shape: 'spiral', w: 0.09 })], brows: [BROW({ y: 0.22 }), BROW({ y: 0.22 })], mouth: { type: 'curve', w: 0.16, bend: 0.06, y: 0.72 } },
	// upside down: a smile, the wrong way up
	{ flip: 0 },
];

/*
 * One face, centred on (x, y) (the eyes' line a little above), `size` wide.
 * opts.part: 'white' (just the whites of the eyes and teeth), 'ink' (just the
 * lines), or both (default). opts.ink, opts.white: the colours.
 */
export function drawFace(ctx, expr, x, y, size, opts = {}) {
	let f = FACES[expr] || FACES[0];
	const ink = opts.ink || '#111';
	const white = opts.white || '#fff';
	const doWhite = opts.part !== 'ink';
	const doInk = opts.part !== 'white';
	const lw = 0.022;
	ctx.save();
	ctx.translate(x, y - 0.5 * size);
	ctx.scale(size, size);
	if (f.flip !== undefined) {
		ctx.translate(0, 0.98);
		ctx.rotate(Math.PI);
		f = FACES[f.flip];
	}
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	f.eyes.forEach(function (e, i) {
		const s = i ? 1 : -1;
		const cx = e.x ?? s * 0.19;
		const cy = e.y ?? 0.42;
		if (e.shape === 'spiral') {
			if (!doInk) return;
			ctx.beginPath();
			for (let k = 0; k <= 60; k++) {
				const a = k / 60 * Math.PI * 6 * (s > 0 ? 1 : -1);
				const rr = e.w * k / 60;
				const xx = cx + Math.cos(a) * rr, yy = cy + Math.sin(a) * rr * 1.2;
				k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
			}
			ctx.lineWidth = lw * 0.9; ctx.strokeStyle = ink; ctx.stroke();
			return;
		}
		if (e.shape === 'happy' || e.shape === 'shut') {
			if (!doInk) return;
			// an arc: up like ^ (happy) or down like u (shut)
			const up = e.shape === 'happy' ? -1 : 1;
			ctx.beginPath();
			ctx.moveTo(cx - e.w, cy);
			ctx.quadraticCurveTo(cx, cy + up * e.h * 1.1, cx + e.w, cy);
			ctx.lineWidth = lw * 1.2; ctx.strokeStyle = ink; ctx.stroke();
			if (e.shape === 'shut') {
				ctx.beginPath(); ctx.moveTo(cx - e.w * 0.9, cy + 0.01); ctx.lineTo(cx - e.w * 1.25, cy - 0.015);
				ctx.lineWidth = lw * 0.8; ctx.stroke();
			}
			return;
		}
		const px = cx + e.look[0] * e.w * 0.5;
		const py = cy + e.look[1] * e.h * 0.45 + (e.lid > 0 ? e.lid * e.h * 0.5 : 0);
		if (e.shape === 'dot') {
			if (doInk) { ctx.beginPath(); ctx.arc(px, py, e.pupil, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); }
			return;
		}
		const lidY = cy - e.h + 2 * e.h * e.lid;
		ctx.save();
		ctx.beginPath();
		ctx.rect(cx - 1, lidY, 2, 2);
		ctx.clip();
		ctx.beginPath();
		ctx.ellipse(cx, cy, e.w, e.h, 0, 0, Math.PI * 2);
		if (doWhite) { ctx.fillStyle = white; ctx.fill(); }
		if (doInk) {
			ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.stroke();
			ctx.save();
			ctx.clip();
			ctx.beginPath(); ctx.arc(px, py, e.pupil, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
			ctx.restore();
		}
		ctx.restore();
		if (doInk && e.lid > 0) {
			// the lid: a line across where it cuts the eye, a touch heavier
			const dy = (lidY - cy) / e.h;
			const half = e.w * Math.sqrt(Math.max(0, 1 - dy * dy));
			ctx.beginPath();
			ctx.moveTo(cx - half - 0.012, lidY + 0.004);
			ctx.quadraticCurveTo(cx, lidY - 0.012, cx + half + 0.012, lidY + 0.004);
			ctx.lineWidth = lw * 1.3; ctx.strokeStyle = ink; ctx.stroke();
		}
	});

	if (doInk && f.brows) {
		f.brows.forEach(function (b, i) {
			const s = i ? 1 : -1;
			// a tapered stroke, thickest in the middle; tilt raises the inner end
			const cx = b.x ?? s * 0.19;
			const pts = [];
			for (let k = 0; k <= 12; k++) {
				const u = k / 12;
				const xx = cx + (u * 2 - 1) * b.w;
				const inner = s < 0 ? u : 1 - u;          // 1 at the end nearest the nose
				const yy = b.y - 4 * b.bend * u * (1 - u) - b.tilt * b.w * (inner - 0.5);
				pts.push([xx, yy, Math.sin(Math.PI * (0.15 + 0.7 * u)) * b.t * 0.5]);
			}
			ctx.beginPath();
			pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1] - p[2]) : ctx.moveTo(p[0], p[1] - p[2])));
			for (let k = pts.length - 1; k >= 0; k--) ctx.lineTo(pts[k][0], pts[k][1] + pts[k][2]);
			ctx.closePath();
			ctx.fillStyle = ink; ctx.fill();
		});
	}

	const m = f.mouth;
	if (m) {
		const mx = m.x || 0;
		ctx.save();
		ctx.translate(mx, m.y);
		ctx.rotate(m.tilt || 0);
		ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = lw;
		if (m.type === 'curve' && doInk) {
			ctx.beginPath();
			ctx.moveTo(-m.w, 0);
			ctx.quadraticCurveTo(0, 2 * m.bend, m.w, 0);
			ctx.stroke();
			if (m.dimples) for (const s of [-1, 1]) {
				ctx.beginPath(); ctx.moveTo(s * (m.w - 0.012), -0.022); ctx.quadraticCurveTo(s * (m.w + 0.018), -0.004, s * (m.w + 0.004), 0.018);
				ctx.lineWidth = lw * 0.8; ctx.stroke();
			}
			if (m.tongue) {
				ctx.beginPath(); ctx.moveTo(0.01, m.bend * 0.95); ctx.quadraticCurveTo(0.045, m.bend + 0.06, 0.07, m.bend * 0.8);
				ctx.lineWidth = lw * 0.8; ctx.stroke();
			}
		} else if (m.type === 'wavy' && doInk) {
			ctx.beginPath();
			for (let k = 0; k <= 20; k++) {
				const u = k / 20;
				const xx = (u * 2 - 1) * m.w;
				const yy = Math.sin(u * Math.PI * 3) * 0.012;
				k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
			}
			ctx.stroke();
		} else if (m.type === 'o') {
			ctx.beginPath(); ctx.ellipse(0, 0, m.w, m.h, 0, 0, Math.PI * 2);
			if (doInk) ctx.fill();
		} else if (m.type === 'open' || m.type === 'teeth') {
			// a D: the top edge, then a deeper curve below
			ctx.beginPath();
			ctx.moveTo(-m.w, 0);
			ctx.quadraticCurveTo(0, 2 * m.top, m.w, 0);
			ctx.quadraticCurveTo(m.w * 0.8, m.depth * 1.6, 0, m.depth * 1.05);
			ctx.quadraticCurveTo(-m.w * 0.8, m.depth * 1.6, -m.w, 0);
			ctx.closePath();
			if (m.type === 'open') { if (doInk) ctx.fill(); }
			else {
				if (doWhite) { ctx.fillStyle = white; ctx.fill(); }
				if (doInk) {
					ctx.stroke();
					ctx.save(); ctx.clip();
					ctx.lineWidth = lw * 0.7;
					ctx.beginPath(); ctx.moveTo(-m.w, m.depth * 0.45); ctx.quadraticCurveTo(0, m.depth * 0.75, m.w, m.depth * 0.45); ctx.stroke();
					for (let k = -5; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(k * m.w / 6, -0.05); ctx.lineTo(k * m.w / 6 * 1.05, m.depth * 1.2); ctx.stroke(); }
					ctx.restore();
				}
			}
		}
		ctx.restore();
	}

	if (doInk && f.sweat) {
		ctx.beginPath(); ctx.moveTo(0.36, 0.2); ctx.quadraticCurveTo(0.41, 0.3, 0.37, 0.32); ctx.quadraticCurveTo(0.32, 0.3, 0.36, 0.2);
		ctx.lineWidth = lw * 0.8; ctx.strokeStyle = ink; ctx.stroke();
	}
	if (doInk && f.tear) {
		ctx.beginPath(); ctx.moveTo(-0.2, 0.55); ctx.quadraticCurveTo(-0.17, 0.63, -0.2, 0.65); ctx.quadraticCurveTo(-0.23, 0.63, -0.2, 0.55);
		ctx.lineWidth = lw * 0.8; ctx.strokeStyle = ink; ctx.stroke();
	}
	ctx.restore();
}

// The sheet: 4 x 5 faces, the ink in red and the whites in green.
const CELL = 256;
const ROWS = 5;
let faceSheet = null;
function sheet() {
	if (faceSheet) return faceSheet;
	const N = CELL * 4, NH = CELL * ROWS;
	const layer = (part) => {
		const c = document.createElement('canvas');
		c.width = N; c.height = NH;
		const x = c.getContext('2d');
		for (let i = 0; i < FACES.length; i++) drawFace(x, i, (i % 4 + 0.5) * CELL, (Math.floor(i / 4) + 0.5) * CELL, CELL, { part, ink: '#fff', white: '#fff' });
		return x.getImageData(0, 0, N, NH).data;
	};
	const ink = layer('ink');
	const white = layer('white');
	const out = document.createElement('canvas');
	out.width = N; out.height = NH;
	const ox = out.getContext('2d');
	const img = ox.createImageData(N, NH);
	for (let i = 0; i < img.data.length; i += 4) {
		img.data[i] = ink[i + 3];
		img.data[i + 1] = white[i + 3];
		img.data[i + 2] = 0;
		img.data[i + 3] = 255;
	}
	ox.putImageData(img, 0, 0);
	faceSheet = new THREE.CanvasTexture(out);
	faceSheet.colorSpace = THREE.NoColorSpace;
	faceSheet.anisotropy = 4;
	return faceSheet;
}

/* ---------- the mannequin ---------- */

let kit = null;               // { scene, clips, meshes, dominant, rest }
const waiting = [];
async function load() {
	const loader = new GLTFLoader();
	const url = new URL('../../assets/shared/mannequin.glb', import.meta.url).href;
	try { return await loader.loadAsync(url); } catch (e) {
		// (where a host won't serve .glb: the same bytes from a module)
		const m = await import('../../assets/shared/mannequin.glb.js');
		const bin = Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0));
		return await loader.parseAsync(bin.buffer, '');
	}
}
export const peopleReady = load().then(function (gltf) {
	const scene = gltf.scene;
	const meshes = [];
	scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
	const clips = {};
	for (const c of gltf.animations) clips[c.name] = c;
	// each vertex's main bone, for knowing which part of the body it's on
	const dominant = meshes.map(function (m) {
		const ji = m.geometry.attributes.skinIndex;
		const jw = m.geometry.attributes.skinWeight;
		const out = new Uint8Array(ji.count);
		for (let i = 0; i < ji.count; i++) {
			let best = 0, bw = -1;
			for (let k = 0; k < 4; k++) { const w = jw.getComponent(i, k); if (w > bw) { bw = w; best = ji.getComponent(i, k); } }
			out[i] = best;
		}
		return out;
	});
	const bones = [];
	scene.traverse((o) => { if (o.isBone) bones.push(o); });
	const rest = bones.map((b) => ({ b, q: b.quaternion.clone(), p: b.position.clone(), s: b.scale.clone() }));
	kit = { scene, clips, meshes, dominant, rest, mixer: new THREE.AnimationMixer(scene) };
	for (const fn of waiting.splice(0)) fn();
}).catch((e) => console.warn('No mannequin: the coworkers stay invisible', e));

const bone = (name) => kit.scene.getObjectByName(name) || kit.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
// Turn a bone about an axis in model space (as if grabbed and swung).
function swing(name, axis, angle) {
	const b = bone(name);
	if (!b) return;
	b.parent.updateMatrixWorld(true);
	b.parent.getWorldQuaternion(q1);
	q2.setFromAxisAngle(axis, angle);
	b.quaternion.premultiply(q1.clone().invert().multiply(q2).multiply(q1));
	b.updateMatrixWorld(true);
}

// The poses: a clip and a moment in it, then bones swung by hand.
const POSES = {
	stand: { clip: 'Idle_Loop', t: 0 },
	wave: { clip: 'Idle_Loop', t: 0, fix() {
		swing('DEF-upper_arm.R', Z, -2.5);
		swing('DEF-forearm.R', Z, -0.55);
	} },
	reach: { clip: 'Interact', t: 0.75 },
	push: { clip: 'Push_Loop', t: 0.4 },
	crouch: { clip: 'Crouch_Idle_Loop', t: 0 },
	sit: { clip: 'Idle_Loop', t: 0, sit: true, fix() {
		for (const s of ['L', 'R']) { swing(`DEF-upper_arm.${s}`, X, -0.75); swing(`DEF-forearm.${s}`, X, -0.75); }
	} },
	slump: { clip: 'Idle_Loop', t: 0, sit: true, fix() {
		swing('DEF-spine.003', X, 0.12);
		for (const s of ['L', 'R']) { swing(`DEF-upper_arm.${s}`, X, -0.3); swing(`DEF-forearm.${s}`, X, -1.0); }
	} },
};

const baked = new Map();      // pose|head -> { parts: [geometry], seat, head: Vector3 }
function bake(pose, head) {
	const key = pose + '|' + head;
	if (baked.has(key)) return baked.get(key);
	const P = POSES[pose] || POSES.stand;
	// back to rest, then the clip's moment
	for (const r of kit.rest) { r.b.quaternion.copy(r.q); r.b.position.copy(r.p); r.b.scale.copy(r.s); }
	kit.mixer.stopAllAction();
	const clip = kit.clips[P.clip];
	if (clip) { const a = kit.mixer.clipAction(clip); a.reset().play(); kit.mixer.setTime(Math.min(P.t, clip.duration)); a.stop(); }
	kit.scene.updateMatrixWorld(true);
	if (P.sit) {
		for (const s of ['L', 'R']) { swing(`DEF-thigh.${s}`, X, -Math.PI / 2 + 0.05); swing(`DEF-shin.${s}`, X, Math.PI / 2 - 0.05); }
	}
	if (P.fix) P.fix();
	if (head) { swing('DEF-neck', Y, head * 0.3); swing('DEF-head', Y, head * 0.7); }
	kit.scene.updateMatrixWorld(true);

	let seat = Infinity;
	const parts = kit.meshes.map(function (m, mi) {
		const g = m.geometry;
		const sk = m.skeleton;
		const mats = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
		const thighs = sk.bones.map((b) => /thigh/.test(b.name));
		const pos = g.attributes.position, nrm = g.attributes.normal, ji = g.attributes.skinIndex, jw = g.attributes.skinWeight;
		const outP = new Float32Array(pos.count * 3), outN = new Float32Array(pos.count * 3);
		const v = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3(), accP = new THREE.Vector3(), accN = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			n.fromBufferAttribute(nrm, i);
			accP.set(0, 0, 0); accN.set(0, 0, 0);
			for (let k = 0; k < 4; k++) {
				const w = jw.getComponent(i, k);
				if (!w) continue;
				const M = mats[ji.getComponent(i, k)];
				accP.addScaledVector(t.copy(v).applyMatrix4(M), w);
				accN.addScaledVector(t.copy(n).transformDirection(M), w);
			}
			accN.normalize();
			outP[i * 3] = accP.x; outP[i * 3 + 1] = accP.y; outP[i * 3 + 2] = accP.z;
			outN[i * 3] = accN.x; outN[i * 3 + 1] = accN.y; outN[i * 3 + 2] = accN.z;
			if (P.sit && mi === 0 && thighs[kit.dominant[mi][i]]) seat = Math.min(seat, accP.y);
		}
		const out = new THREE.BufferGeometry();
		out.setAttribute('position', new THREE.BufferAttribute(outP, 3));
		out.setAttribute('normal', new THREE.BufferAttribute(outN, 3));
		out.setAttribute('bind', pos);
		if (g.index) out.setIndex(g.index);
		out.computeBoundingBox();
		out.computeBoundingSphere();
		return out;
	});
	const hb = bone('DEF-head');
	const headAt = hb.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
	const box = new THREE.Box3();
	for (const p of parts) box.union(p.boundingBox);
	const out = { parts, seat: P.sit ? seat : 0, head: headAt, box };
	baked.set(key, out);
	return out;
}

/* ---------- the clothes, painted on ---------- */

const SHADER_V = {
	head: /* glsl */`
		attribute vec3 bind;
		varying vec3 vBind;`,
	body: /* glsl */`
		vBind = bind;`,
};
const SHADER_F = /* glsl */`
	varying vec3 vBind;
	uniform vec3 uShirt, uLegs, uSkin, uHair, uShoes, uTie, uJacket, uInk;
	uniform vec4 uStyle;      // hair style, sleeve end (|x|), tie, jacket
	uniform vec4 uFace;       // sheet column, row, glasses, skirt
	uniform vec4 uOdd;        // face on the back of the head, no head (a balloon instead)
	uniform sampler2D uSheet;

	vec3 personColour() {
		vec3 p = vBind;
		float ax = abs(p.x);
		if (p.y > 1.49 && ax < 0.13) {
			if (uOdd.y > 0.5 && p.y > 1.53) discard;
			if (uOdd.x > 0.5) p.xz = -p.xz;              // the whole head the wrong way round
			vec3 c = uSkin;
			// hair: 1 short, 2 long, 3 fringe, 4 thinning
			float st = uStyle.x;
			bool hair = false;
			if (st > 0.5 && st < 1.5) hair = p.y > 1.775 || (p.z < -0.03 && p.y > 1.63) || (p.z < 0.035 && ax > 0.07 && p.y > 1.69);
			else if (st < 2.5 && st > 0.5) hair = p.y > 1.77 || (p.z < -0.015 && p.y > 1.5) || (p.z < 0.045 && ax > 0.066 && p.y > 1.57);
			else if (st < 3.5 && st > 0.5) hair = p.y > 1.745 || (p.z < -0.03 && p.y > 1.62) || (p.z < 0.04 && ax > 0.068 && p.y > 1.66);
			else if (st > 3.5) hair = (p.z < -0.03 && p.y > 1.6 && p.y < 1.74) || (ax > 0.072 && p.y > 1.64 && p.y < 1.74 && p.z < 0.03);
			if (hair) return uHair;
			if (p.z > 0.0 && p.y > 1.56) {
				// the face, projected straight on from the front
				vec2 uv = vec2(p.x / 0.18 + 0.5, (p.y - 1.58) / 0.22);
				float edge = smoothstep(0.015, 0.05, p.z);
				if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
					vec4 s = texture2D(uSheet, (uFace.xy + uv) / vec2(4.0, 5.0));
					c = mix(c, vec3(1.0), s.g * edge);
					// glasses: two rings round the eyes and a bridge
					if (uFace.z > 0.5) {
						vec2 e = vec2(abs(uv.x - 0.5), uv.y);
						float d = length((e - vec2(0.19, 0.58)) * vec2(1.0, 0.85));
						float g = 1.0 - smoothstep(0.012, 0.024, abs(d - 0.125));
						if (e.x < 0.07 && abs(uv.y - 0.6) < 0.015) g = 1.0;
						c = mix(c, uInk, g * edge);
					}
					c = mix(c, uInk, s.r * edge);
				}
			}
			return c;
		}
		if (p.y < 0.11) return uShoes;
		if (ax > 0.735) return uSkin;
		vec3 top = uStyle.w > 0.5 ? uJacket : uShirt;
		if (ax > 0.19 && p.y > 1.3) return ax < uStyle.y ? top : uSkin;
		if (p.y < 0.985) {
			if (uFace.w > 0.5 && p.y < 0.52) return uSkin;      // a skirt to the knee
			return uLegs;
		}
		if (p.y < 1.0) return uShoes;                            // a belt, in the shoes' leather
		vec3 c = uShirt;
		if (uStyle.w > 0.5 && !(p.z > 0.0 && ax < 0.045 + max(0.0, p.y - 1.05) * 0.18)) c = uJacket;
		if (uStyle.z > 0.5 && p.z > 0.0 && p.y > 1.07 && p.y < 1.47 && ax < 0.016 + 0.012 * smoothstep(1.4, 1.12, p.y)) c = uTie;
		return c;
	}`;

const col = (c) => new THREE.Color(c);
function personMaterial(p) {
	const o = p.outfit || {};
	const u = {
		uShirt: { value: col(o.shirt ?? 0xe8e8e8) },
		uLegs: { value: col(o.legs ?? 0x33363d) },
		uSkin: { value: col(o.skin ?? 0xe0b090) },
		uHair: { value: col(o.hair ?? 0x2a1f18) },
		uShoes: { value: col(o.shoes ?? 0x1c1a18) },
		uTie: { value: col(o.tie ?? 0x9a2a2a) },
		uJacket: { value: col(o.jacket ?? 0x2c3038) },
		uInk: { value: col(0x141414) },
		uStyle: { value: new THREE.Vector4(o.style ?? 1, o.sleeve ?? 0.74, o.tie != null ? 1 : 0, o.jacket != null ? 1 : 0) },
		uFace: { value: new THREE.Vector4((p.expr || 0) % 4, 4 - Math.floor((p.expr || 0) / 4), p.glasses ? 1 : 0, o.skirt ? 1 : 0) },
		uOdd: { value: new THREE.Vector4(p.backwards ? 1 : 0, p.balloon != null ? 1 : 0, 0, 0) },
		uSheet: { value: sheet() },
	};
	const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
	m.onBeforeCompile = function (sh) {
		Object.assign(sh.uniforms, u);
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>' + SHADER_V.head)
			.replace('#include <begin_vertex>', '#include <begin_vertex>' + SHADER_V.body);
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>' + SHADER_F)
			.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * personColour(), opacity );');
	};
	m.customProgramCacheKey = () => 'coworker';
	return m;
}

/* ---------- a person ---------- */

const shadowMat = (() => {
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const x = c.getContext('2d');
	const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
	g.addColorStop(0, 'rgba(0,0,0,0.55)');
	g.addColorStop(1, 'rgba(0,0,0,0)');
	x.fillStyle = g;
	x.fillRect(0, 0, 64, 64);
	return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
})();
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const unitBox = new THREE.BoxGeometry(1, 1, 1);

const SIZES = {   // the hit box before the body loads: [w, h, d, y, z]
	stand: [0.55, 1, 0.35, 0.5, 0], wave: [0.6, 1.05, 0.35, 0.52, 0], reach: [0.55, 1, 0.55, 0.5, 0.1], push: [0.55, 0.95, 0.7, 0.48, 0.15],
	crouch: [0.6, 0.6, 0.6, 0.3, 0], sit: [0.55, 0.75, 0.75, 0.37, 0.12], slump: [0.55, 0.72, 0.75, 0.36, 0.12],
};

export function person(p) {
	const g = new THREE.Group();
	const pose = POSES[p.pose] ? p.pose : 'stand';
	const h = p.h || 1.75;
	const s = h / TALL;
	const sitting = !!POSES[pose].sit;
	// the hit boxes, there from the start: the body, and the head (for rings round faces)
	const [w, bh, d, y, z] = SIZES[pose];
	const body = new THREE.Mesh(unitBox, hitMat);
	body.scale.set(w, sitting ? bh * 1.75 : bh * h, d);
	body.position.set(0, sitting ? SEAT * 0.5 + 0.35 : y * h, z);
	body.userData.noOcclude = true;
	g.add(body);
	const headBox = new THREE.Mesh(unitBox, hitMat);
	headBox.name = 'headBox';
	headBox.scale.setScalar(0.3);
	headBox.position.set(0, sitting ? 1.3 : h - 0.12, 0);
	headBox.userData.noOcclude = true;
	g.add(headBox);
	const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), shadowMat);
	shadow.rotation.x = -Math.PI / 2;
	shadow.position.y = 0.012;
	shadow.userData.noOcclude = true;
	g.add(shadow);

	const dress = function () {
		const head = Math.round((p.head || 0) / (Math.PI / 12)) * (Math.PI / 12);
		const b = bake(pose, head);
		const mat = personMaterial(p);
		const fig = new THREE.Group();
		fig.scale.setScalar(s);
		if (sitting) fig.position.y = SEAT - b.seat * s + 0.01;
		for (const part of b.parts) fig.add(new THREE.Mesh(part, mat));
		if (p.balloon != null) {
			// a balloon where the head was, on its knotted neck
			const bm = new THREE.MeshLambertMaterial({ color: p.balloon, emissive: p.balloon, emissiveIntensity: 0.25 });
			const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), bm);
			ball.scale.set(1, 1.18, 1);
			ball.position.copy(b.head).add(new THREE.Vector3(0, 0.04, 0));
			const knot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 8), bm);
			knot.position.copy(b.head).add(new THREE.Vector3(0, -0.15, 0));
			fig.add(ball, knot);
		}
		g.add(fig);
		headBox.position.copy(b.head).multiplyScalar(s).add(fig.position);
		const bb = b.box.clone();
		bb.min.multiplyScalar(s); bb.max.multiplyScalar(s);
		bb.translate(fig.position);
		bb.getSize(body.scale);
		bb.getCenter(body.position);
		g.updateMatrixWorld(true);
	};
	if (kit) dress(); else waiting.push(dress);
	return g;
}

/* ---------- making up a person ---------- */

const SKIN = [0xf1c9a5, 0xe0ac85, 0xc68c62, 0x9c6a45, 0x6e4a30, 0x4a3022];
const HAIR = [0x1d1814, 0x3a2a1e, 0x5c3d24, 0x8a5a2e, 0xc9a25a, 0x9a9a98, 0xdedcd6, 0x7a2e1e];
export const SHIRTS = [0xf2f2ee, 0xbcd4ec, 0xf0c4cc, 0xc8e6cf, 0xd2c8ea, 0xb8b8b8, 0x3a4a7a, 0xd8b64a, 0xe88a5a];
const LEGS = [0x2c2f36, 0x23304a, 0xa89a78, 0x1b1b1d, 0x5a5a5e, 0x4a3a2e];
const TIES = [0xa82a2a, 0x23305a, 0x2f6a3a, 0x6a1e3a, 0xd0a020];
const JACKETS = [0x30343c, 0x24304e, 0x5a4232, 0x4f5636, 0x2f7a78, 0x7a3a4a];

// A coworker from a seeded random generator r().
export function makePerson(r, opts = {}) {
	const pick = (a) => a[Math.floor(r() * a.length)];
	const tie = r() < 0.35;
	const jacket = r() < 0.4;
	const skirt = !tie && r() < 0.22;
	const style = pick([1, 1, 2, 2, 3, 4, 0]);
	return {
		seed: Math.floor(r() * 1e6),
		pose: opts.pose || 'stand',
		expr: opts.expr ?? pick(opts.faces || CALM),
		head: 0,
		h: 1.62 + r() * 0.24,
		glasses: r() < 0.3,
		outfit: {
			shirt: pick(SHIRTS), legs: pick(LEGS), skin: pick(SKIN), hair: pick(HAIR), shoes: pick([0x1c1a18, 0x3a2418, 0x2a2a30]),
			tie: tie ? pick(TIES) : null, jacket: jacket ? pick(JACKETS) : null,
			style, sleeve: jacket || r() < 0.6 ? 0.74 : 0.36, skirt,
		},
	};
}

// A face that's clearly different (bold) or only just (subtle).
export function otherFace(expr, subtle, r) {
	const fam = FAMILY.find((f) => f.includes(expr)) || FAMILY[0];
	const pool = subtle ? fam.filter((e) => e !== expr) : FAMILY.filter((f) => f !== fam).flat();
	return pool[Math.floor(r() * pool.length)];
}
