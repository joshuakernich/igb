/*
 * IGB.art — small helpers for drawing game art on a canvas.
 *
 * Every shape helper takes a style object as its last argument:
 *
 *   { fill, stroke, lineWidth, alpha, shadow: { color, blur, x, y },
 *     lineCap, lineJoin, dash }
 *
 * fill and stroke take anything a canvas accepts: a colour, or a gradient
 * from art.linear / art.radial. Helpers save and restore the context, so
 * styles never leak from one call to the next.
 *
 *   const art = IGB.art;
 *   art.roundRect(ctx, 100, 100, 200, 80, 20, { fill: 'white', shadow: { color: 'rgba(0,0,0,.3)', blur: 10, y: 5 } });
 *   art.text(ctx, 'GO!', 2400, 500, { size: 200, font: 'Knewave', fill: 'white', outline: '#333', outlineWidth: 10 });
 *   art.with(ctx, { x: 2400, y: 800, rotate: 15, scale: 0.5 }, () => meep.draw(ctx));
 */
IGB.art = (function () {

	const art = {};

	function apply(ctx, style) {
		if (!style) return;
		if (style.alpha !== undefined) ctx.globalAlpha *= style.alpha;
		if (style.composite) ctx.globalCompositeOperation = style.composite;
		if (style.lineWidth !== undefined) ctx.lineWidth = style.lineWidth;
		if (style.lineCap) ctx.lineCap = style.lineCap;
		if (style.lineJoin) ctx.lineJoin = style.lineJoin;
		if (style.dash) ctx.setLineDash(style.dash);
		if (style.shadow) setShadow(ctx, style.shadow);
	}

	// Canvas shadows ignore the current transform; CSS box-shadows don't.
	// Map the offset and blur through the transform so a shadow looks the
	// same at any scale or rotation, like its CSS counterpart.
	function setShadow(ctx, s) {
		const m = ctx.getTransform();
		const ox = s.x || 0;
		const oy = s.y || 0;
		ctx.shadowColor = s.color || 'rgba(0,0,0,0.5)';
		ctx.shadowOffsetX = m.a * ox + m.c * oy;
		ctx.shadowOffsetY = m.b * ox + m.d * oy;
		ctx.shadowBlur = (s.blur || 0) * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
	}
	art.setShadow = setShadow;

	function paint(ctx, style, fillRule) {
		if (!style) style = { fill: 'white' };
		if (style.fill) {
			ctx.fillStyle = style.fill;
			ctx.fill(fillRule || 'nonzero');
		}
		if (style.stroke) {
			// A fill's shadow is enough; don't double it on the outline.
			if (style.fill) ctx.shadowColor = 'transparent';
			ctx.strokeStyle = style.stroke;
			ctx.stroke();
		}
	}

	// How many device pixels one unit is under the current transform. Canvas
	// shadows and filters ignore the transform, so scale their lengths by this:
	//   ctx.filter = `blur(${art.px(ctx, 10)}px)`
	art.px = function (ctx, n = 1) {
		const m = ctx.getTransform();
		return n * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
	};

	// Run fn with the context saved, then restore it.
	art.save = function (ctx, fn) {
		ctx.save();
		try { fn(ctx); } finally { ctx.restore(); }
	};

	// Draw with a transform. t: { x, y, rotate (degrees), scale, scaleX,
	// scaleY, alpha, originX, originY }. The drawing's (originX, originY)
	// point lands on (x, y), and rotation and scale pivot around it.
	art.with = function (ctx, t, fn) {
		ctx.save();
		try {
			ctx.translate(t.x || 0, t.y || 0);
			if (t.rotate) ctx.rotate(t.rotate * Math.PI / 180);
			const sx = (t.scaleX !== undefined ? t.scaleX : 1) * (t.scale !== undefined ? t.scale : 1);
			const sy = (t.scaleY !== undefined ? t.scaleY : 1) * (t.scale !== undefined ? t.scale : 1);
			if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
			if (t.originX || t.originY) ctx.translate(-(t.originX || 0), -(t.originY || 0));
			if (t.alpha !== undefined) ctx.globalAlpha *= t.alpha;
			fn(ctx);
		} finally {
			ctx.restore();
		}
	};

	/* ---------- shapes ---------- */

	art.rect = function (ctx, x, y, w, h, style) {
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		paint(ctx, style);
		ctx.restore();
	};

	// radii: a number, or [tl, tr, br, bl], each a number or { x, y } for an
	// elliptical corner. Oversized radii shrink to fit, as in CSS.
	art.roundRect = function (ctx, x, y, w, h, radii, style) {
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		art.roundRectPath(ctx, x, y, w, h, radii);
		paint(ctx, style);
		ctx.restore();
	};

	art.roundRectPath = function (ctx, x, y, w, h, radii) {
		const r = fitRadii(w, h, radii);
		ctx.moveTo(x + r[0].x, y);
		ctx.lineTo(x + w - r[1].x, y);
		corner(ctx, x + w - r[1].x, y + r[1].y, r[1], -Math.PI / 2, 0);
		ctx.lineTo(x + w, y + h - r[2].y);
		corner(ctx, x + w - r[2].x, y + h - r[2].y, r[2], 0, Math.PI / 2);
		ctx.lineTo(x + r[3].x, y + h);
		corner(ctx, x + r[3].x, y + h - r[3].y, r[3], Math.PI / 2, Math.PI);
		ctx.lineTo(x, y + r[0].y);
		corner(ctx, x + r[0].x, y + r[0].y, r[0], Math.PI, Math.PI * 1.5);
		ctx.closePath();
	};

	function corner(ctx, cx, cy, r, a0, a1) {
		if (r.x > 0 && r.y > 0) ctx.ellipse(cx, cy, r.x, r.y, 0, a0, a1);
	}

	// CSS border-radius rules: four corners, each { x, y }, scaled down
	// together if neighbouring corners would overlap.
	function fitRadii(w, h, radii) {
		let list = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
		if (list.length === 2) list = [list[0], list[1], list[0], list[1]];
		if (list.length === 3) list = [list[0], list[1], list[2], list[1]];
		const r = list.map(function (v) {
			const c = (typeof v === 'object' && v !== null) ? { x: v.x || 0, y: v.y || 0 } : { x: v || 0, y: v || 0 };
			// As in CSS, a corner with either radius at zero is square.
			return c.x > 0 && c.y > 0 ? c : { x: 0, y: 0 };
		});
		const f = Math.min(
			1,
			w / Math.max(1e-9, r[0].x + r[1].x),
			w / Math.max(1e-9, r[3].x + r[2].x),
			h / Math.max(1e-9, r[0].y + r[3].y),
			h / Math.max(1e-9, r[1].y + r[2].y)
		);
		return r.map((c) => ({ x: c.x * f, y: c.y * f }));
	}
	art.fitRadii = fitRadii;

	// The border of a rounded box, like a CSS border: the band between the
	// outer rounded rectangle and the same shape inset by `width`.
	art.border = function (ctx, x, y, w, h, radii, width, style) {
		const outer = fitRadii(w, h, radii);
		const inner = outer.map((c) => ({ x: Math.max(0, c.x - width), y: Math.max(0, c.y - width) }));
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		art.roundRectPath(ctx, x, y, w, h, outer);
		art.roundRectPath(ctx, x + width, y + width, w - width * 2, h - width * 2, inner);
		paint(ctx, style, 'evenodd');
		ctx.restore();
	};

	// An inner shadow, like CSS box-shadow: inset. path(ctx) traces the shape
	// (without beginPath); shadow is { color, blur, x, y }.
	art.inset = function (ctx, path, shadow) {
		ctx.save();
		ctx.beginPath();
		path(ctx);
		ctx.clip();
		// Fill a big frame around the shape; only its shadow lands inside.
		ctx.beginPath();
		ctx.rect(-1e5, -1e5, 2e5, 2e5);
		path(ctx);
		setShadow(ctx, shadow);
		// Opaque fill: a canvas shadow multiplies its colour's alpha by the
		// shape's, so a translucent fill would square the shadow's alpha.
		ctx.fillStyle = 'black';
		ctx.fill('evenodd');
		ctx.restore();
	};

	art.circle = function (ctx, x, y, r, style) {
		art.ellipse(ctx, x, y, r, r, style);
	};

	art.ellipse = function (ctx, x, y, rx, ry, style) {
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
		paint(ctx, style);
		ctx.restore();
	};

	// points: [[x, y], ...] or [{ x, y }, ...]
	art.poly = function (ctx, points, style) {
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		pathPoints(ctx, points);
		ctx.closePath();
		paint(ctx, style);
		ctx.restore();
	};

	art.line = function (ctx, points, style) {
		ctx.save();
		apply(ctx, Object.assign({ lineCap: 'round', lineJoin: 'round' }, style));
		ctx.beginPath();
		pathPoints(ctx, points);
		ctx.strokeStyle = (style && style.stroke) || 'white';
		ctx.stroke();
		ctx.restore();
	};

	function pathPoints(ctx, points) {
		points.forEach((p, i) => {
			const x = Array.isArray(p) ? p[0] : p.x;
			const y = Array.isArray(p) ? p[1] : p.y;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
	}

	// An SVG path string, drawn at (x, y) with an optional scale.
	art.path = function (ctx, d, x, y, scale, style) {
		ctx.save();
		ctx.translate(x || 0, y || 0);
		if (scale && scale !== 1) ctx.scale(scale, scale);
		apply(ctx, style);
		const path = new Path2D(d);
		if (!style || style.fill) { ctx.fillStyle = (style && style.fill) || 'white'; ctx.fill(path); }
		if (style && style.stroke) { ctx.strokeStyle = style.stroke; ctx.stroke(path); }
		ctx.restore();
	};

	/* ---------- colour ---------- */

	// stops: ['red', 'blue'] spread evenly, or [[0, 'red'], [0.3, 'blue'], ...]
	function addStops(g, stops) {
		stops.forEach((s, i) => {
			if (Array.isArray(s)) g.addColorStop(s[0], s[1]);
			else g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), s);
		});
		return g;
	}

	art.linear = function (ctx, x0, y0, x1, y1, stops) {
		return addStops(ctx.createLinearGradient(x0, y0, x1, y1), stops);
	};

	art.radial = function (ctx, x, y, r0, r1, stops) {
		return addStops(ctx.createRadialGradient(x, y, r0, x, y, r1), stops);
	};

	art.playerColor = function (n) {
		return PLAYER_COLORS[n] || 'gray';
	};

	/* ---------- text ---------- */

	// style: { size, font, weight, fill, align, baseline, alpha,
	//          outline, outlineWidth   a stroke drawn under the fill,
	//          drop, dropY             a solid copy offset below (the HUD look),
	//          shadow }
	art.text = function (ctx, str, x, y, style) {
		style = style || {};
		const alpha = ctx.globalAlpha * (style.alpha === undefined ? 1 : style.alpha);
		if (alpha <= 0) return;
		// See-through text with layers (a drop, an outline, a shadow) is drawn
		// whole, opaque, off to one side, then laid down at its alpha in one go:
		// so it fades as one thing, never showing the layers through each other.
		const layered = style.drop || style.outline || style.shadow;
		if (alpha < 0.995 && layered && flatText(ctx, str, x, y, style, alpha)) return;
		ctx.save();
		apply(ctx, { alpha: style.alpha, shadow: style.shadow });
		textLayers(ctx, str, x, y, style);
		ctx.restore();
	};

	// the text's layers, as they are: the drop, the outline, the fill
	function textLayers(ctx, str, x, y, style) {
		const size = style.size || 40;
		ctx.font = textFont(style);
		ctx.textAlign = style.align || 'center';
		ctx.textBaseline = style.baseline || 'middle';
		ctx.lineJoin = 'round';
		const lines = String(str).split('\n');
		const lh = style.lineHeight || size * 1.1;
		const y0 = y - (lines.length - 1) * lh / 2;
		lines.forEach((line, i) => {
			const ly = y0 + i * lh;
			if (style.drop) {
				ctx.fillStyle = style.drop;
				if (style.outline) {
					ctx.strokeStyle = style.drop;
					ctx.lineWidth = (style.outlineWidth || 6) * 2;
					ctx.strokeText(line, x, ly + (style.dropY || size * 0.1));
				}
				ctx.fillText(line, x, ly + (style.dropY || size * 0.1));
			}
			if (style.outline) {
				ctx.strokeStyle = style.outline;
				ctx.lineWidth = (style.outlineWidth || 6) * 2;
				ctx.strokeText(line, x, ly);
				ctx.shadowColor = 'transparent';
			}
			ctx.fillStyle = style.fill || 'white';
			ctx.fillText(line, x, ly);
		});
	}
	const textFont = (style) => `${style.italic ? 'italic ' : ''}${style.weight || 600} ${style.size || 40}px ${quote(style.font || 'Rubik')}, sans-serif`;

	// One scratch canvas, reused (grown as needed), for flattening text.
	let flat = null;
	function flatText(ctx, str, x, y, style, alpha) {
		const size = style.size || 40;
		const lines = String(str).split('\n');
		const lh = style.lineHeight || size * 1.1;
		if (!flat) flat = document.createElement('canvas').getContext('2d');
		// its box, in the drawing's own units: the widest line, every line, the
		// outline, the drop and the shadow's reach round it
		flat.font = textFont(style);
		const wide = Math.max(...lines.map((l) => flat.measureText(l).width));
		const pad = (style.outline ? (style.outlineWidth || 6) : 0) + (style.shadow ? (style.shadow.blur || 0) * 1.5 + Math.abs(style.shadow.x || 0) + Math.abs(style.shadow.y || 0) : 0) + size * 0.2;
		const align = style.align || 'center';
		const left = align === 'left' || align === 'start' ? x : align === 'right' || align === 'end' ? x - wide : x - wide / 2;
		const top = y - (lines.length - 1) * lh / 2 - size * 0.75;
		const bottom = y + (lines.length - 1) * lh / 2 + size * 0.75 + (style.drop ? (style.dropY || size * 0.1) : 0);
		const box = [[left - pad, top - pad], [left + wide + pad, top - pad], [left + wide + pad, bottom + pad], [left - pad, bottom + pad]];
		// and on the screen (through the current transform), in whole pixels
		const m = ctx.getTransform();
		const sx = box.map(([px, py]) => m.a * px + m.c * py + m.e);
		const sy = box.map(([px, py]) => m.b * px + m.d * py + m.f);
		const bx = Math.floor(Math.min(...sx)), by = Math.floor(Math.min(...sy));
		const bw = Math.ceil(Math.max(...sx)) - bx, bh = Math.ceil(Math.max(...sy)) - by;
		if (bw <= 0 || bh <= 0 || bw * bh > 16e6) return false;   // (too big to flatten: draw it as it is)
		const cv = flat.canvas;
		if (cv.width < bw || cv.height < bh) { cv.width = Math.max(cv.width, bw); cv.height = Math.max(cv.height, bh); }
		flat.setTransform(1, 0, 0, 1, 0, 0);
		flat.clearRect(0, 0, bw, bh);
		flat.globalAlpha = 1;
		flat.globalCompositeOperation = 'source-over';
		flat.shadowColor = 'transparent';
		flat.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by);
		flat.save();
		if (style.shadow) setShadow(flat, style.shadow);
		textLayers(flat, str, x, y, style);
		flat.restore();
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = alpha;
		ctx.drawImage(cv, 0, 0, bw, bh, bx, by, bw, bh);
		ctx.restore();
		return true;
	}

	function quote(font) {
		return /[\s"]/.test(font) && font[0] !== '"' ? `"${font}"` : font;
	}

	/* ---------- images ---------- */

	function ready(src) {
		const img = typeof src === 'string' ? IGB.image(src) : src;
		return img && img.complete && img.naturalWidth ? img : null;
	}
	art.ready = ready;

	// Draw an image (a path or an Image). Skips it until it has loaded.
	art.image = function (ctx, src, x, y, w, h, style) {
		const img = ready(src);
		if (!img) return;
		ctx.save();
		apply(ctx, style);
		ctx.drawImage(img, x, y, w === undefined ? img.naturalWidth : w, h === undefined ? img.naturalHeight : h);
		ctx.restore();
	};

	// Fill a box with an image the way CSS background-size: cover does.
	// ax / ay (0..1) choose which part stays in view, like background-position.
	art.cover = function (ctx, src, x, y, w, h, ax, ay, style) {
		const img = ready(src);
		if (!img) return;
		const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
		draw(ctx, img, x, y, w, h, img.naturalWidth * s, img.naturalHeight * s, ax, ay, style);
	};

	// Fit an image inside a box, like background-size: contain.
	art.contain = function (ctx, src, x, y, w, h, ax, ay, style) {
		const img = ready(src);
		if (!img) return;
		const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
		draw(ctx, img, x, y, w, h, img.naturalWidth * s, img.naturalHeight * s, ax, ay, style);
	};

	function draw(ctx, img, x, y, w, h, iw, ih, ax, ay, style) {
		ax = ax === undefined ? 0.5 : ax;
		ay = ay === undefined ? 0.5 : ay;
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		ctx.drawImage(img, x + (w - iw) * ax, y + (h - ih) * ay, iw, ih);
		ctx.restore();
	}

	// Repeat an image across a box, tiles of tw x th. Leave th out to keep
	// the image's proportions (CSS background-size: <tw>), or both out for
	// its natural size.
	art.tile = function (ctx, src, x, y, w, h, tw, th, style) {
		const img = ready(src);
		if (!img) return;
		tw = tw || img.naturalWidth;
		th = th || tw * img.naturalHeight / img.naturalWidth;
		ctx.save();
		apply(ctx, style);
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		for (let ty = y; ty < y + h; ty += th) {
			for (let tx = x; tx < x + w; tx += tw) ctx.drawImage(img, tx, ty, tw, th);
		}
		ctx.restore();
	};

	// The frosted glass many games lay over their scene during the tutorial
	// (it was the CSS "blurlayer"): draw it after the background and before
	// the players.
	art.glass = function (ctx, x = 0, y = 0, w = IGB.WIDTH, h = IGB.H) {
		art.tile(ctx, 'assets/shared/texture-glass.png', x, y, w, h, w, undefined, { alpha: 0.7 });
	};

	/* ---------- walls ---------- */

	// Left edge of wall n (0 left, 1 front, 2 right) in world units.
	art.wallX = function (n) {
		return n * IGB.W;
	};

	// Run fn once per wall with the context shifted so (0, 0) is that wall's
	// top-left corner. fn(ctx, n).
	art.eachWall = function (ctx, fn) {
		for (let n = 0; n < IGB.WALLS; n++) {
			ctx.save();
			ctx.translate(n * IGB.W, 0);
			fn(ctx, n);
			ctx.restore();
		}
	};

	return art;
})();
