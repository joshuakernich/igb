/*
 * Small Talk: the party, as plain data, at each phase of the night, and the
 * weird things that happen to it between one blink and the next.
 *
 * A layout is a list of items, each a prop placed in the room:
 *   { id, type, wall, x, y, z, rot, props, r, flip, lean, tip }
 * x/z are metres from the room's centre (where the players' eye is), rot is
 * the yaw, r a footprint radius for keeping props apart, and props whatever
 * the model needs. `wall` is which wall's camera sees it (0 left, 1 front,
 * 2 right). flip hangs it upside down from y (the ceiling), lean tips it
 * sideways, tip tips it over forwards.
 *
 * It's Gary's leaving do in a hired function room: round tables, a buffet,
 * the punch, the cake, a banner, balloons. generate(seed, phase) sets the
 * room as it is at one point in the night (vignettes.js), from the tables
 * going out to the ruins: who's there, what everyone's doing, and the
 * scene's cast on the front wall, on their tracks. The middle of the front
 * wall is kept clear for the scene.
 *
 * mutate() makes it weird: never a chair nudged, always something nobody
 * could miss once they'd seen it (a guest floating, a face on the back of a
 * head, twins). More candidates than needed, spread round the walls, so the
 * game can check each one is actually visible. The cast is left alone.
 */
import { CEIL, rng, wallPoint, wallYaw } from './models.js';
import { makePerson, otherFace, EXPR, CALM, ODD, WEIRD, trackAt } from './people.js';
import { CAST, PHASES } from './vignettes.js';

export const R = 7.2;            // the room's half-width: 12 ceiling tiles
export const DOOR_U = -3.9;      // the corridor in from the front wall
// The front wall's scene and set pieces are written as if the stage ran up
// to the wall; this brings them a metre nearer the eye (all but what's at
// the wall itself, or in the corridor).
const PULL = 1.1;
export const near = (d) => (d >= 6.5 ? d : Math.max(2.5, d - PULL));

const SASHES = [0xc23a5a, 0x3a5a8a, 0xd0a020, 0x3a8a5a];
const BALLOONS = [0xe8445a, 0xf2c22e, 0x3a8ad8, 0x3aa86a, 0x8a5ad0, 0xf29ab8, 0xf0f0f0];
export const BANNER = 'HAPPY RETIREMENT GARY!';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Which way an item at x, z would turn to face the eye, and how far it's turned from that.
const eyeYaw = (it) => Math.atan2(-it.x, -it.z);
const offEye = (it) => wrap(eyeYaw(it) - it.rot);
const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
// The front wall's stage: kept for the scene (and the corridor it comes in by).
function onStage(x, z, pad = 0) {
	if (z > -2.6) return false;
	const d = -z, u = x;
	return d > 2.3 - pad && u > -5.0 - pad && u < 3.5 + pad && Math.abs(u) < d + 1;
}

// What everyone else is doing, at each phase: the acts groups pick from, how
// many groups, what the seated do, and whether some are lying about.
const CROWD = [
	/* setup */     { groups: [1, 1], acts: ['carry', 'reach', 'point', 'sweep'], seated: 0, sit: [] },
	/* arrivals */  { groups: [2, 3], acts: ['talk', 'listen', 'shake', 'wave', 'idle'], seated: 1, sit: ['sit', 'sit-talk'] },
	/* mingling */  { groups: [2, 3], acts: ['talk', 'listen', 'drink', 'laugh', 'drink'], seated: 1, sit: ['sit-talk', 'sit'] },
	/* buffet */    { groups: [2, 2], acts: ['eat', 'eat', 'talk', 'drink'], seated: 3, sit: ['sit-eat', 'sit-eat', 'sit-talk'] },
	/* speeches */  { groups: [2, 3], acts: ['listen', 'listen', 'drink'], seated: 2, sit: ['sit', 'sit-listen'], face: 'lectern' },
	/* dancing */   { groups: [2, 3], acts: ['dance', 'dance', 'dance', 'drink'], seated: 1, sit: ['sit-talk', 'sit-sway'] },
	/* drunk */     { groups: [2, 2], acts: ['sway', 'dance', 'laugh', 'sway'], seated: 2, sit: ['sit-sleep', 'sit-sway'], lying: 1, onTable: true },
	/* fire */      { groups: [2, 2], acts: ['panic', 'panic', 'panic', 'eat'], seated: 1, sit: ['sit-eat'], lying: 1 },
	/* aftermath */ { groups: [0, 0], acts: [], seated: 1, sit: ['sit-sleep'], lying: 4 },
];

export function generate(seed, phase = 0) {
	const r = rng(seed);
	const pick = (a) => a[Math.floor(r() * a.length)];
	const P = PHASES[Math.min(phase, PHASES.length - 1)];
	const C = CROWD[Math.min(phase, CROWD.length - 1)];
	const items = [];
	let next = 1;
	const openings = [[], [], []];
	const faces = phase >= 6 ? CALM.concat(ODD.slice(0, 4)) : CALM;
	const sash = pick(SASHES);
	const lectern = wallPoint(1, 2.6, near(6.3));
	const burnt = phase >= 8, burning = phase === 7, messy = phase >= 6;

	function add(type, x, z, rot, props = {}, opts = {}) {
		const item = Object.assign({ id: next++, type, x, z, y: 0, rot, props, r: 0, wall: wallOf(x, z) }, opts);
		items.push(item);
		return item;
	}
	// Place by wall coordinates: u across, d out, a turned from facing the eye.
	function addW(type, wall, u, d, a, props, opts = {}) {
		const p = wallPoint(wall, u, d);
		return add(type, p.x, p.z, wallYaw(wall) + a, props, Object.assign({ wall }, opts));
	}
	const free = (x, z, rad) => !onStage(x, z, rad) && items.every((it) => !it.r || Math.hypot(it.x - x, it.z - z) > it.r + rad);
	const guest = (act, extra = {}) => makePerson(r, Object.assign({ act, faces }, extra));
	// somewhere clear out in the room, facing the eye's way: { x, z, wall } or null
	function spot(wall, rad, dMin = 2.5, dMax = 5.0) {
		for (let tries = 0; tries < 40; tries++) {
			const d = dMin + r() * (dMax - dMin);
			const u = (r() * 2 - 1) * (0.72 * d - 0.5);
			const p = wallPoint(wall, u, d);
			if (free(p.x, p.z, rad)) return p;
		}
		return null;
	}

	/* ---------- the front wall: the banner, the cake, the photo, the lectern ---------- */
	openings[1].push({ u: DOOR_U, w: 1.8 });
	addW('banner', 1, 0, R, phase === 0 ? 0.05 : 0, { text: BANNER, sag: phase === 0, burning, burnt }, { y: 2.22 });
	addW('cake', 1, -1.5, near(5.7), 0, { fire: burning, wrecked: burnt }, { r: 0.5 });
	addW('portrait', 1, 4.4, near(6.4), -0.3, { expr: burnt ? EXPR.dead : EXPR.smile }, { r: 0.45, tip: burnt ? -0.25 : 0 });
	addW('lectern', 1, 2.6, near(6.3), 0.1, {}, { r: 0.4, lean: burnt ? 1.45 : 0 });
	addW('radio', 1, -5.7, 6.4, 0.35, {}, { r: 0.35 });
	if (phase === 0) {
		addW('ladder', 1, 2.4, 6.85, 0, {}, {});
		addW('boxes', 1, -0.6, 6.5, 0.3, { seed: 7 }, {});
	}
	if (phase === 3) addW('buffet', 1, 0.6, near(5.6), 0, { seed: Math.floor(r() * 1e6), skirt: sash }, {});
	if (phase === 6) addW('roundTable', 1, 1.2, near(5.0), 0, { seed: 3, bare: true }, {});
	if (phase === 5) add('discoBall', 0, -3.2, 0, {}, { y: CEIL - 0.05, wall: 1 });

	/* ---------- the scene's cast, on their tracks ---------- */
	const tracks = {};
	for (const [name, keys] of Object.entries(P.cast)) {
		tracks[name] = keys.map(function ([t, u, d, act, look, opts = {}]) {
			const p = wallPoint(1, u, near(d));
			return { t, x: p.x, z: p.z, y: opts.y || 0, act, look, fire: !!opts.fire };
		});
	}
	for (const [name, track] of Object.entries(tracks)) {
		for (const k of track) {
			const target = k.look === 'eye' ? { x: 0, z: 0 }
				: k.look === 'wall' ? { x: k.x, z: k.z - 5 }
				: Array.isArray(k.look) ? wallPoint(1, k.look[0], near(k.look[1]))
				: tracks[k.look] ? trackAt(tracks[k.look], k.t) : { x: 0, z: 0 };
			k.yaw = facing(k, target);
		}
		const looks = CAST[name].looks;
		const props = Object.assign({ seed: name.length * 977 + phase * 31, act: track[0].act, star: name, track, fire: track.some((k) => k.fire) },
			JSON.parse(JSON.stringify(looks)));
		add('person', track[0].x, track[0].z, track[0].yaw, props, { wall: 1 });
		// a chair for anyone in the scene who sits
		if (track[0].act.startsWith('sit-')) add('banquetChair', track[0].x, track[0].z, track[0].yaw, { color: sash, taken: true }, { wall: 1 });
	}

	/* ---------- the walls ---------- */
	for (let wall = 0; wall < 3; wall++) {
		if (wall !== 1) openings[wall].push({ u: pick([-4.2, -2.4, 2.4, 4.2, 3.6]), w: 1.8 });
		const uc = openings[wall][0].u;
		const slots = [];
		for (let u = -R + 0.8; u <= R - 0.8 + 1e-6; u += 1.2) if (Math.abs(u - uc) > 1.55 && (wall !== 1 || u > 3.6 || u < -6.3)) slots.push(u);
		const used = new Set();
		const take = (ok = () => true) => { const u = slots.slice().sort(() => r() - 0.5).find((s) => !used.has(s) && ok(s)); used.add(u); return u; };
		const away = (u, from, gap) => Math.abs(u - from) > gap;

		if (wall !== 1) {
			// the buffet on the left, the drinks on the right, against the wall
			const u = take((s) => Math.abs(s) < 3.5 && away(s, uc, 2.6));
			if (u !== undefined) {
				const type = wall === 0 ? 'buffet' : 'drinks';
				const t = addW(type, wall, u, R - 0.5, 0, { seed: Math.floor(r() * 1e6), punch: 0xc8304a, skirt: sash, empty: phase === 0 || burnt }, { r: 1.1, tip: burnt && wall === 0 ? 0.25 : 0 });
				for (const s of slots) if (Math.abs(s - u) < 1.3) used.add(s);
				if (burning) addW('fire', wall, u + (r() - 0.5), R - 0.5, 0, { size: 0.9, seed: wall }, { y: 0.76 });
				// someone helping themselves
				if (phase >= 1 && phase <= 6 && r() < 0.8) {
					const p = wallPoint(wall, u + (r() - 0.5) * 0.8, R - 1.25);
					add('person', p.x, p.z, facing(p, t) + (r() - 0.5) * 0.3, guest(phase === 3 ? 'reach' : 'drink'), { wall, r: 0.35 });
				}
			}
		}

		// a door, with an exit sign over it
		const du = take((s) => away(s, uc, 1.5));
		if (du !== undefined) {
			addW('door', wall, du, R, 0, { open: phase >= 7, color: pick([0x6a4a2e, 0x7a5636]) }, { r: 0.5 });
			if (wall === 1 || r() < 0.4) addW('exitSign', wall, du, R, 0, {}, { y: 2.35 });
		}
		// against the wall: a plant, a coat stand, a bunch of balloons
		for (const type of ['plant', 'coatStand', 'balloons'].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2))) {
			const u = take();
			if (u === undefined) break;
			const props = propsFor(type, r, phase);
			addW(type, wall, u + (r() - 0.5) * 0.3, R - 0.45, 0, props, { r: 0.42, lean: burnt && type !== 'balloons' ? (r() < 0.5 ? 1.4 : 0) : 0 });
		}
		// hotel art on the side walls, and the clock on the right one
		const arts = ['sunset', 'peak', 'tree', 'light'].sort(() => r() - 0.5);
		const hung = slots.filter((u) => du === undefined || Math.abs(u - du) > 0.8).sort(() => r() - 0.5);
		if (wall !== 1) for (let i = 0; i < 2 && i < hung.length; i++) addW('poster', wall, hung[i], R, burnt ? 0 : 0, { variant: arts[i] }, { y: 1.65, lean: burnt && r() < 0.5 ? 0.3 : 0 });
		if (wall === 2 && hung.length > 2) addW('clock', wall, hung[2], R, 0, { h: Number(P.clock.split(':')[0]) % 12, m: Number(P.clock.split(':')[1].slice(0, 2)) }, { y: 2.4 });

		if (wall === 1) continue;

		/* a round table in the middle distance, some of its chairs taken */
		const tp = spot(wall, 1.4, 3.3, 4.0);
		if (tp) {
			const tipped = burnt && r() < 0.7;
			add('roundTable', tp.x, tp.z, r() * 6, { seed: Math.floor(r() * 1e6), flowers: pick([0xd04a6a, 0xe88a3a, 0x8a5ad0]), bare: phase === 0 || tipped, messy }, { wall, r: 1.25, tip: tipped ? 1.45 : 0, y: tipped ? 0.8 : 0 });
			if (burning && r() < 0.6) add('fire', tp.x, tp.z, 0, { size: 1.1, seed: wall + 4 }, { wall, y: 0.76 });
			const n = 5 + Math.floor(r() * 2);
			const a0 = r() * Math.PI * 2;
			let sat = 0;
			for (let i = 0; i < n; i++) {
				const a = a0 + i / n * Math.PI * 2;
				const cx = tp.x + Math.sin(a) * 0.95, cz = tp.z + Math.cos(a) * 0.95;
				const rot = facing({ x: cx, z: cz }, tp);
				const fallen = (messy && r() < 0.3) || (burnt && r() < 0.7);
				const chair = add('banquetChair', cx, cz, rot, { color: sash }, { wall, lean: fallen ? (r() < 0.5 ? -1 : 1) * 1.45 : 0 });
				if (phase === 0) chair.props.taken = true;   // (no one yet; nor any weirdness on the stacked-away chairs)
				// sit people where they'll be seen: the far side first
				const far = Math.hypot(cx, cz) > Math.hypot(tp.x, tp.z);
				if (!fallen && sat < C.seated && (far || r() < 0.3)) {
					chair.props.taken = true;
					const act = pick(C.sit);
					add('person', cx, cz, rot, guest(act, { pose: 'sit' }), { wall });
					sat++;
				}
			}
			// someone dancing on the table
			if (C.onTable && r() < 0.6) add('person', tp.x, tp.z, r() * 6, guest('dance'), { wall, y: 0.77 });
		}

		/* guests standing about, in twos and threes */
		for (let group = 0; group < C.groups[wall === 0 ? 0 : 1] + (wall === 1 ? 0 : 0); group++) {
			const c = spot(wall, 0.85);
			if (!c) continue;
			const n = phase === 0 ? 1 : group === 0 ? 2 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
			const a0 = r() * Math.PI * 2;
			const act = pick(C.acts);
			for (let i = 0; i < n; i++) {
				const a = a0 + i / n * Math.PI * 2 + (r() - 0.5) * 0.4;
				const p = { x: c.x + Math.sin(a) * (act === 'shake' ? 0.4 : 0.5), z: c.z + Math.cos(a) * (act === 'shake' ? 0.4 : 0.5) };
				let rot = facing(p, c) + (r() - 0.5) * 0.4;
				if (C.face === 'lectern') rot = facing(p, lectern) + (r() - 0.5) * 0.3;
				const each = act === 'shake' && n !== 2 ? 'talk' : act === 'talk' && i > 0 ? pick(['listen', 'drink', 'laugh']) : act;
				const props = guest(each);
				if (C.face === 'lectern') props.cue = { from: P.clap[0], to: P.clap[1], act: 'clap' };
				add('person', p.x, p.z, rot, props, { wall, r: 0.3 });
			}
		}

		/* people lying about: asleep, or worse */
		for (let i = 0; i < (C.lying || 0); i++) {
			const p = spot(wall, 0.9, 2.5, 5.0);
			if (!p) continue;
			add('person', p.x, p.z, r() * 6, guest(phase >= 8 ? 'dead' : 'sleep', { pose: 'lie', expr: phase >= 7 ? EXPR.dead : EXPR.sleepy }), { wall, r: 0.6 });
		}

		/* a bunch of balloons out in the room */
		const bp = spot(wall, 0.4);
		if (bp) add('balloons', bp.x, bp.z, wallYaw(wall), propsFor('balloons', r, phase), { wall, r: 0.3 });

		/* the mess, the fire, the smoke */
		if (messy) for (let i = 0; i < 2 + phase - 6; i++) {
			const p = spot(wall, 0.2, 2.4, 6.4);
			if (p) add(burnt ? 'rubble' : 'litter', p.x, p.z, r() * 6, { seed: Math.floor(r() * 1e6) }, { wall });
		}
		if (burnt) for (let i = 0; i < 3; i++) {
			const p = spot(wall, 0.1, 2.6, 6.5);
			if (p) add('stain', p.x, p.z, r() * 6, { seed: Math.floor(r() * 1e6), size: 1.2 + r(), aspect: 0.8, scorch: true }, { wall });
		}
		if (burning || burnt) {
			for (let i = 0; i < (burnt ? 2 : 1); i++) {
				const p = spot(wall, 0.3, 3, 6.5);
				if (p) add('fire', p.x, p.z, 0, { size: burnt ? 0.45 : 0.8, seed: i + wall * 3 }, { wall });
			}
		}
	}
	if (burning || burnt) {
		// smoke under the ceiling, and on the front wall's banner
		for (let i = 0; i < 7; i++) add('smoke', -6 + r() * 12, -6.5 + r() * 6, 0, { seed: i, size: 2 + r() * 2, dark: burnt }, { y: CEIL - 0.35 - r() * 0.4 });
		if (burnt) {
			addW('stain', 1, -1.5, near(5.4), 0, { seed: 5, size: 2.6, aspect: 0.8, scorch: true });
			addW('fire', 1, -1.6, near(5.9), 0, { size: 0.5, seed: 9 }, { y: 0.3 });
		}
	}

	/* the ceiling: a grid of panels; after the fire, some dead */
	for (let a = 0; a < 6; a++) {
		for (let b = 0; b < 6; b++) {
			const x = -6.3 + 2.4 * a;
			const z = -6.0 + 2.4 * b;
			if (z > 1.5) continue;              // behind the players: unseen
			const state = burnt ? (r() < 0.5 ? 'off' : r() < 0.4 ? 'flicker' : 'on') : 'on';
			add('light', x, z, 0, { state, seed: a * 7 + b }, { y: CEIL });
		}
	}

	return { seed, phase, items, openings, next };
}

function propsFor(type, r, phase) {
	const pick = (a) => a[Math.floor(r() * a.length)];
	if (type === 'balloons') {
		const n = phase >= 8 ? 1 : 3 + Math.floor(r() * 3);
		return { seed: Math.floor(r() * 1e6), colors: Array.from({ length: n }, () => pick(BALLOONS)) };
	}
	return { seed: Math.floor(r() * 1e6), pot: 0x7a6a4a, n: 2 + Math.floor(r() * 2), coat: phase >= 1 && r() < 0.8 ? pick([0x3b3330, 0x6a2a2a, 0x2a3a5a]) : 0 };
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
	const phase = layout.phase || 0;

	const byWall = (wall, fn) => items.filter((it) => it.wall === wall && !touched.has(it.id) && fn(it));
	const free = (x, z, rad, except) => items.every((it) => it === except || !it.r || Math.hypot(it.x - x, it.z - z) > it.r + rad);
	const inView = (wall, x, z) => {
		const d = wall === 1 ? -z : Math.abs(x);
		const u = wall === 1 ? x : (wall === 0 ? -z : z);
		return d > 2.4 && d < R - 0.5 && Math.abs(u) < 0.75 * d - 0.3 && !onStage(x, z, 0.3);
	};
	const guest = (it) => it.type === 'person' && !it.props.star && !it.flip && it.props.balloon == null && !it.props.backwards;
	const lying = (it) => it.props.pose === 'lie';
	const standing = (it) => guest(it) && it.props.pose !== 'sit' && !lying(it) && !it.lean && !it.y;
	const faceShows = (it) => guest(it) && !lying(it) && Math.abs(wrap(offEye(it) - (it.props.head || 0))) < 1.0 && !WEIRD.includes(it.props.expr);
	const lock = (it, expr) => { it.props.expr = expr; it.props.exprLock = true; };

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
				lock(it, expr);
				return label;
			},
		},
		oddAct: {
			weight: 2,
			targets: (w) => byWall(w, standing),
			apply(it) {
				const options = [['dance', 'DANCING ALONE'], ['panic', 'PANICKING'], ['wave', 'WAVING AT YOU'], ['laugh', 'LAUGHING AT NOTHING'], ['clap', 'CLAPPING']]
					.filter(([act]) => act !== it.props.act && !CROWD[Math.min(phase, 8)].acts.includes(act));
				if (!options.length) return null;
				const [act, label] = pick(options);
				it.props.act = act;
				it.props.cue = null;
				if (act === 'wave') it.props.head = Math.max(-1.3, Math.min(1.3, offEye(it)));
				return label;
			},
		},
		balloonHead: {
			weight: 1.5,
			head: true,
			targets: (w) => byWall(w, (it) => guest(it) && !lying(it)),
			apply(it) { it.props.balloon = pick(BALLOONS.slice(0, 6)); return 'BALLOON HEAD'; },
		},
		cake: {
			weight: 3,
			targets: (w) => byWall(w, (it) => it.type === 'cake'),
			apply(it) {
				it.props.someone = makePerson(r, { expr: EXPR.beam, act: 'wave' });
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
				][Math.min(2, Math.floor(phase / 3))];
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
			targets: (w) => byWall(w, (it) => it.type === 'banquetChair' && !it.props.taken && !it.lean),
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
			targets: (w) => byWall(w, (it) => guest(it) && !lying(it) && Math.abs(offEye(it)) > 1.0),
			apply(it) {
				it.props.head = offEye(it);
				lock(it, EXPR.stare);
				return 'LOOKING AT YOU';
			},
		},
		backwards: {
			from: 1,
			weight: 1.5,
			head: true,
			targets: (w) => byWall(w, (it) => guest(it) && !lying(it) && (Math.abs(offEye(it)) < 0.9 || Math.abs(offEye(it)) > 2.3)),
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
			targets: (w) => byWall(w, guest),
			apply(it) { items.splice(items.indexOf(it), 1); return 'VANISHED'; },
		},
		portrait: {
			from: 1,
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'portrait'),
			apply(it) { it.props.expr = pick([EXPR.stare, EXPR.blank, EXPR.beam, EXPR.cyclops, EXPR.angry].filter((e) => e !== it.props.expr)); return 'THE PHOTO'; },
		},
		punch: {
			from: 1,
			weight: 1.5,
			targets: (w) => byWall(w, (it) => it.type === 'drinks' && !it.props.glow),
			apply(it) { it.props.glow = true; it.props.punch = pick([0x6aff4a, 0x4af0ff, 0xff4ad0]); return 'THE PUNCH'; },
		},
		mood: {
			from: 2,
			weight: 1.2,
			head: true,
			targets: (w) => byWall(w, faceShows),
			apply(it) { lock(it, otherFace(it.props.expr, false, r)); return 'FACE'; },
		},
		crasher: {
			from: 2,
			weight: 1.5,
			targets: (w) => (w === 1 || diffs.some((d) => d.kind === 'crasher') ? [] : [w]),
			apply(wall) {
				const o = lower.openings[wall][0];
				const p = wallPoint(wall, o.u + (r() - 0.5) * 0.5, R + 2.5 + r() * 3);
				const props = makePerson(r, { expr: EXPR.stare });
				props.h = 1.95;
				props.exprLock = true;
				const it = { id: next++, type: 'person', x: p.x, z: p.z, y: 0, rot: wallYaw(wall), r: 0, wall, props };
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
