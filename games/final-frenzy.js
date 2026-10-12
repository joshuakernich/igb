/*
 * Final Frenzy
 *
 * A road of coloured tiles floats in space on the front wall, tilted away
 * from the room, and scrolls towards the players. Each player's avatar
 * stands on it where they stand in the room: walk around the box to grab
 * the coins and stay on the tiles. Gaps, and tiles knocked out by falling
 * volleyballs, drop a player off the road until the next checkpoint. Every
 * coin is a point; three rounds, faster each time, with bigger squads
 * taking turns in two cohorts.
 *
 * The old game was a CSS 3D scene: a perspective camera looking at a floor
 * tilted back 60 degrees, with coins, balls and avatars standing up on it.
 * Here the projection is done by hand, as in The Claw: the floor (tiles,
 * coin shadows, the END ZONE sign) is painted flat into a buffer and laid
 * onto the screen in perspective one pixel row at a time, then everything
 * standing on it is drawn back to front, each through the affine map that
 * matches the perspective at its centre. The animated space backdrop stays
 * a GIF behind the canvas.
 *
 * Input: px (left / right across the road), pz (towards / away from the
 * front wall, along the road).
 */
IGB.register('final-frenzy', function FinalFrenzyGame(stage, playersMeta) {
	const W = 1600;
	const H = 1000;
	const FPS = 50;
	let PLAYER_COUNT = 6;
	let SCORE_MAX = 15;
	const GRIDSIZE = 400;
	const COIN = 150;

	const GRID = { W: W / GRIDSIZE };

	//   empty
	// 0 static
	// 1 coin (fly-in)
	// 2 finish (with coin)
	// 3 checkpoint
	// 4 coin (static)
	// 5 coin (slide left-right)
	// 6 coin (slide up-down)
	// 7 coin ring


	const START_BLOCKS = [[
		'0000',
		'0000',
		'0000',
		'0000',
	]];

	const CHECKPOINT_BLOCKS = [[
		'3333',
		'3333',
		'3333',
		'3333',
	]];

	const FINISH_BLOCKS = [[
		'2222',
		'2222',
		'2222',
		'2222',
	]];

	// 8 coins for each
	const COIN_BLOCKS = [
		[
			'1001',
			'0000',
			'0000',
			'1001',
		],
		[
			'1000',
			'0100',
			'0010',
			'0001',
		],
		[
			'0001',
			'0010',
			'0100',
			'1000',
		],
		[
			'7000', // top left corner of circle
			'0000',
			'0000',
			'0000',
		],
		[
			'5000',
			'5000',
			'5000',
			'5000',
		],
		[
			'6666',
			'0000',
			'0000',
			'0000',
		],
	];

	const MAZE_BLOCKS = [
		[
			'0000',
			'0  0',
			'4  4',
			'0  0',
		],
		[
			'0000',
			'0 0 ',
			'4004',
			' 0 0',
		],
		[
			'0000',
			'0  0',
			'4004',
			' 00 ',
		],
		[
			'0000',
			' 0  ',
			' 404',
			'   0',
		],
		[
			'0000',
			'0   ',
			'044 ',
			'0   ',
		],
		[
			'0000',
			'   0',
			' 440',
			'   0',
		],
		[
			'0000',
			'0  0',
			'0000',
			'44 0',
			'   0',
		],
		[
			'0000',
			'0  0',
			'0000',
			'0 44',
			'0   ',
		],
	];

	const DEATH_BLOCKS = [
		[
			'4  4',
			'0  0',
			'0**0',
		],
		[
			'0**0',
			'0440',
			'*00*',
		],
		[
			'*00*',
			'4004',
			'0**0',
		],
		[
			'04**',
			'0000',
			'**40',
			'0000',
			'00**',
		],
		[
			'0  0',
			'0**0',
			'0440',
			'*00*',
		],
		[
			'0  0',
			'0000',
			'*00*',
			'4004',
			'0**0',
		],
	];


	const SETS = {
		'start': START_BLOCKS,
		'checkpoint': CHECKPOINT_BLOCKS,
		'finish': FINISH_BLOCKS,
		'coin': COIN_BLOCKS,
		'maze': MAZE_BLOCKS,
		'death': DEATH_BLOCKS,
	};

	const queues = {};

	function generateLevelMap(reps) {

		let arr = [];

		arr = arr.concat(getType('start'));

		for (let r = 0; r < reps; r++) {
			arr = arr.concat(getType('coin'));
			arr = arr.concat(getType('maze'));
			arr = arr.concat(getType('coin'));
			arr = arr.concat(getType('death'));

			if (r < reps - 1) arr = arr.concat(getType('checkpoint'));
			else arr = arr.concat(getType('finish'));
		}

		return arr;
	}

	function getType(type) {

		if (!queues[type] || !queues[type].length) {
			queues[type] = SETS[type].concat();
			shuffleArray(queues[type]);
		}

		const arr = queues[type].pop().concat().reverse();
		return arr;
	}


	const TUTORIAL = generateLevelMap(3);

	const SLOW = 1; //0.05;
	const MED = 1.1; //0.06;
	const FAST = 1.2; //0.07;

	const STRUCTURE = [
		undefined,
		undefined,
		[
			[{ speed: SLOW, players: [0, 1], map: generateLevelMap(2) }],
			[{ speed: MED, players: [0, 1], map: generateLevelMap(3) }],
			[{ speed: FAST, players: [0, 1], map: generateLevelMap(4) }],
		],
		[
			[{ speed: SLOW, players: [0, 1, 2], map: generateLevelMap(2) }],
			[{ speed: MED, players: [0, 1, 2], map: generateLevelMap(3) }],
			[{ speed: FAST, players: [0, 1, 2], map: generateLevelMap(4) }],
		],
		[
			[{ speed: SLOW, players: [0, 1], map: generateLevelMap(2) }, { speed: SLOW, players: [2, 3], map: generateLevelMap(2) }],
			[{ speed: MED, players: [0, 1], map: generateLevelMap(2) }, { speed: MED, players: [2, 3], map: generateLevelMap(2) }],
			[{ speed: FAST, players: [0, 1], map: generateLevelMap(2) }, { speed: FAST, players: [2, 3], map: generateLevelMap(2) }],
		],
		[
			[{ speed: SLOW, players: [0, 1, 2], map: generateLevelMap(2) }, { speed: SLOW, players: [3, 4], map: generateLevelMap(2) }],
			[{ speed: MED, players: [0, 2, 4], map: generateLevelMap(2) }, { speed: MED, players: [1, 3], map: generateLevelMap(2) }],
			[{ speed: FAST, players: [1, 3, 4], map: generateLevelMap(2) }, { speed: FAST, players: [0, 2], map: generateLevelMap(2) }],
		],
		[
			[{ speed: SLOW, players: [0, 1, 2], map: generateLevelMap(2) }, { speed: SLOW, players: [3, 4, 5], map: generateLevelMap(2) }],
			[{ speed: SLOW, players: [0, 1, 2], map: generateLevelMap(2) }, { speed: SLOW, players: [3, 4, 5], map: generateLevelMap(2) }],
			[{ speed: FAST, players: [0, 1, 2], map: generateLevelMap(2) }, { speed: FAST, players: [3, 4, 5], map: generateLevelMap(2) }],
		],
	];

	const art = IGB.art;

	const BG = 'assets/shared/bg-cosmos.gif';
	const COINS = 'assets/shared/sprite-coin.png';
	const BALL = 'assets/final-frenzy/volleyball.png';
	const SPOTS = 'assets/final-frenzy/texture-spots.png';

	/* ---------- the camera ---------- */

	// CSS perspective (W) looking at the middle of the world. The floor
	// ("mazeworld", W x W) tilts back 60 degrees about its bottom edge,
	// which sits on the bottom edge of the front wall. Points on it are
	// (u, v): u across from its left edge, v down from its far edge; h is
	// height above it.
	const PERSPECTIVE = W;
	const EYE = { x: W * 1.5, y: H / 2 };
	const PIVOT = { u: W / 2, v: W, y: H };
	const COS = Math.cos(60 * Math.PI / 180);
	const SIN = Math.sin(60 * Math.PI / 180);

	// Where a point of the floor lands in the world, and how much things
	// there are scaled by distance. ok is false behind the camera.
	function project(u, v, h) {
		const dy = v - PIVOT.v;
		const y = PIVOT.y - EYE.y + dy * COS - h * SIN;
		const z = dy * SIN + h * COS;
		const k = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + (u - PIVOT.u) * k, y: EYE.y + y * k, k, ok: z < PERSPECTIVE - 1 };
	}

	// The floor row (v) that lands on world row y, for the floor raised by h:
	// project() run backwards.
	function rowAt(y, h) {
		const t = y - EYE.y;
		const P = PERSPECTIVE;
		return PIVOT.v + (t * P - t * h * COS - (PIVOT.y - EYE.y) * P + P * h * SIN) / (P * COS + t * SIN);
	}

	function scaleAt(v, h) {
		return PERSPECTIVE / (PERSPECTIVE - ((v - PIVOT.v) * SIN + h * COS));
	}

	// Set up ctx to draw in a flat plane given by map(x, y) -> world point,
	// using the affine map that matches it at (cx, cy). Exact for planes
	// facing the camera, within a fraction of a pixel across a coin or a
	// ball standing on the floor.
	function plane(ctx, map, cx, cy) {
		const d = 20;
		const o = map(cx, cy);
		const px = map(cx + d, cy);
		const nx = map(cx - d, cy);
		const py = map(cx, cy + d);
		const ny = map(cx, cy - d);
		if (!(o.ok && px.ok && nx.ok && py.ok && ny.ok)) return false;
		const a = (px.x - nx.x) / (2 * d);
		const b = (px.y - nx.y) / (2 * d);
		const c = (py.x - ny.x) / (2 * d);
		const e = (py.y - ny.y) / (2 * d);
		ctx.transform(a, b, c, e, o.x - a * cx - c * cy, o.y - b * cx - e * cy);
		return true;
	}

	/* ---------- the platform ---------- */

	// The scrolling road ("mazeplatform"): what is on it, how far it has
	// scrolled (its bottom edge sits `progress` rows below the floor's
	// bottom edge) and how far it is lifted off the floor (its translateZ,
	// eased like the CSS transition it was).
	const platform = { blocks: [], coins: [], rows: 0, progress: 0 };
	const lift = { z: 0 };

	// v of a platform row, in grid units up from its bottom edge.
	function vOf(gy) {
		return W - (gy - platform.progress) * GRIDSIZE;
	}

	function emptyPlatform() {
		platform.blocks = [];
		platform.coins = [];
		platform.rows = 0;
	}

	/* ---------- art ---------- */

	// A tile ("mazeblock"): a rounded square bevelled by two hard inset
	// shadows, drawn at 80% opacity, with a ring inset 30 and a patch of
	// inverted spots inside the ring. One canvas per colour pair.
	const tiles = {};
	function tileSprite(inner, border) {
		const key = inner + '|' + border;
		if (tiles[key]) return tiles[key];
		const spots = art.ready(SPOTS);
		if (!spots) return null;

		const K = 1;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = GRIDSIZE * K;
		const c = canvas.getContext('2d');
		c.scale(K, K);

		const layer = document.createElement('canvas');
		layer.width = layer.height = GRIDSIZE * K;
		const l = layer.getContext('2d');
		l.scale(K, K);
		const tile = (ctx, dx, dy) => art.roundRectPath(ctx, dx, dy, GRIDSIZE, GRIDSIZE, 50);
		l.beginPath();
		tile(l, 0, 0);
		l.fillStyle = inner;
		l.fill();
		l.save();
		l.beginPath();
		tile(l, 0, 0);
		l.clip();
		// box-shadow: inset -10px -15px rgba(0,0,0,0.5), inset 10px 10px white
		l.beginPath();
		l.rect(-100, -100, GRIDSIZE + 200, GRIDSIZE + 200);
		tile(l, 10, 10);
		l.fillStyle = 'white';
		l.fill('evenodd');
		l.beginPath();
		l.rect(-100, -100, GRIDSIZE + 200, GRIDSIZE + 200);
		tile(l, -10, -15);
		l.fillStyle = 'rgba(0,0,0,0.5)';
		l.fill('evenodd');
		l.restore();
		c.globalAlpha = 0.8;
		c.drawImage(layer, 0, 0, GRIDSIZE, GRIDSIZE);
		c.globalAlpha = 1;

		art.border(c, 30, 30, GRIDSIZE - 60, GRIDSIZE - 60, 30, 10, { fill: border });

		c.save();
		c.filter = 'invert(1)';
		c.globalAlpha = 0.5;
		const s = GRIDSIZE - 140;
		c.drawImage(spots, 70, 70, s, s * spots.naturalHeight / spots.naturalWidth);
		c.restore();

		return (tiles[key] = canvas);
	}

	// The spinning coin: the sprite's bottom row, nine frames a second, each
	// frame cut out once so drawing it scaled never picks up its neighbour.
	const coinFrames = [];
	function coinFrame(born) {
		const n = Math.floor((((performance.now() - born) / 1000) % 1 + 1) % 1 * 9);
		if (coinFrames[n]) return coinFrames[n];
		const img = art.ready(COINS);
		if (!img) return null;
		const f = img.naturalWidth / 9;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = f;
		canvas.getContext('2d').drawImage(img, f * n, img.naturalHeight - f, f, f, 0, 0, f, f);
		return (coinFrames[n] = canvas);
	}

	// "END ZONE", in the platform 400 down from its far edge: 400px type,
	// wrapped to the platform's width, white with a 10px dark stroke, 80%
	// opaque. Rendered once the font is in.
	let endZone;
	function endZoneSprite() {
		if (endZone && endZone.final) return endZone.canvas;
		const font = '600 400px Rubik, sans-serif';
		const loaded = document.fonts ? document.fonts.check('600 400px Rubik') : true;
		if (endZone && !loaded) return endZone.canvas;

		const PAD = 50;
		const canvas = document.createElement('canvas');
		const c = canvas.getContext('2d');
		c.font = font;
		const words = 'END ZONE';
		const lines = c.measureText(words).width <= W ? [words] : words.split(' ');
		canvas.width = W + PAD * 2;
		canvas.height = lines.length * GRIDSIZE + PAD * 2;

		const layer = document.createElement('canvas');
		layer.width = canvas.width;
		layer.height = canvas.height;
		const l = layer.getContext('2d');
		l.font = font;
		l.textAlign = 'center';
		l.textBaseline = 'alphabetic';
		l.lineJoin = 'miter';
		const m = l.measureText('END');
		const ascent = m.fontBoundingBoxAscent;
		const descent = m.fontBoundingBoxDescent;
		const baseline = (GRIDSIZE - (ascent + descent)) / 2 + ascent;
		lines.forEach(function (line, i) {
			const y = PAD + i * GRIDSIZE + baseline;
			l.fillStyle = 'white';
			l.fillText(line, PAD + W / 2, y);
			l.strokeStyle = '#222';
			l.lineWidth = 10;
			l.strokeText(line, PAD + W / 2, y);
		});
		c.globalAlpha = 0.8;
		c.drawImage(layer, 0, 0);

		endZone = { canvas, pad: PAD, final: loaded };
		return canvas;
	}

	/* ---------- the pieces ---------- */

	// A white burst with six puffs of smoke, in a tile's upright plane.
	const MazeExplosion = function (size, color) {

		const self = this;
		self.left = 0;
		self.bottom = 0;
		self.blast = { size: size, opacity: 0.9, color: color };

		$(self.blast).animate({
			size: (size * 1.5),
		}, 200).delay(200).animate({
			size: 0,
			opacity: 0,
		}, 1000);

		self.smoke = [];
		for (let i = 0; i < 6; i++) {
			const sizeSmoke = 20 + Math.random() * 20;
			const r = Math.random() * Math.PI * 2;
			const smoke = {
				size: sizeSmoke,
				left: Math.cos(r) * size / 2 * Math.random(),
				top: Math.sin(r) * size / 2 * Math.random(),
				opacity: 1,
			};
			self.smoke.push(smoke);
			$(smoke).animate({
				left: Math.cos(r) * (size * 1.5) / 2,
				top: Math.sin(r) * (size * 1.5) / 2,
				size: (sizeSmoke * 2),
			}, 200 + Math.random() * 100).animate({
				left: Math.cos(r) * (size * 2) / 2,
				top: Math.sin(r) * (size * 2) / 2,
				size: (sizeSmoke),
				opacity: 0,
			}, 1000);
		}
	};

	const MazeCoin = function (type, x, y) {
		const self = this;

		self.x = self.ox = x;
		self.y = self.oy = y;
		self.type = type;
		self.r = 0;

		// where its element sat on the platform, in grid units
		self.left = x;
		self.bottom = y;
		self.visible = true;
		self.born = performance.now();

		self.step = function () {

			if (type == '5') {
				self.r += 0.02;
				self.x = self.ox + 1.5 + Math.cos(self.r + self.y) * 1.5;
			}

			if (type == '6') {
				self.r += 0.02;
				self.y = self.oy - 1.5 - Math.cos(self.r + self.x) * 1.5;
			}

			if (type == '7') {
				self.r += 0.02;
				self.x = self.ox + Math.cos(self.r) * 1.5;
				self.y = self.oy + Math.sin(self.r) * 1.5;
			}
		};

		self.redraw = function () {
			self.left = self.x;
			self.bottom = self.y;
		};
	};

	function addCoin(coin) {
		platform.coins.push(coin);
	}


	let isGoTime = false;

	const self = this;

	const audio = stage.audio();
	audio.add('music', 'assets/final-frenzy/music-apocalypse.mp3', 0.3, true);
	audio.add('fall', 'assets/shared/sfx-fall.mp3', 0.3);
	audio.add('blip', 'assets/shared/sfx-select.mp3', 0.1);
	audio.add('explode', 'assets/shared/sfx-explode.mp3', 0.3);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
	audio.add('spawn', 'assets/shared/sfx-sequence.mp3', 0.3);
	audio.add('correct-echo', 'assets/shared/sfx-correct-echo.mp3', 0.3);

	audio.add('tutorial-final-frenzy-intro', 'assets/final-frenzy/tutorial-final-frenzy-intro.mp3', 0.5);
	audio.add('tutorial-final-frenzy', 'assets/final-frenzy/tutorial-final-frenzy.mp3', 0.5);
	audio.add('tutorial-end-zone', 'assets/final-frenzy/tutorial-end-zone.mp3', 0.5);
	audio.add('tutorial-end-zone-approach', 'assets/final-frenzy/tutorial-end-zone-approach.mp3', 0.5);
	audio.add('tutorial-end-zone-coins', 'assets/final-frenzy/tutorial-end-zone-coins.mp3', 0.5);
	audio.add('tutorial-checkpoint', 'assets/final-frenzy/tutorial-checkpoint.mp3', 0.5);

	// The animated backdrop, across all three walls.
	$('<div>').appendTo(stage.$bg).css({
		position: 'absolute',
		left: 0,
		top: 0,
		width: '100%',
		height: '100%',
		background: `url(${BG}) center / 100%`,
	});

	const hud = new HUD('#4C7B93');
	hud.$el.appendTo(stage.$ui);

	// Each avatar stands on the floor at (left, top), facing the camera at
	// 0.8 scale. When it falls it tips back flat and sinks 2000 below the
	// floor over a second (the CSS transition it was): fall.e runs 0 to 1.
	const meeps = [];
	function initGame(count) {

		PLAYER_COUNT = count;

		scoreMult = Math.floor(SCORE_MAX / count);

		for (let i = 0; i < PLAYER_COUNT; i++) {

			meeps[i] = new Meep(i);
			meeps[i].dead = true;
			meeps[i].visible = false;
			meeps[i].left = 0;
			meeps[i].top = 0;
			meeps[i].fall = { e: 0 };
			// The old meep had no position until the tracker reported (it
			// fell off at once); Meep starts at 0, 0, on the road.
			meeps[i].x = undefined;
			meeps[i].y = undefined;
		}

		initIntro();
	}

	function stand(meep) {
		$(meep.fall).stop(true);
		meep.fall.e = 0;
	}

	function fall(meep) {
		$(meep.fall).stop(true).animate({ e: 1 }, { duration: 1000, easing: 'ease' });
	}



	const palette = ['#37CCDA', '#8DE968', '#FEE955', '#FEB850', '#FD797B'];
	const grays = ['#555', '#ddd', '#555', '#ddd', '#ddd', '#555', '#ddd', '#555'];
	const oranges = ['#FEE955', '#FEB850', '#FEE955', '#FEB850', '#FEB850', '#FEE955', '#FEB850', '#FEE955'];


	let yProgress = 0;
	let iCohort = -1;
	let iRound = 0;
	let round;
	const blocks = [];
	const coins = [];

	function initIntro() {
		hud.initIntro('Final Frenzy', playersMeta ? playersMeta : meeps);
		stage.timeout(finiIntro, 20000);
		audio.play('tutorial-final-frenzy-intro');
	}

	function finiIntro() {
		hud.finiIntro();
		initTutorial();
	}

	function initTutorial() {
		hud.initTutorial('',
			{ x: 1.2, y: 0.45, msg: 'Move around the box<br>to collect coins', icon: 'around' },
			{ x: 1.8, y: 0.45, msg: "Don't fall off!", icon: undefined },
		);

		round = { map: TUTORIAL, speed: 1 };
		initMaze(round.map);

		stage.timeout(function () {
			for (const m in meeps) {
				meeps[m].visible = true;
				meeps[m].dead = false;
			}
			isGoTime = true;
		}, 2000);


		audio.play('tutorial-final-frenzy');

		hud.initTimer(20, finiTutorial);
	}

	function finiTutorial() {
		isGoTime = false;

		hud.finiTimer();
		hud.finiTutorial();

		for (const m in meeps) {
			meeps[m].visible = false;
			meeps[m].dead = true;
			meeps[m].score = 0;
		}

		emptyPlatform();

		stage.timeout(initPlay, 1000);
	}

	function initPlay() {
		hud.initPlayers(meeps);
		stage.timeout(initNextRound, 1000);
	}


	function initMaze(map) {

		coins.length = 0;

		let n = -1;
		for (let y = 0; y < map.length; y++) {
			platform.rows++;
			for (let x = 0; x < map[y].length; x++) {

				n++;

				let colours = palette;
				if (map[y][x] == '2') colours = grays;
				if (map[y][x] == '3') colours = grays;

				const block = {
					x: x,
					y: y,
					type: map[y][x],
					yTrigger: (map[y][x] == '*') ? (y - 5) : (y - 4),
					isTrigger: (map[y][x] == '*' || map[y][x] == '1'),
					// the tile, and what stands in its upright plane
					absent: map[y][x] == ' ',
					inner: colours[n % colours.length],
					border: colours[n % colours.length],
					visible: true,
					shadows: [],
					content: [],
				};

				if (
					map[y][x] == '4' ||
					map[y][x] == '5' ||
					map[y][x] == '6'
				) {

					const coin = new MazeCoin(map[y][x], x + 0.5, y + 0.5);
					addCoin(coin);
					coins.push(coin);
					coin.redraw();
				}

				if (map[y][x] == '7') {
					for (let i = 0; i < 4; i++) {
						const coin = new MazeCoin(map[y][x], x + 2, y - 1);
						addCoin(coin);
						coin.r = 1 / 4 * i * Math.PI * 2;
						coins.push(coin);
						coin.redraw();
					}
				}

				blocks[n] = block;
				platform.blocks.push(block);
			}
		}
	}

	let isFirstRound = false;
	function initNextRound() {

		iCohort++;

		if (!STRUCTURE[meeps.length][iRound][iCohort]) {
			iCohort = 0;
			iRound++;
		}

		if (!STRUCTURE[meeps.length][iRound]) {
			finiGame();
			return;
		}

		emptyPlatform();
		blocks.length = 0;

		round = STRUCTURE[meeps.length][iRound][iCohort];


		initMaze(round.map);

		yProgress = round.map.length - 4;


		// translateZ(1500px) at once, then down to 0 over 0.9s
		$(lift).stop(true);
		lift.z = 1500;

		stage.timeout(function () {
			$(lift).stop(true).animate({ z: 0 }, { duration: 900, easing: 'ease' });
		}, 100);


		isFirstRound = (iRound == 0 && iCohort == 0);

		if (isFirstRound) {
			stage.timeout(function () {
				audio.play('tutorial-end-zone');
			}, 1000);
		}


		const delay = isFirstRound ? 5000 : 0;

		$({ p: yProgress }).delay(delay + 1500).animate({ p: 0 }, {
			duration: 5000, step: function (a) {
				yProgress = a;
			},
		});

		stage.timeout(function () {
			if (iCohort == 0) {
				hud.initRound(iRound, STRUCTURE[meeps.length].length);
				audio.play('music', false, (iRound == STRUCTURE[meeps.length].length - 1) ? 1.25 : 1);
			}
		}, delay + 1500);

		stage.timeout(function () {
			for (const p in round.players) {
				const m = round.players[p];
				meeps[m].visible = true;
				meeps[m].dead = false;
				stand(meeps[m]);
			}
			hud.finiBanner();
		}, delay + 6000);

		stage.timeout(function () {
			hud.summonPlayers(round.players);
		}, delay + 8000);

		stage.timeout(function () {
			hud.finiBanner();
		}, delay + 10000);

		stage.timeout(function () {
			isGoTime = true;
		}, delay + 11000);
	}

	function finiRound() {

		hud.finiTimer();

		for (const m in meeps) {
			meeps[m].visible = false;
			meeps[m].dead = true;
		}

		// translateZ(-2000px), over the platform's 0.9s transition
		stage.timeout(function () {
			$(lift).stop(true).animate({ z: -2000 }, { duration: 900, easing: 'ease' });
		}, 1000);

		stage.timeout(initNextRound, 2500);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	let scoreMult = 1;
	let countDead = 0;
	const thingsSaid = {};

	function step() {

		for (const b in blocks) {
			const isVisible = (blocks[b].y > (yProgress - 1) && blocks[b].y < (yProgress + 11));
			blocks[b].visible = isVisible;
		}

		if (isGoTime) {

			yProgress += round.speed * (1 / FPS);

			if (yProgress > (round.map.length - 4)) {
				yProgress = round.map.length - 4;
				finiScroll();
			}

			let cntCheckpoint = 0;
			let cntEndZone = 0;
			for (const b in blocks) {

				if (blocks[b].type == '3' && blocks[b].y < (yProgress + 4) && blocks[b].y > yProgress) cntCheckpoint++;
				if (blocks[b].type == '2' && blocks[b].y < (yProgress + 4) && blocks[b].y > yProgress) cntEndZone++;


				const isTriggered = (!blocks[b].isActive && blocks[b].yTrigger < yProgress && blocks[b].isTrigger);


				if (isTriggered) {
					blocks[b].isActive = true;

					const offset = blocks[b].x > 1 ? W * 2 : -W * 2;
					const time = round.speed * (2 + Math.random() * 0.5) * 1000;

					// a shadow on the tile, sliding in and darkening
					const shadow = { width: 0, height: 0, opacity: 0.1, left: offset, visible: true };
					blocks[b].shadows.push(shadow);
					$(shadow).animate({
						width: 200, height: 200, opacity: 0.7,
						left: 0,
					}, {
						duration: time,
						easing: 'linear',
					});

					// and the ball or coin dropping onto it
					const projectile = { type: blocks[b].type, left: offset, bottom: 500, visible: true, born: performance.now() };
					blocks[b].content.push(projectile);
					$(projectile).animate({
						bottom: 0,
						left: 0,
					}, {
						easing: 'linear',
						duration: time,
						complete: function () {

							projectile.visible = false;
							shadow.visible = false;

							// A ball still in the air when a round ends lands
							// on whatever tile has its index next round, as
							// before; the old code threw if there was none.
							if (!blocks[b]) return;

							if (blocks[b].type == '*') {

								blocks[b].isDead = true;
								blocks[b].absent = true;

								const explosion = new MazeExplosion(GRIDSIZE / 2, 'white');
								explosion.left = GRIDSIZE / 2;
								explosion.bottom = 100;
								blocks[b].content.push(explosion);

								audio.play('explode', true);
							} else {

								const coin = new MazeCoin(4, blocks[b].x + 0.5, blocks[b].y + 0.5);
								addCoin(coin);
								coins.push(coin);
								coin.redraw();
							}
						},
					});
				}
			}

			if (isFirstRound && cntCheckpoint == 8 && !thingsSaid.checkpoint) {
				thingsSaid.checkpoint = true;
				audio.play('tutorial-checkpoint', true);
			}

			if (isFirstRound && cntEndZone == 4 && !thingsSaid.approach) {
				thingsSaid.approach = true;
				audio.play('tutorial-end-zone-approach', true);
			}

			if (isFirstRound && cntEndZone == 16 && !thingsSaid.coins) {
				thingsSaid.coins = true;
				audio.play('tutorial-end-zone-coins', true);
			}

			if (cntCheckpoint == 16) {
				for (const p in round.players) {
					const m = round.players[p];
					if (meeps[m].dead) {
						meeps[m].visible = true;
						meeps[m].dead = false;
						stand(meeps[m]);
						audio.play('spawn', true);
					}

				}
			}
		}

		platform.progress = yProgress;

		for (const m in meeps) {

			if (meeps[m].dead) continue;

			// (CSS ignored NaN, so an untracked player stays put)
			if (Number.isFinite(meeps[m].x)) meeps[m].left = meeps[m].x;
			if (Number.isFinite(meeps[m].y)) meeps[m].top = meeps[m].y;

			let gx = meeps[m].x / GRIDSIZE;
			let gy = (W - meeps[m].y) / GRIDSIZE + yProgress;

			for (const c in coins) {

				if (coins[c].isCollected) continue;

				const dx = coins[c].x - gx;
				const dy = coins[c].y - gy;
				const d = Math.sqrt(dx * dx + dy * dy);

				if (d < 0.5) {
					coins[c].visible = false;

					coins[c].isCollected = true;
					meeps[m].score++;

					meeps[m].doScore(1);
					audio.play('coin', true);
				}
			}

			gx = Math.floor(gx);
			gy = Math.floor(gy);

			let block;
			for (const b in blocks) if (blocks[b].x == gx && blocks[b].y == gy) block = blocks[b];


			if (!round.map[gy] || !round.map[gy][gx] || round.map[gy][gx] == ' ' || block.isDead) {
				meeps[m].dead = true;

				countDead++;

				audio.play('fall', true);

				fall(meeps[m]);
			}
		}

		for (const c in coins) {
			if (!coins[c].isCollected) {
				coins[c].step();
				coins[c].redraw();
			}
		}

		let count = 0;
		for (const m in meeps) if (!meeps[m].dead) count++;

		if (count == 0 && isGoTime) yProgress += 0.1;

		hud.updatePlayers(meeps);
	}

	function finiScroll() {
		isGoTime = false;
		//hud.initBanner('Finish!');

		for (const b of platform.blocks) {
			if (b.type == '2') {
				b.inner = 'rgb(250, 0, 255, 0.7)';
				b.border = 'rgb(250, 0, 255, 1)';
			}
		}

		audio.play('correct-echo');


		for (let y = 0; y < round.map.length; y++) {
			for (let x = 0; x < round.map[y].length; x++) {
				if (round.map[y][x] == 2) {
					const coin = new MazeCoin(round.map[y][x], x + 0.5, y + 0.5);
					addCoin(coin);
					coins.push(coin);
					coin.redraw();
				}
			}
		}

		// The tutorial's road only reaches its end when everyone has fallen
		// (it then races on). The old code started the round's countdown
		// here too, which took the HUD's timer over from the tutorial's: the
		// orphaned tutorial timer then ran finiTutorial some fifty times and
		// the game fell apart. The tutorial's own timer ends it instead.
		if (round.map !== TUTORIAL) hud.initTimer(5, finiRound, !isFirstRound);


	}

	function finiGame() {
		const scores = [];
		for (const m in meeps) scores[m] = meeps[m].score;

		// The scores are coins already: the podium shows them as the reward.
		audio.stop('music');
		hud.showFinalScores(scores, scores);

		stage.timeout(function () {
			self.fini();
			IGB.complete(scores);
		}, 5000);
	}

	const interval = stage.interval(step, 1000 / FPS);

	/* ---------- drawing ---------- */

	// The floor is painted flat into a buffer, in floor units, covering the
	// rows that can be on screen, then laid onto the screen in perspective.
	const FLOOR_ROWS = 13;
	const PADX = 100;
	const floor = stage.surface(W + PADX * 2, FLOOR_ROWS * GRIDSIZE);

	function drawFloor(ctx) {
		const g0 = Math.floor(platform.progress);
		const vTop = vOf(g0 + FLOOR_ROWS);
		const f = floor.ctx;
		floor.clear();
		f.save();
		f.translate(PADX, -vTop);

		for (const b of platform.blocks) {
			if (!b.visible || b.absent) continue;
			if (b.y < g0 - 1 || b.y > g0 + FLOOR_ROWS) continue;
			const sprite = tileSprite(b.inner, b.border);
			if (sprite) f.drawImage(sprite, b.x * GRIDSIZE, vOf(b.y + 1), GRIDSIZE, GRIDSIZE);
		}

		// each coin's shadow, which sat 37.5 beyond the coin (its auto
		// margins split an overflow)
		for (const c of platform.coins) {
			if (!c.visible) continue;
			art.circle(f, c.left * GRIDSIZE, vOf(c.bottom) - COIN / 4, COIN / 2, { fill: 'black', alpha: 0.3 });
		}

		if (platform.rows) {
			const sign = endZoneSprite();
			const top = vOf(platform.rows) + GRIDSIZE;
			f.drawImage(sign, -endZone.pad, top - endZone.pad);
		}
		f.restore();

		// Each row of the floor lands on one row of the world, scaled about
		// the middle, so lay it down a device pixel row at a time.
		const h = lift.z;
		const ky = ctx.getTransform().d;
		const kb = floor.canvas.height / floor.h;
		const top = project(0, vTop, h).y;
		const bottom = project(0, vTop + floor.h, h).y;
		const j0 = Math.max(0, Math.floor(top * ky));
		const j1 = Math.min(Math.ceil(H * ky), Math.ceil(bottom * ky));
		for (let j = j0; j < j1; j++) {
			const y0 = j / ky;
			const y1 = (j + 1) / ky;
			const v0 = Math.max(vTop, rowAt(y0, h));
			const v1 = Math.min(vTop + floor.h, rowAt(y1, h));
			if (!(v1 > v0)) continue;
			const k = scaleAt((v0 + v1) / 2, h);
			ctx.drawImage(floor.canvas,
				0, (v0 - vTop) * kb, floor.canvas.width, (v1 - v0) * kb,
				EYE.x + (-PADX - PIVOT.u) * k, y0, floor.w * k, y1 - y0);
		}
	}

	// The shadow under a falling ball: a circle on its tile, sliding in
	// from the side (its auto margins centred it once it fitted).
	function drawShadow(ctx, b, s) {
		const L = s.left;
		const w = s.width;
		const cx = b.x * GRIDSIZE + L + Math.max(0, (GRIDSIZE - L - w) / 2) + w / 2;
		const cy = vOf(b.y + 0.5);
		const r = w / 2;
		if (!(r > 0)) return;
		const points = [];
		for (let i = 0; i < 40; i++) {
			const a = i / 40 * Math.PI * 2;
			const p = project(cx + Math.cos(a) * r, cy + Math.sin(a) * r, lift.z);
			if (!p.ok) return;
			points.push(p);
		}
		art.poly(ctx, points, { fill: 'black', alpha: s.opacity });
	}

	// Draw in the upright plane standing on the platform at (u, v); local
	// y runs up as negative, like the CSS it was.
	function upright(ctx, u, v, cx, cy) {
		const h = lift.z;
		return plane(ctx, (x, y) => project(u + x, v, h - y), cx, cy);
	}

	function drawCoin(ctx, c) {
		const frame = coinFrame(c.born);
		if (!frame) return;
		ctx.save();
		if (upright(ctx, c.left * GRIDSIZE, vOf(c.bottom), 0, -COIN / 2)) {
			ctx.drawImage(frame, -COIN / 2, -COIN, COIN, COIN);
		}
		ctx.restore();
	}

	// What stands in a tile's upright plane, a quarter in from its near
	// edge: the ball or coin dropping in, then any explosion.
	function drawContent(ctx, b) {
		const u = b.x * GRIDSIZE;
		const v = vOf(b.y + 0.25);
		for (const item of b.content) {
			if (item.blast) {
				const x = item.left;
				const y = -item.bottom;
				const blast = item.blast;
				ctx.save();
				if (upright(ctx, u, v, x, y)) {
					if (blast.size > 0) art.circle(ctx, x, y, blast.size / 2, { fill: blast.color, alpha: blast.opacity });
					for (const s of item.smoke) {
						if (s.size > 0) art.circle(ctx, x + s.left, y + s.top, s.size / 2, { fill: 'white', alpha: s.opacity });
					}
				}
				ctx.restore();
				continue;
			}
			if (!item.visible) continue;
			// its auto margins centred it in the tile once it fitted
			const x = item.left + Math.max(0, (GRIDSIZE - COIN - item.left) / 2);
			const y = -item.bottom - COIN;
			const img = item.type == '*' ? art.ready(BALL) : coinFrame(item.born);
			if (!img) continue;
			ctx.save();
			if (upright(ctx, u, v, x + COIN / 2, y + COIN / 2)) ctx.drawImage(img, x, y, COIN, COIN);
			ctx.restore();
		}
	}

	// A meep standing at (left, top), or falling: part 'above' or 'below'
	// the floor, or all of it.
	function drawMeep(ctx, m, part) {
		const e = m.fall.e;
		const a = -60 * (1 - e) * Math.PI / 180;
		const sc = 0.8 + 0.2 * e;
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		ctx.save();
		const ok = plane(ctx, (x, y) => project(m.left + sc * x, m.top + ca * sc * y, sa * sc * y - 2000 * e), 0, -175);
		if (ok) {
			if (part) {
				// the floor cuts it where its height above it is 0
				const cut = sa * sc < -1e-6 ? 2000 * e / (sa * sc) : -1e6;
				ctx.beginPath();
				if (part === 'above') ctx.rect(-1e4, -1e4, 2e4, 1e4 + cut);
				else ctx.rect(-1e4, cut, 2e4, 2e4);
				ctx.clip();
			}
			m.drawLocal(ctx);
		}
		ctx.restore();
	}

	self.draw = function (ctx) {

		// The floor cuts every avatar where it meets it (the lower half of a
		// standing one's shadow, all of a fallen one): that part goes under it.
		const standing = [];
		for (const m of meeps) {
			if (!m.visible) continue;
			drawMeep(ctx, m, 'below');
			if (m.dead && m.fall.e < 0.2) standing.push({ v: m.top, draw: () => drawMeep(ctx, m, 'above') });
		}

		drawFloor(ctx);

		for (const b of platform.blocks) {
			if (!b.visible) continue;
			for (const s of b.shadows) if (s.visible) drawShadow(ctx, b, s);
		}

		// Everything standing on the floor, back to front. Ties keep the old
		// DOM order: tiles' contents, coins, then the avatars.
		for (const b of platform.blocks) {
			if (b.visible && b.content.length) standing.push({ v: vOf(b.y + 0.25), draw: () => drawContent(ctx, b) });
		}
		for (const c of platform.coins) {
			if (c.visible) standing.push({ v: vOf(c.bottom), draw: () => drawCoin(ctx, c) });
		}
		for (const m of meeps) {
			if (m.visible && !m.dead) standing.push({ v: m.top, draw: () => drawMeep(ctx, m, 'above') });
		}
		standing.sort((a, b) => a.v - b.v);
		for (const s of standing) s.draw();
	};

	self.setPlayers = function (p) {
		for (const m in meeps) {
			meeps[m].x = p[m].px * W;
			meeps[m].y = (1 - p[m].pz) * W;
		}
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
