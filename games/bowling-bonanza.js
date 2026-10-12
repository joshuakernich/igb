/*
 * Bowling Bonanza
 *
 * A bowling lane runs away from the bottom of the front wall. Players take
 * turns, two balls each: the camera flies down the lane to show the player
 * their pattern of pins and back, then their ball rolls off down the lane.
 * Moving side to side steers it (and stepping towards or away from the wall
 * nudges it along the lane); every pin it knocks over is a point. Only the
 * front wall is used.
 *
 * The old game was a CSS 3D scene: the lane tipped 85 degrees back under a
 * perspective camera, with the pins, the balls and the arch at the far end
 * standing up on it, turned to face the room. Here the projection is done
 * by hand: the lane is a projected polygon, the shadows lying on it are drawn
 * through the affine map that matches the perspective at their centre, and
 * the standing pieces, which stay parallel to the wall, are drawn back to
 * front, each scaled for its depth.
 *
 * Input: px (side to side), pz (towards / away from the front wall).
 */
IGB.register('bowling-bonanza', function BowlingBonanzaGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const BALLS_PER_TURN = 2;
	const YSCALE = 1;

	const BG = 'assets/shared/bg-village.png';

	const audio = stage.audio();
	audio.add('tick', 'assets/shared/sfx-select.mp3', 0.3);
	audio.add('music', 'assets/shared/music-sport.mp3', 0.2, true);
	audio.add('roll', 'assets/bowling-bonanza/sfx-bowling-ball.mp3', 0.3, true);
	audio.add('pin', 'assets/bowling-bonanza/sfx-pin.mp3', 0.3);

	/* ---------- pin patterns ---------- */

	// One string per row, nearest the far end first; a '1' is a pin. Columns
	// sit at 0.1 .. 0.9 of the lane's width, rows one lane-width apart.

	const TUTORIAL = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'  1      ',
		'         ',
		'    1    ',
		'         ',
		'      1  ',
		'         ',
		'    1    ',
		'         ',
		'  1      ',
		'         ',
		'    1    ',
		'         ',
		'      1  ',
		'         ',
		'    1    ',
		'         ',
		'  1      ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const CURVES = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		'         ',
		'1     1  ',
		'         ',
		' 1     1 ',
		'         ',
		'   1    1',
		'         ',
		'     1  1',
		'         ',
		'      1 1',
		'         ',
		'     1  1',
		'         ',
		'   1    1',
		'         ',
		' 1     1 ',
		'         ',
		'1     1  ',
		'         ',
		' 1     1 ',
		'         ',
		'  1     1',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const ROWS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'    1    ',
		'    1    ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'  1   1  ',
		'  1   1  ',
		'  1   1  ',
		'  1   1  ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'    1    ',
		'    1    ',
		'    1    ',
		'         ',
		'         ',
		'         ',
	];

	const BARRIERS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
		'     111 ',
		'         ',
		'         ',
		'         ',
		'   111   ',
		'         ',
		'         ',
		'         ',
		' 111     ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
		'   111   ',
		'         ',
		'         ',
		'         ',
		' 11   11 ',
		'         ',
		'         ',
		'         ',
	];

	const ZIGZAG = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'     1   ',
		'      1  ',
		' 1     1 ',
		' 1     1 ',
		' 1     1 ',
		'      1  ',
		'     1   ',
		'         ',
		'         ',
		'         ',
		'  1 1 1  ',
		'         ',
		'         ',
		'         ',
		'   1     ',
		'  1      ',
		' 1    1  ',
		' 1    1  ',
		' 1    1  ',
		'  1      ',
		'   1     ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const STACKS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'       1 ',
		'      1  ',
		'     1   ',
		'1 1 1    ',
		' 1 1     ',
		'  1      ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		' 1       ',
		'  1      ',
		'   1     ',
		'    1 1 1',
		'     1 1 ',
		'      1  ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
	];

	const HOUSES = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		' 1 1 1 1 ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'         ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'   1 1   ',
		'  1 1 1  ',
		' 1 1 1 1 ',
		'         ',
		' 1     1 ',
		'1 1   1 1',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const TRIANGLES = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'    1    ',
		'         ',
		'    1    ',
		'   1 1   ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'    1    ',
		'         ',
		'    1    ',
		'   1 1   ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'    1    ',
		'         ',
		'    1    ',
		'   1 1   ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const DIAMONDS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'1 1   1 1',
		' 1     1 ',
		'  1   1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		'1 1   1 1',
		' 1     1 ',
		'  1   1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'   1 1   ',
		' 1     1 ',
		'  1   1  ',
		'   1 1   ',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const CHAOS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		' 1     1 ',
		'1 1   1 1',
		'         ',
		'    1    ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'    1    ',
		'         ',
		' 1     1 ',
		'1 1   1 1',
		'         ',
		'         ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'    1    ',
		'         ',
		' 1     1 ',
		'1 1   1 1',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const ARROWS = [
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
		'         ',
		'    1    ',
		'   1 1   ',
		'  1 1 1  ',
		' 1     1 ',
		'1 1   1 1',
		' 1     1 ',
		'         ',
		'         ',
		'         ',
		'         ',
		'      1  ',
		' 1 1 1 1 ',
		'  1      ',
		'         ',
		'         ',
		'         ',
		'         ',
		' 1     1 ',
		'1 1   1 1',
		' 1     1 ',
		'  1 1 1  ',
		'   1 1   ',
		'    1    ',
		'         ',
		'         ',
		'         ',
		'         ',
	];

	const EASY = [CURVES, ROWS, BARRIERS, ZIGZAG];
	const HARD = [ARROWS, CHAOS, DIAMONDS, TRIANGLES, HOUSES, STACKS];

	const ROUNDS = [
		undefined,
		undefined,
		[
			[EASY[0], EASY[1]],
			[HARD[0], HARD[1]],
			[HARD[2], HARD[3]],
		],
		[
			[EASY[0], EASY[1], EASY[2]],
			[HARD[0], HARD[1], HARD[2]],
		],
		[
			[HARD[0], HARD[1], HARD[2], HARD[3]],
		],
		[
			[HARD[0], HARD[1], HARD[2], HARD[3], HARD[4]],
		],
		[
			[HARD[0], HARD[1], HARD[2], HARD[3], HARD[4], HARD[5]],
		],
	];

	/* ---------- the camera ---------- */

	// CSS perspective (W * 3) looking at the middle of the world. The lane's
	// near end lies along the bottom edge of the front wall and it is tipped
	// 85 degrees back. Lane coordinates: lx runs across it (0..W), ly along
	// it, 0 at the bottom of the wall and negative going away.
	const PERSPECTIVE = W * 3;
	const EYE = { x: IGB.WIDTH / 2, y: H / 2 };
	const TILT = 85 * Math.PI / 180;
	const COS = Math.cos(TILT);
	const SIN = Math.sin(TILT);
	const TALLEST = H;   // the arch; nothing standing reaches higher

	// Where lane point (lx, ly) lands on the world, and k, how much things
	// standing there are scaled. Undefined behind the camera.
	function project(lx, ly) {
		const z = ly * SIN;
		if (z >= PERSPECTIVE - 1) return undefined;
		const k = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + (W + lx - EYE.x) * k, y: EYE.y + (H + ly * COS - EYE.y) * k, k };
	}

	// Run fn with the context set up for a piece standing at lane point
	// (lx, ly), facing the room: (0, 0) is its foot, in its own px, up negative.
	function standing(ctx, lx, ly, fn) {
		const p = project(lx, ly);
		if (!p || p.y - TALLEST * p.k > H) return;
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.scale(p.k, p.k);
		fn(ctx);
		ctx.restore();
	}

	// Run fn with the context set up for something lying on the lane around
	// (lx, ly): (0, 0) is that point, x across the lane, y down it towards
	// the room, in lane px.
	function lying(ctx, lx, ly, fn) {
		const p = project(lx, ly);
		if (!p || p.y - 300 * p.k > H) return;
		const dk = p.k * p.k * SIN / PERSPECTIVE;
		ctx.save();
		ctx.transform(p.k, 0, (W + lx - EYE.x) * dk, COS * p.k + (H + ly * COS - EYE.y) * dk, p.x, p.y);
		fn(ctx);
		ctx.restore();
	}

	/* ---------- art ---------- */

	const SHINE = ['white', 'white', '#777'];
	const SHADE = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'];

	// CSS linear-gradient(to bottom right, ...) over the box (x, y, w, h).
	function toBottomRight(ctx, x, y, w, h, stops) {
		const len = Math.hypot(w, h);
		const half = w * h / len;
		const dx = h / len * half;
		const dy = w / len * half;
		return art.linear(ctx, x + w / 2 - dx, y + h / 2 - dy, x + w / 2 + dx, y + h / 2 + dy, stops);
	}

	// Where CSS puts the baseline in a line box lineHeight tall, for the
	// context's current font.
	function baseline(ctx, lineHeight) {
		const m = ctx.measureText('.');
		return (lineHeight - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent;
	}

	// The village on every wall, cut off at the bottom, tiled across the world.
	function drawBackground(ctx) {
		const tw = IGB.WIDTH * 0.333;
		const th = H * 1.8;
		const x0 = (IGB.WIDTH - tw) / 2;
		for (let x = x0 - Math.ceil(x0 / tw) * tw; x < IGB.WIDTH; x += tw) art.image(ctx, BG, x, H - th, tw, th);
	}

	// The dark wall at the far end, W x H with a rounded top.
	function drawWall(ctx) {
		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, -W / 2, -H, W, H, [W / 4, W / 4, 0, 0]);
		// radial-gradient's default ellipse, reaching the corners
		ctx.translate(0, -H / 2);
		ctx.scale(1, H / W);
		ctx.fillStyle = art.radial(ctx, 0, 0, 0, W / 2 * Math.SQRT2, ['rgb(16, 57, 82)', 'black']);
		ctx.fill();
		ctx.restore();
	}

	// The arch in front of it: a 150px border on the top and sides.
	function drawHole(ctx) {
		const B = 150;
		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, -W / 2, -H, W, H, [W / 4, W / 4, 0, 0]);
		art.roundRectPath(ctx, -W / 2 + B, -H + B, W - B * 2, H - B, [W / 4 - B, W / 4 - B, 0, 0]);
		ctx.fillStyle = '#047A96';
		ctx.fill('evenodd');
		ctx.restore();
	}

	// A pin standing on (0, 0): an egg of a body, a red neck band, a round
	// head, each painted over the one before. The old pin faded as one piece,
	// so while it is see-through (`faded`) each part leaves out the parts
	// painted over it, rather than showing through them.
	const neckPath = (c) => art.roundRectPath(c, -20, -240, 40, 60, [0, 0, 20, 20]);
	const headPath = (c) => { c.moveTo(30, -265); c.ellipse(0, -265, 30, 35, 0, 0, Math.PI * 2); };
	function without(ctx, path) {
		ctx.beginPath();
		ctx.rect(-1e4, -1e4, 2e4, 2e4);
		path(ctx);
		ctx.clip('evenodd');
	}
	function drawPin(ctx, faded) {
		ctx.save();
		if (faded) without(ctx, neckPath);
		art.ellipse(ctx, 0, -100, 50, 100, { fill: toBottomRight(ctx, -50, -200, 100, 200, SHINE) });
		ctx.restore();

		ctx.save();
		if (faded) without(ctx, headPath);
		ctx.beginPath();
		neckPath(ctx);
		ctx.fillStyle = art.linear(ctx, -20, 0, 20, 0, ['red', '#555']);
		ctx.fill();
		ctx.restore();

		ctx.beginPath();
		headPath(ctx);
		ctx.fillStyle = toBottomRight(ctx, -30, -300, 60, 70, SHINE);
		ctx.fill();
	}

	// A ball standing on (0, 0), turned spin degrees, with player n's stripe.
	function drawBall(ctx, n, spin) {
		ctx.save();
		ctx.translate(0, -150);
		ctx.rotate(spin * Math.PI / 180);
		ctx.beginPath();
		ctx.arc(0, 0, 150, 0, Math.PI * 2);
		ctx.clip();
		ctx.fillStyle = toBottomRight(ctx, -150, -150, 300, 300, SHINE);
		ctx.fillRect(-150, -150, 300, 300);

		// the finger holes: ". ." in bold serif, stretched tall, half see-through
		ctx.save();
		ctx.globalAlpha *= 0.5;
		ctx.scale(1, 1.5);
		ctx.font = 'bold 150px serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = 'black';
		ctx.fillText('. .', 0, -150 + baseline(ctx, 200));
		ctx.restore();

		// the stripe: the top border of an ellipse twice the ball's width
		ctx.beginPath();
		ctx.ellipse(0, 65, 300, 170, 0, Math.PI, Math.PI * 2);
		ctx.ellipse(0, 65, 300, 130, 0, Math.PI * 2, Math.PI, true);
		ctx.closePath();
		ctx.fillStyle = art.playerColor(n);
		ctx.fill();
		ctx.restore();
	}

	/* ---------- pins and balls ---------- */

	const BowlingPin = function (x, y) {
		const self = this;

		self.isActive = true;
		self.x = x;
		self.y = y;

		// The whole pin's opacity, its body's (opacity, a tip in degrees and
		// a rise along its own axis) and its shadow's.
		self.opacity = 1;
		self.body = { opacity: 1, tip: 0, rise: 0 };
		self.shadow = { opacity: 1 };

		self.initHit = function (dx) {
			audio.play('pin', true);

			const r = dx > 0 ? 45 : -45;

			self.isActive = false;
			self.body.tip = r;
			self.body.rise = 100;
			$(self.body).animate({
				opacity: 0,
			});

			$(self).delay(500).animate({ opacity: 0 });
		};

		self.initAppear = function (delay) {

			self.shadow.opacity = 0;
			self.body.rise = 300;
			self.body.opacity = 0;

			stage.timeout(function () {
				$(self.body).animate({ rise: 0, opacity: 1 }, { duration: 200, easing: 'ease' });
				self.shadow.opacity = 1;
			}, delay);
		};

		// ly: where the pin's point is along the lane. Its shadow lies from
		// there towards the room; the pin stands 200px nearer.
		self.drawShadow = function (ctx, ly) {
			const a = self.opacity * self.shadow.opacity;
			if (a <= 0) return;
			lying(ctx, self.x * W + 45, ly + 150, function (c) {
				art.ellipse(c, 0, 0, 75, 150, { fill: art.linear(c, -75, 0, 75, 0, SHADE), alpha: a });
			});
		};

		self.drawBody = function (ctx) {
			const a = self.opacity * self.body.opacity;
			if (a <= 0) return;
			ctx.globalAlpha *= a;
			ctx.rotate(self.body.tip * Math.PI / 180);
			ctx.translate(0, -self.body.rise);
			drawPin(ctx, a < 1);
		};
	};

	const BowlingMeep = function (i) {
		const self = this;

		self.n = i;
		self.px = 0;
		self.py = 0;
		self.ay = 0;
		self.score = 0;
		self.visible = true;

		// What the old CSS held: the ball's place on the lane (left and
		// bottom in px) and its turn.
		self.left = 0;
		self.bottom = 0;
		self.spin = 0;

		const scores = [];

		self.redraw = function () {
			// Before the tracker reports, px and py can be undefined; the old
			// CSS ignored the NaN and left the ball where it was.
			const left = self.px * W;
			const bottom = (self.ay + self.py) * W;
			const spin = self.px * 180;
			if (isFinite(left)) self.left = left;
			if (isFinite(bottom)) self.bottom = bottom;
			if (isFinite(spin)) self.spin = spin;
		};

		self.addScore = function () {
			self.score++;

			const s = { bottom: 300, opacity: 1 };
			scores.push(s);
			$(s).animate({ bottom: 500, opacity: 0 }, {
				duration: 400,
				complete: function () {
					scores.splice(scores.indexOf(s), 1);
				},
			});
		};

		// ly: where the ball sits along the lane.
		self.drawShadow = function (ctx, ly) {
			lying(ctx, self.left + 50, ly, function (c) {
				art.ellipse(c, 0, 0, 150, 150, { fill: art.linear(c, -150, 0, 150, 0, SHADE) });
			});
		};

		self.drawBall = function (ctx) {
			drawBall(ctx, self.n, self.spin);
			if (!scores.length) return;
			ctx.font = '600 200px Rubik, sans-serif';
			const b = baseline(ctx, 200);
			for (const s of scores) {
				art.text(ctx, '+1', 0, -(s.bottom + 200) + b, {
					size: 200, weight: 600, font: 'Rubik', fill: 'white', baseline: 'alphabetic', alpha: s.opacity,
				});
			}
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	let showGlass = true;
	const meeps = [];
	const pins = [];

	let pattern;
	let length = 3;
	const anim = { isActive: true, sy: length - 3 };
	let scrollSy = 0;   // how far down the lane the camera is, as the step last set it

	let nPlayer = -1;
	let nRound = -1;
	let nBall = -1;

	function initGame(count) {

		for (let i = 0; i < count; i++) {
			meeps[i] = new BowlingMeep(i);
			meeps[i].visible = false;
		}

		initTutorial();
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function initTutorial() {
		initPattern(TUTORIAL);

		anim.isActive = true;
		anim.sy = length - 3;

		$(anim).delay(1000).animate({ sy: 0 }, 4000);

		for (const m of meeps) {
			m.visible = true;
			m.ay = 0;
			m.isActive = true;
		}

		stage.timeout(function () {
			hud.initTutorial('Bowling Bonanza',
				{ x: 1.5, y: 0.5, msg: 'Move side to side<br>to knock down the pins', icon: 'side-to-side' },
			);
		}, 5000);

		stage.timeout(function () {
			anim.isActive = false;
			self.speed = 0.05;
			audio.play('roll');
		}, 10000);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		anim.isActive = true;
		anim.sy = length - 3;

		hud.finiTutorial();
		hud.finiTimer();
		showGlass = false;

		pins.length = 0;

		for (const m of meeps) {
			m.score = 0;
			m.visible = false;
			m.isActive = false;
		}
		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		hud.initPlayers(meeps);
		initNextRound();
	}

	function initNextRound() {
		nPlayer = -1;
		nRound++;

		if (!ROUNDS[meeps.length][nRound]) {
			finiGame();
			return;
		}

		if (ROUNDS[meeps.length].length > 1) {
			stage.timeout(function () {
				audio.play('music');
				hud.initRound(nRound, ROUNDS[meeps.length].length);
			}, 2000);

			stage.timeout(function () {
				hud.finiBanner();
			}, 4000);

			stage.timeout(function () {
				initNextPlayer();
			}, 6000);
		} else {
			audio.play('music');
			initNextPlayer();
		}
	}

	function initPattern(patternNew) {

		pins.length = 0;

		pattern = patternNew;
		length = pattern.length * YSCALE;

		for (let y = 0; y < pattern.length; y++) {
			for (let x = 0; x < pattern[y].length; x++) {
				if (pattern[y][x] === '1') {
					const pin = new BowlingPin(0.1 + x * (1 / 10), (pattern.length - y) * YSCALE);
					pins.push(pin);

					if (y < 5) pin.initAppear(500 + y * 100);
				}
			}
		}
	}

	function initNextPlayer() {

		pins.length = 0;

		for (const m of meeps) {
			m.visible = false;
			m.isActive = false;
		}

		nPlayer++;
		nBall = -1;

		meeps[nPlayer].ay = 0;
		meeps[nPlayer].isActive = true;
		meeps[nPlayer].visible = true;

		initPattern(ROUNDS[meeps.length][nRound][nPlayer]);

		anim.isActive = true;
		anim.sy = length - 3;

		$(anim).delay(2000).animate({ sy: 0 }, {
			duration: 2000,
			complete: function () {
				anim.isActive = false;
			},
		});

		stage.timeout(function () {
			hud.summonPlayers([nPlayer]);
		}, 4000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 6000);

		stage.timeout(initNextBall, 7000);
	}

	function initNextBall() {
		nBall++;
		meeps[nPlayer].ay = 0;
		meeps[nPlayer].visible = true;
		meeps[nPlayer].isActive = true;

		if (nBall > 0) {
			anim.isActive = true;
			anim.sy = length - 3;
			$(anim).animate({ sy: 0 });
		}

		hud.initRound(nBall, 2, 'Ball ' + (nBall + 1));

		stage.timeout(function () {
			hud.finiBanner();
		}, 2000);

		stage.timeout(function () {
			anim.isActive = false;
			hud.initTimer(5, initBallRoll);
		}, 3000);
	}

	function initBallRoll() {
		self.speed = 0.1;
		hud.finiTimer();
		audio.play('roll');
	}

	function finiBallRoll() {
		audio.stop('roll');

		if (nPlayer === -1) return;

		if (nBall < (BALLS_PER_TURN - 1)) stage.timeout(initNextBall, 2000);
		else if (meeps[nPlayer + 1]) stage.timeout(initNextPlayer, 2000);
		else stage.timeout(initNextRound, 2000);
	}

	function finiGame() {
		audio.stop('music');
		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;

		const rewards = scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 5000);
	}

	self.speed = 0;
	function step() {

		let sy = 0;

		for (const m of meeps) {
			if (m.isActive) {
				m.ay += self.speed;
				if (m.ay > length && self.speed) {
					self.speed = 0;
					stage.timeout(finiBallRoll);
				}
				sy = Math.min(m.ay, length - 3);

				for (const pin of pins) {

					if (pin.isActive) {
						const dx = pin.x - m.px;
						const dy = pin.y - (m.ay + m.py);
						const d = Math.sqrt(dx * dx + dy * dy);

						if (d < 0.15) {
							pin.initHit(dx);
							m.addScore();
						}
					}
				}
			}
		}

		for (const m of meeps) m.redraw();

		if (anim.isActive) sy = anim.sy;

		scrollSy = sy;

		hud.updatePlayers(meeps);
	}

	self.draw = function (ctx) {
		drawBackground(ctx);
		if (showGlass) art.glass(ctx);

		// The lane: its near edge (scrollSy lanes towards the room) is
		// below the wall, its far end `length` lanes beyond that.
		const near = scrollSy * W;
		const far = near - length * W;
		const edge = Math.min(near, 200);
		art.poly(ctx, [project(0, far), project(W, far), project(W, edge), project(0, edge)], { fill: '#056479' });

		// Shadows lying on it, in the old page order.
		for (const m of meeps) if (m.visible) m.drawShadow(ctx, near - m.bottom);
		for (const p of pins) p.drawShadow(ctx, near - p.y * W);

		// Everything standing on it, back to front.
		const items = [
			{ lx: W / 2, ly: far + 500, draw: drawHole },
			{ lx: W / 2, ly: far, draw: drawWall },
		];
		for (const m of meeps) if (m.visible) items.push({ lx: m.left, ly: near - m.bottom, draw: m.drawBall });
		for (const p of pins) items.push({ lx: p.x * W, ly: near - p.y * W + 200, draw: p.drawBody });
		items.sort((a, b) => a.ly - b.ly);
		for (const it of items) standing(ctx, it.lx, it.ly, it.draw);
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].px = (p[m].px);
			meeps[m].py = (p[m].pz);
		}
	};

	const interval = stage.interval(step, 1000 / FPS);
});
