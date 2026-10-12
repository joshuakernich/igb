/*
 * Show Debug: a blank game that runs the whole shared show (shared/showtime.js)
 * with nothing in the way, for stepping through the choreography quickly.
 *
 * Every beat a real game has is here, in order: the squad picker, title
 * drop, clock intro, visor check, a stand-in controls intro and villain
 * intro, the play (a bare floor; scores tick up at random), TIME!, scores,
 * rank, team, leaderboard, replay, rating and the end. The game's own beats
 * are labelled placeholders, so it's clear where a real game fills in.
 *
 * The DEBUG panel at the bottom of the left wall jumps to any beat, sets
 * the clock, shuffles the scores, fakes the visor check passing, restarts,
 * and can be tucked away. The current beat and its time show at its top.
 */
IGB.register('show-debug', function ShowDebugGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const FONT = 'Paytone One';

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	const STAND_IN = 5;           // seconds for each placeholder intro
	const SCORE_RATE = 0.8;       // average points a second per player, in play
	const PANEL = { x: 30, y: 690, w: W - 60 };   // the debug panel, along the bottom of the left wall

	/* ---------- state ---------- */

	let players = 0;
	let scores = [];
	let latest = [];
	let t = 0;

	const show = new Showtime(stage, {
		id: 'show-debug',
		seconds: GAME_SECONDS,
		players: () => players,
		scores: () => scores,
		theme: { accent: '#3ad1ff', accent2: '#5a4dff', gold: '#ffd23f', ink: '#0b1022', sky: ['#070b18', '#16203f'] },
		rivals: ['Stage Left', 'The Understudies', 'Cue Lights', 'Run Of Show', 'Places Please', 'Tech Week',
			'Final Dress', 'House Open', 'Blackout Crew', 'The Blocking'],
		farewell: 'THAT\'S THE SHOW!',
	});

	function initGame(count) {
		players = count;
		scores = Array.from({ length: count }, () => 0);
		show.go('title');
	}

	// A labelled stand-in for a game's own beat.
	function standIn(id, title, line) {
		return {
			id,
			length: STAND_IN,
			enter() { show.blackout = 0.3; },
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, title, W / 2, 430, 120, bt);
					show.text(c, line, W / 2, 570, 46, { fill: '#9fb6d8', alpha: Math.min(1, bt * 2), glow: 'transparent' });
				});
			},
		};
	}

	/* ---------- the beats ---------- */

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop({
			lines: [{ text: 'SHOW', fill: '#3ad1ff', glow: '#5a4dff' }, { text: 'DEBUG', fill: '#ffd23f', glow: '#ff7a3d' }],
			tagline: 'THE WHOLE CHOREOGRAPHY',
		}),
		show.beats.clockIntro(),
		show.beats.visors(),
		standIn('controls', 'CONTROLS INTRO', 'THE GAME TEACHES ITS MOVES HERE'),
		standIn('villain', 'VILLAIN INTRO', 'THE GAME INTRODUCES ITS THREAT HERE'),
		{
			id: 'play',
			length: Infinity,
			enter() { show.label('PLAY'); },
			update(dt) {
				t += dt;
				for (let i = 0; i < players; i++) if (Math.random() < SCORE_RATE * dt) scores[i]++;
				show.record(t, Array.from({ length: players }, (_, i) => latest[i] || null));
			},
			draw(ctx) {
				show.onWalls(ctx, function (c) {
					show.text(c, 'PLAY', W / 2, 420, 110, { alpha: 0.5 });
					show.text(c, scores.map((s, i) => show.nameOf(i) + ' ' + s).join('   '), W / 2, 540, 40, { fill: '#9fb6d8', glow: 'transparent' });
				});
			},
		},
		show.beats.timeUp(),
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

	/* ---------- the world: a bare floor, and where everyone is ---------- */

	function drawWorld(ctx) {
		art.rect(ctx, 0, 0, WIDTH, H, { fill: '#0d1428' });
		for (let wall = 0; wall < 3; wall++) {
			const x0 = wall * W;
			for (let x = 100; x < W; x += 100) art.rect(ctx, x0 + x, 0, 2, H, { fill: 'rgba(120,150,210,0.12)' });
			for (let y = 100; y < H; y += 100) art.rect(ctx, x0, y, W, 2, { fill: 'rgba(120,150,210,0.12)' });
		}
		// each player, as a ring on the wall they're nearest, across that wall
		for (let i = 0; i < players; i++) {
			const p = latest[i];
			if (!p || !p.walls) continue;
			let wall = 1;
			for (let w = 0; w < 3; w++) if (p.walls[w].dist < p.walls[wall].dist) wall = w;
			const x = wall * W + Math.max(0, Math.min(1, p.walls[wall].px)) * W;
			const y = 300 + (1 - p.walls[wall].dist) * 600;
			art.circle(ctx, x, y, 34, { fill: PLAYER_COLORS[i], alpha: 0.85 });
		}
	}

	/* ---------- the debug panel ---------- */

	const JUMPS = ['squad', 'title', 'clock', 'visors', 'controls', 'villain', 'play', 'timeup', 'scores', 'rank', 'team', 'board', 'replay', 'rate', 'end'];
	const font = `"${FONT}", sans-serif`;
	const $panel = $('<debug-panel>').css({
		display: 'block', position: 'absolute', left: PANEL.x + 'px', top: PANEL.y + 'px', width: PANEL.w + 'px',
		padding: '16px 20px', boxSizing: 'border-box', borderRadius: '22px',
		background: 'rgba(8,12,28,0.88)', border: '3px solid rgba(58,209,255,0.6)',
		fontFamily: font, color: 'white', pointerEvents: 'auto', zIndex: 20, whiteSpace: 'normal',
	}).appendTo(stage.$ui);
	const $head = $('<div>').css({ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '30px', marginBottom: '12px' }).appendTo($panel);
	$('<span>').text('DEBUG').css({ color: '#3ad1ff' }).appendTo($head);
	const $now = $('<span>').css({ flex: 1, color: '#9fb6d8', fontFamily: 'monospace', fontSize: '26px' }).appendTo($head);
	const $body = $('<div>').appendTo($panel);
	const button = (label, attrs, fn, colour = '#22305a') => $('<button>').text(label).attr(attrs).css({
		margin: '5px', padding: '10px 18px', borderRadius: '14px', border: 'none', cursor: 'pointer',
		background: colour, color: 'white', fontFamily: font, fontSize: '24px',
	}).on('click', function (e) { e.stopPropagation(); fn(); });
	button('HIDE', { toggle: '' }, function () {
		const open = $body.is(':visible');
		$body.toggle(!open);
		$head.find('[toggle]').text(open ? 'SHOW' : 'HIDE');
	}, '#3a2a5a').appendTo($head);

	const $jumps = $('<div>').appendTo($body);
	for (const id of JUMPS) button(id.toUpperCase(), { jump: id }, () => jump(id)).appendTo($jumps);
	const $acts = $('<div>').css({ marginTop: '6px' }).appendTo($body);
	button('CLOCK 1:00', { act: 'minute' }, () => show.setTimeLeft(60), '#5a3a22').appendTo($acts);
	button('CLOCK 0:15', { act: 'final' }, () => show.setTimeLeft(15), '#5a3a22').appendTo($acts);
	button('SHUFFLE SCORES', { act: 'scores' }, shuffle, '#225a3a').appendTo($acts);
	button('VISORS OK', { act: 'visors' }, () => { if (show.beat === 'visors') show.next(); }, '#225a3a').appendTo($acts);
	button('NEXT ▶', { act: 'next' }, () => show.next(), '#22305a').appendTo($acts);
	button('RESTART', { act: 'restart' }, () => $('[btn=refresh]').trigger('click'), '#5a2232').appendTo($acts);

	function shuffle() {
		scores = scores.map(() => Math.floor(Math.random() * 60));
	}

	// Jump anywhere. Past the squad, a squad is needed (three, unless one's
	// been picked); the results want scores to show.
	function jump(id) {
		$('showtime-picker').remove();
		if (id === 'squad') {
			players = 0;
			scores = [];
			show.go('squad');
			show.pickPlayers(initGame);
			return;
		}
		if (!players) initGame(3);
		if (JUMPS.indexOf(id) > JUMPS.indexOf('play') && scores.every((s) => s === 0)) shuffle();
		show.go(id);
	}

	/* ---------- the frame ---------- */

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		show.frame(ctx, dt, drawWorld);
		$now.text(`${show.beat}  ${show.bt.toFixed(1)}s  ${show.mmss(show.timeLeft())}`);
		$jumps.children().each(function () {
			$(this).css({ background: $(this).attr('jump') === show.beat ? '#3ad1ff' : '#22305a', color: $(this).attr('jump') === show.beat ? '#0b1022' : 'white' });
		});
	};

	self.setPlayers = function (p) {
		latest = p;
	};

	self.state = function () {
		return Object.assign(show.state(), { players, scores: scores.slice(), timeLeft: show.timeLeft() });
	};

	self.test = {
		jump,
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		show.fini();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
