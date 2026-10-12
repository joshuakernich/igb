/*
 * The Claw
 *
 * A wooden turntable on the front wall, covered in stacks of coins, one
 * colour per player, with each player's claw crane hanging over it. Players
 * take turns: the one called forward moves around the box to steer their
 * claw over a stack before the timer runs out; the claw drops, grabs, and
 * tips the stack into the chute in the middle. Every coin that drops is a
 * point to the grabber and a point off the stack's owner. Two rounds, the
 * turntable turning faster in the second.
 *
 * The old game was a CSS 3D scene: a tilted disc with flat pieces standing
 * up on it. Here the projection is done by hand. The turntable's surface is
 * painted flat into a buffer and laid onto the screen in perspective one
 * pixel row at a time, then the standing pieces (claws, their shades, coin
 * stacks) are drawn back to front, each through the affine map that matches
 * the perspective at its centre.
 *
 * Input: px (left / right steers the claw), pz (towards / away from the
 * front wall).
 */
IGB.register('the-claw', function TheClawGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const PLATFORM = W;
	const FPS = 50;
	const CLAW = 200;
	const ITEM = 300;
	const COIN = 100;
	const ALTITUDE = 250;
	const ROUNDS = [{ speed: 0.25 }, { speed: 0.5 }]; // represents radians per second

	// The camera: CSS perspective (W * 3) looking at the middle of the
	// world. The turntable tilts back about its bottom edge, which sits
	// 40 up from the bottom of the front wall.
	const PERSPECTIVE = W * 3;
	const EYE = { x: W * 1.5, y: H / 2 };
	const PIVOT = { x: W * 1.5, y: H - 40 };

	const BG = 'assets/shared/bg-mountains-clouds.png';
	const WOOD = 'assets/shared/texture-wood.png';
	const COINS = 'assets/shared/sprite-coin.png';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-heist.mp3', 0.3, true, true);
	audio.add('purse', 'assets/the-claw/sfx-purse.mp3', 0.3);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.3);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
	audio.add('machine', 'assets/the-claw/sfx-machine.mp3', 0.3, true, true);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.1);

	/* ---------- the pieces ---------- */

	// A stack of one player's coins. Each coin's bottom and left are the
	// CSS offsets it had inside the stack.
	function Claw3DStack(n, coins) {
		const self = this;
		self.coins = [];

		for (let i = 0; i < coins; i++) {
			self.coins[i] = { bottom: 35 + i * 20, left: 0, visible: true };
		}
	}

	function Claw3DItem(n, coins) {
		const self = this;
		self.n = n;
		self.coins = coins;

		self.altitude = 1;
		self.isFloor = true;

		self.r = 0;
		self.d = 0;

		self.stack = new Claw3DStack(n, coins);

		// Ride the turntable round (it was redraw(), which also placed the DOM).
		self.update = function () {
			if (self.isFloor) {
				self.px = 0.5 + Math.cos(self.r) * self.d;
				self.py = 0.5 + Math.sin(self.r) * self.d;
			}
		};
	}

	function Claw3DClaw(n) {
		const self = this;
		self.n = n;
		self.visible = true;

		self.altitude = 1;
		self.open = 0;
		self.score = 0;
		self.x = 0;
		self.y = 0;

		self.yRange = 0.1;

		self.popups = []; // the floating +1s and −1s

		// Follow the player (it was redraw(), which also placed the DOM).
		self.update = function () {
			if (self.isActive) {
				self.x = self.px;
				self.y = self.py * self.yRange;
			}
		};

		function popup(text) {
			const p = { text, opacity: 1, bottom: 200 + self.altitude * ALTITUDE };
			self.popups.push(p);
			$(p).animate({ opacity: 0, bottom: self.altitude * ALTITUDE + 400 }, 500, function () {
				self.popups.splice(self.popups.indexOf(p), 1);
			});
		}

		self.addScore = function (score) {
			popup('+' + score);
			self.score += score;
		};

		self.subtractScore = function (score) {
			popup('−' + score);
			self.score -= score;
		};
	}

	/* ---------- the scene ---------- */

	// The turntable's tilt, rotateX(deg), eased over a second like the CSS
	// transition it was.
	const tilt = { from: 60, to: 60, p: 1 };

	function tiltDeg() {
		return tilt.from + (tilt.to - tilt.from) * cssEase(tilt.p);
	}

	function setTilt(deg) {
		tilt.from = tiltDeg();
		tilt.to = deg;
		tilt.p = 0;
		$(tilt).stop(true).animate({ p: 1 }, { duration: 1000, easing: 'linear' });
	}

	// CSS's `ease` curve, cubic-bezier(0.25, 0.1, 0.25, 1).
	function cssEase(x) {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		const bezier = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
		let lo = 0;
		let hi = 1;
		let t = x;
		for (let i = 0; i < 30; i++) {
			t = (lo + hi) / 2;
			if (bezier(t, 0.25, 0.25) < x) lo = t;
			else hi = t;
		}
		return bezier(t, 0.1, 1);
	}

	let cos = 0.5;  // of the tilt, set each frame
	let sin = Math.sqrt(0.75);

	// Where a point of the turntable lands in the world: (u, v) across and
	// down its square (0..PLATFORM, v grows towards the front), h up from
	// its surface. s is how much things there are scaled by distance.
	function project(u, v, h) {
		const x = PIVOT.x - EYE.x + u - PLATFORM / 2;
		const y = PIVOT.y - EYE.y + cos * (v - PLATFORM) - sin * h;
		const z = sin * (v - PLATFORM) + cos * h;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + x * s, y: EYE.y + y * s, s, dx: x, dy: y };
	}

	// The turntable row (v) that lands on world row y: project() run backwards.
	function rowAt(y) {
		const t = y - EYE.y;
		return PLATFORM + PERSPECTIVE * (t - (PIVOT.y - EYE.y)) / (cos * PERSPECTIVE + t * sin);
	}

	// Hide what is below the surface at row v, as the turntable hid it.
	function clipToSurface(ctx, v) {
		const y = project(PLATFORM / 2, v, 0).y;
		ctx.beginPath();
		ctx.rect(-IGB.WIDTH, -10 * H, 3 * IGB.WIDTH, y + 10 * H);
		ctx.clip();
	}

	// Set up ctx to draw in the plane standing upright on the turntable at
	// row v: x across as on the turntable (u), y = -h (up is negative, as in
	// CSS). The plane leans back with the tilt and shrinks with distance;
	// the map is exact at (a, -h) and within a fraction of a pixel across
	// anything the size of a claw.
	function upright(ctx, u, v, a, h) {
		const p = project(u + a, v, h);
		const ds = p.s * p.s * cos / PERSPECTIVE; // how s grows with h
		const cx = -p.dx * ds;
		const cy = sin * p.s - p.dy * ds;
		ctx.transform(p.s, 0, cx, cy, p.x - p.s * a + cx * h, p.y + cy * h);
	}

	/* ---------- the turntable's surface ---------- */

	// Painted flat into a buffer in turntable units, with room around it for
	// its shadows and for a claw's ring when its player stands at the very
	// edge of the room (the ring then hangs off the disc, as it did in CSS),
	// then laid onto the screen in perspective.
	const PAD = CLAW / 2 + 30;
	const floor = stage.surface(PLATFORM + PAD * 2, PLATFORM + 50 + PAD * 2);

	// A wooden disc filling the square (x, x, size), shadowed all round, its
	// grain starting from the square's corner.
	function disc(f, x, size) {
		const c = x + size / 2;
		art.circle(f, c, c, size / 2, { fill: 'black', shadow: { color: 'black', blur: 10 } });
		f.save();
		f.beginPath();
		f.arc(c, c, size / 2, 0, Math.PI * 2);
		f.clip();
		art.tile(f, WOOD, x, x, size, size);
		f.restore();
	}

	function paintSurface(f) {
		const C = PLATFORM / 2;

		// the turntable, its edge a solid shadow 50 to the front
		art.circle(f, C, C + 50, C, { fill: 'black' });
		f.save();
		f.beginPath();
		f.arc(C, C, C, 0, Math.PI * 2);
		f.clip();
		art.tile(f, WOOD, 0, 0, PLATFORM, PLATFORM);
		f.restore();

		// the turning ring, then the hub
		f.save();
		f.translate(C, C);
		f.rotate(r);
		f.translate(-C, -C);
		disc(f, PLATFORM * 0.03, PLATFORM * 0.94);
		f.restore();
		disc(f, PLATFORM * 0.35, PLATFORM * 0.3);

		// the chute: a shadow, then a green pipe end standing 50 proud
		art.ellipse(f, C + 50, C + 5, (ITEM + 100) / 2, ITEM / 2, { fill: 'black', alpha: 0.2 });
		art.circle(f, C, C, ITEM / 2, { fill: 'green' });
		art.circle(f, C, C - 50, ITEM / 2, { fill: 'black' });
		art.border(f, C - ITEM / 2, C - 50 - ITEM / 2, ITEM, ITEM, ITEM / 2, 20, { fill: 'limegreen' });

		// each claw's ring on the floor, then each stack's shadow
		for (const claw of claws) {
			const o = claw.yRange - 0.1;
			if (!claw.visible || !(o > 0) || !placed(claw.x, claw.y)) continue;
			const x = claw.x * PLATFORM;
			const y = claw.y * PLATFORM;
			art.circle(f, x, y, CLAW / 2 - 30, { fill: 'rgba(0,0,0,0.3)', alpha: o });
			art.border(f, x - CLAW / 2, y - CLAW / 2, CLAW, CLAW, CLAW / 2, 30, { fill: PLAYER_COLORS[claw.n], alpha: o });
		}
		for (const item of items) {
			art.ellipse(f, item.px * PLATFORM + 50, item.py * PLATFORM, 80, 60, { fill: 'rgba(0,0,0,0.3)' });
		}
	}

	function drawSurface(ctx) {
		const f = floor.ctx;
		floor.clear();
		f.save();
		f.translate(PAD, PAD);
		paintSurface(f);
		f.restore();

		// Each row of the turntable lands on one row of the screen, scaled
		// about the middle, so lay it down a device pixel row at a time.
		const ky = ctx.getTransform().d;
		const kb = floor.canvas.height / floor.h;
		const top = project(0, -PAD, 0).y;
		const bottom = project(0, floor.h - PAD, 0).y;
		const left = PIVOT.x - EYE.x - PLATFORM / 2 - PAD;
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const y0 = j / ky;
			const y1 = (j + 1) / ky;
			const v0 = Math.max(-PAD, rowAt(y0));
			const v1 = Math.min(floor.h - PAD, rowAt(y1));
			if (v1 <= v0) continue;
			const s = PERSPECTIVE / (PERSPECTIVE - sin * ((v0 + v1) / 2 - PLATFORM));
			ctx.drawImage(floor.canvas,
				0, (v0 + PAD) * kb, floor.canvas.width, (v1 - v0) * kb,
				EYE.x + left * s, y0, floor.w * s, y1 - y0);
		}
	}

	/* ---------- the pieces standing on it ---------- */

	function placed(x, y) {
		return Number.isFinite(x) && Number.isFinite(y);
	}

	// One half of the claw's grip: a white hook, thick at the top, open to
	// the right, with a nub at its tip. 100 x 160, hinged at its top right.
	function drawClamp(ctx) {
		ctx.beginPath();
		art.roundRectPath(ctx, 0, 0, CLAW / 2, CLAW * 0.8, [{ x: CLAW / 2, y: CLAW * 0.8 }, 0, 0, { x: CLAW / 2, y: CLAW * 0.8 }]);
		art.roundRectPath(ctx, 10, 60, CLAW / 2 - 10, CLAW * 0.8 - 70, [{ x: 40, y: 20 }, 0, 0, { x: 40, y: 70 }]);
		ctx.fillStyle = 'white';
		ctx.fill('evenodd');
		art.roundRect(ctx, CLAW / 2 - 30, CLAW * 0.8 - 20, 30, 30, 10, { fill: 'white' });
	}

	function drawClaw(ctx, claw) {
		const u = claw.x * PLATFORM;
		const v = claw.y * PLATFORM;
		const lift = ALTITUDE * claw.altitude;

		// the cable, from the top of the grip up out of sight
		const corners = [[-15, lift + CLAW], [15, lift + CLAW], [15, lift + CLAW + 1000], [-15, lift + CLAW + 1000]];
		art.poly(ctx, corners.map(([a, h]) => project(u + a, v, h)), { fill: '#333' });

		// the grip, its box CLAW square with its bottom `lift` up
		ctx.save();
		upright(ctx, u, v, 0, lift + CLAW / 2);
		ctx.translate(-CLAW / 2, -(lift + CLAW));
		const angle = (12 + claw.open * 28) * Math.PI / 180;
		ctx.save();
		ctx.translate(CLAW / 2, 0);
		ctx.rotate(angle);
		ctx.translate(-CLAW / 2, 0);
		drawClamp(ctx);
		ctx.restore();
		ctx.save();
		ctx.translate(CLAW / 2, 0);
		ctx.scale(-1, 1);
		ctx.rotate(angle);
		ctx.translate(-CLAW / 2, 0);
		drawClamp(ctx);
		ctx.restore();
		Meep.drawHead(ctx, claw.n, CLAW / 2 - 50, -75);
		ctx.restore();

		for (const p of claw.popups) {
			ctx.save();
			upright(ctx, u, v, 0, p.bottom + 50);
			art.text(ctx, p.text, 0, -(p.bottom + 50), {
				size: 100, weight: 600, fill: 'white', alpha: p.opacity,
				shadow: { color: 'black', blur: 15 },
			});
			ctx.restore();
		}
	}

	// A dark glow rising from the floor under the claw, standing 50 in front of it.
	function drawShade(ctx, claw, o) {
		const u = claw.x * PLATFORM;
		const v = claw.y * PLATFORM + CLAW / 4;
		ctx.save();
		clipToSurface(ctx, v);
		upright(ctx, u, v, 0, 150);
		ctx.globalAlpha *= o;
		ctx.filter = `blur(${art.px(ctx, 10)}px)`;
		const fill = art.linear(ctx, 0, 0, 0, -CLAW * 5, ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']);
		art.roundRect(ctx, -CLAW / 2, -CLAW * 5, CLAW, CLAW * 5, [0, 0, CLAW / 2, CLAW / 2], { fill });
		ctx.restore();
	}

	// Each player's coin: the sprite's second frame in their row, cut out
	// once so drawing it scaled never picks up the edge of the next frame.
	const coinFrames = [];
	function coinFrame(n) {
		if (coinFrames[n]) return coinFrames[n];
		const img = art.ready(COINS);
		if (!img) return null;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = COIN;
		canvas.getContext('2d').drawImage(img, COIN, COIN * n, COIN, COIN, 0, 0, COIN, COIN);
		return (coinFrames[n] = canvas);
	}

	// A stack of coins, standing 30 in front of its spot, each coin turned
	// on its side.
	function drawStack(ctx, item) {
		const frame = coinFrame(item.n);
		if (!frame) return;
		const u = item.px * PLATFORM;
		const v = item.py * PLATFORM + 30;
		const lift = ALTITUDE * item.altitude;
		ctx.save();
		clipToSurface(ctx, v);
		for (const coin of item.stack.coins) {
			if (!coin.visible) continue;
			const h = lift + coin.bottom;
			ctx.save();
			upright(ctx, u, v, coin.left, h);
			ctx.translate(coin.left, -h);
			ctx.rotate(Math.PI / 2);
			ctx.drawImage(frame, -COIN / 2, -COIN / 2, COIN, COIN);
			ctx.restore();
		}
		ctx.restore();
	}

	/* ---------- game flow ---------- */

	const self = this;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	let r = 0; // the turning ring's angle

	const items = [];
	const claws = [];
	const turnOrder = [];
	function initGame(count) {
		for (let i = 0; i < count; i++) {

			claws[i] = new Claw3DClaw(i);
			claws[i].isActive = true;

			turnOrder[i] = i;
		}

		shuffleArray(turnOrder);

		stage.timeout(initTutorial, 1000);
	}

	const slots = [];

	const circles = [
		{ r: 0.2, cnt: 10 },
		{ r: 0.3, cnt: 15 },
		{ r: 0.4, cnt: 25 },
	];

	for (let c = 0; c < circles.length; c++) {
		for (let i = 0; i < circles[c].cnt; i++) {
			slots.push({
				r: (1 / circles[c].cnt * i + c / circles.length) * Math.PI * 2,
				d: circles[c].r,
			});
		}
	}

	function initTutorial() {
		initCoins();

		for (const claw of claws) {
			$(claw).animate({ yRange: 1 });
		}

		setTilt(70);

		hud.initTutorial('Claw Chaos',
			{ x: 1.5, y: 0.45, msg: 'Move around the box<br>to position the claw', icon: 'around' },
		);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		hud.finiTimer();
		hud.finiTutorial();

		for (const claw of claws) {
			$(claw).animate({ yRange: 0.1 });
		}

		items.length = 0;

		stage.timeout(initPlay, 2000);
	}

	function initPlay() {

		setTilt(80);

		hud.initPlayers(claws);
		initCoins();
		stage.timeout(initNextClaw, 1000);
	}

	function initCoins() {

		for (let c = 0; c < claws.length; c++) {

			let count = Math.floor(10 + Math.random() * 40);

			while (count) {
				let amt = count;
				if (count > 3) amt = Math.min(10, count / 3, 3 + Math.floor(Math.random() * (count - 3)));
				const item = new Claw3DItem(c, amt);
				item.update();
				items.push(item);

				count -= amt;

				item.altitude = 1;
				$(item).animate({ altitude: 0 }, 200 + Math.random() * 200);
			}

		}

		// Six players can make more stacks than there are slots (the old
		// code threw here and the game stalled); extra stacks reuse slots.
		shuffleArray(slots);
		for (let i = 0; i < items.length; i++) {
			items[i].r = slots[i % slots.length].r;
			items[i].d = slots[i % slots.length].d;
		}
	}

	let iRound = -1;
	function initNextRound() {

		turnOrder.reverse();
		for (const claw of claws) {
			$(claw).animate({ yRange: 0.1 });
		}

		iRound++;

		if (iRound >= ROUNDS.length) {
			finiGame();
			return;
		}

		stage.timeout(function () {
			hud.initRound(iRound, ROUNDS.length);
			audio.play('music', false, (iRound === ROUNDS.length - 1) ? 1.5 : 1);
		}, 2000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 4000);

		stage.timeout(function () {
			initClaw(0);
		}, 6000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function step() {

		for (const claw of claws) {

			if (claw.grabbed) {
				claw.grabbed.altitude = claw.altitude;
				claw.grabbed.px = claw.x;
				claw.grabbed.py = claw.y;
			}

			claw.update();
		}

		for (const item of items) {
			if (item.isFloor && ROUNDS[iRound]) item.r += (ROUNDS[iRound].speed) / FPS;
			item.update();
		}

		hud.updatePlayers(claws);

		r += 0.005;
	}

	let nPlayer = -1;
	function initNextClaw() {
		nPlayer++;
		nPlayer = nPlayer % claws.length;

		if (nPlayer === 0) {
			initNextRound();
		} else {
			initClaw(nPlayer);
		}
	}

	let n = undefined;
	function initClaw(nth) {

		n = turnOrder[nth];

		for (let c = 0; c < claws.length; c++) {
			if (c === n) {
				$(claws[c]).animate({ yRange: 1 });
			} else {
				$(claws[c]).animate({ yRange: 0.1 });
			}
		}

		setTilt(60);

		stage.timeout(function () {
			hud.summonPlayers([n]);
		}, 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 3000);

		stage.timeout(function () {
			hud.initTimer(10, initGrab);

			$(claws[n]).animate({
				open: 1,
			}, {
				start: function () { audio.play('machine'); },
				complete: function () { audio.stop('machine'); },
			});
		}, 4000);
	}

	function initGrab() {

		claws[n].isActive = false;

		hud.finiTimer();

		$(claws[n]).delay(200).animate({
			altitude: 0,
			open: 0,
		}, {
			duration: 500,
			start: function () { audio.play('machine'); },
			complete: function () { audio.stop('machine'); },
		}).animate({
			altitude: 1,
		}, {
			duration: 500,
			start: function () { audio.play('machine'); },
			complete: function () { audio.stop('machine'); },
		}).delay(500).animate({
			x: 0.5,
			y: 0.5,
		}, {
			duration: 500,
			start: function () { audio.play('machine'); },
			complete: function () { audio.stop('machine'); },
		});

		stage.timeout(function () {

			let min = 0.1;
			let grabbing = undefined;
			for (const item of items) {

				const dx = item.px - claws[n].x;
				const dy = item.py - claws[n].y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < min) {
					min = d;
					grabbing = item;
				}
			}

			if (grabbing) {
				claws[n].grabbed = grabbing;
				grabbing.isFloor = false;
				grabbing.claw = claws[n];
				audio.play('purse', true);
			}
		}, 700);

		stage.timeout(function () {
			setTilt(80);
		}, 2000);


		stage.timeout(initRelease, 4000);
	}

	function initRelease() {
		const grabbed = claws[n].grabbed;

		claws[n].grabbed = undefined;
		$(claws[n]).animate({
			open: 1,
		}, 200).delay(1000).animate({
			open: 0,
		});

		if (grabbed) {
			grabbed.claw = undefined;

			for (const coin of grabbed.stack.coins) {
				const bottom = parseInt(coin.bottom, 10);
				$(coin).animate({
					bottom: -ALTITUDE - 100,
					left: -100 + Math.random() * 200,
				}, {
					duration: 200 + bottom * 10,
					complete: function () {
						coin.visible = false;
						claws[n].addScore(1);
						audio.play('coin', true);
						if (grabbed.n > -1) claws[grabbed.n].subtractScore(1);
					},
				});
			}
			stage.timeout(initReset, 4000);
		} else {
			audio.play('incorrect', true);
			stage.timeout(initReset, 2000);
		}
	}

	function initReset() {

		claws[n].isActive = true;
		$(claws[n]).animate({ yRange: 0.1 });

		finiClaw();
	}

	function finiClaw() {
		stage.timeout(initNextClaw, 2000);
	}

	function finiGame() {
		const scores = [];
		for (let c = 0; c < claws.length; c++) {
			claws[c].visible = false;
			scores[c] = claws[c].score;
		}

		audio.stop('music');
		hud.showFinalScores(scores, scores);

		stage.timeout(function () {
			self.fini();
			IGB.complete(scores);
		}, 5000);
	}

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		const deg = tiltDeg() * Math.PI / 180;
		cos = Math.cos(deg);
		sin = Math.sin(deg);

		art.image(ctx, BG, 0, 0, IGB.WIDTH, H);
		drawSurface(ctx);

		// Everything standing on the turntable stands in parallel planes, so
		// back to front by row is the order the 3D scene sorted them in. Ties
		// keep the old DOM order: claws (each with its shade), then stacks.
		const standing = [];
		for (const claw of claws) {
			if (!claw.visible || !placed(claw.x, claw.y)) continue;
			const v = claw.y * PLATFORM;
			standing.push({ v, draw: () => drawClaw(ctx, claw) });
			const o = claw.yRange - 0.1;
			if (o > 0) standing.push({ v: v + CLAW / 4, draw: () => drawShade(ctx, claw, o) });
		}
		for (const item of items) {
			if (placed(item.px, item.py)) standing.push({ v: item.py * PLATFORM + 30, draw: () => drawStack(ctx, item) });
		}
		standing.sort((a, b) => a.v - b.v);
		for (const s of standing) s.draw();
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (let c = 0; c < claws.length; c++) {
			claws[c].px = (p[c].px);
			claws[c].py = (1 - p[c].pz);
		}
	};

	const interval = stage.interval(step, 1000 / FPS);
});
