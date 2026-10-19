/*
 * UX Demo (id show-debug): a blank game that runs the whole shared show
 * (shared/showtime.js) with nothing in the way, for stepping through the
 * choreography quickly.
 *
 * Every beat a real game has is here, in order: the squad picker, title
 * drop, clock intro, visor check, a tutorial (grab a cylinder, tap a wall to
 * switch to it), the villain's entrance (THE GOBBLER: it eats cylinders, and
 * shrinks a worm it touches), the play (a little game: see below), TIME!, scores,
 * rank, team, leaderboard, replay, rating and the end.
 *
 * Its debug buttons are on the show's pause screen (the TAP panel on the
 * left wall; off the box, the pause screen's left wall): jump to any beat,
 * set the clock, shuffle the scores, fake the visor check passing, restart.
 * The current beat and its time show at the top.
 *
 * Behind it all, a sunny 3D valley (games/ux-demo-valley.js). The play: each
 * player is a worm (the visor check's worms, show.worms) out on the valley
 * floor, right where they are in the room, as tall as its pickups make it, leaning and
 * wobbling as they move; little white cylinders fall from the sky, and a worm
 * that gets to one picks it up: a point, and it grows taller. An ES module (manifest: module: true).
 */
import { createValley } from './ux-demo-valley.js';

IGB.register('show-debug', function ShowDebugGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const FONT = 'Lexend';   // (the show's standard: Lexend Medium)

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	// the room, out on the valley floor, from the back of the room to the
	// front wall: how far up the valley (metres ahead of the eye). Across, a
	// worm is always exactly where its player is across the front wall (1:1).
	const FIELD = { near: 4.5, far: 12 };
	const WORM = { thick: 0.3 };   // a worm's thickness (radius, metres; its height: GROW)
	const CUBE = { r: 0.22, tall: 0.55, every: 0.55, drop: 26, fall: 14, life: 9, reach: 1.9 };   // a pickup: a little white cylinder, its radius and height (metres); a new one every so often (seconds); how high it falls from and how fast (metres, a second); seconds it lies on the plane; how near a worm must be to grab one (metres)
	const CUBE_COLOUR = '#ffffff';
	const ROUND = { first: 10, more: 4, gap: 0.06, intro: 1.6, clear: 2.4 };   // rounds: cylinders in the first, and how many more each round after; seconds between them raining down; ROUND N, and ROUND N CLEAR!, this long
	const GROW = { start: 0.8, each: 0.12, most: 3.2, rate: 8 };   // a worm's height (metres) is down to its pickups alone: this tall with none, this much taller for each, never taller than this; how quickly it grows into it
	const GOB = { r: 0.6, tall: 3.4, colour: '#1c0b2e', glow: '#ff4fa8', speed: 0.14, reach: 1.5, bite: 3, cool: 1.5, hop: [7, 12], drop: 30, fly: 32 };   // its radius and height (metres); its body and eyes; how fast it wanders (shares of the field a second); how near it must be to eat or bite (metres); pickups a bite takes; seconds before it can bite the same worm again; seconds between hops to another wall; how high it drops in from (off the top of the wall); how fast it flies up and away, or down (metres a second)
	const GOB_IN = { land: 1.0, name: 1.4, line: 2.3, warn: 3.1, length: 6.2 };   // its entrance: when it lands, its name, what it does, the warning, and the end

	/* ---------- the backdrop: a sunny valley ---------- */

	const valley = createValley(stage);

	/* ---------- state ---------- */

	let players = 0;
	let scores = [];
	let latest = [];
	let t = 0;

	const show = new Showtime(stage, {
		id: 'show-debug',
		seconds: GAME_SECONDS,
		players: () => players,
		scores: () => scores,
		theme: { accent: '#3ad1ff', accent2: '#5a4dff', gold: '#ffd23f', ink: '#0b1022', sky: ['#070b18', '#16203f'] },
		rivals: ['Stage Left', 'The Understudies', 'Cue Lights', 'Run Of Show', 'Places Please', 'Tech Week',
			'Final Dress', 'House Open', 'Blackout Crew', 'The Blocking'],
		music: false,   // quiet while stepping through
		menu: { jumps: false },   // (its own beat jumps, on the debug screen: see below)
	});

	function initGame(count) {
		players = count;
		scores = Array.from({ length: count }, () => 0);
		wallOf.length = 0;
		show.go('title');
	}

	/* ---------- the tutorial ---------- */

	const TUTORIAL_NICE = 1.2;   // seconds a done step shows (its caption green) before the next
	const TUTORIAL = [
		{ caption: 'GRAB THE WHITE CYLINDERS', min: 2, max: 10, did: () => everyone((i) => (scores[i] || 0) >= 1) },
		{ caption: 'TAP ANY WALL TO SWITCH WALLS', min: 2, max: 12, did: () => everyone((i) => switched[i]) },
	];
	const tut = { i: 0, age: 0, done: false, doneAge: 0 };
	const switched = [];   // who has switched walls in the tutorial
	const everyone = (fn) => players > 0 && Array.from({ length: players }, (_, i) => i).filter((i) => latest[i] && latest[i].px !== undefined).every(fn);
	function tutStep(i) {
		Object.assign(tut, { i, age: 0, done: false, doneAge: 0 });
		if (i === 0) switched.length = 0;
		if (TUTORIAL[i]) show.fx('stepIn');
	}

	/* ---------- the beats ---------- */

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop({
			// (its lines: the manifest's title, shared with the end screen's carousel)
		}),
		show.beats.clockIntro(),
		show.beats.visors(),
		// the tutorial: out on the plane, each step's caption over every wall
		// until everyone has done it (or its time's up): grab a cylinder, then
		// tap a wall to switch to it
		{
			id: 'controls',
			length: TUTORIAL.reduce((a, s) => a + s.max + TUTORIAL_NICE, 0),   // (a safety net: each step has its own limit)
			done: () => tut.i >= TUTORIAL.length,
			enter() { tutStep(0); },
			exit() { clearCubes(); scores = scores.map(() => 0); grown.length = 0; wallOf.length = 0; worms.length = 0; },
			update(dt) {
				t += dt;
				stepWorms(dt);
				stepCubes(dt);
				const step = TUTORIAL[tut.i];
				if (!step) return;
				tut.age += dt;
				if (!tut.done && tut.age >= step.min && step.did()) { tut.done = true; show.fx('pick', 0.8); }
				if (tut.done) tut.doneAge += dt;
				if ((tut.done && tut.doneAge >= TUTORIAL_NICE) || tut.age >= step.max) tutStep(tut.i + 1);
			},
			draw(ctx) {
				const step = TUTORIAL[tut.i];
				if (!step) return;
				show.onWalls(ctx, function (c) {
					show.slam(c, step.caption, W / 2, 200, 70, tut.age, { fill: tut.done ? '#3cdc7a' : 'white' });
				});
			},
		},
		// the villain: THE GOBBLER drops out of the sky onto the front wall's
		// plane, its name and what it does slammed in over every wall
		{
			id: 'villain',
			length: GOB_IN.length,
			enter() { gobArrive(); show.fx('villainReveal'); },
			update(dt, bt) {
				show.blackout = 0.45 * Math.min(1, bt * 2);
				t += dt;
				stepWorms(dt);
				gob.y = Math.max(0, GOB.drop * (1 - bt / GOB_IN.land) ** 2 * (bt < GOB_IN.land ? 1 : 0));
				if (show.cue(GOB_IN.land)) { show.fx('stomp'); show.shake = 0.6; }
				if (show.cue(GOB_IN.name)) show.fx('beat');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					if (bt > GOB_IN.name) show.slam(c, 'THE GOBBLER', W / 2, 200, 120, bt - GOB_IN.name, { fill: GOB.glow, glow: GOB.glow });
					if (bt > GOB_IN.line) show.text(c, 'IT EATS YOUR CYLINDERS', W / 2, 320, 56, { fill: 'white', alpha: Math.min(1, (bt - GOB_IN.line) * 3) });
					if (bt > GOB_IN.warn) show.text(c, 'TOUCH IT AND YOU SHRINK!', W / 2, 400, 56, { fill: '#ffd23f', alpha: Math.min(1, (bt - GOB_IN.warn) * 3) });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() { show.label('PLAY'); startRound(0); },
			exit() { clearCubes(); },
			update(dt) {
				t += dt;
				stepWorms(dt);
				stepRound(dt);
				stepCubes(dt, true);
				stepGob(dt);
				show.record(t, Array.from({ length: players }, (_, i) => latest[i] || null));
			},
			draw(ctx) {
				// ROUND N as each starts; ROUND N CLEAR! once its cylinders are all eaten
				const age = t - round.at;
				show.onWalls(ctx, function (c) {
					if (round.phase === 'intro') show.slam(c, 'ROUND ' + (round.n + 1), W / 2, 300, 150, age, { fill: '#ffd23f', glow: '#ff7a3d' });
					if (round.phase === 'clear') show.slam(c, 'ROUND ' + (round.n + 1) + ' CLEAR!', W / 2, 300, 120, age, { fill: '#3cdc7a', glow: '#1fb85c' });
					if (round.phase === 'go' || round.phase === 'drop') show.text(c, cubes.length + ' LEFT', W / 2, 150, 46, { fill: 'white', alpha: 0.85 });
				});
			},
		},
		show.beats.timeUp(),
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

	/* ---------- the world: the valley (behind), and where everyone is ---------- */

	function drawWorld(ctx) {
		// (the valley is behind, in its own canvas)
		if (show.beat !== 'play' && show.beat !== 'controls' && show.beat !== 'villain') return;   // (no worms over the opening screens; out there for the tutorial, the villain's entrance and the play)
		// each player, a worm out on the valley floor, and the pickups: far ones first
		const shown = [];
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			const w = toField(p, i);
			const at = valley.project(w.x, valley.ground(w.x, w.z), w.z);
			if (at) shown.push({ i, p, at, far: Math.hypot(w.x, w.z) });
		}
		for (const k of cubes) {
			const g = valley.ground(k.x, k.z);
			const at = valley.project(k.x, g + k.y, k.z), floor = valley.project(k.x, g, k.z);
			if (at && floor) shown.push({ k, at, floor, far: Math.hypot(k.x, k.z) });
		}
		if (show.beat === 'villain' || show.beat === 'play') {
			const g = gobAt();
			const gy = valley.ground(g.x, g.z);
			const at = valley.project(g.x, gy + gob.y, g.z), floor = valley.project(g.x, gy, g.z);
			if (at && floor) shown.push({ gobbler: true, at, floor, far: Math.hypot(g.x, g.z) });
		}
		shown.sort((a, b) => b.far - a.far);
		for (const { i, at, k, floor, gobbler } of shown) {
			if (gobbler) { drawGob(ctx, at, floor); continue; }
			if (k) {
				// a pickup: its shadow on the plane (smaller the higher it is), it over it
				const r = CUBE.r * floor.ppm * k.scale;
				const near = Math.max(0.25, 1 - k.y / 12);
				ctx.fillStyle = `rgba(0,0,0,${0.3 * near})`;
				ctx.beginPath();
				ctx.ellipse(floor.x, floor.y, r * 1.5 * near, r * 0.5 * near, 0, 0, Math.PI * 2);
				ctx.fill();
				show.worms.cylinder(ctx, at.x, at.y, CUBE.tall * at.ppm * k.scale, CUBE.r * at.ppm * k.scale / 17, CUBE_COLOUR, t + k.seed, null, false);
				continue;
			}
			const tall = (grown[i] || GROW.start) * at.ppm;
			// (a wobbly cylinder, its flat foot right on the plane; only its pickups make it taller, not how tall its player stands)
			show.worms.cylinder(ctx, at.x, at.y, tall, WORM.thick * at.ppm / 17, PLAYER_COLORS[i], t + i * 1.7, worms[i]);
		}
	}

	/* ---------- the play: worms, and cubes falling from the sky ---------- */

	// where a player is, out on the valley floor (room 0..1 across and toward
	// the front wall): as far ahead as they are up the room, and across, so
	// they show exactly where they stand across the front wall (its view is
	// 90° across, so at a depth d it spans 2d)
	// Each wall looks out its own way from the eye (the box's three sides):
	// forward, and across its view to the right.
	const VIEW_DIR = [
		{ f: [-1, 0], r: [0, -1] },   // the left wall: looking left
		{ f: [0, -1], r: [1, 0] },    // the front wall: up the valley
		{ f: [1, 0], r: [0, 1] },     // the right wall: looking right
	];
	// A spot out in a wall's view: u across it (0..1, exactly where on that
	// wall it shows), d01 how far out (0 near, 1 far).
	const fieldOn = (wall, u, d01) => {
		const d = FIELD.near + Math.max(0, Math.min(1, d01)) * (FIELD.far - FIELD.near);
		const want = Math.max(0.02, Math.min(0.98, u)) * W + wall * W;   // (a hair in from its edges, so they never slip off it)
		const { f, r } = VIEW_DIR[wall];
		const at = (s) => ({ x: f[0] * d + r[0] * s, z: f[1] * d + r[1] * s });
		// (worked out through the wall's camera itself: across, the view is
		// linear at a given distance, so two points give the line)
		const p0 = at(0), p1 = at(1);
		const a = valley.project(p0.x, valley.ground(p0.x, p0.z), p0.z), b = valley.project(p1.x, valley.ground(p1.x, p1.z), p1.z);
		if (!a || !b || a.wall !== wall || b.wall !== wall || b.x === a.x) return at((u - 0.5) * 2 * d);
		return at((want - a.x) / (b.x - a.x));
	};
	const fieldAt = (px, pz) => fieldOn(1, px, pz);
	// Where a player is, on the wall they're on: across it and how far out,
	// from where they stand in the room (left wall: across is pz, out is how
	// far from it; right: the same, mirrored).
	const wallOf = [];   // each player's wall (0 left, 1 front, 2 right): tapping a wall moves the nearest player there
	const onWall = (p, wall) => {
		const px = p.px, pz = p.pz === undefined ? 0.5 : p.pz;
		if (wall === 0) return { u: pz, d: 1 - px };
		if (wall === 2) return { u: 1 - pz, d: px };
		return { u: px, d: pz };
	};
	const toField = (p, i) => { const w = wallOf[i] === undefined ? 1 : wallOf[i]; const o = onWall(p, w); return fieldOn(w, o.u, o.d); };
	const worms = [];
	function stepWorms(dt) {
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			const u = onWall(p, wallOf[i] === undefined ? 1 : wallOf[i]).u;
			worms[i] = worms[i] || show.worms.state(u);
			show.worms.step(worms[i], u, dt);
		}
	}

	// The pickups: little white cylinders, the avatars' look, falling from
	// the sky and settling on the plane (drawn on the show's canvas with the
	// worms, not in the valley's 3D scene).
	const cubes = [];   // { x, z, y (metres above the plane), landed, scale, seed }
	let nextCube = 0;
	function dropCube() {
		const spot = fieldOn(Math.floor(Math.random() * 3), 0.04 + Math.random() * 0.92, Math.random());   // (somewhere a player could stand, out from any of the walls)
		cubes.push({ x: spot.x, z: spot.z, y: CUBE.drop, landed: -1, scale: 1, seed: Math.random() * 10 });
	}
	function removeCube(k) {
		cubes.splice(cubes.indexOf(k), 1);
	}
	function clearCubes() {
		cubes.length = 0;
	}
	// Rounds: each one, ROUND N, then its whole set of cylinders rains down
	// quickly, all over the walls; it's over when they've all been eaten
	// (by the worms, or the Gobbler), ROUND N CLEAR!, and the next, bigger,
	// begins. On until the clock runs out.
	const round = { n: 0, phase: 'intro', at: 0, toDrop: 0 };
	function startRound(n) {
		Object.assign(round, { n, phase: 'intro', at: t, toDrop: ROUND.first + n * ROUND.more });
		show.fx('roundStart');
	}
	function stepRound(dt) {
		const age = t - round.at;
		if (round.phase === 'intro' && age >= ROUND.intro) Object.assign(round, { phase: 'drop', at: t });
		if (round.phase === 'drop') {
			nextCube -= dt;
			while (nextCube <= 0 && round.toDrop > 0) { dropCube(); round.toDrop--; nextCube += ROUND.gap; }
			if (round.toDrop <= 0) Object.assign(round, { phase: 'go', at: t });
		}
		if (round.phase === 'go' && !cubes.length) { Object.assign(round, { phase: 'clear', at: t }); show.fx('roundClear'); }
		if (round.phase === 'clear' && age >= ROUND.clear) startRound(round.n + 1);
	}

	// rounds: true, the cylinders come by the round (and stay till eaten);
	// otherwise (the tutorial) one every so often, each lying a while
	function stepCubes(dt, rounds) {
		if (!rounds) {
			nextCube -= dt;
			if (nextCube <= 0 && cubes.length < 40) { dropCube(); nextCube = CUBE.every * (0.6 + Math.random() * 0.8); }
		}
		for (const k of cubes.slice()) {
			if (k.landed < 0) {
				// falling
				k.y = Math.max(0, k.y - CUBE.fall * dt);
				if (k.y <= 0) k.landed = t;
			} else if (!rounds) {
				// on the plane, then shrinking away
				const left = k.landed + CUBE.life - t;
				if (left < 0.6) k.scale = Math.max(0.01, left / 0.6);
				if (left <= 0) { removeCube(k); continue; }
			}
			// a worm close enough (and the pickup low enough) grabs it, and grows
			if (k.y > 2.5) continue;
			for (let i = 0; i < players; i++) {
				const p = latest[i];
				if (!p || p.px === undefined) continue;
				const w = toField(p, i);
				if (Math.hypot(w.x - k.x, w.z - k.z) > CUBE.reach) continue;
				scores[i] = (scores[i] || 0) + 1;
				show.fx('pick', 0.7);
				removeCube(k);
				break;
			}
		}
		// each worm's height growing (springily quick) toward what its pickups have earned it
		for (let i = 0; i < players; i++) {
			const want = Math.min(GROW.most, GROW.start + GROW.each * (scores[i] || 0));
			grown[i] = (grown[i] || GROW.start) + (want - (grown[i] || GROW.start)) * Math.min(1, dt * GROW.rate);
		}
	}
	const grown = [];   // each worm's height (metres), as its pickups have earned it

	/* ---------- the villain: THE GOBBLER ---------- */

	// A big dark cylinder with glowing eyes, wandering the plane out from one
	// wall, now and then crossing to another. It eats any cylinder it
	// reaches, and a worm it touches loses some of its pickups (and shrinks).
	const gob = { wall: 1, u: 0.5, d: 0.6, to: { u: 0.5, d: 0.6 }, y: 0, hop: GOB.hop[0], leaving: false };
	const bitten = [];   // each worm: when it can next be bitten
	function gobArrive() {
		Object.assign(gob, { wall: 1, u: 0.5, d: 0.6, to: { u: 0.5, d: 0.6 }, y: GOB.drop, hop: GOB.hop[0], leaving: false });
		bitten.length = 0;
	}
	const gobAt = () => fieldOn(gob.wall, gob.u, gob.d);
	function stepGob(dt) {
		// wandering toward a spot, a new one once it's there
		const du = gob.to.u - gob.u, dd = gob.to.d - gob.d, dist = Math.hypot(du, dd);
		if (dist < 0.02) gob.to = { u: 0.1 + Math.random() * 0.8, d: Math.random() };
		else { const k = Math.min(1, GOB.speed * dt / dist); gob.u += du * k; gob.d += dd * k; }
		// now and then, over to another wall
		// now and then, up and away off the top of the wall, and down onto another
		if (gob.leaving) {
			gob.y += GOB.fly * dt;
			if (gob.y < GOB.drop) return;
			gob.leaving = false;
			gob.wall = (gob.wall + 1 + Math.floor(Math.random() * 2)) % 3;
			gob.u = 0.2 + Math.random() * 0.6;
			gob.d = 0.3 + Math.random() * 0.6;
			gob.to = { u: gob.u, d: gob.d };
			gob.hop = GOB.hop[0] + Math.random() * (GOB.hop[1] - GOB.hop[0]);
		}
		gob.hop -= dt;
		if (gob.hop <= 0 && gob.y === 0) {
			gob.leaving = true;
			show.fx('bossDash', 0.6);
			return;
		}
		if (gob.y > 0) { gob.y = Math.max(0, gob.y - GOB.fly * dt); if (gob.y === 0) { show.fx('stomp', 0.7); show.shake = 0.3; } return; }
		const g = gobAt();
		// it eats the cylinders it reaches
		for (const k of cubes.slice()) {
			if (k.y < 2.5 && Math.hypot(k.x - g.x, k.z - g.z) < GOB.reach) { removeCube(k); show.fx('thud', 0.4); }
		}
		// and bites the worms it touches
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined || (bitten[i] || 0) > t) continue;
			const w = toField(p, i);
			if (Math.hypot(w.x - g.x, w.z - g.z) > GOB.reach) continue;
			bitten[i] = t + GOB.cool;
			if (scores[i] > 0) { scores[i] = Math.max(0, scores[i] - GOB.bite); show.fx('rateLow', 0.8); show.shake = 0.25; }
		}
	}
	function drawGob(ctx, at, floor) {
		// its shadow on the plane (smaller while it's up in the air), the body, its eyes
		const r = GOB.r * floor.ppm;
		const near = Math.max(0.3, 1 - gob.y / 15);
		ctx.fillStyle = `rgba(0,0,0,${0.4 * near})`;
		ctx.beginPath();
		ctx.ellipse(floor.x, floor.y, r * 1.6 * near, r * 0.55 * near, 0, 0, Math.PI * 2);
		ctx.fill();
		const tall = GOB.tall * at.ppm;
		show.worms.cylinder(ctx, at.x, at.y, tall, GOB.r * at.ppm / 17, GOB.colour, t * 0.7, null, false);
		// its eyes, low on its body and angry: glowing, each with a heavy lid
		// slanting down toward the middle, and a brow over it
		const blink = Math.sin(t * 1.3) > 0.97 ? 0.15 : 1;
		const ey = at.y - tall * 0.55, er = GOB.r * at.ppm * 0.24, gap = GOB.r * at.ppm * 0.4;
		for (const side of [-1, 1]) {
			const ex = at.x + side * gap;
			ctx.save();
			ctx.shadowColor = GOB.glow;
			ctx.shadowBlur = er * 3;
			ctx.fillStyle = GOB.glow;
			ctx.beginPath();
			ctx.ellipse(ex, ey, er, er * 1.15 * blink, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
			// the lid: the body's colour over the eye's top, sloping down to the middle
			ctx.save();
			ctx.translate(ex, ey);
			ctx.rotate(-side * 0.5);
			ctx.fillStyle = GOB.colour;
			ctx.fillRect(-er * 2, -er * 2.6, er * 4, er * 2.2);
			// and the brow along its edge
			ctx.fillStyle = '#000';
			ctx.fillRect(-er * 1.5, -er * 0.62, er * 3, er * 0.3);
			ctx.restore();
		}
	}

	/* ---------- the debug buttons (on the show's pause screen) ---------- */

	const JUMPS = ['sting', 'title', 'clock', 'visors', 'controls', 'villain', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
	const { drow, dbutton } = show.menu;
	const $now = show.menu.$now;
	const $jumps = drow('BEATS');
	for (const id of JUMPS) dbutton(id.toUpperCase(), () => jump(id)).attr('jump', id).appendTo($jumps);
	const $acts = drow('TOOLS');
	dbutton('SHUFFLE SCORES', shuffle, '#225a3a').attr('act', 'scores').appendTo($acts);
	dbutton('VISORS OK', () => { if (show.beat === 'visors') show.next(); }, '#225a3a').attr('act', 'visors').appendTo($acts);
	dbutton('NEXT ▶', () => show.next()).attr('act', 'next').appendTo($acts);
	dbutton('RESTART', () => $('[btn=refresh]').trigger('click'), '#5a2232').attr('act', 'restart').appendTo($acts);

	function shuffle() {
		scores = scores.map(() => Math.floor(Math.random() * 60));
	}

	// Jump anywhere. Past the squad, a squad is needed (three, unless one's
	// been picked); the results want scores to show.
	function jump(id) {
		$('showtime-picker').remove();
		if (id === 'squad') {
			players = 0;
			scores = [];
			show.go('squad');
			show.pickPlayers(initGame);
			return;
		}
		if (!players) initGame(3);
		if (JUMPS.indexOf(id) > JUMPS.indexOf('play') && scores.every((s) => s === 0)) shuffle();
		show.go(id);
	}

	/* ---------- the frame ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		valley.render(show.paused ? 0 : dt);
		show.frame(ctx, dt, drawWorld);
		$now.text(`${show.beat}  ${show.bt.toFixed(1)}s  ${show.mmss(show.timeLeft())}`);
		$jumps.children('button').each(function () {
			$(this).css({ background: $(this).attr('jump') === show.beat ? '#3ad1ff' : '#22305a', color: $(this).attr('jump') === show.beat ? '#0b1022' : 'white' });
		});
	};

	// Tapping a wall moves a player there: the one standing nearest the
	// spot tapped (the tap's place on that wall, in the room).
	stage.$el.on('click', function (e) {
		if ((show.beat !== 'play' && show.beat !== 'controls') || show.paused) return;
		const at = IGB.toWorld(e);
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		const u = at.x / W - wall;
		const spot = wall === 0 ? { px: 0, pz: u } : wall === 2 ? { px: 1, pz: 1 - u } : { px: u, pz: 1 };
		let best = -1, bestD = Infinity;
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			const d = Math.hypot(p.px - spot.px, (p.pz === undefined ? 0.5 : p.pz) - spot.pz);
			if (d < bestD) { bestD = d; best = i; }
		}
		if (best < 0 || wallOf[best] === wall) return;
		wallOf[best] = wall;
		switched[best] = true;
		worms[best] = null;   // (a fresh worm there, not swinging over from the last wall)
		show.fx('pick', 0.5);
	});

	self.setPlayers = function (p) {
		latest = p;
	};

	self.state = function () {
		return Object.assign(show.state(), { players, scores: scores.slice(), timeLeft: show.timeLeft() });
	};

	self.test = {
		jump,
		fieldAt: (px, pz) => { const f = fieldAt(px, pz); return Object.assign(f, { at: valley.project(f.x, valley.ground(f.x, f.z), f.z) }); },
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		clearCubes();
		valley.dispose();
		show.fini();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
