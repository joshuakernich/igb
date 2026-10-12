/*
 * HUD — the shared heads-up display: squad size picker, timer, player
 * scores, banners, round headers, tutorials and the final podium.
 *
 *   const hud = new HUD('#FDC972');    // the theme colour for banners and streams
 *   hud.$el.appendTo(stage.$ui);
 *   hud.initPlayerCount(count => ...);
 *
 * It is DOM, styled by shared/hud.css. Positions passed to flashMessage and
 * tutorial notes are in walls: x 0..3 across the three walls, y 0..1 down.
 */
window.HUD = function (colour = '#40B0ED') {

	const THICC = 40;
	const RANK = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

	const audio = new AudioPlayer();
	audio.add('charge', 'assets/shared/sfx-charge.mp3', 0.3);
	audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
	audio.add('tick', 'assets/shared/sfx-tick.mp3', 0.3);
	audio.add('tock', 'assets/shared/sfx-tock.mp3', 0.3);
	audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
	audio.add('music', 'assets/shared/music-tutorial.mp3', 0.3);
	audio.add('music-drama', 'assets/shared/music-drama.mp3', 0.3);
	audio.add('outro', 'assets/shared/music-drumroll.mp3', 0.3);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.05);
	audio.add('woosh-long', 'assets/shared/sfx-woosh-long.mp3', 0.05);
	for (let i = 1; i <= 5; i++) audio.add(String(i), `assets/shared/speech-${i}.mp3`, 0.3);

	const self = this;
	self.audio = audio;
	self.$el = $('<hud-root>').css('--hud-colour', colour);

	const $intro = $('<hud-tutorial>').appendTo(self.$el);
	const $tutorial = $('<hud-tutorial>').appendTo(self.$el);
	const $banner = $('<hud-banner>').appendTo(self.$el);
	const $debug = $('<hud-debug>').appendTo(self.$el);
	const $mg = $('<hud-layer>').appendTo(self.$el);
	const $fg = $('<hud-layer>').appendTo(self.$el);

	/* ---------- banner ---------- */

	function setBanner(show, isTransparent) {
		const location = isTransparent ? 300 : 175;
		if (show) {
			// Rise from below to just above its resting place, then hold.
			$banner.css({ top: '100%' }).animate({ top: location - 50 + 'px' }).delay(400);
			$banner.toggleClass('transparent', !!isTransparent);
		} else {
			// Hold for a beat, then fly off the top.
			$banner.delay(400).animate({ top: '-40%' });
		}
	}

	self.initBanner = function (msg, size = 'p') {
		audio.play('woosh-long', true);
		setBanner(true);
		$banner.html(`<${size}>${msg}</${size}>`);
	};

	self.finiBanner = function () {
		IGB.later(function () { audio.play('woosh-long', true); }, 300);
		setBanner(false);
	};

	/* ---------- squad size ---------- */

	self.initPlayerCount = function (callback) {
		setBanner(true);
		$('<p>').text('How big is your squad?').appendTo($banner);
		$('<hud-spacer>').appendTo($banner);
		for (let p = 2; p <= 6; p++) {
			$('<button>').attr('count', p).text(p).appendTo($banner).on('click', function () {
				callback(parseInt($(this).attr('count'), 10));
				setBanner(false);
			});
		}
	};

	/* ---------- timer ---------- */

	let interval;
	let isTimerRevealed = false;
	let format = (s) => s;

	self.revealTimer = function (seconds, formatter) {
		if (formatter) format = formatter;
		audio.play('woosh-long', true);
		$timer.text(format(seconds));
		if (isTimerRevealed) return;
		isTimerRevealed = true;
		$streamTimer.show();
		$streamTop.css({ left: '100px' }).animate({ left: '0px' });
		$streamTimer.animate({ top: '10px' }, 400).animate({ top: '0px' }, 100);
	};

	// Count down from `seconds`, ticking (and saying the number, if
	// announceTime) through the last five, then call callback. formatter,
	// optional, turns the seconds left into the text shown.
	self.initTimer = function (seconds, callback, announceTime = true, formatter) {
		self.revealTimer(seconds, formatter || ((s) => s));
		const timeStart = new Date().getTime();
		let secondsWas = seconds + 1;
		interval = IGB.every(function () {
			const elapsed = new Date().getTime() - timeStart;
			const remaining = Math.ceil(seconds - elapsed / 1000);
			$timer.text(format(remaining));
			if (remaining < secondsWas && remaining <= 5) {
				secondsWas = remaining;
				if (remaining === 0) audio.play('tock', true);
				else {
					audio.play('tick', true);
					if (announceTime) audio.play(String(remaining), true);
				}
			}
			if (remaining === 0) {
				self.clearTimer();
				callback();
			}
		}, 1000 / 50);
	};

	self.finiTimer = function () {
		clearInterval(interval);
		audio.play('woosh-long', true);
		isTimerRevealed = false;
		$streamTimer.animate({ top: -150 }, {
			duration: 500,
			complete: function () {
				$streamTimer.hide();
				$streamTop.css({ left: '-100px' }).animate({ left: '0px' });
			},
		});
	};

	self.clearTimer = function () {
		clearInterval(interval);
	};

	/* ---------- big text ---------- */

	// A word that pops up at (x walls, y 0..1), holds, then fades.
	self.flashMessage = function (x, y, msg, size, time = undefined, n = '-1') {
		const $msg = $('<hud-text class="flash">').html(msg);
		if (time === undefined) time = Math.max(String(msg).length * 100, 500);
		$msg.attr('player', n).appendTo($fg).css({
			left: x * 100 / 3 + '%',
			top: (y + 0.1) * 100 + '%',
			position: 'absolute',
			'font-size': size + 'px',
			transform: 'translate(-50%, -50%) rotate(-5deg)',
			'--drop': Math.min(20, size * 0.3) + 'px',
		}).animate({
			top: y * 100 + '%',
		}, 200).delay(time).animate({
			opacity: 0,
		}, 500);
	};

	// Letters that whoosh in one by one.
	const FancyHeader = function (msg, size = 200) {
		const self = this;
		self.$el = $('<hud-text>').css({ 'font-size': size + 'px' });
		const $chars = [];
		for (let m = 0; m < msg.length; m++) {
			IGB.later(function () { audio.play('woosh', true); }, m * 100);
			const $char = $('<span>').appendTo(self.$el).text(msg[m]);
			$char.css({ position: 'relative', left: '500px', opacity: 0 })
				.delay(m * 100).animate({ left: '-30px', opacity: 1 }, 300)
				.animate({ left: '0px' }, 200);
			$chars[m] = $char;
		}
		self.fini = function () {
			for (let c = 0; c < $chars.length; c++) {
				IGB.later(function () { audio.play('woosh', true); }, c * 50);
				$chars[c].delay(($chars.length - c) * 50)
					.animate({ top: '20px' }, 300)
					.animate({ top: '-500px', opacity: 0 }, 300);
			}
		};
	};

	self.initRound = function (n, max, msg = undefined) {
		if (msg === undefined) msg = `Round ${n + 1} of ${max}`;
		setBanner(true, true);
		$banner.empty();
		new FancyHeader(msg).$el.appendTo($banner);
		const $pips = $('<hud-pips>').appendTo($banner);
		for (let i = 0; i < max; i++) {
			$('<hud-pip>').appendTo($pips).attr('fill', i <= n).attr('highlight', i === n);
		}
	};

	/* ---------- players ---------- */

	const huds = [];

	// meeps: anything with a score. Shows a head and score per player.
	self.initPlayers = function (meeps) {
		for (let i = 0; i < meeps.length; i++) {
			const hud = new HUD.Player(i, meeps[i]);
			hud.$el.appendTo($streamTop);
			huds[i] = hud;
		}
		$streamTop.show().animate({ top: '0px' });
	};

	self.updatePlayers = function (meeps, toFixed = undefined) {
		if (huds.length) for (let i = 0; i < meeps.length; i++) if (huds[i]) huds[i].redraw(meeps[i].score, toFixed);
	};

	// Banner listing who steps forward (arrIn) and who steps back.
	self.summonPlayers = function (arrIn) {
		audio.play('woosh-long', true);
		setBanner(true);
		$banner.empty();

		const arrOut = [];
		for (let h = 0; h < huds.length; h++) {
			if (arrIn.indexOf(h) === -1) arrOut.push(h);
			huds[h].setActive(arrIn.indexOf(h) > -1);
		}

		if (arrIn && arrIn.length) {
			const $in = $('<hud-summon class="in">');
			for (const n of arrIn) new MeepHead(n).$el.appendTo($in);
			$('<h2>').text('Step Forward').appendTo($in);
			$banner.append($in);
		}

		if (arrOut.length) {
			const $out = $('<hud-summon class="out">');
			for (const n of arrOut) new MeepHead(n).$el.appendTo($out);
			$('<h2>').text('Step Back').appendTo($out);
			$banner.append($out);
		}
	};

	const RADIUS = 60;
	self.swapPlayers = function (nIn, nOut) {
		setBanner(true, true);
		$banner.empty();
		const $swap = $('<hud-swap>').appendTo($banner);
		const $in = new MeepHead(nIn).$el.appendTo($swap);
		const $out = new MeepHead(nOut).$el.appendTo($swap);
		$('<h1>').appendTo($swap).text('SWAP');

		const anim = { r: 0, p: 0 };
		function redraw() {
			$out.css({
				left: Math.cos(anim.r) * RADIUS,
				top: Math.sin(anim.r) * RADIUS,
				transform: 'translate(-50%, -50%) scale(' + (0.5 + anim.p * 0.5) + ')',
			});
			$in.css({
				left: Math.cos(anim.r) * -RADIUS,
				top: Math.sin(anim.r) * -RADIUS,
				transform: 'translate(-50%, -50%) scale(' + (1 - anim.p * 0.5) + ')',
			});
		}
		redraw();
		$(anim).delay(1000).animate({ r: Math.PI, p: 1 }, { duration: 1000, step: redraw });
	};

	/* ---------- tutorials ---------- */

	// A sticky note with an instruction and an optional pose icon:
	// align, around, side-to-side, touch, up-down, watch.
	const TutorialNote = function (bean) {
		const msg = bean.msg.replace(/<br\s*\/?>/gi, ' ');
		this.$el = $('<hud-note>').css({
			left: bean.x * 100 / 3 + '%',
			top: bean.y * 100 + '%',
		}).text(msg);
		if (bean.icon) {
			this.$el.append('<br>');
			$('<img>').attr('src', `assets/shared/tutorial-${bean.icon}.png`).appendTo(this.$el);
		}
	};

	// name, then notes: { x, y, msg, icon }
	self.initTutorial = function (name, ...notes) {
		audio.play('music');
		new FancyHeader(name, 100).$el.appendTo($tutorial).addClass('title');
		notes.forEach(function (bean, t) {
			new TutorialNote(bean).$el.appendTo($tutorial)
				.css({ opacity: 0 })
				.delay(1500 + t * 500)
				.animate({ opacity: 1 });
		});
	};

	self.finiTutorial = function () {
		audio.stop('music');
		$tutorial.empty();
	};

	/* ---------- intro and finale ---------- */

	// The Box Party style intro: a header and the coin standings.
	self.initIntro = function (name, players) {
		audio.play('music-drama', true);
		$('<hud-final-bg>').appendTo($intro).delay(19000).animate({ opacity: 0 });

		IGB.later(function () {
			new FancyHeader(name, 100).$el.appendTo($tutorial).addClass('title');
		}, 2000);

		const tally = new Tally(players);
		tally.$el.appendTo($intro).css({ left: '42%', top: '250px' })
			.delay(18000).animate({ opacity: 0 });
		IGB.later(tally.showRows, 6000);
	};

	self.finiIntro = function () {
		$intro.empty();
	};

	// A player standing on a podium whose height shows their finish.
	const Podium = function (n, score, rank, reward, height) {
		height += 0.3;
		const h = 350 * height;
		const time = height * 4000;

		this.$el = $('<hud-podium>');
		const view = new MeepView(n);
		view.$el.appendTo(this.$el).css({ left: '50%', top: '-20px' });

		const $reward = $('<hud-reward>').appendTo(this.$el).text('+' + reward);
		$('<hud-coin>').appendTo($reward);
		const $rank = $('<hud-rank>').appendTo(this.$el);

		this.$el.css({ height: h + 'px', top: h + 'px' }).delay(500).animate({ top: '0px' }, {
			duration: time,
			easing: 'linear',
			complete: function () {
				IGB.later(function () {
					audio.play('blip', true);
					$rank.text(RANK[rank]).addClass('ranked');
				}, 100);
			},
		});

		$reward.css({ opacity: 0, top: '-200px' }).delay(7000 + height * 800).animate({
			opacity: 1,
			top: '-250px',
		}, {
			duration: 200,
			start: function () { audio.play('coin', true); },
		});
	};

	self.showFinalScores = function (scores, rewards) {
		$('<hud-final-bg>').appendTo($mg).css({ opacity: 0 }).animate({ opacity: 1 }, 1000);
		audio.play('outro', true);
		for (const h of huds) if (h) h.setActive(true);

		const ranks = rewards.map((a) => rewards.filter((b) => a < b).length);
		const $podiums = $('<hud-podiums>').appendTo($mg);
		for (let r = 0; r < rewards.length; r++) {
			const h = (rewards.length - ranks[r] - 1) / (rewards.length - 1);
			new Podium(r, scores[r], ranks[r], rewards[r], h).$el.appendTo($podiums);
		}
	};

	/* ---------- debug buttons ---------- */

	self.addDebug = function (name, fn) {
		$('<button>').text(name).appendTo($debug).on('click', fn);
	};

	/* ---------- the streams along the top ---------- */

	// A coloured ribbon with angled ends. `ends` are the two SVG paths.
	function stream(className, h, left, right) {
		return $(`
			<hud-stream class="${className}">
				<svg width="20" height="${h}" class="end left">${left}</svg>
				<svg width="20" height="${h}" class="end right">${right}</svg>
			</hud-stream>`);
	}
	function shaded(d) {
		return `<path d="${d}" class="fill"/><path d="${d}" fill="rgba(0,0,0,0.2)"/>`;
	}

	const $topline = $('<hud-topline>').appendTo(self.$el);

	const tab = 'M0,40 L20,0 L20,80 L0,80';
	const $streamTop = stream('', THICC * 2, shaded(tab), shaded(tab)).appendTo($topline).css({ top: '-200px' }).hide();

	const h = THICC * 2.5;
	const $streamTimer = stream('large', h,
		shaded(`M0,0 L20,0 L20,${h} L0,${THICC}`),
		shaded(`M0,0 L20,0 L20,${THICC} L0,${h}`)
	).appendTo($topline).css({ top: '-200px' }).hide();

	const $timer = $('<hud-timer>60</hud-timer>').appendTo($streamTimer);

	self.redraw = function (sec = 0) {
		$timer.text(sec);
	};
	self.redraw();

	self.fini = function () {
		self.clearTimer();
		audio.stopAll();
	};
};

// Seconds as m:ss, for long timers: hud.initTimer(600, done, true, HUD.minutes)
HUD.minutes = function (s) {
	s = Math.max(0, s);
	return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

// One player's head and score in the stream along the top.
HUD.Player = function (n, meep, type) {
	const self = this;
	self.$el = $(`<hud-player player=${n}>`).attr('type', type || null);
	const $score = $('<hud-score>').text(Math.floor(meep.score || 0)).appendTo(self.$el);
	new MeepHead(n).$el.appendTo(self.$el);

	self.redraw = function (score, toFixed = undefined) {
		if (toFixed) score = score.toFixed(toFixed);
		$score.text(score);
	};

	self.setActive = function (b) {
		self.$el.css({ opacity: b ? 1 : 0.5 });
	};
};
