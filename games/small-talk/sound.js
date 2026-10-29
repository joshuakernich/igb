/*
 * Small Talk: sound, all synthesised with WebAudio, plus a flat, low voice
 * through speech synthesis.
 *
 *   const sound = createSound();
 *   sound.hum(level);           // the party: a murmuring crowd; 0..1 quieter
 *   sound.party(chatter, music, wonky);   // the party at one point in the night, 0..1 each
 *   sound.radio(buffer, [offset, seconds]);   // the radio, looping that bit of buffer (or off)
 *   sound.alarm(on);            // the fire alarm
 *   sound.blink(seconds);       // the long blink between rounds
 *   sound.thud(strength);  sound.rumble(seconds);
 *   sound.chime();  sound.buzz() (a record scratch);  sound.crackle();  sound.step(gain);
 *   sound.say('Remember everyone');
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

	/* ---------- the party: a crowd murmuring, and muzak ---------- */

	const room = ctx.createGain();
	room.gain.value = 0;
	room.connect(master);
	room.connect(reverb);

	// The crowd: noise through a few voice-like bands, each swelling and
	// fading at its own speaking rate, so it sounds like talk you can't
	// quite make out.
	const chatter = ctx.createGain();
	chatter.gain.value = 0.5;
	chatter.connect(room);
	const babble = noise(4);
	babble.loop = true;
	const lpBabble = ctx.createBiquadFilter();
	lpBabble.type = 'lowpass';
	lpBabble.frequency.value = 2200;
	babble.connect(lpBabble);
	for (const [f, rate] of [[420, 3.1], [650, 4.3], [1050, 2.7], [1600, 5.2], [820, 3.7]]) {
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = f;
		bp.Q.value = 6;
		const g = ctx.createGain();
		g.gain.value = 0.3;
		const lfo = ctx.createOscillator();
		lfo.frequency.value = rate;
		const depth = ctx.createGain();
		depth.gain.value = 0.3;
		lfo.connect(depth).connect(g.gain);
		lfo.start();
		lpBabble.connect(bp).connect(g).connect(chatter);
	}
	babble.start();

	// The radio on the side table: whatever's on for this part of the night,
	// tinny (no bass, no top), a little distorted, hissing, and wobbling the
	// way old tape does; more so later on.
	const music = ctx.createGain();
	music.gain.value = 0.55;
	music.connect(room);
	const lowCut = ctx.createBiquadFilter();
	lowCut.type = 'highpass';
	lowCut.frequency.value = 420;
	const highCut = ctx.createBiquadFilter();
	highCut.type = 'lowpass';
	highCut.frequency.value = 3000;
	const honk = ctx.createBiquadFilter();
	honk.type = 'peaking';
	honk.frequency.value = 1400;
	honk.gain.value = 7;
	const crunch = ctx.createWaveShaper();
	crunch.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh(((i / 1023) * 2 - 1) * 2.2) / Math.tanh(2.2));
	lowCut.connect(highCut).connect(honk).connect(crunch).connect(music);
	const hiss = noise(3);
	hiss.loop = true;
	const hissBand = ctx.createBiquadFilter();
	hissBand.type = 'bandpass';
	hissBand.frequency.value = 3500;
	const hissGain = ctx.createGain();
	hissGain.gain.value = 0.012;
	hiss.connect(hissBand).connect(hissGain).connect(music);
	hiss.start();
	// wow and flutter
	const wow = ctx.createOscillator();
	wow.frequency.value = 0.55;
	const wowDepth = ctx.createGain();
	wowDepth.gain.value = 0.004;
	wow.connect(wowDepth);
	wow.start();
	let detune = 0;
	let track = null;
	// Play [offset, seconds] of `buffer` on the radio, round and round (null: off).
	sound.radio = function (buffer, part) {
		const t = ctx.currentTime;
		if (track) {
			const old = track;
			old.fade.gain.setTargetAtTime(0, t, 0.08);
			setTimeout(() => { try { old.src.stop(); } catch (e) { /* (already stopped) */ } }, 600);
			track = null;
		}
		if (!buffer || !part) return;
		const src = ctx.createBufferSource();
		src.buffer = buffer;
		src.loop = true;
		src.loopStart = part[0];
		src.loopEnd = part[0] + part[1];
		src.playbackRate.value = 1 - detune;
		wowDepth.connect(src.playbackRate);
		const fade = ctx.createGain();
		fade.gain.value = 0;
		fade.gain.setTargetAtTime(1, t, 0.1);
		src.connect(fade).connect(lowCut);
		src.start(t, part[0]);
		track = { src, fade };
	};

	sound.hum = function (level) {
		const t = ctx.currentTime;
		room.gain.setTargetAtTime(0.34 - 0.16 * level, t, 0.6);
		chatter.gain.setTargetAtTime(0.5 * (1 - 0.8 * level), t, 0.8);
	};

	// The party at one point in the night: how much chatter, how loud the
	// music, how far out of tune (0..1 each).
	let musicLevel = 0.55;
	sound.party = function (talk, tune, wonky) {
		const t = ctx.currentTime;
		room.gain.setTargetAtTime(0.34, t, 0.6);
		chatter.gain.setTargetAtTime(0.5 * talk, t, 0.8);
		musicLevel = 0.9 * tune;
		music.gain.setTargetAtTime(musicLevel, t, 0.8);
		detune = 0.03 * wonky;
		wowDepth.gain.setTargetAtTime(0.004 + 0.02 * wonky, t, 0.5);
		if (track) track.src.playbackRate.setTargetAtTime(1 - detune, t, 0.5);
	};

	// The fire alarm: a shrill, pulsing beep, on or off.
	const alarmGain = ctx.createGain();
	alarmGain.gain.value = 0;
	alarmGain.connect(master);
	const siren = ctx.createOscillator();
	siren.type = 'square';
	siren.frequency.value = 2900;
	const sirenBand = ctx.createBiquadFilter();
	sirenBand.type = 'bandpass';
	sirenBand.frequency.value = 2900;
	const pulse = ctx.createGain();
	pulse.gain.value = 0;
	const pulser = ctx.createOscillator();
	pulser.type = 'square';
	pulser.frequency.value = 2.2;
	pulser.connect(pulse.gain);
	siren.connect(sirenBand).connect(pulse).connect(alarmGain);
	siren.start();
	pulser.start();
	sound.alarm = function (on) {
		alarmGain.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, 0.1);
	};

	// The room drops out for a moment (a wrong tap, the lights dying).
	sound.duck = function (amount) {
		const t = ctx.currentTime;
		const v = room.gain.value;
		room.gain.cancelScheduledValues(t);
		room.gain.setValueAtTime(v * (1 - amount), t);
		room.gain.setTargetAtTime(v, t + 0.4, 0.5);
	};

	// The long blink between rounds: the room muffles while the eyes are shut.
	const muffle = ctx.createBiquadFilter();
	muffle.type = 'lowpass';
	muffle.frequency.value = 20000;
	room.disconnect();
	room.connect(muffle);
	muffle.connect(master);
	muffle.connect(reverb);
	sound.blink = function (seconds) {
		sound.resume();
		const t = ctx.currentTime;
		muffle.frequency.cancelScheduledValues(t);
		muffle.frequency.setValueAtTime(20000, t);
		muffle.frequency.exponentialRampToValueAtTime(260, t + seconds * 0.4);
		muffle.frequency.setValueAtTime(260, t + seconds * 0.6);
		muffle.frequency.exponentialRampToValueAtTime(20000, t + seconds);
		// a soft whoosh as the eyes close
		const n = noise(seconds);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.setValueAtTime(900, t);
		bp.frequency.exponentialRampToValueAtTime(200, t + seconds * 0.5);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.2, t + seconds * 0.35);
		g.gain.exponentialRampToValueAtTime(0.0001, t + seconds * 0.7);
		n.connect(bp).connect(g).connect(master);
		n.start(t);
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

	// A wrong tap: the record scratches.
	sound.buzz = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const n = noise(0.45);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 3;
		bp.frequency.setValueAtTime(2600, t);
		bp.frequency.exponentialRampToValueAtTime(350, t + 0.16);
		bp.frequency.exponentialRampToValueAtTime(1900, t + 0.3);
		bp.frequency.exponentialRampToValueAtTime(500, t + 0.42);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
		g.gain.setValueAtTime(0.7, t + 0.36);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
		n.connect(bp).connect(g).connect(master);
		n.start(t);
		sound.duck(0.85);
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
