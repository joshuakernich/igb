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

	const SLOTS = 7;       // the tracker can report up to seven people
	const CONTROLLABLE = 6;
	const DEBUG_RATE = 20; // simulated updates per second

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
			p.X = Math.max(-0.95, Math.min(0.95, p.X));
			p.Y = i === selected ? Math.max(-1, Math.min(1, p.Y)) : Math.max(-0.4, Math.min(0.6, p.Y));
			p.Z = Math.max(-0.95, Math.min(0.95, p.Z));
			const t = simTarget(i);
			const q = lookRotation({ x: (t.X - p.X) * GAZE.room.x, y: (t.Y - p.Y) * GAZE.room.y, z: (t.Z - p.Z) * GAZE.room.z });
			out.push({ Id: i, X: p.X, Y: p.Y, Z: p.Z, rW: q.w, rX: q.x, rY: q.y, rZ: q.z });
		}
		out.push({ Id: 0, X: 0, Y: -0.2, Z: -0.5, rW: 1, rX: 0, rY: 0, rZ: 0 });   // (the wand, held still)
		receive(JSON.stringify(out) + '|Front,0,0,None');
		drawYou();
	}

	// the little box's view of you: a walking target, and the panel
	function drawYou() {
		if (!$simulator) return;
		const $goal = $simulator.find('gamebox-goal');
		if (you.goal && selected >= 0) $goal.show().css({ left: (you.goal.X + 1) / 2 * 100 + '%', top: (you.goal.Z + 1) / 2 * 100 + '%' }).attr('n', selected);
		else $goal.hide();
	}
	function hud() {
		if (!$simulator) return;
		const state = you.sq > 0.5 ? ' · squatting' : you.jumpT >= 0 ? ' · jumping' : '';
		$simulator.find('gamebox-player').attr('n', selected < 0 ? null : selected).html(selected < 0 ? 'Watching <span>Tab or 1–6 to drive a player</span>'
			: `<b>You are P${selected + 1}</b> <span>${you.cm} cm${state}</span>`);
		$simulator.find('gamebox-hint').toggle(you.help);
	}

	function drawSimulator() {
		if (!$simulator) return;
		const $avatars = $simulator.find('gamebox-avatar');
		players.forEach(function (p, i) {
			if (p.px === undefined || i >= CONTROLLABLE) { $avatars.eq(i).hide(); return; }
			// (a little person: their height, squatting or jumping; the one you drive from your own settings)
			const me = i === selected, $a = $avatars.eq(i);
			const tall = me ? you.cm / 170 : Math.max(0.7, Math.min(1.25, 1 + p.Y * 0.5));
			const squat = me ? you.sq > 0.5 : p.Y < -0.25;
			const lift = me ? youJump() * 60 : 0;
			$a.css({ left: p.px * 100 + '%', top: p.pz * 100 + '%' }).toggleClass('selected', me);
			$a.find('gamebox-human').toggleClass('squat', squat).css({ height: 60 * tall + 'px', width: 24 * tall + 'px', left: -12 * tall + 'px', transform: `rotateX(90deg) translateY(${-lift}px)` });
			$a.find('gamebox-tag').text(me ? 'YOU' : 'P' + (i + 1));
			// where they're looking, on the simulator's walls (its side walls run the other way across)
			const g = p.gaze, $dot = $simulator.find('gamebox-gaze[n=' + i + ']');   // (by its player: moving between walls reorders them)
			if (!g || i >= CONTROLLABLE) { $dot.hide(); return; }
			const sx = g.wall === 1 ? g.px : 1 - g.px;
			const $side = $simulator.find('gamebox-side[wall=' + g.wall + ']');
			if ($dot.parent()[0] !== $side[0]) $dot.appendTo($side);   // (only when it changes wall: moving it every update flickers)
			$dot.show().css({ left: sx * 100 + '%', top: g.py * 100 + '%' });
		});
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
				<gamebox-box>
					<gamebox-side wall=0></gamebox-side>
					<gamebox-side wall=1></gamebox-side>
					<gamebox-side wall=2></gamebox-side>
					<gamebox-side wall=3 class=floor></gamebox-side>
				</gamebox-box>
				<gamebox-panel>
					<gamebox-player></gamebox-player>
					<button btn=move>Shuffle the others</button>
					<gamebox-hint>
						<span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>walk</span>
						<span><kbd class=mouse>mouse on floor</kbd></span><span>move there</span>
						<span><kbd>Shift</kbd></span><span>squat</span>
						<span><kbd>Space</kbd></span><span>jump</span>
						<span><kbd>Q</kbd><kbd>E</kbd></span><span>shorter / taller</span>
						<span><kbd class=mouse>point at wall</kbd></span><span>look</span>
						<span><kbd class=mouse>click wall</kbd></span><span>touch it</span>
						<span><kbd>Tab</kbd><kbd>1–6</kbd></span><span>pick a player</span>
						<span><kbd>0</kbd></span><span>just watch</span>
						<span><kbd>H</kbd></span><span>hide this</span>
					</gamebox-hint>
				</gamebox-panel>
			</gamebox-simulator>
		`).appendTo($parent);

		const $floor = $simulator.find('gamebox-side.floor');
		for (let i = 0; i < SLOTS; i++) {
			$('<gamebox-avatar><gamebox-human><gamebox-body></gamebox-body><gamebox-tag></gamebox-tag></gamebox-human></gamebox-avatar>').attr('n', i).appendTo($floor);
			$('<gamebox-gaze>').attr('n', i).hide().appendTo($floor);
		}
		$('<gamebox-goal>').hide().appendTo($floor);

		const $sides = $simulator.find('gamebox-side');
		const at = (el, e) => ({ wall: parseInt($(el).attr('wall'), 10), fx: e.offsetX / el.offsetWidth, fy: e.offsetY / el.offsetHeight });
		$sides.on('mousemove', function (e) {
			if (selected < 0) return;
			const { wall, fx, fy } = at(this, e), x = fx * 2 - 1, y = fy * 2 - 1;
			if (wall < 3) {   // (over a wall: look there)
				const t = simTarget(selected);
				if (wall === 0) { t.X = -1; t.Z = -x; }
				if (wall === 1) { t.Z = 1; t.X = x; }
				if (wall === 2) { t.X = 1; t.Z = x; }
				t.Y = -y;
				return;
			}
			{   // (over the floor: straight there)
				const p = slot(selected);
				$(p).stop(true); you.goal = null; you.pendingTouch = null;
				p.X = x; p.Z = y;
			}
		});
		$sides.on('click', function (e) {
			if (selected < 0) return;
			e.stopPropagation();
			const { wall, fx, fy } = at(this, e);
			if (wall === 3) { you.goal = { X: fx * 2 - 1, Z: fy * 2 - 1 }; you.pendingTouch = null; return; }
			touch({ wall, u: wall === 1 ? fx : 1 - fx, v: fy });   // (the side walls run the other way across, seen from inside)
		});

		$simulator.find('[btn=move]').on('click', randomMove);

		$(document).on('keydown', function (e) {
			if (!simOn() || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
			const k = e.key.toLowerCase();
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
			keys.delete(k);
			if (k === 'shift' || k === 'c') hud();
		});
		$(window).on('blur', () => keys.clear());

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
