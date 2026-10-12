/*
 * AudioPlayer — a named set of sounds.
 *
 *   const audio = stage.audio();           // inside a game: stops with the game
 *   audio.add('coin', 'assets/shared/sfx-coin.mp3', 0.3);
 *   audio.add('music', 'assets/coconut-climbers/music-calypso.mp3', 0.2, true);
 *   audio.play('coin', true);               // true: restart if already playing
 *
 * Shared components (HUD, meep, tally) make their own with new AudioPlayer();
 * those still go quiet when the game that made them stops (IGB.owner).
 *
 * The recorded effects (assets/shared/sfx-*.mp3) play as generated sounds
 * instead (shared/sfx.js; IGB.generatedSfx = false for the recordings).
 */
window.AudioPlayer = function () {

	const self = this;
	const audio = {};
	let muted = false;

	self.$el = $('<div>');

	const owner = window.IGB && IGB.owner && IGB.owner();
	if (owner) owner.own(() => self.mute());

	// the generated effects play on this player's own AudioContext, made on
	// first use and closed with the player
	let ac = null;
	function context() {
		if (!ac) {
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return null;
			ac = new AC();
		}
		if (ac.state === 'suspended') ac.resume().catch(() => {});
		return ac;
	}

	// id, src, volume (0..1, default 1), loop, autoplay
	self.add = function (id, src, volume, loop, autoplay) {
		const el = new Audio();
		el.preload = 'auto';
		el.loop = !!loop;
		el.src = src;
		el.volume = volume ? volume : 1;
		audio[id] = el;
		if (autoplay) self.play(id);
	};

	self.has = function (id) {
		return !!audio[id];
	};

	self.play = function (id, restart, speed) {
		const el = audio[id];
		if (!el) { console.warn('AudioPlayer: no sound called', id); return; }
		// music off (IGB.music = false, in games/manifest.js): every music-*.mp3 stays quiet
		if (window.IGB && IGB.music === false && /(^|\/)music-[^\/]*$/.test(el.getAttribute('src') || '')) return;
		if (muted || (owner && (owner.leaving || owner.stopped))) return;
		// a recorded effect with a generated version (shared/sfx.js) plays that instead
		const gen = !el.loop && window.SFX && !(window.IGB && IGB.generatedSfx === false) && SFX.nameOf(el.getAttribute('src'));
		if (gen) {
			const c = context();
			if (c) SFX.play(c, c.destination, gen, el.volume, speed || 1);
			return;
		}
		if (restart) el.currentTime = 0;
		if (speed) el.playbackRate = speed;
		const p = el.play();
		if (p && p.catch) p.catch(() => {}); // autoplay may be blocked until the first click
	};

	self.playAtTime = function (id, timeFrom) {
		self.play(id);
		if (audio[id]) audio[id].currentTime = timeFrom;
	};

	self.stop = function (id) {
		if (audio[id]) audio[id].pause();
	};

	self.stopAll = function () {
		for (const id in audio) audio[id].pause();
	};

	self.mute = function () {
		muted = true;
		self.stopAll();
		if (ac && ac.state !== 'closed') ac.close().catch(() => {});
	};

	self.setVolume = function (id, volume) {
		if (audio[id]) audio[id].volume = Math.max(0, Math.min(1, volume));
	};

	self.getTime = function (id) {
		return audio[id] ? audio[id].currentTime : 0;
	};

	self.getDuration = function (id) {
		return audio[id] ? audio[id].duration : NaN;
	};

	self.get = function (id) {
		return audio[id];
	};
};
