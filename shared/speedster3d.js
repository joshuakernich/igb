/*
 * The speedster: a glossy, spiky little runner in any colour, built for
 * three.js (shared by Sonic Dash, Quill Relay and the Sonic Characters
 * sandbox). A big round head with tapered, swept-back quills,
 * the classic face (one white mask holding both eyes, a crescent muzzle, a
 * smirk); puffy gloves; simple red shoes (a dome on a white sole, a white
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
export function hose(mat, r0, r1, { segs = 16, radial = 10, swell = 0.12, capA = true, capB = true, flare = 0 } = {}) {
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
			const r = (r0 + (r1 - r0) * t) * (1 + swell * Math.sin(Math.PI * t)) * (1 + flare * Math.pow(1 - t, 3));   // (flare: wide at the root, like a fillet where it leaves a surface)
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

// The face, traced from the classic drawing (a 736-unit square: the white
// mask, the pupils and their glints, the muzzle crescent, the smirk), on a
// canvas that maps straight onto the front of a sphere of radius R.
const FACE = { px: 1024, span: 0.84, s: 0.95, ox: 368, oy: 230, cy: 414 };
const WINDOW = { phi0: Math.PI * 1.5 - 1.25, phi: 2.5, theta0: 0.5, theta: 2.3 };   // the front of the head the face covers (sphere angles)   // canvas size, metres across it, reference-to-canvas scale, the reference point that lands at (512, cy)

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

function buildFace(R, deform = (v) => v) {
	const { px, span, s, ox, oy, cy } = FACE;
	const toRef = (g) => { g.translate(px / 2 - ox * s, cy - oy * s); g.scale(s, s); };

	// the painting
	const paint = document.createElement('canvas');
	paint.width = paint.height = px;
	const g = paint.getContext('2d');
	g.save();
	toRef(g);
	g.lineJoin = 'round';
	g.lineCap = 'round';
	g.fillStyle = '#f6c48e';
	muzzlePath(g);
	g.fill();
	g.fillStyle = '#ffffff';
	maskPath(g);
	g.fill();
	g.strokeStyle = '#0c0c14';
	g.lineWidth = 9;
	muzzlePath(g);
	g.stroke();
	maskPath(g);
	g.stroke();
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
		// a dark edge
		g.strokeStyle = 'rgba(5,40,8,0.8)';
		g.lineWidth = 3;
		g.stroke();
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
	// the smirk, with its little tick at the corner
	g.lineWidth = 8;
	g.beginPath();
	g.moveTo(428, 612);
	g.quadraticCurveTo(560, 592, 600, 508);
	g.stroke();
	g.beginPath();
	g.moveTo(552, 498);
	g.quadraticCurveTo(596, 490, 630, 522);
	g.stroke();
	g.restore();
	const tex = new THREE.CanvasTexture(paint);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;

	// the shape of the face, as soft-edged maps: the muzzle (swells out), the
	// eye mask (sinks back flat into the head), a ridge round the mask (stands up)
	const H = 256, k = H / px;
	const map = (draw, blur) => {
		const c = document.createElement('canvas');
		c.width = c.height = H;
		const h = c.getContext('2d');
		h.filter = 'blur(' + blur + 'px)';
		h.save();
		h.scale(k, k);
		toRef(h);
		h.fillStyle = h.strokeStyle = '#fff';
		draw(h);
		h.restore();
		const d = h.getImageData(0, 0, H, H).data;
		const at = (x, y) => d[(Math.max(0, Math.min(H - 1, y)) * H + Math.max(0, Math.min(H - 1, x))) * 4] / 255;
		return (u, v) => {   // (read smoothly between pixels: no steps in the surface)
			const fx = u * (H - 1), fy = (1 - v) * (H - 1);
			const x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y;
			return (at(x, y) * (1 - tx) + at(x + 1, y) * tx) * (1 - ty) + (at(x, y + 1) * (1 - tx) + at(x + 1, y + 1) * tx) * ty;
		};
	};
	const muzzleAt = map((h) => { muzzlePath(h); h.fill(); }, 5);
	const eyesAt = map((h) => { maskPath(h); h.fill(); }, 2);
	const ridgeAt = map((h) => { h.lineWidth = 46; maskPath(h); h.stroke(); }, 4);
	const RISE = { muzzle: 0.085, ridge: 0.028, sink: 0.82 };   // metres out, metres up, and the eyes' flat plane (a fraction of R in front of the middle)

	// Shape a point on the front of the head (in the skull's space): the muzzle
	// swells, the ridge stands up, the eyes sink back to a flat plane. lift
	// keeps the painted shell just over the head.
	function shape(n, lift = 0) {
		if (n.z > 0.02) return n;
		const u = 0.5 - n.x / span, v = n.y / span + 0.5;   // (facing -z: the picture's right is the head's -x, as you look at it)
		n.multiplyScalar(1 + (muzzleAt(u, v) * RISE.muzzle + ridgeAt(u, v) * RISE.ridge) / R);
		const e = eyesAt(u, v);
		const plane = -R * RISE.sink - lift;
		if (e > 0 && n.z < plane) n.z += (plane - n.z) * e;
		return n;
	}

	// the shells: the front of the sphere (WINDOW), shaped, its UVs projected
	// straight on from the front. Two from one grid: a skin-coloured one (the
	// front of the head) and the painted face just over it, so they can't cross.
	const shell = (lift) => {
		const geo = new THREE.SphereGeometry(R, 96, 72, WINDOW.phi0, WINDOW.phi, WINDOW.theta0, WINDOW.theta);
		const pos = geo.attributes.position, uv = geo.attributes.uv, n = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			n.set(pos.getX(i), pos.getY(i), pos.getZ(i));
			uv.setXY(i, 0.5 - n.x / span, n.y / span + 0.5);
			n.multiplyScalar(1 + lift);
			deform(shape(n, R * lift));
			pos.setXYZ(i, n.x, n.y, n.z);
		}
		geo.computeVertexNormals();
		return geo;
	};
	const mesh = new THREE.Mesh(shell(0.014), glossy(0xffffff, { map: tex, alphaTest: 0.5, transparent: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));   // (always drawn over the skin under it)
	mesh.castShadow = true;
	const underGeo = shell(0.002);

	// the nose: where the mask meets the muzzle, on the swollen surface
	const nu = (px / 2 + (362 - ox) * s) / px, nv = 1 - (cy + (478 - oy) * s) / px;
	const nx = (0.5 - nu) * span, ny = (nv - 0.5) * span;
	const nose = shape(new THREE.Vector3(nx, ny, -Math.sqrt(Math.max(0, R * R - nx * nx - ny * ny))));
	nose.z -= 0.02;
	// (the head itself takes the same shape, so the shell fits it)
	return { mesh, underGeo, nose: deform(nose), shape };
}

/* ---------- the speedster ---------- */

export function buildSpeedster(colour) {
	const root = new THREE.Group();   // placed in the world
	const lean = new THREE.Group();   // tilts, leans and tumbles
	root.add(lean);

	const skin = glossy(colour);
	const tan = glossy(0xf6d2a2, { clearcoat: 0.5, roughness: 0.38 });
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
	for (const s of [-1, 1]) torso.add(spike(skin, V(s * 0.07, 0.36, 0.14), V(s * 0.12, 0.31, 0.32), V(s * 0.14, 0.38, 0.48), 0.11));

	// the head
	const head = new THREE.Group();
	head.position.set(0, 0.78, -0.02);
	torso.add(head);
	// a bean: a little long front to back, a little wide, arched (seen from the side, its
	// top rounds over and its underside curves in). The face, quills and ears bend with it.
	const bean = (v) => { v.x *= 1.06; v.z *= 1.1; v.y -= 0.5 * v.z * v.z; return v; };
	const B = (x, y, z) => bean(V(x, y, z));
	const face = buildFace(0.4, bean);
	const headGeo = new THREE.SphereGeometry(0.4, 96, 72);
	{
		const pos = headGeo.attributes.position, v = V(0, 0, 0);
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			// inside the face's window, sink a little (the skin shell is the front of the head there)
			const theta = Math.acos(Math.max(-1, Math.min(1, v.y / 0.4)));
			let phi = Math.atan2(v.z, -v.x);
			if (phi < 0) phi += Math.PI * 2;
			const edge = Math.min(phi - WINDOW.phi0, WINDOW.phi0 + WINDOW.phi - phi, theta - WINDOW.theta0, WINDOW.theta0 + WINDOW.theta - theta);
			if (edge > 0) v.multiplyScalar(1 - 0.32 * Math.min(1, edge / 0.25));   // (well behind the eyes' flat recess)
			bean(v);
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		headGeo.computeVertexNormals();
	}
	add(head, headGeo, skin, 0, 0, 0.02);
	// the quills: big ones, thick at the root, tapering and curving back
	const Q = [
		[0.21, -0.02, 0.56, 0.2], [-0.21, -0.02, 0.56, 0.2],
		[0, -0.19, 0.52, 0.19],
	];
	for (const [x, y, len, r] of Q) {
		const a = B(x * 0.7, y + 0.04, 0.06);
		const b = B(x * 1.7, y - 0.12 + Math.abs(x) * 0.15, 0.3 + len);
		const c = B(x * 1.25, y + 0.12, 0.3 + len * 0.45);
		head.add(spike(skin, a, c, b, r, 0.004, 14, 0.45));
	}
	// the top quill: set forward, rising out of the top of the head and sweeping back over it, hugging its curve
	head.add(spike(skin, B(0, 0.3, -0.03), B(0, 0.52, 0.2), B(0, 0.26, 0.7), 0.2, 0.004, 14, 0.45));
	// ears: a skin cone with a tan inside
	for (const s of [-1, 1]) {
		head.add(spike(skin, B(s * 0.19, 0.25, 0.06), B(s * 0.26, 0.38, 0.06), B(s * 0.28, 0.5, 0.12), 0.1, 0.004, 14, 0.35));
		head.add(spike(tan, B(s * 0.2, 0.29, 0.02), B(s * 0.25, 0.37, 0.02), B(s * 0.27, 0.46, 0.08), 0.055));
	}
	// the face: one shell over the front of the skull, painted from the
	// classic shape (one white mask holding both eyes, notched between them;
	// a wide tan crescent of a muzzle with a smirk), the muzzle and eyes
	// swelling out of the head along their own outlines; the nose a glossy ball
	const skull = new THREE.Group();
	skull.position.set(0, 0, 0.02);
	head.add(skull);
	skull.add(face.mesh);
	add(skull, face.underGeo, skin);   // (the front of the head, shaped: the eyes' flat recess, the ridge, the muzzle)
	add(skull, new THREE.SphereGeometry(0.052, 20, 14), black, face.nose.x, face.nose.y, face.nose.z);

	// gloves: a puffy hand, a thumb and a rolled cuff
	function buildGlove() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.14, 24, 18), glove, 0, 0, 0, 1, 1.05, 1.1);
		add(g, new THREE.SphereGeometry(0.06, 14, 10), glove, 0.085, 0.055, -0.085);
		const cuff = add(g, new THREE.TorusGeometry(0.085, 0.04, 10, 24), glove, 0, 0.13, 0);
		cuff.rotation.x = Math.PI / 2;
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
	const arms = [-1, 1].map((s) => ({ s, tube: hose(skin, 0.032, 0.028), glove: buildGlove(), shoulder: V(s * 0.17, 0.38, 0.0) }));
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
		elbow.lerpVectors(sh, hand, 0.5).add(tmp.set(a.s * bowOut, 0.02, bowBack));
		a.tube.update(sh, elbow, hand);
		// the glove, on the end of the arm: its cuff over the arm's end, turned
		// up the arm (the way it leaves the elbow), carried into the lean's space
		const out = gloveDir.subVectors(hand, elbow).normalize();
		gloveQ.setFromUnitVectors(UP, out.clone().negate());
		torso.updateMatrix();
		a.glove.position.copy(hand).addScaledVector(out, GLOVE_REACH).applyMatrix4(torso.matrix);
		a.glove.quaternion.copy(torso.quaternion).multiply(gloveQ);
	}
	const gloveDir = V(0, 0, 0), gloveQ = new THREE.Quaternion(), UP = V(0, 1, 0);
	const GLOVE_REACH = 0.1;   // (from the arm's end to the middle of the glove: the cuff sits on the end)

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
			for (const a of arms) placeArm(a, a.s * 0.2, 0.1, 0.04, 0.26, 0.05);   // (hands on hips, long arms akimbo)
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
		whirlMat.color.set(c);
	}

	animate(0, 'idle');
	return { root, lean, torso, head, ball, animate, setColour };
}
