/*
 * Honmoon
 *
 * Defend the barrier. A shimmering golden band of hexagon light (the
 * Honmoon) runs across all three walls over a night city. Shadow demons
 * crawl in from the far ends of the side walls along the band, clawing
 * cracks into it wherever they touch, and the ones that reach the front
 * wall leap onto it and keep clawing. The players are idol hunters on the
 * front wall's stage: stand under a crack to sing it closed (a ring fills
 * and golden notes rise; two singers seal twice as fast), and stand under a
 * demon to blast it off the barrier with a shockwave. Tap a demon on a side
 * wall to slash it with a sword arc. Step right up to the wall for a power
 * note that heals a wider area but drains stamina, which refills when you
 * stand back. Three waves: faster crawlers in wave 2, a masked giant in
 * wave 3 whose slams crack several places at once. If the barrier's
 * integrity runs out the demons break through. To finish, everyone lines up
 * on the marks spread across the stage and seals the barrier golden.
 * Score: cracks sealed (shared between the singers), demons slashed and
 * demons pushed back.
 *
 * Input: px (left / right along the stage), pz (step towards the wall for
 * the power note), touches on the side walls.
 */
IGB.register('honmoon', function HonmoonGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH;
	const art = IGB.art;
	const FPS = 50;
	const DT = 1 / FPS;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const FLOOR = 905;          // where the singers stand, on the front wall
	const HERO_SCALE = 1.2;
	const BAND_Y = 430;         // the barrier's centre line, on every wall
	const BAND_H = 130;
	const BAND_TOP = BAND_Y - BAND_H / 2;
	const SING_R = 130;         // a singer reaches cracks and demons this far either side
	const POWER_R = 300;        // and this far with the power note
	const SEAL_TIME = 3.0;      // seconds for one singer to seal a full-size crack
	const POWER_RATE = 1.5;     // the power note sings this much faster
	const POWER_Z = 0.3;        // closer than this to the wall (pz) is the power note
	const REST_Z = 0.45;        // further back than this, stamina refills
	const STAMINA_DRAIN = 0.2;  // per second of power note
	const STAMINA_FILL = 0.22;  // per second standing back
	const STAMINA_MIN = 0.3;    // once empty, the power note waits until this much is back
	const PUSH_TIME = 0.5;      // seconds under a front-wall demon to blast it off
	const DRAIN = 0.5;         // integrity lost per second per full-size open crack
	const SEAL_HEAL = 3;        // integrity a sealed crack gives back
	const CRACK_MERGE = 90;     // a claw this close to a crack widens it instead
	const SIDE_MEND = 0.09;     // side-wall cracks mend this much a second once left alone
	const SIDE_DRAIN = 0.5;     // and drain this share of what a front-wall crack does
	const SLASH_R = 170;        // a tap this close to a side-wall demon slashes it
	const POINTS = { seal: 10, slash: 5, push: 5, golden: 10 };
	const DEMONS = {
		// crawl speed (px/s), size, seconds between claws, seconds clawing,
		// crack growth per second of clawing
		crawler: { speed: 90, scale: 1.25, every: 5, claw: 1.4, grow: 0.3, mark: '#3ff4ff' },
		fast: { speed: 170, scale: 1, every: 3.5, claw: 0.9, grow: 0.4, mark: '#ff3b6b' },
	};
	const WAVES = [
		// seconds, seconds between demons, most at once, share of fast
		// crawlers, seconds between spirit strikes on the front wall
		{ secs: 60, gap: 6, max: 4, fast: 0, strike: 7 },
		{ secs: 60, gap: 4.2, max: 6, fast: 0.45, strike: 6.5 },
		{ secs: 70, gap: 5.5, max: 5, fast: 0.4, strike: 10, boss: true, slam: 8.5 },
	];
	const TELEGRAPH = 1.6;      // seconds the boss's slam marks glow before it lands
	const FINALE_TIME = 25;     // seconds to line up before the barrier seals itself
	const MARK_R = 110;         // standing this close to a mark holds it
	const HOLD = 2.0;           // seconds everyone holds their marks to seal it golden

	const GOLD = '#ffcf3f';
	const PINK = '#ff4fa8';
	const PURPLE = '#7b3cff';
	const SKIN = ['#f3c9a8', '#e0a87e', '#c98b5d', '#f6d6bd', '#a86b45', '#edb98f'];
	const HAIR = ['#1b1230', '#2a1838', '#14101f', '#3a1d33', '#21162e', '#30183a'];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-beats-120.mp3', 0.28, true);
	audio.add('rumble', 'assets/shared/sfx-rumble.mp3', 0.45);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.35);
	audio.add('reveal', 'assets/shared/sfx-reveal.mp3', 0.35);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.25);

	const hud = new HUD('#ff4fa8');
	hud.$el.appendTo(stage.$ui);

	/* ---------- synthesised chimes and backing ---------- */

	// Our own small Web Audio kit: bell chimes on a pentatonic scale, a sword
	// swish, a shockwave thump, a crack, and a soft synth-pop arpeggio over
	// the shared 120 bpm beat. All original.
	const synth = (function () {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		const ctx = new AC();
		const master = ctx.createGain();
		master.gain.value = 0.55;
		master.connect(ctx.destination);
		// A ping-pong-ish echo for the chimes' shimmer.
		const echo = ctx.createDelay(1);
		echo.delayTime.value = 0.375;
		const fb = ctx.createGain();
		fb.gain.value = 0.32;
		const echoOut = ctx.createGain();
		echoOut.gain.value = 0.35;
		echo.connect(fb).connect(echo);
		echo.connect(echoOut).connect(master);

		function env(peak, attack, release, at) {
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(peak, at + attack);
			g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
			return g;
		}
		function noise(seconds) {
			const len = Math.floor(ctx.sampleRate * seconds);
			const buf = ctx.createBuffer(1, len, ctx.sampleRate);
			const d = buf.getChannelData(0);
			for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
			const src = ctx.createBufferSource();
			src.buffer = buf;
			return src;
		}
		function osc(type, freq, at, dur, gain, dest) {
			const o = ctx.createOscillator();
			o.type = type;
			o.frequency.setValueAtTime(freq, at);
			o.connect(gain).connect(dest || master);
			o.start(at);
			o.stop(at + dur + 0.05);
			return o;
		}
		const live = () => ctx.state !== 'closed';

		// C major pentatonic, two and a half octaves up from C5.
		const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
		const kit = { ctx };
		kit.chime = function (step, vol = 0.12, when = 0) {
			if (!live()) return;
			const at = ctx.currentTime + when;
			const f = SCALE[Math.max(0, Math.min(SCALE.length - 1, step))];
			const g = env(vol, 0.005, 1.1, at);
			g.connect(echo);
			osc('sine', f, at, 1.2, g);
			const g2 = env(vol * 0.35, 0.005, 0.5, at);
			osc('sine', f * 2.76, at, 0.6, g2);
		};
		kit.seal = function () {
			[4, 6, 8, 10].forEach((s, i) => kit.chime(s, 0.14, i * 0.07));
		};
		kit.golden = function () {
			for (let i = 0; i < 11; i++) kit.chime(i, 0.12, i * 0.09);
			[0, 2, 4].forEach((s) => kit.chime(s, 0.1, 1.1));
		};
		kit.slash = function () {
			if (!live()) return;
			const at = ctx.currentTime;
			const n = noise(0.3);
			const bp = ctx.createBiquadFilter();
			bp.type = 'bandpass';
			bp.Q.value = 3;
			bp.frequency.setValueAtTime(6000, at);
			bp.frequency.exponentialRampToValueAtTime(900, at + 0.25);
			n.connect(bp).connect(env(0.5, 0.01, 0.25, at)).connect(master);
			n.start(at);
			kit.chime(9, 0.06, 0.02);
		};
		kit.thump = function () {
			if (!live()) return;
			const at = ctx.currentTime;
			const o = osc('sine', 160, at, 0.5, env(0.6, 0.005, 0.45, at));
			o.frequency.exponentialRampToValueAtTime(40, at + 0.4);
			kit.chime(2, 0.08);
		};
		kit.crack = function () {
			if (!live()) return;
			const at = ctx.currentTime;
			const n = noise(0.25);
			const hp = ctx.createBiquadFilter();
			hp.type = 'highpass';
			hp.frequency.value = 2500;
			n.connect(hp).connect(env(0.25, 0.002, 0.2, at)).connect(master);
			n.start(at);
			const o = osc('sawtooth', 90, at, 0.3, env(0.12, 0.005, 0.25, at));
			o.frequency.exponentialRampToValueAtTime(45, at + 0.25);
		};

		// The backing: an eighth-note arpeggio and a bass on an original
		// four-chord loop (Am F C G), scheduled ahead on the audio clock.
		const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
		const BASS = [110, 87.31, 130.81, 98];
		const pad = ctx.createBiquadFilter();
		pad.type = 'lowpass';
		pad.frequency.value = 1800;
		const padOut = ctx.createGain();
		padOut.gain.value = 0;
		pad.connect(padOut).connect(master);
		let next = 0;
		let eighth = 0;
		kit.backing = function (on) {
			if (!live()) return;
			padOut.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.4);
			if (on && next < ctx.currentTime) next = ctx.currentTime + 0.1;
		};
		kit.schedule = function (intensity) {
			if (!live() || ctx.state !== 'running') return;
			while (next < ctx.currentTime + 0.25) {
				const bar = Math.floor(eighth / 8) % 4;
				const i = eighth % 8;
				const chord = CHORDS[bar];
				const f = chord[[0, 1, 2, 1, 0, 2, 1, 2][i]] * 2;
				osc('sawtooth', f, next, 0.2, env(0.025 + intensity * 0.015, 0.005, 0.18, next), pad);
				if (i % 4 === 0) osc('triangle', BASS[bar], next, 0.45, env(0.13, 0.01, 0.42, next), pad);
				if (i === 0) for (const c of chord) osc('triangle', c, next, 2, env(0.02, 0.4, 1.6, next), pad);
				next += 0.25;
				eighth++;
			}
		};
		kit.resume = function () { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); };
		kit.close = function () { if (live()) ctx.close().catch(() => {}); };
		return kit;
	})();
	const sfx = (name, ...a) => synth && synth[name](...a);

	/* ---------- state ---------- */

	const heroes = [];          // by player number: { x, tx, pz, stamina, power, tired, sing, score, pts, ... }
	const cracks = [];          // { x, size, progress, contrib, seed, born }
	const demons = [];
	const particles = [];
	const popups = [];
	const waves = [];           // shockwave rings
	const slashes = [];         // sword arcs
	const strikes = [];         // spirit-strike claw marks
	let boss = null;
	let wave = -1;
	let phase = 'intro';        // intro, live, between, finale, golden, broken, over
	let t = 0;
	let integrity = 100;
	let nextDemon = 0;
	let nextStrike = 0;
	let side = 0;               // which side wall the next demon comes from
	let calm = false;           // tests: no spawning
	let shake = 0;
	let flare = 0;              // the golden finale's glow, 0..1
	let finaleStart = 0;
	let hold = 0;               // seconds every mark has been held
	let marks = [];
	let sealed = 0;
	let slashed = 0;
	let pushed = 0;
	let demonId = 0;
	let crackId = 0;

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const x = W + (i + 1) / (count + 1) * W;
			heroes.push({
				n: i, x, tx: x, pz: 0.5, stamina: 1, power: false, tired: false,
				sing: 0, pushing: 0, score: 0, pts: 0, sealed: 0, slashed: 0, pushed: 0,
				noteAt: 0, bob: Math.random() * TAU,
			});
		}
		hud.initPlayers(heroes);
		audio.play('music');
		sfx('backing', true);
		hud.initBanner('Sing the barrier whole!');
		stage.timeout(hud.finiBanner, 2400);
		stage.timeout(() => startWave(0), 3000);
	}

	function startWave(n) {
		wave = n;
		phase = 'between';
		hud.initRound(n, WAVES.length, `Wave ${n + 1}`);
		stage.timeout(hud.finiBanner, 1800);
		if (WAVES[n].boss) stage.timeout(summonBoss, 1200);
		stage.timeout(function () {
			if (phase === 'broken' || phase === 'over') return;
			phase = 'live';
			nextDemon = t + 0.5;
			nextStrike = t + 2;
			hud.initTimer(WAVES[n].secs, endWave);
		}, 2400);
	}

	function endWave() {
		if (phase !== 'live') return;
		hud.finiTimer();
		if (wave < WAVES.length - 1) startWave(wave + 1);
		else startFinale();
	}

	function startFinale() {
		phase = 'finale';
		finaleStart = t;
		hold = 0;
		const n = heroes.length;
		marks = heroes.map((h, i) => ({ x: W + (i + 0.5) / n * W, held: false }));
		hud.initBanner('Line up!');
		audio.play('reveal', true);
		stage.timeout(hud.finiBanner, 2000);
	}

	function sealGolden(earned) {
		phase = 'golden';
		flare = 0.01;
		sfx('golden');
		audio.play('cheer', true);
		if (earned) {
			for (const h of heroes) {
				addPoints(h, POINTS.golden);
				popup(h.x, FLOOR - 340, `+${POINTS.golden}`, GOLD);
			}
		}
		for (const c of cracks) burst(c.x, BAND_Y, GOLD, 14);
		cracks.length = 0;
		integrity = 100;
		for (const d of demons) if (d.state !== 'gone') banish(d, 'dissolve');
		if (boss) boss.dying = t;
		hud.initBanner(earned ? 'Golden!' : 'The barrier holds!');
		stage.timeout(finiGame, 4500);
	}

	function breakThrough() {
		phase = 'broken';
		hud.finiTimer();
		audio.play('rumble', true);
		sfx('crack');
		shake = 1.2;
		hud.initBanner('The demons broke through!');
		stage.timeout(finiGame, 3500);
	}

	function finiGame() {
		if (phase === 'over') return;
		phase = 'over';
		hud.finiBanner();
		hud.finiTimer();
		audio.stop('music');
		sfx('backing', false);
		const scores = heroes.map((h) => h.score);
		const rewards = scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);
		stage.timeout(() => IGB.complete(rewards), 5000);
	}

	function addPoints(h, p) {
		h.pts += p;
		h.score = Math.round(h.pts);
	}

	/* ---------- cracks ---------- */

	function wallOf(x) {
		return x < W ? 0 : x < 2 * W ? 1 : 2;
	}

	// Open a crack at x, or widen the one already there.
	function openCrack(x, size) {
		x = Math.max(40, Math.min(WIDTH - 40, x));
		let c = cracks.find((k) => Math.abs(k.x - x) < CRACK_MERGE && wallOf(k.x) === wallOf(x));
		if (c) {
			c.size = Math.min(1, c.size + size * 0.6);
			return c;
		}
		c = { id: crackId++, x, size: Math.min(1, size), progress: 0, contrib: {}, born: t, seed: Math.random() * 1000, singers: 0 };
		cracks.push(c);
		sfx('crack');
		for (let i = 0; i < 6; i++) particles.push(spark(x, BAND_Y, '#ff6ad5'));
		return c;
	}

	function sealCrack(c) {
		const total = Object.values(c.contrib).reduce((a, b) => a + b, 0) || 1;
		for (const n in c.contrib) {
			const h = heroes[n];
			if (!h) continue;
			const share = c.contrib[n] / total;
			addPoints(h, POINTS.seal * share);
			h.sealed += share;
		}
		const names = Object.keys(c.contrib).length;
		popup(c.x, BAND_Y - 110, names > 1 ? 'Together!' : 'Sealed!', GOLD);
		sealed++;
		integrity = Math.min(100, integrity + SEAL_HEAL);
		burst(c.x, BAND_Y, GOLD, 22);
		sfx('seal');
		cracks.splice(cracks.indexOf(c), 1);
	}

	/* ---------- demons ---------- */

	function spawnDemon(kind, x, dir) {
		const k = DEMONS[kind];
		const d = {
			id: demonId++, kind, k, x, y: BAND_TOP, dir, state: 'crawl',
			clawUntil: 0, nextClaw: t + k.every * (0.5 + Math.random() * 0.5),
			phase: Math.random() * TAU, push: 0, pushers: {}, crack: null,
			vx: 0, vy: 0, spin: 0, fade: 1, target: 0, leap: null, frontUntil: 0,
		};
		demons.push(d);
		return d;
	}

	function spawnFromSide() {
		const w = WAVES[wave];
		const kind = Math.random() < w.fast ? 'fast' : 'crawler';
		const fromLeft = side++ % 2 === 0;
		spawnDemon(kind, fromLeft ? -60 : WIDTH + 60, fromLeft ? 1 : -1);
	}

	// A demon on the front wall picks a spot along the band and leaps to it.
	function leapTo(d, x) {
		d.state = 'leap';
		d.leap = { x0: d.x, x1: x, t0: t, dur: 0.8 + Math.abs(x - d.x) / 1600 };
		audio.play('woosh', true);
	}

	function frontTarget() {
		// Somewhere on the front wall, away from other demons' spots.
		for (let i = 0; i < 8; i++) {
			const x = W + 140 + Math.random() * (W - 280);
			if (!demons.some((o) => o.state !== 'gone' && Math.abs((o.leap ? o.leap.x1 : o.x) - x) < 220)) return x;
		}
		return W + 140 + Math.random() * (W - 280);
	}

	function banish(d, how, by) {
		if (how === 'slash') {
			d.state = 'slain';
			slashed++;
			burst(d.x, d.y - 60, '#c06bff', 18);
			burst(d.x, d.y - 60, PINK, 10);
			if (by) { addPoints(by, POINTS.slash); by.slashed++; popup(d.x, d.y - 170, `+${POINTS.slash}`, PINK); }
		} else if (how === 'push') {
			d.state = 'blasted';
			pushed++;
			d.vx = (d.x < 2 * W - W / 2 ? -1 : 1) * (6 + Math.random() * 3);
			d.vy = -14;
			d.spin = (Math.random() - 0.5) * 0.3;
			const names = Object.keys(d.pushers);
			for (const n of names) {
				const h = heroes[n];
				addPoints(h, POINTS.push / names.length);
				h.pushed += 1 / names.length;
			}
			popup(d.x, d.y - 170, 'Begone!', '#9ff6ff');
		} else {
			d.state = 'dissolve';
		}
		d.fade = 1;
		d.crack = null;
	}

	/* ---------- the boss ---------- */

	function summonBoss() {
		boss = { x: 2 * W - W / 2, rise: 0, born: t, nextSlam: t + 5, marks: null, slamAt: 0, arms: 0, dying: 0, hit: 0 };
		audio.play('rumble', true);
		shake = 0.8;
	}

	function bossStep() {
		if (!boss) return;
		boss.rise = Math.min(1, boss.rise + DT / 3);
		boss.x = 2 * W - W / 2 + Math.sin((t - boss.born) * 0.25) * 380;
		if (boss.dying) {
			if (t - boss.dying > 3) boss = null;
			return;
		}
		if (phase !== 'live') { boss.arms *= 0.95; return; }
		if (!boss.marks && t >= boss.nextSlam) {
			// Telegraph: glowing marks where the slam will land.
			const n = Math.min(4, 2 + Math.floor(heroes.length / 2));
			const xs = [];
			for (let i = 0; i < n; i++) {
				let x;
				for (let k = 0; k < 10; k++) {
					x = i === n - 1 && Math.random() < 0.6
						? (Math.random() < 0.5 ? 300 + Math.random() * 1000 : 3500 + Math.random() * 1000)
						: W + 120 + Math.random() * (W - 240);
					if (!xs.some((o) => Math.abs(o - x) < 260)) break;
				}
				xs.push(x);
			}
			boss.marks = xs;
			boss.slamAt = t + TELEGRAPH;
			audio.play('rumble', true);
		}
		boss.arms += ((boss.marks ? 1 : 0) - boss.arms) * 0.08;
		if (boss.marks && t >= boss.slamAt) {
			for (const x of boss.marks) openCrack(x, 0.75);
			boss.marks = null;
			boss.hit = t;
			boss.nextSlam = t + WAVES[wave].slam;
			shake = 0.9;
		}
	}

	/* ---------- every tick ---------- */

	function step() {
		t += DT;
		if (!heroes.length) return;
		if (synth) synth.schedule(phase === 'live' ? wave / 2 : 0);
		const active = phase === 'live' || phase === 'between' || phase === 'finale';

		// Spawning.
		if (phase === 'live' && !calm) {
			const w = WAVES[wave];
			const alive = demons.filter((d) => d.state !== 'gone' && d.state !== 'slain' && d.state !== 'blasted' && d.state !== 'dissolve').length;
			if (t >= nextDemon && alive < w.max) {
				spawnFromSide();
				nextDemon = t + w.gap * (0.75 + Math.random() * 0.5);
			}
			if (t >= nextStrike) {
				// A spirit strike: a claw from the dark rakes the front of the band.
				const x = frontTarget();
				strikes.push({ x, t0: t });
				stage.timeout(() => { if (phase === 'live' || phase === 'between') openCrack(x, 0.55); }, 450);
				nextStrike = t + w.strike * (0.8 + Math.random() * 0.4) * (4 / (heroes.length + 2));
			}
		}

		stepHeroes(active);
		stepDemons(active);
		if (phase !== 'golden') bossStep();
		else if (boss) bossStep();

		// Cracks: drain integrity, mend on the sides, and get sung closed.
		for (let i = cracks.length - 1; i >= 0; i--) {
			const c = cracks[i];
			const sideWall = wallOf(c.x) !== 1;
			if (sideWall && !demons.some((d) => d.crack === c)) {
				c.size -= SIDE_MEND * DT;
				if (c.size <= 0.05) { cracks.splice(i, 1); continue; }
			}
			if (active) integrity -= DRAIN * c.size * (1 - c.progress * 0.7) * (sideWall ? SIDE_DRAIN : 1) * DT;
		}
		singCracks();
		if (integrity <= 0 && (phase === 'live' || phase === 'between' || phase === 'finale')) {
			integrity = 0;
			breakThrough();
		}

		if (phase === 'finale') stepFinale();
		if (phase === 'golden') {
			flare = Math.min(1, flare + DT / 1.2);
			// Golden motes drifting up off the whole band.
			for (let i = 0; i < 3; i++) {
				particles.push({ kind: 'spark', x: Math.random() * WIDTH, y: BAND_Y + (Math.random() - 0.5) * BAND_H, vx: 0, vy: -2 - Math.random() * 3, g: 0, life: 1.4, max: 1.4, color: Math.random() < 0.25 ? PINK : '#ffe27a', size: 6 + Math.random() * 6 });
			}
		}

		// Effects.
		for (const p of particles) {
			p.life -= DT;
			if (p.kind === 'note' && p.target) {
				const k = 1 - p.life / p.max;
				p.x = p.x0 + (p.target.x - p.x0) * k + Math.sin(k * 7 + p.wob) * 30;
				p.y = p.y0 + (p.target.y - p.y0) * k;
			} else {
				p.x += p.vx;
				p.y += p.vy;
				p.vy += p.g || 0;
				p.vx *= 0.97;
			}
		}
		for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
		for (let i = popups.length - 1; i >= 0; i--) if ((popups[i].life += DT) > 1.3) popups.splice(i, 1);
		for (let i = waves.length - 1; i >= 0; i--) if ((waves[i].life += DT) > 0.7) waves.splice(i, 1);
		for (let i = slashes.length - 1; i >= 0; i--) if ((slashes[i].life += DT) > 0.45) slashes.splice(i, 1);
		for (let i = strikes.length - 1; i >= 0; i--) if (t - strikes[i].t0 > 1) strikes.splice(i, 1);
		shake = Math.max(0, shake - DT * 1.5);

		hud.updatePlayers(heroes);
	}

	function stepHeroes(active) {
		for (const h of heroes) {
			h.x += (h.tx - h.x) * 0.3;
			// The power note: right up at the wall, while stamina lasts.
			const wantsPower = active && h.pz < POWER_Z;
			if (h.stamina <= 0) h.tired = true;
			if (h.tired && h.stamina >= STAMINA_MIN) h.tired = false;
			h.power = wantsPower && !h.tired;
			if (h.power) h.stamina = Math.max(0, h.stamina - STAMINA_DRAIN * DT);
			else if (h.pz > REST_Z) h.stamina = Math.min(1, h.stamina + STAMINA_FILL * DT);
			else h.stamina = Math.min(1, h.stamina + STAMINA_FILL * 0.25 * DT);
			h.reach = h.power ? POWER_R : SING_R;
			h.sing = Math.max(0, h.sing - DT * 3);
		}
	}

	function stepDemons(active) {
		for (const d of demons) {
			const k = d.k;
			if (d.state === 'crawl') {
				const onFront = d.x > W + 60 && d.x < 2 * W - 60;
				if (onFront) { leapTo(d, frontTarget()); continue; }
				if (t >= d.nextClaw && d.x > 60 && d.x < WIDTH - 60) {
					d.state = 'claw';
					d.clawUntil = t + k.claw;
					d.crack = openCrack(d.x + d.dir * 40, 0.25);
					continue;
				}
				if (active) d.x += d.dir * k.speed * DT;
			} else if (d.state === 'claw') {
				if (d.crack && cracks.includes(d.crack)) d.crack.size = Math.min(1, d.crack.size + k.grow * DT);
				else if (active) d.crack = openCrack(d.x + d.dir * 40, 0.25);
				if (t >= d.clawUntil) {
					d.crack = null;
					if (wallOf(d.x) === 1) leapTo(d, frontTarget());
					else { d.state = 'crawl'; d.nextClaw = t + k.every; }
				}
			} else if (d.state === 'leap') {
				const L = d.leap;
				const f = Math.min(1, (t - L.t0) / L.dur);
				d.x = L.x0 + (L.x1 - L.x0) * f;
				d.y = BAND_TOP - Math.sin(f * Math.PI) * 260;
				d.dir = L.x1 >= L.x0 ? 1 : -1;
				if (f >= 1) {
					d.y = BAND_TOP;
					d.state = 'claw';
					d.clawUntil = t + 4 + Math.random() * 2;
					d.crack = openCrack(d.x, 0.3);
					d.leap = null;
				}
			} else if (d.state === 'blasted') {
				d.x += d.vx;
				d.y += d.vy;
				d.vy += 0.6;
				d.fade -= DT * 1.2;
				if (d.fade <= 0) d.state = 'gone';
			} else if (d.state === 'slain' || d.state === 'dissolve') {
				d.fade -= DT * 1.6;
				if (Math.random() < 0.5) particles.push(smoke(d.x + (Math.random() - 0.5) * 80, d.y - Math.random() * 100));
				if (d.fade <= 0) d.state = 'gone';
			}

			// Singers under a front-wall demon charge a shockwave that blasts it off.
			const onFront = wallOf(d.x) === 1 && (d.state === 'claw' || d.state === 'crawl' || (d.state === 'leap' && t - d.leap.t0 > d.leap.dur * 0.6));
			if (onFront && active) {
				let under = 0;
				for (const h of heroes) {
					if (Math.abs(h.x - d.x) < h.reach * 0.75) {
						under++;
						d.pushers[h.n] = true;
						h.pushing = t;
					}
				}
				if (under) d.push += DT * under / PUSH_TIME;
				else { d.push = Math.max(0, d.push - DT); d.pushers = {}; }
				if (d.push >= 1) {
					waves.push({ x: d.x, life: 0 });
					sfx('thump');
					banish(d, 'push');
				}
			}
		}
		for (let i = demons.length - 1; i >= 0; i--) if (demons[i].state === 'gone') demons.splice(i, 1);
	}

	// Each singer sings every front-wall crack within reach.
	function singCracks() {
		for (const c of cracks) c.singers = 0;
		if (phase === 'golden' || phase === 'broken' || phase === 'over' || phase === 'intro') return;
		for (const h of heroes) {
			let singing = false;
			for (const c of cracks) {
				if (wallOf(c.x) !== 1 || Math.abs(c.x - h.x) > h.reach) continue;
				const rate = (h.power ? POWER_RATE : 1) / (SEAL_TIME * (0.5 + 0.5 * c.size));
				c.progress += rate * DT;
				c.contrib[h.n] = (c.contrib[h.n] || 0) + rate * DT;
				c.singers++;
				singing = true;
				h.singTarget = c;
			}
			if (singing) {
				h.sing = 1;
				if (t >= h.noteAt) {
					h.noteAt = t + 0.16;
					const c = h.singTarget;
					particles.push({ kind: 'note', x0: h.x + 10, y0: FLOOR - 320, x: h.x, y: FLOOR - 320, target: { x: c.x, y: BAND_Y }, life: 0.9, max: 0.9, wob: Math.random() * TAU, glyph: Math.random() < 0.5 ? '♪' : '♫', color: Math.random() < 0.3 ? PINK : GOLD });
				}
			}
		}
		for (let i = cracks.length - 1; i >= 0; i--) {
			const c = cracks[i];
			if (!c.singers) c.progress = Math.max(0, c.progress - DT * 0.08);
			else if ((c.chimeAt || 0) < t) {
				// A rising chime as the ring fills.
				sfx('chime', Math.floor(c.progress * 8), 0.07);
				c.chimeAt = t + 0.25;
			}
			if (c.progress >= 1) sealCrack(c);
		}
	}

	function stepFinale() {
		for (const m of marks) m.held = heroes.some((h) => Math.abs(h.x - m.x) < MARK_R);
		const all = marks.every((m) => m.held);
		if (all) {
			if (hold === 0) sfx('chime', 5, 0.1);
			hold += DT;
		} else hold = Math.max(0, hold - DT * 2);
		if (hold >= HOLD) sealGolden(true);
		else if (t - finaleStart > FINALE_TIME) sealGolden(false);
	}

	/* ---------- touch: slash side-wall demons ---------- */

	function touch(at) {
		if (!heroes.length || phase === 'over') return;
		if (synth) synth.resume();
		const w = wallOf(at.x);
		if (w === 1) return;
		let best = null;
		let bestD = SLASH_R;
		for (const d of demons) {
			if (wallOf(d.x) === 1 || !(d.state === 'crawl' || d.state === 'claw')) continue;
			const dist = Math.hypot(d.x - at.x, d.y - 60 * d.k.scale - at.y);
			if (dist < bestD) { best = d; bestD = dist; }
		}
		slashes.push({ x: best ? best.x : at.x, y: best ? best.y - 60 : at.y, life: 0, dir: Math.random() < 0.5 ? 1 : -1 });
		sfx('slash');
		if (!best) return;
		// Credit whoever stands nearest that wall.
		let by = null;
		for (const h of heroes) {
			const dist = w === 0 ? h.x - W : 2 * W - h.x;
			if (!by || dist < by.dist) by = { h, dist };
		}
		banish(best, 'slash', by && by.h);
	}

	stage.$el.on('click.honmoon', (e) => touch(IGB.toWorld(e)));

	/* ---------- effects ---------- */

	function spark(x, y, color) {
		const a = Math.random() * TAU;
		const v = 2 + Math.random() * 6;
		return { kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.12, life: 0.7, max: 0.7, color, size: 5 + Math.random() * 6 };
	}

	function smoke(x, y) {
		return { kind: 'smoke', x, y, vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 1.5, life: 0.9, max: 0.9, color: '#2a0f3d', size: 18 + Math.random() * 20 };
	}

	function burst(x, y, color, n) {
		for (let i = 0; i < n; i++) {
			const p = spark(x, y, color);
			p.kind = 'shard';
			p.vx *= 1.6;
			p.vy *= 1.6;
			p.life = p.max = 0.9;
			particles.push(p);
		}
	}

	function popup(x, y, text, color) {
		popups.push({ x, y, text, color, life: 0 });
	}

	/* ---------- drawing: the city ---------- */

	// The sky and the city are drawn once into canvases of their own.
	let skyCanvas = null;
	let cityCanvas = null;
	let bandCanvas = null;

	function makeCanvas(w, h) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}

	function seeded(seed) {
		let s = seed;
		return () => ((s = (s * 16807) % 2147483647) / 2147483647);
	}

	function buildSky() {
		const c = makeCanvas(WIDTH, H);
		const g = c.getContext('2d');
		g.fillStyle = art.linear(g, 0, 0, 0, H, [[0, '#07031a'], [0.45, '#1c0b45'], [0.75, '#4a1460'], [1, '#8a2a78']]);
		g.fillRect(0, 0, WIDTH, H);
		const rnd = seeded(7);
		for (let i = 0; i < 420; i++) {
			const x = rnd() * WIDTH;
			const y = rnd() * 600;
			art.circle(g, x, y, rnd() * 2.4 + 0.6, { fill: rnd() < 0.2 ? '#ffd9f2' : '#ffffff', alpha: 0.3 + rnd() * 0.6 });
		}
		// A big pale moon on the right wall, haloed in pink.
		art.circle(g, 4180, 210, 260, { fill: art.radial(g, 4180, 210, 60, 260, ['rgba(255,150,220,0.35)', 'rgba(255,150,220,0)']) });
		art.circle(g, 4180, 210, 95, { fill: art.radial(g, 4150, 180, 10, 95, ['#fff8ec', '#ffd6ef']) });
		// Pink haze low over the city.
		g.fillStyle = art.linear(g, 0, 560, 0, H, ['rgba(255,79,168,0)', 'rgba(255,79,168,0.35)']);
		g.fillRect(0, 560, WIDTH, H - 560);
		return c;
	}

	function buildCity() {
		const c = makeCanvas(WIDTH, H);
		const g = c.getContext('2d');
		const rnd = seeded(31);
		// Two layers of towers: a hazy far row, then a dark near row with lit windows.
		for (const layer of [0, 1]) {
			let x = -20;
			while (x < WIDTH) {
				const w = 70 + rnd() * (layer ? 150 : 110);
				const top = layer ? 560 + rnd() * 250 : 470 + rnd() * 200;
				const near = layer === 1;
				g.fillStyle = near ? '#0e0720' : '#2a1350';
				g.fillRect(x, top, w, H - top);
				if (rnd() < 0.3) g.fillRect(x + w * 0.45, top - 40, 4, 40);   // an aerial
				if (near) {
					// Windows in neon pink, gold and violet.
					const cols = ['#ff4fa8', '#ffcf3f', '#a77bff', '#ffe9a8'];
					for (let wy = top + 18; wy < H - 20; wy += 26) {
						for (let wx = x + 10; wx < x + w - 14; wx += 20) {
							if (rnd() < 0.32) {
								g.globalAlpha = 0.35 + rnd() * 0.5;
								g.fillStyle = cols[Math.floor(rnd() * cols.length)];
								g.fillRect(wx, wy, 9, 13);
							}
						}
					}
					g.globalAlpha = 1;
					// Now and then a neon sign strip.
					if (rnd() < 0.25) {
						const col = rnd() < 0.5 ? '#ff4fa8' : '#3ff4ff';
						g.save();
						g.shadowColor = col;
						g.shadowBlur = 18;
						g.fillStyle = col;
						g.fillRect(x + 8, top + 30, w - 16, 6);
						g.restore();
					}
				}
				x += w + (near ? 4 + rnd() * 20 : rnd() * 10);
			}
		}
		// A tall radio tower on the left wall's hill.
		g.fillStyle = '#0e0720';
		g.beginPath();
		g.moveTo(700, 1000); g.lineTo(748, 600); g.lineTo(772, 600); g.lineTo(820, 1000); g.fill();
		g.fillRect(754, 300, 12, 320);
		g.beginPath();
		g.ellipse(760, 590, 62, 26, 0, 0, TAU);
		g.fill();
		for (const y of [575, 600]) {
			g.fillStyle = y === 575 ? '#ffcf3f' : '#ff4fa8';
			for (let x = 712; x < 810; x += 16) g.fillRect(x, y, 8, 5);
		}
		g.fillStyle = '#0e0720';
		art.circle(g, 760, 296, 9, { fill: '#ff4fa8', shadow: { color: '#ff4fa8', blur: 20 } });
		// The stage on the front wall: a glossy floor with a neon lip.
		g.fillStyle = art.linear(g, 0, 860, 0, H, ['#2a0f45', '#12061f']);
		g.fillRect(W - 40, 862, W + 80, H - 862);
		g.save();
		g.shadowColor = PINK;
		g.shadowBlur = 24;
		g.fillStyle = PINK;
		g.fillRect(W - 40, 858, W + 80, 7);
		g.restore();
		for (let x = W + 40; x < 2 * W; x += 160) {
			g.fillStyle = 'rgba(255,207,63,0.5)';
			g.fillRect(x, 948, 60, 4);
		}
		return c;
	}

	// The band: a gold wash with a hexagon lattice and wave lines.
	function buildBand() {
		const h = BAND_H + 60;
		const c = makeCanvas(WIDTH, h);
		const g = c.getContext('2d');
		const top = 30;
		g.fillStyle = art.linear(g, 0, top, 0, top + BAND_H, ['rgba(255,207,63,0.0)', 'rgba(255,207,63,0.28)', 'rgba(255,240,180,0.42)', 'rgba(255,207,63,0.28)', 'rgba(255,207,63,0)']);
		g.fillRect(0, top, WIDTH, BAND_H);
		g.save();
		g.beginPath();
		g.rect(0, top, WIDTH, BAND_H);
		g.clip();
		const R = 26;
		const dx = R * Math.sqrt(3);
		g.strokeStyle = 'rgba(255,224,120,0.75)';
		g.lineWidth = 2.5;
		for (let row = -1; row * R * 1.5 < BAND_H + R * 2; row++) {
			const cy = top + row * R * 1.5;
			for (let x = (row % 2 ? dx / 2 : 0) - dx; x < WIDTH + dx; x += dx) {
				g.beginPath();
				for (let i = 0; i < 6; i++) {
					const a = Math.PI / 6 + i * TAU / 6;
					const px = x + Math.cos(a) * R;
					const py = cy + Math.sin(a) * R;
					if (i) g.lineTo(px, py); else g.moveTo(px, py);
				}
				g.closePath();
				g.stroke();
			}
		}
		g.restore();
		// Bright rims.
		for (const y of [top + 3, top + BAND_H - 3]) {
			g.save();
			g.shadowColor = GOLD;
			g.shadowBlur = 16;
			g.fillStyle = '#ffe9a0';
			g.fillRect(0, y - 2, WIDTH, 4);
			g.restore();
		}
		return c;
	}

	function drawBand(ctx, now) {
		if (!bandCanvas) bandCanvas = buildBand();
		const top = BAND_TOP - 30;
		const weak = 1 - integrity / 100;
		ctx.save();
		ctx.globalAlpha = 0.75 + 0.15 * Math.sin(now * 2) - weak * 0.25 + flare * 0.25;
		ctx.drawImage(bandCanvas, 0, top);
		ctx.restore();
		// A shimmer sweeping along, and two wave lines, in additive light.
		art.save(ctx, (ctx) => {
			ctx.globalCompositeOperation = 'lighter';
			ctx.beginPath();
			ctx.rect(0, BAND_TOP, WIDTH, BAND_H);
			ctx.clip();
			const sx = (now * 700) % (WIDTH + 1200) - 600;
			ctx.fillStyle = art.linear(ctx, sx - 500, 0, sx + 500, 0, ['rgba(255,220,120,0)', 'rgba(255,230,150,0.35)', 'rgba(255,220,120,0)']);
			ctx.fillRect(sx - 500, BAND_TOP, 1000, BAND_H);
			for (const [amp, speed, col] of [[22, 1.6, 'rgba(255,120,200,0.55)'], [16, -1.1, 'rgba(255,230,140,0.6)']]) {
				ctx.beginPath();
				for (let x = 0; x <= WIDTH; x += 24) {
					const y = BAND_Y + Math.sin(x / 140 + now * speed) * amp;
					if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
				}
				ctx.strokeStyle = col;
				ctx.lineWidth = 4;
				ctx.stroke();
			}
			if (flare > 0) {
				ctx.fillStyle = `rgba(255,215,90,${0.6 * flare})`;
				ctx.fillRect(0, BAND_TOP, WIDTH, BAND_H);
			}
		});
		// A red tint as the barrier weakens.
		if (weak > 0.4 && !flare) {
			const pulse = 0.5 + 0.5 * Math.sin(now * (4 + weak * 6));
			art.rect(ctx, 0, BAND_TOP, WIDTH, BAND_H, { fill: '#ff1f4f', alpha: (weak - 0.4) * 0.5 * (0.6 + 0.4 * pulse) });
		}
	}

	function drawCrack(ctx, c, now) {
		const front = wallOf(c.x) === 1;
		const rnd = seeded(Math.floor(c.seed) + 1);
		const len = 50 + c.size * 110;
		const sealing = c.progress;
		// The hole: a dark rift in the light.
		art.ellipse(ctx, c.x, BAND_Y, 26 + c.size * 46, BAND_H * 0.42, { fill: art.radial(ctx, c.x, BAND_Y, 4, 26 + c.size * 50, ['rgba(20,0,30,0.95)', 'rgba(60,0,70,0.6)', 'rgba(60,0,70,0)']), alpha: 1 - sealing * 0.6 });
		// Jagged fractures running out from it.
		const branches = [];
		for (let b = 0; b < 6; b++) {
			const a = (b / 6) * TAU + rnd() * 0.6;
			const pts = [[c.x, BAND_Y]];
			let x = c.x;
			let y = BAND_Y;
			const segs = 4;
			for (let s = 0; s < segs; s++) {
				const seg = len / segs * (0.6 + rnd() * 0.6);
				const aa = a + (rnd() - 0.5) * 0.9;
				x += Math.cos(aa) * seg;
				y += Math.sin(aa) * seg * 0.55;
				y = Math.max(BAND_TOP + 4, Math.min(BAND_TOP + BAND_H - 4, y));
				pts.push([x, y]);
			}
			branches.push(pts);
		}
		const glow = sealing > 0 ? GOLD : '#ff3fb4';
		for (const pts of branches) art.line(ctx, pts, { stroke: glow, lineWidth: 12, alpha: 0.35 + 0.15 * Math.sin(now * 8 + c.seed) });
		for (const pts of branches) art.line(ctx, pts, { stroke: '#1a0326', lineWidth: 5, alpha: 1 - sealing * 0.7 });
		// The sealing ring.
		if (front) {
			const r = 74;
			art.circle(ctx, c.x, BAND_Y, r, { stroke: 'rgba(255,255,255,0.25)', lineWidth: 8, fill: null });
			if (sealing > 0) {
				art.save(ctx, (ctx) => {
					ctx.beginPath();
					ctx.arc(c.x, BAND_Y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, sealing));
					ctx.strokeStyle = GOLD;
					ctx.lineWidth = 12;
					ctx.lineCap = 'round';
					ctx.shadowColor = GOLD;
					ctx.shadowBlur = 18;
					ctx.stroke();
				});
			}
		}
	}

	// A beam of light down from each open front-wall crack to the stage:
	// where to stand to sing it.
	function drawCrackSpot(ctx, c, now) {
		if (wallOf(c.x) !== 1) return;
		const a = c.singers ? 0.5 : 0.22 + 0.12 * Math.sin(now * 5 + c.seed);
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = art.linear(ctx, 0, BAND_Y + 60, 0, FLOOR, [`rgba(255,207,63,0)`, `rgba(255,207,63,${a * 0.6})`]);
		ctx.beginPath();
		ctx.moveTo(c.x - 20, BAND_Y + 60);
		ctx.lineTo(c.x + 20, BAND_Y + 60);
		ctx.lineTo(c.x + 110, FLOOR);
		ctx.lineTo(c.x - 110, FLOOR);
		ctx.fill();
		ctx.restore();
		art.ellipse(ctx, c.x, FLOOR + 6, 120, 26, { stroke: GOLD, lineWidth: 5, fill: 'rgba(255,207,63,0.15)', alpha: 0.5 + a });
		if (!c.singers) art.text(ctx, '♪', c.x, FLOOR - 60 + Math.sin(now * 4 + c.seed) * 10, { size: 70, fill: GOLD, alpha: 0.75, shadow: { color: GOLD, blur: 18 } });
	}

	/* ---------- drawing: demons ---------- */

	function drawDemon(ctx, d, now) {
		const k = d.k;
		const clawing = d.state === 'claw';
		const leaping = d.state === 'leap';
		const bob = Math.sin(now * (k.speed / 8) + d.phase);
		const alpha = d.state === 'crawl' || clawing || leaping ? 1 : Math.max(0, d.fade);
		art.with(ctx, { x: d.x, y: d.y, scaleX: d.dir * k.scale, scaleY: k.scale, rotate: d.state === 'blasted' ? (1 - d.fade) * 400 * Math.sign(d.vx) : 0, alpha }, () => {
			const mark = k.mark;
			// Shadowy aura.
			art.ellipse(ctx, 0, -55, 110, 80, { fill: art.radial(ctx, 0, -55, 10, 110, ['rgba(40,0,60,0.7)', 'rgba(40,0,60,0)']) });
			// Back legs.
			art.line(ctx, [[-40, -30], [-55 + bob * 6, 0]], { stroke: '#120720', lineWidth: 16 });
			art.line(ctx, [[-20, -30], [-25 - bob * 6, 0]], { stroke: '#120720', lineWidth: 16 });
			// Hunched body.
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(-70, -28);
			ctx.bezierCurveTo(-80, -90, -20, -125 + bob * 3, 30, -100);
			ctx.bezierCurveTo(60, -86, 60, -40, 40, -26);
			ctx.bezierCurveTo(10, -14, -40, -10, -70, -28);
			ctx.closePath();
			ctx.fillStyle = art.linear(ctx, 0, -120, 0, -10, ['#4a1d70', '#0b0414']);
			ctx.shadowColor = mark;
			ctx.shadowBlur = art.px(ctx, 22);
			ctx.fill();
			ctx.shadowColor = 'transparent';
			// A violet rim light, so the shadow reads against the night sky.
			ctx.strokeStyle = '#b866ff';
			ctx.lineWidth = 4;
			ctx.stroke();
			ctx.beginPath();
			// Spines along the back.
			for (let i = 0; i < 5; i++) {
				const sx = -60 + i * 18;
				const sy = -78 - Math.sin(i / 4 * Math.PI) * 40 + bob * 2;
				ctx.moveTo(sx - 7, sy + 8);
				ctx.lineTo(sx - 4, sy - 16 - (d.kind === 'fast' ? 10 : 0));
				ctx.lineTo(sx + 8, sy + 6);
			}
			ctx.fillStyle = '#1a0a2c';
			ctx.fill();
			ctx.restore();
			// Glowing patterned markings.
			art.save(ctx, (ctx) => {
				ctx.globalCompositeOperation = 'lighter';
				const pulse = 0.6 + 0.4 * Math.sin(now * 5 + d.phase);
				for (const [w, a] of [[9, 0.25 * pulse], [3, 0.95]]) {
					ctx.strokeStyle = mark;
					ctx.globalAlpha = a;
					ctx.lineWidth = w;
					ctx.beginPath();
					ctx.moveTo(-55, -40); ctx.quadraticCurveTo(-35, -85, 0, -88); ctx.quadraticCurveTo(25, -88, 30, -60);
					ctx.moveTo(-40, -32); ctx.quadraticCurveTo(-20, -60, 5, -58);
					ctx.moveTo(-28, -70); ctx.lineTo(-18, -80); ctx.lineTo(-8, -70); ctx.lineTo(-18, -60); ctx.closePath();
					ctx.stroke();
				}
			});
			// Arms reaching to the barrier; raking when clawing.
			const rake = clawing ? Math.sin(now * 14 + d.phase) : bob * 0.4;
			const hands = [[70 + rake * 18, 30 - Math.max(0, rake) * 50], [50 - rake * 18, 26 - Math.max(0, -rake) * 50]];
			for (const [hx, hy] of hands) {
				art.line(ctx, [[30, -50], [62, -30], [hx, hy - 10]], { stroke: '#170a26', lineWidth: 14 });
				for (let c = -1; c <= 1; c++) {
					art.line(ctx, [[hx, hy - 10], [hx + 10 + c * 4, hy + 12], [hx + 4 + c * 9, hy + 20]], { stroke: '#f5e9ff', lineWidth: 4 });
				}
			}
			// The head: a wide toothy grin and glowing eyes.
			art.circle(ctx, 42, -80, 30, { fill: art.radial(ctx, 36, -90, 4, 32, ['#4d2270', '#12061d']), stroke: '#b866ff', lineWidth: 3 });
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(22, -70);
			ctx.quadraticCurveTo(48, -48, 72, -74);
			ctx.quadraticCurveTo(50, -62, 22, -70);
			ctx.fillStyle = '#5a0b2a';
			ctx.fill();
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const tx = 26 + i * 8;
				const ty = -70 + Math.sin(i / 5 * Math.PI) * 9;
				ctx.moveTo(tx, ty); ctx.lineTo(tx + 4, ty + 8); ctx.lineTo(tx + 8, ty);
			}
			ctx.fillStyle = '#fff6f0';
			ctx.fill();
			ctx.restore();
			for (const ex of [36, 56]) {
				art.ellipse(ctx, ex, -92, 7, 4, { fill: '#fff', shadow: { color: mark, blur: 14 } });
			}
			// The shockwave building up under it.
			if (d.push > 0 && d.state !== 'blasted') art.circle(ctx, 0, -50, 70 + d.push * 30, { stroke: '#9ff6ff', lineWidth: 6, fill: null, alpha: d.push });
		});
	}

	function drawBoss(ctx, now) {
		if (!boss) return;
		const rise = boss.rise;
		const dying = boss.dying ? Math.min(1, (t - boss.dying) / 2.5) : 0;
		const y0 = 1080 + (1 - rise) * 760;
		const x = boss.x;
		const sway = Math.sin(now * 0.8) * 10;
		const alpha = 1 - dying;
		art.with(ctx, { x, y: y0, alpha }, () => {
			// A towering cloak of shadow.
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(-330, 0);
			ctx.bezierCurveTo(-300, -380, -220, -640, -120 + sway, -760);
			ctx.lineTo(120 + sway, -760);
			ctx.bezierCurveTo(220, -640, 300, -380, 330, 0);
			ctx.closePath();
			ctx.fillStyle = art.linear(ctx, 0, -800, 0, 0, ['#2a0d48', '#07020e']);
			ctx.shadowColor = 'rgba(255,40,90,0.7)';
			ctx.shadowBlur = art.px(ctx, 50);
			ctx.fill();
			ctx.shadowColor = 'transparent';
			ctx.strokeStyle = 'rgba(184,102,255,0.8)';
			ctx.lineWidth = 5;
			ctx.stroke();
			ctx.restore();
			// Patterned golden seams down the cloak.
			art.save(ctx, (ctx) => {
				ctx.globalCompositeOperation = 'lighter';
				ctx.strokeStyle = GOLD;
				ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now * 3);
				ctx.lineWidth = 4;
				for (const s of [-1, 1]) {
					ctx.beginPath();
					for (let i = 0; i <= 12; i++) {
						const yy = -720 + i * 60;
						const xx = s * (90 + i * 16) + Math.sin(i * 1.3 + now) * 12;
						if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
					}
					ctx.stroke();
				}
			});
			// Arms: raised high while it winds up a slam.
			const up = boss.arms;
			for (const s of [-1, 1]) {
				const sx = s * 150;
				const hx = s * (330 + up * 40);
				const hy = -560 - up * 300;
				art.line(ctx, [[sx, -680], [s * 300, -560 - up * 120], [hx, hy]], { stroke: '#12051f', lineWidth: 46 });
				for (let c = -1; c <= 1; c++) art.line(ctx, [[hx, hy], [hx + s * 20 + c * 18, hy - 50]], { stroke: '#e9d8ff', lineWidth: 8 });
			}
			// Horns, then the mask.
			for (const s of [-1, 1]) art.poly(ctx, [[s * 50 + sway, -840], [s * 150 + sway, -980], [s * 90 + sway, -830]], { fill: '#12051f' });
			art.with(ctx, { x: sway, y: -820 }, () => {
				art.ellipse(ctx, 0, 0, 82, 104, { fill: art.linear(ctx, 0, -100, 0, 100, ['#fff3cf', '#e7b24a']), shadow: { color: 'rgba(255,207,63,0.8)', blur: 40 } });
				// Gold filigree.
				ctx.save();
				ctx.strokeStyle = '#9a6a10';
				ctx.lineWidth = 3;
				for (const s of [-1, 1]) {
					ctx.beginPath();
					ctx.arc(s * 38, 38, 26, 0, TAU);
					ctx.moveTo(0, -95); ctx.quadraticCurveTo(s * 60, -60, s * 60, -10);
					ctx.moveTo(s * 20, -80); ctx.quadraticCurveTo(s * 40, -45, s * 22, -30);
					ctx.stroke();
				}
				ctx.beginPath();
				ctx.moveTo(-14, -70); ctx.lineTo(0, -88); ctx.lineTo(14, -70); ctx.lineTo(0, -52); ctx.closePath();
				ctx.stroke();
				ctx.restore();
				// Slanted eye holes, burning red; a carved grin.
				const fury = boss.marks ? 1 : 0.5;
				for (const s of [-1, 1]) {
					art.poly(ctx, [[s * 14, -14], [s * 58, -30], [s * 50, -4]], { fill: '#14000a', shadow: { color: `rgba(255,30,80,${fury})`, blur: 25 } });
					art.circle(ctx, s * 36, -15, 6, { fill: '#ff2050', alpha: fury });
				}
				art.line(ctx, [[-44, 46], [-22, 58], [0, 52], [22, 58], [44, 46]], { stroke: '#14000a', lineWidth: 6 });
			});
		});
		if (dying) for (let i = 0; i < 3; i++) particles.push(smoke(x + (Math.random() - 0.5) * 500, y0 - Math.random() * 800));
	}

	// Rifts at the far ends of the side walls, where the demons crawl out.
	function drawGates(ctx, now) {
		if (flare > 0) return;
		for (const x of [50, WIDTH - 50]) {
			art.ellipse(ctx, x, BAND_Y, 150, 220, { fill: art.radial(ctx, x, BAND_Y, 10, 220, ['rgba(255,30,90,0.45)', 'rgba(120,20,160,0.2)', 'rgba(60,0,80,0)']) });
			art.ellipse(ctx, x, BAND_Y, 58, 120, { fill: art.radial(ctx, x, BAND_Y, 4, 120, ['#000', '#1a0329', '#3d0b52']), stroke: '#ff2f7a', lineWidth: 5, shadow: { color: '#ff2f7a', blur: 30 } });
			for (let i = 0; i < 3; i++) {
				const a = now * (1.5 + i * 0.4) + i * 2;
				art.save(ctx, (ctx) => {
					ctx.beginPath();
					ctx.ellipse(x, BAND_Y, 40 - i * 10, 95 - i * 25, 0, a, a + 2.2);
					ctx.strokeStyle = i === 1 ? '#3ff4ff' : '#c06bff';
					ctx.globalAlpha = 0.7;
					ctx.lineWidth = 4;
					ctx.stroke();
				});
			}
		}
	}

	function drawSlamMarks(ctx, now) {
		if (!boss || !boss.marks) return;
		const k = 1 - (boss.slamAt - t) / TELEGRAPH;
		for (const x of boss.marks) {
			const r = 90 - k * 40;
			art.circle(ctx, x, BAND_Y, r, { stroke: '#ff2050', lineWidth: 8, fill: 'rgba(255,32,80,0.18)', alpha: 0.5 + 0.5 * Math.sin(now * 20) });
			art.text(ctx, '!', x, BAND_Y, { size: 90, font: 'Knewave', fill: '#ff2050', outline: '#2a0010', outlineWidth: 5 });
		}
	}

	function drawStrikes(ctx) {
		for (const s of strikes) {
			const k = (t - s.t0) / 0.6;
			if (k > 1.6) continue;
			const a = Math.min(1, 1.6 - k);
			for (let i = -1; i <= 1; i++) {
				const x0 = s.x + i * 34 - 90;
				const y0 = BAND_Y - 200;
				const f = Math.min(1, k);
				art.line(ctx, [[x0, y0], [x0 + 180 * f, y0 + 260 * f]], { stroke: '#2b0040', lineWidth: 18, alpha: a * 0.8 });
				art.line(ctx, [[x0, y0], [x0 + 180 * f, y0 + 260 * f]], { stroke: '#ff3fb4', lineWidth: 4, alpha: a });
			}
		}
	}

	/* ---------- drawing: the idol hunters ---------- */

	// An original idol-hunter: a cropped jacket in the player's colour with
	// gold trim over black, boots, a glowing headset mic, and one of six
	// hairstyles. Facing out to the room. Feet at (0, 0).
	function drawHero(ctx, h, now) {
		const n = h.n;
		const col = PLAYER_COLORS[n] || '#ccc';
		const skin = SKIN[n % SKIN.length];
		const hair = HAIR[n % HAIR.length];
		const beat = Math.sin(now * Math.PI * 2 * 2 + h.bob); // 120 bpm
		const singing = h.sing > 0.1;
		const pushingNow = t - (h.pushing || -9) < 0.3;
		const sway = beat * (singing ? 5 : 2);

		// Light on the floor: reach, and the power note's golden aura.
		if (h.power) {
			art.ellipse(ctx, h.x, FLOOR + 8, h.reach, 34, { fill: art.radial(ctx, h.x, FLOOR + 8, 10, h.reach, ['rgba(255,207,63,0.5)', 'rgba(255,207,63,0)']) });
			art.ellipse(ctx, h.x, FLOOR - 140, 120, 200, { fill: art.radial(ctx, h.x, FLOOR - 140, 10, 200, ['rgba(255,220,120,0.45)', 'rgba(255,220,120,0)']) });
		}
		art.ellipse(ctx, h.x, FLOOR + 8, 70, 18, { fill: col, alpha: 0.45, shadow: { color: col, blur: 20 } });

		art.with(ctx, { x: h.x, y: FLOOR, scale: HERO_SCALE }, () => {
			art.with(ctx, { x: 0, y: 0, rotate: sway * 0.3 }, () => {
				// Long hair behind the head for some styles.
				const style = n % 6;
				const hy = -262;
				if (style === 0) { // high ponytail
					art.line(ctx, [[8, hy - 26], [40 + sway, hy - 10], [44 + sway * 2, hy + 60], [30 + sway * 2, hy + 110]], { stroke: hair, lineWidth: 22 });
				} else if (style === 1) { // long straight
					art.roundRect(ctx, -30, hy - 10, 60, 120, 20, { fill: hair });
				} else if (style === 5) { // a long braid over the shoulder
					for (let i = 0; i < 6; i++) art.circle(ctx, -22 - i * 2 + sway, hy + 20 + i * 18, 11, { fill: hair });
				}
				// Legs and boots.
				for (const s of [-1, 1]) {
					const fx = s * 22 + (singing ? s * beat * 3 : 0);
					art.line(ctx, [[s * 14, -128], [fx, -10]], { stroke: '#17121f', lineWidth: 24, lineCap: 'butt' });
					art.roundRect(ctx, fx - 15, -62, 30, 60, 8, { fill: '#2c2140' });
					art.rect(ctx, fx - 15, -64, 30, 6, { fill: GOLD });
					art.roundRect(ctx, fx - 16 + s * 4, -10, 34, 14, 6, { fill: '#2c2140' });
				}
				// Skirt or belted shorts.
				art.poly(ctx, [[-30, -160], [30, -160], [42, -118], [-42, -118]], { fill: '#1d1628' });
				art.rect(ctx, -32, -166, 64, 9, { fill: PINK });
				// Torso: black top under a cropped jacket.
				art.roundRect(ctx, -26, -232, 52, 76, 12, { fill: '#18121f' });
				for (const s of [-1, 1]) {
					art.poly(ctx, [[s * 8, -234], [s * 40, -232], [s * 42, -178], [s * 18, -172]], { fill: col });
					art.line(ctx, [[s * 8, -234], [s * 18, -172], [s * 42, -178]], { stroke: GOLD, lineWidth: 4 });
				}
				// A gold emblem on the top.
				art.poly(ctx, [[0, -212], [8, -200], [0, -188], [-8, -200]], { fill: GOLD });
				// Arms: the mic hand to the mouth when singing, the other flung out.
				const shoulder = -224;
				let left;
				let right;
				if (pushingNow) {
					left = [[-38, shoulder], [-58, -270], [-48, -330]];
					right = [[38, shoulder], [58, -270], [48, -330]];
				} else if (singing) {
					left = [[-38, shoulder], [-82, -244 + beat * 6], [-112, -300 + beat * 10]];
					right = [[38, shoulder], [46, -190], [16, -250]];
				} else {
					left = [[-38, shoulder], [-46, -186], [-44 - beat * 2, -150]];
					right = [[38, shoulder], [46, -186], [44 + beat * 2, -150]];
				}
				for (const arm of [left, right]) {
					art.line(ctx, arm.slice(0, 2), { stroke: col, lineWidth: 18 });
					art.line(ctx, arm.slice(1), { stroke: skin, lineWidth: 13 });
					art.circle(ctx, arm[2][0], arm[2][1], 9, { fill: skin });
				}
				// Neck and head.
				art.rect(ctx, -7, -250, 14, 20, { fill: skin });
				art.circle(ctx, 0, hy, 27, { fill: skin });
				// Face: eyes, and an open mouth while singing.
				for (const s of [-1, 1]) art.ellipse(ctx, s * 10, hy + 2, 3.5, singing ? 2 : 4, { fill: '#20132a' });
				if (singing) art.ellipse(ctx, 0, hy + 14, 5, 6 + beat * 1.5, { fill: '#b8264f' });
				else art.line(ctx, [[-5, hy + 13], [5, hy + 13]], { stroke: '#b8264f', lineWidth: 3 });
				// Hair on top, with a streak in the player's colour.
				drawHair(ctx, style, hair, col, hy, sway);
				// A headset mic, glowing pink while singing.
				art.line(ctx, [[24, hy - 2], [22, hy + 14], [8, hy + 18]], { stroke: '#d8d0e8', lineWidth: 3 });
				art.circle(ctx, 8, hy + 18, 4, { fill: singing ? PINK : '#d8d0e8', shadow: singing ? { color: PINK, blur: 12 } : null });
			});
			// Stamina under the feet: gold, draining while the power note sounds.
			const bw = 120;
			art.roundRect(ctx, -bw / 2, 30, bw, 14, 7, { fill: 'rgba(10,4,20,0.75)' });
			art.roundRect(ctx, -bw / 2 + 2, 32, (bw - 4) * h.stamina, 10, 5, { fill: h.tired ? '#888' : art.linear(ctx, -bw / 2, 0, bw / 2, 0, [PINK, GOLD]) });
		});
	}

	function drawHair(ctx, style, hair, col, hy, sway) {
		// A cap of hair over the crown, then each style's bangs and shape.
		ctx.save();
		ctx.beginPath();
		ctx.arc(0, hy - 4, 30, Math.PI * 1.02, Math.PI * 1.98);
		ctx.lineTo(30, hy + 4);
		ctx.quadraticCurveTo(14, hy - 14, -4, hy - 12);
		ctx.quadraticCurveTo(-18, hy - 4, -30, hy + 6);
		ctx.closePath();
		ctx.fillStyle = hair;
		ctx.fill();
		ctx.restore();
		if (style === 1 || style === 2) {
			// Straight fringe, and a bob's sides.
			art.rect(ctx, -28, hy - 22, 56, 12, { fill: hair });
			if (style === 2) for (const s of [-1, 1]) art.roundRect(ctx, s * 30 - 9, hy - 16, 18, 42, 8, { fill: hair });
		}
		if (style === 3) for (const s of [-1, 1]) art.circle(ctx, s * 26, hy - 28, 15, { fill: hair });
		if (style === 4) {
			for (let i = 0; i < 5; i++) art.poly(ctx, [[-26 + i * 13, hy - 20], [-20 + i * 13 + sway, hy - 48], [-14 + i * 13, hy - 20]], { fill: hair });
		}
		if (style === 0) art.circle(ctx, 8, hy - 30, 9, { fill: col });  // a hair tie
		// The coloured streak.
		art.line(ctx, [[-18, hy - 24], [-8, hy - 12]], { stroke: col, lineWidth: 5 });
	}

	/* ---------- drawing: everything ---------- */

	function drawParticles(ctx) {
		for (const p of particles) {
			const k = Math.max(0, p.life / p.max);
			if (p.kind === 'note') {
				art.text(ctx, p.glyph, p.x, p.y, { size: 46, fill: p.color, alpha: Math.min(1, k * 2), shadow: { color: p.color, blur: 12 } });
			} else if (p.kind === 'smoke') {
				art.circle(ctx, p.x, p.y, p.size * (1.5 - k * 0.5), { fill: p.color, alpha: k * 0.6 });
			} else if (p.kind === 'shard') {
				art.with(ctx, { x: p.x, y: p.y, rotate: p.life * 600 }, () => {
					art.poly(ctx, [[0, -p.size], [p.size * 0.8, 0], [0, p.size], [-p.size * 0.8, 0]], { fill: p.color, alpha: k });
				});
			} else {
				art.circle(ctx, p.x, p.y, p.size * k, { fill: p.color, alpha: k });
			}
		}
	}

	function drawEffects(ctx) {
		for (const w of waves) {
			const k = w.life / 0.7;
			for (let i = 0; i < 3; i++) {
				const kk = Math.max(0, k - i * 0.12);
				art.save(ctx, (ctx) => {
					ctx.beginPath();
					ctx.arc(w.x, FLOOR - 250, 60 + kk * 500, -Math.PI * 0.85, -Math.PI * 0.15);
					ctx.strokeStyle = '#9ff6ff';
					ctx.globalAlpha = Math.max(0, 1 - kk);
					ctx.lineWidth = 14 - i * 3;
					ctx.shadowColor = '#9ff6ff';
					ctx.shadowBlur = 20;
					ctx.stroke();
				});
			}
		}
		for (const s of slashes) {
			const k = s.life / 0.45;
			art.with(ctx, { x: s.x, y: s.y, rotate: s.dir * 25, scaleX: s.dir }, () => {
				ctx.save();
				ctx.globalAlpha = 1 - k;
				ctx.beginPath();
				ctx.arc(0, 0, 150, -Math.PI * 0.9 + k * 0.4, -Math.PI * 0.9 + 0.4 + Math.min(1, k * 3) * 2.2);
				ctx.lineCap = 'round';
				ctx.strokeStyle = art.linear(ctx, -150, 0, 150, 0, [PINK, '#fff', GOLD]);
				ctx.lineWidth = 26 * (1 - k * 0.6);
				ctx.shadowColor = PINK;
				ctx.shadowBlur = 30;
				ctx.stroke();
				ctx.restore();
			});
		}
		for (const p of popups) {
			const k = p.life / 1.3;
			art.text(ctx, p.text, p.x, p.y - k * 70, { size: 60, font: 'Knewave', fill: p.color, outline: '#2a0a3a', outlineWidth: 6, alpha: Math.min(1, (1 - k) * 3) });
		}
	}

	function drawIntegrity(ctx, now) {
		const w = 760;
		const x = W + (W - w) / 2;
		const y = 122;
		const k = integrity / 100;
		const low = k < 0.35;
		art.roundRect(ctx, x - 8, y - 8, w + 16, 40, 20, { fill: 'rgba(12,4,26,0.8)', stroke: GOLD, lineWidth: 3 });
		art.roundRect(ctx, x, y, Math.max(0, w * k), 24, 12, { fill: low ? (Math.sin(now * 10) > 0 ? '#ff2050' : '#ff7a9a') : art.linear(ctx, x, 0, x + w, 0, [PINK, GOLD, '#fff2b0']) });
		// A gold hexagon badge at the left end.
		art.with(ctx, { x: x - 30, y: y + 12 }, () => {
			const pts = [];
			for (let i = 0; i < 6; i++) pts.push([Math.cos(i * TAU / 6) * 30, Math.sin(i * TAU / 6) * 30]);
			art.poly(ctx, pts, { fill: GOLD, stroke: '#fff2b0', lineWidth: 3, shadow: { color: GOLD, blur: 16 } });
		});
		// Small copies on the side walls, near the corners.
		for (const sx of [W - 420, 2 * W + 40]) {
			art.roundRect(ctx, sx, y + 4, 380, 18, 9, { fill: 'rgba(12,4,26,0.7)' });
			art.roundRect(ctx, sx + 2, y + 6, 376 * k, 14, 7, { fill: low ? '#ff2050' : GOLD });
		}
	}

	function drawMarks(ctx, now) {
		if (phase !== 'finale') return;
		for (const m of marks) {
			const col = m.held ? GOLD : '#fff';
			art.ellipse(ctx, m.x, FLOOR + 6, MARK_R, 26, { stroke: col, lineWidth: 6, fill: m.held ? 'rgba(255,207,63,0.35)' : 'rgba(255,255,255,0.12)', shadow: { color: col, blur: 20 } });
			art.text(ctx, '▼', m.x, FLOOR - 340 + Math.sin(now * 5) * 12, { size: 60, fill: col, shadow: { color: col, blur: 16 } });
		}
		if (hold > 0) {
			// Light climbing from the marks to the band as they hold.
			const k = Math.min(1, hold / HOLD);
			for (const m of marks) art.rect(ctx, m.x - 14, FLOOR - (FLOOR - BAND_Y) * k, 28, (FLOOR - BAND_Y) * k, { fill: GOLD, alpha: 0.5 });
		}
	}

	function drawHints(ctx, now) {
		// Early on, a tapping hand over side-wall demons.
		if (wave !== 0 || t > 90) return;
		for (const d of demons) {
			if (wallOf(d.x) === 1 || !(d.state === 'crawl' || d.state === 'claw') || d.x < 100 || d.x > WIDTH - 100) continue;
			const pulse = 1 + 0.12 * Math.sin(now * 8);
			const y = d.y - 200 * d.k.scale;
			const ripple = (now * 1.2) % 1;
			art.circle(ctx, d.x, y, 62 + ripple * 50, { stroke: '#fff', lineWidth: 5, fill: null, alpha: 1 - ripple });
			art.circle(ctx, d.x, y, 62 * pulse, { fill: 'rgba(255,79,168,0.9)', stroke: '#fff', lineWidth: 4, shadow: { color: PINK, blur: 20 } });
			art.text(ctx, 'TAP', d.x, y + 3, { size: 44, font: 'Knewave', fill: '#fff' });
		}
	}

	self.draw = function (ctx) {
		const now = performance.now() / 1000;
		if (!skyCanvas) { skyCanvas = buildSky(); cityCanvas = buildCity(); }
		ctx.save();
		if (shake > 0) ctx.translate((Math.random() - 0.5) * 24 * shake, (Math.random() - 0.5) * 24 * shake);
		ctx.drawImage(skyCanvas, 0, 0);
		drawBoss(ctx, now);
		ctx.drawImage(cityCanvas, 0, 0);
		if (flare > 0) {
			// The golden finale: light pouring out of the band over every wall.
			art.rect(ctx, 0, 0, WIDTH, H, { composite: 'lighter', fill: art.linear(ctx, 0, 0, 0, H, [[0, `rgba(255,120,200,${0.12 * flare})`], [BAND_Y / H, `rgba(255,205,80,${0.4 * flare})`], [1, `rgba(255,120,200,${0.1 * flare})`]]) });
			for (let i = 0; i < 24; i++) {
				const x = (i + 0.5) / 24 * WIDTH;
				const a = 0.12 * flare * (0.6 + 0.4 * Math.sin(now * 3 + i));
				art.poly(ctx, [[x - 30, BAND_Y], [x + 30, BAND_Y], [x + 160, 0], [x - 100, 0]], { composite: 'lighter', fill: `rgba(255,220,120,${a})` });
			}
		}
		if (phase !== 'finale') for (const c of cracks) drawCrackSpot(ctx, c, now);
		drawBand(ctx, now);
		for (const c of cracks) drawCrack(ctx, c, now);
		drawGates(ctx, now);
		drawStrikes(ctx);
		drawSlamMarks(ctx, now);
		for (const d of demons) drawDemon(ctx, d, now);
		drawMarks(ctx, now);
		for (const h of heroes) drawHero(ctx, h, now);
		drawParticles(ctx);
		drawEffects(ctx);
		if (heroes.length) drawIntegrity(ctx, now);
		drawHints(ctx, now);
		ctx.restore();
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		heroes.forEach(function (h, i) {
			const p = players[i];
			if (!p || p.px === undefined) return;
			h.tx = W + Math.max(0, Math.min(1, p.px)) * W;
			h.pz = Math.max(0, Math.min(1, 1 - p.pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	self.state = function () {
		return {
			phase, wave, t, integrity, sealed, slashed, pushed,
			cracks: cracks.map((c) => ({ id: c.id, x: c.x, wall: wallOf(c.x), size: c.size, progress: c.progress, singers: c.singers })),
			demons: demons.map((d) => ({ id: d.id, kind: d.kind, x: d.x, y: d.y, wall: wallOf(d.x), state: d.state, push: d.push })),
			boss: boss ? { x: boss.x, marks: boss.marks, dying: !!boss.dying } : null,
			marks: marks.map((m) => ({ x: m.x, held: m.held })),
			hold, flare,
			players: heroes.map((h) => ({ x: h.x, pz: h.pz, power: h.power, stamina: h.stamina, reach: h.reach, singing: h.sing > 0, sealed: h.sealed, slashed: h.slashed, pushed: h.pushed, pts: h.pts })),
			scores: heroes.map((h) => h.score),
		};
	};

	// For tests: pause spawning, and place cracks and demons by hand.
	self.debug = {
		calm(on) { calm = on !== false; },
		crack(x, size) { return openCrack(x, size === undefined ? 1 : size).id; },
		demon(x, kind) {
			const d = spawnDemon(kind || 'crawler', x, x < 2 * W - W / 2 ? 1 : -1);
			d.nextClaw = t + 99;
			if (wallOf(x) === 1) { d.state = 'claw'; d.clawUntil = t + 99; }
			return d.id;
		},
		clear() { cracks.length = 0; demons.length = 0; },
		finale() { hud.finiTimer(); wave = WAVES.length - 1; phase = 'live'; endWave(); },
		integrity(v) { integrity = v; },
	};

	self.fini = function () {
		stage.$el.off('click.honmoon');
		hud.fini();
		if (synth) synth.close();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
