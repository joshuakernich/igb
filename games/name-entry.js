/*
 * Name Entry
 *
 * Box Party's sign-in. Up to three players at a time, one panel per wall,
 * type their names on an on-screen keyboard, then dress their meep with a
 * shirt and an accessory. When a player is done the next one takes the free
 * wall. Box Party starts it with IGB.start('name-entry', $parent, players,
 * callback) and hears back through the callback once every player is in;
 * on its own it signs in six players.
 *
 * Input: z (left / right walls) and x (front wall) slide each player's meep
 * preview across their panel.
 *
 * The keyboard and the avatar buttons are controls, so they stay DOM in
 * stage.$ui (games/name-entry.css). The panels' colour wash and the meep
 * previews are canvas: one stage.surface per wall, set inside the panel
 * under its controls, so a panel fades as one, as the old DOM did.
 */
IGB.register('name-entry', function NameEntry(stage, playersMeta, callback) {

	const { WIDTH, H } = IGB;
	const art = IGB.art;

	// The old layout was in vw, and the world spans the window's width.
	const VW = WIDTH / 100;
	// The old meep was sized in window px, so its size against the walls
	// depended on the window. This is how it looked in a 1920-wide window.
	const PX = WIDTH / 1920;
	const SIDE = 0.333 * WIDTH;              // each panel (igbside: 33.3%)
	const MEEP_TOP = 14 * VW;                // top of the meep's container

	const SHIRTS = [
		{ url: 'assets/name-entry/avatar-shirt-skeleton.png' },
		{ url: 'assets/name-entry/avatar-shirt-overall.png' },
		{ url: 'assets/name-entry/avatar-shirt-bear.png' },
		{ url: 'assets/name-entry/avatar-shirt-stripes.png' },
		{ url: 'assets/name-entry/avatar-shirt-vest.png' },
		{ url: 'assets/name-entry/avatar-shirt-jocks.png', legs: 'none' },
	];

	const FEATURES = [
		{ url: 'assets/name-entry/avatar-accessory-skirt.png' },
		{ url: 'assets/name-entry/avatar-accessory-bowtie.png' },
		{ url: 'assets/name-entry/avatar-accessory-belt.png' },
		{ url: 'assets/name-entry/avatar-accessory-chain.png' },
		{ url: 'assets/name-entry/avatar-accessory-sash.png' },
		{ url: 'assets/name-entry/avatar-accessory-bust.png' },
	];

	// So the meep wears its new shirt on the frame after the click.
	IGB.preload(SHIRTS.concat(FEATURES).map((x) => x.url));

	/* ---------- the panels' art ---------- */

	// A colour at zero alpha, for gradients that fade it out.
	const probe = document.createElement('canvas').getContext('2d');
	function clear(color) {
		probe.fillStyle = color;
		const hex = probe.fillStyle;
		return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0)`;
	}

	// The meep preview. pos holds the old CSS meep's numbers: top (window
	// px below the container), left (% of the panel's width) and its
	// transform's scale, which pivoted on the feet.
	function MeepPreview(nPlayer, top) {
		const meep = new Meep(nPlayer);
		meep.setHeight(300);
		meep.pos = { top: top, left: 0, scale: 1 };
		return meep;
	}

	// meep.$el.css({ left: 50 * x * 0.3 + '%' }): before the tracker reports,
	// x is undefined and the browser ignored the NaN, so the meep stays put.
	function setLeft(meep, left) {
		if (isFinite(left)) meep.pos.left = left;
	}

	// Each panel paints on a canvas inside its own DOM, under its controls,
	// as the old panel's background and meep did, so that when jQuery fades
	// the panel, the whole panel fades as one picture (the DOM's group
	// opacity), keys and all. One canvas per wall, reused by each panel that
	// takes the wall.
	const surfaces = [];

	function panelSurface(nSlot, $el) {
		if (!surfaces[nSlot]) surfaces[nSlot] = stage.surface(SIDE, H);
		surfaces[nSlot].$el.prependTo($el);
		return surfaces[nSlot];
	}

	// nameentryplayer[n] { background: linear-gradient(to bottom, var(--nN), transparent) },
	// with the meep preview standing in it.
	function drawPanel(surface, nPlayer, meep) {
		const ctx = surface.ctx;
		surface.clear();
		const color = PLAYER_COLORS[nPlayer];
		art.rect(ctx, 0, 0, SIDE, H, { fill: art.linear(ctx, 0, 0, 0, H, [color, clear(color)]) });
		meep.x = SIDE / 2 + meep.pos.left / 100 * SIDE;
		meep.y = MEEP_TOP + meep.pos.top * PX;
		meep.scale = PX * meep.pos.scale;
		meep.draw(ctx);
	}

	/* ---------- the avatar picker ---------- */

	const AvatarEntryPlayer = function (nPlayer, nSlot, human, callback) {

		const audio = stage.audio();
		audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
		audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);

		const self = this;
		self.$el = $('<nameentryplayer>').attr('n', nPlayer);
		const surface = panelSurface(nSlot, self.$el);

		$('<nameentryinput class="complete">').appendTo(self.$el).text(human.name);

		const meep = MeepPreview(nPlayer, 300);
		self.meep = meep;

		// transition: top 1s, transform 1s
		stage.timeout(function () {
			$(meep.pos).animate({ top: 100, scale: 0.3 }, { duration: 1000, easing: 'ease' });
		}, 500);

		const $left = $('<avatarbuttonset>').appendTo(self.$el);
		const $right = $('<avatarbuttonset>').appendTo(self.$el);

		if (nSlot == 0) $left.css({ left: '5%' });
		if (nSlot == 2) $right.css({ right: '5%' });

		for (const s in SHIRTS) {
			$('<avatarbutton>').appendTo($left).css({
				'background-image': `url(${SHIRTS[s].url})`,
				'background-color': `var(--player-${nPlayer})`,
			}).on('click', function () {

				audio.play('blip', true);

				$left.find('avatarbutton').removeClass('selected');
				$(this).addClass('selected');

				meep.body.image = SHIRTS[s].url;
				meep.body.color = PLAYER_COLORS[nPlayer];

				if (SHIRTS[s].legs == 'none') {
					meep.legs.color = 'white';
				} else {
					meep.legs.color = PLAYER_COLORS[nPlayer];
				}
			});
			if (s == 2) $('<br>').appendTo($left);
		}

		for (const f in FEATURES) {
			const $btn = $('<avatarbutton>').appendTo($right).on('click', function () {

				audio.play('blip', true);

				$right.find('avatarbutton').removeClass('selected');
				$(this).addClass('selected');

				meep.accessory.image = FEATURES[f].url;
			});

			$('<avatarfeature>').appendTo($btn).css({
				'background-image': `url(${FEATURES[f].url})`,
			});

			if (f == 2) $('<br>').appendTo($right);
		}

		$('<nameentrybutton class="done">').appendTo(self.$el).on('click', onComplete);

		function onComplete() {
			audio.play('correct');
			const $letter = $(this);
			$letter.addClass('tapped');

			self.$el.css({ 'pointer-events': 'none' }).delay(500).animate({
				opacity: 0,
			});

			stage.timeout(function () {
				callback(self);
			}, 1000);
		}

		self.redraw = function () {
			const x = [human.z, human.x, -human.z][nSlot];
			setLeft(meep, 50 * x * 0.3);
		};

		self.draw = function () {
			drawPanel(surface, nPlayer, meep);
		};

		self.redraw();
	};

	/* ---------- the keyboard ---------- */

	const NameEntryPlayer = function (nPlayer, nSlot, human, callback) {

		const ALPHABET = 'qwertyuiop|asdfghjkl|zxcvbnm';

		const audio = stage.audio();
		audio.add('blip', 'assets/shared/sfx-select.mp3', 0.3);
		audio.add('correct', 'assets/shared/sfx-correct.mp3', 0.3);

		const self = this;
		self.$el = $('<nameentryplayer>').attr('n', nPlayer);
		const surface = panelSurface(nSlot, self.$el);
		const $input = $('<nameentryinput>').appendTo(self.$el).text('Enter your name');

		self.nPlayer = nPlayer;
		self.text = '';
		function onLetter() {
			audio.play('blip', true);
			const $letter = $(this);

			const letter = $letter.attr('letter');

			if (self.text.length < 14) self.text = self.text + letter;
			else $input.animate({ left: -0.5 * VW }, 50).animate({ left: 0.5 * VW }, 50).animate({ left: -0.5 * VW }, 50).animate({ left: 0.5 * VW }, 50).animate({ left: 0 }, 50);

			$input.text(self.text);

			$letter.addClass('tapped');
			stage.timeout(function () { $letter.removeClass('tapped'); });
		}

		function onBackspace() {
			audio.play('blip', true);
			self.text = self.text.substr(0, self.text.length - 1);
			$input.text(self.text);

			const $letter = $(this);
			$letter.addClass('tapped');
			stage.timeout(function () { $letter.removeClass('tapped'); });
		}

		function onComplete() {
			audio.play('correct');
			const $letter = $(this);
			$letter.addClass('tapped');

			$input.addClass('complete');

			self.$el.css({ 'pointer-events': 'none' });

			stage.timeout(function () {
				callback(self);
			}, 500);
		}

		for (let i = 0; i < ALPHABET.length; i++) {
			if (ALPHABET[i] == '|') $('<br>').appendTo(self.$el);
			else $('<nameentrybutton>').appendTo(self.$el).text(ALPHABET[i].toUpperCase()).attr('letter', ALPHABET[i].toUpperCase()).on('click', onLetter);
		}

		$('<nameentrybutton>').appendTo(self.$el).text('←').on('click', onBackspace);

		$('<nameentrybutton class="done">').appendTo(self.$el).on('click', onComplete);

		const meep = MeepPreview(nPlayer, 500);
		self.meep = meep;
		$(meep.pos).delay(500).animate({
			top: 290,
		}, 400).animate({
			top: 300,
		}, 200);

		self.$el.css({
			opacity: 0,
		}).animate({
			opacity: 1,
		});

		self.redraw = function () {
			const x = [human.z, human.x, -human.z][nSlot];
			setLeft(meep, 50 * x * 0.3);
		};

		self.draw = function () {
			drawPanel(surface, nPlayer, meep);
		};
	};

	/* ---------- flow ---------- */

	const audio = stage.audio();
	audio.add('name-entry', 'assets/name-entry/speech-name-entry.mp3', 0.3);
	audio.add('avatar-entry', 'assets/name-entry/speech-avatar-entry.mp3', 0.3);

	const self = this;
	const $root = $('<nameentry>').appendTo(stage.$ui);

	const $sides = [];
	for (let i = 0; i < 3; i++) {
		$sides[i] = $('<igbside>').appendTo($root);
	}

	const humans = [{}, {}, {}, {}, {}, {}];
	const slots = [];
	let nPlayer = -1;

	function doNextEntry() {

		nPlayer++;
		let nSlot = 0;
		while (slots[nSlot]) nSlot++;

		// Don't use the middle slot for 2 players
		if (playersMeta.length == 2 && nSlot == 1) nSlot = 2;

		slots[nSlot] = new NameEntryPlayer(nPlayer, nSlot, humans[nPlayer], onNameEntryComplete);
		slots[nSlot].$el.appendTo($sides[nSlot]);
	}

	let isFirstNameEntry = true;
	function onNameEntryComplete(entry) {

		if (isFirstNameEntry) audio.play('avatar-entry');
		isFirstNameEntry = false;

		const nSlot = slots.indexOf(entry);
		slots[nSlot].$el.remove();

		humans[entry.nPlayer].name = playersMeta[entry.nPlayer].name = entry.text;

		slots[nSlot] = new AvatarEntryPlayer(entry.nPlayer, nSlot, humans[entry.nPlayer], onAvatarEntryComplete);
		slots[nSlot].$el.appendTo($sides[nSlot]);
	}

	function onAvatarEntryComplete(entry) {

		const nSlot = slots.indexOf(entry);
		slots[nSlot].$el.remove();
		slots[nSlot] = undefined;

		if (nPlayer < playersMeta.length - 1) {
			doNextEntry();
		} else {
			let isComplete = true;
			for (const s in slots) if (slots[s]) isComplete = false;
			if (isComplete) {
				clearInterval(interval);
				// Played on its own there is no callback (the old one threw here).
				if (callback) callback();
			}
		}
	}

	const interval = stage.interval(function () {
		for (const s in slots) if (slots[s]) slots[s].redraw();
	});

	if (!playersMeta) playersMeta = [{}, {}, {}, {}, {}, {}];

	while (slots.length < Math.min(3, playersMeta.length)) doNextEntry();

	stage.timeout(function () {
		audio.play('name-entry');
	}, 500);

	// Each panel repaints its own canvas; the world canvas stays empty.
	self.draw = function () {
		for (const s in slots) if (slots[s]) slots[s].draw();
	};

	self.setPlayers = function (p) {
		for (const h in humans) {
			humans[h].z = p[h].z;
			humans[h].x = p[h].x;
		}
	};

	self.fini = function () {
		for (const s in slots) if (slots[s]) $(slots[s].meep.pos).stop(true);
	};
});
