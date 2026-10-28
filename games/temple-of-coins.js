/*
 * Temple of Coins (10 minutes)
 *
 * After the gamebox's Temple of Coins, as one ten-minute show. The floor of
 * the room is the floor of a temple: a maze of carved stone, gold coins and
 * ghosts, laid over the room 1:1. Where you stand is where your explorer
 * stands.
 *
 *   coins     walk over them to pick them up. They're yours, but only once
 *             they're in the chest: walk to the glowing chest to bank them
 *   the chest only one of the temple's exits is open at a time, and every
 *             so often it moves (it shakes first: CHEST MOVING)
 *   spikes    the stone blocks bristle with iron spikes: touch one and you drop everything: the coins you carry
 *             fly back to where you found them, and you're out for a moment
 *   ghosts    the same. Hunters chase what they see, patrols pace a hall,
 *             wanderers drift, and the imposter walks where you walked
 *             four seconds ago
 *   powerups  GROW (bigger, and coins come to you from further), DOUBLE (your
 *             next bank counts twice), GHOST EATER (the ghosts turn blue and
 *             run: catch one for 100), SHIELD (walls and ghosts can't hurt you)
 *
 * Everyone plays at once and banks for themselves. A temple clears when all
 * its gold is in the chest; then the next one rises. Six temples, then the
 * Minotaur: in the last two minutes it throws bombs and charges, and only
 * the stone can stop it: lead its charge into a wall three times. Beat it
 * and the treasury rains gold until time's up.
 *
 * Drawn in 3D (three.js): each wall shows the whole temple from its own side,
 * mostly top-down through a perspective camera, so it narrows toward the top.
 * The temple is square and the room maps onto it exactly (px across, pz from
 * the front wall), whichever wall you watch. The room's outer EDGE (12% by
 * each side wall, EDGE_Z 24% by the front and back) already counts as the
 * temple's edge, so nobody has to hug a wall.
 *
 * Input: px / pz only (where you are on the floor; pz is 1 at the front wall).
 */
import * as THREE from '../lib/three/three.module.min.js';
import { createWallComposer, canvasTexture, environmentFromShader, toScreen } from '../lib/three/walls.js';

IGB.register('temple-of-coins', function TempleOfCoins(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;
	const TITLE_FONT = 'Bungee';
	const FONT = 'Lexend';
	const INK = '#140b04';
	const GOLD = '#ffd34d';

	/* ---------- tuning ---------- */

	const N = 16;                 // the temple is N x N squares
	const SIZE = 12;              // world units across (the whole room)
	const CS = SIZE / N;          // a square
	const HALF = SIZE / 2;
	const EDGE = 0.12;            // this much of the room by each side wall is already the temple's edge: nobody has to go right up to a wall
	const EDGE_Z = 0.24;          // ...and by the front and back (people keep further from those: the screen ahead, the wall behind)
	const WALL_H = 0.62;          // how tall the stone stands
	const E_R = 0.2;             // an explorer's radius (for the walls)
	const SPIKE = 0.3;           // how far the spikes stick out of the stone
	const WALL_GIVE = 0.1;       // the spikes' reach is forgiving by this much (short of their tips)
	const WALL_GRACE = 0.12;      // seconds touching stone before it counts (tracking jitters)
	const PICK_R = 0.36;          // how near a coin to pick it up
	const BANK_R = 0.6;           // how near the chest to bank
	const RESPAWN = 2.4;          // seconds out after a fall
	const SHIELD_AFTER = 2.5;     // seconds of shield on coming back
	const CHEST_MOVE = 24;        // seconds the chest stays put (when the temple has more than one exit)
	const CHEST_WARN = 5;         // it shakes this long before it moves
	const LEVEL_MAX = 95;         // seconds before the next temple rises anyway
	const FINALE_AT = 125;        // the Minotaur comes with this much time left
	const POWER_EVERY = 16;       // a powerup appears this often (on an empty spot)
	const POWER_TIME = { grow: 12, eater: 8, shield: 8 };
	const COIN = 10, BIG = 50, GHOST_PAY = 100, BOSS_PAY = 300, RAIN_COIN = 20;
	const SIGHT = 5.5;            // squares a ghost can see
	const LOSE = 1.8;             // seconds out of sight before a ghost gives up
	const IMPOSTER_LAG = 4;       // seconds behind its explorer
	const SPEED = { A: 1.3, P: 1.45, H: 1.65, F: 2.05 };   // squares a second
	const HELP_AFTER = 3;         // falls before a shield turns up nearby

	/* ---------- the temples ---------- */
	// # stone   . coin   o big coin   E an exit (the chest opens on one)   * a powerup spot
	// ghosts: H hunter   P patrol   A wanderer   I imposter   F the fat one

	const TUTORIAL_MAP = { name: 'THE FIRST STEP', map: [
		'                ',
		'       E        ',
		'                ',
		'                ',
		'   ..      ..   ',
		'   ..      ..   ',
		'                ',
		'     ######     ',
		'                ',
		'   ..  ..  ..   ',
		'   ..  ..  ..   ',
		'                ',
		'                ',
		'                ',
		'                ',
		'                ',
	] };
	const LEVELS = [
		{ name: 'THE ANTECHAMBER', map: [
			'                ',
			'  E    ..    E  ',
			'       ..       ',
			'  ##        ##  ',
			'  #  ......  #  ',
			'     .    .     ',
			' ..  . ## .  .. ',
			' ..  . ## .  .. ',
			'     .    .     ',
			'  #  ......  #  ',
			'  ##   A    ##  ',
			'                ',
			'  ..   **   ..  ',
			'  ..        ..  ',
			'  E          E  ',
			'                ',
		] },
		{ name: 'THE COLONNADE', map: [
			'E      ..      E',
			'   ..      ..   ',
			' ##  ##  ##  ## ',
			' ##  ##  ##  ## ',
			'   ..  ..  ..   ',
			'P  ..  ..  ..   ',
			' ##  ##  ##  ## ',
			' ##  ##  ##  ## ',
			'   .   oo   .   ',
			'   .   *    .  P',
			' ##  ##  ##  ## ',
			' ##  ##  ##  ## ',
			'   ..  ..  ..   ',
			'   ..  ..  ..   ',
			'E      ..      E',
			'                ',
		] },
		{ name: 'THE SERPENT HALL', map: [
			'E      ..      E',
			'  ..........    ',
			'                ',
			'  ###########   ',
			'    ........    ',
			'      H         ',
			'   ###########  ',
			'   .... oo ...  ',
			'      *         ',
			'  ###########   ',
			'    ........    ',
			'         H      ',
			'   ###########  ',
			'   ..........   ',
			'E              E',
			'                ',
		] },
		{ name: 'THE CROSSROADS', map: [
			'E      ##      E',
			'  ...  ##  ...  ',
			'  ...  ##  ...  ',
			'                ',
			'   .   ..   .   ',
			'####  .oo.  ####',
			'   .  .  .  .   ',
			'   I        A   ',
			'   .        .   ',
			'####  .oo.  ####',
			'   .   ..   .   ',
			'                ',
			'  ...  ##  ...  ',
			'  ... *##* ...  ',
			'E      ##      E',
			'                ',
		] },
		{ name: 'THE VAULT', map: [
			'E              E',
			'  ..   ..   ..  ',
			'  ############  ',
			'  #          #  ',
			'  #  oo  oo  #  ',
			'  #  ......  #  ',
			'     ......     ',
			'  #  ..*...  #  ',
			'  #  ......  #  ',
			'  #  oo  oo  #  ',
			'  #    F     #  ',
			'  ####    ####  ',
			'   H       H    ',
			'  ..   ..   ..  ',
			'E      ..      E',
			'                ',
		] },
		{ name: 'THE LABYRINTH', map: [
			'E   ..    ..   E',
			'  ####    ####  ',
			'  #  ..  ..  #  ',
			'  #  ######  #  ',
			'     #    #     ',
			' ..  # oo #  .. ',
			' ..       H  .. ',
			'  ####    ####  ',
			'   ..  **  ..   ',
			'  ##  ####  ##  ',
			'  #   P      #  ',
			'  #  ..  ..  #  ',
			'  ####    ####  ',
			'   I        A   ',
			'E   ..    ..   E',
			'                ',
		] },
	];
	const LAIR = { name: 'THE MINOTAUR\'S LAIR', boss: true, map: [
		'E              E',
		'  ##   ..   ##  ',
		'  ##   ..   ##  ',
		'                ',
		' ..   ####   .. ',
		' ..          .. ',
		'    ##    ##    ',
		'    ##    ##    ',
		'                ',
		' ..          .. ',
		' ..   ####   .. ',
		'                ',
		'  ##   ..   ##  ',
		'  ##   ..   ##  ',
		'E              E',
		'                ',
	] };

	const POWERS = {
		grow: { name: 'GROW', color: '#3cff7a' },
		double: { name: 'DOUBLE', color: '#ff4fd8' },
		eater: { name: 'GHOST EATER', color: '#3af2ff' },
		shield: { name: 'SHIELD', color: '#bcd4ff' },
	};
	const GHOST_LOOK = {
		H: { body: 0xf2eaff, eye: [3.2, 0.4, 0.3], name: 'HUNTER' },
		P: { body: 0xfff1d6, eye: [3.0, 1.8, 0.3], name: 'PATROL' },
		A: { body: 0xe4fff0, eye: [0.6, 3.0, 0.8], name: 'WANDERER' },
		F: { body: 0xffe0f0, eye: [3.2, 0.3, 1.6], name: 'FAT' },
		I: { body: 0xffffff, eye: [2.5, 2.5, 2.5], name: 'IMPOSTER' },
	};

	/* ---------- little helpers ---------- */

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, k) => a + (b - a) * k;
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	const cellX = (c) => -HALF + (c + 0.5) * CS;
	const cellZ = (r) => -HALF + (r + 0.5) * CS;
	const colOf = (x) => clamp(Math.floor((x + HALF) / CS), 0, N - 1);
	const rowOf = (z) => clamp(Math.floor((z + HALF) / CS), 0, N - 1);
	const inGrid = (c, r) => c >= 0 && r >= 0 && c < N && r < N;
	const colour = (n) => (window.PLAYER_COLORS && PLAYER_COLORS[n]) || '#ffffff';
	const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let latest = [];
	const ex = [];                // the explorers
	let grid = [];                // grid[r][c]: true where there's stone
	let level = null;             // { def, idx, id }
	let levelSerial = 0;
	let levelIdx = -1;
	let loops = 0;                // times round the six temples
	let coins = [];
	let exits = [];
	let chest = { at: -1, t: 0, open: 0, shake: 0, burst: 0 };
	let ghosts = [];
	let spots = [];
	let powerups = [];
	let powerT = 0;
	let eaterT = 0;
	let boss = null;
	let bombs = [];
	let blasts = [];
	let floaters = [];
	let banner = null;
	let phase = 'off';            // 'tutorial', 'intro', 'play' or 'off'
	let levelT = 0;
	let clearT = 0;               // counting down to the next temple after a clear
	let rainT = 0;
	let t = 0;
	const tut = { moved: [], picked: [], banked: [] };

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'temple-of-coins',
		seconds: SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		sounds: { coin: ['assets/shared/sfx-coin.mp3', 0.3] },
		theme: { accent: '#ffc23a', accent2: '#ff7a1a', gold: '#ffe27a', sky: ['#0c0712', '#2a1708'], glow: 'rgba(255,194,58,0.35)' },
		rivals: ['THE GOLD DIGGERS', 'TOMB RAIDERS FC', 'THE RELIC HUNTERS', 'COIN COLLECTIVE', 'THE CURSED CREW', 'IDOL HANDS', 'THE TREASURY', 'PILLAR TALK'],
		drawAvatar(ctx, n, x, y, scale) { drawExplorer2D(ctx, n, x, y, 130 * scale); },
		menu: { restart: () => { if (level) loadLevel(level.def, level.idx); } },
	});

	const everyone = (fn) => count > 0 && ex.every((e, i) => fn(i));
	const enough = (arr) => arr.filter(Boolean).length >= Math.min(count, 3);
	const TUTORIAL = [
		{ caption: 'WALK AROUND: YOU ARE YOUR EXPLORER', min: 2, max: 10, did: () => everyone((i) => tut.moved[i] > 1.5) },
		{ caption: 'WALK OVER THE COINS TO PICK THEM UP', min: 2, max: 25, did: () => enough(tut.picked) },
		{ caption: 'BANK THEM IN THE GLOWING CHEST', min: 2, max: 25, did: () => enough(tut.banked) },
		{ caption: 'DON\'T TOUCH THE SPIKES, OR YOU DROP IT ALL!', min: 3.5, max: 3.5, did: () => true },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enter() {
				phase = 'tutorial';
				tut.moved = []; tut.picked = []; tut.banked = [];
				loadLevel(TUTORIAL_MAP, -1);
			},
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 5.5,
			enter() {
				phase = 'intro';
				scores = scores.map(() => 0);
				for (const e of ex) { e.pot = []; e.dbl = false; }
				loops = 0;
				loadLevel(LEVELS[0], 0, true);
			},
			update(dt) { tick(dt); },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'GRAB THE GOLD.', W / 2, 250, 92, bt - 0.3, { font: TITLE_FONT, exact: true, fill: GOLD });
					show.slam(c, 'BANK IT IN THE CHEST.', W / 2, 360, 70, bt - 1.1, { font: TITLE_FONT, exact: true, fill: 'white' });
					show.slam(c, 'NEVER TOUCH THE SPIKES.', W / 2, 460, 70, bt - 1.9, { font: TITLE_FONT, exact: true, fill: '#ff6a3d' });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (!level || level.idx < 0) loadLevel(LEVELS[0], 0);
				else if (level.idx === 0 && levelT < 8) banner = { title: LEVELS[0].name, sub: 'TEMPLE 1', t: 0 };
				phase = 'play';
			},
			update(dt) {
				tick(dt);
				show.record(t, latest.slice(0, count));
			},
			draw(ctx) { drawBanner(ctx); },
		},
		show.beats.timeUp({ enter() { phase = 'off'; banner = null; } }),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(scores)); },
		}),
	]);

	/* ---------- flow ---------- */

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		for (let i = 0; i < n; i++) {
			ex.push({
				x: 0, z: 0, seen: false, alive: true, deadT: 0, inv: 0, wallT: 0, falls: 0,
				pot: [], dbl: false, grow: 0, face: 0, walk: 0, trail: [], mesh: null, squash: 0, bankFlash: 0,
			});
			buildExplorer(i);
		}
		loadLevel(TUTORIAL_MAP, -1);   // (something to stand in, whichever beat the show goes to)
		show.go('title');
	}

	// a temple rises: the stone, the gold, the exits, the ghosts
	function loadLevel(def, idx, quiet) {
		levelSerial++;
		level = { def, idx, id: levelSerial };
		levelIdx = idx;
		levelT = 0;
		clearT = 0;
		rainT = 0;
		eaterT = 0;
		bombs = [];
		powerT = POWER_EVERY * 0.5;
		sinkLevel();
		const rows = def.map.map((s) => (s + ' '.repeat(N)).slice(0, N));
		grid = rows.map((s) => [...s].map((ch) => ch === '#'));
		coins = []; exits = []; spots = []; ghosts = []; powerups = [];
		const group = new THREE.Group();
		levelGroup = group;
		scene.add(group);
		wallMeshes = rows.map(() => new Array(N).fill(null));
		rows.forEach(function (s, r) {
			[...s].forEach(function (ch, c) {
				const x = cellX(c), z = cellZ(r);
				const delay = 0.15 + Math.hypot(x, z) / HALF * 0.5;
				if (ch === '#') wallMeshes[r][c] = makeBlock(group, x, z, delay);
				else if (ch === '.' || ch === 'o') coins.push(makeCoin(group, x, z, ch === 'o' ? BIG : COIN, delay + 0.3));
				else if (ch === 'E') exits.push(makeExit(group, x, z));
				else if (ch === '*') spots.push({ c, r, x, z });
				else if (GHOST_LOOK[ch]) ghosts.push(makeGhost(group, ch, c, r, delay + 0.8));
			});
		});
		chest.at = exits.length ? Math.floor(Math.random() * exits.length) : -1;
		chest.t = 0;
		chest.open = 0;
		chest.shake = 0;
		// half the powerup spots start with one
		for (const sp of spots) if (Math.random() < 0.5) spawnPower(sp);
		boss = def.boss ? makeBoss(group) : null;
		for (const e of ex) {
			e.trail = [];
			if (e.alive) e.inv = Math.max(e.inv, 1.5);   // (a moment to find your feet as the stone comes up)
		}
		if (!quiet && idx >= 0) {
			banner = { title: def.boss ? 'THE MINOTAUR AWAKES!' : def.name, sub: def.boss ? 'LEAD ITS CHARGE INTO THE STONE' : 'TEMPLE ' + (idx + 1 + loops * LEVELS.length), t: 0, boss: !!def.boss };
			show.fx(def.boss ? 'villainReveal' : 'roundStart', 0.6);
		}
	}

	function nextLevel() {
		let idx = levelIdx + 1;
		if (idx >= LEVELS.length) { idx = 0; loops++; }
		loadLevel(LEVELS[idx], idx);
	}

	/* ---------- every tick ---------- */

	function tick(dt) {
		if (show.paused) return;
		t += dt;
		levelT += dt;
		const live = phase === 'tutorial' || phase === 'play';
		if (banner) banner.t += dt;
		eaterT = Math.max(0, eaterT - dt);
		stepExplorers(dt, live);
		if (phase !== 'intro' || levelT > 2) stepGhosts(dt, live);
		if (boss) stepBoss(dt, live);
		stepBombs(dt);
		stepChest(dt, live);
		stepPowers(dt, live);
		for (const f of floaters) f.t += dt;
		floaters = floaters.filter((f) => f.t < 1.6);
		if (phase !== 'play') return;
		// the Minotaur's time
		if (!level.def.boss && show.timeLeft() <= FINALE_AT) { loadLevel(LAIR, levelIdx); return; }
		if (boss && boss.state === 'gone') {
			// the treasury rains gold
			rainT -= dt;
			if (rainT <= 0 && coins.filter((c) => c.present).length < 24) { rainT = 1.1; rainCoin(); }
			return;
		}
		if (level.def.boss) return;
		// cleared: no gold on the floor and none still to bank
		const left = coins.some((c) => c.present) || ex.some((e) => e.pot.some((p) => p.level === level.id));
		if (!left && !clearT) {
			clearT = 2.2;
			banner = { title: 'TEMPLE CLEARED!', sub: '', t: 0 };
			show.fx('roundClear', 0.6);
		}
		if (clearT) { clearT -= dt; if (clearT <= 0) nextLevel(); }
		else if (levelT > LEVEL_MAX) nextLevel();
	}

	function stepExplorers(dt, live) {
		for (let i = 0; i < count; i++) {
			const e = ex[i];
			const p = latest[i];
			if (!p) { e.seen = false; continue; }
			const span = (v, m) => clamp((v - m) / (1 - m * 2), 0, 1);   // (the room, less a margin by each wall, over the whole temple)
			const tx = (span(p.px, EDGE) - 0.5) * SIZE;
			const tz = (0.5 - span(p.pz, EDGE_Z)) * SIZE;   // (pz is 1 at the front wall: the far edge, z -HALF)
			if (!e.seen) { e.x = tx; e.z = tz; e.seen = true; }
			const k = 1 - Math.exp(-dt * 24);   // (tracking comes about 20 times a second: glide between)
			const dx = (tx - e.x) * k, dz = (tz - e.z) * k;
			e.x += dx; e.z += dz;
			const step = Math.hypot(dx, dz);
			if (step > 0.004) e.face = Math.atan2(dx, dz);
			e.walk += step * 9;
			tut.moved[i] = (tut.moved[i] || 0) + step;
			e.trail.push({ t, x: e.x, z: e.z });
			while (e.trail.length && e.trail[0].t < t - IMPOSTER_LAG - 1) e.trail.shift();
			e.inv = Math.max(0, e.inv - dt);
			e.grow = Math.max(0, e.grow - dt);
			e.bankFlash = Math.max(0, e.bankFlash - dt);
			if (!e.alive) {
				e.deadT -= dt;
				if (e.deadT <= 0) { e.alive = true; e.inv = SHIELD_AFTER; }
				continue;
			}
			if (!live) continue;
			// the stone
			if (touchingStone(e)) {
				if (e.inv > 0) e.wallT = 0;
				else if ((e.wallT += dt) > WALL_GRACE) { fall(i, 'stone'); continue; }
			} else e.wallT = 0;
			// gold
			const reach = PICK_R * (e.grow > 0 ? 1.8 : 1);
			for (const c of coins) {
				if (!c.present || c.fly < 1) continue;
				if (Math.hypot(c.x - e.x, c.z - e.z) < reach) {
					c.present = false;
					e.pot.push({ value: c.value, coin: c, level: level.id });
					tut.picked[i] = true;
					show.play('coin', 1 + Math.min(0.8, e.pot.length * 0.03));
				}
			}
			// the chest
			const at = exits[chest.at];
			if (at && e.pot.length && Math.hypot(at.x - e.x, at.z - e.z) < BANK_R) bank(i);
			// powerups
			for (const pu of powerups) {
				if (pu.taken || pu.appear > 0) continue;
				if (Math.hypot(pu.x - e.x, pu.z - e.z) < 0.42) takePower(i, pu);
			}
		}
	}

	function touchingStone(e) {
		const rad = E_R * (e.grow > 0 ? 1.5 : 1);
		const c0 = colOf(e.x), r0 = rowOf(e.z);
		const half = CS * 0.48 + SPIKE - WALL_GIVE;   // (out to the spikes)
		for (let r = r0 - 2; r <= r0 + 2; r++) {
			for (let c = c0 - 2; c <= c0 + 2; c++) {
				if (!inGrid(c, r) || !grid[r][c]) continue;
				const dx = Math.max(0, Math.abs(e.x - cellX(c)) - half);
				const dz = Math.max(0, Math.abs(e.z - cellZ(r)) - half);
				if (dx * dx + dz * dz < rad * rad) return true;
			}
		}
		return false;
	}

	function fall(i, why) {
		const e = ex[i];
		e.alive = false;
		e.deadT = RESPAWN;
		e.wallT = 0;
		e.squash = 1;
		e.grow = 0;
		e.dbl = false;
		// the gold flies back to where it was found (this temple's; the rest is lost)
		let lost = 0;
		for (const p of e.pot) {
			if (p.coin && p.level === level.id) { p.coin.present = true; p.coin.fly = 0; p.coin.fx = e.x; p.coin.fz = e.z; }
			lost += p.value;
		}
		e.pot = [];
		float(e.x, e.z, why === 'stone' ? 'SPIKED!' : why === 'bomb' ? 'KABOOM!' : 'GOT YOU!', '#ff5a3d', 1.2);
		if (lost) float(e.x, e.z - 0.4, '-' + lost, '#ffb03d', 1.0);
		show.fx(why === 'bomb' ? 'explode' : 'roundFail', 0.45);
		show.fx('thud', 0.5);
		if (++e.falls >= HELP_AFTER) { e.falls = 0; spawnPowerNear(e, 'shield'); }
	}

	function bank(i) {
		const e = ex[i];
		let value = e.pot.reduce((s, p) => s + p.value, 0);
		if (e.dbl) value *= 2;
		scores[i] += value;
		const at = exits[chest.at];
		float(at.x, at.z, '+' + value + (e.dbl ? ' DOUBLED!' : ''), colour(i), 1.25);
		e.pot = [];
		e.dbl = false;
		e.bankFlash = 0.6;
		chest.burst = 1;
		tut.banked[i] = true;
		show.fx('bonus', 0.5);
		show.fx('glint', 0.6);
	}

	function stepChest(dt, live) {
		chest.open = Math.min(1, chest.open + dt * 2);
		chest.burst = Math.max(0, chest.burst - dt * 1.6);
		if (!live || exits.length < 2 || phase !== 'play') { chest.shake = 0; return; }
		chest.t += dt;
		chest.shake = chest.t > CHEST_MOVE - CHEST_WARN ? (chest.t - (CHEST_MOVE - CHEST_WARN)) / CHEST_WARN : 0;
		if (chest.t >= CHEST_MOVE) {
			let next = chest.at;
			while (next === chest.at) next = Math.floor(Math.random() * exits.length);
			chest.at = next;
			chest.t = 0;
			chest.open = 0;
			show.fx('whooshLong', 0.5);
		}
	}

	/* ---------- powerups ---------- */

	function spawnPower(sp, kind) {
		kind = kind || pick(level && level.def.boss ? ['shield', 'grow', 'double'] : ['grow', 'double', 'eater', 'shield']);
		const pu = { kind, x: sp.x, z: sp.z, sp, appear: 0.6, taken: false, mesh: makePowerMesh(kind) };
		pu.mesh.position.set(sp.x, 0.45, sp.z);
		levelGroup.add(pu.mesh);
		powerups.push(pu);
		return pu;
	}
	function spawnPowerNear(e, kind) {
		// the nearest free square a little way off
		let best = null, bestD = 1e9;
		for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
			if (grid[r][c]) continue;
			const d = Math.abs(Math.hypot(cellX(c) - e.x, cellZ(r) - e.z) - 1.4);
			if (d < bestD) { bestD = d; best = { c, r, x: cellX(c), z: cellZ(r) }; }
		}
		if (best) spawnPower(best, kind);
	}
	function stepPowers(dt, live) {
		for (const pu of powerups) {
			pu.appear = Math.max(0, pu.appear - dt);
			if (pu.taken) pu.gone = (pu.gone || 0) + dt;
		}
		for (const pu of powerups) if (pu.gone > 0.4) levelGroup.remove(pu.mesh);
		powerups = powerups.filter((pu) => !(pu.gone > 0.4));
		if (!live || !spots.length) return;
		powerT -= dt;
		if (powerT <= 0) {
			powerT = POWER_EVERY;
			const free = spots.filter((sp) => !powerups.some((pu) => pu.sp === sp && !pu.taken));
			if (free.length) spawnPower(pick(free));
		}
	}
	function takePower(i, pu) {
		const e = ex[i];
		pu.taken = true;
		if (pu.kind === 'grow') e.grow = POWER_TIME.grow;
		if (pu.kind === 'double') e.dbl = true;
		if (pu.kind === 'shield') e.inv = POWER_TIME.shield;
		if (pu.kind === 'eater') { eaterT = POWER_TIME.eater; for (const g of ghosts) if (g.mode === 'chase') g.mode = 'idle'; }
		float(pu.x, pu.z, POWERS[pu.kind].name + '!', POWERS[pu.kind].color, 1.1);
		show.fx('charge', 0.5);
		show.fx('pick', 0.6);
	}

	/* ---------- ghosts ---------- */

	const free = (c, r) => inGrid(c, r) && !grid[r][c];
	function bfs(c0, r0, c1, r1) {
		if (!free(c1, r1)) return [];
		const prev = new Map();
		const key = (c, r) => r * N + c;
		const q = [[c0, r0]];
		prev.set(key(c0, r0), null);
		while (q.length) {
			const [c, r] = q.shift();
			if (c === c1 && r === r1) break;
			for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const nc = c + dc, nr = r + dr;
				if (!free(nc, nr) || prev.has(key(nc, nr))) continue;
				prev.set(key(nc, nr), [c, r]);
				q.push([nc, nr]);
			}
		}
		if (!prev.has(key(c1, r1))) return [];
		const path = [];
		let at = [c1, r1];
		while (at && !(at[0] === c0 && at[1] === r0)) { path.unshift(at); at = prev.get(key(at[0], at[1])); }
		return path;
	}
	function sees(x0, z0, x1, z1) {
		const d = Math.hypot(x1 - x0, z1 - z0);
		const n = Math.ceil(d / (CS * 0.3));
		for (let k = 1; k < n; k++) {
			const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n);
			if (grid[rowOf(z)][colOf(x)]) return false;
		}
		return true;
	}
	function patrolEnds(c, r) {
		let a = c, b = c;
		while (free(a - 1, r)) a--;
		while (free(b + 1, r)) b++;
		return [[a, r], [b, r]];
	}

	function stepGhosts(dt, live) {
		const scared = eaterT > 0;
		for (const g of ghosts) {
			g.bob += dt;
			if (g.appear > 0) { g.appear -= dt; continue; }
			if (g.dead) {
				g.deadT -= dt;
				if (g.deadT <= 0) { g.dead = false; g.appear = 1.2; g.x = cellX(g.c0); g.z = cellZ(g.r0); g.path = []; g.mode = 'idle'; }
				continue;
			}
			if (!live) continue;
			if (g.kind === 'I') stepImposter(g, dt, scared);
			else stepWalker(g, dt, scared);
			// touching an explorer
			for (let i = 0; i < count; i++) {
				const e = ex[i];
				if (!e.alive || !e.seen) continue;
				const reach = 0.36 * g.size + E_R * (e.grow > 0 ? 1.5 : 1);
				if (Math.hypot(g.x - e.x, g.z - e.z) > reach) continue;
				if (scared) {
					g.dead = true;
					g.deadT = 6;
					e.pot.push({ value: GHOST_PAY, coin: null, level: level.id });
					float(g.x, g.z, 'GHOST EATEN! +' + GHOST_PAY, '#3af2ff', 1.1);
					show.fx('demonPop', 0.6);
					break;
				} else if (e.inv <= 0) fall(i, 'ghost');
			}
		}
	}

	function stepImposter(g, dt, scared) {
		let e = ex[g.of];
		if (!e || !e.alive || !e.seen) {
			// follow someone else
			const alive = ex.map((e, i) => i).filter((i) => ex[i].alive && ex[i].seen);
			if (!alive.length) return;
			g.of = alive.sort((a, b) => Math.hypot(ex[a].x - g.x, ex[a].z - g.z) - Math.hypot(ex[b].x - g.x, ex[b].z - g.z))[0];
			e = ex[g.of];
		}
		if (scared) return;   // (frozen with fright)
		const when = t - IMPOSTER_LAG;
		const tr = e.trail;
		let pt = null;
		for (let k = tr.length - 1; k >= 0; k--) if (tr[k].t <= when) { pt = tr[k]; break; }
		if (!pt) return;
		const k = 1 - Math.exp(-dt * 6);
		const dx = (pt.x - g.x) * k, dz = (pt.z - g.z) * k;
		g.x += dx; g.z += dz;
		if (Math.hypot(dx, dz) > 0.002) g.face = Math.atan2(dx, dz);
	}

	function stepWalker(g, dt, scared) {
		const gc = colOf(g.x), gr = rowOf(g.z);
		// who it can see
		let seen = -1, bestD = 1e9;
		for (let i = 0; i < count; i++) {
			const e = ex[i];
			if (!e.alive || !e.seen || e.inv > 0) continue;
			const d = Math.hypot(e.x - g.x, e.z - g.z);
			if (d < SIGHT * CS && d < bestD && sees(g.x, g.z, e.x, e.z)) { seen = i; bestD = d; }
		}
		if (scared) g.mode = 'flee';
		else if (seen >= 0 && g.kind !== 'A') { if (g.mode !== 'chase') g.path = []; g.mode = 'chase'; g.target = seen; g.lostT = 0; }
		else if (seen >= 0 && g.kind === 'A') { g.mode = 'chase'; g.target = seen; g.lostT = LOSE - 0.5; }   // (a wanderer only lunges for a moment)
		else if (g.mode === 'chase') { g.lostT += dt; if (g.lostT > LOSE) { g.mode = 'idle'; g.path = []; } }
		else if (g.mode === 'flee') g.mode = 'idle';
		// the next square, when it's reached the last
		const at = g.path[0];
		const there = !at || Math.hypot(cellX(at[0]) - g.x, cellZ(at[1]) - g.z) < 0.05;
		if (there) {
			if (at) g.path.shift();
			if (!g.path.length) {
				g.wait -= dt;
				if (g.mode === 'chase') {
					const e = ex[g.target];
					if (e) g.path = bfs(gc, gr, colOf(e.x), rowOf(e.z)).slice(0, 2);
				} else if (g.mode === 'flee') {
					let best = null, bd = -1;
					for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
						const c = gc + dc, r = gr + dr;
						if (!free(c, r)) continue;
						const d = Math.min(...ex.filter((e) => e.alive && e.seen).map((e) => Math.hypot(cellX(c) - e.x, cellZ(r) - e.z)), 99);
						if (d > bd) { bd = d; best = [c, r]; }
					}
					if (best) g.path = [best];
				} else if (g.wait <= 0) {
					if (g.kind === 'P') {
						const end = g.ends[g.leg = 1 - g.leg];
						g.path = bfs(gc, gr, end[0], end[1]);
						g.wait = 1.2;
					} else if (g.kind === 'A') {
						for (let tries = 0; tries < 12; tries++) {
							const c = g.c0 + Math.round((Math.random() - 0.5) * 7), r = g.r0 + Math.round((Math.random() - 0.5) * 7);
							if (free(c, r)) { g.path = bfs(gc, gr, c, r); break; }
						}
						g.wait = 0.5 + Math.random();
					} else {
						// hunters drift home and hover there
						g.path = gc === g.c0 && gr === g.r0 ? [] : bfs(gc, gr, g.c0, g.r0);
						g.wait = 0.8;
					}
				}
			}
		}
		const nx = g.path[0];
		if (!nx) return;
		const tx = cellX(nx[0]), tz = cellZ(nx[1]);
		const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
		const sp = SPEED[g.kind] * CS * (1 + 0.12 * loops) * (scared ? 0.6 : 1) * (g.mode === 'chase' ? 1.15 : 1);
		const move = Math.min(d, sp * dt);
		if (d > 1e-4) { g.x += dx / d * move; g.z += dz / d * move; g.face = Math.atan2(dx, dz); }
	}

	/* ---------- the Minotaur ---------- */

	function stepBoss(dt, live) {
		const b = boss;
		b.t += dt;
		b.flash = Math.max(0, b.flash - dt * 3);
		if (b.state === 'gone') return;
		if (b.state === 'down') { if (b.t > 2.6) { b.state = 'gone'; b.mesh.visible = false; } return; }
		if (!live) return;
		const alive = ex.map((e, i) => i).filter((i) => ex[i].alive && ex[i].seen);
		const gap = Math.max(0.55, 1.0 - (3 - b.hp) * 0.18);
		if (b.state === 'enter') { if (b.t > 2.2) setBoss('walk'); }
		else if (b.state === 'walk') {
			// back toward the middle, slowly
			const dx = -b.x, dz = -b.z, d = Math.hypot(dx, dz);
			if (d > 0.2) { b.x += dx / d * 1.1 * dt; b.z += dz / d * 1.1 * dt; b.face = Math.atan2(dx, dz); }
			if (b.t > 1.6) { setBoss('throw'); b.left = 3; b.next = 0.2; }
		} else if (b.state === 'throw') {
			b.next -= dt;
			if (b.next <= 0 && alive.length) {
				const e = ex[pick(alive)];
				b.face = Math.atan2(e.x - b.x, e.z - b.z);
				bombs.push({ sx: b.x, sz: b.z, tx: e.x, tz: e.z, t: 0, flight: 0.9, fuse: 1.25, mesh: makeBomb() });
				show.fx('swordSwish', 0.5);
				b.left--;
				b.next = gap;
				b.throwAnim = 1;
				if (!b.left) setBoss('aim');
			}
		} else if (b.state === 'aim') {
			if (b.t < 0.05 || b.target === undefined || !ex[b.target] || !ex[b.target].alive) {
				if (!alive.length) return;
				b.target = pick(alive);
				show.fx('attackWarn', 0.5);
			}
			const e = ex[b.target];
			if (b.t < 0.75) b.face = Math.atan2(e.x - b.x, e.z - b.z);   // (it locks on, then holds the line)
			if (b.t > 1.15) { setBoss('charge'); show.fx('bossDash', 0.7); }
		} else if (b.state === 'charge') {
			const sp = 7.5 * CS * (1 + (3 - b.hp) * 0.12);
			b.x += Math.sin(b.face) * sp * dt;
			b.z += Math.cos(b.face) * sp * dt;
			// the stone stops it
			const hit = blocksNear(b.x + Math.sin(b.face) * 0.5, b.z + Math.cos(b.face) * 0.5, 0.55);
			if (hit.length) {
				for (const [c, r] of blocksNear(b.x + Math.sin(b.face) * 0.5, b.z + Math.cos(b.face) * 0.5, 1.0)) smash(c, r);
				b.hp--;
				b.flash = 1;
				show.fx('bossHit', 0.8);
				shake = 0.5;
				if (b.hp <= 0) {
					setBoss('down');
					show.fx('bossDefeat', 0.8);
					for (let i = 0; i < count; i++) { scores[i] += BOSS_PAY; float(ex[i].x, ex[i].z, '+' + BOSS_PAY, colour(i), 1.3); }
					banner = { title: 'THE MINOTAUR FALLS!', sub: 'THE TREASURY IS OPEN', t: 0, boss: true };
					rainT = 1;
				} else {
					setBoss('stun');
					float(b.x, b.z, 'STUNNED!', '#ffe27a', 1.2);
				}
			} else if (Math.abs(b.x) > HALF - 0.55 || Math.abs(b.z) > HALF - 0.55 || b.t > 1.8) {
				b.x = clamp(b.x, -HALF + 0.55, HALF - 0.55);
				b.z = clamp(b.z, -HALF + 0.55, HALF - 0.55);
				setBoss('stun');
				b.stunShort = true;
				shake = 0.25;
				show.fx('stomp', 0.6);
			}
		} else if (b.state === 'stun') {
			if (b.t > (b.stunShort ? 1.0 : 2.2)) { b.stunShort = false; setBoss('walk'); }
		}
		// touching it
		if (b.state !== 'down' && b.state !== 'enter') {
			for (let i = 0; i < count; i++) {
				const e = ex[i];
				if (e.alive && e.seen && e.inv <= 0 && Math.hypot(e.x - b.x, e.z - b.z) < 0.55 + E_R) fall(i, 'boss');
			}
		}
	}
	function setBoss(state) { boss.state = state; boss.t = 0; }
	function blocksNear(x, z, rad) {
		const out = [];
		for (let r = rowOf(z) - 2; r <= rowOf(z) + 2; r++) for (let c = colOf(x) - 2; c <= colOf(x) + 2; c++) {
			if (!inGrid(c, r) || !grid[r][c]) continue;
			const dx = Math.max(0, Math.abs(x - cellX(c)) - CS / 2), dz = Math.max(0, Math.abs(z - cellZ(r)) - CS / 2);
			if (dx * dx + dz * dz < rad * rad) out.push([c, r]);
		}
		return out;
	}
	function smash(c, r) {
		grid[r][c] = false;
		const m = wallMeshes[r][c];
		wallMeshes[r][c] = null;
		if (m) { m.userData.smash = 0.001; }
		blasts.push({ x: cellX(c), z: cellZ(r), t: 0, dust: true, mesh: makeBlast(0xd9b27a) });
	}

	function stepBombs(dt) {
		for (const bo of bombs) {
			bo.t += dt;
			if (bo.t > bo.flight + bo.fuse && !bo.done) {
				bo.done = true;
				blasts.push({ x: bo.tx, z: bo.tz, t: 0, mesh: makeBlast(0xff7a2a) });
				show.fx('explode', 0.45);
				shake = Math.max(shake, 0.2);
				for (let i = 0; i < count; i++) {
					const e = ex[i];
					if (e.alive && e.seen && e.inv <= 0 && Math.hypot(e.x - bo.tx, e.z - bo.tz) < 1.15 * CS + E_R) fall(i, 'bomb');
				}
			}
		}
		for (const bo of bombs) if (bo.done) { scene.remove(bo.mesh); scene.remove(bo.mesh.userData.ring); }
		bombs = bombs.filter((bo) => !bo.done);
		for (const bl of blasts) bl.t += dt;
		for (const bl of blasts) if (bl.t > 0.8) scene.remove(bl.mesh);
		blasts = blasts.filter((bl) => bl.t <= 0.8);
	}

	function rainCoin() {
		for (let tries = 0; tries < 20; tries++) {
			const c = Math.floor(Math.random() * N), r = Math.floor(Math.random() * N);
			if (!free(c, r) || coins.some((k) => k.present && k.c === c && k.r === r)) continue;
			if (boss && Math.hypot(cellX(c) - boss.x, cellZ(r) - boss.z) < 1) continue;
			const coin = makeCoin(levelGroup, cellX(c), cellZ(r), RAIN_COIN, 0);
			coin.c = c; coin.r = r;
			coin.drop = 1;
			coins.push(coin);
			show.fx('tap', 0.3, 1.6);
			return;
		}
	}

	function float(x, z, text, fill, size = 1) {
		floaters.push({ x, z, text, fill, size, t: 0 });
	}

	/* ---------- 3D ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	let post = null;
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x07050a);
	post = createWallComposer(renderer, scene, { strength: 0.55, radius: 0.45, threshold: 0.9, cap: 2.2 });
	const envTex = environmentFromShader(renderer, `
		vec3 envColor(vec3 d) {
			float up = d.y * 0.5 + 0.5;
			vec3 c = mix(vec3(0.18, 0.09, 0.04), vec3(0.16, 0.18, 0.32), up);
			c += vec3(1.0, 0.55, 0.2) * pow(max(0.0, 1.0 - abs(d.y)), 6.0) * 0.6;
			c += vec3(0.8, 0.85, 1.0) * pow(max(0.0, d.y), 12.0) * 1.2;
			return c;
		}
	`);
	scene.environment = envTex;
	scene.environmentIntensity = 0.55;

	// the night over the temple, and the fire round it
	scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x4a2a12, 0.55));
	const moon = new THREE.DirectionalLight(0xdfe6ff, 1.6);
	moon.position.set(-4, 14, -6);
	moon.castShadow = true;
	moon.shadow.mapSize.set(2048, 2048);
	Object.assign(moon.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
	moon.shadow.bias = -0.0006;
	scene.add(moon);
	const warm = new THREE.DirectionalLight(0xffa860, 0.7);
	warm.position.set(6, 6, 8);
	scene.add(warm);
	const fireLights = [];
	for (const [x, z] of [[-8.6, -8.6], [8.6, -8.6], [-8.6, 8.6], [8.6, 8.6]]) {
		const l = new THREE.PointLight(0xff8a2a, 18, 12, 1.6);
		l.position.set(x, 2.4, z);
		scene.add(l);
		fireLights.push(l);
	}

	/* textures, painted */

	function noiseFill(c, w, h, base, spread, n, seed) {
		let s = seed;
		const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
		c.fillStyle = base;
		c.fillRect(0, 0, w, h);
		for (let i = 0; i < n; i++) {
			const v = (rnd() - 0.5) * spread;
			c.fillStyle = v > 0 ? `rgba(255,240,210,${v})` : `rgba(40,20,5,${-v})`;
			const r = 1 + rnd() * 3;
			c.fillRect(rnd() * w, rnd() * h, r, r);
		}
	}
	const TEX = {};
	// the temple floor: sandstone flags, one a square, a greek key round the edge
	TEX.floor = canvasTexture(1024, 1024, function (c, w) {
		noiseFill(c, w, w, '#b98d55', 0.22, 26000, 7);
		const s = w / N;
		let k = 3;
		for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
			k = (k * 1103515245 + 12345) >>> 0;
			const tint = (k % 100) / 100;
			c.fillStyle = `rgba(${tint > 0.5 ? '255,230,180' : '70,40,10'},${0.04 + (tint % 0.5) * 0.12})`;
			c.fillRect(q * s, r * s, s, s);
			c.strokeStyle = 'rgba(60,34,12,0.55)';
			c.lineWidth = 3;
			c.strokeRect(q * s + 1.5, r * s + 1.5, s - 3, s - 3);
			c.strokeStyle = 'rgba(255,236,200,0.18)';
			c.lineWidth = 2;
			c.beginPath(); c.moveTo(q * s + 4, r * s + s - 4); c.lineTo(q * s + 4, r * s + 4); c.lineTo(q * s + s - 4, r * s + 4); c.stroke();
		}
		// cracks
		c.strokeStyle = 'rgba(50,28,8,0.45)';
		c.lineWidth = 1.5;
		for (let i = 0; i < 40; i++) {
			k = (k * 1103515245 + 12345) >>> 0;
			let x = k % w, y = (k >>> 10) % w;
			c.beginPath(); c.moveTo(x, y);
			for (let j = 0; j < 5; j++) { k = (k * 1103515245 + 12345) >>> 0; x += (k % 40) - 20; y += ((k >>> 8) % 40) - 20; c.lineTo(x, y); }
			c.stroke();
		}
	});
	TEX.floor.anisotropy = 8;
	// the platform's rim: a greek key
	TEX.rim = canvasTexture(1024, 64, function (c, w, h) {
		c.fillStyle = '#6e4a22';
		c.fillRect(0, 0, w, h);
		c.strokeStyle = '#e8c27a';
		c.lineWidth = 6;
		const u = 32;
		c.beginPath();
		for (let x = 0; x < w; x += u * 2) {
			c.moveTo(x, h - 12); c.lineTo(x, 12); c.lineTo(x + u * 1.5, 12); c.lineTo(x + u * 1.5, h - 24);
			c.lineTo(x + u * 0.6, h - 24); c.lineTo(x + u * 0.6, h * 0.45); c.moveTo(x + u * 1.5, h - 12); c.lineTo(x + u * 2, h - 12);
		}
		c.stroke();
	});
	TEX.rim.wrapS = THREE.RepeatWrapping;
	TEX.rim.repeat.set(3, 1);
	// the basalt beyond the moat
	TEX.basalt = canvasTexture(512, 512, function (c, w) {
		noiseFill(c, w, w, '#2a2220', 0.25, 12000, 11);
		c.strokeStyle = 'rgba(0,0,0,0.6)';
		c.lineWidth = 4;
		for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * w / 4); c.lineTo(w, i * w / 4); c.stroke(); c.beginPath(); c.moveTo(i * w / 4 + (i % 2) * 20, 0); c.lineTo(i * w / 4 + (i % 2) * 20, w); c.stroke(); }
	});
	TEX.basalt.wrapS = TEX.basalt.wrapT = THREE.RepeatWrapping;
	TEX.basalt.repeat.set(6, 6);
	// lava
	TEX.lava = canvasTexture(512, 512, function (c, w) {
		c.fillStyle = '#5a0e02';
		c.fillRect(0, 0, w, w);
		let k = 5;
		for (let i = 0; i < 260; i++) {
			k = (k * 1103515245 + 12345) >>> 0;
			const x = k % w, y = (k >>> 9) % w, r = 10 + (k >>> 20) % 50;
			const g = c.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, 'rgba(255,200,60,0.9)');
			g.addColorStop(0.4, 'rgba(255,90,10,0.6)');
			g.addColorStop(1, 'rgba(120,10,0,0)');
			c.fillStyle = g;
			c.fillRect(x - r, y - r, r * 2, r * 2);
		}
	});
	TEX.lava.wrapS = TEX.lava.wrapT = THREE.RepeatWrapping;
	TEX.lava.repeat.set(4, 4);
	// carved stone for the blocks: a chiselled face, and a lighter top with a glyph
	TEX.block = canvasTexture(256, 256, function (c, w) {
		noiseFill(c, w, w, '#9c7442', 0.3, 7000, 21);
		c.strokeStyle = 'rgba(40,22,6,0.7)';
		c.lineWidth = 6;
		c.strokeRect(3, 3, w - 6, w - 6);
		c.strokeStyle = 'rgba(40,22,6,0.35)';
		c.lineWidth = 3;
		c.beginPath(); c.moveTo(0, w * 0.5); c.lineTo(w, w * 0.5); c.moveTo(w * 0.5, 0); c.lineTo(w * 0.5, w * 0.5); c.stroke();
	});
	TEX.cap = canvasTexture(256, 256, function (c, w) {
		noiseFill(c, w, w, '#d2a866', 0.25, 6000, 31);
		c.strokeStyle = 'rgba(70,40,12,0.6)';
		c.lineWidth = 8;
		c.strokeRect(10, 10, w - 20, w - 20);
		c.lineWidth = 6;
		c.beginPath();
		c.moveTo(w * 0.3, w * 0.7); c.lineTo(w * 0.3, w * 0.3); c.lineTo(w * 0.7, w * 0.3); c.lineTo(w * 0.7, w * 0.62); c.lineTo(w * 0.45, w * 0.62); c.lineTo(w * 0.45, w * 0.45);
		c.stroke();
	});
	TEX.rune = canvasTexture(256, 256, function (c, w) {
		c.clearRect(0, 0, w, w);
		c.strokeStyle = 'rgba(255,220,140,1)';
		c.lineWidth = 8;
		c.beginPath(); c.arc(w / 2, w / 2, w * 0.42, 0, Math.PI * 2); c.stroke();
		c.lineWidth = 4;
		c.beginPath(); c.arc(w / 2, w / 2, w * 0.32, 0, Math.PI * 2); c.stroke();
		for (let i = 0; i < 8; i++) {
			const a = i / 8 * Math.PI * 2;
			c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * w * 0.33, w / 2 + Math.sin(a) * w * 0.33); c.lineTo(w / 2 + Math.cos(a) * w * 0.41, w / 2 + Math.sin(a) * w * 0.41); c.stroke();
		}
	});
	TEX.soft = canvasTexture(128, 128, function (c, w) {
		const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, w, w);
	});

	// THE SPARK, after Tile Runner's drawSpark: a long thin streak across, a shorter one up and
	// down, two quiet ones on the diagonals, a glow in the middle and a white-hot heart. Each streak
	// is a radial gradient squashed flat, brightest at its heart and thinning along and across it.
	// Painted once (the cross, and the diagonals apart so they can turn), stamped as sprites, and
	// it shimmers by itself: every part breathes on a clock of its own (sparkle, below).
	const SPARK = { h: 2.4, hW: 0.08, hA: 1.0, v: 1.35, vW: 0.07, vA: 0.9, d: 1.5, dW: 0.05, dA: 0.45, fall: 1.8, glow: 1.05, glowA: 0.55, core: 0.12, coreA: 1.0, breathe: 0.16, twinkle: 0.2, ms: 2600, size: 0.6, col: [255, 228, 92] };
	function paintStreak(c, cx, cy, rx, ry, a, rgb) {
		const STOPS = [0, 0.06, 0.16, 0.3, 0.48, 0.7, 1];
		c.save();
		c.translate(cx, cy);
		c.scale(rx, ry);
		const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
		for (const u of STOPS) g.addColorStop(u, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * Math.pow(1 - u, SPARK.fall)})`);
		c.fillStyle = g;
		c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
		c.restore();
	}
	const SPARK_REACH = SPARK.h;   // (the pictures are 2 x reach sizes across)
	TEX.sparkCross = canvasTexture(512, 512, function (c, w) {
		const u = w / 2 / SPARK_REACH, m = w / 2;   // one size, in pixels
		c.globalCompositeOperation = 'lighter';
		paintStreak(c, m, m, SPARK.glow * u, SPARK.glow * u, SPARK.glowA * 0.6, SPARK.col);
		paintStreak(c, m, m, SPARK.vW * u, SPARK.v * u, SPARK.vA, SPARK.col);
		paintStreak(c, m, m, SPARK.h * u, SPARK.hW * u, SPARK.hA, SPARK.col);
		paintStreak(c, m, m, SPARK.core * u, SPARK.core * u, SPARK.coreA, [255, 255, 255]);
	});
	TEX.sparkDiag = canvasTexture(512, 512, function (c, w) {
		const u = w / 2 / SPARK_REACH, m = w / 2;
		c.globalCompositeOperation = 'lighter';
		c.translate(m, m);
		c.rotate(Math.PI / 4);
		paintStreak(c, 0, 0, SPARK.d * u, SPARK.dW * u, SPARK.dA, SPARK.col);
		paintStreak(c, 0, 0, SPARK.dW * u, SPARK.d * u, SPARK.dA, SPARK.col);
	});
	const SPARK_MAT = {};
	SPARK_MAT.cross = new THREE.SpriteMaterial({ map: TEX.sparkCross, color: new THREE.Color(2.1, 2.1, 2.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
	SPARK_MAT.diag = new THREE.SpriteMaterial({ map: TEX.sparkDiag, color: new THREE.Color(2.1, 2.1, 2.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
	// each coin's spark, every frame: it flickers on three sines that never line up, the streaks
	// breathe on their own clocks, and the diagonals turn slowly
	function sparkle(c, x, y, z, s) {
		const TAU = Math.PI * 2, P = SPARK, tt = rt * 1000 / P.ms + c.seed;
		const wave = (f, ph) => Math.sin(TAU * (tt * f + ph));
		const tw = Math.max(0, 1 + P.twinkle * (0.55 * wave(1, 0) + 0.3 * wave(2.37, 0.18) + 0.15 * wave(5.13, 0.41)));
		const bh = 1 + P.breathe * wave(0.83, 0.07), bv = 1 + P.breathe * wave(1.19, 0.33), bd = 1 + P.breathe * wave(1.61, 0.64);
		const td = Math.max(0, 1 + P.twinkle * wave(1.43, 0.52));
		const size = 0.4 * P.size * s;   // (a share of the coin's width)
		const across = size * SPARK_REACH * 2;
		c.cross.visible = c.diag.visible = c.mesh.visible;
		c.cross.position.set(x, y, z);
		c.diag.position.set(x, y, z);
		c.cross.scale.set(across * bh, across * bv, 1);
		c.diag.scale.set(across * bd, across * bd, 1);
		c.cross.material.opacity = Math.min(1, tw);
		c.diag.material.opacity = Math.min(1, td);
		c.diag.material.rotation = (6 * rt) * Math.PI / 180;
	}

	/* the temple itself */

	const MAT = {
		floor: new THREE.MeshStandardMaterial({ map: TEX.floor, roughness: 0.82, metalness: 0 }),
		rim: new THREE.MeshStandardMaterial({ map: TEX.rim, roughness: 0.7 }),
		basalt: new THREE.MeshStandardMaterial({ map: TEX.basalt, roughness: 0.9 }),
		lava: new THREE.MeshStandardMaterial({ color: 0x220400, emissive: 0xffffff, emissiveMap: TEX.lava, emissiveIntensity: 1.6, roughness: 1 }),
		block: new THREE.MeshStandardMaterial({ map: TEX.block, roughness: 0.85 }),
		cap: new THREE.MeshStandardMaterial({ map: TEX.cap, roughness: 0.8 }),
		marble: new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.5 }),
		bronze: new THREE.MeshStandardMaterial({ color: 0x9a6a2a, metalness: 0.8, roughness: 0.35 }),
		iron: new THREE.MeshStandardMaterial({ color: 0xd8dce6, metalness: 0.6, roughness: 0.25, emissive: 0x5a5f6a, emissiveIntensity: 0.6 }),
		gold: new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.55, roughness: 0.3, emissive: 0xffa21a, emissiveIntensity: 0.55 }),
		coin: new THREE.MeshStandardMaterial({ color: 0xffcf45, metalness: 0.7, roughness: 0.32, emissive: 0xff9a10, emissiveIntensity: 0.14 }),
		coinRim: new THREE.MeshStandardMaterial({ color: 0x9a5e0c, metalness: 0.75, roughness: 0.4, emissive: 0x3a1a00, emissiveIntensity: 0.3 }),
		wood: new THREE.MeshStandardMaterial({ color: 0x6a3d1c, roughness: 0.7 }),
		dark: new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.6 }),
		flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.4, 0.3), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
		rune: new THREE.MeshBasicMaterial({ map: TEX.rune, color: new THREE.Color(0.6, 0.4, 0.15), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
		runeLit: new THREE.MeshBasicMaterial({ map: TEX.rune, color: new THREE.Color(2.6, 1.8, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
		beam: new THREE.MeshBasicMaterial({ map: TEX.soft, color: new THREE.Color(1.6, 1.1, 0.3), transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
		glow: new THREE.MeshBasicMaterial({ map: TEX.soft, color: new THREE.Color(0.55, 0.3, 0.08), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
	};

	// the platform the maze is laid on
	const platform = new THREE.Mesh(new THREE.BoxGeometry(SIZE, 1.2, SIZE), [MAT.rim, MAT.rim, MAT.floor, MAT.rim, MAT.rim, MAT.rim]);
	platform.position.y = -0.6;
	platform.receiveShadow = true;
	scene.add(platform);
	// (a carved kerb round it, outside the squares, so the floor's flags line up with the maze)
	for (const [x, z, w, d] of [[0, -HALF - 0.12, SIZE + 0.48, 0.24], [0, HALF + 0.12, SIZE + 0.48, 0.24], [-HALF - 0.12, 0, 0.24, SIZE], [HALF + 0.12, 0, 0.24, SIZE]]) {
		const k = new THREE.Mesh(new THREE.BoxGeometry(w, 1.26, d), MAT.rim);
		k.position.set(x, -0.6, z);
		k.receiveShadow = true;
		scene.add(k);
	}
	// the lava moat, and the basalt beyond it
	const lava = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), MAT.lava);
	lava.rotation.x = -Math.PI / 2;
	lava.position.y = -0.7;
	scene.add(lava);
	const OUT = 7.4, FAR = 26;
	for (const [x, z, w, d] of [[0, -(OUT + FAR) / 2, FAR * 2, FAR - OUT], [0, (OUT + FAR) / 2, FAR * 2, FAR - OUT], [-(OUT + FAR) / 2, 0, FAR - OUT, OUT * 2], [(OUT + FAR) / 2, 0, FAR - OUT, OUT * 2]]) {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), MAT.basalt);
		m.position.set(x, -0.5, z);
		m.receiveShadow = true;
		scene.add(m);
	}
	// pillars at the corners, braziers along the sides
	function pillar(x, z) {
		const g = new THREE.Group();
		const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), MAT.marble);
		base.position.y = 0.15;
		const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 3.2, 20), MAT.marble);
		shaft.position.y = 1.9;
		const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.25), MAT.marble);
		top.position.y = 3.65;
		const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.35, 18), MAT.bronze);
		bowl.position.y = 4.0;
		for (const m of [base, shaft, top, bowl]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
		const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 12), MAT.flame);
		fire.position.y = 4.6;
		g.add(fire);
		flames.push(fire);
		g.position.set(x, 0, z);
		scene.add(g);
	}
	function brazier(x, z) {
		const g = new THREE.Group();
		const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.7, 8), MAT.bronze);
		leg.position.y = 0.35;
		const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.18, 0.25, 16), MAT.bronze);
		bowl.position.y = 0.8;
		for (const m of [leg, bowl]) { m.castShadow = true; g.add(m); }
		const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), MAT.flame);
		fire.position.y = 1.2;
		g.add(fire);
		flames.push(fire);
		const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), MAT.glow);
		glow.rotation.x = -Math.PI / 2;
		glow.position.y = 0.02;
		g.add(glow);
		g.position.set(x, 0, z);
		scene.add(g);
	}
	const flames = [];
	for (const sx of [-1, 1]) for (const sz of [-1, 1]) pillar(sx * 8.6, sz * 8.6);
	for (const s of [-1, 1]) for (const k of [-3.2, 3.2]) { brazier(s * 8.4, k); brazier(k, s * 8.4); }

	/* the pieces of a temple */

	let levelGroup = null;
	let wallMeshes = [];
	const sinking = [];
	function sinkLevel() {
		if (levelGroup) sinking.push({ g: levelGroup, t: 0 });
		levelGroup = null;
	}

	const GEO = {
		block: new THREE.BoxGeometry(CS * 0.96, WALL_H, CS * 0.96),
		cap: new THREE.BoxGeometry(CS * 1.0, 0.08, CS * 1.0),
		coin: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32),   // (lying flat: seen from above, a coin's face is what shows)
		coinRim: new THREE.TorusGeometry(0.2, 0.026, 8, 32).rotateX(Math.PI / 2),
		coinBoss: new THREE.CylinderGeometry(0.12, 0.14, 0.03, 28),
		coinEdge: new THREE.TorusGeometry(0.13, 0.012, 6, 28).rotateX(Math.PI / 2),
		gem: new THREE.OctahedronGeometry(0.07),
		pad: new THREE.CylinderGeometry(0.42, 0.46, 0.06, 28),
		rune: new THREE.PlaneGeometry(1.0, 1.0),
		shadow: new THREE.PlaneGeometry(1, 1),
		spikes: spikeGeometry(),
	};
	// a block's spikes, as one mesh: rows of them sticking out of every side,
	// where you'd walk into them (and a few short ones along the top edge)
	function spikeGeometry() {
		const parts = [];
		const add = (g) => parts.push(g.toNonIndexed());
		const face = CS * 0.48;
		for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			[[0.16, [-0.24, 0, 0.24]], [0.42, [-0.12, 0.12]]].forEach(function ([y, offs], row) {
				for (const off of offs) {
					const len = SPIKE - (row ? 0.04 : 0);
					const c = new THREE.ConeGeometry(0.075, len, 8).rotateX(Math.PI / 2);   // (pointing along +z)
					c.rotateY(Math.atan2(dx, dz));
					const out = face + len / 2;
					c.translate(dx * out + (dz ? off * CS / 0.75 : 0), y * WALL_H / 0.62, dz * out + (dx ? off * CS / 0.75 : 0));
					add(c);
				}
			});
		}
		for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) {
			add(new THREE.ConeGeometry(0.05, 0.14, 6).translate(x * CS / 0.75, WALL_H + 0.15, z * CS / 0.75));
		}
		const out = new THREE.BufferGeometry();
		for (const name of ['position', 'normal', 'uv']) {
			const arrays = parts.map((g) => g.attributes[name].array);
			const merged = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
			let at = 0;
			for (const a of arrays) { merged.set(a, at); at += a.length; }
			out.setAttribute(name, new THREE.BufferAttribute(merged, parts[0].attributes[name].itemSize));
		}
		return out;
	}
	const MAT_SHADOW = new THREE.MeshBasicMaterial({ map: TEX.soft, color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false });

	function makeBlock(group, x, z, delay) {
		const g = new THREE.Group();
		const m = new THREE.Mesh(GEO.block, MAT.block);
		m.position.y = WALL_H / 2;
		const cap = new THREE.Mesh(GEO.cap, MAT.cap);
		cap.position.y = WALL_H + 0.04;
		const spikes = new THREE.Mesh(GEO.spikes, MAT.iron);
		spikes.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2;   // (so the blocks don't all match)
		for (const k of [m, cap, spikes]) { k.castShadow = true; k.receiveShadow = true; g.add(k); }
		g.position.set(x, 0, z);
		g.userData.rise = -delay;
		g.scale.y = 0.001;
		group.add(g);
		return g;
	}
	function makeCoin(group, x, z, value, delay) {
		const g = new THREE.Group();
		const face = new THREE.Mesh(GEO.coin, MAT.coin);
		const rim = new THREE.Mesh(GEO.coinRim, MAT.coinRim);
		const boss = new THREE.Mesh(GEO.coinBoss, MAT.coin);   // (the raised middle, so the face catches the light)
		boss.position.y = 0.03;
		const edge = new THREE.Mesh(GEO.coinEdge, MAT.coinRim);
		edge.position.y = 0.029;
		for (const m of [face, rim, boss, edge]) { m.castShadow = true; g.add(m); }
		if (value >= BIG) {
			const gem = new THREE.Mesh(GEO.gem, new THREE.MeshStandardMaterial({ color: 0xff2a4a, emissive: 0xff1030, emissiveIntensity: 1.4, roughness: 0.2 }));
			gem.position.y = 0.04;
			g.add(gem);
			g.scale.setScalar(1.55);
		}
		const sh = new THREE.Mesh(GEO.shadow, MAT_SHADOW);
		sh.rotation.x = -Math.PI / 2;
		sh.scale.setScalar(0.62);   // (a good dark shadow under each, so it stands off the floor)
		sh.position.set(x, 0.01, z);
		group.add(sh);
		// the spark (after Tile Runner's): a cross of light behind the coin, and two quiet diagonals turning through it
		const cross = new THREE.Sprite(SPARK_MAT.cross.clone());
		const diag = new THREE.Sprite(SPARK_MAT.diag.clone());
		for (const sp of [cross, diag]) { sp.renderOrder = 2; group.add(sp); }
		g.rotation.order = 'YXZ';
		g.position.set(x, 0.3, z);
		group.add(g);
		return { x, z, value, present: true, fly: 1, fx: x, fz: z, mesh: g, shadow: sh, cross, diag, seed: Math.random(), spin: Math.random() * 6, pop: -delay, big: value >= BIG, c: colOf(x), r: rowOf(z) };
	}
	function makeExit(group, x, z) {
		const pad = new THREE.Mesh(GEO.pad, MAT.bronze);
		pad.position.set(x, 0.03, z);
		pad.receiveShadow = true;
		group.add(pad);
		const rune = new THREE.Mesh(GEO.rune, MAT.rune);
		rune.rotation.x = -Math.PI / 2;
		rune.position.set(x, 0.07, z);
		group.add(rune);
		return { x, z, pad, rune };
	}

	// the chest (one, moved to whichever exit is open)
	const chestG = new THREE.Group();
	{
		const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.44), MAT.wood);
		base.position.y = 0.17;
		chestG.add(base);
		for (const x of [-0.24, 0.24]) {
			const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.46), MAT.gold);
			band.position.set(x, 0.18, 0);
			chestG.add(band);
		}
		const hinge = new THREE.Group();
		hinge.position.set(0, 0.34, -0.22);
		const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.62, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), MAT.wood);
		lid.position.z = 0.22;
		const lidBand = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), MAT.gold);
		lidBand.position.z = 0.22;
		hinge.add(lid, lidBand);
		chestG.add(hinge);
		chestG.userData.hinge = hinge;
		const hoard = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold);
		hoard.scale.set(1.25, 0.5, 0.9);
		hoard.position.y = 0.32;
		chestG.add(hoard);
		const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 3.2, 24, 1, true), MAT.beam);
		beam.position.y = 1.6;
		chestG.add(beam);
		chestG.userData.beam = beam;
		const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), MAT.glow);
		glow.rotation.x = -Math.PI / 2;
		glow.position.y = 0.05;
		chestG.add(glow);
		chestG.userData.glow = glow;
		chestG.traverse((m) => { if (m.isMesh && m.material !== MAT.beam && m.material !== MAT.glow) m.castShadow = true; });
		scene.add(chestG);
	}
	const chestLight = new THREE.PointLight(0xffc860, 10, 4, 1.6);
	scene.add(chestLight);

	// ghosts: a sheet with a wavy hem, two dark eyes and glowing pupils
	const GHOST_GEO = (function () {
		const pts = [];
		for (let k = 0; k <= 12; k++) {
			const a = k / 12 * Math.PI / 2;
			pts.push(new THREE.Vector2(Math.cos(a) * 0.3, 0.32 + Math.sin(a) * 0.3));
		}
		pts.reverse();
		pts.push(new THREE.Vector2(0.3, 0.32), new THREE.Vector2(0.33, 0.06));
		const g = new THREE.LatheGeometry(pts, 28);
		// a wavy hem
		const p = g.attributes.position;
		for (let i = 0; i < p.count; i++) {
			if (p.getY(i) < 0.1) {
				const a = Math.atan2(p.getZ(i), p.getX(i));
				p.setY(i, p.getY(i) + Math.sin(a * 6) * 0.05 + 0.03);
			}
		}
		g.computeVertexNormals();
		return g;
	})();
	const EYE_GEO = new THREE.SphereGeometry(0.06, 12, 8);
	const PUPIL_GEO = new THREE.SphereGeometry(0.03, 8, 6);
	function makeGhost(group, kind, c, r, delay) {
		const look = GHOST_LOOK[kind];
		const g = new THREE.Group();
		const mat = new THREE.MeshPhysicalMaterial({ color: look.body, emissive: look.body, emissiveIntensity: 0.25, roughness: 0.35, transparent: true, opacity: 0.88, clearcoat: 0.6 });
		const body = new THREE.Mesh(GHOST_GEO, mat);
		body.castShadow = true;
		g.add(body);
		const pupilMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...look.eye) });
		for (const s of [-1, 1]) {
			const eye = new THREE.Mesh(EYE_GEO, MAT.dark);
			eye.scale.set(0.8, 1.2, 0.6);
			eye.position.set(s * 0.1, 0.5, 0.25);
			eye.rotation.x = -0.5;
			const pupil = new THREE.Mesh(PUPIL_GEO, pupilMat);
			pupil.position.set(s * 0.1, 0.52, 0.29);
			g.add(eye, pupil);
		}
		const size = (kind === 'F' ? 1.45 : 1) * 1.25;
		g.scale.setScalar(size);
		const sh = new THREE.Mesh(GEO.shadow, MAT_SHADOW);
		sh.rotation.x = -Math.PI / 2;
		sh.scale.setScalar(0.7 * size);
		group.add(sh);
		group.add(g);
		const gh = { kind, c0: c, r0: r, x: cellX(c), z: cellZ(r), path: [], mode: 'idle', target: -1, lostT: 0, wait: Math.random(), face: Math.PI, bob: Math.random() * 6, appear: delay, dead: false, deadT: 0, mesh: g, mat, pupilMat, shadow: sh, size, of: 0, leg: 0 };
		if (kind === 'P') gh.ends = patrolEnds(c, r);
		if (kind === 'I') {
			gh.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.6 }));
			group.add(gh.trail);
		}
		return gh;
	}

	// powerups: a gem turning over a ring
	function makePowerMesh(kind) {
		const col = new THREE.Color(POWERS[kind].color);
		const g = new THREE.Group();
		const geo = kind === 'grow' ? new THREE.IcosahedronGeometry(0.17) : kind === 'double' ? new THREE.TorusKnotGeometry(0.1, 0.035, 48, 8) : kind === 'eater' ? new THREE.SphereGeometry(0.16, 16, 12) : new THREE.OctahedronGeometry(0.18);
		const gem = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.3, roughness: 0.2, metalness: 0.3 }));
		gem.castShadow = true;
		g.add(gem);
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.31, 32), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = -0.42;
		g.add(ring);
		g.userData.gem = gem;
		return g;
	}

	// the explorers: a round body in their colour, a pith helmet, and a ring of light at their feet
	const xMeshes = [];
	function buildExplorer(n) {
		const col = new THREE.Color(colour(n));
		const g = new THREE.Group();
		const bodyMat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2, emissive: col, emissiveIntensity: 0.12 });
		const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), bodyMat);
		body.scale.set(1, 1.08, 0.95);
		body.position.y = 0.22;
		const belt = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), MAT.wood);
		belt.rotation.x = Math.PI / 2;
		belt.position.y = 0.17;
		const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf1e2bd, roughness: 0.6 }));
		helmet.position.y = 0.36;
		helmet.scale.set(1, 0.9, 1.05);
		const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 24), helmet.material);
		brim.position.y = 0.37;
		const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.04, 20), new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.6), roughness: 0.5 }));
		band.position.y = 0.4;
		const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
		const g2 = new THREE.Group();
		for (const s of [-1, 1]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMat);
			eye.position.set(s * 0.07, 0.29, 0.17);
			const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), MAT.dark);
			pupil.position.set(s * 0.07, 0.29, 0.21);
			g2.add(eye, pupil);
		}
		const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.8, 0.6) }));
		lantern.position.set(0.21, 0.16, 0.05);
		for (const m of [body, belt, helmet, brim, band]) { m.castShadow = true; g.add(m); }
		g.add(g2, lantern);
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 32), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.8), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.015;
		const shield = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.1, 1.8), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
		shield.position.y = 0.24;
		const root = new THREE.Group();
		root.add(g, ring, shield);
		root.userData = { body: g, ring, shield, bodyMat };
		root.visible = false;
		scene.add(root);
		xMeshes[n] = root;
	}

	// the Minotaur: a hulking bull-man of primitives
	function makeBoss(group) {
		const g = new THREE.Group();
		const fur = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.85 });
		const hide = new THREE.MeshStandardMaterial({ color: 0x3a1e0e, roughness: 0.8 });
		const bone = new THREE.MeshStandardMaterial({ color: 0xeee2c4, roughness: 0.45 });
		const torso = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), fur);
		torso.scale.set(1.25, 0.95, 0.85);
		torso.position.y = 0.75;
		const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 12), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.8 }));
		belly.position.set(0, 0.68, 0.2);
		belly.scale.set(1, 0.9, 0.6);
		const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), hide);
		head.scale.set(1, 0.9, 1.2);
		head.position.set(0, 1.25, 0.3);
		const snout = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.7 }));
		snout.scale.set(1.2, 0.8, 0.9);
		snout.position.set(0, 1.15, 0.6);
		const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 18), MAT.gold);
		ringM.position.set(0, 1.04, 0.7);
		const parts = [torso, belly, head, snout, ringM];
		for (const s of [-1, 1]) {
			const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 10), bone);
			horn.position.set(s * 0.33, 1.45, 0.25);
			horn.rotation.z = -s * 1.0;
			horn.rotation.x = 0.4;
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.2) }));
			eye.position.set(s * 0.13, 1.3, 0.6);
			const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 6, 10), fur);
			arm.position.set(s * 0.68, 0.7, 0.1);
			arm.rotation.z = s * 0.35;
			const fist = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), hide);
			fist.position.set(s * 0.8, 0.38, 0.18);
			const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 10), hide);
			leg.position.set(s * 0.28, 0.25, -0.05);
			parts.push(horn, eye, arm, fist, leg);
		}
		for (const m of parts) { m.castShadow = true; g.add(m); }
		g.userData.flashMats = [fur, hide];
		const tele = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.1), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
		tele.rotation.order = 'YXZ';
		tele.visible = false;
		group.add(tele);
		const sh = new THREE.Mesh(GEO.shadow, MAT_SHADOW);
		sh.rotation.x = -Math.PI / 2;
		sh.scale.setScalar(1.8);
		group.add(sh);
		group.add(g);
		return { x: 0, z: 0, face: Math.PI, hp: 3, state: 'enter', t: 0, flash: 0, mesh: g, tele, shadow: sh, throwAnim: 0 };
	}

	function makeBomb() {
		const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 0.3, metalness: 0.4 }));
		m.castShadow = true;
		const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2, 0.4) }));
		spark.position.y = 0.17;
		m.add(spark);
		scene.add(m);
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.3, 0.1), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
		ring.rotation.x = -Math.PI / 2;
		scene.add(ring);
		m.userData.ring = ring;
		return m;
	}
	function makeBlast(hex) {
		const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(2.5), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
		scene.add(m);
		return m;
	}

	/* the cameras: one a wall, each looking down on the whole temple from its own side */

	const PITCH = 60 * Math.PI / 180;
	const FOV = 36;
	const FWD = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)];   // (facing the left, front and right walls)
	const cams = FWD.map(function (f) {
		const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 120);
		fitCamera(cam, f);
		return cam;
	});
	// Place a camera so the temple's near edge sits just above the score
	// capsules and its far edge just under the clock: pitched down PITCH, at
	// whatever distance and aim does that.
	function fitCamera(cam, f) {
		const near = f.clone().multiplyScalar(-HALF), far = f.clone().multiplyScalar(HALF);
		const dir = new THREE.Vector3(f.x * Math.cos(PITCH), -Math.sin(PITCH), f.z * Math.cos(PITCH));
		const place = (d, aim) => {
			const target = f.clone().multiplyScalar(aim);
			cam.position.copy(target).addScaledVector(dir, -d);
			cam.lookAt(target);
			cam.updateMatrixWorld();
		};
		const y = (v) => v.clone().project(cam).y;
		const TOP = 0.8, BOTTOM = -0.78;
		let lo = 4, hi = 90;
		for (let i = 0; i < 40; i++) {
			const d = (lo + hi) / 2;
			let a = -HALF, b = HALF;
			for (let j = 0; j < 40; j++) {
				const aim = (a + b) / 2;
				place(d, aim);
				if ((y(near) + y(far)) / 2 > (TOP + BOTTOM) / 2) a = aim; else b = aim;
			}
			place(d, (a + b) / 2);
			if (y(far) - y(near) > TOP - BOTTOM) lo = d; else hi = d;
		}
	}
	function views() {
		const w = renderer.domElement.width, h = renderer.domElement.height;
		return cams.map((camera, i) => {
			const x0 = Math.round(i * w / 3), x1 = Math.round((i + 1) * w / 3);
			return { camera, x: x0, y: 0, width: x1 - x0, height: h };
		});
	}
	const _v = new THREE.Vector3();
	function proj(wall, x, y, z) {
		_v.set(x, y, z);
		return toScreen(_v, cams[wall], wall * W, 0, W, H) || { x: wall * W + W / 2, y: H / 2 };
	}
	const camHome = cams.map((c) => c.position.clone());
	let shake = 0;

	/* every frame: the 3D catches up with the game */

	let rt = 0;
	function update3D(dt) {
		rt += dt;
		shake = Math.max(0, shake - dt);
		cams.forEach((c, i) => {
			c.position.copy(camHome[i]);
			if (shake > 0) { c.position.x += (Math.random() - 0.5) * shake * 0.4; c.position.z += (Math.random() - 0.5) * shake * 0.4; }
		});
		TEX.lava.offset.set(rt * 0.02, rt * 0.013);
		MAT.lava.emissiveIntensity = 1.5 + Math.sin(rt * 1.3) * 0.2;
		flames.forEach((f, i) => { const k = 1 + Math.sin(rt * 13 + i * 2.1) * 0.12 + Math.sin(rt * 7.3 + i) * 0.08; f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); });
		fireLights.forEach((l, i) => { l.intensity = 16 + Math.sin(rt * 11 + i * 1.7) * 3; });

		// the old temple sinks, the new one rises
		for (const s of sinking) {
			s.t += dt;
			s.g.position.y = -easeOut(s.t / 0.7) * 1.4;
			if (s.t > 0.75) scene.remove(s.g);
		}
		for (let k = sinking.length - 1; k >= 0; k--) if (sinking[k].t > 0.75) sinking.splice(k, 1);
		if (levelGroup) {
			levelGroup.children.forEach(function (m) {
				const u = m.userData;
				if (u.rise !== undefined && u.rise < 1) { u.rise += dt * 2.2; m.scale.y = Math.max(0.001, easeOut(u.rise)); }
				if (u.smash !== undefined) { u.smash += dt; m.scale.y = Math.max(0.001, 1 - u.smash * 3); m.rotation.y += dt * 4; if (u.smash > 0.4) m.visible = false; }
			});
		}

		// gold
		for (const c of coins) {
			c.spin += dt * 2.4;
			if (c.pop < 1) c.pop += dt * 2.5;
			if (c.drop) c.drop = Math.max(0, c.drop - dt * 2);
			if (c.fly < 1) c.fly = Math.min(1, c.fly + dt * 1.6);
			const k = easeOut(c.fly);
			const x = lerp(c.fx, c.x, k), z = lerp(c.fz, c.z, k);
			const arc = Math.sin(k * Math.PI) * 1.6;
			c.mesh.visible = c.present && c.pop > 0;
			c.shadow.visible = c.mesh.visible;
			const s = (c.big ? 1.55 : 1) * 1.3 * easeOut(Math.max(0, c.pop));
			c.mesh.scale.setScalar(Math.max(0.001, s));
			c.mesh.position.set(x, 0.36 + Math.sin(c.spin * 0.8) * 0.05 + arc + (c.drop || 0) * 4, z);   // (drop: only the coins the treasury rains)
			c.mesh.rotation.set(0.55, c.spin, 0);   // (tipped back a little, turning: it glints as it goes round)
			sparkle(c, x, c.mesh.position.y, z, s);
			c.shadow.position.set(x, 0.012, z);
		}

		// the exits, and the chest on the open one
		exits.forEach((e, k) => { e.rune.material = k === chest.at ? MAT.runeLit : MAT.rune; e.rune.rotation.z = rt * (k === chest.at ? 0.8 : 0.1); });
		const at = exits[chest.at];
		chestG.visible = !!at && !!levelGroup;
		chestLight.visible = chestG.visible;
		if (at) {
			const sh = chest.shake > 0 ? Math.sin(rt * 40) * 0.05 * (0.4 + chest.shake) : 0;
			const pop = easeOut(chest.open);
			chestG.position.set(at.x + sh, 0.06, at.z);
			chestG.scale.setScalar(Math.max(0.001, pop) * (1 + chest.burst * 0.25));
			chestG.userData.hinge.rotation.x = -1.1 - Math.sin(rt * 3) * 0.06 - chest.burst * 0.5;
			chestG.userData.beam.material.opacity = 0.22 + Math.sin(rt * 3) * 0.06 + chest.burst * 0.4;
			chestG.userData.beam.scale.set(1 + chest.burst * 0.6, 1, 1 + chest.burst * 0.6);
			chestLight.position.set(at.x, 1.0, at.z);
			chestLight.intensity = 8 + chest.burst * 30;
		}

		// ghosts
		const scared = eaterT > 0;
		for (const g of ghosts) {
			const vis = g.appear <= 0 && !g.dead;
			const k = g.appear > 0 ? 0 : 1;
			g.mesh.visible = vis || (g.appear > 0 && g.appear < 1.2 && !g.dead);
			const grow = g.appear > 0 ? Math.max(0.001, 1 - g.appear / 1.2) : 1;
			g.mesh.scale.setScalar(g.size * grow);
			g.mesh.position.set(g.x, 0.08 + Math.sin(g.bob * 3) * 0.06, g.z);
			g.mesh.rotation.y = g.face;
			g.mesh.rotation.z = Math.sin(g.bob * 2) * 0.08;
			g.shadow.visible = g.mesh.visible;
			g.shadow.position.set(g.x, 0.012, g.z);
			const flicker = scared && eaterT < 2 && Math.sin(rt * 20) > 0;
			if (scared && !flicker) { g.mat.color.setRGB(0.2, 0.55, 1.0); g.mat.emissive.setRGB(0.1, 0.5, 1.4); g.mat.emissiveIntensity = 0.9 + Math.sin(rt * 8) * 0.3; }
			else {
				const look = GHOST_LOOK[g.kind];
				const base = g.kind === 'I' && ex[g.of] ? new THREE.Color(colour(g.of)).lerp(new THREE.Color(1, 1, 1), 0.55) : new THREE.Color(look.body);
				g.mat.color.copy(base); g.mat.emissive.copy(base);
				g.mat.emissiveIntensity = g.mode === 'chase' ? 0.55 : 0.25;
			}
			g.pupilMat.color.setRGB(...(g.mode === 'chase' && !scared ? [4, 0.3, 0.2] : GHOST_LOOK[g.kind].eye));
			if (g.trail) {
				const e = ex[g.of];
				const pts = e && vis ? e.trail.filter((p) => p.t >= t - IMPOSTER_LAG && p.t <= t).filter((p, i) => i % 3 === 0).map((p) => new THREE.Vector3(p.x, 0.05, p.z)) : [];
				g.trail.visible = pts.length > 1 && !scared;
				if (pts.length > 1) { g.trail.geometry.setFromPoints(pts); g.trail.computeLineDistances(); g.trail.material.color.set(colour(g.of)); }
			}
		}

		// powerups
		for (const pu of powerups) {
			const s = pu.taken ? Math.max(0.001, 1 - (pu.gone || 0) * 2.5) : easeOut(1 - pu.appear / 0.6);
			pu.mesh.scale.setScalar(Math.max(0.001, s));
			pu.mesh.position.y = 0.45 + Math.sin(rt * 2.5 + pu.x) * 0.07 + (pu.taken ? (pu.gone || 0) * 2 : 0);
			pu.mesh.userData.gem.rotation.set(rt * 1.3, rt * 1.9, 0);
		}

		// explorers
		for (let i = 0; i < count; i++) {
			const e = ex[i], m = xMeshes[i];
			if (!m) continue;
			m.visible = e.seen;
			if (!e.seen) continue;
			const u = m.userData;
			m.position.set(e.x, 0, e.z);
			u.body.rotation.y = e.face;
			const big = (e.grow > 0 ? 1.5 : 1) * 1.35;
			u.scale = lerp(u.scale || 1, big, 1 - Math.exp(-dt * 8));
			if (!e.alive) {
				e.squash = Math.max(0, e.squash - dt * 2);
				u.body.scale.set(u.scale * (1 + (1 - e.squash) * 0.4), Math.max(0.05, u.scale * 0.15), u.scale * (1 + (1 - e.squash) * 0.4));
				u.body.rotation.y = e.face + rt * 6;
				u.bodyMat.opacity = 0.4;
				u.bodyMat.transparent = true;
				u.ring.material.opacity = 0.3;
			} else {
				const hop = Math.abs(Math.sin(e.walk)) * 0.05;
				u.body.scale.setScalar(u.scale);
				u.body.position.y = hop;
				u.body.rotation.z = Math.sin(e.walk) * 0.12;
				u.bodyMat.transparent = false;
				u.bodyMat.opacity = 1;
				u.ring.material.opacity = 0.9;
				// flashing while shielded after a fall
				u.body.visible = !(e.inv > 0 && e.inv < SHIELD_AFTER && Math.sin(rt * 25) > 0.4);
			}
			u.ring.scale.setScalar(u.scale * (1 + e.bankFlash * 1.2));
			u.shield.visible = e.alive && e.inv > 0;
			u.shield.scale.setScalar(u.scale * (1 + Math.sin(rt * 6) * 0.05));
		}

		// the Minotaur
		if (boss) {
			const b = boss, m = b.mesh;
			const rise = b.state === 'enter' ? easeOut(b.t / 2) : 1;
			const down = b.state === 'down' ? b.t / 2.4 : 0;
			m.visible = b.state !== 'gone';
			b.shadow.visible = m.visible;
			m.position.set(b.x, -1.6 * (1 - rise) - down * 1.2, b.z);
			m.rotation.y = b.face;
			m.rotation.x = b.state === 'charge' ? 0.35 : b.state === 'stun' ? Math.sin(b.t * 10) * 0.1 - 0.15 : b.state === 'down' ? -down * 1.2 : 0;
			const s = 1.25 * (b.state === 'aim' ? 1 + Math.sin(b.t * 30) * 0.02 : 1);
			m.scale.setScalar(s);
			b.shadow.position.set(b.x, 0.012, b.z);
			for (const mat of m.userData.flashMats) mat.emissive.setRGB(b.flash * 2, b.flash * 0.3, 0);
			// the charge's line, while it aims
			b.tele.visible = b.state === 'aim';
			if (b.tele.visible) {
				let len = 0;   // (to the temple's edge)
				while (len < 16 && Math.abs(b.x + Math.sin(b.face) * len) < HALF && Math.abs(b.z + Math.cos(b.face) * len) < HALF) len += 0.1;
				b.tele.scale.set(0.9, len, 1);
				b.tele.position.set(b.x + Math.sin(b.face) * len / 2, 0.03, b.z + Math.cos(b.face) * len / 2);
				b.tele.rotation.set(-Math.PI / 2, b.face + Math.PI, 0);   // (flat, its length along the charge: order YXZ)
				b.tele.material.opacity = 0.25 + Math.sin(rt * 20) * 0.2;
			}
		}
		for (const bo of bombs) {
			const k = Math.min(1, bo.t / bo.flight);
			bo.mesh.position.set(lerp(bo.sx, bo.tx, k), 1.2 * (1 - k) + Math.sin(k * Math.PI) * 2.2 + 0.14, lerp(bo.sz, bo.tz, k));
			const r = bo.mesh.userData.ring;
			r.position.set(bo.tx, 0.03, bo.tz);
			const f = clamp((bo.t - bo.flight) / bo.fuse, 0, 1);
			r.scale.setScalar(1.15 * CS * (0.3 + f * 0.7));
			r.material.opacity = 0.4 + Math.sin(rt * (10 + f * 30)) * 0.3;
			bo.mesh.scale.setScalar(1 + f * 0.3 + Math.sin(rt * 30) * f * 0.1);
		}
		for (const bl of blasts) {
			const k = bl.t / 0.8;
			bl.mesh.position.set(bl.x, 0.3, bl.z);
			bl.mesh.scale.setScalar((bl.dust ? 0.6 : 1.1 * CS * 1.4) * easeOut(k * 2));
			bl.mesh.material.opacity = 0.8 * (1 - k);
		}
	}

	/* ---------- drawing (every animation frame) ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		update3D(show.paused ? 0 : dt);
		post.render(views());
		show.frame(ctx, dt, drawWorld);
	};

	const label = (ctx, str, x, y, size, fill, alpha = 1) => art.text(ctx, str, x, y, { size, weight: 800, font: FONT, fill, outline: INK, outlineWidth: Math.max(4, size * 0.18), alpha });

	// words over the 3D, on every wall
	function drawWorld(ctx) {
		if (!levelGroup) return;
		const playing = phase === 'tutorial' || phase === 'play';
		for (let w = 0; w < 3; w++) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(w * W, 0, W, H);
			ctx.clip();
			// the chest
			const at = exits[chest.at];
			if (at && playing) {
				const p = proj(w, at.x, 1.25, at.z);
				if (chest.shake > 0) label(ctx, 'CHEST MOVING!', p.x, p.y - 10, 30, Math.sin(rt * 12) > 0 ? '#ff5a3d' : GOLD);
				else label(ctx, 'BANK HERE', p.x, p.y, 26, GOLD);
			}
			// powerups
			for (const pu of powerups) {
				if (pu.taken || pu.appear > 0.3) continue;
				const p = proj(w, pu.x, 0.95, pu.z);
				label(ctx, POWERS[pu.kind].name, p.x, p.y, 20, POWERS[pu.kind].color);
			}
			// what each explorer carries
			for (let i = 0; i < count; i++) {
				const e = ex[i];
				if (!e.seen) continue;
				if (!e.alive) {
					const p = proj(w, e.x, 0.7, e.z);
					label(ctx, Math.ceil(e.deadT) + '', p.x, p.y, 34, colour(i), 0.9);
					continue;
				}
				if (!e.pot.length && !e.dbl && e.grow <= 0) continue;
				const p = proj(w, e.x, 0.85 * (e.grow > 0 ? 1.5 : 1), e.z);
				const value = e.pot.reduce((s, q) => s + q.value, 0);
				if (value) {
					art.circle(ctx, p.x - 34, p.y - 2, 13, { fill: GOLD, stroke: INK, lineWidth: 4 });
					art.text(ctx, String(value), p.x - 16, p.y, { size: 30, weight: 800, font: FONT, fill: 'white', outline: INK, outlineWidth: 6, align: 'left' });
				}
				if (e.dbl) label(ctx, '×2', p.x, p.y - 34, 24, POWERS.double.color);
			}
			// numbers rising
			for (const f of floaters) {
				const p = proj(w, f.x, 0.9 + f.t * 0.9, f.z);
				label(ctx, f.text, p.x, p.y, 30 * f.size, f.fill, clamp(2 - f.t * 1.4, 0, 1));
			}
			// the boss's health
			if (boss && boss.state !== 'gone' && boss.state !== 'down' && phase === 'play') {
				const p = proj(w, boss.x, 2.6, boss.z);
				for (let k = 0; k < 3; k++) art.text(ctx, '♥', p.x + (k - 1) * 34, p.y, { size: 34, font: FONT, fill: k < boss.hp ? '#ff3d3d' : '#3a2a22', outline: INK, outlineWidth: 5 });
				if (boss.state === 'stun') label(ctx, 'STUNNED!', p.x, p.y - 40, 26, '#ffe27a');
			}
			ctx.restore();
		}
		if (eaterT > 0 && playing) {
			show.onWalls(ctx, (c) => art.text(c, 'GHOST EATER! ' + Math.ceil(eaterT), W / 2, 92, { size: 34, weight: 800, font: FONT, fill: '#3af2ff', outline: INK, outlineWidth: 6 }));
		}
	}

	function drawBanner(ctx) {
		if (!banner || banner.t > 3.4) return;
		const a = clamp((3.4 - banner.t) / 0.5, 0, 1);
		show.onWalls(ctx, function (c) {
			show.slam(c, banner.title, W / 2, 300, 92, banner.t, { font: TITLE_FONT, exact: true, fill: banner.boss ? '#ff5a3d' : GOLD, alpha: a });
			if (banner.sub) show.slam(c, banner.sub, W / 2, 395, 48, banner.t - 0.4, { fill: 'white', alpha: a });
		});
	}

	// the explorer, flat, for the show's screens
	function drawExplorer2D(ctx, n, x, y, size) {
		const r = size * 0.36;
		const cy = y - r * 1.05;
		art.circle(ctx, x, y - 2, r * 0.9, { fill: 'rgba(0,0,0,0.25)' });
		art.circle(ctx, x, cy, r, { fill: colour(n), stroke: INK, lineWidth: Math.max(3, size * 0.04) });
		ctx.save();
		ctx.fillStyle = '#f1e2bd';
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(3, size * 0.04);
		ctx.beginPath();
		ctx.ellipse(x, cy - r * 0.55, r * 1.25, r * 0.22, 0, 0, Math.PI * 2);
		ctx.fill(); ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(x, cy - r * 0.6, r * 0.8, r * 0.75, 0, Math.PI, Math.PI * 2);
		ctx.fill(); ctx.stroke();
		ctx.restore();
		for (const s of [-1, 1]) {
			art.circle(ctx, x + s * r * 0.33, cy + r * 0.05, r * 0.2, { fill: 'white', stroke: INK, lineWidth: 2 });
			art.circle(ctx, x + s * r * 0.33, cy + r * 0.08, r * 0.09, { fill: INK });
		}
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	/* ---------- debug: straight to a temple, or the Minotaur ---------- */

	if (show.menu && show.menu.drow) {
		const $temples = show.menu.drow('TEMPLES');
		LEVELS.forEach(function (def, k) {
			show.menu.dbutton(String(k + 1), function () {
				if (!count) return;
				if (show.beat !== 'play') show.go('play');
				loadLevel(def, k);
			}, GOLD).appendTo($temples);
		});
		show.menu.dbutton('MINOTAUR', function () {
			if (!count) return;
			if (show.beat !== 'play') show.go('play');
			show.setTimeLeft(FINALE_AT - 1);
		}, '#ff5a3d').appendTo($temples);
	}

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(),
		phase, level: level && level.def.name, coinsLeft: coins.filter((c) => c.present).length,
		pots: ex.map((e) => e.pot.reduce((s, p) => s + p.value, 0)),
		alive: ex.map((e) => e.alive),
		ghosts: ghosts.map((g) => ({ kind: g.kind, mode: g.mode, dead: g.dead })),
		boss: boss && { state: boss.state, hp: boss.hp },
	});

	self.test = {
		skipTo(id) { show.go(id); },
		jump(id) { show.go(id); },   // (the virtual gamebox's name for it)
		level(k) { loadLevel(k === 'lair' ? LAIR : LEVELS[k], k === 'lair' ? levelIdx : k); },
	};

	self.fini = function () {
		unlisten();
		show.fini();
		post.dispose();
		envTex.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
