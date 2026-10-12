/*
 * Coin Chaos
 *
 * A round wooden platform on the front wall, tilted back, with a meep
 * standing on it for every player, wherever that player stands in the box.
 * Each player's coins sit in a pile inside a dashed ring of their colour,
 * and the rings circle the platform. Walk onto an opponent's coin to pick
 * it up, then carry it into your own ring to add it to your pile; the coins
 * in your pile are your score. Players play in cohorts, each starting with
 * their pile from before plus some new coins.
 *
 * The old game was a CSS 3D scene: the platform a disc turned back with
 * rotateX under a strong perspective, the meeps and coins standing upright
 * on it. Here the projection is done by hand, as in the-claw.js: the
 * platform's surface (boards, rings, coin shadows) is painted flat into a
 * buffer and laid onto the screen in perspective one pixel row at a time,
 * then the upright pieces are drawn back to front, each through the affine
 * map that matches the perspective where it stands (a meep, being tall, in
 * bands, each matched at its own height).
 *
 * Input: x (left / right across the platform), z (towards / away from the
 * front wall).
 */
IGB.register('coin-chaos', function CoinChaosGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const COIN = 100;
	const PLAYERS = 6; // unused: initGame's argument shadows it
	const SCALE = W / 2;
	const FPS = 50;

	const ROUNDS = [
		undefined,
		undefined,
		[
			{ cohorts: [[0, 1]], speed: 0.05, coins: 3, time: 20 },
			{ cohorts: [[0, 1]], speed: 0.1, coins: 5, time: 30 },
		],
		[
			{ cohorts: [[0, 1, 2]], speed: 0.05, coins: 3, time: 20 },
			{ cohorts: [[0, 1, 2]], speed: 0.1, coins: 5, time: 30 },
		],
		[
			{ cohorts: [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]], speed: 0.05, coins: 5, time: 20 },
		],
		[
			{ cohorts: [[0, 1, 2], [0, 3, 4], [1, 3, 4], [2, 3, 0], [2, 4, 1]], speed: 0.05, coins: 5, time: 20 },
		],
		[
			{ cohorts: [[0, 1, 2], [3, 4, 5]], speed: 0.05, coins: 3, time: 20 },
			{ cohorts: [[0, 1, 2], [3, 4, 5]], speed: 0.1, coins: 5, time: 20 },
		],
	];

	const BG = 'assets/shared/bg-mountains-clouds.png';
	const BOARDS = 'assets/coin-chaos/bg-floorboards.jpg';

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-heist.mp3', 0.3, true);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
	audio.add('pickup', 'assets/shared/sfx-pickup.mp3', 0.3);
	audio.add('tutorial-intro', 'assets/coin-chaos/tutorial-coin-chaos-intro.mp3', 0.5);
	audio.add('tutorial', 'assets/coin-chaos/tutorial-coin-chaos.mp3', 0.5);

	/* ---------- the pieces ---------- */

	// Where an element was drawn: its CSS left / top inside the platform's
	// centre, in px. Like jQuery's .css(), a NaN (no tracking yet) leaves it
	// where it was.
	function place(el, x, y) {
		if (Number.isFinite(x * SCALE)) el.left = x * SCALE;
		if (Number.isFinite(y * SCALE)) el.top = y * SCALE;
	}

	// Piles and coins were appended to the platform in the order they were
	// made; flat things on the platform paint in that order.
	let order = 0;

	const CoinPile = function (n, speed = 0.05) {
		const self = this;
		self.order = order++;

		self.n = n;
		self.coins = [];
		self.position = 0;
		self.x = self.y = 0;
		self.left = self.top = 0;
		self.speed = speed;

		self.step = function () {
			self.position += self.speed / FPS;
			self.x = Math.cos(self.position * Math.PI * 2) * 0.7;
			self.y = Math.sin(self.position * Math.PI * 2) * 0.7;

			for (const c in self.coins) {
				self.coins[c].x = self.x + Math.cos((self.position + self.coins[c].position) * Math.PI * 2) * self.coins[c].radius;
				self.coins[c].y = self.y + Math.sin((self.position + self.coins[c].position) * Math.PI * 2) * self.coins[c].radius;
			}
		};

		self.redraw = function () {
			place(self, self.x, self.y);
		};

		self.add = function (coin) {
			coin.position = Math.random();
			coin.radius = Math.random() * 0.2;
			self.coins.push(coin);
			coin.nPile = n;
		};

		self.remove = function (coin) {
			const nCoin = self.coins.indexOf(coin);
			self.coins.splice(nCoin, 1);
		};
	};

	const Coin = function (n) {
		const self = this;
		self.order = order++;
		self.n = n;
		self.nPile = n;

		// It spins once every 6s (CSS animation spincoin), from a random
		// point in the turn (a negative animation-delay, in seconds).
		self.spinDelay = -Math.random() * 6;
		self.spinStart = performance.now();
		self.held = false;

		// The body's drop from 1000px above and fade in (initEntry).
		self.lift = 0;
		self.opacity = 1;
		self.hasEntry = false;

		self.x = self.y = 0;
		self.left = self.top = 0;

		self.redraw = function () {
			place(self, self.x, self.y);
			const held = !!self.holder;
			// animation: none while held; the spin starts over once let go
			if (self.held && !held) self.spinStart = performance.now();
			self.held = held;
		};

		self.initEntry = function (delay) {
			// These inline styles outrank the held style, so a coin that
			// dropped in stays upright in its holder's hands.
			self.hasEntry = true;
			self.lift = 1000;
			self.opacity = 0;

			stage.timeout(function () {
				audio.play('coin', true);
				$(self).animate({ lift: 0, opacity: 1 }, { duration: 300, easing: 'ease' });
			}, delay);
		};

		// The spin in degrees (rotateZ).
		self.spin = function (now) {
			if (self.held) return 0;
			const t = (now - self.spinStart) / 1000 - self.spinDelay;
			return ((t / 6) % 1) * 360;
		};
	};

	const CoinMeep = function (n) {
		const self = this;
		self.coin = undefined;
		self.x = self.y = 0;
		self.score = 0;
		self.left = self.top = 0;
		self.visible = true;

		const meep = new Meep(n);
		meep.setHeight(350);
		self.meep = meep;

		self.redraw = function () {

			if (self.coin) {
				self.coin.x = self.x;
				self.coin.y = self.y;
				self.coin.redraw();
			}

			place(self, self.x, self.y);
		};

		self.grab = function (coin) {
			self.coin = coin;
			coin.holder = self;
			Object.assign(meep.handLeft, { x: -50, y: 220 });
			Object.assign(meep.handRight, { x: 50, y: 220 });
		};

		self.drop = function () {
			self.coin.holder = undefined;
			self.coin = undefined;
			Object.assign(meep.handLeft, { x: null, y: null });
			Object.assign(meep.handRight, { x: null, y: null });
		};

	};

	/* ---------- the scene ---------- */

	// The camera: CSS perspective W, its origin the middle of the world.
	const PERSPECTIVE = W;
	const EYE = { x: W * 1.5, y: H / 2 };

	// The platform: a W x W box with a 50px border along its bottom, its
	// left edge at 33.3% + 50px, turned back with rotateX about its bottom
	// centre, which sits `bottom` up from the bottom of the wall. Both ease
	// over half a second, like the CSS transition they were.
	const PLATFORM = W;
	const RIM = 50;
	const DEPTH = PLATFORM + RIM;
	const ORIGIN_X = IGB.WIDTH * 0.333 + 50 + PLATFORM / 2;
	const platform = { tilt: 60, bottom: 100 };

	function setPlatform(tilt, bottom) {
		$(platform).stop(true).animate({ tilt, bottom }, { duration: 500, easing: 'ease' });
	}

	// The tilt's cosine and sine and the origin's height, set each frame.
	let cos = 0.5;
	let sin = Math.sqrt(0.75);
	let originY = H - 100;

	// Where a point of the platform lands in the world: (u, v) across and
	// down its box (v grows towards the front), h up from its surface. s is
	// how much things there are scaled by distance.
	function project(u, v, h) {
		const q = v - DEPTH;
		const x = ORIGIN_X - EYE.x + u - PLATFORM / 2;
		const y = originY - EYE.y + q * cos - h * sin;
		const z = q * sin + h * cos;
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + x * s, y: EYE.y + y * s, s, dx: x, dy: y };
	}

	// The platform row (v) that lands on world row y: project() run backwards.
	function rowAt(y) {
		const t = y - EYE.y;
		return DEPTH + PERSPECTIVE * (t - (originY - EYE.y)) / (cos * PERSPECTIVE + t * sin);
	}

	// Set up ctx to draw in a plane through the platform point (u, v, h):
	// local x runs along ex and local y along ey, both { u, v, h }. The map
	// is the perspective's tangent there, exact at the point itself.
	function plane(ctx, u, v, h, ex, ey) {
		const p = project(u, v, h);
		const column = function (e) {
			const dy = e.v * cos - e.h * sin;
			const dz = e.v * sin + e.h * cos;
			const ds = p.s * p.s * dz / PERSPECTIVE;
			return [e.u * p.s + p.dx * ds, dy * p.s + p.dy * ds];
		};
		const [a, b] = column(ex);
		const [c, d] = column(ey);
		ctx.transform(a, b, c, d, p.x, p.y);
	}

	// Draw fn(ctx) standing upright at (u, v), facing the front: local x
	// along u, local y = -h. Tall things are drawn in bands, each through
	// the map matched at its own middle and clipped to whole pixel rows, so
	// the bands meet without seams. Nothing shows below the surface.
	const BAND = 70;
	function upright(ctx, u, v, height, fn) {
		const ky = ctx.getTransform().d;
		let rowBottom = Math.round(project(u, v, 0).y * ky);
		for (let h0 = 0; ; h0 += BAND) {
			const last = h0 + BAND >= height;
			const rowTop = last ? -1e6 : Math.round(project(u, v, h0 + BAND).y * ky);
			if (rowBottom > rowTop) {
				const hm = h0 + BAND / 2;
				ctx.save();
				ctx.beginPath();
				ctx.rect(-IGB.WIDTH, rowTop / ky, IGB.WIDTH * 3, (rowBottom - rowTop) / ky);
				ctx.clip();
				plane(ctx, u, v, hm, { u: 1, v: 0, h: 0 }, { u: 0, v: 0, h: -1 });
				ctx.translate(0, hm);
				fn(ctx);
				ctx.restore();
			}
			if (last) break;
			rowBottom = rowTop;
		}
	}

	/* ---------- the platform's surface ---------- */

	// Painted flat into buffers in platform px, with room around for coin
	// shadows that wander off the edge, then laid onto the screen in
	// perspective. The boards and the centre ring never change, so they are
	// painted once (again if the world is resized).
	const PAD = 60;
	const floor = stage.surface(PLATFORM + PAD * 2, DEPTH + PAD * 2);
	const boards = stage.surface(PLATFORM + PAD * 2, DEPTH + PAD * 2);
	let boardsWidth = 0;

	function paintBoards(f) {
		const C = PLATFORM / 2;
		const R = { x: C, y: DEPTH / 2 }; // border-radius: 100%

		// the boards, tiled 20% wide, clipped to the disc
		f.save();
		f.beginPath();
		f.ellipse(R.x, R.y, R.x, R.y, 0, 0, Math.PI * 2);
		f.clip();
		// (each tile overlaps the next by a pixel, so no seam shows between them)
		const img = art.ready(BOARDS);
		const tw = PLATFORM * 0.2;
		const th = tw * img.naturalHeight / img.naturalWidth;
		const px = 1 / f.getTransform().d;
		f.imageSmoothingQuality = 'high';
		for (let y = 0; y < DEPTH; y += th) {
			for (let x = 0; x < PLATFORM; x += tw) f.drawImage(img, x, y, tw + px, th + px);
		}

		// the 50px rim along the bottom: the disc less its padding box
		f.beginPath();
		f.ellipse(R.x, R.y, R.x, R.y, 0, 0, Math.PI * 2);
		art.roundRectPath(f, 0, 0, PLATFORM, PLATFORM, [R, R, { x: R.x, y: R.y - RIM }, { x: R.x, y: R.y - RIM }]);
		f.fillStyle = 'rgba(0,0,0,0.3)';
		f.fill('evenodd');
		f.restore();

		// the ring in the middle (:after, inset 30%, a 5px black border)
		f.beginPath();
		f.arc(C, C, PLATFORM * 0.2, 0, Math.PI * 2);
		f.moveTo(C + PLATFORM * 0.2 - 5, C);
		f.arc(C, C, PLATFORM * 0.2 - 5, 0, Math.PI * 2);
		f.fillStyle = 'black';
		f.fill('evenodd');
	}

	// A pile's ring: 400 across, a 20px dashed border in its owner's colour.
	function paintPile(f, pile) {
		f.save();
		f.beginPath();
		f.arc(pile.left, pile.top, 190, Math.PI, Math.PI * 3); // from its left, clockwise
		f.strokeStyle = PLAYER_COLORS[pile.n];
		f.lineWidth = 20;
		f.setLineDash([DASH, GAP]);
		f.stroke();
		f.restore();
	}
	// Chrome dashes a 20px border 40 long with gaps of about 20, the gaps
	// evened out to fit a whole number of dashes round the ring: 20 here.
	const DASH = 40;
	const GAP = (2 * Math.PI * 190 - 20 * DASH) / 20;

	// A coin's shadow: a 100 x 50 ellipse, turning with the coin.
	function paintShadow(f, coin, now) {
		f.save();
		f.translate(coin.left, coin.top);
		f.rotate(coin.spin(now) * Math.PI / 180);
		art.ellipse(f, 0, 0, COIN / 2, COIN / 4, { fill: 'black', alpha: 0.3 });
		f.restore();
	}

	function drawSurface(ctx, now) {
		if (boards.canvas.width !== boardsWidth && art.ready(BOARDS)) {
			boards.clear();
			boards.ctx.save();
			boards.ctx.translate(PAD, PAD);
			paintBoards(boards.ctx);
			boards.ctx.restore();
			boardsWidth = boards.canvas.width;
		}

		const f = floor.ctx;
		floor.clear();
		f.drawImage(boards.canvas, 0, 0, floor.w, floor.h);
		f.save();
		f.translate(PAD + PLATFORM / 2, PAD + PLATFORM / 2); // coinchaoscenter
		const flat = piles.concat(coins).sort((a, b) => a.order - b.order);
		for (const el of flat) {
			if (el instanceof CoinPile) paintPile(f, el);
			else paintShadow(f, el, now);
		}
		f.restore();

		// Each row of the platform lands on one row of the screen, scaled
		// about the eye, so lay it down a device pixel row at a time.
		const ky = ctx.getTransform().d;
		const kb = floor.canvas.height / floor.h;
		const top = project(0, -PAD, 0).y;
		const bottom = project(0, floor.h - PAD, 0).y;
		const left = ORIGIN_X - PLATFORM / 2 - PAD - EYE.x;
		for (let j = Math.floor(top * ky); j < Math.ceil(bottom * ky); j++) {
			const y0 = j / ky;
			const y1 = (j + 1) / ky;
			const v0 = Math.max(-PAD, rowAt(y0));
			const v1 = Math.min(floor.h - PAD, rowAt(y1));
			if (v1 <= v0) continue;
			const s = PERSPECTIVE / (PERSPECTIVE - sin * ((v0 + v1) / 2 - DEPTH));
			ctx.drawImage(floor.canvas,
				0, (v0 + PAD) * kb, floor.canvas.width, (v1 - v0) * kb,
				EYE.x + left * s, y0, floor.w * s, y1 - y0);
		}
	}

	/* ---------- the upright pieces ---------- */

	// A coin's face, its box 100 square with its bottom centre at (0, 0):
	// a disc in its owner's colour with a 10px white border down the left,
	// and a black ring inset 20px with a white edge 4px to its right.
	function drawCoinFace(ctx, n) {
		const R = COIN / 2;
		art.circle(ctx, 0, -R, R, { fill: 'white' });
		art.roundRect(ctx, -R + 10, -COIN, COIN - 10, COIN, [{ x: R - 10, y: R }, R, R, { x: R - 10, y: R }], { fill: PLAYER_COLORS[n] });

		// The ring is inset in the padding box, which the border narrowed.
		const cx = 5;
		const cy = -R;
		const rx = 25;
		const ry = 30;
		ctx.save();
		ctx.beginPath();
		ctx.rect(-COIN, -COIN * 2, COIN * 2, COIN * 3);
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.clip('evenodd');
		art.ellipse(ctx, cx + 4, cy, rx, ry, { fill: 'white' });
		ctx.restore();
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.moveTo(cx + rx - 5, cy);
		ctx.ellipse(cx, cy, rx - 5, ry - 5, 0, 0, Math.PI * 2);
		ctx.fillStyle = 'black';
		ctx.fill('evenodd');
	}

	function drawCoin(ctx, coin, now) {
		const u = PLATFORM / 2 + coin.left;
		const v = PLATFORM / 2 + coin.top;
		ctx.save();
		if (coin.held && !coin.hasEntry) {
			// held: lying flat 150px up, 100px towards the front
			plane(ctx, u, v + COIN / 2, 150, { u: 1, v: 0, h: 0 }, { u: 0, v: 1, h: 0 });
			ctx.translate(0, COIN / 2);
		} else {
			// standing on its edge, turning about its upright axis
			const a = coin.spin(now) * Math.PI / 180;
			// (lifted while it drops in: the face's bottom is `lift` up)
			const h = COIN / 2 + coin.lift;
			plane(ctx, u, v, h, { u: Math.cos(a), v: Math.sin(a), h: 0 }, { u: 0, v: 0, h: -1 });
			ctx.translate(0, COIN / 2);
			ctx.globalAlpha *= coin.opacity;
		}
		drawCoinFace(ctx, coin.n);
		ctx.restore();
	}

	function drawMeep(ctx, m) {
		upright(ctx, PLATFORM / 2 + m.left, PLATFORM / 2 + m.top, m.meep.h, (c) => m.meep.drawLocal(c));
	}

	/* ---------- game flow ---------- */

	const self = this;

	let showGlass = true;  // the blurlayer
	let showShade = true;  // the darker blurlayer over it

	let isGameAlive = false;

	function step() {

		for (const p in piles) {
			if (isGameAlive) piles[p].step();
			piles[p].redraw();
		}

		// Keys from for...in are strings and pile numbers can be either,
		// so these comparisons stay loose, as they were.
		for (const m in meeps) {

			if (!meeps[m].isActive) continue;

			if (!meeps[m].coin) {
				let minDist = 0.1;
				let nCoin = -1;
				for (const c in coins) {

					if (!coins[c].holder && coins[c].nPile != m && isGameAlive) {
						const dx = coins[c].x - meeps[m].x;
						const dy = coins[c].y - meeps[m].y;

						const d = Math.sqrt(dx * dx + dy * dy);
						if (d < minDist) {
							minDist = d;
							nCoin = c;
						}
					}
				}

				if (nCoin > -1) {
					for (const p in piles) if (piles[p].n == coins[nCoin].nPile) piles[p].remove(coins[nCoin]);
					meeps[m].grab(coins[nCoin]);
					audio.play('pickup', true);
				}
			} else {

				// find distance to home pile
				let nPile = -1;
				for (const p in piles) if (piles[p].n == m) nPile = p;

				const dx = piles[nPile].x - meeps[m].x;
				const dy = piles[nPile].y - meeps[m].y;
				const d = Math.sqrt(dx * dx + dy * dy);

				if (d < 0.14) {
					piles[nPile].add(meeps[m].coin);
					meeps[m].drop();
					audio.play('coin', true);
				}
			}

			meeps[m].redraw();
		}

		for (const c in coins) coins[c].redraw();
		for (const p in piles) meeps[piles[p].n].score = piles[p].coins.length;

		hud.updatePlayers(meeps);
	}

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	const meeps = [];
	const piles = [];
	const coins = [];

	function initGame(PLAYERS) {
		for (let i = 0; i < PLAYERS; i++) {
			meeps[i] = new CoinMeep(i);
			meeps[i].visible = false;
			meeps[i].isActive = false;
		}


		initIntro();
	}

	function initIntro() {
		hud.initIntro('Coin Chaos', playersMeta ? playersMeta : meeps);
		audio.play('tutorial-intro');

		stage.timeout(finiIntro, 20000);
	}

	function finiIntro() {
		hud.finiIntro();
		initTutorial();
	}

	function initTutorial() {

		stage.timeout(function () {
			audio.play('tutorial');
		}, 3000);

		setPlatform(80, 50);
		hud.initTutorial('',
			{ x: 1.25, y: 0.45, msg: "Move around the box<br>and steal opponent's coins", icon: 'around' },
			{ x: 1.75, y: 0.4, msg: 'Return stolen coins<br>to your safe zone', icon: 'align' },
		);

		for (const m in meeps) {
			meeps[m].visible = true;
			meeps[m].isActive = true;

			piles[m] = new CoinPile(m, 0.03);
			piles[m].position = 1 / meeps.length * m;

			for (let c = 0; c < 4; c++) {
				const coin = new Coin(m);
				piles[m].add(coin);
				coin.redraw();
				coins.push(coin);
			}

			piles[m].step();
			piles[m].redraw();
		}

		isGameAlive = true;

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {
		showGlass = false;

		for (const m in meeps) meeps[m].score = 0;
		hud.finiTutorial();
		showShade = false;
		setPlatform(60, 100);

		hud.initPlayers(meeps);
		finiRound();
	}

	let iCohort = -1;
	let iRound = 0;
	function initNextCohort() {

		iCohort++;

		if (!ROUNDS[meeps.length][iRound].cohorts[iCohort]) {
			iCohort = 0;
			iRound++;
		}

		if (!ROUNDS[meeps.length][iRound]) {
			finiGame();
			return;
		}

		const rounds = ROUNDS[meeps.length];
		const round = rounds[iRound];
		const cohort = rounds[iRound].cohorts[iCohort];

		audio.play('music', false, (rounds.length > 1 && iRound === rounds.length - 1) ? 1.25 : 1);

		if (rounds.length > 1) {
			hud.initRound(iRound, rounds.length);
			stage.timeout(function () {
				hud.finiBanner();
			}, 2000);
		}

		stage.timeout(function () {
			hud.summonPlayers(round.cohorts[iCohort]);
			hud.revealTimer(round.time);

			for (const i in cohort) {
				const m = cohort[i];

				meeps[m].isActive = true;
				meeps[m].visible = true;

			}

		}, 4000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 6000);

		stage.timeout(function () {
			for (const i in cohort) {
				const m = cohort[i];

				const coinsStart = meeps[m].score + round.coins;
				meeps[m].score = coinsStart;

				piles[i] = new CoinPile(m, round.speed);
				piles[i].position = 1 / cohort.length * i;

				for (let c = 0; c < coinsStart; c++) {
					const coin = new Coin(m);
					piles[i].add(coin);
					coin.redraw();
					coins.push(coin);

					coin.initEntry(Math.random() * 500 + (500 / coinsStart) * c);
				}

				piles[i].step();
				piles[i].redraw();
			}

			hud.updatePlayers(meeps);

		}, 7500);

		stage.timeout(function () {
			hud.initTimer(round.time, finiRound);
			isGameAlive = true;
		}, 10000);
	}

	function finiRound() {
		isGameAlive = false;
		hud.finiTimer();

		for (const m in meeps) {
			meeps[m].visible = false;
			meeps[m].isActive = false;
			meeps[m].coin = undefined;
		}

		// hidden, then forgotten
		piles.length = 0;
		coins.length = 0;

		stage.timeout(initNextCohort, 2000);
	}

	function finiGame() {
		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;
		hud.showFinalScores(scores, scores);

		stage.timeout(function () {
			self.fini();
			IGB.complete(scores);
		}, 6000);
	}

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].x = p[m].x;
			meeps[m].y = -p[m].z;
		}
	};

	/* ---------- drawing ---------- */

	self.draw = function (ctx) {
		const now = performance.now();
		const deg = platform.tilt * Math.PI / 180;
		cos = Math.cos(deg);
		sin = Math.sin(deg);
		originY = H - platform.bottom;

		// the sky, 100% wide, and a pale blue glow rising from the bottom
		art.tile(ctx, BG, 0, 0, IGB.WIDTH, H, IGB.WIDTH);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#86C0D4', 'rgba(134,192,212,0)']) });
		if (showGlass) art.glass(ctx);
		if (showShade) art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: 'rgba(0,0,0,0.3)', alpha: 0.7 });

		drawSurface(ctx, now);

		// Meeps and coins stand in planes across the platform, so back to
		// front by row is the order the 3D scene sorted them in. Ties keep
		// the old DOM order: meeps, then coins as they were made.
		const standing = [];
		for (const m of meeps) {
			if (m.visible) standing.push({ v: m.top, draw: () => drawMeep(ctx, m) });
		}
		for (const coin of coins) {
			const v = coin.top + (coin.held && !coin.hasEntry ? COIN / 2 : 0);
			standing.push({ v, draw: () => drawCoin(ctx, coin, now) });
		}
		standing.sort((a, b) => a.v - b.v);
		for (const s of standing) s.draw();
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
