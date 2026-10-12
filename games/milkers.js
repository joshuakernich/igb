/*
 * Milkers
 *
 * Giant cows amble from wall to wall, two or three players at a time step
 * forward, line their avatar up under a teat and squat up and down to milk
 * it: every squirt is a point. Touching a wall sends the player standing
 * nearest it over to that wall.
 *
 * Input: px (along the front wall), pz (along the side walls), py (squat),
 * walls[].dist (who a wall touch moves).
 */
IGB.register('milkers', function MilkersGame(stage, playersMeta) {

	const art = IGB.art;

	const ROUNDS = [
		undefined,
		undefined,
		[{ time: 20, cohorts: [[0, 1]], countUdder: 1 }, { time: 30, cohorts: [[0, 1]], countUdder: 2 }],
		[{ time: 20, cohorts: [[0, 1], [1, 2], [0, 2]], countUdder: 1 }, { time: 20, cohorts: [[0, 1], [1, 2], [0, 2]], countUdder: 2 }],
		[{ time: 20, cohorts: [[0, 1], [2, 3]], countUdder: 1 }, { time: 30, cohorts: [[0, 1], [2, 3]], countUdder: 2 }],
		[{ time: 20, cohorts: [[0, 1], [2, 3], [4, 0], [1, 2], [3, 4]], countUdder: 2 }],
		[{ time: 20, cohorts: [[0, 1], [2, 3], [4, 5]], countUdder: 1 }, { time: 20, cohorts: [[0, 1], [2, 3], [4, 5]], countUdder: 2 }],
	];

	const W = 1600;
	const H = 1000;
	const UDDER = 700;
	const TEAT = 500;
	const LEG = H - 40;   // a cow's leg

	const FPS = 50;
	const GRAB = W / 20;  // can grab a teat within 10% of screen width

	const BG = 'assets/shared/bg-farm.png';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-farm.mp3', 0.3, true);

	/* ---------- the milk along the bottom ---------- */

	// A wobbling white line along the foot of the walls (an SVG stretched
	// over the whole world; it would rise with `milk`, which stays 0).
	const MilkSea = function () {
		const self = this;

		self.milk = 0;
		self.points = [];

		const SEG = 100;
		let n = 0;
		self.redraw = function () {
			const fill = self.milk / 2000;
			const wibble = 0.05;
			n += wibble;
			const points = [[0, 100], [0, 100 - fill]];
			for (let i = 0; i <= SEG; i++) points.push([i / SEG * 100, 100 - fill + Math.sin(i + n)]);
			points.push([100, 100]);
			self.points = points;
		};

		self.draw = function (ctx) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, 0, IGB.WIDTH, H);
			ctx.clip();
			ctx.scale(IGB.WIDTH / 100, H / 100);
			// two paths share the shape: the half-black one only shows at the edges
			art.poly(ctx, self.points, { fill: 'rgba(0,0,0,0.5)' });
			art.poly(ctx, self.points, { fill: 'white' });
			ctx.restore();
		};

		self.redraw();
	};

	/* ---------- a cow ---------- */

	// Only the cow's underside shows: belly, udder, two teats and two legs.
	// Its point is the middle of the top of the belly, at (left, el.top).
	const MilkUdder = function () {

		const COUNT = 2;

		const self = this;

		// What the old DOM element showed: left (set by redraw), the bob of
		// the walk (el.top, legs' tops) and, once it first walks, a
		// transform that makes it a stacking context: scaled, blurred and
		// under the players while walking, crisp and over them standing.
		self.left = undefined;
		self.el = { top: 0 };
		self.legLeft = { top: 0 };
		self.legRight = { top: 0 };
		self.view = { scale: 1 };
		self.styled = false;
		self.blur = false;
		self.zIndex = 'auto';

		self.teats = [];
		for (let i = 0; i < COUNT; i++) {
			self.teats[i] = new MilkTeat();
			self.teats[i].x = (-UDDER / 4) + (UDDER / 2) * (i / (COUNT - 1));
		}

		self.x = self.xAnchor = 0;
		self.xOffset = 0;
		self.nWall = -1;
		self.isActive = true;

		let queueWall = [];
		let stepShuffle = -1;
		let isWalkCycle = false;

		self.toNewSpot = function (xTarget = undefined) {

			self.isActive = false;
			self.nWall = -1;

			let x = 0;

			if (xTarget) {
				x = xTarget;
			} else {

				let isOccupied = false;
				let nWall = -1;
				do {
					if (!queueWall.length) {
						queueWall = [0, 1, 2];
						shuffleArray(queueWall);
					}

					isOccupied = false;

					nWall = queueWall.pop();
					for (const u in udders) if (udders[u].nWall == nWall) isOccupied = true;
				} while (isOccupied);

				self.nWall = nWall;
				x = (nWall + 0.35 + Math.random() * 0.3) * W;
			}

			let dist = Math.abs(self.x - x);

			if (dist < 1000) dist = 1000;

			stepShuffle = Math.floor((dist / 1000 + 4 + Math.random() * 4) * FPS);

			$(self).animate({ x: x }, {
				duration: dist,
				complete: function () {
					isWalkCycle = false;
					self.isActive = true;
				},
			});

			isWalkCycle = true;
			doWalkCycle();
		};

		// transform: scale(s) with transition: transform 0.5s. The first one
		// lands at once, set before the element was ever styled.
		function setScale(s) {
			if (!self.styled) {
				self.styled = true;
				self.view.scale = s;
			} else if (self.scaleTarget !== s) {
				$(self.view).stop(true).animate({ scale: s }, { duration: 500, easing: 'ease' });
			}
			self.scaleTarget = s;
		}

		function toStillness() {

			setScale(1);
			self.blur = false;
			self.zIndex = 1;

			$(self.legLeft).animate({ top: -40 }, 200);
			$(self.legRight).animate({ top: -40 }, 200);
			$(self.el).animate({ top: 40 }, 200);
		}

		function doWalkCycle() {

			if (!isWalkCycle) {
				toStillness();
				return;
			}

			setScale(0.9);
			self.blur = true;
			self.zIndex = 0;

			// The first step animated a 'scale' jQuery could not set on the
			// element: it only held the queue for 100ms.
			$(self.el).animate({
				hold: 0.5,
			}, 100).animate({
				top: 0,
			}, 100).animate({
				top: 20,
			}, 100).animate({
				top: 0,
			}, {
				duration: 100,
				complete: doWalkCycle,
			});

			$(self.legLeft).animate({
				top: -60,
			}, 100).animate({
				top: 0,
			}, 100).animate({
				top: -60,
			}, 100).animate({
				top: 0,
			}, 100);

			$(self.legRight).animate({
				top: 0,
			}, 100).animate({
				top: -40,
			}, 100).animate({
				top: 0,
			}, 100).animate({
				top: -40,
			}, 100);
		}

		self.step = function () {
			stepShuffle--;
			if (stepShuffle == 0) self.toNewSpot();
		};

		self.redraw = function () {
			self.left = self.x;
		};

		self.initExit = function () {
			self.toNewSpot(-W / 2);
		};
	};

	/* ---------- a teat ---------- */

	const MilkTeat = function () {

		const SEG = 20;
		const MAX_TUG = 3;

		const self = this;
		self.ox = 10;
		self.tug = 0;

		self.milking = 0;
		self.countTug = 0;
		self.capacity = self.countTug / MAX_TUG;
		self.throbbing = 0;

		self.flow = 0;

		// What redraw last showed.
		self.points = [];
		self.strokeWidth = 22;
		self.height = TEAT;
		self.stream = { top: 0, left: 0, rotate: 0 };
		self.size = 0;

		let n = Math.floor(Math.random() * SEG);

		const audio = stage.audio();
		audio.add('squirt', 'assets/milkers/milk-squirt.mp3', 0.3, false);
		audio.add('pour', 'assets/milkers/milk-pour.mp3', 0.3, false);

		let tugDelta = 0;
		let tugWas = 0;
		let tugging = 0;

		let isUntugged = true;

		self.step = function () {
			tugDelta = Math.max(0, self.tug - tugWas);

			if (!self.isHeldBy) {
				self.tug *= 0.95;
				self.ox *= 0.95;
				tugDelta = 0;
			} else if (self.tug < tugWas) {
				isUntugged = true;
			}

			if (tugDelta > 0) {
				tugging += tugDelta;
			} else {
				tugging -= 5;
			}

			if (tugging < 0) tugging = 0;
			if (tugging > 15 && isUntugged && tugDelta > 0 && !self.markedForRemoval) {
				isUntugged = false;

				self.isHeldBy.score++;
				const fx = self.isHeldBy.scoreFx;
				$(fx).stop(false, false);
				fx.opacity = 1;
				$(fx).delay(200).animate({ opacity: 0 });

				audio.play('squirt', true);
				audio.play('pour', true);

				$(self).stop(false, false).animate({ flow: 0.5 }, 100).delay(500).animate({ flow: 0 }, 100);
			}

			self.milking = tugging;

			tugWas = self.tug;
		};

		self.redraw = function () {
			const wibble = 0.05;
			n += wibble;

			const points = [[0, 0]];
			let px;
			for (let i = 0; i < SEG; i++) {
				const amt = (i / SEG);
				px = (Math.sin(i / 2 + n) * 2 * amt + self.ox * amt);
				points.push([px, amt * 100]);
			}
			self.points = points;

			const thicc = 1 - self.tug * 0.005;
			self.strokeWidth = 12 + thicc * 10;

			self.height = 500 + self.tug;

			self.stream = {
				top: 420 + self.tug,
				left: px * 8,
				rotate: -px * 1.5,
			};

			self.size = self.flow * 300;

			audio.setVolume('squirt', self.flow * 0.3);
			audio.setVolume('pour', self.flow * 0.3);
		};

		self.fini = function () {
			$(self).stop(false, false);
			self.flow = 0;
			self.redraw();

			audio.stop('squirt');
			audio.stop('pour');
		};

		// At the teat's root, (x, 250) from the cow's point.
		self.draw = function (ctx) {
			ctx.save();
			ctx.translate(self.x, 250);

			// The milk: a white wedge hanging from the stream's top, the
			// stream (0 x 200) turning about its centre.
			if (self.size > 0) {
				const s = self.stream;
				ctx.save();
				ctx.translate(s.left, s.top + 100);
				ctx.rotate(s.rotate * Math.PI / 180);
				art.poly(ctx, [[0, -100], [self.size, H - 100], [-self.size, H - 100]], { fill: 'white' });
				ctx.restore();
			}

			// The teat: a thick SVG stroke in a viewBox of -50 0 100 110,
			// stretched to TEAT x height and clipped to it.
			ctx.scale(TEAT / 100, self.height / 110);
			ctx.beginPath();
			ctx.rect(-50, 0, 100, 110);
			ctx.clip();
			ctx.beginPath();
			self.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
			ctx.lineWidth = self.strokeWidth;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'miter';
			ctx.miterLimit = 4;
			// the gradient spans the lower half of the path's bounding box
			ctx.strokeStyle = art.linear(ctx, 0, 47.5, 0, 95, ['pink', '#ff5555']);
			ctx.stroke();

			ctx.restore();
		};

		self.redraw();
	};

	/* ---------- cow art ---------- */

	// One leg, its box LEG tall with its top `top` below the cow's point,
	// centred on x = cx. The right one is mirrored.
	function drawLeg(ctx, cx, top, mirror) {
		ctx.save();
		ctx.translate(cx, top + LEG / 2);
		if (mirror) ctx.scale(-1, 1);
		ctx.translate(-50, -LEG / 2);

		art.rect(ctx, 0, 0, 100, LEG, { fill: art.linear(ctx, 0, 0, 0, LEG, ['#333', '#666']) });

		// the thigh, tilted about its centre
		ctx.save();
		ctx.translate(50, LEG / 4);
		ctx.rotate(5 * Math.PI / 180);
		const thigh = { x: 140, y: LEG / 2 };
		art.roundRect(ctx, -70, -LEG / 4, 140, LEG / 2, [0, 0, thigh, thigh], {
			fill: art.linear(ctx, 0, -LEG / 4, 0, LEG / 4, ['#333', '#4B4B4B']),
		});
		ctx.restore();

		// the hoof
		art.roundRect(ctx, -10, LEG - 80, 170, 80, [{ x: 170, y: 80 }, { x: 170, y: 80 }, 20, 50], {
			fill: art.linear(ctx, 0, LEG, 0, LEG - 80, ['#111', '#666']),
		});

		ctx.restore();
	}

	// part: 'base' (all but the teats), 'teats', or 'all'.
	function drawCowParts(ctx, u, part) {
		if (part !== 'teats') {
			art.ellipse(ctx, 0, H - 25, UDDER, 25, { fill: 'black', alpha: 0.1 });
			drawLeg(ctx, -UDDER / 2 - 120, u.legLeft.top, false);
			drawLeg(ctx, UDDER / 2 + 120, u.legRight.top, true);
			const belly = { x: 800, y: 200 };
			art.roundRect(ctx, -400, 0, 800, 200, [0, 0, belly, belly], { fill: '#333' });
			art.roundRect(ctx, -250, 100, 500, 250, [{ x: 250, y: 125 }, { x: 250, y: 125 }, { x: 500, y: 250 }, { x: 500, y: 250 }], {
				fill: art.linear(ctx, 0, 350, 0, 100, ['pink', 'pink', '#666']),
			});
		}
		if (part !== 'base') for (const t of u.teats) t.draw(ctx);
	}

	// The CSS blur softened a walking cow as one picture: draw it into a
	// buffer, then blur the buffer onto the stage.
	const BUF = { x: -720, y: -80, w: 1440, h: 1280 };
	let buffer;

	function drawCow(ctx, u, part) {
		if (u.left === undefined || u.left + BUF.x + BUF.w < 0 || u.left + BUF.x > IGB.WIDTH) return;
		ctx.save();
		ctx.translate(u.left, u.el.top);
		if (u.view.scale !== 1) ctx.scale(u.view.scale, u.view.scale);
		if (u.blur) {
			if (!buffer) buffer = stage.surface(BUF.w, BUF.h);
			buffer.clear();
			buffer.ctx.save();
			buffer.ctx.translate(-BUF.x, -BUF.y);
			drawCowParts(buffer.ctx, u, part);
			buffer.ctx.restore();
			ctx.filter = `blur(${art.px(ctx, 5)}px)`;
			ctx.drawImage(buffer.canvas, BUF.x, BUF.y, BUF.w, BUF.h);
		} else {
			drawCowParts(ctx, u, part);
		}
		ctx.restore();
	}

	/* ---------- the game ---------- */

	const self = this;

	let showGlass = true;
	const sea = new MilkSea();

	const meeps = [];

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	let udders = [];
	const cows = [];   // every cow on the stage, in the order they arrived

	let isMilkingLive = false;
	function step() {

		for (const m in meeps) {

			const p = meeps[m];
			if (!p.isActive) continue;

			if (p.wall == 0) p.x = W * p.fz;
			if (p.wall == 1) p.x = W + W * p.fx;
			if (p.wall == 2) p.x = W * 3 - W * p.fz;

			const h = (1 - p.fy) * H;

			// (the old DOM ignored NaN before the tracker reported)
			if (isFinite(h)) p.meep.setHeight(h);
			if (isFinite(p.x)) {
				p.meep.x = p.x;
				p.placed = true;
			}

			let dir = 1;
			let minx = GRAB;
			let teatGrab = undefined;

			for (const u in udders) {

				if (!udders[u]) continue;

				for (const t in udders[u].teats) {
					const teat = udders[u].teats[t];
					const dx = (udders[u].x + teat.x) - p.x;
					if (Math.abs(dx) < minx && isMilkingLive && !teat.isHeldBy && udders[u].isActive) {
						dir = dx > 0 ? 1 : -1;
						minx = Math.abs(dx);
						teatGrab = teat;
					}
				}
			}

			if (teatGrab) {
				// grab on
				if (p.teatGrabAtY == undefined) p.teatGrabAtY = p.fy;
				teatGrab.ox = (GRAB - minx) * dir * 0.1;
				Object.assign(p.meep.handLeft, { x: teatGrab.ox, y: 0.3 * p.meep.h });
				Object.assign(p.meep.handRight, { x: teatGrab.ox + dir * 90, y: 0.25 * p.meep.h });
				teatGrab.tug = (p.fy - p.teatGrabAtY) * H / 2;
				teatGrab.isHeldBy = p;

			} else {
				// let go
				p.teatGrabAtY = undefined;
				Object.assign(p.meep.handLeft, { x: -90, y: 300 });
				Object.assign(p.meep.handRight, { x: 90, y: 300 });
			}

		}

		for (const u in udders) {

			if (!udders[u]) continue;

			udders[u].step();

			for (const t in udders[u].teats) {

				udders[u].teats[t].step(isMilkingLive);

				if (udders[u].teats[t].isHeldBy) {
					udders[u].teats[t].isHeldBy = undefined;
				}

				udders[u].teats[t].redraw(isMilkingLive);
			}

			udders[u].redraw();
		}

		// Cows a round has let go of keep walking off (the old DOM froze them
		// wherever they were when the next cohort began).
		for (const u of cows) {
			if (udders.indexOf(u) >= 0) continue;
			for (const t of u.teats) t.redraw();
			u.redraw();
		}

		hud.updatePlayers(meeps);
		sea.redraw();
	}

	function initGame(PLAYERCOUNT) {

		for (let i = 0; i < PLAYERCOUNT; i++) {
			const meep = new Meep(i);
			meep.shadow.visible = false;
			meep.visible = false;
			meep.y = H - 40;
			meeps[i] = {
				n: i,
				meep: meep,
				fx: 0.5, fy: 0.5, fz: 0.5,
				wall: 1,
				isActive: false,
				score: 0,
				scoreFx: { opacity: 0 },   // the "+1" over the head
			};
		}

		stage.timeout(initTutorial, 1000);
	}

	function initTutorial() {

		hud.initTutorial(
			'Milkers',
			{ x: 1.38, y: 0.5, msg: 'Align your avatar<br>with a teat', icon: 'align' },
			{ x: 1.75, y: 0.5, msg: 'Squat up and down<br>to milk', icon: 'up-down' },
			{ x: 0.75, y: 0.5, msg: 'Touch any wall<br>to switch walls', icon: 'touch' },
		);

		for (let i = 0; i < 3; i++) {
			udders[i] = new MilkUdder();
			udders[i].x = W * (i + 0.5);
			udders[i].left = udders[i].x;
			cows.push(udders[i]);
		}

		for (const p of meeps) {
			p.meep.visible = true;
			p.isActive = true;
		}

		isMilkingLive = true;

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		showGlass = false;

		hud.finiTimer();
		hud.finiTutorial();

		isMilkingLive = false;

		for (const u in udders) {
			if (udders[u]) cows.splice(cows.indexOf(udders[u]), 1);
			udders[u] = undefined;
		}

		for (const p of meeps) {
			p.score = 0;
			p.meep.visible = false;
			p.isActive = false;
		}

		stage.timeout(function () {
			hud.initPlayers(meeps);
		}, 2000);

		stage.timeout(initNextCohort, 3000);
	}

	let iRound = 0;
	let iCohort = -1;

	function initNextCohort() {

		udders.length = 0;

		iCohort++;
		if (!ROUNDS[meeps.length][iRound].cohorts[iCohort]) {
			iCohort = 0;
			iRound++;
		}

		if (!ROUNDS[meeps.length][iRound]) {
			finiGame();
		} else {

			let delay = 1000;

			if (iCohort == 0 && ROUNDS.length == 1) {
				audio.play('music', true, 1);
			} else if (iCohort == 0) {
				hud.initRound(iRound, ROUNDS[meeps.length].length);
				audio.play('music', true, ((iRound == ROUNDS[meeps.length].length - 1) ? 2 : 1));
				stage.timeout(hud.finiBanner, delay += 2000);
			}

			stage.timeout(function () {

				const cohort = ROUNDS[meeps.length][iRound].cohorts[iCohort];

				for (const c in cohort) {
					const p = meeps[cohort[c]];
					p.wall = 1;
					p.meep.visible = true;
					p.isActive = true;
				}

				hud.summonPlayers(cohort);
			}, delay += 2000);

			stage.timeout(function () {
				hud.finiBanner();
			}, delay += 2000);

			stage.timeout(function () {
				isMilkingLive = true;
				hud.initTimer(ROUNDS[meeps.length][iRound].time, finiCohort);
				for (let i = 0; i < ROUNDS[meeps.length][iRound].countUdder; i++) {
					stage.timeout(spawnUdder, 1000 + 3000 * i);
				}
			}, delay += 2000);
		}
	}

	function finiCohort() {

		hud.finiTimer();

		for (const u in udders) {
			if (udders[u]) udders[u].initExit();
		}

		for (const p of meeps) {
			p.meep.visible = false;
			p.isActive = false;
		}

		stage.timeout(initNextCohort, 4000);
	}

	function spawnUdder() {
		const udder = new MilkUdder();
		cows.push(udder);
		udders.push(udder);

		udder.x = -W / 2;
		udder.toNewSpot();
	}

	function finiGame() {

		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;
		const rewards = scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 5000);
	}

	// Touching a wall moves the player nearest it there.
	stage.$el.on('click', function (e) {
		const x = IGB.toWorld(e).x / W;
		const wall = Math.floor(x);

		let min = 1;
		let nMeep = 0;
		for (const m in meeps) {
			if (meeps[m].walls && meeps[m].walls[wall].dist < min) {
				min = meeps[m].walls[wall].dist;
				nMeep = m;
			}
		}

		if (!meeps[nMeep]) return; // no squad yet
		meeps[nMeep].wall = wall;
	});

	/* ---------- drawing ---------- */

	function drawBackground(ctx) {
		// the farm stretched across all three walls, above a 200px strip
		art.tile(ctx, BG, 0, 0, IGB.WIDTH, H - 200, IGB.WIDTH);
		art.rect(ctx, 0, H - 400, IGB.WIDTH, 400, {
			fill: art.linear(ctx, 0, H - 400, 0, H, ['rgba(31,110,137,0)', '#1F6E89', '#0f4d63']),
		});
		art.rect(ctx, 0, 0, IGB.WIDTH, H - 200, {
			fill: art.linear(ctx, 0, H - 200, 0, 0, ['#236F95', 'rgba(35,111,149,0)']),
			alpha: 0.8,
		});
	}

	// Paint order follows the old page: cows and the players' bodies, then
	// everything that had z-index 1 (teats of cows that never walked, cows
	// standing still, the players' hands), then the "+1"s.
	self.draw = function (ctx) {
		drawBackground(ctx);
		if (showGlass) art.glass(ctx);

		for (const u of cows) {
			if (!u.styled) drawCow(ctx, u, 'base');
			else if (u.zIndex === 0) drawCow(ctx, u, 'all');
		}
		sea.draw(ctx);
		for (const p of meeps) if (p.placed) p.meep.draw(ctx, 'body');

		for (const u of cows) {
			if (!u.styled) drawCow(ctx, u, 'teats');
			else if (u.zIndex === 1) drawCow(ctx, u, 'all');
		}
		for (const p of meeps) if (p.placed) p.meep.draw(ctx, 'hands');

		for (const p of meeps) {
			if (!p.placed || !p.meep.visible || p.scoreFx.opacity <= 0) continue;
			art.text(ctx, '+1', p.meep.x, H - 40 - p.meep.h - 100, {
				size: 80, weight: 600, font: 'Rubik', fill: 'white', alpha: p.scoreFx.opacity,
			});
		}
	};

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].fx = p[m].px;
			meeps[m].fz = p[m].pz;
			meeps[m].fy = Math.min(0.75, p[m].py + 0.2);
			if (p[m].wallChange) {
				meeps[m].wallChange = p[m].wallChange;
				p[m].wallChange = undefined;
			}
			meeps[m].walls = p[m].walls;
		}
	};

	let interval;
	self.init = function () {
		interval = stage.interval(step, 1000 / FPS);
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.init();

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);
});
