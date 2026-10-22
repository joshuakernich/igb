/*
 * Knuckles Quest: the maze. A grid of ruined stone rooms on a floating
 * island, joined by doorways (some at floor level, some raised up a wall,
 * to be climbed or glided to), every room with blocks and plinths to climb.
 * Everything solid is an axis-aligned box, so taps and the climber can
 * meet it exactly: { min, max, kind } ('floor', 'wall', 'block').
 *
 *   const maze = buildMaze(scene, { rand, aniso });
 *   maze.boxes                  every solid box
 *   maze.rooms[i][j]            { i, j, cx, cz, open: { n, s, e, w }, dist }
 *   maze.roomAt(x, z)           the room a point is in (or null)
 *   maze.start                  where the quest starts (feet)
 *   maze.fragments              [{ pos, room }]: where the three pieces sit
 *   maze.rings                  [Vector3]: ring spots
 *   maze.braziers               [Vector3]: where the fires burn
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { canvasTexture } from '../../lib/three/walls.js';

export const GRID = 4;           // rooms a side
export const CELL = 24;          // metres from one room's middle to the next
export const WALL = { t: 1.4, h: 8, ceil: 11 };   // thickness, height, and where the ceiling over the whole maze starts (headroom over the wall tops)
export const DOOR = { w: 5, h: 5.2, high: 3.4 };   // width, height, and how far up a raised doorway starts

const TAU = Math.PI * 2;

/* ---------- textures ---------- */

function stoneTexture(aniso) {
	const t = canvasTexture(512, 512, function (g, w, h) {
		g.fillStyle = '#b8a07a';
		g.fillRect(0, 0, w, h);
		// courses of big blocks, each its own shade
		const rows = 4;
		for (let r = 0; r < rows; r++) {
			const y0 = r * h / rows;
			const off = (r % 2) * 64;
			for (let x = -off; x < w; x += 128) {
				const v = 150 + Math.random() * 50;
				g.fillStyle = `rgb(${v + 30},${v + 12},${v - 18})`;
				g.fillRect(x + 4, y0 + 4, 120, h / rows - 8);
				// weathering
				for (let i = 0; i < 30; i++) {
					g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,50,30' : '255,240,210'},${Math.random() * 0.12})`;
					g.fillRect(x + 4 + Math.random() * 110, y0 + 4 + Math.random() * (h / rows - 18), 4 + Math.random() * 14, 2 + Math.random() * 8);
				}
			}
		}
		// a carved band of zigzags near the top
		g.strokeStyle = 'rgba(70,50,30,0.45)';
		g.lineWidth = 6;
		g.beginPath();
		for (let x = 0; x <= w; x += 32) g.lineTo(x, 40 + (x / 32 % 2 ? 18 : 0));
		g.stroke();
		// moss creeping up from the bottom
		for (let i = 0; i < 160; i++) {
			const x = Math.random() * w, y = h - Math.random() * Math.random() * 140;
			g.fillStyle = `rgba(${60 + Math.random() * 40},${120 + Math.random() * 60},50,${0.25 + Math.random() * 0.35})`;
			g.beginPath();
			g.arc(x, y, 3 + Math.random() * 10, 0, TAU);
			g.fill();
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

function floorTexture(aniso) {
	const t = canvasTexture(512, 512, function (g, w, h) {
		g.fillStyle = '#5fa040';
		g.fillRect(0, 0, w, h);
		for (let i = 0; i < 5000; i++) {
			const v = Math.random();
			g.fillStyle = `rgba(${v < 0.5 ? '40,110,30' : '140,200,80'},${0.2 + Math.random() * 0.3})`;
			g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 3 + Math.random() * 5);
		}
		// old flagstones showing through
		for (let i = 0; i < 9; i++) {
			const x = Math.random() * w, y = Math.random() * h, s = 50 + Math.random() * 70;
			g.fillStyle = `rgba(190,170,130,${0.35 + Math.random() * 0.3})`;
			g.fillRect(x, y, s, s * (0.6 + Math.random() * 0.5));
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

// A box whose UVs run in metres (so textures tile at one size everywhere).
function boxGeometry(w, h, d, scale = 4) {
	const g = new THREE.BoxGeometry(w, h, d);
	const uv = g.attributes.uv, nor = g.attributes.normal;
	for (let i = 0; i < uv.count; i++) {
		const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
		const [a, b] = nx > 0.5 ? [d, h] : ny > 0.5 ? [w, d] : [w, h];
		uv.setXY(i, uv.getX(i) * a / scale, uv.getY(i) * b / scale);
	}
	return g;
}

/* ---------- the maze ---------- */

export function buildMaze(scene, { rand = Math.random, aniso = 8 } = {}) {
	const group = new THREE.Group();
	scene.add(group);
	const boxes = [];
	const disposables = [];
	const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(aniso), roughness: 0.85, metalness: 0 });
	const darkStone = new THREE.MeshStandardMaterial({ map: stone.map, color: 0xb59a86, roughness: 0.8 });
	const grass = new THREE.MeshStandardMaterial({ map: floorTexture(aniso), roughness: 0.95 });
	const gold = new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.9, roughness: 0.3 });
	disposables.push(stone, darkStone, grass, gold, stone.map, grass.map);

	function box(x0, y0, z0, x1, y1, z1, kind, mat) {
		const min = new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1));
		const max = new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1));
		const b = { min, max, kind };
		boxes.push(b);
		if (mat) {
			const geo = boxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
			const m = new THREE.Mesh(geo, mat);
			m.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
			m.castShadow = m.receiveShadow = true;
			group.add(m);
			disposables.push(geo);
			b.mesh = m;
		}
		return b;
	}

	const half = (GRID - 1) / 2;
	const cx = (i) => (i - half) * CELL;
	const cz = (j) => (j - half) * CELL;

	// rooms, and a maze through them (a random depth-first walk, plus a couple of loops)
	const rooms = [];
	for (let i = 0; i < GRID; i++) {
		rooms.push([]);
		for (let j = 0; j < GRID; j++) rooms[i].push({ i, j, cx: cx(i), cz: cz(j), open: {}, raised: {}, dist: -1, seen: false });
	}
	const link = (a, b, raised) => {
		const dir = b.i > a.i ? ['e', 'w'] : b.i < a.i ? ['w', 'e'] : b.j > a.j ? ['s', 'n'] : ['n', 's'];
		a.open[dir[0]] = b.open[dir[1]] = true;
		a.raised[dir[0]] = b.raised[dir[1]] = !!raised;
	};
	const nbrs = (r) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => rooms[r.i + di] && rooms[r.i + di][r.j + dj]).filter(Boolean);
	const visited = new Set([rooms[0][0]]);
	const stack = [rooms[0][0]];
	while (stack.length) {
		const r = stack[stack.length - 1];
		const options = nbrs(r).filter((n) => !visited.has(n));
		if (!options.length) { stack.pop(); continue; }
		const n = options[Math.floor(rand() * options.length)];
		link(r, n, rand() < 0.3);
		visited.add(n);
		stack.push(n);
	}
	for (let k = 0; k < 2; k++) {
		const r = rooms[Math.floor(rand() * GRID)][Math.floor(rand() * GRID)];
		const n = nbrs(r)[Math.floor(rand() * nbrs(r).length)];
		if (n) link(r, n, true);
	}
	// how many doorways from the start, each room
	const queue = [rooms[0][0]];
	rooms[0][0].dist = 0;
	const dirStep = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] };
	while (queue.length) {
		const r = queue.shift();
		for (const d of Object.keys(r.open)) {
			const n = rooms[r.i + dirStep[d][0]][r.j + dirStep[d][1]];
			if (n.dist < 0) { n.dist = r.dist + 1; queue.push(n); }
		}
	}

	// the floor: one slab under everything, and a grassy island edge below
	const ext = GRID * CELL / 2 + 6;
	box(-ext, -2, -ext, ext, 0, ext, 'floor', grass);
	const cliffGeo = new THREE.CylinderGeometry(ext * 1.5, ext * 0.6, 60, 14, 4);
	const pos = cliffGeo.attributes.position;
	for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 29) pos.setX(i, pos.getX(i) * (0.9 + Math.random() * 0.2));
	cliffGeo.computeVertexNormals();
	const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1, flatShading: true }));
	cliff.position.y = -32.1;
	group.add(cliff);
	disposables.push(cliffGeo, cliff.material);

	// walls: along every line between rooms (and round the outside), with doorways
	const T = WALL.t, H = WALL.h;
	// a wall from a to b along x (alongX) or z, at the given line, with an optional doorway in the middle
	function wallRun(alongX, line, a, b, door, raised) {
		const seg = (s0, s1, y0, y1) => {
			if (s1 - s0 < 0.05 || y1 - y0 < 0.05) return;
			if (alongX) box(s0, y0, line - T / 2, s1, y1, line + T / 2, 'wall', stone);
			else box(line - T / 2, y0, s0, line + T / 2, y1, s1, 'wall', stone);
		};
		if (!door) { seg(a, b, 0, H); return; }
		const mid = (a + b) / 2, d0 = mid - DOOR.w / 2, d1 = mid + DOOR.w / 2;
		const bottom = raised ? DOOR.high : 0;
		seg(a, d0, 0, H);
		seg(d1, b, 0, H);
		seg(d0, d1, bottom + DOOR.h, H);   // the lintel
		if (raised) seg(d0, d1, 0, bottom);   // the sill below a raised doorway
	}
	const lo = cx(0) - CELL / 2, hi = cx(GRID - 1) + CELL / 2;
	for (let i = 0; i <= GRID; i++) {
		// the lines between columns of rooms (along z)
		const x = lo + i * CELL;
		for (let j = 0; j < GRID; j++) {
			const left = rooms[i - 1] && rooms[i - 1][j], right = rooms[i] && rooms[i][j];
			const door = left && right && left.open.e;
			wallRun(false, x, cz(j) - CELL / 2 - (j === 0 ? T / 2 : 0), cz(j) + CELL / 2 + (j === GRID - 1 ? T / 2 : 0), door, door && left.raised.e);
		}
		// the lines between rows of rooms (along x)
		const z = lo + i * CELL;
		for (let k = 0; k < GRID; k++) {
			const up = rooms[k][i - 1], down = rooms[k][i];
			const door = up && down && up.open.s;
			wallRun(true, z, cx(k) - CELL / 2 + T / 2, cx(k) + CELL / 2 - T / 2, door, door && up.raised.s);
		}
	}
	// the ceiling: we're indoors. One stone slab over the whole maze (high enough to
	// run along the wall tops under it), the outer walls carried up to meet it, and
	// beams along every wall line beneath it
	const C = WALL.ceil;
	const ceiling = box(-ext, C, -ext, ext, C + 1, ext, 'ceiling', darkStone);
	ceiling.mesh.castShadow = false;   // (the sun still finds its way in)
	for (const [x0, z0, x1, z1] of [[lo - T / 2, lo - T / 2, hi + T / 2, lo + T / 2], [lo - T / 2, hi - T / 2, hi + T / 2, hi + T / 2], [lo - T / 2, lo, lo + T / 2, hi], [hi - T / 2, lo, hi + T / 2, hi]]) {
		box(x0, H, z0, x1, C, z1, 'wall', stone);
	}
	for (let i = 1; i < GRID; i++) {
		const at = lo + i * CELL;
		for (const b of [box(at - 0.4, C - 0.7, lo, at + 0.4, C, hi, 'ceiling', darkStone), box(lo, C - 0.7, at - 0.4, hi, C, at + 0.4, 'ceiling', darkStone)]) b.mesh.castShadow = false;
	}

	// a little stone step under each raised doorway's sill, both sides, so it can be climbed or hopped
	// (it's climbable anyway: this just reads as an invitation)

	// what's in each room: blocks to climb, rings, braziers
	const rings = [];
	const braziers = [];
	const inner = CELL / 2 - T / 2 - 1;
	const clear = (r, x, z, s) => {
		// keep doorways and the room's middle free
		for (const d of Object.keys(r.open)) {
			const [dx, dz] = dirStep[d];
			const doorX = r.cx + dx * (CELL / 2), doorZ = r.cz + dz * (CELL / 2);
			if (Math.abs(x - doorX) < DOOR.w / 2 + s + 2.5 && Math.abs(z - doorZ) < DOOR.w / 2 + s + 2.5) return false;
		}
		return Math.hypot(x - r.cx, z - r.cz) > 3.5 + s;
	};
	for (const col of rooms) for (const r of col) {
		const n = 2 + Math.floor(rand() * 3);
		const placed = [];
		for (let k = 0; k < n * 4 && placed.length < n; k++) {
			const s = 1.5 + rand() * 2.2;
			const x = r.cx + (rand() * 2 - 1) * (inner - s), z = r.cz + (rand() * 2 - 1) * (inner - s);
			if (!clear(r, x, z, s) || placed.some((p) => Math.abs(p.x - x) < p.s + s + 1.5 && Math.abs(p.z - z) < p.s + s + 1.5)) continue;
			const h = 1.2 + rand() * 3.8;
			const b = box(x - s, 0, z - s, x + s, h, z + s, 'block', darkStone);
			placed.push({ x, z, s, h });
			// a ring or three on top
			for (let q = 0; q < 3; q++) rings.push(new THREE.Vector3(x + (q - 1) * 1.1, h + 1.0, z));
			// stack a smaller one on the taller blocks
			if (h > 3.5 && rand() < 0.5) {
				const s2 = s * 0.55;
				box(x - s2, h, z - s2, x + s2, h + 1.6 + rand() * 1.5, z + s2, 'block', darkStone);
			}
		}
		// a line of rings across the room's middle
		const ang = rand() < 0.5 ? 0 : Math.PI / 2;
		for (let q = -2; q <= 2; q++) rings.push(new THREE.Vector3(r.cx + Math.cos(ang) * q * 1.6, 1.0, r.cz + Math.sin(ang) * q * 1.6));
		// braziers on two of the walls (wherever there's no doorway)
		for (const d of ['n', 's', 'e', 'w']) {
			if (r.open[d] || rand() < 0.4) continue;
			const [dx, dz] = dirStep[d];
			braziers.push(new THREE.Vector3(r.cx + dx * (CELL / 2 - T / 2 - 0.5), 4.2, r.cz + dz * (CELL / 2 - T / 2 - 0.5)));
		}
		r.blocks = placed;
	}

	// the three fragments: in the three rooms furthest from the start (a
	// dead end each, if there are enough), each on a tall plinth
	const flat = rooms.flat();
	const deadEnd = (r) => Object.keys(r.open).length === 1;
	const order = flat.filter((r) => r.dist > 0).sort((a, b) => (deadEnd(b) - deadEnd(a)) * 3 + (b.dist - a.dist));
	const chosen = [];
	for (const r of order) {
		if (chosen.length === 3) break;
		if (chosen.some((c) => Math.abs(c.i - r.i) + Math.abs(c.j - r.j) < 2)) continue;
		chosen.push(r);
	}
	for (const r of order) if (chosen.length < 3 && !chosen.includes(r)) chosen.push(r);
	const fragments = chosen.map(function (r, k) {
		const h = 4.2 + k * 0.9;   // (each one a little higher)
		// a stepped plinth in the room's middle, gold-trimmed
		box(r.cx - 2.2, 0, r.cz - 2.2, r.cx + 2.2, h * 0.45, r.cz + 2.2, 'block', darkStone);
		box(r.cx - 1.3, h * 0.45, r.cz - 1.3, r.cx + 1.3, h, r.cz + 1.3, 'block', darkStone);
		const trim = new THREE.Mesh(boxGeometry(2.9, 0.25, 2.9), gold);
		trim.position.set(r.cx, h + 0.05, r.cz);
		trim.castShadow = true;
		group.add(trim);
		disposables.push(trim.geometry);
		return { pos: new THREE.Vector3(r.cx, h + 1.1, r.cz), room: r };
	});

	// (no rings buried in a block)
	const inside = (p, pad = 0.5) => boxes.some((b) => b.kind !== 'floor' && p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad);
	for (let k = rings.length - 1; k >= 0; k--) if (inside(rings[k])) rings.splice(k, 1);

	// the start: the first room's middle (kept clear of blocks)
	const start = new THREE.Vector3(rooms[0][0].cx, 0, rooms[0][0].cz);

	function roomAt(x, z) {
		const i = Math.round(x / CELL + half), j = Math.round(z / CELL + half);
		return rooms[i] && rooms[i][j] || null;
	}

	return {
		group, boxes, rooms, roomAt, start, fragments, rings, braziers,
		bounds: { lo, hi },
		dispose() {
			scene.remove(group);
			for (const d of disposables) d.dispose();
		},
	};
}

/* ---------- rays and boxes ---------- */

// Where a ray (origin o, unit direction d) first meets any box, and which
// face: { t, point, normal, box } or null.
export function raycastBoxes(boxes, o, d, maxT = 500) {
	let best = null;
	for (const b of boxes) {
		let t0 = 0, t1 = maxT, axis = -1, sign = 0;
		let ok = true;
		for (let a = 0; a < 3; a++) {
			const k = a === 0 ? 'x' : a === 1 ? 'y' : 'z';
			const od = d[k], oo = o[k];
			if (Math.abs(od) < 1e-9) {
				if (oo < b.min[k] || oo > b.max[k]) { ok = false; break; }
				continue;
			}
			let ta = (b.min[k] - oo) / od, tb = (b.max[k] - oo) / od;
			let s = -1;
			if (ta > tb) { const x = ta; ta = tb; tb = x; s = 1; }
			if (ta > t0) { t0 = ta; axis = a; sign = s; }
			if (tb < t1) t1 = tb;
			if (t0 > t1) { ok = false; break; }
		}
		if (!ok || axis < 0) continue;
		if (!best || t0 < best.t) {
			const normal = new THREE.Vector3();
			normal.setComponent(axis, sign);
			best = { t: t0, normal, box: b };
		}
	}
	if (best) best.point = o.clone().addScaledVector(d, best.t);
	return best;
}
