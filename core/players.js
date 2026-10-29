/*
 * IGB.players — where the players are.
 *
 * In the gamebox the tracking system sends positions through Vuplex. At a
 * desk, the little gamebox simulator under the stage stands in for it, with the
 * virtual gamebox's controls (core/gamebox.js) for the player you drive:
 *   WASD / arrows   walk                     click the floor   walk there
 *   Shift (or C)    squat                    Space             jump
 *   Q / E           shorter / taller (110-190 cm)
 *   mouse over a wall   look there           click a wall      touch it (you walk
 *                                            into reach first; the game hears a click)
 *   Tab / 1-6       pick a player            0                 just watch
 *   H               hide or show the help
 * It's gone (and its keys with it) in the real gamebox, where Vuplex sends the tracking.
 *
 * Each player object carries (all updated in place):
 *
 *   X, Y, Z       raw tracking, -1..1. X runs left to right across the front
 *                 wall, Y is height (up is positive), Z runs from the back
 *                 of the room (-1) to the front wall (+1). So pz is 1 right
 *                 up against the front wall and 0 at the back.
 *   x, y, z       the same values, lower case.
 *   px, py, pz    the same, mapped to 0..1. py is flipped so 0 is high, 1 is low,
 *                 matching screen space.
 *   walls[i]      per-wall coordinates: for each wall (0 left, 1 front,
 *                 2 right), x/y/z and px/py/pz as seen facing that wall, and
 *                 dist, how far the player is from it (0..1).
 *   wall          the last wall the player touched (simulator clicks).
 *   wallChange    set alongside wall when a touch happens.
 *   rot           the hat's rotation, a quaternion { w, x, y, z } in the
 *                 tracker's (Unity's) axes: x right across the front wall,
 *                 y up, z toward the front wall.
 *   look          the way the hat faces, a unit vector in those same axes
 *                 (room-true: not squashed by the -1..1 scaling).
 *   gaze          where that look meets the walls, or null (looking at the
 *                 floor, the ceiling, or back out of the room):
 *                   wall     0 left, 1 front, 2 right
 *                   x, y     -1..1 on that wall as seen facing it (x left to
 *                            right, y up), like walls[i]
 *                   px, py   the same, 0..1 (py 0 at the top: screen space)
 *                   at       { x, y }: stage pixels across all three walls
 *                            (x from 0 to IGB.WIDTH, y from 0 to IGB.H)
 *                   dist     how far along the look it is, in room
 *                            half-widths
 *
 * The wand (the tracking stick), when there is one, is IGB.players.wand:
 * { X, Y, Z, rot, look, point }, point being where the tracker says it
 * points ({ wall, x, y, button }) or null. It isn't one of the players.
 *
 * Subscribe with IGB.players.onUpdate(fn); fn(players) runs on every update.
 *
 * The tracking message (from the Unity hub's WebPageTrackingDispatcher):
 *   [{ Id, X, Y, Z, rW, rX, rY, rZ }, ...players, <the wand, last>]
 *   | <wall>,<x>,<y>,<button phase>     (only when the wand points at a wall)
 */
IGB.players = (function () {

	const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;   // (to find three.js from here)

	const SLOTS = 7;       // the tracker can report up to seven people
	const CONTROLLABLE = 6;
	const DEBUG_RATE = 20; // simulated updates per second
	const EDGE = 0.86;     // simulated players stay this far (of the room's half-width) from the middle: never in the walls

	// Reading the hats' rotation as a gaze. Check these in the gamebox:
	//   forward   the hat's own axis that points the way the wearer faces
	//             (Unity's convention is +z; flip or swap it if the tracker
	//             is mounted another way round)
	//   room      the room's half-size on each axis, relative to its width:
	//             positions arrive squashed to -1..1 on every axis, so a
	//             room-true direction is divided by these to cross that space
	//             (the walls are 16:10, so the height is 0.625 of the width)
	//   wandLast  the message's last entry is the wand, not a player
	const GAZE = { forward: { x: 0, y: 0, z: 1 }, room: { x: 1, y: 0.625, z: 1 }, wandLast: true };

	const players = [];
	const listeners = [];
	const wand = { X: 0, Y: 0, Z: 0, rot: null, look: null, point: null };

	let selected = 0;
	let debugInterval;
	let $simulator;

	function slot(i) {
		if (!players[i]) players[i] = { Id: i, X: 0, Y: 0, Z: 0, wall: 1 };
		return players[i];
	}

	function makeMetrics(p) {
		p.x = p.X;
		p.y = p.Y;
		p.z = p.Z;

		p.px = (p.X + 1) / 2;
		p.py = 1 - (p.Y + 1) / 2;
		p.pz = (p.Z + 1) / 2;

		p.walls = [
			{ x: p.z, y: p.y, z: p.x, px: p.pz, py: p.py, pz: p.px, dist: p.px },
			{ x: p.x, y: p.y, z: p.z, px: p.px, py: p.py, pz: p.pz, dist: 1 - p.pz },
			{ x: -p.z, y: p.y, z: p.x, px: -p.pz, py: p.py, pz: p.px, dist: 1 - p.px },
		];
	}

	/* ---------- gaze ---------- */

	// v rotated by the quaternion q
	function rotate(q, v) {
		// (t = 2 q.xyz x v; v' = v + w t + q.xyz x t)
		const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
		return {
			x: v.x + q.w * tx + (q.y * tz - q.z * ty),
			y: v.y + q.w * ty + (q.z * tx - q.x * tz),
			z: v.z + q.w * tz + (q.x * ty - q.y * tx),
		};
	}

	// the rotation and the look from a tracking entry (null if it has no rotation)
	function readRotation(d) {
		if (d.rW === undefined) return null;
		const n = Math.hypot(d.rW, d.rX, d.rY, d.rZ);
		if (!(n > 1e-6)) return null;
		const rot = { w: d.rW / n, x: d.rX / n, y: d.rY / n, z: d.rZ / n };
		const f = rotate(rot, GAZE.forward), l = Math.hypot(f.x, f.y, f.z) || 1;
		return { rot, look: { x: f.x / l, y: f.y / l, z: f.z / l } };
	}

	// Where a look from (X, Y, Z) first meets a wall: the left (X = -1), the
	// front (Z = +1) or the right (X = +1), on it between floor and ceiling.
	// (room: the room's proportions, GAZE.room unless given)
	function wallHit(X, Y, Z, look, room = GAZE.room) {
		if (!look) return null;
		// (into the squashed -1..1 space the positions live in)
		const dx = look.x / room.x, dy = look.y / room.y, dz = look.z / room.z;
		let best = null;
		const consider = (wall, t) => {
			if (!(t > 0) || (best && t >= best.t)) return;
			const hx = X + dx * t, hy = Y + dy * t, hz = Z + dz * t;
			if (Math.abs(hy) > 1) return;   // (over the wall's top or under its foot: the ceiling or the floor)
			const x = wall === 0 ? hz : wall === 1 ? hx : -hz;
			if (Math.abs(x) > 1.0001) return;
			best = { t, wall, x: Math.max(-1, Math.min(1, x)), y: hy };
		};
		if (dx < 0) consider(0, (-1 - X) / dx);
		if (dz > 0) consider(1, (1 - Z) / dz);
		if (dx > 0) consider(2, (1 - X) / dx);
		if (!best) return null;
		const px = (best.x + 1) / 2, py = 1 - (best.y + 1) / 2;
		return { wall: best.wall, x: best.x, y: best.y, px, py, at: { x: (best.wall + px) * IGB.W, y: py * IGB.H }, dist: best.t };
	}

	// A tracking message (see the top).
	function receive(str) {
		const parts = String(str).split('|');
		const data = JSON.parse(parts[0]);
		const count = GAZE.wandLast && data.length > 1 ? data.length - 1 : data.length;
		for (let i = 0; i < count; i++) {
			const p = slot(i);
			p.X = data[i].X;
			p.Y = data[i].Y;
			p.Z = data[i].Z;
			makeMetrics(p);
			const r = readRotation(data[i]);
			p.rot = r ? r.rot : null;
			p.look = r ? r.look : null;
			p.gaze = wallHit(p.X, p.Y, p.Z, p.look);
		}
		if (count < data.length) {
			const d = data[data.length - 1], r = readRotation(d);
			wand.X = d.X; wand.Y = d.Y; wand.Z = d.Z;
			wand.rot = r ? r.rot : null;
			wand.look = r ? r.look : null;
			const pt = parts[1] ? parts[1].split(',') : null;
			wand.point = pt && pt.length >= 3 ? { wall: ['Left', 'Front', 'Right'].indexOf(pt[0]), x: parseFloat(pt[1]), y: parseFloat(pt[2]), button: pt[3] || '' } : null;
		}
		drawSimulator();
		for (const fn of listeners) fn(players);
	}

	function onUpdate(fn) {
		listeners.push(fn);
	}

	/* ---------- the desk simulator ---------- */

	// The simulated hats look at a spot on the walls (each player's own, in the
	// same -1..1 space as positions); the mouse over a wall points the selected
	// player's gaze there. Their rotation is made to look at it.
	const lookAt = [];
	function simTarget(i) {
		if (!lookAt[i]) lookAt[i] = { X: -0.6 + Math.random() * 1.2, Y: -0.2 + Math.random() * 0.5, Z: 1 };
		return lookAt[i];
	}
	// the quaternion that turns the hat's forward (+z) toward d (room-true), no roll
	function lookRotation(d) {
		const l = Math.hypot(d.x, d.y, d.z) || 1;
		const yaw = Math.atan2(d.x / l, d.z / l), pitch = -Math.asin(Math.max(-1, Math.min(1, d.y / l)));
		const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2);
		// (yaw about y, after pitch about x)
		return { w: cy * cp, x: cy * sp, y: sy * cp, z: -sy * sp };
	}

	function randomMove() {
		for (let i = 0; i < CONTROLLABLE; i++) {
			if (i === selected) continue;   // (not the one you're driving)
			const p = slot(i);
			$(p).stop(true).animate({
				X: -0.9 + Math.random() * 1.8,
				Z: -0.9 + Math.random() * 1.8,
				Y: -0.3 + Math.random() * 0.6,
				wall: 1,
			});
		}
	}

	// You: the player you drive (selected; -1 just watches), as in the virtual gamebox.
	// Positions are tracking units (1 unit = 1.8 m of a 3.6 m room; Y 1 unit = 1.125 m of height).
	const HEIGHTS = [110, 130, 150, 170, 190];   // cm
	const keys = new Set();
	const you = { cm: 170, sq: 0, jumpT: -1, goal: null, pendingTouch: null, help: true };
	const youBase = () => (you.cm - 170) / 112.5;   // (0 is a standing 170 cm adult)
	const youJump = () => (you.jumpT >= 0 ? 0.34 * Math.sin(Math.PI * Math.min(1, you.jumpT / 0.55)) : 0);
	const simOn = () => !!$simulator && !window.vuplex && $simulator.is(':visible');

	// a touch on a wall, t = { wall, u, v } (u across as you face it, v down from the top):
	// the game hears a click there on the stage, as it would from a real touch
	function touchWall(t) {
		const p = slot(selected);
		p.wall = t.wall;
		p.wallChange = t.wall;
		const $w = $('igb-world');
		const r = $w[0].getBoundingClientRect(), sc = IGB.scale;
		const cx = r.left + (t.wall + t.u) * IGB.W * sc, cy = r.top + t.v * IGB.H * sc;
		const hit = document.elementsFromPoint(cx, cy).find((e) => $w[0].contains(e)) || $w[0];
		const o = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pageX: cx, pageY: cy, button: 0, pointerId: 1, isPrimary: true };
		hit.dispatchEvent(new PointerEvent('pointerdown', o));
		hit.dispatchEvent(new MouseEvent('mousedown', o));
		hit.dispatchEvent(new PointerEvent('pointerup', o));
		hit.dispatchEvent(new MouseEvent('mouseup', o));
		hit.dispatchEvent(new MouseEvent('click', o));
		if (sim3) sim3.ripple(t, selected);
		flash('TOUCH!');
	}
	// where you'd stand to touch that spot, and whether you're there already
	const standFor = (t) => (t.wall === 1 ? { X: t.u * 2 - 1, Z: 0.8 } : t.wall === 0 ? { X: -0.8, Z: t.u * 2 - 1 } : { X: 0.8, Z: 1 - t.u * 2 });
	function reachable(t) {
		const p = slot(selected), s2 = standFor(t);
		const out = t.wall === 1 ? 1 - p.Z : t.wall === 0 ? p.X + 1 : 1 - p.X;
		const along = t.wall === 1 ? Math.abs(p.X - s2.X) : Math.abs(p.Z - s2.Z);
		return out < 0.39 && along < 0.3 && (1 - t.v) * 2.25 < you.cm / 100 * 1.25;   // (0.7 m out, 0.55 m along, up to 1.25 x your height)
	}
	function touch(t) {
		if (selected < 0) return;
		if (reachable(t)) { touchWall(t); return; }
		you.goal = standFor(t);
		you.pendingTouch = t;
	}

	// one step of you: walking (keys, or toward a click), squatting, jumping
	function stepYou(dt) {
		if (selected < 0) return;
		const p = slot(selected);
		let ix = 0, iz = 0;
		if (keys.has('w') || keys.has('arrowup')) iz += 1;
		if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
		if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
		if (keys.has('d') || keys.has('arrowright')) ix += 1;
		const speed = (you.sq > 0.5 ? 0.5 : 1) * 1.4 / 1.8;   // (1.4 m/s, slower squatting)
		if (ix || iz) {
			$(p).stop(true);
			you.goal = null; you.pendingTouch = null;
			const l = Math.hypot(ix, iz);
			p.X += ix / l * speed * dt; p.Z += iz / l * speed * dt;
		} else if (you.goal) {
			$(p).stop(true);
			const dx = you.goal.X - p.X, dz = you.goal.Z - p.Z, d = Math.hypot(dx, dz);
			if (d < 0.02) {
				you.goal = null;
				if (you.pendingTouch) { touchWall(you.pendingTouch); you.pendingTouch = null; }
			} else { const st = Math.min(d, speed * 1.3 * dt); p.X += dx / d * st; p.Z += dz / d * st; }
		}
		const wantSq = keys.has('shift') || keys.has('c') ? 1 : 0;
		you.sq += (wantSq - you.sq) * Math.min(1, dt * 8);
		if (you.jumpT >= 0) { you.jumpT += dt; if (you.jumpT > 0.55) you.jumpT = -1; }
		p.Y = youBase() - you.sq * 0.32 + youJump();
	}

	// a word on the stage for a moment (TOUCH!, 150 CM)
	// the keys on the card light up as they're used: held keys while held, the rest for a blink
	const KEY_OF = { arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd', c: 'shift', ' ': 'space' };
	const blinks = {};
	function lightKey(k, on) {
		if (!$simulator) return;
		$simulator.find(`kbd[k="${k}"]`).toggleClass('lit', on);
	}
	function blinkKey(k, ms = 220) {
		lightKey(k, true);
		clearTimeout(blinks[k]);
		blinks[k] = setTimeout(() => lightKey(k, false), ms);
	}
	let $flash;
	function flash(text) {
		if (!$simulator) return;
		if (!$flash) $flash = $('<gamebox-flash>').appendTo($simulator);
		$flash.stop(true).text(text).css({ opacity: 1 }).delay(500).animate({ opacity: 0 }, 400);
	}

	function stepDebug() {
		stepYou(1 / DEBUG_RATE);
		const out = [];
		for (let i = 0; i < CONTROLLABLE; i++) {
			const p = slot(i);
			p.X = Math.max(-EDGE, Math.min(EDGE, p.X));   // (kept off the walls: a token's width and a little)
			p.Y = i === selected ? Math.max(-1, Math.min(1, p.Y)) : Math.max(-0.4, Math.min(0.6, p.Y));
			p.Z = Math.max(-EDGE, Math.min(EDGE, p.Z));
			const t = simTarget(i);
			const q = lookRotation({ x: (t.X - p.X) * GAZE.room.x, y: (t.Y - p.Y) * GAZE.room.y, z: (t.Z - p.Z) * GAZE.room.z });
			out.push({ Id: i, X: p.X, Y: p.Y, Z: p.Z, rW: q.w, rX: q.x, rY: q.y, rZ: q.z });
		}
		out.push({ Id: 0, X: 0, Y: -0.2, Z: -0.5, rW: 1, rX: 0, rY: 0, rZ: 0 });   // (the wand, held still)
		receive(JSON.stringify(out) + '|Front,0,0,None');
	}

	function hud() {
		if (!$simulator) return;
		const state = you.sq > 0.5 ? ' · squatting' : you.jumpT >= 0 ? ' · jumping' : '';
		$simulator.find('gamebox-player').attr('n', selected < 0 ? null : selected).html(selected < 0 ? 'Watching <span>pick a player below</span>'
			: `<b>You are P${selected + 1}</b> <span>${you.cm} cm${state}</span>`);
		$simulator.find('gamebox-hint').toggle(you.help);
		$simulator.find('[pip]').each(function (k) { $(this).toggleClass('on', k === selected); });
	}

	/* the little box, drawn on a canvas from a camera behind and above the back of the room */

	const COLS = ['#ff3b3b', '#3b7bff', '#2fd25a', '#d23bff', '#ff7a1a', '#ffc21a'];
	const HR = 1.25;   // (the walls' height, in room half-widths: they're 16:10)
	const SIM = { w: 300, h: 210, eye: [0, 5.4, -4.6], at: [0, 0.15, 0.25], hover: -1 };
	const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
	const cam = (function () {
		const fwd = v3.norm(v3.sub(SIM.at, SIM.eye)), right = v3.norm(v3.cross([0, 1, 0], fwd)), up = v3.cross(fwd, right);
		const raw = (pt) => { const d = v3.sub(pt, SIM.eye), z = v3.dot(d, fwd); return [v3.dot(d, right) / z, -v3.dot(d, up) / z]; };
		// fit the box (and a token's head at the back) into the canvas
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		for (const X of [-1, 1]) for (const Z of [-1, 1]) for (const y of [0, HR]) { const [a, b] = raw([X, y, Z]); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
		const m = 12, k = Math.min((SIM.w - 2 * m) / (x1 - x0), (SIM.h - 2 * m) / (y1 - y0));
		const ox = SIM.w / 2 - (x0 + x1) / 2 * k, oy = SIM.h / 2 - (y0 + y1) / 2 * k;
		return {
			p(X, y, Z) { const [a, b] = raw([X, y, Z]); return [ox + a * k, oy + b * k]; },
			// what's under a point on the canvas: { wall (0 left, 1 front, 2 right, 3 floor), X, y, Z }
			pick(px, py) {
				const a = (px - ox) / k, b = (py - oy) / k;
				const dir = v3.norm([fwd[0] + right[0] * a - up[0] * b, fwd[1] + right[1] * a - up[1] * b, fwd[2] + right[2] * a - up[2] * b]);
				const E = SIM.eye, at = (t) => [E[0] + dir[0] * t, E[1] + dir[1] * t, E[2] + dir[2] * t];
				let best = null;
				const take = (wall, t, ok) => { if (t > 0 && (!best || t < best.t)) { const q = at(t); if (ok(q)) best = { wall, t, X: q[0], y: q[1], Z: q[2] }; } };
				const inY = (q) => q[1] >= 0 && q[1] <= HR, inZ = (q) => Math.abs(q[2]) <= 1, inX = (q) => Math.abs(q[0]) <= 1;
				if (dir[1] < 0) take(3, -E[1] / dir[1], (q) => inX(q) && inZ(q));
				if (dir[0] < 0) take(0, (-1 - E[0]) / dir[0], (q) => inY(q) && inZ(q));
				if (dir[0] > 0) take(2, (1 - E[0]) / dir[0], (q) => inY(q) && inZ(q));
				if (dir[2] > 0) take(1, (1 - E[2]) / dir[2], (q) => inY(q) && inX(q));
				return best;
			},
		};
	})();

	let ctx;
	const gazeSeen = [];   // (each player's gaze target, last drawn, and when it last moved)
	function quad(pts, fill, stroke) {
		ctx.beginPath();
		pts.forEach(([X, y, Z], k) => { const [a, b] = cam.p(X, y, Z); k ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
		ctx.closePath();
		if (fill) { ctx.fillStyle = fill; ctx.fill(); }
		if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
	}
	function line(A, B) { const [a, b] = cam.p(...A), [c, d] = cam.p(...B); ctx.moveTo(a, b); ctx.lineTo(c, d); }
	// where a gaze lands, in the room: { wall, x, y } (the tracker's -1..1, squashed) into X, y, Z
	function gazePoint(g) {
		const h = (g.y + 1) / 2 * HR;
		return g.wall === 1 ? [g.x, h, 1] : g.wall === 0 ? [-1, h, g.x] : [1, h, -g.x];
	}
	// a token's radius at a share f of its height: a round foot, a tapering body, a collar, a neck
	function lathe(f) {
		if (f < 0.07) return 0.088;
		if (f < 0.1) return 0.072;
		if (f < 0.66) return 0.064 - (f - 0.1) / 0.56 * 0.03;
		if (f < 0.72) return 0.047;
		return 0.03;
	}
	function shade(hex, k) {   // (lighter for k > 0, darker for k < 0)
		const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
		return `rgb(${c[0]},${c[1]},${c[2]})`;
	}

	/* the box in real 3D (three.js, loaded when the simulator mounts; the flat drawing
	   above stands in until it arrives, or if WebGL won't start). Room units: X across,
	   y up, Z toward the front wall; three's z runs the other way. */
	let sim3 = null;
	function make3D(THREE, host) {
		const W = SIM.w, H = SIM.h;
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
		renderer.setSize(W, H);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		host.appendChild(renderer.domElement);
		const P = (X, y, Z) => new THREE.Vector3(X, y, -Z);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
		camera.position.copy(P(...SIM.eye));
		camera.lookAt(P(...SIM.at));
		// (fit the box to the canvas: widen or narrow the view, then centre it)
		{
			camera.updateMatrixWorld(); camera.updateProjectionMatrix();
			let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
			for (const X of [-1, 1]) for (const Z of [-1, 1]) for (const y of [0, HR]) { const v = P(X, y, Z).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
			const k = Math.max((x1 - x0) / 1.86, (y1 - y0) / 1.8);
			camera.fov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * k) * 180 / Math.PI;
			camera.updateProjectionMatrix();
			x0 = 9; x1 = -9; y0 = 9; y1 = -9;
			for (const X of [-1, 1]) for (const Z of [-1, 1]) for (const y of [0, HR]) { const v = P(X, y, Z).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
			camera.setViewOffset(W, H, (x0 + x1) / 2 * W / 2, -(y0 + y1) / 2 * H / 2, W, H);
		}
		scene.add(new THREE.HemisphereLight('#c8d4ff', '#1a1a34', 1.1));
		const sun = new THREE.DirectionalLight('#ffffff', 1.8);
		sun.position.copy(P(-1.2, 4, -2.2)); sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 10 });
		scene.add(sun);
		// the floor and its grid
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshStandardMaterial({ color: '#283063', roughness: 0.75, emissive: '#000000' }));
		floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.userData.wall = 3;
		scene.add(floor);
		const grid = new THREE.GridHelper(2, 8, '#9ab8ff', '#9ab8ff');
		grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.y = 0.002;
		scene.add(grid);
		// the three walls (facing in), and their edges
		const walls = [0, 1, 2].map((n) => {
			const m = new THREE.Mesh(new THREE.PlaneGeometry(2, HR), new THREE.MeshStandardMaterial({ color: n === 1 ? '#34458a' : '#3d4f95', roughness: 0.6, emissive: '#141c44', transparent: true, opacity: n === 1 ? 0.95 : 0.5, depthWrite: n === 1, side: THREE.DoubleSide }));
			if (n === 0) { m.rotation.y = Math.PI / 2; m.position.set(-1, HR / 2, 0); }
			if (n === 1) m.position.set(0, HR / 2, -1);
			if (n === 2) { m.rotation.y = -Math.PI / 2; m.position.set(1, HR / 2, 0); }
			m.receiveShadow = true; m.userData.wall = n;
			scene.add(m);
			return m;
		});
		const NORMALS = [P(1, 0, 0), P(0, 0, -1), P(-1, 0, 0)];
		const edge = [[-1, 0, -1], [-1, HR, -1], [-1, HR, -1], [-1, HR, 1], [-1, HR, 1], [1, HR, 1], [1, HR, 1], [1, HR, -1], [1, HR, -1], [1, 0, -1], [-1, 0, 1], [-1, HR, 1], [1, 0, 1], [1, HR, 1], [-1, 0, -1], [-1, 0, 1], [-1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, -1]];
		scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edge.map((e) => P(...e))), new THREE.LineBasicMaterial({ color: '#a8c4ff', transparent: true, opacity: 0.55 })));

		// the tokens: a lathed body (unit height, stretched to each one's), a ball head marked
		// with its centre and a line the way it faces, a name over it
		const prof = [new THREE.Vector2(0, 0)];
		for (let f = 0; f <= 0.78; f += 0.01) prof.push(new THREE.Vector2(lathe(f), f));
		prof.push(new THREE.Vector2(0, 0.78));
		const bodyGeo = new THREE.LatheGeometry(prof, 36), headGeo = new THREE.SphereGeometry(1, 28, 18);
		const dark = new THREE.MeshBasicMaterial({ color: '#0c0c1c' });
		const tagFor = (text, col) => {
			const c = document.createElement('canvas'); c.width = 128; c.height = 48;
			const x = c.getContext('2d'); x.font = '700 30px Rubik, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
			const w = x.measureText(text).width + 22;
			x.beginPath(); x.roundRect(64 - w / 2, 6, w, 36, 18); x.fillStyle = col; x.fill();
			if (text === 'YOU') { x.lineWidth = 4; x.strokeStyle = 'white'; x.stroke(); }
			x.fillStyle = 'white'; x.fillText(text, 64, 25);
			const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
			return t;
		};
		const tokens = COLS.map((col, i) => {
			const g = new THREE.Group(); scene.add(g);
			const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.32, metalness: 0.08 });
			const body = new THREE.Mesh(bodyGeo, mat); body.castShadow = true; g.add(body);
			const head = new THREE.Group(); g.add(head);
			const ball = new THREE.Mesh(headGeo, mat); ball.castShadow = true; head.add(ball);
			const dot = new THREE.Mesh(headGeo, dark); head.add(dot);
			const nose = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dark); head.add(nose);
			const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagFor('P' + (i + 1), col), depthTest: false, transparent: true }));
			tag.scale.set(0.34, 0.128, 1); tag.renderOrder = 10; g.add(tag);
			const ring = new THREE.Mesh(new THREE.RingGeometry(0.115, 0.135, 40), new THREE.MeshBasicMaterial({ color: 'white', transparent: true, opacity: 0.9, depthWrite: false }));
			ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; g.add(ring);
			// where they look: a target on the wall, and dots from the head to it
			const tgt = new THREE.Group(); scene.add(tgt);
			const tMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide });
			tgt.add(new THREE.Mesh(new THREE.RingGeometry(0.036, 0.05, 32), tMat));
			for (const r of [0, Math.PI / 2]) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.008), tMat); bar.rotation.z = r; tgt.add(bar); }
			const lineMat = new THREE.LineDashedMaterial({ color: col, dashSize: 0.03, gapSize: 0.035, transparent: true, depthWrite: false });
			const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), lineMat);
			ln.frustumCulled = false; scene.add(ln);
			return { g, body, head, ball, dot, nose, tag, tagMe: null, mat, ring, tgt, tMat, ln, lineMat, at: null, seen: { p: null, t: -9 } };
		});
		// where you're walking to
		const goal = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.095, 32, 1, 0, Math.PI * 1.6), new THREE.MeshBasicMaterial({ color: 'white', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
		goal.rotation.x = -Math.PI / 2; goal.position.y = 0.005; scene.add(goal);
		// touch ripples, on the wall
		const ripples = [];
		const wallPt = (wall, X, y, Z) => P(wall === 0 ? -1 : wall === 2 ? 1 : X, y, wall === 1 ? 1 : Z).addScaledVector(NORMALS[wall], 0.004);
		const onWall = (m, wall, at) => { m.position.copy(at); m.lookAt(at.clone().add(NORMALS[wall])); };

		const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmp = new THREE.Vector3();
		let last = performance.now();
		function frame() {
			requestAnimationFrame(frame);
			if (!simOn() || document.hidden) return;
			const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), ts = now / 1000;
			last = now;
			walls.forEach((m, n) => m.material.emissive.set(SIM.hover === n ? '#2e3f88' : '#141c44'));
			floor.material.emissive.set(SIM.hover === 3 ? '#141c40' : '#000000');
			tokens.forEach((tk, i) => {
				const p = players[i];
				const on = p && p.px !== undefined;
				tk.g.visible = tk.tgt.visible = tk.ln.visible = !!on;
				if (!on) return;
				const me = i === selected;
				const tall = me ? you.cm / 170 : Math.max(0.75, Math.min(1.2, 1 + p.Y * 0.4));
				const sq = me ? you.sq : p.Y < -0.25 ? 1 : 0;
				const Ht = 0.42 * tall * (1 - sq * 0.38), lift = me ? youJump() * 0.5 : 0;
				tmp.copy(P(p.X, 0, p.Z));
				if (!tk.at) tk.at = tmp.clone(); else tk.at.lerp(tmp, 1 - Math.exp(-dt * 18));
				tk.g.position.set(tk.at.x, 0, tk.at.z);
				tk.body.position.y = lift; tk.body.scale.set(1, Ht, 1);
				const hr = 0.06 * Math.min(1.1, tall);
				tk.head.position.y = lift + Ht * 0.88;
				tk.ball.scale.setScalar(hr);
				tk.dot.scale.setScalar(hr * 0.16); tk.dot.position.set(0, hr * 0.93, 0);
				tk.nose.scale.set(hr * 0.12, hr * 0.08, hr * 0.95); tk.nose.position.set(0, hr * 0.9, hr * 0.5);
				tk.nose.rotation.x = 0.35;
				tk.ring.visible = me;
				tk.tag.position.y = lift + Ht * 0.88 + hr + 0.1;
				if (tk.tagMe !== me) { tk.tag.material.map.dispose(); tk.tag.material.map = tagFor(me ? 'YOU' : 'P' + (i + 1), COLS[i]); tk.tagMe = me; }
				tk.tag.material.opacity = me ? 1 : 0.8;
				// the gaze: head turned to it, a target on the wall, dots while it moves
				const g = p.gaze;
				tk.tgt.visible = tk.ln.visible = !!g;
				if (!g) return;
				const [gX, gy, gZ] = gazePoint(g), T = wallPt(g.wall, gX, gy, gZ);
				const headW = tk.head.getWorldPosition(new THREE.Vector3());
				tk.head.lookAt(T.x, headW.y, T.z);
				if (!tk.seen.p || tk.seen.p.distanceTo(T) > 0.004) tk.seen.t = ts;
				tk.seen.p = T.clone();
				const base = me ? 0.95 : 0.5, fade = Math.max(0, Math.min(1, 1 - (ts - tk.seen.t - 1) / 0.5));
				onWall(tk.tgt, g.wall, T);
				tk.tMat.opacity = base * (0.3 + 0.7 * fade);
				tk.lineMat.opacity = base * fade;
				tk.ln.visible = fade > 0;
				const a = tk.ln.geometry.attributes.position;
				a.setXYZ(0, headW.x, headW.y, headW.z); a.setXYZ(1, T.x, T.y, T.z); a.needsUpdate = true;
				tk.ln.computeLineDistances();
			});
			goal.visible = !!(you.goal && selected >= 0);
			if (goal.visible) { goal.position.x = you.goal.X; goal.position.z = -you.goal.Z; goal.rotation.z += dt * 3; goal.material.color.set(COLS[selected]); }
			for (const r of ripples) { r.t += dt; r.m.scale.setScalar(1 + r.t * 7); r.m.material.opacity = Math.max(0, 1 - r.t / 0.6); }
			for (const r of ripples.filter((r2) => r2.t > 0.6)) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); }
			ripples.splice(0, ripples.length, ...ripples.filter((r) => r.t <= 0.6));
			renderer.render(scene, camera);
		}
		requestAnimationFrame(frame);
		return {
			el: renderer.domElement,
			// what's under the mouse: { wall (0 left, 1 front, 2 right, 3 floor), X, y, Z } in room units
			pick(e) {
				const r = renderer.domElement.getBoundingClientRect();
				ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
				ray.setFromCamera(ndc, camera);
				const h = ray.intersectObjects([...walls, floor], false)[0];
				return h ? { wall: h.object.userData.wall, X: h.point.x, y: h.point.y, Z: -h.point.z } : null;
			},
			// a touch, t = { wall, u, v }: a ripple there on the wall
			ripple(t, i) {
				const y = (1 - t.v) * HR, X = t.wall === 1 ? t.u * 2 - 1 : 0, Z = t.wall === 0 ? t.u * 2 - 1 : t.wall === 2 ? 1 - t.u * 2 : 0;
				const m = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.042, 32), new THREE.MeshBasicMaterial({ color: COLS[Math.max(0, i)], transparent: true, depthWrite: false, side: THREE.DoubleSide }));
				onWall(m, t.wall, wallPt(t.wall, X, y, Z));
				scene.add(m);
				ripples.push({ m, t: 0 });
			},
		};
	}

	function drawSimulator() {
		if (!ctx || sim3) return;
		ctx.clearRect(0, 0, SIM.w, SIM.h);
		ctx.lineWidth = 1;
		const hv = SIM.hover;
		// the floor, with its grid; then the walls
		quad([[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1]], hv === 3 ? 'rgba(70, 90, 150, 0.75)' : 'rgba(40, 48, 90, 0.7)');
		ctx.beginPath();
		for (let k = -3; k <= 3; k++) { line([k / 4, 0, -1], [k / 4, 0, 1]); line([-1, 0, k / 4], [1, 0, k / 4]); }
		ctx.strokeStyle = 'rgba(170, 210, 255, 0.13)'; ctx.stroke();
		const wallFill = (n) => (hv === n ? 'rgba(110, 150, 255, 0.42)' : 'rgba(70, 95, 180, 0.26)');
		quad([[-1, 0, -1], [-1, 0, 1], [-1, HR, 1], [-1, HR, -1]], wallFill(0), 'rgba(160, 200, 255, 0.45)');
		quad([[1, 0, -1], [1, 0, 1], [1, HR, 1], [1, HR, -1]], wallFill(2), 'rgba(160, 200, 255, 0.45)');
		quad([[-1, 0, 1], [1, 0, 1], [1, HR, 1], [-1, HR, 1]], wallFill(1), 'rgba(160, 200, 255, 0.45)');
		// where you're walking to
		if (you.goal && selected >= 0) {
			ctx.beginPath();
			for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, [x, y] = cam.p(you.goal.X + Math.cos(a) * 0.09, 0, you.goal.Z + Math.sin(a) * 0.09); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
			ctx.setLineDash([3, 3]); ctx.strokeStyle = COLS[selected]; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
		}
		// the players, far ones first: tokens, then where they look
		const list = players.slice(0, CONTROLLABLE).map((p, i) => ({ p, i })).filter((o) => o.p.px !== undefined).sort((a, b) => b.p.Z - a.p.Z);
		const heads = [];
		for (const { p, i } of list) {
			const me = i === selected, col = COLS[i];
			const tall = me ? you.cm / 170 : Math.max(0.75, Math.min(1.2, 1 + p.Y * 0.4));
			const sq = me ? you.sq : p.Y < -0.25 ? 1 : 0;
			const H = 0.42 * tall * (1 - sq * 0.38), lift = me ? youJump() * 0.5 : 0, X = p.X, Z = p.Z;
			// its shadow, and your ring
			const sh = (r) => { ctx.beginPath(); for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2, [x, y] = cam.p(X + Math.cos(a) * r, 0, Z + Math.sin(a) * r); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
			sh(0.11 + lift * 0.1); ctx.fillStyle = `rgba(0, 0, 10, ${0.45 - lift * 0.4})`; ctx.fill();
			if (me) { sh(0.13); ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
			// the lathed body: stacked rings, shaded across
			const [bx] = cam.p(X, 0, Z), [ex] = cam.p(X + 0.09, 0, Z), rx0 = ex - bx;
			const grad = ctx.createLinearGradient(bx - rx0, 0, bx + rx0, 0);
			grad.addColorStop(0, shade(col, -0.45)); grad.addColorStop(0.62, shade(col, 0.25)); grad.addColorStop(1, shade(col, -0.2));
			ctx.fillStyle = grad;
			for (let f = 0; f <= 0.78; f += 0.025) {
				const y = lift + f * H, r = lathe(f), [cx, cy] = cam.p(X, y, Z), [rx] = cam.p(X + r, y, Z), [, ny] = cam.p(X, y, Z - r), [, fy] = cam.p(X, y, Z + r);
				ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, rx - cx), Math.max(0.3, Math.abs(ny - fy) / 2), 0, 0, Math.PI * 2); ctx.fill();
			}
			// the head: a ball, with its centre marked
			const hy = lift + H * 0.88, hr = 0.06 * Math.min(1.1, tall), [hx, hyS] = cam.p(X, hy, Z), [hrx] = cam.p(X + hr, hy, Z), R = hrx - hx;
			const hg = ctx.createRadialGradient(hx - R * 0.3, hyS - R * 0.35, R * 0.1, hx, hyS, R);
			hg.addColorStop(0, shade(col, 0.55)); hg.addColorStop(0.6, col); hg.addColorStop(1, shade(col, -0.4));
			ctx.beginPath(); ctx.arc(hx, hyS, R, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
			heads.push({ i, me, col, X, Z, hy, hx, hyS, R, g: p.gaze, tag: me ? 'YOU' : 'P' + (i + 1), top: hyS - R });
		}
		// gazes: the line on the head the way it faces, a target on the wall, and (only while
		// the gaze is moving, and a moment after) dots from one to the other
		const now = performance.now() / 1000;
		for (const h of heads) {
			if (h.g) {
				const T = gazePoint(h.g), [tx, ty] = cam.p(...T);
				const d = Math.hypot(tx - h.hx, ty - h.hyS) || 1, ux = (tx - h.hx) / d, uy = (ty - h.hyS) / d;
				const gz = gazeSeen[h.i] || (gazeSeen[h.i] = { x: tx, y: ty, t: -9 });
				if (Math.hypot(tx - gz.x, ty - gz.y) > 0.6) gz.t = now;
				gz.x = tx; gz.y = ty;
				// (the dots only while it moves; the target always, faint when still)
				const base = h.me ? 0.95 : 0.5, fade = Math.max(0, Math.min(1, 1 - (now - gz.t - 1) / 0.5));
				ctx.globalAlpha = base * fade;
				ctx.beginPath(); ctx.moveTo(h.hx + ux * h.R, h.hyS + uy * h.R); ctx.lineTo(tx, ty);
				ctx.setLineDash([1.5, 3]); ctx.strokeStyle = h.col; ctx.lineWidth = h.me ? 1.5 : 1; ctx.stroke(); ctx.setLineDash([]);
				ctx.globalAlpha = base * (0.3 + 0.7 * fade);
				ctx.beginPath(); ctx.arc(tx, ty, h.me ? 4.5 : 3.5, 0, Math.PI * 2); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(tx - 2, ty); ctx.lineTo(tx + 2, ty); ctx.moveTo(tx, ty - 2); ctx.lineTo(tx, ty + 2); ctx.stroke();
				ctx.globalAlpha = 1;
				ctx.beginPath(); ctx.moveTo(h.hx, h.hyS); ctx.lineTo(h.hx + ux * h.R * 0.95, h.hyS + uy * h.R * 0.95);
				ctx.strokeStyle = 'rgba(10, 10, 25, 0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
			}
			ctx.beginPath(); ctx.arc(h.hx, h.hyS, 1.3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(10, 10, 25, 0.9)'; ctx.fill();
			ctx.lineWidth = 1;
		}
		// their names, over their heads
		ctx.font = '700 8px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		for (const h of heads) {
			const w = ctx.measureText(h.tag).width + 7, y = h.top - 7;
			ctx.globalAlpha = h.me ? 1 : 0.75;
			ctx.beginPath(); ctx.roundRect(h.hx - w / 2, y - 5.5, w, 11, 5.5); ctx.fillStyle = h.col; ctx.fill();
			if (h.me) { ctx.strokeStyle = 'white'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 1; }
			ctx.fillStyle = 'white'; ctx.fillText(h.tag, h.hx, y + 0.5);
			ctx.globalAlpha = 1;
		}
	}

	function select(n) {
		if (n >= -1 && n < CONTROLLABLE && n !== selected) {
			selected = n;
			you.goal = null; you.pendingTouch = null; you.sq = 0; you.jumpT = -1;
			if (n >= 0) { $(slot(n)).stop(true); }
		}
		hud();
		drawSimulator();
	}

	// Build the simulator inside $parent. Side order: left wall, front wall,
	// right wall, floor. Coordinates come from the mouse position over each side.
	function mountSimulator($parent) {
		$simulator = $(`
			<gamebox-simulator>
				<gamebox-view><canvas></canvas></gamebox-view>
				<gamebox-panel>
					<gamebox-player></gamebox-player>
					<button btn=move>Shuffle the others</button>
					<gamebox-pips>${COLS.map((c, i) => `<button pip=${i} style="--c:${c}" title="Drive player ${i + 1}"></button>`).join('')}</gamebox-pips>
					<gamebox-hint>
						<span><kbd k=w>W</kbd><kbd k=a>A</kbd><kbd k=s>S</kbd><kbd k=d>D</kbd></span><span>WALK</span>
						<span><kbd k=floor class=mouse>MOUSE ON FLOOR</kbd></span><span>MOVE THERE</span>
						<span><kbd k=shift>SHIFT</kbd></span><span>SQUAT</span>
						<span><kbd k=space>SPACE</kbd></span><span>JUMP</span>
						<span><kbd k=q>Q</kbd><kbd k=e>E</kbd></span><span>SHORTER / TALLER</span>
						<span><kbd k=wall class=mouse>POINT AT WALL</kbd></span><span>LOOK</span>
						<span><kbd k=click class=mouse>CLICK WALL</kbd></span><span>TOUCH IT</span>
						<span><kbd k=tab>TAB</kbd><kbd k=num>1–6</kbd></span><span>PICK A PLAYER</span>
					</gamebox-hint>
				</gamebox-panel>
			</gamebox-simulator>
		`).appendTo($parent);

		const canvas = $simulator.find('canvas')[0], dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = SIM.w * dpr; canvas.height = SIM.h * dpr;
		canvas.style.width = SIM.w + 'px'; canvas.style.height = SIM.h + 'px';
		ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);
		const under = (e) => { if (sim3) return sim3.pick(e); const r = canvas.getBoundingClientRect(); return cam.pick((e.clientX - r.left) / r.width * SIM.w, (e.clientY - r.top) / r.height * SIM.h); };
		const view = $simulator.find('gamebox-view')[0];
		import(new URL('../lib/three/three.module.min.js', SCRIPT_URL).href).then((THREE) => {
			try { sim3 = make3D(THREE, view); canvas.style.display = 'none'; } catch (err) { console.warn('simulator: no 3D', err); sim3 = null; }
		}, (err) => console.warn('simulator: no three.js', err));
		$(view).on('mousemove', function (e) {
			const h = under(e);
			SIM.hover = h ? h.wall : -1;
			view.style.cursor = !h ? 'default' : h.wall === 3 ? 'pointer' : 'crosshair';
			if (!h || selected < 0) return;
			blinkKey(h.wall < 3 ? 'wall' : 'floor', 300);
			if (h.wall < 3) {   // (over a wall: look there)
				const t = simTarget(selected);
				t.X = h.wall === 0 ? -1 : h.wall === 2 ? 1 : h.X;
				t.Z = h.wall === 1 ? 1 : h.Z;
				t.Y = h.y / HR * 2 - 1;
				return;
			}
			const p = slot(selected);   // (over the floor: straight there)
			$(p).stop(true); you.goal = null; you.pendingTouch = null;
			p.X = h.X; p.Z = h.Z;
		});
		$(view).on('mouseleave', () => { SIM.hover = -1; });
		$(view).on('click', function (e) {
			const h = under(e);
			if (!h || selected < 0) return;
			e.stopPropagation();
			if (h.wall === 3) { you.goal = { X: h.X, Z: h.Z }; you.pendingTouch = null; return; }
			blinkKey('click', 300);
			// (u across the wall as you face it from inside, v down from its top)
			touch({ wall: h.wall, u: h.wall === 1 ? (h.X + 1) / 2 : h.wall === 0 ? (h.Z + 1) / 2 : (1 - h.Z) / 2, v: 1 - h.y / HR });
		});

		$simulator.find('[btn=move]').on('click', randomMove);
		$simulator.on('click', '[pip]', function (e) { e.stopPropagation(); const n = +this.getAttribute('pip'); select(n === selected ? -1 : n); });

		$(document).on('keydown', function (e) {
			if (!simOn() || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
			const k = e.key.toLowerCase();
			const lk = KEY_OF[k] || (/^[1-6]$/.test(k) ? 'num' : k);
			if (['w', 'a', 's', 'd', 'shift', 'space'].includes(lk)) lightKey(lk, true); else blinkKey(lk);
			if (k === ' ') { if (selected >= 0 && you.jumpT < 0) you.jumpT = 0; e.preventDefault(); return; }
			if (k === 'tab') { select(selected + 1 >= CONTROLLABLE ? -1 : selected + 1); e.preventDefault(); return; }
			if (k === '0') { select(-1); return; }
			if (/^[1-6]$/.test(k)) { select(+k - 1); return; }
			if (k === 'q' || k === 'e') {
				const n = Math.max(0, Math.min(HEIGHTS.length - 1, HEIGHTS.indexOf(you.cm) + (k === 'q' ? -1 : 1)));
				you.cm = HEIGHTS[n]; flash(you.cm + ' CM'); hud(); return;
			}
			if (k === 'h') { you.help = !you.help; hud(); return; }
			keys.add(k);
			if (k === 'shift' || k === 'c') hud();
			if (k.startsWith('arrow')) e.preventDefault();
		});
		$(document).on('keyup', function (e) {
			const k = e.key.toLowerCase();
			const lk = KEY_OF[k] || k;
			if (['w', 'a', 's', 'd', 'shift', 'space'].includes(lk) && !(lk === 'shift' && keys.has('c')) && !Object.keys(KEY_OF).some((o) => KEY_OF[o] === lk && o !== k && keys.has(o))) lightKey(lk, false);
			keys.delete(k);
			if (k === 'shift' || k === 'c') hud();
		});
		$(window).on('blur', () => { keys.clear(); if ($simulator) $simulator.find('kbd.lit').removeClass('lit'); });

		select(selected);
	}

	function startSimulator() {
		randomMove();
		debugInterval = setInterval(stepDebug, 1000 / DEBUG_RATE);
	}

	/* ---------- the real thing ---------- */

	function connectVuplex() {
		clearInterval(debugInterval);
		if ($simulator) $simulator.hide();
		keys.clear();
		window.vuplex.postMessage({ type: 'greeting', message: 'Hello from JavaScript!' });
		window.vuplex.addEventListener('message', function (e) { receive(e.data); });
	}

	function start($simulatorParent) {
		for (let i = 0; i < SLOTS; i++) makeMetrics(slot(i));
		mountSimulator($simulatorParent);
		startSimulator();
		if (window.vuplex) connectVuplex();
		else window.addEventListener('vuplexready', connectVuplex);
	}

	// Handy from the console: IGB.players.receive('[{"X":0,"Y":0,"Z":0}]|')
	window.forceMessage = receive;

	return {
		list: players,
		wand,
		gaze: GAZE,   // (the gaze settings: adjust from the console to check them in the gamebox)
		wallHit,
		rotate,
		start,
		receive,
		onUpdate,
		randomMove,
		select,
		get selected() { return selected; },
		get live() { return !!window.vuplex; },
	};
})();
