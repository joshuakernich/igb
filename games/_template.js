/*
 * Template
 *
 * A starting point for a new prototype: every player is a meep on the front
 * wall that follows them left and right, and jumps when they squat and rise.
 * Stars fall; catch them for points. Most stars wins.
 *
 * Every prototype runs the same show, with Showtime's standard screens
 * around the game (shared/showtime.js):
 *
 *   squad      HOW MANY PLAYERS? (show.pickPlayers)
 *   (sting)    the In Gamebox sting, put in before the title by itself
 *   title      the title drop: the logo, the game's title (from its manifest
 *              entry's title.lines) and TAP TO START, counting down
 *   clock      the clock intro: YOU HAVE 10:00 MINUTES; the clock starts
 *   visors     the visor check
 *   controls   the tutorial: show.beats.tutorial({ steps }), a step at a
 *              time, its caption and pips in yellow, SKIP TUTORIAL under it
 *   intro      the game's own intro (its threat, its host, what's coming)
 *   play       the game, until the clock runs out (show.record() each frame,
 *              for the replay)
 *   timeup ... TIME!, the rankings, the team total, the leaderboard, the
 *              replay, the rating and the end (IGB.complete there)
 *
 * The score capsules along the bottom, the pause panel and menu, the debug
 * options and the clock all come with the show.
 *
 * Input: px (left / right), py (height: up for a jump).
 *
 * To use it: copy this file to games/<your-id>.js, change the id below, and
 * add { id: '<your-id>', name: '<Name>', title: { lines: [{ text: 'NAME' }] } }
 * to a folder in games/manifest.js.
 */
IGB.register('template', function TemplateGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const SECONDS = 600;
	const FLOOR = H - 100;     // where the meeps stand

	const audio = stage.audio();
	audio.add('catch', 'assets/shared/sfx-correct.mp3', 0.3);

	const self = this;
	const meeps = [];
	const stars = [];
	let latest = [];           // where everyone is (the tracker's last word)
	let isLive = false;        // stars falling (the tutorial and the play)
	let t = 0;

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'template',
		seconds: SECONDS,
		players: () => meeps.length,
		scores: () => meeps.map((m) => m.score),
		music: false,
	});

	// the tutorial's steps: each done once everyone has done it (or its time's up)
	const moved = [];
	const everyone = (fn) => meeps.length > 0 && meeps.every((m, i) => fn(m, i));
	const TUTORIAL = [
		{ caption: 'STEP LEFT AND RIGHT', min: 2, max: 8, did: () => everyone((m, i) => moved[i] > 0.6) },
		{ caption: 'CATCH A FALLING STAR', min: 2, max: 10, did: () => everyone((m) => m.score >= 1) },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enter() { isLive = true; },
			update(dt) { t += dt; },
		}),
		// the game's own intro: what's coming (a threat, a host, the goal)
		{
			id: 'intro',
			length: 3.5,
			enter() { for (const m of meeps) m.score = 0; },   // (the tutorial's catches don't count)
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'CATCH THE STARS!', W / 2, 300, 120, bt - 0.2, { fill: '#ffd23f' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() { isLive = true; },
			update(dt) {
				t += dt;
				show.record(t, latest.slice(0, meeps.length));
			},
		},
		show.beats.timeUp({ enter() { isLive = false; } }),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(meeps.map((m) => m.score))); },
		}),
	]);

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const meep = new Meep(i);
			meep.x = W + (i + 1) / (count + 1) * W;
			meep.y = FLOOR;
			meep.scale = 0.6;
			meeps.push(meep);
		}
		show.go('title');
	}

	/* ---------- every tick ---------- */

	function step() {
		if (show.paused) return;
		if (isLive && Math.random() < 0.03) {
			stars.push({ x: W + 100 + Math.random() * (W - 200), y: -50, speed: 6 + Math.random() * 6 });
		}
		for (const s of stars) s.y += s.speed;

		for (const m of meeps) {
			for (const s of stars) {
				if (!s.caught && Math.abs(s.x - m.x) < 80 && Math.abs(s.y - (m.y - 150)) < 120) {
					s.caught = true;
					m.score++;
					m.doScore(1);
					audio.play('catch', true);
				}
			}
		}
		for (let i = stars.length - 1; i >= 0; i--) if (stars[i].caught || stars[i].y > H + 50) stars.splice(i, 1);
	}

	/* ---------- drawing (every animation frame) ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		show.frame(ctx, dt, drawWorld);
	};

	function drawWorld(ctx) {
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#1b1446', '#5a2d82']) });
		art.rect(ctx, W, FLOOR, W, H - FLOOR, { fill: '#2b1b55' });
		for (const s of stars) art.text(ctx, '★', s.x, s.y, { size: 90, fill: '#ffdd00', shadow: { color: 'rgba(255,221,0,0.6)', blur: 20 } });
		for (const m of meeps) m.draw(ctx);
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
		meeps.forEach(function (m, i) {
			const p = players[i];
			if (!p) return;
			const was = m.x;
			m.x = W + p.px * W;
			moved[i] = (moved[i] || 0) + Math.abs(m.x - was) / W;   // (for the tutorial's first step)
			// py is 0 (high) to 1 (low): stand tall to jump.
			m.y = FLOOR - Math.max(0, 0.45 - p.py) * 600;
		});
	};

	self.state = () => Object.assign(show.state(), { scores: meeps.map((m) => m.score) });

	self.fini = function () {
		show.fini();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);

	stage.interval(step, 1000 / FPS);
});
