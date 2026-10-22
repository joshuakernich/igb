/*
 * Doctor Robotnik, in three.js, to stand alongside the speedster family
 * (shared/speedster3d.js): a great red egg of a body on thin black legs, a
 * bald head with a pink nose and a huge ginger moustache, round blue glasses,
 * goggles pushed up on his forehead, white gloves on noodle arms.
 *
 *   const r = buildRobotnik();
 *   scene.add(r.root);
 *   r.animate(dt, mode, pace, spin, time);   // mode: 'idle' | 'run' (the rest stand idle)
 *
 * Faces -z, feet on y = 0, about 1.9 m tall.
 */
import * as THREE from '../lib/three/three.module.min.js';
import { glossy, hose } from './speedster3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildRobotnik() {
	const root = new THREE.Group();
	const lean = new THREE.Group();
	root.add(lean);

	const coat = glossy(0xd62a28, { roughness: 0.45, clearcoat: 0.3 });
	const trim = glossy(0xf2c230, { roughness: 0.3, metalness: 0.3 });
	const dark = glossy(0x1a1a20, { roughness: 0.4 });
	const skin = new THREE.MeshPhysicalMaterial({ color: 0xf2c49a, roughness: 0.55, sheen: 0.4, sheenColor: 0xffe2c8 });
	const nosePink = glossy(0xf09a8a, { roughness: 0.35 });
	const tache = new THREE.MeshPhysicalMaterial({ color: 0xc8602a, roughness: 0.7, sheen: 1, sheenColor: 0xffa060, sheenRoughness: 0.5 });
	const glove = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.55, sheen: 1, sheenColor: 0xffffff });
	const lens = new THREE.MeshPhysicalMaterial({ color: 0x5aa8ff, roughness: 0.05, metalness: 0.2, clearcoat: 1, transmission: 0, opacity: 0.85, transparent: true });
	const goggleLens = new THREE.MeshPhysicalMaterial({ color: 0xff9a2a, roughness: 0.1, metalness: 0.3, clearcoat: 1 });
	const steel = glossy(0x9aa0aa, { metalness: 0.85, roughness: 0.3 });

	const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		parent.add(m);
		return m;
	};

	const HIP_Y = 0.62;
	const body = new THREE.Group();   // everything above the legs
	body.position.y = HIP_Y;
	lean.add(body);

	// the egg: a big round red coat, wider at the belly, a black band round its waist,
	// gold buttons and a gold zip down the front
	add(body, new THREE.SphereGeometry(0.5, 40, 32), coat, 0, 0.45, 0, 1, 1.08, 0.92);
	const band = add(body, new THREE.TorusGeometry(0.43, 0.035, 12, 48), dark, 0, 0.12, 0, 1, 1, 0.94);
	band.rotation.x = Math.PI / 2;
	add(body, new THREE.BoxGeometry(0.03, 0.62, 0.02), trim, 0, 0.5, -0.455).rotation.x = 0.12;
	for (const [y, z] of [[0.68, -0.43], [0.5, -0.46], [0.32, -0.45]]) for (const s of [-1, 1]) add(body, new THREE.SphereGeometry(0.028, 12, 10), trim, s * 0.1, y, z);
	// a high black collar under the chin
	add(body, new THREE.CylinderGeometry(0.17, 0.22, 0.12, 24), dark, 0, 0.98, 0.02);

	// the head: bald and round, a big pink nose, the moustache, glasses and goggles
	const head = new THREE.Group();
	head.position.set(0, 1.2, 0);
	body.add(head);
	add(head, new THREE.SphereGeometry(0.27, 36, 28), skin, 0, 0, 0, 1, 1.05, 1);
	add(head, new THREE.SphereGeometry(0.075, 20, 16), nosePink, 0, -0.04, -0.27, 1, 0.9, 1);
	// the moustache: two thick bristling sweeps out from under the nose, up at the tips
	for (const s of [-1, 1]) {
		const m = hose(tache, 0, 0, { segs: 24, radial: 14, capA: true, capB: true, profile: (t) => Math.max(0.01, 0.085 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) * (1 - 0.4 * t)) });
		m.update(V(s * 0.02, -0.1, -0.27), V(s * 0.28, -0.2, -0.22), V(s * 0.42, -0.02, -0.08));
		m.geometry.computeBoundingSphere();
		head.add(m);
	}
	// round blue glasses where the eyes would be, on a little bridge
	for (const s of [-1, 1]) {
		const l = add(head, new THREE.CylinderGeometry(0.06, 0.06, 0.015, 24), lens, s * 0.085, 0.05, -0.255);
		l.rotation.x = Math.PI / 2;
		const rim = add(head, new THREE.TorusGeometry(0.062, 0.008, 8, 24), dark, s * 0.085, 0.05, -0.262);
		rim.rotation.y = s * 0.18;
		l.rotation.z = s * 0.18;
	}
	add(head, new THREE.BoxGeometry(0.05, 0.01, 0.01), dark, 0, 0.06, -0.27);
	// goggles pushed up on his forehead, on a strap round the head
	const strap = add(head, new THREE.TorusGeometry(0.272, 0.02, 10, 48), dark, 0, 0.13, 0.0, 1, 1, 1);
	strap.rotation.x = Math.PI / 2 - 0.3;
	for (const s of [-1, 1]) {
		const cup = add(head, new THREE.CylinderGeometry(0.06, 0.066, 0.05, 24), steel, s * 0.085, 0.2, -0.225);
		cup.rotation.x = Math.PI / 2 - 0.55;
		const gl = add(head, new THREE.CircleGeometry(0.05, 24), goggleLens, s * 0.085, 0.215, -0.252);
		gl.rotation.x = -0.55;
		gl.rotation.y = Math.PI;
	}

	// arms: red sleeves from the shoulders, white gloves (a ball of a hand, a thumb, a cuff)
	function buildHand() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.085, 20, 16), glove, 0, -0.06, 0, 1, 1.1, 0.85);
		add(g, new THREE.SphereGeometry(0.035, 12, 10), glove, 0.06, -0.03, -0.03);
		const cuff = add(g, new THREE.TorusGeometry(0.07, 0.03, 10, 24), glove, 0, 0.0, 0);
		cuff.rotation.x = Math.PI / 2;
		lean.add(g);
		return g;
	}
	const arms = [-1, 1].map((s) => ({ s, tube: hose(coat, 0.07, 0.055), hand: buildHand(), shoulder: V(s * 0.38, 0.72, 0) }));
	for (const a of arms) body.add(a.tube);
	// legs: thin and black, into round black boots
	function buildBoot() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.15, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), dark, 0, 0.0, -0.06, 1, 1.0, 1.5);
		add(g, new THREE.CylinderGeometry(0.075, 0.09, 0.14, 20), dark, 0, 0.1, 0.0);
		lean.add(g);
		return g;
	}
	const legs = [-1, 1].map((s) => ({ s, tube: hose(dark, 0.05, 0.045), boot: buildBoot(), hip: V(s * 0.17, 0.08, 0) }));
	for (const l of legs) lean.add(l.tube);

	const tmp = V(0, 0, 0), hip = V(0, 0, 0), knee = V(0, 0, 0), foot = V(0, 0, 0), sh = V(0, 0, 0), elbow = V(0, 0, 0), hand = V(0, 0, 0);
	function placeLeg(l, fx, fy, fz) {
		body.updateMatrix();
		hip.copy(l.hip).applyMatrix4(body.matrix);
		l.boot.position.set(fx, fy, fz);
		foot.set(fx, fy + 0.17, fz);
		const L = 0.66, d = hip.distanceTo(foot);
		const bow = Math.sqrt(Math.max(0, L * L - d * d)) * 0.6;
		knee.lerpVectors(hip, foot, 0.5).add(tmp.set(l.s * 0.02, 0, -bow));
		l.tube.update(hip, knee, foot);
	}
	function placeArm(a, hx, hy, hz) {
		sh.copy(a.shoulder);
		hand.set(hx, hy, hz);
		elbow.lerpVectors(sh, hand, 0.5).add(tmp.set(a.s * 0.08, 0, 0.06));
		a.tube.update(sh, elbow, hand);
		body.updateMatrix();
		a.hand.position.copy(hand).applyMatrix4(body.matrix);
		a.hand.quaternion.copy(body.quaternion);
	}

	let cycle = 0;
	function animate(dt, mode = 'idle', pace = 0, spin = 0, time = 0) {
		body.position.y = HIP_Y;
		body.rotation.set(0, 0, 0);
		head.rotation.set(0, 0, 0);
		if (mode === 'run' && pace > 0.04) {
			// a waddling trot, the egg bobbing, the arms pumping
			cycle += dt * (6 + pace * 10);
			const sn = Math.sin(cycle), cs = Math.cos(cycle);
			body.position.y = HIP_Y + Math.abs(sn) * 0.05;
			body.rotation.z = sn * 0.06;
			body.rotation.x = -0.1 * pace;
			for (const l of legs) {
				const ph = l.s > 0 ? sn : -sn;
				placeLeg(l, l.s * 0.18, Math.max(0, (l.s > 0 ? cs : -cs)) * 0.12, -ph * 0.22);
			}
			for (const a of arms) {
				const ph = a.s > 0 ? -sn : sn;
				placeArm(a, a.s * 0.56, 0.42 + Math.abs(ph) * 0.06, -ph * 0.3);
			}
			return;
		}
		// idle: rocking on his heels, hands on his hips (or near enough), plotting
		const rock = Math.sin(time * 1.6);
		body.position.y = HIP_Y + Math.abs(Math.sin(time * 1.6)) * 0.012;
		body.rotation.x = rock * 0.025;
		head.rotation.y = Math.sin(time * 0.7) * 0.15;
		for (const l of legs) placeLeg(l, l.s * 0.2, 0, 0);
		for (const a of arms) placeArm(a, a.s * 0.6, 0.32 + rock * 0.02, 0.0);
	}

	animate(0, 'idle');
	return { root, lean, body, head, animate, setColour() {} };
}
