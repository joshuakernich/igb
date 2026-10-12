/*
 * Melody Match
 *
 * A sheet of music drops onto the front wall and plays a short melody. The
 * whole squad plays at once, each player behind a meep that holds a four-key
 * keyboard above its head, spread over the walls (the side walls from three
 * players up). A ball bounces on each keyboard every three beats, and
 * leaning picks the key it lands on. Play the melody back note for note; a
 * wrong note starts it over. Fewest bounces over the rounds wins.
 *
 * Input: px (lean left / right on the front wall), pz (lean, as seen facing
 * the side walls).
 */
IGB.register('melody-match', function MelodyMatchGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const KEYS = 4;
	const KEYW = 0.06;
	const BPM = 120;
	const BPS = BPM / 60;
	const BPB = 3;

	const BG = 'assets/shared/bg-village.png';

	const audio = stage.audio();
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('incorrect', 'assets/shared/sfx-incorrect.mp3', 0.2);
	audio.add('notes', 'assets/melody-match/sfx-glockenspiel.mp3', 0.3);
	// audio.add('music', 'assets/melody-match/music-ambient.mp3', 0.3, true);
	audio.add('music', 'assets/melody-match/music-jazz-120.mp3', 0.1, true);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.2);

	const MELODIES = [
		[0, 1, 2],
		[2, 0, 1, 3],
		[1, 1, 3, 0, 2],
		[3, 0, 3, 1, 2],
	];

	const ROUNDS = [
		undefined,
		undefined,
		[{ melody: MELODIES[0] }, { melody: MELODIES[1] }, { melody: MELODIES[2] }],
		[{ melody: MELODIES[0] }, { melody: MELODIES[1] }, { melody: MELODIES[2] }],
		[{ melody: MELODIES[1] }, { melody: MELODIES[2] }],
		[{ melody: MELODIES[1] }, { melody: MELODIES[2] }],
		[{ melody: MELODIES[1] }, { melody: MELODIES[2] }],
	];

	const LAYOUT = [
		undefined,
		undefined,
		[{ wall: 1, ax: 0.3 }, { wall: 1, ax: 0.8 }],
		[{ wall: 0, ax: 0.5 }, { wall: 1, ax: 0.5 }, { wall: 2, ax: 0.5 }],
		[{ wall: 0, ax: 0.5 }, { wall: 1, ax: 0.3 }, { wall: 1, ax: 0.7 }, { wall: 2, ax: 0.5 }],
		[{ wall: 0, ax: 0.4 }, { wall: 0, ax: 0.8 }, { wall: 1, ax: 0.5 }, { wall: 2, ax: 0.2 }, { wall: 2, ax: 0.6 }],
		[{ wall: 0, ax: 0.4 }, { wall: 0, ax: 0.8 }, { wall: 1, ax: 0.3 }, { wall: 1, ax: 0.7 }, { wall: 2, ax: 0.2 }, { wall: 2, ax: 0.6 }],
	];

	/* ---------- the sheet of music ---------- */

	// A sheet showing `map` (a list of notes, 0..3) on four lines. It hangs
	// centred on the front wall, its centre `top` down, tilted 5 degrees.
	const MelodyMap = function (map) {
		const self = this;

		self.w = 100 + (map.length - 1) * 50;   // inside the 10px white border
		self.h = 100 + (KEYS - 1) * 50;
		self.top = H * 0.35;

		// Each note's centre, and its size without the 5px white ring.
		const notes = [];
		for (let m = 0; m < map.length; m++) {
			notes[m] = {
				n: map[m],
				x: 50 + (m * 50),
				y: 50 + (KEYS - map[m] - 1) * 50,
				width: 40,
				height: 40,
			};
		}

		let iBounceWas = -1;
		self.step = function (beat) {

			if (beat < map.length) {
				const bounce = (beat);
				const iBounce = Math.floor(bounce);
				const nNote = map[iBounce];

				if (iBounce > iBounceWas) {
					audio.playAtTime('notes', nNote * 2 * 4);

					$(notes[iBounce]).animate({
						width: 70,
						height: 70,
					}, 100).animate({
						width: 40,
						height: 40,
					});
				}

				iBounceWas = iBounce;
			} else {
				audio.stop('notes');
			}
		};

		self.draw = function (ctx) {
			const bw = self.w + 20;
			const bh = self.h + 20;
			ctx.save();
			ctx.translate(IGB.WIDTH / 2, self.top);
			ctx.rotate(-5 * Math.PI / 180);
			ctx.translate(-bw / 2, -bh / 2);

			art.rect(ctx, 0, 0, bw, bh, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.5)', blur: 20, y: 5 } });
			art.rect(ctx, 10, 10, self.w, self.h, { fill: '#F7F7D9' });

			ctx.translate(10, 10);
			for (let k = 0; k < KEYS; k++) {
				art.rect(ctx, 20, 50 + (KEYS - k - 1) * 50 - 1, self.w - 40, 2, { fill: 'black', alpha: 0.3 });
			}
			for (const note of notes) {
				art.ellipse(ctx, note.x, note.y, note.width / 2 + 5, note.height / 2 + 5, {
					fill: 'white',
					shadow: { color: 'black', blur: 3, y: 1 },
				});
				art.ellipse(ctx, note.x, note.y, note.width / 2, note.height / 2, { fill: PLAYER_COLORS[note.n] });
			}
			ctx.restore();
		};
	};

	/* ---------- a player's meep, keyboard and ball ---------- */

	// One key, its top-left at (x, y): 96 x 50 plus a 20px darker lip.
	function drawKey(ctx, x, y, n) {
		const w = KEYW * W;
		const path = (c) => art.roundRectPath(c, x, y, w, 70, 10);
		art.roundRect(ctx, x, y, w, 70, 10, { fill: PLAYER_COLORS[n] });
		ctx.save();
		ctx.beginPath();
		path(ctx);
		ctx.clip();
		art.rect(ctx, x, y + 50, w, 20, { fill: 'rgba(0,0,0,0.5)' });
		ctx.restore();
		art.inset(ctx, (c) => art.roundRectPath(c, x, y, w, 50, [10, 10, 0, 0]), { color: 'rgba(0,0,0,0.5)', blur: 5, y: -5 });
	}

	// The arms: a white U, 220 wide and 200 tall, hanging from (0, 0).
	function drawArms(ctx) {
		ctx.beginPath();
		art.roundRectPath(ctx, -110, -200, 220, 200, [0, 0, { x: 220, y: 200 }, { x: 220, y: 200 }]);
		art.roundRectPath(ctx, -90, -200, 180, 180, [0, 0, { x: 90, y: 80 }, { x: 90, y: 80 }]);
		ctx.fillStyle = 'white';
		ctx.fill('evenodd');
	}

	const MelodyMeep = function (n) {

		const audioNotes = stage.audio();
		audioNotes.add('notes', 'assets/melody-match/sfx-glockenspiel.mp3', 0.3);

		const self = this;

		self.n = n;
		self.tally = 0;
		self.score = 0;
		self.ax = 0;
		self.px = 0;
		self.isComplete = false;
		self.isFirst = false;

		// Where the old <melodymeep> sat: a point at (left, H - bottom), the
		// meep's feet. Everything below is drawn relative to it.
		self.left = 0;
		self.bottom = -H;
		self.visible = true;

		const keys = [];

		const arms = { left: 0, rotate: 0 };

		const meep = new Meep(n);
		meep.handLeft.visible = false;
		meep.handRight.visible = false;

		const score = { text: '', opacity: 0.3 };

		const board = { left: 0, rotate: 0 };

		for (let i = 0; i < KEYS; i++) {
			keys[i] = { top: 0 };
		}

		const ball = { bottom: 0 };

		let iBounceWas = undefined;
		let iBounceStart = undefined;
		let iProgress = 0;

		self.step = function (beat) {

			const bounce = (beat / BPB);
			let phase = bounce % 1;
			const iBounce = Math.floor(bounce);

			if (iBounceWas == undefined) iBounceStart = iBounceWas = Math.ceil(bounce) + (self.isFirst ? melody.length - 0.5 : 0.5);

			let px = self.px;
			if (self.wall == 0) px = 1 - self.py;
			if (self.wall == 2) px = self.py;

			const dx = Math.min(KEYW * KEYS / 2 - KEYW / 2, Math.max(-KEYW * KEYS / 2 + KEYW / 2, px - self.ax));

			// Before the tracker reports, dx is NaN; the old CSS ignored it.
			if (!isNaN(dx)) {
				board.left = dx * W;
				board.rotate = dx * 30;

				meep.rotate = dx * 120;
				arms.left = (dx * 0.4) * W;
				arms.rotate = dx * 100;
			}

			if ((iProgress + phase) > (self.melody.length + 0.5)) self.isComplete = true;

			if (bounce < iBounceWas || self.isComplete) {
				audioNotes.stop('notes');
				phase = 0.5;
			} else {
				if (iBounce > iBounceWas) {

					const nNote = 2 - Math.ceil(dx / KEYW);

					// No key under the ball until the tracker reports (the old
					// game threw here and tried again on the next tick).
					if (!keys[nNote]) return;

					$(keys[nNote]).animate({
						top: 20,
					}, 100).animate({
						top: 0,
					}, 100);

					let str = '';
					while (str.length < iProgress) str += '✓';

					if (self.melody == 'freeplay') {
						audioNotes.playAtTime('notes', nNote * 2 * 4);
					} else {
						if (nNote == self.melody[iProgress]) {
							// yay, progress!
							audioNotes.playAtTime('notes', nNote * 2 * 4);
							iProgress++;
							score.text = str + '✓';
							score.opacity = 0.4;
						} else {
							iProgress = 0;
							score.text = str + '✗';
							score.opacity = 0.4;
							$(score).delay(200).animate({ opacity: 0 });
							audio.play('incorrect', true);
						}
					}
				}
				iBounceWas = iBounce;

				self.score = self.tally + bounce - iBounceStart;
			}

			ball.bottom = 400 + Math.sin(phase * Math.PI) * 500;
		};

		self.initMelody = function (melody, isFirst) {
			self.melody = melody;
			self.isFirst = isFirst;
			self.isComplete = false;

			self.tally = self.score;

			iProgress = 0;
			score.text = '';
			iBounceWas = iBounceStart = undefined;
		};

		/* drawing, in three layers as the old z-indexes stacked them */

		function origin(ctx) {
			ctx.translate(self.left, H - self.bottom);
		}

		// The arms, the meep and the ticks above it.
		self.draw = function (ctx) {
			if (!self.visible) return;
			ctx.save();
			origin(ctx);

			ctx.save();
			ctx.translate(arms.left, -180);
			ctx.rotate(arms.rotate * Math.PI / 180);
			drawArms(ctx);
			ctx.restore();

			meep.draw(ctx);

			if (score.text && score.opacity > 0) {
				art.text(ctx, score.text, 0, -525, {
					size: 100, weight: 600, font: 'Rubik', fill: 'white',
					alpha: score.opacity, baseline: 'alphabetic',
				});
			}
			ctx.restore();
		};

		// The keyboard (z-index 2): 384 x 80 over a 20px white bar, its
		// bottom 350 above the feet, turning about its centre.
		self.drawBoard = function (ctx) {
			if (!self.visible) return;
			const bw = KEYW * W * KEYS;
			ctx.save();
			origin(ctx);
			ctx.translate(board.left, -400);
			ctx.rotate(board.rotate * Math.PI / 180);
			art.rect(ctx, -bw / 2, -50, bw, 80, { fill: art.linear(ctx, 0, 30, 0, -50, ['gray', 'rgba(128,128,128,0)']) });
			art.rect(ctx, -bw / 2, 30, bw, 20, { fill: 'white' });
			for (let i = 0; i < KEYS; i++) drawKey(ctx, -bw / 2 + i * KEYW * W, -50 + keys[i].top, i);
			ctx.restore();
		};

		// The ball (z-index 4), its bottom `ball.bottom` above the feet.
		self.drawBall = function (ctx) {
			if (!self.visible) return;
			ctx.save();
			origin(ctx);
			art.circle(ctx, 0, -ball.bottom - 25, 25, { fill: 'white' });
			ctx.restore();
		};
	};

	/* ---------- game flow ---------- */

	let countMeep = undefined;
	const self = this;

	let showGlass = true;

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	const meeps = [];
	const meepsLive = [];

	// Meeps and sheets in the order the old DOM held them (appendTo moved
	// an element to the end), which is the order they paint in.
	const order = [];
	function append(item) {
		const i = order.indexOf(item);
		if (i >= 0) order.splice(i, 1);
		order.push(item);
	}

	function initGame(count) {
		countMeep = count;
		for (let i = 0; i < count; i++) {
			meeps[i] = new MelodyMeep(i);
			append(meeps[i]);
			meeps[i].bottom = -H;
		}

		// initNextRound();
		initTutorial();
	}

	let timeStart;
	let isRoundLive = false;
	let iRound = -1;
	let iPlayer = -1;
	let map;
	let melody;

	function initTutorial() {
		for (let m = 0; m < meeps.length; m++) {
			meepsLive[m] = meeps[m];
			meepsLive[m].initMelody('freeplay');
			meepsLive[m].wall = LAYOUT[meeps.length][m].wall;
			meepsLive[m].ax = LAYOUT[meeps.length][m].ax;
			meepsLive[m].bottom = -100;
			meepsLive[m].left = W * meepsLive[m].wall + meepsLive[m].ax * W;
		}

		hud.initTutorial(
			'Melody Match',
			{ x: 1.2, y: 0.45, msg: 'Align yourself<br>to your avatar', icon: 'align' },
			{ x: 1.8, y: 0.45, msg: 'Move left & right<br>to play the target melody', icon: 'side-to-side' },
		);

		isRoundLive = true;
		timeStart = new Date().getTime();

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		showGlass = false;
		isRoundLive = false;

		for (const m of meeps) {
			m.visible = false;
			m.tally = m.score = 0;
		}

		hud.finiTimer();
		hud.finiTutorial();

		stage.timeout(function () {
			hud.initPlayers(meeps);
		}, 1000);

		stage.timeout(initNextRound, 2000);
	}

	function initNextRound() {
		iRound++;
		iPlayer = -1;

		meepsLive.length = 0;

		melody = ROUNDS[countMeep][iRound].melody;

		map = new MelodyMap(melody);
		append(map);
		map.top = -100;
		$(map).animate({
			top: H * 0.3,
		});

		for (let m = 0; m < meeps.length; m++) {
			meepsLive[m] = meeps[m];
			meepsLive[m].wall = LAYOUT[meeps.length][m].wall;
			meepsLive[m].initMelody(melody, true);
			meepsLive[m].ax = LAYOUT[meeps.length][m].ax;
			append(meepsLive[m]);
			meepsLive[m].visible = true;
			meepsLive[m].left = W * meepsLive[m].wall + meepsLive[m].ax * W;
			$(meepsLive[m]).animate({
				bottom: -100,
			});
		}

		iPlayer = meeps.length;

		stage.timeout(function () {
			hud.initRound(iRound, ROUNDS[countMeep].length);
		}, 2000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 4000);

		stage.timeout(function () {
			const cohort = [];
			for (let m = 0; m < meepsLive.length; m++) cohort[m] = meepsLive[m].n;
			hud.summonPlayers(cohort);
		}, 6000);

		stage.timeout(function () {
			hud.finiBanner();
		}, 8000);

		stage.timeout(initPlay, 10000);
	}

	function initPlay() {
		audio.play('music', true);
		isRoundLive = true;
		timeStart = new Date().getTime();
	}

	function initNextPlayer() {
		audio.play('woosh', true);
		iPlayer++;

		let nSlot = 0;
		while (meepsLive[nSlot]) nSlot++;

		if (meeps[iPlayer]) {
			meepsLive[nSlot] = meeps[iPlayer];
			meepsLive[nSlot].initMelody(melody, iPlayer < 2);
			meepsLive[nSlot].ax = 0.25 + nSlot * 0.5;
			append(meepsLive[nSlot]);
			meepsLive[nSlot].visible = true;
			meepsLive[nSlot].left = W + meepsLive[nSlot].ax * W;
			$(meepsLive[nSlot]).animate({
				bottom: -100,
			});
		} else {
			let isRoundComplete = true;
			for (const m of meeps) if (!m.isComplete) isRoundComplete = false;
			if (isRoundComplete) finiRound();
		}
	}

	function finiRound() {

		isRoundLive = false;

		audio.stop('music');
		audio.play('woosh', true);
		append(map);
		$(map).animate({
			top: -100,
		});

		for (const m of meeps) {
			m.isComplete = false;
			$(m).animate({ bottom: -H });
		}

		if (ROUNDS[countMeep][iRound + 1]) stage.timeout(initNextRound, 1000);
		else {
			stage.timeout(finiGame, 2000);
		}
	}

	function finiGame() {
		const scores = [];
		for (let m = 0; m < meeps.length; m++) {
			scores[m] = -meeps[m].score;
		}

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			IGB.complete(rewards);
		}, 5000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function step() {

		if (isRoundLive) {
			const timeCurrent = new Date().getTime();
			const timeElapsed = (timeCurrent - timeStart) / 1000;
			const beat = timeElapsed * BPS;
			for (let m = 0; m < meepsLive.length; m++) {

				if (!meepsLive[m]) continue;

				meepsLive[m].step(beat + m);

				if (meepsLive[m].isComplete) {
					$(meepsLive[m]).delay(1000).animate({ bottom: -H });
					meepsLive[m] = undefined;
					stage.timeout(initNextPlayer, 2000);
					stage.timeout(function () {
						audio.play('woosh', true);
					}, 1000);
				}
			}

			if (map) map.step(beat);

			hud.updatePlayers(meeps);
		} else {
			for (const m of meepsLive) if (m) m.step(0);
		}
	}

	self.draw = function (ctx) {
		// The village, tiled three times across (33.3% wide, as the CSS had
		// it), darkening towards the top.
		art.tile(ctx, BG, 0, 0, IGB.WIDTH, H, IGB.WIDTH * 0.333, H);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['#326C76', 'rgba(50,108,118,0)']) });
		if (showGlass) art.glass(ctx);

		for (const item of order) item.draw(ctx);
		for (const m of meeps) m.drawBoard(ctx);
		for (const m of meeps) m.drawBall(ctx);
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < meeps.length; m++) {
			meeps[m].px = (p[m].px);
			meeps[m].py = (1 - p[m].pz);
		}
	};
});
