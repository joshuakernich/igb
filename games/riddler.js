/*
 * Riddler
 *
 * Batman: Riddler Says. Twenty little green TV screens wrap round the room
 * (six on each side wall, eight on the front) above the Riddler's bomb. Each
 * question lights some of them with a riddle, a "touch N things" rule or a
 * movement rule; players touch the right screens (or stand in the right
 * place) to solve it. A wrong touch flashes red. The finale shuffles every
 * screen and the Riddler's face has to be caught on all twenty.
 *
 * As in the original, nothing starts on its own (the intro is switched off):
 * open index.html?riddler&N to start at question N (0 is the first).
 *
 * Input: px (which quarter of the front wall: left / right rules), py
 * (squat rule), pz (how bright the shadow on the front screens is), and
 * clicks / touches on the screens.
 */
IGB.register('riddler', function RiddlerGame(stage, playersMeta) {

	const H = IGB.H;
	const art = IGB.art;
	const A = 'assets/riddler/';

	/* ---------- the old layout, in world units ---------- */

	// The old page was 100vw wide for the three walls, so 1vw is 48 units.
	const VW = 48;
	const SIDE_W = IGB.WIDTH * 0.333;          // igbside: width 33.3%
	const SIDE_H = 20.83 * VW;                 // igb: height 20.83vw
	const SCREEN_W = 6.4 * VW;
	const SCREEN_H = 4.4 * VW;
	const SCREEN_BORDER = 0.2 * VW;
	const SCREEN_MARGIN = 0.3 * VW;
	const INNER_W = SCREEN_W - 2 * SCREEN_BORDER;
	const INNER_H = SCREEN_H - 2 * SCREEN_BORDER;
	const ROWS_TOP = 3 * VW;                   // riddlerscreens: margin-top 3vw
	const FONT = 'VCRFONT';

	// The old page's own font, loaded for this game and dropped with it.
	let font;
	if (window.FontFace && document.fonts) {
		font = new FontFace(FONT, `url(${A}VCR_OSD_MONO_1.001.ttf)`);
		document.fonts.add(font);
		font.load().catch(() => {});
	}

	/* ---------- the game, as it was ---------- */

	const COUNT = 20;

	const LIBRARIES = {
		'vehicle':['🚗','🛵','🚲','🚁','✈️'],
		'food':['🍎','🍔','🧀','🍗','🥨'],
		'drink':['🍺','🍷','🧃','☕️','🍹'],
		'ball':['🏈','🎱','🏐','⚽️','🏀'],
		'building':['🏛','🏠','🏭','🏰','🛖'],
		'instrument':['🎸','🎻','🎺','🎷','🪇'],
		'animal':['🦆','🐌','🐢','🦍','🐪'],
		'face':['👦','👶','🧔‍♂️','👵','👨‍🦳'],
	};

	const SYMBOLS = [];
	for (var d in LIBRARIES) SYMBOLS.push({ name: d, symbol: LIBRARIES[d] });

	const LIST = [
		'riddler',
		'🧀','👞','👙','👜','🌝','🍔','🍕','🍉','💧','⛄',
		'🕑','🎪','🚗','🚁','🚀','☂','⚡','🎃','🎄',
	];

	const questions = [

		//riddles
		{type:'riddle',q:['I have a face…','…and I have hands'],rights:['🕑'],wrongs:['🙌','🧀','👞','👙','👜','🌝']},
		{type:'riddle',q:['I am not alive…','…but I grow…','…and water kills me'],rights:['🔥'],wrongs:['🌤️','🌳','🍉','💧','🦆','🐟']},
		{type:'riddle',q:['I can fly…','…but I have no wings'],rights:['🎈'],wrongs:['🦋','🪰','👞','🐔','🕷','🦆','✈️','🐝']},
		{type:'riddle',q:['I’m tall when I’m young…','…but I’m short when I’m old'],rights:['🕯'],wrongs:['🏛️','🔥','🦴','🦷','☂️','🎩','🍄']},
		{type:'riddle',q:['The more you use me…','…the smaller I get'],rights:['✏'],wrongs:['🧠','🛌🏾','👞','👙','📺','☂️','🥄','🦴']},
		{type:'riddle',q:['The more you take away…','…the bigger I get'],rights:['🕳'],wrongs:['🏦','🧀','💰','🍭','🎳','🎨','🎣','👙']},

		//sides
		{type:'riddle',q:['What has two sides?'],rights:['🪙'],wrongs:['🕑','♥','📽','⬜','♠',,'♦','💰','♣']},
		{type:'riddle',q:['What does NOT have two sides?'],rights:['⬜','🔺','🔶','🔴','❌','🔻'],wrongs:[]},

		//not right
		{type:'riddle',q:['Something is not right'],rights:['⬅'],wrongs:['🔴','🍔','🍕','🍉','▶️','👉','❌','⬜']},
		// (was "rightxs", a typo: the right answers never showed and the first touch threw)
		{type:'riddle',q:['Some things are not right'],rights:['poker-mistake-3C','poker-mistake-5S'],wrongs:['poker-AS','poker-2S','poker-3S','poker-4C','poker-5S']},
		{type:'riddle',q:['Some things are not wrong'],rights:['poker-AS','poker-2S','poker-3S','poker-4C','poker-5S'],wrongs:['poker-mistake-3C','poker-mistake-5S']},
		{type:'riddle',q:["What's left?"],rights:['⬅','👈','◀️'],wrongs:['🔺','🔻','🎲','🏋️','▶️','➗','⏺','♾','↔','⬆','⬇','↘','🤚','👉','👆','👇']},

		//not not
		{type:'notnot',q:['3-A'],s:'AAABBBCCC'},
		{type:'notnot',q:['3-NA'],s:'AAABBBCCC'}, 						// introduce NOT
		{type:'notnot',q:['3-B','1-NB'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-NA','2-NB'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-B','2-NB','2-NA'],s:'AAABBBCCCDDD'},
		{type:'notnot',q:['2-NNA'],s:'AAABBBCCCDDD'},  					// introduce NOT NOT
		{type:'notnot',q:['2-NNNB'],s:'AAABBBCCCDDD'},					// introduce NOT NOT NOT
		{type:'notnot',q:['2-NA','1-NNB','1-NNNC'],s:'AAABBBCCCDDD'}, 	// COMBO of NOT NOTS
		{type:'notnot',q:['5-*'],s:'AAABBBCCCDDD'}, 					// introduce nothings
		{type:'notnot',q:['1-?'],s:'AAABBBCCCDDD'},						// introduce riddle screens
		{type:'notnot',q:['1-*','1-B','1-C','1-A','3-?'],s:'AAABBBCCCDDD'},// COMBO (no NOTS)

		//movement
		{type:'notnot',q:['1-R','2-?']},
		{type:'notnot',q:['2-R']},
		{type:'notnot',q:['1-NR','1-L']},
		{type:'notnot',q:['2-S']},
		{type:'notnot',q:['1-S','1-NS','1-L','1-NL']},
		{type:'notnot',q:['1-S','1-NNR','1-L','1-NNS']},

		//two things
		{type:'riddle',q:['It takes two words…','…to flutter by.'],rights:['🧈','🪰'],wrongs:['🙌','🔥','✈️','👙','🌤️','🦆','🛞','🪑']},
		{type:'riddle',q:['It takes two words…','…when you don’t want to knock.'],rights:['🚪','🔔'],wrongs:['🎺','🎬','🪇','🛞','🪑','🙌','👞','🥜','👏','🪵']},
		{type:'riddle',q:['It takes two words…','…to get around with a broken leg.'],rights:['🛞','🪑'],wrongs:['🤸‍♀️','🛼','🛹','🛷','🚁','👞','⛵️','🎈','📦','🛝']},
		{type:'riddle',q:['It takes two words…','…to make a strange looking shark.'],rights:['🔨','👨'],wrongs:['🚪','🔔','🥄','🥨','👞','🐳','🪼','🦓','🪽']},
		{type:'riddle',q:['It takes two words…','…to bring a twinkle to the ocean.'],rights:['⭐','🐟'],wrongs:['🙌','🔥','🐳','🪼','⚡️','👙','🌛','🌝','❄️','💦','🌪','🌈','🫧']},
		{type:'riddle',q:['It takes two words…','…to hide things in your car.'],rights:['🥊','📦'],wrongs:['🥾','🕶','💼','🧶','🎩','🪵','🔑','🗄','🚪','✉️']},

		//big combo
		{type:'notnot',q:['1-B','1-NB','2-?','2-*','1-NR','1-L','1-S','1-NS'],s:'AAABBBCCC'},

		//final
		{type:'final'},
	];

	const MOVES = {
		'L':'left',
		'R':'right',
		'S':'squat',
	};

	let iQuestion = -1;
	let isEnabled = false;
	let elEnabled = false;      // the old root's "enabled" class: screens and SKIP take clicks only while it is set

	const self = this;

	const audio = stage.audio();
	audio.add('tension', A + 'riddler-tension.mp3', 0.5, false, true);
	audio.add('boom', A + 'riddler-boom.mp3');
	audio.add('music', A + 'riddler-music.mp3', 0.5, true, false);
	audio.add('select', A + 'riddler-select.mp3');
	audio.add('correct', A + 'riddler-correct.mp3');
	audio.add('fail', A + 'riddler-fail.mp3');
	audio.add('incorrect', A + 'riddler-fail-short.mp3');
	audio.add('tv-on', A + 'riddler-tv-on.mp3');
	audio.add('tv-off', A + 'riddler-tv-off.mp3');
	audio.add('laugh-a', A + 'riddler-laugh.mp3');
	audio.add('laugh-b', A + 'riddler-laugh-b.mp3');
	audio.add('intro', A + 'riddler-intro.mp3');
	audio.add('intro-finale', A + 'riddler-intro-finale.mp3');

	function emojiToUnicode(emoji) {
		return emoji.codePointAt(0).toString(16).toUpperCase();
	}

	/* ---------- the screens ---------- */

	// A screen is what a <riddlerscreen> held: its attribute s, its classes
	// (on, fail, selected), and its content (text, or one image).
	// In the old DOM order: left wall (2 rows of 3), front (2 of 4), right (2 of 3).
	const screens = [];
	const sides = [];
	for (let i = 0; i < 3; i++) {
		const cols = i == 1 ? 4 : 3;
		const padLeft = i == 0 ? 0.2 * SIDE_W : 0;
		const padRight = i == 2 ? 0.2 * SIDE_W : 0;
		const contentW = SIDE_W - padLeft - padRight;
		const left = i * SIDE_W + padLeft + (contentW - cols * (SCREEN_W + 2 * SCREEN_MARGIN)) / 2;
		sides[i] = { x: i * SIDE_W, centre: i * SIDE_W + padLeft + contentW / 2 };
		for (let y = 0; y < 2; y++) {
			for (let x = 0; x < cols; x++) {
				screens.push({
					n: screens.length,
					x: left + SCREEN_MARGIN + x * (SCREEN_W + 2 * SCREEN_MARGIN),
					y: ROWS_TOP + SCREEN_MARGIN + y * (SCREEN_H + 2 * SCREEN_MARGIN),
					s: undefined, on: false, fail: false, selected: false,
					content: null,
				});
			}
		}
	}
	const FRONT = 6;    // the front wall's first screen

	// sides[1].find('riddlerscreen').eq(i), with jQuery's negative indices
	function frontScreen(i) {
		const j = +i + (i < 0 ? 8 : 0);
		return j >= 0 && j < 8 ? screens[FRONT + j] : null;
	}

	// $s.html(...) / $s.empty(): the content goes, and so do the shadows
	// that were inside it (setPlayers puts them back on its next update).
	function setContent(sc, content) {
		sc.content = content;
		for (const p in heads) {
			if (heads[p].screen === sc) heads[p].screen = null;
			if (bodies[p].screen === sc) bodies[p].screen = null;
		}
	}

	function textContent(text) {
		return { type: 'text', text, top: 0 };
	}

	// The scrolling PERFECT / FAIL text: top: 0 -> -2vw over 1.5s.
	function scrollingText(text) {
		const c = textContent(text);
		$(c).animate({ top: -2 * VW }, { duration: 1500, easing: 'linear' });
		return c;
	}

	// the animated GIF that lit every screen that was "on" (its ::before), at 10%
	const GIF = 'https://i.pinimg.com/originals/51/7a/86/517a86be65e2c862e73e1ecd18a85627.gif';
	for (const sc of screens) {
		sc.$glow = $('<div>').css({
			position: 'absolute',
			left: sc.x + SCREEN_BORDER + 'px', top: sc.y + SCREEN_BORDER + 'px',
			width: INNER_W + 'px', height: INNER_H + 'px',
			backgroundImage: `url(${GIF})`,
			opacity: 0.1,
			display: 'none',
			pointerEvents: 'none',
		}).appendTo(stage.$ui);
		sc.glowing = false;
	}

	const $skip = $('<button>SKIP</button>').css({
		position: 'absolute',
		left: sides[2].centre + 'px',
		top: ROWS_TOP + 2 * (SCREEN_H + 2 * SCREEN_MARGIN) + 'px',
		transform: 'translateX(-50%)',
		background: 'none',
		color: 'white',
		border: 'none',
		fontFamily: `${FONT}, serif`,
		fontWeight: 600,
		fontSize: 1 * VW + 'px',
		lineHeight: 0,
		padding: 1 * VW + 'px',
		pointerEvents: 'none',
		whiteSpace: 'nowrap',
	}).appendTo(stage.$ui).on('click', doCorrect);

	function setEnabled(on) {
		elEnabled = on;
		$skip.css('pointer-events', on ? 'auto' : 'none');
	}

	let timerText = '';     // the bomb's countdown (riddlerbombtimer)
	const titles = [];      // doTitle's h1s

	function shuffle(array) {
		let currentIndex = array.length;

		// While there remain elements to shuffle...
		while (currentIndex != 0) {

			// Pick a remaining element...
			let randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[array[currentIndex], array[randomIndex]] = [
				array[randomIndex], array[currentIndex]];
		}
	}

	let selected = [];
	let mistake = undefined;    // { screen }: the old $mistake (a jQuery set, maybe empty)
	let isTouchCorrect = true;
	let isPositionCorrect = false;
	let question = undefined;

	function onToggle(screen) {

		screen.selected = !screen.selected;

		let isSelected = screen.selected;

		if (isSelected) audio.play('select', true);

		if (isSelected) selected.push(screen);
		else selected.splice(selected.indexOf(screen), 1);

		var s;

		if (question.type == 'notnot') {
			isTouchCorrect = true;

			let combo = {
				'A':0,'B':0,'C':0,'D':0,
				'*':0,'?':0,
			};

			let total = 0;
			let notsTotal = 0;

			for (s in selected) {
				let shape = selected[s].s;

				if (!shape) shape = '*';
				combo[shape]++;

				total++;
				if (rules[shape] == undefined) notsTotal++;
				if (rules[shape] == undefined && rules['N' + shape] > 0) mistake = { screen: selected[s] };
			}

			let totalRequired = 0;
			let notsRequired = 0;

			for (var r in rules) {
				if (r != 'L' && r != 'R') {
					totalRequired += rules[r];
					if (r.length > 1) notsRequired += rules[r];
				}
			}

			for (var c in combo) combo['N' + c] = total - combo[c];

			if (total < totalRequired) isTouchCorrect = false;

			if (total > totalRequired) {
				mistake = { screen: selected[s] };
			} else if (notsTotal > notsRequired) {
				mistake = { screen: selected[s] };
			} else {
				for (var c in combo) {

					let input = combo[c];
					let goal = rules[c];

					if (input < goal) isTouchCorrect = false;

					if (c.length == 1 && input > goal) mistake = { screen: selected[s] };
				}
			}
		}

		if (question.type == 'riddle') {

			let cntRight = 0;

			for (s in selected) {
				let value = selected[s].s;
				if (question.rights.indexOf(value) > -1) cntRight++;
				else mistake = { screen: selected[s] };
			}

			if (cntRight == question.rights.length) isTouchCorrect = true;
		}

		if (question.type == 'final') {

			let cntRight = 0;

			for (s in selected) {
				let value = selected[s].s;

				if (value == '0') cntRight++;
				else mistake = { screen: selected[s] };
			}

			resetRiddlerTicker(cntRight);

			if (cntRight == COUNT) {
				clearTimeout(tickRiddler);
				isTouchCorrect = true;
			}
		}

		checkCorrect();
	}

	function checkCorrect() {

		if (mistake) {
			doMistake();
			return;
		}

		if (isEnabled && isTouchCorrect && isPositionCorrect) doCorrect();
	}

	const MAXSHUFFLE = 1500;
	const MINSHUFFLE = 400;
	let timePerShuffle = MAXSHUFFLE;
	let hasTickerStarted = false;
	let tickRiddler;

	function onRiddlerTicker() {

		screens.forEach(function (sc, n) {
			if (!sc.selected) {
				let s = parseInt(sc.s);
				s = (s + 1) % LIST.length;
				paintScreen(n, s, undefined, LIST[s]);
			}
		});

		tickRiddler = stage.timeout(onRiddlerTicker, timePerShuffle);
		hasTickerStarted = true;
	}

	function resetRiddlerTicker(cntCorrect) {
		timePerShuffle = MINSHUFFLE + (MAXSHUFFLE - MINSHUFFLE) * (1 - cntCorrect / (COUNT - 1));
		if (!hasTickerStarted) tickRiddler = stage.timeout(onRiddlerTicker, timePerShuffle);
		hasTickerStarted = true;
	}

	function doMistake() {

		if (isEnabled) {
			isEnabled = false;
			setEnabled(false);
			stage.timeout(celebrateMistake, 500);
		}
	}

	function celebrateMistake() {

		audio.play('incorrect', true);

		if (mistake.screen) mistake.screen.fail = true;

		stage.timeout(resetMistakes, 500);
	}

	function resetMistakes() {
		isEnabled = true;
		setEnabled(true);

		let clear = mistake;
		mistake = undefined;
		// $clear.removeClass('fail').click(): the screen's handler, then the document's
		if (clear.screen) {
			clear.screen.fail = false;
			onToggle(clear.screen);
			onFirstClick();
		}
	}

	// (doFail, doIntro and doTitle are unused, in the original too)
	function doFail() {
		if (isEnabled) {
			isEnabled = false;
			setEnabled(false);
			stage.timeout(celebrateFailure, 1000);
		}
	}

	function doCorrect() {
		if (isEnabled) {
			isEnabled = false;
			setEnabled(false);
			stage.timeout(celebrateCorrect, 1000);
		}
	}

	function celebrateFailure() {

		audio.play('fail', true);

		for (const sc of screens) {
			sc.selected = false;
			sc.fail = true;
			setContent(sc, scrollingText('FAIL\nFAIL\nFAIL\nFAIL\nFAIL\nFAIL'));
		}

		stage.timeout(nextQuestion, 1500);
	}

	function celebrateCorrect() {

		audio.play('correct', true);

		for (const sc of screens) {
			sc.selected = false;
			sc.on = true;
			setContent(sc, scrollingText('PERFECT\nPERFECT\nPERFECT\nPERFECT\nPERFECT\nPERFECT'));
		}

		stage.timeout(nextQuestion, 1500);
	}

	let rules = {};
	let finished = false;
	function nextQuestion() {

		rules = {};
		selected = [];
		iQuestion++;

		for (const sc of screens) {
			setContent(sc, null);
			sc.selected = sc.on = sc.fail = false;
			sc.s = '*';
		}

		let things = [];
		question = questions[iQuestion];

		// (the old game ran off the end of the list here and threw)
		if (!question) { finish(); return; }

		let symbols = SYMBOLS.concat();
		shuffle(symbols);

		let symbolsForQuestion = {
			'A':symbols[0],
			'B':symbols[1],
			'C':symbols[2],
			'D':symbols[3],
			'?':{name:'riddle screen'},
			'*':{name:'nothing'},
		};

		// clone arrays
		symbolsForQuestion['A'].symbol = LIBRARIES[symbolsForQuestion['A'].name].concat();
		symbolsForQuestion['B'].symbol = LIBRARIES[symbolsForQuestion['B'].name].concat();
		symbolsForQuestion['C'].symbol = LIBRARIES[symbolsForQuestion['C'].name].concat();
		symbolsForQuestion['D'].symbol = LIBRARIES[symbolsForQuestion['D'].name].concat();

		isTouchCorrect = true;
		isPositionCorrect = true;

		if (question.type == 'notnot') {

			let q = question.q;
			let total = 0;

			for (var i = 0; i < q.length; i++) {
				let rule = q[i].split('-');

				let count = parseInt(rule[0]);
				let nots = rule[1].substr(0, rule[1].length - 1);
				let shape = rule[1][rule[1].length - 1];

				let isNot = (nots.length % 2 == 1);

				if (isNot) rules['N' + shape] = parseInt(count);
				else rules[shape] = parseInt(count);

				let strNots = ' ';
				for (var n = 0; n < nots.length; n++) strNots += 'NOT ';

				let text = '';
				if (shape == 'S') {
					isPositionCorrect = false;
					text = count + ' player' + (count > 1 ? 's' : '') + ' must' + strNots + 'squat';
				} else if (shape == 'R' || shape == 'L') {
					isPositionCorrect = false;
					text = 'Move ' + count + ' player' + (count > 1 ? 's' : '') + strNots + ' to the ' + MOVES[shape];
				}
				else {
					isTouchCorrect = false;
					text = 'Touch ' + count + '' + strNots + symbolsForQuestion[shape].name + (count > 1 ? 's' : '');
					total += count;
				}

				if (i > 0) text = '…and ' + text;

				if (i < q.length - 1) text = text + '…';

				things.push({ s: '?', t: text });
			}

			if (question.s) {
				for (var s = 0; s < question.s.length; s++) {
					let shape = question.s[s];
					things.push({ s: shape, symbol: symbolsForQuestion[shape].symbol.pop() });
				}
			}
		}

		if (question.type == 'riddle') {
			isTouchCorrect = false;

			for (var ir in question.rights) things.push({ s: question.rights[ir], symbol: question.rights[ir] });
			for (var id in question.wrongs) things.push({ s: question.wrongs[id], symbol: question.wrongs[id] });
			shuffle(things);

			for (var iq in question.q) things.unshift({ s: 'I', t: question.q[iq] });
		}

		if (question.type == 'final') {
			isEnabled = false;
			isTouchCorrect = false;
			doIntroFinale();
		} else {

			let order = [];
			while (order.length < COUNT) order[order.length] = order.length;
			shuffle(order);

			for (var t = 0; t < things.length; t++) paintScreen(order[t], things[t].s, things[t].t, things[t].symbol, 200 + t * 200);

			isEnabled = true;
			setEnabled(true);
		}
	}

	// Past the final question: hand Box Party its coins (everyone together,
	// so everyone gets the same).
	function finish() {
		if (finished) return;
		finished = true;
		const count = playersMeta ? playersMeta.length : 2;
		const scores = [];
		for (let i = 0; i < count; i++) scores[i] = 0;
		IGB.complete(scoresToRewards(scores));
	}

	function doIntroFinale() {

		let order = [];
		while (order.length < COUNT) order[order.length] = order.length;
		shuffle(order);

		let text = 'WHERE\nAM I?';

		for (var i = 0; i < order.length; i++) paintScreen(order[i], i, text, undefined, 7000 + i * 100);

		audio.stop('music');
		audio.play('boom', true);
		audio.play('tension');

		stage.timeout(function () {
			audio.play('intro-finale');
		}, 2000);

		stage.timeout(function () {
			audio.stop('tension');
			audio.play('boom', true);
			for (const sc of screens) {
				setContent(sc, null);
				sc.on = false;
				sc.s = '*';
			}
		}, 12000);

		stage.timeout(function () {

			for (var i = 0; i < order.length; i++) paintScreen(order[i], i, undefined, 'riddler');

			audio.play('music', true);

			onRiddlerTicker();

			isEnabled = true;
			setEnabled(true);
		}, 17000);
	}

	function paintScreen(n, s, t, symbol, delay) {

		if (delay) {
			stage.timeout(function () {
				paintScreen(n, s, t, symbol);
			}, delay);
			return;
		}

		audio.play('tv-on', true);

		const sc = screens[n];
		if (!sc) return;
		if (s !== undefined) sc.s = String(s);
		sc.on = true;
		if (t) setContent(sc, textContent(t));
		if (symbol) {

			if (symbol == 'riddler') {
				setContent(sc, { type: 'riddler', src: A + 'riddler.png' });
			} else if (symbol.indexOf('poker') > -1) {
				setContent(sc, { type: 'poker', src: `${A}poker/${symbol.substr(6)}.svg` });
			} else {
				setContent(sc, { type: 'emoji', code: emojiToUnicode(symbol) });
			}
		}
	}

	/* ---------- players: shadows on the front screens ---------- */

	// The shadow of a player (riddlerhead / riddlerbody): which screen it is
	// in, where across it (left, %), how bright, and its squat pose (the
	// background-position-y, tweened over 0.2s like the CSS transition).
	function Shadow(posY, squatY) {
		this.screen = null;
		this.left = undefined;
		this.opacity = 0.5;
		this.squat = false;
		this.posY = posY;
		this.standY = posY;
		this.squatY = squatY;
	}
	Shadow.prototype.setSquat = function (squat) {
		if (squat == this.squat) return;
		this.squat = squat;
		$(this).stop(true).animate({ posY: squat ? this.squatY : this.standY }, { duration: 200, easing: 'ease' });
	};

	const heads = [];
	const bodies = [];

	let nData = 0;
	let minPY = [30, 30];
	let players = [];

	self.setPlayers = function (input) {

		let countsX = [0, 0, 0, 0];
		let countsY = [0, 0];

		nData++;

		// (the old game cut the caller's own array down to two players)
		players = Array.prototype.slice.call(input, 0, 2);

		for (var p in players) {
			if (!players[p]) continue;
			if (!heads[p]) {
				heads[p] = new Shadow(-0.15, -1);
				bodies[p] = new Shadow(0.95, -0.1);
			}

			let ix = Math.floor(players[p].px * 4);
			countsX[ix]++;

			if (players[p].py < minPY[p] && players[p].py > 50) minPY[p] = players[p].py;

			let iy = (players[p].py > (minPY[p] + 15)) ? 1 : 0;
			countsY[iy]++;

			isPositionCorrect = true;

			if (rules['L']) isPositionCorrect = isPositionCorrect && (rules['L'] == countsX[0]);
			if (rules['R']) isPositionCorrect = isPositionCorrect && (rules['R'] == countsX[3]);
			if (rules['S']) isPositionCorrect = isPositionCorrect && (rules['S'] == countsY[1]);

			checkCorrect();

			// (appendTo an empty set left the shadow where it was; NaN css was ignored)
			const elHead = frontScreen(ix);
			const elBody = frontScreen(ix + 4);
			if (elHead) heads[p].screen = elHead;
			if (elBody) bodies[p].screen = elBody;

			const left = ((players[p].px % 0.25) / 0.25) * 100;
			if (isFinite(left)) heads[p].left = bodies[p].left = left;

			const opacity = players[p].pz / 2;
			if (isFinite(opacity)) heads[p].opacity = bodies[p].opacity = Math.max(0, Math.min(1, opacity));

			heads[p].setSquat(iy == 1);
			bodies[p].setSquat(iy == 1);
		}
	};

	/* ---------- the (switched off) intro ---------- */

	function doIntro() {

		let order = [];
		while (order.length < COUNT) order[order.length] = order.length;
		shuffle(order);

		for (var i = 0; i < order.length; i++) paintScreen(order[i], 'riddler', undefined, 'riddler', 2000 + i * 200);

		stage.timeout(function () {
			audio.play('laugh-a');
		}, 3000);

		stage.timeout(function () {
			audio.play('laugh-b');
		}, 5000);

		stage.timeout(function () {
			audio.play('intro');
		}, 7000);

		stage.timeout(function () {
			audio.play('select', true);
			timerText = '10:00.00';
		}, 20000);

		stage.timeout(function () {
			for (var i = 0; i < COUNT; i++) paintScreen(i, 'boom', 'BOOM!', undefined);
			audio.stop('tension');
			audio.play('boom');
		}, 22500);

		stage.timeout(doIntroComplete, 28000);
	}

	let msStart = undefined;
	const MSMAX = 10 * 60 * 1000;
	function to2Digit(value) {
		let s = value.toString();
		if (s.length == 2) return s;
		return '0' + s;
	}

	function tick() {
		let msNow = new Date().getTime();
		let msElapsed = msNow - msStart;
		let msRemaining = MSMAX - msElapsed;

		let secsRemaining = Math.floor(msRemaining / 1000) % 60;
		let minsRemaining = Math.floor(msRemaining / (60 * 1000));
		let jifsRemaining = Math.floor(msRemaining / 10) % 100;

		let timeStamp = to2Digit(minsRemaining) + ':' + to2Digit(secsRemaining) + '.' + to2Digit(jifsRemaining);
		timerText = timeStamp;
	}

	function doIntroComplete() {

		for (const sc of screens) {
			setContent(sc, null);
			sc.selected = sc.on = sc.fail = false;
			sc.s = '*';
		}
		audio.play('select', true);

		msStart = new Date().getTime();
		stage.interval(tick, 20);

		stage.timeout(function () {
			audio.play('music');
		}, 500);
		stage.timeout(nextQuestion, 2500);
	}

	function doTitle(text) {
		const h1 = { text, opacity: 0 };
		titles.push(h1);
		$(h1)
			.animate({ opacity: 1 })
			.delay(1500)
			.animate({ opacity: 0 }, { duration: 500, complete: dump });
	}

	function dump() {
		titles.splice(titles.indexOf(this), 1);
	}

	/* ---------- clicks ---------- */

	let hasStarted = false;
	function onFirstClick() {
		if (!hasStarted) {
			audio.play((iQuestion == -1 || iQuestion == questions.length - 1) ? 'tension' : 'music');
			hasStarted = true;
		}
	}
	$(document).on('click', onFirstClick);

	// a click on a screen (only while the old root had its "enabled" class)
	stage.$el.on('click', function (e) {
		if (!elEnabled || $(e.target).closest('button').length) return;
		const w = IGB.toWorld(e);
		for (const sc of screens) {
			if (w.x >= sc.x && w.x < sc.x + SCREEN_W && w.y >= sc.y && w.y < sc.y + SCREEN_H) {
				onToggle(sc);
				return;
			}
		}
	});

	/* ---------- starting ---------- */

	// index.html?riddler&N starts at question N (?players=… set aside)
	let skipID = window.location.search.substr(1).split('&').filter((p) => !p.includes('='))[1];

	if (skipID != undefined) {
		iQuestion = skipID - 1;
		nextQuestion();
	} else {
		//doIntro();
	}

	self.setPlayers([{ px: .15 }]);

	/* ---------- drawing ---------- */

	const textFont = (size, weight) => `${weight} ${size}px ${FONT}, serif`;

	// Lines of text wrapped at maxW, as the old riddlertext laid them out.
	function wrap(ctx, text, maxW) {
		const out = [];
		for (const para of String(text).split('\n')) {
			const words = para.split(/\s+/).filter(Boolean);
			let line = '';
			for (const w of words) {
				const next = line ? line + ' ' + w : w;
				if (line && ctx.measureText(next).width > maxW) {
					out.push(line);
					line = w;
				} else line = next;
			}
			out.push(line);
		}
		return out;
	}

	// The emoji live on one sheet (assets/riddler/emoji.png): 72 x 72 cells, 13 to a
	// row, in the order of EMOJI (their codes). Drawn colour-inverted, like the rest.
	const EMOJI = ['1F308', '1F31B', '1F31D', '1F324', '1F32A', '1F333', '1F344', '1F349', '1F34E', '1F354', '1F355', '1F357', '1F36D', '1F377', '1F379', '1F37A', '1F383', '1F384', '1F388', '1F3A3', '1F3A8', '1F3A9', '1F3AA', '1F3AC', '1F3B1', '1F3B2', '1F3B3', '1F3B7', '1F3B8', '1F3BA', '1F3BB', '1F3C0', '1F3C8', '1F3CB', '1F3D0', '1F3DB', '1F3E0', '1F3E6', '1F3ED', '1F3F0', '1F40C', '1F414', '1F41D', '1F41F', '1F422', '1F42A', '1F433', '1F446', '1F447', '1F448', '1F449', '1F44F', '1F459', '1F45C', '1F45E', '1F466', '1F468', '1F475', '1F476', '1F4A6', '1F4A7', '1F4B0', '1F4BC', '1F4E6', '1F4FA', '1F4FD', '1F511', '1F514', '1F525', '1F528', '1F534', '1F536', '1F53A', '1F53B', '1F551', '1F56F', '1F573', '1F576', '1F577', '1F5C4', '1F64C', '1F680', '1F681', '1F697', '1F6AA', '1F6B2', '1F6CC', '1F6D6', '1F6DD', '1F6DE', '1F6F5', '1F6F7', '1F6F9', '1F6FC', '1F91A', '1F938', '1F944', '1F94A', '1F95C', '1F968', '1F97E', '1F986', '1F98B', '1F98D', '1F993', '1F9B4', '1F9B7', '1F9C0', '1F9C3', '1F9C8', '1F9D4', '1F9E0', '1F9F6', '1FA87', '1FA91', '1FA99', '1FAB0', '1FAB5', '1FABC', '1FABD', '1FAE7', '2194', '2198', '23FA', '25B6', '25C0', '2602', '2615', '2660', '2663', '2665', '2666', '267E', '26A1', '26BD', '26C4', '26F5', '2708', '2709', '270F', '2744', '274C', '2797', '2B05', '2B06', '2B07', '2B1C', '2B50'];
	const EMOJI_CELL = 72, EMOJI_COLS = 13;
	IGB.image(A + 'emoji.png');   // (start loading the sheet)
	function drawEmoji(ctx, code, x, y, w, h) {
		const i = EMOJI.indexOf(code), img = art.ready(A + 'emoji.png');
		if (i < 0 || !img) return;
		ctx.save();
		ctx.filter = 'invert(100%)';
		ctx.drawImage(img, (i % EMOJI_COLS) * EMOJI_CELL, Math.floor(i / EMOJI_COLS) * EMOJI_CELL, EMOJI_CELL, EMOJI_CELL, x, y, w, h);
		ctx.restore();
	}

	function drawInverted(ctx, src, x, y, w, h) {
		ctx.save();
		ctx.filter = 'invert(100%)';
		art.image(ctx, src, x, y, w, h);
		ctx.restore();
	}

	function drawShadow(ctx, sh, ix, iy, w, h, top) {
		const img = art.ready(A + 'batman-red-fadeout.png');
		if (!img) return;
		const ih = w * img.naturalHeight / img.naturalWidth;
		const x = ix + (sh.left === undefined ? 0 : sh.left / 100 * INNER_W) - w / 2;
		const y = iy + top;
		ctx.save();
		ctx.globalAlpha *= sh.opacity;
		ctx.beginPath();
		ctx.rect(x, y, w, h);
		ctx.clip();
		ctx.drawImage(img, x, y + (h - ih) * sh.posY, w, ih);
		ctx.restore();
	}

	function drawScreen(ctx, sc) {
		art.rect(ctx, sc.x, sc.y, SCREEN_W, SCREEN_H, { fill: '#1D3B0F' });
		const ix = sc.x + SCREEN_BORDER;
		const iy = sc.y + SCREEN_BORDER;
		art.rect(ctx, ix, iy, INNER_W, INNER_H, { fill: sc.fail ? 'red' : sc.on ? 'darkgreen' : 'black' });

		ctx.save();
		ctx.beginPath();
		ctx.rect(ix, iy, INNER_W, INNER_H);
		ctx.clip();

		const c = sc.content;
		const IMG = 3 * VW;
		if (c && c.type == 'emoji') {
			drawEmoji(ctx, c.code, ix + (INNER_W - IMG) / 2, iy + (INNER_H - IMG) / 2, IMG, IMG);
		} else if (c && c.type == 'riddler') {
			const h = 3.5 * VW;
			drawInverted(ctx, c.src, ix + (INNER_W - IMG) / 2, iy + INNER_H - h, IMG, h);
		} else if (c && c.type == 'poker') {
			// height 4vw, bottom -1vw, rotate(10deg) round its centre
			const h = 4 * VW;
			const top = (INNER_H + 1 * VW - h) / 2;
			ctx.save();
			ctx.translate(ix + INNER_W / 2, iy + top + h / 2);
			ctx.rotate(10 * Math.PI / 180);
			drawInverted(ctx, c.src, -IMG / 2, -h / 2, IMG, h);
			ctx.restore();
		} else if (c && c.type == 'text') {
			// riddlertext: 0.7vw on 0.9vw lines, 0.1vw letter-spacing, centred
			// in a box 0.2vw in from each side, top (tweened) to the bottom
			ctx.save();
			ctx.font = textFont(0.7 * VW, 100);
			if ('letterSpacing' in ctx) ctx.letterSpacing = 0.1 * VW + 'px';
			ctx.fillStyle = 'white';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const lh = 0.9 * VW;
			const lines = wrap(ctx, c.text, INNER_W - 0.4 * VW);
			const cy = iy + (c.top + INNER_H) / 2;
			const y0 = cy - (lines.length * lh) / 2 + lh / 2;
			lines.forEach((line, i) => ctx.fillText(line, ix + INNER_W / 2, y0 + i * lh));
			ctx.restore();
		}

		// the players' shadows, after the content (they were appended last)
		for (const p in heads) {
			if (heads[p].screen === sc) drawShadow(ctx, heads[p], ix, iy, 7 * VW, 3 * VW, INNER_H - 3 * VW);
			if (bodies[p].screen === sc) drawShadow(ctx, bodies[p], ix, iy, 7.2 * VW, 7.2 * VW, 0);
		}

		// selected: white corner brackets (the ::after's clipped border)
		if (sc.selected) {
			const bx = ix + 0.2 * VW, by = iy + 0.2 * VW;
			const bw = INNER_W - 0.4 * VW, bh = INNER_H - 0.4 * VW;
			const lw = 0.1 * VW;
			ctx.save();
			ctx.beginPath();
			const cw = bw * 0.15, ch = bh * 0.25;
			ctx.rect(bx, by, cw, ch);
			ctx.rect(bx + bw - cw, by, cw, ch);
			ctx.rect(bx, by + bh - ch, cw, ch);
			ctx.rect(bx + bw - cw, by + bh - ch, cw, ch);
			ctx.clip();
			ctx.strokeStyle = 'white';
			ctx.lineWidth = lw;
			ctx.strokeRect(bx + lw / 2, by + lw / 2, bw - lw, bh - lw);
			ctx.restore();
		}

		ctx.restore();
	}

	function drawBomb(ctx) {
		// riddlerbomb: 7.5vw x 6vw, centred on the front wall, 2.5vw up
		const w = 7.5 * VW, h = 6 * VW;
		const x = sides[1].x + (SIDE_W - w) / 2;
		const y = SIDE_H - 2.5 * VW - h;
		const img = art.ready(A + 'riddler-bomb.png');
		if (img) {
			const ih = w * img.naturalHeight / img.naturalWidth;
			ctx.drawImage(img, x, y + (h - ih) / 2, w, ih);
		}
		// riddlerbombtimer: 5vw x 2vw, a 0.2vw border, centred under top: 0.9vw
		const b = 0.2 * VW;
		const tw = 5 * VW + 2 * b, th = 2 * VW + 2 * b;
		const tx = x + (w - tw) / 2;
		const ty = y + 0.9 * VW + (h - 0.9 * VW - th) / 2;
		art.roundRect(ctx, tx, ty, tw, th, 0.5 * VW, { fill: '#1D3B0F' });
		art.roundRect(ctx, tx + b, ty + b, tw - 2 * b, th - 2 * b, 0.5 * VW - b, { fill: 'black' });
		if (timerText) {
			ctx.save();
			ctx.font = textFont(0.9 * VW, 600);
			ctx.fillStyle = 'white';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(timerText, tx + tw / 2, ty + th / 2);
			ctx.restore();
		}
	}

	self.draw = function (ctx) {

		// the room's #222, and riddler-bg.png across each wall (100% wide, centred, repeating)
		art.rect(ctx, 0, 0, IGB.WIDTH, H, { fill: '#222' });
		const bg = art.ready(A + 'riddler-bg.png');
		if (bg) {
			const ih = SIDE_W * bg.naturalHeight / bg.naturalWidth;
			const y0 = (SIDE_H - ih) / 2;
			for (const side of sides) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(side.x, 0, SIDE_W, SIDE_H);
				ctx.clip();
				for (let y = y0 - ih * Math.ceil(y0 / ih); y < SIDE_H; y += ih) ctx.drawImage(bg, side.x, y, SIDE_W, ih);
				ctx.restore();
			}
		}

		for (const sc of screens) {
			drawScreen(ctx, sc);
			if (sc.glowing != sc.on) {
				sc.glowing = sc.on;
				sc.$glow.css('display', sc.on ? 'block' : 'none');
			}
		}

		drawBomb(ctx);

		// doTitle's h1: 2vw bold, centred on the front wall under its top margin
		for (const t of titles) {
			ctx.save();
			ctx.globalAlpha *= t.opacity;
			ctx.font = textFont(2 * VW, 'bold');
			ctx.fillStyle = 'white';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const lines = wrap(ctx, t.text, SIDE_W);
			lines.forEach((line, i) => ctx.fillText(line, sides[1].x + SIDE_W / 2, 0.67 * 2 * VW + (i + 0.5) * 2 * VW));
			ctx.restore();
		}
	};

	self.fini = function () {
		$(document).off('click', onFirstClick);
		if (font) document.fonts.delete(font);
	};
});
