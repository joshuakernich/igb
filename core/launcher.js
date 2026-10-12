/*
 * The launcher: the menu of prototypes, and the frame a game runs in.
 *
 *   index.html                    the menu
 *   index.html#coconut-climbers   straight into a game
 *   index.html?coconut-climbers   the same (an old display name such as
 *                                 ?Coconut%20Climbers works too)
 *
 * Games switch in place: the running game is stopped through its stage
 * (timers, sounds and DOM go with it) and the next one starts. Links use
 * #id rather than reloading, so it also works inside a published artifact,
 * whose frame never sees the query string.
 */
$(function () {

	const $igb = $('igb');
	const $world = $('igb-world');
	const $menu = $('igb-menu');
	const $log = $('igb-log');

	let game;          // the running game
	let gameKey;       // its id, for the restart button
	let starting = 0;  // bumped on every switch, so a slow load can't land late

	/* ---------- scaling ---------- */

	function resize() {
		const scale = window.innerWidth / IGB.WIDTH;
		$igb.css({ height: IGB.H * scale + 'px' });
		$world.css({ transform: `scale(${scale})` });
		IGB.setScale(scale);
	}
	$(window).on('resize', resize);
	resize();

	/* ---------- logging ---------- */

	const lines = [];
	function log(...args) {
		lines.unshift(args.join(' '));
		lines.length = Math.min(lines.length, 10);
		$log.html(lines.join('<br>'));
	}
	IGB.log = log;

	/* ---------- menu ---------- */

	function buildMenu() {
		// IGB.menu (games/manifest.js), when set, lists the only games shown;
		// the rest stay playable by #id but are left off the menu.
		const shown = (entry) => !IGB.menu || IGB.menu.includes(entry.id);
		for (const folder of IGB.manifest) {
			const games = folder.games.filter(shown);
			if (!games.length) continue;
			const $folder = $('<igb-folder>').appendTo($menu);
			$('<h1>').text(folder.folder).appendTo($folder);
			for (const entry of games) {
				const $app = $('<a class="app">').attr('href', '#' + entry.id).appendTo($folder);
				const $icon = $('<igb-icon>').appendTo($app);
				if (entry.icon) $icon.css('background-image', `url("${entry.icon}")`);
				else $icon.text(entry.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2));
				$('<igb-label>').text(entry.name).appendTo($app);
			}
		}
	}

	function showMenu() {
		stopGame();
		starting++;
		document.title = 'IGB Prototypes';
		$igb.addClass('home');
		$menu.show();
	}

	/* ---------- running a game ---------- */

	function stopGame() {
		if (game) IGB.stop(game);
		game = undefined;
		gameKey = undefined;
		IGB.current = undefined;
	}

	async function launch(key) {
		const entry = IGB.find(key);
		if (!entry) {
			log(`No game called "${key}"`);
			showMenu();
			return;
		}
		stopGame();
		const token = ++starting;
		$menu.hide();
		$igb.removeClass('home');
		document.title = entry.name + ' · IGB';
		try {
			const started = await IGB.start(entry.id, $world, undefined);
			if (token !== starting) { IGB.stop(started); return; }   // switched away while it loaded
			game = started;
			gameKey = entry.id;
			IGB.current = game;   // for poking at from the console
			log(entry.name);
		} catch (err) {
			console.error(err);
			log('Could not start ' + entry.name + ': ' + err.message);
		}
	}

	IGB.players.onUpdate(function (players) {
		if (game && game.setPlayers) game.setPlayers(players);
	});

	// A game played on its own just reports its rewards.
	IGB.handleComplete(function (rewards) {
		console.log('Game complete, rewards:', rewards);
		log('Complete. Rewards: ' + (rewards || []).join(', '));
	});

	/* ---------- routing ---------- */

	function route(key) {
		if (key) launch(key);
		else showMenu();
	}

	window.addEventListener('hashchange', function () {
		route(decodeURIComponent(window.location.hash.slice(1)));
	});

	/* ---------- chrome ---------- */

	$('[btn=home]').on('click', function () {
		if (window.location.hash) window.location.hash = '';   // hashchange shows the menu
		else showMenu();
	});
	$('[btn=refresh]').on('click', function () {
		if (gameKey) launch(gameKey);
	});

	// A ripple wherever you click, so touches show up on recordings.
	$(document).on('click', function (e) {
		$('<igb-ripple>').appendTo('body').css({ left: e.pageX, top: e.pageY })
			.animate({ width: '5vw', height: '5vw', opacity: 0 }, 500, function () { $(this).remove(); });
	});

	/* ---------- go ---------- */

	IGB.players.start($('igb-simulator'));
	log('Vuplex is ' + (window.vuplex ? 'ready' : 'not ready'));

	// The seams between the walls, over every game; gone in the real gamebox.
	for (const x of [IGB.W, 2 * IGB.W]) $('<igb-seam>').css({ left: x + 'px' }).appendTo($world);
	const inBox = () => $igb.toggleClass('vuplex', !!window.vuplex);
	inBox();
	window.addEventListener('vuplexready', inBox);

	buildMenu();

	const first = decodeURIComponent(window.location.hash.slice(1))
		|| decodeURIComponent(window.location.search.slice(1).split('&')[0]);
	route(first);
});
