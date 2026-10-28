/*
 * Grub-o-Tron 3000
 *
 * The last fast-food joint after the end of the world. The players are its
 * cyborg cooks (part survivor, part kitchen robot: a whisk for an arm, a
 * fryer for a belly), and the customers are the mutants who crawl in from
 * the wasteland demanding food nobody should eat.
 *
 * The room is the kitchen:
 *   LEFT WALL    THE OLD WAYS: chopping block, deep fryer, scorch grill and
 *                sludge vat
 *   FRONT WALL   the teleport hatch (ingredients beam in, left), the serving
 *                windows (the mutants and their order tickets, middle) and
 *                the void chute (the bin, right)
 *   RIGHT WALL   THE NEW WAYS: matter compressor, mutagen injector,
 *                microwave of elsewhere and cryo-blaster
 *
 * You carry one thing at a time. Tap a hatch pod to grab an ingredient, tap
 * a station to drop it in, work the station, tap it again to take it out,
 * and tap a mutant's window to hand it over. A ticket lists each part of
 * the dish: an ingredient and the stations it goes through, in order.
 *   chop    tap the block, again and again (any of you)
 *   fry     cooks by itself; take it out while it's golden, or it burns
 *   grill   cooks by itself, but tap it to flip it when it says FLIP!
 *   stir    stand at the vat and sway from side to side
 *   press   stand at the compressor and squat (taps help a little)
 *   inject  tap when the dial's needle is in the green
 *   warp    cooks by itself into another dimension, and comes back out of
 *           a portal somewhere else in the room: find it and tap it
 *   cryo    stand at the blaster and hold still
 * Burnt food left sitting starts a fire (tap the flames to put it out, or
 * it spreads); bin burnt food in the void chute.
 *
 * Score: a finished dish pays everyone who had a hand in it (grabbed it,
 * worked it, carried it, served it) its price plus a tip for speed. The
 * shifts ramp over the ten minutes: more windows, longer recipes, less
 * patience, and from the second shift, trouble (grease fires, a jammed
 * hatch, dimensional leaks, the Overlord's feast).
 *
 * Input: px / pz (which wall you're at and where along it; pz is 1 at the
 * front wall), py (squats), movement (stir, hold still) and wall taps,
 * credited to the nearest player who can use them.
 */
IGB.register('grub-o-tron', function GrubOTron(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;
	const FONT = 'Rubik';
	const INK = '#0b0d0c';

	/* ---------- tuning ---------- */

	const COUNTER = 660;          // the counter top, on every wall
	const SLOT = 400;             // a station's width (four to a wall)
	const AT = 0.34;              // this near a wall (0..1 of the room) and you're working its stations
	const NEAR_TAP = 0.8;         // a tap goes to a player this near the spot (along + out), or no one
	const HATCH = 330;            // the front wall: the hatch up to here...
	const CHUTE = 1270;           // ...the chute from here, and the windows between
	const WIN_TOP = 112;
	const WIN_H = 290;
	const POD_Y = [318, 452, 586];
	const POD_R = 56;
	const PORTAL_R = 125;
	const CHOP_TAPS = 6;
	const FRY = { cook: 5, burn: 6 };              // seconds to golden, then golden this long
	const GRILL = { flipAt: 2.2, flipBy: 5.2, cook: 7.5, burn: 6.5 };
	const STIR_NEED = 1.0;        // room widths of swaying, in all
	const PRESS = { squats: 3, tap: 0.1, down: 0.62, up: 0.5 };
	const INJECT = { period: 1.6, zone: 0.11, lockout: 0.7 };
	const WARP_TIME = 4;
	const CRYO = { need: 3, still: 0.12, thaw: 0.15 };   // seconds held still; slower than this (room widths a second) is still
	const FIRE = { hp: 6, after: 6, spread: 12 };       // taps to put out; seconds burnt food sits before it lights; and before a fire spreads
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
		{ kind: 'chop', wall: 0, slot: 0, name: 'CHOPPING BLOCK', adj: 'CHOPPED', colour: '#ff8a2a' },
		{ kind: 'fry', wall: 0, slot: 1, name: 'DEEP FRYER', adj: 'FRIED', colour: '#ffc21a' },
		{ kind: 'grill', wall: 0, slot: 2, name: 'SCORCH GRILL', adj: 'GRILLED', colour: '#ff4a32' },
		{ kind: 'stir', wall: 0, slot: 3, name: 'SLUDGE VAT', adj: 'STEWED', colour: '#9dff3a' },
		{ kind: 'press', wall: 2, slot: 0, name: 'MATTER COMPRESSOR', adj: 'CRUSHED', colour: '#e9ff4a' },
		{ kind: 'inject', wall: 2, slot: 1, name: 'MUTAGEN INJECTOR', adj: 'MUTATED', colour: '#d04dff' },
		{ kind: 'warp', wall: 2, slot: 2, name: 'MICROWAVE OF ELSEWHERE', adj: 'WARPED', colour: '#3af2ff' },
		{ kind: 'cryo', wall: 2, slot: 3, name: 'CRYO-BLASTER', adj: 'FROZEN', colour: '#8fdcff' },
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
		{ id: 'mold', name: 'GARY (A MOULD)', skin: '#b8c27a' },
		{ id: 'pigeon', name: 'EXECUTIVE PIGEON', skin: '#8d93a6' },
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
	const tut = { held: [], put: [], served: 0 };

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

	const everyone = (fn) => count > 0 && chefs.every((c, i) => fn(i));
	const TUTORIAL = [
		{ caption: 'TAP THE HATCH TO GRAB A RAD-ROACH', min: 2, max: 22, did: () => everyone((i) => tut.held[i]) },
		{ caption: 'TAP A COOKING STATION TO DROP IT IN', min: 2, max: 25, did: () => everyone((i) => tut.put[i]) },
		{ caption: 'COOK IT, TAKE IT, SERVE A MUTANT', min: 3, max: 45, did: () => tut.served >= Math.min(count, 3) },
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
				tut.held = []; tut.put = []; tut.served = 0;
			},
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 5,
			enter() { clearKitchen(); phase = 'intro'; scores = scores.map(() => 0); },
			update(dt) { tick(dt); },
			draw(ctx, bt) {
				drawManager(ctx, bt);
				show.onWalls(ctx, function (c, wall) {
					show.slam(c, 'GRUB-O-TRON IS OPEN!', W / 2, 290, 112, bt - 0.3, { fill: '#9dff3a' });
					show.slam(c, 'FEED THE MUTANTS. DON\'T GET EATEN.', W / 2, 410, 58, bt - 1.3, { fill: 'white' });
					if (wall !== 1) show.slam(c, wall === 0 ? '◀ THE OLD WAYS' : 'THE NEW WAYS ▶', W / 2, 520, 54, bt - 2.2, { fill: wall === 0 ? '#ff8a2a' : '#3af2ff' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
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
		show.go('title');
	}

	function clearKitchen() {
		stations = STATIONS.map((d) => Object.assign({}, d, {
			x0: d.wall * W + d.slot * SLOT, item: null, state: 'idle', t: 0, prog: 0, doneT: 0, burntT: 0,
			fire: 0, fireT: 0, flipped: false, lock: 0, hit: 0, glow: 0, shake: 0, paddle: 0,
		}));
		for (let k = 0; k < 4; k++) { customers[k] = null; slotWait[k] = 1 + k; }
		pods = POD_Y.map((y, k) => ({ ing: null, wait: 0.3 + k * 0.3, beam: 0 }));
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

	// where a player is: the wall they're nearest (sticky), how far along it, how near
	function wallsOf(p) {
		return { along: [p.pz, p.px, 1 - p.pz], dist: [p.px, 1 - p.pz, 1 - p.px] };
	}

	function readChef(i, dt) {
		const p = latest[i];
		const c = chefs[i];
		if (!p) return;
		const { along, dist } = wallsOf(p);
		let best = c.wall;
		let bd = dist[c.wall] - 0.04;
		for (let w = 0; w < 3; w++) if (dist[w] < bd) { best = w; bd = dist[w]; }
		c.wall = best;
		c.along = clamp(along[best], 0, 1);
		c.dist = dist[best];
		const moved = c.prev ? Math.hypot(p.px - c.prev.px, p.pz - c.prev.pz) : 0;
		c.prev = { px: p.px, pz: p.pz };
		c.moved = moved;
		if (dt > 0) c.speed = lerp(c.speed, moved / dt, Math.min(1, dt * 5));
		const tx = best * W + clamp(c.along, 0.05, 0.95) * W;
		if (c.drawWall !== best) { c.x = tx; c.drawWall = best; } else c.x = lerp(c.x, tx, Math.min(1, dt * 12));
		c.station = (best !== 1 && c.dist < AT) ? stations.find((s) => s.wall === best && s.slot === clamp(Math.floor(c.along * 4), 0, 3)) : null;
		c.work = Math.max(0, c.work - dt * 2);
		// a squat: down past PRESS.down, back up past PRESS.up
		if (typeof p.py === 'number') {
			if (!c.down && p.py > PRESS.down) c.down = true;
			else if (c.down && p.py < PRESS.up) { c.down = false; pump(i); }
		}
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
		float(s.x0 + 200, 420, s.kind === 'fry' ? 'GOLDEN!' : 'DONE!', '#9dff3a', 44);
	}

	function burn(s) {
		s.item.burnt = true;
		s.state = 'burnt';
		s.burntT = 0;
		burns++;
		show.fx('fizzle', 0.7);
		float(s.x0 + 200, 420, 'BURNT!', '#ff4a32', 50);
	}

	function ignite(s) {
		s.fire = FIRE.hp;
		s.fireT = 0;
		s.item = null;
		s.state = 'idle';
		show.fx('fireball', 0.8);
		show.shake = Math.max(show.shake, 0.25);
		float(s.x0 + 200, 400, 'FIRE!', '#ff4a32', 64);
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

	function tapStation(s, hit) {
		if (s.fire > 0) {
			s.fire--;
			s.shake = 1;
			show.fx('whoosh', 0.6, 1.4);
			if (s.fire <= 0) { float(s.x0 + 200, 420, 'PUT OUT!', '#8fdcff', 50); show.fx('skip', 0.5); }
			return;
		}
		if (!s.item) {
			const i = hit.find((k) => chefs[k].held && !chefs[k].held.burnt && !chefs[k].held.steps.includes(s.kind) && chefs[k].held.steps.length < 3);
			if (i === undefined) {
				const j = hit.find((k) => chefs[k].held);
				if (j === undefined) float(s.x0 + 200, 420, 'BRING ME FOOD', '#ffffff', 34);
				else if (chefs[j].held.burnt) float(s.x0 + 200, 420, 'BIN THAT IN THE CHUTE', '#ff4a32', 34);
				else float(s.x0 + 200, 420, 'ALREADY ' + s.adj, '#ffffff', 34);
				return;
			}
			const item = chefs[i].held;
			chefs[i].held = null;
			Object.assign(s, { item, state: 'work', t: 0, prog: 0, doneT: 0, burntT: 0, flipped: false, lock: 0 });
			credit(s, i);
			tut.put[i] = true;
			show.fx('tap', 0.8);
			if (s.kind === 'warp') show.fx('charge', 0.5);
			return;
		}
		if (s.state === 'done' || s.state === 'burnt') {
			const i = hit.find((k) => !chefs[k].held);
			if (i === undefined) { float(s.x0 + 200, 420, 'HANDS FULL!', '#ffffff', 36); return; }
			chefs[i].held = s.item;
			if (!s.item.burnt && !s.item.by.includes(i)) s.item.by.push(i);
			s.item = null;
			s.state = 'idle';
			show.fx('lockIn', 0.6);
			return;
		}
		// working it
		const i = hit[0];
		if (i !== undefined) chefs[i].work = 1;
		if (s.kind === 'chop') {
			s.prog += 1 / CHOP_TAPS;
			s.hit = 1;
			if (i !== undefined) credit(s, i);
			show.fx('swordSwish', 0.5, 0.9 + Math.random() * 0.3);
			show.fx('thud', 0.35, 1.5);
			if (s.prog >= 0.999) finish(s);
		} else if (s.kind === 'inject') {
			if (s.lock > 0) return;
			if (Math.abs(needle(s) - 0.5) < INJECT.zone) {
				if (i !== undefined) credit(s, i);
				float(s.x0 + 200, 380, 'PERFECT DOSE!', '#d04dff', 44);
				show.fx('correct', 0.6);
				finish(s);
			} else {
				s.lock = INJECT.lockout;
				s.shake = 1;
				float(s.x0 + 200, 380, 'SPLORT!', '#ff2d8f', 50);
				show.fx('wrong', 0.6);
			}
		} else if (s.kind === 'grill') {
			if (!s.flipped && s.t >= GRILL.flipAt) {
				s.flipped = true;
				s.hit = 1;
				if (i !== undefined) credit(s, i);
				float(s.x0 + 200, 380, 'FLIPPED!', '#ffc21a', 46);
				show.fx('whoosh', 0.5);
			} else float(s.x0 + 200, 380, s.flipped ? 'SIZZLING...' : 'NOT YET!', '#ffffff', 34);
		} else if (s.kind === 'press') {
			s.prog += PRESS.tap;
			s.hit = 0.6;
			if (i !== undefined) credit(s, i);
			show.fx('thud', 0.4);
			if (s.prog >= 0.999) finish(s);
			else float(s.x0 + 200, 380, 'SQUAT TO CRUSH!', '#e9ff4a', 34);
		} else if (s.kind === 'stir') float(s.x0 + 200, 380, 'SWAY TO STIR!', '#9dff3a', 36);
		else if (s.kind === 'cryo') float(s.x0 + 200, 380, 'HOLD STILL!', '#8fdcff', 36);
		else if (s.kind === 'warp') float(s.x0 + 200, 380, 'IT\'S IN ANOTHER DIMENSION', '#3af2ff', 32);
		else float(s.x0 + 200, 380, 'WAIT FOR GOLDEN...', '#ffc21a', 34);
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
			pod.wait -= dt;
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

	function tapHatch(at, hit) {
		if (hatch.jam > 0) {
			hatch.jam--;
			hatch.shake = 1;
			show.fx('thud', 0.6);
			if (hatch.jam <= 0) { float(HATCH / 2 + W, 230, 'UNJAMMED!', '#9dff3a', 44); show.fx('allSet', 0.4); }
			else float(at.x, at.y - 40, 'BANG!', '#ffffff', 40);
			return;
		}
		let k = 0;
		for (let j = 1; j < POD_Y.length; j++) if (Math.abs(at.y - POD_Y[j]) < Math.abs(at.y - POD_Y[k])) k = j;
		const pod = pods[k];
		if (!pod.ing) return;
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { float(W + HATCH / 2, POD_Y[k] - 70, 'HANDS FULL!', '#ffffff', 34); return; }
		chefs[i].held = { id: nextId++, ing: pod.ing, steps: [], burnt: false, by: [i] };
		tut.held[i] = true;
		pod.ing = null;
		pod.wait = 1.0;
		show.fx('pop', 0.7);
	}

	function tapChute(hit) {
		const i = hit.find((n) => chefs[n].held);
		if (i === undefined) return;
		chefs[i].held = null;
		show.fx('whooshLong', 0.5, 0.7);
		float(W + (CHUTE + W) / 2, 400, pick(['INTO THE VOID', 'GONE FOREVER', 'THE VOID SAYS THANKS']), '#d04dff', 34);
	}

	function spawnPortal(item, from) {
		let x, y, tries = 0;
		do {
			const wall = Math.floor(Math.random() * 3);
			x = wall * W + (0.12 + Math.random() * 0.76) * W;
			y = 190 + Math.random() * 300;
			tries++;
		} while (tries < 20 && (Math.abs(x - (from.x0 + 200)) < 600 || (x > W + HATCH - 60 && x < W + CHUTE + 60)));
		portals.push({ item, x, y, t: 0 });
		if (portals.length > MAX_PORTALS) portals.shift();
		show.fx('reveal', 0.5, 0.8);
		float(from.x0 + 200, 400, 'IT\'S... SOMEWHERE ELSE!', '#3af2ff', 36);
	}

	function stepPortals(dt) {
		for (const p of portals) p.t += dt;
	}

	function tapPortal(p, hit) {
		const i = hit.find((n) => !chefs[n].held);
		if (i === undefined) { float(p.x, p.y - 140, 'HANDS FULL!', '#ffffff', 34); return true; }
		chefs[i].held = p.item;
		if (!p.item.by.includes(i)) p.item.by.push(i);
		portals.splice(portals.indexOf(p), 1);
		show.fx('pop', 0.8, 0.8);
		float(p.x, p.y - 100, 'GOT IT!', '#3af2ff', 40);
		return true;
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
		const c = customers[k];
		if (!c || c.state !== 'wait') return;
		for (const i of hit) {
			const item = chefs[i].held;
			const part = item && c.parts.find((pt) => fits(item, pt));
			if (!part) continue;
			part.filled = true;
			part.item = item;
			chefs[i].held = null;
			for (const n of item.by.concat([i])) if (!c.by.includes(n)) c.by.push(n);
			show.fx('lockIn', 0.7);
			if (c.parts.every((pt) => pt.filled)) complete(c);
			else { c.say = 'AND THE REST?'; c.sayT = 1.6; }
			return;
		}
		const holder = hit.find((i) => chefs[i].held);
		if (holder !== undefined) {
			c.say = chefs[holder].held.burnt ? 'IS THAT... CHARCOAL?' : pick(NOPE);
			c.sayT = 1.8;
			show.fx('buzz', 0.5);
		} else if (c.sayT <= 0) {
			c.say = 'WELL? I\'M WAITING.';
			c.sayT = 1.4;
		}
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
			float(chefs[i].x, 560, '+' + (price + tip), colourOf(i), 52);
		}
		float(c.x, WIN_TOP + 60, tip > 0 ? 'TIP +' + tip : 'SERVED', '#e9ff4a', 40);
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
		float(c.x, WIN_TOP + 60, 'WALKOUT!', '#ff4a32', 46);
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
			setBanner('GREASE FIRE!', 'TAP THE FLAMES TO PUT THEM OUT', '#ff4a32');
			show.fx('alarm', 0.5);
		} else if (kind === 'jam') {
			hatch.jam = 8;
			hatch.shake = 1;
			setBanner('HATCH JAMMED!', 'BANG ON THE HATCH TO FIX IT', '#ffc21a');
			show.fx('alarm', 0.5);
		} else if (kind === 'leak') {
			const warp = stations.find((s) => s.kind === 'warp');
			for (let n = 0; n < 3; n++) spawnPortal({ id: nextId++, ing: chooseIng(), steps: [], burnt: false, by: [] }, warp);
			setBanner('DIMENSIONAL LEAK!', 'FREE INGREDIENTS... SOMEWHERE', '#3af2ff');
		} else if (kind === 'vip') {
			vipPending = true;
			setBanner('THE OVERLORD APPROACHES', 'SERVE ITS FEAST FOR A FORTUNE', '#d04dff');
			show.fx('villainReveal', 0.5);
		}
	}

	/* ---------- taps ---------- */

	// who a tap is for: the simulator's touching player first, then everyone
	// near the spot, nearest first (callers pick the first that can use it)
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
			if (!p || i === flagged) continue;
			const { along, dist } = wallsOf(p);
			const d = Math.abs(along[wall] - a) + dist[wall];
			if (d < NEAR_TAP) near.push({ i, d });
		}
		near.sort((x, y) => x.d - y.d);
		const list = near.map((n) => n.i);
		if (flagged >= 0) list.unshift(flagged);
		return list;
	}

	function tap(at) {
		if (!at || !count || (phase !== 'tutorial' && phase !== 'play')) return;
		if (show.paused) return;
		ripples.push({ x: at.x, y: at.y, t: 0 });
		const hit = hitters(at);
		const portal = portals.slice().reverse().find((p) => Math.hypot(p.x - at.x, p.y - at.y) < PORTAL_R);
		if (portal) { tapPortal(portal, hit); return; }
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		const lx = at.x - wall * W;
		if (wall === 1) {
			if (lx < HATCH) tapHatch(at, hit);
			else if (lx >= CHUTE) tapChute(hit);
			else tapCustomer(clamp(Math.floor((lx - HATCH) / colW(windowsNow())), 0, windowsNow() - 1), hit);
			return;
		}
		const s = stations.find((o) => o.wall === wall && o.slot === clamp(Math.floor(lx / SLOT), 0, 3));
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

	/* ---------- drawing: the walls (built once) ---------- */

	const bgs = [];
	function buildWall(w) {
		const cv = document.createElement('canvas');
		cv.width = W;
		cv.height = H;
		const c = cv.getContext('2d');
		const rnd = seeded(91 + w * 17);
		// grimy tiles
		c.fillStyle = '#0c0f0d';
		c.fillRect(0, 0, W, H);
		const T = 64;
		for (let y = 0; y < COUNTER; y += T) {
			for (let x = 0; x < W; x += T) {
				const broken = rnd() < 0.06;
				const l = broken ? 5 : 11 + rnd() * 6;
				c.fillStyle = `hsl(${105 + rnd() * 40},${8 + rnd() * 10}%,${l}%)`;
				c.fillRect(x + 2, y + 2, T - 4, T - 4);
				if (!broken && rnd() < 0.12) {   // (a crack)
					c.strokeStyle = 'rgba(0,0,0,0.6)';
					c.lineWidth = 2;
					c.beginPath();
					c.moveTo(x + rnd() * T, y + 2);
					c.lineTo(x + rnd() * T, y + T / 2);
					c.lineTo(x + rnd() * T, y + T - 2);
					c.stroke();
				}
			}
		}
		// grime: a dark top, stains, drips
		const g = c.createLinearGradient(0, 0, 0, COUNTER);
		g.addColorStop(0, 'rgba(0,0,0,0.75)');
		g.addColorStop(0.5, 'rgba(0,0,0,0.25)');
		g.addColorStop(1, 'rgba(20,10,0,0.55)');
		c.fillStyle = g;
		c.fillRect(0, 0, W, COUNTER);
		for (let n = 0; n < 14; n++) {
			const x = rnd() * W, y = 120 + rnd() * 480, r = 40 + rnd() * 140;
			const st = c.createRadialGradient(x, y, 0, x, y, r);
			const hue = rnd() < 0.5 ? '60,40,10' : '40,80,20';
			st.addColorStop(0, `rgba(${hue},0.35)`);
			st.addColorStop(1, `rgba(${hue},0)`);
			c.fillStyle = st;
			c.fillRect(x - r, y - r, r * 2, r * 2);
		}
		for (let n = 0; n < 26; n++) {
			const x = rnd() * W, y = 100 + rnd() * 80, len = 40 + rnd() * 260;
			c.strokeStyle = rnd() < 0.5 ? 'rgba(120,160,40,0.25)' : 'rgba(90,50,20,0.35)';
			c.lineWidth = 3 + rnd() * 5;
			c.lineCap = 'round';
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + (rnd() - 0.5) * 6, y + len);
			c.stroke();
		}
		// pipes along the top
		for (const [y, r] of [[96, 16], [128, 9]]) {
			const pg = c.createLinearGradient(0, y - r, 0, y + r);
			pg.addColorStop(0, '#5b4a3a');
			pg.addColorStop(0.4, '#8b6b4a');
			pg.addColorStop(1, '#2a1e14');
			c.fillStyle = pg;
			c.fillRect(0, y - r, W, r * 2);
			for (let x = 40 + rnd() * 100; x < W; x += 180 + rnd() * 160) {
				c.fillStyle = '#3a2a1c';
				c.fillRect(x, y - r - 4, 16, r * 2 + 8);
				if (rnd() < 0.3) { c.fillStyle = 'rgba(140,90,40,0.5)'; c.fillRect(x + 4, y + r, 6, 30 + rnd() * 60); }
			}
		}
		// hazard stripes over the counter
		c.save();
		c.beginPath();
		c.rect(0, COUNTER - 26, W, 14);
		c.clip();
		c.fillStyle = '#1a1a10';
		c.fillRect(0, COUNTER - 26, W, 14);
		c.fillStyle = '#b89a1a';
		for (let x = -20; x < W; x += 40) { c.beginPath(); c.moveTo(x, COUNTER - 12); c.lineTo(x + 20, COUNTER - 12); c.lineTo(x + 34, COUNTER - 26); c.lineTo(x + 14, COUNTER - 26); c.fill(); }
		c.restore();
		// the counter: a steel top, a dented front
		const tg = c.createLinearGradient(0, COUNTER, 0, COUNTER + 40);
		tg.addColorStop(0, '#9aa3a0');
		tg.addColorStop(0.3, '#5d6563');
		tg.addColorStop(1, '#2a302e');
		c.fillStyle = tg;
		c.fillRect(0, COUNTER, W, 40);
		c.fillStyle = '#171b1a';
		c.fillRect(0, COUNTER + 40, W, H - COUNTER - 40);
		for (let x = 0; x < W; x += 200) {
			c.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.03})`;
			c.fillRect(x + 8, COUNTER + 52, 184, H - COUNTER - 60);
			c.fillStyle = '#4a514f';
			for (const [rx, ry] of [[18, COUNTER + 64], [182, COUNTER + 64], [18, H - 20], [182, H - 20]]) { c.beginPath(); c.arc(x + rx, ry, 4, 0, Math.PI * 2); c.fill(); }
			if (rnd() < 0.5) {   // (rust)
				const rx = x + rnd() * 180;
				const rg = c.createLinearGradient(0, COUNTER + 40, 0, COUNTER + 200);
				rg.addColorStop(0, 'rgba(140,70,20,0.6)');
				rg.addColorStop(1, 'rgba(140,70,20,0)');
				c.fillStyle = rg;
				c.fillRect(rx, COUNTER + 40, 10 + rnd() * 20, 160);
			}
		}
		// the front wall: the window frames' backing, the hatch's bulkhead and the chute's
		if (w === 1) {
			c.fillStyle = '#1d2422';
			c.fillRect(20, 210, HATCH - 40, 440);
			c.fillRect(CHUTE + 20, 210, W - CHUTE - 40, 440);
			c.strokeStyle = '#3a4442';
			c.lineWidth = 6;
			c.strokeRect(20, 210, HATCH - 40, 440);
			c.strokeRect(CHUTE + 20, 210, W - CHUTE - 40, 440);
		}
		return cv;
	}

	function wallBg(w) {
		if (!bgs[w]) bgs[w] = buildWall(w);
		return bgs[w];
	}

	/* ---------- drawing: the world ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		show.frame(ctx, dt, drawWorld);
	};

	function drawWorld(ctx) {
		for (let w = 0; w < 3; w++) ctx.drawImage(wallBg(w), w * W, 0, W, H);
		drawSigns(ctx);
		for (const s of stations) drawStation(ctx, s);
		drawHatch(ctx);
		drawChute(ctx);
		drawWindows(ctx);
		for (const p of portals) drawPortal(ctx, p);
		const order = chefs.map((c, i) => i).sort((a, b) => chefs[b].dist - chefs[a].dist);
		for (const i of order) drawChefInWorld(ctx, i);
		for (const r of ripples) art.circle(ctx, r.x, r.y, 20 + r.t * 160, { stroke: 'white', lineWidth: 6, alpha: 1 - r.t / 0.5 });
		for (const f of floaters) {
			const k = f.t / 1.5;
			art.text(ctx, f.text, f.x, f.y - k * 90, { size: f.size * (k < 0.1 ? 0.6 + k * 4 : 1), weight: 800, font: FONT, fill: f.fill, outline: INK, outlineWidth: 6, alpha: 1 - Math.max(0, k - 0.7) / 0.3 });
		}
	}

	function neon(ctx, text, x, y, size, colour, flicker) {
		const on = flicker ? (Math.sin(t * 23 + x) > -0.92 || Math.sin(t * 3.1 + x) > 0.3) : true;
		art.text(ctx, text, x, y, { size, weight: 800, font: FONT, fill: on ? '#ffffff' : '#555', outline: on ? colour : '#333', outlineWidth: 5, shadow: on ? { color: colour, blur: 30 } : null });
	}

	function drawSigns(ctx) {
		neon(ctx, 'THE OLD WAYS', W / 2, 172, 56, '#ff8a2a', true);
		neon(ctx, 'THE NEW WAYS', 2 * W + W / 2, 172, 56, '#3af2ff', true);
		neon(ctx, 'TELEPORT HATCH', W + HATCH / 2, 178, 30, '#9dff3a', false);
		neon(ctx, 'VOID CHUTE', W + (CHUTE + W) / 2, 178, 30, '#d04dff', true);
		// fans in the corners, spinning
		for (const x of [120, W - 120, 2 * W + 120, 3 * W - 120]) {
			art.circle(ctx, x, 190, 52, { fill: '#141816', stroke: '#3a4442', lineWidth: 5 });
			for (let b = 0; b < 4; b++) {
				const a = t * 6 + b * Math.PI / 2;
				art.line(ctx, [[x, 190], [x + Math.cos(a) * 44, 190 + Math.sin(a) * 44]], { stroke: '#4a5452', lineWidth: 14 });
			}
			art.circle(ctx, x, 190, 8, { fill: '#6a7472' });
		}
	}

	function bar(ctx, x, y, w, k, colour, back) {
		art.roundRect(ctx, x - w / 2 - 4, y - 13, w + 8, 26, 13, { fill: INK });
		art.roundRect(ctx, x - w / 2, y - 9, w, 18, 9, { fill: back || '#2a302e' });
		if (k > 0) art.roundRect(ctx, x - w / 2, y - 9, Math.max(18, w * clamp(k, 0, 1)), 18, 9, { fill: colour });
	}

	function prompt(ctx, x, text, fill, pulse) {
		const s = pulse ? 1 + Math.sin(t * 10) * 0.06 : 1;
		art.text(ctx, text, x, 282, { size: 30 * s, weight: 800, font: FONT, fill, outline: INK, outlineWidth: 6 });
	}

	function drawStation(ctx, s) {
		const cx = s.x0 + SLOT / 2;
		const base = COUNTER;
		const at = chefsAt(s);
		const sx = s.shake ? (Math.random() - 0.5) * 16 * s.shake : 0;
		ctx.save();
		ctx.translate(sx, 0);
		// a glow in the colour of whoever's at it
		if (at.length) {
			const g = ctx.createRadialGradient(cx, base - 120, 20, cx, base - 120, 260);
			g.addColorStop(0, hexA(colourOf(at[0]), 0.35));
			g.addColorStop(1, hexA(colourOf(at[0]), 0));
			ctx.fillStyle = g;
			ctx.fillRect(s.x0, 220, SLOT, base - 220);
		}
		// the name plate
		art.roundRect(ctx, cx - 180, 214, 360, 44, 10, { fill: '#0d100f', stroke: s.colour, lineWidth: 3 });
		art.text(ctx, s.name, cx, 237, { size: s.name.length > 16 ? 22 : 26, weight: 800, font: FONT, fill: s.colour });
		STATION_ART[s.kind](ctx, s, cx, base);
		if (s.item && s.kind !== 'warp') drawItem(ctx, s.item, cx, itemY(s), 0.95);
		// state: a prompt and a bar
		if (s.fire > 0) {
			drawFire(ctx, cx, base, s);
			prompt(ctx, cx, 'TAP TO PUT OUT! (' + s.fire + ')', '#ff4a32', true);
		} else if (s.state === 'done') {
			prompt(ctx, cx, 'READY! TAP TO TAKE', '#9dff3a', true);
			if (s.kind === 'fry' || s.kind === 'grill') bar(ctx, cx, 314, 240, 1 - s.doneT / (s.kind === 'fry' ? FRY.burn : GRILL.burn), '#ff4a32');
		} else if (s.state === 'burnt') {
			prompt(ctx, cx, 'BURNT! TAP, THEN BIN IT', '#ff4a32', true);
			drawSmoke(ctx, cx, base - 160, 1);
		} else if (s.state === 'work') {
			const hint = {
				chop: ['TAP TAP TAP!', s.prog],
				fry: ['FRYING...', s.t / FRY.cook],
				grill: [!s.flipped && s.t >= GRILL.flipAt ? 'FLIP! TAP IT!' : s.flipped ? 'SIZZLING...' : 'SEARING...', s.flipped ? s.t / GRILL.cook : Math.min(s.t, GRILL.flipAt) / GRILL.cook],
				stir: ['SWAY TO STIR!', s.prog],
				press: ['SQUAT TO CRUSH!', s.prog],
				inject: ['TAP IN THE GREEN!', -1],
				warp: ['WARPING...', s.t / WARP_TIME],
				cryo: ['HOLD STILL!', s.prog],
			}[s.kind];
			const urgent = s.kind === 'grill' && !s.flipped && s.t >= GRILL.flipAt;
			prompt(ctx, cx, hint[0], urgent ? '#ff4a32' : '#e9ff4a', urgent || ['chop', 'stir', 'press', 'cryo', 'inject'].includes(s.kind));
			if (hint[1] >= 0) bar(ctx, cx, 314, 240, hint[1], s.colour);
		} else if (!s.item) {
			art.text(ctx, 'EMPTY', cx, 282, { size: 22, weight: 700, font: FONT, fill: 'rgba(255,255,255,0.35)' });
		}
		ctx.restore();
	}

	function hexA(c, a) {
		const [r, g, b] = c.startsWith('#') ? hex(c) : ({ red: [255, 0, 0], blue: [0, 0, 255], limegreen: [50, 205, 50] }[c] || [255, 255, 255]);
		return `rgba(${r},${g},${b},${a})`;
	}

	const itemY = (s) => ({ chop: COUNTER - 150, fry: COUNTER - 215, grill: COUNTER - 175, stir: COUNTER - 215, press: COUNTER - 135, inject: COUNTER - 165, warp: COUNTER - 150, cryo: COUNTER - 140 }[s.kind]);

	function drawFire(ctx, cx, base, s) {
		for (let n = 0; n < 9; n++) {
			const ph = t * 7 + n * 1.7;
			const x = cx + (n - 4) * 34 + Math.sin(ph) * 10;
			const h = 120 + Math.sin(ph * 1.3) * 40 + (n % 3) * 30;
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			art.ellipse(ctx, x, base - 120 - h * 0.3, 34, h * 0.6, { fill: art.radial(ctx, x, base - 120, 5, h, ['rgba(255,240,120,0.95)', 'rgba(255,120,20,0.7)', 'rgba(255,40,0,0)']) });
			ctx.restore();
		}
		drawSmoke(ctx, cx, base - 300, 1.4);
	}

	function drawSmoke(ctx, x, y, k) {
		for (let n = 0; n < 4; n++) {
			const ph = (t * 0.5 + n / 4) % 1;
			art.circle(ctx, x + Math.sin(ph * 6 + n) * 30, y - ph * 160, (20 + ph * 50) * k, { fill: 'rgba(60,60,55,0.5)', alpha: 1 - ph });
		}
	}

	// each station's own machine, standing on the counter
	const STATION_ART = {
		chop(ctx, s, cx, base) {
			art.ellipse(ctx, cx, base - 10, 160, 20, { fill: 'rgba(0,0,0,0.5)' });
			art.roundRect(ctx, cx - 150, base - 120, 300, 112, 16, { fill: art.linear(ctx, 0, base - 120, 0, base, ['#8a5a32', '#4a2a14']), stroke: INK, lineWidth: 4 });
			art.ellipse(ctx, cx, base - 120, 150, 26, { fill: '#b07a48', stroke: INK, lineWidth: 4 });
			for (const r of [100, 64, 30]) art.ellipse(ctx, cx, base - 120, r, r * 0.17, { stroke: 'rgba(80,40,10,0.6)', lineWidth: 3 });
			art.ellipse(ctx, cx - 60, base - 116, 34, 7, { fill: 'rgba(120,200,40,0.55)' });
			// the cleaver: up, and down on every chop
			const a = s.hit > 0 ? -0.1 : -0.9;
			art.with(ctx, { x: cx + 120, y: base - 128, rotate: a * 57.3 }, function () {
				art.rect(ctx, -12, -10, 24, -110, { fill: '#3a2414' });
				art.roundRect(ctx, -90, -190, 110, 80, 8, { fill: art.linear(ctx, -90, 0, 20, 0, ['#e6ecea', '#8a9492']), stroke: INK, lineWidth: 4 });
				art.circle(ctx, -60, -170, 8, { fill: INK });
			});
		},
		fry(ctx, s, cx, base) {
			art.roundRect(ctx, cx - 160, base - 230, 320, 230, [10, 10, 24, 24], { fill: art.linear(ctx, cx - 160, 0, cx + 160, 0, ['#4a5250', '#a8b0ae', '#3a4240']), stroke: INK, lineWidth: 5 });
			const hot = s.state === 'work' || s.state === 'done';
			art.roundRect(ctx, cx - 140, base - 222, 280, 40, 18, { fill: hot ? art.linear(ctx, 0, base - 222, 0, base - 182, ['#ffe066', '#c88a10']) : '#7a6a2a' });
			if (hot) for (let n = 0; n < 8; n++) {
				const ph = (t * 1.6 + n * 0.37) % 1;
				art.circle(ctx, cx - 120 + n * 34, base - 205 - ph * 10, 4 + ph * 7, { stroke: '#fff3b0', lineWidth: 3, alpha: 1 - ph });
			}
			art.rect(ctx, cx - 60, base - 150, 120, 60, { fill: '#202624', stroke: INK, lineWidth: 3 });
			art.text(ctx, s.state === 'burnt' ? 'XX' : hot ? '350°' : 'OFF', cx, base - 120, { size: 30, font: 'Share Tech Mono', fill: s.state === 'burnt' ? '#ff4a32' : '#ffc21a' });
			art.line(ctx, [[cx + 100, base - 230], [cx + 150, base - 300], [cx + 210, base - 300]], { stroke: '#2a2a2a', lineWidth: 10 });
		},
		grill(ctx, s, cx, base) {
			art.roundRect(ctx, cx - 165, base - 160, 330, 160, 12, { fill: '#1c1e1d', stroke: INK, lineWidth: 5 });
			const hot = s.state === 'work' || s.state === 'done';
			art.rect(ctx, cx - 150, base - 150, 300, 40, { fill: hot ? art.linear(ctx, 0, base - 150, 0, base - 110, ['#ff9a2a', '#a01a00']) : '#3a1a10' });
			for (let n = 0; n <= 8; n++) art.line(ctx, [[cx - 150 + n * 37.5, base - 160], [cx - 150 + n * 37.5, base - 114]], { stroke: '#555b59', lineWidth: 6 });
			if (hot) for (let n = 0; n < 6; n++) {
				const ph = t * 9 + n * 2.1;
				art.ellipse(ctx, cx - 125 + n * 50, base - 118, 12, 14 + Math.sin(ph) * 6, { fill: 'rgba(255,200,60,0.8)' });
			}
			for (let n = 0; n < 4; n++) art.circle(ctx, cx - 105 + n * 70, base - 50, 14, { fill: '#3a3e3c', stroke: '#777', lineWidth: 3 });
			if (s.state === 'work') drawSmoke(ctx, cx, base - 220, 0.7);
		},
		stir(ctx, s, cx, base) {
			art.ellipse(ctx, cx, base - 8, 170, 18, { fill: 'rgba(0,0,0,0.5)' });
			art.poly(ctx, [[cx - 170, base - 230], [cx + 170, base - 230], [cx + 140, base - 10], [cx - 140, base - 10]], { fill: art.linear(ctx, cx - 170, 0, cx + 170, 0, ['#2a2e2c', '#6a706e', '#222624']), stroke: INK, lineWidth: 5 });
			art.ellipse(ctx, cx, base - 230, 170, 30, { fill: '#3a403e', stroke: INK, lineWidth: 5 });
			art.ellipse(ctx, cx, base - 226, 152, 22, { fill: '#6abf2a' });
			for (let n = 0; n < 5; n++) {
				const ph = (t * 0.9 + n * 0.21) % 1;
				art.circle(ctx, cx - 110 + n * 55, base - 226, 6 + ph * 12, { fill: '#9dff3a', alpha: 1 - ph });
			}
			// the paddle, swinging as it's stirred
			const a = Math.sin(s.paddle) * 0.5;
			art.with(ctx, { x: cx, y: base - 226, rotate: a * 57.3 }, function () {
				art.roundRect(ctx, -9, -200, 18, 200, 9, { fill: '#7a5230', stroke: INK, lineWidth: 3 });
			});
		},
		press(ctx, s, cx, base) {
			art.rect(ctx, cx - 160, base - 360, 30, 360, { fill: '#3a3e3c', stroke: INK, lineWidth: 4 });
			art.rect(ctx, cx + 130, base - 360, 30, 360, { fill: '#3a3e3c', stroke: INK, lineWidth: 4 });
			art.rect(ctx, cx - 170, base - 380, 340, 50, { fill: '#5a5f2a', stroke: INK, lineWidth: 4 });
			// warning stripes on the top beam
			ctx.save();
			ctx.beginPath();
			ctx.rect(cx - 166, base - 376, 332, 42);
			ctx.clip();
			for (let x = -180; x < 180; x += 40) art.poly(ctx, [[cx + x, base - 334], [cx + x + 20, base - 334], [cx + x + 44, base - 376], [cx + x + 24, base - 376]], { fill: '#e9ff4a' });
			ctx.restore();
			const k = s.state === 'work' ? s.prog : s.state === 'done' ? 1 : 0;
			const plate = lerp(base - 320, base - 190, k) + (s.hit > 0 ? 18 * s.hit : 0);
			art.rect(ctx, cx - 18, base - 330, 36, plate - (base - 330), { fill: '#a8b0ae', stroke: INK, lineWidth: 3 });
			art.rect(ctx, cx - 120, plate, 240, 30, { fill: '#6a706e', stroke: INK, lineWidth: 4 });
			art.rect(ctx, cx - 130, base - 90, 260, 90, { fill: '#2a2e2c', stroke: INK, lineWidth: 4 });
		},
		inject(ctx, s, cx, base) {
			art.roundRect(ctx, cx - 110, base - 300, 220, 300, 30, { fill: 'rgba(120,60,160,0.25)', stroke: '#8a6aa0', lineWidth: 5 });
			art.roundRect(ctx, cx - 100, base - 140, 200, 130, [0, 0, 24, 24], { fill: 'rgba(208,77,255,0.45)' });
			for (let n = 0; n < 5; n++) {
				const ph = (t * 0.7 + n * 0.23) % 1;
				art.circle(ctx, cx - 70 + n * 35, base - 20 - ph * 110, 5, { fill: '#f0b0ff', alpha: 1 - ph });
			}
			// the syringe arm, down when it's working
			const down = s.state === 'work' ? 40 + Math.sin(t * 4) * 6 : 0;
			art.rect(ctx, cx - 8, base - 380, 16, 90 + down, { fill: '#c8d0ce', stroke: INK, lineWidth: 3 });
			art.roundRect(ctx, cx - 30, base - 420, 60, 60, 10, { fill: '#d04dff', stroke: INK, lineWidth: 4 });
			art.line(ctx, [[cx, base - 290 + down], [cx, base - 240 + down]], { stroke: '#eeeeee', lineWidth: 4 });
			// the dial: a needle that sweeps, a green band to hit
			if (s.state === 'work') {
				const y = base - 330;
				art.roundRect(ctx, cx - 150, y - 26, 300, 52, 26, { fill: INK });
				art.roundRect(ctx, cx - 140, y - 16, 280, 32, 16, { fill: '#3a1a2a' });
				art.rect(ctx, cx - 140 + 280 * (0.5 - INJECT.zone), y - 16, 280 * INJECT.zone * 2, 32, { fill: '#3cdc7a' });
				const nx = cx - 140 + 280 * needle(s);
				art.poly(ctx, [[nx, y + 22], [nx - 12, y - 26], [nx + 12, y - 26]], { fill: s.lock > 0 ? '#ff4a32' : 'white', stroke: INK, lineWidth: 3 });
			}
		},
		warp(ctx, s, cx, base) {
			art.roundRect(ctx, cx - 165, base - 250, 330, 240, 18, { fill: art.linear(ctx, 0, base - 250, 0, base, ['#d8d0b8', '#8a8470']), stroke: INK, lineWidth: 5 });
			// its window onto elsewhere
			const wx = cx - 140, wy = base - 228, ww = 210, wh = 190;
			ctx.save();
			ctx.beginPath();
			art.roundRectPath(ctx, wx, wy, ww, wh, 12);
			ctx.clip();
			ctx.fillStyle = '#05010f';
			ctx.fillRect(wx, wy, ww, wh);
			const speed = s.state === 'work' ? 5 : 0.6;
			for (let n = 0; n < 24; n++) {
				const a = t * speed * (0.3 + (n % 5) * 0.1) + n * 2.39;
				const r = 10 + (n * 37 % 100);
				art.circle(ctx, wx + ww / 2 + Math.cos(a) * r, wy + wh / 2 + Math.sin(a) * r * 0.8, 2 + (n % 3), { fill: n % 2 ? '#3af2ff' : '#ff2d8f' });
			}
			if (s.state === 'work') {
				const k = s.t / WARP_TIME;
				art.circle(ctx, wx + ww / 2, wy + wh / 2, 70 * (1 - k) + 6, { fill: INGS[s.item.ing].colour, alpha: 1 - k });
			}
			ctx.restore();
			art.roundRect(ctx, wx, wy, ww, wh, 12, { stroke: INK, lineWidth: 5 });
			art.circle(ctx, cx + 118, base - 180, 22, { fill: '#5a5440', stroke: INK, lineWidth: 4 });
			art.line(ctx, [[cx + 118, base - 180], [cx + 118 + Math.cos(t * (s.state === 'work' ? 9 : 0.4)) * 18, base - 180 + Math.sin(t * (s.state === 'work' ? 9 : 0.4)) * 18]], { stroke: '#3af2ff', lineWidth: 5 });
			art.text(ctx, 'DIMENSION', cx + 118, base - 140, { size: 13, weight: 700, font: FONT, fill: INK });
			art.text(ctx, s.state === 'work' ? '???' : 'C-137½', cx + 118, base - 112, { size: 18, font: 'Share Tech Mono', fill: '#2a2a20' });
		},
		cryo(ctx, s, cx, base) {
			art.ellipse(ctx, cx, base - 20, 140, 24, { fill: '#2a3a44', stroke: '#8fdcff', lineWidth: 4 });
			art.ellipse(ctx, cx, base - 26, 110, 16, { fill: 'rgba(143,220,255,0.35)' });
			// the blaster, over the pad
			art.with(ctx, { x: cx + 120, y: base - 330, rotate: 30 }, function () {
				art.roundRect(ctx, -40, -40, 140, 80, 20, { fill: '#5a7a8a', stroke: INK, lineWidth: 4 });
				art.rect(ctx, -90, -22, 60, 44, { fill: '#8fa8b4', stroke: INK, lineWidth: 4 });
				art.circle(ctx, 40, 0, 14, { fill: '#8fdcff' });
			});
			if (s.state === 'work') {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				for (let n = 0; n < 14; n++) {
					const ph = (t * 2 + n / 14) % 1;
					const x = lerp(cx + 50, cx - 10 + Math.sin(n * 3) * 60, ph);
					const y = lerp(base - 300, base - 120, ph);
					art.circle(ctx, x, y, 6 + ph * 14, { fill: 'rgba(170,230,255,0.5)', alpha: 1 - ph * 0.6 });
				}
				ctx.restore();
			}
		},
	};

	/* ---------- drawing: the front wall ---------- */

	function drawHatch(ctx) {
		const x = W + HATCH / 2;
		const sx = hatch.shake ? (Math.random() - 0.5) * 20 * hatch.shake : 0;
		for (let k = 0; k < pods.length; k++) {
			const pod = pods[k];
			const y = POD_Y[k];
			art.circle(ctx, x + sx, y, POD_R + 12, { fill: '#2a3230', stroke: '#9dff3a', lineWidth: 4, alpha: hatch.jam > 0 ? 0.5 : 1 });
			art.circle(ctx, x + sx, y, POD_R, { fill: art.radial(ctx, x, y, 4, POD_R, ['#1a3a1a', '#050a05']) });
			if (pod.ing) drawItem(ctx, { ing: pod.ing, steps: [], burnt: false }, x + sx, y + Math.sin(t * 2 + k) * 4, 0.75);
			if (pod.beam > 0) {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				art.rect(ctx, x - POD_R * pod.beam, y - POD_R - 60, POD_R * 2 * pod.beam, POD_R * 2 + 60, { fill: 'rgba(157,255,58,0.45)', alpha: pod.beam });
				ctx.restore();
			}
		}
		if (hatch.jam > 0) {
			art.text(ctx, 'JAMMED!', x, 240, { size: 40, weight: 800, font: FONT, fill: '#ffc21a', outline: INK, outlineWidth: 6 });
			art.text(ctx, 'BANG ON IT (' + hatch.jam + ')', x, 640, { size: 26, weight: 800, font: FONT, fill: '#ffffff', outline: INK, outlineWidth: 5 });
			for (let n = 0; n < 3; n++) art.line(ctx, [[x - 120, 300 + n * 130], [x + 120, 340 + n * 130]], { stroke: '#ffc21a', lineWidth: 10, alpha: 0.8 });
		} else {
			art.text(ctx, 'TAP TO GRAB', x, 640, { size: 24, weight: 800, font: FONT, fill: '#9dff3a', outline: INK, outlineWidth: 5 });
		}
	}

	function drawChute(ctx) {
		const x = W + (CHUTE + W) / 2, y = 420;
		for (let r = 120; r > 10; r -= 18) {
			art.circle(ctx, x, y, r, { fill: r % 36 ? '#1a0626' : '#2a0a40' });
		}
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(t * 1.5);
		for (let n = 0; n < 6; n++) {
			ctx.rotate(Math.PI / 3);
			art.line(ctx, [[0, 0], [40, 30], [110, 10]], { stroke: '#d04dff', lineWidth: 4, alpha: 0.7 });
		}
		ctx.restore();
		art.circle(ctx, x, y, 126, { stroke: '#d04dff', lineWidth: 6 });
		art.text(ctx, 'TAP TO BIN', x, 600, { size: 24, weight: 800, font: FONT, fill: '#d04dff', outline: INK, outlineWidth: 5 });
	}

	function drawWindows(ctx) {
		const n = windowsNow();
		const cw = colW(n);
		for (let k = 0; k < n; k++) {
			const x0 = W + HATCH + cw * k + 10;
			const ww = cw - 20;
			// the window: the wasteland outside, a mutant in it
			ctx.save();
			ctx.beginPath();
			ctx.rect(x0, WIN_TOP, ww, WIN_H);
			ctx.clip();
			ctx.fillStyle = art.linear(ctx, 0, WIN_TOP, 0, WIN_TOP + WIN_H, ['#3a1408', '#a0481a', '#e08a3a']);
			ctx.fillRect(x0, WIN_TOP, ww, WIN_H);
			art.circle(ctx, x0 + ww * 0.7, WIN_TOP + 110, 40, { fill: 'rgba(255,220,140,0.6)' });
			ctx.fillStyle = '#2a1008';
			const rnd = seeded(k * 31 + 7);
			for (let bx = x0; bx < x0 + ww; bx += 24 + rnd() * 30) {
				const bh = 40 + rnd() * 90;
				ctx.fillRect(bx, WIN_TOP + WIN_H - 70 - bh, 20 + rnd() * 20, bh + 70);
			}
			const c = customers[k];
			if (c) drawCustomer(ctx, c, c.x, WIN_TOP + WIN_H, Math.min(1, ww / 230));
			ctx.restore();
			art.rect(ctx, x0, WIN_TOP, ww, WIN_H, { stroke: '#3a4442', lineWidth: 10 });
			art.rect(ctx, x0 - 8, WIN_TOP + WIN_H - 6, ww + 16, 18, { fill: '#5d6563', stroke: INK, lineWidth: 3 });
			if (c) drawTicket(ctx, c, x0 + ww / 2, WIN_TOP + WIN_H + 20, ww);
			if (c && c.sayT > 0 && c.say) drawSpeech(ctx, c.say, x0 + ww / 2, WIN_TOP + 40, ww + 10, c.state === 'angry' ? '#ff4a32' : c.state === 'eat' ? '#9dff3a' : 'white');
		}
	}

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

	function drawPortal(ctx, p) {
		const pulse = 1 + Math.sin(p.t * 5) * 0.06;
		const grow = Math.min(1, p.t * 3);
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.scale(grow * pulse, grow * pulse);
		for (let r = 110; r > 20; r -= 15) art.circle(ctx, 0, 0, r, { fill: r % 30 ? 'rgba(58,242,255,0.18)' : 'rgba(255,45,143,0.2)' });
		ctx.rotate(p.t * 2);
		for (let n = 0; n < 8; n++) {
			ctx.rotate(Math.PI / 4);
			art.line(ctx, [[30, 0], [80, 30], [105, 0]], { stroke: n % 2 ? '#3af2ff' : '#ff2d8f', lineWidth: 5 });
		}
		ctx.restore();
		if (p.t < 1.2) art.circle(ctx, p.x, p.y, 120 + p.t * 400, { stroke: '#3af2ff', lineWidth: 10, alpha: 1 - p.t / 1.2 });
		drawItem(ctx, p.item, p.x, p.y + Math.sin(p.t * 3) * 8, 0.85);
		art.text(ctx, 'TAP!', p.x, p.y + 92, { size: 30, weight: 800, font: FONT, fill: '#3af2ff', outline: INK, outlineWidth: 5 });
	}

	/* ---------- drawing: food ---------- */

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

	/* ---------- drawing: the mutants ---------- */

	function drawCustomer(ctx, c, x, base, s) {
		const ty = c.type;
		const rise = c.state === 'leave' ? -Math.min(1, c.stateT / 0.7) * 300 : -(1 - Math.min(1, c.age / 0.5)) * 300;
		const panic = c.state === 'wait' && c.left / c.patience < 0.25;
		const jx = panic ? Math.sin(t * 40) * 4 : 0;
		const happy = c.state === 'eat';
		const angry = c.state === 'angry' || panic;
		ctx.save();
		ctx.translate(x + jx, base - rise);
		ctx.scale(s, s);
		if (c.state === 'eat') ctx.scale(1 + Math.sin(c.stateT * 12) * 0.04, 1 - Math.sin(c.stateT * 12) * 0.04);
		const skin = ty.skin;
		const mouth = (mx, my, w) => {
			if (happy) { ctx.beginPath(); ctx.arc(mx, my - 4, w, 0.1, Math.PI - 0.1); ctx.fillStyle = INK; ctx.fill(); }
			else if (angry) art.line(ctx, [[mx - w, my + 4], [mx - w / 2, my - 4], [mx, my + 4], [mx + w / 2, my - 4], [mx + w, my + 4]], { stroke: INK, lineWidth: 4 });
			else art.line(ctx, [[mx - w, my], [mx + w, my + 3]], { stroke: INK, lineWidth: 4 });
		};
		const eye = (ex, ey, r, look) => {
			art.circle(ctx, ex, ey, r, { fill: 'white', stroke: INK, lineWidth: 3 });
			art.circle(ctx, ex + (look || Math.sin(t + c.seed) * r * 0.3), ey, r * 0.45, { fill: INK });
			if (angry) art.line(ctx, [[ex - r, ey - r - 4], [ex + r, ey - r + 4]], { stroke: INK, lineWidth: 4 });
		};
		const body = (w, h, col) => art.roundRect(ctx, -w / 2, -h, w, h + 40, [w / 2, w / 2, 0, 0], { fill: col, stroke: INK, lineWidth: 4 });
		if (ty.id === 'blob') {
			body(200, 130, skin);
			for (const [hx, ph] of [[-50, 0], [50, 2]]) {
				const hy = -150 + Math.sin(t * 3 + ph) * 6;
				art.circle(ctx, hx, hy, 46, { fill: skin, stroke: INK, lineWidth: 4 });
				eye(hx - 14, hy - 8, 10);
				eye(hx + 14, hy - 8, 10);
				mouth(hx, hy + 18, 16);
			}
			art.circle(ctx, -20, -60, 10, { fill: '#a8ff7a' });
		} else if (ty.id === 'cyclops') {
			body(170, 120, '#3a2a5a');
			art.circle(ctx, 0, -170, 70, { fill: skin, stroke: INK, lineWidth: 4 });
			eye(0, -180, 34);
			art.circle(ctx, 0, -180, 40, { stroke: '#e9c04a', lineWidth: 5 });
			art.line(ctx, [[36, -170], [44, -110]], { stroke: '#e9c04a', lineWidth: 3 });
			mouth(0, -128, 22);
			art.rect(ctx, -44, -300, 88, 70, { fill: '#1a1a1a', stroke: INK, lineWidth: 4 });
			art.rect(ctx, -66, -236, 132, 14, { fill: '#1a1a1a', stroke: INK, lineWidth: 4 });
		} else if (ty.id === 'mold') {
			for (let n = 0; n < 9; n++) art.circle(ctx, Math.cos(n * 0.7) * 70, -130 + Math.sin(n * 1.3) * 60, 50, { fill: n % 2 ? skin : mix(skin, '#6a7a3a', 0.4) });
			for (const [ex, ey, r] of [[-50, -150, 10], [-10, -170, 14], [30, -140, 9], [60, -175, 8], [10, -110, 7], [-60, -100, 6]]) eye(ex, ey, r);
			mouth(0, -80, 26);
		} else if (ty.id === 'pigeon') {
			body(160, 110, '#2a2e3a');
			art.poly(ctx, [[-16, -110], [16, -110], [6, -40], [-6, -40]], { fill: '#c02a2a', stroke: INK, lineWidth: 3 });
			art.ellipse(ctx, 0, -175, 60, 66, { fill: skin, stroke: INK, lineWidth: 4 });
			art.ellipse(ctx, 0, -140, 46, 24, { fill: '#6abfa0', alpha: 0.8 });
			eye(-26, -192, 14);
			eye(26, -192, 14);
			art.poly(ctx, [[-14, -168], [14, -168], [0, -138]], { fill: '#e8a83c', stroke: INK, lineWidth: 3 });
			art.line(ctx, [[0, -240], [-10, -270], [10, -282]], { stroke: INK, lineWidth: 4 });
		} else if (ty.id === 'skull') {
			body(180, 100, '#5a6466');
			for (const sx of [-60, 60]) art.circle(ctx, sx, -60, 12, { fill: '#ff4a32' });
			art.roundRect(ctx, -70, -250, 140, 150, 40, { fill: 'rgba(160,230,255,0.25)', stroke: '#8fdcff', lineWidth: 5 });
			art.circle(ctx, 0, -180, 46, { fill: skin, stroke: INK, lineWidth: 4 });
			art.circle(ctx, -17, -188, 13, { fill: INK });
			art.circle(ctx, 17, -188, 13, { fill: INK });
			art.circle(ctx, -17, -188, 4, { fill: angry ? '#ff4a32' : '#9dff3a' });
			art.circle(ctx, 17, -188, 4, { fill: angry ? '#ff4a32' : '#9dff3a' });
			for (let n = -2; n <= 2; n++) art.rect(ctx, n * 9 - 4, -158, 7, 12, { fill: 'white', stroke: INK, lineWidth: 2 });
		} else if (ty.id === 'squid') {
			for (let n = -3; n <= 3; n++) art.line(ctx, [[n * 22, -60], [n * 30 + Math.sin(t * 3 + n) * 12, 0], [n * 34, 30]], { stroke: skin, lineWidth: 22 });
			art.ellipse(ctx, 0, -150, 76, 100, { fill: skin, stroke: INK, lineWidth: 4 });
			eye(-26, -150, 14);
			eye(26, -150, 14);
			mouth(0, -110, 16);
			for (const [rx, ry] of [[-40, -235], [0, -250], [40, -235]]) art.roundRect(ctx, rx - 14, ry - 10, 28, 20, 8, { fill: '#7ad8ff', stroke: INK, lineWidth: 3 });
		} else if (ty.id === 'fungus') {
			body(110, 120, '#e8e0c8');
			ctx.beginPath();
			ctx.ellipse(0, -130, 110, 80, 0, Math.PI, 0);
			ctx.closePath();
			ctx.fillStyle = skin;
			ctx.fill();
			ctx.strokeStyle = INK;
			ctx.lineWidth = 4;
			ctx.stroke();
			for (const [sx, sy] of [[-50, -165], [20, -185], [65, -150]]) art.circle(ctx, sx, sy, 13, { fill: 'white' });
			art.roundRect(ctx, -50, -110, 100, 26, 10, { fill: INK });
			art.line(ctx, [[-6, -98], [6, -98]], { stroke: '#555', lineWidth: 3 });
			mouth(0, -62, 18);
		} else {   // the Overlord: a huge brain in a war-crown
			body(230, 150, '#2a2a1a');
			art.ellipse(ctx, 0, -200, 105, 85, { fill: '#e88aa8', stroke: INK, lineWidth: 5 });
			for (let n = -3; n <= 3; n++) art.line(ctx, [[n * 26, -275], [n * 22 + 10, -200], [n * 26, -130]], { stroke: '#b05a78', lineWidth: 4 });
			art.poly(ctx, [[-90, -280], [-60, -330], [-30, -290], [0, -345], [30, -290], [60, -330], [90, -280]], { fill: '#e9c04a', stroke: INK, lineWidth: 4 });
			eye(-36, -160, 18);
			eye(36, -160, 18);
			mouth(0, -110, 30);
		}
		ctx.restore();
	}

	/* ---------- the manager (the intro) ---------- */

	function drawManager(ctx, bt) {
		const x = W + W / 2;
		const k = clamp(bt / 0.8, 0, 1);
		const y = lerp(-200, 720, 1 - Math.pow(1 - k, 3)) + Math.sin(bt * 3) * 10;
		art.line(ctx, [[x, 0], [x, y - 120]], { stroke: '#2a2e2c', lineWidth: 18 });
		art.roundRect(ctx, x - 150, y - 120, 300, 220, 24, { fill: '#5a5f5c', stroke: INK, lineWidth: 6 });
		art.roundRect(ctx, x - 125, y - 98, 250, 170, 16, { fill: '#082a10' });
		const blink = Math.sin(bt * 2.3) > 0.95;
		for (const ex of [-55, 55]) art.rect(ctx, x + ex - 18, y - 60, 36, blink ? 6 : 36, { fill: '#9dff3a' });
		art.line(ctx, [[x - 70, y + 10], [x - 40, y + 30], [x - 10, y + 10], [x + 20, y + 30], [x + 50, y + 10], [x + 70, y + 20]], { stroke: '#9dff3a', lineWidth: 8 });
		art.text(ctx, 'MANAGER-UNIT 9', x, y + 130, { size: 30, weight: 800, font: FONT, fill: '#9dff3a', outline: INK, outlineWidth: 6 });
	}

	/* ---------- drawing: the cyborg cooks ---------- */

	function drawChefInWorld(ctx, i) {
		const c = chefs[i];
		if (!latest[i]) return;
		const k = clamp(c.dist / 0.6, 0, 1);
		const h = lerp(400, 250, k);
		const x = c.x;
		const y = H + 18;
		// a pool of their colour at their feet
		art.ellipse(ctx, x, H - 8, h * 0.32, 26, { fill: hexA(colourOf(i), 0.45) });
		drawChef(ctx, i, x, y, h, { work: c.work, held: c.held, bob: c.bob, alpha: lerp(1, 0.75, k) });
	}

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

	self.fini = function () {
		stage.$el.off('.grub-o-tron');
		show.fini();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
