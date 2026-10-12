/*
 * Stubble Trouble
 *
 * A barber's race on the front wall. Players take turns in pairs: their
 * hairy avatars hop in, a card drops in between them showing the style to
 * cut, then the faces tip back and for 20 seconds each player moves about the
 * room to steer a shaver over their own face. Every hair shaved where the
 * card keeps one, or left where the card has none, costs a point off 100.
 *
 * The old game was a CSS 3D scene: the whole room in perspective, faces that
 * tip back, shavers standing out of them. Here the same transforms are
 * composed as DOMMatrix values and every point projected by hand.
 *
 * Input: px (left / right moves the shaver across the face), pz (towards /
 * away from the front wall moves it down / up).
 */
IGB.register('stubble-trouble', function StubbleTroubleGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const PLAYER_COUNT = 6;
	const GRIDSIZE = 15;
	const ROUND_TIME = 20;

	const BG = 'assets/shared/bg-box-factory.png';

	const UNTOUCHED = [
		"      00000000      ",
		"    000000000000    ",
		"  0000000000000000  ",
		"  0000000000000000  ",
		" 00     000000   00 ",
		"00       000      00",
		"00        00      00",
		"00          0     00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00   0000000000   00",
		"00 00000000000000 00",
		"0000            0000",
		"000              000",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00       00       00",
		" 00     0000     00 ",
		" 000000000000000000 ",
		"  0000000000000000  ",
		"    000000000000    ",
		"       000000       ",
	];

	const BALD_BEARD = [
		"      XXXXXXXX      ",
		"    XXXXXXXXXXXX    ",
		"  XXXXXXXXXXXXXXXX  ",
		"  XXXXXXXXXXXXXXXX  ",
		" XX     XXXXXX   XX ",
		"XX       XXX      XX",
		"XX        XX      XX",
		"XX          X     XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX   0000000000   XX",
		"XX 00000000000000 XX",
		"X000            000X",
		"000              000",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00       00       00",
		" 00     0000     00 ",
		" 000000000000000000 ",
		"  0000000000000000  ",
		"    000000000000    ",
		"       000000       ",
	];

	const CLEAN_SHAVEN = [
		"      00000000      ",
		"    000000000000    ",
		"  0000000000000000  ",
		"  0000000000000000  ",
		" 00     000000   00 ",
		"00       000      00",
		"00        00      00",
		"00          0     00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00   XXXXXXXXXX   00",
		"00 XXXXXXXXXXXXXX 00",
		"0XXX            XXX0",
		"XXX              XXX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX       XX       XX",
		" XX     XXXX     XX ",
		" XXXXXXXXXXXXXXXXXX ",
		"  XXXXXXXXXXXXXXXX  ",
		"    XXXXXXXXXXXX    ",
		"       XXXXXX       ",
	];

	const HANDLEBAR = [
		"      00000000      ",
		"    000000000000    ",
		"  0000000000000000  ",
		"  0000000000000000  ",
		" 00     000000   00 ",
		"00       000      00",
		"XX        00      XX",
		"XX          0     XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX   0000000000   XX",
		"XX 00000000000000 XX",
		"X000            000X",
		"000              000",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00       XX       00",
		" XX     XXXX     XX ",
		" XXXXXXXXXXXXXXXXXX ",
		"  XXXXXXXXXXXXXXXX  ",
		"    XXXXXXXXXXXX    ",
		"       XXXXXX       ",
	];

	const MONK = [
		"      XXXXXXXX      ",
		"    XXXXXXXXXXXX    ",
		"  XXXXXXXXXXXXXXXX  ",
		"  XXXXXXXXXXXXXXXX  ",
		" XX     XXXXXX   XX ",
		"XX       XXX      XX",
		"00        XX      00",
		"00          X     00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00   XXXXXXXXXX   00",
		"00 XXXXXXXXXXXXXX 00",
		"0XXX            XXX0",
		"XXX              XXX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX       00       XX",
		" 00     0000     00 ",
		" 000000000000000000 ",
		"  0000000000000000  ",
		"    000000000000    ",
		"       000000       ",
	];

	const STRIPE = [
		"      0XXXXXX0      ",
		"    000XXXXXX000    ",
		"  00000XXXXXX00000  ",
		"  00000XXXXXX00000  ",
		" 00     XXXXXX   00 ",
		"00       XXX      00",
		"00        XX      00",
		"00          X     00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00   00XXXXXX00   00",
		"00 0000XXXXXX0000 00",
		"0000            0000",
		"000              000",
		"00                00",
		"00                00",
		"00                00",
		"00                00",
		"00       XX       00",
		" 00     XXXX     00 ",
		" 000000XXXXXX000000 ",
		"  00000XXXXXX00000  ",
		"    000XXXXXX000    ",
		"       XXXXXX       ",
	];

	const STRIPE_INVERSE = [
		"      X000000X      ",
		"    XXX000000XXX    ",
		"  XXXXX000000XXXXX  ",
		"  XXXXX000000XXXXX  ",
		" XX     000000   XX ",
		"XX       000      XX",
		"XX        00      XX",
		"XX          0     XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX   XX000000XX   XX",
		"XX XXXX000000XXXX XX",
		"XXXX            XXXX",
		"XXX              XXX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX                XX",
		"XX       00       XX",
		" XX     0000     XX ",
		" XXXXXX000000XXXXXX ",
		"  XXXXX000000XXXXX  ",
		"    XXX000000XXX    ",
		"       000000       ",
	];

	const PATTERNS = [
		BALD_BEARD,
		HANDLEBAR,
		STRIPE,
		CLEAN_SHAVEN,
		MONK,
		STRIPE_INVERSE,
	];

	const ROUNDS = [
		undefined,
		undefined,
		[
			[[0, 1]],
			[[0, 1]],
			[[0, 1]],
		],
		[
			[[0, 1], [1, 2], [0, 2]],
			[[0, 1], [1, 2], [0, 2]],
		],
		[
			[[0, 1], [2, 3]],
			[[0, 1], [2, 3]],
		],
		[
			[[0, 1], [2, 3], [4, 0], [1, 2], [3, 4]],
		],
		[
			[[0, 1], [2, 3], [4, 5]],
			[[0, 1], [2, 3], [4, 5]],
		],
	];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-creative.mp3', 0.3, true);
	audio.add('shaver', 'assets/stubble-trouble/sfx-shaver.mp3', 0, true);
	audio.add('sequence', 'assets/shared/sfx-sequence.mp3', 0.3);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);

	/* ---------- the 3D scene ---------- */

	// The old room had `perspective: 1600px` looking at its middle. Every
	// transform below is the CSS one, composed left to right as CSS does.
	const PERSPECTIVE = (function () {
		const p = new DOMMatrix();
		p.m34 = -1 / W;
		return new DOMMatrix().translate(IGB.WIDTH / 2, H / 2).multiply(p).translate(-IGB.WIDTH / 2, -H / 2);
	})();

	const rotateX = (m, deg) => m.rotateAxisAngle(1, 0, 0, deg);
	const rotateZ = (m, deg) => m.rotateAxisAngle(0, 0, 1, deg);

	// Where a point (x, y) of an element's own flat plane lands on the walls.
	function projector(m) {
		const { m11, m12, m14, m21, m22, m24, m41, m42, m44 } = m;
		return function (x, y) {
			const w = m14 * x + m24 * y + m44;
			return [(m11 * x + m21 * y + m41) / w, (m12 * x + m22 * y + m42) / w];
		};
	}

	function fillPoints(ctx, points, fill, alpha) {
		ctx.save();
		if (alpha !== undefined) ctx.globalAlpha *= alpha;
		ctx.beginPath();
		points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.restore();
	}

	// The outline of a CSS rounded box as points, to be projected.
	function roundRectPoints(x, y, w, h, radii, n = 12) {
		const r = art.fitRadii(w, h, radii);
		const points = [];
		const corner = (cx, cy, c, a0) => {
			if (!(c.x > 0 && c.y > 0)) { points.push([cx, cy]); return; }
			for (let i = 0; i <= n; i++) {
				const a = a0 + (i / n) * Math.PI / 2;
				points.push([cx + c.x * Math.cos(a), cy + c.y * Math.sin(a)]);
			}
		};
		corner(x + r[0].x, y + r[0].y, r[0], Math.PI);
		corner(x + w - r[1].x, y + r[1].y, r[1], Math.PI * 1.5);
		corner(x + w - r[2].x, y + h - r[2].y, r[2], 0);
		corner(x + r[3].x, y + h - r[3].y, r[3], Math.PI / 2);
		return points;
	}

	const project = (m, points) => { const p = projector(m); return points.map((q) => p(q[0], q[1])); };

	/* ---------- a face: 20 x 30 cells of hair ---------- */

	const FACE_W = 300;
	const FACE_H = 450;
	const SKIN = '#687078';
	const FACE = roundRectPoints(0, 0, FACE_W, FACE_H, 240, 24);
	const EYE_L = roundRectPoints(84, 171, 30, 55, { x: 15, y: 27.5 }, 8);
	const EYE_R = roundRectPoints(186, 171, 30, 55, { x: 15, y: 27.5 }, 8);
	const MOUTH = roundRectPoints(115, 293, 70, 40, [0, 0, { x: 70, y: 40 }, { x: 70, y: 40 }], 10);

	// A hair is a circle 1.4 cells across (the 102% box with a -20% inset).
	const HAIR_R = GRIDSIZE * 1.02 * 1.4 / 2;
	const HAIR_SIDES = 16;
	const COS = [];
	const SIN = [];
	for (let i = 0; i < HAIR_SIDES; i++) {
		COS[i] = Math.cos(i / HAIR_SIDES * Math.PI * 2);
		SIN[i] = Math.sin(i / HAIR_SIDES * Math.PI * 2);
	}

	const COLORS = ['red', 'blue', '#33CD32', '#DD00FF', '#FF6600', '#FFBB00'];

	// The shaver, standing out of the face: a handle with a rounded top and a
	// black right edge, a white head where it meets the skin, and its shadow
	// lying on the face.
	const SHAVER = roundRectPoints(-15, -180, 30, 180, [15, 15, 0, 0], 6);
	const SHAVER_FILL = roundRectPoints(-15, -180, 25, 180, [15, { x: 10, y: 15 }, 0, 0], 6);
	const HEAD = roundRectPoints(-25, -20, 45, 20, [{ x: 45, y: 20 }, { x: 45, y: 20 }, 0, 0], 8);
	const HEAD_FILL = roundRectPoints(-20, -15, 35, 10, [{ x: 17.5, y: 5 }, { x: 17.5, y: 5 }, 0, 0], 8);

	function drawHand(ctx, m, n) {
		const shadow = rotateZ(rotateX(m.translate(10, 0), 90), 20).translate(-10, 0);
		const ps = projector(shadow);
		const a = ps(-2.5, 0);
		const b = ps(-2.5, -180);
		fillPoints(ctx, [ps(-15, -180), ps(10, -180), ps(10, 0), ps(-15, 0)],
			art.linear(ctx, a[0], a[1], b[0], b[1], ['black', 'rgba(0,0,0,0)']), 0.5);

		fillPoints(ctx, project(m, SHAVER), 'black');
		fillPoints(ctx, project(m, SHAVER_FILL), COLORS[n] || 'red');
		fillPoints(ctx, project(m, HEAD), 'black');
		fillPoints(ctx, project(m, HEAD_FILL), 'white');
	}

	let cntShaver = 0;

	const FollicleGuide = function (MAP) {
		const self = this;
		self.top = 0;

		const face = new FollicleFace(MAP);

		self.draw = function (ctx) {
			// A card 340 square, centred on (middle, top), tipped 5 degrees.
			art.with(ctx, { x: IGB.WIDTH / 2, y: self.top, rotate: -5 }, function () {
				art.rect(ctx, -170, -170, 340, 340, { fill: 'white', shadow: { color: 'black', blur: 20, y: 5 } });
				art.rect(ctx, -150, -150, 300, 300, { fill: '#ddd' });
			});
			const m = rotateZ(PERSPECTIVE.translate(IGB.WIDTH / 2, self.top), -5).translate(-FACE_W / 4, -FACE_H / 4).scale(0.5, 0.5, 1);
			face.draw(ctx, m, 'gray');
		};
	};

	const FollicleFace = function (MAP, isUnshaved = false) {

		const self = this;
		self.pw = (GRIDSIZE * MAP[0].length) / W;
		self.top = 0;

		const state = [];
		const goal = [];
		const hairs = [];
		const grid = [];

		for (var y = 0; y < MAP.length; y++) {
			state[y] = [];
			goal[y] = [];
			grid[y] = [];
			for (var x = 0; x < MAP[y].length; x++) {

				state[y][x] = goal[y][x] = (MAP[y][x] == '0');

				if (isUnshaved) state[y][x] = (MAP[y][x] != ' ');

				if (state[y][x]) {
					const tx = -2 + Math.random() * 4;
					const ty = -2 + Math.random() * 4;
					grid[y][x] = { x: x * GRIDSIZE + GRIDSIZE * 0.51 + tx, y: y * GRIDSIZE + GRIDSIZE * 0.51 + ty, left: 0, top: 0 };
					hairs.push(grid[y][x]);
				}
			}
		}

		self.shaveAt = function (ox, oy) {
			let gx = (ox * W) / GRIDSIZE;
			let gy = (oy * H) / GRIDSIZE - 3;

			for (var y = 0; y < MAP.length; y++) {
				for (var x = 0; x < MAP[y].length; x++) {
					let dx = Math.abs(gx - x);
					let dy = Math.abs(gy - y);
					let d = Math.sqrt(dx * dx + dy * dy);
					if (d < 2.5) {
						if (state[y][x]) {
							state[y][x] = false;
							let rx = -100 + Math.random() * 200;
							$(grid[y][x]).animate({ top: -50, left: rx * 0.1 }, 200).animate({ top: 1000, left: rx }, 1000);
							cntShaver = FPS / 2;
						}
					}
				}
			}
		};

		self.evaluate = function () {

			let cntCorrect = 0;
			let cntIncorrect = 0;

			for (var y in goal) {
				for (var x in goal[y]) {
					if (goal[y][x] != MAP[y][x] || state[y][x] != MAP[y][x]) {
						//state is (or should be) different
						if (goal[y][x] == state[y][x]) cntCorrect++;
						else cntIncorrect++;
					}
				}
			}

			return Math.max(0, 100 - cntIncorrect);
		};

		// m maps the face's own 300 x 450 box onto the walls.
		self.draw = function (ctx, m, color) {
			const p = projector(m);
			fillPoints(ctx, FACE.map((q) => p(q[0], q[1])), 'white');
			fillPoints(ctx, EYE_L.map((q) => p(q[0], q[1])), SKIN);
			fillPoints(ctx, EYE_R.map((q) => p(q[0], q[1])), SKIN);
			fillPoints(ctx, MOUTH.map((q) => p(q[0], q[1])), SKIN);

			// Every hair, shaved ones still falling too, as one shape: each
			// circle mapped through the perspective at its own centre.
			ctx.beginPath();
			for (const h of hairs) {
				const cx = h.x + h.left;
				const cy = h.y + h.top;
				const c = p(cx, cy);
				const u = p(cx + HAIR_R, cy);
				const v = p(cx, cy + HAIR_R);
				const ux = u[0] - c[0], uy = u[1] - c[1];
				const vx = v[0] - c[0], vy = v[1] - c[1];
				ctx.moveTo(c[0] + ux, c[1] + uy);
				for (let i = 1; i < HAIR_SIDES; i++) {
					ctx.lineTo(c[0] + ux * COS[i] + vx * SIN[i], c[1] + uy * COS[i] + vy * SIN[i]);
				}
				ctx.closePath();
			}
			ctx.fillStyle = color;
			ctx.fill();
		};
	};

	/* ---------- a player's avatar ---------- */

	const FollicleMeep = function (n, MAP) {

		const self = this;
		self.score = 0;
		self.n = n;
		self.ax = 0.5;
		self.ay = 0.5;
		self.oy = 0;
		self.isEnabled = false;

		// Where redraw() last put it: the top-left of its 300 x 450 box.
		self.left = 0;
		self.top = 0;

		// The CSS transitions: scale 1s, the face's tilt and the body's
		// lift 0.5s.
		self.zoom = { v: 0.7 };
		self.tilt = { v: 0 };
		self.lift = { v: 0 };
		self.isForeground = false;

		self.body = { top: 1 };   // fraction of the face's height
		let scoreText = '';

		const face = new FollicleFace(MAP, true);
		self.face = face;

		const hand = { left: 0, top: 0, visible: false };

		function transition(o, v, duration) {
			$(o).stop(true).animate({ v: v }, { duration: duration, easing: 'ease' });
		}

		self.redraw = function () {

			self.left = W * self.wall + self.ax * W;
			self.top = (self.ay + self.oy) * H;

			if (self.wall == 1 && self.isEnabled) {
				let ox = self.player.px - self.ax;
				let oy = self.player.py - self.ay;

				// resist moving too far from face
				if (ox > 0.24) ox = 0.24 + (ox - 0.24) * 0.3;
				if (ox < -0.08) ox = -0.08 + (ox + 0.08) * 0.3;

				// Before the tracker reports these are NaN, which jQuery's
				// .css() ignored, leaving the hand where it was.
				if (!isNaN(ox)) hand.left = ox * W;
				if (!isNaN(oy)) hand.top = oy * H;

				face.shaveAt(ox, oy);
			}
		};

		self.toForeground = function (b) {
			if (b) {
				setForeground(true);
				self.setEnabled(true);
				self.finiHop();
			} else {
				setForeground(false);
				self.setEnabled(false);
			}
		};

		function setForeground(b) {
			if (b === self.isForeground) return;
			self.isForeground = b;
			transition(self.zoom, b ? 1 : 0.7, 1000);
			transition(self.tilt, b ? 45 : 0, 500);
			transition(self.lift, b ? -50 : 0, 500);
		}

		self.setScale = function (scale) {
			transition(self.zoom, scale, 1000);
		};

		self.evaluate = function () {
			self.amt = face.evaluate();

			$({ amt: 0 }).animate({ amt: self.amt }, { duration: 1000, step: function (a) {
				scoreText = Math.floor(a) + '%';
				self.player.score = self.player.tally + Math.floor(a);
			} });
		};

		self.setEnabled = function (b) {
			self.isEnabled = b;
			hand.visible = b;
		};

		self.bindPlayer = function (player) {
			self.player = player;
		};

		self.finiHop = function () {
			$(self.body).stop(true, false).animate({ top: 1 });
			$(face).stop(true, false).animate({ top: 0 });
		};

		self.initHop = function () {

			$(self.body).animate({
				top: 1.05,
			}, 100).animate({
				top: 1,
			}, 100);

			$(face).animate({
				top: 50,
			}, 100).animate({
				top: 0,
			}, {
				duration: 100,
				complete: function () {
					self.initHop();
				},
			});
		};

		// Stop everything still animating, once it has left the scene.
		self.halt = function () {
			$(self.body).stop(true, false);
			$(face).stop(true, false);
		};

		self.draw = function (ctx) {
			const m = PERSPECTIVE.translate(self.left, self.top).translate(FACE_W / 2, 0)
				.scale(self.zoom.v, self.zoom.v, 1).translate(-FACE_W / 2, 0);

			// Body, legs and score sit flat in the avatar's own plane.
			ctx.save();
			ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
			const bodyTop = self.body.top * FACE_H + self.lift.v;
			art.roundRect(ctx, 60, bodyTop, 180, FACE_H * 0.25, { x: 180 * 0.35, y: FACE_H * 0.25 * 0.35 }, { fill: 'white' });
			art.rect(ctx, 75, FACE_H * 1.2 + self.lift.v, 30, FACE_H, { fill: 'white' });
			art.rect(ctx, 195, FACE_H * 1.2 + self.lift.v, 30, FACE_H, { fill: 'white' });
			if (scoreText) {
				art.text(ctx, scoreText, FACE_W / 2, -100, {
					size: 100, font: 'Rubik', weight: 600, fill: 'white',
					shadow: { color: '#00050C', blur: 50 },
				});
			}
			ctx.restore();

			// The face tips back about its centre.
			const mf = rotateX(m.translate(0, face.top).translate(FACE_W / 2, FACE_H / 2), self.tilt.v)
				.translate(-FACE_W / 2, -FACE_H / 2);
			face.draw(ctx, mf, COLORS[n] || 'gray');

			// The hand stands up out of the face.
			if (hand.visible) drawHand(ctx, rotateX(mf.translate(hand.left, hand.top), -90), n);
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	// What is drawn, in the old page's DOM order.
	const scene = [];
	const remove = (item) => { const i = scene.indexOf(item); if (i >= 0) scene.splice(i, 1); };
	const everyMeep = [];
	let showBlur = true;

	let players = [];
	function initGame(count) {

		audio.play('shaver');

		for (let i = 0; i < count; i++) {
			players[i] = { score: 0, tally: 0 };
		}

		stage.timeout(initTutorial, 1000);
	}

	let meeps = [];
	let guide;
	let nPattern = -1;
	let iCohort = -1;
	let iRound = 0;

	function initTutorial() {

		hud.initTutorial('Stubble Trouble',
			{ x: 1.25, y: 0.45, msg: 'Align yourself<br>with your Avatar', icon: 'align' },
			{ x: 1.75, y: 0.45, msg: 'Move around<br>to shave your face', icon: 'around' },
		);

		for (var p in players) {
			meeps[p] = new FollicleMeep(p, UNTOUCHED);
			meeps[p].bindPlayer(players[p]);
			meeps[p].wall = 1;
			meeps[p].ax = 0.08 + 0.65 * (1 / (players.length - 1)) * p;
			meeps[p].ay = 0.3;
			meeps[p].oy = 0.3;

			scene.push(meeps[p]);
			everyMeep.push(meeps[p]);

			meeps[p].redraw();
			meeps[p].setEnabled(true);
			meeps[p].setScale(0.5);
		}

		hud.initTimer(20, finiTutorial);
	}

	function finiTutorial() {
		showBlur = false;
		hud.finiTutorial();
		hud.finiTimer();

		for (var m in meeps) {
			meeps[m].score = 0;
			remove(meeps[m]);
			meeps[m].halt();
		}

		meeps.length = 0;
		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		hud.initPlayers(players);
		stage.timeout(initNextCohort, 1000);
	}

	function initNextCohort() {
		iCohort++;
		nPattern++;

		if (!ROUNDS[players.length][iRound][iCohort]) {
			iCohort = 0;
			iRound++;
		}

		if (!ROUNDS[players.length][iRound]) {
			finiGame();
			return;
		}

		audio.play('music');

		for (var p in players) players[p].tally = players[p].score;

		let cohort = ROUNDS[players.length][iRound][iCohort];

		let delay = 0;

		if (iCohort == 0) {

			delay = 3000;
			stage.timeout(function () {
				hud.initRound(iRound, ROUNDS[players.length].length);
			}, 0);

			stage.timeout(function () {
				hud.finiBanner();
			}, 2000);
		}

		guide = new FollicleGuide(PATTERNS[nPattern]);
		scene.push(guide);
		guide.top = -0.25 * H;
		$(guide).delay(delay).animate({
			top: 0.3 * H,
		});

		for (let c in cohort) {
			// The pair before has walked off the right wall by now.
			if (meeps[c]) { remove(meeps[c]); meeps[c].halt(); }

			meeps[c] = new FollicleMeep(cohort[c], PATTERNS[nPattern]);
			meeps[c].bindPlayer(players[cohort[c]]);
			meeps[c].wall = 1;
			meeps[c].ax = 0.75 - 0.5 * c - 0.1 - 2;
			meeps[c].ay = 0.3;
			scene.push(meeps[c]);
			everyMeep.push(meeps[c]);
			meeps[c].redraw();
			stage.timeout(meeps[c].initHop, c * 50);

			$(meeps[c]).delay(delay).animate({
				ax: 0.7 - 0.4 * c - 0.1,
			}, 2000);
		}

		stage.timeout(function () {
			hud.summonPlayers(cohort);
		}, delay + 500);

		stage.timeout(function () {
			hud.finiBanner();
			for (var m in meeps) meeps[m].finiHop();
		}, delay + 2500);

		stage.timeout(function () {
			hud.initTimer(ROUND_TIME, finiRound);
			for (var m in meeps) meeps[m].toForeground(true);
		}, delay + 3500);
	}

	function finiRound() {

		hud.finiTimer();

		audio.play('sequence', true);

		for (var m in meeps) {
			meeps[m].evaluate();
			meeps[m].setEnabled(false);
		}

		stage.timeout(function () {
			audio.play('correct', true);
		}, 1000);

		stage.timeout(function () {

			// Back on top of the avatars, the card flies off the top.
			const g = guide;
			remove(g);
			scene.push(g);
			g.top = 0.3 * H;
			$(g).animate({
				top: -0.25 * H,
			}, {
				complete: function () { remove(g); },
			});

			for (var m in meeps) {
				meeps[m].toForeground(false);
				stage.timeout(meeps[m].initHop, m * 50);

				$(meeps[m]).animate({
					ax: 0.75 - 0.5 * m - 0.1 + 2,
				}, 2000);
			}

		}, 3000);

		stage.timeout(initNextCohort, 5000);
	}

	function finiGame() {

		audio.stop('music');
		let scores = [];

		for (var p in players) scores[p] = players[p].score;

		let rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 5000);
	}

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function step() {
		cntShaver--;
		if (cntShaver < 0) cntShaver = 0;

		for (var m in meeps) meeps[m].redraw();

		audio.setVolume('shaver', cntShaver / FPS);

		hud.updatePlayers(players);
	}

	const interval = stage.interval(step, 1000 / FPS);

	self.draw = function (ctx) {
		// One factory picture stretched across all three walls, purple
		// rising from the floor.
		art.image(ctx, BG, 0, 0, IGB.WIDTH, H);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#7443ba', 'rgba(116,67,186,0)']) });
		if (showBlur) art.glass(ctx);
		for (const item of scene) item.draw(ctx);
	};

	self.setPlayers = function (p) {
		for (var m in players) {
			players[m].px = p[m].px;
			players[m].py = (1 - p[m].pz);
		}
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
		for (const m of everyMeep) m.halt();
	};
});
