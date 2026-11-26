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
import { createWallComposer, createWallRig, canvasTexture, environmentFromShader, toScreen } from '../lib/three/walls.js';
import { mergeGeometries } from '../lib/three/addons/utils/BufferGeometryUtils.js';

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
	const FRONT_L = ACTIVE[1][0] * W, FRONT_R = ACTIVE[1][1] * W;   // the front wall's active stretch (world px across it):
	const HATCH = FRONT_L, CHUTE = FRONT_R;   // (the mutants' windows span it)
	// the food hatches (each ingredient its own place to grab it from) and the BINNER, in
	// among the tools on the side walls; the front wall is the three delivery windows
	const DISPENSERS = [{ ing: 'spud', wall: 0, slot: 0 }, { ing: 'mutato', wall: 0, slot: 2 }, { ing: 'slop', wall: 2, slot: 1 }];
	const BIN = { wall: 2, slot: 3 };
	const WINDOWS = 3;
	const CHOP_TAPS = 6;
	const SALT_TAPS = 4;          // (shakes of the salter)
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
	const PATIENCE = { 0: 999, 1: 66, 2: 78, 3: 105, 4: 140 };
	const PRICE = { 0: 20, 1: 20, 2: 40, 3: 75, 4: 150 };
	const STREAK = { every: 5, bonus: 50 };
	const MAX_PORTALS = 6;

	// the shifts, by the clock (seconds left when each starts)
	const SHIFTS = [
		{ from: 600, name: 'BREAKFAST SPUDS', windows: 2, tiers: [1], gap: 6, patience: 1.0 },
		{ from: 450, name: 'LUNCHTIME MELTDOWN', windows: 3, tiers: [1, 1, 2], gap: 4.5, patience: 0.95, every: 75 },
		{ from: 300, name: 'HAPPY HOUR HALF-LIFE', windows: 3, tiers: [1, 2, 2, 3], gap: 3.5, patience: 0.9, every: 55 },
		{ from: 150, name: 'MIDNIGHT FALLOUT FRY-UP', windows: 4, tiers: [2, 2, 3, 3], gap: 2.5, patience: 0.85, every: 40, vip: true },
	];

	/* ---------- the menu ---------- */

	const INGS = {
		spud: { name: 'GLOW SPUD', short: 'SPUD', colour: '#ffe12a', glow: '#fff27a' },
		mutato: { name: 'MUTATO', short: 'MUTATO', colour: '#a44aff', glow: '#d08aff' },
		slop: { name: 'SLOP', short: 'SLOP', colour: '#7aff3a', glow: '#c8ff8a' },   // (was slime dip: the user asked for slop)
		roach: { name: 'RAD-ROACH', short: 'ROACH', colour: '#b07a3a', glow: '#9dff3a' },
		eel: { name: 'SEWER EEL', short: 'EEL', colour: '#6a46a0', glow: '#c48aff' },
		shroom: { name: 'GLOWSHROOM', short: 'SHROOM', colour: '#2ad8c9', glow: '#3af2ff' },
		ooze: { name: 'OOZE CUBE', short: 'OOZE', colour: '#8ae04a', glow: '#e9ff4a' },
		eye: { name: 'LAB EYEBALL', short: 'EYEBALL', colour: '#f2f0e6', glow: '#ff2d8f' },
		tentacle: { name: 'TENTACLE', short: 'TENTACLE', colour: '#e8708f', glow: '#ff9ac0' },
	};

	const STATIONS = [
		// (four tools, each named for what it does, mixed in with the food hatches along both side walls)
		{ kind: 'chop', wall: 0, slot: 1, name: 'CHOPPER', adj: 'CHIPPED', colour: '#ff3b3b' },
		{ kind: 'fry', wall: 0, slot: 3, name: 'FRYER', adj: 'FRIED', colour: '#ff9a1a' },
		{ kind: 'salt', wall: 2, slot: 0, name: 'SALTER', adj: 'SALTED', colour: '#2ae8ff' },
		{ kind: 'warp', wall: 2, slot: 2, name: 'WARPER', adj: 'WARPED', colour: '#4a6aff' },
	];
	const KIND = {};
	for (const d of STATIONS) KIND[d.kind] = d;

	// tier, name, parts: [ingredient, ...stations in order]. All of it fancy, radioactive chips:
	// spuds and mutatos chopped and fried, salted, warped; a bowl of slop on the side
	const RECIPES = [
		{ tier: 1, name: 'GLOW CHIPS', parts: [['spud', 'chop', 'fry']] },
		{ tier: 1, name: 'PURPLE MUTATO CHIPS', parts: [['mutato', 'chop', 'fry']] },
		{ tier: 1, name: 'A NUKED SPUD', parts: [['spud', 'fry']] },
		{ tier: 1, name: 'MUTATO FROM ELSEWHERE', parts: [['mutato', 'warp']] },
		{ tier: 2, name: 'SALT & SCREAMER CHIPS', parts: [['spud', 'chop', 'fry', 'salt']] },
		{ tier: 2, name: 'QUANTUM CHIPS', parts: [['spud', 'chop', 'fry', 'warp']] },
		{ tier: 2, name: 'FANCY MUTATO FRIES', parts: [['mutato', 'chop', 'fry', 'salt']] },
		{ tier: 2, name: 'INTERDIMENSIONAL WEDGES', parts: [['mutato', 'chop', 'warp', 'fry']] },
		{ tier: 3, name: 'CHIPS \'N\' SLOP', parts: [['spud', 'chop', 'fry'], ['slop']] },
		{ tier: 3, name: 'DOUBLE MUTANT FRIES', parts: [['spud', 'chop', 'fry'], ['mutato', 'chop', 'fry']] },
		{ tier: 3, name: 'LOADED FALLOUT FRIES', parts: [['mutato', 'chop', 'fry', 'salt'], ['slop', 'warp']] },
	];
	const FEAST = { tier: 4, name: 'THE OVERLORD\'S MEGA BUCKET', parts: [['spud', 'chop', 'fry', 'salt'], ['mutato', 'chop', 'warp', 'fry'], ['slop']] };
	const PRACTICE = { tier: 0, name: 'CHIPS, ANY WAY YOU LIKE', parts: [['*', '*']] };

	const TYPES = [   // (skins: sickly human flesh, each its own way off)
		{ id: 'blob', name: 'BLOBBO & BLOBBA', skin: '#b4c98a' },
		{ id: 'cyclops', name: 'SIR OCULUS', skin: '#cfb4d6' },
		{ id: 'mold', name: 'GARY (A MOULD)', skin: '#c9bc8c' },
		{ id: 'pigeon', name: 'EXECUTIVE PIGEON', skin: '#bdbccd' },
		{ id: 'skull', name: 'LIL\' DOOMSKULL', skin: '#e9e2c8' },
		{ id: 'squid', name: 'MRS. TENTACLES', skin: '#e6a6bc' },
		{ id: 'fungus', name: 'DUDE SHROOM', skin: '#d9ae88' },
	];
	const HELLO = [
		'I HAVE FOUR STOMACHS AND THEY ALL WANT CHIPS', 'MAKE THEM GLOW', 'EXTRA RADIATION ON MINE', 'CRISPY. CRUNCHY. CONTAMINATED.',
		'MY OTHER HEAD WANTS FRIES TOO', 'I WALKED HERE FROM THE CRATER FOR THESE', 'IS THE SALT RADIOACTIVE? GOOD', 'DO YOU TAKE BOTTLE TEETH?',
		'I\'LL KNOW IF THEY\'RE FRESH', 'HURRY, I\'M STILL MUTATING', 'I SMELL FEAR. AND FRYER OIL.', 'CHIPS, CHROME-PEOPLE. NOW.',
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
	let disp = [];                // the food hatches: each its ingredient, jammed or not
	let binFlash = 0;
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
		{ caption: 'WALK TO A FOOD HATCH AND TAP IT', min: 2, max: 30, did: () => chefs.filter((c, i) => tut.held[i]).length >= Math.min(count, 3) },
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
				show.onWalls(ctx, function (c) {
					// (the name in the title's own lettering: neon tubes, then a drip)
					show.slam(c, 'FISSION CHIPS', W / 2, 250, 84, bt - 0.3, { font: 'Monoton', exact: true, fill: '#c8ff5a' });
					show.slam(c, 'IS OPEN!', W / 2, 360, 96, bt - 0.8, { font: 'Rubik Wet Paint', exact: true, fill: '#FC1992' });
					show.slam(c, 'FANCY RADIOACTIVE CHIPS. MADE TO ORDER.', W / 2, 470, 58, bt - 1.5, { fill: 'white' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (!stations.length || !disp.length) clearKitchen();   // (jumped straight here, past the tutorial and intro: set the kitchen up)
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

	// For testing: ?play in the URL skips the picker, title, clock intro and tutorial and goes
	// straight into play (?play=4 for four players; three by default), e.g. index.html?play#grub-o-tron
	const PLAY_NOW = new URLSearchParams(window.location.search).get('play');

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		for (let i = 0; i < n; i++) {
			chefs.push({ wall: 1, along: (i + 1) / (n + 1), dist: 0.5, x: W + (i + 1) / (n + 1) * W, drawWall: 1, held: null, speed: 0, moved: 0, prev: null, down: false, station: null, work: 0, bob: Math.random() * 6 });
		}
		clearKitchen();   // (the kitchen's there from the start, whichever beat the show goes to)
		show.go(PLAY_NOW === null ? 'title' : 'play');
	}

	function clearKitchen() {
		stations = STATIONS.map((d) => Object.assign({}, d, {
			x0: d.wall * W + (slotAlong(d.wall, d.slot) - SLOT_W / 2) * W, item: null, state: 'idle', t: 0, prog: 0, doneT: 0, burntT: 0,
			fire: 0, fireT: 0, douse: 0, chopT: 0, flipped: false, lock: 0, hit: 0, glow: 0, shake: 0, paddle: 0,
		}));
		for (let k = 0; k < 4; k++) { customers[k] = null; slotWait[k] = 1 + k; }
		disp = DISPENSERS.map((d) => ({ ing: d.ing, jam: 0, shake: 0, flash: 0 }));
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
				} else if (s.kind === 'warp' && s.t >= WARP_TIME) finish(s);   // (back from elsewhere: take it from the warper)
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
		} else if (s.kind === 'salt') {
			s.prog += 1 / SALT_TAPS;
			s.hit = 1;
			credit(s, i);
			doing(i, 'jab');
			show.fx('pop', 0.4, 1.4 + Math.random() * 0.3);
			show.fx('skip', 0.25, 2);
			if (s.prog >= 0.999) finish(s);
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

	// what a dimensional leak spills: mostly what the tickets need
	function chooseIng() {
		const need = [];
		for (const c of customers) if (c && c.state === 'wait') for (const part of c.parts) if (!part.filled && part.ing !== '*') need.push(part.ing);
		return need.length && Math.random() < 0.8 ? pick(need) : pick(DISPENSERS).ing;
	}

	// A food hatch: tap with empty hands and you've got its ingredient
	function tapDispenser(k, hit) {
		const d = disp[k], ui = DISP_UI[k];
		const say = (text, fill, size) => float(ui.x, ui.prompt - 40, text, fill || '#ffffff', size || 30);
		if (d.jam > 0) {
			d.jam--;
			d.shake = 1;
			doing(hit[0], 'douse');
			show.fx('thud', 0.6);
			if (d.jam <= 0) { say('UNJAMMED!', '#9dff3a', 40); show.fx('allSet', 0.4); }
			return;
		}
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { say('HANDS FULL!'); return; }
		chefs[i].held = { id: nextId++, ing: d.ing, steps: [], burnt: false, by: [i] };
		tut.held[i] = true;
		d.flash = 1;
		doing(i, 'grab');
		show.fx('pop', 0.7);
		say(INGS[d.ing].short, INGS[d.ing].colour, 30);
	}

	function tapBinner(hit) {
		const i = hit.find((n) => chefs[n].held);
		if (i === undefined) { float(BIN_UI.x, BIN_UI.prompt - 40, 'NOTHING TO BIN', '#ffffff', 28); return; }
		chefs[i].held = null;
		doing(i, 'bin');
		binFlash = 1;
		show.fx('whooshLong', 0.5, 0.7);
		float(BIN_UI.x, BIN_UI.prompt - 40, pick(['INTO THE VOID', 'GONE FOREVER', 'THE VOID SAYS THANKS']), '#d04dff', 30);
	}

	// The warper sends food somewhere else: it comes back in a portal hanging just in front of some wall's counter
	function spawnPortal(item, from) {
		let wall, along, tries = 0;
		do {
			wall = Math.floor(Math.random() * 3);
			// (between two devices, or two delivery windows)
			along = wall === 1 ? (HATCH + colW(WINDOWS) * (1 + Math.floor(Math.random() * (WINDOWS - 1)))) / W : ACTIVE[wall][0] + SLOT_W * (1 + Math.floor(Math.random() * 3));
			tries++;
		} while (tries < 30 && ((wall === from.wall && Math.abs(along - slotAlong(from.wall, from.slot)) < 0.15) || portals.some((p) => p.wall === wall && Math.abs(p.along - along) < 0.12)));
		const q = wallPoint(wall, along, PORTAL_D);
		const sp = proj(wall, q.x, PORTAL_Y, q.z);
		portals.push({ item, wall, along, x3: q.x, z3: q.z, t: 0, x: sp.x, y: sp.y });
		if (portals.length > MAX_PORTALS) portals.shift();
		show.fx('reveal', 0.5, 0.8);
		float(from.ui.x, from.ui.prompt - 40, 'IT\'S... SOMEWHERE ELSE!', '#3af2ff', 36);
	}

	function stepPortals(dt) {
		for (const p of portals) {
			p.t += dt;
			const sp = proj(p.wall, p.x3, PORTAL_Y, p.z3);
			p.x = sp.x;
			p.y = sp.y;
		}
	}

	function tapPortal(p, hit) {
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { float(p.x, p.y - 100, 'HANDS FULL!', '#ffffff', 34); return; }
		chefs[i].held = p.item;
		if (!p.item.by.includes(i)) p.item.by.push(i);
		portals.splice(portals.indexOf(p), 1);
		doing(i, 'grab');
		show.fx('pop', 0.8, 0.8);
		float(p.x, p.y - 80, 'GOT IT!', '#3af2ff', 40);
	}

	/* ---------- the customers ---------- */

	const windowsNow = () => WINDOWS;   // (always the three delivery windows)
	const colW = (n) => (CHUTE - HATCH) / n;
	const colX = (k, n) => W + HATCH + colW(n) * (k + 0.5);

	function stepCustomers(dt) {
		const n = windowsNow();
		for (let k = 0; k < 4; k++) {
			const c = customers[k];
			if (!c) {
				if (k < n && (phase === 'tutorial' || phase === 'play')) {
					slotWait[k] -= dt;
					if (slotWait[k] <= 0) { customers[k] = newCustomer(k, n); murmur(customers[k], 6 + customers[k].parts.reduce((a, p) => a + p.steps.length + 1, 0)); }
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
		const type = recipe === FEAST ? { id: 'overlord', name: 'THE OVERLORD', skin: '#a8b08a' } : pick(types.length ? types : TYPES);
		const patience = PATIENCE[recipe.tier] * (phase === 'tutorial' ? 1 : shift.patience);
		show.fx('joinWall', 0.5);
		if (recipe === FEAST) show.fx('villainReveal', 0.6);
		return {
			k, type, recipe, patience, left: patience, age: 0, x: colX(k, n), state: 'wait', stateT: 0,
			parts: recipe.parts.map((p) => ({ ing: p[0], steps: p.slice(1), filled: false, item: null })),
			by: [], say: recipe === FEAST ? 'I HUNGER. BRING THE FEAST.' : pick(HELLO), sayT: 2.4, seed: Math.random() * 100,
			voice: recipe === FEAST ? 70 : 110 + Math.random() * 170,   // (each mutant's murmur its own pitch)
		};
	}

	const sameSteps = (a, b) => a.length === b.length && a.every((s, i) => s === b[i]);
	function fits(item, part) {
		if (!item || item.burnt || (part.ing !== '*' && item.ing !== part.ing) || part.filled) return false;
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
			else { cu.say = 'AND THE REST?'; cu.sayT = 1.6; murmur(cu, 4); }
			return;
		}
		const holder = hit.find((i) => chefs[i].held);
		if (holder !== undefined) {
			cu.say = chefs[holder].held.burnt ? 'IS THAT... CHARCOAL?' : pick(NOPE);
			murmur(cu, 5, 'cross');
			cu.sayT = 1.8;
			show.fx('buzz', 0.5);
		} else if (cu.sayT <= 0) {
			cu.say = 'WELL? I\'M WAITING.';
			murmur(cu, 4);
			cu.sayT = 1.4;
		}
	}

	function complete(c) {
		c.state = 'eat';
		c.stateT = 0;
		c.say = pick(YUM);
		murmur(c, 5, 'happy');
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
		float(c.x, queueAt(c.k, windowsNow()).say - 70, tip > 0 ? 'TIP +' + tip : 'SERVED', '#e9ff4a', 40);
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
		murmur(c, 6, 'cross');
		c.sayT = 2.4;
		streak = 0;
		walkouts++;
		show.fx('roundFail', 0.35);
		float(c.x, queueAt(c.k, windowsNow()).say - 70, 'WALKOUT!', '#ff4a32', 46);
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
			const d = pick(disp);
			d.jam = JAM_TAPS;
			d.shake = 1;
			setBanner('THE ' + INGS[d.ing].short + ' HATCH JAMMED!', 'TAP IT TO FIX IT', '#ffc21a');
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
		const portal = portals.find((p) => p.wall === wall && Math.abs(p.x - at.x) < 110 && Math.abs(p.y - at.y) < 130);
		if (portal) { tapPortal(portal, hit); return; }
		if (wall === 1) {
			if (lx < FRONT_L || lx >= FRONT_R) return;   // (the empty ends)
			tapCustomer(clamp(Math.floor((lx - HATCH) / colW(windowsNow())), 0, windowsNow() - 1), hit);
			return;
		}
		const slot = [0, 1, 2, 3].find((k) => Math.abs(lx / W - slotAlong(wall, k)) < SLOT_W / 2);
		if (slot === undefined) return;
		const s = stations.find((o) => o.wall === wall && o.slot === slot);
		const k = DISPENSERS.findIndex((d) => d.wall === wall && d.slot === slot);
		if (s) tapStation(s, hit);
		else if (k >= 0) tapDispenser(k, hit);
		else if (BIN.wall === wall && BIN.slot === slot) tapBinner(hit);
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

	/* ---------- 3D: one kitchen, all the way round ---------- */

	// One kitchen wraps round the room: the three walls look out from one
	// eye in the middle (createWallRig: one camera a wall, 90° apart, so they
	// meet seamlessly), at counters standing just beyond where the cooks can
	// reach. The room is the kitchen's floor: a player's cook stands where they
	// stand, carried further out as they near a wall (as GrooveWood's avatars
	// are), so each cook shows on the one wall it's in front of. A device sits
	// on its wall where the player stands to use it: a wall's along maps to the
	// same spot on screen at every depth (wallPoint). The outer eighth of every
	// wall is left empty (lockers and crates), and so is the back quarter of
	// each side wall; the devices share what's left.
	const EYE = 1.25;              // the walls look out from this high
	const AV_MAX = 2.45;           // the trays stand this far out, in front of the wall their player is nearest
	const CT = { y: 0.92, d: 3.1, deep: 0.7 };   // the counters: their top, how far out their front edge is, how deep they are
	const DEV_D = CT.d + 0.32;     // the devices stand this far out, on the counter
	const BACK = 4.3;              // the walls behind the counters (the front one's further, behind the window)
	const FRONT_BACK = 5.4;
	const QUEUE_D = 4.5;           // the mutants wait this far out, behind the front counter
	const MS = 0.4;                // the devices' machines, at kitchen size
	const PITCH = 0;               // (the walls look straight out)
	// a point on wall w, `along` it (0..1, as the tracking measures), `d` out from the middle
	function wallPoint(w, along, d) {
		if (w === 0) return { x: -d, z: (0.5 - along) * 2 * d };
		if (w === 1) return { x: (along - 0.5) * 2 * d, z: -d };
		return { x: d, z: (along - 0.5) * 2 * d };
	}
	const HOP_TIME = 0.5;   // (seconds to swing round to another wall)
	const faceEye = (x, z) => Math.atan2(-x, -z);   // (the yaw that turns a thing's front, +z, to the middle)
	const ISLAND = { y: CT.y };    // (the devices stand on the counters)
	// the front counter: a food hatch for each ingredient, then the binner
	const DISP_ALONG = DISPENSERS.map((d) => slotAlong(d.wall, d.slot));
	const BIN_ALONG = slotAlong(BIN.wall, BIN.slot);
	const ITEM_AT = { salt: 0.38, chop: 1.42, fry: 0.92, grill: 0.72, stir: 1.02, press: 0.5, inject: 0.62, warp: 0.7, cryo: 0.5 };   // an item's height on each device (its own units)
	const PORTAL_Y = CT.y + 0.15, PORTAL_D = CT.d + 0.32;   // warped food lands on a counter, in a ring of light

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.NeutralToneMapping;   // (keeps the colours bright)
	renderer.toneMappingExposure = 0.8;
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
	scene.background = new THREE.Color(0x07040e);
	post = createWallComposer(renderer, scene, { strength: 0.32, radius: 0.4, threshold: 1.0, cap: 1.6, fxaa: true });   // (a little glow on the neon, no more; FXAA, not multisampling: far quicker)
	// what the shiny plastic reflects: a bright candy-coloured room, a strip light overhead
	const ENV_SHADER = `
		vec3 envColor(vec3 d) {
			float up = d.y * 0.5 + 0.5;
			vec3 c = mix(vec3(0.55, 0.42, 0.62), vec3(0.72, 0.84, 1.0), up);
			c += vec3(1.0, 0.55, 0.35) * pow(max(0.0, dot(d, normalize(vec3(-1.0, 0.3, 0.2)))), 4.0) * 0.6;
			c += vec3(0.3, 0.9, 0.85) * pow(max(0.0, dot(d, normalize(vec3(1.0, 0.3, 0.2)))), 4.0) * 0.6;
			c += vec3(1.0, 0.98, 0.95) * pow(max(0.0, d.y), 16.0) * 2.0;
			return c * 0.8;
		}
	`;
	const envTex = environmentFromShader(renderer, ENV_SHADER);
	scene.environment = envTex;
	scene.environmentIntensity = 0.35;

	const walls = createWallRig({ fov: 64, aspect: W / H, near: 0.05, far: 60 });
	walls.rig.position.set(0, EYE, 0);
	scene.add(walls.rig);
	const cams = walls.cameras;
	for (const c of cams) c.updateMatrixWorld();
	const views = () => walls.views(renderer.domElement.width, renderer.domElement.height);
	// where a point in the kitchen lands on a wall (world pixels)
	const _v = new THREE.Vector3();
	function proj(wall, x, y, z) {
		_v.set(x, y, z);
		return toScreen(_v, cams[wall], wall * W, 0, W, H) || { x: wall * W + W / 2, y: H / 2, inside: false };
	}
	// a device's words: its sign over it, its prompt and bar under that, its middle
	function uiAt(wall, along, d) {
		const p = wallPoint(wall, along, d);
		return { x: proj(wall, p.x, 0, p.z).x, prompt: proj(wall, p.x, CT.y + 0.95, p.z).y, top: proj(wall, p.x, CT.y + 0.4, p.z).y };
	}
	for (const d of STATIONS) {
		const a = slotAlong(d.wall, d.slot);
		const p = wallPoint(d.wall, a, DEV_D);
		d.sx = p.x;
		d.sz = p.z;
		d.ui = uiAt(d.wall, a, DEV_D);
	}
	const DISP_UI = DISPENSERS.map((d, k) => uiAt(d.wall, DISP_ALONG[k], DEV_D));
	const BIN_UI = uiAt(BIN.wall, BIN_ALONG, DEV_D);
	// the mutants' windows: where the k-th of n stands, and where their words go
	function queueAt(k, n) {
		const a = (HATCH + colW(n) * (k + 0.5)) / W;
		const p = wallPoint(1, a, QUEUE_D);
		return { a, x: p.x, z: p.z, ticket: proj(1, p.x, 2.75, p.z).y, say: proj(1, p.x, 1.9, p.z).y, serve: proj(1, (a - 0.5) * 2 * CT.d, CT.y + 0.12, -CT.d).y - 18 };
	}

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
	// a machine in its colour: its plain parts (not its lights, glass or pictures) tinted toward it
	function tint(obj, colour, k = 0.6) {
		const c = new THREE.Color(colour);
		obj.traverse((o) => {
			if (!o.isMesh || !o.material.isMeshStandardMaterial || o.material.map || o.material.transparent) return;
			o.material = o.material.clone();
			o.material.color.lerp(c, k);
		});
		return obj;
	}

	// Fold everything under a group that never moves into one mesh per material: far fewer draws
	function bake(group) {
		group.updateMatrixWorld(true);
		const inv = group.matrixWorld.clone().invert();
		const byMat = new Map();
		group.traverse((o) => {
			if (!o.isMesh || Array.isArray(o.material)) return;   // (a mesh of many materials stays as it is)
			const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
			for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
			if (!geo.attributes.normal) geo.computeVertexNormals();
			if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
			geo.morphAttributes = {};
			geo.clearGroups();
			geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
			if (!byMat.has(o.material)) byMat.set(o.material, { geos: [], meshes: [], cast: false, receive: false });
			const b = byMat.get(o.material);
			b.cast ||= o.castShadow;
			b.receive ||= o.receiveShadow;
			b.geos.push(geo);
			b.meshes.push(o);
		});
		for (const [mat, b] of byMat) {
			if (b.meshes.length < 2) continue;
			const merged = mergeGeometries(b.geos, false);
			if (!merged) continue;   // (couldn't: left as they were)
			for (const o of b.meshes) o.removeFromParent();
			const m = new THREE.Mesh(merged, mat);
			m.castShadow = b.cast;
			m.receiveShadow = b.receive;
			group.add(m);
		}
		return group;
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
	const KITCHEN = { wall: ['#084a30', '#0a5638'],   // (deep emerald wall tiles: the user asked for emerald, then darker)
		edge: 0x161c1a, counter: 0x2a2230, light: 0xffd8b0 };
	// glossy wall tiles in two colours, the odd crack and drip
	function wallTex(a, b) {
		return tex(512, 512, function (c) {
			const rnd = seeded(b.charCodeAt(3) * 3);
			c.fillStyle = mix(a, '#000000', 0.3);
			c.fillRect(0, 0, 512, 512);
			for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
				const col = y % 2 ? a : b;   // (no pale band any more: the user asked)
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
	/* ---------- 3D: the kitchen ---------- */

	const room = new THREE.Group();
	scene.add(room);
	const sets = [room, room, room];   // (one kitchen: every wall's things in it)
	const fans = [];
	const signs = [];
	const sunbeams = { mats: [], motes: null, box: null };   // (the light streaming in at the window: see buildRoom)

	// Riveted metal plates (the counters: the user's own texture, an image of scuffed steel
	// plates with rows of rivets, embedded here: the hub has no room for another file). It covers
	// about 1.25 x 1 m, repeated over every face; the same picture, as a bump map, sinks the
	// seams and the scratches. w, h: the face it covers (metres).
	const PLATE_IMG = 'data:image/jpeg;base64,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';
	const PLATE_SIZE = { w: 1.25, h: 1.0 };
	let plateImg = null;
	const plateTexs = [];
	function stainless(w = 1, h = 1) {
		if (!plateImg) {
			plateImg = new Image();
			plateImg.onload = () => { for (const t of plateTexs) t.needsUpdate = true; };
			plateImg.src = PLATE_IMG;
		}
		const tex = (srgb) => {
			const t = new THREE.Texture(plateImg);
			if (srgb) t.colorSpace = THREE.SRGBColorSpace;
			t.wrapS = t.wrapT = THREE.RepeatWrapping;
			t.repeat.set(w / PLATE_SIZE.w, h / PLATE_SIZE.h);
			t.anisotropy = 8;
			if (plateImg.complete && plateImg.naturalWidth) t.needsUpdate = true;
			plateTexs.push(t);
			return t;
		};
		return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tex(true), bumpMap: tex(false), bumpScale: 2, metalness: 0.7, roughness: 0.6, envMapIntensity: 1.2 });
	}

	// the kitchen's height: tall enough that the tiles reach the top of the screen on every wall
	// (the side walls, nearest, show up to about 3.9 m; the user asked)
	const ROOM_H = 5;

	function buildRoom() {
		const look = KITCHEN;
		const g = new THREE.Group();   // (what never moves: baked into a few meshes at the end)
		room.add(g);
		// the floor, the ceiling
		const floor = mesh(new THREE.PlaneGeometry(14, 14), std(look.edge, 0.45, 0.05), g, 0, 0, -0.5);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		const ceil = mesh(new THREE.PlaneGeometry(14, 14), std(0x14181a, 0.8, 0), g, 0, ROOM_H, -0.5);
		ceil.rotation.x = Math.PI / 2;
		// the walls: tiled, behind the counters (the front one further back, behind the window)
		const wallMat = (w, h) => { const t = wallTex(look.wall[0], look.wall[1]); t.repeat.set(w / 2, h / 2); return std(0xffffff, 0.35, 0, { map: t }); };
		const L = mesh(new THREE.PlaneGeometry(BACK + FRONT_BACK, ROOM_H), wallMat(BACK + FRONT_BACK, ROOM_H), g, -BACK, ROOM_H / 2, (BACK - FRONT_BACK) / 2);
		L.rotation.y = Math.PI / 2;
		const Rw = mesh(new THREE.PlaneGeometry(BACK + FRONT_BACK, ROOM_H), wallMat(BACK + FRONT_BACK, ROOM_H), g, BACK, ROOM_H / 2, (BACK - FRONT_BACK) / 2);
		Rw.rotation.y = -Math.PI / 2;
		mesh(new THREE.PlaneGeometry(2 * BACK, ROOM_H), wallMat(2 * BACK, ROOM_H), g, 0, ROOM_H / 2, -FRONT_BACK);
		for (const m of [L, Rw]) m.receiveShadow = true;
		// the counters: one along each wall's active stretch, and the empty ends
		for (let w = 0; w < 3; w++) {
			const [a0, a1] = ACTIVE[w];
			const p0 = wallPoint(w, a0, CT.d + CT.deep / 2), p1 = wallPoint(w, a1, CT.d + CT.deep / 2);
			const len = Math.hypot(p1.x - p0.x, p1.z - p0.z);
			const cg = new THREE.Group();
			cg.position.set((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);
			cg.rotation.y = [Math.PI / 2, 0, -Math.PI / 2][w];   // (its front, +z, toward the room)
			g.add(cg);
			// (just a box of riveted plates, top and all: the user asked)
			const body = mesh(new THREE.BoxGeometry(len, CT.y, CT.deep), stainless(len, CT.y), cg, 0, CT.y / 2, 0);
			body.castShadow = body.receiveShadow = true;
			// (the empty ends of each wall are left clear: their crates and lockers went, the user asked)
		}
		// the front: the window onto the wasteland behind the mutants, and the neon over it
		const wa = HATCH / W, wb = CHUTE / W;
		const wl = wallPoint(1, wa, FRONT_BACK - 0.02), wr = wallPoint(1, wb, FRONT_BACK - 0.02);
		mesh(new THREE.PlaneGeometry(wr.x - wl.x, 2.4), new THREE.MeshBasicMaterial({ map: TEX.sky, color: new THREE.Color(0.42, 0.42, 0.42) }), g, 0, 1.6, -FRONT_BACK + 0.02);
		for (const x of [wl.x - 0.06, wr.x + 0.06]) mesh(BOX(0.14, 2.6, 0.16), MAT.darkSteel, g, x, 1.55, -FRONT_BACK + 0.08);
		mesh(BOX(wr.x - wl.x + 0.3, 0.14, 0.16), MAT.darkSteel, g, 0, 2.85, -FRONT_BACK + 0.08);
		buildSunbeams(wl.x, wr.x);
		// the neon signs: high on the side walls, facing into the kitchen (the user asked)
		// (both in real bent neon tubes, steady, no flicker: the user asked)
		buildNeonSign(-(BACK - 0.05), 2.88, 0, Math.PI / 2, [{ text: 'FISSION', colour: '#9dff3a' }, { text: 'CHIPS', colour: '#ff2d9a' }], 0xb8ff7a);
		buildNeonSign(BACK - 0.05, 2.88, 0, -Math.PI / 2, [{ text: 'OPEN', colour: '#ff2d9a' }, { text: '25/8', colour: '#ffd23a' }], 0xff8ac8);
		// light: a warm wash from overhead, a glow over each wall's counter
		// (the side ones hung in toward the middle, so they light the counters without a hot
		// spot of glow on the middle of the side walls: the user asked)
		for (const [x, z, k] of [[-1.0, 0.2, 8], [0, -2.6, 9], [1.0, 0.2, 8]]) {
			const l = new THREE.PointLight(look.light, k, 7, 1.4);
			l.position.set(x, 3.0, z);
			room.add(l);
		}
		// a rim of neon light on the mutants, from the window behind them
		const rim = new THREE.PointLight(0xc06bff, 5, 4.5, 1.6);
		rim.position.set(0, 2.3, -(QUEUE_D + 0.7));
		room.add(rim);
		bake(g);
	}
	buildRoom();

	// A sign in real neon: each letter bent from glass tube, glowing (bright enough to bloom),
	// its words side by side on one line, straight on the wall (no backing board), the tubes'
	// ends sleeved in black where they go into it, and a soft halo of their light on the wall
	// behind. Steady: no flicker.
	// (The letters: strokes in a box a unit tall, x from 0 to the letter's width.)
	function neonLetter(ch) {
		const L = (...pts) => ({ pts });   // (a polyline)
		const arc = (cx, cy, rx, ry, a0, a1, n = 18) => ({ pts: Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }) });
		const D = Math.PI / 180;
		switch (ch) {
			case 'F': return { w: 0.55, strokes: [L([0, 0], [0, 1], [0.55, 1]), L([0, 0.53], [0.42, 0.53])] };
			case 'I': return { w: 0.06, strokes: [L([0.03, 0], [0.03, 1])] };
			case 'S': return { w: 0.58, strokes: [{ pts: [...arc(0.29, 0.75, 0.27, 0.25, 15 * D, 270 * D, 16).pts, ...arc(0.29, 0.25, 0.29, 0.25, 90 * D, -165 * D, 16).pts.slice(1)] }] };
			case 'O': return { w: 0.62, strokes: [arc(0.31, 0.5, 0.31, 0.5, 0, Math.PI * 2, 28)] };
			case 'N': return { w: 0.6, strokes: [L([0, 0], [0, 1], [0.6, 0], [0.6, 1])] };
			case 'C': return { w: 0.58, strokes: [arc(0.32, 0.5, 0.32, 0.5, 40 * D, 320 * D, 24)] };
			case 'H': return { w: 0.58, strokes: [L([0, 0], [0, 1]), L([0.58, 0], [0.58, 1]), L([0, 0.5], [0.58, 0.5])] };
			case 'E': return { w: 0.52, strokes: [L([0.52, 1], [0, 1], [0, 0], [0.52, 0]), L([0, 0.52], [0.42, 0.52])] };
			case '2': return { w: 0.58, strokes: [{ pts: [...arc(0.29, 0.72, 0.27, 0.27, 160 * D, -35 * D, 16).pts, [0.02, 0], [0.58, 0]] }] };
			case '5': return { w: 0.58, strokes: [{ pts: [[0.55, 1], [0.07, 1], [0.04, 0.56], ...arc(0.3, 0.33, 0.28, 0.33, 120 * D, -150 * D, 18).pts] }] };
			case '/': return { w: 0.4, strokes: [L([0, 0], [0.4, 1])] };
			case '8': return { w: 0.58, strokes: [arc(0.29, 0.76, 0.23, 0.24, 0, Math.PI * 2, 22), arc(0.29, 0.26, 0.29, 0.26, 0, Math.PI * 2, 24)] };
			case 'P': return { w: 0.55, strokes: [{ pts: [[0, 0], [0, 1], [0.3, 1], ...arc(0.3, 0.74, 0.25, 0.26, 90 * D, -90 * D, 14).pts.slice(1), [0, 0.48]] }] };
			default: return { w: 0.4, strokes: [] };
		}
	}
	// x, y, z: where on its wall; turn: to face into the kitchen; wordList: [{ text, colour }]
	// on one line; spillColour: the light it throws on the counter below
	function buildNeonSign(x, y, z, turn, wordList, spillColour) {
		const sign = new THREE.Group();
		sign.position.set(x, y, z);
		sign.rotation.y = turn;
		room.add(sign);
		// (one line, the words side by side, the user asked)
		const H = 0.3, R = 0.013, GAP = 0.2, WORD = 0.7;
		const words = wordList.map((wd) => Object.assign({}, wd));
		for (const wd of words) { wd.letters = [...wd.text].map(neonLetter); wd.width = wd.letters.reduce((a, l) => a + l.w * H, 0) + GAP * H * (wd.letters.length - 1); }
		const widest = words.reduce((a, wd) => a + wd.width, 0) + WORD * H;
		const halo = [];
		let cx = -widest / 2;
		for (const wd of words) {
			const glass = glowMat(new THREE.Color(wd.colour), 2.6);
			const core = glowMat(new THREE.Color(wd.colour).lerp(new THREE.Color('#ffffff'), 0.55), 3.2);   // (the hot white-ish heart of the tube)
			for (const l of wd.letters) {
				for (const st of l.strokes) {
					const pts = st.pts.map(([px, py]) => new THREE.Vector3(cx + px * H, (py - 0.5) * H + 0.03, 0.06));
					halo.push({ pts, colour: wd.colour });
					const path = new THREE.CurvePath();
					for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
					const segs = Math.max(8, pts.length * 3);
					mesh(new THREE.TubeGeometry(path, segs, R, 8, false), glass, sign);
					mesh(new THREE.TubeGeometry(path, segs, R * 0.45, 6, false), core, sign);
					for (let i = 1; i < pts.length - 1; i++) mesh(SPH(R, 8), glass, sign, pts[i].x, pts[i].y, pts[i].z);   // (round the bends)
					for (const e of [pts[0], pts[pts.length - 1]]) {   // (black sleeves where the tube goes into the board)
						const sl = mesh(CYL(R * 1.35, R * 1.35, 0.06, 10), MAT.black, sign, e.x, e.y, 0.03);
						sl.rotation.x = Math.PI / 2;
					}
				}
				cx += (l.w + GAP) * H;
			}
			cx += (WORD - GAP) * H;
		}
		// (no backing board: the tubes go straight into the wall, the user asked; this is just the halo's size)
		const bw = widest + 0.3, bh = 0.5;
		// the halo: the tubes' light, blurred, on the wall round them
		const PX = 200, cw = Math.ceil((bw + 0.8) * PX), ch = Math.ceil((bh + 0.8) * PX);
		const haloTex = canvasTexture(cw, ch, (c) => {
			c.lineCap = c.lineJoin = 'round';
			for (const pass of [[34, 0.35], [12, 0.6]]) for (const hs of halo) {
				c.strokeStyle = hs.colour; c.globalAlpha = pass[1]; c.lineWidth = 10; c.shadowColor = hs.colour; c.shadowBlur = pass[0];
				c.beginPath();
				hs.pts.forEach((v, i) => { const px = cw / 2 + v.x * PX, py = ch / 2 - (v.y + 0.03) * PX; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
				c.stroke();
			}
		});
		const glow = mesh(new THREE.PlaneGeometry(bw + 0.8, bh + 0.8), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), sign, 0, -0.03 + 0.03, 0.017);
		glow.renderOrder = 3;
		// and real light from it, falling on the counters below
		const spill = new THREE.PointLight(spillColour, 1.6, 3.2, 1.6);
		spill.position.set(0, -0.2, 0.5);
		sign.add(spill);
		return sign;
	}

	// Light streaming in at the window: the low sun outside, falling down and in across the
	// kitchen. A warm spotlight from out there, its light shaped to the window by an unseen
	// wall around the opening (so the floor gets a window of light, the mutants' shadows in
	// it); soft shafts of light through the air, brighter in streaks, slowly shifting; and
	// dust turning over in them.
	function buildSunbeams(x0, x1) {
		const zW = -FRONT_BACK + 0.05, y0 = 0.45, y1 = 2.75;
		// the unseen wall round the window: it only casts shadows
		const mask = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
		const wallW = 2 * BACK;
		for (const [cx, cy, w, h] of [[(x0 - BACK) / 2 - 0.05, ROOM_H / 2, x0 + BACK, ROOM_H], [(x1 + BACK) / 2 + 0.05, ROOM_H / 2, BACK - x1, ROOM_H], [0, (y1 + ROOM_H) / 2, wallW, ROOM_H - y1], [0, y0 / 2, wallW, y0]]) {
			const b = mesh(new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), 0.04), mask, room, cx, cy, zW - 0.12);
			b.castShadow = true;
			b.renderOrder = -1;
		}
		const sunCol = new THREE.Color(0xffc98a);
		const sun = new THREE.SpotLight(sunCol, 60, 16, 0.62, 0.55, 1.2);
		sun.position.set(0.6, 4.6, zW - 3.2);
		sun.target.position.set(-0.2, 0, 1.2);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		sun.shadow.bias = -0.0006;
		sun.shadow.normalBias = 0.03;
		room.add(sun, sun.target);
		// the shafts: frustums from the window opening, out along the sun's way, each its own
		// slice of the window; drawn added on, fading with distance, soft at their edges
		const dir = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize();
		const shaftMat = () => new THREE.ShaderMaterial({
			uniforms: { uColor: { value: sunCol.clone() }, uAmount: { value: 0.5 }, uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
			vertexShader: `
				attribute float aLen; attribute float aCross;
				varying float vLen; varying float vCross; varying vec3 vN; varying vec3 vV;
				void main() {
					vLen = aLen; vCross = aCross;
					vec4 mv = modelViewMatrix * vec4(position, 1.0);
					vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: `
				uniform vec3 uColor; uniform float uAmount; uniform float uTime; uniform float uSeed;
				varying float vLen; varying float vCross; varying vec3 vN; varying vec3 vV;
				void main() {
					float face = pow(abs(dot(vN, vV)), 1.6);                     // (soft at the edges, seen side-on)
					float along = smoothstep(0.0, 0.06, vLen) * pow(1.0 - vLen, 1.7);   // (from the window, fading out)
					float streak = 0.55 + 0.45 * sin(vCross * 37.0 + uSeed + uTime * 0.23) * sin(vCross * 13.0 - uTime * 0.17 + uSeed);
					float a = uAmount * face * along * streak;
					gl_FragColor = vec4(uColor * a, a);
				}`,
			transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
		});
		function shaft(ax, bx, ay, by, len, spread, amount) {
			const near = [[ax, ay], [bx, ay], [bx, by], [ax, by]].map(([x, y]) => new THREE.Vector3(x, y, zW));
			const mid = near.reduce((v, q) => v.add(q), new THREE.Vector3()).multiplyScalar(0.25);
			const far = near.map((q) => q.clone().sub(mid).multiplyScalar(spread).add(mid).addScaledVector(dir, len));
			const pos = [], lenA = [], crossA = [];
			for (let k = 0; k < 4; k++) {
				const a = near[k], b = near[(k + 1) % 4], c = far[(k + 1) % 4], d = far[k];
				for (const [v, l, cr] of [[a, 0, k], [b, 0, k + 1], [c, 1, k + 1], [a, 0, k], [c, 1, k + 1], [d, 1, k]]) { pos.push(v.x, v.y, v.z); lenA.push(l); crossA.push(cr / 4); }
			}
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
			geo.setAttribute('aLen', new THREE.Float32BufferAttribute(lenA, 1));
			geo.setAttribute('aCross', new THREE.Float32BufferAttribute(crossA, 1));
			geo.computeVertexNormals();
			const mat = shaftMat();
			mat.uniforms.uAmount.value = amount;
			const m = new THREE.Mesh(geo, mat);
			m.renderOrder = 5;
			m.frustumCulled = false;
			room.add(m);
			sunbeams.mats.push({ mat, base: amount, seed: Math.random() * 6 });
		}
		const span = x1 - x0;
		shaft(x0, x1, y0, y1, 7.5, 1.35, 0.16);   // (the whole window's glow)
		const rnd = seeded(41);
		for (let k = 0; k < 6; k++) {   // (and brighter shafts within it)
			const c = x0 + span * (0.08 + rnd() * 0.84), w = span * (0.03 + rnd() * 0.07);
			const t = y0 + (y1 - y0) * (0.3 + rnd() * 0.6), h = (y1 - y0) * (0.12 + rnd() * 0.3);
			shaft(c - w / 2, c + w / 2, t - h, t, 6 + rnd() * 2, 1.2 + rnd() * 0.3, 0.22 + rnd() * 0.18);
		}
		// dust in the light: motes drifting through the shafts, catching it
		const N = 260, mp = new Float32Array(N * 3), seeds = [];
		for (let i = 0; i < N; i++) {
			const u = Math.random(), base = new THREE.Vector3(x0 + Math.random() * span, y0 + Math.random() * (y1 - y0), zW).addScaledVector(dir, 0.3 + u * 5.5);
			seeds.push({ base, ph: Math.random() * 6, sp: 0.2 + Math.random() * 0.5 });
			mp.set([base.x, base.y, base.z], i * 3);
		}
		const mg = new THREE.BufferGeometry();
		mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
		const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: TEX.soft, color: 0xffe2b8, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
		motes.frustumCulled = false;
		room.add(motes);
		sunbeams.motes = { motes, seeds, pos: mp };
	}
	// (every frame: the shafts breathe and shift; the dust turns over)
	function stepSunbeams(t) {
		for (const s of sunbeams.mats) {
			s.mat.uniforms.uTime.value = t;
			s.mat.uniforms.uAmount.value = s.base * (0.82 + 0.18 * Math.sin(t * 0.35 + s.seed) * Math.sin(t * 0.21 + s.seed * 2));
		}
		const d = sunbeams.motes;
		if (!d) return;
		d.seeds.forEach((q, i) => {
			const a = t * q.sp + q.ph;
			d.pos[i * 3] = q.base.x + Math.sin(a) * 0.12;
			d.pos[i * 3 + 1] = q.base.y + Math.sin(a * 0.7 + 1) * 0.1;
			d.pos[i * 3 + 2] = q.base.z + Math.cos(a * 0.8) * 0.12;
		});
		d.motes.geometry.attributes.position.needsUpdate = true;
	}
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

	// the key light, from overhead behind the eye, its shadow over the whole kitchen
	scene.add(new THREE.HemisphereLight(0x8a94c0, 0x3a2418, 0.55));
	const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
	sun.position.set(0.5, 9, 3);
	sun.target.position.set(0, 0, -1);
	scene.add(sun, sun.target);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.02;

	/* ---------- 3D: the stations ---------- */

	const STATION_3D = {
		// the CHOPPER: a heavy steel chamber, a square hopper on top, and down inside it two
		// toothed drums churning against each other (they spin up hard as it's fed); a dark
		// window in its front glowing from within, a chute below, a motor on its side
		chop(g, p) {
			const body = new THREE.Group();
			g.add(body);
			p.body = body;
			const steel = std(0xb8c0c6, 0.3, 0.85);
			const dark = std(0x2a2c32, 0.45, 0.5);
			mesh(superBox(1.9, 1.0, 1.3, 0.25, 0.2, 0.25, 32), steel, body, 0, 0.5, 0);
			mesh(BOX(1.96, 0.1, 1.36), MAT.hazard, body, 0, 0.2, 0);
			// the hopper: a square funnel, open at the top, down into the chamber
			const hopper = mesh(lathe([[0.62, 0.98], [0.66, 0.98], [1.06, 1.62], [1.0, 1.62]], 4, 8), std(0x9aa2a8, 0.35, 0.8, { side: THREE.DoubleSide }), body, 0, 0, 0);
			hopper.rotation.y = Math.PI / 4;
			// the drums: two of them, side by side, turning against each other, rows of teeth on each
			p.drums = [];
			const toothMat = std(0xe6ecef, 0.15, 1);
			const drumMat = std(0x55595f, 0.35, 0.8);
			for (const zz of [-0.16, 0.16]) {
				const drum = new THREE.Group();
				drum.position.set(0, 1.04, zz);
				body.add(drum);
				const core = mesh(CYL(0.15, 0.15, 0.8, 20), drumMat, drum);
				core.rotation.z = Math.PI / 2;
				for (let r = 0; r < 6; r++) for (let t = 0; t < 8; t++) {
					const a = t / 8 * Math.PI * 2 + r * 0.4 + (zz > 0 ? 0.2 : 0);
					const tooth = mesh(new THREE.ConeGeometry(0.05, 0.16, 6), toothMat, drum, -0.33 + r * 0.132, Math.sin(a) * 0.2, Math.cos(a) * 0.2);
					tooth.quaternion.setFromUnitVectors(_up, new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
				}
				p.drums.push(drum);
			}
			// a glow from down in the chamber, under the drums
			p.maw = mesh(new THREE.PlaneGeometry(0.86, 0.86), glowMat(0xff3b2a, 1.2, { transparent: true, opacity: 0.8 }), body, 0, 1.005, 0);
			p.maw.rotation.x = -Math.PI / 2;
			// the front: a dark window glowing from within, rivets round it, a chute below
			const win = mesh(superBox(0.9, 0.36, 0.06, 0.3, 0.3, 0.3, 20), std(0x120808, 0.05, 0.3, { clearcoat: 1, clearcoatRoughness: 0 }), body, -0.25, 0.6, 0.64);
			win.castShadow = false;
			p.window = mesh(new THREE.PlaneGeometry(0.8, 0.27), glowMat(0xff3b2a, 0.5, { transparent: true, opacity: 0.6 }), body, -0.25, 0.6, 0.675);
			for (const [rx, ry] of [[-0.68, 0.76], [0.18, 0.76], [-0.68, 0.44], [0.18, 0.44]]) mesh(SPH(0.03, 8), steel, body, rx, ry, 0.66);
			const chute = mesh(BOX(0.42, 0.08, 0.36), dark, body, 0.55, 0.34, 0.72);
			chute.rotation.x = 0.35;
			// the motor: a finned drum on its right flank, a belt guard
			const motor = new THREE.Group();
			motor.position.set(1.05, 0.62, -0.05);
			body.add(motor);
			const mc = mesh(CYL(0.26, 0.26, 0.42, 24), dark, motor);
			mc.rotation.z = Math.PI / 2;
			for (let f = 0; f < 5; f++) { const fin = mesh(CYL(0.29, 0.29, 0.025, 24), steel, motor, -0.15 + f * 0.075, 0, 0); fin.rotation.z = Math.PI / 2; }
			p.fan = mesh(BOX(0.04, 0.4, 0.06), steel, motor, 0.24, 0, 0);
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
		// the salter: a giant shaker on an arm over a pad, glowing salt when it's shaken
		salt(g, p) {
			mesh(BOX(1.7, 0.2, 1.1), MAT.black, g, 0, 0.1, 0);
			mesh(CYL(0.55, 0.55, 0.06, 32), MAT.steel, g, 0, 0.23, 0);
			mesh(BOX(0.16, 2.1, 0.16), MAT.darkSteel, g, 0.95, 1.05, -0.4);
			mesh(BOX(1.0, 0.12, 0.12), MAT.darkSteel, g, 0.45, 2.05, -0.4);
			const shaker = new THREE.Group();
			shaker.position.set(0, 1.5, 0);
			g.add(shaker);
			mesh(CYL(0.34, 0.34, 0.85, 28), std(0xe8f4ff, 0.3, 0.1), shaker, 0, 0.25, 0);
			mesh(new THREE.SphereGeometry(0.34, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.steel, shaker, 0, -0.18, 0);
			for (let n = 0; n < 7; n++) { const a = n / 7 * Math.PI * 2; mesh(SPH(0.03, 6), glowMat(0xd8ffd0, 1.6), shaker, Math.cos(a) * 0.16, -0.47, Math.sin(a) * 0.16); }
			mesh(CYL(0.38, 0.38, 0.08, 28), MAT.steel, shaker, 0, 0.7, 0);
			p.shaker = shaker;
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
			g.position.set(s.sx, CT.y + 0.02, s.sz);
			g.rotation.y = faceEye(s.sx, s.sz);
			g.scale.setScalar(MS);
			sets[s.wall].add(g);
			const p = { g };
			STATION_3D[s.kind](g, p);
			tint(g, s.colour);
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

	/* ---------- 3D: the food hatches, the binner ---------- */

	// An icon (the same picture the order tickets use) and a name, painted
	// straight onto a wall or a machine: on a clear texture, the paint a little
	// worn, a few runs under the letters
	function labelTex(text, colour, key, rnd) {
		return canvasTexture(512, 384, function (c, cw, ch) {
			c.clearRect(0, 0, cw, ch);
			simpleIcon(c, key, cw / 2, 136, 118);
			c.font = `800 ${text.length > 7 ? 68 : 80}px ${FONT}, sans-serif`;
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillStyle = ICON_COLOUR[key] || colour;
			c.fillText(text, cw / 2, 326, cw - 24);
			// (runs of paint from the bottoms of the letters)
			for (let n = 0; n < 5; n++) c.fillRect(70 + rnd() * (cw - 140), 356, 3 + rnd() * 3, 6 + rnd() * 22);
			// (worn: specks of the wall showing through)
			c.globalCompositeOperation = 'destination-out';
			for (let n = 0; n < 160; n++) { c.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.7})`; c.beginPath(); c.arc(rnd() * cw, rnd() * ch, 0.6 + rnd() * 3.2, 0, Math.PI * 2); c.fill(); }
		});
	}
	// (painted once everything's defined, the food pictures included, and again once the lettering's loaded)
	const paintJobs = [];
	function paintMat(make) {
		const m = std(0xffffff, 0.75, 0, { transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0xffffff, emissiveIntensity: 0.25 });
		paintJobs.push(function () {
			if (m.map) m.map.dispose();
			const tex = make();
			Object.assign(m, { map: tex, emissiveMap: tex, opacity: 1 });
			m.needsUpdate = true;
		});
		return m;
	}

	// Each ingredient is a pile of it, heaped on the counter (no shelf of it on the wall
	// above any more: the user asked). Built on the first frame: the food's models are
	// defined further down.
	const disp3d = DISPENSERS.map(function ({ ing, wall }, k) {
		const a = DISP_ALONG[k];
		const p = wallPoint(wall, a, DEV_D);
		const g = new THREE.Group();
		g.position.set(p.x, CT.y + 0.01, p.z);
		g.rotation.y = faceEye(p.x, p.z);
		room.add(g);
		return { g, ing, built: false };
	});
	function buildPiles() {
		disp3d.forEach(function (d3, k) {
			if (d3.built) return;
			d3.built = true;
			const rnd = seeded(k * 53 + 11);
			const raw = { ing: d3.ing, steps: [], burnt: false };
			const piece = (s) => { const v = itemView(raw); v.userData = {}; v.scale.setScalar(s); return v; };   // (not a held item: never swept)
			// the heap: a wide bottom layer, fewer on top, one at the peak
			const heap = new THREE.Group();
			d3.g.add(heap);
			for (let n = 0; n < 12; n++) {
				const layer = n < 7 ? 0 : n < 11 ? 1 : 2;
				const ang = rnd() * Math.PI * 2, rad = [0.3, 0.16, 0][layer] * (0.6 + rnd() * 0.4);
				const v = piece(0.42);
				v.position.set(Math.cos(ang) * rad, layer * 0.1, Math.sin(ang) * rad * 0.7);
				v.rotation.set((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4);
				heap.add(v);
			}
			shadows(heap);
			bake(heap);
		});
	}
	const bin3d = (function () {
		const p = wallPoint(BIN.wall, BIN_ALONG, DEV_D);
		const g = new THREE.Group();
		g.position.set(p.x, CT.y + 0.01, p.z);
		g.rotation.y = faceEye(p.x, p.z);
		room.add(g);
		mesh(BOX(0.52, 0.62, 0.46), std(0x4a2a7a, 0.35, 0.2), g, 0, 0.31, 0);
		mesh(BOX(0.56, 0.05, 0.5), MAT.steel, g, 0, 0.63, 0);
		mesh(new THREE.CircleGeometry(0.16, 40), new THREE.MeshBasicMaterial({ color: 0x0a0418 }), g, 0, 0.42, 0.232);
		const swirl = mesh(new THREE.CircleGeometry(0.15, 40), glowMat(0xffffff, 1.1, { map: TEX.swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), g, 0, 0.42, 0.234);
		mesh(new THREE.TorusGeometry(0.165, 0.018, 10, 40), glowMat(0xd04dff, 1.4), g, 0, 0.42, 0.236);
		tint(g, '#d04dff', 0.5);
		shadows(g);
		return { g, swirl };
	})();

	/* ---------- 3D: the names, painted on the walls; the delivery plates ---------- */

	// Over every slot on the side walls (tool, food hatch or binner), its icon
	// (the same as on the tickets) big, and its name under it, painted straight
	// onto the tiles behind it
	const slotPaint = STATIONS.map((st) => [st.wall, st.slot, st.name, st.colour, st.kind])
		.concat(DISPENSERS.map((d) => [d.wall, d.slot, INGS[d.ing].short, INGS[d.ing].glow, d.ing]))
		.concat([[BIN.wall, BIN.slot, 'BINNER', '#d04dff', 'bin']]);
	for (const [w, slot, name, colour, key] of slotPaint) {
		const rnd = seeded(w * 4 + slot + 7);
		const p = wallPoint(w, slotAlong(w, slot), BACK - 0.01);
		const m = mesh(new THREE.PlaneGeometry(0.92, 0.69), paintMat(() => labelTex(name, colour, key, seeded(w * 4 + slot + 7))), room, p.x, 2.15, p.z);
		m.rotation.set(0, [Math.PI / 2, 0, -Math.PI / 2][w], (rnd() - 0.5) * 0.05);
	}
	// the three delivery windows: a serving plate and a bell on the counter in front of
	// each (no SERVE painted under them any more: the user asked)
	for (let k = 0; k < WINDOWS; k++) {
		const a = (HATCH + colW(WINDOWS) * (k + 0.5)) / W;
		const p = wallPoint(1, a, CT.d + 0.3);
		mesh(CYL(0.22, 0.2, 0.025, 40), MAT.steel, room, p.x, CT.y + 0.015, p.z).receiveShadow = true;
		const b = wallPoint(1, a + 0.05, CT.d + 0.45);
		mesh(new THREE.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xe9c04a, 0.2, 1), room, b.x, CT.y + 0.01, b.z);
		mesh(SPH(0.012, 8), std(0xe9c04a, 0.2, 1), room, b.x, CT.y + 0.075, b.z);
	}

	/* ---------- 3D: food ---------- */

	// each ingredient, about 0.6 across, sitting on y = 0
	const ING_3D = {
		spud(g, mat, glow) {
			const body = mesh(SPH(0.22, 24), mat, g, 0, 0.17, 0);
			body.scale.set(1.35, 0.8, 1);
			for (const [x, y, z, r] of [[0.16, 0.2, 0.08, 0.1], [-0.15, 0.22, -0.06, 0.09], [0.02, 0.27, 0.1, 0.08]]) mesh(SPH(r, 14), mat, g, x, y, z);
			for (const [x, y, z] of [[-0.1, 0.3, 0.12], [0.18, 0.22, -0.12], [0.05, 0.13, 0.22], [-0.22, 0.14, 0.05]]) mesh(SPH(0.03, 8), glow, g, x, y, z);
		},
		mutato(g, mat) {
			const body = mesh(SPH(0.22, 24), mat, g, 0, 0.17, 0);
			body.scale.set(1.3, 0.85, 1);
			for (const [x, y, z, r] of [[0.15, 0.22, 0.05, 0.1], [-0.16, 0.2, -0.05, 0.09]]) mesh(SPH(r, 14), mat, g, x, y, z);
			for (const x of [-0.11, 0, 0.11]) {
				mesh(SPH(0.055, 12), MAT.white, g, x, 0.25, 0.16);
				const pu = mesh(SPH(0.028, 10), MAT.black, g, x, 0.25, 0.16);
				pu.position.addScaledVector(TOWARD, 0.04);
			}
		},
		// slop: a dented tin bowl heaped with lumpy, glistening goop, chunks in it, a bubble
		// or two glowing, a dribble over the rim and a ladle stuck in
		slop(g, mat, glow) {
			const tin = std(0x8a9290, 0.35, 0.85);
			const bowl = mesh(sculpt(lathe([[0.12, 0], [0.16, 0.01], [0.2, 0.08], [0.23, 0.17], [0.235, 0.19], [0.22, 0.19], [0.19, 0.1], [0.14, 0.03], [0, 0.03]], 40, 24), (p) => -0.012 * Math.max(0, Math.sin(p.x * 18 + 1) * Math.sin(p.z * 15)) ), tin, g);
			bowl.material.side = THREE.DoubleSide;
			const goop = mesh(sculpt(new THREE.SphereGeometry(0.21, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), (p) => lumpy(p, 6) * 0.018 + Math.sin(p.x * 30) * Math.sin(p.z * 27) * 0.006), mat, g, 0, 0.15, 0);
			goop.scale.y = 0.55;
			const chunk = std(0x4a6a2a, 0.6, 0);
			for (const [x, z, r] of [[0.07, 0.04, 0.035], [-0.08, -0.03, 0.03], [0.0, -0.09, 0.025], [-0.03, 0.08, 0.028]]) { const c = mesh(superBox(r * 2, r * 1.4, r * 1.8, 0.5, 0.5, 0.5, 12), chunk, g, x, 0.25 - Math.hypot(x, z) * 0.35, z); c.rotation.set(x * 9, z * 7, x * 5); }
			for (const [x, z, r] of [[0.05, -0.05, 0.022], [-0.06, 0.06, 0.016], [0.1, 0.07, 0.012]]) mesh(SPH(r, 10), glow, g, x, 0.255 - Math.hypot(x, z) * 0.4, z);
			tube(g, [[0.2, 0.2, 0.05], [0.235, 0.17, 0.07], [0.245, 0.1, 0.08], [0.24, 0.05, 0.08]], 0.02, 0.012, mat, 8, 14);
			tube(g, [[-0.04, 0.2, 0.0], [-0.12, 0.32, -0.04], [-0.2, 0.42, -0.07]], 0.012, 0.012, tin, 8, 12);
			const scoop = mesh(SPH(0.045, 14), tin, g, -0.03, 0.2, 0.01);
			scoop.scale.y = 0.5;
		},
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
		if (has('chop')) {
			// chips: a heap of sticks, or once they're fried, a bundle stood up in a paper cone
			const rnd = seeded(item.ing.length * 13 + item.steps.length);
			const fried = has('fry');
			if (fried) {
				mesh(CYL(0.2, 0.13, 0.3, 24, true), std(0xd8263a, 0.5, 0, { side: THREE.DoubleSide }), inner, 0, 0.15, 0);
				mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), std(0xf4f0e6, 0.5, 0), inner, 0, 0.3, 0).rotation.x = Math.PI / 2;
			}
			for (let n = 0; n < 11; n++) {
				const stick = mesh(BOX(0.055, 0.055, 0.36), mat, inner, 0, 0, 0);
				if (fried) { stick.position.set((rnd() - 0.5) * 0.2, 0.32 + rnd() * 0.08, (rnd() - 0.5) * 0.16); stick.rotation.set(Math.PI / 2 + (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5); }
				else { stick.position.set((rnd() - 0.5) * 0.3, 0.04 + (n % 3) * 0.05, (rnd() - 0.5) * 0.25); stick.rotation.set(0, rnd() * Math.PI, 0); }
			}
		} else {
			const g = new THREE.Group();
			ING_3D[item.ing](g, mat, glow);
			inner.add(g);
		}
		if (has('salt') && !item.burnt) for (let n = 0; n < 16; n++) mesh(SPH(0.014, 6), glowMat(0xeaffd8, 1.8), root, (Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.25);
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
	const itemsShown = new Set();   // (every held item's view on show: swept each frame)
	function syncItem(holder, item, parent, x, y, z, s) {
		const key = item ? keyOf(item) : '';
		if (holder.view && (holder.viewKey !== key || holder.view.parent !== parent)) { holder.view.removeFromParent(); itemsShown.delete(holder.view); holder.view = null; }
		holder.viewKey = key;
		if (!item) return null;
		if (!holder.view) { holder.view = itemView(item); parent.add(holder.view); itemsShown.add(holder.view); }
		holder.view.position.set(x, y, z);
		holder.view.scale.setScalar(s || 1);
		itemsLive.add(holder.view);
		return holder.view;
	}

	/* ---------- 3D: the mutants ---------- */

	// Moulded shapes, not balls: bodies turned on a lathe from a smooth profile,
	// surfaces pushed and pulled into lumps, limbs as tapering tubes, eyes under
	// lids, mouths cut out as bevelled slabs.

	// (vertices that share a place share a normal: no creases at seams and poles)
	function smoothSeams(geo) {
		const pos = geo.attributes.position, nor = geo.attributes.normal;
		const at = new Map();
		for (let i = 0; i < pos.count; i++) {
			const key = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
			if (!at.has(key)) at.set(key, []);
			at.get(key).push(i);
		}
		const n = new THREE.Vector3(), s = new THREE.Vector3();
		for (const list of at.values()) {
			if (list.length < 2) continue;
			s.set(0, 0, 0);
			for (const i of list) s.add(n.fromBufferAttribute(nor, i));
			s.normalize();
			for (const i of list) nor.setXYZ(i, s.x, s.y, s.z);
		}
		nor.needsUpdate = true;
		return geo;
	}
	// a body turned on a lathe: a smooth curve through [radius, height] points, bottom to top
	function lathe(prof, seg = 44, n = 48) {
		const pts = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n);
		for (const p of pts) p.x = Math.max(0, p.x);
		pts[0].x = Math.max(0, prof[0][0]);
		pts[pts.length - 1].x = Math.max(0, prof[prof.length - 1][0]);
		const geo = new THREE.LatheGeometry(pts, seg);
		geo.pts = pts;
		return smoothSeams(geo);
	}
	// a point on a lathed body's surface (profile point i, turned to angle a), and its outward normal
	function onLathe(geo, i, a) {
		const p = geo.pts, q = p[i], t0 = p[Math.max(0, i - 1)], t1 = p[Math.min(p.length - 1, i + 1)];
		const dr = t1.x - t0.x, dy = t1.y - t0.y, l = Math.hypot(dr, dy) || 1;
		return {
			pos: new THREE.Vector3(Math.sin(a) * q.x, q.y, Math.cos(a) * q.x),
			normal: new THREE.Vector3(Math.sin(a) * dy / l, -dr / l, Math.cos(a) * dy / l).normalize(),
		};
	}
	// push a surface in and out along its normals: fn(position, normal) → distance
	function sculpt(geo, fn) {
		const pos = geo.attributes.position, nor = geo.attributes.normal;
		const v = new THREE.Vector3(), n = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i);
			n.fromBufferAttribute(nor, i);
			v.addScaledVector(n, fn(v, n));
			pos.setXYZ(i, v.x, v.y, v.z);
		}
		geo.computeVertexNormals();
		return smoothSeams(geo);
	}
	// a tapering tube through points: tentacles, arms, beaks
	function tube(parent, pts, r0, r1, mat, rs = 12, ts = 28) {
		const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
		const geo = new THREE.TubeGeometry(curve, ts, 1, rs, false);
		const pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
		for (let i = 0; i <= ts; i++) {
			curve.getPointAt(i / ts, c);
			const u = i / ts, r = lerp(r0, r1, u) * (u < 0.08 ? 0.75 + u / 0.08 * 0.25 : 1);
			for (let j = 0; j <= rs; j++) {
				const k = i * (rs + 1) + j;
				v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
				pos.setXYZ(k, v.x, v.y, v.z);
			}
		}
		geo.computeVertexNormals();
		const m = mesh(smoothSeams(geo), mat, parent);
		const end = curve.getPointAt(1);
		mesh(SPH(r1, 12), mat, parent, end.x, end.y, end.z);   // (its rounded tip)
		return m;
	}
	// a low moulded dome sitting on a surface: pustules, spots, studs
	function blister(parent, pos, normal, r, mat, tall = 0.5) {
		const m = mesh(lathe([[0, -r * 0.2], [r, -r * 0.1], [r * 0.85, r * tall * 0.6], [0, r * tall]], 20, 16), mat, parent, pos.x, pos.y, pos.z);
		m.quaternion.setFromUnitVectors(_up, normal);
		return m;
	}
	// a flat shape, bevelled into a moulded slab
	function slab(shape, depth, bevel, mat, parent) {
		const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 20 });
		geo.translate(0, 0, -depth / 2);
		return mesh(geo, mat, parent);
	}
	// a mouth: a crescent, smiling (or frowning), set into the face
	// A mouth: the dark inside, a hint of teeth along the top, and lips round it (fuller
	// below) in the skin, flushed; the whole of it works when they talk.
	function grin(parent, x, y, z, w, h, frown, mat) {
		const mouth = new THREE.Group();
		mouth.position.set(x, y, z);
		if (frown) mouth.rotation.z = Math.PI;
		parent.add(mouth);
		const s = new THREE.Shape();
		s.moveTo(-w / 2, 0);
		s.quadraticCurveTo(0, -h * 2, w / 2, 0);
		s.quadraticCurveTo(0, -h * 0.5, -w / 2, 0);
		slab(s, 0.02, Math.min(0.03, w * 0.08), mat || MOUTH, mouth);
		const q = (y0, cy, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, x0 = -w / 2 + w * t; return [x0 * 1.04, (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * cy + t * t * 0 + y0, 0.012 - Math.abs(t - 0.5) * 0.02]; });
		const lipMat = partSink ? partSink.lip : MOUTH;
		if (partSink) {
			tube(mouth, q(0.004, -h * 0.5), Math.max(0.007, h * 0.28), Math.max(0.005, h * 0.2), lipMat, 8, 18);   // (the upper lip)
			tube(mouth, q(-0.004, -h * 2.15), Math.max(0.009, h * 0.36), Math.max(0.005, h * 0.22), lipMat, 8, 18);   // (the lower, fuller)
			for (let k = -2; k <= 2; k++) mesh(BOX(w * 0.1, h * 0.35, 0.01), TEETH, mouth, k * w * 0.11, -h * 0.55 - Math.abs(k) * h * 0.12, 0.006);
		}
		if (partSink) partSink.mouths.push(mouth);   // (building a mutant: it talks with this)
		return mouth;
	}
	const TEETH = std(0xf2ead2, 0.3, 0, { clearcoat: 0.6 });
	const NOSTRIL = std(0x2a0e12, 0.7, 0);
	// a mouth's inside: dark, wet, a little red
	const MOUTH = std(0x2a0a14, 0.25, 0, { clearcoat: 1, clearcoatRoughness: 0.1 });
	let partSink = null;   // (while a mutant is built: where its eyes and mouths are listed)
	// An eye: a wet white ball, a coloured iris and a pupil that turn together to look at
	// things (eye.look), a glint, and lids in the skin (droop: how heavy the upper lid hangs),
	// the upper one blinking (eye.lid). The whites glow a little, to read white in the dim kitchen.
	const EYE_WHITE = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, emissive: 0xfff4ee, emissiveIntensity: 0.45, clearcoat: 1, clearcoatRoughness: 0.02 });
	const irisMats = {};
	const irisMat = (hex) => irisMats[hex] || (irisMats[hex] = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.35, emissive: hex, emissiveIntensity: 0.35, clearcoat: 1, clearcoatRoughness: 0.02 }));
	const PUPIL = new THREE.MeshPhysicalMaterial({ color: 0x050308, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0 });
	const cap = (r, ang) => { const gm = new THREE.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, ang); gm.rotateX(Math.PI / 2); return gm; };   // (a cap of a sphere, facing +z)
	function eyeBall(g, x, y, z, r, lid, droop = 0.25) {
		const eg = new THREE.Group();
		eg.position.set(x, y, z);
		g.add(eg);
		mesh(SPH(r, 24), EYE_WHITE, eg);
		const look = new THREE.Group();
		eg.add(look);
		mesh(cap(r * 1.004, 0.62), irisMat(partSink ? partSink.iris : '#ffb21f'), look);
		mesh(cap(r * 1.008, 0.27), PUPIL, look);
		mesh(SPH(r * 0.13, 8), MAT.white, look, r * 0.3, r * 0.32, r * 0.93);   // (the glint)
		const eye = { look, lid: null, open: 0, droop };
		if (lid) {
			const up = new THREE.Group();
			eg.add(up);
			mesh(new THREE.SphereGeometry(r * 1.12, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), lid, up);
			eye.lid = up;
			eye.open = -0.55 + droop * 0.7;   // (the lid's angle, open: tipped back, showing the eye)
			up.rotation.x = eye.open;
			const low = mesh(new THREE.SphereGeometry(r * 1.1, 28, 8, 0, Math.PI * 2, Math.PI * 0.74, Math.PI * 0.26), lid, eg);
			low.rotation.x = -0.35;
		}
		if (partSink) partSink.eyes.push(eye);
		return look;
	}
	// a smooth little noise for lumps: sines at odd angles
	const lumpy = (p, k = 1) => (Math.sin(p.x * 4.1 * k + 1.3) * Math.sin(p.y * 3.7 * k + 0.4) + Math.sin(p.z * 5.3 * k + p.x * 2.1 * k) * 0.6 + Math.sin(p.y * 7.9 * k + p.z * 3.3 * k) * 0.3);

	// Mutant humans. They share a body: a torso in their clothes, shoulders and arms with
	// hands resting forward, a neck, and a head sculpted with a brow, cheekbones, sockets
	// and a chin, a nose and ears. Then each kind mutates it.
	const CLOTH = (hex, rough = 0.75) => std(hex, rough, 0);
	const BUTTON = std(0xe8dcc0, 0.3, 0.1, { clearcoat: 0.8 });
	// a human head: o = { w (width), long (taller), lumps, sockets (false: no eye sockets), nose, ears }
	function humanHead(parent, skin, o = {}) {
		const w = o.w || 1, long = o.long || 1;
		const gauss = (a, s) => Math.exp(-(a * a) / (s * s));
		const geo = sculpt(lathe([[0, -0.32], [0.13, -0.3], [0.2, -0.22], [0.24, -0.08], [0.26, 0.08], [0.24, 0.22], [0.16, 0.32], [0, 0.35]], 48, 40), (p, n) => {
			const front = Math.pow(Math.max(0, n.z), 1.5), ax = Math.abs(p.x);
			let d = 0.026 * gauss(p.y - 0.085, 0.03) * gauss(p.x, 0.16) * front;   // (the brow)
			d += 0.022 * gauss(ax - 0.13, 0.05) * gauss(p.y + 0.05, 0.05) * front;   // (cheekbones)
			if (o.sockets !== false) d -= 0.03 * gauss(ax - 0.085, 0.045) * gauss(p.y - 0.02, 0.04) * front;   // (eye sockets)
			d += 0.02 * gauss(p.y + 0.27, 0.05) * gauss(p.x, 0.07) * front;   // (the chin)
			d -= 0.015 * gauss(ax - 0.2, 0.06) * gauss(p.y + 0.18, 0.08);   // (the jaw's hollow)
			d -= 0.008 * gauss(ax - 0.06 - (p.y + 0.1) * -0.35, 0.012) * gauss(p.y + 0.12, 0.06) * front;   // (the folds from nose to mouth)
			d += 0.01 * gauss(p.y + 0.215, 0.025) * gauss(p.x, 0.05) * front;   // (the dip and swell under the lip)
			d -= 0.008 * gauss(ax - 0.215, 0.03) * gauss(p.y - 0.1, 0.06);   // (the temples)
			if (o.lumps) d += lumpy(p, 3) * 0.012 * o.lumps;
			return d;
		});
		const h = mesh(geo, skin, parent);
		h.scale.set(0.9 * w, long, 1);
		if (o.nose !== false) {
			const nose = mesh(superBox(0.055, 0.11, 0.075, 0.55, 0.35, 0.5, 24), skin, parent, 0, -0.06, 0.245);
			nose.rotation.x = -0.28;
			for (const s of [-1, 1]) mesh(SPH(0.0095, 8), NOSTRIL, parent, s * 0.016, -0.108, 0.268).scale.set(1.3, 0.7, 1);   // (nostrils)
			for (const s of [-1, 1]) mesh(SPH(0.02, 12), skin, parent, s * 0.03, -0.098, 0.252);   // (the wings of the nose)
		}
		if (o.ears !== false) for (const s of [-1, 1]) {
			const ear = mesh(superBox(0.035, 0.11, 0.075, 0.6, 0.5, 0.5, 20), skin, parent, s * 0.235 * w, 0, -0.01);
			ear.rotation.y = s * 0.35;
			const inner = mesh(superBox(0.012, 0.07, 0.04, 0.6, 0.5, 0.5, 14), NOSTRIL, parent, s * (0.235 * w + 0.016), 0.005, 0.0);
			inner.rotation.y = s * 0.35;
		}
		// the eyebrows: arched strokes of hair over the eyes (one across for a single eye)
		if (o.brows !== false && partSink) {
			const hair = partSink.hairMat;
			const sides = o.unibrow ? [0] : [-1, 1];
			for (const s of sides) {
				const b = new THREE.Group();
				b.position.set(s * 0.088, 0.105, 0.232);
				parent.add(b);
				const span = o.unibrow ? 0.14 : 0.06;
				tube(b, [[-span, -0.008, -0.01], [-span * 0.3, 0.006, 0.004], [span * 0.4, 0.006, 0.004], [span, -0.01, -0.012]], 0.012, 0.007, hair, 8, 14);
				b.userData.side = s || 1;
				partSink.brows.push({ g: b, side: s, y: b.position.y });
			}
		}
		return h;
	}
	// a body: the torso in its clothes (shoulder width, belly), a neck, two arms with hands
	// resting forward (sleeves in the cloth unless bare). Returns the shoulder points.
	function humanBody(g, skin, cloth, o = {}) {
		const sh = o.shoulders || 0.4, belly = o.belly || 0;
		const gauss = (a, sd) => Math.exp(-(a * a) / (sd * sd));
		const torso = mesh(sculpt(lathe([[0, 0.35], [0.34, 0.37], [0.36 + belly * 0.5, 0.7], [0.33 + belly * 0.3, 0.92], [0.36 + belly * 0.2, 1.1], [sh + 0.02, 1.3], [sh - 0.04, 1.45], [0.15, 1.55], [0, 1.56]], 44, 40),
			(p, n) => {
				const front = Math.max(0, n.z), back = Math.max(0, -n.z), ax = Math.abs(p.x);
				let d = belly * 0.12 * gauss(p.y - 0.8, 0.2) * front;
				if (!o.bare || belly < 0.5) d += 0.03 * gauss(ax - 0.14, 0.08) * gauss(p.y - 1.24, 0.08) * front;   // (the chest)
				d += 0.02 * gauss(ax - 0.15, 0.08) * gauss(p.y - 1.28, 0.1) * back;   // (shoulder blades)
				d -= 0.012 * gauss(p.x, 0.02) * gauss(p.y - 1.25, 0.12) * back;   // (the spine)
				if (!o.bare) d += lumpy(p, 5) * 0.004;   // (the cloth's creases)
				return d;
			}), cloth, g);
		torso.scale.z = 0.66;
		// the neck, set into the shoulders; a collar round it in the cloth
		mesh(lathe([[0.125, 0], [0.11, 0.08], [0.098, 0.18], [0.1, 0.25]], 24, 10), skin, g, 0, 1.5, 0.01);
		if (!o.bare) {
			const collar = mesh(new THREE.TorusGeometry(0.125, 0.026, 10, 28), cloth, g, 0, 1.54, 0.01);
			collar.rotation.x = Math.PI / 2 - 0.15;
			collar.scale.set(1, 0.85, 1);
		}
		// buttons down the front (on the slimmer ones)
		if (!o.bare && belly < 0.3 && o.buttons !== false) for (let k = 0; k < 4; k++) {
			const b = mesh(CYL(0.016, 0.016, 0.012, 12), BUTTON, g, 0, 1.18 - k * 0.15, 0.238 + (k > 1 ? -0.008 : 0));
			b.rotation.x = Math.PI / 2;
		}
		if (o.arms !== false) for (const s of [-1, 1]) {
			const sleeve = o.bare ? skin : cloth;
			// a round shoulder, the upper arm, the forearm out toward the counter, a cuff
			mesh(SPH(0.11, 20), sleeve, g, s * (sh - 0.04), 1.38, 0).scale.set(1, 0.85, 0.95);
			tube(g, [[s * (sh - 0.02), 1.4, 0], [s * (sh + 0.1), 1.12, 0.06], [s * (sh + 0.1), 1.0, 0.16]], 0.088, 0.072, sleeve, 14, 20);
			const fore = o.bareForearm || o.bare ? skin : sleeve;
			tube(g, [[s * (sh + 0.1), 1.0, 0.16], [s * (sh - 0.02), 0.95, 0.32], [s * (sh - 0.1), 0.94, 0.44]], 0.068, 0.055, fore, 14, 18);
			if (!o.bare && !o.bareForearm) { const cuff = mesh(new THREE.TorusGeometry(0.056, 0.012, 8, 20), sleeve, g, s * (sh - 0.1), 0.94, 0.44); cuff.lookAt(g.localToWorld(new THREE.Vector3(s * (sh - 0.2), 0.94, 0.56))); }
			// the hand: a palm resting on the counter's edge, four fingers curled over it, a thumb
			const hand = new THREE.Group();
			hand.position.set(s * (sh - 0.12), 0.925, 0.49);
			hand.rotation.y = -s * 0.3;
			g.add(hand);
			mesh(superBox(0.09, 0.034, 0.09, 0.5, 0.4, 0.5, 18), skin, hand, 0, 0, 0);
			for (let f = 0; f < 4; f++) {
				const fx = (f - 1.5) * 0.022, lenK = [0.85, 1, 0.95, 0.75][f];
				tube(hand, [[fx, 0.004, 0.035], [fx, 0.004, 0.035 + 0.04 * lenK], [fx, -0.012, 0.035 + 0.062 * lenK], [fx, -0.034, 0.035 + 0.07 * lenK]], 0.0115, 0.0085, skin, 8, 12);
			}
			tube(hand, [[-s * 0.04, 0, 0.0], [-s * 0.065, 0.004, 0.03], [-s * 0.072, -0.004, 0.06]], 0.013, 0.009, skin, 8, 10);
		}
		return torso;
	}
	// a shirt collar and tie down the chest
	function shirtAndTie(g, tieHex, y = 1.3) {
		const shirt = new THREE.Shape();
		shirt.moveTo(-0.13, 0.22); shirt.lineTo(0.13, 0.22); shirt.lineTo(0, -0.2); shirt.lineTo(-0.13, 0.22);
		const s1 = slab(shirt, 0.02, 0.015, CLOTH(0xf0ece4, 0.6), g);
		s1.position.set(0, y, 0.235);
		s1.rotation.x = -0.18;
		if (!tieHex) return;
		const tie = new THREE.Shape();
		tie.moveTo(-0.03, 0.2); tie.lineTo(0.03, 0.2); tie.lineTo(0.055, -0.12); tie.lineTo(0, -0.2); tie.lineTo(-0.055, -0.12); tie.lineTo(-0.03, 0.2);
		const t1 = slab(tie, 0.02, 0.012, std(tieHex, 0.45, 0), g);
		t1.position.set(0, y - 0.02, 0.255);
		t1.rotation.x = -0.18;
	}
	const topHat = (parent, felt, band, x, y, z, k = 1) => {
		const hat = new THREE.Group();
		hat.position.set(x, y, z);
		hat.scale.setScalar(k);
		parent.add(hat);
		mesh(lathe([[0, -0.01], [0.32, -0.01], [0.34, 0.02], [0.2, 0.035], [0.19, 0.18], [0.2, 0.36], [0.19, 0.4], [0, 0.4]]), felt, hat);
		mesh(CYL(0.197, 0.192, 0.06, 32), band, hat, 0, 0.07, 0);
		return hat;
	};

	const MUTANT_3D = {
		// Blobbo & Blobba: conjoined twins, one great lumpy body, a bald head each, glowing boils
		blob(g, skin, m) {
			const body = humanBody(g, skin, skin, { shoulders: 0.5, belly: 0.9, bare: true });
			body.material = skin;
			const vestMat = CLOTH(0x4a3a6a);
			for (const s of [-1, 1]) {   // (a tiny vest that can't close: a panel each side)
				const vest = new THREE.Shape();
				vest.moveTo(s * 0.1, 0.3); vest.lineTo(s * 0.34, 0.3); vest.lineTo(s * 0.36, -0.25); vest.lineTo(s * 0.12, -0.3); vest.lineTo(s * 0.1, 0.3);
				const v = slab(vest, 0.03, 0.015, vestMat, g);
				v.position.set(0, 1.08, 0.3);
				v.rotation.x = -0.2;
			}
			m.heads = [];
			for (const x of [-0.27, 0.27]) {
				const h = new THREE.Group();
				h.position.set(x, 1.75, 0);
				h.rotation.z = x * 0.6;
				g.add(h);
				humanHead(h, skin, { lumps: 1.5, w: 1.05 });
				eyeBall(h, -0.085, 0.02, 0.2, 0.052, skin, x < 0 ? 0.6 : 0.15);
				eyeBall(h, 0.085, 0.02, 0.2, 0.052, skin, x < 0 ? 0.6 : 0.15);
				grin(h, 0, -0.16, 0.235, 0.13, 0.035, x < 0);
				m.heads.push(h);
			}
			const glow = glowMat(0xb8ff6a, 1.5);
			for (const [x, y, r] of [[-0.25, 0.9, 0.05], [0.18, 0.7, 0.04], [0.32, 1.05, 0.035], [-0.05, 1.2, 0.03], [0.05, 0.55, 0.04]]) blister(g, new THREE.Vector3(x, y, 0.36), new THREE.Vector3(x * 0.6, 0, 1).normalize(), r, glow, 0.8);
		},
		// Sir Oculus: a gentleman in a frock coat, one great eye in the middle of his face, a monocle, a moustache, a top hat
		cyclops(g, skin) {
			const coat = CLOTH(0x5a3ab8);
			humanBody(g, skin, coat, { shoulders: 0.38 });
			shirtAndTie(g, 0xc02a2a);
			const head = new THREE.Group();
			head.position.set(0, 1.9, 0.02);
			g.add(head);
			humanHead(head, skin, { sockets: false, long: 1.05, unibrow: true });
			const socket = mesh(SPH(0.12, 24), std(0x2a1020, 0.6, 0), head, 0, 0.03, 0.17);
			socket.scale.set(1, 0.85, 0.5);
			eyeBall(head, 0, 0.03, 0.17, 0.11, skin, 0.45);
			const mono = mesh(new THREE.TorusGeometry(0.135, 0.012, 10, 36), std(0xe9c04a, 0.2, 1), head, 0, 0.03, 0.29);
			faceCam(mono);
			for (const s of [-1, 1]) tube(head, [[0, -0.12, 0.26], [s * 0.06, -0.13, 0.27], [s * 0.12, -0.1, 0.24], [s * 0.15, -0.05, 0.22]], 0.02, 0.006, std(0x2a1a14, 0.6, 0), 8, 14);
			grin(head, 0, -0.19, 0.235, 0.1, 0.025, true);
			topHat(head, std(0x16141e, 0.45, 0.2), std(0x8a1a2a, 0.5, 0), 0.02, 0.3, -0.02, 0.85).rotation.z = -0.12;
		},
		// Gary (a mould): a worker in overalls, half his head lost under a heaving growth of mould, eyes in it
		mold(g, skin) {
			const rnd = seeded(7);
			humanBody(g, skin, CLOTH(0x6a7a3a), { shoulders: 0.4, bareForearm: true });
			const tag = mesh(BOX(0.14, 0.07, 0.015), std(0xf4f0e0, 0.6, 0), g, -0.15, 1.32, 0.245);
			tag.rotation.x = -0.15;
			const head = new THREE.Group();
			head.position.set(0, 1.88, 0.02);
			g.add(head);
			humanHead(head, skin, {});
			eyeBall(head, -0.085, 0.02, 0.2, 0.05, skin, 0.5);
			grin(head, -0.04, -0.16, 0.235, 0.1, 0.025, true);
			// the growth: a lumpy mass over his right side and crown, spreading down onto his shoulder
			const dark = skin.clone();
			dark.color.multiplyScalar(0.55);
			const bumps = [];
			for (let k = 0; k < 9; k++) bumps.push({ c: new THREE.Vector3(0.6 + rnd() * 0.5, rnd() * 1.2 - 0.2, rnd() * 0.8 - 0.2).normalize(), a: 0.08 + rnd() * 0.1, k: 5 + rnd() * 5 });
			const geo = new THREE.SphereGeometry(1, 56, 40);
			const pos = geo.attributes.position, v = new THREE.Vector3();
			for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const d = v.clone().normalize(); v.multiplyScalar(0.18 + bumps.reduce((acc, b) => acc + b.a * Math.exp(-(1 - d.dot(b.c)) * b.k), 0) + lumpy(d, 2) * 0.01); pos.setXYZ(i, v.x, v.y, v.z); }
			geo.computeVertexNormals();
			smoothSeams(geo);
			const growth = mesh(geo, dark, head, 0.1, 0.06, 0.0);
			growth.scale.set(1, 1.1, 1);
			const lump2 = mesh(SPH(0.16, 24), dark, g, 0.3, 1.45, 0.02);
			lump2.scale.set(1.2, 0.7, 1);
			for (const [x, y, z, r] of [[0.14, 0.05, 0.2, 0.045], [0.22, 0.17, 0.12, 0.032], [0.08, 0.2, 0.17, 0.028], [0.3, 1.5 - 1.88, 0.12, 0.03]]) eyeBall(head, x, y, z, r, dark, rnd());
			const spore = glowMat(0xe9ff4a, 1.3);
			for (let k = 0; k < 8; k++) { const d = new THREE.Vector3(0.5 + rnd() * 0.6, rnd() - 0.3, 0.4 + rnd() * 0.5).normalize(); blister(head, d.clone().multiplyScalar(0.27).add(new THREE.Vector3(0.1, 0.06, 0)), d, 0.018 + rnd() * 0.015, spore, 0.8); }
		},
		// Executive Pigeon: a businessman whose face has gone bird: a hooked beak, round eyes set wide, feather tufts, an iridescent neck
		pigeon(g, skin, m) {
			const suit = CLOTH(0x2a4ab0);
			humanBody(g, skin, suit, { shoulders: 0.4 });
			shirtAndTie(g, 0xc02a2a);
			mesh(lathe([[0.1, -0.02], [0.15, 0.06], [0.13, 0.16], [0.1, 0.2]], 32, 14), std(0x4ab09a, 0.2, 0.6, { side: THREE.DoubleSide }), g, 0, 1.55, 0.01);
			const head = new THREE.Group();
			head.position.set(0, 1.88, 0.05);
			g.add(head);
			humanHead(head, skin, { nose: false, sockets: false, ears: false, w: 1.05, brows: false });
			eyeBall(head, -0.13, 0.04, 0.17, 0.05, skin, 0.35);
			eyeBall(head, 0.13, 0.04, 0.17, 0.05, skin, 0.35);
			tube(head, [[0, -0.02, 0.22], [0, -0.05, 0.33], [0, -0.12, 0.41]], 0.07, 0.012, std(0xe8a83c, 0.35, 0), 14, 18);
			mesh(superBox(0.09, 0.03, 0.09, 0.5, 0.5, 0.5, 16), std(0xd8933a, 0.4, 0), head, 0, -0.1, 0.27);
			for (let k = 0; k < 5; k++) { const f = mesh(new THREE.ConeGeometry(0.025, 0.12, 8), skin, head, (k - 2) * 0.04, 0.34, -0.02 - Math.abs(k - 2) * 0.02); f.rotation.set(-0.3, 0, (k - 2) * 0.3); }
			m.head = head;
		},
		// Lil' Doomskull: a kid in a hazmat suit, a skull for a face with green fire in the sockets, under a glass dome
		skull(g, skin) {
			const suit = CLOTH(0xff8a1a, 0.55);
			const kid = new THREE.Group();
			kid.scale.setScalar(0.85);
			kid.position.y = 0.15;
			g.add(kid);
			humanBody(kid, skin, suit, { shoulders: 0.34 });
			mesh(BOX(0.18, 0.06, 0.02), std(0x1a1a1a, 0.4, 0), kid, 0, 1.2, 0.235).rotation.x = -0.1;
			for (const x of [-0.06, 0.06]) mesh(SPH(0.018, 8), glowMat(x < 0 ? 0xff4a32 : 0x9dff3a, 2), kid, x, 1.2, 0.25);
			const head = new THREE.Group();
			head.position.set(0, 1.93, 0.02);
			head.scale.setScalar(1.18);
			kid.add(head);
			humanHead(head, skin, { nose: false, ears: false, brows: false });
			const socket = new THREE.Shape();
			socket.absellipse(0, 0, 0.05, 0.042, 0, Math.PI * 2);
			for (const x of [-0.085, 0.085]) {
				const s = slab(socket, 0.02, 0.012, std(0x0a0608, 0.6, 0), head);
				s.position.set(x, 0.02, 0.215);
				s.rotation.y = x * 2.2;
				blister(head, new THREE.Vector3(x, 0.02, 0.235), new THREE.Vector3(0, 0, 1), 0.018, glowMat(0x9dff3a, 2.4), 0.9);
			}
			const nose = new THREE.Shape();
			nose.moveTo(0, 0.025); nose.lineTo(0.022, -0.022); nose.lineTo(-0.022, -0.022); nose.lineTo(0, 0.025);
			slab(nose, 0.01, 0.008, std(0x0a0608, 0.6, 0), head).position.set(0, -0.07, 0.245);
			for (let n = -3; n <= 3; n++) mesh(BOX(0.026, 0.04, 0.02), MAT.white, head, n * 0.028, -0.16, 0.23 - Math.abs(n) * 0.008);
			mesh(lathe([[0.3, -0.05], [0.36, 0.1], [0.36, 0.3], [0.24, 0.5], [0, 0.56]], 40, 32), MAT.glass, head, 0, -0.06, 0);
			mesh(CYL(0.31, 0.32, 0.05, 32), MAT.steel, head, 0, -0.33, 0);
		},
		// Mrs. Tentacles: a lady in a frock and pearls, her hair in curlers, tentacles for arms and a beard of them at her chin
		squid(g, skin, m) {
			const dress = CLOTH(0xd04a8a, 0.7);
			humanBody(g, skin, dress, { shoulders: 0.36, arms: false });
			for (let k = 0; k < 9; k++) { const a = (k - 4) * 0.22; mesh(SPH(0.022, 10), std(0xfff8f0, 0.15, 0.1, { clearcoat: 1 }), g, Math.sin(a) * 0.14, 1.5 - Math.cos(a) * 0.07 + 0.07, 0.12 + Math.cos(a) * 0.03); }
			m.arms = [];
			for (const s of [-1, 1]) for (let j = 0; j < 2; j++) {
				const arm = new THREE.Group();
				arm.position.set(s * 0.36, 1.36 - j * 0.12, 0.02);
				g.add(arm);
				tube(arm, [[0, 0, 0], [s * 0.12, -0.15, 0.08], [s * 0.1, -0.38, 0.22], [s * 0.0, -0.45, 0.4], [-s * 0.06, -0.38, 0.5]], 0.075 - j * 0.015, 0.016, skin, 12, 32);
				m.arms.push(arm);
			}
			const head = new THREE.Group();
			head.position.set(0, 1.88, 0.02);
			g.add(head);
			humanHead(head, skin, {});
			eyeBall(head, -0.085, 0.02, 0.2, 0.055, skin, 0.55);
			eyeBall(head, 0.085, 0.02, 0.2, 0.055, skin, 0.55);
			grin(head, 0, -0.14, 0.24, 0.11, 0.03, false, std(0xc02a6a, 0.35, 0, { clearcoat: 1 }));
			for (let k = -2; k <= 2; k++) tube(head, [[k * 0.035, -0.2, 0.2], [k * 0.04, -0.3, 0.22], [k * 0.05, -0.4, 0.2], [k * 0.07, -0.44, 0.24]], 0.022, 0.006, skin, 8, 16);
			const curler = std(0x7ad8ff, 0.4, 0.1);
			for (const [x, y, z] of [[-0.14, 0.3, 0.02], [0, 0.35, -0.02], [0.14, 0.3, 0.02], [-0.08, 0.28, -0.16], [0.08, 0.28, -0.16]]) { const c = mesh(CYL(0.045, 0.045, 0.12, 18), curler, head, x, y, z); c.rotation.z = Math.PI / 2; }
		},
		// Dude Shroom: a surfer in a loud shirt, a great mushroom cap growing out of his head, shades, a lazy grin
		fungus(g, skin) {
			humanBody(g, skin, CLOTH(0xff7a1a, 0.7), { shoulders: 0.4, bareForearm: true });
			for (const [x, y] of [[-0.2, 1.2], [0.15, 1.0], [0.25, 1.35], [-0.1, 0.8], [0.05, 1.3]]) { const f = mesh(superBox(0.08, 0.08, 0.02, 0.5, 0.5, 0.5, 12), std(0x2ae8ff, 0.6, 0), g, x, y, 0.3); f.rotation.z = x * 3; }
			const head = new THREE.Group();
			head.position.set(0, 1.86, 0.02);
			g.add(head);
			humanHead(head, skin, {});
			const capGeo = sculpt(lathe([[0.18, 0.18], [0.4, 0.17], [0.6, 0.22], [0.66, 0.3], [0.58, 0.45], [0.36, 0.62], [0, 0.68]]), (p) => { const r = Math.hypot(p.x, p.z); return Math.sin(Math.atan2(p.z, p.x) * 6) * 0.025 * clamp((r - 0.4) / 0.25, 0, 1); });
			const capMat = std(0xe0573a, 0.45, 0, { clearcoat: 0.6 });
			mesh(capGeo, capMat, head);
			mesh(new THREE.RingGeometry(0.18, 0.6, 40, 1), std(0xd8c8a8, 0.8, 0, { side: THREE.DoubleSide }), head, 0, 0.175, 0).rotation.x = Math.PI / 2;
			for (const [i, a, r] of [[30, -0.7, 0.08], [38, 0.3, 0.07], [27, 0.9, 0.07], [34, 2.4, 0.08], [44, -2.0, 0.06], [24, -1.6, 0.06]]) { const sp = onLathe(capGeo, i, a); blister(head, sp.pos, sp.normal, r, MAT.white, 0.35); }
			const lens = new THREE.Shape();
			lens.absellipse(0, 0, 0.06, 0.035, 0, Math.PI * 2);
			for (const x of [-0.085, 0.085]) { const l = slab(lens, 0.01, 0.01, std(0x080808, 0.05, 0.9), head); l.position.set(x, 0.03, 0.245); l.rotation.y = x * 1.6; }
			mesh(BOX(0.06, 0.012, 0.012), std(0x080808, 0.05, 0.9), head, 0, 0.035, 0.255);
			grin(head, 0.02, -0.16, 0.235, 0.12, 0.03, false);
			const mini = mesh(lathe([[0, 0], [0.06, 0.01], [0.07, 0.05], [0.03, 0.08], [0, 0.085]], 20, 12), capMat, g, -0.33, 1.47, 0);
			mini.scale.setScalar(1.2);
		},
		// The Overlord: a robed bulk with gold shoulders, his skull gone, a vast ridged brain throbbing where it was, a crown turning above
		overlord(g, skin, m) {
			const robe = CLOTH(0x7a3ad0, 0.6);
			humanBody(g, skin, robe, { shoulders: 0.5, belly: 0.4 });
			const gold = std(0xe9c04a, 0.25, 1);
			for (const s of [-1, 1]) { const pad = mesh(lathe([[0, -0.05], [0.22, -0.05], [0.2, 0.08], [0.1, 0.14], [0, 0.15]], 32, 16), gold, g, s * 0.45, 1.42, 0); pad.rotation.z = -s * 0.5; }
			const head = new THREE.Group();
			head.position.set(0, 1.85, 0.02);
			g.add(head);
			humanHead(head, skin, { long: 0.9 });
			eyeBall(head, -0.085, 0.02, 0.2, 0.055, skin, 0.5);
			eyeBall(head, 0.085, 0.02, 0.2, 0.055, skin, 0.5);
			grin(head, 0, -0.17, 0.23, 0.13, 0.03, true);
			const bgeo = new THREE.SphereGeometry(0.55, 72, 54);
			smoothSeams(bgeo);
			const brain = mesh(sculpt(bgeo, (p) => 0.035 * Math.abs(Math.sin(p.x * 16 + Math.sin(p.y * 10) * 2) * Math.sin(p.y * 15 + Math.sin(p.z * 12) * 2)) - 0.09 * Math.exp(-p.x * p.x / 0.002) * Math.max(0, p.y / 0.55)),
				std(0xe88aa8, 0.3, 0, { emissive: 0x501030, emissiveIntensity: 0.4, clearcoat: 0.8 }), head, 0, 0.42, -0.04);
			brain.scale.set(1, 0.75, 0.95);
			m.brain = brain;
			const crown = new THREE.Group();
			crown.position.set(0, 0.95, -0.04);
			head.add(crown);
			mesh(lathe([[0.36, -0.07], [0.4, -0.05], [0.41, 0.04], [0.38, 0.09], [0.35, 0.07]], 40, 16), gold, crown);
			for (let n = 0; n < 7; n++) { const a = n / 7 * Math.PI * 2; const sp = mesh(lathe([[0.05, 0], [0.04, 0.08], [0.015, 0.2], [0, 0.22]], 14, 10), gold, crown, Math.sin(a) * 0.38, 0.06, Math.cos(a) * 0.38); sp.rotation.set(Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15); }
			blister(crown, new THREE.Vector3(0, 0.01, 0.41), new THREE.Vector3(0, 0, 1), 0.06, glowMat(0xff2d8f, 2), 0.8);
			m.crown = crown;
		},
	};

	const mutantModels = {};
	function mutantModel(type, c) {
		const kept = mutantModels[type.id];
		if (kept && customers.some((o) => o && o !== c && o.model === kept)) return buildMutant(type);   // (two of a kind in at once: the second gets its own)
		return kept || (mutantModels[type.id] = buildMutant(type));
	}
	// Each kind's skin: how wet it is, the colour its veins glow and its irises.
	const SKIN = {
		blob: { wet: 1, glow: '#b8ff6a', iris: '#ffd23a', hair: '#3a3020' },
		cyclops: { wet: 0.25, glow: '#b07aff', iris: '#3af2ff', hair: '#d8d0c0' },
		mold: { wet: 0.7, glow: '#e9ff4a', iris: '#ff3ad8', hair: '#5a4a2a' },
		pigeon: { wet: 0, glow: '#6ab8ff', iris: '#ff7a1a', hair: '#5a6070' },
		skull: { wet: 0.3, glow: '#9dff3a', iris: '#9dff3a' },
		squid: { wet: 1, glow: '#ff6ac8', iris: '#7aff3a', hair: '#8a3a5a' },
		fungus: { wet: 0.15, glow: '#ffb03a', iris: '#ffb03a', hair: '#e8c070' },
		overlord: { wet: 0.5, glow: '#ff2d8f', iris: '#ff2d8f', hair: '#3a2a1a' },
	};
	// Mutant skin, painted: the colour mottled in big soft patches, freckled and pored, with
	// veins branching across it; the veins glow (the emissive map) in the kind's colour.
	function skinMat(type) {
		const k = SKIN[type.id] || { wet: 0.4, glow: '#9dff3a' };
		const rnd = seeded(type.id.length * 97 + type.id.charCodeAt(0));
		const S = 512, base = new THREE.Color(type.skin);
		const hex = (c) => '#' + c.getHexString();
		const veins = [];
		for (let v = 0; v < 7; v++) {   // (each vein a wandering line that forks)
			const pts = [[rnd() * S, rnd() * S]];
			let a = rnd() * Math.PI * 2;
			for (let j = 0; j < 26; j++) { a += (rnd() - 0.5) * 0.9; const [px, py] = pts[pts.length - 1]; pts.push([px + Math.cos(a) * 12, py + Math.sin(a) * 12]); }
			veins.push({ pts, w: 1.5 + rnd() * 2.5, fork: Math.floor(6 + rnd() * 14) });
		}
		const drawVeins = (c, style, wk) => {
			c.strokeStyle = style; c.lineCap = 'round'; c.lineJoin = 'round';
			for (const v of veins) {
				c.lineWidth = v.w * wk;
				c.beginPath(); v.pts.forEach(([px, py], j) => (j ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke();
				c.lineWidth = v.w * wk * 0.55;
				c.beginPath(); v.pts.slice(v.fork).forEach(([px, py], j) => (j ? c.lineTo(px + j * 3, py - j * 4) : c.moveTo(px, py))); c.stroke();
			}
		};
		const blots = Array.from({ length: 26 }, () => [rnd() * S, rnd() * S, 30 + rnd() * 110, rnd() < 0.5 ? 1 : -1]);
		const specks = Array.from({ length: 900 }, () => [rnd() * S, rnd() * S, 0.6 + rnd() * 2.2, rnd()]);
		const map = canvasTexture(S, S, (c) => {
			c.fillStyle = hex(base); c.fillRect(0, 0, S, S);
			for (const [bx, by, br, sgn] of blots) {
				const gr = c.createRadialGradient(bx, by, 0, bx, by, br);
				const tone = sgn > 0 ? base.clone().lerp(new THREE.Color('#ffffff'), 0.18) : base.clone().multiplyScalar(0.72);
				gr.addColorStop(0, hex(tone)); gr.addColorStop(1, 'rgba(0,0,0,0)');
				c.fillStyle = gr; c.globalAlpha = 0.55; c.fillRect(bx - br, by - br, br * 2, br * 2); c.globalAlpha = 1;
			}
			drawVeins(c, hex(base.clone().multiplyScalar(0.6)), 1.6);
			for (const [px, py, pr, t] of specks) { c.fillStyle = t < 0.8 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); }
		});
		const glow = canvasTexture(S, S, (c) => {
			c.fillStyle = '#000'; c.fillRect(0, 0, S, S);
			c.shadowColor = '#fff'; c.shadowBlur = 6;
			drawVeins(c, '#ffffff', 0.8);
		});
		for (const t of [map, glow]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 4; }
		const mat = new THREE.MeshPhysicalMaterial({
			color: 0xffffff, map, roughness: 0.62 - k.wet * 0.45, metalness: 0,
			emissive: k.glow, emissiveMap: glow, emissiveIntensity: 0.4,
			sheen: 0.8, sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.5), sheenRoughness: 0.5,
			clearcoat: k.wet, clearcoatRoughness: 0.08,
		});
		mat.userData = { glow: k.glow };
		return mat;
	}
	function buildMutant(type) {
		const g = new THREE.Group();
		const skin = skinMat(type);
		const lip = skin.clone();
		lip.color.set(0xd48a8a);
		lip.emissiveIntensity = 0;
		const m = { g, skin, lip, hairMat: std((SKIN[type.id] || {}).hair || '#2a1a14', 0.8, 0), eyes: [], mouths: [], brows: [], iris: (SKIN[type.id] || {}).iris || '#ffb21f', blink: 1 + Math.random() * 3 };
		partSink = m;
		try { MUTANT_3D[type.id](g, skin, m); } finally { partSink = null; }
		// cloth and the like: a soft sheen on the matte things they wear (their own materials only)
		const shared = new Set(Object.values(MAT).concat([EYE_WHITE, PUPIL, MOUTH, TEETH, NOSTRIL, BUTTON, skin, lip]));
		g.traverse((o) => {
			const mt = o.material;
			if (!o.isMesh || !mt || shared.has(mt) || !mt.isMeshPhysicalMaterial || mt.emissiveMap || mt.metalness > 0.4 || mt.transparent) return;
			if (mt.roughness >= 0.35) { mt.sheen = 0.6; mt.sheenRoughness = 0.6; mt.sheenColor = mt.color.clone().lerp(new THREE.Color('#ffffff'), 0.4); }
		});
		shadows(g);
		return m;
	}

	/* ---------- 3D: the players: little walking robots with a plate on their heads ---------- */

	// A small biped in moulded white plastic over black servo blocks: a loaf of a
	// head with one big ringed camera eye, a boxy torso, servo hips and knees,
	// chunky feet. The accents are the player's colour. A plate rides flat on top
	// of the head; what they're carrying sits on it. They walk where their player walks.
	// The robot's tuning: its proportions, its walk and its finish. The ROBOT LAB (debug panel,
	// or ?lab in the URL) edits these, keeps them in this browser (and the game uses them
	// here too) and copies them as JSON: paste that in here to bake them in.
	const ROBOT_TUNED = {   // (the user's tuning from the lab, 2026-11-26)
		scale: 0.8,       // the whole robot
		leg: 0.06,        // thigh and shin length (very stubby)
		head: 1, torso: 1, eye: 1, plate: 1.3,   // sizes of the parts
		neckTilt: -0.24,  // the neck's set (back, here); the head is set back upright on it
		step: 0.2,        // one step's length (before scaling)
		knee: 1.99,       // how far a knee folds through a swing
		lift: 0.6,        // how far a thigh lifts through a swing
		reach: 1.09,      // how far the legs swing (1: a step's worth)
		sway: 3, twist: 1.84, lean: 1.55,   // the hips' side to side and turn with each step; leaning into a walk
		rust: 0,          // how much rust (0: none, 2: lots)
		gloss: 1,         // the clear coat (0: none, 1: mirror)
		metal: 0.47,      // how metallic the paint is
		trim: 0.78,       // the trim's shade of the colour (1: the same, lower: deeper)
	};
	const LAB_KEY = 'fission-robot-lab';
	const RB = Object.assign({}, ROBOT_TUNED, (function () { try { return JSON.parse(localStorage.getItem(LAB_KEY)) || {}; } catch { return {}; } })());
	const hipY = () => 0.12 + RB.leg * 2;   // hip height standing (feet 0.12 tall at the ankle)
	// Shiny paint in the player's colour, rusting through: blotches of rust with drips running
	// down from them, and pitting. Three maps share the one pattern: the colour, how rough
	// it is (the paint glossy, the rust dull) and where the clear coat is (none on the rust).
	function rustyPaint(col, seed) {
		const rnd = seeded(seed);
		const spots = [];
		for (let k = 0; k < Math.round(9 * RB.rust); k++) spots.push({ x: rnd(), y: rnd(), r: 0.04 + rnd() * 0.1, bits: Array.from({ length: 14 }, () => [rnd() - 0.5, rnd() - 0.5, 0.25 + rnd() * 0.6]), drip: rnd() < 0.7 ? 0.1 + rnd() * 0.35 : 0 });
		const pits = Array.from({ length: Math.round(220 * RB.rust) }, () => [rnd(), rnd(), 0.5 + rnd() * 1.6]);
		const S = 256;
		const pattern = (c, base, rust, edge) => {
			c.fillStyle = base;
			c.fillRect(0, 0, S, S);
			for (const sp of spots) {
				const x = sp.x * S, y = sp.y * S, r = sp.r * S;
				// the drip first, under the blotch: a streak running down, fading
				if (sp.drip) {
					const g = c.createLinearGradient(0, y, 0, y + sp.drip * S);
					g.addColorStop(0, rust); g.addColorStop(1, 'rgba(0,0,0,0)');
					c.fillStyle = g;
					c.fillRect(x - r * 0.25, y, r * 0.5, sp.drip * S);
				}
				// the blotch: a ragged cluster, a lighter rim round a dark core
				c.fillStyle = edge;
				for (const b of sp.bits) { c.beginPath(); c.arc(x + b[0] * r * 2, y + b[1] * r * 2, b[2] * r * 1.15, 0, Math.PI * 2); c.fill(); }
				c.fillStyle = rust;
				for (const b of sp.bits) { c.beginPath(); c.arc(x + b[0] * r * 1.7, y + b[1] * r * 1.7, b[2] * r * 0.85, 0, Math.PI * 2); c.fill(); }
			}
			c.fillStyle = rust;
			for (const [px, py, pr] of pits) { c.beginPath(); c.arc(px * S, py * S, pr, 0, Math.PI * 2); c.fill(); }
		};
		const hex = '#' + col.getHexString();
		const map = canvasTexture(S, S, (c) => {
			pattern(c, hex, '#5a240e', '#a4501e');
			// (a faint sheen of wear over the paint)
			const g = c.createLinearGradient(0, 0, S, S);
			g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
			c.fillStyle = g;
			c.fillRect(0, 0, S, S);
		});
		const rough = canvasTexture(S, S, (c) => pattern(c, '#262626', '#f0f0f0', '#b8b8b8'), false);
		const coat = canvasTexture(S, S, (c) => pattern(c, '#ffffff', '#000000', '#303030'), false);
		for (const t of [map, rough, coat]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
		return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map, roughness: 1, roughnessMap: rough, metalness: RB.metal, clearcoat: RB.gloss, clearcoatMap: coat, clearcoatRoughness: 0.05 + (1 - RB.gloss) * 0.3, envMapIntensity: 1.6 });
	}

	// A moulded block: a superellipsoid, boxy round the sides and as round on top (eTop) or
	// flat underneath (eBot) as you like; small e is boxy, 1 is a ball. Smooth, seamless normals.
	function sgnpow(v, e) { return Math.sign(v) * Math.pow(Math.abs(v), e); }   // (a declaration: the stations use superBox as the game loads, before this line)
	function superBox(w, h, d, eTop = 0.3, eBot = 0.3, eSide = 0.3, seg = 40) {
		const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const vx = pos.getX(i), vy = clamp(pos.getY(i), -1, 1), vz = pos.getZ(i);
			const lat = Math.asin(vy), lon = Math.atan2(vz, vx), e1 = vy >= 0 ? eTop : eBot;
			const cl = sgnpow(Math.cos(lat), e1);
			pos.setXYZ(i, cl * sgnpow(Math.cos(lon), eSide) * w / 2, sgnpow(Math.sin(lat), e1) * h / 2, cl * sgnpow(Math.sin(lon), eSide) * d / 2);
		}
		geo.computeVertexNormals();
		return smoothSeams(geo);
	}

	function buildTray(n) {
		const col = new THREE.Color(colourOf(n));
		const g = new THREE.Group();
		const p = { g };
		const shell = rustyPaint(col, 17 + n * 31);   // (once white plastic: now their colour, glossy and rusting)
		const trim = std(col.clone().multiplyScalar(RB.trim), 0.18, 0.35, { clearcoat: 1, clearcoatRoughness: 0.04 });   // (a deeper shade of it)
		const servo = std(0x17161c, 0.32, 0.35, { clearcoat: 0.4, clearcoatRoughness: 0.25 });   // (black servo cases, a little sheen)
		const servoCap = std(0x2a2932, 0.45, 0.2);
		const horn = std(0xb4bac4, 0.22, 0.9);
		const screw = std(0xd8dde4, 0.15, 1);
		const rubber = std(0x1e1c22, 0.85, 0);
		const label = std(0xeceae4, 0.6, 0);
		const wire = std(0x101014, 0.4, 0.1);
		const glowCol = glowMat(col, 2.2);
		const B = (w, h, d, mat, parent, x, y, z, e = 0.22) => mesh(superBox(w, h, d, e, e, e, 24), mat, parent, x, y, z);
		// a servo: a rounded black case, a darker cap, a silver output horn with four screws, a white label
		function servoBlock(parent, w, h, d, x, y, z, side = 1) {
			const s = new THREE.Group();
			s.position.set(x, y, z);
			parent.add(s);
			B(w, h, d, servo, s, 0, 0, 0);
			B(w * 1.02, h * 0.18, d * 1.02, servoCap, s, 0, h * 0.42, 0, 0.3);
			const hornAt = new THREE.Group();
			hornAt.position.set(side * (w / 2 + 0.004), h * 0.25, 0);
			hornAt.rotation.z = Math.PI / 2;
			s.add(hornAt);
			mesh(CYL(Math.min(d, h) * 0.34, Math.min(d, h) * 0.34, 0.012, 24), horn, hornAt);
			for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6; mesh(CYL(0.0045, 0.0045, 0.016, 8), screw, hornAt, Math.cos(a) * Math.min(d, h) * 0.22, 0, Math.sin(a) * Math.min(d, h) * 0.22); }
			const l = mesh(new THREE.PlaneGeometry(w * 0.5, h * 0.3), label, s, 0, -h * 0.1, d / 2 + 0.002);
			l.castShadow = false;
			return s;
		}
		// screw heads round a panel's corners
		const screws = (parent, w, h, x, y, z) => { for (const sx of [-1, 1]) for (const sy of [-1, 1]) mesh(CYL(0.006, 0.006, 0.006, 10), screw, parent, x + sx * w / 2, y + sy * h / 2, z).rotation.x = Math.PI / 2; };

		// (nothing on the floor under them: the user asked; their own shadow grounds them)

		// the hips: a servo chassis (p.hips rises and falls with the gait; the legs hang from it)
		const hips = new THREE.Group();
		hips.position.y = hipY();
		g.add(hips);
		p.hips = hips;
		B(0.26, 0.085, 0.15, servo, hips, 0, 0.025, 0);
		B(0.2, 0.03, 0.12, servoCap, hips, 0, 0.07, 0, 0.3);

		// the legs: a hip servo, a moulded knee cap over the knee servo, a shin servo, a chunky foot
		p.legs = [-1, 1].map(function (s) {
			const hip = new THREE.Group();
			hip.position.set(s * 0.085, -0.01, 0);
			hips.add(hip);
			servoBlock(hip, 0.07, RB.leg + 0.03, 0.085, 0, -RB.leg / 2 + 0.005, 0, s);
			const knee = new THREE.Group();
			knee.position.y = -RB.leg;
			hip.add(knee);
			const cap = mesh(superBox(0.1, 0.11, 0.07, 0.5, 0.35, 0.35, 28), shell, knee, s * 0.008, 0.012, 0.045);
			cap.rotation.x = -0.15;
			mesh(CYL(0.007, 0.007, 0.01, 10), screw, knee, s * 0.008, 0.02, 0.083).rotation.x = Math.PI / 2;
			servoBlock(knee, 0.062, RB.leg, 0.075, 0, -RB.leg / 2, -0.005, -s);
			const ankle = new THREE.Group();
			ankle.position.y = -RB.leg;
			knee.add(ankle);
			const ah = mesh(CYL(0.028, 0.028, 0.08, 20), horn, ankle);
			ah.rotation.z = Math.PI / 2;
			// the foot: a moulded shoe in the paint, a rubber sole with a lip of trim, a toe bumper
			mesh(superBox(0.11, 0.065, 0.19, 0.45, 0.15, 0.32, 28), shell, ankle, 0, -0.058, 0.03);
			mesh(superBox(0.118, 0.022, 0.198, 0.2, 0.2, 0.3, 24), trim, ankle, 0, -0.088, 0.03);
			mesh(superBox(0.114, 0.018, 0.194, 0.2, 0.2, 0.3, 24), rubber, ankle, 0, -0.106, 0.03);
			mesh(superBox(0.1, 0.035, 0.03, 0.5, 0.5, 0.5, 20), rubber, ankle, 0, -0.075, 0.125);
			return { hip, knee, ankle };
		});

		// everything above the hips leans as one (p.upper)
		const upper = new THREE.Group();
		upper.position.y = 0.07;
		hips.add(upper);
		p.upper = upper;
		// the torso: a moulded shell, a grille and a status light on its chest, screws, side vents
		const body = new THREE.Group();
		body.scale.setScalar(RB.torso);
		upper.add(body);
		mesh(superBox(0.28, 0.2, 0.22, 0.38, 0.25, 0.3, 36), shell, body, 0, 0.11, 0);
		const chest = new THREE.Group();
		chest.position.set(0, 0.11, 0.108);
		body.add(chest);
		B(0.15, 0.1, 0.02, servo, chest, -0.02, 0, 0, 0.3);
		for (let k = 0; k < 3; k++) B(0.1, 0.012, 0.012, servoCap, chest, -0.035, 0.03 - k * 0.028, 0.011, 0.5);
		p.led = mesh(SPH(0.013, 12), glowCol.clone(), chest, 0.045, 0.025, 0.012);
		screws(chest, 0.2, 0.15, 0, 0, 0.004);
		for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) B(0.012, 0.012, 0.11, servo, body, sx * 0.14, 0.15 - k * 0.03, -0.01, 0.5);
		servoBlock(body, 0.08, 0.1, 0.09, 0.07, 0.2, -0.04, 1);
		// a loom of wires round the back, from the neck down into the hips
		tube(body, [[-0.05, 0.25, -0.06], [-0.11, 0.18, -0.12], [-0.12, 0.05, -0.1], [-0.08, -0.04, -0.06]], 0.007, 0.007, wire, 6, 18);
		tube(body, [[-0.04, 0.25, -0.05], [-0.09, 0.17, -0.13], [-0.1, 0.06, -0.12], [-0.06, -0.04, -0.07]], 0.006, 0.006, trim, 6, 18);

		// the neck: two servo blocks with a cable loop, leaning forward a touch
		const neck = new THREE.Group();
		neck.position.set(0, 0.215 * RB.torso, 0.03);
		neck.rotation.x = RB.neckTilt;
		upper.add(neck);
		servoBlock(neck, 0.065, 0.1, 0.075, 0, 0.05, 0, 1);
		servoBlock(neck, 0.06, 0.08, 0.07, 0, 0.13, 0.005, -1);
		tube(neck, [[-0.035, 0.17, -0.02], [-0.075, 0.1, -0.05], [-0.06, 0.02, -0.03], [-0.03, -0.01, -0.02]], 0.006, 0.006, wire, 6, 14);

		// the head (p.head): a moulded loaf, round on top and flat beneath, its brow overhanging a
		// recessed dark face; a band of trim round its base; a camera eye off to one side
		const head = new THREE.Group();
		head.position.set(0, 0.185, 0.02);
		neck.add(head);
		head.scale.setScalar(RB.head);
		p.head = head;
		mesh(superBox(0.42, 0.26, 0.44, 0.34, 0.18, 0.32, 48), shell, head, 0, 0.14, 0);   // (its top flat enough for the plate to sit on)
		mesh(superBox(0.44, 0.04, 0.46, 0.2, 0.2, 0.32, 40), trim, head, 0, 0.02, 0);
		const face = mesh(superBox(0.34, 0.17, 0.06, 0.45, 0.3, 0.3, 32), std(0x2a2c34, 0.25, 0.4, { clearcoat: 0.8, clearcoatRoughness: 0.1 }), head, 0, 0.115, 0.205);
		face.scale.z = 0.8;
		mesh(superBox(0.36, 0.035, 0.07, 0.5, 0.5, 0.4, 28), shell, head, 0, 0.215, 0.205);   // (the brow, over the face)
		// panel seams and screws on the shell
		for (const sx of [-1, 1]) {
			B(0.004, 0.17, 0.3, servo, head, sx * 0.212, 0.13, -0.02, 0.5);
			mesh(CYL(0.008, 0.008, 0.01, 10), screw, head, sx * 0.214, 0.06, 0.15).rotation.z = Math.PI / 2;
			mesh(CYL(0.008, 0.008, 0.01, 10), screw, head, sx * 0.214, 0.06, -0.17).rotation.z = Math.PI / 2;
		}
		// the side fins, in trim
		const ear = new THREE.Shape();
		ear.moveTo(0, 0); ear.quadraticCurveTo(0.09, 0.02, 0.1, 0.1); ear.lineTo(0.07, 0.11); ear.quadraticCurveTo(0.06, 0.04, 0, 0.03); ear.lineTo(0, 0);
		for (const s of [-1, 1]) {
			const e = slab(ear, 0.014, 0.008, trim, head);
			e.position.set(s * 0.222, 0.0, -0.08);
			e.rotation.y = -s * Math.PI / 2;
		}
		// the eye: a lens barrel standing out of the face, a ring of trim, a chrome bezel,
		// dark glass with a glowing iris deep inside and a glint across it
		const eye = new THREE.Group();
		eye.position.set(0.07, 0.115, 0.232);
		eye.scale.setScalar(RB.eye);
		head.add(eye);
		const barrel = mesh(CYL(0.062, 0.066, 0.045, 36), servo, eye, 0, 0, 0.01);
		barrel.rotation.x = Math.PI / 2;
		mesh(new THREE.TorusGeometry(0.06, 0.016, 14, 40), trim, eye, 0, 0, 0.034);
		mesh(new THREE.TorusGeometry(0.043, 0.006, 10, 36), horn, eye, 0, 0, 0.04);
		const glass = mesh(lathe([[0, 0.012], [0.03, 0.009], [0.042, 0]], 32, 10), std(0x05060a, 0.02, 0.6, { clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2 }), eye, 0, 0, 0.03);
		glass.rotation.x = Math.PI / 2;
		p.iris = mesh(new THREE.RingGeometry(0.008, 0.02, 24), glowMat(0x7ad8ff, 1.8, { side: THREE.DoubleSide }), eye, 0, 0, 0.037);
		mesh(new THREE.CircleGeometry(0.007, 12), MAT.white, eye, 0.016, 0.016, 0.044);
		mesh(new THREE.CircleGeometry(0.004, 10), MAT.white, eye, -0.012, -0.01, 0.043);
		p.eyes = [eye];

		// the plate: a white china plate resting right on top of the head, a band of their
		// colour round its rim to say whose robot it is
		const HEAD_TOP = 0.27;   // (the head block's top: 0.14 + 0.26 / 2)
		const plate = new THREE.Group();
		plate.position.set(0, HEAD_TOP - 0.012 * RB.plate - 0.003, 0);   // (its foot right down on the top of the head, a touch sunk in, whatever the plate's size)
		plate.scale.setScalar(RB.plate);
		head.add(plate);
		p.plate = plate;
		const china = std(0xfbfaf6, 0.12, 0, { clearcoat: 1, clearcoatRoughness: 0.03 });
		mesh(lathe([[0, 0.004], [0.1, 0.004], [0.11, 0], [0.12, 0.004], [0.2, 0.012], [0.26, 0.036], [0.285, 0.05], [0.28, 0.056], [0.255, 0.046], [0.19, 0.024], [0, 0.02]], 56, 30), china, plate, 0, 0.012, 0);
		const band = std(col, 0.18, 0.05, { clearcoat: 1, clearcoatRoughness: 0.03, emissive: col, emissiveIntensity: 0.12 });
		mesh(lathe([[0.212, 0.039], [0.24, 0.05], [0.268, 0.062], [0.284, 0.068], [0.279, 0.0695], [0.262, 0.0625], [0.236, 0.0515], [0.21, 0.0405]], 64, 12), band, plate, 0, 0, 0);
		p.hold = new THREE.Group();
		p.hold.position.y = 0.04;
		plate.add(p.hold);

		shadows(g);
		g.scale.setScalar(RB.scale);
		p.phase = Math.random() * 6;
		p.stride = 0;
		return p;
	}

	// A robot's body for a moment: its walk (the legs turning over with the ground covered),
	// a pose for what it's doing, its head held upright, its eye and chest light. The game
	// and the ROBOT LAB both drive it. o: { dt, time, clock (real seconds), i, speed (m/s),
	// held, act ({ kind, t }), working (a station's kind, or null), onStep(k) }.
	function animateBot(m, o) {
		const { dt, time, i, speed } = o;
		// walking: the legs turn over with the ground covered (half a cycle a step), so the
		// feet plant instead of sliding; the stride opens up as they get going
		m.stride = lerp(m.stride, clamp(speed / 0.8, 0, 1), 1 - Math.exp(-dt * 12));
		m.phase += Math.min(Math.PI * speed * dt / (RB.step * RB.scale), 32 * dt);
		if (m.stride < 0.05) m.phase = Math.round(m.phase / Math.PI) * Math.PI;   // (stopped: feet together)
		// a footstep each time a foot comes down (its phase passing a quarter turn), once moving
		const plant = Math.floor((m.phase - Math.PI / 2) / Math.PI);
		if (m.plant !== undefined && plant !== m.plant && m.stride > 0.15 && o.onStep) o.onStep(m.stride);
		m.plant = plant;
		const st = m.stride, ph = m.phase;
		// a pose for what they're doing: lean in, dip the head, squat, shake
		let lean = (0.04 + st * 0.12) * RB.lean, nod = 0, squat = 0, shake = 0;
		if (o.held) nod -= 0.04;   // (head up, carefully: there's food on it)
		if (o.working === 'stir') { lean = 0.25; shake = Math.sin(time * 8) * 0.12; }
		const a = o.act;
		if (a) {
			const u = clamp(a.t / ACT_TIME, 0, 1), pulse = Math.sin(u * Math.PI);
			if (a.kind === 'chop') { lean = 0.3; nod = Math.abs(Math.sin(u * Math.PI * 3)) * 0.45; }
			else if (a.kind === 'grab' || a.kind === 'take' || a.kind === 'put' || a.kind === 'serve') { lean = lerp(lean, 0.38, pulse); nod = 0.35 * pulse; squat = 0.06 * pulse; }
			else if (a.kind === 'bin') { lean = lerp(lean, 0.5, pulse); nod = 0.5 * pulse; }
			else if (a.kind === 'flip' || a.kind === 'jab') { lean = 0.25; nod = 0.4 * pulse; }
			else if (a.kind === 'pump') { squat = 0.12 * pulse; }
			else if (a.kind === 'douse') { lean = 0.2; shake = Math.sin(a.t * 40) * 0.2; }
		}
		// each leg: sin(q) is where its foot is (back -1 .. forward +1); while cos(q) > 0 it's
		// swinging forward through the air, knee folding up to clear the floor, then reaching
		// out nearly straight to plant; on the ground it stays straight and pushes back
		const LEG = RB.leg;
		const th = Math.acos(clamp(1 - squat / (2 * LEG), -1, 1));   // (knees bent for a squat)
		const reach = Math.asin(clamp(RB.step / (4 * LEG), 0, 0.9)) * st * RB.reach;   // (the hip's swing either way)
		let lowest = 0;
		for (let j = 0; j < 2; j++) {
			const L = m.legs[j], q = ph + j * Math.PI, air = Math.max(0, Math.cos(q));
			const hf = th + reach * Math.sin(q) + air * RB.lift * st;                // (thigh, forward of straight down)
			const kf = 2 * th + 0.08 * st + Math.pow(air, 1.5) * RB.knee * st;      // (knee, folded back)
			L.hip.rotation.x = -hf;
			L.knee.rotation.x = kf;
			L.ankle.rotation.x = hf - kf - air * 0.25 * st * Math.sin(q);           // (foot level; toes down as it lifts)
			lowest = Math.max(lowest, LEG * Math.cos(hf) + LEG * Math.cos(hf - kf));
		}
		// the hips ride on whichever leg is down, so they bob as it straightens under them
		m.hips.position.y = 0.12 + lowest + Math.sin(time * 2.4) * 0.004 * (1 - st);
		m.hips.rotation.z = Math.sin(ph) * 0.07 * st * RB.sway + shake * 0.3;
		m.hips.rotation.y = Math.sin(ph) * 0.12 * st * RB.twist;   // (a little twist with each step)
		const ease = Math.min(1, dt * 14);
		m.upper.rotation.x = lerp(m.upper.rotation.x, lean, ease);
		m.upper.rotation.z = lerp(m.upper.rotation.z, -Math.sin(ph) * 0.05 * st * RB.sway + shake, ease);
		// the head sits upright whatever the body's doing (it only tips for a nod): it takes
		// back the neck's forward set, the lean, and the hips' and body's sway
		m.head.rotation.x = lerp(m.head.rotation.x, nod - m.upper.rotation.x - RB.neckTilt, ease);
		m.head.rotation.z = -(m.upper.rotation.z + m.hips.rotation.z);
		// (turning, the head lags a beat behind the body, then catches up)
		const yawRate = m.prevYaw === undefined ? 0 : Math.atan2(Math.sin(m.yaw - m.prevYaw), Math.cos(m.yaw - m.prevYaw)) / Math.max(dt, 0.001);
		m.prevYaw = m.yaw;
		m.headLag = lerp(m.headLag || 0, clamp(-yawRate * 0.07, -0.5, 0.5), Math.min(1, dt * 8));
		m.headLook = lerp(m.headLook || 0, st > 0.2 ? 0 : Math.sin(time * 0.7 + i) * 0.25, Math.min(1, dt * 3));
		m.head.rotation.y = m.headLook + m.headLag;
		// the chest light breathes; the iris opens wide while they're busy
		m.led.scale.setScalar(0.75 + 0.35 * (0.5 + 0.5 * Math.sin(o.clock * 3 + i * 1.7)));
		const wide = a || o.working ? 1.35 : o.held ? 1.1 : 1;
		m.iris.scale.setScalar(lerp(m.iris.scale.x, wide, Math.min(1, dt * 8)));
		m.eyes.forEach((e) => { e.scale.y = (o.clock + i * 0.7) % 3.5 < 0.12 ? 0.2 : 1; });
	}

	/* ---------- 3D: portals, the manager, particles ---------- */

	const ringsLive = new Set(), ringPool = [];
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
			if (parts3.length >= 160) return;
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
		stepSunbeams(rt);
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
			if (k === 'chop') {
				// the drums churn: idling, faster with food in, flat out on a tap; the chamber shudders
				const spin = (1.2 + (s.state === 'work' ? 3 : 0) + s.hit * 28) * dt;
				p.drums[0].rotation.x += spin;
				p.drums[1].rotation.x -= spin;
				p.fan.rotation.x += spin * 3;
				p.body.position.x = s.hit * Math.sin(rt * 90) * 0.03;
				p.body.rotation.z = s.hit * Math.sin(rt * 70) * 0.015;
				const heat = s.state === 'work' ? 0.6 + s.hit * 0.8 : 0.25;
				p.maw.material.opacity = 0.35 + heat * 0.5;
				p.window.material.opacity = 0.25 + heat * 0.6 + Math.sin(rt * 23) * 0.05 * heat;
				if (s.hit > 0.5) every('chop-bits', 30, dt, () => puff(w, cx + rnd1() * 0.3 * MS, ISLAND.y + MS * 1.6, cz + rnd1() * 0.2 * MS, { color: s.item ? INGS[s.item.ing].colour : 0xffe12a, size: 0.035, grow: 0.02, life: 0.5, vy: 1.6, vx: rnd1() * 1.4, vz: rnd1() * 0.8, glow: 1.4, alpha: 1 }));
			}
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
			} else if (k === 'salt') {
				p.shaker.rotation.z = Math.sin(rt * 34) * 0.3 * s.hit;
				p.shaker.position.y = 1.5 + s.hit * 0.12;
				if (s.hit > 0.4) every('salt', 24, dt, () => puff(w, cx + rnd1() * 0.3 * MS, ISLAND.y + MS * 1.0, cz + rnd1() * 0.3 * MS, { color: 0xd8ffd0, size: 0.025, grow: 0.015, life: 0.6, vy: -0.9, glow: 2, add: true, alpha: 1 }));
			} else if (k === 'cryo') {
				const on = s.state === 'work';
				p.light.intensity = on ? 5 : 0.5;
				p.nozzle.material.color.set(0x8fdcff).multiplyScalar(on ? 3 : 1.2);
				if (on) every('cryo', 22, dt, () => puff(w, cx + 0.55 + rnd1() * 0.2 * MS, ISLAND.y + MS * 1.25, cz - 0.1, { color: 0xd8f4ff, size: 0.12, grow: 0.5, life: 0.7, vx: -1.0 + rnd1() * 0.4 * MS, vy: -1.1, vz: 0.3, alpha: 0.55, glow: 1.3 }));
			}
			// the food in it
			const item = s.kind === 'warp' && s.state === 'work' ? null : s.item;   // (warping food is elsewhere until it's back)
			const v = syncItem(s, item, p.g, 0, ITEM_AT[k] + (s.state === 'done' ? 0.06 + Math.sin(rt * 5) * 0.05 : 0), 0, 1.3);
			if (v && k === 'fry' && s.state === 'work') v.position.y -= 0.12;
			if (v && k === 'chop' && s.state === 'work') { v.position.y -= s.prog * 0.35; v.rotation.z = Math.sin(rt * 40) * 0.08 * s.hit; }   // (sinking into the teeth)
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

		// the food piles: one jumps when it's grabbed from; a jammed one rattles; and the binner
		buildPiles();
		disp3d.forEach((d3, k) => {
			const d = disp[k];
			if (!d) return;
			d.flash = Math.max(0, d.flash - dt * 2.5);
			d.shake = Math.max(0, d.shake - dt * 3);
			const jam = d.jam > 0 ? 0.015 * Math.sin(rt * 50) : 0;
			d3.g.scale.set(1 + d.flash * 0.12, 1 - d.flash * 0.1 + d.flash * 0.2 * Math.sin(d.flash * 9), 1 + d.flash * 0.12);
			d3.g.children.forEach((c, j) => { c.rotation.z = jam * (j % 2 ? 1 : -1) * 8 + (d.shake ? rnd1() * 0.2 * d.shake : 0); });
		});
		binFlash = Math.max(0, binFlash - dt * 2);
		bin3d.swirl.rotation.z = -rt * (2.5 + binFlash * 10);

		// the mutants
		const n = windowsNow();
		for (let k = 0; k < 4; k++) {
			const c = customers[k];
			if (!c) continue;
			if (!c.model) { c.model = mutantModel(c.type, c); sets[1].add(c.model.g); }
			const m = c.model;
			const qa = (c.x - W) / W;
			const qp = wallPoint(1, qa, QUEUE_D);
			const enter = c.state === 'leave' ? -Math.min(1, c.stateT / 0.7) * 2.6 : -(1 - Math.min(1, c.age / 0.5)) * 2.6;
			const panic = c.state === 'wait' && c.left / c.patience < 0.25;
			m.g.position.set(qp.x + (panic ? Math.sin(rt * 45) * 0.03 : 0), enter + Math.sin(rt * 2 + c.seed) * 0.03, qp.z);
			m.g.rotation.y = faceEye(qp.x, qp.z);
			const sq = c.state === 'eat' ? Math.sin(c.stateT * 12) * 0.06 : 0;
			const sc = Math.min(0.85, colW(n) / W * 2 * QUEUE_D / 1.7) * (c.recipe === FEAST ? 1.1 : 1);   // (as wide as its window)
			m.g.scale.set(sc * (1 + sq), sc * (1 - sq), sc);
			const angry = c.state === 'angry' || panic;
			// breathing; the veins glowing in a slow pulse, red and fast when cross, bright when eating
			const breathe = 1 + Math.sin(rt * 1.7 + c.seed) * 0.012;
			m.g.scale.y *= breathe;
			m.skin.emissive.set(angry ? 0xff2a10 : c.state === 'eat' ? 0x7aff4a : m.skin.userData.glow);
			m.skin.emissiveIntensity = angry ? 1.4 + Math.sin(rt * 10) * 0.6 : c.state === 'eat' ? 1.8 : 0.35 + Math.sin(rt * 2 + c.seed) * 0.15;
			// the eyes: on the nearest robot at the front, else on us; blinking now and then;
			// narrowed when cross, wide when panicking
			let tx = 0, ty = EYE, tz = 0, best = Infinity;
			for (const r of chefs3) if (r && r.g.visible && r.wallAt === 1 && r.x !== undefined) { const dd = Math.abs(r.x - qp.x); if (dd < best) { best = dd; tx = r.x; ty = 0.8; tz = r.z; } }
			const my = 1.6 * sc, dx = tx - qp.x, dz = tz - qp.z;
			const yawOff = clamp(Math.atan2(Math.sin(Math.atan2(dx, dz) - m.g.rotation.y), Math.cos(Math.atan2(dx, dz) - m.g.rotation.y)), -0.6, 0.6);
			const pitchOff = clamp(Math.atan2(ty - my, Math.hypot(dx, dz)), -0.5, 0.4);
			m.blink -= dt;
			if (m.blink < -0.14) m.blink = 1.8 + Math.random() * 3.5;
			const shut = m.blink < 0 ? 1 : 0;
			for (const e of m.eyes) {
				e.look.rotation.y = lerp(e.look.rotation.y, yawOff, Math.min(1, dt * 6));
				e.look.rotation.x = lerp(e.look.rotation.x, -pitchOff, Math.min(1, dt * 6));
				if (e.lid) e.lid.rotation.x = lerp(e.lid.rotation.x, shut ? 1.5 : angry ? e.open + 0.55 : panic ? e.open - 0.25 : e.open, Math.min(1, dt * (shut ? 40 : 12)));
			}
			const talking = c.sayT > 0 && c.state !== 'leave';
			// the eyebrows: knitted down and in when cross, shot up in a panic, lifting as they talk
			for (const b of m.brows) {
				const s2 = b.side || 1;
				b.g.rotation.z = lerp(b.g.rotation.z, angry ? -s2 * 0.4 : panic ? s2 * 0.25 : 0, Math.min(1, dt * 10));
				b.g.position.y = lerp(b.g.position.y, b.y + (angry ? -0.014 : panic ? 0.02 : talking ? Math.abs(Math.sin(rt * 7 + c.seed)) * 0.008 : 0), Math.min(1, dt * 10));
			}
			// the mouth: working while they talk
			for (const mo of m.mouths) mo.scale.y = lerp(mo.scale.y, talking ? 0.6 + Math.abs(Math.sin(rt * 15 + c.seed)) * 1.4 : angry ? 0.7 : 1, Math.min(1, dt * 18));
			if (m.heads) m.heads.forEach((h, j) => { h.rotation.z = (j ? 0.16 : -0.16) + Math.sin(rt * 2.2 + j * 2) * 0.08; h.position.y = 1.75 + Math.sin(rt * 3 + j * 2) * 0.03; });
			if (m.head) { m.head.position.z = 0.05 + Math.max(0, Math.sin(rt * 6)) * 0.06; }   // (the pigeon's head, bobbing)
			if (m.brain) m.brain.scale.set(1 + Math.sin(rt * 3) * 0.02, 0.75 + Math.sin(rt * 3) * 0.02, 0.95);
			if (m.arms) m.arms.forEach((a, j) => { a.rotation.z = Math.sin(rt * 3 + j) * 0.25; a.rotation.x = Math.cos(rt * 2.4 + j) * 0.2; });
			if (m.crown) m.crown.rotation.y = rt * 0.6;
			// what's been handed over so far, on the counter in front of them
			c.parts.forEach((part, j) => {
				const tp = wallPoint(1, qa, CT.d + 0.3);
				const off = (j - (c.parts.length - 1) / 2) * 0.32;
				syncItem(part, part.filled && c.state !== 'leave' ? part.item : null, sets[1], tp.x + off, CT.y + 0.03, tp.z, 0.4);
			});
		}
		// (mutants gone: their models go too)
		for (const m of Object.values(mutantModels)) if (m.g.parent && !customers.some((c) => c && c.model === m)) m.g.removeFromParent();

		// the trays: one each, where their player stands (carried further out near a wall)
		for (let i = 0; i < count; i++) {
			const c = chefs[i];
			if (!chefs3[i]) { const m = buildTray(i); room.add(m.g); m.holder = {}; chefs3[i] = m; }
			const m = chefs3[i];
			const p = latest[i];
			m.g.visible = !!p && phase !== 'off';
			if (!m.g.visible) continue;
			const time = t + (c.bob || 0);
			// (tracking arrives about 20 times a second; glide between its updates rather than jump)
			// Binary: shown only on the wall their player is nearest (a little sticky),
			// always at the full standard distance out (AV_MAX), at their place along it;
			// when they're nearer another wall, they jump straight there
			const wp = wallsOf(p);
			let wallNow = m.wallAt ?? 1;
			for (let w = 0; w < 3; w++) if (wp.dist[w] < wp.dist[wallNow] - 0.08) wallNow = w;
			const jumped = wallNow !== m.wallAt;
			m.wallAt = wallNow;
			const tq = wallPoint(wallNow, clamp(wp.along[wallNow], 0.02, 0.98), AV_MAX);
			// (tracking arrives about 20 times a second; glide between its updates along the wall)
			const k = 1 - Math.exp(-dt * 20);
			if (m.x === undefined) { m.x = tq.x; m.z = tq.z; m.vx = m.vz = 0; }
			// facing that wall, back to us
			const fx = wallNow === 0 ? -9 : wallNow === 2 ? 9 : 0, fz = wallNow === 1 ? -9 : 0;
			// changing walls: a smooth swing round the room, eased in and out, from where they were
			if (jumped && m.yaw !== undefined) m.hop = { u: 0, a: Math.atan2(m.z, m.x), r: Math.hypot(m.x, m.z), yaw: m.yaw };
			const ox = m.x, oz = m.z;
			let lift = 0;
			if (m.hop && m.hop.u < 1) {
				const h = m.hop;
				h.u = Math.min(1, h.u + dt / HOP_TIME);
				const e = h.u * h.u * h.u * (h.u * (h.u * 6 - 15) + 10);   // (smootherstep)
				const ta = Math.atan2(tq.z, tq.x), a = h.a + Math.atan2(Math.sin(ta - h.a), Math.cos(ta - h.a)) * e;
				const r = lerp(h.r, Math.hypot(tq.x, tq.z), e);
				m.x = Math.cos(a) * r;
				m.z = Math.sin(a) * r;
				lift = Math.sin(e * Math.PI) * 0.04;
			} else {
				m.x = lerp(m.x, tq.x, k);
				m.z = lerp(m.z, tq.z, k);
			}
			m.vx = lerp(m.vx || 0, (m.x - ox) / Math.max(dt, 0.001), 1 - Math.exp(-dt * 6));
			m.vz = lerp(m.vz || 0, (m.z - oz) / Math.max(dt, 0.001), 1 - Math.exp(-dt * 6));
			m.g.position.set(m.x, lift, m.z);
			// facing: the way they're walking; standing, the wall, turned a little
			// toward where they last came from, so their eye shows in profile
			const speed = Math.hypot(m.vx, m.vz);
			const wallYaw = Math.atan2(fx - m.x, fz - m.z);
			if (speed > 0.35) {
				const across = Math.cos(wallYaw) * m.vx - Math.sin(wallYaw) * m.vz;   // (+: turning more would face the way they went)
				if (Math.abs(across) > 0.2) m.side = Math.sign(across);
			}
			const want = speed > 0.35 ? Math.atan2(m.vx, m.vz) : wallYaw + (m.side || 1) * 0.75;
			m.yaw = m.yaw === undefined ? want : m.yaw + Math.atan2(Math.sin(want - m.yaw), Math.cos(want - m.yaw)) * (1 - Math.exp(-dt * (m.hop && m.hop.u < 1 ? 14 : 7)));
			m.g.rotation.y = m.yaw;
			animateBot(m, {
				dt, time, clock: rt, i, speed, held: !!c.held, act: c.act,
				working: c.station && c.station.state === 'work' ? c.station.kind : null,
				onStep: (k) => { if (phase !== 'off') footstep(i, wallNow, k); },
			});
			// what they're carrying, riding on the plate, turned to face the middle
			const hv = syncItem(m.holder, c.held, m.hold, 0, 0, 0, 0.46);
			if (hv) hv.rotation.y = faceEye(m.x, m.z) - m.yaw + Math.sin(rt * 1.5) * 0.3;
			if (c.held && c.held.burnt) every('held-smoke-' + i, 2, dt, () => smoke(0, m.x, 1.0, m.z, 0.35));
		}

		// the portals
		for (const p of portals) {
			if (!p.ring) { p.ring = ringPool.pop() || buildPortal(); sets[p.wall].add(p.ring.g); ringsLive.add(p.ring); }
			const v = p.ring;
			const grow = Math.min(1, p.t * 3) * (1 + Math.sin(p.t * 5) * 0.05);
			// (the ring lies flat on the counter; the food sits in it)
			v.g.position.set(p.x3, CT.y + 0.01, p.z3);
			v.g.scale.setScalar(grow * 0.45);
			v.g.rotation.y = faceEye(p.x3, p.z3);
			v.disc.parent.rotation.x = -Math.PI / 2;
			v.disc.parent.position.y = 0.02;
			v.disc.rotation.z = -p.t * 3;
			v.r1.rotation.z = p.t * 1.5;
			v.r2.rotation.z = -p.t * 2.2;
			const iv = syncItem(p, p.item, v.hold, 0, 0.03, 0, 0.9);
			if (iv) iv.rotation.y = 0.4;
			every('portal-' + p.item.id, 4, dt, () => puff(p.wall, p.x3 + rnd1() * 0.4, CT.y + 0.1, p.z3 + rnd1() * 0.2, { color: Math.random() < 0.5 ? 0x3af2ff : 0xff2d8f, size: 0.06, grow: 0.02, life: 0.8, vy: 0, vx: rnd1() * 0.5, glow: 2, add: true, alpha: 1 }));
		}
		for (const r of ringsLive) if (!portals.some((p) => p.ring === r)) { r.g.removeFromParent(); ringsLive.delete(r); ringPool.push(r); }   // (kept for the next portal)

		// the manager comes down on its cable for the intro
		manager.visible = phase === 'intro';
		if (manager.visible) {
			const k = clamp(introT / 0.9, 0, 1);
			manager.scale.setScalar(0.45);
			manager.position.set(0, lerp(4.5, 1.7, 1 - Math.pow(1 - k, 3)) + Math.sin(rt * 2.4) * 0.03, -2.4);
			manager.rotation.z = Math.sin(rt * 1.7) * 0.05;
		}

		// spinning, warping, wobbling food; views no one holds any more go
		for (const v of itemsShown) {
			if (!itemsLive.has(v)) { v.removeFromParent(); itemsShown.delete(v); continue; }
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

	// where a point in the kitchen shows: the wall it's on, and where on it (null if none sees it)
	function onWall(x, y, z) {
		for (let w = 0; w < 3; w++) {
			const p = proj(w, x, y, z);
			if (p.inside) return p;
		}
		return null;
	}

	function drawWorld(ctx) {
		for (const s of stations) drawStationUI(ctx, s);
		drawFrontUI(ctx);
		for (const p of portals) art.text(ctx, 'GRAB IT', p.x, p.y + 70, { size: 26, weight: 800, font: FONT, fill: '#3af2ff', outline: INK, outlineWidth: 5 });
		// over each tray: what it's carrying
		for (let i = 0; i < count; i++) {
			const c = chefs[i], m = chefs3[i];
			if (!latest[i] || !m || !m.g.visible || m.x === undefined) continue;
			const at = onWall(m.x, 1.2, m.z);
			if (!at) continue;
			const y = at.y;
			if (c.held) {
				const h = c.held, chips = h.steps.includes('chop');
				const label = [h.burnt ? 'BURNT' : ''].concat(h.steps.filter((st) => st !== 'chop').map((st) => KIND[st].adj).reverse(), [INGS[h.ing].short + (chips ? ' CHIPS' : '')]).filter(Boolean).join(' ');
				art.text(ctx, label, at.x, y, { size: 22, weight: 800, font: FONT, fill: h.burnt ? '#ff4a32' : INGS[h.ing].colour, outline: INK, outlineWidth: 5 });
			}
		}
		for (const r of ripples) art.circle(ctx, r.x, r.y, 20 + r.t * 160, { stroke: 'white', lineWidth: 6, alpha: 1 - r.t / 0.5 });
		for (const f of floaters) {
			const k = f.t / 1.5;
			art.text(ctx, f.text, f.x, f.y - k * 90, { size: f.size * (k < 0.1 ? 0.6 + k * 4 : 1), weight: 800, font: FONT, fill: f.fill, outline: INK, outlineWidth: 6, alpha: 1 - Math.max(0, k - 0.7) / 0.3 });
		}
	}

	// where a cook's floating words go: over their head
	function overChef(i) {
		const c = chefs[i], m = chefs3[i];
		return (m && m.x !== undefined && onWall(m.x, 1.35, m.z)) || { x: c.x, y: 500 };
	}

	function bar(ctx, x, y, w, k, colour, back) {
		art.roundRect(ctx, x - w / 2 - 4, y - 13, w + 8, 26, 13, { fill: INK });
		art.roundRect(ctx, x - w / 2, y - 9, w, 18, 9, { fill: back || '#2a302e' });
		if (k > 0) art.roundRect(ctx, x - w / 2, y - 9, Math.max(18, w * clamp(k, 0, 1)), 18, 9, { fill: colour });
	}

	function prompt(ctx, x, y, text, fill, pulse) {
		const s = pulse ? 1 + Math.sin(rt * 10) * 0.06 : 1;
		art.text(ctx, text, x, y, { size: 24 * s, weight: 800, font: FONT, fill, outline: INK, outlineWidth: 5 });
	}

	function drawStationUI(ctx, s) {
		const { x: cx, prompt: py } = s.ui;
		const by = py + 32;
		if (s.fire > 0) prompt(ctx, cx, py, 'FIRE! TAP ×' + s.fire, '#ff4a32', true);
		else if (s.state === 'done') {
			prompt(ctx, cx, py, 'READY! TAP', '#9dff3a', true);
			if (s.kind === 'fry' || s.kind === 'grill') bar(ctx, cx, by, 160, 1 - s.doneT / (s.kind === 'fry' ? FRY.burn : GRILL.burn), '#ff4a32');
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
				salt: ['SHAKE: TAP TAP!', s.prog],
			}[s.kind];
			const urgent = s.kind === 'grill' && !s.flipped && s.t >= GRILL.flipAt;
			prompt(ctx, cx, py, hint[0], urgent ? '#ff4a32' : s.colour, urgent || ['chop', 'salt', 'stir', 'press', 'cryo', 'inject'].includes(s.kind));
			if (hint[1] >= 0) bar(ctx, cx, by, 160, hint[1], s.colour);
			if (s.kind === 'inject') {   // the dial: a needle that sweeps, a green band to hit
				const y = by + 4;
				art.roundRect(ctx, cx - 95, y - 20, 190, 40, 20, { fill: INK });
				art.roundRect(ctx, cx - 86, y - 12, 172, 24, 12, { fill: '#3a1a2a' });
				art.rect(ctx, cx - 86 + 172 * (0.5 - INJECT.zone), y - 12, 172 * INJECT.zone * 2, 24, { fill: '#3cdc7a' });
				const nx = cx - 86 + 172 * needle(s);
				art.poly(ctx, [[nx, y + 18], [nx - 10, y - 20], [nx + 10, y - 20]], { fill: s.lock > 0 ? '#ff4a32' : 'white', stroke: INK, lineWidth: 3 });
			}
		}
	}

	// A mutant's order, in a speech bubble by its head: each part a row of icons
	// (the food, then each tool in turn), ticked off as it's handed over; how
	// patient it still is along the bottom
	const BROW = 66;
	const ORDER_TOP = 160;   // (the clock hangs from the top of every wall, its label under it)
	function drawOrder(ctx, c, x, headY, w) {
		const rows = c.parts.length;
		const h = 46 + rows * BROW + 18;
		const y = Math.max(ORDER_TOP, headY - h - 26);   // (always below the clock and its label)
		const bob = Math.sin(rt * 2 + c.seed) * 3;
		ctx.save();
		ctx.translate(x, y + bob);
		const panic = c.state === 'wait' && c.left / c.patience < 0.25;
		if (panic) ctx.translate(Math.sin(rt * 40) * 2, 0);
		const edge = c.recipe === FEAST ? '#ffd23a' : panic ? '#ff4a32' : '#a44aff';
		art.roundRect(ctx, -w / 2 + 4, 6, w, h, 22, { fill: 'rgba(0,0,0,0.4)' });
		art.roundRect(ctx, -w / 2, 0, w, h, 22, { fill: '#1c1628', stroke: edge, lineWidth: 4 });
		// (its tail, down to the mutant's head)
		art.poly(ctx, [[-18, h - 3], [10, h - 3], [-14, h + 26]], { fill: '#1c1628' });
		art.line(ctx, [[-18, h], [-14, h + 26], [10, h]], { stroke: edge, lineWidth: 4 });
		art.text(ctx, c.recipe.name, 0, 25, { size: c.recipe.name.length > 20 ? 18 : 21, weight: 800, font: FONT, fill: '#ffd8f0' });
		for (let r = 0; r < rows; r++) {
			const part = c.parts[r];
			const ry = 46 + r * BROW + BROW / 2;
			const steps = part.steps[0] === '*' ? ['*'] : part.steps;
			const gap = 66;
			let px = -(steps.length * gap) / 2;
			if (part.filled) art.roundRect(ctx, -w / 2 + 8, ry - BROW / 2 + 4, w - 16, BROW - 8, 12, { fill: 'rgba(122,255,58,0.18)' });
			if (part.ing === '*') art.text(ctx, 'ANY', px, ry, { size: 20, weight: 800, font: FONT, fill: '#ffd8f0' });
			else simpleIcon(ctx, part.ing, px, ry, 26);
			for (const st of steps) {
				px += gap;
				art.text(ctx, '›', px - gap / 2, ry, { size: 30, weight: 800, font: FONT, fill: '#6a5a8a' });
				if (st === '*') art.text(ctx, 'ANY', px, ry, { size: 20, weight: 800, font: FONT, fill: '#ffd8f0' });
				else simpleIcon(ctx, st, px, ry, 26);
			}
			if (part.filled) art.text(ctx, '✓', w / 2 - 24, ry, { size: 32, weight: 800, font: FONT, fill: '#7aff3a' });
		}
		const k = clamp(c.left / c.patience, 0, 1);
		if (c.patience < 900) {
			art.roundRect(ctx, -w / 2 + 16, h - 14, w - 32, 6, 3, { fill: '#3a3048' });
			art.roundRect(ctx, -w / 2 + 16, h - 14, (w - 32) * k, 6, 3, { fill: k > 0.5 ? '#7aff3a' : k > 0.25 ? '#ffc21a' : '#ff4a32' });
		}
		ctx.restore();
	}

	// A mutant's murmur: a run of gibberish syllables in its own voice (a buzzy
	// tone through a shifting vowel filter), as it says its order or answers back
	let voiceCtx = null;
	function voice() {
		try {
			if (!voiceCtx) voiceCtx = new (window.AudioContext || window.webkitAudioContext)();
			if (voiceCtx.state === 'suspended') voiceCtx.resume();
			return voiceCtx;
		} catch { return null; }
	}
	function murmur(c, n, mood) {
		if (!c) return;
		if (c.say) n = Math.max(n, Math.round(c.say.replace(/[^A-Z]/gi, '').length / 2.5));   // (as long as what it says)
		const ac = voice();
		if (!ac) return;
		const out = ac.createGain();
		out.gain.value = 0.45;
		out.connect(ac.destination);
		const base = (c.voice || 160) * (mood === 'happy' ? 1.25 : mood === 'cross' ? 0.8 : 1);
		let at = ac.currentTime + 0.03;
		for (let k = 0; k < n; k++) {
			const len = 0.055 + Math.random() * 0.07;
			const f = base * (0.85 + Math.random() * 0.4) * (k === n - 1 && mood !== 'cross' ? 1.15 : 1);
			const o = ac.createOscillator();
			o.type = 'sawtooth';
			o.frequency.setValueAtTime(f, at);
			o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.25), at + len);
			const vowel = ac.createBiquadFilter();
			vowel.type = 'bandpass';
			vowel.frequency.setValueAtTime(450 + Math.random() * 1300, at);
			vowel.Q.value = 3.5;
			const g = ac.createGain();
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(1, at + 0.012);
			g.gain.exponentialRampToValueAtTime(0.0001, at + len);
			o.connect(vowel).connect(g).connect(out);
			o.start(at);
			o.stop(at + len + 0.02);
			at += len + 0.02 + (Math.random() < 0.18 ? 0.09 : 0);
		}
	}

	// A robot's footstep: the whirr of a servo swinging the leg, then a metal foot coming down
	// (a clank of filtered noise on a low thump). Each robot a little different in pitch, panned
	// toward the wall it's on; lighter at a stroll, heavier at a run.
	const STEP_VOLUME = 0.35;   // (kept quiet: under everything else)
	let noiseBuf = null;
	function footstep(i, wall, k, force) {
		const ac = voice();
		if (!ac || (show.paused && !force)) return;
		if (!noiseBuf) {
			noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
			const d = noiseBuf.getChannelData(0);
			for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
		}
		const t0 = ac.currentTime + 0.005, pitch = 1 + ((i * 0.137) % 0.3) - 0.15 + (Math.random() - 0.5) * 0.08;
		const out = ac.createGain();
		out.gain.value = (0.18 + 0.22 * k) * STEP_VOLUME;
		let dest = ac.destination;
		if (ac.createStereoPanner) { const pan = ac.createStereoPanner(); pan.pan.value = [-0.7, 0, 0.7][wall] || 0; pan.connect(dest); dest = pan; }
		out.connect(dest);
		const env = (node, a, len, peak) => { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0 + a); g.gain.exponentialRampToValueAtTime(peak, t0 + a + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + len); node.connect(g).connect(out); return g; };
		// the servo: a short rising whine
		const whir = ac.createOscillator();
		whir.type = 'square';
		whir.frequency.setValueAtTime(520 * pitch, t0);
		whir.frequency.exponentialRampToValueAtTime(860 * pitch, t0 + 0.07);
		const wf = ac.createBiquadFilter();
		wf.type = 'bandpass'; wf.frequency.value = 1400 * pitch; wf.Q.value = 2;
		whir.connect(wf);
		env(wf, 0, 0.08, 0.12);
		whir.start(t0); whir.stop(t0 + 0.1);
		// the foot down: a clank (noise through a ringing band) and a thump
		const n = ac.createBufferSource();
		n.buffer = noiseBuf;
		n.playbackRate.value = pitch;
		const nf = ac.createBiquadFilter();
		nf.type = 'bandpass'; nf.frequency.value = 2600 * pitch; nf.Q.value = 9;
		n.connect(nf);
		env(nf, 0.07, 0.09, 1.4);
		n.start(t0 + 0.07); n.stop(t0 + 0.2);
		const thump = ac.createOscillator();
		thump.type = 'sine';
		thump.frequency.setValueAtTime(150 * pitch, t0 + 0.07);
		thump.frequency.exponentialRampToValueAtTime(55, t0 + 0.16);
		env(thump, 0.07, 0.1, 0.9);
		thump.start(t0 + 0.07); thump.stop(t0 + 0.2);
	}

	function drawFrontUI(ctx) {
		disp.forEach((d, k) => { if (d.jam > 0) prompt(ctx, DISP_UI[k].x, DISP_UI[k].prompt, 'JAMMED! TAP ×' + d.jam, '#ffc21a', true); });
		const n = windowsNow();
		const cw = colW(n);
		for (let k = 0; k < n; k++) {
			const c = customers[k];
			if (!c) continue;
			const q = queueAt(k, n);
			const x = W + HATCH + cw * k + cw / 2;
			if (c.state === 'wait') drawOrder(ctx, c, x + 36, q.ticket, Math.min(300, cw - 30));
			if (c.sayT > 0 && c.say && c.state !== 'wait') drawSpeech(ctx, c.say, x, Math.max(ORDER_TOP + 60, q.ticket - 50), Math.min(400, cw - 10), c.state === 'angry' ? '#ff4a32' : '#7aff3a');
			else if (c.sayT > 0 && c.say && c.age > 2.4) drawSpeech(ctx, c.say, x - 90, q.say, 300, '#ffd8f0');
		}
	}

	/* ---------- 2D: tickets, speech ---------- */

	function drawSpeech(ctx, text, x, y, w, fill) {
		ctx.font = `800 34px ${FONT}`;
		const words = text.split(' ');
		const lines = [];
		let line = '';
		for (const word of words) {
			const test = line ? line + ' ' + word : word;
			if (ctx.measureText(test).width > w - 30 && line) { lines.push(line); line = word; } else line = test;
		}
		lines.push(line);
		const h = lines.length * 40 + 24;
		art.roundRect(ctx, x - w / 2, y - h / 2, w, h, 14, { fill, stroke: INK, lineWidth: 4 });
		art.poly(ctx, [[x - 14, y + h / 2 - 2], [x + 14, y + h / 2 - 2], [x, y + h / 2 + 18]], { fill, stroke: INK, lineWidth: 4 });
		art.rect(ctx, x - 13, y + h / 2 - 6, 26, 6, { fill });
		art.text(ctx, lines.join('\n'), x, y, { size: 34, weight: 800, font: FONT, fill: INK, lineHeight: 40 });
	}

	// The icons: line work in the thing's own colour of the rainbow (no black, no white),
	// the same on the walls and on the tickets
	// (a tool's colour, a food's colour: its machine, its icon and its name are all that colour)
	const ICON_COLOUR = { bin: '#ff3ad8', serve: '#ff7aa8' };
	for (const k of Object.keys(INGS)) ICON_COLOUR[k] = INGS[k].colour;
	for (const st of STATIONS) ICON_COLOUR[st.kind] = st.colour;
	function simpleIcon(ctx, key, x, y, r) {
		const col = ICON_COLOUR[key] || '#ffe12a';
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(r / 20, r / 20);
		const st = { stroke: col, lineWidth: 2.6, lineCap: 'round', lineJoin: 'round' };
		art.circle(ctx, 0, 0, 19, st);
		const blob = () => art.ellipse(ctx, 0, 1, 11, 8, st);
		if (key === 'spud') { blob(); art.circle(ctx, -4, -1, 1.6, st); art.circle(ctx, 4, 3, 1.4, st); }
		else if (key === 'mutato') { blob(); for (const ex of [-5, 0, 5]) art.circle(ctx, ex, ex ? 1 : -2, 2, st); }
		else if (key === 'slop') {   // (a bowl heaped with lumpy goop, a drip over its lip)
			ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineJoin = ctx.lineCap = 'round';
			ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-11, 11, 0, 11); ctx.quadraticCurveTo(11, 11, 12, 0); ctx.closePath(); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-9, -7, -4, -6); ctx.quadraticCurveTo(-1, -12, 4, -8); ctx.quadraticCurveTo(10, -8, 10, 0); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(11, 1); ctx.quadraticCurveTo(13, 4, 12.5, 7); ctx.stroke();
		}
		else if (key === 'chop') { art.poly(ctx, [[-11, -8], [3, -8], [3, 4], [-11, 4]], st); art.line(ctx, [[3, -2], [12, -2]], st); }
		else if (key === 'fry') for (const dx of [-7, 0, 7]) art.line(ctx, [[dx, 10], [dx - 3, 4], [dx + 3, -3], [dx, -10]], st);
		else if (key === 'salt') { art.poly(ctx, [[-6, -2], [6, -2], [6, 10], [-6, 10]], st); art.ellipse(ctx, 0, -4, 6, 3, st); for (const [dx, dy] of [[-4, -11], [0, -13], [4, -11]]) art.circle(ctx, dx, dy, 1.1, st); }
		else if (key === 'warp') { art.circle(ctx, 0, 0, 10, st); art.line(ctx, [[0, 0], [4, -2], [5, 3], [0, 6], [-5, 2], [-4, -5], [3, -8]], st); }
		else if (key === 'bin') { art.poly(ctx, [[-7, -4], [7, -4], [5, 10], [-5, 10]], st); art.line(ctx, [[-10, -7], [10, -7]], st); art.line(ctx, [[-2, -1], [-2, 7]], st); art.line(ctx, [[2, -1], [2, 7]], st); }
		else if (key === 'serve') { ctx.beginPath(); ctx.arc(0, 4, 10, Math.PI, 0); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke(); art.line(ctx, [[-13, 5], [13, 5]], st); art.circle(ctx, 0, -8, 2, st); }
		ctx.restore();
	}

	/* ---------- 2D: the trays, for the results screens ---------- */

	// A player's tray robot, feet (its puck) at (x, y), h tall. o: { pose: 'stand' | 'cheer' | 'win' }
	// The robot in 2D, for Showtime's results: walking on the spot, waving its head when it cheers
	function drawChef(ctx, n, x, y, h, o) {
		o = o || {};
		const col = colourOf(n);
		const k = h / 100;
		const time = performance.now() / 1000 + n;
		const cheer = o.pose === 'cheer' || o.pose === 'win';
		const ph = time * (cheer ? 9 : 4);
		const bob = cheer ? Math.abs(Math.sin(ph)) * 5 : Math.abs(Math.sin(ph)) * 1.5;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(k, k);
		const line = { stroke: INK, lineWidth: 2.5 };
		art.ellipse(ctx, 0, -2, 22, 5, { fill: col, alpha: 0.4 });
		// legs: black servo blocks, white knees, chunky feet in their colour
		for (const j of [0, 1]) {
			const sx = j ? 7 : -7, sw = Math.sin(ph + j * Math.PI) * (cheer ? 4 : 2), up = Math.max(0, Math.cos(ph + j * Math.PI)) * (cheer ? 5 : 2);
			art.roundRect(ctx, sx - 4 + sw * 0.5, -40 - bob, 8, 20, 2, { fill: '#1c1b22', ...line });
			art.roundRect(ctx, sx - 4 + sw, -22 - up, 8, 16, 2, { fill: '#1c1b22', ...line });
			art.roundRect(ctx, sx - 5 + sw * 0.7, -26 - up * 0.6, 10, 8, 3, { fill: col, ...line });
			art.roundRect(ctx, sx - 6 + sw, -8 - up, 14, 7, 3, { fill: col, ...line });
		}
		ctx.translate(0, -bob);
		// hips, torso, neck
		art.roundRect(ctx, -13, -46, 26, 8, 2, { fill: '#1c1b22', ...line });
		art.roundRect(ctx, -13, -64, 26, 19, 5, { fill: col, ...line });
		art.rect(ctx, 1, -72, 7, 10, { fill: '#1c1b22', ...line });
		// the head: a loaf with a coloured band, one ringed eye; tilting about when cheering
		ctx.save();
		ctx.translate(2, -74);
		ctx.rotate(cheer ? Math.sin(time * 7) * 0.2 : Math.sin(time * 1.3) * 0.05);
		art.roundRect(ctx, -18, -22, 36, 22, 10, { fill: col, ...line });
		art.roundRect(ctx, -19, -4, 38, 5, 2, { fill: col, ...line });
		art.circle(ctx, 8, -12, 6.5, { fill: col, ...line });
		art.circle(ctx, 8, -12, 3.5, { fill: '#0c0c12' });
		art.circle(ctx, 9.2, -13.2, 1.1, { fill: '#ffffff' });
		// the plate on top
		art.ellipse(ctx, 0, -25, 22, 4.5, { fill: '#fbfaf6', ...line });
		art.ellipse(ctx, 0, -25, 22, 4.5, { stroke: col, lineWidth: 3 });
		ctx.restore();
		ctx.restore();
	}

	/* ---------- the ROBOT LAB ---------- */

	// A workbench for the players' robot: the robot on its own, full window, under the
	// kitchen's light, with a counter behind it for scale. Sliders for its shape, its walk and
	// its finish; buttons to make it act; walk it about, hold food, change its colour, look
	// from any side. What you change is kept in this browser (localStorage, LAB_KEY) and the
	// game uses it too; COPY gives it as JSON to bake into ROBOT_TUNED. Open it from the debug
	// panel (ROBOT ▸ ROBOT LAB) or with ?lab in the URL.
	const LAB_SLIDERS = [
		['SHAPE', [['scale', 'size', 0.4, 1.6, 0.01], ['leg', 'leg length', 0.06, 0.24, 0.005], ['head', 'head', 0.6, 1.6, 0.01], ['torso', 'torso', 0.6, 1.6, 0.01], ['eye', 'eye', 0.5, 2, 0.01], ['plate', 'plate', 0.5, 1.6, 0.01], ['neckTilt', 'neck lean', -0.4, 0.6, 0.01]]],
		['WALK', [['step', 'step length', 0.08, 0.4, 0.005], ['reach', 'leg swing', 0, 2, 0.01], ['knee', 'knee fold', 0, 2.2, 0.01], ['lift', 'thigh lift', 0, 0.6, 0.01], ['sway', 'hip sway', 0, 3, 0.01], ['twist', 'hip twist', 0, 3, 0.01], ['lean', 'lean', 0, 3, 0.01]]],
		['FINISH', [['rust', 'rust', 0, 2.5, 0.05], ['gloss', 'gloss', 0, 1, 0.01], ['metal', 'metal', 0, 1, 0.01], ['trim', 'trim shade', 0.2, 1.2, 0.01]]],
	];
	const LAB_LIVE = new Set(['step', 'reach', 'knee', 'lift', 'sway', 'twist', 'lean']);   // (the rest rebuild the robot)
	let labOpen = false;
	function openLab() {
		if (labOpen) return;
		labOpen = true;
		const pausedHere = !show.paused;
		if (pausedHere) show.pause(true);
		const ui = { speed: 0.6, mode: 'along', colour: 0, hold: false, stir: false, sound: true, view: 'game' };
		let act = null;
		const font = 'Rubik, sans-serif';
		const $lab = $('<fission-lab>').css({ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', background: '#0b0812', fontFamily: font, color: '#e8e2f2', userSelect: 'none' })
			.on('click mousedown pointerdown keydown', (e) => e.stopPropagation()).appendTo('body');
		const $view = $('<div>').css({ position: 'relative', flex: 1, minWidth: 0, cursor: 'grab' }).appendTo($lab);
		const $panel = $('<div>').css({ width: '340px', flex: 'none', overflowY: 'auto', padding: '16px 18px 24px', boxSizing: 'border-box', background: '#15101f', borderLeft: '2px solid #2c2140', fontSize: '13px' }).appendTo($lab);
		$('<div>').text('ROBOT LAB').css({ fontSize: '22px', fontWeight: 800, letterSpacing: '3px', color: '#FC1992', margin: '0 0 2px' }).appendTo($panel);
		$('<div>').text('Changes save in this browser and show in the game. COPY to bake them in.').css({ color: '#9a8fb0', margin: '0 0 12px', lineHeight: 1.35 }).appendTo($panel);
		const head = (t) => $('<div>').text(t).css({ margin: '16px 0 6px', fontWeight: 700, letterSpacing: '2px', color: '#9fb6d8', fontSize: '12px' }).appendTo($panel);
		const btn = (t, fn, $to, on) => $('<button>').text(t).css({ margin: '0 6px 6px 0', padding: '6px 11px', borderRadius: '16px', border: '2px solid ' + (on ? '#FC1992' : '#4a3d66'), background: on ? '#3a1430' : '#1d1729', color: '#e8e2f2', fontFamily: font, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }).on('click', fn).appendTo($to || $panel);
		const row = () => $('<div>').css({ display: 'flex', flexWrap: 'wrap' }).appendTo($panel);
		const toggles = [];
		const toggle = (t, key, $to) => { const b = btn(t, () => { ui[key] = !ui[key]; paintToggles(); }, $to); toggles.push([b, () => ui[key]]); return b; };
		const choice = (key, val, t, $to) => { const b = btn(t, () => { ui[key] = val; paintToggles(); }, $to); toggles.push([b, () => ui[key] === val]); return b; };
		const paintToggles = () => { for (const [b, on] of toggles) b.css({ borderColor: on() ? '#FC1992' : '#4a3d66', background: on() ? '#3a1430' : '#1d1729' }); };

		// moving it about
		head('MOVE');
		const mv = row();
		choice('mode', 'still', 'STAND', mv); choice('mode', 'along', 'ALONG THE COUNTER', mv); choice('mode', 'circle', 'IN A CIRCLE', mv); choice('mode', 'treadmill', 'ON THE SPOT', mv);
		slider('speed', 'walk speed (m/s)', 0, 3, 0.05, ui);
		head('ACT');
		const ac = row();
		for (const k of ['grab', 'put', 'serve', 'chop', 'bin', 'flip', 'jab', 'pump', 'douse']) btn(k.toUpperCase(), () => { act = { kind: k, t: 0 }; }, ac);
		const tg = row();
		toggle('HOLD FOOD', 'hold', tg); toggle('STIR', 'stir', tg); toggle('FOOTSTEPS', 'sound', tg);
		head('COLOUR');
		const cr = row();
		for (let n = 0; n < 6; n++) { const b = choice('colour', n, String(n + 1), cr); b.css({ color: colourOf(n) }); b.on('click', () => rebuild()); }
		head('LOOK FROM');
		const vr = row();
		for (const [v, t] of [['game', 'THE GAME'], ['side', 'SIDE'], ['three', '3/4'], ['front', 'FRONT'], ['back', 'BACK'], ['head', 'HEAD UP CLOSE']]) choice('view', v, t, vr).on('click', () => setView(v));
		// the tuning
		for (const [title, list] of LAB_SLIDERS) { head(title); for (const [key, label, lo, hi, stepBy] of list) slider(key, label, lo, hi, stepBy, RB); }
		head('KEEP');
		const kr = row();
		btn('COPY', () => { const txt = JSON.stringify(RB, null, '\t'); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => note('Copied: paste it into ROBOT_TUNED'), () => { $out.text(txt).show(); note('Select and copy the JSON below'); }); }, kr);
		btn('RESET', () => { Object.assign(RB, ROBOT_TUNED); save(); $panel.find('input[type=range]').each(function () { const k = this.dataset.key; if (k in RB) { this.value = RB[k]; $(this).trigger('input'); } }); rebuild(); note('Back to the baked-in tuning'); }, kr);
		btn('CLOSE', close, kr).css({ borderColor: '#9dff3a' });
		const $note = $('<div>').css({ color: '#9dff3a', minHeight: '18px', margin: '6px 0' }).appendTo($panel);
		const $out = $('<pre>').css({ display: 'none', whiteSpace: 'pre-wrap', userSelect: 'text', fontSize: '11px', background: '#0b0812', padding: '8px', borderRadius: '8px' }).appendTo($panel);
		let noteT = 0;
		function note(t) { $note.text(t); clearTimeout(noteT); noteT = setTimeout(() => $note.text(''), 3000); }
		function save() { try { localStorage.setItem(LAB_KEY, JSON.stringify(RB)); } catch { /* (not kept) */ } }
		function slider(key, label, lo, hi, stepBy, obj) {
			const $r = $('<label>').css({ display: 'grid', gridTemplateColumns: '108px 1fr 44px', alignItems: 'center', gap: '8px', margin: '3px 0' }).appendTo($panel);
			$('<span>').text(label).css({ color: '#c8bedc' }).appendTo($r);
			const $in = $('<input type=range>').attr({ min: lo, max: hi, step: stepBy }).val(obj[key]).css({ width: '100%', accentColor: '#FC1992' }).appendTo($r);
			$in[0].dataset.key = obj === RB ? key : '';
			const $v = $('<span>').text((+obj[key]).toFixed(2)).css({ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#fff' }).appendTo($r);
			$in.on('input', function () {
				obj[key] = +this.value;
				$v.text((+this.value).toFixed(2));
				if (obj !== RB) return;
				save();
				if (!LAB_LIVE.has(key)) rebuildSoon();
			});
		}
		paintToggles();

		// the scene: the kitchen's light and reflections, a floor, a counter behind for scale
		const lr = new THREE.WebGLRenderer({ antialias: true });
		lr.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		lr.toneMapping = THREE.NeutralToneMapping;
		lr.toneMappingExposure = 0.9;
		lr.shadowMap.enabled = true;
		lr.shadowMap.type = THREE.PCFSoftShadowMap;
		$(lr.domElement).css({ display: 'block', width: '100%', height: '100%' }).appendTo($view);
		const ls = new THREE.Scene();
		ls.background = new THREE.Color(0x120d1a);
		ls.environment = environmentFromShader(lr, ENV_SHADER);
		ls.environmentIntensity = 0.35;
		ls.add(new THREE.HemisphereLight(0x8a94c0, 0x3a2418, 0.55));
		const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
		sun.position.set(1.5, 4, 3);
		sun.castShadow = true;
		sun.shadow.mapSize.set(2048, 2048);
		Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 12 });
		sun.shadow.bias = -0.0004;
		sun.shadow.normalBias = 0.02;
		ls.add(sun);
		const warm = new THREE.PointLight(KITCHEN.light, 3, 6, 1.4);
		warm.position.set(-1, 2.6, 0.5);
		ls.add(warm);
		const floor = mesh(new THREE.PlaneGeometry(12, 12), std(0x1f2725, 0.5, 0.05), ls, 0, 0, 0);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		const grid = new THREE.GridHelper(12, 48, 0x3a4a44, 0x26302d);
		grid.position.y = 0.002;
		ls.add(grid);
		const CZ = -(CT.d - AV_MAX) - CT.deep / 2;   // (the counter, as far behind as in the kitchen)
		const counter = mesh(new THREE.BoxGeometry(3.2, CT.y, CT.deep), stainless(3.2, CT.y), ls, 0, CT.y / 2, CZ);
		counter.castShadow = counter.receiveShadow = true;
		const cam = new THREE.PerspectiveCamera(40, 1, 0.02, 40);

		// the robot
		let bot = null, held = null;
		function rebuild() {
			if (bot) ls.remove(bot.g);
			bot = buildTray(ui.colour);
			bot.holder = {};
			ls.add(bot.g);
			held = null;
		}
		let soon = 0;
		function rebuildSoon() { clearTimeout(soon); soon = setTimeout(rebuild, 120); }
		rebuild();

		// the camera: drag to orbit, wheel to zoom; or a set view
		const orbit = { yaw: 0.6, pitch: 0.25, dist: 2.2, y: 0.45 };
		function setView(v) {
			ui.view = v;
			paintToggles();
			if (v === 'side') Object.assign(orbit, { yaw: Math.PI / 2, pitch: 0.08, dist: 2, y: 0.42 });
			else if (v === 'three') Object.assign(orbit, { yaw: 0.7, pitch: 0.22, dist: 2.1, y: 0.45 });
			else if (v === 'front') Object.assign(orbit, { yaw: 0, pitch: 0.1, dist: 1.9, y: 0.45 });
			else if (v === 'back') Object.assign(orbit, { yaw: Math.PI, pitch: 0.18, dist: 1.9, y: 0.45 });
			else if (v === 'head') Object.assign(orbit, { yaw: 0.45, pitch: 0.12, dist: 0.8, y: 0.85 });
		}
		let drag = null;
		$view.on('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch }; $view.css('cursor', 'grabbing'); if (ui.view === 'game') { setView('back'); drag.yaw = orbit.yaw; drag.pitch = orbit.pitch; } ui.view = 'orbit'; paintToggles(); });
		$(window).on('pointermove.fission-lab', (e) => { if (!drag) return; orbit.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; orbit.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.006, -0.3, 1.4); });
		$(window).on('pointerup.fission-lab', () => { drag = null; $view.css('cursor', 'grab'); });
		$view.on('wheel', (e) => { e.preventDefault(); orbit.dist = clamp(orbit.dist * Math.exp(e.originalEvent.deltaY * 0.001), 0.4, 6); if (ui.view === 'game') { setView('back'); } ui.view = 'orbit'; paintToggles(); });
		function placeCamera() {
			if (ui.view === 'game') {   // (as the game sees it: from the eye in the middle, the counter beyond)
				cam.fov = 64;
				cam.position.set(bot.g.position.x * 0.3, EYE, AV_MAX);
				cam.lookAt(bot.g.position.x * 0.3, EYE, CZ - 3);
			} else {
				cam.fov = 40;
				const c = Math.cos(orbit.pitch), tx = bot.g.position.x, tz = bot.g.position.z;
				cam.position.set(tx + Math.sin(orbit.yaw) * c * orbit.dist, orbit.y + Math.sin(orbit.pitch) * orbit.dist, tz + Math.cos(orbit.yaw) * c * orbit.dist);
				cam.lookAt(tx, orbit.y, tz);
			}
			cam.updateProjectionMatrix();
		}
		function fit() {
			const w = $view.width(), h = $view.height();
			if (!w || !h) return;
			lr.setSize(w, h, false);
			cam.aspect = w / h;
		}
		const ro = new ResizeObserver(fit);
		ro.observe($view[0]);
		fit();

		// every frame: move it, pose it, draw it
		let last = performance.now(), clock = 0, s = 0, raf = 0;
		const pos = { x: 0, z: 0, dir: 1 };
		function frame(now) {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			clock += dt;
			const m = bot;
			const ox = pos.x, oz = pos.z;
			let face = Math.PI;   // (standing: facing the counter, back to the eye, as in the game)
			if (ui.mode === 'along') {
				pos.x += pos.dir * ui.speed * dt;
				if (Math.abs(pos.x) > 1.1) { pos.x = Math.sign(pos.x) * 1.1; pos.dir = -pos.dir; }
				pos.z = 0;
			} else if (ui.mode === 'circle') {
				s += ui.speed * dt / 0.7;
				pos.x = Math.sin(s) * 0.7;
				pos.z = Math.cos(s) * 0.7 - 0.2;
			} else if (ui.mode === 'still') { pos.x = lerp(pos.x, 0, Math.min(1, dt * 3)); pos.z = lerp(pos.z, 0, Math.min(1, dt * 3)); }
			const vx = (pos.x - ox) / Math.max(dt, 1e-3), vz = (pos.z - oz) / Math.max(dt, 1e-3);
			const moving = ui.mode === 'treadmill' ? ui.speed : Math.hypot(vx, vz);
			if (ui.mode !== 'treadmill' && moving > 0.05) face = Math.atan2(vx, vz);
			else if (ui.mode === 'treadmill') face = Math.PI / 2;
			m.yaw = m.yaw === undefined ? face : m.yaw + Math.atan2(Math.sin(face - m.yaw), Math.cos(face - m.yaw)) * (1 - Math.exp(-dt * 7));
			m.g.position.set(pos.x, 0, pos.z);
			m.g.rotation.y = m.yaw;
			if (act) { act.t += dt; if (act.t > ACT_TIME) act = null; }
			animateBot(m, { dt, time: clock, clock, i: ui.colour, speed: ui.mode === 'still' ? Math.hypot(vx, vz) : moving, held: ui.hold, act, working: ui.stir ? 'stir' : null, onStep: (k) => { if (ui.sound) footstep(ui.colour, 1, k, true); } });
			// food on the plate
			if (ui.hold && !held) { held = itemView({ ing: 'spud', steps: ['chop', 'fry'], burnt: false }); held.scale.setScalar(0.46); m.hold.add(held); }
			if (!ui.hold && held) { held.removeFromParent(); held = null; }
			if (held) held.rotation.y = Math.sin(clock * 1.5) * 0.3;
			placeCamera();
			lr.render(ls, cam);
		}
		raf = requestAnimationFrame(frame);

		function close() {
			cancelAnimationFrame(raf);
			ro.disconnect();
			$(window).off('.fission-lab');
			lr.dispose();
			lr.forceContextLoss();
			$lab.remove();
			labOpen = false;
			// the game's robots: built again with the new tuning
			for (let i = 0; i < chefs3.length; i++) if (chefs3[i]) { chefs3[i].g.removeFromParent(); chefs3[i] = null; }
			if (pausedHere) show.pause(false);
		}
		stage.own(() => { if (labOpen) close(); });
	}

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
		show.menu.dbutton('ROBOT LAB', openLab, '#FC1992').appendTo(show.menu.drow('ROBOT'));
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
		if (voiceCtx && voiceCtx.state !== 'closed') voiceCtx.close();
	};

	// the painted names and pictures, now that the food's drawing is defined (and again once the lettering's loaded)
	const paintAll = () => { for (const job of paintJobs) job(); };
	paintAll();
	if (document.fonts) document.fonts.load(`800 60px ${FONT}`).then(paintAll).catch(() => {});

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else if (PLAY_NOW !== null) stage.timeout(() => initGame(clamp(+PLAY_NOW || 3, 1, 6)));   // (no picker either)
	if (new URLSearchParams(window.location.search).has('lab')) stage.timeout(openLab, 300);   // (?lab: straight into the ROBOT LAB)
	else show.pickPlayers(initGame);
});
