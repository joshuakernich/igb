/*
 * Small Talk: the party, as plain data, and the weird things that happen to
 * it between one blink and the next.
 *
 * A layout is a list of items, each a prop placed in the room:
 *   { id, type, wall, x, y, z, rot, props, r, flip, lean }
 * x/z are metres from the room's centre (where the players' eye is), rot is
 * the yaw, r a footprint radius for keeping props apart, and props whatever
 * the model needs. `wall` is which wall's camera sees it (0 left, 1 front,
 * 2 right). flip hangs it upside down from y (the ceiling), lean tips it.
 *
 * It's Gary's leaving do in a hired function room: round tables, a buffet,
 * the punch, the cake, a banner, balloons, and guests making small talk in
 * twos and threes. mutate() makes it weird: never a chair nudged, always
 * something nobody could miss once they'd seen it (a guest floating, a face
 * on the back of a head, twins). More candidates than needed, spread round
 * the walls, so the game can check each one is actually visible.
 */
import { CEIL, rng, wallPoint, wallYaw } from './models.js';
import { makePerson, otherFace, EXPR, CALM, ODD, WEIRD } from './people.js';

export const R = 7.2;            // the room's half-width: 12 ceiling tiles

const SASHES = [0xc23a5a, 0x3a5a8a, 0xd0a020, 0x3a8a5a];
const BALLOONS = [0xe8445a, 0xf2c22e, 0x3a8ad8, 0x3aa86a, 0x8a5ad0, 0xf29ab8, 0xf0f0f0];
export const BANNER = 'HAPPY RETIREMENT GARY!';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Which way an item at x, z would turn to face the eye, and how far it's turned from that.
const eyeYaw = (it) => Math.atan2(-it.x, -it.z);
const offEye = (it) => wrap(eyeYaw(it) - it.rot);

export function generate(seed, level = 0) {
	const r = rng(seed);
	const pick = (a) => a[Math.floor(r() * a.length)];
	const items = [];
	let next = 1;
	const openings = [[], [], []];
	const faces = level >= 2 ? CALM.concat(ODD.slice(0, level >= 3 ? 7 : 3)) : CALM;
	const sash = pick(SASHES);

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
	const guest = (pose, extra = {}) => makePerson(r, Object.assign({ pose, faces }, extra));
	const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

	for (let wall = 0; wall < 3; wall++) {
		/* the far wall: a corridor out, a door, the party's set pieces */
		const uc = pick(wall === 1 ? [-4.2, -3.6, 3.6, 4.2] : [-4.2, -2.4, 2.4, 4.2, 3.6]);
		openings[wall].push({ u: uc, w: 1.8 });
		const slots = [];
		for (let u = -R + 0.8; u <= R - 0.8 + 1e-6; u += 1.2) if (Math.abs(u - uc) > 1.55) slots.push(u);
		const used = new Set();
		const take = (ok = () => true) => { const u = slots.slice().sort(() => r() - 0.5).find((s) => !used.has(s) && ok(s)); used.add(u); return u; };
		const away = (u, from, gap) => Math.abs(u - from) > gap;

		if (wall === 1) {
			// the banner, the cake, Gary's photo, the lectern, and Gary
			addW('banner', 1, 0, R, 0, { text: BANNER }, { y: 2.22 });
			addW('cake', 1, -1.5, 5.7, 0, {}, { r: 0.5 });
			addW('portrait', 1, 1.5, 6.2, -0.15, { expr: EXPR.smile }, { r: 0.45 });
			addW('lectern', 1, 0.2, 6.3, 0.1, {}, { r: 0.4 });
			const gary = guest('stand', { expr: EXPR.smile });
			Object.assign(gary, { gary: true, glasses: true, h: 1.72 });
			Object.assign(gary.outfit, { style: 4, skin: 0xe8b896, hair: 0x9a9a98, shirt: 0xf2f2ee, tie: 0xa82a2a, jacket: 0x2c3038, sleeve: 0.74, skirt: false });
			const gp = wallPoint(1, -0.5, 5.0);
			add('person', gp.x, gp.z, wallYaw(1) + 0.25, gary, { wall: 1, r: 0.35 });
			for (const s of slots) if (Math.abs(s) < 2.8) used.add(s);
		} else {
			// the buffet on the left, the drinks on the right, against the wall
			const u = take((s) => Math.abs(s) < 3.5 && away(s, uc, 2.6));
			if (u !== undefined) {
				const type = wall === 0 ? 'buffet' : 'drinks';
				const t = addW(type, wall, u, R - 0.5, 0, { seed: Math.floor(r() * 1e6), punch: 0xc8304a, skirt: sash }, { r: 1.1 });
				for (const s of slots) if (Math.abs(s - u) < 1.3) used.add(s);
				// someone helping themselves
				if (r() < 0.75) {
					const p = wallPoint(wall, u + (r() - 0.5) * 0.8, R - 1.25);
					add('person', p.x, p.z, facing(p, t) + (r() - 0.5) * 0.3, guest('reach'), { wall, r: 0.35 });
				}
			}
		}

		// a door, with an exit sign over it
		const du = take((s) => away(s, uc, 1.5));
		if (du !== undefined) {
			addW('door', wall, du, R, 0, { open: false, color: pick([0x6a4a2e, 0x7a5636]) }, { r: 0.5 });
			if (wall === 1 || r() < 0.4) addW('exitSign', wall, du, R, 0, {}, { y: 2.35 });
		}
		// against the wall: a plant, a coat stand, a bunch of balloons
		for (const type of ['plant', 'coatStand', 'balloons'].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2))) {
			const u = take();
			if (u === undefined) break;
			addW(type, wall, u + (r() - 0.5) * 0.3, R - 0.45, 0, propsFor(type, r), { r: 0.42 });
		}
		// hotel art on the side walls, and the clock on the right one
		const arts = ['sunset', 'peak', 'tree', 'light'].sort(() => r() - 0.5);
		const hung = slots.filter((u) => du === undefined || Math.abs(u - du) > 0.8).sort(() => r() - 0.5);
		if (wall !== 1) for (let i = 0; i < 2 && i < hung.length; i++) addW('poster', wall, hung[i], R, 0, { variant: arts[i] }, { y: 1.65 });
		if (wall === 2 && hung.length > 2) addW('clock', wall, hung[2], R, 0, { h: 9, m: 15 }, { y: 2.4 });

		/* a round table in the middle distance, some of its chairs taken */
		for (let tries = 0; tries < 20; tries++) {
			const d = 3.7 + r() * 0.9;
			const u = (r() - 0.5) * 2.2;
			const tp = wallPoint(wall, u, d);
			if (!free(tp.x, tp.z, 1.4)) continue;
			add('roundTable', tp.x, tp.z, r() * 6, { seed: Math.floor(r() * 1e6), flowers: pick([0xd04a6a, 0xe88a3a, 0x8a5ad0]) }, { wall, r: 1.25 });
			const n = 5 + Math.floor(r() * 2);
			const a0 = r() * Math.PI * 2;
			const sitters = 1 + Math.floor(r() * 3);
			let sat = 0;
			for (let i = 0; i < n; i++) {
				const a = a0 + i / n * Math.PI * 2;
				const cx = tp.x + Math.sin(a) * 0.95, cz = tp.z + Math.cos(a) * 0.95;
				const rot = facing({ x: cx, z: cz }, tp);
				const chair = add('banquetChair', cx, cz, rot, { color: sash }, { wall });
				// sit people where they'll be seen: the far side first
				const far = Math.hypot(cx, cz) > Math.hypot(tp.x, tp.z);
				if (sat < sitters && (far || r() < 0.3)) {
					chair.props.taken = true;
					add('person', cx, cz, rot, guest(r() < 0.5 ? 'slump' : 'sit'), { wall });
					sat++;
				}
			}
			break;
		}

		/* guests standing about, making small talk in twos and threes */
		for (let group = 0; group < 2; group++) {
			for (let tries = 0; tries < 30; tries++) {
				const d = 2.8 + r() * 3;
				const u = (r() * 2 - 1) * (0.7 * d - 0.6);
				const c = wallPoint(wall, u, d);
				if (!free(c.x, c.z, 0.85)) continue;
				const n = group === 0 ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
				const a0 = r() * Math.PI * 2;
				for (let i = 0; i < n; i++) {
					const a = a0 + i / n * Math.PI * 2 + (r() - 0.5) * 0.4;
					const p = { x: c.x + Math.sin(a) * 0.5, z: c.z + Math.cos(a) * 0.5 };
					add('person', p.x, p.z, facing(p, c) + (r() - 0.5) * 0.4, guest('stand'), { wall, r: 0.3 });
				}
				break;
			}
		}

		/* a bunch of balloons out in the room */
		for (let tries = 0; tries < 20; tries++) {
			const d = 2.8 + r() * 3;
			const u = (r() * 2 - 1) * (0.7 * d - 0.4);
			const p = wallPoint(wall, u, d);
			if (!free(p.x, p.z, 0.4)) continue;
			add('balloons', p.x, p.z, wallYaw(wall), propsFor('balloons', r), { wall, r: 0.3 });
			break;
		}
	}

	/* the ceiling: a grid of panels, all on */
	for (let a = 0; a < 6; a++) {
		for (let b = 0; b < 6; b++) {
			const x = -6.3 + 2.4 * a;
			const z = -6.0 + 2.4 * b;
			if (z > 1.5) continue;              // behind the players: unseen
			add('light', x, z, 0, { state: 'on', seed: a * 7 + b }, { y: CEIL });
		}
	}

	return { seed, items, openings, next };
}

function propsFor(type, r) {
	const pick = (a) => a[Math.floor(r() * a.length)];
	if (type === 'balloons') {
		const n = 3 + Math.floor(r() * 3);
		return { seed: Math.floor(r() * 1e6), colors: Array.from({ length: n }, () => pick(BALLOONS)) };
	}
	return { seed: Math.floor(r() * 1e6), pot: 0x7a6a4a, n: 2 + Math.floor(r() * 2), coat: r() < 0.7 ? pick([0x3b3330, 0x6a2a2a, 0x2a3a5a]) : 0 };
}

// Which wall's camera looks toward x, z.
export function wallOf(x, z) {
	if (-x >= Math.abs(z)) return 0;
	if (x >= Math.abs(z)) return 2;
	return 1;
}

const clone = (o) => JSON.parse(JSON.stringify(o));

/*
 * Copy a layout with up to `count` weird differences, as candidates in order
 * of preference (more than needed: the game drops any it can't see).
 * Returns { layout, diffs }, each diff { id, kind, itemId, wall, label },
 * plus `added` (a new item), `gone` (look for it upstairs) or `head` (ring
 * the head, not the whole body). `level` 0..3: later levels get stranger,
 * and quieter about it.
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
		return d > 2.4 && d < R - 0.5 && Math.abs(u) < 0.75 * d - 0.3;
	};
	const guest = (it) => it.type === 'person' && !it.flip && it.props.balloon == null && !it.props.backwards;
	const standing = (it) => guest(it) && ['stand', 'reach'].includes(it.props.pose) && !it.lean;
	const faceShows = (it) => guest(it) && Math.abs(wrap(offEye(it) - (it.props.head || 0))) < 1.0 && !WEIRD.includes(it.props.expr);

	// Every kind of difference: from which level, how likely, which items it can apply to, and the change.
	const KINDS = {
		float: {
			weight: 2.5,
			targets: (w) => byWall(w, guest),
			apply(it) { it.y += 0.55 - 0.25 * subtle; return 'FLOATING'; },
		},
		giant: {
			weight: 1.5,
			targets: (w) => byWall(w, standing),
			apply(it) {
				const big = r() < 0.5;
				it.props.h = big ? 2.55 - 0.3 * subtle : 0.8 + 0.3 * subtle;
				return big ? 'GIANT' : 'TINY';
			},
		},
		twin: {
			weight: 1.5,
			targets: (w) => byWall(w, standing),
			apply(it) {
				for (const s of [1, -1]) {
					const x = it.x + Math.cos(it.rot) * 0.62 * s;
					const z = it.z - Math.sin(it.rot) * 0.62 * s;
					if (!inView(it.wall, x, z) || !free(x, z, 0.3, it)) continue;
					const twin = Object.assign(clone(it), { id: next++, x, z, r: 0.3 });
					items.push(twin);
					return { label: 'TWINS', item: twin };
				}
				return null;
			},
		},
		skin: {
			weight: 1.5,
			targets: (w) => byWall(w, guest),
			apply(it) {
				const [colour, label] = pick([[0x4a8ae8, 'TURNED BLUE'], [0x6ac04a, 'TURNED GREEN'], [0x9a5ad8, 'TURNED PURPLE'], [0xb8c4cc, 'TURNED TO STONE']]);
				const o = it.props.outfit;
				o.skin = colour;
				if (label === 'TURNED TO STONE') Object.assign(o, { shirt: colour, legs: colour, hair: colour, shoes: colour, tie: o.tie != null ? colour : null, jacket: o.jacket != null ? colour : null });
				return label;
			},
		},
		weirdFace: {
			weight: 2,
			head: true,
			targets: (w) => byWall(w, faceShows),
			apply(it) {
				const [expr, label] = pick([[EXPR.cyclops, 'ONE EYE'], [EXPR.threeEyes, 'THREE EYES'], [EXPR.hypnotised, 'HYPNOTISED'], [EXPR.upsideDown, 'UPSIDE-DOWN FACE']]);
				it.props.expr = expr;
				return label;
			},
		},
		wave: {
			weight: 1.3,
			targets: (w) => byWall(w, (it) => standing(it) && it.props.pose === 'stand'),
			apply(it) {
				it.props.pose = 'wave';
				it.props.head = Math.max(-1.3, Math.min(1.3, offEye(it)));
				it.props.expr = EXPR.grin;
				return 'WAVING AT YOU';
			},
		},
		balloonHead: {
			weight: 1.5,
			head: true,
			targets: (w) => byWall(w, guest),
			apply(it) { it.props.balloon = pick(BALLOONS.slice(0, 6)); return 'BALLOON HEAD'; },
		},
		cake: {
			weight: 3,
			targets: (w) => byWall(w, (it) => it.type === 'cake'),
			apply(it) {
				it.props.someone = makePerson(r, { expr: EXPR.beam });
				return 'SOMEONE IN THE CAKE';
			},
		},
		banner: {
			weight: 3,
			targets: (w) => byWall(w, (it) => it.type === 'banner'),
			apply(it) {
				const texts = [
					['HAPPY RETIREMENT HARRY!', 'HAPPY BIRTHDAY GARY!', 'HAPPY RETIREMENT GARY?', 'BON VOYAGE GARY!'],
					['GARY IS BEHIND YOU', 'NOBODY LEAVES', 'GARY GARY GARY GARY', 'WHO IS GARY?'],
					['HAPPY RETIREMENT YOU!', 'YOU ARE GARY NOW', 'SMILE FOR GARY', 'STAY FOR CAKE'],
				][Math.min(2, Math.floor(level / 1.4))];
				it.props.text = pick(texts);
				return 'THE BANNER';
			},
		},
		balloonFace: {
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'balloons'),
			apply(it) {
				it.props.face = Math.floor(r() * it.props.colors.length);
				it.props.expr = pick([EXPR.smile, EXPR.stare, EXPR.beam, EXPR.wink]);
				return 'BALLOON FACE';
			},
		},
		chairUp: {
			weight: 1.2,
			targets: (w) => byWall(w, (it) => it.type === 'banquetChair' && !it.props.taken),
			apply(it) {
				if (r() < 0.6) { it.y = CEIL; it.flip = true; return 'CHAIR ON THE CEILING'; }
				it.y = 0.7;
				return 'FLOATING CHAIR';
			},
		},
		// from the second round on
		ceiling: {
			from: 1,
			weight: 1.5,
			targets: (w) => byWall(w, standing),
			apply(it) { it.y = CEIL; it.flip = true; return 'ON THE CEILING'; },
		},
		stare: {
			from: 1,
			weight: 2,
			head: true,
			targets: (w) => byWall(w, (it) => guest(it) && Math.abs(offEye(it)) > 1.0),
			apply(it) {
				it.props.head = offEye(it);
				it.props.expr = EXPR.stare;
				return 'LOOKING AT YOU';
			},
		},
		backwards: {
			from: 1,
			weight: 1.5,
			head: true,
			targets: (w) => byWall(w, (it) => guest(it) && (Math.abs(offEye(it)) < 0.9 || Math.abs(offEye(it)) > 2.3)),
			apply(it) { it.props.backwards = true; return 'FACE ON BACKWARDS'; },
		},
		lean: {
			from: 1,
			weight: 1,
			targets: (w) => byWall(w, standing),
			apply(it) { it.lean = (r() < 0.5 ? -1 : 1) * (0.5 - 0.2 * subtle); return 'LEANING'; },
		},
		wall: {
			from: 1,
			weight: 1,
			targets: (w) => byWall(w, (it) => standing(it) && Math.abs(offEye(it)) < 1.0),
			apply(it) { it.rot = eyeYaw(it) + Math.PI; it.props.head = 0; return 'FACING THE WALL'; },
		},
		vanish: {
			from: 1,
			weight: 1,
			gone: true,
			targets: (w) => byWall(w, (it) => guest(it) && !it.props.gary),
			apply(it) { items.splice(items.indexOf(it), 1); return 'VANISHED'; },
		},
		portrait: {
			from: 1,
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'portrait'),
			apply(it) { it.props.expr = pick([EXPR.stare, EXPR.blank, EXPR.beam, EXPR.cyclops, EXPR.angry]); return 'THE PHOTO'; },
		},
		punch: {
			from: 1,
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'drinks'),
			apply(it) { it.props.glow = true; it.props.punch = pick([0x6aff4a, 0x4af0ff, 0xff4ad0]); return 'THE PUNCH'; },
		},
		mood: {
			from: 2,
			weight: 1.2,
			head: true,
			targets: (w) => byWall(w, faceShows),
			apply(it) { it.props.expr = otherFace(it.props.expr, false, r); return 'FACE'; },
		},
		crasher: {
			from: 2,
			weight: 1.5,
			targets: (w) => (diffs.some((d) => d.kind === 'crasher') ? [] : [w]),
			apply(wall) {
				const o = lower.openings[wall][0];
				const p = wallPoint(wall, o.u + (r() - 0.5) * 0.5, R + 2.5 + r() * 3);
				const it = { id: next++, type: 'person', x: p.x, z: p.z, y: 0, rot: wallYaw(wall), r: 0, wall, props: makePerson(r, { expr: EXPR.stare }) };
				it.props.h = 1.95;
				items.push(it);
				return { label: 'WHO INVITED THEM?', item: it };
			},
		},
	};

	const walls = [0, 1, 2].sort(() => r() - 0.5);
	let failures = 0;
	for (let i = 0; diffs.length < count && failures < 60; i++) {
		const wall = walls[i % 3];
		const options = Object.keys(KINDS).filter((k) => (KINDS[k].from || 0) <= level && KINDS[k].targets(wall).length);
		if (!options.length) { failures++; continue; }
		// don't pile up the same kind
		const weights = options.map((k) => KINDS[k].weight / (1 + 3 * diffs.filter((d) => d.kind === k).length));
		let x = r() * weights.reduce((a, b) => a + b, 0);
		let kind = options[0];
		for (let j = 0; j < options.length; j++) { x -= weights[j]; if (x <= 0) { kind = options[j]; break; } }
		const K = KINDS[kind];
		const target = pick(K.targets(wall));
		const result = K.apply(target);
		if (!result) { failures++; continue; }
		if (typeof result === 'string') {
			touched.add(target.id);
			diffs.push({ id: diffs.length, kind, itemId: target.id, wall, label: result, head: !!K.head, gone: !!K.gone });
		} else {
			touched.add(result.item.id);
			diffs.push({ id: diffs.length, kind, itemId: result.item.id, wall, label: result.label, added: true });
		}
	}
	return { layout: lower, diffs };
}
