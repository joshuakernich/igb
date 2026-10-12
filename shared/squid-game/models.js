/*
 * The Squid Game people, shared by Mingle, Glass Bridge and Tug of War:
 * contestants, guards and blood splats. Everything is built from three.js
 * primitives and textures painted on canvases at load, so the games need no
 * asset files. Units are metres; y is up and the field runs toward -z.
 */
import * as THREE from '../../lib/three/three.module.min.js';

export const PINK = 0xe5287a;        // the guards' jumpsuits
export const GREEN = 0x1d7a63;       // the contestants' tracksuits
export const SKIN = 0xf2c9a8;

// Contestant numbers, in player order.
export const NUMBERS = ['456', '218', '067', '001', '199', '240'];

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, opts));
const flat = (color, opts = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, opts));

function mesh(geometry, material, shadows = true) {
	const m = new THREE.Mesh(geometry, material);
	m.castShadow = shadows;
	m.receiveShadow = shadows;
	return m;
}

function canvasTexture(w, h, paint) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
}

/* ---------- people ---------- */

function numberTexture(number, color) {
	const tex = canvasTexture(256, 180, () => {});
	const paint = () => {
		const ctx = tex.image.getContext('2d');
		ctx.clearRect(0, 0, 256, 180);
		ctx.fillStyle = color;
		roundRect(ctx, 0, 0, 256, 180, 26);
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		roundRect(ctx, 16, 16, 224, 148, 16);
		ctx.fill();
		ctx.fillStyle = '#151515';
		ctx.font = '120px "Paytone One", "Rubik", sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(number, 128, 96);
		tex.needsUpdate = true;
	};
	paint();
	if (document.fonts) document.fonts.load('120px "Paytone One"').then(paint).catch(() => {});
	return tex;
}

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}

// A humanoid facing -z with its feet at the origin. Parts the game moves:
//   lean   pivots at the feet; tilt it to lean the whole body
//   head   pivots at the neck
//   legs[2], arms[2]   pivot at hip and shoulder, for walking
function humanoid({ body, sleeve, trim, headMaterial, hood }) {
	const root = new THREE.Group();
	const lean = new THREE.Group();
	root.add(lean);

	const legs = [];
	const arms = [];
	for (const side of [-1, 1]) {
		const hip = new THREE.Group();
		hip.position.set(side * 0.13, 0.9, 0);
		lean.add(hip);
		const leg = mesh(new THREE.CylinderGeometry(0.12, 0.105, 0.82, 12), body);
		leg.position.y = -0.41;
		hip.add(leg);
		if (trim) {
			const stripe = mesh(new THREE.BoxGeometry(0.025, 0.8, 0.05), trim, false);
			stripe.position.set(side * 0.115, -0.41, 0);
			hip.add(stripe);
		}
		const shoe = mesh(new THREE.BoxGeometry(0.17, 0.11, 0.32), mat(0xf6f6f2));
		shoe.position.set(0, -0.86, -0.05);
		hip.add(shoe);
		legs.push(hip);

		const shoulder = new THREE.Group();
		shoulder.position.set(side * 0.33, 1.47, 0);
		lean.add(shoulder);
		const arm = mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.62, 10), sleeve);
		arm.position.y = -0.3;
		arm.rotation.z = side * 0.06;
		shoulder.add(arm);
		if (trim) {
			const stripe = mesh(new THREE.BoxGeometry(0.02, 0.58, 0.04), trim, false);
			stripe.position.set(side * 0.08, -0.3, 0);
			shoulder.add(stripe);
		}
		const hand = mesh(new THREE.SphereGeometry(0.075, 10, 8), mat(SKIN));
		hand.position.set(side * 0.02, -0.66, 0);
		shoulder.add(hand);
		arms.push(shoulder);
	}

	const torso = mesh(new THREE.CapsuleGeometry(0.25, 0.26, 6, 14), body);
	torso.scale.set(1.12, 1, 0.68);
	torso.position.y = 1.22;
	lean.add(torso);

	const head = new THREE.Group();
	head.position.y = 1.56;
	lean.add(head);
	const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 10), mat(SKIN));
	neck.position.y = 0.04;
	head.add(neck);
	const skull = mesh(new THREE.SphereGeometry(0.2, 20, 16), headMaterial);
	skull.position.y = 0.24;
	head.add(skull);
	if (hood) {
		const h = mesh(new THREE.SphereGeometry(0.225, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hood);
		h.position.y = 0.25;
		head.add(h);
	}

	return { root, lean, head, legs, arms, torso };
}

// A contestant in the green tracksuit, wearing their number front and back
// on a patch edged in their player colour, with a ring of that colour on the
// ground and a marker over their head.
export function buildContestant(n, color) {
	const tracksuit = mat(GREEN, { roughness: 0.9 });
	const trim = mat(0xf2f2ee);
	const h = humanoid({ body: tracksuit, sleeve: tracksuit, trim, headMaterial: mat(SKIN) });

	const hair = mesh(new THREE.SphereGeometry(0.212, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0x1a1612));
	hair.position.y = 0.25;
	hair.rotation.x = 0.35;
	h.head.add(hair);

	const zip = mesh(new THREE.BoxGeometry(0.03, 0.5, 0.02), trim, false);
	zip.position.set(0, 1.22, -0.18);
	h.lean.add(zip);
	const collar = mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 18), trim);
	collar.position.y = 1.53;
	collar.rotation.x = Math.PI / 2;
	h.lean.add(collar);

	const tex = numberTexture(NUMBERS[n] || String(n + 1).padStart(3, '0'), color);
	const patchMat = flat(0xffffff, { map: tex });
	const back = mesh(new THREE.PlaneGeometry(0.38, 0.27), patchMat, false);
	back.position.set(0, 1.28, 0.18);
	h.lean.add(back);
	const front = mesh(new THREE.PlaneGeometry(0.2, 0.14), patchMat, false);
	front.position.set(0.1, 1.33, -0.181);
	front.rotation.y = Math.PI;
	h.lean.add(front);

	const ring = mesh(new THREE.RingGeometry(0.42, 0.56, 40), flat(color, { transparent: true, opacity: 0.85, depthWrite: false }), false);
	ring.rotation.x = -Math.PI / 2;
	ring.position.y = 0.03;
	h.root.add(ring);

	const marker = mesh(new THREE.ConeGeometry(0.13, 0.26, 4), flat(color), false);
	marker.rotation.x = Math.PI;
	marker.position.y = 2.25;
	h.root.add(marker);

	return Object.assign(h, { ring, marker });
}

// A guard in a pink jumpsuit, hood and black mask marked with a circle,
// triangle or square. With a rifle when armed.
export function buildGuard(shape, armed) {
	const suit = mat(PINK, { roughness: 0.8 });
	const black = mat(0x111111, { roughness: 0.35 });
	const h = humanoid({ body: suit, sleeve: suit, headMaterial: mat(PINK), hood: suit });

	// The mask covers the face, which looks along -z (phi = 1.5 PI).
	const mask = mesh(new THREE.SphereGeometry(0.205, 20, 16, Math.PI * 1.12, Math.PI * 0.76, Math.PI * 0.22, Math.PI * 0.6), black);
	mask.position.y = 0.24;
	mask.position.z = -0.025;
	h.head.add(mask);

	const symbol = symbolMesh(shape);
	symbol.position.set(0, 0.25, -0.2);
	h.head.add(symbol);

	h.flash = null;
	if (armed) {
		const rifle = mesh(new THREE.BoxGeometry(0.07, 0.1, 0.9), black);
		rifle.position.set(0.12, 1.15, -0.32);
		rifle.rotation.x = 0.15;
		h.lean.add(rifle);
		for (const arm of h.arms) arm.rotation.x = 0.9;   // forward, holding the rifle
		const flash = mesh(new THREE.SphereGeometry(0.16, 10, 8), flat(0xfff2a8), false);
		flash.position.set(0.12, 1.2, -0.85);
		flash.visible = false;
		h.lean.add(flash);
		h.flash = flash;
	}
	return h;
}

function symbolMesh(shape) {
	const white = flat(0xffffff);
	if (shape === 'circle') return mesh(new THREE.RingGeometry(0.06, 0.085, 24), white, false).rotateY(Math.PI);
	const pts = shape === 'triangle'
		? [[0, 0.09], [0.08, -0.06], [-0.08, -0.06]]
		: [[-0.07, 0.07], [0.07, 0.07], [0.07, -0.07], [-0.07, -0.07]];
	const outline = new THREE.Shape();
	pts.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
	outline.closePath();
	const hole = new THREE.Path();
	pts.map(([x, y]) => [x * 0.68, y * 0.68 - (shape === 'triangle' ? 0.005 : 0)])
		.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
	hole.closePath();
	outline.holes.push(hole);
	return mesh(new THREE.ShapeGeometry(outline), white, false).rotateY(Math.PI);
}

export function buildSplat() {
	const tex = canvasTexture(256, 256, (ctx, w) => {
		ctx.fillStyle = '#b3001b';
		ctx.beginPath();
		ctx.arc(w / 2, w / 2, w * 0.24, 0, Math.PI * 2);
		ctx.fill();
		for (let i = 0; i < 14; i++) {
			const a = Math.random() * Math.PI * 2;
			const d = w * (0.14 + Math.random() * 0.2);
			ctx.beginPath();
			ctx.arc(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, w * (0.04 + Math.random() * 0.08), 0, Math.PI * 2);
			ctx.fill();
		}
		for (let i = 0; i < 18; i++) {
			const a = Math.random() * Math.PI * 2;
			const d = w * (0.3 + Math.random() * 0.17);
			ctx.beginPath();
			ctx.arc(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, w * (0.008 + Math.random() * 0.02), 0, Math.PI * 2);
			ctx.fill();
		}
	});
	const splat = mesh(new THREE.PlaneGeometry(2.4, 2.4), flat(0xffffff, {
		map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
	}), false);
	splat.rotation.x = -Math.PI / 2;
	splat.rotation.z = Math.random() * Math.PI * 2;
	splat.position.y = 0.025;
	splat.scale.setScalar(0.01);
	splat.grow = (t) => splat.scale.setScalar(Math.max(0.01, t));
	return splat;
}
