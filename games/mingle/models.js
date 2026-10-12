/*
 * Mingle: the 3D models. The hall, the carousel and the ring of doors are
 * built from three.js primitives and canvas textures; the contestants and
 * their splats come from Red Light Green Light. Units are metres, y is up.
 */
import * as THREE from '../../lib/three/three.module.min.js';
export { buildContestant, buildSplat, buildGuard, NUMBERS } from '../../shared/squid-game/models.js';

// The hall's pastels.
export const PASTELS = ['#f4a7c3', '#9fe0c9', '#f7d774', '#b9a5ee', '#9fd0f5', '#f8b98f'];

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, opts));
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

/* ---------- the hall's floor ---------- */

// Pale boards with a pastel sunburst round the middle, where the carousel sits.
export function buildFloor(size) {
	const tex = canvasTexture(1024, 1024, (ctx, w) => {
		ctx.fillStyle = '#f1e6f5';
		ctx.fillRect(0, 0, w, w);
		const rays = 24;
		for (let i = 0; i < rays; i++) {
			ctx.beginPath();
			ctx.moveTo(w / 2, w / 2);
			ctx.arc(w / 2, w / 2, w * 0.75, (i / rays) * Math.PI * 2, ((i + 1) / rays) * Math.PI * 2);
			ctx.closePath();
			ctx.fillStyle = i % 2 ? '#f6dcea' : '#ece2f8';
			ctx.fill();
		}
		// tiles
		ctx.strokeStyle = 'rgba(140, 100, 160, 0.12)';
		ctx.lineWidth = 3;
		for (let i = 0; i <= 16; i++) {
			ctx.beginPath(); ctx.moveTo(i * w / 16, 0); ctx.lineTo(i * w / 16, w); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(0, i * w / 16); ctx.lineTo(w, i * w / 16); ctx.stroke();
		}
	});
	const floor = mesh(new THREE.PlaneGeometry(size, size), mat(0xffffff, { map: tex, roughness: 0.95 }), false);
	floor.rotation.x = -Math.PI / 2;
	floor.receiveShadow = true;
	return floor;
}

/* ---------- the carousel ---------- */

// A low round platform in pastel wedges with a rim of bulbs and a striped
// post in the middle. `spin` is the part that turns.
export function buildCarousel(radius) {
	const group = new THREE.Group();
	const spin = new THREE.Group();
	group.add(spin);

	const top = canvasTexture(1024, 1024, (ctx, w) => {
		const wedges = 16;
		for (let i = 0; i < wedges; i++) {
			ctx.beginPath();
			ctx.moveTo(w / 2, w / 2);
			ctx.arc(w / 2, w / 2, w / 2, (i / wedges) * Math.PI * 2, ((i + 1) / wedges) * Math.PI * 2);
			ctx.closePath();
			ctx.fillStyle = PASTELS[i % 4];
			ctx.fill();
		}
		ctx.strokeStyle = 'white';
		ctx.lineWidth = 22;
		ctx.beginPath();
		ctx.arc(w / 2, w / 2, w * 0.47, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(w / 2, w / 2, w * 0.14, 0, Math.PI * 2);
		ctx.fillStyle = 'white';
		ctx.fill();
	});
	const H = 0.16;
	const platform = mesh(new THREE.CylinderGeometry(radius, radius, H, 64), [
		mat(0xe5287a, { roughness: 0.5 }),       // the side
		mat(0xffffff, { map: top, roughness: 0.7 }),
		mat(0xffffff),
	]);
	platform.position.y = H / 2;
	spin.add(platform);

	// bulbs round the rim
	const bulbs = [];
	const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
	for (let i = 0; i < 36; i++) {
		const a = (i / 36) * Math.PI * 2;
		const b = mesh(bulbGeo, flat(0xfff2b0), false);
		b.position.set(Math.cos(a) * (radius + 0.005), H * 0.55, Math.sin(a) * (radius + 0.005));
		spin.add(b);
		bulbs.push(b);
	}

	// the post
	const stripes = canvasTexture(64, 256, (ctx, w, h) => {
		for (let i = 0; i < 8; i++) {
			ctx.fillStyle = i % 2 ? '#ffffff' : '#e5287a';
			ctx.fillRect(0, (i * h) / 8, w, h / 8);
		}
	});
	stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
	const post = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 16), mat(0xffffff, { map: stripes }));
	post.position.y = H + 0.45;
	spin.add(post);
	const knob = mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0xf7d774, { roughness: 0.3, metalness: 0.3 }));
	knob.position.y = H + 0.95;
	spin.add(knob);

	return {
		group,
		spin,
		// Chase the bulbs round while `lit`; `upTo` 0..1 of them switched on
		// at all (they come on one by one round the rim, steady).
		lights(time, lit, upTo = 1) {
			bulbs.forEach(function (b, i) {
				const on = i < upTo * bulbs.length && (lit > 0 ? (Math.floor(time * 8) + i) % 3 !== 0 : upTo < 1);
				b.material.color.setHex(on ? 0xfff2b0 : 0x8a7a68);
			});
		},
	};
}

/* ---------- a stretch of wall with its door ---------- */

// The doors' pastel leaves carry their room numbers; the stretch of wall
// around each door is striped in the next pastel along.
function doorTexture(number, colour) {
	const tex = canvasTexture(256, 384, () => {});
	const paint = () => {
		const ctx = tex.image.getContext('2d');
		ctx.fillStyle = colour;
		ctx.fillRect(0, 0, 256, 384);
		ctx.strokeStyle = 'rgba(0,0,0,0.12)';
		ctx.lineWidth = 8;
		ctx.strokeRect(26, 30, 204, 140);
		ctx.strokeRect(26, 200, 204, 150);
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(128, 100, 58, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#2a1f3d';
		ctx.font = '76px "Paytone One", "Rubik", sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(number).padStart(2, '0'), 128, 106);
		tex.needsUpdate = true;
	};
	paint();
	if (document.fonts) document.fonts.load('76px "Paytone One"').then(paint).catch(() => {});
	return tex;
}

function wallTexture(colour) {
	return canvasTexture(256, 256, (ctx, w, h) => {
		ctx.fillStyle = colour;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = 'rgba(255,255,255,0.28)';
		for (let i = 0; i < 4; i++) ctx.fillRect(i * w / 4, 0, w / 8, h);
		ctx.fillStyle = 'rgba(80, 30, 90, 0.18)';
		ctx.fillRect(0, h * 0.9, w, h * 0.1);   // skirting
	});
}

// One of the ring of rooms: a stretch of wall `width` wide with a door in
// the middle. Local x runs along the wall, +z points into the hall, the
// wall's face is at z = 0 and the room behind the door is at -z.
// A mat on the floor in front of the door marks where you have to stand to
// be at it: `zone` deep, `pad` wider than the doorway either side.
export function buildModule(number, { width, height, doorWidth, doorHeight, zone, pad }) {
	const group = new THREE.Group();
	const colour = PASTELS[number % PASTELS.length];
	const wallColour = PASTELS[(number + 3) % PASTELS.length];

	// the wall, with a hole for the door
	const shape = new THREE.Shape();
	shape.moveTo(-width / 2, 0);
	shape.lineTo(width / 2, 0);
	shape.lineTo(width / 2, height);
	shape.lineTo(-width / 2, height);
	shape.closePath();
	const hole = new THREE.Path();
	hole.moveTo(-doorWidth / 2, 0);
	hole.lineTo(-doorWidth / 2, doorHeight);
	hole.lineTo(doorWidth / 2, doorHeight);
	hole.lineTo(doorWidth / 2, 0);
	hole.closePath();
	shape.holes.push(hole);
	const geo = new THREE.ShapeGeometry(shape);
	// map the texture across the wall in metres
	const uv = geo.attributes.uv;
	const pos = geo.attributes.position;
	for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 1.2, pos.getY(i) / height);
	const wallTex = wallTexture(wallColour);
	wallTex.wrapS = THREE.RepeatWrapping;
	const wall = mesh(geo, mat(0xffffff, { map: wallTex }), false);
	wall.receiveShadow = true;
	group.add(wall);

	// a white frame standing proud of the wall
	const frameMat = mat(0xffffff, { roughness: 0.5 });
	const T = 0.12;
	for (const [w, h, x, y] of [
		[T, doorHeight + T, -doorWidth / 2 - T / 2, (doorHeight + T) / 2],
		[T, doorHeight + T, doorWidth / 2 + T / 2, (doorHeight + T) / 2],
		[doorWidth + 2 * T, T, 0, doorHeight + T / 2],
	]) {
		const f = mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat, false);
		f.position.set(x, y, 0.05);
		group.add(f);
	}

	// the lamp over the door: green while it's open, red once it's shut
	const lamp = mesh(new THREE.SphereGeometry(0.1, 12, 8), flat(0x3ddc84), false);
	lamp.position.set(0, doorHeight + T + 0.14, 0.08);
	group.add(lamp);

	// the little room behind
	const DEEP = 1.1;
	const room = mesh(new THREE.BoxGeometry(doorWidth + 0.3, doorHeight + 0.2, DEEP), mat(0x3a2450, { side: THREE.BackSide, roughness: 1 }), false);
	room.position.set(0, (doorHeight + 0.2) / 2, -DEEP / 2 - 0.01);
	group.add(room);

	// two leaves that slide apart behind the wall
	const tex = doorTexture(number, colour);
	const leaves = [-1, 1].map(function (side) {
		const leafTex = tex.clone();
		leafTex.needsUpdate = true;
		leafTex.repeat.set(0.5, 1);
		leafTex.offset.set(side < 0 ? 0 : 0.5, 0);
		const leaf = mesh(new THREE.PlaneGeometry(doorWidth / 2, doorHeight), mat(0xffffff, { map: leafTex, roughness: 0.6 }), false);
		leaf.position.set(side * doorWidth / 4, doorHeight / 2, -0.04);
		group.add(leaf);
		return leaf;
	});

	// a big red cross for a door that won't open this round
	const cross = new THREE.Group();
	for (const a of [0.8, -0.8]) {
		const bar = mesh(new THREE.BoxGeometry(doorWidth * 1.1, 0.16, 0.04), flat(0xe0283c), false);
		bar.rotation.z = a;
		cross.add(bar);
	}
	cross.position.set(0, doorHeight / 2, 0.02);
	cross.visible = false;
	group.add(cross);

	const floorMat = mesh(new THREE.PlaneGeometry(doorWidth + 2 * pad, zone), flat(0xffffff, { transparent: true, opacity: 0.4, depthWrite: false }), false);
	floorMat.rotation.x = -Math.PI / 2;
	floorMat.position.set(0, 0.012, zone / 2);
	floorMat.visible = false;
	group.add(floorMat);

	return {
		group,
		number,
		colour,
		// the mat's colour, or null to hide it
		setMat(hex) {
			floorMat.visible = hex !== null;
			if (hex !== null) floorMat.material.color.setHex(hex);
		},
		// 0 shut, 1 wide open
		setOpen(k) {
			leaves[0].position.x = -doorWidth / 4 - k * doorWidth / 2;
			leaves[1].position.x = doorWidth / 4 + k * doorWidth / 2;
		},
		setLamp(hex) {
			lamp.material.color.setHex(hex);
		},
		setBarred(on) {
			cross.visible = on;
		},
	};
}
