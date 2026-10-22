/*
 * IGB.players — where the players are.
 *
 * In the gamebox the tracking system sends positions through Vuplex. At a
 * desk, the little gamebox simulator under the stage stands in for it: the
 * mouse over a wall points the selected player's gaze there, over the floor
 * moves them (shift over a wall moves them up and down it too), a click on a
 * wall "touches" it, and 1-6 pick which player the mouse controls.
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
	function wallHit(X, Y, Z, look) {
		if (!look) return null;
		// (into the squashed -1..1 space the positions live in)
		const dx = look.x / GAZE.room.x, dy = look.y / GAZE.room.y, dz = look.z / GAZE.room.z;
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
			const p = slot(i);
			$(p).stop(true).animate({
				X: -0.9 + Math.random() * 1.8,
				Z: -0.9 + Math.random() * 1.8,
				Y: -0.3 + Math.random() * 0.6,
				wall: 1,
			});
		}
	}

	function stepDebug() {
		const out = [];
		for (let i = 0; i < CONTROLLABLE; i++) {
			const p = slot(i);
			p.X = Math.max(-0.8, Math.min(0.8, p.X));
			p.Y = Math.max(-0.4, Math.min(0.6, p.Y));
			p.Z = Math.max(-0.8, Math.min(0.8, p.Z));
			const t = simTarget(i);
			const q = lookRotation({ x: (t.X - p.X) * GAZE.room.x, y: (t.Y - p.Y) * GAZE.room.y, z: (t.Z - p.Z) * GAZE.room.z });
			out.push({ Id: i, X: p.X, Y: p.Y, Z: p.Z, rW: q.w, rX: q.x, rY: q.y, rZ: q.z });
		}
		out.push({ Id: 0, X: 0, Y: -0.2, Z: -0.5, rW: 1, rX: 0, rY: 0, rZ: 0 });   // (the wand, held still)
		receive(JSON.stringify(out) + '|Front,0,0,None');
	}

	function drawSimulator() {
		if (!$simulator) return;
		const $avatars = $simulator.find('gamebox-avatar');
		const $dots = $simulator.find('gamebox-gaze');
		players.forEach(function (p, i) {
			if (p.px === undefined) return;
			$avatars.eq(i).css({ left: p.px * 100 + '%', top: p.pz * 100 + '%' })
				.toggleClass('selected', i === selected)
				.find('gamebox-human').css({ height: (1 - p.py) * 100 + 'px' });
			// where they're looking, on the simulator's walls (its side walls run the other way across)
			const g = p.gaze, $dot = $dots.eq(i);
			if (!g || i >= CONTROLLABLE) { $dot.hide(); return; }
			const sx = g.wall === 1 ? g.px : 1 - g.px;
			$dot.show().appendTo($simulator.find('gamebox-side[wall=' + g.wall + ']')).css({ left: sx * 100 + '%', top: g.py * 100 + '%' });
		});
	}

	function select(n) {
		if (n >= 0 && n < CONTROLLABLE) selected = n;
		if ($simulator) $simulator.find('gamebox-player').text('Mouse moves player ' + (selected + 1));
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
					<button btn=move>Random move</button>
					<gamebox-hint>Keys 1–6 pick a player · mouse over a wall points their gaze, over the floor moves them (shift over a wall: moves them too) · click a wall to touch it</gamebox-hint>
				</gamebox-panel>
			</gamebox-simulator>
		`).appendTo($parent);

		const $floor = $simulator.find('gamebox-side.floor');
		for (let i = 0; i < SLOTS; i++) {
			$('<gamebox-avatar><gamebox-human></gamebox-human></gamebox-avatar>').attr('n', i).appendTo($floor);
			$('<gamebox-gaze>').attr('n', i).hide().appendTo($floor);
		}

		const $sides = $simulator.find('gamebox-side');
		$sides.on('mousemove', function (e) {
			const wall = parseInt($(this).attr('wall'), 10);
			const w = this.offsetWidth;
			const h = this.offsetHeight;
			const x = e.offsetX / (w / 2) - 1;
			const y = e.offsetY / (h / 2) - 1;
			const p = slot(selected);
			// (over a wall: point their gaze there; shift held, move them instead)
			if (!e.shiftKey && wall < 3) {
				const t = simTarget(selected);
				if (wall === 0) { t.X = -1; t.Z = -x; }
				if (wall === 1) { t.Z = 1; t.X = x; }
				if (wall === 2) { t.X = 1; t.Z = x; }
				t.Y = -y;
				return;
			}
			$(p).stop(true);
			if (wall === 0) { p.Z = -x; p.Y = -y; }
			if (wall === 1) { p.X = x; p.Y = -y; }
			if (wall === 2) { p.Z = x; p.Y = -y; }
			if (wall === 3) { p.X = x; p.Z = y; }
		});
		$sides.on('click', function () {
			const wall = parseInt($(this).attr('wall'), 10);
			const p = slot(selected);
			p.wall = wall;
			p.wallChange = wall;
		});

		$simulator.find('[btn=move]').on('click', randomMove);

		$(document).on('keydown', function (e) {
			if (e.target.tagName === 'INPUT') return;
			const n = parseInt(e.key, 10) - 1;
			if (n >= 0 && n < CONTROLLABLE) select(n);
		});

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
		start,
		receive,
		onUpdate,
		randomMove,
		select,
		get selected() { return selected; },
		get live() { return !!window.vuplex; },
	};
})();
