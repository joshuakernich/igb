/*
 * Every prototype, grouped into the menu's folders.
 *
 *   id     the game's file is games/<id>.js and its assets are in assets/<id>/
 *   name   shown in the menu
 *   icon   menu icon (optional; initials otherwise)
 *   file   only when the file is named differently (two games sharing one file)
 *   css    true to load games/<id>.css too (most games draw on canvas and need none)
 *   libs   optional libraries: 'matter', 'quaternion'
 *   box    how the game's mystery box looks in Box Party:
 *          { color, bg (a CSS background), note, name (to override the label) }
 *
 * To add a prototype: copy games/_template.js to games/<id>.js and add an
 * entry here.
 */
IGB.manifest = [

	{ folder: 'New', games: [
		{ id: 'red-light-green-light', name: 'Red Light Green Light', icon: 'assets/icons/red-light-green-light.png',
			file: 'games/red-light-green-light/index.js', module: true,
			title: { lines: [{ text: 'RED LIGHT', fill: '#ff3640', glow: '#ff3640' }, { text: 'GREEN LIGHT', fill: '#27d96b', glow: '#27d96b' }] }, box: { color: '#e5287a', bg: '#1d7a63', note: 'SURVIVAL' } },
		{ id: 'loop-island', name: 'Sonic Dash', icon: 'assets/icons/sonic-dash.png', file: 'games/loop-island/index.js', module: true,
			title: { lines: [{ text: 'SONIC', fill: '#2f7cf0', glow: '#3cd6ff', font: 'Nise Sega Sonic' }, { text: 'DASH', fill: '#ff3d3d', glow: '#ff7a3d', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ffe14a', bg: '#2f7cf0', note: 'SPEED' } },
		{ id: 'twin-tail-tower', name: 'Twin Tail Tower', icon: 'assets/icons/twin-tail-tower.svg', file: 'games/twin-tail-tower/index.js', module: true,
			title: { lines: [{ text: 'TWIN TAIL', fill: '#ff9a2b', glow: '#ffd23f' }, { text: 'TOWER', fill: '#3ad1ff', glow: '#5a8dff' }] }, box: { color: '#ff9a2b', bg: '#5fb8ff', note: 'CLIMB' } },
		{ id: 'iron-stride', name: 'Iron Stride', file: 'games/iron-stride/index.js', module: true,
			title: { lines: [{ text: 'IRON', fill: '#ff3b30', glow: '#e23a2e' }, { text: 'STRIDE', fill: '#ffd23f', glow: '#ff7a3d' }] }, box: { color: '#e23a2e', bg: '#16171b', note: 'MECH' } },
		{ id: 'mingle', name: 'Mingle', icon: 'assets/icons/mingle.png', file: 'games/mingle/index.js', module: true,
			title: { lines: [{ text: 'MINGLE', fill: '#ff7eb6', glow: '#e5287a' }] }, box: { color: '#e5287a', bg: '#f3a6c8', note: 'SURVIVAL' } },
		{ id: 'tether-net', name: 'Tether Net',
			box: { color: '#ff6a2b', bg: '#2b2f4a', note: 'TEAMWORK' } },
		{ id: 'glass-bridge', name: 'Glass Bridge', file: 'games/glass-bridge/index.js', module: true,
			box: { color: '#e5287a', bg: '#10131c', note: 'SURVIVAL' } },
		{ id: 'tug-of-war', name: 'Tug of War', file: 'games/tug-of-war/index.js', module: true,
			box: { color: '#e5287a', bg: '#1d7a63', note: 'TEAMS' } },
		{ id: 'floor-is-lava', name: 'Floor Is Lava',
			box: { color: '#ff4a1c', bg: '#3a1408', note: 'SURVIVAL' } },
		{ id: 'lava-couch', name: 'Lava Couch',
			box: { color: '#ff4a1c', bg: '#5a2a7a', note: 'TEAMWORK' } },
		{ id: 'honmoon', name: 'Honmoon',
			box: { color: '#ffcf3f', bg: '#1a0f3a', note: 'DEFEND' } },
		{ id: 'golden', name: 'Golden',
			box: { color: '#ffcf3f', bg: '#ff4fa8', note: 'RHYTHM' } },
		{ id: 'roll-call', name: 'Roll Call', icon: 'assets/icons/roll-call.png',
			title: { lines: [{ text: 'ROLL CALL', fill: '#a77bff', glow: '#7538D4' }] }, box: { color: '#7538D4', bg: '#f2f0ff', note: 'ICEBREAKER' } },
		{ id: 'backrooms', name: 'Backrooms', icon: 'assets/icons/backrooms.png', file: 'games/backrooms/index.js', module: true,
			title: { lines: [{ text: 'BACKROOMS', fill: '#f2dc5d', glow: '#c9a227' }] }, box: { color: '#d9c56a', bg: '#3a3418', note: 'MEMORY' } },
		{ id: 'gwi-ma-showdown', name: 'Gwi-Ma Showdown', icon: 'assets/icons/gwi-ma-showdown.png',
			title: { lines: [{ text: 'GWI-MA', fill: '#ff4fd8', glow: '#ff3d7a' }, { text: 'SHOWDOWN', fill: '#ffe14d', glow: '#ff7a3d' }] }, box: { color: '#ff3df0', bg: '#12051f', note: 'BOSS' } },
		{ id: 'echo', name: 'Echo',
			box: { color: '#3ad1ff', bg: '#0b1630', note: 'DODGE' } },
		{ id: 'show-debug', name: 'UX Demo', icon: 'assets/icons/ux-demo.svg', file: 'games/show-debug.js', module: true,
			title: { lines: [{ text: 'UX', fill: '#3ad1ff', glow: '#5a4dff' }, { text: 'DEMO', fill: '#ffd23f', glow: '#ff7a3d' }] }, box: { color: '#3ad1ff', bg: '#0b1022', note: 'DEMO' } },
		{ id: 'template', name: 'Template', file: 'games/_template.js' },
	] },

	{ folder: 'Experiments', games: [
		{ id: 'minecraft', name: 'Minecraft' },
		{ id: 'life', name: 'Life' },
		{ id: 'ball-spin', name: 'Ball Spin' },
		{ id: 'dance-mat', name: 'Dance Mat' },
	] },

	{ folder: 'Box Party Metagame', games: [
		{ id: 'box-party', name: 'Box Party', icon: 'assets/icons/box-party.png', css: true },
		{ id: 'name-entry', name: 'Name Entry', icon: 'assets/icons/name-entry.png', css: true },
		{ id: 'minigame-score', name: 'Minigame Score' },
	] },

	{ folder: 'Easy Start', games: [
		{ id: 'coconut-climbers', name: 'Coconut Climbers', icon: 'assets/icons/coconut-climbers.png',
			box: { color: 'white', bg: 'url(assets/box-party/cube-coconut.png) center / cover', note: 'HIGH ENERGY' } },
		{ id: 'mystery-maze', name: 'Mystery Maze', icon: 'assets/icons/mystery-maze.png',
			box: { color: 'white', bg: 'url(assets/box-party/cube-mystery.png) center / cover' } },
	] },

	{ folder: 'Volley Combo', games: [
		{ id: 'volley-heads', name: 'Volley Heads', icon: 'assets/icons/volley-heads.png', file: 'games/heads.js',
			box: { color: 'white', bg: 'url(assets/box-party/cube-volleyball.png) center / cover' } },
		{ id: 'soccer-heads', name: 'Soccer Heads', icon: 'assets/icons/soccer-heads.png', file: 'games/heads.js',
			box: { color: 'white', bg: 'url(assets/box-party/cube-soccer.png) center / cover' } },
	] },

	{ folder: 'Musical', games: [
		{ id: 'bongo-bounce', name: 'Bongo Bounce', icon: 'assets/icons/bongo-bounce.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-drum.png) center / cover' } },
		{ id: 'melody-match', name: 'Melody Match', icon: 'assets/icons/melody-match.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-drum.png) center / cover' } },
	] },

	{ folder: 'Disruption', games: [
		{ id: 'coin-chaos', name: 'Coin Chaos', icon: 'assets/icons/coin-chaos.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-coin-chaos.png) center / cover', note: 'HIGH ENERGY' } },
	] },

	{ folder: 'Creative', games: [
		{ id: 'painter-panic', name: 'Painter Panic', icon: 'assets/icons/painter-panic.png',
			box: { color: 'red', bg: 'red' } },
		{ id: 'cardboard-cutout', name: 'Cardboard Cutout', icon: 'assets/icons/cardboard-cutout.png',
			box: { color: 'brown', bg: 'brown' } },
		{ id: 'stubble-trouble', name: 'Stubble Trouble', icon: 'assets/icons/stubble-trouble.png',
			box: { color: 'brown', bg: 'brown' } },
	] },

	{ folder: 'Multiwall', games: [
		{ id: 'milkers', name: 'Milkers', icon: 'assets/icons/milkers.png',
			box: { color: '#40B0ED', bg: 'url(assets/box-party/icon-milk.png) center / cover', note: 'HIGH ENERGY' } },
		{ id: 'popcorn-panhandlers', name: 'Popcorn Panhandlers', icon: 'assets/icons/popcorn-panhandlers.png',
			box: { color: '#40B0ED', bg: 'url(assets/box-party/cube-popcorn.png) center / cover' } },
	] },

	{ folder: 'Survival', games: [
		{ id: 'plummet-panic', name: 'Plummet Panic', icon: 'assets/icons/plummet-panic.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-drum.png) center / cover' } },
		{ id: 'cookie-cutter', name: 'Cookie Cutter', icon: 'assets/icons/cookie-cutter.jpg',
			box: { color: 'orange', bg: 'url(assets/box-party/icon-cookie-cutter.jpg) center / cover' } },
	] },

	{ folder: 'Disruption 2', games: [
		{ id: 'the-claw', name: 'The Claw', icon: 'assets/icons/the-claw.png' },
	] },

	{ folder: 'Puzzle', games: [
		{ id: 'find-my-meep', name: 'Find My Meep', icon: 'assets/icons/find-my-meep.png',
			box: { color: 'white', bg: 'gray' } },
		{ id: 'town-fair', name: 'Town Fair', icon: 'assets/icons/town-fair.png',
			box: { color: 'white', bg: 'gray' } },
	] },

	{ folder: 'Sport', games: [
		{ id: 'goal-patrol', name: 'Goal Patrol', icon: 'assets/icons/goal-patrol.png',
			box: { color: 'white', bg: 'gray' } },
		{ id: 'bowling-bonanza', name: 'Bowling Bonanza', icon: 'assets/icons/bowling-bonanza.png',
			box: { color: 'white', bg: 'gray' } },
	] },

	{ folder: 'Finale', games: [
		{ id: 'final-frenzy', name: 'Final Frenzy', icon: 'assets/icons/final-frenzy.gif',
			box: { name: '', color: 'white', bg: 'url(assets/shared/bg-cosmos.gif) center / cover' } },
		{ id: 'finale-sequence', name: 'Finale Sequence', icon: 'assets/icons/finale-sequence.png',
			box: { name: '', color: 'white', bg: 'url(assets/shared/bg-cosmos.gif) center / cover' } },
	] },

	{ folder: 'Rejects', games: [
		{ id: 'soft-serve', name: 'Soft Serve', icon: 'assets/icons/soft-serve.jpg' },
		{ id: 'platform', name: 'Platform', icon: 'assets/icons/platform.jpg' },
		{ id: 'pump-pop', name: 'Pump Pop', icon: 'assets/icons/pump-pop.png' },
		{ id: 'boom-chain', name: 'Boom Chain' },
		{ id: 'cupping-balls', name: 'Cupping Balls', icon: 'assets/icons/cupping-balls.png' },
		{ id: 'roulette-runner', name: 'Roulette Runner', icon: 'assets/icons/roulette-runner.png' },
	] },
];

// The only games the menu shows (in their folders above); the rest stay
// playable by #id. Remove this (or set it to null) to show everything.
IGB.menu = ['red-light-green-light', 'loop-island', 'iron-stride', 'twin-tail-tower', 'mingle', 'backrooms', 'gwi-ma-showdown', 'roll-call', 'show-debug'];

// The music tracks, on or off everywhere: every music-*.mp3 (the show's music
// included). Tunes the games synthesise (the doll's song, Mingle's waltz),
// sound effects and voices play either way. Off for now.
IGB.music = false;
