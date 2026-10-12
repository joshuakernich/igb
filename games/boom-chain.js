/*
 * Boom Chain
 *
 * Fifty white balls roll slowly about a floor that runs across all three
 * walls. Six players take turns: each taps one ball, it bursts, and every
 * ball within reach of a blast bursts in turn, so one tap sets off a chain
 * reaction. The count of balls that went up is the turn's score, written
 * huge across the floor. Most balls wins.
 *
 * The old game was a CSS 3D scene: the floor tilted back in perspective,
 * the balls standing up on it. Here the projection is done by hand, as in
 * games/the-claw.js. Everything lying on the floor (its shading, the score,
 * the balls' shadows and the blasts) is painted flat into a buffer and laid
 * onto the screen in perspective one pixel row at a time; each ball is then
 * drawn, back to front, through the affine map that matches the
 * perspective at its centre.
 *
 * Input: taps on the balls (clicks on the stage, hit-tested with
 * IGB.toWorld). Tracked player positions are not used.
 */
IGB.register('boom-chain', function BoomChainGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const BALL = 100;
	const ASPLODE = 500;
	const BLAST_BORDER = 20; // the blast ring (boomlayer:first-of-type)

	const BG = 'assets/shared/bg-village.png';
	IGB.image(BG); // start loading it now

	const audio = stage.audio();
	audio.add('music', 'assets/boom-chain/music-playroom.mp3', 0.3, true);

	/* ---------- the scene in perspective ---------- */

	// The camera: CSS perspective (W * 3) looking at the middle of the
	// world. The floor is the world's width, stops 100 short of the bottom,
	// and tilts back 50 degrees about its bottom edge. Each ball stands up
	// from it, turned back -48 degrees, so it leans 2 degrees away.
	const PERSPECTIVE = W * 3;
	const EYE = { x: W * 1.5, y: H / 2 };
	const FLOOR_W = W * 3;
	const FLOOR_H = H - 100;
	const TILT = 50 * Math.PI / 180;
	const STAND = 48 * Math.PI / 180;
	const COS = Math.cos(TILT);
	const SIN = Math.sin(TILT);

	// Where a point of the floor lands in the world: (u, v) across and down
	// the floor (0..FLOOR_W, 0..FLOOR_H, v grows towards the front), h up
	// off it. s is how much things there are scaled by distance.
	function project(u, v, h) {
		const y = FLOOR_H - EYE.y + COS * (v - FLOOR_H) - SIN * h;
		const z = SIN * (v - FLOOR_H) + COS * h;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + (u - EYE.x) * s, y: EYE.y + y * s, s };
	}

	// The floor row (v) that lands on world row y: project() run backwards.
	function rowAt(y) {
		const t = y - EYE.y;
		return FLOOR_H + PERSPECTIVE * (t - (FLOOR_H - EYE.y)) / (COS * PERSPECTIVE + t * SIN);
	}

	// How much the floor at row v is scaled by distance.
	function scaleAt(v) {
		return PERSPECTIVE / (PERSPECTIVE - SIN * (v - FLOOR_H));
	}

	// A point (x, y) of a ball standing at (u, v) on the floor, in the
	// ball's own plane: x across, y up as negative (as in CSS).
	function ballPoint(u, v, x, y) {
		return project(u + x, v + y * Math.cos(STAND), -y * Math.sin(STAND));
	}

	// The affine map from a ball's plane to the world, exact at the ball's
	// centre (0, -BALL / 2) and within a hair across the ball.
	function standing(u, v) {
		const cy = -BALL / 2;
		const o = ballPoint(u, v, 0, cy);
		const ex = ballPoint(u, v, 1, cy);
		const ey = ballPoint(u, v, 0, cy + 1);
		const a = ex.x - o.x;
		const b = ex.y - o.y;
		const c = ey.x - o.x;
		const d = ey.y - o.y;
		return { a, b, c, d, e: o.x - c * cy, f: o.y - d * cy };
	}

	/* ---------- a ball ---------- */

	const BoomBall = function () {
		const self = this;

		self.asploded = false;
		self.px = 1.5;
		self.py = 0.5;

		self.r = Math.random() * Math.PI * 2;
		self.speed = 0.001;
		self.sx = Math.cos(self.r) * self.speed;
		self.sy = Math.sin(self.r) * self.speed;

		// What its CSS held: the spot on the floor (left, top), the inner
		// ball's spin in degrees, and whether it still takes taps.
		self.left = undefined;
		self.top = undefined;
		self.spin = 0;
		self.tappable = false;
		self.layers = [];

		self.step = function () {
			self.px += self.sx;
			self.py += self.sy;
		};

		self.redraw = function () {
			self.left = self.px * W;
			self.top = self.py * H;
			self.spin = self.px * W * 2;
		};

		const LAYERS = 1;
		const BOOM = 200; // unused, as in the original
		self.boom = function (doSpreadCallback) {

			self.asploded = true;
			self.sx = 0;
			self.sy = 0;

			// $el.empty().off(): the ball and its shadow go, and taps with them
			self.tappable = false;
			self.layers = [];

			for (let i = 0; i < LAYERS; i++) {
				// y lifted a layer off the floor (translateZ); with one layer it
				// is 0, so the blast lies flat on the floor.
				const y = Math.sin(i / LAYERS * Math.PI / 2);
				const size = Math.sin(Math.PI / 2 + i / LAYERS * Math.PI / 2);
				// The CSS layer was border-box with a 20px border, so jQuery
				// read its starting width as 40 (the border), not the 0 it set.
				const layer = { width: BLAST_BORDER * 2, height: BLAST_BORDER * 2, lift: y * ASPLODE / 2, opacity: 1 };
				self.layers.push(layer);
				$(layer).animate({
					width: size * ASPLODE,
					height: size * ASPLODE,
				}, {
					duration: 200,
					complete: function () { doSpreadCallback(self); },
				}).delay(200).animate({
					opacity: 0,
				});
			}
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	// The score of each player; only the active one is ever on show.
	const scores = [];
	const scoreViews = [];
	let showScores = false; // the score container is on the floor

	const hud = new HUD('#F49B29');
	hud.$el.appendTo(stage.$ui);

	let countPlayers = 6;

	const VOLUME = 50;

	let balls = [];
	let onStage = []; // the balls on the floor, in the order they were added

	function initGame(count) {
		countPlayers = count;

		for (let i = 0; i < count; i++) {
			scores[i] = 0;
			scoreViews[i] = { text: String(VOLUME), visible: false, active: false };
		}

		initNextPlayer();
	}

	let nPlayer = -1;
	function initNextPlayer() {
		nPlayer++;

		// $stage.empty(): the floor loses its score and every ball
		onStage = [];
		showScores = false;
		for (const s of scoreViews) {
			s.visible = false;
			s.active = false;
		}

		// The old game ran off the end of the squad here and threw; finish
		// instead.
		if (!scoreViews[nPlayer]) {
			finiGame();
			return;
		}

		scoreViews[nPlayer].visible = true;
		scoreViews[nPlayer].active = true;
		scoreViews[nPlayer].text = '0';
		showScores = true;

		for (let i = 0; i < VOLUME; i++) {
			balls[i] = new BoomBall();
			balls[i].px = 0.1 + Math.random() * 2.8;
			balls[i].py = 0.1 + Math.random() * 0.8;
			onStage.push(balls[i]);
			balls[i].tappable = true;
			balls[i].n = i;
		}

		hud.initBanner('Tap one ball');
	}

	let timeout;
	function onBall(n) {
		hud.finiBanner();
		for (const ball of balls) ball.tappable = false;
		initBoom(n);
	}

	function doSpread(from) {

		for (let b = 0; b < balls.length; b++) {
			if (balls[b] !== from && !balls[b].asploded) {
				const dx = (from.px - balls[b].px) * W;
				const dy = (from.py - balls[b].py) * H;
				const d = Math.sqrt(dx * dx + dy * dy);

				if (d < (ASPLODE / 2 + BALL / 2)) initBoom(b);
			}
		}
	}

	function initBoom(b) {
		balls[b].boom(doSpread);
		scores[nPlayer]++;
		scoreViews[nPlayer].text = String(scores[nPlayer]);

		clearTimeout(timeout);
		timeout = stage.timeout(finiBoom, 2000);
	}

	function finiBoom() {
		hud.initBanner('Nice!');

		stage.timeout(function () {
			hud.finiBanner();
		}, 2000);

		stage.timeout(function () {
			initNextPlayer();
		}, 4000);
	}

	// Most balls wins.
	function finiGame() {
		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			clearInterval(interval);
			audio.stop('music');
			IGB.complete(rewards);
		}, 5000);
	}

	initGame(6);

	function step() {

		for (const ball of balls) ball.step();

		for (let a = 0; a < balls.length; a++) {

			if (balls[a].px > 2.96) balls[a].sx = -Math.abs(balls[a].sx);
			if (balls[a].px < 0.04) balls[a].sx = Math.abs(balls[a].sx);
			if (balls[a].py > 0.85) balls[a].sy = -Math.abs(balls[a].sy);
			if (balls[a].py < 0.15) balls[a].sy = Math.abs(balls[a].sy);

			for (let b = 0; b < balls.length; b++) {

				if (b !== a && !balls[a].asploded && !balls[b].asploded) {
					const dx = (balls[a].px - balls[b].px) * W;
					const dy = (balls[a].py - balls[b].py) * H;
					const d = Math.sqrt(dx * dx + dy * dy);

					if (d < BALL) {
						const r = Math.atan2(dy, dx);

						balls[a].sx = Math.cos(r) * balls[a].speed;
						balls[a].sy = Math.sin(r) * balls[a].speed;

						balls[b].sx = Math.cos(r + Math.PI) * balls[b].speed;
						balls[b].sy = Math.sin(r + Math.PI) * balls[b].speed;
					}
				}
			}
		}

		for (const ball of balls) ball.redraw();
	}

	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- tapping ---------- */

	// The ball under (x, y): the front-most ball standing there, else the
	// last-added ball whose shadow is there (a shadow was part of the ball).
	function ballAt(x, y) {
		const list = drawOrder();
		for (let i = list.length - 1; i >= 0; i--) {
			const ball = list[i];
			const m = standing(ball.left, ball.top);
			const det = m.a * m.d - m.b * m.c;
			const lx = (m.d * (x - m.e) - m.c * (y - m.f)) / det;
			const ly = (-m.b * (x - m.e) + m.a * (y - m.f)) / det;
			if (lx * lx + (ly + BALL / 2) ** 2 <= (BALL / 2) ** 2) return ball;
		}
		const v = rowAt(y);
		const u = EYE.x + (x - EYE.x) / scaleAt(v);
		for (let i = onStage.length - 1; i >= 0; i--) {
			const ball = onStage[i];
			if (ball.asploded || ball.left === undefined) continue;
			if ((u - ball.left) ** 2 + (v - ball.top) ** 2 <= (BALL / 2) ** 2) return ball;
		}
		return undefined;
	}

	stage.$el.on('click', function (e) {
		if (stage.$ui[0].contains(e.target)) return; // a HUD control had it
		const p = IGB.toWorld(e);
		const ball = ballAt(p.x, p.y);
		if (ball && ball.tappable) onBall(ball.n);
	});

	/* ---------- drawing ---------- */

	const PAD = ASPLODE / 2; // room round the floor for blasts at its edges
	const floor = stage.surface(FLOOR_W + PAD * 2, FLOOR_H + PAD * 2);

	// The village, tiled across the walls a third of the world wide and
	// 1.8 times its height, bottom-aligned and centred. It never changes,
	// so it is painted once into a buffer, and again if that is resized.
	const backdrop = stage.surface(FLOOR_W, H);
	let isBackdropPainted = false;
	const resizeBackdrop = backdrop.resize;
	backdrop.resize = function () {
		resizeBackdrop();
		isBackdropPainted = false;
	};

	function drawBackground(ctx) {
		if (!isBackdropPainted) {
			if (!art.ready(BG)) return;
			const tw = FLOOR_W * 0.333;
			const th = H * 1.8;
			const x0 = (FLOOR_W - tw) / 2;
			// Tile edges snapped to the buffer's pixels, as CSS tiles are, so
			// no seam shows between them.
			const k = backdrop.canvas.width / FLOOR_W;
			const snap = (x) => Math.round(x * k) / k;
			backdrop.clear();
			for (let x = x0 - Math.ceil(x0 / tw) * tw; x < FLOOR_W; x += tw) {
				art.image(backdrop.ctx, BG, snap(x), H - th, snap(x + tw) - snap(x), th);
			}
			isBackdropPainted = true;
		}
		ctx.drawImage(backdrop.canvas, 0, 0, FLOOR_W, H);
	}

	// The active score, 1000px tall in white, on a line box the height of
	// the world from the top of the floor; its container was 20% opaque.
	function paintScore(f) {
		const view = scoreViews.find((s) => s.visible && s.active);
		if (!showScores || !view) return;
		f.save();
		f.font = `600 ${H}px Rubik, sans-serif`;
		const m = f.measureText(view.text);
		f.restore();
		const ascent = m.fontBoundingBoxAscent || H * 0.935;
		const descent = m.fontBoundingBoxDescent || H * 0.25;
		art.text(f, view.text, FLOOR_W / 2, H / 2 + (ascent - descent) / 2, {
			size: H, font: 'Rubik', weight: 600, fill: 'white', baseline: 'alphabetic', alpha: 0.2,
		});
	}

	// A blast lying on the floor at (x, y): a red ring (the border) round a
	// red glow fading to clear at the middle (a radial gradient reaching
	// the padding box's corners).
	function paintBlast(f, x, y, layer) {
		const size = Math.max(layer.width, BLAST_BORDER * 2);
		const pad = size - BLAST_BORDER * 2;
		f.save();
		f.globalAlpha *= layer.opacity;
		if (pad > 0) {
			const glow = art.radial(f, x, y, 0, pad * Math.SQRT1_2, ['rgba(255,0,0,0)', 'red']);
			art.circle(f, x, y, pad / 2, { fill: glow });
		}
		art.border(f, x - size / 2, y - size / 2, size, size, size / 2, BLAST_BORDER, { fill: 'red' });
		f.restore();
	}

	// Everything lying on the floor, in floor units, in the old paint order:
	// the floor's own shade and inset shadows, the score, then each ball's
	// shadow (or, once it has gone up, its blast).
	function paintFloor(f) {
		art.rect(f, 0, 0, FLOOR_W, FLOOR_H, { fill: 'rgba(0,0,0,0.2)' });
		art.rect(f, 0, 0, 20, FLOOR_H, { fill: 'rgba(0,0,0,0.5)' });
		art.rect(f, FLOOR_W - 20, 0, 20, FLOOR_H, { fill: 'rgba(0,0,0,0.5)' });
		art.rect(f, 0, 0, FLOOR_W, 30, { fill: 'rgba(0,0,0,0.5)' });

		paintScore(f);

		for (const ball of onStage) {
			if (ball.left === undefined) continue;
			if (!ball.asploded) {
				art.circle(f, ball.left, ball.top, BALL / 2, { fill: 'black', alpha: 0.3 });
			} else {
				for (const layer of ball.layers) paintBlast(f, ball.left, ball.top, layer);
			}
		}
	}

	function drawFloor(ctx) {
		const f = floor.ctx;
		floor.clear();
		f.save();
		f.translate(PAD, PAD);
		paintFloor(f);
		f.restore();

		// Each row of the floor lands on one row of the screen, scaled about
		// the middle, so lay it down a device pixel row at a time.
		const ky = ctx.getTransform().d;
		const kb = floor.canvas.height / floor.h;
		const top = project(0, -PAD, 0).y;
		const bottom = Math.min(H, project(0, FLOOR_H + PAD, 0).y);
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const y0 = j / ky;
			const y1 = (j + 1) / ky;
			const v0 = Math.max(-PAD, rowAt(y0));
			const v1 = Math.min(FLOOR_H + PAD, rowAt(y1));
			if (v1 <= v0) continue;
			const s = scaleAt((v0 + v1) / 2);
			ctx.drawImage(floor.canvas,
				0, (v0 + PAD) * kb, floor.canvas.width, (v1 - v0) * kb,
				EYE.x + (-PAD - EYE.x) * s, y0, floor.w * s, y1 - y0);
		}
	}

	// A ball standing in its own plane: a white disc BALL across sitting on
	// the floor, shaded from the lower right and turned as it rolls, with
	// a dark elliptical band (its :after, a 140 x 100 ring 20 thick)
	// curving across its lower half.
	const R = BALL / 2;
	const disc = (c) => { c.moveTo(R, 0); c.arc(0, 0, R, 0, Math.PI * 2); };

	function drawBall(ctx, ball) {
		const m = ball.matrix;
		ctx.save();
		ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
		ctx.translate(0, -R);
		ctx.rotate(ball.spin * Math.PI / 180);
		art.circle(ctx, 0, 0, R, { fill: 'white' });
		art.inset(ctx, disc, { color: 'black', blur: 20, x: -5, y: -10 });
		ctx.beginPath();
		disc(ctx);
		ctx.clip();
		art.border(ctx, -70, -30, 140, 100, { x: 140, y: 100 }, 20, { fill: 'rgba(0,0,0,0.2)' });
		ctx.restore();
	}

	// The standing balls back to front: those further back first, then in
	// the order they were added.
	function drawOrder() {
		return onStage
			.filter((ball) => !ball.asploded && ball.left !== undefined)
			.sort((a, b) => (a.top - b.top) || (a.n - b.n));
	}

	self.draw = function (ctx) {
		drawBackground(ctx);
		drawFloor(ctx);
		for (const ball of drawOrder()) {
			ball.matrix = standing(ball.left, ball.top);
			drawBall(ctx, ball);
		}
	};

	self.fini = function () {
		audio.stop('music');
		clearInterval(interval);
	};

	// Keep the first countPlayers players (the old game cut the launcher's
	// own list down to that length).
	self.setPlayers = function (p) {
		self.players = p.slice(0, countPlayers);
	};
});
