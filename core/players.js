/*
 * IGB.players — where the players are.
 *
 * In the gamebox the tracking system sends positions through Vuplex. At a
 * desk, the little gamebox simulator under the stage stands in for it: move
 * the mouse over a wall or the floor to move the selected player, click a
 * wall to "touch" it, press 1-6 to pick which player the mouse controls.
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
 *
 * Subscribe with IGB.players.onUpdate(fn); fn(players) runs on every update.
 */
IGB.players = (function () {

	const SLOTS = 7;       // the tracker can report up to seven people
	const CONTROLLABLE = 6;
	const DEBUG_RATE = 20; // simulated updates per second

	const players = [];
	const listeners = [];

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

	// A tracking message: "<json array of {X,Y,Z}>|<extra>".
	function receive(str) {
		const data = JSON.parse(String(str).split('|')[0]);
		for (let i = 0; i < data.length; i++) {
			const p = slot(i);
			p.X = data[i].X;
			p.Y = data[i].Y;
			p.Z = data[i].Z;
			makeMetrics(p);
		}
		drawSimulator();
		for (const fn of listeners) fn(players);
	}

	function onUpdate(fn) {
		listeners.push(fn);
	}

	/* ---------- the desk simulator ---------- */

	function randomMove() {
		for (let i = 0; i < SLOTS; i++) {
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
		for (const p of players) {
			p.X = Math.max(-0.8, Math.min(0.8, p.X));
			p.Y = Math.max(-0.4, Math.min(0.6, p.Y));
			p.Z = Math.max(-0.8, Math.min(0.8, p.Z));
		}
		receive(JSON.stringify(players) + '|Front,0,0,None');
	}

	function drawSimulator() {
		if (!$simulator) return;
		const $avatars = $simulator.find('gamebox-avatar');
		players.forEach(function (p, i) {
			if (p.px === undefined) return;
			$avatars.eq(i).css({ left: p.px * 100 + '%', top: p.pz * 100 + '%' })
				.toggleClass('selected', i === selected)
				.find('gamebox-human').css({ height: (1 - p.py) * 100 + 'px' });
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
					<gamebox-hint>Keys 1–6 pick a player · click a wall to touch it</gamebox-hint>
				</gamebox-panel>
			</gamebox-simulator>
		`).appendTo($parent);

		const $floor = $simulator.find('gamebox-side.floor');
		for (let i = 0; i < SLOTS; i++) {
			$('<gamebox-avatar><gamebox-human></gamebox-human></gamebox-avatar>').attr('n', i).appendTo($floor);
		}

		const $sides = $simulator.find('gamebox-side');
		$sides.on('mousemove', function (e) {
			const wall = parseInt($(this).attr('wall'), 10);
			const w = this.offsetWidth;
			const h = this.offsetHeight;
			const x = e.offsetX / (w / 2) - 1;
			const y = e.offsetY / (h / 2) - 1;
			const p = slot(selected);
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
		start,
		receive,
		onUpdate,
		randomMove,
		select,
		get selected() { return selected; },
		get live() { return !!window.vuplex; },
	};
})();
