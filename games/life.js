/*
 * Life
 *
 * An experiment rather than a game: six life-like avatars, one for each
 * tracked player, stand on a plain gray room. Each walks along the wall its
 * player last touched, as tall as its player stands, and tilts its head with
 * how fast its player is moving sideways. No rounds, no scores, no end.
 *
 * Input: px (along the wall), py (height), wall (the wall last touched).
 */
IGB.register('life', function LifeGame(stage, playersMeta) {

	const FPS = 50;
	const W = 1600;
	const H = 1000;
	const art = IGB.art;
	const self = this;

	const HEAD_IMAGE = 'assets/life/life-head.png';
	const EYE_IMAGE = 'assets/life/texture-eye.jpg';

	/* ---------- the life meep (was life-meep.js) ---------- */

	// The old lifemeep was the party meep with a photographic head: its
	// shadow, body and hands match the shared Meep's exactly, so those come
	// from a Meep, and the head and legs are drawn here.
	//
	// The head is a 114 x 150 box centred on the meep and rounded by 50px,
	// filled with the head image at full width, turning about its bottom
	// centre. In it sit two eyes (40 x 22 pills of eye texture under a 2px
	// dark lid line) and the gray mouth, where the old inline layout put
	// them (measured from the old page: eye centres 31.47 and 82.53 across,
	// 65 down; mouth 20 x 10 at 47, 110). The hat stays hidden, as it was.
	const HEAD = { w: 114, h: 150, left: -57, radius: 50 };
	const EYES = [31.47, 82.53];
	const EYE_Y = 65;
	const LEG_TOP = 210;      // head 150 + body 60
	const LEG_BORDER = 15;

	const LifeMeep = function (n) {

		const self = this;
		self.n = n;
		self.score = 0;

		// The point between the feet: `left` across the room, `bottom` up
		// from the floor, as the old element was placed.
		self.left = undefined;
		self.bottom = undefined;
		self.head = { rotate: 0 };

		const meep = new Meep(n);
		meep.head.visible = false;
		meep.legs.visible = false;

		self.setHeight = function (h) {
			self.h = h;
			meep.setHeight(Math.max(0, h)); // jQuery's .height() stopped at 0
		};

		self.setHeight(Meep.H);

		// layer: 'body' (everything but the hands) or 'hands', as for Meep.
		self.draw = function (ctx, layer) {
			// Until it is first placed the old element sat at its static
			// position: the top-left corner of the room.
			meep.x = self.left === undefined ? 0 : self.left;
			meep.y = H - (self.bottom === undefined ? H : self.bottom);
			if (layer === 'hands') {
				meep.draw(ctx, 'hands');
				return;
			}
			// Shadow and body, then the legs over them (all flat white, so
			// legs over body looks the same as the old body over legs).
			meep.draw(ctx, 'body');
			ctx.save();
			ctx.translate(meep.x, meep.y);
			drawLegs(ctx, -meep.h, meep.h, self.h);
			drawHead(ctx, -meep.h, self.head.rotate);
			ctx.restore();
		};
	};

	// The legs, the avatar's top at y = top and its feet at (0, 0): two
	// bowed borders, each clipped to hide its inner edge and the 20px below
	// the ground, and the feet. They bow less as the meep stretches past its
	// 350 height. (The shared Meep draws these too, but once the horizontal
	// radius drops under the 15px border, art.border keeps the inner
	// corner's vertical radius and the path cuts a diagonal wedge across the
	// right leg; CSS squares such a corner, as legBorder does.)
	function drawLegs(ctx, top, h, hRaw) {
		const scale = Math.max(0, Math.min(1, Meep.H / hRaw));
		const lw = Meep.W * (30 + 70 * scale) / 100;
		const lt = top + LEG_TOP;
		const lh = Math.max(0, h - LEG_TOP);
		const round = 0.5 * scale;
		const boxTop = lt - 20;
		const boxH = lh + 40;
		const r = { x: lw * round, y: boxH * round };

		ctx.save();
		ctx.translate(-lw / 2, 0); // transform: translate(-50%)

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, boxTop, lw - 20, boxH - 20);
		ctx.clip();
		legBorder(ctx, 0, boxTop, lw, boxH, [r, 0, 0, r]);
		ctx.restore();

		ctx.save();
		ctx.beginPath();
		ctx.rect(20, boxTop, lw - 20, boxH - 20);
		ctx.clip();
		legBorder(ctx, 0, boxTop, lw, boxH, [0, r, r, 0]);
		ctx.restore();

		const foot = [{ x: 10, y: 5 }, { x: 10, y: 5 }, 0, 0];
		art.roundRect(ctx, 0, lt + lh - 10, 20, 10, foot, { fill: 'white' });
		art.roundRect(ctx, lw - 20, lt + lh - 10, 20, 10, foot, { fill: 'white' });

		ctx.restore();
	}

	// A 15px white border round a rounded box, as CSS draws it.
	function legBorder(ctx, x, y, w, h, radii) {
		const outer = art.fitRadii(w, h, radii);
		const inner = outer.map(function (c) {
			const ix = Math.max(0, c.x - LEG_BORDER);
			const iy = Math.max(0, c.y - LEG_BORDER);
			return ix > 0 && iy > 0 ? { x: ix, y: iy } : { x: 0, y: 0 };
		});
		ctx.beginPath();
		art.roundRectPath(ctx, x, y, w, h, outer);
		art.roundRectPath(ctx, x + LEG_BORDER, y + LEG_BORDER, w - LEG_BORDER * 2, h - LEG_BORDER * 2, inner);
		ctx.fillStyle = 'white';
		ctx.fill('evenodd');
	}

	// The head with the avatar's top at y = top (the feet at 0, 0).
	function drawHead(ctx, top, rotate) {
		const x = HEAD.left;
		const y = top;

		ctx.save();
		ctx.translate(0, y + HEAD.h);
		if (rotate) ctx.rotate(rotate * Math.PI / 180);
		ctx.translate(0, -(y + HEAD.h));

		// background-image at background-size: 100%, clipped to the corners
		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, x, y, HEAD.w, HEAD.h, HEAD.radius);
		ctx.clip();
		art.tile(ctx, HEAD_IMAGE, x, y, HEAD.w, HEAD.h, HEAD.w);
		ctx.restore();

		for (const ex of EYES) drawEye(ctx, x + ex, y + EYE_Y);

		art.roundRect(ctx, x + 47, y + 110, 20, 10, [0, 0, { x: 10, y: 5 }, { x: 10, y: 5 }], { fill: 'gray' });

		ctx.restore();
	}

	// An eye centred on (cx, cy): a 40 x 22 pill (border-radius 100px
	// shrinks to 11), the texture 50 wide centred on the 40 x 20 box under
	// the lid, and the 2px #333 top border following the curve.
	function drawEye(ctx, cx, cy) {
		const x = cx - 20;
		const y = cy - 11;
		const outer = 11;
		const inner = [{ x: 11, y: 9 }, { x: 11, y: 9 }, 11, 11];

		const img = art.ready(EYE_IMAGE);
		if (img) {
			const iw = 50;
			const ih = iw * img.naturalHeight / img.naturalWidth;
			ctx.save();
			ctx.beginPath();
			art.roundRectPath(ctx, x, y, 40, 22, outer);
			ctx.clip();
			// background-position: center, repeating, within the padding box
			const px = x + (40 - iw) / 2;
			const py = y + 2 + (20 - ih) / 2;
			const x0 = px - Math.ceil((px - x) / iw) * iw;
			const y0 = py - Math.ceil((py - y) / ih) * ih;
			for (let ty = y0; ty < y + 22; ty += ih) {
				for (let tx = x0; tx < x + 40; tx += iw) ctx.drawImage(img, tx, ty, iw, ih);
			}
			ctx.restore();
		}

		ctx.save();
		ctx.beginPath();
		art.roundRectPath(ctx, x, y, 40, 22, outer);
		art.roundRectPath(ctx, x, y + 2, 40, 20, inner);
		ctx.fillStyle = '#333';
		ctx.fill('evenodd');
		ctx.restore();
	}

	/* ---------- every tick ---------- */

	function step() {
		for (var m in meeps) {

			if (!meeps[m].pxHistory) meeps[m].pxHistory = [meeps[m].px];

			meeps[m].pxHistory.push(meeps[m].px);

			while (meeps[m].pxHistory.length > FPS / 4) meeps[m].pxHistory.shift();

			meeps[m].dx = meeps[m].pxHistory[meeps[m].pxHistory.length - 1] - meeps[m].pxHistory[0];

			// jQuery's .css() ignored NaN (before the tracker reports, or
			// before a wall is known), leaving the element as it was.
			const h = (1 - meeps[m].py) * H;
			if (isFinite(h)) meeps[m].setHeight(h);

			const rotate = meeps[m].dx * 90;
			if (isFinite(rotate)) meeps[m].head.rotate = rotate;

			const left = meeps[m].wall * W + meeps[m].px * W;
			if (isFinite(left)) meeps[m].left = left;
			meeps[m].bottom = 0;
		}
	}

	let meeps = [];
	for (var m = 0; m < 6; m++) {
		meeps[m] = new LifeMeep(m);
	}

	/* ---------- drawing (every animation frame) ---------- */

	self.draw = function (ctx) {
		art.rect(ctx, 0, 0, W * 3, H, { fill: '#bbb' });
		// The hands had z-index: 1, so every meep's hands sit over every meep.
		for (const meep of meeps) meep.draw(ctx, 'body');
		for (const meep of meeps) meep.draw(ctx, 'hands');
	};

	/* ---------- input ---------- */

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

	const interval = stage.interval(step, 1000 / FPS);

	self.fini = function () {
		clearInterval(interval);
	};
});
