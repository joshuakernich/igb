/*
 * Gwi-Ma Showdown
 *
 * Breakout against a demon king, across all three walls, as a ten-minute
 * show. Gwi-Ma drifts along the top and drops energy balls. Each player is
 * a small hunter with a sword on the floor of a wall, a Breakout paddle:
 * catch a ball and it flies back up, its angle set by where it met the
 * sword (off centre sends it wide). A deflected ball is yours: it keeps
 * bouncing off the top and the far ends like a Breakout ball until it comes
 * down to be caught again or slips past. Get one through to Gwi-Ma to wound
 * him: every wound leaves him smaller and faster. Wounded to nothing he's
 * banished (ROUND CLEAR, a team bonus) and re-forms, tougher, for the next
 * round, for as long as the clock runs. The demon never wins.
 *
 * Every few seconds Gwi-Ma stops, rears up and summons a pack of demons
 * that march down the floor toward the hunters, getting in the way of the
 * balls (the only demons there are). A ball pops one; a hunter who runs
 * into one slashes it.
 *
 * The show, in order (see the beats at the bottom, and shared/showtime.js
 * for the generic ones): the squad picker; the ten-minute clock slamming
 * in; the controls, one at a time, with the camera in close on the hunters;
 * Gwi-Ma rising, the camera tight on his grin; the rounds; TIME!; everyone's
 * scores; the ranking onto a podium; the team total; the day's leaderboard;
 * and a fast-forward replay of where everyone ran.
 *
 * Input: tap a wall to join it (the tap goes to the player standing
 * nearest); px / pz then slide your hunter along that wall's floor, and
 * stepping toward your wall brings your hunter a little nearer Gwi-Ma.
 * At the desk, clicking a wall of the simulator's box (keys 1-6 pick the
 * player) moves that player's hunter onto it.
 */
IGB.register('gwi-ma-showdown', function GwiMaShowdownGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const FONT = 'Lexend';   // (the show's standard: Lexend Medium)

	/* ---------- tuning: the fight ---------- */

	const GAME_SECONDS = 600;     // a ten-minute show: the clock starts just after the clock intro
	const SHRINK = 0.8;           // each wound leaves him this much the size he was
	const QUICKEN = 1.15;         // and this much faster
	const SMALLEST = 0.35;
	const PADDLE_Y = 880;         // the hunters' swords, standing back from their wall
	const STEP_IN = 360;          // how much nearer Gwi-Ma a hunter comes, right up at their wall (about halfway up the floor)
	const STEP_RANGE = 0.9;       // over this much of the room's depth from their wall
	const HUNTER_BACK = 32;       // where she stands, just behind her sword
	const PADDLE_W = 170;
	const MAX_ANGLE = 60;         // degrees off vertical at the very end of a sword
	const BALL_R = 14;
	const SPEEDS = { slow: 420, medium: 600, fast: 800 };   // px per second, in round 1
	const COLOURS = { slow: '#ff9a3d', medium: '#ff4fd8', fast: '#9ef6ff' };
	const BOSS_Y = 118;           // Gwi-Ma's middle
	const BOSS_W = 380;           // his grin, the part a ball has to hit
	const BOSS_H = 120;
	const BOSS_SPEED = 90;        // a slow, menacing drift
	const SEAM_GAP = 30;          // he stops this far short of the seam between walls
	const BRACE = 1.1;            // then crouches, trembling, for this long
	const DASH = 0.75;            // and dashes across into the next wall in this long
	const HITS = 3;               // he falls to three hits, every round
	const POINTS = { catch: 1, wound: 10, demon: 3, slash: 3 };
	const PAUSE_EVERY = [5, 9];   // seconds between Gwi-Ma's pauses to summon
	const PAUSE = 2.4;            // how long he stops for; the demons appear part way
	const WALK = [55, 85];        // how fast summoned demons march, plane units a second

	/* ---------- tuning: his demon patterns ---------- */

	// From round 2 he sends a demon pattern snaking down a column of the floor;
	// from round 3 he can flood his wall's whole floor with them. Either knocks
	// out any hunter it reaches for the rest of the round. Each grows slowly
	// out from him first, to read and run from, and comes sooner every round
	// after it starts. (Called LIGHTNING for short.)
	const LIGHTNING = {
		column: { from: 2, every: [9, 14], warn: 1.8, strike: 0.7, half: 130 },
		wall: { from: 3, every: [17, 25], warn: 3.0, strike: 1.0 },
		sooner: 0.85,         // each round after it starts, it comes this much sooner
		retry: 2.6,           // if every hunter is knocked out, the round starts again after this long
		grow: 0.4,            // the vines reach full length this far into the wind-up
	};

	/* ---------- tuning: the rounds ---------- */

	const ROUND = {
		ballSpeed: 0.1,       // his balls this much faster per round
		fireRate: 0.15,       // and fired this much more often
		pack: 1,              // one more demon in every pack, per round
		packEvery: 0.88,      // his pauses to summon come this much sooner
		pace: 0.12,           // he drifts this much faster
		walk: 0.12,           // and his demons march faster
		cap: 8,               // it stops getting harder after this round
		bonus: 100,           // the team bonus for clearing round n: bonus * n
		clear: 2.6,           // the gap between rounds: his burst and the ROUND N CLEAR banner
		rise: 0.9,            // then he re-forms over this long
		slowmo: 0.7,          // the world slows as he bursts
	};

	// Which balls he throws in each round.
	function mixAt(round) {
		if (round <= 1) return ['slow', 'slow', 'medium'];
		if (round === 2) return ['slow', 'medium', 'medium', 'fast'];
		return ['medium', 'fast', 'fast'];
	}

	/* ---------- tuning: the controls intro ---------- */

	const CONTROLS = {
		steps: [
			{ id: 'tap', caption: 'TAP A WALL TO FIGHT THERE', min: 2.5, max: 5.5 },
			{ id: 'move', caption: 'MOVE LEFT AND RIGHT', min: 2.5, max: 5 },
			{ id: 'step', caption: 'STEP TOWARD YOUR WALL TO ADVANCE', min: 2.5, max: 5 },
			{ id: 'catch', caption: 'DEFLECT THE FIRE WITH YOUR SWORD', min: 3.5, max: 9 },
			{ id: 'slash', caption: 'RUN INTO DEMONS TO SLASH THEM', min: 2, max: 7.5 },
		],
		nice: 1.1,            // the NICE! once a step is done, before the next
		zoom: [1.35, 2.3],    // how close the camera comes in on the hunters
		fit: 2300,            // zoom = fit / (their spread + pad)
		pad: 450,
		moved: 0.35,          // how far (wall widths, per hunter) counts as moving
		ballEvery: 1.4,       // practice balls, this often
		ballSpeed: 300,
		demonSpeed: 150,
	};

	/* ---------- tuning: Gwi-Ma's entrance ---------- */

	const ENTRANCE = {
		dark: 0.9,            // the field darkens
		rise: [1.0, 3.2],     // he rises up at the far edge, the rumble building
		face: 3.3,            // the camera snaps in on his grin: the roar
		faceZoom: 3.1,
		name: 3.7,            // GWI-MA slams in
		pull: 5.6,            // then the camera pulls back to the whole field
		pullFor: 1.6,
		fight: 7.3,           // FIGHT!
		length: 8.5,
	};

	/* ---------- state ---------- */

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.25, true);
	audio.add('tutorial', 'assets/shared/music-tutorial.mp3', 0.2, true);
	audio.add('catch', 'sfx:deflect', 0.5);
	audio.add('pop', 'sfx:demonPop', 0.5);
	audio.add('wound', 'sfx:bossHit', 0.6);
	audio.add('fizz', 'sfx:fizzle', 0.5);
	audio.add('lock', 'sfx:joinWall', 0.5);
	audio.add('summon', 'sfx:summon', 0.6);
	audio.add('slash', 'sfx:swordSwish', 0.5);
	audio.add('win', 'sfx:banish', 0.6);
	audio.add('nice', 'sfx:nice', 0.5);
	audio.add('charge', 'sfx:attackWarn', 0.6);
	audio.add('zap', 'sfx:vineStrike', 0.6);


	let hunters = [];
	let balls = [];
	let pops = [];
	let puffs = [];
	let ripples = [];           // balls swallowed by the back wall
	let embers = [];
	let walkers = [];           // summoned demons marching down the floor
	let attack = null;          // his lightning, while it winds up and strikes: { kind, phase, t, x, wall, bolts }
	let nextColumn = 0;         // seconds until he may call the next column, the next wall
	let nextWall = 0;
	let retrying = false;       // every hunter is down: the round is starting again
	let boss = {
		x: WIDTH / 2, dir: 1, hp: 0, max: 0, hurt: 0, squish: 0, cooldown: 2, pause: 0, nextPause: 8, summoned: true,
		size: 1, pace: 1, banished: 0, gone: true, rise: 0, fade: 0, roar: 0, bar: false, held: null,
		mode: 'walk', modeT: 0, dashFrom: 0, dashTo: 0,   // walking a wall, bracing at a seam, or dashing across it
	};
	let t = 0;                  // play time, for the fight's pacing (the ten-minute clock is the show's)
	let round = 0;
	let roundAge = 0;
	let clearing = 0;           // seconds left of the gap between rounds
	let slowmo = 0;
	let gloom = 0;              // how dark the field is (Gwi-Ma and the hunters stay lit)
	let teamBonus = 0;
	let completed = false;

	function Hunter(n, count) {
		return { n, wall: 1, frac: (n + 1) / (count + 1), x: 0, y: PADDLE_Y, score: 0, flash: 0, swish: 0, side: 1, down: false, downAge: 0 };
	}
	const players = () => hunters.length || (playersMeta ? playersMeta.length : 3);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
	const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

	// How much harder each round is.
	function level() {
		const n = Math.min(Math.max(round, 1), ROUND.cap) - 1;
		return {
			ball: 1 + ROUND.ballSpeed * n,
			fire: 1 + ROUND.fireRate * n,
			pack: ROUND.pack * n,
			pauseEvery: Math.pow(ROUND.packEvery, n),
			pace: 1 + ROUND.pace * n,
			walk: 1 + ROUND.walk * n,
		};
	}
	const hpFor = () => HITS;   // (later rounds are harder in every other way, not tougher)

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'gwi-ma-showdown',
		seconds: GAME_SECONDS,
		players: () => hunters.length,
		scores: () => hunters.map((h) => h.score),
		bonus: () => teamBonus,
		bonusLabel: 'ROUND BONUS',
		drawAvatar: (ctx, n, x, y, scale, pose) => drawFigure(ctx, n, x, y, scale, { front: true, pose }),
		theme: { accent: '#ff4fd8', accent2: '#8a3dff', gold: '#ffe14d', ink: '#12052a', sky: ['#0a0320', '#2a0d4a'] },
		rivals: ['Neon Nightblades', 'The Grin Reapers', 'Fire Catchers', 'Sword & Sparkle', 'Banish Brigade', 'Midnight Encore',
			'Demon Dusters', 'Glow Getters', 'Flame Tamers', 'Purple Panic', 'Honey Blades', 'Spirit Squad'],
	});

	function initGame(count) {
		hunters = [];
		for (let i = 0; i < count; i++) hunters.push(Hunter(i, count));
		hunters.forEach((h) => { h.x = hunterX(h); });
		show.go('title');
	}

	// Into the rounds: practice points don't count.
	function begin() {
		hunters.forEach((h) => { h.score = 0; });
		balls = [];
		walkers = [];
		t = 0;
		teamBonus = 0;
		startRound(1);
		boss.rise = 1;   // he's already risen, in his entrance
		audio.play('music');
	}

	function startRound(n) {
		round = n;
		roundAge = 0;
		boss.max = boss.hp = hpFor(n);
		boss.size = 1;
		boss.pace = 1;
		boss.mode = 'walk';
		boss.gone = false;
		boss.rise = 0;
		boss.fade = 0;
		boss.bar = true;
		boss.squish = 1;
		boss.cooldown = 1.5;
		boss.pause = 0;
		boss.nextPause = PAUSE_EVERY[0];
		if (boss.held === null) boss.x = clamp(boss.x, BOSS_W, WIDTH - BOSS_W);
		// everyone back on their feet; his lightning starts its count again
		for (const h of hunters) { h.down = false; h.downAge = 0; }
		attack = null;
		nextColumn = lightningGap('column') * 0.6;
		nextWall = lightningGap('wall') * 0.7;
	}

	/* ---------- the walls ---------- */

	// Where a player is along a wall, 0..1 from its left edge. The left wall's
	// right edge meets the front wall, the right wall's left edge does too.
	function fracOn(wall, p) {
		const px = clamp(p.px, 0, 1);
		const pz = clamp(p.pz === undefined ? 0.5 : 1 - p.pz, 0, 1);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		return wall === 0 ? 1 - pz : wall === 1 ? px : pz;
	}

	// How far a player stands from a wall, 0 right up at it to 1 across the room.
	function distFrom(wall, p) {
		const px = clamp(p.px, 0, 1);
		const pz = clamp(p.pz === undefined ? 0.5 : 1 - p.pz, 0, 1);   // as above, counted from the front
		return wall === 0 ? px : wall === 1 ? pz : 1 - px;
	}

	function hunterX(h) {
		const half = PADDLE_W / 2;
		return h.wall * W + clamp(h.frac * W, half, W - half);
	}

	// A tap joins the wall it's on, for whoever is standing nearest the spot.
	let latest = [];
	let tapped = false;
	stage.$el.on('click', function (e) {
		if (['controls', 'gwima', 'play'].indexOf(show.beat) < 0) return;
		const at = IGB.toWorld(e);
		const wall = clamp(Math.floor(at.x / W), 0, 2);
		let best = null;
		let bestD = Infinity;
		hunters.forEach(function (h) {
			const p = latest[h.n];
			if (!p) return;
			const d = Math.abs(wall * W + fracOn(wall, p) * W - at.x);
			if (d < bestD) { bestD = d; best = h; }
		});
		if (best) join(best, wall);
	});

	// A hunter takes up their place on a wall.
	function join(h, wall) {
		tapped = true;
		if (h.wall === wall) return;
		h.wall = wall;
		h.flash = 1;
		h.frac = fracOn(wall, latest[h.n] || {});
		audio.play('lock', true);
		pop('JOINED', PLAYER_COLORS[h.n], hunterX(h), h.y - 90);
	}

	/* ---------- every frame ---------- */

	function pop(text, colour, x, y) {
		pops.push({ text, colour, x, y, age: 0 });
	}

	function fire() {
		const mix = mixAt(round);
		const type = mix[Math.floor(Math.random() * mix.length)];
		const speed = SPEEDS[type] * level().ball;
		const y = BOSS_Y + BOSS_H / 2;
		// a little either side of straight down, but never far enough to cross a seam
		const a = keepToWall((Math.random() - 0.5) * 0.7, boss.x, H - y, clamp(Math.floor(boss.x / W), 0, 2));
		balls.push({ x: boss.x, y, vx: Math.sin(a) * speed, vy: Math.cos(a) * speed, type, speed, owner: -1, trail: [] });
	}

	// Gwi-Ma drifts along the top of all three walls, firing, and now and
	// then stops to summon demons.
	function stepBoss(dt) {
		if (boss.gone) return;
		roundAge += dt;
		if (boss.rise < 1) { boss.rise = Math.min(1, boss.rise + dt / ROUND.rise); return; }
		// his lightning: while it winds up and strikes he does nothing else
		if (attack) { stepAttack(dt); return; }
		if (boss.mode === 'walk' && boss.pause <= 0 && boss.held === null && clearing <= 0) maybeAttack(dt);
		if (attack) return;
		const lv = level();
		if (boss.pause > 0) {
			boss.pause -= dt;
			if (!boss.summoned && boss.pause < PAUSE * 0.45) {
				boss.summoned = true;
				summon();
			}
		} else if (boss.held === null && boss.mode === 'brace') {
			// crouched at the seam, trembling, building up...
			boss.modeT += dt;
			if (boss.modeT >= BRACE) {
				boss.mode = 'dash';
				boss.modeT = 0;
				show.fx('bossDash');
			}
		} else if (boss.held === null && boss.mode === 'dash') {
			// ...then a lunge across the seam into the next wall
			boss.modeT += dt;
			const k = Math.min(1, boss.modeT / DASH);
			boss.x = boss.dashFrom + (boss.dashTo - boss.dashFrom) * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
			if (k >= 1) {
				boss.mode = 'walk';
				boss.squish = 1;
				show.fx('stomp');
				show.shake = Math.max(show.shake, 0.5);
			}
		} else if (boss.held === null) {
			// He keeps to one wall at a time, stopping short of each seam.
			boss.x += boss.dir * BOSS_SPEED * boss.pace * lv.pace * dt;
			const half = bossHalf() * 1.2 + SEAM_GAP;   // (room for the crouch, which widens him)
			const wall = clamp(Math.floor(boss.x / W), 0, 2);
			const stop = boss.dir > 0 ? (wall + 1) * W - half : wall * W + half;
			if ((boss.dir > 0 && boss.x >= stop) || (boss.dir < 0 && boss.x <= stop)) {
				boss.x = stop;
				const next = wall + boss.dir;
				if (next < 0 || next > 2) {
					// the far end of a side wall: nowhere to go but back
					boss.dir = -boss.dir;
					boss.squish = 1;
				} else {
					boss.mode = 'brace';
					boss.modeT = 0;
					boss.dashFrom = boss.x;
					boss.dashTo = boss.dir > 0 ? next * W + half : (next + 1) * W - half;
					show.fx('riser', 0.5, 1, BRACE);
				}
			}
			boss.nextPause -= dt;
			if (boss.nextPause <= 0) {
				boss.pause = PAUSE;
				boss.summoned = false;
				boss.nextPause = (PAUSE_EVERY[0] + Math.random() * (PAUSE_EVERY[1] - PAUSE_EVERY[0])) * lv.pauseEvery;
			}
			boss.cooldown -= dt;
		}
		if (boss.cooldown <= 0 && boss.mode === 'walk') {
			if (balls.length < 2 + hunters.length) fire();
			boss.cooldown = (3.4 - Math.min(1.4, roundAge / 60)) / (0.7 + 0.15 * hunters.length) / lv.fire;
		}
	}

	// How far either side of his middle Gwi-Ma reaches on the walls.
	function bossHalf() {
		return 413 * 0.62 * project(boss.x, BOSS_Y + BOSS_H / 2).s / 0.53 * boss.size;
	}

	// An angle off straight (up or down), turned no further than keeps a ball
	// travelling `distance` on from x inside `wall`: it never crosses a seam.
	function keepToWall(angle, x, distance, wall) {
		const lo = wall * W + BALL_R;
		const hi = (wall + 1) * W - BALL_R;
		const most = Math.max(1, distance);
		const t = clamp(Math.tan(angle), -(x - lo) / most, (hi - x) / most);
		return Math.atan(t);
	}

	// A ball swallowed by the back wall: rings pulsing out along the far edge.
	const RIPPLE = 0.7;
	function drawRipple(ctx, r) {
		const p = project(r.x, 0);
		const k = r.age / RIPPLE;
		for (let i = 0; i < 3; i++) {
			const q = clamp(k * 1.4 - i * 0.2, 0, 1);
			if (q <= 0 || q >= 1) continue;
			art.ellipse(ctx, p.x, p.y, 30 + 220 * q, 10 + 46 * q, { stroke: r.colour, lineWidth: 12 * (1 - q), alpha: 1 - q, shadow: { color: r.colour, blur: 20 } });
		}
		art.circle(ctx, p.x, p.y, 46 * (1 - k), { fill: 'white', alpha: 0.8 * (1 - k), shadow: { color: r.colour, blur: 40 } });
	}

	// The hunters follow their players; balls, demons and effects move on.
	function stepWorld(dt) {
		boss.squish = Math.max(0, boss.squish - dt * 2.5);
		boss.hurt = Math.max(0, boss.hurt - dt * 3);
		boss.roar = Math.max(0, boss.roar - dt * 0.6);
		stepWalkers(dt);
		for (const h of hunters) {
			const p = latest[h.n];
			if (p) {
				const was = h.frac;
				h.frac = fracOn(h.wall, p);
				moved += Math.abs(h.frac - was);
				// stepping toward your wall brings you a little nearer Gwi-Ma
				const want = PADDLE_Y - STEP_IN * (1 - Math.min(1, distFrom(h.wall, p) / STEP_RANGE));
				h.y += (want - h.y) * Math.min(1, dt * 10);
			}
			h.x = hunterX(h);
			h.flash = Math.max(0, h.flash - dt * 3);
			h.swish = Math.max(0, h.swish - dt / 0.28);   // a swish takes about a quarter of a second
		}
		// (a winning hit can clear every ball mid-loop, so stop at the end of whatever is left)
		for (let i = balls.length - 1; i >= 0; i--) {
			if (i >= balls.length) continue;
			if (moveBall(balls[i], dt)) balls.splice(i, 1);
		}
		for (const r of ripples) r.age += dt;
		ripples = ripples.filter((r) => r.age < RIPPLE);
		for (const p of puffs) p.age += dt;
		puffs = puffs.filter((p) => p.age < (p.life || 0.5));
		for (const p of pops) p.age += dt;
		pops = pops.filter((p) => p.age < 1);
		for (const e of embers) {
			e.age += dt;
			e.vy += 260 * dt;
			e.x += e.vx * dt;
			e.y += e.vy * dt;
		}
		embers = embers.filter((e) => e.age < e.life);
	}
	let moved = 0;

	// Move a ball; true when it's gone.
	function moveBall(b, dt) {
		b.trail.push({ x: b.x, y: b.y });
		if (b.trail.length > 8) b.trail.shift();
		const py = b.y;
		b.x += b.vx * dt;
		b.y += b.vy * dt;

		// the far ends of the side walls and the top
		if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
		if (b.x > WIDTH - BALL_R) { b.x = WIDTH - BALL_R; b.vx = -Math.abs(b.vx); }
		// a practice ball sent back up just sparkles away at the far edge
		if (b.practice && b.owner >= 0 && b.y < 90) {
			puffs.push({ x: b.x, y: b.y, age: 0, spin: Math.random() * 6, colour: PLAYER_COLORS[b.owner] });
			return true;
		}
		// the back wall swallows it, in a ripple
		if (b.y < BALL_R) {
			ripples.push({ x: b.x, age: 0, colour: b.owner >= 0 ? PLAYER_COLORS[b.owner] : COLOURS[b.type] });
			audio.play('fizz', true);
			return true;
		}

		// A hunter's sword: Breakout rules. Where it lands on the sword sets
		// the angle back up.
		if (b.vy > 0) {
			for (const h of hunters) {
				if (h.down) continue;
				if (!(py + BALL_R <= h.y && b.y + BALL_R >= h.y)) continue;
				const off = (b.x - h.x) / (PADDLE_W / 2);
				if (Math.abs(off) > 1.1) continue;
				// (never so steep that it would reach a seam before the back wall)
				const angle = keepToWall(clamp(off, -1, 1) * MAX_ANGLE * Math.PI / 180, b.x, h.y - BALL_R, h.wall);
				b.vx = Math.sin(angle) * b.speed;
				b.vy = -Math.cos(angle) * b.speed;
				b.y = h.y - BALL_R;
				b.owner = h.n;
				h.flash = 1;
				h.swish = 1;
				h.side = off < 0 ? -1 : 1;   // swing toward where it struck
				score(h, POINTS.catch);
				audio.play('catch', true);
				if (b.practice) { practice.caught++; pop('NICE!', PLAYER_COLORS[h.n], h.x, h.y - 60); }
				return false;
			}
		}

		// Gone past the swords: it just sails off, unremarked. (The demon never wins.)
		if (b.y > H + BALL_R) return true;

		// The players' balls (not Gwi-Ma's) pop demons and wound him.
		if (b.owner >= 0) {
			// A summoned demon in the way pops, and the ball bounces back.
			const d = walkers.find((w) => !w.dead && Math.abs(b.x - w.x) < 40 && Math.abs(b.y - w.y) < 34);
			if (d) {
				popWalker(d, hunters[b.owner], POINTS.demon);
				b.vx = -b.vx;   // straight back the way it came, so it stays on its wall
				b.vy = -b.vy;
			}

			// Through to Gwi-Ma himself: a wound, and the ball is spent.
			if (!boss.gone && boss.rise >= 1 && Math.abs(b.x - boss.x) < BOSS_W / 2 * boss.size && Math.abs(b.y - BOSS_Y) < BOSS_H / 2) {
				boss.hp--;
				boss.hurt = 1;
				boss.size = Math.max(SMALLEST, boss.size * SHRINK);   // smaller and faster with every wound
				boss.pace *= QUICKEN;
				score(hunters[b.owner], POINTS.wound);
				audio.play('wound', true);
				pop('+' + POINTS.wound, PLAYER_COLORS[b.owner], boss.x, BOSS_Y + 90);
				if (boss.hp <= 0) defeat();
				return true;
			}
		}
		return false;
	}

	function score(h, n) {
		if (h) h.score += n;
	}
	const teamScore = () => hunters.reduce((s, h) => s + h.score, 0) + teamBonus;

	// Wounded to nothing: he bursts apart (a team bonus, ROUND N CLEAR), the
	// air clears, and after a short gap he re-forms, tougher, for the next
	// round. The clock keeps running through it.
	function defeat() {
		boss.banished++;
		teamBonus += ROUND.bonus * round;
		show.mark(t);
		audio.play('win', true);
		show.fx('bossDefeat');
		show.flash = 0.7;
		show.shake = 1;
		slowmo = 1;
		for (let i = 0; i < 90; i++) {
			const a = Math.random() * Math.PI * 2;
			const v = 200 + Math.random() * 900;
			embers.push({ x: boss.cx + Math.cos(a) * 60, y: boss.cy + Math.sin(a) * 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 250, r: 6 + Math.random() * 14, life: 0.8 + Math.random() * 0.9, age: 0, colour: ['#ff4fd8', '#ffb04f', '#8a3dff', '#ffe14d'][i % 4] });
		}
		for (let i = 0; i < 6; i++) puffs.push({ x: boss.x + (Math.random() - 0.5) * 300, y: BOSS_Y + Math.random() * 60, age: 0, life: 1, big: true, spin: Math.random() * 6, colour: i % 2 ? '#ff4fd8' : '#ffb04f' });
		for (const d of walkers) puffs.push({ x: d.x, y: d.y, age: 0, spin: 0, colour: DEMON_SKINS[d.row % DEMON_SKINS.length].glow });
		walkers = [];
		balls = [];
		boss.gone = true;
		boss.bar = false;
		clearing = ROUND.clear;
		clearAge = 0;
	}
	let clearAge = -1;

	/* ---------- his demon patterns ---------- */

	// From round 2 he sends a demon pattern snaking down a column of the floor;
	// from round 3 he can flood the whole floor of his wall with them. They
	// grow out from where he stands, thick jagged vines with hooked spurs,
	// creeping along the floor as he winds up; then they flare and knock out
	// any hunter they've reached for the rest of the round.
	const lightningGap = function (kind) {
		const L = LIGHTNING[kind];
		const k = Math.pow(LIGHTNING.sooner, Math.max(0, Math.min(round, ROUND.cap) - L.from));
		return (L.every[0] + Math.random() * (L.every[1] - L.every[0])) * k;
	};
	const standing = () => hunters.filter((h) => !h.down);

	// When its time comes round (and he's free), he winds one up, on his own wall.
	function maybeAttack(dt) {
		if (round >= LIGHTNING.column.from) nextColumn -= dt;
		if (round >= LIGHTNING.wall.from) nextWall -= dt;
		const wall = clamp(Math.floor(boss.x / W), 0, 2);
		const here = standing().filter((h) => h.wall === wall);
		if (!here.length) return;
		if (round >= LIGHTNING.wall.from && nextWall <= 0) {
			startAttack('wall', null, wall);
			nextWall = lightningGap('wall');
			nextColumn = Math.max(nextColumn, 4);
		} else if (round >= LIGHTNING.column.from && nextColumn <= 0) {
			const target = here[Math.floor(Math.random() * here.length)];
			startAttack('column', target.x, wall);
			nextColumn = lightningGap('column');
		}
	}

	function startAttack(kind, x, wall) {
		const half = LIGHTNING.column.half;
		attack = { kind, phase: 'warn', t: 0, wall, x: x === null ? 0 : clamp(x, wall * W + half, (wall + 1) * W - half), said: 4 };
		attack.vines = growVines(attack);
		audio.play('charge', true);
		show.fx('riser', 0.6, 1, LIGHTNING[kind].warn);
		if (kind === 'wall') show.fx('alarm');
	}

	// A vine from his feet to a run of goals down the floor: a zigzag of
	// straight, angular steps, with short hooked spurs off it.
	// It starts right at his feet; on its way it keeps to his wall (lo..hi),
	// and once past its first goal, to `band` if given (a column's sides).
	function vine(goals, lo, hi, thick, band) {
		const pts = [[boss.x, BOSS_Y + BOSS_H / 2]];
		let reached = 0;
		let heading = Math.PI / 2;
		let zig = Math.random() < 0.5 ? 1 : -1;
		for (const [gx, gy] of goals) {
			const [l0, h0] = band && reached > 0 ? band : [lo, hi];
			reached++;
			for (let n = 0; n < 40; n++) {
				const [x, y] = pts[pts.length - 1];
				if (Math.hypot(gx - x, gy - y) < 130) break;
				const toward = Math.atan2(gy - y, gx - x);
				zig = -zig;
				heading = toward + zig * (0.35 + Math.random() * 0.4);
				const step = 120 + Math.random() * 70;   // long straight strokes, sharp turns between
				pts.push([clamp(x + Math.cos(heading) * step, l0, h0), y + Math.max(20, Math.sin(heading) * step)]);
			}
		}
		// spurs: off every few joints, out to one side, then hooked back
		const spurs = [];
		for (let i = 2; i < pts.length - 1; i += 2 + Math.floor(Math.random() * 2)) {
			const [x, y] = pts[i];
			const side = Math.random() < 0.5 ? -1 : 1;
			const a = Math.atan2(pts[i + 1][1] - y, pts[i + 1][0] - x) + side * (1.0 + Math.random() * 0.6);
			const l = 45 + Math.random() * 35;
			const p1 = [x + Math.cos(a) * l, y + Math.sin(a) * l];
			const b = a - side * (1.3 + Math.random() * 0.5);
			const p2 = [p1[0] + Math.cos(b) * l * 0.6, p1[1] + Math.sin(b) * l * 0.6];
			spurs.push({ at: i, pts: [[x, y], [clamp(p1[0], lo, hi), p1[1]], [clamp(p2[0], lo, hi), p2[1]]] });
		}
		return { pts, spurs, thick };
	}

	function growVines(a) {
		const lo = a.wall * W + 30;
		const hi = (a.wall + 1) * W - 30;
		if (a.kind === 'column') {
			const half = LIGHTNING.column.half * 0.6;
			const goals = [[a.x, 260]];
			for (let y = 420; y <= H + 60; y += 170) goals.push([a.x + (Math.random() - 0.5) * 2 * half, y]);
			return [vine(goals, lo, hi, 130, [a.x - LIGHTNING.column.half, a.x + LIGHTNING.column.half])];
		}
		const vines = [];
		const n = 6;
		for (let i = 0; i < n; i++) {
			const x = lo + (hi - lo) * (i + 0.5) / n;
			const goals = [[lerp(boss.x, x, 0.5), 280], [x + (Math.random() - 0.5) * 120, 600], [x + (Math.random() - 0.5) * 160, H + 60]];
			vines.push(vine(goals, lo, hi, 100));
		}
		return vines;
	}
	const lerp = (a, b, k) => a + (b - a) * k;

	// Who the strike catches, as it lands.
	function caught(h) {
		if (h.down) return false;
		if (attack.kind === 'wall') return h.wall === attack.wall;
		return Math.abs(h.x - attack.x) < LIGHTNING.column.half + 20;
	}

	function stepAttack(dt) {
		const L = LIGHTNING[attack.kind];
		attack.t += dt;
		boss.roar = Math.max(boss.roar, attack.phase === 'warn' ? 0.5 + 0.5 * attack.t / L.warn : 0.8);
		if (attack.phase === 'warn') {
			if (attack.kind === 'wall') {
				const left = Math.ceil(L.warn - attack.t);
				if (left < attack.said && left > 0) { attack.said = left; show.fx('countdown'); }
			}
			if (attack.t >= L.warn) strike();
		} else if (attack.t >= L.strike) {
			attack = null;
		}
	}

	function strike() {
		attack.phase = 'strike';
		attack.t = 0;
		show.fx('boom');
		audio.play('zap', true);
		show.flash = attack.kind === 'wall' ? 0.45 : 0.3;
		show.shake = attack.kind === 'wall' ? 1 : 0.6;
		for (const h of hunters) {
			if (!caught(h)) continue;
			h.down = true;
			h.downAge = 0;
			pop('CAUGHT!', '#ff4fd8', h.x, h.y - 120);
			for (let i = 0; i < 3; i++) puffs.push({ x: h.x + (Math.random() - 0.5) * 60, y: h.y + HUNTER_BACK, age: Math.random() * 0.1, spin: Math.random() * 6, colour: '#ff6a2b' });
		}
		// everyone down: the round starts over
		if (hunters.length && hunters.every((h) => h.down) && clearing <= 0) {
			retrying = true;
			clearing = LIGHTNING.retry;
			clearAge = 0;
			boss.cooldown = LIGHTNING.retry + 1;   // and he holds his fire meanwhile
			boss.nextPause = Math.max(boss.nextPause, LIGHTNING.retry + 1);
			balls = [];
			for (const d of walkers) puffs.push({ x: d.x, y: d.y, age: 0, spin: 0, colour: DEMON_SKINS[d.row % DEMON_SKINS.length].glow });
			walkers = [];
		}
	}

	// A vine, grown `k` of its length: a thick angular band along the floor,
	// tapering to a point, its spurs hooking off it. bright 0..1 as it flares.
	function drawVine(ctx, v, k, bright) {
		// its length so far, joint by joint
		const lens = [0];
		for (let i = 1; i < v.pts.length; i++) lens.push(lens[i - 1] + Math.hypot(v.pts[i][0] - v.pts[i - 1][0], v.pts[i][1] - v.pts[i - 1][1]));
		const total = lens[lens.length - 1];
		const reach = total * k;
		const pts = [v.pts[0]];
		for (let i = 1; i < v.pts.length; i++) {
			if (lens[i] <= reach) { pts.push(v.pts[i]); continue; }
			const f = (reach - lens[i - 1]) / (lens[i] - lens[i - 1]);
			pts.push([lerp(v.pts[i - 1][0], v.pts[i][0], f), lerp(v.pts[i - 1][1], v.pts[i][1], f)]);
			break;
		}
		const fill = bright > 0 ? `rgb(255,${Math.round(lerp(90, 190, bright))},${Math.round(lerp(150, 120, bright))})` : null;   // flaring hot pink-orange
		band(ctx, pts, v.thick, fill, bright);
		for (const sp of v.spurs) if (sp.at < pts.length - 1) band(ctx, sp.pts, v.thick * 0.55, fill, bright);
		// the growing tip glows as it creeps
		if (k < 1 && pts.length > 1) {
			const tip = pts[pts.length - 1];
			const p = project(tip[0], tip[1]);
			art.circle(ctx, p.x, p.y, 18 * p.s, { fill: '#ffb04f', alpha: 0.9, shadow: { color: '#ff6a2b', blur: 24 } });
		}
	}

	// A tapering band through points on the floor, sharp at every joint.
	function band(ctx, pts, thick, fill, bright) {
		if (pts.length < 2) return;
		const sp = pts.map(([x, y]) => project(x, y));
		const left = [];
		const right = [];
		for (let i = 0; i < sp.length; i++) {
			const a = sp[Math.max(0, i - 1)];
			const b = sp[Math.min(sp.length - 1, i + 1)];
			let nx = -(b.y - a.y);
			let ny = b.x - a.x;
			const l = Math.hypot(nx, ny) || 1;
			nx /= l;
			ny /= l;
			const w = thick * sp[i].s * (1 - 0.8 * i / (sp.length - 1)) / 2;   // thick at the root, to a point
			left.push([sp[i].x + nx * w, sp[i].y + ny * w * 0.8]);
			right.push([sp[i].x - nx * w, sp[i].y - ny * w * 0.8]);
		}
		const poly = left.concat(right.reverse());
		const x0 = Math.min(...poly.map((p) => p[0]));
		const x1 = Math.max(...poly.map((p) => p[0]));
		// his colours: purple through magenta to hot pink, glowing orange like him
		const style = { fill: fill || art.linear(ctx, x0, 0, x1 + 1, 0, ['#5a1fd6', '#c42aa8', '#ff3d7a', '#c42aa8', '#5a1fd6']) };
		style.shadow = { color: '#ff6a2b', blur: 18 + 30 * bright };
		art.poly(ctx, poly, style);
	}

	// On the floor, under everything standing on it: the vines, and the
	// faint mark of where they're headed.
	function drawAttackFloor(ctx) {
		if (!attack) return;
		const L = LIGHTNING[attack.kind];
		const far = project(0, 0).y;
		const near = project(0, H).y;
		const k = attack.phase === 'warn' ? attack.t / L.warn : 1;
		const pulse = 0.6 + 0.4 * Math.sin(attack.t * (8 + 20 * k));
		if (attack.phase === 'warn') {
			if (attack.kind === 'column') {
				art.rect(ctx, attack.x - L.half, far, L.half * 2, near - far, { fill: '#ff3d7a', alpha: (0.05 + 0.13 * k) * pulse });
			} else {
				const x0 = attack.wall * W;
				art.rect(ctx, x0, far, W, near - far, { fill: '#05010d', alpha: 0.2 + 0.3 * k });
				const edge = 8 + 8 * pulse;
				for (const [x, y, w, h] of [[x0, far, W, edge], [x0, near - edge, W, edge], [x0, far, edge, near - far], [x0 + W - edge, far, edge, near - far]]) {
					art.rect(ctx, x, y, w, h, { fill: '#ff4fd8', alpha: 0.6 * pulse });
				}
			}
		}
		const grow = attack.phase === 'warn' ? Math.min(1, k / LIGHTNING.grow) : 1;   // out fast, then it waits, pulsing
		const bright = attack.phase === 'strike' ? Math.max(0, 1 - attack.t / L.strike) : 0;
		const shrink = attack.phase === 'strike' ? 1 - Math.max(0, (attack.t - L.strike * 0.5) / (L.strike * 0.5)) : 1;
		for (const v of attack.vines) drawVine(ctx, v, grow * shrink, bright);
	}

	// Over everything: the strike's flare, and the wall's countdown.
	function drawAttackSky(ctx) {
		if (!attack) return;
		const L = LIGHTNING[attack.kind];
		if (attack.kind === 'column') return;
		const x0 = attack.wall * W;
		if (attack.phase === 'warn') {
			const left = Math.max(1, Math.ceil(L.warn - attack.t));
			const beat = attack.t % 1;
			art.save(ctx, function (c) {
				c.translate(x0, 0);
				show.slam(c, '!', W / 2, 470, 360, beat, { fill: '#ff4fd8', glow: '#ff6a2b', dur: 0.2 });
				show.text(c, String(left), W / 2, 700, 140, { fill: 'white', glow: '#ff6a2b' });
				show.text(c, 'GET OFF THIS WALL!', W / 2, 840, 70, { fill: '#ffe14d', glow: '#ff7a3d', alpha: 0.6 + 0.4 * Math.sin(attack.t * 10) });
			});
		} else {
			art.rect(ctx, x0, 0, W, H, { fill: '#ff6a2b', alpha: 0.18 * Math.max(0, 1 - attack.t / L.strike) });
		}
	}

	/* ---------- summoned demons ---------- */

	function Walker(x, y, speed) {
		return {
			walker: true, x, y, dead: false,
			wall: clamp(Math.floor(x / W), 0, 2),   // the wall it was summoned on, and never leaves
			row: Math.floor(Math.random() * 4), phase: Math.random() * 6, step: Math.random() * 6,
			speed: speed || (WALK[0] + Math.random() * (WALK[1] - WALK[0])) * level().walk,
			wob: Math.random() * 6,
		};
	}

	// A pack in front of him: three or four, more each round.
	function summon() {
		const n = 3 + Math.floor(Math.random() * 2) + level().pack;
		for (let i = 0; i < n; i++) {
			const wall = clamp(Math.floor(boss.x / W), 0, 2);
			const x = clamp(boss.x + (i - (n - 1) / 2) * 120, wall * W + 60, (wall + 1) * W - 60);   // all on his wall
			walkers.push(Walker(x, BOSS_Y + BOSS_H / 2 + 30));
		}
		boss.squish = 1;
		audio.play('summon', true);
	}

	function popWalker(d, h, points) {
		d.dead = true;
		puffs.push({ x: d.x, y: d.y, age: 0, spin: Math.random() * 6, colour: DEMON_SKINS[d.row % DEMON_SKINS.length].glow });
		if (h) score(h, points);
		audio.play('pop', true);
	}

	// They march down toward the hunters, drifting toward the nearest one.
	let wobble = 0;
	function stepWalkers(dt) {
		wobble += dt;
		for (const d of walkers) {
			if (d.dead) continue;
			let near = null;
			for (const h of hunters) if (!h.down && h.wall === d.wall && (!near || Math.abs(h.x - d.x) < Math.abs(near.x - d.x))) near = h;
			const pull = near ? clamp((near.x - d.x) * 0.4, -45, 45) : 0;
			d.x += (pull + Math.sin(wobble * 2 + d.wob) * 25) * dt;
			d.x = clamp(d.x, d.wall * W + 40, (d.wall + 1) * W - 40);   // never across a seam
			d.y += d.speed * dt;
			d.step += dt * 9;

			// A hunter it walks into slashes it.
			for (const h of hunters) {
				if (h.down) continue;
				if (Math.abs(d.x - h.x) < PADDLE_W / 2 + 15 && d.y > h.y - 25 && d.y < h.y + HUNTER_BACK + 25) {
					popWalker(d, h, POINTS.slash);
					h.swish = 1;
					h.side = d.x < h.x ? -1 : 1;
					audio.play('slash', true);
					pop('SLASH!', PLAYER_COLORS[h.n], d.x, d.y - 40);
					practice.slashed = true;
					break;
				}
			}

			// Past the hunters: it slinks off.
			if (!d.dead && d.y > H + 30) d.dead = true;
		}
		walkers = walkers.filter((d) => !d.dead);
	}

	/* ---------- drawing ---------- */

	// The game is played on a flat plane: x across all three walls, y from
	// Gwi-Ma's far edge (0) to the players' near edge (H). It's drawn in 2.5D:
	// the plane tilts away in perspective, but only in depth. Across stays 1:1
	// (x on the plane is x on the walls) so the hunters line up with their
	// players and the walls still join.
	const NEAR_Y = 1000;          // where the near edge of the plane meets the bottom of the walls
	const FAR_Y = 250;            // and the far edge, Gwi-Ma's, sits this high
	const FAR_Z = 1.9;            // how much further away the far edge is than the near one
	const LIFT = (NEAR_Y - FAR_Y) / (1 - 1 / FAR_Z);
	const HORIZON = NEAR_Y - LIFT;
	const BALL_HOVER = 28;

	// A point on the plane, `up` units above it: where it shows, and how big
	// things are there.
	function project(x, y, up = 0) {
		const z = 1 + (1 - y / H) * (FAR_Z - 1);
		const s = 1 / z;
		return { x, y: HORIZON + LIFT * s - up * s, s };
	}

	let clockT = 0;   // a clock for flicker and bobbing, running in every beat

	// The world, drawn through the show's camera.
	function drawWorld(ctx) {
		// sky above the far edge, the plane below it
		art.rect(ctx, 0, 0, WIDTH, FAR_Y, { fill: art.linear(ctx, 0, 0, 0, FAR_Y, ['#07031a', '#2a0d4a']) });
		art.rect(ctx, 0, FAR_Y, WIDTH, H - FAR_Y, { fill: art.linear(ctx, 0, FAR_Y, 0, H, ['#3a1660', '#160a2c']) });
		for (let gy = 0; gy <= H; gy += 100) {
			const p = project(0, gy);
			art.rect(ctx, 0, p.y - 1, WIDTH, 2, { fill: `rgba(255,120,230,${0.05 + 0.12 * p.s})` });
		}
		for (let x = 100; x < WIDTH; x += 200) art.rect(ctx, x - 1, FAR_Y, 2, H - FAR_Y, { fill: 'rgba(255,120,230,0.07)' });
		art.rect(ctx, 0, FAR_Y - 2, WIDTH, 4, { fill: '#ff4fd8', alpha: 0.6 });
		for (let w = 1; w < 3; w++) art.rect(ctx, w * W - 1, 0, 2, H, { fill: 'rgba(255,255,255,0.05)' });
		if (gloom > 0) art.rect(ctx, 0, 0, WIDTH, H, { fill: '#05010d', alpha: gloom });

		// ball shadows lie on the plane under everything standing on it
		for (const b of balls) {
			const p = project(b.x, b.y);
			art.ellipse(ctx, p.x, p.y, BALL_R * 1.6 * p.s, BALL_R * 0.6 * p.s, { fill: 'rgba(0,0,0,0.45)' });
		}

		for (const r of ripples) drawRipple(ctx, r);

		drawAttackFloor(ctx);

		// Everything standing on the plane, far to near.
		const things = [];
		if (!boss.gone) things.push({ y: BOSS_Y + BOSS_H / 2, draw: drawBoss });
		for (const b of balls) things.push({ y: b.y, draw: (c) => drawBall(c, b) });
		for (const p of puffs) things.push({ y: p.y, draw: (c) => drawPuff(c, p) });
		for (const d of walkers) things.push({ y: d.y, draw: (c) => drawDemon(c, d) });
		for (const h of hunters) things.push({ y: h.y + HUNTER_BACK, draw: (c) => drawHunter(c, h) });
		things.sort((a, b) => a.y - b.y);
		for (const thing of things) thing.draw(ctx);
		drawAttackSky(ctx);

		// the burst of a banished Gwi-Ma
		for (const e of embers) {
			const k = e.age / e.life;
			art.circle(ctx, e.x, e.y, e.r * (1 - k * 0.6), { fill: e.colour, alpha: 1 - k, shadow: { color: e.colour, blur: 20 } });
		}

		if (show.beat === 'controls') drawAids(ctx);

		for (const p of pops) {
			const at = project(p.x, p.y, 80);
			show.text(ctx, p.text, at.x, at.y - p.age * 60, 40, { fill: p.colour, alpha: 1 - p.age });
		}
	}

	// Gwi-Ma's demons are little chibis marching on the plane, built like the
	// hunters (same size and proportions) but facing them: shadowy bodies
	// with glowing markings, horns, yellow eyes and a fanged grin. A hit pops
	// them in a puff.
	const DEMON_SKINS = [
		{ body: '#2b2f8f', glow: '#ff4fd8' },
		{ body: '#4b2a9a', glow: '#33e0ff' },
		{ body: '#1f5a8a', glow: '#ffe14d' },
		{ body: '#5a2470', glow: '#7dff9e' },
	];

	function drawDemon(ctx, k) {
		const skin = DEMON_SKINS[k.row % DEMON_SKINS.length];
		const foot = project(k.x, k.y);
		const s = foot.s * 1.15;   // the hunters' scale and proportions
		const bob = Math.abs(Math.sin(clockT * 4 + k.phase)) * 5 * s;
		const x = foot.x;
		const fy = foot.y;
		const at = (dx, dy) => [x + dx * s, fy + dy * s - (dy < -26 ? bob : 0)];
		const line = { stroke: '#0c0618', lineWidth: 2.5 * s };

		art.ellipse(ctx, x, fy, 26 * s, 8 * s, { fill: 'rgba(0,0,0,0.45)' });
		// legs, body, arms: the hunters' build, in shadow
		const stride = Math.sin(k.step) * 5;   // marching legs
		art.roundRect(ctx, ...at(-11, -26 - Math.max(0, stride)), 9 * s, 26 * s, 3 * s, { fill: skin.body });
		art.roundRect(ctx, ...at(2, -26 - Math.max(0, -stride)), 9 * s, 26 * s, 3 * s, { fill: skin.body });
		art.roundRect(ctx, ...at(-14, -62), 28 * s, 38 * s, 9 * s, Object.assign({ fill: skin.body }, line));
		art.line(ctx, [at(-8, -52), at(-3, -44), at(2, -52), at(7, -44)], { stroke: skin.glow, lineWidth: 2.5 * s });
		art.roundRect(ctx, ...at(-21, -60), 7 * s, 20 * s, 3 * s, { fill: skin.body });
		art.roundRect(ctx, ...at(14, -60), 7 * s, 20 * s, 3 * s, { fill: skin.body });
		art.poly(ctx, [at(-21, -41), at(-24, -36), at(-17, -38)], { fill: skin.glow });   // little claws
		art.poly(ctx, [at(21, -41), at(24, -36), at(17, -38)], { fill: skin.glow });
		// horns, then the big head facing the players
		for (const side of [-1, 1]) {
			art.poly(ctx, [at(side * 12, -106), at(side * 22, -124), at(side * 22, -100)], { fill: skin.glow });
		}
		const head = at(0, -86);
		art.circle(ctx, head[0], head[1], 26 * s, Object.assign({ fill: skin.body }, line));
		for (const side of [-1, 1]) {
			art.line(ctx, [at(side * 20, -94), at(side * 14, -88)], { stroke: skin.glow, lineWidth: 2.5 * s });   // cheek marks
			art.ellipse(ctx, ...at(side * 9, -91), 5.5 * s, 4 * s, { fill: '#ffe14d' });
		}
		art.poly(ctx, [at(-11, -79), at(11, -79), at(0, -71)], { fill: '#0c0618' });   // grin
		for (const side of [-1, 1]) art.poly(ctx, [at(side * 7, -79), at(side * 3, -79), at(side * 5, -74)], { fill: 'white' });
	}

	// A popped demon: a ring and a few motes, gone in half a second (a big
	// one when Gwi-Ma bursts).
	function drawPuff(ctx, p) {
		const at = project(p.x, p.y, 30);
		const k = p.age / (p.life || 0.5);
		const big = p.big ? 4 : 1;
		art.circle(ctx, at.x, at.y, (20 + 50 * k) * at.s * big, { stroke: p.colour, lineWidth: 6 * at.s * (1 - k) * big, alpha: 1 - k });
		for (let i = 0; i < 6; i++) {
			const a = i / 6 * Math.PI * 2 + p.spin;
			art.circle(ctx, at.x + Math.cos(a) * 60 * k * at.s * big, at.y + Math.sin(a) * 40 * k * at.s * big, 5 * at.s * (1 - k) * big, { fill: p.colour, alpha: 1 - k });
		}
	}

	// A ball floating over its shadow, with a short trail.
	function drawBall(ctx, b) {
		const colour = b.owner >= 0 ? PLAYER_COLORS[b.owner] : COLOURS[b.type];
		b.trail.forEach(function (q, i) {
			const p = project(q.x, q.y, BALL_HOVER);
			art.circle(ctx, p.x, p.y, BALL_R * 1.5 * p.s * (0.4 + 0.6 * i / b.trail.length), { fill: colour, alpha: 0.08 + 0.3 * i / b.trail.length });
		});
		const p = project(b.x, b.y, BALL_HOVER);
		art.circle(ctx, p.x, p.y, BALL_R * 1.5 * p.s, { fill: b.owner >= 0 ? 'white' : COLOURS[b.type], stroke: colour, lineWidth: 5 * p.s });
	}

	// Gwi-Ma, after the reference drawing: a wide mass of purple flame licking
	// up at both sides, two curling flame horns and teardrop eyes floating
	// over a huge jagged pink grin; no outlines, all fire. Drawn in an
	// 826 x 440 frame with its base centre at (413, 440), stood on the plane
	// at the far edge.
	const GM = {
		body: [[40, 440], [62, 398], [30, 330], [18, 250], [42, 182], [28, 100], [55, 26], [82, 118], [102, 58], [114, 150], [142, 86], [162, 168],
			[200, 136], [226, 228], [262, 210], [290, 236], [318, 220], [346, 250], [378, 236], [413, 262], [448, 236], [480, 250], [508, 220],
			[536, 236], [564, 210], [600, 228], [626, 136], [664, 168], [684, 86], [712, 150], [724, 58], [744, 118], [771, 26], [798, 100],
			[784, 182], [808, 250], [796, 330], [764, 398], [786, 440]],
		horn: [[296, 18], [338, 58], [388, 196], [366, 214], [334, 122], [306, 70]],
		eye: [[278, 150], [356, 160], [348, 198], [316, 212], [288, 188]],
		mouth: [[160, 266], [200, 292], [214, 276], [242, 304], [262, 284], [292, 314], [312, 292], [342, 324], [362, 302], [392, 334], [413, 372],
			[434, 334], [464, 302], [484, 324], [514, 292], [534, 314], [564, 284], [584, 304], [612, 276], [626, 292], [666, 266],
			[628, 330], [596, 342], [566, 372], [534, 360], [504, 398], [472, 382], [442, 424], [413, 402], [384, 424], [354, 382],
			[322, 398], [292, 360], [260, 372], [230, 342], [198, 330]],
	};
	const mirror = (pts) => pts.map(([x, y]) => [826 - x, y]);

	function trace(c, pts) {
		c.beginPath();
		c.moveTo(pts[0][0], pts[0][1]);
		for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
		c.closePath();
	}

	function drawBoss(ctx) {
		const foot = project(boss.x, BOSS_Y + BOSS_H / 2);
		const k = 0.62 * foot.s / 0.53 * boss.size;   // about 500 px wide at the far edge, less as he's wounded
		boss.cx = boss.x;
		boss.cy = foot.y - 220 * k;
		if (boss.rise <= 0 || boss.fade >= 1) return;
		const flame = function (c) {
			const g = c.createLinearGradient(0, 0, 826, 0);
			g.addColorStop(0, '#5a1fd6');
			g.addColorStop(0.35, '#c42aa8');
			g.addColorStop(0.5, '#ff3d7a');
			g.addColorStop(0.65, '#c42aa8');
			g.addColorStop(1, '#5a1fd6');
			return g;
		};
		const tt = clockT;
		const roar = boss.roar;
		// Squash and stretch: a steady heave as he goes, a big squish when he
		// turns round, and a lean into the way he's heading.
		const heave = Math.sin(tt * 7);
		// and when he stops to summon, he rears up tall and thin
		const rear = boss.pause > 0 ? Math.sin((1 - boss.pause / PAUSE) * Math.PI) : 0;
		const sx = 1 + 0.05 * heave + 0.22 * boss.squish - 0.1 * rear + 0.08 * roar;
		const sy = 1 - 0.05 * heave - 0.18 * boss.squish + 0.22 * rear + 0.12 * roar;
		// crouching and trembling at a seam, then stretched out in the dash
		const brace = boss.mode === 'brace' ? Math.min(1, boss.modeT / 0.3) : 0;
		const dash = boss.mode === 'dash' ? Math.sin(Math.min(1, boss.modeT / DASH) * Math.PI) : 0;
		const tremble = brace ? Math.sin(tt * 60) * 0.03 : 0;
		const lean = -0.12 * boss.dir * (1 - boss.squish) - 0.35 * boss.dir * dash + tremble;
		const sxD = 1 + 0.12 * brace + 0.45 * dash;
		const syD = 1 - 0.16 * brace - 0.25 * dash;
		// The flame tips flicker: points high on the body waver (wildly as he roars).
		const wild = 1 + 2 * roar;
		const flicker = (pts) => pts.map(([x, y], i) => (y < 300 ? [x + Math.sin(tt * 13 + i * 1.7) * 7 * wild, y + Math.sin(tt * 17 + i * 2.3) * 10 * wild] : [x, y]));
		// rising up out of the far edge, or sinking back into it
		const sink = (1 - easeOut(boss.rise)) * 470 * k + easeOut(boss.fade) * 470 * k;

		const c = ctx;
		c.save();
		c.globalAlpha *= 1 - boss.fade * 0.6;
		if (sink > 0) {
			c.beginPath();
			c.rect(0, -2000, WIDTH, foot.y + 2006);
			c.clip();
		}
		c.save();
		c.translate(boss.x + (roar > 0 ? (Math.random() - 0.5) * 12 * roar : 0), foot.y + sink);
		c.transform(1, 0, lean, 1, 0, 0);
		c.scale(k * sx * sxD, k * sy * syD);
		c.translate(-413, -440);

		// an intense fiery glow behind him, pulsing
		const pulse = 0.75 + 0.25 * Math.sin(tt * 9) + 0.1 * Math.sin(tt * 23) + 0.5 * rear + 0.6 * roar;
		const halo = c.createRadialGradient(413, 300, 60, 413, 300, 560);
		halo.addColorStop(0, `rgba(255, 150, 60, ${Math.min(1, 0.55 * pulse)})`);
		halo.addColorStop(0.45, `rgba(255, 60, 140, ${Math.min(1, 0.35 * pulse)})`);
		halo.addColorStop(1, 'rgba(255, 60, 140, 0)');
		c.fillStyle = halo;
		c.fillRect(-160, -270, 1150, 1140);   // the whole circle, so it fades out with no edge

		// body: the flame mass, glowing at its edges, hot in the middle
		c.shadowColor = '#ff6a2b';
		c.shadowBlur = 50 * pulse;
		trace(c, flicker(GM.body));
		c.fillStyle = flame(c);
		c.fill();
		c.shadowBlur = 0;
		const core = c.createRadialGradient(413, 320, 30, 413, 320, 360);
		core.addColorStop(0, `rgba(255, 200, 90, ${Math.min(1, 0.45 * pulse)})`);
		core.addColorStop(0.5, 'rgba(255, 70, 140, 0.35)');
		core.addColorStop(1, 'rgba(255, 70, 140, 0)');
		c.fillStyle = core;
		c.fill();

		// the horns and eyes float above, burning
		c.shadowColor = '#ff3d7a';
		c.shadowBlur = 30 * pulse;
		for (const pts of [GM.horn, mirror(GM.horn), GM.eye, mirror(GM.eye)]) {
			trace(c, flicker(pts));
			const g = c.createLinearGradient(0, 20, 0, 214);
			g.addColorStop(0, roar > 0.3 ? '#ffd0ff' : '#7a2af0');
			g.addColorStop(1, '#ff5a3a');
			c.fillStyle = g;
			c.fill();
		}
		c.shadowBlur = 0;

		// the grin, lit from inside (gaping as he roars), and two little nostrils over it
		c.save();
		c.translate(413, 266);
		c.scale(1 + 0.12 * roar, 1 + 0.6 * roar);
		c.translate(-413, -266);
		trace(c, GM.mouth);
		const m = c.createLinearGradient(0, 266, 0, 424);
		m.addColorStop(0, '#ff5fd0');
		m.addColorStop(0.5, '#ffc2f0');
		m.addColorStop(1, '#ff4fc4');
		c.fillStyle = m;
		c.fill();
		c.restore();
		c.fillStyle = '#5a1048';
		for (const nx of [388, 438]) {
			c.beginPath();
			c.ellipse(nx, 306, 10, 5, 0, 0, Math.PI * 2);
			c.fill();
		}

		// a white flash when he's wounded
		if (boss.hurt > 0) {
			trace(c, GM.body);
			c.fillStyle = `rgba(255,255,255,${0.7 * boss.hurt})`;
			c.fill();
		}
		c.restore();
		c.restore();

		// health, over his horns
		if (boss.bar && boss.rise >= 1 && boss.fade <= 0) {
			const frac = Math.max(0, boss.hp / boss.max);
			const bw = 260;
			const y = foot.y - 470 * k;
			art.roundRect(ctx, boss.x - bw / 2, y, bw, 14, 7, { fill: 'rgba(255,255,255,0.18)' });
			art.roundRect(ctx, boss.x - bw / 2, y, Math.max(14, bw * frac), 14, 7, { fill: '#ffe14d' });
		}
	}

	// The hunters: chibi idol-hunters, facing Gwi-Ma (from behind) in play and
	// facing the room on the podium. Three looks, in turn: a long purple
	// braid, long wavy burgundy hair, and black pigtails; black stage outfits
	// with gold trim, their player colour on the sash and the sword's glow.
	const LOOKS = [
		{ hair: '#5b2a86', style: 'braid' },
		{ hair: '#7a1f2e', style: 'long' },
		{ hair: '#17121c', style: 'pigtails' },
	];
	const SKIN = '#f1d2bf';

	// One hunter, feet at (x, fy), scale s (1 is about 120 units tall).
	// o: { front, pose: 'stand' | 'cheer' | 'win', swish, side }
	function drawFigure(ctx, n, x, fy, s, o = {}) {
		const c = PLAYER_COLORS[n];
		const look = LOOKS[n % LOOKS.length];
		const at = (dx, dy) => [x + dx * s, fy + dy * s];
		const up = o.pose === 'cheer' || o.pose === 'win';

		art.ellipse(ctx, x, fy, 26 * s, 8 * s, { fill: 'rgba(0,0,0,0.45)' });
		// long hair hangs behind her, seen from the front
		if (o.front && look.style === 'long') {
			art.roundRect(ctx, ...at(-28, -96), 56 * s, 66 * s, 20 * s, { fill: look.hair });
		}
		// legs and boots
		art.roundRect(ctx, ...at(-11, -26), 9 * s, 26 * s, 3 * s, { fill: SKIN });
		art.roundRect(ctx, ...at(2, -26), 9 * s, 26 * s, 3 * s, { fill: SKIN });
		art.roundRect(ctx, ...at(-12, -12), 11 * s, 12 * s, 3 * s, { fill: '#111' });
		art.roundRect(ctx, ...at(1, -12), 11 * s, 12 * s, 3 * s, { fill: '#111' });
		// skirt, top, sash
		art.poly(ctx, [at(-15, -24), at(15, -24), at(11, -38), at(-11, -38)], { fill: '#1b1424' });
		art.roundRect(ctx, ...at(-13, -62), 26 * s, 26 * s, 7 * s, { fill: '#221a2e' });
		art.rect(ctx, ...at(-13, -40), 26 * s, 4 * s, { fill: c });
		art.rect(ctx, ...at(-13, -62), 26 * s, 3 * s, { fill: '#ffd34d' });
		if (o.front) art.poly(ctx, [at(-6, -62), at(6, -62), at(0, -53)], { fill: '#ffd34d' });   // a gold collar
		// arms, down at her sides or flung up
		const hands = up ? [at(-25, -84), at(25, -84)] : [at(-17, -40), at(17, -40)];
		art.line(ctx, [at(-16, -58), hands[0]], { stroke: SKIN, lineWidth: 7 * s });
		art.line(ctx, [at(16, -58), hands[1]], { stroke: SKIN, lineWidth: 7 * s });

		// the hair, and from the front her face
		const head = at(0, -86);
		if (look.style === 'pigtails') {
			for (const side of [-1, 1]) {
				art.ellipse(ctx, ...at(side * 30, -92), 11 * s, 20 * s, { fill: look.hair });
				art.circle(ctx, ...at(side * 24, -104), 5 * s, { fill: c });
			}
		}
		if (!o.front && look.style === 'long') {
			art.roundRect(ctx, ...at(-26, -90), 52 * s, 62 * s, 18 * s, { fill: look.hair });
			for (let i = -2; i <= 2; i++) art.circle(ctx, ...at(i * 10, -30), 8 * s, { fill: look.hair });
		}
		art.circle(ctx, head[0], head[1], 26 * s, { fill: look.hair });
		if (o.front) {
			art.circle(ctx, ...at(0, -82), 20 * s, { fill: SKIN });
			art.ellipse(ctx, ...at(0, -99), 23 * s, 10 * s, { fill: look.hair });   // bangs
			for (const side of [-1, 1]) {
				art.ellipse(ctx, ...at(side * 8, -83), 3.6 * s, 5 * s, { fill: '#1a1020' });
				art.circle(ctx, ...at(side * 8 + 1, -85), 1.4 * s, { fill: 'white' });
				art.ellipse(ctx, ...at(side * 13, -75), 4 * s, 2.4 * s, { fill: '#ff8fb0', alpha: 0.7 });
			}
			if (up) art.ellipse(ctx, ...at(0, -72), 5 * s, 4 * s, { fill: '#7a2030' });   // a cheer
			else art.line(ctx, [at(-4, -73), at(0, -71), at(4, -73)], { stroke: '#7a2030', lineWidth: 2 * s });
			if (look.style === 'braid') {
				for (let i = 0; i < 5; i++) art.ellipse(ctx, ...at(20 + i * 1.5, -66 + i * 9), (7 - i * 0.6) * s, 6 * s, { fill: look.hair });
			}
		} else {
			art.ellipse(ctx, ...at(-8, -98), 10 * s, 5 * s, { fill: 'rgba(255,255,255,0.14)' });   // shine
			if (look.style === 'braid') {
				for (let i = 0; i < 6; i++) art.ellipse(ctx, ...at(0, -62 + i * 9), (8 - i * 0.6) * s, 6 * s, { fill: look.hair, stroke: 'rgba(0,0,0,0.25)', lineWidth: 1 });
				art.circle(ctx, ...at(0, -10), 4 * s, { fill: '#ffd34d' });
			}
		}

		// the sword: resting raised over her right shoulder, thrust up to
		// cheer; on a hit it sweeps across in an arc
		const hand = hands[1];
		const swish = o.swish || 0;
		const dir = o.side || 1;
		const p = 1 - swish;
		const ease = 1 - (1 - p) * (1 - p);
		const from = -1.7 * dir;
		const angle = swish > 0 ? from + (3.4 * dir) * ease : up ? 0.15 + (o.pose === 'win' ? Math.sin(clockT * 6) * 0.15 : 0) : 0.45;
		const len = 62 * s;
		const tip = [hand[0] + Math.sin(angle) * len, hand[1] - Math.cos(angle) * len];
		if (swish > 0) {
			ctx.save();
			ctx.globalAlpha *= swish * 0.8;
			ctx.beginPath();
			const a0 = from - Math.PI / 2;
			const a1 = angle - Math.PI / 2;
			ctx.arc(hand[0], hand[1], len * 0.95, Math.min(a0, a1), Math.max(a0, a1));
			ctx.strokeStyle = c;
			ctx.lineWidth = 14 * s;
			ctx.lineCap = 'round';
			ctx.stroke();
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 5 * s;
			ctx.stroke();
			ctx.restore();
		}
		art.line(ctx, [hand, tip], { stroke: c, lineWidth: 9 * s, alpha: 0.5 });
		art.line(ctx, [hand, tip], { stroke: '#f4f6ff', lineWidth: 4 * s });
		art.circle(ctx, hand[0], hand[1], 4 * s, { fill: '#ffd34d' });
	}

	// A hunter in play: the reach of her sword, faint on the plane in front
	// of her, then her, then her score.
	function drawHunter(ctx, h) {
		const c = PLAYER_COLORS[h.n];
		const feet = project(h.x, h.y + HUNTER_BACK);
		const s = feet.s * 1.15;
		if (h.down) {
			// knocked out for the round: a faded ghost, smoking
			ctx.save();
			ctx.globalAlpha *= 0.3;
			drawFigure(ctx, h.n, h.x, feet.y, s, {});
			ctx.restore();
			show.text(ctx, 'KO', h.x, feet.y - 150 * s, 40, { fill: '#ff5470', alpha: 0.8 });
			return;
		}
		const bar = project(h.x, h.y, 30);
		art.roundRect(ctx, h.x - PADDLE_W / 2, bar.y - 5, PADDLE_W, 10, 5, { fill: 'rgba(255,255,255,0.14)', stroke: c, lineWidth: 2, alpha: 0.5 + 0.5 * h.swish });
		drawFigure(ctx, h.n, h.x, feet.y, s, { swish: h.swish, side: h.side });
		show.text(ctx, String(h.score), h.x, feet.y - 140 * s, 40, { fill: c });
	}

	/* ---------- the controls intro ---------- */

	// The step through the controls: one at a time, each with its caption
	// and a live demo. A step moves on once the players have done it (and it
	// has had its minimum time), or when its time runs out.
	const practice = { i: 0, age: 0, done: false, doneAge: 0, caught: 0, slashed: false, nextBall: 0, spawned: false, startY: [] };

	function enterStep(i) {
		Object.assign(practice, { i, age: 0, done: false, doneAge: 0, caught: 0, slashed: false, nextBall: 0.4, spawned: false });
		moved = 0;
		tapped = false;
		balls = [];
		walkers = [];
		const step = CONTROLS.steps[i];
		if (step) show.fx('stepIn');
	}

	function achieved(step) {
		switch (step.id) {
			case 'tap': return tapped;
			case 'move': return moved > CONTROLS.moved * Math.max(1, hunters.length);
			case 'step': return hunters.some((h) => h.y < PADDLE_Y - 90);   // a good step in
			case 'catch': return practice.caught >= Math.max(2, hunters.length);
			case 'slash': return practice.slashed;
		}
		return false;
	}

	function stepControls(dt) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		practice.age += dt;
		if (step.id === 'catch') {
			// a slow ball drops from the far edge over each hunter in turn
			practice.nextBall -= dt;
			if (practice.nextBall <= 0 && hunters.length) {
				practice.nextBall = CONTROLS.ballEvery;
				const h = hunters[Math.floor(practice.age / CONTROLS.ballEvery) % hunters.length];
				balls.push({ x: h.x + (Math.random() - 0.5) * 60, y: 40, vx: 0, vy: CONTROLS.ballSpeed, type: 'slow', speed: CONTROLS.ballSpeed * 1.6, owner: -1, trail: [], practice: true });
			}
		}
		if (step.id === 'slash' && !practice.spawned && hunters.length) {
			// one practice demon walks in toward the middle hunter
			practice.spawned = true;
			const h = hunters[Math.floor((hunters.length - 1) / 2)];
			walkers.push(Walker(h.x, 460, CONTROLS.demonSpeed));
			audio.play('summon', true);
		}
		if (!practice.done && practice.age >= step.min && achieved(step)) {
			practice.done = true;
			audio.play('nice', true);
			for (const h of hunters) pop('NICE!', PLAYER_COLORS[h.n], h.x, h.y - 40);
		}
		if (practice.done) practice.doneAge += dt;
		if ((practice.done && practice.doneAge >= CONTROLS.nice) || practice.age >= step.max) enterStep(practice.i + 1);
	}

	// The camera in close on the hunters, wherever they are.
	function huntersShot() {
		if (!hunters.length) return { x: WIDTH / 2, y: H / 2, z: 1 };
		const xs = hunters.map((h) => h.x);
		const lo = Math.min(...xs);
		const hi = Math.max(...xs);
		return { x: (lo + hi) / 2, y: 800, z: clamp(CONTROLS.fit / (hi - lo + CONTROLS.pad), CONTROLS.zoom[0], CONTROLS.zoom[1]) };
	}

	// Live hints on the plane, under the camera: arrows either side of each
	// hunter to move, ahead of them to step in.
	function drawAids(ctx) {
		const step = CONTROLS.steps[practice.i];
		if (!step || practice.done) return;
		const pulse = 0.5 + 0.5 * Math.sin(clockT * 6);
		for (const h of hunters) {
			const f = project(h.x, h.y + HUNTER_BACK);
			const s = f.s * 1.15;
			const colour = PLAYER_COLORS[h.n];
			if (step.id === 'move') {
				for (const side of [-1, 1]) {
					const x = h.x + side * (120 + 14 * pulse);
					const y = f.y - 60 * s;
					art.poly(ctx, [[x, y - 22], [x + side * 30, y], [x, y + 22]], { fill: colour, alpha: 0.9 });
				}
			}
			if (step.id === 'step') {
				for (let i = 0; i < 3; i++) {
					const y = f.y - 170 * s - i * 26 - pulse * 12;
					art.line(ctx, [[h.x - 20, y + 12], [h.x, y - 6], [h.x + 20, y + 12]], { stroke: colour, lineWidth: 7, alpha: 1 - i * 0.28 });
				}
			}
		}
	}

	/* ---------- the beats ---------- */

	// The running order. Each beat has its length and its own update and
	// draw; the generic ones come from shared/showtime.js.
	show.sequence([
		// 1. how many players (the HUD's picker), over the dimmed field and the title
		{
			id: 'squad',
			length: Infinity,
			enter() { gloom = 0.55; },
		},

		// 1b. the title, crashing in letter by letter
		show.beats.titleDrop({
			lines: [{ text: 'GWI-MA', fill: '#ff4fd8', glow: '#ff3d7a' }, { text: 'SHOWDOWN', fill: '#ffe14d', glow: '#ff7a3d' }],
			update(dt) { stepWorld(dt); },
		}),

		// 2. the ten-minute clock, slamming in out of the dark; it starts
		// counting a moment after it lands, and runs through everything after
		show.beats.clockIntro({
			enter() { gloom = 0.3; },
			update(dt) { stepWorld(dt); },
		}),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors({
			update(dt) { stepWorld(dt); },
		}),

		// 3. the controls, one at a time, the camera in close on the hunters; no Gwi-Ma yet
		{
			id: 'controls',
			length: CONTROLS.steps.reduce((a, s) => a + s.max + CONTROLS.nice, 0),   // a safety net: each step has its own limit
			done: () => practice.i >= CONTROLS.steps.length,
			enter() {
				gloom = 0;
				boss.gone = true;
				show.camera.follow(huntersShot);
				audio.play('tutorial');
				enterStep(0);
			},
			update(dt) {
				stepWorld(dt);
				stepControls(dt);
			},
			draw(ctx) {
				const step = CONTROLS.steps[practice.i];
				if (!step) return;
				show.onWalls(ctx, function (c, wall) {
					show.slam(c, step.caption, W / 2, 210, step.caption.length > 26 ? 82 : 96, practice.age, { fill: 'white' });
					// which step this is, as pips
					CONTROLS.steps.forEach(function (s, i) {
						const x = W / 2 + (i - (CONTROLS.steps.length - 1) / 2) * 50;
						art.circle(c, x, 300, i === practice.i ? 13 : 9, { fill: i < practice.i || (i === practice.i && practice.done) ? '#ffe14d' : i === practice.i ? 'white' : 'rgba(255,255,255,0.3)' });
					});
					// the side walls light up to be tapped
					if (step.id === 'tap' && !practice.done && wall !== 1) {
						const k = (clockT % 1.2) / 1.2;
						art.circle(c, W / 2, 620, 60 + 120 * k, { stroke: '#ff4fd8', lineWidth: 12 * (1 - k), alpha: 1 - k });
						art.circle(c, W / 2, 620, 46, { fill: '#ff4fd8', alpha: 0.85 });
						show.text(c, 'TAP', W / 2, 622, 34, { glow: 'transparent', outlineWidth: 3 });
					}
					if (practice.done) show.slam(c, 'NICE!', W / 2, 420, 140, practice.doneAge, { fill: '#7dff9e', glow: '#33e0ff', rotate: -0.06 });
				});
			},
		},

		// 4. Gwi-Ma rises at the far edge, roars in close-up, and the fight begins
		{
			id: 'gwima',
			length: ENTRANCE.length,
			enter() {
				const E = ENTRANCE;
				audio.stop('tutorial');
				balls = [];
				walkers = [];
				Object.assign(boss, { x: WIDTH / 2, dir: 1, gone: false, rise: 0, fade: 0, size: 1, pace: 1, bar: false, squish: 0, pause: 0, roar: 0 });
				show.camera.move({ x: WIDTH / 2, y: 330, z: 1.7 }, E.rise[0]);
				show.fx('rumble');
				show.fx('riser', 0.7, 1, E.face);
			},
			update(dt, bt) {
				const E = ENTRANCE;
				stepWorld(dt);
				gloom = 0.8 * between(bt, 0, E.dark) * (1 - between(bt, E.pull, E.pull + E.pullFor));
				boss.rise = between(bt, E.rise[0], E.rise[1]);
				if (bt > E.rise[0] && bt < E.face) show.shake = Math.max(show.shake, 0.1 + 0.35 * boss.rise);
				if (show.cue(E.face)) {
					show.camera.move({ x: boss.x, y: 190, z: E.faceZoom }, 0.22);
					show.fx('roar', 1, 1, 2.4);
					show.stop('rumble');
					boss.roar = 1;
					show.flash = 0.5;
					show.shake = 1;
				}
				if (show.cue(E.name)) { show.fx('villainReveal'); show.shake = 0.8; }
				if (show.cue(E.pull)) { show.camera.wide(E.pullFor); show.fx('whooshLong', 0.6); }
				if (show.cue(E.pull + E.pullFor * 0.7)) boss.bar = true;
				if (show.cue(E.fight)) { show.fx('fight'); show.shake = 0.7; show.flash = 0.4; }
			},
			draw(ctx, bt) {
				const E = ENTRANCE;
				const out = 1 - between(bt, E.pull + 0.3, E.pull + 0.8);
				show.onWalls(ctx, function (c) {
					show.slam(c, 'GWI-MA', W / 2, 840, 230, bt - E.name, { fill: '#ff4fd8', glow: '#ff3d7a', alpha: out });
					show.slam(c, 'FIGHT!', W / 2, 520, 300, bt - E.fight, { fill: '#ffe14d', glow: '#ff7a3d', rotate: -0.06, alpha: 1 - between(bt, E.length - 0.4, E.length) });
				});
			},
		},

		// 5. the rounds, until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				if (!round) begin();
				show.camera.wide(0.4);
				gloom = 0;
				show.label('ROUND ' + round);
			},
			update(dt) {
				// t is play time, for the fight's own pacing; the ten-minute
				// clock is the show's, and it calls TIME! itself.
				t += dt;
				show.label('ROUND ' + round);
				show.record(t, hunters.map((h) => latest[h.n]));
				slowmo = Math.max(0, slowmo - dt * 1.4);
				const k = dt * (1 - ROUND.slowmo * slowmo);
				stepBoss(k);
				stepWorld(k);
				if (clearing > 0) {
					clearAge += dt;
					clearing -= dt;
					if (clearing <= 0) {
						startRound(retrying ? round : round + 1);
						retrying = false;
						show.fx('roar', 0.5, 1, 1.3);
					}
				}
			},
			draw(ctx) {
				show.onWalls(ctx, function (c) {
					if (retrying && clearAge >= 0) {
						const fade = 1 - between(clearAge, LIGHTNING.retry - 0.4, LIGHTNING.retry);
						show.slam(c, 'ALL HUNTERS DOWN', W / 2, 430, 130, clearAge - 0.2, { fill: '#ff5470', glow: '#ff3d6a', alpha: fade });
						show.slam(c, 'ROUND ' + round + ' AGAIN!', W / 2, 580, 80, clearAge - 0.8, { fill: 'white', alpha: fade });
					} else if (clearAge >= 0 && clearAge < ROUND.clear) {
						const fade = 1 - between(clearAge, ROUND.clear - 0.4, ROUND.clear);
						show.slam(c, 'ROUND ' + (round) + ' CLEAR!', W / 2, 430, 150, clearAge - 0.2, { fill: '#ffe14d', glow: '#ff7a3d', alpha: fade });
						show.slam(c, '+' + ROUND.bonus * round + ' TEAM BONUS', W / 2, 580, 70, clearAge - 0.7, { fill: 'white', alpha: fade });
					}
					if (round > 1 && clearing <= 0 && roundAge < 1.6) {
						show.slam(c, 'ROUND ' + round, W / 2, 470, 170, roundAge, { fill: '#ff4fd8', glow: '#ff3d7a', alpha: 1 - between(roundAge, 1.2, 1.6) });
					}
				});
			},
		},

		// 6. TIME!: the world slows and stops, Gwi-Ma sinks away
		show.beats.timeUp({
			enter() { audio.stop('music'); clearing = 0; clearAge = -1; },
			update(dt, bt) {
				stepWorld(dt * show.timeScale);
				boss.fade = between(bt, 1.0, 3.0);
				if (show.cue(1.0)) show.fx('roar', 0.4, 1, 1.6);
			},
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores({ enter() { balls = []; walkers = []; } }),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		// how was it? five faces to tap, sad to happy
		show.beats.rate(),

		show.beats.end({
			enter() {
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(hunters.map((h) => h.score)));
			},
		}),
	]);

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		clockT += dt;
		show.frame(ctx, dt, drawWorld);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		latest = p;
		// The desk simulator: clicking a wall of its little box moves the
		// selected player's hunter onto that wall, like a tap would.
		for (const h of hunters) {
			const pl = p[h.n];
			if (!pl || pl.wallChange === undefined || pl.wallChange === null) continue;
			const wall = pl.wallChange;
			pl.wallChange = undefined;
			if (wall >= 0 && wall <= 2 && ['controls', 'gwima', 'play'].indexOf(show.beat) >= 0) join(h, wall);
		}
	};

	// For tests and the console.
	const ORDER = ['squad', 'clock', 'visors', 'controls', 'gwima', 'play'];
	self.state = function () {
		const beat = show.beat;
		return Object.assign(show.state(), {
			phase: beat === 'play' ? 'play' : ORDER.indexOf(beat) >= 0 ? 'intro' : 'over',
			t, timeLeft: show.timeLeft(), round, clearing: clearing > 0,
			team: teamScore(),
			step: CONTROLS.steps[practice.i] ? CONTROLS.steps[practice.i].id : null, stepAge: practice.age,
			boss: { x: boss.x, hp: boss.hp, max: boss.max, size: boss.size, pace: boss.pace, banished: boss.banished, gone: boss.gone, rise: boss.rise, mode: boss.mode, half: bossHalf() },
			ripples: ripples.length,
			walkers: walkers.map((d) => ({ x: d.x, y: d.y })),
			paused: boss.pause > 0,
			balls: balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, type: b.type, owner: b.owner })),
			hunters: hunters.map((h) => ({ n: h.n, wall: h.wall, x: h.x, y: h.y, score: h.score, down: h.down })),
			attack: attack ? { kind: attack.kind, phase: attack.phase, x: attack.x, wall: attack.wall } : null, retrying,
		});
	};

	// Test hooks: jump to any beat, wind the clock on, place a ball, stop
	// Gwi-Ma moving or firing.
	self.test = {
		skipTo(id) {
			if (!hunters.length) {
				const n = playersMeta ? playersMeta.length : 3;
				for (let i = 0; i < n; i++) hunters.push(Hunter(i, n));
			}
			if (id === 'play' || ORDER.indexOf(id) < 0) {
				show.camera.wide();
				gloom = 0;
				if (!round) begin();
			}
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
		ball(x, y, vx, vy, type = 'slow', owner = -1) {
			balls.push({ x, y, vx, vy, type, speed: SPEEDS[type] * level().ball, owner, trail: [] });
		},
		clear() { balls = []; walkers = []; },
		summon() { boss.pause = PAUSE; boss.summoned = false; },
		walker(x, y) { walkers.push(Walker(x, y)); },
		calm() { boss.nextPause = 1e9; },
		hp(n) { boss.hp = n; },
		attack(kind, x, wall) { startAttack(kind, kind === 'wall' ? null : x, wall); },
		hold(x) { boss.x = x; boss.held = x; boss.dir = 0; boss.cooldown = 1e9; boss.nextPause = 1e9; },
		free(dir) { boss.held = null; boss.dir = dir; boss.mode = 'walk'; },
	};

	self.fini = function () {
		show.fini();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
