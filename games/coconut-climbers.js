/*
 * Coconut Climbers
 *
 * Players take turns climbing palm trees on the front wall, three trees at
 * a time. Squatting up and down pulls the climber up the trunk; swaying
 * left and right dodges the coconuts that fall from the top. A coconut hit
 * makes the climber slip. Fastest climb wins.
 *
 * Input: px (sway left / right), py (squat height).
 */
IGB.register('coconut-climbers', function CoconutClimbersGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const THICC = 70;          // trunk width
	const COCONUT = 100;

	const BG = 'assets/coconut-climbers/bg-beach.avif';

	const audio = stage.audio();
	audio.add('music', 'assets/coconut-climbers/music-calypso.mp3', 0.2, true);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('coconut', 'assets/coconut-climbers/sfx-coconut.mp3', 0.3);

	/* ---------- art ---------- */

	// A coconut centred on (x, y): a round nut with one pointed corner,
	// turned so the point faces up, plus any extra spin in degrees.
	function drawCoconut(ctx, x, y, spin = 0) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate((spin - 45) * Math.PI / 180);
		const r = [COCONUT / 2, 0, COCONUT / 2, COCONUT / 2];
		const path = (c) => art.roundRectPath(c, -COCONUT / 2, -COCONUT / 2, COCONUT, COCONUT, r);
		art.roundRect(ctx, -COCONUT / 2, -COCONUT / 2, COCONUT, COCONUT, r, {
			fill: '#D59563',
			shadow: { color: 'rgba(0,0,0,0.5)', blur: 20, y: 10 },
		});
		art.inset(ctx, path, { color: '#a86939', blur: 30 });
		ctx.restore();
	}

	// A palm frond fanning out from the treetop at `angle` degrees.
	function drawFrond(ctx, angle) {
		ctx.save();
		ctx.rotate(angle * Math.PI / 180);
		const fill = art.linear(ctx, -50, 0, 300, 0, ['green', 'green', '#69C159']);
		art.roundRect(ctx, -50, -50, 350, 100, [50, { x: 350, y: 100 }, 0, 50], { fill });
		ctx.restore();
	}

	// A trunk `height` tall whose top is at y = top, banded every 300px.
	function drawTrunk(ctx, top, height) {
		art.rect(ctx, -THICC / 2, top, THICC, height, { fill: '#a86939', shadow: { color: 'black', blur: 20, x: 2 } });
		for (let y = top; y < top + height; y += 300) {
			const band = Math.min(300, top + height - y);
			art.rect(ctx, -THICC / 2, y, THICC, band, { fill: art.linear(ctx, 0, y, 0, y + 300, ['#a86939', '#D59563']) });
		}
	}

	/* ---------- a climber and their tree ---------- */

	const CoconutPlayer = function (n, ax, distance, volumeCoconut, speedCoconut) {

		const MIN = 0.4;
		const MULT = 12; // essentially saying I only need 1/6th of the room width
		const HMEEP = 350;
		const PHMEEP = HMEEP / H;

		const self = this;

		self.countSlipping = 0;
		self.ax = ax;
		self.px = ax;
		self.ay = 0;
		self.py = undefined;
		self.pyWas = undefined;
		self.ticksComplete = undefined;
		self.tally = 0;
		self.score = 0;
		self.isActive = self.isComplete = false;
		self.distance = distance;

		// Placement on the wall: the base of the tree sits at (x, H - bottom).
		self.x = W + ax * W;
		self.bottom = 0;
		self.scale = 1;
		self.visible = true;

		let ticksElapsed = 0;
		let queueSide = [];

		const meep = new Meep(n);
		meep.shadow.visible = false;
		meep.handLeft.visible = false;
		meep.handRight.visible = false;
		meep.y = -150;

		// The hands grip the trunk; the lead hand reaches, the other follows.
		let dir = 1;
		const hands = { lead: 0, follow: 0 };

		const tree = {
			height: H * distance + H / 2,
			bottom: 0,
			coconuts: [{ x: 130, y: 60 }, { x: 60, y: 80 }, { x: -100, y: 100 }],
		};

		const coconuts = [];
		for (let i = 0; i < volumeCoconut; i++) {
			if (!queueSide.length) {
				queueSide = [-1, 1];
				shuffleArray(queueSide);
			}
			const iSide = queueSide.pop();
			coconuts[i] = {
				iSide: iSide,
				ay: 1.5 + (distance - 0.5) / volumeCoconut * i,
				countFalling: 0,
				left: iSide * 120,
				bottom: 0,
				spin: 0,
			};
		}

		self.step = function (isGameLive) {

			if (!isGameLive || !self.isActive) self.py = self.pyWas = 0.7;

			ticksElapsed++;

			for (const c of coconuts) {
				if (!c.hasHit) {
					if ((self.ay + 1.5) > c.ay) c.countFalling++;
					c.py = c.ay - self.ay - (c.countFalling / FPS) * speedCoconut;
					c.bottom = c.py * H;
				}
			}

			let ox = (self.px - self.ax) * MULT;
			ox = Math.max(-1, Math.min(1, ox));

			dir = ox > 0 ? 1 : -1;
			if (Math.abs(ox) < MIN) ox = MIN * dir;

			meep.x = ox * 10;
			meep.rotate = ox * 15;

			hands.lead = (1 - self.py) * H;
			hands.follow = (1 - self.py) * H - 100;

			let oy = 0;
			if (self.countSlipping <= 0 && self.pyWas !== undefined) {
				self.dy = self.py - self.pyWas;
				if (self.dy > 0) self.ay += self.dy;

				if (self.ay > distance) {
					self.ticksComplete = ticksElapsed;
					self.ay = distance;
					self.isActive = false;
					self.isComplete = true;
					audio.play('correct', true);
				}

				oy = (self.py * 2) - 1;
			} else if (self.countSlipping > 0) {
				self.countSlipping--;
				self.ay -= 0.005;
				if (self.ay < 0) self.ay = 0;
			}

			const my = 0.1 + oy * 0.1;
			meep.y = -my * H;

			tree.bottom = -self.ay * H;

			for (const c of coconuts) {
				if (!c.hasHit && self.ticksComplete === undefined) {
					const dy = c.py - (my + PHMEEP);
					if (dy < 0 && dy > -0.2 && c.iSide === dir) {

						audio.play('coconut', true);

						c.hasHit = true;
						self.countSlipping = FPS / 2;

						c.spin = c.iSide * 60;
						$(c).animate({
							left: c.iSide * 200,
							bottom: c.py * H + 100,
						}, {
							duration: 200,
							easing: 'linear',
						}).animate({
							left: c.iSide * 300,
							bottom: -100,
						}, {
							duration: 500,
						});
					}
				}
			}

			self.pyWas = self.py;
		};

		// Draw relative to the base of the tree; y runs up as negative.
		self.draw = function (ctx) {
			if (!self.visible) return;
			ctx.save();
			ctx.translate(self.x, H - self.bottom);
			ctx.scale(self.scale, self.scale);

			meep.draw(ctx);

			// the trunk (its base sinks as the climber rises) and the
			// coconuts still up in the tree
			const top = -tree.bottom - tree.height;
			drawTrunk(ctx, top, tree.height);
			for (const c of tree.coconuts) drawCoconut(ctx, c.x, top + c.y);

			for (const c of coconuts) drawCoconut(ctx, c.left, -c.bottom, c.spin);

			// hands grip the trunk, above everything but the fronds
			Meep.drawHand(ctx, -THICC / 2, -((dir > 0 ? hands.lead : hands.follow) + 40));
			Meep.drawHand(ctx, THICC / 2, -((dir > 0 ? hands.follow : hands.lead) + 40));

			ctx.translate(0, top);
			for (let i = 0; i < 5; i++) drawFrond(ctx, -180 + i * 40);

			ctx.restore();
		};
	};

	/* ---------- rounds ---------- */

	// distance = 1 means 1 x screen height
	// speedCoconut is how many seconds per screen height
	// volumeCoconut is how many coconuts per player
	const ROUNDS = [
		{ distance: 1.5, speedCoconut: 0.5, volumeCoconut: 2 },
		{ distance: 2.5, speedCoconut: 0.5, volumeCoconut: 4 },
		{ distance: 3.5, speedCoconut: 0.5, volumeCoconut: 10 },
	];

	const STRUCTURE = [
		undefined,
		undefined,
		[ROUNDS[0], ROUNDS[1], ROUNDS[2]],
		[ROUNDS[0], ROUNDS[1], ROUNDS[2]],
		[ROUNDS[0], ROUNDS[2]],
		[ROUNDS[0], ROUNDS[2]],
		[ROUNDS[0], ROUNDS[2]],
	];

	const TIME_PER_PLAYER = [undefined, undefined, 60, 60, 45, 45, 45];

	const self = this;

	let meeps = [];
	let countMeeps = undefined;
	let showGlass = true;

	function initGame(count) {
		countMeeps = count;
		initTutorial();
	}

	function initTutorial() {

		isGameLive = true;

		for (let i = 0; i < countMeeps; i++) {
			const ax = (i + 1) * 1 / (countMeeps + 1);
			meeps[i] = new CoconutPlayer(i, ax, 1.5, 2, 0.5);
			meeps[i].isActive = true;
			meeps[i].scale = 0.5;
		}

		hud.initTutorial('Coconut Climbers',
			{ x: 1 + meeps[0].ax, y: 0.45, msg: 'Align yourself<br>with your avatar', icon: 'align' },
			{ x: 1.5, y: 0.6, msg: 'Squat up and down<br>to climb', icon: 'up-down' },
			{ x: 1.8, y: 0.45, msg: 'Move left and right<br>to dodge coconuts', icon: 'side-to-side' },
		);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {
		showGlass = false;

		isGameLive = false;
		hud.finiTimer();
		hud.finiTutorial();

		for (const m of meeps) {
			m.visible = false;
			m.score = 0;
		}

		stage.timeout(initNextRound);
	}

	const SLOTS = 3;
	let iRound = -1;
	let isGameLive = false;
	let timeStartRound = 0;

	function initNextRound() {

		isGameLive = false;

		iRound++;
		if (!STRUCTURE[meeps.length][iRound]) {
			finiGame();
			return;
		}

		const round = STRUCTURE[meeps.length][iRound];
		for (let i = 0; i < countMeeps; i++) {
			const tally = meeps[i] ? meeps[i].score : 0;
			meeps[i] = new CoconutPlayer(i, 0, round.distance, round.volumeCoconut, round.speedCoconut);
			meeps[i].tally = meeps[i].score = tally;
			meeps[i].visible = false;
			meeps[i].scale = 0.8;
		}

		hud.updatePlayers(meeps, 1);

		iPlayer = -1;
		initNextPlayer();
		initNextPlayer();
		initNextPlayer();

		stage.timeout(function () {
			hud.initRound(iRound, STRUCTURE[meeps.length].length);
			if (iRound === 0) {
				hud.updatePlayers(meeps, 1);
				hud.initPlayers(meeps, 1);
			}
		}, 2000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 4000);

		stage.timeout(function () {
			const summon = [0, 1, 2];
			if (meeps.length < summon.length) summon.length = meeps.length;
			hud.summonPlayers(summon);
		}, 6000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 8000);

		stage.timeout(function () {
			isGameLive = true;
			timeStartRound = new Date().getTime();
			for (const m of meeps) if (m.isActive) m.timeStart = timeStartRound;
			audio.play('music', false, (iRound === STRUCTURE[meeps.length].length - 1) ? 1.5 : 1);
		}, 10000);
	}

	let iPlayer = -1;
	const slots = [];
	function initNextPlayer() {
		iPlayer++;

		if (meeps[iPlayer]) {
			const m = meeps[iPlayer];

			let nSlot = 0;
			while (slots[nSlot]) nSlot++;

			slots[nSlot] = m;
			const ax = (nSlot + 1) * 1 / (SLOTS + 1);

			m.ax = ax;
			m.isActive = false;
			m.x = W + ax * W;
			m.visible = true;
			m.bottom = -(m.distance + 0.5) * H;
			$(m).animate({
				bottom: 0,
			}, {
				duration: 1000 + Math.random() * 500,
				complete: function () {
					m.isActive = true;
					m.timeStart = new Date().getTime();
				},
			});
		} else {
			let isRoundComplete = true;
			for (const m of meeps) if (!m.isRemoved) isRoundComplete = false;
			if (isRoundComplete) initNextRound();
		}
	}

	const hud = new HUD('#FDC972');
	hud.$el.appendTo(stage.$ui);

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function step() {

		const timeNow = new Date().getTime();
		const limit = TIME_PER_PLAYER[meeps.length];

		meeps.forEach(function (m) {
			m.step(isGameLive);
			if (isGameLive && m.isActive) {

				let timeElapsed = (timeNow - m.timeStart) / 1000;
				const timeElapsedWas = m.timeElapsed;

				if (timeElapsed >= (limit - 10) && timeElapsedWas < (limit - 10)) {
					hud.flashMessage(1 + m.ax, 0.3, '10 seconds left', 50);
				}

				for (let i = 1; i <= 5; i++) {
					if (timeElapsed >= (limit - i) && timeElapsedWas < (limit - i)) {
						hud.flashMessage(1 + m.ax, 0.3, i, 150);
					}
				}

				if (timeElapsed >= limit && timeElapsedWas < limit) {
					hud.flashMessage(1 + m.ax, 0.3, 'Time Up!', 50);
					m.isActive = false;
					m.isComplete = true;
				}

				timeElapsed = Math.min(limit, timeElapsed);
				m.timeElapsed = timeElapsed;
				m.score = m.tally + timeElapsed;
			}

			if (m.isComplete) {
				for (const s in slots) {
					if (slots[s] === m) {
						slots[s] = undefined;
						$(m).delay(500).animate({ bottom: -m.distance * H }, {
							complete: function () {
								m.isRemoved = true;
								m.visible = false;
								initNextPlayer();
							},
						});
					}
				}
			}
		});

		hud.updatePlayers(meeps, 1);
	}

	function finiGame() {
		const scores = meeps.map((m) => -m.score);
		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			clearInterval(interval);
			audio.stop('music');
			IGB.complete(rewards);
		}, 5000);
	}

	self.draw = function (ctx) {
		// The beach on every wall, the sea's glow rising from the bottom.
		art.eachWall(ctx, (c) => art.image(c, BG, 0, 0, W, H));
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#28A9E1', 'rgba(40,169,225,0)']) });
		if (showGlass) art.glass(ctx);
		for (const m of meeps) m.draw(ctx);
	};

	self.setPlayers = function (p) {
		meeps.forEach(function (m, i) {
			m.px = p[i].px;
			m.py = Math.min(0.75, p[i].py + 0.3);
			m.r = { W: p[i].rW, X: p[i].rX, Y: p[i].rY, Z: p[i].rZ };
		});
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
