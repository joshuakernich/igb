/*
 * Lava Couch
 *
 * The floor is lava, so the whole squad rides one big couch down a winding
 * lava river. Every player stands on the couch on the front wall, where
 * they stand in the room (1:1), and the couch tilts toward the group's
 * centre of mass (the glowing marker on the cushions). A gentle lean steers
 * the couch left or right to dodge rocks, flaming logs and geysers and to
 * scoop up floating snacks and treasure; lean too far and the low end dips
 * into the lava, sizzles, and fills the heat meter. A full meter flips the
 * couch and costs one of three lives. So: spread out to balance, then shift
 * together to steer. Cats, remotes and fishbowls land on the cushions and
 * slide downhill unless someone stands under them. When the rapids come,
 * everyone steps forward together to hop the couch over the rocks.
 *
 * The river comes from the left wall (the stretch ahead, in side view):
 * tap a geyser there to plug it before it reaches you, or tap floating
 * treasure to reel it toward the couch. It flows away onto the right wall,
 * where the wake drifts off and the team's haul piles up on the bank.
 * About four minutes, getting faster and narrower. The team shares one
 * score; players earn their own for catches, holds, hops and taps.
 *
 * Input: px (your weight on the couch: tilt and steer), pz (step forward
 * together to hop the rapids), touches on the left wall.
 */
IGB.register('lava-couch', function LavaCouchGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const DT = 1 / FPS;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const SECONDS = 240;        // the whole run
	const LIVES = 3;
	const SPEED = [900, 1500];  // river speed, world units a second, start to end
	const RIVER_W = [4000, 3000]; // river width, start to end
	const GAP = [2600, 1100];   // river distance between spawns, start to end
	const STEER = 4200;         // sideways speed per unit of off-centre weight
	const DEAD = 0.03;          // off-centre weight this small doesn't steer
	const PULL = 0.35;          // the current eases the couch toward midstream (per second)
	const BANK_MARGIN = 650;    // how close the couch's centre gets to a bank
	const TILT = 40;            // degrees of tilt per unit of off-centre weight
	const DIP = 0.2;            // off-centre weight past this dips an end into the lava
	const HEAT_RATE = 3;        // heat a second per unit of weight past DIP
	const HEAT_BASE = 0.25;     // plus this a second while dipping at all
	const COOL = 0.12;          // heat lost a second while level
	const SCRAPE = 0.25;        // heat a second while grinding a bank
	const HIT = { rock: 0.28, log: 0.34, geyser: 0.42, ridge: 0.4 };
	const HIT_HALF = 620;       // the couch's collision half-width
	const ERUPT_D = 1700;       // a geyser erupts this far ahead of the couch
	const REEL = 1300;          // extra speed of reeled treasure
	const HOP_Z = 0.38;         // pz under this counts as stepped forward
	const HOP_WINDOW = [800, -150]; // river distance ahead where a hop clears the rapids
	const RAPIDS_EVERY = [42, 30]; // seconds between rapids, start to end
	const HOLD = 0.08;          // px within this of a cushion item holds it
	const SLIDE = 2.2;          // cushion items' slide, per unit of off-centre weight
	const ITEM_LIFE = 16;       // seconds a held cushion item stays before hopping off happy
	const MEEP_SCALE = 0.55;

	// Where things sit.
	const HORIZON = 230;        // front wall: the far end of the river
	const NEAR_Y = 590;         // screen y of river distance 0 (the couch's back)
	const Z0 = 1500;            // perspective depth
	const D_FRONT = 5200;       // the front wall shows this far ahead
	const D_LEFT = 7000;        // and the left wall the stretch past that
	const D_WAKE = 6000;        // the right wall shows this much wake
	const COUCH_Y = 830;        // the couch's pivot
	const SEAT_TOP = -62;       // couch-local y of the cushions' top
	const WATERLINE = 912;      // lava in front of the couch
	const L_BAND = [500, 820];  // left wall lava band
	const R_BAND = [560, 840];  // right wall lava band

	const SCORE = { snack: 10, treasure: 25, plug: 10, hop: 20, saved: 15, bonk: -5, lost: -10 };
	const CUSHION_KINDS = ['cat', 'remote', 'fishbowl', 'cat', 'plant'];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-heist.mp3', 0.14, true);
	audio.add('bonk', 'assets/shared/sfx-bounce.mp3', 0.35);
	audio.add('boom', 'assets/shared/sfx-explode.mp3', 0.25);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
	audio.add('treasure', 'assets/shared/sfx-pickup.mp3', 0.35);
	audio.add('plug', 'assets/shared/sfx-correct.mp3', 0.3);
	audio.add('reel', 'assets/shared/sfx-woosh.mp3', 0.3);
	audio.add('hop', 'assets/shared/sfx-woosh-long.mp3', 0.3);
	audio.add('flip', 'assets/shared/sfx-fall.mp3', 0.35);
	audio.add('lost', 'assets/shared/sfx-incorrect.mp3', 0.25);
	audio.add('drop', 'assets/shared/sfx-select.mp3', 0.25);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.35);
	audio.add('rumble', 'assets/shared/sfx-rumble.mp3', 0.25);

	const hud = new HUD('#ff4a1c');
	hud.$el.appendTo(stage.$ui);

	/* ---------- state ---------- */

	const meeps = [];
	const pos = [];             // tracking, by player: { px, pz }
	const items = [];           // things on the river
	const cushions = [];        // things on the couch
	const particles = [];
	const popups = [];
	const flyers = [];          // collected things flying to the pile
	const pile = [];            // the haul on the right wall
	let isLive = false;
	let isOver = false;
	let t = 0;                  // game seconds (live only)
	let clock = 0;              // seconds since start, for animation
	let s = 0;                  // distance travelled down the river
	let camX = 0;               // the couch's sideways position
	let avg = 0.5;
	let off = 0;
	let tilt = 0;               // degrees, eased
	let heat = 0;
	let lives = LIVES;
	let team = 0;
	let dipping = 0;            // how far past DIP the weight is (0 when level)
	let scraping = false;
	let shake = 0;
	let hop = null;             // { t0 } while hopping
	let flip = null;            // { t0, dir } while flipping
	let drop = 0;               // couch dropping back in after a flip (0..1 left)
	let nextU = D_FRONT + 2500;
	let nextRapids = 50;
	let nextCushion = 16;
	let nextId = 0;
	let calm = false;           // tests: no spawning of their own
	let tips = {};              // one-word hints already shown
	const stats = { bonks: 0, hops: 0, plugs: 0, reels: 0, collected: 0, flips: 0, lost: 0, saved: 0, missedHops: 0 };

	/* ---------- helpers ---------- */

	const rand = (a, b) => a + Math.random() * (b - a);
	const pick = (list) => list[Math.floor(Math.random() * list.length)];
	const prog = () => Math.min(1, t / SECONDS);
	const span = (pair) => lerp(pair[0], pair[1], prog());
	const riverW = () => span(RIVER_W);

	// The river's middle, sideways, at river distance u.
	function centre(u) {
		return 1100 * Math.sin(u / 14000) + 600 * Math.sin(u / 5300 + 1.3);
	}

	// Perspective on the front wall: d is river distance ahead of the couch.
	function f(d) {
		return Z0 / (Z0 + Math.max(d, -Z0 * 0.5));
	}
	function sy(d) {
		return HORIZON + (NEAR_Y - HORIZON) * f(d);
	}
	function sx(X, d) {
		return W * 1.5 + (X - camX) * f(d);
	}

	// The left wall: the stretch past the front wall, flowing toward the
	// corner. River-left is higher up the band (further from the room).
	function leftPos(it) {
		const d = it.u - s;
		const lane = clamp((it.X - centre(it.u)) / (riverW() / 2), -1, 1);
		return {
			x: W * (1 - (d - D_FRONT) / D_LEFT),
			y: (L_BAND[0] + L_BAND[1]) / 2 + 20 + lane * 115,
		};
	}

	// The right wall: the wake, flowing away from the corner.
	function rightPos(it) {
		const d = it.u - s;
		const lane = clamp((it.X - centre(it.u)) / (riverW() / 2), -1, 1);
		return {
			x: 2 * W + 40 + (-d - 900) / D_WAKE * W,
			y: (R_BAND[0] + R_BAND[1]) / 2 + 10 - lane * 105,
		};
	}

	function players() {
		return meeps.map((m, n) => pos[n]);
	}

	function score(n, pts) {
		if (n < 0 || !meeps[n]) return;
		meeps[n].score += pts;
		meeps[n].doScore(pts);
	}

	function addTeam(pts) {
		team = Math.max(0, team + pts);
	}

	// The player standing nearest a point on the couch (px 0..1).
	function nearestPlayer(px) {
		let best = -1;
		let bd = Infinity;
		pos.forEach(function (p, n) {
			const d = Math.abs(p.px - px);
			if (d < bd) { bd = d; best = n; }
		});
		return best;
	}

	// The player nearest a touch on the left wall: close to that wall
	// (px small) and level with the touch (left-wall x fraction is 1 - pz).
	function nearestToLeftWall(x) {
		const pz = 1 - x / W;
		let best = 0;
		let bd = Infinity;
		pos.forEach(function (p, n) {
			const d = p.px + Math.abs(p.pz - pz);
			if (d < bd) { bd = d; best = n; }
		});
		return best;
	}

	function popup(text, x, y, color, size) {
		popups.push({ text, x, y, life: 0, color: color || '#fff2b0', size: size || 70 });
	}

	function tip(key, text, x, y) {
		if (tips[key]) return;
		tips[key] = true;
		hud.flashMessage(x, y, text, 110, 1600);
	}

	/* ---------- sizzle (a little synthesised hiss) ---------- */

	let sizzle = null;
	try {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (AC) {
			const actx = new AC();
			const buf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.random());
			const src = actx.createBufferSource();
			src.buffer = buf;
			src.loop = true;
			const hp = actx.createBiquadFilter();
			hp.type = 'highpass';
			hp.frequency.value = 3500;
			const gain = actx.createGain();
			gain.gain.value = 0;
			src.connect(hp).connect(gain).connect(actx.destination);
			src.start();
			sizzle = { actx, gain };
		}
	} catch (e) { sizzle = null; }

	function setSizzle(level) {
		if (!sizzle) return;
		try {
			sizzle.gain.gain.setTargetAtTime(level * 0.25, sizzle.actx.currentTime, 0.05);
		} catch (e) { /* closed */ }
	}

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const m = new Meep(i);
			m.scale = MEEP_SCALE;
			m.x = ((i + 1) / (count + 1) - 0.5) * W;
			m.y = SEAT_TOP;
			m.shadow.visible = false;
			meeps.push(m);
			pos.push({ px: (i + 1) / (count + 1), pz: 0.6 });
		}
		camX = centre(0);
		hud.initPlayers(meeps);
		audio.play('music');
		hud.initBanner('Balance the couch!');
		stage.timeout(hud.finiBanner, 2400);
		stage.timeout(function () {
			isLive = true;
			hud.initTimer(SECONDS, finiGame);
			tip('steer', 'Lean to steer!', 1.5, 0.45);
		}, 3000);
	}

	function finiGame() {
		if (isOver) return;
		isOver = true;
		isLive = false;
		hud.finiTimer();
		setSizzle(0);
		hud.initBanner(lives > 0 ? `Made it! Team ${team}` : `Sunk! Team ${team}`);
		audio.play('cheer', true);
		stage.timeout(function () {
			hud.finiBanner();
			audio.stop('music');
			const scores = meeps.map((m) => m.score);
			const rewards = scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);
			stage.timeout(() => IGB.complete(rewards), 5000);
		}, 3000);
	}

	/* ---------- spawning ---------- */

	function spawnAt(kind, u, X) {
		const it = { id: ++nextId, kind, u, X, r: 110, seed: Math.random() * 1000, hit: false, plugged: false, reel: false, cleared: false, ready: 0 };
		if (kind === 'log') it.r = 260;
		if (kind === 'geyser') it.r = 130;
		if (kind === 'treasure') it.r = 130;
		if (kind === 'ridge') it.r = 99999;
		items.push(it);
		return it;
	}

	function spawnNext() {
		const p = prog();
		const u = nextU;
		const half = riverW() / 2 - 520;
		const X = () => centre(u) + rand(-1, 1) * half;
		if (t > 0 && t >= nextRapids - (D_FRONT + D_LEFT) / span(SPEED)) {
			// Rapids: a ridge of small rocks right across the river.
			nextRapids += span(RAPIDS_EVERY);
			spawnAt('ridge', u, centre(u));
			nextU += span(GAP) * 1.6;
			return;
		}
		const r = Math.random();
		let kind;
		if (t < 20) kind = r < 0.55 ? 'rock' : 'snack';
		else if (r < 0.28) kind = 'rock';
		else if (r < 0.28 + 0.22 * Math.min(1, p * 3)) kind = 'geyser';
		else if (r < 0.62 && t > 60) kind = 'log';
		else if (r < 0.74) kind = 'treasure';
		else kind = 'snack';
		if (kind === 'rock' && p > 0.35 && Math.random() < 0.45) {
			// A gate: two rocks with a couch-wide gap between them.
			const gate = centre(u) + rand(-1, 1) * (half - 300);
			const gap = HIT_HALF + 110 + rand(120, 260);
			spawnAt('rock', u, gate - gap);
			spawnAt('rock', u + rand(-150, 150), gate + gap);
		} else {
			spawnAt(kind, u, X());
		}
		// Snacks love company: sometimes a trail of them.
		if (kind === 'snack' && Math.random() < 0.4) {
			const x0 = X();
			for (let i = 1; i < 3; i++) spawnAt('snack', u + i * 260, x0 + i * rand(-180, 180));
		}
		nextU += span(GAP) * rand(0.7, 1.3);
	}

	function spawnCushion(kind, u) {
		const c = { kind: kind || pick(CUSHION_KINDS), u, v: 0, age: 0, held: 0, holder: -1, drop: 1, falling: null, gone: false };
		cushions.push(c);
		audio.play('drop', true);
		tip('hold', 'Hold it up!', 1.5, 0.35);
		return c;
	}

	function maybeCushion() {
		if (t < nextCushion || flip || drop > 0) return;
		const max = prog() < 0.3 ? 1 : prog() < 0.65 ? 2 : 3;
		nextCushion = t + rand(6, 10);
		if (cushions.filter((c) => !c.falling && !c.gone).length >= max) return;
		// Somewhere not already taken, often where nobody is standing.
		let best = 0.5;
		let bestScore = -1;
		for (let k = 0; k < 12; k++) {
			const u = rand(0.14, 0.86);
			const near = Math.min(1, ...cushions.map((c) => Math.abs(c.u - u)));
			const fromPlayers = Math.min(1, ...pos.map((p) => Math.abs(p.px - u)));
			const sc = Math.min(near, 0.3) + fromPlayers * 0.5 + Math.random() * 0.1;
			if (sc > bestScore) { bestScore = sc; best = u; }
		}
		spawnCushion(null, best);
	}

	/* ---------- touches ---------- */

	function touch(p) {
		if (p.x >= W || !isLive || isOver) return;
		let best = null;
		let bd = 150;
		for (const it of items) {
			const d = it.u - s;
			if (d <= D_FRONT || it.hit) continue;
			if (it.kind !== 'geyser' && it.kind !== 'treasure') continue;
			if (it.plugged || it.reel) continue;
			const lp = leftPos(it);
			const dist = Math.hypot(lp.x - p.x, lp.y - 30 - p.y);
			if (dist < bd) { bd = dist; best = it; }
		}
		if (!best) return;
		const n = nearestToLeftWall(p.x);
		const lp = leftPos(best);
		if (best.kind === 'geyser') {
			best.plugged = true;
			stats.plugs++;
			addTeam(SCORE.plug);
			score(n, 2);
			audio.play('plug', true);
			popup('PLUGGED!', lp.x, lp.y - 150, '#bff3ff');
			for (let i = 0; i < 14; i++) {
				particles.push({ x: lp.x, y: lp.y - 20, vx: rand(-6, 6), vy: rand(-12, -4), g: 0.5, life: 0, max: rand(25, 40), size: rand(10, 20), color: '#9be7ff', kind: 'drop' });
			}
		} else {
			best.reel = true;
			best.reeler = n;
			stats.reels++;
			score(n, 1);
			audio.play('reel', true);
			popup('REEL IT IN!', lp.x, lp.y - 150, '#ffe66b');
		}
	}
	stage.$el.on('click.lavacouch', (e) => touch(IGB.toWorld(e)));

	/* ---------- every tick ---------- */

	function step() {
		clock += DT;
		if (!meeps.length) return;

		// Weight: the group's centre of mass on the couch.
		avg = pos.reduce((a, p) => a + p.px, 0) / pos.length;
		off = avg - 0.5;
		const canSteer = !flip && drop <= 0;

		// Before the start the couch idles gently down the river.
		const speed = isLive ? span(SPEED) * (flip ? 0.35 : 1) : 250;
		if (isLive) t += DT;
		s += speed * DT;

		if (canSteer && !isOver) {
			const push = Math.sign(off) * Math.max(0, Math.abs(off) - DEAD) * STEER;
			camX += push * DT;
		}
		camX += (centre(s) - camX) * PULL * DT;
		const lim = riverW() / 2 - BANK_MARGIN;
		scraping = false;
		if (Math.abs(camX - centre(s)) > lim) {
			camX = centre(s) + Math.sign(camX - centre(s)) * lim;
			scraping = canSteer && isLive;
			if (scraping && Math.random() < 0.6) {
				const side = Math.sign(camX - centre(s));
				particles.push({ x: W * 1.5 + side * 760, y: COUCH_Y - rand(0, 120), vx: -side * rand(2, 8), vy: rand(-10, -3), g: 0.4, life: 0, max: 30, size: rand(6, 12), color: '#ffd04a', kind: 'spark' });
			}
		}

		// Tilt and dipping.
		const target = canSteer ? off * TILT : 0;
		tilt += (target - tilt) * 0.12;
		dipping = canSteer && !isOver ? Math.max(0, Math.abs(off) - DIP) : 0;
		if (isLive && canSteer) {
			if (dipping > 0) heat += (dipping * HEAT_RATE + HEAT_BASE) * DT;
			else heat -= COOL * DT;
			if (scraping) heat += SCRAPE * DT;
			heat = clamp(heat, 0, 1);
			if (heat >= 1) startFlip();
		}
		setSizzle(dipping > 0 ? Math.min(1, 0.4 + dipping * 3) : scraping ? 0.25 : 0);
		if (dipping > 0) {
			const side = Math.sign(off);
			const ex = W * 1.5 + side * rand(560, 720);
			if (Math.random() < 0.8) particles.push({ x: ex, y: WATERLINE - 10, vx: rand(-1.5, 1.5), vy: rand(-5, -2), g: -0.02, life: 0, max: rand(40, 70), size: rand(22, 44), color: 'rgba(235,225,235,0.55)', kind: 'steam' });
			if (Math.random() < 0.5) particles.push({ x: ex, y: WATERLINE, vx: rand(-4, 4), vy: rand(-12, -6), g: 0.5, life: 0, max: 30, size: rand(6, 11), color: '#ffcf3a', kind: 'spark' });
			if (Math.floor(clock * 1.2) !== Math.floor((clock - DT) * 1.2)) popup('SIZZLE!', W * 1.5 + side * 560, 560, '#ff8a3a', 80);
		}
		shake *= 0.9;

		// Hops and flips.
		if (hop && clock - hop.t0 > 0.8) hop = null;
		if (flip && clock - flip.t0 > 2.6) endFlip();
		if (drop > 0) drop = Math.max(0, drop - DT / 0.9);

		// The river.
		if (isLive && !calm) {
			while (nextU < s + D_FRONT + D_LEFT) spawnNext();
			maybeCushion();
		}
		for (const it of items) moveItem(it, speed);
		for (let i = items.length - 1; i >= 0; i--) {
			const it = items[i];
			if (it.gone || it.u - s < -900 - D_WAKE - 400) items.splice(i, 1);
		}

		stepCushions();
		stepFlyers();

		for (const p of particles) {
			p.life++;
			p.x += p.vx;
			p.y += p.vy;
			p.vy += p.g || 0;
		}
		for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life > particles[i].max) particles.splice(i, 1);
		for (const p of popups) p.life++;
		for (let i = popups.length - 1; i >= 0; i--) if (popups[i].life > 70) popups.splice(i, 1);

		// Meeps ride the couch where their players stand.
		meeps.forEach(function (m, n) {
			if (flip) return;
			const p = pos[n];
			m.x = clamp(p.px - 0.5, -0.43, 0.43) * W;
			m.y = SEAT_TOP;
			const fwd = p.pz < HOP_Z;
			m.scale = MEEP_SCALE * (1 + (0.5 - p.pz) * 0.12);
			const lift = hop ? -70 : rapidsAhead() && fwd ? -25 : 0;
			Object.assign(m.handLeft, { x: -70, y: 0.6 * m.h + lift * 2 });
			Object.assign(m.handRight, { x: 70, y: 0.6 * m.h + lift * 2 });
		});
		hud.updatePlayers(meeps);
	}

	function moveItem(it, speed) {
		const prev = it.u - s + speed * DT;
		if (it.reel && !it.hit) {
			it.X += (camX - it.X) * Math.min(1, 2.2 * DT);
			if (it.u - s > D_FRONT * 0.35) it.u -= REEL * DT;
		}
		const d = it.u - s;
		if (it.kind === 'geyser' && !it.plugged && d < ERUPT_D && !it.erupted && d > -600) {
			it.erupted = true;
			audio.play('rumble', true);
		}
		if (it.kind === 'ridge') {
			stepRidge(it, d);
			return;
		}
		if (!it.hit && prev > 0 && d <= 0 && !flip && drop <= 0 && isLive) {
			if (Math.abs(it.X - camX) < HIT_HALF + it.r) collide(it);
		}
	}

	function collide(it) {
		const x = sx(it.X, 0);
		const px = clamp((x - W) / W, 0, 1);
		if (it.kind === 'snack' || it.kind === 'treasure') {
			it.hit = true;
			it.gone = true;
			stats.collected++;
			const n = nearestPlayer(px);
			if (it.kind === 'snack') {
				addTeam(SCORE.snack);
				score(n, 1);
				audio.play('coin', true);
				popup('YUM!', x, 520, '#ffe66b', 70);
			} else {
				addTeam(SCORE.treasure);
				score(n, 2);
				if (it.reel && it.reeler !== undefined && it.reeler !== n) score(it.reeler, 1);
				audio.play('treasure', true);
				popup('TREASURE!', x, 500, '#ffd23a', 90);
			}
			flyers.push({ kind: it.kind, seed: it.seed, x0: x, y0: NEAR_Y - 40, t: 0 });
			return;
		}
		if (it.kind === 'geyser' && (it.plugged || !it.erupted)) return;
		it.hit = true;
		stats.bonks++;
		heat = Math.min(1, heat + HIT[it.kind]);
		shake = 1;
		addTeam(SCORE.bonk);
		audio.play(it.kind === 'rock' ? 'bonk' : 'boom', true);
		popup(it.kind === 'rock' ? 'BONK!' : it.kind === 'log' ? 'OUCH!' : 'SCORCHED!', x, 480, '#ff6a3a', 100);
		for (const c of cushions) if (c.holder < 0 && !c.falling) c.v += rand(-0.5, 0.5);
		for (let i = 0; i < 16; i++) {
			particles.push({ x: x + rand(-60, 60), y: NEAR_Y - rand(0, 80), vx: rand(-9, 9), vy: rand(-16, -6), g: 0.6, life: 0, max: rand(30, 50), size: rand(8, 16), color: it.kind === 'rock' ? '#6b5a73' : '#ffb02e', kind: 'spark' });
		}
		if (heat >= 1) startFlip();
	}

	function rapidsAhead() {
		return items.some((it) => it.kind === 'ridge' && !it.cleared && !it.hit && it.u - s < 3600 && it.u - s > HOP_WINDOW[1]);
	}

	function stepRidge(it, d) {
		if (it.cleared || it.hit || !isLive) return;
		if (d < 4200) tip('rapids', 'Step forward!', 1.5, 0.4);
		if (d <= HOP_WINDOW[0] && d >= HOP_WINDOW[1] && !flip && drop <= 0) {
			const ready = pos.filter((p) => p.pz < HOP_Z).length;
			it.ready = ready;
			// most of the group is enough (all of a pair; 3 of 4, 5 of 6)
			if (ready >= Math.max(1, Math.ceil(pos.length * 0.75))) {
				it.cleared = true;
				hop = { t0: clock };
				stats.hops++;
				addTeam(SCORE.hop);
				pos.forEach((p, n) => score(n, 1));
				audio.play('hop', true);
				popup('HOP!', W * 1.5, 450, '#8affc1', 140);
			}
		}
		if (d < HOP_WINDOW[1]) {
			it.hit = true;
			if (flip || drop > 0) return;
			stats.missedHops++;
			stats.bonks++;
			heat = Math.min(1, heat + HIT.ridge);
			shake = 1.4;
			addTeam(SCORE.bonk);
			audio.play('bonk', true);
			popup('CRUNCH!', W * 1.5, 470, '#ff6a3a', 110);
			if (heat >= 1) startFlip();
		}
	}

	/* ---------- the couch's cargo ---------- */

	function stepCushions() {
		for (const c of cushions) {
			if (c.drop > 0) c.drop = Math.max(0, c.drop - DT / 0.6);
			if (c.falling) {
				c.falling.t += DT;
				if (c.falling.t > 1.2) c.gone = true;
				continue;
			}
			if (flip) {
				c.falling = { t: 0, dir: c.u < 0.5 ? -1 : 1 };
				continue;
			}
			c.age += DT;
			// Held when a player stands under it.
			let holder = -1;
			let hd = HOLD;
			pos.forEach(function (p, n) {
				const d = Math.abs(p.px - c.u);
				if (d < hd) { hd = d; holder = n; }
			});
			c.holder = holder;
			if (holder >= 0) {
				c.v = 0;
				c.held += DT;
				if (Math.floor(c.held / 2) !== Math.floor((c.held - DT) / 2)) score(holder, 1);
			} else if (c.drop <= 0) {
				c.v += (off * SLIDE + Math.sin(clock * 3 + c.u * 9) * 0.02) * DT;
				c.v *= 0.985;
				c.u += c.v * DT;
			}
			if (c.u < 0.05 || c.u > 0.95) {
				c.falling = { t: 0, dir: c.u < 0.5 ? -1 : 1 };
				stats.lost++;
				addTeam(SCORE.lost);
				audio.play('lost', true);
				popup(c.kind === 'cat' ? 'MEOW!' : 'SPLOOSH!', W + c.u * W, 600, '#ff9a6b', 90);
			} else if (c.age > ITEM_LIFE && c.holder >= 0) {
				// Kept safe long enough: off it pops to the bank, happy.
				c.gone = true;
				stats.saved++;
				addTeam(SCORE.saved);
				score(c.holder, 2);
				audio.play('treasure', true);
				popup('SAVED!', W + c.u * W, 520, '#8affc1', 80);
				flyers.push({ kind: c.kind, seed: 0, x0: W + c.u * W, y0: COUCH_Y - 120, t: 0 });
			}
		}
		for (let i = cushions.length - 1; i >= 0; i--) if (cushions[i].gone) cushions.splice(i, 1);
	}

	// Collected things arc over to the haul on the right wall.
	function stepFlyers() {
		for (const fl of flyers) fl.t += DT / 1.1;
		for (let i = flyers.length - 1; i >= 0; i--) {
			const fl = flyers[i];
			if (fl.t < 1) continue;
			flyers.splice(i, 1);
			pile.push({ kind: fl.kind, seed: fl.seed, ...pileSpot(pile.length) });
		}
	}

	// The haul stacks up in a heap on the right wall's near bank.
	function pileSpot(n) {
		// Rows fill from the bottom, each a little narrower than the last.
		let row = 0;
		let k = n;
		let across = 18;
		while (k >= across) {
			k -= across;
			row++;
			across = Math.max(4, 18 - row * 2);
		}
		const x = 2 * W + 820 + (k - (across - 1) / 2) * 58 + ((n * 37) % 17) - 8;
		const y = 955 - row * 34 - ((n * 13) % 9);
		return { x, y, rot: ((n * 53) % 40) - 20 };
	}

	function startFlip() {
		if (flip || !isLive) return;
		flip = { t0: clock, dir: Math.sign(off) || 1 };
		stats.flips++;
		lives--;
		heat = 1;
		shake = 2;
		setSizzle(0);
		audio.play('flip', true);
		audio.play('boom', true);
		meeps.forEach((m) => m.toRagdoll());
		hud.flashMessage(1.5, 0.4, lives > 0 ? 'FLIPPED!' : 'SUNK!', 160, 1400);
		for (let i = 0; i < 40; i++) {
			particles.push({ x: W * 1.5 + rand(-600, 600), y: WATERLINE, vx: rand(-8, 8), vy: rand(-22, -8), g: 0.7, life: 0, max: rand(40, 70), size: rand(10, 24), color: pick(['#ffcf3a', '#ff7a1a', '#ff4a1c']), kind: 'drop' });
		}
		if (lives <= 0) stage.timeout(finiGame, 1800);
	}

	function endFlip() {
		flip = null;
		if (isOver || lives <= 0) return;
		heat = 0;
		drop = 1;
		meeps.forEach((m) => { m.toIdle(); m.rotate = 0; });
		// A breather: clear the river just ahead.
		for (const it of items) if (it.u - s < 2200 && it.kind !== 'snack' && it.kind !== 'treasure') it.hit = true;
		hud.flashMessage(1.5, 0.35, 'Back on!', 120, 900);
	}

	/* ---------- drawing (every animation frame) ---------- */

	self.draw = function (ctx) {
		drawLeftWall(ctx);
		drawRightWall(ctx);
		drawFrontWall(ctx);
		for (const fl of flyers) {
			const e = fl.t;
			const tx = 2 * W + 820;
			const x = lerp(fl.x0, tx, e);
			const y = lerp(fl.y0, 880, e) - Math.sin(e * Math.PI) * 420;
			drawThing(ctx, fl.kind, x, y, 0.8, fl.seed, e * 360);
		}
		drawParticles(ctx);
		for (const p of popups) {
			const a = p.life < 50 ? 1 : 1 - (p.life - 50) / 20;
			art.text(ctx, p.text, p.x, p.y - p.life * 1.5, { size: p.size, font: 'Knewave', fill: p.color, outline: '#2a0f1e', outlineWidth: 8, alpha: Math.max(0, a) });
		}
	};

	function drawParticles(ctx) {
		for (const p of particles) {
			const a = 1 - p.life / p.max;
			if (p.kind === 'steam') art.circle(ctx, p.x, p.y, p.size * (1 + p.life / p.max), { fill: p.color, alpha: a * 0.8 });
			else art.circle(ctx, p.x, p.y, p.size * (0.5 + a * 0.5), { fill: p.color, alpha: Math.min(1, a * 1.5) });
		}
	}

	// A cave sky with glowing stalactites, shared by every wall.
	function drawCave(ctx, x0, horizon) {
		art.rect(ctx, x0, 0, W, horizon, { fill: art.linear(ctx, 0, 0, 0, horizon, ['#14081f', '#2c0f33', '#6b1f2c', '#b2401f']) });
		for (let i = 0; i < 9; i++) {
			const x = x0 + 60 + i * 185 + ((i * 71) % 50);
			const len = 70 + ((i * 97) % 110);
			art.poly(ctx, [[x - 40, 0], [x + 40, 0], [x + 6, len], [x, len + 18], [x - 6, len]], { fill: '#1e0b25' });
			art.circle(ctx, x, len + 22, 5, { fill: '#ff8a3a', alpha: 0.5 + 0.5 * Math.sin(clock * 2 + i) });
		}
	}

	function drawLava(ctx, x, y, w, h, flow, dir) {
		art.rect(ctx, x, y, w, h, { fill: art.linear(ctx, 0, y, 0, y + h, ['#ff9a1f', '#ff5a14', '#d6290f']) });
		// Crust plates drifting with the flow.
		ctx.save();
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		const step = 260;
		const shift = ((flow * dir) % step + step) % step;
		for (let row = 0; row < 4; row++) {
			const ry = y + (row + 0.5) * h / 4;
			for (let k = -1; k < w / step + 1; k++) {
				const px = x + k * step + shift + (row % 2) * step / 2;
				const wob = Math.sin(k * 3.1 + row * 1.7) * 30;
				art.ellipse(ctx, px, ry + wob * 0.4, 70 + wob, 16 + row * 2, { fill: '#7a1e14', alpha: 0.55 });
				art.ellipse(ctx, px + 30, ry + wob * 0.4 - 4, 30, 5, { fill: '#ffe07a', alpha: 0.6 });
			}
		}
		ctx.restore();
	}

	function drawBank(ctx, x, y, w, h, seed) {
		art.rect(ctx, x, y, w, h, { fill: art.linear(ctx, 0, y, 0, y + h, ['#3a1a3e', '#1c0c20']) });
		for (let i = 0; i < 14; i++) {
			const bx = x + ((i * 131 + seed) % w);
			const r = 30 + ((i * 53 + seed) % 50);
			art.ellipse(ctx, bx, y + 6, r, r * 0.45, { fill: '#2e1432' });
		}
		art.rect(ctx, x, y - 4, w, 8, { fill: '#ffb347', alpha: 0.6 });
	}

	/* ---------- left wall: upstream ---------- */

	function drawLeftWall(ctx) {
		drawCave(ctx, 0, L_BAND[0]);
		// The far bank, with stalagmites.
		art.poly(ctx, [[0, L_BAND[0]], [0, L_BAND[0] - 60], [180, L_BAND[0] - 110], [320, L_BAND[0] - 50], [520, L_BAND[0] - 140], [700, L_BAND[0] - 60], [980, L_BAND[0] - 120], [1200, L_BAND[0] - 40], [1420, L_BAND[0] - 100], [W, L_BAND[0] - 50], [W, L_BAND[0]]], { fill: '#24102a' });
		drawLava(ctx, 0, L_BAND[0], W, L_BAND[1] - L_BAND[0], s * (W / D_LEFT), 1);
		art.rect(ctx, 0, L_BAND[0], W, 10, { fill: '#ffd36b', alpha: 0.5 });
		drawBank(ctx, 0, L_BAND[1], W, H - L_BAND[1], 7);
		// Flow arrows toward the corner.
		for (let i = 0; i < 3; i++) {
			const ax = ((s * W / D_LEFT * 0.5 + i * 540) % (W + 200)) - 100;
			art.text(ctx, '➜', ax, L_BAND[1] + 80, { size: 70, fill: '#ff8a3a', alpha: 0.35 });
		}
		art.text(ctx, 'COMING UP', W / 2, 90 + 210, { size: 60, font: 'Knewave', fill: '#ffb36b', outline: '#2a0f1e', outlineWidth: 6, alpha: 0.75 });

		for (const it of items) {
			const d = it.u - s;
			if (d <= D_FRONT || it.hit) continue;
			const p = leftPos(it);
			if (p.x < -150) continue;
			drawLeftItem(ctx, it, p.x, p.y);
		}
	}

	function drawLeftItem(ctx, it, x, y) {
		const bob = Math.sin(clock * 3 + it.seed) * 6;
		if (it.kind === 'ridge') {
			for (let k = -2; k <= 2; k++) drawRock(ctx, x + k * 18, L_BAND[0] + 40 + (k + 2) * 62, 0.45, it.seed + k);
			art.text(ctx, 'RAPIDS', x, L_BAND[0] - 50, { size: 54, font: 'Knewave', fill: '#8affc1', outline: '#12301f', outlineWidth: 6 });
			return;
		}
		if (it.kind === 'geyser' || it.kind === 'treasure') {
			// Tappable: a pulsing ring.
			if (!it.plugged && !it.reel) {
				const pulse = (clock * 1.3 + it.seed) % 1;
				art.circle(ctx, x, y - 30, 90 + pulse * 40, { stroke: '#ffffff', lineWidth: 6, alpha: 0.7 * (1 - pulse) });
				if (!tips['tap-' + it.kind] && x > 250 && isLive) tip('tap-' + it.kind, 'Tap!', x / W, (y - 230) / H);
			}
		}
		if (it.kind === 'geyser') {
			const near = 1 - clamp((it.u - s - D_FRONT) / D_LEFT, 0, 1);
			drawVent(ctx, x, y + bob * 0.3, 1.1, it.plugged, near);
			if (!it.plugged && Math.sin(clock * (6 + near * 10) + it.seed) > 0.6) {
				art.circle(ctx, x + Math.sin(clock * 9 + it.seed) * 20, y - 40 - near * 50, 10 + near * 8, { fill: '#ffdf5a' });
			}
		} else if (it.kind === 'treasure' && it.reel) {
			// The line reeling it toward the corner.
			art.line(ctx, [[W, 300], [lerp(W, x, 0.5), 300 + (y - 300) * 0.4], [x, y - 40]], { stroke: '#f6f1e0', lineWidth: 4 });
			drawThing(ctx, it.kind, x, y - 20 + bob, 1.1, it.seed);
		} else {
			drawThing(ctx, it.kind, x, y - 20 + bob, 1.1, it.seed);
		}
	}

	/* ---------- right wall: the wake and the haul ---------- */

	function drawRightWall(ctx) {
		const x0 = 2 * W;
		drawCave(ctx, x0, R_BAND[0]);
		art.poly(ctx, [[x0, R_BAND[0]], [x0, R_BAND[0] - 40], [x0 + 260, R_BAND[0] - 120], [x0 + 470, R_BAND[0] - 50], [x0 + 760, R_BAND[0] - 100], [x0 + 1050, R_BAND[0] - 30], [x0 + 1300, R_BAND[0] - 130], [x0 + W, R_BAND[0] - 60], [x0 + W, R_BAND[0]]], { fill: '#24102a' });
		drawLava(ctx, x0, R_BAND[0], W, R_BAND[1] - R_BAND[0], s * (W / D_WAKE), 1);
		art.rect(ctx, x0, R_BAND[0], W, 10, { fill: '#ffd36b', alpha: 0.5 });
		// The couch's wake: a V of churned crust from the corner.
		const mid = (R_BAND[0] + R_BAND[1]) / 2;
		for (let k = 0; k < 6; k++) {
			const ph = ((clock * 0.6 + k / 6) % 1);
			const wx = x0 + ph * W;
			const spread = 30 + ph * 110;
			art.line(ctx, [[wx - 60, mid - spread], [wx, mid - spread * 0.4]], { stroke: '#ffe9a3', lineWidth: 8, alpha: 0.5 * (1 - ph) });
			art.line(ctx, [[wx - 60, mid + spread], [wx, mid + spread * 0.4]], { stroke: '#ffe9a3', lineWidth: 8, alpha: 0.5 * (1 - ph) });
		}
		for (const it of items) {
			const d = it.u - s;
			if (d > -900 || it.gone) continue;
			if (it.kind === 'ridge') continue;
			const p = rightPos(it);
			if (p.x < x0 - 100 || p.x > x0 + W + 150) continue;
			const bob = Math.sin(clock * 3 + it.seed) * 6;
			if (it.kind === 'geyser') drawVent(ctx, p.x, p.y, 0.9, it.plugged, 0);
			else drawThing(ctx, it.kind, p.x, p.y - 15 + bob, 0.9, it.seed);
		}
		drawBank(ctx, x0, R_BAND[1], W, H - R_BAND[1], 3);

		// The haul.
		for (const pc of pile) drawThing(ctx, pc.kind, pc.x, pc.y - 25, 0.62, pc.seed, pc.rot);

		// The team's score and lives.
		const bx = x0 + W / 2;
		art.roundRect(ctx, bx - 420, 120, 840, 250, 40, { fill: 'rgba(30,10,30,0.82)', stroke: '#ff4a1c', lineWidth: 8, shadow: { color: 'rgba(0,0,0,0.5)', blur: 20, y: 8 } });
		art.text(ctx, 'HAUL', bx - 200, 205, { size: 80, font: 'Knewave', fill: '#ffd23a', outline: '#2a0f1e', outlineWidth: 6 });
		art.text(ctx, String(team), bx + 190, 210, { size: 120, font: 'Knewave', fill: '#ffffff', outline: '#2a0f1e', outlineWidth: 8 });
		for (let i = 0; i < LIVES; i++) {
			drawMiniCouch(ctx, bx - 150 + i * 150, 315, 0.55, i < lives);
		}
	}

	/* ---------- front wall: the ride ---------- */

	function drawFrontWall(ctx) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(W, 0, W, H);
		ctx.clip();
		const shx = (Math.random() - 0.5) * 18 * shake;
		ctx.translate(shx, 0);

		drawCave(ctx, W, HORIZON);
		// Far volcano and the glow off the river.
		art.poly(ctx, [[W + 420, HORIZON], [W + 700, HORIZON - 150], [W + 780, HORIZON - 160], [W + 1080, HORIZON]], { fill: '#2a0f2a' });
		art.ellipse(ctx, W + 740, HORIZON - 160, 50, 12, { fill: '#ff7a1a', alpha: 0.8 });
		art.rect(ctx, W, HORIZON, W, H - HORIZON, { fill: art.linear(ctx, 0, HORIZON, 0, H, ['#2a1230', '#170914']) });

		// The river in perspective.
		const steps = 60;
		const left = [];
		const right = [];
		const half = riverW() / 2;
		for (let i = 0; i <= steps; i++) {
			// Denser samples near the couch; the far end runs on to the horizon.
			const d = -700 + 40000 * Math.pow(1 - i / steps, 3);
			const c = centre(s + d);
			left.push([sx(c - half, d), sy(d)]);
			right.push([sx(c + half, d), sy(d)]);
		}
		const poly = left.concat(right.slice().reverse());
		art.poly(ctx, poly, { fill: art.linear(ctx, 0, HORIZON, 0, H, ['#c83a17', '#ff6a14', '#ffa21f']) });
		// Glowing banks.
		art.line(ctx, left, { stroke: '#ffcf6b', lineWidth: 6, alpha: 0.7 });
		art.line(ctx, right, { stroke: '#ffcf6b', lineWidth: 6, alpha: 0.7 });
		// Crust plates on the river surface, fixed to the river so they stream past.
		ctx.save();
		ctx.beginPath();
		poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
		ctx.closePath();
		ctx.clip();
		const PLATE = 420;
		for (let u = Math.ceil((s - 600) / PLATE) * PLATE; u < s + D_FRONT * 1.6; u += PLATE) {
			const d = u - s;
			const k = Math.round(u / PLATE);
			for (let j = 0; j < 3; j++) {
				const h1 = Math.sin(k * 12.9898 + j * 78.233) * 43758.5453;
				const r = h1 - Math.floor(h1);
				const X = centre(u) + (r * 2 - 1) * half * 0.95;
				const fd = f(d);
				art.ellipse(ctx, sx(X, d), sy(d), 120 * fd, 22 * fd, { fill: '#7a1e14', alpha: 0.5 });
				art.ellipse(ctx, sx(X, d) + 40 * fd, sy(d) - 5 * fd, 40 * fd, 6 * fd, { fill: '#ffe07a', alpha: 0.55 });
			}
		}
		ctx.restore();
		// Haze toward the horizon.
		art.rect(ctx, W, HORIZON, W, 90, { fill: art.linear(ctx, 0, HORIZON, 0, HORIZON + 90, ['rgba(120,30,40,0.85)', 'rgba(120,30,40,0)']) });

		// Things on the river, far to near.
		const vis = items.filter((it) => !it.gone && it.u - s <= D_FRONT && it.u - s > -700);
		vis.sort((a, b) => (b.u - a.u));
		for (const it of vis) drawFrontItem(ctx, it);

		drawCouch(ctx);

		// Lava lapping in front of the couch.
		const wave = [];
		for (let x = W - 20; x <= 2 * W + 20; x += 40) wave.push([x, WATERLINE + Math.sin(x / 70 + clock * 3) * 7]);
		wave.push([2 * W + 20, H], [W - 20, H]);
		art.poly(ctx, wave, { fill: art.linear(ctx, 0, WATERLINE, 0, H, ['#ffb12a', '#ff6a14', '#e0380f']) });
		art.line(ctx, wave.slice(0, -2), { stroke: '#fff0a0', lineWidth: 5, alpha: 0.7 });

		drawSteerArrows(ctx);
		drawRapidsPrompt(ctx);
		ctx.restore();
		drawHeat(ctx);
	}

	function drawFrontItem(ctx, it) {
		const d = it.u - s;
		const fd = f(d);
		const x = sx(it.X, d);
		const y = sy(d);
		const bob = Math.sin(clock * 3 + it.seed) * 6 * fd;
		const fade = clamp((D_FRONT - d) / 600, 0, 1);
		ctx.save();
		ctx.globalAlpha *= fade;
		if (it.kind === 'ridge') {
			const c = centre(it.u);
			const half = riverW() / 2;
			for (let k = -9; k <= 9; k++) {
				const X = c + k * half / 9;
				drawRock(ctx, sx(X, d), y + bob, fd * 0.55, it.seed + k);
			}
			art.line(ctx, [[sx(c - half, d), y + 10 * fd], [sx(c + half, d), y + 10 * fd]], { stroke: '#fff3c0', lineWidth: 10 * fd, alpha: 0.6, dash: [30 * fd, 24 * fd] });
		} else if (it.kind === 'geyser') {
			drawVent(ctx, x, y, fd * 1.5, it.plugged, 1);
			if (it.erupted && !it.plugged) drawEruption(ctx, x, y, fd);
		} else if (it.kind === 'rock') {
			drawRock(ctx, x, y + bob, fd, it.seed);
		} else {
			if (it.reel) {
				art.line(ctx, [[W * 1.5, COUCH_Y - 260], [x, y - 60 * fd]], { stroke: '#f6f1e0', lineWidth: 4, alpha: 0.8 });
			}
			drawThing(ctx, it.kind, x, y - 40 * fd + bob, fd * 1.4, it.seed);
		}
		ctx.restore();
	}

	function drawEruption(ctx, x, y, fd) {
		const hgt = 520 * fd * (0.85 + 0.15 * Math.sin(clock * 20));
		const w = 60 * fd;
		art.poly(ctx, [[x - w, y], [x - w * 0.5, y - hgt], [x + w * 0.5, y - hgt], [x + w, y]], { fill: art.linear(ctx, 0, y - hgt, 0, y, ['#fff3a0', '#ffb12a', '#ff4a1c']), shadow: { color: '#ff7a1a', blur: 30 } });
		for (let i = 0; i < 6; i++) {
			const a = clock * 4 + i;
			art.circle(ctx, x + Math.sin(a * 1.7) * w * 1.6, y - hgt + Math.abs(Math.sin(a)) * 80 * fd, 18 * fd, { fill: '#ffdf5a' });
		}
	}

	function drawRock(ctx, x, y, sc, seed) {
		art.with(ctx, { x, y, scale: sc }, function () {
			art.ellipse(ctx, 0, 6, 130, 30, { fill: '#ff8a1f', alpha: 0.6 });
			art.path(ctx, 'M-120 0 C-125 -60 -80 -120 -20 -130 C40 -140 110 -100 120 -40 C125 -10 115 0 100 0 Z', 0, 0, 1, { fill: '#4a3550' });
			art.path(ctx, 'M-80 -60 C-60 -105 -10 -120 30 -115 C0 -100 -40 -85 -80 -60 Z', 0, 0, 1, { fill: '#7a6383' });
			art.path(ctx, 'M30 -10 C60 -50 90 -60 110 -40 C110 -20 100 -5 60 -5 Z', 0, 0, 1, { fill: '#33243a' });
			art.ellipse(ctx, 0, 0, 125, 12, { fill: '#ff5a14' });
		});
	}

	// A geyser's vent: a crusty ring, glowing inside; plugged, a big cork.
	function drawVent(ctx, x, y, sc, plugged, near) {
		art.with(ctx, { x, y, scale: sc }, function () {
			art.ellipse(ctx, 0, 0, 100, 34, { fill: '#2a1430' });
			art.ellipse(ctx, 0, -6, 84, 26, { fill: '#4e2a4a' });
			if (plugged) {
				art.roundRect(ctx, -50, -70, 100, 70, 16, { fill: '#c98a4a', stroke: '#7a4a22', lineWidth: 5 });
				art.ellipse(ctx, 0, -70, 50, 16, { fill: '#e2a866', stroke: '#7a4a22', lineWidth: 5 });
				art.circle(ctx, -20, -40, 5, { fill: '#7a4a22' });
				art.circle(ctx, 15, -25, 5, { fill: '#7a4a22' });
			} else {
				const glow = 0.6 + 0.4 * Math.sin(clock * (5 + near * 10));
				art.ellipse(ctx, 0, -6, 60, 16, { fill: '#ffdf5a', alpha: glow, shadow: { color: '#ff7a1a', blur: 24 } });
				art.ellipse(ctx, 0, -6, 32, 8, { fill: '#ffffff', alpha: glow * 0.7 });
			}
		});
	}

	// Floating things and cushion cargo. (x, y) is the middle.
	function drawThing(ctx, kind, x, y, sc, seed, rot) {
		art.with(ctx, { x, y, scale: sc, rotate: rot || 0 }, function () {
			if (kind === 'snack') {
				const v = Math.floor(Math.abs(seed)) % 3;
				if (v === 0) {
					// A doughnut.
					art.circle(ctx, 0, 0, 62, { fill: '#e0a25a', shadow: { color: 'rgba(0,0,0,0.35)', blur: 10, y: 8 } });
					art.path(ctx, 'M-58 -8 C-55 -50 -10 -66 20 -60 C60 -52 66 -10 56 6 C40 -4 30 10 10 4 C-10 -2 -20 12 -40 4 C-50 0 -56 4 -58 -8 Z', 0, 0, 1, { fill: '#ff6fb5' });
					art.circle(ctx, 0, 0, 20, { fill: '#7a1e14' });
					for (let i = 0; i < 6; i++) art.rect(ctx, -40 + i * 15, -40 + (i % 2) * 18, 10, 4, { fill: ['#fff', '#7bf', '#ff5'][i % 3] });
				} else if (v === 1) {
					// A popcorn tub.
					art.poly(ctx, [[-45, -20], [45, -20], [32, 60], [-32, 60]], { fill: '#ffffff', shadow: { color: 'rgba(0,0,0,0.35)', blur: 10, y: 8 } });
					for (let i = 0; i < 4; i++) art.poly(ctx, [[-41 + i * 22, -20], [-30 + i * 22, -20], [-26 + i * 18, 60], [-34 + i * 18, 60]], { fill: '#ff3b3b' });
					for (let i = 0; i < 7; i++) art.circle(ctx, -40 + i * 13, -26 - (i % 3) * 10, 16, { fill: '#fff6cf' });
				} else {
					// A slice of pizza.
					art.poly(ctx, [[-55, -40], [55, -40], [0, 60]], { fill: '#ffcf5a', shadow: { color: 'rgba(0,0,0,0.35)', blur: 10, y: 8 } });
					art.roundRect(ctx, -60, -55, 120, 22, 11, { fill: '#c9782e' });
					for (const [px, py] of [[-20, -15], [18, -10], [0, 20]]) art.circle(ctx, px, py, 11, { fill: '#e0352b' });
				}
			} else if (kind === 'treasure') {
				art.roundRect(ctx, -70, -30, 140, 80, 10, { fill: '#9a5a22', stroke: '#4a2a10', lineWidth: 6, shadow: { color: 'rgba(0,0,0,0.4)', blur: 12, y: 8 } });
				art.roundRect(ctx, -70, -70, 140, 50, [40, 40, 6, 6], { fill: '#b8702c', stroke: '#4a2a10', lineWidth: 6 });
				art.rect(ctx, -70, -32, 140, 10, { fill: '#ffd23a' });
				art.rect(ctx, -12, -45, 24, 30, { fill: '#ffd23a', stroke: '#4a2a10', lineWidth: 4 });
				const tw = 0.5 + 0.5 * Math.sin(clock * 6 + seed);
				art.text(ctx, '✦', 50, -80, { size: 50, fill: '#fff6a0', alpha: tw });
				art.text(ctx, '✦', -55, -75, { size: 34, fill: '#fff6a0', alpha: 1 - tw });
			} else if (kind === 'log') {
				art.roundRect(ctx, -200, -40, 400, 80, 40, { fill: '#6a3a1e', stroke: '#3a1e0e', lineWidth: 6 });
				art.ellipse(ctx, 180, 0, 26, 38, { fill: '#c8915a', stroke: '#3a1e0e', lineWidth: 5 });
				art.ellipse(ctx, 180, 0, 12, 18, { stroke: '#8a5a2e', lineWidth: 4 });
				for (let i = 0; i < 5; i++) {
					const fx = -150 + i * 70;
					const fh = 70 + 30 * Math.sin(clock * 9 + i * 2 + seed);
					art.path(ctx, `M${fx - 30} -30 C${fx - 30} ${-30 - fh * 0.5} ${fx - 5} ${-30 - fh * 0.7} ${fx} ${-30 - fh} C${fx + 10} ${-30 - fh * 0.6} ${fx + 30} ${-30 - fh * 0.4} ${fx + 30} -30 Z`, 0, 0, 1, { fill: '#ff8a1a' });
					art.path(ctx, `M${fx - 14} -30 C${fx - 14} ${-30 - fh * 0.3} ${fx} ${-30 - fh * 0.45} ${fx + 2} ${-30 - fh * 0.6} C${fx + 8} ${-30 - fh * 0.35} ${fx + 15} ${-30 - fh * 0.2} ${fx + 15} -30 Z`, 0, 0, 1, { fill: '#ffe45a' });
				}
			} else if (kind === 'cat') {
				art.ellipse(ctx, 0, 10, 55, 40, { fill: '#ff9a3a', stroke: '#5a2a10', lineWidth: 5 });
				art.line(ctx, [[45, 20], [85, 0], [80, -45]], { stroke: '#ff9a3a', lineWidth: 14 });
				art.circle(ctx, -20, -40, 36, { fill: '#ff9a3a', stroke: '#5a2a10', lineWidth: 5 });
				art.poly(ctx, [[-50, -55], [-46, -92], [-24, -70]], { fill: '#ff9a3a', stroke: '#5a2a10', lineWidth: 5 });
				art.poly(ctx, [[-16, -72], [6, -92], [10, -56]], { fill: '#ff9a3a', stroke: '#5a2a10', lineWidth: 5 });
				art.circle(ctx, -32, -42, 6, { fill: '#2a1408' });
				art.circle(ctx, -8, -42, 6, { fill: '#2a1408' });
				art.poly(ctx, [[-24, -30], [-16, -30], [-20, -25]], { fill: '#ff6fa0' });
				for (const sx2 of [-30, 10]) art.rect(ctx, sx2, 0, 10, 40, { fill: '#e07a20' });
			} else if (kind === 'remote') {
				art.roundRect(ctx, -26, -70, 52, 140, 14, { fill: '#2a2a33', stroke: '#111', lineWidth: 4 });
				art.circle(ctx, 0, -48, 9, { fill: '#ff3b3b' });
				for (let i = 0; i < 6; i++) art.roundRect(ctx, -16 + (i % 2) * 18, -26 + Math.floor(i / 2) * 22, 14, 12, 4, { fill: ['#3bd16b', '#4aa8ff', '#ffd23a'][i % 3] });
			} else if (kind === 'fishbowl') {
				art.circle(ctx, 0, 0, 60, { fill: 'rgba(140,210,255,0.55)', stroke: '#e8f6ff', lineWidth: 5 });
				art.ellipse(ctx, 0, -50, 36, 10, { fill: '#e8f6ff' });
				const fx = Math.sin(clock * 2 + seed) * 20;
				art.ellipse(ctx, fx, 10, 20, 12, { fill: '#ff8a1a' });
				art.poly(ctx, [[fx + 16, 10], [fx + 32, 0], [fx + 32, 20]], { fill: '#ff8a1a' });
			} else if (kind === 'plant') {
				art.poly(ctx, [[-40, 0], [40, 0], [30, 60], [-30, 60]], { fill: '#d0603a', stroke: '#7a2a10', lineWidth: 4 });
				for (let i = 0; i < 5; i++) {
					const a = -150 + i * 30;
					art.with(ctx, { x: 0, y: 0, rotate: a + 90 }, function () {
						art.ellipse(ctx, 0, -50, 14, 50, { fill: i % 2 ? '#3bbf5a' : '#2a9a48' });
					});
				}
			}
		});
	}

	function drawMiniCouch(ctx, x, y, sc, alive) {
		art.with(ctx, { x, y, scale: sc, alpha: alive ? 1 : 0.3 }, function () {
			art.roundRect(ctx, -110, -80, 220, 70, 24, { fill: alive ? '#8a3fb0' : '#555' });
			art.roundRect(ctx, -120, -30, 240, 60, 20, { fill: alive ? '#a456cc' : '#666' });
			art.roundRect(ctx, -140, -60, 50, 100, 20, { fill: alive ? '#7a3398' : '#444' });
			art.roundRect(ctx, 90, -60, 50, 100, 20, { fill: alive ? '#7a3398' : '#444' });
		});
	}

	/* ---------- the couch ---------- */

	function couchPose() {
		let y = COUCH_Y + Math.sin(clock * 1.6) * 6;
		let rot = tilt + (Math.random() - 0.5) * 3 * shake;
		if (hop) {
			const e = (clock - hop.t0) / 0.8;
			y -= Math.sin(Math.min(1, e) * Math.PI) * 170;
		}
		if (flip) {
			const e = (clock - flip.t0);
			const up = Math.min(1, e / 0.9);
			rot = tilt + flip.dir * 175 * (1 - Math.pow(1 - up, 2));
			y -= Math.sin(up * Math.PI) * 220;
			if (e > 0.9) y += (e - 0.9) * 260;
		}
		if (drop > 0) y -= Math.pow(drop, 2) * 800;
		return { y, rot };
	}

	function drawCouch(ctx) {
		const pose = couchPose();
		art.with(ctx, { x: W * 1.5, y: pose.y, rotate: pose.rot }, function () {
			// A glow on the lava under it.
			art.ellipse(ctx, 0, 110, 760, 50, { fill: '#ffe07a', alpha: 0.35 });
			// Backrest.
			art.roundRect(ctx, -690, -250, 1380, 210, [70, 70, 20, 20], { fill: art.linear(ctx, 0, -250, 0, -40, ['#b062d6', '#7a3398']), stroke: '#3e1450', lineWidth: 8, shadow: { color: 'rgba(0,0,0,0.45)', blur: 24, y: 10 } });
			for (let i = 0; i < 3; i++) {
				const cx = -460 + i * 460;
				art.roundRect(ctx, cx - 210, -225, 420, 160, 50, { fill: '#9a4cc2', stroke: '#5a1f78', lineWidth: 5 });
				for (const bx of [-90, 0, 90]) art.circle(ctx, cx + bx, -145, 8, { fill: '#5a1f78' });
			}
			// Seat cushions: top face then front face.
			for (let i = 0; i < 3; i++) {
				const cx = -440 + i * 440;
				art.roundRect(ctx, cx - 215, -95, 430, 70, 26, { fill: '#c27ae4', stroke: '#5a1f78', lineWidth: 5 });
			}
			art.roundRect(ctx, -665, -35, 1330, 80, 22, { fill: art.linear(ctx, 0, -35, 0, 45, ['#a456cc', '#7a3398']), stroke: '#3e1450', lineWidth: 6 });
			drawGauge(ctx);
			// Skirt and stubby feet.
			art.roundRect(ctx, -680, 40, 1360, 70, [10, 10, 30, 30], { fill: '#5a1f78', stroke: '#3e1450', lineWidth: 6 });
			for (const fx of [-600, 600]) art.roundRect(ctx, fx - 30, 100, 60, 40, 10, { fill: '#3a1a10' });
			// Arms.
			for (const ax of [-1, 1]) {
				art.roundRect(ctx, ax * 690 - 70, -190, 140, 290, 50, { fill: art.linear(ctx, ax * 690 - 70, 0, ax * 690 + 70, 0, ['#8e44b4', '#b062d6', '#8e44b4']), stroke: '#3e1450', lineWidth: 7 });
				art.ellipse(ctx, ax * 690, -185, 60, 22, { fill: '#c27ae4' });
			}
			// Cargo behind the riders, then the riders, then the centre of mass.
			for (const c of cushions) drawCushionItem(ctx, c);
			drawMarkerLine(ctx);
			for (const m of meeps) m.draw(ctx);
			drawMarker(ctx);
			if (rapidsAhead() && !flip) {
				meeps.forEach(function (m, n) {
					const ok = pos[n].pz < HOP_Z;
					art.text(ctx, ok ? '✔' : '▲', m.x, -300, { size: 60, fill: ok ? '#8affc1' : '#ffffff', outline: '#12301f', outlineWidth: 5 });
				});
			}
		});
	}

	// The level gauge on the couch's front: safe in the middle, red past DIP.
	function drawGauge(ctx) {
		const x0 = -600;
		const w = 1200;
		const y = 5;
		art.roundRect(ctx, x0, y - 16, w, 32, 16, { fill: '#2a0f2a' });
		const lo = x0 + (0.5 - DIP) * w;
		const hi = x0 + (0.5 + DIP) * w;
		art.roundRect(ctx, x0 + 4, y - 12, lo - x0 - 4, 24, 12, { fill: '#ff3b2b', alpha: 0.85 });
		art.roundRect(ctx, hi, y - 12, x0 + w - hi - 4, 24, 12, { fill: '#ff3b2b', alpha: 0.85 });
		art.rect(ctx, lo, y - 12, hi - lo, 24, { fill: '#3bd16b', alpha: 0.85 });
		art.rect(ctx, -3, y - 14, 6, 28, { fill: '#ffffff', alpha: 0.8 });
	}

	function comX() {
		return (avg - 0.5) * W;
	}

	function drawMarkerLine(ctx) {
		if (flip || !meeps.length) return;
		const x = comX();
		art.line(ctx, [[x, -300], [x, 0]], { stroke: '#ffffff', lineWidth: 6, alpha: 0.55, dash: [18, 14] });
	}

	// The group's centre of mass: a glowing weight riding the gauge.
	function drawMarker(ctx) {
		if (flip || !meeps.length) return;
		const x = comX();
		const danger = Math.abs(off) > DIP;
		const col = danger ? '#ff3b2b' : Math.abs(off) > DEAD ? '#ffd23a' : '#3bd16b';
		art.circle(ctx, x, 5, 40, { fill: col, stroke: '#ffffff', lineWidth: 8, shadow: { color: col, blur: 30 } });
		art.poly(ctx, [[x - 36, -340], [x + 36, -340], [x, -290]], { fill: col, stroke: '#ffffff', lineWidth: 5 });
	}

	function drawCushionItem(ctx, c) {
		let x = (c.u - 0.5) * W;
		let y = SEAT_TOP - 52 - c.drop * c.drop * 700;
		let rot = c.v * 300;
		let alpha = 1;
		if (c.falling) {
			const e = c.falling.t;
			x += c.falling.dir * e * 300;
			y += e * e * 600 - Math.sin(Math.min(1, e * 2) * Math.PI) * 80;
			rot = c.falling.dir * e * 400;
			alpha = Math.max(0, 1 - e);
		}
		if (c.holder >= 0 && !c.falling) {
			art.ellipse(ctx, x, SEAT_TOP + 4, 70, 14, { fill: '#8affc1', alpha: 0.6 });
		} else if (!c.falling && c.drop <= 0) {
			// Unheld: it wobbles and shows which way it's sliding.
			rot += Math.sin(clock * 14) * 6;
			art.text(ctx, '!', x, y - 105, { size: 70, font: 'Knewave', fill: '#ff6a3a', outline: '#2a0f1e', outlineWidth: 6 });
		}
		art.with(ctx, { x, y, alpha }, () => drawThing(ctx, c.kind, 0, 0, 0.75, c.u * 10, rot));
	}

	/* ---------- front-wall signs ---------- */

	function drawSteerArrows(ctx) {
		if (flip || !isLive || Math.abs(off) <= DEAD) return;
		const dir = Math.sign(off);
		const a = Math.min(1, (Math.abs(off) - DEAD) / (DIP - DEAD));
		for (let i = 0; i < 3; i++) {
			const ph = (clock * 2 + i / 3) % 1;
			const x = W * 1.5 + dir * (820 - 200 + ph * 140);
			art.text(ctx, dir > 0 ? '›' : '‹', x, 470, { size: 160, font: 'Knewave', fill: '#ffffff', alpha: a * (1 - ph) * 0.8 });
		}
	}

	function drawRapidsPrompt(ctx) {
		if (!rapidsAhead() || flip) return;
		const pulse = 1 + 0.06 * Math.sin(clock * 10);
		art.with(ctx, { x: W * 1.5, y: 330, scale: pulse }, function () {
			art.text(ctx, 'STEP FORWARD!', 0, 0, { size: 96, font: 'Knewave', fill: '#8affc1', outline: '#12301f', outlineWidth: 8 });
		});
	}

	function drawHeat(ctx) {
		if (!meeps.length) return;
		const x0 = W + 360;
		const w = 880;
		const y = 140;
		const flash = heat > 0.7 && Math.sin(clock * 16) > 0;
		art.roundRect(ctx, x0 - 10, y - 32, w + 20, 64, 32, { fill: 'rgba(20,6,20,0.8)', stroke: flash ? '#ffffff' : '#ff4a1c', lineWidth: 5 });
		if (heat > 0.01) {
			art.roundRect(ctx, x0, y - 22, Math.max(44, w * heat), 44, 22, { fill: art.linear(ctx, x0, 0, x0 + w, 0, ['#ffd23a', '#ff7a1a', '#ff2a1a']) });
		}
		art.text(ctx, '🔥', x0 - 50, y, { size: 56 });
		art.text(ctx, 'HEAT', x0 + w / 2, y + 2, { size: 40, font: 'Knewave', fill: '#ffffff', outline: '#2a0f1e', outlineWidth: 5 });
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		meeps.forEach(function (m, i) {
			const p = players[i];
			if (!p || p.px === undefined) return;
			pos[i].px = clamp(p.px, 0, 1);
			pos[i].pz = clamp(1 - p.pz, 0, 1);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	// For tests: put something on the river `ahead` units in front of the
	// couch, `side` units from the couch's line; or a cushion item at u.
	self.spawn = function (kind, ahead, side) {
		if (CUSHION_KINDS.includes(kind)) return spawnCushion(kind, ahead) && true;
		const it = spawnAt(kind, s + ahead, camX + (side || 0));
		return it.id;
	};

	self.calm = function (b) {
		calm = b;
		if (b) { for (const it of items) it.gone = true; cushions.length = 0; }
		nextU = s + D_FRONT + D_LEFT;
	};

	self.state = function () {
		return {
			live: isLive, over: isOver, t, s, camX, centre: centre(s), avg, off, tilt, heat, lives, team,
			dipping: dipping > 0, scraping, hopping: !!hop, flipping: !!flip, rapids: rapidsAhead(),
			stats: Object.assign({}, stats),
			items: items.map((it) => {
				const d = it.u - s;
				const wall = d > D_FRONT ? 0 : d > -900 ? 1 : 2;
				const lp = wall === 0 ? leftPos(it) : null;
				return { id: it.id, kind: it.kind, d, X: it.X, wall, left: lp && { x: lp.x, y: lp.y - 30 }, plugged: it.plugged, reel: it.reel, erupted: !!it.erupted, hit: it.hit, cleared: it.cleared };
			}),
			cushions: cushions.map((c) => ({ kind: c.kind, u: c.u, holder: c.holder, falling: !!c.falling })),
			pile: pile.length,
			players: pos.map((p) => ({ px: p.px, pz: p.pz })),
			scores: meeps.map((m) => m.score),
		};
	};

	self.fini = function () {
		stage.$el.off('click.lavacouch');
		hud.fini();
		if (sizzle) {
			try { sizzle.actx.close(); } catch (e) { /* already closed */ }
		}
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
