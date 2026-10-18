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
 * flailing as they move; little white cubes fall from the sky, and a worm
 * that gets to one picks it up: a point. An ES module (manifest: module: true).
 */
import * as THREE from '../lib/three/three.module.min.js';
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
	const CUBE = { size: 0.75, every: 0.55, drop: 26, fall: 8, life: 9, reach: 1.9, spin: 2.2 };   // a cube's size (metres); a new one every so often (seconds); how high it falls from and how fast (metres, a second); seconds it lies on the grass; how near a worm must be to grab one (metres); how fast it spins as it falls
	const CUBE_COLOUR = '#ffffff';

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
		menu: { jumps: false },   // (its own beat jumps, on the pause screen: see below)
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
		// (the valley, and the cubes in it, are behind, in their own canvas)
		if (show.beat !== 'play') return;   // (no worms over the opening screens)
		// each player, a worm out on the valley floor, far ones first
		const shown = [];
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || p.px === undefined) continue;
			const w = toField(p);
			const at = valley.project(w.x, valley.ground(w.x, w.z), w.z);
			if (at) shown.push({ i, p, at, z: w.z });
		}
		shown.sort((a, b) => a.z - b.z);
		for (const { i, p, at } of shown) {
			const tall = WORM.tall * Math.max(0.2, Math.min(1, (p.Y + 1) / 2)) * at.ppm;
			// (a wobbly cylinder, its flat foot right on the plane)
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

	const cubeGeo = new THREE.BoxGeometry(CUBE.size, CUBE.size, CUBE.size);
	const cubes = [];
	let nextCube = 0;
	function dropCube() {
		const colour = CUBE_COLOUR;
		const mesh = new THREE.Mesh(cubeGeo, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4, metalness: 0, emissive: colour, emissiveIntensity: 0.08 }));
		mesh.receiveShadow = true;
		mesh.castShadow = true;
		const spot = fieldAt(0.04 + Math.random() * 0.92, Math.random());   // (somewhere a player could stand)
		const x = spot.x, z = spot.z;
		const floor = valley.ground(x, z) + CUBE.size / 2;   // (sitting flat on the plane)
		mesh.position.set(x, floor + CUBE.drop, z);
		mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
		valley.scene.add(mesh);
		cubes.push({ mesh, colour, floor, landed: -1, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(CUBE.spin) });
	}
	function removeCube(k) {
		valley.scene.remove(k.mesh);
		k.mesh.material.dispose();
		cubes.splice(cubes.indexOf(k), 1);
	}
	function clearCubes() {
		while (cubes.length) removeCube(cubes[0]);
	}
	function stepCubes(dt) {
		nextCube -= dt;
		if (nextCube <= 0 && cubes.length < 40) { dropCube(); nextCube = CUBE.every * (0.6 + Math.random() * 0.8); }
		for (const k of cubes.slice()) {
			const m = k.mesh;
			if (k.landed < 0) {
				// falling, tumbling
				m.position.y -= CUBE.fall * dt;
				m.rotation.x += k.spin.x * dt;
				m.rotation.y += k.spin.y * dt;
				m.rotation.z += k.spin.z * dt;
				if (m.position.y <= k.floor) { m.position.y = k.floor; k.landed = t; m.rotation.set(0, m.rotation.y, 0); }
			} else {
				// flat on the grass, then shrinking away
				m.position.y = k.floor;
				const left = k.landed + CUBE.life - t;
				if (left < 0.6) m.scale.setScalar(Math.max(0.01, left / 0.6));
				if (left <= 0) { removeCube(k); continue; }
			}
			// a worm close enough (and the cube low enough) grabs it
			if (m.position.y - k.floor > 2.5) continue;
			for (let i = 0; i < players; i++) {
				const p = latest[i];
				if (!p || p.px === undefined) continue;
				const w = toField(p);
				if (Math.hypot(w.x - m.position.x, w.z - m.position.z) > CUBE.reach) continue;
				scores[i] = (scores[i] || 0) + 1;
				show.fx('pick', 0.7);
				removeCube(k);
				break;
			}
		}
	}

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
