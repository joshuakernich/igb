/*
 * The speedster: an original glossy, spiky little runner in any colour,
 * built for three.js (shared by Sonic Dash and Quill Relay; deliberately
 * not Sega's character). A big round head with tapered, swept-back quills,
 * wide eyes with a glint, a muzzle and a grin; puffy gloves; chunky
 * sneakers; and noodly rubber-hose arms and legs, rebuilt every frame as
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

function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }, extra));
}

/* ---------- tubes ---------- */

// A tapered tube along a quadratic curve a → c → b, radius r0 at a to r1 at
// b (with a little swell in the middle, like a rubber hose). update() moves
// it; the mesh's vertices are rewritten in place.
function hose(mat, r0, r1, { segs = 16, radial = 10, swell = 0.12, capA = true, capB = true } = {}) {
	const rings = segs + 1;
	const ringVerts = radial + 1;
	const count = rings * ringVerts + (capA ? 1 : 0) + (capB ? 1 : 0);
	const pos = new Float32Array(count * 3);
	const nor = new Float32Array(count * 3);
	const idx = [];
	for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
		const a = i * ringVerts + j, b = a + ringVerts;
		idx.push(a, b, a + 1, b, b + 1, a + 1);
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
			const r = (r0 + (r1 - r0) * t) * (1 + swell * Math.sin(Math.PI * t));
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
function spike(mat, a, c, b, r0, r1 = 0.004, segs = 14) {
	const m = hose(mat, r0, r1, { segs, radial: 12, swell: 0.05, capA: true, capB: false });
	m.update(a, c, b);
	m.geometry.computeBoundingSphere();
	m.frustumCulled = true;
	return m;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

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
	const sole = glossy(0x2a2a34, { roughness: 0.5, clearcoat: 0.3 });
	const strap = glossy(0xffc23a, { metalness: 0.6, roughness: 0.22 });
	const accent = glossy(0xff3b3b, { roughness: 0.25 });
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
	// the torso pivots at the hips, so it can lean into the run
	const torso = new THREE.Group();
	torso.position.y = HIP_Y;
	lean.add(torso);
	add(torso, new THREE.SphereGeometry(0.3, 32, 24), skin, 0, 0.3, 0, 1, 1.18, 0.95);       // the body, egg-shaped
	add(torso, new THREE.SphereGeometry(0.22, 28, 20), tan, 0, 0.27, -0.13, 0.95, 1.12, 0.62);  // the tummy
	add(torso, new THREE.SphereGeometry(0.2, 24, 16), skin, 0, 0.02, 0.0, 1.1, 0.7, 1.0);      // the seat
	// a stubby tail and two quills down the back
	torso.add(spike(skin, V(0, 0.08, 0.22), V(0, 0.02, 0.36), V(0, 0.1, 0.46), 0.07));
	for (const s of [-1, 1]) torso.add(spike(skin, V(s * 0.1, 0.42, 0.22), V(s * 0.16, 0.36, 0.42), V(s * 0.18, 0.44, 0.6), 0.09));

	// the head
	const head = new THREE.Group();
	head.position.set(0, 0.86, -0.02);
	torso.add(head);
	add(head, new THREE.SphereGeometry(0.4, 40, 30), skin, 0, 0, 0.02, 1.02, 0.96, 1.05);
	// the quills: tapered and curving back, a fan of six
	const Q = [
		[0, 0.18, 0.62, 0.15],
		[0.2, 0.08, 0.55, 0.13], [-0.2, 0.08, 0.55, 0.13],
		[0.16, -0.14, 0.5, 0.12], [-0.16, -0.14, 0.5, 0.12],
		[0, -0.06, 0.66, 0.14],
	];
	for (const [x, y, len, r] of Q) {
		const a = V(x * 0.8, y + 0.04, 0.12);
		const b = V(x * 1.7, y - 0.12 + Math.abs(x) * 0.15, 0.3 + len);
		const c = V(x * 1.25, y + 0.12, 0.3 + len * 0.45);
		head.add(spike(skin, a, c, b, r));
	}
	// ears: a skin cone with a tan inside
	for (const s of [-1, 1]) {
		head.add(spike(skin, V(s * 0.2, 0.26, 0.06), V(s * 0.26, 0.38, 0.06), V(s * 0.28, 0.5, 0.12), 0.1));
		head.add(spike(tan, V(s * 0.2, 0.28, 0.02), V(s * 0.25, 0.37, 0.02), V(s * 0.27, 0.46, 0.08), 0.055));
	}
	// the muzzle, the nose, a grin
	add(head, new THREE.SphereGeometry(0.2, 28, 20), tan, 0, -0.13, -0.3, 1.25, 0.82, 0.95);
	add(head, new THREE.SphereGeometry(0.055, 16, 12), black, 0, -0.06, -0.5, 1.2, 0.9, 1);
	const grin = add(head, new THREE.TorusGeometry(0.075, 0.012, 8, 20, Math.PI * 0.8), black, 0.0, -0.17, -0.47);
	grin.rotation.set(0.35, 0, Math.PI + Math.PI * 0.1);
	// the eyes: two big white ovals meeting in the middle, dark pupils, a glint
	const pupils = [];
	for (const s of [-1, 1]) {
		const e = add(head, new THREE.SphereGeometry(0.13, 24, 18), white, s * 0.1, 0.08, -0.3, 0.85, 1.3, 0.62);
		e.rotation.z = s * 0.12;
		const p = add(head, new THREE.SphereGeometry(0.06, 16, 12), black, s * 0.085, 0.07, -0.375, 0.9, 1.25, 0.6);
		add(p, new THREE.SphereGeometry(0.018, 8, 6), glint, s * -0.012, 0.025, -0.05).castShadow = false;
		pupils.push(p);
	}
	// a brow ridge of skin above the eyes
	add(head, new THREE.SphereGeometry(0.16, 20, 12), skin, 0, 0.2, -0.25, 1.6, 0.5, 0.9);

	// gloves: a puffy hand, a thumb and a rolled cuff
	function buildGlove() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.1, 20, 14), glove, 0, 0, 0, 1, 1.05, 1.1);
		add(g, new THREE.SphereGeometry(0.045, 12, 10), glove, 0.06, 0.04, -0.06);
		const cuff = add(g, new THREE.TorusGeometry(0.07, 0.035, 10, 20), glove, 0, 0.09, 0);
		cuff.rotation.x = Math.PI / 2;
		lean.add(g);
		return g;
	}
	// sneakers: a chunky white upper, a dark sole, a gold strap, a red toe
	function buildShoe() {
		const g = new THREE.Group();
		add(g, new THREE.CapsuleGeometry(0.1, 0.22, 8, 16), white, 0, 0.08, -0.06, 1, 0.82, 1).rotation.x = Math.PI / 2;
		add(g, new THREE.CapsuleGeometry(0.105, 0.24, 6, 16), sole, 0, 0.02, -0.06, 1.05, 0.38, 1).rotation.x = Math.PI / 2;
		add(g, new THREE.SphereGeometry(0.1, 16, 12), accent, 0, 0.08, -0.25, 0.95, 0.75, 0.7);
		const band = add(g, new THREE.TorusGeometry(0.1, 0.028, 8, 20), strap, 0, 0.1, -0.02);
		band.scale.set(1, 0.85, 1);
		add(g, new THREE.SphereGeometry(0.07, 12, 10), white, 0, 0.17, 0.04, 1, 0.8, 1);   // the collar
		lean.add(g);
		return g;
	}

	// the noodle limbs: legs from the hips, arms from the shoulders
	const legs = [-1, 1].map((s) => ({ s, tube: hose(skin, 0.07, 0.055), shoe: buildShoe(), hip: V(s * 0.13, HIP_Y + 0.02, 0) }));
	const arms = [-1, 1].map((s) => ({ s, tube: hose(tan, 0.05, 0.042), glove: buildGlove(), shoulder: V(s * 0.27, 0.48, -0.02) }));
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
	for (let i = 0; i < 16; i++) {
		const a = i / 16 * TAU;
		const side = (i % 3) - 1;
		const dir = V(side * 0.45, Math.cos(a), Math.sin(a)).normalize();
		const tip = dir.clone().multiplyScalar(0.82).add(V(0, 0, 0.18 * Math.sin(a + 1)));
		ball.add(spike(skin, dir.clone().multiplyScalar(0.3), dir.clone().multiplyScalar(0.56).add(V(0, 0.08, 0.1)), tip, 0.13));
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
		hipW.copy(l.hip).add(V(0, torso.position.y - HIP_Y, 0));
		foot.set(fx, fy + 0.12, fz);
		const L = 0.53;   // (the leg's length: shorter than this, it bows)
		const dist = hipW.distanceTo(foot);
		const bow = Math.sqrt(Math.max(0, L * L - dist * dist)) * 0.75 + 0.03;
		knee.lerpVectors(hipW, foot, 0.5).add(tmp.set(l.s * 0.03, 0, -bow));
		l.tube.update(hipW, knee, foot);
		l.shoe.position.set(fx, fy, fz + 0.04);
		l.shoe.rotation.set(toe, 0, 0);
	}
	// An arm from its shoulder to a hand at (hx, hy, hz) in the torso's space;
	// the elbow bows out and back.
	function placeArm(a, hx, hy, hz, bowOut = 0.08, bowBack = 0.1) {
		sh.copy(a.shoulder);
		hand.set(hx, hy, hz);
		elbow.lerpVectors(sh, hand, 0.5).add(tmp.set(a.s * bowOut, 0.02, bowBack));
		a.tube.update(sh, elbow, hand);
		// the glove sits in the lean's space: carry the torso-space hand across
		torso.updateMatrix();
		a.glove.position.copy(hand).applyMatrix4(torso.matrix);
		a.glove.quaternion.copy(torso.quaternion);
	}

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
		for (const p of pupils) p.position.y = 0.07;

		if (mode === 'crouch') {
			show(false);
			torso.position.y = HIP_Y - 0.2;
			torso.rotation.x = -0.5;
			head.rotation.x = 0.4;
			for (const l of legs) placeLeg(l, l.s * 0.16, 0, -0.12, 0.1);
			for (const a of arms) placeArm(a, a.s * 0.2, 0.2, -0.32, 0.05, -0.05);
			return;
		}
		if (mode === 'spring') {
			show(false);
			torso.rotation.x = 0.1;
			head.rotation.x = -0.25;
			for (const l of legs) placeLeg(l, l.s * 0.12, -0.02 + (l.s > 0 ? 0.06 : 0), 0.02 * l.s, -0.25);
			for (const a of arms) placeArm(a, a.s * 0.32, 1.02, -0.05, 0.08, 0.0);
			return;
		}
		if (mode === 'hurt') {
			show(false);
			torso.rotation.x = 0.5;
			head.rotation.x = -0.4;
			const flail = Math.sin(time * 30);
			for (const l of legs) placeLeg(l, l.s * 0.18, 0.2 + l.s * 0.08, -0.25 * l.s, 0.4);
			for (const a of arms) placeArm(a, a.s * (0.5 + 0.08 * flail * a.s), 0.75 + 0.15 * flail * a.s, -0.1, 0.06, 0.05);
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
			for (const a of arms) placeArm(a, a.s * 0.25, 0.1, 0.02, 0.16, 0.04);   // (hands on hips, elbows out)
			return;
		}

		// running: the feet go round in loops, the arms pump against them
		show(true);
		cycle += dt * (7 + pace * 24);
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
			const hx = a.s * (0.3 + 0.03 * c);
			const hy = 0.2 + 0.1 * c * pump + (1 - pump) * 0.18;
			const hz = (-0.2 * s) * pump + (1 - pump) * (0.42 + 0.03 * s);
			placeArm(a, hx, hy, hz, 0.1, 0.06 + (1 - pump) * 0.1);
		}
		torso.position.y = HIP_Y + Math.abs(Math.sin(cycle)) * 0.05 * (1 - pace * 0.6);
		torso.rotation.x = -0.35 * pace - 0.06;
		head.rotation.x = 0.25 * pace + 0.04;
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
