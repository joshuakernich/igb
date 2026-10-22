/*
 * Iron Stride: the sound, all synthesised (in the manner of Loop Island's).
 * The hum of the servos (louder the harder the legs work), the stomp of each
 * footstep, the whoosh of a missile, the boom of a blast, the Klankbots'
 * zaps and mortar thunks, the clang of a hit on the hull, the alarm, the
 * reboot, a lock-on blip, and a heavy, driving tune scheduled from tick().
 *
 *   const sound = createSound();
 *   sound.stomp(); sound.launch(pan); sound.boom(near, pan); sound.zap(pan);
 *   sound.thunk(pan); sound.clang(); sound.alarm(); sound.powerDown();
 *   sound.powerUp(); sound.lock(); sound.wave(); sound.servo(0..1);
 *   sound.chime(); sound.shield(pan); sound.shieldDown();
 *   sound.music(on); sound.tick();   // every frame
 */
export function createSound() {
	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.8;
	const comp = ctx.createDynamicsCompressor();
	master.connect(comp).connect(ctx.destination);

	function noiseBuffer(seconds) {
		const len = Math.floor(ctx.sampleRate * seconds);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		return buf;
	}
	const NOISE = noiseBuffer(2);

	function out(pan) {
		if (!pan || !ctx.createStereoPanner) return master;
		const p = ctx.createStereoPanner();
		p.pan.value = Math.max(-1, Math.min(1, pan));
		p.connect(master);
		return p;
	}

	function noise(at, dur, type, f0, f1, peak, q = 1, dest = master) {
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
		src.connect(f).connect(g).connect(dest);
		src.start(at, Math.random());
		src.stop(at + dur + 0.05);
	}

	function tone(at, dur, type, f0, f1, peak, attack = 0.005, dest = master) {
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(f0, at);
		if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, at);
		g.gain.exponentialRampToValueAtTime(peak, at + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		o.connect(g).connect(dest);
		o.start(at);
		o.stop(at + dur + 0.05);
		return g;
	}

	const sound = { ctx };
	const now = () => ctx.currentTime + 0.01;

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	// The servos: a low whine always running; servo(level) sets how hard.
	const servoOsc = ctx.createOscillator();
	servoOsc.type = 'sawtooth';
	servoOsc.frequency.value = 70;
	const servoFilter = ctx.createBiquadFilter();
	servoFilter.type = 'bandpass';
	servoFilter.Q.value = 3;
	servoFilter.frequency.value = 300;
	const servoGain = ctx.createGain();
	servoGain.gain.value = 0;
	servoOsc.connect(servoFilter).connect(servoGain).connect(master);
	servoOsc.start();
	// and the cockpit's hum
	const humSrc = ctx.createBufferSource();
	humSrc.buffer = NOISE;
	humSrc.loop = true;
	const humFilter = ctx.createBiquadFilter();
	humFilter.type = 'lowpass';
	humFilter.frequency.value = 160;
	const humGain = ctx.createGain();
	humGain.gain.value = 0;
	humSrc.connect(humFilter).connect(humGain).connect(master);
	humSrc.start();
	sound.servo = function (level, inside) {
		const t = ctx.currentTime;
		servoGain.gain.setTargetAtTime(level * 0.06, t, 0.1);
		servoOsc.frequency.setTargetAtTime(60 + level * 70, t, 0.15);
		servoFilter.frequency.setTargetAtTime(250 + level * 700, t, 0.15);
		humGain.gain.setTargetAtTime(inside ? 0.12 : 0, t, 0.4);
	};

	// A footstep: a heavy thump and a clank.
	sound.stomp = function (big = 1) {
		sound.resume();
		const t = now();
		tone(t, 0.45, 'sine', 85, 32, 0.7 * big);
		noise(t, 0.3, 'lowpass', 900, 120, 0.35 * big);
		tone(t + 0.02, 0.12, 'square', 190, 150, 0.04 * big);
		noise(t + 0.03, 0.18, 'bandpass', 2600, 1800, 0.05 * big, 6);
	};

	// A missile away: a hiss rushing up and away.
	sound.launch = function (pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		noise(t, 0.6, 'bandpass', 600, 5000, 0.35, 1.4, o);
		tone(t, 0.25, 'sawtooth', 220, 880, 0.06, 0.004, o);
		tone(t, 0.12, 'sine', 140, 60, 0.4, 0.002, o);
	};

	// A blast: closer is bigger.
	sound.boom = function (near = 1, pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		const k = 0.25 + 0.75 * near;
		tone(t, 0.9, 'sine', 110, 28, 0.9 * k, 0.003, o);
		noise(t, 1.1, 'lowpass', 2400, 140, 0.8 * k, 0.7, o);
		noise(t, 0.25, 'highpass', 5000, 2000, 0.2 * k, 0.7, o);
	};

	// A Klankbot's zap.
	sound.zap = function (pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		tone(t, 0.22, 'square', 1400, 260, 0.05, 0.002, o);
		tone(t, 0.22, 'sawtooth', 700, 130, 0.04, 0.002, o);
	};

	// A crab's mortar going off.
	sound.thunk = function (pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		tone(t, 0.3, 'sine', 160, 50, 0.4, 0.002, o);
		noise(t, 0.2, 'lowpass', 1200, 300, 0.2, 1, o);
	};

	// A hit on the hull: a clang and a crunch.
	sound.clang = function () {
		sound.resume();
		const t = now();
		for (const f of [310, 467, 733, 1121]) tone(t, 0.9, 'sine', f, f * 0.97, 0.12, 0.002);
		noise(t, 0.35, 'bandpass', 3000, 800, 0.5, 1.2);
		tone(t, 0.4, 'sine', 90, 40, 0.6, 0.002);
	};

	sound.alarm = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 3; i++) {
			tone(t + i * 0.28, 0.13, 'square', 880, 880, 0.06, 0.004);
			tone(t + i * 0.28 + 0.14, 0.13, 'square', 660, 660, 0.06, 0.004);
		}
	};

	sound.powerDown = function () {
		sound.resume();
		const t = now();
		tone(t, 1.6, 'sawtooth', 440, 40, 0.12, 0.01);
		tone(t, 1.6, 'square', 220, 25, 0.05, 0.01);
		noise(t, 0.6, 'lowpass', 3000, 200, 0.3);
	};

	sound.powerUp = function () {
		sound.resume();
		const t = now();
		tone(t, 1.0, 'sawtooth', 60, 520, 0.09, 0.05);
		tone(t + 0.9, 0.3, 'square', 1046, 1046, 0.05, 0.004);
		tone(t + 1.05, 0.4, 'square', 1568, 1568, 0.05, 0.004);
	};

	sound.lock = function (pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		tone(t, 0.07, 'square', 1760, 1760, 0.04, 0.002, o);
		tone(t + 0.08, 0.07, 'square', 2349, 2349, 0.04, 0.002, o);
	};

	sound.denied = function () {
		sound.resume();
		const t = now();
		tone(t, 0.25, 'square', 140, 120, 0.08, 0.004);
	};

	// A new wave: a klaxon blare.
	sound.wave = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 2; i++) {
			tone(t + i * 0.5, 0.42, 'sawtooth', 300, 420, 0.1, 0.03);
			tone(t + i * 0.5, 0.42, 'sawtooth', 302, 424, 0.08, 0.03);
		}
	};

	// An emerald fragment picked up: a bright, rising sparkle.
	sound.chime = function () {
		sound.resume();
		const t = now();
		[1318.5, 1760, 2093, 2637].forEach((f, i) => {
			tone(t + i * 0.07, 0.5, 'sine', f, f, 0.09, 0.003);
			tone(t + i * 0.07, 0.3, 'triangle', f * 2, f * 2, 0.03, 0.003);
		});
		noise(t + 0.25, 0.6, 'highpass', 9000, 6000, 0.05);
	};

	// A missile splashing harmlessly off a shield.
	sound.shield = function (pan = 0) {
		sound.resume();
		const t = now();
		const o = out(pan);
		tone(t, 0.35, 'sine', 320, 180, 0.2, 0.003, o);
		tone(t, 0.35, 'square', 643, 361, 0.03, 0.003, o);
		noise(t, 0.3, 'bandpass', 2500, 900, 0.15, 3, o);
	};

	// A shield failing: a falling whine and a fizz.
	sound.shieldDown = function () {
		sound.resume();
		const t = now();
		tone(t, 1.1, 'sawtooth', 900, 70, 0.1, 0.01);
		tone(t, 1.1, 'sine', 450, 35, 0.2, 0.01);
		noise(t, 0.9, 'highpass', 6000, 800, 0.2);
	};

	/* ---------- the tune ---------- */

	// A heavy, driving loop at 128 bpm: a chugging bass, stabs, drums.
	const BPM = 128;
	const SIXTEENTH = 60 / BPM / 4;
	const ROOTS = [55, 55, 65.41, 49];       // A, A, C, G
	const STAB = [[220, 261.63, 329.63], [220, 261.63, 329.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
	const musicBus = ctx.createGain();
	musicBus.gain.value = 0;
	musicBus.connect(master);
	let playing = false;
	let nextAt = 0;
	let step = 0;

	sound.music = function (on) {
		sound.resume();
		playing = on;
		musicBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, on ? 0.05 : 0.6);
		if (on) {
			nextAt = ctx.currentTime + 0.05;
			step = 0;
		}
	};

	function scheduleStep(at, n) {
		const bar = Math.floor(n / 16) % ROOTS.length;
		const s = n % 16;
		const root = ROOTS[bar];
		// the chug: sixteenths, accents on the beat
		if (s !== 7 && s !== 15) tone(at, SIXTEENTH * 0.8, 'sawtooth', root, root, s % 4 === 0 ? 0.13 : 0.07, 0.003, musicBus);
		// stabs on the off-beats of the second half
		if (s === 6 || s === 10 || s === 14) for (const f of STAB[bar]) tone(at, SIXTEENTH * 1.5, 'square', f, f, 0.022, 0.003, musicBus);
		// drums
		if (s === 0 || s === 8 || s === 11) tone(at, 0.2, 'sine', 140, 40, 0.6, 0.002, musicBus);
		if (s === 4 || s === 12) noise(at, 0.2, 'bandpass', 1600, 700, 0.3, 0.8, musicBus);
		if (s % 2 === 0) noise(at, 0.035, 'highpass', 8000, 7000, 0.06, 0.7, musicBus);
	}

	sound.tick = function () {
		if (!playing) return;
		const ahead = ctx.currentTime + 0.15;
		if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.02;
		while (nextAt < ahead) {
			scheduleStep(nextAt, step);
			step++;
			nextAt += SIXTEENTH;
		}
	};

	sound.close = function () {
		try { servoOsc.stop(); humSrc.stop(); } catch (e) { /* already stopped */ }
		ctx.close().catch(() => {});
	};

	return sound;
}
