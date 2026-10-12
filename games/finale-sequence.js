/*
 * Finale Sequence
 *
 * The awards show that closes a session, played to the room rather than by
 * it. A rainbow backdrop fills all three walls; after the host's intro the
 * coin table slides in on the front wall, a last round of random coins is
 * added and the rows re-rank, then the winner is announced, their avatar
 * flies up the front wall and the room fades to black. It never completes.
 *
 * The file also carries a longer, place-by-place version (doNextPlace to
 * doReveal: a talking cube, a vortex, an explosion) that the old game had
 * switched off; it is kept, still switched off, below doIntro.
 *
 * Input: x (moves the avatars while they are hidden), py (stored, unused).
 */
IGB.register('finale-sequence', function FinaleSequenceGame(stage, playersMeta) {

	const { W, H } = IGB;
	const art = IGB.art;
	const FPS = 50;

	const BG = 'assets/shared/bg-rainbow.png';
	const VORTEX = 'assets/finale-sequence/bg-vortex.gif';

	/* ---------- the explosion (long version only) ---------- */

	// A flash that swells and shrinks away, with six puffs of smoke thrown
	// outwards. (left, top) is its centre; the parts sit relative to it, as
	// the old elements did inside their zero-sized container.
	const FinaleExplosion = function (size, color) {

		const self = this;
		self.left = 0;
		self.top = 0;

		const ball = { width: size, height: size, opacity: 0.9 };
		$(ball).animate({
			width: size * 1.5,
			height: size * 1.5,
		}, 200).delay(200).animate({
			width: 0,
			height: 0,
			opacity: 0,
		}, 1000);

		const smokes = [];
		for (let i = 0; i < 6; i++) {
			const sizeSmoke = 20 + Math.random() * 20;
			const r = Math.random() * Math.PI * 2;
			const smoke = {
				width: sizeSmoke,
				height: sizeSmoke,
				left: Math.cos(r) * size / 2 * Math.random(),
				top: Math.sin(r) * size / 2 * Math.random(),
				opacity: 1,
			};
			smokes.push(smoke);
			$(smoke).animate({
				left: Math.cos(r) * (size * 1.5) / 2,
				top: Math.sin(r) * (size * 1.5) / 2,
				width: sizeSmoke * 2,
				height: sizeSmoke * 2,
			}, 200 + Math.random() * 100).animate({
				left: Math.cos(r) * (size * 2) / 2,
				top: Math.sin(r) * (size * 2) / 2,
				width: sizeSmoke,
				height: sizeSmoke,
				opacity: 0,
			}, 1000);
		}

		self.draw = function (ctx) {
			ctx.save();
			ctx.translate(self.left, self.top);
			art.ellipse(ctx, 0, 0, ball.width / 2, ball.height / 2, { fill: color, alpha: ball.opacity });
			for (const s of smokes) {
				art.ellipse(ctx, s.left, s.top, s.width / 2, s.height / 2, { fill: 'white', alpha: s.opacity });
			}
			ctx.restore();
		};
	};

	const self = this;

	const audio = stage.audio();
	audio.add('intro', 'assets/finale-sequence/speech-finale-intro.mp3', 0.5);
	audio.add('last', 'assets/finale-sequence/speech-finale-last.mp3', 0.5);
	audio.add('second-to-last', 'assets/finale-sequence/speech-finale-second-to-last.mp3', 0.5);
	audio.add('middle', 'assets/finale-sequence/speech-finale-middle.mp3', 0.5);
	audio.add('third', 'assets/finale-sequence/speech-finale-third.mp3', 0.5);
	audio.add('second', 'assets/finale-sequence/speech-finale-second.mp3', 0.5);
	audio.add('winner', 'assets/finale-sequence/speech-finale-winner.mp3', 0.5);
	audio.add('reward', 'assets/finale-sequence/speech-finale-reward.mp3', 0.5);
	audio.add('outro', 'assets/finale-sequence/music-outro.mp3', 0.3);
	audio.add('music', 'assets/finale-sequence/music-awards.mp3', 0.25);
	audio.add('reveal', 'assets/finale-sequence/music-reveal.mp3', 0.5);
	audio.add('explode', 'assets/shared/sfx-explode.mp3', 0.4);
	audio.add('woosh', 'assets/shared/sfx-woosh.mp3', 0.1);
	audio.add('fall', 'assets/shared/sfx-fall.mp3', 0.3);

	const SEQUENCE = [
		undefined,
		undefined,
		['second', 'winner'],
		['last', 'second', 'winner'],
		['last', 'second-to-last', 'second', 'winner'],
		['last', 'second-to-last', 'middle', 'second', 'winner'],
		['last', 'second-to-last', 'middle', 'third', 'second', 'winner'],
	];

	/* ---------- the cube ---------- */

	// The talking cube stands on a purple platform laid flat in a CSS 3D
	// scene, so it stays DOM like the shared BoxCube. The platform was hidden
	// at the start and never shown again, so none of this is ever seen.
	const $scene = $('<finale-scene>').appendTo(stage.$bg).css({
		display: 'block',
		position: 'absolute',
		left: 0,
		top: 0,
		width: W * 3 + 'px',
		height: H + 'px',
		perspective: W * 3 + 'px',
	});

	const $platform = $('<finale-platform>').appendTo($scene).css({
		display: 'block',
		width: W * 0.5 + 'px',
		height: W + 'px',
		left: W * 1.25 + 'px',
		background: '#360676',
		position: 'absolute',
		transform: 'rotateX(90deg)',
		'transform-style': 'preserve-3d',
		'transform-origin': 'bottom center',
		bottom: '0px',
	});

	const MOUTH = {
		display: 'block',
		position: 'absolute',
		background: 'white',
		width: '70px',
		height: '20px',
		top: '50px',
		left: '0px',
		'border-radius': '0px 0px 100% 100%',
		transform: 'translate(-50%,-10%)',
		'box-shadow': '0px 0px 50px black',
	};

	const size = W * 0.3;
	const transform = {
		w: size, h: size, d: size,
		x: W * 0.25,
		y: -W / 2,
		altitude: size / 2 + 450,
		rx: 0,
		ry: 0,
		rz: 0,
		open: 0,
	};

	const cube = new BoxCube(0, transform, undefined, undefined, stage.audio());
	cube.$el.appendTo($platform);
	cube.$el.find('cube-surface').css({
		'background': 'url(assets/finale-sequence/bg-cosmic-cube.jpeg)',
		'background-size': 'cover',
		'background-position': 'center',
		'border': '10px solid white',
	});
	cube.redraw();
	cube.$el.find('box-cube-shadow').hide();

	$platform.hide();

	const $face = cube.$el.find('cube-side.front');
	const $mouth = $('<finale-mouth>').appendTo($face).css(MOUTH).hide();

	/* ---------- the backdrop ---------- */

	// The vortex GIF (long version only) has to stay DOM, behind the canvas.
	// It fades in over the rainbow, so the rainbow is drawn with the
	// opposite opacity: (1 - o) * rainbow over the vortex is o * vortex over
	// the rainbow.
	const vortex = { opacity: 0 };

	// bg-rainbow at background-size: 100% (all three walls wide), centred,
	// repeating up and down.
	function drawBackground(ctx) {
		const img = art.ready(BG);
		if (!img) return;
		const w = W * 3;
		const h = w * img.naturalHeight / img.naturalWidth;
		const y0 = (H - h) / 2;
		ctx.save();
		ctx.globalAlpha *= 1 - vortex.opacity;
		ctx.beginPath();
		ctx.rect(0, 0, w, H);
		ctx.clip();
		for (let y = y0 - h * Math.ceil(y0 / h); y < H; y += h) ctx.drawImage(img, 0, y, w, h);
		ctx.restore();
	}

	/* ---------- the show ---------- */

	const meeps = [];
	const explosions = [];

	const hud = new HUD();
	hud.$el.appendTo(stage.$ui);

	let tally;
	const names = ['Dave', 'Noah', 'Josh', 'Sean', 'Paul', 'Jack'];
	shuffleArray(names);

	// The old meeps moved by CSS transition (timing function ease): a new
	// target takes over from wherever the meep is.
	function transition(m, props, ms) {
		$(m).stop(true).animate(props, { duration: ms, easing: 'ease' });
	}

	function initGame(count) {
		for (let i = 0; i < count; i++) {
			meeps[i] = new Meep(i);
			meeps[i].eyes.visible = false;
			meeps[i].mouth.visible = false;
			meeps[i].shadow.visible = false;
			meeps[i].y = H + 320;   // bottom: -320px
			meeps[i].blur = 5;
			meeps[i].scale = 2;

			meeps[i].name = names[i];
			meeps[i].score = (count - i) * 5;
			meeps[i].visible = false;
		}

		tally = new Tally(meeps);
		tally.$el.appendTo(stage.$ui);

		nSequence = meeps.length;

		audio.play('music');
		stage.timeout(doIntro, 2000);
	}

	function doIntro() {
		say('intro');
		stage.timeout(doShortFinale, 9000);
		// stage.timeout(doNextPlace, 9000);
	}

	let resultsPending = [];
	function doShortFinale() {
		while (resultsPending.length < meeps.length) resultsPending.push(Math.floor(2 + Math.random() * 25));

		tally.showRows();

		stage.timeout(function () {
			tally.showResults(resultsPending);
		}, 2000);

		stage.timeout(function () {
			for (const r in meeps) meeps[r].score += resultsPending[r];
			resultsPending = undefined;
			tally.resolveResults();
		}, 4000);

		/* stage.timeout(function () {
			tally.hideRows();
		}, 7000); */

		stage.timeout(function () {
			doShortReward();
		}, 7000);
	}

	function doShortReward() {
		say('winner');
		const duration = audio.getDuration('winner');

		// $(cube.transform).delay((duration - 1) * 1000).animate({ x: W * 0.25, y: W * 2, rz: 720, ry: 0 }, 4000);

		stage.timeout(function () {
			audio.stop('music');
			audio.play('reveal');

			// left 1.6W, scale(2), no blur, bottom -800px, all set while it
			// was hidden, so its 2s transition only shows in the rise below.
			const m = meeps[0];
			m.x = 1.6 * W;
			m.scale = 2;
			m.blur = 0;
			m.y = H + 800;

			audio.play('woosh', true);

			m.isAnimating = true;
			m.toFlyer();
			m.visible = true;

			m.eyes.visible = true;
			m.mouth.visible = true;

			stage.timeout(function () {
				transition(m, { y: H - 100 }, 2000);   // bottom: 100px
			}, 3000);

			// Black over everything, the HUD and the tally included, so DOM.
			$('<finale-overlay>').appendTo(stage.$ui).css({
				display: 'block',
				position: 'absolute',
				left: 0,
				top: 0,
				width: '100%',
				height: '100%',
				background: 'black',
				opacity: 0,
			}).delay(7000).animate({
				opacity: 1,
			}, 1000);

		}, (duration - 1) * 1000);
	}

	/* ---------- the long version (switched off) ---------- */

	let isTalking = false;
	let nSequence = -1;
	function doNextPlace() {
		nSequence--;

		audio.play('woosh', true);

		$(cube.transform).animate({ x: [0, W * 0.5][nSequence % 2], rz: [-30, 30][nSequence % 2], ry: [10, -10][nSequence % 2] }, 500);

		const id = SEQUENCE[meeps.length][meeps.length - nSequence - 1];

		say(id);

		const duration = audio.getDuration(id);

		stage.timeout(function () {
			showMeep();
		}, (duration - 2) * 1000);

		if (SEQUENCE[meeps.length][nSequence - 1]) {
			stage.timeout(hideMeep, (duration + 1) * 1000);
			stage.timeout(doNextPlace, (duration + 2) * 1000);
		} else {
			stage.timeout(function () {
				tally.hideRow(nSequence);
				doUltimateReward();
			}, (duration + 2) * 1000);
		}
	}

	function doUltimateReward() {
		say('reward');
		const duration = audio.getDuration('reward');
		stage.timeout(doWubWub, (duration + 1) * 1000);
	}

	function doWubWub() {

		stage.timeout(function () {
			audio.play('reveal');
		}, 2000);

		stage.timeout(function () {
			audio.stop('music');
		}, 3000);

		$(cube.transform).animate({ x: W * 0.25, y: W * 2, rz: 720, ry: 0 }, 4000);

		$('<finale-vortex>').appendTo(stage.$bg).css({
			display: 'block',
			position: 'absolute',
			left: 0,
			top: 0,
			width: '100%',
			height: '100%',
			background: `url(${VORTEX}) center / cover`,
		});
		$(vortex).animate({
			opacity: 1,
		}, 4000);

		transition(meeps[nSequence], { y: H - 250, x: 1.5 * W, scale: 1.5 }, 1000);

		stage.timeout(function () {
			cube.$el.hide();
			doReveal();
		}, 7000);
	}

	function doReveal() {

		meeps[nSequence].visible = false;

		const size = W * 0.3;
		const transform = {
			w: size, h: size, d: size,
			x: W * 0.25,
			y: -W / 2,
			altitude: size / 2 + 270,
			rx: 0,
			ry: 0,
			rz: 0,
			open: 0,
		};

		const cube = new BoxCube(0, transform, undefined, undefined, stage.audio());
		cube.$el.appendTo($platform);
		cube.$el.find('cube-surface').css({
			'background': 'url(assets/finale-sequence/bg-cosmos-rainbow.webp)',
			'background-size': 'cover',
			'background-position': 'center',
			'border': '10px solid white',
		});
		cube.redraw();
		cube.$el.find('box-eye').css({
			'width': '10%',
			'height': '20%',
			'border-radius': '100%',
			'transform': 'none',
		});

		const $face = cube.$el.find('cube-side.front');
		$('<finale-mouth>').appendTo($face).css(MOUTH);

		cube.$el.find('box-cube-shadow').hide();

		// The platform moves on top of everything (still hidden).
		$scene.appendTo(stage.$ui);
		$platform.css({
			background: 'none',
		});

		const explosion = new FinaleExplosion(size, 'white');
		explosion.left = W * 3 * 0.5;   // top: 50%, left: 50%
		explosion.top = H * 0.5;
		explosions.push(explosion);

		audio.play('explode');

		$(cube.transform).delay(3000).animate({
			altitude: 2000,
			rz: 360,
		}, {
			duration: 1000,
			step: cube.redraw,
			start: function () {
				audio.play('woosh');
			},
		});
	}

	// The placed meep flies in (it was never un-hidden, so it stays unseen).
	function showMeep() {

		tally.showRow(nSequence);

		audio.play('woosh', true);

		meeps[nSequence].eyes.visible = true;
		meeps[nSequence].mouth.visible = true;

		meeps[nSequence].isAnimating = true;
		meeps[nSequence].toFlyer();
		stage.timeout(function () {
			transition(meeps[nSequence], {
				blur: 0,
				y: H - 450,
				x: [1.7, 1.3][nSequence % 2] * W,
				scale: 1,
			}, 1000);
		});
	}

	function hideMeep() {

		tally.hideRow(nSequence);

		audio.play('fall', true);

		transition(meeps[nSequence], {
			y: H + 500,
			x: [W * 2, W][nSequence % 2],
			rotate: [120, -120][nSequence % 2],
			scale: 1,
		}, 1000);
	}

	/* ---------- the host's voice ---------- */

	function say(id) {
		isTalking = true;
		audio.play(id);

		stage.timeout(function () {
			isTalking = false;
		}, audio.getDuration(id) * 1000);

		flapMouth();
	}

	function flapMouth() {
		if (!isTalking) return;
		$mouth.delay(100 + Math.random() * 100).animate({ width: 50, height: 30 + Math.random() * 50 }, 100).animate({ width: 70, height: 20 }, { duration: 100, complete: flapMouth });
	}

	hud.initPlayerCount(initGame);

	function step() {

		cube.redraw();

		for (const m of meeps) {
			if (m.isAnimating) continue;
			const left = (1.5 + m.playerX * 0.25) * W;
			if (!isNaN(left)) m.x = left;
		}
	}

	const interval = stage.interval(step, 1000 / FPS);

	// A meep's CSS blur(5px) sat under its scale, so it grew with it.
	function drawMeep(ctx, m, layer) {
		if (!m.visible) return;
		ctx.save();
		if (m.blur > 0) ctx.filter = `blur(${art.px(ctx, m.blur * m.scale)}px)`;
		m.draw(ctx, layer);
		ctx.restore();
	}

	self.draw = function (ctx) {
		drawBackground(ctx);
		for (const m of meeps) drawMeep(ctx, m, 'body');
		for (const m of meeps) drawMeep(ctx, m, 'hands');
		for (const e of explosions) e.draw(ctx);
	};

	self.setPlayers = function (p) {
		meeps.forEach(function (m, i) {
			m.playerX = p[i].x;
			m.py = p[i].py;
		});
	};

	self.fini = function () {
		audio.stop('music');
		hud.finiTutorial();
		hud.finiTimer();
		clearInterval(interval);
	};
});
