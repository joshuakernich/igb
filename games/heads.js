/*
 * Volley Heads and Soccer Heads
 *
 * Two players at a time head a ball about the front wall while the rest of
 * the squad waits their turn. In Volley Heads each keeps to their own side
 * of a net and scores when the ball lands on the other side; in Soccer Heads
 * they share the pitch and score by heading the ball low into the goal they
 * face. The side walls only carry the stadium (and, for soccer, the goals).
 *
 * One file, two games: 'volley-heads' and 'soccer-heads' share HeadersGame
 * and differ only in typeGame.
 *
 * Input: px (left / right), py (head height: stand tall to rise).
 */
(function () {

	function HeadersGame(stage, playersMeta, typeGame = 'volley') {

		const art = IGB.art;

		const Ball = function (RADIUS, W, H) {

			const GRAVITY = 1;

			const self = this;

			self.px = W / 2;
			self.py = H * 0.4;
			self.sx = -10 + Math.random() * 20;
			self.sy = -20;

			self.floor = H - BALLR;

			// Where the DOM ball sat: its shadow on the ground at `left`, the
			// ball itself `top` above that. Unset until the first update.
			self.left = undefined;
			self.top = undefined;

			self.step = function () {
				self.sy += GRAVITY;
				self.py += self.sy;
				self.px += self.sx;
			};

			self.update = function () {
				self.left = W + self.px;
				self.top = -H + self.py;
			};
		};

		const W = 1600;
		const H = 1000;
		const BALLR = 60;
		const HEADR = 50;

		const NET = 350;
		const COLLIDE = HEADR + BALLR;

		// The field's bottom edge, where the meeps stand and the ball's shadow lies.
		const FLOOR = H - 100;

		const BG = 'assets/shared/bg-stadium.jpg';
		const BALL = 'assets/shared/actor-football.png';
		const GOAL = 'assets/heads/goal.png';
		const NET_IMG = 'assets/heads/volleyball-net.png';

		// match-up sequence for each player count
		const MATCHUPS = [
			undefined,
			undefined,
			['01', '01'],
			['01', '12', '02', '01', '12', '02'],
			['01', '23', '02', '13'],
			['01', '23', '40', '12', '34'],
			['01', '23', '45'],
		];

		const ROUND_TIMES = [
			undefined,
			undefined,
			90,
			45,
			30,
			25,
			30,
		];

		const self = this;

		let showGlass = true;

		const audio = stage.audio();
		audio.add('music', 'assets/shared/music-sport.mp3', 0.3, true);
		audio.add('bounce', 'assets/shared/sfx-bounce.mp3', 0.3);
		audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.6);

		let isTutorial = true;

		const hud = new HUD();
		hud.$el.appendTo(stage.$ui);

		// jQuery's .css() ignored NaN (a player the tracker has not reported
		// yet), so the old elements simply stayed put. Do the same.
		function setIfNumber(obj, key, v) {
			if (Number.isFinite(v)) obj[key] = v;
		}

		function doScore(nScore, ball) {

			if (!isTutorial) {
				meepsActive[nScore].score++;
				const s = meepsActive[nScore].scoreText;
				s.text = '+1';
				s.opacity = 1;
				$(s).delay(500).animate({ opacity: 0 });
				audio.play('cheer', true);
				hud.updatePlayers(meeps);
			}

			iTimeout = stage.timeout(function () {
				finiBall(ball);
			}, 1000);
		}

		function step() {

			for (let m = 0; m < meeps.length; m++) {
				setIfNumber(meeps[m], 'x', meeps[m].px);
			}

			for (let m = 0; m < meepsActive.length; m++) {
				const h = (H - meepsActive[m].py) + HEADR;
				if (Number.isFinite(h)) meepsActive[m].setHeight(h);
				setIfNumber(meepsActive[m].scoreText, 'bottom', h);

				if (meepsActive[m].range) {
					if (meepsActive[m].px < meepsActive[m].range.min) meepsActive[m].px = meepsActive[m].range.min;
					if (meepsActive[m].px > meepsActive[m].range.max) meepsActive[m].px = meepsActive[m].range.max;
				}

				setIfNumber(meepsActive[m], 'x', W + meepsActive[m].px);
			}

			for (const ball of balls) {
				ball.step();

				if (typeGame == 'volley') {

					// wall left
					if (ball.px < BALLR) {
						ball.px = BALLR;
						ball.sx = Math.abs(ball.sx);
						audio.play('bounce', true);
					}

					// wall right
					if (ball.px > W - BALLR) {
						ball.px = W - BALLR;
						ball.sx = -Math.abs(ball.sx);
						audio.play('bounce', true);
					}

					// net
					const dxNet = (ball.px) - (W / 2);
					const isNearNet = Math.abs(dxNet) < BALLR;
					if (isNearNet && !ball.dead) {

						const isHitting = ball.sy > 0 && ball.py > (H - NET - BALLR);

						if (isHitting) {
							if (Math.abs(dxNet) < BALLR / 2) {
								ball.py = (H - NET - BALLR);
								ball.sy = -25;
								ball.sx = dxNet * 0.2;
							} else {
								const sidedness = dxNet > 0 ? 1 : -1;
								ball.px = W / 2 + sidedness * BALLR;
							}
							audio.play('bounce', true);
						}
					}
				} else if (typeGame == 'football') {

					const dx = ball.px - W / 2;
					const isSide = Math.abs(dx) > (W / 2 - 120);

					if (isSide && !ball.dead) {

						const dir = dx > 0 ? 1 : -1;
						const isAbove = ball.py < 350;
						const isBelow = ball.py > 500;

						if (isAbove) {
							ball.dead = true;
							ball.floor = 350;
							iTimeout = stage.timeout(function () {
								finiBall(ball);
							}, 1000);
						} else if (isBelow) {
							ball.dead = true;
							doScore((ball.px > W / 2) ? 0 : 1, ball);
						} else {
							// isCrossbar
							ball.px = W / 2 + dir * (W / 2 - 120);
							ball.sx = Math.abs(ball.sx) * -dir;
						}
					}
				}

				// ground
				if (ball.py > ball.floor) {

					// As in the original, this sets the game's py, not the
					// ball's, so the ball is not snapped back to the floor.
					// Kept so the bounces come out the same.
					self.py = ball.floor;

					if (!ball.dead) audio.play('bounce', true);

					if (typeGame == 'volley' && !ball.dead) {
						ball.dead = true;
						doScore((ball.px > W / 2) ? 0 : 1, ball);
					}

					if (ball.dead) {
						ball.sy = Math.min(-10, -Math.abs(ball.sy) * 0.7);
						ball.sx *= 0.8;
					} else {
						ball.sy = -35;
					}

				} else if (!ball.dead) {
					for (const meep of meepsActive) {
						const dx = (ball.px - meep.px);
						const dy = (ball.py - meep.py);
						const d = Math.sqrt(dx * dx + dy * dy);

						if (d < COLLIDE) {
							audio.play('bounce', true);
							const r = Math.atan2(dy, dx);
							ball.px = meep.px + Math.cos(r) * COLLIDE;
							ball.py = meep.py + Math.sin(r) * COLLIDE;
							ball.sx = Math.cos(r) * 15;
							ball.sy = Math.sin(r) * 15 - 10;
						}
					}
				}

				ball.update();
			}
		}

		const balls = [];
		function initBall() {
			const ball = new Ball(BALLR, W, H);
			balls.push(ball);
		}

		let iTimeout;
		function finiBall(ball) {

			const nBall = balls.indexOf(ball);
			balls.splice(nBall, 1);

			iTimeout = stage.timeout(initBall, 1000);
		}

		const meeps = [];
		let countPlayer = 2;
		function initGame(COUNT) {

			countPlayer = COUNT;

			for (let i = 0; i < countPlayer; i++) {
				const meep = new Meep(i);
				meep.name = playersMeta ? playersMeta[i].name : 'ANONYMOUS';
				// the "+1" that flashes over a scorer's head
				meep.scoreText = { text: '', opacity: 0, bottom: 350 };
				meep.x = (40 + i * 20) / 100 * IGB.WIDTH;
				meep.y = FLOOR;
				meeps[i] = meep;
			}

			initTutorial();
		}

		function initTutorial() {

			isTutorial = true;
			meepsActive = meeps;

			if (typeGame == 'volley') {

				for (let m = 0; m < meepsActive.length; m++) {
					if (m < meepsActive.length / 2) meepsActive[m].range = rangeLeft;
					else meepsActive[m].range = rangeRight;
				}

				hud.initTutorial(
					'Volley Heads',
					{ x: 1.25, y: 0.45, msg: 'Align yourself<br>to your side of the net', icon: 'align' },
					{ x: 1.75, y: 0.45, msg: 'Move left & right<br>to head the ball over the net', icon: 'side-to-side' },
				);

			} else {
				hud.initTutorial(
					'Soccer Heads',
					{ x: 1.5, y: 0.45, msg: 'Move left & right<br>to head the ball into the goal', icon: 'side-to-side' },
				);
			}

			initBall();

			hud.initTimer(30, finiTutorial);
		}

		function finiTutorial() {

			showGlass = false;

			isTutorial = false;
			clearInterval(iTimeout);
			for (const ball of balls) ball.dead = true;
			balls.length = 0;

			hud.finiTutorial();
			hud.finiTimer();

			for (let m = 0; m < meepsActive.length; m++) meepsActive[m].visible = false;
			meepsActive = [];

			stage.timeout(function () {
				hud.initPlayers(meeps);
				audio.play('music');
			}, 1000);

			stage.timeout(initNextMatchup, 3000);
		}

		function finiMatchup() {

			hud.finiTimer();

			clearTimeout(iTimeout);
			for (const ball of balls) ball.dead = true;
			balls.length = 0;
			hud.initBanner('Finish!');

			for (const m of meeps) m.visible = false;

			stage.timeout(hud.finiBanner, 2000);
			stage.timeout(MATCHUPS[countPlayer][iMatchup + 1] ? initNextMatchup : finiGame, 4000);
		}

		function finiGame() {

			const scores = meeps.map((m) => m.score);

			const rewards = window.scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);

			// The original passed the raw scores here; Box Party adds what it
			// gets straight onto players' coins, so it gets the rewards.
			stage.timeout(function () {
				IGB.complete(rewards);
			}, 5000);
		}

		let meepsActive = [];
		let iMatchup = -1;
		const rangeLeft = { min: 0, max: W / 2 - HEADR * 2 };
		const rangeRight = { min: W / 2 + HEADR * 2, max: W };
		function initNextMatchup() {

			iMatchup++;
			const matchup = MATCHUPS[countPlayer][iMatchup];
			const iLeft = parseInt(matchup[0]);
			const iRight = parseInt(matchup[1]);

			meepsActive[0] = meeps[iLeft];
			meepsActive[1] = meeps[iRight];

			if (typeGame == 'volley') {
				meepsActive[0].range = rangeLeft;
				meepsActive[1].range = rangeRight;
			}

			for (const m of meeps) m.visible = false;
			for (const m of meepsActive) m.visible = true;

			initIntro();
		}

		function initIntro() {

			hud.revealTimer(ROUND_TIMES[meeps.length]);
			hud.summonPlayers(MATCHUPS[countPlayer][iMatchup]);

			stage.timeout(hud.finiBanner, 3000);

			stage.timeout(function () {
				hud.flashMessage(1.25, 0.4, meeps[MATCHUPS[countPlayer][iMatchup][0]].name, 80, 3500);
				hud.flashMessage(1.25, 0.5, typeGame == 'volley' ? 'This side' : 'Shoot that way', 50, 3500);
				if (typeGame == 'football') hud.flashMessage(1.25, 0.3, '⇢', 200, 3000);

				hud.flashMessage(1.75, 0.4, meeps[MATCHUPS[countPlayer][iMatchup][1]].name, 80, 3500);
				hud.flashMessage(1.75, 0.5, typeGame == 'volley' ? 'This side' : 'Shoot that way', 50, 3500);
				if (typeGame == 'football') hud.flashMessage(1.75, 0.3, '⇠', 200, 3500, MATCHUPS[countPlayer][iMatchup][0]);
			}, 3500);

			stage.timeout(function () {
				hud.initTimer(ROUND_TIMES[meeps.length], finiMatchup);
			}, 7000);

			stage.timeout(initBall, 8000);
			if ((meeps.length == 2 && iMatchup > 0) || (meeps.length == 3 && iMatchup > 2)) stage.timeout(initBall, 9000);
		}

		if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
		else hud.initPlayerCount(initGame);

		/* ---------- drawing ---------- */

		// The stadium, full width across the three walls, bottom aligned.
		function drawStadium(ctx) {
			const img = art.ready(BG);
			if (!img) return;
			const h = IGB.WIDTH * img.naturalHeight / img.naturalWidth;
			art.image(ctx, img, 0, H - h, IGB.WIDTH, h);
		}

		// A goal 0.8 walls wide, its picture standing on a line 20 below
		// the field's bottom edge; the left one is mirrored to face in.
		function drawGoal(ctx, left, isMirrored) {
			const img = art.ready(GOAL);
			if (!img) return;
			const w = W * 0.8;
			const h = w * img.naturalHeight / img.naturalWidth;
			const bottom = FLOOR + 20;
			ctx.save();
			if (isMirrored) {
				ctx.translate(left + w / 2, 0);
				ctx.scale(-1, 1);
				ctx.translate(-(left + w / 2), 0);
			}
			art.image(ctx, img, left, bottom - h, w, h);
			ctx.restore();
		}

		// The net in the middle of the front wall, with its shadow.
		function drawNet(ctx) {
			const x = W + W / 2;
			art.ellipse(ctx, x - 30 + 50, FLOOR + 15 - 25, 50, 25, { fill: 'black', alpha: 0.5 });
			const top = FLOOR - (NET + 30);
			ctx.save();
			ctx.beginPath();
			art.roundRectPath(ctx, x - 50, top, 100, NET + 30, 5);
			ctx.clip();
			art.tile(ctx, NET_IMG, x - 50, top, 100, NET + 30);
			ctx.restore();
		}

		function drawBall(ctx, ball) {
			if (ball.left === undefined) return;
			art.ellipse(ctx, ball.left, FLOOR, BALLR, BALLR * 0.25, { fill: 'black', alpha: 0.5 });
			art.tile(ctx, BALL, ball.left - BALLR, FLOOR + ball.top - BALLR, BALLR * 2, BALLR * 2, BALLR * 2);
		}

		// "+1" in a 150-high line whose bottom sits `bottom` above the feet,
		// the glyphs centred in it the way CSS line-height centres them.
		function drawScoreText(ctx, m) {
			const s = m.scoreText;
			if (!s.text || s.opacity <= 0) return;
			const LINE = 150;
			ctx.save();
			ctx.font = '400 100px "Paytone One", sans-serif';
			const fm = ctx.measureText(s.text);
			ctx.restore();
			const a = fm.fontBoundingBoxAscent;
			const d = fm.fontBoundingBoxDescent;
			const baseline = m.y - s.bottom - LINE + (LINE - (a + d)) / 2 + a;
			art.text(ctx, s.text, m.x, baseline, {
				size: 100, font: 'Paytone One', weight: 400, fill: 'white', alpha: s.opacity, baseline: 'alphabetic',
			});
		}

		function drawMeep(ctx, m, layer) {
			ctx.save();
			ctx.translate(m.x, m.y);
			m.drawLocal(ctx, layer);
			ctx.restore();
		}

		self.draw = function (ctx) {
			drawStadium(ctx);
			if (showGlass) art.glass(ctx);

			if (typeGame == 'football') {
				drawGoal(ctx, W * 0.26, true);
				drawGoal(ctx, IGB.WIDTH - W * 0.26 - W * 0.8, false);
			} else {
				drawNet(ctx);
			}

			for (const m of meeps) {
				if (!m.visible) continue;
				drawMeep(ctx, m, 'body');
				drawScoreText(ctx, m);
			}

			for (const ball of balls) drawBall(ctx, ball);

			// The CSS hands had z-index: 1, so they sat over the ball too.
			for (const m of meeps) if (m.visible) drawMeep(ctx, m, 'hands');
		};

		const FPS = 50;
		const interval = stage.interval(step, 1000 / FPS);

		self.setPlayers = function (p) {
			meeps.forEach(function (m, i) {
				m.px = p[i].px * W;
				m.py = Math.min(0.75, (p[i].py + 0.3)) * H;
				m.r = { W: p[i].rW, X: p[i].rX, Y: p[i].rY, Z: p[i].rZ };
			});
		};

		self.fini = function () {
			audio.stop('music');
			hud.finiTutorial();
			hud.finiTimer();
			clearInterval(interval);
		};
	}

	IGB.register('volley-heads', function VolleyHeadsGame(stage, playersMeta) {
		HeadersGame.call(this, stage, playersMeta, 'volley');
	});

	IGB.register('soccer-heads', function SoccerHeadsGame(stage, playersMeta) {
		HeadersGame.call(this, stage, playersMeta, 'football');
	});
})();
