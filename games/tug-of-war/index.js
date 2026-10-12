/*
 * Tug of War
 *
 * Two raised steel platforms face each other across a drop, joined by a
 * thick rope. Before each bout the room splits down the middle: everyone
 * standing in the left half is the LEFT team, the right half the RIGHT team
 * (the smaller side gets a strength bonus). A drum beats; on every beat a
 * team pulls by stepping back, away from the front wall, together. A step
 * back on the beat pulls; a step back off the beat gives rope away.
 * Teammates who bunch up close along the rope pull harder, and once a bout
 * the call comes to LEAN BACK: step in, then everyone heaves hard at once.
 * Now and then a RALLY pad lights up on each team's wall; tap it for a
 * surge. When the red ribbon reaches a team's line, the other team is
 * dragged over the edge and falls, and the guards fire. Three bouts, teams
 * re-picked each time; each player scores the bouts they won.
 *
 * The front wall is the whole contest side on: each contestant stands on
 * the rope where their player stands, left to right. The left wall is the
 * LEFT team's platform and the right wall the RIGHT team's, seen side on
 * along the room's depth, so stepping back moves you toward the back of the
 * room on your team's wall, with the beat marker and the rally pad.
 *
 * Input: px (team and place on the rope), pz (stepping back on the beat to
 * pull). Touch: tap your team's RALLY pad. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildHall, buildDeck, buildRope, addAmbience, buildContestant, buildGuard, buildSplat } from './models.js';
import { createSound } from './sound.js';

IGB.register('tug-of-war', function TugOfWarGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const BOUTS = 3;
	const S = 5.7;               // half the room's width in the hall: px maps onto -S..S
	const TOP = 130;             // the marquee across the top of each wall, world pixels
	const GAP = 1.2;             // half the width of the drop between the platforms
	const DROP = 2.5;            // how far down it is
	const DEPTH = 3.4;           // the platforms' depth
	const MARK = 1.7;            // the ribbon reaching this far toward a team wins it the bout
	const ROPE_Y = 1.0;
	const SHIFT = 0.55;          // how far the contestants are dragged per metre the ribbon moves
	const PICK = 6;              // seconds to choose a side before each bout
	const READY = 3;             // the countdown to the first pull
	const BEAT = 1.5;            // seconds between pulls
	const LEAD = 1.5;            // from the start of the bout to the first beat
	const WINDOW = 0.42;         // a step back this close to a beat counts as on it
	const STEP = 0.08;           // a step back this far (of the room's depth) is a full pull
	const MAX_PULL = 1.5;        // the most one step can be worth
	const OFF_BEAT = 0.6;        // what a full step back off the beat costs
	const PULL = 0.2;            // metres the ribbon moves per beat, per unit of difference in pull
	const SUDDEN = 35;           // after this long, every pull counts double
	const BOUT_MAX = 60;         // and at this, the team ahead wins
	const LEAN_STEP = 0.12;      // the lean back: a full pull is a bigger step...
	const LEAN_MAX = 2.5;        // ...worth up to this...
	const LEAN_MULT = 2;         // ...times this
	const LEAN_WINDOW = 0.6;
	const BUNCH = 0.14;          // teammates closer than this (px) are together
	const BUNCH_BONUS = 0.6;     // a whole team together pulls this much harder
	const SMALL_BONUS = 1.25;    // the side with fewer players pulls this much harder
	const BOT_PULL = 0.6;        // a stand-in contestant's pull, when a side is empty
	const PAD_EVERY = [9, 14];   // seconds between rally pads
	const PAD_LIFE = 5;
	const PAD_R = 115;           // the pad's radius, world pixels
	const SURGE = 4;             // seconds a rally lasts
	const SURGE_MULT = 1.6;
	const DRAG = 2.4;            // m/s the losers are dragged at

	const TEAM_NAMES = ['LEFT', 'RIGHT'];
	const TEAM_COLOURS = ['#ffc23d', '#2fe0cc'];
	const TEAM_HEX = [0xffc23d, 0x2fe0cc];
	const BOT_COLOUR = '#8a8a96';

	/* ---------- renderer, scenes, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0x0b0a10);
	renderer.autoClear = false;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	// Canvas pixels, so the walls' viewports meet exactly (as in RLGL).
	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 6000 / WIDTH);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
	}
	function viewport(x, y, w, h) {
		const x0 = Math.round(x * k);
		const x1 = Math.round((x + w) * k);
		const y0 = Math.round((H - y - h) * k);
		const y1 = Math.round((H - y) * k);
		renderer.setViewport(x0, y0, x1 - x0, y1 - y0);
		renderer.setScissor(x0, y0, x1 - x0, y1 - y0);
	}
	const unlisten = IGB.onResize(resize);
	resize();

	// Every view is orthographic and looks along -z, tilted down by `pitch`,
	// so a point's place across its wall is just its x: 1:1 with the room.
	const VH = 2 * S * (H - TOP) / W;
	function camera(pitch, centreY) {
		const p = pitch * Math.PI / 180;
		const cam = new THREE.OrthographicCamera(-S, S, VH / 2, -VH / 2, 0.1, 100);
		const target = new THREE.Vector3(0, centreY, 0);
		cam.position.copy(target).add(new THREE.Vector3(0, Math.sin(p), Math.cos(p)).multiplyScalar(40));
		cam.lookAt(target);
		cam.updateMatrixWorld();
		return cam;
	}

	// The hall, side on: the bottom of the view is the bottom of the drop.
	const FRONT_PITCH = 14;
	const hall = new THREE.Scene();
	addAmbience(hall);
	hall.add(buildHall({ gap: GAP, drop: DROP, reach: S + 2, mark: MARK, depth: DEPTH }).group);
	const hallRope = buildRope(2 * S + 14);
	hallRope.group.position.y = ROPE_Y;
	hall.add(hallRope.group);
	const frontCam = camera(FRONT_PITCH, -DROP - 1.2 + VH / 2 / Math.cos(FRONT_PITCH * Math.PI / 180));

	// Each team's deck, side on along the room's depth. On the left wall the
	// front of the room (and the edge) is on the right; on the right wall,
	// on the left. dir points toward the edge.
	const SIDE_PITCH = 18;
	const EDGE = S - 0.25;
	const decks = [1, -1].map(function (dir) {
		const scene = new THREE.Scene();
		addAmbience(scene);
		scene.add(buildDeck({ dir, edge: EDGE, drop: DROP, depth: DEPTH }).group);
		const rope = buildRope(2 * S + 14);
		rope.ribbon.visible = false;
		rope.group.position.y = ROPE_Y;
		scene.add(rope.group);
		const guard = buildGuard('triangle', false);
		guard.root.position.set(-dir * (S - 1.1), 0, -1.3);
		guard.root.rotation.y = Math.PI;
		scene.add(guard.root);
		return { dir, scene, rope, cam: camera(SIDE_PITCH, 0.27 * VH / Math.cos(SIDE_PITCH * Math.PI / 180)) };
	});

	// Guards: two with rifles on the catwalk behind the drop, one at the back
	// of each platform.
	const shooters = [-1, 1].map(function (s, i) {
		const g = buildGuard(i ? 'circle' : 'square', true);
		g.root.position.set(s * 0.75, 0, -DEPTH / 2 - 0.6);
		g.root.rotation.y = Math.PI;
		hall.add(g.root);
		return g;
	});
	for (const s of [-1, 1]) {
		const g = buildGuard('triangle', false);
		g.root.position.set(s * (S - 0.7), 0, -DEPTH / 2 + 0.45);
		g.root.rotation.y = Math.PI;
		hall.add(g.root);
	}

	// Where a point shows on wall w through `cam`, in world pixels.
	const tmp = new THREE.Vector3();
	function project(cam, w, x, y, z) {
		tmp.set(x, y, z).project(cam);
		return { x: w * W + (tmp.x + 1) / 2 * W, y: TOP + (1 - tmp.y) / 2 * (H - TOP) };
	}

	/* ---------- contestants ---------- */

	let contestants = [];
	let players = 0;

	function Contestant(n, bot) {
		const colour = bot ? BOT_COLOUR : PLAYER_COLORS[n];
		const front = buildContestant(bot ? 90 + n : n, colour);
		const side = buildContestant(bot ? 90 + n : n, colour);
		hall.add(front.root);
		const c = {
			n, bot, colour, front, side,
			score: 0,
			px: bot ? 0.5 : (n + 1) / (players + 1),
			pz: 0.5,
			sz: 0.5,          // pz, smoothed against tracking jitter
			team: 0,
			good: 0,          // how far they've stepped back on this beat
			bad: 0,           // and off it, since the last beat
			contrib: 0,       // their pull on the last beat
			heave: 0,         // the lean of a pull, 1 fading to 0
			x: 0, y: 0, z: 0, // in the hall
			sx: 0, sy: 0, sz3: 0, // on their deck
			fall: null,
			splat: null,
		};
		return c;
	}

	function reset(c) {
		c.fall = null;
		c.y = 0;
		c.sy = 0;
		c.svy = 0;
		c.good = c.bad = c.contrib = c.heave = 0;
		if (c.splat) { hall.remove(c.splat); c.splat = null; }
		for (const m of [c.front, c.side]) {
			m.root.visible = true;
			m.ring.visible = true;
			m.marker.visible = true;
			m.lean.rotation.set(0, 0, 0);
		}
	}

	const humans = () => contestants.filter((c) => !c.bot);

	/* ---------- the game's state ---------- */

	const sound = createSound();
	const hud = new HUD('#e5287a');
	hud.$el.appendTo(stage.$ui);

	let bout = -1;
	let phase = 'waiting';     // waiting, intro, pick, ready, pull, drop, result, over
	let phaseT = 0;
	let phaseDur = 0;
	let clock = 0;
	let rope = 0;              // where the ribbon is: negative toward LEFT, positive toward RIGHT
	let ropeShown = 0;
	let ropeVel = 0;
	let lastBeat = -1;         // the last beat whose drum has sounded
	let lastResolved = -1;     // the last beat whose pull has been counted
	let lastTock = -1;
	let leanAt = 10;           // the beat that's the lean back
	let bonus = [1, 1];
	let bunch = [1, 1];
	let links = [[], []];      // pairs of teammates together, for the glow
	let surge = [0, 0];        // seconds of rally left
	let force = [0, 0];        // each team's pull on the last beat
	let totals = [0, 0];       // and over the bout
	let winner = -1;
	let pads = [];             // { team, x, y, age }
	let nextPad = 0;
	let flash = 0;
	let beatFlash = 0;
	let shots = [];            // { at, c } guards' shots to come
	const pops = [];           // words that float up: { text, colour, x, y, age, size }
	const history = [];        // each bout's winners, for tests

	function setPhase(p, dur = 0) {
		phase = p;
		phaseT = 0;
		phaseDur = dur;
	}

	function pop(text, colour, x, y, size = 56) {
		pops.push({ text, colour, x, y, age: 0, size });
	}

	/* ---------- the flow of a game ---------- */

	function initGame(count) {
		players = count;
		sound.resume();
		contestants = [];
		for (let i = 0; i < count; i++) contestants.push(Contestant(i, false));
		sound.say('Tug of war');
		setPhase('intro', 3);
	}

	// Everyone up and back on the platforms; choose a side.
	function startPick(b) {
		bout = b;
		winner = -1;
		rope = ropeShown = ropeVel = 0;
		for (const c of contestants) {
			reset(c);
			if (c.bot) {
				hall.remove(c.front.root);
				c.side.root.parent.remove(c.side.root);
			}
		}
		contestants = humans();
		shots = [];
		pads = [];
		surge = [0, 0];
		totals = [0, 0];
		force = [0, 0];
		setPhase('pick', PICK);
	}

	// Teams by where everyone stands: the left half and the right half. If
	// everyone's on one side, split them down the middle of where they are;
	// alone, you pull against a stand-in.
	function lockTeams() {
		const people = humans();
		for (const c of people) c.team = c.px < 0.5 ? 0 : 1;
		const counts = [0, 1].map((t) => people.filter((c) => c.team === t).length);
		if (people.length > 1 && (!counts[0] || !counts[1])) {
			const sorted = people.slice().sort((a, b) => a.px - b.px);
			sorted.forEach((c, i) => { c.team = i < Math.floor(sorted.length / 2) ? 0 : 1; });
		}
		for (const t of [0, 1]) {
			if (!people.some((c) => c.team === t)) {
				const bot = Contestant(t, true);
				bot.team = t;
				bot.px = t ? 0.78 : 0.22;
				contestants.push(bot);
			}
		}
		const sizes = [0, 1].map((t) => contestants.filter((c) => c.team === t).length);
		bonus = [0, 1].map((t) => (sizes[t] < sizes[1 - t] ? SMALL_BONUS : 1));
		leanAt = 7 + Math.floor(Math.random() * 4);
		lastBeat = lastResolved = lastTock = -1;
		nextPad = 3.5;                    // the first pad comes early
		sound.horn();
		setPhase('ready', READY);
	}

	function startPull() {
		sound.drum(true);
		setPhase('pull', BOUT_MAX + LEAD);
	}

	// The ribbon reached a line (or time ran out): the other team goes over.
	function endBout(w) {
		winner = w;
		history.push({ bout, winner: w, teams: [0, 1].map((t) => contestants.filter((c) => c.team === t && !c.bot).map((c) => c.n)) });
		for (const c of contestants) if (c.team === w && !c.bot) c.score++;
		pads = [];
		sound.creak();
		sound.say(`${TEAM_NAMES[w].toLowerCase()} team wins`);
		setPhase('drop', 7);
	}

	function finiGame() {
		setPhase('over');
		const scores = humans().map((c) => c.score);
		stage.timeout(() => IGB.complete(scoresToRewards(scores)), 5000);
	}

	/* ---------- the beat ---------- */

	// Beat i falls at LEAD + i * BEAT into the bout. The two before the lean
	// back are for stepping in; they don't pull.
	const beatTime = (i) => LEAD + i * BEAT;
	const windowOf = (i) => (i === leanAt ? LEAN_WINDOW : WINDOW);
	const isStepIn = (i) => i === leanAt - 1 || i === leanAt - 2;

	function beatInfo() {
		const t = phase === 'pull' ? phaseT : -1;
		const i = Math.max(0, Math.round((t - LEAD) / BEAT));
		const since = t - beatTime(Math.floor((t - LEAD) / BEAT));
		const next = Math.max(0, Math.ceil((t - LEAD) / BEAT - 1e-6));
		const toNext = beatTime(next) - t;
		const inWindow = phase === 'pull' && Math.abs(t - beatTime(i)) <= windowOf(i) && !isStepIn(i);
		return { i, next, toNext, since, inWindow };
	}

	// A beat's pull: each contestant's steps back on it, less their steps
	// off it, averaged over the team, times how bunched they are, any bonus
	// and rally, and the difference moves the ribbon.
	function resolveBeat(i) {
		if (isStepIn(i)) {
			for (const c of contestants) c.good = c.bad = 0;
			return;
		}
		const lean = i === leanAt;
		for (const c of contestants) {
			if (c.bot) {
				c.contrib = BOT_PULL * (0.8 + Math.random() * 0.4) * (lean ? LEAN_MULT : 1);
			} else {
				const on = lean ? Math.min(LEAN_MAX, c.good / LEAN_STEP) * LEAN_MULT : Math.min(MAX_PULL, c.good / STEP);
				c.contrib = on - OFF_BEAT * Math.min(1, c.bad / STEP);
			}
			c.good = c.bad = 0;
			if (c.contrib > 0.3) c.heave = 1;
			// a word over them on their team's wall
			const at = project(decks[c.team].cam, c.team ? 2 : 0, c.sx, 2.6, c.sz3);
			if (c.contrib >= 0.5 && !c.bot) pop(lean ? 'HEAVE!' : 'PULL', '#7dff9a', at.x, at.y, lean ? 64 : 50);
			else if (c.contrib < -0.1) pop('OFF BEAT', '#ff5a6e', at.x, at.y, 44);
		}
		const sudden = phaseT >= SUDDEN + LEAD ? 2 : 1;
		force = [0, 1].map(function (t) {
			const team = contestants.filter((c) => c.team === t);
			const avg = team.reduce((a, c) => a + c.contrib, 0) / Math.max(1, team.length);
			return avg * (avg > 0 ? bunch[t] * bonus[t] * (surge[t] > 0 ? SURGE_MULT : 1) : 1);
		});
		totals[0] += force[0];
		totals[1] += force[1];
		const move = PULL * sudden * (force[1] - force[0]);
		rope = Math.max(-MARK, Math.min(MARK, rope + move));
		if (Math.abs(move) > 0.05) {
			const t = move < 0 ? 0 : 1;
			const at = project(frontCam, 1, (t ? 1 : -1) * (GAP + 2.2), 2.3, 0);
			pop(lean ? 'LEAN BACK!' : 'HEAVE!', TEAM_COLOURS[t], at.x, at.y, lean ? 80 : 60);
			sound.creak();
		}
		if (rope <= -MARK) endBout(0);
		else if (rope >= MARK) endBout(1);
	}

	// Who's bunched up with whom, along the rope.
	function updateBunch() {
		for (const t of [0, 1]) {
			const team = contestants.filter((c) => c.team === t && !c.bot).sort((a, b) => a.px - b.px);
			links[t] = [];
			for (let i = 1; i < team.length; i++) if (team[i].px - team[i - 1].px < BUNCH) links[t].push([team[i - 1], team[i]]);
			bunch[t] = team.length > 1 ? 1 + BUNCH_BONUS * links[t].length / (team.length - 1) : 1;
		}
	}

	/* ---------- touch: the rally pads ---------- */

	function spawnPads() {
		pads = [];
		for (const t of [0, 1]) {
			if (!contestants.some((c) => c.team === t && !c.bot)) continue;
			pads.push({ team: t, x: (t ? 2 : 0) * W + 260 + Math.random() * (W - 520), y: 560 + Math.random() * 260, age: 0 });
		}
	}

	stage.$el.on('click', function (e) {
		if (phase !== 'pull') return;
		const at = IGB.toWorld(e);
		for (const p of pads) {
			if (Math.hypot(at.x - p.x, at.y - p.y) > PAD_R + 25) continue;
			pads.splice(pads.indexOf(p), 1);
			surge[p.team] = SURGE;
			sound.rally();
			pop('RALLY!', TEAM_COLOURS[p.team], p.x, p.y - 40, 80);
			return;
		}
	});

	/* ---------- every frame ---------- */

	function simulate(dt) {
		phaseT += dt;
		clock += dt;

		// steps back, on the beat or off it
		const beat = beatInfo();
		for (const c of contestants) {
			if (c.bot) continue;
			const before = c.sz;
			c.sz += (c.pz - c.sz) * Math.min(1, dt * 14);
			const dz = c.sz - before;
			if (phase === 'pull' && dz > 0) {
				if (beat.inWindow) c.good += dz;
				else if (!isStepIn(beat.i)) c.bad += dz;
			}
		}

		switch (phase) {
		case 'intro':
			if (phaseT >= phaseDur) startPick(0);
			break;

		case 'pick':
			for (const c of contestants) c.team = c.px < 0.5 ? 0 : 1;
			if (phaseT >= phaseDur) lockTeams();
			break;

		case 'ready':
			if (Math.ceil(phaseDur - phaseT) !== Math.ceil(phaseDur - phaseT + dt) && phaseT < phaseDur) sound.tock();
			if (phaseT >= phaseDur) startPull();
			break;

		case 'pull': {
			updateBunch();
			const t = phaseT - LEAD;
			// the drum on each beat, a tick halfway between
			const i = Math.floor(t / BEAT);
			if (t >= 0 && i > lastBeat) {
				lastBeat = i;
				sound.drum(i === leanAt);
				beatFlash = 1;
				if (i === leanAt - 2) {
					sound.horn();
					sound.say('Lean back!');
				}
			}
			const half = Math.floor(t / BEAT - 0.5);
			if (t > 0 && half > lastTock) {
				lastTock = half;
				sound.tock();
			}
			// count each beat's pull once its window has closed
			for (let j = lastResolved + 1; j <= i; j++) {
				if (t >= j * BEAT + windowOf(j)) {
					lastResolved = j;
					resolveBeat(j);
					if (phase !== 'pull') break;
				}
			}
			if (phase !== 'pull') break;
			// rally pads
			nextPad -= dt;
			if (nextPad <= 0) {
				spawnPads();
				nextPad = PAD_EVERY[0] + Math.random() * (PAD_EVERY[1] - PAD_EVERY[0]);
			}
			if (phaseT >= phaseDur) endBout(rope < 0 || (rope === 0 && totals[0] >= totals[1]) ? 0 : 1);
			break;
		}

		case 'drop':
			dropFrame(dt);
			if (phaseT >= phaseDur) setPhase('result', 2.5);
			break;

		case 'result':
			if (phaseT >= phaseDur) {
				if (bout + 1 >= BOUTS) finiGame();
				else startPick(bout + 1);
			}
			break;
		}

		for (const p of pads) p.age += dt;
		pads = pads.filter((p) => p.age < PAD_LIFE);
		surge = surge.map((s) => Math.max(0, s - dt));

		// the ribbon swings to where it's been pulled
		const pull = (rope - ropeShown) * 40 - ropeVel * 9;
		ropeVel += pull * dt;
		ropeShown += ropeVel * dt;
		hallRope.group.position.x = ropeShown;
		for (const d of decks) d.rope.group.position.x = ropeShown * SHIFT;

		for (const c of contestants) place(c, dt);
		for (const s of shots.slice()) {
			if (clock < s.at) continue;
			shots.splice(shots.indexOf(s), 1);
			shoot(s.c);
		}
		for (const g of shooters) {
			g.flashT = Math.max(0, (g.flashT || 0) - dt);
			g.flash.visible = g.flashT > 0.06;
			g.lean.rotation.x = Math.min(1, g.aim || 0) * 0.45;
			g.aim = Math.max(0, (g.aim || 0) - dt * 0.4);
		}

		flash = Math.max(0, flash - dt * 1.6);
		beatFlash = Math.max(0, beatFlash - dt * 2.5);
		for (let i = pops.length - 1; i >= 0; i--) {
			pops[i].age += dt;
			if (pops[i].age > 1.3) pops.splice(i, 1);
		}
	}

	/* ---------- where everyone stands ---------- */

	// The front of each team's platform, where they dig in.
	const lo = (t) => (t ? GAP + 0.3 : -S - 1);
	const hi = (t) => (t ? S + 1 : -GAP - 0.3);
	const clampTo = (t, x) => Math.max(lo(t), Math.min(hi(t), x));

	function place(c, dt) {
		const sign = c.team ? -1 : 1;    // toward the gap
		const d = decks[c.team];
		if (c.side.root.parent !== d.scene) d.scene.add(c.side.root);   // onto their team's deck
		const holding = phase === 'ready' || phase === 'pull' || (phase === 'drop' && c.team !== winner);
		c.heave = Math.max(0, c.heave - dt * 2.2);

		if (phase === 'drop' && c.team !== winner) sideDrag(c, d, dt);
		if (c.fall) {
			fallFrame(c, dt);
		} else if (phase === 'drop' && c.team !== winner) {
			// dragged over the edge
			c.x += sign * DRAG * dt;
			if (sign * c.x > -GAP + 0.1) {
				c.fall = { t: 0, vy: 0, vx: sign * 1.2, landed: false };
				sound.fall();
			}
		} else {
			// in the hall: their place along the rope, on their own platform
			const order = contestants.filter((o) => o.team === c.team).indexOf(c);
			const base = (2 * c.px - 1) * S;
			const tx = clampTo(c.team, clampTo(c.team, base) + (holding ? ropeShown * SHIFT : 0) + (phase === 'drop' ? -sign * Math.min(1, phaseT) * 0.8 : 0));
			c.x += (tx - c.x) * Math.min(1, dt * 10);
			c.z = order % 2 ? -0.22 : 0.22;
			// on their deck: across is their depth in the room
			const depth = c.bot ? 0.45 : c.sz;
			const sx = d.dir * (S - 2 * S * depth) + (holding ? ropeShown * SHIFT : 0);
			const ts = Math.max(-S - 1, Math.min(EDGE - 0.45, d.dir * sx)) * d.dir;
			c.sx += (ts - c.sx) * Math.min(1, dt * 10);
			const across = c.team ? (c.px - 0.5) / 0.5 : c.px / 0.5;
			c.sz3 = (Math.max(0, Math.min(1, across)) - 0.5) * 1.2;
		}

		for (const [m, x, y, z] of [[c.front, c.x, c.y, c.z], [c.side, c.sx, c.sy, c.sz3]]) {
			m.root.position.set(x, y, z);
			if (c.fall || (m === c.side && c.sy < 0)) continue;
			m.root.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
			if (phase === 'pick' || phase === 'intro') {
				// standing, facing the gap, arms down
				m.root.rotation.y = sign > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5;
				pose(m, 0, 0, 0, 0);
			} else if (phase === 'drop' && c.team !== winner) {
				pose(m, 1.3, -0.35, 0.5, -0.2);           // dragged, pitching forward
			} else if ((phase === 'drop' || phase === 'result') && c.team === winner) {
				pose(m, Math.PI * 0.95, 0.05, 0.1, -0.1);   // arms up
				m.root.position.y = Math.abs(Math.sin(clock * 7 + c.n)) * 0.15;
			} else if (holding) {
				pose(m, 1.35, 0.18 + 0.32 * c.heave + (c.team === (rope > 0 ? 0 : 1) ? Math.abs(ropeShown) * 0.05 : 0), 0.45, -0.35);
			} else {
				pose(m, 0, 0, 0, 0);
			}
			m.marker.position.y = 2.25 + Math.sin(clock * 3 + c.n) * 0.05;
		}
	}

	// Arms forward by `arms`, leaning back by `lean` (forward if negative), legs apart.
	function pose(m, arms, lean, front, back) {
		m.arms[0].rotation.x = m.arms[1].rotation.x = arms;
		m.lean.rotation.x = -lean;
		m.lean.rotation.z = 0;
		m.legs[0].rotation.x = front;
		m.legs[1].rotation.x = back;
	}

	// Over the edge: down the drop, a thud, and the guards fire.
	function fallFrame(c, dt) {
		const f = c.fall;
		f.t += dt;
		if (!f.landed) {
			f.vy -= 14 * dt;
			c.y += f.vy * dt;
			c.x += f.vx * dt;
			c.x = Math.max(-GAP + 0.35, Math.min(GAP - 0.35, c.x));
			const spin = Math.min(1, f.t / 0.5);
			c.front.lean.rotation.x = -spin * 1.4;
			for (const arm of c.front.arms) arm.rotation.x = Math.PI * 0.9;
			if (c.y <= -DROP) {
				c.y = -DROP;
				f.landed = true;
				c.front.lean.rotation.x = Math.PI / 2 * 0.98;
				c.front.lean.rotation.z = (c.n % 2 ? 1 : -1) * 0.3;
				c.front.root.rotation.y = (c.n % 2 ? 0.4 : -0.4);
				c.front.ring.visible = false;
				c.front.marker.visible = false;
				sound.thud();
				shots.push({ at: clock + 0.35 + shots.length * 0.4, c });
			}
		}
	}

	// On their deck: dragged to the edge and over it.
	function sideDrag(c, d, dt) {
		const over = d.dir * c.sx > EDGE;
		c.sx += d.dir * (over ? 1.2 : DRAG) * dt;
		if (over) {
			c.svy = (c.svy || 0) - 14 * dt;
			c.sy += c.svy * dt;
			c.side.lean.rotation.x = -Math.min(1.4, -c.sy);
		}
		if (c.sy < -DROP + 0.5) c.side.root.visible = false;
	}

	function shoot(c) {
		const g = shooters[c.x < 0 ? 0 : 1];
		g.flashT = 0.12;
		g.aim = 1;
		sound.gunshot();
		flash = 0.25;
		if (!c.splat) {
			c.splat = buildSplat();
			c.splat.scale.setScalar(0.01);
			c.splat.position.set(c.x, -DROP + 0.02, c.z + 0.3);
			hall.add(c.splat);
			c.splat.born = clock;
		}
	}

	function dropFrame(dt) {
		for (const c of contestants) if (c.splat) c.splat.grow(Math.min(0.6, (clock - c.splat.born) / 0.5));
		// the rope goes with the losers
		const sign = winner === 0 ? -1 : 1;
		if (contestants.some((c) => c.team !== winner && !(c.fall && c.fall.landed))) rope += sign * DRAG * dt;
	}

	/* ---------- drawing ---------- */

	function render() {
		renderer.setScissorTest(false);
		renderer.clear();
		renderer.setScissorTest(true);
		viewport(W, TOP, W, H - TOP);
		renderer.render(hall, frontCam);
		decks.forEach(function (d, t) {
			viewport(t ? 2 * W : 0, TOP, W, H - TOP);
			renderer.render(d.scene, d.cam);
		});
	}

	const big = { font: 'Paytone One', weight: 400, fill: 'white', outline: '#0b0a10', outlineWidth: 7 };
	const style = (o) => Object.assign({}, big, o);

	// The 2D layer: the marquees, the beat, the glow between teammates, the
	// rally pads and the words that float up.
	function overlay(ctx) {
		art.eachWall(ctx, (g, w) => marquee(g, w));
		// each platform's team, painted down its face
		if (phase !== 'waiting' && phase !== 'intro') {
			for (const t of [0, 1]) {
				const at = project(frontCam, 1, (t ? 1 : -1) * (GAP + 2.45), -1.9, DEPTH / 2);
				art.text(ctx, TEAM_NAMES[t], at.x, at.y, style({ size: 120, fill: TEAM_COLOURS[t], outline: null, alpha: 0.22 }));
			}
		}
		if (phase === 'pick') pickOverlay(ctx);
		if (phase === 'ready' || phase === 'pull') {
			bunchGlow(ctx);
			for (const t of [0, 1]) beatMarker(ctx, t);
		}
		for (const p of pads) pad(ctx, p);
		if (phase === 'ready') {
			const n = Math.ceil(phaseDur - phaseT);
			art.text(ctx, 'PICK UP THE ROPE', W * 1.5, TOP + 140, style({ size: 72 }));
			art.with(ctx, { x: W * 1.5, y: TOP + 300, scale: 1 + 0.3 * (phaseT % 1) }, (g) => art.text(g, String(n), 0, 0, style({ size: 150, alpha: 1 - (phaseT % 1) * 0.6 })));
		}
		if (phase === 'pull') {
			// the call before a lean back
			const b = beatInfo();
			if (isStepIn(b.next) || b.next === leanAt || (b.inWindow && b.i === leanAt)) {
				const now = b.inWindow && b.i === leanAt;
				art.text(ctx, now ? 'LEAN BACK!' : 'STEP IN...', W * 1.5, TOP + 560, style({ size: now ? 120 : 84, fill: now ? '#ff7eb6' : 'white' }));
			}
		}
		if (phase === 'over') {
			// everyone's bouts won, big
			const list = humans();
			list.forEach(function (o, i) {
				const x = W * 1.5 + (i - (list.length - 1) / 2) * 190;
				art.circle(ctx, x, TOP + 330, 80, { fill: o.colour, stroke: 'white', lineWidth: 8 });
				art.text(ctx, String(o.score), x, TOP + 334, style({ size: 96 }));
			});
			art.text(ctx, 'BOUTS WON', W * 1.5, TOP + 160, style({ size: 80 }));
		}
		if (phase === 'drop' || phase === 'result') {
			art.text(ctx, `${TEAM_NAMES[winner]} TEAM WINS`, W * 1.5, TOP + 120, style({ size: 90, fill: TEAM_COLOURS[winner] }));
		}
		for (const p of pops) {
			art.text(ctx, p.text, p.x, Math.max(TOP + p.size * 0.65, p.y - p.age * 80), style({ size: p.size, fill: p.colour, alpha: Math.min(1, 2 * (1.3 - p.age)) }));
		}
		// surging: the team's wall edged in its colour
		for (const t of [0, 1]) {
			if (surge[t] <= 0) continue;
			const x = t ? 2 * W : 0;
			art.rect(ctx, x + 10, TOP + 10, W - 20, H - TOP - 20, { stroke: TEAM_COLOURS[t], lineWidth: 18, alpha: 0.5 + 0.4 * Math.sin(clock * 14) });
		}
		if (flash > 0) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,255,255,${flash})` });
	}

	// The strip across the top of every wall: the team on each side wall,
	// and the score and the ribbon's place on the front.
	function marquee(c, w) {
		art.rect(c, 0, 0, W, TOP, { fill: art.linear(c, 0, 0, 0, TOP, ['#26222e', '#141218']) });
		art.rect(c, 0, TOP - 6, W, 6, { fill: '#e5287a' });
		for (let i = 0; i < 40; i++) {
			const lit = phase === 'pull' ? beatFlash > 0.3 || (Math.floor(clock * 6) + i) % 4 === 0 : (Math.floor(clock * 4) + i) % 3 !== 0;
			art.circle(c, 20 + i * 40, 12, 6, { fill: lit ? '#ffd9ec' : '#4a3a48' });
		}
		const y = TOP / 2 + 6;
		if (w === 1) {
			frontMarquee(c, y);
			return;
		}
		const t = w === 0 ? 0 : 1;
		if (phase === 'waiting' || phase === 'intro' || phase === 'over') {
			art.text(c, 'TUG OF WAR', W / 2, y, style({ size: 76, fill: '#ff7eb6' }));
			return;
		}
		const team = phase === 'pick' ? contestants.filter((o) => o.px < 0.5 === (t === 0)) : contestants.filter((o) => o.team === t);
		art.text(c, `${TEAM_NAMES[t]} TEAM`, W / 2, y, style({ size: 70, fill: TEAM_COLOURS[t] }));
		team.forEach(function (o, i) {
			const x = (t ? W - 90 : 90) + (t ? -1 : 1) * i * 92;
			art.circle(c, x, y, 36, { fill: o.colour, stroke: 'white', lineWidth: 5 });
		});
		const tag = surge[t] > 0 ? `RALLY ×${SURGE_MULT}` : bonus[t] > 1 && phase !== 'pick' ? `+${Math.round((bonus[t] - 1) * 100)}%` : '';
		if (tag) art.text(c, tag, t ? 230 : W - 230, y, style({ size: 50, fill: surge[t] > 0 ? '#7dff9a' : 'white' }));
	}

	function frontMarquee(c, y) {
		// everyone's bouts won, on the right
		humans().forEach(function (o, i) {
			const x = W - 70 - i * 92;
			art.circle(c, x, y, 38, { fill: o.colour, stroke: 'white', lineWidth: 5 });
			art.text(c, String(o.score), x, y + 2, style({ size: 44, outlineWidth: 5 }));
		});
		if (bout >= 0) art.text(c, phase === 'over' ? 'FINAL' : `BOUT ${bout + 1}/${BOUTS}`, 40, y, style({ size: 52, align: 'left' }));
		const mid = W / 2 - 40;
		if (phase === 'pull' || phase === 'drop' || phase === 'result') {
			// the rope meter: the ribbon between the two lines
			const half = 330;
			art.roundRect(c, mid - half - 30, y - 30, 2 * half + 60, 60, 30, { fill: 'rgba(0,0,0,0.5)' });
			art.rect(c, mid - half, y - 4, 2 * half, 8, { fill: '#c9a46a' });
			for (const t of [0, 1]) {
				const x = mid + (t ? half : -half);
				art.rect(c, x - 5, y - 26, 10, 52, { fill: TEAM_COLOURS[t] });
			}
			art.rect(c, mid - 2, y - 18, 4, 36, { fill: 'rgba(255,255,255,0.5)' });
			const rx = mid + Math.max(-1, Math.min(1, ropeShown / MARK)) * half;
			art.poly(c, [[rx, y - 6], [rx - 16, y + 26], [rx + 16, y + 26]], { fill: '#e0283c', stroke: 'white', lineWidth: 3 });
			art.circle(c, rx, y, 13, { fill: '#e0283c', stroke: 'white', lineWidth: 4 });
			if (phase === 'pull' && phaseT >= SUDDEN + LEAD) art.text(c, 'DOUBLE PULL', mid, y + 46, style({ size: 26, fill: '#ff5a6e', outlineWidth: 4 }));
		} else if (phase === 'pick') {
			art.text(c, `CHOOSE A SIDE  ${Math.ceil(phaseDur - phaseT)}`, mid, y, style({ size: 62 }));
		} else if (phase === 'ready') {
			art.text(c, 'GET READY', mid, y, style({ size: 62 }));
		} else if (phase === 'over') {
			art.text(c, 'GAME OVER', mid, y, style({ size: 66, fill: '#ff7eb6' }));
		} else {
			art.text(c, 'TUG OF WAR', mid, y, style({ size: 72, fill: '#ff7eb6' }));
		}
	}

	// Choosing sides: the room's middle line, and which side is which.
	function pickOverlay(ctx) {
		const x = W * 1.5;
		art.line(ctx, [[x, TOP + 20], [x, H - 20]], { stroke: 'rgba(255,255,255,0.75)', lineWidth: 8, dash: [30, 22] });
		for (const t of [0, 1]) {
			const tx = x + (t ? 1 : -1) * W / 4;
			const n = contestants.filter((o) => o.px < 0.5 === (t === 0)).length;
			art.text(ctx, TEAM_NAMES[t], tx, TOP + 110, style({ size: 96, fill: TEAM_COLOURS[t] }));
			art.text(ctx, `${n}`, tx, TOP + 210, style({ size: 70, alpha: 0.9 }));
			// the side walls say it too
			art.text(ctx, t ? 'STAND ON THE RIGHT' : 'STAND ON THE LEFT', (t ? 2.5 : 0.5) * W, TOP + 150, style({ size: 64, fill: TEAM_COLOURS[t] }));
		}
	}

	// Teammates bunched together on the rope: a glowing band between them.
	function bunchGlow(ctx) {
		for (const t of [0, 1]) {
			for (const [a, b] of links[t]) {
				const p = project(frontCam, 1, a.x, ROPE_Y + 0.05, 0);
				const q = project(frontCam, 1, b.x, ROPE_Y + 0.05, 0);
				const pulse = 0.6 + 0.4 * Math.sin(clock * 6);
				art.line(ctx, [[p.x, p.y], [q.x, q.y]], { stroke: TEAM_COLOURS[t], lineWidth: 26, alpha: 0.35 * pulse, shadow: { color: TEAM_COLOURS[t], blur: 30 } });
				art.line(ctx, [[p.x, p.y], [q.x, q.y]], { stroke: '#ffffff', lineWidth: 6, alpha: 0.8 });
			}
			const team = contestants.filter((c) => c.team === t && !c.bot);
			if (team.length < 2) continue;
			const at = project(frontCam, 1, (t ? 1 : -1) * (GAP + 2.4), -0.7, DEPTH / 2);
			if (bunch[t] > 1.01) art.text(ctx, `TOGETHER ×${bunch[t].toFixed(1)}`, at.x, at.y, style({ size: 44, fill: TEAM_COLOURS[t] }));
			else art.text(ctx, 'STICK TOGETHER', at.x, at.y, style({ size: 40, fill: 'white', alpha: 0.6 + 0.4 * Math.sin(clock * 5) }));
		}
	}

	// On each team's wall: the drum, a ring closing in on it for the next
	// beat, and the arrow toward the back of the room.
	function beatMarker(ctx, t) {
		const x0 = t ? 2 * W : 0;
		const cx = x0 + W / 2;
		const cy = TOP + 190;
		const colour = TEAM_COLOURS[t];
		const b = beatInfo();
		const stepIn = phase === 'pull' && isStepIn(b.next);
		const lean = phase === 'pull' && (b.next === leanAt || (b.inWindow && b.i === leanAt));
		const R = lean ? 110 : 90;
		// the ring closing in
		if (phase === 'pull' && !stepIn) {
			const f = Math.min(1, b.toNext / BEAT);
			art.circle(ctx, cx, cy, R + f * 170, { stroke: colour, lineWidth: 10, alpha: 0.25 + 0.75 * (1 - f) });
		}
		const on = b.inWindow;
		art.circle(ctx, cx, cy, R, { fill: on ? colour : 'rgba(10,10,16,0.75)', stroke: lean ? '#e5287a' : colour, lineWidth: 10 });
		art.text(ctx, lean ? 'LEAN\nBACK!' : stepIn ? 'STEP\nIN' : 'PULL', cx, cy + 4, style({ size: lean ? 44 : 50, fill: on ? '#141218' : 'white', outline: on ? null : '#0b0a10', lineHeight: 46 }));
		// the arrow: back is left on the left wall, right on the right wall
		const back = t ? 1 : -1;
		const dir = stepIn ? -back : back;
		const ax = cx + back * 330;
		const lit = on || stepIn;
		art.with(ctx, { x: ax, y: cy, scaleX: dir, alpha: lit ? 1 : 0.35 }, function (g) {
			art.poly(g, [[-110, -34], [30, -34], [30, -80], [120, 0], [30, 80], [30, 34], [-110, 34]], { fill: lit ? (stepIn ? 'white' : colour) : 'rgba(255,255,255,0.4)', stroke: '#0b0a10', lineWidth: 8 });
		});
		art.text(ctx, stepIn ? 'STEP IN' : 'STEP BACK', ax, cy + 120, style({ size: 46, alpha: lit ? 1 : 0.5 }));
	}

	function pad(ctx, p) {
		const colour = TEAM_COLOURS[p.team];
		const left = 1 - p.age / PAD_LIFE;
		const s = Math.min(1, p.age * 5) * (1 + 0.06 * Math.sin(clock * 10));
		art.with(ctx, { x: p.x, y: p.y, scale: s }, function (g) {
			art.circle(g, 0, 0, PAD_R + 22, { fill: 'rgba(0,0,0,0.5)' });
			g.save();
			g.beginPath();
			g.arc(0, 0, PAD_R + 14, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
			g.strokeStyle = 'white';
			g.lineWidth = 12;
			g.stroke();
			g.restore();
			art.circle(g, 0, 0, PAD_R, { fill: art.radial(g, -30, -30, 10, PAD_R, ['#ffffff', colour]), stroke: '#0b0a10', lineWidth: 6 });
			art.text(g, 'RALLY', 0, -8, style({ size: 52, fill: '#141218', outline: null }));
			art.text(g, 'TAP!', 0, 40, style({ size: 34, fill: '#141218', outline: null }));
		});
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(dt);
		sound.tick();
		render();
		overlay(ctx);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		humans().forEach(function (c) {
			if (!p[c.n]) return;
			c.px = Math.max(0, Math.min(1, p[c.n].px));
			c.pz = Math.max(0, Math.min(1, p[c.n].pz === undefined ? 0.5 : 1 - p[c.n].pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		const b = beatInfo();
		return {
			phase, bout, rope, winner, leanAt, history,
			time: phaseT,
			beat: { i: b.i, next: b.next, toNext: b.toNext, inWindow: b.inWindow, stepIn: isStepIn(b.next), resolved: lastResolved },
			bunch: bunch.slice(), bonus: bonus.slice(), surge: surge.slice(), force: force.slice(), totals: totals.slice(),
			pads: pads.map((p) => ({ team: p.team, x: p.x, y: p.y })),
			contestants: contestants.map((c) => ({ n: c.n, bot: c.bot, team: c.team, px: c.px, pz: c.pz, contrib: c.contrib, score: c.score, fallen: !!c.fall })),
			scores: humans().map((c) => c.score),
		};
	};

	self.fini = function () {
		sound.close();
		unlisten();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(function (count) {
		initGame(count);
		stage.timeout(() => hud.$el.remove(), 1500);   // the squad picker is the only HUD
	});
});
