/*
 * Template
 *
 * A starting point for a new prototype: every player is a meep on the front
 * wall that follows them left and right, and jumps when they squat and rise.
 * Stars fall; catch them for points. 30 seconds, most stars wins.
 *
 * Input: px (left / right), py (height: up for a jump).
 *
 * To use it: copy this file to games/<your-id>.js, change the id below, and
 * add { id: '<your-id>', name: '<Name>' } to a folder in games/manifest.js.
 */
IGB.register('template', function TemplateGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const SECONDS = 30;
	const FLOOR = H - 100;     // where the meeps stand

	const audio = stage.audio();
	audio.add('catch', 'assets/shared/sfx-correct.mp3', 0.3);

	const self = this;
	const meeps = [];
	const stars = [];
	let isLive = false;

	const hud = new HUD('#7538D4');
	hud.$el.appendTo(stage.$ui);

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const meep = new Meep(i);
			meep.x = W + (i + 1) / (count + 1) * W;
			meep.y = FLOOR;
			meep.scale = 0.6;
			meeps.push(meep);
		}
		hud.initPlayers(meeps);
		hud.initBanner('Catch the stars!');
		stage.timeout(hud.finiBanner, 2000);
		stage.timeout(function () {
			isLive = true;
			hud.initTimer(SECONDS, finiGame);
		}, 3000);
	}

	function finiGame() {
		isLive = false;
		hud.finiTimer();
		const scores = meeps.map((m) => m.score);
		const rewards = scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);
		stage.timeout(() => IGB.complete(rewards), 5000);
	}

	/* ---------- every tick ---------- */

	function step() {
		if (isLive && Math.random() < 0.03) {
			stars.push({ x: W + 100 + Math.random() * (W - 200), y: -50, speed: 6 + Math.random() * 6 });
		}
		for (const s of stars) s.y += s.speed;

		for (const m of meeps) {
			for (const s of stars) {
				if (!s.caught && Math.abs(s.x - m.x) < 80 && Math.abs(s.y - (m.y - 150)) < 120) {
					s.caught = true;
					m.score++;
					m.doScore(1);
					audio.play('catch', true);
				}
			}
		}
		for (let i = stars.length - 1; i >= 0; i--) if (stars[i].caught || stars[i].y > H + 50) stars.splice(i, 1);

		hud.updatePlayers(meeps);
	}

	/* ---------- drawing (every animation frame) ---------- */

	self.draw = function (ctx) {
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#1b1446', '#5a2d82']) });
		art.rect(ctx, W, FLOOR, W, H - FLOOR, { fill: '#2b1b55' });
		for (const s of stars) art.text(ctx, '★', s.x, s.y, { size: 90, fill: '#ffdd00', shadow: { color: 'rgba(255,221,0,0.6)', blur: 20 } });
		for (const m of meeps) m.draw(ctx);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		meeps.forEach(function (m, i) {
			const p = players[i];
			m.x = W + p.px * W;
			// py is 0 (high) to 1 (low): stand tall to jump.
			m.y = FLOOR - Math.max(0, 0.45 - p.py) * 600;
		});
	};

	self.fini = function () {
		hud.fini();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
