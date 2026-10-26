/*
 * Super Sonic Battle: the sound, all synthesised (in the manner of Loop
 * Island's sound.js). The chime of an emerald, the crunch of a hit, missiles
 * launching and blowing up, the shockwave's charge and roll, badniks
 * popping, Robotnik's laugh, the transformation (a rising swirl, each
 * emerald chiming into Sonic, a fiery burst), Super Sonic's dive and the
 * clang as he smashes through, the emeralds spilling out, the hand-over
 * sting; for the finale, the explosion, a huge cinematic braam and a
 * celebratory electric guitar; and a tune scheduled a beat ahead from tick()
 * (a driving minor one on foot, a brighter, faster major one as Super
 * Sonic).
 *
 *   const sound = createSound();
 *   sound.emerald(i, pan);  sound.hurt();  sound.launch();  sound.blast(big);
 *   sound.warn();  sound.charge();  sound.wave();  sound.pop();  sound.laugh();
 *   sound.rise();  sound.merge(i);  sound.ignite();  sound.dive();  sound.clang();
 *   sound.spill();  sound.handover();  sound.boom();  sound.braam();  sound.guitar();
 *   sound.music('foot' | 'super' | false);  sound.wind(0..1);
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

	// a big hall, for the cinematic moments (a generated impulse: noise dying away)
	const hall = ctx.createConvolver();
	{
		const len = Math.floor(ctx.sampleRate * 3.2);
		const buf = ctx.createBuffer(2, len, ctx.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = buf.getChannelData(ch);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
		}
		hall.buffer = buf;
	}
	const hallOut = ctx.createGain();
	hallOut.gain.value = 0.45;
	hall.connect(hallOut).connect(master);

	function noiseBuffer(seconds) {
		const len = Math.floor(ctx.sampleRate * seconds);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		return buf;
	}
	const NOISE = noiseBuffer(2);

	function noise(at, dur, type, f0, f1, peak, q = 1, out = master, attack = 0) {
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
		g.gain.exponentialRampToValueAtTime(peak, at + (attack || Math.min(0.02, dur / 4)));
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		src.connect(f).connect(g).connect(out);
		src.start(at, Math.random());
		src.stop(at + dur + 0.05);
		return g;
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
		windGain.gain.setTargetAtTime(0.015 + level * 0.12, t, 0.15);
		windFilter.frequency.setTargetAtTime(300 + level * 1400, t, 0.15);
	};

	/* ---------- on foot ---------- */

	// An emerald: a glassy run up, higher the more he has.
	const PENTA = [659.25, 783.99, 880, 987.77, 1174.66, 1318.51, 1567.98, 1760];
	sound.emerald = function (i = 0, pan = 0) {
		sound.resume();
		const t = now();
		const base = PENTA[Math.min(i, PENTA.length - 1)];
		[1, 1.5, 2, 3].forEach((k, j) => {
			tone(t + j * 0.05, 0.6, 'sine', base * k, base * k, 0.09 / (1 + j * 0.3), 0.003, master, pan).connect(echo);
			tone(t + j * 0.05, 0.3, 'triangle', base * k * 2, base * k * 2, 0.025, 0.003, master, pan);
		});
		noise(t, 0.4, 'highpass', 9000, 7000, 0.05);
	};

	// Hit: a thump, a crunch, a glassy tinkle (an emerald knocked loose).
	sound.hurt = function () {
		sound.resume();
		const t = now();
		tone(t, 0.4, 'sine', 170, 40, 0.8);
		noise(t, 0.3, 'lowpass', 2600, 300, 0.5);
		for (let i = 0; i < 6; i++) {
			const f = 1800 + Math.random() * 1400;
			tone(t + 0.06 + i * 0.05, 0.25, 'triangle', f, f * 0.92, 0.05, 0.002, master, (Math.random() - 0.5) * 1.6);
		}
	};

	// A missile away: a hiss and a rising whine.
	sound.launch = function (pan = 0) {
		sound.resume();
		const t = now();
		noise(t, 0.7, 'bandpass', 800, 3000, 0.25, 1.5);
		tone(t, 0.6, 'sawtooth', 300, 900, 0.03, 0.02, master, pan);
	};

	// A blast: a deep thump and a roar of noise (big: the boss's own).
	sound.blast = function (big = false, pan = 0) {
		sound.resume();
		const t = now();
		const k = big ? 1.6 : 1;
		tone(t, 0.6 * k, 'sine', 120, 30, 0.9);
		noise(t, 0.7 * k, 'lowpass', 3000, 120, 0.7, 0.8);
		noise(t, 0.25, 'highpass', 4000, 2000, 0.25);
		if (big) noise(t, 1.6, 'lowpass', 900, 80, 0.5, 0.7, hall);
	};

	// The warning before something lands.
	sound.warn = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 2; i++) tone(t + i * 0.14, 0.11, 'square', 1240, 1240, 0.05, 0.003);
	};

	// The machine charging up a shockwave, then the wave rolling out.
	sound.charge = function () {
		sound.resume();
		const t = now();
		tone(t, 1.0, 'sawtooth', 60, 480, 0.08, 0.6);
		tone(t, 1.0, 'square', 90, 720, 0.04, 0.6);
		noise(t, 1.0, 'bandpass', 300, 5000, 0.18, 3, master, 0.8);
	};
	sound.wave = function () {
		sound.resume();
		const t = now();
		tone(t, 1.4, 'sine', 70, 35, 0.7, 0.01);
		noise(t, 1.6, 'lowpass', 1800, 200, 0.45, 0.8, master, 0.02);
	};

	// A badnik smashed: a pop and a spray of springs.
	sound.pop = function () {
		sound.resume();
		const t = now();
		tone(t, 0.15, 'square', 900, 200, 0.12, 0.002);
		noise(t, 0.2, 'highpass', 3000, 1500, 0.3);
		tone(t + 0.05, 0.3, 'triangle', 1200, 2400, 0.05, 0.002);
	};

	// Robotnik: HO HO HO! (a buzzing voice through the formants of an O)
	sound.laugh = function () {
		sound.resume();
		const t = now();
		for (let i = 0; i < 4; i++) {
			const at = t + i * 0.24;
			const f0 = 170 - i * 12;
			const o = ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.setValueAtTime(f0, at);
			o.frequency.exponentialRampToValueAtTime(f0 * 0.82, at + 0.2);
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(0.5, at + 0.03);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
			const mix = ctx.createGain();
			mix.gain.value = 0.5;
			for (const [f, q, v] of [[480, 6, 1], [850, 8, 0.5], [2600, 10, 0.12]]) {
				const bp = ctx.createBiquadFilter();
				bp.type = 'bandpass';
				bp.frequency.value = f;
				bp.Q.value = q;
				const bg = ctx.createGain();
				bg.gain.value = v;
				o.connect(bp).connect(bg).connect(mix);
			}
			mix.connect(g).connect(master);
			g.connect(echo);
			o.start(at);
			o.stop(at + 0.3);
			noise(at - 0.03, 0.06, 'bandpass', 1500, 1200, 0.12, 1);   // (the H)
		}
	};

	/* ---------- the transformation ---------- */

	// Rising off the ground: a long swelling swirl, a choir of fifths.
	sound.rise = function (len = 3.2) {
		sound.resume();
		const t = now();
		noise(t, len, 'bandpass', 200, 6000, 0.35, 2.5, master, len * 0.85);
		for (const [f, v] of [[110, 0.06], [165, 0.05], [220, 0.05], [330, 0.04], [440, 0.03]]) {
			tone(t, len + 0.4, 'sawtooth', f, f * 2, v, len * 0.8, master).connect(hall);
		}
	};

	// An emerald flowing into him: a bright ping, climbing each time.
	sound.merge = function (i = 0) {
		sound.resume();
		const t = now();
		const f = PENTA[Math.min(i, PENTA.length - 1)] * 2;
		tone(t, 0.5, 'sine', f, f, 0.1, 0.002).connect(hall);
		tone(t, 0.2, 'square', f / 2, f / 2, 0.03, 0.002);
	};

	// Landing as Super Sonic: a white-hot boom of fire, a chord ringing out.
	sound.ignite = function () {
		sound.resume();
		const t = now();
		tone(t, 1.0, 'sine', 90, 30, 1.0);
		noise(t, 1.4, 'lowpass', 6000, 200, 0.8, 0.7);
		noise(t, 2.4, 'bandpass', 2000, 400, 0.3, 0.8, hall);
		[440, 554.37, 659.25, 880, 1108.73].forEach((f, i) => {
			tone(t + 0.05, 2.2, 'sawtooth', f, f, 0.03, 0.02).connect(hall);
			tone(t + 0.05 + i * 0.04, 1.2, 'sine', f * 2, f * 2, 0.05, 0.005).connect(echo);
		});
	};

	/* ---------- Super Sonic ---------- */

	// Hurtling at a target: a rising roar.
	sound.dive = function () {
		sound.resume();
		const t = now();
		tone(t, 0.7, 'sawtooth', 110, 880, 0.12, 0.05);
		tone(t, 0.7, 'square', 55, 440, 0.06, 0.05);
		noise(t, 0.9, 'bandpass', 400, 6000, 0.45, 1.2);
	};

	// Smashing straight through: a huge metal clang and a blast.
	sound.clang = function () {
		sound.resume();
		const t = now();
		for (const [k, v] of [[1, 0.5], [2.76, 0.25], [5.4, 0.15], [8.93, 0.08]]) tone(t, 1.4 / (1 + k * 0.2), 'triangle', 180 * k, 178 * k, v, 0.002).connect(hall);
		tone(t, 0.6, 'sine', 140, 30, 1.0);
		noise(t, 0.8, 'lowpass', 5000, 200, 0.7, 0.7);
	};

	// The emeralds bursting back out of him: a falling run, a whoosh.
	sound.spill = function () {
		sound.resume();
		const t = now();
		[...PENTA].reverse().forEach((f, i) => tone(t + i * 0.05, 0.4, 'sine', f * 2, f, 0.06, 0.003).connect(echo));
		noise(t, 1.0, 'bandpass', 5000, 300, 0.3, 1.2);
		tone(t, 1.0, 'sawtooth', 660, 110, 0.06, 0.02);
	};

	// The hand-over: a quick rising sting.
	sound.handover = function () {
		sound.resume();
		const t = now();
		[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
			tone(t + i * 0.08, i === 3 ? 0.7 : 0.15, 'square', f, f, 0.07, 0.004).connect(echo);
			tone(t + i * 0.08, i === 3 ? 0.7 : 0.15, 'triangle', f / 2, f / 2, 0.1, 0.004);
		});
	};

	/* ---------- the finale ---------- */

	// The machine going up: a vast rumbling explosion.
	sound.boom = function () {
		sound.resume();
		const t = now();
		tone(t, 2.5, 'sine', 70, 20, 1.0, 0.005);
		tone(t, 1.2, 'sine', 160, 40, 0.6, 0.002);
		noise(t, 3.0, 'lowpass', 8000, 60, 0.9, 0.6);
		noise(t, 4.0, 'lowpass', 1200, 60, 0.6, 0.6, hall);
		for (let i = 0; i < 6; i++) noise(t + 0.3 + i * 0.25 + Math.random() * 0.15, 0.6, 'lowpass', 2000, 150, 0.35, 0.7);
	};

	// The logo landing: a huge cinematic braam (a wall of detuned brass,
	// opening up and closing again), a sub drop and an impact.
	sound.braam = function () {
		sound.resume();
		const t = now();
		const len = 4.2;
		const bus = ctx.createGain();
		bus.gain.setValueAtTime(0.0001, t);
		bus.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
		bus.gain.setTargetAtTime(0.0001, t + 1.4, 0.9);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.Q.value = 2;
		lp.frequency.setValueAtTime(180, t);
		lp.frequency.exponentialRampToValueAtTime(2600, t + 0.25);
		lp.frequency.exponentialRampToValueAtTime(500, t + len);
		bus.connect(lp);
		lp.connect(master);
		lp.connect(hall);
		for (const f of [41.2, 55, 82.41, 110, 164.81]) {
			for (const d of [-7, 0, 7]) {
				const o = ctx.createOscillator();
				o.type = 'sawtooth';
				o.frequency.value = f;
				o.detune.value = d;
				o.connect(bus);
				o.start(t);
				o.stop(t + len + 0.1);
			}
		}
		tone(t, 2.5, 'sine', 60, 28, 1.0, 0.005);
		noise(t, 0.5, 'lowpass', 6000, 300, 0.8, 0.7);
		noise(t, 2.5, 'bandpass', 3000, 500, 0.15, 0.6, hall);
	};

	// The celebratory guitar: power chords through a hot amp, then a lead
	// lick screaming up to a long bent note with vibrato.
	const amp = (function () {
		const drive = ctx.createWaveShaper();
		const n = 1024;
		const curve = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const x = i / (n - 1) * 2 - 1;
			curve[i] = Math.tanh(x * 9) * 0.8;
		}
		drive.curve = curve;
		drive.oversample = '4x';
		const pre = ctx.createGain();
		pre.gain.value = 1.4;
		const hp = ctx.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.value = 90;
		const mid = ctx.createBiquadFilter();
		mid.type = 'peaking';
		mid.frequency.value = 1100;
		mid.gain.value = 6;
		mid.Q.value = 0.8;
		const cab = ctx.createBiquadFilter();
		cab.type = 'lowpass';
		cab.frequency.value = 4200;
		cab.Q.value = 0.9;
		const out = ctx.createGain();
		out.gain.value = 0.22;
		pre.connect(hp).connect(drive).connect(mid).connect(cab).connect(out);
		out.connect(master);
		out.connect(hall);
		out.connect(echo);
		return pre;
	})();
	// A plucked string at f (Hz), from at, for len seconds; bend: Hz to slide up to, vib: vibrato depth (Hz).
	function string(at, f, len, vol, { bend = 0, bendAt = 0.1, vib = 0, vibAt = 0.3 } = {}) {
		for (const d of [-6, 5]) {
			const o = ctx.createOscillator();
			o.type = 'sawtooth';
			o.detune.value = d;
			o.frequency.setValueAtTime(f, at);
			if (bend) {
				o.frequency.setValueAtTime(f, at + bendAt);
				o.frequency.exponentialRampToValueAtTime(bend, at + bendAt + 0.18);
			}
			if (vib) {
				const lfo = ctx.createOscillator();
				lfo.frequency.value = 6;
				const lg = ctx.createGain();
				lg.gain.setValueAtTime(0, at);
				lg.gain.setValueAtTime(0, at + vibAt);
				lg.gain.linearRampToValueAtTime(vib, at + vibAt + 0.4);
				lfo.connect(lg).connect(o.frequency);
				lfo.start(at);
				lfo.stop(at + len + 0.1);
			}
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
			g.gain.setTargetAtTime(vol * 0.55, at + 0.02, 0.25);
			g.gain.setTargetAtTime(0.0001, at + len - 0.08, 0.06);
			o.connect(g).connect(amp);
			o.start(at);
			o.stop(at + len + 0.4);
		}
	}
	const powerChord = (at, root, len, vol = 0.32) => { for (const k of [1, 1.5, 2]) string(at, root * k, len, vol / (k === 1 ? 1 : 1.3)); };
	sound.guitar = function () {
		sound.resume();
		const t = now();
		const b = 60 / 150;   // (a beat, at 150 bpm)
		const E = 82.41, G = 98.0, A = 110.0, B = 123.47, D = 146.83;
		// the chords: E, E, G A, B (ringing), D, E (ringing)
		const chords = [[0, E, 0.5], [0.75, E, 0.25], [1, G, 0.5], [1.5, A, 0.5], [2, B, 1.4], [3.5, D, 0.5], [4, E, 3.2]];
		for (const [at, root, len] of chords) powerChord(t + at * b, root, len * b);
		// the lead over the last chord: a run up, a bend, a long screaming note
		const lead = [[4.0, 659.25, 0.25], [4.25, 783.99, 0.25], [4.5, 880, 0.25], [4.75, 987.77, 0.25], [5.0, 1174.66, 0.5]];
		for (const [at, f, len] of lead) string(t + at * b, f, len * b + 0.05, 0.12);
		string(t + 5.5 * b, 1174.66, 3.2, 0.14, { bend: 1318.51, bendAt: 0.12, vib: 14, vibAt: 0.5 });
		// drums under it: kicks on the chords, a crash at the top and the end
		for (const [at] of chords) {
			tone(t + at * b, 0.3, 'sine', 140, 40, 0.7, 0.002);
			noise(t + at * b, 0.12, 'bandpass', 2000, 1000, 0.15, 0.8);
		}
		noise(t, 2.2, 'highpass', 7000, 4000, 0.18, 0.7, hall);
		noise(t + 4 * b, 2.6, 'highpass', 7000, 4000, 0.2, 0.7, hall);
	};

	/* ---------- the tune ---------- */

	// On foot: a driving E minor at 160 bpm. Super Sonic: a bright A major at
	// 176, the arpeggio up an octave, a sawtooth lead over it.
	const TUNES = {
		foot: {
			bpm: 160,
			chords: [   // a bar each: roots (Hz) and chord tones
				[82.41, [329.63, 392, 493.88, 659.25]],   // Em
				[65.41, [261.63, 329.63, 392, 523.25]],   // C
				[73.42, [293.66, 369.99, 440, 587.33]],   // D
				[61.74, [246.94, 311.13, 369.99, 493.88]],   // B
			],
			lift: 1,
		},
		super: {
			bpm: 176,
			chords: [
				[55.0, [440, 554.37, 659.25, 880]],       // A
				[73.42, [440, 587.33, 739.99, 880]],      // D
				[61.74, [493.88, 587.33, 739.99, 987.77]],   // Bm
				[82.41, [493.88, 659.25, 830.61, 987.77]],   // E
			],
			lift: 2,
			lead: [880, 0, 987.77, 1108.73, 0, 1318.51, 0, 1108.73, 987.77, 0, 880, 0, 739.99, 880, 0, 0],
		},
	};
	const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2];
	const musicBus = ctx.createGain();
	musicBus.gain.value = 0;
	musicBus.connect(master);
	let tune = null;
	let nextAt = 0;
	let step = 0;

	sound.music = function (which) {
		sound.resume();
		const was = tune;
		tune = which ? TUNES[which] : null;
		musicBus.gain.setTargetAtTime(tune ? 0.5 : 0, ctx.currentTime, tune ? 0.05 : 0.5);
		if (tune && tune !== was) {
			nextAt = ctx.currentTime + 0.05;
			step = 0;
		}
	};

	function scheduleStep(at, n) {
		const sixteenth = 60 / tune.bpm / 4;
		const bar = Math.floor(n / 16) % tune.chords.length;
		const s = n % 16;
		const [root, tones] = tune.chords[bar];
		// bass: driving eighths, octave jumps
		if (s % 2 === 0) tone(at, sixteenth * 1.8, 'sawtooth', root * (s % 4 === 2 ? 2 : 1), root * (s % 4 === 2 ? 2 : 1), 0.11, 0.004, musicBus);
		const lift = (n >> 4) % 2 && s >= 8 ? tune.lift * 1 : 1;
		tone(at, sixteenth * 0.9, 'square', tones[ARP[s]] * lift, tones[ARP[s]] * lift, 0.03, 0.003, musicBus);
		if (tune.lead && (n >> 5) % 2) {
			const f = tune.lead[s];
			if (f) tone(at, sixteenth * 1.9, 'sawtooth', f, f, 0.025, 0.01, musicBus).connect(echo);
		}
		// drums
		if (s % 4 === 0) tone(at, 0.18, 'sine', 150, 45, 0.55, 0.002, musicBus);
		if (s === 4 || s === 12) noise(at, 0.16, 'bandpass', 1800, 900, 0.25, 0.8, musicBus);
		if (s % 2 === 1) noise(at, 0.04, 'highpass', 8000, 7000, 0.08, 0.7, musicBus);
	}

	sound.tick = function () {
		if (!tune) return;
		const ahead = ctx.currentTime + 0.15;
		if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.02;   // (after a stall, pick up from now)
		while (nextAt < ahead) {
			scheduleStep(nextAt, step);
			step++;
			nextAt += 60 / tune.bpm / 4;
		}
	};

	sound.close = function () {
		try { windSrc.stop(); } catch (e) { /* already stopped */ }
		ctx.close().catch(() => {});
	};

	return sound;
}
