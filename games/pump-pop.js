/*
 * Pump Pop
 *
 * Every player stands at a pump with a balloon tied to it, two players to
 * each wall (players 0 and 1 on the left wall, 2 and 3 on the front, 4 and
 * 5 on the right). Squatting drives the pump handle down and inflates the
 * balloon. The game ends when the first balloon pops or the minute runs
 * out; each player scores for every rival they out-pumped.
 *
 * Input: py (squat height).
 */
IGB.register('pump-pop', function PumpPopGame(stage) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 20;

	const BG = 'assets/pump-pop/bg-carnival.webp';

	/* ---------- art ---------- */

	// The air hose: a box 120 x 650 (content-box, so 135 x 665 with its
	// 15px left and bottom borders) whose right edge sits on the pump and
	// whose bottom is 70 above the feet. Only those two borders show, the
	// bottom-left corner rounded by 50%, so it is one curved line.
	function drawString(ctx) {
		const B = 15;
		const ow = 120 + B;
		const oh = 650 + B;
		const right = 0;
		const bottom = -70;
		const left = right - ow;
		const top = bottom - oh;
		const rx = ow / 2;
		const ry = oh / 2;
		const cx = left + rx;
		const cy = bottom - ry;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(left, top);
		ctx.lineTo(left, cy);
		ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI / 2, true);
		ctx.lineTo(right, bottom);
		ctx.lineTo(right, bottom - B);
		ctx.lineTo(cx, bottom - B);
		ctx.ellipse(cx, cy, rx - B, ry - B, 0, Math.PI / 2, Math.PI, false);
		ctx.lineTo(left + B, top);
		ctx.closePath();
		ctx.fillStyle = '#999';
		ctx.fill();
		ctx.restore();
	}

	// An inner shadow, as art.inset draws it, but casting it from an opaque
	// fill (`solid`): a canvas shadow multiplies the shadow colour's alpha by
	// the fill's, so art.inset's rgba fill would square a translucent
	// shadow's alpha (0.5 coming out as 0.25).
	function inset(ctx, path, shadow, solid) {
		ctx.save();
		ctx.beginPath();
		path(ctx);
		ctx.clip();
		ctx.beginPath();
		ctx.rect(-1e5, -1e5, 2e5, 2e5);
		path(ctx);
		art.setShadow(ctx, shadow);
		ctx.fillStyle = solid;
		ctx.fill('evenodd');
		ctx.restore();
	}

	// The balloon: a w x h ellipse centred on x, its bottom at `bottom`,
	// shaded like the CSS box-shadow: inset 0 -20px 50px rgba(0,0,0,.5),
	// inset 0 10px 10px rgba(255,255,255,.5) (the first listed on top).
	function drawBalloon(ctx, x, bottom, w, h, color) {
		const cy = bottom - h / 2;
		const path = (c) => {
			c.moveTo(x + w / 2, cy);
			c.ellipse(x, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
		};
		art.ellipse(ctx, x, cy, w / 2, h / 2, { fill: color });
		inset(ctx, path, { color: 'rgba(255,255,255,0.5)', blur: 10, y: 10 }, 'white');
		inset(ctx, path, { color: 'rgba(0,0,0,0.5)', blur: 50, y: -20 }, 'black');
	}

	/* ---------- a player at their pump ---------- */

	const PumpMeepSingle = function (n) {
		const self = this;

		self.score = 0;

		const audio = stage.audio();
		audio.add('pump', 'assets/pump-pop/pump-balloon.mp3', 0.3);
		audio.add('pop', 'assets/pump-pop/sfx-pop.mp3', 0.3);

		self.py = self.pyWas = 0;
		self.fill = 0;

		// Where the player's feet and pump stand (the old 0 x 0 element).
		self.left = 0;
		self.top = 0;

		const meep = new Meep(n);
		meep.handLeft.x = -60;
		meep.handLeft.y = 250;
		meep.handRight.x = 60;
		meep.handRight.y = 250;

		const color = PLAYER_COLORS[n] || 'orange';
		const handle = { bottom: 200 };
		const balloon = { width: 100, height: 120, visible: true };

		self.isPopped = false;
		self.isActive = false;

		self.step = function () {

			// Before the tracker reports, py is undefined; the old CSS
			// ignored the NaN and left the meep and handle where they were.
			const h = 900 - self.py * 800;
			if (Number.isFinite(h)) {
				meep.setHeight(h);
				handle.bottom = 610 - self.py * 800;
			}

			if (self.pyWas !== 0) {
				const dy = self.py - self.pyWas;
				if (self.isActive && dy > 0 && !self.isPopped) {
					self.fill += dy;
					self.score = Math.min(100, self.fill * 10);
					balloon.width = 100 + self.fill * 50;
					balloon.height = 120 + self.fill * 50;

					if (self.fill > 10) {
						self.isPopped = true;
						balloon.visible = false;
						audio.play('pop');
					}

					audio.play('pump');
				}
			}

			self.pyWas = self.py;
		};

		// Everything but the hands: the meep, then the hose, the pump body,
		// its handle and the balloon, in the old DOM order.
		self.drawBody = function (ctx) {
			ctx.save();
			ctx.translate(self.left, self.top);
			meep.draw(ctx, 'body');
			drawString(ctx);
			art.rect(ctx, -75, -100, 150, 100, { fill: color });
			art.rect(ctx, -75, -handle.bottom - 30, 150, 30, { fill: color });
			if (balloon.visible) drawBalloon(ctx, -120, -650, balloon.width, balloon.height, color);
			ctx.restore();
		};

		// The hands (z-index: 1 in the CSS meep) go over every pump.
		self.drawHands = function (ctx) {
			ctx.save();
			ctx.translate(self.left, self.top);
			meep.draw(ctx, 'hands');
			ctx.restore();
		};
	};

	/* ---------- the game ---------- */

	const audio = stage.audio();
	audio.add('music', 'assets/pump-pop/music-cartoon.mp3', 0.3, true);

	const self = this;

	const pumps = [];

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	let isGameComplete = false;

	function step() {
		for (let p = 0; p < pumps.length; p++) {
			pumps[p].step();
			if (pumps[p].isPopped && !isGameComplete) doGameComplete();
		}
	}

	function doGameComplete() {

		hud.clearTimer();

		isGameComplete = true;
		clearInterval(interval);
		stage.timeout(function () {

			const scores = [];
			for (let a = 0; a < pumps.length; a++) {
				scores[a] = 0;
				for (let b = 0; b < pumps.length; b++) {
					if (a !== b && pumps[a].score > pumps[b].score) scores[a] += 5;
				}
			}

			const rewards = window.scoresToRewards(scores);
			self.fini();
			IGB.complete(rewards);
		}, 1000);
	}

	const interval = stage.interval(step, 1000 / FPS);

	self.setPlayers = function (p) {
		pumps.forEach(function (pump, m) {
			pump.py = p[m].py;
		});
	};

	hud.initPlayerCount(initGame);

	function initGame(count) {

		for (let i = 0; i < count; i++) {

			const pump = new PumpMeepSingle(i);
			pump.left = W / 2 + Math.floor(i / 2) * W - W / 6 + (i % 2) * W / 3;
			pump.top = H * 0.95;

			pumps[i] = pump;
		}

		stage.timeout(function () {
			hud.initBanner('Ready...');
			audio.play('music');
		}, 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 2500);

		stage.timeout(function () {

			for (const p of pumps) p.isActive = true;

			hud.initBanner('Go!');
			hud.initTimer(60, finiGame);
		}, 4000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 5500);
	}

	function finiGame() {
		doGameComplete();
	}

	self.draw = function (ctx) {
		// The carnival, 100% wide (so taller than the room) and placed 90%
		// of the way down, under a darkening gradient.
		const img = art.ready(BG);
		if (img) {
			const h = IGB.WIDTH * img.naturalHeight / img.naturalWidth;
			art.image(ctx, img, 0, (H - h) * 0.9, IGB.WIDTH, h);
		}
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']) });

		for (const p of pumps) p.drawBody(ctx);
		for (const p of pumps) p.drawHands(ctx);
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
