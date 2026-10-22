/*
 * Knuckles Quest: the models. The climber (Knuckles: the shared speedster
 * build as the echidna, with spiked fists and dreadlocks), rings, emerald
 * fragments, the tap marker, braziers and sprite textures.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildSpeedster } from '../../shared/speedster3d.js';
import { canvasTexture } from '../../lib/three/walls.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- the climber ---------- */

// Knuckles: the shared speedster build as the echidna (spiked fists, dreadlocks).
// Faces -z, feet on y = 0. animate(dt, mode, pace, time) with mode
// 'idle' | 'run' | 'jump' (a spinning ball) | 'glide' | 'climb' | 'fall'.
// In 'climb' the wall is in front of him (-z) and pace is how fast he's
// climbing (signed: + up).
export function buildClimber() {
	const root = new THREE.Group();
	const s = buildSpeedster(0xc4141e, { knuckles: true });
	root.add(s.root);

	function animate(dt, mode = 'idle', pace = 0, time = 0) {
		// (the speedster's own root: laid flat for a glide, up against the wall to climb)
		s.root.rotation.set(0, 0, 0);
		s.root.position.set(0, 0, 0);
		if (mode === 'jump') return s.animate(dt, 'ball', 0, 22, time);
		if (mode === 'glide') {
			s.root.rotation.set(-1.25, 0, Math.sin(time * 2.2) * 0.12);
			s.root.position.y = 0.6;
		}
		if (mode === 'climb') s.root.position.z = 0.08;
		s.animate(dt, mode, pace, 0, time);
	}

	animate(0, 'idle');
	return { root, lean: s.lean, torso: s.torso, head: s.head, animate };
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
