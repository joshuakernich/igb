/*
 * Loop Island: the sound, all synthesised. The rush of the wind (louder the
 * faster you go), the chime of a ring, the crunch of a spill, the whoosh of a
 * boost, the countdown, and a bright, driving tune scheduled a beat ahead
 * from tick().
 *
 *   const sound = createSound();
 *   sound.ring(pan);  sound.hit();  sound.boost();  sound.swish(pan);
 *   sound.beep(go);  sound.finish();  sound.music(true);  sound.wind(0..1);
 *   sound.tick();   // every frame
 */
export function createSound() {
	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.8;
	const comp = ctx.createDynamicsCompressor();
	master.connect(comp).connect(ctx.destination);

	const echo = ctx.createDelay(1);
	echo.delayTime.value = 0.18;
	const echoBack = ctx.createGain();
	echoBack.gain.value = 0.3;
	const echoOut = ctx.createGain();
	echoOut.gain.value = 0.25;
	echo.connect(echoBack).connect(echo);
	echo.connect(echoOut).connect(master);

	function noiseBuffer(seconds) {
		const len = Math.floor(ctx.sampleRate * seconds);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		return buf;
	}
	const NOISE = noiseBuffer(2);

	function noise(at, dur, type, f0, f1, peak, q = 1, out = master) {
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
		src.connect(f).connect(g).connect(out);
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
		let node = o.connect(g);
		if (pan && ctx.createStereoPanner) {
			const p = ctx.createStereoPanner();
			p.pan.value = pan;
			node = node.connect(p);
		}
		node.connect(out);
		o.start(at);
		o.stop(at + dur + 0.05);
		return g;
	}

	const sound = { ctx };
	const now = () => ctx.currentTime + 0.01;

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	// The rush of air, always running; wind(level) sets how hard.
	const windSrc = ctx.createBufferSource();
	windSrc.buffer = NOISE;
	windSrc.loop = true;
	const windFilter = ctx.createBiquadFilter();
	windFilter.type = 'bandpass';
	windFilter.Q.value = 0.7;
	windFilter.frequency.value = 400;
	const windGain = ctx.createGain();
	windGain.gain.value = 0;
	windSrc.connect(windFilter).connect(windGain).connect(master);
	windSrc.start();
	sound.wind = function (level) {
		const t = ctx.currentTime;
		windGain.gain.setTargetAtTime(0.02 + level * 0.16, t, 0.15);
		windFilter.frequency.setTargetAtTime(300 + level * 1400, t, 0.15);
	};

	// A ring: two quick bright notes, stepping up.
	let ringFlip = 1;
	sound.ring = function (pan = 0) {
		sound.resume();
		const t = now();
		ringFlip = -ringFlip;
		for (const [at, f] of [[0, 1568], [0.065, 2093]]) {
			const g = tone(t + at, 0.32, 'square', f, f, 0.05, 0.003, master, pan);
			g.connect(echo);
			tone(t + at, 0.3, 'sine', f * 2, f * 2, 0.04, 0.003, master, pan);
		}
	};

	// A spill: a thump, a crunch, rings jangling away.
	sound.hit = function () {
		sound.resume();
		const t = now();
		tone(t, 0.4, 'sine', 160, 40, 0.8);
		noise(t, 0.25, 'lowpass', 2400, 300, 0.5);
		for (let i = 0; i < 9; i++) {
			const f = 1400 + Math.random() * 1600;
			tone(t + 0.05 + i * 0.045, 0.22, 'triangle', f, f * 0.9, 0.06, 0.002, master, (Math.random() - 0.5) * 1.6);
		}
	};

	// A boost: a revving rise and a burst of air.
	sound.boost = function () {
		sound.resume();
		const t = now();
		tone(t, 0.6, 'sawtooth', 110, 660, 0.12, 0.02);
		tone(t, 0.6, 'square', 55, 330, 0.06, 0.02);
		noise(t, 0.9, 'bandpass', 300, 4000, 0.4, 1.2);
	};

	// Switching lanes: a short swish.
	sound.swish = function (pan = 0) {
		sound.resume();
		const t = now();
		noise(t, 0.16, 'bandpass', 2400, 900, 0.12, 2);
	};

	// Smashing straight through something while boosting.
	sound.smash = function () {
		sound.resume();
		const t = now();
		tone(t, 0.3, 'sine', 220, 60, 0.5);
		noise(t, 0.4, 'highpass', 3000, 1200, 0.35);
	};

	// The countdown: three beeps and a higher GO.
	sound.beep = function (go) {
		sound.resume();
		const t = now();
		const f = go ? 1320 : 660;
		tone(t, go ? 0.7 : 0.25, 'square', f, f, 0.12, 0.004).connect(echo);
		tone(t, go ? 0.7 : 0.25, 'sine', f / 2, f / 2, 0.2, 0.004);
	};

	// The finish: a rising fanfare.
	sound.finish = function () {
		sound.resume();
		const t = now();
		const notes = [523, 659, 784, 1047, 784, 1047, 1319];
		notes.forEach((f, i) => {
			const len = i === notes.length - 1 ? 1.2 : 0.14;
			tone(t + i * 0.12, len, 'square', f, f, 0.08, 0.005).connect(echo);
			tone(t + i * 0.12, len, 'triangle', f / 2, f / 2, 0.12, 0.005);
		});
		noise(t + 0.84, 1.4, 'highpass', 6000, 3000, 0.12);
	};

	/* ---------- the tune ---------- */

	// A bright, driving loop at 150 bpm: bass, a running arpeggio, drums.
	const BPM = 150;
	const SIXTEENTH = 60 / BPM / 4;
	const CHORDS = [   // a bar each: roots (Hz) and chord tones
		[73.42, [293.66, 369.99, 440, 587.33]],   // D
		[61.74, [246.94, 293.66, 369.99, 493.88]], // Bm
		[49.0, [196, 246.94, 293.66, 392]],        // G
		[55.0, [220, 277.18, 329.63, 440]],        // A
	];
	const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2];
	const musicBus = ctx.createGain();
	musicBus.gain.value = 0;
	musicBus.connect(master);
	let playing = false;
	let nextAt = 0;
	let step = 0;

	sound.music = function (on) {
		sound.resume();
		playing = on;
		musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, on ? 0.05 : 0.6);
		if (on) {
			nextAt = ctx.currentTime + 0.05;
			step = 0;
		}
	};

	function scheduleStep(at, n) {
		const bar = Math.floor(n / 16) % CHORDS.length;
		const s = n % 16;
		const [root, tones] = CHORDS[bar];
		// bass: driving eighths, octave jumps
		if (s % 2 === 0) tone(at, SIXTEENTH * 1.8, 'sawtooth', root * (s % 4 === 2 ? 2 : 1), root * (s % 4 === 2 ? 2 : 1), 0.11, 0.004, musicBus);
		// the arpeggio, up an octave on the second half of every other bar
		const lift = (n >> 4) % 2 && s >= 8 ? 2 : 1;
		tone(at, SIXTEENTH * 0.9, 'square', tones[ARP[s]] * lift, tones[ARP[s]] * lift, 0.035, 0.003, musicBus);
		// drums
		if (s % 4 === 0) tone(at, 0.18, 'sine', 150, 45, 0.55, 0.002, musicBus);
		if (s === 4 || s === 12) noise(at, 0.16, 'bandpass', 1800, 900, 0.25, 0.8, musicBus);
		if (s % 2 === 1) noise(at, 0.04, 'highpass', 8000, 7000, 0.08, 0.7, musicBus);
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
		try { windSrc.stop(); } catch (e) { /* already stopped */ }
		ctx.close().catch(() => {});
	};

	return sound;
}
