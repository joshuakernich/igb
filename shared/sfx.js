/*
 * SFX — generated sound effects, one for each recorded assets/shared/sfx-*.mp3.
 *
 * The AudioPlayer (shared/audio.js) plays these in place of those files, so
 * every game gets generated effects without changing a line: a game still
 * adds 'assets/shared/sfx-coin.mp3', and hears the generated coin. Looping
 * sounds and anything else (music, speech) still play from their files.
 * Set IGB.generatedSfx = false to hear the recordings again.
 *
 *   SFX.has('coin')                      a generated version exists
 *   SFX.play(ctx, out, 'coin', volume, rate)   play it on an AudioContext, into out
 *   SFX.nameOf('assets/shared/sfx-coin.mp3')   'coin' (or null)
 */
window.SFX = (function () {

	// a note's frequency, by name (the point sounds are a pentatonic set)
	const NOTE = { c: 523.25, d: 587.33, e: 659.25, f: 698.46, g: 783.99, a: 880, b: 987.77 };

	function nameOf(src) {
		const m = /(?:^|\/)sfx-([a-z-]+)\.mp3$/.exec(src || '');
		return m && RECIPES[m[1]] ? m[1] : null;
	}

	// The building blocks. `out` is where to connect (the player's master).
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

	// One recipe per file. v is the volume the game asked for (0..1); r the
	// playback rate (pitch). Each is built to sit at about the loudness of
	// the recording it stands in for.
	const RECIPES = {
		bounce(c, o, v, r) { tone(c, o, 'sine', 0, 0.14, 260 * r, 620 * r, v * 0.9); },
		buzz(c, o, v, r) { tone(c, o, 'square', 0, 0.35, 140 * r, 110 * r, v * 0.35); tone(c, o, 'square', 0, 0.35, 147 * r, 116 * r, v * 0.25); },
		charge(c, o, v, r) { tone(c, o, 'sawtooth', 0, 0.7, 180 * r, 900 * r, v * 0.25, 0.3); noise(c, o, 0, 0.7, 'bandpass', 500, 3000, v * 0.2, 0.4, 4); },
		cheer(c, o, v, r) {
			[523, 659, 784, 1047].forEach((f, i) => tone(c, o, 'triangle', i * 0.07, 0.6, f * r, f * r, v * 0.35));
			for (let i = 0; i < 6; i++) noise(c, o, i * 0.12, 0.5, 'bandpass', 900 + i * 180, 1400 + i * 120, v * 0.25, 0.08, 3);
		},
		coin(c, o, v, r) { tone(c, o, 'square', 0, 0.07, 988 * r, 988 * r, v * 0.3); tone(c, o, 'square', 0.07, 0.3, 1319 * r, 1319 * r, v * 0.3); },
		correct(c, o, v, r) { tone(c, o, 'triangle', 0, 0.25, 659 * r, 659 * r, v * 0.7); tone(c, o, 'triangle', 0.1, 0.45, 880 * r, 880 * r, v * 0.7); },
		'correct-echo'(c, o, v, r) { [0, 0.18, 0.36].forEach((at, i) => { tone(c, o, 'triangle', at, 0.25, 659 * r, 659 * r, v * 0.6 / (i + 1)); tone(c, o, 'triangle', at + 0.1, 0.4, 880 * r, 880 * r, v * 0.6 / (i + 1)); }); },
		curtain(c, o, v, r) { noise(c, o, 0, 1.2, 'lowpass', 400, 2400, v * 0.5, 0.5); tone(c, o, 'sine', 0.2, 1.0, 220 * r, 440 * r, v * 0.2, 0.4); },
		explode(c, o, v, r) { tone(c, o, 'sine', 0, 0.9, 120 * r, 30 * r, v); noise(c, o, 0, 0.8, 'lowpass', 2400, 80, v * 0.9, 0.003); },
		fall(c, o, v, r) { tone(c, o, 'sine', 0, 0.8, 900 * r, 120 * r, v * 0.5); },
		incorrect(c, o, v, r) { tone(c, o, 'square', 0, 0.18, 330 * r, 320 * r, v * 0.25); tone(c, o, 'square', 0.18, 0.35, 233 * r, 220 * r, v * 0.25); },
		pickup(c, o, v, r) { tone(c, o, 'sine', 0, 0.08, 660 * r, 660 * r, v * 0.7); tone(c, o, 'sine', 0.07, 0.16, 990 * r, 1320 * r, v * 0.7); },
		reveal(c, o, v, r) {
			tone(c, o, 'sine', 0, 0.6, 330 * r, 1320 * r, v * 0.45, 0.05);
			for (let i = 0; i < 6; i++) tone(c, o, 'triangle', 0.25 + i * 0.05, 0.35, (1320 + i * 220) * r, (1320 + i * 220) * r, v * 0.15);
			noise(c, o, 0, 0.7, 'highpass', 3000, 9000, v * 0.15, 0.3);
		},
		rumble(c, o, v, r) { noise(c, o, 0, 1.4, 'lowpass', 160 * r, 60 * r, v * 1.2, 0.2); tone(c, o, 'sine', 0, 1.4, 55 * r, 40 * r, v * 0.6, 0.2); },
		select(c, o, v, r) { tone(c, o, 'square', 0, 0.06, 880 * r, 880 * r, v * 0.3); },
		sequence(c, o, v, r) { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, o, 'triangle', i * 0.08, 0.2, f * r, f * r, v * 0.5)); },
		tick(c, o, v, r) { tone(c, o, 'square', 0, 0.035, 2400 * r, 1700 * r, v * 0.45); noise(c, o, 0, 0.03, 'highpass', 4000, 8000, v * 0.6); },
		tock(c, o, v, r) { tone(c, o, 'square', 0, 0.05, 1200 * r, 800 * r, v * 0.45); noise(c, o, 0, 0.04, 'bandpass', 1500, 900, v * 0.5, 0.003, 2); },
		woosh(c, o, v, r) { noise(c, o, 0, 0.35, 'bandpass', 400 * r, 3000 * r, v * 1.4, 0.12, 2); },
		'woosh-long'(c, o, v, r) { noise(c, o, 0, 1.0, 'bandpass', 300 * r, 3500 * r, v * 1.4, 0.45, 2); },
	};
	// the point notes: a bright mallet ping at each note
	for (const n of ['a', 'c', 'd', 'e', 'g']) {
		RECIPES['point-' + n] = function (c, o, v, r) {
			tone(c, o, 'triangle', 0, 0.45, NOTE[n] * r, NOTE[n] * r, v * 0.8, 0.003);
			tone(c, o, 'sine', 0, 0.2, NOTE[n] * 2 * r, NOTE[n] * 2 * r, v * 0.25, 0.003);
		};
	}

	return {
		nameOf,
		has: (name) => !!RECIPES[name],
		play(c, out, name, volume = 1, rate = 1) {
			if (RECIPES[name]) RECIPES[name](c, out, volume, rate || 1);
		},
	};
})();
