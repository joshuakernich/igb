/*
 * Backrooms: sound, all synthesised with WebAudio, plus a flat, low voice
 * through speech synthesis.
 *
 *   const sound = createSound();
 *   sound.hum(level);           // the fluorescent buzz, 0..1 louder and rougher
 *   sound.thud(strength);       // the camera dropping through a floor
 *   sound.rumble(seconds);      // the long fall between floors
 *   sound.chime();  sound.buzz();  sound.crackle();  sound.step(gain);
 *   sound.say('Remember everything');
 *   sound.close();
 */
export function createSound() {

	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();
	const master = ctx.createGain();
	master.gain.value = 0.9;
	master.connect(ctx.destination);

	// A long, empty room.
	const reverb = ctx.createConvolver();
	reverb.buffer = impulse(3.2, 2.6);
	const reverbOut = ctx.createGain();
	reverbOut.gain.value = 0.5;
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

	const sound = { ctx, master, reverb, noise, envelope };

	sound.resume = function () {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	};

	/* ---------- the hum: mains at 60 Hz and the ballasts' 120 Hz buzz ---------- */

	const humGain = ctx.createGain();
	humGain.gain.value = 0;
	humGain.connect(master);
	const mains = ctx.createOscillator();
	mains.frequency.value = 60;
	const mainsGain = ctx.createGain();
	mainsGain.gain.value = 0.5;
	mains.connect(mainsGain).connect(humGain);
	const ballast = ctx.createOscillator();
	ballast.type = 'sawtooth';
	ballast.frequency.value = 120;
	const buzzBand = ctx.createBiquadFilter();
	buzzBand.type = 'bandpass';
	buzzBand.frequency.value = 2400;
	buzzBand.Q.value = 1.4;
	const ballastGain = ctx.createGain();
	ballastGain.gain.value = 0.22;
	ballast.connect(buzzBand).connect(ballastGain).connect(humGain);
	// a slow wobble, so it never quite settles
	const wobble = ctx.createOscillator();
	wobble.frequency.value = 0.23;
	const wobbleGain = ctx.createGain();
	wobbleGain.gain.value = 0.08;
	wobble.connect(wobbleGain).connect(ballastGain.gain);
	mains.start();
	ballast.start();
	wobble.start();

	sound.hum = function (level) {
		const t = ctx.currentTime;
		humGain.gain.setTargetAtTime(0.09 + 0.1 * level, t, 0.6);
		buzzBand.frequency.setTargetAtTime(2400 + 1600 * level, t, 0.6);
	};

	// Stutter the hum with the lights.
	sound.duck = function (amount) {
		humGain.gain.setValueAtTime(humGain.gain.value * (1 - amount), ctx.currentTime);
	};

	/* ---------- one-shots ---------- */

	// Dropping through carpet and tile: a low, padded thud.
	sound.thud = function (strength = 1) {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'sine';
		o.frequency.setValueAtTime(95, t);
		o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
		const g = envelope(0.8 * strength, 0.005, 0.4, t);
		o.connect(g).connect(master);
		g.connect(reverb);
		o.start(t);
		o.stop(t + 0.5);
		const n = noise(0.3);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 320;
		const ng = envelope(0.6 * strength, 0.003, 0.22, t);
		n.connect(lp).connect(ng).connect(master);
		n.start(t);
	};

	// The fall between floors: a dark swell of rushing noise.
	sound.rumble = function (seconds) {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const n = noise(seconds + 0.5);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.setValueAtTime(120, t);
		lp.frequency.linearRampToValueAtTime(600, t + seconds * 0.5);
		lp.frequency.linearRampToValueAtTime(140, t + seconds);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.35, t + seconds * 0.45);
		g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
		n.connect(lp).connect(g).connect(master);
		n.start(t);
		n.stop(t + seconds + 0.2);
	};

	// A difference found: a soft, glassy chime.
	sound.chime = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		[[784, 0], [1175, 0.07], [1568, 0.14]].forEach(function ([f, delay]) {
			const o = ctx.createOscillator();
			o.type = 'sine';
			o.frequency.value = f;
			const g = envelope(0.16, 0.006, 1.1, t + delay);
			o.connect(g).connect(master);
			g.connect(reverb);
			o.start(t + delay);
			o.stop(t + delay + 1.2);
		});
	};

	// A wrong tap: an ugly electrical buzz.
	sound.buzz = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		for (const f of [98, 103.5]) {
			const o = ctx.createOscillator();
			o.type = 'square';
			o.frequency.value = f;
			const lp = ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 1400;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
			g.gain.setValueAtTime(0.16, t + 0.32);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
			o.connect(lp).connect(g).connect(master);
			o.start(t);
			o.stop(t + 0.45);
		}
		sound.crackle();
	};

	// A tube sputtering.
	sound.crackle = function () {
		const t = ctx.currentTime + 0.01;
		for (let i = 0; i < 4; i++) {
			const at = t + Math.random() * 0.3;
			const n = noise(0.04);
			const hp = ctx.createBiquadFilter();
			hp.type = 'highpass';
			hp.frequency.value = 2500;
			const g = envelope(0.12, 0.002, 0.03, at);
			n.connect(hp).connect(g).connect(master);
			n.start(at);
		}
	};

	// A footstep somewhere far off, behind the walls.
	sound.step = function (gain) {
		const t = ctx.currentTime + 0.01;
		const n = noise(0.2);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 260;
		const g = envelope(gain, 0.004, 0.16, t);
		n.connect(lp).connect(g);
		g.connect(reverb);
		g.connect(master);
		n.start(t);
	};

	// The last seconds ticking away.
	sound.tick = function () {
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'square';
		o.frequency.value = 1900;
		const g = envelope(0.04, 0.002, 0.03, t);
		o.connect(g).connect(master);
		o.start(t);
		o.stop(t + 0.06);
	};

	/* ---------- the voice ---------- */

	let voice;
	function pickVoice() {
		if (!window.speechSynthesis) return;
		const voices = speechSynthesis.getVoices();
		voice = voices.find((v) => /^en/i.test(v.lang) && /(daniel|fred|alex|male|ralph|aaron|arthur|guy|david)/i.test(v.name))
			|| voices.find((v) => /^en/i.test(v.lang)) || voices[0];
	}
	if (window.speechSynthesis) {
		pickVoice();
		speechSynthesis.onvoiceschanged = pickVoice;
	}

	sound.say = function (text) {
		if (!window.speechSynthesis) return;
		speechSynthesis.cancel();
		const u = new SpeechSynthesisUtterance(text);
		if (voice) u.voice = voice;
		u.pitch = 0.2;
		u.rate = 0.72;
		u.volume = 1;
		speechSynthesis.speak(u);
	};

	sound.close = function () {
		if (window.speechSynthesis) speechSynthesis.cancel();
		ctx.close().catch(() => {});
	};

	return sound;
}
