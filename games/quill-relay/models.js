/*
 * Quill Relay: the models. The hero (a glossy, spiky little speedster,
 * repainted in whoever is running), gold rings, the robots (the Gearhog
 * on its treads, the Buzzdrone on its rotor), springs, spikes, item
 * monitors, the spinning checkpoint post, palms, toy hills, waterfall cliffs
 * and the textures of the chequered earth.
 *
 * (The hero began as a copy of Loop Island's runner, games/loop-island/models.js;
 * it lives here so the two games can change apart.)
 */
import * as THREE from '../../lib/three/three.module.min.js';

const TAU = Math.PI * 2;

export function canvasTexture(w, h, paint) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

// (geometry shared between many meshes is marked, so the game never disposes it)
const shared = (g) => { g.userData.shared = true; return g; };

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 }, extra));
}
export const chrome = () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
export const gold = () => new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.14, emissive: 0x6a3a00, emissiveIntensity: 0.4 });

/* ---------- the land's textures ---------- */

// The chequered earth: warm brown and orange squares with a soft bevel.
export function earthTexture(anisotropy) {
	const t = canvasTexture(256, 256, function (g, w) {
		const s = w / 4;
		for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
			g.fillStyle = (x + y) % 2 ? '#b8641e' : '#e8913a';
			g.fillRect(x * s, y * s, s, s);
			g.fillStyle = 'rgba(255,240,200,0.18)';
			g.fillRect(x * s, y * s, s, 5);
			g.fillStyle = 'rgba(60,20,0,0.18)';
			g.fillRect(x * s, y * s + s - 5, s, 5);
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = anisotropy;
	return t;
}

// The grass on top: bright stripes running along the land.
export function grassTexture(anisotropy) {
	const t = canvasTexture(256, 256, function (g, w, h) {
		for (let x = 0; x < 8; x++) {
			g.fillStyle = x % 2 ? '#3fc63a' : '#5ee04a';
			g.fillRect(x * w / 8, 0, w / 8, h);
		}
		g.globalAlpha = 0.25;
		for (let i = 0; i < 300; i++) {
			g.fillStyle = i % 2 ? '#9cff6a' : '#1f8a2a';
			g.fillRect(Math.random() * w, Math.random() * h, 2, 6 + Math.random() * 8);
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = anisotropy;
	return t;
}

// The lip of grass hanging over the earth's face: a scalloped fringe.
export function fringeTexture() {
	const t = canvasTexture(256, 64, function (g, w, h) {
		g.fillStyle = '#3fc63a';
		g.fillRect(0, 0, w, 22);
		for (let x = 0; x < w; x += 32) {
			g.beginPath();
			g.moveTo(x, 20);
			g.quadraticCurveTo(x + 16, 62, x + 32, 20);
			g.fill();
		}
		g.fillStyle = '#7cf05a';
		g.fillRect(0, 0, w, 6);
	});
	t.wrapS = THREE.RepeatWrapping;
	return t;
}

// Falling water: bright streaks scrolled down by the game.
export function waterfallTexture() {
	const t = canvasTexture(128, 256, function (g, w, h) {
		g.fillStyle = '#5fc8ff';
		g.fillRect(0, 0, w, h);
		for (let i = 0; i < 60; i++) {
			g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
			const x = Math.random() * w;
			const y = Math.random() * h;
			g.fillRect(x, y, 2 + Math.random() * 5, 20 + Math.random() * 60);
			g.fillRect(x, y - h, 2 + Math.random() * 5, 20 + Math.random() * 60);
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	return t;
}

// A sparkle, for rings snatched up and robots popped.
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

/* ---------- the hero ---------- */

// A glossy, spiky little speedster: big head, swept-back quills, wide eyes,
// white gloves, chunky trainers. Running, its legs whirl into a blur; jumping,
// rolling or revving, it curls into a spinning spiked ball. Faces -z.
export function buildHero(colour) {
	const root = new THREE.Group();     // placed on the course
	const lean = new THREE.Group();     // tilts with the ground, round the loop
	root.add(lean);

	const skin = glossy(colour);
	const tan = glossy(0xf6d2a2, { clearcoat: 0.6 });
	const white = glossy(0xffffff, { clearcoat: 0.8 });
	const black = glossy(0x101018, { roughness: 0.2 });
	const strap = glossy(0xffc23a, { metalness: 0.5, roughness: 0.25 });

	const body = new THREE.Group();
	body.position.y = 0.95;
	lean.add(body);

	const torso = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), skin);
	torso.scale.set(1, 1.1, 0.95);
	body.add(torso);
	const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), tan);
	belly.position.set(0, -0.02, -0.14);
	belly.scale.set(0.9, 1.05, 0.6);
	body.add(belly);

	const head = new THREE.Group();
	head.position.set(0, 0.62, -0.04);
	body.add(head);
	head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), skin));
	const quill = new THREE.ConeGeometry(0.17, 0.75, 12);
	quill.translate(0, 0.375, 0);
	const quills = [[0, 0.22, 1.9, 0], [0.24, 0.08, 1.95, -0.5], [-0.24, 0.08, 1.95, 0.5], [0.16, -0.16, 2.2, -0.4], [-0.16, -0.16, 2.2, 0.4], [0, -0.05, 2.1, 0]];
	for (const [x, y, rx, rz] of quills) {
		const q = new THREE.Mesh(quill, skin);
		q.position.set(x, y, 0.18);
		q.rotation.set(rx, 0, rz);
		head.add(q);
	}
	const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), tan);
	muzzle.position.set(0, -0.14, -0.33);
	muzzle.scale.set(1.2, 0.8, 0.9);
	head.add(muzzle);
	const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), black);
	nose.position.set(0, -0.06, -0.52);
	head.add(nose);
	for (const side of [-1, 1]) {
		const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 10), skin);
		ear.position.set(side * 0.25, 0.36, 0.05);
		ear.rotation.z = -side * 0.35;
		head.add(ear);
		const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), white);
		eye.position.set(side * 0.13, 0.08, -0.33);
		eye.scale.set(0.8, 1.25, 0.6);
		head.add(eye);
		const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), black);
		pupil.position.set(side * 0.11, 0.07, -0.41);
		head.add(pupil);
	}

	const arms = [];
	for (const side of [-1, 1]) {
		const shoulder = new THREE.Group();
		shoulder.position.set(side * 0.3, 0.18, 0);
		body.add(shoulder);
		const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8), tan);
		arm.position.y = -0.21;
		shoulder.add(arm);
		const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), white);
		glove.position.y = -0.45;
		shoulder.add(glove);
		shoulder.rotation.set(-1.1, 0, side * 0.35);
		arms.push(shoulder);
	}

	const legs = [];
	for (const side of [-1, 1]) {
		const hip = new THREE.Group();
		hip.position.set(side * 0.14, -0.28, 0);
		body.add(hip);
		const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8), skin);
		leg.position.y = -0.21;
		hip.add(leg);
		const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 12), white);
		shoe.rotation.x = Math.PI / 2;
		shoe.position.set(0, -0.46, -0.08);
		hip.add(shoe);
		const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.03, 8, 16), strap);
		band.position.set(0, -0.46, -0.06);
		hip.add(band);
		legs.push(hip);
	}

	// the leg blur: a whirl of colour where the legs would be
	const whirlTex = canvasTexture(128, 128, function (g, w, h) {
		g.translate(w / 2, h / 2);
		for (let i = 0; i < 3; i++) {
			g.rotate(TAU / 3);
			const grad = g.createLinearGradient(-60, 0, 60, 0);
			grad.addColorStop(0, 'rgba(255,255,255,0)');
			grad.addColorStop(1, 'rgba(255,255,255,0.9)');
			g.strokeStyle = grad;
			g.lineWidth = 16;
			g.beginPath();
			g.arc(0, 0, 44, 0, Math.PI * 0.9);
			g.stroke();
		}
	});
	const whirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: colour, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
	const whirl = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), whirlMat);
	whirl.rotation.y = Math.PI / 2;
	whirl.position.set(0, 0.42, 0);
	lean.add(whirl);

	// the ball: curled up and spinning
	const ball = new THREE.Group();
	ball.position.y = 0.6;
	ball.visible = false;
	lean.add(ball);
	ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 20), skin));
	const spike = new THREE.ConeGeometry(0.14, 0.4, 10);
	spike.translate(0, 0.58, 0);
	for (let i = 0; i < 14; i++) {
		const sp = new THREE.Mesh(spike, skin);
		sp.rotation.set(i / 14 * TAU, 0, (i % 2 ? 0.35 : -0.35));
		ball.add(sp);
	}
	const swirlMat = new THREE.MeshBasicMaterial({ map: whirlTex, color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8, blending: THREE.AdditiveBlending, toneMapped: false });
	const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), swirlMat);
	swirl.rotation.y = Math.PI / 2;
	ball.add(swirl);

	// a bubble shield (from a monitor)
	const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1, depthWrite: false, envMapIntensity: 2 }));
	bubble.position.y = 0.95;
	bubble.visible = false;
	root.add(bubble);

	root.traverse((o) => { if (o.isMesh && o !== whirl && o !== swirl && o !== bubble) o.castShadow = true; });

	let cycle = 0;
	const reset = () => {
		body.visible = true;
		ball.visible = false;
		whirl.visible = false;
		body.scale.set(1, 1, 1);
		head.rotation.set(0, 0, 0);
		body.rotation.set(0, 0, 0);
	};

	// Pose for this frame. mode: 'run' | 'ball' | 'crouch' | 'spring' | 'hurt' | 'idle';
	// pace 0-1 (how fast); spin, how fast the ball turns (radians a second).
	function pose(dt, mode, pace = 0, spin = 20, time = 0) {
		reset();
		cycle += dt * (5 + pace * 26);
		if (mode === 'ball') {
			body.visible = false;
			ball.visible = true;
			ball.rotation.x -= dt * spin;
			swirlMat.opacity = Math.min(0.9, 0.3 + Math.abs(spin) / 40);
			return;
		}
		if (mode === 'crouch') {
			body.position.y = 0.62;
			body.rotation.x = -0.45;
			head.rotation.x = 0.35;
			legs[0].rotation.x = 1.2;
			legs[1].rotation.x = 1.0;
			arms[0].rotation.x = -0.6;
			arms[1].rotation.x = -0.6;
			return;
		}
		if (mode === 'spring') {
			body.position.y = 0.95;
			body.rotation.x = 0.1;
			legs[0].rotation.x = 0.15;
			legs[1].rotation.x = -0.15;
			arms[0].rotation.x = -2.9;
			arms[1].rotation.x = -2.9;
			head.rotation.x = -0.25;
			return;
		}
		if (mode === 'hurt') {
			body.position.y = 0.95;
			body.rotation.x = 0.5;
			head.rotation.x = -0.4;
			legs[0].rotation.x = -0.8;
			legs[1].rotation.x = 0.6;
			arms[0].rotation.x = -2.2 + Math.sin(time * 30) * 0.4;
			arms[1].rotation.x = -2.0 - Math.sin(time * 30) * 0.4;
			return;
		}
		if (mode === 'idle' || pace < 0.04) {
			// standing, tapping a foot, raring to go
			body.rotation.x = -0.05;
			body.position.y = 0.95 + Math.abs(Math.sin(time * 4)) * 0.03;
			legs[0].rotation.x = 0.05;
			legs[1].rotation.x = -0.2 + Math.max(0, Math.sin(time * 8)) * 0.3;
			arms[0].rotation.set(-0.2, 0, -0.9);
			arms[1].rotation.set(-0.2, 0, 0.9);
			return;
		}
		const stride = Math.max(0.15, 1 - pace);   // (flat out, the legs are just a blur)
		legs[0].rotation.x = Math.sin(cycle) * 1.1 * stride;
		legs[1].rotation.x = -Math.sin(cycle) * 1.1 * stride;
		whirl.visible = true;
		whirlMat.opacity = Math.min(0.85, Math.max(0, pace - 0.25) * 1.4);
		whirl.rotation.x = -cycle;
		body.rotation.x = -0.32 * pace - 0.05;
		body.position.y = 0.95 + Math.abs(Math.sin(cycle)) * 0.06 * stride;
		for (let i = 0; i < 2; i++) arms[i].rotation.set(pace > 0.55 ? -1.25 + Math.sin(cycle * 2 + i) * 0.05 : Math.sin(cycle + i * Math.PI) * 0.9, 0, (i ? 1 : -1) * 0.35);
		head.rotation.x = 0.2 * pace;
	}

	function setColour(c) {
		skin.color.set(c);
		whirlMat.color.set(c);
	}

	return { root, lean, pose, setColour, bubble };
}

/* ---------- rings ---------- */

const RING_GEO = shared(new THREE.TorusGeometry(0.36, 0.075, 12, 32));
let ringMat = null;
export function buildRing() {
	if (!ringMat) { ringMat = gold(); ringMat.userData.shared = true; }
	const m = new THREE.Mesh(RING_GEO, ringMat);
	m.castShadow = true;
	return m;
}

/* ---------- the robots ---------- */

// The Gearhog: a squat orange tin drum on rubber treads, one big glass eye,
// a brass gear spinning on its back. Patrols to and fro. Faces -z.
export function buildGearhog() {
	const g = new THREE.Group();
	const shell = glossy(0xff7a1c);
	const tread = glossy(0x22222a, { roughness: 0.5, clearcoat: 0.3 });
	const brass = new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.2 });
	const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.7, 24), shell);
	drum.position.y = 0.72;
	g.add(drum);
	const lid = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, TAU, 0, Math.PI / 2), shell);
	lid.position.y = 1.07;
	g.add(lid);
	for (const side of [-1, 1]) {
		const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.6, 6, 12), tread);
		t.rotation.x = Math.PI / 2;
		t.position.set(side * 0.38, 0.2, 0);
		g.add(t);
		for (let i = -1; i <= 1; i++) {
			const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), chrome());
			hub.rotation.z = Math.PI / 2;
			hub.position.set(side * 0.56, 0.2, i * 0.28);
			g.add(hub);
		}
	}
	const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), glossy(0xffffff));
	eyeWhite.position.set(0, 0.85, -0.38);
	g.add(eyeWhite);
	const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2030, toneMapped: false }));
	pupil.position.set(0, 0.85, -0.55);
	g.add(pupil);
	const gear = new THREE.Group();
	gear.position.set(0, 1.42, 0.05);
	g.add(gear);
	gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), brass));
	for (let i = 0; i < 8; i++) {
		const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), brass);
		const a = i / 8 * TAU;
		tooth.position.set(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26);
		tooth.rotation.y = -a;
		gear.add(tooth);
	}
	gear.rotation.x = Math.PI / 2;
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	g.userData.gear = gear;
	return g;
}

// The Buzzdrone: a hovering teal pod with a twin-blade rotor, a visor eye and
// a dangling spiked weight. Bobs up and down. Faces -z.
export function buildBuzzdrone() {
	const g = new THREE.Group();
	const shell = glossy(0x16c2b0);
	const pod = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), shell);
	pod.scale.set(1.1, 0.8, 1);
	g.add(pod);
	const visor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x1a1030, roughness: 0.05, clearcoat: 1, metalness: 0.3 }));
	visor.rotation.x = -Math.PI / 2;
	visor.position.set(0, 0.04, -0.28);
	g.add(visor);
	const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe14a, toneMapped: false }));
	lamp.position.set(0, 0.06, -0.52);
	g.add(lamp);
	const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), chrome());
	mast.position.y = 0.45;
	g.add(mast);
	const rotor = new THREE.Group();
	rotor.position.y = 0.6;
	g.add(rotor);
	for (let i = 0; i < 2; i++) {
		const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.14), glossy(0xffffff));
		blade.rotation.y = i * Math.PI / 2;
		rotor.add(blade);
	}
	const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), chrome());
	chain.position.y = -0.5;
	g.add(chain);
	const weight = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0x33333c, metalness: 0.9, roughness: 0.3, flatShading: true }));
	weight.position.y = -0.75;
	g.add(weight);
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	g.userData.rotor = rotor;
	return g;
}

/* ---------- springs, spikes, monitors, the checkpoint ---------- */

// A spring: a red cap on a chrome coil on a yellow base. userData.cap bounces.
export function buildSpring() {
	const g = new THREE.Group();
	const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.9), glossy(0xffd23a));
	base.position.y = 0.09;
	g.add(base);
	const coil = new THREE.Group();
	coil.position.y = 0.18;
	g.add(coil);
	for (let i = 0; i < 3; i++) {
		const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 8, 20), chrome());
		t.rotation.x = Math.PI / 2;
		t.position.y = 0.08 + i * 0.1;
		coil.add(t);
	}
	const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.85), glossy(0xff2a3a));
	cap.position.y = 0.5;
	g.add(cap);
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	g.userData.cap = cap;
	g.userData.coil = coil;
	return g;
}

// A strip of steel spikes, `n` across.
let spikeParts = null;
export function buildSpikes(n) {
	spikeParts = spikeParts || {
		cone: shared(new THREE.ConeGeometry(0.13, 0.55, 10)),
		base: glossy(0x8a8a96, { metalness: 0.6 }),
		steel: chrome(),
	};
	spikeParts.base.userData.shared = spikeParts.steel.userData.shared = true;
	const g = new THREE.Group();
	const base = new THREE.Mesh(new THREE.BoxGeometry(n * 0.3 + 0.1, 0.12, 0.8), spikeParts.base);
	base.position.y = 0.06;
	g.add(base);
	for (let i = 0; i < n; i++) for (const z of [-0.2, 0.2]) {
		const c = new THREE.Mesh(spikeParts.cone, spikeParts.steel);
		c.position.set((i - (n - 1) / 2) * 0.3, 0.38, z);
		g.add(c);
	}
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// An item monitor: a chrome box with a glowing screen; `kind` 'rings' or 'shield'.
export function buildMonitor(kind) {
	const g = new THREE.Group();
	const screen = canvasTexture(128, 128, function (c, w, h) {
		const grad = c.createLinearGradient(0, 0, 0, h);
		grad.addColorStop(0, '#1a2a6a');
		grad.addColorStop(1, '#3a6aff');
		c.fillStyle = grad;
		c.fillRect(0, 0, w, h);
		for (let y = 0; y < h; y += 6) { c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(0, y, w, 2); }
		if (kind === 'shield') {
			c.strokeStyle = '#9fe8ff';
			c.lineWidth = 10;
			c.beginPath();
			c.arc(64, 64, 36, 0, TAU);
			c.stroke();
			c.fillStyle = 'rgba(159,232,255,0.35)';
			c.fill();
		} else {
			c.strokeStyle = '#ffd23a';
			c.lineWidth = 11;
			for (const [x, y] of [[48, 54], [80, 54], [64, 80]]) {
				c.beginPath();
				c.arc(x, y, 18, 0, TAU);
				c.stroke();
			}
		}
	});
	const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.7), chrome());
	box.position.y = 0.55;
	g.add(box);
	const face = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.6), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }));
	face.position.set(0, 0.56, 0.351);
	g.add(face);
	const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.5), glossy(0x30303a));
	foot.position.y = 0.07;
	g.add(foot);
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// The checkpoint post: a striped pole with a glowing orb on a spinning arm.
// userData.arm spins, userData.orb is recoloured to the next runner's colour.
export function buildCheckpoint() {
	const g = new THREE.Group();
	const stripes = canvasTexture(32, 256, function (c, w, h) {
		for (let y = 0; y < h; y += 32) {
			c.fillStyle = (y / 32) % 2 ? '#ffffff' : '#2f7cf0';
			c.fillRect(0, y, w, 32);
		}
	});
	const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 14), glossy(0xffffff, { map: stripes }));
	pole.position.y = 1.2;
	g.add(pole);
	const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.16, 18), glossy(0x30303a));
	foot.position.y = 0.08;
	g.add(foot);
	const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), chrome());
	cap.position.y = 2.45;
	g.add(cap);
	const arm = new THREE.Group();
	arm.position.y = 2.45;
	g.add(arm);
	const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), chrome());
	rod.position.y = 0.25;
	arm.add(rod);
	const orbMat = new THREE.MeshStandardMaterial({ color: 0x3a8aff, emissive: 0x3a8aff, emissiveIntensity: 1.4, roughness: 0.2 });
	const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), orbMat);
	orb.position.y = 0.55;
	arm.add(orb);
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	g.userData.arm = arm;
	g.userData.orb = orb;
	return g;
}

/* ---------- scenery ---------- */

// A palm: a curving trunk of stacked segments and a crown of drooping fronds.
const frondGeo = (function () {
	const g = new THREE.PlaneGeometry(1.4, 6.5, 2, 10);
	g.translate(0, 3.25, 0);
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		const y = p.getY(i);
		const x = p.getX(i);
		const t = y / 6.5;
		p.setX(i, x * Math.sin(Math.PI * Math.min(1, t * 1.15)) * 1.2);
		p.setZ(i, -Math.pow(t, 2) * 3.2);
		p.setY(i, y * 0.85);
	}
	g.computeVertexNormals();
	return shared(g);
})();

let palmMats = null;
export function buildPalm(height) {
	palmMats = palmMats || {
		trunk: glossy(0xa8763e, { clearcoat: 0.4, roughness: 0.6 }),
		ring: glossy(0x7a5028, { clearcoat: 0.4, roughness: 0.6 }),
		frond: glossy(0x2fb84a, { side: THREE.DoubleSide, clearcoat: 0.5 }),
		frond2: glossy(0x6ade4a, { side: THREE.DoubleSide, clearcoat: 0.5 }),
		nut: glossy(0x6a3a1c),
	};
	const g = new THREE.Group();
	const bend = (Math.random() - 0.5) * 0.45 * height;
	const pts = [0, 0.33, 0.66, 1].map((t) => new THREE.Vector3(bend * t * t, height * t, 0));
	const curve = new THREE.CatmullRomCurve3(pts);
	// (stacked segments, alternating shades: a toy-like ringed trunk)
	const N = 9;
	for (let i = 0; i < N; i++) {
		const a = curve.getPoint(i / N);
		const b = curve.getPoint((i + 1) / N);
		const seg = new THREE.Mesh(new THREE.CylinderGeometry(height * 0.03, height * 0.036, a.distanceTo(b) * 1.05, 10), i % 2 ? palmMats.ring : palmMats.trunk);
		seg.position.copy(a).add(b).multiplyScalar(0.5);
		seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
		g.add(seg);
	}
	const top = pts[3];
	const n = 8 + Math.floor(Math.random() * 3);
	for (let i = 0; i < n; i++) {
		const f = new THREE.Mesh(frondGeo, i % 2 ? palmMats.frond : palmMats.frond2);
		f.position.copy(top);
		f.rotation.order = 'YXZ';
		f.rotation.y = i / n * TAU + Math.random() * 0.3;
		f.rotation.x = -0.9 - Math.random() * 0.4;
		f.scale.setScalar(height / 11);
		g.add(f);
	}
	for (let i = 0; i < 3; i++) {
		const c = new THREE.Mesh(new THREE.SphereGeometry(height * 0.035, 10, 8), palmMats.nut);
		c.position.copy(top).add(new THREE.Vector3(Math.cos(i * 2.1) * 0.3, -0.3, Math.sin(i * 2.1) * 0.3));
		g.add(c);
	}
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	return g;
}

// A toy hill: a rounded mound with bands of chequered earth below a green cap.
export function buildHill(r, h, earthMat) {
	const g = new THREE.Group();
	const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, TAU, 0, Math.PI / 2), glossy(0x4fd04a, { clearcoat: 0.6, roughness: 0.5 }));
	cap.scale.set(1, h * 0.45 / r, 1);
	cap.position.y = h * 0.55;
	g.add(cap);
	const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h * 0.55, 32, 1, true), earthMat);
	base.position.y = h * 0.275;
	g.add(base);
	return g;
}

// A cliff of chequered earth with a waterfall down its face into a pool.
export function buildWaterfallCliff(w, h, earthMat, waterMat, grassMat) {
	const g = new THREE.Group();
	const rock = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.6), earthMat);
	rock.position.y = h / 2;
	g.add(rock);
	const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.6, w * 0.64), grassMat);
	top.position.y = h + 0.2;
	g.add(top);
	const fall = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.34, h + 0.2), waterMat);
	fall.position.set(0, h / 2 + 0.1, w * 0.3 + 0.05);
	g.add(fall);
	const pool = new THREE.Mesh(new THREE.CircleGeometry(w * 0.45, 32), waterMat);
	pool.rotation.x = -Math.PI / 2;
	pool.position.set(0, 0.06, w * 0.55);
	g.add(pool);
	// spray where it lands
	const spray = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
	spray.scale.set(1, 0.4, 0.6);
	spray.position.set(0, 0.2, w * 0.32);
	g.add(spray);
	g.userData.spray = spray;
	return g;
}
