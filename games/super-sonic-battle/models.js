/*
 * Super Sonic Battle: the models. Robotnik's battle machine (a great red
 * egg of a robot with glaring eyes, spiked shoulders, claw arms, missile
 * pods and roaring thrusters, Robotnik himself in his Egg Mobile under a
 * glass dome on top), its weak spots, the seven Chaos Emeralds, the
 * badniks and Buzz Bombers, the rings, the missiles, the warning rings and
 * shockwaves, Super Sonic's energy orbs, the blur of his legs flat out, the arena (a
 * round, chequered field on a clifftop over the sea, palms round its rim),
 * and the textures for the fire, smoke, sparkles and the transformation's
 * vortex.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildRobotnik } from '../../shared/robotnik3d.js';
import { buildPalm, buildRing, sparkleTexture } from '../loop-island/models.js';
import { buildBuzzer } from '../iron-stride/models.js';

// (gold rings, from Sonic Dash; Buzz Bomber minions, from Sonic Robot)
export { sparkleTexture, buildRing, buildBuzzer };

const TAU = Math.PI * 2;

function canvas(w, h, paint, srgb = true) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	if (srgb) t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

/* ---------- materials ---------- */

export function glossy(color, extra = {}) {
	return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 }, extra));
}
export const metal = (color, extra = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, metalness: 0.6, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.3 }, extra));
export const chrome = () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1 });
// (brighter than white: it blooms)
export const glow = (color, k = 2.4) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

/* ---------- textures ---------- */

// A soft round glow, white in the middle (tinted by the sprite's colour).
export function glowTexture() {
	return canvas(128, 128, function (g, w) {
		const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.25, 'rgba(255,255,255,0.6)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, w, w);
	});
}

// A ball of fire: white-hot in the middle, orange, red at the ragged edge.
export function fireTexture() {
	return canvas(128, 128, function (g, w) {
		const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		r.addColorStop(0, 'rgba(255,250,220,1)');
		r.addColorStop(0.25, 'rgba(255,200,80,0.95)');
		r.addColorStop(0.55, 'rgba(255,90,20,0.7)');
		r.addColorStop(1, 'rgba(160,20,0,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, w, w);
		// (lumpy: a few darker blotches)
		g.globalCompositeOperation = 'destination-out';
		for (let i = 0; i < 14; i++) {
			const a = Math.random() * TAU, d = w * (0.28 + Math.random() * 0.2), s = w * (0.06 + Math.random() * 0.08);
			const b = g.createRadialGradient(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, 0, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, s);
			b.addColorStop(0, 'rgba(0,0,0,0.6)');
			b.addColorStop(1, 'rgba(0,0,0,0)');
			g.fillStyle = b;
			g.fillRect(0, 0, w, w);
		}
	});
}

// A puff of smoke: soft grey, lumpy.
export function smokeTexture() {
	return canvas(128, 128, function (g, w) {
		for (let i = 0; i < 9; i++) {
			const x = w / 2 + (Math.random() - 0.5) * w * 0.35, y = w / 2 + (Math.random() - 0.5) * w * 0.35, s = w * (0.2 + Math.random() * 0.15);
			const r = g.createRadialGradient(x, y, 0, x, y, s);
			r.addColorStop(0, 'rgba(255,255,255,0.5)');
			r.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = r;
			g.fillRect(0, 0, w, w);
		}
	});
}

// The transformation's vortex: streaks of light spiralling up (wrapped round a cone).
export function swirlTexture() {
	const t = canvas(256, 512, function (g, w, h) {
		g.fillStyle = 'rgba(0,0,0,0)';
		g.fillRect(0, 0, w, h);
		g.lineCap = 'round';
		for (let i = 0; i < 26; i++) {
			const x = Math.random() * w, y = Math.random() * h, len = 80 + Math.random() * 220;
			const a = 0.25 + Math.random() * 0.6;
			const gr = g.createLinearGradient(x, y, x + len * 0.5, y + len);
			gr.addColorStop(0, 'rgba(255,255,255,0)');
			gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
			gr.addColorStop(1, 'rgba(255,255,255,0)');
			g.strokeStyle = gr;
			g.lineWidth = 3 + Math.random() * 9;
			for (const dx of [-w, 0, w]) {   // (so it wraps round seamlessly)
				g.beginPath();
				g.moveTo(x + dx, y);
				g.lineTo(x + dx + len * 0.5, y + len);
				g.stroke();
			}
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	return t;
}

// The blur of his legs flat out: a whirling wheel of red shoes and blue
// legs smeared round, a white rim of speed (for a disc side on to him).
export function legBlurTexture() {
	return canvas(256, 256, function (g, w) {
		g.translate(w / 2, w / 2);
		// a haze of blue through it all
		const haze = g.createRadialGradient(0, 0, 0, 0, 0, 110);
		haze.addColorStop(0, 'rgba(40,90,230,0.55)');
		haze.addColorStop(0.75, 'rgba(40,90,230,0.4)');
		haze.addColorStop(1, 'rgba(40,90,230,0)');
		g.fillStyle = haze;
		g.beginPath();
		g.arc(0, 0, 110, 0, TAU);
		g.fill();
		// the legs: blue streaks from the hub out
		for (let i = 0; i < 10; i++) {
			g.rotate(TAU / 10);
			const gr = g.createLinearGradient(0, 0, 0, -100);
			gr.addColorStop(0, 'rgba(40,90,230,0)');
			gr.addColorStop(0.5, 'rgba(40,100,240,0.6)');
			gr.addColorStop(1, 'rgba(40,100,240,0)');
			g.fillStyle = gr;
			g.fillRect(-7, -100, 14, 100);
		}
		// the shoes: red smears round the rim, fading behind as they go
		for (let k = 0; k < 2; k++) {
			for (let i = 0; i < 24; i++) {
				const a = k * Math.PI + i / 24 * Math.PI * 0.95;
				g.strokeStyle = `rgba(${230 + i},${40 + i * 2},${40 + i * 2},${(1 - i / 24) * 0.9})`;
				g.lineWidth = 26;
				g.beginPath();
				g.arc(0, 0, 92, a, a + 0.14);
				g.stroke();
			}
		}
		// a white rim of speed
		g.strokeStyle = 'rgba(255,255,255,0.55)';
		g.lineWidth = 6;
		for (const a of [0.3, 2.1, 3.9]) { g.beginPath(); g.arc(0, 0, 112, a, a + 1.2); g.stroke(); }
	});
}

// The field: a big chequer of two greens, a few flowers, 8 m a square.
export function fieldTexture(anisotropy = 4) {
	const t = canvas(512, 512, function (g, w) {
		const n = 4;
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
			g.fillStyle = (i + j) % 2 ? '#4fb83a' : '#68cc48';
			g.fillRect(i * w / n, j * w / n, w / n, w / n);
		}
		// tufts and speckles
		for (let i = 0; i < 2400; i++) {
			g.fillStyle = Math.random() < 0.5 ? 'rgba(30,90,20,0.18)' : 'rgba(200,255,140,0.14)';
			g.fillRect(Math.random() * w, Math.random() * w, 2, 3 + Math.random() * 4);
		}
		for (let i = 0; i < 26; i++) {
			const x = Math.random() * w, y = Math.random() * w;
			g.fillStyle = ['#fff6a0', '#ffffff', '#ff8ac8', '#ffd23a'][i % 4];
			for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * TAU / 5) * 3, y + Math.sin(p * TAU / 5) * 3, 2.4, 0, TAU); g.fill(); }
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = anisotropy;
	return t;
}

// The clifftop's sides: brown chequered earth, the classic Green Hill look.
export function cliffTexture() {
	const t = canvas(256, 256, function (g, w) {
		const n = 4;
		for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
			g.fillStyle = (i + j) % 2 ? '#a8602a' : '#c8803a';
			g.fillRect(i * w / n, j * w / n, w / n, w / n);
		}
		g.fillStyle = 'rgba(60,20,0,0.18)';
		for (let i = 0; i < 300; i++) g.fillRect(Math.random() * w, Math.random() * w, 3, 3);
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	return t;
}

/* ---------- the arena ---------- */

// The field (radius r, its top at y = 0) on a chequered clifftop, the sea far
// below, palms round the rim, and a scorched ring round the middle where the
// machine's thrusters burn.
export function buildArena(r, anisotropy) {
	const g = new THREE.Group();
	const tex = fieldTexture(anisotropy);
	tex.repeat.set(r * 2 / 32, r * 2 / 32);   // (four 8 m squares to a repeat)
	const field = new THREE.Mesh(new THREE.CircleGeometry(r, 128), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
	field.rotation.x = -Math.PI / 2;
	field.receiveShadow = true;
	g.add(field);
	// a scorch under the machine
	const scorch = new THREE.Mesh(new THREE.CircleGeometry(12, 64), new THREE.MeshBasicMaterial({
		map: canvas(256, 256, function (c, w) {
			const rg = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
			rg.addColorStop(0, 'rgba(20,10,0,0.75)');
			rg.addColorStop(0.6, 'rgba(40,20,0,0.4)');
			rg.addColorStop(1, 'rgba(40,20,0,0)');
			c.fillStyle = rg;
			c.fillRect(0, 0, w, w);
		}), transparent: true, depthWrite: false,
	}));
	scorch.rotation.x = -Math.PI / 2;
	scorch.position.y = 0.02;
	g.add(scorch);
	// the cliff, falling away to the sea
	const ct = cliffTexture();
	ct.repeat.set(Math.round(r * TAU / 8), 6);
	const cliff = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 48, 128, 1, true), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.9 }));
	cliff.position.y = -24;
	g.add(cliff);
	// a lip of grass over the edge
	const lip = new THREE.Mesh(new THREE.TorusGeometry(r, 0.5, 8, 128), new THREE.MeshStandardMaterial({ color: 0x3f9a2c, roughness: 0.8 }));
	lip.rotation.x = Math.PI / 2;
	g.add(lip);
	// palms round the rim, rocks here and there
	for (let i = 0; i < 26; i++) {
		const a = i / 26 * TAU + (Math.random() - 0.5) * 0.12;
		const d = r - 3 - Math.random() * 6;
		const p = buildPalm(7 + Math.random() * 5);
		p.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
		p.rotation.y = Math.random() * TAU;
		g.add(p);
	}
	const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8a78, roughness: 0.8, flatShading: true });
	for (let i = 0; i < 18; i++) {
		const a = Math.random() * TAU, d = r - 8 - Math.random() * 10;
		const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.6, 0), rockMat);
		rock.position.set(Math.sin(a) * d, 0.3, Math.cos(a) * d);
		rock.rotation.set(Math.random() * 3, Math.random() * 3, 0);
		rock.castShadow = true;
		g.add(rock);
	}
	// the sea, far below, out to the horizon
	const sea = new THREE.Mesh(new THREE.CircleGeometry(1500, 64), new THREE.MeshPhysicalMaterial({ color: 0x1a7ac8, roughness: 0.12, metalness: 0.1, clearcoat: 1 }));
	sea.rotation.x = -Math.PI / 2;
	sea.position.y = -46;
	g.add(sea);
	return g;
}

/* ---------- Robotnik's battle machine ---------- */

// A great red egg of a robot, about 17 m from its thrusters to the top of
// its dome, floating; its middle at the root, facing -z. body turns and
// flinches inside the root; pod is the Egg Mobile on top (Robotnik in it,
// under the dome), to fly off when the machine blows. spots: the weak spots
// (in body space): { name, at, normal, side } (side: 0 the front, 1 the
// sides, 2 the back, how hard they are to get at).
//   const boss = buildBoss();
//   boss.animate(dt, time, { anger, charge, hurt });
export function buildBoss() {
	const root = new THREE.Group();
	const body = new THREE.Group();
	root.add(body);

	const red = metal(0xd2231e, { metalness: 0.45, roughness: 0.28 });
	const gunmetal = metal(0x3a3e48, { metalness: 0.75, roughness: 0.32 });
	const steel = metal(0xb8bec8, { metalness: 0.9, roughness: 0.2 });
	const goldM = metal(0xffc23a, { metalness: 1, roughness: 0.18, emissive: 0x6a3a00, emissiveIntensity: 0.8 });
	const black = metal(0x101014, { metalness: 0.3, roughness: 0.4 });
	const eyeMat = glow(0xffd040, 2.2);
	const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a30).multiplyScalar(2.4), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });

	const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		parent.add(m);
		return m;
	};

	// the egg: red over, gunmetal under, a gold band round its middle
	const R = 5.2;
	add(body, new THREE.SphereGeometry(R, 48, 24, 0, TAU, 0, Math.PI / 2), red, 0, 0, 0, 1, 1.15, 0.95);
	add(body, new THREE.SphereGeometry(R, 48, 24, 0, TAU, Math.PI / 2, Math.PI / 2), gunmetal, 0, 0, 0, 1, 0.85, 0.95);
	const band = add(body, new THREE.TorusGeometry(R, 0.38, 12, 64), goldM, 0, 0, 0, 1, 0.95, 1);
	band.rotation.x = Math.PI / 2;
	band.scale.set(1.01, 0.96, 1);
	// rivets round the band
	const rivetGeo = new THREE.SphereGeometry(0.16, 8, 6);
	for (let i = 0; i < 28; i++) {
		const a = i / 28 * TAU;
		add(body, rivetGeo, steel, Math.sin(a) * R * 1.02, 0.55, Math.cos(a) * R * 0.97);
	}

	// the face: a black visor, two great glaring eyes, a grille of a mouth
	// (a band of the sphere round the front: phi 1.5 pi is -z, theta from the top)
	add(body, new THREE.SphereGeometry(R * 1.005, 40, 12, Math.PI * 1.22, Math.PI * 0.56, Math.PI * 0.25, Math.PI * 0.22), black, 0, 0, 0, 1, 1.15, 0.95);
	const eyes = [-1, 1].map(function (s) {
		const e = add(body, new THREE.SphereGeometry(0.95, 24, 12), eyeMat, s * 1.7, 2.3, -R * 0.86, 1.1, 0.7, 0.4);
		e.rotation.z = s * -0.35;   // (slanted: angry)
		e.castShadow = false;
		// a heavy brow over it
		const brow = add(body, new THREE.BoxGeometry(2.4, 0.45, 0.8), gunmetal, s * 1.7, 3.15, -R * 0.84);
		brow.rotation.z = s * -0.35;
		return e;
	});
	for (let i = 0; i < 4; i++) add(body, new THREE.BoxGeometry(3.2 - i * 0.4, 0.16, 0.5), steel, 0, -0.5 - i * 0.42, -R * 0.92 + i * 0.05);

	// the shoulders: big gunmetal balls with silver spikes, missile pods on top
	const shoulders = [];
	const spikeGeo = new THREE.ConeGeometry(0.42, 1.6, 12);
	const podGeo = new THREE.BoxGeometry(1.8, 1.0, 1.6);
	const tubeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12);
	for (const s of [-1, 1]) {
		const sh = new THREE.Group();
		sh.position.set(s * 5.4, 1.6, 0);
		body.add(sh);
		add(sh, new THREE.SphereGeometry(1.9, 32, 16), red);
		for (let i = 0; i < 3; i++) {
			const sp = add(sh, spikeGeo, steel);
			const a = (i - 1) * 0.6;
			sp.position.set(s * Math.cos(a) * 1.9, Math.sin(a) * 1.9 + 0.3, 0);
			sp.rotation.z = -s * (Math.PI / 2 - a);
		}
		const pod = add(sh, podGeo, gunmetal, 0, 2.1, 0);
		for (let i = 0; i < 4; i++) {
			const tb = add(pod, tubeGeo, black, (i % 2 - 0.5) * 0.8, 0.45, (Math.floor(i / 2) - 0.5) * 0.7);
			tb.castShadow = false;
		}
		// the arm: down and out from the shoulder, an elbow, a claw
		const arm = new THREE.Group();
		arm.position.set(s * 0.6, -1.2, 0);
		sh.add(arm);
		const upper = add(arm, new THREE.CylinderGeometry(0.55, 0.65, 4, 16), gunmetal, 0, -2, 0);
		upper.castShadow = true;
		const fore = new THREE.Group();
		fore.position.set(0, -4, 0);
		arm.add(fore);
		add(fore, new THREE.SphereGeometry(0.85, 16, 12), steel);
		add(fore, new THREE.CylinderGeometry(0.75, 0.55, 3.6, 16), red, 0, -1.8, -0.4).rotation.x = 0.25;
		const claw = new THREE.Group();
		claw.position.set(0, -3.8, -0.9);
		fore.add(claw);
		add(claw, new THREE.SphereGeometry(1.1, 20, 14), gunmetal);
		const clawGeo = new THREE.ConeGeometry(0.32, 1.7, 10);
		for (let i = 0; i < 3; i++) {
			const c = add(claw, clawGeo, steel);
			const a = i / 3 * TAU;
			c.position.set(Math.cos(a) * 0.7, -1.1, Math.sin(a) * 0.7);
			c.rotation.set(Math.sin(a) * -0.4, 0, Math.cos(a) * 0.4 + Math.PI);
		}
		arm.rotation.z = s * 0.35;
		arm.rotation.x = -0.25;
		fore.rotation.x = -0.6;
		shoulders.push({ s, group: sh, arm, fore, pod, muzzle: new THREE.Vector3(s * 5.4, 4.2, 0) });
	}

	// the thrusters underneath, roaring
	const flames = [];
	for (let i = 0; i < 3; i++) {
		const a = i / 3 * TAU + Math.PI / 6;
		const x = Math.sin(a) * 2.6, z = Math.cos(a) * 2.6;
		add(body, new THREE.CylinderGeometry(1.0, 0.8, 1.6, 20), steel, x, -4.4, z);
		add(body, new THREE.TorusGeometry(0.85, 0.15, 8, 20), goldM, x, -5.2, z).rotation.x = Math.PI / 2;
		const f = add(body, new THREE.ConeGeometry(0.75, 3.2, 16, 1, true), flameMat, x, -6.8, z);
		f.rotation.x = Math.PI;
		f.castShadow = false;
		flames.push(f);
	}
	// the booster on its back, with a fin
	add(body, new THREE.CylinderGeometry(1.5, 1.8, 3, 24), gunmetal, 0, 1, R * 0.92).rotation.x = Math.PI / 2;
	add(body, new THREE.TorusGeometry(1.5, 0.2, 8, 24), goldM, 0, 1, R * 0.92 + 1.5);
	const backFlame = add(body, new THREE.ConeGeometry(1.2, 3.2, 16, 1, true), flameMat, 0, 1, R * 0.92 + 3.1);
	backFlame.rotation.x = -Math.PI / 2;
	backFlame.castShadow = false;
	flames.push(backFlame);
	const fin = add(body, new THREE.BoxGeometry(0.35, 3, 3.4), red, 0, 4.5, R * 0.55);
	fin.rotation.x = -0.4;

	// the Egg Mobile on top, under a glass dome, Robotnik in it
	const pod = new THREE.Group();
	pod.position.set(0, R * 1.1 + 0.6, -0.6);
	pod.scale.setScalar(1.6);   // (big enough to read from across the field)
	body.add(pod);
	add(pod, new THREE.SphereGeometry(1.7, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), metal(0xe8ecf2, { metalness: 0.4, roughness: 0.25 }), 0, 0.4, 0, 1, 0.9, 1.1);
	const podBand = add(pod, new THREE.TorusGeometry(1.7, 0.14, 8, 32), goldM, 0, 0.35, 0, 1, 1.1, 1);
	podBand.rotation.x = Math.PI / 2;
	podBand.scale.set(1, 1.1, 1);
	add(pod, new THREE.CylinderGeometry(0.5, 0.5, 0.25, 16), black, 0, -1.1, 0);
	const robotnik = buildRobotnik();
	robotnik.root.position.set(0, -0.25, 0.15);
	robotnik.root.scale.setScalar(1.05);
	pod.add(robotnik.root);
	const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xc8ecff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, envMapIntensity: 2 }));
	dome.position.y = 0.4;
	dome.renderOrder = 3;
	pod.add(dome);
	// a seat for the pod: a gold ring sunk in the top of the egg
	add(body, new THREE.TorusGeometry(3.0, 0.4, 10, 32), goldM, 0, R * 1.1 - 0.1, -0.6).rotation.x = Math.PI / 2;

	// the weak spots: where the targets show (body space; a little proud of the surface)
	const spots = [
		{ name: 'core', at: new THREE.Vector3(0, -1.4, -R * 0.97), normal: new THREE.Vector3(0, -0.1, -1), side: 0 },
		{ name: 'eye', at: new THREE.Vector3(-1.7, 2.3, -R * 0.95), normal: new THREE.Vector3(-0.15, 0.2, -1), side: 0 },
		{ name: 'eye', at: new THREE.Vector3(1.7, 2.3, -R * 0.95), normal: new THREE.Vector3(0.15, 0.2, -1), side: 0 },
		{ name: 'cockpit', at: new THREE.Vector3(0, R * 1.1 + 1.6, -3.6), normal: new THREE.Vector3(0, 0.4, -1), side: 0 },
		{ name: 'pod', at: new THREE.Vector3(-5.4, 4.0, -1.0), normal: new THREE.Vector3(-0.3, 0.4, -1), side: 0 },
		{ name: 'pod', at: new THREE.Vector3(5.4, 4.0, -1.0), normal: new THREE.Vector3(0.3, 0.4, -1), side: 0 },
		{ name: 'shoulder', at: new THREE.Vector3(-7.4, 1.6, 0), normal: new THREE.Vector3(-1, 0, 0), side: 1 },
		{ name: 'shoulder', at: new THREE.Vector3(7.4, 1.6, 0), normal: new THREE.Vector3(1, 0, 0), side: 1 },
		{ name: 'flank', at: new THREE.Vector3(-R * 1.0, -1.4, 1.2), normal: new THREE.Vector3(-1, -0.1, 0.2), side: 1 },
		{ name: 'flank', at: new THREE.Vector3(R * 1.0, -1.4, 1.2), normal: new THREE.Vector3(1, -0.1, 0.2), side: 1 },
		{ name: 'booster', at: new THREE.Vector3(0, 1, R * 0.92 + 1.7), normal: new THREE.Vector3(0, 0, 1), side: 2 },
		{ name: 'fin', at: new THREE.Vector3(0, 6.2, R * 0.5), normal: new THREE.Vector3(0, 0.3, 1), side: 2 },
	];
	for (const s of spots) s.normal.normalize();

	const eyeBase = eyeMat.color.clone();
	let hurtT = 0;
	function animate(dt, time, { anger = 0, charge = 0, hurt = 0 } = {}) {
		// bobbing, the arms swinging, the flames flickering
		body.position.y = Math.sin(time * 0.9) * 0.5;
		body.rotation.z = Math.sin(time * 0.7) * 0.04;
		for (const sh of shoulders) {
			sh.arm.rotation.x = -0.25 + Math.sin(time * 1.1 + sh.s) * 0.15 - charge * 0.6;
			sh.arm.rotation.z = sh.s * (0.35 + Math.sin(time * 0.8 + sh.s * 2) * 0.08 + charge * 0.25);
			sh.fore.rotation.x = -0.6 + Math.sin(time * 1.3 + sh.s) * 0.15 - charge * 0.4;
		}
		for (let i = 0; i < flames.length; i++) {
			const f = flames[i];
			const k = 0.85 + Math.sin(time * 40 + i * 2.1) * 0.1 + Math.random() * 0.1;
			f.scale.set(k, k * (1 + anger * 0.4), k);
		}
		// the eyes: glaring yellow, red with anger, white-hot when it's hit
		hurtT = Math.max(hurtT - dt, 0);
		const c = eyeMat.color.copy(eyeBase).lerp(new THREE.Color(0xff2a1a).multiplyScalar(2.6), Math.min(1, anger + charge));
		if (hurt > 0) c.lerp(new THREE.Color(4, 4, 4), hurt);
		for (const e of eyes) e.scale.set(1.1, 0.7 * (1 + charge * 0.3), 0.4);
		robotnik.animate(dt, 'idle', 0, 0, time);
	}

	return { root, body, pod, robotnik, eyes, shoulders, spots, flames, radius: R, animate };
}

// A weak spot's target: a pulsing bullseye of light, to sit on the machine.
export function buildTarget() {
	const g = new THREE.Group();
	const ringTex = canvas(256, 256, function (c, w) {
		c.lineWidth = 18;
		c.strokeStyle = 'white';
		for (const r of [110, 62]) { c.beginPath(); c.arc(w / 2, w / 2, r, 0, TAU); c.stroke(); }
		c.fillStyle = 'white';
		c.beginPath();
		c.arc(w / 2, w / 2, 22, 0, TAU);
		c.fill();
		// the four ticks of a crosshair
		for (let i = 0; i < 4; i++) {
			c.save();
			c.translate(w / 2, w / 2);
			c.rotate(i * Math.PI / 2);
			c.fillRect(-6, -128, 12, 34);
			c.restore();
		}
	});
	const ring = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: ringTex, color: new THREE.Color(0xffe040).multiplyScalar(2.6), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
	ring.renderOrder = 5;
	g.add(ring);
	const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12), glow(0xff5a2a, 2.8));
	g.add(core);
	g.userData = { ring, core };
	return g;
}

/* ---------- the Chaos Emeralds ---------- */

export const EMERALD_COLOURS = [0x2fe86a, 0xff2a4a, 0x3a7bff, 0xffd21a, 0x2fe8f0, 0xb04aff, 0xe8f0ff];

// A cut gem: a flat table, a crown, a deep pavilion, glowing from within;
// a soft glow round it and a column of light up from it (to spot it from
// across the field). Its middle at the root.
export function buildEmerald(colour, glowTex) {
	const g = new THREE.Group();
	const c = new THREE.Color(colour);
	const mat = new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.1, clearcoat: 1, flatShading: true, envMapIntensity: 2 });
	const gem = new THREE.Group();
	g.add(gem);
	const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.2, 8), mat);
	crown.position.y = 0.1;
	gem.add(crown);
	const pav = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 8), mat);
	pav.rotation.x = Math.PI;
	pav.position.y = -0.275;
	gem.add(pav);
	gem.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c.clone().multiplyScalar(0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
	halo.scale.setScalar(2.4);
	g.add(halo);
	const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.9), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
	beam.position.y = 15;
	g.add(beam);
	g.userData = { gem, halo, beam, colour: c };
	g.scale.setScalar(1.25);
	return g;
}

/* ---------- badniks ---------- */

// A ladybug badnik: a red domed shell with white spots, a black face with a
// glaring blue eye, one wheel. About a metre long, facing -z, wheel on y = 0.
export function buildBadnik() {
	const g = new THREE.Group();
	const shell = glossy(0xe02a2a);
	const dark = glossy(0x1a1a22, { roughness: 0.4 });
	const white = glossy(0xffffff);
	const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		m.scale.set(sx, sy, sz);
		m.castShadow = true;
		g.add(m);
		return m;
	};
	add(new THREE.SphereGeometry(0.55, 24, 12, 0, TAU, 0, Math.PI / 2), shell, 0, 0.42, 0.05, 1, 0.9, 1.25);
	add(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), dark, 0, 0.42, 0.05, 1, 1, 1.25);
	for (const [x, z] of [[-0.25, 0.25], [0.25, 0.25], [0, -0.05], [-0.22, -0.3], [0.22, -0.3]]) add(new THREE.SphereGeometry(0.1, 10, 6), white, x, 0.82 - Math.abs(z) * 0.2, z + 0.05, 1, 0.4, 1);
	add(new THREE.SphereGeometry(0.3, 16, 10), dark, 0, 0.45, -0.62);
	add(new THREE.SphereGeometry(0.12, 12, 8), glow(0x3ad0ff, 2.2), 0, 0.52, -0.88);
	const wheel = add(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 16), dark, 0, 0.2, 0);
	wheel.rotation.z = Math.PI / 2;
	g.userData = { wheel };
	return g;
}

/* ---------- missiles, warnings, shockwaves ---------- */

// A missile: a red-tipped steel body with fins, a flame behind. Points +z.
export function buildMissile(fireTex) {
	const g = new THREE.Group();
	const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 12), metal(0xd8dce4, { metalness: 0.8 }));
	bodyM.rotation.x = Math.PI / 2;
	g.add(bodyM);
	const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 12), glossy(0xe02020));
	nose.rotation.x = Math.PI / 2;
	nose.position.z = 0.95;
	g.add(nose);
	for (let i = 0; i < 4; i++) {
		const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.4), glossy(0xe02020));
		fin.position.z = -0.5;
		fin.rotation.z = i * Math.PI / 2;
		fin.position.x = Math.sin(i * Math.PI / 2) * 0.25;
		fin.position.y = Math.cos(i * Math.PI / 2) * 0.25;
		g.add(fin);
	}
	const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
	flame.position.z = -0.9;
	flame.scale.setScalar(1.3);
	g.add(flame);
	g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
	g.userData = { flame };
	return g;
}

// A warning on the ground where something's coming down: a red ring and a
// cross, pulsing. Radius 1 (scale it), lying flat at y = 0.
export function buildWarning() {
	const tex = canvas(256, 256, function (c, w) {
		c.strokeStyle = 'white';
		c.lineWidth = 14;
		c.beginPath();
		c.arc(w / 2, w / 2, 116, 0, TAU);
		c.stroke();
		c.lineWidth = 8;
		c.setLineDash([22, 16]);
		c.beginPath();
		c.arc(w / 2, w / 2, 80, 0, TAU);
		c.stroke();
		c.setLineDash([]);
		c.fillStyle = 'rgba(255,255,255,0.25)';
		c.beginPath();
		c.arc(w / 2, w / 2, 112, 0, TAU);
		c.fill();
	});
	const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0xff2a2a).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
	m.rotation.x = -Math.PI / 2;
	m.position.y = 0.06;
	m.renderOrder = 2;
	return m;
}

// A shockwave: a wall of energy rolling out across the ground from the
// middle, with gaps in it (gaps: their middles, radians round from +z
// toward +x; width: each one's width). Radius 1 (scale x and z), height h.
export function buildShockwave(gaps, width, h = 1.4) {
	const g = new THREE.Group();
	const tex = canvas(64, 128, function (c, w, hh) {
		const gr = c.createLinearGradient(0, hh, 0, 0);
		gr.addColorStop(0, 'rgba(255,255,255,1)');
		gr.addColorStop(0.4, 'rgba(255,255,255,0.6)');
		gr.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = gr;
		c.fillRect(0, 0, w, hh);
	});
	const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0xb04aff).multiplyScalar(2.4), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
	// a piece of wall from each gap round to the next
	// (CylinderGeometry's theta starts at +z, going round toward +x)
	const sorted = gaps.map((a) => ((a % TAU) + TAU) % TAU).sort((a, b) => a - b);
	sorted.forEach(function (a, i) {
		const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + TAU;
		const len = next - a - width;
		if (len <= 0.01) return;
		const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, Math.max(4, Math.ceil(len / TAU * 160)), 1, true, a + width / 2, len), mat);
		wall.position.y = h / 2;
		g.add(wall);
	});
	g.userData = { mat };
	return g;
}

// The vortex round Sonic as he transforms: a cone of light spiralling up.
export function buildVortex(tex) {
	const m = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.9, 7, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0xffe8a0).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
	m.position.y = 3.5;
	m.renderOrder = 4;
	return m;
}
