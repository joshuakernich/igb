/*
 * Golden
 *
 * An idol concert. The front wall is the stage and every player is a
 * performer on it, standing exactly where they stand across the room. On
 * the beat of the music, formation marks light up on the stage floor, one
 * in each player's colour: a line, everyone to the left, pairs, a mirror
 * swap where performers cross over, and so on. Each mark appears as a ghost
 * with a countdown ring a few beats early; be on your own mark on the
 * downbeat to score, and when everyone is on, the stage flashes. Star marks
 * sit on the front edge of the stage: step towards the wall to strike a
 * pose. The side walls are the crowd, whose lightsticks glow in the colours
 * of the performers hitting their marks; fan banners pop up among them, and
 * touching one catches a gift. In the bridge, spotlights sweep the stage for
 * solo points. The formations get faster towards the finale, where everyone
 * on their mark on the last beat makes the whole room burst gold.
 *
 * The beat clock follows the music's own playback time, so the marks stay
 * locked to what players hear.
 *
 * Input: px (left / right: your place on the stage), pz (step towards the
 * wall to pose), touches on the side walls (fan gifts).
 */
IGB.register('golden', function GoldenGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const FPS = 50;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const MUSIC = 'assets/shared/music-beats-120.mp3';
	const BPM = 120;
	const BPS = BPM / 60;       // beats a second
	const OFFSET = 0.13;        // seconds into the track of its first downbeat
	const LOOP_BEATS = 144;     // the track is looped after 36 bars (72 s)
	const TOL = 0.065;          // a mark catches this far either side (fraction of the wall)
	const TOL_LOOSE = 0.11;     // in the bridge, formations are loose
	const TOL_FINALE = 0.08;
	const EARLY = 0.5;          // beats before the downbeat that already count
	const LATE = 0.35;          // and after it
	const POSE_Z = 0.42;        // closer to the wall than this is striking a pose
	const PTS = { mark: 10, pose: 15, allOn: 5, solo: 2, gift: 25, finale: 30, golden: 20 };
	const SPOT_R = 0.075;       // a spotlight's radius on the floor (fraction of the wall)
	const BRIDGE = [144, 212];  // beats with spotlights
	const GIFTS = [84, 320];    // beats when fan banners may pop up
	const GIFT_GAP = [10, 18];  // beats between banners
	const GIFT_LIFE = 8;        // beats a banner stays up
	const FINAL_BEAT = 336;
	const END_BEAT = 346;

	// The stage floor: feet at the back of the room stand at STAGE_BACK,
	// right up at the wall at STAGE_FRONT (downstage, bigger).
	const STAGE_BACK = 770;
	const STAGE_FRONT = 955;
	const SCALE_BACK = 0.62;
	const SCALE_FRONT = 0.86;
	const POSE_LINE = depthY(POSE_Z);
	const POSE_MARK_Y = depthY(0.17);
	const FLOOR_TOP = 700;

	const PINK = '#ff4fa8';
	const GOLD = '#ffcf3f';
	const GOLDS = ['#ffd84a', '#ffcf3f', '#fff1a8', '#f5b700', '#ffe27a', '#ff8fd0'];

	const audio = stage.audio();
	audio.add('music', MUSIC, 0.55);
	audio.add('allon', 'assets/shared/sfx-correct-echo.mp3', 0.25);
	audio.add('pose', 'assets/shared/sfx-woosh.mp3', 0.25);
	audio.add('gift', 'assets/shared/sfx-coin.mp3', 0.35);
	audio.add('pop', 'assets/shared/sfx-pickup.mp3', 0.2);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.45);
	audio.add('reveal', 'assets/shared/sfx-reveal.mp3', 0.35);
	audio.add('tick', 'assets/shared/sfx-tick.mp3', 0.25);

	const hud = new HUD(GOLD);
	hud.$el.appendTo(stage.$ui);

	/* ---------- state ---------- */

	const meeps = [];
	const perf = [];            // per player: tracking, pose and tallies
	let plan = [];              // every formation, in order
	const fans = [[], []];      // crowd on the left and right walls
	const gifts = [];
	const particles = [];
	const popups = [];
	let count = 0;
	let playing = false;
	let isOver = false;
	let beat = -OFFSET * BPS;   // song position in beats; beat 0 is the first downbeat
	let pass = 0;               // times the track has looped
	let lastWall = performance.now() / 1000;
	let lastTry = 0;
	let lastBeatInt = -1;
	let hype = 0;
	let flash = 0;
	let allOnCount = 0;
	let golden = null;          // set at the finale: did everyone make it?
	let nextGift = GIFTS[0];
	let goldenGlow = 0;

	function depthY(pz) {
		return STAGE_FRONT + (STAGE_BACK - STAGE_FRONT) * pz;
	}

	function depthScale(pz) {
		return SCALE_FRONT + (SCALE_BACK - SCALE_FRONT) * pz;
	}

	const rand = (a, b) => a + Math.random() * (b - a);
	const clampPx = (x) => Math.max(0.05, Math.min(0.95, x));

	/* ---------- the beat clock ---------- */

	// Song position in beats. It runs on the wall clock, but while the music
	// plays it follows the track's own currentTime, so it stays locked to
	// what players hear. The track loops by jumping back one loop's length.
	function syncClock() {
		const now = performance.now() / 1000;
		const dt = Math.min(0.25, Math.max(0, now - lastWall));
		lastWall = now;
		if (!playing) return;
		let b = beat + dt * BPS;
		const el = audio.get('music');
		if (el && !isOver) {
			if (!el.paused && !el.seeking && el.readyState >= 3) {
				const loopEnd = OFFSET + LOOP_BEATS / BPS;
				if (el.currentTime >= loopEnd) {
					el.currentTime -= LOOP_BEATS / BPS;
					pass++;
				}
				const ab = pass * LOOP_BEATS + (el.currentTime - OFFSET) * BPS;
				if (Math.abs(ab - b) < 1.5) b = Math.max(beat, ab);
				else seekMusic(b);
			} else if (el.paused && now - lastTry > 1) {
				// Not playing yet (or blocked): start it where the show is.
				lastTry = now;
				seekMusic(b);
				audio.play('music');
			}
		}
		beat = b;
	}

	function seekMusic(b) {
		const el = audio.get('music');
		if (!el) return;
		pass = Math.max(0, Math.floor(b / LOOP_BEATS));
		try { el.currentTime = Math.max(0, OFFSET + (b - pass * LOOP_BEATS) / BPS); } catch (e) { /* not loaded yet */ }
	}

	/* ---------- formations ---------- */

	// Evenly spaced slots for n performers between lo and hi.
	function slots(n, lo, hi) {
		return Array.from({ length: n }, (_, i) => lo + (i + 0.5) * (hi - lo) / n);
	}

	// Players in their current left-to-right order.
	function orderOf(prev) {
		return prev.map((x, i) => i).sort((a, b) => prev[a] - prev[b]);
	}

	// Give the k-th player from the left the k-th slot.
	function keepOrder(prev, s) {
		const xs = [];
		orderOf(prev).forEach((p, k) => { xs[p] = s[k]; });
		return xs;
	}

	// Where each player's mark goes for a kind of formation, given the
	// previous one.
	function layout(kind, n, prev) {
		const line = slots(n, 0.04, 0.96);
		const group = Math.min(0.9, Math.max(0.3, n * 0.11));
		let xs;
		switch (kind) {
		case 'line':
		case 'finale':
		case 'V':
			xs = line.slice();
			break;
		case 'reverse':
			xs = line.slice().reverse();
			break;
		case 'left':
			xs = keepOrder(prev, slots(n, 0.04, 0.04 + group));
			break;
		case 'right':
			xs = keepOrder(prev, slots(n, 0.96 - group, 0.96));
			break;
		case 'center':
			xs = keepOrder(prev, slots(n, 0.5 - group / 2, 0.5 + group / 2));
			break;
		case 'pairs': {
			// Partners side by side, the pairs spread out.
			const k = Math.ceil(n / 2);
			const centres = slots(k, 0.06, 0.94);
			const s = [];
			for (let i = 0; i < n; i++) {
				const c = centres[Math.floor(i / 2)];
				const alone = i === n - 1 && n % 2 === 1;
				s.push(alone ? c : c + (i % 2 ? 0.065 : -0.065));
			}
			xs = keepOrder(prev, s);
			break;
		}
		case 'split': {
			const a = Math.ceil(n / 2);
			const s = slots(a, 0.04, 0.4).concat(slots(n - a, 0.6, 0.96));
			xs = keepOrder(prev, s);
			break;
		}
		case 'mirror':
			// Everyone crosses to the opposite side: neighbours swap over.
			xs = prev.map((x) => 1 - x);
			break;
		case 'swap': {
			// Two neighbours (two pairs, in a bigger squad) trade places.
			xs = prev.slice();
			const o = orderOf(prev);
			if (n < 2) { xs = [1 - prev[0]]; break; }
			const k = Math.floor(Math.random() * (n - 1));
			[xs[o[k]], xs[o[k + 1]]] = [xs[o[k + 1]], xs[o[k]]];
			if (n >= 4) {
				const j = (k + 2 + Math.floor(Math.random() * (n - 3))) % (n - 1);
				if (Math.abs(j - k) > 1) [xs[o[j]], xs[o[j + 1]]] = [xs[o[j + 1]], xs[o[j]]];
			}
			break;
		}
		case 'slide': {
			// The whole formation steps sideways.
			const lo = Math.min(...prev);
			const hi = Math.max(...prev);
			let d = Math.random() < 0.5 ? -0.17 : 0.17;
			if (lo + d < 0.05 || hi + d > 0.95) d = -d;
			if (lo + d < 0.05 || hi + d > 0.95) d = lo > 1 - hi ? 0.05 - lo : 0.95 - hi;
			xs = prev.map((x) => x + d);
			break;
		}
		case 'shuffle':
		default: {
			let perm;
			for (let tries = 0; tries < 8; tries++) {
				perm = shuffleArray(line.slice());
				if (n < 2 || perm.some((x, i) => Math.abs(x - prev[i]) > 0.05)) break;
			}
			xs = perm;
		}
		}
		return xs.map(clampPx);
	}

	// The whole show, beat by beat.
	function buildPlan(n) {
		const out = [];
		let prev = layout('line', n, null);
		function add(hit, kind, o = {}) {
			const xs = layout(kind, n, prev);
			prev = xs;
			// A V: the middle performers step forward to its point.
			let middle = new Set();
			if (kind === 'V') {
				const ord = orderOf(xs);
				middle = new Set(n <= 2 ? ord : n % 2 ? [ord[(n - 1) / 2]] : [ord[n / 2 - 1], ord[n / 2]]);
			}
			out.push({
				hit, kind,
				lead: o.lead || 4,
				tol: o.tol || TOL,
				finale: !!o.finale,
				marks: xs.map((px, i) => ({ n: i, px, pose: !!o.pose || middle.has(i), hit: false, at: 0 })),
				landed: false, resolved: false, all: false,
			});
		}

		// Verse: a new formation every two bars.
		add(16, 'line', { lead: 10 });
		['reverse', 'left', 'right', 'pairs', 'center', 'mirror', 'line'].forEach((k, i) => add(24 + i * 8, k, { lead: 6 }));
		// Chorus: every bar, with poses.
		const chorus = [
			['shuffle'], ['split'], ['swap'], ['line', true],
			['mirror'], ['left'], ['pairs'], ['V'],
			['reverse'], ['center'], ['swap'], ['split', true],
			['shuffle'], ['right'], ['mirror'], ['V'],
		];
		chorus.forEach(([k, pose], i) => add(80 + i * 4, k, { pose }));
		// Bridge: slow and loose, with spotlights to chase.
		['line', 'center', 'split', 'reverse', 'pairs', 'mirror', 'line', 'shuffle'].forEach((k, i) => add(152 + i * 8, k, { lead: 6, tol: TOL_LOOSE }));
		// Second chorus: every bar.
		const chorus2 = [
			['shuffle'], ['pairs'], ['mirror'], ['V'],
			['left'], ['swap'], ['right'], ['line', true],
			['reverse'], ['split'], ['swap'], ['V'],
			['center'], ['mirror'], ['shuffle'], ['pairs', true], ['line'],
		];
		chorus2.forEach(([k, pose], i) => add(212 + i * 4, k, { pose }));
		// The rush: every two beats, small moves.
		const rush = ['swap', 'slide', 'mirror', 'slide', 'swap', 'slide', 'mirror', 'line'];
		for (let i = 0; i < 21; i++) add(278 + i * 2, rush[i % rush.length], { lead: 2, pose: i % 8 === 7 });
		// The finale.
		add(FINAL_BEAT, 'finale', { lead: 14, tol: TOL_FINALE, finale: true });
		return out;
	}

	function section(b) {
		if (b < 14) return 'intro';
		if (b < 76) return 'verse';
		if (b < BRIDGE[0]) return 'chorus';
		if (b < 210) return 'bridge';
		if (b < 276) return 'chorus';
		if (b < 320) return 'rush';
		return 'finale';
	}

	/* ---------- the crowd ---------- */

	function buildCrowd(n) {
		const rows = [
			{ y: 790, s: 0.72, gap: 72 },
			{ y: 885, s: 0.86, gap: 88 },
			{ y: 990, s: 1.02, gap: 108 },
		];
		for (let wall = 0; wall < 2; wall++) {
			rows.forEach(function (r, ri) {
				for (let x = 30 + Math.random() * r.gap / 2; x < W - 20; x += r.gap * rand(0.85, 1.15)) {
					fans[wall].push({
						x, y: r.y + rand(-8, 8), s: r.s * rand(0.92, 1.08), row: ri,
						owner: Math.floor(Math.random() * n),
						phase: Math.random() * TAU,
						hand: Math.random() < 0.5 ? -1 : 1,
						tone: ['#1c0f36', '#22113f', '#180c2e'][Math.floor(Math.random() * 3)],
						hair: Math.random(),
					});
				}
			});
		}
	}

	/* ---------- flow ---------- */

	function initGame(n) {
		count = n;
		for (let i = 0; i < n; i++) {
			const m = new Meep(i);
			m.x = W + (i + 0.5) / n * W;
			m.y = depthY(0.5);
			m.scale = depthScale(0.5);
			m.body.color = PLAYER_COLORS[i];
			m.legs.color = '#efe6ff';
			meeps.push(m);
			perf.push({
				px: (i + 0.5) / n, pz: 0.5, x: m.x, y: m.y,
				poseUntil: -1, poseStyle: 0, poseAt: -9, glow: 0, inSpot: false, soloAcc: 0,
				marks: 0, poses: 0, solos: 0, gifts: 0,
			});
		}
		plan = buildPlan(n);
		buildCrowd(n);
		hud.initPlayers(meeps);
		hud.initBanner('Golden');
		stage.timeout(hud.finiBanner, 2200);
		stage.$el.on('click.golden', (e) => touch(IGB.toWorld(e)));
		playing = true;
		lastWall = performance.now() / 1000;
		beat = -OFFSET * BPS;
		seekMusic(beat);
		audio.play('music', true);
	}

	function finiGame() {
		isOver = true;
		hud.initBanner(golden ? 'GOLDEN!' : 'Encore!');
		// Fade the music out.
		let v = 0.55;
		const fade = stage.interval(function () {
			v -= 0.03;
			audio.setVolume('music', v);
			if (v <= 0) { clearInterval(fade); audio.stop('music'); }
		}, 60);
		stage.timeout(function () {
			hud.finiBanner();
			const scores = meeps.map((m) => m.score);
			const rewards = scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);
			stage.timeout(() => IGB.complete(rewards), 5000);
		}, 2600);
	}

	/* ---------- scoring ---------- */

	function onMark(f, m) {
		const p = perf[m.n];
		return Math.abs(p.px - m.px) <= f.tol && (!m.pose || p.pz <= POSE_Z);
	}

	function award(f, m) {
		const p = perf[m.n];
		const meep = meeps[m.n];
		let pts = f.finale ? PTS.finale : PTS.mark;
		p.marks++;
		if (m.pose) {
			pts += PTS.pose;
			p.poses++;
			p.poseStyle = Math.floor(Math.random() * POSES.length);
			p.poseUntil = beat + 1.6;
			p.poseAt = beat;
			audio.play('pose', true);
		} else if (!f.finale) {
			p.poseStyle = -1;          // a quick cheer
			p.poseUntil = beat + 0.7;
			p.poseAt = beat;
		}
		meep.score += pts;
		meep.doScore(pts);
		p.glow = 1;
		hype = Math.min(1, hype + 0.04);
		const x = W + m.px * W;
		const y = m.pose ? POSE_MARK_Y : p.y;
		for (let i = 0; i < 14; i++) {
			const a = Math.random() * TAU;
			particles.push({ kind: 'spark', x, y: y - 10, vx: Math.cos(a) * rand(3, 9), vy: Math.sin(a) * rand(2, 5) - 5, life: 0, max: rand(25, 45), size: rand(5, 9), color: i % 3 ? PLAYER_COLORS[m.n] : '#fff6c0' });
		}
	}

	function land(f) {
		f.landed = true;
		for (const m of f.marks) if (m.hit) award(f, m);
		if (f.finale) {
			// Everyone strikes the big pose regardless.
			perf.forEach((p) => { p.poseStyle = 0; p.poseUntil = beat + 8; p.poseAt = beat; });
		}
	}

	function resolve(f) {
		f.resolved = true;
		f.all = f.marks.every((m) => m.hit);
		if (f.finale) {
			golden = f.all;
			if (golden) meeps.forEach((m) => { m.score += PTS.golden; });
			goldenGlow = 1;
			flash = 1;
			hype = 1;
			burstConfetti(golden ? 320 : 150);
			audio.play('cheer', true);
			audio.play('reveal', true);
			return;
		}
		if (!f.all) return;
		allOnCount++;
		meeps.forEach((m) => { m.score += PTS.allOn; });
		flash = 0.7;
		hype = Math.min(1, hype + 0.05);
		audio.play('allon', true);
		for (let i = 0; i < 40; i++) particles.push(confetto(W + Math.random() * W, rand(-200, -20)));
	}

	function confetto(x, y) {
		return {
			kind: 'confetti', x, y, vx: rand(-1.5, 1.5), vy: rand(2.5, 6), life: 0, max: rand(220, 340),
			size: rand(14, 26), color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
			spin: Math.random() * TAU, vspin: rand(-0.2, 0.2), sway: Math.random() * TAU,
		};
	}

	// Gold confetti over all three walls.
	function burstConfetti(perWall) {
		for (let wall = 0; wall < 3; wall++) {
			for (let i = 0; i < perWall; i++) particles.push(confetto(wall * W + Math.random() * W, rand(-700, -10)));
		}
		// Plus cannons from the stage corners.
		for (const [x, dir] of [[W + 60, 1], [2 * W - 60, -1]]) {
			for (let i = 0; i < 60; i++) {
				const c = confetto(x, 960);
				c.vx = dir * rand(4, 14);
				c.vy = -rand(14, 26);
				particles.push(c);
			}
		}
	}

	/* ---------- spotlights ---------- */

	function bridgeFade(b) {
		if (b < BRIDGE[0] || b > BRIDGE[1]) return 0;
		return Math.min(1, (b - BRIDGE[0]) / 4, (BRIDGE[1] - b) / 4);
	}

	function spots(b) {
		const k = count > 2 ? 2 : 1;
		const out = [];
		for (let i = 0; i < k; i++) out.push(0.5 + 0.4 * Math.sin((b - BRIDGE[0]) * TAU / 24 + i * Math.PI + (k === 1 ? -Math.PI / 2 : 0)));
		return out;
	}

	/* ---------- fan gifts ---------- */

	function spawnGift() {
		const side = gifts.length % 2 === 0 ? (Math.random() < 0.5 ? 0 : 1) : 1 - gifts[gifts.length - 1].side;
		const wall = side === 0 ? 0 : 2;
		const x = wall * W + rand(260, W - 260);
		gifts.push({ side, wall, x, y: rand(360, 520), born: beat, dies: beat + GIFT_LIFE, caught: -1, by: -1 });
		audio.play('pop', true);
	}

	// A touch on a side wall: the nearest player to that spot catches the gift.
	function touch(at) {
		if (!playing || isOver) return;
		for (const g of gifts) {
			if (g.caught >= 0 || beat > g.dies) continue;
			if (Math.abs(at.x - g.x) > 190 || Math.abs(at.y - g.y) > 150) continue;
			const f = (g.x - g.wall * W) / W;
			const tx = g.wall === 0 ? 0 : 1;
			const tz = g.wall === 0 ? 1 - f : f;
			let best = 0;
			let bestD = Infinity;
			perf.forEach(function (p, i) {
				const d = Math.hypot(p.px - tx, p.pz - tz);
				if (d < bestD) { bestD = d; best = i; }
			});
			g.caught = beat;
			g.by = best;
			perf[best].gifts++;
			perf[best].glow = 1;
			meeps[best].score += PTS.gift;
			popups.push({ x: g.x, y: g.y - 40, text: '+' + PTS.gift, color: PLAYER_COLORS[best], life: 0, size: 90 });
			for (let i = 0; i < 30; i++) {
				const a = Math.random() * TAU;
				particles.push({ kind: 'spark', x: g.x, y: g.y, vx: Math.cos(a) * rand(4, 12), vy: Math.sin(a) * rand(4, 12), life: 0, max: rand(30, 50), size: rand(6, 11), color: i % 2 ? GOLD : PINK });
			}
			audio.play('gift', true);
			return;
		}
	}

	/* ---------- every tick ---------- */

	function step() {
		syncClock();
		if (!playing) return;
		const b = beat;

		// Beat events.
		const bi = Math.floor(b);
		if (bi !== lastBeatInt) {
			lastBeatInt = bi;
			if (bi >= FINAL_BEAT - 4 && bi < FINAL_BEAT) audio.play('tick', true);
		}

		// Smooth the performers towards their tracked spots.
		perf.forEach(function (p, i) {
			const tx = W + p.px * W;
			p.x += (tx - p.x) * 0.45;
			p.y += (depthY(p.pz) - p.y) * 0.35;
			p.glow = Math.max(0, p.glow - BPS / FPS / 4);
		});

		// Formations: catch performers on their marks around the downbeat.
		for (const f of plan) {
			if (f.resolved || b < f.hit - EARLY) continue;
			for (const m of f.marks) {
				if (m.hit || !onMark(f, m)) continue;
				m.hit = true;
				m.at = b;
				if (f.landed) award(f, m);
			}
			if (!f.landed && b >= f.hit) land(f);
			if (b >= f.hit + LATE) resolve(f);
		}

		// Spotlight solos.
		const bf = bridgeFade(b);
		const sp = bf > 0.5 ? spots(b) : [];
		perf.forEach(function (p, i) {
			p.inSpot = sp.some((x) => Math.abs(p.px - x) < SPOT_R);
			if (!p.inSpot) return;
			p.soloAcc += BPS / FPS;
			p.glow = Math.max(p.glow, 0.6);
			if (p.soloAcc >= 1) {
				p.soloAcc -= 1;
				p.solos += PTS.solo;
				meeps[i].score += PTS.solo;
				hype = Math.min(1, hype + 0.01);
				popups.push({ x: p.x + rand(-40, 40), y: p.y - 260 * depthScale(p.pz), text: 'SOLO +' + PTS.solo, color: '#fff6c0', life: 0, size: 44 });
			}
		});

		// Fan banners.
		if (!isOver && b >= nextGift && b < GIFTS[1]) {
			spawnGift();
			nextGift = b + rand(GIFT_GAP[0], GIFT_GAP[1]);
		}
		for (let i = gifts.length - 1; i >= 0; i--) {
			const g = gifts[i];
			if ((g.caught >= 0 && b > g.caught + 3) || (g.caught < 0 && b > g.dies + 1)) gifts.splice(i, 1);
		}

		// Particles.
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life++;
			if (p.kind === 'confetti') {
				p.vy = Math.min(p.vy + 0.25, 4 + p.size / 10);
				p.vx *= 0.97;
				p.x += p.vx + Math.sin(p.life * 0.08 + p.sway) * 1.6;
				p.y += p.vy;
				p.spin += p.vspin;
			} else {
				p.vy += 0.3;
				p.x += p.vx;
				p.y += p.vy;
			}
			if (p.life > p.max || p.y > H + 40) particles.splice(i, 1);
		}
		for (let i = popups.length - 1; i >= 0; i--) if (++popups[i].life > 60) popups.splice(i, 1);

		hype = Math.max(0, hype - 0.0005);
		flash = Math.max(0, flash - 0.035);
		goldenGlow = Math.max(0, goldenGlow - 0.003);

		if (!isOver && b >= END_BEAT) finiGame();
		hud.updatePlayers(meeps);
	}

	/* ---------- drawing: the static backdrop ---------- */

	const backdrop = stage.surface(WIDTH, H);
	backdrop.onResize = paintBackdrop;
	paintBackdrop(backdrop);

	function paintBackdrop(s) {
		const ctx = s.ctx;
		s.clear();
		// Side walls: the arena, tiers of distant lightsticks fading up into the dark.
		for (const wall of [0, 2]) {
			const x0 = wall * W;
			art.rect(ctx, x0, 0, W, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#0b0520', '#1d0a3a', '#3a0f4f']) });
			// Stage glow spilling round the corner.
			const cx = wall === 0 ? x0 + W : x0;
			art.rect(ctx, x0, 0, W, H, { fill: art.radial(ctx, cx, 600, 10, 1300, ['rgba(255,79,168,0.35)', 'rgba(255,79,168,0.08)', 'rgba(255,79,168,0)']) });
			// Balcony tiers.
			for (let k = 0; k < 3; k++) {
				const y = 190 + k * 150;
				ctx.save();
				ctx.beginPath();
				ctx.moveTo(x0, y + 30);
				ctx.quadraticCurveTo(x0 + W / 2, y - 30, x0 + W, y + 30);
				ctx.lineWidth = 10;
				ctx.strokeStyle = 'rgba(120,60,170,0.45)';
				ctx.stroke();
				ctx.restore();
				for (let i = 0; i < 90; i++) {
					const fx = Math.random();
					const dy = -30 * (1 - Math.pow(2 * fx - 1, 2)) + 30;
					const c = ['#ff4fa8', '#ffcf3f', '#c77dff', '#ffffff', '#7ad7ff'][Math.floor(Math.random() * 5)];
					art.circle(ctx, x0 + fx * W, y + dy + 25 + Math.random() * 90, rand(2, 4.5), { fill: c, alpha: rand(0.25, 0.75) });
				}
			}
		}

		// Front wall: the stage.
		art.rect(ctx, W, 0, W, H, { fill: art.linear(ctx, 0, 0, 0, FLOOR_TOP, ['#0d0524', '#22093f', '#3c0d55']) });
		// Backdrop drapes.
		for (let i = 0; i < 16; i++) {
			const x = W + i * W / 16;
			art.rect(ctx, x, 60, W / 32, FLOOR_TOP - 60, { fill: 'rgba(0,0,0,0.12)' });
		}
		// Truss along the top.
		art.rect(ctx, W, 0, W, 58, { fill: '#2a2438' });
		ctx.save();
		ctx.strokeStyle = '#4b4360';
		ctx.lineWidth = 5;
		ctx.beginPath();
		for (let x = W; x < 2 * W; x += 40) {
			ctx.moveTo(x, 6); ctx.lineTo(x + 20, 52); ctx.lineTo(x + 40, 6);
		}
		ctx.stroke();
		ctx.restore();
		art.rect(ctx, W, 4, W, 6, { fill: '#5d5475' });
		art.rect(ctx, W, 50, W, 6, { fill: '#5d5475' });
		// Speaker stacks.
		for (const x of [W + 20, 2 * W - 150]) {
			art.roundRect(ctx, x, 120, 130, 540, 10, { fill: '#130b22', stroke: '#3a2a55', lineWidth: 4 });
		}
		// The LED screen's frame.
		art.roundRect(ctx, 1940, 140, 920, 400, 22, { fill: '#08030f', stroke: '#6b4a1a', lineWidth: 10, shadow: { color: 'rgba(255,79,168,0.5)', blur: 50 } });

		// The floor: glossy, with lines running to a vanishing point.
		art.rect(ctx, W, FLOOR_TOP, W, H - FLOOR_TOP, { fill: art.linear(ctx, 0, FLOOR_TOP, 0, H, ['#1a0b30', '#2b1048', '#160828']) });
		ctx.save();
		ctx.strokeStyle = 'rgba(255,207,63,0.12)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let i = -12; i <= 12; i++) {
			const xb = 2400 + i * 150;
			ctx.moveTo(2400 + i * 60, FLOOR_TOP);
			ctx.lineTo(xb, H);
		}
		for (const y of [740, 790, 850, 920]) { ctx.moveTo(W, y); ctx.lineTo(2 * W, y); }
		ctx.stroke();
		ctx.restore();
		art.rect(ctx, W, FLOOR_TOP - 6, W, 8, { fill: '#6b4a1a' });
		// The pose strip along the front edge, and the gold lip.
		art.rect(ctx, W, POSE_LINE, W, H - POSE_LINE, { fill: art.linear(ctx, 0, POSE_LINE, 0, H, ['rgba(255,207,63,0.05)', 'rgba(255,207,63,0.16)']) });
		art.line(ctx, [[W, POSE_LINE], [2 * W, POSE_LINE]], { stroke: 'rgba(255,207,63,0.45)', lineWidth: 4, dash: [24, 18] });
		art.rect(ctx, W, H - 16, W, 16, { fill: art.linear(ctx, 0, H - 16, 0, H, ['#ffe27a', '#b8860b']) });
	}

	/* ---------- drawing: front wall ---------- */

	function pulseOf(b) {
		const f = b - Math.floor(b);
		return Math.exp(-f * 5);
	}

	function drawLights(ctx, b) {
		const pulse = pulseOf(b);
		const cols = [PINK, GOLD, '#b26bff'];
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 9; i++) {
			const lx = W + 100 + i * 175;
			const ang = Math.sin(b * Math.PI / 8 + i * 0.8) * 0.38;
			const len = 820;
			const ex = lx + Math.sin(ang) * len;
			const ey = 58 + Math.cos(ang) * len;
			const nx = Math.cos(ang) * 95;
			const ny = -Math.sin(ang) * 95;
			const c = cols[i % 3];
			const a = 0.14 + 0.16 * pulse * (0.4 + hype) + goldenGlow * 0.2;
			ctx.globalAlpha = Math.min(1, a);
			art.poly(ctx, [[lx - 10, 60], [lx + 10, 60], [ex + nx, ey + ny], [ex - nx, ey - ny]], { fill: art.linear(ctx, lx, 60, ex, ey, [c, 'rgba(0,0,0,0)']) });
		}
		ctx.restore();
		// The lamp cans.
		for (let i = 0; i < 9; i++) {
			const lx = W + 100 + i * 175;
			art.roundRect(ctx, lx - 22, 40, 44, 34, 8, { fill: '#1b1626' });
			art.circle(ctx, lx, 74, 13, { fill: cols[i % 3], shadow: { color: cols[i % 3], blur: 25 } });
		}
	}

	function drawScreen(ctx, b) {
		const pulse = pulseOf(b);
		const x = 1950;
		const y = 150;
		const w = 900;
		const h = 380;
		ctx.save();
		art.roundRectPath(ctx, x, y, w, h, 16);
		ctx.clip();
		art.rect(ctx, x, y, w, h, { fill: art.linear(ctx, x, y, x + w, y + h, ['#3a0a3f', '#5a0f52', '#2a0a45']) });
		// Moving light bars behind the logo.
		for (let i = 0; i < 8; i++) {
			const bx = x + ((i * 140 + b * 40) % (w + 200)) - 100;
			art.poly(ctx, [[bx, y], [bx + 50, y], [bx - 60, y + h], [bx - 110, y + h]], { fill: 'rgba(255,79,168,0.13)' });
		}
		const sec = section(b);
		const toFinal = FINAL_BEAT - b;
		if (sec === 'finale' && toFinal > 0 && toFinal <= 8) {
			const k = Math.ceil(toFinal);
			art.text(ctx, k, x + w / 2, y + h / 2 + 10, { size: 280 * (1 + pulse * 0.12), font: 'Knewave', fill: art.linear(ctx, 0, y + 40, 0, y + h - 40, ['#fff6c0', GOLD, '#d48a00']), outline: '#5a2a00', outlineWidth: 8, shadow: { color: GOLD, blur: 40 } });
		} else {
			const s = 1 + pulse * 0.05 + goldenGlow * 0.25;
			art.text(ctx, 'GOLDEN', x + w / 2, y + 165, { size: 170 * s, font: 'Knewave', fill: art.linear(ctx, 0, y + 80, 0, y + 250, ['#fff6c0', GOLD, '#d48a00']), outline: '#4a1030', outlineWidth: 7, shadow: { color: 'rgba(255,207,63,0.8)', blur: 20 + 40 * pulse } });
			const label = { intro: 'live', verse: 'verse', chorus: 'chorus', bridge: 'solo time', rush: 'faster!', finale: 'finale' }[sec];
			art.text(ctx, label.toUpperCase(), x + w / 2, y + 290, { size: 48, font: 'Paytone One', fill: '#ffd6ec', alpha: 0.9 });
		}
		// Song progress.
		const k = Math.max(0, Math.min(1, b / FINAL_BEAT));
		art.roundRect(ctx, x + 60, y + h - 42, w - 120, 14, 7, { fill: 'rgba(255,255,255,0.15)' });
		art.roundRect(ctx, x + 60, y + h - 42, (w - 120) * k, 14, 7, { fill: GOLD });
		ctx.restore();
	}

	function drawEqualisers(ctx, b) {
		const pulse = pulseOf(b);
		for (const [x0, flip] of [[W + 30, 0], [2 * W - 140, 1]]) {
			for (let c = 0; c < 4; c++) {
				const lvl = 0.25 + 0.75 * Math.abs(Math.sin(b * Math.PI * 0.5 + c * 1.3 + flip)) * (0.5 + 0.5 * pulse);
				const n = Math.round(lvl * 16);
				for (let r = 0; r < n; r++) {
					const y = 640 - r * 31;
					const col = r > 12 ? '#ffffff' : r > 8 ? GOLD : PINK;
					art.rect(ctx, x0 + 8 + c * 28, y, 22, 24, { fill: col, alpha: 0.85 });
				}
			}
		}
	}

	function drawSpotlights(ctx, b) {
		const bf = bridgeFade(b);
		if (bf <= 0) return;
		const sp = spots(b);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const s of sp) {
			const x = W + s * W;
			const r = SPOT_R * W;
			ctx.globalAlpha = bf;
			art.poly(ctx, [[x - 30 + (s - 0.5) * 300, 0], [x + 30 + (s - 0.5) * 300, 0], [x + r, 900], [x - r, 900]], { fill: art.linear(ctx, 0, 0, 0, 900, ['rgba(255,246,192,0.05)', 'rgba(255,246,192,0.32)']) });
			art.ellipse(ctx, x, 880, r + 10, 60, { fill: art.radial(ctx, x, 880, 5, r + 10, ['rgba(255,250,220,0.75)', 'rgba(255,230,140,0.25)', 'rgba(255,230,140,0)']) });
		}
		ctx.restore();
	}

	// Ghost marks with countdown rings, and the marks landing on the beat.
	function drawMarks(ctx, b) {
		const pulse = pulseOf(b);
		let poseSoon = 0;
		for (const f of plan) {
			if (b < f.hit - f.lead || b > f.hit + 1.2) continue;
			for (const m of f.marks) {
				if (m.pose && b < f.hit) poseSoon = Math.max(poseSoon, 1 - (f.hit - b) / f.lead);
			}
		}
		if (poseSoon > 0) {
			art.rect(ctx, W, POSE_LINE, W, H - 16 - POSE_LINE, { fill: 'rgba(255,207,63,1)', alpha: 0.08 + 0.18 * poseSoon * (0.5 + 0.5 * pulse) });
		}
		for (const f of plan) {
			if (b < f.hit - f.lead || b > f.hit + 1.2) continue;
			for (const m of f.marks) {
				const color = PLAYER_COLORS[m.n];
				const x = W + m.px * W;
				const y = m.pose ? POSE_MARK_Y : perf[m.n].y;
				const rx = f.tol * W;
				const ry = 22 + (y - STAGE_BACK) / 10;
				if (b < f.hit) {
					const k = Math.max(0, Math.min(1, (b - (f.hit - f.lead)) / f.lead));
					const near = Math.max(0, 1 - (f.hit - b));
					// A faint pillar of light, so a mark reads even behind a performer.
					ctx.save();
					ctx.globalCompositeOperation = 'lighter';
					art.rect(ctx, x - rx * 0.7, y - 320, rx * 1.4, 320, { fill: art.linear(ctx, 0, y - 320, 0, y, ['rgba(0,0,0,0)', color]), alpha: 0.12 + 0.3 * near });
					ctx.restore();
					art.ellipse(ctx, x, y, rx, ry, { fill: color, alpha: 0.3 + 0.25 * k });
					art.ellipse(ctx, x, y, rx, ry, { stroke: color, lineWidth: 9, dash: [18, 10] });
					art.ellipse(ctx, x, y, rx - 9, ry - 6, { stroke: 'rgba(255,255,255,0.5)', lineWidth: 2 });
					// Whose mark: a little head in the player's hat colour.
					Meep.drawHead(ctx, m.n, x + rx + 6, y - 34, 0.42);
					// The countdown ring: fills round to the downbeat, flashing on each beat.
					ctx.save();
					ctx.beginPath();
					ctx.ellipse(x, y, rx + 14, ry + 9, 0, -Math.PI / 2, -Math.PI / 2 + k * TAU);
					ctx.strokeStyle = m.pose ? GOLD : '#ffffff';
					ctx.lineWidth = 7 + 5 * pulse;
					ctx.lineCap = 'round';
					ctx.stroke();
					ctx.restore();
					const left = Math.ceil(f.hit - b);
					if (m.pose) art.text(ctx, '★', x, y - 2, { size: 64 + 10 * pulse, fill: GOLD, outline: '#5a2a00', outlineWidth: 4 });
					else if (left <= 4) art.text(ctx, left, x, y + 2, { size: 44 + 10 * pulse, font: 'Paytone One', fill: '#ffffff', outline: 'rgba(20,5,40,0.8)', outlineWidth: 5 });
					if (f.finale) art.ellipse(ctx, x, y, rx + 28, ry + 18, { stroke: GOLD, lineWidth: 5, alpha: 0.5 + 0.5 * pulse });
				} else {
					// Landed: a hit glows and shoots up a beam; a miss fades.
					const t = (b - f.hit) / 1.2;
					if (m.hit) {
						ctx.save();
						ctx.globalCompositeOperation = 'lighter';
						art.rect(ctx, x - rx * 0.6, 0, rx * 1.2, y, { fill: art.linear(ctx, 0, 0, 0, y, ['rgba(0,0,0,0)', color]), alpha: 0.6 * (1 - t) });
						ctx.restore();
						art.ellipse(ctx, x, y, rx * (1 + t * 0.3), ry * (1 + t * 0.3), { fill: color, alpha: 0.9 * (1 - t) });
						art.ellipse(ctx, x, y, rx * 0.55, ry * 0.55, { fill: '#ffffff', alpha: 0.8 * (1 - t) });
					} else {
						art.ellipse(ctx, x, y, rx, ry, { stroke: 'rgba(200,190,220,1)', lineWidth: 4, dash: [10, 10], alpha: 0.5 * (1 - t) });
					}
				}
			}
		}
	}

	// The next mark each performer is heading for.
	function nextMark(n, b) {
		for (const f of plan) {
			if (f.resolved || b < f.hit - f.lead) continue;
			return { f, m: f.marks[n] };
		}
		return null;
	}

	// Chevrons by a performer's feet pointing to their mark, and a "step
	// forward" arrow for a pose.
	function drawGuides(ctx, b) {
		const pulse = pulseOf(b);
		perf.forEach(function (p, n) {
			const nm = nextMark(n, b);
			if (!nm) return;
			const { f, m } = nm;
			const color = PLAYER_COLORS[n];
			const dx = m.px - p.px;
			if (Math.abs(dx) > f.tol) {
				const dir = Math.sign(dx);
				const sc = depthScale(p.pz);
				for (let i = 0; i < 2; i++) {
					const cx = p.x + dir * (95 * sc + 30 + i * 34 + pulse * 10);
					const cy = p.y - 110 * sc;
					art.poly(ctx, [[cx - dir * 14, cy - 26], [cx + dir * 14, cy], [cx - dir * 14, cy + 26]], { fill: color, stroke: '#ffffff', lineWidth: 3, alpha: 0.9 - i * 0.3 });
				}
			}
			if (m.pose && p.pz > POSE_Z) {
				const cy = Math.min(H - 40, p.y + 30 + pulse * 10);
				art.poly(ctx, [[p.x - 26, cy], [p.x + 26, cy], [p.x, cy + 24]], { fill: GOLD, stroke: '#5a2a00', lineWidth: 3 });
			}
		});
	}

	// Poses, in meep part coordinates (hands from the top-left, rotate in degrees).
	const POSES = [
		{ l: [-115, 25], r: [115, 25], rot: 0 },          // arms up in a V
		{ l: [-60, 215], r: [95, -20], rot: 7 },          // pointing to the sky
		{ l: [-26, -28], r: [26, -28], rot: -5, heart: true }, // a heart overhead
		{ l: [-145, 150], r: [100, 40], rot: -9 },        // the star
	];
	const CHEER = { l: [-72, 210], r: [92, 30], rot: 3 };

	function poseMeep(m, p, n, b) {
		const pulse = pulseOf(b);
		m.x = p.x;
		m.scale = depthScale(p.pz);
		const posing = p.poseUntil > b;
		const P = posing ? (p.poseStyle < 0 ? CHEER : POSES[p.poseStyle]) : null;
		if (P) {
			// Snap in with a little pop.
			const snap = Math.max(0, 1 - (b - p.poseAt) * 3);
			m.handLeft.x = P.l[0]; m.handLeft.y = P.l[1];
			m.handRight.x = P.r[0]; m.handRight.y = P.r[1];
			m.rotate = P.rot;
			m.scale *= 1 + snap * 0.12;
			m.y = p.y - snap * 30;
		} else if (p.inSpot) {
			// In the spotlight: both hands up, waving.
			const w = Math.sin(b * Math.PI);
			m.handLeft.x = -100 + w * 20; m.handLeft.y = 40;
			m.handRight.x = 100 + w * 20; m.handRight.y = 40;
			m.rotate = w * 6;
			m.y = p.y - pulse * 12;
		} else {
			// The groove: alternate arm pumps on the beat, a bob at the knees.
			const side = Math.floor(b) % 2;
			m.handLeft.x = -72; m.handLeft.y = side ? 210 : 210 - 110 * pulse;
			m.handRight.x = 72; m.handRight.y = side ? 210 - 110 * pulse : 210;
			m.rotate = Math.sin(b * Math.PI) * 4;
			m.y = p.y + pulse * 6;
		}
	}

	// Idol styling over a meep: hair in the player's colour, a headset mic and a gold belt.
	function drawStyle(ctx, m, n) {
		const color = PLAYER_COLORS[n];
		art.with(ctx, { x: m.x, y: m.y, scale: m.scale, rotate: m.rotate }, function () {
			const top = -m.h;
			ctx.save();
			ctx.beginPath();
			// Hair: a crown, a long side lock and a fringe swept across.
			ctx.moveTo(-50, top + 132);
			ctx.quadraticCurveTo(-72, top + 90, -60, top + 50);
			ctx.bezierCurveTo(-56, top - 30, 66, top - 30, 60, top + 60);
			ctx.quadraticCurveTo(58, top + 84, 50, top + 92);
			ctx.quadraticCurveTo(40, top + 50, 8, top + 46);
			ctx.quadraticCurveTo(-24, top + 46, -34, top + 82);
			ctx.quadraticCurveTo(-40, top + 108, -50, top + 132);
			ctx.closePath();
			ctx.fillStyle = color;
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'rgba(0,0,0,0.25)';
			ctx.stroke();
			ctx.restore();
			// A shine streak.
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(-30, top + 18);
			ctx.quadraticCurveTo(0, top + 2, 30, top + 14);
			ctx.lineWidth = 8;
			ctx.lineCap = 'round';
			ctx.strokeStyle = 'rgba(255,255,255,0.45)';
			ctx.stroke();
			// The headset mic.
			ctx.beginPath();
			ctx.moveTo(50, top + 92);
			ctx.quadraticCurveTo(48, top + 118, 20, top + 116);
			ctx.lineWidth = 5;
			ctx.strokeStyle = '#2a2438';
			ctx.stroke();
			ctx.restore();
			art.circle(ctx, 18, top + 116, 7, { fill: '#2a2438' });
			// A gold star clip and belt.
			art.text(ctx, '★', -38, top + 66, { size: 34, fill: GOLD, outline: '#7a4a00', outlineWidth: 2 });
			art.rect(ctx, -30, top + 196, 60, 10, { fill: GOLD });
			art.rect(ctx, -30, top + 150, 60, 8, { fill: 'rgba(255,255,255,0.35)' });
		});
	}

	function drawPerformers(ctx, b) {
		perf.forEach((p, n) => poseMeep(meeps[n], p, n, b));
		const order = meeps.map((m, i) => i).sort((a, c) => meeps[a].y - meeps[c].y);
		for (const n of order) {
			const m = meeps[n];
			const p = perf[n];
			// A glow behind a performer who just hit (or is in the spotlight).
			if (p.glow > 0) {
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				const r = 220 * m.scale;
				art.circle(ctx, m.x, m.y - 170 * m.scale, r * 1.4, { fill: art.radial(ctx, m.x, m.y - 170 * m.scale, 10, r * 1.4, [PLAYER_COLORS[n], 'rgba(0,0,0,0)']), alpha: p.glow * 0.6 });
				ctx.restore();
			}
			m.draw(ctx, 'body');
			drawStyle(ctx, m, n);
			m.draw(ctx, 'hands');
			const P = p.poseUntil > b && p.poseStyle >= 0 ? POSES[p.poseStyle] : null;
			if (P && P.heart) art.text(ctx, '♥', m.x, m.y - (m.h + 60) * m.scale, { size: 70 * m.scale / 0.6, fill: PLAYER_COLORS[n], outline: '#ffffff', outlineWidth: 3 });
			if (P && b - p.poseAt < 1) {
				const k = (b - p.poseAt);
				for (let i = 0; i < 6; i++) {
					const a = i * TAU / 6 + p.poseAt;
					const r = 120 + k * 160;
					art.text(ctx, '✦', m.x + Math.cos(a) * r * m.scale, m.y - 180 * m.scale + Math.sin(a) * r * m.scale, { size: 40, fill: GOLD, alpha: 1 - k });
				}
			}
		}
	}

	/* ---------- drawing: side walls ---------- */

	function drawCrowd(ctx, b, side) {
		const x0 = side === 0 ? 0 : 2 * W;
		const pulse = pulseOf(b);
		const amp = 0.18 + 0.4 * hype;
		const jump = hype > 0.45 ? (hype - 0.45) * 30 : 0;
		// Searchlights sweeping over the crowd.
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 2; i++) {
			const bx = x0 + W * (0.3 + 0.4 * i);
			const ang = Math.sin(b * Math.PI / 10 + i * 2 + side) * 0.5;
			const ex = bx + Math.sin(ang) * 900;
			const ey = 1000 - Math.cos(ang) * 900;
			ctx.globalAlpha = 0.1 + 0.15 * hype;
			art.poly(ctx, [[bx - 15, 1000], [bx + 15, 1000], [ex + 110, ey], [ex - 110, ey]], { fill: art.linear(ctx, bx, 1000, ex, ey, [i ? GOLD : PINK, 'rgba(0,0,0,0)']) });
		}
		ctx.restore();

		for (const f of fans[side]) {
			const s = f.s;
			const hop = jump * Math.max(0, Math.sin(b * Math.PI + f.phase * 0.3)) * s;
			const x = x0 + f.x;
			const y = f.y - hop;
			const lit = perf[f.owner] ? perf[f.owner].glow : 0;
			const color = lit > 0.08 ? PLAYER_COLORS[f.owner] : '#b9a6d0';
			// The lightstick arm, swaying with the beat.
			const ang = Math.sin(b * Math.PI + f.phase) * amp + f.hand * 0.15;
			const sx = x + f.hand * 26 * s;
			const sy = y - 110 * s;
			const hx = sx + Math.sin(ang) * 60 * s;
			const hy = sy - Math.cos(ang) * 60 * s;
			art.line(ctx, [[sx, sy], [hx, hy]], { stroke: f.tone, lineWidth: 18 * s, lineCap: 'round' });
			const tx = hx + Math.sin(ang) * 58 * s;
			const ty = hy - Math.cos(ang) * 58 * s;
			art.line(ctx, [[hx, hy], [tx, ty]], { stroke: '#d8d0e8', lineWidth: 8 * s, lineCap: 'round' });
			const glow = lit > 0.08 ? 0.45 + 0.55 * lit : 0.25;
			art.circle(ctx, tx, ty, (24 + 10 * pulse * glow) * s, { fill: color, alpha: 0.28 * glow });
			art.circle(ctx, tx, ty, 13 * s, { fill: color, alpha: 0.5 + 0.5 * glow });
			art.circle(ctx, tx, ty, 6 * s, { fill: '#ffffff', alpha: glow });
			// Head and shoulders.
			art.roundRect(ctx, x - 50 * s, y - 95 * s, 100 * s, 130 * s, [40 * s, 40 * s, 0, 0], { fill: f.tone });
			art.circle(ctx, x, y - 128 * s, 34 * s, { fill: f.tone });
			if (f.hair > 0.6) art.circle(ctx, x + 14 * s, y - 158 * s, 16 * s, { fill: f.tone });
		}
	}

	function drawHype(ctx, b) {
		for (const side of [0, 2]) {
			const cx = side * W + W / 2;
			const y = 92;
			art.roundRect(ctx, cx - 330, y - 38, 660, 76, 38, { fill: 'rgba(15,5,30,0.75)', stroke: PINK, lineWidth: 5 });
			art.text(ctx, 'HYPE', cx - 235, y + 2, { size: 44, font: 'Knewave', fill: '#ffd6ec' });
			art.roundRect(ctx, cx - 150, y - 16, 450, 32, 16, { fill: 'rgba(255,255,255,0.12)' });
			if (hype > 0.01) art.roundRect(ctx, cx - 150, y - 16, 450 * hype, 32, 16, { fill: art.linear(ctx, cx - 150, 0, cx + 300, 0, [PINK, GOLD]), shadow: { color: GOLD, blur: 18 * hype } });
		}
	}

	function drawGift(ctx, g, b) {
		const age = b - g.born;
		const pop = Math.min(1, age * 2.5);
		const s = pop < 1 ? 1.15 * Math.sin(pop * Math.PI / 2) : 1;
		const bob = Math.sin(b * Math.PI) * 10;
		let alpha = 1;
		if (g.caught >= 0) alpha = Math.max(0, 1 - (b - g.caught) / 3);
		else if (g.dies - b < 2) alpha = (Math.floor(b * 4) % 2) ? 0.45 : 1;
		if (g.caught < 0 && b > g.dies) alpha = Math.max(0, 1 - (b - g.dies));
		art.with(ctx, { x: g.x, y: g.y + bob, scale: s, alpha }, function () {
			// Poles down into the crowd.
			art.rect(ctx, -120, 60, 10, 360, { fill: '#3a2a55' });
			art.rect(ctx, 110, 60, 10, 360, { fill: '#3a2a55' });
			art.roundRect(ctx, -150, -100, 300, 200, 26, { fill: art.linear(ctx, 0, -100, 0, 100, ['#ff7cc0', '#d9147a']), stroke: GOLD, lineWidth: 9, shadow: { color: 'rgba(255,79,168,0.7)', blur: 30 } });
			if (g.caught >= 0) {
				art.text(ctx, '♥', 0, -5, { size: 150, fill: '#ffffff', outline: PLAYER_COLORS[g.by] || GOLD, outlineWidth: 6 });
				return;
			}
			// A wrapped gift.
			art.rect(ctx, -55, -40, 110, 85, { fill: GOLD, shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, y: 4 } });
			art.rect(ctx, -65, -58, 130, 24, { fill: '#ffe27a' });
			art.rect(ctx, -10, -58, 20, 103, { fill: PINK });
			art.ellipse(ctx, -22, -66, 22, 13, { fill: PINK });
			art.ellipse(ctx, 22, -66, 22, 13, { fill: PINK });
			art.text(ctx, 'TOUCH!', 0, 75, { size: 36, font: 'Paytone One', fill: '#ffffff', outline: '#7a0a44', outlineWidth: 4 });
		});
	}

	/* ---------- drawing ---------- */

	function drawHints(ctx, b) {
		const hint = (text, from, to, x, y, size) => {
			if (b < from || b > to) return;
			const a = Math.min(1, (b - from) * 2, (to - b) * 2);
			art.text(ctx, text, x, y, { size: size || 64, font: 'Paytone One', fill: '#ffffff', outline: 'rgba(40,5,50,0.85)', outlineWidth: 8, alpha: a });
		};
		hint('Find your colour!', 2, 16, W * 1.5, 140);
		const firstPose = plan.find((f) => f.marks.some((m) => m.pose));
		if (firstPose) hint('Step forward to pose!', firstPose.hit - firstPose.lead, firstPose.hit + 0.5, W * 1.5, 140);
		hint('Chase the spotlight!', BRIDGE[0], BRIDGE[0] + 10, W * 1.5, 140);
		hint('Everyone on your mark!', FINAL_BEAT - 14, FINAL_BEAT - 8, W * 1.5, 140);
		if (golden !== null) hint(golden ? 'Everyone hit it!' : 'Encore!', FINAL_BEAT, FINAL_BEAT + 10, W * 1.5, 140, 80);
	}

	function drawParticles(ctx) {
		for (const p of particles) {
			const k = 1 - p.life / p.max;
			if (p.kind === 'confetti') {
				art.with(ctx, { x: p.x, y: p.y, rotate: p.spin * 57.3 }, () => art.rect(ctx, -p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.life * 0.15 + p.sway)) + 2, { fill: p.color, alpha: Math.min(1, k * 3) }));
			} else {
				art.circle(ctx, p.x, p.y, p.size * (0.4 + 0.6 * k), { fill: p.color, alpha: Math.min(1, k * 1.5) });
			}
		}
		for (const p of popups) {
			const k = p.life / 60;
			art.text(ctx, p.text, p.x, p.y - k * 80, { size: p.size, font: 'Knewave', fill: p.color, outline: 'rgba(30,5,40,0.85)', outlineWidth: 5, alpha: Math.min(1, (1 - k) * 2) });
		}
	}

	self.draw = function (ctx) {
		syncClock();
		const b = beat;
		ctx.drawImage(backdrop.canvas, 0, 0, WIDTH, H);

		// Side walls.
		drawHype(ctx, b);
		for (const g of gifts) drawGift(ctx, g, b);
		drawCrowd(ctx, b, 0);
		drawCrowd(ctx, b, 1);

		// The stage.
		drawScreen(ctx, b);
		drawEqualisers(ctx, b);
		drawLights(ctx, b);
		drawSpotlights(ctx, b);
		if (count) {
			drawMarks(ctx, b);
			drawGuides(ctx, b);
			drawPerformers(ctx, b);
		}
		if (flash > 0) art.rect(ctx, W, 0, W, H, { fill: art.radial(ctx, W * 1.5, 700, 50, 1100, ['#fff6c0', 'rgba(255,207,63,0.6)', 'rgba(255,79,168,0)']), alpha: flash * 0.5 });
		if (goldenGlow > 0 && golden) art.rect(ctx, 0, 0, WIDTH, H, { fill: GOLD, alpha: goldenGlow * 0.18 });
		drawParticles(ctx);
		drawHints(ctx, b);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		perf.forEach(function (p, i) {
			const pl = players[i];
			if (!pl || pl.px === undefined || isNaN(pl.px)) return;
			p.px = Math.max(0, Math.min(1, pl.px));
			p.pz = Math.max(0, Math.min(1, isNaN(pl.pz) ? 0.5 : 1 - pl.pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	self.state = function () {
		const b = beat;
		const up = plan.find((f) => !f.resolved && b >= f.hit - f.lead);
		const show = (f) => f && { hit: f.hit, lead: f.lead, kind: f.kind, tol: f.tol, finale: f.finale, marks: f.marks.map((m) => ({ n: m.n, px: m.px, pose: m.pose, hit: m.hit })) };
		const done = plan.filter((f) => f.resolved);
		return {
			beat: b, live: playing && !isOver, over: isOver, section: section(b), hype, allOnCount, golden,
			formation: show(up),
			resolved: done.length,
			total: plan.length,
			spots: bridgeFade(b) > 0.5 ? spots(b) : [],
			gifts: gifts.filter((g) => g.caught < 0 && b <= g.dies).map((g) => ({ wall: g.wall, x: g.x, y: g.y })),
			players: perf.map((p, i) => ({ px: p.px, pz: p.pz, score: meeps[i].score, marks: p.marks, poses: p.poses, solos: p.solos, gifts: p.gifts, inSpot: p.inSpot })),
			scores: meeps.map((m) => m.score),
			music: (function () { const el = audio.get('music'); return el ? { t: el.currentTime, paused: el.paused } : null; })(),
		};
	};

	self.fini = function () {
		stage.$el.off('click.golden');
		hud.fini();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
