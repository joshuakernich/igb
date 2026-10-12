/*
 * Floor Is Lava
 *
 * A stylish living room has flooded with glowing lava. Furniture drifts
 * through it on a slow conveyor: couches, armchairs, ottomans, coffee
 * tables, bookshelves and floating cushions bob in on the left wall (the
 * preview of what's coming), sail across the front wall and leave by the
 * right wall. Each player is a meep on the front wall, moving 1:1 with
 * their left / right position. Every few seconds the lava boils up in a
 * surge: anyone standing on furniture survives it and scores a point;
 * anyone wading in the lava is burnt, goes up in smoke, loses a point and
 * comes back on a little rescue cushion of their own. A quick step towards
 * the wall is a jump, which carries a player over a gap mid-surge. Some
 * pieces sink, wobble or crumble after a warning. The lava rises up all
 * three walls like a gauge, and in the final minute an exit door opens on
 * the right wall: stand at the far right of the front wall while its ledge
 * is out (or touch the door) to escape, for a bonus by order of escape.
 * About four minutes, with surges coming faster and furniture shrinking.
 *
 * Input: px (left / right along the front wall), pz (a quick step towards
 * the wall jumps), touches on the right wall's exit door.
 */
IGB.register('floor-is-lava', function FloorIsLavaGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 240;
	const FINAL_SECONDS = 60;     // the exit door opens for the last minute
	const TIDE_START = 840;       // lava level at the start (world y)
	const TIDE_END = 620;         // and at the end
	const FIRST_SURGE = 6;        // seconds into the game
	const SURGE_EVERY = [7.5, 3.6];   // seconds between surges, start to end
	const SURGE_WARN = 1.6;       // seconds of bubbling and rumbling before one
	const SURGE_LEN = 1.1;        // seconds the lava is up
	const SURGE_LIFT = 60;        // how far the lava swells in a surge
	const SPEED = [70, 100];      // conveyor speed, world px per second
	const SIZE = [1, 0.62];       // furniture width factor
	const GAP = [[30, 150], [90, 240]];   // gaps between pieces, start and end
	const HAZARD = [0.12, 0.45];  // chance a piece sinks, wobbles or crumbles
	const WARN_TIME = 3;          // seconds of warning before a piece gives way
	const FAIL_TIME = 1;          // and how long it takes to go
	const MARGIN = 12;            // feet may hang this far over a piece's edge
	const JUMP_DZ = 0.12;         // a pz drop this big within JUMP_WINDOW is a jump
	const JUMP_WINDOW = 12;       // ticks
	const JUMP_TIME = 0.6;        // seconds in the air
	const JUMP_COOLDOWN = 0.8;
	const JUMP_HEIGHT = 130;
	const PENALTY = 2.5;          // seconds out after a burn
	const RESCUE_TIME = 6;        // seconds a rescue cushion lasts
	const MEEP_SCALE = 0.5;
	const ESCAPE_PX = 0.95;       // stand this far right to step onto the exit ledge
	const DOOR_OPEN = 7;          // the exit door's cycle, seconds open...
	const DOOR_SHUT = 4;          // ...and shut
	const ESCAPE_BONUS = [6, 5, 4, 3, 2, 1];

	const DOOR_X = 2 * W + 280;   // the exit door's centre, on the right wall near the corner
	const DOOR_W = 200;
	const DOOR_H = 300;
	const LEDGE_X0 = 2 * W - (1 - ESCAPE_PX) * W;   // the ledge reaches round onto the front wall
	const BALCONY_X1 = 2 * W + 1250;

	const KINDS = {
		couch: { w: [380, 470], h: 130, colors: ['#2bb3a3', '#e8b23a', '#e26d8f', '#5b6ee1'] },
		armchair: { w: [230, 270], h: 130, colors: ['#e8b23a', '#2bb3a3', '#e26d8f', '#f07a3a'] },
		ottoman: { w: [160, 210], h: 95, colors: ['#9b4dca', '#3f8fd8', '#2bb3a3', '#e26d8f'] },
		table: { w: [290, 360], h: 105, colors: ['#8a5a33'] },
		shelf: { w: [180, 220], h: 300, colors: ['#7a4a26'] },
		cushion: { w: [150, 190], h: 40, colors: ['#ffcf3f', '#4fd0e0', '#ff7aa8', '#8be04f', '#b57aff'] },
	};
	const KIND_WEIGHTS = [['couch', 3], ['armchair', 2], ['ottoman', 3], ['table', 2], ['shelf', 1.5], ['cushion', 3]];
	const HAZARDS = ['sink', 'wobble', 'crumble'];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-drama.mp3', 0.15, true);
	audio.add('rumble', 'assets/shared/sfx-rumble.mp3', 0.35);
	audio.add('tick', 'assets/shared/sfx-tick.mp3', 0.25);
	audio.add('burn', 'assets/shared/sfx-explode.mp3', 0.25);
	audio.add('jump', 'assets/shared/sfx-woosh.mp3', 0.2);
	audio.add('survive', 'assets/shared/sfx-correct.mp3', 0.2);
	audio.add('fall', 'assets/shared/sfx-fall.mp3', 0.2);
	audio.add('door', 'assets/shared/sfx-reveal.mp3', 0.3);
	audio.add('shut', 'assets/shared/sfx-incorrect.mp3', 0.25);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.35);

	const hud = new HUD('#ff4a1c');
	hud.$el.appendTo(stage.$ui);

	const meeps = [];
	const pl = [];              // per player: tracking, state, jump, rescue cushion
	const pieces = [];          // the furniture on the conveyor, left to right
	const particles = [];       // smoke, embers, chunks, steam
	const bubbles = [];         // popping on the lava's surface
	const popups = [];
	let t = 0;                  // seconds since the game went live
	let now = 0;                // seconds since it loaded (for idle animation)
	let phase = 'intro';        // intro, live, over
	let nextSurge = FIRST_SURGE;
	let surgeAt = -99;          // when the current (or last) surge began
	let surges = 0;
	let warned = false;
	let escapes = 0;
	let doorWas = false;
	let finalShown = false;
	let nextPieceId = 0;

	/* ---------- helpers ---------- */

	const clamp01 = (v) => Math.max(0, Math.min(1, v));
	const mix = (a, b, k) => a + (b - a) * k;
	const range = (r, k) => mix(r[0], r[1], k);

	// How far through the game we are, 0..1.
	function progress() {
		return clamp01(t / GAME_SECONDS);
	}

	function tideY() {
		const k = Math.pow(progress(), 1.15);
		return mix(TIDE_START, TIDE_END, k);
	}

	// 0..1: how high the current surge has the lava.
	function surgeLevel() {
		const s = t - surgeAt;
		if (s < 0 || s > SURGE_LEN + 0.4) return 0;
		if (s < 0.2) return s / 0.2;
		if (s < SURGE_LEN) return 1;
		return 1 - (s - SURGE_LEN) / 0.4;
	}

	function isSurging() {
		return phase === 'live' && t >= surgeAt && t < surgeAt + SURGE_LEN;
	}

	// 0..1 through the warning before the next surge.
	function warnLevel() {
		if (phase !== 'live') return 0;
		const k = 1 - (nextSurge - t) / SURGE_WARN;
		return k > 0 && k <= 1 ? k : 0;
	}

	// The lava's surface at world x.
	function surfaceY(x) {
		const boil = warnLevel();
		return tideY() - SURGE_LIFT * surgeLevel()
			+ Math.sin(x * 0.006 + now * 1.7) * 7
			+ Math.sin(x * 0.019 - now * 1.1) * 4
			+ Math.sin(x * 0.05 + now * 9) * 3 * boil;
	}

	// The exit: closed until the final minute, then open and shut in turn.
	function finalStart() {
		return GAME_SECONDS - FINAL_SECONDS;
	}
	function exitShown() {
		return t >= finalStart();
	}
	function doorOpen() {
		if (phase !== 'live' || !exitShown()) return false;
		const c = (t - finalStart()) % (DOOR_OPEN + DOOR_SHUT);
		return c < DOOR_OPEN;
	}
	// Seconds until the door shuts (when open).
	function doorLeft() {
		const c = (t - finalStart()) % (DOOR_OPEN + DOOR_SHUT);
		return DOOR_OPEN - c;
	}
	function ledgeY() {
		return tideY() - 150;
	}

	// A small seeded random generator, so each piece keeps its own details.
	function rng(seed) {
		let s = seed >>> 0;
		return function () {
			s = (s * 1664525 + 1013904223) >>> 0;
			return s / 4294967296;
		};
	}

	function pickKind() {
		const total = KIND_WEIGHTS.reduce((a, k) => a + k[1], 0);
		let r = Math.random() * total;
		for (const [kind, w] of KIND_WEIGHTS) {
			r -= w;
			if (r <= 0) return kind;
		}
		return 'couch';
	}

	/* ---------- furniture ---------- */

	function makePiece(x) {
		const k = progress();
		const kind = pickKind();
		const K = KINDS[kind];
		const w = Math.round((K.w[0] + Math.random() * (K.w[1] - K.w[0])) * range(SIZE, k));
		const hazard = Math.random() < range(HAZARD, k) ? HAZARDS[Math.floor(Math.random() * HAZARDS.length)] : null;
		const gap = [range([GAP[0][0], GAP[1][0]], k), range([GAP[0][1], GAP[1][1]], k)];
		return {
			nextGap: gap[0] + Math.random() * (gap[1] - gap[0]),   // the gap to the piece behind it
			id: nextPieceId++,
			kind, w, h: K.h,
			color: K.colors[Math.floor(Math.random() * K.colors.length)],
			x: x === undefined ? -w / 2 : x,
			seed: Math.floor(Math.random() * 1e9),
			phase: Math.random() * TAU,
			hazard,
			trigger: 0.15 + Math.random() * 0.4,   // where on the front wall it starts to give way
			state: 'ok',                            // ok, warn, fail, gone
			stateAt: 0,
			sink: 0, tilt: 0, shake: 0,
		};
	}

	// Fill the conveyor across all three walls at the start.
	function fillPieces() {
		let x = 4800 + 50;
		while (x > -200) {
			const p = makePiece(0);
			p.hazard = null;
			p.x = x - p.w / 2;
			pieces.unshift(p);
			x -= p.w + p.nextGap;
		}
	}

	function pieceLeft(p) { return p.x - p.w / 2; }
	function pieceRight(p) { return p.x + p.w / 2; }

	// Where a piece's base sits: floating on the lava, bobbing.
	function pieceBase(p) {
		const bob = p.kind === 'cushion' ? 7 : 3;
		return tideY() + 18 - SURGE_LIFT * surgeLevel() * 0.5 + Math.sin(now * 1.8 + p.phase) * bob + p.sink;
	}
	function pieceTop(p) {
		return pieceBase(p) - p.h;
	}
	function isSolid(p) {
		return p.state === 'ok' || p.state === 'warn';
	}

	function stepPieces(dt) {
		const k = progress();
		const v = range(SPEED, k);
		for (const p of pieces) {
			p.x += v * dt;
			const front = (p.x - W) / W;
			if (p.hazard && p.state === 'ok' && phase === 'live' && front > p.trigger) {
				p.state = 'warn';
				p.stateAt = t;
			}
			if (p.state === 'warn') {
				const w = (t - p.stateAt) / WARN_TIME;
				if (p.hazard === 'sink') p.sink = w * 25;
				if (p.hazard === 'wobble') p.tilt = Math.sin((t - p.stateAt) * (6 + w * 6)) * w * 9;
				if (p.hazard === 'crumble') {
					p.shake = w * 4;
					if (Math.random() < 0.15 * w) chip(p);
				}
				if (w >= 1) {
					p.state = 'fail';
					p.stateAt = t;
					audio.play('fall', true);
					if (p.hazard === 'crumble') crumble(p);
				}
			} else if (p.state === 'fail') {
				const f = (t - p.stateAt) / FAIL_TIME;
				if (p.hazard === 'sink') p.sink = 25 + f * (p.h + 60);
				if (p.hazard === 'wobble') {
					p.tilt = (p.tilt >= 0 ? 1 : -1) * Math.min(90, Math.abs(p.tilt) + 4);
					p.sink = f * f * (p.h + 60);
				}
				if (f > 0.3 && Math.random() < 0.4) steam(p.x + (Math.random() - 0.5) * p.w, surfaceY(p.x));
				if (f >= 1) p.state = 'gone';
			}
		}
		for (let i = pieces.length - 1; i >= 0; i--) {
			const p = pieces[i];
			if (p.state === 'gone' || pieceLeft(p) > 3 * W + 20) pieces.splice(i, 1);
		}
		// Feed new pieces in from the left wall's far edge, each a gap behind the last.
		const first = pieces[0];
		if (!first || pieceLeft(first) > first.nextGap) {
			const p = makePiece();
			p.x = (first ? pieceLeft(first) - first.nextGap : 0) - p.w / 2;
			pieces.unshift(p);
		}
	}

	// The highest solid thing under world x: a piece, a rescue cushion or the exit ledge.
	function supportAt(x, n) {
		let best = null;
		for (const p of pieces) {
			if (!isSolid(p)) continue;
			if (x < pieceLeft(p) - MARGIN || x > pieceRight(p) + MARGIN) continue;
			const top = pieceTop(p);
			if (!best || top < best.top) best = { top, piece: p };
		}
		if (n !== undefined && pl[n].rescueUntil > t) {
			const top = rescueTop(n);
			if (!best || top < best.top) best = { top, rescue: true };
		}
		if (doorOpen() && x >= LEDGE_X0 - MARGIN) {
			const top = ledgeY();
			if (!best || top < best.top) best = { top, ledge: true };
		}
		return best;
	}

	function rescueTop(n) {
		return tideY() - 32 - SURGE_LIFT * surgeLevel() * 0.5 + Math.sin(now * 2.2 + n) * 5;
	}

	/* ---------- particles ---------- */

	function puff(x, y) {
		for (let i = 0; i < 26; i++) {
			const a = Math.random() * TAU;
			const s = 1 + Math.random() * 4;
			particles.push({ kind: 'smoke', x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5, r: 20 + Math.random() * 30, life: 0, max: 60 + Math.random() * 40 });
		}
		for (let i = 0; i < 14; i++) {
			particles.push({ kind: 'ember', x, y, vx: (Math.random() - 0.5) * 12, vy: -4 - Math.random() * 10, r: 5 + Math.random() * 6, life: 0, max: 40 + Math.random() * 30 });
		}
	}

	function steam(x, y) {
		particles.push({ kind: 'steam', x, y, vx: (Math.random() - 0.5) * 1.5, vy: -1.5 - Math.random() * 1.5, r: 10 + Math.random() * 14, life: 0, max: 40 + Math.random() * 30 });
	}

	function chip(p) {
		particles.push({ kind: 'chunk', x: p.x + (Math.random() - 0.5) * p.w, y: pieceTop(p) + Math.random() * p.h, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, r: 6 + Math.random() * 6, color: p.kind === 'table' || p.kind === 'shelf' ? '#5e3a1e' : p.color, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 20, life: 0, max: 80 });
	}

	function crumble(p) {
		for (let i = 0; i < 16; i++) {
			particles.push({ kind: 'chunk', x: p.x + (Math.random() - 0.5) * p.w, y: pieceTop(p) + Math.random() * p.h, vx: (Math.random() - 0.5) * 8, vy: -3 - Math.random() * 6, r: 12 + Math.random() * 22, color: p.kind === 'table' || p.kind === 'shelf' ? '#6b4426' : p.color, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 20, life: 0, max: 90 });
		}
		p.sink = 0;
		p.state = 'gone';
	}

	function stepParticles() {
		for (let i = particles.length - 1; i >= 0; i--) {
			const q = particles[i];
			q.life++;
			q.x += q.vx;
			q.y += q.vy;
			if (q.kind === 'smoke') { q.vx *= 0.94; q.vy = q.vy * 0.94 - 0.08; q.r += 0.6; }
			if (q.kind === 'ember') { q.vy += 0.35; }
			if (q.kind === 'steam') { q.r += 0.5; }
			if (q.kind === 'chunk') {
				q.vy += 0.4;
				q.rot += q.vr;
				if (q.y > surfaceY(q.x) + 10) { q.life = q.max; steam(q.x, q.y - 10); }
			}
			if (q.life >= q.max) particles.splice(i, 1);
		}
		// Bubbles pop all over the lava, many more as a surge builds.
		const boil = warnLevel() + surgeLevel() * 1.5;
		const rate = 0.5 + boil * 2.5;
		for (let i = 0; i < 3; i++) {
			if (Math.random() < rate / 3) bubbles.push({ x: Math.random() * 3 * W, dy: 10 + Math.random() * 60, r: 8 + Math.random() * (14 + boil * 10), life: 0, max: 30 + Math.random() * 40 });
		}
		for (let i = bubbles.length - 1; i >= 0; i--) {
			const b = bubbles[i];
			b.life++;
			if (b.life >= b.max) {
				if (Math.random() < 0.5) particles.push({ kind: 'ember', x: b.x, y: surfaceY(b.x), vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 5, r: 3 + Math.random() * 4, life: 0, max: 30 });
				bubbles.splice(i, 1);
			}
		}
		for (let i = popups.length - 1; i >= 0; i--) if (++popups[i].life > 70) popups.splice(i, 1);
	}

	function popup(text, x, y, color) {
		popups.push({ text, x, y, color, life: 0 });
	}

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const m = new Meep(i);
			m.x = W + (i + 1) / (count + 1) * W;
			m.y = tideY();
			m.scale = MEEP_SCALE;
			meeps.push(m);
			pl.push({
				tx: m.x, pz: 0.5, hist: [],
				state: 'play',          // play, burnt, escaping, escaped
				stateAt: 0,
				jumpAt: -99,
				rescueUntil: -1,
				surged: false,          // burnt during the current surge
				footY: tideY(),
				rank: -1,
				burns: 0, jumps: 0, survived: 0,
				escapeFrom: 0,
			});
		}
		hud.initPlayers(meeps);
		audio.play('music');
		hud.initBanner('The floor is lava!');
		stage.timeout(hud.finiBanner, 2400);
		stage.timeout(function () {
			phase = 'live';
			t = 0;
			nextSurge = FIRST_SURGE;
			hud.initTimer(GAME_SECONDS, function () { if (phase === 'live') finiGame(); });
		}, 3000);
	}

	function finiGame() {
		if (phase === 'over') return;
		phase = 'over';
		hud.finiTimer();
		const out = pl.filter((p) => p.state === 'escaped' || p.state === 'escaping').length;
		hud.initBanner(out === pl.length ? 'Everyone escaped!' : `${out} escaped!`);
		audio.play('cheer', true);
		stage.timeout(function () {
			hud.finiBanner();
			audio.stop('music');
			const scores = meeps.map((m) => m.score);
			const rewards = scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);
			stage.timeout(() => IGB.complete(rewards), 5000);
		}, 2600);
	}

	/* ---------- surges ---------- */

	function startSurge() {
		surgeAt = t;
		warned = false;
		pl.forEach((p) => { p.surged = false; });
		const every = range(SURGE_EVERY, progress());
		nextSurge = t + every;
	}

	function endSurge() {
		surges++;
		let any = false;
		pl.forEach(function (p, n) {
			const m = meeps[n];
			if (p.state === 'escaped' || p.state === 'escaping') {
				m.score++;
				p.survived++;
				return;
			}
			if (p.state === 'play' && !p.surged) {
				m.score++;
				p.survived++;
				m.doScore(1);
				any = true;
			}
		});
		if (any) audio.play('survive', true);
	}

	function burn(n) {
		const p = pl[n];
		const m = meeps[n];
		p.state = 'burnt';
		p.stateAt = t;
		p.surged = true;
		p.burns++;
		if (m.score > 0) m.score--;
		puff(m.x, m.y - 60);
		popup('-1', m.x, m.y - 200, '#ff5040');
		m.visible = false;
		audio.play('burn', true);
	}

	/* ---------- escape ---------- */

	function escape(n) {
		const p = pl[n];
		const m = meeps[n];
		if (p.state !== 'play') return;
		p.state = 'escaping';
		p.stateAt = t;
		p.rank = escapes++;
		p.escapeFrom = m.x;
		const bonus = ESCAPE_BONUS[p.rank] || 1;
		m.score += bonus;
		m.visible = true;
		popup(`+${bonus}`, DOOR_X, ledgeY() - DOOR_H - 60, PLAYER_COLORS[n]);
		hud.flashMessage(2 + (DOOR_X - 2 * W) / W, 0.25, ['1st!', '2nd!', '3rd!', '4th!', '5th!', '6th!'][p.rank] || 'Out!', 80);
		audio.play('cheer', true);
	}

	function escapeSlot(rank) {
		return DOOR_X + 230 + rank * 125;
	}

	/* ---------- every tick ---------- */

	function step() {
		const dt = 1 / FPS;
		now += dt;
		if (!meeps.length) return;
		if (phase === 'live') t += dt;

		stepPieces(dt);

		if (phase === 'live') {
			if (!warned && t >= nextSurge - SURGE_WARN) {
				warned = true;
				audio.play('rumble', true);
				for (let i = 0; i < 3; i++) stage.timeout(() => audio.play('tick', true), i * 500);
			}
			if (t >= nextSurge) startSurge();
			if (surgeAt >= 0 && t - dt < surgeAt + SURGE_LEN && t >= surgeAt + SURGE_LEN) endSurge();

			const open = doorOpen();
			if (open && !doorWas) audio.play('door', true);
			if (!open && doorWas) audio.play('shut', true);
			doorWas = open;
			if (exitShown() && !finalShown) {
				finalShown = true;
				hud.flashMessage(2.2, 0.15, 'EXIT!', 120);
			}
		}

		const surging = isSurging();
		meeps.forEach(function (m, n) {
			const p = pl[n];

			// Jumps: a quick step towards the wall.
			p.hist.push(p.pz);
			if (p.hist.length > JUMP_WINDOW) p.hist.shift();
			if (p.state === 'play' && p.hist[0] - p.pz > JUMP_DZ && t - p.jumpAt > JUMP_TIME + JUMP_COOLDOWN && phase !== 'over') {
				p.jumpAt = t;
				p.jumps++;
				p.hist.length = 0;
				audio.play('jump', true);
			}
			const airK = (t - p.jumpAt) / JUMP_TIME;
			const airborne = airK >= 0 && airK < 1;

			if (p.state === 'play') {
				m.x += (p.tx - m.x) * 0.4;
				const sup = supportAt(m.x, n);
				const ground = sup ? sup.top : surfaceY(m.x) + 28;
				// Settle onto whatever is underfoot (quickly up, a little slower down).
				p.footY += (ground - p.footY) * (ground < p.footY ? 0.5 : 0.3);
				m.y = p.footY - (airborne ? Math.sin(airK * Math.PI) * JUMP_HEIGHT : 0);
				p.wading = !sup && !airborne;
				p.airborne = airborne;
				p.on = sup ? (sup.piece ? sup.piece.id : sup.rescue ? 'rescue' : 'ledge') : null;

				// Hot feet when wading in the lava; arms up mid-jump.
				const hop = p.wading ? Math.sin(now * 18) : 0;
				m.footLeft.rotate = hop * 25;
				m.footRight.rotate = -hop * 25;
				m.handLeft.y = airborne ? 40 : (p.wading ? 120 + hop * 30 : null);
				m.handRight.y = airborne ? 40 : (p.wading ? 120 - hop * 30 : null);
				m.rotate = airborne ? Math.sin(airK * TAU) * 6 : 0;
				if (p.wading && Math.random() < 0.15) steam(m.x + (Math.random() - 0.5) * 50, p.footY - 10);

				if (surging && !sup && !airborne) burn(n);
				else if (phase === 'live' && doorOpen() && m.x >= LEDGE_X0 && !airborne) escape(n);
			} else if (p.state === 'burnt') {
				if (t - p.stateAt >= PENALTY || phase === 'over') {
					p.state = 'play';
					p.rescueUntil = t + RESCUE_TIME;
					m.x = p.tx;
					p.footY = rescueTop(n) - 200;
					m.visible = true;
					m.rotate = 0;
				}
			} else if (p.state === 'escaping') {
				// Along the ledge, round the corner and out to the balcony.
				const k = clamp01((t - p.stateAt) / 1.4);
				const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
				m.x = mix(p.escapeFrom, escapeSlot(p.rank), e);
				m.y = ledgeY() - Math.abs(Math.sin(k * Math.PI * 3)) * 40;
				if (k >= 1) p.state = 'escaped';
			} else if (p.state === 'escaped') {
				m.x = escapeSlot(p.rank);
				m.y = ledgeY() - Math.max(0, Math.sin(now * 6 + n)) * 25;
				m.handLeft.y = -10;
				m.handRight.y = -10;
				m.footLeft.rotate = 0;
				m.footRight.rotate = 0;
				m.rotate = 0;
			}
		});


		// Everyone out: finish early.
		if (phase === 'live' && pl.every((p) => p.state === 'escaped')) finiGame();
		if (phase === 'live' && t >= GAME_SECONDS) finiGame();

		stepParticles();
		hud.updatePlayers(meeps);
	}

	/* ---------- drawing: the room ---------- */

	const WALL = '#183f4c';
	const WALL_STRIPE = '#1c4958';
	const WAINSCOT = '#123341';
	const TRIM = '#e9dcc1';

	function drawRoom(ctx) {
		art.eachWall(ctx, function (ctx, n) {
			art.rect(ctx, 0, 0, W, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#14323d', WALL, '#1d4a58']) });
			for (let x = 40; x < W; x += 80) art.rect(ctx, x, 0, 26, 560, { fill: WALL_STRIPE });
			// Ceiling cornice and picture rail.
			art.rect(ctx, 0, 0, W, 34, { fill: '#0f2830' });
			art.rect(ctx, 0, 34, W, 10, { fill: TRIM, alpha: 0.85 });
			art.rect(ctx, 0, 150, W, 6, { fill: TRIM, alpha: 0.5 });
			// Wainscoting below the dado rail.
			art.rect(ctx, 0, 560, W, H - 560, { fill: WAINSCOT });
			art.rect(ctx, 0, 552, W, 14, { fill: TRIM });
			for (let x = 30; x < W - 100; x += 200) art.roundRect(ctx, x, 600, 170, 330, 6, { stroke: 'rgba(233,220,193,0.25)', lineWidth: 5 });
			if (n === 0) drawLeftDecor(ctx);
			if (n === 1) drawFrontDecor(ctx);
			if (n === 2) drawRightDecor(ctx);
		});
		// Corner shading so the three walls read as a room.
		for (const x of [W, 2 * W]) {
			art.rect(ctx, x - 60, 0, 60, H, { fill: art.linear(ctx, x - 60, 0, x, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']) });
			art.rect(ctx, x, 0, 60, H, { fill: art.linear(ctx, x, 0, x + 60, 0, ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']) });
		}
	}

	function frame(ctx, x, y, w, h, inner) {
		art.rect(ctx, x - 14, y - 14, w + 28, h + 28, { fill: '#c9a24a', shadow: { color: 'rgba(0,0,0,0.4)', blur: 14, y: 8 } });
		art.rect(ctx, x, y, w, h, { fill: '#f3ead6' });
		art.save(ctx, function () {
			ctx.beginPath();
			ctx.rect(x, y, w, h);
			ctx.clip();
			inner(ctx);
		});
	}

	function drawLeftDecor(ctx) {
		// A tall window onto a dusk sky.
		const x = 520, y = 170, w = 420, h = 330;
		art.rect(ctx, x - 18, y - 18, w + 36, h + 36, { fill: TRIM, shadow: { color: 'rgba(0,0,0,0.4)', blur: 14, y: 8 } });
		art.rect(ctx, x, y, w, h, { fill: art.linear(ctx, 0, y, 0, y + h, ['#2a1f5c', '#a3418a', '#ff9a52']) });
		art.circle(ctx, x + 300, y + 230, 46, { fill: '#ffd36b', alpha: 0.9 });
		art.poly(ctx, [[x, y + h], [x + 60, y + 250], [x + 130, y + 290], [x + 210, y + 220], [x + 300, y + 280], [x + 380, y + 240], [x + w, y + 270], [x + w, y + h]], { fill: '#2c1a3e' });
		art.rect(ctx, x + w / 2 - 6, y, 12, h, { fill: TRIM });
		art.rect(ctx, x, y + h / 2 - 6, w, 12, { fill: TRIM });
		// Curtains.
		art.roundRect(ctx, x - 70, y - 30, 80, h + 80, [10, 10, 40, 40], { fill: '#d8573a' });
		art.roundRect(ctx, x + w - 10, y - 30, 80, h + 80, [10, 10, 40, 40], { fill: '#d8573a' });
		art.rect(ctx, x - 90, y - 40, w + 180, 14, { fill: '#c9a24a' });
		// A round mirror.
		art.circle(ctx, 1260, 330, 120, { fill: '#c9a24a', shadow: { color: 'rgba(0,0,0,0.4)', blur: 14, y: 8 } });
		art.circle(ctx, 1260, 330, 100, { fill: art.linear(ctx, 1180, 250, 1340, 410, ['#bfe3ea', '#5d8f9c']) });
		art.line(ctx, [[1205, 290], [1240, 255]], { stroke: 'rgba(255,255,255,0.6)', lineWidth: 10 });
		frame(ctx, 140, 230, 200, 250, function (ctx) {
			art.rect(ctx, 140, 230, 200, 250, { fill: '#f2c14e' });
			art.circle(ctx, 240, 330, 70, { fill: '#e2553d' });
			art.rect(ctx, 140, 400, 200, 80, { fill: '#2a7f8f' });
		});
	}

	function drawFrontDecor(ctx) {
		// Pendant lamps.
		for (const x of [380, 1220]) {
			art.line(ctx, [[x, 30], [x, 150]], { stroke: '#0c1d24', lineWidth: 5 });
			art.poly(ctx, [[x - 70, 220], [x - 30, 150], [x + 30, 150], [x + 70, 220]], { fill: '#e8b23a' });
			art.circle(ctx, x, 240, 140, { fill: art.radial(ctx, x, 240, 10, 140, ['rgba(255,230,160,0.45)', 'rgba(255,230,160,0)']) });
			art.ellipse(ctx, x, 222, 30, 10, { fill: '#fff4cf' });
		}
		// Gallery wall of abstract art.
		frame(ctx, 560, 210, 220, 160, function (ctx) {
			art.rect(ctx, 560, 210, 220, 160, { fill: '#fbe7d0' });
			art.circle(ctx, 620, 290, 50, { fill: '#e26d8f' });
			art.rect(ctx, 670, 240, 80, 110, { fill: '#2bb3a3' });
		});
		frame(ctx, 830, 180, 190, 250, function (ctx) {
			art.rect(ctx, 830, 180, 190, 250, { fill: '#203a6b' });
			art.poly(ctx, [[830, 430], [925, 250], [1020, 430]], { fill: '#f2c14e' });
			art.circle(ctx, 975, 230, 26, { fill: '#fff4cf' });
		});
		// A wall clock.
		art.circle(ctx, 1450, 290, 80, { fill: '#f3ead6', stroke: '#c9a24a', lineWidth: 12, shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, y: 6 } });
		const a = now * 0.5;
		art.line(ctx, [[1450, 290], [1450 + Math.cos(a) * 55, 290 + Math.sin(a) * 55]], { stroke: '#203a6b', lineWidth: 6 });
		art.line(ctx, [[1450, 290], [1450 + Math.cos(a / 12) * 35, 290 + Math.sin(a / 12) * 35]], { stroke: '#203a6b', lineWidth: 9 });
		frame(ctx, 120, 250, 150, 190, function (ctx) {
			art.rect(ctx, 120, 250, 150, 190, { fill: '#e8b23a' });
			art.rect(ctx, 150, 280, 90, 130, { fill: '#5b6ee1' });
		});
	}

	function drawRightDecor(ctx) {
		// Bookshelf-style floating shelves with plants, beyond the exit.
		for (const [x, y] of [[700, 300], [1150, 220]]) {
			art.rect(ctx, x, y, 300, 16, { fill: '#7a4a26', shadow: { color: 'rgba(0,0,0,0.4)', blur: 10, y: 6 } });
			art.roundRect(ctx, x + 30, y - 60, 60, 60, [4, 4, 14, 14], { fill: '#e26d8f' });
			for (let i = 0; i < 5; i++) art.ellipse(ctx, x + 60 + (i - 2) * 14, y - 80 - Math.abs(i - 2) * -6, 12, 34, { fill: '#3fa05a' });
			for (let i = 0; i < 6; i++) art.rect(ctx, x + 130 + i * 24, y - 70 + (i % 3) * 8, 20, 70 - (i % 3) * 8, { fill: ['#ffcf3f', '#4fd0e0', '#ff7aa8', '#8be04f', '#b57aff', '#f07a3a'][i] });
		}
		frame(ctx, 1260, 330, 200, 140, function (ctx) {
			art.rect(ctx, 1260, 330, 200, 140, { fill: '#2bb3a3' });
			art.circle(ctx, 1360, 400, 50, { fill: '#ffcf3f' });
		});
	}

	// A brass depth gauge by each corner: the lava fills it as the tide rises.
	function drawGauges(ctx) {
		const tide = tideY();
		for (const gx of [80, W + 60, 2 * W - 100, 3 * W - 120]) {
			const top = 420;
			const bot = 960;
			art.roundRect(ctx, gx - 22, top - 20, 44, bot - top + 40, 22, { fill: '#2a1b10', stroke: '#c9a24a', lineWidth: 6 });
			const fillTop = Math.max(top, tide);
			art.roundRect(ctx, gx - 12, fillTop, 24, bot - fillTop, 12, { fill: art.linear(ctx, 0, fillTop, 0, bot, ['#ffd25a', '#ff4a1c', '#a31400']) });
			for (let y = top; y <= bot; y += 45) art.line(ctx, [[gx + 22, y], [gx + 40, y]], { stroke: '#c9a24a', lineWidth: 4 });
			art.circle(ctx, gx, top - 20, 16, { fill: tide < 700 ? '#ff4a1c' : '#c9a24a', alpha: tide < 700 ? 0.6 + 0.4 * Math.sin(now * 6) : 1 });
		}
	}

	/* ---------- drawing: the lava ---------- */

	function lavaPath(ctx, x0, x1, dy) {
		ctx.beginPath();
		ctx.moveTo(x0, H);
		for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, surfaceY(x) + dy);
		ctx.lineTo(x1, surfaceY(x1) + dy);
		ctx.lineTo(x1, H);
		ctx.closePath();
	}

	function drawLavaGlow(ctx) {
		const tide = tideY() - SURGE_LIFT * surgeLevel();
		const heat = 0.35 + warnLevel() * 0.3 + surgeLevel() * 0.4;
		art.rect(ctx, 0, tide - 420, 3 * W, 440, { fill: art.linear(ctx, 0, tide - 420, 0, tide + 20, ['rgba(255,90,20,0)', `rgba(255,110,30,${heat})`]) });
		// Scorch line where the lava has already been.
		art.rect(ctx, 0, tide - 30, 3 * W, 30, { fill: 'rgba(40,10,0,0.25)' });
	}

	function drawLava(ctx) {
		const tide = tideY();
		const hot = Math.min(1, warnLevel() * 0.6 + surgeLevel());
		art.save(ctx, function () {
			lavaPath(ctx, 0, 3 * W, 0);
			ctx.fillStyle = art.linear(ctx, 0, tide - 60, 0, H, [
				[0, hot > 0.5 ? '#fff0a0' : '#ffc23a'],
				[0.12, '#ff7a1c'],
				[0.5, '#e0360f'],
				[1, '#8a1004'],
			]);
			art.setShadow(ctx, { color: 'rgba(255,120,30,0.9)', blur: 40 + hot * 40 });
			ctx.fill();
			ctx.clip();
			art.setShadow(ctx, { color: 'transparent' });
			// Darker cooling crust drifting slowly; it breaks up as a surge comes.
			const r = rng(7);
			for (let i = 0; i < 40; i++) {
				const x = ((r() * 3 * W + now * (10 + r() * 20)) % (3 * W + 300)) - 150;
				const y = tide + 30 + r() * (H - tide);
				art.ellipse(ctx, x, y, 80 + r() * 120, 12 + r() * 14, { fill: 'rgba(110,20,0,0.35)', alpha: 1 - hot * 0.8 });
			}
			// Bright veins.
			for (let i = 0; i < 26; i++) {
				const x = ((r() * 3 * W - now * (8 + r() * 14)) % (3 * W + 300) + 3 * W + 300) % (3 * W + 300) - 150;
				const y = tide + 40 + r() * (H - tide);
				art.ellipse(ctx, x, y, 60 + r() * 80, 5 + r() * 5, { fill: 'rgba(255,220,120,0.5)', alpha: 0.5 + hot * 0.5 });
			}
		});
		// Bubbles on the surface.
		for (const b of bubbles) {
			const k = b.life / b.max;
			const y = surfaceY(b.x) + b.dy * (1 - k) * 0.4;
			art.circle(ctx, b.x, y, b.r * (0.4 + k * 0.7), { fill: 'rgba(255,200,80,0.85)', stroke: 'rgba(255,245,200,0.9)', lineWidth: 3 });
		}
	}

	// The front lip of the lava, drawn over the furniture's feet.
	function drawLavaFront(ctx) {
		const tide = tideY();
		art.save(ctx, function () {
			lavaPath(ctx, 0, 3 * W, 22);
			ctx.fillStyle = art.linear(ctx, 0, tide, 0, H, ['#ff8a22', '#e0360f', '#8a1004']);
			ctx.fill();
		});
		art.save(ctx, function () {
			ctx.beginPath();
			for (let x = 0; x <= 3 * W; x += 24) ctx.lineTo(x, surfaceY(x) + 22);
			ctx.strokeStyle = 'rgba(255,230,140,0.85)';
			ctx.lineWidth = 6;
			ctx.stroke();
		});
	}

	// Flames licking up across all three walls during a surge.
	function drawSurge(ctx) {
		const s = surgeLevel();
		const w = warnLevel();
		if (s <= 0 && w <= 0) return;
		art.save(ctx, function () {
			ctx.globalCompositeOperation = 'lighter';
			if (s > 0) {
				for (let x = -40; x < 3 * W + 40; x += 46) {
					// Flames only in the gaps, so the safe furniture stands out.
					if (pieces.some((p) => isSolid(p) && x > pieceLeft(p) + 20 && x < pieceRight(p) - 20)) continue;
					if (doorOpen() && x > LEDGE_X0 + 20 && x < BALCONY_X1) continue;
					const n = Math.sin(x * 0.37 + now * 13) * 0.5 + Math.sin(x * 0.11 - now * 7) * 0.5;
					const h = s * (140 + 120 * n);
					const y = surfaceY(x) + 20;
					const sway = Math.sin(now * 10 + x) * 14;
					art.poly(ctx, [[x - 34, y], [x + sway, y - h], [x + 34, y]], { fill: 'rgba(255,110,20,0.55)' });
					art.poly(ctx, [[x - 18, y], [x + sway * 0.7, y - h * 0.6], [x + 18, y]], { fill: 'rgba(255,230,120,0.6)' });
				}
				art.rect(ctx, 0, 0, 3 * W, H, { fill: `rgba(255,60,0,${0.12 * s})` });
			} else {
				art.rect(ctx, 0, 0, 3 * W, H, { fill: `rgba(255,60,0,${0.1 * w * (0.5 + 0.5 * Math.sin(now * 20))})` });
			}
		});
		if (w > 0 || s > 0) {
			const pulse = 1 + 0.08 * Math.sin(now * 18);
			// On the side walls, clear of the HUD over the front wall.
			for (const x of [0.5 * W, 2.5 * W]) art.text(ctx, 'SURGE!', x, 100, { size: 130 * pulse, font: 'Knewave', fill: s > 0 ? '#fff0a0' : '#ff7a1c', outline: '#3a0c02', outlineWidth: 10, alpha: s > 0 ? s : Math.min(1, w * 2) });
		}
	}

	/* ---------- drawing: furniture ---------- */

	function shade(hex, f) {
		const n = parseInt(hex.slice(1), 16);
		const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)));
		return `rgb(${c[0]},${c[1]},${c[2]})`;
	}

	// Draw a piece with its base centre at (0, 0) and its standing surface at y = -h.
	function drawPieceLocal(ctx, p) {
		const w = p.w;
		const h = p.h;
		const c = p.color;
		const r = rng(p.seed);
		const SH = { color: 'rgba(0,0,0,0.35)', blur: 10, y: 6 };
		if (p.kind === 'couch' || p.kind === 'armchair') {
			const back = p.kind === 'couch' ? 95 : 125;
			art.roundRect(ctx, -w / 2 + 14, -h - back, w - 28, back + 20, [26, 26, 6, 6], { fill: shade(c, 0.8), shadow: SH });
			art.roundRect(ctx, -w / 2, -h + 30, w, h - 30, 10, { fill: shade(c, 0.7) });
			const seats = p.kind === 'couch' ? (w > 380 ? 3 : 2) : 1;
			const sw = (w - 70) / seats;
			for (let i = 0; i < seats; i++) art.roundRect(ctx, -w / 2 + 35 + i * sw + 3, -h, sw - 6, 44, 14, { fill: c });
			for (const sx of [-1, 1]) art.roundRect(ctx, sx < 0 ? -w / 2 - 6 : w / 2 - 42, -h - 30, 48, h + 10, [22, 22, 6, 6], { fill: shade(c, 0.88) });
			art.rect(ctx, -w / 2 + 10, -18, w - 20, 10, { fill: shade(c, 0.55) });
		} else if (p.kind === 'ottoman') {
			art.roundRect(ctx, -w / 2, -h, w, h, [30, 30, 16, 16], { fill: c, shadow: SH });
			art.roundRect(ctx, -w / 2, -h, w, 26, [30, 30, 0, 0], { fill: shade(c, 1.2) });
			for (let i = -1; i <= 1; i++) art.circle(ctx, i * w * 0.28, -h + 50, 6, { fill: shade(c, 0.6) });
			art.rect(ctx, -w / 2 + 6, -14, w - 12, 8, { fill: '#c9a24a' });
		} else if (p.kind === 'table') {
			for (const lx of [-w / 2 + 30, w / 2 - 30]) art.poly(ctx, [[lx - 10, -h + 20], [lx + 10, -h + 20], [lx + (lx < 0 ? -2 : 6), 0], [lx + (lx < 0 ? -6 : 2), 0]], { fill: '#4a2c14' });
			art.rect(ctx, -w / 2 + 20, -h + 16, w - 40, 24, { fill: '#6b4426' });
			art.roundRect(ctx, -w / 2 - 10, -h, w + 20, 22, 8, { fill: c, shadow: SH });
			art.rect(ctx, -w / 2 - 10, -h + 4, w + 20, 3, { fill: 'rgba(255,220,170,0.35)' });
			// A little stack of books and a vase at one end.
			const bx = (r() < 0.5 ? -1 : 1) * (w / 2 - 45);
			art.rect(ctx, bx - 30, -h - 14, 60, 14, { fill: '#e26d8f' });
			art.rect(ctx, bx - 25, -h - 26, 50, 12, { fill: '#2bb3a3' });
		} else if (p.kind === 'shelf') {
			art.rect(ctx, -w / 2, -h, w, h, { fill: c, shadow: SH });
			art.rect(ctx, -w / 2 + 12, -h + 12, w - 24, h - 24, { fill: '#3e2412' });
			const rows = 4;
			const rh = (h - 24) / rows;
			const colors = ['#ffcf3f', '#4fd0e0', '#ff7aa8', '#8be04f', '#b57aff', '#f07a3a', '#e9dcc1'];
			for (let row = 0; row < rows; row++) {
				const y1 = -h + 12 + (row + 1) * rh;
				art.rect(ctx, -w / 2 + 12, y1 - 8, w - 24, 8, { fill: c });
				let x = -w / 2 + 18;
				while (x < w / 2 - 34) {
					const bw = 12 + r() * 14;
					const bh = rh * (0.55 + r() * 0.3);
					art.rect(ctx, x, y1 - 8 - bh, bw, bh, { fill: colors[Math.floor(r() * colors.length)] });
					x += bw + 2;
				}
			}
			art.rect(ctx, -w / 2 - 6, -h - 4, w + 12, 14, { fill: shade(c, 1.2) });
		} else if (p.kind === 'cushion') {
			art.roundRect(ctx, -w / 2, -h, w, h + 14, 22, { fill: c, shadow: SH });
			art.roundRect(ctx, -w / 2 + 8, -h + 4, w - 16, 12, 6, { fill: 'rgba(255,255,255,0.35)' });
			art.circle(ctx, 0, -h / 2 + 4, 6, { fill: shade(c, 0.6) });
			for (const sx of [-1, 1]) art.circle(ctx, sx * (w / 2 + 4), -h + 6, 9, { fill: shade(c, 0.75) });
		}
		// Cracks on a crumbling piece.
		if (p.hazard === 'crumble' && p.state === 'warn') {
			const k = (t - p.stateAt) / WARN_TIME;
			const rr = rng(p.seed + 1);
			for (let i = 0; i < 1 + Math.floor(k * 4); i++) {
				let x = (rr() - 0.5) * w * 0.8;
				let y = -h;
				const pts = [[x, y]];
				for (let j = 0; j < 4; j++) { x += (rr() - 0.5) * 40; y += h / 4; pts.push([x, y]); }
				art.line(ctx, pts, { stroke: '#1a0a02', lineWidth: 5 });
			}
		}
	}

	function drawPieces(ctx) {
		for (const p of pieces) {
			if (p.state === 'gone') continue;
			const right = pieceRight(p);
			if (right < -50 || pieceLeft(p) > 3 * W + 50) continue;
			const shake = p.shake ? (Math.random() - 0.5) * p.shake * 2 : 0;
			art.with(ctx, { x: p.x + shake, y: pieceBase(p), rotate: p.tilt }, (ctx) => drawPieceLocal(ctx, p));
			// A warning badge above a piece about to give way.
			if (p.state === 'warn') {
				const k = (t - p.stateAt) / WARN_TIME;
				const blink = Math.sin(now * (8 + k * 14)) > -0.2;
				if (blink) {
					const y = pieceTop(p) - 215;
					art.poly(ctx, [[p.x, y - 38], [p.x + 40, y + 30], [p.x - 40, y + 30]], { fill: '#ffcf3f', stroke: '#3a0c02', lineWidth: 6, lineJoin: 'round' });
					art.text(ctx, '!', p.x, y + 8, { size: 50, font: 'Paytone One', fill: '#3a0c02' });
				}
				if (p.hazard === 'sink' && Math.random() < 0.5) bubbles.push({ x: p.x + (Math.random() - 0.5) * p.w, dy: 0, r: 10 + Math.random() * 14, life: 0, max: 25 });
			}
		}
	}

	/* ---------- drawing: the exit ---------- */

	function drawDoor(ctx) {
		if (!exitShown()) return;
		const base = ledgeY();
		const open = doorOpen();
		const x0 = DOOR_X - DOOR_W / 2;
		const y0 = base - DOOR_H;
		art.rect(ctx, x0 - 18, y0 - 18, DOOR_W + 36, DOOR_H + 18, { fill: TRIM, shadow: { color: 'rgba(0,0,0,0.5)', blur: 16, y: 8 } });
		if (open) {
			art.rect(ctx, x0, y0, DOOR_W, DOOR_H, { fill: art.linear(ctx, 0, y0, 0, base, ['#fffbe0', '#bff0ff']) });
			art.circle(ctx, DOOR_X, y0 + DOOR_H / 2, 260, { fill: art.radial(ctx, DOOR_X, y0 + DOOR_H / 2, 20, 260, ['rgba(255,250,210,0.5)', 'rgba(255,250,210,0)']) });
			// The door swung open, seen edge-on.
			art.poly(ctx, [[x0, y0], [x0 - 60, y0 + 30], [x0 - 60, base - 10], [x0, base]], { fill: '#8a5a33' });
		} else {
			art.rect(ctx, x0, y0, DOOR_W, DOOR_H, { fill: '#8a5a33' });
			art.rect(ctx, x0 + 22, y0 + 24, DOOR_W - 44, DOOR_H / 2 - 40, { stroke: '#5e3a1e', lineWidth: 6 });
			art.rect(ctx, x0 + 22, y0 + DOOR_H / 2 + 6, DOOR_W - 44, DOOR_H / 2 - 40, { stroke: '#5e3a1e', lineWidth: 6 });
			art.circle(ctx, x0 + DOOR_W - 30, y0 + DOOR_H / 2, 10, { fill: '#c9a24a' });
		}
		// The sign: green while open (blinking as it's about to shut), red while shut.
		const closing = open && doorLeft() < 1.5;
		const lit = !closing || Math.sin(now * 20) > 0;
		art.roundRect(ctx, DOOR_X - 90, y0 - 100, 180, 64, 12, { fill: open ? (lit ? '#1fd46a' : '#0d4a26') : '#c8281e', shadow: { color: open ? 'rgba(60,255,140,0.8)' : 'rgba(255,60,40,0.7)', blur: 24 } });
		art.text(ctx, 'EXIT', DOOR_X, y0 - 67, { size: 48, font: 'Paytone One', fill: 'white' });
	}

	function drawLedge(ctx) {
		if (!exitShown()) return;
		const y = ledgeY();
		const open = doorOpen();
		// The balcony past the door is always there; the stretch round the corner slides out when the door opens.
		const balcony = DOOR_X - DOOR_W / 2 - 40;
		const slide = open ? Math.min(1, (DOOR_OPEN - doorLeft()) / 0.4) : 0;
		const x0 = mix(balcony, LEDGE_X0, slide);
		art.rect(ctx, balcony, y, BALCONY_X1 - balcony, 34, { fill: '#cfc6b4', shadow: { color: 'rgba(0,0,0,0.45)', blur: 12, y: 8 } });
		art.rect(ctx, balcony, y, BALCONY_X1 - balcony, 8, { fill: '#efe8d8' });
		for (let x = balcony + 60; x < BALCONY_X1; x += 220) art.poly(ctx, [[x - 6, y + 34], [x + 40, y + 34], [x - 6, y + 80]], { fill: '#a89f8c' });
		if (slide > 0) {
			art.rect(ctx, x0, y, balcony - x0, 34, { fill: '#e9dcc1', shadow: { color: 'rgba(0,0,0,0.45)', blur: 12, y: 8 } });
			art.rect(ctx, x0, y, balcony - x0, 8, { fill: '#fff6e0' });
			// Chevrons on the front wall's ledge pointing round the corner.
			for (let i = 0; i < 3; i++) {
				const cx = LEDGE_X0 - 120 + i * 50 + ((now * 60) % 50);
				art.line(ctx, [[cx - 14, y - 70], [cx + 10, y - 50], [cx - 14, y - 30]], { stroke: '#1fd46a', lineWidth: 10, alpha: 0.8 });
			}
		}
	}

	/* ---------- drawing: players ---------- */

	function drawRescue(ctx) {
		pl.forEach(function (p, n) {
			if (p.rescueUntil <= t || p.state !== 'play') return;
			const left = p.rescueUntil - t;
			if (left < 1.5 && Math.sin(now * 25) < 0) return;
			const m = meeps[n];
			const top = rescueTop(n);
			const w = 120;
			art.roundRect(ctx, m.x - w / 2, top, w, 44, 20, { fill: PLAYER_COLORS[n], stroke: 'white', lineWidth: 5, shadow: { color: 'rgba(0,0,0,0.4)', blur: 8, y: 4 } });
			art.circle(ctx, m.x, top + 20, 6, { fill: 'white' });
		});
	}

	function drawParticles(ctx) {
		for (const q of particles) {
			const k = q.life / q.max;
			if (q.kind === 'smoke') art.circle(ctx, q.x, q.y, q.r, { fill: `rgba(70,64,70,${0.7 * (1 - k)})` });
			else if (q.kind === 'steam') art.circle(ctx, q.x, q.y, q.r, { fill: `rgba(255,240,230,${0.35 * (1 - k)})` });
			else if (q.kind === 'ember') art.circle(ctx, q.x, q.y, q.r * (1 - k * 0.5), { fill: k < 0.5 ? '#fff0a0' : '#ff7a1c', alpha: 1 - k });
			else if (q.kind === 'chunk') art.with(ctx, { x: q.x, y: q.y, rotate: q.rot }, (ctx) => art.rect(ctx, -q.r / 2, -q.r / 2, q.r, q.r, { fill: q.color }));
		}
		for (const p of popups) {
			const k = p.life / 70;
			art.text(ctx, p.text, p.x, p.y - k * 80, { size: 70, font: 'Knewave', fill: p.color, outline: '#2a0a02', outlineWidth: 6, alpha: Math.min(1, (1 - k) * 2) });
		}
	}

	// A ghost of each burnt player, so they know where they'll come back.
	function drawGhosts(ctx) {
		pl.forEach(function (p, n) {
			if (p.state !== 'burnt') return;
			const k = (t - p.stateAt) / PENALTY;
			const x = p.tx;
			art.circle(ctx, x, rescueTop(n) - 80, 36, { fill: 'rgba(0,0,0,0)', stroke: PLAYER_COLORS[n], lineWidth: 8, alpha: 0.7 });
			art.save(ctx, function () {
				ctx.beginPath();
				ctx.arc(x, rescueTop(n) - 80, 36, -Math.PI / 2, -Math.PI / 2 + TAU * k);
				ctx.strokeStyle = 'white';
				ctx.lineWidth = 8;
				ctx.stroke();
			});
		});
	}

	/* ---------- draw (every animation frame) ---------- */

	self.draw = function (ctx) {
		drawRoom(ctx);
		drawLavaGlow(ctx);
		drawGauges(ctx);
		drawDoor(ctx);
		drawLava(ctx);
		drawPieces(ctx);
		drawLavaFront(ctx);
		drawLedge(ctx);
		drawRescue(ctx);
		for (const m of meeps) m.draw(ctx, 'body');
		drawSurge(ctx);
		drawGhosts(ctx);
		drawParticles(ctx);
		for (const m of meeps) m.draw(ctx, 'hands');
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		meeps.forEach(function (m, i) {
			const p = players[i];
			if (!p || p.px === undefined || isNaN(p.px)) return;
			pl[i].tx = W + clamp01(p.px) * W;
			pl[i].pz = clamp01(1 - p.pz);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	// Touching the exit door lets out whoever is nearest the corner.
	stage.$el.on('click.lava', function (e) {
		if (phase !== 'live' || !doorOpen()) return;
		const at = IGB.toWorld(e);
		if (Math.abs(at.x - DOOR_X) > DOOR_W / 2 + 60 || at.y < ledgeY() - DOOR_H - 120 || at.y > ledgeY() + 60) return;
		let best = -1;
		meeps.forEach(function (m, n) {
			if (pl[n].state !== 'play' || m.x < W + 0.8 * W) return;
			if (best < 0 || m.x > meeps[best].x) best = n;
		});
		if (best >= 0) escape(best);
	});

	self.state = function () {
		return {
			phase, t, surges, tide: tideY(),
			surging: isSurging(), warning: warnLevel() > 0, nextSurge, surgeAt,
			exit: exitShown(), doorOpen: doorOpen(), ledgeX: LEDGE_X0, door: { x: DOOR_X, y: ledgeY() - DOOR_H / 2 },
			pieces: pieces.map((p) => ({ id: p.id, kind: p.kind, x: p.x, w: p.w, left: pieceLeft(p), right: pieceRight(p), top: pieceTop(p), state: p.state, hazard: p.hazard })),
			players: meeps.map((m, n) => {
				const p = pl[n];
				return { x: m.x, y: m.y, state: p.state, on: p.on, airborne: !!p.airborne, wading: !!p.wading, burns: p.burns, jumps: p.jumps, survived: p.survived, rank: p.rank, score: m.score };
			}),
			scores: meeps.map((m) => m.score),
		};
	};

	// For tests: jump the game clock forward (the HUD timer keeps its own time).
	self.skipTo = function (seconds) {
		t = seconds;
		nextSurge = t + 2;
		surgeAt = -99;
		warned = false;
	};

	self.fini = function () {
		stage.$el.off('click.lava');
		hud.fini();
	};

	fillPieces();
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
