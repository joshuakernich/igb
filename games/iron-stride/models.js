/*
 * Iron Stride: the models, all built from three.js primitives and facing +Z.
 *
 *   buildRobot()    the Strider: a chunky red-and-black walker with a dome
 *                   cockpit, an arm cannon and missile pods (seen from
 *                   outside before everyone climbs in). .walk(phase, amount)
 *   buildBeetle()   a Beetle Bot: a domed roller with one big red eye
 *   buildBuzzer()   a Buzz Drone: a striped flying stinger with flapping wings
 *   buildCrab()     a Crab Tank: a wide shelled walker with pincers and a mortar
 *   buildTarget()   a practice drone: a hovering bullseye
 *   buildMissile()  the robot's missile
 *   buildBolt() / buildShell()   what the Klankbots shoot back
 *   glowTexture() smokeTexture() fireTexture()   sprites for the effects
 *
 * Each Klankbot returns { root, animate(t, dt, moving) } with its root's
 * origin on the ground (or, for flyers, at the body's middle).
 */
import * as THREE from '../../lib/three/three.module.min.js';

const TAU = Math.PI * 2;

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12 }, extra));
}
export function metal(color, extra = {}) {
	return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.35, metalness: 0.8 }, extra));
}
function matte(color, extra = {}) {
	return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, extra));
}
function lamp(color) {
	return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3.5) });   // (past white: it blooms)
}

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
	const m = new THREE.Mesh(geo, mat);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	if (parent) parent.add(m);
	return m;
}
function pivot(parent, x = 0, y = 0, z = 0) {
	const g = new THREE.Group();
	g.position.set(x, y, z);
	parent.add(g);
	return g;
}

/* ---------- the Strider ---------- */

export function buildRobot() {
	const RED = glossy(0xd42a20);
	const BLACK = glossy(0x1b1b20, { roughness: 0.4 });
	const GUN = metal(0x5a5f6a);
	const YELLOW = glossy(0xffc21a);
	const GLASS = new THREE.MeshPhysicalMaterial({ color: 0x0b1530, roughness: 0.05, metalness: 0.2, clearcoat: 1, emissive: 0x0a2a50, emissiveIntensity: 0.4 });
	const root = new THREE.Group();
	const body = pivot(root, 0, 0, 0);   // (bobs as it walks)

	// legs: a hip, a knee and a big foot each
	const legs = [-1, 1].map(function (side) {
		const hip = pivot(body, side * 1.25, 4.4, 0);
		mesh(new THREE.SphereGeometry(0.75, 16, 12), GUN, 0, 0, 0, hip);
		mesh(new THREE.CylinderGeometry(0.55, 0.5, 2.2, 14), BLACK, 0, -1.1, 0, hip);
		const knee = pivot(hip, 0, -2.2, 0);
		mesh(new THREE.SphereGeometry(0.7, 16, 12), GUN, 0, 0, 0, knee);
		mesh(new THREE.BoxGeometry(1.15, 2.1, 1.3), RED, 0, -1.1, 0, knee);
		mesh(new THREE.BoxGeometry(1.2, 0.35, 1.36), BLACK, 0, -0.35, 0, knee);
		const ankle = pivot(knee, 0, -2.15, 0);
		mesh(new THREE.BoxGeometry(1.7, 0.7, 2.6), RED, 0, 0.0, 0.45, ankle);
		mesh(new THREE.BoxGeometry(1.75, 0.5, 0.8), BLACK, 0, -0.1, 1.75, ankle);
		mesh(new THREE.BoxGeometry(1.4, 0.4, 0.6), YELLOW, 0, 0.3, 1.1, ankle);
		return { hip, knee, ankle, side };
	});
	mesh(new THREE.BoxGeometry(2.8, 1.0, 1.9), BLACK, 0, 4.5, 0, body);

	// the body: a big round red hull with a black belt and a yellow emblem
	const hull = mesh(new THREE.SphereGeometry(1, 36, 24), RED, 0, 6.5, 0, body);
	hull.scale.set(2.4, 2.0, 2.0);
	const belt = mesh(new THREE.CylinderGeometry(2.44, 2.3, 0.6, 36), BLACK, 0, 5.4, 0, body);
	belt.scale.z = 0.84;
	mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 24), YELLOW, 0, 6.6, 1.95, body).rotation.x = Math.PI / 2;
	mesh(new THREE.BoxGeometry(0.25, 0.8, 0.22), BLACK, 0, 6.6, 2.06, body).rotation.z = 0.5;
	for (const side of [-1, 1]) {
		const chev = mesh(new THREE.BoxGeometry(1.0, 0.18, 0.2), YELLOW, side * 1.25, 7.2, 1.75, body);
		chev.rotation.set(-0.5, side * -0.5, side * -0.45);
	}

	// the cockpit: a red dome with a wide black visor round the front
	const head = pivot(body, 0, 8.2, 0);
	mesh(new THREE.SphereGeometry(1.45, 32, 16, 0, TAU, 0, Math.PI / 2), RED, 0, 0, 0, head);
	mesh(new THREE.CylinderGeometry(1.48, 1.55, 0.35, 32), BLACK, 0, 0, 0, head);
	mesh(new THREE.SphereGeometry(1.5, 32, 10, -Math.PI * 0.25, Math.PI * 1.5, Math.PI * 0.2, Math.PI * 0.2), GLASS, 0, 0, 0, head);
	for (const side of [-1, 1]) {
		const ant = mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), GUN, side * 0.8, 1.6, -0.6, head);
		ant.rotation.z = side * -0.25;
		mesh(new THREE.SphereGeometry(0.16, 8, 6), lamp(0xff3b2a), side * 1.03, 2.5, -0.6, head);
	}

	// shoulders and arms: the right arm's a cannon, the left a claw
	const arms = [-1, 1].map(function (side) {
		const sh = pivot(body, side * 2.6, 7.3, 0);
		mesh(new THREE.SphereGeometry(0.95, 18, 12), BLACK, 0, 0, 0, sh);
		mesh(new THREE.BoxGeometry(1.5, 0.7, 1.7), RED, side * 0.2, 0.75, 0, sh).rotation.z = side * -0.3;
		mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.8, 12), GUN, 0, -1.0, 0, sh);
		const elbow = pivot(sh, 0, -1.9, 0);
		mesh(new THREE.SphereGeometry(0.55, 14, 10), BLACK, 0, 0, 0, elbow);
		if (side > 0) {
			const gun = mesh(new THREE.CylinderGeometry(0.8, 0.9, 3.4, 20), RED, 0, 0, 1.3, elbow);
			gun.rotation.x = Math.PI / 2;
			for (const z of [0.2, 1.4, 2.6]) {
				const ring = mesh(new THREE.TorusGeometry(0.86, 0.12, 8, 24), BLACK, 0, 0, z, elbow);
				ring.castShadow = false;
			}
			const muzzle = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 20), BLACK, 0, 0, 3.15, elbow);
			muzzle.rotation.x = Math.PI / 2;
			const glowDisc = mesh(new THREE.CircleGeometry(0.42, 20), lamp(0xffa030), 0, 0, 3.46, elbow);
			glowDisc.castShadow = false;
		} else {
			mesh(new THREE.BoxGeometry(1.0, 1.0, 2.2), RED, 0, 0, 0.9, elbow);
			for (let i = 0; i < 3; i++) {
				const a = i / 3 * TAU + 0.5;
				const claw = mesh(new THREE.BoxGeometry(0.22, 0.22, 1.1), GUN, Math.cos(a) * 0.35, Math.sin(a) * 0.35, 2.4, elbow);
				claw.rotation.set(-Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0);
			}
		}
		elbow.rotation.x = -0.25;
		return { sh, elbow, side };
	});

	// missile pods and exhausts on the back
	for (const side of [-1, 1]) {
		const pod = mesh(new THREE.BoxGeometry(1.3, 1.5, 1.2), BLACK, side * 1.1, 8.0, -1.6, body);
		pod.rotation.x = -0.3;
		for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 10), YELLOW, side * 1.1 + ((i % 2) - 0.5) * 0.6, 8.85 - 0.0, -1.35 - Math.floor(i / 2) * 0.55, body);
		const ex = mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 12), GUN, side * 0.7, 6.8, -2.0, body);
		ex.rotation.x = -0.9;
	}

	const robot = { root, legs, arms, body, head };
	// Each leg on its own stride (phase), as hard as it's working (amount 0..1).
	robot.walk = function (phaseL, phaseR, amountL, amountR, t) {
		for (const leg of legs) {
			const left = leg.side < 0;
			const pose = legPose(left ? phaseL : phaseR, left ? amountL : amountR);
			leg.hip.rotation.x = pose.hip;
			leg.knee.rotation.x = pose.knee;
			leg.ankle.rotation.x = pose.ankle;
		}
		for (const arm of arms) arm.sh.rotation.x = Math.sin((arm.side > 0 ? phaseL : phaseR)) * 0.25 * (arm.side > 0 ? amountL : amountR) + Math.sin(t * 1.3 + arm.side) * 0.04;
		const amount = (amountL + amountR) / 2;
		body.position.y = -Math.abs(Math.sin((phaseL + phaseR) / 2)) * 0.08 * amount + Math.sin(t * 2) * 0.03;
	};
	return robot;
}

// A leg partway through its stride. The ankle goes round a loop: lifted and
// swinging forward for half the stride, planted and pushing back for the
// other half (backward when the phase runs backward), and the hip, knee and
// ankle are solved to reach it (two-bone IK, the knee forward), the foot
// flat on the ground while it's planted and its toe up as it swings.
// Angles are rotations about x (positive swings a part's far end back):
// hip, knee (relative to the thigh), ankle (relative to the shin), and
// foot (the foot's own angle in the world).
export const LEG = { hip: 4.4, thigh: 2.2, shin: 2.15, ankle: 0.35, stride: 1.4, lift: 0.95 };
export function legPose(phase, amount) {
	const L = LEG;
	const up = Math.sin(phase);
	const z = -Math.cos(phase) * L.stride * amount;        // ahead of the hip (+) or behind it
	const y = L.ankle + Math.max(0, up) * L.lift * amount;   // above the ground
	const dz = z, dy = y - L.hip;
	const d = Math.min(L.thigh + L.shin - 0.001, Math.hypot(dz, dy));
	const aim = Math.atan2(-dz, -dy);                        // the hip-to-ankle line (0: straight down)
	const atHip = Math.acos(Math.max(-1, Math.min(1, (L.thigh * L.thigh + d * d - L.shin * L.shin) / (2 * L.thigh * d))));
	const atKnee = Math.acos(Math.max(-1, Math.min(1, (L.thigh * L.thigh + L.shin * L.shin - d * d) / (2 * L.thigh * L.shin))));
	const hip = aim - atHip;                                 // (the thigh forward of the line: the knee forward)
	const knee = Math.PI - atKnee;
	const foot = -Math.max(0, up) * 0.35 * amount;           // (toe up as it swings)
	return { hip, knee, ankle: foot - hip - knee, foot };
}

/* ---------- the Klankbots ---------- */

export function buildBeetle() {
	const root = new THREE.Group();
	const SHELL = glossy(0x1fa4c9, { metalness: 0.4 });
	const BLACK = glossy(0x18181c);
	const FACE = glossy(0xffc21a);
	const body = pivot(root, 0, 0, 0);
	const shell = mesh(new THREE.SphereGeometry(1.3, 24, 14, 0, TAU, 0, Math.PI / 2), SHELL, 0, 0.6, 0, body);
	shell.scale.set(1, 0.85, 1.3);
	mesh(new THREE.BoxGeometry(0.12, 1.15, 3.3), BLACK, 0, 0.62, 0, body);
	mesh(new THREE.BoxGeometry(2.2, 0.5, 3.0), BLACK, 0, 0.55, 0, body);
	const face = mesh(new THREE.BoxGeometry(1.5, 0.9, 0.4), FACE, 0, 0.95, 1.55, body);
	face.rotation.x = -0.25;
	mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 20), BLACK, 0, 1.0, 1.8, body);
	const eye = mesh(new THREE.SphereGeometry(0.3, 16, 10), lamp(0xff2a2a), 0, 1.0, 1.78, body);
	for (const side of [-1, 1]) {
		const prong = mesh(new THREE.ConeGeometry(0.16, 0.9, 8), BLACK, side * 0.55, 0.45, 2.05, body);
		prong.rotation.x = Math.PI / 2;
		prong.rotation.z = side * 0.3;
	}
	const ant = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), BLACK, 0, 1.9, 0.6, body);
	mesh(new THREE.SphereGeometry(0.13, 8, 6), lamp(0xff2a2a), 0, 2.35, 0.6, body);
	const wheels = [];
	for (const side of [-1, 1]) for (const z of [-0.9, 0.9]) {
		const w = pivot(root, side * 1.15, 0.55, z);
		const tyre = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), BLACK, 0, 0, 0, w);
		tyre.rotation.z = Math.PI / 2;
		const hub = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.44, 10), FACE, 0, 0, 0, w);
		hub.rotation.z = Math.PI / 2;
		wheels.push(w);
	}
	return {
		root, radius: 1.8, centre: 1.0,
		animate(t, dt, speed) {
			for (const w of wheels) w.rotation.x += dt * speed / 0.55;
			body.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
			body.rotation.z = Math.sin(t * 7) * 0.04;
			eye.scale.setScalar(0.85 + 0.25 * Math.abs(Math.sin(t * 5)));
			ant.rotation.x = Math.sin(t * 10) * 0.2;
		},
	};
}

export function buildBuzzer() {
	const root = new THREE.Group();
	const YELLOW = glossy(0xffcf1f);
	const BLACK = glossy(0x16161a);
	const body = pivot(root, 0, 0, 0);
	mesh(new THREE.SphereGeometry(0.8, 18, 12), BLACK, 0, 0, 0, body);
	const head = mesh(new THREE.SphereGeometry(0.62, 18, 12), YELLOW, 0, 0.1, 0.95, body);
	for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.32, 14, 10), lamp(0x3dff7a), side * 0.38, 0.25, 1.3, body);
	// the striped tail, curling down under the body into a stinger cannon
	const tail = pivot(body, 0, -0.1, -0.6);
	tail.rotation.x = 0.55;
	for (let i = 0; i < 5; i++) {
		const r = 0.72 - i * 0.11;
		const seg = mesh(new THREE.CylinderGeometry(r, r * 0.9, 0.42, 16), i % 2 ? BLACK : YELLOW, 0, 0, -0.2 - i * 0.4, tail);
		seg.rotation.x = Math.PI / 2;
	}
	const sting = mesh(new THREE.ConeGeometry(0.22, 0.9, 10), metal(0x9aa0aa), 0, 0, -2.4, tail);
	sting.rotation.x = -Math.PI / 2;
	mesh(new THREE.SphereGeometry(0.14, 8, 6), lamp(0xff3060), 0, 0, -2.85, tail);
	// the wings
	const WING = new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
	const wings = [-1, 1].map(function (side) {
		const w = pivot(body, side * 0.3, 0.6, -0.1);
		const blade = mesh(new THREE.PlaneGeometry(2.6, 0.9), WING, side * 1.3, 0, 0, w);
		blade.rotation.x = -Math.PI / 2;
		blade.castShadow = false;
		w.userData.side = side;
		return w;
	});
	for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
		const leg = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), BLACK, side * 0.45, -0.7, 0.2 - i * 0.4, body);
		leg.rotation.z = side * 0.4;
	}
	return {
		root, radius: 2.0, centre: 0,
		animate(t) {
			for (const w of wings) w.rotation.z = w.userData.side * Math.sin(t * 46) * 0.55;
			body.position.y = Math.sin(t * 3) * 0.25;
			head.rotation.y = Math.sin(t * 2.3) * 0.2;
		},
	};
}

export function buildCrab() {
	const root = new THREE.Group();
	const SHELL = glossy(0xff6a2b, { metalness: 0.3 });
	const CLAW = glossy(0x7b3fd1);
	const BLACK = glossy(0x18181c);
	const GUN = metal(0x6a6f7a);
	const body = pivot(root, 0, 1.9, 0);
	const shell = mesh(new THREE.SphereGeometry(1, 28, 16), SHELL, 0, 0, 0, body);
	shell.scale.set(2.3, 0.95, 1.7);
	mesh(new THREE.CylinderGeometry(2.25, 2.1, 0.4, 28), BLACK, 0, -0.35, 0, body).scale.z = 0.76;
	// the mortar turret
	const turret = pivot(body, 0, 0.85, -0.2);
	mesh(new THREE.SphereGeometry(0.8, 18, 10, 0, TAU, 0, Math.PI / 2), CLAW, 0, 0, 0, turret);
	const barrel = mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.8, 14), GUN, 0, 0.7, 0.55, turret);
	barrel.rotation.x = 0.7;
	// eyes on stalks
	for (const side of [-1, 1]) {
		mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6), BLACK, side * 0.6, 0.9, 1.25, body);
		mesh(new THREE.SphereGeometry(0.28, 12, 8), glossy(0xffffff), side * 0.6, 1.45, 1.3, body);
		mesh(new THREE.SphereGeometry(0.13, 8, 6), BLACK, side * 0.6, 1.47, 1.55, body);
	}
	// pincers
	const claws = [-1, 1].map(function (side) {
		const arm = pivot(body, side * 1.9, -0.1, 1.0);
		mesh(new THREE.BoxGeometry(0.5, 0.5, 1.6), CLAW, 0, 0, 0.6, arm).rotation.y = side * -0.4;
		const hand = pivot(arm, side * -0.35, 0, 1.5);
		mesh(new THREE.BoxGeometry(0.9, 0.8, 1.0), CLAW, 0, 0, 0.3, hand);
		const top = pivot(hand, 0, 0.2, 0.7);
		mesh(new THREE.BoxGeometry(0.35, 0.3, 1.1), CLAW, 0, 0, 0.5, top);
		const bottom = pivot(hand, 0, -0.2, 0.7);
		mesh(new THREE.BoxGeometry(0.35, 0.3, 0.9), CLAW, 0, 0, 0.4, bottom);
		return { arm, top, bottom, side };
	});
	// legs: three a side
	const legs = [];
	for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
		const hip = pivot(body, side * 1.7, -0.3, 0.7 - i * 0.75);
		const upper = mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), BLACK, side * 0.55, 0.3, 0, hip);
		upper.rotation.z = side * -1.0;
		const lower = mesh(new THREE.CylinderGeometry(0.11, 0.06, 2.0, 6), BLACK, side * 1.25, -0.6, 0, hip);
		lower.rotation.z = side * 0.35;
		legs.push({ hip, i, side });
	}
	return {
		root, radius: 2.7, centre: 2.0, turret, barrel,
		animate(t, dt, speed) {
			const walk = Math.min(1, speed / 2);
			for (const l of legs) l.hip.rotation.y = Math.sin(t * 8 + l.i * 2 + (l.side > 0 ? Math.PI : 0)) * 0.3 * walk;
			for (const c of claws) {
				const snap = Math.max(0, Math.sin(t * 3 + c.side));
				c.top.rotation.x = -snap * 0.5;
				c.bottom.rotation.x = snap * 0.4;
				c.arm.rotation.x = Math.sin(t * 1.7 + c.side) * 0.15;
			}
			body.position.y = 1.9 + Math.abs(Math.sin(t * 8)) * 0.08 * walk;
		},
	};
}

export function buildTarget() {
	const root = new THREE.Group();
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const g = c.getContext('2d');
	for (let i = 5; i > 0; i--) {
		g.fillStyle = i % 2 ? '#ff3b30' : '#ffffff';
		g.beginPath();
		g.arc(64, 64, i * 12.5, 0, TAU);
		g.fill();
	}
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, side: THREE.DoubleSide });
	const rim = metal(0x4a4f5a);
	const disc = mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 32), rim, 0, 0, 0, root);
	disc.rotation.x = Math.PI / 2;
	for (const z of [0.16, -0.16]) mesh(new THREE.CircleGeometry(1.72, 32), face, 0, 0, z, root).rotation.y = z < 0 ? Math.PI : 0;
	mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), rim, 0, 2.2, 0, root);
	const rotor = pivot(root, 0, 2.7, 0);
	mesh(new THREE.BoxGeometry(3.0, 0.06, 0.25), glossy(0x18181c), 0, 0, 0, rotor);
	return {
		root, radius: 2.2, centre: 0,
		animate(t, dt) { rotor.rotation.y += dt * 25; root.position.y += 0; },
	};
}

/* ---------- missiles and shots ---------- */

export function buildMissile() {
	const g = new THREE.Group();
	const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 10), glossy(0xf4f4f4));
	body.rotation.x = Math.PI / 2;
	g.add(body);
	const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 10), glossy(0xd42a20));
	nose.rotation.x = Math.PI / 2;
	nose.position.z = 0.95;
	g.add(nose);
	for (let i = 0; i < 4; i++) {
		const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.4), glossy(0xd42a20));
		fin.position.set(Math.cos(i * TAU / 4) * 0.22, Math.sin(i * TAU / 4) * 0.22, -0.55);
		fin.rotation.z = i * TAU / 4;
		g.add(fin);
	}
	return g;
}

export function buildBolt() {
	const g = new THREE.Group();
	g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), lamp(0xff5aa0)));
	return g;
}

export function buildShell() {
	const g = new THREE.Group();
	g.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), glossy(0x2a2a30)));
	const band = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 6, 18), lamp(0xff8a1a));
	g.add(band);
	return g;
}

/* ---------- sprite textures ---------- */

function spriteTex(paint, size = 128) {
	const c = document.createElement('canvas');
	c.width = c.height = size;
	paint(c.getContext('2d'), size);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export function glowTexture() {
	return spriteTex(function (g, s) {
		const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.25, 'rgba(255,255,255,0.6)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, s, s);
	});
}

export function fireTexture() {
	return spriteTex(function (g, s) {
		const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		r.addColorStop(0, 'rgba(255,255,230,1)');
		r.addColorStop(0.25, 'rgba(255,210,90,0.95)');
		r.addColorStop(0.55, 'rgba(255,110,30,0.6)');
		r.addColorStop(1, 'rgba(200,40,10,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, s, s);
	});
}

export function smokeTexture() {
	return spriteTex(function (g, s) {
		for (let i = 0; i < 7; i++) {
			const x = s / 2 + (Math.random() - 0.5) * s * 0.3;
			const y = s / 2 + (Math.random() - 0.5) * s * 0.3;
			const rad = s * (0.22 + Math.random() * 0.15);
			const r = g.createRadialGradient(x, y, 0, x, y, rad);
			r.addColorStop(0, 'rgba(255,255,255,0.5)');
			r.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = r;
			g.fillRect(0, 0, s, s);
		}
	});
}
