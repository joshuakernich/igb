/*
 * Ball Spin
 *
 * An experiment rather than a game: two arms reach up from the bottom of a
 * neon basketball court spread across all three walls, each pointing a
 * finger at the middle of the wall's height and following its player left
 * and right. A spinning basketball drops onto each finger from the top; one
 * caught near the fingertip balances there and slowly rolls off the side,
 * and a dropped ball starts again from a random spot along the top. Only
 * two players, no rounds, no scores, no end.
 *
 * Input: px (the arm's place along the front wall) of players 1 and 2.
 */
IGB.register('ball-spin', function BallSpinGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;

	const BALL = 300;
	const GRAVITY = 0.001;

	const BG = 'assets/ball-spin/bball-neon.png';
	const ARM = 'assets/ball-spin/bball-arm.png';
	const PATTERN = 'assets/ball-spin/bball-pattern.jpeg';

	// The wristband and the ball's rim (the CSS styled players 0 and 1).
	const COLORS = ['red', 'blue'];

	const self = this;

	/* ---------- art ---------- */

	// An image repeated across the box (x, y, w, h), its tiles tw x th with
	// one of them at (ox, oy): background-repeat inside the box. A pattern
	// fill rather than one drawImage per tile, which left a faint seam where
	// two anti-aliased tile edges met (CSS tiles without one).
	const patterns = new Map();
	function drawRepeat(ctx, src, x, y, w, h, ox, oy, tw, th) {
		const img = art.ready(src);
		if (!img) return;
		let pattern = patterns.get(src);
		if (!pattern) {
			pattern = ctx.createPattern(img, 'repeat');
			patterns.set(src, pattern);
		}
		pattern.setTransform(new DOMMatrix([tw / img.naturalWidth, 0, 0, th / img.naturalHeight, ox, oy]));
		ctx.save();
		ctx.fillStyle = pattern;
		ctx.fillRect(x, y, w, h);
		ctx.restore();
	}

	// The court across all three walls: background-size 100% (4800 wide),
	// positioned center 30% vertically.
	function drawCourt(ctx) {
		const img = art.ready(BG);
		if (!img) return;
		const w = IGB.WIDTH;
		const h = w * img.naturalHeight / img.naturalWidth;
		drawRepeat(ctx, BG, 0, 0, w, H, 0, (H - h) * 0.3, w, h);
	}

	// An arm whose top-centre is at (x, y): a 300 x 700 box (left -150)
	// holding the arm picture at 170% of its width, centred, 110 up, and the
	// wristband 90 across and 260 down it.
	const ARM_W = H * 0.3;
	const ARM_H = H * 0.7;
	function drawArm(ctx, n, x, y) {
		const left = x - ARM_W / 2;
		const img = art.ready(ARM);
		if (img) {
			const tw = ARM_W * 1.7;
			const th = tw * img.naturalHeight / img.naturalWidth;
			drawRepeat(ctx, ARM, left, y, ARM_W, ARM_H, left + (ARM_W - tw) / 2, y - H * 0.11, tw, th);
		}
		drawWrist(ctx, n, left + 90, y + 260);
	}

	// The wristband: 100 x 60 inside a 2px #222 border, so 104 x 64, its
	// top-left at (x, y), turned -5deg about its centre, with a light inner
	// shadow along the top and a dark drop shadow.
	function drawWrist(ctx, n, x, y) {
		const w = 104;
		const h = 64;
		ctx.save();
		ctx.translate(x + w / 2, y + h / 2);
		ctx.rotate(-5 * Math.PI / 180);
		ctx.translate(-w / 2, -h / 2);
		const radii = [5, 5, 10, 10];
		art.roundRect(ctx, 0, 0, w, h, radii, {
			fill: COLORS[n],
			shadow: { color: 'rgba(0,0,0,0.6)', blur: 10, y: 2 },
		});
		inset(ctx, (c) => art.roundRectPath(c, 2, 2, w - 4, h - 4, [3, 3, 8, 8]),
			{ color: 'rgba(255,255,255,0.5)', blur: 5, x: 1, y: 3 });
		art.border(ctx, 0, 0, w, h, radii, 2, { fill: '#222' });
		ctx.restore();
	}

	// Like art.inset, but the frame that casts the shadow is opaque, so a
	// translucent shadow colour keeps its own alpha (a canvas shadow takes
	// the shape's alpha times the shadow colour's).
	function inset(ctx, path, shadow) {
		ctx.save();
		ctx.beginPath();
		path(ctx);
		ctx.clip();
		ctx.beginPath();
		ctx.rect(-1e5, -1e5, 2e5, 2e5);
		path(ctx);
		art.setShadow(ctx, shadow);
		ctx.fillStyle = 'black';
		ctx.fill('evenodd');
		ctx.restore();
	}

	// A ball whose element sat at (x, y): the 300 x 300 circle plus its 10px
	// rim hangs from there, 150 left of it and bottom on it, so it is 320
	// across and centred on (x + 10, y - 160). The pattern is 140% of the
	// circle's width, repeating, and scrolls right one tile every 0.75s.
	function drawBall(ctx, n, x, y, phase) {
		const size = BALL + 20;
		const left = x - BALL / 2;
		const top = y - size;
		const cx = left + size / 2;
		const cy = top + size / 2;
		const img = art.ready(PATTERN);
		if (img) {
			const tw = BALL * 1.4;
			const th = tw * img.naturalHeight / img.naturalWidth;
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
			ctx.clip();
			drawRepeat(ctx, PATTERN, left, top, size, size, left + 10 + phase * tw, top + 10, tw, th);
			ctx.restore();
		}
		art.border(ctx, left, top, size, size, size / 2, 10, { fill: COLORS[n] });
	}

	/* ---------- players and balls ---------- */

	let players = [];

	const BallSpinPlayer = function (n) {
		const self = this;
		self.n = n;

		// Where the arm's top-centre sits; left: 50% until the first valid px.
		self.left = 1.5 * W;
		self.top = H * 0.5;

		self.py = 0.5;

		self.ball = new BallSpinBall(n);

		self.redraw = function () {
			// jQuery's .css() dropped 'NaNpx' and left the arm where it was.
			const left = (1 + self.px) * W;
			if (isFinite(left)) self.left = left;
			self.top = self.py * H;

			const dx = self.ball.px - self.px;
			if (self.ball.py > self.py && self.ball.py < self.py + 0.05 && Math.abs(dx) < 0.07) {
				self.ball.sy = 0;
				self.ball.sx = dx * 0.01 * self.ball.speed;
				self.ball.py = self.py + Math.abs(dx) * 0.5;
				self.ball.speed += 0.025;
			}

			self.ball.redraw();
		};
	};

	const BallSpinBall = function (n) {
		const self = this;
		self.n = n;

		self.px = 0.5;
		self.py = 0;
		self.sy = 0;
		self.sx = 0;
		self.speed = 1;

		self.left = (1 + self.px) * W;
		self.top = self.py * H;

		self.redraw = function () {

			self.px += self.sx;

			self.sy += GRAVITY;
			self.py += self.sy;

			self.left = (1 + self.px) * W;
			self.top = self.py * H;

			if (self.py > 1.2) {
				self.py = 0;
				self.sx = 0;
				self.sy = 0;
				self.speed = 1;
				self.px = 0.1 + Math.random() * 0.8;
			}
		};
	};

	function initGame(count) {
		for (let n = 0; n < count; n++) {
			players[n] = new BallSpinPlayer(n);
		}
	}

	initGame(2);

	function step() {
		for (const n in players) {
			players[n].redraw();
		}
	}

	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	let timeStart;

	self.draw = function (ctx, time) {
		if (time === undefined) time = performance.now();
		if (timeStart === undefined) timeStart = time;
		const phase = ((time - timeStart) / 750) % 1;

		drawCourt(ctx);
		// DOM order: each arm, then its ball.
		for (const p of players) {
			drawArm(ctx, p.n, p.left, p.top);
			drawBall(ctx, p.ball.n, p.ball.left, p.ball.top, phase);
		}
	};

	self.setPlayers = function (p) {
		for (const n in players) {
			players[n].px = (p[n].px);
		}
	};

	self.fini = function () {
		clearInterval(interval);
	};
});
