/*
 * CSS 3D boxes, used by Box Party and the finale.
 *
 *   Cube3D(transform, color, surfaces)
 *     A box built from six DOM faces. transform: { w, h, d, altitude };
 *     surfaces: CSS backgrounds for [back, right, front, left, bottom, top]
 *     (a falsy entry leaves that face out). Call redraw() after changing
 *     transform. face('front') returns a face's surface element.
 *
 *   BoxCube(nCube, transform, game, dir, audio)
 *     A Box Party mystery box with a face, that spins to reveal a game.
 *     transform also takes x, y, rx, ry, rz. game is a manifest entry (its
 *     box skin and name). audio, optional: a player from stage.audio(),
 *     so its rumble stops with the game.
 *
 * Styled by shared/cube.css.
 */
window.Cube3D = function (transform, color, surfaces) {

	// back right front left bottom top
	if (!surfaces) surfaces = ['black', 'black', 'black', 'black', 'black', 'black'];

	const self = this;
	self.$el = $('<cube-3d>');

	const SIDES = [
		{ name: 'back', w: 'w', h: 'h', css: (t) => `translateZ(${-t.d / 2}px)` },
		{ name: 'right', w: 'd', h: 'h', css: (t) => `translateX(${t.w / 2}px) rotateY(90deg)` },
		{ name: 'front', w: 'w', h: 'h', css: (t) => `translateZ(${t.d / 2}px)` },
		{ name: 'left', w: 'd', h: 'h', css: (t) => `translateX(${-t.w / 2}px) rotateY(90deg)` },
		{ name: 'bottom', w: 'w', h: 'd', css: (t) => `translateY(${t.h / 2}px) rotateX(90deg)` },
		{ name: 'top', w: 'w', h: 'd', css: (t) => `translateY(${-t.h / 2}px) rotateX(90deg)` },
	];

	self.reskin = function (color, surfaces) {
		self.$el.empty();
		SIDES.forEach(function (side, i) {
			if (!surfaces[i]) return;
			const $side = $('<cube-side>').addClass(side.name).appendTo(self.$el);
			$('<cube-surface>').appendTo($side).css({ background: surfaces[i], 'border-color': color });
		});
		self.redraw();
	};

	self.face = function (name) {
		return self.$el.find(`cube-side.${name} cube-surface`);
	};

	self.redraw = function () {
		self.$el.css({ transform: `translateZ(${transform.altitude}px) rotateX(-90deg)` });
		for (const side of SIDES) {
			const $side = self.$el.find(`cube-side.${side.name}`);
			$side.css({ transform: side.css(transform) });
			$side.find('cube-surface').css({ width: transform[side.w] + 'px', height: transform[side.h] + 'px' });
		}
	};

	self.reskin(color, surfaces);
};

window.BoxCube = function (nCube, transform, game, dir, player) {

	const self = this;

	const audio = player || new AudioPlayer();
	audio.add('reveal', 'assets/shared/sfx-reveal.mp3', 0.3);
	audio.add('rumble', 'assets/shared/sfx-rumble.mp3', 0.1, true);

	const PALETTE = ['#37CCDA', '#8DE968', '#FEE955', '#FEB850', '#FD797B'];
	const color = PALETTE[nCube % PALETTE.length];
	const skin = (game && game.box) || {};

	self.game = game;
	self.transform = transform;
	self.transformCache = Object.assign({}, transform);
	self.openX = 0;
	self.openY = 0;

	self.$el = $('<box-cube>');

	$('<box-cube-shadow>').appendTo(self.$el).css({ width: transform.w + 'px', height: transform.d + 'px' });
	const $message = $('<box-message>').appendTo(self.$el).text('High Energy');

	const box = new Cube3D(transform, 'white', [color, color, color, color, color, color]);
	box.$el.appendTo(self.$el).css({ top: '0px', left: '0px', transform: 'rotateX(-90deg)' });

	const $face = $(`
		<box-face>
			<box-eye></box-eye>
			<box-eye></box-eye>
			<box-mouth></box-mouth>
		</box-face>`).appendTo(box.face('front'));

	const $flag = $(`<box-flag><box-flag-text></box-flag-text></box-flag>`);
	$flag.find('box-flag-text').text(skin.note || '');

	self.redraw = function () {
		const t = self.transform;
		self.$el.css({
			transform: `translateX(${t.x}px) translateY(${-t.y}px) translateZ(1px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) rotateZ(${t.rz}deg)`,
		});

		self.$el.find('box-mouth').css({
			top: 100 - 100 * self.openY + '%',
			left: 50 - 50 * self.openX + '%',
			right: 50 - 50 * self.openX + '%',
		});
		self.$el.find('box-eye').eq(0).css({
			top: 40 - self.openY / 2 * 40 + '%',
			left: 20 - self.openX * 20 + '%',
		});
		self.$el.find('box-eye').eq(1).css({
			top: 40 - self.openY / 2 * 40 + '%',
			right: 20 - self.openX * 20 + '%',
		});

		$message.css({
			left: dir === 1 ? `${t.w / 2}px` : 'auto',
			right: dir === -1 ? `${t.w / 2}px` : 'auto',
			transform: `translateY(${-t.d / 2}px) translateZ(${t.altitude - t.d / 2}px) rotateX(-90deg)`,
		});

		box.redraw();
	};

	// Show the game this box holds: its skin on the sides, its name on the front.
	self.showGameSkin = function (showFace = false) {
		box.reskin(skin.color, [skin.bg, skin.bg, skin.bg, skin.bg, skin.color, skin.color]);
		const $front = box.face('front');
		$face.appendTo($front);
		$('<box-header>').appendTo($front).text(skin.name !== undefined ? skin.name : game.name);
		if (!showFace) $face.find('box-eye').hide();
		if (skin.note) $flag.appendTo($front);
	};

	// Shrink, spin up, then pop back out wearing the game's skin.
	self.revealGame = function () {
		audio.play('rumble', true);
		$(self.transform).animate({
			altitude: self.transform.altitude + 150,
			w: 100,
			h: 100,
			d: 100,
			rz: 540,
		}, 2500 + Math.random() * 500).animate({
			w: self.transform.w,
			h: self.transform.h,
			d: self.transform.d,
			rz: 720 + self.transform.rz,
		}, {
			duration: 500,
			start: function () {
				audio.stop('rumble');
				audio.play('reveal', true);
				self.showGameSkin();
			},
			complete: function () {
				self.transform.rz = self.transformCache.rz;
			},
		});
	};
};
