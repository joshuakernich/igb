/*
 * Popcorn Panhandlers
 *
 * Kernels rain down at a flashing spot on one wall; players catch them in
 * frying pans and hold the pan over that wall's campfire until they pop.
 * Popped kernels fly out of the pan, and catching a popped one scores a
 * point. Touching a wall sends the nearest active player to it.
 *
 * Input: px (along the front wall), pz (along the side walls),
 * walls[].dist (who a wall touch moves), wall (from the tracker).
 */
IGB.register('popcorn-panhandlers', function PopcornPanhandlersGame(stage, playersMeta) {

	const art = IGB.art;

	const W = 1600;
	const H = 1000;
	const FPS = 50;

	const FIRE = 300;
	const PANPX = 0.1;
	const PAN = W * PANPX;
	const KERNEL = 20;
	const POPPED = 40;
	const FLOOR = 120;

	const GRAVITY = 0.01 / FPS;
	const FPPOP = FPS * 2;

	const TIME = 120;

	const PATTERN = [
		{ time: 3, wall: 0, ax: 0.8 },
		{ time: 6, wall: 0, ax: 0.8 },
		{ time: 3, wall: 0, ax: 0.8 },
	];

	const ROUNDS = [
		undefined,
		undefined,
		[{ time: 60, cohorts: [[0, 1]], timeSpawn: 3 }, { time: 60, cohorts: [[0, 1]], timeSpawn: 2 }],
		[{ time: 45, cohorts: [[0, 1], [1, 2], [0, 2]], timeSpawn: 3 }, { time: 45, cohorts: [[0, 1], [1, 2], [0, 2]], timeSpawn: 2 }],
		[{ time: 45, cohorts: [[0, 1], [2, 3]], timeSpawn: 3 }, { time: 45, cohorts: [[0, 1], [2, 3]], timeSpawn: 2 }],
		[{ time: 45, cohorts: [[0, 1], [2, 3], [4, 0], [1, 2], [3, 4]], timeSpawn: 2.5 }],
		[{ time: 45, cohorts: [[0, 1], [2, 3], [4, 5]], timeSpawn: 3 }, { time: 45, cohorts: [[0, 1], [2, 3], [4, 5]], timeSpawn: 2 }],
	];

	const BG = 'assets/popcorn-panhandlers/bg-camping.png';
	const SPRITE_FIRE = 'assets/popcorn-panhandlers/sprite-fire.png';
	const FIRE_FRAMES = 12;

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.3, true);
	audio.add('notify-a', 'assets/popcorn-panhandlers/sfx-notify-a.mp3', 0.15);
	audio.add('notify-b', 'assets/popcorn-panhandlers/sfx-notify-b.mp3', 0.1);
	audio.add('notify-c', 'assets/popcorn-panhandlers/sfx-notify-c.mp3', 0.1);
	audio.add('vocal', 'assets/popcorn-panhandlers/sfx-vocal.mp3', 0.05);
	audio.add('pop', 'assets/popcorn-panhandlers/sfx-popcorn.mp3', 0.5);
	audio.add('kernel', 'assets/popcorn-panhandlers/sfx-kernel.mp3', 0.3);
	audio.add('score', 'assets/shared/sfx-pickup.mp3', 0.1);

	/* ---------- a kernel ---------- */

	const PopcornKernel = function () {
		const self = this;
		self.px = 0.5;
		self.py = 0;
		self.sy = 0;
		self.sx = -0.0005 * Math.random() * 0.001;
		self.wall = 0;
		self.r = 0;
		self.delay = 0;
		self.offsetY = -10 + Math.random() * 20;
		self.inPan = false;
		self.isDead = false;
		self.isPopped = false;
		self.heat = 0;
		self.bounce = 0;
		self.visible = true;

		// Where redraw last put it: (left, top) in world px, a rotation in
		// radians, and the unpopped kernel's hot colour. Not drawn until
		// the first redraw has placed it.
		self.left = undefined;
		self.top = undefined;
		self.rotate = 0;
		self.hot = undefined;

		self.step = function () {

			if (self.inPan) {
				//handled by the meep
			} else {
				self.delay--;

				if (self.delay <= 0) {

					self.sy += self.isPopped ? GRAVITY : GRAVITY / 2;
					self.px += self.sx;
					self.py += self.sy;

					self.r += self.sx;

					if (self.py > 1) {
						self.py = 1;
						self.sy = -Math.abs(self.sy) * 0.2;
						self.sx = self.sx * 0.5;

						self.bounce++;
						if (self.bounce > 5) self.isDead = true;
					}
				}
			}
		};

		self.pop = function () {
			self.isPopped = true;
			self.inPan = false;
			self.sy = -0.01 + Math.random() * 0.005;
			self.sx = -0.001 + Math.random() * 0.002;

			audio.play('pop', true);
		};

		self.redraw = function () {
			const left = self.wall * W + self.px * W;
			const bottom = self.offsetY + FLOOR + H - self.py * H;
			// jQuery's .css() ignored NaN and left the kernel where it was.
			if (isFinite(left)) self.left = left;
			if (isFinite(bottom)) self.top = H - bottom;
			if (isFinite(self.r)) self.rotate = self.r * 100;

			if (!self.isPopped) {
				const hot = self.heat / FPPOP;
				self.hot = `rgb(${255},${255 * (1 - hot)},${0})`;
			}
		};

		self.draw = function (ctx) {
			if (!self.visible || self.left === undefined || self.top === undefined) return;
			ctx.save();
			ctx.translate(self.left, self.top);
			ctx.rotate(self.rotate);
			if (self.isPopped) {
				const r = POPPED / 2;
				art.roundRect(ctx, -r, -r, POPPED, POPPED, [r, r, r, 0], {
					fill: art.radial(ctx, 0, 0, 0, r * Math.SQRT2, ['white', 'white', 'gray']),
				});
			} else {
				const r = KERNEL / 2;
				art.roundRect(ctx, -r, -r, KERNEL, KERNEL, [KERNEL, 0, r, r], {
					fill: art.linear(ctx, 0, -r, 0, r, ['white', self.hot || 'orange']),
				});
			}
			ctx.restore();
		};
	};

	/* ---------- a campfire ---------- */

	const PopcornFire = function () {
		const self = this;
		self.px = 0.5;
		self.wall = 0;
		self.left = W * 3 / 2;   // CSS left: 50% until the first step
		self.frame = 0;

		let nStep = 0;
		self.step = function () {

			nStep++;

			const px = self.px;
			self.left = self.wall * W + px * W;

			const nFireStep = Math.floor(nStep / 5);

			const nx = nFireStep;

			self.frame = nx % FIRE_FRAMES;
		};

		// popcornfire sat at bottom: FLOOR - 20, its point at y = H - 100.
		self.draw = function (ctx) {
			const y = H - (FLOOR - 20);
			art.ellipse(ctx, self.left, y, FIRE / 4, FIRE / 16, { fill: 'black', alpha: 0.5 });

			const img = art.ready(SPRITE_FIRE);
			if (img) {
				const fw = img.naturalWidth / FIRE_FRAMES;
				ctx.drawImage(img, self.frame * fw, 0, fw, img.naturalHeight,
					self.left - FIRE / 2, y + FIRE / 12 - FIRE, FIRE, FIRE);
			}
		};
	};

	/* ---------- a player, their pan and their kernels ---------- */

	const PopcornMeep = function (n) {
		const self = this;

		self.px = 0;
		self.py = 0.9;
		self.wall = 0;
		self.kernels = [];
		self.score = 0;

		self.visible = true;
		self.opacity = 1;
		self.left = W * 3 / 2;   // CSS left: 50% until the first step

		const meep = new Meep(n);
		meep.handLeft.y = 190;
		meep.handRight.y = 190;

		const pan = { bottom: 100 };
		const score = { opacity: 0, bottom: 380 };

		self.step = function () {

			if (self.wall == 0) self.px = self.pz;
			if (self.wall == 2) self.px = 1 - self.pz;

			const px = self.px;
			const left = self.wall * W + px * W;
			if (isFinite(left)) self.left = left;

			pan.bottom = H - self.py * H;

			for (const k in self.kernels) {
				self.kernels[k].wall = self.wall;
				self.kernels[k].px = self.px + self.kernels[k].panx;
				self.kernels[k].py = self.py;
			}
		};

		self.add = function (kernel) {

			kernel.inPan = true;
			self.kernels.push(kernel);
			kernel.panx = -PANPX * 0.4 + Math.random() * PANPX * 0.8;

			if (kernel.isPopped) {
				self.score++;
				$(score).stop(true, false).animate({ opacity: 1, bottom: 450 }, 100).animate({ opacity: 0, bottom: 380 }, 300);
				audio.play('score', true);
			} else {
				audio.play('kernel', true);
			}
		};

		self.stepHeat = function () {
			for (let k = 0; k < self.kernels.length; k++) {

				self.kernels[k].heat++;
				if (self.kernels[k].heat > FPPOP && !self.kernels[k].isPopped) {
					self.kernels[k].pop();
					self.kernels.splice(k, 1);
					k--;
				}
			}
		};

		self.hide = function (instant = false) {

			if (instant) {
				self.visible = false;
				self.isActive = false;
				for (const k in self.kernels) self.kernels[k].visible = false;
			} else {
				$(self)
					.stop(true, false)
					.animate({ opacity: 0.7 }, 100)
					.animate({ opacity: 1 }, 100)
					.animate({ opacity: 0.7 }, 100)
					.animate({ opacity: 1 }, 100)
					.animate({ opacity: 0.7 }, 100)
					.animate({ opacity: 1 }, 100)
					.animate({ opacity: 0 }, {
						duration: 500,
						complete: function () {
							self.visible = false;
							self.isActive = false;
							for (const k in self.kernels) self.kernels[k].visible = false;
						},
					});
			}
		};

		self.show = function (instant = false) {
			//self.isActive = true;
			self.visible = true;
			for (const k in self.kernels) self.kernels[k].visible = true;

			if (instant) {
				self.isActive = true;
			} else {
				self.opacity = 0;
				$(self)
					.stop(true, false)
					.animate({ opacity: 0.5 }, 100)
					.animate({ opacity: 0.2 }, 100)
					.animate({ opacity: 0.5 }, 100)
					.animate({ opacity: 0.2 }, 100)
					.animate({ opacity: 0.5 }, 100)
					.animate({ opacity: 0.2 }, 100)
					.animate({ opacity: 1 }, {
						duration: 500,
						complete: function () {
							self.isActive = true;
						},
					});
			}
		};

		/* drawing: popcornmeep was a point at (left, H - FLOOR) */

		// Under the fires: the avatar and the "+1".
		function drawBody(ctx) {
			meep.x = self.left + 120;
			meep.y = H - FLOOR;
			meep.draw(ctx, 'body');

			if (score.opacity > 0) {
				// A 400-wide line of 100px text whose box bottom is `bottom`
				// above the point; its baseline sits 25px above that.
				art.text(ctx, '+1', self.left - 200 + 125 + 200, H - FLOOR - score.bottom - 25, {
					size: 100, weight: 600, fill: 'white', alpha: score.opacity, baseline: 'alphabetic',
				});
			}
		}

		// Over the fires (z-index: 1): the hands, then the pan.
		function drawTop(ctx) {
			meep.draw(ctx, 'hands');

			const x = self.left;
			const y = H - FLOOR - pan.bottom;

			// handle: 20 x 80 standing on the pan's point, tilted 30deg
			ctx.save();
			ctx.translate(x + 10, y);
			ctx.rotate(30 * Math.PI / 180);
			art.roundRect(ctx, -10, -80, 20, 80, 10, { fill: '#999' });
			ctx.restore();

			const side = (c0, c1) => art.linear(ctx, x - PAN / 2, 0, x + PAN / 2, 0, [c0, c1]);
			// body, bottom, then the rim
			art.rect(ctx, x - PAN / 2, y, PAN, 40, { fill: side('white', '#777') });
			art.ellipse(ctx, x, y + 15 + PAN / 6, PAN / 2, PAN / 6, { fill: side('white', '#777') });
			art.ellipse(ctx, x, y, PAN / 2, PAN / 6, { fill: 'white' });
			art.ellipse(ctx, x, y, PAN / 2 - 5, PAN / 6 - 5, {
				fill: art.linear(ctx, x - PAN / 2 + 5, 0, x + PAN / 2 - 5, 0, ['#555', '#777']),
			});
		}

		// Faded, popcornmeep was its own stacking context: all of it paints
		// in the first pass. Otherwise the hands and pan go over the fires.
		self.draw = function (ctx, layer) {
			if (!self.visible || self.opacity <= 0) return;
			const whole = self.opacity < 1;
			if (layer === 'body') {
				ctx.save();
				ctx.globalAlpha *= self.opacity;
				drawBody(ctx);
				if (whole) drawTop(ctx);
				ctx.restore();
			} else if (!whole) {
				drawTop(ctx);
			}
		};
	};

	/* ---------- the walls ---------- */

	// Each wall was a 33.3%-wide inline block, hidden while a player is on it.
	const WALL = W * 3 * 0.333;
	const occupied = [false, false, false];
	const TOUCH = 'Touch wall to move';

	function drawWall(ctx, i) {
		const x0 = i * WALL;

		// :before, inset 50px, an inner white glow, at half opacity
		const glow = [-50, 0, 50][i];
		const path = (c) => c.rect(x0 + 50, 50, WALL - 100, H - 100);
		ctx.save();
		ctx.globalAlpha *= 0.5;
		art.inset(ctx, path, { color: 'white', blur: 100, x: glow });
		ctx.restore();

		// :after, a 300px circle (only its outer glow shows) with the hint
		const cx = [WALL - 300 - 150, WALL / 2, 300 + 150][i] + x0;
		const cy = H / 2;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x0 - 1000, -1000, WALL + 2000, H + 2000);
		ctx.arc(cx, cy, 150, 0, Math.PI * 2);
		ctx.clip('evenodd');
		art.circle(ctx, cx, cy, 150, { fill: 'white', shadow: { color: 'white', blur: 100 } });
		ctx.restore();

		ctx.save();
		ctx.font = '600 40px Rubik, sans-serif';
		const lines = [];
		let line = '';
		for (const word of TOUCH.split(' ')) {
			const next = line ? line + ' ' + word : word;
			if (line && ctx.measureText(next).width > 220) {
				lines.push(line);
				line = word;
			} else {
				line = next;
			}
		}
		lines.push(line);
		ctx.restore();
		lines.forEach((l, n) => {
			art.text(ctx, l, cx, cy - 150 + 110 + n * 47.4 + 37.4, {
				size: 40, weight: 600, fill: 'rgba(255,255,255,0.7)', baseline: 'alphabetic',
			});
		});
	}

	/* ---------- input ---------- */

	stage.$el.on('click', function (e) {

		const wall = Math.floor(IGB.toWorld(e).x / W);
		if (wall < 0 || wall > 2) return;
		let meepSwap;
		let min = 1;

		for (const m in meeps) {
			if (meeps[m].isActive && meeps[m].walls && meeps[m].walls[wall].dist < min) {
				min = meeps[m].walls[wall].dist;
				meepSwap = meeps[m];
			}
		}
		if (meepSwap) meepSwap.wall = wall;
	});

	const self = this;

	const hud = new HUD('#C48264');
	hud.$el.appendTo(stage.$ui);

	let timeQueue = undefined;
	let intervalQueue = undefined;

	const meeps = [];
	const fires = [];
	const kernels = [];
	const warnings = [];

	function initGame(count) {

		timeQueue = TIME / count;

		for (let i = 0; i < count; i++) {
			meeps[i] = new PopcornMeep(i);
			meeps[i].hide(true);
		}

		for (let i = 0; i < 3; i++) {
			fires[i] = new PopcornFire();
			fires[i].wall = i;
		}

		initTutorial();
	}

	let intervalSpawn = undefined;
	let nCohort = -1;
	let nRound = 0;

	function initTutorial() {
		hud.initTutorial('Popcorn Panhandlers',
			{ x: 1.2, y: 0.55, msg: 'Move side to side<br> to catch the kernels', icon: 'side-to-side' },
			{ x: 1.5, y: 0.45, msg: 'Align yourself with a fire<br>to make popcorn', icon: 'align' },
			{ x: 0.75, y: 0.5, msg: 'Touch any wall<br>to switch walls', icon: 'touch' },
		);

		for (const m in meeps) {
			meeps[m].visible = true;
			meeps[m].isActive = true;
		}

		intervalSpawn = stage.interval(spawnKernels, 3000);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {
		for (const m in meeps) {
			meeps[m].visible = false;
			meeps[m].isActive = false;
		}

		for (const k in kernels) {
			kernels[k].visible = false;
		}

		kernels.length = 0;

		clearInterval(intervalSpawn);

		hud.finiTimer();
		hud.finiTutorial();
		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		hud.initPlayers(meeps);
		stage.timeout(initNextCohort, 2000);
	}

	function initNextCohort() {

		nCohort++;
		if (!ROUNDS[meeps.length][nRound].cohorts[nCohort]) {
			nCohort = 0;
			nRound++;
		}

		if (!ROUNDS[meeps.length][nRound]) {
			finiGame();
			return;
		}

		let delay = 0;
		if (nCohort == 0) {
			audio.play('music');
			hud.initRound(nRound, ROUNDS[meeps.length].length);

			stage.timeout(function () {
				hud.finiBanner();
			}, delay += 2000);
		}

		const round = ROUNDS[meeps.length][nRound];
		const cohort = round.cohorts[nCohort];

		for (const c in cohort) {
			const m = cohort[c];
			meeps[m].visible = true;
			meeps[m].wall = 1;
			meeps[m].isActive = true;
		}

		stage.timeout(function () {
			hud.revealTimer(round.time);
			hud.summonPlayers(cohort);
		}, delay += 2000);

		stage.timeout(function () {
			hud.finiBanner();
		}, delay += 2000);

		stage.timeout(function () {
			intervalSpawn = stage.interval(spawnKernels, round.timeSpawn * 1000);
			hud.initTimer(round.time, finiRound);
		}, delay += 2000);
	}

	function finiRound() {

		hud.finiTimer();

		for (const m in meeps) {
			meeps[m].visible = false;
			meeps[m].isActive = false;
		}

		for (const k in kernels) {
			kernels[k].visible = false;
		}

		kernels.length = 0;

		clearInterval(intervalSpawn);

		stage.timeout(initNextCohort, 2000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function spawnKernel(wall, px, delay) {

		const kernel = new PopcornKernel();
		kernel.delay = delay;
		kernel.wall = wall;
		kernel.px = px;

		kernels.push(kernel);
	}

	const audios = ['notify-a', 'notify-b', 'notify-c'];
	let queue = [];
	function spawnKernels() {

		if (!queue.length) {
			queue = [0, 1, 2];
			shuffleArray(queue);
		}

		const wall = queue.pop();
		const ax = 0.2 + Math.random() * 0.6;

		audio.play(audios[wall], true);
		audio.play('vocal', true);

		// A yellow beam down to the floor where the kernels will fall.
		const warning = { left: (wall + ax) * W, opacity: 1 };
		warnings.push(warning);
		$(warning).delay(2000).animate({ opacity: 0 }, 1000);

		for (let i = 0; i < 10; i++) {
			stage.timeout(function () {
				const px = ax - 0.025 + Math.random() * 0.05;
				spawnKernel(wall, px, Math.floor(Math.random() * FPS));
			}, 500 + i * 200);
		}

		stage.timeout(function () {
			$(warning).stop(true);
			const i = warnings.indexOf(warning);
			if (i >= 0) warnings.splice(i, 1);
		}, 3000);
	}

	function drawWarning(ctx, w) {
		const x = w.left;
		const bottom = H - FLOOR;
		ctx.save();
		ctx.globalAlpha *= w.opacity;
		art.rect(ctx, x - 50, 0, 100, bottom, {
			fill: art.linear(ctx, 0, 0, 0, bottom, ['rgba(255,255,0,0.5)', 'rgba(255,255,0,0)']),
		});
		art.ellipse(ctx, x, bottom, 50, 15, { fill: 'rgba(255,255,0,0.2)' });
		ctx.restore();
	}

	function step() {

		for (const f in fires) {
			fires[f].step();
		}

		for (const k in kernels) {
			kernels[k].step();
		}

		for (const w in occupied) occupied[w] = false;

		for (const m in meeps) {
			meeps[m].step();

			if (meeps[m].isActive) {

				occupied[meeps[m].wall] = true;

				for (const k in kernels) {
					if (!kernels[k].inPan && kernels[k].wall == meeps[m].wall && kernels[k].sy > 0) {
						const dx = Math.abs(kernels[k].px - meeps[m].px);
						const dy = Math.abs(kernels[k].py - meeps[m].py);
						if (dy < 0.05 && dx < PANPX / 2) meeps[m].add(kernels[k]);
					}
				}

				for (const f in fires) {
					if (fires[f].wall == meeps[m].wall) {
						const dx = Math.abs(fires[f].px - meeps[m].px);
						if (dx < PANPX / 2) {
							meeps[m].stepHeat();
						}
					}
				}
			}
		}

		for (let k = 0; k < kernels.length; k++) {
			if (kernels[k].isDead) {
				kernels.splice(k, 1);
				k--;
			} else {
				kernels[k].redraw();
			}
		}

		hud.updatePlayers(meeps);
	}

	self.draw = function (ctx) {
		// The campsite, one tile 33.3% x 150% centred along the bottom and
		// repeated out to both ends.
		const th = H * 1.5;
		for (let x = (W * 3 - WALL) / 2 - WALL * 2; x < W * 3; x += WALL) {
			art.image(ctx, BG, x, H - th, WALL, th);
		}

		for (let i = 0; i < 3; i++) if (!occupied[i]) drawWall(ctx, i);

		for (const m of meeps) m.draw(ctx, 'body');
		for (const f of fires) f.draw(ctx);
		for (const w of warnings) drawWarning(ctx, w);
		for (const m of meeps) m.draw(ctx, 'top');
		for (const k of kernels) k.draw(ctx);
	};

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].px = p[m].px;
			meeps[m].pz = p[m].pz;
			meeps[m].walls = p[m].walls;

			//meeps[m].py = p[m].py;
			if (p[m].wall != undefined) {
				meeps[m].wall = p[m].wall;
				p[m].wall = undefined;
			}
			meeps[m].r = { W: p[m].rW, X: p[m].rX, Y: p[m].rY, Z: p[m].rZ };
		}
	};

	const interval = stage.interval(step, 1000 / FPS);

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

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
