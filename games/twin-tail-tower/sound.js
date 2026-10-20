/*
 * Twin Tail Tower: the sound, all synthesised. A rubbery boing for every
 * bounce (each fox a little higher or lower in pitch), a big sproing for a
 * spring, the whirr of a tail rotor (chopping blades and rushing air), the
 * ping of a ring, a crumbling crunch, a robot bopped or a fox bumped, the
 * slide whistle of a fall and the bloop of the bubble that brings you back,
 * a chime for each new height, and a bouncy, upbeat tune scheduled a beat
 * ahead from tick().
 *
 *   const sound = createSound();
 *   sound.boing(pan, pitch);  sound.spring(pan);  sound.rotor(0..1);  sound.ring(pan);
 *   sound.crumble(pan);  sound.stomp(pan);  sound.hit(pan);  sound.fall(pan);
 *   sound.bubble(pan);  sound.pop(pan);  sound.zone();  sound.go();  sound.finish();
 *   sound.music(true);  sound.tick();   // every frame
 */
export function createSound() {
	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.8;
	const comp = ctx.createDynamicsCompressor();
	master.connect(comp).connect(ctx.destination);

	const echo = ctx.createDelay(1);
	echo.delayTime.value = 0.16;
	const echoBack = ctx.createGain();
	echoBack.gain.value = 0.28;
	const echoOut = ctx.createGain();
	echoOut.gain.value = 0.22;
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
		panned(src.connect(f).connect(g), pan).connect(out);
		src.start(at, Math.random());
		src.stop(at + dur + 0.05);
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

	// a tone with a wobble (a spring's boing)
	function wobble(at, dur, f0, f1, rate, depth, peak, pan) {
		const t = tone(at, dur, 'sine', f0, f1, peak, 0.004, master, pan);
		const lfo = ctx.createOscillator();
		lfo.frequency.value = rate;
		const amt = ctx.createGain();
		amt.gain.setValueAtTime(depth, at);
		amt.gain.exponentialRampToValueAtTime(depth * 0.1, at + dur);
		lfo.connect(amt).connect(t.o.frequency);
		lfo.start(at);
		lfo.stop(at + dur + 0.05);
	}

	const sound = { ctx };
	const now = () => ctx.currentTime + 0.01;

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	// A bounce: a short rubbery boing, rising.
	sound.boing = function (pan = 0, pitch = 1) {
		sound.resume();
		const t = now();
		tone(t, 0.16, 'sine', 190 * pitch, 520 * pitch, 0.28, 0.003, master, pan);
		tone(t, 0.12, 'triangle', 380 * pitch, 900 * pitch, 0.06, 0.003, master, pan);
	};

	// A spring: a big wobbling sproing.
	sound.spring = function (pan = 0) {
		sound.resume();
		const t = now();
		wobble(t, 0.7, 160, 820, 28, 90, 0.32, pan);
		tone(t, 0.25, 'square', 300, 1200, 0.05, 0.003, master, pan);
		noise(t, 0.3, 'bandpass', 800, 5000, 0.12, 1.5, master, pan);
	};

	// A tail rotor: always running, level 0 (quiet) to 1 (whirring).
	const rotorBus = ctx.createGain();
	rotorBus.gain.value = 0;
	rotorBus.connect(master);
	const chop = ctx.createGain();           // the blades chopping the air
	chop.gain.value = 0.5;
	const chopLfo = ctx.createOscillator();
	chopLfo.type = 'square';
	chopLfo.frequency.value = 17;
	const chopAmt = ctx.createGain();
	chopAmt.gain.value = 0.5;
	chopLfo.connect(chopAmt).connect(chop.gain);
	const buzz = ctx.createOscillator();
	buzz.type = 'sawtooth';
	buzz.frequency.value = 95;
	const buzzF = ctx.createBiquadFilter();
	buzzF.type = 'lowpass';
	buzzF.frequency.value = 700;
	const buzzG = ctx.createGain();
	buzzG.gain.value = 0.12;
	buzz.connect(buzzF).connect(buzzG).connect(chop);
	const air = ctx.createBufferSource();
	air.buffer = NOISE;
	air.loop = true;
	const airF = ctx.createBiquadFilter();
	airF.type = 'bandpass';
	airF.frequency.value = 1200;
	airF.Q.value = 0.8;
	const airG = ctx.createGain();
	airG.gain.value = 0.35;
	air.connect(airF).connect(airG).connect(chop);
	chop.connect(rotorBus);
	buzz.start();
	air.start();
	chopLfo.start();
	sound.rotor = function (level) {
		const t = ctx.currentTime;
		rotorBus.gain.setTargetAtTime(level * 0.5, t, level > 0 ? 0.05 : 0.25);
		chopLfo.frequency.setTargetAtTime(14 + level * 8, t, 0.2);
		buzz.frequency.setTargetAtTime(80 + level * 40, t, 0.2);
	};

	// A ring: two quick bright notes, stepping up.
	sound.ring = function (pan = 0) {
		sound.resume();
		const t = now();
		for (const [at, f] of [[0, 1568], [0.065, 2093]]) {
			tone(t + at, 0.32, 'square', f, f, 0.045, 0.003, master, pan).g.connect(echo);
			tone(t + at, 0.3, 'sine', f * 2, f * 2, 0.035, 0.003, master, pan);
		}
	};

	// A crumbly platform giving way: a crunch and a patter of crumbs.
	sound.crumble = function (pan = 0) {
		sound.resume();
		const t = now();
		noise(t, 0.35, 'lowpass', 1800, 200, 0.45, 1, master, pan);
		tone(t, 0.25, 'sine', 120, 50, 0.4, 0.003, master, pan);
		for (let i = 0; i < 6; i++) noise(t + 0.08 + i * 0.05, 0.05, 'bandpass', 2500 + Math.random() * 2000, 1500, 0.12, 3, master, pan);
	};

	// A robot bopped from above: a squelchy pop and a little fanfare of rings.
	sound.stomp = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.18, 'square', 600, 140, 0.12, 0.002, master, pan);
		noise(t, 0.15, 'highpass', 3000, 1000, 0.25, 1, master, pan);
		for (const [at, f] of [[0.08, 1319], [0.14, 1760], [0.2, 2093]]) tone(t + at, 0.18, 'square', f, f, 0.04, 0.003, master, pan).g.connect(echo);
	};

	// A fox bumped by a robot: a thump, a crunch, rings jangling away.
	sound.hit = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.4, 'sine', 160, 40, 0.7, 0.003, master, pan);
		noise(t, 0.25, 'lowpass', 2400, 300, 0.45, 1, master, pan);
		for (let i = 0; i < 8; i++) {
			const f = 1400 + Math.random() * 1600;
			tone(t + 0.05 + i * 0.045, 0.22, 'triangle', f, f * 0.9, 0.05, 0.002, master, (Math.random() - 0.5) * 1.6);
		}
	};

	// A fall: a slide whistle going down.
	sound.fall = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.8, 'triangle', 1400, 220, 0.12, 0.02, master, pan);
		tone(t, 0.8, 'sine', 1400, 220, 0.08, 0.02, master, pan);
	};

	// The bubble rising: bloops climbing up.
	sound.bubble = function (pan = 0) {
		sound.resume();
		const t = now();
		for (let i = 0; i < 5; i++) tone(t + i * 0.18, 0.12, 'sine', 300 + i * 90, 700 + i * 160, 0.12, 0.004, master, pan);
	};

	// The bubble popping.
	sound.pop = function (pan = 0) {
		sound.resume();
		const t = now();
		noise(t, 0.08, 'highpass', 4000, 2000, 0.35, 1, master, pan);
		tone(t, 0.1, 'sine', 900, 1800, 0.15, 0.002, master, pan);
	};

	// A tail rotor picked up: a rising rev.
	sound.whirr = function (pan = 0) {
		sound.resume();
		const t = now();
		tone(t, 0.5, 'sawtooth', 110, 440, 0.08, 0.02, master, pan);
		noise(t, 0.6, 'bandpass', 400, 3000, 0.25, 1.2, master, pan);
	};

	// A new height: a sparkling run up the scale.
	sound.zone = function () {
		sound.resume();
		const t = now();
		[784, 988, 1175, 1568, 1976].forEach((f, i) => {
			tone(t + i * 0.07, 0.6, 'sine', f, f, 0.08, 0.004).g.connect(echo);
			tone(t + i * 0.07, 0.3, 'triangle', f * 2, f * 2, 0.02, 0.004);
		});
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

	// A bouncy loop at 136 bpm in C: a hopping bass, a marimba-ish tune
	// skipping over the chords, claps and hats.
	const BPM = 136;
	const SIXTEENTH = 60 / BPM / 4;
	const CHORDS = [   // a bar each: the root (Hz) and the chord's notes
		[65.41, [523.25, 659.25, 783.99, 1046.5]],   // C
		[55.0, [440, 523.25, 659.25, 880]],          // Am
		[43.65, [349.23, 440, 523.25, 698.46]],      // F
		[49.0, [392, 493.88, 587.33, 783.99]],       // G
	];
	// the tune: which chord note on each sixteenth (-1 rests)
	const TUNE = [
		[0, -1, 1, -1, 2, -1, 1, 2, 3, -1, 2, -1, 1, -1, -1, -1],
		[2, -1, 1, -1, 0, -1, 1, -1, 2, 3, 2, -1, 1, -1, 0, -1],
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
		musicBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, on ? 0.05 : 0.6);
		if (on) {
			nextAt = ctx.currentTime + 0.05;
			step = 0;
		}
	};

	function scheduleStep(at, n) {
		const bar = Math.floor(n / 16) % CHORDS.length;
		const s = n % 16;
		const [root, notes] = CHORDS[bar];
		// the bass: hopping root and octave, short and plucky
		if (s % 4 === 0) tone(at, SIXTEENTH * 1.6, 'triangle', root * 2, root * 2, 0.32, 0.003, musicBus);
		if (s % 4 === 2) tone(at, SIXTEENTH * 1.2, 'triangle', root * 4, root * 4, 0.2, 0.003, musicBus);
		// the tune: a mallet (a quick sine with a glassy overtone)
		const k = TUNE[(n >> 4) % 2][s];
		if (k >= 0) {
			const f = notes[k];
			tone(at, 0.22, 'sine', f, f, 0.14, 0.002, musicBus);
			tone(at, 0.08, 'sine', f * 4, f * 4, 0.025, 0.001, musicBus);
		}
		// a soft chord on the off-beats
		if (s === 2 || s === 10) for (const f of notes.slice(0, 3)) tone(at, 0.12, 'square', f / 2, f / 2, 0.012, 0.004, musicBus);
		// drums: kick, clap, hats
		if (s === 0 || s === 8 || s === 11) tone(at, 0.16, 'sine', 140, 45, 0.5, 0.002, musicBus);
		if (s === 4 || s === 12) noise(at, 0.14, 'bandpass', 1600, 1000, 0.3, 0.9, musicBus);
		if (s % 2 === 1) noise(at, 0.035, 'highpass', 8000, 7000, 0.07, 0.7, musicBus);
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
		for (const n of [buzz, air, chopLfo]) { try { n.stop(); } catch (e) { /* already stopped */ } }
		ctx.close().catch(() => {});
	};

	return sound;
}
