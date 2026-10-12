/*
 * Mingle: sound. Red Light Green Light's synthesised sounds (the gunshot,
 * the chimes, the announcer's voice), plus the carousel's waltz, the doors
 * and the countdown.
 *
 *   const sound = createSound();
 *   sound.music(true, tempo);  sound.tick();   // call tick() every frame
 *   sound.doors(true);  sound.slam();  sound.count(urgent);  sound.buzz();
 */
import { createSound as createBase } from '../../shared/squid-game/sound.js';

export function createSound() {
	const sound = createBase();
	const { ctx, master, reverb, noise, envelope } = sound;

	/* ---------- the carousel's waltz ---------- */

	// An original tune in 3/4 over an oom-pah-pah bass; a bar per line.
	// Each step is a beat: [melody (midi or null), bass root].
	const TUNE = [
		[79, 48], [76, 48], [77, 48],
		[79, 48], [84, 48], [83, 48],
		[81, 53], [77, 53], [81, 53],
		[79, 48], [null, 48], [76, 48],
		[74, 55], [77, 55], [76, 55],
		[74, 55], [71, 55], [74, 55],
		[76, 48], [79, 48], [77, 50],
		[76, 48], [72, 48], [null, 48],
	];

	let playing = false;
	let tempo = 2.6;      // beats per second
	let nextTime = 0;
	let step = 0;

	function chime(midi, at, peak) {
		const f = 440 * Math.pow(2, (midi - 69) / 12);
		for (const [mult, type, p] of [[1, 'triangle', peak], [2, 'sine', peak * 0.4], [3.01, 'sine', peak * 0.12]]) {
			const o = ctx.createOscillator();
			o.type = type;
			o.frequency.value = f * mult;
			const g = envelope(p, 0.004, 0.5, at);
			o.connect(g).connect(master);
			o.start(at);
			o.stop(at + 0.6);
		}
	}

	function pluck(midi, at, peak) {
		const o = ctx.createOscillator();
		o.type = 'square';
		o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 900;
		const g = envelope(peak, 0.005, 0.22, at);
		o.connect(lp).connect(g).connect(master);
		o.start(at);
		o.stop(at + 0.3);
	}

	// Start or stop the waltz; tempo in beats per second.
	sound.music = function (on, beatsPerSecond) {
		if (beatsPerSecond) tempo = beatsPerSecond;
		if (on && !playing) {
			sound.resume();
			nextTime = ctx.currentTime + 0.05;
			step = 0;
		}
		playing = on;
	};

	const baseTick = sound.tick;
	sound.tick = function () {
		baseTick();
		if (!playing) return;
		while (nextTime < ctx.currentTime + 0.15) {
			const [melody, root] = TUNE[step % TUNE.length];
			const beat = step % 3;
			if (melody !== null) chime(melody, nextTime, 0.13);
			// oom on the first beat, pah-pah (a fifth up and the octave) after
			pluck(beat === 0 ? root - 12 : root + (beat === 1 ? 7 : 12), nextTime, beat === 0 ? 0.12 : 0.06);
			step++;
			nextTime += 1 / tempo;
		}
	};

	// The music box winding down as the carousel stops.
	sound.windDown = function () {
		const t = ctx.currentTime + 0.01;
		[79, 76, 72, 67].forEach(function (m, i) {
			const at = t + i * (0.22 + i * 0.08);
			const o = ctx.createOscillator();
			o.type = 'triangle';
			o.frequency.setValueAtTime(440 * Math.pow(2, (m - 69) / 12), at);
			o.frequency.exponentialRampToValueAtTime(440 * Math.pow(2, (m - 70.5) / 12), at + 0.4);
			const g = envelope(0.12, 0.004, 0.5, at);
			o.connect(g).connect(master);
			o.start(at);
			o.stop(at + 0.6);
		});
	};

	/* ---------- doors ---------- */

	// The doors sliding open (or shut): a soft pneumatic hiss.
	sound.doors = function () {
		const t = ctx.currentTime + 0.01;
		const hiss = noise(0.6);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.setValueAtTime(2600, t);
		bp.frequency.exponentialRampToValueAtTime(900, t + 0.5);
		const g = envelope(0.25, 0.04, 0.5, t);
		hiss.connect(bp).connect(g).connect(master);
		hiss.start(t);
	};

	// A door slamming shut: a heavy thud in the big room.
	sound.slam = function (delay = 0) {
		const t = ctx.currentTime + 0.01 + delay;
		const thud = noise(0.3);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 380;
		const g = envelope(0.9, 0.003, 0.22, t);
		thud.connect(lp).connect(g);
		g.connect(master);
		g.connect(reverb);
		thud.start(t);
		const o = ctx.createOscillator();
		o.frequency.setValueAtTime(110, t);
		o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
		const og = envelope(0.6, 0.002, 0.18, t);
		o.connect(og).connect(master);
		o.start(t);
		o.stop(t + 0.25);
	};

	// The countdown: a tick, sharper in the last few seconds.
	sound.count = function (urgent) {
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = urgent ? 'square' : 'sine';
		o.frequency.value = urgent ? 1046.5 : 784;
		const g = envelope(urgent ? 0.08 : 0.12, 0.003, 0.09, t);
		o.connect(g).connect(master);
		o.start(t);
		o.stop(t + 0.15);
	};

	// A group that isn't the right size trying to lock its door.
	sound.buzz = function () {
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'sawtooth';
		o.frequency.value = 110;
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 800;
		const g = envelope(0.18, 0.005, 0.3, t);
		o.connect(lp).connect(g).connect(master);
		o.start(t);
		o.stop(t + 0.35);
	};

	return sound;
}
