/*
 * UX Demo (id show-debug): a blank game that runs the whole shared show
 * (shared/showtime.js) with nothing in the way, for stepping through the
 * choreography quickly.
 *
 * Every beat a real game has is here, in order: the squad picker, title
 * drop, clock intro, visor check, a stand-in controls intro and villain
 * intro, the play (a little game: see below), TIME!, scores,
 * rank, team, leaderboard, replay, rating and the end. The game's own beats
 * are labelled placeholders, so it's clear where a real game fills in.
 *
 * Its debug buttons are on the show's pause screen (the TAP panel on the
 * left wall; off the box, the pause screen's left wall): jump to any beat,
 * set the clock, shuffle the scores, fake the visor check passing, restart.
 * The current beat and its time show at the top.
 *
 * Behind it all, a sunny 3D valley (games/ux-demo-valley.js). The play: each
 * player is a worm (the visor check's worms, show.worms) out on the valley
 * floor, right where they are in the room, as tall as they are, leaning and
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
	const STAND_IN = 5;           // seconds for each placeholder intro
	// the room, out on the valley floor, from the back of the room to the
	// front wall: how far up the valley (metres ahead of the eye). Across, a
	// worm is always exactly where its player is across the front wall (1:1).
	const FIELD = { near: 4.5, far: 12 };
	const WORM = { tall: 2.3, thick: 0.3 };   // a worm's height (metres, for a tall player) and its thickness (radius, metres)
	const CUBE = { r: 0.22, tall: 0.55, every: 0.55, drop: 26, fall: 8, life: 9, reach: 1.9 };   // a pickup: a little white cylinder, its radius and height (metres); a new one every so often (seconds); how high it falls from and how fast (metres, a second); seconds it lies on the plane; how near a worm must be to grab one (metres)
	const CUBE_COLOUR = '#ffffff';
	const GROW = { each: 0.08, most: 2, rate: 8 };   // each pickup makes its worm this much taller (a share of its player's height), up to this many times as tall; how quickly it grows into it

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
		menu: { jumps: false, debug: true },   // (its own beat jumps, on the pause screen: see below; and the DEBUG panel, always there)
	});

	function initGame(count) {
		players = count;
		scores = Array.from({ length: count }, () => 0);
		show.go('title');
	}

	// A labelled stand-in for a game's own beat.
	function standIn(id, title, line) {
		return {
			id,
			length: STAND_IN,
			enter() { show.blackout = 0.3; },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, title, W / 2, 430, 120, bt);
					show.text(c, line, W / 2, 570, 46, { fill: '#9fb6d8', alpha: Math.min(1, bt * 2), glow: 'transparent' });
				});
			},
		};
	}

	/* ---------- the beats ---------- */

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop({
			lines: [{ text: 'UX', fill: '#3ad1ff', glow: '#5a4dff' }, { text: 'DEMO', fill: '#ffd23f', glow: '#ff7a3d' }],
		}),
		show.beats.clockIntro(),
		show.beats.visors(),
		standIn('controls', 'CONTROLS INTRO', 'THE GAME TEACHES ITS MOVES HERE'),
		standIn('villain', 'VILLAIN INTRO', 'THE GAME INTRODUCES ITS THREAT HERE'),
		{
			id: 'play',
			length: Infinity,
			enter() { show.label('PLAY'); },
			exit() { clearCubes(); },
			update(dt) {
				t += dt;
				stepWorms(dt);
				stepCubes(dt);
				show.record(t, Array.from({ length: players }, (_, i) => latest[i] || null));
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
		if (show.beat !== 'play') return;   // (no worms over the opening screens)
		// each player, a worm out on the valley floor, and the pickups: far ones first
		const shown = [];
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			const w = toField(p);
			const at = valley.project(w.x, valley.ground(w.x, w.z), w.z);
			if (at) shown.push({ i, p, at, z: w.z });
		}
		for (const k of cubes) {
			const g = valley.ground(k.x, k.z);
			const at = valley.project(k.x, g + k.y, k.z), floor = valley.project(k.x, g, k.z);
			if (at && floor) shown.push({ k, at, floor, z: k.z });
		}
		shown.sort((a, b) => a.z - b.z);
		for (const { i, p, at, k, floor } of shown) {
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
			const tall = WORM.tall * Math.max(0.2, Math.min(1, (p.Y + 1) / 2)) * (grown[i] || 1) * at.ppm;
			// (a wobbly cylinder, its flat foot right on the plane; taller for every pickup)
			show.worms.cylinder(ctx, at.x, at.y, tall, WORM.thick * at.ppm / 17, PLAYER_COLORS[i], t + i * 1.7, worms[i]);
		}
	}

	/* ---------- the play: worms, and cubes falling from the sky ---------- */

	// where a player is, out on the valley floor (room 0..1 across and toward
	// the front wall): as far ahead as they are up the room, and across, so
	// they show exactly where they stand across the front wall (its view is
	// 90° across, so at a depth d it spans 2d)
	const fieldAt = (px, pz) => {
		const d = FIELD.near + Math.max(0, Math.min(1, pz)) * (FIELD.far - FIELD.near);
		const want = Math.max(0.02, Math.min(0.98, px)) * W + W;   // (where they stand, across the front wall; a hair in from its edges, so they never slip off it)
		// (worked out through the front camera itself: across, the view is
		// linear at a given distance, so two points give the line)
		const y = valley.ground(0, -d);
		const a = valley.project(0, y, -d), b = valley.project(1, y, -d);
		if (!a || !b || a.wall !== 1 || b.wall !== 1 || b.x === a.x) return { x: (px - 0.5) * 2 * d, z: -d };
		return { x: (want - a.x) / (b.x - a.x), z: -d };
	};
	const toField = (p) => fieldAt(p.px, p.pz === undefined ? 0.5 : p.pz);
	const worms = [];
	function stepWorms(dt) {
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			worms[i] = worms[i] || show.worms.state(p.px);
			show.worms.step(worms[i], p.px, dt);
		}
	}

	// The pickups: little white cylinders, the avatars' look, falling from
	// the sky and settling on the plane (drawn on the show's canvas with the
	// worms, not in the valley's 3D scene).
	const cubes = [];   // { x, z, y (metres above the plane), landed, scale, seed }
	let nextCube = 0;
	function dropCube() {
		const spot = fieldAt(0.04 + Math.random() * 0.92, Math.random());   // (somewhere a player could stand)
		cubes.push({ x: spot.x, z: spot.z, y: CUBE.drop, landed: -1, scale: 1, seed: Math.random() * 10 });
	}
	function removeCube(k) {
		cubes.splice(cubes.indexOf(k), 1);
	}
	function clearCubes() {
		cubes.length = 0;
	}
	function stepCubes(dt) {
		nextCube -= dt;
		if (nextCube <= 0 && cubes.length < 40) { dropCube(); nextCube = CUBE.every * (0.6 + Math.random() * 0.8); }
		for (const k of cubes.slice()) {
			if (k.landed < 0) {
				// falling
				k.y = Math.max(0, k.y - CUBE.fall * dt);
				if (k.y <= 0) k.landed = t;
			} else {
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
				const w = toField(p);
				if (Math.hypot(w.x - k.x, w.z - k.z) > CUBE.reach) continue;
				scores[i] = (scores[i] || 0) + 1;
				show.fx('pick', 0.7);
				removeCube(k);
				break;
			}
		}
		// each worm's height growing (springily quick) toward what its pickups have earned it
		for (let i = 0; i < players; i++) {
			const want = Math.min(GROW.most, 1 + GROW.each * (scores[i] || 0));
			grown[i] = (grown[i] || 1) + (want - (grown[i] || 1)) * Math.min(1, dt * GROW.rate);
		}
	}
	const grown = [];   // each worm's height, against its player's own (1: as tall as they are)

	/* ---------- the debug buttons (on the show's pause screen) ---------- */

	const JUMPS = ['title', 'clock', 'visors', 'controls', 'villain', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
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
