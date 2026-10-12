/*
 * Meep — the players' avatar, drawn on canvas.
 *
 *   const meep = new Meep(n);       // n: player number, picks the hat colour
 *   meep.x = 2400; meep.y = 800;    // where its feet are
 *   meep.draw(ctx);                 // in your game's draw(ctx)
 *
 * Placement (all tweenable with jQuery, e.g. $(meep).animate({ y: 900 })):
 *
 *   x, y          the point between the feet
 *   scale, scaleX, scaleY, rotate (degrees, about the feet), opacity, visible
 *
 * Parts are plain objects of numbers. Their coordinates follow the CSS meep
 * this replaced: measured in px from the top-left of the avatar box, which
 * is 100 wide, meep.h tall (350 by default) and sits with its left edge on x.
 * Leave a value null to get the default.
 *
 *   head      { left: -50, top: 0, rotate, x, y, visible }   rotate(r) then translate(x, y) about its bottom centre
 *   body      { top: 150, height: 60, rotate, x, y, color, image, visible }   about its centre
 *   legs      { top: 210, height: h - 210, x: -width/2, y, rotate, color, visible }   translate then rotate, about top centre
 *   footLeft, footRight   { rotate }
 *   handLeft, handRight   { x: -70 / 70, y: 0.6 * h, visible }   the hand's centre
 *   eyes, mouth           { visible }
 *   shadow    { left: -75, top: -16.67, w: 150, h: 33.33, opacity: 0.5, visible }   relative to the feet
 *   accessory { image }   drawn over the body (name entry's features)
 *
 * Poses: toIdle(), toRagdoll(), toSkydiver(), toFlyer(). setHeight(h)
 * stretches the legs. doScore(n) floats "+n" above the head with a note.
 *
 * Also here:
 *   MeepHead(n)    a DOM element showing just the head (HUD, tally, lists)
 *   MeepView(n)    a DOM element showing a whole meep, for DOM and CSS 3D scenes
 *   Meep.drawHead(ctx, n, x, y, scale)   a head on any canvas, top-left at x, y
 *   Meep.drawHand(ctx, x, y, scale)      a hand centred on x, y
 */
(function () {

	const W = 100;              // avatar width
	const H = 350;              // default height
	const HEAD = { w: W, h: 150 };
	const BODY = { w: 60, h: 60 };
	const LEG_BORDER = 15;
	const GRAY = 'gray';

	const art = IGB.art;

	// "Ding" notes for scores, rising through a pentatonic scale. Each game
	// gets its own set, so they stop with it (see IGB.owner).
	const NOTES = ['point-c', 'point-d', 'point-e', 'point-g', 'point-a'];
	const noteSets = new WeakMap();
	let looseNotes;
	function notesFor() {
		const owner = IGB.owner();
		let set = owner ? noteSets.get(owner) : looseNotes;
		if (!set) {
			set = new AudioPlayer();
			for (const id of NOTES) set.add(id, `assets/shared/sfx-${id}.mp3`, 0.1);
			if (owner) noteSets.set(owner, set);
			else looseNotes = set;
		}
		return set;
	}
	let nNote = 0;

	function hatColor(n) {
		return PLAYER_COLORS[n] || GRAY;
	}

	function headShape(ctx, n, x, y, opts) {
		opts = opts || {};
		art.roundRect(ctx, x, y, HEAD.w, HEAD.h, HEAD.w / 2, {
			fill: 'white',
			shadow: opts.shadow === false ? undefined : { color: 'rgba(0,0,0,0.2)', blur: 10, y: 10 },
		});
		art.roundRect(ctx, x, y + 30, HEAD.w, 20, 5, { fill: hatColor(n) });
		if (opts.eyes !== false) {
			art.roundRect(ctx, x + 17.47, y + 75, 12, 20, 6, { fill: GRAY });
			art.roundRect(ctx, x + 70.53, y + 75, 12, 20, 6, { fill: GRAY });
		}
		if (opts.mouth !== false) {
			art.roundRect(ctx, x + 40, y + 102, 20, 10, [0, 0, { x: 10, y: 5 }, { x: 10, y: 5 }], { fill: GRAY });
		}
	}

	function handShape(ctx, x, y) {
		art.circle(ctx, x, y, 20, { fill: 'white' });
	}

	/* ---------- Meep ---------- */

	window.Meep = function (n) {

		const self = this;

		self.n = n;
		self.score = 0;

		self.x = 0;
		self.y = 0;
		self.scale = 1;
		self.scaleX = 1;
		self.scaleY = 1;
		self.rotate = 0;
		self.opacity = 1;
		self.visible = true;

		self.h = H;

		self.head = {};
		self.body = {};
		self.legs = {};
		self.footLeft = {};
		self.footRight = {};
		self.handLeft = {};
		self.handRight = {};
		self.eyes = { visible: true };
		self.mouth = { visible: true };
		self.shadow = {};
		self.accessory = { image: null };

		const popups = [];

		self.toIdle = function () {
			Object.assign(self.head, { left: null, top: null, rotate: 0, x: 0, y: 0 });
			Object.assign(self.body, { top: null, height: null, rotate: 0, x: 0, y: 0 });
			Object.assign(self.legs, { top: null, height: null, x: null, y: 0, rotate: 0 });
			self.footLeft.rotate = 0;
			self.footRight.rotate = 0;
			Object.assign(self.handLeft, { x: null, y: null });
			Object.assign(self.handRight, { x: null, y: null });
		};

		function initParts() {
			self.toIdle();
			for (const part of [self.head, self.body, self.legs, self.handLeft, self.handRight]) part.visible = true;
			self.body.color = 'white';
			self.body.image = null;
			self.legs.color = 'white';
			Object.assign(self.shadow, { left: -75, top: -W / 6, w: W * 1.5, h: W / 3, opacity: 0.5, visible: true });
		}
		initParts();

		self.setHeight = function (h) {
			self.h = h;
		};

		// How much the legs bow: 1 at normal height, less as the meep stretches.
		function legScale() {
			return Math.max(0, Math.min(1, H / self.h));
		}

		self.legsWidth = function () {
			return W * (30 + 70 * legScale()) / 100;
		};

		self.toRagdoll = function () {
			Object.assign(self.head, { rotate: 45, x: 20, y: 0 });
			Object.assign(self.body, { rotate: 70, x: -30, y: 0 });
			Object.assign(self.legs, { x: -80, y: -50, rotate: 15 });
			self.footLeft.rotate = -25;
			self.footRight.rotate = 25;
			self.handLeft.visible = false;
			self.handRight.visible = false;
		};

		self.toSkydiver = function () {
			Object.assign(self.head, { rotate: -10, x: 20, y: 0 });
			Object.assign(self.body, { top: 120, rotate: 15 });
			Object.assign(self.legs, { top: 180, height: 50, x: -0.55 * self.legsWidth(), rotate: 15 });
			self.footLeft.rotate = -25;
			self.footRight.rotate = 25;
			Object.assign(self.handLeft, { x: -100, y: 150 });
			Object.assign(self.handRight, { x: 100, y: 150 });
		};

		self.toFlyer = function () {
			Object.assign(self.handLeft, { x: -20, y: -20 });
			Object.assign(self.handRight, { x: 90, y: 170 });
			Object.assign(self.head, { rotate: 10, x: 20, y: 0 });
			Object.assign(self.body, { height: 80, top: 130 });
			Object.assign(self.legs, { top: 215, height: 50, x: -0.4 * self.legsWidth(), rotate: -15 });
		};

		// Float "+s" up from the top of the head.
		self.doScore = function (s = 1) {
			const dir = Math.random() > 0.5 ? 1 : -1;
			const dx = 50 + Math.random() * 50;
			const popup = { text: s >= 0 ? '+' + s : String(s), x: 0, y: 0, opacity: 1 };
			popups.push(popup);
			$(popup)
				.animate({ y: -200, x: dx / 2 * dir }, 200)
				.animate({ y: Math.random() * 100, x: dx * dir, opacity: 0 }, 500, function () {
					popups.splice(popups.indexOf(popup), 1);
				});
			nNote++;
			notesFor().play(NOTES[nNote % NOTES.length], true);
		};

		/* ---------- drawing ---------- */

		// Draw at (meep.x, meep.y) with the meep's own transform. layer, as
		// for drawLocal: 'body', 'hands' or everything. Drawing every meep's
		// body, then other art, then every meep's hands, puts the hands on
		// top the way the CSS meep's z-index: 1 hands were.
		self.draw = function (ctx, layer) {
			if (!self.visible || self.opacity <= 0) return;
			ctx.save();
			ctx.translate(self.x, self.y);
			if (self.rotate) ctx.rotate(self.rotate * Math.PI / 180);
			const sx = self.scale * self.scaleX;
			const sy = self.scale * self.scaleY;
			if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
			ctx.globalAlpha *= self.opacity;
			self.drawLocal(ctx, layer);
			ctx.restore();
		};

		// Draw with the feet at (0, 0) of the current transform. layer is
		// 'body' (everything but the hands), 'hands', or undefined for all.
		self.drawLocal = function (ctx, layer) {
			const top = -self.h; // avatar top, relative to the feet

			if (layer === 'hands') {
				drawHands(ctx, top);
				return;
			}

			if (self.shadow.visible) {
				const s = self.shadow;
				art.ellipse(ctx, s.left + s.w / 2, s.top + s.h / 2, s.w / 2, s.h / 2, { fill: 'black', alpha: s.opacity });
			}

			if (self.legs.visible) drawLegs(ctx, top);
			if (self.body.visible) drawBody(ctx, top);
			if (self.head.visible) drawHead(ctx, top);

			// Score popups sit under the hands, as they did in the DOM meep.
			for (const p of popups) {
				art.text(ctx, p.text, p.x, top + p.y, {
					size: 150, weight: 600, fill: 'white', alpha: p.opacity,
					shadow: { color: 'rgba(0,0,0,0.5)', blur: 0, y: 5 },
				});
			}

			if (layer !== 'body') drawHands(ctx, top);
		};

		function drawHands(ctx, top) {
			if (self.handLeft.visible) handShape(ctx, val(self.handLeft.x, -W * 0.7), top + val(self.handLeft.y, self.h * 0.6));
			if (self.handRight.visible) handShape(ctx, val(self.handRight.x, W * 0.7), top + val(self.handRight.y, self.h * 0.6));
		}

		function val(v, fallback) {
			return v === null || v === undefined ? fallback : v;
		}

		function drawLegs(ctx, top) {
			const L = self.legs;
			const lw = self.legsWidth();
			const lt = top + val(L.top, HEAD.h + BODY.h);
			const lh = Math.max(0, val(L.height, self.h - HEAD.h - BODY.h));
			const ox = lw / 2; // transform origin: top centre of the legs box
			const round = 0.5 * legScale();
			const color = L.color || 'white';

			ctx.save();
			ctx.translate(ox, lt);
			ctx.translate(val(L.x, -lw / 2), L.y || 0);
			if (L.rotate) ctx.rotate(L.rotate * Math.PI / 180);
			ctx.translate(-ox, -lt);

			// Each leg is the border of a tall rounded box, bowed on one side,
			// clipped to hide its inner edge and the part below the ground.
			const boxTop = lt - 20;
			const boxH = lh + 40;
			const r = { x: lw * round, y: boxH * round };
			const style = { fill: color };

			ctx.save();
			ctx.beginPath();
			ctx.rect(0, boxTop, lw - 20, boxH - 20);
			ctx.clip();
			art.border(ctx, 0, boxTop, lw, boxH, [r, 0, 0, r], LEG_BORDER, style);
			ctx.restore();

			ctx.save();
			ctx.beginPath();
			ctx.rect(20, boxTop, lw - 20, boxH - 20);
			ctx.clip();
			art.border(ctx, 0, boxTop, lw, boxH, [0, r, r, 0], LEG_BORDER, style);
			ctx.restore();

			// Feet, each pivoting on its outer bottom corner.
			const footY = lt + lh;
			const foot = [{ x: 10, y: 5 }, { x: 10, y: 5 }, 0, 0];
			ctx.save();
			ctx.translate(20, footY);
			if (self.footLeft.rotate) ctx.rotate(self.footLeft.rotate * Math.PI / 180);
			art.roundRect(ctx, -20, -10, 20, 10, foot, { fill: 'white' });
			ctx.restore();
			ctx.save();
			ctx.translate(lw - 20, footY);
			if (self.footRight.rotate) ctx.rotate(self.footRight.rotate * Math.PI / 180);
			art.roundRect(ctx, 0, -10, 20, 10, foot, { fill: 'white' });
			ctx.restore();

			ctx.restore();
		}

		function drawBody(ctx, top) {
			const B = self.body;
			const bt = top + val(B.top, HEAD.h);
			const bh = val(B.height, BODY.h);
			const x = -BODY.w / 2;

			ctx.save();
			ctx.translate(0, bt + bh / 2);
			if (B.rotate) ctx.rotate(B.rotate * Math.PI / 180);
			ctx.translate(B.x || 0, B.y || 0);
			ctx.translate(0, -(bt + bh / 2));

			art.roundRect(ctx, x, bt, BODY.w, bh, BODY.w / 2, { fill: B.color || 'white' });
			if (B.image) {
				const img = art.ready(B.image);
				if (img) {
					ctx.save();
					ctx.beginPath();
					art.roundRectPath(ctx, x, bt, BODY.w, bh, BODY.w / 2);
					ctx.clip();
					ctx.drawImage(img, x, bt, BODY.w, BODY.w * img.naturalHeight / img.naturalWidth);
					ctx.restore();
				}
			}
			// the neck (always white, even under a coloured shirt)
			art.rect(ctx, x + BODY.w * 0.3, bt - 10, BODY.w * 0.4, 20, { fill: 'white' });

			if (self.accessory.image) {
				const img = art.ready(self.accessory.image);
				if (img) {
					const aw = BODY.w * 2;
					ctx.save();
					ctx.beginPath();
					ctx.rect(x - BODY.w / 2, bt - bh / 2, aw, bh * 2);
					ctx.clip();
					ctx.drawImage(img, x - BODY.w / 2, bt - bh / 2, aw, aw * img.naturalHeight / img.naturalWidth);
					ctx.restore();
				}
			}
			ctx.restore();
		}

		function drawHead(ctx, top) {
			const Hd = self.head;
			const hx = val(Hd.left, -W / 2);
			const hy = top + val(Hd.top, 0);

			ctx.save();
			ctx.translate(hx + HEAD.w / 2, hy + HEAD.h);
			if (Hd.rotate) ctx.rotate(Hd.rotate * Math.PI / 180);
			ctx.translate(Hd.x || 0, Hd.y || 0);
			ctx.translate(-(hx + HEAD.w / 2), -(hy + HEAD.h));
			headShape(ctx, self.n, hx, hy, { eyes: self.eyes.visible, mouth: self.mouth.visible });
			ctx.restore();
		}
	};

	Meep.W = W;
	Meep.H = H;
	Meep.HEAD = HEAD;

	Meep.drawHead = function (ctx, n, x, y, scale, opts) {
		ctx.save();
		ctx.translate(x, y);
		if (scale && scale !== 1) ctx.scale(scale, scale);
		headShape(ctx, n, 0, 0, opts);
		ctx.restore();
	};

	Meep.drawHand = function (ctx, x, y, scale) {
		ctx.save();
		ctx.translate(x, y);
		if (scale && scale !== 1) ctx.scale(scale, scale);
		handShape(ctx, 0, 0);
		ctx.restore();
	};

	/* ---------- DOM versions ---------- */

	const SHARP = 3; // backing pixels per CSS pixel for DOM canvases

	// Just the head, as a 100 x 150 element. Style and place it with CSS
	// (selector: meep-head). Its drop shadow is a CSS box-shadow.
	window.MeepHead = function (n) {
		const self = this;
		self.n = n;
		self.$el = $('<meep-head>').attr('player', n);
		const canvas = document.createElement('canvas');
		canvas.width = HEAD.w * SHARP;
		canvas.height = HEAD.h * SHARP;
		const ctx = canvas.getContext('2d');
		ctx.scale(SHARP, SHARP);
		headShape(ctx, n, 0, 0, { shadow: false });
		self.$el.append(canvas);
	};

	// A whole meep as a DOM element. The element is a point at the meep's
	// feet (like the old CSS meep), so position it with left / top / bottom
	// and transform it with CSS, including in CSS 3D scenes.
	//
	//   const view = new MeepView(n);
	//   view.$el.appendTo($somewhere).css({ left: 100, top: 400 });
	//   view.meep.toFlyer(); view.redraw();     // or view.live() to redraw every frame
	window.MeepView = function (n, opts) {
		const self = this;
		opts = opts || {};
		const pad = opts.pad || 250;  // room around the avatar for poses and score popups
		const maxH = opts.maxHeight || H;

		self.meep = new Meep(n);
		self.$el = $('<meep-view>').attr('player', n);

		// Two canvases: the hands get their own, raised with z-index: 1, so
		// they overlap neighbouring DOM (a podium's reward card) the way the
		// CSS meep's hands did.
		const layers = ['body', 'hands'].map(function (name) {
			const canvas = document.createElement('canvas');
			$(canvas).addClass(name);
			return { name, canvas, ctx: canvas.getContext('2d') };
		});
		let box;
		let stopLive;

		function size() {
			const h = Math.max(maxH, self.meep.h);
			box = { x: -W / 2 - pad, y: -h - pad - 150, w: W + pad * 2, h: h + pad * 2 + 150 };
			const k = Math.min(SHARP, Math.max(1, IGB.scale * IGB.pixelRatio * 1.5));
			for (const { canvas, ctx } of layers) {
				canvas.width = Math.ceil(box.w * k);
				canvas.height = Math.ceil(box.h * k);
				$(canvas).css({ position: 'absolute', left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
				ctx.setTransform(canvas.width / box.w, 0, 0, canvas.height / box.h, -box.x * canvas.width / box.w, -box.y * canvas.height / box.h);
			}
		}

		self.redraw = function () {
			if (-self.meep.h - pad - 150 < box.y) size();
			for (const { name, canvas, ctx } of layers) {
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.restore();
				self.meep.drawLocal(ctx, name);
			}
		};

		// Redraw every animation frame until the element leaves the page.
		self.live = function () {
			if (stopLive) return;
			let attached = false;
			stopLive = IGB.onFrame(function () {
				if (document.contains(self.$el[0])) attached = true;
				else if (attached) { stopLive(); stopLive = undefined; return; }
				self.redraw();
			});
		};

		self.setHeight = function (h) { self.meep.setHeight(h); self.redraw(); };
		self.doScore = function (s) { self.meep.doScore(s); self.live(); };

		size();
		for (const { canvas } of layers) self.$el.append(canvas);
		self.redraw();
	};
})();
