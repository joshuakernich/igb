/*
 * The guests: Quaternius's Mannequin (assets/shared/mannequin.glb, CC0,
 * the same rig the virtual gamebox's ghosts use), one each, alive: a clip
 * under them (standing about, walking) and bones swung by hand on top for
 * what they're doing: talking, drinking, eating, shaking hands, dancing,
 * panicking, lying very still. Everything they do is a function of the
 * scene's time, so a scene loops exactly. Their clothes, skin and hair are
 * painted on in the shader from where each vertex sits on the mannequin at
 * rest (T-pose, facing +z, 1.83 m), and their faces are cartoon line
 * drawings on the front of the head, picked from a sheet of expressions
 * drawn here on a canvas, with a mouth that opens while they talk.
 *
 *   person(props)     a Group, with userData.actor.tick(T, dt, talking)
 *   drawFace(ctx, expr, x, y, size, opts)   one face on a 2D canvas
 *   EXPR, FAMILY      the expressions by name, and which go together
 *   flame(size)       a flickering flame
 *   peopleReady       resolves once the mannequin has loaded
 *
 * Until the mannequin loads, a person is just its invisible hit boxes; the
 * body arrives when it does.
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
	dead: 20, drunk: 21, sing: 22, yell: 23,
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
	// dead: crosses for eyes, the tongue out
	{ eyes: [E({ shape: 'cross' }), E({ shape: 'cross' })], brows: null, mouth: { type: 'curve', w: 0.1, bend: -0.02, y: 0.74, tongue: true } },
	// drunk: heavy lids, a lopsided grin, flushed
	{ eyes: [E({ lid: 0.6, look: [0.3, 0.4] }), E({ lid: 0.45, look: [-0.2, 0.3] })], brows: [BROW({ y: 0.25, tilt: 0.2 }), BROW({ y: 0.21, tilt: -0.1 })], mouth: { type: 'curve', w: 0.13, bend: 0.06, y: 0.73, x: 0.03, tilt: 0.15, dimples: true }, blush: true },
	// singing: eyes shut happy, mouth an O
	{ eyes: [E({ shape: 'happy' }), E({ shape: 'happy' })], brows: [BROW({ y: 0.2 }), BROW({ y: 0.2 })], mouth: { type: 'o', w: 0.05, h: 0.065, y: 0.73 } },
	// yelling
	{ eyes: [E({ w: 0.09, h: 0.12, pupil: 0.018 }), E({ w: 0.09, h: 0.12, pupil: 0.018 })], brows: [BROW({ y: 0.2, tilt: 0.45 }), BROW({ y: 0.2, tilt: 0.45 })], mouth: { type: 'open', w: 0.12, top: -0.02, depth: 0.15, y: 0.69 }, sweat: true },
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
		if (e.shape === 'cross') {
			if (!doInk) return;
			ctx.beginPath();
			ctx.moveTo(cx - e.w, cy - e.w); ctx.lineTo(cx + e.w, cy + e.w);
			ctx.moveTo(cx + e.w, cy - e.w); ctx.lineTo(cx - e.w, cy + e.w);
			ctx.lineWidth = lw * 1.3; ctx.strokeStyle = ink; ctx.stroke();
			return;
		}
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
	if (doInk && f.blush) {
		ctx.lineWidth = lw * 0.6; ctx.strokeStyle = ink;
		for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
			ctx.beginPath(); ctx.moveTo(s * 0.25 + k * 0.025 - 0.02, 0.6); ctx.lineTo(s * 0.25 + k * 0.025 - 0.035, 0.635); ctx.stroke();
		}
	}
	if (doInk && f.tear) {
		ctx.beginPath(); ctx.moveTo(-0.2, 0.55); ctx.quadraticCurveTo(-0.17, 0.63, -0.2, 0.65); ctx.quadraticCurveTo(-0.23, 0.63, -0.2, 0.55);
		ctx.lineWidth = lw * 0.8; ctx.strokeStyle = ink; ctx.stroke();
	}
	ctx.restore();
}

// The sheet: 4 x 5 faces, the ink in red and the whites in green.
const CELL = 256;
const ROWS = 6;
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
	uniform vec4 uOdd;        // face on the back of the head, no head (a balloon instead), the mouth open (talking)
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
					vec4 s = texture2D(uSheet, (uFace.xy + uv) / vec2(4.0, 6.0));
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
					// talking: the mouth opening and shutting over whatever face it is
					if (uOdd.z > 0.0) {
						float m = length((uv - vec2(0.5, 0.285)) / vec2(0.07, 0.01 + 0.055 * uOdd.z));
						c = mix(c, vec3(0.16, 0.03, 0.05), (1.0 - smoothstep(0.9, 1.0, m)) * edge);
					}
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
		uFace: { value: new THREE.Vector4((p.expr || 0) % 4, 5 - Math.floor((p.expr || 0) / 4), p.glasses ? 1 : 0, o.skirt ? 1 : 0) },
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
	m.customProgramCacheKey = () => 'guest';
	m.userData.u = u;
	return m;
}

/* ---------- the mannequin ---------- */

let kit = null;               // { scene, clips, hipsY }
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
	const clips = {};
	for (const c of gltf.animations) clips[c.name] = c;
	// (the clothes are painted by where each vertex sits at rest: its bind position)
	scene.traverse((o) => { if (o.isSkinnedMesh) o.geometry.setAttribute('bind', o.geometry.attributes.position); });
	kit = { scene, clips, hipsY: 0.92 };
	// how high the hips are, standing: for sitting people down
	const r = rig();
	const m = new THREE.AnimationMixer(r.root);
	m.clipAction(clips.Idle_Loop).play();
	m.setTime(0);
	r.root.updateMatrixWorld(true);
	kit.hipsY = r.bone('DEF-hips').getWorldPosition(new THREE.Vector3()).y;
	for (const fn of waiting.splice(0)) fn();
}).catch((e) => console.warn('No mannequin: the guests stay invisible', e));

const BODY_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5);

// A mannequin of one's own: its own bones, sharing the shapes.
function rig() {
	const root = kit.scene.clone(true);
	const bones = new Map();
	root.traverse((o) => { if (o.isBone) bones.set(o.name, o); });
	const meshes = [];
	root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
	for (const m of meshes) {
		const sk = m.skeleton;
		m.bind(new THREE.Skeleton(sk.bones.map((b) => bones.get(b.name)), sk.boneInverses), m.bindMatrix);
		// (a sphere round anything the body could do, so each wall's camera skips the people it can't see)
		m.boundingSphere = BODY_SPHERE;
		m.frustumCulled = true;
	}
	const rest = [...bones.values()].map((b) => [b, b.quaternion.clone(), b.position.clone()]);
	const bone = (n) => bones.get(n) || bones.get(THREE.PropertyBinding.sanitizeNodeName(n));
	return { root, meshes, bone, rest };
}

// Turn a bone about an axis in the mannequin's own space (x across, y up,
// z forward), as if grabbed and swung, keeping what its parents already did.
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
function swing(r, b, axis, angle) {
	if (!b || !angle) return;
	qa.identity();
	for (let o = b.parent; o && o !== r.root; o = o.parent) qa.premultiply(o.quaternion);
	qb.setFromAxisAngle(axis, angle);
	b.quaternion.premultiply(qc.copy(qa).invert().multiply(qb).multiply(qa));
}

/* ---------- what people do ---------- */

/*
 * Every act is a function of time alone, so a scene plays out exactly the
 * same each time it loops. a: { r (the rig), b (its bones), fig (the body's
 * group, for bouncing and swaying), t (seconds, offset per person), T (the
 * scene's own seconds, for things on the beat) }. A swing's axis is in the
 * mannequin's space: about X with a negative angle brings an arm forward and
 * up; about Z raises an arm out to the side (negative for the right arm).
 */
const S = Math.sin;
const up = (x) => Math.max(0, x);
const window01 = (t, period, a, b) => { const c = ((t % period) + period) % period / period; return c < a || c > b ? 0 : Math.sin((c - a) / (b - a) * Math.PI); };
const arms = (a, ux, fx, side = 'both') => {
	if (side !== 'L') { swing(a.r, a.b.uaR, X, ux); swing(a.r, a.b.faR, X, fx); }
	if (side !== 'R') { swing(a.r, a.b.uaL, X, ux); swing(a.r, a.b.faL, X, fx); }
};
// talking with the right hand
function gesture(a, t, k = 1) {
	swing(a.r, a.b.uaR, X, -k * (0.35 + 0.22 * S(t * 2.3)));
	swing(a.r, a.b.faR, X, -k * (0.9 + 0.45 * S(t * 3.1 + 1)));
	swing(a.r, a.b.faR, Y, k * 0.3 * S(t * 1.7));
	swing(a.r, a.b.head, X, 0.06 * S(t * 4.2));
}
const ACTS = {
	idle(a, t) { swing(a.r, a.b.head, Y, 0.12 * S(t * 0.37)); },
	talk(a, t) {
		if (S(t * 0.9) > -0.2) gesture(a, t, 0.9);
		else swing(a.r, a.b.head, X, 0.1 * up(S(t * 2.6)));
	},
	listen(a, t) {
		arms(a, -0.25, -1.1);
		swing(a.r, a.b.faR, Y, 0.35); swing(a.r, a.b.faL, Y, -0.35);
		swing(a.r, a.b.head, X, 0.1 * up(S(t * 2.2)) * up(S(t * 0.5)));
	},
	drink(a, t) {
		const sip = window01(t, 5.2, 0.62, 0.86);
		swing(a.r, a.b.uaR, X, -0.2 - 0.75 * sip);
		swing(a.r, a.b.faR, X, -1.35 - 0.55 * sip);
		swing(a.r, a.b.faR, Y, 0.25);
		swing(a.r, a.b.head, X, -0.25 * sip);
		if (sip < 0.1 && S(t * 0.8) > 0) gesture(a, t, 0.4);
	},
	eat(a, t) {
		arms(a, -0.25, -1.45, 'L');
		swing(a.r, a.b.faL, Y, -0.35);
		const bite = window01(t, 3.4, 0.5, 0.8);
		swing(a.r, a.b.uaR, X, -0.3 - 0.5 * bite);
		swing(a.r, a.b.faR, X, -1.0 - 0.9 * bite);
		swing(a.r, a.b.faR, Y, 0.3);
		swing(a.r, a.b.head, X, 0.15 - 0.15 * bite);
	},
	laugh(a, t) {
		arms(a, -0.2, -1.2);
		swing(a.r, a.b.faR, Y, 0.4); swing(a.r, a.b.faL, Y, -0.4);
		swing(a.r, a.b.spine, X, -0.12 - 0.05 * S(t * 15));
		swing(a.r, a.b.head, X, -0.22 - 0.08 * S(t * 15));
	},
	clap(a, t) {
		arms(a, -0.55, -1.0);
		const c = 0.6 + 0.2 * S(t * 22);
		swing(a.r, a.b.faR, Y, c); swing(a.r, a.b.faL, Y, -c);
		swing(a.r, a.b.head, X, -0.05);
	},
	shake(a, t) {
		swing(a.r, a.b.uaR, X, -0.75 + 0.12 * S(t * 13));
		swing(a.r, a.b.faR, X, -0.3);
		swing(a.r, a.b.faR, Y, 0.15);
	},
	wave(a, t) {
		swing(a.r, a.b.uaR, Z, -2.45);
		swing(a.r, a.b.faR, Z, -0.4 + 0.45 * S(t * 9));
	},
	point(a, t) {
		swing(a.r, a.b.uaR, X, -1.45 + 0.08 * S(t * 2.2));
		arms(a, -0.3, -1.3, 'L');
		swing(a.r, a.b.faL, Y, -0.3);
	},
	speech(a, t) {
		gesture(a, t, 1.1);
		swing(a.r, a.b.uaL, X, -0.3 - 0.2 * up(S(t * 1.3)));
		swing(a.r, a.b.faL, X, -0.9 - 0.4 * S(t * 2.4));
	},
	carry(a) { arms(a, -0.35, -1.3); swing(a.r, a.b.faR, Y, 0.25); swing(a.r, a.b.faL, Y, -0.25); },
	hang(a, t) {
		swing(a.r, a.b.uaR, Z, -2.6 - 0.12 * S(t * 2.1)); swing(a.r, a.b.uaL, Z, 2.6 + 0.12 * S(t * 1.7));
		swing(a.r, a.b.faR, Z, -0.4); swing(a.r, a.b.faL, Z, 0.4);
		swing(a.r, a.b.head, X, -0.35);
	},
	dance(a, t, T) {
		a.fig.position.y += 0.06 * Math.abs(S(T * Math.PI * 2));
		swing(a.r, a.b.spine, Y, 0.3 * S(T * Math.PI + a.k));
		swing(a.r, a.b.uaR, Z, -(1.0 + 1.3 * up(S(t * Math.PI))));
		swing(a.r, a.b.uaL, Z, 1.0 + 1.3 * up(-S(t * Math.PI)));
		swing(a.r, a.b.faR, Z, -0.6); swing(a.r, a.b.faL, Z, 0.6);
		swing(a.r, a.b.head, X, 0.15 * S(T * Math.PI * 4));
		swing(a.r, a.b.thighL, X, -0.35 * up(S(T * Math.PI * 2)));
		swing(a.r, a.b.thighR, X, -0.35 * up(-S(T * Math.PI * 2)));
	},
	sway(a, t) {
		a.fig.rotation.z += 0.12 * S(t * 1.3);
		swing(a.r, a.b.head, X, 0.3 + 0.12 * S(t * 1.1));
		swing(a.r, a.b.head, Z, 0.25 * S(t * 0.9));
		ACTS.drink(a, t * 0.7);
	},
	sleep(a) {
		swing(a.r, a.b.spine, X, 0.3);
		swing(a.r, a.b.head, X, 0.75);
		arms(a, -0.1, -0.5);
	},
	panic(a, t) {
		a.fig.position.y += 0.05 * Math.abs(S(t * 8));
		a.fig.rotation.y += 0.6 * S(t * 1.7);
		swing(a.r, a.b.uaR, Z, -(2.4 + 0.45 * S(t * 11)));
		swing(a.r, a.b.uaL, Z, 2.4 + 0.45 * S(t * 9.3));
		swing(a.r, a.b.head, Y, 0.4 * S(t * 3));
	},
	spray(a, t) {
		arms(a, -1.05, -0.2);
		swing(a.r, a.b.faR, Y, 0.3); swing(a.r, a.b.faL, Y, -0.3);
		swing(a.r, a.b.spine, Y, 0.25 * S(t * 2.3));
	},
	sweep(a, t) {
		arms(a, -0.55, -0.4);
		swing(a.r, a.b.faR, Y, 0.35); swing(a.r, a.b.faL, Y, -0.35);
		swing(a.r, a.b.spine, Y, 0.35 * S(t * 2.4));
		swing(a.r, a.b.spine, X, 0.2);
	},
	reach() {},
	dead(a) {
		swing(a.r, a.b.uaR, Z, -1.3); swing(a.r, a.b.uaL, Z, 1.2);
		swing(a.r, a.b.faR, Z, -0.5);
		swing(a.r, a.b.thighL, Z, 0.25); swing(a.r, a.b.thighR, Z, -0.2);
		swing(a.r, a.b.head, Y, 0.5);
	},
	'dead-wave'(a, t) {
		ACTS.dead(a);
		swing(a.r, a.b.uaR, Z, 1.3);
		swing(a.r, a.b.uaR, X, -1.5);
		swing(a.r, a.b.faR, Z, 0.5 * S(t * 7));
	},
};
// how each act looks, unless something weird has happened to the face
const ACT_FACE = { laugh: EXPR.grin, dance: EXPR.sing, wave: EXPR.grin, sway: EXPR.drunk, sleep: EXPR.sleepy, panic: EXPR.yell, dead: EXPR.dead, 'dead-wave': EXPR.dead, clap: EXPR.smile, spray: EXPR.yell };
const LIE = new Set(['dead', 'dead-wave', 'lie']);
// what they hold, and in which hand
const HOLD = { drink: 'glass', sway: 'glass', eat: 'plate', carry: 'tray', point: 'clipboard', spray: 'extinguisher', sweep: 'broom' };

/* ---------- things in hand ---------- */

const holdMat = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
const HELD = {
	glass() {
		const g = new THREE.Group();
		const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.11, 10), holdMat(0xd8eef0, { transparent: true, opacity: 0.55 }));
		const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.07, 10), holdMat(0xc8304a));
		drink.position.y = -0.015;
		g.add(glass, drink);
		g.userData.at = [0, 0.03, 0.03];
		return g;
	},
	plate() {
		const g = new THREE.Group();
		g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.012, 16), holdMat(0xfdfdfb)));
		for (let i = 0; i < 4; i++) {
			const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), holdMat([0xd8a050, 0x7aa04a, 0xc0503a, 0xe8d8b0][i]));
			m.scale.y = 0.6; m.position.set(Math.cos(i * 1.6) * 0.05, 0.02, Math.sin(i * 1.6) * 0.05);
			g.add(m);
		}
		g.userData.at = [0.04, 0.02, 0.06];
		return g;
	},
	tray() {
		const g = new THREE.Group();
		g.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.32), holdMat(0xc8c8cc)));
		for (let i = 0; i < 8; i++) {
			const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8), holdMat(0xd8a050));
			m.rotation.z = Math.PI / 2; m.position.set(0, 0.03, -0.12 + i * 0.034);
			g.add(m);
		}
		g.userData.both = true;
		g.userData.at = [0, 0.04, 0.08];
		return g;
	},
	clipboard() {
		const g = new THREE.Group();
		const b = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.31, 0.015), holdMat(0x8a5a2e));
		const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), holdMat(0xffffff));
		paper.position.z = 0.009;
		g.add(b, paper);
		g.rotation.x = -1.0;
		g.userData.left = true;
		g.userData.at = [0, 0.05, 0.08];
		return g;
	},
	extinguisher() {
		// a red can with a black hose and horn, and a billowing white jet:
		// puffs that leave the horn fast and tight, slow, swell, drift and fade
		const g = new THREE.Group();
		const can = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 14), holdMat(0xc8261e));
		can.rotation.x = Math.PI / 2 * 0.8;
		const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), holdMat(0x2a2a2a));
		top.position.set(0, 0.06, 0.2);
		const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.16, 10), holdMat(0x1a1a1a));
		horn.rotation.x = Math.PI / 2;
		horn.position.set(0, 0.04, 0.3);
		g.add(can, top, horn);
		const jet = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
		jet.rotation.x = -Math.PI / 2;
		jet.position.set(0, 0.04, 0.6);
		g.add(jet);
		const puffs = [];
		for (let i = 0; i < 26; i++) {
			const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xf4f6f8, transparent: true, depthWrite: false }));
			sp.userData.noOcclude = true;
			g.add(sp);
			puffs.push(sp);
		}
		g.userData.both = true;
		g.userData.at = [0, 0, 0.12];
		// the spray at time t (a function of time, so it loops with the scene)
		g.userData.spray = function (t) {
			jet.scale.set(1 + 0.2 * S(t * 37), 1 + 0.15 * S(t * 23), 1 + 0.2 * S(t * 31));
			puffs.forEach(function (sp, i) {
				const k = (t * 1.6 + i / puffs.length) % 1;          // its age, 0..1
				const seed = i * 12.9898;
				const sx = Math.sin(seed) * 0.5, sy = Math.cos(seed * 1.7) * 0.5;
				const reach = 1 - Math.pow(1 - k, 2);                 // fast out of the horn, slowing
				sp.position.set(sx * k * 0.55, 0.04 + sy * k * 0.35 - k * k * 0.35, 0.4 + reach * 1.9);
				const size = 0.08 + k * 0.75;
				sp.scale.set(size, size, 1);
				sp.material.opacity = 0.75 * Math.min(1, k * 8) * (1 - k);
				sp.material.rotation = seed + k * 2;
			});
		};
		return g;
	},
	broom() {
		const g = new THREE.Group();
		const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.3, 6), holdMat(0x8a6a3a));
		const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.08), holdMat(0x3a3a3a));
		head.position.y = -0.65;
		g.add(pole, head);
		g.rotation.x = 0.5;
		g.userData.both = true;
		g.userData.at = [0, -0.3, 0.15];
		return g;
	},
};

// A soft round puff, for smoke and spray.
let puff = null;
function puffTex() {
	if (puff) return puff;
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const x = c.getContext('2d');
	for (let i = 0; i < 5; i++) {
		const px = 22 + (i * 37) % 20, py = 22 + (i * 23) % 20, r = 16 + (i * 7) % 12;
		const g = x.createRadialGradient(px, py, 0, px, py, r);
		g.addColorStop(0, 'rgba(255,255,255,0.8)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		x.fillStyle = g;
		x.fillRect(0, 0, 64, 64);
	}
	puff = new THREE.CanvasTexture(c);
	return puff;
}

// A flame (and its glow), flickering on its own clock. size: metres tall.
const flameTex = (() => {
	const c = document.createElement('canvas');
	c.width = 64; c.height = 128;
	const x = c.getContext('2d');
	const g = x.createRadialGradient(32, 92, 2, 32, 80, 60);
	g.addColorStop(0, 'rgba(255,250,200,1)');
	g.addColorStop(0.25, 'rgba(255,200,60,0.95)');
	g.addColorStop(0.6, 'rgba(255,90,20,0.6)');
	g.addColorStop(1, 'rgba(200,30,0,0)');
	x.fillStyle = g;
	x.beginPath();
	x.moveTo(32, 2); x.quadraticCurveTo(62, 70, 54, 104); x.quadraticCurveTo(32, 132, 10, 104); x.quadraticCurveTo(2, 70, 32, 2);
	x.fill();
	return new THREE.CanvasTexture(c);
})();
export function flame(size = 0.6, seed = 1) {
	const g = new THREE.Group();
	for (let i = 0; i < 3; i++) {
		const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
		const k = [1, 0.7, 0.55][i];
		sp.position.set((i - 1) * size * 0.25, size * 0.5 * k, (i - 1) * 0.05);
		sp.userData.noOcclude = true;
		sp.onBeforeRender = function () {
			const t = performance.now() / 1000 + seed * 3.1 + i * 1.7;
			const f = 1 + 0.18 * Math.sin(t * 13) + 0.12 * Math.sin(t * 29);
			sp.scale.set(size * 0.55 * k * (2 - f), size * k * f, 1);
		};
		g.add(sp);
	}
	return g;
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
const v1 = new THREE.Vector3(), m4 = new THREE.Matrix4();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const posture = (act, p) => (LIE.has(act) || p.pose === 'lie' ? 'lie' : act.startsWith('sit-') || p.pose === 'sit' ? 'sit' : 'stand');

// Where someone on a track is at time T: { x, z, y, yaw, act, walking, fire }.
export function trackAt(track, T) {
	let k = track[0];
	if (T <= k.t) return Object.assign({}, k, { walking: false });
	for (let i = 0; i < track.length - 1; i++) {
		const a = track[i], b = track[i + 1];
		if (T >= b.t) continue;
		const moving = Math.hypot(b.x - a.x, b.z - a.z) > 0.01;
		if (!moving) return Object.assign({}, a, { walking: false });
		const f = (T - a.t) / (b.t - a.t);
		return Object.assign({}, b, {
			x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, y: a.y + (b.y - a.y) * f,
			yaw: Math.atan2(b.x - a.x, b.z - a.z), act: 'walk', walking: true,
		});
	}
	k = track[track.length - 1];
	return Object.assign({}, k, { walking: false });
}

/*
 * A guest: a Group with userData.actor = { tick(T, dt, talking), head }.
 * Call tick every frame with the scene's time: it plays their act (or, for
 * someone on a track, walks them through it), and flaps their mouth while
 * `talking`. head is where their head is, in the world.
 * props: { seed, pose ('stand', 'sit', 'lie'), act, expr, exprLock, head,
 *   h, glasses, outfit, backwards, balloon, fire, track }
 */
export function person(p) {
	const g = new THREE.Group();
	const h = p.h || 1.75;
	const s = h / TALL;
	const first = p.track ? p.track[0] : null;
	const lie = posture(first ? first.act : p.act || 'idle', p) === 'lie';
	const sit = !lie && posture(first ? first.act : p.act || 'idle', p) === 'sit';
	// the hit boxes, there from the start: the body, and the head (for rings round faces)
	const body = new THREE.Mesh(unitBox, hitMat);
	if (lie) { body.scale.set(0.6, 0.35, h); body.position.set(0, 0.17, -h / 2); }
	else if (sit) { body.scale.set(0.55, h * 0.75, 0.75); body.position.set(0, h * 0.38, 0.12); }
	else { body.scale.set(0.55, h, 0.4); body.position.set(0, h / 2, 0); }
	body.userData.noOcclude = true;
	g.add(body);
	const headBox = new THREE.Mesh(unitBox, hitMat);
	headBox.name = 'headBox';
	headBox.scale.setScalar(0.32);
	headBox.position.set(0, lie ? 0.15 : sit ? SEAT + 0.75 * s : h - 0.12, lie ? -h + 0.12 : 0);
	headBox.userData.noOcclude = true;
	g.add(headBox);
	const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), shadowMat);
	shadow.rotation.x = -Math.PI / 2;
	shadow.position.y = 0.012;
	shadow.userData.noOcclude = true;
	g.add(shadow);
	if (p.fire) {
		const f = flame(0.7, p.seed || 1);
		f.position.set(0, (sit ? 0.8 : 1.15) * s, -0.15);
		g.add(f);
	}

	const actor = { tick() {}, head: new THREE.Vector3(), ready: false };
	g.userData.actor = actor;

	const dress = function () {
		const r = rig();
		const mat = personMaterial(p);
		const u = mat.userData.u;
		for (const m of r.meshes) m.material = mat;
		const fig = new THREE.Group();
		const inner = new THREE.Group();
		inner.scale.setScalar(s);
		inner.add(r.root);
		fig.add(inner);
		g.add(fig);
		const b = {
			uaR: r.bone('DEF-upper_arm.R'), faR: r.bone('DEF-forearm.R'), uaL: r.bone('DEF-upper_arm.L'), faL: r.bone('DEF-forearm.L'),
			handR: r.bone('DEF-hand.R'), handL: r.bone('DEF-hand.L'),
			head: r.bone('DEF-head'), neck: r.bone('DEF-neck'), spine: r.bone('DEF-spine.003'),
			thighL: r.bone('DEF-thigh.L'), thighR: r.bone('DEF-thigh.R'), shinL: r.bone('DEF-shin.L'), shinR: r.bone('DEF-shin.R'),
		};
		if (p.balloon != null) {
			// a balloon where the head was
			const bm = new THREE.MeshLambertMaterial({ color: p.balloon, emissive: p.balloon, emissiveIntensity: 0.25 });
			const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), bm);
			ball.scale.set(1, 1.18, 1);
			ball.position.set(0, 0.14, 0);
			b.head.add(ball);
		}
		const mixer = new THREE.AnimationMixer(r.root);
		const clips = {};
		for (const name of ['Idle_Loop', 'Walk_Loop', 'Interact']) {
			const a = mixer.clipAction(kit.clips[name]);
			a.play();
			clips[name] = a;
		}
		const held = {};
		const a = { r, b, fig, t: 0, T: 0, k: ((p.seed || 0) % 97) / 97 * 6.28 };
		const phi = ((p.seed || 0) % 1000) / 1000 * 9;

		actor.ready = true;
		actor.tick = function (T, dt, talking) {
			let act = p.act || 'idle';
			let yawOff = 0;
			if (p.track) {
				const st = trackAt(p.track, T);
				g.position.set(st.x, st.y || 0, st.z);
				g.rotation.y = st.yaw;
				act = st.act;
			}
			if (p.cue && T >= p.cue.from && T <= p.cue.to) act = p.cue.act;   // (everyone clapping at once)
			const pos = posture(act, p);
			const base = act.replace('sit-', '');
			const t = T + phi;
			a.t = t; a.T = T;
			// the clip under it all, from rest
			for (const [bone, q, ps] of r.rest) { bone.quaternion.copy(q); bone.position.copy(ps); }
			const clip = act === 'walk' ? 'Walk_Loop' : base === 'reach' ? 'Interact' : 'Idle_Loop';
			for (const k in clips) clips[k].setEffectiveWeight(k === clip ? 1 : 0);
			mixer.setTime(clip === 'Interact' ? 0.75 + 0.35 * S(t * 1.3) : t);
			fig.position.set(0, 0, 0);
			fig.rotation.set(0, 0, 0);
			// sitting, lying
			if (pos === 'sit') {
				for (const [th, sh] of [[b.thighL, b.shinL], [b.thighR, b.shinR]]) { swing(r, th, X, -Math.PI / 2 + 0.05); swing(r, sh, X, Math.PI / 2 - 0.05); }
				fig.position.y = SEAT + 0.08 * s - s * kit.hipsY;
				if (base === 'idle' || base === 'sit') arms(a, -0.3, -1.0);
			} else if (pos === 'lie') {
				fig.rotation.x = -Math.PI / 2;
				fig.position.y = 0.11 * s;
			}
			if (act !== 'walk' && ACTS[base]) ACTS[base](a, t, T);
			if (talking && (base === 'idle' || base === 'point' || base === 'sway')) gesture(a, t, 0.8);
			// the head turned (for good or ill)
			if (p.head) { swing(r, b.neck, Y, p.head * 0.3); swing(r, b.head, Y, p.head * 0.7); }
			// the face: the act's, unless it's been changed; the mouth while talking
			const expr = p.exprLock ? p.expr : ACT_FACE[base] ?? (p.track && p.expr !== undefined ? p.expr : p.expr || 0);
			u.uFace.value.x = expr % 4;
			u.uFace.value.y = 5 - Math.floor(expr / 4);
			const chatter = base === 'talk' && !p.track && S(t * 0.9) > -0.2;
			u.uOdd.value.z = talking || chatter ? 0.25 + 0.75 * Math.abs(S(t * 17 + 2 * S(t * 5))) : base === 'dance' || base === 'panic' || base === 'laugh' ? 0.6 : 0;
			// the bones in place, then whatever's in hand
			r.root.updateMatrixWorld(true);
			const want = HOLD[base];
			for (const k in held) held[k].visible = k === want;
			if (want) {
				if (!held[want]) { held[want] = HELD[want](); r.root.add(held[want]); }
				const item = held[want];
				m4.copy(r.root.matrixWorld).invert();
				if (item.userData.both) v1.setFromMatrixPosition(b.handR.matrixWorld).add(new THREE.Vector3().setFromMatrixPosition(b.handL.matrixWorld)).multiplyScalar(0.5);
				else v1.setFromMatrixPosition((item.userData.left ? b.handL : b.handR).matrixWorld);
				v1.applyMatrix4(m4);
				const [ox, oy, oz] = item.userData.at;
				item.position.set(v1.x + ox, v1.y + oy, v1.z + oz);
				if (item.userData.spray) item.userData.spray(t);
			}
			actor.head.setFromMatrixPosition(b.head.matrixWorld);
		};
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
		act: opts.act || 'idle',
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
