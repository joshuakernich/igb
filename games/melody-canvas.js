/*
 * Melody Canvas
 *
 * A drawing instrument for the whole room, after Tala Schlossberg's "Play
 * Music Theory" (playmusictheory.net): lines drawn on paper are a melody,
 * a playhead sweeps across them and plays them, and the grid is locked to a
 * key and scale so every note fits. The grid names its notes.
 *
 * The three walls are one long sheet of paper. A playhead sweeps it, left
 * wall to right wall, eight beats on each, and plays whatever is on the
 * paper as it passes, over a soft bed of chords and bass. Every player has
 * their own colour and their own instrument.
 *
 * The rounds come round in turn, each in a new key and scale, a little
 * faster as they go:
 *   TRACE THE LINE   every player is a pen riding the playhead: the closer
 *                    you stand to the wall it's on, the higher your note. A
 *                    pencil melody is sketched on the paper; keep your pen
 *                    on it (a point a step)
 *   DRAW BY MOVING   your pen is free on the wall you last touched (the
 *                    front wall to start): walking along it draws along it,
 *                    stepping in towards it draws upwards. Touch another
 *                    wall to draw there. Draw any shape; wherever the
 *                    playhead crosses your lines they sing (a point a note)
 *   HIT THE CHORDS   pens on the playhead again; each bar is a chord (its
 *                    name over it, its notes shaded); stay on a chord note
 *                    (a point a step), and when three players cover the
 *                    whole chord together, FULL CHORD: a bonus each
 *   PAINT BY TOUCH   touch the walls to paint soft shades; touch again to
 *                    deepen one. The playhead plays each shade as a chord of
 *                    the notes it covers (a point a note)
 *   BEND THE LINE    one long string runs across the paper; touch the walls
 *                    to pull it up or down to where you touch. Pull it onto
 *                    the pencil melody: each step you put right scores for
 *                    you, and the whole line right is PERFECT
 *   FREE JAM         pens on the playhead; paint anything; every pass leaves
 *                    an echo that plays on under the next (a point a note)
 * In the playhead-pen rounds, a tap on a wall drops a drum dot (high a shaker, the
 * middle a snap, low a kick) that plays every time the playhead passes.
 *
 * Input: walls[n].dist and walls[n].px (pitch, and the free pen), clicks on
 * the walls (drums, shades, bending), credited to the nearest player.
 */
IGB.register('melody-canvas', function MelodyCanvas(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const WIDTH = IGB.WIDTH || W * 3;
	const art = IGB.art;
	const SECONDS = 600;

	/* ---------- tuning ---------- */

	const PAPER = '#f4f1ea';
	const RULE = '#e4dfd3';
	const BAR = '#cdc6b6';
	const INK = '#26241f';
	const PENCIL = '#a29b8e';
	const MONO = 'Share Tech Mono';
	const DISPLAY = 'Shrikhand';   // (the title, the round cards, the shouts: a warm, heavy italic, like an old music poster)
	if (document.fonts) document.fonts.load(`100px "${DISPLAY}"`).catch(() => {});

	const ROWS = 11;             // notes up the paper
	const TOP = 330;             // the highest row's y
	const BOTTOM = 860;          // the lowest row's y
	const STEPS = 48;            // eighth notes in a pass: eight beats on each wall
	const STEP_W = WIDTH / STEPS;
	const BAR_STEPS = 8;
	const INTRO = 4;             // seconds of a round's title card before the playhead sets off
	const NEAR = 0.1;            // nearer the wall than this is the top note...
	const FAR = 0.9;             // ...further than this the bottom one
	const STICKY = 0.7;          // rows the pen has to be pulled before it changes note
	const MAX_DOTS = 40;
	const LINE = 13;
	const PEN_R = 22;

	// the free pen (DRAW BY MOVING): on the wall you touched, at your place
	// along it; right at it is the top of the paper, the far side of the room the bottom
	const FREE_NEAR = 0.08;
	const FREE_FAR = 0.85;
	const FREE_GAP = 14;         // how far the pen moves before it adds a point
	const FREE_POINTS = 700;     // a player's ink, at most (the oldest goes first)

	// shades (PAINT BY TOUCH)
	const SHADE_R = 105;
	const SHADE_GROW = 18;
	const SHADE_MAX_R = 230;
	const SHADE_MERGE = 70;      // a touch this near your own shade deepens it
	const MAX_SHADES = 60;

	// the string (BEND THE LINE)
	const BEND_SIGMA = 1.7;      // steps: how wide a pull spreads
	const BEND_OWN = 0.5;        // a pull this strong at a step makes it yours

	const SCALES = {
		'MAJOR PENTATONIC': [0, 2, 4, 7, 9],
		'MINOR PENTATONIC': [0, 3, 5, 7, 10],
		'MAJOR': [0, 2, 4, 5, 7, 9, 11],
		'MINOR': [0, 2, 3, 5, 7, 8, 10],
		'DORIAN': [0, 2, 3, 5, 7, 9, 10],
		'LYDIAN': [0, 2, 4, 6, 7, 9, 11],
		'MIXOLYDIAN': [0, 2, 4, 5, 7, 9, 10],
		'BLUES': [0, 3, 5, 6, 7, 10],
	};
	const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
	const NUMERALS = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
	// the bed under a round with no chords of its own
	const BEDS = {
		'MAJOR': ['I', 'vi', 'IV', 'V', 'I', 'IV'],
		'MINOR': ['i', 'VI', 'III', 'VII', 'i', 'VI'],
		'DORIAN': ['i', 'IV', 'i', 'VII', 'i', 'IV'],
		'LYDIAN': ['I', 'II', 'I', 'vii', 'I', 'II'],
		'MIXOLYDIAN': ['I', 'VII', 'IV', 'I', 'VII', 'I'],
	};

	const KINDS = {
		trace: { title: 'Trace the Line', how: 'STAND CLOSE TO THE WALL TO PLAY HIGH', fill: '#3f9e7f', loops: 2, pens: true },
		shapes: { title: 'Draw by Moving', how: 'TOUCH A WALL TO DRAW ON IT · WALK TO DRAW · NEAR IS HIGH', fill: '#d0653f', loops: 3 },
		chords: { title: 'Hit the Chords', how: 'STAY ON THE SHADED NOTES', fill: '#7a72d8', loops: 2, pens: true },
		shades: { title: 'Paint by Touch', how: 'TOUCH THE WALLS TO PAINT · TOUCH AGAIN TO DEEPEN', fill: '#d886b8', loops: 3 },
		bend: { title: 'Bend the Line', how: 'TOUCH THE WALLS TO PULL THE LINE ONTO THE PENCIL', fill: '#4d5fc4', loops: 3 },
		jam: { title: 'Free Jam', how: 'PAINT ANYTHING · IT ALL FITS', fill: '#e8a83c', loops: 3, pens: true },
	};
	const ROUNDS = [
		{ kind: 'trace', key: 0, scale: 'MAJOR PENTATONIC', bpm: 92 },
		{ kind: 'shapes', key: 7, scale: 'MAJOR PENTATONIC', bpm: 88 },
		{ kind: 'chords', key: 0, scale: 'MAJOR', bpm: 92, prog: ['I', 'V', 'vi', 'IV', 'I', 'V'] },
		{ kind: 'shades', key: 9, scale: 'MINOR PENTATONIC', bpm: 84 },
		{ kind: 'bend', key: 2, scale: 'DORIAN', bpm: 92 },
		{ kind: 'jam', key: 2, scale: 'DORIAN', bpm: 96 },
		{ kind: 'trace', key: 9, scale: 'MINOR PENTATONIC', bpm: 96 },
		{ kind: 'shapes', key: 4, scale: 'BLUES', bpm: 92 },
		{ kind: 'chords', key: 9, scale: 'MINOR', bpm: 100, prog: ['i', 'VI', 'III', 'VII', 'i', 'v'] },
		{ kind: 'shades', key: 5, scale: 'LYDIAN', bpm: 88 },
		{ kind: 'bend', key: 7, scale: 'MAJOR', bpm: 100 },
		{ kind: 'jam', key: 0, scale: 'MINOR PENTATONIC', bpm: 104 },
	];
	const TUTORIAL_ROUND = { kind: 'trace', key: 0, scale: 'MAJOR PENTATONIC', bpm: 88, loops: Infinity };

	const rowY = (r) => BOTTOM - r * (BOTTOM - TOP) / (ROWS - 1);
	const yRow = (y) => Math.max(0, Math.min(ROWS - 1, Math.round((BOTTOM - y) / (BOTTOM - TOP) * (ROWS - 1))));
	const stepX = (s) => (s + 0.5) * STEP_W;
	const clamp01 = (v) => Math.max(0, Math.min(1, v));
	const pick = (a) => a[Math.floor(Math.random() * a.length)];
	const human = () => 0.88 + Math.random() * 0.2;   // (a touch of give in every note)

	/* ---------- sound: everything synthesised ---------- */

	// Every voice goes into one bus: straight out, into a long soft hall, and
	// into an echo a dotted eighth behind that darkens as it repeats.
	const AC = window.AudioContext || window.webkitAudioContext;
	const ac = AC ? new AC() : null;
	let master = null;
	let bus = null;
	let echo = null;
	let noise = null;
	if (ac) {
		const comp = ac.createDynamicsCompressor();
		comp.threshold.value = -18;
		comp.ratio.value = 3;
		comp.connect(ac.destination);
		master = ac.createGain();
		master.gain.value = 0.8;
		master.connect(comp);

		bus = ac.createGain();
		bus.connect(master);

		const hall = ac.createConvolver();
		const len = Math.floor(ac.sampleRate * 3.2);
		const ir = ac.createBuffer(2, len, ac.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = ir.getChannelData(ch);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
		}
		hall.buffer = ir;
		const hallSend = ac.createGain();
		hallSend.gain.value = 0.42;
		const hallTone = ac.createBiquadFilter();
		hallTone.type = 'lowpass';
		hallTone.frequency.value = 5200;
		bus.connect(hallSend);
		hallSend.connect(hall);
		hall.connect(hallTone);
		hallTone.connect(master);

		echo = ac.createDelay(2);
		echo.delayTime.value = 0.45;
		const echoSend = ac.createGain();
		echoSend.gain.value = 0.2;
		const echoTone = ac.createBiquadFilter();
		echoTone.type = 'lowpass';
		echoTone.frequency.value = 2400;
		const feedback = ac.createGain();
		feedback.gain.value = 0.34;
		bus.connect(echoSend);
		echoSend.connect(echo);
		echo.connect(echoTone);
		echoTone.connect(feedback);
		feedback.connect(echo);
		echoTone.connect(hallSend);
		const echoOut = ac.createGain();
		echoOut.gain.value = 0.7;
		echoTone.connect(echoOut);
		echoOut.connect(master);

		noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
		const d = noise.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	const wake = () => { if (ac && ac.state === 'suspended') ac.resume(); };
	const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

	function gainEnv(t, attack, peak, decay, out = bus) {
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(peak, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
		g.connect(out);
		return g;
	}
	function tone(type, f, t, len, out, cents = 0) {
		const o = ac.createOscillator();
		o.type = type;
		o.frequency.value = f;
		o.detune.value = cents;
		o.connect(out);
		o.start(t);
		o.stop(t + len + 0.05);
		return o;
	}
	function lowpass(f, out, q = 0.6) {
		const lp = ac.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = f;
		lp.Q.value = q;
		lp.connect(out);
		return lp;
	}

	// one instrument a player, in player order
	const VOICES = [
		function tines(f, t, v) {          // an electric piano: a round tone, a bright tine on top
			tone('sine', f, t, 1.9, gainEnv(t, 0.004, 0.3 * v, 1.8));
			tone('sine', f * 2, t, 1, gainEnv(t, 0.003, 0.06 * v, 0.9), 3);
			tone('sine', f * 7, t, 0.16, gainEnv(t, 0.001, 0.022 * v, 0.13));
		},
		function marimba(f, t, v) {
			tone('sine', f, t, 0.8, gainEnv(t, 0.003, 0.36 * v, 0.75));
			tone('sine', f * 4, t, 0.1, gainEnv(t, 0.002, 0.08 * v, 0.08));
			tone('sine', f * 9.9, t, 0.05, gainEnv(t, 0.001, 0.02 * v, 0.03));
		},
		function harp(f, t, v) {
			const g = gainEnv(t, 0.003, 0.28 * v, 1.6);
			const lp = lowpass(4200, g, 0.4);
			lp.frequency.setValueAtTime(4200, t);
			lp.frequency.exponentialRampToValueAtTime(700, t + 0.9);
			tone('triangle', f, t, 1.7, lp);
			tone('sine', f * 2, t, 0.6, gainEnv(t, 0.002, 0.05 * v, 0.5));
		},
		function bell(f, t, v) {
			const g = gainEnv(t, 0.003, 0.18 * v, 2.4);
			const car = tone('sine', f, t, 2.5, g);
			const mg = ac.createGain();
			mg.gain.setValueAtTime(f * 1.6, t);
			mg.gain.exponentialRampToValueAtTime(1, t + 1.6);
			mg.connect(car.frequency);
			tone('sine', f * 3.5, t, 2.5, mg);
		},
		function strings(f, t, v) {        // two detuned saws, soft and slow
			const g = gainEnv(t, 0.07, 0.07 * v, 1.2);
			const lp = lowpass(1300, g);
			tone('sawtooth', f, t, 1.35, lp, -7);
			tone('sawtooth', f, t, 1.35, lp, 7);
		},
		function flute(f, t, v) {
			const g = gainEnv(t, 0.08, 0.26 * v, 1);
			const o = tone('sine', f, t, 1.1, g);
			tone('triangle', f * 2, t, 1.1, gainEnv(t, 0.1, 0.02 * v, 0.8));
			const lfo = ac.createOscillator();
			const lg = ac.createGain();
			lfo.frequency.value = 5.2;
			lg.gain.setValueAtTime(0, t);
			lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.35);
			lfo.connect(lg);
			lg.connect(o.frequency);
			lfo.start(t);
			lfo.stop(t + 1.15);
		},
	];

	function note(voice, midi, vol = 1) {
		if (!ac) return;
		VOICES[voice % VOICES.length](hz(midi), ac.currentTime + 0.01, vol * human());
	}
	function guide(midi) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		tone('sine', hz(midi), t, 0.9, gainEnv(t, 0.03, 0.09, 0.8));
	}
	function bass(midi, len) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		const g = gainEnv(t, 0.02, 0.3, len);
		const lp = lowpass(420, g);
		tone('triangle', hz(midi), t, len + 0.05, lp);
		tone('sine', hz(midi), t, len + 0.05, lp);
	}
	// the bed: each note two detuned soft triangles, swelling in and out
	function pad(midis, len, vol = 1) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		for (const m of midis) {
			const g = ac.createGain();
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(0.03 * vol, t + Math.min(0.7, len * 0.4));
			g.gain.setValueAtTime(0.03 * vol, t + len * 0.75);
			g.gain.linearRampToValueAtTime(0, t + len + 0.9);
			const lp = lowpass(1100, g);
			g.connect(bus);
			tone('triangle', hz(m), t, len + 1, lp, -6);
			tone('triangle', hz(m), t, len + 1, lp, 6);
		}
	}
	function drum(kind, vol = 1) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		if (kind === 'kick') {
			const g = gainEnv(t, 0.003, 0.42 * vol, 0.3, master);   // (dry: the hall would muddy it)
			const o = tone('sine', 110, t, 0.35, g);
			o.frequency.exponentialRampToValueAtTime(46, t + 0.16);
			return;
		}
		const src = ac.createBufferSource();
		src.buffer = noise;
		const f = ac.createBiquadFilter();
		f.type = 'bandpass';
		f.frequency.value = kind === 'hat' ? 6500 : 1800;
		f.Q.value = kind === 'hat' ? 1.1 : 0.9;
		src.connect(f);
		f.connect(gainEnv(t, kind === 'hat' ? 0.008 : 0.002, (kind === 'hat' ? 0.07 : 0.26) * vol, kind === 'hat' ? 0.06 : 0.14));
		src.start(t);
		src.stop(t + 0.3);
	}

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let pens = [];             // { row, y, heldFor, flash, colour, fx, fy, free: bool }
	let latest = [];           // the tracker's last word
	let isLive = false;        // the playhead is running (the tutorial and the play)
	let t = 0;

	let round = null;          // the round under way: its settings, worked out
	let roundNo = 0;
	let phase = 'idle';        // 'intro' (the title card) | 'run'
	let phaseT = 0;
	let cur = 0;               // the step the playhead's in
	let frac = 0;              // how far through it
	let pass = 0;
	let passes = [];           // per pass, per player: the row drawn at each step (-1: none)
	let dots = [];             // drum dots: { s, kind, y, flash }
	let strokes = [];          // free ink: { i, pts: [{ x, y }] }
	let heard = [];            // per player, the rows their free ink played last step
	let shades = [];           // { i, x, y, r, a, flash }
	let line = null;           // the string: where it's pulled to (rows, per step)
	let lineShown = null;      // where it's drawn (easing after the pull)
	let lineBy = null;         // who last pulled each step (-1: no one)
	let lineLast = -1;         // the row the string sounded last step
	let rings = [];            // where ink sounded: { x, y, colour, age }
	let pops = [];             // words floating up: { x, y, text, fill, age }
	let taps = 0;
	let fullBars = new Set();

	const playheadX = () => (phase === 'run' ? (cur + frac) * STEP_W : 0);

	function setUp(def) {
		const scale = SCALES[def.scale];
		const len = scale.length;
		const base = 60 + (def.key > 5 ? def.key - 12 : def.key);
		const midiAt = (r) => base + 12 * Math.floor(r / len) + scale[r % len];
		const r = Object.assign({}, def, KINDS[def.kind], def.loops ? { loops: def.loops } : {}, {
			scaleSteps: scale, len, base, midiAt,
			label: `${NAMES[def.key]} ${def.scale}`,
			names: Array.from({ length: ROWS }, (_, i) => NAMES[(def.key + scale[i % len]) % 12]),
		});
		if (def.kind === 'chords') r.chords = def.prog.map((num) => chordOf(num, r));
		r.bed = bedOf(r);
		if (def.kind === 'trace' || def.kind === 'bend') r.melody = makeMelody(r);
		return r;
	}

	// The bed under each bar: { midis (the pad), bass, pcs (its pitch classes) }.
	// Seven-note scales walk a progression; the pentatonics and the blues
	// rock between home and its relative.
	function bedOf(r) {
		const low = r.base - 12;
		if (r.chords) return r.chords.map((c) => ({ midis: c.midis.map((m) => m - 12), bass: low - 12 + r.scaleSteps[c.root] }));
		if (r.len === 7) return (BEDS[r.scale] || BEDS.MAJOR).map((num) => chordOf(num, r)).map((c) => ({ midis: c.midis.map((m) => m - 12), bass: low - 12 + r.scaleSteps[c.root] }));
		const major = r.scaleSteps[1] === 2;
		const home = major ? [0, 4, 7, 12] : [0, 3, 7, 12];
		const away = major ? [9, 12, 16, 21] : [3, 7, 10, 15];
		return [home, away, home, away, away, home].map((set) => ({ midis: set.map((k) => low + k), bass: low - 12 + set[0] }));
	}
	const pcsOf = (b) => new Set(b.midis.map((m) => ((m % 12) + 12) % 12));

	// A pencil melody: held notes of a quarter to a dotted half, mostly
	// stepwise, landing on a note of the bed at each bar, and coming home to
	// a root over the last bar.
	function makeMelody(r) {
		const len = r.len;
		const out = new Array(STEPS);
		const lo = len === 5 ? 1 : 2;
		const hi = 9;
		const onChord = (row, bar) => {
			const pcs = pcsOf(r.bed[bar]);
			for (let k = 0; k < ROWS; k++) for (const sgn of [1, -1]) {
				const c = row + sgn * k;
				if (c >= lo && c <= hi && pcs.has(r.midiAt(c) % 12)) return c;
			}
			return row;
		};
		let row = len;
		let s = 0;
		while (s < STEPS) {
			const left = STEPS - s;
			let d = left <= BAR_STEPS ? left : pick([2, 2, 4, 4, 6]);
			if ((s % BAR_STEPS) + d > BAR_STEPS && left > BAR_STEPS) d = BAR_STEPS - (s % BAR_STEPS);
			if (s % BAR_STEPS === 0) row = onChord(row, s / BAR_STEPS);
			for (let k = 0; k < d; k++) out[s + k] = row;
			s += d;
			row = Math.max(lo, Math.min(hi, row + pick([-2, -1, -1, -1, 1, 1, 1, 2, 3, -3])));
			if (STEPS - s <= BAR_STEPS) row = Math.abs(row - len) <= Math.abs(row - 2 * len) || 2 * len > hi ? len : 2 * len;
		}
		return out;
	}

	// a diatonic triad on a scale degree: its name and which rows are its notes
	function chordOf(num, r) {
		const d = NUMERALS[num.toLowerCase()];
		const sc = r.scaleSteps;
		const at = (k) => sc[k % 7] + (k >= 7 ? 12 : 0);
		const third = at(d + 2) - at(d);
		const fifth = at(d + 4) - at(d);
		const root = (r.key + sc[d]) % 12;
		const name = NAMES[root] + (fifth === 6 ? 'dim' : third === 3 ? 'm' : '');
		return { num, name, degrees: new Set([d, (d + 2) % 7, (d + 4) % 7]), root: d, midis: [d, d + 2, d + 4].map((k) => r.base + at(k)) };
	}

	function newPass() {
		passes.push(pens.map(() => new Int8Array(STEPS).fill(-1)));
		if (passes.length > 4) passes.shift();
	}

	function startRound(def) {
		round = setUp(def);
		phase = 'intro';
		phaseT = 0;
		cur = 0;
		frac = 0;
		pass = 0;
		passes = [];
		dots = [];
		strokes = [];
		heard = pens.map(() => new Set());
		shades = [];
		rings = [];
		fullBars = new Set();
		line = new Float32Array(STEPS).fill(5);
		lineShown = new Float32Array(STEPS).fill(5);
		lineBy = new Int8Array(STEPS).fill(-1);
		lineLast = -1;
		for (const p of pens) { p.free = false; p.stroke = null; p.wall = 1; }
		newPass();
		if (echo) echo.delayTime.value = 60 / round.bpm * 0.75;
		show.label(`${round.title.toUpperCase()} · ${round.label}`);
		if (show.fx) show.fx('stepIn', 0.6);
	}

	function nextRound() {
		roundNo++;
		startRound(ROUNDS[roundNo % ROUNDS.length]);
	}

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'melody-canvas',
		seconds: SECONDS,
		players: () => count,
		scores: () => scores,
		music: false,
		theme: { accent: '#3f9e7f', accent2: '#7a72d8', gold: '#e8a83c' },
	});

	const everyone = (fn) => count > 0 && pens.every((p, i) => fn(p, i));
	const reached = [];
	const TUTORIAL = [
		{ caption: 'STAND CLOSE TO THE WALL TO PLAY HIGH', min: 3, max: 16, did: () => everyone((p, i) => reached[i] && reached[i].hi && reached[i].lo) },
		{ caption: 'KEEP YOUR PEN ON THE PENCIL LINE', min: 3, max: 20, did: () => everyone((p, i) => scores[i] >= 6) },
		{ caption: 'TAP THE WALLS TO ADD DRUMS', min: 2, max: 10, did: () => taps > 0 },
	];

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop({
			lines: [],   // (the title is painted on by the playhead instead: titleScene)
			enter() { title.out = -1; title.step = -1; title.loop = -1; },
			update(dt, bt) {
				show.blackout = 0;   // (the paper stays bright)
				titleSound(bt);
			},
			draw(ctx, bt) { drawTitle(ctx, bt); },
		}),
		show.beats.clockIntro(),
		show.beats.visors(),
		show.beats.tutorial({
			steps: TUTORIAL,
			enterStep(i) { if (i === 1) scores = scores.map(() => 0); },   // (the tracing counts from here)
			enter() {
				isLive = true;
				startRound(TUTORIAL_ROUND);
				phase = 'run';
			},
			update(dt) { tick(dt); },
		}),
		{
			id: 'intro',
			length: 3.5,
			enter() {
				isLive = false;
				scores = scores.map(() => 0);
				round = null;
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'Paint the music!', W / 2, 300, 130, bt - 0.2, { fill: '#e8a83c', font: DISPLAY });
				});
			},
		},
		{
			id: 'play',
			length: Infinity,
			enter() {
				isLive = true;
				roundNo = 0;
				startRound(ROUNDS[0]);
			},
			update(dt) {
				tick(dt);
				show.record(t, latest.slice(0, count));
			},
			draw(ctx) {
				if (phase !== 'intro' || !round) return;
				show.onWalls(ctx, function (c) {
					show.slam(c, round.title, W / 2, 190, 110, phaseT, { fill: round.fill, font: DISPLAY });
					show.text(c, round.label, W / 2, 300, 50, { fill: 'white', glow: round.fill, alpha: clamp01((phaseT - 0.4) * 3) });
					show.text(c, round.how, W / 2, 400, 46, { fill: '#ffd23f', glow: INK, alpha: clamp01((phaseT - 0.8) * 3) });
				});
			},
		},
		show.beats.timeUp({ enter() { isLive = false; } }),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(scores)); },
		}),
	]);

	/* ---------- flow ---------- */

	function initGame(n) {
		count = n;
		scores = new Array(n).fill(0);
		pens = Array.from({ length: n }, (_, i) => ({ row: 5, y: rowY(5), heldFor: 0, flash: 0, colour: PLAYER_COLORS[i % PLAYER_COLORS.length], fx: W * 1.5, fy: BOTTOM, free: false, stroke: null, wall: 1 }));
		heard = pens.map(() => new Set());
		show.go('title');
	}

	/* ---------- every frame ---------- */

	function tick(dt) {
		if (show.paused || !round) return;
		t += dt;
		if (master) master.gain.value = 0.8 * (IGB.volume === undefined ? 1 : IGB.volume);
		if (round.pens) steerPens(dt);
		if (round.kind === 'shapes') steerFree(dt);
		if (round.kind === 'bend') for (let s = 0; s < STEPS; s++) lineShown[s] += (line[s] - lineShown[s]) * Math.min(1, dt * 10);
		for (const p of pens) p.flash = Math.max(0, p.flash - dt * 3);
		for (const d of dots) d.flash = Math.max(0, d.flash - dt * 4);
		for (const sh of shades) sh.flash = Math.max(0, sh.flash - dt * 3);
		for (const r of rings) r.age += dt;
		rings = rings.filter((r) => r.age < 0.6);
		for (const p of pops) p.age += dt;
		pops = pops.filter((p) => p.age < 1.2);

		if (phase === 'intro') {
			phaseT += dt;
			if (phaseT >= INTRO) { phase = 'run'; phaseT = 0; }
			return;
		}
		if (!isLive) return;
		frac += dt * round.bpm / 60 * 2;
		while (frac >= 1) {
			frac -= 1;
			cur++;
			if (cur >= STEPS) {
				cur = 0;
				pass++;
				if (pass >= round.loops) { nextRound(); return; }
				newPass();
			}
			playStep(cur);
		}
	}

	// each pen on the playhead follows its player: nearer the wall under the playhead, higher
	function steerPens(dt) {
		const wall = Math.max(0, Math.min(2, Math.floor(playheadX() / W)));
		pens.forEach(function (pen, i) {
			const p = latest[i];
			if (p) {
				const w = p.walls && p.walls[wall];
				const dist = w && !isNaN(w.dist) ? w.dist : 1 - (isNaN(p.pz) ? 0.5 : p.pz);   // (pz is 1 at the front wall)
				const raw = clamp01((FAR - dist) / (FAR - NEAR)) * (ROWS - 1);
				if (Math.abs(raw - pen.row) > STICKY) pen.row = Math.round(raw);
				const r = reached[i] || (reached[i] = {});
				if (pen.row >= ROWS - 3) r.hi = true;
				if (pen.row <= 2) r.lo = true;
			}
			pen.y += (rowY(pen.row) - pen.y) * Math.min(1, dt * 14);
		});
	}

	// The free pens: on the wall you last touched, at your place along it;
	// the nearer you are, the higher up it.
	function freeSpot(p, wall) {
		if (!p || !p.walls) return null;
		const best = wall;
		const w = p.walls[best];
		if (!w) return null;
		if (isNaN(w.px) || isNaN(w.dist)) return null;
		return {
			x: (best + clamp01(w.px)) * W,
			y: TOP - 30 + clamp01((w.dist - FREE_NEAR) / (FREE_FAR - FREE_NEAR)) * (BOTTOM - TOP + 60),
		};
	}

	function steerFree(dt) {
		pens.forEach(function (pen, i) {
			const at = freeSpot(latest[i], pen.wall);
			if (!at) return;
			if (!pen.free) { pen.fx = at.x; pen.fy = at.y; pen.free = true; }
			const k = Math.min(1, dt * 9);
			pen.fx += (at.x - pen.fx) * k;
			pen.fy += (at.y - pen.fy) * k;
			if (phase !== 'run') return;
			let st = pen.stroke;
			const lastPt = st && st.pts[st.pts.length - 1];
			if (!st || Math.hypot(pen.fx - lastPt.x, pen.fy - lastPt.y) > 260) {
				st = pen.stroke = { i, pts: [{ x: pen.fx, y: pen.fy }] };
				strokes.push(st);
			} else if (Math.hypot(pen.fx - lastPt.x, pen.fy - lastPt.y) >= FREE_GAP) {
				st.pts.push({ x: pen.fx, y: pen.fy });
			}
			// (a player's ink is limited: the oldest goes first)
			let total = 0;
			for (const s of strokes) if (s.i === i) total += s.pts.length;
			while (total > FREE_POINTS) {
				const oldest = strokes.find((s) => s.i === i);
				oldest.pts.shift();
				total--;
				if (oldest.pts.length < 2 && oldest !== st) strokes.splice(strokes.indexOf(oldest), 1);
			}
		});
	}

	function playStep(s) {
		const bar = Math.floor(s / BAR_STEPS);
		const inBar = s % BAR_STEPS;
		const stepLen = 60 / round.bpm / 2;
		const bed = round.bed[bar];

		// the bed: a pad for the bar, a bass on one (and three, in the chords),
		// a soft kick and shaker underneath
		if (inBar === 0) pad(bed.midis, stepLen * BAR_STEPS, round.kind === 'chords' ? 1.3 : 1);
		if (inBar === 0) bass(bed.bass, stepLen * (round.kind === 'chords' ? 4 : 7));
		if (round.kind === 'chords' && inBar === 4) bass(bed.bass + 12, stepLen * 3);
		if (inBar === 0 || inBar === 5) drum('kick', inBar === 0 ? 0.55 : 0.32);
		if (s % 2 === 1) drum('hat', s % 4 === 3 ? 0.9 : 0.55);

		if (round.kind === 'trace') {
			const m = round.melody[s];
			if (s === 0 || m !== round.melody[s - 1]) guide(round.midiAt(m));
		}
		if (round.kind === 'bend') {
			const m = round.melody[s];
			if (s === 0 || m !== round.melody[s - 1]) guide(round.midiAt(m) - 12);
			playLine(s);
		}

		// echoes: in the jam, every earlier pass plays on, quieter
		if (round.kind === 'jam') {
			passes.slice(0, -1).forEach(function (layer, age) {
				layer.forEach(function (ink, i) {
					const r = ink[s];
					if (r >= 0 && (s === 0 || r !== ink[s - 1] || s % BAR_STEPS === 0)) note(i, round.midiAt(r), 0.3 + 0.12 * age);
				});
			});
		}

		if (round.kind === 'shapes') playStrokes(s);
		if (round.kind === 'shades') playShades(s);

		for (const d of dots) if (d.s === s) { drum(d.kind); d.flash = 1; }

		if (round.pens) playPens(s, bar);
	}

	// the pens on the playhead: draw, play, score
	function playPens(s, bar) {
		const ink = passes[passes.length - 1];
		const covered = new Map();   // chord degree -> players on it
		pens.forEach(function (pen, i) {
			const r = pen.row;
			const was = s > 0 ? ink[i][s - 1] : -1;
			ink[i][s] = r;
			if (r !== was) pen.heldFor = 0; else pen.heldFor++;
			if (r !== was || s % BAR_STEPS === 0) note(i, round.midiAt(r), s % BAR_STEPS === 0 ? 1.05 : 0.9);

			if (round.kind === 'trace' && r === round.melody[s]) score(i, 1);
			if (round.kind === 'chords') {
				const deg = r % 7;
				if (round.chords[bar].degrees.has(deg)) {
					score(i, 1);
					if (!covered.has(deg)) covered.set(deg, []);
					covered.get(deg).push(i);
				}
			}
			if (round.kind === 'jam' && pen.heldFor === 1) score(i, 1);
		});

		if (round.kind === 'chords' && covered.size === 3) {
			for (const list of covered.values()) for (const i of list) score(i, 1);
			const key = pass * 10 + bar;
			if (!fullBars.has(key)) {
				fullBars.add(key);
				pops.push({ x: stepX(s), y: TOP - 40, text: 'Full chord!', fill: round.fill, age: 0, size: 64 });
				if (show.fx) show.fx('pick', 0.5);
			}
		}
	}

	// Free ink sings where the playhead crosses it: every line through this
	// step's middle is a note (a shape crossing it twice, two).
	function playStrokes(s) {
		const cx = stepX(s);
		const now = pens.map(() => new Map());   // per player: row -> y
		for (const st of strokes) {
			const pts = st.pts;
			for (let k = 1; k < pts.length; k++) {
				const a = pts[k - 1];
				const b = pts[k];
				if ((a.x - cx) * (b.x - cx) > 0 || a.x === b.x) continue;
				const y = a.y + (b.y - a.y) * (cx - a.x) / (b.x - a.x);
				now[st.i].set(yRow(y), y);
			}
		}
		now.forEach(function (rows, i) {
			let n = 0;
			for (const [r, y] of rows) {
				const fresh = !heard[i].has(r) || s % BAR_STEPS === 0;
				if (fresh && n < 3) {
					note(i, round.midiAt(r), 0.85);
					score(i, 1);
					rings.push({ x: cx, y, colour: pens[i].colour, age: 0 });
					n++;
				}
			}
			heard[i] = new Set(rows.keys());
		});
	}

	// Each shade is a chord of the rows it covers under the playhead: struck
	// as the playhead comes into it, and again at each bar.
	function playShades(s) {
		const cx = stepX(s);
		const prev = stepX(s - 1);
		for (const sh of shades) {
			const dx = Math.abs(cx - sh.x);
			if (dx > sh.r) continue;
			const entering = Math.abs(prev - sh.x) > sh.r || s === 0;
			if (!entering && s % BAR_STEPS !== 0) continue;
			const half = Math.sqrt(sh.r * sh.r - dx * dx);
			const top = yRow(sh.y - half);
			const bot = yRow(sh.y + half);
			const rows = [];
			for (let r = bot; r <= top; r++) rows.push(r);
			// (no more than three of them: the top, the bottom and the middle)
			const chosen = rows.length <= 3 ? rows : [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]];
			chosen.forEach((r, k) => stage.timeout(() => note(sh.i, round.midiAt(r), 0.45 + sh.a * 0.6), k * 45));   // (a gentle strum)
			score(sh.i, chosen.length);
			sh.flash = 1;
		}
	}

	// The string plays its own row at each step (in the voice of whoever
	// last pulled it there); steps on the pencil score for whoever put them right.
	function playLine(s) {
		const r = Math.round(line[s]);
		const by = lineBy[s];
		if (r !== lineLast || s % BAR_STEPS === 0) note(by >= 0 ? by : 0, round.midiAt(r), by >= 0 ? 0.95 : 0.7);
		lineLast = r;
		if (r === round.melody[s] && by >= 0) {
			score(by, 1);
			rings.push({ x: stepX(s), y: rowY(r), colour: pens[by].colour, age: 0 });
		}
		if (s === STEPS - 1) {
			let right = 0;
			for (let k = 0; k < STEPS; k++) if (Math.round(line[k]) === round.melody[k]) right++;
			if (right === STEPS) {
				pops.push({ x: W * 1.5, y: TOP - 40, text: 'Perfect!', fill: round.fill, age: 0, size: 90 });
				for (let i = 0; i < count; i++) score(i, 10);
				if (show.fx) show.fx('fanfare', 0.5);
				round.melody = makeMelody(round);
			}
		}
	}

	function score(i, n) {
		if (i < 0 || i >= count) return;
		scores[i] += n;
		pens[i].flash = 1;
	}

	/* ---------- the title: painted on by a playhead ---------- */

	// On every wall a playhead sweeps the paper, left to right, drawing three
	// melody lines behind it and revealing the title as it passes; the lines
	// play as it crosses them (a little tune in C major pentatonic, over a
	// pad), and once it's all down the playhead keeps going round, softer,
	// until START.
	const TITLE = {
		lines: [
			{ text: 'Melody', fill: '#3f9e7f', y: 405 },
			{ text: 'Canvas', fill: '#d0653f', y: 625 },
		],
		size: 215,
		shadow: [7, 10],         // the ink under the letters, offset
		start: 0.35,             // the playhead sets off
		sweep: 3.2,              // seconds to cross a wall
		steps: 16,
		strokes: [               // rows (C major pentatonic from middle C), a step each
			{ colour: '#7a72d8', voice: 3, rows: [5, 5, 7, 7, 8, 8, 9, 9, 8, 8, 7, 7, 5, 5, 6, 7] },
			{ colour: '#e8a83c', voice: 2, rows: [2, 2, 2, 3, 4, 4, 3, 3, 4, 4, 3, 3, 2, 2, 3, 3] },
			{ colour: '#4d5fc4', voice: 0, rows: [0, 0, 0, 0, 1, 1, 2, 2, 4, 4, 4, 4, 3, 3, 2, 2] },
		],
		top: 250, bottom: 760,   // the strokes' range up the wall
		out: 0.5,
	};
	const PENTA = [0, 2, 4, 7, 9];
	const titleMidi = (r) => 60 + 12 * Math.floor(r / 5) + PENTA[r % 5];
	const title = { out: -1, step: -1, loop: -1, bt: 0 };
	stage.$ui.on('start.melody-canvas', '[start]', function () { if (title.out < 0) title.out = title.bt; });

	// where the playhead is: its pass, and how far across (0..1)
	function titleHead(bt) {
		const k = (bt - TITLE.start) / TITLE.sweep;
		return k < 0 ? null : { pass: Math.floor(k), x: k - Math.floor(k) };
	}

	function titleSound(bt) {
		title.bt = bt;
		const head = titleHead(bt);
		if (!head || title.out >= 0) return;
		const step = Math.floor(head.x * TITLE.steps);
		if (head.pass !== title.loop) {
			title.loop = head.pass;
			title.step = -1;
			pad([48, 55, 64, 69], TITLE.sweep * 0.5, head.pass === 0 ? 1.4 : 1);       // C, then
			stage.timeout(() => pad([45, 52, 60, 64], TITLE.sweep * 0.5, 1.1), TITLE.sweep * 500);   // A minor
			bass(36, TITLE.sweep * 0.45);
			stage.timeout(() => bass(33, TITLE.sweep * 0.45), TITLE.sweep * 500);
		}
		while (title.step < step) {
			title.step++;
			const s = title.step;
			const vol = head.pass === 0 ? 0.75 : 0.35;
			for (const st of TITLE.strokes) {
				if (s === 0 || st.rows[s] !== st.rows[s - 1]) note(st.voice, titleMidi(st.rows[s]), vol);
			}
			if (head.pass === 0 && s % 2 === 1) drum('hat', 0.6);
		}
	}

	function drawTitle(ctx, bt) {
		const head = titleHead(bt);
		const first = !head || head.pass === 0;
		const reveal = !head ? 0 : first ? head.x : 1;          // how much of the wall's been painted
		const fade = title.out < 0 ? 1 : clamp01(1 - (bt - title.out) / TITLE.out);
		const stepW = W / TITLE.steps;
		const yOf = (r) => TITLE.bottom - r / 10 * (TITLE.bottom - TITLE.top);
		show.onWalls(ctx, function (c) {
			c.save();
			c.globalAlpha *= fade;
			c.beginPath();
			c.rect(0, 0, W * reveal, H);
			c.save();
			c.clip();

			// the melody lines, behind
			c.lineCap = 'round';
			c.lineJoin = 'round';
			c.lineWidth = 16;
			for (const st of TITLE.strokes) {
				c.strokeStyle = st.colour;
				c.globalAlpha = fade * 0.5;
				c.beginPath();
				st.rows.forEach((r, s) => { const x = (s + 0.5) * stepW; if (s === 0) c.moveTo(0, yOf(r)); c.lineTo(x, yOf(r)); });
				c.lineTo(W, yOf(st.rows[st.rows.length - 1]));
				c.stroke();
			}
			c.globalAlpha = fade;

			// the title, letter by letter, an ink shadow under each; once it's
			// all down, the letters ride a gentle wave
			const settle = clamp01((bt - TITLE.start - TITLE.sweep) / 0.8);
			c.font = `400 ${TITLE.size}px "${DISPLAY}", serif`;
			c.textBaseline = 'middle';
			c.textAlign = 'left';
			TITLE.lines.forEach(function (line, li) {
				const total = c.measureText(line.text).width;
				const left = W / 2 - total / 2;
				for (let k = 0; k < line.text.length; k++) {
					const x = left + c.measureText(line.text.slice(0, k)).width;
					const y = line.y + Math.sin(bt * 2.2 - k * 0.55 - li * 1.2) * 7 * settle;
					c.fillStyle = INK;
					c.fillText(line.text[k], x + TITLE.shadow[0], y + TITLE.shadow[1]);
					c.fillStyle = line.fill;
					c.fillText(line.text[k], x, y);
				}
			});
			c.restore();

			// the playhead: bold on its first pass (with a dot on each line), faint after
			if (head) {
				const x = head.x * W;
				c.globalAlpha = fade * (first ? 1 : 0.25);
				art.rect(c, x - 2.5, TITLE.top - 60, 5, TITLE.bottom - TITLE.top + 120, { fill: INK });
				for (const st of TITLE.strokes) {
					const r = st.rows[Math.min(TITLE.steps - 1, Math.floor(head.x * TITLE.steps))];
					art.circle(c, x, yOf(r), 18, { fill: INK });
					art.circle(c, x, yOf(r), 14, { fill: st.colour });
				}
			}
			c.restore();
		});
	}

	/* ---------- drawing (every animation frame) ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		show.frame(ctx, dt, drawWorld);
	};

	function drawWorld(ctx) {
		art.rect(ctx, 0, 0, WIDTH, H, { fill: PAPER });
		if (round && round.kind === 'shades') drawShades(ctx);
		drawGrid(ctx);
		if (!round) return;
		if (round.kind === 'chords') drawChords(ctx);
		if (round.kind === 'trace' || round.kind === 'bend') drawMelody(ctx);

		if (round.pens) {
			// the earlier passes, faint (the echoes, in the jam)
			passes.slice(0, -1).forEach((layer, age) => layer.forEach((ink, i) => drawInk(ctx, ink, i, STEPS, round.kind === 'jam' ? 0.3 + 0.1 * age : 0.18)));
			// this pass, up to the playhead
			const now = passes[passes.length - 1];
			if (now && phase === 'run') now.forEach((ink, i) => drawInk(ctx, ink, i, cur + 1, 1, true));
		}
		if (round.kind === 'shapes') drawStrokes(ctx);
		if (round.kind === 'bend') drawLine(ctx);

		drawDots(ctx);
		if (phase === 'run') drawPlayhead(ctx);
		if (round.kind === 'shapes') drawFreePens(ctx);

		for (const r of rings) art.circle(ctx, r.x, r.y, 14 + r.age * 70, { fill: r.colour, alpha: 0.4 * (1 - r.age / 0.6) });
		for (const p of pops) {
			art.text(ctx, p.text, p.x, p.y - p.age * 60, { size: p.size || 44, font: DISPLAY, fill: p.fill, alpha: clamp01(1.2 - p.age), outline: 'white', outlineWidth: 6 });
		}
	}

	function drawGrid(ctx) {
		const names = round ? round.names : null;
		const roots = round ? round.len : 0;
		for (let r = 0; r < ROWS; r++) {
			const y = rowY(r);
			const isRoot = round && r % roots === 0;
			art.rect(ctx, 0, y - (isRoot ? 2 : 1), WIDTH, isRoot ? 4 : 2, { fill: isRoot ? BAR : RULE });
		}
		for (let s = 0; s <= STEPS; s += 2) {
			const x = s * STEP_W;
			const isBar = s % BAR_STEPS === 0;
			art.rect(ctx, x - (isBar ? 1.5 : 0.75), TOP - 30, isBar ? 3 : 1.5, BOTTOM - TOP + 60, { fill: isBar ? BAR : RULE });
		}
		if (!names) return;
		// each wall names its notes down its left edge
		for (let w = 0; w < 3; w++) {
			for (let r = 0; r < ROWS; r++) {
				const isRoot = r % roots === 0;
				art.text(ctx, names[r], w * W + 34, rowY(r), { size: isRoot ? 30 : 24, font: MONO, fill: isRoot ? INK : PENCIL, align: 'left' });
			}
		}
	}

	function drawMelody(ctx) {
		const m = round.melody;
		ctx.save();
		ctx.setLineDash([22, 14]);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = PENCIL;
		ctx.lineWidth = 8;
		ctx.beginPath();
		for (let s = 0; s < STEPS; s++) {
			const x = stepX(s);
			const y = rowY(m[s]);
			if (s === 0) ctx.moveTo(x - STEP_W / 2, y); else ctx.lineTo(x, y);
		}
		ctx.lineTo(STEPS * STEP_W, rowY(m[STEPS - 1]));
		ctx.stroke();
		ctx.restore();
	}

	function drawChords(ctx) {
		round.chords.forEach(function (ch, b) {
			const x0 = b * BAR_STEPS * STEP_W;
			const w = BAR_STEPS * STEP_W;
			const here = phase === 'run' && Math.floor(cur / BAR_STEPS) === b;
			for (let r = 0; r < ROWS; r++) {
				if (!ch.degrees.has(r % 7)) continue;
				art.rect(ctx, x0 + 6, rowY(r) - 16, w - 12, 32, { fill: round.fill, alpha: here ? 0.32 : 0.14 });
			}
			art.text(ctx, ch.name, x0 + w / 2, TOP - 70, { size: here ? 64 : 50, font: MONO, fill: here ? INK : PENCIL });
			art.text(ctx, ch.num, x0 + w / 2, TOP - 125, { size: 30, font: MONO, fill: PENCIL });
		});
	}

	// one player's line: through the middle of each step drawn, nudged so lines on one row stay apart
	function drawInk(ctx, ink, i, upTo, alpha, live) {
		const off = (i - (count - 1) / 2) * 5;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = pens[i].colour;
		ctx.lineWidth = LINE;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		let open = false;
		for (let s = 0; s < upTo && s < STEPS; s++) {
			const r = ink[s];
			if (r < 0) { open = false; continue; }
			const x = stepX(s);
			const y = rowY(r) + off;
			if (!open) { ctx.moveTo(s * STEP_W, y); open = true; }
			ctx.lineTo(x, y);
		}
		if (live && open) ctx.lineTo(playheadX(), pens[i].y + off);
		ctx.stroke();
		ctx.restore();
	}

	// free ink: smooth strokes through the points (midpoint curves)
	function drawStrokes(ctx) {
		ctx.save();
		ctx.lineWidth = LINE;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (const st of strokes) {
			const p = st.pts;
			if (p.length < 2) continue;
			ctx.strokeStyle = pens[st.i].colour;
			ctx.beginPath();
			ctx.moveTo(p[0].x, p[0].y);
			for (let k = 1; k < p.length - 1; k++) ctx.quadraticCurveTo(p[k].x, p[k].y, (p[k].x + p[k + 1].x) / 2, (p[k].y + p[k + 1].y) / 2);
			ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
			ctx.stroke();
		}
		ctx.restore();
	}

	function drawFreePens(ctx) {
		pens.forEach(function (pen) {
			if (!pen.free) return;
			if (pen.flash > 0) art.circle(ctx, pen.fx, pen.fy, PEN_R + 18 * (1 - pen.flash) + 6, { fill: pen.colour, alpha: pen.flash * 0.35 });
			art.circle(ctx, pen.fx, pen.fy, PEN_R + 4, { fill: INK });
			art.circle(ctx, pen.fx, pen.fy, PEN_R, { fill: pen.colour });
		});
	}

	// shades: soft discs, the deeper the more they've been touched
	function drawShades(ctx) {
		for (const sh of shades) {
			const c = pens[sh.i] ? pens[sh.i].colour : INK;
			const a = sh.a * (1 + sh.flash * 0.4);
			art.circle(ctx, sh.x, sh.y, sh.r * (1 + sh.flash * 0.05), { fill: c, alpha: a * 0.35 });
			art.circle(ctx, sh.x, sh.y, sh.r * 0.72, { fill: c, alpha: a * 0.35 });
			art.circle(ctx, sh.x, sh.y, sh.r * 0.42, { fill: c, alpha: a * 0.4 });
		}
	}

	// the string: a smooth line through its steps, each stretch in the colour of who pulled it
	function drawLine(ctx) {
		const pt = (s) => ({ x: stepX(s), y: rowY(lineShown[s]) });
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = LINE + 8;
		ctx.strokeStyle = INK;
		ctx.beginPath();
		ctx.moveTo(0, pt(0).y);
		for (let s = 0; s < STEPS; s++) ctx.lineTo(pt(s).x, pt(s).y);
		ctx.lineTo(WIDTH, pt(STEPS - 1).y);
		ctx.stroke();
		ctx.lineWidth = LINE - 2;
		for (let s = 0; s < STEPS; s++) {
			const a = s === 0 ? { x: 0, y: pt(0).y } : { x: (pt(s - 1).x + pt(s).x) / 2, y: (pt(s - 1).y + pt(s).y) / 2 };
			const b = s === STEPS - 1 ? { x: WIDTH, y: pt(s).y } : { x: (pt(s).x + pt(s + 1).x) / 2, y: (pt(s).y + pt(s + 1).y) / 2 };
			ctx.strokeStyle = lineBy[s] >= 0 && pens[lineBy[s]] ? pens[lineBy[s]].colour : '#fffaf0';
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(pt(s).x, pt(s).y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}
		ctx.restore();
		// the steps already on the pencil: a dot
		for (let s = 0; s < STEPS; s++) {
			if (Math.round(line[s]) === round.melody[s]) art.circle(ctx, pt(s).x, pt(s).y, 7, { fill: INK });
		}
	}

	function drawDots(ctx) {
		for (const d of dots) {
			const r = { hat: 10, clap: 15, kick: 21 }[d.kind];
			const n = { hat: 1, clap: 2, kick: 3 }[d.kind];
			for (let k = 0; k < n; k++) {
				const x = stepX(d.s) + (k - (n - 1) / 2) * (r * 2.4);
				art.circle(ctx, x, d.y, r * (1 + d.flash * 0.6), { fill: INK });
			}
		}
	}

	function drawPlayhead(ctx) {
		const x = playheadX();
		art.rect(ctx, x - 2, TOP - 40, 4, BOTTOM - TOP + 80, { fill: INK });
		if (!round.pens) return;
		pens.forEach(function (pen, i) {
			const off = (i - (count - 1) / 2) * 5;
			const y = pen.y + off;
			if (pen.flash > 0) art.circle(ctx, x, y, PEN_R + 18 * (1 - pen.flash) + 6, { fill: pen.colour, alpha: pen.flash * 0.35 });
			art.circle(ctx, x, y, PEN_R + 4, { fill: INK });
			art.circle(ctx, x, y, PEN_R, { fill: pen.colour });
		});
	}

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
	};

	// Who touched: the player the simulator just touched with, or else the
	// one nearest that spot on the wall.
	function toucher(at) {
		for (let i = 0; i < count; i++) {
			const p = latest[i];
			if (p && p.wallChange !== undefined && p.wallChange !== null && p.wallChange !== false) { p.wallChange = null; return i; }
		}
		const wall = Math.max(0, Math.min(2, Math.floor(at.x / W)));
		const along = at.x / W - wall;
		let best = 0;
		let bestD = Infinity;
		for (let i = 0; i < count; i++) {
			const w = latest[i] && latest[i].walls && latest[i].walls[wall];
			if (!w) continue;
			const d = Math.abs(w.px - along) + w.dist;
			if (d < bestD) { bestD = d; best = i; }
		}
		return best;
	}

	function tap(at) {
		wake();
		if (!isLive || !round || !at || !count) return;
		taps++;
		if (round.kind === 'shades') return paint(at);
		if (round.kind === 'bend') return bend(at);
		if (round.kind === 'shapes') return pickWall(at);
		// a drum dot where it lands (snapped to the eighth)
		const s = Math.max(0, Math.min(STEPS - 1, Math.floor(at.x / STEP_W)));
		const kind = at.y < H * 0.45 ? 'hat' : at.y < H * 0.7 ? 'clap' : 'kick';
		const y = Math.max(TOP, Math.min(BOTTOM, at.y));
		const same = dots.findIndex((d) => d.s === s && d.kind === kind);
		if (same >= 0) dots.splice(same, 1);   // (tap a dot again to take it away)
		else {
			dots.push({ s, kind, y, flash: 1 });
			if (dots.length > MAX_DOTS) dots.shift();
			drum(kind);
		}
	}

	// draw on the wall you touch (a fresh stroke there, the pen jumping straight across)
	function pickWall(at) {
		const i = toucher(at);
		const pen = pens[i];
		const wall = Math.max(0, Math.min(2, Math.floor(at.x / W)));
		if (!pen || pen.wall === wall) return;
		pen.wall = wall;
		pen.free = false;
		pen.stroke = null;
		pen.flash = 1;
		rings.push({ x: at.x, y: Math.max(TOP, Math.min(BOTTOM, at.y)), colour: pen.colour, age: 0 });
		note(i, round.midiAt(yRow(at.y)), 0.5);
	}

	// a shade where you touch, or a deeper, bigger one where you touched before
	function paint(at) {
		const i = toucher(at);
		const y = Math.max(TOP, Math.min(BOTTOM, at.y));
		const mine = shades.find((sh) => sh.i === i && Math.hypot(sh.x - at.x, sh.y - y) < SHADE_MERGE);
		if (mine) {
			mine.a = Math.min(1, mine.a + 0.2);
			mine.r = Math.min(SHADE_MAX_R, mine.r + SHADE_GROW);
			mine.flash = 1;
		} else {
			shades.push({ i, x: at.x, y, r: SHADE_R, a: 0.45, flash: 1 });
			if (shades.length > MAX_SHADES) shades.shift();
		}
		note(i, round.midiAt(yRow(y)), 0.6);
	}

	// pull the string to where you touch, the pull spreading a little either side
	function bend(at) {
		const i = toucher(at);
		const goal = Math.max(0, Math.min(ROWS - 1, (BOTTOM - at.y) / (BOTTOM - TOP) * (ROWS - 1)));
		const c = at.x / STEP_W - 0.5;
		for (let s = Math.max(0, Math.floor(c - 5)); s <= Math.min(STEPS - 1, Math.ceil(c + 5)); s++) {
			const w = Math.exp(-((s - c) * (s - c)) / (2 * BEND_SIGMA * BEND_SIGMA));
			line[s] += (goal - line[s]) * w;
			if (w >= BEND_OWN) lineBy[s] = i;
		}
		note(i, round.midiAt(Math.round(goal)), 0.6);
	}

	stage.$el.on('pointerdown.melody-canvas', wake);
	stage.$el.on('click.melody-canvas', (e) => tap(IGB.toWorld(e)));

	/* ---------- debug: straight to a mode ---------- */

	if (show.menu && show.menu.drow) {
		const $modes = show.menu.drow('MODES');
		for (const kind of Object.keys(KINDS)) {
			show.menu.dbutton(KINDS[kind].title.toUpperCase(), function () {
				if (!count) return;
				if (show.beat !== 'play') show.go('play');
				roundNo = ROUNDS.findIndex((r) => r.kind === kind);
				startRound(ROUNDS[roundNo]);
			}, KINDS[kind].fill).appendTo($modes);
		}
	}

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(),
		round: round && { kind: round.kind, label: round.label, phase, step: cur, pass },
		pens: pens.map((p) => (round && round.kind === 'shapes' ? { x: Math.round(p.fx), y: Math.round(p.fy) } : p.row)),
		dots: dots.length,
		strokes: strokes.length,
		shades: shades.length,
	});

	self.fini = function () {
		stage.$el.off('.melody-canvas');
		stage.$ui.off('.melody-canvas');
		if (ac && ac.state !== 'closed') ac.close();
		show.fini();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
