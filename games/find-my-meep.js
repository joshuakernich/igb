/*
 * Find My Meep
 *
 * A crowd of meeps shuffles about behind a curtain across all three walls.
 * When the curtain draws, every player hunts for the meep wearing their
 * colour and taps it; the sooner you find yours, the more you score. Later
 * rounds add more decoys, set them walking, make them duck, and hide them
 * behind trees and boulders. Nine rounds.
 *
 * Input: taps on the walls (clicks on the stage, hit-tested with
 * IGB.toWorld). Tracked player positions are not used.
 */
IGB.register('find-my-meep', function FindMyMeepGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;

	const BG = 'assets/shared/bg-village.png';
	const CURTAIN = 'assets/shared/texture-curtain.avif';
	const TREE = 'assets/find-my-meep/actor-tree.png';
	const BOULDER = 'assets/find-my-meep/actor-boulder.png';
	const ANIMALS = 'assets/shared/actor-animals.png';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.3, true);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('complete', 'assets/shared/sfx-correct-echo.mp3', 0.3);
	audio.add('curtain', 'assets/shared/sfx-curtain.mp3', 0.3);
	audio.add('yay', 'assets/find-my-meep/sfx-yay.mp3', 0.5);

	/* ---------- the curtain ---------- */

	// Two halves drawn in from the sides. Each is 50% of the world wide when
	// closed, 36% ajar and 5% open, and eases between them over a second
	// (the old CSS width transition, timing function `ease`).
	const curtain = { from: 0.5, to: 0.5, t: 1, back: 0.5, shorten: 1, open: false, ajar: false };

	function curtainWidth() {
		return curtain.from + (curtain.to - curtain.from) * ease(curtain.t);
	}

	// $curtain.addClass(name) / removeClass(name). Like a CSS transition, a
	// new one starts from wherever the curtain is, and one that turns back
	// before finishing takes only as long as the way it has come.
	function setCurtain(name, on) {
		curtain[name] = on;
		const to = curtain.ajar ? 0.36 : curtain.open ? 0.05 : 0.5;
		if (to === curtain.to) return;
		const from = curtainWidth();
		if (curtain.t < 1 && to === curtain.back) {
			curtain.shorten = Math.min(1, Math.abs(ease(curtain.t) * curtain.shorten + 1 - curtain.shorten));
			curtain.back = curtain.to;
		} else {
			curtain.shorten = 1;
			curtain.back = from;
		}
		curtain.from = from;
		curtain.to = to;
		curtain.t = 0;
		$(curtain).stop(true).animate({ t: 1 }, { duration: 1000 * curtain.shorten, easing: 'linear' });
	}

	// CSS `ease`: cubic-bezier(0.25, 0.1, 0.25, 1).
	function ease(t) {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		const bez = (s, a, b) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
		let lo = 0;
		let hi = 1;
		for (let i = 0; i < 24; i++) {
			const mid = (lo + hi) / 2;
			if (bez(mid, 0.25, 0.25) < t) lo = mid;
			else hi = mid;
		}
		return bez((lo + hi) / 2, 0.1, 1);
	}

	function drawCurtain(ctx) {
		const w = curtainWidth() * IGB.WIDTH;
		art.image(ctx, CURTAIN, 0, 0, w, H);
		art.image(ctx, CURTAIN, IGB.WIDTH - w, 0, w, H);
	}

	/* ---------- trees and boulders ---------- */

	// A tree (n 0) or boulder (n 1) a quarter of a wall wide, standing on
	// (x, y). It hides any meep further back.
	function FindObstacle(n, x, y) {
		const self = this;
		self.z = Math.floor(y);

		self.draw = function (ctx) {
			const img = art.ready(n == 1 ? BOULDER : TREE);
			if (!img) return;
			const w = W / 4;
			const h = w * img.naturalHeight / img.naturalWidth;
			ctx.drawImage(img, x - w / 2, y - h, w, h);
		};
	}

	/* ---------- a meep in the crowd ---------- */

	// n is the player it belongs to, or -1 for a decoy.
	function FindMeep(n) {

		const self = this;
		self.n = n;
		self.x = 0;
		self.y = 0;
		self.z = 0;

		// pointer-events: decoys never take a tap
		self.isTappable = n != -1;
		self.range = {};

		const ducking = { h: 350 };

		const meep = new Meep(n);

		// The hands' height as a fraction of the meep's (the old '60%').
		const hands = { left: 0.6, right: 0.6 };
		meep.handLeft.x = -70;
		meep.handRight.x = 70;

		// The "+n" over the meep's head once it is found.
		const score = { text: '', bottom: 350 };

		// An animal held in the arms (unused: see populateLevel).
		let nItem;

		self.initCelebration = function () {
			self.finiShuffle();
			$(self).stop(true, false);
			$(hands).animate({ left: 0.4, right: 0.4 }, 200);

			self.isTappable = false;

			self.setDucking(false);
		};

		self.reset = function () {
			self.isMoving = false;
			$(hands).animate({ left: 0.6, right: 0.6 }, 200);

			self.isTappable = true;
		};

		self.initNextMove = function () {
			self.isMoving = true;

			const xTarget = self.range.xMin + Math.random() * (self.range.xMax - self.range.xMin);
			const yTarget = self.range.yMin + Math.random() * (self.range.yMax - self.range.yMin);

			const dx = self.x - xTarget;
			const dy = self.y - yTarget;
			const dist = Math.sqrt(dx * dx + dy * dy);

			$(self).delay(self.isDucking ? 1000 : 500).animate({
				x: xTarget,
				y: yTarget,
			}, {
				duration: dist * 5 * (1 / self.speed),
				start: function () {
					self.initShuffle();
					if (self.isDucking) self.setDucking(false);
				},
				complete: function () {
					self.finiShuffle();
					self.isMoving = false;
					if (self.isDucking) self.setDucking(true);
				},
			});
		};

		self.finiShuffle = function () {
			$(meep).stop(true, false);
			$(meep.shadow).stop(true, false);
		};

		// A hop every 200ms while walking; the shadow (which hops with the
		// meep) dips the other way.
		self.initShuffle = function () {
			$(meep).animate({
				y: -10,
			}, {
				duration: 100,
			}).animate({
				y: 0,
			}, {
				duration: 100,
				complete: self.initShuffle,
			});

			$(meep.shadow).animate({
				top: -10,
			}, {
				duration: 100,
			}).animate({
				top: -20,
			}, {
				duration: 100,
			});
		};

		self.step = function () {
			if (self.speed && !self.isMoving) {
				self.initNextMove();
			}
		};

		self.redraw = function () {
			self.z = Math.floor(self.y);
			meep.setHeight(ducking.h);
		};

		self.setScore = function (s) {
			score.text = '+' + s;
			score.bottom = 300;
			$(score).animate({ bottom: 350 }, 200);
		};

		self.setDucking = function (b) {
			$(ducking).animate({ h: b ? 250 : 350 });
		};

		self.addCarryItem = function (n) {
			meep.handLeft.x = -120;
			meep.handRight.x = -30;
			hands.left = 0.5;
			hands.right = 0.65;
			nItem = n;
		};

		// Drawn from the meep's spot on the floor. The meep itself hops
		// (meep.y); the score and any animal stay put.
		self.draw = function (ctx) {
			ctx.save();
			ctx.translate(self.x, self.y);

			// 70px text in a 140px line whose bottom is score.bottom up; the
			// line box puts the baseline 93px below its top.
			if (score.text) art.text(ctx, score.text, 0, -score.bottom - 140 + 93, { size: 70, fill: 'white', baseline: 'alphabetic' });

			meep.handLeft.y = hands.left * meep.h;
			meep.handRight.y = hands.right * meep.h;

			if (nItem === undefined) {
				meep.draw(ctx);
			} else {
				// The animal sits between the meep and its hands.
				art.with(ctx, { y: meep.y }, (c) => meep.drawLocal(c, 'body'));
				const img = art.ready(ANIMALS);
				if (img) {
					const f = img.naturalHeight;
					ctx.drawImage(img, (((nItem % 6) + 6) % 6) * f, 0, f, f, -250, -350, 300, 300);
				}
				art.with(ctx, { y: meep.y }, (c) => meep.drawLocal(c, 'hands'));
			}

			ctx.restore();
		};

		// Whether a tap at world (px, py) lands on this meep: any of the
		// boxes the old DOM meep was built from.
		self.hit = function (px, py) {
			const x = px - self.x;
			const y = py - self.y;

			if (score.text && x >= -100 && x <= 100 && y >= -score.bottom - 140 && y <= -score.bottom) return true;
			if (nItem !== undefined && x >= -250 && x <= 50 && y >= -350 && y <= -50) return true;

			const h = meep.h;
			const my = y - meep.y;
			const top = -h;
			const lw = meep.legsWidth();
			const s = meep.shadow;
			const inCircle = (cx, cy, r) => (x - cx) * (x - cx) + (my - cy) * (my - cy) <= r * r;

			return (
				// the avatar's own box, which sat to the right of the feet
				(x >= 0 && x <= Meep.W && my >= top && my <= 0) ||
				// the head, a 100 x 150 box with fully rounded ends
				(x >= -50 && x <= 50 && my >= top + 50 && my <= top + 100) ||
				inCircle(0, top + 50, 50) || inCircle(0, top + 100, 50) ||
				// the (empty) accessory box around the body, twice its size
				(x >= -60 && x <= 60 && my >= top + 120 && my <= top + 240) ||
				// the legs
				(x >= -lw / 2 && x <= lw / 2 && my >= top + 210 && my <= 0) ||
				// hands
				inCircle(meep.handLeft.x, top + hands.left * h, 20) ||
				inCircle(meep.handRight.x, top + hands.right * h, 20) ||
				// the shadow
				((x - (s.left + s.w / 2)) ** 2 / (s.w / 2) ** 2 + (my - (s.top + s.h / 2)) ** 2 / (s.h / 2) ** 2 <= 1)
			);
		};
	}

	/* ---------- the game ---------- */

	const self = this;

	let showGlass = true;

	// Everything standing on the floor (the old <findmeeps>), drawn back to
	// front.
	const crowd = [];

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);
	//hud.initBanner('Find your Meep');

	self.players = [];
	self.scores = [];

	function step() {
		for (const m of meeps) m.step();
		for (const m of meeps) m.redraw();
	}

	const ROUNDS = [
		{ count: 6 },
		{ count: 12 },
		{ count: 24 },
		{ count: 6, speed: 0.5 },
		{ count: 12, speed: 0.5 },
		{ count: 24, speed: 1 },
		{ count: 9, speed: 1, isDucking: true, boulders: 2 },
		{ count: 24, speed: 1, isDucking: true, trees: 2, boulders: 1 },
		{ count: 24, speed: 1, isDucking: true, trees: 2, boulders: 3 },
	];
	let nRound = -1;

	const meeps = [];
	let cntCorrect = 0;

	const CENTER = [0.55, 1.5, 2.45];

	function populateLevel() {

		crowd.length = 0;

		cntCorrect = 0;
		meeps.length = 0;

		const COUNT = ROUNDS[nRound].count;

		const order = [];
		while (order.length < self.playerCount) order.push(order.length);
		while (order.length < COUNT) order.push(-1);

		shuffleArray(order);

		const countPerWall = Math.floor(COUNT / 3);

		for (let i = 0; i < COUNT; i++) {

			const nWall = Math.floor(i / countPerWall);
			const nMeep = (i % countPerWall);

			const o = [0.1, 1, 1.9][nWall];

			const meep = new FindMeep(order[i]);
			meep.wall = nWall;
			//meep.addCarryItem(i);

			crowd.push(meep);

			meep.x = (o + (1 / (countPerWall + 1)) * (nMeep + 1)) * W;
			meep.y = H - 155;
			meep.speed = ROUNDS[nRound].speed;
			meep.isDucking = ROUNDS[nRound].isDucking;

			meep.range = {
				xMin: (CENTER[nWall] - 0.35) * W,
				xMax: (CENTER[nWall] + 0.35) * W,
				yMin: H - 150 - 80,
				yMax: H - 150,
			};

			meeps[i] = meep;

			meep.callback = onMeep;
		}

		const treePerWall = ROUNDS[nRound].trees;
		const boulderPerWall = ROUNDS[nRound].boulders;

		for (let w = 0; w < 3; w++) {
			const o = [0.1, 1, 1.9][w];
			for (let t = 0; t < treePerWall; t++) {
				crowd.push(new FindObstacle(
					0,
					(o + (1 / (treePerWall + 1)) * (t + 1)) * W,
					H - 150 - 40));
			}

			for (let b = 0; b < boulderPerWall; b++) {
				crowd.push(new FindObstacle(
					1,
					(o + (1 / (boulderPerWall + 1)) * (b + 1)) * W,
					H - 140));
			}
		}
	}

	function onMeep(meep) {

		const i = meeps.indexOf(meep);
		const n = meeps[i].n;

		if (n == -1) {
			// a decoy
		} else {

			audio.play('correct', true);

			const score = self.playerCount - cntCorrect;

			meeps[i].initCelebration();
			meeps[i].setScore(score);

			self.scores[n].score += score;

			cntCorrect++;
			if (cntCorrect == self.playerCount) {
				audio.play('complete', true);
				stage.timeout(finiRound, 1000);
			}

			hud.updatePlayers(self.scores);
		}
	}

	function finiRound() {

		audio.play('curtain');
		setCurtain('open', false);

		stage.timeout(function () {
			for (const m of meeps) remove(m);
		}, 1000);

		if (ROUNDS[nRound + 1]) stage.timeout(initRound, 2000);
		else stage.timeout(finiGame, 2000);
	}

	function remove(m) {
		const i = crowd.indexOf(m);
		if (i >= 0) crowd.splice(i, 1);
	}

	function initRound() {
		nRound++;

		hud.initRound(nRound, ROUNDS.length);

		stage.timeout(hud.finiBanner, 2000);
		stage.timeout(function () {
			populateLevel();
			hud.flashMessage(1.5, 0.5, 'Find your Meep', 100, 2000);
		}, 2500);

		stage.timeout(function () {
			audio.play('curtain');
			setCurtain('open', true);
		}, 5000);
	}

	function finiGame() {

		audio.stop('music');
		const scores = [];
		for (const s in self.scores) scores[s] = self.scores[s].score;

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			// The original passed the raw scores here; Box Party adds what it
			// gets straight onto players' coins, so it gets the rewards the
			// podium has just shown.
			IGB.complete(rewards);
		}, 5000);
	}

	function initGame(playerCount) {

		while (self.scores.length < playerCount) self.scores.push({ score: 0 });

		self.playerCount = playerCount;
		stage.timeout(initTutorial, 1000);
	}

	function initTutorial() {

		hud.initTutorial('Find My Meep',
			{
				x: 1.5, y: 0.45, msg: 'Find and tap on your player<br>when the curtain draws', icon: 'touch',
			});

		for (let i = 0; i < 6; i++) {
			const n = i < self.playerCount ? i : -1;
			const meep = new FindMeep(n);
			meep.wall = 1;
			meep.x = (1.2 + Math.random() * 0.6) * W;
			meep.y = H - 150 - Math.random() * 80;
			meep.range = {
				xMin: (CENTER[1] - 0.35) * W,
				xMax: (CENTER[1] + 0.35) * W,
				yMin: H - 100 - 80,
				yMax: H - 100,
			};

			meep.speed = 0.5;
			meeps[i] = meep;
			crowd.push(meep);

			meep.callback = onTutorialMeep;
		}

		setCurtain('ajar', true);
		audio.play('curtain', true);

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		hud.finiTimer();
		hud.finiTutorial();
		setCurtain('ajar', false);
		audio.play('curtain', true);

		stage.timeout(function () {
			showGlass = false;
			crowd.length = 0;
			meeps.length = 0;
		}, 1000);

		stage.timeout(initPlay, 2000);
	}

	function onTutorialMeep(meep) {
		audio.play('yay', true);
		meep.initCelebration();
		stage.timeout(meep.reset, 1000);
	}

	function initPlay() {
		audio.play('music');
		hud.initPlayers(self.scores);
		initRound();
	}

	/* ---------- tapping ---------- */

	// The crowd back to front: by how far forward each stands, then in the
	// order they were added (the old z-index: floor(y), then DOM order).
	function sorted() {
		return crowd.slice().sort((a, b) => a.z - b.z);
	}

	// A tap goes to the front-most meep under it that takes taps; decoys,
	// celebrating meeps, trees, boulders and the curtain all let it through.
	stage.$el.on('click', function (e) {
		if (stage.$ui[0].contains(e.target)) return; // a HUD control had it
		const p = IGB.toWorld(e);
		const list = sorted();
		for (let i = list.length - 1; i >= 0; i--) {
			const m = list[i];
			if (m.isTappable && m.hit(p.x, p.y)) {
				if (m.callback) m.callback(m);
				return;
			}
		}
	});

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		art.eachWall(ctx, (c) => art.image(c, BG, 0, 0, W, H));
		if (showGlass) art.glass(ctx);
		for (const m of sorted()) m.draw(ctx);
		drawCurtain(ctx);
	};

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	const interval = stage.interval(step, 1000 / FPS);

	self.setPlayers = function (p) {
		self.players = p;
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
