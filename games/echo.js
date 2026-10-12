/*
 * Echo
 *
 * A neon grid where your past self is both the obstacle and the tool. Each
 * player is a glowing orb on the front wall's track, 1:1 with where they
 * stand. Everything they do is recorded, and two seconds later their echo,
 * a translucent ghost in their colour, replays it on the row above them; the
 * glowing tail between ghost and orb is exactly where the echo is about to
 * go. The side walls are the history: the right wall shows everyone's echo
 * of 4 s ago, the left wall 8 s ago, each with the older trail streaming up
 * above it.
 *
 * Three phases, about a minute each:
 *   1. Dodge: pulses of light sweep down the front wall. Echoes are solid
 *      to pulses, so hiding under your own (or a teammate's) echo blocks
 *      one; stand still and your echo comes home to shelter you.
 *   2. Collect: sparks fall. Whatever your echo touches you collect too,
 *      so a good path scores twice.
 *   3. Don't cross: the echoes drop onto the track and touching ANY echo,
 *      your own included, zaps you. Keep moving; read the walls.
 *
 * Stepping towards the wall drops a beacon: your echo freezes where it is
 * for a few seconds as a fixed shield (one charge, recharging). Tapping your
 * echo on a side wall erases it: that stretch of trail goes dark and your
 * front-wall echo vanishes for a few seconds (three charges each).
 * Score: pulses survived + sparks collected (by you or your echo) + zap-free
 * beats in phase 3.
 *
 * Input: px (left / right on the front wall), pz (step towards the wall for
 * a beacon), touches on the side walls.
 */
IGB.register('echo', function EchoGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const DT = 1 / FPS;

	const PHASES = [
		{ name: 'Dodge', seconds: 55 },
		{ name: 'Collect', seconds: 50 },
		{ name: "Don't cross", seconds: 50 },
	];

	const PLAYER_Y = 870;       // the track the orbs run along
	const ECHO_Y = 650;         // the echo row above it (phases 1 and 2)
	const ORB_R = 38;
	const ECHO_DELAY = 2;       // seconds: the front-wall echo
	const RIGHT_DELAY = 4;      // the right wall's lane
	const LEFT_DELAY = 8;       // the left wall's lane
	const SIDE_SPAN = 4;        // seconds of older trail streaming up each side wall
	const SIDE_PXS = 190;       // side-wall px per second of history
	const HISTORY = LEFT_DELAY + SIDE_SPAN + 0.5;
	const MARGIN = 60;          // keep orbs off the front wall's edges

	const SHIELD = 105;         // half-width of the cover an echo gives from a pulse
	const PULSE_WARN = 0.9;     // seconds a pulse glows at the top before it drops
	const PULSE_SPEED = 430;    // px a second
	const PULSE_H = 30;

	const SPARK_CATCH = 72;
	const ZAP_DIST = 64;        // phase 3: orb centre to echo centre
	const ZAP_GRACE = 1.5;      // seconds of immunity after a zap
	const BEAT = 2;             // phase 3: a point every beat without a zap

	const BEACON_SECONDS = 4;
	const BEACON_RECHARGE = 10;
	const BEACON_IN = 0.22;     // pz below this drops a beacon...
	const BEACON_ARM = 0.4;     // ...once the player has been back past this
	const ERASE_CHARGES = 3;
	const ERASE_SECONDS = 3;
	const ERASE_HIT = 95;       // how close a tap must be to an echo's trail

	// Neon takes on the platform's player colours.
	const NEON = ['#ff3b5c', '#3d8bff', '#3dff7a', '#e04dff', '#ff8a24', '#ffd21f'];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-beats-120.mp3', 0.18, true);
	audio.add('drop', 'assets/shared/sfx-woosh.mp3', 0.15);
	audio.add('block', 'assets/shared/sfx-bounce.mp3', 0.25);
	audio.add('hit', 'assets/shared/sfx-incorrect.mp3', 0.3);
	audio.add('spark', 'assets/shared/sfx-point-e.mp3', 0.2);
	audio.add('echoSpark', 'assets/shared/sfx-point-g.mp3', 0.2);
	audio.add('zap', 'assets/shared/sfx-explode.mp3', 0.2);
	audio.add('beacon', 'assets/shared/sfx-charge.mp3', 0.25);
	audio.add('erase', 'assets/shared/sfx-reveal.mp3', 0.3);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.3);

	const hud = new HUD('#3ad1ff');
	hud.$el.appendTo(stage.$ui);

	const runners = [];   // one per player: position, history, echo, charges, tallies
	const pulses = [];
	const sparks = [];
	const bits = [];      // particles
	const popups = [];    // floating "+1"s
	let phase = -1;
	let isLive = false;
	let isOver = false;
	let testMode = false; // set by the test hooks: no scheduled spawns or phase ends
	let t = 0;
	let phaseStart = 0;
	let nextPulse = 0;
	let pulseCount = 0;
	let nextSpark = 0;
	let nextComet = 0;
	let nextBeat = 0;
	let echoY = ECHO_Y;   // drops to the track for phase 3
	let pulsesBlocked = 0;

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const x = W + (i + 1) / (count + 1) * W;
			runners.push({
				n: i, x, tx: x, pz: 0.5, armed: true,
				hist: [], echo: { x, active: true },
				frozen: null, beaconReady: 0, hiddenUntil: -1, erases: ERASE_CHARGES,
				hitFlash: -9, zapUntil: -9,
				survived: 0, sparks: 0, echoSparks: 0, avoided: 0, hits: 0, zaps: 0, zappedThisBeat: false,
				score: 0,
			});
		}
		hud.initPlayers(runners);
		audio.play('music');
		hud.initBanner('Echo');
		stage.timeout(hud.finiBanner, 2000);
		stage.timeout(() => startPhase(0), 2600);
	}

	function startPhase(n) {
		if (testMode) return;
		phase = n;
		pulses.length = 0;
		sparks.length = 0;
		hud.initRound(n, PHASES.length, PHASES[n].name);
		stage.timeout(hud.finiBanner, 2000);
		stage.timeout(function () {
			if (testMode) return;
			goLive();
			hud.initTimer(PHASES[n].seconds, endPhase);
		}, 2600);
	}

	function goLive() {
		isLive = true;
		phaseStart = t;
		nextPulse = t + 0.4;
		pulseCount = 0;
		nextSpark = t + 0.3;
		nextComet = t + 4;
		nextBeat = t + BEAT;
		for (const r of runners) r.zappedThisBeat = false;
	}

	function endPhase() {
		if (testMode) return;
		isLive = false;
		hud.finiTimer();
		stage.timeout(function () {
			if (testMode) return;
			if (phase < PHASES.length - 1) startPhase(phase + 1);
			else finiGame();
		}, 1500);
	}

	function finiGame() {
		isOver = true;
		hud.initBanner('Nice echoes!');
		audio.play('cheer', true);
		stage.timeout(function () {
			hud.finiBanner();
			audio.stop('music');
			const scores = runners.map((r) => r.score);
			const rewards = scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);
			stage.timeout(() => IGB.complete(rewards), 5000);
		}, 2600);
	}

	/* ---------- history ---------- */

	// Where runner r was tau seconds ago, as a sample { x, erased }.
	function sampleAt(r, tau) {
		const h = r.hist;
		if (!h.length) return { x: r.x, erased: false };
		const i = Math.max(0, h.length - 1 - Math.round(tau / DT));
		return h[i];
	}

	function updateEcho(r) {
		if (r.frozen && t >= r.frozen.until) r.frozen = null;
		const s = sampleAt(r, ECHO_DELAY);
		r.echo.x = r.frozen ? r.frozen.x : s.x;
		r.echo.active = t >= r.hiddenUntil;
	}

	const activeEchoes = () => runners.filter((r) => r.echo.active).map((r) => r.echo.x);

	/* ---------- scoring ---------- */

	function award(r, kind, x, y, colour) {
		r[kind]++;
		r.score++;
		popups.push({ text: '+1', x, y, life: 0, color: colour || NEON[r.n] });
	}

	function burst(x, y, colour, count, speed) {
		for (let i = 0; i < count; i++) {
			const a = Math.random() * Math.PI * 2;
			const v = speed * (0.4 + Math.random() * 0.6);
			bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.4 + Math.random() * 0.4, color: colour });
		}
	}

	/* ---------- phase 1: pulses ---------- */

	// A sweep of light: one or more horizontal segments of the front wall.
	function spawnPulse(segs) {
		pulses.push({ segs: segs.map((s) => s.slice()), y: 40, born: t, falling: false, cut: false, hit: false, full: segs.length === 1 && segs[0][1] - segs[0][0] >= W - 1 });
	}

	function schedulePulse() {
		const k = pulseCount++;
		const L = W;
		const R = 2 * W;
		// Every third pulse spans the whole wall: only an echo can save you.
		if (k % 3 === 2) spawnPulse([[L, R]]);
		else if (k % 3 === 0) {
			const w = 500 + Math.random() * 400;
			const a = L + Math.random() * (W - w);
			spawnPulse([[a, a + w]]);
		} else {
			// The whole wall but for a gap to run to.
			const g = 320;
			const a = L + 150 + Math.random() * (W - 300 - g);
			spawnPulse([[L, a], [a + g, R]]);
		}
		const elapsed = t - phaseStart;
		nextPulse = t + Math.max(2.4, 3.4 - elapsed * 0.02);
	}

	// Remove [a, b] from a list of segments.
	function subtract(segs, a, b) {
		const out = [];
		for (const [s, e] of segs) {
			if (b <= s || a >= e) { out.push([s, e]); continue; }
			if (a > s) out.push([s, a]);
			if (b < e) out.push([b, e]);
		}
		return out;
	}

	function stepPulse(p) {
		if (!p.falling) {
			if (t - p.born >= PULSE_WARN) { p.falling = true; audio.play('drop', true); }
			return;
		}
		const prev = p.y;
		p.y += PULSE_SPEED * DT;
		// Echoes are solid: the pulse shatters where it meets one.
		if (!p.cut && prev < echoY && p.y >= echoY) {
			p.cut = true;
			let blocked = false;
			for (const r of runners) {
				if (!r.echo.active) continue;
				const before = p.segs.reduce((n, s) => n + s[1] - s[0], 0);
				p.segs = subtract(p.segs, r.echo.x - SHIELD, r.echo.x + SHIELD);
				const after = p.segs.reduce((n, s) => n + s[1] - s[0], 0);
				if (after < before) {
					blocked = true;
					burst(r.echo.x, echoY, NEON[r.n], 14, 380);
					burst(r.echo.x, echoY, '#ffffff', 6, 260);
				}
			}
			if (blocked) { pulsesBlocked++; audio.play('block', true); }
		}
		if (!p.hit && prev < PLAYER_Y && p.y >= PLAYER_Y) {
			p.hit = true;
			for (const r of runners) {
				const struck = p.segs.some(([a, b]) => r.x > a - ORB_R * 0.5 && r.x < b + ORB_R * 0.5);
				if (struck) {
					r.hits++;
					r.hitFlash = t;
					burst(r.x, PLAYER_Y, '#ffffff', 18, 500);
					audio.play('hit', true);
				} else if (isLive) {
					award(r, 'survived', r.x, PLAYER_Y - 80);
				}
			}
		}
	}

	/* ---------- phase 2: sparks ---------- */

	function spawnSpark(x, y, vy) {
		sparks.push({ x, y: y === undefined ? -20 : y, vy: vy || 240 + Math.random() * 130, spin: Math.random() * 6, gone: false });
	}

	function stepSpark(s) {
		const prev = s.y;
		s.y += s.vy * DT;
		s.spin += DT * 3;
		// The echo row first: whatever your echo touches, you collect.
		if (phase === 1 && prev < echoY + 30 && s.y >= echoY - 30) {
			for (const r of runners) {
				if (s.gone || !r.echo.active || Math.abs(s.x - r.echo.x) > SPARK_CATCH) continue;
				s.gone = true;
				award(r, 'sparks', r.echo.x, echoY - 70);
				r.echoSparks++;
				burst(s.x, echoY, NEON[r.n], 12, 300);
				audio.play('echoSpark', true);
			}
		}
		if (!s.gone && Math.abs(s.y - (PLAYER_Y - 10)) < 40) {
			for (const r of runners) {
				if (s.gone || Math.abs(s.x - r.x) > SPARK_CATCH) continue;
				s.gone = true;
				award(r, 'sparks', r.x, PLAYER_Y - 90);
				burst(s.x, PLAYER_Y, '#fff3a0', 12, 300);
				audio.play('spark', true);
			}
		}
		if (s.y > H + 40) s.gone = true;
	}

	/* ---------- phase 3: zaps ---------- */

	function stepZaps() {
		for (const r of runners) {
			if (t < r.zapUntil) continue;
			for (const o of runners) {
				if (!o.echo.active || Math.abs(o.echo.x - r.x) > ZAP_DIST) continue;
				r.zaps++;
				r.zapUntil = t + ZAP_GRACE;
				r.zappedThisBeat = true;
				burst(r.x, PLAYER_Y, NEON[o.n], 20, 520);
				burst(r.x, PLAYER_Y, '#ffffff', 10, 320);
				audio.play('zap', true);
				break;
			}
		}
		if (t >= nextBeat) {
			nextBeat += BEAT;
			for (const r of runners) {
				if (!r.zappedThisBeat) award(r, 'avoided', r.x, PLAYER_Y - 90);
				r.zappedThisBeat = false;
			}
		}
	}

	/* ---------- every tick ---------- */

	function step() {
		if (!runners.length) return;
		t += DT;

		for (const r of runners) {
			r.x += (r.tx - r.x) * 0.5;
			r.hist.push({ x: r.x, erased: false });
			if (r.hist.length > HISTORY * FPS) r.hist.shift();

			// Step towards the wall: the echo freezes as a beacon.
			if (r.pz > BEACON_ARM) r.armed = true;
			if (r.armed && r.pz < BEACON_IN && t >= r.beaconReady && phase >= 0) {
				r.armed = false;
				updateEcho(r);
				r.frozen = { x: r.echo.x, until: t + BEACON_SECONDS };
				r.beaconReady = t + BEACON_RECHARGE;
				burst(r.echo.x, echoY, NEON[r.n], 16, 300);
				audio.play('beacon', true);
			}
			updateEcho(r);
		}

		// The echo row sinks onto the track for phase 3.
		const wantY = phase === 2 ? PLAYER_Y : ECHO_Y;
		echoY += (wantY - echoY) * 0.04;
		if (Math.abs(wantY - echoY) < 1) echoY = wantY;

		if (isLive && !testMode) {
			if (phase === 0 && t >= nextPulse) schedulePulse();
			if (phase === 1 && t >= nextSpark) {
				spawnSpark(W + 60 + Math.random() * (W - 120));
				nextSpark = t + 1 / (0.9 + 0.35 * runners.length);
			}
			if (phase === 1 && t >= nextComet) {
				// A diagonal string of sparks: plan a path along it.
				const dir = Math.random() < 0.5 ? 1 : -1;
				const x0 = dir > 0 ? W + 200 : 2 * W - 200;
				for (let i = 0; i < 7; i++) spawnSpark(x0 + dir * i * 170, -20 - i * 110, 300);
				nextComet = t + 7;
			}
		}
		if (isLive && phase === 2) stepZaps();

		for (const p of pulses) stepPulse(p);
		for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].y > H + 60) pulses.splice(i, 1);
		for (const s of sparks) stepSpark(s);
		for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].gone) sparks.splice(i, 1);

		for (const b of bits) { b.x += b.vx * DT; b.y += b.vy * DT; b.vx *= 0.94; b.vy *= 0.94; b.life += DT; }
		for (let i = bits.length - 1; i >= 0; i--) if (bits[i].life > bits[i].max) bits.splice(i, 1);
		for (const p of popups) p.life += DT;
		for (let i = popups.length - 1; i >= 0; i--) if (popups[i].life > 1) popups.splice(i, 1);

		hud.updatePlayers(runners);
	}

	/* ---------- touch: erase an echo on a side wall ---------- */

	// A side wall's lane: the delay at its bottom row, and where a moment of
	// history (tau seconds ago, px across) is drawn on it.
	function sideWall(wall) {
		const delay = wall === 0 ? LEFT_DELAY : RIGHT_DELAY;
		const x0 = wall === 0 ? 0 : 2 * W;
		return {
			delay, x0,
			at: (tau, frontX) => ({ x: x0 + (frontX - W), y: PLAYER_Y - (tau - delay) * SIDE_PXS }),
		};
	}

	function touch(at) {
		if (!runners.length || at.y < 0 || at.y > H) return;
		const wall = at.x < W ? 0 : at.x >= 2 * W ? 2 : 1;
		if (wall === 1) return;
		const side = sideWall(wall);
		const tau = clamp(side.delay + (PLAYER_Y - at.y) / SIDE_PXS, side.delay, side.delay + SIDE_SPAN);
		let best = null;
		let bestD = ERASE_HIT;
		for (const r of runners) {
			const s = sampleAt(r, tau);
			if (s.erased) continue;
			const d = Math.abs(side.at(tau, s.x).x - at.x);
			if (d < bestD) { best = r; bestD = d; }
		}
		if (!best || best.erases <= 0) return;
		best.erases--;
		for (let k = -0.8; k <= 0.8; k += DT) sampleAt(best, tau + k).erased = true;
		best.hiddenUntil = t + ERASE_SECONDS;
		best.frozen = null;
		const p = side.at(tau, sampleAt(best, tau).x);
		burst(p.x, p.y, NEON[best.n], 24, 420);
		burst(best.echo.x, echoY, NEON[best.n], 16, 300);
		audio.play('erase', true);
	}

	stage.$el.on('click.echo', (e) => touch(IGB.toWorld(e)));

	/* ---------- drawing ---------- */

	// The grid never changes: paint it once.
	let backdrop = null;
	function makeBackdrop() {
		const c = document.createElement('canvas');
		c.width = 2400;
		c.height = 500;
		const g = c.getContext('2d');
		g.scale(0.5, 0.5);
		for (let n = 0; n < 3; n++) {
			const x0 = n * W;
			g.save();
			g.translate(x0, 0);
			g.fillStyle = art.linear(g, 0, 0, 0, H, ['#04040d', '#0a0822', '#1a0a33', '#2a0a3a']);
			g.fillRect(0, 0, W, H);
			// Faint upright grid.
			g.strokeStyle = 'rgba(58,209,255,0.07)';
			g.lineWidth = 2;
			for (let x = 0; x <= W; x += 100) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
			for (let y = 0; y <= H; y += 100) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
			// A perspective floor under the track.
			const top = PLAYER_Y + 45;
			g.fillStyle = art.linear(g, 0, top, 0, H, ['rgba(255,40,180,0.18)', 'rgba(20,0,40,0.9)']);
			g.fillRect(0, top, W, H - top);
			g.strokeStyle = 'rgba(255,60,200,0.35)';
			g.lineWidth = 2;
			for (let i = -12; i <= 12; i++) {
				g.beginPath();
				g.moveTo(W / 2 + i * 70, top);
				g.lineTo(W / 2 + i * 260, H);
				g.stroke();
			}
			for (let k = 0; k < 5; k++) {
				const y = top + (H - top) * Math.pow(k / 4, 1.6);
				g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
			}
			// The track itself.
			g.shadowColor = '#ff3ad1';
			g.shadowBlur = 24;
			g.fillStyle = '#ff6ae0';
			g.fillRect(0, top - 3, W, 5);
			g.shadowBlur = 0;
			g.restore();
		}
		// The emitter along the top of the front wall.
		g.fillStyle = art.linear(g, 0, 0, 0, 70, ['rgba(58,209,255,0.35)', 'rgba(58,209,255,0)']);
		g.fillRect(W, 0, W, 70);
		// Corners between the walls.
		g.fillStyle = 'rgba(58,209,255,0.25)';
		g.fillRect(W - 2, 0, 4, H);
		g.fillRect(2 * W - 2, 0, 4, H);
		return c;
	}

	// A neon stroke: a wide soft glow under a bright core.
	function glowLine(ctx, pts, colour, width, alpha) {
		if (pts.length < 2) return;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(pts[0].x, pts[0].y);
		for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
		ctx.strokeStyle = colour;
		ctx.globalAlpha = 0.18 * alpha;
		ctx.lineWidth = width * 4;
		ctx.stroke();
		ctx.globalAlpha = 0.35 * alpha;
		ctx.lineWidth = width * 2;
		ctx.stroke();
		ctx.globalAlpha = 0.95 * alpha;
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = width * 0.45;
		ctx.stroke();
		ctx.globalAlpha = 0.9 * alpha;
		ctx.strokeStyle = colour;
		ctx.lineWidth = width;
		ctx.globalCompositeOperation = 'source-over';
		ctx.restore();
	}

	// A trail through history from tau0 to tau1 seconds ago, broken where
	// it was erased. place(tau, x) maps a sample to a point.
	function drawTrail(ctx, r, tau0, tau1, place, width, alpha) {
		let run = [];
		const stride = 3 * DT;
		for (let tau = tau0; tau <= tau1 + 1e-6; tau += stride) {
			if (tau / DT > r.hist.length) break;
			const s = sampleAt(r, tau);
			if (s.erased) { glowLine(ctx, run, NEON[r.n], width, alpha); run = []; continue; }
			run.push(place(tau, s.x));
		}
		glowLine(ctx, run, NEON[r.n], width, alpha);
	}

	function glowOrb(ctx, x, y, rad, colour, alpha, core) {
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = alpha;
		ctx.fillStyle = art.radial(ctx, x, y, 0, rad * 2.6, [colour, 'rgba(0,0,0,0)']);
		ctx.beginPath();
		ctx.arc(x, y, rad * 2.6, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		art.circle(ctx, x, y, rad, { fill: colour, alpha: alpha * 0.85 });
		if (core) art.circle(ctx, x, y, rad * 0.55, { fill: '#ffffff', alpha: alpha * core });
	}

	function drawSideWall(ctx, wall, now) {
		const side = sideWall(wall);
		// History streams up the wall, older towards the top.
		for (const r of runners) {
			drawTrail(ctx, r, side.delay, side.delay + SIDE_SPAN, side.at, 9, 0.75);
		}
		// The lane: everyone's echo of `delay` seconds ago.
		for (const r of runners) {
			const s = sampleAt(r, side.delay);
			if (s.erased) continue;
			const p = side.at(side.delay, s.x);
			glowOrb(ctx, p.x, p.y, 30, NEON[r.n], 0.55, 0.5);
		}
		art.text(ctx, `−${side.delay}s`, side.x0 + W / 2, 70, { size: 54, font: 'Rubik', weight: 700, fill: 'rgba(58,209,255,0.55)' });
		// Erase charges, under each echo of the lane.
		for (const r of runners) {
			const s = sampleAt(r, side.delay);
			const p = side.at(side.delay, s.x);
			for (let k = 0; k < r.erases; k++) {
				art.circle(ctx, p.x + (k - 1) * 22, PLAYER_Y + 72, 7, { fill: NEON[r.n], alpha: 0.6 });
			}
		}
	}

	function drawPulse(ctx, p, now) {
		if (!p.falling) {
			// Warning: the sweep gathers at the top.
			const k = (t - p.born) / PULSE_WARN;
			for (const [a, b] of p.segs) {
				art.rect(ctx, a, 30, b - a, 20, { fill: '#7ff3ff', alpha: 0.25 + 0.55 * Math.abs(Math.sin(k * Math.PI * 3)) });
			}
			return;
		}
		// Spent once it has crossed the track: fade into the floor.
		const fade = clamp(1 - (p.y - PLAYER_Y) / 120, 0, 1);
		if (fade <= 0) return;
		ctx.save();
		ctx.globalAlpha = fade;
		for (const [a, b] of p.segs) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = art.linear(ctx, 0, p.y - 140, 0, p.y, ['rgba(58,209,255,0)', 'rgba(58,209,255,0.35)']);
			ctx.fillRect(a, p.y - 140, b - a, 140);
			ctx.restore();
			art.rect(ctx, a, p.y - PULSE_H / 2, b - a, PULSE_H, { fill: '#9ff6ff', shadow: { color: '#3ad1ff', blur: 30 } });
			art.rect(ctx, a, p.y - 4, b - a, 8, { fill: '#ffffff' });
		}
		ctx.restore();
	}

	function drawSpark(ctx, s) {
		ctx.save();
		ctx.translate(s.x, s.y);
		ctx.rotate(s.spin);
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = art.radial(ctx, 0, 0, 0, 60, ['rgba(255,230,120,0.8)', 'rgba(255,200,60,0)']);
		ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
		ctx.restore();
		art.with(ctx, { x: s.x, y: s.y, rotate: s.spin * 57 }, () => {
			art.poly(ctx, [[0, -30], [8, -8], [30, 0], [8, 8], [0, 30], [-8, 8], [-30, 0], [-8, -8]], { fill: '#fff6c0' });
		});
	}

	function drawEcho(ctx, r, now) {
		if (!r.echo.active) {
			// Erased: a dim outline flickers where it would be.
			art.circle(ctx, r.echo.x, echoY, ORB_R, { stroke: NEON[r.n], lineWidth: 3, alpha: 0.15 + 0.1 * Math.sin(now * 20), dash: [8, 10] });
			return;
		}
		const x = r.echo.x;
		const danger = phase === 2;
		if (phase === 0) {
			// The shelter it casts down to the track.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.16;
			ctx.fillStyle = art.linear(ctx, 0, echoY, 0, PLAYER_Y + 40, [NEON[r.n], 'rgba(0,0,0,0)']);
			ctx.fillRect(x - SHIELD, echoY - ORB_R - 17, SHIELD * 2, PLAYER_Y + 40 - echoY + ORB_R + 17);
			ctx.restore();
		}
		glowOrb(ctx, x, echoY, ORB_R, NEON[r.n], danger ? 0.7 : 0.45, danger ? 0.25 : 0.4);
		// A shield bar over it: the cover it gives from a pulse.
		if (phase <= 1 || echoY < PLAYER_Y - 50) {
			art.roundRect(ctx, x - SHIELD, echoY - ORB_R - 22, SHIELD * 2, 10, 5, { fill: NEON[r.n], alpha: 0.6, shadow: { color: NEON[r.n], blur: 18 } });
		}
		if (danger) {
			// Crackling ring: don't touch.
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = '#ffffff';
			ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 25 + r.n);
			ctx.lineWidth = 4;
			ctx.setLineDash([14, 10]);
			ctx.lineDashOffset = now * 80;
			ctx.beginPath(); ctx.arc(x, echoY, ORB_R + 14, 0, Math.PI * 2); ctx.stroke();
			ctx.restore();
		}
		if (r.frozen) {
			// A beacon: a diamond frame and the time it has left.
			const k = (r.frozen.until - t) / BEACON_SECONDS;
			art.poly(ctx, [[x, echoY - 70], [x + 70, echoY], [x, echoY + 70], [x - 70, echoY]], { stroke: '#ffffff', lineWidth: 4, alpha: 0.8 });
			ctx.save();
			ctx.strokeStyle = NEON[r.n];
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(x, echoY, ORB_R + 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
			ctx.stroke();
			ctx.restore();
		}
	}

	function drawRunner(ctx, r, now) {
		const hit = t - r.hitFlash < 0.5;
		const zapped = t < r.zapUntil;
		const flicker = zapped ? (Math.sin(now * 40) > 0 ? 0.35 : 1) : 1;
		// A short light-cycle streak behind the orb.
		drawTrail(ctx, r, 0, 0.35, (tau, x) => ({ x, y: PLAYER_Y }), 14, 0.8 * flicker);
		glowOrb(ctx, r.x, PLAYER_Y, ORB_R + 4, hit ? '#ffffff' : NEON[r.n], flicker, 0.9);
		// Beacon ready: a small diamond under the orb.
		if (t >= r.beaconReady) {
			const y = PLAYER_Y + 74;
			art.poly(ctx, [[r.x, y - 12], [r.x + 12, y], [r.x, y + 12], [r.x - 12, y]], { fill: '#ffffff', alpha: 0.8 });
		}
	}

	self.draw = function (ctx) {
		const now = performance.now() / 1000;
		if (!backdrop) backdrop = makeBackdrop();
		ctx.drawImage(backdrop, 0, 0, IGB.WIDTH, H);
		if (!runners.length) return;

		drawSideWall(ctx, 0, now);
		drawSideWall(ctx, 2, now);

		// Front wall: the tail between echo and orb is where the echo goes next.
		ctx.save();
		ctx.beginPath();
		ctx.rect(W, 0, W, H);
		ctx.clip();
		if (echoY < PLAYER_Y - 40) {
			for (const r of runners) {
				drawTrail(ctx, r, 0, ECHO_DELAY, (tau, x) => ({ x, y: PLAYER_Y - (tau / ECHO_DELAY) * (PLAYER_Y - echoY) }), 7, 0.55);
			}
		} else {
			// Phase 3: every echo's past streams up the wall above it, and its
			// next two seconds lie along the track.
			const k = clamp((echoY - (PLAYER_Y - 40)) / 40, 0, 1);
			for (const r of runners) {
				drawTrail(ctx, r, ECHO_DELAY, ECHO_DELAY + 6, (tau, x) => ({ x, y: PLAYER_Y - (tau - ECHO_DELAY) * 125 }), 6, 0.35 * k);
				drawTrail(ctx, r, 0.35, ECHO_DELAY, (tau, x) => ({ x, y: PLAYER_Y }), 4, 0.4 * k);
			}
		}
		art.text(ctx, `−${ECHO_DELAY}s`, W + 70, echoY - 70, { size: 40, font: 'Rubik', weight: 700, fill: 'rgba(58,209,255,0.5)' });
		for (const p of pulses) drawPulse(ctx, p, now);
		for (const r of runners) drawEcho(ctx, r, now);
		for (const s of sparks) drawSpark(ctx, s);
		for (const r of runners) drawRunner(ctx, r, now);
		ctx.restore();

		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const b of bits) {
			ctx.globalAlpha = 1 - b.life / b.max;
			ctx.fillStyle = b.color;
			ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
		}
		ctx.restore();
		for (const p of popups) {
			art.text(ctx, p.text, p.x, p.y - p.life * 70, { size: 56, font: 'Rubik', weight: 800, fill: p.color, outline: '#05040f', outlineWidth: 6, alpha: Math.min(1, (1 - p.life) * 2) });
		}
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		runners.forEach(function (r, i) {
			const p = players[i];
			if (!p || !isFinite(p.px)) return;
			r.tx = W + clamp(clamp(p.px, 0, 1) * W, MARGIN, W - MARGIN);
			if (isFinite(p.pz)) r.pz = clamp(1 - p.pz, 0, 1);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	self.state = function () {
		return {
			phase, live: isLive, over: isOver, t, echoY, pulsesBlocked,
			pulses: pulses.map((p) => ({ y: p.y, segs: p.segs, falling: p.falling, cut: p.cut, hit: p.hit })),
			sparks: sparks.map((s) => ({ x: s.x, y: s.y })),
			players: runners.map((r) => ({
				x: r.x, echoX: r.echo.x, echoActive: r.echo.active, frozen: !!r.frozen,
				beaconReady: t >= r.beaconReady, erases: r.erases,
				survived: r.survived, hits: r.hits, sparks: r.sparks, echoSparks: r.echoSparks,
				avoided: r.avoided, zaps: r.zaps, score: r.score,
				right: sideWall(2).at(RIGHT_DELAY, sampleAt(r, RIGHT_DELAY).x),
				left: sideWall(0).at(LEFT_DELAY, sampleAt(r, LEFT_DELAY).x),
			})),
			scores: runners.map((r) => r.score),
		};
	};

	// Hooks for tools/echo.mjs: jump to a phase with nothing scheduled, and
	// place hazards by hand.
	self.test = {
		phase(n) {
			testMode = true;
			hud.finiTimer();
			phase = n;
			pulses.length = 0;
			sparks.length = 0;
			goLive();
		},
		pulse(segs) { spawnPulse(segs || [[W, 2 * W]]); },
		spark(x, y) { spawnSpark(x, y, 300); },
	};

	self.fini = function () {
		stage.$el.off('click.echo');
		hud.fini();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
