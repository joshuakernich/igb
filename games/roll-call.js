/*
 * Roll Call
 *
 * The squad's first few minutes in the box, in Box Party's cosmic purple,
 * inside the shared show (shared/showtime.js): the squad picker, the title,
 * the clock, the visor check, a tutorial, a short intro, the play, then
 * TIME! and the show's results.
 *
 * The tutorial teaches its moves one at a time: every player's meep pops up
 * grey on the front wall right where they stand, and waving (stepping left
 * and right) wakes yours in your colour; then walking left and right to vote
 * in a zone, stepping forward and back for the yes/no question, and tapping
 * the left wall's "?" for a hint. Then the box introduces the rounds.
 *
 * The play: coloured box critters drop onto shuffled pads and everyone hunts
 * for their own colour; the first ones on score most, and confetti flies
 * when the whole squad is in. Next comes a run of light questions answered
 * with your feet: the front wall splits into two to four zones and you vote
 * by standing in one. Opinion polls stack the meeps' faces up like a bar
 * chart; trivia lights up the right zone and scores everyone in it. One
 * question a round is the box's forward/back one: step forward for yes, back
 * for no. Then (the first time round) a warm-up line-up by birthday month,
 * and a scored one: each player is dealt a number card (shown big on the
 * right wall) and the squad sorts itself, smallest on the left. Then round
 * again (find your colour, fresh questions, new cards) until TIME!. Nobody
 * can fail; it just gets everyone moving, laughing and reading the walls.
 *
 * The left wall shows the question's art, the countdown and, on trivia, a
 * "?" bubble to tap for a hint. The right wall shows the live tally (the
 * voters' faces stacking into bars) and the dealt cards. The scores are the
 * show's, in its capsules along the bottom of every wall.
 *
 * Score: finding your colour fast, trivia right, standing in the right
 * place in the line-up.
 *
 * Input: px (left / right: zones, pads and the line-up), pz (the
 * forward/back question), touches on the left wall's hint bubble.
 */
IGB.register('roll-call', function RollCallGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 300;       // (an icebreaker: a round of everything takes about two and a half minutes, so five, not ten)
	const FLOOR = 955;              // where the meeps stand on the front wall
	const MEEP_SCALE = 0.55;
	const GREY = 9;                 // a meep number with no colour: its hat draws grey
	const WAVE_DIST = 0.06;         // px a player must travel each way to wake their meep
	const WAVE_NOISE = 0.0012;      // per-tick moves smaller than this are tracker jitter
	const FIND_SECONDS = 25;        // to stand on your own colour
	const PAD_HOLD = 0.5 * FPS;     // ticks on your pad to count as in
	const PAD_WIDTH = 0.7;          // of a pad's slot
	const FIND_POINTS = [3, 2, 1];  // first in, second in, everyone else in
	const VOTE_SECONDS = 8;
	const FIRST_VOTE_SECONDS = 11;  // the first question, while they get the idea (and the forward/back one)
	const REVEAL_SECONDS = 4.5;
	const TRIVIA_POINTS = 2;
	const DEPTH_SPLIT = 0.5;        // pz under this is "forward" (yes)
	const BIRTHDAY_SECONDS = 15;
	const LINEUP_SECONDS = 15;
	const LINEUP_POINTS = 2;        // each player in the right place
	const LINEUP_BONUS = 1;         // each, when the whole line is right
	const ZONE_TOP = 280;           // the zones' top edge (under the show's clock and the headline)

	/* ---------- look ---------- */

	const BG = 'assets/box-party/bg-cosmos.jpg';
	const MOUNTAINS = 'assets/box-party/bg-mountains.png';
	const ZONE_COLORS = ['#37CCDA', '#FD797B', '#8DE968', '#FEB850'];  // Box Party's box palette
	const INK = '#2a0a6b';          // dark purple text on white cards
	const DROP = '#3a0ca3';         // the drop under white headline text
	const LILAC = '#a77bff';        // the title's colours (the manifest's), for the show's slams
	const PURPLE = '#7538D4';
	const HINT = { x: 1220, y: 650, r: 105 };   // the hint bubble, on the left wall

	const audio = stage.audio();
	audio.add('music', 'assets/box-party/music-quest.mp3', 0.12, true);
	audio.add('wake', 'sfx:wake', 0.5);
	audio.add('pop', 'sfx:pop', 0.5);
	audio.add('lock', 'sfx:lockIn', 0.5);
	audio.add('correct', 'sfx:correct', 0.45);
	audio.add('cheer', 'sfx:crowd', 0.45);
	audio.add('reveal', 'sfx:reveal', 0.45);
	audio.add('woosh', 'sfx:whoosh', 0.35);
	audio.add('tick', 'sfx:clockTick', 0.5);
	audio.add('hint', 'sfx:hint', 0.45);

	/* ---------- the questions ---------- */

	const OPINIONS = [
		{ text: 'Morning person or night owl?', art: '⏰', zones: [['🌅', 'Morning'], ['🦉', 'Night owl']] },
		{ text: 'Pineapple on pizza?', art: '🍕', zones: [['😋', 'Yes please'], ['🤢', 'No way'], ['🤷', 'Never tried']] },
		{ text: 'Pick a superpower!', art: '⚡', zones: [['🕊️', 'Flying'], ['👻', 'Invisible'], ['✨', 'Teleport'], ['⏳', 'Time travel']] },
		{ text: 'Beach or mountains?', art: '🧳', zones: [['🏖️', 'Beach'], ['🏔️', 'Mountains']] },
	];
	const TRIVIA = [
		{ text: 'How many legs does a spider have?', art: '🕷️', zones: [['', '6'], ['', '8'], ['', '10']], answer: 1, hint: 'Two more than an insect.' },
		{ text: 'Which planet is the biggest?', art: '🪐', zones: [['🌍', 'Earth'], ['🟠', 'Jupiter'], ['🔴', 'Mars']], answer: 1, hint: 'It has a storm wider than Earth.' },
		{ text: 'How many hearts does an octopus have?', art: '🐙', zones: [['', '1'], ['', '2'], ['', '3']], answer: 2, hint: 'More than you have!' },
		{ text: 'What colour is a polar bear\'s skin?', art: '🐻‍❄️', zones: [['⬜', 'White'], ['⬛', 'Black'], ['🩷', 'Pink']], answer: 1, hint: 'Dark skin soaks up the sun.' },
		{ text: 'Which was invented first?', art: '📜', zones: [['📠', 'Fax machine'], ['☎️', 'Telephone']], answer: 0, hint: 'Older than you think: before the light bulb.' },
		{ text: 'Which is bigger: a blue whale\'s heart or a small car?', art: '🐋', zones: [['❤️', 'The heart'], ['🚗', 'The car'], ['🤝', 'About the same']], answer: 2, hint: 'It\'s often compared to a bumper car.' },
	];
	const FIRST = { text: 'Cats or dogs?', art: '🐾', zones: [['🐱', 'Cats'], ['🐶', 'Dogs']] };
	const DEPTHS = [
		{ text: 'Have you been in a gamebox before?', art: '📦', zones: [['👍', 'YES'], ['👋', 'NO']], depth: true },
		{ text: 'Do you have a pet?', art: '🐕', zones: [['👍', 'YES'], ['👋', 'NO']], depth: true },
		{ text: 'Can you whistle?', art: '😗', zones: [['👍', 'YES'], ['👋', 'NO']], depth: true },
	];
	// (the tutorial's practice zones: no question, just the two sides)
	const PRACTICE_ZONES = { text: '', art: '👣', zones: [['👈', 'This side'], ['👉', 'That side']], kind: 'practice' };
	const PRACTICE_DEPTH = { text: '', art: '👣', zones: [['👍', 'YES'], ['👋', 'NO']], depth: true, kind: 'practice' };

	// The question piles, each dealt from until it runs out, then shuffled again.
	const piles = { ops: [], tri: [], depth: [] };
	function deal(pile, from) {
		if (!piles[pile].length) piles[pile] = shuffleArray(from.slice());
		return piles[pile].pop();
	}
	// The first round: opinion, trivia, the forward/back question, then
	// alternating. Each round after: a shorter run of fresh ones.
	function buildQuestions(n) {
		const list = n === 1
			? [FIRST, deal('tri', TRIVIA), deal('depth', DEPTHS), deal('ops', OPINIONS), deal('tri', TRIVIA), deal('ops', OPINIONS), deal('tri', TRIVIA)]
			: [deal('tri', TRIVIA), deal('ops', OPINIONS), deal('depth', DEPTHS), deal('tri', TRIVIA), deal('ops', OPINIONS)];
		return list.map((q) => Object.assign({
			kind: q.depth ? 'depth' : (q.answer !== undefined ? 'trivia' : 'opinion'),
		}, q));
	}

	/* ---------- state ---------- */

	let count = 0;
	const meeps = [];
	const pl = [];          // per player: position, wave progress, pad, vote, card
	let latest = [];        // the players as they arrive (for the replay)
	let popped = false;     // the meeps are up
	let phase = 'intro';    // (before the tutorial) wave, practice, between, find, found, questions, vote, reveal, birthday, birthday-done, deal, lineup, lineup-reveal
	let round = 0;
	let header = null;      // { text, sub } on the front wall
	let leftArt = '👋';     // the left wall's big picture
	let leftText = '';
	let timer = null;       // { start, s, last } for the left wall's countdown
	let pads = [];
	let foundCount = 0;
	let questions = [];
	let qIndex = -1;
	let question = null;
	let hintShown = false;
	let lineupCorrect = [];
	let perfectLine = false;
	let completed = false;
	let tick = 0;
	let t = 0;              // the game's own time (seconds), stepped by the show's frames: it stops when the show is paused
	let acc = 0;
	const pending = [];     // { at, fn }: things to do later, on the game's time
	const confetti = [];
	const rings = [];

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'roll-call',
		seconds: GAME_SECONDS,
		players: () => count,
		scores: () => meeps.map((m) => m.score),
		theme: { accent: LILAC, accent2: PURPLE, gold: '#FEE955', ink: INK, sky: ['#12052e', '#3a0ca3'] },
		rivals: ['The New Kids', 'Name Tags', 'Hello My Name Is', 'First Day Crew', 'Ice Breakers', 'The Wavers',
			'Line Up Legends', 'Cats Not Dogs', 'Night Owls', 'Pineapple Party', 'The Roll Callers', 'Fresh Faces'],
	});

	function initGame(n) {
		count = n;
		for (let i = 0; i < count; i++) {
			const meep = new Meep(i);
			meep.n = GREY;
			meep.scale = 0;
			meep.x = W + (i + 0.5) / count * W;
			meep.y = FLOOR;
			meeps.push(meep);
			pl.push({ px: (i + 0.5) / count, pz: 0.5, lastPx: null, vx: 0, left: 0, right: 0, woke: false, found: false, hold: 0, vote: -1, card: 0, hop: 0, flip: 0, sides: [false, false] });
		}
		show.go('title');
	}

	// The meeps pop up, grey, one after another, right where everyone stands.
	function popMeeps() {
		if (popped) return;
		popped = true;
		meeps.forEach((meep, i) => {
			$(meep).delay(200 + i * 150).animate({ scale: MEEP_SCALE * 1.2 }, 180).animate({ scale: MEEP_SCALE }, 140);
			later(0.2 + i * 0.15, () => audio.play('pop', true));
		});
	}

	/* ---------- the tutorial ---------- */

	// The moves, one at a time, each caption slammed over every wall. A step
	// moves on once everyone has done it (and it has had its minimum time),
	// or when its time runs out.
	const TUTORIAL_NICE = 1.2;   // seconds a done step shows (its caption green, NICE!) before the next
	const TUTORIAL = [
		{ id: 'wave', caption: 'WAVE TO WAKE YOUR MEEP', min: 2, max: 20, did: () => pl.every((d) => d.woke) },
		{ id: 'zone', caption: 'WALK LEFT AND RIGHT TO VOTE', min: 2.5, max: 12, did: () => pl.every((d) => d.sides[0] && d.sides[1]) },
		{ id: 'depth', caption: 'STEP FORWARD FOR YES, BACK FOR NO', min: 2.5, max: 12, did: () => pl.every((d) => d.sides[0] && d.sides[1]) },
		{ id: 'tap', caption: 'TAP THE ? FOR A HINT', min: 1.5, max: 10, did: () => hintShown },
	];
	const tut = { i: 0, age: 0, done: false, doneAge: 0, passed: [] };   // (passed: the steps the players did, not timed out of)

	function tutStep(i) {
		// (leaving the wave: anyone still grey is woken anyway)
		if (TUTORIAL[tut.i] && TUTORIAL[tut.i].id === 'wave' && i !== tut.i) wakeAll();
		Object.assign(tut, { i, age: 0, done: false, doneAge: 0 });
		for (const d of pl) { d.sides = [false, false]; d.vote = -1; }
		const step = TUTORIAL[i];
		question = null;
		hintShown = false;
		header = null;
		if (!step) return;
		show.fx('stepIn');
		if (step.id === 'wave') {
			phase = 'wave';
			leftArt = '👋';
			leftText = 'Which one is you?';
		} else if (step.id === 'zone') {
			phase = 'vote';
			question = PRACTICE_ZONES;
			leftArt = '👣';
			leftText = 'Your feet are your vote';
		} else if (step.id === 'depth') {
			phase = 'vote';
			question = PRACTICE_DEPTH;
			leftArt = '👣';
			leftText = 'Forward is yes, back is no';
		} else if (step.id === 'tap') {
			phase = 'practice';
			leftArt = '💡';
			leftText = '';
		}
	}

	function stepTutorial(dt) {
		const step = TUTORIAL[tut.i];
		if (!step) return;
		tut.age += dt;
		if (!tut.done && tut.age >= step.min && step.did()) {
			tut.done = true;
			tut.passed.push(step.id);
			show.fx('nice');
			pl.forEach((d, i) => hop(i));
		}
		if (tut.done) tut.doneAge += dt;
		if ((tut.done && tut.doneAge >= TUTORIAL_NICE) || tut.age >= step.max) tutStep(tut.i + 1);
	}

	// Done with the tutorial (or skipped past it): everyone awake, nothing left of it.
	function finishTutorial() {
		tut.i = TUTORIAL.length;
		popMeeps();
		wakeAll(true);
		question = null;
		hintShown = false;
		header = null;
		phase = 'between';
		for (const d of pl) d.vote = -1;
	}

	/* ---------- the intro: the box introduces the rounds ---------- */

	const INTRO = { name: 0.3, lines: [1.3, 1.9, 2.5], out: 3.6, go: 3.9, length: 5.2 };   // when the name slams in, each line after it, when they go and LET'S GO! lands, and the end
	const INTRO_LINES = ['FIND YOUR COLOUR', 'ANSWER WITH YOUR FEET', 'LINE UP IN ORDER'];

	/* ---------- the play ---------- */

	// A round: find your colour, the questions, (the first time) the
	// birthday line-up, then the numbered line-up; then the next round.
	function startRound(n) {
		round = n;
		questions = buildQuestions(n);
		qIndex = -1;
		show.label('ROUND ' + n);
		startFind();
	}

	function wake(i, quiet) {
		const d = pl[i];
		if (d.woke) return;
		d.woke = true;
		meeps[i].n = i;
		if (quiet) return;
		hop(i);
		ring(meeps[i].x, meeps[i].y - 100, PLAYER_COLORS[i]);
		burst(meeps[i].x, meeps[i].y - 150, 25, [PLAYER_COLORS[i], 'white']);
		audio.play('wake', true);
	}

	function wakeAll(quiet) {
		pl.forEach((d, i) => wake(i, quiet));
	}

	// Pads in shuffled slots: of a few shuffles, keep the one that puts the
	// fewest pads under their own players already.
	function startFind() {
		phase = 'find';
		header = { text: 'Find your colour!', sub: 'Stand on your own box' };
		leftArt = '🎨';
		leftText = 'Stand on your colour';
		foundCount = 0;
		for (const d of pl) { d.found = false; d.hold = 0; }
		audio.play('woosh', true);
		const slots = [];
		for (let s = 0; s < count; s++) slots.push((s + 0.5) / count);
		let best = null;
		let bestCost = Infinity;
		for (let tries = 0; tries < 30; tries++) {
			const order = shuffleArray(slots.slice());
			let cost = 0;
			order.forEach((px, i) => { cost += Math.max(0, 0.3 - Math.abs(px - pl[i].px)); });
			if (cost < bestCost) { bestCost = cost; best = order; }
		}
		pads = best.map((px, i) => ({ n: i, px, half: PAD_WIDTH / count / 2, s: 0, happy: 0 }));
		pads.forEach((pad, i) => {
			$(pad).delay(i * 120).animate({ s: 1.15 }, 220).animate({ s: 1 }, 160);
			later(i * 0.12, () => audio.play('pop', true));
		});
		startTimer(FIND_SECONDS, finiFind);
	}

	function found(i) {
		const d = pl[i];
		d.found = true;
		const points = FIND_POINTS[Math.min(foundCount, FIND_POINTS.length - 1)];
		foundCount++;
		score(i, points);
		hop(i);
		const pad = pads[i];
		$(pad).animate({ happy: 1 }, 200);
		burst(W + pad.px * W, FLOOR - 40, 30, [PLAYER_COLORS[i], 'white', '#FEE955']);
		audio.play('correct', true);
		if (pl.every((p) => p.found)) finiFind();
	}

	function finiFind() {
		if (phase !== 'find') return;
		phase = 'found';
		stopTimer();
		const all = pl.every((p) => p.found);
		header = { text: all ? 'Everyone\'s in!' : 'Nearly!', sub: '' };
		if (all) show.mark(t);
		for (let k = 0; k < 6; k++) later(k * 0.18, () => burst(W + Math.random() * W, 200 + Math.random() * 300, 50));
		audio.play('cheer', true);
		later(2.6, () => { pads = []; startQuestions(); });
	}

	function startQuestions() {
		phase = 'questions';
		header = { text: 'Stand to answer!', sub: 'Your feet are your vote' };
		audio.play('woosh', true);
		later(1.8, nextQuestion);
	}

	function nextQuestion() {
		qIndex++;
		if (qIndex >= questions.length) {
			question = null;
			if (round === 1) startBirthday();
			else startDeal();
			return;
		}
		question = questions[qIndex];
		hintShown = false;
		phase = 'vote';
		header = { text: question.text, sub: question.depth ? 'The forward / back question!' : '' };
		leftArt = question.art;
		leftText = question.text;
		audio.play('woosh', true);
		for (const d of pl) d.vote = -1;
		startTimer(question.depth || (round === 1 && qIndex === 0) ? FIRST_VOTE_SECONDS : VOTE_SECONDS, lockVotes);
	}

	function lockVotes() {
		if (phase !== 'vote') return;
		phase = 'reveal';
		stopTimer();
		audio.play('lock', true);
		pl.forEach((d, i) => {
			d.vote = voteOf(d);
			ring(meeps[i].x, meeps[i].y - 100 * meeps[i].scale / MEEP_SCALE, PLAYER_COLORS[i]);
			hop(i);
		});
		const q = question;
		if (q.kind === 'trivia') {
			later(0.8, () => {
				const a = q.answer;
				const zx = W + (a + 0.5) / q.zones.length * W;
				burst(zx, 450, 60);
				audio.play('reveal', true);
				pl.forEach((d, i) => { if (d.vote === a) score(i, TRIVIA_POINTS); });
				q.revealed = true;
			});
		} else {
			q.revealed = true;
			audio.play('reveal', true);
		}
		later(REVEAL_SECONDS, nextQuestion);
	}

	// A warm-up line-up: no score, just shuffling about and chatting.
	function startBirthday() {
		phase = 'birthday';
		header = { text: 'Line up by birthday month!', sub: 'January on the left' };
		leftArt = '🎂';
		leftText = 'Talk to each other!';
		audio.play('woosh', true);
		startTimer(BIRTHDAY_SECONDS, () => {
			phase = 'birthday-done';
			header = { text: 'Happy birthday, whoever\'s next!', sub: '' };
			for (let k = 0; k < 4; k++) later(k * 0.15, () => burst(W + Math.random() * W, 250, 40));
			audio.play('cheer', true);
			later(2.6, startDeal);
		});
	}

	// Each player gets a different number from 1 to 99, shown on the right wall.
	function startDeal() {
		phase = 'deal';
		header = { text: 'Here\'s your number!', sub: 'Look at the right wall' };
		leftArt = '🃏';
		leftText = 'Smallest on the left!';
		lineupCorrect = [];
		perfectLine = false;
		const nums = shuffleArray(Array.from({ length: 99 }, (_, k) => k + 1)).slice(0, count);
		pl.forEach((d, i) => {
			d.card = nums[i];
			d.flip = 0;
			d.shown = false;
			later(i * 0.2, () => { $(d).animate({ flip: 1 }, 350); audio.play('pop', true); });
		});
		later(1.5 + count * 0.2, () => {
			phase = 'lineup';
			header = { text: 'Line up by number!', sub: 'Smallest on the left' };
			startTimer(LINEUP_SECONDS, revealLineup);
		});
	}

	function revealLineup() {
		phase = 'lineup-reveal';
		stopTimer();
		audio.play('lock', true);
		const byPos = pl.map((d, i) => i).sort((a, b) => pl[a].px - pl[b].px);
		const byCard = pl.map((d, i) => i).sort((a, b) => pl[a].card - pl[b].card);
		lineupCorrect = pl.map((d, i) => byPos.indexOf(i) === byCard.indexOf(i));
		perfectLine = lineupCorrect.every(Boolean);
		header = { text: perfectLine ? 'Perfect line!' : 'Let\'s see…', sub: '' };
		byPos.forEach((i, k) => {
			later(0.4 + k * 0.45, () => {
				audio.play('pop', true);
				pl[i].shown = true;
				if (lineupCorrect[i]) {
					score(i, LINEUP_POINTS);
					burst(meeps[i].x, meeps[i].y - 300, 20, [PLAYER_COLORS[i], 'white']);
				}
			});
		});
		const end = 0.4 + count * 0.45;
		later(end, () => {
			if (perfectLine) {
				pl.forEach((d, i) => score(i, LINEUP_BONUS));
				show.mark(t);
				for (let k = 0; k < 6; k++) later(k * 0.15, () => burst(W + Math.random() * W, 200 + Math.random() * 300, 50));
				audio.play('cheer', true);
			} else {
				header = { text: 'Nice try!', sub: '' };
			}
		});
		later(end + 3, nextRound);
	}

	// Round again (until the clock calls TIME!): the cards put away, a fresh
	// round of everything.
	function nextRound() {
		phase = 'between';
		for (const d of pl) { d.shown = false; d.card = 0; }
		lineupCorrect = [];
		header = { text: 'Round ' + (round + 1) + '!', sub: 'Shuffle up!' };
		leftArt = '🔁';
		leftText = '';
		show.fx('roundStart');
		later(2, () => startRound(round + 1));
	}

	/* ---------- helpers ---------- */

	function score(i, points) {
		meeps[i].score += points;
		meeps[i].doScore(points);
	}

	function hop(i) {
		$(pl[i]).stop(true).animate({ hop: -70 }, 140).animate({ hop: 0 }, 220);
	}

	// Later, on the game's time (so a pause holds it).
	function later(seconds, fn) {
		pending.push({ at: t + seconds, fn });
	}

	function startTimer(seconds, fn) {
		timer = { start: t, s: seconds, last: Math.ceil(seconds) };
		const tm = timer;
		later(seconds, () => { if (timer === tm) fn(); });
	}

	function stopTimer() {
		timer = null;
	}

	function timeLeft() {
		return timer ? Math.max(0, timer.s - (t - timer.start)) : 0;
	}

	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

	function voteOf(d) {
		if (!question) return -1;
		if (question.depth) return d.pz < DEPTH_SPLIT ? 0 : 1;
		const n = question.zones.length;
		return clamp(Math.floor(d.px * n), 0, n - 1);
	}

	function tally() {
		if (!question) return [];
		const tl = question.zones.map(() => []);
		pl.forEach((d, i) => { if (d.vote >= 0) tl[d.vote].push(i); });
		return tl;
	}

	function burst(x, y, n, colors) {
		colors = colors || ZONE_COLORS.concat(['#FEE955', 'white']);
		for (let k = 0; k < n; k++) {
			const a = Math.random() * TAU;
			const v = 4 + Math.random() * 12;
			confetti.push({
				x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8,
				rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4,
				w: 12 + Math.random() * 14, h: 8 + Math.random() * 8,
				color: colors[k % colors.length], life: 1,
			});
		}
	}

	function ring(x, y, color) {
		rings.push({ x, y, color, life: 1 });
	}

	// Break str into lines no wider than maxW at this font.
	function wrap(ctx, str, maxW, size, font) {
		ctx.save();
		ctx.font = `600 ${size}px "${font || 'Rubik'}", sans-serif`;
		const words = String(str).split(' ');
		const lines = [];
		let line = '';
		for (const w of words) {
			const tryLine = line ? line + ' ' + w : w;
			if (line && ctx.measureText(tryLine).width > maxW) {
				lines.push(line);
				line = w;
			} else line = tryLine;
		}
		if (line) lines.push(line);
		ctx.restore();
		return lines.join('\n');
	}

	/* ---------- every tick ---------- */

	// The game's world runs at its own fixed 50 ticks a second, on the
	// show's frames (dt): stopped while paused, slowed through TIME!.
	function run(dt) {
		acc += dt;
		while (acc >= 1 / FPS) {
			acc -= 1 / FPS;
			t += 1 / FPS;
			for (const p of pending.slice()) {
				if (p.at > t) continue;
				pending.splice(pending.indexOf(p), 1);
				p.fn();
			}
			step();
		}
	}

	function step() {
		tick++;
		const practising = show.beat === 'controls' && TUTORIAL[tut.i];
		for (let i = 0; i < count; i++) {
			const d = pl[i];
			const m = meeps[i];
			if (d.lastPx === null) d.lastPx = d.px;
			const dx = d.px - d.lastPx;
			d.lastPx = d.px;
			d.vx = lerp(d.vx, dx, 0.3);

			if (phase === 'wave' && !d.woke) {
				if (dx > WAVE_NOISE) d.right += dx;
				else if (dx < -WAVE_NOISE) d.left -= dx;
				if (d.right >= WAVE_DIST && d.left >= WAVE_DIST) wake(i);
			}

			if (phase === 'find' && !d.found && pads[i]) {
				const on = Math.abs(d.px - pads[i].px) < pads[i].half;
				d.hold = on ? d.hold + 1 : 0;
				if (d.hold >= PAD_HOLD) found(i);
			}

			if (phase === 'vote') d.vote = voteOf(d);
			// (the tutorial's zones: who has stood on both sides)
			if (practising && question && d.vote >= 0) d.sides[d.vote] = true;

			// Place the meep: on the depth question, nearer the wall is lower and bigger.
			m.x = W + d.px * W;
			const isDepth = question && question.depth && (phase === 'vote' || phase === 'reveal');
			const depthT = isDepth ? clamp(d.pz, 0, 1) : 0;
			m.y = (isDepth ? lerp(FLOOR + 20, 590, depthT) : FLOOR) + d.hop;
			if (m.scale > 0 && !$.queue(m, 'fx').length) m.scale = isDepth ? lerp(0.62, 0.36, depthT) : MEEP_SCALE;
			m.rotate = clamp(d.vx * 900, -12, 12);

			// Grey meeps wave; woken ones rest their hands.
			const waving = phase === 'wave' && !d.woke;
			m.handRight.y = waving ? 40 + Math.sin(tick * 0.3 + i) * 25 : null;
			m.handRight.x = waving ? 95 : null;
		}

		// The countdown ticks through its last three seconds.
		if (timer) {
			const left = Math.ceil(timeLeft());
			if (left < timer.last) {
				timer.last = left;
				if (left > 0 && left <= 3) audio.play('tick', true);
			}
		}

		for (const c of confetti) {
			c.x += c.vx; c.y += c.vy; c.vy += 0.4; c.vx *= 0.98; c.rot += c.vr;
			c.life -= 0.008;
		}
		for (let k = confetti.length - 1; k >= 0; k--) if (confetti[k].life <= 0 || confetti[k].y > H + 50) confetti.splice(k, 1);
		for (const r of rings) r.life -= 0.035;
		for (let k = rings.length - 1; k >= 0; k--) if (rings[k].life <= 0) rings.splice(k, 1);
	}

	/* ---------- drawing ---------- */

	function drawBackground(ctx) {
		art.cover(ctx, BG, 0, 0, IGB.WIDTH, H);
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: art.linear(ctx, 0, 0, 0, H, [[0, 'rgba(0,0,0,0.6)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(40,0,160,0.4)']]) });
		art.image(ctx, MOUNTAINS, 0, 0, IGB.WIDTH, IGB.WIDTH * 520 / 2500 * 1000 / 998);
		// Hairlines where the walls meet.
		art.rect(ctx, W - 1, 0, 2, H, { fill: 'rgba(255,255,255,0.5)' });
		art.rect(ctx, 2 * W - 1, 0, 2, H, { fill: 'rgba(255,255,255,0.5)' });
	}

	// The front wall's headline, in the HUD's white-with-a-drop look (under
	// the show's clock; the countdown itself is on the left wall).
	function drawHeader(ctx) {
		if (!header) return;
		const text = wrap(ctx, header.text, W - 160, 68, 'Paytone One');
		const lines = text.split('\n').length;
		art.text(ctx, text, W + W / 2, 150 + (lines - 1) * 36, { size: 68, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 8 });
		if (header.sub) art.text(ctx, header.sub, W + W / 2, 225 + (lines - 1) * 72, { size: 42, weight: 600, fill: '#FEE955', drop: DROP, dropY: 4 });
	}

	// A box critter, Box Party style: coloured, white-edged, with eyes.
	function drawCritter(ctx, x, y, size, color, happy) {
		art.roundRect(ctx, x - size / 2, y - size / 2, size, size, size * 0.12, {
			fill: color, shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 12 },
		});
		art.border(ctx, x - size / 2, y - size / 2, size, size, size * 0.12, size * 0.05, { fill: 'white' });
		const ey = y - size * 0.1 - happy * size * 0.05;
		for (const s of [-1, 1]) {
			art.with(ctx, { x: x + s * size * 0.22, y: ey, rotate: s * 12 }, () => {
				ctx.beginPath();
				ctx.ellipse(0, 0, size * 0.09, size * 0.07, 0, 0, Math.PI);
				ctx.fillStyle = 'white';
				ctx.fill();
			});
		}
		const mw = size * (0.08 + happy * 0.2);
		art.roundRect(ctx, x - mw / 2, y + size * 0.15, mw, size * (0.06 + happy * 0.12), [0, 0, mw / 2, mw / 2], { fill: 'white' });
	}

	function drawPads(ctx) {
		for (const pad of pads) {
			if (pad.s <= 0) continue;
			const x = W + pad.px * W;
			const hw = pad.half * W;
			const color = PLAYER_COLORS[pad.n];
			const d = pl[pad.n];
			art.with(ctx, { x, y: FLOOR, scale: pad.s }, () => {
				// A beam from the critter down to its pad.
				art.poly(ctx, [[-60, -420], [60, -420], [hw, 0], [-hw, 0]], { fill: art.linear(ctx, 0, -420, 0, 0, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.25)']]) });
				art.roundRect(ctx, -hw, -22, hw * 2, 44, 22, { fill: color, shadow: { color, blur: 30 } });
				art.roundRect(ctx, -hw + 10, -14, hw * 2 - 20, 14, 7, { fill: 'rgba(255,255,255,0.45)' });
				if (!d.found && d.hold > 0) {
					art.roundRect(ctx, -hw, 26, hw * 2 * d.hold / PAD_HOLD, 10, 5, { fill: 'white' });
				}
			});
			const bob = Math.sin(tick * 0.08 + pad.n) * 12;
			drawCritter(ctx, x, FLOOR - 470 + bob - pad.happy * 30, 150 * pad.s, color, pad.happy);
			if (d.found) art.text(ctx, '✓', x, FLOOR - 600 - pad.happy * 30, { size: 80, weight: 800, fill: 'white', drop: DROP, dropY: 5 });
		}
	}

	function drawZones(ctx) {
		const q = question;
		if (!q) return;
		const tl = tally();
		if (q.depth) return drawDepthZones(ctx, tl);
		const n = q.zones.length;
		const zw = W / n;
		const top = ZONE_TOP;
		for (let z = 0; z < n; z++) {
			const x0 = W + z * zw;
			const color = ZONE_COLORS[z];
			const isRight = q.kind === 'trivia' && q.revealed && z === q.answer;
			const isWrong = q.kind === 'trivia' && q.revealed && z !== q.answer;
			const occupied = tl[z].length > 0;
			art.roundRect(ctx, x0 + 12, top, zw - 24, H - top + 30, 30, {
				fill: color, alpha: isRight ? 0.55 : isWrong ? 0.08 : occupied ? 0.3 : 0.16,
			});
			art.border(ctx, x0 + 12, top, zw - 24, H - top + 30, 30, 6, { fill: color, alpha: isWrong ? 0.3 : 0.9 });
			// The label card.
			const [emoji, label] = q.zones[z];
			const cw = Math.min(zw - 60, 460);
			art.roundRect(ctx, x0 + zw / 2 - cw / 2, top + 20, cw, 170, 26, { fill: 'white', alpha: isWrong ? 0.6 : 1, shadow: { color: 'rgba(0,0,0,0.3)', blur: 16, y: 8 } });
			art.roundRect(ctx, x0 + zw / 2 - cw / 2, top + 20, cw, 18, [26, 26, 0, 0], { fill: color });
			if (emoji) {
				art.text(ctx, emoji, x0 + zw / 2, top + 88, { size: 70 });
				art.text(ctx, label, x0 + zw / 2, top + 152, { size: n > 3 ? 40 : 48, weight: 700, fill: INK });
			} else {
				art.text(ctx, label, x0 + zw / 2, top + 112, { size: 110, font: 'Paytone One', weight: 400, fill: INK });
			}
			// The voters' faces stack up like a bar chart.
			drawStack(ctx, tl[z], x0 + zw / 2, 760, color);
			if (isRight) {
				art.circle(ctx, x0 + zw / 2, top + 260, 70, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.3)', blur: 16, y: 6 } });
				art.text(ctx, '✓', x0 + zw / 2, top + 264, { size: 100, weight: 800, fill: '#2bb24c' });
			}
		}
	}

	function drawStack(ctx, voters, x, base, color) {
		if (!voters.length) return;
		const step = 62;
		const s = 0.6;
		const h = voters.length * step + 40;
		art.roundRect(ctx, x - 55, base - h, 110, h, 20, { fill: color, alpha: 0.85 });
		voters.forEach((i, k) => Meep.drawHead(ctx, i, x - 50 * s, base - 20 - (k + 1) * step - 28, s));
	}

	// The forward/back question: the band nearest the wall is YES, the far one NO.
	function drawDepthZones(ctx, tl) {
		const q = question;
		const split = lerp(FLOOR + 20, 590, DEPTH_SPLIT);
		const bands = [[split, H], [ZONE_TOP, split]];
		bands.forEach(([y0, y1], z) => {
			const color = z === 0 ? '#8DE968' : '#FD797B';
			art.rect(ctx, W, y0, W, y1 - y0, { fill: color, alpha: tl[z].length ? 0.3 : 0.16 });
			art.rect(ctx, W, z === 0 ? y0 - 3 : y1 - 3, W, 6, { fill: color, alpha: 0.9 });
			const ly = (y0 + y1) / 2;
			art.text(ctx, q.zones[z][1], W + 170, ly - 20, { size: 110, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 7 });
			art.text(ctx, z === 0 ? '▼ step forward' : '▲ step back', W + 170, ly + 60, { size: 40, weight: 700, fill: color, drop: DROP, dropY: 3 });
			// Faces line up along the band's right end.
			tl[z].forEach((i, k) => Meep.drawHead(ctx, i, W + W - 120 - k * 70, ly - 45, 0.6));
		});
	}

	function drawBirthday(ctx) {
		const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
		const y = 380;
		art.roundRect(ctx, W + 40, y - 50, W - 80, 100, 50, { fill: 'white', alpha: 0.9 });
		months.forEach((mo, k) => {
			const x = W + 40 + (k + 0.5) / 12 * (W - 80);
			art.text(ctx, mo, x, y, { size: 38, weight: 700, fill: ZONE_COLORS[k % 4] === '#FEB850' ? '#e08a00' : INK });
		});
		art.text(ctx, '🎂', W + W / 2, 570, { size: 140 });
	}

	// Number cards above the meeps, flipped over at the line-up's reveal.
	function drawMeepCards(ctx) {
		pl.forEach((d, i) => {
			if (!d.shown) return;
			const m = meeps[i];
			const x = m.x;
			const y = m.y - 330;
			art.roundRect(ctx, x - 70, y - 60, 140, 120, 18, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.3)', blur: 12, y: 6 } });
			art.roundRect(ctx, x - 70, y - 60, 140, 16, [18, 18, 0, 0], { fill: PLAYER_COLORS[i] });
			art.text(ctx, d.card, x, y + 8, { size: 70, font: 'Paytone One', weight: 400, fill: INK });
			if (lineupCorrect[i]) {
				art.circle(ctx, x + 70, y - 60, 30, { fill: '#2bb24c' });
				art.text(ctx, '✓', x + 70, y - 58, { size: 40, weight: 800, fill: 'white' });
			}
		});
	}

	// Grey meeps glow a ring at their feet, so each player spots theirs.
	function drawFeetRings(ctx) {
		pl.forEach((d, i) => {
			if (d.woke || meeps[i].scale <= 0) return;
			const pulse = 0.5 + 0.5 * Math.sin(tick * 0.15 + i);
			art.ellipse(ctx, meeps[i].x, FLOOR, 80 + pulse * 20, 22 + pulse * 5, { stroke: 'white', lineWidth: 5, alpha: 0.4 + pulse * 0.4 });
			art.text(ctx, '?', meeps[i].x, FLOOR - 250 - pulse * 10, { size: 70, font: 'Paytone One', weight: 400, fill: 'white', alpha: 0.8 });
		});
	}

	// The hint bubble is up on trivia, and in the tutorial's tap step.
	function hintUp() {
		if (show.beat === 'controls') return !!TUTORIAL[tut.i] && TUTORIAL[tut.i].id === 'tap';
		return show.beat === 'play' && !!question && question.kind === 'trivia' && (phase === 'vote' || phase === 'reveal');
	}

	function drawLeftWall(ctx) {
		// The question's art in a big badge.
		art.circle(ctx, 520, 360, 250, { fill: 'rgba(255,255,255,0.14)' });
		art.circle(ctx, 520, 360, 215, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.35)', blur: 30, y: 14 } });
		art.text(ctx, leftArt, 520, 375, { size: 220 });

		// The countdown ring.
		if (timer) {
			const left = timeLeft();
			const f = left / timer.s;
			const cx = 1220;
			const cy = 300;
			art.circle(ctx, cx, cy, 160, { fill: INK, alpha: 0.85 });
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, 140, -Math.PI / 2, -Math.PI / 2 + TAU * f);
			ctx.strokeStyle = f < 0.3 ? '#FD797B' : '#FEE955';
			ctx.lineWidth = 24;
			ctx.lineCap = 'round';
			ctx.stroke();
			ctx.restore();
			art.text(ctx, Math.ceil(left), cx, cy + 8, { size: 140, font: 'Paytone One', weight: 400, fill: 'white' });
		}

		// The hint bubble: tap it.
		if (hintUp()) {
			if (!hintShown) {
				const pulse = 1 + 0.06 * Math.sin(tick * 0.12);
				art.with(ctx, { x: HINT.x, y: HINT.y, scale: pulse }, () => {
					art.circle(ctx, 0, 0, HINT.r, { fill: '#FEE955', shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 10 } });
					art.poly(ctx, [[-60, 70], [-20, 95], [-95, 125]], { fill: '#FEE955' });
					art.text(ctx, '?', 0, 8, { size: 150, font: 'Paytone One', weight: 400, fill: INK });
				});
				art.text(ctx, 'tap for a hint', HINT.x, HINT.y + 150, { size: 36, weight: 700, fill: 'white', drop: DROP, dropY: 3 });
			} else {
				const text = wrap(ctx, question ? question.hint : 'Trivia questions have hints!', 560, 46);
				art.roundRect(ctx, HINT.x - 320, HINT.y - 120, 640, 240, 40, { fill: '#FEE955', shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 10 } });
				art.text(ctx, text, HINT.x, HINT.y, { size: 46, weight: 700, fill: INK });
			}
		}

		if (leftText && !(question && question.kind === 'trivia')) {
			const text = wrap(ctx, leftText, 1300, 64, 'Paytone One');
			art.text(ctx, text, 800, 800, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
		}
	}

	// The right wall: the live tally, the dealt cards, or the roll call
	// itself (each player's face, and whether they're awake / in). The
	// scores are the show's capsules, along the bottom.
	function drawRightWall(ctx) {
		const x0 = 2 * W;
		const isCards = phase === 'deal' || phase === 'lineup' || phase === 'lineup-reveal';
		if (question && question.kind !== 'practice' && (phase === 'vote' || phase === 'reveal')) {
			art.text(ctx, phase === 'vote' ? 'Live votes' : 'Votes are in!', x0 + W / 2, 160, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
			const tl = tally();
			const n = tl.length;
			const cw = Math.min(320, (W - 160) / n);
			tl.forEach((voters, z) => {
				const cx = x0 + W / 2 + (z - (n - 1) / 2) * (cw + 30);
				const color = question.depth ? (z === 0 ? '#8DE968' : '#FD797B') : ZONE_COLORS[z];
				art.roundRect(ctx, cx - cw / 2, 230, cw, 470, 24, { fill: 'rgba(255,255,255,0.1)' });
				const h = voters.length * 70;
				if (h) art.roundRect(ctx, cx - cw / 2 + 20, 670 - h - 20, cw - 40, h + 20, 20, { fill: color });
				voters.forEach((i, k) => Meep.drawHead(ctx, i, cx - 33, 670 - (k + 1) * 70 - 22, 0.66));
				const [emoji, label] = question.zones[z];
				art.text(ctx, (emoji ? emoji + ' ' : '') + label, cx, 740, { size: n > 3 ? 32 : 40, weight: 700, fill: 'white', drop: DROP, dropY: 3 });
			});
		} else if (isCards) {
			art.text(ctx, 'Your numbers', x0 + W / 2, 160, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
			const cw = Math.min(230, (W - 100) / count - 20);
			pl.forEach((d, i) => {
				const cx = x0 + W / 2 + (i - (count - 1) / 2) * (cw + 20);
				const sx = Math.abs(Math.cos(d.flip * Math.PI));
				const faceUp = d.flip > 0.5;
				art.with(ctx, { x: cx, y: 480 }, () => {
					ctx.scale(Math.max(0.02, sx), 1);
					art.roundRect(ctx, -cw / 2, -220, cw, 440, 26, { fill: faceUp ? 'white' : PLAYER_COLORS[i], shadow: { color: 'rgba(0,0,0,0.35)', blur: 18, y: 10 } });
					art.border(ctx, -cw / 2, -220, cw, 440, 26, 8, { fill: faceUp ? PLAYER_COLORS[i] : 'white' });
					if (faceUp) {
						Meep.drawHead(ctx, i, -50 * 0.8, -200, 0.8);
						art.text(ctx, d.card, 0, 90, { size: cw > 180 ? 170 : 130, font: 'Paytone One', weight: 400, fill: INK });
					} else {
						art.text(ctx, '?', 0, 10, { size: 160, font: 'Paytone One', weight: 400, fill: 'white' });
					}
				});
			});
		} else {
			art.text(ctx, 'Roll call', x0 + W / 2, 170, { size: 90, font: 'Knewave', weight: 400, fill: 'white', drop: DROP, dropY: 8 });
			const cw = Math.min(220, (W - 100) / Math.max(1, count) - 20);
			pl.forEach((d, i) => {
				const cx = x0 + W / 2 + (i - (count - 1) / 2) * (cw + 20);
				art.roundRect(ctx, cx - cw / 2, 280, cw, 330, 30, { fill: 'rgba(255,255,255,0.12)' });
				Meep.drawHead(ctx, d.woke ? i : GREY, cx - 60, 320, 1.2);
				const mark = phase === 'find' || phase === 'found' ? (d.found ? '✓' : '…') : (d.woke ? '👋' : '…');
				art.text(ctx, mark, cx, 550, { size: 60, weight: 800, fill: 'white' });
			});
		}
	}

	// The game's world, under the show: the cosmos always; the walls'
	// activities and the meeps from the tutorial on.
	const LIVE = ['controls', 'meet', 'play', 'timeup'];
	function drawWorld(ctx) {
		drawBackground(ctx);
		if (LIVE.indexOf(show.beat) < 0 || !count) return;
		drawLeftWall(ctx);
		drawRightWall(ctx);

		ctx.save();
		ctx.beginPath();
		ctx.rect(W, 0, W, H);
		ctx.clip();
		if (phase === 'birthday') drawBirthday(ctx);
		drawZones(ctx);
		drawPads(ctx);
		drawFeetRings(ctx);
		const order = meeps.map((m, i) => i).sort((a, b) => meeps[a].y - meeps[b].y);
		for (const i of order) meeps[i].draw(ctx);
		drawMeepCards(ctx);
		if (show.beat === 'play') drawHeader(ctx);
		ctx.restore();

		for (const r of rings) {
			art.circle(ctx, r.x, r.y, 60 + (1 - r.life) * 160, { stroke: r.color, lineWidth: 12 * r.life, alpha: r.life });
		}
		for (const c of confetti) {
			art.with(ctx, { x: c.x, y: c.y, rotate: c.rot * 180 / Math.PI }, () => {
				art.rect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, { fill: c.color, alpha: Math.min(1, c.life * 2) });
			});
		}
	}

	/* ---------- the beats ---------- */

	// The running order. Each beat has its length and its own update and
	// draw; the generic ones come from shared/showtime.js.
	show.sequence([
		// 1. how many players, over the dimmed cosmos
		{
			id: 'squad',
			length: Infinity,
			update() { show.blackout = 0.45; },
		},

		// 1b. the title, crashing in letter by letter
		show.beats.titleDrop({
			// (its lines: the manifest's title, shared with the end screen's carousel)
		}),

		// 2. the clock (five minutes: see GAME_SECONDS), slamming in out of
		// the dark; it starts counting a moment after it lands, and runs
		// through everything after
		show.beats.clockIntro(),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors(),

		// 3. the moves, one at a time, on the walls themselves: wave to wake
		// your meep, walk to a zone, step forward and back, tap the "?"
		{
			id: 'controls',
			length: TUTORIAL.reduce((a, s) => a + s.max + TUTORIAL_NICE, 0),   // (a safety net: each step has its own limit)
			done: () => tut.i >= TUTORIAL.length,
			enter() {
				show.stop('drama');
				audio.play('music');
				popMeeps();
				tut.i = 0;
				tut.passed = [];
				tutStep(0);
			},
			exit() { finishTutorial(); },
			update(dt) {
				run(dt);
				stepTutorial(dt);
			},
			draw(ctx) {
				const step = TUTORIAL[tut.i];
				if (!step) return;
				show.onWalls(ctx, function (c) {
					show.slam(c, step.caption, W / 2, 175, step.caption.length > 26 ? 66 : 80, tut.age, { fill: tut.done ? '#3cdc7a' : '#ffd23f' });
					// which step this is, as the standard pips
					show.pips(c, TUTORIAL.length, tut.i, tut.done, W / 2, 248);
					if (tut.done) show.slam(c, 'NICE!', W / 2, 560, 140, tut.doneAge, { fill: '#7dff9e', glow: PURPLE, rotate: -0.06 });
				});
			},
		},

		// 4. the box introduces the rounds (Roll Call has no villain): MEET
		// YOUR SQUAD slammed in, what's coming line by line, LET'S GO!
		{
			id: 'meet',
			length: INTRO.length,
			enter() {
				finishTutorial();
				audio.play('music');   // (already on, unless the tutorial was skipped)
			},
			update(dt, bt) {
				show.blackout = 0.45 * (1 - between(bt, INTRO.out, INTRO.length));
				run(dt);
				if (show.cue(INTRO.name)) { show.fx('roundStart'); show.shake = 0.4; }
				INTRO.lines.forEach((at) => { if (show.cue(at)) show.fx('wordSlam', 0.6); });
				if (show.cue(INTRO.go)) { show.fx('go'); show.shake = 0.5; show.flash = 0.3; pl.forEach((d, i) => hop(i)); }
			},
			draw(ctx, bt) {
				const out = 1 - between(bt, INTRO.out - 0.3, INTRO.out);
				show.onWalls(ctx, function (c) {
					show.slam(c, 'MEET YOUR SQUAD', W / 2, 300, 130, bt - INTRO.name, { fill: LILAC, glow: PURPLE, alpha: out });
					INTRO_LINES.forEach((line, k) => {
						if (bt > INTRO.lines[k]) show.text(c, line, W / 2, 430 + k * 90, 56, { fill: k === 1 ? '#FEE955' : 'white', alpha: out * Math.min(1, (bt - INTRO.lines[k]) * 3) });
					});
					show.slam(c, 'LET\'S GO!', W / 2, 380, 180, bt - INTRO.go, { fill: '#FEE955', glow: PURPLE, rotate: -0.05, alpha: 1 - between(bt, INTRO.length - 0.4, INTRO.length) });
				});
			},
		},

		// 5. the rounds, until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				finishTutorial();
				audio.play('music');
				if (!round) startRound(1);
			},
			update(dt) {
				run(dt);
				show.record(t, pl.map((d, i) => latest[i] || null));
			},
		},

		// 6. TIME!: the world slows and stops
		show.beats.timeUp({
			enter() { audio.stop('music'); stopTimer(); },
			update(dt) { run(dt * show.timeScale); },
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		// how was it? five faces to tap, sad to happy
		show.beats.rate(),

		show.beats.end({
			enter() {
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(meeps.map((m) => m.score)));
			},
		}),
	]);

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		show.frame(ctx, dt, drawWorld);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		latest = players;
		for (let i = 0; i < count; i++) {
			const p = players[i];
			if (!p || p.px === undefined) continue;
			pl[i].px = clamp(p.px, 0, 1);
			pl[i].pz = clamp(1 - p.pz, 0, 1);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		}
	};

	// Tapping the hint bubble on the left wall.
	stage.$el.on('click.rollcall', function (e) {
		if (show.paused || hintShown || !hintUp()) return;
		const at = IGB.toWorld(e);
		if (Math.hypot(at.x - HINT.x, at.y - HINT.y) < HINT.r + 40) {
			hintShown = true;
			audio.play('hint', true);
			burst(HINT.x, HINT.y, 20, ['#FEE955', 'white']);
		}
	});

	// For tests and the console.
	self.state = function () {
		return Object.assign(show.state(), {
			phase,
			count,
			round,
			complete: completed,
			timeLeft: timeLeft(),
			gameTimeLeft: show.timeLeft(),
			step: TUTORIAL[tut.i] ? TUTORIAL[tut.i].id : null,
			stepAge: tut.age,
			stepDone: tut.done,
			stepsPassed: tut.passed.slice(),
			players: pl.map((d, i) => ({
				px: d.px, pz: d.pz, woke: d.woke, found: d.found, vote: d.vote, card: d.card,
				score: meeps[i].score, colour: meeps[i].n === i,
			})),
			pads: pads.map((p) => ({ n: p.n, px: p.px, half: p.half })),
			questionIndex: qIndex,
			questionCount: questions.length,
			question: question && { kind: question.kind, text: question.text, zones: question.zones.map((z) => z[1]), answer: question.answer, revealed: !!question.revealed },
			tally: tally().map((v) => v.length),
			hint: { shown: hintShown, up: hintUp(), x: HINT.x, y: HINT.y },
			lineupCorrect,
			perfectLine,
			scores: meeps.map((m) => m.score),
		});
	};

	// Test hooks: jump to any beat, wind the clock on.
	self.test = {
		skipTo(id) {
			if (!count) initGame(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		stage.$el.off('click.rollcall');
		show.fini();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
