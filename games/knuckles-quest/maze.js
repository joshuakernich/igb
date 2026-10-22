/*
 * Knuckles Quest: the maze. A lost temple: a grid of overgrown stone halls
 * under one carved ceiling (glyphs glowing on the walls, pillars, vines,
 * light slanting in), joined by doorways (some at floor level, some raised
 * up a wall, to be climbed or glided to), every room with blocks and
 * plinths to climb.
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
export const WALL = { t: 1.4, h: 8, ceil: 8 };   // thickness, height, and where the ceiling starts (right on the wall tops: no way over them)
export const DOOR = { w: 5, h: 5.2, high: 3.4 };   // width, height, and how far up a raised doorway starts

const TAU = Math.PI * 2;

/* ---------- textures ---------- */

// Old temple stone: big grey-green blocks, worn and moss-streaked, with a carved
// band of glyphs near the top of every course (their glow is in runeTexture).
function stoneTexture(aniso) {
	const t = canvasTexture(512, 512, function (g, w, h) {
		g.fillStyle = '#5f6a5c';
		g.fillRect(0, 0, w, h);
		const rows = 4;
		for (let r = 0; r < rows; r++) {
			const y0 = r * h / rows;
			const off = (r % 2) * 64;
			for (let x = -off; x < w; x += 128) {
				const v = 95 + Math.random() * 40;
				g.fillStyle = `rgb(${v},${v + 10},${v - 4})`;
				g.fillRect(x + 3, y0 + 3, 122, h / rows - 6);
				// weathering, chips and cracks
				for (let i = 0; i < 40; i++) {
					g.fillStyle = `rgba(${Math.random() < 0.6 ? '20,26,20' : '200,210,190'},${Math.random() * 0.14})`;
					g.fillRect(x + 4 + Math.random() * 112, y0 + 4 + Math.random() * (h / rows - 16), 3 + Math.random() * 16, 2 + Math.random() * 7);
				}
				g.strokeStyle = 'rgba(20,24,18,0.35)';
				g.lineWidth = 1.5;
				g.beginPath();
				let cx = x + 10 + Math.random() * 100, cy = y0 + 6;
				g.moveTo(cx, cy);
				for (let k = 0; k < 5; k++) { cx += (Math.random() - 0.5) * 20; cy += 6 + Math.random() * 10; g.lineTo(cx, cy); }
				g.stroke();
			}
		}
		// the carved glyph band
		g.fillStyle = 'rgba(25,30,24,0.55)';
		g.fillRect(0, 14, w, 104);
		g.strokeStyle = 'rgba(15,18,14,0.8)';
		g.lineWidth = 7;
		glyphs(g, w, 66, GLYPH);
		// moss and creepers down from the top and up from the bottom
		for (let i = 0; i < 260; i++) {
			const top = Math.random() < 0.45;
			const x = Math.random() * w, y = top ? Math.random() * Math.random() * 180 : h - Math.random() * Math.random() * 160;
			g.fillStyle = `rgba(${50 + Math.random() * 40},${110 + Math.random() * 70},${40 + Math.random() * 20},${0.25 + Math.random() * 0.4})`;
			g.beginPath();
			g.arc(x, y, 2 + Math.random() * 9, 0, TAU);
			g.fill();
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}
// (a row of made-up glyphs along y, each about 20 * size across: circles, eyes,
// zigzags, crosses, diamonds; spaced to tile across the width)
const GLYPH = 3.6;   // how big the glyphs are
function glyphs(g, w, at, size) {
	const n = Math.max(1, Math.round(w / (28 * size))), gap = w / n;
	for (let k = 0; k < n; k++) {
		g.save();
		g.translate(gap * (k + 0.5), at);
		g.scale(size, size);
		g.lineWidth /= size;
		const x = 0, y = 0;   // (drawn about its own middle)
		g.beginPath();
		switch (k % 5) {
			case 0: g.arc(x, y, 9, 0, TAU); g.moveTo(x, y - 4); g.lineTo(x, y + 4); break;
			case 1: g.moveTo(x - 10, y); g.quadraticCurveTo(x, y - 12, x + 10, y); g.quadraticCurveTo(x, y + 12, x - 10, y); g.moveTo(x + 2, y); g.arc(x, y, 2, 0, TAU); break;
			case 2: g.moveTo(x - 10, y + 8); g.lineTo(x - 4, y - 8); g.lineTo(x + 2, y + 8); g.lineTo(x + 8, y - 8); break;
			case 3: g.moveTo(x - 9, y - 9); g.lineTo(x + 9, y + 9); g.moveTo(x + 9, y - 9); g.lineTo(x - 9, y + 9); g.moveTo(x - 9, y); g.lineTo(x + 9, y); break;
			default: g.moveTo(x, y - 10); g.lineTo(x + 9, y); g.lineTo(x, y + 10); g.lineTo(x - 9, y); g.closePath();
		}
		g.stroke();
		g.restore();
	}
}
// the glyphs' glow: black, but for the carved band (an emissive map for the stone)
function runeTexture(aniso) {
	const t = canvasTexture(512, 512, function (g, w) {
		g.fillStyle = '#000';
		g.fillRect(0, 0, w, w);
		g.shadowColor = '#5fffd0';
		g.shadowBlur = 16;
		g.strokeStyle = '#b8fff0';
		g.lineWidth = 6;
		glyphs(g, w, 66, GLYPH);
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

// Flagstones, cracked and overgrown: grass and moss in the joints.
function floorTexture(aniso) {
	const t = canvasTexture(512, 512, function (g, w, h) {
		g.fillStyle = '#3d5a32';
		g.fillRect(0, 0, w, h);
		const n = 4;
		for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
			const off = (r % 2) * 64;
			const x = c * 128 + off, y = r * 128;
			const v = 100 + Math.random() * 35;
			for (const dx of [0, -w]) {
				g.fillStyle = `rgb(${v - 4},${v + 4},${v - 10})`;
				g.fillRect(x + dx + 6, y + 6, 116, 116);
				for (let i = 0; i < 30; i++) {
					g.fillStyle = `rgba(${Math.random() < 0.6 ? '25,30,20' : '190,200,170'},${Math.random() * 0.15})`;
					g.fillRect(x + dx + 8 + Math.random() * 100, y + 8 + Math.random() * 100, 4 + Math.random() * 14, 3 + Math.random() * 10);
				}
			}
		}
		// moss and grass tufts creeping over the stones from the joints
		for (let i = 0; i < 2600; i++) {
			const onJoint = Math.random() < 0.7;
			let x = Math.random() * w, y = Math.random() * h;
			if (onJoint) { if (Math.random() < 0.5) x = Math.round(x / 64) * 64 + (Math.random() - 0.5) * 18; else y = Math.round(y / 128) * 128 + (Math.random() - 0.5) * 18; }
			g.fillStyle = `rgba(${40 + Math.random() * 50},${100 + Math.random() * 80},${30 + Math.random() * 20},${0.3 + Math.random() * 0.4})`;
			g.fillRect(x, y, 1 + Math.random() * 2.5, 2 + Math.random() * 5);
		}
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.anisotropy = aniso;
	return t;
}

// A soft glow dot (for the motes of dust drifting in the light).
function moteTexture() {
	return canvasTexture(64, 64, function (g) {
		const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
		r.addColorStop(0, 'rgba(255,255,255,1)');
		r.addColorStop(0.3, 'rgba(255,255,255,0.5)');
		r.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = r;
		g.fillRect(0, 0, 64, 64);
	});
}
// A shaft of light: bright at the top, fading toward the floor and at its edges.
function shaftTexture() {
	return canvasTexture(64, 256, function (g, w, h) {
		const v = g.createLinearGradient(0, 0, 0, h);
		v.addColorStop(0, 'rgba(255,255,255,0.9)');
		v.addColorStop(1, 'rgba(255,255,255,0)');
		g.fillStyle = v;
		g.fillRect(0, 0, w, h);
		g.globalCompositeOperation = 'destination-in';
		const e = g.createLinearGradient(0, 0, w, 0);
		e.addColorStop(0, 'rgba(0,0,0,0)');
		e.addColorStop(0.5, 'rgba(0,0,0,1)');
		e.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = e;
		g.fillRect(0, 0, w, h);
	});
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
	// (the walls' glyphs glow a faint jade)
	const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(aniso), emissiveMap: runeTexture(aniso), emissive: 0x6effd8, emissiveIntensity: 1.4, roughness: 0.9, metalness: 0 });
	const darkStone = new THREE.MeshStandardMaterial({ map: stone.map, color: 0x9aa494, roughness: 0.85 });
	const ceilingStone = new THREE.MeshStandardMaterial({ map: stone.map, color: 0x6a7266, roughness: 0.95 });
	const grass = new THREE.MeshStandardMaterial({ map: floorTexture(aniso), roughness: 0.95 });
	const gold = new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.9, roughness: 0.3 });
	const vineMat = new THREE.MeshStandardMaterial({ color: 0x3f7a34, roughness: 0.8 });
	const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTexture(), color: new THREE.Color(1.0, 0.9, 0.65).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
	const moteMat = new THREE.PointsMaterial({ map: moteTexture(), color: new THREE.Color(1.6, 1.5, 1.1), size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
	disposables.push(stone, darkStone, ceilingStone, grass, gold, vineMat, shaftMat, moteMat, stone.map, stone.emissiveMap, grass.map, shaftMat.map, moteMat.map);

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
	// the ceiling: we're indoors. One carved slab over the whole maze, sitting right on
	// the walls, with heavy beams across each room under it (just for looks)
	const C = WALL.ceil;
	const ceiling = box(-ext, C, -ext, ext, C + 1, ext, 'ceiling', ceilingStone);
	ceiling.mesh.castShadow = false;   // (the light still finds its way in)
	for (const col of rooms) for (const r of col) {
		for (const off of [-1, 1]) {   // (two, a quarter of the way in from each side: clear of the plinths in the middle)
			const geo = boxGeometry(CELL - T, 0.6, 0.9);
			const beam = new THREE.Mesh(geo, darkStone);
			beam.position.set(r.cx, C - 0.3, r.cz + off * CELL / 4);
			group.add(beam);
			disposables.push(geo);
		}
	}

	// a little stone step under each raised doorway's sill, both sides, so it can be climbed or hopped
	// (it's climbable anyway: this just reads as an invitation)

	// what's in each room: blocks to climb, rings, braziers
	const rings = [];
	const braziers = [];
	// (one column shape for every pillar: fluted, a little fatter at the bottom)
	const columnGeo = new THREE.CylinderGeometry(0.62, 0.72, C - 1.0, 20, 1);
	columnGeo.translate(0, (C - 1.0) / 2, 0);
	{
		const pos = columnGeo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const a = Math.atan2(pos.getZ(i), pos.getX(i)), k = 1 + 0.06 * Math.cos(a * 10);
			pos.setX(i, pos.getX(i) * k);
			pos.setZ(i, pos.getZ(i) * k);
		}
		columnGeo.computeVertexNormals();
	}
	disposables.push(columnGeo);
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
		// a pillar in each corner, floor to ceiling: a fat column on a square base under a square capital
		const pc = CELL / 2 - T / 2 - 1.4;
		for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
			const x = r.cx + sx * pc, z = r.cz + sz * pc;
			box(x - 1.0, 0, z - 1.0, x + 1.0, 0.5, z + 1.0, 'block', darkStone);
			box(x - 0.75, 0.5, z - 0.75, x + 0.75, C - 0.5, z + 0.75, 'block');   // (solid, drawn as the column)
			const col = new THREE.Mesh(columnGeo, darkStone);
			col.position.set(x, 0.5, z);
			col.castShadow = col.receiveShadow = true;
			group.add(col);
			const cap = box(x - 1.0, C - 0.5, z - 1.0, x + 1.0, C, z + 1.0, 'block', darkStone);
			cap.mesh.castShadow = false;
			placed.push({ x, z, s: 1.0 });
		}
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
				box(x - s2, h, z - s2, x + s2, Math.min(h + 1.6 + rand() * 1.5, C - 2.4), z + s2, 'block', darkStone);   // (always headroom on top)
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

	// overgrowth and light: vines hanging from the ceiling (with clumps of leaves),
	// a shaft of light slanting down in every room, and motes drifting in the air
	const vineGeo = new THREE.CylinderGeometry(0.035, 0.07, 1, 6, 1, true);
	vineGeo.translate(0, -0.5, 0);
	const leafGeo = new THREE.IcosahedronGeometry(0.2, 0);
	const flatRooms = rooms.flat();
	const VINES = 16, LEAVES = 3;
	const vines = new THREE.InstancedMesh(vineGeo, vineMat, flatRooms.length * VINES);
	const leaves = new THREE.InstancedMesh(leafGeo, vineMat, flatRooms.length * VINES * LEAVES);
	const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), at = new THREE.Vector3(), eu = new THREE.Euler();
	let nv = 0, nl = 0;
	for (const r of flatRooms) {
		for (let k = 0; k < VINES; k++) {
			// (mostly along the walls)
			const edge = rand() < 0.7, side = Math.floor(rand() * 4), u = (rand() * 2 - 1) * (CELL / 2 - T);
			const w = CELL / 2 - T / 2 - 0.2 - rand() * 0.4;
			const x = r.cx + (edge ? (side === 0 ? -w : side === 1 ? w : u) : (rand() * 2 - 1) * (CELL / 2 - 3));
			const z = r.cz + (edge ? (side === 2 ? -w : side === 3 ? w : u) : (rand() * 2 - 1) * (CELL / 2 - 3));
			const len = edge ? 1.5 + rand() * 4.5 : 0.8 + rand() * 2;
			at.set(x, C, z);
			q.setFromEuler(eu.set((rand() - 0.5) * 0.12, 0, (rand() - 0.5) * 0.12));
			mtx.compose(at, q, sc.set(1, len, 1));
			vines.setMatrixAt(nv++, mtx);
			for (let l = 0; l < LEAVES; l++) {
				const s2 = 0.6 + rand() * 0.9;
				mtx.compose(at.set(x + (rand() - 0.5) * 0.2, C - len * (0.2 + rand() * 0.8), z + (rand() - 0.5) * 0.2), q.setFromEuler(eu.set(rand() * 3, rand() * 3, 0)), sc.set(s2 * 1.3, s2, s2 * 0.7));
				leaves.setMatrixAt(nl++, mtx);
			}
		}
		// the shaft of light, from a crack in the ceiling
		const sx = r.cx + (rand() * 2 - 1) * 6, sz = r.cz + (rand() * 2 - 1) * 6;
		const shaftGeo = new THREE.CylinderGeometry(0.7, 2.2, C, 20, 1, true);
		const shaft = new THREE.Mesh(shaftGeo, shaftMat);
		shaft.position.set(sx, C / 2, sz);
		shaft.rotation.set((rand() - 0.5) * 0.4, 0, (rand() - 0.5) * 0.4);
		shaft.renderOrder = 2;
		group.add(shaft);
		disposables.push(shaftGeo);
	}
	vines.castShadow = leaves.castShadow = true;
	group.add(vines, leaves);
	disposables.push(vineGeo, leafGeo);
	const moteGeo = new THREE.BufferGeometry();
	{
		const n = 700, arr = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			arr[i * 3] = lo + rand() * (hi - lo);
			arr[i * 3 + 1] = 0.5 + rand() * (C - 1);
			arr[i * 3 + 2] = lo + rand() * (hi - lo);
		}
		moteGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
	}
	const motes = new THREE.Points(moteGeo, moteMat);
	motes.renderOrder = 3;
	group.add(motes);
	disposables.push(moteGeo);

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
		// (the motes drifting)
		update(t) {
			motes.position.set(Math.sin(t * 0.13) * 0.6, Math.sin(t * 0.31) * 0.4, Math.cos(t * 0.11) * 0.6);
		},
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
