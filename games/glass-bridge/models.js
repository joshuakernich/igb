/*
 * Glass Bridge: the 3D models. The bridge, its platforms, the vast dark hall
 * around it, the VIP gallery and the big countdown clock are built from
 * three.js primitives and canvas textures; the contestants and guards come
 * from Red Light Green Light. Units are metres; y is up and the bridge runs
 * toward -z, its glass at y = 0.
 */
import * as THREE from '../../lib/three/three.module.min.js';
export { buildContestant, buildGuard, NUMBERS } from '../../shared/squid-game/models.js';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, opts));
const flat = (color, opts = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, opts));

function mesh(geometry, material) {
	return new THREE.Mesh(geometry, material);
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

const STEEL = 0x2b3140;
const GOLD = 0xd9a93b;

/* ---------- the bridge ---------- */

// Two panes a row, on three steel rails. Row i is centred at rowZ(i); a
// pane's side is 0 (left, -x) or 1 (right, +x). Each pane has its own
// materials so it can glow on its own.
export function buildBridge({ rows, rowZ, gap, paneW, paneD, paneX, half, length, z0 }) {
	const group = new THREE.Group();

	const steel = mat(STEEL, { roughness: 0.45, metalness: 0.6 });
	for (const x of [-half, 0, half]) {
		const rail = mesh(new THREE.BoxGeometry(x === 0 ? 0.14 : 0.18, 0.22, length), steel);
		rail.position.set(x, -0.1, z0 - length / 2);
		group.add(rail);
		// a thin line of lights along each outer rail
		if (x !== 0) {
			const strip = mesh(new THREE.BoxGeometry(0.04, 0.04, length), flat(0x6fc8ff));
			strip.position.set(x + Math.sign(x) * 0.1, -0.06, z0 - length / 2);
			group.add(strip);
		}
	}

	const panes = [];
	for (let i = 0; i < rows; i++) {
		const z = rowZ(i);
		// a cross beam between rows
		const beam = mesh(new THREE.BoxGeometry(2 * half, 0.12, 0.12), steel);
		beam.position.set(0, -0.14, z + gap / 2);
		group.add(beam);

		const row = [];
		for (const side of [0, 1]) {
			const x = side ? paneX : -paneX;
			const pane = buildPane(paneW, paneD);
			pane.group.position.set(x, 0, z);
			group.add(pane.group);
			row.push(Object.assign(pane, { x, z, row: i, side }));
		}
		panes.push(row);
	}
	const lastBeam = mesh(new THREE.BoxGeometry(2 * half, 0.12, 0.12), steel);
	lastBeam.position.set(0, -0.14, rowZ(rows - 1) - gap / 2);
	group.add(lastBeam);

	// Pylons plunge from the rails into the dark.
	for (let i = 0; i < rows; i += 6) {
		for (const x of [-half, half]) {
			const pylon = mesh(new THREE.BoxGeometry(0.25, 70, 0.25), steel);
			pylon.position.set(x, -35.2, rowZ(i) + gap / 2);
			group.add(pylon);
		}
	}
	return { group, panes };
}

// A pane of glass with a bright edge, so it reads against the void.
function buildPane(w, d) {
	const group = new THREE.Group();
	const glassMat = new THREE.MeshStandardMaterial({
		color: 0x9fd8e8, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.38,
		emissive: 0x0d2a36, emissiveIntensity: 1, depthWrite: false,
	});
	const glass = mesh(new THREE.BoxGeometry(w, 0.05, d), glassMat);
	glass.renderOrder = 1;
	group.add(glass);
	const edgeMat = new THREE.LineBasicMaterial({ color: 0x8fe4ff, transparent: true, opacity: 0.7 });
	const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.05, d)), edgeMat);
	group.add(edge);
	// a faint diagonal sheen, like light on glass
	const sheen = mesh(new THREE.PlaneGeometry(w * 0.16, d * 1.05), flat(0xffffff, { transparent: true, opacity: 0.18, depthWrite: false }));
	sheen.rotation.set(-Math.PI / 2, 0, 0.5);
	sheen.position.set(-w * 0.15, 0.03, 0);
	group.add(sheen);
	return { group, glassMat, edgeMat, sheen };
}

// The pieces a pane breaks into: thin shards that tumble into the void.
export function buildShards(w, d) {
	const group = new THREE.Group();
	const shardMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7, emissive: 0x2a5a6a, side: THREE.DoubleSide });
	const shards = [];
	for (let i = 0; i < 16; i++) {
		const s = 0.18 + Math.random() * 0.3;
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute([
			0, 0, 0, s * (0.6 + Math.random() * 0.6), 0, s * (Math.random() - 0.5), s * (Math.random() - 0.3), 0, s * (0.6 + Math.random() * 0.5),
		], 3));
		g.computeVertexNormals();
		const m = mesh(g, shardMat);
		m.position.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * d);
		m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 2.5, -Math.random() * 2, (Math.random() - 0.5) * 2.5);
		m.userData.spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
		group.add(m);
		shards.push(m);
	}
	group.shards = shards;
	return group;
}

// A concrete landing with lit edges, `depth` long toward +z from z = 0.
export function buildPlatform(width, depth, lightColour) {
	const group = new THREE.Group();
	const slab = mesh(new THREE.BoxGeometry(width, 0.7, depth), mat(0x3a3d48, { roughness: 0.9 }));
	slab.position.set(0, -0.35, depth / 2);
	group.add(slab);
	// a painted stripe at the edge facing the bridge
	const stripe = mesh(new THREE.BoxGeometry(width, 0.02, 0.25), flat(lightColour));
	stripe.position.set(0, 0.01, 0.2);
	group.add(stripe);
	for (const x of [-width / 2, width / 2]) {
		const edge = mesh(new THREE.BoxGeometry(0.06, 0.06, depth), flat(lightColour));
		edge.position.set(x, -0.05, depth / 2);
		group.add(edge);
	}
	const front = mesh(new THREE.BoxGeometry(width, 0.06, 0.06), flat(lightColour));
	front.position.set(0, -0.05, 0);
	group.add(front);
	return group;
}

/* ---------- the hall ---------- */

// The vast room: dark walls `half` either side of the bridge, falling away
// into the void, with strips of light running down them. The left wall has
// the VIP gallery, a long lit window of masked spectators at bridge height.
export function buildHall({ half, zFrom, zTo, gallery }) {
	const group = new THREE.Group();
	const length = zFrom - zTo;
	const zMid = (zFrom + zTo) / 2;
	const wallMat = mat(0x161924, { roughness: 0.95 });
	const panelMat = mat(0x1d2130, { roughness: 0.9 });

	// The right wall, whole; the left wall in two parts round the gallery.
	const right = mesh(new THREE.PlaneGeometry(length, 110), wallMat);
	right.rotation.y = -Math.PI / 2;
	right.position.set(half, -25, zMid);
	group.add(right);

	const below = mesh(new THREE.PlaneGeometry(length, 80 + gallery.y0), wallMat);
	below.rotation.y = Math.PI / 2;
	below.position.set(-half, (gallery.y0 - 80) / 2, zMid);
	group.add(below);
	const above = mesh(new THREE.PlaneGeometry(length, 30 - gallery.y1), wallMat);
	above.rotation.y = Math.PI / 2;
	above.position.set(-half, (30 + gallery.y1) / 2, zMid);
	group.add(above);

	// Big recessed panels and strips of light down both walls, every few metres.
	const stripMat = flat(0x3a6d9a);
	const redMat = flat(0xa3263b);
	for (let z = zFrom; z > zTo; z -= 7) {
		for (const side of [-1, 1]) {
			const x = side * (half - 0.05);
			const strip = mesh(new THREE.BoxGeometry(0.1, 90, 0.25), stripMat);
			strip.position.set(x, -40, z);
			group.add(strip);
			// a short red beacon at bridge height
			const beacon = mesh(new THREE.BoxGeometry(0.12, 0.8, 0.5), redMat);
			beacon.position.set(x, side < 0 ? gallery.y0 - 2.5 : -1.5, z);
			group.add(beacon);
			if (side > 0) {
				const panel = mesh(new THREE.BoxGeometry(0.2, 12, 5.4), panelMat);
				panel.position.set(x, 8, z - 3.5);
				group.add(panel);
			}
		}
	}
	// a tier of walkway lights far below, fading into the fog
	for (const y of [-5, -12]) {
		for (const side of [-1, 1]) {
			const ledge = mesh(new THREE.BoxGeometry(0.4, 0.15, length), flat(y === -5 ? 0x2a4766 : 0x1c2d44));
			ledge.position.set(side * (half - 0.2), y, zMid);
			group.add(ledge);
		}
	}

	// Lamps hanging over the bridge.
	const lampMat = flat(0xfff1c8);
	const cableMat = flat(0x2a2d36);
	for (let z = zFrom - 4; z > zTo; z -= 9) {
		const lamp = mesh(new THREE.CylinderGeometry(0.9, 1.3, 0.35, 20, 1, true), mat(0x30333c, { side: THREE.DoubleSide }));
		lamp.position.set(0, 9, z);
		group.add(lamp);
		const bulb = mesh(new THREE.CircleGeometry(0.85, 20), lampMat);
		bulb.rotation.x = Math.PI / 2;
		bulb.position.set(0, 8.85, z);
		group.add(bulb);
		const cable = mesh(new THREE.BoxGeometry(0.04, 22, 0.04), cableMat);
		cable.position.set(0, 20, z);
		group.add(cable);
	}

	const vips = buildGallery(group, half, zFrom, zTo, gallery);
	return { group, vips };
}

// The gallery: a gilded room behind glass on the left wall, its masked
// spectators lounging along it, watching the bridge.
function buildGallery(group, half, zFrom, zTo, { y0, y1 }) {
	const length = zFrom - zTo;
	const zMid = (zFrom + zTo) / 2;
	const deep = 4;
	const h = y1 - y0;
	const x0 = -half;

	// a warm patterned back wall
	const damask = canvasTexture(256, 256, (ctx, w) => {
		ctx.fillStyle = '#4a1a1f';
		ctx.fillRect(0, 0, w, w);
		ctx.strokeStyle = 'rgba(230,180,90,0.35)';
		ctx.lineWidth = 6;
		for (const [cx, cy] of [[0, 0], [w, 0], [0, w], [w, w], [w / 2, w / 2]]) {
			ctx.beginPath();
			ctx.ellipse(cx, cy, w * 0.22, w * 0.32, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(cx, cy - w * 0.18);
			ctx.lineTo(cx + w * 0.1, cy);
			ctx.lineTo(cx, cy + w * 0.18);
			ctx.lineTo(cx - w * 0.1, cy);
			ctx.closePath();
			ctx.stroke();
		}
	});
	damask.wrapS = damask.wrapT = THREE.RepeatWrapping;
	damask.repeat.set(length / 3, h / 3);
	const back = mesh(new THREE.PlaneGeometry(length, h), mat(0xffffff, { map: damask, emissive: 0x5a2616, emissiveIntensity: 1 }));
	back.rotation.y = Math.PI / 2;
	back.position.set(x0 - deep, y0 + h / 2, zMid);
	group.add(back);

	const floor = mesh(new THREE.PlaneGeometry(deep, length), mat(0x2a1210));
	floor.rotation.x = -Math.PI / 2;
	floor.position.set(x0 - deep / 2, y0, zMid);
	group.add(floor);
	const ceiling = mesh(new THREE.PlaneGeometry(deep, length), mat(0x1a0c0c, { side: THREE.DoubleSide }));
	ceiling.rotation.x = Math.PI / 2;
	ceiling.position.set(x0 - deep / 2, y1, zMid);
	group.add(ceiling);
	// a gold light strip along the ceiling, and the gilt sill and lintel
	const gold = mat(GOLD, { metalness: 0.8, roughness: 0.35, emissive: 0x3a2808 });
	const glow = mesh(new THREE.BoxGeometry(0.3, 0.08, length), flat(0xffd88a));
	glow.position.set(x0 - deep + 0.6, y1 - 0.06, zMid);
	group.add(glow);
	for (const y of [y0, y1]) {
		const trim = mesh(new THREE.BoxGeometry(0.3, 0.3, length), gold);
		trim.position.set(x0, y, zMid);
		group.add(trim);
	}

	// The window: tinted glass in gilt frames.
	const glass = mesh(new THREE.PlaneGeometry(length, h), new THREE.MeshStandardMaterial({
		color: 0x6a7a90, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.6, depthWrite: false,
	}));
	glass.rotation.y = Math.PI / 2;
	glass.position.set(x0 + 0.02, y0 + h / 2, zMid);
	glass.renderOrder = 2;
	group.add(glass);
	for (let z = zFrom; z > zTo; z -= 4.5) {
		const mullion = mesh(new THREE.BoxGeometry(0.2, h, 0.2), gold);
		mullion.position.set(x0, y0 + h / 2, z);
		group.add(mullion);
	}

	// The spectators, on velvet couches, in fours.
	const vips = [];
	const couchMat = mat(0x7a1424, { roughness: 0.6 });
	const MASKS = ['owl', 'stag', 'fox', 'sun', 'moth'];
	const ROBES = [0x15161c, 0x2a1640, 0x3d0f18, 0x101a2a];
	let k = 0;
	for (let z = zFrom - 2.2; z > zTo + 2; z -= 4.5) {
		const couch = mesh(new THREE.BoxGeometry(1.1, 0.55, 3.4), couchMat);
		couch.position.set(x0 - deep + 1.2, y0 + 0.28, z);
		group.add(couch);
		const backrest = mesh(new THREE.BoxGeometry(0.3, 1.1, 3.4), couchMat);
		backrest.position.set(x0 - deep + 0.7, y0 + 0.8, z);
		group.add(backrest);
		for (const dz of [-0.85, 0.85]) {
			if ((k + (dz > 0 ? 1 : 0)) % 3 === 2) continue;   // gaps, so it isn't a row of clones
			const vip = buildVip(MASKS[(k * 2 + (dz > 0 ? 1 : 0)) % MASKS.length], ROBES[(k + (dz > 0 ? 1 : 0)) % ROBES.length]);
			vip.root.position.set(x0 - deep + 1.3, y0 + 0.55, z + dz);
			vip.root.rotation.y = -Math.PI / 2;   // facing +x, out over the bridge
			vip.root.scale.setScalar(1.35);
			group.add(vip.root);
			vips.push(vip);
		}
		k++;
	}
	return vips;
}

// A seated spectator in a robe and a gold mask, facing -z. Masks are
// original shapes: an owl, a stag, a fox, a sunburst and a moth.
function buildVip(kind, robe) {
	const root = new THREE.Group();
	const robeMat = mat(robe, { roughness: 0.55 });
	const gold = mat(GOLD, { metalness: 0.85, roughness: 0.3, emissive: 0x4a3010, emissiveIntensity: 0.8 });
	const dark = flat(0x0a0a0a);

	const body = mesh(new THREE.CapsuleGeometry(0.3, 0.45, 6, 12), robeMat);
	body.position.y = 0.55;
	body.rotation.x = -0.15;
	root.add(body);
	const lap = mesh(new THREE.BoxGeometry(0.55, 0.22, 0.6), robeMat);
	lap.position.set(0, 0.1, -0.25);
	root.add(lap);

	const head = new THREE.Group();
	head.position.y = 1.1;
	root.add(head);
	const skull = mesh(new THREE.SphereGeometry(0.2, 16, 12), robeMat);   // hooded
	head.add(skull);
	const face = mesh(new THREE.SphereGeometry(0.215, 18, 14, Math.PI * 1.1, Math.PI * 0.8, Math.PI * 0.15, Math.PI * 0.7), gold);
	head.add(face);
	const eye = (x, r = 0.045) => {
		const e = mesh(new THREE.CircleGeometry(r, 14), dark);
		e.position.set(x, 0.03, -0.212);
		e.rotation.y = Math.PI;
		head.add(e);
	};

	if (kind === 'owl') {
		for (const x of [-0.08, 0.08]) {
			const ring = mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 18), gold);
			ring.position.set(x, 0.03, -0.215);
			head.add(ring);
			eye(x, 0.05);
		}
		const beak = mesh(new THREE.ConeGeometry(0.035, 0.12, 4), gold);
		beak.rotation.x = Math.PI;
		beak.position.set(0, -0.06, -0.23);
		head.add(beak);
		for (const x of [-0.13, 0.13]) {
			const tuft = mesh(new THREE.ConeGeometry(0.05, 0.16, 4), gold);
			tuft.position.set(x, 0.22, -0.05);
			tuft.rotation.z = -x * 2;
			head.add(tuft);
		}
	} else if (kind === 'stag') {
		eye(-0.07);
		eye(0.07);
		for (const s of [-1, 1]) {
			const beam = mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.5, 6), gold);
			beam.position.set(s * 0.2, 0.32, 0);
			beam.rotation.z = -s * 0.5;
			head.add(beam);
			for (const t of [0.12, 0.26]) {
				const tine = mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.2, 6), gold);
				tine.position.set(s * (0.13 + t * 0.4), 0.2 + t * 0.9, 0);
				tine.rotation.z = s * 0.35;
				head.add(tine);
			}
		}
	} else if (kind === 'fox') {
		eye(-0.08, 0.035);
		eye(0.08, 0.035);
		const snout = mesh(new THREE.ConeGeometry(0.1, 0.3, 4), gold);
		snout.rotation.x = -Math.PI / 2;
		snout.position.set(0, -0.06, -0.3);
		head.add(snout);
		for (const s of [-1, 1]) {
			const ear = mesh(new THREE.ConeGeometry(0.07, 0.22, 4), gold);
			ear.position.set(s * 0.12, 0.25, -0.02);
			ear.rotation.z = -s * 0.25;
			head.add(ear);
		}
	} else if (kind === 'sun') {
		eye(-0.07);
		eye(0.07);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			const ray = mesh(new THREE.ConeGeometry(0.035, 0.16, 4), gold);
			ray.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, -0.08);
			ray.rotation.z = a - Math.PI / 2;
			head.add(ray);
		}
	} else {
		// moth: broad wings across the brow
		eye(-0.06, 0.04);
		eye(0.06, 0.04);
		for (const s of [-1, 1]) {
			const wing = mesh(new THREE.CircleGeometry(0.2, 3), gold);
			wing.scale.set(1.3, 0.8, 1);
			wing.position.set(s * 0.24, 0.1, -0.12);
			wing.rotation.set(0, Math.PI, s * 0.4);
			head.add(wing);
		}
	}

	// an arm resting forward, with a glass
	const arm = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), robeMat);
	arm.position.set(0.28, 0.5, -0.2);
	arm.rotation.x = Math.PI / 2.4;
	root.add(arm);
	const cup = mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.12, 10), mat(0xc8a040, { metalness: 0.7, roughness: 0.3 }));
	cup.position.set(0.28, 0.62, -0.42);
	root.add(cup);

	return { root, head, body, phase: Math.random() * 6 };
}

/* ---------- the countdown clock ---------- */

// A huge seven-segment clock, as hung on the hall's right wall. set(m, s,
// urgent) repaints it when the time changes.
export function buildClock() {
	const c = document.createElement('canvas');
	c.width = 1024;
	c.height = 400;
	const g = c.getContext('2d');
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;

	const group = new THREE.Group();
	const frame = mesh(new THREE.BoxGeometry(11.6, 4.8, 0.4), mat(0x0d0e12, { roughness: 0.5, metalness: 0.5 }));
	group.add(frame);
	const face = mesh(new THREE.PlaneGeometry(11, 4.3), flat(0xffffff, { map: tex }));
	face.position.z = 0.21;
	group.add(face);

	// Which of the seven segments (a..g) each digit lights.
	const DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
	function digit(x, y, w, h, d, on, off) {
		const t = w * 0.18;
		const segs = {
			a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t],
			f: [x, y + t, t, h / 2 - t], b: [x + w - t, y + t, t, h / 2 - t],
			e: [x, y + h / 2, t, h / 2 - t], c: [x + w - t, y + h / 2, t, h / 2 - t],
		};
		for (const k in segs) {
			const lit = d !== null && DIGITS[d].includes(k);
			g.fillStyle = lit ? on : off;
			const [sx, sy, sw, sh] = segs[k];
			g.beginPath();
			g.roundRect(sx + 3, sy + 3, sw - 6, sh - 6, t / 3);
			g.fill();
		}
	}

	let shown = '';
	function set(m, s, urgent, idle) {
		const key = `${m}:${s}:${urgent}:${idle}`;
		if (key === shown) return;
		shown = key;
		g.fillStyle = '#07070a';
		g.fillRect(0, 0, c.width, c.height);
		const on = idle ? '#5a1a20' : urgent ? '#ff2a3a' : '#ff4a3a';
		const off = 'rgba(255,60,60,0.07)';
		if (!idle) {
			g.shadowColor = on;
			g.shadowBlur = urgent ? 40 : 24;
		}
		const ds = idle ? [null, null, null, null] : [Math.floor(m / 10), m % 10, Math.floor(s / 10), s % 10];
		const W = 180;
		const xs = [80, 290, 554, 764];
		ds.forEach((d, i) => digit(xs[i], 60, W, 280, d, on, off));
		g.fillStyle = on;
		for (const y of [150, 250]) {
			g.beginPath();
			g.arc(512, y, 18, 0, Math.PI * 2);
			g.fill();
		}
		g.shadowBlur = 0;
		tex.needsUpdate = true;
	}
	set(0, 0, false, true);
	return { group, set };
}
