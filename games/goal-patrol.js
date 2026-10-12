/*
 * Goal Patrol
 *
 * Players keep goal on the front wall, two at a time. Footballs in each
 * player's colour are kicked from the pitch towards spots in the goal; the
 * keeper moves left and right and squats up and down to bring their hands to
 * the spot as the ball arrives. Any save scores a point for the ball's
 * owner (cheered when you save your own colour, booed when you save someone
 * else's); a ball nobody reaches pulses "MISS". The side walls carry the
 * stadium and the sides of the goal.
 *
 * Input: px (left / right), py (hand height: squat to reach low).
 */
IGB.register('goal-patrol', function GoalPatrolGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const FLOOR = 100;
	const START = 300;
	const BALLR = 70;

	const BG = 'assets/shared/bg-stadium.jpg';
	const GOAL = 'assets/goal-patrol/goal-inside.png';
	const BALL = 'assets/shared/actor-football.png';

	const SEQUENCE = [
		[
			0, 6, 2, 3, 7,
			8, 4, 9, 1, 5,
		],
		[
			7, 1, 6, 2, 4,
			3, 9, 5, 8, 0,
		],
		[
			3, 0, 8, 4, 6,
			5, 7, 2, 9, 1,
		],
		[
			5, 3, 9, 0, 7,
			1, 8, 6, 4, 2,
		],
		[
			9, 3, 7, 6, 2,
			1, 5, 0, 8, 4,
		],
		[
			2, 8, 3, 7, 5,
			6, 0, 4, 1, 9,
		],
		[
			6, 9, 1, 5, 3,
			4, 2, 7, 0, 8,
		],
		[
			4, 6, 0, 9, 2,
			8, 1, 3, 5, 7,
		],
	];

	function generateQueue(seconds, cohort, ballsPerPlayer) {

		const total = cohort.length * ballsPerPlayer;
		const timePerSpawn = (seconds - 3.5) / total;

		let nSequence = 0;

		const balls = [];
		let queue = [];
		const players = {};

		for (const c in cohort) players[cohort[c]] = { sequence: undefined, cnt: 0 };

		for (let b = 0; b < total; b++) {

			if (!queue.length) {
				queue = cohort.concat();
				shuffleArray(queue);
			}

			const nMeep = queue.pop();

			const player = players[nMeep];

			if (player.cnt % 10 == 0) {
				player.sequence = SEQUENCE[nSequence % SEQUENCE.length];
				nSequence++;
			}

			const nPos = player.sequence.indexOf(player.cnt);

			player.cnt++;

			balls[b] = {
				n: nMeep,
				time: timePerSpawn * b * 1000,
				ox: 0.3 + (nPos % 5) * 0.1,
				tx: 0.2 + (nPos % 5) * 0.15,
				ty: 0.4 + Math.floor(nPos / 5) * 0.2,
				cx: -0.2 + Math.random() * 0.4,
				cy: -0.2 + Math.random() * 0.3,
			};
		}

		return balls;
	}

	const TUTORIALS = [
		undefined,
		undefined,
		generateQueue(30, [0, 1], 3),
		generateQueue(30, [0, 1, 2], 2),
		generateQueue(30, [0, 1, 2, 3], 2),
		generateQueue(30, [0, 1, 2, 3, 4], 1),
		generateQueue(30, [0, 1, 2, 3, 4, 5], 1),
	];

	const ROUNDS = [
		undefined,
		undefined,
		[
			[
				{ cohort: [0, 1], seconds: 40, queue: generateQueue(30, [0, 1], 5) },
			],
			[
				{ cohort: [0, 1], seconds: 40, queue: generateQueue(30, [0, 1], 8) },
			],
			[
				{ cohort: [0, 1], seconds: 40, queue: generateQueue(30, [0, 1], 12) },
			],
		],
		[
			[
				{ cohort: [0, 1], seconds: 25, queue: generateQueue(25, [0, 1], 5) },
				{ cohort: [1, 2], seconds: 25, queue: generateQueue(25, [1, 2], 5) },
				{ cohort: [0, 2], seconds: 25, queue: generateQueue(25, [0, 2], 5) },
			],
			[
				{ cohort: [0, 1], seconds: 25, queue: generateQueue(25, [0, 1], 8) },
				{ cohort: [1, 2], seconds: 25, queue: generateQueue(25, [1, 2], 8) },
				{ cohort: [0, 2], seconds: 25, queue: generateQueue(25, [0, 2], 8) },
			],
		],
		[
			[
				{ cohort: [0, 1], seconds: 30, queue: generateQueue(30, [0, 1], 5) },
				{ cohort: [2, 3], seconds: 30, queue: generateQueue(30, [2, 3], 5) },
			],
			[
				{ cohort: [0, 1], seconds: 30, queue: generateQueue(30, [0, 1], 10) },
				{ cohort: [2, 3], seconds: 30, queue: generateQueue(30, [2, 3], 10) },
			],
		],
		[
			[
				{ cohort: [0, 1], seconds: 30, queue: generateQueue(30, [0, 1], 8) },
				{ cohort: [2, 3], seconds: 30, queue: generateQueue(30, [2, 3], 8) },
				{ cohort: [4, 0], seconds: 30, queue: generateQueue(30, [4, 0], 8) },
				{ cohort: [1, 2], seconds: 30, queue: generateQueue(30, [1, 2], 8) },
				{ cohort: [3, 4], seconds: 30, queue: generateQueue(30, [3, 4], 8) },
			],
		],
		[
			[
				{ cohort: [0, 1], seconds: 30, queue: generateQueue(30, [0, 1], 5) },
				{ cohort: [2, 3], seconds: 30, queue: generateQueue(30, [2, 3], 5) },
				{ cohort: [4, 5], seconds: 30, queue: generateQueue(30, [4, 5], 5) },
			],
			[
				{ cohort: [0, 1], seconds: 30, queue: generateQueue(30, [0, 1], 10) },
				{ cohort: [2, 3], seconds: 30, queue: generateQueue(30, [2, 3], 10) },
				{ cohort: [4, 5], seconds: 30, queue: generateQueue(30, [4, 5], 10) },
			],
		],
	];

	/* ---------- art ---------- */

	// A football in player n's colour, as the DOM ball was: the football
	// picture (background-size 100%, so it repeats a sliver at the bottom),
	// tinted by a circle of the colour with mix-blend-mode: color, inside a
	// 10px ring of the colour. The ball's transform made it an isolated
	// group, so the tint only blends with the picture: render it once per
	// colour into its own canvas, at the world's resolution.
	const sprites = [];
	function footballSprite(n) {
		const k = Math.max(0.25, IGB.scale) * IGB.pixelRatio * 2;
		const cached = sprites[n];
		if (cached && cached.k === k) return cached.canvas;
		const img = art.ready(BALL);
		if (!img) return null;
		const D = BALLR * 2;
		const canvas = (cached && cached.canvas) || document.createElement('canvas');
		canvas.width = canvas.height = Math.ceil(D * k);
		const c = canvas.getContext('2d');
		c.setTransform(canvas.width / D, 0, 0, canvas.height / D, 0, 0);
		const color = PLAYER_COLORS[n];
		art.tile(c, img, 0, 0, D, D, D);
		art.ellipse(c, BALLR, BALLR, BALLR, BALLR, { fill: color, composite: 'color' });
		art.border(c, 0, 0, D, D, BALLR, 10, { fill: color });
		sprites[n] = { k, canvas };
		return canvas;
	}

	// The ball centred on (x, y), scaled and spun (degrees) about its centre.
	function drawFootball(ctx, n, x, y, scale, spin, alpha) {
		const sprite = footballSprite(n);
		if (!sprite || alpha <= 0) return;
		ctx.save();
		ctx.translate(x, y);
		if (spin) ctx.rotate(spin * Math.PI / 180);
		ctx.scale(scale, scale);
		ctx.globalAlpha *= alpha;
		ctx.drawImage(sprite, -BALLR, -BALLR, BALLR * 2, BALLR * 2);
		ctx.restore();
	}

	// Bold Rubik in a line box `line` high whose top is at lineTop, the
	// glyphs centred in it the way CSS line-height centres them.
	function lineText(ctx, str, x, lineTop, line, size, fill, alpha) {
		ctx.save();
		ctx.font = `700 ${size}px Rubik, sans-serif`;
		const fm = ctx.measureText(str);
		ctx.restore();
		const a = fm.fontBoundingBoxAscent;
		const d = fm.fontBoundingBoxDescent;
		art.text(ctx, str, x, lineTop + (line - (a + d)) / 2 + a, {
			size, font: 'Rubik', weight: 700, fill, alpha, baseline: 'alphabetic',
		});
	}

	// The keeper's arms: a white U, a 20px border with none on top, from the
	// hands (top) down into the head (bottom), corners 80% 80% 100% 100%.
	function drawArms(ctx, hMeep, height) {
		const w = BALLR * 2.5;
		const x = -BALLR * 1.25;
		const B = 20;
		const boxH = Math.max(B, height);      // jQuery clamps a negative height to 0; the border stays
		const top = -(hMeep - 180) - boxH;     // bottom: hMeep - 180
		const r = art.fitRadii(w, boxH, [
			{ x: w * 0.8, y: boxH * 0.8 }, { x: w * 0.8, y: boxH * 0.8 },
			{ x: w, y: boxH }, { x: w, y: boxH },
		]);
		const inner = [
			{ x: Math.max(0, r[0].x - B), y: r[0].y },
			{ x: Math.max(0, r[1].x - B), y: r[1].y },
			{ x: Math.max(0, r[2].x - B), y: Math.max(0, r[2].y - B) },
			{ x: Math.max(0, r[3].x - B), y: Math.max(0, r[3].y - B) },
		];
		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, x, top, w, boxH, r);
		if (boxH > B) art.roundRectPath(ctx, x + B, top, w - B * 2, boxH - B, inner);
		ctx.fillStyle = 'white';
		ctx.fill('evenodd');
		ctx.restore();
	}

	// A goalkeeping glove: a white mitt with a cuff in the player's colour,
	// at (x, y) and turned `rotate` degrees.
	function drawGlove(ctx, n, x, y, rotate) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rotate * Math.PI / 180);
		art.roundRect(ctx, -30, -30, 60, 60, [20, 20, 10, 10], { fill: 'white' });
		art.rect(ctx, -20, 30, 40, 15, { fill: PLAYER_COLORS[n] });
		ctx.restore();
	}

	/* ---------- a keeper ---------- */

	const GoalMeep = function (n) {
		const self = this;

		self.n = n;
		self.score = 0;
		self.visible = true;

		// Where the DOM keeper was: its feet at (x, H - FLOOR), its hands h
		// above them, the avatar hMeep tall. Unset until the tracker reports.
		self.x = 0;
		self.h = undefined;
		self.hMeep = undefined;
		self.armsHeight = undefined;

		const ball = { n: n, opacity: 0 };            // the ball held after a save
		const score = { text: '', opacity: 1, bottom: 0 };

		const meep = new Meep(n);
		meep.handLeft.visible = false;
		meep.handRight.visible = false;
		meep.eyes.visible = false;
		meep.mouth.visible = false;

		self.step = function () {

		};

		self.redraw = function () {
			// jQuery's .css ignored NaN before the tracker reported.
			const x = (1 + self.px) * W;
			if (isFinite(x)) self.x = x;

			const h = (1 - self.py) * H;
			if (!isFinite(h)) return;

			const hMeep = Math.max(300, h * 0.7);

			meep.setHeight(hMeep);

			self.h = h;
			self.hMeep = hMeep;
			score.bottom = h + 70;
			self.armsHeight = h - hMeep + 180;
		};

		self.addScore = function () {
			self.score++;
			score.text = '+1';
			score.opacity = 1;
			$(score).delay(500).animate({ opacity: 0 });
		};

		self.catch = function (n) {
			ball.n = n;
			ball.opacity = 1;
			$(ball).delay(500).animate({ opacity: 0 });
		};

		// Paint order is the DOM's: arms, held ball, gloves, score, then the
		// avatar over them all.
		self.draw = function (ctx) {
			if (!self.visible) return;
			ctx.save();
			ctx.translate(self.x, H - FLOOR);
			if (self.h !== undefined) {
				const h = self.h;
				drawArms(ctx, self.hMeep, self.armsHeight);
				drawFootball(ctx, ball.n, 0, -h, 1, 0, ball.opacity);
				drawGlove(ctx, n, 50, -h, -10);
				drawGlove(ctx, n, -50, -h, 10);
				if (score.text && score.opacity > 0) {
					lineText(ctx, score.text, 0, -score.bottom - 100, 100, 75, 'white', score.opacity);
				}
			}
			meep.draw(ctx);
			ctx.restore();
		};
	};

	/* ---------- a kicked ball ---------- */

	const Ball = function (n) {

		const self = this;

		self.n = n;

		//position
		self.px = 0.5;
		self.py = 0.5;

		//origin
		self.ox = 0.5;
		self.oy = 0.94;

		//target
		self.tx = 0.5;
		self.ty = 0.5;

		self.cx = 0.1;
		self.cy = -0.3;

		self.progress = 0;
		self.speed = 2; // seconds

		self.spin = 0;
		self.isKicked = false;

		// Where the DOM ball was: its shadow and the ball itself sat in a
		// point at (left, H - FLOOR), each `top` from it.
		self.left = 0;
		self.scale = 1;
		self.top = 0;
		self.shadowTop = 0;

		let nProgress = 0;

		self.step = function () {

			if (self.isKicked) nProgress++;

			self.progress = nProgress / (FPS * self.speed);
			if (self.progress > 1) self.progress = 1;

			self.px = self.ox + (self.tx - self.ox) * self.progress + Math.sin(Math.PI * self.progress) * self.cx;
			self.py = self.oy + (self.ty - self.oy) * self.progress + Math.sin(Math.PI * self.progress) * self.cy;
		};

		self.redraw = function () {

			self.scale = 0.4 + self.progress * 0.6;

			self.spin = -self.progress * self.cx * 3000;

			self.left = W * (1 + self.px);
			self.top = -START + (self.progress) * START - H * (1 - self.py);
			self.shadowTop = -START + (self.progress) * START;
		};

		// Each part was a box at (0, top) with transform
		// scale(s) translate(-50%, -50%) about its own centre, so its centre
		// lands at (w/2, top + h/2) less s times half its size.
		self.draw = function (ctx) {
			const s = self.scale;
			ctx.save();
			ctx.translate(self.left, H - FLOOR);
			art.ellipse(ctx, BALLR - BALLR * s, self.shadowTop + BALLR / 4 - BALLR / 4 * s, BALLR * s, BALLR / 4 * s, { fill: 'black', alpha: 0.5 });
			drawFootball(ctx, self.n, BALLR - BALLR * s, self.top + BALLR - BALLR * s, s, self.spin, 1);
			ctx.restore();
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	let showGlass = true;

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-sport.mp3', 0.3, true);
	audio.add('bounce', 'assets/shared/sfx-bounce.mp3', 1);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.4);
	audio.add('boo', 'assets/goal-patrol/sfx-boo.mp3', 0.4);
	audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.3);

	let isTutorial = false;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const meeps = [];
	let countPlayer = 2;
	function initGame(COUNT) {

		countPlayer = COUNT;

		for (let i = 0; i < countPlayer; i++) {
			meeps[i] = new GoalMeep(i);
			meeps[i].isActive = false;
			meeps[i].visible = false;
		}

		stage.timeout(initTutorial, 1000);
	}

	function initTutorial() {
		isTutorial = true;

		cohort = [];
		while (cohort.length < meeps.length) cohort.push(cohort.length);

		hud.initTutorial(
			'Goal Patrol',
			{ x: 1.25, y: 0.45, msg: 'Move left & right<br>to save your coloured balls', icon: 'side-to-side' },
			{ x: 1.75, y: 0.45, msg: 'Squat up and down<br>to reach', icon: 'up-down' },
		);

		for (const m of meeps) {
			m.visible = true;
			m.isActive = true;
		}

		const queue = TUTORIALS[meeps.length];
		for (const def of queue) {
			stage.timeout(function () {
				initBall(def);
			}, def.time);
		}

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		isTutorial = false;

		showGlass = false;
		hud.finiTutorial();
		hud.finiTimer();

		for (const m of meeps) {
			m.visible = false;
			m.isActive = false;
			m.score = 0;
		}

		balls.length = 0;
		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		showGlass = false;
		hud.initPlayers(meeps);
		stage.timeout(initNextCohort, 2000);
	}

	let iCohort = -1;
	let iRound = 0;
	let cohort;
	function initNextCohort() {
		iCohort++;

		if (!ROUNDS[meeps.length][iRound][iCohort]) {
			iCohort = 0;
			iRound++;
		}

		if (!ROUNDS[meeps.length][iRound]) {
			finiGame();
			return;
		}

		audio.play('music');

		const round = ROUNDS[meeps.length][iRound][iCohort];
		cohort = round.cohort;

		for (const c of cohort) {
			meeps[c].visible = true;
			meeps[c].isActive = true;
		}

		let delay = 0;
		if (iCohort == 0) {
			stage.timeout(function () {
				hud.initRound(iRound, ROUNDS[meeps.length].length);
			}, 2000);

			stage.timeout(function () {
				hud.finiBanner();
			}, 4000);

			delay = 4000;
		}

		stage.timeout(function () {
			hud.summonPlayers(cohort);
		}, delay + 2000);

		stage.timeout(function () {
			hud.finiBanner();
		}, delay + 4000);

		stage.timeout(function () {
			hud.initTimer(30, finiCohort);

			for (const def of round.queue) {
				stage.timeout(function () {
					initBall(def);
				}, def.time);
			}

		}, delay + 6000);
	}

	function finiCohort() {

		hud.finiTimer();

		for (const m of meeps) {
			m.visible = false;
			m.isActive = false;
		}

		stage.timeout(function () {
			initNextCohort();
		}, 2000);
	}

	const balls = [];
	const pulses = [];
	function initBall(def) {

		const ball = new Ball(def.n);
		ball.ox = def.ox;
		ball.tx = def.tx;
		ball.ty = def.ty;
		ball.cx = def.cx;
		ball.cy = def.cy;
		ball.redraw();
		balls.push(ball);

		ball.isKicked = false;

		stage.timeout(function () {
			audio.play('bounce', true);
			ball.isKicked = true;
		}, 1000);
	}

	function finiGame() {

		audio.stop('music');

		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 5000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function step() {

		for (const ball of balls) ball.step();

		for (let m = 0; m < meeps.length; m++) {
			if (!meeps[m].isActive) continue;
			meeps[m].step();
			for (const ball of balls) {

				if (ball.progress >= 1 && !ball.isClaimed) {
					const dx = (ball.px - meeps[m].px) * W;
					const dy = (ball.py - meeps[m].py) * H;
					const d = Math.sqrt(dx * dx + dy * dy);

					if (d < BALLR * 2) {
						ball.isClaimed = true;

						meeps[m].catch(ball.n);
						if (!isTutorial) meeps[ball.n].addScore();

						const isCorrectMeep = (m == ball.n);

						audio.play(isCorrectMeep ? 'cheer' : 'boo', true);
					}
				}
			}
		}

		for (const m of meeps) m.redraw();
		for (let b = 0; b < balls.length; b++) {
			if (balls[b].progress >= 1) {
				if (!balls[b].isClaimed) makePulse(balls[b]);
				balls.splice(b, 1);
				b--;

			} else {
				balls[b].redraw();
			}
		}

		hud.updatePlayers(meeps);
	}

	// A ring in the ball's colour, with MISS in it, swelling and fading
	// where the ball arrived.
	function makePulse(ball) {

		audio.play('incorrect', true);

		const pulse = {
			n: ball.n,
			left: (1 + ball.px) * W,
			top: (ball.py) * H - FLOOR,
			width: BALLR * 2,
			height: BALLR * 2,
			opacity: 1,
		};
		pulses.push(pulse);
		$(pulse).animate({
			opacity: 0,
			width: BALLR * 3,
			height: BALLR * 3,
		}, {
			complete: function () {
				pulses.splice(pulses.indexOf(pulse), 1);
			},
		});
	}

	/* ---------- drawing ---------- */

	// The stadium, full width across the three walls, bottom aligned.
	function drawStadium(ctx) {
		const img = art.ready(BG);
		if (!img) return;
		const h = IGB.WIDTH * img.naturalHeight / img.naturalWidth;
		art.image(ctx, img, 0, H - h, IGB.WIDTH, h);
	}

	// The goal across all three walls (its picture cut off 70 above the
	// bottom), with a faint goal line along the front wall.
	function drawGoal(ctx) {
		const img = art.ready(GOAL);
		if (img) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, IGB.WIDTH, H - 70);
			ctx.clip();
			art.image(ctx, img, 0, 0, IGB.WIDTH, IGB.WIDTH * img.naturalHeight / img.naturalWidth);
			ctx.restore();
		}
		art.rect(ctx, W, H - 70 - 20, W, 20, { fill: 'white', alpha: 0.2 });
	}

	// The ring was a 140 box plus a 15 border, centred on (left, top).
	function drawPulse(ctx, p) {
		const color = PLAYER_COLORS[p.n];
		const w = p.width + 30;
		const h = p.height + 30;
		art.border(ctx, p.left - w / 2, p.top - h / 2, w, h, { x: w, y: h }, 15, { fill: color, alpha: p.opacity });
		lineText(ctx, 'MISS', p.left, p.top - 50, 100, 50, color, p.opacity);
	}

	// Paint order is the DOM's: stadium, glass, the balls (each new one
	// was prepended, so underneath the older ones), the keepers, the goal
	// over them all, then the pulses.
	self.draw = function (ctx) {
		drawStadium(ctx);
		if (showGlass) art.glass(ctx);
		for (let b = balls.length - 1; b >= 0; b--) balls[b].draw(ctx);
		for (const m of meeps) m.draw(ctx);
		drawGoal(ctx);
		for (const p of pulses) drawPulse(ctx, p);
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.setPlayers = function (p) {
		meeps.forEach(function (m, i) {
			m.px = p[i].px;
			m.py = p[i].py;
		});
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
