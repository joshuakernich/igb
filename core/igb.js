/*
 * IGB — the namespace every prototype talks to.
 *
 * The Immersive Gamebox projects onto three walls: left, front and right.
 * Each wall is 1600 x 1000 world units, so a game draws into a 4800 x 1000
 * world. The launcher scales that world to fit the window, so games work in
 * world units and never scale themselves.
 *
 * Games live in games/<id>.js, listed in games/manifest.js, and load on
 * demand. A game file calls IGB.register(id, Game); see README.md for the
 * full contract.
 */
window.IGB = (function () {

	const W = 1600;
	const H = 1000;
	const WALLS = 3;
	const WIDTH = W * WALLS;

	// Optional libraries a game can ask for in its manifest entry.
	const LIBS = {
		matter: 'lib/matter.min.js',
		quaternion: 'lib/quaternion.min.js',
	};

	const games = {};
	const scripts = {};
	const styles = {};
	const images = {};
	const stages = [];
	const resizeListeners = [];

	const IGB = {
		W, H, WALLS, WIDTH,
		FPS: 50,
		manifest: [],
		scale: 1,
		pixelRatio: window.devicePixelRatio || 1,
	};

	/* ---------- registry and loading ---------- */

	IGB.register = function (id, Game) {
		games[id] = Game;
	};

	IGB.entries = function () {
		return IGB.manifest.flatMap((folder) => folder.games.map((g) => Object.assign({ folder: folder.folder }, g)));
	};

	// Find a manifest entry by id, or by display name (old launch links used names).
	IGB.find = function (key) {
		if (!key) return undefined;
		const k = String(key).toLowerCase();
		return IGB.entries().find((e) => e.id === k || e.name.toLowerCase() === k);
	};

	IGB.loadScript = function (src) {
		if (!scripts[src]) {
			scripts[src] = new Promise((resolve, reject) => {
				const el = document.createElement('script');
				el.src = src;
				el.onload = resolve;
				el.onerror = () => reject(new Error('Could not load ' + src));
				document.head.appendChild(el);
			});
		}
		return scripts[src];
	};

	IGB.loadStyle = function (href) {
		if (!styles[href]) {
			styles[href] = new Promise((resolve) => {
				const el = document.createElement('link');
				el.rel = 'stylesheet';
				el.href = href;
				el.onload = resolve;
				el.onerror = resolve; // a missing stylesheet should not stop the game
				document.head.appendChild(el);
			});
		}
		return styles[href];
	};

	// Load a game's file (plus any libraries and stylesheet it declares)
	// and resolve to its constructor. A game marked `module: true` is an ES
	// module and can import what it needs (three.js lives in lib/three/);
	// module games need the page served over http, not opened from disk.
	IGB.load = async function (key) {
		const entry = IGB.find(key);
		if (!entry) throw new Error('No game called ' + key);
		for (const lib of entry.libs || []) await IGB.loadScript(LIBS[lib] || lib);
		if (entry.css) await IGB.loadStyle(entry.css === true ? `games/${entry.id}.css` : entry.css);
		const file = entry.file || `games/${entry.id}.js`;
		if (entry.module) await import(new URL(file, document.baseURI).href);
		else await IGB.loadScript(file);
		const Game = games[entry.id];
		if (!Game) throw new Error(`${entry.file || entry.id + '.js'} did not register '${entry.id}'`);
		return Game;
	};

	/* ---------- running games ---------- */

	// Start a game inside $parent. Resolves to the game instance, which
	// carries its stage as instance.stage. Any extra arguments go to the
	// game's constructor after playersMeta.
	IGB.start = async function (key, $parent, playersMeta, ...extra) {
		const entry = IGB.find(key);
		const Game = await IGB.load(key);
		// Whatever it was meant to run inside has gone while it loaded (Box
		// Party left before its name entry arrived): don't start it at all.
		if (!document.contains($parent[0])) {
			const stage = new IGB.Stage(entry.id);
			stage.stop();
			return { stage };
		}
		const stage = new IGB.Stage(entry.id);
		stage.$el.appendTo($parent);
		const game = IGB.within(stage, () => new Game(stage, playersMeta, ...extra));
		game.stage = stage;
		stage.game = game;
		return game;
	};

	// Stop a game: its fini() runs, then everything its stage owns is
	// cleared (timers, audio, DOM).
	IGB.stop = function (game) {
		if (!game || !game.stage || game.stage.stopped) return;
		game.stage.leaving = true;   // sounds asked for while it tidies up stay quiet
		if (game.fini) {
			try { game.fini(); } catch (err) { console.error(err); }
		}
		// Games running inside this one (Box Party's minigames and name entry) go too.
		for (const s of stages.slice()) {
			if (s !== game.stage && s.game && game.stage.$el[0].contains(s.$el[0])) IGB.stop(s.game);
		}
		game.stage.stop();
	};

	/* ---------- what belongs to which game ---------- */

	// Shared components (the HUD, tallies, meeps, AudioPlayers) and code that
	// reaches for the browser directly don't get a stage passed in, so the
	// platform works out the owner: the stage whose code is running right now
	// (its game's constructor, draw, or one of its timers), or failing that the
	// newest live stage. Whatever is made for a stage stops with it.
	let scope;
	IGB.within = function (stage, fn) {
		const prev = scope;
		scope = stage;
		try { return fn(); } finally { scope = prev; }
	};
	IGB.owner = function () {
		if (scope && !scope.stopped) return scope;
		return stages[stages.length - 1];
	};

	// Timers for shared components: they belong to the owning stage.
	IGB.later = function (fn, ms) {
		const owner = IGB.owner();
		return owner ? owner.timeout(fn, ms) : setTimeout(fn, ms);
	};
	IGB.every = function (fn, ms) {
		const owner = IGB.owner();
		return owner ? owner.interval(fn, ms) : setInterval(fn, ms);
	};

	// Safety nets for things games make themselves:
	// - jQuery tweens on plain objects (the ports animate game state with
	//   $(obj).animate) are stopped with their stage;
	// - Web Audio contexts are closed with their stage.
	const animate = $.fn.animate;
	$.fn.animate = function () {
		const owner = IGB.owner();
		if (owner) this.each(function () { if (!this.nodeType) owner.tweens.add(this); });
		return animate.apply(this, arguments);
	};
	// One volume for everything (IGB.setVolume(0..1), kept in this browser),
	// and a pause for everything (IGB.pauseAudio(true)): every Web Audio
	// context sends its sound through a master gain at that volume (its
	// destination is that gain), and every <audio>/<video> plays at the
	// volume it asks for times that volume.
	IGB.volume = 1;
	try { const v = parseFloat(localStorage.getItem('igb-volume')); if (v >= 0 && v <= 1) IGB.volume = v; } catch (e) { /* (no storage) */ }
	const contexts = new Set();
	const media = new Set();
	const AC = window.AudioContext || window.webkitAudioContext;
	if (AC) {
		window.AudioContext = window.webkitAudioContext = class extends AC {
			constructor(...args) {
				super(...args);
				const ctx = this;
				const master = super.createGain();
				master.gain.value = IGB.volume;
				master.connect(super.destination);
				this._master = master;
				contexts.add(ctx);
				const owner = IGB.owner();
				if (owner) owner.own(() => { contexts.delete(ctx); if (ctx.state !== 'closed') ctx.close().catch(() => {}); });
			}
			get destination() { return this._master || super.destination; }
		};
	}
	const volumeOf = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
	const clamp01 = (v) => Math.max(0, Math.min(1, v));
	Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
		configurable: true,
		get() { return this._want !== undefined ? this._want : volumeOf.get.call(this); },
		set(v) { this._want = clamp01(v); media.add(this); volumeOf.set.call(this, clamp01(this._want * IGB.volume)); },
	});
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		media.add(this);
		volumeOf.set.call(this, clamp01((this._want !== undefined ? this._want : 1) * IGB.volume));
		if (paused) { this._held = true; return Promise.resolve(); }   // (paused: it starts when everything resumes)
		return play.apply(this, arguments);
	};
	IGB.setVolume = function (v) {
		IGB.volume = clamp01(v);
		try { localStorage.setItem('igb-volume', String(IGB.volume)); } catch (e) { /* (not kept) */ }
		for (const ctx of contexts) if (ctx._master && ctx.state !== 'closed') ctx._master.gain.setTargetAtTime(IGB.volume, ctx.currentTime, 0.02);
		for (const el of media) volumeOf.set.call(el, clamp01((el._want !== undefined ? el._want : 1) * IGB.volume));
	};
	let paused = false;
	IGB.pauseAudio = function (on) {
		if (on === paused) return;
		paused = on;
		for (const ctx of contexts) if (ctx.state !== 'closed') (on ? ctx.suspend() : ctx.resume()).catch(() => {});
		for (const el of media) {
			if (on) { if (!el.paused) { el._held = true; el.pause(); } }
			else if (el._held) { el._held = false; if (el.isConnected || el.src) play.call(el).catch(() => {}); }
		}
	};

	IGB.addStage = function (stage) { stages.push(stage); };
	IGB.removeStage = function (stage) {
		const i = stages.indexOf(stage);
		if (i >= 0) stages.splice(i, 1);
	};

	// One animation loop draws every live stage, then anything else that
	// asked to redraw each frame (IGB.onFrame).
	const frameListeners = [];
	function frame(time) {
		for (const stage of stages.slice()) stage.render(time);
		for (const fn of frameListeners.slice()) fn(time);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);

	// fn(time) every animation frame. Returns a function that stops it.
	IGB.onFrame = function (fn) {
		frameListeners.push(fn);
		return function () {
			const i = frameListeners.indexOf(fn);
			if (i >= 0) frameListeners.splice(i, 1);
		};
	};

	/* ---------- finishing a game ---------- */

	// Games call IGB.complete(rewards) when they finish. Box Party swaps in
	// its own handler while a minigame runs.
	let completeHandler = function (rewards) {
		console.log('Game complete, rewards:', rewards);
	};

	IGB.complete = function (rewards) {
		completeHandler(rewards);
	};

	// Replace the completion handler; returns a function that restores the previous one.
	IGB.handleComplete = function (fn) {
		const previous = completeHandler;
		completeHandler = fn;
		return function () { completeHandler = previous; };
	};

	/* ---------- scale and coordinates ---------- */

	IGB.setScale = function (scale) {
		IGB.scale = scale;
		IGB.pixelRatio = window.devicePixelRatio || 1;
		for (const fn of resizeListeners) fn(scale);
	};

	IGB.onResize = function (fn) {
		resizeListeners.push(fn);
		return function () {
			const i = resizeListeners.indexOf(fn);
			if (i >= 0) resizeListeners.splice(i, 1);
		};
	};

	// World coordinates of a mouse or touch event.
	IGB.toWorld = function (e) {
		const world = document.querySelector('igb-world');
		const r = world ? world.getBoundingClientRect() : { left: 0, top: 0 };
		const p = e.originalEvent && e.originalEvent.touches ? e.originalEvent.touches[0] : e;
		return { x: (p.clientX - r.left) / IGB.scale, y: (p.clientY - r.top) / IGB.scale };
	};

	/* ---------- images ---------- */

	// A cached Image. Draw it once image.complete is true; the art helpers
	// in core/art.js skip images that are still loading.
	IGB.image = function (src) {
		if (!images[src]) {
			const img = new Image();
			img.src = src;
			images[src] = img;
		}
		return images[src];
	};

	IGB.preload = function (sources) {
		return Promise.all(sources.map((src) => {
			const img = IGB.image(src);
			return img.complete ? Promise.resolve(img) : new Promise((resolve) => {
				img.addEventListener('load', () => resolve(img), { once: true });
				img.addEventListener('error', () => resolve(img), { once: true });
			});
		}));
	};

	return IGB;
})();
