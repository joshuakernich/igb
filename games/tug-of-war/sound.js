/*
 * Tug of War: sound. Red Light Green Light's synthesised sounds (the
 * gunshot, the chimes, the announcer's voice), plus the pulling drum, the
 * creak of the rope, the rally horn and the fall.
 *
 *   const sound = createSound();
 *   sound.drum(accent);  sound.tock();  sound.creak();  sound.rally();
 *   sound.horn();  sound.fall();  sound.thud();  sound.cheer();
 */
import { createSound as createBase } from '../../shared/squid-game/sound.js';

export function createSound() {
	const sound = createBase();
	const { ctx, master, reverb, noise, envelope } = sound;

	// The big pulling drum on every beat: a deep skin and a slap. Accented
	// for a lean back.
	sound.drum = function (accent) {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'sine';
		o.frequency.setValueAtTime(accent ? 120 : 98, t);
		o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
		const g = envelope(accent ? 1.0 : 0.8, 0.003, 0.45, t);
		o.connect(g);
		g.connect(master);
		g.connect(reverb);
		o.start(t);
		o.stop(t + 0.55);
		const slap = noise(0.12);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 700;
		const sg = envelope(accent ? 0.7 : 0.45, 0.002, 0.07, t);
		slap.connect(bp).connect(sg).connect(master);
		slap.start(t);
	};

	// The light stick on the off beat, when you step back in.
	sound.tock = function () {
		const t = ctx.currentTime + 0.01;
		const o = ctx.createOscillator();
		o.type = 'triangle';
		o.frequency.value = 1250;
		const g = envelope(0.07, 0.002, 0.05, t);
		o.connect(g).connect(master);
		o.start(t);
		o.stop(t + 0.08);
	};

	// The rope straining: a short groan of filtered noise.
	sound.creak = function () {
		const t = ctx.currentTime + 0.02;
		const n = noise(0.5);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 9;
		bp.frequency.setValueAtTime(260, t);
		bp.frequency.exponentialRampToValueAtTime(180, t + 0.4);
		const g = envelope(0.5, 0.05, 0.35, t);
		n.connect(bp).connect(g).connect(master);
		n.start(t);
	};

	// A rally pad tapped: a rising brassy chord.
	sound.rally = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		[[60, 0], [64, 0.06], [67, 0.12], [72, 0.18]].forEach(function ([m, d]) {
			const o = ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
			const lp = ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.setValueAtTime(600, t + d);
			lp.frequency.exponentialRampToValueAtTime(2600, t + d + 0.25);
			const g = envelope(0.09, 0.02, 0.5, t + d);
			o.connect(lp).connect(g).connect(master);
			o.start(t + d);
			o.stop(t + d + 0.6);
		});
	};

	// The warning horn before a lean back, and at the start of a bout.
	sound.horn = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		for (const f of [196, 247]) {
			const o = ctx.createOscillator();
			o.type = 'square';
			o.frequency.value = f;
			const lp = ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 1100;
			const g = envelope(0.11, 0.03, 0.7, t);
			o.connect(lp).connect(g);
			g.connect(master);
			g.connect(reverb);
			o.start(t);
			o.stop(t + 0.8);
		}
	};

	// Someone going over the edge: a falling whistle of air.
	sound.fall = function () {
		const t = ctx.currentTime + 0.01;
		const n = noise(0.8);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 6;
		bp.frequency.setValueAtTime(1800, t);
		bp.frequency.exponentialRampToValueAtTime(300, t + 0.7);
		const g = envelope(0.3, 0.05, 0.6, t);
		n.connect(bp).connect(g).connect(master);
		n.start(t);
	};

	// Landing at the bottom of the drop.
	sound.thud = function () {
		const t = ctx.currentTime + 0.01;
		const n = noise(0.3);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 300;
		const g = envelope(0.9, 0.003, 0.25, t);
		n.connect(lp).connect(g);
		g.connect(master);
		g.connect(reverb);
		n.start(t);
	};

	// The winners' bell.
	sound.cheer = function () {
		const t = ctx.currentTime + 0.01;
		[[72, 0], [76, 0.12], [79, 0.24], [84, 0.36]].forEach(function ([m, d]) {
			const o = ctx.createOscillator();
			o.type = 'triangle';
			o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
			const g = envelope(0.16, 0.004, 0.6, t + d);
			o.connect(g).connect(master);
			o.start(t + d);
			o.stop(t + d + 0.7);
		});
	};

	return sound;
}
