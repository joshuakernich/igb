/*
 * Minecraft
 *
 * An experiment rather than a game: a wall of 8 x 5 see-through cubes fills
 * the front wall in perspective, standing on a grey floor that runs off into
 * the distance, under a sky that spans all three walls. Clicking a cube
 * turns it into a grass block (click again to turn it back). The players'
 * positions are stored on six placeholder meeps that were never drawn.
 * No rounds, no scores, no end.
 *
 * The old scene was CSS 3D (a perspective box, a floor turned flat with
 * rotateX and six-sided preserve-3d cubes on it); here every face is
 * projected by hand and painted into a cached buffer, redrawn only when a
 * cube changes.
 *
 * Input: px, py, pz, wall (kept on the placeholder meeps, nothing shows);
 * mouse clicks on the front wall.
 */
IGB.register('minecraft', function MinecraftGame(stage, playersMeta) {

	const art = IGB.art;

	// Never drawn: the old <minecraftmeep> was an empty, unstyled element.
	const MinecraftMeep = function () {

		const self = this;
		self.left = undefined;
		self.bottom = undefined;

		self.setHeight = function (h) {

		};
	};

	const MinecraftCube = function () {
		const self = this;
		self.on = false;

		self.toggle = function () {
			self.on = !self.on;
		};
	};

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	const CUBE = 200;
	const self = this;

	const TEXTURE = 'assets/minecraft/minecraft-cube.png';
	const BORDER = 5;               // each face's 5px dashed cyan border
	const FILL = 'rgba(0,255,255,0.1)';
	const STRIPS = 25;              // slices for texturing a face in perspective

	/* ---------- the 3D scene ---------- */

	// The game element (4800 x 1000) had perspective: W, so the eye looks at
	// its centre from W in front of the walls. Points are world x, y and z
	// (towards the viewer, 0 on the walls).
	const PERSPECTIVE = W;
	const EYE = { x: W * 3 / 2, y: H / 2 };

	function project(x, y, z) {
		const s = PERSPECTIVE / (PERSPECTIVE - z);
		return { x: EYE.x + (x - EYE.x) * s, y: EYE.y + (y - EYE.y) * s };
	}

	// The floor (<minecraftworld>) was W wide and 10 W long, its bottom edge
	// on the bottom of the front wall, turned flat by rotateX(90deg) about
	// that edge so it runs away from the viewer.
	const floor = [[W, H, 0], [2 * W, H, 0], [2 * W, H, -W * 10], [W, H, -W * 10]].map((p) => project(...p));

	// Chrome dashes a 5px border with dashes twice as long as it is wide and
	// gaps as near its width as fit whole dashes from corner to corner:
	// along a 200px side, 14 dashes and 13 gaps of 60/13.
	const DASH = BORDER * 2;
	const DASHES = (function () {
		const n = Math.round((CUBE + BORDER) / (DASH + BORDER));
		const gap = (CUBE - n * DASH) / (n - 1);
		return Array.from({ length: n }, (_, k) => k * (DASH + gap));
	})();

	const cubes = [];
	const faces = [];

	// A cube at column i, row y stood on the floor at left i * CUBE, raised
	// CUBE/2 + CUBE * y off it (translateZ) and pulled back one CUBE
	// (translateY), so its front faces tile the front wall exactly and it
	// reaches CUBE back from it. Its six sides were 200 x 200 boxes turned
	// into place; each face here is the 3D point o of its box's top-left
	// corner and the directions du, dv of its box's x and y, in the order
	// the sides were in the DOM.
	const ACROSS = [1, 0, 0];
	const DOWN = [0, 1, 0];
	const OUT = [0, 0, 1];

	for (var i = 0; i < 8; i++) {

		for (var y = 0; y < 5; y++) {
			const cube = new MinecraftCube();
			cubes.push(cube);

			const x0 = W + i * CUBE;
			const top = H - CUBE * (y + 1);
			const sides = [
				{ o: [x0, top, 0], du: ACROSS, dv: DOWN },               // front: rotateX(-90deg) translateZ(CUBE/2)
				{ o: [x0, top, -CUBE], du: ACROSS, dv: DOWN },           // back: rotateX(-90deg) translateZ(-CUBE/2)
				{ o: [x0, top, -CUBE], du: ACROSS, dv: OUT },            // top: translateZ(CUBE/2)
				{ o: [x0, top + CUBE, -CUBE], du: ACROSS, dv: OUT },     // bottom: translateZ(-CUBE/2)
				{ o: [x0, top, -CUBE], du: DOWN, dv: OUT },              // left: rotateY(90deg) translateZ(-CUBE/2)
				{ o: [x0 + CUBE, top, -CUBE], du: DOWN, dv: OUT },       // right: rotateY(90deg) translateZ(CUBE/2)
			];
			sides.forEach((side, n) => faces.push(makeFace(cube, side, n)));
		}
	}

	function makeFace(cube, side, n) {
		const face = Object.assign({ cube }, side);
		face.at = function (u, v) {
			return project(
				side.o[0] + u * side.du[0] + v * side.dv[0],
				side.o[1] + u * side.du[1] + v * side.dv[1],
				side.o[2] + u * side.du[2] + v * side.dv[2]);
		};
		face.quad = function (u0, v0, u1, v1, path) {
			const pts = [face.at(u0, v0), face.at(u1, v0), face.at(u1, v1), face.at(u0, v1)];
			path.moveTo(pts[0].x, pts[0].y);
			for (let k = 1; k < 4; k++) path.lineTo(pts[k].x, pts[k].y);
			path.closePath();
		};
		face.box = new Path2D();
		face.quad(0, 0, CUBE, CUBE, face.box);
		face.dashes = new Path2D();
		for (const d of DASHES) {
			face.quad(d, 0, d + DASH, BORDER, face.dashes);
			face.quad(d, CUBE - BORDER, d + DASH, CUBE, face.dashes);
			face.quad(0, d, BORDER, d + DASH, face.dashes);
			face.quad(CUBE - BORDER, d, CUBE, d + DASH, face.dashes);
		}
		// Back faces are furthest, front faces nearest; the faces between
		// cover each other from the outside in, so paint those furthest from
		// the eye first. Ties keep DOM order.
		const mid = face.at(CUBE / 2, CUBE / 2);
		face.order = n === 1 ? 0 : n === 0 ? 2 : 1;
		face.distance = Math.hypot(mid.x - EYE.x, mid.y - EYE.y);
		return face;
	}

	faces.sort((a, b) => a.order - b.order || (a.order === 1 ? b.distance - a.distance : 0));

	/* ---------- painting ---------- */

	// A cube that is on had the image as each face's background, sized 300%
	// of the 190px padding box (570 x 760) and positioned -100% 0%, which
	// puts a tile's corner at (385, 5): the face shows the middle column of
	// the top row, with a sliver of the tile above along its top. Draws in
	// the face's own 200 x 200 box; the caller clips.
	function paintTexture(c, img) {
		const area = CUBE - 2 * BORDER;
		const tw = 3 * area;
		const th = tw * img.naturalHeight / img.naturalWidth;
		const ox = BORDER + (area - tw) * -1;
		const oy = BORDER + (area - th) * 0;
		for (let ty = oy - th * Math.ceil(oy / th); ty < CUBE; ty += th) {
			for (let tx = ox - tw * Math.ceil(ox / tw); tx < CUBE; tx += tw) c.drawImage(img, tx, ty, tw, th);
		}
	}

	// Map a face's own box (u, v) onto the canvas between rows v0 and v1:
	// exact for front and back faces, which keep one depth; for the others
	// (deeper as v grows) exact down the left edge and at the middle row.
	function faceTransform(c, face, v0, v1) {
		const a = face.at(0, v0);
		const b = face.at(0, v1);
		const vm = (v0 + v1) / 2;
		const l = face.at(0, vm);
		const r = face.at(CUBE, vm);
		const ux = (r.x - l.x) / CUBE;
		const uy = (r.y - l.y) / CUBE;
		const vx = (b.x - a.x) / (v1 - v0);
		const vy = (b.y - a.y) / (v1 - v0);
		c.transform(ux, uy, vx, vy, a.x - vx * v0, a.y - vy * v0);
	}

	function paintFace(c, face, img) {
		if (!face.cube.on) {
			c.fillStyle = FILL;
			c.fill(face.box);
		} else if (img) {
			const strips = face.dv[2] ? STRIPS : 1;
			const step = CUBE / strips;
			for (let s = 0; s < strips; s++) {
				const v0 = s * step;
				const v1 = v0 + step;
				c.save();
				const clip = new Path2D();
				// Overlap the slices a little so no seam shows between them.
				face.quad(0, Math.max(0, v0 - 0.5), CUBE, Math.min(CUBE, v1 + 0.5), clip);
				c.clip(clip);
				faceTransform(c, face, v0, v1);
				paintTexture(c, img);
				c.restore();
			}
		}
		c.fillStyle = 'cyan';
		c.fill(face.dashes);
	}

	// The scene never moves, so it is painted into a buffer at the world's
	// resolution and repainted only when a cube changes, the texture
	// arrives or the window is resized (which clears the buffer).
	const scene = stage.surface(IGB.WIDTH, H);
	let painted = '';
	const unlisten = IGB.onResize(() => { painted = ''; });

	function paintScene() {
		const img = art.ready(TEXTURE);
		const key = cubes.map((c) => (c.on ? 1 : 0)).join('') + (img ? 'i' : '');
		if (key === painted) return;
		painted = key;

		const c = scene.ctx;
		scene.clear();
		art.rect(c, 0, 0, IGB.WIDTH, H, { fill: art.linear(c, 0, 0, 0, H, ['#2289C7', '#77CDEA']) });
		art.poly(c, floor, { fill: 'gray' });
		for (const face of faces) paintFace(c, face, img);
	}

	self.draw = function (ctx) {
		paintScene();
		ctx.drawImage(scene.canvas, 0, 0, IGB.WIDTH, H);
	};

	/* ---------- input ---------- */

	// Every click on the front wall lands on the front face of a cube.
	function onClick(e) {
		const p = IGB.toWorld(e);
		const col = Math.floor((p.x - W) / CUBE);
		const row = Math.floor((H - p.y) / CUBE);
		if (col >= 0 && col < 8 && row >= 0 && row < 5) cubes[col * 5 + row].toggle();
	}
	stage.$el.on('click', onClick);

	/* ---------- every tick ---------- */

	function step() {
		for (var m in meeps) {
			meeps[m].setHeight((1 - meeps[m].py) * H);

			meeps[m].left = meeps[m].wall * W + meeps[m].px * W;
			meeps[m].bottom = 0;
		}
	}

	let meeps = [];
	for (var m = 0; m < 6; m++) {
		meeps[m] = new MinecraftMeep(m);
	}

	self.setPlayers = function (p) {
		for (var m in meeps) {
			meeps[m].px = p[m].px;
			meeps[m].py = p[m].py;
			meeps[m].pz = p[m].pz;
			meeps[m].walls = p[m].walls;

			if (p[m].wall != undefined) {
				meeps[m].wall = p[m].wall;
				p[m].wall = undefined;
			}
			meeps[m].r = { W: p[m].rW, X: p[m].rX, Y: p[m].rY, Z: p[m].rZ };
		}
	};

	self.fini = function () {
		stage.$el.off('click', onClick);
		unlisten();
	};

	stage.interval(step, 1000 / FPS);
});
