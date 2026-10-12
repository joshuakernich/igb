/*
 * Cupping Balls
 *
 * The shell game with the players as the peas. Six balls, one per player,
 * roll in across the three walls and are covered by cups, which then swap
 * places. Once the cups stop, everyone taps the cup they think hides their
 * own ball; the tapped cup lifts and that ball scores a point. Four rounds,
 * each with more swaps.
 *
 * Input: taps on the cups (clicks on the stage, hit-tested with
 * IGB.toWorld), and walls[n].dist, which picks the player nearest the tapped
 * wall as the one who has had their turn.
 */
IGB.register('cupping-balls', function CuppingBallsGame(stage, playersMeta) {

	const { H } = IGB;
	const W = IGB.W;
	const art = IGB.art;
	const FPS = 50;
	const BALL = 200;
	const CUP = 250;

	const POS = [
		0.35, 0.75,
		1.3, 1.7,
		2.25, 2.65,
	];

	const BG = 'assets/shared/bg-village.png';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-sport.mp3', 0.2, true);

	const self = this;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const meeps = [];

	/* ---------- art ---------- */

	// The village, 33.3% x 180% of the world, tiled from the bottom centre.
	function drawBackground(ctx) {
		const tw = IGB.WIDTH * 0.333;
		const th = H * 1.8;
		const x0 = (IGB.WIDTH - tw) / 2;
		for (let x = x0 - Math.ceil(x0 / tw) * tw; x < IGB.WIDTH; x += tw) art.image(ctx, BG, x, H - th, tw, th);
	}

	// Where CSS puts the baseline in a line box lineHeight tall, for the
	// context's current font.
	function baseline(ctx, lineHeight) {
		const m = ctx.measureText('.');
		return (lineHeight - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent;
	}

	// The shadow under a ball, from (0, 0): an ellipse fading to the right.
	function drawBallShadow(ctx) {
		const x = -BALL / 3;
		const w = BALL;
		art.ellipse(ctx, x + w / 2, 0, w / 2, BALL / 12, {
			fill: art.linear(ctx, x, 0, x + w, 0, ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']),
		});
	}

	// A ball resting on (0, 0), rolled `spin` degrees: white shading to grey,
	// two dots for eyes and a band in the player's colour.
	function drawBall(ctx, n, spin) {
		const r = BALL / 2;
		ctx.save();
		ctx.translate(0, -r);
		ctx.rotate(spin * Math.PI / 180);

		art.circle(ctx, 0, 0, r, { fill: art.linear(ctx, -r, -r, r, r, ['white', 'white', '#777']) });

		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.clip();

		// ". ." in a 140px line at the top of the ball, stretched 1.5x
		// tall about the ball's centre, at half opacity.
		ctx.save();
		ctx.globalAlpha *= 0.5;
		ctx.scale(1, 1.5);
		ctx.font = `bold ${BALL * 0.7}px serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = 'black';
		ctx.fillText('. .', 0, -r + baseline(ctx, BALL * 0.7));
		ctx.restore();

		// The band: the 40px top border of an ellipse twice the ball's
		// width, its border box starting 15% down the ball.
		const cy = -r + BALL * 0.15 + (BALL + 40) / 2;
		ctx.beginPath();
		ctx.ellipse(0, cy, BALL, (BALL + 40) / 2, 0, Math.PI, Math.PI * 2);
		ctx.ellipse(0, cy, BALL, (BALL + 40) / 2 - 40, 0, Math.PI * 2, Math.PI, true);
		ctx.closePath();
		ctx.fillStyle = PLAYER_COLORS[n];
		ctx.fill();

		ctx.restore();
	}

	const CUP_FILL = ['cyan', '#126378'];
	const CUP_INSET = { color: 'rgba(0,0,0,0.2)', blur: 20, x: -10, y: -4 };

	// A cup standing on (0, 0): a wide lower half with a white rim, and a
	// narrower upper half whose top is an ellipse.
	function drawCup(ctx) {
		const R = CUP / 3;

		// lower: background, inset shadow, then the 20px white bottom border
		const lx = -CUP / 2;
		const ly = -CUP;
		const inner = [R, R, { x: R, y: R - 20 }, { x: R, y: R - 20 }];
		art.roundRect(ctx, lx, ly, CUP, CUP, R, { fill: art.linear(ctx, lx, 0, lx + CUP, 0, CUP_FILL) });
		art.inset(ctx, (c) => art.roundRectPath(c, lx, ly, CUP, CUP - 20, inner), CUP_INSET);
		ctx.beginPath();
		art.roundRectPath(ctx, lx, ly, CUP, CUP, R);
		art.roundRectPath(ctx, lx, ly, CUP, CUP - 20, inner);
		ctx.fillStyle = 'white';
		ctx.fill('evenodd');

		// upper
		const uw = CUP * 0.88;
		const ux = -uw / 2;
		const uy = -CUP / 2 - CUP;
		art.roundRect(ctx, ux, uy, uw, CUP, R, { fill: art.linear(ctx, ux, 0, ux + uw, 0, CUP_FILL) });
		art.inset(ctx, (c) => art.roundRectPath(c, ux, uy, uw, CUP, R), CUP_INSET);

		// its top: an ellipse with a 10px darker bottom border
		const rx = uw / 2;
		const ry = (CUP / 3 + 10) / 2;
		const cy = uy + ry;
		art.ellipse(ctx, 0, cy, rx, ry, { fill: '#00EBEE' });
		ctx.beginPath();
		ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI);
		ctx.ellipse(0, cy, rx, ry - 10, 0, Math.PI, 0, true);
		ctx.closePath();
		ctx.fillStyle = 'rgba(0,0,0,0.2)';
		ctx.fill();
	}

	/* ---------- tapping ---------- */

	// Hit tests trace the same shapes on a spare context, under the same
	// transforms, and ask whether the tap is inside.
	const hitCtx = document.createElement('canvas').getContext('2d');

	function inside(ctx, trace, x, y) {
		ctx.beginPath();
		trace(ctx);
		return ctx.isPointInPath(x, y);
	}

	/* ---------- a cup ---------- */

	const CuppingCup = function (i) {
		const self = this;

		self.px = 0;
		self.py = 0;
		self.altitude = 0;
		self.iPos = -1;

		// What the old DOM showed: container at (left, top) in the ball's
		// frame, the cup lifted by `bottom` and turned `rotate` degrees.
		self.left = 0;
		self.top = 0;
		self.bottom = 0;
		self.rotate = 0;
		self.shadowOpacity = 0;

		self.redraw = function () {
			self.left = self.px * W;
			self.top = self.py * H;
			self.bottom = self.altitude * H;
			self.rotate = -self.altitude * 90;
			self.shadowOpacity = 0;
		};

		function transform(ctx) {
			ctx.translate(self.left, self.top);
			ctx.translate(0, -self.bottom);
			ctx.rotate(self.rotate * Math.PI / 180);
		}

		// The shadow is invisible but still took taps.
		function traceShadow(c) {
			art.roundRectPath(c, -CUP / 2, -CUP / 3 + 10, CUP * 1.5, CUP / 3, CUP);
		}

		self.draw = function (ctx) {
			ctx.save();
			transform(ctx);
			drawCup(ctx);
			ctx.restore();
		};

		// x, y in the ball's frame (hitCtx already holds that transform).
		self.hit = function (ctx, x, y) {
			ctx.save();
			ctx.translate(self.left, self.top);
			let isHit = inside(ctx, traceShadow, x, y);
			ctx.restore();
			if (isHit) return true;
			ctx.save();
			transform(ctx);
			// lower, upper, and the upper's lid, which pokes out past its
			// rounded top corners
			const ry = (CUP / 3 + 10) / 2;
			isHit = inside(ctx, (c) => art.roundRectPath(c, -CUP / 2, -CUP, CUP, CUP, CUP / 3), x, y)
				|| inside(ctx, (c) => art.roundRectPath(c, -CUP * 0.44, -CUP * 1.5, CUP * 0.88, CUP, CUP / 3), x, y)
				|| inside(ctx, (c) => c.ellipse(0, -CUP * 1.5 + ry, CUP * 0.44, ry, 0, 0, Math.PI * 2), x, y);
			ctx.restore();
			return isHit;
		};
	};

	/* ---------- a ball, its score and its cup ---------- */

	const CuppingMeep = function (i) {
		const self = this;
		self.n = i;

		// The score above the ball (the old <cuppingscore>).
		const label = { text: '', opacity: 1, visible: true };

		const cup = new CuppingCup(i);
		cup.altitude = 1;

		self.px = 0;
		self.py = 0.8;
		self.score = 0;

		// Sampled by redraw each tick, as the old CSS was.
		self.left = undefined;
		self.top = undefined;
		self.z = 0;
		self.spin = 0;

		self.redraw = function () {
			self.left = self.px * W;
			self.top = self.py * H;
			self.z = Math.round(self.py * 20);
			self.spin = self.px * 540;
			cup.redraw();
		};

		self.addScore = function () {
			self.score++;
			label.text = String(self.score);
			$(label).stop(false, false);
			label.opacity = 1;
			$(label).delay(200).animate({ opacity: 0 });
		};

		self.showScore = function () {
			label.text = String(self.score);
			$(label).stop(false, false);
			label.opacity = 1;
		};

		self.toCupped = function () {
			label.visible = false;
			$(cup).animate({ altitude: 0 });
		};

		self.toUncupped = function () {
			$(cup).animate({ altitude: 0.4 });
		};

		self.addPoint = function () {
			self.score++;
			label.text = String(self.score);
			label.visible = true;
		};

		self.toPos = function (iPos, dirForward, duration = 500) {
			self.iPos = iPos;
			const pxTarget = POS[iPos];

			$(self).animate({
				px: (pxTarget + self.px) / 2,
				py: 0.8 + dirForward * 0.05,
			}, { duration: duration / 2, easing: 'linear' }).animate({
				px: pxTarget,
				py: 0.8,
			}, { duration: duration / 2, easing: 'linear' });
		};

		self.draw = function (ctx) {
			ctx.save();
			ctx.translate(self.left, self.top);
			drawBallShadow(ctx);
			drawBall(ctx, i, self.spin);
			if (label.visible && label.text !== '') {
				ctx.save();
				ctx.globalAlpha *= label.opacity;
				ctx.font = `600 100px Rubik, sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'alphabetic';
				ctx.fillStyle = 'white';
				ctx.fillText(label.text, 0, -BALL - 150 + baseline(ctx, 150));
				ctx.restore();
			}
			cup.draw(ctx);
			ctx.restore();
		};

		// Whether a tap at world (x, y) lands on any part of this ball:
		// its shadow, the ball, the score while it shows, or the cup.
		self.hit = function (x, y) {
			if (self.left === undefined) return false;
			const c = hitCtx;
			c.setTransform(1, 0, 0, 1, 0, 0);
			c.translate(self.left, self.top);
			const r = BALL / 2;
			return inside(c, (p) => p.ellipse(-BALL / 3 + BALL / 2, 0, BALL / 2, BALL / 12, 0, 0, Math.PI * 2), x, y)
				|| inside(c, (p) => p.arc(0, -r, r, 0, Math.PI * 2), x, y)
				|| (label.visible && label.text !== '' && inside(c, (p) => p.rect(-200, -BALL - 150, 400, 150), x, y))
				|| cup.hit(c, x, y);
		};
	};

	/* ---------- rounds ---------- */

	const ROUNDS = [
		[
			[0, 1], [2, 3], [4, 5],
		],
		[
			[0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
		],
		[
			[0, 1], [4, 5], [1, 2], [3, 4], [2, 3],
		],
		[
			[2, 3], [3, 4], [1, 2], [0, 1], [1, 2], [5, 4], [4, 3],
		],
	];

	let iRound = -1;

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			meeps[i] = new CuppingMeep(i);
			meeps[i].iPos = i;
			meeps[i].px = -0.1;

			$(meeps[i])
				.delay((count - i) * 500)
				.animate(
					{
						px: POS[i],
					}, {
						duration: 500 + i * 1000,
						complete: meeps[i].toCupped,
					}
				);
		}

		stage.timeout(function () {
			for (const m of meeps) m.toUncupped();
		}, count * 1000 + 1000);

		stage.timeout(initNextRound, count * 1000 + 2500);
	}

	initGame(6);

	function onMeep(iSelect) {
		const iWall = Math.floor(meeps[iSelect].px);

		let min = 1;
		let iMin = -1;
		for (let m = 0; m < meeps.length; m++) {
			if (!meeps[m].hasSelected && meeps[m].walls[iWall].dist < min) {
				min = meeps[m].walls[iWall].dist;
				iMin = m;
			}
		}

		if (iMin > -1) {
			meeps[iMin].hasSelected = true;
			meeps[iSelect].hasSelected = true;
			meeps[iSelect].toUncupped();
			meeps[iSelect].addPoint();

			let hasAllSelected = true;
			for (const m of meeps) if (!m.hasSelected) hasAllSelected = false;
			if (hasAllSelected) {
				hud.finiBanner();
				for (const m of meeps) m.toUncupped();
				stage.timeout(finiRound, 2000);
			}
		}
	}

	function doSwap(aPos, bPos) {

		let a = 0;
		let b = 0;

		for (let m = 0; m < meeps.length; m++) if (meeps[m].iPos === aPos) a = m;
		for (let m = 0; m < meeps.length; m++) if (meeps[m].iPos === bPos) b = m;

		const ia = meeps[a].iPos;
		const ib = meeps[b].iPos;

		meeps[a].toPos(ib, -1);
		meeps[b].toPos(ia, 1);
	}

	function initNextRound() {

		iRound++;

		hud.initRound(iRound, ROUNDS.length);

		stage.timeout(function () {
			hud.finiBanner();
			for (const m of meeps) m.toCupped();
		}, 2000);

		if (iRound === 0) {
			stage.timeout(function () {
				hud.initBanner('Watch Carefully');
			}, 3000);

			stage.timeout(function () {
				hud.finiBanner();
			}, 5000);
		}

		stage.timeout(function () {
			initMix();
		}, (iRound === 0) ? 6000 : 3000);
	}

	function finiRound() {

		if (ROUNDS[iRound + 1]) {
			stage.timeout(initNextRound, 2000);
		} else {
			stage.timeout(finiGame, 2000);
		}
	}

	function finiGame() {
		hud.initBanner('Finish');
		stage.timeout(function () {
			const scores = [];
			for (let m = 0; m < meeps.length; m++) scores[m] = meeps[m].score;
			IGB.complete(window.scoresToRewards(scores));
		}, 2000);
	}

	function initMix() {

		const round = ROUNDS[iRound];

		for (let r = 0; r < round.length; r++) {
			stage.timeout(function () {
				doSwap(round[r][0], round[r][1]);
			}, r * 1000);
		}

		stage.timeout(function () {
			hud.initBanner('Find your meep');
			for (const m of meeps) m.hasSelected = false;
		}, round.length * 1000);
	}

	// A tap goes to the front-most ball under it (the old z-index, then
	// DOM order).
	function sorted() {
		return meeps.slice().sort((a, b) => a.z - b.z);
	}

	stage.$el.on('click', function (e) {
		if (stage.$ui[0].contains(e.target)) return; // a HUD control had it
		const p = IGB.toWorld(e);
		const list = sorted();
		for (let i = list.length - 1; i >= 0; i--) {
			if (list[i].hit(p.x, p.y)) {
				onMeep(list[i].n);
				return;
			}
		}
	});

	function step() {
		for (const m of meeps) m.redraw();
	}

	self.draw = function (ctx) {
		drawBackground(ctx);
		for (const m of sorted()) if (m.left !== undefined) m.draw(ctx);
	};

	self.fini = function () {
		audio.stop('music');
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].walls = p[m].walls;
		}
	};

	const interval = stage.interval(step, 1000 / FPS);
});
