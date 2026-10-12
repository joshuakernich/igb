/*
 * Town Fair
 *
 * A little wooden theatre stands in the middle of the front wall, the
 * players' meeps on its stage. When the curtain opens, meeps parade across
 * carrying farm animals; then the curtain closes, the view tips down to the
 * stage floor, where four answer boxes lie, and a question about the parade
 * comes up. Players answer by standing in a box. A point for each right
 * answer, seven questions after a tutorial.
 *
 * The old game was a CSS 3D scene: a world tipped back by rotateX, holding
 * the stage floor laid flat and the theatre wall standing at its back, with
 * the meeps standing up on the floor. Here the projection is done by hand,
 * as in the-claw: the floor and the wall are painted flat into buffers and
 * laid onto the screen in perspective a pixel row at a time, then the meeps
 * are drawn back to front, each through the affine map that matches the
 * perspective at its middle.
 *
 * Input: px (left / right picks an answer box), pz (towards / away from the
 * front wall moves the meep about the stage).
 */
IGB.register('town-fair', function TownFairGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;

	const TUTORIAL = {
		type: 'item',
		parade: [
			{ m: 2, i: 0 },
		],
		options: [
			{ i: 1 },
			{ i: 0 },
			{ i: 2, isCorrect: true },
			{ i: 3 },
		],
	};

	const QUESTIONS = [
		{
			q: 'What colour was the meep?',
			type: 'meep',
			parade: [
				{ m: 2, i: 0 },
			],
			options: [
				{ m: 0 },
				{ m: 2 },
				{ m: 1, isCorrect: true },
				{ m: 3 },
			],
		},
		{
			q: 'What colour was the second meep?',
			type: 'meep',
			parade: [
				{ m: 2, i: 0 },
				{ m: 1, i: 0 },
				{ m: 0, i: 0 },
			],
			options: [
				{ m: 0 },
				{ m: 2 },
				{ m: 1, isCorrect: true },
				{ m: 3 },
			],
		},
		{
			q: 'What was the first meep carrying?',
			type: 'item',
			parade: [
				{ m: 2, i: 1 },
				{ m: 2, i: 0 },
				{ m: 2, i: 2 },
			],
			options: [
				{ i: 0 },
				{ i: 2 },
				{ i: 3 },
				{ i: 1, isCorrect: true },
			],
		},
		{
			q: 'How many cows?',
			type: 'text',
			parade: [
				{ m: 1, i: 2 },
				{ m: 2, i: 1 },
				{ m: 0, i: 2 },
				{ m: 3, i: 1 },
			],
			options: [
				{ t: 0 },
				{ t: 1 },
				{ t: 2, isCorrect: true },
				{ t: 3 },
			],
		},
		{
			q: 'What colour was the third meep?',
			type: 'meep',
			parade: [
				{ m: 0, i: 3 },
				{ m: 2, i: 2 },
				{ m: 3, i: 1 },
				{ m: 1, i: 0 },
			],
			options: [
				{ m: 0 },
				{ m: 2, isCorrect: true },
				{ m: 1 },
				{ m: 3 },
			],
		},
		{
			q: 'What was was the second meep carrying?',
			type: 'item',
			parade: [
				{ m: 1, i: 0 },
				{ m: 2, i: 1 },
				{ m: 0, i: 2 },
				{ m: 3, i: 3 },
			],
			options: [
				{ i: 0 },
				{ i: 2 },
				{ i: 3 },
				{ i: 1, isCorrect: true },
			],
		},
		{
			q: 'How many pigs?',
			type: 'text',
			parade: [
				{ m: 5, i: 0 },
				{ m: 2, i: 0 },
				{ m: 0, i: 0 },
				{ m: 4, i: 0 },
				{ m: 1, i: 0 },
				{ m: 6, i: 0 },
				{ m: 3, i: 0 },
				{ m: 5, i: 0 },
				{ m: 0, i: 0 },
				{ m: 1, i: 0 },
				{ m: 2, i: 0 },
			],
			options: [
				{ t: 9 },
				{ t: 10 },
				{ t: 11, isCorrect: true },
				{ t: 12 },
			],
		},
	];

	const FARM = 'assets/shared/bg-farm.png';
	const GRASS = 'assets/town-fair/texture-grass.jpg';
	const WOOD = 'assets/shared/texture-wood.png';
	const CURTAIN = 'assets/shared/texture-curtain.avif';
	const ANIMALS = 'assets/shared/actor-animals.png';   // six square frames in a row

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-farm.mp3', 0.3, true);
	audio.add('pig', 'assets/town-fair/sfx-pig.mp3', 0.5);
	audio.add('cow', 'assets/town-fair/sfx-cow.mp3', 0.5);
	audio.add('goat', 'assets/town-fair/sfx-goat.mp3', 0.5);
	audio.add('chicken', 'assets/town-fair/sfx-chicken.mp3', 0.5);
	audio.add('sheep', 'assets/town-fair/sfx-sheep.mp3', 0.5);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.3);
	audio.add('curtain', 'assets/shared/sfx-curtain.mp3', 0.3);

	const sounds = ['pig', 'cow', 'goat', 'chicken', 'sheep'];

	/* ---------- the scene's layout (the old CSS boxes) ---------- */

	// The floor box (W x W/2) lies flat, its front edge on the world's
	// origin; the wall (W x H) stands at its back edge. The screen is the
	// wall's inset 50px 50px 250px 50px.
	const FLOOR = { w: W, d: W / 2, shadow: 50 };
	const SCREEN = { x: 50, y: 50, w: W - 100, h: H - 300 };
	const PLATFORM = SCREEN.h * 0.15;

	// The answer boxes: funrunoptions has margin 0 2.5% inside the floor and
	// four 25% options, each with a box inset 50px 25px.
	const OPTION = { x: W * 0.025, w: W * 0.95 / 4, h: FLOOR.d };

	/* ---------- the parade, and the answers ---------- */

	const FunRunVignette = function (parade, callback) {
		const self = this;
		self.carriers = [];
		self.removed = false;

		for (let i = 0; i < parade.length; i++) {

			const delay = i * 1000 + Math.random() * 500;

			const carrier = new FunRunCarrier(parade[i].m, parade[i].i);
			self.carriers.push(carrier);
			carrier.left = (parade[i].dir === -1 ? -0.5 : 1.5) * SCREEN.w;
			$(carrier)
				.delay(delay)
				.animate({
					left: (parade[i].dir === -1 ? 1.5 : -0.5) * SCREEN.w,
				}, {
					duration: 4500 + Math.random() * 2000,
					easing: 'linear',
				});

			stage.timeout(function () {
				audio.play(sounds[parade[i].i], true);
			}, 1500 + delay);
		}

		stage.timeout(callback, 6000 + parade.length * 700);

		self.remove = function () {
			self.removed = true;
			for (const c of self.carriers) $(c).stop(true);
		};
	};

	const FunRunOptions = function (type, options) {
		const self = this;
		self.type = type;
		self.options = options;
		self.visible = true;
		self.removed = false;
		self.isShowingCorrect = false;

		self.showCorrect = function () {
			self.isShowingCorrect = true;
		};
	};

	// A meep walking along the stage, the animal held out in front.
	const FunRunCarrier = function (nMeep, nItem) {
		const self = this;
		self.left = 0;     // across the screen; the feet are 50 up from its bottom
		self.item = nItem;

		self.meep = new Meep(nMeep);
		self.meep.handLeft.x = -120;
		self.meep.handLeft.y = 0.5 * self.meep.h;
		self.meep.handRight.x = -30;
		self.meep.handRight.y = 0.65 * self.meep.h;
	};

	/* ---------- the camera ---------- */

	// funrungame had perspective: W, seen from the middle of the world; the
	// world's origin sat at the bottom middle. toWall() and toFloor() set its
	// transform, rotateX(rx) scale(s) translateY(ty), which eased over a
	// second (transition: all 1s), as did the background's floorview change.
	const PERSPECTIVE = W;
	const EYE = { x: IGB.WIDTH / 2, y: H / 2 };
	const ORIGIN = { x: IGB.WIDTH / 2, y: H };
	const VIEW_WALL = { rx: -2, s: 1, ty: 0 };
	const VIEW_FLOOR = { rx: -20, s: 0.85, ty: -120 };

	const view = { k: 1 };   // 0 at the wall, 1 at the floor
	const cam = { s: 1, c: 1, sn: 0, ty: 0 };

	function setCamera() {
		const rx = lerp(VIEW_WALL.rx, VIEW_FLOOR.rx, view.k) * Math.PI / 180;
		cam.s = lerp(VIEW_WALL.s, VIEW_FLOOR.s, view.k);
		cam.ty = lerp(VIEW_WALL.ty, VIEW_FLOOR.ty, view.k);
		cam.c = Math.cos(rx);
		cam.sn = Math.sin(rx);
	}

	// Where a point of the world lands on the screen: x across from the
	// world's middle, y down from the floor, z towards the front wall.
	// scale(s) is 2D, so it leaves z alone.
	function project(x, y, z) {
		const Y = y + cam.ty;
		const qx = cam.s * x;
		const qy = cam.s * Y * cam.c - z * cam.sn;
		const qz = cam.s * Y * cam.sn + z * cam.c;
		const f = PERSPECTIVE / (PERSPECTIVE - qz);
		return { x: EYE.x + qx * f, y: EYE.y + (ORIGIN.y - EYE.y + qy) * f };
	}

	// Lay a flat buffer onto the screen. Its row v is the line of world
	// points (p.x + u, p.y + v * p.dy, p.z + v * p.dz): the world only turns
	// about x, so every row lands on one screen row, scaled about the middle,
	// and the buffer goes down a device pixel row at a time.
	function layPlane(ctx, surf, p) {
		const { s, c, sn, ty } = cam;
		const D = PERSPECTIVE;
		const OY = ORIGIN.y - EYE.y;
		const a0 = s * c * (p.y + ty) - sn * p.z;
		const a1 = s * c * p.dy - sn * p.dz;
		const b0 = s * sn * (p.y + ty) + c * p.z;
		const b1 = s * sn * p.dy + c * p.dz;
		const rowY = (v) => EYE.y + (OY + a0 + a1 * v) * D / (D - b0 - b1 * v);
		const rowAt = (y) => {
			const A = y - EYE.y;
			return (A * (D - b0) - (OY + a0) * D) / (a1 * D + A * b1);
		};

		const ky = ctx.getTransform().d;
		const kb = surf.canvas.height / surf.h;
		const top = rowY(0);
		const bottom = rowY(surf.h);
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const y0 = Math.max(top, j / ky);
			const y1 = Math.min(bottom, (j + 1) / ky);
			const v0 = Math.max(0, rowAt(y0));
			const v1 = Math.min(surf.h, rowAt(y1));
			if (!(v1 > v0) || !(y1 > y0)) continue;
			const f = D / (D - b0 - b1 * (v0 + v1) / 2);
			ctx.drawImage(surf.canvas,
				0, v0 * kb, surf.canvas.width, (v1 - v0) * kb,
				EYE.x + s * p.x * f, y0, s * surf.w * f, y1 - y0);
		}
	}

	const WALL_PLANE = { x: -W / 2, y: -H, z: -FLOOR.d, dy: 1, dz: 0 };
	const FLOOR_PLANE = { x: -W / 2, y: 0, z: -FLOOR.d, dy: 0, dz: 1 };

	// Set up ctx to draw in the plane standing upright on the floor at world
	// (x, z), facing the front, as the meeps stood (rotateX(-90deg) on the
	// floor's rotateX(90deg)): x across, y up as negative from the floor. The
	// affine map is exact at (0, y0) and follows the perspective's change
	// with height to first order, a fraction of a pixel over a meep.
	function upright(ctx, x, z, y0) {
		const { s, c, sn, ty } = cam;
		const D = PERSPECTIVE;
		const OY = ORIGIN.y - EYE.y;
		const Y = y0 + ty;
		const qx = s * x;
		const qy = s * Y * c - z * sn;
		const qz = s * Y * sn + z * c;
		const f = D / (D - qz);
		const df = f * f * s * sn / D;                 // how f grows with y
		const dx = qx * df;                            // screen x per unit of y
		const dy = s * c * f + (OY + qy) * df;          // screen y per unit of y
		ctx.transform(s * f, 0, dx, dy, EYE.x + qx * f - dx * y0, EYE.y + (OY + qy) * f - dy * y0);
	}

	/* ---------- buffers ---------- */

	// A buffer painted once, and again after a resize (which clears it).
	// paint(ctx) returns false while its images are still loading.
	function cached(w, h, paint) {
		const surf = stage.surface(w, h);
		let ready = false;
		const fit = surf.resize;
		surf.resize = function () {
			fit();
			ready = false;
		};
		surf.paint = function () {
			if (!ready) {
				surf.clear();
				ready = paint(surf.ctx);
			}
			return ready;
		};
		return surf;
	}

	// funrunbg:before, the farm stretched over the world with a green glow
	// along its bottom edge (all at opacity 0.8 when drawn).
	const farm = cached(IGB.WIDTH, H, function (f) {
		if (!art.ready(FARM)) return false;
		art.image(f, FARM, 0, 0, IGB.WIDTH, H);
		art.inset(f, (c) => c.rect(0, 0, IGB.WIDTH, H), { color: '#879B60', blur: 50, y: -20 });
		return true;
	});

	// The theatre wall without its show: wood with an orange glow along the
	// top, the darkened wooden screen and its platform.
	const wallBack = cached(W, H, function (f) {
		if (!art.ready(WOOD)) return false;
		art.tile(f, WOOD, 0, 0, W, H, W * 0.2);
		art.inset(f, (c) => c.rect(0, 0, W, H), { color: 'orange', blur: 10, y: 5 });

		f.save();
		f.translate(SCREEN.x, SCREEN.y);
		art.tile(f, WOOD, 0, 0, SCREEN.w, SCREEN.h, SCREEN.w * 0.2);
		art.inset(f, (c) => c.rect(0, 0, SCREEN.w, SCREEN.h), { color: 'rgba(0,0,0,0.5)', blur: 40 });
		art.rect(f, 0, 0, SCREEN.w, SCREEN.h, { fill: 'black', alpha: 0.3 });
		art.rect(f, 0, SCREEN.h - PLATFORM, SCREEN.w, PLATFORM, { fill: '#6C4732' });
		art.inset(f, (c) => c.rect(0, SCREEN.h - PLATFORM, SCREEN.w, PLATFORM), { color: 'rgba(0,0,0,0.5)', blur: 50 });
		f.restore();
		return true;
	});

	const wall = stage.surface(W, H);
	const floor = stage.surface(FLOOR.w, FLOOR.d + FLOOR.shadow);

	/* ---------- art ---------- */

	// Frame n of the animals sprite, size x size, its top-left at (x, y).
	function drawAnimal(ctx, n, x, y, size) {
		const img = art.ready(ANIMALS);
		if (!img) return;
		const fw = img.naturalWidth / 6;
		ctx.drawImage(img, n * fw, 0, fw, img.naturalHeight, x, y, size, size);
	}

	// Text the way a CSS line box set it: centred across `width` from x (or
	// start-aligned there if wider, as overflowing lines are), and centred
	// in a line `lineHeight` tall from y, by the font's ascent and descent.
	function drawLine(ctx, str, x, y, width, lineHeight, size) {
		ctx.save();
		ctx.font = `600 ${size}px Rubik, sans-serif`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		const m = ctx.measureText(str);
		const ascent = m.fontBoundingBoxAscent;
		const descent = m.fontBoundingBoxDescent;
		const left = m.width > width ? x : x + (width - m.width) / 2;
		ctx.fillStyle = 'white';
		ctx.fillText(str, left, y + lineHeight / 2 + (ascent - descent) / 2);
		ctx.restore();
	}

	// The wall, its screen and the show on it, flat in wall units.
	function paintWall(f) {
		wall.clear();
		if (!wallBack.paint()) return;
		f.drawImage(wallBack.canvas, 0, 0, W, H);

		f.save();
		f.beginPath();
		f.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
		f.clip();
		f.translate(SCREEN.x, SCREEN.y);

		// The parade walks along the platform, 50 up from the bottom. The
		// meeps' hands (z-index: 1) come over every carrier, then the curtain
		// (z-index: 1 too) over everything.
		if (vignette && !vignette.removed) {
			for (const c of vignette.carriers) {
				c.meep.x = c.left;
				c.meep.y = SCREEN.h - 50;
				c.meep.draw(f, 'body');
				drawAnimal(f, c.item, c.left - 250, SCREEN.h - 50 - 350, 300);
			}
			for (const c of vignette.carriers) c.meep.draw(f, 'hands');
		}

		const cw = curtain.w * SCREEN.w;
		art.image(f, CURTAIN, 0, 0, cw, SCREEN.h);
		art.image(f, CURTAIN, SCREEN.w - cw, 0, cw, SCREEN.h);
		f.restore();
	}

	// The stage floor and the answers lying on it, flat in floor units.
	function paintFloor(f) {
		floor.clear();
		art.tile(f, WOOD, 0, 0, FLOOR.w, FLOOR.d, FLOOR.w * 0.2);
		art.rect(f, 0, FLOOR.d, FLOOR.w, FLOOR.shadow, { fill: '#432D22' });   // box-shadow: 0 50px

		if (!options || options.removed || !options.visible) return;

		options.options.forEach(function (option, o) {
			const x = OPTION.x + o * OPTION.w;
			const box = { x: x + 25, y: 50, w: OPTION.w - 50, h: OPTION.h - 100 };

			// Text is in-flow, so the (positioned) box paints over it.
			if (options.type === 'text') drawLine(f, String(option.t), x, 0, OPTION.w, OPTION.h, W / 6);

			let fill = 'rgba(0,0,0,0.3)';
			if (options.isShowingCorrect && option.isCorrect) {
				// radial-gradient(transparent, green): an ellipse reaching the
				// corners of the padding box (below the 10px top border)
				const rx = box.w / 2 * Math.SQRT2;
				const ry = (box.h - 10) / 2 * Math.SQRT2;
				f.save();
				f.beginPath();
				art.roundRectPath(f, box.x, box.y, box.w, box.h, 20);
				f.translate(box.x + box.w / 2, box.y + 10 + (box.h - 10) / 2);
				f.scale(rx / ry, 1);
				f.fillStyle = art.radial(f, 0, 0, 0, ry, ['rgba(50,205,50,0)', 'limegreen']);
				f.fill();
				f.restore();
				fill = null;
			}
			if (fill) art.roundRect(f, box.x, box.y, box.w, box.h, 20, { fill });

			// border-top: 10px solid rgba(0,0,0,0.5), following the corners
			f.save();
			f.beginPath();
			art.roundRectPath(f, box.x, box.y, box.w, box.h, 20);
			f.clip();
			f.beginPath();
			f.rect(box.x, box.y, box.w, 20);
			f.clip();
			f.beginPath();
			f.rect(box.x, box.y, box.w, 20);
			art.roundRectPath(f, box.x, box.y + 10, box.w, box.h - 10, [{ x: 20, y: 10 }, { x: 20, y: 10 }, 20, 20]);
			f.fillStyle = 'rgba(0,0,0,0.5)';
			f.fill('evenodd');
			f.restore();

			if (options.type === 'meep') {
				// a head at scale(2), centred in the option
				Meep.drawHead(f, option.m, x + OPTION.w / 2 - Meep.HEAD.w, OPTION.h / 2 - Meep.HEAD.h, 2);
			} else if (options.type !== 'text') {
				drawAnimal(f, option.i, x, 210, OPTION.w);
			}
		});
	}

	// A player's meep standing on the floor, and its "+1" when it scores.
	function drawPlayer(ctx, meep) {
		const x = meep.left - FLOOR.w / 2;
		const z = meep.top - FLOOR.d;

		ctx.save();
		// What is below the floor stays hidden behind it.
		const ground = project(x, 0, z).y;
		ctx.beginPath();
		ctx.rect(-IGB.WIDTH, -10 * H, 3 * IGB.WIDTH, ground + 10 * H);
		ctx.clip();

		ctx.save();
		upright(ctx, x, z, -meep.h / 2);
		meep.draw(ctx, 'body');
		ctx.restore();

		if (meep.tick) {
			const top = -(meep.tick.bottom + 100);
			ctx.save();
			upright(ctx, x, z, top + 50);
			drawLine(ctx, '+1', -50, top, 100, 100, 100);
			ctx.restore();
		}

		ctx.save();
		upright(ctx, x, z, -meep.h / 2);
		meep.draw(ctx, 'hands');
		ctx.restore();

		ctx.restore();
	}

	/* ---------- game flow ---------- */

	const self = this;

	const curtain = { w: 0.5 };   // each half's share of the screen
	let showGlass = true;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const meeps = [];
	function initGame(count) {
		for (let i = 0; i < count; i++) {
			meeps[i] = new Meep(i);
			// where it stands on the floor, in floor px (its top-left until
			// the tracker reports)
			meeps[i].left = 0;
			meeps[i].top = 0;
		}

		stage.timeout(initTutorial, 1000);
	}

	function initTutorial() {

		hud.initTutorial('Town Fair',
			{ x: 1.3, y: 0.5, msg: 'When the curtain opens,<br>watch the sequence carefully', icon: 'watch' },
			{ x: 1.7, y: 0.5, msg: 'Move left & right to answer<br>a simple question', icon: 'side-to-side' },
		);

		toWall();

		stage.timeout(function () {
			vignette = new FunRunVignette(TUTORIAL.parade, finiTutorialVignette);
		}, 4000);

		stage.timeout(function () {
			openCurtain();
			audio.play('curtain');
		}, 4200);

		stage.timeout(function () {
			options.showCorrect();
			audio.play('correct');
		}, 25000);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorialVignette() {
		closeCurtain();
		audio.play('curtain');

		options = new FunRunOptions(TUTORIAL.type, TUTORIAL.options);

		toFloor();
	}

	function finiTutorial() {
		showGlass = false;
		hud.finiTutorial();
		hud.finiTimer();

		options.removed = true;
		vignette.remove();

		stage.timeout(initPlay, 2000);
	}

	function initPlay() {
		hud.initPlayers(meeps);
		stage.timeout(initNextQuestion, 2000);
	}

	let nQuestion = -1;

	function initNextQuestion() {
		nQuestion++;

		audio.play('music');

		toWall();
		hud.initRound(nQuestion, QUESTIONS.length);
		stage.timeout(initVignette, 2000);
	}

	let vignette;
	let question;
	let options;

	function initVignette() {
		hud.finiBanner();

		question = QUESTIONS[nQuestion];

		vignette = new FunRunVignette(question.parade, finiVignette);

		options = new FunRunOptions(question.type, question.options);
		options.visible = false;

		stage.timeout(function () {
			audio.play('curtain');
			openCurtain();
		}, 500);
	}

	function finiVignette() {
		audio.play('curtain');
		closeCurtain();
		stage.timeout(function () {
			toFloor();
			hud.initBanner(question.q, 'small');
			hud.initTimer(10, initSolution);
			options.visible = true;
		}, 1000);
	}

	function initSolution() {

		hud.finiBanner();
		hud.finiTimer();

		options.showCorrect();

		let isAnyoneCorrect = false;

		for (const meep of meeps) {
			meep.isFrozen = true;
			meep.iVote = Math.floor(meep.px * 4);

			// Standing past either end of the floor (px outside 0..1) once
			// threw here and stalled the game: it counts as the end box.
			const option = question.options[Number.isFinite(meep.iVote) ? clamp(meep.iVote, 0, 3) : -1];
			if (option && option.isCorrect) {
				meep.score++;

				meep.tick = { bottom: 400 };
				$(meep.tick).animate({
					bottom: 450,
				}, 200).animate({
					bottom: 400,
				}, 200);

				isAnyoneCorrect = true;
			}
		}

		audio.play(isAnyoneCorrect ? 'correct' : 'incorrect');

		hud.updatePlayers(meeps);

		stage.timeout(finiQuestion, 2000);
	}

	function finiQuestion() {

		for (const meep of meeps) {
			if (meep.tick) $(meep.tick).stop(true);
			meep.tick = undefined;
		}

		options.removed = true;
		vignette.remove();

		for (const meep of meeps) meep.isFrozen = false;

		if (QUESTIONS[nQuestion + 1]) initNextQuestion();
		else finiGame();
	}

	function finiGame() {
		toWall();

		audio.stop('music');

		const scores = [];
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].visible = false;
			scores[m] = meeps[m].score;
		}

		const rewards = window.scoresToRewards(scores);

		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			IGB.complete(rewards);
		}, 5000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	// The world's and the background's 1s `ease` transitions.
	function toWall() {
		$(view).stop(true).animate({ k: 0 }, { duration: 1000, easing: 'ease' });
	}

	function toFloor() {
		$(view).stop(true).animate({ k: 1 }, { duration: 1000, easing: 'ease' });
	}

	// The curtain halves' width transition: 50% each, 5% open.
	function openCurtain() {
		$(curtain).stop(true).animate({ w: 0.05 }, { duration: 1000, easing: 'ease' });
	}

	function closeCurtain() {
		$(curtain).stop(true).animate({ w: 0.5 }, { duration: 1000, easing: 'ease' });
	}

	// (The old game called toFloor() here, before its first paint, so the
	// world started at the floor view without a transition: view.k = 1.)

	function step() {
		for (const meep of meeps) {
			if (!meep.isFrozen) {
				// jQuery's .css() ignored NaN before the tracker reported
				const left = meep.px * W;
				const top = meep.py * W / 2;
				if (Number.isFinite(left)) meep.left = left;
				if (Number.isFinite(top)) meep.top = top;
			}
		}
	}

	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		setCamera();

		// funrunbg: sand colour, the farm (raised from 200 to H - 150 above
		// the bottom in the floor view) and the grassy ground below it (200
		// tall, H - 150 in the floor view).
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: '#FAB14B' });
		const raise = lerp(200, H - 150, view.k);
		if (farm.paint()) {
			ctx.save();
			ctx.globalAlpha *= 0.8;
			ctx.drawImage(farm.canvas, 0, -raise, IGB.WIDTH, H);
			ctx.restore();
		}
		const ground = lerp(200, H - 150, view.k);
		art.tile(ctx, GRASS, 0, H - ground, IGB.WIDTH, ground, IGB.WIDTH * 0.4, ground * 0.2);
		art.rect(ctx, 0, H - ground, IGB.WIDTH, ground, {
			fill: art.linear(ctx, 0, H - ground, 0, H, ['#FAB14B', 'rgba(250,177,75,0)']),
		});

		if (showGlass) art.glass(ctx);

		// The world: the wall, the floor, then the meeps back to front.
		paintWall(wall.ctx);
		layPlane(ctx, wall, WALL_PLANE);
		paintFloor(floor.ctx);
		layPlane(ctx, floor, FLOOR_PLANE);

		const standing = meeps.filter((m) => m.visible).sort((a, b) => a.top - b.top);
		for (const meep of standing) drawPlayer(ctx, meep);
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		meeps.forEach(function (meep, m) {
			meep.px = (p[m].px);
			meep.py = (1 - p[m].pz);
		});
	};
});
