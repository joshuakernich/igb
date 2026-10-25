/*
 * Tails Escape: the sound, all synthesised. The hum of Tails' tail rotor,
 * the clank and rumble of the factory, a hammer of a thud for a press, the
 * whoosh of a fire jet, the zap of a laser gate, a crate landing, the ping
 * of a ring, a clang and a jangle of rings for a hit, a chime for every
 * machine slipped past, and a driving, clanky tune scheduled a beat ahead
 * from tick().
 *
 *   const sound = createSound();
 *   sound.ring(pan);  sound.slam(pan);  sound.whoosh(pan);  sound.zap(pan);  sound.thud(pan);
 *   sound.hit(pan);  sound.clear(pan);  sound.hop(pan);  sound.dive(pan);  sound.faster();
 *   sound.go();  sound.finish();  sound.laugh();  sound.rotor(0..1);
 *   sound.music(true);  sound.tick();   // every frame
 */
export function createSound() {
	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.8;
	const comp = ctx.createDynamicsCompressor();
	master.connect(comp).connect(ctx.destination);

	// a big hall's echo
	const echo = ctx.createDelay(1);
	echo.delayTime.value = 0.21;
	const echoBack = ctx.createGain();
	echoBack.gain.value = 0.32;
	const echoOut = ctx.createGain();
	echoOut.gain.value = 0.25;
	echo.connect(echoBack).connect(echo);
	echo.connect(echoOut).connect(master);

	const len = Math.floor(ctx.sampleRate * 2);
	const NOISE = ctx.createBuffer(1, len, ctx.sampleRate);
	const nd = NOISE.getChannelData(0);
	for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

	function panned(node, pan) {
		if (!pan || !ctx.createStereoPanner) return node;
		const p = ctx.createStereoPanner();
		p.pan.value = Math.max(-1, Math.min(1, pan));
		return node.connect(p);
	}

	function noise(at, dur, type, f0, f1, peak, q = 1, out = master, pan = 0) {
		const src = ctx.createBufferSource();
		src.buffer = NOISE;
		src.loop = true;
		const f = ctx.createBiquadFilter();
		f.type = type;
		f.Q.value = q;
		f.frequency.setValueAtTime(f0, at);
		f.frequency.exponentialRampToValueAtTime(f1, at + dur);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, at);
		g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, dur / 4));
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		const end = panned(src.connect(f).connect(g), pan);
		end.connect(out);
		src.start(at, Math.random());
		src.stop(at + dur + 0.05);
		return end;
	}

	function tone(at, dur, type, f0, f1, peak, attack = 0.005, out = master, pan = 0) {
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(f0, at);
		if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, at);
		g.gain.exponentialRampToValueAtTime(peak, at + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		panned(o.connect(g), pan).connect(out);
		o.start(at);
		o.stop(at + dur + 0.05);
		return { o, g };
	}

	const sound = { ctx };
	const now = () => ctx.currentTime + 0.01;

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	// The tail rotor: always running, level 0 (quiet) to 1 (whirring hard).
	const rotorBus = ctx.createGain();
	rotorBus.gain.value = 0;
	rotorBus.connect(master);
	const chop = ctx.createGain();
	chop.gain.value = 0.5;
	const chopLfo = ctx.createOscillator();
	chopLfo.type = 'square';
	chopLfo.frequency.value = 16;
	const chopAmt = ctx.createGain();
	chopAmt.gain.value = 0.45;
	chopLfo.connect(chopAmt).connect(chop.gain);
	const air = ctx.createBufferSource();
	air.buffer = NOISE;
	air.loop = true;
	const airF = ctx.createBiquadFilter();
	airF.type = 'bandpass';
	airF.frequency.value = 900;
	airF.Q.value = 0.7;
	air.connect(airF).connect(chop);
	chop.connect(rotorBus);
	// the factory: a low electrical hum under it all
	const hum = ctx.createOscillator();
	hum.type = 'sawtooth';
	hum.frequency.value = 50;
	const humF = ctx.createBiquadFilter();
	humF.type = 'lowpass';
	humF.frequency.value = 180;
	const humG = ctx.createGain();
	humG.gain.value = 0;
	hum.connect(humF).connect(humG).connect(master);
	air.start();
	chopLfo.start();
	hum.start();
	sound.rotor = function (level) {
		const t = ctx.currentTime;
		rotorBus.gain.setTargetAtTime(level * 0.16, t, 0.2);
		chopLfo.frequency.setTargetAtTime(14 + level * 10, t, 0.3);
		humG.gain.setTargetAtTime(level > 0 ? 0.05 : 0, t, 0.5);
	};

	// A ring: two quick bright notes, stepping up.
	sound.ring = function (pan = 0) {
		sound.resume();
		const t = now();
		for (const [at, f] of [[0, 1568], [0.065, 2093]]) {
			tone(t + at, 0.32, 'square', f, f, 0.04, 0.003, master, pan).g.connect(echo);
			tone(t + at, 0.3, 'sine', f * 2, f * 2, 0.03, 0.003, master, pan);
		}
	};

	// A press slamming down: a deep thud and a clank of steel.
	sound.slam = function (pan = 0, loud = 1) {
		sound.resume();
		const t = now();
		tone(t, 0.35, 'sine', 110, 38, 0.5 * loud, 0.002, master, pan);
		noise(t, 0.18, 'lowpass', 1600, 200, 0.3 * loud, 1, master, pan);
		tone(t, 0.5, 'square', 220, 200, 0.03 * loud, 0.002, master, pan).g.connect(echo);
		tone(t, 0.4, 'triangle', 1330, 1300, 0.025 * loud, 0.002, master, pan);
	};

	// A fire jet: a roaring whoosh.
	sound.whoosh = function (pan = 0, loud = 1) {
		sound.resume();
		const t = now();
		noise(t, 0.9, 'bandpass', 300, 1400, 0.3 * loud, 0.8, master, pan);
		noise(t, 0.9, 'lowpass', 600, 200, 0.25 * loud, 1, master, pan);
	};

	// A laser gate switching on: a quick falling zap.
	sound.zap = function (pan = 0, loud = 1) {
		sound.resume();
		const t = now();
		tone(t, 0.18, 'sawtooth', 2400, 300, 0.05 * loud, 0.002, master, pan);
		tone(t, 0.25, 'square', 120, 118, 0.03 * loud, 0.002, master, pan);
	};

	// A crate landing on the belt.
	sound.thud = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.25, 'sine', 140, 50, 0.45, 0.002, master, pan);
		noise(t, 0.12, 'lowpass', 900, 200, 0.3, 1, master, pan);
	};

	// Tails hit: a clang, a crunch and his rings jangling away.
	sound.hit = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.6, 'square', 330, 300, 0.07, 0.002, master, pan).g.connect(echo);
		tone(t, 0.4, 'sine', 160, 40, 0.6, 0.003, master, pan);
		noise(t, 0.25, 'lowpass', 2400, 300, 0.4, 1, master, pan);
		for (let i = 0; i < 8; i++) {
			const f = 1400 + Math.random() * 1600;
			tone(t + 0.05 + i * 0.045, 0.22, 'triangle', f, f * 0.9, 0.05, 0.002, master, (Math.random() - 0.5) * 1.6);
		}
	};

	// A machine slipped past: a little two-note chime.
	sound.clear = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.18, 'triangle', 1047, 1047, 0.06, 0.003, master, pan);
		tone(t + 0.07, 0.3, 'triangle', 1568, 1568, 0.06, 0.003, master, pan).g.connect(echo);
	};

	// Flying up (a jump) and diving down (a squat): quick swoops.
	sound.hop = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.2, 'sine', 300, 900, 0.1, 0.004, master, pan);
	};
	sound.dive = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.2, 'sine', 700, 220, 0.08, 0.004, master, pan);
	};

	// The belt speeding up: a rising siren.
	sound.faster = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 2; i++) tone(t + i * 0.45, 0.42, 'sawtooth', 500, 900, 0.05, 0.05).g.connect(echo);
	};

	// Robotnik laughing: a bouncing ho-ho-ho, low and nasal.
	sound.laugh = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 5; i++) {
			const f = 210 - i * 12;
			const v = tone(t + i * 0.16, 0.13, 'sawtooth', f * 1.15, f, 0.08, 0.01);
			v.g.connect(echo);
			tone(t + i * 0.16, 0.13, 'square', f * 2.3, f * 2, 0.02, 0.01);
		}
	};

	// The off: a quick bright fanfare.
	sound.go = function () {
		sound.resume();
		const t = now();
		[523, 659, 784, 1047].forEach((f, i) => {
			tone(t + i * 0.09, i === 3 ? 0.7 : 0.12, 'square', f, f, 0.07, 0.004).g.connect(echo);
			tone(t + i * 0.09, i === 3 ? 0.7 : 0.12, 'triangle', f / 2, f / 2, 0.1, 0.004);
		});
	};

	// TIME!: a fanfare tumbling down and back up.
	sound.finish = function () {
		sound.resume();
		const t = now();
		const notes = [1047, 784, 659, 523, 659, 784, 1047, 1319];
		notes.forEach((f, i) => {
			const l = i === notes.length - 1 ? 1.2 : 0.13;
			tone(t + i * 0.11, l, 'square', f, f, 0.07, 0.005).g.connect(echo);
			tone(t + i * 0.11, l, 'triangle', f / 2, f / 2, 0.1, 0.005);
		});
	};

	/* ---------- the tune ---------- */

	// A driving loop at 148 bpm in A minor: a pumping octave bass, a synth
	// riff over the chords, and the factory for drums (a thumping kick,
	// clanking anvils, hissing hats).
	const BPM = 148;
	const SIXTEENTH = 60 / BPM / 4;
	const CHORDS = [   // a bar each: the root (Hz) and the chord's notes
		[55.0, [440, 523.25, 659.25, 880]],          // Am
		[43.65, [349.23, 440, 523.25, 698.46]],      // F
		[49.0, [392, 493.88, 587.33, 783.99]],       // G
		[41.2, [329.63, 415.3, 493.88, 659.25]],     // E
	];
	// the riff: which chord note on each sixteenth (-1 rests)
	const RIFF = [
		[0, -1, 0, 2, -1, 0, 3, -1, 2, -1, 0, -1, 1, -1, 2, -1],
		[0, -1, 0, 2, -1, 0, 3, -1, 3, 2, 1, -1, 2, -1, 1, 0],
	];
	const musicBus = ctx.createGain();
	musicBus.gain.value = 0;
	musicBus.connect(master);
	let playing = false;
	let nextAt = 0;
	let step = 0;

	sound.music = function (on) {
		sound.resume();
		if (on && playing) return;
		playing = on;
		musicBus.gain.setTargetAtTime(on ? 0.45 : 0, ctx.currentTime, on ? 0.05 : 0.6);
		if (on) {
			nextAt = ctx.currentTime + 0.05;
			step = 0;
		}
	};

	function scheduleStep(at, n) {
		const bar = Math.floor(n / 16) % CHORDS.length;
		const s = n % 16;
		const [root, notes] = CHORDS[bar];
		// the bass: pumping eighths, root and octave
		if (s % 2 === 0) {
			const f = root * (s % 4 === 0 ? 2 : 4);
			tone(at, SIXTEENTH * 1.5, 'sawtooth', f, f, 0.12, 0.003, musicBus);
			tone(at, SIXTEENTH * 1.5, 'triangle', f, f, 0.2, 0.003, musicBus);
		}
		// the riff: a bright square lead
		const k = RIFF[(n >> 4) % 2][s];
		if (k >= 0) {
			const f = notes[k];
			tone(at, 0.14, 'square', f, f, 0.04, 0.002, musicBus).g.connect(echo);
		}
		// a stab of the chord on the off-beats
		if (s === 6 || s === 14) for (const f of notes.slice(0, 3)) tone(at, 0.1, 'sawtooth', f / 2, f / 2, 0.015, 0.004, musicBus);
		// drums: kick, an anvil clank, hats
		if (s % 4 === 0) tone(at, 0.18, 'sine', 150, 42, 0.55, 0.002, musicBus);
		if (s === 4 || s === 12) {
			noise(at, 0.12, 'bandpass', 1800, 1200, 0.25, 1, musicBus);
			tone(at, 0.18, 'square', 1250, 1240, 0.02, 0.001, musicBus);
		}
		if (s % 2 === 1) noise(at, 0.04, 'highpass', 8000, 7000, 0.06, 0.7, musicBus);
	}

	sound.tick = function () {
		if (!playing) return;
		const ahead = ctx.currentTime + 0.15;
		if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.02;   // (after a stall, pick up from now)
		while (nextAt < ahead) {
			scheduleStep(nextAt, step);
			step++;
			nextAt += SIXTEENTH;
		}
	};

	sound.close = function () {
		for (const n of [air, chopLfo, hum]) { try { n.stop(); } catch (e) { /* already stopped */ } }
		ctx.close().catch(() => {});
	};

	return sound;
}
