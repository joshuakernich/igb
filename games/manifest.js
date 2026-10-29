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

	// (the Sonic games, together on a row of their own)
	{ folder: 'Sonic', games: [
		{ id: 'loop-island', name: 'Sonic Dash', icon: 'assets/icons/sonic-dash.png', file: 'games/loop-island/index.js', module: true,
			title: { lines: [{ text: 'SONIC', fill: '#2f7cf0', glow: '#3cd6ff', font: 'Nise Sega Sonic' }, { text: 'DASH', fill: '#ff3d3d', glow: '#ff7a3d', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ffe14a', bg: '#2f7cf0', note: 'SPEED' } },
		{ id: 'quill-relay', name: 'Sonic Classic', icon: 'assets/icons/sonic-classic.png', file: 'games/quill-relay/index.js', module: true,
			title: { lines: [{ text: 'SONIC', fill: '#2f7cf0', glow: '#3cd6ff', font: 'Nise Sega Sonic' }, { text: 'CLASSIC', fill: '#ffd23a', glow: '#ff7a3d', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ffd23a', bg: '#2f7cf0', note: 'RELAY' } },
		{ id: 'twin-tail-tower', name: 'Tails Jump', icon: 'assets/icons/sonic-tails.png', file: 'games/twin-tail-tower/index.js', module: true,
			title: { lines: [{ text: 'TAILS', fill: '#ff9a2b', glow: '#ffd23f', font: 'Nise Sega Sonic' }, { text: 'JUMP', fill: '#2f7cf0', glow: '#3cd6ff', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ff9a2b', bg: '#5fb8ff', note: 'CLIMB' } },
		{ id: 'tails-escape', name: 'Tails Escape', icon: 'assets/icons/tails-escape.png', file: 'games/tails-escape/index.js', module: true,
			title: { lines: [{ text: 'TAILS', fill: '#ff9a2b', glow: '#ffd23f', font: 'Nise Sega Sonic' }, { text: 'ESCAPE', fill: '#ff3d3d', glow: '#ff7a3d', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ffb02b', bg: '#23262d', note: 'DODGE' } },
		{ id: 'iron-stride', name: 'Sonic Robot', icon: 'assets/icons/sonic-robot.png', file: 'games/iron-stride/index.js', module: true,
			title: { lines: [{ text: 'SONIC', fill: '#2f7cf0', glow: '#3cd6ff', font: 'Nise Sega Sonic' }, { text: 'ROBOT', fill: '#ff3b30', glow: '#e23a2e', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#e23a2e', bg: '#16171b', note: 'MECH' } },
		{ id: 'knuckles-quest', name: 'Knuckles Quest', icon: 'assets/icons/knuckles-quest.png', file: 'games/knuckles-quest/index.js', module: true,
			title: { lines: [{ text: 'KNUCKLES', fill: '#d8262e', glow: '#ff6a3d', font: 'Nise Sega Sonic' }, { text: 'QUEST', fill: '#2dff7a', glow: '#2dff7a', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#2dff7a', bg: '#d8262e', note: 'EXPLORE' } },
		{ id: 'super-sonic-battle', name: 'Super Sonic Battle', icon: 'assets/icons/super-sonic-battle.png', file: 'games/super-sonic-battle/index.js', module: true,
			title: { lines: [{ text: 'SUPER SONIC', fill: '#ffc21a', glow: '#ffe14a', font: 'Nise Sega Sonic' }, { text: 'BATTLE', fill: '#ff3d3d', glow: '#ff7a3d', font: 'Nise Sega Sonic' }], font: 'Nise Sega Sonic' }, box: { color: '#ffc21a', bg: '#1a2a8a', note: 'BOSS' } },
		{ id: 'sonic-characters', name: 'Sonic Characters', icon: 'assets/icons/sonic-characters.png', file: 'games/sonic-characters/index.js', module: true,
			box: { color: '#5ad1ff', bg: '#1a1f2e', note: 'SANDBOX' } },
	] },

	{ folder: 'New', games: [
		{ id: 'grub-o-tron', name: 'Fission Chips', icon: 'assets/icons/grub-o-tron.png', module: true,
			title: { lines: [{ text: 'FISSION', fill: '#c8ff5a', glow: '#3cff7a', font: 'Monoton' }, { text: 'CHIPS', fill: '#FC1992', glow: '#9E00FF', font: 'Rubik Wet Paint' }] }, box: { color: '#9dff3a', bg: '#200033', note: 'CO-OP' } },
		{ id: 'red-light-green-light', name: 'Red Light Green Light', icon: 'assets/icons/red-light-green-light.png',
			file: 'games/red-light-green-light/index.js', module: true,
			title: { lines: [{ text: 'RED LIGHT', fill: '#ff3640', glow: '#ff3640' }, { text: 'GREEN LIGHT', fill: '#27d96b', glow: '#27d96b' }] }, box: { color: '#e5287a', bg: '#1d7a63', note: 'SURVIVAL' } },
		{ id: 'temple-of-coins', name: 'Temple of Coins', icon: 'assets/icons/temple-of-coins.png', file: 'games/temple-of-coins.js', module: true,
			title: { lines: [{ text: 'TEMPLE', fill: '#ffd34d', glow: '#ff9a1f', font: 'Bungee', scale: 1.25 }, { text: 'OF COINS', fill: '#ffd34d', glow: '#ff9a1f', font: 'Bungee', scale: 0.94, gap: 0.78 }], font: 'Bungee' }, box: { color: '#ffd34d', bg: '#2a1708', note: 'TREASURE' } },
		{ id: 'boogie-woods', name: 'Treble in the Woods', icon: 'assets/icons/boogie-woods.png', file: 'games/boogie-woods/index.js', module: true,
			title: { lines: [{ text: 'TREBLE', font: 'Shrikhand', rainbow: true, scale: 1.35 }, { text: 'IN THE', font: 'Shrikhand', fill: '#ffe27a', glow: '#ff9a3c', scale: 0.5, gap: 0.82 }, { text: 'WOODS', font: 'Shrikhand', fill: '#a8ff3e', glow: '#1fbf6a', scale: 1.2, gap: 0.8 }], font: 'Shrikhand' },
			box: { color: '#a8ff3e', bg: '#1a0b2e', note: 'MUSIC' } },
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
		{ id: 'riddler-says', name: 'Riddler Says', icon: 'assets/icons/riddler-says.png', file: 'games/riddler-says.js',
			title: { lines: [{ text: 'RIDDLER', fill: '#39ff14', glow: '#39ff14', font: 'VCRFONT' }, { text: 'SAYS', fill: '#ffffff', glow: '#39ff14', font: 'VCRFONT' }], font: 'VCRFONT' }, box: { color: '#39ff14', bg: '#0b1a07', note: 'PUZZLE' } },
		{ id: 'gwi-ma-showdown', name: 'Gwi-Ma Showdown', icon: 'assets/icons/gwi-ma-showdown.png',
			title: { lines: [{ text: 'GWI-MA', fill: '#ff4fd8', glow: '#ff3d7a' }, { text: 'SHOWDOWN', fill: '#ffe14d', glow: '#ff7a3d' }] }, box: { color: '#ff3df0', bg: '#12051f', note: 'BOSS' } },
		{ id: 'melody-canvas', name: 'Melody Canvas', icon: 'assets/icons/melody-canvas.png',
			title: { lines: [{ text: 'Melody', fill: '#3f9e7f', glow: '#26241f', font: 'Shrikhand' }, { text: 'Canvas', fill: '#d0653f', glow: '#26241f', font: 'Shrikhand' }], font: 'Shrikhand' }, box: { color: '#26241f', bg: '#f4f1ea', note: 'MUSIC' } },
		{ id: 'echo', name: 'Echo',
			box: { color: '#3ad1ff', bg: '#0b1630', note: 'DODGE' } },
		{ id: 'template', name: 'Template', file: 'games/_template.js' },
	] },

	// (the UX Demo, on a row of its own)
	{ folder: 'UX Demo', games: [
		{ id: 'gaze-test', name: 'Gaze Test', icon: 'assets/icons/gaze-test.svg', file: 'games/gaze-test/index.js', module: true,
			box: { color: '#2dd4ff', bg: '#0d1118', note: 'TOOL' } },
		{ id: 'show-debug', name: 'UX Demo', icon: 'assets/icons/ux-demo.svg', file: 'games/show-debug.js', module: true,   // (its title drop: WACKY STACKY)
			title: { lines: [{ text: 'WACKY', fill: 'white', glow: '#9E00FF', font: 'Bend 2 Squares', scale: 1.85 }, { text: 'STACKY', rainbow: true, font: 'Bend 2 Squares OL2', scale: 1.85, gap: 0.8 }], font: 'Bend 2 Squares' }, box: { color: '#ffb21f', bg: '#0b1022', note: 'DEMO' } },
	] },

	{ folder: 'Experiments', games: [
		{ id: 'minecraft', name: 'Minecraft' },
		{ id: 'life', name: 'Life' },
		{ id: 'ball-spin', name: 'Ball Spin' },
		{ id: 'dance-mat', name: 'Dance Mat' },
	] },

	{ folder: 'Batman', games: [
		{ id: 'riddler', name: 'Riddler', icon: 'assets/icons/riddler.png', file: 'games/riddler.js' },
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
		{ id: 'bongo-bounce', name: 'Bongo Bounce', icon: 'assets/box-party/icon-drum.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-drum.png) center / cover' } },
		{ id: 'melody-match', name: 'Melody Match', icon: 'assets/icons/melody-match.png',
			box: { color: 'white', bg: 'url(assets/box-party/icon-drum.png) center / cover' } },
	] },

	{ folder: 'Disruption', games: [
		{ id: 'coin-chaos', name: 'Coin Chaos', icon: 'assets/box-party/icon-coin-chaos.png',
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
		{ id: 'milkers', name: 'Milkers', icon: 'assets/box-party/icon-milk.png',
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
IGB.menu = ['grub-o-tron', 'red-light-green-light', 'temple-of-coins', 'boogie-woods', 'loop-island', 'quill-relay', 'iron-stride', 'twin-tail-tower', 'tails-escape', 'knuckles-quest', 'super-sonic-battle', 'sonic-characters', 'backrooms', 'riddler-says', 'melody-canvas', 'show-debug', 'gaze-test'];

// The music tracks, on or off everywhere: every music-*.mp3 (the show's music
// included). Tunes the games synthesise (the doll's song, Mingle's waltz),
// sound effects and voices play either way. Off for now.
IGB.music = false;
