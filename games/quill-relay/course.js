/*
 * Quill Relay: one wall's stretch of the course. The course runs round the
 * room on the three walls as one side-on level, a slab of chequered earth
 * with grass on top standing square to each wall's camera. Each stretch is
 * its own local frame: x along the wall (left to right as you face it, 0 in
 * the middle), y up, z toward the camera (so a depth d from the room's
 * middle is z = -d). The game turns each stretch to face its wall.
 *
 * The slab is mitred: at depth d it runs from x = -d to x = d, which is
 * exactly the wall camera's 90 degree view, so neighbouring stretches meet
 * along the room's diagonals and the corners join without a seam. Both ends
 * are flat (at the base height), so the heights agree there too.
 *
 *   const sec = buildSection({ C, mats, rand, gentle });
 *   sec.group           the meshes (in the stretch's local frame)
 *   sec.height(u)       the ground's height at u (0 at the left edge, C.span at the right), metres above C.ground
 *   sec.slope(u)        dh/du
 *   sec.items           rings, robots, springs, spikes, monitors: { type, u, y, mesh, ... }
 *   sec.loops           { u, r }: run through one fast enough to go round it
 *   sec.checkpoint      the spinning post at the right end: { u, mesh }
 *   sec.dispose()
 */
import * as G from '../../lib/glint/glint.js';
import { buildRing, buildGearhog, buildBuzzdrone, buildSpring, buildSpikes, buildMonitor, buildCheckpoint } from './models.js';

const TAU = Math.PI * 2;
const STEP = 0.05;          // metres between height samples
const PAD = 7;              // samples run this far past each end (for the mitres)

export function buildSection({ C, mats, rand, gentle }) {
	const SPAN = C.span;
	const half = SPAN / 2;
	const GROUND = C.ground;
	const N = Math.round((SPAN + PAD * 2) / STEP) + 1;
	const H = new Float32Array(N);
	const idx = (u) => (u + PAD) / STEP;

	const height = function (u) {
		const f = Math.max(0, Math.min(N - 1.001, idx(u)));
		const i = Math.floor(f);
		return H[i] + (H[i + 1] - H[i]) * (f - i);
	};
	const slope = (u) => (height(u + 0.05) - height(u - 0.05)) / 0.1;

	// a bump over [a, b], height amp (negative for a dip): a smooth cosine
	function bump(a, b, amp) {
		for (let i = 0; i < N; i++) {
			const u = i * STEP - PAD;
			if (u <= a || u >= b) continue;
			const t = (u - a) / (b - a);
			H[i] += amp * (1 - Math.cos(TAU * t)) / 2;
		}
	}

	const group = new G.Group();
	const items = [];
	const loops = [];
	const at = (u, y, d = C.depth) => new G.Vector3(u - half, y, -d);

	function add(type, u, y, mesh, extra) {
		mesh.position.copy(at(u, GROUND + y));   // (y: metres above the base height)
		group.add(mesh);
		const it = Object.assign({ type, u, y, mesh, alive: true, age: 0 }, extra);
		items.push(it);
		return it;
	}
	function ring(u, y) {
		const it = add('ring', u, y, buildRing(C.ringSize));
		it.spin = rand() * TAU;
		return it;
	}
	// a line of rings from u0 to u1, each lifted off the ground by lift(t)
	function ringLine(u0, u1, n, lift) {
		for (let i = 0; i < n; i++) {
			const t = n > 1 ? i / (n - 1) : 0.5;
			const u = u0 + (u1 - u0) * t;
			ring(u, height(u) + lift(t));
		}
	}

	/* ---------- the plan: what goes in each slot ---------- */

	// three slots between the flat ends; a loop takes two side by side
	const SLOTS = C.slots;
	const plan = [];
	if (gentle) {
		plan.push({ a: SLOTS[0][0], b: SLOTS[0][1], ground: 'hill', thing: 'rings' });
		plan.push({ a: SLOTS[1][0], b: SLOTS[1][1], ground: 'flat', thing: 'gearhog' });
		plan.push({ a: SLOTS[2][0], b: SLOTS[2][1], ground: 'flat', thing: 'monitor' });
	} else {
		let loop = rand() < C.loopChance ? (rand() < 0.5 ? 0 : 1) : -1;
		for (let s = 0; s < SLOTS.length; s++) {
			if (s === loop) {
				plan.push({ a: SLOTS[s][0], b: SLOTS[s + 1][1], ground: 'flat', thing: 'loop' });
				s++;
				continue;
			}
			const r = rand();
			const ground = r < 0.45 ? 'flat' : r < 0.78 ? 'hill' : 'dip';
			const pick = (list) => list[Math.floor(rand() * list.length)];
			const thing = ground === 'flat' ? pick(['spring', 'spikes', 'gearhog', 'drone', 'monitor', 'gearhog', 'spikes'])
				: ground === 'hill' ? pick(['rings', 'drone', 'rings', 'spikes'])
				: pick(['rings', 'gearhog']);
			plan.push({ a: SLOTS[s][0], b: SLOTS[s][1], ground, thing });
		}
	}

	// the ground first (the things sit on it)
	for (const p of plan) {
		if (p.ground === 'hill') bump(p.a, p.b, C.hill[0] + rand() * (C.hill[1] - C.hill[0]));
		if (p.ground === 'dip') bump(p.a, p.b, -(C.dip[0] + rand() * (C.dip[1] - C.dip[0])));
	}

	// the things
	for (const p of plan) {
		const mid = (p.a + p.b) / 2;
		const w = p.b - p.a;
		switch (p.thing) {
			case 'rings':
				ringLine(p.a + 0.4, p.b - 0.4, 5, (t) => C.ringLift + Math.sin(Math.PI * t) * (p.ground === 'hill' ? 0.5 : 0.15));
				break;
			case 'loop': {
				const r = C.loop.radius;
				loops.push({ u: mid, r });
				buildLoop(mid, r);
				// rings round the inside of the loop, and a few leading in
				for (let i = 1; i < 10; i++) {
					const a = i / 10 * TAU;
					ring(mid + Math.sin(a) * (r - C.ringLift), r - Math.cos(a) * (r - C.ringLift));
				}
				ringLine(p.a, mid - 0.4, 3, () => C.ringLift);
				break;
			}
			case 'spring': {
				const it = add('spring', mid, height(mid), buildSpring());
				it.squash = 0;
				// a fountain of rings above it
				for (let i = 0; i < 5; i++) ring(mid + (i - 2) * 0.4, 2.0 + (2 - Math.abs(i - 2)) * 0.4 + 0.5);
				ringLine(p.a + 0.2, mid - 0.8, 2, () => C.ringLift);
				break;
			}
			case 'spikes': {
				const n = 3;
				const u = mid;
				add('spikes', u, height(u), buildSpikes(n), { half: n * 0.15 + 0.05 });
				// rings in an arc over them, to show the jump
				ringLine(u - 1.1, u + 1.1, 5, (t) => C.ringLift + Math.sin(Math.PI * t) * 1.3);
				break;
			}
			case 'gearhog': {
				const range = Math.min(1.1, w / 2 - 0.5);
				const m = buildGearhog();
				add('gearhog', mid, height(mid), m, { u0: mid, range, dir: rand() < 0.5 ? -1 : 1, speed: C.bots.walk });
				ringLine(p.a + 0.2, p.a + 0.9, 2, () => C.ringLift);
				break;
			}
			case 'drone': {
				const m = buildBuzzdrone();
				const y = height(mid) + C.bots.hover;
				add('drone', mid, y, m, { u0: mid, y0: y, range: Math.min(0.9, w / 2 - 0.6), phase: rand() * TAU, dir: 1 });
				ringLine(p.a + 0.3, p.b - 0.3, 4, () => C.ringLift);
				break;
			}
			case 'monitor': {
				const kind = rand() < 0.65 ? 'rings' : 'shield';
				add('monitor', mid, height(mid), buildMonitor(kind), { kind, half: 0.45, tall: 0.95 });
				ringLine(p.a + 0.2, mid - 0.9, 2, () => C.ringLift);
				break;
			}
		}
	}
	// a few rings on the run-up and the run-out
	ringLine(0.9, 1.5, 2, () => C.ringLift);

	/* ---------- the slab ---------- */

	// the grass on top: a grid over (along, depth), mitred to the view at each depth
	const NU = 160;
	const depths = [];
	for (let d = C.near; d <= C.far + 1e-6; d += (C.far - C.near) / 10) depths.push(d);
	{
		const pos = [];
		const uv = [];
		const index = [];
		for (let j = 0; j < depths.length; j++) {
			const d = depths[j];
			for (let i = 0; i <= NU; i++) {
				const x = -d + 2 * d * i / NU;
				const u = x + half;
				pos.push(x, GROUND + height(u), -d);
				uv.push(u * 0.35, d * 0.35);
			}
		}
		for (let j = 0; j < depths.length - 1; j++) for (let i = 0; i < NU; i++) {
			const a = j * (NU + 1) + i;
			const b = a + NU + 1;
			index.push(a, a + 1, b, a + 1, b + 1, b);
		}
		const geo = new G.BufferGeometry();
		geo.setAttribute('position', new G.Float32BufferAttribute(pos, 3));
		geo.setAttribute('uv', new G.Float32BufferAttribute(uv, 2));
		geo.setIndex(index);
		geo.computeVertexNormals();
		const top = new G.Mesh(geo, mats.grass);
		top.receiveShadow = true;
		group.add(top);
	}

	// a face toward the camera, standing from the ground's edge at depth d
	// down to `bottom` (or, for a lip, hanging `bottom` metres below it), its
	// texture square in metres
	function face(d, bottom, mat, scale, lip = 0) {
		const pos = [];
		const uv = [];
		const index = [];
		for (let i = 0; i <= NU; i++) {
			const x = -d + 2 * d * i / NU;
			const u = x + half;
			const y = GROUND + height(u) + lip;
			const yb = lip ? y - bottom : bottom;
			pos.push(x, y, -d, x, yb, -d);
			uv.push(u * scale, lip ? 1 : y * scale, u * scale, lip ? 0 : yb * scale);
		}
		for (let i = 0; i < NU; i++) {
			const a = i * 2;
			index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
		const geo = new G.BufferGeometry();
		geo.setAttribute('position', new G.Float32BufferAttribute(pos, 3));
		geo.setAttribute('uv', new G.Float32BufferAttribute(uv, 2));
		geo.setIndex(index);
		geo.computeVertexNormals();
		const m = new G.Mesh(geo, mat);
		m.receiveShadow = true;
		group.add(m);
		return m;
	}
	face(C.near, GROUND - 5, mats.earth, 0.5);
	face(C.near - 0.01, 0.42, mats.fringe, 0.4, 0.02);   // (the lip of grass over the earth)

	/* ---------- loops ---------- */

	function buildLoop(u, r) {
		const g = new G.Group();
		g.position.copy(at(u, GROUND + r));
		const width = C.loop.width;
		const inner = new G.Mesh(new G.CylinderGeometry(r, r, width, 64, 1, true), mats.loopInner);
		inner.rotation.x = Math.PI / 2;
		inner.receiveShadow = true;
		g.add(inner);
		const outer = new G.Mesh(new G.CylinderGeometry(r + 0.45, r + 0.45, width, 64, 1, true), mats.earthLoop);
		outer.rotation.x = Math.PI / 2;
		g.add(outer);
		for (const side of [-1, 1]) {
			const rim = new G.Mesh(new G.RingGeometry(r, r + 0.45, 64), mats.earthLoop);
			rim.position.z = side * width / 2;
			if (side < 0) rim.rotation.y = Math.PI;
			g.add(rim);
			const edge = new G.Mesh(new G.TorusGeometry(r + 0.02, 0.05, 6, 64), mats.loopEdge);
			edge.position.z = side * (width / 2 - 0.03);
			g.add(edge);
		}
		g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
		group.add(g);
	}

	/* ---------- the checkpoint ---------- */

	const post = buildCheckpoint();
	post.position.copy(at(C.checkpoint, GROUND + height(C.checkpoint), C.depth + C.post));
	group.add(post);
	const checkpoint = { u: C.checkpoint, mesh: post, spin: 0, hit: false };

	return {
		group, height, slope, items, loops, checkpoint, plan,
		dispose() {
			group.traverse(function (o) {
				if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
				for (const m of [].concat(o.material || [])) {
					if (m.userData.shared) continue;
					if (m.map && !m.map.userData.shared) m.map.dispose();
					m.dispose();
				}
			});
		},
	};
}
