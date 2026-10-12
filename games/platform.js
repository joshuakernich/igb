/*
 * Platform
 *
 * An unfinished experiment from the Rejects folder: no rounds, scores or
 * end. Six coloured balls stand on a round earthen platform, tilted back on
 * the front wall in front of mountains and clouds. Each player has a ring on
 * the platform marking where they stand in the room, and their ball chases
 * it, bouncing off any other ball that gets too close. A ball carried more
 * than 800 from the middle drops through the floor and is out.
 *
 * The old game was a CSS 3D scene: the platform tilted back with rotateX
 * under a perspective, and each ball turned to face the room. Here the
 * projection is done by hand. The flat pieces (the platform, rings and
 * shadows) are traced point by point through the same perspective; each
 * ball is a circle scaled by its depth.
 *
 * Input: x (left / right across the room), z (towards / away from the
 * front wall).
 */
IGB.register('platform', function PlatformGame(stage, playersMeta) {

	const { WIDTH, H } = IGB;
	const art = IGB.art;

	const W = 1600;
	const FPS = 20;
	const PLAYER_COUNT = 6;

	const BG = 'assets/shared/bg-mountains-clouds.png';
	const BG_TOP = -250;    // background-position: center -250px

	/* ---------- the scene's geometry ---------- */

	// The camera: CSS perspective W, looking at the middle of the world.
	const PERSPECTIVE = W;
	const EYE = { x: WIDTH / 2, y: H / 2 };

	// The platform was a box (W - 150) square with a 150 border below it,
	// rounded into an ellipse, its bottom edge centred on the floor of the
	// front wall. It tilted back 60 degrees about that bottom edge.
	const SIZE = W - 150;
	const RIM = 150;
	const PIVOT = { x: WIDTH / 2, y: H };
	const COS = Math.cos(Math.PI / 3);
	const SIN = Math.sin(Math.PI / 3);
	const DISC = { x: PIVOT.x, y: H - (SIZE + RIM) / 2, rx: SIZE / 2, ry: (SIZE + RIM) / 2 };

	// The balls' origin: the middle of the box inside the border, which is
	// where the old platformcenter sat (top: 50%, left: 50%).
	const CENTER = { x: PIVOT.x, y: H - RIM - SIZE / 2 };

	// A ball: 400 across, scaled by 0.8, standing on its anchor.
	const BALL = 400 * 0.8 / 2;

	// Where a point of the platform's plane lands in the world. (X, Y) is
	// where it sat in the world before the tilt; Z is how far it stands out
	// of the platform (negative is underneath). s is how much things there
	// are scaled by distance, z their depth (negative is further away).
	function project(X, Y, Z) {
		const ry = Y - PIVOT.y;
		const y = PIVOT.y + ry * COS - Z * SIN;
		const z = ry * SIN + Z * COS;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + (X - EYE.x) * s, y: EYE.y + (y - EYE.y) * s, s, z };
	}

	// Trace an ellipse lying in the platform's plane (or Z above it), from
	// angle a0 to a1, continuing the current subpath when join is set.
	function ellipsePath(ctx, cx, cy, rx, ry, Z, a0 = 0, a1 = Math.PI * 2, join = false) {
		const N = 128;
		for (let i = 0; i <= N; i++) {
			const a = a0 + (a1 - a0) * i / N;
			const p = project(cx + rx * Math.cos(a), cy + ry * Math.sin(a), Z);
			if (i === 0 && !join) ctx.moveTo(p.x, p.y);
			else ctx.lineTo(p.x, p.y);
		}
	}

	function platformPath(ctx) {
		ellipsePath(ctx, DISC.x, DISC.y, DISC.rx, DISC.ry, 0);
	}

	/* ---------- a player's ball ---------- */

	const MeepBall = function (nPlayer) {

		const self = this;

		self.nPlayer = nPlayer;
		self.x = 0;
		self.y = 0;
		self.px = 0;
		self.py = 0;

		self.score = 0;
		self.dead = false;

		self.sx = 0;
		self.sy = 0;

		// What redraw last showed, relative to the platform's centre: the
		// ring on the player's spot, and the anchor the ball and its shadow
		// stand on. z sinks the anchor through the platform when it falls.
		self.target = { left: 0, top: 0, visible: true };
		self.anchor = { left: 0, top: 0, z: 0 };

		self.step = function () {

			const dx = self.x - self.px;
			const dy = self.y - self.py;

			self.sx = (self.sx + dx * 0.05) / 2;
			self.sy = (self.sy + dy * 0.05) / 2;

			self.px += self.sx;
			self.py += self.sy;

			const d = Math.sqrt(self.px * self.px + self.py * self.py);

			if (d > 800) {
				self.dead = true;
				self.target.visible = false;
				$(self.anchor).animate({ z: -1500 }, { duration: 1000, easing: 'ease' });
			}
		};

		self.collide = function (other) {
			const dx = self.px - other.px;
			const dy = self.py - other.py;
			const d = Math.sqrt(dy * dy + dx * dx);

			if (d < 300) {
				const r = Math.atan2(dy, dx);
				self.sx = Math.cos(r) * 150;
				self.sy = Math.sin(r) * 150;
			}
		};

		// The old .css() calls ignored 'NaNpx' (no tracking yet) and left
		// things where they were.
		self.redraw = function () {
			if (Number.isFinite(self.x)) self.target.left = self.x;
			if (Number.isFinite(self.y)) self.target.top = self.y;
			if (Number.isFinite(self.px)) self.anchor.left = self.px;
			if (Number.isFinite(self.py)) self.anchor.top = self.py;
		};
	};

	const self = this;

	const meeps = [];
	for (let i = 0; i < PLAYER_COUNT; i++) meeps[i] = new MeepBall(i);

	// The original handed the balls over where the HUD takes its colour;
	// nothing on this HUD is ever shown.
	const hud = new HUD(meeps);
	hud.$el.appendTo(stage.$ui);

	function step() {

		// step > collide > redraw

		for (const m in meeps) if (!meeps[m].dead) meeps[m].step();
		for (const m in meeps) if (!meeps[m].dead) for (const n in meeps) if (m !== n && !meeps[n].dead) meeps[m].collide(meeps[n]);
		for (const m in meeps) if (!meeps[m].dead) meeps[m].redraw();
	}

	const interval = stage.interval(step, 1000 / FPS);

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].x = p[m].x * (W / 2);
			meeps[m].y = -p[m].z * (W / 2);
		}
	};

	/* ---------- drawing ---------- */

	function anchorPoint(m) {
		const a = m.anchor;
		return project(CENTER.x + a.left, CENTER.y + a.top, a.z);
	}

	function byDepth(a, b) {
		return anchorPoint(a).z - anchorPoint(b).z;
	}

	function drawBackground(ctx) {
		const img = art.ready(BG);
		if (!img) return;
		const h = WIDTH * img.naturalHeight / img.naturalWidth;
		for (let y = BG_TOP; y < H; y += h) art.image(ctx, img, 0, y, WIDTH, h);
	}

	// The platform: the earth of its top, and the darker band of its
	// 150 border showing along the front.
	function drawPlatform(ctx) {
		ctx.beginPath();
		platformPath(ctx);
		ctx.fillStyle = 'rgba(100,55,0,1)';
		ctx.fill();

		ctx.beginPath();
		ellipsePath(ctx, DISC.x, DISC.y, DISC.rx, DISC.ry - RIM, 0, 0, Math.PI);
		ellipsePath(ctx, DISC.x, DISC.y, DISC.rx, DISC.ry, 0, Math.PI, Math.PI * 2, true);
		ctx.closePath();
		ctx.fillStyle = 'rgba(150,105,50,1)';
		ctx.fill();
	}

	// The ring marking a player's spot: 150 across, a 20 border.
	function drawTarget(ctx, m) {
		const t = m.target;
		ctx.beginPath();
		ellipsePath(ctx, CENTER.x + t.left, CENTER.y + t.top, 75, 75, 0);
		ellipsePath(ctx, CENTER.x + t.left, CENTER.y + t.top, 55, 55, 0);
		ctx.fillStyle = PLAYER_COLORS[m.nPlayer];
		ctx.fill('evenodd');
	}

	// The shadow under a ball: a 200 x 100 ellipse at 0.3 opacity.
	function drawShadow(ctx, m) {
		const a = m.anchor;
		ctx.save();
		ctx.globalAlpha *= 0.3;
		ctx.beginPath();
		ellipsePath(ctx, CENTER.x + a.left, CENTER.y + a.top, 100, 50, a.z);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.restore();
	}

	// A ball, facing the room, its bottom on its anchor. A falling ball
	// passes through the platform's plane: part is the part still above
	// it ('above') or the part already below ('below').
	function drawBall(ctx, m, part) {
		const a = m.anchor;
		if (part === 'below' && !(a.z < 0)) return;
		const p = anchorPoint(m);
		const r = BALL * p.s;
		ctx.save();
		if (a.z < 0) {
			// The ball's plane meets the platform's on this line.
			const split = p.y + (a.z / SIN) * p.s;
			ctx.beginPath();
			if (part === 'above') ctx.rect(-WIDTH, -10 * H, 3 * WIDTH, split + 10 * H);
			else ctx.rect(-WIDTH, split, 3 * WIDTH, 20 * H);
			ctx.clip();
		}
		art.circle(ctx, p.x, p.y - r, r, { fill: PLAYER_COLORS[m.nPlayer] });
		ctx.restore();
	}

	self.draw = function (ctx) {
		drawBackground(ctx);

		// Whatever has sunk below the platform first: the platform hides it
		// wherever it covers it.
		const sinking = meeps.filter((m) => m.anchor.z < 0).sort(byDepth);
		if (sinking.length) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(-WIDTH, -10 * H, 3 * WIDTH, 20 * H);
			platformPath(ctx);
			ctx.clip('evenodd');
			for (const m of sinking) {
				drawShadow(ctx, m);
				drawBall(ctx, m, 'below');
			}
			ctx.restore();
		}

		drawPlatform(ctx);

		// The rings and shadows lying on it, in the old DOM order.
		for (const m of meeps) {
			if (m.target.visible) drawTarget(ctx, m);
			if (!(m.anchor.z < 0)) drawShadow(ctx, m);
		}

		// The balls standing on it, back to front.
		for (const m of meeps.slice().sort(byDepth)) drawBall(ctx, m, 'above');
	};

	self.fini = function () {
		clearInterval(interval);
	};
});
