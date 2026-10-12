/*
 * Roll Call
 *
 * The squad's first few minutes in the box, in Box Party's cosmic purple.
 * Every player's meep pops up grey on the front wall right where they
 * stand; wave (step left and right) and yours wakes up in your colour.
 * Then coloured box critters drop onto shuffled pads and everyone hunts for
 * their own colour; the first ones on score most, and confetti flies when
 * the whole squad is in. Next comes a run of light questions answered with
 * your feet: the front wall splits into two to four zones and you vote by
 * standing in one. Opinion polls stack the meeps' faces up like a bar
 * chart; trivia lights up the right zone and scores everyone in it. One
 * question is the box's single forward/back one: step forward for yes,
 * back for no. Last, a warm-up line-up by birthday month, then a scored
 * one: each player is dealt a number card (shown big on the right wall)
 * and the squad sorts itself, smallest on the left. Nobody can fail; it
 * just gets everyone moving, laughing and reading the walls.
 *
 * The left wall shows the question's art, the countdown and, on trivia, a
 * "?" bubble to tap for a hint. The right wall shows the live tally (the
 * voters' faces stacking into bars), the dealt cards, and the scoreboard.
 *
 * Score: finding your colour fast, trivia right, standing in the right
 * place in the line-up.
 *
 * Input: px (left / right: zones, pads and the line-up), pz (the one
 * forward/back question), touches on the left wall's hint bubble.
 */
IGB.register('roll-call', function RollCallGame(stage, playersMeta) {

	const self = this;
	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const FLOOR = 955;              // where the meeps stand on the front wall
	const MEEP_SCALE = 0.55;
	const GREY = 9;                 // a meep number with no colour: its hat draws grey
	const WAVE_DIST = 0.06;         // px a player must travel each way to wake their meep
	const WAVE_NOISE = 0.0012;      // per-tick moves smaller than this are tracker jitter
	const WAVE_SECONDS = 20;        // then any meep still grey is woken anyway
	const FIND_SECONDS = 25;        // to stand on your own colour
	const PAD_HOLD = 0.5 * FPS;     // ticks on your pad to count as in
	const PAD_WIDTH = 0.7;          // of a pad's slot
	const FIND_POINTS = [3, 2, 1];  // first in, second in, everyone else in
	const VOTE_SECONDS = 8;
	const FIRST_VOTE_SECONDS = 11;  // the first question, while they get the idea
	const REVEAL_SECONDS = 4.5;
	const TRIVIA_POINTS = 2;
	const DEPTH_SPLIT = 0.5;        // pz under this is "forward" (yes)
	const BIRTHDAY_SECONDS = 15;
	const LINEUP_SECONDS = 15;
	const LINEUP_POINTS = 2;        // each player in the right place
	const LINEUP_BONUS = 1;         // each, when the whole line is right

	/* ---------- look ---------- */

	const BG = 'assets/box-party/bg-cosmos.jpg';
	const MOUNTAINS = 'assets/box-party/bg-mountains.png';
	const ZONE_COLORS = ['#37CCDA', '#FD797B', '#8DE968', '#FEB850'];  // Box Party's box palette
	const INK = '#2a0a6b';          // dark purple text on white cards
	const DROP = '#3a0ca3';         // the drop under white headline text
	const HINT = { x: 1220, y: 650, r: 105 };   // the hint bubble, on the left wall

	const audio = stage.audio();
	audio.add('music', 'assets/box-party/music-quest.mp3', 0.12, true);
	audio.add('wake', 'assets/shared/sfx-select.mp3', 0.4);
	audio.add('pop', 'assets/shared/sfx-bounce.mp3', 0.4);
	audio.add('lock', 'assets/shared/sfx-pickup.mp3', 0.4);
	audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.35);
	audio.add('cheer', 'assets/shared/sfx-cheer.mp3', 0.35);
	audio.add('reveal', 'assets/shared/sfx-reveal.mp3', 0.3);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.2);
	audio.add('tick', 'assets/shared/sfx-tick.mp3', 0.3);
	audio.add('hint', 'assets/shared/sfx-point-g.mp3', 0.3);

	const hud = new HUD('#7538D4');
	hud.$el.appendTo(stage.$ui);

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
	const DEPTH = { text: 'Have you been in a gamebox before?', art: '📦', zones: [['👍', 'YES'], ['👋', 'NO']], depth: true };

	// Opinion, trivia, the depth question, then alternating.
	function buildQuestions() {
		const ops = shuffleArray(OPINIONS.slice());
		const tri = shuffleArray(TRIVIA.slice());
		return [FIRST, tri[0], DEPTH, ops[0], tri[1], ops[1], tri[2]].map((q) => Object.assign({
			kind: q.depth ? 'depth' : (q.answer !== undefined ? 'trivia' : 'opinion'),
		}, q));
	}

	/* ---------- state ---------- */

	let count = 0;
	const meeps = [];
	const pl = [];          // per player: position, wave progress, pad, vote, card
	let phase = 'intro';    // wave, find, vote, reveal, birthday, deal, lineup, lineup-reveal, done
	let header = null;      // { text, sub } on the front wall
	let leftArt = '👋';     // the left wall's big picture
	let leftText = '';
	let timer = null;       // { start, ms, last } for the left wall's countdown
	let pads = [];
	let foundCount = 0;
	let questions = [];
	let qIndex = -1;
	let question = null;
	let hintShown = false;
	let lineupCorrect = [];
	let perfectLine = false;
	let complete = false;
	let tick = 0;
	const confetti = [];
	const rings = [];

	/* ---------- flow ---------- */

	function initGame(n) {
		count = n;
		for (let i = 0; i < count; i++) {
			const meep = new Meep(i);
			meep.n = GREY;
			meep.scale = 0;
			meep.x = W + (i + 0.5) / count * W;
			meep.y = FLOOR;
			meeps.push(meep);
			pl.push({ px: (i + 0.5) / count, pz: 0.5, lastPx: null, vx: 0, left: 0, right: 0, woke: false, found: false, hold: 0, vote: -1, card: 0, hop: 0, flip: 0 });
			// Pop up one after another.
			$(meep).delay(200 + i * 150).animate({ scale: MEEP_SCALE * 1.2 }, 180).animate({ scale: MEEP_SCALE }, 140);
			stage.timeout(() => audio.play('pop', true), 200 + i * 150);
		}
		audio.play('music');
		startWave();
	}

	function startWave() {
		phase = 'wave';
		header = { text: 'Wave!', sub: 'Step left and right to wake your meep' };
		leftArt = '👋';
		leftText = 'Which one is you?';
		startTimer(WAVE_SECONDS, () => {
			if (phase !== 'wave') return;
			pl.forEach((d, i) => { if (!d.woke) wake(i); });
		});
	}

	function wake(i) {
		const d = pl[i];
		if (d.woke) return;
		d.woke = true;
		meeps[i].n = i;
		hop(i);
		ring(meeps[i].x, meeps[i].y - 100, PLAYER_COLORS[i]);
		burst(meeps[i].x, meeps[i].y - 150, 25, [PLAYER_COLORS[i], 'white']);
		audio.play('wake', true);
		if (pl.every((p) => p.woke)) {
			phase = 'woke';
			stopTimer();
			header = { text: 'Hello, everyone!', sub: '' };
			stage.timeout(startFind, 1600);
		}
	}

	// Pads in shuffled slots: of a few shuffles, keep the one that puts the
	// fewest pads under their own players already.
	function startFind() {
		phase = 'find';
		header = { text: 'Find your colour!', sub: 'Stand on your own box' };
		leftArt = '🎨';
		leftText = 'Stand on your colour';
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
			stage.timeout(() => audio.play('pop', true), i * 120);
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
		for (let k = 0; k < 6; k++) stage.timeout(() => burst(W + Math.random() * W, 200 + Math.random() * 300, 50), k * 180);
		audio.play('cheer', true);
		stage.timeout(() => { pads = []; startQuestions(); }, 2600);
	}

	function startQuestions() {
		questions = buildQuestions();
		header = { text: 'Stand to answer!', sub: 'Your feet are your vote' };
		audio.play('woosh', true);
		stage.timeout(() => nextQuestion(), 1800);
	}

	function nextQuestion() {
		qIndex++;
		if (qIndex >= questions.length) {
			question = null;
			startBirthday();
			return;
		}
		question = questions[qIndex];
		hintShown = false;
		phase = 'vote';
		header = { text: question.text, sub: question.depth ? 'The one forward / back question!' : '' };
		leftArt = question.art;
		leftText = question.text;
		audio.play('woosh', true);
		for (const d of pl) d.vote = -1;
		startTimer(question.depth ? FIRST_VOTE_SECONDS : (qIndex === 0 ? FIRST_VOTE_SECONDS : VOTE_SECONDS), lockVotes);
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
		if (question.kind === 'trivia') {
			stage.timeout(() => {
				const a = question.answer;
				const zx = W + (a + 0.5) / question.zones.length * W;
				burst(zx, 450, 60);
				audio.play('reveal', true);
				pl.forEach((d, i) => { if (d.vote === a) score(i, TRIVIA_POINTS); });
				question.revealed = true;
			}, 800);
		} else {
			question.revealed = true;
			audio.play('reveal', true);
		}
		stage.timeout(nextQuestion, REVEAL_SECONDS * 1000);
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
			for (let k = 0; k < 4; k++) stage.timeout(() => burst(W + Math.random() * W, 250, 40), k * 150);
			audio.play('cheer', true);
			stage.timeout(startDeal, 2600);
		});
	}

	// Each player gets a different number from 1 to 99, shown on the right wall.
	function startDeal() {
		phase = 'deal';
		header = { text: 'Here\'s your number!', sub: 'Look at the right wall' };
		leftArt = '🃏';
		leftText = 'Smallest on the left!';
		const nums = shuffleArray(Array.from({ length: 99 }, (_, k) => k + 1)).slice(0, count);
		pl.forEach((d, i) => {
			d.card = nums[i];
			d.flip = 0;
			stage.timeout(() => { $(d).animate({ flip: 1 }, 350); audio.play('pop', true); }, i * 200);
		});
		stage.timeout(() => {
			phase = 'lineup';
			header = { text: 'Line up by number!', sub: 'Smallest on the left' };
			startTimer(LINEUP_SECONDS, revealLineup);
		}, 1500 + count * 200);
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
			stage.timeout(() => {
				audio.play('pop', true);
				pl[i].shown = true;
				if (lineupCorrect[i]) {
					score(i, LINEUP_POINTS);
					burst(meeps[i].x, meeps[i].y - 300, 20, [PLAYER_COLORS[i], 'white']);
				}
			}, 400 + k * 450);
		});
		const end = 400 + count * 450;
		stage.timeout(() => {
			if (perfectLine) {
				pl.forEach((d, i) => score(i, LINEUP_BONUS));
				for (let k = 0; k < 6; k++) stage.timeout(() => burst(W + Math.random() * W, 200 + Math.random() * 300, 50), k * 150);
				audio.play('cheer', true);
			} else {
				header = { text: 'Nice try!', sub: '' };
			}
		}, end);
		stage.timeout(finiGame, end + 3000);
	}

	function finiGame() {
		phase = 'done';
		header = { text: 'Nice to meet you!', sub: '' };
		leftArt = '🎉';
		leftText = '';
		audio.play('cheer', true);
		const scores = meeps.map((m) => m.score);
		const rewards = scoresToRewards(scores);
		hud.showFinalScores(scores, rewards);
		stage.timeout(() => {
			complete = true;
			IGB.complete(rewards);
		}, 5000);
	}

	/* ---------- helpers ---------- */

	function score(i, points) {
		meeps[i].score += points;
		meeps[i].doScore(points);
	}

	function hop(i) {
		$(pl[i]).stop(true).animate({ hop: -70 }, 140).animate({ hop: 0 }, 220);
	}

	function startTimer(seconds, fn) {
		timer = { start: Date.now(), ms: seconds * 1000, last: Math.ceil(seconds) };
		const t = timer;
		stage.timeout(() => { if (timer === t) fn(); }, seconds * 1000);
	}

	function stopTimer() {
		timer = null;
	}

	function timeLeft() {
		return timer ? Math.max(0, timer.ms - (Date.now() - timer.start)) / 1000 : 0;
	}

	function voteOf(d) {
		if (!question) return -1;
		if (question.depth) return d.pz < DEPTH_SPLIT ? 0 : 1;
		const n = question.zones.length;
		return clamp(Math.floor(d.px * n), 0, n - 1);
	}

	function tally() {
		if (!question) return [];
		const t = question.zones.map(() => []);
		pl.forEach((d, i) => { if (d.vote >= 0) t[d.vote].push(i); });
		return t;
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

	function step() {
		tick++;
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

	// The front wall's headline, in the HUD's white-with-a-drop look.
	function drawHeader(ctx) {
		if (!header) return;
		const text = wrap(ctx, header.text, W - 160, 76, 'Paytone One');
		const lines = text.split('\n').length;
		art.text(ctx, text, W + W / 2, 70 + (lines - 1) * 40, { size: 76, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 8 });
		if (header.sub) art.text(ctx, header.sub, W + W / 2, 150 + (lines - 1) * 80, { size: 42, weight: 600, fill: '#FEE955', drop: DROP, dropY: 4 });
		// The countdown as a thin bar under the headline.
		if (timer) {
			const f = timeLeft() / (timer.ms / 1000);
			art.roundRect(ctx, W + 300, 12, W - 600, 14, 7, { fill: 'rgba(255,255,255,0.2)' });
			art.roundRect(ctx, W + 300, 12, (W - 600) * f, 14, 7, { fill: f < 0.3 ? '#FD797B' : '#FEE955' });
		}
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
		const t = tally();
		if (q.depth) return drawDepthZones(ctx, t);
		const n = q.zones.length;
		const zw = W / n;
		const top = 190;
		for (let z = 0; z < n; z++) {
			const x0 = W + z * zw;
			const color = ZONE_COLORS[z];
			const isRight = q.kind === 'trivia' && q.revealed && z === q.answer;
			const isWrong = q.kind === 'trivia' && q.revealed && z !== q.answer;
			const occupied = t[z].length > 0;
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
			drawStack(ctx, t[z], x0 + zw / 2, 760, color);
			if (isRight) {
				art.circle(ctx, x0 + zw / 2, 470, 70, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.3)', blur: 16, y: 6 } });
				art.text(ctx, '✓', x0 + zw / 2, 474, { size: 100, weight: 800, fill: '#2bb24c' });
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
	function drawDepthZones(ctx, t) {
		const q = question;
		const split = lerp(FLOOR + 20, 590, DEPTH_SPLIT);
		const bands = [[split, H], [200, split]];
		bands.forEach(([y0, y1], z) => {
			const color = z === 0 ? '#8DE968' : '#FD797B';
			art.rect(ctx, W, y0, W, y1 - y0, { fill: color, alpha: t[z].length ? 0.3 : 0.16 });
			art.rect(ctx, W, z === 0 ? y0 - 3 : y1 - 3, W, 6, { fill: color, alpha: 0.9 });
			const ly = (y0 + y1) / 2;
			art.text(ctx, q.zones[z][1], W + 170, ly - 20, { size: 110, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 7 });
			art.text(ctx, z === 0 ? '▼ step forward' : '▲ step back', W + 170, ly + 60, { size: 40, weight: 700, fill: color, drop: DROP, dropY: 3 });
			// Faces line up along the band's right end.
			t[z].forEach((i, k) => Meep.drawHead(ctx, i, W + W - 120 - k * 70, ly - 45, 0.6));
		});
	}

	function drawBirthday(ctx) {
		const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
		const y = 330;
		art.roundRect(ctx, W + 40, y - 50, W - 80, 100, 50, { fill: 'white', alpha: 0.9 });
		months.forEach((mo, k) => {
			const x = W + 40 + (k + 0.5) / 12 * (W - 80);
			art.text(ctx, mo, x, y, { size: 38, weight: 700, fill: ZONE_COLORS[k % 4] === '#FEB850' ? '#e08a00' : INK });
		});
		art.text(ctx, '🎂', W + W / 2, 520, { size: 140 });
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

	function drawLeftWall(ctx) {
		// The question's art in a big badge.
		art.circle(ctx, 520, 360, 250, { fill: 'rgba(255,255,255,0.14)' });
		art.circle(ctx, 520, 360, 215, { fill: 'white', shadow: { color: 'rgba(0,0,0,0.35)', blur: 30, y: 14 } });
		art.text(ctx, leftArt, 520, 375, { size: 220 });

		// The countdown ring.
		if (timer) {
			const left = timeLeft();
			const f = left / (timer.ms / 1000);
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

		// The hint bubble, on trivia: tap it.
		if (question && question.kind === 'trivia' && (phase === 'vote' || phase === 'reveal')) {
			if (!hintShown) {
				const pulse = 1 + 0.06 * Math.sin(tick * 0.12);
				art.with(ctx, { x: HINT.x, y: HINT.y, scale: pulse }, () => {
					art.circle(ctx, 0, 0, HINT.r, { fill: '#FEE955', shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 10 } });
					art.poly(ctx, [[-60, 70], [-20, 95], [-95, 125]], { fill: '#FEE955' });
					art.text(ctx, '?', 0, 8, { size: 150, font: 'Paytone One', weight: 400, fill: INK });
				});
				art.text(ctx, 'tap for a hint', HINT.x, HINT.y + 150, { size: 36, weight: 700, fill: 'white', drop: DROP, dropY: 3 });
			} else {
				const text = wrap(ctx, question.hint, 560, 46);
				art.roundRect(ctx, HINT.x - 320, HINT.y - 120, 640, 240, 40, { fill: '#FEE955', shadow: { color: 'rgba(0,0,0,0.35)', blur: 20, y: 10 } });
				art.text(ctx, text, HINT.x, HINT.y, { size: 46, weight: 700, fill: INK });
			}
		}

		if (leftText && !(question && question.kind === 'trivia')) {
			const text = wrap(ctx, leftText, 1300, 64, 'Paytone One');
			art.text(ctx, text, 800, 800, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
		}
	}

	function drawRightWall(ctx) {
		const x0 = 2 * W;
		const isCards = phase === 'deal' || phase === 'lineup' || phase === 'lineup-reveal';
		if (question && (phase === 'vote' || phase === 'reveal')) {
			art.text(ctx, phase === 'vote' ? 'Live votes' : 'Votes are in!', x0 + W / 2, 80, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
			const t = tally();
			const n = t.length;
			const cw = Math.min(320, (W - 160) / n);
			t.forEach((voters, z) => {
				const cx = x0 + W / 2 + (z - (n - 1) / 2) * (cw + 30);
				const color = question.depth ? (z === 0 ? '#8DE968' : '#FD797B') : ZONE_COLORS[z];
				art.roundRect(ctx, cx - cw / 2, 150, cw, 470, 24, { fill: 'rgba(255,255,255,0.1)' });
				const h = voters.length * 70;
				if (h) art.roundRect(ctx, cx - cw / 2 + 20, 590 - h - 20, cw - 40, h + 20, 20, { fill: color });
				voters.forEach((i, k) => Meep.drawHead(ctx, i, cx - 33, 590 - (k + 1) * 70 - 22, 0.66));
				const [emoji, label] = question.zones[z];
				art.text(ctx, (emoji ? emoji + ' ' : '') + label, cx, 655, { size: n > 3 ? 32 : 40, weight: 700, fill: 'white', drop: DROP, dropY: 3 });
			});
		} else if (isCards) {
			art.text(ctx, 'Your numbers', x0 + W / 2, 80, { size: 64, font: 'Paytone One', weight: 400, fill: 'white', drop: DROP, dropY: 6 });
			const cw = Math.min(230, (W - 100) / count - 20);
			pl.forEach((d, i) => {
				const cx = x0 + W / 2 + (i - (count - 1) / 2) * (cw + 20);
				const sx = Math.abs(Math.cos(d.flip * Math.PI));
				const faceUp = d.flip > 0.5;
				art.with(ctx, { x: cx, y: 400 }, () => {
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
			art.text(ctx, 'Roll call', x0 + W / 2, 90, { size: 90, font: 'Knewave', weight: 400, fill: 'white', drop: DROP, dropY: 8 });
			const cw = Math.min(220, (W - 100) / Math.max(1, count) - 20);
			pl.forEach((d, i) => {
				const cx = x0 + W / 2 + (i - (count - 1) / 2) * (cw + 20);
				art.roundRect(ctx, cx - cw / 2, 200, cw, 330, 30, { fill: 'rgba(255,255,255,0.12)' });
				Meep.drawHead(ctx, d.woke ? i : GREY, cx - 60, 240, 1.2);
				const mark = phase === 'wave' || phase === 'woke' ? (d.woke ? '👋' : '…') : (d.found ? '✓' : '…');
				art.text(ctx, mark, cx, 470, { size: 60, weight: 800, fill: 'white' });
			});
		}
		drawScoreboard(ctx, x0);
	}

	function drawScoreboard(ctx, x0) {
		if (!count) return;
		const cw = Math.min(230, (W - 100) / count - 16);
		art.roundRect(ctx, x0 + 40, 715, W - 80, 250, 36, { fill: 'rgba(20,0,70,0.55)' });
		pl.forEach((d, i) => {
			const cx = x0 + W / 2 + (i - (count - 1) / 2) * (cw + 16);
			art.roundRect(ctx, cx - cw / 2, 740, cw, 200, 24, { fill: 'white' });
			art.roundRect(ctx, cx - cw / 2, 740, cw, 14, [24, 24, 0, 0], { fill: d.woke ? PLAYER_COLORS[i] : 'gray' });
			Meep.drawHead(ctx, d.woke ? i : GREY, cx - 35, 765, 0.7, { shadow: false });
			art.text(ctx, meeps[i].score, cx, 905, { size: 56, font: 'Paytone One', weight: 400, fill: INK });
		});
	}

	self.draw = function (ctx) {
		drawBackground(ctx);
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
		drawHeader(ctx);
		ctx.restore();

		for (const r of rings) {
			art.circle(ctx, r.x, r.y, 60 + (1 - r.life) * 160, { stroke: r.color, lineWidth: 12 * r.life, alpha: r.life });
		}
		for (const c of confetti) {
			art.with(ctx, { x: c.x, y: c.y, rotate: c.rot * 180 / Math.PI }, () => {
				art.rect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, { fill: c.color, alpha: Math.min(1, c.life * 2) });
			});
		}
	};

	/* ---------- input ---------- */

	self.setPlayers = function (players) {
		for (let i = 0; i < count; i++) {
			const p = players[i];
			if (!p || p.px === undefined) continue;
			pl[i].px = clamp(p.px, 0, 1);
			pl[i].pz = clamp(1 - p.pz, 0, 1);   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		}
	};

	// Tapping the hint bubble on the left wall.
	stage.$el.on('click.rollcall', function (e) {
		const at = IGB.toWorld(e);
		if (!question || question.kind !== 'trivia' || hintShown) return;
		if (phase !== 'vote' && phase !== 'reveal') return;
		if (Math.hypot(at.x - HINT.x, at.y - HINT.y) < HINT.r + 40) {
			hintShown = true;
			audio.play('hint', true);
			burst(HINT.x, HINT.y, 20, ['#FEE955', 'white']);
		}
	});

	self.state = function () {
		return {
			phase,
			count,
			complete,
			timeLeft: timeLeft(),
			players: pl.map((d, i) => ({
				px: d.px, pz: d.pz, woke: d.woke, found: d.found, vote: d.vote, card: d.card,
				score: meeps[i].score, colour: meeps[i].n === i,
			})),
			pads: pads.map((p) => ({ n: p.n, px: p.px, half: p.half })),
			questionIndex: qIndex,
			questionCount: questions.length,
			question: question && { kind: question.kind, text: question.text, zones: question.zones.map((z) => z[1]), answer: question.answer, revealed: !!question.revealed },
			tally: tally().map((v) => v.length),
			hint: { shown: hintShown, x: HINT.x, y: HINT.y },
			lineupCorrect,
			perfectLine,
			scores: meeps.map((m) => m.score),
		};
	};

	self.fini = function () {
		stage.$el.off('click.rollcall');
		hud.fini();
	};

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(initGame);

	stage.interval(step, 1000 / FPS);
});
