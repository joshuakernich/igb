/*
 * Sonic Robot (iron-stride): Doctor Klank's compounds, and the emerald
 * fragments buried in them. All built from primitives, facing +Z.
 *
 *   buildCompound(at, level)   the fortress round a site: a concrete pad, a
 *                              ring of walls with four gates, hangars, and
 *                              four gun towers' plinths (the turrets and the
 *                              core are separate: they're targets). Returns
 *                              { group, turretSpots, coreAt, shield,
 *                              collapse(k), setShield(alpha), dispose() }
 *   buildTurret()              a gun turret on a tower: { root, head, radius, centre, animate }
 *   buildCore()                the reactor core: { root, radius, centre, animate }
 *   buildFragment()            an emerald fragment with a beam of light: { root, animate }
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { glossy, metal } from './models.js';

const TAU = Math.PI * 2;
export const COMPOUND = { pad: 36, wall: 31, segments: 16, height: 7, keepOut: 39, shield: 17 };

function lamp(color, k = 3.5) {
	return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });   // (past white: it blooms)
}

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
	const m = new THREE.Mesh(geo, mat);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	if (parent) parent.add(m);
	return m;
}

let hazardTex = null;
function hazard() {
	if (hazardTex) return hazardTex;
	const c = document.createElement('canvas');
	c.width = 256;
	c.height = 32;
	const g = c.getContext('2d');
	g.fillStyle = '#ffc21a';
	g.fillRect(0, 0, 256, 32);
	g.fillStyle = '#16171b';
	for (let i = -1; i < 9; i++) {
		g.beginPath();
		g.moveTo(i * 32, 32);
		g.lineTo(i * 32 + 16, 32);
		g.lineTo(i * 32 + 40, 0);
		g.lineTo(i * 32 + 24, 0);
		g.fill();
	}
	hazardTex = new THREE.CanvasTexture(c);
	hazardTex.colorSpace = THREE.SRGBColorSpace;
	hazardTex.wrapS = THREE.RepeatWrapping;
	hazardTex.repeat.set(3, 1);
	return hazardTex;
}

// The fortress round a site. at: { x, y, z } (y: the pad's top); level: how
// hard (more hangars as it rises).
export function buildCompound(at, level) {
	const C = COMPOUND;
	const group = new THREE.Group();
	group.position.set(at.x, at.y, at.z);
	const CONCRETE = new THREE.MeshStandardMaterial({ color: 0x8d9198, roughness: 0.85 });
	const STEEL = metal(0x5b5470, { roughness: 0.45 });
	const DARK = metal(0x2a2633, { roughness: 0.5 });
	const ROOF = glossy(0x7b3fd1);
	const STRIPE = new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.6 });

	// the pad, deep enough to cover the slope it sits on
	mesh(new THREE.CylinderGeometry(C.pad, C.pad + 3, 10, 10), CONCRETE, 0, -5, 0, group);
	mesh(new THREE.RingGeometry(C.pad - 6, C.pad - 4.5, 40).rotateX(-Math.PI / 2), lamp(0xff3b2a, 1.6), 0, 0.05, 0, group).castShadow = false;

	// the walls: segments round a ring, four gaps for gates
	const walls = [];
	const seg = 2 * C.wall * Math.sin(Math.PI / C.segments) + 0.4;
	for (let i = 0; i < C.segments; i++) {
		if (i % 4 === 0) continue;   // (a gate)
		const a = (i + 0.5) / C.segments * TAU;
		const pivot = new THREE.Group();
		pivot.position.set(Math.cos(a) * C.wall, 0, Math.sin(a) * C.wall);
		pivot.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));   // (local +Z: outward)
		group.add(pivot);
		mesh(new THREE.BoxGeometry(seg, C.height, 2.2), STEEL, 0, C.height / 2, 0, pivot);
		mesh(new THREE.BoxGeometry(seg + 0.1, 0.8, 2.4), STRIPE, 0, C.height - 0.4, 0, pivot);
		walls.push({ pivot, fall: 0.9 + Math.random() * 0.6, spin: (Math.random() - 0.5) * 0.4 });
	}

	// hangars inside, and a radar mast
	const huts = [];
	const nHuts = Math.min(5, 2 + Math.floor(level / 2));
	for (let i = 0; i < nHuts; i++) {
		const a = (i + 0.3) / nHuts * TAU;
		const hut = new THREE.Group();
		hut.position.set(Math.cos(a) * 21, 0, Math.sin(a) * 21);
		hut.rotation.y = -a;
		group.add(hut);
		mesh(new THREE.BoxGeometry(8, 5, 6), DARK, 0, 2.5, 0, hut);
		const roof = mesh(new THREE.CylinderGeometry(3.2, 3.2, 8.2, 12, 1, false, 0, Math.PI), ROOF, 0, 5, 0, hut);
		roof.rotation.z = Math.PI / 2;
		roof.rotation.y = Math.PI / 2;
		mesh(new THREE.BoxGeometry(3, 3, 0.2), lamp(0xffa030, 1.2), 0, 1.8, 3.05, hut);
		huts.push({ hut, tilt: (Math.random() - 0.5) * 0.6 });
	}

	// the gun towers' plinths, between the gates (the turrets sit on top)
	const turretSpots = [];
	for (let i = 0; i < 4; i++) {
		const a = (i + 0.5) / 4 * TAU;
		const x = Math.cos(a) * C.wall, z = Math.sin(a) * C.wall;
		mesh(new THREE.CylinderGeometry(4, 4.6, 3, 12), STEEL, x, 1.5, z, group);
		turretSpots.push(new THREE.Vector3(at.x + x, at.y + 3, at.z + z));
	}

	// the shield round the core: a shimmering dome
	const shieldMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5ad8ff).multiplyScalar(1.4), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
	const shield = mesh(new THREE.SphereGeometry(C.shield, 40, 20), shieldMat, 0, 4, 0, group);
	shield.castShadow = false;
	shield.receiveShadow = false;
	const hex = mesh(new THREE.IcosahedronGeometry(C.shield + 0.1, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9aeaff).multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 4, 0, group);
	hex.castShadow = false;
	hex.receiveShadow = false;

	const compound = {
		group, turretSpots, shield,
		coreAt: new THREE.Vector3(at.x, at.y, at.z),
		// the shield: alpha 1 up, 0 gone (flash > 0: hit, brighter)
		setShield(alpha, t = 0, flash = 0) {
			shield.visible = hex.visible = alpha > 0.01;
			shieldMat.opacity = (0.16 + 0.06 * Math.sin(t * 3) + flash * 0.5) * alpha;
			hex.material.opacity = (0.3 + flash * 0.6) * alpha;
			hex.rotation.y = t * 0.15;
			const s = 0.6 + 0.4 * alpha;
			shield.scale.set(s, s * alpha + 0.01, s);
			hex.scale.copy(shield.scale);
		},
		// destroyed: k 0 (standing) .. 1 (rubble)
		collapse(k) {
			const e = 1 - (1 - k) * (1 - k);
			for (const w of walls) {
				w.pivot.rotation.x = e * Math.PI / 2 * w.fall;
				w.pivot.rotation.z = e * w.spin;
				w.pivot.position.y = -e * 2.2;
			}
			for (const h of huts) {
				h.hut.position.y = -e * 4;
				h.hut.rotation.z = e * h.tilt;
			}
		},
		dispose() {
			group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map !== hazardTex) [].concat(o.material).forEach((m) => m.dispose()); });
		},
	};
	compound.setShield(1);
	return compound;
}

// A gun turret on a tower: the head turns to aim; twin barrels and a red eye.
export function buildTurret() {
	const root = new THREE.Group();
	const STEEL = metal(0x4a4f5a);
	const PURPLE = glossy(0x7b3fd1);
	const BLACK = glossy(0x18181c);
	mesh(new THREE.CylinderGeometry(2.4, 3.2, 8, 12), STEEL, 0, 4, 0, root);
	mesh(new THREE.CylinderGeometry(3.25, 3.25, 1.2, 12), new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.6 }), 0, 7.4, 0, root);
	const head = new THREE.Group();
	head.position.y = 9.6;
	root.add(head);
	mesh(new THREE.SphereGeometry(2.3, 20, 14), PURPLE, 0, 0, 0, head);
	mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.6, 20), BLACK, 0, -0.4, 0, head);
	for (const side of [-1, 1]) {
		const barrel = mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.4, 10), BLACK, side * 0.8, 0.2, 2.6, head);
		barrel.rotation.x = Math.PI / 2;
		mesh(new THREE.SphereGeometry(0.22, 8, 6), lamp(0xff3060), side * 0.8, 0.2, 4.35, head);
	}
	const eye = mesh(new THREE.SphereGeometry(0.55, 14, 10), lamp(0xff2a2a), 0, 0.9, 1.9, head);
	return {
		root, head, radius: 3.2, centre: 9.6,
		animate(t, dt, firing) {
			eye.scale.setScalar(0.8 + 0.3 * Math.abs(Math.sin(t * (firing ? 9 : 3))));
		},
	};
}

// The reactor core: a squat base, a tower ringed with glowing bands, a
// pulsing red dome, and Doctor Klank's gear turning round it.
export function buildCore() {
	const root = new THREE.Group();
	const STEEL = metal(0x5b5470);
	const DARK = metal(0x2a2633);
	mesh(new THREE.CylinderGeometry(9, 10, 4, 16), STEEL, 0, 2, 0, root);
	mesh(new THREE.CylinderGeometry(5.5, 6.5, 10, 16), DARK, 0, 9, 0, root);
	const bands = [];
	for (let i = 0; i < 3; i++) {
		const b = mesh(new THREE.TorusGeometry(6.1, 0.35, 8, 32), lamp(0xff3b2a, 2.5), 0, 6 + i * 3, 0, root);
		b.rotation.x = Math.PI / 2;
		b.castShadow = false;
		bands.push(b);
	}
	const dome = mesh(new THREE.SphereGeometry(4.6, 24, 14, 0, TAU, 0, Math.PI / 2), lamp(0xff4a2a, 2.2), 0, 14, 0, root);
	const gear = new THREE.Group();
	gear.position.y = 9;
	root.add(gear);
	mesh(new THREE.TorusGeometry(9.5, 0.6, 8, 40), glossy(0xffc21a), 0, 0, 0, gear).rotation.x = Math.PI / 2;
	for (let i = 0; i < 12; i++) {
		const a = i / 12 * TAU;
		mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), glossy(0xffc21a), Math.cos(a) * 10.2, 0, Math.sin(a) * 10.2, gear).rotation.y = -a;
	}
	return {
		root, radius: 8, centre: 9,
		animate(t) {
			gear.rotation.y = t * 0.6;
			const p = 0.85 + 0.15 * Math.sin(t * 4);
			dome.scale.setScalar(p);
			bands.forEach((b, i) => b.scale.setScalar(0.96 + 0.06 * Math.sin(t * 5 + i)));
		},
	};
}

// An emerald fragment: a faceted green crystal, spinning and bobbing, with a
// tall beam of green light so it can be seen from far off.
export function buildFragment() {
	const root = new THREE.Group();
	const gem = new THREE.Group();
	root.add(gem);
	const crystal = mesh(new THREE.OctahedronGeometry(1.3, 0), new THREE.MeshPhysicalMaterial({ color: 0x1fe07a, emissive: 0x18ff70, emissiveIntensity: 2.2, roughness: 0.08, metalness: 0.1, clearcoat: 1, flatShading: true }), 0, 0, 0, gem);
	crystal.scale.set(1, 1.7, 1);
	const shard = mesh(new THREE.OctahedronGeometry(0.6, 0), crystal.material, 1.0, -0.6, 0.3, gem);
	shard.rotation.z = 0.6;
	const beam = mesh(new THREE.CylinderGeometry(0.7, 1.4, 70, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x30ff80).multiplyScalar(1.5), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, 35, 0, root);
	beam.castShadow = beam.receiveShadow = false;
	return {
		root,
		animate(t) {
			gem.rotation.y = t * 2;
			gem.position.y = 2 + Math.sin(t * 2.5) * 0.4;
			beam.material.opacity = 0.16 + 0.08 * Math.sin(t * 4);
		},
	};
}
