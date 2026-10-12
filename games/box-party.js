/*
 * Box Party
 *
 * The metagame. A flyover shows the road of mystery boxes stretching off
 * into a cosmic 3D world; the squad signs in (name entry); then the meeps
 * walk from stop to stop. At each stop the boxes spin to reveal their
 * minigames, the players pick one (click it), it swallows the room and the
 * minigame runs inside Box Party. Its coin rewards slide onto the tally on
 * the front wall and the party moves on to the next stop.
 *
 * Input: x and z walk each player's meep about the plane.
 *
 * The world (sky, mountains, the tilted plane with its track, the boxes,
 * the meeps and the pops) is a genuine CSS 3D scene, so it stays DOM in
 * stage.$bg, styled by games/box-party.css; the boxes are shared/cube.js's
 * BoxCube and the meeps MeepView. The running minigame's stage sits in
 * stage.$bg under the scene; the HUD, the tally, the white flash and the
 * name entry are DOM in stage.$ui. The canvas only draws the hairlines on
 * the borders between the walls.
 */
IGB.register('box-party', function BoxPartyGame(stage, playersMeta) {

	/* ---------- the 3D world ---------- */

	const BoxPartyScene3D = function (queue, callbackShowOverlay, callbackEnterBox, callbackExitBox) {

		const audio = stage.audio();
		audio.add('rumble', 'assets/shared/sfx-rumble.mp3', 0.1);
		audio.add('reveal', 'assets/shared/sfx-correct-echo.mp3', 0.3);
		audio.add('woosh-long', 'assets/shared/sfx-woosh-long.mp3', 0.1);
		audio.add('explode', 'assets/shared/sfx-explode.mp3', 0.3);
		audio.add('saber', 'assets/box-party/sfx-saber.mp3', 1);
		audio.add('saber-ignition', 'assets/box-party/sfx-saber-ignition.mp3', 0.3);
		audio.add('music', 'assets/box-party/music-quest.mp3', 0.2, true, true);

		const W = 1600;
		const H = 1000;
		const PERSTOP = W * 2;
		const TRACK = PERSTOP * queue.length;
		const BOXSIZE = W / 6;

		const self = this;
		self.$el = $('<party-scene>');

		$('<party-mountains>').appendTo(self.$el);

		const $world = $('<party-world>').appendTo(self.$el);
		const $plane = $('<party-plane>').appendTo($world);
		const $trackSVG = $(`
			<svg vector-effect="non-scaling-stroke" preserveAspectRatio=none width=${W * 4 / queue.length}px height=${PERSTOP}px viewBox='${-W * 2} 0 ${W * 4} ${TRACK}'>
				<path stroke-linejoin="round" vector-effect="non-scaling-stroke" stroke='white' stroke-width=${W / 30} fill='none' d='M${-W / 2},0 L${W / 2},${TRACK}'/>
			</svg>`).appendTo($plane).css({
			'transform': 'translate(-50%) scale(' + queue.length + ')',
		});

		const stops = [];
		const boxes = [];
		let nCube = 0;
		let d = '';
		for (let i = 0; i < queue.length; i++) {
			const spacingX = W / 4;
			let spacingRZ = 50 / (queue[i].length - 1);
			const size = BOXSIZE;

			if (queue[i].length == 1) spacingRZ = 0;

			let xOffset = (W / 4 + Math.random() * W / 4) * (i % 2 ? 1 : -1);
			const yOffset = W * 2 + i * PERSTOP;
			if (i == 0) {
				xOffset = 0;
				d = d + ' M' + xOffset + ',' + (TRACK);
			}

			d = d + ' L' + xOffset + ',' + (TRACK - yOffset + W / 2);
			d = d + ' L' + xOffset + ',' + (TRACK - yOffset - W / 2);

			stops[i] = { x: xOffset, y: yOffset };

			for (let n = 0; n < queue[i].length; n++) {

				const transform = {
					w: size, h: size, d: size,
					x: xOffset - (spacingX * (queue[i].length - 1) / 2) + spacingX * n,
					y: yOffset + (n % 2) * spacingX,
					altitude: size / 2 + 50 + Math.random() * H / 12,
					rx: 0,
					ry: 0,
					rz: -25 + n * spacingRZ,
					open: 0,
				};

				if (i == queue.length - 1) {
					transform.x = xOffset;
					transform.w = transform.h = transform.d = W / 2;
					transform.altitude = W / 2;
					transform.rz = 10;
				}

				const dir = (n < (queue[i].length - 1)) ? -1 : 1;

				const box = new BoxCube(nCube++, transform, queue[i][n], dir, stage.audio());
				box.$el.appendTo($plane);
				box.iLevel = i;
				box.nBox = n;

				box.$el.on('click', doBox);
				box.isSpinning = true;

				const nBox = boxes.push(box) - 1;
				box.$el.attr('n', nBox);
			}
		}

		boxes[boxes.length - 1].showGameSkin(true);

		// Unmarked boxes scattered beside the road.
		const decor = [];
		for (let i = 0; i < 5; i++) {
			const transform = {
				w: BOXSIZE, h: BOXSIZE, d: BOXSIZE,
				x: (W + Math.random() * W) * (i % 2 ? -1 : 1),
				y: (i + 3) * W * 2,
				altitude: H / 6 + Math.random() * H / 2,
				rx: 0,
				ry: 0,
				rz: (i % 2 ? -1 : 1) * 30,
				open: 0,
			};

			const box = new BoxCube(nCube++, transform, undefined, undefined, stage.audio());
			box.$el.appendTo($plane);
			box.redraw();
			decor.push(box);
		}

		$trackSVG.find('path').attr('d', d);

		const meeps = [];
		self.initMeeps = function (count) {
			for (let i = 0; i < count; i++) {
				const meep = new MeepView(i);
				meep.setHeight(350);
				meep.$el.appendTo($plane);
				meep.$el.css({
					'transform': 'rotateX(-90deg) scale(0.5)',
				});

				meeps[i] = meep;
			}

			audio.play('music');
		};

		let nSelect = undefined;
		function step() {
			for (const b in boxes) boxes[b].redraw();
		}

		stage.interval(step, 1000 / 30);

		function doBox() {

			if (nSelect != undefined) return;

			const nTry = $(this).attr('n');

			if (boxes[nTry].iLevel > iLevel) return;

			nSelect = nTry;
			boxes[nSelect].isSpinning = false;

			audio.stop('music');
			audio.play('rumble');
			audio.play('saber', true);
			audio.setVolume('saber', 0);
			audio.play('saber-ignition', true);

			$(boxes[nSelect]).animate({
				openX: 0.1,
				openY: 0.4,
			}, {
				duration: 500,
				step: function (n) {
					audio.setVolume('saber', n);
				},
			}).animate({
				openX: 1,
				openY: 1,
			}, {
				duration: 2500,
			});

			$(boxes[nSelect].transform).delay(500).animate({
				rx: 0,
				ry: 0,
				rz: 0,
				x: stops[iLevel].x,
				y: stops[iLevel].y,
				altitude: H / 2,
				w: W,
				h: H,
				d: W,
			}, {
				duration: 3000,
				complete: function () {
					audio.stop('rumble');
					audio.stop('saber');
					audio.play('reveal');
					callbackEnterBox(boxes[nSelect].game);
				},
			});

			stage.timeout(callbackShowOverlay, 2000);
		}

		let iLevel = -1;

		self.doFlyover = function () {

			audio.play('rumble', true);

			const stopEnd = stops[stops.length - 1];
			const stopStart = stops[0];

			$plane.css({
				left: -stopEnd.x + 'px',
				bottom: -stopEnd.y + W + 'px',
			}).animate({
				left: -stopStart.x + 'px',
				bottom: -stopStart.y + W + 'px',
			}, {
				duration: 10000,
				complete: function () {
					audio.stop('rumble');
				},
			});
		};

		// Past the final stop there is nowhere to go (the old code threw here,
		// so nothing after it ran); says whether there was a stop to go to.
		self.doNextLocation = function () {
			iLevel++;
			if (!stops[iLevel]) return false;
			self.anchorPlayer.x = stops[iLevel].x;
			self.anchorPlayer.y = stops[iLevel].y - W * 0.2;
			return true;
		};

		self.doWalkForward = function () {

			iLevel++;
			const stop = stops[iLevel];
			if (!stop) return;
			$(self.anchorPlayer).animate({
				x: stop.x,
				y: stop.y - W * 0.2,
			}, 2000);
		};

		self.doActivateStop = function () {
			audio.play('woosh-long');

			$plane.css({
				'transition': 'all 1s',
				'transform': 'translateZ(' + 0 + 'px)',
			});

			stage.timeout(function () {
				if (!stops[iLevel]) return;
				$plane.css({
					'transform': 'translateZ(' + H / 4 + 'px)',
					left: -stops[iLevel].x + 'px',
					bottom: -stops[iLevel].y + 'px',
				});
			}, 50);

			stage.timeout(function () {
				$plane.css({
					'transition': 'none',
				});
			}, 1200);

			stage.timeout(function () {
				for (const b in boxes) if (boxes[b].iLevel == iLevel) boxes[b].revealGame();
			}, 1200);
		};

		self.doDeactivateStop = function () {
			audio.play('music');
			audio.setVolume('music', 0);

			const volume = { v: 0 };
			$(volume).animate({ v: 0.2 }, {
				duration: 1000,
				step: function (n) {
					audio.setVolume('music', n);
				},
			});

			$plane.css({
				'transition': 'all 1s',
			});

			stage.timeout(function () {
				$plane.css({
					'transform': 'translateZ(' + 0 + 'px)',
					left: -stops[iLevel].x + 'px',
					bottom: -stops[iLevel].y + W + 'px',
				});
			}, 50);

			stage.timeout(function () {
				$plane.css({
					'transition': 'none',
				});
			}, 1200);
		};

		self.doCompleteBox = function () {

			audio.play('rumble');
			audio.play('saber');

			boxes[nSelect].isComplete = true;

			boxes[nSelect].transformCache.w = 0;
			boxes[nSelect].transformCache.h = 0;
			boxes[nSelect].transformCache.d = 0;

			$(boxes[nSelect].transform).animate(boxes[nSelect].transformCache, {
				duration: 1500,
				complete: function () {

					audio.stop('rumble');
					audio.stop('saber');

					boxes[nSelect].$el.remove();
					pop(boxes[nSelect].transform);

					for (const b in boxes) {
						if (b != nSelect && boxes[b].iLevel == boxes[nSelect].iLevel) {

							const dir = (boxes[b].transform.x > boxes[nSelect].transform.x) ? 1 : -1;

							$(boxes[b].transform).animate({
								x: boxes[b].transform.x + 500 * dir,
								y: boxes[b].transform.y + 500,
							});

							$(boxes[b].$el).delay(500).css({ opacity: 1 }).animate({
								opacity: 0,
							});
						}
					}

					nSelect = undefined;

					stage.timeout(callbackExitBox, 500);
				},
			});
		};

		const EXPLOSION = 200;
		function pop(t) {

			audio.play('explode', true);

			const $pop = $('<party-pop>').css({
				'left': t.x + 'px',
				'bottom': t.y + 'px',
				'transform': 'rotateX(90deg) translateZ(-200px) translateY(' + t.altitude + 'px)',
			}).appendTo($plane);

			$('<party-pop-ball>').appendTo($pop).css({
				width: 300,
				height: 300,
			}).delay(500).animate({
				opacity: 0,
			});

			for (let i = 0; i < 6; i++) {
				const size = 20 + Math.random() * 20;
				const r = Math.random() * Math.PI * 2;
				$('<party-smoke>').appendTo($pop).css({
					width: size + 'px',
					height: size + 'px',
					left: Math.cos(r) * EXPLOSION / 2 * Math.random(),
					top: Math.sin(r) * EXPLOSION / 2 * Math.random(),
				}).animate({
					left: Math.cos(r) * (EXPLOSION * 1.5) / 2,
					top: Math.sin(r) * (EXPLOSION * 1.5) / 2,
					width: (size * 2) + 'px',
					height: (size * 2) + 'px',
				}, 200 + Math.random() * 100).animate({
					left: Math.cos(r) * (EXPLOSION * 2) / 2,
					top: Math.sin(r) * (EXPLOSION * 2) / 2,
					width: (size) + 'px',
					height: (size) + 'px',
					opacity: 0,
				}, 1000);
			}
		}

		self.anchorPlayer = { x: 0, y: W };

		// Before the tracker reports, x and z are undefined: the "NaNpx" is
		// refused by the browser and the meep stays put, as before.
		self.setPlayers = function (p) {
			for (const m in meeps) {
				meeps[m].$el.css({
					'left': `${self.anchorPlayer.x + p[m].x * W / 8}px`,
					'bottom': `${self.anchorPlayer.y + p[m].z * W / 8}px`,
				});
			}
		};

		self.getLevelComplete = function () {
			let isLevelComplete = true;
			for (const b in boxes) {
				if (boxes[b].iLevel == iLevel && !boxes[b].isComplete) isLevelComplete = false;
			}
			return isLevelComplete;
		};

		// The tweens on plain objects outlive the DOM; stop them with the game.
		self.fini = function () {
			for (const box of boxes.concat(decor)) {
				$(box).stop(true);
				$(box.transform).stop(true);
			}
			$(self.anchorPlayer).stop(true);
		};
	};

	/* ---------- the party ---------- */

	// Each stop's boxes, as manifest entries (their .box is the box's skin).
	const QUEUE = [
		['coconut-climbers', 'mystery-maze'],
		['soccer-heads', 'volley-heads'],
		['bongo-bounce', 'melody-match'],
		['coin-chaos'],
		['painter-panic', 'cardboard-cutout', 'stubble-trouble'],
		['milkers', 'popcorn-panhandlers'],
		['plummet-panic', 'cookie-cutter'],
		['coin-chaos'],
		['find-my-meep', 'town-fair'],
		['goal-patrol', 'bowling-bonanza'],
		['final-frenzy'],
	].map((ids) => ids.map((id) => IGB.find(id)));

	const self = this;

	const audio = stage.audio();
	audio.add('speech-zero', 'assets/box-party/speech-zero.mp3', 0.4);

	// The running minigame's stage, under the scene (hidden while it runs).
	const $minigame = $('<box-party-minigame>').appendTo(stage.$bg);

	const scene = new BoxPartyScene3D(QUEUE, doShowOverlay, doLaunchGame, doExitGame);
	scene.$el.appendTo(stage.$bg);

	// The HUD and the tally, under the white flash and the name entry.
	const $front = $('<box-party-front>').appendTo(stage.$ui);

	const hud = new HUD('#7538D4');
	hud.$el.appendTo($front);
	hud.initPlayerCount(initGame);

	hud.addDebug('SKIP LOCATION', doSkipLocation);
	hud.addDebug('SKIP MINIGAME', doSkipMinigame);
	hud.addDebug('ADD SOME COINS', function () {
		resultsPending = [];
		while (resultsPending.length < players.length) resultsPending.push(2 + Math.floor(Math.random() * 10));
		doPendingTally();
	});

	const $overlay = $('<box-party-overlay>').appendTo(stage.$ui);

	const players = [];

	// Warm the name entry's files so it opens on time.
	IGB.load('name-entry').catch(() => {});

	let liveModule = undefined;
	let restoreComplete = undefined;

	function doShowOverlay() {
		$overlay.animate({ opacity: 1 }, 1000);
	}

	// The box has swallowed the room: start its minigame inside Box Party
	// and hear its rewards through IGB.complete.
	function doLaunchGame(game) {
		IGB.start(game.id, $minigame, players).then(function (instance) {
			if (stage.stopped) { IGB.stop(instance); return; }
			liveModule = instance;

			scene.$el.hide();
			tally.$el.hide();

			restoreComplete = IGB.handleComplete(doCompleteGame);

			$overlay.css({ opacity: 1 }).animate({ opacity: 0 });
		}, function (err) {
			console.error(err);
		});
	}

	let resultsPending;
	function doCompleteGame(results) {

		resultsPending = results;
		scene.$el.show();
		tally.$el.show();

		// Its fini runs and its stage goes. This comes after the tally, where
		// the old code removed the minigame: SKIP MINIGAME during name entry
		// throws on the missing tally first and leaves the name entry running.
		IGB.stop(liveModule);

		scene.doCompleteBox();

		liveModule = undefined;
		if (restoreComplete) restoreComplete();
		restoreComplete = undefined;
	}

	function doExitGame() {
		doPendingTally();

		let isLevelComplete = scene.getLevelComplete();

		isLevelComplete = true;

		if (isLevelComplete) {
			stage.timeout(scene.doDeactivateStop, 8000);
			stage.timeout(scene.doWalkForward, 10000);
			stage.timeout(scene.doActivateStop, 12000);
		}
	}

	function doPendingTally() {
		doShowTally();
		stage.timeout(doShowResults, 2000);
		stage.timeout(doResolveResults, 4000);
		stage.timeout(doHideTally, 6000);
	}

	function doShowResults() {
		tally.showResults(resultsPending);
	}

	function doResolveResults() {
		for (const r in resultsPending) players[r].score += resultsPending[r];
		resultsPending = undefined;
		tally.resolveResults();
	}

	function doShowTally() {
		tally.showRows();
	}

	function doHideTally() {
		tally.hideRows();
	}

	let nameEntry;
	let tally;
	function initGame(count) {

		for (let i = 0; i < count; i++) players[i] = { score: 0, name: 'unknown' };

		scene.initMeeps(count);

		scene.doFlyover();

		stage.timeout(initNameEntry, 12000);
	}

	function initNameEntry() {
		IGB.start('name-entry', stage.$ui, players, finiNameEntry).then(function (instance) {
			if (stage.stopped) { IGB.stop(instance); return; }
			liveModule = nameEntry = instance;
			nameEntry.stage.$el.css({
				opacity: 0,
			}).animate({
				opacity: 1,
			});
		}, function (err) {
			console.error(err);
		});
	}

	function finiNameEntry() {
		IGB.stop(nameEntry);
		liveModule = undefined;

		tally = new Tally(players);
		tally.$el.appendTo($front);

		stage.timeout(function () {
			audio.play('speech-zero');
			doShowTally();
		}, 1000);
		stage.timeout(doHideTally, 5000);
		stage.timeout(scene.doWalkForward, 6000);
		stage.timeout(scene.doActivateStop, 7000);
	}

	function doSkipLocation() {
		if (!scene.doNextLocation()) return;
		scene.doActivateStop();
	}

	function doSkipMinigame() {
		if (liveModule) doCompleteGame([]);
	}

	self.setPlayers = function (p) {
		scene.setPlayers(p);
		if (liveModule && liveModule.setPlayers) liveModule.setPlayers(p);
	};

	// The old boxpartygame:after: 1px white borders on a box from 33.3% to
	// 66.7% of the world, over the scene and any running minigame. The box
	// snapped to whole world px (1598 to 3202) and was then scaled with the
	// world, so each border is one world unit wide: a faint antialiased line
	// on a window narrower than the world, as before, not a full device pixel.
	self.draw = function (ctx) {
		ctx.fillStyle = 'white';
		ctx.fillRect(Math.round(0.333 * IGB.WIDTH), 0, 1, IGB.H);
		ctx.fillRect(Math.round(0.667 * IGB.WIDTH) - 1, 0, 1, IGB.H);
	};

	self.fini = function () {
		if (liveModule) IGB.stop(liveModule);
		liveModule = undefined;
		if (restoreComplete) restoreComplete();
		restoreComplete = undefined;
		scene.fini();
		hud.fini();
	};
});
