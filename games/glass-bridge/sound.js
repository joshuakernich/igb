/*
 * Glass Bridge: sound. Red Light Green Light's synthesised sounds (the
 * gunshot, the chimes, the announcer's voice), plus breaking glass, the long
 * fall, the clink of a safe landing, the glint of tempered glass, the
 * countdown and a low drone for the hall.
 *
 *   const sound = createSound();
 *   sound.shatter();  sound.fall();  sound.clink();  sound.glint();
 *   sound.beep(urgent);  sound.drone(true);
 */
import { createSound as createBase } from '../../shared/squid-game/sound.js';

export function createSound() {
	const sound = createBase();
	const { ctx, master, reverb, noise, envelope } = sound;

	function ping(freq, at, peak, decay, type = 'sine', toReverb = true) {
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.value = freq;
		const env = envelope(peak, 0.002, decay, at);
		o.connect(env);
		env.connect(master);
		if (toReverb) env.connect(reverb);
		o.start(at);
		o.stop(at + decay + 0.05);
	}

	// A pane bursting: a bright crash of noise and a shower of glassy pings.
	sound.shatter = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		const crash = noise(0.8);
		const hp = ctx.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.value = 2500;
		const env = envelope(0.9, 0.003, 0.55, t);
		crash.connect(hp).connect(env);
		env.connect(master);
		env.connect(reverb);
		crash.start(t);

		const crunch = noise(0.3);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.frequency.value = 700;
		const cEnv = envelope(0.6, 0.002, 0.18, t);
		crunch.connect(bp).connect(cEnv).connect(master);
		crunch.start(t);

		for (let i = 0; i < 22; i++) {
			ping(2200 + Math.random() * 5200, t + Math.random() * 0.7, 0.05 + Math.random() * 0.08, 0.05 + Math.random() * 0.15);
		}
	};

	// The long drop: wind rushing past and away, then far below a soft thud.
	sound.fall = function (thudAfter = 1.9) {
		sound.resume();
		const t = ctx.currentTime + 0.02;
		const air = noise(2.2);
		const bp = ctx.createBiquadFilter();
		bp.type = 'bandpass';
		bp.Q.value = 1.4;
		bp.frequency.setValueAtTime(1600, t);
		bp.frequency.exponentialRampToValueAtTime(180, t + 1.9);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.45, t + 0.25);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
		air.connect(bp).connect(g);
		g.connect(master);
		g.connect(reverb);
		air.start(t);

		const at = t + thudAfter;
		const thud = ctx.createOscillator();
		thud.type = 'sine';
		thud.frequency.setValueAtTime(70, at);
		thud.frequency.exponentialRampToValueAtTime(32, at + 0.3);
		const tEnv = envelope(0.35, 0.01, 0.4, at);
		thud.connect(tEnv);
		tEnv.connect(master);
		tEnv.connect(reverb);
		thud.start(at);
		thud.stop(at + 0.5);
		const dust = noise(0.4);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 300;
		const dEnv = envelope(0.25, 0.01, 0.3, at);
		dust.connect(lp).connect(dEnv);
		dEnv.connect(reverb);
		dust.start(at);
	};

	// Landing on tempered glass: a solid knock with a ring to it.
	sound.clink = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		ping(1760, t, 0.18, 0.5, 'sine');
		ping(2637, t, 0.08, 0.35, 'sine');
		const knock = noise(0.08);
		const lp = ctx.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 900;
		const env = envelope(0.5, 0.002, 0.07, t);
		knock.connect(lp).connect(env).connect(master);
		knock.start(t);
	};

	// A glint of light running across a pane.
	sound.glint = function () {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		[0, 0.06, 0.12].forEach((d, i) => ping(3136 * Math.pow(1.26, i), t + d, 0.05, 0.4));
	};

	// The countdown's beep; higher and harder near the end.
	sound.beep = function (urgent) {
		sound.resume();
		const t = ctx.currentTime + 0.01;
		ping(urgent ? 1320 : 880, t, urgent ? 0.22 : 0.12, 0.12, 'square', false);
	};

	// A low, uneasy hum under everything.
	let droneNodes = null;
	sound.drone = function (on) {
		if (on && !droneNodes) {
			sound.resume();
			const g = ctx.createGain();
			g.gain.setValueAtTime(0.0001, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 2);
			const lp = ctx.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 260;
			lp.connect(g).connect(master);
			const oscs = [55, 55.4, 82.6].map(function (f) {
				const o = ctx.createOscillator();
				o.type = 'sawtooth';
				o.frequency.value = f;
				o.connect(lp);
				o.start();
				return o;
			});
			droneNodes = { g, oscs };
		} else if (!on && droneNodes) {
			const { g, oscs } = droneNodes;
			g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
			oscs.forEach((o) => o.stop(ctx.currentTime + 2));
			droneNodes = null;
		}
	};

	return sound;
}
