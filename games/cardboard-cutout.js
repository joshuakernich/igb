/*
 * Cardboard Cutout
 *
 * Each player has a cardboard box with a shape dashed on its lid and cuts it
 * out by walking the outline: where they stand moves a craft knife across the
 * lid on the front wall. Two boxes are cut at a time while the rest wait in a
 * stack on the left wall and finished ones pile up on the right. Straying off
 * the line for half a second spoils the cut and it starts again; the fastest
 * cutters win.
 *
 * Input: px (left / right), pz (forward / back).
 *
 * The boxes were a real CSS 3D scene (lids tipped back in perspective, walls
 * hanging under them, knives standing up off the lid, timer tabs tilted up
 * from the far edge, all depth sorted together), so the 3D placement stays
 * DOM in stage.$ui, under the HUD. Every surface in it is a canvas painted
 * here; the factory backdrop is on the stage canvas.
 */
IGB.register('cardboard-cutout', function CardboardCutoutGame(stage, playersMeta) {

	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const BOX = 500;
	const CUTTER = { W: 50, H: 200 };
	const TIME = 60;

	const BG = 'assets/shared/bg-box-factory.png';
	const TEXTURE = 'assets/cardboard-cutout/texture-cardboard.avif';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-creative.mp3', 0.3, true);

	function toPath(arr) {
		const path = [];
		for (let i = 0; i < arr.length / 2; i++) {
			path[i] = [arr[i * 2], arr[i * 2 + 1]];
		}
		return path;
	}

	const SHAPES = [];
	for (const s in SHAPE_LIBRARY) SHAPES[s] = toPath(SHAPE_LIBRARY[s]);

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[SHAPES[0], SHAPES[1]],
			[SHAPES[2], SHAPES[3]],
			[SHAPES[10], SHAPES[11]],
		],
		[
			[SHAPES[0], SHAPES[1], SHAPES[2]],
			[SHAPES[9], SHAPES[10], SHAPES[11]],
		],
		[
			[SHAPES[0], SHAPES[1], SHAPES[2], SHAPES[3]],
			[SHAPES[8], SHAPES[9], SHAPES[10], SHAPES[11]],
		],
		[
			[SHAPES[0], SHAPES[1], SHAPES[2], SHAPES[3], SHAPES[4]],
			[SHAPES[7], SHAPES[9], SHAPES[9], SHAPES[10], SHAPES[11]],
		],
		[
			[SHAPES[0], SHAPES[1], SHAPES[2], SHAPES[3], SHAPES[4], SHAPES[5]],
			[SHAPES[6], SHAPES[7], SHAPES[8], SHAPES[9], SHAPES[10], SHAPES[11]],
		],
	];

	/* ---------- geometry ---------- */

	function pointToPolygonDistance(point, polygon) {
		function pointToSegmentDistance(p, v, w) {
			const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
			if (l2 === 0) {
				// v and w are the same point
				return Math.hypot(p[0] - v[0], p[1] - v[1]);
			}
			let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
			t = Math.max(0, Math.min(1, t));
			const projX = v[0] + t * (w[0] - v[0]);
			const projY = v[1] + t * (w[1] - v[1]);
			return Math.hypot(p[0] - projX, p[1] - projY);
		}

		let minDist = Infinity;
		for (let i = 0; i < polygon.length; i++) {
			const v = polygon[i];
			const w = polygon[(i + 1) % polygon.length];
			const dist = pointToSegmentDistance(point, v, w);
			if (dist < minDist) minDist = dist;
		}
		return minDist;
	}

	// How far round the outline (0..1) the point nearest to `point` is.
	function pointPolygonProgress(point, polygon) {
		const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

		const edgeLengths = [];
		let perimeter = 0;
		for (let i = 0; i < polygon.length; i++) {
			const a = polygon[i];
			const b = polygon[(i + 1) % polygon.length];
			const len = dist(a, b);
			edgeLengths.push(len);
			perimeter += len;
		}

		let bestProgress = 0;
		let minDist = Infinity;
		let accumulated = 0;

		for (let i = 0; i < polygon.length; i++) {
			const a = polygon[i];
			const b = polygon[(i + 1) % polygon.length];
			const ab = [b[0] - a[0], b[1] - a[1]];
			const ap = [point[0] - a[0], point[1] - a[1]];

			const ab2 = ab[0] * ab[0] + ab[1] * ab[1];
			let t = (ap[0] * ab[0] + ap[1] * ab[1]) / ab2;
			t = Math.max(0, Math.min(1, t));

			const proj = [a[0] + t * ab[0], a[1] + t * ab[1]];
			const d = dist(point, proj);

			if (d < minDist) {
				minDist = d;
				const alongEdge = dist(a, proj);
				const progressDist = accumulated + alongEdge;
				bestProgress = progressDist / perimeter;
			}

			accumulated += edgeLengths[i];
		}

		return bestProgress;
	}

	function polygonLength(points) {
		let length = 0;
		for (let i = 0; i < points.length; i++) {
			const p1 = points[i];
			const p2 = points[(i + 1) % points.length]; // wrap around to first point
			const dx = p2[0] - p1[0];
			const dy = p2[1] - p1[1];
			length += Math.sqrt(dx * dx + dy * dy);
		}
		return length;
	}

	/* ---------- the 3D scene ---------- */

	// A perspective one wall wide, looking at the middle of the world, as the
	// old game's root had; every box shares the one preserve-3d space inside
	// it, so the browser depth sorts boxes, walls and knives together.
	const $scene = $('<cutoutscene>').css({
		display: 'block', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
		perspective: W + 'px',
	}).appendTo(stage.$ui);
	const $canvas = $('<cutoutcanvas>').css({
		display: 'block', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
		transformStyle: 'preserve-3d',
	}).appendTo($scene);

	// A canvas surface placed in the scene with the given CSS.
	function surface(w, h, css) {
		const s = stage.surface(w, h);
		s.$el.css(css || {});
		return s;
	}

	// Repaint a surface only when what it shows (key) has changed, or when
	// a resize has cleared it.
	function repaint(s, key, fn) {
		key = s.canvas.width + '|' + key;
		if (s.key === key) return;
		s.key = key;
		s.clear();
		fn(s.ctx);
	}

	const fontsReady = () => document.fonts.check('600 50px Rubik');

	// The baseline of a line of Rubik `size` px in a CSS line box `lh` tall.
	function baseline(ctx, size, lh) {
		ctx.font = `600 ${size}px Rubik, sans-serif`;
		const m = ctx.measureText('0');
		const a = Math.round(m.fontBoundingBoxAscent);
		const d = Math.round(m.fontBoundingBoxDescent);
		return (lh - a - d) / 2 + a;
	}

	// A CSS box-shadow (no blur) of a rounded box: the box shifted by dx,
	// shown only outside the box itself.
	function outerShadow(ctx, x, y, w, h, r, style, dx, dy) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(-1e4, -1e4, 2e4, 2e4);
		art.roundRectPath(ctx, x, y, w, h, r);
		ctx.clip('evenodd');
		art.roundRect(ctx, x + dx, y + dy, w, h, r, style);
		ctx.restore();
	}

	/* ---------- the knife ---------- */

	// The knife stands up off the lid from its tip, the bottom-right corner
	// of its parts at (0, 0); its canvas reaches out to (KNIFE.X, KNIFE.Y)
	// up and left of the tip to hold the slanted shadow and the soft ones.
	const KNIFE = { X: 70, Y: 220, W: 220, H: 230 };

	function drawKnife(ctx, n) {
		const colour = PLAYER_COLORS[n];

		// a shadow leaning off to the side
		ctx.save();
		ctx.rotate(Math.PI / 4);
		art.roundRect(ctx, -CUTTER.W, -CUTTER.H, CUTTER.W, CUTTER.H, [10, 10, 0, CUTTER.W * 0.8], {
			fill: art.linear(ctx, 0, 0, 0, -CUTTER.H, ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']),
		});
		ctx.restore();

		// the blade, with a grey edge down its right side
		const bw = CUTTER.W * 0.8;
		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, -bw, -CUTTER.H, bw, CUTTER.H, [10, 10, 0, bw]);
		ctx.clip();
		art.rect(ctx, -bw, -CUTTER.H, bw, CUTTER.H, { fill: 'white' });
		art.rect(ctx, -10, -CUTTER.H, 10, CUTTER.H, { fill: '#ddd' });
		ctx.restore();

		// the handle frame in the player's colour, with a dark side
		const fh = CUTTER.H - 50;
		outerShadow(ctx, -CUTTER.W, -CUTTER.H, CUTTER.W, fh, 10, { fill: '#222' }, 10, 0);
		art.border(ctx, -CUTTER.W, -CUTTER.H, CUTTER.W, fh, 10, 20, { fill: colour });

		// the head: a soft shadow under a grey side, a colour band and two eyes
		const head = [-CUTTER.W, -CUTTER.H, CUTTER.W, 50, [10, 10, 0, 0]];
		ctx.save();
		ctx.beginPath();
		ctx.rect(-1e4, -1e4, 2e4, 2e4);
		art.roundRectPath(ctx, ...head);
		ctx.clip('evenodd');
		art.roundRect(ctx, ...head, { fill: 'black', shadow: { color: 'rgba(0,0,0,0.5)', blur: 10, y: 5 } });
		ctx.restore();
		outerShadow(ctx, ...head, { fill: 'gray' }, 10, 0);
		art.roundRect(ctx, ...head, { fill: 'white' });
		art.rect(ctx, -CUTTER.W, -CUTTER.H + 10, CUTTER.W, 10, { fill: colour });

		const y = -CUTTER.H + 20 + baseline(ctx, 40, 0);
		ctx.fillStyle = 'black';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText('. .', -CUTTER.W / 2, y);
	}

	const CutterMeep = function (n) {
		const self = this;

		const knife = surface(KNIFE.W, KNIFE.H, { position: 'absolute', left: -KNIFE.X + 'px', top: -KNIFE.Y + 'px' });
		self.$el = $('<cuttermeep>').css({
			display: 'block', position: 'absolute',
			transformOrigin: 'bottom right', transform: 'rotateX(-90deg)', transformStyle: 'preserve-3d',
		}).append(knife.$el);

		self.px = 0;
		self.py = 0;
		self.n = n;
		self.score = 0;
		self.tally = 0;

		self.paint = function () {
			repaint(knife, fontsReady(), function (ctx) {
				ctx.save();
				ctx.translate(KNIFE.X, KNIFE.Y);
				drawKnife(ctx, n);
				ctx.restore();
			});
		};
	};

	/* ---------- a box ---------- */

	const HEADER = { W: BOX / 3 + 40, H: 70 };   // one line: the old page's white-space: nowrap never let it wrap

	const CutoutBox = function (n, pattern) {

		const audio = stage.audio();
		audio.add('buzz', 'assets/shared/sfx-buzz.mp3', 0.3, true);
		audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
		audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.3);
		audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);

		const self = this;
		self.isForeground = false;
		self.y = 0.5;
		self.x = 0.5;
		self.scale = 0.5;
		self.spin = 85;
		self.twist = 0;
		self.rotate = 0;
		self.score = 0;
		self.isOnLine = true;
		self.drift = 0;
		self.countup = 0;

		let isCutActive = false;
		self.isComplete = false;

		// What the surfaces show (the old element's display, background and
		// path data).
		let isTextured = true;      // the lid's cardboard
		let isShapeShown = true;    // the dashed outline
		let isStartShown = true;    // the throbbing start ring
		let throbStart = performance.now();
		let isCutDone = false;
		let cutRevision = 0;
		let headerText = '';

		// The lid, its three walls, the timer tab and the space the knife
		// stands in, placed exactly as the old elements were.
		self.$el = $('<cutoutspace>').css({ display: 'block', position: 'absolute', transformStyle: 'preserve-3d' });
		const $box = $('<cutoutbox>').css({
			display: 'block', position: 'absolute', width: BOX + 'px', height: BOX + 'px',
			transform: 'translate(-50%,-50%)', transformStyle: 'preserve-3d',
		}).appendTo(self.$el);

		const lid = surface(BOX, BOX);
		lid.$el.appendTo($box);

		const walls = [
			surface(BOX, BOX / 4, { position: 'absolute', top: BOX + 'px', left: 0, transform: 'rotateX(-90deg)', transformOrigin: 'top center' }),
			surface(BOX, BOX / 4, { position: 'absolute', top: 0, left: 0, transform: 'rotateZ(90deg) rotateX(-90deg)', transformOrigin: 'left top' }),
			surface(BOX / 4, BOX, { position: 'absolute', top: 0, left: BOX * 3 / 4 + 'px', transform: 'rotateY(-90deg)', transformOrigin: 'right top' }),
		];
		for (const w of walls) w.$el.appendTo($box);

		const header = surface(HEADER.W, HEADER.H, {
			position: 'absolute', left: -HEADER.W / 2 + 'px', top: -BOX / 2 - HEADER.H + 'px',
			transformOrigin: 'bottom center', transform: 'rotateX(-45deg)',
		});
		header.$el.appendTo(self.$el);

		const $surface = $('<cutoutsurface>').css({ display: 'block', transformStyle: 'preserve-3d' }).appendTo(self.$el);

		self.bindMeep = function (meep) {
			self.meep = meep;
			self.meep.$el.appendTo($surface);
		};

		const history = [];

		self.step = function () {
			if (self.meep && self.isForeground) {
				let ox = self.meep.px - self.x * W;
				let oy = self.meep.py - self.y * H;

				self.meep.$el.css({
					left: ox + 'px',
					top: oy + 'px',
				});

				ox = ox + BOX / 2;
				oy = oy + BOX / 2;

				if (isCutActive) {

					history.push([ox, oy]);
					cutRevision++;

					let progress = pointPolygonProgress(history[history.length - 1], pattern);
					let length = polygonLength(history);
					let dist = pointToPolygonDistance(history[history.length - 1], pattern);
					self.drift = dist;
					self.isOnLine = self.drift < 40;

					if (self.isPractice) {
						progress = 0;
						length = 0;
						dist = 0;
						self.isOnLine = true;
					}

					if ((progress > 0.98 || progress < 0.02) && length > BOX) {
						isCutActive = false;
						self.isComplete = true;
						self.isOnLine = true;
						isCutDone = true;
						cutRevision++;

						audio.play('correct');
					}

				} else if (!self.isComplete) {

					const dx = ox - pattern[0][0];
					const dy = oy - pattern[0][1];
					const d = Math.sqrt(dx * dx + dy * dy);

					if (d < 25) {
						isStartShown = false;
						isCutActive = true;
						audio.play('blip', true);
					}
				}
			}

			if (!self.isComplete && self.isForeground) {
				const was = self.countdown;

				const now = new Date().getTime();
				const timeElapsed = now - self.timeStart;
				self.countdown = TIME - Math.floor(timeElapsed / 100) / 10;

				if (was > 10 && self.countdown <= 10) {
					hud.flashMessage(self.x, self.y, '10 seconds left', 50);
				}

				for (let i = 1; i <= 3; i++) {
					if (was > i && self.countdown <= i) hud.flashMessage(self.x, self.y, i);
				}

				if (self.countdown < 0) self.countdown = 0;

				if (was > 0 && self.countdown <= 0) {
					hud.flashMessage(self.x, self.y, 'Time up!', 100);
					self.isComplete = true;
					audio.play('incorrect', true);
				}

				self.countup = TIME - self.countdown;
				self.meep.score = self.meep.tally + self.countup;
			}
		};

		self.redraw = function () {
			self.$el.css({
				left: self.x * W + (self.isOnLine ? 0 : -10 + Math.random() * 20) + 'px',
				top: self.y * H + (self.isOnLine ? 0 : -10 + Math.random() * 20) + 'px',
				transform: 'scale(' + self.scale + ') rotateX(' + self.spin + 'deg) rotateY(' + self.twist + 'deg) rotateZ(' + self.rotate + 'deg)',
			});

			headerText = self.countup.toFixed(1);

			if (self.isOnLine) {
				self.countOffLine = 0;
				audio.stop('buzz');
			} else {
				audio.play('buzz');
				self.countOffLine++;
				if (self.countOffLine > FPS / 2) {
					self.reset();
					audio.play('incorrect');
				}
			}
		};

		self.reset = function () {
			self.isOnLine = true;
			isCutActive = false;
			if (!isStartShown) throbStart = performance.now();
			isStartShown = true;
			history.length = 0;
			cutRevision++;
		};

		self.setForeground = function (b) {
			self.isForeground = b;

			if (b) {
				self.timeStart = new Date().getTime();
				self.meep.$el.show();
			} else {
				self.meep.$el.hide();
			}
		};

		self.setPracticeMode = function () {
			self.isPractice = true;
			self.isForeground = true;
			header.$el.hide();

			if (n != 0) {
				isShapeShown = false;
				isTextured = false;
				for (const w of walls) w.$el.hide();
			}
			isCutActive = true;
			isStartShown = false;
		};

		/* ---------- painting ---------- */

		function paintLid(ctx, now) {
			const colour = PLAYER_COLORS[self.meep ? self.meep.n : 0];
			if (isTextured) art.cover(ctx, TEXTURE, 0, 0, BOX, BOX, 0, 0);

			ctx.save();
			ctx.miterLimit = 4;   // SVG's default, not the canvas's 10

			if (isShapeShown) {
				ctx.beginPath();
				pattern.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
				ctx.closePath();
				ctx.setLineDash([20, 20]);
				ctx.lineWidth = 10;
				ctx.strokeStyle = colour;
				ctx.stroke();
				ctx.setLineDash([]);
			}

			if (history.length) {
				ctx.beginPath();
				for (let i = 0; i < history.length; i++) {
					const [x, y] = history[i];
					if (!isFinite(x) || !isFinite(y)) break;   // SVG stopped at bad path data
					if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
				}
				if (isCutDone) {
					ctx.closePath();
					ctx.fillStyle = 'rgba(0,0,0,0.7)';
					ctx.fill();
				}
				ctx.lineWidth = 5;
				ctx.strokeStyle = '#222';
				ctx.stroke();
			}

			// The start ring throbs from full size to half and back every
			// half second, each half eased (a CSS animation with no timing set).
			if (isStartShown) {
				const t = ((now - throbStart) / 500) % 1;
				const s = t < 0.5 ? 1 - 0.5 * $.easing.ease(t * 2) : 0.5 + 0.5 * $.easing.ease(t * 2 - 1);
				art.circle(ctx, pattern[0][0], pattern[0][1], 35 * s, { fill: colour });
				art.circle(ctx, pattern[0][0], pattern[0][1], 25 * s, { fill: '#C69A64' });
			}

			ctx.restore();
		}

		function paintWall(ctx, w, h) {
			art.cover(ctx, TEXTURE, 0, 0, w, h, 0, 0);
			art.rect(ctx, 0, 0, w, h, { fill: 'black', alpha: 0.2 });
		}

		// The tab reads "⏱️ 12.3" on one line on a dark tab whose bottom edge
		// sits on the lid's far edge. The old page set white-space: nowrap on
		// the game root, so a time wider than the tab's content box just
		// runs on into its right padding (never past it: 174 at most).
		function paintHeader(ctx) {
			const base = baseline(ctx, 50, 70);
			art.roundRect(ctx, 0, 0, HEADER.W, HEADER.H, [20, 20, 0, 0], { fill: '#333' });
			ctx.fillStyle = 'white';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText('⏱️ ' + headerText, 20, base);
		}

		self.paint = function (now) {
			const textured = !!art.ready(TEXTURE);
			const key = [textured, isTextured, isShapeShown, isStartShown, cutRevision, self.meep && self.meep.n].join();
			if (isStartShown) lid.key = undefined;   // the ring animates
			repaint(lid, key, (ctx) => paintLid(ctx, now));
			if (isTextured) walls.forEach((w) => repaint(w, textured, (ctx) => paintWall(ctx, w.w, w.h)));
			repaint(header, headerText + '|' + fontsReady(), paintHeader);
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	let showGlass = true;

	const hud = new HUD('#C09363');
	hud.$el.appendTo(stage.$ui);

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	const boxes = [];
	const meeps = [];
	const scene = [];      // every box still in the scene, drawn or not
	const completes = [];

	let nPlayer = -1;

	function addBox(box) {
		box.$el.appendTo($canvas);
		scene.push(box);
	}

	function initGame(count) {
		for (let m = 0; m < count; m++) {
			meeps[m] = new CutterMeep(m);
		}
		initTutorial();
	}

	function initTutorial() {

		for (let m = 0; m < meeps.length; m++) {
			const box = new CutoutBox(m, SHAPES[1]);
			addBox(box);
			box.bindMeep(meeps[m]);
			box.x = 1.5;
			box.y = 0.6;
			box.scale = 1;
			box.spin = 20;
			box.twist = 0;
			box.redraw();
			boxes[m] = box;
			box.setPracticeMode();
		}

		hud.initTutorial('Cardboard Cutout',
			{ x: 1.2, y: 0.5, msg: 'Align yourself<br>with your box', icon: 'align' },
			{ x: 1.8, y: 0.5, msg: 'Move around to cut<br>along the line', icon: 'around' },
		);

		hud.initTimer(20, finiTutorial);
	}

	function finiTutorial() {
		showGlass = false;
		hud.finiTutorial();
		hud.finiTimer();

		for (const box of boxes) {
			box.$el.remove();
			scene.splice(scene.indexOf(box), 1);
		}
		for (const m of meeps) m.score = 0;
		boxes.length = 0;

		stage.timeout(initPlay, 2000);
	}

	function initPlay() {
		showGlass = false;
		hud.initPlayers(meeps, 1);
		stage.timeout(initNextRound, 1000);
	}

	let iRound = -1;
	function initNextRound() {
		iRound++;

		slots.length = 0;
		boxes.length = 0;
		nPlayer = -1;

		if (!STRUCTURE[meeps.length][iRound]) {
			finiGame();
			return;
		}

		audio.play('music');

		for (let m = 0; m < meeps.length; m++) {

			meeps[m].tally = meeps[m].score;

			const box = new CutoutBox(m, STRUCTURE[meeps.length][iRound][m]);
			addBox(box);
			box.bindMeep(meeps[m]);
			box.x = 0.75 + m % 2 * 0.02;
			box.y = -0.2;

			box.redraw();
			boxes[m] = box;
			box.setForeground(false);

			$(box).delay((meeps.length - m) * 100).animate({
				y: 0.78 - 0.07 * (meeps.length - m - 1),
			});
		}

		stage.timeout(function () {
			hud.initRound(iRound, STRUCTURE[meeps.length].length);
		}, 1500);

		stage.timeout(function () {
			hud.finiBanner();
		}, 3500);

		stage.timeout(function () {
			initNextPlayer(false);
			initNextPlayer(false);
		}, 5000);

		stage.timeout(function () {
			hud.summonPlayers([0, 1]);
		}, 6000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 8000);

		stage.timeout(function () {
			for (const s in slots) slots[s].setForeground(true);
		}, 10000);
	}

	const SPACING = 1 / 3;
	const slots = [];

	function initNextPlayer(autostart = true) {
		nPlayer++;

		if (boxes[nPlayer]) {
			let nSlot = 0;
			while (slots[nSlot]) nSlot++;
			slots[nSlot] = boxes[nPlayer];

			$(slots[nSlot])
				.animate({
					x: 2 - (nSlot + 1) * SPACING,
					y: 0.5,
					scale: 1,
					spin: 45,
					twist: 0,
					rotate: 0,
				}, {
					duration: 500,
					complete: function () {
						if (autostart) slots[nSlot].setForeground(true);
					},
				});
		}

		let isComplete = true;
		for (const box of boxes) if (!box.isComplete) isComplete = false;

		if (isComplete) {
			initNextRound();
		}
	}

	function finiGame() {
		for (let c = 0; c < completes.length; c++) {

			$(completes[c])
				.delay((completes.length - c) * 100)
				.animate({
					x: 1.2 + c * 1 / (completes.length - 1) * 0.6,
					y: 0.3,
					scale: 0.5,
					spin: 20,
					twist: -20,
				}, {
					step: function () {
						completes[c].redraw();
					},
				});
		}

		const scores = [];
		for (let m = 0; m < meeps.length; m++) scores[m] = meeps[m].score;

		const rewards = window.scoresToRewards(scores);

		stage.timeout(function () {
			audio.stop('music');
			hud.showFinalScores(scores, rewards);
		}, 2000);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 7000);
	}

	function finiSlot(n) {

		slots[n].setForeground(false);
		completes.push(slots[n]);

		$(slots[n])
			.delay(1000)
			.animate({
				x: 2.25,
				y: 0.78 - 0.07 * (completes.length - 1),
				scale: 0.5,
				spin: 80,
				twist: 0,
			});

		slots[n] = undefined;

		stage.timeout(initNextPlayer, 2000);
	}

	function step() {
		for (const box of boxes) box.step();
		for (const box of boxes) box.redraw();

		for (const s in slots) if (slots[s] && slots[s].isComplete) finiSlot(s);

		hud.updatePlayers(meeps, 1);
	}

	const interval = stage.interval(step, 1000 / FPS);

	// The factory backdrop, set 120 up from the floor and repeating, under
	// a blue glow rising from the floor; then the scene's surfaces.
	self.draw = function (ctx) {
		const img = art.ready(BG);
		if (img) {
			const h = WIDTH * img.naturalHeight / img.naturalWidth;
			let y = H - 120 - h;
			while (y > 0) y -= h;
			for (; y < H; y += h) art.image(ctx, BG, 0, y, WIDTH, h);
		}
		art.rect(ctx, 0, 0, WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#2963A2', 'rgba(41,99,162,0)']) });
		if (showGlass) art.glass(ctx);

		const now = performance.now();
		for (const box of scene) box.paint(now);
		for (const m of meeps) m.paint();
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].px = (1 + p[m].px) * W;
			meeps[m].py = (1 - p[m].pz) * H;
		}
	};
});
