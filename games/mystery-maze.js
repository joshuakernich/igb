/*
 * Mystery Maze
 *
 * Each player gets a grid of dark tiles laid on the floor in front of the
 * front wall, three players at a time. A hidden path of safe tiles flashes
 * green three times; then the player steps onto the ring at the near end
 * and walks the path to the far end by moving around the box. A wrong tile
 * (or walking off the grid) drops their meep through the floor and the path
 * is shown again. The clock runs from the first "Go!" until they get across;
 * the lowest total time over the rounds wins.
 *
 * The old game was a CSS 3D scene: each maze a floor tilted back 60 degrees
 * under the world's perspective, with the meep and the "Watch..." caption
 * standing up on it. Here the projection is done by hand: the floor's tiles,
 * rings and shadows are projected corner by corner, and the standing pieces
 * are drawn through the affine map that matches the perspective at their
 * middle. A falling meep is drawn in two halves, below and above the floor,
 * so the floor hides the part that has gone through it.
 *
 * Input: px (left / right across the maze), pz (towards / away from the
 * front wall: down / up the maze).
 */
IGB.register('mystery-maze', function MysteryMazeGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;

	const TUTORIAL =
	[
		'10',
		'11',
		'01',
	];

	const MAP3x4 =
	[
		'100',
		'111',
		'001',
		'001',
	];

	const MAP3x5 =
	[
		'010',
		'110',
		'100',
		'111',
		'001',
	];

	const MAP4x5 =
	[
		'0001',
		'1111',
		'1000',
		'1110',
		'0010',
	];

	// Not used by any round (nor was it in the old game).
	const MAP4x7 =
	[
		'0001',
		'0011',
		'0010',
		'1110',
		'1000',
		'1100',
		'0100',
	];

	function generateVariants(map) {
		const arr = [];
		for (let y = 0; y < map.length; y++) {
			arr[y] = [];
			for (let x = 0; x < map[y].length; x++) {
				arr[y][x] = parseInt(map[y][x], 10);
			}
		}

		const flipY = arr.concat().reverse();
		const flipX = arr.concat();
		for (const y in flipX) flipX[y] = flipX[y].concat().reverse();
		const flipXY = flipX.concat().reverse();

		return [arr, flipY, flipX, flipXY];
	}

	const ROUNDS = [
		generateVariants(MAP3x4),
		generateVariants(MAP3x5),
		generateVariants(MAP4x5),
	];

	const STRUCTURE = [
		undefined,
		undefined,
		[ROUNDS[0], ROUNDS[1], ROUNDS[2]],
		[ROUNDS[0], ROUNDS[1], ROUNDS[2]],
		[ROUNDS[1], ROUNDS[2]],
		[ROUNDS[1], ROUNDS[2]],
		[ROUNDS[1], ROUNDS[2]],
	];

	const TUTORIALS = generateVariants(TUTORIAL);

	const FPS = 50;
	const PX_CELLH = 150; // pixel height for each cell
	const SAFE_GY = 2; // grid height for safe zones

	const BG = 'assets/shared/bg-mountains-clouds.png';

	const audio = stage.audio();
	audio.add('fall', 'assets/shared/sfx-fall.mp3', 0.3);
	audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('sequence', 'assets/shared/sfx-sequence.mp3', 0.3);
	audio.add('music', 'assets/shared/music-run.mp3', 0.3, true);

	/* ---------- colours ---------- */

	const DARK = [51, 51, 51];        // #333, a tile
	const GREEN = [148, 239, 147];    // #94EF93, a safe tile shown or found

	function rgb(c) {
		return `rgb(${c[0]},${c[1]},${c[2]})`;
	}

	// $cell.animate({ 'background-color': ... }) as jQuery UI ran it: from
	// whatever colour the tile has when the animation starts, channel by
	// channel, 400ms swing.
	function fadeBg($cell, cell, to) {
		let from;
		$cell.animate({ fade: 1 }, {
			start: function () { from = cell.bg.slice(); },
			step: function (now, tween) {
				cell.bg = from.map((v, i) => Math.floor(v + (to[i] - v) * tween.pos));
			},
		});
	}

	/* ---------- the projection ---------- */

	// The camera: CSS perspective (W * 3) on the world, looking at its middle.
	const PERSPECTIVE = W * 3;
	const EYE = { x: W * 1.5, y: H / 2 };

	// 3D transforms as rows of a 3 x 4 matrix, [x, y, z, translate] each,
	// composed the way a CSS transform list is (rightmost applies first).
	function mul(A, B) {
		const r = [];
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 4; j++) {
				r[i * 4 + j] = A[i * 4] * B[j] + A[i * 4 + 1] * B[4 + j] + A[i * 4 + 2] * B[8 + j] + (j === 3 ? A[i * 4 + 3] : 0);
			}
		}
		return r;
	}

	function translate(x, y) {
		return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, 0];
	}

	function rotateX(deg) {
		const a = deg * Math.PI / 180;
		const c = Math.cos(a);
		const s = Math.sin(a);
		return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
	}

	function scale(k) {
		return [k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1, 0];
	}

	function chain(...list) {
		return list.reduce(mul);
	}

	// Where the point (u, v) of a plane with transform M lands on the wall.
	function project(M, u, v) {
		const X = M[0] * u + M[1] * v + M[3];
		const Y = M[4] * u + M[5] * v + M[7];
		const Z = M[8] * u + M[9] * v + M[11];
		const s = PERSPECTIVE / (PERSPECTIVE - Z);
		return [EYE.x + (X - EYE.x) * s, EYE.y + (Y - EYE.y) * s];
	}

	// Set up ctx to draw in the plane M in its own units: the affine map that
	// matches the perspective exactly at (u0, v0), and to a fraction of a
	// pixel across anything the size of a meep.
	function planeTransform(ctx, M, u0, v0) {
		const X = M[0] * u0 + M[1] * v0 + M[3];
		const Y = M[4] * u0 + M[5] * v0 + M[7];
		const Z = M[8] * u0 + M[9] * v0 + M[11];
		const s = PERSPECTIVE / (PERSPECTIVE - Z);
		const kx = (X - EYE.x) * s * s / PERSPECTIVE;
		const ky = (Y - EYE.y) * s * s / PERSPECTIVE;
		const a = s * M[0] + kx * M[8];
		const b = s * M[4] + ky * M[8];
		const c = s * M[1] + kx * M[9];
		const d = s * M[5] + ky * M[9];
		const x = EYE.x + (X - EYE.x) * s;
		const y = EYE.y + (Y - EYE.y) * s;
		ctx.transform(a, b, c, d, x - a * u0 - c * v0, y - b * u0 - d * v0);
	}

	// A rectangle lying in the plane M.
	function quad(ctx, M, x, y, w, h, fill) {
		art.poly(ctx, [project(M, x, y), project(M, x + w, y), project(M, x + w, y + h), project(M, x, y + h)], { fill });
	}

	// A disc lying in the plane M.
	function disc(ctx, M, cx, cy, r, fill) {
		const points = [];
		for (let i = 0; i < 64; i++) {
			const a = i / 64 * Math.PI * 2;
			points.push(project(M, cx + Math.cos(a) * r, cy + Math.sin(a) * r));
		}
		art.poly(ctx, points, { fill });
	}

	// A 150px circle's 20px dashed border lying in the plane M. Chrome laid
	// the dashes (twice the border's width) round the border's middle line
	// clockwise from the top, the gaps stretched to fit seven.
	const RING = { outer: 75, inner: 55, dash: 40, dashes: 7 };

	function ring(ctx, M, cx, cy, fill) {
		const mid = (RING.outer + RING.inner) / 2;
		const span = RING.dash / mid;
		const at = (r, a) => project(M, cx + Math.sin(a) * r, cy - Math.cos(a) * r);
		for (let k = 0; k < RING.dashes; k++) {
			const a0 = k / RING.dashes * Math.PI * 2;
			const points = [];
			for (let i = 0; i <= 12; i++) points.push(at(RING.outer, a0 + span * i / 12));
			for (let i = 12; i >= 0; i--) points.push(at(RING.inner, a0 + span * i / 12));
			art.poly(ctx, points, { fill });
		}
	}

	/* ---------- a maze ---------- */

	const MysteryMaze = function (n, map, wTrack) {
		const self = this;

		const grid = {
			w: map[0].length,
			h: map.length,
			hFull: map.length + SAFE_GY * 2,
			pw: wTrack,
			ph: (map.length + SAFE_GY * 2) * PX_CELLH,
			px: wTrack / map[0].length,
			py: PX_CELLH,
		};

		let isActive = false;
		let isReady = false;
		let isDead = false;
		let timeout = undefined;

		self.isComplete = false;

		self.ax = 0;

		// player location (0-1)
		self.px = 0;
		self.py = 0;

		// reticule location
		self.rx = 0;
		self.ry = 0;

		// target location
		self.tx = 0;
		self.ty = 0;

		self.score = 0;
		self.tally = 0;

		// The maze's element: its bottom-centre edge (left + width / 2,
		// H - bottom) is the hinge it tilts back about.
		self.el = { left: 0, bottom: 100, visible: true };

		// Pieces on the maze, placed in its own px from its top-left corner.
		const reticule = { left: 0, top: 0, visible: false };
		const target = { left: 0, top: 0, visible: false };

		let timeBegin = undefined;

		// The meep stands up on the floor: rotateX(-50deg) scale(fall.scale)
		// translateY(fall.ty) about its feet.
		const meep = new Meep(n);
		const feet = { left: grid.pw / 2, top: 0 };
		const fall = { scale: 0.5, ty: 0 };

		const cells = [];
		for (let r = 0; r < grid.h; r++) {
			cells[r] = [];
			for (let c = 0; c < grid.w; c++) {
				cells[r][c] = { bg: DARK.slice(), opacity: 1, safe: false };
			}
		}

		// The caption, standing up on the line where the far safe zone meets
		// the maze (rotateX(-90deg) about the bottom of the second row).
		const text = { str: '', opacity: 1, visible: true };
		self.text = text;

		function showPath() {

			for (let r = 0; r < map.length; r++) {
				for (let c = 0; c < map[r].length; c++) {
					if (map[r][c] == 1) {
						const $cell = $(cells[r][c]);
						$cell.delay((map.length - r) * 100);
						fadeBg($cell, cells[r][c], GREEN);
						$cell.delay(500);
						fadeBg($cell, cells[r][c], DARK);
					}
				}
			}

			audio.play('sequence', true);
		}

		self.showPathPreview = function () {
			text.str = 'Watch...';
			text.opacity = 1;
			stage.timeout(showPath, 0);
			stage.timeout(showPath, 2000);
			stage.timeout(showPath, 4000);
			stage.timeout(function () {

				isReady = true;
				if (timeBegin == undefined) timeBegin = new Date().getTime();

				reticule.visible = true;
				target.visible = true;
				text.str = 'Go!';
				$(text).delay(1000).animate({ opacity: 0 });
			}, 5000);
		};

		function die() {
			isDead = true;
			// a 1s CSS transition (ease) on the meep's transform
			$(fall).stop(true).animate({ scale: 0.6, ty: 2000 }, { duration: 1000, easing: 'ease' });

			audio.play('fall', true);

			timeout = stage.timeout(reset, 2000);
		}

		self.step = function () {

			self.rx = (self.px - self.ax) * (W / grid.pw) * grid.w;
			self.ry = (-0.4 + self.py * 1.8) * grid.hFull;

			if (timeBegin != undefined && !self.isComplete) {
				const timeElapsed = new Date().getTime() - timeBegin;
				self.score = self.tally + timeElapsed / 1000;
			}

			if (isActive && !isDead) {

				self.tx = self.rx;
				self.ty = self.ry;

				const gx = Math.floor(self.rx);
				const gyFull = Math.floor(self.ry);
				const gy = Math.floor(self.ry) - SAFE_GY;

				const isWithinBounds = gyFull >= 0 && gyFull < grid.hFull && gx >= 0 && gx < grid.w;
				const isWithinMaze = gy >= 0 && gy < grid.h && gx >= 0 && gx < grid.w;

				if (isWithinMaze && map[gy][gx] == 1) {

					if (!cells[gy][gx].safe) {
						cells[gy][gx].safe = true;
						cells[gy][gx].bg = GREEN.slice();
						audio.play('blip', true);
					}
				} else if (isWithinMaze) {
					cells[gy][gx].opacity = 0;
					die();
				} else if (!isWithinBounds) {
					die();
				} else if (gy < 0) {
					isDead = true;
					self.isComplete = true;

					audio.play('correct', true);

					$(self).animate({
						tx: grid.w / 2,
						ty: SAFE_GY / 2,
					});
				}

			} else if (!isDead && !isActive) {
				self.tx = grid.w / 2;
				self.ty = grid.h + SAFE_GY * 1.5;

				if (isReady) {
					const dx = self.rx - self.tx;
					const dy = self.ry - self.ty;
					const d = Math.sqrt(dx * dx + dy * dy);

					if (d < 0.5) {
						audio.play('blip', true);
						target.visible = false;
						reticule.visible = false;
						isActive = true;
					}
				}
			}
		};

		// Like jQuery's .css(), skip a coordinate that isn't a number (before
		// the tracker reports) and leave the piece where it was.
		function place(piece, left, top) {
			if (Number.isFinite(left)) piece.left = left;
			if (Number.isFinite(top)) piece.top = top;
		}

		self.redraw = function () {
			place(reticule, self.rx * grid.px, self.ry * grid.py);
			place(target, self.tx * grid.px, self.ty * grid.py);
			place(feet, self.tx * grid.px, self.ty * grid.py);
		};

		function reset() {
			isActive = false;
			isDead = false;
			isReady = false;

			for (const row of cells) {
				for (const cell of row) {
					cell.opacity = 1;
					cell.bg = DARK.slice();
					cell.safe = false;
				}
			}

			target.visible = false;
			reticule.visible = false;
			// transition: none
			$(fall).stop(true);
			fall.scale = 0.6;
			fall.ty = 0;

			timeout = stage.timeout(self.showPathPreview, 1000);
		}

		self.fini = function () {
			clearTimeout(timeout);
		};

		/* ---------- drawing ---------- */

		// The floor: rotateX(60deg) about the bottom-centre edge.
		function floorMatrix() {
			const el = self.el;
			return chain(
				translate(el.left + grid.pw / 2, H - el.bottom),
				rotateX(60),
				translate(-grid.pw / 2, -grid.ph),
			);
		}

		// The safe rows (gray blocks), then the tiles (inline-blocks), each
		// with its 20px black shadow underneath, in the DOM's paint order.
		// A shape that a later one overlaps runs a pixel into it, so no seam
		// shows between them.
		function drawFloor(ctx, M) {
			const R = PX_CELLH;
			const rows = [0, 1, grid.h + SAFE_GY, grid.h + SAFE_GY + 1];
			for (const r of rows) {
				quad(ctx, M, 0, r * R + 20, grid.pw, R, 'black');
				quad(ctx, M, 0, r * R, grid.pw, R + (r === 0 || r === grid.h + SAFE_GY ? 1 : 0), 'gray');
			}
			for (let r = 0; r < grid.h; r++) {
				for (let c = 0; c < grid.w; c++) {
					const cell = cells[r][c];
					if (cell.opacity <= 0) continue;
					const x = c * grid.px;
					const y = (r + SAFE_GY) * R;
					const right = c < grid.w - 1 && cells[r][c + 1].opacity > 0 ? 1 : 0;
					const down = r < grid.h - 1 && cells[r + 1][c].opacity > 0 ? 1 : 0;
					quad(ctx, M, x, y + 20, grid.px, R, 'black');
					quad(ctx, M, x, y, grid.px + right, R + down, rgb(cell.bg));
				}
			}
		}

		// The meep's half below the floor (only seen through a hole or past
		// the floor's edge) or above it.
		function drawMeep(ctx, M, below) {
			const Mm = chain(M, translate(feet.left, feet.top), rotateX(-50), scale(fall.scale), translate(0, fall.ty));
			const cut = -fall.ty; // the floor, in the meep's own units
			ctx.save();
			planeTransform(ctx, Mm, 0, -Meep.H / 2);
			ctx.beginPath();
			if (below) ctx.rect(-1000, cut, 2000, 10000);
			else ctx.rect(-1000, cut - 10000, 2000, 10000);
			ctx.clip();
			meep.draw(ctx);
			ctx.restore();
		}

		// 75px Rubik on a 150px line, white, centred across the maze.
		function drawText(ctx, M) {
			if (!text.visible || !text.str || !(text.opacity > 0)) return;
			const Mt = chain(M, translate(grid.pw / 2, PX_CELLH * 2), rotateX(-90), translate(-grid.pw / 2, -PX_CELLH * 2));
			ctx.save();
			planeTransform(ctx, Mt, grid.pw / 2, PX_CELLH * 1.5);
			ctx.font = `600 ${PX_CELLH / 2}px Rubik, sans-serif`;
			const m = ctx.measureText(text.str);
			const ascent = m.fontBoundingBoxAscent;
			const baseline = PX_CELLH + (PX_CELLH - ascent - m.fontBoundingBoxDescent) / 2 + ascent;
			art.text(ctx, text.str, grid.pw / 2, baseline, {
				size: PX_CELLH / 2, weight: 600, font: 'Rubik', fill: 'white', alpha: text.opacity, baseline: 'alphabetic',
			});
			ctx.restore();
		}

		self.draw = function (ctx) {
			if (!self.el.visible) return;
			const M = floorMatrix();

			drawMeep(ctx, M, true);
			drawFloor(ctx, M);
			if (reticule.visible) disc(ctx, M, reticule.left, reticule.top, 50, PLAYER_COLORS[n]);
			if (target.visible) ring(ctx, M, target.left, target.top, PLAYER_COLORS[n]);

			// The caption and the meep both stand up from the floor: whichever
			// is further away goes first.
			if (feet.top < PX_CELLH * 2) {
				drawMeep(ctx, M, false);
				drawText(ctx, M);
			} else {
				drawText(ctx, M);
				drawMeep(ctx, M, false);
			}
		};
	};

	/* ---------- game flow ---------- */

	const self = this;

	let showGlass = true;
	const mazes = [];
	const drawn = []; // every maze, in the order it joined the scene

	const hud = new HUD('#aa6ec1');
	hud.$el.appendTo(stage.$ui);

	const slots = [];
	for (let i = 0; i < 3; i++) slots[i] = { ax: 0.07 + i * 0.3, occupant: -1 };

	let iRound = -1;
	let nPlayer = -1;
	let countPlayer;
	let isRoundOver = false; // the round's end has been handled

	function initGame(count) {

		countPlayer = count;

		initTutorial();
	}

	function initTutorial() {

		hud.initTutorial('Mystery Maze',
			{ x: 1.15, y: 0.5, msg: 'Align yourself<br>with your Avatar', icon: 'align' },
			{ x: 1.75, y: 0.5, msg: 'Move around the box<br>to navigate the maze', icon: 'around' },
		);

		for (let i = 0; i < countPlayer; i++) {
			const iMaze = i % TUTORIALS.length;
			mazes[i] = new MysteryMaze(i, TUTORIALS[iMaze], W / 8);
			mazes[i].ax = 0.1 + 0.7 / (countPlayer - 1) * i;
			mazes[i].text.visible = false;
			mazes[i].el.left = W + mazes[i].ax * W;
			drawn.push(mazes[i]);
			stage.timeout(mazes[i].showPathPreview, 1000);
		}

		hud.initTimer(30, finiTutorial);
	}

	function finiTutorial() {

		showGlass = false;

		hud.finiTimer();
		hud.finiTutorial();

		for (const m of mazes) {
			m.fini();
			m.el.visible = false;
			m.isComplete = true;
			m.score = 0;
		}

		stage.timeout(function () {
			hud.initPlayers(mazes, 1);
		}, 1000);
		stage.timeout(initNextRound, 3000);
	}

	function initNextRound() {

		iRound++;
		nPlayer = -1;
		isRoundOver = false;

		audio.play('music', false, iRound == STRUCTURE[countPlayer].length - 1 ? 1.5 : 1);

		for (const s of slots) s.occupant = -1;

		for (let i = 0; i < countPlayer; i++) {
			const iMaze = i % STRUCTURE[countPlayer][iRound].length;
			const tally = mazes[i] ? mazes[i].score : 0;
			mazes[i] = new MysteryMaze(i, STRUCTURE[countPlayer][iRound][iMaze], W / 4);
			mazes[i].el.visible = false;
			drawn.push(mazes[i]);
			mazes[i].score = mazes[i].tally = tally;
		}

		let delay = 0;

		stage.timeout(function () {
			hud.initRound(iRound, STRUCTURE[countPlayer].length);
		}, delay += 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, delay += 2000);

		stage.timeout(function () {
			initNextPlayer();
			stage.timeout(initNextPlayer, 200);
			stage.timeout(initNextPlayer, 400);
		}, delay += 1000);

		stage.timeout(function () {
			const summon = [0, 1, 2];
			if (summon.length > countPlayer) summon.length = countPlayer;
			hud.summonPlayers(summon);
		}, delay += 1000);

		stage.timeout(function () {
			hud.finiBanner();
		}, delay += 2000);

		stage.timeout(function () {
			for (const s of slots) {
				const m = s.occupant;
				if (m < 0) continue; // an empty slot (two players)
				mazes[m].showPathPreview();
			}
		}, delay += 1000);
	}

	if (playersMeta) stage.timeout(function () { initGame(playersMeta.length); });
	else hud.initPlayerCount(initGame);

	function initNextPlayer(triggerPreview = false) {
		nPlayer++;

		if (!mazes[nPlayer]) {
			checkForRoundComplete();
			return;
		}

		let nSlot = 0;
		while (slots[nSlot].occupant > -1) nSlot++;

		slots[nSlot].occupant = nPlayer;
		const maze = mazes[nPlayer];
		maze.ax = slots[nSlot].ax;
		maze.el.visible = true;
		maze.el.bottom = -H;
		maze.el.left = W + maze.ax * W;
		$(maze.el).animate({
			bottom: 150,
		}).animate({
			bottom: 100,
		});

		if (triggerPreview) stage.timeout(maze.showPathPreview, 1000);
	}

	function checkForRoundComplete() {
		let isComplete = true;
		for (let i = 0; i < mazes.length; i++) if (!mazes[i].isComplete) isComplete = false;

		if (isComplete && !isRoundOver) {
			isRoundOver = true;
			if (STRUCTURE[countPlayer][iRound + 1]) initNextRound();
			else finiGame();
		}
	}

	function finiGame() {
		const scores = [];
		for (let i = 0; i < mazes.length; i++) scores[i] = -mazes[i].score;

		const rewards = window.scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);

		stage.timeout(function () {
			self.fini();
			IGB.complete(rewards);
		}, 5000);
	}

	function step() {

		for (let m = 0; m < mazes.length; m++) {
			mazes[m].step();
			if (mazes[m].isComplete) {
				for (const s of slots) {
					if (s.occupant === m) {
						s.occupant = -1;
						$(mazes[m].el).delay(1000).animate({
							bottom: W,
						});

						const round = iRound;
						stage.timeout(function () {
							// (not a call left over from a round already finished)
							if (round === iRound) initNextPlayer(true);
						}, 2000);
					}
				}
			}
		}
		for (const m of mazes) m.redraw();

		hud.updatePlayers(mazes, 1);
	}

	const interval = stage.interval(step, 1000 / FPS);

	self.draw = function (ctx) {
		// The mountains, at the world's width, repeating down as CSS did.
		art.tile(ctx, BG, 0, 0, IGB.WIDTH, H, IGB.WIDTH);
		if (showGlass) art.glass(ctx);
		for (const m of drawn) m.draw(ctx);
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};

	self.setPlayers = function (p) {
		for (let m = 0; m < mazes.length; m++) {
			mazes[m].px = (p[m].px);
			mazes[m].py = (1 - p[m].pz);
		}
	};
});
