/*
 * SFX — generated sound effects, each designed for a moment in the games
 * rather than standing in for an old recording. Every sound is built from
 * oscillators and filtered noise, so nothing loads.
 *
 *   SFX.play(ctx, out, 'deflect', volume, rate)   on an AudioContext, into out
 *   SFX.has('deflect')
 *
 * Games name the moment: Showtime calls show.fx('wordSlam'); an AudioPlayer
 * takes 'sfx:deflect' in place of a file (audio.add('catch', 'sfx:deflect')).
 * The old recorded effects (assets/shared/sfx-*.mp3), still named by the
 * older prototypes, each play the generated sound closest to how they're
 * used (FILES, below). rate shifts the pitch; a few take one more
 * argument (riser and dialCharge a length, visorLock the player's slot,
 * placeReveal how near first place).
 */
window.SFX = (function () {

	/* ---------- building blocks ---------- */

	function tone(c, out, type, at, len, f0, f1, vol, attack = 0.005) {
		const t = c.currentTime + at;
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(f0, t);
		if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + len);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		o.connect(g).connect(out);
		o.start(t);
		o.stop(t + len + 0.05);
	}

	let noiseBuffer = null;
	function noise(c, out, at, len, filter, f0, f1, vol, attack = 0.005, q = 1) {
		if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
			noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
			const d = noiseBuffer.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		const t = c.currentTime + at;
		const s = c.createBufferSource();
		s.buffer = noiseBuffer;
		s.loop = true;
		const f = c.createBiquadFilter();
		f.type = filter;
		f.Q.value = q;
		f.frequency.setValueAtTime(f0, t);
		if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + len);
		const g = c.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + len);
		s.connect(f).connect(g).connect(out);
		s.start(t);
		s.stop(t + len + 0.05);
	}

	// a chord or run of notes (Hz), each `step` apart
	const notes = (c, o, type, freqs, step, len, vol, at = 0) => freqs.forEach((f, i) => tone(c, o, type, at + i * step, len, f, f, vol));
	// a metal strike: inharmonic partials, ringing down
	const metal = (c, o, f, len, vol, at = 0) => [1, 2.76, 5.4, 8.93].forEach((k, i) => tone(c, o, i ? 'sine' : 'triangle', at, len / (1 + i * 0.6), f * k, f * k * 0.995, vol / (1 + i)));
	// a pentatonic scale from C5, for the sounds that climb or name a player
	const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

	/* ---------- the sounds, by moment ---------- */

	const SOUNDS = {

		// --- buttons and choices
		tap(c, o, v, r) { tone(c, o, 'sine', 0, 0.09, 900 * r, 700 * r, v * 0.5, 0.002); noise(c, o, 0, 0.02, 'highpass', 5000, 5000, v * 0.2); },
		pick(c, o, v, r) { notes(c, o, 'triangle', [660 * r, 990 * r], 0.06, 0.18, v * 0.5); },
		skip(c, o, v, r) { noise(c, o, 0, 0.3, 'bandpass', 600 * r, 4000 * r, v * 0.6, 0.05, 3); tone(c, o, 'sine', 0, 0.25, 300 * r, 1200 * r, v * 0.25); },

		// --- the title drop
		riser(c, o, v, r, len = 2) { noise(c, o, 0, len, 'bandpass', 200, 6000, v * 0.5, len * 0.9, 2); tone(c, o, 'sawtooth', 0, len, 80 * r, 320 * r, v * 0.08, len * 0.9); },
		letter(c, o, v, r) { tone(c, o, 'sine', 0, 0.22, 170 * r, 60 * r, v * 0.8); noise(c, o, 0, 0.06, 'lowpass', 3000, 600, v * 0.4, 0.002); },
		titleLand(c, o, v, r) {
			tone(c, o, 'sine', 0, 1.2, 110 * r, 35 * r, v);
			noise(c, o, 0, 0.7, 'lowpass', 1600, 70, v * 0.6, 0.003);
			notes(c, o, 'triangle', [523, 659, 784, 1047].map((f) => f * r), 0.03, 1.2, v * 0.12, 0.05);
		},

		// --- the clock
		dialCharge(c, o, v, r, len = 1.3) { for (let i = 0; i < 12; i++) tone(c, o, 'triangle', i * len / 12, 0.08, (500 + i * 70) * r, (500 + i * 70) * r, v * 0.22); },
		wordSlam(c, o, v, r) { tone(c, o, 'sine', 0, 0.3, 220 * r, 80 * r, v * 0.7); noise(c, o, 0, 0.12, 'bandpass', 1800, 500, v * 0.5, 0.002, 1.5); },
		timeSlam(c, o, v, r) { tone(c, o, 'sine', 0, 1.0, 90 * r, 32 * r, v); tone(c, o, 'square', 0, 0.12, 180 * r, 90 * r, v * 0.2); noise(c, o, 0, 0.5, 'lowpass', 1200, 60, v * 0.6, 0.003); },
		clockTick(c, o, v, r) { tone(c, o, 'square', 0, 0.03, 2600 * r, 1800 * r, v * 0.4, 0.001); noise(c, o, 0, 0.025, 'highpass', 5000, 9000, v * 0.5, 0.001); },
		clockTock(c, o, v, r) { tone(c, o, 'square', 0, 0.04, 1500 * r, 1000 * r, v * 0.4, 0.001); noise(c, o, 0, 0.03, 'bandpass', 1800, 1000, v * 0.4, 0.001, 2); },
		clockFly(c, o, v, r) { noise(c, o, 0, 0.7, 'bandpass', 300 * r, 3500 * r, v * 0.7, 0.3, 2.5); },
		clockDock(c, o, v, r) { tone(c, o, 'sine', 0, 0.12, 500 * r, 260 * r, v * 0.6, 0.002); noise(c, o, 0, 0.05, 'bandpass', 2500, 1200, v * 0.3, 0.002, 2); },
		lastSeconds(c, o, v, r) { tone(c, o, 'square', 0, 0.08, 880 * r, 880 * r, v * 0.3, 0.002); tone(c, o, 'sine', 0, 0.2, 440 * r, 440 * r, v * 0.3); },

		// --- the visor check
		visorLock(c, o, v, r, slot = 0) {
			// each player locks in on their own note (by slot), a bright ping and its octave
			const f = PENTA[slot % PENTA.length] * r;
			tone(c, o, 'triangle', 0, 0.5, f, f, v * 0.6, 0.003);
			tone(c, o, 'sine', 0.06, 0.6, f * 2, f * 2, v * 0.3, 0.003);
		},
		wrongVisor(c, o, v, r) { for (let i = 0; i < 2; i++) { tone(c, o, 'square', i * 0.22, 0.18, 392 * r, 392 * r, v * 0.22); tone(c, o, 'square', i * 0.22, 0.18, 370 * r, 370 * r, v * 0.22); } },
		allSet(c, o, v, r) { notes(c, o, 'triangle', [523, 659, 784].map((f) => f * r), 0.07, 0.8, v * 0.35); notes(c, o, 'sine', [1047 * r], 0, 1.0, v * 0.25, 0.21); },

		// --- time up
		timeUp(c, o, v, r) {
			// a stadium horn: a thick, slightly sour chord, and a thump
			for (const f of [196, 247, 294, 197.5]) tone(c, o, 'sawtooth', 0, 1.3, f * r, f * r * 0.97, v * 0.12, 0.02);
			tone(c, o, 'sine', 0, 0.8, 80 * r, 40 * r, v * 0.8);
		},

		// --- the results
		scoreTick(c, o, v, r) { tone(c, o, 'triangle', 0, 0.05, 1100 * r, 1100 * r, v * 0.35, 0.002); },
		scoresIn(c, o, v, r) { tone(c, o, 'sine', 0, 0.3, 300 * r, 150 * r, v * 0.6); notes(c, o, 'triangle', [784 * r, 1047 * r], 0.05, 0.3, v * 0.3); },
		slide(c, o, v, r) { noise(c, o, 0, 0.6, 'bandpass', 2500 * r, 500 * r, v * 0.5, 0.15, 2); },
		placeReveal(c, o, v, r, up = 0) {
			// a drum hit with a note that climbs toward first place (up: 0 last, 1 first)
			tone(c, o, 'sine', 0, 0.35, 160, 70, v * 0.7);
			noise(c, o, 0, 0.15, 'bandpass', 2400, 900, v * 0.45, 0.002, 0.8);
			const f = 330 * Math.pow(2, up) * r;
			tone(c, o, 'triangle', 0.02, 0.4, f, f, v * 0.3);
		},
		fanfare(c, o, v, r) {
			// a little brass call: up the triad, then hold the top
			[[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36]].forEach(([f, at], i) => {
				const len = i === 3 ? 1.0 : 0.16;
				tone(c, o, 'sawtooth', at, len, f * r, f * r, v * 0.13, 0.02);
				tone(c, o, 'square', at, len, f * r * 0.5, f * r * 0.5, v * 0.06, 0.02);
			});
		},
		crowd(c, o, v, r) {
			// a cheer: swelling chatter across the band, a few whoops
			for (let i = 0; i < 8; i++) noise(c, o, i * 0.06, 1.4 - i * 0.08, 'bandpass', 700 + i * 220, 1100 + i * 180, v * 0.18, 0.25, 2.5);
			for (let i = 0; i < 3; i++) tone(c, o, 'sine', 0.2 + i * 0.25, 0.3, 700 + i * 90, 1300 + i * 120, v * 0.08, 0.05);
		},
		gather(c, o, v, r) { noise(c, o, 0, 0.9, 'bandpass', 400 * r, 2600 * r, v * 0.6, 0.6, 2); tone(c, o, 'sine', 0, 0.9, 200 * r, 600 * r, v * 0.15, 0.6); },
		smoosh(c, o, v, r) { tone(c, o, 'sine', 0, 0.6, 140 * r, 45 * r, v); tone(c, o, 'sine', 0.02, 0.25, 600 * r, 180 * r, v * 0.35); noise(c, o, 0, 0.3, 'lowpass', 900, 100, v * 0.5, 0.002); },
		totalTick(c, o, v, r) { tone(c, o, 'square', 0, 0.04, 1500 * r, 1500 * r, v * 0.18, 0.002); },
		bonus(c, o, v, r) { notes(c, o, 'square', [988 * r, 1319 * r, 1760 * r], 0.06, 0.25, v * 0.2); },
		party(c, o, v, r) { SOUNDS.fanfare(c, o, v, r); SOUNDS.crowd(c, o, v * 0.9, r); for (let i = 0; i < 6; i++) noise(c, o, 0.3 + i * 0.15, 0.08, 'highpass', 3000, 6000, v * 0.35, 0.002); },
		rowIn(c, o, v, r) { noise(c, o, 0, 0.35, 'bandpass', 3000 * r, 900 * r, v * 0.4, 0.05, 2); },
		climb(c, o, v, r) { tone(c, o, 'triangle', 0, 0.12, 660 * r, 880 * r, v * 0.4, 0.003); },
		rewind(c, o, v, r) { tone(c, o, 'sawtooth', 0, 0.6, 1400 * r, 300 * r, v * 0.12, 0.01); noise(c, o, 0, 0.6, 'bandpass', 4000, 800, v * 0.3, 0.01, 3); },
		tapeStop(c, o, v, r) { tone(c, o, 'sawtooth', 0, 0.5, 400 * r, 50 * r, v * 0.15, 0.005); },

		// --- the rating
		rateHigh(c, o, v, r) { notes(c, o, 'triangle', [784 * r, 988 * r, 1175 * r], 0.06, 0.4, v * 0.35); },
		rateLow(c, o, v, r) { notes(c, o, 'triangle', [392 * r, 349 * r], 0.12, 0.35, v * 0.3); },
		thanks(c, o, v, r) { notes(c, o, 'sine', [523 * r, 659 * r, 784 * r], 0, 1.2, v * 0.2); },

		// --- every game's show: controls, rounds, the villain's entrance
		stepIn(c, o, v, r) { noise(c, o, 0, 0.25, 'bandpass', 900 * r, 3500 * r, v * 0.45, 0.06, 2.5); tone(c, o, 'triangle', 0.1, 0.15, 784 * r, 784 * r, v * 0.3); },
		roundStart(c, o, v, r) { tone(c, o, 'sine', 0, 0.3, 180, 70, v * 0.7); noise(c, o, 0, 0.12, 'bandpass', 2200, 800, v * 0.4, 0.002); notes(c, o, 'triangle', [523 * r, 784 * r], 0.1, 0.3, v * 0.3, 0.05); },
		go(c, o, v, r) { notes(c, o, 'square', [880 * r, 1175 * r], 0.08, 0.14, v * 0.22); },
		roundClear(c, o, v, r) { notes(c, o, 'triangle', [523, 659, 784, 1047, 1319].map((f) => f * r), 0.06, 0.5, v * 0.3); SOUNDS.crowd(c, o, v * 0.5, r); },
		roundFail(c, o, v, r) { notes(c, o, 'triangle', [392, 330, 262].map((f) => f * r), 0.2, 0.45, v * 0.3); tone(c, o, 'sine', 0.4, 0.5, 90 * r, 45 * r, v * 0.6); },
		glint(c, o, v, r) { tone(c, o, 'sine', 0, 0.4, 2093 * r, 2093 * r, v * 0.25, 0.002); tone(c, o, 'sine', 0.04, 0.35, 3136 * r, 3136 * r, v * 0.15, 0.002); },
		beat(c, o, v, r) { tone(c, o, 'sine', 0, 0.3, 140 * r, 55 * r, v * 0.9); noise(c, o, 0, 0.08, 'lowpass', 1500, 300, v * 0.4, 0.002); },
		villainReveal(c, o, v, r) { tone(c, o, 'sine', 0, 1.4, 80 * r, 28 * r, v); noise(c, o, 0, 1.0, 'lowpass', 2200, 50, v * 0.7, 0.003); for (const f of [55, 58, 82]) tone(c, o, 'sawtooth', 0.05, 1.3, f * r, f * r * 0.9, v * 0.1, 0.05); },
		fight(c, o, v, r) { SOUNDS.boom(c, o, v * 0.7, r); notes(c, o, 'sawtooth', [392, 523, 784].map((f) => f * r), 0, 0.9, v * 0.1, 0.02); },
		alarm(c, o, v, r) { for (let i = 0; i < 4; i++) tone(c, o, 'square', i * 0.25, 0.2, (i % 2 ? 620 : 830) * r, (i % 2 ? 610 : 820) * r, v * 0.2, 0.01); },
		countdown(c, o, v, r) { tone(c, o, 'sine', 0, 0.2, 220 * r, 110 * r, v * 0.7); tone(c, o, 'square', 0, 0.06, 1760 * r, 1760 * r, v * 0.12, 0.002); },
		thud(c, o, v, r) { tone(c, o, 'sine', 0, 0.5, 90 * r, 40 * r, v * 0.9); noise(c, o, 0, 0.2, 'lowpass', 600, 100, v * 0.5, 0.002); },

		// --- Gwi-Ma Showdown
		roar(c, o, v, r, len = 1.5) {
			// the demon king: detuned growling saws, a breathy rasp, falling away
			for (const f of [62, 65, 93, 124]) tone(c, o, 'sawtooth', 0, len, f * r * 1.2, f * r * 0.8, v * 0.14, len * 0.25);
			noise(c, o, 0, len, 'bandpass', 700, 300, v * 0.5, len * 0.25, 1.5);
		},
		bossDash(c, o, v, r) { noise(c, o, 0, 0.6, 'bandpass', 250 * r, 1800 * r, v * 0.8, 0.1, 1.5); tone(c, o, 'sawtooth', 0, 0.5, 90 * r, 160 * r, v * 0.12, 0.1); },
		stomp(c, o, v, r) { tone(c, o, 'sine', 0, 0.6, 75 * r, 30 * r, v); noise(c, o, 0, 0.25, 'lowpass', 900, 80, v * 0.6, 0.002); },
		bossDefeat(c, o, v, r) { SOUNDS.villainReveal(c, o, v, r); SOUNDS.roar(c, o, v * 0.6, r * 1.3, 1.2); },
		deflect(c, o, v, r) { metal(c, o, 620 * r, 0.6, v * 0.45); noise(c, o, 0, 0.05, 'highpass', 4000, 8000, v * 0.6, 0.001); },
		swordSwish(c, o, v, r) { noise(c, o, 0, 0.18, 'bandpass', 1200 * r, 6000 * r, v * 0.9, 0.03, 3); },
		fireball(c, o, v, r) { noise(c, o, 0, 0.5, 'lowpass', 3000 * r, 400 * r, v * 0.5, 0.02); tone(c, o, 'sawtooth', 0, 0.4, 160 * r, 90 * r, v * 0.1); },
		fizzle(c, o, v, r) { noise(c, o, 0, 0.5, 'highpass', 6000 * r, 1500 * r, v * 0.35, 0.005); },
		bossHit(c, o, v, r) {
			// a heavy blow, and the demon's snarl
			tone(c, o, 'sine', 0, 0.8, 110 * r, 35 * r, v);
			noise(c, o, 0, 0.5, 'lowpass', 2000, 90, v * 0.7, 0.002);
			for (const f of [70, 73, 105]) tone(c, o, 'sawtooth', 0.08, 0.7, f * r, f * r * 0.7, v * 0.12, 0.05);
		},
		banish(c, o, v, r) { SOUNDS.fanfare(c, o, v, r); notes(c, o, 'sine', [1047, 1319, 1568, 2093].map((f) => f * r), 0.05, 0.6, v * 0.12, 0.4); },
		demonPop(c, o, v, r) { tone(c, o, 'sine', 0, 0.16, 700 * r, 120 * r, v * 0.6, 0.002); noise(c, o, 0, 0.08, 'bandpass', 1200, 400, v * 0.4, 0.002, 2); },
		summon(c, o, v, r) { tone(c, o, 'sawtooth', 0, 1.1, 55 * r, 165 * r, v * 0.18, 0.6); noise(c, o, 0, 1.1, 'lowpass', 200, 1200, v * 0.4, 0.8); },
		attackWarn(c, o, v, r) { tone(c, o, 'sawtooth', 0, 1.2, 300 * r, 1200 * r, v * 0.1, 0.9); tone(c, o, 'sine', 0, 1.2, 150 * r, 600 * r, v * 0.2, 0.9); },
		vineStrike(c, o, v, r) {
			// a crackling surge: bursts of hard-filtered noise and a low thrum
			for (let i = 0; i < 7; i++) noise(c, o, i * 0.05, 0.07, 'bandpass', 2000 + Math.random() * 3000, 1000, v * 0.5, 0.001, 6);
			tone(c, o, 'sawtooth', 0, 0.6, 60 * r, 45 * r, v * 0.25, 0.01);
		},
		joinWall(c, o, v, r) { noise(c, o, 0, 0.18, 'bandpass', 800 * r, 3000 * r, v * 0.5, 0.03, 3); tone(c, o, 'triangle', 0.08, 0.12, 880 * r, 880 * r, v * 0.3); },
		nice(c, o, v, r) { notes(c, o, 'triangle', [659 * r, 880 * r], 0.08, 0.35, v * 0.45); },

		// --- Roll Call (and general use)
		wake(c, o, v, r) { tone(c, o, 'sine', 0, 0.25, 200 * r, 800 * r, v * 0.5, 0.01); },
		pop(c, o, v, r) { tone(c, o, 'sine', 0, 0.1, 400 * r, 900 * r, v * 0.6, 0.002); },
		lockIn(c, o, v, r) { tone(c, o, 'square', 0, 0.05, 1200 * r, 1200 * r, v * 0.2, 0.002); tone(c, o, 'triangle', 0.05, 0.25, 1600 * r, 1600 * r, v * 0.4); },
		correct(c, o, v, r) { notes(c, o, 'triangle', [659 * r, 988 * r], 0.09, 0.4, v * 0.5); },
		wrong(c, o, v, r) { tone(c, o, 'square', 0, 0.3, 220 * r, 180 * r, v * 0.2); },
		reveal(c, o, v, r) { tone(c, o, 'sine', 0, 0.5, 400 * r, 1300 * r, v * 0.35, 0.05); notes(c, o, 'triangle', [1319, 1568, 1976].map((f) => f * r), 0.05, 0.4, v * 0.12, 0.3); },
		whoosh(c, o, v, r) { noise(c, o, 0, 0.35, 'bandpass', 500 * r, 3000 * r, v * 0.9, 0.12, 2); },
		whooshLong(c, o, v, r) { noise(c, o, 0, 1.0, 'bandpass', 350 * r, 3500 * r, v * 0.9, 0.45, 2); },
		hint(c, o, v, r) { metal(c, o, 1046 * r, 0.9, v * 0.25); },
		coin(c, o, v, r) { notes(c, o, 'square', [988 * r, 1319 * r], 0.07, 0.25, v * 0.22); },
		boom(c, o, v, r) { tone(c, o, 'sine', 0, 1.0, 110 * r, 30 * r, v); noise(c, o, 0, 0.6, 'lowpass', 1500, 60, v * 0.6, 0.003); },
		rumble(c, o, v, r) { noise(c, o, 0, 1.4, 'lowpass', 160 * r, 60 * r, v * 1.2, 0.2); tone(c, o, 'sine', 0, 1.4, 55 * r, 40 * r, v * 0.5, 0.2); },
		charge(c, o, v, r) { tone(c, o, 'sawtooth', 0, 0.7, 180 * r, 900 * r, v * 0.2, 0.3); },
		fall(c, o, v, r) { tone(c, o, 'sine', 0, 0.8, 900 * r, 120 * r, v * 0.45); },
		curtain(c, o, v, r) { noise(c, o, 0, 1.2, 'lowpass', 400, 2400, v * 0.5, 0.5); },
		sequence(c, o, v, r) { notes(c, o, 'triangle', PENTA.slice(0, 5).map((f) => f * r), 0.08, 0.2, v * 0.45); },
		buzz(c, o, v, r) { tone(c, o, 'square', 0, 0.35, 140 * r, 110 * r, v * 0.25); },
	};
	// mallet notes, for the old point sounds
	for (const [n, f] of Object.entries({ a: 880, c: 523.25, d: 587.33, e: 659.25, g: 783.99 })) {
		SOUNDS['note-' + n] = (c, o, v, r) => { tone(c, o, 'triangle', 0, 0.45, f * r, f * r, v * 0.8, 0.003); tone(c, o, 'sine', 0, 0.2, f * 2 * r, f * 2 * r, v * 0.25, 0.003); };
	}

	// The old recorded effects, by file, and the sound that suits how the
	// older prototypes use each.
	const FILES = {
		bounce: 'pop', buzz: 'buzz', charge: 'charge', cheer: 'crowd', coin: 'coin',
		correct: 'correct', 'correct-echo': 'allSet', curtain: 'curtain', explode: 'boom', fall: 'fall',
		incorrect: 'wrong', pickup: 'lockIn', reveal: 'reveal', rumble: 'rumble', select: 'tap',
		sequence: 'sequence', tick: 'clockTick', tock: 'clockTock', woosh: 'whoosh', 'woosh-long': 'whooshLong',
		'point-a': 'note-a', 'point-c': 'note-c', 'point-d': 'note-d', 'point-e': 'note-e', 'point-g': 'note-g',
	};

	// the generated sound for a source: 'sfx:<name>', or an old sfx-*.mp3 file
	function nameOf(src) {
		if (!src) return null;
		if (src.startsWith('sfx:')) return SOUNDS[src.slice(4)] ? src.slice(4) : null;
		const m = /(?:^|\/)sfx-([a-z-]+)\.mp3$/.exec(src);
		return m && FILES[m[1]] ? FILES[m[1]] : null;
	}

	return {
		nameOf,
		has: (name) => !!SOUNDS[name],
		play(c, out, name, volume = 1, rate = 1, ...extra) {
			if (SOUNDS[name]) SOUNDS[name](c, out, volume, rate || 1, ...extra);
		},
	};
})();
