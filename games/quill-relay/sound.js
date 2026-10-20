/*
 * Quill Relay: the sound, all synthesised (in the manner of Loop Island's
 * sound.js). A boing for a jump, a ping for a ring, the rev of a spin dash
 * winding up and its release, the clatter of a spill, robots popping,
 * springs, the checkpoint's chime, monitors cracking open, and a bouncy
 * chiptune tune scheduled a beat ahead from tick().
 *
 *   const sound = createSound();
 *   sound.jump(); sound.ring(pan); sound.rev(level); sound.dash(); sound.roll();
 *   sound.spill(); sound.pop(); sound.spring(); sound.checkpoint(); sound.monitor();
 *   sound.zip(); sound.go(); sound.music(true); sound.tick();   // tick every frame
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
			p.pan.value = Math.max(-1, Math.min(1, pan));
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

	// A jump: a springy boing, sweeping up with a wobble.
	sound.jump = function () {
		sound.resume();
		const t = now();
		const o = ctx.createOscillator();
		o.type = 'square';
		o.frequency.setValueAtTime(220, t);
		o.frequency.exponentialRampToValueAtTime(880, t + 0.16);
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 28;
		const depth = ctx.createGain();
		depth.gain.value = 40;
		lfo.connect(depth).connect(o.frequency);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
		o.connect(g).connect(master);
		o.start(t); lfo.start(t);
		o.stop(t + 0.3); lfo.stop(t + 0.3);
	};

	// A ring: two quick bright pings, stepping up.
	sound.ring = function (pan = 0) {
		sound.resume();
		const t = now();
		for (const [at, f] of [[0, 1975], [0.06, 2637]]) {
			tone(t + at, 0.3, 'square', f, f, 0.045, 0.002, master, pan).connect(echo);
			tone(t + at, 0.28, 'sine', f * 2, f * 2, 0.035, 0.002, master, pan);
		}
	};

	// The spin dash winding up: a rev that climbs with each charge level (0..1).
	sound.rev = function (level = 0) {
		sound.resume();
		const t = now();
		const f = 160 + level * 520;
		tone(t, 0.22, 'sawtooth', f, f * 2.2, 0.08, 0.005);
		noise(t, 0.2, 'bandpass', 800 + level * 2400, 3000 + level * 3000, 0.18, 2);
	};

	// The release: a whooshing launch.
	sound.dash = function () {
		sound.resume();
		const t = now();
		tone(t, 0.45, 'sawtooth', 900, 120, 0.1, 0.004);
		noise(t, 0.6, 'bandpass', 4000, 400, 0.4, 1.2);
	};

	// Curling up to roll: a short swish.
	sound.roll = function () {
		sound.resume();
		const t = now();
		noise(t, 0.2, 'bandpass', 2600, 900, 0.18, 2);
		tone(t, 0.12, 'square', 500, 300, 0.04);
	};

	// A spill: a thump and rings jangling away.
	sound.spill = function () {
		sound.resume();
		const t = now();
		tone(t, 0.35, 'sine', 180, 50, 0.7);
		noise(t, 0.2, 'lowpass', 2400, 300, 0.4);
		for (let i = 0; i < 10; i++) {
			const f = 1500 + Math.random() * 1500;
			tone(t + 0.04 + i * 0.04, 0.22, 'square', f, f * 0.94, 0.03, 0.002, master, (Math.random() - 0.5) * 1.6);
		}
	};

	// A robot popped: a crunchy burst, a little tune falling away.
	sound.pop = function () {
		sound.resume();
		const t = now();
		noise(t, 0.3, 'lowpass', 5000, 400, 0.5);
		tone(t, 0.25, 'square', 660, 110, 0.07);
		for (const [i, f] of [[0, 1047], [1, 1319], [2, 1568]]) tone(t + 0.08 + i * 0.06, 0.16, 'triangle', f, f, 0.08, 0.003).connect(echo);
	};

	// A spring: a long, wobbly boing.
	sound.spring = function () {
		sound.resume();
		const t = now();
		const o = ctx.createOscillator();
		o.type = 'triangle';
		o.frequency.setValueAtTime(140, t);
		o.frequency.exponentialRampToValueAtTime(1100, t + 0.35);
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 18;
		const depth = ctx.createGain();
		depth.gain.value = 90;
		lfo.connect(depth).connect(o.frequency);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
		o.connect(g).connect(master);
		o.start(t); lfo.start(t);
		o.stop(t + 0.55); lfo.stop(t + 0.55);
	};

	// The checkpoint: a bright ding-ding as its orb spins round.
	sound.checkpoint = function () {
		sound.resume();
		const t = now();
		[1568, 2093, 1568, 2093, 2637].forEach((f, i) => tone(t + i * 0.07, 0.25, 'square', f, f, 0.05, 0.002).connect(echo));
	};

	// A monitor cracking open.
	sound.monitor = function () {
		sound.resume();
		const t = now();
		noise(t, 0.25, 'highpass', 6000, 2000, 0.35);
		tone(t, 0.2, 'sine', 300, 80, 0.4);
		tone(t + 0.1, 0.4, 'square', 1319, 1319, 0.05).connect(echo);
	};

	// Zipping round the corner.
	sound.zip = function () {
		sound.resume();
		const t = now();
		noise(t, 0.5, 'bandpass', 600, 5000, 0.35, 1.4);
		tone(t, 0.4, 'square', 300, 1200, 0.05);
	};

	// GO!: a quick fanfare for the next runner.
	sound.go = function () {
		sound.resume();
		const t = now();
		[[0, 784], [0.1, 988], [0.2, 1175], [0.3, 1568]].forEach(([at, f], i) => {
			tone(t + at, i === 3 ? 0.6 : 0.12, 'square', f, f, 0.07, 0.004).connect(echo);
			tone(t + at, i === 3 ? 0.6 : 0.12, 'triangle', f / 2, f / 2, 0.1, 0.004);
		});
	};

	// Hurt (with nothing to spill): a sad little bloop.
	sound.hurt = function () {
		sound.resume();
		const t = now();
		tone(t, 0.3, 'square', 440, 150, 0.08);
		tone(t, 0.35, 'sine', 160, 60, 0.5);
	};

	/* ---------- the tune ---------- */

	// A bouncy chiptune loop at 144 bpm: triangle bass, a square-wave lead,
	// a pulse arpeggio and noise drums. Eight bars, a chord a bar.
	const BPM = 144;
	const SIXTEENTH = 60 / BPM / 4;
	const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
	const CHORDS = [   // a bar each: bass root (MIDI) and the arpeggio's notes
		[48, [60, 64, 67, 72]],   // C
		[45, [57, 60, 64, 69]],   // Am
		[41, [57, 60, 65, 69]],   // F
		[43, [59, 62, 67, 71]],   // G
		[48, [60, 64, 67, 72]],   // C
		[52, [59, 64, 68, 71]],   // E
		[45, [57, 60, 64, 69]],   // Am
		[43, [59, 62, 65, 71]],   // G7
	];
	// the lead, a sixteenth a step (0: rest, -1: hold): an original hook
	const LEAD = [
		76, -1, 79, -1, 81, 79, 76, -1, 72, -1, 74, 76, -1, -1, 0, 0,
		72, -1, 76, -1, 74, 72, 69, -1, 72, -1, -1, -1, 0, 0, 0, 0,
		77, -1, 76, 74, 72, -1, 74, -1, 76, -1, 72, -1, 69, -1, 0, 0,
		74, -1, 76, -1, 79, -1, 83, -1, 81, -1, 79, -1, 0, 0, 79, 81,
		84, -1, 83, -1, 79, -1, 76, -1, 79, 81, 79, 76, 72, -1, 0, 0,
		80, -1, 83, -1, 88, -1, 83, 80, 76, -1, 80, -1, 83, -1, 0, 0,
		81, -1, 79, 76, 72, -1, 76, -1, 81, -1, 84, -1, 81, -1, 79, -1,
		77, -1, 76, -1, 74, -1, 71, -1, 67, -1, 71, -1, 74, -1, 79, -1,
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
		if (on === playing) return;
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
		const [root, tones] = CHORDS[bar];
		// bass: bouncing octaves on the eighths
		if (s % 2 === 0) {
			const f = N(root + (s % 4 === 2 ? 12 : 0));
			tone(at, SIXTEENTH * 1.7, 'triangle', f, f, 0.22, 0.004, musicBus);
		}
		// the arpeggio, quiet, up high
		const a = N(tones[ARP[s]] + 12);
		tone(at, SIXTEENTH * 0.8, 'square', a, a, 0.014, 0.002, musicBus);
		// the lead: held until the next note or rest
		const li = (bar * 16 + s) % LEAD.length;
		const m = LEAD[li];
		if (m > 0) {
			let held = 1;
			while (LEAD[(li + held) % LEAD.length] === -1 && held < 8) held++;
			const f = N(m);
			const g = tone(at, SIXTEENTH * held * 0.95, 'square', f, f, 0.045, 0.004, musicBus);
			g.connect(echo);
		}
		// drums: kick, snare, hats
		if (s === 0 || s === 8 || s === 10) tone(at, 0.16, 'sine', 160, 45, 0.5, 0.002, musicBus);
		if (s === 4 || s === 12) noise(at, 0.14, 'bandpass', 2200, 1000, 0.22, 0.8, musicBus);
		if (s % 2 === 1) noise(at, 0.035, 'highpass', 8000, 7000, 0.06, 0.7, musicBus);
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
		ctx.close().catch(() => {});
	};

	return sound;
}
