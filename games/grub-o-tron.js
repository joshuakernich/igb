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
	const DISPENSERS = [{ ing: 'spud', wall: 0, slot: 0 }, { ing: 'mutato', wall: 0, slot: 2 }, { ing: 'slime', wall: 2, slot: 1 }];
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
		slime: { name: 'SLIME DIP', short: 'SLIME', colour: '#7aff3a', glow: '#c8ff8a' },
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
	// spuds and mutatos chopped and fried, salted, warped; a pot of slime dip on the side
	const RECIPES = [
		{ tier: 1, name: 'GLOW CHIPS', parts: [['spud', 'chop', 'fry']] },
		{ tier: 1, name: 'PURPLE MUTATO CHIPS', parts: [['mutato', 'chop', 'fry']] },
		{ tier: 1, name: 'A NUKED SPUD', parts: [['spud', 'fry']] },
		{ tier: 1, name: 'MUTATO FROM ELSEWHERE', parts: [['mutato', 'warp']] },
		{ tier: 2, name: 'SALT & SCREAMER CHIPS', parts: [['spud', 'chop', 'fry', 'salt']] },
		{ tier: 2, name: 'QUANTUM CHIPS', parts: [['spud', 'chop', 'fry', 'warp']] },
		{ tier: 2, name: 'FANCY MUTATO FRIES', parts: [['mutato', 'chop', 'fry', 'salt']] },
		{ tier: 2, name: 'INTERDIMENSIONAL WEDGES', parts: [['mutato', 'chop', 'warp', 'fry']] },
		{ tier: 3, name: 'CHIPS \'N\' SLIME DIP', parts: [['spud', 'chop', 'fry'], ['slime']] },
		{ tier: 3, name: 'DOUBLE MUTANT FRIES', parts: [['spud', 'chop', 'fry'], ['mutato', 'chop', 'fry']] },
		{ tier: 3, name: 'LOADED FALLOUT FRIES', parts: [['mutato', 'chop', 'fry', 'salt'], ['slime', 'warp']] },
	];
	const FEAST = { tier: 4, name: 'THE OVERLORD\'S MEGA BUCKET', parts: [['spud', 'chop', 'fry', 'salt'], ['mutato', 'chop', 'warp', 'fry'], ['slime']] };
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
	const ITEM_AT = { salt: 0.38, chop: 0.78, fry: 0.92, grill: 0.72, stir: 1.02, press: 0.5, inject: 0.62, warp: 0.7, cryo: 0.5 };   // an item's height on each device (its own units)
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
	const KITCHEN = { wall: ['#2a3834', '#2f3e38'], edge: 0x161c1a, counter: 0x2a2230, light: 0xffd8b0 };
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
	/* ---------- 3D: the kitchen ---------- */

	const room = new THREE.Group();
	scene.add(room);
	const sets = [room, room, room];   // (one kitchen: every wall's things in it)
	const fans = [];
	const signs = [];
	const sunbeams = { mats: [], motes: null, box: null };   // (the light streaming in at the window: see buildRoom)

	function buildRoom() {
		const look = KITCHEN;
		const g = new THREE.Group();   // (what never moves: baked into a few meshes at the end)
		room.add(g);
		// the floor, the ceiling
		const floor = mesh(new THREE.PlaneGeometry(14, 14), std(look.edge, 0.45, 0.05), g, 0, 0, -0.5);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		const ceil = mesh(new THREE.PlaneGeometry(14, 14), std(0x14181a, 0.8, 0), g, 0, 3.4, -0.5);
		ceil.rotation.x = Math.PI / 2;
		// the walls: tiled, behind the counters (the front one further back, behind the window)
		const wallMat = (w, h) => { const t = wallTex(look.wall[0], look.wall[1]); t.repeat.set(w / 2, h / 2); return std(0xffffff, 0.35, 0, { map: t }); };
		const L = mesh(new THREE.PlaneGeometry(BACK + FRONT_BACK, 3.4), wallMat(BACK + FRONT_BACK, 3.4), g, -BACK, 1.7, (BACK - FRONT_BACK) / 2);
		L.rotation.y = Math.PI / 2;
		const Rw = mesh(new THREE.PlaneGeometry(BACK + FRONT_BACK, 3.4), wallMat(BACK + FRONT_BACK, 3.4), g, BACK, 1.7, (BACK - FRONT_BACK) / 2);
		Rw.rotation.y = -Math.PI / 2;
		mesh(new THREE.PlaneGeometry(2 * BACK, 3.4), wallMat(2 * BACK, 3.4), g, 0, 1.7, -FRONT_BACK);
		for (const m of [L, Rw]) m.receiveShadow = true;
		// strip lights along the ceiling, flickering
		for (const [x, z, ry] of [[-2.6, 0, 0], [2.6, 0, 0], [0, -3.2, Math.PI / 2]]) {
			const strip = mesh(BOX(0.12, 0.05, 3.2), glowMat(0xeaf6ff, 1.6), g, x, 3.35, z);
			strip.rotation.y = ry;
		}
		// the counters: one along each wall's active stretch, and the empty ends
		const counterMat = std(look.counter, 0.35, 0.1);
		for (let w = 0; w < 3; w++) {
			const [a0, a1] = ACTIVE[w];
			const p0 = wallPoint(w, a0, CT.d + CT.deep / 2), p1 = wallPoint(w, a1, CT.d + CT.deep / 2);
			const len = Math.hypot(p1.x - p0.x, p1.z - p0.z);
			const cg = new THREE.Group();
			cg.position.set((p0.x + p1.x) / 2, 0, (p0.z + p1.z) / 2);
			cg.rotation.y = [Math.PI / 2, 0, -Math.PI / 2][w];   // (its front, +z, toward the room)
			g.add(cg);
			const body = mesh(BOX(len, CT.y, CT.deep), counterMat, cg, 0, CT.y / 2, 0);
			body.castShadow = body.receiveShadow = true;
			mesh(BOX(len + 0.08, 0.05, CT.deep + 0.06), MAT.steel, cg, 0, CT.y, 0).receiveShadow = true;
			mesh(BOX(len, 0.05, 0.01), MAT.hazard, cg, 0, CT.y - 0.06, CT.deep / 2 + 0.006);
			mesh(BOX(len, 0.08, 0.02), MAT.black, cg, 0, 0.04, CT.deep / 2 + 0.012);
			// (the empty ends: a locker, or a pile of crates and a barrel)
			for (const [ea, eb] of [[0, a0], [a1, 1]]) {
				const e = wallPoint(w, (ea + eb) / 2, CT.d + 0.4);
				if (eb - ea < 0.2) {
					const locker = mesh(BOX(0.6, 1.9, 0.5), std(0x3a4440, 0.5, 0.4), g, e.x, 0.95, e.z);
					locker.rotation.y = faceEye(e.x, e.z);
					locker.castShadow = true;
				} else {
					for (const [dx, dy, sz] of [[-0.35, 0.22, 0.45], [0.15, 0.22, 0.45], [-0.1, 0.65, 0.4]]) {
						const c = mesh(BOX(sz, sz, sz), std(0x5a4430, 0.8, 0), g, e.x + dx * 0.6, dy, e.z + dx * 0.6);
						c.rotation.y = faceEye(e.x, e.z) + dx;
						c.castShadow = true;
					}
				}
			}
		}
		// pipes high along the side walls, dripping rust
		for (const x of [-BACK + 0.12, BACK - 0.12]) for (const [y, r] of [[3.0, 0.07], [3.18, 0.045]]) {
			const p = mesh(CYL(r, r, BACK + FRONT_BACK, 12), MAT.pipe, g, x, y, (BACK - FRONT_BACK) / 2);
			p.rotation.x = Math.PI / 2;
		}
		// the side walls' signs, the jars and a fan
		for (const [w, x] of [[0, -BACK + 0.04], [2, BACK - 0.04]]) {
			const fan = new THREE.Group();
			fan.position.set(x, 2.4, -0.4);
			fan.rotation.y = w === 0 ? Math.PI / 2 : -Math.PI / 2;
			room.add(fan);
			mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 24), MAT.darkSteel, fan);
			mesh(new THREE.CircleGeometry(0.24, 24), MAT.black, fan, 0, 0, -0.01);
			const blades = new THREE.Group();
			fan.add(blades);
			for (let b = 0; b < 4; b++) {
				const pivot = new THREE.Group();
				pivot.rotation.z = b * Math.PI / 2;
				mesh(BOX(0.07, 0.2, 0.01), MAT.steel, pivot, 0, 0.11, 0.01);
				blades.add(pivot);
			}
			fans.push(blades);
		}
		// the front: the window onto the wasteland behind the mutants, and the neon over it
		const wa = HATCH / W, wb = CHUTE / W;
		const wl = wallPoint(1, wa, FRONT_BACK - 0.02), wr = wallPoint(1, wb, FRONT_BACK - 0.02);
		mesh(new THREE.PlaneGeometry(wr.x - wl.x, 2.4), new THREE.MeshBasicMaterial({ map: TEX.sky, color: new THREE.Color(0.42, 0.42, 0.42) }), g, 0, 1.6, -FRONT_BACK + 0.02);
		for (const x of [wl.x - 0.06, wr.x + 0.06]) mesh(BOX(0.14, 2.6, 0.16), MAT.darkSteel, g, x, 1.55, -FRONT_BACK + 0.08);
		mesh(BOX(wr.x - wl.x + 0.3, 0.14, 0.16), MAT.darkSteel, g, 0, 2.85, -FRONT_BACK + 0.08);
		buildSunbeams(wl.x, wr.x);
		for (const [x, text, colour] of [[-1.2, 'FISSION CHIPS', '#9dff3a'], [1.2, 'OPEN 25/8', '#FC1992']]) {
			const sign = mesh(new THREE.PlaneGeometry(2.0, 0.37), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), room, x, 3.1, -FRONT_BACK + 0.06);
			signs.push({ m: sign, text, colour, k: 1.3, seed: x, font: x < 0 ? 'Monoton' : null });   // (the name in the title's neon-tube lettering)
		}
		// light: a warm wash from overhead, a glow over each wall's counter
		for (const [x, z] of [[-2.2, 0], [0, -2.6], [2.2, 0]]) {
			const l = new THREE.PointLight(look.light, 9, 7, 1.4);
			l.position.set(x, 2.9, z);
			room.add(l);
		}
		// a rim of neon light on the mutants, from the window behind them
		const rim = new THREE.PointLight(0xc06bff, 5, 4.5, 1.6);
		rim.position.set(0, 2.3, -(QUEUE_D + 0.7));
		room.add(rim);
		bake(g);
	}
	buildRoom();

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
		for (const [cx, cy, w, h] of [[(x0 - BACK) / 2 - 0.05, 1.7, x0 + BACK, 3.4], [(x1 + BACK) / 2 + 0.05, 1.7, BACK - x1, 3.4], [0, (y1 + 3.4) / 2, wallW, 3.4 - y1], [0, y0 / 2, wallW, y0]]) {
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

	// Each ingredient is a pile of it, heaped on the counter, with a shelf of
	// more on the wall above (built on the first frame: the food's models are
	// defined further down)
	const disp3d = DISPENSERS.map(function ({ ing, wall }, k) {
		const a = DISP_ALONG[k];
		const p = wallPoint(wall, a, DEV_D);
		const g = new THREE.Group();
		g.position.set(p.x, CT.y + 0.01, p.z);
		g.rotation.y = faceEye(p.x, p.z);
		room.add(g);
		const sp = wallPoint(wall, a, BACK - 0.16);
		const shelf = new THREE.Group();
		shelf.position.set(sp.x, 1.5, sp.z);
		shelf.rotation.y = [Math.PI / 2, 0, -Math.PI / 2][wall];
		room.add(shelf);
		mesh(BOX(0.9, 0.04, 0.28), MAT.rust, shelf, 0, 0, 0).castShadow = true;
		for (const x of [-0.36, 0.36]) mesh(BOX(0.03, 0.14, 0.2), MAT.darkSteel, shelf, x, -0.08, -0.03);
		return { g, shelf, ing, built: false };
	});
	function buildPiles() {
		disp3d.forEach(function (d3, k) {
			if (d3.built) return;
			d3.built = true;
			const rnd = seeded(k * 53 + 11);
			const raw = { ing: d3.ing, steps: [], burnt: false };
			const piece = (s) => { const v = itemView(raw); v.userData = {}; v.scale.setScalar(s); return v; };   // (not a held item: never swept)
			// the heap: a wide bottom layer, fewer on top, one at the peak
			const heap = new THREE.Group(), row = new THREE.Group();
			d3.g.add(heap);
			d3.shelf.add(row);
			for (let n = 0; n < 12; n++) {
				const layer = n < 7 ? 0 : n < 11 ? 1 : 2;
				const ang = rnd() * Math.PI * 2, rad = [0.3, 0.16, 0][layer] * (0.6 + rnd() * 0.4);
				const v = piece(0.42);
				v.position.set(Math.cos(ang) * rad, layer * 0.1, Math.sin(ang) * rad * 0.7);
				v.rotation.set((rnd() - 0.5) * 0.4, rnd() * 6, (rnd() - 0.5) * 0.4);
				heap.add(v);
			}
			// and a row on the shelf
			for (let n = 0; n < 4; n++) {
				const v = piece(0.34);
				v.position.set(-0.3 + n * 0.2, 0.02, 0.02);
				v.rotation.y = rnd() * 6;
				row.add(v);
			}
			shadows(heap);
			shadows(row);
			bake(heap);
			bake(row);
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
	// each, and SERVE painted on the counter's front under it
	for (let k = 0; k < WINDOWS; k++) {
		const a = (HATCH + colW(WINDOWS) * (k + 0.5)) / W;
		const p = wallPoint(1, a, CT.d + 0.3);
		mesh(CYL(0.22, 0.2, 0.025, 40), MAT.steel, room, p.x, CT.y + 0.015, p.z).receiveShadow = true;
		const b = wallPoint(1, a + 0.05, CT.d + 0.45);
		mesh(new THREE.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xe9c04a, 0.2, 1), room, b.x, CT.y + 0.01, b.z);
		mesh(SPH(0.012, 8), std(0xe9c04a, 0.2, 1), room, b.x, CT.y + 0.075, b.z);
		const f = wallPoint(1, a, CT.d - 0.006);
		mesh(new THREE.PlaneGeometry(0.62, 0.465), paintMat(() => labelTex('SERVE', '#e9ff4a', 'serve', seeded(90 + k))), room, f.x, 0.5, f.z);
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
		slime(g, mat, glow) {
			mesh(CYL(0.2, 0.16, 0.2, 24, true), std(0x5a6360, 0.35, 0.7, { side: THREE.DoubleSide }), g, 0, 0.1, 0);
			mesh(CYL(0.16, 0.16, 0.02, 24), std(0x5a6360, 0.35, 0.7), g, 0, 0.01, 0);
			const blob = mesh(new THREE.SphereGeometry(0.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat, g, 0, 0.17, 0);
			blob.scale.y = 0.7;
			for (const [x, z] of [[0.06, 0.05], [-0.07, -0.02]]) mesh(SPH(0.03, 8), glow, g, x, 0.26, z);
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
	function grin(parent, x, y, z, w, h, frown, mat) {
		const s = new THREE.Shape();
		s.moveTo(-w / 2, 0);
		s.quadraticCurveTo(0, -h * 2, w / 2, 0);
		s.quadraticCurveTo(0, -h * 0.5, -w / 2, 0);
		const m = slab(s, 0.02, Math.min(0.03, w * 0.08), mat || MOUTH, parent);
		m.position.set(x, y, z);
		if (frown) m.rotation.z = Math.PI;
		if (partSink) partSink.mouths.push(m);   // (building a mutant: it talks with this)
		return m;
	}
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
			if (o.lumps) d += lumpy(p, 3) * 0.012 * o.lumps;
			return d;
		});
		const h = mesh(geo, skin, parent);
		h.scale.set(0.9 * w, long, 1);
		if (o.nose !== false) {
			const nose = mesh(superBox(0.055, 0.11, 0.075, 0.55, 0.35, 0.5, 24), skin, parent, 0, -0.06, 0.245);
			nose.rotation.x = -0.28;
		}
		if (o.ears !== false) for (const s of [-1, 1]) {
			const ear = mesh(superBox(0.035, 0.11, 0.075, 0.6, 0.5, 0.5, 20), skin, parent, s * 0.235 * w, 0, -0.01);
			ear.rotation.y = s * 0.35;
		}
		return h;
	}
	// a body: the torso in its clothes (shoulder width, belly), a neck, two arms with hands
	// resting forward (sleeves in the cloth unless bare). Returns the shoulder points.
	function humanBody(g, skin, cloth, o = {}) {
		const sh = o.shoulders || 0.4, belly = o.belly || 0;
		const torso = mesh(sculpt(lathe([[0, 0.35], [0.34, 0.37], [0.37 + belly * 0.5, 0.7], [0.35 + belly * 0.3, 0.98], [sh + 0.02, 1.3], [sh - 0.04, 1.45], [0.15, 1.55], [0, 1.56]], 40, 36),
			(p, n) => belly * 0.12 * Math.exp(-Math.pow(p.y - 0.8, 2) / 0.04) * Math.max(0, n.z)), cloth, g);
		torso.scale.z = 0.66;
		mesh(CYL(0.095, 0.115, 0.24, 20), skin, g, 0, 1.62, 0.01);
		if (o.arms !== false) for (const s of [-1, 1]) {
			const sleeve = o.bare ? skin : cloth;
			tube(g, [[s * (sh - 0.02), 1.4, 0], [s * (sh + 0.1), 1.12, 0.06], [s * (sh + 0.1), 1.0, 0.16]], 0.088, 0.072, sleeve, 14, 20);
			tube(g, [[s * (sh + 0.1), 1.0, 0.16], [s * (sh - 0.02), 0.95, 0.32], [s * (sh - 0.1), 0.94, 0.44]], 0.068, 0.055, o.bareForearm || o.bare ? skin : sleeve, 14, 18);
			const hand = mesh(superBox(0.1, 0.055, 0.13, 0.5, 0.4, 0.5, 20), skin, g, s * (sh - 0.12), 0.93, 0.5);
			hand.rotation.y = -s * 0.3;
			const thumb = mesh(superBox(0.03, 0.03, 0.06, 0.6, 0.6, 0.6, 12), skin, g, s * (sh - 0.17), 0.95, 0.47);
			thumb.rotation.y = -s * 0.8;
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
			humanHead(head, skin, { sockets: false, long: 1.05 });
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
			humanHead(head, skin, { nose: false, sockets: false, ears: false, w: 1.05 });
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
			humanHead(head, skin, { nose: false, ears: false });
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
		blob: { wet: 1, glow: '#b8ff6a', iris: '#ffd23a' },
		cyclops: { wet: 0.25, glow: '#b07aff', iris: '#3af2ff' },
		mold: { wet: 0.7, glow: '#e9ff4a', iris: '#ff3ad8' },
		pigeon: { wet: 0, glow: '#6ab8ff', iris: '#ff7a1a' },
		skull: { wet: 0.3, glow: '#9dff3a', iris: '#9dff3a' },
		squid: { wet: 1, glow: '#ff6ac8', iris: '#7aff3a' },
		fungus: { wet: 0.15, glow: '#ffb03a', iris: '#ffb03a' },
		overlord: { wet: 0.5, glow: '#ff2d8f', iris: '#ff2d8f' },
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
		const m = { g, skin, eyes: [], mouths: [], iris: (SKIN[type.id] || {}).iris || '#ffb21f', blink: 1 + Math.random() * 3 };
		partSink = m;
		try { MUTANT_3D[type.id](g, skin, m); } finally { partSink = null; }
		// cloth and the like: a soft sheen on the matte things they wear (their own materials only)
		const shared = new Set(Object.values(MAT).concat([EYE_WHITE, PUPIL, MOUTH, skin]));
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
	const sgnpow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
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
		mesh(superBox(0.42, 0.26, 0.44, 0.62, 0.18, 0.32, 48), shell, head, 0, 0.14, 0);
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
		const plate = new THREE.Group();
		plate.position.set(0, 0.258, 0);   // (its foot on the crown of the head, 0.27 up)
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
			// the mouth: working while they talk
			const talking = c.sayT > 0 && c.state !== 'leave';
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
		else if (key === 'slime') { ctx.beginPath(); ctx.moveTo(0, -12); ctx.bezierCurveTo(8, -2, 10, 5, 0, 10); ctx.bezierCurveTo(-10, 5, -8, -2, 0, -12); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke(); }
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
		const counter = mesh(BOX(3.2, CT.y, CT.deep), std(KITCHEN.counter, 0.35, 0.1), ls, 0, CT.y / 2, CZ);
		counter.castShadow = counter.receiveShadow = true;
		mesh(BOX(3.28, 0.05, CT.deep + 0.06), MAT.steel, ls, 0, CT.y, CZ).receiveShadow = true;
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
