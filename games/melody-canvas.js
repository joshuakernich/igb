/*
 * Melody Canvas
 *
 * A drawing instrument for the whole room, after Tala Schlossberg's "Play
 * Music Theory" (playmusictheory.net): lines drawn on paper are a melody,
 * a playhead sweeps across them and plays them, and the grid is locked to a
 * key and scale so every note fits. The grid names its notes.
 *
 * The three walls are one long sheet of paper. A playhead sweeps it, left
 * wall to right wall, eight beats on each, and every player is a pen riding
 * it in their own colour: the closer you stand to the wall being drawn on,
 * the higher your note. Your pen leaves a line behind it and plays your own
 * instrument as it moves. Tap any wall to drop a drum dot on the paper
 * (high on the wall a hi-hat, the middle a clap, low a kick); the playhead
 * plays it every time it passes.
 *
 * The rounds come round in threes, each in a new key and scale, a little
 * faster each time:
 *   TRACE THE LINE   a pencil melody is sketched on the paper and plays
 *                    softly; keep your pen on it (a point a step)
 *   HIT THE CHORDS   each bar is a chord (its name over it, its notes
 *                    shaded) over a bass line; stay on a chord note (a point
 *                    a step), and when three players cover the whole chord
 *                    together, FULL CHORD: a bonus each
 *   FREE JAM         paint anything; every pass leaves an echo that plays
 *                    on under the next, so the room layers up a song (a
 *                    point for every note you hold)
 *
 * Input: walls[n].dist (how near the wall under the playhead you stand:
 * pitch), clicks on the walls (drum dots).
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

	const ROWS = 11;             // notes up the paper
	const TOP = 330;             // the highest row's y
	const BOTTOM = 860;          // the lowest row's y
	const STEPS = 48;            // eighth notes in a pass: eight beats on each wall
	const STEP_W = WIDTH / STEPS;
	const BAR_STEPS = 8;
	const INTRO = 3.2;           // seconds of a round's title card before the playhead sets off
	const NEAR = 0.1;            // nearer the wall than this is the top note...
	const FAR = 0.9;             // ...further than this the bottom one
	const STICKY = 0.7;          // rows the pen has to be pulled before it changes note
	const MAX_DOTS = 40;
	const LINE = 13;
	const PEN_R = 22;

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

	const KINDS = {
		trace: { title: 'TRACE THE LINE', fill: '#3f9e7f', loops: 2 },
		chords: { title: 'HIT THE CHORDS', fill: '#7a72d8', loops: 2 },
		jam: { title: 'FREE JAM', fill: '#e8a83c', loops: 3 },
	};
	const ROUNDS = [
		{ kind: 'trace', key: 0, scale: 'MAJOR PENTATONIC', bpm: 96 },
		{ kind: 'chords', key: 0, scale: 'MAJOR', bpm: 96, prog: ['I', 'V', 'vi', 'IV', 'I', 'V'] },
		{ kind: 'jam', key: 2, scale: 'DORIAN', bpm: 100 },
		{ kind: 'trace', key: 9, scale: 'MINOR PENTATONIC', bpm: 100 },
		{ kind: 'chords', key: 9, scale: 'MINOR', bpm: 104, prog: ['i', 'VI', 'III', 'VII', 'i', 'v'] },
		{ kind: 'jam', key: 4, scale: 'BLUES', bpm: 104 },
		{ kind: 'trace', key: 7, scale: 'MAJOR', bpm: 108 },
		{ kind: 'chords', key: 7, scale: 'MAJOR', bpm: 108, prog: ['I', 'vi', 'IV', 'V', 'I', 'IV'] },
		{ kind: 'jam', key: 5, scale: 'LYDIAN', bpm: 112 },
		{ kind: 'trace', key: 2, scale: 'MIXOLYDIAN', bpm: 112 },
		{ kind: 'chords', key: 5, scale: 'MAJOR', bpm: 116, prog: ['I', 'IV', 'ii', 'V', 'iii', 'vi'] },
		{ kind: 'jam', key: 0, scale: 'MINOR PENTATONIC', bpm: 116 },
	];
	const TUTORIAL_ROUND = { kind: 'trace', key: 0, scale: 'MAJOR PENTATONIC', bpm: 90, loops: Infinity };

	const rowY = (r) => BOTTOM - r * (BOTTOM - TOP) / (ROWS - 1);
	const stepX = (s) => (s + 0.5) * STEP_W;
	const clamp01 = (v) => Math.max(0, Math.min(1, v));
	const pick = (a) => a[Math.floor(Math.random() * a.length)];

	/* ---------- sound: everything synthesised ---------- */

	const AC = window.AudioContext || window.webkitAudioContext;
	const ac = AC ? new AC() : null;
	let master = null;
	let noise = null;
	if (ac) {
		const comp = ac.createDynamicsCompressor();
		comp.connect(ac.destination);
		master = ac.createGain();
		master.gain.value = 0.8;
		master.connect(comp);
		noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
		const d = noise.getChannelData(0);
		for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
	}
	const wake = () => { if (ac && ac.state === 'suspended') ac.resume(); };
	const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

	function gainEnv(t, attack, peak, decay) {
		const g = ac.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(peak, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
		g.connect(master);
		return g;
	}
	function tone(type, f, t, len, out) {
		const o = ac.createOscillator();
		o.type = type;
		o.frequency.value = f;
		o.connect(out);
		o.start(t);
		o.stop(t + len + 0.05);
		return o;
	}

	// one instrument a player, in player order
	const VOICES = [
		function piano(f, t, v) {
			const g = gainEnv(t, 0.005, 0.32 * v, 0.9);
			tone('triangle', f, t, 0.95, g);
			const g2 = gainEnv(t, 0.005, 0.08 * v, 0.4);
			tone('sine', f * 2, t, 0.45, g2);
		},
		function marimba(f, t, v) {
			tone('sine', f, t, 0.5, gainEnv(t, 0.004, 0.42 * v, 0.45));
			tone('sine', f * 4, t, 0.1, gainEnv(t, 0.002, 0.12 * v, 0.07));
		},
		function pluck(f, t, v) {
			const g = gainEnv(t, 0.004, 0.22 * v, 0.55);
			const lp = ac.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.setValueAtTime(3200, t);
			lp.frequency.exponentialRampToValueAtTime(380, t + 0.35);
			lp.connect(g);
			tone('sawtooth', f, t, 0.6, lp);
		},
		function bell(f, t, v) {
			const g = gainEnv(t, 0.003, 0.26 * v, 1.3);
			const car = tone('sine', f, t, 1.35, g);
			const mg = ac.createGain();
			mg.gain.setValueAtTime(f * 2.2, t);
			mg.gain.exponentialRampToValueAtTime(1, t + 1);
			mg.connect(car.frequency);
			tone('sine', f * 3.5, t, 1.35, mg);
		},
		function lead(f, t, v) {
			const g = gainEnv(t, 0.01, 0.12 * v, 0.5);
			const lp = ac.createBiquadFilter();
			lp.type = 'lowpass';
			lp.frequency.value = 1700;
			lp.connect(g);
			tone('square', f, t, 0.55, lp);
		},
		function flute(f, t, v) {
			const g = gainEnv(t, 0.06, 0.3 * v, 0.7);
			const o = tone('sine', f, t, 0.8, g);
			const lfo = ac.createOscillator();
			const lg = ac.createGain();
			lfo.frequency.value = 5.5;
			lg.gain.value = f * 0.007;
			lfo.connect(lg);
			lg.connect(o.frequency);
			lfo.start(t);
			lfo.stop(t + 0.85);
		},
	];

	function note(voice, midi, vol = 1) {
		if (!ac) return;
		VOICES[voice % VOICES.length](hz(midi), ac.currentTime + 0.01, vol);
	}
	function guide(midi) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		tone('sine', hz(midi), t, 0.6, gainEnv(t, 0.02, 0.13, 0.55));
	}
	function bass(midi, len) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		const g = gainEnv(t, 0.01, 0.34, len);
		const lp = ac.createBiquadFilter();
		lp.type = 'lowpass';
		lp.frequency.value = 600;
		lp.connect(g);
		tone('triangle', hz(midi), t, len + 0.05, lp);
	}
	function pad(midis, len) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		for (const m of midis) tone('triangle', hz(m), t, len + 0.3, gainEnv(t, 0.25, 0.045, len));
	}
	function drum(kind, vol = 1) {
		if (!ac) return;
		const t = ac.currentTime + 0.01;
		if (kind === 'kick') {
			const g = gainEnv(t, 0.002, 0.6 * vol, 0.22);
			const o = tone('sine', 150, t, 0.25, g);
			o.frequency.setValueAtTime(150, t);
			o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
			return;
		}
		const src = ac.createBufferSource();
		src.buffer = noise;
		const f = ac.createBiquadFilter();
		f.type = kind === 'hat' ? 'highpass' : 'bandpass';
		f.frequency.value = kind === 'hat' ? 7000 : 1500;
		f.Q.value = kind === 'hat' ? 0.7 : 1.2;
		src.connect(f);
		f.connect(gainEnv(t, 0.002, (kind === 'hat' ? 0.18 : 0.45) * vol, kind === 'hat' ? 0.05 : 0.16));
		src.start(t);
		src.stop(t + 0.3);
	}

	/* ---------- state ---------- */

	let count = 0;
	let scores = [];
	let pens = [];             // { row, y, heldFor, flash, colour }
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
	let pops = [];             // words floating up: { x, y, text, fill, age }
	let taps = 0;
	let fullBars = new Set();

	const playheadX = () => (phase === 'run' ? (cur + frac) * STEP_W : 0);

	function setUp(def) {
		const scale = SCALES[def.scale];
		const len = scale.length;
		const base = 48 + (def.key > 6 ? def.key - 12 : def.key);
		const midiAt = (r) => base + 12 * Math.floor(r / len) + scale[r % len];
		const r = Object.assign({}, def, KINDS[def.kind], def.loops ? { loops: def.loops } : {}, {
			scaleSteps: scale, len, base, midiAt,
			label: `${NAMES[def.key]} ${def.scale}`,
			names: Array.from({ length: ROWS }, (_, i) => NAMES[(def.key + scale[i % len]) % 12]),
		});
		if (def.kind === 'trace') r.melody = makeMelody(len);
		if (def.kind === 'chords') r.chords = def.prog.map((num) => chordOf(num, r));
		return r;
	}

	// A pencil melody: held notes of a quarter to a dotted half, mostly
	// stepwise, coming home to a root over the last bar.
	function makeMelody(len) {
		const out = new Array(STEPS);
		const lo = len === 5 ? 1 : 2;
		const hi = 9;
		let r = len;
		let s = 0;
		while (s < STEPS) {
			const left = STEPS - s;
			let d = left <= BAR_STEPS ? left : pick([2, 2, 4, 4, 6]);
			if ((s % BAR_STEPS) + d > BAR_STEPS && left > BAR_STEPS) d = BAR_STEPS - (s % BAR_STEPS);
			for (let k = 0; k < d; k++) out[s + k] = r;
			s += d;
			r = Math.max(lo, Math.min(hi, r + pick([-2, -1, -1, -1, 1, 1, 1, 2, 3, -3])));
			if (STEPS - s <= BAR_STEPS) r = Math.abs(r - len) <= Math.abs(r - 2 * len) || 2 * len > hi ? len : 2 * len;
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
		fullBars = new Set();
		newPass();
		show.label(`${round.title} · ${round.label}`);
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
		show.beats.titleDrop(),
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
				passes = [];
				dots = [];
				round = null;
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'PAINT THE MUSIC!', W / 2, 300, 120, bt - 0.2, { fill: '#e8a83c' });
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
					show.slam(c, round.title, W / 2, 190, 110, phaseT, { fill: round.fill });
					show.text(c, round.label, W / 2, 300, 56, { fill: 'white', glow: round.fill, alpha: clamp01((phaseT - 0.4) * 3) });
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
		pens = Array.from({ length: n }, (_, i) => ({ row: 5, y: rowY(5), heldFor: 0, flash: 0, colour: PLAYER_COLORS[i % PLAYER_COLORS.length] }));
		show.go('title');
	}

	/* ---------- every frame ---------- */

	function tick(dt) {
		if (show.paused || !round) return;
		t += dt;
		if (master) master.gain.value = 0.8 * (IGB.volume === undefined ? 1 : IGB.volume);
		steerPens(dt);
		for (const p of pens) p.flash = Math.max(0, p.flash - dt * 3);
		for (const d of dots) d.flash = Math.max(0, d.flash - dt * 4);
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

	// each pen follows its player: nearer the wall under the playhead, higher
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

	function playStep(s) {
		const bar = Math.floor(s / BAR_STEPS);
		const inBar = s % BAR_STEPS;
		const stepLen = 60 / round.bpm / 2;

		// the backing: a soft kick on one and three, hats on the offbeats
		if (inBar === 0 || inBar === 4) drum('kick', 0.45);
		if (s % 2 === 1) drum('hat', 0.35);

		if (round.kind === 'trace') {
			const m = round.melody[s];
			if (s === 0 || m !== round.melody[s - 1]) guide(round.midiAt(m) + 12);
		}
		if (round.kind === 'chords') {
			const ch = round.chords[bar];
			if (inBar === 0) pad(ch.midis.map((m) => m + 12), stepLen * BAR_STEPS);
			if (inBar === 0 || inBar === 4 || inBar === 6) bass(round.base - 12 + round.scaleSteps[ch.root], stepLen * (inBar === 6 ? 2 : 4));
		}

		// echoes: in the jam, every earlier pass plays on, quieter
		if (round.kind === 'jam') {
			passes.slice(0, -1).forEach(function (layer, age) {
				layer.forEach(function (ink, i) {
					const r = ink[s];
					if (r >= 0 && (s === 0 || r !== ink[s - 1] || s % 4 === 0)) note(i, round.midiAt(r), 0.35 + 0.15 * age);
				});
			});
		}

		for (const d of dots) if (d.s === s) { drum(d.kind); d.flash = 1; }

		// the pens: draw, play, score
		const ink = passes[passes.length - 1];
		const covered = new Map();   // chord degree -> players on it
		pens.forEach(function (pen, i) {
			const r = pen.row;
			const was = s > 0 ? ink[i][s - 1] : -1;
			ink[i][s] = r;
			if (r !== was) pen.heldFor = 0; else pen.heldFor++;
			if (r !== was || s % 4 === 0) note(i, round.midiAt(r), 1);

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
				pops.push({ x: stepX(s), y: TOP - 40, text: 'FULL CHORD!', fill: round.fill, age: 0, size: 64 });
				if (show.fx) show.fx('pick', 0.5);
			}
		}
	}

	function score(i, n) {
		scores[i] += n;
		pens[i].flash = 1;
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
		drawGrid(ctx);
		if (!round) return;
		if (round.kind === 'chords') drawChords(ctx);
		if (round.kind === 'trace') drawMelody(ctx);

		// the earlier passes, faint (the echoes, in the jam)
		passes.slice(0, -1).forEach((layer, age) => layer.forEach((ink, i) => drawInk(ctx, ink, i, STEPS, round.kind === 'jam' ? 0.3 + 0.1 * age : 0.18)));
		// this pass, up to the playhead
		const now = passes[passes.length - 1];
		if (now && phase === 'run') now.forEach((ink, i) => drawInk(ctx, ink, i, cur + 1, 1, true));

		drawDots(ctx);
		if (phase === 'run') drawPlayhead(ctx);

		for (const p of pops) {
			art.text(ctx, p.text, p.x, p.y - p.age * 60, { size: p.size || 44, font: 'Lexend', fill: p.fill, alpha: clamp01(1.2 - p.age), outline: 'white', outlineWidth: 6 });
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

	// a tap on a wall drops a drum dot where it lands (snapped to the eighth)
	function tap(at) {
		wake();
		if (!isLive || !round || !at) return;
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
		taps++;
	}
	stage.$el.on('pointerdown.melody-canvas', wake);
	stage.$el.on('click.melody-canvas', (e) => tap(IGB.toWorld(e)));

	self.state = () => Object.assign(show.state(), {
		scores: scores.slice(),
		round: round && { kind: round.kind, label: round.label, phase, step: cur, pass },
		pens: pens.map((p) => p.row),
		dots: dots.length,
	});

	self.fini = function () {
		stage.$el.off('.melody-canvas');
		if (ac && ac.state !== 'closed') ac.close();
		show.fini();
	};

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
