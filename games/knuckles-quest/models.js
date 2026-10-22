/*
 * Knuckles Quest: the models. The climber (a red, spiky, big-fisted
 * adventurer with long dreadlock quills, built from the same sculpted
 * tubes and noodly rubber-hose limbs as the speedster), rings, emerald
 * fragments, the tap marker, braziers and sprite textures.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { glossy, hose, spike } from '../../shared/speedster3d.js';
import { canvasTexture } from '../../lib/three/walls.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- the climber ---------- */

// Faces -z, feet on y = 0. animate(dt, mode, pace, time) with mode
// 'idle' | 'run' | 'jump' (a spinning ball) | 'glide' | 'climb' | 'fall'.
// In 'climb' the wall is in front of him (-z) and pace is how fast he's
// climbing (signed: + up).
export function buildClimber() {
	const root = new THREE.Group();
	const lean = new THREE.Group();
	root.add(lean);

	const red = glossy(0xd8262e, { roughness: 0.32 });
	const tan = glossy(0xf2c79a, { clearcoat: 0.5, roughness: 0.38 });
	const white = glossy(0xffffff, { clearcoat: 0.9, roughness: 0.25 });
	const mitt = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4 });
	const black = glossy(0x0c0c14, { roughness: 0.15 });
	const shoeA = glossy(0x2fb24a, { roughness: 0.3 });
	const shoeB = glossy(0xffd23a, { roughness: 0.3 });
	const plate = glossy(0xe8e8f0, { metalness: 0.8, roughness: 0.2 });
	const violet = glossy(0x7a3fd8, { roughness: 0.15 });
	const glint = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) });

	const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		parent.add(m);
		return m;
	};

	const HIP_Y = 0.58;
	const torso = new THREE.Group();
	torso.position.y = HIP_Y;
	lean.add(torso);
	add(torso, new THREE.SphereGeometry(0.33, 32, 24), red, 0, 0.32, 0, 1.05, 1.15, 0.95);
	add(torso, new THREE.SphereGeometry(0.22, 24, 16), red, 0, 0.03, 0, 1.15, 0.7, 1.0);
	// the white crescent on his chest
	const crescent = add(torso, new THREE.TorusGeometry(0.17, 0.05, 10, 28, Math.PI), white, 0, 0.44, -0.27);
	crescent.rotation.set(0.35, 0, Math.PI);
	crescent.scale.set(1.2, 0.8, 0.6);
	// spikes on the shoulders' backs
	for (const s of [-1, 1]) torso.add(spike(red, V(s * 0.12, 0.45, 0.22), V(s * 0.2, 0.42, 0.38), V(s * 0.24, 0.48, 0.5), 0.07));

	// the head: a long muzzle, a broad brow, violet eyes and a grin
	const head = new THREE.Group();
	head.position.set(0, 0.92, -0.02);
	torso.add(head);
	add(head, new THREE.SphereGeometry(0.39, 40, 30), red, 0, 0, 0.02, 1.05, 0.95, 1.05);
	add(head, new THREE.SphereGeometry(0.21, 28, 20), tan, 0, -0.14, -0.31, 1.25, 0.82, 1.05);
	add(head, new THREE.SphereGeometry(0.06, 16, 12), black, 0, -0.07, -0.53, 1.2, 0.9, 1);
	const grin = add(head, new THREE.TorusGeometry(0.08, 0.013, 8, 20, Math.PI * 0.8), black, 0.02, -0.19, -0.48);
	grin.rotation.set(0.35, 0, Math.PI + Math.PI * 0.12);
	for (const s of [-1, 1]) {
		const e = add(head, new THREE.SphereGeometry(0.12, 24, 18), white, s * 0.1, 0.07, -0.29, 0.85, 1.25, 0.62);
		e.rotation.z = s * 0.15;
		const p = add(head, new THREE.SphereGeometry(0.055, 16, 12), violet, s * 0.085, 0.06, -0.365, 0.9, 1.2, 0.6);
		add(p, new THREE.SphereGeometry(0.017, 8, 6), glint, s * -0.012, 0.025, -0.05).castShadow = false;
	}
	add(head, new THREE.SphereGeometry(0.17, 20, 12), red, 0, 0.18, -0.23, 1.65, 0.55, 0.9);   // the brow
	// the dreadlocks: four long, heavy quills hanging down his back
	const DREADS = [[-0.16, 0.12, 0.62], [0.16, 0.12, 0.62], [-0.22, -0.08, 0.55], [0.22, -0.08, 0.55], [0, 0.2, 0.66]];
	for (const [x, y, len] of DREADS) {
		const a = V(x * 0.8, y + 0.05, 0.12);
		const c = V(x * 1.3, y + 0.05, 0.42);
		const b = V(x * 1.5, y - len * 0.75, 0.36 + len * 0.25);
		head.add(spike(red, a, c, b, 0.13));
	}
	// a little tuft on top
	head.add(spike(red, V(0, 0.32, 0.0), V(0, 0.46, 0.06), V(0.05, 0.52, 0.2), 0.06));

	// the fists: big white mitts with two spikes over the knuckles
	function buildFist() {
		const g = new THREE.Group();
		add(g, new THREE.SphereGeometry(0.15, 22, 16), mitt, 0, 0, 0, 1.05, 1, 1.15);
		const cuff = add(g, new THREE.TorusGeometry(0.1, 0.045, 10, 20), mitt, 0, 0.12, 0);
		cuff.rotation.x = Math.PI / 2;
		for (const s of [-1, 1]) g.add(spike(white, V(s * 0.05, 0.02, -0.1), V(s * 0.055, 0.02, -0.18), V(s * 0.06, 0.03, -0.27), 0.04, 0.004, 8));
		lean.add(g);
		return g;
	}
	function buildShoe() {
		const g = new THREE.Group();
		add(g, new THREE.CapsuleGeometry(0.11, 0.24, 8, 16), shoeA, 0, 0.09, -0.06, 1, 0.82, 1).rotation.x = Math.PI / 2;
		add(g, new THREE.CapsuleGeometry(0.115, 0.26, 6, 16), shoeB, 0, 0.02, -0.06, 1.05, 0.36, 1).rotation.x = Math.PI / 2;
		add(g, new THREE.BoxGeometry(0.16, 0.08, 0.12), plate, 0, 0.17, -0.05);
		add(g, new THREE.SphereGeometry(0.075, 12, 10), shoeA, 0, 0.19, 0.04, 1, 0.8, 1);
		lean.add(g);
		return g;
	}
	const legs = [-1, 1].map((s) => ({ s, tube: hose(red, 0.075, 0.06), shoe: buildShoe(), hip: V(s * 0.14, HIP_Y + 0.02, 0) }));
	const arms = [-1, 1].map((s) => ({ s, tube: hose(red, 0.06, 0.05), fist: buildFist(), shoulder: V(s * 0.3, 0.5, -0.02) }));
	for (const l of legs) lean.add(l.tube);
	for (const a of arms) torso.add(a.tube);

	// the ball: curled up, spinning
	const ball = new THREE.Group();
	ball.position.y = 0.55;
	ball.visible = false;
	lean.add(ball);
	add(ball, new THREE.SphereGeometry(0.44, 32, 24), red);
	for (let i = 0; i < 10; i++) {
		const a = i / 10 * TAU;
		const dir = V((i % 2 ? 0.3 : -0.3), Math.cos(a), Math.sin(a)).normalize();
		ball.add(spike(red, dir.clone().multiplyScalar(0.3), dir.clone().multiplyScalar(0.6).add(V(0, 0.1, 0.12)), dir.clone().multiplyScalar(0.86).add(V(0, 0, 0.15)), 0.14));
	}
	add(ball, new THREE.SphereGeometry(0.16, 16, 12), mitt, 0.2, -0.1, -0.36);
	add(ball, new THREE.SphereGeometry(0.16, 16, 12), mitt, -0.2, -0.1, -0.36);

	/* ---------- moving ---------- */

	let cycle = 0, climbPhase = 0;
	const hipW = V(0, 0, 0), foot = V(0, 0, 0), knee = V(0, 0, 0), sh = V(0, 0, 0), hand = V(0, 0, 0), elbow = V(0, 0, 0), tmp = V(0, 0, 0);

	// leg: hip → foot (in the lean's space); the knee bows toward kneeDir
	function placeLeg(l, fx, fy, fz, toe, kneeDir = -1) {
		hipW.copy(l.hip).applyMatrix4(torsoBase()).setY(l.hip.y + torso.position.y - HIP_Y);
		hipW.x = l.hip.x;
		foot.set(fx, fy + 0.13, fz);
		const L = 0.55;
		const dist = hipW.distanceTo(foot);
		const bow = Math.sqrt(Math.max(0, L * L - dist * dist)) * 0.75 + 0.03;
		knee.lerpVectors(hipW, foot, 0.5).add(tmp.set(l.s * 0.04, 0, bow * kneeDir));
		l.tube.update(hipW, knee, foot);
		l.shoe.position.set(fx, fy, fz + 0.04);
		l.shoe.rotation.set(toe, 0, 0);
	}
	const baseM = new THREE.Matrix4();
	function torsoBase() { return baseM.identity(); }
	// arm: shoulder → hand (in the torso's space); the fist follows in the lean's
	function placeArm(a, hx, hy, hz, bowOut = 0.1, bowBack = 0.08, fistTilt = 0) {
		sh.copy(a.shoulder);
		hand.set(hx, hy, hz);
		elbow.lerpVectors(sh, hand, 0.5).add(tmp.set(a.s * bowOut, 0.02, bowBack));
		a.tube.update(sh, elbow, hand);
		torso.updateMatrix();
		a.fist.position.copy(hand).applyMatrix4(torso.matrix);
		a.fist.quaternion.copy(torso.quaternion);
		a.fist.rotateX(fistTilt);
	}
	function body(visible) {
		torso.visible = visible;
		for (const l of legs) { l.tube.visible = visible; l.shoe.visible = visible; }
		for (const a of arms) { a.tube.visible = visible; a.fist.visible = visible; }
		ball.visible = !visible;
	}

	function animate(dt, mode = 'idle', pace = 0, time = 0) {
		lean.rotation.set(0, 0, 0);
		lean.position.set(0, 0, 0);
		torso.position.set(0, HIP_Y, 0);
		torso.rotation.set(0, 0, 0);
		head.rotation.set(0, 0, 0);
		if (mode === 'jump') {
			body(false);
			ball.rotation.x -= dt * 22;
			return;
		}
		body(true);
		if (mode === 'glide') {
			// flat out in the air, fists forward, legs trailing, a slow sway
			lean.rotation.x = -1.25;
			lean.position.y = 0.6;
			lean.rotation.z = Math.sin(time * 2.2) * 0.12;
			head.rotation.x = 1.0;
			for (const l of legs) placeLeg(l, l.s * 0.14, 0.05 + Math.sin(time * 3 + l.s) * 0.04, 0.32, 0.9, 1);
			for (const a of arms) placeArm(a, a.s * 0.18, 0.95, -0.42, 0.06, 0.02, -Math.PI / 2);
			return;
		}
		if (mode === 'fall') {
			torso.rotation.x = 0.15;
			head.rotation.x = -0.3;
			const f = Math.sin(time * 24);
			for (const l of legs) placeLeg(l, l.s * 0.18, 0.12 + l.s * f * 0.05, -0.1 * l.s * f, 0.3);
			for (const a of arms) placeArm(a, a.s * 0.5, 0.85 + a.s * f * 0.12, -0.05, 0.06, 0.05);
			return;
		}
		if (mode === 'climb') {
			// hugging the wall, fists over fists, feet pushing; pace + climbs, - comes down
			climbPhase += dt * pace * 5.5;
			const s = Math.sin(climbPhase), c = Math.cos(climbPhase);
			lean.position.z = 0.08;
			torso.rotation.x = 0.12;
			head.rotation.x = -0.2;
			for (const a of arms) {
				const ph = a.s > 0 ? s : -s;
				placeArm(a, a.s * 0.3, 0.75 + ph * 0.22, -0.32, 0.12, 0.08, -Math.PI / 2);
			}
			for (const l of legs) {
				const ph = l.s > 0 ? -s : s;
				placeLeg(l, l.s * 0.2, 0.12 + ph * 0.18, -0.22, -0.6, -1);
			}
			torso.position.y = HIP_Y + c * 0.03 * Math.min(1, Math.abs(pace));
			return;
		}
		if (mode === 'run' && pace > 0.04) {
			cycle += dt * (7 + pace * 20);
			const stride = 0.24 + pace * 0.14, lift = 0.12 + pace * 0.16;
			for (const l of legs) {
				const ph = cycle + (l.s > 0 ? Math.PI : 0);
				const sn = Math.sin(ph), cs = Math.cos(ph);
				const up = (1 - pace) * Math.max(0, cs) + pace * (0.5 + 0.5 * cs);
				placeLeg(l, l.s * 0.13, up * lift, -sn * stride - 0.04, -0.5 * cs * (0.4 + pace * 0.6));
			}
			for (const a of arms) {
				const ph = cycle + (a.s > 0 ? 0 : Math.PI);
				const sn = Math.sin(ph), cs = Math.cos(ph);
				// big fists pumping in loops
				placeArm(a, a.s * (0.33 + 0.03 * cs), 0.22 + 0.12 * cs, -0.24 * sn, 0.12, 0.08, -0.6 * sn);
			}
			torso.position.y = HIP_Y + Math.abs(Math.sin(cycle)) * 0.05;
			torso.rotation.x = -0.25 * pace - 0.05;
			head.rotation.x = 0.18 * pace;
			return;
		}
		// idle: a bounce, now and then a punch of fist into fist
		const punch = Math.max(0, Math.sin(time * 1.6)) ** 8;
		torso.position.y = HIP_Y + Math.abs(Math.sin(time * 3.5)) * 0.02;
		placeLeg(legs[0], -0.17, 0, 0.02, 0);
		placeLeg(legs[1], 0.17, 0, -0.02, 0);
		for (const a of arms) placeArm(a, a.s * (0.34 - punch * 0.24), 0.2 + punch * 0.25, -0.12 - punch * 0.22, 0.14, 0.04, -punch * 1.2);
	}

	animate(0, 'idle');
	return { root, lean, torso, head, animate };
}

/* ---------- things ---------- */

const shared = (g) => { g.userData.shared = true; return g; };
const RING_GEO = shared(new THREE.TorusGeometry(0.42, 0.09, 14, 36));
let ringMat = null;
export function buildRing() {
	ringMat = ringMat || new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.14, emissive: 0x9a5a00, emissiveIntensity: 1.1 });
	const m = new THREE.Mesh(RING_GEO, ringMat);
	m.castShadow = true;
	return m;
}

// An emerald fragment: a faceted green shard that glows (and blooms).
export function buildFragment() {
	const g = new THREE.Group();
	const mat = new THREE.MeshPhysicalMaterial({ color: 0x2dff7a, emissive: 0x18c050, emissiveIntensity: 2.2, roughness: 0.08, metalness: 0.1, clearcoat: 1, flatShading: true });
	const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
	shard.scale.set(0.75, 1.35, 0.75);
	shard.castShadow = true;
	g.add(shard);
	const chip = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), mat);
	chip.position.set(0.42, -0.3, 0.1);
	chip.scale.set(0.8, 1.3, 0.8);
	g.add(chip);
	g.userData.shard = shard;
	return g;
}

// Where a tap landed: a ring lying on the surface, in the tapper's colour.
export function buildMarker() {
	const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
	const m = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 40), mat);
	m.renderOrder = 5;
	return m;
}

// A bronze brazier on a bracket, its fire a pair of sprites.
export function buildBrazier(fireTex) {
	const g = new THREE.Group();
	const bronze = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, metalness: 0.8, roughness: 0.35 });
	const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.4, 16), bronze);
	bowl.castShadow = true;
	g.add(bowl);
	const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), bronze);
	arm.position.set(0, -0.15, 0.3);
	g.add(arm);
	const flames = [];
	for (let i = 0; i < 2; i++) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: new THREE.Color(0xffa040).multiplyScalar(3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
		s.position.y = 0.5 + i * 0.25;
		s.scale.set(0.9 - i * 0.3, 1.2 - i * 0.3, 1);
		g.add(s);
		flames.push(s);
	}
	g.userData.flames = flames;
	return g;
}

/* ---------- sprite textures ---------- */

export function glowTexture() {
	return canvasTexture(128, 128, function (g, w) {
		const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, w, w);
	});
}

export function fireTexture() {
	return canvasTexture(64, 128, function (g, w, h) {
		const r = g.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.6, h * 0.55);
		r.addColorStop(0, 'rgba(255,255,220,1)');
		r.addColorStop(0.3, 'rgba(255,190,80,0.9)');
		r.addColorStop(0.7, 'rgba(255,90,20,0.4)');
		r.addColorStop(1, 'rgba(200,40,10,0)');
		g.fillStyle = r;
		g.beginPath();
		g.moveTo(w / 2, 0);
		g.quadraticCurveTo(w, h * 0.6, w / 2, h);
		g.quadraticCurveTo(0, h * 0.6, w / 2, 0);
		g.fill();
	});
}

export function sparkleTexture() {
	return canvasTexture(64, 64, function (g, w) {
		const r = g.createRadialGradient(32, 32, 0, 32, 32, 30);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.3, 'rgba(255,255,255,0.6)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, w, w);
		g.fillStyle = 'white';
		g.beginPath();
		g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35);
		g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29);
		g.fill();
	});
}
