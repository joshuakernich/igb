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
 * Scoring: a point for every red light survived in a safe zone, ten for
 * crossing the line. Anyone shot is back for the next round.
 *
 * The show, in order (see the beats at the bottom, and shared/showtime.js
 * for the generic ones): the squad picker over the dimmed field; the
 * ten-minute clock slamming in; the controls, one at a time, with the
 * camera in close on the contestants and no doll yet (a practice zone each,
 * a practice red light with no shooting, a practice corner skip and back);
 * the doll, the camera tight on her face, YOUNG-HEE, her head turning away
 * and the camera pulling back down the field; GREEN LIGHT and the rounds;
 * TIME!; everyone's scores; the ranking onto a podium; the team total; the
 * day's leaderboard; and a fast-forward replay of where everyone ran.
 *
 * Safe zones: every green light a fresh set of glowing circles is painted
 * on the sand, exactly one per contestant still running, and each holds
 * only the first to step in. Anyone not in a zone of their own at RED
 * LIGHT is shot, so everyone has to dash to one. Some zones sit at the
 * corner end of a wall, marked with arrows: whoever survives in one skips
 * across the corner onto the next wall at the next green light, and plays
 * on there. Every contestant lives on a wall (left, front or right) and
 * plays along it 1:1, its depth the player's distance from that wall.
 *
 * The field runs on across all three walls: blocks, patrolling guards and
 * rolling marbles on every wall, armed guards at the far ends.
 *
 * Drawn in 2.5D, like Gwi-Ma Showdown: the game is played on a flat plane,
 * x across all three walls (0..4800), f up the field toward the doll. The
 * plane tilts away in perspective in depth only; across stays 1:1, so each
 * contestant stands on the front wall exactly where their player stands in
 * the room. A small inset at the top of the front wall shows the doll's
 * head while she's too far up the field to see.
 *
 * Input: px (left / right), pz (forward / back). On the front wall px is
 * the position along it and pz how near it the player stands (1 right up
 * at the wall steps a few metres up the field); on the left wall pz is
 * along it and 1 - px how near; on the right wall 1 - pz along, px near.
 * On the desk simulator, clicking a wall of the box skips the selected
 * player's contestant onto that wall straight away (a testing control:
 * it skips the zone rules for that red light).
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
	const DEPTH = 500;          // and right up at the front wall, this much further
	const MOVE_LIMIT = 0.07;    // how far a player may drift on red light, as a share of the wall, before they're out
	const GRACE = 0.2;          // seconds after RED LIGHT before movement counts (tracking lag)
	const TURN_AWAY = 0.8;      // seconds her head takes to turn away after a red light, before GREEN LIGHT
	const BODY = 30;            // a contestant's radius on the plane
	const LANE = 30;            // contestants keep this far inside their wall's ends
	const WALL_ORDER = [1, 0, 2];             // hazards are shared out front, left, right, front...
	const BLOCK = 116;                        // a square block, side to side: scattered in short runs
	const SENTRY_END = 260;                   // the side walls' far ends belong to the armed guards

	// Where a guard or marble on a wall may roam: that wall only, so nothing
	// ever crosses a seam.
	function patrolOn(wall, margin = 50) {
		const lo = wall * W + (wall === 0 ? SENTRY_END : margin);
		const hi = (wall + 1) * W - (wall === 2 ? SENTRY_END : margin);
		return [lo, hi];
	}
	const START_F = 45;         // the white start line
	const FINISH_GAP = DEPTH * 0.5 + 250;   // from the red finish line to the doll's feet (beyond anyone's reach)
	const DOLL_X = 1.5 * W;
	const INSET = { x: 2 * W - 150, y: 125, r: 92 };   // the doll-head inset, top right of the front wall

	// Safe zones
	const ZONE_RX = 105;        // a zone's half-width across, world px
	const ZONE_RF = 42;         // and half-depth up the field, field units
	const ZONE_GAP = 220;       // zones on a wall at least this far apart (depth counts double)
	const ZONE_CLEAR = 330;     // try to put zones at least this far from where anyone stands
	const ZONE_SPREAD = 600;    // and as far as this from each other, across the walls too (the stronger pull)
	const EDGE_AT = 0.1;        // an edge zone's centre, as a share of the wall from the corner
	const EDGE_SHARE = [0.3, 0.5];   // the share of each green light's zones that are edge zones
	const EDGE_STACK = 2;       // edge zones at one corner at most (stacked up the field)
	const HOP = 0.5;            // seconds to skip across a corner onto the next wall
	const WALL_NAMES = ['LEFT', 'FRONT', 'RIGHT'];

	// Each green light: the track scrolls a leg at a moderate pace (dodge the
	// walls coming at you), stops, the zones appear, and there's just long
	// enough to race to one before her head comes round. Each round is a
	// little longer, quicker, with less warning and more danger.
	function settingsFor(r) {
		const loops = Math.min(9, 3 + r);                 // green lights it should take
		const speed = Math.min(2.5, 1.6 + 0.12 * r);      // metres per second while the track scrolls
		const leg = [9, 13];                              // metres scrolled each green light
		return {
			loops,
			speed: speed * M,                              // field units per second
			leg: leg.map((m) => m * M),
			dash: Math.max(2.6, 4.5 - 0.25 * r),           // seconds to race to a zone once it stops
			warning: Math.max(0.45, 1.5 - 0.15 * r),       // seconds her head takes to turn round
			red: [2.5, 4.5],                               // seconds she watches
			length: loops * (leg[0] + leg[1]) / 2 * M,
			blockDensity: 0.6 + 0.15 * r,                  // blocks per 9 m of field
			guards: Math.min(4, r),                        // patrolling guards (deadly), from round 2
			guardSpeed: (1.1 + 0.2 * r) * M,
			marbles: Math.max(0, Math.min(4, r - 1)),      // rolling marbles (deadly), from round 3
			marbleSpeed: (2.6 + 0.4 * r) * M,
			music: 3 + 0.35 * r,                           // notes per second of her song
		};
	}

	const POINTS = { hold: 1, finish: 10 };   // a red light survived in a zone; crossing the line
	const ROUND_GAP = {
		look: 1.4,            // each round opens on the doll, facing the players: ROUND N...
		sweep: 2.0,           // ...then the view scrolls back down the field to the start
		cleared: 3.2,         // the banner after a round
		quick: 2.6,           // ...or, when nobody made it, before the same round starts again
	};

	/* ---------- tuning: the controls intro ---------- */

	const CONTROLS = {
		steps: [
			{ id: 'move', caption: 'MOVE LEFT AND RIGHT', min: 2.5, max: 5 },
			{ id: 'step', caption: 'STEP FORWARD AND BACK', min: 2.5, max: 5 },
			{ id: 'zone', caption: 'REACH A WHITE CIRCLE', min: 2.5, max: 9 },
			{ id: 'freeze', caption: 'FREEZE ON RED', min: 5.6, max: 6.5 },
			{ id: 'corner', caption: 'CORNER CIRCLES SWITCH YOUR WALL', min: 3, max: 18 },
		],
		nice: 1.1,            // the NICE! once a step is done, before the next
		zoom: [1.35, 2.3],    // how close the camera comes in on the contestants
		fit: 2300,            // zoom = fit / (their spread + pad)
		pad: 450,
		moved: 0.35,          // how far along their wall (per contestant) counts as moving
		stepped: 0.3,         // and how far toward and away from it
		red: [1.5, 5.0],      // the practice red light: on, then off (no shooting)
		hopAfter: 0.4,        // seconds in a corner circle before the skip
		perCorner: 2,         // practice corner circles at one corner at once
	};

	/* ---------- tuning: the doll's entrance ---------- */

	const ENTRANCE = {
		zoom: 3.4,            // the camera starts this tight on her face
		shapes: 0.5,          // ○ △ □ slam in, one after another
		eyes: 1.3,            // her ring eyes light up red
		name: 1.7,            // YOUNG-HEE slams in
		turn: 3.8,            // her head turns away
		turnFor: 1.3,
		pull: 5.0,            // the camera pulls back from her face
		pullFor: 1.1,
		fly: [5.5, 8.5],      // then flies back down the field to the contestants
		go: 8.4,              // GREEN LIGHT!
		length: 9.8,
	};

	/* ---------- the view ---------- */

	// The plane, flat on the wall with no perspective: one field unit is one
	// unit up the wall, everything drawn at one size (SCALE). The field runs on
	// up past the top of the walls; the doll and the obstacles further up the
	// field are simply off the top until the field scrolls them down into view.
	// `cam` is the field distance at the bottom of the walls, and scrolls up.
	const SCALE = 0.75;         // the size of everything on the field
	const INK = '#1a1a1a';     // for drop shadows on words

	let cam = 0;

	function project(x, y, up = 0) {
		return { x, y: y - up * SCALE, s: SCALE };
	}
	const planeY = (f) => H - (f - cam);
	const at = (x, f, up = 0) => project(x, planeY(f), up);
	// On the walls, or near enough to reach onto them (tall things standing
	// just below the bottom edge, or above the top).
	const fadeIn = () => 1;
	const onView = (f) => planeY(f) < H + 320 && planeY(f) > -500;

	/* ---------- the field ---------- */

	let settings = settingsFor(0);
	let finishF = 0;
	let dollF = 0;
	let camEnd = 0;
	let blocks = [];         // { x, f, r, h, shape, colour }
	let movers = [];         // patrolling guards and rolling marbles
	let sentries = [];       // armed guards along the sides: { x, f, mask, flash }
	let splats = [];         // { x, f, t, seed }
	const SHAPES = ['circle', 'triangle', 'square'];
	const SHAPE_COLOURS = ['#f05a8d', '#23a39a', '#f2b134', '#8f6fd8'];
	const MARBLE_COLOURS = ['#ff4f6d', '#2bb3a6', '#f6b02c', '#6e57d6'];

	let noBlocks = false;   // (tests only)
	function buildField(r) {
		settings = settingsFor(r);
		finishF = 300 + settings.length;
		dollF = finishF + FINISH_GAP;
		camEnd = finishF - BACK - DEPTH * 0.45;   // the last stop: the finish line part way up the play area
		blocks = [];
		movers = [];
		sentries = [];
		splats = [];

		// Square blocks scattered in loose bands across every wall: on each wall,
		// a few short runs of one to three blocks at odd places along it, each
		// run nudged up or down the field, so you weave rather than queue for a
		// gap. The bands stay apart, leaving lanes for the guards and marbles.
		const rows = Math.max(1, Math.round(settings.length / M / 12 * settings.blockDensity * 1.4));
		const first = 650;
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
					for (let j = j0; j < j0 + len; j++) {
						taken[j] = true;
						blocks.push({ x: x0 + j * BLOCK, f: runF, r: BLOCK / 2, h: 84, shape: 'square', colour, gapRow: i });
					}
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
			zone: null,          // the safe zone they hold
			swapTo: null,        // the wall they'll skip onto at the next green light
			hop: null,           // { t, x0, f0 } while skipping across a corner
			lift: 0,             // how high off the sand they are, mid-skip
			pass: false,         // moved walls from the desk: let off the zone check until the next green light
			drill: 0,            // corner skips made in the controls intro
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
	const xOf = (c) => c.wall * W + Math.max(LANE, Math.min(W - LANE, alongOf(c.wall, c.px, c.pz) * W));
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
		c.zone = null;
		c.swapTo = null;
		c.hop = null;
		c.lift = 0;
		c.pass = false;
		c.warned = false;
		c.x = c.lastX = xOf(c);
		c.f = c.lastF = BACK + c.pz * DEPTH;
	}

	/* ---------- the game's state ---------- */

	const sound = createSound();
	sound.musicShift = -12;   // her song, an octave down

	let round = -1;
	let phase = 'waiting';   // waiting, drill, drill-red, ready, green, warning, red, cleared, over
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

	const SAND = '#e3c08a';
	const PINK = '#ff3d8b';
	const TEAL = '#1fa58a';
	const show = new Showtime(stage, {
		id: 'red-light-green-light',
		seconds: GAME_SECONDS,
		players: () => contestants.length,
		scores: () => contestants.map((c) => c.score),
		drawAvatar: (ctx, n, x, y, scale, pose) => art.with(ctx, { x, y, scale: scale * 0.88 }, (c) => contestantFront(c, n, pose)),
		theme: {
			accent: PINK, accent2: TEAL, gold: '#ffd23f', ink: '#2a1020',
			sky: ['#f1d9ab', '#c99560'], panel: 'rgba(42,16,32,0.84)', floor: 'rgba(90,50,24,0.45)', glow: 'rgba(255,61,139,0.3)',
		},
		backdrop: drawShapes,
		rivals: ['Dalgona Crew', 'Marble Masters', 'The Frozen Few', 'Statue Squad', 'Ddakji Slappers', 'Last Ones Moving',
			'Tracksuit Titans', 'Sandy Sprinters', 'Still Standing', 'Circle Triangle Square', 'The Green Line', 'No Wobble Club'],
		sounds: { tutorial: ['assets/shared/music-tutorial.mp3', 0.2, true] },
	});

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
		zones.length = 0;
		head.t = head.dur = 0;
		glare = 0;
		showInset = true;
		sound.music(false);
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
			// those who held an edge zone skip across the corner
			if (c.alive && !c.safe && c.swapTo !== null) {
				c.hop = { t: 0, x0: c.x, f0: c.f };
				c.wall = c.swapTo;
				c.swapTo = null;
			}
			c.zone = null;
		}
		sound.music(true, settings.music);
		zones.length = 0;
		scrollTo = Math.min(camEnd, cam + rand(settings.leg));
		if (camEnd - scrollTo < settings.leg[0] * 0.5) scrollTo = camEnd;   // no stub of a last leg
		setPhase('green', Infinity);
	}

	// The track stops: the zones appear (or, on the last leg, the line is in
	// reach), and there's just long enough to race there.
	let scrollTo = 0;
	let finalDash = false;
	function startDash() {
		cam = scrollTo;
		finalDash = cam >= camEnd - 1;
		setPhase('dash', settings.dash);
		layZones();
		say(finalDash ? 'Run for the line!' : 'Get to a safe zone!', '#ffd23f');
		show.fx('go');
	}

	// Her head is coming round...
	function warn() {
		sound.music(false);
		turnHead(0, settings.warning);
		setPhase('warning', settings.warning);
	}

	// ...RED LIGHT: everyone's feet stick where they are.
	function redLight() {
		say('Red light', '#ff3640', 'FREEZE');
		glare = 1;
		freeze();
		zonesChecked = false;
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
		sound.music(false);
		zones.length = 0;
		const survivors = contestants.filter((c) => c.alive);
		callout = null;
		cleared = { round, made: survivors.length };
		if (survivors.length) {
			show.mark(t);
			show.fx('roundClear');
		} else {
			show.fx('roundFail');
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
		const p = at(c.x, c.f, 270);
		// stacked above any other fresh word close by, so they don't overlap
		let y = p.y;
		for (let k = 0; k < 4; k++) {
			const o = pops.find((o) => o.age < 0.8 && Math.abs(o.x - p.x) < 300 && Math.abs(o.y - o.age * 120 - y) < 64);
			if (!o) break;
			y = o.y - o.age * 120 - 68;
		}
		pops.push({ text, colour, x: p.x, y, age: 0 });
	}

	/* ---------- safe zones ---------- */

	// Painted circles on the sand, one per contestant still running, laid
	// fresh at every green light. A zone sits at a fixed spot in the band
	// the contestants play in, so it scrolls along with them; the first to
	// step in holds it. An edge zone sits at the corner end of its wall, and
	// whoever holds it through red light skips onto the wall round the corner.
	const zones = [];           // { id, wall, u, near, x, edge (wall it leads to, or null), owner, age }
	let zoneSerial = 0;
	let zonesChecked = false;   // this red light's zone check is done
	let zonePulse = 0;          // the zones' pulse, quickening as she's about to turn

	const zoneF = (z) => cam + BACK + z.near * DEPTH;
	const inZone = (c, z, k = 1) => Math.pow((c.x - z.x) / ZONE_RX, 2) + Math.pow((c.f - zoneF(z)) / ZONE_RF, 2) < k * k;

	function layZones() {
		zones.length = 0;
		const live = contestants.filter((c) => c.alive && !c.safe);
		// The last dash is for the line, not the zones.
		if (!live.length || finalDash) return;
		const endCam = cam;   // the track has stopped
		const counts = [0, 1, 2].map((w) => live.filter((c) => c.wall === w).length);

		// 30-50% of the zones are edge zones (at least one, with two or more
		// zones), so wall changes are forced every green light. They're
		// spread over the walls with players: the front wall has a corner at
		// each end, a side wall only the one where it meets the front.
		const n = live.length;
		const lo = Math.ceil(n * EDGE_SHARE[0] - 1e-9);
		const hi = Math.floor(n * EDGE_SHARE[1] + 1e-9);
		let want = n >= 2 ? Math.max(1, lo + Math.floor(Math.random() * (Math.max(lo, hi) - lo + 1))) : 0;
		const edgesOn = [[], [], []];                  // per wall, the walls its edge zones lead to
		const ends = (wall) => (wall === 1 ? [0, 2] : [1]);
		const room = (wall) => ends(wall).filter((to) => edgesOn[wall].filter((t) => t === to).length < EDGE_STACK);
		while (want > 0) {
			// a wall with players still short of edge zones, the emptiest of them first
			const open = [0, 1, 2].filter((w) => edgesOn[w].length < counts[w] && room(w).length);
			if (!open.length) break;
			const least = Math.min(...open.map((w) => edgesOn[w].length / counts[w]));
			const pick = open.filter((w) => edgesOn[w].length / counts[w] === least);
			const wall = pick[Math.floor(Math.random() * pick.length)];
			// from the front, toward the side wall with fewer players (and fewer already headed there)
			const heading = (to) => counts[to] + edgesOn[1].filter((t) => t === to).length + Math.random() * 0.5;
			const to = room(wall).sort((a, b) => heading(a) - heading(b))[0];
			edgesOn[wall].push(to);
			want--;
		}

		for (let wall = 0; wall < 3; wall++) {
			const k = counts[wall];
			if (!k) continue;
			const edges = edgesOn[wall];
			// where everyone on this wall stands (those mid-skip, where they'll land)
			const here = live.filter((c) => c.wall === wall).map((c) => ({ x: xOf(c), near: nearOf(wall, c.px, c.pz) }));
			for (let i = 0; i < k; i++) zones.push(placeZone(wall, i < edges.length ? edges[i] : null, endCam, here));
		}
	}

	// The best of many tries at a zone on a wall (an edge zone if `edge` is
	// the wall it leads to): apart from the other zones, clear of the blocks
	// where the view will be at endCam, and well away from where everyone
	// stands (`here`) so it takes a dash.
	function placeZone(wall, edge, endCam, here) {
		let best = null;
		let bestScore = -Infinity;
		for (let k = 0; k < 120; k++) {
			let u;
			if (edge !== null) {
				u = edge < wall ? EDGE_AT : 1 - EDGE_AT;      // the end that meets that wall
				u += (Math.random() - 0.5) * 0.03;
			} else {
				u = 0.14 + Math.random() * 0.72;
			}
			const near = 0.1 + Math.random() * 0.8;
			const x = wall * W + u * W;
			const fEnd = endCam + BACK + near * DEPTH;
			let score = 0;
			// well apart from the other zones
			for (const z of zones) if (z.wall === wall && Math.hypot(z.x - x, (z.near - near) * DEPTH * 2) < ZONE_GAP) score -= 2000;
			// clear of the blocks where she'll turn round, and the rows the hazards roam
			for (const b of blocks) if (Math.abs(b.x - x) < b.r + ZONE_RX * 0.7 && Math.abs(b.f - fEnd) < b.r + ZONE_RF + BODY) score -= 1500;
			for (const m of movers) if (Math.floor(x / W) === 1 && Math.abs(m.f - fEnd) < m.r + ZONE_RF + BODY) score -= 400;
			// and well away from where everyone stands now: a dash, across and in depth
			let clear = Infinity;
			for (const h of here) clear = Math.min(clear, Math.hypot(h.x - x, (h.near - near) * DEPTH * 0.8));
			score += Math.min(clear, ZONE_CLEAR) + Math.random() * 40;
			// spread out: as far as can be from every zone laid so far, whatever its wall
			let apart = Infinity;
			for (const z of zones) apart = Math.min(apart, Math.hypot(z.x - x, (z.near - near) * DEPTH));
			score += Math.min(apart, ZONE_SPREAD) * 1.5;
			if (score > bestScore) {
				bestScore = score;
				best = { id: ++zoneSerial, wall, u, near, x, edge, owner: null, age: 0 };
			}
		}
		return best;
	}

	// The first to step into a free zone on their wall holds it, until they
	// step (well) out of it again. (A practice zone is kept for one player.)
	function claimZone(c) {
		if (c.zone && !inZone(c, c.zone, 1.15)) {
			c.zone.owner = null;
			c.zone = null;
		}
		if (c.zone) return;
		for (const z of zones) {
			if (!z.owner && z.wall === c.wall && (z.for === undefined || z.for === c.n) && inZone(c, z)) {
				z.owner = c;
				z.claimed = 0;
				c.zone = z;
				sound.ding();
				return;
			}
		}
	}

	// Just after RED LIGHT: anyone not in a zone of their own is out (and
	// anyone in one scores). Those holding an edge zone are marked to skip
	// walls at the next green light.
	function checkZones() {
		zonesChecked = true;
		if (finalDash) {
			for (const c of contestants) if (c.alive && !c.safe && !c.pass) eliminate(c, 'zone');
			return;
		}
		if (!zones.length) return;
		for (const c of contestants) {
			if (!c.alive || c.safe || c.pass) continue;
			const z = c.zone;
			if (z && z.owner === c && inZone(c, z, 1.15)) {
				if (z.edge !== null) c.swapTo = z.edge;
				c.score += POINTS.hold;
				popOver(c, '+' + POINTS.hold, PLAYER_COLORS[c.n]);
			} else {
				eliminate(c, 'zone');
			}
		}
	}

	function ageZones(dt) {
		// quicker and quicker as green light runs out; frantic as she turns
		const rate = phase === 'dash' ? 4 + 10 * Math.min(1, phaseT / Math.max(phaseDur, 0.1)) : phase === 'warning' ? 18 : phase === 'drill' ? 5 : 2.5;
		zonePulse += dt * rate;
		for (const z of zones) {
			z.age += dt;
			if (z.owner) {
				z.claimed += dt;
				if (!z.owner.alive || z.owner.safe) { z.owner.zone = null; z.owner = null; }
			}
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
		for (const g of sentries) {
			if (planeY(g.f) < 0 || planeY(g.f) > H + 40) continue;   // (only guards on the walls)
			const d = Math.abs(g.x - c.x) + Math.abs(g.f - c.f) * 2 + (Math.floor(g.x / W) === c.wall ? 0 : 1200);   // one on their own wall if there is one
			if (d < best) { best = d; nearest = g; }
		}
		let from;
		if (nearest) {
			nearest.flash = 0.12;
			from = gunTip(nearest);
		} else {
			from = { x: c.x < DOLL_X ? 300 : WIDTH - 300, y: 300 };
		}
		const to = at(c.x, c.f, 75);
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
			if (cam >= scrollTo) startDash();
			break;

		case 'dash':
			if (phaseT >= phaseDur) warn();
			break;

		case 'warning':
			if (phaseT >= phaseDur) redLight();
			break;

		case 'red':
			blipAt -= dt;
			if (blipAt <= 0) { sound.blip(); blipAt = 0.45; }
			glare = 0.7 + 0.3 * Math.sin(phaseT * 12);
			if (!zonesChecked && phaseT > GRACE) checkZones();
			if (phaseT >= phaseDur) turnAway();
			break;

		case 'cleared':
			// nobody made it: the same round again; otherwise on to the next
			if (phaseT >= phaseDur) startRound(cleared && !cleared.made ? round : round + 1);
			break;
		}
	}

	// Everything else that moves, in every beat: her head, the hazards, the
	// zones, the contestants, the shots.
	function stepWorld(dt) {
		clock += dt;
		for (const c of contestants) if (c.shotAt !== undefined && clock >= c.shotAt) shoot(c);

		// the doll's head
		if (head.t < head.dur) {
			head.t = Math.min(head.dur, head.t + dt);
			head.yaw = head.from + (head.to - head.from) * ease(head.t / head.dur);
		}

		agePops(dt);
		ageZones(dt);

		const running = phase === 'green' || phase === 'dash' || phase === 'warning';
		for (const m of movers) {
			if (!running) continue;
			m.x += m.dir * m.speed * dt;
			if (m.x > m.hi) { m.x = m.hi; m.dir = -1; }
			if (m.x < m.lo) { m.x = m.lo; m.dir = 1; }
			// they turn back at a block
			for (const b of blocks) {
				const dx = m.x - b.x;
				if (Math.abs(m.f - b.f) < b.r + m.r && Math.abs(dx) < b.r + m.r && Math.sign(dx) === -m.dir) m.dir = -m.dir;
			}
			if (m.kind === 'guard') m.phase += m.speed * dt / 14;
			else m.spin += m.dir * m.speed * dt / m.r;
		}

		if (phase === 'waiting') {
			// Standing at the start, following their players.
			for (const c of contestants) {
				c.x = xOf(c);
				c.f = BACK + nearOf(c.wall, c.px, c.pz) * DEPTH;
			}
			separate();
		} else if (phase !== 'over') {
			for (const c of contestants) updateContestant(c, dt);
			separate();
		}
		for (const c of contestants) animate(c, dt);

		for (const g of sentries) g.flash = Math.max(0, g.flash - dt);
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
			c.x = xOf(c);
			c.f = bandF(c);
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
			if ((phase === 'red' || phase === 'drill-red') && phaseT > GRACE) {
				if (Math.hypot(dx, dz) > MOVE_LIMIT) {
					c.over += dt;
					if (c.over > 0.08 && phase === 'red') eliminate(c, 'moved');
					// in practice, only a warning: this is what gets you shot
					if (c.over > 0.08 && phase === 'drill-red' && !c.warned) {
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
			c.x = c.hop.x0 + (xOf(c) - c.hop.x0) * e;
			c.f = c.hop.f0 + (bandF(c) - c.hop.f0) * e;
			c.lift = Math.sin(k * Math.PI) * 150;
			if (k >= 1) { c.hop = null; c.lift = 0; }
			return;
		}

		// Follow the player: across always matches them exactly, depth eases
		// (so blocks can hold you back).
		c.x = xOf(c);
		const step = 1500 * dt;   // (a whole room's depth in a second: following the player, not racing them)
		c.f += Math.max(-step, Math.min(step, bandF(c) - c.f));

		// Blocks hold contestants back (or, if they're past, push them on):
		// strafe round them.
		for (const b of blocks) {
			const dx = c.x - b.x;
			const min = b.r + BODY;
			if (Math.abs(dx) >= min) continue;
			const reach = Math.sqrt(min * min - dx * dx) * 0.7;
			if (Math.abs(c.f - b.f) < reach) c.f = c.f < b.f ? b.f - reach : b.f + reach;
		}

		// Guards and marbles are deadly.
		for (const m of movers) {
			if (Math.abs(c.x - m.x) < m.r + BODY && Math.abs(c.f - m.f) < (m.r + BODY) * 0.7) {
				eliminate(c, 'hit');
				return;
			}
		}

		// Held back so far you've dropped out of the bottom of the field.
		if (!c.safe && c.f < cam + BACK - 85) {
			eliminate(c, 'behind');
			return;
		}

		if (phase === 'dash' || phase === 'warning' || phase === 'drill') claimZone(c);

		if (!c.safe && c.f > finishF + 12) {
			c.safe = true;
			c.zone = null;
			c.score += POINTS.finish;
			sound.ding();
			popOver(c, '+' + POINTS.finish, PLAYER_COLORS[c.n]);
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
				if (Math.abs(a.x - b.x) >= BODY * 2) continue;
				const df = b.f - a.f;
				const min = BODY * 1.4;
				if (Math.abs(df) < min) {
					const push = (min - Math.abs(df)) / 2 * (df >= 0 ? 1 : -1);
					a.f -= push;
					b.f += push;
				}
			}
		}
	}

	function animate(c, dt) {
		if (c.fall) {
			c.fall.t += dt;
			if (!c.fall.splat && c.fall.t > 0.25) {
				c.fall.splat = true;
				splats.push({ x: c.x + c.fall.dir * 95, f: c.f + 6, t: 0, seed: Math.random() * 100 });
			}
			return;
		}
		const speed = Math.hypot(c.x - c.lastX, c.f - c.lastF) / Math.max(dt, 1e-3);
		c.lastX = c.x;
		c.lastF = c.f;
		if (c.glue) return;
		c.moving += (Math.min(1, speed / 60) - c.moving) * Math.min(1, dt * 8);
		c.walk += dt * 11 * c.moving;
	}

	/* ---------- drawing ---------- */

	// The world, drawn through the show's camera.
	function drawWorld(ctx) {
		ctx.save();
		if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 16, (Math.random() - 0.5) * shake * 10);

		drawArena(ctx);

		// Lying flat on the sand: rake marks, the lines, blood.
		const lineAt = function (f, colour, half) {
			if (!onView(f)) return;
			const a = at(0, f + half);
			const b = at(0, f - half);
			art.rect(ctx, -20, a.y, WIDTH + 40, b.y - a.y, { fill: colour, alpha: fadeIn(f) });
		};
		lineAt(START_F, '#f6f1e6', 7);
		lineAt(finishF, '#d7262e', 10);
		for (const s of splats) drawSplat(ctx, s);
		if (contestants.length) drawPlayArea(ctx);
		for (const z of zones) drawZone(ctx, z);

		// Everything standing on the plane, far to near.
		const things = [];
		const add = (f, fn) => { if (onView(f)) things.push({ f, fn }); };
		if (dollShown) {
			add(dollF + 140, (c) => drawTree(c));
			add(dollF, (c) => drawDoll(c));
		}
		for (const b of blocks) add(b.f - b.r * 0.6, (c) => drawBlock(c, b));
		for (const m of movers) add(m.f, (c) => (m.kind === 'guard' ? drawGuardOn(c, m.x, m.f, m.mask, false, m.phase, 0) : drawMarble(c, m)));
		for (const g of sentries) if (dollShown || !g.doll) add(g.f, (c) => drawGuardOn(c, g.x, g.f, g.mask, true, 0, g.flash));
		for (const c of contestants) add(c.f, (cx) => drawContestant(cx, c));
		things.sort((a, b) => b.f - a.f);
		for (const thing of things) thing.fn(ctx);
		for (const c of contestants) if (c.alive && footApart(c) && onView(footOf(c).f)) drawFoot(ctx, c);

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
			if (planeY(dollF) < 250) drawInset(ctx, INSET.x);   // while she's off the top (or only just on)
			drawInset(ctx, INSET.r + 60);                         // and always on the side walls, where she can't be seen
			drawInset(ctx, WIDTH - INSET.r - 60);
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
			const p = at(c.x, c.f);
			const s = p.s * 1.6;
			if (step.id === 'move') {
				for (const side of [-1, 1]) {
					const x = c.x + side * (75 + 14 * pulse) * s;
					const y = p.y - 60 * s;
					art.poly(ctx, [[x, y - 20 * s], [x + side * 26 * s, y], [x, y + 20 * s]], { fill: colour, alpha: 0.95 });
				}
			}
			if (step.id === 'step') {
				for (let i = 0; i < 3; i++) {
					const y = p.y - 185 * s - i * 22 * s - pulse * 10 * s;
					const w = 20 * s;
					art.poly(ctx, [[c.x - w, y + 12 * s], [c.x, y - 6 * s], [c.x + w, y + 12 * s], [c.x + w, y + 20 * s], [c.x, y + 2 * s], [c.x - w, y + 20 * s]], { fill: colour, alpha: 1 - i * 0.28 });
				}
			}
		}
	}

	// The arena: sand all the way up the walls, a little darker far away.
	function drawArena(ctx) {
		art.rect(ctx, -20, -20, WIDTH + 40, H + 40, { fill: art.linear(ctx, 0, 0, 0, H, ['#c0945e', '#d3ad79', '#e6c592']) });
		// rake marks every couple of metres, so the scrolling shows: flat
		// bands across
		const gap = 110;
		for (let f = Math.ceil(cam / gap) * gap; f < cam + 6000; f += gap) {
			const p = at(0, f);
			if (p.y < -20) break;
			art.rect(ctx, -20, p.y - 2 * p.s, WIDTH + 40, 4 * p.s, { fill: 'rgba(120,80,40,0.12)' });
		}
		// a few pebbles, scrolling with the field
		for (let k = Math.floor(cam / 90); k < (cam + 3000) / 90; k++) {
			const f = k * 90;
			for (let j = 0; j < 4; j++) {
				const x = ((k * 7919 + j * 104729) % 4700) + 50;
				const p = at(x, f + j * 20);
				if (p.y > H + 10) continue;
				art.ellipse(ctx, p.x, p.y, 9 * p.s, 4 * p.s, { fill: 'rgba(110,75,40,0.25)' });
			}
		}
	}

	function drawSplat(ctx, s) {
		if (!onView(s.f)) return;
		const p = at(s.x, s.f);
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
	function drawBlock(ctx, b) {
		const alpha = fadeIn(b.f + b.r);
		const shade = (k) => mix(b.colour, k);
		const fr = at(0, b.f - b.r);       // its front edge
		const bk = at(0, b.f + b.r);       // its back edge
		const x0 = b.x - b.r;
		const x1 = b.x + b.r;
		const hf = b.h * fr.s;
		const hb = b.h * bk.s;
		art.save(ctx, function (c) {
			c.globalAlpha = alpha;
			art.ellipse(c, b.x + 10, fr.y + 2, b.r * 1.15 * fr.s + 8, 12 * fr.s, { fill: 'rgba(0,0,0,0.22)' });
			if (b.shape === 'square') {
				art.poly(c, [[x0, bk.y - hb], [x1, bk.y - hb], [x1, fr.y - hf], [x0, fr.y - hf]], { fill: shade(1.25) });
				art.poly(c, [[x0, fr.y - hf], [x1, fr.y - hf], [x1, fr.y], [x0, fr.y]], { fill: b.colour });
			} else if (b.shape === 'circle') {
				const cy = (fr.y + bk.y) / 2;
				const ry = (fr.y - bk.y) / 2;
				const h = (hf + hb) / 2;
				c.beginPath();
				c.ellipse(b.x, cy, b.r, ry, 0, 0, Math.PI);
				c.lineTo(x0, cy - h);
				c.ellipse(b.x, cy - h, b.r, ry, 0, Math.PI, 0, true);
				c.closePath();
				c.fillStyle = b.colour;
				c.fill();
				art.ellipse(c, b.x, cy - h, b.r, ry, { fill: shade(1.25) });
				art.rect(c, x0 + b.r * 0.25, cy - h * 0.85, b.r * 0.18, h * 0.75, { fill: 'rgba(255,255,255,0.22)' });
			} else {
				// a ridge running up the field, two slopes and the front gable
				const apexF = [b.x, fr.y - hf * 1.15];
				const apexB = [b.x, bk.y - hb * 1.15];
				art.poly(c, [[x0, fr.y], apexF, apexB, [x0, bk.y]], { fill: shade(1.2) });
				art.poly(c, [[x1, fr.y], apexF, apexB, [x1, bk.y]], { fill: shade(0.85) });
				art.poly(c, [[x0, fr.y], [x1, fr.y], apexF], { fill: b.colour });
			}
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
			art.ellipse(c, foot.x, foot.y, r * 1.05, r * 0.3, { fill: 'rgba(0,0,0,0.28)' });
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

	// A pink guard, facing the field: hood, black mask with a white shape,
	// black belt and boots. The armed ones line the walls with rifles.
	function drawGuardOn(ctx, x, f, mask, armed, walk, muzzle) {
		const p = at(x, f);
		const s = p.s * 1.45;
		art.with(ctx, { x: p.x, y: p.y, scale: s, alpha: fadeIn(f) }, function (c) {
			guard(c, mask, armed, walk, muzzle);
		});
	}

	function gunTip(g) {
		const p = at(g.x, g.f);
		const s = p.s * 1.45;
		return { x: p.x + 36 * s, y: p.y - 100 * s };
	}

	function guard(c, mask, armed, walk, muzzle) {
		const PINK = '#e5287a';
		const step = walk ? Math.sin(walk) * 5 : 0;
		art.ellipse(c, 0, 0, 28, 8, { fill: 'rgba(0,0,0,0.3)' });
		// legs and boots
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * step);
			art.roundRect(c, side * 9 - 7, -44 - lift, 14, 36, 4, { fill: '#cf2470' });
			art.roundRect(c, side * 9 - 8, -12 - lift, 16, 12, 4, { fill: INK });
		}
		// body, belt
		art.roundRect(c, -24, -94, 48, 56, [14, 14, 8, 8], { fill: PINK });
		art.rect(c, -24, -52, 48, 7, { fill: INK });
		// arms
		for (const side of [-1, 1]) art.roundRect(c, side * 26 - 6, -90, 12, 38, 6, { fill: '#c41f66' });
		// hood and mask
		art.circle(c, 0, -118, 26, { fill: '#f0458d' });
		art.ellipse(c, 0, -115, 18, 20, { fill: '#111' });
		const sym = { stroke: 'white', lineWidth: 3.5, lineJoin: 'round' };
		if (mask === 'circle') art.circle(c, 0, -115, 8, sym);
		else if (mask === 'triangle') art.poly(c, [[0, -125], [9, -108], [-9, -108]], sym);
		else art.rect(c, -7.5, -123, 15, 15, sym);
		if (armed) {
			// a rifle held across the body, muzzle up and out
			art.line(c, [[-24, -46], [36, -100]], { stroke: '#2b2b2b', lineWidth: 8, lineCap: 'round' });
			art.line(c, [[-28, -40], [-14, -56]], { stroke: '#5a4332', lineWidth: 11, lineCap: 'round' });
			art.circle(c, -14, -56, 6, { fill: '#f0458d' });
			art.circle(c, 14, -76, 6, { fill: '#f0458d' });
			if (muzzle > 0) {
				art.poly(c, star(36, -100, 22, 9, 8), { fill: '#ffe066' });
			}
		}
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
		const ground = at(c.x, c.f);
		const p = at(c.x, c.f, c.lift);      // off the sand, mid-skip
		const s = p.s * 1.6;
		const alpha = fadeIn(c.f);
		const air = 1 - c.lift / 300;        // the shadow shrinks under a skip
		if (c.alive && !footApart(c)) drawFoot(ctx, c);
		art.ellipse(ctx, ground.x, ground.y, 27 * s * air, 8 * s * air, { fill: 'rgba(0,0,0,0.35)', alpha });

		let rotate = 0;
		let scaleY = 1;
		if (c.fall) {
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

		if (!c.alive) return;
		// over their head: a marker in their colour, or where they're skipping to
		const bob = Math.sin(clock * 4 + c.n) * 4;
		const top = p.y - 175 * s + bob * s;
		if (c.swapTo !== null) {
			// off round the corner next green light: an arrow toward that wall, and its name
			const dir = Math.sign(c.swapTo - c.wall);
			const nudge = (0.5 + 0.5 * Math.sin(clock * 9)) * 14;
			art.with(ctx, { x: p.x + dir * (20 + nudge) * s, y: top - 22 * s, scale: s }, function (cx) {
				art.with(cx, { y: 4, scaleX: dir }, (c2) => art.poly(c2, swapArrow(), { fill: 'rgba(0,0,0,0.35)' }));
				art.with(cx, { scaleX: dir }, (c2) => art.poly(c2, swapArrow(), { fill: colour }));
				show.text(cx, WALL_NAMES[c.swapTo], -dir * 20, -46, 28, {});
			});
		} else {
			art.poly(ctx, [[p.x - 14 * s, top - 14 * s], [p.x + 14 * s, top - 14 * s], [p.x, top + 4 * s]], { fill: colour, alpha });
		}
	}

	// The coloured footprint is always where the player really is, even when
	// a block holds the avatar back or red light glues its feet: mid-skip it
	// rides along under the avatar. Parted from the avatar, it's drawn over
	// everything so a block can't hide it.
	function footOf(c) {
		return c.hop ? { x: c.x, f: c.f, air: 1 - c.lift / 300 } : { x: xOf(c), f: bandF(c), air: 1 };
	}
	function footApart(c) {
		const foot = footOf(c);
		return Math.abs(foot.x - c.x) > 40 || Math.abs(foot.f - c.f) > 40;   // (a nudge from a neighbour keeps it underfoot)
	}
	function drawFoot(ctx, c) {
		const foot = footOf(c);
		const g = at(foot.x, foot.f);
		const s = g.s * 1.6 * foot.air;
		art.ellipse(ctx, g.x, g.y, 40 * s, 13 * s, { fill: PLAYER_COLORS[c.n], alpha: fadeIn(foot.f) * 0.9 });
	}

	// A fat arrow pointing right, its tail at the origin's left.
	function swapArrow() {
		return [[-44, -9], [4, -9], [4, -24], [36, 0], [4, 24], [4, 9], [-44, 9]];
	}

	// A safe zone: a glowing white ring painted on the sand, flat on the
	// plane. Free ones pulse (faster as she's about to turn); a held one
	// stays white and steady, with a band of its holder's colour inside. An
	// edge zone has chevrons pointing round the corner to the wall it leads to.
	// Where the contestants can go: on every wall, right across it, from the
	// near edge of play to as far up the field as stepping toward the wall
	// takes them. A pale strip of sand, edged front and back, moving with the field.
	function drawPlayArea(ctx) {
		const near = at(0, cam + BACK);
		const far = at(0, cam + BACK + DEPTH);
		const pulse = 0.85 + 0.15 * Math.sin(clock * 2);
		for (let w = 0; w < 3; w++) {
			const x0 = w * W + LANE;
			const x1 = (w + 1) * W - LANE;
			art.rect(ctx, x0, far.y, x1 - x0, near.y - far.y, { fill: 'rgba(255,248,228,0.22)', alpha: pulse });
			for (const [p, k] of [[near, 1], [far, 0.7]]) {
				for (let x = x0; x < x1; x += 60) art.rect(ctx, x, p.y - 2, 34, 4, { fill: 'rgba(255,255,255,0.75)', alpha: k * pulse });
			}
		}
	}

	function drawZone(ctx, z) {
		const f = zoneF(z);
		if (!onView(f)) return;
		const front = at(z.x, f - ZONE_RF);
		const back = at(z.x, f + ZONE_RF);
		const cy = (front.y + back.y) / 2;
		const squash = (front.y - back.y) / 2 / ZONE_RX;
		const appear = Math.min(1, z.age / 0.35);
		const owner = z.owner;
		const beat = 0.5 + 0.5 * Math.sin(zonePulse);
		const grow = appear * (1 + 0.25 * Math.sin(appear * Math.PI)) * (owner ? 1 + 0.12 * Math.max(0, 1 - z.claimed / 0.25) : 1 + 0.07 * beat);
		const edge = z.edge !== null;
		const WHITE = '#fffaf0';
		const R = ZONE_RX;
		art.with(ctx, { x: z.x, y: cy, scaleX: grow, scaleY: grow * squash, alpha: fadeIn(f) }, function (c) {
			// the glow round it
			const glow = owner ? 0.14 : 0.16 + 0.26 * beat;
			for (const k of [1.55, 1.35, 1.18]) art.circle(c, 0, 0, R * k, { fill: WHITE, alpha: glow * 0.55 });
			// the painted ring, then the centre: pale while free, and once
			// held, a band of the holder's colour
			art.circle(c, 0, 0, R, { fill: WHITE });
			art.circle(c, 0, 0, R * 0.8, { fill: '#d9b47f' });
			art.circle(c, 0, 0, R * 0.8, { fill: WHITE, alpha: 0.28 + 0.14 * beat * (owner ? 0 : 1) });
			if (owner) {
				art.circle(c, 0, 0, R * 0.68, { fill: PLAYER_COLORS[owner.n] });
				art.circle(c, 0, 0, R * 0.5, { fill: '#e4c493' });
			} else if (z.for !== undefined) {
				// a practice zone, kept for one player: a dot of their colour
				art.circle(c, 0, 0, R * 0.3, { fill: PLAYER_COLORS[z.for] });
			}
			if (edge) {
				// chevrons toward the next wall
				const dir = Math.sign(z.edge - z.wall);
				const ink = '#b8600a';
				art.with(c, { scaleX: dir }, function (c2) {
					for (const ox of [-26, 22]) art.poly(c2, [[ox - 16, -40], [ox + 18, 0], [ox - 16, 40], [ox - 38, 40], [ox - 4, 0], [ox - 38, -40]], { fill: ink });
				});
			}
		});
	}

	function contestant(c, k) {
		const TEAL = '#1f8a6e';
		const PANTS = '#17705a';
		const SKIN = '#f2c9a8';
		const step = k.glue || k.fall ? 0 : Math.sin(k.walk) * 6 * k.moving;
		// legs, with white stripes, and white trainers
		for (const side of [-1, 1]) {
			const lift = Math.max(0, side * step);
			art.roundRect(c, side * 8.5 - 6.5, -44 - lift, 13, 38, 4, { fill: PANTS });
			art.line(c, [[side * 13, -42 - lift], [side * 13, -10 - lift]], { stroke: 'white', lineWidth: 2.5 });
			art.roundRect(c, side * 8.5 - 8, -10 - lift, 16, 10, 4, { fill: '#f6f6f2' });
		}
		// arms, swinging as they walk
		for (const side of [-1, 1]) {
			const swing = -side * step * 0.7;
			art.roundRect(c, side * 26 - 6, -86 + swing, 12, 38, 6, { fill: '#176f5b' });
			art.line(c, [[side * 26 + side * 3, -82 + swing], [side * 26 + side * 3, -54 + swing]], { stroke: 'white', lineWidth: 2.5 });
			art.circle(c, side * 26, -46 + swing, 6, { fill: SKIN });
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
		art.ellipse(c, 0, 0, 28, 8, { fill: 'rgba(0,0,0,0.3)' });
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
		art.with(ctx, { x: p.x, y: p.y, scale: p.s * 0.82, alpha: fadeIn(dollF) }, function (c) {
			art.ellipse(c, 0, 0, 190, 34, { fill: 'rgba(0,0,0,0.25)' });
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
		art.with(ctx, { x: p.x, y: p.y, scale: p.s * 0.85, alpha: fadeIn(dollF + 140) }, function (c) {
			const BARK = '#5a4332';
			art.ellipse(c, 0, 0, 120, 22, { fill: 'rgba(0,0,0,0.22)' });
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
	function drawInset(ctx, x) {
		const looking = Math.cos(head.yaw) > 0.5;
		const turning = head.t < head.dur;
		const label = looking ? 'WATCHING' : turning ? 'TURNING' : 'BACK TURNED';
		const colour = looking ? '#ff3640' : turning ? '#ffb020' : '#27d96b';
		const { y, r } = INSET;
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
		zones.length = 0;
		for (const c of contestants) { c.zone = null; c.glue = null; c.drill = 0; }
		if (phase === 'drill-red') { glare = 0; }
		setPhase('drill');
		const step = CONTROLS.steps[i];
		if (!step) return;
		show.fx('stepIn');
		// a practice circle each, kept for its player, away from them
		if (step.id === 'zone') {
			for (const c of contestants) {
				const z = placeZone(c.wall, null, cam, contestants.filter((o) => o.wall === c.wall).map((o) => ({ x: o.x, near: nearOf(o.wall, o.px, o.pz) })));
				z.for = c.n;
				zones.push(z);
			}
		}
	}

	function achieved(step) {
		const n = Math.max(1, contestants.length);
		switch (step.id) {
			case 'move': return practice.moved > CONTROLS.moved * n;
			case 'step': return practice.stepped > CONTROLS.stepped * n;
			case 'zone': return contestants.every((c) => c.zone);
			case 'freeze': return practice.red >= 2;
			case 'corner': return contestants.every((c) => c.drill >= 2 && !c.hop);
		}
		return false;
	}

	// Every contestant in the corner step gets a corner circle on their
	// wall, kept for them: from the front, round the nearer corner (if it
	// isn't already busy); from a side wall, back round to the front.
	function cornerCircles() {
		for (const c of contestants) {
			if (c.drill >= 2 || c.hop || zones.some((z) => z.for === c.n)) continue;
			const busy = (to) => zones.filter((z) => z.wall === c.wall && z.edge === to).length >= CONTROLS.perCorner;
			let to = 1;
			if (c.wall === 1) {
				to = c.px < 0.5 ? 0 : 2;
				if (busy(to)) to = 2 - to;
			}
			if (busy(to)) continue;
			const z = placeZone(c.wall, to, cam, [{ x: xOf(c), near: nearOf(c.wall, c.px, c.pz) }]);
			z.for = c.n;
			zones.push(z);
		}
	}

	// A moment in a corner circle, and they skip round onto that wall.
	function cornerSkips() {
		for (const c of contestants) {
			const z = c.zone;
			if (!z || z.edge === null || c.hop || z.claimed < CONTROLS.hopAfter) continue;
			zones.splice(zones.indexOf(z), 1);
			c.zone = null;
			c.hop = { t: 0, x0: c.x, f0: c.f };
			c.wall = z.edge;
			c.drill++;
			show.fx('joinWall');
			popOver(c, WALL_NAMES[c.wall] + ' WALL!', PLAYER_COLORS[c.n]);
		}
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
		if (step.id === 'corner') {
			cornerSkips();
			cornerCircles();
		}
		if (!practice.done && practice.age >= step.min && achieved(step)) {
			practice.done = true;
			sound.ding();
			show.fx('nice');
		}
		if (practice.done) practice.doneAge += dt;
		if ((practice.done && practice.doneAge >= CONTROLS.nice) || practice.age >= step.max) enterStep(practice.i + 1);
	}

	// The camera in close on the contestants, wherever they are.
	function crewShot() {
		if (!contestants.length) return { x: WIDTH / 2, y: H / 2, z: 1 };
		const xs = contestants.map((c) => c.x);
		const lo = Math.min(...xs);
		const hi = Math.max(...xs);
		const ys = contestants.map((c) => at(c.x, c.f).y);
		const y = ys.reduce((a, b) => a + b, 0) / ys.length - 90;
		return { x: (lo + hi) / 2, y, z: clamp(CONTROLS.fit / (hi - lo + CONTROLS.pad), CONTROLS.zoom[0], CONTROLS.zoom[1]) };
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
			update(dt) { stepWorld(dt); },
		}),

		// 2. the ten-minute clock, slamming in out of the dark; it starts
		// counting a moment after it lands, and runs through everything after
		show.beats.clockIntro({
			enter() { gloom = 0.2; setPhase('waiting'); },
			update(dt) { stepWorld(dt); },
		}),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors({
			update(dt) { stepWorld(dt); },
		}),

		// 3. the controls, one at a time, the camera in close on the contestants; no doll yet
		{
			id: 'controls',
			length: CONTROLS.steps.reduce((a, s) => a + s.max + CONTROLS.nice, 0),   // a safety net: each step has its own limit
			done: () => practice.i >= CONTROLS.steps.length,
			enter() {
				gloom = 0;
				cam = 0;
				show.camera.follow(crewShot);
				show.play('tutorial');
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
					if (phase === 'drill-red') show.slam(c, 'RED LIGHT!', W / 2, 200, 130, phaseT, { fill: '#ff3640', glow: '#ff3640' });
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
				show.stop('tutorial');
				zones.length = 0;
				callout = null;
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
				[0, 1, 2].forEach((k) => { if (show.cue(E.shapes + k * 0.22)) show.fx('beat', 0.7); });
				if (show.cue(E.eyes)) { show.fx('glint'); show.flash = 0.25; }
				if (show.cue(E.name)) { show.fx('villainReveal'); show.shake = 0.9; show.flash = 0.5; }
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
					// ○ △ □, then her name
					SHAPES.forEach(function (kind, k) {
						const age = bt - E.shapes - k * 0.22;
						if (age < 0) return;
						const s = age < 0.2 ? 2.2 - 1.2 * (age / 0.2) : 1;
						art.with(c, { x: W / 2 + (k - 1) * 130, y: 160, scale: s, alpha: out * Math.min(1, age * 6) }, (c2) => shape(c2, kind, 38, k === 1 ? 'white' : PINK));
					});
					show.slam(c, 'YOUNG-HEE', W / 2, 840, 220, bt - E.name, { fill: PINK, glow: PINK, alpha: out });
					show.slam(c, 'SHE SEES EVERYTHING', W / 2, 950, 56, bt - E.name - 0.4, { fill: 'white', alpha: out });
					const go = 1 - between(bt, E.length - 0.4, E.length);
					show.slam(c, 'ROUND 1', W / 2, 330, 90, bt - E.go + 0.2, { fill: PINK, alpha: go });
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
					// the dash: how long is left to reach a zone (or the line)
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
					}
				});
			},
		},

		// 6. TIME!: the world slows and stops, and she turns to look
		show.beats.timeUp({
			enter() {
				sound.music(false);
				setPhase('over');
				zones.length = 0;
				showInset = false;
				callout = null;
				turnHead(0, 1);
				glare = 1;
			},
			update(dt) { stepWorld(dt * show.timeScale); },
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		// how was it? five faces to tap, sad to happy
		show.beats.rate(),

		show.beats.end({
			enter() {
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
		if (c.zone) { c.zone.owner = null; c.zone = null; }
		c.swapTo = null;
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
				zone: c.zone ? c.zone.id : null, swapTo: c.swapTo, hopping: !!c.hop, why: c.alive ? null : c.why,
			})),
			// each zone, and where a player stands to be in the middle of it
			zones: zones.map((z) => Object.assign({
				id: z.id, wall: z.wall, x: z.x, f: zoneF(z), depth: z.near, edge: z.edge !== null, target: z.edge,
				owner: z.owner ? z.owner.n : null, for: z.for === undefined ? null : z.for,
			}, roomAt(z.wall, z.u, z.near))),
		});
	};

	// Test hooks: jump to any beat (skipping the intros), wind the clock on.
	const INTROS = ['squad', 'clock', 'visors', 'controls', 'doll'];
	self.test = {
		// no block walls this round or after (tests that steer straight to zones)
		clearBlocks() { blocks = []; noBlocks = true; },
		skipTo(id) {
			if (!contestants.length) initGame(playersMeta ? playersMeta.length : 3);
			if (INTROS.indexOf(id) < 0) {
				show.camera.wide();
				gloom = 0;
				callout = null;
				zones.length = 0;
				if (round < 0) begin();
			}
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		sound.close();
		show.fini();
	};

	/* ---------- go ---------- */

	buildField(0);
	show.go('squad');

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
