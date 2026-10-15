/*
 * Red Light Green Light
 *
 * A long sandy field, the giant doll at the far end. While her back is
 * turned (GREEN LIGHT) the view creeps up the field and every player's
 * contestant moves with it; players step left and right (and forward and
 * back) to slip around each other and the obstacles. When she turns round
 * (RED LIGHT) everything stops and every contestant's feet are stuck where
 * they are: any movement bends them off balance, and too much gets them
 * shot. Cross the red line at her feet to survive the round. Rounds keep
 * coming, each longer and meaner, for ten minutes of play.
 *
 * Scoring, in won (₩): ₩100 for every wad of cash picked up, and ₩1,000
 * for completing a round (crossing the line). Anyone shot is back for the next round.
 *
 * The show, in order (see the beats at the bottom, and shared/showtime.js
 * for the generic ones): the squad picker over the dimmed field; the
 * ten-minute clock slamming in; the controls, one at a time, with the
 * whole field in view and no doll yet (practice cash to grab,
 * a practice red light with no shooting, practice jump pads there and back);
 * the doll, the camera tight on her face, YOUNG-HEE, her head turning away
 * and the camera pulling back down the field; GREEN LIGHT and the rounds;
 * TIME!; everyone's scores; the ranking onto a podium; the team total; the
 * day's leaderboard; and a fast-forward replay of where everyone ran.
 *
 * Jump pads and cash: glowing pads sit at the corner ends of the walls all
 * the way up the track, marked with arrows; step on one and you jump
 * straight round the corner onto the next wall, and play on there. Little
 * wads of cash lie all over the field, ₩100 each to whoever walks over
 * them, and here and there a magnet: grab one and for a couple of seconds
 * the cash on your wall slides to you. On the last leg the track stops short
 * of the line, and there's a dash to cross it before her head comes round.
 *
 * Every contestant lives on a wall (left, front or right) and plays along
 * it 1:1, its depth the player's distance from that wall.
 *
 * The field runs on across all three walls: blocks, patrolling guards and
 * rolling marbles on every wall, armed guards at the far ends.
 *
 * The game is played on a flat plane, x across all three walls (0..4800),
 * f up the field toward the doll. The foreground is flat, 1:1; further up,
 * the field curves away to a horizon high on the walls, under a painted sky,
 * so the doll is always there at the far end, small on the horizon and
 * growing as the field scrolls toward her. Across stays 1:1 everywhere, so
 * each contestant stands on their wall exactly where their player stands in
 * the room. While she's small, an inset at the top of the front wall shows
 * her head close up.
 *
 * Input: px (left / right), pz (forward / back). On the front wall px is
 * the position along it and pz how near it the player stands (1 right up
 * at the wall steps a few metres up the field); on the left wall pz is
 * along it and 1 - px how near; on the right wall 1 - pz along, px near.
 * On the desk simulator, clicking a wall of the box skips the selected
 * player's contestant onto that wall straight away (a testing control:
 * it skips the line check for that red light).
 * An ES module (manifest: module: true) for the shared synthesised sound.
 */
import { createSound } from '../../shared/squid-game/sound.js';

IGB.register('red-light-green-light', function RedLightGreenLightGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	const M = 55;               // field units per metre (about the front wall's pixels per metre too)
	const BACK = 70;            // a player at the back of the room stands this far up from the near edge
	const DEPTH = 800;          // and right up at the front wall, this much further
	const MOVE_LIMIT = 0.04;    // how far a player may drift on red light, as a share of the wall, before they're out (the lean grows toward it)
	const GRACE = 0.2;          // seconds after RED LIGHT before movement counts (tracking lag)
	const TURN_AWAY = 0.8;      // seconds her head takes to turn away after a red light, before GREEN LIGHT
	const BODY = 30;            // a contestant's radius on the plane
	const LANE = 30;            // contestants keep this far inside their wall's ends
	const WALL_ORDER = [1, 0, 2];             // hazards are shared out front, left, right, front...
	const BLOCK = 116;                        // a square block, side to side: scattered in short runs (a run is one long block)
	const BLOCK_LOOK = { chamfer: 0.22, symbol: 0.52, line: 7, light: [-0.6, 0.8] };   // its corners cut off (a share of its depth); the shape on top (a share of its depth); that shape's line width; where the light comes from across the field (left, far)
	const SHADOW = { x: 0.55, f: -0.7, layers: 6, dark: 0.075, spread: 16, contact: 0.2 };   // a block's shadow: how far it falls across and down the field for its height; soft layers; each one's darkness; how much it blurs out toward its tip; the dark line where it meets the sand
	const SENTRY_END = 260;                   // the side walls' far ends belong to the armed guards

	// Where a guard or marble on a wall may roam: that wall only, so nothing
	// ever crosses a seam.
	function patrolOn(wall, margin = 50) {
		const lo = wall * W + (wall === 0 ? SENTRY_END : margin);
		const hi = (wall + 1) * W - (wall === 2 ? SENTRY_END : margin);
		return [lo, hi];
	}
	const START_F = H / 2;      // the white start line: halfway up the walls as each round starts
	const FINISH_GAP = 90;      // from the red finish line to the doll's feet: she stands right behind it
	const DOLL_X = 1.5 * W;
	// The clock on each wall, a capsule hung from the top edge: on the
	// front wall near the top left corner; on the side walls toward the back
	// corner, a quarter of the wall in from it, with the doll-head inset under it.
	const CLOCK_AT = [{ x: W / 4, y: 44, hang: true }, { x: 175, y: 44, hang: true }, { x: W * 3 / 4, y: 44, hang: true }];   // (hung from the top edge)
	const INSET = { x: 2 * W - 150, y: 125, r: 92, side: 205 };   // the doll-head inset: top right of the front wall; on the side walls (at y side), under the clock

	// Jump pads and cash
	const PAD = { rx: 95, rf: 40, every: 420 };   // a pad's half-width and half-depth; one every so far up the track (field units)
	const CASH = { every: 300, reach: 60, size: 1.8, float: 50, bob: 22 };   // every so far up each wall; how close to grab it; its size, float height and bob
	const MAGNET = { every: 1400, time: 2.5, radius: 480, pull: 1200 };   // a magnet every so far up each wall; seconds it lasts; how far it reaches; how fast cash comes
	const BOULDER = { from: 1, gap: [4, 9], quicker: 0.9, r: [75, 105], speed: [320, 440], ahead: 1700, lead: 900, down: 1.2, spill: 3 };   // boulders from this round (0 is round 1); seconds between them, shrinking by this much a round; their size; how fast they roll; how far up the field they start (and never nearer the players than lead); seconds flattened; wads of cash spilled
	const BAG = { every: 1700, count: 9, near: 110, radius: 380, fly: 0.75, arc: 240 };   // a money bag every so far up each wall; wads it bursts into; how near and far they land; seconds in the air; how high they fly
	const LASER = { hop: 1.2, follow: 20, wobble: 14, search: 50, rx: 150, rf: 60, glow: 50 };   // red light's target: seconds per contestant, how quickly it follows, its jitter, how far it searches round them, its half-width and half-depth, its glow
	const EDGE_AT = 0.1;        // a pad's centre, as a share of the wall from the corner
	const HOP = 0.5;            // seconds to skip across a corner onto the next wall
	const WALL_NAMES = ['LEFT', 'FRONT', 'RIGHT'];

	// Each green light: the track scrolls a leg at a moderate pace (dodge the
	// blocks coming at you, grab the cash), stops, and her head comes round.
	// On the last leg, there's a dash for the line first. Each round is a
	// little longer, quicker, with less warning and more danger.
	function settingsFor(r) {
		const loops = Math.min(9, 3 + r);                 // green lights it should take
		const speed = Math.min(2.5, 1.6 + 0.12 * r);      // metres per second while the track scrolls
		const leg = [9, 13];                              // metres scrolled each green light
		return {
			loops,
			speed: speed * M,                              // field units per second
			leg: leg.map((m) => m * M),
			dash: Math.max(2.6, 4.5 - 0.25 * r),           // on the last leg, seconds to race for the line once it stops
			warning: Math.max(0.45, 1.5 - 0.15 * r),       // seconds her head takes to turn round
			red: [2.5, 4.5],                               // seconds she watches
			length: loops * (leg[0] + leg[1]) / 2 * M,
			blockDensity: 0.6 + 0.15 * r,                  // blocks per 9 m of field
			guards: Math.min(4, r),                        // patrolling guards (deadly), from round 2
			guardSpeed: (1.1 + 0.2 * r) * M,
			marbles: Math.max(0, Math.min(4, r - 1)),      // rolling marbles (deadly), from round 3
			marbleSpeed: (2.6 + 0.4 * r) * M,
			boulderGap: r < BOULDER.from ? 0 : Math.max(2, BOULDER.gap[0] - BOULDER.quicker * (r - BOULDER.from)),   // seconds between boulders (0: none yet)
		};
	}

	const POINTS = { cash: 100, finish: 1000 };   // in won (₩): a wad of cash; completing a round (crossing the line)
	const won = (n) => '₩' + n.toLocaleString('en-US');
	const ROUND_GAP = {
		look: 1.4,            // each round opens on the doll, facing the players: ROUND N...
		sweep: 2.0,           // ...then the view scrolls back down the field to the start
		cleared: 5.2,         // the banner after a round (and everyone's totals)
		payFrom: 0.7,         // then each survivor's ₩1,000 for completing it, from this long in...
		payEach: 0.35,        // ...one after another
		quick: 2.6,           // ...or, when nobody made it, before the same round starts again
	};

	/* ---------- tuning: the controls intro ---------- */

	const CONTROLS = {
		steps: [
			{ id: 'move', caption: 'MOVE LEFT AND RIGHT', min: 2.5, max: 5 },
			{ id: 'step', caption: 'STEP FORWARD AND BACK', min: 2.5, max: 5 },
			{ id: 'cash', caption: 'GRAB THE CASH', min: 2, max: 6 },
			{ id: 'freeze', caption: 'FREEZE ON RED LIGHT', min: 5.6, max: 6.5 },
			{ id: 'jump', caption: 'JUMP PADS SWITCH YOUR WALL', min: 2, max: 8 },
		],
		nice: 1.1,            // the NICE! once a step is done, before the next
		moved: 0.35,          // how far along their wall (per contestant) counts as moving
		stepped: 0.3,         // and how far toward and away from it
		red: [1.5, 5.0],      // the practice red light: on, then off (no shooting)
		cashEvery: 160,       // practice cash, every so far up each wall
		grab: 1,              // wads each player picks up to pass the cash step
	};

	/* ---------- tuning: the doll's entrance ---------- */

	const ENTRANCE = {
		zoom: 3.4,            // the camera starts this tight on her face
		eyes: 1.3,            // her ring eyes light up red
		name: 1.7,            // YOUNG-HEE slams in
		turn: 3.8,            // her head turns away
		turnFor: 1.3,
		pull: 5.0,            // the camera pulls back from her face
		pullFor: 1.1,
		fly: [5.5, 8.5],      // then flies back down the field to the contestants
		round: 8.6,           // ROUND 1, once the view is back at the start...
		go: 9.8,              // ...and only then GREEN LIGHT!
		length: 11.2,
	};

	/* ---------- the view ---------- */

	// The plane: flat in the foreground, one field unit one unit up the wall at
	// one size (SCALE), then, past VIEW.flat, it curves away over the brow of
	// the world to a horizon line high on the walls: the field further on
	// squeezes up toward the horizon and everything on it shrinks (never below
	// VIEW.least), so the doll is always there at the far end, growing as the
	// field scrolls toward her. Across stays 1:1 everywhere. Far things fade
	// into the haze (the doll, her tree and the finish line never do).
	// `cam` is the field distance at the bottom of the walls, and scrolls up.
	const SCALE = 0.75;         // the size of everything on the flat
	const VIEW = {
		flat: 560,              // the flat foreground: this far up the field from the bottom of the walls
		horizon: 205,           // the horizon line, from the top of the walls
		least: 0.18,            // things far off shrink to this share of their size, and no smaller
		shrink: 900,            // how quickly they shrink past the flat (field units)
		haze: [1500, 2700],     // past the flat, things fade out over this stretch
	};
	const INK = '#1a1a1a';     // for drop shadows on words

	let cam = 0;

	// the bend: past the flat, field distance runs out toward the horizon (its
	// slope matching the flat's where they meet, so there's no crease)
	const BEND = H - VIEW.flat - VIEW.horizon;
	const beyond = (f) => Math.max(0, f - cam - VIEW.flat);
	const planeY = function (f) {
		const d = f - cam;
		if (d <= VIEW.flat) return H - d;
		return H - VIEW.flat - BEND * (1 - Math.exp(-(d - VIEW.flat) / BEND));
	};
	const scaleAt = (f) => SCALE * (VIEW.least + (1 - VIEW.least) * Math.exp(-beyond(f) / VIEW.shrink));
	// Across, things far off draw in toward their wall's vanishing point as
	// they shrink (none of that in the flat foreground, where it's 1:1): the
	// front wall's in its middle; each side wall's at its corner with the front
	// wall, as if looking along it. Each wall keeps its own.
	const vanishOf = (wall) => (wall === 0 ? W : wall === 2 ? 2 * W : 1.5 * W);
	const wallOfX = (x) => Math.max(0, Math.min(2, Math.floor(x / W)));
	const at = function (x, f, up = 0, wall = wallOfX(x)) {
		const s = scaleAt(f);
		const vp = vanishOf(wall);
		return { x: vp + (x - vp) * (s / SCALE), y: planeY(f) - up * s, s };
	};
	// how much of a thing shows through the haze; and whether it's worth drawing
	const fadeIn = (f) => 1 - Math.max(0, Math.min(1, (beyond(f) - VIEW.haze[0]) / (VIEW.haze[1] - VIEW.haze[0])));
	const onView = (f) => planeY(f) < H + 320 && fadeIn(f) > 0;
	const horizonY = () => VIEW.horizon;

	/* ---------- the field ---------- */

	let settings = settingsFor(0);
	let finishF = 0;
	let dollF = 0;
	let camEnd = 0;
	let blocks = [];         // { x, f, rx, r, h, shape, colour, symbol }: rx across, r up the field (half-sizes)
	let movers = [];         // patrolling guards and rolling marbles
	let boulders = [];       // { x, f, r, speed, spin, wall, shade }: rolling down the field at the players
	let boulderIn = 0;       // seconds to the next one
	let boulderWall = 0;
	let sentries = [];       // armed guards along the sides: { x, f, mask, flash }
	let splats = [];         // { x, f, t, seed }
	const SHAPES = ['circle', 'triangle', 'square'];
	const SHAPE_COLOURS = ['#f05a8d', '#23a39a', '#f2b134', '#8f6fd8'];
	const MARBLE_COLOURS = ['#ff4f6d', '#2bb3a6', '#f6b02c', '#6e57d6'];

	let noBlocks = false;   // (tests only)
	function buildField(r) {
		settings = settingsFor(r);
		finishF = START_F + 255 + settings.length;
		dollF = finishF + FINISH_GAP;
		camEnd = finishF - BACK - DEPTH * 0.45;   // the last stop: the finish line part way up the play area
		blocks = [];
		movers = [];
		boulders = [];
		boulderIn = 2;
		sentries = [];
		splats = [];
		pads = [];
		cash = [];
		magnets = [];
		bags = [];
		bursts = [];

		// Blocks scattered in loose bands across every wall: on each wall, a few
		// short runs one to three blocks long at odd places along it (each run one
		// long block), nudged up or down the field, so you weave rather than queue
		// for a gap. The bands stay apart, leaving lanes for the guards and marbles.
		const rows = Math.max(1, Math.round(settings.length / M / 12 * settings.blockDensity * 1.4));
		const first = START_F + 330;   // (nothing in the way until past the start line)
		const last = finishF - 280;
		const spacing = rows === 1 ? last - first : (last - first) / (rows - 1);
		const nudge = Math.min(110, spacing * 0.2);
		const rowFs = [];
		for (let i = 0; i < rows && first < last && !noBlocks; i++) {
			const f = first + (last - first) * (rows === 1 ? 0.5 : i / (rows - 1)) + (Math.random() - 0.5) * 60;
			rowFs.push(f);
			for (let wall = 0; wall < 3; wall++) {
				const n = Math.floor(W / BLOCK);
				const x0 = wall * W + (W - n * BLOCK) / 2 + BLOCK / 2;
				const taken = new Array(n).fill(false);
				const runs = 2 + Math.floor(Math.random() * 3);
				for (let k = 0, tries = 0; k < runs && tries < 30; tries++) {
					const len = 1 + Math.floor(Math.random() * 3);
					const j0 = Math.floor(Math.random() * (n - len + 1));
					// a clear slot either side, so runs never merge into a wall
					let free = true;
					for (let j = j0 - 1; j <= j0 + len; j++) if (taken[j]) free = false;
					if (!free) continue;
					const runF = f + (Math.random() * 2 - 1) * nudge;
					const colour = SHAPE_COLOURS[Math.floor(Math.random() * SHAPE_COLOURS.length)];
					for (let j = j0; j < j0 + len; j++) taken[j] = true;
					blocks.push({ x: x0 + (j0 + (len - 1) / 2) * BLOCK, f: runF, rx: len * BLOCK / 2, r: BLOCK / 2, h: 84, shape: 'square', colour, gapRow: i, symbol: SHAPES[Math.floor(Math.random() * SHAPES.length)] });
					k++;
				}
			}
		}

		// Patrolling guards and rolling marbles keep to the open lanes between
		// the walls (and before the first), each on its own wall.
		const lanes = [first - 260];
		for (let i = 1; i < rowFs.length; i++) lanes.push((rowFs[i - 1] + rowFs[i]) / 2);
		const laneOf = (i) => lanes[i % lanes.length] + (Math.random() - 0.5) * 40;
		for (let i = 0; i < settings.guards; i++) {
			const f = laneOf(i + 1);
			const [lo, hi] = patrolOn(WALL_ORDER[i % 3]);
			movers.push({ kind: 'guard', mask: SHAPES[i % 3], lo, hi, x: lo + Math.random() * (hi - lo), f, dir: Math.random() < 0.5 ? -1 : 1, speed: settings.guardSpeed * (0.8 + Math.random() * 0.4), r: 22, phase: Math.random() * 6 });
		}
		for (let i = 0; i < settings.marbles; i++) {
			const f = laneOf(i + 2);
			const [lo, hi] = patrolOn(WALL_ORDER[(i + 1) % 3]);
			movers.push({ kind: 'marble', colour: MARBLE_COLOURS[i % MARBLE_COLOURS.length], lo, hi, x: lo + Math.random() * (hi - lo), f, dir: Math.random() < 0.5 ? -1 : 1, speed: settings.marbleSpeed * (0.8 + Math.random() * 0.4), r: 56, spin: 0 });
		}

		// Jump pads up the track, and cash all over it.
		layPads(START_F + 200, finishF - 150, PAD.every);
		layCash(START_F + 80, finishF - 60, CASH.every);
		layMagnets(START_F + 500, finishF - 200, MAGNET.every);
		layBags(START_F + 700, finishF - 300, BAG.every);

		// Armed guards line the far ends of the side walls (out of the way
		// of the contestants playing there), and two flank the doll.
		let i = 0;
		for (let f = 160; f < dollF - 150; f += 520) {
			sentries.push({ x: 70 + Math.random() * 60, f, mask: SHAPES[i++ % 3], flash: 0 });
			sentries.push({ x: WIDTH - 130 + Math.random() * 60, f: f + 260, mask: SHAPES[i++ % 3], flash: 0 });
		}
		sentries.push({ x: DOLL_X - 330, f: dollF - 20, mask: 'square', flash: 0, doll: true });
		sentries.push({ x: DOLL_X + 330, f: dollF - 20, mask: 'circle', flash: 0, doll: true });
	}

	/* ---------- contestants ---------- */

	const NUMBERS = ['456', '218', '067', '001', '199', '240'];
	let contestants = [];
	let players = 0;

	function Contestant(n) {
		return {
			n,
			number: NUMBERS[n] || String(n + 1).padStart(3, '0'),
			score: 0,
			px: (n + 1) / (players + 1),
			pz: 0.5,
			x: 0, f: 0, lastX: 0, lastF: 0,
			alive: true,
			safe: false,
			glue: null,          // { x, f, px, pz } while red light holds them
			over: 0,             // how long they've been past the movement limit
			walk: 0,
			moving: 0,
			lean: { x: 0, z: 0 },
			fall: null,          // set when shot
			wall: 1,             // the wall they play on: 0 left, 1 front, 2 right
			offPad: true,        // clear of the jump pads (they must step off one before another works)
			grabbed: 0,          // wads of cash picked up in the controls intro
			magnet: 0,           // seconds of magnet left: cash on their wall comes to them
			hop: null,           // { t, x0, f0 } while skipping across a corner
			lift: 0,             // how high off the sand they are, mid-skip
			pass: false,         // moved walls from the desk: let off the line check until the next green light
			drill: 0,            // jumps made in the controls intro
			warned: false,       // caught moving in the practice red light
		};
	}

	// A player as seen from a wall: how far along it (0 at its left end) and
	// how near it they stand (1 right up against it).
	const alongOf = (wall, px, pz) => (wall === 0 ? pz : wall === 1 ? px : 1 - pz);
	const nearOf = (wall, px, pz) => (wall === 0 ? 1 - px : wall === 1 ? pz : px);
	// and back: where a player stands to be at (along, near) on a wall
	const roomAt = (wall, u, near) => (wall === 0 ? { px: 1 - near, pz: u } : wall === 1 ? { px: u, pz: near } : { px: near, pz: 1 - u });

	// Across always matches the player 1:1 along their wall; depth is a band
	// at the bottom of the window, further up the field the nearer the
	// player is to that wall.
	// Where a contestant shows across their wall: exactly where their player
	// stands, 1:1, wherever they are up the field...
	const screenXOf = (c) => c.wall * W + Math.max(LANE, Math.min(W - LANE, alongOf(c.wall, c.px, c.pz) * W));
	// ...and so where they really are on the field at depth f: that spot, taken
	// back out through the perspective (up the curve, the field's drawn in
	// toward the wall's vanishing point, so their place on it spreads back out).
	// Everything they meet (blocks, cash, pads, guards) is on the field, so it's
	// all just where it looks. (It can reach past their wall's ends far up the
	// curve: they only ever meet what's on their own wall.)
	const xOf = function (c, f = c.f) {
		const vp = vanishOf(c.wall);
		return vp + (screenXOf(c) - vp) * SCALE / scaleAt(f);
	};
	const bandF = (c) => cam + BACK + nearOf(c.wall, c.px, c.pz) * DEPTH;

	function resetContestant(c) {
		c.alive = true;
		c.safe = false;
		c.shotAt = undefined;
		c.glue = null;
		c.over = 0;
		c.fall = null;
		c.lean.x = c.lean.z = 0;
		c.wall = 1;
		c.offPad = true;
		c.magnet = 0;
		c.down = 0;
		c.hop = null;
		c.lift = 0;
		c.pass = false;
		c.warned = false;
		c.f = c.lastF = BACK + c.pz * DEPTH;
		c.x = c.lastX = xOf(c);
	}

	/* ---------- the game's state ---------- */

	const sound = createSound();

	let round = -1;
	let phase = 'waiting';   // waiting, drill, drill-red, ready, turning, green, dash, closed, warning, red, cleared, over
	let phaseT = 0;
	let phaseDur = 0;
	let shake = 0;
	let flash = 0;           // white flash after a shot
	let callout = null;      // { text, colour, age }: GREEN LIGHT / RED LIGHT
	let showInset = false;
	let dollShown = false;   // she (and her tree and guards) only appear in her entrance
	let gloom = 0;           // how dark the field is
	let t = 0;               // play time: the ten-minute clock (it only runs in the rounds)
	let blipAt = 0;
	let glare = 0;           // her eyes, glowing red while she watches
	let completed = false;
	let wallT = 0;           // a clock for bobbing and pulsing, running in every beat
	const tracers = [];      // shots across the field: { x0, y0, x1, y1, age, glance }

	// The doll's head: 0 faces the players, PI faces the tree.
	const head = { yaw: 0, from: 0, to: 0, t: 0, dur: 0 };
	function turnHead(to, dur) {
		head.from = head.yaw;
		head.to = to;
		head.t = 0;
		head.dur = dur;
		sound.whirr(dur);
	}

	function setPhase(p, dur = 0) {
		phase = p;
		phaseT = 0;
		phaseDur = dur;
	}

	const rand = (range) => range[0] + Math.random() * (range[1] - range[0]);
	const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
	const introCam = () => dollF - 540;

	// A call shown on every wall (no voice): the words, in a colour, and an
	// optional line under them.
	function say(text, colour, sub) {
		callout = { text, colour, sub, age: 0 };
	}

	/* ---------- the show ---------- */

	// The voice: a masked host, as in the show, introducing and reading out
	// (straight from ElevenLabs: a voice designed there, masked, filtered and
	// echoing, read at its slowest; assets/red-light-green-light/vo). One line at a time.
	// (each line says what's on the walls as it's said)
	const upTo10 = (name) => Array.from({ length: 10 }, (_, i) => name + (i + 1));
	const VOICE = ['title', 'clock', 'visors', 'allset', 'step_move', 'step_step', 'step_cash', 'step_freeze', 'step_jump', 'good', 'doll',
		...upTo10('round'), ...upTo10('clear'), 'nobody', ...upTo10('again'), 'timeup', 'scores', 'rankings',
		'win0', 'win1', 'win2', 'win3', 'win4', 'win5', 'tie', 'team', 'board', 'day1', 'day2', 'day3', 'day4', 'rate', 'thanks'];
	const VOICE_SOUNDS = Object.fromEntries(VOICE.map((id) => ['vo_' + id, [`assets/red-light-green-light/vo/${id}.mp3`, 1]]));
	let speaking = null;
	let saidAllSet = false;
	function voice(id) {
		if (!VOICE.includes(id)) return;
		if (speaking) show.stop(speaking);
		speaking = 'vo_' + id;
		hall(show.audio.get(speaking));
		show.play(speaking);
	}

	// The voice's hall: the ElevenLabs lines play as they are (dry), and also
	// into a big reverb, added live here (the files are left untouched).
	const REVERB = { seconds: 1.6, decay: 3.2, wet: 0.45, dry: 1 };   // the tail's length, how fast it dies (higher: faster), how much of it
	let hallAudio = null;
	function hall(el) {
		if (!el || el.dataset.hall) return;
		try {
			if (!hallAudio) {
				const ctx = new (window.AudioContext || window.webkitAudioContext)();
				const n = Math.floor(ctx.sampleRate * REVERB.seconds);
				const imp = ctx.createBuffer(2, n, ctx.sampleRate);
				for (let ch = 0; ch < 2; ch++) {
					const d = imp.getChannelData(ch);
					for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, REVERB.decay);
				}
				const verb = ctx.createConvolver();
				verb.buffer = imp;
				const wet = ctx.createGain();
				wet.gain.value = REVERB.wet;
				verb.connect(wet).connect(ctx.destination);
				hallAudio = { ctx, verb };
			}
			if (hallAudio.ctx.state === 'suspended') hallAudio.ctx.resume().catch(() => {});
			const src = hallAudio.ctx.createMediaElementSource(el);
			const dry = hallAudio.ctx.createGain();
			dry.gain.value = REVERB.dry;
			src.connect(dry).connect(hallAudio.ctx.destination);
			src.connect(hallAudio.verb);
			el.dataset.hall = '1';
		} catch (e) { /* (no Web Audio: the voice plays dry) */ }
	}

	// The soundtrack ("Way Back Then"), looping under everything from the
	// squad's pick to the very end; it drops away to nothing while her song plays
	// (green light), and a little under the voice.
	const MUSIC = { level: 0.25, green: 0, red: 0.2, voice: 0.6, ease: 2.5 };   // its volume, the share of it left under her song, through red light, under the voice, how fast it moves (per second)
	let musicLevel = 0;
	function duckMusic(dt) {
		const el = show.audio.get('soundtrack');
		if (!el) return;
		const playing = (id) => { const e = show.audio.get(id); return !!e && !e.paused && !e.ended; };
		const red = phase === 'red' || phase === 'drill-red';   // (hushed while she watches)
		const turning = head.t < head.dur;   // (silent while her head turns, either way)
		const want = MUSIC.level * (playing('dollSong') || turning ? MUSIC.green : Math.min(red ? MUSIC.red : 1, speaking && playing(speaking) ? MUSIC.voice : 1));
		musicLevel += (want - musicLevel) * Math.min(1, dt * MUSIC.ease * 2);
		el.volume = Math.max(0, Math.min(1, musicLevel));
	}

	// the piggy bank in the team total (see drawPiggy)
	const PIGGY = {
		y: 480,                 // its middle, on every wall
		r: 250,                 // its body: a perfect sphere
		fill: 0.74,             // how full it ends up
		fillFor: 1.6,           // seconds it takes to fill, once the scores are in
		fillFrom: 2.0,          // (when the scores smoosh into it, in the team beat: Showtime's TEAM.fly[1])
		kachings: 7,            // a ka-ching for each pour of notes as it fills
		notes: ['#f3d27e', '#e6b955', '#d39d3b', '#f7e2a4'],   // the notes inside: yellowy ₩50,000s
	};

	const SAND = '#e3c08a';
	const PINK = '#ff3d8b';
	const TEAL = '#1fa58a';
	const show = new Showtime(stage, {
		score: won,   // scores are in won
		id: 'red-light-green-light',
		skip: { during: ['controls'], to: 'doll', label: 'SKIP TUTORIAL ▶▶' },   // the skip button: only in the tutorial, on to her entrance
		clock: (n) => CLOCK_AT[n],   // the clock, as a capsule: see CLOCK_AT
		seconds: GAME_SECONDS,
		players: () => contestants.length,
		scores: () => contestants.map((c) => c.score),
		drawAvatar: (ctx, n, x, y, scale, pose) => art.with(ctx, { x, y, scale: scale * 0.88 }, (c) => contestantFront(c, n, pose)),
		theme: {
			accent: PINK, accent2: TEAL, gold: '#ffd23f', ink: '#2a1020',
			sky: ['#f1d9ab', '#c99560'], panel: 'rgba(42,16,32,0.84)', floor: 'rgba(90,50,24,0.45)', glow: 'rgba(255,61,139,0.3)',
		},
		backdrop: drawShapes,
		team: { y: PIGGY.y, into: PIGGY.y, decor: drawPiggy },   // the team total: the scores fly into the piggy bank, the total right over it
		rivals: ['Dalgona Crew', 'Marble Masters', 'The Frozen Few', 'Statue Squad', 'Ddakji Slappers', 'Last Ones Moving',
			'Tracksuit Titans', 'Sandy Sprinters', 'Still Standing', 'Circle Triangle Square', 'The Green Line', 'No Wobble Club'],
		sounds: Object.assign({
			dollSong: ['assets/red-light-green-light/doll-song.wav', 0.8],
			soundtrack: ['assets/red-light-green-light/soundtrack.mp3', MUSIC.level, true],
		}, VOICE_SOUNDS),   // her song, once through each green light, fitted to its length (the only music); the voice
	});

	// The piggy bank, as in the show: a giant clear glass pig hung on a cable
	// over the room, with a gold cap and a coin slot. For the team total, the
	// scores fly into it and it fills up with ₩50,000 notes falling in through
	// the slot; once the total's up, it glows and sways.
	function drawPiggy(c, bt, st) {
		const P = PIGGY;
		const R = P.r;
		const appear = st.fade;                                  // (in as the rankings fade out)
		if (appear <= 0) return;
		const filled = st.merged ? P.fill * (1 - Math.pow(1 - Math.min(1, (bt - st.mergedAt) / P.fillFor), 3)) : 0;
		const party = bt > st.partyAt;
		const sway = Math.sin(bt * 1.3) * (party ? 2.2 : 1.2) + (st.merged ? Math.exp(-(bt - st.mergedAt) * 3) * Math.sin((bt - st.mergedAt) * 14) * 3 : 0);
		const edge = 'rgba(235,245,255,0.8)';
		const pane = 'rgba(190,220,255,0.10)';                   // the glass of the snout, ears and legs

		c.save();
		c.globalAlpha *= appear;
		// the room in darkness, as in the show, one beam of light down through the pig
		art.rect(c, -10, -10, W + 20, H + 20, { fill: '#060509', alpha: 0.96 });
		c.save();
		c.globalAlpha *= 0.5 + 0.25 * filled;
		// (a beam the whole height of the wall, top to bottom: no floor to land on)
		art.poly(c, [[W / 2 - R * 1.15, -10], [W / 2 + R * 1.15, -10], [W / 2 + R * 1.45, H + 10], [W / 2 - R * 1.45, H + 10]], {   // (nearly upright)
			fill: art.linear(c, 0, 0, 0, H, ['rgba(255,236,190,0.22)', 'rgba(255,236,190,0.12)', 'rgba(255,236,190,0.04)']),
		});
		c.restore();
		// the cable, from up out of sight
		art.line(c, [[W / 2, -20], [W / 2, P.y - R - 30]], { stroke: '#4a4038', lineWidth: 7 });

		c.translate(W / 2, P.y - R - 30);
		c.rotate(sway * Math.PI / 180);
		c.translate(0, R + 30);
		// a warm glow round it, stronger as it fills
		art.circle(c, 0, 0, R * 1.6, { fill: art.radial(c, 0, 0, R * 0.4, R * 1.6, [[0, `rgba(255,200,90,${0.1 + 0.3 * filled})`], [1, 'rgba(255,200,90,0)']]) });

		// legs and tail, behind the body
		for (const lx of [-0.55, -0.22, 0.22, 0.52]) {
			const x = lx * R;
			const y0 = Math.sqrt(R * R - x * x) - 30;
			art.roundRect(c, x - 30, y0, 60, 72, [6, 6, 22, 22], { fill: pane });
			art.line(c, [[x - 16, y0 + 12], [x - 16, y0 + 58]], { stroke: 'rgba(255,255,255,0.35)', lineWidth: 5 });
		}
		const tail = [];
		for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 3; const r = 8 + i * 1.3; tail.push([-R - 4 - i * 1.6 + Math.cos(a) * r * 0.6, -R * 0.15 + Math.sin(a) * r * 0.6]); }
		art.line(c, tail, { stroke: 'rgba(190,220,255,0.3)', lineWidth: 10 });   // (a curl of glass, not a line)

		// the body: the far side of the glass first, a bluish tint darkest at
		// the rim, as thick glass is
		art.circle(c, 0, 0, R, { fill: art.radial(c, -R * 0.25, -R * 0.3, R * 0.1, R * 1.05, [[0, 'rgba(210,235,255,0.05)'], [0.7, 'rgba(170,205,240,0.12)'], [1, 'rgba(120,170,220,0.35)']]) });

		c.save();
		c.beginPath();
		c.arc(0, 0, R - 5, 0, Math.PI * 2);
		c.clip();
		// the money inside, up to how full it is: a lumpy heap of notes,
		// mounded up under the slot, every note at its own angle
		if (filled > 0) drawPile(c, R, filled);
		// notes dropping in through the slot while it fills, onto the top of the heap
		if (st.merged && bt - st.mergedAt < P.fillFor) {
			const level = R - pileTop(0, R, filled);
			for (let i = 0; i < 7; i++) {
				const k = ((bt - st.mergedAt) * 2.4 + i / 7) % 1;
				const y = -R + k * (level + R);
				art.with(c, { x: -30 + Math.sin(i * 2.7 + k * 9) * 40, y, rotate: (k * 400 + i * 50) % 360, alpha: Math.min(1, (1 - k) * 4) }, function (c2) {
					art.rect(c2, -24, -10, 48, 20, { fill: P.notes[i % 4] });
				});
			}
		}
		// the texture of the moulded glass: faint ribs curving round the sphere
		for (let i = -6; i <= 6; i++) {
			const x = Math.sin(i / 7 * Math.PI / 2) * R;
			const rx = Math.abs(x);
			art.ellipse(c, 0, 0, Math.max(1, rx), R, { stroke: 'rgba(255,255,255,0.05)', lineWidth: 3 });
		}
		for (let i = -4; i <= 4; i++) art.ellipse(c, 0, i / 5 * R, R * Math.cos(Math.asin(i / 5)), R * 0.12 * Math.cos(Math.asin(i / 5)), { stroke: 'rgba(255,255,255,0.035)', lineWidth: 2 });
		// fine speckle in the glass
		for (let i = 0; i < 40; i++) {
			const a = i * 2.39996;
			const d = Math.sqrt((i + 0.5) / 40) * R * 0.95;
			art.circle(c, Math.cos(a) * d, Math.sin(a) * d, 1.6, { fill: 'rgba(255,255,255,0.18)' });
		}
		// the near side's tint, over everything inside
		art.circle(c, 0, 0, R, { fill: art.radial(c, 0, 0, R * 0.55, R, [[0, 'rgba(180,215,255,0)'], [1, 'rgba(150,200,255,0.18)']]) });
		c.restore();

		// highlights: a long curved sheen top left, a soft one low right, glints
		c.save();
		c.lineCap = 'round';
		for (const [r, a0, a1, w, a] of [[0.86, 1.05, 1.45, 22, 0.45], [0.86, 1.48, 1.55, 22, 0.35], [0.74, 1.12, 1.3, 9, 0.6], [0.88, 0.1, 0.38, 14, 0.18]]) {
			c.globalAlpha = appear * a;
			c.strokeStyle = 'white';
			c.lineWidth = w;
			c.beginPath();
			c.arc(0, 0, R * r, Math.PI * a0, Math.PI * a1);
			c.stroke();
		}
		c.restore();
		art.ellipse(c, -R * 0.42, -R * 0.55, 34, 18, { fill: art.radial(c, -R * 0.42, -R * 0.55, 0, 34, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]) });
		for (const [x, y, s] of [[-0.6, -0.42, 1], [0.35, -0.7, 0.7], [0.6, 0.45, 0.6]]) glint(c, x * R, y * R, 14 * s, bt + x * 3);

		// the snout, ears, an eye
		art.ellipse(c, R * 0.98, R * 0.1, 46, 58, { fill: pane });
		art.ellipse(c, R * 0.98 - 12, R * 0.1 - 20, 10, 18, { fill: 'rgba(255,255,255,0.4)' });
		for (const dy of [-15, 15]) art.ellipse(c, R * 1.02, R * 0.1 + dy, 7, 11, { fill: 'rgba(40,30,25,0.6)' });
		for (const ex of [0.32, 0.6]) {
			const top = -Math.sqrt(R * R - (ex * R) * (ex * R));
			art.poly(c, [[ex * R - 38, top + 26], [ex * R + 4, top - 52], [ex * R + 40, top + 30]], { fill: pane });
		}
		art.circle(c, R * 0.62, -R * 0.3, 12, { fill: '#2a1d16' });
		art.circle(c, R * 0.62 + 4, -R * 0.3 - 4, 4, { fill: 'white' });
		// the gold cap the cable holds, and the coin slot
		art.roundRect(c, -60, -R - 12, 120, 28, 12, { fill: art.linear(c, -60, 0, 60, 0, ['#9b6d16', '#f2c752', '#c48f24']) });
		art.circle(c, 0, -R - 24, 14, { stroke: '#9b6d16', lineWidth: 6 });
		art.roundRect(c, -46, -R + 18, 72, 12, 6, { fill: 'rgba(20,14,8,0.7)' });
		c.restore();
	}

	// The heap inside the piggy bank: how high it stands at x (from the
	// bottom of the sphere), a mound with lumps; and its notes, scattered once,
	// shown up to the heap's surface, the deeper ones under the higher.
	const PILE = Array.from({ length: 340 }, () => ({
		x: (Math.random() * 2 - 1) * 1.1, h: Math.random(),          // across (share of the radius), height (share of the diameter)
		rot: (Math.random() * 2 - 1) * 60, k: Math.floor(Math.random() * 4),
		s: 0.8 + Math.random() * 0.45, flip: Math.random() < 0.3,
	})).sort((a, b) => a.h - b.h);
	function pileTop(x, R, filled) {
		const u = x / R;
		const lumps = (Math.sin(x * 0.031 + 1.3) * 14 + Math.sin(x * 0.083 + 0.4) * 9 + Math.sin(x * 0.19) * 5) * Math.min(1, filled * 4);
		return 2 * R * filled * (0.9 + 0.22 * (1 - u * u)) + lumps;
	}
	function drawPile(c, R, filled) {
		// the heap's body, under its lumpy surface: notes packed deep, darker down low
		const pts = [[-R, R + 10]];
		for (let x = -R; x <= R; x += 10) pts.push([x, R - pileTop(x, R, filled)]);
		pts.push([R, R + 10]);
		art.poly(c, pts, { fill: art.linear(c, 0, R - 2 * R * filled, 0, R, ['#d9a548', '#a8731f']) });
		// the notes, each where it lies, up to the surface
		for (const n of PILE) {
			const x = n.x * R;
			const top = pileTop(x, R, filled);
			const h = n.h * 2 * R;
			if (h > top - 6) continue;
			const depth = Math.min(1, (top - h) / 160);              // (the deeper, the more in shadow)
			art.with(c, { x, y: R - h, rotate: n.rot, scaleX: n.s * (n.flip ? 0.55 : 1), scaleY: n.s }, function (c2) {
				art.rect(c2, -32, -13, 64, 26, { fill: PIGGY.notes[n.k] });
				art.rect(c2, -32, -13, 64, 26, { stroke: 'rgba(120,80,20,0.45)', lineWidth: 2 });
				art.circle(c2, 14, 0, 6, { fill: 'rgba(160,110,40,0.5)' });
				art.rect(c2, -32, -13, 64, 26, { fill: `rgba(70,40,10,${0.5 * depth})` });
			});
		}
		// light caught along the top of the heap
		art.line(c, pts.slice(1, -1).map(([x, y]) => [x, y + 3]), { stroke: 'rgba(255,240,200,0.3)', lineWidth: 6 });
	}

	// a four-pointed glint, twinkling
	function glint(c, x, y, r, t) {
		const k = 0.6 + 0.4 * Math.sin(t * 3.1);
		art.poly(c, [[x, y - r * k], [x + r * 0.18, y - r * 0.18], [x + r * k, y], [x + r * 0.18, y + r * 0.18], [x, y + r * k], [x - r * 0.18, y + r * 0.18], [x - r * k, y], [x - r * 0.18, y - r * 0.18]], { fill: 'white', alpha: 0.8 });
	}

	// Big flat ○ △ □ drifting slowly up the results backdrop, pink and teal.
	function drawShapes(c, time) {
		for (let i = 0; i < 9; i++) {
			const x = (i * 197 + 90) % W;
			const y = H + 120 - ((time * (22 + (i % 3) * 9) + i * 260) % (H + 260));
			const r = 60 + (i * 37) % 70;
			art.with(c, { x, y, rotate: (time * (i % 2 ? 9 : -7) + i * 40), alpha: 0.16 }, function (c2) {
				shape(c2, SHAPES[i % 3], r, i % 2 ? PINK : TEAL);
			});
		}
	}

	// A flat circle, triangle or square, r across, centred.
	function shape(c, kind, r, fill) {
		if (kind === 'circle') art.circle(c, 0, 0, r, { fill });
		else if (kind === 'triangle') art.poly(c, [[0, -r * 1.1], [r * 1.05, r * 0.7], [-r * 1.05, r * 0.7]], { fill });
		else art.rect(c, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, { fill });
	}

	/* ---------- the flow of a game ---------- */

	function initGame(count) {
		players = count;
		sound.resume();
		contestants = [];
		for (let i = 0; i < count; i++) contestants.push(Contestant(i));
		for (const c of contestants) resetContestant(c);
		musicLevel = MUSIC.level;
		show.play('soundtrack');
		show.go('title');
	}

	// Into the rounds. The first starts straight off with GREEN LIGHT: her
	// entrance has turned her head and flown the view back to the start.
	function begin() {
		t = 0;
		for (const c of contestants) c.score = 0;
		dollShown = true;
		startRound(0, true);
	}

	function startRound(r, first) {
		round = r;
		if (!first) buildField(r);
		cam = 0;
		for (const c of contestants) resetContestant(c);
		head.t = head.dur = 0;
		glare = 0;
		showInset = true;
		show.stop('dollSong');
		if (first) {
			head.yaw = head.from = head.to = Math.PI;
			greenLight(true);
		} else {
			// the view on her, her face to the players, while ROUND N comes up; then
			// it scrolls back to the start, and she turns away
			head.yaw = head.from = head.to = 0;
			cam = introCam();
			setPhase('ready', ROUND_GAP.look + ROUND_GAP.sweep);
			show.fx('roundStart');
			voice('round' + (r + 1));
		}
	}

	// She turns her back and calls GREEN LIGHT: the field rolls on.
	// (The first of the game was already called in her entrance.)
	// After a red light (or ROUND N), she turns her head away; only once it's
	// all the way round is it GREEN LIGHT and the field starts to scroll.
	function turnAway() {
		turnHead(Math.PI, TURN_AWAY);
		setPhase('turning', TURN_AWAY);
	}

	function greenLight(firstOfGame) {
		if (!firstOfGame) say('Green light', '#27d96b');   // (her head's already turned away: see turnAway)
		glare = 0;
		for (const c of contestants) {
			c.glue = null;
			c.pass = false;
		}
		finalDash = false;
		scrollTo = Math.min(camEnd, cam + rand(settings.leg));
		if (camEnd - scrollTo < settings.leg[0] * 0.5) scrollTo = camEnd;   // no stub of a last leg
		playSong((scrollTo - cam) / settings.speed);
		setPhase('green', Infinity);
	}

	// Her song, from the top, sped up or slowed down (its pitch kept) to last
	// exactly as long as this green light: it ends as she turns.
	function playSong(seconds) {
		const el = show.audio.get('dollSong');
		if (el) el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = true;
		const length = show.audio.getDuration('dollSong');
		const speed = isFinite(length) && seconds > 0 ? clamp(length / seconds, 0.25, 4) : 1;
		show.play('dollSong', speed);
	}

	// The track stops at the end of the last leg, the line in reach: just long
	// enough to race for it before she turns.
	let scrollTo = 0;
	let finalDash = false;
	function startDash() {
		cam = scrollTo;
		finalDash = true;
		setPhase('dash', settings.dash);
		say('Run for the line!', '#ffd23f');
		show.fx('go');
	}

	// Time's up on the dash for the line: she turns, and anyone not across is
	// shot, there and then (no RED LIGHT).
	function lineCloses() {
		show.stop('dollSong');
		callout = null;
		turnHead(0, 0.4);
		glare = 1;
		setPhase('closed', Infinity);
		const late = contestants.filter((c) => c.alive && !c.safe);
		for (const c of late) eliminate(c, 'line');
		if (!late.length) maybeEnd();   // (nobody to shoot: straight to the round's end)
	}

	// Her head is coming round...
	function warn() {
		show.stop('dollSong');
		turnHead(0, settings.warning);
		setPhase('warning', settings.warning);
	}

	// ...RED LIGHT: everyone's feet stick where they are.
	function redLight() {
		say('Red light', '#ff3640', 'FREEZE');
		glare = 1;
		freeze();
		aimLasers();
		blipAt = 0;
		setPhase('red', rand(settings.red));
	}

	function freeze() {
		for (const c of contestants) {
			if (c.alive && !c.safe) c.glue = { x: c.x, f: c.f, u: alongOf(c.wall, c.px, c.pz), near: nearOf(c.wall, c.px, c.pz) };
			c.over = 0;
			c.warned = false;
		}
	}

	// Everyone is across or out: a short banner, and on to the next round.
	// (The clock keeps running through it.)
	function endRound() {
		show.stop('dollSong');
		const survivors = contestants.filter((c) => c.alive);
		callout = null;
		cleared = { round, made: survivors.length };
		if (survivors.length) {
			show.mark(t);
			show.fx('roundClear');
			voice('clear' + (round + 1));   // ROUND N CLEAR!
			// then each survivor is paid for completing the round, one after another
			survivors.forEach(function (c, i) {
				stage.timeout(function () {
					if (show.beat !== 'play') return;
					c.score += POINTS.finish;
					popOver(c, '+' + won(POINTS.finish), PLAYER_COLORS[c.n]);
					show.fx('kaching', 0.7, 1 + i * 0.04);
				}, (ROUND_GAP.payFrom + i * ROUND_GAP.payEach) * 1000);
			});
		} else {
			show.fx('roundFail');
			voice('nobody');   // NOBODY MADE IT, then ROUND N AGAIN!
			const again = round + 1;
			stage.timeout(() => { if (show.beat === 'play') voice('again' + again); }, 1700);
		}
		turnHead(0, 1);
		setPhase('cleared', survivors.length ? ROUND_GAP.cleared : ROUND_GAP.quick);
	}
	let cleared = null;      // { round, made }: the last round's result, for its banner

	const pops = [];            // words that float up over a contestant

	function agePops(dt) {
		for (let i = pops.length - 1; i >= 0; i--) {
			pops[i].age += dt;
			if (pops[i].age > 1.4) pops.splice(i, 1);
		}
	}

	function popOver(c, text, colour) {
		const p = at(c.x, c.f, 270, c.wall);
		// stacked above any other fresh word close by, so they don't overlap
		let y = p.y;
		for (let k = 0; k < 4; k++) {
			const o = pops.find((o) => o.age < 0.8 && Math.abs(o.x - p.x) < 300 && Math.abs(o.y - o.age * 120 - y) < 64);
			if (!o) break;
			y = o.y - o.age * 120 - 68;
		}
		pops.push({ text, colour, x: p.x, y, age: 0 });
	}

	/* ---------- jump pads and cash ---------- */

	// Along the track, at the corner ends of the walls: jump pads. Step on
	// one and you're straight round the corner onto the next wall. And strewn
	// all over the field: little wads of cash, a point each for whoever walks
	// over them. Both are laid with the field and fixed to it, so they scroll.
	let pads = [];              // { x, f, wall, to, age, practice }
	let cash = [];              // { x, f, wall, spin, taken, practice }
	let magnets = [];           // { x, f, wall, spin, taken }
	let bags = [];              // { x, f, wall, spin, taken }
	let bursts = [];            // { x, f, t }: a money bag popping
	let padPulse = 0;

	const onPad = (c, p) => Math.pow((c.x - p.x) / PAD.rx, 2) + Math.pow((c.f - p.f) / PAD.rf, 2) < 1;

	// the corner ends of the walls: [the wall, the wall round that corner, the pad's x]
	const CORNERS = [
		[0, 1, W - EDGE_AT * W], [1, 0, W + EDGE_AT * W],
		[1, 2, 2 * W - EDGE_AT * W], [2, 1, 2 * W + EDGE_AT * W],
	];

	// Pads up the track every so often, at a corner picked at random (clear of blocks).
	function layPads(fromF, toF, every, practice) {
		for (let f = fromF; f < toF; f += every * (0.7 + Math.random() * 0.6)) {
			const [wall, to, x] = CORNERS[Math.floor(Math.random() * CORNERS.length)];
			if (blocks.some((b) => Math.abs(b.x - x) < b.rx + PAD.rx && Math.abs(b.f - f) < b.r + PAD.rf)) continue;
			pads.push({ x, f, wall, to, age: 0, practice });
		}
	}

	// Cash all over every wall, here and there (clear of blocks).
	function layCash(fromF, toF, every, practice, wallsOnly) {
		for (let wall = 0; wall < 3; wall++) {
			if (wallsOnly && !wallsOnly.includes(wall)) continue;
			for (let f = fromF + Math.random() * every; f < toF; f += every * (0.5 + Math.random())) {
				const x = wall * W + LANE + 80 + Math.random() * (W - 2 * LANE - 160);
				if (blocks.some((b) => Math.abs(b.x - x) < b.rx + 50 && Math.abs(b.f - f) < b.r + 50)) continue;
				cash.push({ x, f, wall, spin: Math.random() * 6, taken: false, practice });
			}
		}
	}

	// A few magnets, here and there up every wall (clear of blocks).
	function layMagnets(fromF, toF, every) {
		for (let wall = 0; wall < 3; wall++) {
			for (let f = fromF + Math.random() * every; f < toF; f += every * (0.6 + Math.random() * 0.8)) {
				const x = wall * W + LANE + 120 + Math.random() * (W - 2 * LANE - 240);
				if (blocks.some((b) => Math.abs(b.x - x) < b.rx + 60 && Math.abs(b.f - f) < b.r + 60)) continue;
				magnets.push({ x, f, wall, spin: Math.random() * 6, taken: false });
			}
		}
	}

	// A few money bags, here and there up every wall (clear of blocks).
	function layBags(fromF, toF, every) {
		for (let wall = 0; wall < 3; wall++) {
			for (let f = fromF + Math.random() * every; f < toF; f += every * (0.6 + Math.random() * 0.8)) {
				const x = wall * W + LANE + 160 + Math.random() * (W - 2 * LANE - 320);
				if (blocks.some((b) => Math.abs(b.x - x) < b.rx + 60 && Math.abs(b.f - f) < b.r + 60)) continue;
				if (magnets.some((g) => g.wall === wall && Math.abs(g.f - f) < 200)) continue;
				bags.push({ x, f, wall, spin: Math.random() * 6, taken: false });
			}
		}
	}

	/* ---------- boulders ---------- */

	// From round 2, big boulders roll down the field at the players, through
	// green light AND red: one coming at you while she's watching means take
	// the hit or move and be shot. A hit knocks you flat (no shot for moving
	// while you're down) and spills some of your cash.
	const BOULDER_SHADES = [['#c9a274', '#8c6a46', '#e8c99a'], ['#a7a49c', '#6d6b65', '#d4d1c8'], ['#b5704a', '#7a4429', '#de9a72']];   // base, dark, light

	function stepBoulders(dt) {
		const rolling = show.beat === 'play' && ['green', 'dash', 'warning', 'red', 'turning'].includes(phase);
		if (rolling && settings.boulderGap > 0) {
			boulderIn -= dt;
			if (boulderIn <= 0) {
				rollBoulder();
				boulderIn = settings.boulderGap * (0.7 + Math.random() * 0.6);
			}
		}
		for (const b of boulders) {
			if (!rolling && !b.loose) continue;
			b.f -= b.speed * dt;
			b.spin += b.speed * dt / b.r;
			b.dust += dt;
		}
		boulders = boulders.filter((b) => b.f > cam - 300);
	}

	// One down a wall (taking turns), in a lane clear of blocks all the way down.
	function rollBoulder(loose) {
		for (let tries = 0; tries < 3; tries++) {
			const wall = WALL_ORDER[boulderWall++ % WALL_ORDER.length];
			const r = BOULDER.r[0] + Math.random() * (BOULDER.r[1] - BOULDER.r[0]);
			const f = Math.max(cam + BACK + DEPTH + BOULDER.lead, Math.min(finishF - 30, cam + BOULDER.ahead));
			const lo = wall * W + LANE + r;
			const hi = (wall + 1) * W - LANE - r;
			// aimed at someone on that wall, more often than not
			const target = contestants.filter((c) => c.alive && !c.safe && c.wall === wall);
			for (let k = 0; k < 14; k++) {
				const aim = target.length && Math.random() < 0.6 ? target[Math.floor(Math.random() * target.length)].x + (Math.random() - 0.5) * 120 : lo + Math.random() * (hi - lo);
				const x = Math.max(lo, Math.min(hi, aim));
				if (blocks.some((b) => wallOfX(b.x) === wall && Math.abs(b.x - x) < b.rx + r + 10 && b.f < f + r && b.f > cam - 100)) continue;
				boulders.push({ x, f, r, wall, speed: BOULDER.speed[0] + Math.random() * (BOULDER.speed[1] - BOULDER.speed[0]), spin: Math.random() * 6, dust: 0, shade: BOULDER_SHADES[Math.floor(Math.random() * BOULDER_SHADES.length)], seed: Math.random() * 100, loose });
				show.fx('rumble', 0.5);
				return true;
			}
		}
		return false;
	}

	// Flattened: down for a moment, a few wads of cash flying.
	function knock(c, b) {
		c.down = BOULDER.down;
		c.glue = null;
		c.over = 0;
		const n = Math.min(BOULDER.spill, Math.floor(c.score / POINTS.cash));
		c.score -= n * POINTS.cash;
		if (n) popBag(c.x, c.f, c.wall, n, true);
		popOver(c, n ? 'FLATTENED! −' + won(n * POINTS.cash) : 'FLATTENED!', '#ff8a1c');
		show.fx('thud', 0.9);
		shake = Math.max(shake, 0.4);
	}

	// A money bag pops: its wads fly out and land in a ring around it, on its
	// wall and clear of blocks, ready to be picked up once they're down.
	// (Also a contestant's spilt cash: count wads, quietly.)
	function popBag(x, f, wall, count = BAG.count, spill = false) {
		if (!spill) {
			bursts.push({ x, f, t: 0 });
			show.fx('boom', 0.35);
			show.fx('kaching', 0.7);
		}
		const lo = wall * W + LANE + 40;
		const hi = (wall + 1) * W - LANE - 40;
		for (let i = 0; i < count; i++) {
			let tx = x, tf = f;
			for (let tries = 0; tries < 12; tries++) {
				const a = (i + Math.random() * 0.8) / count * Math.PI * 2;
				const d = BAG.near + Math.random() * (BAG.radius - BAG.near);
				tx = Math.min(hi, Math.max(lo, x + Math.cos(a) * d));
				tf = Math.min(finishF - 40, Math.max(START_F + 40, f + Math.sin(a) * d * 0.8));
				if (!blocks.some((b) => Math.abs(b.x - tx) < b.rx + 40 && Math.abs(b.f - tf) < b.r + 40)) break;
			}
			cash.push({ x: tx, f: tf, wall, spin: Math.random() * 6, taken: false, fly: { t: -i * 0.03, x0: x, f0: f } });
		}
	}

	// Round the corner onto the next wall, straight away.
	function jump(c, p) {
		c.hop = { t: 0, x0: c.x, f0: c.f };
		c.wall = p.to;
		c.offPad = false;   // (no jumping on again until they've stepped off where they land)
		c.drill++;
		show.fx('joinWall');
		popOver(c, WALL_NAMES[c.wall] + ' WALL!', PLAYER_COLORS[c.n]);
	}

	function touchPadsAndCash(c, dt) {
		c.magnet = Math.max(0, (c.magnet || 0) - dt);
		const onAny = pads.some((p) => p.wall === c.wall && onPad(c, p));
		if (!c.offPad) {
			if (!onAny) c.offPad = true;
		} else if (onAny) {
			jump(c, pads.find((p) => p.wall === c.wall && onPad(c, p)));
			return;
		}
		// a magnet: picked up like cash; it pulls in the cash on their wall for a while
		for (const g of magnets) {
			if (g.taken || g.wall !== c.wall || Math.abs(g.x - c.x) > CASH.reach || Math.abs(g.f - c.f) > CASH.reach * 0.7) continue;
			g.taken = true;
			c.magnet = MAGNET.time;
			popOver(c, 'MAGNET!', '#ff4d6d');
			show.fx('lockIn', 0.8);
		}
		// a money bag: picked up like cash; it bursts into a cluster of cash round about
		for (const g of bags) {
			if (g.taken || g.wall !== c.wall || Math.abs(g.x - c.x) > CASH.reach || Math.abs(g.f - c.f) > CASH.reach * 0.7) continue;
			g.taken = true;
			popOver(c, 'MONEY BAG!', '#ffd23f');
			popBag(g.x, g.f, g.wall);
		}
		if (c.magnet > 0) {
			for (const m of cash) {
				if (m.taken || m.fly || m.wall !== c.wall) continue;
				const dx = c.x - m.x;
				const df = c.f - m.f;
				const d = Math.hypot(dx, df);
				if (d > MAGNET.radius || d < 1) continue;
				const step = Math.min(d, MAGNET.pull * dt * (1.5 - d / MAGNET.radius));   // (quicker as it nears)
				m.x += dx / d * step;
				m.f += df / d * step;
			}
		}
		for (const m of cash) {
			if (m.taken || m.fly || m.wall !== c.wall || Math.abs(m.x - c.x) > CASH.reach || Math.abs(m.f - c.f) > CASH.reach * 0.7) continue;
			m.taken = true;
			c.score += POINTS.cash;
			c.grabbed++;
			popOver(c, '+' + won(POINTS.cash), '#3cdc7a');
			show.fx('kaching', 0.6);
		}
	}

	function agePads(dt) {
		padPulse += dt * 4;
		for (const p of pads) p.age += dt;
		for (const m of cash) m.spin += dt;
		for (const g of magnets) g.spin += dt;
		for (const g of bags) g.spin += dt;
		for (const m of cash) if (m.fly && (m.fly.t += dt) >= BAG.fly) m.fly = null;
		for (const b of bursts) b.t += dt;
		bursts = bursts.filter((b) => b.t < BURST);
	}

	/* ---------- her laser ---------- */

	// While she watches (red light), one laser sight sweeps the whole field:
	// two red beams from her eyes, off the top of the field, to a big oval
	// target lying flat on the sand. It roves across all three walls, hopping
	// from one contestant to the next, hunting; with nobody left, it roams.
	const scanner = { x: 1.5 * W, f: 0, t: 0, wall: 1 };

	function aimLasers() {
		scanner.x = 1.5 * W;
		scanner.f = cam + BACK + DEPTH * 0.5;
		scanner.t = Math.random() * 3;
	}

	function stepLasers(dt) {
		const on = phase === 'red' || phase === 'drill-red';
		sound.buzz(on);   // (its buzz, for exactly as long as it shows)
		if (!on) return;
		const s = scanner;
		s.t += dt;
		const live = contestants.filter((c) => c.alive && !c.safe);
		let tx;
		let tf;
		if (live.length) {
			const c = live[Math.floor(s.t / LASER.hop) % live.length];
			s.wall = c.wall;
			// (searching all round them, never quite still)
			tx = c.x + Math.sin(s.t * 2.3) * LASER.search;
			tf = c.f + Math.sin(s.t * 3.1 + 1) * LASER.search * 0.4;
		} else {
			tx = 1.5 * W + Math.sin(s.t * 0.5) * W * 1.3;
			s.wall = wallOfX(s.x);
			tf = cam + BACK + DEPTH * (0.5 + 0.3 * Math.sin(s.t * 0.7));
		}
		tx += (Math.sin(s.t * 7) + Math.sin(s.t * 11.3) * 0.5) * LASER.wobble;
		tf += (Math.cos(s.t * 5) + Math.cos(s.t * 9.7) * 0.5) * LASER.wobble * 0.6;
		const k = Math.min(1, dt * LASER.follow);
		s.x += (tx - s.x) * k;
		s.f += (tf - s.f) * k;
	}

	function drawLasers(ctx) {
		if (phase !== 'red' && phase !== 'drill-red') return;
		const alpha = Math.min(1, phaseT / 0.3);
		const eyes = dollFace().y;
		const RED = '#ff2a2a';
		const s = scanner;
		// the target: a big oval flat on the sand, pulsing
		const front = at(s.x, s.f - LASER.rf, 0, s.wall);
		const back = at(s.x, s.f + LASER.rf, 0, s.wall);
		const cy = (front.y + back.y) / 2;
		const ry = (front.y - back.y) / 2;
		const pulse = 1 + 0.06 * Math.sin(s.t * 14);
		const sight = alpha * (0.75 + 0.25 * Math.random());   // (it flickers a little)
		// (a hot centre, fading gradually out over well beyond its rim)
		const tx = (front.x + back.x) / 2;   // (where the target is, drawn in toward its wall's vanishing point)
		art.with(ctx, { x: tx, y: cy, scaleX: (front.s + back.s) / 2 / SCALE, scaleY: ry / LASER.rx }, function (c) {
			const R = LASER.rx * pulse;
			art.circle(c, 0, 0, R * 1.9, { fill: art.radial(c, 0, 0, 0, R * 1.9, [[0, 'rgba(255,120,100,0.75)'], [0.2, 'rgba(255,60,50,0.5)'], [0.5, 'rgba(255,40,40,0.22)'], [0.8, 'rgba(255,30,30,0.07)'], [1, 'rgba(255,30,30,0)']]), alpha: sight });
			art.circle(c, 0, 0, R, { stroke: '#ff6a5a', lineWidth: 4, alpha: sight * 0.6 });
		});
		// the beams, one from each eye, each flickering on its own and now
		// and then cutting out altogether
		for (const off of [-14, 14]) {
			const flicker = Math.random() < 0.06 ? 0.1 : 0.6 + 0.4 * Math.random();
			const beam = [[DOLL_X + off, eyes], [tx + off * 2, cy]];
			art.line(ctx, beam, { stroke: RED, lineWidth: 34, alpha: alpha * 0.12 * flicker, shadow: { color: RED, blur: LASER.glow } });
			art.line(ctx, beam, { stroke: RED, lineWidth: 14, alpha: alpha * 0.3 * flicker, shadow: { color: RED, blur: LASER.glow * 0.6 } });
			art.line(ctx, beam, { stroke: '#ffd0c8', lineWidth: 3.5, alpha: alpha * flicker, shadow: { color: RED, blur: 18 } });   // a white-hot core
		}
	}

	/* ---------- eliminations ---------- */

	// Out: they freeze, and a shot follows. Several caught at once are shot
	// one after another, a volley rather than one bang.
	let clock = 0;
	let lastShot = -1;
	function eliminate(c, why) {
		if (!c.alive || show.beat !== 'play') return;   // never in the practice
		c.alive = false;
		lastShot = Math.max(clock + 0.05, lastShot + 0.16 + Math.random() * 0.22);
		c.shotAt = lastShot;
		c.why = why;
		if (contestants.every((o) => !o.alive || o.safe)) stage.timeout(maybeEnd, 900 + (lastShot - clock) * 1000);
	}

	function shoot(c) {
		c.shotAt = undefined;
		c.glue = null;
		const lean = c.lean.x;
		c.fall = { t: 0, dir: Math.abs(lean) > 0.2 ? Math.sign(lean) : (Math.random() < 0.5 ? -1 : 1) };
		sound.gunshot();
		shake = 1;
		flash = 0.35;
		fireAt(c, false);
	}

	// The nearest sentry in view fires: a muzzle flash and a streak across
	// the field to the contestant.
	function fireAt(c, glance) {
		let nearest = null;
		let best = Infinity;
		// any guard on the walls: the ones at the edges, and the patrolling ones
		const patrol = movers.filter((m) => m.kind === 'guard');
		for (const g of sentries.concat(patrol)) {
			if (planeY(g.f) > H + 40 || fadeIn(g.f) < 0.5) continue;   // (only guards on the walls, not lost in the haze)
			const d = Math.abs(g.x - c.x) + Math.abs(g.f - c.f) * 2 + (Math.floor(g.x / W) === c.wall ? 0 : 1200);   // one on their own wall if there is one
			if (d < best) { best = d; nearest = g; }
		}
		let from;
		if (nearest) {
			if (nearest.kind === 'guard') nearest.dir = c.x < nearest.x ? -1 : 1;   // (a patrolling guard turns to face them)
			nearest.flash = 0.12;
			from = gunTip(nearest);
		} else {
			from = { x: c.x < DOLL_X ? 300 : WIDTH - 300, y: 300 };
		}
		const to = at(c.x, c.f, 75, c.wall);
		tracers.push({ x0: from.x, y0: from.y, x1: to.x, y1: to.y, age: 0, glance, dir: Math.random() < 0.5 ? -1 : 1 });
	}

	function maybeEnd() {
		if (show.beat === 'play' && phase !== 'cleared' && phase !== 'ready' && contestants.every((o) => !o.alive || o.safe)) endRound();
	}

	/* ---------- every frame ---------- */

	// The rounds: green light, her head coming round, red light, and the
	// banners between rounds. Only in the play beat.
	function stepRound(dt) {
		phaseT += dt;
		switch (phase) {
		case 'ready':
			// ROUND N on her, the view scrolling back to the start, then she turns away
			cam = introCam() * (1 - ease(between(phaseT, ROUND_GAP.look, ROUND_GAP.look + ROUND_GAP.sweep)));
			if (phaseT >= phaseDur) turnAway();
			break;

		case 'turning':
			// her head coming all the way round, away from the players
			if (phaseT >= phaseDur) greenLight(false);
			break;

		case 'green':
			// scrolling: on to the next stop
			cam = Math.min(scrollTo, cam + settings.speed * dt);
			// (at the end of a leg she turns; at the end of the last, a dash for the line first)
			if (cam >= scrollTo) { cam = scrollTo; if (scrollTo >= camEnd - 1) startDash(); else warn(); }
			break;

		case 'dash':
			if (phaseT >= phaseDur) lineCloses();
			break;

		case 'closed':
			// the shots ring out; the round ends once they have (see eliminate)
			break;

		case 'warning':
			if (phaseT >= phaseDur) redLight();
			break;

		case 'red':
			blipAt -= dt;
			if (blipAt <= 0) { sound.blip(); blipAt = 0.45; }
			glare = 0.7 + 0.3 * Math.sin(phaseT * 12);
			if (phaseT >= phaseDur) turnAway();
			break;

		case 'cleared':
			// nobody made it: the same round again; otherwise on to the next
			if (phaseT >= phaseDur) startRound(cleared && !cleared.made ? round : round + 1);
			break;
		}
	}

	// Everything else that moves, in every beat: her head, the hazards, the
	// pads and cash, the contestants, the shots.
	function stepWorld(dt) {
		clock += dt;
		for (const c of contestants) if (c.shotAt !== undefined && clock >= c.shotAt) shoot(c);

		// the doll's head
		if (head.t < head.dur) {
			head.t = Math.min(head.dur, head.t + dt);
			head.yaw = head.from + (head.to - head.from) * ease(head.t / head.dur);
		}

		agePops(dt);
		agePads(dt);
		stepLasers(dt);

		const running = phase === 'green' || phase === 'dash' || phase === 'warning';
		for (const m of movers) {
			if (!running) continue;
			m.x += m.dir * m.speed * dt;
			if (m.x > m.hi) { m.x = m.hi; m.dir = -1; }
			if (m.x < m.lo) { m.x = m.lo; m.dir = 1; }
			// they turn back at a block
			for (const b of blocks) {
				const dx = m.x - b.x;
				if (Math.abs(m.f - b.f) < b.r + m.r && Math.abs(dx) < b.rx + m.r && Math.sign(dx) === -m.dir) m.dir = -m.dir;
			}
			if (m.kind === 'guard') m.phase += dt * 20;   // (stepping like the contestants)
			else m.spin += m.dir * m.speed * dt / m.r;
		}
		stepBoulders(dt);

		if (phase === 'waiting') {
			// Standing at the start, following their players.
			for (const c of contestants) {
				c.f = BACK + nearOf(c.wall, c.px, c.pz) * DEPTH;
				c.x = xOf(c);
			}
			separate();
		} else if (phase !== 'over') {
			for (const c of contestants) updateContestant(c, dt);
			separate();
		}
		for (const c of contestants) animate(c, dt);

		for (const g of sentries) g.flash = Math.max(0, g.flash - dt);
		for (const m of movers) m.flash = Math.max(0, (m.flash || 0) - dt);
		for (const s of splats) s.t += dt;
		for (let i = tracers.length - 1; i >= 0; i--) {
			tracers[i].age += dt;
			if (tracers[i].age > 0.35) tracers.splice(i, 1);
		}
		shake = Math.max(0, shake - dt * 3);
		flash = Math.max(0, flash - dt * 1.6);
		if (callout) callout.age += dt;
	}

	function updateContestant(c, dt) {
		if (!c.alive) return;

		// while the view sweeps back to the start before a round, everyone rides
		// along with it, clear of the field
		if (phase === 'ready' && show.beat === 'play') {
			c.f = bandF(c);
			c.x = xOf(c);
			return;
		}

		// Flattened by a boulder: lying there, then up again. (Nothing they do
		// counts while they're down; if she's watching when they get up, their
		// feet stick where they are now.)
		if (c.down > 0) {
			c.down -= dt;
			if (c.down <= 0 && (phase === 'red' || phase === 'warning') && !c.safe) c.glue = { x: c.x, f: c.f, u: alongOf(c.wall, c.px, c.pz), near: nearOf(c.wall, c.px, c.pz) };
			return;
		}

		if (c.glue) {
			// Feet stay put; the body bends toward where the player has moved.
			c.x = c.glue.x;
			c.f = c.glue.f;
			const dx = alongOf(c.wall, c.px, c.pz) - c.glue.u;
			const dz = (nearOf(c.wall, c.px, c.pz) - c.glue.near) * 0.6;
			c.lean.x = dx / MOVE_LIMIT;
			c.lean.z = dz / MOVE_LIMIT;   // toward the wall leans away up the field
			// (frozen in a boulder's path: flattened, and that's no reason to shoot them)
			for (const b of boulders) {
				if (b.wall === c.wall && Math.abs(c.x - b.x) < b.r + BODY && Math.abs(c.f - b.f) < (b.r + BODY) * 0.7) {
					knock(c, b);
					return;
				}
			}
			if ((phase === 'red' || phase === 'drill-red') && phaseT > GRACE) {
				if (Math.hypot(dx, dz) > MOVE_LIMIT) {
					c.over += dt;
					if (c.over > 0.05 && phase === 'red') eliminate(c, 'moved');
					// in practice, only a warning: this is what gets you shot
					if (c.over > 0.05 && phase === 'drill-red' && !c.warned) {
						c.warned = true;
						popOver(c, 'TOO MUCH!', '#ff3640');
						sound.blip();
					}
				} else {
					c.over = 0;
				}
			}
			return;
		}

		// Ease the lean off after a red light.
		c.lean.x *= Math.max(0, 1 - dt * 6);
		c.lean.z *= Math.max(0, 1 - dt * 6);

		// Skipping across a corner onto their new wall: an arc from where they
		// were to where their player is on it.
		if (c.hop) {
			c.hop.t += dt;
			const k = Math.min(1, c.hop.t / HOP);
			const e = ease(k);
			c.f = c.hop.f0 + (bandF(c) - c.hop.f0) * e;
			c.x = c.hop.x0 + (xOf(c, bandF(c)) - c.hop.x0) * e;
			c.lift = Math.sin(k * Math.PI) * 150;
			if (k >= 1) { c.hop = null; c.lift = 0; }
			return;
		}

		// Follow the player: across always matches them exactly, depth eases
		// (so blocks can hold you back).
		const step = 1500 * dt;   // (a whole room's depth in a second: following the player, not racing them)
		c.f += Math.max(-step, Math.min(step, bandF(c) - c.f));
		c.x = xOf(c);

		// Blocks hold contestants back (or, if they're past, push them on):
		// strafe round them. (Only their own wall's.)
		for (const b of blocks) {
			if (wallOfX(b.x) !== c.wall) continue;
			// (a long block: straight along its length, rounded at its ends)
			const dx = Math.max(0, Math.abs(c.x - b.x) - (b.rx - b.r));
			const min = b.r + BODY;
			if (dx >= min) continue;
			const reach = Math.sqrt(min * min - dx * dx) * 0.7;
			if (Math.abs(c.f - b.f) < reach) c.f = c.f < b.f ? b.f - reach : b.f + reach;
		}

		// Once over the finish line, there's no going back over it.
		if (c.safe) c.f = Math.max(c.f, finishF + 13);
		c.x = xOf(c);   // (still 1:1 at wherever the blocks left them)

		// A boulder knocks you flat.
		for (const b of boulders) {
			if (b.wall === c.wall && Math.abs(c.x - b.x) < b.r + BODY && Math.abs(c.f - b.f) < (b.r + BODY) * 0.7) {
				knock(c, b);
				return;
			}
		}

		// Guards and marbles are deadly.
		for (const m of movers) {
			if (wallOfX(m.x) === c.wall && Math.abs(c.x - m.x) < m.r + BODY && Math.abs(c.f - m.f) < (m.r + BODY) * 0.7) {
				eliminate(c, 'hit');
				return;
			}
		}

		// Held back so far you've dropped out of the bottom of the field.
		if (!c.safe && c.f < cam + BACK - 85) {
			eliminate(c, 'behind');
			return;
		}

		if (phase !== 'red' && phase !== 'drill-red') touchPadsAndCash(c, dt);
		if (c.hop) return;   // (just jumped)

		if (!c.safe && c.f > finishF + 12) {
			c.safe = true;
			sound.ding();
			// (their ₩1,000 comes once the round is over: see endRound)
			maybeEnd();
		}
	}

	// Contestants at the same spot across stand one in front of the other.
	function separate() {
		const live = contestants.filter((c) => c.alive && !c.glue && !c.hop);
		for (let i = 0; i < live.length; i++) {
			for (let j = i + 1; j < live.length; j++) {
				const a = live[i];
				const b = live[j];
				if (a.wall !== b.wall || Math.abs(a.x - b.x) >= BODY * 2) continue;
				const df = b.f - a.f;
				const min = BODY * 1.4;
				if (Math.abs(df) < min) {
					const push = (min - Math.abs(df)) / 2 * (df >= 0 ? 1 : -1);
					a.f -= push;
					b.f += push;
					// (and never jostled back over the finish line)
					for (const o of [a, b]) if (o.safe) o.f = Math.max(o.f, finishF + 13);
				}
			}
		}
	}

	function animate(c, dt) {
		if (c.fall) {
			c.fall.t += dt;
			if (!c.fall.splat && c.fall.t > 0.25) {
				c.fall.splat = true;
				splats.push({ x: c.x + c.fall.dir * 95, f: c.f + 6, t: 0, seed: Math.random() * 100, wall: c.wall });
			}
			return;
		}
		const speed = Math.hypot(c.x - c.lastX, c.f - c.lastF) / Math.max(dt, 1e-3);
		// which way, and how hard, they're heading across: -1 left .. 1 right
		const across = Math.max(-1, Math.min(1, (c.x - c.lastX) / Math.max(dt, 1e-3) / 300));
		c.drift = (c.drift || 0) + (across - (c.drift || 0)) * Math.min(1, dt * 6);
		c.lastX = c.x;
		c.lastF = c.f;
		// frozen, they sink into a squat; free, they straighten up again
		c.squat = (c.squat || 0) + ((c.glue ? 1 : 0) - (c.squat || 0)) * Math.min(1, dt * 12);
		if (c.glue) return;
		c.moving += (Math.min(1, speed / 60) - c.moving) * Math.min(1, dt * 8);
		c.walk += dt * 20 * c.moving;   // (quick little steps)
	}

	/* ---------- drawing ---------- */

	// The world, drawn through the show's camera.
	function drawWorld(ctx) {
		ctx.save();
		if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 16, (Math.random() - 0.5) * shake * 10);

		drawArena(ctx);

		// Lying flat on the sand: rake marks, the lines, blood.
		const lineAt = function (f, colour, half, always) {
			if (!always && !onView(f)) return;
			for (let w = 0; w < 3; w++) {
				const x0 = w * W - (w === 0 ? 20 : 0);
				const x1 = (w + 1) * W + (w === 2 ? 20 : 0);
				const a0 = at(x0, f + half, 0, w), a1 = at(x1, f + half, 0, w);
				const b0 = at(x0, f - half, 0, w), b1 = at(x1, f - half, 0, w);
				const thin = Math.max(0, 1.5 - (b0.y - a0.y));   // (never thinner than a hairline)
				art.poly(ctx, [[a0.x, a0.y - thin], [a1.x, a1.y - thin], [b1.x, b1.y], [b0.x, b0.y]], { fill: colour, alpha: always ? 1 : fadeIn(f) });
			}
		};
		lineAt(START_F, '#f6f1e6', 7);
		// the finish line: one band, unbroken, right across all three walls (never lost in the haze: it's where she stands)
		if (dollShown || onView(finishF)) {
			const a = at(0, finishF + 10);
			const b = at(0, finishF - 10);
			art.rect(ctx, -20, a.y, WIDTH + 40, Math.max(1.5, b.y - a.y), { fill: '#d7262e', alpha: dollShown ? 1 : fadeIn(finishF) });
		}
		for (const s of splats) drawSplat(ctx, s);
		// (while the view is up the field, before a round, the contestants wait
		// unseen at the start)
		const waiting = (cam > 1 && (show.beat === 'doll' || (show.beat === 'play' && phase === 'ready')))
			|| show.beat === 'visors';   // (nor while the visors go on: the walls are about the visors then)
		for (const p of pads) drawPad(ctx, p);
		drawBlockShadows(ctx);   // (on the sand, under everything standing on it)

		// Everything standing on the plane, far to near.
		const things = [];
		const add = (f, fn, d = 0) => { if (onView(f)) things.push({ f, fn, d }); };
		if (dollShown) {
			// (she and her tree are always there, however far off: on the horizon)
			things.push({ f: dollF + 140, fn: (c) => drawTree(c), d: 0 });
			things.push({ f: dollF, fn: (c) => drawDoll(c), d: 0 });
		}
		// (blocks side by side in a run: the ones further from their wall's vanishing
		// point first, so a block's receding side goes under its neighbour's front)
		for (const b of blocks) add(b.f - b.r * 0.6, (c) => drawBlock(c, b), Math.abs(b.x - vanishOf(wallOfX(b.x))));
		for (const m of cash) if (!m.taken) add(m.f, (c) => drawCash(c, m));
		for (const g of magnets) if (!g.taken) add(g.f, (c) => drawMagnet(c, g));
		for (const g of bags) if (!g.taken) add(g.f, (c) => drawBag(c, g));
		for (const b of bursts) add(b.f, (c) => drawBurst(c, b));
		for (const b of boulders) add(b.f, (c) => drawBoulder(c, b));
		for (const m of movers) add(m.f, (c) => (m.kind === 'guard' ? drawGuardOn(c, m.x, m.f, m.mask, true, m.phase, m.flash || 0, m.dir) : drawMarble(c, m)));
		for (const g of sentries) if (dollShown || !g.doll) add(g.f, (c) => drawGuardOn(c, g.x, g.f, g.mask, true, 0, g.flash, facing(g)));
		if (!waiting) for (const c of contestants) add(c.f, (cx) => drawContestant(cx, c));
		things.sort((a, b) => (b.f - a.f) || (b.d - a.d));
		for (const thing of things) thing.fn(ctx);
		if (!waiting) for (const c of contestants) if (c.alive && onView(footOf(c).f)) drawFoot(ctx, c);
		drawLasers(ctx);

		for (const t of tracers) drawTracer(ctx, t);
		if (show.beat === 'controls') drawAids(ctx);

		// Red light tints the arena; while her head is turning, a warning glow.
		const red = phase === 'red' || phase === 'drill-red';
		if (red || phase === 'warning') {
			const pulse = red ? 0.32 + 0.1 * Math.sin(phaseT * 8) : 0.18 * Math.min(1, phaseT / 0.3);
			const tint = red ? '255,30,40' : '255,170,20';
			art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(${tint},${red ? 0.12 : 0.05})` });
			art.eachWall(ctx, function (c) {
				const g = art.radial(c, W / 2, H / 2, H * 0.4, W * 0.62, [`rgba(${tint},0)`, `rgba(${tint},${pulse})`]);
				art.rect(c, 0, 0, W, H, { fill: g });
			});
		}
		if (gloom > 0) art.rect(ctx, -20, -20, WIDTH + 40, H + 40, { fill: '#1c0d10', alpha: gloom });
		ctx.restore();

		for (const p of pops) {
			show.text(ctx, p.text, p.x, p.y - p.age * 120, 56, { fill: p.colour, alpha: Math.min(1, 2 * (1.4 - p.age)) });
		}
	}

	// Over the camera, never zoomed: the doll-head insets, GREEN LIGHT /
	// RED LIGHT called out on every wall, and the white flash of a shot.
	function drawCalls(ctx) {
		if (showInset) {
			if (scaleAt(dollF) < SCALE * 0.4) drawInset(ctx, INSET.x);   // while she's small, far off on the horizon
			drawInset(ctx, CLOCK_AT[0].x, INSET.side);                 // and always on the side walls, where she can't be seen,
			drawInset(ctx, 2 * W + CLOCK_AT[2].x, INSET.side);         // under the clock
		}
		if (callout && callout.age < 2 && show.beat !== 'controls') {   // (the controls say it in their caption)
			const a = callout.age < 1.3 ? 1 : 1 - (callout.age - 1.3) / 0.7;
			const pop = Math.min(1, callout.age / 0.15);
			for (let w = 0; w < 3; w++) {
				art.with(ctx, { x: w * W + W / 2, y: w === 1 ? 380 : 330, scale: (0.7 + 0.3 * pop) * (w === 1 ? 1 : 0.8), alpha: Math.max(0, a) }, function (c) {
					show.text(c, callout.text.toUpperCase(), 0, 0, 110, { fill: callout.colour });
					if (callout.sub) show.text(c, callout.sub, 0, 115, 80, {});
				});
			}
		}
		if (flash > 0) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,255,255,${flash})` });
	}

	// Live hints on the sand in the controls intro: arrows either side of
	// each contestant to move, chevrons up the field ahead of them to step.
	function drawAids(ctx) {
		const step = CONTROLS.steps[practice.i];
		if (!step || practice.done) return;
		const pulse = 0.5 + 0.5 * Math.sin(wallT * 6);
		for (const c of contestants) {
			if (c.hop) continue;
			const colour = PLAYER_COLORS[c.n];
			const p = at(c.x, c.f, 0, c.wall);
			const s = p.s * 1.6;
			if (step.id === 'move') {
				for (const side of [-1, 1]) {
					const x = p.x + side * (75 + 14 * pulse) * s;
					const y = p.y - 60 * s;
					art.poly(ctx, [[x, y - 20 * s], [x + side * 26 * s, y], [x, y + 20 * s]], { fill: colour, alpha: 0.95 });
				}
			}
			if (step.id === 'step') {
				for (let i = 0; i < 3; i++) {
					const y = p.y - 185 * s - i * 22 * s - pulse * 10 * s;
					const w = 20 * s;
					art.poly(ctx, [[p.x - w, y + 12 * s], [p.x, y - 6 * s], [p.x + w, y + 12 * s], [p.x + w, y + 20 * s], [p.x, y + 2 * s], [p.x - w, y + 20 * s]], { fill: colour, alpha: 1 - i * 0.28 });
				}
			}
		}
	}

	// The arena: sand all the way up the walls, a little darker far away.
	// The arena: the sand, curving away to the horizon, hazy far off; the
	// painted sky above it.
	function drawArena(ctx) {
		const hz = horizonY();
		art.rect(ctx, -20, -20, WIDTH + 40, H + 40, { fill: art.linear(ctx, 0, hz, 0, H, ['#c0945e', '#d3ad79', '#e6c592']) });
		// rake marks every couple of metres, so the scrolling shows: flat
		// bands across, bunching up and fading toward the horizon
		const gap = 110;
		for (let f = Math.ceil(cam / gap) * gap; fadeIn(f) > 0; f += gap) {
			const p = at(0, f);
			art.rect(ctx, -20, p.y - 2 * p.s, WIDTH + 40, 4 * p.s, { fill: 'rgba(120,80,40,0.12)', alpha: fadeIn(f) });
		}
		// a few pebbles, scrolling with the field
		for (let k = Math.floor(cam / 90); k < (cam + 3000) / 90; k++) {
			const f = k * 90;
			for (let j = 0; j < 4; j++) {
				const x = ((k * 7919 + j * 104729) % 4700) + 50;
				const p = at(x, f + j * 20);
				if (p.y > H + 10 || fadeIn(f) <= 0) continue;
				art.ellipse(ctx, p.x, p.y, 9 * p.s, 4 * p.s, { fill: 'rgba(110,75,40,0.25)', alpha: fadeIn(f) });
			}
		}
		// the haze over the far sand, and the sky
		art.rect(ctx, -20, hz, WIDTH + 40, 260, { fill: art.linear(ctx, 0, hz, 0, hz + 260, ['rgba(246,236,214,0.9)', 'rgba(246,236,214,0)']) });
		art.rect(ctx, -20, -20, WIDTH + 40, hz + 20, { fill: art.linear(ctx, 0, 0, 0, hz, ['#6ec3ea', '#bfe4f2', '#f3ecd9']) });
		for (let i = 0; i < 9; i++) {
			const x = ((i * 977 + 260) % WIDTH) + Math.sin(wallT * 0.05 + i) * 30;
			const y = 30 + (i * 37) % 70;
			for (const [dx, dy, r] of [[0, 0, 34], [38, 6, 26], [-36, 8, 24], [14, -14, 24]]) art.ellipse(ctx, x + dx, y + dy, r * 1.6, r * 0.7, { fill: 'rgba(255,255,255,0.75)' });
		}
		art.rect(ctx, -20, hz - 1.5, WIDTH + 40, 3, { fill: 'rgba(160,120,80,0.35)' });
	}

	function drawSplat(ctx, s) {
		if (!onView(s.f)) return;
		const p = at(s.x, s.f, 0, s.wall);
		const k = Math.min(1, s.t / 0.35);
		const g = 1 - Math.pow(1 - k, 3);
		art.ellipse(ctx, p.x, p.y, 105 * p.s * g, 30 * p.s * g, { fill: '#b3001b' });
		for (let i = 0; i < 7; i++) {
			const a = s.seed + i * 2.1;
			const d = (85 + (i * 37 % 50)) * g;
			art.ellipse(ctx, p.x + Math.cos(a) * d * p.s, p.y + Math.sin(a) * d * 0.32 * p.s, (9 + i % 3 * 5) * p.s * g, (4 + i % 3 * 2) * p.s * g, { fill: '#b3001b' });
		}
	}

	function drawTracer(ctx, t) {
		const k = t.age / 0.35;
		art.line(ctx, [[t.x0, t.y0], [t.x1, t.y1]], { stroke: '#fff3b0', lineWidth: 7 * (1 - k), alpha: 1 - k });
		art.circle(ctx, t.x0, t.y0, 26 * (1 - k), { fill: '#ffe066', alpha: 1 - k });
		if (t.glance) {
			// the shot glances off into the sky
			const ex = t.x1 + t.dir * 260;
			const ey = t.y1 - 320;
			art.line(ctx, [[t.x1, t.y1], [ex, ey]], { stroke: '#fff3b0', lineWidth: 5 * (1 - k), alpha: 1 - k });
			for (let i = 0; i < 6; i++) {
				const a = i / 6 * Math.PI * 2;
				art.line(ctx, [[t.x1, t.y1], [t.x1 + Math.cos(a) * 40 * (0.5 + k), t.y1 + Math.sin(a) * 40 * (0.5 + k)]], { stroke: '#ffe066', lineWidth: 4, alpha: 1 - k });
			}
		}
	}

	// A block: a big playground shape standing on the sand, its footprint
	// drawn straight on the plane so it sits right in the field.
	// A block's outline on the sand, in field units: a long box with its four
	// corners cut off, front left first, going round anticlockwise.
	function footprint(b, grow = 0) {
		const c = b.r * 2 * BLOCK_LOOK.chamfer;
		const X = b.rx + grow;
		const F = b.r + grow;
		return [
			[b.x - X + c, b.f - F], [b.x + X - c, b.f - F], [b.x + X, b.f - F + c], [b.x + X, b.f + F - c],
			[b.x + X - c, b.f + F], [b.x - X + c, b.f + F], [b.x - X, b.f + F - c], [b.x - X, b.f - F + c],
		];
	}

	// The convex hull of some field points (for a shadow: the block's
	// outline and the same outline slid along the light).
	function hull(pts) {
		pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
		const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
		const lo = [];
		const hi = [];
		for (const p of pts) {
			while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
			lo.push(p);
		}
		for (let i = pts.length - 1; i >= 0; i--) {
			const p = pts[i];
			while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop();
			hi.push(p);
		}
		return lo.slice(0, -1).concat(hi.slice(0, -1));
	}

	// Field points onto the screen (on this block's wall), so many up.
	const onScreen = (pts, wall, up = 0) => pts.map(([x, f]) => { const p = at(x, f, up, wall); return [p.x, p.y]; });

	// Every block's shadow, soft: the outline slid away from the light in
	// layers, each a little further and a little wider, so it's darkest at the
	// foot of the block and fades out toward its tip; and a dark line of
	// contact where the block meets the sand.
	function drawBlockShadows(ctx) {
		for (const b of blocks) {
			if (!onView(b.f)) continue;
			const wall = wallOfX(b.x);
			const alpha = fadeIn(b.f + b.r);
			art.save(ctx, function (c) {
				c.globalAlpha = alpha;
				for (let i = 1; i <= SHADOW.layers; i++) {
					const t = i / SHADOW.layers;
					const base = footprint(b, SHADOW.spread * t * 0.5);
					const slid = base.map(([x, f]) => [x + b.h * SHADOW.x * t, f + b.h * SHADOW.f * t]);
					art.poly(c, onScreen(hull(base.concat(slid)), wall), { fill: `rgba(20,10,30,${SHADOW.dark})` });
				}
				art.poly(c, onScreen(footprint(b, 5), wall), { fill: `rgba(20,10,30,${SHADOW.contact})` });
			});
		}
	}

	// A block: a chunky slab with chamfered corners, each face shaded by which
	// way it faces the light (only the faces turned toward us drawn, so the
	// perspective takes care of itself), and one of the game's shapes
	// inscribed in its top.
	function drawBlock(ctx, b) {
		const alpha = fadeIn(b.f + b.r);
		const wall = wallOfX(b.x);
		const shade = (k) => mix(b.colour, k);
		const foot = footprint(b);
		const base = onScreen(foot, wall);
		const top = onScreen(foot, wall, b.h);
		const [lx, lf] = BLOCK_LOOK.light;
		const ll = Math.hypot(lx, lf);
		const s = scaleAt(b.f);
		art.save(ctx, function (c) {
			c.globalAlpha = alpha;
			c.lineJoin = 'round';
			for (let i = 0; i < foot.length; i++) {
				const j = (i + 1) % foot.length;
				const quad = [base[i], base[j], top[j], top[i]];
				// turned toward us? (drawn round the right way on screen)
				let area = 0;
				for (let k = 0; k < 4; k++) area += quad[k][0] * quad[(k + 1) % 4][1] - quad[(k + 1) % 4][0] * quad[k][1];
				if (area >= 0) continue;
				// its outward normal on the field, against the light
				const ex = foot[j][0] - foot[i][0];
				const ef = foot[j][1] - foot[i][1];
				const el = Math.hypot(ex, ef) || 1;
				const lit = (ef / el * lx - ex / el * lf) / ll;
				art.poly(c, quad, { fill: shade(0.8 + 0.22 * lit) });
				// darker toward the sand
				const yTop = Math.min(quad[2][1], quad[3][1]);
				const yBot = Math.max(quad[0][1], quad[1][1]);
				art.poly(c, quad, { fill: art.linear(c, 0, yTop, 0, yBot, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.16)']) });
				// a bright edge along its top
				art.line(c, [quad[3], quad[2]], { stroke: shade(1.45), lineWidth: Math.max(1, 3 * s) });
			}
			art.poly(c, top, { fill: shade(1.2) });
			// the shape, inscribed in the top: a groove and its bright inlay
			const size = b.r * BLOCK_LOOK.symbol;
			let shape;
			if (b.symbol === 'circle') shape = Array.from({ length: 28 }, (_, i) => [b.x + Math.cos(i / 28 * Math.PI * 2) * size, b.f + Math.sin(i / 28 * Math.PI * 2) * size]);
			else if (b.symbol === 'triangle') shape = [[b.x, b.f + size * 1.1], [b.x + size * 1.05, b.f - size * 0.75], [b.x - size * 1.05, b.f - size * 0.75]];
			else shape = [[b.x - size * 0.9, b.f - size * 0.9], [b.x + size * 0.9, b.f - size * 0.9], [b.x + size * 0.9, b.f + size * 0.9], [b.x - size * 0.9, b.f + size * 0.9]];
			const pts = onScreen(shape, wall, b.h);
			const w = BLOCK_LOOK.line * s;
			c.beginPath();
			pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
			c.closePath();
			c.lineWidth = w * 1.7;
			c.strokeStyle = shade(0.8);
			c.stroke();
			c.translate(0, -w * 0.3);
			c.lineWidth = w;
			c.strokeStyle = 'rgba(255,250,236,0.95)';
			c.stroke();
		});
	}

	// A soft shadow on the sand: darkest under the middle, fading to nothing
	// at its edge (and nudged a little away from the light).
	function softShadow(ctx, x, y, rx, ry, dark, alpha = 1) {
		if (rx <= 0 || ry <= 0) return;
		const R = rx * 1.3;
		art.with(ctx, { x: x + rx * 0.12, y, scaleY: ry / rx }, function (c) {
			art.circle(c, 0, 0, R, { fill: art.radial(c, 0, 0, 0, R, [[0, `rgba(10,5,20,${dark * 1.4})`], [0.45, `rgba(10,5,20,${dark})`], [1, 'rgba(10,5,20,0)']]), alpha });
		});
	}

	// Lighten (k > 1) or darken (k < 1) a hex colour.
	function mix(hex, k) {
		const n = parseInt(hex.slice(1), 16);
		const f = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
		return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
	}

	// A giant marble rolling across: glassy, with a coloured twist inside.
	function drawMarble(ctx, m) {
		const foot = at(m.x, m.f);
		const p = at(m.x, m.f, m.r);
		const r = m.r * p.s;
		art.save(ctx, function (c) {
			c.globalAlpha = fadeIn(m.f);
			softShadow(c, foot.x, foot.y, r * 1.05, r * 0.3, 0.28);
			art.circle(c, p.x, p.y, r, { fill: art.radial(c, p.x - r * 0.3, p.y - r * 0.3, r * 0.1, r * 1.3, ['#eef8ff', '#cfe6f8', '#8fb6d8']) });
			c.save();
			c.translate(p.x, p.y);
			c.rotate(m.spin);
			for (let i = 0; i < 3; i++) {
				c.rotate(Math.PI * 2 / 3);
				c.beginPath();
				c.ellipse(r * 0.28, 0, r * 0.5, r * 0.16, 0.6, 0, Math.PI * 2);
				c.fillStyle = m.colour;
				c.fill();
			}
			c.restore();
			art.ellipse(c, p.x - r * 0.38, p.y - r * 0.42, r * 0.26, r * 0.15, { fill: 'rgba(255,255,255,0.85)' });
		});
	}

	// A boulder rolling down the field: a rough round stone, lit from the top
	// left, its cracks and chips sliding down its face as it rolls toward
	// you, dust kicked up behind it.
	function drawBoulder(ctx, b) {
		const foot = at(b.x, b.f);
		const p = at(b.x, b.f, b.r);
		const r = b.r * p.s;
		const [base, dark, light] = b.shade;
		art.save(ctx, function (c) {
			c.globalAlpha = fadeIn(b.f);
			// dust behind it
			for (let i = 0; i < 4; i++) {
				const k = (b.dust * 2.2 + i / 4) % 1;
				const d = at(b.x + Math.sin(b.seed + i * 2.3) * b.r * 0.7, b.f + b.r * 0.6 + k * 160, 10 + k * 50);
				art.circle(c, d.x, d.y, (14 + k * 34) * d.s, { fill: 'rgba(214,186,140,0.55)', alpha: (1 - k) * 0.8 });
			}
			softShadow(c, foot.x, foot.y, r * 1.1, r * 0.3, 0.3);
			// the stone: a lumpy circle
			c.save();
			c.beginPath();
			for (let i = 0; i <= 18; i++) {
				const a = i / 18 * Math.PI * 2;
				const k = 1 + 0.06 * Math.sin(a * 3 + b.seed) + 0.04 * Math.sin(a * 5 + b.seed * 2);
				c[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(a) * r * k, p.y + Math.sin(a) * r * k);
			}
			c.closePath();
			c.fillStyle = art.radial(c, p.x - r * 0.35, p.y - r * 0.4, r * 0.1, r * 1.35, [[0, light], [0.45, base], [1, dark]]);
			c.fill();
			c.clip();
			// chips and cracks rolling down its face
			const roll = (b.spin * r) % (r * 2);
			for (let i = 0; i < 7; i++) {
				const u = Math.sin(b.seed + i * 7.1) * 0.7;
				const v = ((i / 7) * 2 * r + roll) % (2 * r) - r;
				const squash = Math.sqrt(Math.max(0, 1 - (v / r) * (v / r)));
				const x = p.x + u * r * squash;
				const y = p.y + v;
				if (i % 3 === 0) art.line(c, [[x - r * 0.18 * squash, y - r * 0.05], [x, y + r * 0.06 * squash], [x + r * 0.15 * squash, y - r * 0.02]], { stroke: dark, lineWidth: Math.max(1.5, r * 0.04) });
				else art.ellipse(c, x, y, r * 0.09 * (0.4 + squash), r * 0.06 * squash, { fill: i % 2 ? dark : light, alpha: 0.7 });
			}
			// the shadowed underside
			art.ellipse(c, p.x + r * 0.15, p.y + r * 0.55, r * 1.1, r * 0.6, { fill: 'rgba(0,0,0,0.18)' });
			c.restore();
		});
	}

	// A pink guard, facing the field: hood, black mask with a white shape,
	// black belt and boots. The armed ones line the walls with rifles.
	// dir: which way they face (1 right, -1 left; the rifle points that way)
	function drawGuardOn(ctx, x, f, mask, armed, walk, muzzle, dir = 1) {
		const p = at(x, f);
		const s = p.s * 1.45;
		art.with(ctx, { x: p.x, y: p.y, scaleX: s * dir, scaleY: s, alpha: fadeIn(f) }, function (c) {
			guard(c, mask, armed, walk, muzzle);
		});
	}

	const GUN = { muzzle: [58, -82] };   // where a held rifle's muzzle is, on the guard (facing right)
	// which way a guard faces: a patrolling one, the way it walks (or last
	// turned); one at the edge, in toward the field
	const facing = (g) => g.dir || (g.x < DOLL_X ? 1 : -1);
	function gunTip(g) {
		const p = at(g.x, g.f);
		const s = p.s * 1.45;
		return { x: p.x + GUN.muzzle[0] * s * facing(g), y: p.y + GUN.muzzle[1] * s };
	}

	function guard(c, mask, armed, walk, muzzle) {
		const PINK = '#e5287a';
		// the same quick steps as the contestants, bobbing up off each one
		const step = walk ? Math.sin(walk) * 7 : 0;
		const bob = walk ? Math.abs(Math.sin(walk)) * 7 : 0;
		softShadow(c, 0, 0, 28, 8, 0.3);
		// legs and boots
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * step);
			art.roundRect(c, side * 9 - 7, -44 - lift, 14, 36, 4, { fill: '#cf2470' });
			art.roundRect(c, side * 9 - 8, -12 - lift, 16, 12, 4, { fill: INK });
		}
		c.save();
		c.translate(0, -bob);
		// body, belt
		art.roundRect(c, -24, -94, 48, 56, [14, 14, 8, 8], { fill: PINK });
		art.rect(c, -24, -52, 48, 7, { fill: INK });
		// arms: swinging as they walk, or (armed) reaching forward to the rifle
		if (!armed) for (const side of [-1, 1]) art.roundRect(c, side * 26 - 6, -90 - side * step * 0.7, 12, 38, 6, { fill: '#c41f66' });
		// hood and mask
		art.circle(c, 0, -118, 26, { fill: '#f0458d' });
		art.ellipse(c, 0, -115, 18, 20, { fill: '#111' });
		const sym = { stroke: 'white', lineWidth: 3.5, lineJoin: 'round' };
		if (mask === 'circle') art.circle(c, 0, -115, 8, sym);
		else if (mask === 'triangle') art.poly(c, [[0, -125], [9, -108], [-9, -108]], sym);
		else art.rect(c, -7.5, -123, 15, 15, sym);
		if (armed) {
			// the rifle held out in front in both hands, pointing the way they face:
			// the stock at the hip, the barrel out and a little up
			const grip = [-2, -60];
			const fore = [30, -70];
			art.line(c, [[-22, -86], grip], { stroke: '#c41f66', lineWidth: 12 });   // the back arm, to the grip
			art.line(c, [[-16, -52], GUN.muzzle], { stroke: '#2b2b2b', lineWidth: 8 });   // the barrel
			art.line(c, [[-22, -48], [-6, -56]], { stroke: '#5a4332', lineWidth: 12 });     // the stock
			art.line(c, [[22, -86], fore], { stroke: '#c41f66', lineWidth: 12 });      // the front arm, under the barrel
			art.circle(c, grip[0], grip[1], 6, { fill: '#f0458d' });
			art.circle(c, fore[0], fore[1], 6, { fill: '#f0458d' });
			if (muzzle > 0) art.poly(c, star(GUN.muzzle[0], GUN.muzzle[1], 22, 9, 8), { fill: '#ffe066' });
		}
		c.restore();
	}

	function star(x, y, r0, r1, n) {
		const pts = [];
		for (let i = 0; i < n * 2; i++) {
			const r = i % 2 ? r1 : r0;
			const a = i / (n * 2) * Math.PI * 2;
			pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
		}
		return pts;
	}

	// A contestant: a chibi in the show's teal-green tracksuit, seen from
	// behind, white trim, their number on the back, their player colour on a
	// ring round their feet. On red light the whole body tilts toward the
	// player's drift; shot, they topple sideways.
	function drawContestant(ctx, c) {
		const colour = PLAYER_COLORS[c.n];
		const ground = at(c.x, c.f, 0, c.wall);
		const p = at(c.x, c.f, c.lift, c.wall);      // off the sand, mid-skip
		const s = p.s * 1.6;
		const alpha = fadeIn(c.f);
		const air = 1 - c.lift / 300;        // the shadow shrinks under a skip
		// a solid spot of their colour, always under the avatar
		if (c.alive) art.ellipse(ctx, ground.x, ground.y, 40 * s * air, 13 * s * air, { fill: colour, alpha: alpha * 0.9 });
		// magnetised: rings of soft magnetic red, closing in on them over and
		// over, the pull drawn on the sand
		if (c.alive && c.magnet > 0) {
			const on = alpha * Math.min(1, c.magnet * 2);
			for (let i = 0; i < 3; i++) {
				const k = (clock * 1.4 + i / 3) % 1;              // 0: far out, 1: in at their feet
				const R = (260 - 210 * k) * s;
				const fade = Math.sin(k * Math.PI);              // (in from nothing, gone as it arrives)
				art.with(ctx, { x: ground.x, y: ground.y, scaleY: 0.33 }, function (c2) {
					art.circle(c2, 0, 0, R, { fill: art.radial(c2, 0, 0, R * 0.55, R, [[0, 'rgba(255,77,109,0)'], [0.75, 'rgba(255,77,109,0.45)'], [1, 'rgba(255,77,109,0)']]), alpha: on * fade });
				});
			}
		}
		softShadow(ctx, ground.x, ground.y, 27 * s * air, 8 * s * air, 0.35, alpha);

		let rotate = 0;
		let scaleY = 1;
		if (c.down > 0) {
			// flat as a pancake, springing back up at the end
			const k = 1 - c.down / BOULDER.down;
			scaleY = k < 0.8 ? 0.22 : 0.22 + 0.78 * ease((k - 0.8) / 0.2) * (1 + Math.sin((k - 0.8) / 0.2 * Math.PI) * 0.25);
		} else if (c.fall) {
			const k = Math.min(1, c.fall.t / 0.45);
			rotate = c.fall.dir * 88 * k * k;
		} else {
			const lx = Math.max(-1.6, Math.min(1.6, c.lean.x));
			const lz = Math.max(-1.4, Math.min(1.4, c.lean.z));
			rotate = lx * 24;
			scaleY = 1 - 0.14 * lz;     // leaning up the field (or back) foreshortens
		}
		art.with(ctx, { x: p.x, y: p.y, scale: s, scaleY, rotate, alpha }, function (cx) {
			contestant(cx, c);
		});

		if (c.down > 0) {
			// stars going round their head
			for (let i = 0; i < 3; i++) {
				const a = clock * 5 + i * Math.PI * 2 / 3;
				art.text(ctx, '★', p.x + Math.cos(a) * 40 * s, p.y - 45 * s + Math.sin(a) * 12 * s, { size: 26 * s, fill: '#ffe14a', outline: INK, outlineWidth: 2, alpha });
			}
		}

		if (!c.alive) return;
		// over their head: a marker in their colour
		const bob = Math.sin(clock * 4 + c.n) * 4;
		const top = p.y - 175 * s + bob * s;
		art.poly(ctx, [[p.x - 14 * s, top - 14 * s], [p.x + 14 * s, top - 14 * s], [p.x, top + 4 * s]], { fill: colour, alpha });
	}

	// Where the player really is, 1:1, even when a block holds the avatar back
	// or red light glues its feet (mid-skip it rides along under the avatar):
	// a ring of their colour, a little bigger than the spot under the avatar,
	// drawn over everything so nothing hides it.
	function footOf(c) {
		return c.hop ? { x: c.x, f: c.f, air: 1 - c.lift / 300 } : { x: xOf(c, bandF(c)), f: bandF(c), air: 1 };
	}
	function drawFoot(ctx, c) {
		const foot = footOf(c);
		const g = at(foot.x, foot.f, 0, c.wall);
		const s = g.s * 1.6 * foot.air;
		art.ellipse(ctx, g.x, g.y, 50 * s, 17 * s, { stroke: PLAYER_COLORS[c.n], lineWidth: 6, alpha: fadeIn(foot.f) });
	}

	// A jump pad: a glowing ring painted on the sand at the corner end of a
	// wall, pulsing, with chevrons pointing round the corner.
	function drawPad(ctx, p) {
		if (!onView(p.f)) return;
		const front = at(p.x, p.f - PAD.rf);
		const back = at(p.x, p.f + PAD.rf);
		const cy = (front.y + back.y) / 2;
		const squash = (front.y - back.y) / 2 / PAD.rx;
		const beat = 0.5 + 0.5 * Math.sin(padPulse + p.x * 0.01);
		const appear = Math.min(1, p.age / 0.35);
		const R = PAD.rx;
		const GLOW = '#7df9ff';
		const dir = Math.sign(p.to - p.wall);
		const across = front.s / SCALE;   // (smaller far off)
		art.with(ctx, { x: (front.x + back.x) / 2, y: cy, scaleX: appear * (1 + 0.06 * beat) * across, scaleY: appear * (1 + 0.06 * beat) * squash, alpha: fadeIn(p.f) }, function (c) {
			for (const k of [1.5, 1.3, 1.14]) art.circle(c, 0, 0, R * k, { fill: GLOW, alpha: (0.12 + 0.2 * beat) * 0.55 });
			art.circle(c, 0, 0, R, { fill: GLOW });
			art.circle(c, 0, 0, R * 0.8, { fill: '#1d6f86' });
			// two small chevrons, centred in the ring, pointing round the corner
			art.with(c, { scaleX: dir * 0.7, scaleY: 0.7 }, function (c2) {
				for (const ox of [-8, 28]) art.poly(c2, [[ox - 16, -40], [ox + 18, 0], [ox - 16, 40], [ox - 38, 40], [ox - 4, 0], [ox - 38, -40]], { fill: GLOW, alpha: 0.6 + 0.4 * beat });
			});
		});
	}

	// A wad of cash: a stack of green notes with a paper band, floating above
	// the sand and bobbing up and down, its shadow shrinking as it rises.
	function drawCash(ctx, m) {
		art.save(ctx, (c) => { c.globalAlpha *= fadeIn(m.f); drawCashHere(c, m); });
	}
	function drawCashHere(ctx, m) {
		// (flying out of a money bag: along an arc from the bag to where it lands)
		const k = m.fly ? Math.max(0, m.fly.t) / BAG.fly : 1;
		const p = m.fly ? at(m.fly.x0 + (m.x - m.fly.x0) * k, m.fly.f0 + (m.f - m.fly.f0) * k) : at(m.x, m.f);
		const s = p.s * CASH.size;
		const rise = 0.5 + 0.5 * Math.sin(m.spin * 2.4);
		const lift = (CASH.float + CASH.bob * rise + (m.fly ? BAG.arc * 4 * k * (1 - k) : 0)) * p.s;
		softShadow(ctx, p.x, p.y, 30 * s * (1 - 0.25 * rise), 9 * s * (1 - 0.25 * rise), 0.22, 1 - 0.35 * rise);
		art.with(ctx, { x: p.x, y: p.y - lift, scale: s, rotate: -0.35 + Math.sin(m.spin * 1.3) * 0.1 }, function (c) {
			// seen at an angle: tipped back and skewed, a stack of notes with depth
			c.transform(1, 0, -0.45, 0.72, 0, 0);
			for (let i = 2; i >= 0; i--) {
				const y = -14 - i * 7;
				art.rect(c, -26, y + 14, 52, 7, { fill: '#1f7a43' });   // the stack's edge
				art.roundRect(c, -26, y - 6, 52, 22, 3, { fill: i % 2 ? '#2f9e57' : '#3cbf6a' });
			}
			art.rect(c, -7, -34, 14, 36, { fill: '#f3ead2' });   // the paper band, over the top and down the front
			art.circle(c, 0, -22, 6, { fill: '#2f9e57' });
		});
	}

	// A magnet: a red horseshoe with silver tips, floating and turning a little,
	// sparks crackling between its tips.
	function drawMagnet(ctx, g) {
		art.save(ctx, (c) => { c.globalAlpha *= fadeIn(g.f); drawMagnetHere(c, g); });
	}
	function drawMagnetHere(ctx, g) {
		const p = at(g.x, g.f);
		const s = p.s * CASH.size;
		const rise = 0.5 + 0.5 * Math.sin(g.spin * 2.4);
		const lift = (CASH.float + CASH.bob * rise) * p.s;
		softShadow(ctx, p.x, p.y, 26 * s * (1 - 0.25 * rise), 8 * s * (1 - 0.25 * rise), 0.22, 1 - 0.35 * rise);
		art.with(ctx, { x: p.x, y: p.y - lift, scale: s, rotate: Math.sin(g.spin * 1.6) * 0.25 }, function (c) {
			c.save();
			c.lineCap = 'butt';
			c.lineWidth = 12;
			c.strokeStyle = '#e83a4e';
			c.beginPath();
			c.arc(0, -22, 15, Math.PI, 0, true);   // the bend, at the bottom, tips up
			c.stroke();
			c.beginPath();
			c.moveTo(-15, -22);
			c.lineTo(-15, -36);
			c.moveTo(15, -22);
			c.lineTo(15, -36);
			c.stroke();
			c.restore();
			for (const side of [-1, 1]) art.rect(c, side * 15 - 6, -46, 12, 10, { fill: '#e6e9ef' });   // the tips
			if (Math.sin(g.spin * 9) > 0.3) art.line(c, [[-12, -50], [-4, -56], [3, -49], [12, -55]], { stroke: '#ffe066', lineWidth: 2.5 });
		});
	}

	// A money bag: a fat sack of cloth tied at the neck, a ₩ on its front,
	// floating and bobbing like the cash, a glint winking on it now and then.
	function drawBag(ctx, g) {
		art.save(ctx, (c) => { c.globalAlpha *= fadeIn(g.f); drawBagHere(c, g); });
	}
	function drawBagHere(ctx, g) {
		const p = at(g.x, g.f);
		const s = p.s * CASH.size;
		const rise = 0.5 + 0.5 * Math.sin(g.spin * 2.4);
		const lift = (CASH.float + CASH.bob * rise) * p.s;
		softShadow(ctx, p.x, p.y, 34 * s * (1 - 0.25 * rise), 10 * s * (1 - 0.25 * rise), 0.22, 1 - 0.35 * rise);
		art.with(ctx, { x: p.x, y: p.y - lift, scale: s, rotate: Math.sin(g.spin * 1.4) * 6 }, function (c) {
			// the sack: wide at the bottom, gathered in at the neck
			c.beginPath();
			c.moveTo(-10, -52);
			c.bezierCurveTo(-40, -44, -38, -2, -24, 0);
			c.lineTo(24, 0);
			c.bezierCurveTo(38, -2, 40, -44, 10, -52);
			c.closePath();
			c.fillStyle = '#d9a441';
			c.fill();
			c.beginPath();
			c.ellipse(10, -24, 12, 18, 0, 0, Math.PI * 2);   // a lighter side, where the light falls
			c.fillStyle = 'rgba(255,240,190,0.35)';
			c.fill();
			art.poly(c, [[-12, -52], [12, -52], [18, -66], [6, -60], [0, -68], [-6, -60], [-18, -66]], { fill: '#d9a441' });   // the ruffle above the tie
			art.rect(c, -13, -55, 26, 6, { fill: '#7a4b1c' });   // the tie
			art.text(c, '₩', 0, -23, { size: 26, fill: '#7a4b1c', font: 'Paytone One', weight: 400 });
			if (Math.sin(g.spin * 1.7) > 0.93) {
				const gl = (Math.sin(g.spin * 1.7) - 0.93) / 0.07;
				art.line(c, [[-18, -40 - 9 * gl], [-18, -40 + 9 * gl]], { stroke: '#fff', lineWidth: 2.5 });
				art.line(c, [[-18 - 9 * gl, -40], [-18 + 9 * gl, -40]], { stroke: '#fff', lineWidth: 2.5 });
			}
		});
	}

	// A money bag popping: a flash, a gold ring spreading out over the sand and
	// scraps of sacking flung up and falling.
	const BURST = 0.6;
	function drawBurst(ctx, b) {
		const k = b.t / BURST;
		const p = at(b.x, b.f);
		const s = p.s * CASH.size;
		const y = p.y - CASH.float * p.s;
		art.save(ctx, (c) => {
			c.globalAlpha *= fadeIn(b.f) * (1 - k);
			art.ellipse(c, p.x, p.y, (40 + 260 * k) * s, (12 + 78 * k) * s, { stroke: '#ffd23f', lineWidth: 6 * s * (1 - k) + 1 });
			if (k < 0.3) art.circle(c, p.x, y - 30 * s, (30 + 120 * k) * s, { fill: 'rgba(255,240,180,' + (0.9 - k * 3) + ')' });
			for (let i = 0; i < 8; i++) {
				const a = i / 8 * Math.PI * 2 + 0.3;
				const d = 90 * k * s;
				const sx = p.x + Math.cos(a) * d * 1.4;
				const sy = y - 30 * s + Math.sin(a) * d * 0.7 - (120 * k - 160 * k * k) * s;
				art.with(c, { x: sx, y: sy, rotate: k * 500 + i * 45 }, (cc) => art.rect(cc, -6 * s, -4 * s, 12 * s, 8 * s, { fill: i % 2 ? '#d9a441' : '#b8862f' }));
			}
		});
	}

	const FREEZE_ARMS = 55;   // degrees the arms swing out from the body when frozen

	function contestant(c, k) {
		const TEAL = '#1f8a6e';
		const PANTS = '#17705a';
		const SKIN = '#f2c9a8';
		const step = k.glue || k.fall ? 0 : Math.sin(k.walk) * 7 * k.moving;
		// and the body bobs up off each step: twice a stride
		const bob = k.glue || k.fall ? 0 : Math.abs(Math.sin(k.walk)) * 7 * k.moving;
		// frozen on red light: a little squat, feet apart, knees bent out
		const squat = k.fall ? 0 : (k.squat || 0);
		// legs (thigh and shin), with white stripes, and white trainers
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * step);
			const hip = [side * 8.5, -42 + 8 * squat - lift];
			const knee = [side * (8.5 + 12 * squat), -24 + 2 * squat - lift];
			const ankle = [side * (8.5 + 9 * squat), -6 - lift];
			art.line(c, [hip, knee, ankle], { stroke: PANTS, lineWidth: 13, lineCap: 'round' });
			art.line(c, [[hip[0] + side * 4.5, hip[1] + 2], [knee[0] + side * 4.5, knee[1]], [ankle[0] + side * 4.5, ankle[1] - 4]], { stroke: 'white', lineWidth: 2.5 });
			art.roundRect(c, ankle[0] - 8, ankle[1] - 4, 16, 10, 4, { fill: '#f6f6f2' });
		}
		// everything above the legs rides the bob
		c.save();
		c.translate(0, -bob + 8 * squat);   // (lower in the squat)
		// and bends at the hips away from the way they're heading
		const drift = k.glue || k.fall ? 0 : (k.drift || 0);
		c.translate(0, -44);
		c.rotate(-drift * 0.28);
		c.translate(0, 44);
		// arms, swinging as they walk, trailing out behind as they run: splayed
		// back as they go, and swept away from the way they're heading
		const run = k.glue || k.fall ? 0 : k.moving;
		for (const side of [-1, 1]) {
			const swing = -side * step * 0.7;
			// (in the squat, held out to the sides for balance)
			// (art.with turns in degrees: frozen, the arms angle out and down, FREEZE_ARMS from hanging)
			const trail = (drift * 0.7 - side * run * 0.35) * (1 - squat) - side * FREEZE_ARMS * squat;
			art.with(c, { x: side * 26, y: -86 + swing, rotate: trail }, function (a) {
				art.roundRect(a, -6, 0, 12, 38, 6, { fill: '#176f5b' });
				art.line(a, [[side * 3, 4], [side * 3, 32]], { stroke: 'white', lineWidth: 2.5 });
				art.circle(a, 0, 40, 6, { fill: SKIN });
			});
		}
		// the jacket: white trim down the sides and round the collar
		art.roundRect(c, -22, -90, 44, 50, [13, 13, 7, 7], { fill: TEAL });
		art.line(c, [[-18, -84], [-18, -44]], { stroke: 'white', lineWidth: 3 });
		art.line(c, [[18, -84], [18, -44]], { stroke: 'white', lineWidth: 3 });
		art.line(c, [[-13, -89], [13, -89]], { stroke: 'white', lineWidth: 4, lineCap: 'round' });
		// the number on the back
		art.roundRect(c, -14, -80, 28, 19, 3, { fill: 'white' });
		art.text(c, k.number, 0, -70, { size: 14, font: 'Rubik', weight: 800, fill: INK });
		// head from behind: black hair, ears peeking out
		art.rect(c, -6, -98, 12, 9, { fill: SKIN });
		for (const side of [-1, 1]) art.ellipse(c, side * 21, -110, 5, 7, { fill: SKIN });
		art.circle(c, 0, -114, 22, { fill: '#1a1612' });
		art.ellipse(c, -7, -124, 8, 4, { fill: 'rgba(255,255,255,0.15)' });
		c.restore();
	}

	// A contestant facing the room, for the results: the same chibi in the
	// green tracksuit, their number on the chest, their colour round their
	// feet. Feet at the origin, about 136 tall. Pose 'stand', 'cheer' (arms
	// up) or 'win' (arms up, waving, a big grin).
	function contestantFront(c, n, pose) {
		const TEAL = '#1f8a6e';
		const PANTS = '#17705a';
		const SLEEVE = '#176f5b';
		const SKIN = '#f2c9a8';
		const up = pose === 'cheer' || pose === 'win';
		const wave = pose === 'win' ? Math.sin(wallT * 9 + n) * 0.35 : 0;
		art.ellipse(c, 0, 0, 44, 14, { fill: PLAYER_COLORS[n] || 'white' });
		softShadow(c, 0, 0, 28, 8, 0.3);
		// legs, white stripes down the outsides, white trainers
		for (const side of [-1, 1]) {
			art.roundRect(c, side * 8.5 - 6.5, -44, 13, 38, 4, { fill: PANTS });
			art.rect(c, side * 13 - 1.25, -42, 2.5, 32, { fill: 'white' });
			art.roundRect(c, side * 8.5 - 8, -10, 16, 10, 4, { fill: '#f6f6f2' });
		}
		// arms: hanging, or flung up (waving, to win)
		for (const side of [-1, 1]) {
			const a = up ? side * (2.5 + wave * side) : side * 0.12;   // radians out from hanging down
			const sx = side * 22;
			const sy = -84;
			const hx = sx + Math.sin(a) * 40;
			const hy = sy + Math.cos(a) * 40;
			art.line(c, [[sx, sy], [hx, hy]], { stroke: SLEEVE, lineWidth: 12, lineCap: 'round' });
			art.circle(c, hx + Math.sin(a) * 4, hy + Math.cos(a) * 4, 6.5, { fill: SKIN });
		}
		// the jacket, its zip and collar, and the number on the chest
		art.roundRect(c, -22, -90, 44, 50, [13, 13, 7, 7], { fill: TEAL });
		art.rect(c, -1, -86, 2, 44, { fill: 'rgba(255,255,255,0.55)' });
		art.poly(c, [[-13, -90], [0, -80], [13, -90]], { fill: 'white' });
		art.roundRect(c, -19, -74, 17, 13, 2, { fill: 'white' });
		art.text(c, NUMBERS[n] || String(n + 1).padStart(3, '0'), -10.5, -67.5, { size: 10, font: 'Rubik', weight: 800, fill: INK });
		// the head: black hair, a round face, a fringe
		art.rect(c, -6, -98, 12, 9, { fill: SKIN });
		art.circle(c, 0, -116, 23, { fill: '#1a1612' });
		for (const side of [-1, 1]) art.ellipse(c, side * 21, -110, 4.5, 6.5, { fill: SKIN });
		art.circle(c, 0, -110, 18.5, { fill: SKIN });
		art.ellipse(c, 0, -125, 21, 8.5, { fill: '#1a1612' });
		for (const side of [-1, 1]) {
			art.ellipse(c, side * 7, -110, 2.8, up ? 2 : 3.6, { fill: '#1a1612' });
			art.ellipse(c, side * 11.5, -103, 3.6, 2.2, { fill: '#ff8fa8', alpha: 0.75 });
		}
		if (up) art.ellipse(c, 0, -100, pose === 'win' ? 5.5 : 4.5, pose === 'win' ? 4.5 : 3.5, { fill: '#8a2a34' });
		else art.rect(c, -3.5, -101, 7, 1.8, { fill: '#8a2a34' });
	}

	// The giant doll: orange pinafore over a yellow top, black bob with
	// pigtails, small beady eyes. As in the show her body faces the tree,
	// back to the players; only her head turns round to watch them.
	function drawDoll(ctx) {
		const p = at(DOLL_X, dollF);
		art.with(ctx, { x: p.x, y: p.y, scale: p.s * 0.82 }, function (c) {
			softShadow(c, 0, 0, 190, 34, 0.25);
			dollBody(c, false);
			art.with(c, { y: -610, scale: 2.1 }, (c2) => dollHead(c2, head.yaw, glare));
		});
	}

	function dollBody(c, front) {
		const SKIN = '#f6d6c0';
		const ORANGE = '#f07b1f';
		const YELLOW = '#f7c934';
		// legs, white socks, shoes
		for (const side of [-1, 1]) {
			art.roundRect(c, side * 40 - 19, -190, 38, 170, 14, { fill: SKIN });
			art.roundRect(c, side * 40 - 20, -78, 40, 52, 10, { fill: '#f8f6f0' });
			art.roundRect(c, side * 40 - 27, -34, 54, 34, [16, 16, 8, 8], { fill: '#7a2e1c' });
		}
		// arms hanging at her sides, out of puffed yellow sleeves
		for (const side of [-1, 1]) {
			art.roundRect(c, side * 122 - 20, -455, 40, 190, 18, { fill: SKIN });
			art.circle(c, side * 112, -450, 44, { fill: '#e8b020' });
		}
		// the yellow top, then the pinafore over it
		art.roundRect(c, -100, -500, 200, 130, [60, 60, 10, 10], { fill: YELLOW });
		art.poly(c, [[-96, -400], [96, -400], [175, -170], [-175, -170]], { fill: ORANGE });
		if (front) {
			// the bib and its straps, a white collar
			art.roundRect(c, -66, -470, 132, 80, 8, { fill: ORANGE });
			for (const side of [-1, 1]) art.line(c, [[side * 58, -466], [side * 62, -500]], { stroke: ORANGE, lineWidth: 22, lineCap: 'round' });
			art.poly(c, [[-46, -500], [0, -470], [46, -500], [30, -510], [-30, -510]], { fill: '#fbf7ee' });
			art.roundRect(c, -28, -450, 56, 40, 8, { fill: mix(ORANGE, 0.85) });
		} else {
			// straps crossing on her back
			art.line(c, [[-64, -500], [62, -405]], { stroke: ORANGE, lineWidth: 24, lineCap: 'round' });
			art.line(c, [[64, -500], [-62, -405]], { stroke: ORANGE, lineWidth: 24, lineCap: 'round' });
		}
		art.rect(c, -20, -525, 40, 30, { fill: SKIN });
	}

	// Her head, about 60 across, centred on (0, 0), turned `yaw` round from
	// facing the players (0) to facing the tree (PI). It's drawn as a ball:
	// each feature sits at a longitude on it, slides across as she turns,
	// narrows toward the edge and goes out of sight round the back.
	function dollHead(c, yaw, glare) {
		const HAIR = '#16120f';
		const SKIN = '#f6d6c0';
		const R = 60;
		// where a feature at longitude `lon` is: across, and how far it faces us
		const turn = (lon) => ({ x: Math.sin(lon + yaw), facing: Math.cos(lon + yaw) });

		// pigtails, at the sides: behind the head when they're turned away
		const pigtail = function (side) {
			const p = turn(side * Math.PI / 2);
			art.ellipse(c, p.x * 64, 16, 15, 24, { fill: HAIR });
			art.circle(c, p.x * 55, -4, 7, { fill: '#f7c934' });
			return p.facing;
		};
		const sides = [-1, 1];
		// (they stick out at the sides, so only go behind once well round)
		for (const side of sides) if (turn(side * Math.PI / 2).facing < -0.25) pigtail(side);

		art.circle(c, 0, 0, 62, { fill: HAIR });
		art.save(c, function (c2) {
			c2.beginPath();
			c2.arc(0, 0, 62, 0, Math.PI * 2);
			c2.clip();

			// the face: a disc on the front of the ball, narrowing as it turns away
			const face = turn(0);
			if (face.facing > 0.03) {
				const w = 50 * face.facing;
				art.ellipse(c2, face.x * (62 - w), 12, w, 47, { fill: SKIN });   // hugging the edge as it turns away
			}
			// the fringe stays straight across the top, whichever way she faces
			c2.beginPath();
			c2.arc(0, 0, 62, Math.PI * 1.07, Math.PI * 1.93);
			c2.closePath();
			c2.fillStyle = HAIR;
			c2.fill();

			// small beady eyes (glowing red while she watches), cheeks, mouth,
			// only while her face is still round this side
			for (const side of face.facing > 0.2 ? sides : []) {
				const e = turn(side * 0.34);
				if (e.facing > 0.25) {
					const sx = e.facing;
					if (glare > 0) art.ellipse(c2, e.x * 54, 10, 12 * sx, 12, { fill: `rgba(255,40,40,${0.55 * glare})` });
					// little empty rings: the eye, with her skin showing through the middle
					art.ellipse(c2, e.x * 54, 10, 5.5 * sx, 5.5, { fill: glare > 0.5 ? '#ff1a1a' : '#0b0b0b' });
					art.ellipse(c2, e.x * 54, 10, 3 * sx, 3, { fill: SKIN });
				}
				const k = turn(side * 0.62);
				if (k.facing > 0.3) art.ellipse(c2, k.x * 52, 27, 9 * k.facing, 5, { fill: 'rgba(243,150,150,0.7)' });
			}
			const m = turn(0);
			if (m.facing > 0.3 && face.facing > 0.2) art.ellipse(c2, m.x * 50, 35, 5 * m.facing, 3, { fill: '#c8323c' });

			// the parting down the back of her head
			const back = turn(Math.PI);
			if (back.facing > 0.1) {
				art.line(c2, [[back.x * 58, -58], [back.x * 52, -12]], { stroke: 'rgba(255,255,255,0.1)', lineWidth: 3 * back.facing });
			}
			art.ellipse(c2, -20, -30, 18, 9, { fill: 'rgba(255,255,255,0.13)' });   // the light, from the same side always
		});

		for (const side of sides) if (turn(side * Math.PI / 2).facing >= -0.25) pigtail(side);
	}

	// The tree behind her: a bare trunk with a few clumps of leaves.
	function drawTree(ctx) {
		const p = at(DOLL_X - 360, dollF + 140);
		art.with(ctx, { x: p.x, y: p.y, scale: p.s * 0.85 }, function (c) {
			const BARK = '#5a4332';
			softShadow(c, 0, 0, 120, 22, 0.22);
			const branches = [[[0, -380], [-150, -560], [-230, -610]], [[0, -430], [120, -600], [210, -650]], [[0, -330], [180, -420]], [[0, -300], [-170, -390]], [[0, -480], [10, -720]]];
			for (const b of branches) art.line(c, b, { stroke: BARK, lineWidth: 22, lineCap: 'round' });
			art.poly(c, [[-48, 0], [48, 0], [24, -260], [16, -500], [-16, -500], [-24, -260]], { fill: BARK });
			const leaves = [[-230, -620, 70], [210, -660, 80], [10, -730, 70], [180, -430, 50], [-170, -400, 50], [-100, -560, 46]];
			for (const [x, y, r] of leaves) {
				art.circle(c, x, y, r, { fill: '#7e9a52' });
				art.circle(c, x - r * 0.3, y - r * 0.3, r * 0.4, { fill: '#93b062' });
			}
		});
	}

	// The doll-head inset, while she's too far up the field to see: her head
	// in a ring that says what she's doing.
	function drawInset(ctx, x, y = INSET.y) {
		const looking = Math.cos(head.yaw) > 0.5;
		const turning = head.t < head.dur;
		const label = looking ? 'WATCHING' : turning ? 'TURNING' : 'BACK TURNED';
		const colour = looking ? '#ff3640' : turning ? '#ffb020' : '#27d96b';
		const { r } = INSET;
		art.circle(ctx, x, y, r + 10, { fill: colour });
		art.circle(ctx, x, y, r, { fill: '#f3e3c4' });
		art.save(ctx, function (c) {
			c.beginPath();
			c.arc(x, y, r, 0, Math.PI * 2);
			c.clip();
			art.with(c, { x, y: y + 18, scale: 1.05 }, function (c2) {
				art.roundRect(c2, -70, 55, 140, 80, 30, { fill: '#f7c934' });
				dollHead(c2, head.yaw, glare);
			});
		});
		art.roundRect(ctx, x - 92, y + r - 6, 184, 40, 20, { fill: colour });
		show.text(ctx, label, x, y + r + 14, 28, {});
	}

	/* ---------- the controls intro ---------- */

	// The step through the controls: one at a time, each with its caption
	// and a live demo on the sand. A step moves on once the players have
	// done it (and it has had its minimum time), or when its time runs out.
	// Nobody is shot in practice.
	const practice = { i: 0, age: 0, done: false, doneAge: 0, moved: 0, stepped: 0, red: 0 };

	function enterStep(i) {
		Object.assign(practice, { i, age: 0, done: false, doneAge: 0, moved: 0, stepped: 0, red: 0 });
		pads = pads.filter((p) => !p.practice);
		cash = cash.filter((m) => !m.practice);
		for (const c of contestants) { c.glue = null; c.drill = 0; c.grabbed = 0; }
		if (phase === 'drill-red') { glare = 0; }
		setPhase('drill');
		const step = CONTROLS.steps[i];
		if (!step) return;
		show.fx('stepIn');
		voice('step_' + step.id);
		// practice cash on the front wall only, just up the field from them
		if (step.id === 'cash') {
			layCash(cam + BACK + DEPTH * 0.25, cam + BACK + DEPTH * 0.9, CONTROLS.cashEvery, true, [1]);
		}
		// a practice pad at every corner end, halfway up the play area
		if (step.id === 'jump') {
			for (const [wall, to, x] of CORNERS) pads.push({ x, f: cam + BACK + DEPTH * 0.5, wall, to, age: 0, practice: true });
		}
	}

	function achieved(step) {
		const n = Math.max(1, contestants.length);
		switch (step.id) {
			case 'move': return practice.moved > CONTROLS.moved * n;
			case 'step': return practice.stepped > CONTROLS.stepped * n;
			case 'cash': return contestants.every((c) => c.grabbed >= CONTROLS.grab);
			case 'freeze': return practice.red >= 2;
			case 'jump': return contestants.every((c) => c.drill >= 1 && !c.hop);   // (one jump each is enough)
		}
		return false;
	}

	let lastSpot = [];
	function stepControls(dt) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		practice.age += dt;
		phaseT += dt;
		// how far everyone has moved, along their wall and toward it
		contestants.forEach(function (c, i) {
			const u = alongOf(c.wall, c.px, c.pz);
			const near = nearOf(c.wall, c.px, c.pz);
			const was = lastSpot[i];
			if (was && was.wall === c.wall && !c.glue) {
				practice.moved += Math.abs(u - was.u);
				practice.stepped += Math.abs(near - was.near);
			}
			lastSpot[i] = { wall: c.wall, u, near };
		});
		if (step.id === 'freeze') {
			// a practice red light: feet stuck, the lean shows, nobody shot
			if (practice.red === 0 && practice.age >= CONTROLS.red[0]) {
				practice.red = 1;
				say('Red light', '#ff3640', 'FREEZE');
				freeze();
				aimLasers();
				setPhase('drill-red');
			}
			if (practice.red === 1) {
				blipAt -= dt;
				if (blipAt <= 0) { sound.blip(); blipAt = 0.45; }
			}
			if (practice.red === 1 && practice.age >= CONTROLS.red[1]) {
				practice.red = 2;
				say('Green light', '#27d96b');
				for (const c of contestants) c.glue = null;
				setPhase('drill');
			}
		}
		if (!practice.done && practice.age >= step.min && achieved(step)) {
			practice.done = true;
			sound.ding();
			show.fx('nice');
			voice('good');
		}
		if (practice.done) practice.doneAge += dt;
		if ((practice.done && practice.doneAge >= CONTROLS.nice) || practice.age >= step.max) enterStep(practice.i + 1);
	}

	/* ---------- the beats ---------- */

	// Where her head is, in the world, with the view at the far end.
	function dollFace() {
		const p = at(DOLL_X, dollF);
		return { x: DOLL_X, y: p.y - 610 * 0.82 * p.s + 20 };
	}

	// The running order. Each beat has its length and its own update and
	// draw; the generic ones come from shared/showtime.js.
	show.sequence([
		// 1. how many players (the HUD's picker), over the dimmed field and the title
		{
			id: 'squad',
			length: Infinity,
			enter() { gloom = 0.55; cam = 0; },
			update(dt) { stepWorld(dt); },
		},

		// 1b. the title, crashing in letter by letter
		show.beats.titleDrop({
			lines: [{ text: 'RED LIGHT', fill: '#ff3640', glow: '#ff3640' }, { text: 'GREEN LIGHT', fill: '#27d96b', glow: '#27d96b' }],
			tagline: 'DON\'T GET CAUGHT MOVING',
			update(dt) {
				stepWorld(dt);
				if (show.cue(1.41)) voice('title');   // (RED LIGHT as its letters land, GREEN LIGHT, then the tagline)
			},
		}),

		// 2. the ten-minute clock, slamming in out of the dark; it starts
		// counting a moment after it lands, and runs through everything after
		show.beats.clockIntro({
			enter() { gloom = 0.2; setPhase('waiting'); },
			update(dt) {
				stepWorld(dt);
				if (show.cue(0.6)) voice('clock');   // (with YOU HAVE)
			},
		}),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors({
			enter() { saidAllSet = false; },
			update(dt) {
				stepWorld(dt);
				if (show.cue(0.6)) voice('visors');
				// ALL SET!, once
				const v = show.visorState && show.visorState();
				if (v && v.allSet && !saidAllSet) { saidAllSet = true; voice('allset'); }
			},
		}),

		// 3. the controls, one at a time, the whole field in view; no doll yet
		{
			id: 'controls',
			length: CONTROLS.steps.reduce((a, s) => a + s.max + CONTROLS.nice, 0),   // a safety net: each step has its own limit
			done: () => practice.i >= CONTROLS.steps.length,
			enter() {
				gloom = 0;
				cam = 0;
				show.camera.wide(0.6);
				enterStep(0);
			},
			update(dt) {
				stepControls(dt);
				stepWorld(dt);
			},
			draw(ctx) {
				drawCalls(ctx);
				const step = CONTROLS.steps[practice.i];
				if (!step) return;
				show.onWalls(ctx, function (c) {
					// the practice red light takes over the caption while it lasts
					if (phase === 'drill-red') {
						show.slam(c, 'RED LIGHT!', W / 2, 200, 130, phaseT, { fill: '#ff3640' });
						show.slam(c, 'FREEZE', W / 2, 330, 80, phaseT - 0.15, {});
					}
					else show.slam(c, step.caption, W / 2, 200, step.caption.length > 24 ? 80 : 96, practice.red === 2 ? phaseT : practice.age, { fill: 'white' });
					// which step this is, as pips
					CONTROLS.steps.forEach(function (s, i) {
						const x = W / 2 + (i - (CONTROLS.steps.length - 1) / 2) * 50;
						art.circle(c, x, 290, i === practice.i ? 13 : 9, { fill: i < practice.i || (i === practice.i && practice.done) ? '#ffd23f' : i === practice.i ? 'white' : 'rgba(255,255,255,0.45)' });
					});
					if (practice.done) show.slam(c, 'NICE!', W / 2, 430, 140, practice.doneAge, { fill: '#7dff9e', glow: TEAL, rotate: -0.06 });
				});
			},
		},

		// 4. the doll: tight on her face, YOUNG-HEE, her head turns away, and
		// the view pulls back down the field to the contestants: GREEN LIGHT!
		{
			id: 'doll',
			length: ENTRANCE.length,
			enter() {
				callout = null;
				// (the tutorial's leftovers gone, in case it was skipped)
				pads = pads.filter((p) => !p.practice);
				cash = cash.filter((m) => !m.practice);
				for (const c of contestants) resetContestant(c);
				setPhase('waiting');
				dollShown = true;
				cam = introCam();
				head.yaw = head.from = head.to = 0;
				head.t = head.dur = 0;
				glare = 0;
				show.camera.cut(Object.assign(dollFace(), { z: ENTRANCE.zoom }));
				show.fx('rumble');
				show.fx('riser', 0.7, 1, ENTRANCE.name);
			},
			update(dt, bt) {
				const E = ENTRANCE;
				stepWorld(dt);
				if (bt < E.name) show.shake = Math.max(show.shake, 0.08 + 0.3 * bt / E.name);
				glare = bt < E.eyes ? 0 : bt < E.turn ? 0.75 + 0.25 * Math.sin(bt * 10) : Math.max(0, 1 - (bt - E.turn) * 2);
				if (show.cue(E.eyes)) { show.fx('glint'); show.flash = 0.25; }
				if (show.cue(E.name)) { show.fx('villainReveal'); show.shake = 0.9; show.flash = 0.5; }
				if (show.cue(E.name + 0.1)) voice('doll');
				if (show.cue(E.round)) voice('round1');
				if (show.cue(E.turn)) turnHead(Math.PI, E.turnFor);
				if (show.cue(E.pull)) { show.camera.wide(E.pullFor); show.fx('whooshLong', 0.6); }
				// back down the field to the contestants at the start line
				if (bt > E.fly[0]) cam = introCam() * (1 - ease(between(bt, E.fly[0], E.fly[1])));
				if (show.cue(E.go)) { say('Green light', '#27d96b'); callout = null; show.fx('fight'); show.shake = 0.6; show.flash = 0.3; }
			},
			draw(ctx, bt) {
				const E = ENTRANCE;
				const out = 1 - between(bt, E.pull, E.pull + 0.5);
				show.onWalls(ctx, function (c) {
					// her name, in the middle of the wall, over her
					show.slam(c, 'YOUNG-HEE', W / 2, 470, 220, bt - E.name, { fill: PINK, glow: PINK, alpha: out });
					show.slam(c, 'SHE SEES EVERYTHING', W / 2, 610, 56, bt - E.name - 0.4, { fill: 'white', alpha: out });
					const go = 1 - between(bt, E.length - 0.4, E.length);
					show.slam(c, 'ROUND 1', W / 2, 330, 90, bt - E.round, { fill: PINK, alpha: go });
					show.slam(c, 'GREEN LIGHT!', W / 2, 500, 200, bt - E.go, { fill: '#27d96b', glow: '#27d96b', rotate: -0.05, alpha: go });
				});
			},
		},

		// 5. the rounds, until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (round < 0) begin();
				show.camera.wide(0.4);
				gloom = 0;
				show.label('ROUND ' + (round + 1));
			},
			update(dt) {
				// t is play time, for the round's own pacing; the ten-minute
				// clock is the show's, and it calls TIME! itself.
				t += dt;
				show.label('ROUND ' + (round + 1));
				show.record(t, contestants.map((c) => ({ px: c.px, pz: c.pz })));
				stepRound(dt);
				stepWorld(dt);
			},
			draw(ctx) {
				drawCalls(ctx);
				show.onWalls(ctx, function (c) {
					if (phase === 'ready') {
						show.slam(c, 'ROUND ' + (round + 1), W / 2, 470, 170, phaseT - 0.1, { fill: PINK, glow: PINK, alpha: 1 - between(phaseT, phaseDur - 0.4, phaseDur) });
					}
					// the dash: how long is left to reach the line
					if (phase === 'dash') {
						const left = Math.max(0, 1 - phaseT / phaseDur);
						const bw = 1000;
						art.roundRect(c, W / 2 - bw / 2, 175, bw, 34, 17, { fill: 'rgba(42,16,32,0.55)' });
						art.roundRect(c, W / 2 - bw / 2, 175, Math.max(34, bw * left), 34, 17, { fill: left < 0.35 ? '#ff3640' : '#ffd23f' });
					}
					if (phase === 'cleared' && cleared) {
						const fade = 1 - between(phaseT, phaseDur - 0.4, phaseDur);
						if (cleared.made) {
							show.slam(c, 'ROUND ' + (cleared.round + 1) + ' CLEAR!', W / 2, 430, 150, phaseT - 0.1, { fill: '#ffd23f', glow: '#ff7a3d', alpha: fade });
							show.slam(c, cleared.made + ' MADE IT', W / 2, 580, 80, phaseT - 0.5, { fill: 'white', alpha: fade });
						} else {
							show.slam(c, 'NOBODY MADE IT', W / 2, 430, 140, phaseT - 0.1, { fill: '#ff3640', glow: '#ff3640', alpha: fade });
							show.slam(c, 'ROUND ' + (cleared.round + 1) + ' AGAIN!', W / 2, 580, 80, phaseT - 0.5, { fill: 'white', alpha: fade });
						}
						// everyone's total so far, in won (ticking up as the bonuses land)
						const gap = Math.min(270, (W - 160) / Math.max(1, contestants.length));
						contestants.forEach(function (o, i) {
							const x = W / 2 + (i - (contestants.length - 1) / 2) * gap;
							const a = fade * between(phaseT, 0.5 + i * 0.08, 0.8 + i * 0.08);
							show.text(c, show.nameOf(o.n), x, 720, 40, { fill: show.lit(o.n), alpha: a, fit: gap - 20 });
							show.text(c, won(o.score), x, 790, 56, { alpha: a, fit: gap - 20 });
						});
					}
				});
			},
		},

		// 6. TIME!: the world slows and stops, and she turns to look
		show.beats.timeUp({
			enter() {
				show.stop('dollSong');
				setPhase('over');
				showInset = false;
				callout = null;
				turnHead(0, 1);
				glare = 1;
			},
			update(dt) {
				stepWorld(dt * show.timeScale);
				if (show.cue(0.2)) voice('timeup');   // (as TIME! slams in)
			},
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores({
			update() { if (show.cue(0.15)) voice('scores'); },
		}),
		show.beats.rank({
			update() {
				if (show.cue(0.2)) voice('rankings');
				// as the winner's place is revealed (Showtime's RANK: reveal 2.2, each 0.65): who won, or a tie
				const s = contestants.map((c) => c.score);
				const best = Math.max(...s);
				if (show.cue(2.2 + (s.length - 1) * 0.65 + 0.45)) voice(s.filter((v) => v === best).length > 1 ? 'tie' : 'win' + s.indexOf(best));
			},
		}),
		show.beats.team({
			update() {
				if (show.cue(0.95)) voice('team');
				// a ka-ching for each pour of notes into the piggy bank, quicker and higher as it fills
				for (let k = 0; k < PIGGY.kachings; k++) {
					const at = PIGGY.fillFrom + 0.04 + PIGGY.fillFor * Math.pow(k / PIGGY.kachings, 1.3);   // (just after the smoosh, whose cue is at fillFrom)
					if (show.cue(at)) show.fx('kaching', 0.75, 1 + k * 0.05);
				}
			},
		}),
		show.beats.board({
			update() {
				if (show.cue(0.1)) voice('board');
				// #N OF THE DAY!, as your row lands (Showtime's BOARD: enter 1.2, climb 0.2 a team, ten teams)
				const b = show.state().board;
				if (b && b.rank <= 4 && show.cue(1.2 + 0.6 + (10 - (b.rank - 1)) * 0.2 + 0.05)) voice('day' + b.rank);
			},
		}),
		show.beats.replay(),
		// how was it? five faces to tap, sad to happy
		show.beats.rate({
			enter() { voice('rate'); },   // HOW WAS IT?
		}),

		show.beats.end({
			enter() {
				voice('thanks');
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(contestants.map((c) => c.score)));
			},
		}),
	]);

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		wallT += dt;
		show.frame(ctx, dt, drawWorld);
		sound.tick();
		duckMusic(dt);
		debugStatus();
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		contestants.forEach(function (c, i) {
			if (!p[i]) return;
			c.px = Math.max(0, Math.min(1, p[i].px));
			c.pz = Math.max(0, Math.min(1, p[i].pz === undefined ? 0.5 : p[i].pz));   // 1 right up at the front wall: furthest up the field
			// a wall clicked on the desk simulator (once; 3, the floor, means nothing here)
			const to = p[i].wallChange;
			if (to !== undefined) {
				p[i].wallChange = undefined;
				if ((to === 0 || to === 1 || to === 2) && to !== c.wall) deskSwitch(c, to);
			}
		});
	};

	// Straight onto another wall, from the desk: a skip if they're in play,
	// just there if the round hasn't started moving yet.
	function deskSwitch(c, wall) {
		if (!c.alive || c.safe || c.fall) return;
		c.glue = null;
		c.over = 0;
		c.pass = true;
		const moving = phase !== 'waiting' && phase !== 'over';
		if (moving) c.hop = { t: 0, x0: c.x, f0: c.f };
		c.wall = wall;
	}

	// For tests and the console: where the show and the game are up to.
	self.state = function () {
		return Object.assign(show.state(), {
			phase, round, cam, camEnd, finishF, t, timeLeft: show.timeLeft(),
			step: CONTROLS.steps[practice.i] ? CONTROLS.steps[practice.i].id : null, stepAge: practice.age, stepDone: practice.done,
			headYaw: head.yaw, dollShown,
			contestants: contestants.map((c) => ({
				n: c.n, x: c.x, f: c.f, px: c.px, pz: c.pz, wall: c.wall, alive: c.alive, safe: c.safe, glued: !!c.glue,
				lean: Math.hypot(c.lean.x, c.lean.z), score: c.score, drill: c.drill,
				grabbed: c.grabbed, hopping: !!c.hop, why: c.alive ? null : c.why,
			})),
			// the jump pads in play, and the cash still lying about
			pads: pads.map((p) => ({ x: p.x, f: p.f, wall: p.wall, to: p.to, practice: !!p.practice })),
			cash: cash.filter((m) => !m.taken).map((m) => ({ x: m.x, f: m.f, wall: m.wall })),
		});
	};

	// Test hooks: jump to any beat (skipping the intros), wind the clock on.
	const INTROS = ['squad', 'title', 'clock', 'visors', 'controls', 'doll'];
	self.test = {
		// no block walls this round or after (tests that steer players straight somewhere)
		clearBlocks() { blocks = []; noBlocks = true; },
		skipTo(id) {
			if (!contestants.length) initGame(playersMeta ? playersMeta.length : 3);
			if (INTROS.indexOf(id) < 0) {
				show.camera.wide();
				gloom = 0;
				callout = null;
				if (round < 0) begin();
			}
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
	};

	/* ---------- the debug panel ---------- */

	// DEBUG, on the left wall, centred up and down (folded away until opened): jump to
	// any beat, and step through everything inside them: the tutorial's
	// steps, each phase of a round, whole rounds, the clock.
	const DEBUG = { x: 24, w: W - 48 };
	const BEATS = ['title', 'clock', 'visors', 'controls', 'doll', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
	const $debug = $('<debug-panel>').css({
		position: 'absolute', left: DEBUG.x + 'px', top: H / 2 + 'px', transform: 'translateY(-50%)', width: DEBUG.w + 'px',
		padding: '12px 16px', boxSizing: 'border-box', borderRadius: '20px',
		background: 'rgba(8,12,28,0.88)', border: '3px solid rgba(58,209,255,0.6)',
		fontFamily: `"${Showtime.TYPE.font}", sans-serif`, color: 'white', pointerEvents: 'auto', zIndex: 20,
	}).appendTo(stage.$ui);
	const $dhead = $('<div>').css({ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '26px' }).appendTo($debug);
	const $dbody = $('<div>').css({ marginTop: '8px' }).hide().appendTo($debug);
	const dbutton = (label, fn, colour = '#22305a') => $('<button>').text(label).css({
		margin: '4px', padding: '8px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
		background: colour, color: 'white', fontFamily: 'inherit', fontSize: '22px',
	}).on('click', function (e) { e.stopPropagation(); fn(); });
	const $dtoggle = dbutton('DEBUG ▸', () => debugOpen(!$dbody.is(':visible')), '#1a5a7a').appendTo($dhead);
	const $dnow = $('<span>').css({ flex: 1, color: '#9fb6d8', fontFamily: 'monospace', fontSize: '22px' }).appendTo($dhead);
	// closed, it's just the button; open, the whole panel
	function debugOpen(open) {
		$dbody.toggle(open);
		$dnow.toggle(open);
		$dtoggle.text(open ? 'DEBUG ▾' : 'DEBUG ▸');
		$debug.css(open
			? { width: DEBUG.w + 'px', padding: '12px 16px', background: 'rgba(8,12,28,0.88)', border: '3px solid rgba(58,209,255,0.6)' }
			: { width: 'auto', padding: 0, background: 'none', border: 'none' });
	}
	const drow = (label) => {
		const $row = $('<div>').css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }).appendTo($dbody);
		$('<span>').text(label).css({ width: '120px', color: '#9fb6d8', fontSize: '20px' }).appendTo($row);
		return $row;
	};

	debugOpen(false);

	const $beats = drow('BEATS');
	for (const id of BEATS) dbutton(id.toUpperCase(), () => debugJump(id)).appendTo($beats);
	dbutton('NEXT BEAT ▶', () => { show.stop('dollSong'); show.next(); }, '#3a2a5a').appendTo($beats);
	dbutton('RESTART', () => $('[btn=refresh]').trigger('click'), '#5a2232').appendTo($beats);

	const $tut = drow('TUTORIAL');
	dbutton('NEXT STEP ▶', () => { if (show.beat === 'controls') enterStep(practice.i + 1); }).appendTo($tut);
	dbutton('PASS STEP ✓', () => { if (show.beat === 'controls' && !practice.done) { practice.done = true; practice.doneAge = 0; show.fx('nice'); } }).appendTo($tut);

	const $round = drow('ROUND');
	dbutton('NEXT PHASE ▶', debugPhase).appendTo($round);
	dbutton('RED LIGHT NOW', () => { if (show.beat === 'play' && (phase === 'green' || phase === 'turning')) warn(); }, '#7a2230').appendTo($round);
	dbutton('LAST LEG', () => { if (show.beat === 'play' && phase === 'green') { scrollTo = camEnd; cam = Math.max(cam, camEnd - settings.speed * 1.5); } }).appendTo($round);
	dbutton('EVERYONE FINISHES', debugFinish, '#225a3a').appendTo($round);
	dbutton('EVERYONE SHOT', () => { if (show.beat === 'play') for (const c of contestants) if (c.alive && !c.safe) eliminate(c, 'debug'); }, '#7a2230').appendTo($round);
	dbutton('NEXT ROUND', () => debugRound(round + 1)).appendTo($round);
	dbutton('ROUND 5', () => debugRound(4)).appendTo($round);

	const $misc = drow('CLOCK');
	dbutton('1:00 LEFT', () => show.setTimeLeft(60), '#5a3a22').appendTo($misc);
	dbutton('0:15 LEFT', () => show.setTimeLeft(15), '#5a3a22').appendTo($misc);
	dbutton('+ CASH', () => { for (const c of contestants) c.score += 100 * (1 + Math.floor(Math.random() * 20)); }, '#225a3a').appendTo($misc);
	dbutton('MAGNET ALL', () => { for (const c of contestants) c.magnet = MAGNET.time; }, '#225a3a').appendTo($misc);
	dbutton('BOULDER', () => { for (let w = 0; w < 3; w++) rollBoulder(true); }, '#225a3a').appendTo($misc);
	dbutton('MONEY BAG ALL', () => { for (const c of contestants) if (c.alive) popBag(c.x, c.f + 60, c.wall); }, '#225a3a').appendTo($misc);

	// any beat, straight away (a squad of three if none was picked; the
	// results with some scores to show)
	function debugJump(id) {
		$('showtime-picker').remove();
		show.stop('dollSong');
		callout = null;
		self.test.skipTo(id);
		if (['scores', 'rank', 'team', 'board', 'replay'].includes(id) && contestants.every((c) => !c.score)) {
			for (const c of contestants) c.score = 1000 * (1 + Math.floor(Math.random() * 4)) + 100 * Math.floor(Math.random() * 30);
		}
	}

	// on to the next phase of the round (or the next step, or the next beat)
	function debugPhase() {
		if (show.beat === 'controls') return enterStep(practice.i + 1);
		if (show.beat !== 'play') return show.next();
		if (phase === 'green') cam = scrollTo;                   // (the leg's end: she turns next frame)
		else if (phase === 'closed') endRound();
		else phaseT = Math.max(phaseT, phaseDur);
	}

	function debugFinish() {
		if (show.beat !== 'play' || phase === 'cleared' || phase === 'ready') return;
		for (const c of contestants) if (c.alive) { c.safe = true; c.glue = null; c.f = Math.max(c.f, finishF + 13); }
		endRound();
	}

	function debugRound(r) {
		if (show.beat !== 'play') debugJump('play');
		show.stop('dollSong');
		callout = null;
		startRound(Math.max(0, r));
	}

	function debugStatus() {
		const step = show.beat === 'controls' && CONTROLS.steps[practice.i] ? ' ' + CONTROLS.steps[practice.i].id : '';
		const ph = show.beat === 'play' ? ` R${round + 1} ${phase}` : '';
		$dnow.text(`${show.beat}${step}${ph}  ${show.mmss ? show.mmss(show.timeLeft()) : ''}`);
	}

	self.fini = function () {
		if (hallAudio) hallAudio.ctx.close().catch(() => {});
		sound.close();
		show.fini();
	};

	/* ---------- go ---------- */

	buildField(0);
	show.go('squad');

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
