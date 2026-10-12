/*
 * Roulette Runner
 *
 * An unfinished prototype (from the Rejects folder). A roulette wheel lies on
 * a wooden table on the front wall, with three platforms (red, green, black)
 * in front of it. Six meeps stand on the platforms, each following its player
 * around the room while a ball drops onto the spinning wheel. As the wheel
 * slows the HUD calls "Freeze" and the meeps stay put; when it stops, the
 * segment under the ball flashes and the next spin starts. There is no
 * scoring and no end yet.
 *
 * The old game was a CSS 3D scene: the table tilted back in perspective, with
 * the spire, the ball and the meeps standing up on it. Here the projection is
 * done by hand, as in the-claw: the table's surface is painted flat into a
 * buffer and laid onto the screen in perspective a row at a time, then the
 * standing pieces are drawn back to front.
 *
 * Input: px (left / right across the platforms), pz (towards / away from the
 * front wall).
 */
IGB.register('roulette-runner', function RouletteRunnerGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const WHEEL = W * 0.8;
	const BALL = 70;
	const PLATFORM = W * 0.27;
	const COLORS = ['#ff1111', 'green', '#222'];
	const SEGS = [0, 2, 0, 2, 0, 2, 0, 2, 1];

	const BG = 'assets/shared/bg-village.png';
	const WOOD = 'assets/shared/texture-wood.png';

	const audio = stage.audio();
	audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('music', 'assets/roulette-runner/music-creeping.mp3', 0.3, true);

	/* ---------- the scene ---------- */

	// The camera: CSS perspective (W * 3) looking at the middle of the world.
	const PERSPECTIVE = W * 3;
	const EYE = { x: W * 1.5, y: H / 2 };

	// The table (W * 0.9 by W * 1.5, corners rounded 50) stands centred on the
	// front wall, its front edge 120 up from the bottom, and tilts back 70deg
	// about that edge. Everything on it is placed in table units: (u, v) from
	// its top-left corner, v growing towards the front, h up from its surface.
	const TABLE = { w: W * 0.9, h: W * 1.5 };
	const PIVOT = { x: W * 1.5, y: H - 120 };
	const TILT = 70 * Math.PI / 180;
	const cos = Math.cos(TILT);
	const sin = Math.sin(TILT);

	// The wheel: WHEEL across inside a 40 border, centred across the table in
	// the part of it above the last H.
	const WHEEL_BORDER = 40;
	const CENTRE = { u: TABLE.w / 2, v: (TABLE.h - H) / 2 };

	// The platforms, side by side, their front edge 100 from the table's.
	const PLATFORMS = {
		u: (TABLE.w - PLATFORM * COLORS.length) / 2,
		v: TABLE.h - 100 - PLATFORM,
		w: PLATFORM * COLORS.length,
		h: PLATFORM,
	};

	// Where a point of the table lands in the world. s is how much things
	// there are scaled by distance.
	function project(u, v, h) {
		const x = PIVOT.x - EYE.x + u - TABLE.w / 2;
		const y = PIVOT.y - EYE.y + cos * (v - TABLE.h) - sin * h;
		const z = sin * (v - TABLE.h) + cos * h;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + x * s, y: EYE.y + y * s, s, dx: x, dy: y };
	}

	// The table row (v) that lands on world row y: project() run backwards.
	function rowAt(y) {
		const t = y - EYE.y;
		return TABLE.h + PERSPECTIVE * (t - (PIVOT.y - EYE.y)) / (cos * PERSPECTIVE + t * sin);
	}

	// Set up ctx to draw in the plane standing upright on the table at row v
	// (the old rotateX(-90deg) pieces): x across as on the table, y = -h (up
	// is negative, as in CSS). The plane leans with the tilt and shrinks with
	// distance; the map is exact at (a, -h) and within a fraction of a pixel
	// across anything the size of a meep.
	function upright(ctx, u, v, a, h) {
		const p = project(u + a, v, h);
		const ds = p.s * p.s * cos / PERSPECTIVE; // how s grows with h
		const cx = -p.dx * ds;
		const cy = sin * p.s - p.dy * ds;
		ctx.transform(p.s, 0, cx, cy, p.x - p.s * a + cx * h, p.y + cy * h);
	}

	// Static art, painted once into a buffer w x h (in world units) once its
	// images have loaded, and again whenever the stage resizes (which clears
	// its surfaces). Returns a function giving the buffer, or null until then.
	function cached(w, h, images, paint) {
		const surface = stage.surface(w, h);
		let painted = false;
		// Every resize clears the buffer, even one that keeps its size (the
		// window only got taller, say), so repaint after each.
		const resize = surface.resize;
		surface.resize = function () {
			resize();
			painted = false;
		};
		return function () {
			if (!painted && images.every((src) => art.ready(src))) {
				painted = true;
				surface.clear();
				paint(surface.ctx);
			}
			return painted ? surface : null;
		};
	}

	// The village, tiled as the old background was: a third of the width by
	// 220% of the height, anchored at the bottom centre. A repeating pattern
	// rather than separate images, so no seam shows between the tiles.
	const village = cached(IGB.WIDTH, H, [BG], function (v) {
		const img = art.ready(BG);
		const tw = IGB.WIDTH * 0.333;
		const th = H * 2.2;
		const pattern = v.createPattern(img, 'repeat');
		pattern.setTransform(new DOMMatrix()
			.translate((IGB.WIDTH - tw) / 2, H - th)
			.scale(tw / img.naturalWidth, th / img.naturalHeight));
		v.fillStyle = pattern;
		v.fillRect(0, 0, IGB.WIDTH, H);
	});

	/* ---------- the table's surface ---------- */

	// Painted flat in table units, with room below for the table's shadow.
	const floor = stage.surface(TABLE.w, TABLE.h + 100);

	// The bare table, its edge a solid shadow 100 to the front.
	const table = cached(floor.w, floor.h, [WOOD], function (t) {
		art.roundRect(t, 0, 100, TABLE.w, TABLE.h, 50, { fill: '#38231d' });
		t.save();
		t.beginPath();
		art.roundRectPath(t, 0, 0, TABLE.w, TABLE.h, 50);
		t.clip();
		art.tile(t, WOOD, 0, 0, TABLE.w, TABLE.h);
		t.restore();
	});

	// The segments' colours (a flashing segment turns yellow).
	const fills = SEGS.map((s) => COLORS[s]);

	// Everything lying flat on the table, in the old paint order.
	function paintSurface(f) {
		const c = CENTRE;

		const base = table();
		if (base) f.drawImage(base.canvas, 0, 0, floor.w, floor.h);

		// the wheel's rim, its edge a solid shadow 100 to the front
		const R = WHEEL / 2 + WHEEL_BORDER;
		art.circle(f, c.u, c.v + 100, R, { fill: '#222' });
		art.circle(f, c.u, c.v, R, { fill: '#ddd' });

		// the turning segments, each a wedge reaching well past the wheel,
		// cut to its circle
		f.save();
		f.beginPath();
		f.arc(c.u, c.v, WHEEL / 2, 0, Math.PI * 2);
		f.clip();
		f.translate(c.u, c.v);
		f.rotate(rSpin);
		const int = Math.PI * 2 / SEGS.length;
		for (let i = 0; i < SEGS.length; i++) {
			f.beginPath();
			f.moveTo(0, 0);
			f.lineTo(Math.cos(int * i) * WHEEL, Math.sin(int * i) * WHEEL);
			f.lineTo(Math.cos(int * (i + 1)) * WHEEL, Math.sin(int * (i + 1)) * WHEEL);
			f.closePath();
			f.fillStyle = fills[i];
			f.fill();
		}
		f.restore();

		// the balls' shadows
		for (const ball of balls) {
			art.circle(f, c.u + ball.x, c.v + ball.y, BALL / 2, { fill: 'black', alpha: 0.5 });
		}

		// the spire's base, shadowed 20 to the front
		art.circle(f, c.u, c.v + 20, 75, { fill: 'black' });
		art.circle(f, c.u, c.v, 75, { fill: '#ddd' });

		// the wheel's inner shadow along its far edge
		const ring = (g) => {
			g.moveTo(c.u + WHEEL / 2, c.v);
			g.arc(c.u, c.v, WHEEL / 2, 0, Math.PI * 2);
		};
		art.inset(f, ring, { color: '#222', y: 30 });

		// the platforms, a black band along their far edge
		art.rect(f, PLATFORMS.u, PLATFORMS.v - 40, PLATFORMS.w, PLATFORMS.h, { fill: 'black' });
		for (let i = 0; i < COLORS.length; i++) {
			art.rect(f, PLATFORMS.u + i * PLATFORM, PLATFORMS.v, PLATFORM, PLATFORM, { fill: COLORS[i] });
		}
	}

	function drawSurface(ctx) {
		const f = floor.ctx;
		floor.clear();
		paintSurface(f);

		// Each row of the table lands on one row of the screen, scaled about
		// the middle, so lay it down a device pixel row at a time.
		const ky = ctx.getTransform().d;
		const kb = floor.canvas.height / floor.h;
		const top = project(0, 0, 0).y;
		const bottom = project(0, floor.h, 0).y;
		const left = PIVOT.x - EYE.x - TABLE.w / 2;
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const y0 = j / ky;
			const y1 = (j + 1) / ky;
			const v0 = Math.max(0, rowAt(y0));
			const v1 = Math.min(floor.h, rowAt(y1));
			if (v1 <= v0) continue;
			const s = PERSPECTIVE / (PERSPECTIVE - sin * ((v0 + v1) / 2 - TABLE.h));
			ctx.drawImage(floor.canvas,
				0, v0 * kb, floor.canvas.width, (v1 - v0) * kb,
				EYE.x + left * s, y0, floor.w * s, y1 - y0);
		}
	}

	/* ---------- the pieces standing on it ---------- */

	// The spire: a 50 x 200 pill, standing 40 in front of the wheel's centre.
	function drawSpire(ctx) {
		ctx.save();
		upright(ctx, CENTRE.u, CENTRE.v + 40, 0, 100);
		const fill = art.linear(ctx, -25, 0, 25, 0, ['white', 'white', 'gray']);
		art.roundRect(ctx, -25, -200, 50, 200, 25, { fill });
		ctx.restore();
	}

	// The ball stands upright on the wheel, `altitude` further back than its
	// shadow (the old ball rose by its CSS bottom, in the table's plane).
	function drawBall(ctx, ball) {
		ctx.save();
		upright(ctx, CENTRE.u + ball.x, CENTRE.v + ball.y - ball.altitude, 0, BALL / 2);
		art.circle(ctx, 0, -BALL / 2, BALL / 2, { fill: 'white' });
		ctx.restore();
	}

	// A meep standing on the platforms at (left, top), scaled 0.8. The half
	// of its shadow below its feet was below the table, so hidden.
	function drawMeep(ctx, meep) {
		ctx.save();
		upright(ctx, PLATFORMS.u + meep.left, PLATFORMS.v + meep.top, 0, Meep.H * 0.4);
		ctx.scale(0.8, 0.8);
		ctx.beginPath();
		ctx.rect(-Meep.H, -Meep.H * 2, Meep.H * 2, Meep.H * 2);
		ctx.clip();
		meep.drawLocal(ctx);
		ctx.restore();
	}

	/* ---------- the ball ---------- */

	const GRAVITY = 1;
	const RouletteBall = function (rStart, rDir, speed) {
		const self = this;

		self.altitude = H;
		self.sFall = 0;

		self.x = Math.cos(rStart) * WHEEL / 2;
		self.y = Math.sin(rStart) * WHEEL / 2;
		self.sx = Math.cos(rDir) * speed;
		self.sy = Math.sin(rDir) * speed;

		self.step = function () {
			self.sFall += GRAVITY;
			self.altitude -= self.sFall;

			self.x += self.sx;
			self.y += self.sy;

			if (self.altitude < 0) {
				self.altitude = 0;
				self.sFall = -Math.abs(self.sFall) * 0.8;
				self.sx *= 0.7;
				self.sy *= 0.7;
			}
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	const meeps = [];

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const balls = [];
	function spawnBall() {
		const rStart = Math.random() * Math.PI * 2;
		const rVector = rStart + Math.PI + (Math.random() > 0.5 ? 0.3 : -0.3);
		const ball = new RouletteBall(rStart, rVector, 3 + Math.random() * 3);
		balls.push(ball);
	}

	let rSpinSpeed = 0;
	let rSpin = 0;
	let isSpinComplete = false;
	let isSpinFreeze = false;

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			meeps[i] = new Meep(i);
			// placed on the platforms by left / top (px), as the CSS meep was
			meeps[i].left = i * 0.2 * PLATFORMS.w;
			meeps[i].top = 0.5 * PLATFORMS.h;
		}

		initRound();
	}

	initGame(6);

	function initRound() {
		balls.length = 0;
		rSpinSpeed = 0.1;
		isSpinComplete = false;
		isSpinFreeze = false;

		spawnBall();
	}

	function step() {
		rSpinSpeed *= 0.99;

		rSpin += rSpinSpeed;

		for (const ball of balls) ball.step();

		if (!isSpinFreeze) {
			for (const m of meeps) {
				m.x = m.px;
				m.y = m.py;
				// Before the tracker reports these are undefined; the old
				// CSS ignored the resulting NaN and left the meep where it was.
				if (Number.isFinite(m.x)) m.left = m.x * PLATFORMS.w;
				if (Number.isFinite(m.y)) m.top = m.y * PLATFORMS.h;
			}
		}

		if (!isSpinFreeze && rSpinSpeed < 0.01) {
			hud.initBanner('Freeze');
			isSpinFreeze = true;
		}

		if (rSpinSpeed < 0.005 && !isSpinComplete) {
			hud.finiBanner();
			rSpinSpeed = 0;
			isSpinComplete = true;
			for (const ball of balls) {
				const r = Math.atan2(ball.y, ball.x);

				const rActual = (r - rSpin) % (Math.PI * 2);
				const p = (rActual) / (Math.PI * 2);
				let iSeg = Math.floor(p * SEGS.length);
				// The old code picked the segment with jQuery's .eq(iSeg),
				// which counts a negative index back from the end.
				if (iSeg < 0) iSeg += SEGS.length;

				const color = fills[iSeg];

				let cntFlash = 12;
				const flash = stage.interval(function () {
					cntFlash--;
					fills[iSeg] = [color, 'yellow'][cntFlash % 2];
					if (!cntFlash) {
						clearInterval(flash);
						stage.timeout(initRound, 1000);
					}
				}, 200);
			}
		}
	}

	const interval = stage.interval(step, 1000 / FPS);

	self.draw = function (ctx) {
		const bg = village();
		if (bg) ctx.drawImage(bg.canvas, 0, 0, IGB.WIDTH, H);
		drawSurface(ctx);

		// The standing pieces, back to front (the old 3D scene sorted them by
		// depth; pieces level with each other keep the old DOM order).
		const pieces = [];
		for (const ball of balls) pieces.push({ v: CENTRE.v + ball.y - ball.altitude, draw: () => drawBall(ctx, ball) });
		pieces.push({ v: CENTRE.v + 40, draw: () => drawSpire(ctx) });
		for (const m of meeps) pieces.push({ v: PLATFORMS.v + m.top, draw: () => drawMeep(ctx, m) });
		pieces.sort((a, b) => a.v - b.v);
		for (const piece of pieces) piece.draw();
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		meeps.forEach(function (m, i) {
			m.px = (p[i].px);
			m.py = (1 - p[i].pz);
		});
	};
});
