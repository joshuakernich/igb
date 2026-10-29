/*
 * Fission Chips (id grub-o-tron, its first name)
 *
 * The last fast-food joint after the end of the world. The players are its
 * cyborg cooks (part survivor, part kitchen robot: a whisk for an arm, a
 * fryer for a belly), and the customers are the mutants who crawl in from
 * the wasteland demanding food nobody should eat.
 *
 * Every wall is a side-on view of its stretch of the kitchen: a counter
 * right across it, its devices standing on it.
 *   LEFT WALL    THE OLD WAYS: the CHOPPER, FRYER, GRILLER and SOAKER
 *   FRONT WALL   the GRABBER (a teleport hatch: ingredients beam in, left),
 *                the mutants behind the counter, each with a SERVER in
 *                front (middle), and the BINNER (a void chute, right)
 *   RIGHT WALL   THE NEW WAYS: the CRUSHER, MUTATOR, WARPER and FREEZER
 * Each player's cook stands along the bottom of every wall, rising into
 * view as they walk over to it (so near a corner, they're on two walls).
 *
 * To use a device, walk to it and tap it: a tap only counts for a player
 * close enough to reach that spot, and their cook acts it out.
 *   the GRABBER   tap with empty hands: grab what's beamed in
 *   a device      tap holding food: it goes in; tap when it's done to take it
 *   the SERVER    tap a mutant holding what it ordered: you hand it over
 *   the BINNER    tap holding anything: gone
 * Working the devices:
 *   CHOPPER   tap, again and again
 *   FRYER     cooks by itself; take it out while it's golden, or it burns
 *   GRILLER   cooks by itself, but tap it to flip when it says FLIP!
 *   SOAKER    stay in front of it and sway from side to side
 *   CRUSHER   squat in front of it (or tap)
 *   MUTATOR   tap when the needle's in the green
 *   WARPER    cooks by itself into another dimension, and comes back in a
 *             portal on some other wall: go and tap it
 *   FREEZER   stay in front of it and hold still
 * Burnt food left sitting starts a fire (tap it out, or it spreads). Every
 * device is named for what it does, and the hint over each cook is the same
 * thing in two words: GRAB IT, FRY IT, SOAK IT, SERVE IT, BIN IT.
 *
 * Score: a finished dish pays everyone who had a hand in it (grabbed it,
 * worked it, carried it, served it) its price plus a tip for speed. The
 * shifts ramp over the ten minutes: more windows, longer recipes, less
 * patience, and from the second shift, trouble (grease fires, a jammed
 * grabber, dimensional leaks, the Overlord's feast).
 *
 * Drawn in 3D (three.js), each wall through its own orthographic camera,
 * a little above the counter; the words, tickets and prompts are 2D over it.
 *
 * Input: px / pz (where you are along each wall and how near it; pz is 1 at
 * the front wall), py (squats), movement (sway, hold still) and touches on
 * the walls, from players near enough to reach that spot.
 */
import * as THREE from '../lib/three/three.module.min.js';
import { createWallComposer, canvasTexture, environmentFromShader, toScreen } from '../lib/three/walls.js';

IGB.register('grub-o-tron', function GrubOTron(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;
	const FONT = 'Rubik';
	const INK = '#0b0d0c';

	/* ---------- tuning ---------- */

	// Where on each wall things happen (along it, 0..1): the outer eighth at
	// each end of every wall is left empty, and on the side walls so is the
	// back quarter of the room (the left wall's along runs back to front, the
	// right wall's front to back). The side walls' four devices share what's left.
	const ACTIVE = [[0.25, 0.875], [0.125, 0.875], [0.125, 0.75]];
	const SLOT_W = (ACTIVE[0][1] - ACTIVE[0][0]) / 4;          // a side-wall device's share of its wall
	const slotAlong = (w, k) => ACTIVE[w][0] + (k + 0.5) * SLOT_W;
	const REACH = { out: 0.25, along: 0.2 };   // a touch counts for a player this near the wall (room widths) and this near the spot along it
	const SHOW = { full: 0.12, gone: 0.45 };   // a cook rises into view at the foot of a wall as their player comes within this of it
	const FRONT_L = ACTIVE[1][0] * W, FRONT_R = ACTIVE[1][1] * W;   // the front wall's active stretch (world px across it):
	const HATCH = FRONT_L + 200;  // the GRABBER up to here...
	const CHUTE = FRONT_R - 200;  // ...the BINNER from here, and the mutants' windows between
	const CHOP_TAPS = 6;
	const JAM_TAPS = 6;
	const ACT_TIME = 0.6;         // how long a cook takes to act out a tap
	const FRY = { cook: 5, burn: 6 };              // seconds to golden, then golden this long
	const GRILL = { flipAt: 2.2, flipBy: 5.2, cook: 7.5, burn: 6.5 };
	const STIR_NEED = 1.0;        // room widths of swaying, in all
	const PRESS = { squats: 3, tap: 0.15, down: 0.62, up: 0.5 };
	const INJECT = { period: 1.6, zone: 0.11, lockout: 0.7 };
	const WARP_TIME = 4;
	const CRYO = { need: 3, still: 0.12, thaw: 0.15 };   // seconds held still; slower than this (room widths a second) is still
	const FIRE = { hp: 5, after: 6, spread: 12 };       // taps to put out; seconds burnt food sits before it lights; and before a fire spreads
	const PATIENCE = { 0: 999, 1: 58, 2: 78, 3: 105, 4: 140 };
	const PRICE = { 0: 20, 1: 20, 2: 40, 3: 75, 4: 150 };
	const STREAK = { every: 5, bonus: 50 };
	const MAX_PORTALS = 6;

	// the shifts, by the clock (seconds left when each starts)
	const SHIFTS = [
		{ from: 600, name: 'BREAKFAST OF SURVIVORS', windows: 2, tiers: [1], gap: 6, patience: 1.0 },
		{ from: 450, name: 'LUNCH OF THE LIVING', windows: 3, tiers: [1, 1, 2], gap: 4.5, patience: 0.95, every: 75 },
		{ from: 300, name: 'HAPPY HOUR OF THE DAMNED', windows: 3, tiers: [1, 2, 2, 3], gap: 3.5, patience: 0.9, every: 55 },
		{ from: 150, name: 'MIDNIGHT MUTANT RUSH', windows: 4, tiers: [2, 2, 3, 3], gap: 2.5, patience: 0.85, every: 40, vip: true },
	];

	/* ---------- the menu ---------- */

	const INGS = {
		roach: { name: 'RAD-ROACH', short: 'ROACH', colour: '#7a4a22', glow: '#9dff3a' },
		eel: { name: 'SEWER EEL', short: 'EEL', colour: '#6a46a0', glow: '#c48aff' },
		shroom: { name: 'GLOWSHROOM', short: 'SHROOM', colour: '#2ad8c9', glow: '#3af2ff' },
		ooze: { name: 'OOZE CUBE', short: 'OOZE', colour: '#8fd13a', glow: '#e9ff4a' },
		eye: { name: 'LAB EYEBALL', short: 'EYEBALL', colour: '#f0eee0', glow: '#ff2d8f' },
		tentacle: { name: 'TENTACLE', short: 'TENTACLE', colour: '#e8708f', glow: '#ff9ac0' },
	};

	const STATIONS = [
		// (each device is named for what it does, and the hint over a cook says that in two words: FRY IT, the FRYER)
		{ kind: 'chop', wall: 0, slot: 0, name: 'CHOPPER', verb: 'CHOP IT', adj: 'CHOPPED', colour: '#ff8a2a' },
		{ kind: 'fry', wall: 0, slot: 1, name: 'FRYER', verb: 'FRY IT', adj: 'FRIED', colour: '#ffc21a' },
		{ kind: 'grill', wall: 0, slot: 2, name: 'GRILLER', verb: 'GRILL IT', adj: 'GRILLED', colour: '#ff4a32' },
		{ kind: 'stir', wall: 0, slot: 3, name: 'SOAKER', verb: 'SOAK IT', adj: 'SOAKED', colour: '#9dff3a' },
		{ kind: 'press', wall: 2, slot: 0, name: 'CRUSHER', verb: 'CRUSH IT', adj: 'CRUSHED', colour: '#e9ff4a' },
		{ kind: 'inject', wall: 2, slot: 1, name: 'MUTATOR', verb: 'MUTATE IT', adj: 'MUTATED', colour: '#d04dff' },
		{ kind: 'warp', wall: 2, slot: 2, name: 'WARPER', verb: 'WARP IT', adj: 'WARPED', colour: '#3af2ff' },
		{ kind: 'cryo', wall: 2, slot: 3, name: 'FREEZER', verb: 'FREEZE IT', adj: 'FROZEN', colour: '#8fdcff' },
	];
	const KIND = {};
	for (const d of STATIONS) KIND[d.kind] = d;

	// tier, name, parts: [ingredient, ...stations in order]
	const RECIPES = [
		{ tier: 1, name: 'CRUNCHY ROACH CLUSTERS', parts: [['roach', 'fry']] },
		{ tier: 1, name: 'EYEBALL ON A STICK', parts: [['eye', 'grill']] },
		{ tier: 1, name: 'GLOWSHROOM CONFETTI', parts: [['shroom', 'chop']] },
		{ tier: 1, name: 'OOZE-SICLE', parts: [['ooze', 'cryo']] },
		{ tier: 1, name: 'TENTACLE FROM ELSEWHERE', parts: [['tentacle', 'warp']] },
		{ tier: 1, name: 'ONE DENSE EEL', parts: [['eel', 'press']] },
		{ tier: 2, name: 'EEL NOODLES OF ANOTHER DIMENSION', parts: [['eel', 'chop', 'warp']] },
		{ tier: 2, name: 'BLACK HOLE NUGGET', parts: [['roach', 'press', 'fry']] },
		{ tier: 2, name: 'THREE-EYED TACO', parts: [['tentacle', 'inject', 'grill']] },
		{ tier: 2, name: 'SLUDGE CHOWDER', parts: [['shroom', 'chop', 'stir']] },
		{ tier: 2, name: 'BRAIN FREEZE', parts: [['eye', 'inject', 'cryo']] },
		{ tier: 2, name: 'OOZE FONDUE', parts: [['ooze', 'grill', 'stir']] },
		{ tier: 2, name: 'TENTACLE FRIES', parts: [['tentacle', 'chop', 'fry']] },
		{ tier: 3, name: 'THE APOCALYPSE PLATTER', parts: [['roach', 'fry'], ['ooze', 'stir']] },
		{ tier: 3, name: 'QUANTUM SURF & TURF', parts: [['eel', 'warp'], ['roach', 'grill']] },
		{ tier: 3, name: 'SINGULARITY SLIDER', parts: [['ooze', 'press', 'fry'], ['shroom', 'chop']] },
		{ tier: 3, name: 'MUTANT HAPPY MEAL', parts: [['eye', 'inject'], ['tentacle', 'chop', 'fry']] },
		{ tier: 3, name: 'COLD FUSION CURRY', parts: [['shroom', 'stir', 'cryo'], ['eel', 'chop']] },
	];
	const FEAST = { tier: 4, name: 'THE OVERLORD\'S FEAST', parts: [['eye', 'inject', 'grill'], ['eel', 'chop', 'warp'], ['ooze', 'cryo']] };
	const PRACTICE = { tier: 0, name: 'ROACH, ANY WAY YOU LIKE', parts: [['roach', '*']] };

	const TYPES = [
		{ id: 'blob', name: 'BLOBBO & BLOBBA', skin: '#7cd957' },
		{ id: 'cyclops', name: 'SIR OCULUS', skin: '#9a6fd1' },
		{ id: 'mold', name: 'GARY (A MOULD)', skin: '#c8e85a' },
		{ id: 'pigeon', name: 'EXECUTIVE PIGEON', skin: '#9fb0ff' },
		{ id: 'skull', name: 'LIL\' DOOMSKULL', skin: '#e9e2c8' },
		{ id: 'squid', name: 'MRS. TENTACLES', skin: '#e86fa8' },
		{ id: 'fungus', name: 'DUDE SHROOM', skin: '#e0573a' },
	];
	const HELLO = [
		'I HAVE FOUR STOMACHS AND THEY\'RE ALL ANGRY', 'MAKE IT GLOW', 'EXTRA RADIATION, PLEASE', 'IS THIS PLACE HAUNTED? GOOD',
		'MY OTHER HEAD WANTS FRIES', 'I WALKED HERE FROM THE CRATER', 'NO SOUL, NO SERVICE?', 'DO YOU TAKE BOTTLE TEETH?',
		'I\'LL KNOW IF IT\'S FRESH', 'HURRY, I\'M STILL MUTATING', 'I SMELL FEAR. AND GREASE.', 'FEED ME, CHROME-PEOPLE',
	];
	const YUM = [
		'MY THIRD STOMACH SINGS', 'TASTES LIKE THE OLD WORLD', 'I CAN SEE SOUNDS NOW', 'FIVE STARS. FIVE EYES.',
		'I GREW A NEW TONGUE FOR THIS', 'DELICIOUSLY ILLEGAL', 'IT BIT ME BACK. PERFECT.', 'WORTH THE RADIATION',
	];
	const GRR = [
		'ZERO STARS. NEGATIVE STARS.', 'I\'LL EAT THE CHAIR INSTEAD', 'I\'M TELLING THE WARLORD', 'MY HEADS ARE LEAVING',
		'THE WASTELAND HAS BETTER SERVICE', 'I\'LL HAUNT YOUR FRYER',
	];
	const NOPE = ['THAT\'S NOT WHAT I ORDERED!', 'DO I LOOK LIKE I EAT THAT?', 'WRONG! READ THE TICKET!', 'NOPE. NOT TODAY.'];

	// the cyborg cooks, one look a player: [head, left arm, right arm, belly, legs]
	const COOKS = [
		{ head: 'bolts', arms: ['whisk', 'cleaver'], belly: 'fryer', legs: 'treads', skin: '#e0b48f' },
		{ head: 'mohawk', arms: ['spatula', 'ladle'], belly: 'micro', legs: 'pogo', skin: '#b07a52' },
		{ head: 'dome', arms: ['tongs', 'drill'], belly: 'blender', legs: 'wheel', skin: '#f0c9a8' },
		{ head: 'brain', arms: ['cutter', 'whisk'], belly: 'toaster', legs: 'spider', skin: '#8a5a3c' },
		{ head: 'beard', arms: ['grater', 'spatula'], belly: 'grill', legs: 'chicken', skin: '#d9a07a' },
		{ head: 'antenna', arms: ['ladle', 'fork'], belly: 'fryer', legs: 'jet', skin: '#f2d2b6' },
	];

	/* ---------- helpers ---------- */

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, k) => a + (b - a) * k;
	const pick = (list) => list[Math.floor(Math.random() * list.length)];
	const colourOf = (i) => (window.PLAYER_COLORS || [])[i] || '#fff';
	function hex(c) {
		const m = /^#?([0-9a-f]{6})$/i.exec(c);
		if (!m) return [255, 255, 255];
		const n = parseInt(m[1], 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}
	function mix(a, b, k) {
		const x = hex(a), y = hex(b);
		return 'rgb(' + x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',') + ')';
	}
	// a little seeded random, so the grime is the same every time
	function seeded(seed) {
		let s = seed >>> 0;
		return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	}

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let latest = [];
	const chefs = [];
	let stations = [];
	const customers = [null, null, null, null];
	const slotWait = [0, 0, 0, 0];
	let pods = [];
	const hatch = { jam: 0, shake: 0 };
	let portals = [];
	let floaters = [];
	let ripples = [];
	let banner = null;
	let phase = 'off';            // 'tutorial', 'intro', 'play' or 'off'
	let shiftNo = 0;
	let eventIn = 0;
	let vipPending = false;
	let served = 0, walkouts = 0, streak = 0, bonus = 0, burns = 0;
	let t = 0;
	let nextId = 1;
	const tut = { held: [], put: [], served: 0, moved: [] };

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'grub-o-tron',
		seconds: SECONDS,
		players: () => count,
		scores: () => scores,
		bonus: () => bonus,
		bonusLabel: 'STREAK BONUS',
		music: false,
		theme: { accent: '#FC1992', accent2: '#9E00FF', gold: '#e9ff4a', sky: ['#0d0016', '#200033'], glow: 'rgba(252,25,146,0.35)' },
		rivals: ['THE SCRAP SQUAD', 'BUNKER 9 BUTCHERS', 'TOXIC TASTERS', 'CHROME CHEFS', 'THE GREASE GHOULS', 'MEAT MACHINES', 'RUST BUCKETS', 'WASTELAND WAITERS'],
		drawAvatar(ctx, n, x, y, scale, pose) { drawChef(ctx, n, x, y, 120 * scale, { pose }); },
		menu: { restart: () => { clearKitchen(); show.go('play'); } },
	});

	const TUTORIAL = [
		{ caption: 'WALK TO THE GRABBER AND TAP IT', min: 2, max: 30, did: () => chefs.filter((c, i) => tut.held[i]).length >= Math.min(count, 3) },
		{ caption: 'TAKE IT TO A STATION AND TAP IT', min: 2, max: 30, did: () => chefs.filter((c, i) => tut.put[i]).length >= Math.min(count, 3) },
		{ caption: 'COOK IT, THEN TAP A MUTANT', min: 3, max: 45, did: () => tut.served >= Math.min(count, 3) },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enter() {
				clearKitchen();
				phase = 'tutorial';
				slotWait.splice(0, 4, 0.5, 1, 1.5, 99);
				tut.held = []; tut.put = []; tut.served = 0; tut.moved = [];
			},
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 5,
			enter() { clearKitchen(); phase = 'intro'; scores = scores.map(() => 0); },
			update(dt, bt) { tick(dt); introT = bt; },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c, wall) {
					// (the name in the title's own lettering: neon tubes, then a drip)
					show.slam(c, 'FISSION CHIPS', W / 2, 250, 84, bt - 0.3, { font: 'Monoton', exact: true, fill: '#c8ff5a' });
					show.slam(c, 'IS OPEN!', W / 2, 360, 96, bt - 0.8, { font: 'Rubik Wet Paint', exact: true, fill: '#FC1992' });
					show.slam(c, 'FEED THE MUTANTS. DON\'T GET EATEN.', W / 2, 470, 58, bt - 1.5, { fill: 'white' });
					if (wall !== 1) show.slam(c, wall === 0 ? '◀ THE OLD WAYS' : 'THE NEW WAYS ▶', W / 2, 570, 54, bt - 2.3, { fill: wall === 0 ? '#ff8a2a' : '#3af2ff' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (!stations.length || !pods.length) clearKitchen();   // (jumped straight here, past the tutorial and intro: set the kitchen up)
				phase = 'play';
				shiftNo = -1;
				slotWait.splice(0, 4, 0.8, 2.5, 4, 5);
			},
			update(dt) {
				tick(dt);
				show.record(t, latest.slice(0, count));
			},
			draw(ctx) { drawBanner(ctx); },
		},
		show.beats.timeUp({ enter() { phase = 'off'; banner = null; } }),
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
			chefs.push({ wall: 1, along: (i + 1) / (n + 1), dist: 0.5, x: W + (i + 1) / (n + 1) * W, drawWall: 1, held: null, speed: 0, moved: 0, prev: null, down: false, station: null, work: 0, bob: Math.random() * 6 });
		}
		clearKitchen();   // (the kitchen's there from the start, whichever beat the show goes to)
		show.go('title');
	}

	function clearKitchen() {
		stations = STATIONS.map((d) => Object.assign({}, d, {
			x0: d.wall * W + (slotAlong(d.wall, d.slot) - SLOT_W / 2) * W, item: null, state: 'idle', t: 0, prog: 0, doneT: 0, burntT: 0,
			fire: 0, fireT: 0, douse: 0, chopT: 0, flipped: false, lock: 0, hit: 0, glow: 0, shake: 0, paddle: 0,
		}));
		for (let k = 0; k < 4; k++) { customers[k] = null; slotWait[k] = 1 + k; }
		pods = [0, 1, 2].map((k) => ({ ing: null, wait: 0.3 + k * 0.3, beam: 0 }));
		hatch.jam = 0;
		portals = [];
		floaters = [];
		banner = null;
		vipPending = false;
		served = walkouts = streak = bonus = burns = 0;
		for (const c of chefs) c.held = null;
	}

	/* ---------- every frame (in the tutorial, the intro and play) ---------- */

	function tick(dt) {
		t += dt;
		for (let i = 0; i < count; i++) readChef(i, dt);
		stepStations(dt);
		stepCustomers(dt);
		stepHatch(dt);
		stepPortals(dt);
		stepFx(dt);
		if (phase === 'play') stepShift(dt);
	}

	// where a player is, seen from each wall: how far along it, how near
	function wallsOf(p) {
		return { along: [p.pz, p.px, 1 - p.pz], dist: [p.px, 1 - p.pz, 1 - p.px] };
	}

	function readChef(i, dt) {
		const p = latest[i];
		const c = chefs[i];
		if (!p) return;
		const { along, dist } = wallsOf(p);
		c.alongs = along.map((a) => clamp(a, 0, 1));
		c.dists = dist.map((d) => clamp(d, 0, 1));
		let best = 0;
		for (let w = 1; w < 3; w++) if (c.dists[w] < c.dists[best]) best = w;
		c.wall = best;   // (the wall they're nearest: where their floating words go)
		c.along = c.alongs[best];
		c.dist = c.dists[best];
		const moved = c.prev ? Math.hypot(p.px - c.prev.px, p.pz - c.prev.pz) : 0;
		c.prev = { px: p.px, pz: p.pz };
		c.moved = moved;
		if (dt > 0) c.speed = lerp(c.speed, moved / dt, Math.min(1, dt * 5));
		c.x = best * W + c.along * W;
		// the side-wall device they're standing at, if any (the soaker and the freezer work by being there)
		c.station = null;
		for (const s of stations) {
			const d = c.dists[s.wall];
			if (d < REACH.out && Math.abs(c.alongs[s.wall] - slotAlong(s.wall, s.slot)) < SLOT_W / 2 + 0.02 && (!c.station || d < c.dists[c.station.wall])) c.station = s;
		}
		c.work = Math.max(0, c.work - dt * 2);
		if (c.act) { c.act.t += dt; if (c.act.t > ACT_TIME) c.act = null; }
		// a squat: down past PRESS.down, back up past PRESS.up
		if (typeof p.py === 'number') {
			if (!c.down && p.py > PRESS.down) c.down = true;
			else if (c.down && p.py < PRESS.up) { c.down = false; pump(i); }
		}
	}

	// a cook acts out what their tap did (the avatar matches the action)
	function doing(i, kind) {
		if (i !== undefined && chefs[i]) chefs[i].act = { kind, t: 0 };
	}

	const chefsAt = (s) => chefs.map((c, i) => i).filter((i) => chefs[i].station === s);

	/* ---------- the stations ---------- */

	function stepStations(dt) {
		for (const s of stations) {
			s.glow = Math.max(0, s.glow - dt * 2);
			s.shake = Math.max(0, s.shake - dt * 3);
			s.hit = Math.max(0, s.hit - dt * 5);
			s.lock = Math.max(0, s.lock - dt);
			if (s.fire > 0) {
				s.fireT += dt;
				if (s.fireT > FIRE.spread) { s.fireT = 0; spread(s); }
				continue;
			}
			if (!s.item) continue;
			s.t += dt;
			const here = chefsAt(s);
			if (s.state === 'work') {
				if (s.kind === 'fry' && s.t >= FRY.cook) finish(s);
				else if (s.kind === 'grill') {
					if (!s.flipped && s.t > GRILL.flipBy) burn(s);
					else if (s.flipped && s.t >= GRILL.cook) finish(s);
				} else if (s.kind === 'stir') {
					for (const i of here) {
						if (chefs[i].moved > 0.002) { s.prog += chefs[i].moved / STIR_NEED; s.paddle += chefs[i].moved * 20; credit(s, i); chefs[i].work = 1; }
					}
					if (s.prog >= 1) finish(s);
				} else if (s.kind === 'cryo') {
					const still = here.filter((i) => chefs[i].speed < CRYO.still);
					if (still.length) { s.prog += dt / CRYO.need; for (const i of still) credit(s, i); }
					else s.prog = Math.max(0, s.prog - dt * CRYO.thaw);
					if (s.prog >= 1) finish(s);
				} else if (s.kind === 'warp' && s.t >= WARP_TIME) {
					s.item.steps.push('warp');
					spawnPortal(s.item, s);
					s.item = null;
					s.state = 'idle';
				}
			} else if (s.state === 'done') {
				s.doneT += dt;
				if (s.kind === 'fry' && s.doneT > FRY.burn) burn(s);
				if (s.kind === 'grill' && s.doneT > GRILL.burn) burn(s);
			} else if (s.state === 'burnt') {
				s.burntT += dt;
				if (s.burntT > FIRE.after) ignite(s);
			}
		}
	}

	function credit(s, i) { if (s.item && !s.item.by.includes(i)) s.item.by.push(i); }

	function finish(s) {
		s.item.steps.push(s.kind);
		s.state = 'done';
		s.doneT = 0;
		s.glow = 1;
		show.fx('glint', 0.6);
		float(s.ui.x, s.ui.prompt - 36, s.kind === 'fry' ? 'GOLDEN!' : 'DONE!', '#9dff3a', 44);
	}

	function burn(s) {
		s.item.burnt = true;
		s.state = 'burnt';
		s.burntT = 0;
		burns++;
		show.fx('fizzle', 0.7);
		float(s.ui.x, s.ui.prompt - 36, 'BURNT!', '#ff4a32', 50);
	}

	function ignite(s) {
		s.fire = 1;
		s.fireT = 0;
		s.douse = 0;
		s.item = null;
		s.state = 'idle';
		show.fx('fireball', 0.8);
		show.shake = Math.max(show.shake, 0.25);
		float(s.ui.x, s.ui.prompt - 36, 'FIRE!', '#ff4a32', 64);
	}

	function spread(s) {
		const next = stations.filter((o) => o.wall === s.wall && Math.abs(o.slot - s.slot) === 1 && o.fire <= 0);
		if (next.length) ignite(pick(next));
	}

	function pump(i) {
		const s = chefs[i].station;
		if (!s || s.kind !== 'press' || s.fire > 0 || s.state !== 'work') return;
		s.prog += 1 / PRESS.squats;
		s.hit = 1;
		credit(s, i);
		chefs[i].work = 1;
		show.fx('stomp', 0.6);
		if (s.prog >= 0.999) finish(s);
	}

	// A tap on a device, from the players in reach of it (nearest first)
	function tapStation(s, hit) {
		const say = (text, fill, size) => float(s.ui.x, s.ui.prompt - 40, text, fill || '#ffffff', size || 34);
		if (s.fire > 0) {
			s.fire--;
			s.shake = 1;
			doing(hit[0], 'douse');
			show.fx('whoosh', 0.6, 1.4);
			if (s.fire <= 0) { say('PUT OUT!', '#8fdcff', 50); show.fx('skip', 0.5); }
			return;
		}
		if (!s.item) {
			const i = hit.find((k) => chefs[k].held && !chefs[k].held.burnt && !chefs[k].held.steps.includes(s.kind) && chefs[k].held.steps.length < 3);
			if (i === undefined) {
				const j = hit.find((k) => chefs[k].held);
				if (j === undefined) say('GRAB IT FIRST');
				else if (chefs[j].held.burnt) say('BIN IT', '#ff4a32');
				else if (chefs[j].held.steps.includes(s.kind)) say('ALREADY ' + s.adj);
				else say('SERVE IT');
				return;
			}
			const item = chefs[i].held;
			chefs[i].held = null;
			Object.assign(s, { item, state: 'work', t: 0, prog: 0, doneT: 0, burntT: 0, flipped: false, lock: 0 });
			credit(s, i);
			tut.put[i] = true;
			doing(i, 'put');
			show.fx('tap', 0.8);
			if (s.kind === 'warp') show.fx('charge', 0.5);
			return;
		}
		if (s.state === 'done' || s.state === 'burnt') {
			const i = hit.find((k) => !chefs[k].held);
			if (i === undefined) { say('HANDS FULL!'); return; }
			chefs[i].held = s.item;
			if (!s.item.burnt && !s.item.by.includes(i)) s.item.by.push(i);
			s.item = null;
			s.state = 'idle';
			doing(i, 'take');
			show.fx('lockIn', 0.6);
			return;
		}
		// working it
		const i = hit[0];
		chefs[i].work = 1;
		if (s.kind === 'chop') {
			s.prog += 1 / CHOP_TAPS;
			s.hit = 1;
			credit(s, i);
			doing(i, 'chop');
			show.fx('swordSwish', 0.5, 0.9 + Math.random() * 0.3);
			show.fx('thud', 0.35, 1.5);
			if (s.prog >= 0.999) finish(s);
		} else if (s.kind === 'inject') {
			if (s.lock > 0) return;
			doing(i, 'jab');
			if (Math.abs(needle(s) - 0.5) < INJECT.zone) {
				credit(s, i);
				say('PERFECT DOSE!', '#d04dff', 44);
				show.fx('correct', 0.6);
				finish(s);
			} else {
				s.lock = INJECT.lockout;
				s.shake = 1;
				say('SPLORT!', '#ff2d8f', 50);
				show.fx('wrong', 0.6);
			}
		} else if (s.kind === 'grill') {
			if (!s.flipped && s.t >= GRILL.flipAt) {
				s.flipped = true;
				s.hit = 1;
				credit(s, i);
				doing(i, 'flip');
				say('FLIPPED!', '#ffc21a', 46);
				show.fx('whoosh', 0.5);
			} else say(s.flipped ? 'SIZZLING...' : 'NOT YET!');
		} else if (s.kind === 'press') {
			s.prog += PRESS.tap;
			s.hit = 0.6;
			credit(s, i);
			doing(i, 'pump');
			show.fx('thud', 0.4);
			if (s.prog >= 0.999) finish(s);
		} else if (s.kind === 'stir') say('STAY AND SWAY!', '#9dff3a');
		else if (s.kind === 'cryo') say('STAY STILL!', '#8fdcff');
		else if (s.kind === 'warp') say('IT\'S ELSEWHERE...', '#3af2ff');
		else say('WAIT FOR GOLDEN...', '#ffc21a');
	}

	// the injector's needle, 0..1 and back
	function needle(s) {
		const k = (s.t / INJECT.period) % 1;
		return 1 - Math.abs(k * 2 - 1);
	}

	/* ---------- the hatch, the chute and the portals ---------- */

	function stepHatch(dt) {
		hatch.shake = Math.max(0, hatch.shake - dt * 3);
		if (phase === 'off') return;
		for (const pod of pods) {
			pod.beam = Math.max(0, pod.beam - dt * 1.5);
			if (pod.ing || hatch.jam > 0) continue;
			pod.wait -= dt * (phase === 'tutorial' ? 2 : 1);
			if (pod.wait <= 0) {
				pod.ing = chooseIng();
				pod.beam = 1;
				show.fx('reveal', 0.18, 1.3);
			}
		}
	}

	// what the hatch beams in next: mostly what the tickets need and nobody has yet
	function chooseIng() {
		if (phase === 'tutorial') return 'roach';
		const need = {};
		for (const c of customers) if (c && c.state === 'wait') for (const part of c.parts) if (!part.filled) need[part.ing] = (need[part.ing] || 0) + 1;
		const have = (ing) => {
			let n = 0;
			for (const c of chefs) if (c.held && c.held.ing === ing) n++;
			for (const s of stations) if (s.item && s.item.ing === ing) n++;
			for (const p of portals) if (p.item.ing === ing) n++;
			for (const p of pods) if (p.ing === ing) n++;
			return n;
		};
		const short = Object.keys(need).filter((ing) => need[ing] > have(ing));
		if (short.length && Math.random() < 0.85) return pick(short);
		const pool = Object.keys(need).length ? Object.keys(need) : Object.keys(INGS);
		return Math.random() < 0.6 ? pick(pool) : pick(Object.keys(INGS));
	}

	function tapGrabber(hit) {
		const say = (text, fill, size) => float(HATCH_UI.x, HATCH_UI.prompt - 40, text, fill || '#ffffff', size || 34);
		if (hatch.jam > 0) {
			hatch.jam--;
			hatch.shake = 1;
			doing(hit[0], 'douse');
			show.fx('thud', 0.6);
			if (hatch.jam <= 0) { say('UNJAMMED!', '#9dff3a', 44); show.fx('allSet', 0.4); }
			return;
		}
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { say('HANDS FULL!'); return; }
		const k = pods.findIndex((p) => p.ing);
		if (k < 0) { say('BEAMING IN...'); return; }
		chefs[i].held = { id: nextId++, ing: pods[k].ing, steps: [], burnt: false, by: [i] };
		tut.held[i] = true;
		pods[k].ing = null;
		pods[k].wait = 1.0;
		doing(i, 'grab');
		show.fx('pop', 0.7);
		say(INGS[chefs[i].held.ing].name, '#9dff3a', 30);
	}

	function tapBinner(hit) {
		const i = hit.find((n) => chefs[n].held);
		if (i === undefined) { float(CHUTE_UI.x, CHUTE_UI.prompt - 40, 'NOTHING TO BIN', '#ffffff', 30); return; }
		chefs[i].held = null;
		doing(i, 'bin');
		show.fx('whooshLong', 0.5, 0.7);
		float(CHUTE_UI.x, CHUTE_UI.prompt - 40, pick(['INTO THE VOID', 'GONE FOREVER', 'THE VOID SAYS THANKS']), '#d04dff', 34);
	}

	// The warper sends food somewhere else: it comes back in a portal hanging in front of the counter, on some wall, between two devices
	function spawnPortal(item, from) {
		let wall, x3, tries = 0;
		do {
			wall = Math.floor(Math.random() * 3);
			x3 = lx3((ACTIVE[wall][0] + 0.05 + Math.random() * (ACTIVE[wall][1] - ACTIVE[wall][0] - 0.1)) * W);
			tries++;
		} while (tries < 30 && ((wall === from.wall && Math.abs(x3 - from.sx) < 2) || portals.some((p) => p.wall === wall && Math.abs(p.x3 - x3) < 1.5)));
		const sp = proj(wall, x3, PORTAL_Y, PORTAL_Z);
		portals.push({ item, wall, x3, t: 0, x: sp.x, y: sp.y });
		if (portals.length > MAX_PORTALS) portals.shift();
		show.fx('reveal', 0.5, 0.8);
		float(from.ui.x, from.ui.prompt - 40, 'IT\'S... SOMEWHERE ELSE!', '#3af2ff', 36);
	}

	function stepPortals(dt) {
		for (const p of portals) {
			p.t += dt;
			const sp = proj(p.wall, p.x3, PORTAL_Y, PORTAL_Z);
			p.x = sp.x;
			p.y = sp.y;
		}
	}

	function tapPortal(p, hit) {
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { float(p.x, p.y - 140, 'HANDS FULL!', '#ffffff', 34); return; }
		chefs[i].held = p.item;
		if (!p.item.by.includes(i)) p.item.by.push(i);
		portals.splice(portals.indexOf(p), 1);
		doing(i, 'grab');
		show.fx('pop', 0.8, 0.8);
		float(p.x, p.y - 100, 'GOT IT!', '#3af2ff', 40);
	}

	/* ---------- the customers ---------- */

	const windowsNow = () => (phase === 'tutorial' ? 3 : phase === 'play' && shiftNo >= 0 ? SHIFTS[shiftNo].windows : 2);
	const colW = (n) => (CHUTE - HATCH) / n;
	const colX = (k, n) => W + HATCH + colW(n) * (k + 0.5);

	function stepCustomers(dt) {
		const n = windowsNow();
		for (let k = 0; k < 4; k++) {
			const c = customers[k];
			if (!c) {
				if (k < n && (phase === 'tutorial' || phase === 'play')) {
					slotWait[k] -= dt;
					if (slotWait[k] <= 0) customers[k] = newCustomer(k, n);
				}
				continue;
			}
			c.age += dt;
			c.x = lerp(c.x, colX(k, n), Math.min(1, dt * 6));
			c.stateT += dt;
			if (c.sayT > 0) c.sayT -= dt;
			if (c.state === 'wait') {
				if (phase === 'play') c.left -= dt;
				if (c.left <= 0) walkout(c);
			} else if ((c.state === 'eat' && c.stateT > 2.6) || (c.state === 'angry' && c.stateT > 2.4)) {
				c.state = 'leave';
				c.stateT = 0;
			} else if (c.state === 'leave' && c.stateT > 0.7) {
				customers[k] = null;
				slotWait[k] = phase === 'tutorial' ? 1 : (shiftNo >= 0 ? SHIFTS[shiftNo].gap : 4) * (0.7 + Math.random() * 0.6);
			}
		}
	}

	function newCustomer(k, n) {
		let recipe;
		const shift = SHIFTS[Math.max(0, shiftNo)];
		if (phase === 'tutorial') recipe = PRACTICE;
		else if (vipPending) { recipe = FEAST; vipPending = false; }
		else {
			const tier = pick(shift.tiers);
			const open = RECIPES.filter((r) => r.tier === tier && !customers.some((c) => c && c.recipe === r));
			recipe = pick(open.length ? open : RECIPES.filter((r) => r.tier === tier));
		}
		const types = TYPES.filter((ty) => !customers.some((c) => c && c.type === ty));
		const type = recipe === FEAST ? { id: 'overlord', name: 'THE OVERLORD', skin: '#5a6b2e' } : pick(types.length ? types : TYPES);
		const patience = PATIENCE[recipe.tier] * (phase === 'tutorial' ? 1 : shift.patience);
		show.fx('joinWall', 0.5);
		if (recipe === FEAST) show.fx('villainReveal', 0.6);
		return {
			k, type, recipe, patience, left: patience, age: 0, x: colX(k, n), state: 'wait', stateT: 0,
			parts: recipe.parts.map((p) => ({ ing: p[0], steps: p.slice(1), filled: false, item: null })),
			by: [], say: recipe === FEAST ? 'I HUNGER. BRING THE FEAST.' : pick(HELLO), sayT: 3.2, seed: Math.random() * 100,
		};
	}

	const sameSteps = (a, b) => a.length === b.length && a.every((s, i) => s === b[i]);
	function fits(item, part) {
		if (!item || item.burnt || item.ing !== part.ing || part.filled) return false;
		return part.steps[0] === '*' ? item.steps.length > 0 : sameSteps(item.steps, part.steps);
	}

	function tapCustomer(k, hit) {
		const cu = customers[k];
		if (!cu || cu.state !== 'wait') return;
		for (const i of hit) {
			const item = chefs[i].held;
			const part = item && cu.parts.find((pt) => fits(item, pt));
			if (!part) continue;
			part.filled = true;
			part.item = item;
			chefs[i].held = null;
			for (const n of item.by.concat([i])) if (!cu.by.includes(n)) cu.by.push(n);
			doing(i, 'serve');
			show.fx('lockIn', 0.7);
			if (cu.parts.every((pt) => pt.filled)) complete(cu);
			else { cu.say = 'AND THE REST?'; cu.sayT = 1.6; }
			return;
		}
		const holder = hit.find((i) => chefs[i].held);
		if (holder !== undefined) {
			cu.say = chefs[holder].held.burnt ? 'IS THAT... CHARCOAL?' : pick(NOPE);
			cu.sayT = 1.8;
			show.fx('buzz', 0.5);
		} else if (cu.sayT <= 0) {
			cu.say = 'WELL? I\'M WAITING.';
			cu.sayT = 1.4;
		}
	}

	// what a cook should do next, for the hint over their head
	function hintFor(c) {
		const it = c.held;
		if (!it) return 'GRAB IT';
		if (it.burnt) return 'BIN IT';
		let next = null, ready = false, any = false;
		for (const cu of customers) {
			if (!cu || cu.state !== 'wait') continue;
			for (const pt of cu.parts) {
				if (pt.filled || pt.ing !== it.ing) continue;
				if (fits(it, pt)) ready = true;
				else if (pt.steps[0] === '*') any = true;
				else if (pt.steps.length > it.steps.length && it.steps.every((st, j) => pt.steps[j] === st)) next = next || pt.steps[it.steps.length];
			}
		}
		if (ready) return 'SERVE IT';
		if (next) return KIND[next].verb;
		if (any) return 'COOK IT';
		return 'BIN IT';
	}

	function complete(c) {
		c.state = 'eat';
		c.stateT = 0;
		c.say = pick(YUM);
		c.sayT = 2.6;
		show.fx('kaching', 0.8);
		if (phase === 'tutorial') { tut.served++; return; }
		const price = PRICE[c.recipe.tier];
		const tip = Math.round(price * 0.5 * clamp(c.left / c.patience, 0, 1));
		for (const i of c.by) {
			scores[i] += price + tip;
			const o = overChef(i);
			float(o.x, o.y, '+' + (price + tip), colourOf(i), 52);
		}
		float(c.x, SAY_Y - 70, tip > 0 ? 'TIP +' + tip : 'SERVED', '#e9ff4a', 40);
		served++;
		streak++;
		if (streak % STREAK.every === 0) {
			bonus += STREAK.bonus;
			setBanner(streak + ' IN A ROW!', 'STREAK BONUS +' + STREAK.bonus, '#e9ff4a');
			show.fx('bonus', 0.7);
		}
		if (c.recipe === FEAST) { show.confetti(120); setBanner('THE OVERLORD IS PLEASED', 'FOR NOW...', '#9dff3a'); }
	}

	function walkout(c) {
		c.state = 'angry';
		c.stateT = 0;
		c.say = pick(GRR);
		c.sayT = 2.4;
		streak = 0;
		walkouts++;
		show.fx('roundFail', 0.35);
		float(c.x, SAY_Y - 70, 'WALKOUT!', '#ff4a32', 46);
	}

	/* ---------- the shifts and their trouble ---------- */

	function shiftAt(left) {
		let n = 0;
		for (let k = 0; k < SHIFTS.length; k++) if (left <= SHIFTS[k].from) n = k;
		return n;
	}

	function stepShift(dt) {
		const n = shiftAt(show.timeLeft());
		if (n !== shiftNo) {
			shiftNo = n;
			setBanner('SHIFT ' + (n + 1), SHIFTS[n].name, '#9dff3a');
			show.label('SHIFT ' + (n + 1));
			show.fx('roundStart', 0.7);
			eventIn = SHIFTS[n].every ? SHIFTS[n].every * 0.5 : 0;
		}
		const shift = SHIFTS[shiftNo];
		if (!shift.every) return;
		eventIn -= dt;
		if (eventIn <= 0) {
			trouble(pick(shift.vip && !vipPending && !customers.some((c) => c && c.recipe === FEAST) ? ['fire', 'jam', 'leak', 'vip', 'vip'] : ['fire', 'jam', 'leak']));
			eventIn = shift.every * (0.8 + Math.random() * 0.4);
		}
	}

	function trouble(kind) {
		if (kind === 'fire') {
			const free = stations.filter((s) => s.fire <= 0);
			if (free.length) ignite(pick(free));
			setBanner('GREASE FIRE!', 'TAP IT TO PUT IT OUT', '#ff4a32');
			show.fx('alarm', 0.5);
		} else if (kind === 'jam') {
			hatch.jam = JAM_TAPS;
			hatch.shake = 1;
			setBanner('GRABBER JAMMED!', 'TAP IT TO FIX IT', '#ffc21a');
			show.fx('alarm', 0.5);
		} else if (kind === 'leak') {
			const warp = stations.find((s) => s.kind === 'warp');
			for (let n = 0; n < 3; n++) spawnPortal({ id: nextId++, ing: chooseIng(), steps: [], burnt: false, by: [] }, warp);
			setBanner('DIMENSIONAL LEAK!', 'FREE FOOD IN THE PORTALS', '#3af2ff');
		} else if (kind === 'vip') {
			vipPending = true;
			setBanner('THE OVERLORD APPROACHES', 'SERVE ITS FEAST FOR A FORTUNE', '#d04dff');
			show.fx('villainReveal', 0.5);
		}
	}

	/* ---------- taps ---------- */

	// who a touch could be: the players near enough that spot on that wall to
	// reach it (the simulator's touching player first, if they're in reach), nearest first
	function hitters(at) {
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		const a = at.x / W - wall;
		let flagged = -1;
		for (let i = 0; i < count; i++) {
			const p = latest[i];
			if (p && p.wallChange !== undefined && p.wallChange !== null && p.wallChange !== false) { p.wallChange = null; if (flagged < 0) flagged = i; }
		}
		const near = [];
		for (let i = 0; i < count; i++) {
			const p = latest[i];
			if (!p) continue;
			const { along, dist } = wallsOf(p);
			if (dist[wall] > REACH.out || Math.abs(along[wall] - a) > REACH.along) continue;
			near.push({ i, d: (i === flagged ? -1 : 0) + Math.abs(along[wall] - a) + dist[wall] });
		}
		near.sort((x, y) => x.d - y.d);
		return near.map((n) => n.i);
	}

	// A tap does whatever's drawn under it, for a player who's walked over and can reach it
	function tap(at) {
		if (!at || !count || (phase !== 'tutorial' && phase !== 'play')) return;
		if (show.paused) return;
		ripples.push({ x: at.x, y: at.y, t: 0 });
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		const lx = at.x - wall * W;
		const hit = hitters(at);
		if (!hit.length) { float(at.x, at.y - 40, 'WALK OVER HERE', '#ffffff', 28); return; }
		const portal = portals.find((p) => p.wall === wall && Math.abs(p.x - at.x) < 130 && Math.abs(p.y - at.y) < 160);
		if (portal) { tapPortal(portal, hit); return; }
		if (wall === 1) {
			if (lx < FRONT_L || lx >= FRONT_R) return;   // (the empty ends)
			if (lx < HATCH) tapGrabber(hit);
			else if (lx >= CHUTE) tapBinner(hit);
			else tapCustomer(clamp(Math.floor((lx - HATCH) / colW(windowsNow())), 0, windowsNow() - 1), hit);
			return;
		}
		const s = stations.find((o) => o.wall === wall && Math.abs(lx / W - slotAlong(wall, o.slot)) < SLOT_W / 2);
		if (s) tapStation(s, hit);
	}

	stage.$el.on('click.grub-o-tron', (e) => tap(IGB.toWorld(e)));

	/* ---------- floating words, ripples, banners ---------- */

	function float(x, y, text, fill, size) {
		floaters.push({ x, y, text, fill, size: size || 40, t: 0 });
		if (floaters.length > 40) floaters.shift();
	}

	function setBanner(text, sub, fill) { banner = { text, sub, fill, t: 0 }; }

	function stepFx(dt) {
		for (const f of floaters) f.t += dt;
		floaters = floaters.filter((f) => f.t < 1.5);
		for (const r of ripples) r.t += dt;
		ripples = ripples.filter((r) => r.t < 0.5);
		if (banner) { banner.t += dt; if (banner.t > 3.2) banner = null; }
	}

	function drawBanner(ctx) {
		if (!banner) return;
		const b = banner;
		ctx.save();
		ctx.globalAlpha = clamp((3.2 - b.t) / 0.4, 0, 1);
		show.onWalls(ctx, function (c) {
			show.slam(c, b.text, W / 2, 330, 110, b.t, { fill: b.fill });
			if (b.sub) show.slam(c, b.sub, W / 2, 445, 52, b.t - 0.3, { fill: 'white' });
		});
		ctx.restore();
	}

	/* ---------- 3D: the kitchen, seen side on ---------- */

	// Each wall is a side-on view of its own stretch of kitchen: a long
	// counter across the wall with its devices standing on it, the tiled wall
	// behind, and the cooks along the bottom, in front of the counter. An
	// orthographic camera, tilted down a little, so a wall's x maps straight
	// onto its kitchen's x (12 units across a wall). A cook rises into view at
	// the foot of a wall as their player walks over to it and sinks away as
	// they leave, so a player near a corner shows on both walls. On the front
	// wall the mutants wait behind the counter, with the GRABBER and the
	// BINNER at its ends.
	const VW = 12;                 // a wall's view, units across (and 12 / 1.6 down)
	const VH = VW / 1.6;
	const U = VW / W;
	const SET_X = [-40, 0, 40];    // each wall's kitchen, side by side in one scene
	const PITCH = 12 * Math.PI / 180;
	const AIM = { y: 3.5, z: 0 };  // where every camera looks
	const CT = { y: 1.6, front: -0.2, back: -1.8, z: -1.0 };   // the counter: its top, its front and back faces, its middle
	const BACK_Z = [-2.3, -3.5, -2.3];                         // each kitchen's back wall
	const STAND_Z = 0.9;           // where the cooks stand, in front of the counter
	const QUEUE_Z = -2.6;          // where the mutants stand, behind the front counter
	const ISLAND = { y: CT.y };    // (the devices stand on the counter)
	const MS = 0.72;               // (their machines, scaled to their share of the wall)
	const PORTAL_Y = CT.y + 1.0, PORTAL_Z = CT.front + 0.7;   // a portal hangs in front of the counter
	const lx3 = (lx) => lx * U - VW / 2;
	const HATCH_X = lx3((FRONT_L + HATCH) / 2);
	const CHUTE_X = lx3((CHUTE + FRONT_R) / 2);
	const FRONT_MS = 0.62;          // (the grabber and binner, scaled to their narrower spots)
	const POD_X = [-0.62, 0, 0.62].map((d) => HATCH_X + d * FRONT_MS);
	const POD_Z = POD_X.map(() => CT.z + 0.15 * FRONT_MS);
	const ITEM_AT = { chop: 0.78, fry: 0.92, grill: 0.72, stir: 1.02, press: 0.5, inject: 0.62, warp: 0.7, cryo: 0.5 };   // an item's height on each device (over the counter)

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.NeutralToneMapping;   // (keeps the colours bright)
	renderer.toneMappingExposure = 0.8;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	let post = null;
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x07040e);
	post = createWallComposer(renderer, scene, { strength: 0.32, radius: 0.4, threshold: 1.0, cap: 1.6, fxaa: true });   // (a little glow on the neon, no more; FXAA, not multisampling: far quicker)
	// what the shiny plastic reflects: a bright candy-coloured room, a strip light overhead
	const envTex = environmentFromShader(renderer, `
		vec3 envColor(vec3 d) {
			float up = d.y * 0.5 + 0.5;
			vec3 c = mix(vec3(0.55, 0.42, 0.62), vec3(0.72, 0.84, 1.0), up);
			c += vec3(1.0, 0.55, 0.35) * pow(max(0.0, dot(d, normalize(vec3(-1.0, 0.3, 0.2)))), 4.0) * 0.6;
			c += vec3(0.3, 0.9, 0.85) * pow(max(0.0, dot(d, normalize(vec3(1.0, 0.3, 0.2)))), 4.0) * 0.6;
			c += vec3(1.0, 0.98, 0.95) * pow(max(0.0, d.y), 16.0) * 2.0;
			return c * 0.8;
		}
	`);
	scene.environment = envTex;
	scene.environmentIntensity = 0.35;

	const cams = SET_X.map(function (ox) {
		const c = new THREE.OrthographicCamera(-VW / 2, VW / 2, VH / 2, -VH / 2, 0.1, 80);
		c.position.set(ox, AIM.y + Math.sin(PITCH) * 30, AIM.z + Math.cos(PITCH) * 30);
		c.lookAt(ox, AIM.y, AIM.z);
		c.updateMatrixWorld();
		return c;
	});
	function views() {
		const w = renderer.domElement.width, h = renderer.domElement.height;
		return cams.map((camera, i) => {
			const x0 = Math.round(i * w / 3), x1 = Math.round((i + 1) * w / 3);
			return { camera, x: x0, y: 0, width: x1 - x0, height: h };
		});
	}
	// where a point in a wall's kitchen lands on that wall (world pixels)
	const _v = new THREE.Vector3();
	function proj(wall, x, y, z) {
		_v.set(SET_X[wall] + x, y, z);
		return toScreen(_v, cams[wall], wall * W, 0, W, H) || { x: wall * W + W / 2, y: H / 2 };
	}
	// a device's words: its name plate over it (all in a row), its prompt and bar under that, its middle
	const uiAt = (wall, x) => ({ x: proj(wall, x, 0, CT.z).x, plate: proj(wall, x, CT.y + 3.0, CT.z).y, prompt: proj(wall, x, CT.y + 3.0, CT.z).y + 46, top: proj(wall, x, CT.y + 1, CT.z).y });
	for (const d of STATIONS) {
		d.sx = lx3(slotAlong(d.wall, d.slot) * W);
		d.sz = CT.z;
		d.ui = uiAt(d.wall, d.sx);
	}
	const HATCH_UI = uiAt(1, HATCH_X);
	const CHUTE_UI = uiAt(1, CHUTE_X);
	const TICKET_BOTTOM = proj(1, 0, 3.9, QUEUE_Z).y;     // the tickets, over the mutants' heads
	const SAY_Y = proj(1, 0, 2.6, QUEUE_Z).y;             // their speech, over their faces
	const SERVE_Y = proj(1, 0, CT.y + 0.15, CT.front).y - 20;   // a SERVER plate on the counter in front of each

	/* ---------- 3D: helpers ---------- */

	// shiny plastic, by default: a clear coat over it
	const std = (color, rough = 0.5, metal = 0.1, extra) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: rough, metalness: metal, clearcoat: rough < 0.7 ? 0.4 : 0, clearcoatRoughness: 0.3 }, extra));
	const glowMat = (color, k = 2, extra) => { const m = new THREE.MeshBasicMaterial(Object.assign({ color }, extra)); m.color.multiplyScalar(k); return m; };
	function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
		const m = new THREE.Mesh(geo, mat);
		m.position.set(x, y, z);
		if (parent) parent.add(m);
		return m;
	}
	// a box with rounded edges and corners, smoothly shaded (its six faces keep their own materials)
	function roundBox(w, h, d, r, k = 3) {
		const seg = 2 * k + 1;
		const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg);
		const pos = g.attributes.position, nor = g.attributes.normal;
		const half = [w / 2, h / 2, d / 2], inner = half.map((v) => v - r);
		const map = (v, a) => { const i = Math.round((v + 0.5) * seg); return i <= k ? -half[a] + r * (i / k) : inner[a] + r * ((i - k - 1) / k); };
		const p = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
		for (let j = 0; j < pos.count; j++) {
			p.set(map(pos.getX(j), 0), map(pos.getY(j), 1), map(pos.getZ(j), 2));
			c.set(clamp(p.x, -inner[0], inner[0]), clamp(p.y, -inner[1], inner[1]), clamp(p.z, -inner[2], inner[2]));
			n.subVectors(p, c);
			if (n.lengthSq() < 1e-12) n.set(nor.getX(j), nor.getY(j), nor.getZ(j)); else n.normalize();
			p.copy(c).addScaledVector(n, r);
			pos.setXYZ(j, p.x, p.y, p.z);
			nor.setXYZ(j, n.x, n.y, n.z);
		}
		g.computeBoundingSphere();
		return g;
	}
	const BOX = (w, h, d) => { const m = Math.min(w, h, d); return m >= 0.1 ? roundBox(w, h, d, Math.min(0.14, m * 0.24)) : new THREE.BoxGeometry(w, h, d); };
	const CYL = (rt, rb, h, seg = 32, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
	const SPH = (r, seg = 28) => new THREE.SphereGeometry(r, seg, Math.max(10, Math.round(seg * 0.7)));
	const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
	// a rod from a to b
	function limb(parent, a, b, r, mat, seg = 8) {
		_a.set(a[0], a[1], a[2]);
		_b.set(b[0], b[1], b[2]);
		const m = new THREE.Mesh(CYL(r, r, _a.distanceTo(_b), seg), mat);
		m.position.copy(_a).add(_b).multiplyScalar(0.5);
		m.quaternion.setFromUnitVectors(_up, _b.clone().sub(_a).normalize());
		parent.add(m);
		return m;
	}
	function shadows(obj, cast = true) {
		obj.traverse((o) => {
			if (!o.isMesh) return;
			const lit = !o.material.isMeshBasicMaterial && !o.material.transparent;
			o.castShadow = cast && lit;
			o.receiveShadow = lit;
		});
		return obj;
	}
	function tex(w, h, paint, rx = 1, ry = 1) {
		const t = canvasTexture(w, h, paint);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(rx, ry);
		t.anisotropy = 4;
		return t;
	}
	// the camera's way back: what faces it, faces the players
	const TOWARD = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
	const faceCam = (m) => m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), TOWARD);

	/* ---------- 3D: textures ---------- */

	const TEX = {};
	TEX.hazard = tex(128, 32, function (c) {
		c.fillStyle = '#302a52';
		c.fillRect(0, 0, 128, 32);
		c.fillStyle = '#d9b51a';
		for (let x = -32; x < 160; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 32, 0); c.lineTo(x + 16, 0); c.fill(); }
	}, 14, 1);
	TEX.wood = tex(256, 256, function (c) {
		c.fillStyle = '#a5703e';
		c.fillRect(0, 0, 256, 256);
		for (let r = 120; r > 0; r -= 9) { c.strokeStyle = `rgba(80,40,10,${0.25 + (r % 18 ? 0.1 : 0.25)})`; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
		c.strokeStyle = 'rgba(30,15,5,0.8)';
		c.lineWidth = 3;
		for (let n = 0; n < 9; n++) { const a = n * 0.7; c.beginPath(); c.moveTo(128 + Math.cos(a) * 20, 128 + Math.sin(a) * 20); c.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); c.stroke(); }
	});
	TEX.sky = canvasTexture(1024, 320, function (c) {
		const g = c.createLinearGradient(0, 0, 0, 320);
		g.addColorStop(0, '#ff6ab0');
		g.addColorStop(0.5, '#ffa36b');
		g.addColorStop(1, '#ffe08a');
		c.fillStyle = g;
		c.fillRect(0, 0, 1024, 320);
		const sun = c.createRadialGradient(700, 200, 0, 700, 200, 130);
		sun.addColorStop(0, 'rgba(255,240,180,1)');
		sun.addColorStop(0.3, 'rgba(255,190,90,0.8)');
		sun.addColorStop(1, 'rgba(255,120,40,0)');
		c.fillStyle = sun;
		c.fillRect(0, 0, 1024, 320);
		const rnd = seeded(33);
		for (const [shade, base, top] of [['#b06ad8', 250, 120], ['#6a3ab0', 300, 70]]) {
			c.fillStyle = shade;
			for (let x = 0; x < 1024; x += 20 + rnd() * 50) {
				const w = 18 + rnd() * 50, h = top + rnd() * 120;
				c.beginPath();
				c.moveTo(x, 320);
				c.lineTo(x, base - h);
				c.lineTo(x + w * (0.3 + rnd() * 0.4), base - h - rnd() * 30);   // (broken tops)
				c.lineTo(x + w, base - h + rnd() * 40);
				c.lineTo(x + w, 320);
				c.fill();
			}
		}
		for (let n = 0; n < 4; n++) {   // (smoke rising off the ruins)
			const x = 80 + rnd() * 860;
			for (let k = 0; k < 8; k++) { c.fillStyle = `rgba(120,60,160,${0.25 - k * 0.025})`; c.beginPath(); c.arc(x + k * 12, 200 - k * 26, 14 + k * 6, 0, Math.PI * 2); c.fill(); }
		}
	});
	TEX.swirl = canvasTexture(256, 256, function (c) {
		c.fillStyle = '#000';
		c.fillRect(0, 0, 256, 256);
		c.translate(128, 128);
		for (let n = 0; n < 420; n++) {
			const a = n * 0.31, r = Math.sqrt(n / 420) * 124;
			c.fillStyle = n % 3 ? 'rgba(58,242,255,0.9)' : 'rgba(255,45,143,0.9)';
			c.beginPath();
			c.arc(Math.cos(a + r * 0.05) * r, Math.sin(a + r * 0.05) * r, 1 + (n % 4) * 0.6, 0, Math.PI * 2);
			c.fill();
		}
		for (let k = 0; k < 5; k++) {
			c.strokeStyle = k % 2 ? 'rgba(208,77,255,0.6)' : 'rgba(58,242,255,0.5)';
			c.lineWidth = 6;
			c.beginPath();
			for (let s = 0; s < 60; s++) { const a = k * 1.256 + s * 0.12, r = s * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
			c.stroke();
		}
	});
	TEX.swirl.center.set(0.5, 0.5);
	TEX.soft = canvasTexture(64, 64, function (c) {
		const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 64, 64);
	});
	TEX.crt = canvasTexture(256, 176, function (c) {
		c.fillStyle = '#04200a';
		c.fillRect(0, 0, 256, 176);
		c.fillStyle = '#9dff3a';
		c.fillRect(60, 46, 34, 34);
		c.fillRect(162, 46, 34, 34);
		const pts = [[56, 116], [86, 140], [116, 116], [146, 140], [176, 116], [204, 128]];
		c.strokeStyle = '#9dff3a';
		c.lineWidth = 10;
		c.beginPath();
		pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.stroke();
		for (let y = 0; y < 176; y += 4) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y, 256, 2); }
	});
	// a neon sign: white tubes, a halo of colour
	function signTex(text, colour, font) {
		return canvasTexture(1024, 192, function (c) {
			c.clearRect(0, 0, 1024, 192);
			// (its lettering, shrunk to fit the sign)
			const face = font ? `"${font}"` : FONT;
			c.font = `800 118px ${face}, sans-serif`;
			const size = Math.min(118, 118 * 940 / Math.max(1, c.measureText(text).width));
			c.font = `800 ${size}px ${face}, sans-serif`;
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.lineJoin = 'round';
			c.shadowColor = colour;
			c.shadowBlur = 28;
			c.strokeStyle = colour;
			c.lineWidth = 16;
			c.strokeText(text, 512, 100);
			c.shadowBlur = 0;
			c.fillStyle = '#ffffff';
			c.fillText(text, 512, 100);
		});
	}

	/* ---------- 3D: shared materials ---------- */

	const MAT = {
		hazard: std(0xffffff, 0.45, 0, { map: TEX.hazard }),
		counterFront: std(0xff7ab8, 0.35, 0.05),
		counterTop: std(0xffffff, 0.25, 0.05),
		steel: std(0xe2e8f0, 0.2, 0.85),
		darkSteel: std(0x5a5ab0, 0.35, 0.15),
		black: std(0x1a1630, 0.45, 0.1),
		rust: std(0xff7a5a, 0.45, 0.1),
		pipe: std(0x3fd0c0, 0.3, 0.3),
		wood: std(0xe0904a, 0.55, 0),
		woodTop: std(0xffffff, 0.55, 0, { map: TEX.wood }),
		beige: std(0xfff0cc, 0.3, 0.05),
		glass: std(0xd8f2ff, 0.05, 0, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
		rubber: std(0x3a3458, 0.8, 0),
		cream: std(0xfff4dc, 0.5, 0),
		white: std(0xffffff, 0.35, 0),
	};

	// each room's colours: its floor's checks, its wall's tiles, the floor round the grid
	// (one look for the whole kitchen, every wall the same: muted, dark slate-green
	// tiles, so the devices, the food and the neon carry the colour)
	const KITCHEN = { wall: ['#2a3834', '#2f3e38'], edge: 0x161c1a, counter: 0x2a2230, light: 0xffd8b0 };
	const ROOM_LOOK = [KITCHEN, KITCHEN, KITCHEN];
	// glossy wall tiles in two colours, banded, the odd crack and drip
	function wallTex(a, b) {
		return tex(512, 512, function (c) {
			const rnd = seeded(b.charCodeAt(3) * 3);
			c.fillStyle = mix(a, '#000000', 0.3);
			c.fillRect(0, 0, 512, 512);
			for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
				const col = y === 5 ? mix(a, '#ffffff', 0.18) : y % 2 ? a : b;   // (a faint band of paler tiles)
				c.fillStyle = mix(col, '#ffffff', rnd() * 0.05);
				c.beginPath();
				c.roundRect(x * 64 + 3, y * 64 + 3, 58, 58, 8);
				c.fill();
				c.fillStyle = 'rgba(255,255,255,0.07)';
				c.fillRect(x * 64 + 8, y * 64 + 7, 30, 6);
			}
			for (let n = 0; n < 5; n++) { c.strokeStyle = 'rgba(10,14,12,0.4)'; c.lineWidth = 2; c.beginPath(); let x = rnd() * 512, y = rnd() * 512; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 50; y += rnd() * 40; c.lineTo(x, y); } c.stroke(); }
			for (let n = 0; n < 6; n++) { c.fillStyle = 'rgba(120,255,80,0.1)'; c.fillRect(rnd() * 512, rnd() * 200, 4, 40 + rnd() * 120); }
		}, 9, 3);
	}
	/* ---------- 3D: the kitchens ---------- */

	const sets = SET_X.map(function (ox) {
		const g = new THREE.Group();
		g.position.x = ox;
		scene.add(g);
		return g;
	});
	const fans = [];
	const signs = [];

	function buildRoom(w) {
		const g = sets[w];
		const backZ = BACK_Z[w];
		const look = ROOM_LOOK[w];
		// the floor the cooks stand on, the tiled wall behind
		const floor = mesh(new THREE.PlaneGeometry(14, 8), std(look.edge, 0.4, 0.05), g, 0, 0, 2);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		const wt = wallTex(look.wall[0], look.wall[1]);
		wt.repeat.set(7, 4.5);
		const wall = mesh(new THREE.PlaneGeometry(14, 9), std(0xffffff, 0.35, 0, { map: wt }), g, 0, 4.5, backZ);
		wall.receiveShadow = true;
		// the counter right across: steel on top, the room's colour down the front
		const front = new THREE.Color(look.counter);
		const x0 = lx3(ACTIVE[w][0] * W), x1 = lx3(ACTIVE[w][1] * W), cw = x1 - x0, cx = (x0 + x1) / 2;
		const counter = mesh(BOX(cw, CT.y, CT.front - CT.back), std(front, 0.35, 0.1), g, cx, CT.y / 2, CT.z);
		counter.receiveShadow = counter.castShadow = true;
		mesh(BOX(cw + 0.2, 0.12, CT.front - CT.back + 0.15), MAT.steel, g, cx, CT.y, CT.z).receiveShadow = true;
		mesh(BOX(cw, 0.08, 0.02), MAT.hazard, g, cx, CT.y - 0.12, CT.front + 0.012);
		mesh(BOX(cw, 0.16, 0.05), MAT.black, g, cx, 0.08, CT.front + 0.03);
		// (the empty ends: a locker in a corner, a pile of crates and a barrel at the back)
		for (const [ea, eb] of [[0, ACTIVE[w][0]], [ACTIVE[w][1], 1]]) {
			const ex = lx3((ea + eb) / 2 * W), ew = (eb - ea) * VW;
			if (ew < 2) {
				const locker = mesh(BOX(1.1, 3.4, 0.9), std(0x3a4440, 0.5, 0.4), g, ex, 1.7, backZ + 0.6);
				locker.castShadow = true;
				for (const ly of [2.6, 0.9]) mesh(BOX(0.8, 0.05, 0.02), MAT.black, g, ex, ly, backZ + 1.06);
				mesh(BOX(0.06, 0.4, 0.04), MAT.steel, g, ex + 0.35, 1.8, backZ + 1.08);
			} else {
				for (const [dx, dy, sz] of [[-0.7, 0.45, 0.9], [0.3, 0.45, 0.9], [-0.2, 1.3, 0.8]]) mesh(BOX(sz, sz, sz), std(0x5a4430, 0.8, 0), g, ex + dx, dy, backZ + 0.8).castShadow = true;
				mesh(CYL(0.4, 0.4, 1.1, 20), std(0x6a5a20, 0.55, 0.4), g, ex + 1.1, 0.55, backZ + 1.0).castShadow = true;
			}
		}
		// pipes high on the wall, dripping rust
		for (const [y, r] of [[6.3, 0.13], [6.65, 0.08]]) {
			const p = mesh(CYL(r, r, 14, 14), MAT.pipe, g, 0, y, backZ + 0.2);
			p.rotation.z = Math.PI / 2;
			for (let x = -6; x <= 6; x += 2.3 + (y % 1)) mesh(CYL(r * 1.35, r * 1.35, 0.14, 14), MAT.rust, g, x, y, backZ + 0.2).rotation.z = Math.PI / 2;
		}
		// light: a warm wash from overhead, and the room's own colour of neon
		const wash = new THREE.PointLight(0xffffff, 18, 26, 1.2);
		wash.position.set(0, 8, 3);
		g.add(wash);
		const light = new THREE.PointLight(look.light, 16, 14, 1.4);
		light.position.set(0, 5, -0.5);
		g.add(light);
		if (w !== 1) {
			// the sign, a shelf of glowing jars and a fan, high on the wall
			const sign = mesh(new THREE.PlaneGeometry(2.8, 0.52), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), g, w === 0 ? -4.4 : 4.4, 5.75, backZ + 0.06);
			signs.push({ m: sign, text: w === 0 ? 'THE OLD WAYS' : 'THE NEW WAYS', colour: '#9dff3a', k: 1.15, seed: w });
			const jx = w === 0 ? 3.2 : -3.2;
			mesh(BOX(2.6, 0.08, 0.36), MAT.rust, g, jx, 5.4, backZ + 0.18);
			for (let k = 0; k < 4; k++) {
				const hue = [0x9dff3a, 0xff2d8f, 0xe9ff4a, 0x3af2ff][(k + w) % 4];
				mesh(CYL(0.15, 0.15, 0.36 + (k % 2) * 0.12, 14), MAT.glass, g, jx - 0.9 + k * 0.6, 5.63 + (k % 2) * 0.06, backZ + 0.18);
				mesh(CYL(0.12, 0.12, 0.22 + (k % 2) * 0.1, 14), glowMat(hue, 1.1), g, jx - 0.9 + k * 0.6, 5.57 + (k % 2) * 0.06, backZ + 0.18);
			}
			const fan = new THREE.Group();
			fan.position.set(w === 0 ? 0.3 : -0.3, 5.7, backZ + 0.1);
			g.add(fan);
			mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), MAT.darkSteel, fan);
			mesh(new THREE.CircleGeometry(0.4, 24), MAT.black, fan, 0, 0, -0.02);
			const blades = new THREE.Group();
			fan.add(blades);
			for (let b = 0; b < 4; b++) {
				const pivot = new THREE.Group();
				pivot.rotation.z = b * Math.PI / 2;
				mesh(BOX(0.12, 0.34, 0.02), MAT.steel, pivot, 0, 0.18, 0.02);
				blades.add(pivot);
			}
			fans.push(blades);
		} else {
			// the window onto the wasteland behind the mutants, its posts, the neon over it
			const ww = (CHUTE - HATCH) * U;
			mesh(new THREE.PlaneGeometry(ww, 4.2), new THREE.MeshBasicMaterial({ map: TEX.sky, color: new THREE.Color(0.42, 0.42, 0.42) }), g, 0, 3.6, backZ + 0.03);
			for (const x of [-ww / 2 - 0.05, ww / 2 + 0.05]) mesh(BOX(0.24, 4.6, 0.3), MAT.darkSteel, g, x, 3.5, backZ + 0.12);
			mesh(BOX(ww + 0.4, 0.24, 0.3), MAT.darkSteel, g, 0, 5.75, backZ + 0.12);
			for (const [x, text, colour] of [[-2.6, 'FISSION CHIPS', '#9dff3a'], [2.6, 'OPEN 25/8', '#FC1992']]) {
				const sign = mesh(new THREE.PlaneGeometry(3.4, 0.62), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), g, x, 6.0, backZ + 0.06);
				signs.push({ m: sign, text, colour, k: 1.3, seed: x, font: x < 0 ? 'Monoton' : null });   // (the name in the title's neon-tube lettering)
			}
		}
	}
	for (let w = 0; w < 3; w++) buildRoom(w);
	function paintSigns() {
		for (const s of signs) {
			if (s.m.material.map) s.m.material.map.dispose();
			s.m.material.map = signTex(s.text, s.colour, s.font);
			s.m.material.color.setScalar(s.k);
			s.m.material.needsUpdate = true;
		}
	}
	paintSigns();
	if (document.fonts) Promise.all([`800 100px ${FONT}`, '100px "Monoton"'].map((f) => document.fonts.load(f))).then(paintSigns).catch(() => {});

	// the key light, from up and in front, one shadow map over all three kitchens
	scene.add(new THREE.HemisphereLight(0x8a94c0, 0x3a2418, 0.5));
	const sun = new THREE.DirectionalLight(0xfff2e0, 3.4);
	sun.position.set(0, 18, 14);
	sun.target.position.set(0, 2, -1);
	scene.add(sun, sun.target);
	sun.castShadow = true;
	sun.shadow.mapSize.set(4096, 1024);
	Object.assign(sun.shadow.camera, { left: -47, right: 47, top: 9, bottom: -9, near: 1, far: 50 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.02;

	/* ---------- 3D: the stations ---------- */

	const STATION_3D = {
		chop(g, p) {
			mesh(CYL(1.0, 1.12, 0.56, 32), [MAT.wood, MAT.woodTop, MAT.wood], g, 0, 0.28, 0);
			const goo = mesh(new THREE.CircleGeometry(0.26, 16), glowMat(0x7aff2a, 0.9), g, -0.45, 0.565, 0.15);
			goo.rotation.x = -Math.PI / 2;
			const cleaver = new THREE.Group();
			cleaver.position.set(0.9, 0.78, 0.1);
			g.add(cleaver);
			mesh(BOX(0.42, 0.1, 0.1), MAT.wood, cleaver, 0.18, 0, 0);
			mesh(BOX(0.78, 0.44, 0.04), MAT.steel, cleaver, -0.4, -0.02, 0);
			mesh(BOX(0.78, 0.05, 0.05), std(0xe8f0ee, 0.1, 1), cleaver, -0.4, -0.23, 0);
			p.cleaver = cleaver;
		},
		fry(g, p) {
			mesh(BOX(2.2, 0.86, 1.3), MAT.steel, g, 0, 0.43, 0);
			mesh(BOX(2.3, 0.08, 1.4), MAT.darkSteel, g, 0, 0.88, 0);
			p.oilMat = std(0xffc94a, 0.1, 0.2, { emissive: 0xff8a10, emissiveIntensity: 0.2 });
			const oil = mesh(new THREE.PlaneGeometry(1.95, 1.05), p.oilMat, g, 0, 0.9, 0);
			oil.rotation.x = -Math.PI / 2;
			limb(g, [0.75, 0.95, 0.35], [1.25, 1.55, 0.45], 0.05, MAT.black);
			const basket = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 0.32, 0.7)), new THREE.LineBasicMaterial({ color: 0x9aa4a2 }));
			basket.position.set(0, 0.86, 0);
			g.add(basket);
			mesh(BOX(0.7, 0.32, 0.04), MAT.black, g, 0, 0.45, 0.66);
			p.display = mesh(new THREE.PlaneGeometry(0.5, 0.16), glowMat(0xffc21a, 1.6), g, 0, 0.47, 0.685);
			p.light = new THREE.PointLight(0xffa030, 0, 4, 2);
			p.light.position.set(0, 1.5, 0.2);
			g.add(p.light);
		},
		grill(g, p) {
			mesh(BOX(2.4, 0.5, 1.3), MAT.black, g, 0, 0.25, 0);
			mesh(BOX(2.4, 0.9, 0.1), MAT.darkSteel, g, 0, 0.7, -0.62);
			p.glow = glowMat(0xff6a1a, 0.3);
			const coals = mesh(new THREE.PlaneGeometry(2.2, 1.1), p.glow, g, 0, 0.505, 0);
			coals.rotation.x = -Math.PI / 2;
			for (let n = 0; n < 11; n++) mesh(BOX(0.05, 0.05, 1.15), MAT.darkSteel, g, -1.05 + n * 0.21, 0.56, 0);
			for (let n = 0; n < 4; n++) {
				const k = mesh(CYL(0.08, 0.08, 0.08, 14), MAT.steel, g, -0.8 + n * 0.53, 0.25, 0.68);
				k.rotation.x = Math.PI / 2;
			}
			p.light = new THREE.PointLight(0xff5a1a, 0, 4, 2);
			p.light.position.set(0, 1.2, 0.2);
			g.add(p.light);
		},
		stir(g, p) {
			const pot = mesh(CYL(0.95, 0.78, 1.0, 32, true), std(0x30363a, 0.35, 0.85, { side: THREE.DoubleSide }), g, 0, 0.5, 0);
			pot.castShadow = true;
			mesh(new THREE.CircleGeometry(0.78, 32), MAT.black, g, 0, 0.02, 0).rotation.x = -Math.PI / 2;
			const rim = mesh(new THREE.TorusGeometry(0.95, 0.06, 10, 40), MAT.steel, g, 0, 1.0, 0);
			rim.rotation.x = Math.PI / 2;
			p.sludge = std(0x5aa82a, 0.15, 0.1, { emissive: 0x6aff2a, emissiveIntensity: 0.5 });
			const s = mesh(new THREE.CircleGeometry(0.9, 32), p.sludge, g, 0, 0.9, 0);
			s.rotation.x = -Math.PI / 2;
			const burner = mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 32), glowMat(0xff6a1a, 1.5), g, 0, 0.04, 0);
			burner.rotation.x = Math.PI / 2;
			const paddle = new THREE.Group();
			paddle.position.set(0, 0.9, 0);
			g.add(paddle);
			mesh(BOX(0.09, 1.7, 0.09), MAT.wood, paddle, 0, 0.45, 0);
			mesh(BOX(0.32, 0.4, 0.06), MAT.wood, paddle, 0, -0.3, 0);
			p.paddle = paddle;
		},
		press(g, p) {
			for (const x of [-1.05, 1.05]) mesh(BOX(0.26, 2.0, 0.3), MAT.darkSteel, g, x, 1.0, 0);
			mesh(BOX(2.5, 0.38, 0.5), MAT.hazard, g, 0, 2.05, 0);
			mesh(BOX(1.9, 0.22, 1.1), MAT.black, g, 0, 0.11, 0);
			p.rod = mesh(CYL(0.13, 0.13, 1, 16), MAT.steel, g, 0, 1.5, 0);
			p.plate = mesh(BOX(1.6, 0.2, 1.0), std(0x6e7472, 0.35, 0.85), g, 0, 1.3, 0);
			p.beacon = mesh(SPH(0.13, 14), glowMat(0xe9ff4a, 2), g, 0, 2.36, 0);
		},
		inject(g, p) {
			mesh(BOX(1.6, 0.24, 1.1), MAT.black, g, 0, 0.12, 0);
			mesh(CYL(0.66, 0.66, 1.5, 32, true), MAT.glass, g, 0, 1.0, 0);
			p.fluid = std(0x9a2ad0, 0.1, 0.1, { emissive: 0xc04dff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, depthWrite: false });
			mesh(CYL(0.6, 0.6, 0.62, 32), p.fluid, g, 0, 0.55, 0);
			mesh(BOX(1.1, 0.2, 1.1), MAT.darkSteel, g, 0, 1.82, 0);
			mesh(CYL(0.14, 0.14, 0.5, 16), glowMat(0xd04dff, 1.6), g, 0, 2.15, 0);
			p.needle = mesh(CYL(0.025, 0.005, 0.7, 8), MAT.steel, g, 0, 1.45, 0);
			p.light = new THREE.PointLight(0xc04dff, 3, 3.5, 2);
			p.light.position.set(0, 1.2, 0.5);
			g.add(p.light);
		},
		warp(g, p) {
			mesh(BOX(2.35, 1.35, 1.25), MAT.beige, g, 0, 0.675, 0);
			mesh(BOX(1.6, 1.05, 0.06), MAT.darkSteel, g, -0.3, 0.7, 0.63);
			p.window = glowMat(0xffffff, 0.5, { map: TEX.swirl });
			mesh(new THREE.PlaneGeometry(1.45, 0.92), p.window, g, -0.3, 0.7, 0.665);
			mesh(BOX(0.5, 1.05, 0.05), MAT.darkSteel, g, 0.85, 0.7, 0.63);
			for (const y of [0.98, 0.62]) {
				const k = mesh(CYL(0.12, 0.12, 0.08, 16), MAT.steel, g, 0.85, y, 0.7);
				k.rotation.x = Math.PI / 2;
			}
			p.dial = mesh(BOX(0.03, 0.12, 0.02), glowMat(0x3af2ff, 2), g, 0.85, 0.98, 0.75);
			p.light = new THREE.PointLight(0x3af2ff, 0, 4, 2);
			p.light.position.set(-0.3, 0.8, 1.0);
			g.add(p.light);
		},
		cryo(g, p) {
			mesh(CYL(0.85, 0.95, 0.12, 32), std(0x8aa8b8, 0.2, 0.8), g, 0, 0.06, 0);
			const ring = mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 40), glowMat(0x8fdcff, 1.8), g, 0, 0.13, 0);
			ring.rotation.x = Math.PI / 2;
			mesh(BOX(0.16, 1.9, 0.16), MAT.darkSteel, g, 1.05, 0.95, -0.45);
			const gun = new THREE.Group();
			gun.position.set(0.85, 1.75, -0.3);
			gun.rotation.z = 0.9;
			g.add(gun);
			mesh(CYL(0.22, 0.26, 0.8, 18), std(0x5a7a8a, 0.35, 0.8), gun, 0, 0, 0);
			mesh(CYL(0.12, 0.2, 0.3, 18), MAT.steel, gun, 0, -0.5, 0);
			p.nozzle = mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 20), glowMat(0x8fdcff, 2), gun, 0, -0.66, 0);
			p.nozzle.rotation.x = Math.PI / 2;
			p.light = new THREE.PointLight(0x8fdcff, 0, 4, 2);
			p.light.position.set(0, 1.0, 0.4);
			g.add(p.light);
		},
	};

	// the 3D for each device's state
	const station3d = {};
	function buildStations() {
		for (const s of STATIONS) {
			const g = new THREE.Group();
			g.position.set(s.sx, CT.y, CT.z);
			g.scale.setScalar(MS);
			sets[s.wall].add(g);
			const p = { g };
			STATION_3D[s.kind](g, p);
			// its fire
			p.fire = new THREE.Group();
			g.add(p.fire);
			p.flames = [];
			for (let n = 0; n < 9; n++) {
				const f = mesh(new THREE.ConeGeometry(0.2, 0.9, 10), glowMat(n % 3 ? 0xff6a10 : 0xffd23a, 2.2, { transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), p.fire, -0.9 + n * 0.22, 0.9, (n % 3 - 1) * 0.3);
				p.flames.push(f);
			}
			shadows(g);
			station3d[s.kind] = p;
		}
	}
	buildStations();

	/* ---------- 3D: the grabber, the binner ---------- */

	const hatch3d = (function () {
		const g = new THREE.Group();
		g.position.set(HATCH_X, CT.y, CT.z);
		g.scale.setScalar(FRONT_MS);
		sets[1].add(g);
		mesh(BOX(2.3, 0.3, 1.2), MAT.darkSteel, g, 0, 0.15, 0);
		for (const x of [-1.05, 1.05]) mesh(BOX(0.16, 2.1, 0.2), MAT.darkSteel, g, x, 1.05, -0.4);
		mesh(BOX(2.5, 0.26, 0.6), MAT.steel, g, 0, 2.15, -0.3);
		mesh(BOX(2.0, 0.07, 0.07), glowMat(0x9dff3a, 1.4), g, 0, 2.0, -0.02);
		const pods = [-0.62, 0, 0.62].map(function (ox) {
			mesh(CYL(0.26, 0.28, 0.1, 32), std(0x8af06a, 0.3, 0.1), g, ox, 0.35, 0.15).receiveShadow = true;
			const rim = mesh(new THREE.TorusGeometry(0.26, 0.03, 10, 36), glowMat(0x9dff3a, 1.4), g, ox, 0.4, 0.15);
			rim.rotation.x = Math.PI / 2;
			const beam = mesh(CYL(0.24, 0.27, 1.6, 32, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9dff3a).multiplyScalar(1.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), g, ox, 1.2, 0.15);
			return { rim, beam };
		});
		const hl = new THREE.PointLight(0xe8ffd0, 9, 4, 1.6);   // (the pods lit, so what's on them shows)
		hl.position.set(HATCH_X, CT.y + 1.6, CT.z + 1.2);
		sets[1].add(hl);
		shadows(g);
		// the binner: a hopper with a door onto the void
		const chute = new THREE.Group();
		chute.position.set(CHUTE_X, CT.y, CT.z);
		chute.scale.setScalar(FRONT_MS);
		sets[1].add(chute);
		mesh(BOX(2.2, 1.9, 1.2), std(0x4a2a7a, 0.35, 0.2), chute, 0, 0.95, 0);
		mesh(BOX(2.35, 0.14, 1.3), MAT.steel, chute, 0, 1.95, 0);
		mesh(new THREE.CircleGeometry(0.66, 48), new THREE.MeshBasicMaterial({ color: 0x0a0418 }), chute, 0, 0.95, 0.61);
		const swirl = mesh(new THREE.CircleGeometry(0.62, 48), glowMat(0xffffff, 1.1, { map: TEX.swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), chute, 0, 0.95, 0.62);
		mesh(new THREE.TorusGeometry(0.68, 0.07, 12, 48), glowMat(0xd04dff, 1.4), chute, 0, 0.95, 0.63);
		const cl = new THREE.PointLight(0xd04dff, 3, 3, 2);
		cl.position.set(0, 1, 1);
		chute.add(cl);
		shadows(chute);
		return { pods, swirl, chute };
	})();

	/* ---------- 3D: food ---------- */

	// each ingredient, about 0.6 across, sitting on y = 0
	const ING_3D = {
		roach(g, mat, glow) {
			const leg = MAT.black;
			for (let n = 0; n < 3; n++) for (const side of [-1, 1]) {
				const z = -0.14 + n * 0.14;
				limb(g, [side * 0.12, 0.12, z], [side * 0.3, 0.14, z - 0.04], 0.018, leg);
				limb(g, [side * 0.3, 0.14, z - 0.04], [side * 0.36, 0.0, z + 0.02], 0.016, leg);
			}
			const body = mesh(SPH(0.2, 20), mat, g, 0, 0.13, 0);
			body.scale.set(0.95, 0.55, 1.45);
			mesh(SPH(0.095, 14), mat, g, 0, 0.12, 0.3);
			limb(g, [-0.04, 0.16, 0.36], [-0.14, 0.3, 0.56], 0.01, leg);
			limb(g, [0.04, 0.16, 0.36], [0.14, 0.3, 0.56], 0.01, leg);
			for (const [x, z] of [[-0.08, -0.05], [0.07, 0.08], [0.02, -0.18]]) mesh(SPH(0.035, 8), glow, g, x, 0.23, z);
		},
		eel(g, mat, glow) {
			const pts = [];
			for (let n = 0; n <= 10; n++) pts.push(new THREE.Vector3(-0.36 + n * 0.072, 0.09, Math.sin(n * 0.9) * 0.12));
			mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.075, 10), mat, g);
			const head = pts[pts.length - 1];
			mesh(SPH(0.1, 14), mat, g, head.x + 0.04, 0.1, head.z);
			mesh(SPH(0.03, 8), glow, g, head.x + 0.07, 0.16, head.z + 0.05);
			for (let n = 1; n < 10; n += 2) mesh(SPH(0.028, 6), glow, g, pts[n].x, 0.16, pts[n].z);
		},
		shroom(g, mat, glow) {
			mesh(CYL(0.08, 0.11, 0.26, 14), MAT.cream, g, 0, 0.13, 0);
			const cap = mesh(new THREE.SphereGeometry(0.27, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, g, 0, 0.22, 0);
			cap.scale.set(1, 0.85, 1);
			for (const [x, y, z] of [[-0.12, 0.38, 0.08], [0.1, 0.4, -0.06], [0.04, 0.33, 0.18], [-0.04, 0.42, -0.14]]) mesh(SPH(0.04, 8), glow, g, x, y, z);
			mesh(SPH(0.02, 6), MAT.black, g, -0.04, 0.15, 0.09);
			mesh(SPH(0.02, 6), MAT.black, g, 0.04, 0.15, 0.09);
		},
		ooze(g, mat, glow) {
			const jelly = mat.clone();
			jelly.transparent = true;
			jelly.opacity = 0.82;
			jelly.emissive = new THREE.Color(0x4a8a10);
			jelly.emissiveIntensity = 0.4;
			jelly.roughness = 0.08;
			const cube = mesh(BOX(0.44, 0.4, 0.44), jelly, g, 0, 0.2, 0);
			cube.userData.wobble = true;
			for (const [x, y, z] of [[0.08, 0.14, 0.05], [-0.1, 0.26, -0.06], [0.02, 0.3, 0.1]]) mesh(SPH(0.04, 8), glow, g, x, y, z);
			mesh(SPH(0.03, 8), MAT.black, g, -0.09, 0.27, 0.22);
			mesh(SPH(0.03, 8), MAT.black, g, 0.09, 0.27, 0.22);
		},
		eye(g, mat) {
			mesh(SPH(0.24, 24), mat, g, 0, 0.24, 0);
			const iris = mesh(new THREE.CircleGeometry(0.11, 24), std(0xff2d8f, 0.3, 0, { emissive: 0xff2d8f, emissiveIntensity: 0.4 }), g, 0, 0.24, 0);
			iris.position.addScaledVector(TOWARD, 0.235);
			faceCam(iris);
			const pupil = mesh(new THREE.CircleGeometry(0.05, 20), MAT.black, g, 0, 0.24, 0);
			pupil.position.addScaledVector(TOWARD, 0.238);
			faceCam(pupil);
		},
		tentacle(g, mat) {
			const pts = [];
			for (let n = 0; n <= 16; n++) {
				const a = n * 0.42, r = 0.3 - n * 0.016;
				pts.push(new THREE.Vector3(Math.cos(a) * r, 0.08 + n * 0.012, Math.sin(a) * r));
			}
			const curve = new THREE.CatmullRomCurve3(pts);
			const geo = new THREE.TubeGeometry(curve, 48, 0.075, 10);
			// (taper it: thinner towards the tip)
			const pos = geo.attributes.position;
			const tmp = new THREE.Vector3();
			for (let i = 0; i < pos.count; i++) {
				const k = Math.floor(i / 11) / 48;
				const c = curve.getPointAt(Math.min(1, k));
				tmp.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1 - k * 0.75).add(c);
				pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
			}
			geo.computeVertexNormals();
			mesh(geo, mat, g);
			for (let n = 1; n < 14; n += 2) mesh(SPH(0.026, 6), MAT.white, g, pts[n].x * 0.8, pts[n].y + 0.06, pts[n].z * 0.8);
		},
	};

	const itemCache = new Map();
	const keyOf = (item) => item.ing + ':' + item.steps.join(',') + (item.burnt ? ':burnt' : '');
	function buildItem(item) {
		const has = (k) => item.steps.includes(k);
		const ing = INGS[item.ing];
		let colour = new THREE.Color(ing.colour);
		if (has('fry')) colour.lerp(new THREE.Color(0xc8892b), 0.65);
		if (has('grill')) colour.lerp(new THREE.Color(0x4a2410), 0.35);
		if (has('cryo')) colour.lerp(new THREE.Color(0xbfe8ff), 0.45);
		if (item.burnt) colour = new THREE.Color(0x120e0c);
		const mat = std(colour, has('cryo') || has('fry') ? 0.25 : 0.45, 0.05);
		mat.emissive.copy(colour).lerp(new THREE.Color(0xffffff), 0.15);   // (a faint glow of its own colour, so food reads in the dark)
		mat.emissiveIntensity = 0.35;
		if (has('inject')) { mat.emissive.set(0xb03aff); mat.emissiveIntensity = 0.45; }
		if (has('warp')) { mat.emissive.set(0x1ad8ff); mat.emissiveIntensity = 0.55; }
		if (item.burnt) { mat.emissive.set(0x3a1000); mat.emissiveIntensity = 0.4; mat.roughness = 0.95; }
		const glow = glowMat(item.burnt ? 0x2a1a10 : ing.glow, 1.8);
		const root = new THREE.Group();
		const inner = new THREE.Group();
		root.add(inner);
		const pieces = has('chop') ? [[-0.2, 0, 0.08, 0.6, -0.4], [0.2, 0, 0.1, 0.6, 0.7], [0, 0.02, -0.16, 0.6, 2]] : [[0, 0, 0, 1, 0]];
		for (const [x, y, z, s, r] of pieces) {
			const g = new THREE.Group();
			g.position.set(x, y, z);
			g.scale.setScalar(s);
			g.rotation.y = r;
			ING_3D[item.ing](g, mat, glow);
			inner.add(g);
		}
		if (has('grill') && !item.burnt) for (let n = -1; n <= 1; n++) {
			const st = mesh(BOX(0.5, 0.015, 0.035), MAT.black, inner, 0, item.ing === 'eye' ? 0.47 : 0.27, n * 0.12);
			st.rotation.y = 0.5;
		}
		if (has('stir')) {
			mesh(CYL(0.44, 0.3, 0.22, 24, true), std(0x5a6360, 0.35, 0.7, { side: THREE.DoubleSide }), root, 0, 0.11, 0);
			mesh(CYL(0.3, 0.3, 0.02, 24), std(0x5a6360, 0.35, 0.7), root, 0, 0.01, 0);
			const s = mesh(new THREE.CircleGeometry(0.41, 24), std(0x5aa82a, 0.15, 0, { emissive: 0x6aff2a, emissiveIntensity: 0.4 }), root, 0, 0.18, 0);
			s.rotation.x = -Math.PI / 2;
			inner.position.y = 0.1;
			inner.scale.setScalar(0.8);
		}
		if (has('press')) {
			inner.scale.multiplyScalar(0.6);
			const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.52, 0.52, 0.52)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xe9ff4a).multiplyScalar(2) }));
			cage.position.y = 0.26;
			root.add(cage);
		}
		if (has('inject') && !item.burnt) {
			mesh(SPH(0.09, 14), MAT.white, root, 0.17, 0.36, 0.06);
			mesh(SPH(0.045, 10), glowMat(0xd04dff, 1.6), root, 0.17, 0.36, 0.06).position.addScaledVector(TOWARD, 0.07);
		}
		if (has('cryo')) {
			mesh(BOX(0.66, 0.56, 0.66), std(0xcff0ff, 0.05, 0.1, { transparent: true, opacity: 0.38, depthWrite: false }), root, 0, 0.28, 0);
			const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.66, 0.56, 0.66)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xdff6ff).multiplyScalar(1.6) }));
			edge.position.y = 0.28;
			root.add(edge);
		}
		if (has('fry') && !item.burnt) for (let n = 0; n < 7; n++) mesh(SPH(0.025, 6), std(0xe8b04a, 0.6, 0), root, Math.cos(n * 2.1) * 0.28, 0.02, Math.sin(n * 2.7) * 0.25);
		root.userData = { warp: has('warp'), burnt: item.burnt };   // (its first child is the food itself)
		return shadows(root);
	}
	function itemView(item) {
		const key = keyOf(item);
		if (!itemCache.has(key)) itemCache.set(key, buildItem(item));
		const v = itemCache.get(key).clone();
		v.userData = Object.assign({}, itemCache.get(key).userData, { key });
		return v;
	}
	// keep a holder's item on show: holder.view follows holder's item; views not touched this frame go
	const itemsLive = new Set();
	function syncItem(holder, item, parent, x, y, z, s) {
		const key = item ? keyOf(item) : '';
		if (holder.view && (holder.viewKey !== key || holder.view.parent !== parent)) { holder.view.removeFromParent(); holder.view = null; }
		holder.viewKey = key;
		if (!item) return null;
		if (!holder.view) { holder.view = itemView(item); parent.add(holder.view); }
		holder.view.position.set(x, y, z);
		holder.view.scale.setScalar(s || 1);
		itemsLive.add(holder.view);
		return holder.view;
	}
	const itemViews = () => { const all = []; for (const g of sets) g.traverse((o) => { if (o.userData && o.userData.key) all.push(o); }); return all; };

	/* ---------- 3D: the mutants ---------- */

	function eyeBall(g, x, y, z, r, mats) {
		const w = std(0xf4f2ea, 0.3, 0);
		mesh(SPH(r, 16), w, g, x, y, z);
		const pupil = mesh(SPH(r * 0.5, 12), MAT.black, g, x, y, z);
		pupil.position.addScaledVector(TOWARD, r * 0.62);
		if (mats) mats.push(w);
		return pupil;
	}

	const MUTANT_3D = {
		blob(g, skin, m) {
			const body = mesh(SPH(0.95, 28), skin, g, 0, 0.75, 0);
			body.scale.set(1.25, 0.85, 1);
			m.heads = [];
			for (const x of [-0.5, 0.5]) {
				const h = new THREE.Group();
				h.position.set(x, 1.75, 0);
				g.add(h);
				mesh(SPH(0.46, 24), skin, h);
				eyeBall(h, -0.16, 0.08, 0.36, 0.11);
				eyeBall(h, 0.16, 0.08, 0.36, 0.11);
				mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16, Math.PI), MAT.black, h, 0, -0.14, 0.42).rotation.z = Math.PI;
				m.heads.push(h);
			}
			for (const [x, y] of [[-0.4, 0.8], [0.3, 0.5], [0.6, 1.0]]) mesh(SPH(0.09, 10), glowMat(0xb8ff6a, 1.5), g, x, y, 0.85);
		},
		cyclops(g, skin) {
			mesh(CYL(0.5, 0.62, 1.15, 24), std(0x6a4ad0, 0.4, 0.1), g, 0, 0.58, 0);
			mesh(BOX(0.12, 0.6, 0.05), std(0xe0d8c8, 0.6, 0), g, 0, 0.85, 0.55);
			mesh(SPH(0.58, 28), skin, g, 0, 1.65, 0);
			eyeBall(g, 0, 1.72, 0.42, 0.28);
			const mono = mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 28), std(0xe9c04a, 0.2, 1), g, 0, 1.72, 0.45);
			faceCam(mono);
			mesh(CYL(0.3, 0.3, 0.55, 24), std(0x111111, 0.4, 0.2), g, 0, 2.42, -0.05);
			mesh(CYL(0.5, 0.5, 0.05, 24), std(0x111111, 0.4, 0.2), g, 0, 2.15, -0.05);
			mesh(CYL(0.31, 0.31, 0.08, 24), std(0x8a1a2a, 0.5, 0), g, 0, 2.2, -0.05);
		},
		mold(g, skin) {
			const rnd = seeded(7);
			const dark = skin.clone();
			dark.color.multiplyScalar(0.7);
			for (let n = 0; n < 11; n++) mesh(SPH(0.38 + rnd() * 0.18, 18), n % 2 ? skin : dark, g, (rnd() - 0.5) * 1.4, 0.5 + rnd() * 1.6, (rnd() - 0.5) * 0.5);
			for (const [x, y, r] of [[-0.4, 1.6, 0.1], [0.05, 1.9, 0.14], [0.4, 1.5, 0.09], [0.55, 1.95, 0.08], [-0.1, 1.2, 0.08], [-0.55, 1.05, 0.07]]) eyeBall(g, x, y, 0.55, r);
			for (let n = 0; n < 8; n++) mesh(SPH(0.04, 6), glowMat(0xe9ff4a, 1.3), g, (rnd() - 0.5) * 1.4, 0.6 + rnd() * 1.5, 0.6);
		},
		pigeon(g, skin, m) {
			const suit = std(0x3a5ad0, 0.45, 0.05);
			const body = mesh(SPH(0.7, 24), suit, g, 0, 0.75, 0);
			body.scale.set(0.9, 1.05, 0.8);
			mesh(BOX(0.12, 0.55, 0.05), std(0xc02a2a, 0.5, 0), g, 0, 0.95, 0.56).rotation.x = -0.1;
			const head = new THREE.Group();
			head.position.set(0, 1.75, 0.05);
			g.add(head);
			mesh(SPH(0.4, 22), skin, head);
			const neck = mesh(CYL(0.3, 0.36, 0.3, 18), std(0x4ab09a, 0.25, 0.6), head, 0, -0.38, 0);
			neck.castShadow = false;
			eyeBall(head, -0.2, 0.08, 0.3, 0.1);
			eyeBall(head, 0.2, 0.08, 0.3, 0.1);
			const beak = mesh(new THREE.ConeGeometry(0.1, 0.3, 12), std(0xe8a83c, 0.4, 0), head, 0, -0.04, 0.48);
			beak.rotation.x = Math.PI / 2;
			mesh(CYL(0.22, 0.22, 0.04, 20), std(0x111111, 0.5, 0), head, 0, 0.42, 0);
			mesh(CYL(0.14, 0.14, 0.3, 20), std(0x111111, 0.5, 0), head, 0, 0.58, 0);
			m.head = head;
		},
		skull(g, skin) {
			mesh(BOX(1.15, 1.0, 0.75), std(0xff9a3a, 0.3, 0.2), g, 0, 0.55, 0);
			for (const x of [-0.35, 0, 0.35]) mesh(SPH(0.07, 10), glowMat(x ? 0xff4a32 : 0x9dff3a, 2), g, x, 0.75, 0.39);
			for (const x of [-0.72, 0.72]) limb(g, [x, 0.9, 0], [x * 1.2, 0.3, 0.3], 0.08, MAT.steel);
			mesh(SPH(0.58, 28), MAT.glass, g, 0, 1.55, 0);
			mesh(SPH(0.38, 24), skin, g, 0, 1.5, 0);
			for (const x of [-0.13, 0.13]) {
				const s = mesh(SPH(0.1, 12), MAT.black, g, x, 1.55, 0);
				s.position.addScaledVector(TOWARD, 0.31);
				const glint = mesh(SPH(0.035, 8), glowMat(0x9dff3a, 2.2), g, x, 1.55, 0);
				glint.position.addScaledVector(TOWARD, 0.4);
			}
			for (let n = -2; n <= 2; n++) mesh(BOX(0.05, 0.07, 0.03), MAT.white, g, n * 0.06, 1.3, 0.33);
		},
		squid(g, skin, m) {
			m.arms = [];
			for (let n = -3; n <= 3; n++) {
				const arm = new THREE.Group();
				arm.position.set(n * 0.16, 0.95, 0.1);
				g.add(arm);
				limb(arm, [0, 0, 0], [n * 0.08, -0.5, 0.2], 0.1, skin);
				limb(arm, [n * 0.08, -0.5, 0.2], [n * 0.18, -0.95, 0.35], 0.07, skin);
				m.arms.push(arm);
			}
			const head = mesh(SPH(0.7, 28), skin, g, 0, 1.6, 0);
			head.scale.set(0.95, 1.2, 0.9);
			eyeBall(g, -0.24, 1.6, 0.52, 0.13);
			eyeBall(g, 0.24, 1.6, 0.52, 0.13);
			for (const [x, z] of [[-0.3, 0], [0, -0.1], [0.3, 0]]) {
				const c = mesh(CYL(0.1, 0.1, 0.24, 14), std(0x7ad8ff, 0.4, 0.1), g, x, 2.42, z);
				c.rotation.z = Math.PI / 2;
			}
			mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16, Math.PI), std(0xc02a6a, 0.4, 0), g, 0, 1.25, 0.58).rotation.z = Math.PI;
		},
		fungus(g, skin) {
			mesh(CYL(0.34, 0.42, 1.3, 22), MAT.cream, g, 0, 0.65, 0);
			const cap = mesh(new THREE.SphereGeometry(0.95, 30, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, g, 0, 1.3, 0);
			cap.scale.set(1, 0.7, 1);
			mesh(new THREE.CircleGeometry(0.95, 30), std(0xd8c8a8, 0.8, 0, { side: THREE.DoubleSide }), g, 0, 1.3, 0).rotation.x = Math.PI / 2;
			for (const [x, y, z] of [[-0.45, 1.6, 0.45], [0.2, 1.88, 0.3], [0.6, 1.55, 0.3], [-0.1, 1.75, -0.4]]) mesh(SPH(0.13, 12), MAT.white, g, x, y, z);
			const shades = mesh(BOX(0.62, 0.13, 0.06), std(0x080808, 0.05, 0.9), g, 0, 1.0, 0.36);
			shades.rotation.x = -0.2;
			mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14, Math.PI), MAT.black, g, 0, 0.75, 0.38).rotation.z = Math.PI;
		},
		overlord(g, skin, m) {
			mesh(CYL(0.75, 0.95, 1.4, 28), std(0x7a3ad0, 0.35, 0.2), g, 0, 0.7, 0);
			for (const x of [-0.8, 0.8]) mesh(SPH(0.35, 16), std(0xe9c04a, 0.25, 1), g, x, 1.35, 0);
			const brain = mesh(SPH(0.85, 32), std(0xe88aa8, 0.35, 0, { emissive: 0x501030, emissiveIntensity: 0.3 }), g, 0, 2.05, 0);
			brain.scale.set(1.1, 0.85, 0.95);
			for (let n = 0; n < 6; n++) {
				const fold = mesh(new THREE.TorusGeometry(0.75 - Math.abs(n - 2.5) * 0.08, 0.035, 6, 30, Math.PI), std(0xb05a78, 0.4, 0), g, (n - 2.5) * 0.15, 2.05, 0);
				fold.rotation.y = Math.PI / 2;
			}
			eyeBall(g, -0.3, 1.75, 0.62, 0.16);
			eyeBall(g, 0.3, 1.75, 0.62, 0.16);
			const crown = new THREE.Group();
			crown.position.set(0, 2.7, 0);
			g.add(crown);
			mesh(CYL(0.55, 0.6, 0.2, 28, true), std(0xe9c04a, 0.2, 1, { side: THREE.DoubleSide }), crown);
			for (let n = 0; n < 7; n++) {
				const a = n / 7 * Math.PI * 2;
				mesh(new THREE.ConeGeometry(0.08, 0.3, 8), std(0xe9c04a, 0.2, 1), crown, Math.sin(a) * 0.55, 0.22, Math.cos(a) * 0.55);
			}
			mesh(SPH(0.09, 10), glowMat(0xff2d8f, 2), crown, 0, 0.1, 0.6);
			m.crown = crown;
		},
	};

	function buildMutant(type) {
		const g = new THREE.Group();
		const skin = std(type.skin, 0.45, 0.05);
		const m = { g, skin };
		MUTANT_3D[type.id](g, skin, m);
		shadows(g);
		return m;
	}

	/* ---------- 3D: the cyborg cooks ---------- */

	const TOOL_3D = {
		whisk(g) {
			mesh(CYL(0.025, 0.025, 0.14, 8), MAT.steel, g, 0, -0.07, 0);
			for (const r of [0, 1, 2]) {
				const loop = mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 18), MAT.steel, g, 0, -0.22, 0);
				loop.scale.set(1, 1.7, 1);
				loop.rotation.y = r * Math.PI / 3;
			}
		},
		cleaver(g) { mesh(CYL(0.025, 0.025, 0.1, 8), MAT.wood, g, 0, -0.05, 0); mesh(BOX(0.04, 0.24, 0.2), MAT.steel, g, 0, -0.2, 0.05); },
		spatula(g) { mesh(CYL(0.02, 0.02, 0.18, 8), MAT.steel, g, 0, -0.09, 0); mesh(BOX(0.18, 0.2, 0.02), MAT.steel, g, 0, -0.27, 0); },
		ladle(g) { mesh(CYL(0.02, 0.02, 0.22, 8), MAT.steel, g, 0, -0.11, 0); mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xb4bcba, 0.25, 0.9, { side: THREE.DoubleSide }), g, 0, -0.24, 0); },
		tongs(g) { limb(g, [0, 0, 0], [-0.05, -0.3, 0], 0.015, MAT.steel); limb(g, [0, 0, 0], [0.05, -0.3, 0], 0.015, MAT.steel); },
		drill(g, col) {
			mesh(BOX(0.12, 0.12, 0.12), std(col, 0.4, 0.3), g, 0, -0.06, 0);
			const bit = mesh(new THREE.ConeGeometry(0.05, 0.22, 10), MAT.steel, g, 0, -0.23, 0);
			bit.rotation.x = Math.PI;
			g.userData.spin = bit;
		},
		cutter(g) { mesh(CYL(0.02, 0.02, 0.1, 8), MAT.steel, g, 0, -0.05, 0); mesh(CYL(0.11, 0.11, 0.02, 20), MAT.steel, g, 0, -0.18, 0).rotation.z = Math.PI / 2; },
		grater(g) { mesh(BOX(0.14, 0.26, 0.06), MAT.steel, g, 0, -0.15, 0); },
		fork(g) {
			mesh(CYL(0.02, 0.02, 0.16, 8), MAT.steel, g, 0, -0.08, 0);
			mesh(BOX(0.14, 0.02, 0.02), MAT.steel, g, 0, -0.16, 0);
			for (const x of [-0.06, 0, 0.06]) mesh(BOX(0.015, 0.14, 0.015), MAT.steel, g, x, -0.23, 0);
		},
	};

	function buildChef(n) {
		const look = COOKS[n % COOKS.length];
		const col = new THREE.Color(colourOf(n));
		const g = new THREE.Group();
		const skin = std(look.skin, 0.55, 0);
		const metal = std(0xd8e0ea, 0.2, 0.85);
		const dark = std(0xf6f4fb, 0.3, 0.05, { clearcoat: 0.7 });
		const apron = std(col, 0.5, 0.05, { emissive: col, emissiveIntensity: 0.12, side: THREE.DoubleSide });
		const glow = glowMat(col, 2.4);
		const parts = { g, legs: new THREE.Group() };
		g.add(parts.legs);
		// legs: 0 to 0.55
		const L = parts.legs;
		if (look.legs === 'treads') {
			mesh(BOX(0.62, 0.18, 0.36), MAT.rubber, L, 0, 0.09, 0);
			for (const x of [-0.22, 0, 0.22]) mesh(CYL(0.08, 0.08, 0.38, 12), metal, L, x, 0.09, 0).rotation.x = Math.PI / 2;
			mesh(CYL(0.08, 0.1, 0.4, 12), metal, L, 0, 0.38, 0);
		} else if (look.legs === 'pogo') {
			limb(L, [-0.13, 0.55, 0], [-0.13, 0.04, 0.02], 0.08, std(0x2a3a5a, 0.7, 0));
			mesh(BOX(0.16, 0.08, 0.26), MAT.rubber, L, -0.13, 0.04, 0.06);
			for (let k = 0; k < 6; k++) mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14), metal, L, 0.14, 0.08 + k * 0.075, 0).rotation.x = Math.PI / 2;
			mesh(CYL(0.1, 0.1, 0.03, 14), metal, L, 0.14, 0.02, 0);
		} else if (look.legs === 'wheel') {
			mesh(CYL(0.07, 0.07, 0.4, 12), metal, L, 0, 0.42, 0);
			mesh(CYL(0.22, 0.22, 0.12, 22), MAT.rubber, L, 0, 0.22, 0).rotation.z = Math.PI / 2;
			mesh(CYL(0.1, 0.1, 0.14, 14), metal, L, 0, 0.22, 0).rotation.z = Math.PI / 2;
		} else if (look.legs === 'spider') {
			for (const s of [-1, 1]) for (const z of [-0.12, 0.12]) {
				limb(L, [s * 0.08, 0.5, z], [s * 0.32, 0.38, z * 2], 0.025, metal);
				limb(L, [s * 0.32, 0.38, z * 2], [s * 0.4, 0.0, z * 2.5], 0.02, metal);
			}
		} else if (look.legs === 'chicken') {
			for (const s of [-1, 1]) {
				limb(L, [s * 0.12, 0.55, 0], [s * 0.15, 0.3, -0.1], 0.045, metal);
				limb(L, [s * 0.15, 0.3, -0.1], [s * 0.12, 0.03, 0.02], 0.035, metal);
				for (const a of [-0.5, 0, 0.5]) limb(L, [s * 0.12, 0.03, 0.02], [s * 0.12 + Math.sin(a) * 0.14, 0.01, 0.02 + Math.cos(a) * 0.14], 0.015, metal);
			}
		} else {   // a jet
			const cone = mesh(new THREE.ConeGeometry(0.22, 0.42, 16), metal, L, 0, 0.36, 0);
			cone.rotation.x = Math.PI;
			parts.flame = mesh(new THREE.ConeGeometry(0.13, 0.4, 12), glowMat(0xffa21a, 2.5, { transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), L, 0, 0.0, 0);
			parts.flame.rotation.x = Math.PI;
		}
		// the body
		const body = new THREE.Group();
		body.position.y = 0.55;
		g.add(body);
		parts.body = body;
		mesh(new THREE.CapsuleGeometry(0.3, 0.4, 6, 18), dark, body, 0, 0.42, 0);
		mesh(new THREE.CylinderGeometry(0.315, 0.335, 0.52, 22, 1, true, -1.25, 2.5), apron, body, 0, 0.3, 0);
		mesh(CYL(0.04, 0.04, 0.66, 8), std(col, 0.5, 0), body, 0, 0.6, 0).rotation.z = Math.PI / 2;
		// the gadget belly, glowing through the apron
		const bz = 0.33;
		if (look.belly === 'fryer') {
			mesh(BOX(0.3, 0.2, 0.05), MAT.black, body, 0, 0.33, bz);
			mesh(new THREE.PlaneGeometry(0.24, 0.12), glowMat(0xffb21a, 2), body, 0, 0.33, bz + 0.03);
		} else if (look.belly === 'micro') {
			mesh(BOX(0.32, 0.2, 0.05), MAT.black, body, 0, 0.33, bz);
			mesh(new THREE.PlaneGeometry(0.2, 0.12), glowMat(0x9dff3a, 1.8), body, -0.04, 0.33, bz + 0.03);
		} else if (look.belly === 'blender') {
			mesh(CYL(0.09, 0.09, 0.24, 14), MAT.glass, body, 0, 0.35, bz);
			parts.blend = mesh(CYL(0.07, 0.07, 0.14, 12), glowMat(0xe9ff4a, 1.5), body, 0, 0.31, bz);
		} else if (look.belly === 'toaster') {
			mesh(BOX(0.3, 0.2, 0.08), metal, body, 0, 0.33, bz);
			for (const x of [-0.07, 0.07]) mesh(BOX(0.08, 0.02, 0.06), glowMat(0xff6a1a, 1.6), body, x, 0.43, bz);
			parts.toast = mesh(BOX(0.07, 0.08, 0.05), std(0xc8892b, 0.8, 0), body, -0.07, 0.44, bz);
		} else {
			mesh(BOX(0.3, 0.2, 0.05), MAT.black, body, 0, 0.33, bz);
			for (const x of [-0.09, -0.03, 0.03, 0.09]) mesh(BOX(0.02, 0.16, 0.02), glowMat(0xff8a2a, 2), body, x, 0.33, bz + 0.03);
		}
		// arms, from the shoulders, each ending in its tool
		const arm = (side, tool) => {
			const pivot = new THREE.Group();
			pivot.position.set(side * 0.37, 0.72, 0);
			body.add(pivot);
			mesh(SPH(0.09, 12), metal, pivot);
			mesh(CYL(0.065, 0.06, 0.5, 10), side < 0 ? skin : metal, pivot, 0, -0.26, 0);
			const t = new THREE.Group();
			t.position.y = -0.52;
			pivot.add(t);
			TOOL_3D[tool](t, col);
			return pivot;
		};
		parts.armL = arm(-1, look.arms[0]);
		parts.armR = arm(1, look.arms[1]);
		// the head
		const head = new THREE.Group();
		head.position.y = 1.1;
		body.add(head);
		parts.head = head;
		mesh(CYL(0.08, 0.1, 0.12, 12), metal, head, 0, -0.2, 0);
		mesh(SPH(0.24, 22), skin, head);
		const eye = (x, y) => mesh(SPH(0.035, 8), MAT.black, head, x, y, 0.22);
		const cyber = (x, y) => mesh(SPH(0.055, 12), glow, head, x, y, 0.2);
		const hat = (mat) => {
			mesh(CYL(0.18, 0.2, 0.14, 18), mat, head, 0, 0.26, 0);
			for (const [x, z, r] of [[-0.1, 0, 0.12], [0.1, 0, 0.12], [0, 0.06, 0.13], [0, -0.08, 0.12]]) mesh(SPH(r, 14), mat, head, x, 0.38, z);
		};
		if (look.head === 'bolts') {
			mesh(new THREE.SphereGeometry(0.245, 18, 12, Math.PI / 2, Math.PI), metal, head);
			cyber(0.09, 0.03);
			eye(-0.09, 0.03);
			for (const y of [0.1, -0.06]) mesh(CYL(0.025, 0.025, 0.04, 8), MAT.darkSteel, head, 0.23, y, 0.04).rotation.z = Math.PI / 2;
			hat(MAT.white);
		} else if (look.head === 'mohawk') {
			for (let k = -2; k <= 2; k++) mesh(new THREE.ConeGeometry(0.05, 0.22 - Math.abs(k) * 0.03, 8), std(col, 0.5, 0), head, 0, 0.27, k * 0.07);
			for (const x of [-0.09, 0.09]) {
				mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 16), MAT.black, head, x, 0.04, 0.21);
				mesh(new THREE.CircleGeometry(0.05, 14), glowMat(0x3af2ff, 1.8), head, x, 0.04, 0.215);
			}
			mesh(BOX(0.5, 0.03, 0.03), MAT.black, head, 0, 0.04, 0.18);
		} else if (look.head === 'dome') {
			mesh(BOX(0.4, 0.07, 0.06), glow, head, 0, 0.03, 0.2);
			hat(metal);
		} else if (look.head === 'brain') {
			mesh(SPH(0.2, 18), MAT.glass, head, 0, 0.24, 0);
			mesh(SPH(0.15, 16), std(0xe88aa8, 0.4, 0, { emissive: 0x501030, emissiveIntensity: 0.4 }), head, 0, 0.22, 0);
			eye(-0.09, 0.02);
			cyber(0.09, 0.02);
		} else if (look.head === 'beard') {
			const beard = mesh(new THREE.ConeGeometry(0.2, 0.3, 14), std(0x5a5a5a, 0.9, 0), head, 0, -0.18, 0.1);
			beard.rotation.x = Math.PI;
			mesh(BOX(0.14, 0.16, 0.05), metal, head, 0.1, 0.04, 0.2);
			cyber(0.1, 0.04);
			eye(-0.09, 0.04);
			hat(MAT.white);
		} else {
			limb(head, [0, 0.22, 0], [0.05, 0.5, 0], 0.012, metal);
			mesh(SPH(0.05, 10), glow, head, 0.05, 0.52, 0);
			for (const s of [-1, 1]) mesh(SPH(0.09, 12), std(0x5a3a2a, 0.8, 0), head, s * 0.25, 0.02, -0.04);
			eye(-0.08, 0.03);
			eye(0.08, 0.03);
		}
		parts.hold = new THREE.Group();
		parts.hold.position.y = 2.2;
		g.add(parts.hold);
		parts.tools = [];
		g.traverse((o) => { if (o.userData && o.userData.spin) parts.tools.push(o.userData.spin); });
		shadows(g);
		g.scale.setScalar(1.1);
		return parts;
	}

	/* ---------- 3D: portals, the manager, particles ---------- */

	function buildPortal() {
		const g = new THREE.Group();
		const face = new THREE.Group();
		face.rotation.x = -PITCH;
		g.add(face);
		const disc = mesh(new THREE.CircleGeometry(0.6, 40), glowMat(0xffffff, 0.9, { map: TEX.swirl, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), face);
		const r1 = mesh(new THREE.TorusGeometry(0.64, 0.06, 10, 48), glowMat(0x3af2ff, 2.4), face);
		const r2 = mesh(new THREE.TorusGeometry(0.74, 0.03, 8, 48), glowMat(0xff2d8f, 2.4), face);
		const hold = new THREE.Group();
		g.add(hold);
		return { g, disc, r1, r2, hold };
	}

	const manager = (function () {
		const g = new THREE.Group();
		sets[1].add(g);
		mesh(CYL(0.06, 0.06, 6, 10), MAT.black, g, 0, 3.7, -0.2);
		mesh(BOX(2.1, 1.55, 1.3), std(0x5a605c, 0.45, 0.6), g, 0, 0, 0);
		mesh(BOX(1.9, 1.3, 0.06), MAT.black, g, 0, 0, 0.66);
		mesh(new THREE.PlaneGeometry(1.75, 1.18), glowMat(0xffffff, 1.6, { map: TEX.crt }), g, 0, 0, 0.7);
		for (const x of [-0.5, 0.5]) limb(g, [x, 0.77, 0], [x * 1.6, 1.4, 0], 0.025, MAT.steel);
		mesh(SPH(0.07, 10), glowMat(0xff2d8f, 2), g, -0.8, 1.42, 0);
		mesh(SPH(0.07, 10), glowMat(0x9dff3a, 2), g, 0.8, 1.42, 0);
		g.visible = false;
		return shadows(g);
	})();

	const parts3 = [];
	function puff(wall, x, y, z, o) {
		let p = parts3.find((q) => !q.alive);
		if (!p) {
			if (parts3.length >= 260) return;
			p = { s: new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, transparent: true, depthWrite: false })) };
			parts3.push(p);
		}
		Object.assign(p, { alive: true, age: 0, life: o.life || 1, vx: o.vx || 0, vy: o.vy === undefined ? 0.6 : o.vy, vz: o.vz || 0, s0: o.size || 0.3, s1: o.grow || (o.size || 0.3) * 2.2, a: o.alpha || 0.6 });
		p.s.material.color.set(o.color || 0x777777);
		if (o.glow) p.s.material.color.multiplyScalar(o.glow);
		p.s.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending;
		p.s.position.set(x, y, z);
		p.s.visible = true;
		sets[wall].add(p.s);
	}
	function stepPuffs(dt) {
		for (const p of parts3) {
			if (!p.alive) continue;
			p.age += dt;
			const k = p.age / p.life;
			if (k >= 1) { p.alive = false; p.s.visible = false; continue; }
			p.s.position.x += p.vx * dt;
			p.s.position.y += p.vy * dt;
			p.s.position.z += p.vz * dt;
			p.s.scale.setScalar(lerp(p.s0, p.s1, k));
			p.s.material.opacity = p.a * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
		}
	}
	const rates = {};
	// fn() about `per` times a second
	function every(key, per, dt, fn) {
		rates[key] = (rates[key] || Math.random()) + dt * per;
		while (rates[key] >= 1) { rates[key] -= 1; fn(); }
	}
	const rnd1 = () => Math.random() - 0.5;
	const smoke = (w, x, y, z, k = 1) => puff(w, x + rnd1() * 0.4, y, z + rnd1() * 0.3, { color: 0xc8c0d8, size: 0.3 * k, grow: 1.1 * k, life: 2.2, vy: 0.7, vx: rnd1() * 0.2, alpha: 0.45 });

	/* ---------- 3D: every frame ---------- */

	const chefs3 = [];
	let introT = 0;
	let rt = 0;   // (real time, for what moves whatever the game's doing)

	function update3D(dt) {
		itemsLive.clear();
		for (const f of fans) f.rotation.z -= dt * 7;
		for (const s of signs) {
			const flick = Math.sin(rt * 23 + s.seed * 5) > -0.94 && Math.sin(rt * 2.7 + s.seed) > -0.97;
			s.m.material.color.setScalar(flick ? s.k : 0.25);
		}

		// the stations
		for (const s of stations) {
			const p = station3d[s.kind];
			const w = s.wall, cx = s.sx, cz = s.sz;
			const hot = s.state === 'work' || s.state === 'done';
			const k = s.kind;
			if (k === 'chop') p.cleaver.rotation.z = lerp(-0.95, 0.03, s.hit);
			else if (k === 'fry') {
				p.oilMat.emissiveIntensity = s.item ? (s.state === 'burnt' ? 0.15 : 0.9 + Math.sin(rt * 9) * 0.1) : 0.25;
				p.light.intensity = s.item && s.state !== 'burnt' ? 5 : 0;
				p.display.material.color.set(s.state === 'burnt' ? 0xff3020 : hot ? 0xffc21a : 0x333333).multiplyScalar(1.6);
				if (hot) every('fry', 14, dt, () => puff(w, cx + rnd1() * 1.6 * MS, ISLAND.y + MS * 0.95, cz + rnd1() * 0.8 * MS, { color: 0xfff0b0, size: 0.06, grow: 0.12, life: 0.5, vy: 0.5, glow: 1.5, add: true, alpha: 0.8 }));
				if (hot) every('fry-steam', 3, dt, () => smoke(w, cx, ISLAND.y + MS * 1.0, cz, 0.8));
			} else if (k === 'grill') {
				p.glow.color.set(0xff6a1a).multiplyScalar(s.item && s.state !== 'burnt' ? 1.8 + Math.sin(rt * 12) * 0.3 : 0.3);
				p.light.intensity = s.item && s.state !== 'burnt' ? 6 + Math.sin(rt * 17) * 1.5 : 0;
				if (s.state === 'work') {
					every('grill', 4, dt, () => smoke(w, cx, ISLAND.y + MS * 0.8, cz, 0.9));
					every('grill-spark', 8, dt, () => puff(w, cx + rnd1() * 2 * MS, ISLAND.y + MS * 0.6, cz + rnd1(), { color: 0xffa040, size: 0.05, grow: 0.03, life: 0.7, vy: 1.4, vx: rnd1(), glow: 2, add: true, alpha: 1 }));
				}
			} else if (k === 'stir') {
				p.paddle.rotation.z = Math.sin(s.paddle) * 0.45;
				p.paddle.rotation.x = Math.cos(s.paddle * 0.7) * 0.2;
				every('stir', s.item ? 6 : 1.5, dt, () => puff(w, cx + rnd1() * 1.3 * MS, ISLAND.y + MS * 0.92, cz + rnd1() * 0.9 * MS, { color: 0x9dff3a, size: 0.08, grow: 0.2, life: 0.6, vy: 0.2, glow: 1.4, add: true, alpha: 0.8 }));
			} else if (k === 'press') {
				const kk = s.state === 'work' ? s.prog : s.state === 'done' ? 1 : 0;
				const y = lerp(1.62, 0.78, kk) - s.hit * 0.12;
				p.plate.position.y = y;
				p.rod.position.y = (y + 1.86) / 2;
				p.rod.scale.y = 1.86 - y;
				p.beacon.material.color.set(0xe9ff4a).multiplyScalar(s.state === 'work' && Math.sin(rt * 10) > 0 ? 3 : 0.4);
			} else if (k === 'inject') {
				p.needle.position.y = s.state === 'work' ? 1.25 + Math.sin(rt * 4) * 0.05 : 1.55;
				p.fluid.emissiveIntensity = s.lock > 0 ? 2.5 : 0.9;
				every('inject', 4, dt, () => puff(w, cx + rnd1() * 0.9 * MS, ISLAND.y + MS * 0.3, cz + rnd1() * 0.6 * MS, { color: 0xe0a0ff, size: 0.05, grow: 0.08, life: 1.1, vy: 0.9, glow: 1.5, add: true, alpha: 0.8 }));
			} else if (k === 'warp') {
				const on = s.state === 'work';
				TEX.swirl.rotation = rt * (on ? 6 : 0.8);
				p.window.color.setScalar(on ? 2.4 : 0.55);
				p.light.intensity = on ? 7 : 0;
				p.dial.rotation.z = -rt * (on ? 8 : 0.3);
			} else if (k === 'cryo') {
				const on = s.state === 'work';
				p.light.intensity = on ? 5 : 0.5;
				p.nozzle.material.color.set(0x8fdcff).multiplyScalar(on ? 3 : 1.2);
				if (on) every('cryo', 22, dt, () => puff(w, cx + 0.55 + rnd1() * 0.2 * MS, ISLAND.y + MS * 1.25, cz - 0.1, { color: 0xd8f4ff, size: 0.12, grow: 0.5, life: 0.7, vx: -1.0 + rnd1() * 0.4 * MS, vy: -1.1, vz: 0.3, alpha: 0.55, glow: 1.3 }));
			}
			// the food in it
			const item = s.kind === 'warp' ? null : s.item;
			const v = syncItem(s, item, p.g, 0, ITEM_AT[k] + (s.state === 'done' ? 0.06 + Math.sin(rt * 5) * 0.05 : 0), 0, 1.3);
			if (v && k === 'fry' && s.state === 'work') v.position.y -= 0.12;
			if (v && k === 'press') v.scale.y = 1.3 * (1 - (s.state === 'work' ? s.prog : 1) * 0.35);
			if (s.state === 'burnt') every('burnt-' + k, 3, dt, () => smoke(w, cx, ISLAND.y + MS * 1.0, cz, 1.1));
			// fire
			p.fire.visible = s.fire > 0;
			if (s.fire > 0) {
				p.flames.forEach((f, n) => {
					const ph = rt * 9 + n * 1.7;
					f.scale.set(1, 0.8 + Math.sin(ph) * 0.35 + (n % 3) * 0.2, 1);
					f.position.y = 0.9 + f.scale.y * 0.3;
				});
				every('fire-' + k, 7, dt, () => smoke(w, cx, ISLAND.y + MS * 1.6, cz, 1.6));
				every('ember-' + k, 10, dt, () => puff(w, cx + rnd1() * 2 * MS, ISLAND.y + MS * 0.8, cz + rnd1(), { color: 0xffa040, size: 0.06, grow: 0.03, life: 1.0, vy: 1.8, vx: rnd1() * 0.6 * MS, glow: 2.2, add: true, alpha: 1 }));
			}
		}

		// the grabber's pods and the binner
		hatch3d.pods.forEach((pp, k) => {
			const pod = pods[k];
			pp.beam.material.opacity = pod ? pod.beam * 0.7 : 0;
			pp.rim.material.color.set(hatch.jam > 0 ? 0xffc21a : 0x9dff3a).multiplyScalar(hatch.jam > 0 && Math.sin(rt * 12) > 0 ? 0.4 : 1.8);
			if (!pod) return;
			const v = syncItem(pod, pod.ing ? { ing: pod.ing, steps: [], burnt: false } : null, sets[1], POD_X[k] + (hatch.shake ? rnd1() * 0.1 : 0), CT.y + 0.42 + Math.sin(rt * 2 + k) * 0.05, POD_Z[k], 0.95);
			if (v) v.rotation.y = rt * 0.8 + k;
		});
		hatch3d.swirl.rotation.z = -rt * 2.5;

		// the mutants
		const n = windowsNow();
		for (let k = 0; k < 4; k++) {
			const c = customers[k];
			if (!c) continue;
			if (!c.model) { c.model = buildMutant(c.type); sets[1].add(c.model.g); }
			const m = c.model;
			const x3 = lx3(c.x - W);
			const enter = c.state === 'leave' ? -Math.min(1, c.stateT / 0.7) * 4.2 : -(1 - Math.min(1, c.age / 0.5)) * 4.2;
			const panic = c.state === 'wait' && c.left / c.patience < 0.25;
			m.g.position.set(x3 + (panic ? Math.sin(rt * 45) * 0.04 : 0), enter + Math.sin(rt * 2 + c.seed) * 0.04, QUEUE_Z);
			const sq = c.state === 'eat' ? Math.sin(c.stateT * 12) * 0.06 : 0;
			const sc = Math.min(1.6, colW(n) * U / 1.6) * (c.recipe === FEAST ? 1.05 : 1);   // (big, to show over the counter)
			m.g.scale.set(sc * (1 + sq), sc * (1 - sq), sc);
			const angry = c.state === 'angry' || panic;
			m.skin.emissive.set(angry ? 0xff1a00 : c.state === 'eat' ? 0x40ff40 : 0x000000);
			m.skin.emissiveIntensity = angry ? 0.25 + Math.sin(rt * 10) * 0.15 : c.state === 'eat' ? 0.2 : 0;
			if (m.heads) m.heads.forEach((h, j) => { h.rotation.z = Math.sin(rt * 3 + j * 2) * 0.15; h.position.y = 1.75 + Math.sin(rt * 4 + j * 2) * 0.05; });
			if (m.head) { m.head.position.z = 0.05 + Math.max(0, Math.sin(rt * 6)) * 0.12; }
			if (m.arms) m.arms.forEach((a, j) => { a.rotation.z = Math.sin(rt * 3 + j) * 0.25; a.rotation.x = Math.cos(rt * 2.4 + j) * 0.2; });
			if (m.crown) m.crown.rotation.y = rt * 0.6;
			// what's been handed over so far, on the counter in front of them
			c.parts.forEach((part, j) => {
				const off = (j - (c.parts.length - 1) / 2) * 0.6;
				syncItem(part, part.filled && c.state !== 'leave' ? part.item : null, sets[1], x3 + off, CT.y + 0.05, CT.z + 0.35, 0.6);
			});
		}
		// (mutants gone: their models go too)
		for (const o of sets[1].children.slice()) if (o.userData.mutant && !customers.some((c) => c && c.model && c.model.g === o)) o.removeFromParent();
		for (const c of customers) if (c && c.model) c.model.g.userData.mutant = true;

		// the cooks: one on every wall for every player, risen into view on the walls they're near
		for (let i = 0; i < count; i++) {
			const c = chefs[i];
			if (!chefs3[i]) chefs3[i] = [0, 1, 2].map((w) => { const m = buildChef(i); sets[w].add(m.g); m.holder = {}; return m; });
			const p = latest[i];
			const wp = p ? wallsOf(p) : null;
			const time = t + (c.bob || 0);
			for (let w = 0; w < 3; w++) {
				const m = chefs3[i][w];
				const dist = wp ? clamp(wp.dist[w], 0, 1) : 1;
				const along = wp ? clamp(wp.along[w], 0, 1) : 0.5;
				// (risen, 1, at the wall; gone, 0, once they've walked away from it)
				const rise = 1 - clamp((dist - SHOW.full) / (SHOW.gone - SHOW.full), 0, 1);
				m.rise = lerp(m.rise || 0, rise, 1 - Math.exp(-dt * 10));
				const tx = lx3(along * W);
				// (tracking arrives about 20 times a second; glide between its updates rather than jump)
				const k = 1 - Math.exp(-dt * 24);
				const px = m.x === undefined ? tx : m.x;
				m.x = m.x === undefined ? tx : lerp(m.x, tx, k);
				m.vx = lerp(m.vx || 0, (m.x - px) / Math.max(dt, 0.001), 1 - Math.exp(-dt * 6));
				m.g.visible = m.rise > 0.02;
				if (!m.g.visible) continue;
				m.g.position.set(m.x, -(1 - m.rise) * 2.8, STAND_Z);
				// facing the counter, back to us, turned a little the way they're walking
				m.yaw = lerp(m.yaw === undefined ? Math.PI : m.yaw, Math.PI - clamp(m.vx * 0.12, -0.6, 0.6), Math.min(1, dt * 6));
				m.g.rotation.y = m.yaw;
				const walking = c.speed > 0.05;
				m.body.position.y = 0.55 + Math.abs(Math.sin(time * (walking ? 12 : 2))) * (walking ? 0.06 : 0.015) + (m.flame ? 0.1 + Math.sin(time * 3) * 0.04 : 0);
				if (m.flame) m.flame.scale.y = 0.8 + Math.sin(rt * 40) * 0.25;
				// the arms, acting out the last tap (or the device they're working by being there)
				let L = Math.sin(time * 2) * 0.1, R = -L;
				if (c.held) L = R = -2.75;
				const s = c.station && c.station.wall === w && c.station.state === 'work' ? c.station : null;
				if (s && s.kind === 'stir') { L = -1.3 + Math.sin(time * 8) * 0.45; R = -1.3 + Math.cos(time * 8) * 0.45; }
				else if (s && s.kind === 'cryo') { L = R = -1.45; }
				const a = c.act;
				if (a) {
					const u = clamp(a.t / ACT_TIME, 0, 1), pulse = Math.sin(u * Math.PI);
					if (a.kind === 'chop') { R = u < 0.35 ? lerp(R, -2.9, u / 0.35) : lerp(-2.9, -0.7, clamp((u - 0.35) / 0.2, 0, 1)); L = -0.8; }
					else if (a.kind === 'grab' || a.kind === 'take') { L = lerp(L, -2.4, pulse); R = lerp(R, -2.4, pulse); }
					else if (a.kind === 'put' || a.kind === 'serve') { L = R = lerp(-2.75, -1.5, Math.min(1, u * 3)); if (u > 0.5) L = R = lerp(-1.5, Math.sin(time * 2) * 0.1, (u - 0.5) * 2); }
					else if (a.kind === 'bin') R = -3.1 * pulse;
					else if (a.kind === 'flip') { R = -1.0 - 1.8 * pulse; L = -0.9; }
					else if (a.kind === 'jab') R = -1.6 * pulse;
					else if (a.kind === 'pump') { L = R = -1.4; m.body.position.y -= 0.28 * pulse; }
					else if (a.kind === 'douse') { L = R = -1.4 + Math.sin(a.t * 40) * 0.3; }
				}
				const ease = Math.min(1, dt * 16);
				m.armL.rotation.x = lerp(m.armL.rotation.x, L, ease);
				m.armR.rotation.x = lerp(m.armR.rotation.x, R, ease);
				m.armL.rotation.z = -0.15;
				m.armR.rotation.z = 0.15;
				m.head.rotation.y = Math.sin(time * 0.7) * 0.25;
				for (const tl of m.tools) tl.rotation.y += dt * 30;
				if (m.blend) m.blend.rotation.y += dt * 20;
				if (m.toast) m.toast.position.y = 0.44 + Math.max(0, Math.sin(time * 1.5)) * 0.08;
				const hv = syncItem(m.holder, c.held, m.hold, 0, Math.sin(rt * 3 + i) * 0.04, 0, 0.95);
				if (hv) hv.rotation.y = -m.yaw + Math.PI + Math.sin(rt * 1.5) * 0.3;
				if (c.held && c.held.burnt && m.rise > 0.5) every('held-smoke-' + i + '-' + w, 2, dt, () => smoke(w, m.x, 2.9, STAND_Z, 0.6));
			}
		}

		// the portals
		for (const p of portals) {
			if (!p.ring) { p.ring = buildPortal(); sets[p.wall].add(p.ring.g); }
			const v = p.ring;
			const grow = Math.min(1, p.t * 3) * (1 + Math.sin(p.t * 5) * 0.05);
			v.g.position.set(p.x3, PORTAL_Y + Math.sin(p.t * 2) * 0.1, PORTAL_Z);
			v.g.scale.setScalar(grow);
			v.disc.rotation.z = -p.t * 3;
			v.r1.rotation.z = p.t * 1.5;
			v.r2.rotation.z = -p.t * 2.2;
			const iv = syncItem(p, p.item, v.hold, 0, -0.3, 0, 0.9);
			if (iv) iv.rotation.y = p.t * 1.5;
			every('portal-' + p.item.id, 6, dt, () => puff(p.wall, p.x3 + rnd1() * 1.2, PORTAL_Y + rnd1() * 1.2, PORTAL_Z, { color: Math.random() < 0.5 ? 0x3af2ff : 0xff2d8f, size: 0.06, grow: 0.02, life: 0.8, vy: 0, vx: rnd1() * 0.5, glow: 2, add: true, alpha: 1 }));
		}
		for (const g of sets) for (const o of g.children.slice()) if (o.userData.portal && !portals.some((p) => p.ring && p.ring.g === o)) o.removeFromParent();
		for (const p of portals) p.ring.g.userData.portal = true;

		// the manager comes down on its cable for the intro
		manager.visible = phase === 'intro';
		if (manager.visible) {
			const k = clamp(introT / 0.9, 0, 1);
			manager.position.set(0, lerp(9, 3.6, 1 - Math.pow(1 - k, 3)) + Math.sin(rt * 2.4) * 0.06, 0.6);
			manager.rotation.z = Math.sin(rt * 1.7) * 0.05;
		}

		// spinning, warping, wobbling food; views no one holds any more go
		for (const v of itemViews()) {
			if (!itemsLive.has(v)) { v.removeFromParent(); continue; }
			if (v.userData.warp) v.children[0].rotation.z = Math.sin(rt * 3 + v.id) * 0.25;
		}
		stepPuffs(dt);
	}

	/* ---------- the 2D layer: words over the kitchen ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		rt += dt;
		update3D(show.paused ? 0 : dt);
		post.render(views());
		show.frame(ctx, dt, drawWorld);
	};

	function drawWorld(ctx) {
		for (const s of stations) drawStationUI(ctx, s);
		drawFrontUI(ctx);
		for (const p of portals) art.text(ctx, 'GRAB IT', p.x, p.y + 92, { size: 28, weight: 800, font: FONT, fill: '#3af2ff', outline: INK, outlineWidth: 5 });
		// over each cook, on each wall they've risen into: what they hold, and what to do with it
		const playing = phase === 'tutorial' || phase === 'play';
		for (let i = 0; i < count; i++) {
			const c = chefs[i];
			if (!latest[i] || !chefs3[i]) continue;
			for (let w = 0; w < 3; w++) {
				const m = chefs3[i][w];
				if (!m.g.visible || m.rise < 0.6) continue;
				const at = proj(w, m.x, 3.05 - (1 - m.rise) * 2.8, STAND_Z);
				let y = at.y;
				if (c.held) {
					const label = (c.held.burnt ? 'BURNT ' : '') + c.held.steps.map((s) => KIND[s].adj).reverse().join(' ') + (c.held.steps.length ? ' ' : '') + INGS[c.held.ing].short;
					art.text(ctx, label, at.x, y, { size: 22, weight: 800, font: FONT, fill: 'white', outline: INK, outlineWidth: 5 });
					y += 26;
				}
				if (playing) art.text(ctx, hintFor(c), at.x, y, { size: 22, weight: 800, font: FONT, fill: '#e9ff4a', outline: INK, outlineWidth: 5 });
			}
		}
		for (const r of ripples) art.circle(ctx, r.x, r.y, 20 + r.t * 160, { stroke: 'white', lineWidth: 6, alpha: 1 - r.t / 0.5 });
		for (const f of floaters) {
			const k = f.t / 1.5;
			art.text(ctx, f.text, f.x, f.y - k * 90, { size: f.size * (k < 0.1 ? 0.6 + k * 4 : 1), weight: 800, font: FONT, fill: f.fill, outline: INK, outlineWidth: 6, alpha: 1 - Math.max(0, k - 0.7) / 0.3 });
		}
	}

	// where a cook's floating words go: over their head, on the wall they're nearest
	function overChef(i) {
		const c = chefs[i];
		const m = chefs3[i] && chefs3[i][c.wall];
		return m && m.x !== undefined ? proj(c.wall, m.x, 3.0, STAND_Z) : { x: c.x, y: 600 };
	}

	function bar(ctx, x, y, w, k, colour, back) {
		art.roundRect(ctx, x - w / 2 - 4, y - 13, w + 8, 26, 13, { fill: INK });
		art.roundRect(ctx, x - w / 2, y - 9, w, 18, 9, { fill: back || '#2a302e' });
		if (k > 0) art.roundRect(ctx, x - w / 2, y - 9, Math.max(18, w * clamp(k, 0, 1)), 18, 9, { fill: colour });
	}

	function prompt(ctx, x, y, text, fill, pulse) {
		const s = pulse ? 1 + Math.sin(rt * 10) * 0.06 : 1;
		art.text(ctx, text, x, y, { size: 25 * s, weight: 800, font: FONT, fill, outline: INK, outlineWidth: 5 });
	}

	// A device's name: a sign hung on two chains from above, each a little
	// crooked in its own way (seed), swaying gently
	function hangSign(ctx, x, y, text, colour, seed) {
		ctx.font = `800 24px ${FONT}`;
		const w = Math.min(230, ctx.measureText(text).width + 40), h = 44;
		const tilt = Math.sin(seed * 12.9898) * 0.09 + Math.sin(rt * 1.3 + seed * 3) * 0.012;
		ctx.save();
		ctx.translate(x, y - h / 2 - 70);   // (where it hangs from)
		ctx.rotate(tilt);
		const top = 70;
		for (const sx of [-w * 0.34, w * 0.34]) {
			art.line(ctx, [[sx * 0.9, 0], [sx, top]], { stroke: '#0b0d0c', lineWidth: 6 });
			for (let k = 6; k < top; k += 12) art.ellipse(ctx, sx * (0.9 + 0.1 * k / top), k, 3.5, 6, { stroke: '#7a8480', lineWidth: 2.5 });
		}
		art.roundRect(ctx, -w / 2 + 3, top + 6, w, h, 8, { fill: 'rgba(0,0,0,0.45)' });
		art.roundRect(ctx, -w / 2, top, w, h, 8, { fill: '#17151d', stroke: colour, lineWidth: 4 });
		art.roundRect(ctx, -w / 2 + 6, top + 6, w - 12, h - 12, 5, { stroke: 'rgba(255,255,255,0.08)', lineWidth: 2 });
		for (const sx of [-w * 0.34, w * 0.34]) art.circle(ctx, sx, top + 7, 3.5, { fill: '#9aa4a0', stroke: '#0b0d0c', lineWidth: 1.5 });
		art.text(ctx, text, 0, top + h / 2 + 1, { size: 24, weight: 800, font: FONT, fill: colour, shadow: { color: colour, blur: 8 } });
		ctx.restore();
	}

	function plate(ctx, x, y, text, colour) {
		ctx.font = `800 26px ${FONT}`;
		const w = Math.min(340, ctx.measureText(text).width + 40);
		art.roundRect(ctx, x - w / 2, y - 22, w, 44, 10, { fill: 'rgba(8,10,9,0.88)', stroke: colour, lineWidth: 3 });
		art.text(ctx, text, x, y, { size: 26, weight: 800, font: FONT, fill: colour });
	}

	function drawStationUI(ctx, s) {
		const { x: cx, prompt: py, plate: ply } = s.ui;
		const by = py + 36;
		hangSign(ctx, cx, ply, s.name, s.colour, s.wall * 4 + s.slot + 1);
		if (s.fire > 0) prompt(ctx, cx, py, 'FIRE! TAP ×' + s.fire, '#ff4a32', true);
		else if (s.state === 'done') {
			prompt(ctx, cx, py, 'READY! TAP', '#9dff3a', true);
			if (s.kind === 'fry' || s.kind === 'grill') bar(ctx, cx, by, 180, 1 - s.doneT / (s.kind === 'fry' ? FRY.burn : GRILL.burn), '#ff4a32');
		} else if (s.state === 'burnt') prompt(ctx, cx, py, 'BURNT! TAP', '#ff4a32', true);
		else if (s.state === 'work') {
			const hint = {
				chop: ['TAP TAP TAP!', s.prog],
				fry: ['FRYING...', s.t / FRY.cook],
				grill: [!s.flipped && s.t >= GRILL.flipAt ? 'FLIP! TAP' : s.flipped ? 'SIZZLING...' : 'SEARING...', s.flipped ? s.t / GRILL.cook : Math.min(s.t, GRILL.flipAt) / GRILL.cook],
				stir: ['STAY AND SWAY', s.prog],
				press: ['SQUAT OR TAP', s.prog],
				inject: ['TAP IN THE GREEN', -1],
				warp: ['WARPING...', s.t / WARP_TIME],
				cryo: ['STAY STILL', s.prog],
			}[s.kind];
			const urgent = s.kind === 'grill' && !s.flipped && s.t >= GRILL.flipAt;
			prompt(ctx, cx, py, hint[0], urgent ? '#ff4a32' : '#e9ff4a', urgent || ['chop', 'stir', 'press', 'cryo', 'inject'].includes(s.kind));
			if (hint[1] >= 0) bar(ctx, cx, by, 180, hint[1], s.colour);
			if (s.kind === 'inject') {   // the dial: a needle that sweeps, a green band to hit
				const y = by + 4;
				art.roundRect(ctx, cx - 115, y - 22, 230, 44, 22, { fill: INK });
				art.roundRect(ctx, cx - 105, y - 13, 210, 26, 13, { fill: '#3a1a2a' });
				art.rect(ctx, cx - 105 + 210 * (0.5 - INJECT.zone), y - 13, 210 * INJECT.zone * 2, 26, { fill: '#3cdc7a' });
				const nx = cx - 105 + 210 * needle(s);
				art.poly(ctx, [[nx, y + 20], [nx - 12, y - 24], [nx + 12, y - 24]], { fill: s.lock > 0 ? '#ff4a32' : 'white', stroke: INK, lineWidth: 3 });
			}
		}
	}

	const ticketH = (c) => 62 + c.parts.length * 58 + 24;
	function drawFrontUI(ctx) {
		hangSign(ctx, HATCH_UI.x, HATCH_UI.plate, 'GRABBER', '#9dff3a', 21);
		hangSign(ctx, CHUTE_UI.x, CHUTE_UI.plate, 'BINNER', '#d04dff', 37);
		if (hatch.jam > 0) prompt(ctx, HATCH_UI.x, HATCH_UI.prompt, 'JAMMED! TAP ×' + hatch.jam, '#ffc21a', true);
		else prompt(ctx, HATCH_UI.x, HATCH_UI.prompt, 'TAP TO GRAB', '#9dff3a', false);
		// (what's in it, under that)
		const inHatch = pods.filter((p) => p.ing).map((p) => INGS[p.ing].short);
		art.text(ctx, inHatch.length ? inHatch.join(' · ') : 'BEAMING IN...', HATCH_UI.x, HATCH_UI.prompt + 36, { size: 18, weight: 800, font: FONT, fill: inHatch.length ? '#ffffff' : 'rgba(255,255,255,0.45)', outline: INK, outlineWidth: 4 });
		prompt(ctx, CHUTE_UI.x, CHUTE_UI.prompt, 'TAP TO BIN', '#d04dff', false);
		const n = windowsNow();
		const cw = colW(n);
		for (let k = 0; k < n; k++) {
			const c = customers[k];
			if (!c) continue;
			const x = W + HATCH + cw * k + cw / 2;
			if (c.state !== 'leave') drawTicket(ctx, c, x, TICKET_BOTTOM - ticketH(c), cw - 26);
			if (c.state === 'wait') plate(ctx, x, SERVE_Y, 'SERVER', '#e9ff4a');
			if (c.sayT > 0 && c.say) drawSpeech(ctx, c.say, x, SAY_Y, cw - 10, c.state === 'angry' ? '#ff4a32' : c.state === 'eat' ? '#9dff3a' : 'white');
		}
	}

	/* ---------- 2D: tickets, speech ---------- */

	function drawSpeech(ctx, text, x, y, w, fill) {
		ctx.font = `800 22px ${FONT}`;
		const words = text.split(' ');
		const lines = [];
		let line = '';
		for (const word of words) {
			const test = line ? line + ' ' + word : word;
			if (ctx.measureText(test).width > w - 30 && line) { lines.push(line); line = word; } else line = test;
		}
		lines.push(line);
		const h = lines.length * 26 + 18;
		art.roundRect(ctx, x - w / 2, y - h / 2, w, h, 14, { fill, stroke: INK, lineWidth: 4 });
		art.poly(ctx, [[x - 14, y + h / 2 - 2], [x + 14, y + h / 2 - 2], [x, y + h / 2 + 18]], { fill, stroke: INK, lineWidth: 4 });
		art.rect(ctx, x - 13, y + h / 2 - 6, 26, 6, { fill });
		art.text(ctx, lines.join('\n'), x, y, { size: 22, weight: 800, font: FONT, fill: INK, lineHeight: 26 });
	}

	function drawTicket(ctx, c, x, y, w) {
		const rows = c.parts.length;
		const h = 62 + rows * 58 + 24;
		const vip = c.recipe === FEAST;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(Math.sin(c.seed) * 0.02);
		art.rect(ctx, -w / 2 + 4, 6, w - 8, h, { fill: 'rgba(0,0,0,0.5)' });
		art.rect(ctx, -w / 2, 0, w, h, { fill: vip ? '#f4e08a' : '#e8e2cc', stroke: INK, lineWidth: 3 });
		// the name, in two lines at most
		ctx.font = `800 20px ${FONT}`;
		const words = c.recipe.name.split(' ');
		const lines = [''];
		for (const word of words) {
			const test = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + word : word;
			if (ctx.measureText(test).width > w - 20 && lines[lines.length - 1]) lines.push(word); else lines[lines.length - 1] = test;
		}
		art.text(ctx, lines.slice(0, 2).join('\n'), 0, 31, { size: lines.length > 1 ? 18 : 20, weight: 800, font: FONT, fill: '#1a1408', lineHeight: 21 });
		for (let r = 0; r < rows; r++) {
			const part = c.parts[r];
			const ry = 62 + r * 58 + 29;
			const steps = part.steps[0] === '*' ? ['*'] : part.steps;
			const span = 56 + steps.length * 50;
			let px = -span / 2 + 28;
			if (part.filled) art.roundRect(ctx, -w / 2 + 6, ry - 27, w - 12, 54, 8, { fill: 'rgba(60,220,122,0.45)' });
			drawItem(ctx, { ing: part.ing, steps: [], burnt: false }, px, ry, 0.42);
			for (const st of steps) {
				px += 50;
				art.text(ctx, '›', px - 26, ry, { size: 30, weight: 800, font: FONT, fill: '#6a604a' });
				if (st === '*') art.text(ctx, 'ANY', px, ry, { size: 18, weight: 800, font: FONT, fill: '#1a1408' });
				else drawStepIcon(ctx, st, px, ry, 21);
			}
			if (part.filled) art.text(ctx, '✓', w / 2 - 22, ry, { size: 34, weight: 800, font: FONT, fill: '#1a8a3a' });
		}
		// patience
		const k = clamp(c.left / c.patience, 0, 1);
		if (c.patience < 900) {
			art.rect(ctx, -w / 2 + 8, h - 18, w - 16, 10, { fill: '#5a5440' });
			art.rect(ctx, -w / 2 + 8, h - 18, (w - 16) * k, 10, { fill: k > 0.5 ? '#3cdc7a' : k > 0.25 ? '#ffc21a' : '#ff4a32' });
		}
		ctx.restore();
	}

	function drawSmoke(ctx, x, y, k) {
		for (let n = 0; n < 4; n++) {
			const ph = (t * 0.5 + n / 4) % 1;
			art.circle(ctx, x + Math.sin(ph * 6 + n) * 30, y - ph * 160, (20 + ph * 50) * k, { fill: 'rgba(60,60,55,0.5)', alpha: 1 - ph });
		}
	}

	/* ---------- 2D: food, for the tickets ---------- */
	

	// an item, centred at (x, y), about 110 * s across: its ingredient, changed by every station it's been through
	function drawItem(ctx, item, x, y, s) {
		const ing = INGS[item.ing];
		const has = (k) => item.steps.includes(k);
		let fill = ing.colour;
		if (has('fry')) fill = mix(fill, '#c8892b', 0.65);
		if (has('cryo')) fill = mix(fill, '#bfe8ff', 0.5);
		if (item.burnt) fill = '#1a1412';
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(s, s);
		if (has('warp')) ctx.rotate(Math.sin(t * 3 + (item.id || 0)) * 0.25);
		if (has('stir')) {   // (in a bowl of sludge)
			art.ellipse(ctx, 0, 30, 66, 30, { fill: '#5a5f5c', stroke: INK, lineWidth: 4 });
			art.ellipse(ctx, 0, 14, 62, 14, { fill: '#6abf2a' });
		}
		if (has('press')) ctx.scale(0.6, 0.6);
		if (has('inject')) art.circle(ctx, 0, 0, 62, { fill: 'rgba(208,77,255,0.35)' });
		if (has('warp')) {
			for (const [dx, col] of [[-6, 'rgba(58,242,255,0.6)'], [6, 'rgba(255,45,143,0.6)']]) {
				ctx.save();
				ctx.translate(dx, 0);
				ctx.globalAlpha *= 0.6;
				INGREDIENT[item.ing](ctx, col, ing.glow, item);
				ctx.restore();
			}
		}
		const chopped = has('chop');
		const pieces = chopped ? [[-26, 8, 0.55, -0.4], [24, 12, 0.55, 0.5], [0, -18, 0.55, 0.1]] : [[0, 0, 1, 0]];
		for (const [px, py, ps, pr] of pieces) {
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(pr);
			ctx.scale(ps, ps);
			INGREDIENT[item.ing](ctx, fill, item.burnt ? '#3a2a20' : ing.glow, item);
			if (has('grill') && !item.burnt) for (let n = -1; n <= 1; n++) art.line(ctx, [[-30, n * 18 - 10], [30, n * 18 + 10]], { stroke: 'rgba(30,10,0,0.75)', lineWidth: 6 });
			ctx.restore();
		}
		if (has('press')) art.rect(ctx, -46, -46, 92, 92, { stroke: '#e9ff4a', lineWidth: 6, alpha: 0.7 });
		if (has('inject') && !item.burnt) {   // (an extra eye, of course)
			art.circle(ctx, 22, -26, 14, { fill: 'white', stroke: INK, lineWidth: 3 });
			art.circle(ctx, 24, -26, 6, { fill: '#d04dff' });
		}
		if (has('cryo')) {
			art.roundRect(ctx, -54, -50, 108, 100, 14, { fill: 'rgba(190,235,255,0.3)', stroke: 'rgba(230,250,255,0.9)', lineWidth: 4 });
			art.line(ctx, [[-36, -34], [-18, -40]], { stroke: 'white', lineWidth: 5 });
		}
		if (item.burnt) drawSmoke(ctx, 0, -40, 0.5);
		if (has('fry') && !item.burnt) for (let n = 0; n < 6; n++) art.circle(ctx, Math.cos(n * 2.1) * 40, Math.sin(n * 2.7) * 34, 4, { fill: '#e8b04a' });
		ctx.restore();
	}

	const INGREDIENT = {
		roach(ctx, fill, glow) {
			for (let n = 0; n < 3; n++) for (const side of [-1, 1]) art.line(ctx, [[side * 18, -14 + n * 16], [side * 44, -22 + n * 20], [side * 50, -8 + n * 22]], { stroke: INK, lineWidth: 5 });
			art.line(ctx, [[-6, -38], [-20, -62]], { stroke: INK, lineWidth: 4 });
			art.line(ctx, [[6, -38], [20, -62]], { stroke: INK, lineWidth: 4 });
			art.ellipse(ctx, 0, 4, 28, 40, { fill, stroke: INK, lineWidth: 4 });
			art.circle(ctx, 0, -34, 14, { fill, stroke: INK, lineWidth: 4 });
			art.line(ctx, [[0, -22], [0, 40]], { stroke: INK, lineWidth: 3 });
			art.circle(ctx, -12, 0, 6, { fill: glow });
			art.circle(ctx, 12, 14, 5, { fill: glow });
		},
		eel(ctx, fill, glow) {
			const pts = [];
			for (let n = 0; n <= 16; n++) pts.push([-52 + n * 6.5, Math.sin(n * 0.7 + t * 2) * 16]);
			art.line(ctx, pts, { stroke: INK, lineWidth: 28 });
			art.line(ctx, pts, { stroke: fill, lineWidth: 20 });
			const [hx, hy] = pts[pts.length - 1];
			art.circle(ctx, hx, hy, 15, { fill, stroke: INK, lineWidth: 4 });
			art.circle(ctx, hx + 3, hy - 4, 5, { fill: glow });
			art.line(ctx, [[hx + 6, hy + 6], [hx + 14, hy + 4]], { stroke: INK, lineWidth: 3 });
		},
		shroom(ctx, fill, glow) {
			art.roundRect(ctx, -14, -4, 28, 46, 10, { fill: '#e8e0c8', stroke: INK, lineWidth: 4 });
			ctx.beginPath();
			ctx.ellipse(0, -4, 50, 40, 0, Math.PI, 0);
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.strokeStyle = INK;
			ctx.lineWidth = 4;
			ctx.stroke();
			for (const [sx, sy, r] of [[-22, -20, 8], [10, -30, 7], [26, -12, 6]]) art.circle(ctx, sx, sy, r, { fill: glow });
			art.circle(ctx, -6, 14, 3, { fill: INK });
			art.circle(ctx, 6, 14, 3, { fill: INK });
		},
		ooze(ctx, fill, glow) {
			const wob = Math.sin(t * 4) * 3;
			art.roundRect(ctx, -40 - wob, -38 + wob, 80 + wob * 2, 76 - wob, 18, { fill, stroke: INK, lineWidth: 4, alpha: 0.92 });
			art.roundRect(ctx, -30, -30, 26, 12, 6, { fill: 'rgba(255,255,255,0.5)' });
			art.circle(ctx, 14, 10, 7, { fill: glow });
			art.circle(ctx, -10, 18, 4, { fill: glow });
			art.circle(ctx, -12, -4, 5, { fill: INK });
			art.circle(ctx, 12, -6, 5, { fill: INK });
		},
		eye(ctx, fill) {
			art.circle(ctx, 0, 0, 42, { fill, stroke: INK, lineWidth: 4 });
			for (const a of [0.4, 1.9, 3.3, 4.6]) art.line(ctx, [[Math.cos(a) * 40, Math.sin(a) * 40], [Math.cos(a + 0.2) * 26, Math.sin(a + 0.2) * 26], [Math.cos(a) * 20, Math.sin(a) * 20]], { stroke: '#d02a2a', lineWidth: 3 });
			const lx = Math.sin(t * 1.3) * 8;
			art.circle(ctx, lx, 0, 18, { fill: '#ff2d8f', stroke: INK, lineWidth: 3 });
			art.circle(ctx, lx, 0, 8, { fill: INK });
			art.circle(ctx, lx - 6, -6, 4, { fill: 'white' });
		},
		tentacle(ctx, fill) {
			const pts = [];
			for (let n = 0; n <= 20; n++) {
				const a = n * 0.32 + Math.sin(t * 2) * 0.2;
				const r = 46 - n * 2;
				pts.push([Math.cos(a) * r - 4, Math.sin(a) * r * 0.9]);
			}
			art.line(ctx, pts, { stroke: INK, lineWidth: 30 });
			art.line(ctx, pts, { stroke: fill, lineWidth: 22 });
			for (let n = 2; n < 18; n += 3) art.circle(ctx, pts[n][0] * 0.82, pts[n][1] * 0.82, 4, { fill: '#fff0f4' });
		},
	};

	function drawStepIcon(ctx, kind, x, y, r) {
		const col = KIND[kind].colour;
		art.circle(ctx, x, y, r, { fill: '#1a1c1b', stroke: col, lineWidth: 3 });
		ctx.save();
		ctx.translate(x, y);
		const k = r / 20;
		ctx.scale(k, k);
		const st = { stroke: col, lineWidth: 3.5 };
		if (kind === 'chop') { art.rect(ctx, -10, -11, 16, 13, { fill: col }); art.rect(ctx, 3, 2, 4, 10, { fill: col }); }
		else if (kind === 'fry') { for (const [bx, by, br] of [[-6, 4, 5], [5, -1, 4], [0, -9, 3]]) art.circle(ctx, bx, by, br, st); }
		else if (kind === 'grill') { for (let n = -1; n <= 1; n++) art.line(ctx, [[-11, n * 7], [11, n * 7]], st); }
		else if (kind === 'stir') { const pts = []; for (let n = 0; n < 24; n++) { const a = n * 0.5; pts.push([Math.cos(a) * n * 0.5, Math.sin(a) * n * 0.5]); } art.line(ctx, pts, st); }
		else if (kind === 'press') { art.line(ctx, [[0, -12], [0, -2]], st); art.line(ctx, [[-5, -7], [0, -2], [5, -7]], st); art.line(ctx, [[0, 12], [0, 2]], st); art.line(ctx, [[-5, 7], [0, 2], [5, 7]], st); }
		else if (kind === 'inject') { art.rect(ctx, -4, -10, 8, 15, { fill: col }); art.line(ctx, [[0, 5], [0, 13]], st); art.line(ctx, [[-7, -11], [7, -11]], st); }
		else if (kind === 'warp') { for (const rr of [4, 9]) art.circle(ctx, 0, 0, rr, st); art.line(ctx, [[9, 0], [13, -6]], st); }
		else if (kind === 'cryo') { for (let n = 0; n < 3; n++) { const a = n * Math.PI / 3; art.line(ctx, [[Math.cos(a) * -12, Math.sin(a) * -12], [Math.cos(a) * 12, Math.sin(a) * 12]], st); } }
		ctx.restore();
	}

	/* ---------- 2D: the cooks, for the results screens ---------- */

		// A cyborg cook, feet at (x, y), h tall. o: { pose ('stand' | 'cheer' | 'win'), work (0..1), held, alpha }
	function drawChef(ctx, n, x, y, h, o) {
		o = o || {};
		const look = COOKS[n % COOKS.length];
		const col = colourOf(n);
		const k = h / 100;
		const time = (o.pose ? performance.now() / 1000 : t) + (o.bob || 0);   // (the results' cooks keep moving after the kitchen stops)
		const cheer = o.pose === 'cheer' || o.pose === 'win';
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(k, k);
		if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
		const lw = 2.2;
		const line = { stroke: INK, lineWidth: lw };
		const bounce = cheer ? Math.abs(Math.sin(time * 6)) * 4 : Math.sin(time * 2) * 0.8;
		ctx.translate(0, -bounce);

		// legs (0 to -30)
		const metal = '#8a9492';
		if (look.legs === 'treads') {
			art.roundRect(ctx, -20, -14, 40, 14, 7, { fill: '#2a2e2c', ...line });
			for (let w = -14; w <= 14; w += 9) art.circle(ctx, w, -7, 3.5, { fill: metal });
			art.rect(ctx, -6, -30, 12, 17, { fill: metal, ...line });
		} else if (look.legs === 'pogo') {
			art.rect(ctx, -12, -30, 8, 28, { fill: '#3a3a5a', ...line });
			art.line(ctx, [[8, -30], [4, -26], [12, -22], [4, -18], [12, -14], [4, -10], [8, -4]], { stroke: metal, lineWidth: 2.5 });
			art.rect(ctx, 2, -3, 12, 3, { fill: metal });
			art.ellipse(ctx, -8, -2, 8, 3, { fill: INK });
		} else if (look.legs === 'wheel') {
			art.rect(ctx, -4, -30, 8, 18, { fill: metal, ...line });
			art.circle(ctx, 0, -9, 9, { fill: '#2a2e2c', ...line });
			art.circle(ctx, 0, -9, 3, { fill: metal });
		} else if (look.legs === 'spider') {
			for (const s of [-1, 1]) for (const d of [10, 20]) art.line(ctx, [[s * 4, -28], [s * d, -18], [s * (d + 4), 0]], { stroke: metal, lineWidth: 2.5 });
		} else if (look.legs === 'chicken') {
			for (const s of [-1, 1]) {
				art.line(ctx, [[s * 6, -30], [s * 10, -16], [s * 6, -3]], { stroke: metal, lineWidth: 3.5 });
				art.line(ctx, [[s * 6, -3], [s * 14, 0]], { stroke: metal, lineWidth: 2.5 });
				art.line(ctx, [[s * 6, -3], [s * 1, 0]], { stroke: metal, lineWidth: 2.5 });
			}
		} else {   // jet
			art.poly(ctx, [[-12, -30], [12, -30], [7, -12], [-7, -12]], { fill: metal, ...line });
			const f = 8 + Math.sin(time * 30) * 3;
			art.poly(ctx, [[-6, -12], [6, -12], [0, -12 + f]], { fill: '#ffc21a' });
		}

		// arms, behind the body: each ends in its tool
		const swing = (o.work || 0) * Math.sin(time * 22) * 0.6;
		const arm = (side, tool) => {
			const sx = side * 17, sy = -56;
			let a;
			if (cheer) a = side * (2.4 + Math.sin(time * 8 + side) * 0.2);
			else if (o.held && side === 1) a = 2.6;
			else a = side * (0.35 + (side === 1 ? swing : -swing));
			const hx = sx + Math.sin(a) * 22;
			const hy = sy + Math.cos(a) * 22;
			art.line(ctx, [[sx, sy], [hx, hy]], { stroke: INK, lineWidth: 7 });
			art.line(ctx, [[sx, sy], [hx, hy]], { stroke: side === -1 ? look.skin : metal, lineWidth: 4.5 });
			ctx.save();
			ctx.translate(hx, hy);
			ctx.rotate(-a);
			TOOLS[tool](ctx, col);
			ctx.restore();
			return [hx, hy];
		};
		arm(-1, look.arms[0]);
		const hand = arm(1, look.arms[1]);

		// the body, with its apron and its gadget belly
		art.roundRect(ctx, -18, -62, 36, 34, 8, { fill: '#4a514f', ...line });
		art.poly(ctx, [[-14, -50], [14, -50], [16, -28], [-16, -28]], { fill: col, ...line });
		const belly = look.belly;
		if (belly === 'fryer') {
			art.roundRect(ctx, -9, -48, 18, 13, 3, { fill: '#202624', ...line });
			art.rect(ctx, -7, -42, 14, 6, { fill: '#ffc21a' });
			art.circle(ctx, -3 + Math.sin(time * 5) * 3, -44, 1.6, { fill: '#fff3b0' });
		} else if (belly === 'micro') {
			art.roundRect(ctx, -10, -48, 20, 14, 2, { fill: '#202624', ...line });
			art.text(ctx, Math.floor(time % 60).toString().padStart(2, '0'), -1, -41, { size: 7, font: 'Share Tech Mono', fill: '#9dff3a' });
		} else if (belly === 'blender') {
			art.roundRect(ctx, -8, -50, 16, 18, 3, { fill: 'rgba(160,230,255,0.6)', ...line });
			art.line(ctx, [[-4, -40 + Math.sin(time * 20) * 2], [4, -40 - Math.sin(time * 20) * 2]], { stroke: '#e9ff4a', lineWidth: 2 });
		} else if (belly === 'toaster') {
			art.roundRect(ctx, -10, -48, 20, 14, 3, { fill: metal, ...line });
			art.rect(ctx, -7, -47, 5, 2, { fill: INK });
			art.rect(ctx, 2, -47, 5, 2, { fill: INK });
			const pop = Math.max(0, Math.sin(time * 1.5)) * 5;
			art.rect(ctx, -6, -50 - pop, 3, 3, { fill: '#c8892b' });
		} else {   // grill
			art.roundRect(ctx, -10, -48, 20, 13, 2, { fill: '#202624', ...line });
			for (let g = -6; g <= 6; g += 4) art.line(ctx, [[g, -47], [g, -36]], { stroke: '#ff8a2a', lineWidth: 1.5 });
		}

		// the head
		const hy = -74;
		art.rect(ctx, -4, -64, 8, 4, { fill: metal });
		art.circle(ctx, 0, hy, 12, { fill: look.skin, ...line });
		const head = look.head;
		// half the face is machine, more or less
		if (head === 'bolts') {
			ctx.save(); ctx.beginPath(); ctx.arc(0, hy, 12, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fillStyle = metal; ctx.fill(); ctx.restore();
			art.circle(ctx, 5, hy - 2, 4, { fill: col, shadow: { color: col, blur: 6 } });
			art.circle(ctx, -5, hy - 2, 2, { fill: INK });
			for (const [bx, by] of [[11, hy - 7], [11, hy + 5]]) art.circle(ctx, bx, by, 2, { fill: '#555' });
		} else if (head === 'mohawk') {
			for (let m = -2; m <= 2; m++) art.poly(ctx, [[m * 3 - 2, hy - 10], [m * 3 + 2, hy - 10], [m * 3, hy - 20 - (2 - Math.abs(m)) * 2]], { fill: col });
			art.roundRect(ctx, -11, hy - 5, 22, 7, 3, { fill: INK });
			art.circle(ctx, -5, hy - 1.5, 2.5, { fill: '#3af2ff' });
			art.circle(ctx, 5, hy - 1.5, 2.5, { fill: '#3af2ff' });
		} else if (head === 'dome') {
			art.rect(ctx, -11, hy - 4, 22, 6, { fill: col, shadow: { color: col, blur: 6 } });
		} else if (head === 'brain') {
			art.circle(ctx, 0, hy - 8, 10, { fill: 'rgba(170,230,255,0.4)', stroke: '#8fdcff', lineWidth: 1.5 });
			art.ellipse(ctx, 0, hy - 8, 7, 5, { fill: '#e88aa8' });
			art.circle(ctx, -4, hy + 1, 2, { fill: INK });
			art.circle(ctx, 4, hy + 1, 2.6, { fill: col });
		} else if (head === 'beard') {
			art.poly(ctx, [[-11, hy + 2], [11, hy + 2], [0, hy + 16]], { fill: '#6a6a6a', ...line });
			art.rect(ctx, 1, hy - 6, 10, 8, { fill: metal });
			art.circle(ctx, 6, hy - 2, 2.5, { fill: col });
			art.circle(ctx, -5, hy - 2, 2, { fill: INK });
		} else {   // antenna and pigtails
			art.line(ctx, [[0, hy - 12], [0, hy - 24]], { stroke: metal, lineWidth: 1.5 });
			art.circle(ctx, 0, hy - 25, 2.5, { fill: col, shadow: { color: col, blur: 6 } });
			for (const s of [-1, 1]) art.circle(ctx, s * 13, hy - 4, 4, { fill: '#5a3a2a', ...line });
			art.circle(ctx, -4, hy - 1, 2, { fill: INK });
			art.circle(ctx, 4, hy - 1, 2, { fill: INK });
		}
		if (head !== 'beard') {
			if (cheer) { ctx.beginPath(); ctx.arc(0, hy + 4, 4, 0, Math.PI); ctx.fillStyle = INK; ctx.fill(); }
			else art.line(ctx, [[-3, hy + 6], [3, hy + 6]], { stroke: INK, lineWidth: 1.5 });
		}
		// the chef's hat (a dented steel one for the dome; none for the brain jar)
		if (head === 'dome') {
			art.roundRect(ctx, -10, hy - 26, 20, 16, [8, 8, 0, 0], { fill: metal, ...line });
			art.line(ctx, [[-6, hy - 20], [-2, hy - 18]], { stroke: '#555', lineWidth: 1 });
		} else if (head !== 'brain' && head !== 'mohawk') {
			art.rect(ctx, -9, hy - 15, 18, 5, { fill: '#e8e4d8', ...line });
			for (const [cx, cy, r] of [[-6, hy - 19, 6], [6, hy - 19, 6], [0, hy - 23, 7]]) art.circle(ctx, cx, cy, r, { fill: '#e8e4d8', ...line });
			art.circle(ctx, -3, hy - 20, 1.5, { fill: '#8a7a5a' });
		}

		ctx.restore();
		// the food in hand, held up, in its own size
		if (o.held) {
			const hx = x + hand[0] * k;
			const hyw = y - bounce * k + hand[1] * k - 30;
			drawItem(ctx, o.held, hx, hyw, 0.9);
			const label = (o.held.burnt ? 'BURNT ' : '') + o.held.steps.map((s) => KIND[s].adj).reverse().join(' ') + (o.held.steps.length ? ' ' : '') + INGS[o.held.ing].short;
			art.text(ctx, label, hx, hyw - 74, { size: 24, weight: 800, font: FONT, fill: 'white', outline: INK, outlineWidth: 5 });
		}
	}

	// the tools at the ends of the cooks' arms, pointing along +y from the wrist
	const TOOLS = {
		whisk(ctx) {
			art.rect(ctx, -1.5, 0, 3, 7, { fill: '#8a9492' });
			for (const w of [-4, 0, 4]) art.ellipse(ctx, 0, 12, Math.abs(w) + 1.2, 6, { stroke: '#d8dedc', lineWidth: 1.2 });
		},
		cleaver(ctx) {
			art.rect(ctx, -1.5, 0, 3, 5, { fill: '#3a2414' });
			art.rect(ctx, -6, 5, 10, 11, { fill: '#d8dedc', stroke: INK, lineWidth: 1.2 });
		},
		spatula(ctx) {
			art.rect(ctx, -1.2, 0, 2.4, 8, { fill: '#8a9492' });
			art.roundRect(ctx, -5, 8, 10, 9, 2, { fill: '#d8dedc', stroke: INK, lineWidth: 1.2 });
		},
		ladle(ctx) {
			art.rect(ctx, -1.2, 0, 2.4, 10, { fill: '#8a9492' });
			art.circle(ctx, 0, 13, 4.5, { fill: '#d8dedc', stroke: INK, lineWidth: 1.2 });
		},
		tongs(ctx) {
			art.line(ctx, [[0, 0], [-3, 15]], { stroke: '#d8dedc', lineWidth: 2 });
			art.line(ctx, [[0, 0], [3, 15]], { stroke: '#d8dedc', lineWidth: 2 });
		},
		drill(ctx, col) {
			art.roundRect(ctx, -4, 0, 8, 7, 2, { fill: col, stroke: INK, lineWidth: 1.2 });
			art.poly(ctx, [[-2.5, 7], [2.5, 7], [0, 17]], { fill: '#d8dedc', stroke: INK, lineWidth: 1 });
		},
		cutter(ctx) {
			art.rect(ctx, -1.2, 0, 2.4, 6, { fill: '#8a9492' });
			art.circle(ctx, 0, 11, 5.5, { fill: '#d8dedc', stroke: INK, lineWidth: 1.2 });
			art.circle(ctx, 0, 11, 1.2, { fill: INK });
		},
		grater(ctx) {
			art.rect(ctx, -4, 1, 8, 15, { fill: '#c8d0ce', stroke: INK, lineWidth: 1.2 });
			for (let g = 4; g < 15; g += 3) art.rect(ctx, -2, g, 4, 1, { fill: INK });
		},
		fork(ctx) {
			art.rect(ctx, -1.2, 0, 2.4, 8, { fill: '#8a9492' });
			art.rect(ctx, -4, 8, 8, 1.5, { fill: '#d8dedc' });
			for (const f of [-4, 0, 4]) art.rect(ctx, f - 0.6, 8, 1.2, 8, { fill: '#d8dedc' });
		},
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	/* ---------- debug: straight to a shift, or some trouble ---------- */

	if (show.menu && show.menu.drow) {
		const $shifts = show.menu.drow('SHIFTS');
		SHIFTS.forEach(function (sh, n) {
			show.menu.dbutton('SHIFT ' + (n + 1), function () {
				if (!count) return;
				if (show.beat !== 'play') show.go('play');
				show.setTimeLeft(sh.from - 1);
			}, '#9dff3a').appendTo($shifts);
		});
		const $trouble = show.menu.drow('TROUBLE');
		for (const kind of ['fire', 'jam', 'leak', 'vip']) {
			show.menu.dbutton(kind.toUpperCase(), function () { if (phase === 'play') trouble(kind); }, '#ff4a32').appendTo($trouble);
		}
	}

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(),
		phase, shift: shiftNo, served, walkouts, streak, bonus, burns,
		held: chefs.map((c) => c.held && { ing: c.held.ing, steps: c.held.steps.slice(), burnt: c.held.burnt }),
		stations: stations.map((s) => ({ kind: s.kind, state: s.state, item: s.item && s.item.ing, fire: s.fire })),
		customers: customers.map((c) => c && { recipe: c.recipe.name, state: c.state, left: Math.round(c.left) }),
		portals: portals.length,
	});

	self.test = { skipTo(id) { show.go(id); } };   // (jump to any beat: tools/icon-shots.mjs)

	self.fini = function () {
		stage.$el.off('.grub-o-tron');
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
