/*
 * Cookie Cutter
 *
 * A wooden board lies on the front wall, tilted back, with a giant cookie
 * cutter hanging over it. Each stamp the cutter drops into view and its
 * shadow shows where the holes will land; players move around the box to
 * stand under a hole before it comes down. Anyone under the solid part is
 * squished. Each stamp scores a point for every meep in the cohort except
 * those it squishes (one squished earlier keeps scoring while hidden, as
 * in the original); a cohort ends when its levels run out or nobody is
 * left standing.
 *
 * The old game was a CSS 3D scene: the board tilted with rotateX(70deg),
 * the cutter a parallel plane above it, the meeps standing up on the board.
 * Here the projection is done by hand, as in the-claw. The board and the
 * cutter are painted flat into buffers and laid onto the screen in
 * perspective one device-pixel row at a time. Each meep is painted into its
 * own upright buffer and laid down the same way, in two passes split at the
 * cutter's height, so whatever stands up through a hole is drawn over the
 * cutter and the rest is hidden under it.
 *
 * Input: x (left / right across the board), z (towards / away from the
 * front wall).
 */
IGB.register('cookie-cutter', function CookieCutterGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const CUTTER = 1500;
	const FPS = 20;

	const BG = 'assets/shared/bg-box-factory.png';
	const WOOD = 'assets/shared/texture-wood.png';

	function toArr(arr) {
		const path = [];
		for (let i = 0; i < arr.length / 2; i++) {
			path[i] = [arr[i * 2], arr[i * 2 + 1]];
		}
		return path;
	}

	const SHAPES = [];
	for (const s in SHAPE_LIBRARY) SHAPES[s] = toArr(SHAPE_LIBRARY[s]);

	function toPath(arr) {
		let d = '';
		for (let a = 0; a < arr.length; a++) d = d + (a === 0 ? 'M' : 'L') + (arr[a][0]) + ',' + (arr[a][1]);
		return d;
	}

	// One cutter: a CUTTER x CUTTER square with shapes cut out of it. path
	// is the square with every hole (fill it with the evenodd rule).
	const CookieComposition = function (...shapes) {
		const self = this;

		let d = `M0,0 L${CUTTER},0 L${CUTTER},${CUTTER} L0,${CUTTER}`;

		self.holes = [];

		function inside(point, vs, buffer = 0) {
			// ray-casting algorithm based on
			// https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html

			const x = point[0], y = point[1];

			let inside = false;
			for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
				const xi = vs[i][0], yi = vs[i][1];
				const xj = vs[j][0], yj = vs[j][1];

				const intersect = ((yi > y) !== (yj > y))
					&& (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
				if (intersect) inside = !inside;
			}

			// (never called with a buffer)
			if (inside && buffer > 0) {
				const dist = pointToPolygonDistance(point, vs);
				if (dist < buffer) inside = false;
			}

			return inside;
		}

		self.isInHole = function (x, y) {

			x = (x + W / 2) / W * CUTTER;
			y = (y + W / 2) / W * CUTTER;

			let b = false;
			for (const h in self.holes) if (inside([x, y], self.holes[h])) b = true;
			return b;
		};

		self.add = function (x, y, nShape, size) {

			size = CUTTER / 500 * size;

			x = x * CUTTER;
			y = y * CUTTER;

			const arr = [];

			for (const p in SHAPES[nShape]) {
				arr[p] = [
					SHAPES[nShape][p][0] * size + x,
					SHAPES[nShape][p][1] * size + y,
				];
			}

			self.holes.push(arr);

			const arrReverse = arr.concat().reverse();
			d = d + toPath(arrReverse);
		};

		for (const s in shapes) self.add(shapes[s].x, shapes[s].y, shapes[s].n, shapes[s].size);

		self.path = new Path2D(d);
	};

	const COMPOSITIONS = [

		new CookieComposition({ x: 0, y: 0, n: 1, size: 1 }), // star
		new CookieComposition({ x: 0, y: 0, n: 1, size: 0.5 }, { x: 0.5, y: 0.5, n: 1, size: 0.5 }), // stars
		new CookieComposition({ x: 0, y: 0, n: 10, size: 1 }), // heart
		new CookieComposition({ x: 0.5, y: 0, n: 1, size: 0.5 }, { x: 0, y: 0.5, n: 10, size: 0.5 }), // star and heart
		new CookieComposition({ x: 1 / 3, y: 0, n: 10, size: 1 / 3 }, { x: 0, y: 1 / 3, n: 10, size: 1 / 3 }, { x: 2 / 3, y: 1 / 3, n: 10, size: 1 / 3 }, { x: 1 / 3, y: 2 / 3, n: 10, size: 1 / 3 }), // hearts

		new CookieComposition({ x: 0, y: 0, n: 8, size: 1 }), // stair
		new CookieComposition({ x: 0, y: 0, n: 8, size: 0.5 }, { x: 0.5, y: 0.5, n: 8, size: 0.5 }), // stairs
		new CookieComposition({ x: 0, y: 0, n: 9, size: 1 }), // crescent
		new CookieComposition({ x: 1 / 3, y: 1 / 3, n: 9, size: 2 / 3 }, { x: 1 / 3, y: 1 / 3, n: 10, size: 1 / 3 }), // heart and crescent
		new CookieComposition({ x: 1 / 3, y: 0, n: 9, size: 1 / 3 }, { x: 0, y: 1 / 3, n: 8, size: 1 / 3 }, { x: 2 / 3, y: 1 / 3, n: 9, size: 1 / 3 }, { x: 1 / 3, y: 2 / 3, n: 8, size: 1 / 3 }), // stairs and crescent

		new CookieComposition({ x: 0, y: 0, n: 4, size: 1 }), // pentagon
		new CookieComposition({ x: 0, y: 0, n: 4, size: 0.5 }, { x: 0.5, y: 0.5, n: 1, size: 0.5 }), // pentagon and star
		new CookieComposition({ x: 0, y: 0, n: 3, size: 1 }), // spark
		new CookieComposition({ x: 0, y: 0, n: 3, size: 0.5 }, { x: 0.5, y: 0.5, n: 3, size: 0.5 }), // star and spark
		new CookieComposition({ x: 0, y: 0, n: 3, size: 1 / 3 }, { x: 2 / 3, y: 0, n: 4, size: 1 / 3 }, { x: 1 / 3, y: 1 / 3, n: 1, size: 1 / 3 }, { x: 0, y: 2 / 3, n: 4, size: 1 / 3 }, { x: 2 / 3, y: 2 / 3, n: 3, size: 1 / 3 }), // stars, sparks, and pentagons

		new CookieComposition({ x: 0, y: 0, n: 7, size: 1 }), // cross
		new CookieComposition({ x: 1 / 4, y: 0, n: 7, size: 1 / 2 }, { x: 1 / 4, y: 1 / 2, n: 7, size: 1 / 2 }), // crosses
		new CookieComposition({ x: 0, y: 0, n: 5, size: 1 }), // peanut
		new CookieComposition({ x: 0.5, y: 0, n: 5, size: 0.5 }, { x: 0.5, y: 0.5, n: 5, size: 0.5 }), // peanuts
		new CookieComposition({ x: 0, y: 0, n: 10, size: 1 / 3 }, { x: 2 / 3, y: 0, n: 10, size: 1 / 3 }, { x: 1 / 3, y: 1 / 3, n: 10, size: 1 / 3 }, { x: 0, y: 2 / 3, n: 10, size: 1 / 3 }, { x: 2 / 3, y: 2 / 3, n: 10, size: 1 / 3 }), // hearts

		new CookieComposition({ x: 0, y: 0, n: 6, size: 1 }), // tri-peanut
		new CookieComposition({ x: 0, y: 0, n: 6, size: 0.5 }, { x: 0, y: 0.5, n: 6, size: 0.5 }), // tri-peanuts
		new CookieComposition({ x: 0, y: 0, n: 11, size: 1 }), // face
		new CookieComposition({ x: 0, y: 1 / 4, n: 11, size: 1 / 2 }, { x: 1 / 2, y: 1 / 4, n: 11, size: 1 / 2 }), // faces
		new CookieComposition({ x: 1 / 3, y: 0, n: 1, size: 1 / 3 }, { x: 0, y: 1 / 3, n: 1, size: 1 / 3 }, { x: 2 / 3, y: 1 / 3, n: 1, size: 1 / 3 }, { x: 1 / 3, y: 2 / 3, n: 1, size: 1 / 3 }), // stars

	];

	const sets = [];
	for (let i = 0; i < 5; i++) {
		sets[i] = COMPOSITIONS.slice(i * 5, (i + 1) * 5);
	}

	const STRUCTURE = [
		undefined,
		undefined,
		[
			{ cohorts: [{ players: [0, 1], levels: sets[0], timeMax: 2000, timeMin: 1500 }] },
			{ cohorts: [{ players: [0, 1], levels: sets[1], timeMax: 1500, timeMin: 1000 }] },
			{ cohorts: [{ players: [0, 1], levels: sets[3], timeMax: 1000, timeMin: 500 }] },
			{ cohorts: [{ players: [0, 1], levels: sets[4], timeMax: 500, timeMin: 500 }] },
		],
		[
			{ cohorts: [{ players: [0, 1, 2], levels: sets[0], timeMax: 2000, timeMin: 1500 }] },
			{ cohorts: [{ players: [0, 1, 2], levels: sets[1], timeMax: 1500, timeMin: 1000 }] },
			{ cohorts: [{ players: [0, 1, 2], levels: sets[3], timeMax: 1000, timeMin: 500 }] },
			{ cohorts: [{ players: [0, 1, 2], levels: sets[4], timeMax: 500, timeMin: 500 }] },
		],
		[
			{ cohorts: [{ players: [0, 1, 2, 3], levels: sets[0], timeMax: 2000, timeMin: 1500 }] },
			{ cohorts: [{ players: [0, 1, 2, 3], levels: sets[1], timeMax: 1500, timeMin: 1000 }] },
			{ cohorts: [{ players: [0, 1, 2, 3], levels: sets[3], timeMax: 1000, timeMin: 500 }] },
			{ cohorts: [{ players: [0, 1, 2, 3], levels: sets[4], timeMax: 500, timeMin: 500 }] },
		],
		[
			{
				cohorts: [
					{ players: [0, 1, 2], levels: sets[0], timeMax: 1500, timeMin: 500 },
					{ players: [3, 4, 0], levels: sets[1], timeMax: 1500, timeMin: 500 },
					{ players: [1, 2, 3], levels: sets[2], timeMax: 1500, timeMin: 500 },
					{ players: [4, 0, 1], levels: sets[3], timeMax: 1500, timeMin: 500 },
					{ players: [2, 3, 4], levels: sets[4], timeMax: 1500, timeMin: 500 },
				],
			},
		],
		[
			{
				cohorts: [
					{ players: [0, 1, 2], levels: sets[0], timeMax: 1500, timeMin: 1000 },
					{ players: [3, 4, 5], levels: sets[1], timeMax: 1500, timeMin: 1000 },
				],
			},
			{
				cohorts: [
					{ players: [0, 2, 4], levels: sets[3], timeMax: 1000, timeMin: 500 },
					{ players: [1, 3, 5], levels: sets[4], timeMax: 1000, timeMin: 500 },
				],
			},
		],

	];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.3, true);
	audio.add('squish', 'assets/cookie-cutter/sfx-squish.mp3', 0.3);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.1);
	audio.add('woosh-long', 'assets/shared/sfx-woosh-long.mp3', 0.1);
	audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.3);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('correct-echo', 'assets/shared/sfx-correct-echo.mp3', 0.3);

	/* ---------- the camera ---------- */

	// CSS perspective W looking at the middle of the world. The board is
	// BOARD square, centred on the front wall, and tilts back 70 degrees
	// about its bottom edge, which sits 110 up from the bottom of the wall.
	const PERSPECTIVE = W;
	const EYE = { x: W * 1.5, y: H / 2 };
	const PIVOT = { x: W * 1.5, y: H - 110 };
	const BOARD = W;
	const TILT = 70 * Math.PI / 180;
	const cos = Math.cos(TILT);
	const sin = Math.sin(TILT);
	const RADIUS = 100;   // the board's and the cutter's corners
	const EDGE = 50;      // the board's solid shadow and the cutter's black bottom border

	// Where a point lands in the world: (u, v) across and down the board
	// (0..BOARD, v grows towards the front), h up from it. s is how much
	// things there are scaled by distance.
	function project(u, v, h) {
		const x = PIVOT.x - EYE.x + u - BOARD / 2;
		const y = PIVOT.y - EYE.y + cos * (v - BOARD) - sin * h;
		const z = sin * (v - BOARD) + cos * h;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + x * s, y: EYE.y + y * s, s };
	}

	// The row v of the plane h above the board that lands on world row y.
	function rowAt(y, h) {
		const t = y - EYE.y;
		const y0 = PIVOT.y - EYE.y - sin * h;
		return BOARD + (t * (PERSPECTIVE - cos * h) - PERSPECTIVE * y0) / (PERSPECTIVE * cos + t * sin);
	}

	// The height on the upright plane standing at row v that lands on world row y.
	function heightAt(y, v) {
		const t = y - EYE.y;
		const a = PIVOT.y - EYE.y + cos * (v - BOARD);
		const d = PERSPECTIVE - sin * (v - BOARD);
		return (PERSPECTIVE * a - t * d) / (PERSPECTIVE * sin - t * cos);
	}

	// Lay a flat buffer (u 0..surface.w, v 0..surface.h) onto the plane h
	// above the board. Each row of a plane parallel to the board lands on one
	// row of the screen, scaled about the middle, so it goes down a device
	// pixel row at a time.
	function layFlat(ctx, surface, h) {
		const ky = ctx.getTransform().d;
		const kb = surface.canvas.height / surface.h;
		const a = project(0, 0, h).y;
		const b = project(0, surface.h, h).y;
		const top = Math.max(0, Math.min(a, b));
		const bottom = Math.min(H, Math.max(a, b));
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			let v0 = rowAt(j / ky, h);
			let v1 = rowAt((j + 1) / ky, h);
			if (v0 > v1) [v0, v1] = [v1, v0];
			v0 = Math.max(0, v0);
			v1 = Math.min(surface.h, v1);
			if (!(v1 > v0)) continue;
			const p0 = project(0, v0, h);
			const p1 = project(0, v1, h);
			const s = project(0, (v0 + v1) / 2, h).s;
			ctx.drawImage(surface.canvas,
				0, v0 * kb, surface.canvas.width, (v1 - v0) * kb,
				EYE.x + (PIVOT.x - EYE.x - BOARD / 2) * s, Math.min(p0.y, p1.y), surface.w * s, Math.abs(p1.y - p0.y));
		}
	}

	// Lay an upright buffer standing on the board at (u, v), facing the
	// front: it spans surface.w across, centred on u, and its bottom row is
	// on the board. Only the heights from lo to hi are drawn.
	function layUpright(ctx, surface, u, v, lo, hi) {
		lo = Math.max(0, lo);
		hi = Math.min(surface.h, hi);
		if (!(hi > lo)) return;
		const ky = ctx.getTransform().d;
		const kb = surface.canvas.height / surface.h;
		const top = Math.max(0, project(u, v, hi).y);
		const bottom = Math.min(H, project(u, v, lo).y);
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const h0 = Math.max(lo, heightAt((j + 1) / ky, v));
			const h1 = Math.min(hi, heightAt(j / ky, v));
			if (!(h1 > h0)) continue;
			const p0 = project(u, v, h0);
			const p1 = project(u, v, h1);
			const s = project(u, v, (h0 + h1) / 2).s;
			ctx.drawImage(surface.canvas,
				0, (surface.h - h1) * kb, surface.canvas.width, (h1 - h0) * kb,
				EYE.x + (PIVOT.x - EYE.x + u - surface.w / 2 - BOARD / 2) * s, p1.y, surface.w * s, p0.y - p1.y);
		}
	}

	/* ---------- the board, the cutter and its shadow ---------- */

	// The cutter hangs `z` above the board; its shadow darkens the board.
	// Both ease to each new setting over half a second, like the CSS
	// transitions they were. composition is the cutter they show, if any.
	const stamper = { z: H, composition: null };
	const shadow = { opacity: 0, composition: null };

	function transition(obj, props) {
		$(obj).stop(true).animate(props, { duration: 500, easing: 'ease' });
	}

	const board = stage.surface(BOARD, BOARD + EDGE);
	const cutter = stage.surface(BOARD, BOARD + EDGE);
	let cutterShows; // the composition painted into the cutter buffer, or undefined to repaint
	const unlisten = IGB.onResize(function () { cutterShows = undefined; });

	// The wooden board with its solid shadow 50 to the front, and the
	// cutter's shadow: the board's square minus the holes, in black.
	function paintBoard() {
		const f = board.ctx;
		board.clear();
		art.roundRect(f, 0, EDGE, BOARD, BOARD, RADIUS, { fill: '#422a23' });
		f.save();
		f.beginPath();
		art.roundRectPath(f, 0, 0, BOARD, BOARD, RADIUS);
		f.clip();
		art.tile(f, WOOD, 0, 0, BOARD, BOARD);
		if (shadow.composition && shadow.opacity > 0) {
			f.globalAlpha = shadow.opacity;
			f.scale(BOARD / CUTTER, BOARD / CUTTER);
			f.fillStyle = 'black';
			f.fill(shadow.composition.path, 'evenodd');
		}
		f.restore();
	}

	// The cutter: a white glow just inside its edges, the light grey cutter
	// with its holes over that, and a 50 black border along the bottom.
	function paintCutter() {
		const shows = stamper.composition || 'empty';
		if (cutterShows === shows) return;
		cutterShows = shows;

		const f = cutter.ctx;
		cutter.clear();
		const inner = (c) => art.roundRectPath(c, 0, 0, BOARD, BOARD, [RADIUS, RADIUS, { x: RADIUS, y: RADIUS - EDGE }, { x: RADIUS, y: RADIUS - EDGE }]);

		art.inset(f, inner, { color: 'white', blur: 100 });

		if (stamper.composition) {
			f.save();
			f.beginPath();
			inner(f);
			f.clip();
			f.scale(BOARD / CUTTER, BOARD / CUTTER);
			f.fillStyle = '#ddd';
			f.fill(stamper.composition.path, 'evenodd');
			f.restore();
		}

		f.save();
		f.beginPath();
		art.roundRectPath(f, 0, 0, BOARD, BOARD + EDGE, RADIUS);
		inner(f);
		f.fillStyle = 'black';
		f.fill('evenodd');
		f.restore();
	}

	/* ---------- a player ---------- */

	// The "+1" layer, shared: painted at full strength, then faded as one
	// piece the way CSS opacity fades text and its shadows together.
	const LABEL = { w: 200, h: 150 };
	const labelBuffer = stage.surface(LABEL.w, LABEL.h);

	const CookieMeep = function (n) {
		const self = this;

		self.score = 0;
		self.visible = true;

		// Where the meep stands, as the CSS left / top from the board's
		// centre that step() last set.
		self.left = 0;
		self.top = 0;

		const meep = new Meep(n);
		meep.scale = 0.8;

		// The upright plane the meep stands in, its bottom row on the board.
		self.buffer = stage.surface(300, 500);
		meep.x = self.buffer.w / 2;
		meep.y = self.buffer.h;

		// The "+1": its box is 100 tall with its bottom `bottom` above the feet.
		const label = { text: '', opacity: 1, bottom: 300 };

		self.addScore = function (score) {
			self.score += score;
			label.text = '+1';
			$(label).stop(false, false);
			label.opacity = 1;
			label.bottom = 250;
			$(label).animate({
				bottom: 350,
			}, 200).animate({
				bottom: 300,
			}, 200).delay(700).animate({
				opacity: 0,
			});
		};

		// How much of the buffer is in use: the meep alone, or up to its "+1".
		self.extent = function () {
			return label.text && label.opacity > 0 ? self.buffer.h : 300;
		};

		self.paint = function () {
			const f = self.buffer.ctx;
			self.buffer.clear();
			meep.draw(f);

			if (label.text && label.opacity > 0) {
				const l = labelBuffer.ctx;
				labelBuffer.clear();
				// 75px text on a 100px line: its baseline sits 76 below the box top
				const x = LABEL.w / 2;
				const y = LABEL.h / 2 + 26;
				for (const [dx, dy] of [[5, 0], [0, 5], [0, -5], [-5, 0]]) {
					art.text(l, label.text, x, y, { size: 75, weight: 600, baseline: 'alphabetic', shadow: { color: '#333', blur: 5, x: dx, y: dy } });
				}
				art.text(l, label.text, x, y, { size: 75, weight: 600, baseline: 'alphabetic' });

				f.save();
				f.globalAlpha = label.opacity;
				f.drawImage(labelBuffer.canvas, self.buffer.w / 2 - LABEL.w / 2, self.buffer.h - label.bottom - 50 - LABEL.h / 2, LABEL.w, LABEL.h);
				f.restore();
			}
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	const hud = new HUD('#71A4A2');
	hud.$el.appendTo(stage.$ui);

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let isTutorial = false;
	let nRound = 0;
	let nCohort = -1;
	let cohort;
	const meeps = [];
	function initGame(PLAYER_COUNT) {

		for (let i = 0; i < PLAYER_COUNT; i++) {
			meeps[i] = new CookieMeep(i);
			meeps[i].isActive = false;
			meeps[i].visible = false;
		}

		initTutorial();
	}

	function initTutorial() {

		isTutorial = true;

		hud.initTutorial('Cookie Cutter',
			{ x: 1.75, y: 0.45, msg: 'Move around the box<br>to stand in safe spaces', icon: 'around' },
		);

		for (const m of meeps) {
			m.visible = true;
			m.isActive = true;
			m.isDead = false;
		}

		cohort = {
			timeMin: 2000,
			timeMax: 2000,
			levels: [COMPOSITIONS[0], COMPOSITIONS[5], COMPOSITIONS[10], COMPOSITIONS[15]],
		};

		stage.timeout(doNewStamp, 8000);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		for (const m of meeps) {
			m.visible = false;
			m.isActive = false;
			m.score = 0;
		}

		hud.finiTutorial();
		hud.finiTimer();

		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		isTutorial = false;
		hud.initPlayers(meeps);
		stage.timeout(initNextCohort, 1000);
	}

	let nStamp = -1;

	function initNextCohort() {

		nCohort++;

		if (!STRUCTURE[meeps.length][nRound].cohorts[nCohort]) {
			nCohort = 0;
			nRound++;
		}

		if (!STRUCTURE[meeps.length][nRound]) {
			finiGame();
			return;
		}

		audio.play('music');

		const round = STRUCTURE[meeps.length][nRound];
		cohort = round.cohorts[nCohort];

		nStamp = -1;

		for (const m of cohort.players) {
			meeps[m].visible = true;
			meeps[m].isActive = true;
			meeps[m].isDead = false;
		}

		let delay = 0;

		if (nCohort === 0) {
			stage.timeout(function () {
				hud.initRound(nRound, STRUCTURE[meeps.length].length);
			}, delay += 2000);

			stage.timeout(function () {
				hud.finiBanner();
			}, delay += 2000);
		}

		stage.timeout(function () {
			hud.summonPlayers(cohort.players);
		}, delay += 2000);

		stage.timeout(function () {
			hud.finiBanner();
			doUnstamp();
		}, delay += 2000);
	}

	function finiCohort() {

		for (const m of meeps) {
			m.visible = false;
			m.isActive = false;
		}

		stage.timeout(initNextCohort, 1000);
	}

	let timer;

	function step() {
		// Follow the players (it was the CSS left / top). Before the tracker
		// reports, x and y are undefined and the meep stays where it was.
		for (const m of meeps) {
			if (m.isActive) {
				if (Number.isFinite(m.x)) m.left = m.x;
				if (Number.isFinite(m.y)) m.top = m.y;
			}
		}
	}

	function doNewStamp() {
		nStamp++;

		stamper.composition = null;
		shadow.composition = null;

		if (!cohort.levels[nStamp]) {

			if (isTutorial) return;

			audio.play('correct-echo');
			finiCohort();
			return;
		}

		stamper.composition = cohort.levels[nStamp];
		shadow.composition = cohort.levels[nStamp];

		doStampReveal();
	}

	function doStampReveal() {

		audio.play('woosh');

		transition(stamper, { z: 600 });
		transition(shadow, { opacity: 0.5 });

		const nth = nStamp / (cohort.levels.length - 1);

		const time = cohort.timeMax - (cohort.timeMax - cohort.timeMin) * nth;

		stage.timeout(doStamp, Math.max(500, time));
	}

	function doStamp() {

		audio.play('woosh-long');

		transition(stamper, { z: 30 });
		transition(shadow, { opacity: 1 });

		stage.timeout(doCrush, 150);
		timer = stage.timeout(doUnstamp, 1500);
	}

	let countSquish = 0;

	function doCrush() {

		for (const m of meeps) {
			if (m.isActive) {

				const isInHole = cohort.levels[nStamp].isInHole(m.x, m.y);

				if (!m.isDead && !isInHole) {
					m.visible = false;
					m.isDead = true;
					audio.play('squish', true);

					countSquish++;

				} else {
					m.addScore(1);
				}
			}
		}

		let countAlive = 0;
		for (const m of meeps) if (!m.isDead && m.isActive) countAlive++;

		if (!isTutorial && countAlive === 0) {

			audio.play('incorrect');
			// (never runs: nobody is alive here, and STAMPS does not exist)
			for (const m of meeps) if (!m.isDead && m.isActive) m.addScore(STAMPS.length - nStamp - 1);

			clearTimeout(timer);
			stage.timeout(function () { doUnstamp(false); }, 1000);
			// The old code also called $stamper.stop(false) here, which did
			// nothing: the cutter moved by CSS transition, not jQuery.

			stage.timeout(finiCohort, 3000);
		} else {
			audio.play('correct');
		}

		hud.updatePlayers(meeps);
	}

	function finiGame() {
		audio.stop('music');

		const scores = [];
		meeps.forEach(function (m, i) {
			m.isActive = false;
			m.visible = false;
			scores[i] = m.score;
		});

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			clearInterval(interval);
			IGB.complete(rewards);
		}, 5000);
	}

	function doUnstamp(doNextStamp = true) {
		audio.play('woosh-long', true);

		transition(stamper, { z: H });
		transition(shadow, { opacity: 0 });

		if (isTutorial) {
			stage.timeout(function () {
				for (const m of meeps) {
					m.visible = true;
					m.isDead = false;
					m.isActive = true;
				}
			}, 100);
		}

		if (doNextStamp) stage.timeout(doNewStamp, 1000);
	}

	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		// The factory, fading to sand at the bottom.
		art.image(ctx, BG, 0, -H * 0.1, IGB.WIDTH, H * 1.1);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#A3956E', 'rgba(163,149,110,0)']) });

		paintBoard();
		layFlat(ctx, board, 0);

		// Meeps back to front; what is below the cutter goes under it, what
		// stands above it (up through a hole) goes over it.
		const standing = meeps.filter((m) => m.visible).sort((a, b) => a.top - b.top);
		for (const m of standing) {
			m.paint();
			layUpright(ctx, m.buffer, BOARD / 2 + m.left, BOARD / 2 + m.top, 0, Math.min(stamper.z, m.extent()));
		}

		paintCutter();
		layFlat(ctx, cutter, stamper.z);

		for (const m of standing) layUpright(ctx, m.buffer, BOARD / 2 + m.left, BOARD / 2 + m.top, stamper.z, m.extent());
	};

	self.setPlayers = function (p) {
		meeps.forEach(function (m, i) {
			m.x = p[i].x * (W / 2);
			m.y = -p[i].z * (W / 2);
		});
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
		unlisten();
	};
});
