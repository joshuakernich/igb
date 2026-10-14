/*
 * The home screen's backdrop: three blueprint sheets, one on each wall, of
 * the gamebox and its kit, drawn as flat 2D schematics in white linework on
 * blueprint blue, with dimensions, leaders and notes. The linework draws
 * itself in each time the menu appears; a few things on it stay alive
 * (players wandering the plan, signals running down the wiring, the
 * tracking cameras' sweep).
 *
 *   left   A-201 PLAYER KIT: the visor in three views, its tracking marker,
 *          a player wearing one, with their reach
 *   front  A-101 GENERAL ARRANGEMENT: the box in plan, faint behind the menu,
 *          with its projectors, tracking cameras and play zone
 *   right  E-301 SYSTEMS: a projector and a tracking camera in elevation, and
 *          the signal flow from tracking to walls
 *
 * It only renders while the menu is showing.
 */

const W = 1600;                 // a wall, in world units
const H = 1000;
const WIDTH = 3 * W;
const BLUE = '#0f3a78';         // the paper
const INK = '220,239,255';      // the lines (rgb)
const DRAW_IN = 2.6;            // seconds to draw the sheets in
const FPS = 30;                 // (it's a backdrop: no need for more)
const LOG_LINES = 3;            // the latest log lines shown in the title block
const FONT = '"Courier New", monospace';

$(function () {
	const $igb = $('igb');
	const $world = $('igb-world');

	const $bg = $('<igb-home-bg>').prependTo($world);
	const canvas = $('<canvas>').css({ width: WIDTH + 'px', height: H + 'px' }).appendTo($bg)[0];
	const ctx = canvas.getContext('2d');
	for (let wall = 0; wall < 3; wall++) $('<igb-sheet>').css({ left: wall * W + 28 }).appendTo($bg);
	const $block = titleBlock().appendTo($bg);

	// The launcher's log, written into the title block while the menu is up
	// (its usual corner of the screen is hidden then).
	const $log = $block.find('igb-block-log');
	const source = document.querySelector('igb-log');
	const copyLog = () => {
		const lines = source.innerHTML.split(/<br\s*\/?>/i).map((l) => $('<div>').html(l).text()).filter(Boolean).slice(0, LOG_LINES);
		$log.empty();
		for (const line of lines) $('<div>').text(line).appendTo($log);
	};
	if (source) {
		new MutationObserver(copyLog).observe(source, { childList: true, characterData: true, subtree: true });
		copyLog();
	}

	const sheets = [playerKit(), arrangement(), systems()];

	let scale = 1;
	function resize() {
		// as sharp as the screen shows it, and no sharper
		scale = Math.max(0.3, Math.min(1, window.innerWidth / WIDTH * (window.devicePixelRatio || 1)));
		canvas.width = Math.round(WIDTH * scale);
		canvas.height = Math.round(H * scale);
	}
	$(window).on('resize', resize);
	resize();

	let frame = 0;
	let shownAt = 0;
	let lastDraw = 0;
	function render(now) {
		frame = requestAnimationFrame(render);
		if (now - lastDraw < 1000 / FPS - 2) return;
		lastDraw = now;
		const t = (now - shownAt) / 1000;
		const k = 1 - Math.pow(1 - Math.min(1, t / DRAW_IN), 3);
		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		ctx.fillStyle = BLUE;
		ctx.fillRect(0, 0, WIDTH, H);
		sheets.forEach((sheet, wall) => {
			ctx.save();
			ctx.translate(wall * W, 0);
			ctx.beginPath();
			ctx.rect(0, 0, W, H);
			ctx.clip();
			drawSheet(ctx, sheet, k);
			if (sheet.live) sheet.live(ctx, now / 1000, k);
			ctx.restore();
		});
	}

	// Only while the menu is up.
	function sync() {
		const home = $igb.hasClass('home');
		if (home && !frame) {
			shownAt = performance.now();
			frame = requestAnimationFrame(render);
		} else if (!home && frame) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	}
	new MutationObserver(sync).observe($igb[0], { attributes: true, attributeFilter: ['class'] });
	sync();
});

/* ---------- drafting ---------- */

// A sheet is a list of marks, drawn in order: strokes (polylines) and
// labels. Drawing in, each wall reveals its marks in order, a stroke
// growing along its length, a label appearing once the pen reaches it.
function Sheet() {
	const marks = [];
	let total = 0;
	const add = (m) => { m.at = total; total += m.len; marks.push(m); return m; };
	const lengthOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

	const sheet = {
		marks,
		get total() { return total; },
		// a polyline; o: { w (line width), a (alpha), dash, close }
		line(pts, o = {}) {
			if (o.close) pts = pts.concat([pts[0]]);
			return add({ kind: 'line', pts, w: o.w || 2, a: o.a === undefined ? 0.85 : o.a, dash: o.dash, len: lengthOf(pts) });
		},
		rect(x, y, w, h, o) { return sheet.line([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], Object.assign({ close: true }, o)); },
		arc(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, o) {
			const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 12));
			const pts = [];
			for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
			return sheet.line(pts, o);
		},
		circle(cx, cy, r, o) { return sheet.arc(cx, cy, r, r, 0, Math.PI * 2, o); },
		// text: o: { size, align, a, rotate }
		text(str, x, y, o = {}) {
			return add({ kind: 'text', str, x, y, size: o.size || 20, align: o.align || 'left', a: o.a === undefined ? 0.85 : o.a, rotate: o.rotate || 0, len: 40 });
		},
		// a dimension: extension lines from the two points, offset `off` out,
		// a dimension line with slashed ends, the measurement on it
		dim(x1, y1, x2, y2, off, label) {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.hypot(dx, dy) || 1;
			const nx = -dy / len * off;
			const ny = dx / len * off;
			const ex = Math.sign(off) * 10;
			sheet.line([[x1, y1], [x1 + nx + -dy / len * ex, y1 + ny + dx / len * ex]], { w: 1.2, a: 0.5 });
			sheet.line([[x2, y2], [x2 + nx + -dy / len * ex, y2 + ny + dx / len * ex]], { w: 1.2, a: 0.5 });
			const a = [x1 + nx, y1 + ny];
			const b = [x2 + nx, y2 + ny];
			sheet.line([a, b], { w: 1.4, a: 0.7 });
			for (const p of [a, b]) sheet.line([[p[0] - 7, p[1] + 7], [p[0] + 7, p[1] - 7]], { w: 2, a: 0.8 });
			const angle = Math.atan2(dy, dx);
			const up = Math.abs(angle) > Math.PI / 2 ? angle + Math.PI : angle;
			sheet.text(label, (a[0] + b[0]) / 2 + Math.sin(up) * 14, (a[1] + b[1]) / 2 - Math.cos(up) * 14, { size: 17, align: 'center', a: 0.85, rotate: up });
		},
		// a leader: a dot on the thing, a line out to a note
		leader(x1, y1, x2, y2, label, align = x2 >= x1 ? 'left' : 'right') {
			sheet.line([[x1, y1], [x2, y2], [x2 + (align === 'left' ? 30 : -30), y2]], { w: 1.4, a: 0.7 });
			sheet.circle(x1, y1, 4, { w: 3, a: 0.9 });
			sheet.text(label, x2 + (align === 'left' ? 38 : -38), y2 + 6, { size: 18, align });
		},
		// a drawing's caption: a circled number, its title underlined, its scale
		caption(n, title, scale, x, y) {
			sheet.circle(x + 22, y, 22, { w: 2.5 });
			sheet.text(String(n), x + 22, y + 7, { size: 20, align: 'center' });
			sheet.text(title, x + 58, y + 2, { size: 22 });
			sheet.line([[x + 58, y + 12], [x + 58 + title.length * 13.2, y + 12]], { w: 2 });
			sheet.text('SCALE ' + scale, x + 58, y + 34, { size: 15, a: 0.6 });
		},
		live: null,
	};
	return sheet;
}

function drawSheet(ctx, sheet, k) {
	const reach = sheet.total * k;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (const m of sheet.marks) {
		if (m.at > reach) break;
		if (m.kind === 'line') {
			const upto = Math.min(m.len, reach - m.at);
			ctx.strokeStyle = `rgba(${INK},${m.a})`;
			ctx.lineWidth = m.w;
			ctx.setLineDash(m.dash || []);
			ctx.beginPath();
			let run = 0;
			ctx.moveTo(m.pts[0][0], m.pts[0][1]);
			for (let i = 1; i < m.pts.length; i++) {
				const [x0, y0] = m.pts[i - 1];
				const [x1, y1] = m.pts[i];
				const seg = Math.hypot(x1 - x0, y1 - y0);
				if (run + seg >= upto) {
					const f = seg ? (upto - run) / seg : 1;
					ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
					break;
				}
				ctx.lineTo(x1, y1);
				run += seg;
			}
			ctx.stroke();
		} else {
			ctx.save();
			ctx.setLineDash([]);
			ctx.translate(m.x, m.y);
			if (m.rotate) ctx.rotate(m.rotate);
			ctx.font = `bold ${m.size}px ${FONT}`;
			ctx.textAlign = m.align;
			ctx.fillStyle = `rgba(${INK},${m.a})`;
			ctx.fillText(m.str, 0, 0);
			ctx.restore();
		}
	}
	ctx.setLineDash([]);
}

// a little filled dot or ring, for the live parts
function dot(ctx, x, y, r, a, ring) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	if (ring) { ctx.strokeStyle = `rgba(${INK},${a})`; ctx.lineWidth = 2; ctx.stroke(); }
	else { ctx.fillStyle = `rgba(${INK},${a})`; ctx.fill(); }
}

/* ---------- left wall: the player's kit ---------- */

function playerKit() {
	const s = Sheet();
	s.text('A-201  PLAYER KIT', 70, 92, { size: 30 });
	s.line([[70, 106], [460, 106]], { w: 3 });

	// 1. the visor, in plan (from above): the headband, the peak, the markers
	const px = 300;
	const py = 330;
	s.circle(px, py, 110, { w: 3 });
	s.circle(px, py, 96, { w: 1.5, a: 0.5 });
	s.line([[px - 105, py + 30], [px - 150, py + 150], [px, py + 215], [px + 150, py + 150], [px + 105, py + 30]], { w: 3 });
	s.line([[px - 80, py + 72], [px, py + 160], [px + 80, py + 72]], { w: 1.2, a: 0.4, dash: [8, 6] });
	for (const [mx, my] of [[-70, -85], [85, -70], [-30, 110], [105, 40]]) {
		s.line([[px + mx * 0.8, py + my * 0.8], [px + mx, py + my]], { w: 2 });
		s.circle(px + mx, py + my, 9, { w: 2.5 });
	}
	s.line([[px - 140, py], [px + 140, py]], { w: 1, a: 0.35, dash: [18, 6, 4, 6] });
	s.line([[px, py - 140], [px, py + 240]], { w: 1, a: 0.35, dash: [18, 6, 4, 6] });
	s.dim(px - 110, py - 110, px + 110, py - 110, -40, 'Ø 220');
	s.dim(px + 150, py + 150, px + 150, py - 110, -70, '260');
	s.leader(px + 85, py - 70, px + 220, py - 190, 'IR MARKER ×4');
	s.leader(px - 150, py + 150, px - 170, py + 280, 'PEAK, PC 3mm', 'left');
	s.caption(1, 'VISOR — PLAN', '1:4', 80, 640);

	// 2. the visor, side elevation
	const sx = 720;
	const sy = 330;
	s.rect(sx - 110, sy - 26, 220, 52, { w: 3 });
	s.line([[sx + 110, sy + 26], [sx + 250, sy + 46], [sx + 250, sy + 54], [sx + 110, sy + 40]], { w: 3 });
	s.line([[sx - 110, sy], [sx + 110, sy]], { w: 1.2, a: 0.4, dash: [6, 6] });
	for (const mx of [-70, 30, 85]) {
		s.line([[sx + mx, sy - 26], [sx + mx, sy - 70]], { w: 2 });
		s.circle(sx + mx, sy - 79, 9, { w: 2.5 });
	}
	s.dim(sx - 110, sy + 26, sx - 110, sy - 26, 40, '52');
	s.dim(sx - 110, sy + 70, sx + 250, sy + 70, 30, '360');
	s.leader(sx - 20, sy, sx - 40, sy + 170, 'ELASTIC BAND, ADJ.', 'left');
	s.caption(2, 'VISOR — SIDE', '1:4', 600, 640);

	// 3. the marker, enlarged, in a detail bubble
	const dx = 1180;
	const dy = 300;
	s.circle(dx, dy, 120, { w: 1.5, a: 0.5, dash: [10, 8] });
	s.circle(dx, dy, 62, { w: 3 });
	s.arc(dx, dy, 62, 20, Math.PI, Math.PI * 2, { w: 1.4, a: 0.5 });
	s.arc(dx - 18, dy - 20, 22, 14, Math.PI * 1.1, Math.PI * 1.7, { w: 2, a: 0.7 });
	s.line([[dx, dy + 62], [dx, dy + 120]], { w: 4 });
	s.rect(dx - 22, dy + 120, 44, 26, { w: 2.5 });
	s.dim(dx - 62, dy - 70, dx + 62, dy - 70, -30, 'Ø 14');
	s.leader(dx + 50, dy - 36, dx + 150, dy - 150, 'RETROREFLECTIVE');
	s.leader(dx + 20, dy + 133, dx + 150, dy + 200, 'M4 STALK');
	s.caption(3, 'MARKER — DETAIL A', '4:1', 1040, 640);

	// 4. a player, side on, wearing one, and how far they reach
	const fx = 1460;
	const ground = 940;
	s.line([[1250, ground], [1560, ground]], { w: 3 });
	for (let x = 1260; x < 1560; x += 22) s.line([[x, ground], [x - 14, ground + 14]], { w: 1.2, a: 0.4 });
	s.circle(fx, ground - 255, 22, { w: 2.5 });                                          // head
	s.line([[fx - 24, ground - 268], [fx + 26, ground - 268], [fx + 50, ground - 262]], { w: 3 });   // the visor on it
	s.line([[fx, ground - 233], [fx, ground - 120], [fx - 22, ground], [fx, ground - 120], [fx + 20, ground]], { w: 2.5 });
	s.line([[fx, ground - 205], [fx - 40, ground - 150], [fx - 46, ground - 100]], { w: 2.5 });
	s.line([[fx, ground - 205], [fx + 60, ground - 250], [fx + 95, ground - 300]], { w: 2.5 });
	s.arc(fx, ground - 205, 120, 120, -Math.PI * 0.45, Math.PI * 0.05, { w: 1.2, a: 0.45, dash: [6, 6] });
	s.dim(fx - 110, ground, fx - 110, ground - 277, 0, '1800');
	s.leader(fx + 95, ground - 300, fx - 30, ground - 360, 'TOUCH REACH', 'right');
	s.caption(4, "PLAYER", "1:20", 1110, 730);

	// general notes
	s.text('NOTES', 80, 790, { size: 20 });
	s.line([[80, 798], [160, 798]], { w: 2 });
	['1. ALL DIMENSIONS IN MILLIMETRES.', '2. VISOR COLOUR = PLAYER SLOT.', '3. CLEAN MARKERS BETWEEN SESSIONS.', '4. DO NOT SCALE FROM DRAWING.'].forEach((note, i) => s.text(note, 80, 830 + i * 30, { size: 17, a: 0.7 }));

	return s;
}

/* ---------- front wall: the box in plan ---------- */

function arrangement() {
	const s = Sheet();
	// the plan, big and faint, centred behind the menu
	const cx = W / 2;
	const cy = 520;
	const half = 330;                 // 3.5 m
	const A = 0.42;                   // (faint)
	const x0 = cx - half;
	const x1 = cx + half;
	const y0 = cy - half;
	const y1 = cy + half;
	// walls, double lines: left, front, right; the back open but for its door
	for (const off of [0, 22]) {
		s.line([[x0 - off, y1 + off * 0.0], [x0 - off, y0 - off], [x1 + off, y0 - off], [x1 + off, y1]], { w: off ? 2 : 3, a: A });
		s.line([[x0 - off, y1], [cx - 70, y1]], { w: off ? 2 : 3, a: A });
		s.line([[cx + 70, y1], [x1 + off, y1]], { w: off ? 2 : 3, a: A });
	}
	s.arc(cx - 70, y1, 140, 140, -Math.PI / 2, 0, { w: 1.5, a: A * 0.8, dash: [8, 6] });   // the door's swing
	// the projection surfaces, inside each wall
	s.line([[x0 + 10, y1 - 40], [x0 + 10, y0 + 10], [x1 - 10, y0 + 10], [x1 - 10, y1 - 40]], { w: 6, a: A * 0.7 });
	// the floor grid
	for (let i = 1; i < 7; i++) {
		s.line([[x0 + i * half / 3.5, y0 + 12], [x0 + i * half / 3.5, y1]], { w: 1, a: A * 0.35 });
		s.line([[x0 + 12, y0 + i * half / 3.5], [x1 - 12, y0 + i * half / 3.5]], { w: 1, a: A * 0.35 });
	}
	// projectors on the ceiling (dashed: above), each throwing onto its wall
	const throwTo = (px, py, ax, ay, bx, by) => {
		s.rect(px - 30, py - 18, 60, 36, { w: 2, a: A, dash: [8, 5] });
		s.line([[px, py], [ax, ay]], { w: 1, a: A * 0.6, dash: [4, 8] });
		s.line([[px, py], [bx, by]], { w: 1, a: A * 0.6, dash: [4, 8] });
	};
	throwTo(cx, cy + 90, x0 + 30, y0 + 10, x1 - 30, y0 + 10);
	throwTo(cx + 120, cy, x0 + 10, y0 + 30, x0 + 10, y1 - 50);
	throwTo(cx - 120, cy, x1 - 10, y0 + 30, x1 - 10, y1 - 50);
	// the tracking cameras, in the corners
	for (const [tx, ty] of [[x0 + 30, y0 + 30], [x1 - 30, y0 + 30], [x0 + 30, y1 - 30], [x1 - 30, y1 - 30]]) {
		s.rect(tx - 14, ty - 14, 28, 28, { w: 2.5, a: A });
		s.circle(tx, ty, 6, { w: 2, a: A });
	}
	// the play zone
	s.circle(cx, cy, half * 0.42, { w: 2, a: A, dash: [16, 8] });
	s.text('PLAY ZONE', cx, cy + half * 0.42 + 30, { size: 18, align: 'center', a: A });
	s.dim(x0 - 22, y0 - 22, x1 + 22, y0 - 22, -40, '3500');
	s.dim(x1 + 22, y0 - 22, x1 + 22, y1, -40, '3500');
	s.text('LEFT', x0 - 60, cy, { size: 18, align: 'center', a: A, rotate: -Math.PI / 2 });
	s.text('FRONT', cx, y0 - 92, { size: 18, align: 'center', a: A });
	s.text('RIGHT', x1 + 100, cy, { size: 18, align: 'center', a: A, rotate: Math.PI / 2 });
	s.text('ENTRY', cx, y1 + 40, { size: 18, align: 'center', a: A });

	// the sheet's own furniture, round the edges
	s.text('A-101  GENERAL ARRANGEMENT', 70, 92, { size: 30 });
	s.line([[70, 106], [560, 106]], { w: 3 });
	// a north point
	const nx = 1480;
	const ny = 140;
	s.circle(nx, ny, 40, { w: 2 });
	s.line([[nx, ny - 52], [nx + 16, ny + 20], [nx, ny + 8], [nx - 16, ny + 20]], { w: 2.5, close: true });
	s.text('N', nx, ny - 62, { size: 20, align: 'center' });
	// section A-A, small, bottom left: the box cut through, its height
	const bx = 90;
	const by = 930;
	s.line([[bx, by], [bx + 300, by]], { w: 3 });
	s.line([[bx + 20, by], [bx + 20, by - 160], [bx + 280, by - 160], [bx + 280, by]], { w: 2.5 });
	s.rect(bx + 135, by - 156, 30, 16, { w: 1.5, a: 0.7 });
	s.line([[bx + 150, by - 140], [bx + 24, by - 40]], { w: 1, a: 0.5, dash: [4, 6] });
	s.dim(bx + 280, by, bx + 280, by - 160, -36, '2100');
	s.caption('A', 'SECTION A-A', '1:100', bx, by - 220);
	// the revisions, bottom right
	s.rect(1180, 860, 370, 90, { w: 2, a: 0.6 });
	s.line([[1180, 890], [1550, 890]], { w: 1.5, a: 0.6 });
	s.text('REV  DATE        NOTE', 1194, 882, { size: 16, a: 0.7 });
	s.text('C    2026-10     PROTOTYPES', 1194, 916, { size: 16, a: 0.7 });
	s.text('B    2026-07     SIX VISORS', 1194, 940, { size: 16, a: 0.5 });

	// live: players wandering the zone, the cameras' sweep
	const players = [0, 1, 2, 3].map((i) => ({ a: i * 1.7, b: i * 2.3 + 1 }));
	s.live = function (ctx, t, k) {
		if (k < 1) return;
		for (const [tx, ty, base] of [[x0 + 30, y0 + 30, 0.25], [x1 - 30, y0 + 30, 0.75], [x0 + 30, y1 - 30, -0.25], [x1 - 30, y1 - 30, -0.75]]) {
			const a = Math.PI * base + Math.sin(t * 0.6 + tx) * 0.35 + Math.PI / 2 * (ty > cy ? -1 : 1) * 0;
			ctx.save();
			ctx.strokeStyle = `rgba(${INK},0.12)`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(tx, ty);
			ctx.arc(tx, ty, half * 1.1, a - 0.35, a + 0.35);
			ctx.closePath();
			ctx.stroke();
			ctx.restore();
		}
		players.forEach((p, i) => {
			const x = cx + Math.sin(t * 0.21 + p.a) * half * 0.55 + Math.sin(t * 0.53 + p.b) * 40;
			const y = cy + Math.cos(t * 0.17 + p.b) * half * 0.5 + Math.cos(t * 0.47 + p.a) * 30;
			dot(ctx, x, y, 11, 0.45, true);
			dot(ctx, x, y, 3, 0.45);
			ctx.font = `bold 14px ${FONT}`;
			ctx.fillStyle = `rgba(${INK},0.4)`;
			ctx.fillText('P' + (i + 1), x + 16, y - 10);
		});
	};
	return s;
}

/* ---------- right wall: the systems ---------- */

function systems() {
	const s = Sheet();
	s.text('E-301  SYSTEMS', 70, 92, { size: 30 });
	s.line([[70, 106], [370, 106]], { w: 3 });

	// 1. a short-throw projector, side elevation, throwing up onto the wall
	const px = 140;
	const py = 260;
	s.rect(px, py - 40, 190, 80, { w: 3 });
	s.rect(px + 190, py - 22, 26, 44, { w: 2.5 });
	for (let i = 0; i < 6; i++) s.line([[px + 20 + i * 14, py - 28], [px + 20 + i * 14, py + 28]], { w: 1.2, a: 0.5 });
	s.line([[px + 60, py - 40], [px + 60, py - 90], [px + 130, py - 90], [px + 130, py - 40]], { w: 2 });   // ceiling mount
	s.line([[px + 20, py - 90], [px + 170, py - 90]], { w: 3 });
	s.line([[px + 216, py], [560, py - 140]], { w: 1.2, a: 0.6, dash: [10, 6] });
	s.line([[px + 216, py], [560, py + 200]], { w: 1.2, a: 0.6, dash: [10, 6] });
	s.line([[560, py - 170], [560, py + 230]], { w: 4 });
	s.dim(px + 216, py + 60, 560, py + 60, 120, 'THROW 760');
	s.leader(px + 95, py, px + 40, py + 190, 'LASER PJ, 0.38:1', 'left');
	s.caption(1, 'PROJECTOR', '1:20', 80, 560);

	// 2. a tracking camera, front elevation: its ring of IR emitters
	const cx = 820;
	const cy = 250;
	s.rect(cx - 110, cy - 80, 220, 160, { w: 3 });
	s.circle(cx, cy, 52, { w: 3 });
	s.circle(cx, cy, 34, { w: 2 });
	for (let i = 0; i < 16; i++) {
		const a = i / 16 * Math.PI * 2;
		s.circle(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66, 5, { w: 2 });
	}
	s.line([[cx, cy + 80], [cx, cy + 140]], { w: 4 });
	s.line([[cx - 50, cy + 140], [cx + 50, cy + 140]], { w: 4 });
	s.dim(cx - 110, cy - 80, cx + 110, cy - 80, -36, '220');
	s.leader(cx + 66, cy - 40, cx + 180, cy - 120, '850nm IR RING');
	s.leader(cx + 20, cy + 140, cx + 170, cy + 200, 'CORNER MOUNT ×4');
	s.caption(2, 'TRACKING CAMERA', '1:5', 680, 560);

	// 3. a speaker, small, top right
	const spx = 1350;
	const spy = 240;
	s.rect(spx - 70, spy - 110, 140, 220, { w: 3 });
	s.circle(spx, spy - 45, 26, { w: 2.5 });
	s.circle(spx, spy + 40, 50, { w: 2.5 });
	s.circle(spx, spy + 40, 18, { w: 1.5 });
	s.dim(spx + 70, spy - 110, spx + 70, spy + 110, -36, '380');
	s.caption(3, 'SPEAKER, 5.1', '1:10', 1210, 560);

	// 4. the signal flow, along the bottom: tracking to game to walls
	s.text('4  SIGNAL FLOW', 80, 650, { size: 22 });
	s.line([[80, 660], [270, 660]], { w: 2 });
	const box = (x, y, w, h, label, sub) => {
		s.rect(x, y, w, h, { w: 2.5 });
		s.text(label, x + w / 2, y + h / 2 + (sub ? -2 : 7), { size: 19, align: 'center' });
		if (sub) s.text(sub, x + w / 2, y + h / 2 + 22, { size: 14, align: 'center', a: 0.6 });
	};
	const wire = (pts, label) => {
		s.line(pts, { w: 2 });
		const [x, y] = pts[pts.length - 1];
		const [px2, py2] = pts[pts.length - 2];
		const a = Math.atan2(y - py2, x - px2);
		s.line([[x - Math.cos(a - 0.4) * 14, y - Math.sin(a - 0.4) * 14], [x, y], [x - Math.cos(a + 0.4) * 14, y - Math.sin(a + 0.4) * 14]], { w: 2 });
		if (label) s.text(label, (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 - 8, { size: 14, align: 'center', a: 0.65 });
	};
	box(80, 700, 190, 70, 'TRACKING', 'CAMERAS ×4');
	box(380, 700, 200, 70, 'GAME PC', 'UNITY / WEB');
	box(80, 820, 190, 60, 'TOUCH', 'TUIO :4444');
	box(380, 820, 200, 60, 'VENUE', 'CONTROL :8152');
	box(700, 690, 170, 50, 'PJ LEFT');
	box(700, 750, 170, 50, 'PJ FRONT');
	box(700, 810, 170, 50, 'PJ RIGHT');
	box(700, 880, 170, 50, 'AUDIO 5.1');
	wire([[270, 735], [380, 735]], 'XYZ');
	wire([[270, 850], [330, 850], [330, 755], [380, 755]]);
	wire([[480, 820], [480, 770]]);
	for (const y of [715, 775, 835]) wire([[580, 735], [640, 735], [640, y], [700, y]]);
	wire([[580, 760], [620, 760], [620, 905], [700, 905]]);
	s.text('SPOUT ×3', 640, 680, { size: 14, align: 'center', a: 0.65 });

	// the live part: signals running down the wires
	const runs = [
		[[270, 735], [380, 735]],
		[[580, 735], [640, 735], [640, 715], [700, 715]],
		[[580, 735], [640, 735], [640, 775], [700, 775]],
		[[580, 735], [640, 735], [640, 835], [700, 835]],
		[[580, 760], [620, 760], [620, 905], [700, 905]],
	];
	s.live = function (ctx, t, k) {
		if (k < 1) return;
		runs.forEach((pts, i) => {
			const lens = pts.slice(1).map((p, j) => Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]));
			const total = lens.reduce((a, b) => a + b, 0);
			for (let n = 0; n < 2; n++) {
				let d = ((t * 120 + i * 37 + n * total / 2) % total);
				for (let j = 0; j < lens.length; j++) {
					if (d <= lens[j]) {
						const f = d / lens[j];
						dot(ctx, pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f, 4, 0.9);
						break;
					}
					d -= lens[j];
				}
			}
		});
		// the projector's beam, flickering faintly
		ctx.fillStyle = `rgba(${INK},${0.05 + 0.02 * Math.sin(t * 9)})`;
		ctx.beginPath();
		ctx.moveTo(px + 216, py);
		ctx.lineTo(560, py - 140);
		ctx.lineTo(560, py + 200);
		ctx.closePath();
		ctx.fill();
	};
	return s;
}

// The drawing's title block, in the right wall's bottom corner.
function titleBlock() {
	return $('<igb-title-block>').html(
		'<b>IMMERSIVE GAMEBOX</b>' +
		'<span>PROTOTYPES &middot; WALL SET</span>' +
		'<span><i>SCALE</i> AS SHOWN</span><span><i>SHEETS</i> A-101/201, E-301</span>' +
		'<igb-block-log></igb-block-log>'
	);
}
