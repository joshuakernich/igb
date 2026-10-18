/*
 * Showtime — the choreographed show around a timed team game: a dramatic
 * clock reveal, the game's own intros and rounds, then TIME!, everyone's
 * scores, a last-to-first ranking onto a podium, the team total smooshed
 * together, a (fake) leaderboard climb, and a fast-forward replay of where
 * everyone ran. Everything is drawn on the world canvas, frame by frame,
 * from one explicit list of beats, so the order and timing are easy to tune.
 *
 *   const show = new Showtime(stage, {
 *       id: 'gwi-ma-showdown',            // seeds the fake leaderboard
 *       seconds: 600,                     // the game clock (for the intro and fake replays)
 *       players: () => 3,                 // how many players (a number or a function)
 *       scores: () => [12, 40, 7],        // each player's score
 *       bonus: () => 300,                 // optional team-only points, added to the total
 *       bonusLabel: 'ROUND BONUS',
 *       score: (n) => '₩' + n,         // optional: how a score reads (default, the plain number)
 *       drawAvatar(ctx, n, x, y, scale, pose) {},   // optional: the game's own character,
 *                                         // feet at (x, y), scale 1 about 120 units tall;
 *                                         // pose 'stand' | 'cheer' | 'win'
 *       theme: { accent, accent2, gold, ink, sky: [top, bottom], font,
 *                panel, floor, glow },     // (the results' panels, the podium floor, the backdrop's glow)
 *       backdrop(ctx, time) {},           // optional: drawn over the results backdrop, once per wall
 *       rivals: ['Team names', ...],      // optional names for the fake leaderboard
 *       sounds: { drama: ['assets/...mp3', 0.3, true] },   // optional overrides
 *       music: false,                     // optional: no music, only the effects
 *       // the clock, by default: its digits in a steady monospace digital font,
 *       // outlined and dropped like the rest of the text, in a capsule like the
 *       // score capsules (black glass, sunk into the top edge, a white band)
 *       clockBox: false,                  // optional: no capsule behind the clock (by default, one like the score capsules)
 *       clockOutline: true,               // optional: and a coloured outline round it
 *       clockFont: 'Rubik',               // optional: the digits in another font (null: the show's font)
 *       font: 'Game of Squids',           // optional: one font for everything the show writes (load it first)
 *   });
 *
 *   show.sequence([                       // the running order
 *       { id: 'squad', length: Infinity, draw(ctx, bt) {} },   // a game beat
 *       show.beats.titleDrop({ lines: [{ text: 'GAME', fill }] }),   // raised over a START button it waits for (start: false: on by itself)
 *       show.beats.clockIntro(),
 *       show.beats.visors(),               // visors on, a wiggle in the middle; wrong ones flagged
 *       { id: 'play', update(dt, bt) {}, draw(ctx, bt) {} },
 *       show.beats.timeUp({ update(dt, bt) {} }),   // a generic beat, extended
 *       show.beats.scores(), show.beats.rank(), show.beats.team(),
 *       show.beats.board(), show.beats.replay(),
 *       show.beats.rate(),                 // one rating for the group; then why, or play again
 *       show.beats.end({ enter() { IGB.complete(...) } }),
 *   ]);
 *   self.draw = (ctx, time) => show.frame(ctx, dt, drawWorld);
 *
 * A beat is { id, length (seconds, or a function), world, holdClock, enter(),
 * exit(), update(dt, bt), draw(ctx, bt), done(bt) }. bt is the time into the
 * beat; holdClock stops the clock while it runs. The show moves on when bt passes
 * length or done() says so; show.go(id) jumps anywhere (tests use it to skip
 * the intros). world: false beats are drawn on the show's own backdrop; the
 * others draw the game's world (drawWorld) through the camera first. draw()
 * is for overlays and is never zoomed. show.cue(s) is true once, the frame bt
 * passes s: hang one-shot events (a slam, a sound) on it. Generic beats take
 * an extension object whose enter/update/draw run after theirs and whose
 * length/world/done win.
 *
 * Also:
 *   show.camera        .cut(shot) .move(shot, seconds) .follow(fn) .wide(seconds)
 *                      a shot is { x, y, z }: the world point at the centre
 *                      of the screen and the zoom. The view never shows past
 *                      the world's edges.
 *   the skip button    "SKIP TUTORIAL ▶▶" in the middle of the front wall, only
 *                      through the tutorial (the 'controls' beat); it jumps to
 *                      the beat after it (opts.skip: { during, to, label,
 *                      at: { x, y } }; at: false puts it in the bottom corner)
 *   show.pickPlayers(fn)   the squad picker, in the show's own style: buttons
 *                      2-6 on the front wall; fn(count) once one is picked
 *   show.slam(ctx, text, x, y, size, age, style)   a title crashing in
 *   show.text(ctx, text, x, y, size, style)        the show's big caption type
 *   show.onWalls(ctx, fn)  fn(ctx, wall) once per wall, (0, 0) its top-left
 *   the clock          the show runs it: it starts counting from 10:00 in the
 *                      clock intro's dial, before flying up to its place (or
 *                      when the show skips past the intro) and runs through every beat until
 *                      it hits zero, when the show goes to 'timeup'. It ticks
 *                      the last ten seconds.
 *   show.label(text)   the line under the corner clock ('ROUND 2')
 *   show.timeLeft()    seconds left; show.setTimeLeft(s) for tests
 *   show.setClock(secondsLeft, label)  set both by hand
 *   show.record(t, [{ px, pz } | null, ...])   feed every tick; sampled for the replay
 *   show.mark(t)       a moment worth marking on the replay timeline (a round won)
 *   show.shake / show.flash / show.blackout   0..1, settable; shake and flash decay
 *   show.timeScale     slows to 0 during TIME!; step your world by dt * timeScale
 *   show.confetti(n) / show.burst(x, y, colour)   celebrations
 *   show.play(id) / show.stop(id)   the shared sounds (see SOUNDS), and
 *   show.fx(name, volume, rate, extra)   a generated sound for a moment (shared/sfx.js:
 *                      'wordSlam', 'visorLock', 'fanfare', 'villainReveal'...)
 *   show.sfx.boom() .drum() .roar() .alarm() .riser(s) .sting() .hit()   older synthesised ones
 *   show.state()       the beat, the beats seen in order, and so on, for tests
 *   the score HUD      through 'play', a capsule a player along the bottom of
 *                      every wall (see 'the score capsules');
 *                      opts.scoreHud { rise(i), dim(i) } | false
 *   the pause menu     every show has one: a panel on the left wall opens a
 *                      menu over all three walls (see 'the pause panel and
 *                      menu'); opts.menu { restart(), tutorial() }; show.paused,
 *                      show.pause(on); off the box, show.menu.drow/dbutton
 *                      add debug buttons
 *   show.fini()        closes the show's AudioContext (also done when the stage stops)
 *
 * It runs entirely off the frames it is given, so it stops with the game;
 * its sounds come from stage.audio().
 */
window.Showtime = function (stage, opts) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const theme = Object.assign({}, Showtime.THEME, opts.theme);
	const FONT = opts.font || theme.font;   // (a game can set its own: opts.font, for everything the show writes)
	const SECONDS = opts.seconds || 600;

	/* ---------- tuning: the camera ---------- */

	const CAMERA = {
		follow: 3.5,           // how quickly a following camera catches up (per second)
	};

	/* ---------- tuning: the clock intro ---------- */

	const CLOCK_INTRO = {
		dial: 0.3,             // 1. the dial, out of the dark
		charge: [0.3, 1.6],    //    its ticks light up round
		youHave: 0.7,          // 2. "YOU HAVE", in it, above the middle (while it's still lighting up)
		number: 1.1,           // 3. the clock, at 10:00, in the middle
		unit: 1.5,             // 4. "MINUTES", under it
		count: 2.0,            // the clock starts counting down, still in the dial
		settle: [4.3, 5.2],    // after two ticks it flies up, still counting, to its place at the top of every wall
		length: 5.7,
		radius: 420,           // the dial's outer edge
		size: 300,             // the big number
		words: [100, 112],     // YOU HAVE, MINUTES
		gap: 0.42,             // how far above and below the time they sit (a share of the dial's radius)
		slam: 0.18,            // seconds for a word to crash down into place
		y: 520,                // the dial's centre
	};

	// The intros dim the game's scene behind their titles, never black it out.
	const INTRO_DIM = 0.45;

	/* ---------- tuning: the visor check ---------- */

	const VISORS = {
		show: 4.0,             // just the visors to put on, before the wiggle is asked for
		zone: { px: 0.5, pz: 0.5, r: 0.2 },   // where to stand: the middle of the room (floor 0..1)
		settle: 0.8,           // seconds over which a visor's movement is averaged
		moving: 0.08,          // speed (raw units a second, averaged) that says a visor is in play
		wiggle: 0.2,           // and that says it's wiggling
		hold: 0.6,             // seconds of wiggling in the zone to tick a visor off
		pulse: 0.9,            // the rings that pulse from a visor as it's ticked off
		clear: 1.0,            // everyone ticked and no wrong visors for this long: all set
		allSet: 1.8,           // "ALL SET!" holds this long, then on
		length: 45,            // and on regardless after this long
		y: 300,                // the row of visors
		floor: { far: 330, near: 620, wall: 150 },  // the floor panel: its far and near widths, how high the walls' glow rises (near)
		// each player in play, a worm standing on the floor panel right where
		// they are, as tall as the player (by their visor's height), leaning back
		// away from the way they're moving and springing upright again when they
		// stop, with a wobble that builds up the more they dart left and right
		// (each change of speed kicks it, and the kicks add up). tall: a worm's
		// height, in panel pixels, for a visor at the tracker's top; smooth:
		// seconds over which their speed is averaged; lean: radians per unit of
		// speed across the room (a second), and the most it leans; kick: how hard
		// a change of speed shoves it; swing: the most it can wobble to;
		// spring, damp: how stiff the spring back is and how quickly its wobble
		// dies; r: its body's thickness; segs: how many segments make it up
		worm: { tall: 330, smooth: 0.08, lean: 2.4, most: 0.8, kick: 1.6, swing: 1.3, spring: 60, damp: 2.2, r: 17, segs: 12 },
		// and its two little arms, hanging limp from its shoulders at rest and
		// flailing as it moves. at: how far up the body they hang from; upper,
		// lower: the arm's two lengths, and thick: its thickness (all in body
		// thicknesses); rest: how far out from straight down they hang (radians,
		// and the elbow's bend); spring, damp: how floppy; shove: how hard the
		// body's swaying throws them about; flail: how wildly they wave (per
		// unit of speed across the room)
		arms: { at: 0.68, upper: 1.5, lower: 1.3, thick: 0.42, rest: 0.22, bend: 0.15, spring: 22, damp: 1.6, shove: 0.9, flail: 60 },
	};

	/* ---------- tuning: the rating ---------- */

	const RATE = {
		faces: [                // sad to happy: mouth curve (negative frowns; 20+ opens a grin)
			{ label: 'TERRIBLE', colour: '#e8463b', mouth: -16, brows: true },
			{ label: 'NOT GREAT', colour: '#f28c38', mouth: -8 },
			{ label: 'OKAY', colour: '#f5c632', mouth: 0 },
			{ label: 'GOOD', colour: '#9bd14b', mouth: 12 },
			{ label: 'EXCELLENT', colour: '#3cbf5a', mouth: 22 },
		],
		low: 3,                // a rating this low or lower asks what went wrong; higher offers another game
		reasons: [             // what went wrong (tap any)
			'HARD TO UNDERSTAND', 'CONTROLS DIDN\'T WORK', 'TOO HARD', 'TOO EASY',
			'HARD TO SEE', 'TOO LONG', 'NOT MY KIND OF GAME', 'SOMETHING ELSE',
		],
		notAgain: ['show-debug'],   // games never offered to play again
		wait: { faces: 45, reasons: 40, again: 40 },   // each part moves on after this long untouched
		picked: 1.4,           // the face picked stays up this long before what comes next
		thanks: 2.4,           // THANK YOU! holds this long
	};

	/* ---------- tuning: the title drop ---------- */

	const TITLE = {
		dark: 0.4,             // the room goes dark
		first: 0,              // the first line sets off (straight away)
		lineGap: 0.45,         // and the next after it
		glide: 1.7,            // how long a line takes to glide into place (easing gently to a stop)
		from: [0.8, 0.75],     // where it glides from: this far out (shares of the wall's width and height), the top line from the top left, the next from the bottom right
		startFade: 0.7,        // the START button fading in
		hold: 1.6,             // then it holds
		out: 0.5,              // and fades
		size: 210,
		raised: 330,           // with a START button: the title's middle, raised to make room
		startY: 720,           // and the button's
	};

	/* ---------- tuning: the corner clock ---------- */

	const CLOCK = {
		y: 44,                 // where its digits sit, top centre of every wall (it hangs from the top edge)
		startTicks: 10,        // it ticks out loud for its first seconds...
		tickVolume: 0.6,       // starting this loud and fading to nothing
		size: 64,
		urgent: 30,            // it turns red with this many seconds left
		final: 10,             // and the last ten loom huge, ticking
	};

	/* ---------- tuning: time up ---------- */

	const TIME_UP = {
		slow: 1.3,             // the world slows to a stop over this long
		title: 0.15,           // TIME! slams in
		dark: [3.4, 4.6],      // then the room goes dark
		length: 5.0,
	};

	/* ---------- tuning: all scores ---------- */

	const SCORES = {
		count: [0.8, 3.0],     // the scores count up
		length: 4.4,
		scale: 2.6,            // the avatars in the team total, this many times their game size
		y: 830,                // and where they stand
	};
	const LIST = {
		top: 190,              // the list of players, a row each
		height: 760,
		row: 150,              // at most this tall a row
		width: 1100,
	};
	const RANK = {
		move: [0.5, 1.7],      // the rows slide into rank order
		reveal: 2.2,           // then the places show, last first
		each: 0.65,            // between reveals, each on a drum hit
		hold: 3.2,             // the winner's moment
	};

	/* ---------- tuning: the team total ---------- */

	const TEAM = {
		fade: [0.2, 0.9],      // the rankings, as they were left: all but the scores fade away
		fly: [1.1, 2.0],       // the scores fly together
		count: [2.2, 4.0],     // smooshed, the total shows whole; the party starts after
		bonus: [4.4, 5.5],     // the bonus is added
		length: 10.4,
		y: 450,
	};

	/* ---------- tuning: the leaderboard ---------- */

	const BOARD = {
		drop: 0.06,            // the other teams' rows drop in, one after another
		enter: 1.2,            // your row slides in at the bottom
		climb: 0.2,            // and climbs past each team above it
		hold: 4.5,
		top: 175,
		row: 70,
		teams: 10,
	};

	/* ---------- tuning: the replay ---------- */

	const REPLAY = {
		sample: 0.5,           // record everyone's position this often (game seconds)
		intro: 1.0,
		play: 12,              // the whole game, replayed in this long
		outro: 2.0,
		trail: 30,             // samples of trail behind each player
	};

	/* ---------- helpers ---------- */

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, k) => a + (b - a) * k;
	const ease = (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
	const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
	const easeIn = (k) => { k = clamp(k, 0, 1); return k * k * k; };
	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
	self.ease = ease;
	self.easeOut = easeOut;
	self.between = between;

	const NAMES = ['RED', 'BLUE', 'GREEN', 'PURPLE', 'ORANGE', 'GOLD'];
	const count = () => (typeof opts.players === 'function' ? opts.players() : opts.players) || 0;
	const scores = () => (opts.scores ? opts.scores() : []).map((s) => Math.round(s || 0));
	const bonus = () => Math.round(opts.bonus ? opts.bonus() : 0);
	const colour = (n) => PLAYER_COLORS[n] || 'white';
	// A player colour lifted toward white, so text in it reads on the dark (pure blue doesn't).
	const mixer = document.createElement('canvas').getContext('2d');
	const playerLits = new Set();   // (the text keeps these colours as they are)
	const lit = function (n, k = 0.45) {
		mixer.fillStyle = '#000';
		mixer.fillStyle = colour(n);
		const hex = mixer.fillStyle;
		if (hex[0] !== '#') return colour(n);
		const v = parseInt(hex.slice(1), 16);
		const up = (c) => Math.round(c + (255 - c) * k);
		const out = `rgb(${up(v >> 16)},${up((v >> 8) & 255)},${up(v & 255)})`;
		playerLits.add(out);
		return out;
	};
	self.lit = lit;
	// how a score reads: as a number, or as the game's own (opts.score: e.g. n => '₩' + n)
	const fmt = (n) => (opts.score ? opts.score(n) : String(n));
	self.fmt = fmt;
	self.nameOf = (n) => NAMES[n] || 'P' + (n + 1);
	self.teamTotal = () => scores().reduce((a, b) => a + b, 0) + bonus();

	// A little seeded random, so the fake leaderboard is the same each time
	// for the same game and total.
	function seeded(str) {
		let a = 2166136261;
		for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619);
		return function () {
			a |= 0; a = (a + 0x6D2B79F5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/* ---------- sound ---------- */

	const SOUNDS = {
		drumroll: ['assets/shared/music-drumroll.mp3', 0.5],
		rumble: ['assets/shared/sfx-rumble.mp3', 0.7],
		reveal: ['assets/shared/sfx-reveal.mp3', 0.5],
		explode: ['assets/shared/sfx-explode.mp3', 0.5],
		wooshLong: ['assets/shared/sfx-woosh-long.mp3', 0.4],
		woosh: ['assets/shared/sfx-woosh.mp3', 0.4],
		cheer: ['assets/shared/sfx-cheer.mp3', 0.6],
		tick: ['assets/shared/sfx-tick.mp3', 0.4],
		tock: ['assets/shared/sfx-tock.mp3', 0.5],
		coin: ['assets/shared/sfx-coin.mp3', 0.35],
		buzz: ['assets/shared/sfx-buzz.mp3', 0.5],
		correct: ['assets/shared/sfx-correct.mp3', 0.4],
		charge: ['assets/shared/sfx-charge.mp3', 0.4],
		drama: ['assets/shared/music-drama.mp3', 0.3, true],
		replay: ['assets/shared/music-beats-120-short.mp3', 0.35, true],
	};
	Object.assign(SOUNDS, opts.sounds);
	const audio = stage.audio();
	for (const id in SOUNDS) audio.add(id, SOUNDS[id][0], SOUNDS[id][1], !!SOUNDS[id][2]);
	self.audio = audio;
	// (music: false leaves out the music: the drama under the titles, the
	// drumroll and the replay's beat; the effects stay)
	const MUSIC = ['drama', 'drumroll', 'replay'];
	self.play = (id, speed) => ((opts.music === false || IGB.music === false) && MUSIC.includes(id) ? undefined : audio.play(id, true, speed));
	self.stop = (id) => audio.stop(id);

	// Synthesised hits, booms, roars and alarms, on one AudioContext made
	// the first time one is needed.
	let ac = null;
	let master = null;
	let noiseBuf = null;
	function context() {
		if (ac === false || stage.stopped) return null;
		if (!ac) {
			const AC = window.AudioContext || window.webkitAudioContext;
			try { ac = new AC(); } catch (e) { ac = false; return null; }
			master = ac.createGain();
			master.gain.value = 0.55;
			master.connect(ac.destination);
			noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
			const d = noiseBuf.getChannelData(0);
			for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
		}
		if (ac.state === 'suspended') ac.resume().catch(() => {});
		return ac.state === 'closed' ? null : ac;
	}
	function envelope(g, t0, attack, peak, len) {
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
	}
	function tone(type, delay, len, f0, f1, vol, attack = 0.005) {
		const c = context();
		if (!c) return;
		const t0 = c.currentTime + delay;
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(f0, t0);
		o.frequency.exponentialRampToValueAtTime(f1, t0 + len);
		envelope(g, t0, attack, vol, len);
		o.connect(g).connect(master);
		o.start(t0);
		o.stop(t0 + len + 0.05);
	}
	function noise(delay, len, kind, f0, f1, vol, attack = 0.005, q = 1) {
		const c = context();
		if (!c) return;
		const t0 = c.currentTime + delay;
		const src = c.createBufferSource();
		src.buffer = noiseBuf;
		src.loop = true;
		const f = c.createBiquadFilter();
		f.type = kind;
		f.Q.value = q;
		f.frequency.setValueAtTime(f0, t0);
		f.frequency.exponentialRampToValueAtTime(f1, t0 + len);
		const g = c.createGain();
		envelope(g, t0, attack, vol, len);
		src.connect(f).connect(g).connect(master);
		src.start(t0);
		src.stop(t0 + len + 0.05);
	}
	// A generated effect for a moment (shared/sfx.js), on the show's own context.
	self.fx = function (name, vol = 1, rate = 1, extra) {
		const c = context();
		if (c && window.SFX) SFX.play(c, master, name, vol, rate, extra);
	};

	self.sfx = {
		boom(vol = 0.9) {                       // a deep impact under a slam
			tone('sine', 0, 1.1, 110, 28, vol);
			noise(0, 0.6, 'lowpass', 1200, 60, vol * 0.7);
		},
		drum(vol = 0.8) {                       // a big tom and snare, for reveals
			tone('sine', 0, 0.45, 170, 55, vol);
			noise(0, 0.22, 'bandpass', 2600, 900, vol * 0.6, 0.002, 0.7);
		},
		hit(vol = 0.5) {                        // a short bright hit
			tone('triangle', 0, 0.25, 900, 300, vol);
			noise(0, 0.1, 'highpass', 3000, 6000, vol * 0.4);
		},
		tick(vol = 0.5) {                       // a clock's tick: a dry little click
			tone('square', 0, 0.035, 2400, 1700, vol * 0.45);
			noise(0, 0.03, 'highpass', 4000, 8000, vol * 0.6);
		},
		roar(len = 2.2, vol = 0.7) {            // a monster's roar: growling saws and breath
			const c = context();
			if (!c) return;
			const t0 = c.currentTime;
			const f = c.createBiquadFilter();
			f.type = 'lowpass';
			f.frequency.setValueAtTime(300, t0);
			f.frequency.exponentialRampToValueAtTime(1800, t0 + 0.35);
			f.frequency.exponentialRampToValueAtTime(250, t0 + len);
			const g = c.createGain();
			envelope(g, t0, 0.12, vol, len);
			const trem = c.createGain();
			trem.gain.value = 0.6;
			const lfo = c.createOscillator();
			const depth = c.createGain();
			lfo.frequency.value = 23;
			depth.gain.value = 0.4;
			lfo.connect(depth).connect(trem.gain);
			f.connect(trem).connect(g).connect(master);
			for (const [base, detune] of [[62, 0], [66, 7], [124, -5]]) {
				const o = c.createOscillator();
				o.type = 'sawtooth';
				o.detune.value = detune;
				o.frequency.setValueAtTime(base * 1.3, t0);
				o.frequency.exponentialRampToValueAtTime(base, t0 + 0.4);
				o.frequency.exponentialRampToValueAtTime(base * 0.7, t0 + len);
				o.connect(f);
				o.start(t0);
				o.stop(t0 + len + 0.05);
			}
			lfo.start(t0);
			lfo.stop(t0 + len + 0.05);
			noise(0, len, 'bandpass', 500, 300, vol * 0.8, 0.1, 0.8);
		},
		alarm(len = 1.6, vol = 0.35) {          // a two-tone siren
			for (let i = 0; i * 0.2 < len; i++) tone('square', i * 0.2, 0.19, i % 2 ? 660 : 880, i % 2 ? 650 : 870, vol, 0.01);
		},
		riser(len = 2.5, vol = 0.4) {           // rushing noise, building
			const c = context();
			if (!c) return;
			const t0 = c.currentTime;
			const src = c.createBufferSource();
			src.buffer = noiseBuf;
			src.loop = true;
			const f = c.createBiquadFilter();
			f.type = 'bandpass';
			f.frequency.setValueAtTime(150, t0);
			f.frequency.exponentialRampToValueAtTime(3500, t0 + len);
			const g = c.createGain();
			g.gain.setValueAtTime(0.0001, t0);
			g.gain.exponentialRampToValueAtTime(vol, t0 + len);
			g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.08);
			src.connect(f).connect(g).connect(master);
			src.start(t0);
			src.stop(t0 + len + 0.1);
		},
		sting(vol = 0.25) {                     // a bright major chord, for celebrating
			[523, 659, 784, 1047].forEach((f, i) => tone('triangle', i * 0.05, 1.4, f, f, vol, 0.01));
		},
	};

	/* ---------- the camera ---------- */

	// The world point at the centre of the screen, and the zoom. A shot
	// eases from where the camera is; following tracks a moving target.
	const camera = self.camera = {
		x: WIDTH / 2, y: H / 2, z: 1,
		shot: null,
		target: null,
		cut(to) { Object.assign(camera, { x: to.x, y: to.y, z: to.z, shot: null, target: null }); },
		move(to, seconds) {
			const from = camera.view();
			camera.shot = { from, to, age: 0, dur: Math.max(0.01, seconds) };
			camera.target = null;
		},
		follow(fn) { camera.target = fn; camera.shot = null; },
		wide(seconds = 0) {
			const to = { x: WIDTH / 2, y: H / 2, z: 1 };
			if (seconds) camera.move(to, seconds); else camera.cut(to);
		},
		step(dt) {
			if (camera.shot) {
				const s = camera.shot;
				s.age += dt;
				const k = ease(s.age / s.dur);
				camera.x = lerp(s.from.x, s.to.x, k);
				camera.y = lerp(s.from.y, s.to.y, k);
				camera.z = Math.exp(lerp(Math.log(s.from.z), Math.log(s.to.z), k));   // zooms feel even in log space
				if (s.age >= s.dur) camera.shot = null;
			} else if (camera.target) {
				const to = camera.target();
				const r = 1 - Math.exp(-dt * CAMERA.follow);
				camera.x += (to.x - camera.x) * r;
				camera.y += (to.y - camera.y) * r;
				camera.z += (to.z - camera.z) * r;
			}
		},
		// What's actually shown: never past the edges of the world.
		view() {
			const z = Math.max(1, camera.z);
			const hw = WIDTH / 2 / z;
			const hh = H / 2 / z;
			return { x: clamp(camera.x, hw, WIDTH - hw), y: clamp(camera.y, hh, H - hh), z };
		},
		apply(ctx) {
			const v = camera.view();
			ctx.translate(WIDTH / 2, H / 2);
			ctx.scale(v.z, v.z);
			ctx.translate(-v.x, -v.y);
		},
	};

	/* ---------- type ---------- */

	// fn(ctx, wall) once per wall, its top-left at (0, 0), clipped to that wall
	// so a title crashing in big never spills onto the next one.
	self.onWalls = function (ctx, fn) {
		art.eachWall(ctx, function (c, n) {
			c.save();
			c.beginPath();
			c.rect(0, 0, W, H);
			c.clip();
			fn(c, n);
			c.restore();
		});
	};

	// The show's type: one style for every word on the walls, in a fixed set
	// of sizes and colours (Showtime.TYPE). Whatever size is asked for snaps
	// to the nearest step of the scale, and steps down the scale (rather than
	// shrinking freely) to fit inside a wall, or style.fit units across. Any
	// colour snaps to the nearest of the palette; players' colours stay
	// theirs. The outline and drop are the same everywhere (none on dark ink).
	const TYPE = Object.assign({}, Showtime.TYPE, opts.font ? { font: opts.font } : {});
	if (document.fonts) document.fonts.load(`500 100px "${TYPE.font}"`).catch(() => {});   // (fetched now, so the first frames aren't in a fallback)
	// the clock's digits: in a font of their own if the game gives one (a
	// monospace one keeps them from jiggling as they count)
	const CLOCK_FONT = opts.clockFont === undefined ? 'Share Tech Mono' : opts.clockFont || null;   // (by default, steady monospace digits)
	if (CLOCK_FONT && document.fonts) document.fonts.load(`40px "${CLOCK_FONT}"`).catch(() => {});
	const snapSize = (size) => TYPE.sizes.reduce((best, s) => (Math.abs(Math.log(s / size)) < Math.abs(Math.log(best / size)) ? s : best), TYPE.sizes[0]);
	const measure = function (ctx, str, size) {
		ctx.save();
		ctx.font = `400 ${size}px "${TYPE.font}", sans-serif`;
		const wide = ctx.measureText(String(str)).width;
		ctx.restore();
		return wide;
	};
	// the largest standard size, no bigger than `size`, at which str fits in `fit`
	self.fitSize = function (ctx, str, size, fit = W - 140) {
		const sizes = TYPE.sizes.filter((s) => s <= snapSize(size)).reverse();
		for (const s of sizes) if (measure(ctx, str, s) <= fit) return s;
		return TYPE.sizes[0];
	};
	self.size = snapSize;
	const rgbOf = function (colour) {
		mixer.fillStyle = '#000';
		mixer.fillStyle = colour;
		const v = mixer.fillStyle;
		if (v[0] === '#') { const n = parseInt(v.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
		const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(v);
		return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
	};
	// The button style (faces and buttons alike): one gradient top to bottom,
	// darker at the top; a single semi-transparent white bar over the top
	// half; a thin black outline, a thin white line just inside it.
	// glossy(colour) is its CSS; GLOSS its numbers.
	const GLOSS = { dark: 0.62, bar: 0.28, line: 3, inner: 2 };   // how dark the top of the gradient is (a share of the colour); the white bar's opacity; the black outline's thickness, and the thin white line just inside it (px)
	const darker = function (colour, k) {
		const [r, g, b] = rgbOf(colour);
		return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
	};
	const glossy = (colour) => ({
		background: `linear-gradient(to bottom, rgba(255,255,255,${GLOSS.bar}) 0%, rgba(255,255,255,${GLOSS.bar}) 50%, rgba(255,255,255,0) 50%), linear-gradient(to bottom, ${darker(colour, GLOSS.dark)}, ${colour})`,
		border: `${GLOSS.line}px solid #000`,
		boxShadow: `inset 0 0 0 ${GLOSS.inner}px rgba(255,255,255,0.9)`,
	});
	self.glossy = glossy;
	// The button style (as the pause screen's rows): dark glass, an outline
	// in the button's colour, its words in that colour too (outlined in ink
	// like the rest of the text), and a drop under it. button(colour, size):
	// its CSS, size the type size (for the words' outline).
	const BUTTON = { glass: 'rgba(0,0,0,0.92)', line: 5, drop: 10 };   // the glass; the outline's thickness; the drop under it (px)
	const button = (colour, size = 50) => ({
		background: BUTTON.glass, border: `${BUTTON.line}px solid ${colour}`, color: colour,
		WebkitTextStroke: `${Math.max(4, size * 0.07)}px ${TYPE.colours.ink}`, paintOrder: 'stroke fill',
		boxShadow: `0 ${BUTTON.drop}px 0 rgba(0,0,0,0.45)`,
	});
	self.button = button;
	const textColour = function (fill) {
		if (typeof fill !== 'string') return fill;
		if (playerLits.has(fill)) return fill;
		const p = PLAYER_COLORS.indexOf(fill);
		if (p >= 0) return lit(p);
		const [r, g, b] = rgbOf(fill);
		let best = TYPE.colours.white;
		let bestD = Infinity;
		for (const c of Object.values(TYPE.colours)) {
			const [r2, g2, b2] = rgbOf(c);
			const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
			if (d < bestD) { bestD = d; best = c; }
		}
		return best;
	};
	self.text = function (ctx, str, x, y, size, style = {}) {
		size = self.fitSize(ctx, str, size, style.fit || W - 140);
		const fill = textColour(style.fill || TYPE.colours.white);
		const dark = fill === TYPE.colours.ink;
		art.text(ctx, str, x, y, {
			size, font: style.font || TYPE.font, weight: 400, fill,
			outline: dark ? null : TYPE.colours.ink, outlineWidth: dark ? 0 : Math.max(4, size * 0.07),
			drop: dark ? 'transparent' : 'rgba(0,0,0,0.55)', dropY: size * 0.09,
			alpha: style.alpha, align: style.align,
		});
	};

	// A title crashing in: big and see-through, slamming down to size with a
	// little bounce. age is how long since it started; nothing before 0.
	// style.dur (seconds to land) and style.from (the size it starts at) tune it.
	self.slam = function (ctx, str, x, y, size, age, style = {}) {
		if (age < 0) return;
		const dur = style.dur || 0.26;
		const k = clamp(age / dur, 0, 1);
		const s = age < dur ? lerp(style.from || 2.4, 0.9, k * k) : 0.9 + 0.1 * easeOut((age - dur) / 0.18);
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(s, s);
		if (style.rotate) ctx.rotate(style.rotate);
		self.text(ctx, str, 0, 0, size, Object.assign({}, style, { alpha: (style.alpha === undefined ? 1 : style.alpha) * clamp(age / (dur * 0.6), 0, 1) }));
		ctx.restore();
	};
	// The same, for a line in several colours: parts [{ text, fill }], laid
	// side by side and slammed in together as one line.
	self.slamParts = function (ctx, parts, x, y, size, age, style = {}) {
		if (age < 0) return;
		const whole = parts.map((p) => p.text).join('');
		size = self.fitSize(ctx, whole, size, style.fit || W - 140);
		ctx.save();
		ctx.font = `400 ${size}px "${style.font || TYPE.font}", sans-serif`;
		const widths = parts.map((p) => ctx.measureText(p.text).width);
		ctx.restore();
		const total = widths.reduce((a, b) => a + b, 0);
		const dur = style.dur || 0.26;
		const k = clamp(age / dur, 0, 1);
		const s = age < dur ? lerp(style.from || 2.4, 0.9, k * k) : 0.9 + 0.1 * easeOut((age - dur) / 0.18);
		const alpha = (style.alpha === undefined ? 1 : style.alpha) * clamp(age / (dur * 0.6), 0, 1);
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(s, s);
		let at = -total / 2;
		parts.forEach(function (p, i) {
			self.text(ctx, p.text, at, 0, size, Object.assign({}, style, { fill: p.fill || style.fill, align: 'left', alpha, fit: 99999 }));
			at += widths[i];
		});
		ctx.restore();
	};

	/* ---------- celebrations ---------- */

	self.shake = 0;
	self.flash = 0;
	self.blackout = 0;
	self.timeScale = 1;
	let bits = [];
	let bursts = [];
	const CONFETTI = ['#ff4fd8', '#ffe14d', '#33e0ff', '#b45cff', '#7dff9e', '#ff7a3d', 'white'];

	self.confetti = function (n = 200, x, y) {
		for (let i = 0; i < n; i++) {
			const from = x === undefined ? { x: Math.random() * WIDTH, y: -20 - Math.random() * 500 } : { x, y };
			const a = Math.random() * Math.PI * 2;
			const v = x === undefined ? 0 : 300 + Math.random() * 700;
			bits.push({
				x: from.x, y: from.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (x === undefined ? 0 : 400),
				spin: Math.random() * 6, vr: (Math.random() - 0.5) * 14, w: 10 + Math.random() * 12, h: 6 + Math.random() * 8,
				c: CONFETTI[i % CONFETTI.length], wob: Math.random() * 6,
			});
		}
	};

	self.burst = function (x, y, c = theme.gold) {
		bursts.push({ x, y, c, age: 0, spin: Math.random() * 6 });
	};

	function stepFx(dt) {
		self.shake = Math.max(0, self.shake - dt * 1.8);
		self.flash = Math.max(0, self.flash - dt * 2.2);
		for (const b of bits) {
			b.vx *= 1 - dt * 1.5;
			b.vy = Math.min(260, b.vy + 700 * dt);
			b.x += (b.vx + Math.sin(b.wob + b.y * 0.02) * 60) * dt;
			b.y += b.vy * dt;
			b.spin += b.vr * dt;
		}
		bits = bits.filter((b) => b.y < H + 40);
		for (const b of bursts) b.age += dt;
		bursts = bursts.filter((b) => b.age < 1.4);
	}

	// Light bursts go behind the captions, confetti in front.
	function drawBursts(ctx) {
		for (const b of bursts) {
			const k = b.age / 1.4;
			const r = 80 + 900 * easeOut(k);
			ctx.save();
			ctx.globalAlpha = (1 - k) * 0.4;
			ctx.translate(b.x, b.y);
			ctx.rotate(b.spin + k * 0.6);
			ctx.fillStyle = b.c;
			for (let i = 0; i < 14; i++) {
				ctx.rotate(Math.PI * 2 / 14);
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(r, -r * 0.07);
				ctx.lineTo(r, r * 0.07);
				ctx.fill();
			}
			ctx.restore();
			art.circle(ctx, b.x, b.y, r * 0.35, { stroke: 'white', lineWidth: 18 * (1 - k), alpha: 1 - k });
		}
	}

	function drawConfetti(ctx) {
		for (const b of bits) {
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.rotate(b.spin);
			ctx.scale(1, Math.abs(Math.cos(b.spin * 1.3)) + 0.15);
			ctx.fillStyle = b.c;
			ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
			ctx.restore();
		}
	}

	// The backdrop behind the results: deep sky, slowly turning light rays.
	let showTime = 0;
	function drawBackdrop(ctx) {
		art.rect(ctx, 0, 0, WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, [theme.sky[0], theme.sky[1]]) });
		self.onWalls(ctx, function (c) {
			c.save();
			c.translate(W / 2, H + 120);
			c.rotate(showTime * 0.08);
			for (let i = 0; i < 18; i++) {
				c.rotate(Math.PI * 2 / 18);
				c.beginPath();
				c.moveTo(0, 0);
				c.lineTo(1500, -150);
				c.lineTo(1500, 150);
				c.fillStyle = i % 2 ? theme.accent : theme.accent2;
				c.globalAlpha = 0.07;
				c.fill();
			}
			c.restore();
			art.circle(c, W / 2, H + 60, 700, { fill: art.radial(c, W / 2, H + 60, 0, 700, [[0, theme.glow], [1, theme.glow.replace(/[\d.]+\)$/, '0)')]]) });
			if (opts.backdrop) opts.backdrop(c, showTime);
		});
	}

	/* ---------- the running order ---------- */

	let beats = [];
	let beat = null;
	let bt = 0;
	let fired = new Set();
	const seen = [];

	self.sequence = function (list) {
		beats = list;
		if (typeof fillJumps === 'function') fillJumps();
	};

	self.go = function (id) {
		const next = beats.find((b) => b.id === id);
		if (!next) throw new Error('Showtime: no beat called ' + id);
		// jumping past the clock intro (tests skip straight to play) starts the clock
		const intro = beats.findIndex((b) => b.id === 'clock');
		const end = beats.findIndex((b) => b.id === 'timeup');
		const at = beats.indexOf(next);
		if (!clock.started && intro >= 0 && at > intro && (end < 0 || at < end)) startClock(0);
		clock.held = !!next.holdClock;   // (a beat can stop the clock)
		if (beat && beat.exit) beat.exit();
		showSkip(next.id);
		beat = next;
		bt = 0;
		fired = new Set();
		self.blackout = 0;   // each beat brings its own darkness (in enter or update), none carries over
		seen.push(id);
		if (beat.enter) beat.enter();
	};

	self.next = function () {
		const i = beats.indexOf(beat);
		if (i >= 0 && i < beats.length - 1) self.go(beats[i + 1].id);
	};

	// True once, on the frame the beat's clock passes s.
	self.cue = function (s) {
		if (bt >= s && !fired.has(s)) {
			fired.add(s);
			return true;
		}
		return false;
	};

	Object.defineProperty(self, 'beat', { get: () => (beat ? beat.id : null) });
	Object.defineProperty(self, 'bt', { get: () => bt });

	const lengthOf = (b) => (typeof b.length === 'function' ? b.length() : b.length === undefined ? Infinity : b.length);

	// One frame: move the show on, then draw it.
	// Just the clock, counting on (for a game that's paused: the time still runs).
	self.tickClock = function (dt) { stepClock(dt); };

	self.frame = function (ctx, dt, drawWorld) {
		showPauseButton();
		if (paused) {
			// paused: nothing moves but the clock (and if it runs out, the menu goes: on to TIME!)
			stepClock(dt);
			tickPause();
			if (!beat || beat.id !== 'timeup') { draw(ctx, drawWorld); return; }
			setPaused(false);
			dt = 0;
		}
		showTime += dt;
		stepClock(dt);
		if (beat) {
			const was = beat;
			bt += dt;
			if (beat.update) beat.update(dt, bt);
			if (beat === was && (bt >= lengthOf(beat) || (beat.done && beat.done(bt)))) self.next();
		}
		camera.step(dt);
		stepFx(dt);
		draw(ctx, drawWorld);
	};

	function draw(ctx, drawWorld) {
		ctx.save();
		if (self.shake > 0.01) ctx.translate((Math.random() - 0.5) * 50 * self.shake, (Math.random() - 0.5) * 34 * self.shake);
		if (!beat || beat.world !== false) {
			ctx.save();
			camera.apply(ctx);
			drawWorld(ctx);
			ctx.restore();
		} else {
			drawBackdrop(ctx);
		}
		if (self.blackout > 0) art.rect(ctx, -60, -60, WIDTH + 120, H + 120, { fill: '#030008', alpha: Math.min(1, self.blackout) });
		drawBursts(ctx);
		if (beat && beat.draw) beat.draw(ctx, bt);
		if (beat && beat.id === 'play' && opts.scoreHud !== false) drawScoreHud(ctx);
		// the clock, from the clock intro until TIME! (not over the results after it)
		const timeup = beats.findIndex((b) => b.id === 'timeup');
		if (clock.shown && !(timeup >= 0 && beats.indexOf(beat) > timeup)) drawClock(ctx);
		drawConfetti(ctx);
		if (self.flash > 0) art.rect(ctx, -60, -60, WIDTH + 120, H + 120, { fill: 'white', alpha: Math.min(1, self.flash) * 0.8 });
		ctx.restore();
	}

	/* ---------- the worms (the visor check's, and any game's) ---------- */

	// A worm's springy state, and a step of it: it leans back from the way
	// it's going across the view (across: where it is, side to side, in any
	// units a second's movement makes sense in, 0..1 across a room, say), and
	// springs upright again; its two little arms dangle and flail. (The
	// numbers: VISORS.worm and VISORS.arms.) show.worms.state(across),
	// show.worms.step(state, across, dt), show.worms.draw(...) below.
	function wormState(across) {
		return { a: 0, v: 0, vx: 0, px: across };
	}
	function wormStep(b, across, dt) {
		const h = Math.min(dt, 0.05);
		const ks = Math.exp(-dt / VISORS.worm.smooth);
		const A = VISORS.arms;
		const Wm = VISORS.worm;
		const vx = b.vx * ks + (across - b.px) / Math.max(dt, 1e-3) * (1 - ks);
		b.v -= (vx - b.vx) * Wm.kick * Wm.spring * 0.1;   // (a change of speed shoves it the other way: these add up)
		b.vx = vx;
		b.px = across;
		const want = clamp(-b.vx * Wm.lean, -Wm.most, Wm.most);
		b.v += (Wm.spring * (want - b.a) - Wm.damp * b.v) * h;
		b.a += b.v * h;
		if (Math.abs(b.a) > Wm.swing) { b.a = Math.sign(b.a) * Wm.swing; b.v *= -0.4; }   // (as far as it goes: it bounces back)
		// its arms: dangling on floppy springs, thrown about by the body's sway and flailing the faster it goes
		const leanAcc = (b.v - (b.lastV || 0)) / Math.max(h, 1e-3);
		b.lastV = b.v;
		b.t = (b.t || 0) + h;
		b.arms = b.arms || [{ a: A.rest, v: 0, e: A.bend, ev: 0 }, { a: A.rest, v: 0, e: A.bend, ev: 0 }];
		b.arms.forEach(function (arm, j) {
			const side = j ? 1 : -1;
			const speed = Math.min(1.5, Math.abs(b.vx));
			const wave = Math.sin(b.t * (9 + j * 2.3) + j * 2) + 0.6 * Math.sin(b.t * (14.7 - j * 3.1));
			const before = arm.v;
			arm.v += (A.spring * (A.rest - arm.a) - A.damp * arm.v - side * leanAcc * A.shove * 0.1 + wave * speed * A.flail) * h;
			arm.a = clamp(arm.a + arm.v * h, -0.7, 3.1);
			arm.ev += (A.spring * 1.4 * (A.bend - arm.e) - A.damp * arm.ev - (arm.v - before) / Math.max(h, 1e-3) * 0.5) * h;
			arm.e = clamp(arm.e + arm.ev * h, -1.6, 1.6);
		});
	}

	// A worm standing on its tail at (x, y), so tall, its body curling over
	// to lean (radians: + to the right) as it rises, swaying a little,
	// in its player's colour (wrong: ringed in red).
	function drawWorm(c, x, y, tall, lean, k, fill, wrong, t, arms) {
		const W2 = VISORS.worm;
		const r = W2.r * k;
		const sway = Math.sin(t * 2.2) * 0.06;
		// the spine: each segment turned a little more than the last
		const pts = [{ x, y }];
		const step = Math.max(1, tall - r) / W2.segs;
		let a = 0;
		for (let s = 1; s <= W2.segs; s++) {
			const u = s / W2.segs;
			a = (lean + sway) * u * 1.6 * (1 - 0.35 * u);
			const prev = pts[s - 1];
			pts.push({ x: prev.x + Math.sin(a) * step, y: prev.y - Math.cos(a) * step });
		}
		c.save();
		// its shadow, and a red ring if it's a visor that isn't playing
		art.ellipse(c, x, y, r * 1.6, r * 0.55, { fill: 'rgba(0,0,0,0.35)' });
		if (wrong) art.ellipse(c, x, y, r * 2.2, r * 0.8, { stroke: '#ff3d6a', lineWidth: 6 * k });
		// its arms (behind it, reaching out from its sides): from the shoulder,
		// angled out from straight down, then bent at the elbow, a little hand
		const A = VISORS.arms;
		const sh = pts[Math.round(A.at * (pts.length - 1))];
		(arms || [{ a: A.rest, e: A.bend }, { a: A.rest, e: A.bend }]).forEach(function (arm, j) {
			const side = j ? 1 : -1;
			const root = { x: sh.x + side * r * 0.8, y: sh.y };   // (at the body's edge, so they hang beside it)
			const elbow = { x: root.x + side * Math.sin(arm.a) * r * A.upper, y: root.y + Math.cos(arm.a) * r * A.upper };
			const hand = { x: elbow.x + side * Math.sin(arm.a + arm.e) * r * A.lower, y: elbow.y + Math.cos(arm.a + arm.e) * r * A.lower };
			art.line(c, [root, elbow, hand], { stroke: fill, lineWidth: r * A.thick * 2 });
			art.circle(c, hand.x, hand.y, r * A.thick * 1.35, { fill });
		});
		// the body: one smooth tube, one thickness all the way, in their colour
		art.line(c, pts, { stroke: fill, lineWidth: r * 2 });
		c.restore();
	}

	self.worms = {
		state: wormState,
		step: wormStep,
		// draw(ctx, x, y, tall, scale, colour, time, state): its tail at (x, y), so tall (px); scale: its thickness, against the visor check's
		draw: (c, x, y, tall, k, colour, t, st) => drawWorm(c, x, y, tall, st ? st.a : 0, k, colour, false, t, st && st.arms),
	};

	/* ---------- the score capsules (in play) ---------- */

	// Every show has them through 'play' (the standard in-game score HUD): a
	// row of capsules along the bottom of every wall, one a player, sunk
	// into the edge: black glass, a band of the player's colour along the
	// bottom, their score in the middle, popping each time it changes. A game
	// can lift them (opts.scoreHud.rise(i): 0 down, 1 risen up the wall and
	// grown, for a round's end, say) and dim one (opts.scoreHud.dim(i): out,
	// say); opts.scoreHud: false leaves them out.
	const SCORE_HUD = { w: 176, h: 64, gap: 12, sink: 22, size: 32, rise: 260, grow: 0.35, line: 7, dim: 0.45 };   // a capsule's width and height (the part showing), the gap between them, how far it reaches down past the edge, the figures' size; risen, how far up and how much bigger; how thick the band of colour is; how faint a dimmed one is
	const hudShown = [];
	const hudAt = [];
	function drawScoreHud(ctx) {
		const n = count();
		if (!n) return;
		const S = SCORE_HUD;
		const hooks = opts.scoreHud || {};
		const list = scores();
		const total = n * S.w + (n - 1) * S.gap;
		self.onWalls(ctx, function (c) {
			for (let i = 0; i < n; i++) {
				const score = list[i] || 0;
				if (hudShown[i] !== score) { hudShown[i] = score; hudAt[i] = showTime; }
				const pop = 1 + 0.22 * Math.max(0, 1 - (showTime - (hudAt[i] === undefined ? -9 : hudAt[i])) / 0.3);
				const lift = hooks.rise ? clamp(hooks.rise(i), 0, 1) : 0;
				const grow = 1 + Math.min(S.grow, Math.max(0, (W - 80) / total - 1)) * lift;   // (never wider than the wall)
				const x = W / 2 + (i * (S.w + S.gap) + S.w / 2 - total / 2) * grow;
				const y = H - S.h / 2 - S.rise * lift;
				const sink = S.sink * (1 - lift);   // (risen clear of the edge, the whole capsule shows)
				const dim = hooks.dim && hooks.dim(i) && lift <= 0;
				art.with(c, { x, y, scale: pop * grow, alpha: dim ? S.dim : 1 }, function (c2) {
					const r = S.h / 2;
					art.save(c2, function (c3) {
						const x0 = -S.w / 2, y0 = -S.h / 2, x1 = S.w / 2, y1 = S.h / 2 + sink;
						c3.beginPath();
						c3.moveTo(x0 + r, y0);
						c3.arcTo(x1, y0, x1, y1, r);
						c3.arcTo(x1, y1, x0, y1, r);
						c3.arcTo(x0, y1, x0, y0, r);
						c3.arcTo(x0, y0, x1, y0, r);
						c3.closePath();
						c3.fillStyle = 'rgba(0,0,0,0.6)';
						c3.fill();
						c3.clip();
						c3.fillStyle = colour(i);
						c3.fillRect(x0, S.h / 2 - S.line, S.w, S.line + sink);
					});
					art.text(c2, fmt(score), 0, -S.line / 2 + 1, { size: S.size, font: FONT, weight: 400, fill: 'white', shadow: { color: 'rgba(0,0,0,0.35)', blur: 0, y: 2 } });   // (in the middle of the dark part, clear of the band)
				});
			}
		});
	}

	/* ---------- the skip button ---------- */

	// Through the intros (after the squad is picked, before the first round)
	// a button on the front wall skips straight to the play. A game can say
	// otherwise: opts.skip = { during: [beat ids], to: beat id }, and where
	// it goes (at: { x, y }, its middle, in the world; by default the middle
	// of the front wall; at: false, the front wall's bottom right).
	let $skip = null;
	const SKIP_AT = { x: 1.5 * W, y: 360 };   // (by default: the middle of the front wall, under the captions)
	function skipTo() {
		if (opts.skip && opts.skip.to) return opts.skip.to;
		const i = beats.findIndex((b) => b.id === 'controls');
		return beats[i + 1] ? beats[i + 1].id : 'play';
	}
	function showSkip(id) {
		// (the standard: only through the tutorial, the 'controls' beat, on to
		// whatever comes after it; a game can say otherwise with opts.skip)
		const during = (opts.skip && opts.skip.during) || ['controls'];
		const intro = during.includes(id);
		if (intro && !$skip) {
			$skip = $('<button skip>').text((opts.skip && opts.skip.label) || 'SKIP TUTORIAL ▶▶').css({
				position: 'absolute', whiteSpace: 'nowrap', zIndex: 5,
				...((opts.skip && opts.skip.at === false)
					? { left: (2 * W - 30) + 'px', top: '880px', transform: 'translateX(-100%)' }
					: { left: ((opts.skip && opts.skip.at) || SKIP_AT).x + 'px', top: ((opts.skip && opts.skip.at) || SKIP_AT).y + 'px', transform: 'translate(-50%, -50%)' }),
				padding: '16px 36px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
				cursor: 'pointer', pointerEvents: 'auto',
				fontFamily: `"${TYPE.font}", sans-serif`, fontSize: '40px', letterSpacing: '2px',
				opacity: 0, transition: 'opacity 0.4s',
				...button('white', 40),
			}).appendTo(stage.$ui).on('click', function (e) {
				e.stopPropagation();
				self.fx('skip');
				self.go(skipTo());
			});
			stage.timeout(() => $skip && $skip.css({ opacity: 1 }), 30);
		} else if (!intro && $skip) {
			$skip.remove();
			$skip = null;
		}
	}

	/* ---------- the pause panel and menu ---------- */

	// Every show has it (the standard pause UX): a black panel on the left
	// wall (TAP over a pause, a volume and a cog), shown in the box once the
	// clock has started and off the box always. Tapped, everything stops: the
	// beats, and every sound (the clock keeps counting down; if it runs out,
	// the menu goes and TIME! comes). A screen comes down over all three walls
	// with the whole menu on each: PAUSED, the time left, RESUME, the volume
	// (five levels), RESTART ROUND and REPLAY TUTORIAL. Off the box (not live:
	// no Vuplex) the left wall has PAUSED, the time and debug buttons instead:
	// a jump to every beat, and whatever the game adds (show.menu.drow(label)
	// for a row, show.menu.dbutton(label, fn, colour) for a button in it; a
	// debug button resumes, then does its thing; show.menu.$now, a status
	// line). opts.menu: { restart() (default: the beat the show is on, from
	// its start), tutorial() (none: no REPLAY TUTORIAL) }. show.paused says
	// whether it's paused; show.pause(on) does it by hand. A game that steps
	// anything outside its beats should hold it while show.paused.
	const PAUSE = { button: 130, levels: [0.12, 0.3, 0.5, 0.75, 1], row: { w: 760, h: 112, size: 50, inset: 8 } };   // the pause panel's width (the part showing, pinned to the left wall's edge); the volume at each of the five levels; the front wall's rows (all alike): their width, height and type size, and the gap round the icon in each one's end
	const live = !!window.vuplex;
	const font = `"${FONT}", "${TYPE.font}", sans-serif`;
	let paused = false;
	const MENU = Object.assign({ restart: null, tutorial: null }, opts.menu);
	const menuRestart = () => (MENU.restart ? MENU.restart() : beat && self.go(beat.id));
	// The menu's icons: a white disc with its symbol cut clean out of it (an
	// SVG mask), so whatever's behind shows through the symbol.
	let iconIds = 0;
	const SYMBOLS = {
		pause: '<rect x="33" y="28" width="12" height="44" rx="3"/><rect x="55" y="28" width="12" height="44" rx="3"/>',
		play: '<path d="M39 27 L74 50 L39 73 Z" stroke-linejoin="round" stroke-width="6" stroke="black"/>',
		restart: '<path d="M71 50 A21 21 0 1 1 64 34" fill="none" stroke="black" stroke-width="10" stroke-linecap="round"/><path d="M57 21 L74 30 L60 43 Z" stroke-linejoin="round" stroke-width="4" stroke="black"/>',
		help: '<text x="50" y="69" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="56">?</text>',
		volume: '<path d="M24 41 H35 L51 28 V72 L35 59 H24 Z" stroke-linejoin="round" stroke-width="4" stroke="black"/><path d="M60 39 A14 14 0 0 1 60 61" fill="none" stroke="black" stroke-width="7" stroke-linecap="round"/><path d="M67 30 A25 25 0 0 1 67 70" fill="none" stroke="black" stroke-width="7" stroke-linecap="round"/>',
		cog: '<rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(0 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(45 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(90 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(135 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(180 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(225 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(270 50 50)"/><rect x="43" y="14" width="14" height="16" rx="3" transform="rotate(315 50 50)"/><circle cx="50" cy="50" r="23"/><circle cx="50" cy="50" r="9" fill="white"/>',   // (its teeth and wheel cut out, the hub left)
	};
	function cutIcon(name, size, fill = 'white') {
		const id = 'cut-icon-' + ++iconIds;
		return $(`<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block;flex:none">`
			+ `<defs><mask id="${id}"><rect width="100" height="100" fill="white"/><g fill="black">${SYMBOLS[name]}</g></mask></defs>`
			+ `<circle cx="50" cy="50" r="48" fill="${fill}" mask="url(#${id})"/></svg>`);
	}
	// (the pause button: a black panel standing on the left wall, a pause,
	// a volume and a cog on it, one above the other; anywhere on it opens the pause screen)
	// The standard button's look, as an icon: dark glass in a ring of the
	// button's colour, its symbol drawn in that colour.
	function buttonIcon(name, size, colour) {
		const sym = SYMBOLS[name].replace(/"black"/g, `"${colour}"`).replace(/fill="white"/g, 'fill="#111"');
		const line = 100 * BUTTON.line / size;   // (the outline as thick as the buttons', whatever the size)
		return $(`<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block;flex:none">`
			+ `<circle cx="50" cy="50" r="${50 - line / 2}" fill="${BUTTON.glass}" stroke="${colour}" stroke-width="${line}"/>`
			+ `<g fill="${colour}" transform="translate(50 50) scale(0.82) translate(-50 -50)">${sym}</g></svg>`)
			.css({ filter: `drop-shadow(0 ${BUTTON.drop * 0.6}px 0 rgba(0,0,0,0.45))` });
	}
	const PANEL_ICON = PAUSE.button - 38;   // (the size of each button on the pause panel)
	const PANEL_COLOUR = '#b46bff';   // (the pause panel's colour: its band, its TAP, its buttons)
	const $pauseBtn = $('<button pause>').attr('title', 'Pause').css({
		// (the score capsules' look, turned on its side: black glass sunk into
		// the wall's left edge, a white band along that edge)
		position: 'absolute', left: 0, top: H / 2 + 'px', transform: 'translateY(-50%)', transformOrigin: 'left center',
		width: PAUSE.button + 'px', borderRadius: `0 ${PAUSE.button / 2}px ${PAUSE.button / 2}px 0`, border: 'none', boxSizing: 'border-box',   // (flat against the edge, round on the right)
		background: 'rgba(0,0,0,0.6)', cursor: 'pointer', pointerEvents: 'auto', zIndex: 20, padding: `20px 0 20px ${SCORE_HUD.line}px`,
		display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
		boxShadow: `inset ${SCORE_HUD.line}px 0 0 0 ${PANEL_COLOUR}`, transition: 'transform 0.15s',
	}).hide().appendTo(stage.$ui).on('click', function (e) { e.stopPropagation(); setPaused(true); });
	const $tap = $('<span>').text('TAP').css({   // (the prompt, standing just above it, as wide as it, outlined and dropped like the other words)
		// (centred over the buttons, which sit just right of the edge's band)
		position: 'absolute', left: `calc(50% + ${SCORE_HUD.line / 2}px)`, bottom: 'calc(100% + 14px)', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
		fontFamily: font, fontSize: '40px', lineHeight: 1, color: PANEL_COLOUR, textAlign: 'center',
		WebkitTextStroke: `5px ${TYPE.colours.ink}`, paintOrder: 'stroke fill', textShadow: '0 4px 0 rgba(0,0,0,0.55)',
	}).appendTo($pauseBtn);
	// (sized to the panel's width once the lettering has loaded: measured at 100px, scaled to fit)
	const fitTap = function () {
		const g = document.createElement('canvas').getContext('2d');
		g.font = `400 100px ${font}`;
		const w = g.measureText('TAP').width;
		if (w > 0) $tap.css({ fontSize: 100 * PANEL_ICON / w + 'px' });   // (as wide as the buttons on it)
	};
	fitTap();
	if (document.fonts) document.fonts.load(`100px "${FONT}"`).then(fitTap).catch(() => {});
	for (const name of ['pause', 'volume', 'cog']) buttonIcon(name, PANEL_ICON, PANEL_COLOUR).appendTo($pauseBtn);

	// the screen: dark glass over all three walls, a panel on each
	const $pause = $('<pause-screen>').css({
		position: 'absolute', left: 0, top: 0, width: 3 * W + 'px', height: H + 'px', zIndex: 30, display: 'none',
		background: 'rgba(6,3,16,0.84)', backdropFilter: 'blur(6px)', pointerEvents: 'auto', fontFamily: font, color: 'white',
	}).appendTo(stage.$ui).on('pointerdown click', (e) => e.stopPropagation());
	const wallPanel = (n) => $('<div>').css({
		position: 'absolute', left: n * W + 'px', top: 0, width: W + 'px', height: H + 'px', boxSizing: 'border-box', padding: '60px 70px',
		display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '22px',
	}).appendTo($pause);
	const words = (text, size, colour = 'white') => $('<div>').text(text).css({
		fontSize: size + 'px', lineHeight: 1, letterSpacing: '3px', color: colour,
		WebkitTextStroke: `${Math.max(4, size * 0.07)}px ${TYPE.colours.ink}`, paintOrder: 'stroke fill', textShadow: `0 ${size * 0.09}px 0 rgba(0,0,0,0.55)`,
	});
	const clocks = [];
	const $left = wallPanel(0), $front = wallPanel(1), $right = wallPanel(2);
	const R = PAUSE.row;
	const rowCss = {
		width: R.w + 'px', height: R.h + 'px', boxSizing: 'border-box', textAlign: 'left', borderRadius: R.h / 2 + 'px', border: '5px solid rgba(255,255,255,0.9)',
		background: 'rgba(0,0,0,0.92)', color: 'white', fontFamily: font, fontSize: R.size + 'px', lineHeight: 1, letterSpacing: '2px',
		WebkitTextStroke: `${Math.max(4, R.size * 0.07)}px ${TYPE.colours.ink}`, paintOrder: 'stroke fill',
		display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: `0 ${R.inset}px 0 52px`,   // (the words on the left, an icon on the right, snug in the capsule's end)
		boxShadow: '0 10px 0 rgba(0,0,0,0.45)', transition: 'transform 0.12s, background 0.12s',
	};
	const icon = (name, colour) => cutIcon(name, R.h - 10 - R.inset * 2, colour);   // (as big as fits inside the border, an even gap all round)
	const label = (text) => $('<span>').text(text).css({ flex: 1, textAlign: 'left' });   // (hard against the left, whatever the button would do)
	// (each row black, its border, words and icon in its own colour)
	const ROW_COLOURS = { resume: '#f5b800', volume: '#2f7df6', restart: '#e8323c', help: '#1fb85c' };
	const rowButton = (text, glyph, fn, colour) => $('<button>').append(label(text)).append(icon(glyph, colour)).css(Object.assign({ cursor: 'pointer' }, rowCss, { color: colour, borderColor: colour }))
		.on('click', function (e) { e.stopPropagation(); fn(); });

	// The volume, the same shape, its control in the icons' style: a capsule
	// half the row's width, snug in its end, with five spots cut out of it,
	// the ones up to the level cut clean through, the rest just outlined;
	// click a spot for that level. (One on each wall, all kept alike.)
	const VH = R.h - 10 - R.inset * 2;                  // (as tall as the icons)
	const VW = R.w / 2;                                  // (half the row's width)
	const SPOT = { r: VH * 0.29 };                       // (each spot's radius)
	const N = PAUSE.levels.length;
	const step = (VW - VH) / (N - 1);                    // (the spots evenly along it, the end ones centred in its round ends)
	const volSvgs = [];
	function volumeRow() {
		const $vol = $('<div>').css(Object.assign({}, rowCss, { color: ROW_COLOURS.volume, borderColor: ROW_COLOURS.volume }));
		label('VOLUME').appendTo($vol);
		const $volIcon = $('<div>').css({ position: 'relative', width: VW + 'px', height: VH + 'px', flex: 'none' }).appendTo($vol);
		const mask = 'cut-icon-' + ++iconIds;
		volSvgs.push($(`<svg viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" style="display:block">`
			+ `<defs><mask id="${mask}"><rect width="${VW}" height="${VH}" fill="white"/>`
			+ PAUSE.levels.map((v, i) => `<circle class="vbar" cx="${VH / 2 + i * step}" cy="${VH / 2}" r="${SPOT.r}" fill="black"/>`).join('')
			+ `</mask></defs><rect width="${VW}" height="${VH}" rx="${VH / 2}" fill="${ROW_COLOURS.volume}" mask="url(#${mask})"/></svg>`).appendTo($volIcon));
		PAUSE.levels.forEach(function (v, i) {
			$('<button>').attr('title', 'Volume ' + (i + 1)).css({
				position: 'absolute', left: VH / 2 + (i - 0.5) * step + 'px', top: 0, width: step + 'px', height: '100%',   // (each spot's click zone)
				background: 'none', border: 'none', padding: 0, cursor: 'pointer',
			}).appendTo($volIcon).on('click', function (e) { e.stopPropagation(); IGB.setVolume(v); showVolume(); self.fx('pick'); });
		});
		return $vol;
	}
	function showVolume() {
		const level = PAUSE.levels.reduce((best, v, i) => (Math.abs(v - IGB.volume) < Math.abs(PAUSE.levels[best] - IGB.volume) ? i : best), 0);
		// (up to the level: cut clean through; the rest: just their outline cut)
		for (const $svg of volSvgs) $svg.find('.vbar').each(function (i) {
			const on = i <= level;
			this.setAttribute('fill', on ? 'black' : 'white');
			this.setAttribute('stroke', 'black');
			this.setAttribute('stroke-width', on ? 0 : VH * 0.07);
			this.setAttribute('r', on ? SPOT.r : SPOT.r - VH * 0.035);   // (the outline inside the same circle)
		});
	}

	// The whole menu, on a wall: PAUSED, the time left, then a stack of rows
	// all alike. (With debug: just PAUSED and the time, the debug buttons
	// going under them.)
	function menu($w, debug) {
		words('PAUSED', 64).appendTo($w);
		clocks.push(words('', 96, TYPE.colours.gold).css({ fontFamily: '"Share Tech Mono", monospace', marginBottom: '14px' }).appendTo($w));
		if (debug) return;
		rowButton('RESUME', 'play', () => setPaused(false), ROW_COLOURS.resume).appendTo($w);
		volumeRow().appendTo($w);
		rowButton('RESTART ROUND', 'restart', () => { setPaused(false); menuRestart(); }, ROW_COLOURS.restart).appendTo($w);
		if (MENU.tutorial) rowButton('REPLAY TUTORIAL', 'help', () => { setPaused(false); MENU.tutorial(); }, ROW_COLOURS.help).appendTo($w);
	}
	menu($left, !live);
	menu($front);
	menu($right);

	function setPaused(on) {
		if (on === paused) return;
		paused = on;
		IGB.pauseAudio(on);
		$pause.toggle(on);
		showPauseButton();
		if (on) { showVolume(); tickPause(); }
	}
	// the button: in the box, only once the clock has started counting down;
	// off it, always (for the debug buttons); never while paused
	let buttonShown = false;
	function showPauseButton() {
		const want = !paused && (!live || self.clockStarted());
		if (want !== buttonShown) { buttonShown = want; $pauseBtn.toggle(want); }
	}
	function tickPause() {
		const t = mmss(clock.left);
		for (const $c of clocks) $c.text(t);
	}
	stage.own(() => { if (paused) IGB.pauseAudio(false); });   // (never left paused)

	// the debug buttons, on the left wall's panel under PAUSED and the time (off the box only)
	const $debug = $('<div>').css({
		display: live ? 'none' : 'block', width: 'fit-content', maxWidth: '100%', minHeight: 0, maxHeight: '62%', overflowY: 'auto',   // (as wide as its longest line, centred on the wall) fontFamily: `"${TYPE.font}", sans-serif`,   // (sized to its buttons, so PAUSED, the time and these sit together in the middle of the wall)
	}).appendTo($left);
	// (the heading and status, centred; then every button in one long,
	// centred, flowing list, each group's name tucked in just before its
	// buttons; the buttons small capsules in the standard style: dark glass,
	// an outline and words in their colour)
	const $dhead = $('<div>').css({ display: 'none' }).appendTo($debug);   // (no heading: just the buttons; the status line kept for games to write to, out of sight)
	const $dbody = $('<div>').css({ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }).appendTo($debug);
	const brighter = function (colour, k) {   // (the debug colours are dark: lifted toward white, for outlines and words on dark glass)
		const [r, g, b] = rgbOf(colour);
		const up = (v) => Math.round(v + (255 - v) * k);
		return `rgb(${up(r)},${up(g)},${up(b)})`;
	};
	const dbutton = (label, fn, colour = '#22305a') => $('<button>').text(label).css(Object.assign({
		margin: '5px', padding: '9px 20px', borderRadius: '40px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '22px', lineHeight: 1,
	}, button(brighter(colour, 0.55), 22), { borderWidth: '3px', boxShadow: '0 5px 0 rgba(0,0,0,0.45)' }))
		.on('click', function (e) { e.stopPropagation(); setPaused(false); fn(); });   // (a debug button resumes, then does its thing)
	const $dnow = $('<span>').css({ color: '#9fb6d8', fontFamily: 'monospace', fontSize: '22px' }).appendTo($dhead);
	// (a group: a row of its own; its name in a column of one standard
	// width, and its buttons to the right of it, wrapping as a block)
	const DEBUG_LABEL = 130;   // the names' column (px)
	const drow = (label) => {
		const $row = $('<div>').css({ display: 'flex', alignItems: 'flex-start', margin: '2px 0' }).appendTo($dbody);
		$('<div>').text(label).css({ width: DEBUG_LABEL + 'px', flex: 'none', color: '#9fb6d8', fontSize: '18px', letterSpacing: '2px', padding: '14px 10px 0 0', textAlign: 'right', boxSizing: 'border-box' }).appendTo($row);
		return $('<div>').css({ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }).appendTo($row);
	};

	Object.defineProperty(self, 'paused', { get: () => paused });
	self.pause = setPaused;
	// the debug panel's own first row (filled once the running order is set:
	// see sequence): a jump to every beat, and on to the next
	const $jumps = drow('BEATS');
	function fillJumps() {
		$jumps.parent().toggle(MENU.jumps !== false);   // (a game with its own beat jumps can leave these out: opts.menu.jumps = false)
		$jumps.children('button').remove();
		for (const b of beats) if (b.id !== 'squad') dbutton(b.id.toUpperCase(), () => { $('showtime-picker').remove(); self.go(b.id); }).appendTo($jumps);
		dbutton('NEXT BEAT ▶', () => self.next(), '#3a2a5a').appendTo($jumps);
	}
	self.menu = { dbutton, drow, $now: $dnow, $body: $dbody };


	/* ---------- the squad picker ---------- */

	// "HOW MANY PLAYERS?" and a row of big number buttons on the front wall,
	// in the show's type and colours. (Buttons, not canvas, so a click or a
	// tap on the wall picks: <button count="3">, as the HUD's picker had.)
	self.pickPlayers = function (fn) {
		const font = `"${FONT}", sans-serif`;
		const $pick = $('<showtime-picker>').css({
			position: 'absolute', left: W + 'px', top: 0, width: W + 'px', height: H + 'px',
			display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '70px',
			pointerEvents: 'auto', fontFamily: font, color: 'white',
		}).appendTo(stage.$ui);
		$('<div>').text('HOW MANY PLAYERS?').css({
			fontSize: '110px', letterSpacing: '2px', lineHeight: 1,
			textShadow: '0 9px 0 rgba(0,0,0,0.5)',
			WebkitTextStroke: `7px ${theme.ink}`, paintOrder: 'stroke fill',
			transform: 'scale(0.6)', opacity: 0, transition: 'transform 0.45s cubic-bezier(.2,1.6,.4,1), opacity 0.3s',
		}).appendTo($pick);
		const $row = $('<div>').css({ display: 'flex', gap: '44px' }).appendTo($pick);
		for (let n = 2; n <= 6; n++) {
			$('<button>').attr('count', n).text(n).css({
				width: '190px', height: '190px', borderRadius: '50%', boxSizing: 'border-box', ...button(TYPE.colours.gold, 110),
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				fontFamily: font, fontSize: '110px', lineHeight: '1', cursor: 'pointer', padding: 0,
				transform: 'scale(0)', transition: `transform 0.4s cubic-bezier(.2,1.6,.4,1) ${0.25 + (n - 2) * 0.08}s`,
			}).appendTo($row)
				.on('click', function () {
					const count = parseInt($(this).attr('count'), 10);
					self.fx('pick');
					$(this).css({ transform: 'scale(1.35)', transitionDelay: '0s' });
					$pick.css({ transition: 'opacity 0.35s', opacity: 0, pointerEvents: 'none' });
					stage.timeout(() => $pick.remove(), 400);
					fn(count);
				});
		}
		// in: the question pops, the numbers pop in after it
		stage.timeout(function () {
			$pick.children().first().css({ transform: 'scale(1)', opacity: 1 });
			$row.children().css({ transform: 'scale(1)' });
		}, 30);
		return $pick;
	};

	/* ---------- the corner clock ---------- */

	const clock = { left: SECONDS, label: '', shown: false, said: Infinity, running: false, delay: -1, started: false, ran: 0 };
	const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
	self.mmss = mmss;

	self.setClock = function (left, label = '') {
		clock.left = left;
		clock.label = label;
	};
	self.label = function (text) {
		clock.label = text || '';
	};
	self.timeLeft = () => clock.left;
	self.clockStarted = () => clock.running || clock.ran > 0;   // (counting down, or has been)
	self.setTimeLeft = function (left) {
		clock.left = left;
		clock.said = Math.ceil(left);
	};

	function startClock(after) {
		clock.shown = true;
		clock.started = true;
		clock.ran = 0;
		if (after > 0) clock.delay = after;
		else clock.running = true;
	}

	// The clock runs itself: through the intros and the rounds, to TIME!.
	function stepClock(dt) {
		if (clock.held) return;
		if (clock.delay > 0) {
			clock.delay -= dt;
			if (clock.delay <= 0) clock.running = true;
		}
		if (!clock.running) return;
		clock.left = Math.max(0, clock.left - dt);
		// its first few seconds tick out loud, fading to nothing
		const ran = clock.ran;
		clock.ran += dt;
		// (a tick each time the seconds go over, the first at 9:59)
		for (let s = 1; s <= CLOCK.startTicks; s++) if (ran < s && clock.ran >= s) self.fx('clockTick', CLOCK.tickVolume * Math.pow(1 - (s - 1) / CLOCK.startTicks, 2));
		const whole = Math.ceil(clock.left);
		if (whole <= CLOCK.final && whole < clock.said && whole > 0) self.fx('lastSeconds', 0.8);
		clock.said = whole;
		if (clock.left <= 0) {
			clock.running = false;
			if (beats.some((b) => b.id === 'timeup') && self.beat !== 'timeup') self.go('timeup');
		}
	}

	// up: how far the pill reaches up past its top (the corner clock hangs
	// from the top edge of the wall)
	// box: how much of the pill itself shows (the digits always do)
	// where the clock sits on wall n: hung from the top edge, top centre; or
	// wherever the game says (opts.clock(n) => { x, y }), a capsule standing free
	const clockAt = (n) => (typeof opts.clock === 'function' ? Object.assign({ hang: false }, opts.clock(n)) : { x: W / 2, y: CLOCK.y, hang: true });

	// side: how far the pill reaches out past its left (hung from the corner)
	const CLOCK_PAD = 0.8;   // the clock capsule's half-height, against the digits' size (room above and below them)
	function clockPill(ctx, x, y, size, left, alpha = 1, up = 0, box = 1, side = 0) {
		const urgent = left <= CLOCK.urgent;
		const pulse = urgent ? 1 + 0.06 * Math.max(0, Math.cos((left % 1) * Math.PI * 2)) : 1;
		const w = size * 3.3;
		ctx.save();
		ctx.globalAlpha *= alpha;
		ctx.translate(x, y);
		ctx.scale(pulse, pulse);
		const outline = opts.clockOutline === true ? { stroke: urgent ? '#ff3d6a' : theme.accent, lineWidth: size * 0.07 } : {};   // (only if the game asks: clockOutline: true)
		if (box > 0 && opts.clockBox !== false) {
			// the score capsules' look: black glass, sunk into the edge it hangs
			// from, a band of white (red, at the end) along that edge
			const pad = size * CLOCK_PAD;   // (half its height, round the digits)
			const x0 = -w / 2 - side, y0 = -pad - up, x1 = w / 2, y1 = pad, r = pad;
			const edge = up > 0 ? -y / pulse : y0;   // (the wall's top edge, here, when it hangs from it)
			ctx.save();
			ctx.globalAlpha *= box;
			ctx.beginPath();
			ctx.moveTo(x0 + r, y0);
			ctx.arcTo(x1, y0, x1, y1, r);
			ctx.arcTo(x1, y1, x0, y1, r);
			ctx.arcTo(x0, y1, x0, y0, r);
			ctx.arcTo(x0, y0, x1, y0, r);
			ctx.closePath();
			ctx.fillStyle = 'rgba(0,0,0,0.6)';
			ctx.fill();
			if (outline.stroke) { ctx.strokeStyle = outline.stroke; ctx.lineWidth = outline.lineWidth; ctx.stroke(); }
			ctx.clip();
			ctx.fillStyle = urgent ? TYPE.colours.red : 'white';
			ctx.fillRect(x0, y0, x1 - x0, edge - y0 + SCORE_HUD.line);
			ctx.restore();
		}
		// its digits at a step of the scale, sized with the pill by scaling,
		// in the middle of the dark part of the capsule (clear of its band:
		// along the edge it hangs from, or its own top)
		let mid = 0;
		if (box > 0 && opts.clockBox !== false) {
			const pad = size * CLOCK_PAD;
			const top = (up > 0 ? -y / pulse : -pad - up) + SCORE_HUD.line;
			mid = (top + pad) / 2 * Math.min(1, box);   // (easing there as the capsule fades in, so the digits never jump)
		}
		const ref = self.size(CLOCK.size);
		ctx.scale(size / ref, size / ref);
		self.text(ctx, mmss(left), 0, mid * ref / size + ref * 0.04, ref, { fill: urgent ? TYPE.colours.red : TYPE.colours.white, font: CLOCK_FONT });
		ctx.restore();
	}

	function drawClock(ctx) {
		const left = clock.left;
		self.onWalls(ctx, function (c, n) {
			// hung from the top edge (or standing free); its pill fades in round the digits once they've docked
			const box = clock.shownAt === undefined ? 1 : clamp((showTime - clock.shownAt) / 0.25, 0, 1);
			const at = clockAt(n);
			clockPill(c, at.x, at.y, CLOCK.size, left, 1, at.hang ? at.y + 20 : 0, box);
			// the last ten seconds loom, big and solid, over every wall
			if (left > 0 && left <= CLOCK.final) {
				const k = 1 - (left % 1 || 1);
				// (the display size, blown up and pulsing: a backdrop more than text)
				c.save();
				c.translate(W / 2, 520);
				c.scale(1.4 * (1 + 0.25 * (1 - k)), 1.4 * (1 + 0.25 * (1 - k)));
				self.text(c, String(Math.ceil(left)), 0, 0, 220, { fill: TYPE.colours.red });
				c.restore();
			}
		});
	}

	/* ---------- the replay recorder ---------- */

	let track = [];
	let marks = [];
	let nextSample = 0;
	self.record = function (t, positions) {
		if (t < nextSample) return;
		nextSample = t + REPLAY.sample;
		track.push({ t, p: positions.map((p) => (p && p.px !== undefined ? [clamp(p.px, 0, 1), clamp(p.pz === undefined ? 0.5 : p.pz, 0, 1)] : null)) });
	};
	self.mark = function (t) {
		marks.push(t);
	};

	// Plausible wandering for when nothing was recorded (a test that skipped play).
	function fakeTrack(n) {
		const out = [];
		const r = seeded('replay' + n);
		const ph = [];
		for (let i = 0; i < n; i++) ph.push([r() * 6, r() * 6, r() * 6, r() * 6, 0.05 + r() * 0.04, 0.03 + r() * 0.04]);
		for (let t = 0; t <= SECONDS; t += REPLAY.sample) {
			out.push({ t, p: ph.map(([a, b, c, d, f, g], i) => [
				clamp(0.5 + 0.34 * Math.sin(t * f + a) + 0.1 * Math.sin(t * f * 3.1 + b) + (i - (n - 1) / 2) * 0.08, 0.04, 0.96),
				clamp(0.45 + 0.3 * Math.sin(t * g + c) + 0.12 * Math.sin(t * g * 2.7 + d), 0.04, 0.96),
			]) });
		}
		return out;
	}

	/* ---------- avatars ---------- */

	function avatar(ctx, n, x, y, scale, pose, alpha = 1) {
		ctx.save();
		ctx.globalAlpha *= alpha;
		if (opts.drawAvatar) opts.drawAvatar(ctx, n, x, y, scale, pose);
		else {
			art.roundRect(ctx, x - 22 * scale, y - 70 * scale, 44 * scale, 70 * scale, 18 * scale, { fill: colour(n) });
			art.circle(ctx, x, y - 92 * scale, 26 * scale, { fill: colour(n) });
		}
		ctx.restore();
	}

	// A row of players across a wall, centred.
	function rowX(i, n) {
		const gap = Math.min(250, 1400 / Math.max(1, n));
		return W / 2 + (i - (n - 1) / 2) * gap;
	}

	/* ---------- the generic beats ---------- */

	function extend(base, extra) {
		if (!extra) return base;
		const b = Object.assign({}, base);
		for (const k of ['enter', 'update', 'draw']) {
			if (!extra[k]) continue;
			const a = base[k];
			const e = extra[k];
			b[k] = a ? function (...args) { a(...args); e(...args); } : e;
		}
		for (const k of ['length', 'world', 'done', 'id']) if (extra[k] !== undefined) b[k] = extra[k];
		return b;
	}

	const beatsLib = self.beats = {};

	// The title drop: the room goes dark under a rushing build, then the
	// game's title glides in on every wall, a line at a time: the top line
	// from the top left, the next from the bottom right (and so on,
	// alternately), each easing gently into place; a soft boom as the last
	// settles (no flash), then the START button fading in (or a hold, and
	// out). lines: [{ text, fill, glow }]. Never a byline under it.
	beatsLib.titleDrop = function (extra) {
		const T = TITLE;
		const lines = (extra && extra.lines) || [{ text: (opts.title || opts.id || '').toUpperCase() }];
		// when each line sets off, and when the last settles
		const sets = lines.map((line, li) => T.first + li * T.lineGap);
		const lastLand = sets[sets.length - 1] + T.glide;
		// By default the title holds, raised, over a big START button that pops
		// in once it's landed, and fades out once START is pressed (start:
		// false: it plays through and moves on by itself)
		const start = !(extra && extra.start === false);   // (by default it waits for START)
		let startedAt = -1;
		let $start = null;
		let now = 0;   // (the beat's time, for the button's click)
		const length = start ? Infinity : lastLand + T.hold + T.out;
		const outAt = () => (start ? (startedAt < 0 ? Infinity : startedAt) : length - T.out);
		const dropStart = () => { if ($start) { const $b = $start; $start = null; $b.css({ opacity: 0, pointerEvents: 'none' }); stage.timeout(() => $b.remove(), 400); } };
		return extend({
			id: 'title',
			length,
			done: (bt) => start && startedAt >= 0 && bt > startedAt + T.out,
			enter() {
				self.blackout = 0;
				self.play('drama');
				startedAt = -1;
			},
			exit() { dropStart(); },
			update(dt, bt) {
				self.blackout = Math.min(INTRO_DIM, bt / T.dark * INTRO_DIM);   // the game's scene still showing behind
				if (self.cue(lastLand - 0.15)) self.shake = 0.2;   // (gently: it settles rather than slams; no flash, no sound effects)
				now = bt;
				// the START button, on the front wall under the title
				if (start && !$start && startedAt < 0 && bt > lastLand + 0.5) {
					$start = $('<button start>').text('START').css({
						position: 'absolute', left: (W + W / 2) + 'px', top: T.startY + 'px', transform: 'translate(-50%, -50%)', opacity: 0,
						padding: '28px 110px', borderRadius: '90px', cursor: 'pointer', pointerEvents: 'auto', zIndex: 5, ...button(TYPE.colours.gold, 120),
						fontFamily: `"${FONT}", sans-serif`, fontSize: '120px', lineHeight: 1, letterSpacing: '4px',
						transition: `transform 0.25s, opacity ${T.startFade}s`,
					}).appendTo(stage.$ui)
						.on('click', function (e) {
							e.stopPropagation();
							self.fx('pick');
							startedAt = now;
							$(this).css({ transform: 'translate(-50%, -50%) scale(1.25)' });
							dropStart();
						});
					stage.timeout(() => $start && $start.css({ opacity: 1 }), 30);   // (it fades in)
				}
			},
			draw(ctx, bt) {
				const fade = 1 - between(bt, outAt(), outAt() + T.out);
				const n = lines.length;
				self.onWalls(ctx, function (c) {
					lines.forEach(function (line, li) {
						const size = self.fitSize(c, line.text, T.size * (n > 1 ? 0.85 : 1), W - 140);   // a step of the scale that fits
						const y = (start ? T.raised : 470) + (li - (n - 1) / 2) * size * 1.05;
						const age = bt - sets[li];
						if (age <= 0) return;
						// gliding in from off the wall's corner, easing gently to a stop
						const k = clamp(age / T.glide, 0, 1);
						const left = 1 - Math.pow(1 - k, 4);
						const side = li % 2 ? 1 : -1;   // (-1: from the top left; 1: from the bottom right)
						const dx = side * T.from[0] * W * (1 - left);
						const dy = side * T.from[1] * H * (1 - left);
						self.text(c, line.text, W / 2 + dx, y + dy, size, { fill: line.fill || 'white', glow: line.glow || theme.accent, alpha: fade * clamp(age / 0.4, 0, 1), fit: 9999 });
					});
				});
			},
		}, Object.assign({}, extra, { lines: undefined, start: undefined }));
	};

	// The clock reveal, a piece at a time out of the dark: the dial, its
	// ticks charging round, and the words slamming into place inside it while
	// it lights up: YOU HAVE, the clock at 10:00, MINUTES. The clock starts
	// counting down (and ticking) there in the dial, then flies up to its
	// place at the top of every wall.
	beatsLib.clockIntro = function (extra) {
		const C = CLOCK_INTRO;
		const minutes = SECONDS >= 60;
		const unit = minutes ? (Math.round(SECONDS / 60) === 1 ? 'MINUTE' : 'MINUTES') : 'SECONDS';
		// all three lines in one style (only their sizes differ)
		const look = (extra) => Object.assign({ fill: 'white', glow: theme.accent }, extra);
		return extend({
			id: 'clock',
			length: C.length,
			enter() {
				clock.shown = false;
				clock.running = false;
				clock.started = false;
				clock.shownAt = undefined;
				clock.left = SECONDS;
				self.blackout = INTRO_DIM;
			},
			update(dt, bt) {
				// each word lands with a hit and a shake; the 10 with a boom (no drums)
				if (self.cue(C.dial)) self.fx('dialCharge', 0.8, 1, C.charge[1] - C.charge[0]);
				if (self.cue(C.youHave + C.slam)) { self.fx('wordSlam'); self.shake = 0.45; }
				if (self.cue(C.number + 0.26)) { self.fx('timeSlam'); self.shake = 0.8; self.flash = 0.5; }
				if (self.cue(C.unit + C.slam)) { self.fx('wordSlam', 1, 0.85); self.shake = 0.9; self.flash = 0.4; }
				// the 10:00 in the dial starts counting down (and ticking), then flies up
				// to its place; the corner clock takes over once it lands
				if (self.cue(C.count)) { startClock(0); clock.shown = false; }   // counting (and ticking) in the dial
				if (self.cue(C.settle[0])) self.fx('clockFly');
				if (bt > C.settle[0]) self.blackout = INTRO_DIM * (1 - between(bt, C.settle[0], C.settle[1] + 0.3));
				if (self.cue(C.settle[1])) { clock.shown = true; clock.shownAt = showTime; self.fx('clockDock'); }
			},
			draw(ctx, bt) {
				if (bt >= C.settle[1]) return;
				const fly = ease(between(bt, C.settle[0], C.settle[1]));
				const fade = 1 - between(bt, C.settle[0], C.settle[0] + 0.4);
				self.onWalls(ctx, function (c, n) {
					const cx = W / 2;
					const dock = clockAt(n);
					// 1. the dial, its ticks lighting round one by one
					const charged = between(bt, C.charge[0], C.charge[1]);
					if (bt > C.dial) {
						const grow = easeOut((bt - C.dial) / 0.35);
						for (let i = 0; i < 60; i++) {
							const a = i / 60 * Math.PI * 2 - Math.PI / 2;
							const on = i / 60 < charged;
							const r0 = (i % 5 ? 0.9 : 0.83) * C.radius * grow;
							const r1 = C.radius * grow;
							c.save();
							c.globalAlpha = fade * (on ? 1 : 0.22) * clamp((bt - C.dial) * 4, 0, 1);
							c.strokeStyle = on ? (i % 5 ? theme.accent : theme.gold) : 'white';
							c.lineWidth = i % 5 ? 8 : 14;
							c.lineCap = 'round';
							c.beginPath();
							c.moveTo(cx + Math.cos(a) * r0, C.y + Math.sin(a) * r0);
							c.lineTo(cx + Math.cos(a) * r1, C.y + Math.sin(a) * r1);
							c.stroke();
							c.restore();
						}
						if (charged >= 1) art.circle(c, cx, C.y, C.radius * 1.12, { fill: art.radial(c, cx, C.y, C.radius * 0.4, C.radius * 1.16, [[0, 'rgba(255,79,216,0)'], [0.7, 'rgba(255,79,216,0.25)'], [1, 'rgba(255,79,216,0)']]), alpha: fade });
					}
					// 2. YOU HAVE, inside the dial just above the 10
					self.slam(c, 'YOU HAVE', cx, C.y - C.radius * C.gap, C.words[0], bt - C.youHave, look({ alpha: fade, fit: C.radius * 1.45, dur: C.slam, from: 3.2 }));
					// 3. the 10, in the dial; it becomes the clock and flies up to its corner
					if (bt > C.number) {
						const age = bt - C.number;
						const s = age < 0.26 ? lerp(2.4, 0.9, (age / 0.26) ** 2) : 0.9 + 0.1 * easeOut((age - 0.26) / 0.18);
						const cy = lerp(C.y, dock.y, fly);
						c.save();
						c.translate(lerp(cx, dock.x, fly), cy);
						c.scale(s, s);
						c.globalAlpha = clamp(age / 0.15, 0, 1);
						// the clock's size is a step of the scale that fits 10:00 (its widest), so it
						// keeps its size as it counts; it flies up shrinking (by scaling) to the corner
						// clock's digits, where the corner clock takes over, its pill then appearing
						const ts = self.fitSize(c, mmss(SECONDS), C.size, C.radius * 1.62);
						const k = lerp(1, CLOCK.size / ts, fly);
						c.scale(k, k);
						self.text(c, mmss(clock.left), 0, ts * 0.04, ts, Object.assign(look({ fit: 99999 }), { font: CLOCK_FONT }));
						c.restore();
					}
					// 4. MINUTES, just under the 10
					self.slam(c, unit, cx, C.y + C.radius * C.gap * 1.03, C.words[1], bt - C.unit, look({ alpha: fade, fit: C.radius * 1.4, dur: C.slam, from: 3.2 }));
				});
			},
		}, extra);
	};

	// The visor check, straight after the clock: the visors to put on (one
	// colour per player, in player order), then everyone into the middle of
	// the room for a wiggle, each visor ticked off as it's seen there. A
	// visor beyond the squad that's moving about is flagged, with what to
	// swap it for. The clock keeps running. Visor n is tracker slot
	// n (IGB.players.list); it's in play when it moves.
	beatsLib.visors = function (extra) {
		const V = VISORS;
		let visorScratch = null;   // (up here: the drawing helpers below sit after the beat's return, so a let down there would never be set up)
		let motion = [];      // per slot: averaged movement
		let last = [];        // per slot: the last position seen
		let held = [];        // per slot: seconds wiggled in the zone
		let ticked = [];      // per slot: when it was ticked off (or undefined)
		let bend = [];        // per slot, per wall: their worm's lean as that wall sees it, sprung ({ a: radians, v: its speed, vx: their speed across, px: where they were across })
		let wrongSince = [];  // per slot: when it was first flagged
		let clearFor = 0;
		let allSetAt = -1;
		const inZone = (p) => Math.hypot(p.px - V.zone.px, p.pz - V.zone.pz) < V.zone.r;
		// a spot in the room as seen facing wall w (0 left, 1 front, 2 right):
		// x across, left to right; d how near that wall (1: against it)
		const viewOf = (w, px, pz) => (w === 0 ? { x: pz, d: 1 - px } : w === 2 ? { x: 1 - pz, d: px } : { x: px, d: pz });
		const slots = () => (IGB.players && IGB.players.list) || [];
		const wrong = () => slots().map((p, i) => i).filter((i) => i >= count() && motion[i] > V.moving);
		const missing = () => Array.from({ length: count() }, (_, i) => i).filter((i) => ticked[i] === undefined);
		self.visorState = () => ({ ticked: ticked.map((t) => t !== undefined), wrong: wrong(), missing: missing(), allSet: allSetAt >= 0 });

		return extend({
			id: 'visors',
			length: V.length,
			done: (bt) => allSetAt >= 0 && bt > allSetAt + V.allSet,
			enter() {
				motion = []; last = []; held = []; ticked = []; wrongSince = []; bend = [];
				clearFor = 0;
				allSetAt = -1;
				self.blackout = INTRO_DIM;
			},
			update(dt, bt) {
				self.blackout = INTRO_DIM;
				const k = Math.exp(-dt / V.settle);
				slots().forEach(function (p, i) {
					if (!p || p.X === undefined) return;
					const moved = last[i] ? Math.hypot(p.X - last[i].X, p.Y - last[i].Y, p.Z - last[i].Z) : 0;
					last[i] = { X: p.X, Y: p.Y, Z: p.Z };
					motion[i] = (motion[i] || 0) * k + moved / Math.max(dt, 1e-3) * (1 - k);   // speed, raw units a second
					// their worm leans back from the way they're going, on a spring (on
					// each wall, the way it's going across that wall's view)
					bend[i] = bend[i] || [];
					for (let w = 0; w < 3; w++) {
						bend[i][w] = bend[i][w] || wormState(viewOf(w, p.px, p.pz).x);
						wormStep(bend[i][w], viewOf(w, p.px, p.pz).x, dt);
					}
					// tick off a squad visor once it's wiggled in the zone a moment
					if (bt > V.show && i < count() && ticked[i] === undefined) {
						if (inZone(p) && motion[i] > V.wiggle) held[i] = (held[i] || 0) + dt;
						if (held[i] >= V.hold) {
							ticked[i] = bt;
							self.fx('visorLock', 0.9, 1, i);
						}
					}
				});
				// a wrong visor, newly in play: the alarm
				const bad = wrong();
				for (const i of bad) if (wrongSince[i] === undefined) { wrongSince[i] = bt; self.fx('wrongVisor'); self.shake = 0.3; }
				wrongSince = wrongSince.map((t, i) => (bad.includes(i) ? t : undefined));
				clearFor = !missing().length && !bad.length ? clearFor + dt : 0;
				if (allSetAt < 0 && clearFor >= V.clear) {
					allSetAt = bt;
					self.fx('allSet');
					self.flash = 0.4;
				}
			},
			draw(ctx, bt) {
				const n = count();
				const bad = wrong();
				const lost = missing();
				const asking = bt > V.show;
				self.onWalls(ctx, function (c, wall) {
					const cx = W / 2;
					if (allSetAt >= 0) {
						self.slam(c, 'ALL SET!', cx, 640, 190, bt - allSetAt, { fill: theme.gold, glow: '#ff7a3d' });
						drawVisorRow(c, cx, V.y, n, bt);
						return;
					}
					// the instructions on one line, all white: the steps under way (and
					// done) bright, the ones to come dim
					const steps = [
						{ text: 'PUT ON A VISOR', done: asking, now: !asking },
						{ text: 'STAND IN THE CENTRE', now: asking },
						{ text: 'WIGGLE ABOUT', now: asking },
					];
					const GAP = '  >  ';
					const SIZE = self.fitSize(c, steps.map((s) => s.text).join(GAP), 56, W - 120);   // a step of the scale that fits
					c.save();
					c.font = `400 ${SIZE}px "${TYPE.font}", sans-serif`;
					const widths = steps.map((s) => c.measureText(s.text).width);
					const gap = c.measureText(GAP).width;
					c.restore();
					const total = widths.reduce((a, b) => a + b, 0) + gap * (steps.length - 1);
					const k = 1;
					let x = cx - total * k / 2;
					steps.forEach(function (s, i) {
						const alpha = clamp((bt - i * 0.25) * 3, 0, 1);
						if (i) {
							self.text(c, '>', x + gap * k / 2, 165, SIZE * k, { fill: 'white', alpha: alpha * 0.5, glow: 'transparent', fit: 9999 });
							x += gap * k;
						}
						self.text(c, s.text, x + widths[i] * k / 2, 165, SIZE * k, {
							fill: 'white', alpha: alpha * (s.now || s.done ? 1 : 0.4),
							glow: s.now ? theme.accent : 'transparent', fit: 9999,
						});
						x += widths[i] * k;
					});
					// any wrong visors join the row, after the squad's, marked
					const xs = drawVisorRow(c, cx, V.y, n, bt, bad);
					drawFloor(c, cx, 600, 960, n, bt, wall);
					// and the first gets the big flag underneath it, over everything
					if (bad.length) {
						const i = bad[0];
						const flash = 0.75 + 0.25 * Math.sin(bt * 12);
						const w = 760;
						const fx = clamp(xs[i], w / 2 + 30, W - w / 2 - 30);
						const top = V.y + 175;
						art.poly(c, [[xs[i] - 34, top + 4], [xs[i], top - 40], [xs[i] + 34, top + 4]], { fill: '#ff3d6a', alpha: flash });
						art.roundRect(c, fx - w / 2, top, w, 250, 40, { fill: 'rgba(40,0,8,0.95)', stroke: '#ff3d6a', lineWidth: 10, alpha: flash });
						self.text(c, 'WRONG VISOR!', fx, top + 62, 76, { fill: '#ff5470', glow: '#ff3d6a', fit: w - 60 });
						self.text(c, self.nameOf(i) + ' ISN\'T PLAYING', fx, top + 140, 50, { fill: lit(i), fit: w - 60 });
						self.text(c, lost.length ? 'SWAP IT FOR ' + self.nameOf(lost[0]) : 'TAKE IT OFF', fx, top + 206, 50, { fill: lost.length ? lit(lost[0]) : 'white', fit: w - 60 });
					}
				});
			},
		}, extra);

		// The squad's visors in a row, each with its colour's name; ticked
		// ones bounce and get a gold tick, the rest pulse while they're
		// awaited. Wrong visors (bad: their slots) join the end of the row,
		// struck through in red. Returns each drawn visor's x, by slot.
		function drawVisorRow(c, cx, y, n, bt, bad = []) {
			const row = Array.from({ length: n }, (_, i) => i).concat(bad);
			const gap = Math.min(250, (W - 200) / Math.max(1, row.length));
			const xs = {};
			row.forEach(function (i, k) {
				const x = cx + (k - (row.length - 1) / 2) * gap;
				xs[i] = x;
				const wrong = i >= n;
				const appear = wrong ? bt - (wrongSince[i] || 0) : bt - 0.3 - k * 0.18;
				if (appear <= 0) return;
				const pop = appear < 0.3 ? easeOut(appear / 0.3) * 1.15 : 1 + 0.15 * Math.max(0, 1 - (appear - 0.3) / 0.2);
				const done = ticked[i] !== undefined;
				const bounce = done ? 1 + 0.25 * Math.max(0, 1 - (bt - ticked[i]) / 0.35) : wrong ? 1 + 0.08 * Math.sin(bt * 12) : bt > V.show ? 1 + 0.05 * Math.sin(bt * 6 + i) : 1;
				c.save();
				c.translate(x, y);
				c.scale(pop * bounce, pop * bounce);
				visor(c, colour(i), done || wrong || bt <= V.show ? 1 : 0.55, bt * (done ? 3.2 : 1.4) + i * 0.8);   // turning; quicker once ticked
				if (wrong) {
					// struck through
					c.strokeStyle = '#ff3d6a';
					c.lineWidth = 16;
					c.lineCap = 'round';
					c.beginPath();
					c.moveTo(-80, -60);
					c.lineTo(80, 60);
					c.moveTo(80, -60);
					c.lineTo(-80, 60);
					c.stroke();
				}
				c.restore();
				self.text(c, self.nameOf(i), x, y + 108, 42, { fill: wrong ? '#ff5470' : lit(i), alpha: Math.min(1, appear * 4) });
				// locked in: rings pulse out from the visor itself, in its colour
				if (done && bt - ticked[i] < V.pulse) {
					for (const lag of [0, 0.18]) {
						const k = clamp((bt - ticked[i] - lag) / (V.pulse - 0.18), 0, 1);
						if (k <= 0 || k >= 1) continue;
						c.save();
						c.globalAlpha = 1 - k;
						c.strokeStyle = colour(i);
						c.lineWidth = 16 * (1 - k) + 2;
						c.beginPath();
						c.ellipse(x, y, 90 + 160 * easeOut(k), 60 + 100 * easeOut(k), 0, 0, Math.PI * 2);
						c.stroke();
						c.restore();
					}
				}
				if (done) self.text(c, '✓', x + 70, y - 60, 70, { fill: theme.gold, glow: theme.gold });
			});
			return xs;
		}

		// A little 3D sports visor, turned `yaw` about its upright axis and
		// seen from a touch above: a headband all the way round and a peak
		// sticking out the front, built from flat faces drawn back to front,
		// each shaded by which way it faces (the inside of the band darker).
		// (faded, it's drawn solid off to one side and laid down at its alpha in
		// one go, so its faces never show through each other as lines; its
		// scratch canvas is visorScratch, declared at the top of the beat)
		function visor(c, fill, alpha, yaw) {
			if (alpha >= 0.999) return visorSolid(c, fill, yaw);
			const B = { x: -170, y: -150, w: 340, h: 270, k: 2 };   // (its bounds, peak and shadow and all, and the resolution)
			if (!visorScratch) {
				visorScratch = document.createElement('canvas').getContext('2d');
				visorScratch.canvas.width = B.w * B.k;
				visorScratch.canvas.height = B.h * B.k;
			}
			const g = visorScratch;
			g.setTransform(1, 0, 0, 1, 0, 0);
			g.clearRect(0, 0, g.canvas.width, g.canvas.height);
			g.setTransform(B.k, 0, 0, B.k, -B.x * B.k, -B.y * B.k);
			visorSolid(g, fill, yaw);
			c.save();
			c.globalAlpha *= alpha;
			c.drawImage(g.canvas, B.x, B.y, B.w, B.h);
			c.restore();
		}
		function visorSolid(c, fill, yaw) {
			const alpha = 1;
			const R = 64;           // the headband's radius
			const BAND = 26;        // and its height
			const PEAK = 118;       // how far the peak reaches, at its tip
			const PITCH = 0.42;     // looking down on it this much
			const D = 700;          // the eye's distance, for a touch of perspective
			const N = 28;           // faces round the band
			const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
			// model space: y down, the front of the visor toward +z
			const view = function (x, y, z) {
				const x1 = x * cy + z * sy;
				const z1 = -x * sy + z * cy;
				const f = D / (D - z1 * cp);
				return { x: x1 * f, y: (y * cp + z1 * sp) * f, z: z1 };
			};
			const faces = [];
			// the band: N upright strips round a circle
			for (let i = 0; i < N; i++) {
				const a0 = i / N * Math.PI * 2;
				const a1 = (i + 1) / N * Math.PI * 2;
				const p = [[a0, -BAND / 2], [a1, -BAND / 2], [a1, BAND / 2], [a0, BAND / 2]].map(([a, y]) => view(Math.sin(a) * R, y, Math.cos(a) * R));
				// the strip's outward normal, turned the same way, says whether we see its outside
				const am = (a0 + a1) / 2;
				const nz = -Math.sin(am) * sy + Math.cos(am) * cy;
				const out = nz > -0.05;   // (facing us)
				faces.push({ p, z: p.reduce((s, q) => s + q.z, 0) / 4, shade: out ? 0.15 - 0.25 * nz : 0.55 });
			}
			// the peak: a curved sheet across the front, sloping a little down
			const M = 12;
			for (let i = 0; i < M; i++) {
				const a0 = (-0.5 + i / M) * Math.PI;
				const a1 = (-0.5 + (i + 1) / M) * Math.PI;
				const reach = (a) => R + (PEAK - R) * Math.cos(a) ** 1.5;   // longest straight ahead
				const p = [
					view(Math.sin(a0) * R, BAND / 2, Math.cos(a0) * R),
					view(Math.sin(a1) * R, BAND / 2, Math.cos(a1) * R),
					view(Math.sin(a1) * reach(a1), BAND / 2 + 14, Math.cos(a1) * reach(a1)),
					view(Math.sin(a0) * reach(a0), BAND / 2 + 14, Math.cos(a0) * reach(a0)),
				];
				faces.push({ p, z: p.reduce((s, q) => s + q.z, 0) / 4 + 2, shade: 0.05 });
			}
			faces.sort((a, b) => a.z - b.z);
			c.save();
			c.globalAlpha *= alpha;
			// its shadow on the floor
			c.fillStyle = 'rgba(0,0,0,0.3)';
			c.beginPath();
			c.ellipse(0, 70, PEAK * 0.9, 20, 0, 0, Math.PI * 2);
			c.fill();
			c.lineJoin = 'round';
			const [r, g, b] = rgbOf(fill);
			for (const face of faces) {
				c.beginPath();
				face.p.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
				c.closePath();
				// each face in its own shade, filled and edged alike (so its edge
				// only closes the seam to its neighbour: no lines drawn round it)
				const k = 1 - Math.max(0, Math.min(0.7, face.shade));
				const tone = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
				c.fillStyle = tone;
				c.strokeStyle = tone;
				c.lineWidth = 1.5;
				c.fill();
				c.stroke();
			}
			c.restore();
		}

		// The room's floor, tilted back in perspective: the front wall standing
		// along its far edge, the side walls along its sides, the circle to
		// stand in, and every visor in play where it is.
		// (the room as seen facing this wall: that wall at the far edge)
		function drawFloor(c, cx, top, bottom, n, bt, wall = 1) {
			const far = V.floor.far;
			const near = V.floor.near;
			// width at depth t (0 the front wall, 1 the back of the room): even
			// steps in the room shrink toward the front, as they would to the eye
			const widthAt = (t) => 1 / lerp(1 / far, 1 / near, t);
			const at = function (px, pz) {
				const w = widthAt(1 - pz);
				return { x: cx + (px - 0.5) * w, y: top + (w - far) / (near - far) * (bottom - top), k: w / near };
			};
			const path = function (pts) {
				c.beginPath();
				pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
			};
			const corners = [at(0, 1), at(1, 1), at(1, 0), at(0, 0)];   // far left, far right, near right, near left
			const up = (p, k) => ({ x: p.x, y: p.y - V.floor.wall * k });
			c.save();
			// the floor, with a grid across it
			path(corners);
			c.closePath();
			c.fillStyle = 'rgba(12,4,30,0.8)';
			c.fill();
			c.strokeStyle = 'rgba(255,255,255,0.14)';
			c.lineWidth = 2;
			for (let g = 0.25; g < 1; g += 0.25) {
				path([at(g, 0), at(g, 1)]);
				c.stroke();
				path([at(0, g), at(1, g)]);
				c.stroke();
			}
			path(corners);
			c.closePath();
			c.strokeStyle = 'rgba(255,255,255,0.85)';
			c.lineWidth = 5;
			c.stroke();
			// the walls: light glowing up off the floor's far and side edges,
			// fading to nothing as it rises (the wall faced, at the far edge, the brightest)
			c.save();
			// (each edge in thin slices, each fading up from its own foot, so a
			// slanting side wall fades evenly all along)
			const SLICES = 16;
			const glow = function (u0, d0, u1, d1, bright) {
				for (let k = 0; k < SLICES; k++) {
					const t0 = k / SLICES, t1 = (k + 1) / SLICES;
					const a = at(lerp(u0, u1, t0), lerp(d0, d1, t0));
					const b = at(lerp(u0, u1, t1), lerp(d0, d1, t1));
					const ha = V.floor.wall * a.k, hb = V.floor.wall * b.k;
					const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
					const g = c.createLinearGradient(mid.x, mid.y, mid.x, mid.y - (ha + hb) / 2);
					g.addColorStop(0, `rgba(120,230,255,${0.75 * bright})`);
					g.addColorStop(0.25, `rgba(90,180,255,${0.35 * bright})`);
					g.addColorStop(1, 'rgba(60,120,255,0)');
					c.beginPath();
					c.moveTo(a.x, a.y);
					c.lineTo(b.x + 0.5, b.y);
					c.lineTo(b.x + 0.5, b.y - hb);
					c.lineTo(a.x, a.y - ha);
					c.closePath();
					c.fillStyle = g;
					c.fill();
				}
			};
			glow(0, 1, 1, 1, 1);       // the wall faced: the far edge
			glow(0, 0, 0, 1, 0.7);     // the side walls
			glow(1, 0, 1, 1, 0.7);
			c.restore();
			// the circle, pulsing, lying on the floor
			const r = V.zone.r * (1 + 0.04 * Math.sin(bt * 5));
			const ring = [];
			for (let a = 0; a <= 48; a++) ring.push(at(V.zone.px + Math.cos(a / 48 * Math.PI * 2) * r, V.zone.pz + Math.sin(a / 48 * Math.PI * 2) * r));
			path(ring);
			c.fillStyle = 'rgba(255,210,63,0.12)';
			c.fill();
			c.setLineDash([18, 10]);
			c.lineDashOffset = -bt * 30;
			c.strokeStyle = theme.gold;
			c.lineWidth = 7;
			c.stroke();
			c.restore();
			const label = up({ x: cx, y: top }, far / near * 0.5);
			self.text(c, ['LEFT WALL', 'FRONT', 'RIGHT WALL'][wall], label.x, label.y, 26, { fill: 'white', outlineWidth: 4, glow: 'transparent' });
			// everyone in play, a worm each, far ones smaller (and drawn first)
			const shown = slots().map((p, i) => ({ p, i })).filter(({ p, i }) => p && p.px !== undefined && (motion[i] > V.moving || ticked[i] !== undefined));
			const seen = (p) => viewOf(wall, clamp(p.px, 0, 1), clamp(p.pz, 0, 1));
			shown.sort((a, b) => seen(b.p).d - seen(a.p).d);
			for (const { p, i } of shown) {
				const v = seen(p);
				const q = at(v.x, v.d);   // (right where they are, 1:1)
				const tall = V.worm.tall * clamp((p.Y + 1) / 2, 0.15, 1) * q.k;
				const b = bend[i] && bend[i][wall];
				drawWorm(c, q.x, q.y, tall, b ? b.a : 0, q.k, colour(i), i >= n, bt + i * 1.7, b && b.arms);
			}
		}

	};

	// TIME!: an alarm, everything slows to a stop, a giant TIME!, then the
	// room goes dark. Step your world by dt * show.timeScale in extra.update.
	beatsLib.timeUp = function (extra) {
		return extend({
			id: 'timeup',
			length: TIME_UP.length,
			enter() {
				clock.left = 0;
				clock.running = false;
				clock.delay = -1;
				self.fx('timeUp');
				self.flash = 0.7;
				self.shake = 0.6;
				camera.move({ x: camera.view().x, y: H / 2, z: 1.12 }, 2.4);
			},
			update(dt, bt) {
				self.timeScale = 1 - easeOut(between(bt, 0, TIME_UP.slow));
				if (self.cue(TIME_UP.title)) { self.fx('boom', 0.8); self.shake = 1; }
				if (self.cue(1.3)) self.stop('buzz');
				self.blackout = 0.96 * between(bt, TIME_UP.dark[0], TIME_UP.dark[1]);
				if (bt > TIME_UP.dark[0]) clock.shown = false;
			},
			draw(ctx, bt) {
				const out = 1 - between(bt, TIME_UP.dark[0] - 0.4, TIME_UP.dark[1]);
				self.onWalls(ctx, function (c) {
					const red = Math.floor(bt * 6) % 2 === 0 && bt < 1.6;
					self.slam(c, 'TIME!', W / 2, 500, 400, bt - TIME_UP.title, { fill: red ? '#ff5470' : 'white', glow: '#ff3d6a', alpha: out, rotate: -0.05 });
				});
			},
		}, extra);
	};

	// The players as a list: one row each, their avatar, their colour's name
	// and their score. Row r of n sits at listY(r, n); rows have no podium.
	function listY(r, n) {
		const gap = Math.min(LIST.row, LIST.height / Math.max(1, n));
		return LIST.top + (LIST.height - n * gap) / 2 + (r + 0.5) * gap;
	}
	function listRow(c, p, y, score, opts = {}) {
		const n = count();
		const gap = Math.min(LIST.row, LIST.height / Math.max(1, n));
		const h = gap * 0.82;
		const x0 = W / 2 - LIST.width / 2;
		const gold = opts.winner;
		c.save();
		c.globalAlpha *= opts.alpha === undefined ? 1 : opts.alpha;
		art.roundRect(c, x0, y - h / 2, LIST.width, h, h / 2, { fill: gold ? 'rgba(255,210,63,0.92)' : theme.panel, shadow: undefined });
		art.roundRect(c, x0, y - h / 2, 22, h, [h / 2, 0, 0, h / 2], { fill: colour(p) });
		// the place, once revealed
		// (dark, crisp type on a gold row; light, outlined type on the others)
		const ink = gold ? { fill: theme.ink, glow: 'transparent', outlineWidth: 0, drop: 'transparent' } : { glow: 'transparent', outlineWidth: 4 };
		if (opts.place) self.text(c, opts.place, x0 + 110, y + 2, h * 0.5, Object.assign({ fill: 'white' }, ink));
		avatar(c, p, x0 + 250, y + h * 0.42, h / 170, opts.pose || 'stand');
		self.text(c, self.nameOf(p), x0 + 330, y + 2, h * 0.42, Object.assign({ fill: lit(p), align: 'left' }, ink));
		if (!opts.noScore) self.text(c, fmt(score), x0 + LIST.width - 60, y + 2, h * 0.6, Object.assign({ fill: 'white', align: 'right' }, ink));
		c.restore();
	}

	// Everyone's score, a row each in player order, counting up.
	beatsLib.scores = function (extra) {
		let shown = [];
		return extend({
			id: 'scores',
			length: SCORES.length,
			world: false,
			enter() {
				self.blackout = 0;
				self.timeScale = 1;
				camera.wide();
				self.play('drama');
				self.fx('whooshLong', 0.6);
				shown = scores().map(() => 0);
			},
			update(dt, bt) {
				const k = easeOut(between(bt, SCORES.count[0], SCORES.count[1]));
				const before = shown.join();
				shown = scores().map((s) => Math.round(s * k));
				if (shown.join() !== before && Math.floor(bt * 12) % 2 === 0) self.fx('scoreTick');
				if (self.cue(SCORES.count[1])) { self.fx('scoresIn'); self.shake = 0.3; }
			},
			draw(ctx, bt) {
				const n = count();
				self.onWalls(ctx, function (c) {
					self.slam(c, 'SCORES', W / 2, 110, 120, bt - 0.1, { fill: theme.gold });
					for (let i = 0; i < n; i++) {
						const enter = easeOut(between(bt, 0.1 + i * 0.1, 0.45 + i * 0.1));
						c.save();
						c.translate((1 - enter) * -W * 0.6, 0);
						listRow(c, i, listY(i, n), shown[i], { alpha: enter });
						c.restore();
					}
				});
			},
		}, extra);
	};

	// The ranking: the same list reorders, rows sliding past each other into
	// place, then the places are revealed from last to first, each on a drum
	// hit, and the winner's row lights up gold. Ties share a place.
	beatsLib.rank = function (extra) {
		let place = [];   // place[n]: 0 for first (ties share)
		let slot = [];    // slot[n]: the row they end up in
		let label = [];
		let reveal = [];  // reveal[n]: when their place shows
		let winnerAt = 0;
		const SUFFIX = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
		return extend({
			id: 'rank',
			world: false,
			length: () => winnerAt + RANK.hold,
			enter() {
				const s = scores();
				const n = count();
				const order = [];
				for (let i = 0; i < n; i++) order.push(i);
				order.sort((a, b) => s[b] - s[a] || a - b);   // first place first
				slot = [];
				order.forEach((p, r) => { slot[p] = r; });
				place = s.map((v) => s.filter((w) => w > v).length);
				label = place.map((k) => SUFFIX[k]);
				// reveals from the bottom row up
				reveal = [];
				order.slice().reverse().forEach((p, k) => { reveal[p] = RANK.reveal + k * RANK.each; });
				winnerAt = RANK.reveal + (n - 1) * RANK.each;
			},
			update(dt, bt) {
				const n = count();
				if (self.cue(RANK.move[0])) self.fx('slide');
				for (let p = 0; p < n; p++) {
					if (!self.cue(reveal[p])) continue;
					if (place[p] === 0) {
						self.fx('placeReveal', 1, 1, 1);
						self.fx('fanfare');
						self.fx('crowd', 0.8);
						self.flash = 0.4;
						self.shake = 0.6;
						self.confetti(200);
					} else {
						self.fx('placeReveal', 0.9, 1, 1 - place[p] / Math.max(1, n - 1));
						self.shake = 0.2;
					}
				}
			},
			draw(ctx, bt) {
				const n = count();
				const s = scores();
				const firsts = place.filter((k) => k === 0).length;
				const winner = slot.indexOf(0);
				self.onWalls(ctx, function (c) {
					if (bt < winnerAt) self.slam(c, 'RANKINGS', W / 2, 110, 120, bt - 0.05, { fill: theme.gold });
					else if (firsts > 1) self.slam(c, 'IT\'S A TIE!', W / 2, 110, 130, bt - winnerAt, { fill: theme.gold });
					else self.slam(c, self.nameOf(winner) + ' WINS!', W / 2, 110, 130, bt - winnerAt, { fill: lit(winner), glow: colour(winner) });
					// rows slide from player order into rank order, staggered
					const rows = [];
					for (let p = 0; p < n; p++) {
						const k = ease(between(bt, RANK.move[0] + p * 0.08, RANK.move[1] + p * 0.08));
						const y = lerp(listY(p, n), listY(slot[p], n), k);
						const sway = Math.sin(Math.PI * k) * 60 * (slot[p] < p ? -1 : 1);   // passing each other
						rows.push({ p, y, x: sway, shown: bt >= reveal[p] });
					}
					rows.sort((a, b) => b.y - a.y);   // the lower rows under the higher ones
					for (const r of rows) {
						const top = place[r.p] === 0 && r.shown;
						c.save();
						c.translate(r.x, 0);
						if (r.shown && bt - reveal[r.p] < 0.3) {
							const pop = 1 + 0.12 * Math.sin(Math.PI * (bt - reveal[r.p]) / 0.3);
							c.translate(W / 2, r.y);
							c.scale(pop, pop);
							c.translate(-W / 2, -r.y);
						}
						listRow(c, r.p, r.y, s[r.p], { place: r.shown ? label[r.p] : '', winner: top, pose: top ? 'win' : r.shown ? 'cheer' : 'stand' });
						c.restore();
					}
				});
			},
		}, extra);
	};

	// The team total: it opens on the rankings as they were left; all but the
	// scores fade away, the scores fly from where they sat to the middle and
	// smoosh into one number that counts up, the bonus lands on top, and the
	// room erupts.
	// opts.team (optional): { y, into, decor(c, bt, state) }: where the total
	// sits, where the scores fly to, and the game's own scene behind it all
	// (drawn on each wall first; state: { fade, fly, merged, mergedAt, partyAt, total })
	const TEAM_AT = Object.assign({ y: TEAM.y }, opts.team);
	if (TEAM_AT.into === undefined) TEAM_AT.into = TEAM_AT.y;
	beatsLib.team = function (extra) {
		let shown = 0;
		let partyAt = 0;
		return extend({
			id: 'team',
			world: false,
			length: TEAM.length,
			enter() {
				shown = 0;
				partyAt = bonus() > 0 ? TEAM.bonus[1] + 0.3 : TEAM.count[1] + 0.3;
				self.stop('drumroll');
				self.play('drama');
			},
			update(dt, bt) {
				const sum = scores().reduce((a, b) => a + b, 0);
				// the whole total the moment the scores combine; the bonus lands on it whole too
				shown = (bt >= TEAM.fly[1] ? sum : 0) + (bt >= TEAM.bonus[0] ? bonus() : 0);
				if (self.cue(TEAM.fly[0])) self.fx('gather');
				if (self.cue(TEAM.fly[1])) { self.fx('smoosh'); self.shake = 0.8; self.flash = 0.4; }
				if (bonus() > 0 && self.cue(TEAM.bonus[0])) self.fx('bonus');
				if (self.cue(partyAt)) {
					self.fx('party');
					self.shake = 0.7;
					self.flash = 0.5;
					self.confetti(400);
					for (let w = 0; w < 3; w++) { self.burst(w * W + W / 2, TEAM_AT.y, theme.gold); self.burst(w * W + 250, 300, theme.accent); self.burst(w * W + 1350, 300, '#33e0ff'); }
				}
				// more light bursts, all round the room, while it celebrates
				if (bt > partyAt && Math.floor((bt - dt) / 0.45) !== Math.floor(bt / 0.45) && bt < TEAM.length - 1.5) {
					self.burst(Math.random() * WIDTH, 150 + Math.random() * 500, CONFETTI[Math.floor(Math.random() * 5)]);
					self.confetti(30);
				}
			},
			draw(ctx, bt) {
				const n = count();
				const s = scores();
				const fade = between(bt, TEAM.fade[0], TEAM.fade[1]);
				const fly = easeIn(between(bt, TEAM.fly[0], TEAM.fly[1]));
				const merged = bt >= TEAM.fly[1];
				// the rankings' rows, by rank, as the last screen left them
				const order = [];
				for (let i = 0; i < n; i++) order.push(i);
				order.sort((a, b) => s[b] - s[a] || a - b);
				const SUFFIX = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
				self.onWalls(ctx, function (c) {
					if (TEAM_AT.decor) TEAM_AT.decor(c, bt, { fade, fly, merged, mergedAt: TEAM.fly[1], partyAt, total: s.reduce((a, b) => a + b, 0) });
					if (bt > TEAM.fade[1]) self.slam(c, 'TEAM TOTAL', W / 2, 150, 110, bt - TEAM.fade[1], { fill: theme.gold });
					if (merged) return drawTotal(c, bt);
					const gap = Math.min(LIST.row, LIST.height / Math.max(1, n));
					const size = self.size(gap * 0.82 * 0.6);
					const right = W / 2 + LIST.width / 2 - 60;
					order.forEach(function (p, r) {
						const y = listY(r, n);
						const place = s.filter((w) => w > s[p]).length;
						const winner = place === 0;
						// everything but the score fades
						if (fade < 1) listRow(c, p, y, '', { place: SUFFIX[place], winner, pose: winner ? 'win' : 'cheer', alpha: 1 - fade, noScore: true });
						// the score: from where it sat, flying in to the middle, stretching as it goes
						const w = measure(c, fmt(s[p]), size);
						const x0 = right - w / 2;
						const fx = lerp(x0, W / 2, fly);
						const fy = lerp(y + 2, TEAM_AT.into, fly);
						const grow = lerp(1, 1.4, fly);
						c.save();
						c.translate(fx, fy);
						c.scale(grow * (1 + fly * 0.6), grow * (1 - fly * 0.25));
						self.text(c, fmt(s[p]), 0, 0, size, { fill: winner && fade < 0.5 ? TYPE.colours.ink : TYPE.colours.white });
						c.restore();
					});
				});
			},
		}, extra);

		// smooshed: a squash and bounce, then the total counting up
		function drawTotal(c, bt) {
			const age = bt - TEAM.fly[1];
			const sq = Math.exp(-age * 5) * Math.cos(age * 22);
			const party = bt > partyAt ? 1 + 0.06 * Math.sin(bt * 10) : 1;
			c.save();
			c.translate(W / 2, TEAM_AT.y);
			c.scale((1 + 0.45 * sq) * party, (1 - 0.4 * sq) * party);
			self.text(c, fmt(shown), 0, 0, 220, { fill: theme.gold });
			c.restore();
			if (bonus() > 0) self.slam(c, '+' + fmt(bonus()) + ' ' + (opts.bonusLabel || 'BONUS'), W / 2, 665, 56, bt - TEAM.bonus[0], { fill: 'white', alpha: 1 - between(bt, TEAM.length - 1, TEAM.length) });
		}
	};

	// The leaderboard: today's other teams (made up, seeded from the game
	// and the total), then your team's row slides in at the bottom and climbs
	// to its standing.
	const RIVALS = opts.rivals || ['The Night Owls', 'Glow Getters', 'Team Turbo', 'Squad Goals', 'Thunder Buddies', 'The Wildcards',
		'Pixel Pirates', 'Moonwalkers', 'High Fivers', 'The Comets', 'Big Energy', 'Rocket Club'];
	let board = null;
	function makeBoard() {
		const total = self.teamTotal();
		const r = seeded((opts.id || 'game') + ':' + total);
		const names = RIVALS.slice();
		for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
		const rank = 1 + Math.floor(r() * 4);   // where you land: always a podium-ish finish worth cheering
		const gap = Math.max(3, Math.round(Math.max(total, 120) * 0.045));
		const rows = [];
		for (let i = 0; i < BOARD.teams; i++) {
			const above = i < rank - 1;
			const d = above ? rank - 1 - i : i - rank + 2;
			const score = above ? total + d * gap + Math.floor(r() * gap * 0.8) + 1 : Math.max(0, total - d * gap - Math.floor(r() * gap * 0.8) - 1);
			rows.push({ name: names[i % names.length], score, y: 0 });
		}
		rows.sort((a, b) => b.score - a.score);
		return { rows, rank, us: { y: 0 }, total };
	}
	beatsLib.board = function (extra) {
		const passes = () => (board ? BOARD.teams - (board.rank - 1) : 0);
		const landAt = () => BOARD.enter + 0.6 + passes() * BOARD.climb;
		return extend({
			id: 'board',
			world: false,
			length: () => landAt() + BOARD.hold,
			enter() {
				board = makeBoard();
				board.rows.forEach((row, i) => { row.y = BOARD.top + i * BOARD.row; });
				board.us.y = BOARD.top + BOARD.teams * BOARD.row + 120;
				self.fx('whooshLong', 0.5);
			},
			update(dt, bt) {
				const climbed = clamp(Math.floor((bt - BOARD.enter - 0.6) / BOARD.climb) + 1, 0, passes());
				const slot = BOARD.teams - climbed;
				board.rows.forEach(function (row, i) {
					const want = BOARD.top + (i >= slot ? i + 1 : i) * BOARD.row;
					row.y += (want - row.y) * Math.min(1, dt * 24);
				});
				if (bt > BOARD.enter) board.us.y += (BOARD.top + slot * BOARD.row - board.us.y) * Math.min(1, dt * 24);
				for (let k = 1; k <= passes(); k++) if (self.cue(BOARD.enter + 0.6 + (k - 1) * BOARD.climb)) self.fx('climb', 0.8, 1 + k * 0.06);
				if (self.cue(BOARD.enter)) self.fx('rowIn');
				if (self.cue(landAt())) {
					self.fx('fanfare');
					self.fx('crowd', 0.8);
					self.flash = 0.5;
					self.shake = 0.7;
					self.confetti(300);
					for (let w = 0; w < 3; w++) self.burst(w * W + W / 2, 520, theme.gold);
				}
			},
			draw(ctx, bt) {
				const land = landAt();
				self.onWalls(ctx, function (c) {
					self.slam(c, "TODAY'S TOP TEAMS", W / 2, 88, 84, bt - 0.05, { fill: theme.gold });
					const x0 = 230;
					const x1 = W - 230;
					board.rows.forEach(function (row, i) {
						const drop = easeOut(between(bt, 0.2 + i * BOARD.drop, 0.6 + i * BOARD.drop));
						if (drop <= 0) return;
						const y = row.y - (1 - drop) * 80;
						const place = Math.round((row.y - BOARD.top) / BOARD.row) + 1;
						art.roundRect(c, x0, y - BOARD.row / 2 + 5, x1 - x0, BOARD.row - 10, 16, { fill: theme.panel, alpha: drop });
						self.text(c, String(place), x0 + 50, y, 40, { fill: 'rgba(255,255,255,0.6)', glow: 'transparent', outlineWidth: 3, alpha: drop });
						self.text(c, row.name, x0 + 110, y, 42, { align: 'left', glow: 'transparent', outlineWidth: 3, alpha: drop });
						self.text(c, fmt(row.score), x1 - 40, y, 42, { align: 'right', fill: 'rgba(255,255,255,0.85)', glow: 'transparent', outlineWidth: 3, alpha: drop });
					});
					// your row, glowing gold
					if (bt > BOARD.enter - 0.4) {
						const slide = easeOut(between(bt, BOARD.enter - 0.4, BOARD.enter));
						const y = board.us.y;
						const glow = bt > land ? 1 + 0.04 * Math.sin(bt * 9) : 1;
						const place = clamp(Math.round((y - BOARD.top) / BOARD.row) + 1, 1, BOARD.teams + 1);
						c.save();
						c.translate(W / 2 + (1 - slide) * 1400, y);
						c.scale(glow * 1.06, glow * 1.06);
						art.roundRect(c, x0 - W / 2 - 20, -BOARD.row / 2, x1 - x0 + 40, BOARD.row, 20, { fill: art.linear(c, x0 - W / 2, 0, x1 - W / 2, 0, [[0, theme.gold], [1, '#ff9a3d']]), shadow: { color: theme.gold, blur: 40 } });
						art.text(c, String(place), x0 - W / 2 + 40, 2, { size: 46, font: FONT, weight: 400, fill: theme.ink });
						art.text(c, 'YOUR TEAM', x0 - W / 2 + 100, 2, { size: 48, font: FONT, weight: 400, fill: theme.ink, align: 'left' });
						art.text(c, fmt(board.total), x1 - W / 2 - 30, 2, { size: 48, font: FONT, weight: 400, fill: theme.ink, align: 'right' });
						c.restore();
					}
					if (bt > land) {
						// the standing, slammed over the board clear of your own row
						const by = board.us.y < 520 ? Math.max(board.us.y + 250, 600) : board.us.y - 250;
						art.rect(c, 0, by - 125, W, 250, { fill: 'rgba(8,2,20,0.6)', alpha: Math.min(1, (bt - land) * 3) });
						self.slam(c, '#' + board.rank + ' OF THE DAY!', W / 2, by, 170, bt - land, { fill: theme.gold, glow: '#ff7a3d', rotate: -0.04 });
					}
				});
			},
		}, extra);
	};

	// The replay: everyone's whole game, fast-forwarded, as a camera at the
	// back of the gamebox would have filmed it: the room in perspective, the
	// front wall glowing, and the players as people, seen from behind, walking
	// where they walked.
	const ROOM = {
		f: 760,                // the camera's focal length, in wall pixels
		centre: 380,           // where its line of sight meets the wall
		eye: 0.95,             // its height: above the walls, looking down into the box
		pitch: 22,             // degrees it tilts down
		near: 0.45,            // the back of the room, this far in front of the camera
		depth: 1,              // the room, back to front (and 1 wide)
		height: 0.625,         // the walls are 16:10
		person: 0.36,          // a person, in room units tall
	};
	const PITCH_SIN = Math.sin(ROOM.pitch * Math.PI / 180);
	const PITCH_COS = Math.cos(ROOM.pitch * Math.PI / 180);
	// A point in the room (x across from the middle, y up, z away from the
	// camera) on the wall: [x, y, pixels per room unit there].
	function roomPoint(x, y, z) {
		const dy = y - ROOM.eye;
		const v = dy * PITCH_COS + z * PITCH_SIN;
		const d = -dy * PITCH_SIN + z * PITCH_COS;
		return [W / 2 + ROOM.f * x / d, ROOM.centre - ROOM.f * v / d, ROOM.f / d];
	}
	// A player's spot in the room: px across, pz 1 at the front wall.
	function roomSpot(q) {
		return { x: q[0] - 0.5, z: ROOM.near + 0.12 + (1 - 0.12) * q[1] * ROOM.depth };
	}

	function drawRoom(c) {
		const zf = ROOM.near + ROOM.depth;
		const zn = ROOM.near;
		const P = (x, y, z) => roomPoint(x, y, z).slice(0, 2);
		const H0 = ROOM.height;
		// the floor, the side walls, the front wall
		art.poly(c, [P(-0.5, 0, zf), P(0.5, 0, zf), P(0.5, 0, zn), P(-0.5, 0, zn)], { fill: art.linear(c, 0, P(0, 0, zf)[1], 0, H, ['#2c2236', '#140e1c']) });
		for (const side of [-0.5, 0.5]) {
			art.poly(c, [P(side, 0, zf), P(side, H0, zf), P(side, H0, zn), P(side, 0, zn)], { fill: art.linear(c, side < 0 ? 0 : W, 0, W / 2, 0, [theme.accent2, '#1c1030']), alpha: 0.85 });
		}
		art.poly(c, [P(-0.5, 0, zf), P(0.5, 0, zf), P(0.5, H0, zf), P(-0.5, H0, zf)], { fill: art.linear(c, 0, P(0, H0, zf)[1], 0, P(0, 0, zf)[1], [theme.accent, theme.accent2]) });
		// the tops of the walls, catching the light
		art.line(c, [P(-0.5, H0, zn), P(-0.5, H0, zf), P(0.5, H0, zf), P(0.5, H0, zn)], { stroke: 'rgba(255,255,255,0.35)', lineWidth: 4, lineJoin: 'round' });
		// glow off the walls onto the floor
		const fc = P(0, 0, zf);
		art.ellipse(c, fc[0], fc[1] + 40, 360, 90, { fill: art.radial(c, fc[0], fc[1] + 40, 0, 360, [[0, 'rgba(255,79,216,0.35)'], [1, 'rgba(255,79,216,0)']]) });
		// floor lines receding
		for (let g = 1; g < 5; g++) {
			const z = zn + ROOM.depth * g / 5;
			art.line(c, [P(-0.5, 0, z), P(0.5, 0, z)], { stroke: 'rgba(255,255,255,0.06)', lineWidth: 2 });
		}
	}

	// A person seen from behind: their shirt in their player's colour.
	const LOOKS = [['#2b1d14', '#e8b48c'], ['#e0b25c', '#f2cfae'], ['#121014', '#c98d64'], ['#7a3b1c', '#f0c6a0'], ['#3c3c44', '#8d5a3b'], ['#a85a2a', '#ecc09a']];
	function person(c, p, x, y, s, stride) {
		const [hair, skin] = LOOKS[p % LOOKS.length];
		const shirt = colour(p);
		const u = s * ROOM.person;   // their height, in pixels
		const swing = Math.sin(stride) * 0.32;
		art.ellipse(c, x, y, u * 0.2, u * 0.05, { fill: 'rgba(0,0,0,0.4)' });
		// legs: jeans, swinging
		for (const side of [-1, 1]) {
			const lift = Math.max(0, Math.sin(stride) * side) * u * 0.04;
			c.save();
			c.translate(x + side * u * 0.05, y - u * 0.47);
			c.rotate(side * swing);
			art.roundRect(c, -u * 0.045, 0, u * 0.09, u * 0.47 - lift, u * 0.03, { fill: '#2b3a5c' });
			art.roundRect(c, -u * 0.05, u * 0.44 - lift, u * 0.1, u * 0.04, u * 0.02, { fill: '#eeeeee' });
			c.restore();
		}
		// arms, swinging the other way
		for (const side of [-1, 1]) {
			c.save();
			c.translate(x + side * u * 0.12, y - u * 0.8);
			c.rotate(-side * swing * 0.8);
			art.roundRect(c, -u * 0.035, 0, u * 0.07, u * 0.33, u * 0.035, { fill: shirt });
			art.circle(c, 0, u * 0.35, u * 0.035, { fill: skin });
			c.restore();
		}
		// torso, shoulders, neck, head (the back of it: hair)
		art.roundRect(c, x - u * 0.13, y - u * 0.84, u * 0.26, u * 0.4, u * 0.07, { fill: shirt });
		art.roundRect(c, x - u * 0.13, y - u * 0.5, u * 0.26, u * 0.06, u * 0.03, { fill: 'rgba(0,0,0,0.18)' });
		art.rect(c, x - u * 0.03, y - u * 0.9, u * 0.06, u * 0.07, { fill: skin });
		art.ellipse(c, x, y - u * 0.96, u * 0.075, u * 0.09, { fill: hair });
		for (const side of [-1, 1]) art.ellipse(c, x + side * u * 0.075, y - u * 0.95, u * 0.015, u * 0.025, { fill: skin });
	}

	beatsLib.replay = function (extra) {
		let data = [];
		let span = SECONDS;
		return extend({
			id: 'replay',
			world: false,
			length: REPLAY.intro + REPLAY.play + REPLAY.outro,
			enter() {
				const n = count();
				data = track.length >= 20 ? track : fakeTrack(n);
				span = Math.max(1, data[data.length - 1].t - data[0].t);
				self.stop('drama');
				self.stop('cheer');
				self.play('replay', 1.25);
				self.fx('rewind');
			},
			update(dt, bt) {
				if (self.cue(REPLAY.intro + REPLAY.play)) { self.stop('replay'); self.fx('tapeStop'); }
			},
			draw(ctx, bt) {
				const n = count();
				const k = between(bt, REPLAY.intro, REPLAY.intro + REPLAY.play);
				const at = k * (data.length - 1);
				const i0 = Math.min(data.length - 1, Math.floor(at));
				const i1 = Math.min(data.length - 1, i0 + 1);
				const f = at - i0;
				const gameT = data[0].t + k * span;
				const speed = Math.round(span / REPLAY.play);
				const out = 1 - between(bt, REPLAY.intro + REPLAY.play + REPLAY.outro - 0.6, REPLAY.intro + REPLAY.play + REPLAY.outro);
				// where everyone is now, between samples, and how far they've walked (for their stride)
				const people = [];
				for (let p = 0; p < n; p++) {
					const a = data[i0].p[p];
					const b = data[i1].p[p] || a;
					if (!a) continue;
					const q = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
					let walked = 0;
					for (let i = 1; i <= i0; i++) {
						const u = data[i].p[p];
						const v = data[i - 1].p[p];
						if (u && v) walked += Math.hypot(u[0] - v[0], u[1] - v[1]);
					}
					walked += Math.hypot(q[0] - a[0], q[1] - a[1]);
					const spot = roomSpot(q);
					people.push({ p, q, spot, stride: walked * 28 });
				}
				people.sort((x, y) => y.spot.z - x.spot.z);   // far first
				self.onWalls(ctx, function (c) {
					c.save();
					c.globalAlpha *= out;
					drawRoom(c);
					// each player's recent path, glowing faintly on the floor
					for (const who of people) {
						const pts = [];
						for (let i = Math.max(0, i0 - REPLAY.trail); i <= i0; i++) {
							const q = data[i].p[who.p];
							if (!q) continue;
							const sp = roomSpot(q);
							pts.push(roomPoint(sp.x, 0, sp.z).slice(0, 2));
						}
						const here = roomPoint(who.spot.x, 0, who.spot.z);
						pts.push(here.slice(0, 2));
						if (pts.length > 1) art.line(c, pts, { stroke: colour(who.p), lineWidth: 6, alpha: 0.45, lineCap: 'round', lineJoin: 'round' });
					}
					for (const who of people) {
						const [x, y, s] = roomPoint(who.spot.x, 0, who.spot.z);
						person(c, who.p, x, y, s, who.stride);
					}
					self.slam(c, 'REPLAY', W / 2, 90, 100, bt - 0.05, { fill: theme.gold });
					// ▶▶ ×N, blinking
					if (k < 1 && Math.floor(bt * 3) % 2 === 0) {
						c.save();
						c.translate(1270, 90);
						for (const dx of [0, 44]) art.poly(c, [[dx, -26], [dx + 40, 0], [dx, 26]], { fill: 'white' });
						c.restore();
						self.text(c, '×' + speed, 1420, 92, 64, { glow: theme.accent });
					}
					self.text(c, mmss(SECONDS - gameT), 200, 92, 64, { fill: 'white', font: CLOCK_FONT });
					// a REC dot, for the camera at the back
					if (Math.floor(bt * 2) % 2 === 0) art.circle(c, 200 - 150, 92, 14, { fill: '#ff3a3a' });
					// the timeline, with the big moments marked
					const bx0 = 260;
					const bx1 = W - 260;
					const by = 935;
					art.roundRect(c, bx0, by - 9, bx1 - bx0, 18, 9, { fill: 'rgba(255,255,255,0.15)' });
					art.roundRect(c, bx0, by - 9, Math.max(18, (bx1 - bx0) * k), 18, 9, { fill: theme.accent });
					for (const m of marks) {
						const mk = (m - data[0].t) / span;
						const past = mk <= k;
						art.poly(c, star(bx0 + (bx1 - bx0) * mk, by, past ? 26 : 18), { fill: past ? theme.gold : 'rgba(255,255,255,0.4)' });
					}
					c.restore();
				});
			},
		}, extra);
	};

	function star(x, y, r) {
		const pts = [];
		for (let i = 0; i < 10; i++) {
			const a = -Math.PI / 2 + i * Math.PI / 5;
			const rr = i % 2 ? r * 0.45 : r;
			pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
		}
		return pts;
	}

	// The rating, at the very end (before 'end', which tells the gamebox the
	// game is over). One rating for the group: HOW WAS IT? and five faces on
	// every wall, sad to happy; the first tap counts. Then, for a low rating
	// (1-3), WHAT WENT WRONG? with reasons to tap (as many as fit) and DONE;
	// for a high one (4-5), straight on. Each part gives up and moves on if
	// nobody taps. Then the end: the carousel. self.feedback() is what was said.
	beatsLib.rate = function (extra) {
		const R = RATE;
		let part = 'faces';     // 'faces' | 'reasons' | 'again' | 'thanks' | 'over'
		let partAt = 0;
		let feedback = null;    // { rating, label, reasons: [], again: id | null }
		let $layer = null;
		self.feedback = () => (feedback ? Object.assign({}, feedback, { reasons: feedback.reasons.slice() }) : null);
		const font = `"${FONT}", sans-serif`;
		const games = () => (IGB.menu || []).filter((id) => !R.notAgain.includes(id)).map((id) => IGB.find(id)).filter(Boolean)
			// this game first
			.sort((a, b) => (b.id === opts.id) - (a.id === opts.id));

		function face(i) {
			const f = R.faces[i];
			const mouth = f.mouth >= 20
				? `<path d="M30 60 Q50 ${60 + f.mouth * 1.6} 70 60 Z" fill="${theme.ink}"/>`
				: `<path d="M30 ${66 - f.mouth / 3} Q50 ${66 + f.mouth} 70 ${66 - f.mouth / 3}" stroke="${theme.ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
			const brows = f.brows ? `<path d="M28 30 L42 36 M72 30 L58 36" stroke="${theme.ink}" stroke-width="6" stroke-linecap="round"/>` : '';
			// the button style: one gradient, darker at the top; a white bar over
			// the top half; a thin black outline, a thin white line inside it
			const id = 'rate-face-' + i + '-' + ++faceIds;
			return `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs>`
				+ `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darker(f.colour, GLOSS.dark)}"/><stop offset="1" stop-color="${f.colour}"/></linearGradient>`
				+ `<clipPath id="${id}c"><circle cx="50" cy="50" r="46"/></clipPath></defs>`
				+ `<circle cx="50" cy="50" r="46" fill="url(#${id}g)"/>`
				+ `<rect x="0" y="0" width="100" height="50" fill="white" fill-opacity="${GLOSS.bar}" clip-path="url(#${id}c)"/>`
				+ `<circle cx="50" cy="50" r="46" fill="none" stroke="#000" stroke-width="2.2"/><circle cx="50" cy="50" r="44.2" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="1.4"/>`
				+ `<circle cx="36" cy="42" r="6.5" fill="${theme.ink}"/><circle cx="64" cy="42" r="6.5" fill="${theme.ink}"/>${brows}${mouth}</svg>`;   // (the face on top of it all)
		}
		let faceIds = 0;

		const big = (text, size = 110) => $('<div>').text(text).css({
			fontSize: size + 'px', letterSpacing: '2px', lineHeight: 1, textAlign: 'center',
			textShadow: '0 9px 0 rgba(0,0,0,0.5)',
			WebkitTextStroke: `7px ${theme.ink}`, paintOrder: 'stroke fill',
		});
		const small = (text) => $('<div>').text(text).css({ fontSize: '40px', color: TYPE.colours.gold, letterSpacing: '2px', WebkitTextStroke: `4px ${theme.ink}`, paintOrder: 'stroke fill' });
		const pill = (text, on, extraCss) => $('<button>').text(text).css(Object.assign({
			padding: '22px 44px', borderRadius: '60px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
			...button(on ? TYPE.colours.gold : TYPE.colours.white, 40),
			fontFamily: font, fontSize: '40px', letterSpacing: '1px', cursor: 'pointer', pointerEvents: 'auto',
			transition: 'transform 0.15s',
		}, extraCss));
		const tap = ($b, fn) => $b.on('click', function (e) { e.stopPropagation(); self.fx('tap'); fn(); });

		// Every wall shows the same thing; any wall's tap counts for all.
		function render() {
			if ($layer) $layer.remove();
			$layer = $('<showtime-rating>').attr('part', part).css({ position: 'absolute', left: 0, top: 0, width: 3 * W + 'px', height: H + 'px', pointerEvents: 'none' }).appendTo(stage.$ui);
			if (part === 'thanks' || part === 'over') return;
			for (let wall = 0; wall < 3; wall++) {
				const $wall = $('<div>').css({
					position: 'absolute', left: wall * W + 'px', top: 0, width: W + 'px', height: H + 'px',
					display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px',
					fontFamily: font, color: 'white',
				}).appendTo($layer);
				if (part === 'faces') faces($wall);
				else if (part === 'reasons') reasons($wall);
			}
		}

		function faces($wall) {
			big('HOW WAS IT?').appendTo($wall);
			small('TAP A FACE').appendTo($wall);
			const $row = $('<div>').css({ display: 'flex', gap: '34px', marginTop: '20px' }).appendTo($wall);
			R.faces.forEach(function (f, i) {
				// once rated, the chosen face grows and the rest fade back
				const chosen = feedback && feedback.rating === i + 1;
				const $b = $('<button>').attr({ rating: i + 1, title: f.label }).css({
					display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
					width: '230px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', pointerEvents: 'auto',
					fontFamily: font, color: 'white', fontSize: '28px', letterSpacing: '1px',
					opacity: feedback && !chosen ? 0.25 : 1, transform: chosen ? 'scale(1.25)' : 'none', transition: 'transform 0.2s, opacity 0.2s',
				}).appendTo($row);
				$('<div>').html(face(i)).css({ width: '200px', height: '200px' }).appendTo($b);
				$('<div>').text(f.label).css({ WebkitTextStroke: `5px ${theme.ink}`, paintOrder: 'stroke fill', whiteSpace: 'nowrap' }).appendTo($b);
				tap($b, () => rate(i + 1));
			});
		}

		function reasons($wall) {
			big('WHAT WENT WRONG?', 96).appendTo($wall);
			small('TAP ALL THAT APPLY').appendTo($wall);
			const $grid = $('<div>').css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '22px', maxWidth: '1400px' }).appendTo($wall);
			R.reasons.forEach(function (reason) {
				const on = feedback.reasons.includes(reason);
				tap(pill(reason, on).attr('reason', reason).appendTo($grid), function () {
					feedback.reasons = on ? feedback.reasons.filter((r) => r !== reason) : feedback.reasons.concat(reason);
					render();
				});
			});
			tap(pill('DONE ✓', true, { marginTop: '16px', fontSize: '56px', padding: '24px 70px' }).attr('done', '').appendTo($wall), () => finish());
		}

		function go(next) {
			part = next;
			partAt = self.bt;
			render();
		}

		function rate(rating) {
			if (feedback) return;   // one rating for the group: the first tap
			const f = R.faces[rating - 1];
			feedback = { rating, label: f.label, reasons: [], again: null };
			self.fx(rating >= 4 ? 'rateHigh' : 'rateLow');
			console.log('Rating:', rating, f.label);
			if (IGB.log) IGB.log(`Rated ${f.label} (${rating})`);
			// a moment to see the face picked, then on
			render();
			stage.timeout(() => { if ($layer && part === 'faces') go(rating <= R.low ? 'reasons' : 'over'); }, R.picked * 1000);
		}

		function finish() {
			if (feedback && feedback.reasons.length) {
				console.log('Feedback:', feedback.reasons.join(', '));
				if (IGB.log) IGB.log('Feedback: ' + feedback.reasons.join(', '));
			}
			go('over');   // straight on to the end: the carousel
		}

		function clear() {
			if ($layer) $layer.remove();
			$layer = null;
		}

		return extend({
			id: 'rate',
			world: false,
			length: Infinity,
			done: () => part === 'over',
			enter() {
				part = 'faces';
				partAt = 0;
				feedback = null;
				self.blackout = 0.35;
				render();
			},
			exit: clear,
			update(dt, bt) {
				const age = bt - partAt;
				if (part === 'faces' && age > R.wait.faces) go('over');
				if (part === 'reasons' && age > R.wait.reasons) finish();
				if (part === 'thanks' && age > R.thanks) part = 'over';
			},
			draw(ctx, bt) {
				if (part !== 'thanks') return;
				self.onWalls(ctx, function (c) {
					self.slam(c, 'THANK YOU!', W / 2, 470, 170, bt - partAt, { fill: theme.gold, glow: '#ff7a3d' });
					if (feedback && feedback.again) self.text(c, 'NEXT UP: ' + (IGB.find(feedback.again) || { name: '' }).name.toUpperCase(), W / 2, 650, 60, { fill: 'white', alpha: clamp((bt - partAt - 0.4) * 3, 0, 1) });
				});
			},
		}, extra);
	};

	// The end, where the show stays until the game is stopped: THANKS FOR
	// PLAYING!, the other games going round in a carousel of screenshots
	// (assets/shared/screens/<id>.jpg, made by tools/screens.mjs) for ever, and
	// BOOK ANOTHER SESSION AT THE KIOSK. The game hands back as it starts
	// (extra.enter is the place to call IGB.complete).
	beatsLib.end = function (extra) {
		const CAROUSEL = { every: 2.8, w: 640, h: 400, side: 520 };
		let $layer = null;
		let slides = [];      // every wall's slides, by game: [[$slide, ...], ...]
		let shownSlide = -1;
		const games = () => (IGB.menu || []).filter((id) => !RATE.notAgain.includes(id) && id !== opts.id).map((id) => IGB.find(id)).filter(Boolean);   // (the others: they've just played this one)

		function build() {
			if ($layer) $layer.remove();
			slides = [];
			shownSlide = -1;
			$layer = $('<showtime-end>').css({ position: 'absolute', left: 0, top: 0, width: 3 * W + 'px', height: H + 'px', pointerEvents: 'none' }).appendTo(stage.$ui);
			const list = games();
			for (let wall = 0; wall < 3; wall++) {
				const $wall = $('<div>').css({
					position: 'absolute', left: wall * W + 'px', top: 0, width: W + 'px', height: H + 'px',
					display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '34px',
					fontFamily: `"${FONT}", sans-serif`, color: 'white',
				}).appendTo($layer);
				$('<div>').text('THANKS FOR PLAYING!').css({
					fontSize: '96px', letterSpacing: '2px', lineHeight: 1, textAlign: 'center',
					textShadow: '0 9px 0 rgba(0,0,0,0.5)', WebkitTextStroke: `7px ${theme.ink}`, paintOrder: 'stroke fill',
				}).appendTo($wall);
				const $track = $('<div>').attr('carousel', '').css({ position: 'relative', width: '1500px', height: CAROUSEL.h + 56 + 'px' }).appendTo($wall);
				list.forEach(function (g, i) {
					const $slide = $('<div>').attr('slide', g.id).css({
						position: 'absolute', left: '50%', top: 0, width: CAROUSEL.w + 'px', marginLeft: -CAROUSEL.w / 2 + 'px',
						display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
						transition: 'transform 0.7s cubic-bezier(.4,0,.2,1), opacity 0.7s',
					}).appendTo($track);
					$('<div>').css({
						width: CAROUSEL.w + 'px', height: CAROUSEL.h + 'px', borderRadius: '28px',
						background: `#1a1030 url("assets/shared/screens/${g.id}.jpg") center / cover`, border: `6px solid ${TYPE.colours.white}`,
						boxShadow: '0 18px 40px rgba(0,0,0,0.55)',
					}).appendTo($slide);
					$('<div>').text(g.name.toUpperCase()).css({ fontSize: '40px', letterSpacing: '1px', WebkitTextStroke: `5px ${theme.ink}`, paintOrder: 'stroke fill' }).appendTo($slide);
					(slides[i] = slides[i] || []).push($slide);
				});
				// the kiosk: book another session
				$('<div>').text('BOOK ANOTHER SESSION AT THE KIOSK').attr('kiosk', '').css({
					padding: '20px 46px', borderRadius: '60px', ...button(TYPE.colours.gold, 50),
					fontSize: '50px', letterSpacing: '1px', lineHeight: 1, animation: 'showtime-kiosk 1.6s ease-in-out infinite',
				}).appendTo($wall);
			}
			place(0, true);
			shownSlide = 0;
		}

		// the slides round the one showing: it in the middle, its neighbours
		// smaller either side, the rest out of sight
		function place(at, instant) {
			const n = slides.length;
			slides.forEach(function (copies, i) {
				let d = ((i - at) % n + n) % n;
				if (d > n / 2) d -= n;
				const k = Math.abs(d);
				const css = {
					transform: `translateX(${d * CAROUSEL.side}px) scale(${k === 0 ? 1 : k === 1 ? 0.66 : 0.45})`,
					opacity: k === 0 ? 1 : k === 1 ? 0.5 : 0,
					zIndex: 10 - k,
				};
				for (const $s of copies) {
					if (instant) $s.css('transition', 'none');
					$s.css(css);
					if (instant) { void $s[0].offsetWidth; $s.css('transition', 'transform 0.7s cubic-bezier(.4,0,.2,1), opacity 0.7s'); }
				}
			});
		}
		if (!document.getElementById('showtime-kiosk-css')) {
			$('<style id="showtime-kiosk-css">').text('@keyframes showtime-kiosk { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }').appendTo('head');
		}

		return extend({
			id: 'end',
			world: false,
			length: Infinity,
			enter() {
				self.blackout = 0.35;
				self.fx('thanks');
				build();
			},
			exit() {
				if ($layer) $layer.remove();
				$layer = null;
			},
			update(dt, bt) {
				// round and round, for ever
				if (!slides.length) return;
				const at = Math.floor(bt / CAROUSEL.every) % slides.length;
				if (at !== shownSlide) { shownSlide = at; place(at); }
			},
		}, extra);
	};

	/* ---------- for tests ---------- */

	self.state = function () {
		const v = camera.view();
		return {
			beat: self.beat, bt, seen: seen.slice(), camera: v, timeScale: self.timeScale,
			clockShown: clock.shown, samples: track.length, marks: marks.slice(),
			board: board ? { rank: board.rank, total: board.total } : null,
			visors: self.visorState ? self.visorState() : null,
			feedback: self.feedback ? self.feedback() : null,
		};
	};

	self.fini = function () {
		if (ac && ac.state !== 'closed') ac.close().catch(() => {});
		ac = false;
		audio.stopAll();
	};
	stage.own(self.fini);
};

// The default look: deep purple night, magenta and violet lights, gold.
// The type every show uses: its sizes (world units) and colours. Text of any
// other size or colour snaps to these; players' colours are kept.
Showtime.TYPE = {
	font: 'Lexend',   // (Lexend Medium: only its 500 weight is loaded, so it's what every weight draws)
	sizes: [28, 40, 56, 80, 110, 160, 220],   // caption, small, body, large, heading, hero, display
	colours: {
		white: '#ffffff',
		gold: '#ffd23f',       // highlights, winners
		red: '#ff5470',        // warnings, losses
		green: '#3cdc7a',      // go, success
		dim: '#aab4cc',        // secondary lines
		ink: '#140a26',        // dark text on a light panel (and every outline)
	},
};

Showtime.THEME = {
	accent: '#ff4fd8',
	accent2: '#8a3dff',
	gold: '#ffe14d',
	ink: '#12052a',
	sky: ['#0a0320', '#2a0d4a'],
	font: 'Lexend',   // (Lexend Medium: only its 500 weight is loaded, so it's what every weight draws)
	panel: 'rgba(30,12,60,0.85)',      // the leaderboard's rows and the replay's room
	floor: 'rgba(8,2,20,0.7)',         // under the podium
	glow: 'rgba(255,79,216,0.35)',     // rising from the foot of the backdrop (rgba)
};
