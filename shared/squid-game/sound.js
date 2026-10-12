/*
 * The Squid Game sound, shared by Red Light Green Light, Mingle, Glass Bridge
 * and Tug of War: all synthesised with WebAudio so the games
 * need no audio files, plus the doll's voice through speech synthesis.
 *
 *   const sound = createSound();
 *   sound.gunshot();  sound.whirr(1.2);  sound.blip();  sound.ding();
 *   sound.music(true, rate);  sound.tick();   // call tick() every frame
 *   sound.say('Green light');
 *   sound.close();
 */
export function createSound() {

	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.9;
	master.connect(ctx.destination);

	// A big room for the gunshot to ring around.
	const reverb = ctx.createConvolver();
	reverb.buffer = impulse(2.4, 2.2);
	const reverbOut = ctx.createGain();
	reverbOut.gain.value = 0.45;
	reverb.connect(reverbOut).connect(master);

	function impulse(seconds, decay) {
		const len = Math.floor(ctx.sampleRate * seconds);
		const buf = ctx.createBuffer(2, len, ctx.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = buf.getChannelData(ch);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
		}
		return buf;
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

	function envelope(peak, attack, release, at) {
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, at);
		g.gain.exponentialRampToValueAtTime(peak, at + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
		return g;
	}

	// The building blocks, for other games' sounds (Mingle's carousel music).
	const sound = { ctx, master, reverb, noise, envelope };

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	// A rifle shot: a sharp crack, a body of noise and a low thump, in a big room.
	sound.gunshot = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;

		const crack = noise(0.2);
		const hp = ctx.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.value = 1400;
		const crackEnv = envelope(1.0, 0.002, 0.07, t);
		crack.connect(hp).connect(crackEnv);
		crackEnv.connect(master);
		crackEnv.connect(reverb);
		crack.start(t);

		const body = noise(0.6);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.setValueAtTime(2400, t);
		lp.frequency.exponentialRampToValueAtTime(260, t + 0.35);
		const bodyEnv = envelope(0.9, 0.004, 0.42, t);
		body.connect(lp).connect(bodyEnv);
		bodyEnv.connect(master);
		bodyEnv.connect(reverb);
		body.start(t);

		const thump = ctx.createOscillator();
		thump.type = 'sine';
		thump.frequency.setValueAtTime(150, t);
		thump.frequency.exponentialRampToValueAtTime(42, t + 0.2);
		const thumpEnv = envelope(0.9, 0.003, 0.25, t);
		thump.connect(thumpEnv).connect(master);
		thump.start(t);
		thump.stop(t + 0.4);
	};

	// The motor in the doll's neck, for `seconds`.
	sound.whirr = function (seconds) {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const d = Math.max(0.2, seconds);

		const motor = ctx.createOscillator();
		motor.type = 'sawtooth';
		motor.frequency.setValueAtTime(55, t);
		motor.frequency.linearRampToValueAtTime(95, t + d * 0.5);
		motor.frequency.linearRampToValueAtTime(60, t + d);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 700;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
		g.gain.setValueAtTime(0.22, t + d - 0.08);
		g.gain.exponentialRampToValueAtTime(0.0001, t + d);
		motor.connect(lp).connect(g).connect(master);
		motor.start(t);
		motor.stop(t + d + 0.05);

		const servo = ctx.createOscillator();
		servo.type = 'square';
		servo.frequency.setValueAtTime(420, t);
		servo.frequency.linearRampToValueAtTime(760, t + d);
		const sg = ctx.createGain();
		sg.gain.setValueAtTime(0.0001, t);
		sg.gain.exponentialRampToValueAtTime(0.025, t + 0.08);
		sg.gain.setValueAtTime(0.025, t + d - 0.08);
		sg.gain.exponentialRampToValueAtTime(0.0001, t + d);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 900;
		servo.connect(bp).connect(sg).connect(master);
		servo.start(t);
		servo.stop(t + d + 0.05);

		// a clunk as it stops
		const clunk = noise(0.12);
		const cf = ctx.createBiquadFilter();
		cf.type = 'lowpass';
		cf.frequency.value = 500;
		const ce = envelope(0.5, 0.003, 0.1, t + d);
		clunk.connect(cf).connect(ce).connect(master);
		clunk.start(t + d);
	};

	// A short scanning beep while she watches.
	sound.blip = function () {
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'sine';
		o.frequency.value = 1480;
		const g = envelope(0.12, 0.004, 0.08, t);
		o.connect(g).connect(master);
		o.start(t);
		o.stop(t + 0.12);
	};

	// Two bright notes for crossing the line.
	sound.ding = function () {
		const t = ctx.currentTime + 0.01;
		[[1318.5, 0], [1760, 0.09]].forEach(function ([f, delay]) {
			const o = ctx.createOscillator();
			o.type = 'sine';
			o.frequency.value = f;
			const g = envelope(0.18, 0.005, 0.5, t + delay);
			o.connect(g).connect(master);
			o.start(t + delay);
			o.stop(t + delay + 0.6);
		});
	};

	// A ddakji slapped off the wall: a papery thwack and a bright chime.
	sound.slap = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const smack = noise(0.15);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 1100;
		bp.Q.value = 0.8;
		const e = envelope(0.9, 0.002, 0.09, t);
		smack.connect(bp).connect(e).connect(master);
		smack.start(t);
		[[880, 0.05], [1318.5, 0.12], [1760, 0.19]].forEach(function ([f, delay]) {
			const o = ctx.createOscillator();
			o.type = 'triangle';
			o.frequency.value = f;
			const g = envelope(0.14, 0.004, 0.35, t + delay);
			o.connect(g).connect(master);
			o.start(t + delay);
			o.stop(t + delay + 0.45);
		});
	};

	// A bullet glancing away: a falling, wobbling ping.
	sound.ricochet = function () {
		const t = ctx.currentTime + 0.06;
		const o = ctx.createOscillator();
		o.type = 'sine';
		o.frequency.setValueAtTime(3400, t);
		o.frequency.exponentialRampToValueAtTime(900, t + 0.45);
		const wob = ctx.createOscillator();
		wob.frequency.value = 38;
		const wobGain = ctx.createGain();
		wobGain.gain.value = 120;
		wob.connect(wobGain).connect(o.frequency);
		const g = envelope(0.22, 0.003, 0.45, t);
		o.connect(g).connect(master);
		g.connect(reverb);
		o.start(t);
		wob.start(t);
		o.stop(t + 0.55);
		wob.stop(t + 0.55);
	};

	/* ---------- the music box, playing while her back is turned ---------- */

	// (shift the whole tune by this many semitones: -12 is an octave down)
	sound.musicShift = 0;
	// An original pentatonic tune; null is a rest.
	const TUNE = [
		76, 79, 81, 79, 76, 74, 72, 74,
		76, 79, 81, 84, 81, 79, 76, null,
		74, 76, 79, 76, 74, 72, 69, 72,
		74, 76, 72, 69, 67, null, 67, null,
	];
	let playing = false;
	let rate = 3;
	let nextTime = 0;
	let step = 0;

	function note(midi, at) {
		const f = 440 * Math.pow(2, (midi + sound.musicShift - 69) / 12);
		for (const [mult, type, peak] of [[1, 'triangle', 0.16], [2, 'sine', 0.05], [4.01, 'sine', 0.015]]) {
			const o = ctx.createOscillator();
			o.type = type;
			o.frequency.value = f * mult;
			const g = envelope(peak, 0.004, 0.55, at);
			o.connect(g).connect(master);
			o.start(at);
			o.stop(at + 0.6);
		}
	}

	// Start or stop the tune; rate is notes per second.
	sound.music = function (on, notesPerSecond) {
		if (notesPerSecond) rate = notesPerSecond;
		if (on && !playing) {
			sound.resume();
			nextTime = ctx.currentTime + 0.05;
		}
		playing = on;
	};

	// Schedule the next few notes. Call every frame.
	sound.tick = function () {
		if (!playing) return;
		while (nextTime < ctx.currentTime + 0.15) {
			const midi = TUNE[step % TUNE.length];
			if (midi !== null) note(midi, nextTime);
			step++;
			nextTime += 1 / rate;
		}
	};

	/* ---------- the doll's voice ---------- */

	let voice;
	function pickVoice() {
		if (!window.speechSynthesis) return;
		const voices = speechSynthesis.getVoices();
		voice = voices.find((v) => /^en/i.test(v.lang) && /(female|samantha|victoria|karen|moira|tessa|zira|aria|jenny|google us english)/i.test(v.name))
			|| voices.find((v) => /^en/i.test(v.lang)) || voices[0];
	}
	if (window.speechSynthesis) {
		pickVoice();
		speechSynthesis.onvoiceschanged = pickVoice;
	}

	// the voice's pitch (0 to 2; set lower for a deeper voice), and its echo:
	// the last word said again this many times, each quieter. (Speech can't be
	// put through an audio effect, so the echo is the voice repeating itself.)
	sound.voicePitch = 1.6;
	sound.voiceEcho = 0;
	sound.say = function (text) {
		if (!window.speechSynthesis) return;
		speechSynthesis.cancel();
		const line = function (words, volume, rate) {
			const u = new SpeechSynthesisUtterance(words);
			if (voice) u.voice = voice;
			u.pitch = sound.voicePitch;
			u.rate = rate;
			u.volume = volume;
			speechSynthesis.speak(u);   // (queued: each after the last)
		};
		line(text, 1, 0.9);
		const last = String(text).trim().split(/\s+/).pop().replace(/[^\w']/g, '');
		for (let i = 1; i <= sound.voiceEcho && last; i++) line(last, Math.pow(0.4, i), 1.05);
	};

	sound.close = function () {
		playing = false;
		if (window.speechSynthesis) speechSynthesis.cancel();
		ctx.close().catch(() => {});
	};

	return sound;
}
