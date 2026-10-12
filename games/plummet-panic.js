/*
 * Plummet Panic
 *
 * A tower of floors stands in the middle of the front wall, each floor a row
 * of eight planks. A giant foot stomps the tower from the top one floor at a
 * time, knocking loose the planks below that hide gaps; players sway left and
 * right to drop through the gaps before their floor is crushed, collecting
 * coins on the way. Every fifth floor is a checkpoint that brings crushed
 * players back. Most coins wins.
 *
 * Input: px (sway left / right).
 */
IGB.register('plummet-panic', function PlummetPanicGame(stage, playersMeta) {

	const { H } = IGB;
	const art = IGB.art;
	const W = 1600;
	const FPS = 50;
	const MAXCOIN = 15;
	const COIN = 60;

	const PLAYERS_PER_ROUND = 3;
	const STOMPS_PER_SWAP = 5;

	const BG = 'assets/shared/bg-cityscape.png';
	const FOOT = 'assets/plummet-panic/actor-foot.png';
	const FLAG = 'assets/plummet-panic/texture-flag.jpg';

	const PATTERN = [
		'_ 1___1_',
		'1___1_ _',
		'___ 1__1',
		'_ 1__1_ ',
		'1____ 1_',
		' ___1__1',
		'__1_1_ _',
		'___ 1__1',
		' 1__1_ _',
		'__1_ 1__',
		'_ 1__1 _',
		'1___ __1',
		' 1_____1',
		'1_____1 ',
		'__ 1___1',
		' 1____1 ',
		'_1 _ 1__',
		'1____1 _',
		'___ 1__1',
		'_ 1____1',
		'1_1 ____',
		'1___1 __',
		'___ 1__1',
		' 1____1 ',
		'____1 _1',
		'_ 1____1',
		'1__1 ___',
		'_ 1__1 _',
		'1__ ___1',
		'1_____1 ',
	];

	const STRUCTURE = [
		undefined,
		undefined,
		[
			{ players: [0, 1], levels: 10, timeMax: 1.5, timeMin: 1 },
			{ players: [0, 1], levels: 20, timeMax: 1.2, timeMin: 0.7 },
			{ players: [0, 1], levels: 30, timeMax: 1, timeMin: 0.5 },
		],
		[
			{ players: [0, 1, 2], levels: 10, timeMax: 1.5, timeMin: 1 },
			{ players: [0, 1, 2], levels: 20, timeMax: 1.2, timeMin: 0.7 },
			{ players: [0, 1, 2], levels: 30, timeMax: 1, timeMin: 0.5 },
		],
		[
			{ players: [0, 1, 2, 3], levels: 10, timeMax: 1.5, timeMin: 1 },
			{ players: [0, 1, 2, 3], levels: 30, timeMax: 1.2, timeMin: 0.5 },
		],
		[
			{ players: [0, 1, 2], levels: 10, timeMax: 1.2, timeMin: 0.5 },
			{ players: [3, 4, 0], levels: 10, timeMax: 1.2, timeMin: 0.5 },
			{ players: [1, 2, 3], levels: 10, timeMax: 1.2, timeMin: 0.5 },
			{ players: [4, 0, 1], levels: 10, timeMax: 1.2, timeMin: 0.5 },
			{ players: [2, 3, 4], levels: 10, timeMax: 1.2, timeMin: 0.5 },
		],
		[
			{ players: [0, 1, 2], levels: 10, timeMax: 1.2, timeMin: 0.7 },
			{ players: [3, 4, 5], levels: 10, timeMax: 1.2, timeMin: 0.7 },
			{ players: [0, 2, 4], levels: 20, timeMax: 1, timeMin: 0.5 },
			{ players: [1, 3, 5], levels: 20, timeMax: 1, timeMin: 0.5 },
		],
	];

	const LEVEL = {
		SEG: 8,
		W: W * 0.7,
		H: H * 0.18,
	};
	const BORDER = 50;                       // a floor's side walls
	const SEG_W = LEVEL.W / LEVEL.SEG;
	const TOWER_W = LEVEL.W + BORDER * 2;
	const TOWER_X = (IGB.WIDTH - TOWER_W) / 2;   // centred (inline-block, text-align: center)
	const TOWER_Y = LEVEL.H * 2;                 // its margin-top

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.3, true);
	audio.add('crush', 'assets/plummet-panic/sfx-crush.mp3', 0.3);
	audio.add('checkpoint', 'assets/shared/sfx-sequence.mp3', 0.3);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);

	/* ---------- art ---------- */

	// CSS text in Rubik: the baseline of a line box `lineHeight` tall whose
	// top is at `top` (Rubik's ascent 0.935 em, descent 0.25 em).
	function baseline(top, lineHeight, size) {
		return top + (lineHeight - 1.185 * size) / 2 + 0.935 * size;
	}

	// A box-shadow outside the box only, as CSS paints it (it doesn't show
	// through a translucent background).
	function outerShadow(ctx, x, y, w, h, shadow) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(-1e5, -1e5, 2e5, 2e5);
		ctx.rect(x, y, w, h);
		ctx.clip('evenodd');
		art.rect(ctx, x, y, w, h, { fill: 'black', shadow });
		ctx.restore();
	}

	/* ---------- a floor ---------- */

	const PlummetLevel = function (nLevel, isFloor, isLast) {

		const self = this;
		self.iLevel = nLevel;
		self.isPummeled = false;
		self.isCheckpoint = nLevel % 5 == 0 && nLevel != 0;
		self.isLast = isLast;
		self.meeps = [];             // in the order they were added (paint order)

		self.coins = [];

		const map = [];
		const segs = [];

		let isGappy = false;

		let nGapA = PATTERN[nLevel].indexOf(' ');
		let nGapB = PATTERN[nLevel].lastIndexOf(' ');

		if (isFloor) nGapA = nGapB = -1;

		for (let i = 0; i < LEVEL.SEG; i++) {

			segs[i] = { top: LEVEL.H, left: 0, rotate: 0, opacity: 1 };
			map[i] = (i == nGapA || i == nGapB) ? false : true;

			if (PATTERN[nLevel][i] == '1') {
				Math.random(); // the old coin's animation-delay
				self.coins.push({ x: (i + 0.5), level: nLevel, visible: true });
			}
		}

		self.add = function (meep) {
			meep.moveTo(self.meeps);
			meep.fall();
			meep.level = self;
		};

		self.revealGaps = function () {
			isGappy = true;
			for (const m in map) {
				if (!map[m]) {

					const left = -100 + Math.random() * 200;
					const seg = segs[m];

					seg.rotate = -45 + Math.random() * 90;
					$(seg).animate({
						top: -20 - Math.random() * 20,
						left: left / 2,
					}, 300).animate({
						top: 600,
						left: left,
					}, {
						duration: 500,
						complete: function () {
							seg.opacity = 0;
						},
					});
				}
			}
		};

		self.pummel = function () {
			self.isPummeled = true;
		};

		self.isSegSolid = function (iSeg) {
			if (!isGappy) return true;
			return map[iSeg];
		};

		// The floor, drawn with its top-left at (0, 0). The planks are
		// z-index: 1 in the old CSS, so they come later (drawSegs).
		self.draw = function (ctx) {
			art.rect(ctx, 0, 0, TOWER_W, LEVEL.H, { fill: '#A8793B' });
			art.rect(ctx, 0, 0, BORDER, LEVEL.H, { fill: '#CB9247' });
			art.rect(ctx, TOWER_W - BORDER, 0, BORDER, LEVEL.H, { fill: '#CB9247' });

			if (self.isCheckpoint) {
				art.tile(ctx, FLAG, BORDER, 0, LEVEL.W, LEVEL.H, LEVEL.W * 0.33, undefined, { alpha: 0.1 });
			}

			// the exit door on the ground floor
			if (self.isLast) {
				const dh = LEVEL.H * 0.6;
				const x = BORDER + LEVEL.W - 100 - 120;
				const y = LEVEL.H - dh - 10;
				outerShadow(ctx, x, y, 120, dh + 10, { color: 'black', blur: 5 });
				art.rect(ctx, x, y, 120, dh + 10, { fill: 'rgba(0,0,0,0.3)' });
				art.inset(ctx, (c) => c.rect(x + 10, y + 10, 100, dh), { color: 'black', blur: 5 });
				art.rect(ctx, x, y, 10, dh + 10, { fill: '#CB9247' });
				art.rect(ctx, x + 110, y, 10, dh + 10, { fill: '#CB9247' });
				art.rect(ctx, x + 10, y, 100, 10, { fill: '#CB9247' });
			}

			for (const c of self.coins) {
				if (!c.visible) continue;
				const cx = BORDER + c.x * SEG_W;
				const cy = LEVEL.H - 20 - COIN / 2;
				art.circle(ctx, cx, cy, COIN / 2, { fill: 'white' });
				art.circle(ctx, cx, cy, COIN / 2 - 4, { fill: '#dd00ff' });
				art.text(ctx, '+1', cx, baseline(cy - COIN / 2 + 4, COIN - 8, COIN / 2), {
					size: COIN / 2, fill: 'white', baseline: 'alphabetic',
				});
			}

			for (const m of self.meeps) m.draw(ctx, BORDER, LEVEL.H);
		};

		self.drawSegs = function (ctx) {
			segs.forEach(function (s, i) {
				if (s.opacity <= 0) return;
				ctx.save();
				ctx.translate(BORDER + i * SEG_W + s.left + SEG_W / 2, s.top + 15);
				if (s.rotate) ctx.rotate(s.rotate * Math.PI / 180);
				art.rect(ctx, -SEG_W / 2, -15, SEG_W, 30, { fill: '#CB9247', shadow: { color: 'black', blur: 5, y: 2 } });
				ctx.restore();
			});
		};
	};

	/* ---------- the tower ---------- */

	const PlummetTower = function (countLevel) {
		const self = this;

		self.visible = true;
		self.top = 0;      // scroll offset (css top), set every tick
		self.slide = 0;    // the slide up from below as a round starts

		const logo = { visible: true, meeps: [] };

		const levels = self.levels = [];
		let iPummel = -1;

		for (let i = 0; i < countLevel; i++) {
			levels[i] = new PlummetLevel(i, i == countLevel - 1, i == countLevel - 1);
		}

		self.add = function (meep, nLevel) {
			if (nLevel == -1) meep.moveTo(logo.meeps);
			else levels[nLevel].add(meep);
		};

		self.pummel = function () {
			if (iPummel < 0) {
				logo.visible = false;
			} else {
				levels[iPummel].pummel();
			}

			for (let i = iPummel + 1; i < iPummel + 3; i++) if (levels[i]) levels[i].revealGaps();
			iPummel++;
		};

		// The "TOWER CO" sign on the roof: 540 tall over a 50px ledge, its
		// contents clipped to the box.
		function drawLogo(ctx) {
			const top = -LEVEL.H * 3 - 50;
			const h = LEVEL.H * 3;
			art.rect(ctx, 0, top + h, TOWER_W, 50, { fill: '#CB9247' });

			ctx.save();
			ctx.beginPath();
			ctx.rect(0, top, TOWER_W, h);
			ctx.clip();

			const y = baseline(top + h - 100, 100, 150);
			art.text(ctx, 'TOWER CO', 50, y, { size: 150, fill: '#C99047', align: 'left', baseline: 'alphabetic', shadow: { color: 'black', blur: 20 } });
			art.text(ctx, 'TOWER CO', 40, y, { size: 150, fill: '#A8793A', align: 'left', baseline: 'alphabetic' });
			art.text(ctx, 'TOWER CO', 50, y, { size: 150, fill: '#C99047', align: 'left', baseline: 'alphabetic' });

			for (const m of logo.meeps) m.draw(ctx, 0, top + h);

			const dx = TOWER_W - 100 - SEG_W - 50;
			const dy = top + h - SEG_W;
			art.roundRect(ctx, dx, dy, SEG_W + 50, SEG_W, [0, 100, 0, 0], { fill: '#A8793A', shadow: { color: 'black', blur: 20 } });
			art.roundRect(ctx, dx + 50, dy, SEG_W, SEG_W, [0, 100, 0, 0], { fill: '#CA9147' });

			ctx.restore();
		}

		// dy: the screenshake's vertical offset, so culling sees where the
		// floors really land on screen.
		self.draw = function (ctx, dy = 0) {
			if (!self.visible) return;
			const y0 = TOWER_Y + self.top + self.slide;
			ctx.save();
			ctx.translate(TOWER_X, y0);

			// Only the floors in view get drawn (players reach ~300 above
			// their floor, loose planks fly 600 below it).
			const ys = y0 + dy;
			const inView = (i, above, below) => ys + i * LEVEL.H - above < H + 50 && ys + (i + 1) * LEVEL.H + below > -50;

			// floors (positioned, z-index auto) in order; a crushed floor
			// has opacity 0, planks and players included
			levels.forEach(function (l, i) {
				if (l.isPummeled || !inView(i, 300, 0)) return;
				ctx.save();
				ctx.translate(0, i * LEVEL.H);
				l.draw(ctx);
				ctx.restore();
			});

			// z-index 1: the sign, then every plank
			if (logo.visible) drawLogo(ctx);
			levels.forEach(function (l, i) {
				if (l.isPummeled || !inView(i, 100, 600)) return;
				ctx.save();
				ctx.translate(0, i * LEVEL.H);
				l.drawSegs(ctx);
				ctx.restore();
			});

			// z-index 2: the street, full width, centred on the tower
			const fy = countLevel * LEVEL.H - 2;
			art.rect(ctx, TOWER_W / 2 - IGB.WIDTH / 2, fy, IGB.WIDTH, 2, { fill: '#DFBD69' });
			art.rect(ctx, TOWER_W / 2 - IGB.WIDTH / 2, fy + 2, IGB.WIDTH, LEVEL.H, { fill: '#705C59' });

			ctx.restore();
		};
	};

	/* ---------- a player ---------- */

	const PlummetMeep = function (n) {
		const self = this;

		const meep = new Meep(n);
		meep.scale = 0.32;
		meep.shadow.visible = false;

		let list;          // the container's list of meeps it is drawn in
		let left = 0;      // css left / bottom inside that container
		let bottom = 0;

		self.sy = 0;
		self.px = 0;
		self.altitude = LEVEL.H;
		self.iSeg = 0;

		self.isLive = false;
		self.diedAtLevel = -1;
		self.pxRigged = 0;

		self.score = 0;

		// Move into a container (appendTo): drawn last in it from now on.
		self.moveTo = function (to) {
			if (list) {
				const i = list.indexOf(self);
				if (i > -1) list.splice(i, 1);
			}
			list = to;
			list.push(self);
		};

		self.step = function () {
			if (self.altitude > 0) {
				self.sy += 0.3;
				self.altitude -= self.sy;
			} else {
				self.altitude = 0;
			}

			if (self.level && self.level.isPummeled) self.diedAtLevel = self.level.iLevel;
		};

		self.redraw = function () {

			if (self.diedAtLevel > -1) return;

			let x = self.isLive ? self.px : self.pxRigged;

			x = Math.max(0.2, Math.min(0.8, x)) - 0.15;

			self.x = x / 0.7 * LEVEL.SEG;

			self.iSeg = Math.floor(self.x);

			// jQuery ignored a NaN position and left the meep where it was
			if (isFinite(x)) left = x * W;
			if (isFinite(self.altitude)) bottom = self.altitude;
		};

		self.fall = function () {
			self.altitude = LEVEL.H;
			self.sy = 10;
			self.redraw();
		};

		self.doScoreUp = function () {
			self.score++;

			meep.doScore();
		};

		self.showScore = function (b) {

		};

		// Draw inside a container whose padding box starts at x0 and whose
		// bottom is at y = base.
		self.draw = function (ctx, x0, base) {
			meep.x = x0 + left;
			meep.y = base - bottom;
			meep.draw(ctx);
		};

		self.redraw();
	};

	/* ---------- game flow ---------- */

	const self = this;

	let tower;
	let showGlass = true;

	const foot = { top: -500 };
	const shake = { left: 0, top: 0 };

	const hud = new HUD('#7399C5');
	hud.$el.appendTo(stage.$ui);

	const meeps = [];

	let timePerLevel = 0;
	let scroll = 0;
	let isGoTime = false;
	let iStomp = -1;

	let iRound = -1;
	let round;
	let isRoundComplete = false;

	let scrollDiff = 0;
	let iScroll = 0;

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function screenshake() {

		$(shake).animate({
			left: -20 + Math.random() * 40,
			top: -20 + Math.random() * 40,
		}, 100).animate({
			left: -20 + Math.random() * 40,
			top: -20 + Math.random() * 40,
		}, 100).animate({
			left: -20 + Math.random() * 40,
			top: -20 + Math.random() * 40,
		}, 100).animate({
			left: 0,
			top: 0,
		}, 100);
	}

	function initGame(count) {

		for (let m = 0; m < count; m++) {
			meeps[m] = new PlummetMeep(m);
		}

		initTutorial();
	}

	function initTutorial() {
		hud.initTutorial('Plummet Panic',
			{ x: 1.5, y: 0.7, msg: 'Move left and right<br>and fall through the gaps', icon: 'side-to-side' },
		);

		round = { levels: 10 };
		tower = new PlummetTower(round.levels);

		for (const m in meeps) {
			meeps[m].isLive = true;
			tower.add(meeps[m], 0);
		}

		isGoTime = true;

		for (const l in tower.levels) tower.levels[l].revealGaps();

		hud.initTimer(20, finiTutorial);
	}

	function finiTutorial() {

		hud.finiTimer();
		hud.finiTutorial();
		isGoTime = false;

		for (const m in meeps) {
			meeps[m].isLive = false;
			meeps[m].score = 0;
		}

		tower.visible = false;

		initPlay();
	}

	function initPlay() {
		showGlass = false;
		hud.initPlayers(meeps);
		stage.timeout(initNextRound, 1000);
	}

	function initNextRound() {

		audio.play('music');

		if (tower) tower.visible = false;

		isRoundComplete = false;

		scroll = 0;
		iStomp = -1;

		iRound++;

		round = STRUCTURE[meeps.length][iRound];
		tower = new PlummetTower(round.levels);

		for (const p in round.players) {
			const m = round.players[p];
			meeps[m].isLive = true;
			meeps[m].diedAtLevel = -1;
			meeps[m].altitude = 0;
			meeps[m].level = undefined;
			meeps[m].showScore(false);
			tower.add(meeps[m], -1);
		}

		// slides up from below (top: 100% -> 0, jQuery's default 400ms)
		tower.slide = H;
		$(tower).animate({
			slide: 0,
		});

		stage.timeout(function () {
			hud.initRound(iRound, STRUCTURE[meeps.length].length);
		}, 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 3000);

		stage.timeout(function () {
			hud.summonPlayers(round.players);
		}, 5000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 7000);

		stage.timeout(function () {
			isGoTime = true;
			initIntro();
		}, 9000);
	}

	function initIntro() {
		for (const p in STRUCTURE[meeps.length][iRound].players) {

			const m = STRUCTURE[meeps.length][iRound].players[p];

			meeps[m].isLive = false;
			meeps[m].pxRigged = meeps[m].px;

			const dx = Math.abs(meeps[m].pxRigged - 0.8);

			$(meeps[m]).animate({
				pxRigged: 0.75,
			}, {
				duration: dx * 3000,
				easing: 'linear',
				complete: function () {
					tower.add(meeps[m], 0);
				},
			}).animate({
				pxRigged: meeps[m].px,
			}, {
				duration: dx * 3000,
				easing: 'linear',
				complete: function () {
					meeps[m].isLive = true;
				},
			});
		}

		stage.timeout(stomp, 5000);
	}

	function stomp() {
		timePerLevel = 0;
		iStomp++;

		const timePause = round.timeMax - (round.timeMax - round.timeMin) * (iStomp / round.levels);

		$(foot).animate({
			top: scrollDiff,
		}, {
			duration: 200,
			easing: 'linear',
			complete: function () {
				audio.play('crush');
				tower.pummel();
				screenshake();
			},
		})
			.delay(timePause * 1000 / 2)
			.animate({
				top: -500,
			}, {
				duration: 500,
				start: function () {
					initScroll();
				},
			});
	}

	function initReady() {
		hud.initBanner('Ready...');

		stage.timeout(function () {
			hud.finiBanner();
		}, 1500);

		stage.timeout(function () {
			hud.initBanner('Go!');
		}, 3000);

		stage.timeout(function () {
			isGoTime = true;
			hud.finiBanner();
			initScroll();
		}, 4500);
	}

	function initScroll() {
		if (!isRoundComplete) timePerLevel = round.timeMax - (round.timeMax - round.timeMin) * (iStomp / round.levels);

		if (iScroll % 5 == 3) {
			const iCheckpointLevel = iScroll + 2;
			if (iCheckpointLevel < (round.levels - 1)) {
				for (const m in meeps) {
					if (meeps[m].isLive && meeps[m].diedAtLevel > -1) {
						audio.play('checkpoint', true);
						meeps[m].diedAtLevel = -1;
						tower.add(meeps[m], iCheckpointLevel);
					}
				}
			}
		}
	}

	function step() {

		if (!tower) return;

		if (!isRoundComplete && timePerLevel) {
			scroll += LEVEL.H * (1 / timePerLevel / FPS);
			iScroll = Math.floor(scroll / LEVEL.H);
			if (iScroll >= round.levels) {
				initFinale('Finish!');
			} else if (iScroll > iStomp) {
				stomp();
			}
		}

		const scrollTarget = Math.min(scroll, LEVEL.H * (round.levels - 3));
		scrollDiff = scroll - scrollTarget;

		tower.top = -scrollTarget;

		for (const m in meeps) meeps[m].step();
		for (const m in meeps) {
			// test for plummet

			if (meeps[m].isLive && meeps[m].diedAtLevel == -1 && meeps[m].level != undefined && meeps[m].altitude < 0.1) {

				const coins = meeps[m].level.coins;

				for (const c in coins) {
					const dx = coins[c].x - meeps[m].x;

					if (!coins[c].isCollected && Math.abs(dx) < 0.3) {
						coins[c].visible = false;
						coins[c].isCollected = true;
						audio.play('coin', true);
						meeps[m].doScoreUp();
					}
				}
			}

			if (meeps[m].isLive && meeps[m].diedAtLevel == -1 && meeps[m].altitude == 0 && meeps[m].level) {

				const isSegSolid = meeps[m].level.isSegSolid(meeps[m].iSeg);
				if (!isSegSolid) {
					const iLevel = meeps[m].level.iLevel;
					tower.add(meeps[m], iLevel + 1);

				} else {
					meeps[m].sy = 0;
				}
			}
		}
		for (const m in meeps) meeps[m].redraw();

		if (isGoTime) {

			hud.updatePlayers(meeps);

			let countAlive = 0;
			for (const m in meeps) if (meeps[m].diedAtLevel == -1) countAlive++;

			if (countAlive == 0) {
				initFinale('Finish!');
			}
		}
	}

	function initFinale(message) {
		isGoTime = false;
		isRoundComplete = true;
		timePerLevel = 0;

		for (const p in STRUCTURE[meeps.length][iRound].players) {
			const m = STRUCTURE[meeps.length][iRound].players[p];
			meeps[m].showScore(true);
		}

		if (STRUCTURE[meeps.length][iRound + 1]) {
			stage.timeout(initNextRound, 4000);
		} else {
			stage.timeout(doFinalScores, 2000);
		}
	}

	function doFinalScores() {

		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;

		tower.visible = false;

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 3000);
	}

	/* ---------- drawing ---------- */

	let shakeWas = '';

	self.draw = function (ctx) {
		// The old screenshake moved the whole game, HUD included. It set
		// left / top on the scaled game element, so its offsets were screen
		// pixels: 1 / scale world units each.
		const k = 1 / (IGB.scale || 1);
		const sx = shake.left * k;
		const sy = shake.top * k;
		const t = (sx || sy) ? `translate(${sx}px, ${sy}px)` : '';
		if (t !== shakeWas) {
			hud.$el.css('transform', t);
			shakeWas = t;
		}

		ctx.save();
		ctx.translate(sx, sy);

		// the city, bottom-aligned at full width and repeating upwards
		const bgH = IGB.WIDTH * 992 / 4768;
		art.image(ctx, BG, 0, H - bgH, IGB.WIDTH, bgH);
		art.image(ctx, BG, 0, H - bgH * 2, IGB.WIDTH, bgH);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, H, 0, 0, ['#63666A', 'rgba(99,102,106,0)']) });

		if (showGlass) art.glass(ctx);

		// The foot sits behind the tower (earlier in the old DOM): 20% of the
		// world wide, its sole 390px below the top of its box.
		const fw = IGB.WIDTH * 0.2;
		const fh = fw * 397 / 442;
		art.image(ctx, FOOT, IGB.WIDTH / 2 - fw / 2, foot.top + LEVEL.H * 2 + 30 - fh, fw, fh);

		if (tower) tower.draw(ctx, sy);

		ctx.restore();
	};

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].px = p[m].px;
		}
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
