/*
 * The speedster: a glossy, spiky little runner in any colour, built for
 * three.js (shared by Sonic Dash, Quill Relay and the Sonic Characters
 * sandbox). A bean of a head with thick quills flaring out of it and a
 * smooth flattened front with the classic face laid flat on it; soft fur; a small bean of a
 * body; big puffy gloves; simple red shoes (a dome on a white sole, a white
 * sock); and noodly rubber-hose arms and legs, rebuilt every frame as
 * smooth tapered tubes bowing at the knee and elbow.
 *
 * Running, the feet go round in loops (a wheel at full tilt, a stride when
 * jogging) and the arms pump in loops against them; flat out, the arms trail
 * back. It curls into a spinning spiked ball, crouches, springs, tumbles and
 * stands tapping a foot. Faces -z, feet on y = 0.
 *
 *   import { buildSpeedster } from '../../shared/speedster3d.js';
 *   const s = buildSpeedster(0x2f6cf0);
 *   scene.add(s.root);                 // s.lean tilts and tumbles inside it
 *   s.animate(dt, mode, pace, spin, time);
 *     // mode: 'run' | 'ball' | 'crouch' | 'spring' | 'hurt' | 'idle'
 *     // pace: 0..1 (how fast); spin: the ball's turn (radians a second)
 *   s.setColour(c);
 */
import * as THREE from '../lib/three/three.module.min.js';

const TAU = Math.PI * 2;

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }, extra));
}

/* ---------- tubes ---------- */

// A tapered tube along a quadratic curve a → c → b, radius r0 at a to r1 at
// b (with a little swell in the middle, like a rubber hose). update() moves
// it; the mesh's vertices are rewritten in place.
export function hose(mat, r0, r1, { segs = 16, radial = 10, swell = 0.12, capA = true, capB = true, flare = 0, profile = null } = {}) {
	const rings = segs + 1;
	const ringVerts = radial + 1;
	const count = rings * ringVerts + (capA ? 1 : 0) + (capB ? 1 : 0);
	const pos = new Float32Array(count * 3);
	const nor = new Float32Array(count * 3);
	const idx = [];
	for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
		const a = i * ringVerts + j, b = a + ringVerts;
		idx.push(a, a + 1, b, b, a + 1, b + 1);   // (wound so the outside faces out)
	}
	const capAi = rings * ringVerts, capBi = capAi + (capA ? 1 : 0);
	if (capA) for (let j = 0; j < radial; j++) idx.push(capAi, j + 1, j);
	if (capB) for (let j = 0; j < radial; j++) { const base = segs * ringVerts; idx.push(capBi, base + j, base + j + 1); }
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
	geo.setIndex(idx);
	{
		const uv = new Float32Array(count * 2);
		for (let i = 0; i < rings; i++) for (let j = 0; j <= radial; j++) { const k = (i * ringVerts + j) * 2; uv[k] = j / radial; uv[k + 1] = i / segs * 2; }
		geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	}
	const mesh = new THREE.Mesh(geo, mat);
	mesh.frustumCulled = false;
	mesh.castShadow = true;

	const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), ref = new THREE.Vector3(), d = new THREE.Vector3(), e = new THREE.Vector3();
	mesh.update = function (a, c, b, bendAxis) {
		// the bend's plane: square to it, the tube's frame stays steady
		ref.subVectors(c, a).cross(d.subVectors(b, a));
		if (ref.lengthSq() < 1e-8) ref.copy(bendAxis || THREE.Object3D.DEFAULT_UP);
		ref.normalize();
		for (let i = 0; i < rings; i++) {
			const t = i / segs, u = 1 - t;
			P.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t);
			T.set(0, 0, 0).addScaledVector(e.subVectors(c, a), 2 * u).addScaledVector(d.subVectors(b, c), 2 * t);
			if (T.lengthSq() < 1e-10) T.subVectors(b, a);
			T.normalize();
			B.crossVectors(T, ref).normalize();
			N.crossVectors(B, T);
			const r = profile ? profile(t) : (r0 + (r1 - r0) * t) * (1 + swell * Math.sin(Math.PI * t)) * (1 + flare * Math.pow(1 - t, 3));   // (flare: wide at the root, like a fillet where it leaves a surface; profile: any thickness along it)
			for (let j = 0; j <= radial; j++) {
				const th = j / radial * TAU, cs = Math.cos(th), sn = Math.sin(th);
				const k = (i * ringVerts + j) * 3;
				const nx = N.x * cs + B.x * sn, ny = N.y * cs + B.y * sn, nz = N.z * cs + B.z * sn;
				pos[k] = P.x + nx * r; pos[k + 1] = P.y + ny * r; pos[k + 2] = P.z + nz * r;
				nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
			}
			if (i === 0 && capA) { const k = capAi * 3; pos[k] = P.x - T.x * r * 0.5; pos[k + 1] = P.y - T.y * r * 0.5; pos[k + 2] = P.z - T.z * r * 0.5; nor[k] = -T.x; nor[k + 1] = -T.y; nor[k + 2] = -T.z; }
			if (i === segs && capB) { const k = capBi * 3; pos[k] = P.x + T.x * r * 0.5; pos[k + 1] = P.y + T.y * r * 0.5; pos[k + 2] = P.z + T.z * r * 0.5; nor[k] = T.x; nor[k + 1] = T.y; nor[k + 2] = T.z; }
		}
		geo.attributes.position.needsUpdate = true;
		geo.attributes.normal.needsUpdate = true;
	};
	return mesh;
}

// A fixed tapered spike along a curve (quills, ears): built once.
export function spike(mat, a, c, b, r0, r1 = 0.004, segs = 14, flare = 0) {
	const m = hose(mat, r0, r1, { segs: flare ? Math.max(segs, 20) : segs, radial: 14, swell: 0.05, capA: true, capB: false, flare });
	m.update(a, c, b);
	m.geometry.computeBoundingSphere();
	m.frustumCulled = true;
	return m;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- the face ---------- */

// The face, traced from the classic drawing (a 736-unit square: one white
// mask holding both eyes, the green eyes, the muzzle crescent, the nose and
// the smirk), painted on a canvas that maps straight on from the front onto
// the head's flattened face.
// (FACE_K: the face and its features drawn bigger on the head by as much as the head's
// been shrunk, so they stay the same size while the head round them gets smaller)
const HEAD_SCALE = 0.76, FACE_K = 0.88 / HEAD_SCALE;
const FACE = { px: 1024, span: 0.84 * FACE_K, s: 0.95, ox: 368, oy: 230, cy: 444 };   // canvas size, metres across it, drawing-to-canvas scale, the drawing's point that lands at (512, cy)

// The eyes (the mask, its rim and the irises) drawn a little smaller than traced,
// shrunk toward the middle of the muzzle's top so they still sit right down on it
const EYES = { k: 0.88, ax: 368, ay: 448 };
const eyesAt = (x, y) => [EYES.ax + (x - EYES.ax) * EYES.k, EYES.ay + (y - EYES.ay) * EYES.k];

function maskPath(g) {
	g.beginPath();
	g.moveTo(20, 400);
	g.bezierCurveTo(0, 300, 5, 60, 150, 18);              // up the left eye's outside
	g.bezierCurveTo(250, 12, 310, 130, 332, 236);         // over its top and down its inside
	g.bezierCurveTo(342, 285, 356, 322, 368, 330);        // into the notch
	g.bezierCurveTo(380, 322, 394, 285, 404, 236);        // and out of it
	g.bezierCurveTo(428, 130, 488, 18, 600, 24);          // up the right eye's inside
	g.bezierCurveTo(735, 40, 740, 290, 716, 390);         // over its top and down its outside
	g.bezierCurveTo(600, 418, 460, 446, 368, 448);        // along the top of the muzzle...
	g.bezierCurveTo(270, 446, 130, 424, 20, 400);         // ...back to the start
	g.closePath();
}
function muzzlePath(g) {
	g.beginPath();
	g.moveTo(20, 400);
	g.bezierCurveTo(130, 424, 270, 446, 368, 448);
	g.bezierCurveTo(460, 446, 600, 418, 716, 390);
	g.bezierCurveTo(745, 470, 705, 590, 600, 645);        // round the right end and under
	g.bezierCurveTo(500, 700, 250, 705, 140, 640);
	g.bezierCurveTo(40, 585, -5, 480, 20, 400);           // round the left end
	g.closePath();
}

// Points along the eye mask's outline (from the muzzle up each outer edge, over
// the tops of the eyes and into the notch; not along the muzzle itself),
// as (x, y) on the front of a sphere of radius 0.4 (before flattening).
function maskRimPoints(perSegment = 40) {
	const segs = [
		[[20, 400], [0, 300], [5, 60], [150, 18]],
		[[150, 18], [250, 12], [310, 130], [332, 236]],
		[[332, 236], [342, 285], [356, 322], [368, 330]],
		[[368, 330], [380, 322], [394, 285], [404, 236]],
		[[404, 236], [428, 130], [488, 18], [600, 24]],
		[[600, 24], [735, 40], [740, 290], [716, 390]],
	];
	const { px, span, s, ox, oy, cy } = FACE;
	const out = [];
	segs.forEach(([a, b, c, d], k) => {
		for (let i = k === 0 ? 0 : 1; i <= perSegment; i++) {
			const t = i / perSegment, u = 1 - t;
			const [rx, ry] = eyesAt(u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
				u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]);
			const U = (px / 2 + (rx - ox) * s) / px, Vv = 1 - (cy + (ry - oy) * s) / px;
			out.push([(0.5 - U) * span, (Vv - 0.5) * span]);   // (down the outer edges all the way to the muzzle)
		}
	});
	return out;
}

// withMuzzle: paint the muzzle (its tan and the smirk) too, or just the eye mask and eyes
function faceTexture(withMuzzle = true) {
	const { px, s, ox, oy, cy } = FACE;
	const toRef = (g) => { g.translate(px / 2 - ox * s, cy - oy * s); g.scale(s, s); };

	// the painting
	const paint = document.createElement('canvas');
	paint.width = paint.height = px;
	const g = paint.getContext('2d');
	g.save();
	toRef(g);
	g.lineJoin = 'round';
	g.lineCap = 'round';
	if (withMuzzle) {
		g.fillStyle = '#f6c48e';
		muzzlePath(g);
		g.fill();
	}
	g.save();
	g.translate(EYES.ax, EYES.ay);   // (the eyes, a little smaller: see EYES)
	g.scale(EYES.k, EYES.k);
	g.translate(-EYES.ax, -EYES.ay);
	g.fillStyle = '#ffffff';
	maskPath(g);
	g.fill();
	if (!withMuzzle) {   // (the mask runs a little way under the 3D muzzle's top edge, so no seam shows; only along that edge)
		g.strokeStyle = '#ffffff';
		g.lineWidth = 26;
		g.beginPath();
		g.moveTo(716, 390);
		g.bezierCurveTo(600, 418, 460, 446, 368, 448);
		g.bezierCurveTo(270, 446, 130, 424, 20, 400);
		g.stroke();
	}
	g.strokeStyle = '#0c0c14';   // (for the smirk: no outlines round the mask or muzzle)
	// the eyes: tall green irises (darker at the rim, finely streaked), a black
	// oval pupil in each, and a white glint over the lower-left of the rim
	for (const [x, y, rot] of [[234, 306, 0.04], [468, 306, -0.04]]) {
		const rx = 42, ry = 108;
		g.save();
		g.translate(x, y);
		g.rotate(rot);
		g.beginPath();
		g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
		g.save();
		g.clip();
		g.save();
		g.scale(1, ry / rx);
		const iris = g.createRadialGradient(0, -rx * 0.1, 0, 0, 0, rx);
		iris.addColorStop(0, '#5fe25a');
		iris.addColorStop(0.55, '#2fae32');
		iris.addColorStop(0.85, '#167a1c');
		iris.addColorStop(1, '#0a4a10');
		g.fillStyle = iris;
		g.fillRect(-rx, -rx, rx * 2, rx * 2);
		// fine fibres radiating out
		for (let f = 0; f < 90; f++) {
			const a = f / 90 * Math.PI * 2 + Math.sin(f * 7.3) * 0.03;
			g.strokeStyle = f % 3 ? 'rgba(10,60,12,0.22)' : 'rgba(170,255,150,0.18)';
			g.lineWidth = 1.2;
			g.beginPath();
			g.moveTo(Math.cos(a) * rx * 0.55, Math.sin(a) * rx * 0.55);
			g.lineTo(Math.cos(a) * rx * 0.98, Math.sin(a) * rx * 0.98);
			g.stroke();
		}
		g.restore();
		// a soft shine at the bottom of the rim
		const shine = g.createRadialGradient(-2, ry * 0.9, 0, -2, ry * 0.9, rx * 0.5);
		shine.addColorStop(0, 'rgba(160,255,170,0.5)');
		shine.addColorStop(1, 'rgba(160,255,170,0)');
		g.fillStyle = shine;
		g.fillRect(-rx, ry * 0.5, rx * 2, ry * 0.5);
		g.restore();
		// the pupil
		g.fillStyle = '#121214';
		g.beginPath();
		g.ellipse(rx * 0.04, -ry * 0.02, rx * 0.6, ry * 0.63, 0, 0, Math.PI * 2);
		g.fill();
		// the glint
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.ellipse(-rx * 0.6, ry * 0.33, rx * 0.26, ry * 0.19, -0.1, 0, Math.PI * 2);
		g.fill();
		g.restore();
	}
	g.restore();
	// the smirk, with its little tick at the corner (on the muzzle)
	if (withMuzzle) {
		g.strokeStyle = '#0c0c14';
		g.lineWidth = 8;
		g.beginPath();
		g.moveTo(428, 612);
		g.quadraticCurveTo(560, 592, 600, 508);
		g.stroke();
		g.beginPath();
		g.moveTo(552, 498);
		g.quadraticCurveTo(596, 490, 630, 522);
		g.stroke();
	}
	g.restore();
	const tex = new THREE.CanvasTexture(paint);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	return tex;
}

/* ---------- geometry helpers ---------- */

// Split a non-indexed geometry's triangles (positions and UVs) until no edge is
// longer than maxEdge, so it bends smoothly when its points are moved.
function subdivide(geo, maxEdge) {
	const P = geo.attributes.position.array, U = geo.attributes.uv.array;
	const outP = [], outU = [];
	const split = (a, b, c, ua, ub, uc, depth) => {
		const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
		if (depth > 7 || Math.max(d(a, b), d(b, c), d(c, a)) <= maxEdge) {
			outP.push(...a, ...b, ...c);
			outU.push(...ua, ...ub, ...uc);
			return;
		}
		const m = (p, q) => p.map((v, k) => (v + q[k]) / 2);
		const ab = m(a, b), bc = m(b, c), ca = m(c, a), uab = m(ua, ub), ubc = m(ub, uc), uca = m(uc, ua);
		split(a, ab, ca, ua, uab, uca, depth + 1);
		split(ab, b, bc, uab, ub, ubc, depth + 1);
		split(ca, bc, c, uca, ubc, uc, depth + 1);
		split(ab, bc, ca, uab, ubc, uca, depth + 1);
	};
	for (let t = 0; t < P.length / 3; t += 3) {
		const v = (i) => [P[(t + i) * 3], P[(t + i) * 3 + 1], P[(t + i) * 3 + 2]], w = (i) => [U[(t + i) * 2], U[(t + i) * 2 + 1]];
		split(v(0), v(1), v(2), w(0), w(1), w(2), 0);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(outU, 2));
	return g;
}

// Weld matching points of a triangle soup into an indexed geometry (so normals
// average across triangles: smooth shading, no facets).
function weld(geo) {
	const P = geo.attributes.position.array, U = geo.attributes.uv.array;
	const keys = new Map(), pos = [], uv = [], idx = [];
	for (let i = 0; i < P.length / 3; i++) {
		const key = Math.round(P[i * 3] * 1e4) + ',' + Math.round(P[i * 3 + 1] * 1e4) + ',' + Math.round(P[i * 3 + 2] * 1e4);
		let k = keys.get(key);
		if (k === undefined) { k = pos.length / 3; keys.set(key, k); pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); uv.push(U[i * 2], U[i * 2 + 1]); }
		idx.push(k);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

/* ---------- fur ---------- */

// A normal map of short, soft strands (mostly lying one way, a few crossing),
// made once from a painted height field; and a material that wears it with a
// velvety sheen at the edges, like a plush toy's fur.
let furMap = null;
function furNormalMap() {
	if (furMap) return furMap;
	const N = 512;
	const c = document.createElement('canvas');
	c.width = c.height = N;
	const g = c.getContext('2d');
	g.fillStyle = '#808080';
	g.fillRect(0, 0, N, N);
	g.lineCap = 'round';
	for (let i = 0; i < 14000; i++) {
		const x = Math.random() * N, y = Math.random() * N;
		const a = Math.PI / 2 + (Math.random() - 0.5) * 0.9;   // (mostly lying along v)
		const len = 7 + Math.random() * 14;
		const v = Math.floor(60 + Math.random() * 170);
		g.strokeStyle = `rgba(${v},${v},${v},0.7)`;
		g.lineWidth = 0.8 + Math.random() * 1.4;
		for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {   // (wrapped, so it tiles)
			g.beginPath();
			g.moveTo(x + ox, y + oy);
			g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
			g.stroke();
		}
	}
	// height to normals
	const h = g.getImageData(0, 0, N, N).data;
	const out = g.createImageData(N, N);
	const H = (x, y) => h[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
	for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
		const dx = (H(x + 1, y) - H(x - 1, y)) * 3.2, dy = (H(x, y + 1) - H(x, y - 1)) * 3.2;
		const l = Math.hypot(dx, dy, 1);
		const k = (y * N + x) * 4;
		out.data[k] = (-dx / l * 0.5 + 0.5) * 255;
		out.data[k + 1] = (dy / l * 0.5 + 0.5) * 255;
		out.data[k + 2] = (1 / l * 0.5 + 0.5) * 255;
		out.data[k + 3] = 255;
	}
	g.putImageData(out, 0, 0);
	furMap = new THREE.CanvasTexture(c);
	furMap.wrapS = furMap.wrapT = THREE.RepeatWrapping;
	furMap.repeat.set(3, 3);
	furMap.anisotropy = 4;
	return furMap;
}
let furStreaks = null;
function furStreakMap() {
	if (furStreaks) return furStreaks;
	const N = 512;
	const c = document.createElement('canvas');
	c.width = c.height = N;
	const g = c.getContext('2d');
	g.fillStyle = '#f2f2f2';
	g.fillRect(0, 0, N, N);
	g.lineCap = 'round';
	// long soft streaks, a little darker or lighter, lying along the fur
	for (let i = 0; i < 900; i++) {
		const x = Math.random() * N, y = Math.random() * N;
		const a = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
		const len = 20 + Math.random() * 60;
		const dark = Math.random() < 0.6;
		g.strokeStyle = dark ? `rgba(0,0,0,${0.05 + Math.random() * 0.08})` : `rgba(255,255,255,${0.1 + Math.random() * 0.15})`;
		g.lineWidth = 1.5 + Math.random() * 4;
		for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
			g.beginPath();
			g.moveTo(x + ox, y + oy);
			g.lineTo(x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
			g.stroke();
		}
	}
	furStreaks = new THREE.CanvasTexture(c);
	furStreaks.colorSpace = THREE.SRGBColorSpace;
	furStreaks.wrapS = furStreaks.wrapT = THREE.RepeatWrapping;
	furStreaks.repeat.set(3, 3);
	furStreaks.anisotropy = 4;
	return furStreaks;
}
function fur(color, extra = {}) {
	const sheenColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45);
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.62, metalness: 0, sheen: 1, sheenColor, sheenRoughness: 0.42, map: furStreakMap(), normalMap: furNormalMap(), normalScale: new THREE.Vector2(1.0, 1.0), clearcoat: 0.12, clearcoatRoughness: 0.4, envMapIntensity: 0.9 }, extra));
}

let muzzleCache = null;   // (the muzzle's shapes, built once for every speedster)

/* ---------- the speedster ---------- */

export function buildSpeedster(colour) {
	const root = new THREE.Group();   // placed in the world
	const lean = new THREE.Group();   // tilts, leans and tumbles
	root.add(lean);

	const skin = fur(colour);   // (soft fur all over)
	const tan = fur(0xf6d2a2, { normalScale: new THREE.Vector2(0.7, 0.7) });
	const white = glossy(0xffffff, { clearcoat: 0.9, roughness: 0.25 });
	const glove = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4 });
	const black = glossy(0x0c0c14, { roughness: 0.15 });
	const red = glossy(0xe0202a, { roughness: 0.25 });   // the shoes
	const glint = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) });   // (past white: the eyes sparkle)

	const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		parent.add(m);
		return m;
	};

	const HIP_Y = 0.56;
	const HAND = 1.5;   // how big the hands are
	const ANKLE = V(0, 0.2, -0.04);   // where a leg meets its shoe (in the shoe's space)
	// the torso pivots at the hips, so it can lean into the run
	const torso = new THREE.Group();
	torso.position.y = HIP_Y;
	lean.add(torso);
	// the body: a small bean, its belly bowed forward, its back curving in
	const BODY = { r: 0.16, len: 0.17, y: 0.25, bend: 0.9 };
	const beanGeo = new THREE.CapsuleGeometry(BODY.r, BODY.len, 12, 28);
	{
		const pos = beanGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const y = pos.getY(i);
			pos.setZ(i, pos.getZ(i) * 0.9 + BODY.bend * y * y);   // (the ends swept back: a bean on its end)
		}
		beanGeo.computeVertexNormals();
	}
	add(torso, beanGeo, skin, 0, BODY.y, 0.02);
	add(torso, new THREE.SphereGeometry(0.12, 28, 20), tan, 0, BODY.y - 0.01, -0.08, 0.95, 1.3, 0.6);   // the tummy
	// a stubby tail and two quills down the back
	torso.add(spike(skin, V(0, 0.12, 0.16), V(0, 0.08, 0.27), V(0, 0.14, 0.36), 0.06));
	for (const s of [-1, 1]) torso.add(spike(skin, V(s * 0.07, 0.36, 0.14), V(s * 0.12, 0.37, 0.32), V(s * 0.14, 0.24, 0.45), 0.11));   // (arching out and drooping down)

	// the head
	const head = new THREE.Group();
	head.position.set(0, 0.71, -0.02);
	head.scale.setScalar(HEAD_SCALE);   // (smaller than it was built; the face and its features are drawn up to match: FACE_K)
	torso.add(head);
	// a bean: a little long front to back, a little wide, arched (seen from the side, its
	// top rounds over and its underside curves in), its front pressed smoothly flat
	// (where a face will go). The quills and ears bend with it.
	const FLAT = { at: 0.29, soft: 0.07 };   // how far forward of the middle the flat face sits, and how softly it rounds into the head
	const flatten = (v) => {
		const d = -v.z, knee = FLAT.at - FLAT.soft;
		if (d > knee) v.z = -(knee + FLAT.soft * Math.tanh((d - knee) / FLAT.soft));   // (eases into the flat: no crease)
		return v;
	};
	const bean = (v) => { v.x *= 1.06; v.z *= 1.1; v.y -= 0.5 * v.z * v.z; return v; };
	const B = (x, y, z) => bean(V(x, y, z));
	const headGeo = new THREE.SphereGeometry(0.4, 96, 72);
	{
		const pos = headGeo.attributes.position, uv = headGeo.attributes.uv, v = V(0, 0, 0);
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			// (UVs measured from the face: round it (u), and away from it (v), so the fur's
			// strands and streaks all run back from the face over the head)
			const around = Math.atan2(v.y, v.x), away = Math.acos(Math.max(-1, Math.min(1, -v.z / 0.4)));
			uv.setXY(i, (around / (Math.PI * 2) + 0.5) * 6, away / Math.PI * 3);
			bean(flatten(v));
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		headGeo.computeVertexNormals();
	}
	add(head, headGeo, skin, 0, 0, 0.02);
	// the face, laid flat on the flattened front: a skin of the head's own shape
	// (the front of the same sphere, flattened and bent just the same), its picture
	// projected straight on from the front, drawn just over the head
	{
		const geo = new THREE.SphereGeometry(0.4, 96, 72, Math.PI * 1.5 - 1.1, 2.2, 0.75, 1.85);
		const pos = geo.attributes.position, uv = geo.attributes.uv, v = V(0, 0, 0);
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			uv.setXY(i, 0.5 - v.x / FACE.span, v.y / FACE.span + 0.5);   // (facing -z: the picture's right is the head's -x, as you look at it)
			bean(flatten(v));
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		geo.computeVertexNormals();
		const mat = new THREE.MeshPhysicalMaterial({ map: faceTexture(false), alphaTest: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
		const face = add(head, geo, mat, 0, 0, 0.02);
		face.castShadow = false;
		// a rim round the eyes: a blue tube along the mask's outline (up from one cheek, over
		// both eyes and through the notch, down to the other), lying on the head's surface
		const pts = maskRimPoints(60).map(([x, y]) => {
			const p = V(x, y, -Math.sqrt(Math.max(0, 0.16 - x * x - y * y)));
			bean(flatten(p));
			return p.add(V(0, 0, 0.02 - 0.006));   // (the head's offset, nudged just proud of the face)
		});
		// the rim swells over the tops of the eyes and through the middle of the face, and
		// thins down the outer edges to the muzzle: each ring of the tube is scaled about its centre
		const rimCurve = new THREE.CatmullRomCurve3(pts);
		const rimGeo = new THREE.TubeGeometry(rimCurve, 160, 0.014 * FACE_K, 10, false);
		{
			let yLo = Infinity, yHi = -Infinity;
			for (const p of pts) { yLo = Math.min(yLo, p.y); yHi = Math.max(yHi, p.y); }
			const pos = rimGeo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
			for (let i = 0; i <= 160; i++) {
				rimCurve.getPointAt(i / 160, c);
				const top = THREE.MathUtils.smoothstep(c.y, yLo + (yHi - yLo) * 0.45, yHi);   // (over the tops of the eyes)
				const mid = Math.exp(-((c.x / (0.07 * FACE_K)) ** 2));                                // (the middle of the face)
				const k = 0.55 + 0.85 * Math.max(top, mid);
				for (let j = 0; j <= 10; j++) {
					const n = i * 11 + j;
					v.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k).add(c);
					pos.setXYZ(n, v.x, v.y, v.z);
				}
			}
		}
		const rim = new THREE.Mesh(rimGeo, skin);
		rim.castShadow = true;
		head.add(rim);

		// the muzzle: a solid of tan fur in the drawing's muzzle shape; the smile and the
		// nose sit right on its front
		const { px, span, s: sc, ox, oy, cy } = FACE;
		const drawToHead = (rx, ry) => [(0.5 - (px / 2 + (rx - ox) * sc) / px) * span, ((1 - (cy + (ry - oy) * sc) / px) - 0.5) * span];
		const onHead = (x, y) => bean(flatten(V(x, y, -Math.sqrt(Math.max(0, 0.16 - x * x - y * y))))).add(V(0, 0, 0.02));
		// its shape: the drawing's muzzle outline, exactly, given thickness with softly
		// rounded edges all round (a pillow), its back following the face's curve and
		// sitting just inside it so it's flush
		// (the same for every speedster: built once, then shared)
		const mz = muzzleCache || (muzzleCache = (() => {
		const MUZZLE = { narrow: 0.93, bulge: 0.035 * FACE_K, bulgeW: 0.34 * FACE_K, body: 0.012 * FACE_K, round: 0.042 * FACE_K, edge: 0.03 * FACE_K, sink: 0.012 * FACE_K };   // its flat middle's thickness, how far its rounded edges bulge (front and back), how far in from its outline they start rounding, how far into the face its back sits
		const outline = (() => {
			// (the drawing's right half, and the same mirrored for the left: the drawn left end sagged)
			const right = [
				[[368, 396], [408, 396], [440, 436], [500, 436]],   // (rising a little in the middle, under the nose)
				[[500, 436], [560, 432], [610, 420], [660, 405]],
				[[660, 405], [715, 392], [745, 420], [738, 470]],   // (the outer top corner, rounded off)
				[[738, 470], [730, 540], [690, 610], [600, 645]],
				[[600, 645], [530, 690], [440, 700], [368, 700]],
			];
			const mirror = (seg) => seg.map(([x, y]) => [736 - x, y]).reverse();
			const segs = [...right, ...right.slice().reverse().map(mirror)];
			const pts = [];
			for (const [a, b, c, d] of segs) for (let i = 0; i < 24; i++) {
				const t = i / 24, u = 1 - t;
				pts.push(new THREE.Vector2(...drawToHead(
					368 + (u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0] - 368) * MUZZLE.narrow,
					u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1])));
			}
			return pts;
		})();
		let mgeo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
			depth: MUZZLE.body, curveSegments: 24, steps: 1,
			bevelEnabled: true, bevelThickness: MUZZLE.round, bevelSize: MUZZLE.edge, bevelOffset: -MUZZLE.edge, bevelSegments: 10,
		});
		mgeo = subdivide(mgeo.index ? mgeo.toNonIndexed() : mgeo, 0.018);   // (fine enough to bend smoothly onto the face)
		{
			// lay it on the face: each point goes to where its (x, y) lands on the face,
			// its depth measured out from the face (the back just inside it)
			const pos = mgeo.attributes.position, uv = mgeo.attributes.uv;
			const back = -MUZZLE.round;
			for (let i = 0; i < pos.count; i++) {
				const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
				const at = onHead(x, y);
				// (its front swells forward toward the middle, so seen from above it curves round the face)
				const swell = MUZZLE.bulge * Math.max(0, 1 - (x / MUZZLE.bulgeW) ** 2) * (z - back) / (MUZZLE.body + 2 * MUZZLE.round);
				pos.setXYZ(i, at.x, at.y, at.z + MUZZLE.sink - (z - back) - swell);
				uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 3);   // (fur at the same scale as the rest of him)
			}
			// (measuring depth out from the face mirrored it front to back: turn each
			// triangle round again so its outside faces out)
			for (const attr of [pos, uv]) {
				const n = attr.itemSize, a = attr.array;
				for (let t = 0; t < attr.count; t += 3) for (let k = 0; k < n; k++) {
					const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k, tmpv = a[i1];
					a[i1] = a[i2];
					a[i2] = tmpv;
				}
			}
		}
		mgeo = weld(mgeo);   // (smooth shading)
		// (points on its front: cast straight back at its shape from in front of where the
		// drawing's point lands on the face)
		const caster = new THREE.Raycaster(), probe = new THREE.Mesh(mgeo);
		const onMuzzle = (rx, ry) => {
			const at = onHead(...drawToHead(rx, ry));
			caster.set(V(at.x, at.y, -2), V(0, 0, 1));
			const hit = caster.intersectObject(probe, false)[0];
			return hit ? hit.point : null;
		};
		// the smile: a fine dark line on the muzzle, with its little tick at the corner
		const curve = (a, c, b, n = 24) => {
			const out = [];
			for (let i = 0; i <= n; i++) {
				const t = i / n, u = 1 - t;
				const p = onMuzzle(u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]);
				if (p) out.push(p.add(V(0, 0, -0.003)));
			}
			return out;
		};
		const lines = [];
		for (const pts of [curve([428, 612], [560, 592], [600, 508]), curve([552, 498], [596, 490], [630, 522], 10)]) {
			if (pts.length >= 2) lines.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0055 * FACE_K, 6, false));
		}
		// the nose: a glossy black ball on the muzzle's top, where it meets the eyes
		const nosePt = onMuzzle(366, 420) || onHead(...drawToHead(366, 420));
		return { mgeo, lines, nosePt };
		})());
		const muzzle = new THREE.Mesh(mz.mgeo, fur(0xf6d2a2, { normalScale: new THREE.Vector2(0.7, 0.7) }));
		muzzle.castShadow = true;
		head.add(muzzle);
		const lineMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.6 });
		for (const g of mz.lines) head.add(new THREE.Mesh(g, lineMat));
		// the nose: a little glossy bean poking forward (and a touch up) off the muzzle's top
		{
			const r = 0.046 * FACE_K;
			const geo = new THREE.SphereGeometry(r, 28, 20);
			const pos = geo.attributes.position;
			for (let i = 0; i < pos.count; i++) {
				const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i) * 1.25;   // (a little long front to back)
				pos.setXYZ(i, x, y * 0.95 + 0.06 * (z / r) * (z / r) * r, z);   // (both ends curling up a little: a bean)
			}
			geo.computeVertexNormals();
			const nose = add(head, geo, black, mz.nosePt.x, mz.nosePt.y, mz.nosePt.z - 0.02 - r * 0.5);
			nose.rotation.x = 0.3;   // (its front end raised)
		}
	}
	// the quills: each starts as a fine point on the head (short of the flat front),
	// swells as it hugs the head's curve, and tapers to its tip behind
	const quill = (a, c, b, r) => {
		const q = hose(skin, 0, 0, { segs: 32, radial: 16, capA: false, capB: false, profile: (t) => Math.max(0.004, r * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9)) });
		q.update(a, c, b);
		q.geometry.computeBoundingSphere();
		q.frustumCulled = true;
		head.add(q);
	};
	quill(B(0, 0.315, -0.215), B(0, 0.52, 0.17), B(0, 0.25, 0.76), 0.2);              // over the top
	for (const s of [-1, 1]) quill(B(s * 0.27, 0.12, -0.16), B(s * 0.27, 0.1, 0.22), B(s * 0.13, -0.02, 0.68), 0.16);   // round each side, close in toward the top one (shorter than it)
	quill(B(0, -0.1, 0.3), B(0, -0.12, 0.52), B(0, -0.06, 0.7), 0.16);               // lower at the back (shorter, tucked in under the side ones)
	// ears: big, forward, just above the eyes, flattened front to back, the tan inside facing forward
	for (const s of [-1, 1]) {
		const ear = new THREE.Group();
		ear.position.copy(B(s * 0.24, 0.26, -0.09));
		ear.rotation.z = -s * 0.22;
		ear.scale.set(FACE_K, FACE_K, 0.45 * FACE_K);   // (flattened at the front; kept their size as the head shrank)
		head.add(ear);
		// (full low down, easing to a soft point: between a cone and a dome)
		const round = (R) => (t) => Math.max(0.004, R * Math.pow(Math.max(0, 1 - Math.pow(t, 1.7)), 0.75));
		for (const [mat, a, c, b, R] of [[skin, V(0, -0.02, 0), V(s * 0.03, 0.12, 0), V(s * 0.045, 0.25, 0.02), 0.13], [tan, V(0, 0.03, -0.065), V(s * 0.03, 0.12, -0.065), V(s * 0.04, 0.21, -0.055), 0.077]]) {
			const e = hose(mat, 0, 0, { segs: 24, radial: 16, capA: true, capB: false, profile: round(R) });
			e.update(a, c, b);
			e.geometry.computeBoundingSphere();
			e.frustumCulled = true;
			ear.add(e);
		}
	}

	// gloves: a puffy hand, a thumb and a rolled cuff
	// hands: a small flat palm, four noodly fingers and a thumb growing out of it
	// with no joints (each starts inside the palm and tapers out, curling a little
	// to a rounded tip), and a slim cuff at the wrist. Up the arm is +y.
	function buildGlove() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.06, 24, 16), glove, 0, -0.01, 0, 1.05, 1.15, 0.45);   // the palm, flat
		const finger = (a, c, b, r) => {
			const f = hose(glove, 0, 0, { segs: 18, radial: 10, capA: true, capB: true, profile: (t) => r * (1 + 0.7 * Math.pow(1 - t, 4)) * (1 - 0.25 * t) });
			f.update(a, c, b);
			f.geometry.computeBoundingSphere();
			f.castShadow = true;
			g.add(f);
		};
		for (const x of [-0.033, -0.011, 0.011, 0.033]) {
			const len = 0.12 - Math.abs(x) * 0.9;
			finger(V(x * 0.8, -0.02, 0), V(x * 1.15, -0.03 - len * 0.6, 0.004), V(x * 1.3, -0.03 - len, 0.035), 0.0145);
		}
		finger(V(0.03, 0.0, 0.005), V(0.07, -0.02, 0.02), V(0.08, -0.06, 0.045), 0.015);   // the thumb
		const cuff = add(g, new THREE.TorusGeometry(0.045, 0.02, 10, 24), glove, 0, 0.055, 0);
		cuff.rotation.x = Math.PI / 2;
		g.scale.setScalar(HAND);
		lean.add(g);
		return g;
	}
	// shoes: a red dome on a white sole, a white sock
	function buildShoe() {
		const g = new THREE.Group();
		// a red dome, long toward the toe, on a white sole
		add(g, new THREE.SphereGeometry(0.17, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.05, -0.1, 1, 0.9, 1.6);
		add(g, new THREE.CylinderGeometry(0.17, 0.163, 0.055, 32), white, 0, 0.027, -0.1, 1.04, 1, 1.64);
		// a white sock round the ankle
		const sock = add(g, new THREE.TorusGeometry(0.06, 0.03, 12, 24), white, ANKLE.x, ANKLE.y, ANKLE.z);   // (right where the leg meets the shoe)
		sock.rotation.x = Math.PI / 2;
		lean.add(g);
		return g;
	}

	// the noodle limbs: legs from the hips, arms from the shoulders
	const legs = [-1, 1].map((s) => ({ s, tube: hose(skin, 0.045, 0.037), shoe: buildShoe(), hip: V(s * 0.075, 0.1, 0.02) }));   // (hips up inside the body: the legs come out of it)
	const arms = [-1, 1].map((s) => ({ s, tube: hose(skin, 0.032, 0.028), glove: buildGlove(), shoulder: V(s * 0.05, 0.4, 0.0), corner: V(s * 0.27, 0.5, 0.0) }));   // (it starts inside the torso and curves out through the shoulder corner)
	for (const l of legs) lean.add(l.tube);
	for (const a of arms) torso.add(a.tube);
	// (the arms ride the torso: their hands are placed in its space, then carried into the lean's for the gloves)

	// the leg blur at full tilt: a faint whirl of colour
	const whirlTex = (() => {
		const c = document.createElement('canvas');
		c.width = c.height = 128;
		const g = c.getContext('2d');
		g.translate(64, 64);
		for (let i = 0; i < 3; i++) {
			g.rotate(TAU / 3);
			const grad = g.createLinearGradient(-60, 0, 60, 0);
			grad.addColorStop(0, 'rgba(255,255,255,0)');
			grad.addColorStop(1, 'rgba(255,255,255,0.9)');
			g.strokeStyle = grad;
			g.lineWidth = 14;
			g.beginPath();
			g.arc(0, 0, 44, 0, Math.PI * 0.9);
			g.stroke();
		}
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	})();
	const whirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: colour, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
	const whirl = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), whirlMat);
	whirl.rotation.y = Math.PI / 2;
	whirl.position.set(0, 0.3, 0);
	lean.add(whirl);

	// the ball: curled up, quills out, spinning
	const ball = new THREE.Group();
	ball.position.y = 0.55;
	ball.visible = false;
	lean.add(ball);
	add(ball, new THREE.SphereGeometry(0.42, 32, 24), skin);
	// the quills bent right round into the circle, trailing the spin like a buzzsaw's teeth
	const ring = (r, a, x) => V(x, r * Math.cos(a), r * Math.sin(a));
	for (let i = 0; i < 9; i++) {
		const x = ((i % 3) - 1) * 0.17;
		const a = i / 9 * TAU + (i % 3) * 0.7;
		ball.add(spike(skin, ring(0.36, a, x * 0.8), ring(0.56, a + 0.4, x), ring(0.5, a + 0.95, x * 1.1), 0.17));
	}
	add(ball, new THREE.SphereGeometry(0.2, 20, 14), tan, 0, 0, -0.3, 1, 1, 0.7);
	const swirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: new THREE.Color(1.8, 1.8, 1.8), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8, blending: THREE.AdditiveBlending });
	const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), swirlMat);
	swirl.rotation.y = Math.PI / 2;
	swirl.castShadow = false;
	ball.add(swirl);

	/* ---------- moving ---------- */

	let cycle = 0;
	const foot = V(0, 0, 0), knee = V(0, 0, 0), hand = V(0, 0, 0), elbow = V(0, 0, 0), hipW = V(0, 0, 0), sh = V(0, 0, 0), tmp = V(0, 0, 0);
	const torsoInv = new THREE.Matrix4();

	// A leg from its hip to a foot at (fx, fy, fz) in the lean's space; the
	// knee bows forward (more the more the leg's squashed), the shoe tilts by toe.
	function placeLeg(l, fx, fy, fz, toe) {
		// the hip rides the torso (inside it); the foot end is the shoe's ankle, wherever the shoe's tilted
		torso.updateMatrix();
		hipW.copy(l.hip).applyMatrix4(torso.matrix);
		l.shoe.position.set(fx, fy, fz + 0.04);
		l.shoe.rotation.set(toe, 0, 0);
		l.shoe.updateMatrix();
		foot.copy(ANKLE).applyMatrix4(l.shoe.matrix);
		const L = 0.5;   // (the leg's length: shorter than this, it bows)
		const dist = hipW.distanceTo(foot);
		const bow = Math.sqrt(Math.max(0, L * L - dist * dist)) * 0.75 + 0.03;
		knee.lerpVectors(hipW, foot, 0.5).add(tmp.set(l.s * 0.03, 0, -bow));
		l.tube.update(hipW, knee, foot);
	}
	// An arm from its shoulder to a hand at (hx, hy, hz) in the torso's space;
	// the elbow bows out and back.
	function placeArm(a, hx, hy, hz, bowOut = 0.08, bowBack = 0.1) {
		sh.copy(a.shoulder);
		hand.set(hx, hy, hz);
		// the bend: out through the shoulder corner, then bowing toward the hand
		elbow.copy(a.corner).lerp(hand, 0.12).add(tmp.set(a.s * bowOut * 0.4, 0.0, bowBack * 0.4));   // (close to the corner: a sharp, high shoulder)
		a.tube.update(sh, elbow, hand);
		// the glove, on the end of the arm: its cuff over the arm's end, turned
		// up the arm (the way it leaves the elbow), carried into the lean's space
		const out = gloveDir.subVectors(hand, elbow).normalize();
		// its frame: up the arm (+y), the palm (+z) turned in toward the body, square to the arm
		const yA = gy.copy(out).negate();
		const zA = gz.set(-a.s, 0, 0.15).addScaledVector(yA, -gz.set(-a.s, 0, 0.15).dot(yA)).normalize();
		const xA = gx.crossVectors(yA, zA);
		gloveQ.setFromRotationMatrix(gm.makeBasis(xA, yA, zA));
		torso.updateMatrix();
		a.glove.position.copy(hand).addScaledVector(out, GLOVE_REACH).applyMatrix4(torso.matrix);
		a.glove.quaternion.copy(torso.quaternion).multiply(gloveQ);
	}
	const gloveDir = V(0, 0, 0), gloveQ = new THREE.Quaternion(), gx = V(0, 0, 0), gy = V(0, 0, 0), gz = V(0, 0, 0), gm = new THREE.Matrix4();
	const GLOVE_REACH = 0.045 * HAND;   // (from the arm's end to the middle of the palm: the cuff sits on the end)

	function show(running) {
		torso.visible = true;
		for (const l of legs) { l.tube.visible = true; l.shoe.visible = true; }
		for (const a of arms) { a.tube.visible = true; a.glove.visible = true; }
		ball.visible = false;
		whirl.visible = running;
	}

	function animate(dt, mode = 'run', pace = 0, spin = 30, time = 0) {
		if (mode === 'ball') {
			torso.visible = false;
			for (const l of legs) { l.tube.visible = false; l.shoe.visible = false; }
			for (const a of arms) { a.tube.visible = false; a.glove.visible = false; }
			whirl.visible = false;
			ball.visible = true;
			ball.rotation.x -= dt * spin;
			swirlMat.opacity = Math.min(0.9, 0.3 + Math.abs(spin) / 40);
			return;
		}
		torso.position.set(0, HIP_Y, 0);
		torso.rotation.set(0, 0, 0);
		head.rotation.set(0, 0, 0);

		if (mode === 'crouch') {
			show(false);
			torso.position.y = HIP_Y - 0.2;
			torso.rotation.x = -0.5;
			head.rotation.x = 0.4;
			for (const l of legs) placeLeg(l, l.s * 0.16, 0, -0.12, 0.1);
			for (const a of arms) placeArm(a, a.s * 0.22, -0.02, -0.42, 0.06, -0.06);
			return;
		}
		if (mode === 'spring') {
			show(false);
			torso.rotation.x = 0.1;
			head.rotation.x = -0.25;
			for (const l of legs) placeLeg(l, l.s * 0.12, -0.02 + (l.s > 0 ? 0.06 : 0), 0.02 * l.s, -0.25);
			for (const a of arms) placeArm(a, a.s * 0.36, 1.16, -0.05, 0.1, 0.0);
			return;
		}
		if (mode === 'hurt') {
			show(false);
			torso.rotation.x = 0.5;
			head.rotation.x = -0.4;
			const flail = Math.sin(time * 30);
			for (const l of legs) placeLeg(l, l.s * 0.18, 0.2 + l.s * 0.08, -0.25 * l.s, 0.4);
			for (const a of arms) placeArm(a, a.s * (0.6 + 0.08 * flail * a.s), 0.8 + 0.18 * flail * a.s, -0.1, 0.08, 0.05);
			return;
		}
		if (mode === 'idle' || pace < 0.04) {
			// standing, tapping a foot, raring to go
			show(false);
			const tap = Math.max(0, Math.sin(time * 8));
			torso.position.y = HIP_Y + Math.abs(Math.sin(time * 4)) * 0.015;
			torso.rotation.x = -0.04;
			placeLeg(legs[0], -0.14, 0, 0, 0);
			placeLeg(legs[1], 0.15, tap * 0.06, -0.06, -tap * 0.5);
			for (const a of arms) placeArm(a, a.s * (0.25 + Math.sin(time * 1.6 + a.s) * 0.01), -0.1, 0.02 + Math.sin(time * 1.3 + a.s) * 0.02, 0.05, -0.02);   // (hanging loose by his sides, swaying a little)
			return;
		}

		// running: the feet go round in loops, the arms pump against them
		show(true);
		cycle += dt * (7 + pace * 24);
		// (the body first: the limbs hang off it)
		torso.position.y = HIP_Y + Math.abs(Math.sin(cycle)) * 0.05 * (1 - pace * 0.6);
		torso.rotation.x = -0.35 * pace - 0.06;
		head.rotation.x = 0.25 * pace + 0.04;
		const stride = 0.22 + pace * 0.16;
		const lift = 0.12 + pace * 0.18;
		for (const l of legs) {
			const ph = cycle + (l.s > 0 ? Math.PI : 0);
			const s = Math.sin(ph), c = Math.cos(ph);
			// jogging, the foot lifts only on its way forward; flat out it runs a full wheel
			const up = (1 - pace) * Math.max(0, c) + pace * (0.5 + 0.5 * c);
			placeLeg(l, l.s * 0.12, up * lift, -s * stride - 0.04, -0.5 * c * (0.4 + pace * 0.6));
		}
		for (const a of arms) {
			const ph = cycle + (a.s > 0 ? 0 : Math.PI);
			const s = Math.sin(ph), c = Math.cos(ph);
			// pumping loops, sweeping back into a streamlined trail at full tilt
			const pump = 1 - Math.max(0, pace - 0.55) / 0.45;
			const hx = a.s * (0.25 + 0.04 * c);
			const hy = 0.02 + 0.16 * c * pump + (1 - pump) * 0.12;
			const hz = (-0.32 * s) * pump + (1 - pump) * (0.56 + 0.04 * s);
			placeArm(a, hx, hy, hz, 0.1, 0.06 + (1 - pump) * 0.1);
		}
		whirlMat.opacity = Math.max(0, pace - 0.7) * 1.6;
		whirl.rotation.x = -cycle;
	}

	function setColour(c) {
		skin.color.set(c);
		skin.sheenColor.set(c).lerp(new THREE.Color(0xffffff), 0.45);
		whirlMat.color.set(c);
	}

	animate(0, 'idle');
	return { root, lean, torso, head, ball, animate, setColour };
}
