/*
 * Dance Mat
 *
 * A rhythm game across all three walls. Each player's meep stands on a
 * wall, placed by where they are on the floor; coloured balls drop in time
 * with the song onto dance pads, each ball marking one of four arrows (up,
 * right, down, left) around its pad. Be on that arrow's side of the pad when
 * the ball lands for +1, otherwise "Oops!". Players dance in cohorts of up
 * to three, one song per round; most hits wins.
 *
 * Input: px, pz (floor position; on the side walls the two swap, so the
 * meep moves along whichever wall its next ball is on).
 */
IGB.register('dance-mat', function DanceMatGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const BALLR = 20;
	const GRIDSIZE = 120;
	const RINGR = 200;         // the ring (hidden in the original too)
	const GRAVITY = 0.002;
	const DRUMS = 4;
	const RADRANGE = Math.PI * 0.6;
	const DRUMW = 150;
	const BOUNCE = 0.7;

	const BG = 'assets/dance-mat/bg-kpop-stage.png';

	// Pad, arrow and ball colours by player (the CSS covered players 0-3;
	// the rest kept the default red).
	const COLORS = ['red', 'blue', 'limegreen', 'pink'];
	const color = (n) => COLORS[n] || 'red';

	// Where each arrow sits around its pad, and its glyph.
	const ARROWS = [
		{ x: 0, y: -GRIDSIZE, glyph: '↑' },
		{ x: GRIDSIZE, y: 0, glyph: '→' },
		{ x: 0, y: GRIDSIZE, glyph: '↓' },
		{ x: -GRIDSIZE, y: 0, glyph: '←' },
	];

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

	/* ---------- text ---------- */

	// Text whose CSS line box (lineHeight tall, or the font's own height
	// when undefined) has its top at y: the baseline goes where CSS puts it.
	function drawLineText(ctx, str, x, y, lineHeight, style) {
		ctx.save();
		ctx.font = style.font;
		const m = ctx.measureText(str);
		ctx.restore();
		const a = m.fontBoundingBoxAscent;
		const d = m.fontBoundingBoxDescent;
		const lh = lineHeight === undefined ? a + d : lineHeight;
		ctx.save();
		ctx.globalAlpha *= style.alpha === undefined ? 1 : style.alpha;
		ctx.font = style.font;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = style.fill;
		ctx.fillText(str, x, y + (lh - (a + d)) / 2 + a);
		ctx.restore();
	}

	/* ---------- a dancer ---------- */

	const DanceMeep = function (n, ax) {
		const self = this;

		self.n = n;
		self.score = 0;
		self.ax = ax;
		self.px = 0;
		self.ox = 0;
		self.wall = 1;

		// The 0x0 element everything hangs from: where update() last put it
		// (a NaN position from the tracker leaves it where it was), and the
		// scale(0.6) each cohort gives it.
		self.left = 0;
		self.top = H * BOUNCE;
		self.scale = 1;
		self.opacity = 1;

		// "+1" / "Oops!", 300px above the feet
		const score = { text: '0', opacity: 0 };

		const meep = new Meep(n);
		meep.setHeight(250);
		meep.eyes.visible = false;
		meep.mouth.visible = false;

		self.update = function () {
			self.ox = 0;

			let x = self.wall == 1 ? self.px : self.pz;
			let z = self.wall == 1 ? (1 - self.pz) : self.px;

			if (self.wall == 2) {
				x = 1 - x;
				z = 1 - z;
			}

			self.x = x;
			self.y = z;

			const left = W * self.wall + x * W;
			const top = z * H;
			if (isFinite(left)) self.left = left;
			if (isFinite(top)) self.top = top;
		};

		self.doCorrect = function (b) {
			if (b) self.score++;
			score.text = b ? '+1' : 'Oops!';
			score.opacity = 1;
			$(score).delay(500).animate({ opacity: 0 });
		};

		// layer: 'body' (score text and meep), 'hands', or both. Once scaled,
		// the element is its own stacking context and its hands stay inside
		// it; before that they rise above everything, z-index: 1.
		self.draw = function (ctx, layer) {
			if (self.opacity <= 0) return;
			ctx.save();
			ctx.translate(self.left, self.top);
			if (self.scale !== 1) ctx.scale(self.scale, self.scale);
			ctx.globalAlpha *= self.opacity;
			if (layer !== 'hands' && score.opacity > 0) {
				// a 1600-wide box centred on the feet, its bottom 300 above them
				const font = '400 100px "Paytone One"';
				ctx.save();
				ctx.font = font;
				const m = ctx.measureText(score.text);
				ctx.restore();
				drawLineText(ctx, score.text, 0, -300 - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent, undefined, {
					font, fill: 'white', alpha: score.opacity,
				});
			}
			meep.drawLocal(ctx, layer);
			ctx.restore();
		};
	};

	/* ---------- a ball falling onto a pad ---------- */

	const DanceBall = function (map, hotspot, meep) {

		const self = this;
		const nDrum = map.nDrum;

		const audio = stage.audio();
		audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.2);
		audio.add('fail', 'assets/shared/sfx-incorrect.mp3', 0.2);

		let bHit = false;

		self.ax = hotspot.x;
		self.ay = hotspot.y;

		self.px = hotspot.x;
		self.py = 0;

		self.sx = 0;
		self.sy = 0;

		// What update() last wrote to the element and its parts.
		self.removed = false;
		self.left = 0;
		self.top = H * BOUNCE;
		self.ballTop = 0;
		self.arrowOpacity = 1;
		self.padOpacity = 1;

		const RANGE = 0.2;

		self.step = function (beat) {
			const pos = (beat - map.beat);

			if (pos > -4 && pos < 0) meep.wall = hotspot.wall;

			if (!bHit) self.py = (pos / map.lerp);

			if (self.py > 0 && !bHit) {
				bHit = true;

				let nSelect = -1;

				const ox = (meep.wall + meep.x) - (hotspot.wall + hotspot.x);
				const oy = (meep.y) - (hotspot.y);

				if (Math.abs(ox) > RANGE || Math.abs(oy) > RANGE) {
					nSelect = -1;
				} else if (Math.abs(ox) > Math.abs(oy)) {
					nSelect = (ox > 0) ? 1 : 3;
				} else {
					nSelect = (oy > 0) ? 2 : 0;
				}

				self.sy = -0.03;
				self.sx = nSelect ? 0.003 : -0.003;

				const bCorrect = (nDrum == nSelect);

				audio.play(bCorrect ? 'correct' : 'fail', true);
				meep.doCorrect(bCorrect);
			}

			if (bHit) {
				self.sy += GRAVITY;
				self.px += self.sx;
				self.py += self.sy;

				self.removed = true;
			}
		};

		self.update = function () {

			if (bHit) return;

			self.left = hotspot.wall * W + W * hotspot.x;
			self.top = H * self.ay;

			self.ballTop = self.py * H - BALLR;
			self.arrowOpacity = Math.min(1, 1 + self.py);
			self.padOpacity = 4 + self.py;
		};

		// A 120 circle squashed to 80% height, centred on (x, y), with its
		// arrow glyph in a 120px line.
		function drawArrow(ctx, x, y, alpha) {
			if (alpha <= 0) return;
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(1, 0.8);
			ctx.globalAlpha *= Math.min(1, alpha);
			art.circle(ctx, 0, 0, GRIDSIZE / 2, { fill: color(meep.n) });
			drawLineText(ctx, ARROWS[nDrum].glyph, 0, -GRIDSIZE / 2, GRIDSIZE, {
				font: `bold ${GRIDSIZE * 0.8}px "Paytone One"`, fill: 'white',
			});
			ctx.restore();
		}

		self.draw = function (ctx) {
			if (self.removed) return;
			const a = ARROWS[nDrum];
			ctx.save();
			ctx.translate(self.left, self.top);

			// the pad: a 96 ring with a 10px border, squashed to 80% height
			if (self.padOpacity > 0) {
				const s = GRIDSIZE * 0.8;
				ctx.save();
				ctx.scale(1, 0.8);
				art.border(ctx, -s / 2, -s / 2, s, s, s / 2, 10, { fill: color(meep.n), alpha: Math.min(1, self.padOpacity) });
				ctx.restore();
			}

			drawArrow(ctx, a.x, a.y, self.arrowOpacity);
			drawArrow(ctx, a.x, a.y + self.ballTop, 1);

			ctx.restore();
		};
	};

	/* ---------- the game ---------- */

	const self = this;

	let isTutorial = false;
	let timeStartTutorial;

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
			0.5);

		for (let p = 0; p < round.players.length; p++) {
			const m = round.players[p];
			meeps[m].ax = 0.3 + (1 / (round.players.length - 1) * p) * 0.4;
			meeps[m].opacity = 1;
			meeps[m].scale = 0.6;
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
	function initRound() {
		audio.play(round.song.track);

		const hotspots = [
			{ wall: 0, x: 0.3, y: 0.7 },
			{ wall: 0, x: 0.5, y: 0.5 },
			{ wall: 0, x: 0.7, y: 0.7 },
			{ wall: 1, x: 0.3, y: 0.5 },
			{ wall: 1, x: 0.5, y: 0.7 },
			{ wall: 1, x: 0.7, y: 0.5 },
			{ wall: 2, x: 0.3, y: 0.5 },
			{ wall: 2, x: 0.5, y: 0.7 },
			{ wall: 2, x: 0.7, y: 0.5 },
		];

		const sequence = [
			[3, 4, 5],
			[1, 2, 0],
			[6, 7, 8],
			[0, 3, 8],
		];

		for (let b = 0; b < round.song.beats.length; b++) {

			const p = b % round.players.length;
			const m = round.players[p];

			const nSequence = Math.floor((b / round.song.beats.length) * sequence.length);

			// Each row has a hotspot per place in the cohort. The original
			// looked it up by player number, which is past the end of the row
			// for players 4 to 6 and threw, stalling the game for 4+ players.
			const hotspot = hotspots[sequence[nSequence][p]];

			balls[b] = new DanceBall(
				round.song.beats[b],
				hotspot,
				meeps[m],
			);

			balls[b].step(0);
			balls[b].update();
		}

		hud.initTimer(round.song.seconds, finiRound);
	}

	const meeps = [];
	function initGame(COUNT = 3) {

		for (let i = 0; i < COUNT; i++) {
			meeps[i] = new DanceMeep(i);
		}

		initNextRound();
	}

	function finiRound() {

		hud.finiTimer();

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
			IGB.complete(rewards);
			self.fini();
		}, 3000);
	}

	// The original never used playersMeta: it always asks for the squad size.
	hud.initPlayerCount(initGame);

	const FPS = 50;
	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		// The stage on every wall: the picture at 160% x 130%, top centre.
		art.eachWall(ctx, function (c) {
			c.save();
			c.beginPath();
			c.rect(0, 0, W, H);
			c.clip();
			art.image(c, BG, (W - W * 1.6) / 2, 0, W * 1.6, H * 1.3);
			c.restore();
		});

		// Each round's balls were added before its dancers were moved to
		// the top, so the dancers are always over the balls.
		for (const b of balls) b.draw(ctx);
		for (const m of meeps) m.draw(ctx, m.scale !== 1 ? undefined : 'body');
		for (const m of meeps) if (m.scale === 1) m.draw(ctx, 'hands');
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].pz = p[m].pz;
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
