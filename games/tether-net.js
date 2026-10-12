/*
 * Tether Net
 *
 * Fire drill! A box tower is burning on the left wall and its meeps leap
 * from the windows, arcing round the corner onto the front wall. The
 * players are firefighters on the front wall's street; neighbours hold a
 * stretchy net between them (a lone firefighter holds a little bounce pad)
 * and bounce the jumpers rightwards, hop after hop, onto the rescue cushion
 * by the ambulance on the right wall. A jumper who hits the street goes
 * "oof", sits dazed and waddles off. The net's slope steers a bounce, and a
 * quick step towards the wall lifts the arms and flicks the net for a big
 * one. From wave 2 burning debris falls too and singes holes in the nets;
 * tap it on the left wall to splash it out (tapping a jumper's window
 * splashes them too, which slows their leap). Three waves, each busier.
 * The headline is the team's saves; each player scores for the bounces
 * their net makes.
 *
 * Input: px (left / right along the front wall), pz (step towards the wall
 * to raise the net; a quick step is a flick), touches on the left wall.
 */
IGB.register('tether-net', function TetherNetGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const FLOOR = 910;          // the street, on every wall
	const G = 0.35;             // gravity, px per tick per tick
	const NET_Y = 790;          // roughly where nets are held: launches aim here
	const JUMPER_R = 45;        // a jumper's collision radius
	const JUMPER_SCALE = 0.42;
	const FF_SCALE = 0.6;       // the firefighters
	const ARM_OUT = 80;         // hands out to the side when holding a net (meep px)
	const LIFT = 80;            // how far the hands rise at the wall (meep px)
	const FLICK_LIFT = 70;      // and how much more during a flick
	const FLICK_DZ = 0.12;      // a pz drop this big within FLICK_WINDOW is a flick
	const FLICK_WINDOW = 12;    // ticks
	const FLICK_TIME = 0.4;     // seconds a flick lasts
	const MIN_SPAN = 40;        // closer than this, two players can't stretch a net
	const MAX_SPAN = 900;       // further than this, they let go
	const PAD = 200;            // a lone player's bounce pad width
	const RESTITUTION = 0.6;    // how much of the incoming speed a net gives back
	const BOOST = 3.5;          // plus this along the net's normal
	const MIN_UP = 11;          // every bounce leaves at least this fast upwards
	// Bounces are short hops (about a quarter of a wall), so a jumper has to be
	// passed along the line, net to net, to reach the cushion.
	const VX_KEEP = 0.1;        // a bounce keeps this much of the sideways speed
	const NUDGE = 4.6;          // and pushes this much further right
	const REACH = 60;           // a net also catches this far past each hand (over its holder's body)
	const HOP_UP = 15;          // and leaves no faster than this upwards (unless flicked)
	const FLICK_UP = 6;         // a flicked bounce: this much more up
	const FLICK_RIGHT = 2;      // and right: a flick throws about twice as far
	const MAX_VX = 7;
	const BURN_TIME = 4;        // seconds a scorched net stays holed
	const WAVE_SECONDS = 50;
	const WAVE_TIME = 1.1;      // seconds a jumper waves at the window first
	const WAVES = [
		// max jumpers at once, seconds between them, launch speed, landing
		// range on the front wall, chance of two at once, seconds between debris
		{ max: 1, gap: 4.2, vx: [9, 11], land: [1750, 2350], double: 0, debris: 0 },
		{ max: 2, gap: 3.2, vx: [10.5, 13], land: [1750, 2500], double: 0, debris: 5 },
		{ max: 3, gap: 2.6, vx: [12, 15], land: [1700, 2600], double: 0.35, debris: 3 },
	];
	const RESCUE_X = 3220;      // past here (just round the corner), landing is a rescue
	const CUSHION = { x: 3300, w: 760, top: 770 };
	const AMBULANCE = { x: 4130, w: 640, top: 560 };
	const DOOR_X = 4215;

	const BG = 'assets/shared/bg-cityscape.png';
	const PAJAMAS = ['#ff9ec7', '#8fe3c8', '#9cc8ff', '#ffd36e', '#c7a6ff', '#ffb38a'];

	const audio = stage.audio();
	audio.add('music', 'assets/shared/music-run.mp3', 0.15, true);
	audio.add('bounce', 'assets/shared/sfx-bounce.mp3', 0.35);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.35);
	audio.add('fall', 'assets/shared/sfx-fall.mp3', 0.3);
	audio.add('burn', 'assets/shared/sfx-explode.mp3', 0.2);
	audio.add('leap', 'assets/shared/sfx-woosh.mp3', 0.2);
	audio.add('appear', 'assets/shared/sfx-pickup.mp3', 0.2);
	audio.add('splash', 'assets/shared/sfx-correct.mp3', 0.25);
	IGB.preload && IGB.preload([BG]);

	const hud = new HUD('#ff6a2b');
	hud.$el.appendTo(stage.$ui);

	/* ---------- state ---------- */

	const meeps = [];           // the firefighters, by player number
	const ff = [];              // their tracking: { tx, pz, lz, hist, flickUntil }
	let surfaces = [];          // nets and pads this tick
	const dents = {};           // net key -> { t, amp, vel }: the springy flex
	const burns = {};           // net key -> time it heals
	const jumpers = [];
	const debris = [];
	const particles = [];
	const popups = [];
	const medics = [];
	let wave = -1;
	let isLive = false;
	let isOver = false;
	let t = 0;                  // game seconds
	let waveStart = 0;
	let nextSpawn = 0;
	let nextDebris = 0;
	let saved = 0;
	let oofs = 0;
	let bounces = 0;
	let cushionSquash = 0;
	let medicCheer = 0;

	/* ---------- the tower ---------- */

	// Three cardboard boxes stacked up the right side of the left wall, so
	// the jumpers' arcs cross the corner onto the front wall.
	const BOXES = [
		{ x: 560, y: 610, w: 780, h: 300 },
		{ x: 610, y: 340, w: 690, h: 270 },
		{ x: 680, y: 110, w: 560, h: 230 },
	];
	const WINDOW = { w: 150, h: 130 };
	const windows = [
		{ x: 830, y: 225 }, { x: 1100, y: 225 },
		{ x: 760, y: 470 }, { x: 1000, y: 470 }, { x: 1200, y: 470 },
		{ x: 980, y: 755 }, { x: 1220, y: 755 },
	].map((w) => Object.assign(w, { jumper: null, splash: 0 }));

	/* ---------- flow ---------- */

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			const m = new Meep(i);
			m.x = W + (i + 1) / (count + 1) * W;
			m.y = FLOOR;
			m.scale = FF_SCALE;
			m.body.color = '#2f3657';
			m.legs.color = '#2f3657';
			meeps.push(m);
			ff.push({ tx: m.x, pz: 0.5, lz: 0.5, hist: [], flickUntil: -1 });
		}
		for (const x of [3400, 3960]) {
			const m = new Meep(99);
			m.x = x;
			m.y = FLOOR;
			m.scale = 0.55;
			m.body.color = '#ffffff';
			medics.push(m);
		}
		hud.initPlayers(meeps);
		audio.play('music');
		hud.initBanner('Hold the net!');
		stage.timeout(hud.finiBanner, 2200);
		stage.timeout(() => startWave(0), 2800);
	}

	function startWave(n) {
		wave = n;
		hud.initRound(n, WAVES.length, `Wave ${n + 1}`);
		stage.timeout(hud.finiBanner, 1800);
		stage.timeout(function () {
			isLive = true;
			waveStart = t;
			nextSpawn = t + 0.3;
			nextDebris = t + 2;
			hud.initTimer(WAVE_SECONDS, endWave);
		}, 2400);
	}

	function endWave() {
		isLive = false;
		hud.finiTimer();
		// Let everyone already in the air come down first.
		const t0 = t;
		const wait = stage.interval(function () {
			const busy = jumpers.some((j) => j.state === 'wave' || j.state === 'fly');
			if (busy && t - t0 < 8) return;
			clearInterval(wait);
			if (wave < WAVES.length - 1) startWave(wave + 1);
			else finiGame();
		}, 250);
	}

	function finiGame() {
		isOver = true;
		hud.initBanner(`Team saved ${saved}!`);
		audio.play('cheer', true);
		stage.timeout(function () {
			hud.finiBanner();
			audio.stop('music');
			const scores = meeps.map((m) => m.score);
			const rewards = scoresToRewards(scores);
			hud.showFinalScores(scores, rewards);
			stage.timeout(() => IGB.complete(rewards), 5000);
		}, 2600);
	}

	/* ---------- spawning ---------- */

	const rand = (a, b) => a + Math.random() * (b - a);

	// Launch velocity from (x0, y0) that comes down through NET_Y at x = target,
	// leaving at roughly vx, never rising off the top of the wall.
	function aim(x0, y0, target, vx) {
		let tt = (target - x0) / vx;
		let vy = (NET_Y - y0 - 0.5 * G * tt * tt) / tt;
		const apex = y0 - vy * vy / (2 * G);
		if (vy < 0 && apex < 70) {
			vy = -Math.sqrt(2 * G * (y0 - 70));
			tt = (-vy + Math.sqrt(vy * vy + 2 * G * (NET_Y - y0))) / G;
			vx = (target - x0) / tt;
		}
		return { vx, vy };
	}

	function spawnJumper() {
		const free = windows.filter((w) => !w.jumper);
		if (!free.length) return false;
		const win = free[Math.floor(Math.random() * free.length)];
		const P = WAVES[wave];
		const m = new Meep(99);
		const pj = PAJAMAS[Math.floor(Math.random() * PAJAMAS.length)];
		m.body.color = pj;
		m.legs.color = pj;
		m.shadow.visible = false;
		const j = {
			meep: m, pj, win, state: 'wave', t0: t,
			x: win.x, y: win.y + 10, spin: 0, spinRate: 0,
			alpha: 1, squash: 1, bounces: 0, lastKey: null, lastHolders: [],
			doused: false, cool: 0, stateT: 0, dir: -1,
		};
		Object.assign(j, aim(j.x, j.y, rand(P.land[0], P.land[1]), rand(P.vx[0], P.vx[1])));
		win.jumper = j;
		jumpers.push(j);
		audio.play('appear', true);
		return true;
	}

	function spawnDebris() {
		const P = WAVES[wave];
		const top = Math.random() < 0.5;
		const x0 = top ? rand(760, 1180) : rand(1250, 1300);
		const y0 = top ? 100 : rand(380, 560);
		const d = { x: x0, y: y0, spin: rand(0, 360), spinRate: rand(-8, 8), size: rand(38, 52), shape: Math.random() };
		Object.assign(d, aim(x0, y0, rand(1700, 3000), rand(P.vx[0] - 1, P.vx[1] - 1)));
		debris.push(d);
	}

	/* ---------- the nets ---------- */

	function isFlicking(n) {
		return ff[n] && t < ff[n].flickUntil;
	}

	// Where player n's hands are in the world: side 'left', 'right' (held out
	// to a net) or 'pad' (both in front).
	function handLocal(n, side) {
		const lift = (1 - ff[n].lz) * LIFT + (isFlicking(n) ? FLICK_LIFT : 0);
		const y = 210 - lift;
		if (side === 'left') return { x: -ARM_OUT, y };
		if (side === 'right') return { x: ARM_OUT, y };
		return { x: 0, y: y + 10 };
	}

	function toWorld(m, p) {
		return { x: m.x + p.x * m.scale, y: m.y + (-m.h + p.y) * m.scale };
	}

	function buildSurfaces() {
		const order = meeps.map((m, i) => i).sort((a, b) => meeps[a].x - meeps[b].x);
		const held = meeps.map(() => ({ left: false, right: false }));
		const list = [];
		for (let i = 0; i < order.length - 1; i++) {
			const a = order[i];
			const b = order[i + 1];
			const A = toWorld(meeps[a], handLocal(a, 'right'));
			const B = toWorld(meeps[b], handLocal(b, 'left'));
			const span = B.x - A.x;
			if (span < MIN_SPAN || span > MAX_SPAN) continue;
			held[a].right = true;
			held[b].left = true;
			const key = Math.min(a, b) + '-' + Math.max(a, b);
			list.push({ key, kind: 'net', holders: [a, b], A, B, sag: Math.max(14, Math.min(60, span * 0.07)) });
		}
		meeps.forEach(function (m, n) {
			const h = held[n];
			// Arms: out to each net held, otherwise relaxed (or round a pad).
			const lone = !h.left && !h.right;
			const L = h.left ? handLocal(n, 'left') : lone ? { x: -PAD * 0.42 / FF_SCALE, y: handLocal(n, 'pad').y } : { x: -60, y: 225 };
			const R = h.right ? handLocal(n, 'right') : lone ? { x: PAD * 0.42 / FF_SCALE, y: handLocal(n, 'pad').y } : { x: 60, y: 225 };
			m.handLeft.x = L.x; m.handLeft.y = L.y;
			m.handRight.x = R.x; m.handRight.y = R.y;
			if (lone) {
				const c = toWorld(m, handLocal(n, 'pad'));
				list.push({ key: 'pad-' + n, kind: 'pad', holders: [n], A: { x: c.x - PAD / 2, y: c.y }, B: { x: c.x + PAD / 2, y: c.y }, sag: 6 });
			}
		});
		for (const s of list) {
			s.burnt = burns[s.key] > t;
			s.flick = s.holders.some(isFlicking);
			if (!dents[s.key]) dents[s.key] = { t: 0.5, amp: 0, vel: 0 };
		}
		surfaces = list;
	}

	// The net's resting height at x, or null off its ends.
	function surfaceY(s, x) {
		if (x < s.A.x - REACH || x > s.B.x + REACH) return null;
		const u = Math.max(0, Math.min(1, (x - s.A.x) / (s.B.x - s.A.x)));
		return s.A.y + (s.B.y - s.A.y) * u + s.sag * 4 * u * (1 - u);
	}

	// Bounce j off s: reflect off the chord's normal, so a sloped net steers.
	function bounce(j, s, x) {
		const dx = s.B.x - s.A.x;
		const dy = s.B.y - s.A.y;
		const len = Math.hypot(dx, dy);
		const nx = dy / len;
		const ny = -dx / len;
		const vn = j.vx * nx + j.vy * ny;
		if (vn < 0) {
			j.vx -= (1 + RESTITUTION) * vn * nx;
			j.vy -= (1 + RESTITUTION) * vn * ny;
		}
		j.vx = j.vx * VX_KEEP + BOOST * nx + NUDGE;
		j.vy += BOOST * ny;
		if (j.vy > -MIN_UP) j.vy = -MIN_UP;
		if (j.vy < -HOP_UP) j.vy = -HOP_UP;
		if (s.flick) {
			j.vy -= FLICK_UP;
			j.vx += FLICK_RIGHT;
			sparkle(x, j.y + JUMPER_R, '#fff3a0', 14);
		}
		j.vx = Math.max(-6, Math.min(MAX_VX, j.vx));
		j.vy = Math.max(-24, j.vy);
		j.spinRate = (j.vx > 0 ? 1 : -1) * rand(6, 11);
		j.squash = 0.6;
		j.bounces++;
		bounces++;

		const dent = dents[s.key];
		dent.t = Math.max(0, Math.min(1, (x - s.A.x) / (s.B.x - s.A.x)));
		dent.vel = s.flick ? 14 : 9;

		// Each new net a jumper touches credits whoever is holding it.
		if (j.lastKey !== s.key) {
			for (const n of s.holders) {
				meeps[n].score++;
				meeps[n].doScore(1);
			}
		}
		j.lastKey = s.key;
		j.lastHolders = s.holders.slice();
		audio.play('bounce', true, rand(0.9, 1.2));
	}

	/* ---------- every tick ---------- */

	function step() {
		t += 1 / FPS;
		if (!meeps.length) return;

		meeps.forEach(function (m, n) {
			const f = ff[n];
			m.x += (f.tx - m.x) * 0.35;
			f.lz += (f.pz - f.lz) * 0.3;
			f.hist.push(f.pz);
			if (f.hist.length > FLICK_WINDOW) f.hist.shift();
			if (f.hist[0] - f.pz > FLICK_DZ && t > f.flickUntil + 0.3) {
				f.flickUntil = t + FLICK_TIME;
				f.hist.length = 0;
			}
		});
		buildSurfaces();

		if (isLive) {
			const P = WAVES[wave];
			const active = jumpers.filter((j) => j.state === 'wave' || j.state === 'fly').length;
			if (t >= nextSpawn && active < P.max) {
				spawnJumper();
				if (Math.random() < P.double) spawnJumper();
				nextSpawn = t + P.gap * rand(0.8, 1.2);
			}
			if (P.debris && t >= nextDebris) {
				spawnDebris();
				nextDebris = t + P.debris * rand(0.7, 1.3);
			}
		}

		for (const j of jumpers) stepJumper(j);
		for (let i = jumpers.length - 1; i >= 0; i--) if (jumpers[i].dead) jumpers.splice(i, 1);

		for (const d of debris) stepDebris(d);
		for (let i = debris.length - 1; i >= 0; i--) if (debris[i].dead) debris.splice(i, 1);

		for (const key in dents) {
			const d = dents[key];
			d.vel += -0.18 * d.amp - 0.12 * d.vel;
			d.amp += d.vel;
		}

		// Embers drift up off the tower.
		if (Math.random() < 0.5) {
			particles.push({ kind: 'ember', x: rand(700, 1220), y: rand(80, 140), vx: rand(-0.5, 1.5), vy: rand(-3, -1.5), life: 0, max: rand(40, 90), size: rand(3, 7), color: Math.random() < 0.5 ? '#ffd23f' : '#ff7a2b' });
		}
		for (const p of particles) {
			p.life++;
			p.x += p.vx;
			p.y += p.vy;
			if (p.kind === 'drop' || p.kind === 'confetti') p.vy += p.kind === 'drop' ? 0.4 : 0.15;
			if (p.kind === 'smoke') { p.size += 0.6; p.vx *= 0.97; }
		}
		for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life > particles[i].max) particles.splice(i, 1);
		for (const p of popups) p.life++;
		for (let i = popups.length - 1; i >= 0; i--) if (popups[i].life > 60) popups.splice(i, 1);
		for (const w of windows) w.splash = Math.max(0, w.splash - 1 / 25);

		cushionSquash *= 0.85;
		medicCheer = Math.max(0, medicCheer - 1 / FPS);

		hud.updatePlayers(meeps);
	}

	function stepJumper(j) {
		const m = j.meep;
		j.squash += (1 - j.squash) * 0.2;
		if (j.state === 'wave') {
			if (t - j.t0 >= WAVE_TIME) {
				j.state = 'fly';
				j.win.jumper = null;
				j.spinRate = rand(2, 5);
				audio.play('leap', true);
			}
			return;
		}
		if (j.state === 'fly') {
			const px = j.x;
			const py = j.y;
			j.vy += G;
			j.x += j.vx;
			j.y += j.vy;
			j.spin += j.spinRate;
			j.cool = Math.max(0, j.cool - 1);
			if (j.x > IGB.WIDTH - 40) { j.x = IGB.WIDTH - 40; j.vx = -Math.abs(j.vx) * 0.5; }

			if (j.vy > 0 && !j.cool) {
				for (const s of surfaces) {
					if (s.burnt) continue;
					const y0 = surfaceY(s, px);
					const y1 = surfaceY(s, j.x);
					if (y1 === null || y0 === null) continue;
					if (py + JUMPER_R <= y0 + 4 && j.y + JUMPER_R >= y1) {
						j.y = y1 - JUMPER_R;
						bounce(j, s, j.x);
						j.cool = 6;
						break;
					}
				}
			}

			const ground = j.x >= CUSHION.x && j.x <= CUSHION.x + CUSHION.w ? CUSHION.top : FLOOR;
			if (j.y + JUMPER_R >= ground) {
				if (j.x >= RESCUE_X) rescue(j);
				else oof(j);
			}
			return;
		}
		if (j.state === 'oof') {
			j.stateT += 1 / FPS;
			if (j.stateT > 1.6) {
				j.x += j.dir * 2.2;
				j.alpha = Math.max(0, 1 - (j.stateT - 1.6) / 1.8);
				if (j.alpha <= 0) j.dead = true;
			}
			m.handLeft.y = 230;
			m.handRight.y = 230;
		}
	}

	function rescue(j) {
		j.state = 'saved';
		j.spin = 0;
		saved++;
		cushionSquash = 1;
		medicCheer = 1.2;
		const m = j.meep;
		m.toIdle();
		Object.assign(m.handLeft, { x: -70, y: 40 });
		Object.assign(m.handRight, { x: 70, y: 40 });
		for (const n of j.lastHolders) {
			meeps[n].score++;
			meeps[n].doScore(1);
		}
		confetti(j.x, j.y);
		popups.push({ text: 'SAVED!', x: j.x, y: j.y - 120, life: 0, color: '#7dffb0' });
		audio.play('cheer', true);
		const top = j.x <= CUSHION.x + CUSHION.w ? CUSHION.top : FLOOR;
		j.y = top - JUMPER_R;
		$(j).animate({ y: j.y - 110 }, 260).animate({ y: top - JUMPER_R }, 220)
			.animate({ x: DOOR_X, y: FLOOR - 80 }, 700)
			.animate({ alpha: 0 }, 250, function () { j.dead = true; });
	}

	function oof(j) {
		j.state = 'oof';
		j.stateT = 0;
		j.y = FLOOR - JUMPER_R;
		j.spin = 0;
		j.squash = 0.5;
		j.dir = j.x < 2400 ? -1 : 1;
		oofs++;
		const m = j.meep;
		m.toIdle();
		m.shadow.visible = true;
		popups.push({ text: 'OOF!', x: j.x, y: j.y - 110, life: 0, color: '#ffd0d0' });
		for (let i = 0; i < 8; i++) {
			particles.push({ kind: 'smoke', x: j.x + rand(-40, 40), y: FLOOR - 10, vx: rand(-2, 2), vy: rand(-1.2, -0.3), life: 0, max: 40, size: rand(14, 24), color: 'rgba(220,220,235,0.6)' });
		}
		audio.play('fall', true);
	}

	function stepDebris(d) {
		const px = d.x;
		const py = d.y;
		d.vy += G;
		d.x += d.vx;
		d.y += d.vy;
		d.spin += d.spinRate;
		if (Math.random() < 0.6) {
			particles.push({ kind: 'smoke', x: d.x, y: d.y, vx: rand(-0.5, 0.5), vy: rand(-1.5, -0.5), life: 0, max: 30, size: rand(8, 14), color: 'rgba(80,70,90,0.35)' });
		}
		if (d.vy > 0) {
			for (const s of surfaces) {
				if (s.burnt) continue;
				const y0 = surfaceY(s, px);
				const y1 = surfaceY(s, d.x);
				if (y0 === null || y1 === null) continue;
				if (py <= y0 + 4 && d.y >= y1) {
					burns[s.key] = t + BURN_TIME;
					s.burnt = true;
					dents[s.key].vel = 6;
					d.dead = true;
					sparkle(d.x, y1, '#ff9a2b', 20);
					popups.push({ text: 'SCORCH!', x: d.x, y: y1 - 90, life: 0, color: '#ffb36b' });
					audio.play('burn', true);
					return;
				}
			}
		}
		if (d.y >= FLOOR - 10) {
			d.dead = true;
			for (let i = 0; i < 6; i++) particles.push({ kind: 'smoke', x: d.x + rand(-30, 30), y: FLOOR - 10, vx: rand(-1, 1), vy: rand(-1.5, -0.5), life: 0, max: 45, size: rand(12, 20), color: 'rgba(70,60,80,0.45)' });
			sparkle(d.x, FLOOR - 10, '#ff9a2b', 8);
		}
	}

	function sparkle(x, y, color, n) {
		for (let i = 0; i < n; i++) {
			const a = rand(0, TAU);
			const v = rand(2, 7);
			particles.push({ kind: 'ember', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 0, max: rand(20, 35), size: rand(3, 7), color });
		}
	}

	function confetti(x, y) {
		for (let i = 0; i < 26; i++) {
			particles.push({ kind: 'confetti', x, y, vx: rand(-7, 7), vy: rand(-12, -4), life: 0, max: rand(40, 70), size: rand(8, 14), color: PAJAMAS[i % PAJAMAS.length], spin: rand(0, 6) });
		}
	}

	function splash(x, y) {
		for (let i = 0; i < 22; i++) {
			const a = rand(-Math.PI, 0);
			const v = rand(3, 10);
			particles.push({ kind: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(25, 45), size: rand(5, 10), color: Math.random() < 0.5 ? '#7fd3ff' : '#d4f1ff' });
		}
		particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0, max: 22, size: 30, color: '#bfe9ff' });
	}

	/* ---------- touch: splash the left wall ---------- */

	function touch(p) {
		if (p.x >= W || isOver) return;
		splash(p.x, p.y);
		for (const d of debris) {
			if (Math.hypot(d.x - p.x, d.y - p.y) < 110 && d.x < W) {
				d.dead = true;
				for (let i = 0; i < 6; i++) particles.push({ kind: 'smoke', x: d.x, y: d.y, vx: rand(-1, 1), vy: rand(-2, -0.5), life: 0, max: 40, size: rand(12, 22), color: 'rgba(235,240,250,0.7)' });
				popups.push({ text: 'SPLASH!', x: d.x, y: d.y - 70, life: 0, color: '#bfe9ff' });
				audio.play('splash', true);
				return;
			}
		}
		for (const w of windows) {
			const j = w.jumper;
			if (j && !j.doused && Math.abs(p.x - w.x) < WINDOW.w / 2 + 30 && Math.abs(p.y - w.y) < WINDOW.h / 2 + 30) {
				j.doused = true;
				j.vx *= 0.72;
				w.splash = 1;
				popups.push({ text: 'Easy now!', x: w.x, y: w.y - 110, life: 0, color: '#bfe9ff' });
				audio.play('splash', true);
				return;
			}
		}
	}

	stage.$el.on('click.tether', (e) => touch(IGB.toWorld(e)));

	/* ---------- drawing ---------- */

	function drawBackground(ctx, now) {
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: '#2b2f4a' });
		art.cover(ctx, BG, 0, 0, IGB.WIDTH, H, 0.5, 0.2);
		// Dusk over the city, warmer by the fire.
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, ['rgba(30,20,66,0.7)', 'rgba(48,34,86,0.5)', 'rgba(90,50,80,0.45)']) });
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: 'rgba(24,18,52,0.2)' });
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 2400, 0, ['rgba(255,110,40,0.35)', 'rgba(255,110,40,0)']) });
		const flicker = 0.85 + 0.15 * Math.sin(now * 9) * Math.sin(now * 5.3);
		art.circle(ctx, 950, 380, 900, { fill: art.radial(ctx, 950, 380, 50, 900, ['rgba(255,150,60,0.45)', 'rgba(255,120,40,0)']), alpha: flicker });
	}

	function drawStreet(ctx) {
		art.rect(ctx, 0, FLOOR, IGB.WIDTH, H - FLOOR, { fill: '#3e4060' });
		art.rect(ctx, 0, FLOOR, IGB.WIDTH, 16, { fill: '#8b88a8' });
		art.rect(ctx, 0, FLOOR + 16, IGB.WIDTH, 6, { fill: 'rgba(0,0,0,0.25)' });
		for (let x = 40; x < IGB.WIDTH; x += 180) art.roundRect(ctx, x, FLOOR + 52, 90, 10, 5, { fill: 'rgba(255,214,90,0.55)' });
		// The firefighters' patch of street, faintly marked.
		art.rect(ctx, W, FLOOR + 22, W, H - FLOOR - 22, { fill: 'rgba(255,106,43,0.08)' });
	}

	function flamePath(ctx, w, h, sway) {
		const r = w / 2;
		ctx.beginPath();
		ctx.moveTo(sway, -h);
		ctx.quadraticCurveTo(r * 0.9 + sway * 0.4, -h * 0.5, r, -r);
		ctx.arc(0, -r, r, 0, Math.PI, false);
		ctx.quadraticCurveTo(-r * 0.9 + sway * 0.4, -h * 0.5, sway, -h);
		ctx.closePath();
	}

	// A flame with its base at (x, y), w wide and h tall, flickering with now.
	function drawFlame(ctx, x, y, w, h, now, seed = 0) {
		const f = 1 + 0.12 * Math.sin(now * 11 + seed * 3.1) + 0.08 * Math.sin(now * 17 + seed);
		const sway = 12 * Math.sin(now * 6 + seed * 2);
		const layers = [['#ff4b2b', 1], ['#ff9a2b', 0.72], ['#ffe066', 0.45]];
		art.with(ctx, { x, y }, function () {
			for (const [color, k] of layers) {
				flamePath(ctx, w * k, h * k * f, sway * k);
				ctx.fillStyle = color;
				ctx.fill();
			}
		});
	}

	function drawTower(ctx, now) {
		// Smoke rolling up off the top.
		for (let i = 0; i < 9; i++) {
			const k = ((now * 0.12 + i / 9) % 1);
			const x = 960 + Math.sin(i * 2.3 + now * 0.4) * 120 + k * 220;
			const y = 90 - k * 260;
			art.circle(ctx, x, y, 60 + k * 120, { fill: 'rgba(70,62,90,0.5)', alpha: 1 - k });
		}
		// The boxes, bottom up, each with a darker side for depth.
		for (const b of BOXES) {
			art.poly(ctx, [[b.x + b.w, b.y], [b.x + b.w + 40, b.y - 25], [b.x + b.w + 40, b.y + b.h - 25], [b.x + b.w, b.y + b.h]], { fill: '#9a6535' });
			art.poly(ctx, [[b.x, b.y], [b.x + 40, b.y - 25], [b.x + b.w + 40, b.y - 25], [b.x + b.w, b.y]], { fill: '#e0ab70' });
			art.rect(ctx, b.x, b.y, b.w, b.h, { fill: art.linear(ctx, 0, b.y, 0, b.y + b.h, ['#cf9659', '#b97e45']), shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 8 } });
			art.rect(ctx, b.x + b.w / 2 - 30, b.y, 60, b.h, { fill: 'rgba(240,210,160,0.45)' });
			art.rect(ctx, b.x, b.y, b.w, 8, { fill: 'rgba(255,230,190,0.35)' });
		}
		// A "this way up" stamp and a fragile label, Box Party style.
		art.text(ctx, '⇧⇧', 640, 680, { size: 50, fill: 'rgba(90,50,20,0.45)' });
		art.text(ctx, 'FRAGILE', 720, 860, { size: 40, font: 'Paytone One', fill: 'rgba(170,40,30,0.55)' });

		for (const w of windows) drawWindow(ctx, w, now);

		// Flames on the roof and licking out of a couple of empty windows.
		const roof = BOXES[2];
		for (let i = 0; i < 6; i++) drawFlame(ctx, roof.x + 50 + i * 95, roof.y + 10, 120, 170 + (i % 3) * 40, now, i);
		drawFlame(ctx, BOXES[1].x + 20, BOXES[1].y + 20, 80, 110, now, 7);
		drawFlame(ctx, BOXES[0].x + 60, BOXES[0].y + 25, 90, 120, now, 9);
	}

	function drawWindow(ctx, w, now) {
		const x = w.x - WINDOW.w / 2;
		const y = w.y - WINDOW.h / 2;
		const j = w.jumper;
		art.circle(ctx, w.x, y + 10, 110, { fill: art.radial(ctx, w.x, y + 10, 10, 110, ['rgba(40,20,10,0.35)', 'rgba(40,20,10,0)']) });
		art.roundRect(ctx, x - 10, y - 10, WINDOW.w + 20, WINDOW.h + 20, 14, { fill: '#f5e6c8' });
		art.roundRect(ctx, x, y, WINDOW.w, WINDOW.h, 8, { fill: art.radial(ctx, w.x, w.y + 30, 10, 110, [j ? '#ffcf7a' : '#ffb347', '#d0482a', '#5a1e14']) });
		if (j) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(x, y, WINDOW.w, WINDOW.h);
			ctx.clip();
			const m = j.meep;
			const wv = Math.sin((t - j.t0) * 14);
			m.handLeft.x = -60; m.handLeft.y = 150;
			m.handRight.x = 85 + wv * 10; m.handRight.y = 40 + wv * 25;
			art.with(ctx, { x: w.x, y: y + WINDOW.h + 70, scale: JUMPER_SCALE * 1.15 }, () => m.drawLocal(ctx));
			drawNightcap(ctx, w.x, y + WINDOW.h + 70, JUMPER_SCALE * 1.15, 0);
			ctx.restore();
			// "Help!" bubble, and a ring that fills while they get ready.
			const k = Math.min(1, (t - j.t0) / WAVE_TIME);
			art.roundRect(ctx, w.x - 60, y - 70, 120, 50, 25, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.3)', blur: 8, y: 4 } });
			art.text(ctx, j.doused ? 'phew' : 'HELP!', w.x, y - 45, { size: 30, font: 'Paytone One', fill: j.doused ? '#2a8ad4' : '#e8443a' });
			ctx.save();
			ctx.beginPath();
			ctx.arc(w.x + 75, y - 45, 16, -Math.PI / 2, -Math.PI / 2 + k * TAU);
			ctx.strokeStyle = '#ffdd55';
			ctx.lineWidth = 7;
			ctx.stroke();
			ctx.restore();
		}
		// Window bars and sill.
		art.rect(ctx, w.x - 3, y, 6, WINDOW.h, { fill: 'rgba(245,230,200,0.9)' });
		art.roundRect(ctx, x - 20, y + WINDOW.h + 4, WINDOW.w + 40, 16, 6, { fill: '#e9d3a8' });
		if (w.splash > 0) art.roundRect(ctx, x, y, WINDOW.w, WINDOW.h, 8, { fill: 'rgba(150,215,255,0.6)', alpha: w.splash });
	}

	// The dotted path a waving jumper is about to take, as far as the corner.
	function drawPreview(ctx, j) {
		const k = Math.min(1, (t - j.t0) / WAVE_TIME);
		let x = j.x;
		let y = j.y;
		let vx = j.vx;
		let vy = j.vy;
		ctx.save();
		ctx.fillStyle = 'white';
		for (let i = 0; i < 200 && x < W + 120; i++) {
			vy += G;
			x += vx;
			y += vy;
			if (i % 4 === 0 && x > j.x + 90) {
				ctx.globalAlpha = 0.25 + 0.5 * k;
				ctx.beginPath();
				ctx.arc(x, y, 7, 0, TAU);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	function drawNightcap(ctx, x, y, scale, rotate) {
		art.with(ctx, { x, y, scale, rotate }, function () {
			art.with(ctx, { y: -350 }, function () {
				ctx.beginPath();
				ctx.moveTo(-54, 52);
				ctx.quadraticCurveTo(-40, -30, 30, -45);
				ctx.quadraticCurveTo(90, -50, 105, 10);
				ctx.quadraticCurveTo(60, -10, 54, 52);
				ctx.closePath();
				ctx.fillStyle = '#5b6bd6';
				ctx.fill();
				art.roundRect(ctx, -56, 34, 112, 24, 12, { fill: '#ffffff' });
				art.circle(ctx, 106, 14, 16, { fill: '#ffffff' });
			});
		});
	}

	function drawJumper(ctx, j, now) {
		const m = j.meep;
		if (j.state === 'fly') {
			// Hands up, wheee; star-shaped after a bounce.
			const star = j.bounces > 0;
			Object.assign(m.handLeft, star ? { x: -115, y: 150 } : { x: -60, y: 30 });
			Object.assign(m.handRight, star ? { x: 115, y: 150 } : { x: 60, y: 30 });
		}
		const sc = JUMPER_SCALE;
		const sy = j.squash;
		const sx = 1 + (1 - j.squash) * 0.6;
		ctx.save();
		ctx.globalAlpha *= j.alpha;
		if (j.state === 'fly') {
			art.with(ctx, { x: j.x, y: j.y, rotate: j.spin }, function () {
				art.with(ctx, { y: 175 * sc, scaleX: sc * sx, scaleY: sc * sy }, () => m.drawLocal(ctx));
				drawNightcap(ctx, 0, 175 * sc, sc, 0);
			});
		} else {
			const bob = j.state === 'oof' && j.stateT > 1.6 ? Math.sin(j.stateT * 14) * 6 : 0;
			const fy = j.y + JUMPER_R;
			art.with(ctx, { x: j.x, y: fy, rotate: bob, scaleX: sc * sx, scaleY: sc * sy }, () => m.drawLocal(ctx));
			drawNightcap(ctx, j.x, fy, sc, bob);
			if (j.state === 'oof' && j.stateT < 2.4) {
				// Dazed stars circling the head.
				const hy = fy - 300 * sc;
				for (let i = 0; i < 3; i++) {
					const a = now * 5 + i * TAU / 3;
					art.text(ctx, '★', j.x + Math.cos(a) * 55, hy + Math.sin(a) * 14, { size: 30, fill: '#ffe066', outline: '#a06a00', outlineWidth: 2 });
				}
			}
		}
		ctx.restore();
	}

	function drawDebris(ctx, d, now) {
		art.with(ctx, { x: d.x, y: d.y }, function () {
			drawFlame(ctx, 0, 6, d.size * 1.1, d.size * 2, now, d.shape * 10);
			art.with(ctx, { rotate: d.spin }, function () {
				const s = d.size;
				art.poly(ctx, [[-s * 0.6, -s * 0.4], [s * 0.5, -s * 0.55], [s * 0.6, s * 0.35], [-s * 0.3, s * 0.55]], { fill: '#8a5a32', stroke: '#3b2414', lineWidth: 4 });
				art.rect(ctx, -s * 0.1, -s * 0.5, s * 0.2, s, { fill: 'rgba(240,210,160,0.5)' });
			});
		});
		// A target ring while it's still splashable.
		if (d.x < W) art.circle(ctx, d.x, d.y, 70, { stroke: 'rgba(191,233,255,0.7)', lineWidth: 4, dash: [10, 10] });
	}

	// The net between two firefighters, or a lone firefighter's pad.
	function drawSurface(ctx, s, now) {
		const dent = dents[s.key];
		if (s.kind === 'pad') {
			const cx = (s.A.x + s.B.x) / 2;
			const cy = s.A.y + Math.max(-20, Math.min(30, dent.amp));
			const rx = PAD / 2;
			art.ellipse(ctx, cx, cy + 6, rx, 22, { fill: '#a8231c' });
			art.ellipse(ctx, cx, cy, rx, 22, { fill: s.burnt ? '#3a2a2a' : '#e8443a', shadow: { color: 'rgba(0,0,0,0.3)', blur: 10, y: 6 } });
			art.ellipse(ctx, cx, cy, rx - 16, 13, { fill: s.burnt ? '#1c1414' : art.radial(ctx, cx, cy, 2, rx, ['#fff6c0', '#ffcf3f', '#ff9a2b']) });
			if (!s.burnt) art.ellipse(ctx, cx, cy, 22, 6, { fill: '#e8443a' });
			if (s.flick) art.ellipse(ctx, cx, cy, rx + 10, 30, { stroke: 'rgba(255,240,150,0.9)', lineWidth: 5 });
			if (s.burnt) drawFlame(ctx, cx, cy, 40, 60, now, 3);
			return;
		}
		const N = 24;
		const top = [];
		const bot = [];
		for (let i = 0; i <= N; i++) {
			const u = i / N;
			const x = s.A.x + (s.B.x - s.A.x) * u;
			const pin = Math.sin(Math.PI * u);
			const d = Math.max(-40, Math.min(70, dent.amp)) * Math.exp(-Math.pow((u - dent.t) / 0.22, 2)) * pin;
			const y = s.A.y + (s.B.y - s.A.y) * u + s.sag * 4 * u * (1 - u) + d;
			top.push([x, y]);
			bot.push([x, y + 34 * pin + 5]);
		}
		const gap = (i) => s.burnt && i / N > 0.36 && i / N < 0.64;
		// The fabric, in pieces either side of any burnt hole.
		let run = [];
		const runs = [];
		for (let i = 0; i <= N; i++) {
			if (gap(i)) { if (run.length) runs.push(run); run = []; } else run.push(i);
		}
		if (run.length) runs.push(run);
		for (const r of runs) {
			if (r.length < 2) continue;
			const pts = r.map((i) => top[i]).concat(r.slice().reverse().map((i) => bot[i]));
			art.poly(ctx, pts, { fill: art.linear(ctx, 0, s.A.y - 20, 0, s.A.y + 60, ['#ffe066', '#ff9a2b']), shadow: { color: 'rgba(0,0,0,0.3)', blur: 12, y: 8 } });
			// Mesh and stripes.
			ctx.save();
			ctx.strokeStyle = 'rgba(200,70,30,0.45)';
			ctx.lineWidth = 3;
			ctx.beginPath();
			for (let k = 0; k < r.length - 1; k++) {
				const a = r[k];
				const b = r[k + 1];
				ctx.moveTo(top[a][0], top[a][1]); ctx.lineTo(bot[b][0], bot[b][1]);
				ctx.moveTo(bot[a][0], bot[a][1]); ctx.lineTo(top[b][0], top[b][1]);
			}
			ctx.stroke();
			ctx.restore();
			art.line(ctx, r.map((i) => bot[i]), { stroke: '#c0392b', lineWidth: 6 });
			art.line(ctx, r.map((i) => top[i]), { stroke: s.flick ? '#fff6a0' : '#e8443a', lineWidth: s.flick ? 12 : 9 });
			art.line(ctx, r.map((i) => top[i]), { stroke: 'rgba(255,255,255,0.6)', lineWidth: 3, dash: [14, 18] });
		}
		if (s.burnt) {
			const i0 = Math.round(N * 0.36);
			const i1 = Math.round(N * 0.64);
			for (const i of [i0, i1]) art.circle(ctx, top[i][0], top[i][1] + 12, 14, { fill: '#2a1a14' });
			const mid = top[Math.round(N / 2)];
			drawFlame(ctx, top[i0][0] + 10, top[i0][1] + 14, 34, 50, now, 1);
			drawFlame(ctx, top[i1][0] - 10, top[i1][1] + 14, 34, 50, now, 2);
			const left = Math.max(0, burns[s.key] - t);
			art.text(ctx, Math.ceil(left), mid[0], mid[1] + 10, { size: 36, font: 'Paytone One', fill: '#ffd0a0', outline: '#3a1a10', outlineWidth: 4 });
		}
	}

	// A fire helmet in the player's colour, over the meep's head.
	function drawHelmet(ctx, m) {
		art.with(ctx, { x: m.x, y: m.y, scale: m.scale }, function () {
			art.with(ctx, { y: -m.h }, function () {
				const color = PLAYER_COLORS[m.n];
				ctx.beginPath();
				ctx.moveTo(-56, 52);
				ctx.bezierCurveTo(-60, -22, 60, -22, 56, 52);
				ctx.closePath();
				ctx.fillStyle = color;
				ctx.fill();
				art.ellipse(ctx, 0, 52, 76, 13, { fill: color, shadow: { color: 'rgba(0,0,0,0.3)', blur: 6, y: 4 } });
				art.ellipse(ctx, -20, 6, 14, 22, { fill: 'rgba(255,255,255,0.35)' });
				art.roundRect(ctx, -17, 6, 34, 36, [6, 6, 17, 17], { fill: '#ffd23f', stroke: '#b8860b', lineWidth: 3 });
			});
			// A reflective stripe across the coat.
			art.rect(ctx, -30, -m.h + 185, 60, 9, { fill: '#e6ff5a' });
		});
	}

	function drawRightWall(ctx, now) {
		// The scoreboard: the team's saves.
		const bx = 3650;
		const by = 70;
		art.roundRect(ctx, bx, by, 700, 250, 36, { fill: 'rgba(25,22,48,0.85)', stroke: '#ff6a2b', lineWidth: 8, shadow: { color: 'rgba(0,0,0,0.4)', blur: 20, y: 10 } });
		art.text(ctx, 'SAVED', bx + 200, by + 125, { size: 80, font: 'Knewave', fill: '#ffffff' });
		const pop = 1 + medicCheer * 0.15;
		art.text(ctx, saved, bx + 520, by + 130, { size: 150 * pop, font: 'Knewave', fill: '#7dffb0', outline: '#1d6b45', outlineWidth: 6 });
		if (wave >= 0) art.text(ctx, `wave ${wave + 1} of ${WAVES.length}`, bx + 350, by + 215, { size: 34, fill: 'rgba(255,255,255,0.7)' });
		art.text(ctx, '→', 3420, 520, { size: 150, font: 'Knewave', fill: 'rgba(255,255,255,0.18)' });

		drawAmbulance(ctx, now);

		// Medics peeking over the cushion, cheering at each save.
		medics.forEach(function (m, i) {
			const hop = medicCheer > 0 ? Math.abs(Math.sin(medicCheer * 9 + i)) * 50 : 0;
			m.y = FLOOR - hop;
			const up = medicCheer > 0;
			Object.assign(m.handLeft, { x: up ? -80 : -70, y: up ? 20 : 140 });
			Object.assign(m.handRight, { x: up ? 80 : 70, y: up ? 20 : 140 });
			m.draw(ctx);
			art.with(ctx, { x: m.x, y: m.y, scale: m.scale }, function () {
				art.roundRect(ctx, -20, -m.h + 22, 40, 22, 4, { fill: 'white' });
				art.rect(ctx, -4, -m.h + 24, 8, 18, { fill: '#e8443a' });
				art.rect(ctx, -9, -m.h + 29, 18, 8, { fill: '#e8443a' });
			});
		});

		// The cushion.
		const sq = cushionSquash * 30;
		const c = CUSHION;
		const top = c.top + sq;
		art.roundRect(ctx, c.x - sq, top, c.w + sq * 2, FLOOR - top + 4, [60, 60, 14, 14], { fill: '#e8443a', shadow: { color: 'rgba(0,0,0,0.35)', blur: 18, y: 8 } });
		for (let i = 0; i < 6; i++) {
			const x = c.x + 40 + i * (c.w - 80) / 5;
			art.rect(ctx, x - 22, top + 20, 44, FLOOR - top - 20, { fill: '#ffcf3f' });
		}
		art.roundRect(ctx, c.x - sq, top, c.w + sq * 2, 34, 17, { fill: '#ff8a7a' });
		art.text(ctx, 'JUMP HERE', c.x + c.w / 2, top + 80, { size: 46, font: 'Paytone One', fill: '#ffffff', outline: '#a8231c', outlineWidth: 5 });
		for (const m of medics) m.draw(ctx, 'hands');
	}

	function drawAmbulance(ctx, now) {
		const a = AMBULANCE;
		const y0 = a.top;
		// The back box (with the doors open) and the cab.
		art.roundRect(ctx, a.x, y0, 470, FLOOR - 40 - y0, 26, { fill: '#f7f7fb', shadow: { color: 'rgba(0,0,0,0.4)', blur: 24, y: 10 } });
		art.roundRect(ctx, a.x + 470, y0 + 110, 170, FLOOR - 40 - y0 - 110, [40, 26, 26, 0], { fill: '#f7f7fb' });
		art.roundRect(ctx, a.x + 520, y0 + 135, 95, 85, [30, 10, 10, 10], { fill: '#7fb6d9' });
		art.rect(ctx, a.x, y0 + 200, 640, 34, { fill: '#e8443a' });
		art.rect(ctx, a.x + 270, y0 + 60, 36, 110, { fill: '#e8443a' });
		art.rect(ctx, a.x + 233, y0 + 97, 110, 36, { fill: '#e8443a' });
		// Light bar.
		const on = Math.floor(now * 4) % 2;
		art.roundRect(ctx, a.x + 150, y0 - 32, 170, 34, 12, { fill: '#555' });
		art.roundRect(ctx, a.x + 158, y0 - 28, 74, 26, 10, { fill: on ? '#ff3b3b' : '#7a1f1f' });
		art.roundRect(ctx, a.x + 238, y0 - 28, 74, 26, 10, { fill: on ? '#4a6bff' : '#ff3b3b' });
		if (on) art.circle(ctx, a.x + 195, y0 - 15, 70, { fill: art.radial(ctx, a.x + 195, y0 - 15, 5, 70, ['rgba(255,80,80,0.5)', 'rgba(255,80,80,0)']) });
		// The open back: everyone saved piles in.
		const dx = a.x + 20;
		const dy = y0 + 30;
		art.roundRect(ctx, dx, dy, 150, FLOOR - 70 - dy, 12, { fill: '#30324a' });
		const shown = Math.min(saved, 12);
		for (let i = 0; i < shown; i++) {
			const col = i % 3;
			const row = Math.floor(i / 3);
			Meep.drawHead(ctx, 99, dx + 8 + col * 46, FLOOR - 130 - row * 58, 0.36);
		}
		art.rect(ctx, a.x - 50, dy - 6, 60, FLOOR - 64 - dy, { fill: '#e6e6ee', shadow: { color: 'rgba(0,0,0,0.25)', blur: 10, x: -4 } });
		// Wheels.
		for (const wx of [a.x + 130, a.x + 520]) {
			art.circle(ctx, wx, FLOOR - 30, 52, { fill: '#26262e' });
			art.circle(ctx, wx, FLOOR - 30, 22, { fill: '#b8b8c8' });
		}
	}

	function drawParticles(ctx) {
		for (const p of particles) {
			const k = 1 - p.life / p.max;
			if (p.kind === 'ring') {
				art.circle(ctx, p.x, p.y, p.size + p.life * 4, { stroke: p.color, lineWidth: 6, alpha: k });
			} else if (p.kind === 'confetti') {
				art.with(ctx, { x: p.x, y: p.y, rotate: p.life * 12 + p.spin * 60 }, () => art.rect(ctx, -p.size / 2, -p.size / 4, p.size, p.size / 2, { fill: p.color, alpha: Math.min(1, k * 2) }));
			} else {
				art.circle(ctx, p.x, p.y, p.size * (p.kind === 'ember' ? k : 1), { fill: p.color, alpha: p.kind === 'smoke' ? k : Math.min(1, k * 1.5) });
			}
		}
	}

	function drawHints(ctx) {
		if (wave < 0 || !isLive) return;
		const s = t - waveStart;
		if (wave === 0 && s < 9) {
			const a = Math.min(1, s, 9 - s);
			art.text(ctx, 'Hold the net together!  Bounce them to the ambulance  →', W * 1.5, 120, { size: 52, font: 'Paytone One', fill: 'white', outline: 'rgba(30,20,60,0.8)', outlineWidth: 6, alpha: a });
			art.text(ctx, 'step towards the wall to lift your arms', W * 1.5, 190, { size: 36, fill: 'rgba(255,255,255,0.85)', alpha: a });
		}
		if (wave === 1 && s < 9) {
			const a = Math.min(1, s, 9 - s);
			art.text(ctx, 'Tap burning bits to splash them!', 950, 970, { size: 44, font: 'Paytone One', fill: '#bfe9ff', outline: 'rgba(20,30,60,0.8)', outlineWidth: 6, alpha: a });
			art.text(ctx, 'Burning bits singe holes in the net!', W * 1.5, 120, { size: 50, font: 'Paytone One', fill: 'white', outline: 'rgba(30,20,60,0.8)', outlineWidth: 6, alpha: a });
		}
	}

	self.draw = function (ctx) {
		const now = performance.now() / 1000;
		drawBackground(ctx, now);
		drawTower(ctx, now);
		drawStreet(ctx);
		drawRightWall(ctx, now);

		for (const j of jumpers) if (j.state === 'wave') drawPreview(ctx, j);

		// Shadows on the street under everyone in the air: where they'll land.
		for (const j of jumpers) {
			if (j.state !== 'fly') continue;
			const k = Math.max(0.2, 1 - (FLOOR - j.y) / 900);
			art.ellipse(ctx, j.x, FLOOR + 8, 50 * k + 10, 12 * k + 3, { fill: 'rgba(0,0,0,0.45)', alpha: k });
		}
		for (const j of jumpers) if (j.state === 'oof') drawJumper(ctx, j, now);

		for (const m of meeps) { m.draw(ctx, 'body'); drawHelmet(ctx, m); }
		for (const s of surfaces) drawSurface(ctx, s, now);
		for (const m of meeps) m.draw(ctx, 'hands');
		meeps.forEach(function (m, n) {
			if (!isFlicking(n)) return;
			for (const side of [-1, 1]) art.text(ctx, side < 0 ? '⟨' : '⟩', m.x + side * 85, m.y - 230, { size: 40, fill: '#fff6a0', alpha: 0.8 });
		});

		for (const d of debris) drawDebris(ctx, d, now);
		for (const j of jumpers) if (j.state === 'fly' || j.state === 'saved') drawJumper(ctx, j, now);
		drawParticles(ctx);
		for (const p of popups) {
			const k = p.life / 60;
			art.text(ctx, p.text, p.x, p.y - k * 60, { size: 54, font: 'Knewave', fill: p.color, outline: 'rgba(30,20,60,0.8)', outlineWidth: 5, alpha: Math.min(1, (1 - k) * 2) });
		}
		drawHints(ctx);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		meeps.forEach(function (m, i) {
			const p = players[i];
			if (!p || p.px === undefined) return;
			ff[i].tx = W + Math.max(0, Math.min(1, p.px)) * W;
			ff[i].pz = Math.max(0, Math.min(1, 1 - p.pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	self.state = function () {
		return {
			wave, live: isLive, over: isOver, t, saved, oofs, bounces,
			inFlight: jumpers.filter((j) => j.state === 'fly').length,
			waving: jumpers.filter((j) => j.state === 'wave').length,
			jumpers: jumpers.map((j) => ({ state: j.state, x: j.x, y: j.y, vx: j.vx, vy: j.vy, bounces: j.bounces })),
			debris: debris.map((d) => ({ x: d.x, y: d.y })),
			players: meeps.map((m, n) => ({ x: m.x, score: m.score, flick: isFlicking(n) })),
			surfaces: surfaces.map((s) => ({ key: s.key, kind: s.kind, ax: s.A.x, ay: s.A.y, bx: s.B.x, by: s.B.y, burnt: s.burnt })),
			scores: meeps.map((m) => m.score),
		};
	};

	self.fini = function () {
		stage.$el.off('click.tether');
		hud.fini();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
