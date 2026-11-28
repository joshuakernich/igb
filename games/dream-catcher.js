/*
 * Dream Catcher (10 minutes)
 *
 * A cute village at night. Everyone in it is asleep, and their dreams drift
 * up out of the cottages and hang glowing over the lanes. Catch them by
 * walking past: each one you catch follows you, like a snake's tail.
 *
 *   dreams       walk past one to catch it; it joins the end of your tail
 *   hourglasses  walk up to one to pour your whole tail in and bank it. The
 *                longer the tail, the bigger the bonus (CHAIN x1.5, x2, x3).
 *                The dream-glow fills the bottom bulb in each banker's colour
 *   stealing     run through someone else's tail: it's cut there, and every
 *                dream behind the cut is yours
 *   bumping      walk into a cottage, a hedge or a tree and your tail scatters
 *                back into the air (and you're dizzy for a moment)
 *   bridges      the front wall is Moonlight Square, where the hourglasses
 *                are. A bridge from its front-left corner leads into Willow
 *                Lane, on the left wall; one from its front-right corner into
 *                Bramble Row, on the right. They're full of cottages, so full of dreams, but
 *                they've no hourglass: bring the dreams home across a bridge
 *   showers      every so often one village has a DREAM SHOWER
 *
 * At the end the hourglasses flip over, the sun comes up, the lights go out,
 * the villagers wake and step outside, and the birds come.
 *
 * Drawn in 3D (three.js), after Temple of Coins: each wall shows one village,
 * mostly top-down through a camera pitched 60 degrees. The floor maps 1:1 to
 * the village you're in (px across, pz from the front wall), with the same
 * forgiving EDGE by each wall. The three villages are separate islands; you're
 * in one at a time. The bridges land in the room's two front corners: stand
 * in the front-left (or front-right) corner, the sweet spot at the seam,
 * and your catcher crosses into that side wall's village at the very same
 * spot on the floor. It's the same corner seen from both walls: top-left of
 * the square on the front wall, top-right of Willow Lane on the left wall
 * (top-left of Bramble Row on the right), each bridge running off toward
 * the seam. Step off the landing, then back on, to cross back. Seen from a side wall, that
 * village's columns run along the wall (left wall: pz from its left edge;
 * right wall: 1 - pz) and its rows run out from it (nearest the wall is the
 * top of the picture): the room's own axes, seen from that side.
 *
 * Input: px / pz only (pz is 1 at the front wall).
 */
import * as THREE from '../lib/three/three.module.min.js';
import { createWallComposer, canvasTexture, environmentFromShader, toScreen } from '../lib/three/walls.js';
import { mergeGeometries } from '../lib/three/addons/utils/BufferGeometryUtils.js';

IGB.register('dream-catcher', function DreamCatcher(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;
	const TITLE_FONT = 'Knewave';
	const FONT = 'Lexend';
	const INK = '#0c0a24';
	const MOON = '#ffe9a8';
	const LILAC = '#d6b8ff';

	/* ---------- tuning ---------- */

	const N = 16;                 // a village is N x N squares
	const SIZE = 12;              // world units across (the whole room)
	const CS = SIZE / N;
	const HALF = SIZE / 2;
	const EDGE = 0.12;            // this much of the room by each side wall is already the village's edge
	const EDGE_Z = 0.24;          // ...and by the front and back
	const LX = 40;                // how far apart the villages' islands are (the cameras never see each other's)
	const R = 0.2;                // a catcher's radius (for the cottages)
	const BONK_GRACE = 0.15;      // seconds against a cottage before it counts (tracking jitters)
	const DIZZY = 1.4;            // seconds dizzy after a bump
	const PICK_R = 0.44;          // how near a dream to catch it
	const CUT_R = 0.3;            // how near another's tail to cut it
	const CUT_SAFE = 1.2;         // seconds a cut tail can't be cut again
	const BANK_R = 1.1;           // how near an hourglass to bank
	const SEG = 0.36;             // the spacing of a tail
	const DREAM = 10, SWEET = 30; // what a dream is worth, and a golden sweet dream
	const SWEET_CHANCE = 0.12;
	const DREAM_EVERY = 9;        // seconds between a cottage's dreams (on average)
	const SHOWER_EVERY = 70;      // a dream shower this often
	const SHOWER_LEN = 14;
	const CHAINS = [[15, 3], [10, 2], [5, 1.5]];   // tail length: bonus multiplier

	/* ---------- the villages ---------- */
	// Hh/hh a cottage (2 x 2, H its top-left)   Gg/gg an hourglass (2 x 2)
	// # hedge   T tree   L lamp post   , flowers   B bridge (on the edge)
	// Columns run left to right across the room; row 0 is by the front wall.

	const MAPS = [
		{ name: 'WILLOW LANE', short: 'WILLOW', map: [
			'BB              ',
			'BB   Hh  Hh  Hh ',
			'     hh  hh  hh ',
			'  L    ,,    L  ',
			'T    T    T    T',
			'    Hh    Hh    ',
			'T   hh L  hh   T',
			' Hh             ',
			' hh    ,,       ',
			'T   Hh    Hh   T',
			'    hh L  hh    ',
			'  ,          ,  ',
			' Hh  T Hh  T Hh ',
			' hh    hh    hh ',
			'  L          L  ',
			'                ',
		] },
		{ name: 'MOONLIGHT SQUARE', short: 'SQUARE', map: [
			'BB            BB',
			'BB  Hh ,, Hh  BB',
			'    hh L  hh    ',
			'       Gg       ',
			' ##    gg    ## ',
			'    L      L    ',
			'T  Hh  ,,  Hh  T',
			'   hh      hh   ',
			'       TT       ',
			'    ,      ,    ',
			'T  Hh      Hh  T',
			'   hh  Gg  hh   ',
			' L     gg     L ',
			' ##          ## ',
			'    ,  TT  ,    ',
			'                ',
		] },
		{ name: 'BRAMBLE ROW', short: 'BRAMBLE', map: [
			'              BB',
			' Hh  ,  Hh    BB',
			' hh  T  hh      ',
			'                ',
			'  Hh  ####  Hh  ',
			'  hh  L     hh  ',
			'T      Hh      T',
			'   L   hh   Hh  ',
			'      ,     hh  ',
			'T  Hh     Hh   T',
			'   hh  T  hh    ',
			'                ',
			' Hh  Hh ## Hh   ',
			' hh  hh    hh L ',
			'   ,      ,     ',
			'                ',
		] },
	];
	const FRONT = 1;

	const ROOFS = [0xc8553d, 0x3d6fb6, 0x7a4fa8, 0x3e8f6b, 0xd99a3a, 0xb84a7a];
	const WALLS = [0xf3e6cc, 0xf2d4d0, 0xd6e2f0, 0xe8f0d4];
	const DREAM_COLS = ['#d6b8ff', '#ffb8e0', '#9ee8ff', '#a8ffd0', '#ffd0a8', '#c0c8ff'];
	const PYJAMAS = [0x9ec5ff, 0xffb3c7, 0xb8f0c0, 0xfff0a0, 0xd0b0ff];
	const SKIN = [0xf6d0b0, 0xe0a980, 0xb87a54, 0x8a5636, 0xffe0c8];

	const SKY = {
		night: { top: '#050820', hor: '#1c2558' },
		dawn: { top: '#3b3f8c', hor: '#ff9a72' },
		day: { top: '#5ab0ff', hor: '#ffe8b8' },
	};

	/* ---------- little helpers ---------- */

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, k) => a + (b - a) * k;
	const between = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	const rand = (a, b) => a + Math.random() * (b - a);
	const cellX = (c) => -HALF + (c + 0.5) * CS;
	const cellZ = (r) => -HALF + (r + 0.5) * CS;
	const colOf = (x) => clamp(Math.floor((x + HALF) / CS), 0, N - 1);
	const rowOf = (z) => clamp(Math.floor((z + HALF) / CS), 0, N - 1);
	const inGrid = (c, r) => c >= 0 && r >= 0 && c < N && r < N;
	const colour = (n) => (window.PLAYER_COLORS && PLAYER_COLORS[n]) || '#ffffff';
	const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
	const easeInOut = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
	const mixHex = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
	function skyAt(k) {
		// 0 night, 0.5 dawn, 1 morning
		const a = k < 0.5 ? SKY.night : SKY.dawn, b = k < 0.5 ? SKY.dawn : SKY.day, u = k < 0.5 ? k * 2 : (k - 0.5) * 2;
		return { top: mixHex(a.top, b.top, u), hor: mixHex(a.hor, b.hor, u) };
	}

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let latest = [];
	const cat = [];               // the catchers
	let dreams = [];
	let floaters = [];
	let banner = null;
	let phase = 'off';            // 'tutorial', 'intro', 'play', 'dawn' or 'off'
	let t = 0;
	let dawnT = -1;               // seconds into the morning (-1: still night)
	let shower = { maze: -1, t: 0, next: SHOWER_EVERY * 0.6 };
	const tut = { moved: [], picked: [], banked: [], crossed: [] };

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'dream-catcher',
		seconds: SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#b88cff', accent2: '#ff9ad6', gold: MOON, sky: ['#050820', '#1c2558'], glow: 'rgba(184,140,255,0.35)' },
		rivals: ['THE NIGHT OWLS', 'SWEET DREAMERS', 'THE SANDMEN', 'PILLOW FIGHT CLUB', 'THE SNOOZERS', 'MOONBEAMS', 'FORTY WINKS', 'THE NIGHTCAPS'],
		drawAvatar(ctx, n, x, y, scale) { drawCatcher2D(ctx, n, x, y, 130 * scale); },
		menu: { restart: () => resetRound() },
	});

	const everyone = (fn) => count > 0 && cat.every((e, i) => fn(i));
	const enough = (arr) => arr.filter(Boolean).length >= Math.min(count, 3);
	const TUTORIAL = [
		{ caption: 'WALK AROUND: YOU ARE YOUR DREAM CATCHER', min: 2, max: 10, did: () => everyone((i) => tut.moved[i] > 1.5) },
		{ caption: 'WALK PAST THE GLOWING DREAMS TO CATCH THEM', min: 2, max: 25, did: () => enough(tut.picked) },
		{ caption: 'TAKE YOUR TAIL TO AN HOURGLASS TO BANK IT', min: 2, max: 25, did: () => enough(tut.banked) },
		{ caption: 'STAND IN A FRONT CORNER TO CROSS THE BRIDGE THERE', min: 2, max: 25, did: () => enough(tut.crossed) },
		{ caption: 'RUN THROUGH SOMEONE\'S TAIL TO STEAL IT!', min: 3.5, max: 3.5, did: () => true },
		{ caption: 'DON\'T BUMP THE COTTAGES, OR YOUR DREAMS FLY OFF', min: 3.5, max: 3.5, did: () => true },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enter() {
				phase = 'tutorial';
				tut.moved = []; tut.picked = []; tut.banked = []; tut.crossed = [];
				seedDreams();
			},
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 5.5,
			enter() { phase = 'intro'; resetRound(true); },
			update(dt) { tick(dt); },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'CATCH THE DREAMS.', W / 2, 250, 88, bt - 0.3, { font: TITLE_FONT, exact: true, fill: LILAC });
					show.slam(c, 'BANK THEM IN THE HOURGLASS.', W / 2, 360, 66, bt - 1.1, { font: TITLE_FONT, exact: true, fill: MOON });
					show.slam(c, 'CUT TAILS TO STEAL THEM!', W / 2, 460, 66, bt - 1.9, { font: TITLE_FONT, exact: true, fill: '#ff8ac8' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (phase !== 'intro') resetRound(true);
				phase = 'play';
				banner = { title: 'GOODNIGHT, VILLAGE', sub: 'CATCH EVERY DREAM YOU CAN', t: 0 };
			},
			update(dt) {
				tick(dt);
				show.record(t, latest.slice(0, count));
			},
			draw(ctx) { drawBanner(ctx); },
		},
		show.beats.timeUp({ enter() { phase = 'off'; banner = null; } }),
		{
			id: 'dawn',
			length: 12,
			enter() {
				phase = 'dawn';
				dawnT = 0;
				show.camera.wide(0.8);
				startDawn();
			},
			update(dt, bt) {
				show.blackout = 0.96 * (1 - easeOut(bt / 1.4));
				tick(dt);
				if (show.cue(1.6)) { show.fx('whooshLong', 0.6); show.fx('charge', 0.4); }
				if (show.cue(3.0)) show.fx('roundClear', 0.5);
				if (show.cue(5.2)) show.fx('wake', 0.7);
				if (show.cue(6.2)) show.fx('fanfare', 0.5);
				for (const s of [6.6, 7.1, 7.4, 8.2, 8.6, 9.5]) if (show.cue(s)) show.fx('glint', 0.35, 1.6 + Math.random() * 0.8);
			},
			draw(ctx, bt) {
				if (bt > 6) {
					const a = clamp((11.6 - bt) / 0.6, 0, 1);
					show.onWalls(ctx, function (c) {
						show.slam(c, 'GOOD MORNING!', W / 2, 330, 120, bt - 6, { font: TITLE_FONT, exact: true, fill: '#ffd36a', alpha: a });
					});
				}
			},
		},
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(scores)); },
		}),
	]);

	/* ---------- flow ---------- */

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		for (let i = 0; i < n; i++) {
			cat.push({
				maze: FRONT, x: 0, z: 0, seen: false, face: 0, walk: 0, path: [], tail: [],
				dizzy: 0, wallT: 0, armed: true, cutSafe: 0, snip: 0, crossT: 0, bankFlash: 0,
			});
			buildCatcher(i);
		}
		seedDreams();
		show.go('title');
	}

	function resetRound(quiet) {
		scores = scores.map(() => 0);
		for (const d of dreams) removeDream(d);
		dreams = [];
		for (const e of cat) { e.tail = []; e.maze = FRONT; e.path = []; e.dizzy = 0; e.armed = true; }
		for (const m of mazes) for (const h of m.hourglasses) h.reset();
		shower = { maze: -1, t: 0, next: SHOWER_EVERY * 0.6 };
		dawnT = -1;
		seedDreams();
		if (!quiet) banner = { title: 'GOODNIGHT, VILLAGE', sub: '', t: 0 };
	}

	// a few dreams out already, so nobody waits
	function seedDreams() {
		for (const m of mazes) for (const h of m.cottages) if (Math.random() < 0.6) spawnDream(m, h, true);
	}

	/* ---------- every tick ---------- */

	function tick(dt) {
		if (show.paused) return;
		t += dt;
		const live = phase === 'tutorial' || phase === 'play';
		if (banner) banner.t += dt;
		if (dawnT >= 0) dawnT += dt;
		stepCatchers(dt, live);
		if (live) stepSpawns(dt);
		stepDreams(dt);
		for (const m of mazes) for (const h of m.hourglasses) h.step(dt);
		for (const f of floaters) f.t += dt;
		floaters = floaters.filter((f) => f.t < 1.6);
	}

	function stepCatchers(dt, live) {
		for (let i = 0; i < count; i++) {
			const e = cat[i];
			const p = latest[i];
			if (!p) { e.seen = false; continue; }
			const span = (v, m) => clamp((v - m) / (1 - m * 2), 0, 1);
			const tx = (span(p.px, EDGE) - 0.5) * SIZE;
			const tz = (0.5 - span(p.pz, EDGE_Z)) * SIZE;   // (pz is 1 at the front wall: the far edge, z -HALF)
			if (!e.seen) { e.x = tx; e.z = tz; e.seen = true; e.path = [{ x: tx, z: tz }]; }
			const k = 1 - Math.exp(-dt * 24);
			const dx = (tx - e.x) * k, dz = (tz - e.z) * k;
			e.x += dx; e.z += dz;
			const step = Math.hypot(dx, dz);
			if (step > 0.004) e.face = Math.atan2(dx, dz);
			e.walk += step * 9;
			tut.moved[i] = (tut.moved[i] || 0) + step;
			// the path the tail follows (newest first)
			const last = e.path[0];
			if (!last || Math.hypot(e.x - last.x, e.z - last.z) > 0.05) e.path.unshift({ x: e.x, z: e.z });
			const keep = Math.ceil(((e.tail.length + 2) * SEG) / 0.05) + 10;
			if (e.path.length > keep) e.path.length = keep;
			e.dizzy = Math.max(0, e.dizzy - dt);
			e.cutSafe = Math.max(0, e.cutSafe - dt);
			e.snip = Math.max(0, e.snip - dt);
			e.crossT = Math.max(0, e.crossT - dt);
			e.bankFlash = Math.max(0, e.bankFlash - dt);
			const m = mazes[e.maze];
			// the bridges
			const c = colOf(e.x), r = rowOf(e.z);
			const to = m.bridgeTo[r][c];
			if (to < 0) e.armed = true;
			else if (e.armed && phase !== 'off') { cross(i, to); continue; }
			if (!live) continue;
			// the cottages, hedges and trees
			if (touchingBlock(e, m)) {
				if (e.dizzy > 0) e.wallT = 0;
				else if ((e.wallT += dt) > BONK_GRACE) bonk(i);
			} else e.wallT = 0;
			if (e.dizzy > 0) continue;
			// dreams
			for (const d of dreams) {
				if (d.maze !== e.maze || d.owner !== -1 || !d.catchable || d.state === 'pop') continue;
				if (Math.hypot(d.x - e.x, d.z - e.z) < PICK_R) {
					d.owner = i;
					d.state = 'tail';
					e.tail.push(d);
					tut.picked[i] = true;
					show.fx('pop', 0.35, 1 + Math.min(0.9, e.tail.length * 0.05));
					if (d.sweet) float(e.maze, d.x, d.z, 'SWEET DREAM!', MOON, 0.9);
				}
			}
			// cutting someone's tail
			if (e.snip <= 0) {
				for (let j = 0; j < count; j++) {
					const o = cat[j];
					if (j === i || !o.seen || o.maze !== e.maze || o.cutSafe > 0 || !o.tail.length) continue;
					const k2 = o.tail.findIndex((d) => Math.hypot(d.x - e.x, d.z - e.z) < CUT_R);
					if (k2 < 0) continue;
					const stolen = o.tail.splice(k2);
					for (const d of stolen) d.owner = i;
					e.tail.push(...stolen);
					o.cutSafe = CUT_SAFE;
					o.snip = 1.0;
					e.cutSafe = Math.max(e.cutSafe, 0.6);
					float(e.maze, e.x, e.z, 'SNIP! +' + stolen.length, colour(i), 1.1);
					show.fx('swordSwish', 0.5);
					show.fx('kaching', 0.4);
				}
			}
			// the hourglasses
			if (e.tail.length) for (const h of m.hourglasses) if (Math.hypot(h.x - e.x, h.z - e.z) < BANK_R) { bank(i, h); break; }
		}
	}

	function touchingBlock(e, m) {
		const c0 = colOf(e.x), r0 = rowOf(e.z);
		for (let r = r0 - 2; r <= r0 + 2; r++) {
			for (let c = c0 - 2; c <= c0 + 2; c++) {
				if (!inGrid(c, r)) continue;
				const b = m.block[r][c];
				if (!b) continue;
				const half = CS * (b === 'tree' ? 0.3 : 0.44);
				const dx = Math.max(0, Math.abs(e.x - cellX(c)) - half);
				const dz = Math.max(0, Math.abs(e.z - cellZ(r)) - half);
				if (dx * dx + dz * dz < R * R) return true;
			}
		}
		return false;
	}

	function bonk(i) {
		const e = cat[i];
		e.dizzy = DIZZY;
		e.wallT = 0;
		const lost = e.tail.length;
		for (const d of e.tail) scatter(d);
		e.tail = [];
		float(e.maze, e.x, e.z, 'BONK!', '#ff8a6a', 1.2);
		if (lost) float(e.maze, e.x, e.z - 0.4, lost + ' FLEW OFF', '#ffd0a8', 0.8);
		show.fx('thud', 0.5);
		if (lost) show.fx('whoosh', 0.4);
	}

	function cross(i, to) {
		const e = cat[i];
		const from = e.maze;
		float(from, e.x, e.z, '→ ' + mazes[to].name, colour(i), 0.8);
		e.maze = to;
		e.armed = false;
		e.crossT = 0.6;
		e.path = [{ x: e.x, z: e.z }];
		for (const d of e.tail) { d.maze = to; d.x = e.x; d.z = e.z; d.y = 0.5; }
		tut.crossed[i] = true;
		show.fx('whoosh', 0.5);
		show.fx('glint', 0.4);
	}

	function chainOf(n) {
		for (const [len, k] of CHAINS) if (n >= len) return k;
		return 1;
	}

	function bank(i, h) {
		const e = cat[i];
		const n = e.tail.length;
		const k = chainOf(n);
		const value = Math.round(e.tail.reduce((s, d) => s + d.value, 0) * k);
		scores[i] += value;
		e.tail.forEach(function (d, j) {
			d.state = 'bank';
			d.owner = -2;
			d.t = -j * 0.05;
			d.sx = d.x; d.sy = d.y; d.sz = d.z;
			d.to = h;
		});
		e.tail = [];
		h.add(i, value);
		float(h.maze, h.x, h.z, '+' + value, colour(i), 1.3);
		if (k > 1) float(h.maze, h.x, h.z - 0.5, 'CHAIN ×' + k + '!', MOON, 1.0);
		e.bankFlash = 0.6;
		tut.banked[i] = true;
		show.fx('bonus', 0.5);
		show.fx('glint', 0.6);
	}

	/* ---------- dreams ---------- */

	function stepSpawns(dt) {
		const late = phase === 'play' ? 1 + 0.6 * (1 - show.timeLeft() / SECONDS) : 2.5;
		if (phase === 'play') {
			shower.next -= dt;
			if (shower.maze >= 0) { shower.t -= dt; if (shower.t <= 0) shower.maze = -1; }
			if (shower.next <= 0 && show.timeLeft() > SHOWER_LEN + 5) {
				shower.next = SHOWER_EVERY;
				shower.maze = pick([0, 2, 0, 2, 1]);
				shower.t = SHOWER_LEN;
				banner = { title: 'DREAM SHOWER!', sub: 'IN ' + mazes[shower.maze].name, t: 0 };
				show.fx('roundStart', 0.6);
			}
		}
		for (const m of mazes) {
			const showering = shower.maze === m.idx;
			const cap = Math.round(m.cottages.length * (showering ? 2.6 : 1.4));
			for (const h of m.cottages) {
				h.next -= dt * late * (showering ? 4 : 1);
				if (h.next > 0) continue;
				h.next = DREAM_EVERY * rand(0.6, 1.4);
				const free = dreams.filter((d) => d.maze === m.idx && d.owner === -1).length;
				if (free < cap) spawnDream(m, h);
			}
		}
	}

	function freeSpot(m, h) {
		const busy = (s) => dreams.some((d) => d.maze === m.idx && d.owner === -1 && Math.hypot(d.x - s.x, d.z - s.z) < 0.4);
		const opts = (h ? h.spots : m.spots).filter((s) => !busy(s));
		return opts.length ? pick(opts) : null;
	}

	function spawnDream(m, h, now) {
		const s = freeSpot(m, h);
		if (!s) return null;
		const sweet = Math.random() < SWEET_CHANCE;
		const d = {
			maze: m.idx, owner: -1, state: 'rise', t: now ? 9 : 0, catchable: !!now,
			hx: s.x, hz: s.z, sx: h.x, sy: 1.4, sz: h.z, x: now ? s.x : h.x, y: now ? 0.5 : 1.4, z: now ? s.z : h.z,
			value: sweet ? SWEET : DREAM, sweet, col: sweet ? '#ffe28a' : pick(DREAM_COLS), seed: Math.random() * 6,
		};
		d.mesh = makeDreamMesh(d);
		scene.add(d.mesh);
		dreams.push(d);
		return d;
	}

	// back into the air, to settle somewhere else in the village (or fade, if it's full)
	function scatter(d) {
		const m = mazes[d.maze];
		const s = freeSpot(m);
		d.owner = -1;
		d.catchable = false;
		if (!s || dawnT >= 0) { d.state = 'pop'; d.t = 0; return; }
		d.state = 'scatter';
		d.t = 0;
		d.sx = d.x; d.sy = d.y; d.sz = d.z;
		d.hx = s.x; d.hz = s.z;
	}

	function removeDream(d) { scene.remove(d.mesh); if (d.mesh.userData.dispose) d.mesh.userData.dispose(); }

	function stepDreams(dt) {
		// where each tail's dreams belong: back along their catcher's path
		for (let i = 0; i < count; i++) {
			const e = cat[i];
			if (!e.tail.length) continue;
			let want = SEG, acc = 0, k = 0;
			let prev = { x: e.x, z: e.z };
			const targets = [];
			for (let j = 0; j < e.path.length && k < e.tail.length; j++) {
				const p = e.path[j];
				const seg = Math.hypot(p.x - prev.x, p.z - prev.z);
				while (k < e.tail.length && acc + seg >= want) {
					const u = seg ? (want - acc) / seg : 0;
					targets.push({ x: lerp(prev.x, p.x, u), z: lerp(prev.z, p.z, u) });
					k++;
					want += SEG;
				}
				acc += seg;
				prev = p;
			}
			while (targets.length < e.tail.length) targets.push(targets.length ? targets[targets.length - 1] : { x: e.x, z: e.z });
			e.tail.forEach(function (d, j) {
				const f = 1 - Math.exp(-dt * 12);
				d.x = lerp(d.x, targets[j].x, f);
				d.z = lerp(d.z, targets[j].z, f);
				d.y = lerp(d.y, 0.48 + Math.sin(t * 3 + j * 0.6) * 0.05, f);
			});
		}
		for (const d of dreams) {
			d.t += dt;
			if (d.state === 'rise') {
				// up out of the roof, over, and down to hang above the lane
				const k = easeInOut(d.t / 1.8);
				d.x = lerp(d.sx, d.hx, k);
				d.z = lerp(d.sz, d.hz, k);
				d.y = lerp(d.sy, 0.5, k) + Math.sin(k * Math.PI) * 1.0;
				if (d.t > 1.0) d.catchable = true;
				if (d.t > 1.8) d.state = 'float';
			} else if (d.state === 'scatter') {
				const k = easeInOut(d.t / 1.4);
				d.x = lerp(d.sx, d.hx, k);
				d.z = lerp(d.sz, d.hz, k);
				d.y = lerp(d.sy, 0.5, k) + Math.sin(k * Math.PI) * 1.8;
				if (d.t > 1.0) d.catchable = true;
				if (d.t > 1.4) d.state = 'float';
			} else if (d.state === 'float') {
				d.x = d.hx; d.z = d.hz;
				d.y = 0.5 + Math.sin(t * 2 + d.seed) * 0.07;
			} else if (d.state === 'bank') {
				// poured into the hourglass's top
				const k = easeInOut(Math.max(0, d.t) / 0.6);
				d.x = lerp(d.sx, d.to.x, k);
				d.z = lerp(d.sz, d.to.z, k);
				d.y = lerp(d.sy, 2.0, k) + Math.sin(k * Math.PI) * 0.6;
				if (d.t > 0.6) d.dead = true;
			} else if (d.state === 'pop') {
				d.y += dt * 1.2;
				if (d.t > 1.2) d.dead = true;
			}
		}
		for (const d of dreams) if (d.dead) removeDream(d);
		dreams = dreams.filter((d) => !d.dead);
	}

	function float(maze, x, z, text, fill, size = 1) {
		floaters.push({ maze, x, z, text, fill, size, t: 0 });
	}

	/* ---------- the morning ---------- */

	function startDawn() {
		// unbanked dreams fade with the night
		for (const e of cat) {
			if (e.tail.length) float(e.maze, e.x, e.z, 'FADED AWAY…', '#c8c8ff', 0.8);
			for (const d of e.tail) { d.state = 'pop'; d.t = 0; d.owner = -1; d.catchable = false; }
			e.tail = [];
		}
		for (const d of dreams) if (d.state !== 'bank') { d.state = 'pop'; d.t = -Math.random() * 1.5; d.catchable = false; }
		banner = null;
		for (const m of mazes) {
			for (const h of m.hourglasses) h.flipAt = 1.6;
			for (const h of m.cottages) { h.outAt = rand(1.6, 4.2); h.wakeAt = rand(4.6, 6.2); }
			m.lamps.forEach((l) => { l.outAt = rand(2.2, 3.4); });
		}
	}

	/* ---------- 3D ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	let post = null;
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, IGB.maxK);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(SKY.night.top);
	post = createWallComposer(renderer, scene, { strength: 0.6, radius: 0.5, threshold: 0.9, cap: 2.2, fxaa: true });
	const envTex = environmentFromShader(renderer, `
		vec3 envColor(vec3 d) {
			float up = d.y * 0.5 + 0.5;
			vec3 c = mix(vec3(0.08, 0.08, 0.14), vec3(0.35, 0.42, 0.7), up);
			c += vec3(1.0, 0.8, 0.6) * pow(max(0.0, 1.0 - abs(d.y)), 6.0) * 0.4;
			return c;
		}
	`);
	scene.environment = envTex;
	scene.environmentIntensity = 0.35;

	// the moon (and, in the morning, the sun): one light over all three islands
	const hemi = new THREE.HemisphereLight(0x6f86d6, 0x1a1a30, 0.9);
	scene.add(hemi);
	const moon = new THREE.DirectionalLight(0xbcd0ff, 1.15);
	moon.position.set(0, 16, -7);
	moon.castShadow = true;
	moon.shadow.mapSize.set(4096, 1024);
	Object.assign(moon.shadow.camera, { left: -LX - 9, right: LX + 9, top: 11, bottom: -11, near: 1, far: 50 });
	moon.shadow.bias = -0.0006;
	scene.add(moon);
	scene.add(moon.target);
	const NIGHT_LIGHT = { hemiSky: new THREE.Color(0x6f86d6), hemiGround: new THREE.Color(0x1a1a30), hemi: 0.9, sun: new THREE.Color(0xbcd0ff), sunI: 1.15, pos: new THREE.Vector3(0, 16, -7), env: 0.35, exp: 1.0 };
	const DAY_LIGHT = { hemiSky: new THREE.Color(0xcfe6ff), hemiGround: new THREE.Color(0x6a8a4a), hemi: 1.35, sun: new THREE.Color(0xffd9a8), sunI: 2.6, pos: new THREE.Vector3(0, 9, 14), env: 0.85, exp: 1.08 };
	const DAWN_LIGHT = { hemiSky: new THREE.Color(0xa58ad0), hemiGround: new THREE.Color(0x40304a), hemi: 1.0, sun: new THREE.Color(0xff9a6a), sunI: 1.6, pos: new THREE.Vector3(0, 5, 15), env: 0.5, exp: 1.02 };

	/* textures, painted */

	function noiseFill(c, w, h, base, spread, n, seed) {
		let s = seed;
		const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
		c.fillStyle = base;
		c.fillRect(0, 0, w, h);
		for (let i = 0; i < n; i++) {
			const v = (rnd() - 0.5) * spread;
			c.fillStyle = v > 0 ? `rgba(255,255,230,${v})` : `rgba(0,20,10,${-v})`;
			const r = 1 + rnd() * 3;
			c.fillRect(rnd() * w, rnd() * h, r, r);
		}
	}
	const TEX = {};
	TEX.soft = canvasTexture(128, 128, function (c, w) {
		const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, w);
	});
	TEX.ring = canvasTexture(256, 256, function (c, w) {
		c.clearRect(0, 0, w, w);
		c.strokeStyle = 'white';
		c.lineWidth = 10;
		c.setLineDash([22, 14]);
		c.beginPath(); c.arc(w / 2, w / 2, w * 0.44, 0, Math.PI * 2); c.stroke();
	});
	TEX.bank = canvasTexture(64, 64, function (c, w) {
		noiseFill(c, w, w, '#6a4a2a', 0.2, 300, 3);
	});
	TEX.planks = canvasTexture(256, 256, function (c, w) {
		noiseFill(c, w, w, '#8a5a32', 0.25, 3000, 9);
		c.strokeStyle = 'rgba(40,20,8,0.7)';
		c.lineWidth = 4;
		for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, w); c.stroke(); }
	});
	TEX.planks.wrapS = TEX.planks.wrapT = THREE.RepeatWrapping;
	TEX.grassSide = canvasTexture(256, 64, function (c, w, h) {
		noiseFill(c, w, h, '#4a3420', 0.3, 2000, 13);
		c.fillStyle = '#3f7a3a';
		c.fillRect(0, 0, w, 14);
	});
	TEX.grassSide.wrapS = THREE.RepeatWrapping;
	TEX.grassSide.repeat.set(6, 1);

	// a village's ground: grass, with cobbled lanes wherever you can walk
	function groundTexture(m) {
		return canvasTexture(1024, 1024, function (c, w) {
			noiseFill(c, w, w, '#3f7a3a', 0.25, 30000, 17 + m.idx);
			const s = w / N;
			let k = 7 + m.idx * 101;
			const rnd = () => ((k = (k * 1103515245 + 12345) >>> 0) / 4294967296);
			for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
				const ch = m.rows[r][q];
				if (ch === ' ' || ch === 'L' || ch === 'B' || ch === 'G' || ch === 'g') {
					c.fillStyle = '#b8ab94';
					c.fillRect(q * s - 2, r * s - 2, s + 4, s + 4);
				}
			}
			// the cobbles
			for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
				const ch = m.rows[r][q];
				if (!(ch === ' ' || ch === 'L' || ch === 'B' || ch === 'G' || ch === 'g')) continue;
				for (let i = 0; i < 9; i++) {
					const x = q * s + rnd() * s, y = r * s + rnd() * s, rr = 6 + rnd() * 8;
					c.fillStyle = `rgba(${rnd() > 0.5 ? '255,250,235' : '70,60,50'},${0.12 + rnd() * 0.15})`;
					c.beginPath(); c.ellipse(x, y, rr, rr * 0.8, rnd() * 3, 0, Math.PI * 2); c.fill();
				}
			}
			// the hourglass plazas: a ring of pale stone
			for (const h of m.hgCells) {
				const x = (h.c + 1) * s, y = (h.r + 1) * s;
				c.fillStyle = '#d8cdb8';
				c.beginPath(); c.arc(x, y, s * 1.25, 0, Math.PI * 2); c.fill();
				c.strokeStyle = '#8a7a6a';
				c.lineWidth = 5;
				for (const rr of [s * 0.8, s * 1.2]) { c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.stroke(); }
			}
			// flower beds
			for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
				if (m.rows[r][q] !== ',') continue;
				for (let i = 0; i < 14; i++) {
					c.fillStyle = pick(['#ffb8e0', '#fff1a0', '#d6b8ff', '#ffffff', '#ff8a8a']);
					c.beginPath(); c.arc(q * s + 8 + rnd() * (s - 16), r * s + 8 + rnd() * (s - 16), 4 + rnd() * 3, 0, Math.PI * 2); c.fill();
				}
			}
		});
	}

	const MAT = {
		bank: new THREE.MeshStandardMaterial({ map: TEX.grassSide, roughness: 0.95 }),
		planks: new THREE.MeshStandardMaterial({ map: TEX.planks, roughness: 0.8 }),
		wood: new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.75 }),
		darkWood: new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.75 }),
		iron: new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.5, metalness: 0.5 }),
		chimney: new THREE.MeshStandardMaterial({ color: 0x8a5a4a, roughness: 0.9 }),
		door: new THREE.MeshStandardMaterial({ color: 0x5a3420, roughness: 0.7 }),
		leaf: new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.85 }),
		leaf2: new THREE.MeshStandardMaterial({ color: 0x3f8a46, roughness: 0.85 }),
		hedge: new THREE.MeshStandardMaterial({ color: 0x2c5e34, roughness: 0.9 }),
		trunk: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 }),
		glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe0ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
		brass: new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 0.8, roughness: 0.3 }),
		nightSand: new THREE.MeshStandardMaterial({ color: 0x8a90d0, emissive: 0x5a60c0, emissiveIntensity: 0.6, roughness: 0.6 }),
		glow: new THREE.MeshBasicMaterial({ map: TEX.soft, color: new THREE.Color(0.7, 0.45, 0.15), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
		shadow: new THREE.MeshBasicMaterial({ map: TEX.soft, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
		white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
		dark: new THREE.MeshStandardMaterial({ color: 0x14101a, roughness: 0.5 }),
	};
	const GEO = {
		shadow: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
		glow: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
		roof: new THREE.CylinderGeometry(0.74, 0.74, 1.5, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2),
		dream: new THREE.SphereGeometry(0.1, 16, 12),
		bubble: new THREE.SphereGeometry(0.17, 20, 14),
		win: new THREE.PlaneGeometry(0.16, 0.18),
	};

	// the lake round the islands: it holds the sky, the stars and the moon
	const lakeU = {
		uTime: { value: 0 },
		uTop: { value: new THREE.Color(SKY.night.top) },
		uHor: { value: new THREE.Color(SKY.night.hor) },
		uStars: { value: 1 },
		uGlint: { value: new THREE.Color(0.6, 0.7, 1.0) },
	};
	const lake = new THREE.Mesh(new THREE.PlaneGeometry(220, 80).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
		uniforms: lakeU,
		vertexShader: `
			varying vec3 vW;
			void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
		`,
		fragmentShader: `
			uniform float uTime; uniform vec3 uTop; uniform vec3 uHor; uniform float uStars; uniform vec3 uGlint;
			varying vec3 vW;
			float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
			void main() {
				vec2 p = vW.xz;
				float rip = sin(p.x * 1.7 + uTime * 0.8 + sin(p.y * 0.9) * 1.5) * sin(p.y * 1.3 - uTime * 0.6) * 0.5 + 0.5;
				float far = clamp(-p.y / 30.0 + 0.4, 0.0, 1.0);
				vec3 c = mix(uHor, uTop, 0.35 + 0.4 * far + 0.12 * rip) * 0.6;
				vec2 g = floor(p * 2.5);
				vec2 fr = fract(p * 2.5) - 0.5;
				float h = hash(g);
				vec2 off = (vec2(hash(g + 1.3), hash(g + 2.7)) - 0.5) * 0.6;
				float star = step(0.9, h) * smoothstep(0.1, 0.0, length(fr - off));
				star *= 0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
				c += vec3(1.7, 1.7, 2.0) * star * uStars;
				c += uGlint * pow(rip, 10.0) * 0.35;
				gl_FragColor = vec4(c, 1.0);
			}
		`,
	}));
	lake.position.y = -0.45;
	scene.add(lake);

	/* the villages */

	// (the hourglasses' shape: see buildHourglass)
	const HG = { y0: 0.16, bulb: 0.62, r: 0.42, neck: 0.06 };
	const bulbR = (u) => HG.neck + (HG.r - HG.neck) * Math.pow(Math.cos(clamp(u, 0, 1) * Math.PI / 2), 0.7);

	const mazes = MAPS.map(function (def, idx) {
		const rows = def.map.map((s) => (s + ' '.repeat(N)).slice(0, N));
		if (def.map.some((s) => s.length !== N) || def.map.length !== N) console.warn('dream-catcher: map', def.name, 'is not', N, 'x', N);
		const m = {
			idx, name: def.name, short: def.short, rows, cx: (idx - 1) * LX,
			block: rows.map(() => new Array(N).fill(null)),
			bridgeTo: rows.map(() => new Array(N).fill(-1)),
			cottages: [], hourglasses: [], hgCells: [], lamps: [], spots: [], bridges: [], windows: [],
			group: new THREE.Group(),
		};
		m.group.position.x = m.cx;
		scene.add(m.group);
		rows.forEach(function (s, r) {
			[...s].forEach(function (ch, c) {
				if (ch === 'H' || ch === 'h') m.block[r][c] = 'house';
				else if (ch === '#') m.block[r][c] = 'hedge';
				else if (ch === 'T') m.block[r][c] = 'tree';
				if (ch === 'B') {
					m.bridgeTo[r][c] = idx === FRONT ? (c < N / 2 ? 0 : 2) : FRONT;
					m.bridges.push({ c, r });
				}
				if (ch === 'G') m.hgCells.push({ c, r });
			});
		});
		buildVillage(m);
		return m;
	});

	function buildVillage(m) {
		const g = m.group;
		// the island
		const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture(m), roughness: 0.9 });
		groundMat.map.anisotropy = 8;
		const isl = new THREE.Mesh(new THREE.BoxGeometry(SIZE + 0.6, 1.0, SIZE + 0.6), [MAT.bank, MAT.bank, groundMat, MAT.bank, MAT.bank, MAT.bank]);
		isl.position.y = -0.5;
		isl.receiveShadow = true;
		g.add(isl);
		// (the top's texture covers SIZE + 0.6: scale it so the squares line up)
		groundMat.map.repeat.set((SIZE + 0.6) / SIZE, (SIZE + 0.6) / SIZE);
		groundMat.map.offset.set(-0.3 / SIZE, -0.3 / SIZE);
		groundMat.map.wrapS = groundMat.map.wrapT = THREE.ClampToEdgeWrapping;
		// the free squares next to cottages, where dreams can hang
		const walkable = (c, r) => inGrid(c, r) && !m.block[r][c] && m.bridgeTo[r][c] < 0 && m.rows[r][c] !== 'G' && m.rows[r][c] !== 'g';
		for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
			const ch = m.rows[r][c];
			const x = cellX(c), z = cellZ(r);
			if (ch === 'H') buildCottage(m, c, r);
			else if (ch === 'G') buildHourglass(m, c, r);
			else if (ch === 'T') buildTree(g, x, z);
			else if (ch === '#') buildHedge(g, x, z);
			else if (ch === 'L') buildLamp(m, x, z);
			else if (ch === ',') buildFlowers(g, x, z);
		}
		for (const h of m.cottages) {
			for (let r = h.r - 1; r <= h.r + 2; r++) for (let c = h.c - 1; c <= h.c + 2; c++) {
				if (walkable(c, r)) h.spots.push({ x: cellX(c), z: cellZ(r) });
			}
			m.spots.push(...h.spots);
		}
		// the bridges: a 2 x 2 landing in a corner by the front wall, the floor's
		// sweet spot at a seam, and the bridge off it toward that seam: sideways
		// off the square (into the side wall), up off a side village (into the
		// front wall). Seen from either wall, it's in the corner beside the other.
		m.pads = [];
		const pads = {};
		for (const b of m.bridges) (pads[b.c < N / 2 ? -1 : 1] = pads[b.c < N / 2 ? -1 : 1] || []).push(b);
		for (const key of Object.keys(pads)) {
			const cells = pads[key], side = +key;
			const x0 = Math.min(...cells.map((b) => cellX(b.c))) - CS / 2, x1 = Math.max(...cells.map((b) => cellX(b.c))) + CS / 2;
			const z0 = Math.min(...cells.map((b) => cellZ(b.r))) - CS / 2, z1 = Math.max(...cells.map((b) => cellZ(b.r))) + CS / 2;
			const front = m.idx === FRONT;
			const pad = { to: m.bridgeTo[cells[0].r][cells[0].c], x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
			m.pads.push(pad);
			// a group whose +x runs out along the bridge, from the island's edge
			const bg = new THREE.Group();
			const depth = front ? x1 - x0 : z1 - z0, wide = front ? z1 - z0 : x1 - x0;
			if (front) { bg.position.set(side * HALF, 0, pad.z); bg.rotation.y = side < 0 ? Math.PI : 0; }
			else { bg.position.set(pad.x, 0, -HALF); bg.rotation.y = Math.PI / 2; }
			const len = 5.5;
			const deck = new THREE.Mesh(new THREE.BoxGeometry(depth + len, 0.08, wide), MAT.planks.clone());
			deck.material.map = TEX.planks.clone();
			deck.material.map.repeat.set(depth + len, 1);
			deck.material.map.needsUpdate = true;
			deck.position.set((len - depth) / 2, 0.04, 0);
			deck.receiveShadow = true;
			deck.castShadow = true;
			bg.add(deck);
			for (const z of [-wide / 2 + 0.05, wide / 2 - 0.05]) {
				const rail = new THREE.Mesh(new THREE.BoxGeometry(len - 0.3, 0.05, 0.05), MAT.wood);
				rail.position.set(0.3 + (len - 0.3) / 2, 0.36, z);
				rail.castShadow = true;
				bg.add(rail);
				for (let k = 0; k <= 5; k++) {
					const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.06), MAT.wood);
					post.position.set(0.3 + k * (len - 0.3) / 5, 0.2, z);
					post.castShadow = true;
					bg.add(post);
				}
				// a lantern each side at the island end
				buildLamp(m, 0.25, z + (z < 0 ? -0.12 : 0.12), bg, 0.7);
			}
			// a glowing ring round the landing, and an arch over the way out, so it reads as a door to the next village
			const ring = new THREE.Mesh(new THREE.PlaneGeometry(depth, wide).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.ring, color: new THREE.Color(1.2, 1.0, 2.0), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
			ring.position.set(-depth / 2, 0.1, 0);
			bg.add(ring);
			const arch = new THREE.Mesh(new THREE.TorusGeometry(wide / 2 + 0.05, 0.04, 8, 32, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 2.4) }));
			arch.rotation.y = Math.PI / 2;
			arch.position.set(0.05, 0.08, 0);
			bg.add(arch);
			m.bridgeArches = (m.bridgeArches || []).concat([arch]);
			g.add(bg);
		}
		// fireflies
		const FLIES = 46;
		const pos = new Float32Array(FLIES * 3), cols = new Float32Array(FLIES * 3);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
		const fliesMat = new THREE.PointsMaterial({ size: 0.16, map: TEX.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
		const flies = new THREE.Points(geo, fliesMat);
		flies.frustumCulled = false;
		g.add(flies);
		m.flies = { points: flies, mat: fliesMat, seeds: Array.from({ length: FLIES }, () => ({ x: rand(-HALF - 1, HALF + 1), z: rand(-HALF - 1, HALF + 1), y: rand(0.4, 1.8), a: Math.random() * 9, s: rand(0.3, 0.9), r: rand(0.3, 1.2) })) };
	}

	function buildCottage(m, c, r) {
		const g = new THREE.Group();
		const x = cellX(c) + CS / 2, z = cellZ(r) + CS / 2;
		const turn = Math.random() < 0.5 ? 0 : Math.PI / 2;
		const wallCol = pick(WALLS), roofCol = pick(ROOFS);
		const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 1.0), new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.8 }));
		body.position.y = 0.36;
		const roof = new THREE.Mesh(GEO.roof, new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.7 }));
		roof.scale.set(0.9, 0.62, 0.9);
		roof.position.y = 0.72 + 0.74 * 0.5 * 0.62;
		const chim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.14), MAT.chimney);
		chim.position.set(0.32, 1.05, 0.15);
		const inner = new THREE.Group();
		inner.add(body, roof, chim);
		for (const k of [body, roof, chim]) { k.castShadow = true; k.receiveShadow = true; }
		// windows on every side, lit warm (each cottage its own, so they go out one by one)
		const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.6) });
		const addWin = (wx, wy, wz, ry) => { const w = new THREE.Mesh(GEO.win, winMat); w.position.set(wx, wy, wz); w.rotation.y = ry; inner.add(w); };
		for (const s of [-1, 1]) {
			addWin(-0.28, 0.42, s * 0.502, s > 0 ? 0 : Math.PI);
			addWin(0.28, 0.42, s * 0.502, s > 0 ? 0 : Math.PI);
			addWin(s * 0.577, 0.42, 0, s * Math.PI / 2);
		}
		inner.rotation.y = turn;
		g.add(inner);
		// the door: on whichever side opens on a lane, the camera's side first
		const view = [[1, 0], [0, 1], [-1, 0]][m.idx];   // (toward the viewer of this wall)
		const sides = [view, [0, 1], [0, -1], [1, 0], [-1, 0]];
		let door = sides[0];
		for (const [dx, dz] of sides) {
			const cc = dx > 0 ? c + 2 : dx < 0 ? c - 1 : c, rr = dz > 0 ? r + 2 : dz < 0 ? r - 1 : r;
			if (inGrid(cc, rr) && !m.block[rr][cc]) { door = [dx, dz]; break; }
		}
		const half = (dx, dz) => (dx ? (turn ? 0.5 : 0.575) : (turn ? 0.575 : 0.5));
		const doorM = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.34), MAT.door);
		const dd = half(door[0], door[1]) + 0.004;
		doorM.position.set(door[0] * dd, 0.17, door[1] * dd);
		doorM.rotation.y = Math.atan2(door[0], door[1]);
		g.add(doorM);
		// the warm pool of window light on the ground
		const glow = new THREE.Mesh(GEO.glow, MAT.glow.clone());
		glow.scale.setScalar(2.6);
		glow.position.y = 0.02;
		g.add(glow);
		// the sleeper, who'll wake in the morning
		const v = buildVillager();
		v.position.set(door[0] * (dd + 0.1), 0, door[1] * (dd + 0.1));
		v.rotation.y = Math.atan2(door[0], door[1]);
		v.visible = false;
		g.add(v);
		g.position.set(x, 0, z);
		m.group.add(g);
		m.cottages.push({ c, r, x, z, mesh: g, winMat, glow, door, dd, villager: v, spots: [], next: rand(0, DREAM_EVERY), zzz: Math.random() * 3, outAt: 99, wakeAt: 99 });
	}

	function buildVillager() {
		const g = new THREE.Group();
		const pj = new THREE.MeshStandardMaterial({ color: pick(PYJAMAS), roughness: 0.7 });
		const skin = new THREE.MeshStandardMaterial({ color: pick(SKIN), roughness: 0.6 });
		const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 12), pj);
		body.position.y = 0.2;
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), skin);
		head.position.y = 0.43;
		const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 12), pj);
		cap.position.set(0, 0.56, -0.02);
		cap.rotation.x = -0.5;
		const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MAT.white);
		pom.position.set(0, 0.64, -0.1);
		g.add(body, head, cap, pom);
		const arms = [];
		for (const s of [-1, 1]) {
			const pivot = new THREE.Group();
			pivot.position.set(s * 0.11, 0.3, 0);
			const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), pj);
			arm.position.y = -0.08;
			pivot.add(arm);
			pivot.rotation.z = s * 0.2;
			g.add(pivot);
			arms.push(pivot);
		}
		for (const s of [-1, 1]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), MAT.dark);
			eye.position.set(s * 0.035, 0.44, 0.092);
			g.add(eye);
		}
		g.traverse((k) => { if (k.isMesh) k.castShadow = true; });
		g.userData = { arms, body };
		g.scale.setScalar(1.25);
		return g;
	}

	function buildTree(g, x, z) {
		const t = new THREE.Group();
		const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), MAT.trunk);
		trunk.position.y = 0.25;
		t.add(trunk);
		const s = rand(0.85, 1.15);
		for (const [dx, dy, dz, r, m] of [[0, 0.7, 0, 0.32, MAT.leaf], [0.12, 0.92, 0.05, 0.22, MAT.leaf2], [-0.1, 0.86, -0.06, 0.2, MAT.leaf2]]) {
			const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m);
			b.position.set(dx, dy, dz);
			t.add(b);
		}
		t.traverse((k) => { if (k.isMesh) { k.castShadow = true; k.receiveShadow = true; } });
		t.scale.setScalar(s);
		t.rotation.y = Math.random() * 6;
		t.position.set(x, 0, z);
		g.add(t);
	}
	function buildHedge(g, x, z) {
		const h = new THREE.Mesh(new THREE.BoxGeometry(CS * 0.98, 0.5, CS * 0.86), MAT.hedge);
		h.position.set(x, 0.25, z);
		h.castShadow = true;
		h.receiveShadow = true;
		g.add(h);
		const top = new THREE.Mesh(new THREE.CylinderGeometry(CS * 0.43, CS * 0.43, CS * 0.98, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), MAT.hedge);
		top.position.set(x, 0.5, z);
		top.castShadow = true;
		g.add(top);
	}
	function buildFlowers(g, x, z) {
		for (let i = 0; i < 6; i++) {
			const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshStandardMaterial({ color: pick([0xffb8e0, 0xfff1a0, 0xd6b8ff, 0xffffff]), roughness: 0.6, emissive: 0x221a30 }));
			f.position.set(x + rand(-0.28, 0.28), 0.06, z + rand(-0.28, 0.28));
			g.add(f);
		}
	}
	function buildLamp(m, x, z, parent, scale = 1) {
		const g = new THREE.Group();
		const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.1, 8), MAT.iron);
		pole.position.y = 0.55;
		const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 6), MAT.iron);
		cage.position.y = 1.18;
		const capM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 6), MAT.iron);
		capM.position.y = 1.32;
		const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.2, 1.0) });
		const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), bulbMat);
		bulb.position.y = 1.18;
		for (const k of [pole, cage, capM]) k.castShadow = true;
		g.add(pole, cage, capM, bulb);
		const glow = new THREE.Mesh(GEO.glow, MAT.glow.clone());
		glow.material.color.setRGB(0.8, 0.6, 0.25);
		glow.scale.setScalar(2.0);
		glow.position.y = 0.025;
		g.add(glow);
		const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: new THREE.Color(1.6, 1.2, 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		halo.scale.setScalar(0.7);
		halo.position.y = 1.18;
		g.add(halo);
		g.scale.setScalar(scale);
		g.position.set(x, 0, z);
		(parent || m.group).add(g);
		const lamp = { group: g, bulbMat, glow, halo, outAt: 99 };
		m.lamps.push(lamp);
		return lamp;
	}

	// an hourglass: two glass bulbs in a brass-and-wood frame. The night's sand
	// drains from the top as the clock runs; banked dreams fill the bottom in
	// layers of their catchers' colours.
	function buildHourglass(m, c, r) {
		const x = cellX(c) + CS / 2, z = cellZ(r) + CS / 2;
		const outer = new THREE.Group();
		outer.position.set(x, 0, z);
		const g = new THREE.Group();   // (this is what flips: about its middle)
		const mid = HG.y0 + HG.bulb;
		g.position.y = mid;
		outer.add(g);
		const base = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.14, 24), MAT.darkWood);
		base.position.y = -HG.bulb - 0.09;
		const top = base.clone();
		top.position.y = HG.bulb + 0.09;
		g.add(base, top);
		for (let k = 0; k < 3; k++) {
			const a = k / 3 * Math.PI * 2;
			const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, HG.bulb * 2 + 0.1, 8), MAT.brass);
			post.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
			g.add(post);
		}
		const pts = [];
		for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector2(bulbR(u), -HG.bulb + u * HG.bulb)); }
		for (let k = 1; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector2(bulbR(1 - u), u * HG.bulb)); }
		const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), MAT.glass);
		glass.renderOrder = 3;
		g.add(glass);
		g.traverse((k) => { if (k.isMesh && k !== glass) k.castShadow = true; });
		// the night's sand, in the top bulb
		const nightSand = new THREE.Mesh(new THREE.BufferGeometry(), MAT.nightSand);
		g.add(nightSand);
		// the trickle through the neck
		const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.2, 2.0), transparent: true, opacity: 0.6 }));
		g.add(stream);
		const layers = new THREE.Group();
		g.add(layers);
		// the bank ring on the ground
		const ring = new THREE.Mesh(new THREE.PlaneGeometry(BANK_R * 2, BANK_R * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.ring, color: new THREE.Color(1.6, 1.4, 2.4), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
		ring.position.y = 0.03;
		outer.add(ring);
		const glow = new THREE.Mesh(GEO.glow, MAT.glow.clone());
		glow.material.color.setRGB(0.5, 0.4, 0.9);
		glow.scale.setScalar(3.0);
		glow.position.y = 0.02;
		outer.add(glow);
		const sh = new THREE.Mesh(GEO.shadow, MAT.shadow);
		sh.scale.setScalar(1.6);
		sh.position.y = 0.015;
		outer.add(sh);
		m.group.add(outer);
		const h = {
			maze: m.idx, x, z, outer, g, layers, nightSand, stream, ring, glow, deposits: [], total: 0, pour: 0, flipAt: -1, flip: 0, burst: null, sandS: -1,
			reset() {
				this.deposits = []; this.total = 0; this.flip = 0; this.flipAt = -1; this.g.rotation.z = 0; this.rebuild();
				if (this.burst) { this.burst.pts.parent.remove(this.burst.pts); this.burst = null; }
			},
			add(i, value) {
				const last = this.deposits[this.deposits.length - 1];
				if (last && last.i === i) last.v += value; else this.deposits.push({ i, v: value });
				this.total += value;
				this.pour = 1;
				this.rebuild();
			},
			// the dream-glow, in layers, as high as the total says (it never quite fills)
			rebuild() {
				for (const k of [...this.layers.children]) { k.geometry.dispose(); k.material.dispose(); this.layers.remove(k); }
				const fill = 0.92 * (1 - Math.exp(-this.total / 1800));
				let at = 0;
				for (const d of this.deposits) {
					const hgt = fill * d.v / Math.max(1, this.total);
					if (hgt < 0.002) { at += hgt; continue; }
					const u0 = at, u1 = at + hgt;
					const col = new THREE.Color(colour(d.i));
					const mesh = new THREE.Mesh(new THREE.CylinderGeometry(bulbR(u1) * 0.9, bulbR(u0) * 0.9, hgt * HG.bulb, 20), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.5 }));
					mesh.position.y = -HG.bulb + (u0 + u1) / 2 * HG.bulb;
					this.layers.add(mesh);
					at = u1;
				}
				this.fillTop = at;
			},
			// the night's sand, a cone in the top bulb, s (0..1) of the way up
			setNight(s) {
				s = Math.round(s * 100) / 100;
				if (s === this.sandS) return;
				this.sandS = s;
				this.nightSand.geometry.dispose();
				const hh = Math.max(0.001, s * 0.85);
				this.nightSand.geometry = new THREE.CylinderGeometry(bulbR(1 - hh) * 0.9, HG.neck * 0.9, hh * HG.bulb, 20);
				this.nightSand.position.y = hh * HG.bulb / 2;
				this.nightSand.visible = s > 0.01;
			},
			step(dt) {
				this.pour = Math.max(0, this.pour - dt * 1.5);
				if (this.flipAt >= 0 && dawnT >= this.flipAt) this.flip = Math.min(1, (dawnT - this.flipAt) / 1.4);
			},
		};
		h.rebuild();
		h.setNight(1);
		m.hourglasses.push(h);
		return h;
	}

	// a dream: a glowing heart in a soft bubble (in a tail, the bubble takes its catcher's colour)
	function makeDreamMesh(d) {
		const g = new THREE.Group();
		const col = new THREE.Color(d.col);
		const core = new THREE.Mesh(GEO.dream, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2) }));
		const bubble = new THREE.Mesh(GEO.bubble, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.5), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
		const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: col.clone().multiplyScalar(1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		halo.scale.setScalar(d.sweet ? 0.9 : 0.65);
		g.add(halo, bubble, core);
		if (d.sweet) g.scale.setScalar(1.3);
		const sh = new THREE.Mesh(GEO.shadow, MAT.shadow);
		sh.scale.setScalar(0.3);
		g.userData = { core, bubble, halo, col, shadow: sh };
		scene.add(sh);
		g.userData.dispose = () => scene.remove(sh);
		return g;
	}

	// the catchers: a round body in their colour, a nightcap, and a little net
	const cMeshes = [];
	function buildCatcher(n) {
		const col = new THREE.Color(colour(n));
		const g = new THREE.Group();
		const bodyMat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2, emissive: col, emissiveIntensity: 0.18 });
		const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), bodyMat);
		body.scale.set(1, 1.05, 0.95);
		body.position.y = 0.22;
		const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 16), bodyMat);
		cap.position.set(0, 0.5, -0.06);
		cap.rotation.x = -0.6;
		const brim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 20), MAT.white);
		brim.rotation.x = Math.PI / 2;
		brim.position.y = 0.37;
		const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }));
		pom.position.set(0, 0.6, -0.2);
		for (const s of [-1, 1]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), MAT.white);
			eye.position.set(s * 0.07, 0.28, 0.17);
			const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), MAT.dark);
			pupil.position.set(s * 0.07, 0.28, 0.21);
			g.add(eye, pupil);
		}
		// the net: a hoop on a stick, over one shoulder
		const net = new THREE.Group();
		const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), MAT.wood);
		stick.position.y = 0.21;
		const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.6, 2.4) }));
		hoop.position.y = 0.5;
		const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, wireframe: true }));
		mesh.position.y = 0.5;
		net.add(stick, hoop, mesh);
		net.position.set(0.2, 0.1, 0);
		net.rotation.z = -0.5;
		for (const k of [body, cap, brim]) { k.castShadow = true; g.add(k); }
		g.add(pom, net);
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.8), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
		ring.position.y = 0.015;
		const glow = new THREE.Mesh(GEO.glow, new THREE.MeshBasicMaterial({ map: TEX.soft, color: col.clone().multiplyScalar(0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		glow.scale.setScalar(1.3);
		glow.position.y = 0.012;
		const root = new THREE.Group();
		root.add(g, ring, glow);
		// the string through the tail, in their colour
		const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: 0.7 }));
		line.frustumCulled = false;
		scene.add(line);
		// where they're standing, faintly, in the villages they aren't in
		const marks = MAPS.map(() => {
			const k = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }));
			k.position.y = 0.02;
			scene.add(k);
			return k;
		});
		root.userData = { body: g, ring, bodyMat, line, marks };
		root.visible = false;
		scene.add(root);
		cMeshes[n] = root;
	}

	// birds, for the morning
	const birds = [];
	function buildBird() {
		const g = new THREE.Group();
		const mat = new THREE.MeshStandardMaterial({ color: pick([0x3a4a6a, 0x6a4a3a, 0x2a2a3a, 0xc85a3a]), roughness: 0.7 });
		const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
		body.scale.set(0.8, 0.8, 1.5);
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat);
		head.position.set(0, 0.03, 0.1);
		const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffb030 }));
		beak.position.set(0, 0.03, 0.15);
		g.add(body, head, beak);
		const wings = [];
		for (const s of [-1, 1]) {
			const p = new THREE.Group();
			const w = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.08), mat);
			w.position.x = s * 0.09;
			p.add(w);
			p.position.x = s * 0.03;
			g.add(p);
			wings.push({ p, s });
		}
		g.traverse((k) => { if (k.isMesh) k.castShadow = true; });
		g.visible = false;
		scene.add(g);
		return { g, wings };
	}
	mazes.forEach(function (m) {
		for (let k = 0; k < 8; k++) {
			const b = buildBird();
			b.maze = m.idx;
			b.delay = 4.6 + k * 0.25 + Math.random() * 0.6;
			b.lane = rand(-HALF + 1, HALF - 1);
			b.y = rand(1.8, 3.0);
			b.dir = Math.random() < 0.5 ? 1 : -1;
			b.speed = rand(2.2, 3.2);
			b.phase = Math.random() * 6;
			birds.push(b);
		}
	});

	/* the forest between the villages: a moat round each island, and woods
	   beyond it, with a path from every bridge off into the trees */

	const MOAT = HALF + 2.8;      // the moat runs out this far from a village's middle; the woods start here
	const REACH = LX / 2;         // each village's share of the woods, either side of it
	TEX.forest = canvasTexture(512, 512, function (c, w) {
		noiseFill(c, w, w, '#2a4a2a', 0.3, 16000, 41);
		let k = 9;
		for (let i = 0; i < 90; i++) {
			k = (k * 1103515245 + 12345) >>> 0;
			c.fillStyle = `rgba(${k % 2 ? '90,70,40' : '20,40,20'},0.25)`;
			c.beginPath(); c.arc(k % w, (k >>> 9) % w, 6 + (k >>> 20) % 18, 0, Math.PI * 2); c.fill();
		}
	});
	TEX.forest.wrapS = TEX.forest.wrapT = THREE.RepeatWrapping;
	const forestMat = new THREE.MeshStandardMaterial({ map: TEX.forest, roughness: 0.95 });
	const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.95 });
	const forestPaths = [];
	function forestBox(x0, x1, z0, z1) {
		const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1, z1 - z0), forestMat.clone());
		m.material.map = TEX.forest.clone();
		m.material.map.repeat.set((x1 - x0) / 6, (z1 - z0) / 6);
		m.material.map.needsUpdate = true;
		m.position.set((x0 + x1) / 2, -0.55, (z0 + z1) / 2);
		m.receiveShadow = true;
		scene.add(m);
	}
	for (const m of mazes) {
		const cx = m.cx;
		forestBox(cx - REACH, cx + REACH, -44, -MOAT);
		forestBox(cx - REACH, cx + REACH, MOAT, 44);
		forestBox(cx - REACH, cx - MOAT, -MOAT, MOAT);
		forestBox(cx + MOAT, cx + REACH, -MOAT, MOAT);
		// a path on from each bridge's far end
		for (const pad of m.pads) {
			const front = m.idx === FRONT;
			const side = pad.x < 0 ? -1 : 1;
			const x = front ? cx + side * (HALF + 5.5) : cx + pad.x, z = front ? pad.z : -(HALF + 5.5);
			const dx = front ? side : 0, dz = front ? 0 : -1;
			const len = 16;
			const path = new THREE.Mesh(new THREE.BoxGeometry(front ? len : 1.3, 0.04, front ? 1.3 : len), pathMat);
			path.position.set(x + dx * len / 2, -0.03, z + dz * len / 2);
			path.receiveShadow = true;
			scene.add(path);
			forestPaths.push({ x, z, dx, dz, len });
		}
	}
	// the trees: pines and round ones, as three instanced meshes (trunks, pine tops, round tops)
	{
		const cone = (r, h, y) => new THREE.ConeGeometry(r, h, 8).translate(0, y, 0);
		const pineGeo = mergeGeometries([cone(0.55, 0.8, 0.9), cone(0.42, 0.7, 1.3), cone(0.28, 0.6, 1.7)]);
		const roundGeo = mergeGeometries([new THREE.IcosahedronGeometry(0.55, 1).translate(0, 1.05, 0), new THREE.IcosahedronGeometry(0.38, 1).translate(0.3, 1.35, 0.1)]);
		const trunkGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.7, 6).translate(0, 0.35, 0);
		const spots = [];
		let k = 1234;
		const rnd = () => ((k = (k * 1664525 + 1013904223) >>> 0) / 4294967296);
		const nearPath = (x, z) => forestPaths.some((p) => {
			const u = clamp((x - p.x) * p.dx + (z - p.z) * p.dz, 0, p.len);
			return Math.hypot(x - (p.x + p.dx * u), z - (p.z + p.dz * u)) < 1.15;
		});
		for (const m of mazes) {
			for (let i = 0; i < 1100; i++) {
				const x = m.cx + (rnd() * 2 - 1) * REACH, z = (rnd() * 2 - 1) * 24;
				if (Math.abs(x - m.cx) < MOAT + 0.4 && Math.abs(z) < MOAT + 0.4) continue;
				if (nearPath(x, z)) continue;
				spots.push({ x, z, pine: rnd() < 0.55, s: 0.75 + rnd() * 0.6, a: rnd() * 6, tint: rnd() });
			}
		}
		const trunks = new THREE.InstancedMesh(trunkGeo, MAT.trunk, spots.length);
		const pines = new THREE.InstancedMesh(pineGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), spots.filter((t) => t.pine).length);
		const rounds = new THREE.InstancedMesh(roundGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), spots.filter((t) => !t.pine).length);
		const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
		let ip = 0, ir = 0;
		spots.forEach(function (t, i) {
			q.setFromAxisAngle(up, t.a);
			mat4.compose(new THREE.Vector3(t.x, -0.05, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
			trunks.setMatrixAt(i, mat4);
			if (t.pine) { pines.setMatrixAt(ip, mat4); pines.setColorAt(ip++, col.setHSL(0.36 + t.tint * 0.06, 0.45, 0.16 + t.tint * 0.08)); }
			else { rounds.setMatrixAt(ir, mat4); rounds.setColorAt(ir++, col.setHSL(0.27 + t.tint * 0.08, 0.45, 0.2 + t.tint * 0.08)); }
		});
		for (const im of [trunks, pines, rounds]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
	}

	/* the cameras: one a wall, each looking down on its own village */

	const PITCH = 60 * Math.PI / 180;
	const FOV = 36;
	const FWD = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)];
	const cams = FWD.map(function (f, i) {
		const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 140);
		fitCamera(cam, f, new THREE.Vector3((i - 1) * LX, 0, 0));
		return cam;
	});
	// After Temple of Coins: the village's near edge just above the score
	// capsules, its far edge just under the clock.
	function fitCamera(cam, f, centre) {
		const near = f.clone().multiplyScalar(-HALF).add(centre), far = f.clone().multiplyScalar(HALF).add(centre);
		const dir = new THREE.Vector3(f.x * Math.cos(PITCH), -Math.sin(PITCH), f.z * Math.cos(PITCH));
		const place = (d, aim) => {
			const target = f.clone().multiplyScalar(aim).add(centre);
			cam.position.copy(target).addScaledVector(dir, -d);
			cam.lookAt(target);
			cam.updateMatrixWorld();
		};
		const y = (v) => v.clone().project(cam).y;
		const TOP = 0.8, BOTTOM = -0.78;
		let lo = 4, hi = 90;
		for (let i = 0; i < 40; i++) {
			const d = (lo + hi) / 2;
			let a = -HALF, b = HALF;
			for (let j = 0; j < 40; j++) {
				const aim = (a + b) / 2;
				place(d, aim);
				if ((y(near) + y(far)) / 2 > (TOP + BOTTOM) / 2) a = aim; else b = aim;
			}
			place(d, (a + b) / 2);
			if (y(far) - y(near) > TOP - BOTTOM) lo = d; else hi = d;
		}
	}
	function views() {
		const w = renderer.domElement.width, h = renderer.domElement.height;
		return cams.map((camera, i) => {
			const x0 = Math.round(i * w / 3), x1 = Math.round((i + 1) * w / 3);
			return { camera, x: x0, y: 0, width: x1 - x0, height: h };
		});
	}
	const _v = new THREE.Vector3();
	// a point in village m (its own x, z) on its wall
	function proj(m, x, y, z) {
		_v.set(mazes[m].cx + x, y, z);
		return toScreen(_v, cams[m], m * W, 0, W, H) || { x: m * W + W / 2, y: H / 2 };
	}

	/* every frame: the 3D catches up with the game */

	let rt = 0;
	const tmpC = new THREE.Color();
	function lightAt(k) {
		// 0 night, 0.5 dawn, 1 morning
		const a = k < 0.5 ? NIGHT_LIGHT : DAWN_LIGHT, b = k < 0.5 ? DAWN_LIGHT : DAY_LIGHT, u = easeInOut(k < 0.5 ? k * 2 : (k - 0.5) * 2);
		hemi.color.copy(a.hemiSky).lerp(b.hemiSky, u);
		hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, u);
		hemi.intensity = lerp(a.hemi, b.hemi, u);
		moon.color.copy(a.sun).lerp(b.sun, u);
		moon.intensity = lerp(a.sunI, b.sunI, u);
		moon.position.copy(a.pos).lerp(b.pos, u);
		scene.environmentIntensity = lerp(a.env, b.env, u);
		renderer.toneMappingExposure = lerp(a.exp, b.exp, u);
	}
	const dawnK = () => (dawnT < 0 ? 0 : easeInOut(between(dawnT, 1.4, 7.5)));

	function update3D(dt) {
		rt += dt;
		const dk = dawnK();
		const sky = skyAt(dk);
		scene.background.set(sky.top);
		lakeU.uTime.value = rt;
		lakeU.uTop.value.set(sky.top);
		lakeU.uHor.value.set(sky.hor);
		lakeU.uStars.value = 1 - between(dk, 0.1, 0.6);
		lakeU.uGlint.value.setRGB(lerp(0.6, 1.6, dk), lerp(0.7, 1.2, dk), lerp(1.0, 0.7, dk));
		lightAt(dk);

		for (const m of mazes) {
			// windows, and the lamps
			for (const h of m.cottages) {
				const out = dawnT < 0 ? 0 : between(dawnT, h.outAt, h.outAt + 0.25);
				const flick = dawnT < 0 ? 1 + Math.sin(rt * 3 + h.c * 7) * 0.04 : 1;
				h.winMat.color.setRGB(lerp(2.6, 0.25, out) * flick, lerp(1.7, 0.3, out) * flick, lerp(0.6, 0.4, out) * flick);
				h.glow.material.opacity = (1 - out);
				// the villagers come out, stretch and wave
				const v = h.villager;
				if (dawnT >= h.wakeAt) {
					const k = dawnT - h.wakeAt;
					v.visible = true;
					const walk = easeOut(k / 0.7);
					v.position.set(h.door[0] * (h.dd + 0.1 + walk * 0.45), Math.abs(Math.sin(k * 9)) * 0.03 * (k < 0.7 ? 1 : 0), h.door[1] * (h.dd + 0.1 + walk * 0.45));
					v.scale.setScalar(1.25 * easeOut(k / 0.25));
					const [la, ra] = v.userData.arms;
					const stretch = between(k, 0.8, 1.3) * (1 - between(k, 2.2, 2.6));
					const wave = k > 2.4 ? Math.sin(k * 10) * 0.4 : 0;
					la.rotation.z = lerp(-0.2, -2.8, stretch);
					ra.rotation.z = lerp(0.2, 2.8, Math.max(stretch, k > 2.4 ? 0.85 : 0)) + wave;
					v.userData.body.scale.y = 1 + stretch * 0.12;
				} else v.visible = false;
			}
			for (const l of m.lamps) {
				const out = dawnT < 0 ? 0 : between(dawnT, l.outAt, l.outAt + 0.2);
				const f = (1 - out) * (1 + Math.sin(rt * 5 + l.group.position.x * 3) * 0.03);
				l.bulbMat.color.setRGB(lerp(0.3, 3.0, f), lerp(0.28, 2.2, f), lerp(0.25, 1.0, f));
				l.glow.material.opacity = f;
				l.halo.material.opacity = f;
			}
			if (m.bridgeArches) for (const a of m.bridgeArches) a.material.color.setRGB(1.6 + Math.sin(rt * 2) * 0.3, 1.3, 2.4 + Math.sin(rt * 2) * 0.3);
			// fireflies
			const F = m.flies;
			const pa = F.points.geometry.attributes.position, ca = F.points.geometry.attributes.color;
			const fade = 1 - between(dk, 0.05, 0.4);
			F.seeds.forEach(function (s, k) {
				const a = rt * s.s + s.a;
				pa.setXYZ(k, s.x + Math.sin(a) * s.r, s.y + Math.sin(a * 1.7) * 0.25, s.z + Math.cos(a * 0.8) * s.r);
				const b = Math.max(0, Math.sin(rt * (1.3 + s.s) + s.a * 3)) * fade;
				ca.setXYZ(k, 1.8 * b, 2.2 * b, 0.5 * b);
			});
			pa.needsUpdate = true;
			ca.needsUpdate = true;
			// the hourglasses
			for (const h of m.hourglasses) {
				h.setNight(dawnT >= 0 ? 0 : (phase === 'play' ? show.timeLeft() / SECONDS : 1));
				const flip = easeInOut(h.flip);
				h.g.rotation.z = flip * Math.PI;
				h.outer.position.y = Math.sin(flip * Math.PI) * 0.5;
				const top = -HG.bulb + (h.fillTop || 0) * HG.bulb;
				h.stream.visible = flip < 0.05 && (h.sandS > 0.01 || h.pour > 0);
				h.stream.scale.y = Math.max(0.01, -top);
				h.stream.position.y = top / 2;
				h.stream.material.opacity = 0.35 + h.pour * 0.6;
				h.ring.material.opacity = dawnT >= 0 ? 0.6 * (1 - between(dawnT, 1, 2)) : 0.45 + Math.sin(rt * 3) * 0.15 + h.pour * 0.4;
				h.ring.rotation.y = rt * 0.3;
				h.glow.material.opacity = 0.7 + h.pour + (dawnT >= 0 ? between(dawnT, 2.8, 3.2) * (1 - between(dawnT, 3.4, 6)) * 2 : 0);
				// a burst of the banked dreams set free, as it lands upside down
				if (h.flip >= 1 && !h.burst && h.total > 0) h.burst = makeBurst(h);
				if (h.burst) stepBurst(h.burst, dt);
			}
		}

		// dreams
		for (const d of dreams) {
			const u = d.mesh.userData;
			const pop = d.state === 'pop' ? Math.max(0, 1 - Math.max(0, d.t) / 1.2) : 1;
			const appear = d.state === 'rise' ? easeOut(d.t / 0.5) : 1;
			const shrink = d.state === 'bank' ? 1 - easeInOut(Math.max(0, d.t) / 0.6) * 0.7 : 1;
			const s = (d.sweet ? 1.3 : 1) * appear * shrink * (0.8 + pop * 0.2) * (1 + Math.sin(rt * 4 + d.seed) * 0.06);
			d.mesh.scale.setScalar(Math.max(0.001, s));
			d.mesh.position.set(mazes[d.maze].cx + d.x, d.y, d.z);
			const owned = d.owner >= 0;
			u.halo.material.color.copy(owned ? tmpC.set(colour(d.owner)) : u.col).multiplyScalar((owned ? 1.4 : 1.1) * pop);
			u.bubble.material.color.copy(owned ? tmpC.set(colour(d.owner)) : u.col).multiplyScalar(0.5 * pop);
			u.core.material.color.copy(u.col).multiplyScalar(2.2 * pop);
			u.shadow.position.set(mazes[d.maze].cx + d.x, 0.015, d.z);
			u.shadow.visible = d.state !== 'pop' && d.state !== 'bank';
		}

		// catchers
		for (let i = 0; i < count; i++) {
			const e = cat[i], m = cMeshes[i];
			if (!m) continue;
			m.visible = e.seen;
			const u = m.userData;
			u.marks.forEach((k, w) => { k.visible = e.seen && w !== e.maze; k.position.set(mazes[w].cx + e.x, 0.02, e.z); });
			if (!e.seen) { u.line.visible = false; continue; }
			const cx = mazes[e.maze].cx;
			m.position.set(cx + e.x, 0, e.z);
			u.body.rotation.y = e.face;
			const pop = 1 - e.crossT / 0.6;
			const sc = 1.35 * easeOut(pop * 1.4) * (1 + Math.sin(pop * Math.PI) * 0.2);
			if (e.dizzy > 0) {
				u.body.rotation.y = e.face + rt * 10;
				u.body.rotation.z = Math.sin(rt * 14) * 0.25;
			} else u.body.rotation.z = Math.sin(e.walk) * 0.12;
			u.body.scale.setScalar(Math.max(0.001, sc));
			u.body.position.y = Math.abs(Math.sin(e.walk)) * 0.05;
			u.ring.scale.setScalar(1.35 * (1 + e.bankFlash * 1.2));
			u.ring.material.opacity = e.cutSafe > 0 && Math.sin(rt * 20) > 0 ? 0.3 : 0.9;
			// the tail's string
			if (e.tail.length) {
				const pts = [new THREE.Vector3(cx + e.x, 0.35, e.z)].concat(e.tail.map((d) => new THREE.Vector3(cx + d.x, d.y, d.z)));
				u.line.geometry.setFromPoints(pts);
				u.line.visible = true;
			} else u.line.visible = false;
		}

		// birds
		for (const b of birds) {
			const k = dawnT < 0 ? -1 : dawnT - b.delay;
			b.g.visible = k > 0;
			if (k <= 0) continue;
			const span = HALF + 4;
			let x = -span + ((k * b.speed) % (span * 2));
			x *= b.dir;
			const fwd = b.maze === FRONT ? [b.dir, 0] : [0, b.dir];   // (across each wall's picture)
			const px = b.maze === FRONT ? x : b.lane + Math.sin(k + b.phase) * 0.5;
			const pz = b.maze === FRONT ? b.lane + Math.sin(k + b.phase) * 0.5 : x;
			b.g.position.set(mazes[b.maze].cx + px, b.y + Math.sin(k * 3 + b.phase) * 0.15, pz);
			b.g.rotation.y = Math.atan2(fwd[0], fwd[1]);
			const flap = Math.sin(k * 18 + b.phase) * 0.8;
			for (const w of b.wings) w.p.rotation.z = w.s * flap;
		}
	}

	// a burst of colourful sparks, rising out of an hourglass as it lands
	function makeBurst(h) {
		const n = 60;
		const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
		const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.14, map: TEX.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
		pts.frustumCulled = false;
		const parts = [];
		const cols = h.deposits.length ? h.deposits.map((d) => new THREE.Color(colour(d.i))) : [new THREE.Color(LILAC)];
		for (let k = 0; k < n; k++) {
			const c = pick(cols);
			parts.push({ x: 0, y: 1.4, z: 0, vx: rand(-1, 1), vy: rand(1.5, 3.5), vz: rand(-1, 1), c });
		}
		pts.position.set(h.x, 0, h.z);
		mazes[h.maze].group.add(pts);
		return { pts, parts, t: 0 };
	}
	function stepBurst(b, dt) {
		b.t += dt;
		const pa = b.pts.geometry.attributes.position, ca = b.pts.geometry.attributes.color;
		const fade = Math.max(0, 1 - b.t / 4);
		b.parts.forEach(function (p, k) {
			p.vy -= dt * 0.8;
			p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
			pa.setXYZ(k, p.x, p.y, p.z);
			ca.setXYZ(k, p.c.r * 2 * fade, p.c.g * 2 * fade, p.c.b * 2 * fade);
		});
		pa.needsUpdate = true;
		ca.needsUpdate = true;
	}

	/* ---------- drawing (every animation frame) ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		update3D(show.paused ? 0 : dt);
		post.render(views());
		show.frame(ctx, dt, drawWorld);
	};

	const label = (ctx, str, x, y, size, fill, alpha = 1) => art.text(ctx, str, x, y, { size, weight: 800, font: FONT, fill, outline: INK, outlineWidth: Math.max(4, size * 0.18), alpha });

	// the stars, over every wall's far edge (the sun, in the morning)
	const STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.8, 2.4), a: Math.random() * 6 }));
	function drawSky(ctx, w) {
		const dk = dawnK();
		const sky = skyAt(dk);
		const x0 = w * W, BAND = 112;
		const g = ctx.createLinearGradient(0, 0, 0, BAND);
		g.addColorStop(0, sky.top);
		g.addColorStop(0.6, sky.hor + 'cc');
		g.addColorStop(1, sky.hor + '00');
		ctx.fillStyle = g;
		ctx.fillRect(x0, 0, W, BAND);
		const starA = 1 - between(dk, 0.1, 0.55);
		if (starA > 0) {
			for (const s of STARS) {
				const tw = 0.5 + 0.5 * Math.sin(rt * (1 + s.s) + s.a);
				ctx.globalAlpha = starA * tw * (1 - s.y * 0.6);
				ctx.fillStyle = '#fffbe8';
				ctx.beginPath(); ctx.arc(x0 + s.x * W, s.y * BAND * 0.8, s.s, 0, Math.PI * 2); ctx.fill();
			}
			ctx.globalAlpha = 1;
			// the moon (a crescent), sinking at dawn
			const my = 44 + between(dk, 0, 0.5) * 90;
			const mx = x0 + W * (w === 0 ? 0.2 : w === 1 ? 0.82 : 0.6);
			ctx.save();
			ctx.globalAlpha = starA;
			ctx.shadowColor = MOON; ctx.shadowBlur = 24;
			ctx.fillStyle = MOON;
			ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
			ctx.shadowBlur = 0;
			ctx.globalCompositeOperation = 'destination-out';
			ctx.beginPath(); ctx.arc(mx + 10, my - 6, 19, 0, Math.PI * 2); ctx.fill();
			ctx.restore();
		}
		if (dk > 0.15) {
			// the sun, rising
			const sy = lerp(150, 50, easeOut(between(dk, 0.15, 0.9)));
			const sx = x0 + W * 0.28;
			const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
			glow.addColorStop(0, 'rgba(255,240,180,0.9)');
			glow.addColorStop(1, 'rgba(255,180,100,0)');
			ctx.fillStyle = glow;
			ctx.fillRect(sx - 120, Math.max(0, sy - 120), 240, 240);
			ctx.fillStyle = '#fff3c0';
			ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
		}
	}

	// words over the 3D, on every wall
	function drawWorld(ctx) {
		if (!count && phase === 'off') {
			for (let w = 0; w < 3; w++) drawSky(ctx, w);
			return;
		}
		const playing = phase === 'tutorial' || phase === 'play';
		for (let w = 0; w < 3; w++) {
			const m = mazes[w];
			ctx.save();
			ctx.beginPath();
			ctx.rect(w * W, 0, W, H);
			ctx.clip();
			drawSky(ctx, w);
			// sleepers' Zzz, over the roofs
			if (dawnT < 0) {
				for (const h of m.cottages) {
					const k = ((rt * 0.35 + h.zzz) % 1);
					const p = proj(w, h.x + 0.2 + k * 0.4, 1.4 + k * 1.0, h.z);
					label(ctx, 'z', p.x, p.y, 18 + k * 16, '#c8d4ff', Math.sin(k * Math.PI) * 0.75);
				}
			}
			if (playing || phase === 'intro') {
				// the village's name, and who's in it
				const here = cat.map((e, i) => i).filter((i) => cat[i].seen && cat[i].maze === w);
				const nx = w * W + W * [0.2, 0.27, 0.8][w];   // (between the clock and the corner without a bridge)
				art.text(ctx, m.name, nx, 40, { size: 28, weight: 800, font: TITLE_FONT, fill: w === FRONT ? MOON : LILAC, outline: INK, outlineWidth: 6 });
				here.forEach((i, k) => art.circle(ctx, nx + (k - (here.length - 1) / 2) * 28, 74, 10, { fill: colour(i), stroke: INK, lineWidth: 3 }));
				if (shower.maze === w) label(ctx, 'DREAM SHOWER! ' + Math.ceil(shower.t), nx, 104, 22, Math.sin(rt * 8) > 0 ? '#ff9ad6' : MOON);
				// the bridges
				for (const pad of m.pads) {
					const p = proj(w, pad.x, 1.1, pad.z);
					label(ctx, 'TO ' + mazes[pad.to].short, p.x, p.y, 22, w === FRONT ? LILAC : MOON, 0.9);
				}
				// the hourglasses
				for (const h of m.hourglasses) {
					const p = proj(w, h.x, 1.9, h.z);
					label(ctx, 'BANK HERE', p.x, p.y, 24, MOON, 0.85 + Math.sin(rt * 3) * 0.15);
				}
			}
			// each catcher: what they carry, their state
			for (let i = 0; i < count; i++) {
				const e = cat[i];
				if (!e.seen) continue;
				if (e.maze !== w) {
					if (!playing) continue;
					const p = proj(w, e.x, 0.3, e.z);
					label(ctx, mazes[e.maze].short, p.x, p.y, 16, colour(i), 0.55);
					continue;
				}
				const p = proj(w, e.x, 0.95, e.z);
				if (e.dizzy > 0) { label(ctx, '✶ ✶ ✶', p.x, p.y - 4, 22, '#ffe08a', 0.9); continue; }
				if (!e.tail.length) continue;
				const k = chainOf(e.tail.length);
				label(ctx, String(e.tail.length) + (k > 1 ? '  ×' + k : ''), p.x, p.y, 28, k > 1 ? MOON : 'white');
			}
			// numbers rising
			for (const f of floaters) {
				if (f.maze !== w) continue;
				const p = proj(w, f.x, 0.9 + f.t * 0.9, f.z);
				label(ctx, f.text, p.x, p.y, 30 * f.size, f.fill, clamp(2 - f.t * 1.4, 0, 1));
			}
			ctx.restore();
		}
	}

	function drawBanner(ctx) {
		if (!banner || banner.t > 3.4) return;
		const a = clamp((3.4 - banner.t) / 0.5, 0, 1);
		show.onWalls(ctx, function (c) {
			show.slam(c, banner.title, W / 2, 300, 88, banner.t, { font: TITLE_FONT, exact: true, fill: LILAC, alpha: a });
			if (banner.sub) show.slam(c, banner.sub, W / 2, 395, 46, banner.t - 0.4, { fill: 'white', alpha: a });
		});
	}

	// the catcher, flat, for the show's screens
	function drawCatcher2D(ctx, n, x, y, size) {
		const r = size * 0.36;
		const cy = y - r * 1.05;
		art.circle(ctx, x, y - 2, r * 0.9, { fill: 'rgba(0,0,0,0.25)' });
		art.circle(ctx, x, cy, r, { fill: colour(n), stroke: INK, lineWidth: Math.max(3, size * 0.04) });
		ctx.save();
		ctx.fillStyle = colour(n);
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(3, size * 0.04);
		ctx.beginPath();
		ctx.moveTo(x - r * 0.8, cy - r * 0.55);
		ctx.quadraticCurveTo(x - r * 0.1, cy - r * 2.0, x + r * 1.1, cy - r * 1.3);
		ctx.lineTo(x + r * 0.8, cy - r * 0.55);
		ctx.closePath();
		ctx.fill(); ctx.stroke();
		ctx.fillStyle = 'white';
		ctx.beginPath(); ctx.ellipse(x, cy - r * 0.55, r * 0.9, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
		ctx.beginPath(); ctx.arc(x + r * 1.1, cy - r * 1.3, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
		ctx.restore();
		for (const s of [-1, 1]) {
			art.circle(ctx, x + s * r * 0.33, cy + r * 0.05, r * 0.2, { fill: 'white', stroke: INK, lineWidth: 2 });
			art.circle(ctx, x + s * r * 0.33, cy + r * 0.08, r * 0.09, { fill: INK });
		}
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	/* ---------- debug ---------- */

	if (show.menu && show.menu.drow) {
		const $row = show.menu.drow('DREAMS');
		show.menu.dbutton('SHOWER', function () {
			if (!count) return;
			if (show.beat !== 'play') show.go('play');
			shower.next = 0;
		}, LILAC).appendTo($row);
		show.menu.dbutton('DAWN', function () {
			if (!count) return;
			if (show.beat !== 'play') show.go('play');
			show.setTimeLeft(3);
		}, '#ffd36a').appendTo($row);
	}

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(),
		phase,
		mazes: cat.map((e) => e.maze),
		tails: cat.map((e) => e.tail.length),
		dreams: mazes.map((m) => dreams.filter((d) => d.maze === m.idx && d.owner === -1).length),
		banked: mazes.map((m) => m.hourglasses.map((h) => h.total)),
		dawn: dawnT,
	});

	self.test = {
		skipTo(id) { show.go(id); },
		jump(id) { show.go(id); },
	};

	self.fini = function () {
		unlisten();
		show.fini();
		post.dispose();
		envTex.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
