/*
 * Backrooms: office layouts, as plain data, and the differences between a
 * floor and the floor below it.
 *
 * A layout is a list of items, each a prop placed in the room:
 *   { id, type, wall, x, y, z, rot, props, r }
 * x/z are metres from the room's centre (where the players' eye is), rot is
 * the yaw, r a footprint radius for keeping props apart, and props whatever
 * the model needs (colour, state, seed...). `wall` is which wall's camera
 * sees it (0 left, 1 front, 2 right).
 *
 * mutate() copies a layout and makes changes to it: more candidates than
 * needed, spread round the walls, so the game can check each one is
 * actually visible and keep the best.
 */
import { CEIL, TILE, POSTERS, rng, wallPoint, wallYaw } from './models.js';

export const R = 7.2;            // the room's half-width: 12 ceiling tiles
const DESK_Y = 0.75;

// Drab office colours, and the louder ones a changed colour can become.
const CHAIRS = [0x4a4b55, 0x5b4a3a, 0x3d4a5c, 0x55504a];
const CABINETS = [0xa49b7d, 0x8f8a7c, 0xb3a77f];
const FABRICS = [0x9c8f68, 0x8a8574, 0x9a9070];
const MUGS = [0xe8e2cc, 0x2f5f9a, 0x9a3a2a];
const LOUD = [0xa12a22, 0x2f7d58, 0x2b4fa8, 0xc77a1c, 0x6b2f7a];

export function generate(seed) {
	const r = rng(seed);
	const pick = (a) => a[Math.floor(r() * a.length)];
	const items = [];
	let next = 1;
	const openings = [[], [], []];

	function add(type, x, z, rot, props = {}, opts = {}) {
		const item = { id: next++, type, x, z, y: opts.y || 0, rot, props, r: opts.r || 0, wall: opts.wall };
		if (item.wall === undefined) item.wall = wallOf(x, z);
		items.push(item);
		return item;
	}
	// Place by wall coordinates: u across, d out, a turned from facing the eye.
	function addW(type, wall, u, d, a, props, opts = {}) {
		const p = wallPoint(wall, u, d);
		return add(type, p.x, p.z, wallYaw(wall) + a, props, Object.assign({ wall }, opts));
	}
	const free = (x, z, rad) => items.every((it) => !it.r || Math.hypot(it.x - x, it.z - z) > it.r + rad);

	for (let wall = 0; wall < 3; wall++) {
		/* the far wall: a corridor out, a door, things hung and stood against it */
		const uc = pick([-4.2, -2.4, 2.4, 4.2, wall === 1 ? 0 : 3.6]);
		openings[wall].push({ u: uc, w: 1.8 });
		const slots = [];
		for (let u = -R + 0.8; u <= R - 0.8 + 1e-6; u += 1.2) if (Math.abs(u - uc) > 1.55) slots.push(u);
		const order = slots.slice().sort(() => r() - 0.5);
		const used = new Set();
		const take = () => { const u = order.find((s) => !used.has(s)); used.add(u); return u; };

		// a door, with an exit sign over it on one wall
		const du = take();
		addW('door', wall, du, R, 0, { open: false, color: pick([0x9d8457, 0x8a7a5a, 0xa08c62]) }, { r: 0.5 });
		if (wall === 1 || r() < 0.4) addW('exitSign', wall, du, R, 0, {}, { y: 2.35 });
		// against the wall: cabinets, a cooler, a printer, a plant
		const standers = ['cabinet', 'cabinet', 'cooler', 'printer', 'plant', 'cabinet', 'boxes'].sort(() => r() - 0.5).slice(0, 4 + Math.floor(r() * 2));
		for (const type of standers) {
			const u = take();
			if (u === undefined) break;
			const off = (r() - 0.5) * 0.3;
			const props = type === 'cabinet' ? { color: pick(CABINETS), tall: r() < 0.5 } : { seed: Math.floor(r() * 1e6), pot: 0x9a5a3a, n: 2 + Math.floor(r() * 2) };
			addW(type, wall, u + off, R - 0.36, 0, props, { r: 0.42 });
			// a second cabinet beside the first, sometimes
			if (type === 'cabinet' && r() < 0.5 && Math.abs(u + off + 0.5 - uc) > 1.4 && u + off + 0.5 < R - 0.3) {
				addW('cabinet', wall, u + off + 0.5, R - 0.36, 0, { color: pick(CABINETS), tall: r() < 0.5 }, { r: 0.3 });
			}
		}
		// on the wall: posters, a notice, a whiteboard, a clock, vents
		const hung = ['poster', 'poster', 'notice', 'poster', 'extinguisher'].sort(() => r() - 0.5);
		const families = ['sunset', 'peak', 'light', 'tree', 'map'].sort(() => r() - 0.5);
		const hungSlots = slots.filter((u) => Math.abs(u - du) > 0.7).sort(() => r() - 0.5);
		let fi = 0;
		for (let i = 0; i < hung.length && i < hungSlots.length; i++) {
			const u = hungSlots[i] + (r() - 0.5) * 0.2;
			const type = hung[i];
			if (type === 'extinguisher') addW('extinguisher', wall, u, R, 0, {}, { y: 0 });
			else {
				const variant = type === 'notice' ? 'notice' : families[fi++ % families.length];
				addW('poster', wall, u, R, 0, { variant }, { y: type === 'notice' ? 1.45 : 1.62 });
			}
		}
		if (r() < 0.6) {
			const u = hungSlots[hungSlots.length - 1];
			if (u !== undefined && Math.abs(u) < R - 1.2) addW('poster', wall, u, R, 0, { variant: 'board' }, { y: 1.5 });
		}
		const clockSlot = slots.filter((u) => Math.abs(u - du) > 0.8).sort(() => r() - 0.5)[0];
		addW('clock', wall, clockSlot, R, 0, { h: Math.floor(r() * 12), m: 5 * Math.floor(r() * 12) }, { y: 2.18 });
		for (let k = 0; k < 2; k++) {
			const u = slots[Math.floor(r() * slots.length)];
			if (Math.abs(u - clockSlot) > 1 && Math.abs(u - du) > 0.8) addW('vent', wall, u, R, 0, {}, { y: k ? 0.25 : 2.42 });
		}

		/* a cubicle pod in the middle distance */
		const desks = 2 + (r() < 0.45 ? 1 : 0);
		const d0 = 4.1 + r() * 0.6;
		const u0 = (r() - 0.5) * (wall === 1 ? 2.4 : 1.6);
		const fabric = pick(FABRICS);
		const facing = r() < 0.7;     // monitors toward the eye, or away
		const backD = facing ? d0 + 0.42 : d0 - 0.42;
		const ph = facing ? 1.35 : 1.05;
		addW('partition', wall, u0, backD, 0, { w: desks * 1.5, h: ph, color: fabric }, { r: 0 });
		for (const s of [-1, 1]) {
			const pu = u0 + s * desks * 0.75;
			addW('partition', wall, pu, d0, Math.PI / 2, { w: 0.84, h: ph, color: fabric }, { r: 0 });
		}
		for (let i = 0; i < desks; i++) {
			const u = u0 + (i - (desks - 1) / 2) * 1.5;
			const a = facing ? 0 : Math.PI;           // the side the sitter is on
			const sgn = facing ? 1 : -1;
			addW('desk', wall, u, d0, a, { color: 0x8c7752 }, { r: 0.75 });
			const mon = addW('crt', wall, u - 0.15, d0 + sgn * 0.12, a, { on: false }, { y: DESK_Y });
			mon.desk = true;
			addW('keyboard', wall, u - 0.15, d0 - sgn * 0.2, a, {}, { y: DESK_Y });
			const extra = pick(['mug', 'papers', 'phone', 'mug']);
			addW(extra, wall, u + 0.45, d0 - sgn * 0.05, a + (r() - 0.5), { color: pick(MUGS), seed: Math.floor(r() * 1e6) }, { y: DESK_Y });
			const cd = d0 - sgn * 0.75;
			addW('chair', wall, u + (r() - 0.5) * 0.3, cd, a + Math.PI + (r() - 0.5) * 0.6, { color: pick(CHAIRS) }, { r: 0.36 });
		}

		/* a pillar, and loose things standing about */
		for (let tries = 0; tries < 20; tries++) {
			const d = 2.9 + r() * 1.6;
			const u = (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.3) * d;
			const p = wallPoint(wall, u, d);
			if (free(p.x, p.z, 0.9)) { addW('pillar', wall, u, d, 0, {}, { r: 0.55 }); break; }
		}
		const loose = ['chair', 'bin', 'plant', 'boxes', 'coatStand', 'chair', 'wetSign', 'bin'].sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 2));
		for (const type of loose) {
			for (let tries = 0; tries < 30; tries++) {
				const d = 2.7 + r() * 3.5;
				const u = (r() * 2 - 1) * (0.72 * d - 0.4);
				const p = wallPoint(wall, u, d);
				if (!free(p.x, p.z, 0.45)) continue;
				const a = type === 'chair' ? (r() - 0.5) * 2.4 : (r() - 0.5) * 0.8;
				addW(type, wall, u, d, a, { color: pick(CHAIRS), seed: Math.floor(r() * 1e6), pot: 0x7a6a4a, n: 2 + Math.floor(r() * 2), coat: r() < 0.6 ? 0x3b3330 : 0 }, { r: 0.4 });
				break;
			}
		}

		/* damp patches on the carpet */
		const nStains = 1 + Math.floor(r() * 3);
		for (let i = 0; i < nStains; i++) {
			const d = 2.8 + r() * 3.6;
			const u = (r() * 2 - 1) * 0.7 * d;
			addW('stain', wall, u, d, r() * 6, { seed: Math.floor(r() * 1e6), size: 0.9 + r() * 1.1, aspect: 0.6 + r() * 0.4 });
		}
	}

	/* the ceiling: a grid of fluorescent panels, one flickering, tiles missing */
	const panels = [];
	for (let a = 0; a < 6; a++) {
		for (let b = 0; b < 6; b++) {
			const x = -6.3 + 2.4 * a;
			const z = -6.0 + 2.4 * b;
			if (z > 1.5) continue;              // behind the players: unseen
			panels.push(add('light', x, z, 0, { state: 'on', seed: a * 7 + b }, { y: CEIL }));
		}
	}
	pick(panels.filter((p) => Math.hypot(p.x, p.z) > 3)).props.state = 'flicker';
	for (let i = 0; i < 2; i++) {
		const spot = freeTile(items, r);
		if (spot) add('hole', spot.x, spot.z, 0, { seed: Math.floor(r() * 1e6) }, { y: CEIL });
	}
	// a water stain or two on the tiles
	for (let i = 0; i < 2; i++) {
		const spot = freeTile(items, r);
		if (spot) add('stain', spot.x, spot.z, 0, { seed: Math.floor(r() * 1e6), size: 0.7, aspect: 1, ceiling: true }, { y: CEIL });
	}

	return { seed, items, openings, next };
}

// Which wall's camera looks toward x, z.
export function wallOf(x, z) {
	if (-x >= Math.abs(z)) return 0;
	if (x >= Math.abs(z)) return 2;
	return 1;
}

// A ceiling tile somewhere visible that has nothing in it yet.
function freeTile(items, r) {
	for (let tries = 0; tries < 60; tries++) {
		const x = (Math.floor(r() * 24) - 12) * TILE + TILE / 2;
		const z = (Math.floor(r() * 16) - 12) * TILE + TILE / 2;
		const wall = wallOf(x, z);
		const d = wall === 1 ? -z : Math.abs(x);
		const u = wall === 1 ? x : z;
		if (d < 2.4 || d > R - 0.4 || Math.abs(u) > 0.8 * d) continue;
		const clash = items.some((it) => (it.type === 'light' && Math.abs(it.x - x) < 0.5 && Math.abs(it.z - z) < 0.95)
			|| ((it.type === 'hole' || (it.type === 'stain' && it.props.ceiling)) && Math.hypot(it.x - x, it.z - z) < 1.3));
		if (!clash) return { x, z };
	}
	return null;
}

const clone = (o) => JSON.parse(JSON.stringify(o));

/*
 * Copy a layout with up to `count` differences, as candidates in order of
 * preference (more than needed: the game drops any it can't see).
 * Returns { layout, diffs }, each diff { id, kind, itemId, wall, label }.
 * `level` 0..3 makes the changes smaller and quieter.
 */
export function mutate(layout, count, level, seed) {
	const r = rng(seed);
	const pick = (a) => a[Math.floor(r() * a.length)];
	const lower = clone(layout);
	const items = lower.items;
	let next = layout.next + 1000;
	const touched = new Set();
	const diffs = [];
	const subtle = level / 3;          // 0 bold .. 1 subtle

	const byWall = (wall, fn) => items.filter((it) => it.wall === wall && !touched.has(it.id) && fn(it));
	const free = (x, z, rad, except) => items.every((it) => it === except || !it.r || Math.hypot(it.x - x, it.z - z) > it.r + rad);
	const inView = (wall, x, z) => {
		const d = wall === 1 ? -z : Math.abs(x);
		const u = wall === 1 ? x : (wall === 0 ? -z : z);
		return d > 2.6 && d < R - 0.5 && Math.abs(u) < 0.75 * d - 0.3;
	};

	// Every kind of difference: which items it can apply to, and the change.
	const BIG = ['chair', 'cabinet', 'cooler', 'plant', 'printer', 'coatStand', 'boxes', 'poster', 'crt', 'wetSign', 'bin', 'extinguisher', 'clock'];
	const SMALL = ['mug', 'keyboard', 'papers', 'phone', 'vent', 'bin', 'extinguisher', 'crt'];
	const KINDS = {
		missing: {
			weight: 3,
			targets: (w) => byWall(w, (it) => (subtle < 0.5 ? BIG : BIG.concat(SMALL)).includes(it.type)),
			apply(it) { items.splice(items.indexOf(it), 1); return 'MISSING'; },
		},
		added: {
			weight: 2.5,
			targets: (w) => [w],
			apply(wall) {
				const type = pick(subtle < 0.5 ? ['chair', 'plant', 'cabinet', 'boxes', 'wetSign', 'coatStand'] : ['chair', 'bin', 'boxes', 'wetSign', 'plant']);
				for (let tries = 0; tries < 40; tries++) {
					const d = 2.8 + r() * 3.4;
					const u = (r() * 2 - 1) * (0.7 * d - 0.4);
					const p = wallPoint(wall, u, d);
					if (!free(p.x, p.z, 0.55)) continue;
					const it = { id: next++, type, x: p.x, z: p.z, y: 0, rot: wallYaw(wall) + (r() - 0.5) * 2, r: 0.4, wall,
						props: { color: pick(LOUD.concat(CHAIRS)), seed: Math.floor(r() * 1e6), pot: 0x7a6a4a, n: 2, tall: true, coat: 0x4a2c2a } };
					items.push(it);
					return { label: 'ADDED', item: it };
				}
				return null;
			},
		},
		moved: {
			weight: 2,
			targets: (w) => byWall(w, (it) => ['chair', 'bin', 'plant', 'boxes', 'coatStand', 'wetSign'].includes(it.type) && it.r),
			apply(it) {
				const step = 1.1 - subtle * 0.4;
				for (let tries = 0; tries < 30; tries++) {
					const a = r() * Math.PI * 2;
					const x = it.x + Math.cos(a) * step;
					const z = it.z + Math.sin(a) * step;
					if (!inView(it.wall, x, z) || !free(x, z, it.r, it)) continue;
					it.x = x; it.z = z;
					return 'MOVED';
				}
				return null;
			},
		},
		turned: {
			weight: 2,
			targets: (w) => byWall(w, (it) => it.type === 'chair' || (it.type === 'cabinet' && it.r && subtle > 0.3)),
			apply(it) {
				it.rot += it.type === 'chair' ? (subtle < 0.5 ? Math.PI : pick([Math.PI / 2, -Math.PI / 2, Math.PI])) : Math.PI / 2;
				return 'TURNED';
			},
		},
		colour: {
			weight: 2,
			targets: (w) => byWall(w, (it) => ['chair', 'cabinet', 'partition', 'door', 'mug', 'coatStand'].includes(it.type) && (it.type !== 'coatStand' || it.props.coat)),
			apply(it) {
				const key = it.type === 'coatStand' ? 'coat' : 'color';
				const old = it.props[key];
				it.props[key] = subtle < 0.5 || it.type === 'mug' ? pick(LOUD.filter((c) => c !== old)) : shade(old, r);
				return 'COLOUR';
			},
		},
		light: {
			weight: 2,
			targets: (w) => byWall(w, (it) => it.type === 'light' && it.props.state === 'on'),
			apply(it) { it.props.state = subtle < 0.5 && r() < 0.6 ? 'off' : (r() < 0.5 ? 'off' : 'flicker'); return it.props.state === 'off' ? 'LIGHT OFF' : 'FLICKER'; },
		},
		door: {
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'door' && !it.props.open),
			apply(it) { it.props.open = true; return 'DOOR OPEN'; },
		},
		clock: {
			weight: 1.2,
			targets: (w) => byWall(w, (it) => it.type === 'clock'),
			apply(it) {
				if (subtle < 0.5) it.props.h = (it.props.h + 3 + Math.floor(r() * 6)) % 12;
				else it.props.m = (it.props.m + 15 + 5 * Math.floor(r() * 6)) % 60;
				return 'CLOCK';
			},
		},
		poster: {
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'poster'),
			apply(it) {
				const fam = POSTERS[it.props.variant].family;
				const siblings = Object.keys(POSTERS).filter((v) => POSTERS[v].family === fam && v !== it.props.variant);
				const sameSize = Object.keys(POSTERS).filter((v) => POSTERS[v].family !== fam && POSTERS[v].w === POSTERS[it.props.variant].w && !v.includes('-'));
				it.props.variant = subtle >= 0.5 || !sameSize.length ? pick(siblings) : pick(sameSize);
				return 'POSTER';
			},
		},
		monitor: {
			weight: 2,
			targets: (w) => byWall(w, (it) => it.type === 'crt' && !it.props.on),
			apply(it) { it.props.on = true; return 'SCREEN ON'; },
		},
		stain: {
			weight: 1 + subtle,
			targets: (w) => [w],
			apply(wall) {
				const d = 2.8 + r() * 3.2;
				const u = (r() * 2 - 1) * 0.65 * d;
				const p = wallPoint(wall, u, d);
				const it = { id: next++, type: 'stain', x: p.x, z: p.z, y: 0, rot: r() * 6, r: 0, wall, props: { seed: Math.floor(r() * 1e6), size: 1.5 - subtle * 0.4, aspect: 0.7 } };
				items.push(it);
				return { label: 'NEW STAIN', item: it };
			},
		},
		tile: {
			weight: 1 + subtle,
			targets: (w) => [w],
			apply(wall) {
				for (let tries = 0; tries < 10; tries++) {
					const spot = freeTile(items, r);
					if (!spot || wallOf(spot.x, spot.z) !== wall) continue;
					const it = { id: next++, type: 'hole', x: spot.x, z: spot.z, y: CEIL, rot: 0, r: 0, wall, props: { seed: Math.floor(r() * 1e6) } };
					items.push(it);
					return { label: 'TILE MISSING', item: it };
				}
				return null;
			},
		},
		figure: {
			weight: level >= 2 ? 3 : 0,
			targets: (w) => (diffs.some((d) => d.kind === 'figure') ? [] : [w]),
			apply(wall) {
				const o = lower.openings[wall][0];
				const p = wallPoint(wall, o.u + (r() - 0.5) * 0.6, R + 9 + r() * 5);
				const it = { id: next++, type: 'figure', x: p.x, z: p.z, y: 0, rot: wallYaw(wall), r: 0, wall, props: {} };
				items.push(it);
				return { label: '?', item: it };
			},
		},
	};

	const walls = [0, 1, 2].sort(() => r() - 0.5);
	let failures = 0;
	for (let i = 0; diffs.length < count && failures < 60; i++) {
		const wall = walls[i % 3];
		const options = Object.keys(KINDS).filter((k) => KINDS[k].weight > 0 && KINDS[k].targets(wall).length);
		// don't pile up the same kind
		const weights = options.map((k) => KINDS[k].weight / (1 + 2 * diffs.filter((d) => d.kind === k).length));
		let x = r() * weights.reduce((a, b) => a + b, 0);
		let kind = options[0];
		for (let j = 0; j < options.length; j++) { x -= weights[j]; if (x <= 0) { kind = options[j]; break; } }
		const target = pick(KINDS[kind].targets(wall));
		const result = KINDS[kind].apply(target);
		if (!result) { failures++; continue; }
		if (typeof result === 'string') {
			touched.add(target.id);
			diffs.push({ id: diffs.length, kind, itemId: target.id, wall, label: result });
		} else {
			touched.add(result.item.id);
			diffs.push({ id: diffs.length, kind, itemId: result.item.id, wall, label: result.label, added: true });
		}
	}
	return { layout: lower, diffs };
}

// A colour nudged a little: subtle, but there.
function shade(c, r) {
	const k = r() < 0.5 ? 0.62 : 1.45;
	const ch = (s) => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k + (r() - 0.5) * 40)));
	return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
