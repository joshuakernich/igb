/*
 * Iron Stride: the cockpit, drawn in 2D over the three windows. The frame
 * (painted once: gunmetal beams and pillars, rivets, red trim round each
 * window, the console along the bottom, the glass's own shading) and the
 * instruments drawn every frame: the two leg throttles on the front
 * pillars, the radar, the hull dial, the readouts, and Doctor Klank on the
 * screen when he calls.
 *
 *   const frame = paintFrame(W, H);      // a canvas 3W x H
 *   ctx.drawImage(frame, 0, 0);
 *   legGauge(ctx, x, top, bottom, value, dots, label, colour)
 *   radar(ctx, cx, cy, r, blips, sweep)
 *   hullDial(ctx, cx, cy, r, hull, alarm)
 *   readout(ctx, x, y, label, value, align)
 *   klank(ctx, cx, cy, size, t, talking)
 */

const TAU = Math.PI * 2;
export const MONO = 'Share Tech Mono';

// Each window's opening on its wall: [left, right], and the beams above and below.
export const FRAME = { top: 56, bottom: 128, sides: [[44, 36], [64, 64], [36, 44]], radius: 34 };

function windowRect(n, W, H) {
	const [l, r] = FRAME.sides[n];
	return { x: l, y: FRAME.top, w: W - l - r, h: H - FRAME.top - FRAME.bottom };
}

export function paintFrame(W, H) {
	const c = document.createElement('canvas');
	c.width = W * 3;
	c.height = H;
	const g = c.getContext('2d');
	for (let n = 0; n < 3; n++) {
		g.save();
		g.translate(n * W, 0);
		const win = windowRect(n, W, H);

		// the glass: darker toward its edges, a faint reflection across it
		g.save();
		g.beginPath();
		g.roundRect(win.x, win.y, win.w, win.h, FRAME.radius);
		g.clip();
		const edge = 110;
		for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
			[win.x, 0, win.x + edge, 0, win.x, win.y, edge, win.h],
			[win.x + win.w, 0, win.x + win.w - edge, 0, win.x + win.w - edge, win.y, edge, win.h],
			[0, win.y, 0, win.y + edge, win.x, win.y, win.w, edge],
			[0, win.y + win.h, 0, win.y + win.h - edge, win.x, win.y + win.h - edge, win.w, edge],
		]) {
			const lg = g.createLinearGradient(x0, y0, x1, y1);
			lg.addColorStop(0, 'rgba(10,6,4,0.34)');
			lg.addColorStop(1, 'rgba(10,6,4,0)');
			g.fillStyle = lg;
			g.fillRect(rx, ry, rw, rh);
		}
		g.fillStyle = 'rgba(255,255,255,0.035)';
		g.beginPath();
		g.moveTo(win.x + win.w * 0.18, win.y);
		g.lineTo(win.x + win.w * 0.34, win.y);
		g.lineTo(win.x + win.w * 0.12, win.y + win.h);
		g.lineTo(win.x - win.w * 0.04, win.y + win.h);
		g.fill();
		g.fillStyle = 'rgba(255,255,255,0.025)';
		g.beginPath();
		g.moveTo(win.x + win.w * 0.38, win.y);
		g.lineTo(win.x + win.w * 0.43, win.y);
		g.lineTo(win.x + win.w * 0.21, win.y + win.h);
		g.lineTo(win.x + win.w * 0.16, win.y + win.h);
		g.fill();
		g.restore();

		// the frame: everything but the window, in gunmetal
		g.beginPath();
		g.rect(0, 0, W, H);
		g.roundRect(win.x, win.y, win.w, win.h, FRAME.radius);
		const mg = g.createLinearGradient(0, 0, 0, H);
		mg.addColorStop(0, '#3a3e47');
		mg.addColorStop(0.1, '#24272e');
		mg.addColorStop(0.85, '#2a2d34');
		mg.addColorStop(1, '#121317');
		g.fillStyle = mg;
		g.fill('evenodd');

		// the console along the bottom: darker, with a lip
		const cy = win.y + win.h + 16;
		const cg = g.createLinearGradient(0, cy, 0, H);
		cg.addColorStop(0, '#1b1d22');
		cg.addColorStop(1, '#0c0d10');
		g.fillStyle = cg;
		g.fillRect(0, cy, W, H - cy);
		g.fillStyle = 'rgba(255,255,255,0.12)';
		g.fillRect(0, cy, W, 2);

		// panel seams and rivets
		g.strokeStyle = 'rgba(0,0,0,0.5)';
		g.lineWidth = 2;
		for (let x = 200; x < W; x += 400) {
			g.beginPath();
			g.moveTo(x, 4);
			g.lineTo(x, FRAME.top - 10);
			g.stroke();
		}
		const rivet = (x, y) => {
			g.fillStyle = '#16171b';
			g.beginPath();
			g.arc(x, y + 1.5, 6, 0, TAU);
			g.fill();
			const rg = g.createRadialGradient(x - 2, y - 2, 0, x, y, 6);
			rg.addColorStop(0, '#9aa0aa');
			rg.addColorStop(1, '#4a4e57');
			g.fillStyle = rg;
			g.beginPath();
			g.arc(x, y, 5, 0, TAU);
			g.fill();
		};
		for (let x = 60; x < W - 40; x += 90) if (Math.abs(x - W / 2) > 230) rivet(x, 22);
		for (let y = 110; y < H - FRAME.bottom - 40; y += 110) {
			rivet(FRAME.sides[n][0] / 2, y);
			rivet(W - FRAME.sides[n][1] / 2, y);
		}

		// red trim round the window
		g.beginPath();
		g.roundRect(win.x - 4, win.y - 4, win.w + 8, win.h + 8, FRAME.radius + 4);
		g.lineWidth = 9;
		g.strokeStyle = '#b5221a';
		g.stroke();
		g.beginPath();
		g.roundRect(win.x - 9, win.y - 9, win.w + 18, win.h + 18, FRAME.radius + 9);
		g.lineWidth = 2;
		g.strokeStyle = 'rgba(255,140,120,0.35)';
		g.stroke();
		g.beginPath();
		g.roundRect(win.x, win.y, win.w, win.h, FRAME.radius);
		g.lineWidth = 2;
		g.strokeStyle = 'rgba(0,0,0,0.6)';
		g.stroke();

		// hazard stripes at the console's outer ends
		const stripes = (x, w) => {
			g.save();
			g.beginPath();
			g.rect(x, H - 38, w, 26);
			g.clip();
			g.fillStyle = '#ffc21a';
			g.fillRect(x, H - 38, w, 26);
			g.fillStyle = '#16171b';
			for (let i = -2; i < w / 20 + 2; i++) {
				g.beginPath();
				g.moveTo(x + i * 40, H - 12);
				g.lineTo(x + i * 40 + 20, H - 12);
				g.lineTo(x + i * 40 + 46, H - 38);
				g.lineTo(x + i * 40 + 26, H - 38);
				g.fill();
			}
			g.restore();
		};
		if (n === 0) stripes(40, 150);
		if (n === 2) stripes(W - 190, 150);

		// little lamps and grilles on the console
		const lamps = n === 1 ? [] : n === 0 ? [[300, '#3cdc7a'], [330, '#3cdc7a'], [360, '#ffc21a']] : [[W - 360, '#ffc21a'], [W - 330, '#3cdc7a'], [W - 300, '#3cdc7a']];
		for (const [x, col] of lamps) {
			g.fillStyle = '#0a0a0c';
			g.beginPath();
			g.arc(x, H - 92, 9, 0, TAU);
			g.fill();
			g.fillStyle = col;
			g.beginPath();
			g.arc(x, H - 92, 6, 0, TAU);
			g.fill();
		}
		g.restore();
	}
	return c;
}

// A leg's throttle: a slot up a front pillar, lit up from the middle (ahead)
// or down from it (astern); a dot for each player driving it.
export function legGauge(ctx, x, top, bottom, value, dots, label, colour) {
	const mid = (top + bottom) / 2;
	const w = 30;
	ctx.save();
	ctx.fillStyle = '#08090b';
	ctx.beginPath();
	ctx.roundRect(x - w / 2 - 4, top - 4, w + 8, bottom - top + 8, 12);
	ctx.fill();
	// ticks
	ctx.fillStyle = 'rgba(255,255,255,0.18)';
	for (let i = 0; i <= 10; i++) ctx.fillRect(x - w / 2, top + (bottom - top) * i / 10 - 1, i === 5 ? w : 8, 2);
	// the fill
	const v = Math.max(-1, Math.min(1, value));
	const h = Math.abs(v) * (bottom - top) / 2;
	ctx.fillStyle = v >= 0 ? '#3cdc7a' : '#ff8a1a';
	ctx.shadowColor = ctx.fillStyle;
	ctx.shadowBlur = 14;
	if (v >= 0) ctx.fillRect(x - w / 2 + 4, mid - h, w - 8, h);
	else ctx.fillRect(x - w / 2 + 4, mid, w - 8, h);
	ctx.shadowBlur = 0;
	// the players on it
	dots.forEach(function (d, i) {
		const y = mid - Math.max(-1, Math.min(1, d.t)) * (bottom - top) / 2;
		const dx = (i - (dots.length - 1) / 2) * 8;
		ctx.fillStyle = '#0a0a0c';
		ctx.beginPath();
		ctx.arc(x + dx, y, 13, 0, TAU);
		ctx.fill();
		ctx.fillStyle = d.colour;
		ctx.beginPath();
		ctx.arc(x + dx, y, 10, 0, TAU);
		ctx.fill();
	});
	// arrows and the label
	ctx.fillStyle = 'rgba(255,255,255,0.5)';
	tri(ctx, x, top - 22, 11, -1);
	tri(ctx, x, bottom + 22, 11, 1);
	ctx.font = `48px "${MONO}", monospace`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = colour || '#ffffff';
	ctx.fillText(label, x, bottom + 72);
	ctx.restore();
}

function tri(ctx, x, y, s, dir) {
	ctx.beginPath();
	ctx.moveTo(x - s, y - dir * s * 0.5);
	ctx.lineTo(x + s, y - dir * s * 0.5);
	ctx.lineTo(x, y + dir * s * 0.7);
	ctx.fill();
}

function bezel(ctx, cx, cy, r) {
	ctx.fillStyle = '#0c0d10';
	ctx.beginPath();
	ctx.arc(cx, cy + 6, r + 16, 0, TAU);
	ctx.fill();
	const bg = ctx.createLinearGradient(cx, cy - r - 14, cx, cy + r + 14);
	bg.addColorStop(0, '#6a6f7a');
	bg.addColorStop(1, '#25272d');
	ctx.fillStyle = bg;
	ctx.beginPath();
	ctx.arc(cx, cy, r + 13, 0, TAU);
	ctx.fill();
	ctx.fillStyle = '#b5221a';
	ctx.beginPath();
	ctx.arc(cx, cy, r + 5, 0, TAU);
	ctx.fill();
}

// The radar: forward is up; blips { x, y } (-1..1 of its range), colour, size.
export function radar(ctx, cx, cy, r, blips, sweep) {
	ctx.save();
	bezel(ctx, cx, cy, r);
	const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
	g.addColorStop(0, '#0f3a24');
	g.addColorStop(1, '#06170f');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, TAU);
	ctx.fill();
	ctx.clip();
	ctx.strokeStyle = 'rgba(80,255,150,0.25)';
	ctx.lineWidth = 2;
	for (const k of [0.33, 0.66]) {
		ctx.beginPath();
		ctx.arc(cx, cy, r * k, 0, TAU);
		ctx.stroke();
	}
	ctx.beginPath();
	ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
	ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
	ctx.stroke();
	// the field of view: the three windows, all but the back quarter
	ctx.fillStyle = 'rgba(80,255,150,0.06)';
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.arc(cx, cy, r, Math.PI / 4, Math.PI * 3 / 4, true);
	ctx.fill();
	// the sweep
	const a0 = sweep - Math.PI / 2;
	const sg = ctx.createConicGradient ? ctx.createConicGradient(a0 - 0.9, cx, cy) : null;
	if (sg) {
		sg.addColorStop(0, 'rgba(80,255,150,0)');
		sg.addColorStop(0.143, 'rgba(80,255,150,0.35)');
		sg.addColorStop(0.1431, 'rgba(80,255,150,0)');
		ctx.fillStyle = sg;
		ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
	}
	for (const b of blips) {
		ctx.fillStyle = b.colour;
		ctx.shadowColor = b.colour;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(cx + b.x * r, cy + b.y * r, b.size || 6, 0, TAU);
		ctx.fill();
	}
	ctx.shadowBlur = 0;
	// you
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.moveTo(cx, cy - 11);
	ctx.lineTo(cx + 8, cy + 8);
	ctx.lineTo(cx - 8, cy + 8);
	ctx.fill();
	ctx.restore();
}

// The hull: a dial from empty (left) to full (right), red when it's low.
export function hullDial(ctx, cx, cy, r, hull, alarm) {
	ctx.save();
	bezel(ctx, cx, cy, r);
	ctx.fillStyle = alarm ? '#2a0606' : '#101216';
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, TAU);
	ctx.fill();
	const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
	ctx.lineWidth = 16;
	ctx.strokeStyle = 'rgba(255,255,255,0.1)';
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.74, a0, a1);
	ctx.stroke();
	const col = hull > 0.5 ? '#3cdc7a' : hull > 0.25 ? '#ffc21a' : '#ff3b30';
	ctx.strokeStyle = col;
	ctx.shadowColor = col;
	ctx.shadowBlur = 12;
	ctx.beginPath();
	ctx.arc(cx, cy, r * 0.74, a0, a0 + (a1 - a0) * Math.max(0, Math.min(1, hull)));
	ctx.stroke();
	ctx.shadowBlur = 0;
	// the needle
	const a = a0 + (a1 - a0) * Math.max(0, Math.min(1, hull));
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 5;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(cx, cy);
	ctx.lineTo(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62);
	ctx.stroke();
	ctx.fillStyle = '#b5221a';
	ctx.beginPath();
	ctx.arc(cx, cy, 9, 0, TAU);
	ctx.fill();
	ctx.font = `30px "${MONO}", monospace`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'rgba(255,255,255,0.75)';
	ctx.fillText('HULL', cx, cy + r * 0.42);
	ctx.font = `38px "${MONO}", monospace`;
	ctx.fillStyle = col;
	ctx.fillText(Math.round(hull * 100) + '%', cx, cy - r * 0.32);
	ctx.restore();
}

// A digital readout in a little window on the console.
export function readout(ctx, x, y, label, value, align = 'left', colour = '#ff5a3c') {
	ctx.save();
	ctx.font = `64px "${MONO}", monospace`;
	const vw = Math.max(150, ctx.measureText(String(value)).width + 40);
	const x0 = align === 'left' ? x : x - vw;
	ctx.fillStyle = '#07080a';
	ctx.beginPath();
	ctx.roundRect(x0, y - 44, vw, 76, 10);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,255,255,0.12)';
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = colour;
	ctx.shadowColor = colour;
	ctx.shadowBlur = 12;
	ctx.fillText(String(value), x0 + vw / 2, y - 4);
	ctx.shadowBlur = 0;
	ctx.font = `26px "${MONO}", monospace`;
	ctx.fillStyle = 'rgba(255,255,255,0.6)';
	ctx.fillText(label, x0 + vw / 2, y - 62);
	ctx.restore();
}

// Doctor Klank on the cockpit screen: a gangly genius with his brain under
// a glass dome, one enormous monocle, a pointed little beard and a grin
// with a gap in it. (Original: no one else's villain.) Centred on (cx, cy),
// about `size` tall.
export function klank(ctx, cx, cy, size, t, talking) {
	const s = size / 400;
	ctx.save();
	// the screen
	ctx.translate(cx, cy);
	ctx.fillStyle = '#05140c';
	ctx.strokeStyle = '#b5221a';
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.roundRect(-260 * s, -220 * s, 520 * s, 440 * s, 26 * s);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(-250 * s, -210 * s, 500 * s, 420 * s, 20 * s);
	ctx.clip();
	const bob = Math.sin(t * 7) * 4 * s;
	ctx.translate(0, bob + 30 * s);
	ctx.scale(s, s);
	// lab coat and collar
	ctx.fillStyle = '#e8eef0';
	ctx.beginPath();
	ctx.moveTo(-200, 260);
	ctx.quadraticCurveTo(-180, 120, -60, 100);
	ctx.lineTo(60, 100);
	ctx.quadraticCurveTo(180, 120, 200, 260);
	ctx.fill();
	ctx.fillStyle = '#7b3fd1';
	ctx.beginPath();
	ctx.moveTo(-40, 100);
	ctx.lineTo(0, 180);
	ctx.lineTo(40, 100);
	ctx.fill();
	// his gear badge
	ctx.fillStyle = '#ffd23f';
	ctx.beginPath();
	for (let i = 0; i < 16; i++) {
		const a = i / 16 * TAU;
		const rr = i % 2 ? 18 : 24;
		ctx.lineTo(-120 + Math.cos(a) * rr, 170 + Math.sin(a) * rr);
	}
	ctx.fill();
	// the neck and the long head
	ctx.fillStyle = '#a8d8a0';
	ctx.fillRect(-28, 60, 56, 50);
	ctx.beginPath();
	ctx.ellipse(0, -10, 92, 118, 0, 0, TAU);
	ctx.fill();
	// ears
	ctx.beginPath();
	ctx.ellipse(-92, -5, 18, 30, 0, 0, TAU);
	ctx.ellipse(92, -5, 18, 30, 0, 0, TAU);
	ctx.fill();
	// the brain under glass
	ctx.fillStyle = '#ff9ec4';
	ctx.beginPath();
	ctx.ellipse(0, -110, 82, 62, 0, Math.PI, TAU);
	ctx.fill();
	ctx.strokeStyle = '#d0608a';
	ctx.lineWidth = 5;
	for (let i = 0; i < 5; i++) {
		ctx.beginPath();
		ctx.moveTo(-60 + i * 28, -118);
		ctx.bezierCurveTo(-50 + i * 28, -150, -36 + i * 28, -120, -30 + i * 28, -150);
		ctx.stroke();
	}
	ctx.fillStyle = 'rgba(190,240,255,0.35)';
	ctx.strokeStyle = 'rgba(220,250,255,0.9)';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.ellipse(0, -108, 100, 92, 0, Math.PI, TAU);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,0.6)';
	ctx.beginPath();
	ctx.ellipse(-48, -160, 14, 26, -0.5, 0, TAU);
	ctx.fill();
	ctx.fillStyle = '#6a6f7a';
	ctx.fillRect(-104, -112, 208, 14);
	// eyes: one squint, one huge behind the monocle
	ctx.strokeStyle = '#1a2a1a';
	ctx.lineWidth = 7;
	ctx.beginPath();
	ctx.moveTo(-58, -14);
	ctx.quadraticCurveTo(-38, -26, -18, -14);
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	ctx.beginPath();
	ctx.arc(40, -16, 30, 0, TAU);
	ctx.fill();
	ctx.fillStyle = '#1a2a1a';
	ctx.beginPath();
	ctx.arc(44 + Math.sin(t * 2) * 6, -14, 13, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = '#ffd23f';
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.arc(40, -16, 40, 0, TAU);
	ctx.stroke();
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(78, 0);
	ctx.quadraticCurveTo(100, 60, 70, 110);
	ctx.stroke();
	// the grin, wider when he talks
	const open = talking ? 14 + Math.abs(Math.sin(t * 16)) * 18 : 10;
	ctx.fillStyle = '#2a0a12';
	ctx.beginPath();
	ctx.moveTo(-50, 40);
	ctx.quadraticCurveTo(0, 50 + open * 2, 55, 34);
	ctx.quadraticCurveTo(0, 46, -50, 40);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	for (let i = 0; i < 6; i++) if (i !== 3) ctx.fillRect(-38 + i * 15, 40 + (i === 0 ? 2 : 0), 11, 9);
	// the pointy beard
	ctx.fillStyle = '#f2f2f2';
	ctx.beginPath();
	ctx.moveTo(-26, 88);
	ctx.quadraticCurveTo(0, 104, 26, 88);
	ctx.lineTo(4, 150);
	ctx.closePath();
	ctx.fill();
	// eyebrows
	ctx.strokeStyle = '#f2f2f2';
	ctx.lineWidth = 9;
	ctx.beginPath();
	ctx.moveTo(-64, -38); ctx.lineTo(-16, -30);
	ctx.moveTo(10, -66); ctx.lineTo(76, -54);
	ctx.stroke();
	ctx.restore();
	// scanlines over the screen
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(cx - 250 * s, cy - 210 * s, 500 * s, 420 * s, 20 * s);
	ctx.clip();
	ctx.fillStyle = 'rgba(0,0,0,0.22)';
	for (let y = cy - 210 * s + ((t * 60) % 6); y < cy + 210 * s; y += 6) ctx.fillRect(cx - 250 * s, y, 500 * s, 2);
	ctx.fillStyle = 'rgba(80,255,150,0.06)';
	ctx.fillRect(cx - 250 * s, cy - 210 * s, 500 * s, 420 * s);
	ctx.restore();
}
