/*
 * IGB.Stage — everything one running game owns.
 *
 *   stage.$el      the game's root element, covering the 4800 x 1000 world
 *   stage.$bg      DOM layer behind the canvas (animated GIFs, video, CSS 3D scenes)
 *   stage.canvas   the world canvas; draw game art here in world units
 *   stage.ctx      its 2D context, already scaled to world units
 *   stage.$ui      DOM layer above the canvas (HUD, banners, buttons)
 *
 * Use the stage's timers and audio instead of the bare browser ones, so
 * that when the game stops (back to the menu, or a Box Party minigame being
 * skipped) nothing keeps running behind it:
 *
 *   stage.interval(fn, ms)   like setInterval
 *   stage.timeout(fn, ms)    like setTimeout
 *   stage.audio()            a new AudioPlayer
 *   stage.own(fn)            run fn when the game stops (to free anything else)
 *
 * Shared components and stray browser APIs are caught too: see IGB.owner in
 * core/igb.js. HUD and tally timers, AudioPlayers, Web Audio contexts and
 * jQuery tweens on plain objects all stop with the stage that made them.
 *
 * Every animation frame the stage clears the canvas and calls game.draw(ctx)
 * if the game has one.
 */
IGB.Stage = function (id) {

	const self = this;
	const { WIDTH, H } = IGB;

	const timeouts = new Set();
	const intervals = new Set();
	const players = [];
	const surfaces = [];
	const disposers = [];

	self.tweens = new Set();   // plain objects being animated with jQuery (see core/igb.js)

	self.id = id;
	self.stopped = false;
	self.game = undefined;

	self.$el = $('<igb-stage>').attr('game', id || '');
	self.$bg = $('<igb-layer class="bg">').appendTo(self.$el);
	self.canvas = $('<canvas class="world">').appendTo(self.$el)[0];
	self.ctx = self.canvas.getContext('2d');
	self.$ui = $('<igb-layer class="ui">').appendTo(self.$el);

	/* ---------- timers ---------- */

	self.timeout = function (fn, ms) {
		if (self.stopped) return undefined;
		const id = setTimeout(function () {
			timeouts.delete(id);
			if (!self.stopped) IGB.within(self, fn);
		}, ms);
		timeouts.add(id);
		return id;
	};

	self.interval = function (fn, ms) {
		if (self.stopped) return undefined;
		const id = setInterval(function () {
			if (!self.stopped) IGB.within(self, fn);
		}, ms);
		intervals.add(id);
		return id;
	};

	self.own = function (fn) {
		if (self.stopped) fn();
		else disposers.push(fn);
	};

	/* ---------- audio ---------- */

	self.audio = function () {
		const player = new AudioPlayer();
		if (self.stopped) player.mute();
		players.push(player);
		return player;
	};

	/* ---------- canvases ---------- */

	// A hi-res canvas sized w x h in world units, for art that has to live in
	// the DOM (inside a CSS 3D transform, say). It re-sizes with the world.
	// Draw into surface.ctx in its own units: (0, 0) to (w, h). Left
	// unattached, it is an offscreen buffer at world resolution, ready to
	// drawImage onto the stage (the-claw paints its turntable that way).
	// A resize that changes its pixel size clears it; set surface.onResize
	// to repaint art you painted once.
	self.surface = function (w, h) {
		const surface = { w, h, canvas: document.createElement('canvas') };
		surface.$el = $(surface.canvas).addClass('surface').css({ width: w + 'px', height: h + 'px' });
		surface.ctx = surface.canvas.getContext('2d');
		surface.resize = function () {
			if (fit(surface.canvas, surface.ctx, w, h) && surface.onResize) surface.onResize(surface);
		};
		surface.clear = function () {
			surface.ctx.save();
			surface.ctx.setTransform(1, 0, 0, 1, 0, 0);
			surface.ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
			surface.ctx.restore();
		};
		surface.resize();
		surfaces.push(surface);
		return surface;
	};

	// Size a canvas to the world's current resolution. Returns true if its
	// pixel size changed (which clears it).
	function fit(canvas, ctx, w, h) {
		const k = Math.max(0.25, IGB.scale) * IGB.pixelRatio;
		const cw = Math.ceil(w * k);
		const ch = Math.ceil(h * k);
		if (canvas.width === cw && canvas.height === ch) return false;
		canvas.width = cw;
		canvas.height = ch;
		ctx.setTransform(cw / w, 0, 0, ch / h, 0, 0);
		return true;
	}

	function resize() {
		fit(self.canvas, self.ctx, WIDTH, H);
		for (const s of surfaces) s.resize();
	}

	const unlisten = IGB.onResize(resize);
	resize();

	/* ---------- drawing ---------- */

	self.render = function (time) {
		if (self.stopped || !self.game || !self.game.draw) return;
		const ctx = self.ctx;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
		ctx.restore();
		ctx.save();
		try {
			IGB.within(self, () => self.game.draw(ctx, time));
		} catch (err) {
			// Report once rather than every frame.
			if (!self.drawError) { self.drawError = err; console.error(err); }
		}
		ctx.restore();
	};

	/* ---------- stopping ---------- */

	self.stop = function () {
		if (self.stopped) return;
		self.stopped = true;
		for (const id of timeouts) clearTimeout(id);
		for (const id of intervals) clearInterval(id);
		timeouts.clear();
		intervals.clear();
		for (const p of players) { p.stopAll(); p.mute(); }
		for (const fn of disposers) {
			try { fn(); } catch (err) { console.error(err); }
		}
		disposers.length = 0;
		for (const obj of self.tweens) halt(obj);
		self.tweens.clear();
		if (window.speechSynthesis) speechSynthesis.cancel();
		unlisten();
		IGB.removeStage(self);
		self.$el.find('*').addBack().each(function () { halt(this); });
		self.$el.remove();
	};

	IGB.addStage(self);
};

// Stop everything jQuery has queued on el, pending .delay()s included.
// (.stop(true) alone empties the queue first, which throws away the hook
// that would cancel a running delay's timer, so the timer still fires.)
function halt(el) {
	const data = jQuery._data(el);
	if (data) {
		for (const key in data) {
			if (/queueHooks$/.test(key) && data[key] && data[key].stop) {
				const stop = data[key].stop;
				delete data[key].stop;
				stop();
			}
		}
	}
	$(el).stop(true);
}
