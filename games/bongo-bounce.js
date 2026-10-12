/*
 * Bongo Bounce
 *
 * Each player's avatar stands on the front wall holding a ring with two
 * bongos over its head, one black and one white. Balls of either colour
 * drop onto it in time with the music; leaning left or right tilts the
 * ring so the drum of the ball's colour is on top when it lands. Players
 * play in cohorts of two or three, one song each, two rounds.
 *
 * Input: px (lean side to side).
 */
IGB.register('bongo-bounce', function BongoBounceGame(stage, playersMeta) {

	const W = 1600;
	const H = 1000;
	const BALLR = 20;
	const RINGR = 200;
	const GRAVITY = 0.002;
	const DRUMS = 2;
	const RADRANGE = Math.PI * 0.6;
	const DRUMW = 150;
	const BOUNCE = 0.7;

	const art = IGB.art;
	const BG = 'assets/shared/bg-village.png';

	const SONGS = [
		{
			track: 'assets/shared/music-beats-90.mp3',
			bpm: 90,
			offset: 0,
			seconds: 50,
			map: [
				{ from: 2, to: 8, every: 2 },
				{ from: 12, to: 14, every: 1 },
				{ from: 18, to: 20, every: 1 },
				{ from: 24, to: 32, every: 2 },
				{ from: 38, to: 48, every: 2 },
				{ from: 50, to: 62, every: 1 },
				{ from: 66, to: 68, every: 2 },
				{ from: 72, to: 72, every: 1 },
			],
		}, {
			track: 'assets/shared/music-beats-120.mp3',
			bpm: 120,
			offset: 0,
			seconds: 73,
			map: [
				{ from: 2, to: 14, every: 4 },
				{ from: 15, to: 18, every: 1 },
				{ from: 22, to: 26, every: 1 },
				{ from: 30, to: 32, every: 1 },
				{ from: 36, to: 64, every: 1 },
				{ from: 68, to: 72, every: 1 },
				{ from: 76, to: 80, every: 1 },
				{ from: 84, to: 100, every: 4 },
				{ from: 101, to: 124, every: 1 },
				{ from: 127, to: 132, every: 1 },
				{ from: 135, to: 140, every: 1 },
			],
		}, {
			track: 'assets/shared/music-beats-90-short.mp3',
			bpm: 90,
			offset: 0,
			seconds: 42,
			map: [
				{ from: 2, to: 4, every: 2 },
				{ from: 8, to: 16, every: 2 },
				{ from: 22, to: 32, every: 2 },
				{ from: 34, to: 46, every: 1 },
				{ from: 50, to: 52, every: 2 },
				{ from: 56, to: 56, every: 1 },
			],
		}, {
			track: 'assets/shared/music-beats-120-short.mp3',
			bpm: 120,
			offset: 0,
			seconds: 42,
			map: [
				{ from: 2, to: 14, every: 4 },
				{ from: 15, to: 18, every: 1 },
				{ from: 22, to: 26, every: 1 },
				{ from: 30, to: 32, every: 1 },
				{ from: 36, to: 64, every: 1 },
				{ from: 68, to: 72, every: 1 },
				{ from: 76, to: 80, every: 1 },
			],
		},
	];

	for (const song of SONGS) {
		song.bps = song.bpm / 60;

		song.beats = [];
		for (const m of song.map) {
			for (let i = m.from; i <= m.to; i += m.every) {
				song.beats.push({ beat: i, lerp: 2, nDrum: Math.floor(Math.random() * DRUMS) });
			}
		}
	}

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[{ players: [0, 1], song: SONGS[0] }],
			[{ players: [0, 1], song: SONGS[1] }],
		],
		[
			[{ players: [0, 1, 2], song: SONGS[0] }],
			[{ players: [0, 1, 2], song: SONGS[1] }],
		],
		[
			[{ players: [0, 1], song: SONGS[2] }, { players: [2, 3], song: SONGS[2] }],
			[{ players: [0, 1], song: SONGS[3] }, { players: [2, 3], song: SONGS[3] }],
		],
		[
			[{ players: [0, 1, 2], song: SONGS[2] }, { players: [3, 4], song: SONGS[2] }],
			[{ players: [0, 1, 2], song: SONGS[3] }, { players: [3, 4], song: SONGS[3] }],
		],
		[
			[{ players: [0, 1, 2], song: SONGS[2] }, { players: [3, 4, 5], song: SONGS[2] }],
			[{ players: [0, 1, 2], song: SONGS[3] }, { players: [3, 4, 5], song: SONGS[3] }],
		],
	];

	/* ---------- art ---------- */

	// The arms (drumarms): a white U, the bottom half of a 20px border round
	// a RINGR box with no top border, 30px below the ring's centre at its lowest.
	function drawArms(ctx) {
		const top = 30 - RINGR;
		const r = RINGR / 2;
		ctx.save();
		ctx.beginPath();
		ctx.rect(-RINGR / 2, top, RINGR, RINGR);
		ctx.clip();
		// a full border 20px taller, its top edge clipped away
		art.border(ctx, -RINGR / 2, top - 20, RINGR, RINGR + 20, [0, 0, r, r], 20, { fill: 'white' });
		ctx.restore();
	}

	// A bongo (drumdrum) at its point on the ring, turned so +x points out
	// of the ring: the shell (:before) inside, the head (:after) on the end.
	const SHELL_RADII = [{ x: DRUMW / 2, y: DRUMW }, 20, 20, { x: DRUMW / 2, y: DRUMW }];
	function drawDrum(ctx, drum) {
		const isBlack = drum.color === 'black';
		ctx.save();
		ctx.translate(drum.left, drum.top);
		ctx.rotate(drum.rotate);

		const shell = (c) => art.roundRectPath(c, -DRUMW / 2, -DRUMW / 2, DRUMW / 2, DRUMW, SHELL_RADII);
		art.roundRect(ctx, -DRUMW / 2, -DRUMW / 2, DRUMW / 2, DRUMW, SHELL_RADII, { fill: isBlack ? '#333' : '#eee' });
		art.inset(ctx, shell, { color: 'black', blur: 10 });

		const head = (c) => c.ellipse(5, 0, 15, DRUMW / 2, 0, 0, Math.PI * 2);
		art.ellipse(ctx, 5, 0, 15, DRUMW / 2, {
			fill: isBlack ? '#333' : 'white',
			shadow: { color: 'rgba(0,0,0,0.3)', blur: 0, x: -10 },
		});
		art.inset(ctx, head, { color: 'black', blur: 5 });

		ctx.restore();
	}

	// CSS put the score's line box bottom RINGR / 2 above the player's
	// point; the text's baseline sits the font's descent above that.
	function scoreBaseline(ctx) {
		ctx.save();
		ctx.font = '400 100px "Paytone One", sans-serif';
		const m = ctx.measureText('0');
		ctx.restore();
		return -RINGR / 2 - (m.fontBoundingBoxDescent || 0);
	}

	/* ---------- a player and their drums ---------- */

	const DrumMeep = function (n, ax) {
		const self = this;

		self.score = 0;
		self.ax = ax;
		self.px = 0;
		self.ox = 0;

		// The drummeep element: a point at (left, top), scaled about itself.
		self.left = 0;
		self.top = 0;
		self.scale = 1;
		self.opacity = 1;

		const score = { text: '0', opacity: 0 };

		const ring = { rotate: 0 };

		const meep = new Meep(n);
		meep.setHeight(350);
		meep.handLeft.visible = false;
		meep.handRight.visible = false;
		meep.y = 400;

		const drums = [];
		for (let i = 0; i < DRUMS; i++) {

			const r = RADRANGE / DRUMS * (i - ((DRUMS - 1) / 2)) - (Math.PI / 2);

			drums[i] = {
				rotate: r,
				left: Math.cos(r) * RINGR,
				top: Math.sin(r) * RINGR,
				color: i == 0 ? 'black' : 'white',
			};
		}

		self.update = function () {
			self.ox = (self.px - self.ax) * 12;

			if (self.ox < -1) self.ox = -1;
			if (self.ox > 1) self.ox = 1;

			// Before the tracker reports, ox is NaN; the old CSS ignored
			// the resulting values and left everything where it was (the
			// head's top: '20px' still applied).
			meep.head.top = 20;
			if (!isNaN(self.ox)) {
				ring.rotate = self.ox * (RADRANGE / 4);

				meep.head.left = -50 + self.ox * 20;
				meep.head.rotate = self.ox * (RADRANGE / 8) * 180 / Math.PI;

				for (let d = 0; d < drums.length; d++) {
					const r = RADRANGE / DRUMS * (d - ((DRUMS - 1) / 2)) - (Math.PI / 2);

					const p = 1 - (self.ox + 1) / 2;
					const pDrum = d * 1 / (drums.length - 1);
					const pDist = pDrum - p;

					drums[d].rotate = r - pDist * 0.8;
				}
			}

			const left = W + self.ax * W;
			if (!isNaN(left)) self.left = left;
		};

		self.doCorrect = function (b) {
			if (b) self.score++;
			score.text = b ? '+1' : 'Oops!';
			score.opacity = 0.5;
			$(score).delay(100).animate({ opacity: 0 });
		};

		self.draw = function (ctx) {
			if (self.opacity <= 0) return;
			ctx.save();
			ctx.translate(self.left, self.top);
			ctx.scale(self.scale, self.scale);
			ctx.globalAlpha *= self.opacity;

			if (score.opacity > 0) {
				art.text(ctx, score.text, 0, scoreBaseline(ctx), {
					size: 100, font: 'Paytone One', weight: 400, fill: 'white',
					baseline: 'alphabetic', alpha: score.opacity,
				});
			}

			ctx.save();
			ctx.translate(0, RINGR);
			ctx.rotate(ring.rotate);
			drawArms(ctx);
			for (const drum of drums) drawDrum(ctx, drum);
			ctx.restore();

			meep.draw(ctx);

			ctx.restore();
		};
	};

	/* ---------- a ball ---------- */

	const DrumBall = function (map, meep) {

		const self = this;
		const nDrum = map.nDrum;

		const audio = stage.audio();
		audio.add('correct', 'assets/bongo-bounce/sfx-drum-big.mp3', 0.5);
		audio.add('fail', 'assets/bongo-bounce/sfx-knock.mp3', 0.5);

		// What the drumball element last showed: its left, the sphere's
		// centre above the bounce line, and its shadow on that line.
		const shown = { left: 0, top: 0, shadow: 0, shadowVisible: true };

		let bHit = false;

		self.px = meep.ax;
		self.py = 0;

		self.sx = 0;
		self.sy = 0;

		self.step = function (beat) {
			const pos = (beat - map.beat);

			if (!bHit) self.py = (pos / map.lerp);

			if (self.py > 0 && !bHit) {
				bHit = true;

				const nSelect = (meep.ox > 0) ? 0 : 1;

				self.sy = -0.03;
				self.sx = nSelect ? 0.003 : -0.003;
				shown.shadowVisible = false;

				const bCorrect = (nDrum == nSelect);
				audio.play(bCorrect ? 'correct' : 'fail', true);

				meep.doCorrect(bCorrect);
			}

			if (bHit) {
				self.sy += GRAVITY;
				self.px += self.sx;
				self.py += self.sy;
			}
		};

		self.update = function () {
			shown.left = W + W * self.px;
			shown.top = self.py * H - BALLR;
			shown.shadow = Math.min(1, 1 + self.py);
		};

		self.draw = function (ctx) {
			const y = H * BOUNCE;
			if (shown.shadowVisible && shown.shadow > 0) {
				art.ellipse(ctx, shown.left, y, BALLR, BALLR * 0.25, { fill: 'black', alpha: shown.shadow });
			}

			const cy = y + shown.top;
			if (cy + BALLR < 0 || cy - BALLR > H) return;

			const sphere = (c) => c.arc(shown.left, cy, BALLR, 0, Math.PI * 2);
			art.circle(ctx, shown.left, cy, BALLR, { fill: nDrum == 0 ? '#333' : '#eee' });
			art.inset(ctx, sphere, { color: 'rgba(255,255,255,0.7)', blur: 0, y: 2 });
			art.inset(ctx, sphere, { color: 'black', blur: 5, y: -2 });
		};
	};

	/* ---------- the game ---------- */

	const self = this;

	let showBlur = true;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const audio = stage.audio();

	function step() {

		for (const m of meeps) m.update();

		let beat = 0;

		if (round) {
			const timeCurrent = audio.getTime(round.song.track);
			beat = (timeCurrent - round.song.offset) * round.song.bps;
		} else if (isTutorial) {
			const time = new Date().getTime();
			const timeElapsed = time - timeStartTutorial;
			beat = timeElapsed / 1000;
		}

		for (const b of balls) b.step(beat);
		for (const b of balls) b.update();

		hud.updatePlayers(meeps);
	}

	let nCohort = -1;
	let nRound = -1;
	let round;

	function initNextRound() {

		let isNewRound = false;
		nCohort++;

		if (!STRUCTURE[meeps.length][nRound] || !STRUCTURE[meeps.length][nRound][nCohort]) {
			nCohort = 0;
			nRound++;
			isNewRound = true;
		}

		round = STRUCTURE[meeps.length][nRound][nCohort];

		audio.add(
			round.song.track,
			round.song.track,
			1);

		for (let p = 0; p < round.players.length; p++) {
			const m = meeps[round.players[p]];
			m.ax = 0.22 + (1 / (round.players.length - 1) * p) * 0.56;
			m.opacity = 1;
			m.scale = 1;
			m.top = 1.1 * H;
			$(m).animate({ top: 0.65 * H }).animate({ top: 0.7 * H });
		}

		stage.timeout(function () {
			hud.summonPlayers(round.players);
		}, 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 3000);

		if (isNewRound) {
			stage.timeout(function () {
				hud.initRound(nRound, STRUCTURE[meeps.length].length);
				hud.revealTimer(round.song.seconds);
			}, 4000);

			stage.timeout(function () {
				hud.finiBanner();
			}, 6000);

			stage.timeout(function () {
				initRound();
			}, 7000);
		} else {
			stage.timeout(function () {
				hud.revealTimer(round.song.seconds);
			}, 3000);
			stage.timeout(initRound, 4000);
		}
	}

	let balls = [];
	// Every ball ever added, in the order their elements were appended. A
	// ball replaced in `balls` stopped updating but its element stayed put.
	const ballsShown = [];

	function initRound() {
		audio.play(round.song.track);

		for (let b = 0; b < round.song.beats.length; b++) {

			const m = round.players[b % round.players.length];

			balls[b] = new DrumBall(
				round.song.beats[b],
				meeps[m]
			);

			ballsShown.push(balls[b]);
			balls[b].step(0);
			balls[b].update();
		}

		hud.initTimer(round.song.seconds, finiRound);
	}

	let meeps = [];
	function initGame(COUNT = 3) {

		for (let i = 0; i < COUNT; i++) {
			meeps[i] = new DrumMeep(i);
			meeps[i].top = 1.1 * H;
		}

		initTutorial();
	}

	let isTutorial = false;
	let timeStartTutorial;
	function initTutorial() {

		isTutorial = true;
		timeStartTutorial = new Date().getTime();

		hud.initTutorial(
			'Bongo Bounce',
			{ x: 1.22, y: 0.5, msg: 'Align yourself<br>with your Avatar', icon: 'align' },
			{ x: 1.7, y: 0.5, msg: 'Move side-to-side to bounce<br>the black and white balls', icon: 'side-to-side' },
		);

		for (let m = 0; m < meeps.length; m++) {
			meeps[m].ax = 0.22 + (1 / (meeps.length - 1) * m) * 0.56;
			meeps[m].scale = 0.5;
			meeps[m].top = 0.7 * H;
		}

		for (let i = 0; i < 20; i++) {
			balls[i] = new DrumBall(
				{ beat: 10 + i, lerp: 2, nDrum: Math.floor(Math.random() * DRUMS) },
				meeps[i % meeps.length]
			);

			ballsShown.push(balls[i]);
			balls[i].step(0);
			balls[i].update();
		}

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		showBlur = false;

		isTutorial = false;
		hud.finiTimer();
		hud.finiTutorial();

		for (const m of meeps) {
			$(m).animate({ opacity: 0 });
			m.score = 0;
		}

		stage.timeout(initPlay, 2000);
	}

	function initPlay() {
		hud.initPlayers(meeps);

		stage.timeout(initNextRound, 1000);
	}

	function finiRound() {

		hud.finiTimer();

		for (let p = 0; p < round.players.length; p++) {
			const m = meeps[round.players[p]];
			$(m).animate({ top: 0.65 * H }).animate({ top: 1.1 * H });
		}

		stage.timeout(function () {
			hud.finiBanner();
		}, 2000);

		if (STRUCTURE[meeps.length][nRound][nCohort + 1] || STRUCTURE[meeps.length][nRound + 1]) {
			hud.initBanner('Nice one!');
			stage.timeout(initNextRound, 3000);
		} else {
			hud.initBanner('Finish!');
			stage.timeout(initFinalScores, 2000);
		}
	}

	function initFinalScores() {

		const scores = [];
		for (let m = 0; m < meeps.length; m++) scores[m] = meeps[m].score;

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 3000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	const FPS = 50;
	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	// The village tiled at 33.3% x 100% of the three walls, centred.
	const TILE = 0.333 * IGB.WIDTH;
	const TILE_X = (IGB.WIDTH - TILE) / 2 - 2 * TILE;

	self.draw = function (ctx) {
		art.tile(ctx, BG, TILE_X, 0, 5 * TILE, H, TILE, H);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#be8445', 'rgba(190,132,69,0)']) });
		if (showBlur) art.glass(ctx);

		for (const m of meeps) m.draw(ctx);
		for (const b of ballsShown) b.draw(ctx);
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].r = { W: p[m].rW, X: p[m].rX, Y: p[m].rY, Z: p[m].rZ };
		}
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
