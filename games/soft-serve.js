/*
 * Soft Serve
 *
 * Two nozzles on the ceiling of the front wall sway from side to side, each
 * pouring a stream of soft serve: red for player 1, blue for player 2. Each
 * of the two players is a little cone character on the floor; standing under
 * your own stream catches it, and every catch piles onto a swirl on your hat.
 * A shelved idea (it sits in the Rejects folder): there is no HUD, no score
 * and no end. Only the front wall is used.
 *
 * Input: px (left / right) of the first two players.
 */
IGB.register('soft-serve', function SoftServeGame(stage, playersMeta) {

	const { WIDTH } = IGB;
	const art = IGB.art;

	const FPS = 20;
	const W = 1600;
	const H = 1000;
	const CONE = 200;
	const NOZZLE = 50;
	const THICC = 50;

	const BG = 'assets/soft-serve/bg-diner.webp';

	// The old CSS coloured stream, swirl and hat red for the first player and
	// blue for the second (svg[n="0"], svg[n="1"], softcone:nth-of-type(2)).
	const COLORS = ['red', 'blue'];

	// The game box covered the middle third of the scene: left and width 33.3%.
	const GAME_X = WIDTH * 0.333;
	const GAME_W = WIDTH * 0.333;

	// The cone's eyes were the text ". ." in the page's font (Rubik, 600).
	const EYES_FONT = `600 ${CONE / 2}px Rubik, sans-serif`;

	/* ---------- a cone: the player, collecting a swirl ---------- */

	const SoftServeCone = function (nPlayer) {
		const self = this;

		self.px = 0.5;
		self.height = 0;

		self.stack = [];

		// What the DOM showed: its CSS left (a fraction of the game box's
		// width) and the swirl's path in the svg's 0..100 viewBox.
		self.left = 0;
		self.points = [];

		self.redraw = function () {
			// jQuery's css() skipped a NaN% left, leaving the cone where it was.
			if (isFinite(self.px * 100)) self.left = self.px;

			const points = [];
			let s;
			for (s = 0; s < self.stack.length; s++) {
				self.height = s * 0.15 / 100;
				points.push([((50 + Math.sin(s * 0.2) * 5) * 3 + (50 + self.stack[s] * 100)) / 4, 100 - self.height * 100]);
			}

			if (self.stack.length && self.isAdding) {
				points.push([50 + self.stack[s - 1] * 0.8 * 100, 100 - self.height * 100 - 2]);
				points.push([50 + self.stack[s - 1] * 100, 100 - self.height * 100 - 5]);
			}
			if (points.length) self.points = points;

			self.isAdding = false;
		};

		self.add = function (dx) {
			self.stack.push(dx);
			self.isAdding = true;
		};

		// The cone (hat, head, body, stacked flush) stood on the floor, centred
		// on its left; the swirl's 1600 x 1000 svg sat centred above it, its
		// bottom edge CONE above the floor, and clipped what spilled outside it.
		// The swirl and then the eyes painted over the cone's boxes.
		self.draw = function (ctx) {
			const cx = GAME_X + self.left * GAME_W;
			const yBody = H - CONE / 4;
			const yHead = yBody - CONE / 2;
			const yHat = yHead - CONE / 4;

			art.roundRect(ctx, cx - CONE / 2, yHat, CONE, CONE / 4, CONE / 16, { fill: COLORS[nPlayer] });
			art.roundRect(ctx, cx - CONE / 4, yHead, CONE / 2, CONE / 2, [0, 0, CONE / 2, CONE / 2], { fill: 'white' });
			art.roundRect(ctx, cx - CONE / 4, yBody, CONE / 2, CONE / 4, [CONE / 2, CONE / 2, 0, 0], { fill: 'white' });

			const x0 = cx - W / 2;
			const y0 = H - CONE - H;
			ctx.save();
			ctx.beginPath();
			ctx.rect(x0, y0, W, H);
			ctx.clip();
			art.line(ctx, self.points.map((p) => [x0 + p[0] * W / 100, y0 + p[1] * H / 100]), {
				stroke: COLORS[nPlayer],
				lineWidth: THICC,
			});
			ctx.restore();

			// ". ." on a 50px line in 100px type, from the top of the head.
			ctx.save();
			ctx.font = EYES_FONT;
			const m = ctx.measureText('. .');
			const baseline = yHead + CONE / 8 + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.fillStyle = 'black';
			ctx.fillText('. .', cx, baseline);
			ctx.restore();
		};
	};

	/* ---------- a stream: what the nozzle has poured ---------- */

	const SoftServeStream = function (nPlayer) {

		const MULTY = 2;

		const self = this;
		self.history = [];

		// The path as last drawn, in the svg's 0..100 viewBox.
		self.points = [];

		self.add = function (x) {
			self.history.unshift(x);
			while (self.history.length > (100 / MULTY)) self.history.pop();

			self.points = self.history.map((v, h) => [v * 100, h * MULTY]);
		};

		self.getPXforPY = function (py) {
			return self.history[Math.round(py * (100 / MULTY))];
		};

		self.cutPY = function (py) {
			self.history.length = Math.round(py * (100 / MULTY));
		};

		// A 1600 x 1000 svg at the game box's left, NOZZLE from the top,
		// clipping the stream to itself.
		self.draw = function (ctx) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(GAME_X, NOZZLE, W, H);
			ctx.clip();
			art.line(ctx, self.points.map((p) => [GAME_X + p[0] * W / 100, NOZZLE + p[1] * H / 100]), {
				stroke: COLORS[nPlayer],
				lineWidth: THICC,
			});
			ctx.restore();
		};
	};

	/* ---------- a nozzle: sways, and pours into its stream ---------- */

	const SoftServeNozzle = function (nPlayer, stream) {

		const self = this;
		self.left = 0;      // its CSS left, a fraction of the game box's width

		let n = 0;
		self.step = function () {
			n++;
			const x = 0.5 + Math.sin(nPlayer * Math.PI + n * 0.05) * 0.1;

			self.left = x;

			stream.add(x);
		};

		self.getPXforPY = function (py) {
			return stream.getPXforPY(py);
		};

		self.cutPY = function (py) {
			stream.cutPY(py);
		};

		// The white tip, NOZZLE * 2 wide, centred on its left, on the ceiling.
		self.draw = function (ctx) {
			art.rect(ctx, GAME_X + self.left * GAME_W - NOZZLE, 0, NOZZLE * 2, NOZZLE, { fill: 'white' });
		};
	};

	/* ---------- the game ---------- */

	const self = this;

	const PLAYERS = 2;

	const cones = [];
	for (let i = 0; i < PLAYERS; i++) {
		cones[i] = new SoftServeCone(i);
	}

	const streams = [];
	const sources = [];
	for (let i = 0; i < cones.length; i++) {
		streams[i] = new SoftServeStream(i);
		sources[i] = new SoftServeNozzle(i, streams[i]);
	}

	function step() {
		for (const s in sources) sources[s].step();
		for (const c in cones) {
			const range = H;
			const yCone = H - CONE - NOZZLE;
			const py = yCone / range - cones[c].height - 0.05;
			const px = sources[c].getPXforPY(py);

			const w2 = (CONE / W) / 2;
			const dx = px - cones[c].px;

			if (Math.abs(dx) < w2) {
				cones[c].add(dx);
				sources[c].cutPY(py);
			}
		}

		for (const c in cones) cones[c].redraw();
	}

	self.setPlayers = function (p) {
		for (const m in cones) {
			cones[m].px = p[m].px;
			cones[m].pz = p[m].pz;
			cones[m].py = p[m].py;
		}
	};

	// Paint order is the old DOM order: the diner under its orange wash, then
	// the streams, the nozzles on the ceiling, and the cones on the floor.
	self.draw = function (ctx) {
		art.tile(ctx, BG, 0, 0, WIDTH, H);
		art.rect(ctx, 0, 0, WIDTH, H, { fill: '#ff9900', alpha: 0.9 });
		for (const s of streams) s.draw(ctx);
		for (const s of sources) s.draw(ctx);
		for (const c of cones) c.draw(ctx);
	};

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		clearInterval(interval);
	};
});
