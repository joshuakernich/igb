/*
 * Iron Stride: the cockpit, drawn in 2D over the three windows. The frame
 * (painted once: gunmetal beams and pillars, rivets, red trim round each
 * window, the console along the bottom, the glass's own shading) and the
 * instruments drawn every frame: the two drivers' chevron throttles and
 * arrows, the little wireframe Strider, the radar, the hull dial, the readouts, and Doctor Klank on the
 * screen when he calls.
 *
 *   const frame = paintFrame(W, H);      // a canvas 3W x H
 *   ctx.drawImage(frame, 0, 0);
 *   chevronBar(ctx, x, mid, value, colour, dir, t)
 *   wireStrider(ctx, cx, ground, s, legs, t)
 *   radar(ctx, cx, cy, r, blips, sweep)
 *   hullDial(ctx, cx, cy, r, hull, alarm)
 *   readout(ctx, x, y, label, value, align)
 *   klank(ctx, cx, cy, size, t, talking)
 */

import { legPose } from './models.js';

const TAU = Math.PI * 2;
export const MONO = 'Share Tech Mono';

// Each window's opening on its wall: [left, right], and the beams above and below.
export const FRAME = { top: 56, bottom: 128, sides: [[44, 36], [36, 36], [36, 44]], radius: 34 };

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

// A leg's throttle, for its driver: a column of chevrons, seven pointing up
// above the zero line (ahead) and four pointing down below it (astern),
// lighting up in the driver's colour as they lean into it; beside it a big
// arrow in their colour pointing out to their side (dir -1 left, 1 right).
const CHEV = { ahead: 7, astern: 4, gap: 46, w: 76, h: 24, thick: 13, first: 30 };
export function chevronBar(ctx, x, mid, value, colour, dir, t) {
	const C = CHEV;
	ctx.save();
	const chevron = (cy, up, lit) => {
		// a band bent into a ^ (or a v), C.thick deep
		const s = up ? 1 : -1, T = C.thick / 2, Y = (dy) => cy + s * dy;
		ctx.beginPath();
		ctx.moveTo(x - C.w / 2, Y(C.h / 2 - T));
		ctx.lineTo(x, Y(-C.h / 2 - T));
		ctx.lineTo(x + C.w / 2, Y(C.h / 2 - T));
		ctx.lineTo(x + C.w / 2, Y(C.h / 2 + T));
		ctx.lineTo(x, Y(-C.h / 2 + T));
		ctx.lineTo(x - C.w / 2, Y(C.h / 2 + T));
		ctx.closePath();
		ctx.lineJoin = 'round';
		if (lit > 0) {
			ctx.globalAlpha = 0.35 + 0.65 * lit;
			ctx.fillStyle = colour;
			ctx.shadowColor = colour;
			ctx.shadowBlur = 16 * lit;
			ctx.fill();
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 1;
			ctx.lineWidth = 4;
			ctx.strokeStyle = '#140a0a';
			ctx.stroke();
		} else {
			ctx.fillStyle = 'rgba(255,255,255,0.13)';
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'rgba(0,0,0,0.45)';
			ctx.stroke();
		}
	};
	const v = Math.max(-1, Math.min(1, value));
	for (let k = 0; k < C.ahead; k++) chevron(mid - C.first - k * C.gap, true, Math.max(0, Math.min(1, v * C.ahead - k)));
	for (let k = 0; k < C.astern; k++) chevron(mid + C.first + k * C.gap, false, Math.max(0, Math.min(1, -v * C.astern - k)));
	// the zero line
	ctx.fillStyle = 'rgba(255,255,255,0.55)';
	ctx.fillRect(x - C.w / 2 - 8, mid - 2, C.w + 16, 4);
	// the arrow, pointing out to the driver's side
	const ax = x + dir * 96, len = 104, hw = 46, shaft = 20;
	const tip = ax + dir * len / 2, back = ax - dir * len / 2, neck = tip - dir * 48;
	ctx.beginPath();
	ctx.moveTo(tip, mid);
	ctx.lineTo(neck, mid - hw);
	ctx.lineTo(neck, mid - shaft);
	ctx.lineTo(back, mid - shaft);
	ctx.lineTo(back, mid + shaft);
	ctx.lineTo(neck, mid + shaft);
	ctx.lineTo(neck, mid + hw);
	ctx.closePath();
	ctx.lineJoin = 'round';
	ctx.fillStyle = 'rgba(0,0,0,0.5)';
	ctx.save();
	ctx.translate(0, 7);
	ctx.fill();
	ctx.restore();
	ctx.fillStyle = colour;
	ctx.fill();
	ctx.lineWidth = 7;
	ctx.strokeStyle = '#140a0a';
	ctx.stroke();
	ctx.restore();
}

// A little wireframe of the Strider on a screen in the bottom middle, seen
// from behind and a little to one side, its legs on their own strides (each
// in its driver's colour). (cx, ground): the middle of its feet; s pixels a
// metre; legs: [left, right] { phase, amount, colour }.
export function wireStrider(ctx, cx, ground, s, legs, t) {
	const yaw = 35 * Math.PI / 180, pitch = 18 * Math.PI / 180;
	const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
	const P = (x, y, z) => {
		const xr = x * cy + z * sy;
		const zr = -x * sy + z * cy;
		return [cx + xr * s, ground - (y * cp + zr * sp) * s];
	};
	const line = (pts) => {
		ctx.beginPath();
		pts.forEach((p, i) => { const [x, y] = P(...p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
		ctx.stroke();
	};
	const ring = (f, n = 20, a0 = 0, a1 = TAU) => {
		const pts = [];
		for (let i = 0; i <= n; i++) pts.push(f(a0 + (a1 - a0) * i / n));
		line(pts);
	};
	ctx.save();
	// the screen
	const w = 300, h = 222, x0 = cx - w / 2, y0 = ground + 26 - h;
	ctx.fillStyle = 'rgba(4,14,20,0.82)';
	ctx.strokeStyle = '#b5221a';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.roundRect(x0, y0, w, h, 18);
	ctx.fill();
	ctx.stroke();
	ctx.clip();
	ctx.strokeStyle = 'rgba(120,230,255,0.12)';
	ctx.lineWidth = 1;
	for (let gx = -6; gx <= 6; gx += 2) line([[gx, 0, -6], [gx, 0, 6]]);
	for (let gz = -6; gz <= 6; gz += 2) line([[-6, 0, gz], [6, 0, gz]]);
	ctx.font = `20px "${MONO}", monospace`;
	ctx.fillStyle = 'rgba(120,230,255,0.6)';
	ctx.textBaseline = 'top';
	ctx.fillText('STRIDER', x0 + 14, y0 + 10);

	// the body, in a cool cyan
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.strokeStyle = 'rgba(140,235,255,0.85)';
	ctx.shadowColor = 'rgba(140,235,255,0.8)';
	ctx.shadowBlur = 6;
	ctx.lineWidth = 2;
	const bob = Math.sin(t * 2) * 0.05;
	ring((a) => [2.4 * Math.cos(a), 6.5 + bob, 2.0 * Math.sin(a)]);
	ring((a) => [2.4 * Math.cos(a), 6.5 + bob + 2.0 * Math.sin(a), 0]);
	ring((a) => [0, 6.5 + bob + 2.0 * Math.sin(a), 2.0 * Math.cos(a)]);
	ring((a) => [1.45 * Math.cos(a), 8.2 + bob, 1.45 * Math.sin(a)], 16);
	ring((a) => [1.45 * Math.cos(a), 8.2 + bob + 1.45 * Math.sin(a), 0], 10, 0, Math.PI);
	ring((a) => [0, 8.2 + bob + 1.45 * Math.sin(a), 1.45 * Math.cos(a)], 10, 0, Math.PI);
	for (const side of [-1, 1]) {
		line([[side * 2.4, 7.3 + bob, 0], [side * 2.7, 5.5 + bob, 0.3], [side * 2.7, 5.5 + bob, side > 0 ? 3.6 : 2.6]]);
	}
	line([[-1.4, 4.5, -0.9], [1.4, 4.5, -0.9], [1.4, 4.5, 0.9], [-1.4, 4.5, 0.9], [-1.4, 4.5, -0.9]]);

	// the legs, each in its driver's colour, on its own stride
	legs.forEach(function (leg, i) {
		const side = i === 0 ? -1 : 1;
		const pose = legPose(leg.phase, leg.amount);
		const a = pose.hip, k = pose.knee, f = 0.4 * k;
		const hip = [side * 1.25, 4.4, 0];
		const knee = [hip[0], hip[1] - 2.2 * Math.cos(a), hip[2] - 2.2 * Math.sin(a)];
		const ankle = [hip[0], knee[1] - 2.15 * Math.cos(a + k), knee[2] - 2.15 * Math.sin(a + k)];
		const toe = [hip[0], ankle[1] - 1.7 * Math.sin(f), ankle[2] + 1.7 * Math.cos(f)];
		const heel = [hip[0], ankle[1] + 0.8 * Math.sin(f), ankle[2] - 0.8 * Math.cos(f)];
		ctx.shadowColor = leg.colour;
		ctx.shadowBlur = 10;
		ctx.strokeStyle = leg.colour;
		ctx.lineWidth = 6;
		line([hip, knee, ankle]);
		line([heel, toe]);
		ctx.lineWidth = 3;
		line([[heel[0] - 0.5, heel[1], heel[2]], [toe[0] - 0.5, toe[1], toe[2]], [toe[0] + 0.5, toe[1], toe[2]], [heel[0] + 0.5, heel[1], heel[2]], [heel[0] - 0.5, heel[1], heel[2]]]);
		ctx.fillStyle = leg.colour;
		for (const j of [hip, knee, ankle]) {
			const [jx, jy] = P(...j);
			ctx.beginPath();
			ctx.arc(jx, jy, 5, 0, TAU);
			ctx.fill();
		}
	});
	ctx.restore();
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
