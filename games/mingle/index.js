/*
 * Mingle
 *
 * The hall is the gamebox: a ring of numbered doors runs round its walls,
 * and a carousel turns in the middle. While the music plays everyone stands
 * on the carousel and the doors roll round the room past them. When it
 * stops, a number is called: get into a room in a group of exactly that
 * many before the doors slam. Tap your door to lock it early. Anyone left
 * out, or in a room with the wrong number, is shot. Everyone is back for the
 * next round; the rounds get quicker and some doors stay barred. If nobody
 * survives a round, it's played again.
 *
 * Each wall is a view of the hall from the middle of the room, looking at
 * that wall from above. The views are orthographic, so a contestant sits on
 * every wall exactly where their player stands relative to it: step left
 * and right along a wall, step toward it to reach its doors.
 *
 * You only see yourself up close: a contestant shows on a wall only while
 * their player is within reach of that wall's doors, fading in as they
 * come near and out as they leave. Out on the carousel everyone is hidden;
 * only their coloured rings show, pulsing, and the marquee's dots say who
 * is on it. Anyone shot appears, on every wall, as they fall.
 *
 * The show, in order (see the beats at the bottom, and shared/showtime.js
 * for the generic ones): the squad picker over the hall; the title; the
 * ten-minute clock; the controls, one at a time (stand on the carousel,
 * walk to a wall to see yourself, get into a practice room, tap to lock
 * it); the host's hall, lit up bulb by bulb, three masked guards on the
 * carousel, the music and the doors rolling; the rounds; TIME!; the scores,
 * the ranking, the team total, the leaderboard and the replay.
 *
 * The show's camera zooms the three.js views too: each wall's viewport is
 * moved and scaled exactly as the 2D canvas is, so the overlays stay put on
 * the hall. On the results beats (drawn on the show's own backdrop) the
 * three.js canvas is hidden and not rendered.
 *
 * Input: px, pz (the player's spot on the floor). Touch: tap a door to lock
 * it. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildFloor, buildCarousel, buildModule, buildContestant, buildSplat, buildGuard, NUMBERS } from './models.js';
import { createSound } from './sound.js';

IGB.register('mingle', function MingleGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;
	const S = 5;                 // half the hall's width: the room maps onto -S..S
	const PITCH = 32;            // degrees each view looks down
	const TOP = 130;             // the marquee across the top of each wall, world pixels
	const CROP = 1.3 * S;        // how far into the hall each view reaches from its wall
	const MODULES = 12;          // doors round the ring, three to a wall
	const PERIM = 8 * S;
	const MOD_W = PERIM / MODULES;
	const DOOR_W = 1.5;
	const DOOR_H = 1.85;
	const WALL_H = 3.2;
	const CAROUSEL = 0.5 * S;    // the carousel's radius
	const ZONE = 2.3;            // how close to a wall you must be to be at its door
	const ZONE_PAD = 0.45;       // and how far either side of the doorway still counts
	const OFF_LIMIT = 3;         // seconds off the carousel while it turns before you're shot (from round 2)
	const PLATFORM = 0.16;       // the carousel's height
	const SEE = [ZONE - 0.1, CAROUSEL + 0.1];   // a contestant shows fully on a wall within SEE[0] of it, not at all beyond SEE[1]
	const FADE = 4;              // how quickly they fade in and out (per second)
	const IDLE_ROLL = 0.6;       // m/s the doors drift round before the game
	const POINTS = { room: 10, lock: 5 };       // into a room of the right size; extra for locking it

	function settingsFor(r) {
		return {
			spin: [5 + Math.min(r, 4) * 0.6, 8.5 + Math.min(r, 6) * 0.6],   // seconds of music
			speed: Math.min(4.2, 1.8 + 0.22 * r),                           // how fast the doors go round, m/s
			rush: Math.max(5.5, 12 - 0.6 * r),                              // seconds to get into a room
			bars: r < 1 ? 0 : Math.min(r + 1, 6),                           // doors that stay shut
			reverse: r >= 3,                                                // the carousel can change direction
			tempo: 2.4 + 0.12 * Math.min(r, 8),
		};
	}

	const ROUND_GAP = {
		board: 6,             // at most this long to get everyone on the carousel
		verdict: 3.5,         // the banner after a round
	};

	/* ---------- tuning: the controls intro ---------- */

	const CONTROLS = {
		steps: [
			{ id: 'carousel', caption: 'STAND ON THE CAROUSEL', min: 2.5, max: 9 },
			{ id: 'reveal', caption: 'WALK TO A WALL TO SEE YOURSELF', min: 3, max: 12 },
			{ id: 'room', caption: 'GET INTO A ROOM', min: 2.5, max: 13 },
			{ id: 'lock', caption: 'TAP YOUR DOOR TO LOCK IT', min: 1.5, max: 10 },
		],
		nice: 1.1,            // the NICE! once a step is done, before the next
		roll: 1.4,            // the doors' speed through the first two steps, m/s
		number: 1,            // the practice rooms are for one
	};

	/* ---------- tuning: the host's hall ---------- */

	const HOST = {
		zoom: 2.0,            // each wall's view starts this tight on its guard on the carousel
		bulbs: [0.5, 2.3],    // the carousel's bulbs come on, one by one round the rim
		guards: 2.4,          // three masked guards pop up on it, ○ △ □
		name: 3.4,            // THE MINGLE; the host's voice, the music, the carousel turns
		pull: 5.0,            // the camera pulls back to the whole hall
		pullFor: 1.4,
		rule: 6.6,            // FIND YOUR GROUP / OR BE LEFT OUT
		leave: 8.7,           // the guards go, the music stops
		go: 9.0,              // ROUND 1
		length: 10.4,
		speed: 2.6,           // how fast the doors roll at the height of it
	};

	const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
	const PINK = '#e5287a';
	const LIGHT_PINK = '#ff7eb6';
	const INK = '#1a1a1a';

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0x2a1f3d);
	const $gl = $(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	// Canvas pixels, so the walls' viewports meet exactly (as in RLGL).
	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 6000 / WIDTH);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
	}
	function viewport(x, y, w, h) {
		const x0 = Math.round(x * k);
		const x1 = Math.round((x + w) * k);
		const y0 = Math.round((H - y - h) * k);
		const y1 = Math.round((H - y) * k);
		renderer.setViewport(x0, y0, x1 - x0, y1 - y0);
		renderer.setScissor(x0, y0, x1 - x0, y1 - y0);
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.add(new THREE.HemisphereLight(0xfff4fb, 0xb59ac8, 1.5));
	const sun = new THREE.DirectionalLight(0xfff1e6, 1.6);
	sun.position.set(3, 14, 5);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -S - 2, right: S + 2, top: S + 2, bottom: -S - 2, near: 1, far: 40 });
	sun.shadow.bias = -0.0006;
	scene.add(sun);

	// The three walls, as seen from inside the hall. For each: the corner the
	// wall starts from (on the left of its view), the direction along it (to
	// the right of the view), the direction into the hall, and the yaw that
	// turns a door module (built facing +z) to face into the hall.
	const WALLS = [
		{ origin: new THREE.Vector3(-S, 0, S), along: new THREE.Vector3(0, 0, -1), inward: new THREE.Vector3(1, 0, 0), yaw: Math.PI / 2 },
		{ origin: new THREE.Vector3(-S, 0, -S), along: new THREE.Vector3(1, 0, 0), inward: new THREE.Vector3(0, 0, 1), yaw: 0 },
		{ origin: new THREE.Vector3(S, 0, -S), along: new THREE.Vector3(0, 0, 1), inward: new THREE.Vector3(-1, 0, 0), yaw: -Math.PI / 2 },
	];

	const SIN = Math.sin(PITCH * Math.PI / 180);
	const COS = Math.cos(PITCH * Math.PI / 180);
	const VIEW_BOTTOM = -CROP * SIN;
	const VIEW_TOP = VIEW_BOTTOM + 2 * S * (H - TOP) / W;

	// Orthographic, so a point's place across a wall doesn't depend on how
	// far it is from it: the contestants are 1:1 with their players on every wall.
	const cams = WALLS.map(function (wall) {
		const centre = wall.origin.clone().addScaledVector(wall.along, S);
		const look = wall.inward.clone().multiplyScalar(-COS).add(new THREE.Vector3(0, -SIN, 0));
		const cam = new THREE.OrthographicCamera(-S, S, VIEW_TOP, VIEW_BOTTOM, 0.1, 80);
		cam.position.copy(centre).addScaledVector(look, -40);
		cam.up.set(0, 1, 0);
		cam.lookAt(centre);
		cam.updateMatrixWorld();
		return cam;
	});

	// The host's close-up: every wall's view zoomed in on the carousel
	// (each on its own guard), the carousel's middle held still on screen.
	// 1 is the normal view, where toScreen holds.
	let hallZoom = 1;
	let zoomed = 1;
	const GUARD_R = 1.4;                       // the guards stand this far out from the carousel's post
	const FOCUS_V = 1.3 * COS - (S - GUARD_R) * SIN;   // the near guard's chest, in each view's up-the-screen coordinate
	function zoomViews() {
		if (hallZoom === zoomed) return;
		zoomed = hallZoom;
		for (const cam of cams) {
			cam.left = -S / zoomed;
			cam.right = S / zoomed;
			cam.top = FOCUS_V + (VIEW_TOP - FOCUS_V) / zoomed;
			cam.bottom = FOCUS_V + (VIEW_BOTTOM - FOCUS_V) / zoomed;
			cam.updateProjectionMatrix();
		}
	}

	// Where a point in the hall shows on wall w, in world pixels.
	function toScreen(w, x, y, z) {
		const wall = WALLS[w];
		const dx = x - wall.origin.x;
		const dz = z - wall.origin.z;
		const a = dx * wall.along.x + dz * wall.along.z;
		const t = dx * wall.inward.x + dz * wall.inward.z;
		const v = y * COS - t * SIN;
		return { x: w * W + (a / (2 * S)) * W, y: TOP + ((VIEW_TOP - v) / (VIEW_TOP - VIEW_BOTTOM)) * (H - TOP) };
	}

	// How far along wall w a point is, and how far out from it.
	function wallCoords(w, x, z) {
		const wall = WALLS[w];
		const dx = x - wall.origin.x;
		const dz = z - wall.origin.z;
		return { a: dx * wall.along.x + dz * wall.along.z, t: dx * wall.inward.x + dz * wall.inward.z };
	}

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
	const smooth = (x) => x * x * (3 - 2 * x);

	/* ---------- the hall ---------- */

	scene.add(buildFloor(2 * S + 6));
	const carousel = buildCarousel(CAROUSEL);
	scene.add(carousel.group);

	// The host's three masked guards, standing on the carousel facing in, one
	// in front of each wall (so each wall sees a mask). They turn with it.
	const guards = ['square', 'circle', 'triangle'].map(function (shape, w) {
		const g = buildGuard(shape, false);
		const a = [Math.PI, -Math.PI / 2, 0][w];          // toward the left, front, right walls
		g.root.position.set(Math.cos(a) * GUARD_R, PLATFORM, Math.sin(a) * GUARD_R);
		g.root.rotation.y = Math.PI / 2 - a;               // facing the post, and that wall's view
		g.head.rotation.x = 0.4;                           // chin up, so the view (from above) sees the mask
		g.root.visible = false;
		g.pop = 0;
		carousel.spin.add(g.root);
		return g;
	});
	let guardsUp = false;

	// The ring of doors. Module m sits `ring + m * MOD_W` round the walls,
	// measured from the back of the left wall, round the front, to the back
	// of the right wall and across the back of the room (which has no wall
	// to show it on).
	const SIZE = { width: MOD_W, height: WALL_H, doorWidth: DOOR_W, doorHeight: DOOR_H, zone: ZONE, pad: ZONE_PAD };
	const modules = [];
	for (let m = 0; m < MODULES; m++) {
		const mod = buildModule(m + 1, SIZE);
		mod.open = 0;          // how far open, 0..1
		mod.target = 0;
		mod.barred = false;
		mod.locked = false;
		mod.wall = -1;         // the wall it's stopped on (0..2), or -1
		mod.a = 0;             // and how far along it
		mod.occupants = [];
		mod.pop = 0;           // a little shake when someone taps it at the wrong count
		mod.setOpen(0);
		scene.add(mod.group);
		modules.push(mod);
	}
	let ring = MOD_W / 2;      // where module 0 is round the ring

	const wrap = (u) => ((u % PERIM) + PERIM) % PERIM;

	// Put every module on wall w's line for that wall's render; the view
	// crops whatever runs off its ends.
	function placeModules(w) {
		const wall = WALLS[w];
		for (let m = 0; m < MODULES; m++) {
			const mod = modules[m];
			let a = wrap(ring + m * MOD_W - w * 2 * S);
			if (a > PERIM - MOD_W) a -= PERIM;
			const visible = a > -MOD_W / 2 && a < 2 * S + MOD_W / 2;
			mod.group.visible = visible;
			if (!visible) continue;
			mod.group.position.copy(wall.origin).addScaledVector(wall.along, a);
			mod.group.rotation.y = wall.yaw;
			if (mod.pop > 0) mod.group.position.addScaledVector(wall.along, Math.sin(mod.pop * 40) * 0.05 * mod.pop);
		}
	}

	// Once the ring stops (always with three doors square on each wall),
	// note which wall each door is on.
	function settleModules() {
		for (let m = 0; m < MODULES; m++) {
			const u = wrap(ring + m * MOD_W);
			const w = Math.floor(u / (2 * S));
			modules[m].wall = w < 3 ? w : -1;
			modules[m].a = u - w * 2 * S;
		}
	}

	// Every door shut and off its wall, ready to roll again.
	function shutDoors() {
		for (const mod of modules) {
			mod.target = 0;
			mod.locked = false;
			mod.barred = false;
			mod.wall = -1;
			mod.occupants = [];
			mod.setBarred(false);
			mod.setLamp(0xf7d774);
		}
	}

	/* ---------- contestants ---------- */

	let contestants = [];
	let players = 0;

	function Contestant(n) {
		const model = buildContestant(n, PLAYER_COLORS[n]);
		scene.add(model.root);
		// everything that fades as they come and go (always see-through
		// capable, so fading never needs a new shader)
		const mats = new Set();
		model.lean.traverse((o) => { if (o.material) mats.add(o.material); });
		mats.add(model.marker.material);
		for (const m of mats) m.transparent = true;
		return {
			n, model, mats: [...mats],
			score: 0,
			px: (n + 1) / (players + 1),
			pz: 0.5,
			pos: new THREE.Vector3(),
			last: new THREE.Vector3(),
			yaw: 0,
			walk: 0,
			alive: true,
			saved: false,
			inside: null,     // { door, slot, t } walking into a room
			off: 0,           // seconds off the carousel while it turns
			fall: null,
			splat: null,
			shotAt: undefined,
			door: null,       // the door they're standing at
			vis: [0, 0, 0],   // how much they show on each wall, 0..1
			seen: false,      // seen themselves on a wall (in the controls)
			markerOn: true,
		};
	}

	function revive(c) {
		c.alive = true;
		c.saved = false;
		c.inside = null;
		c.off = 0;
		c.fall = null;
		c.shotAt = undefined;
		c.door = null;
		c.markerOn = true;
		if (c.splat) { scene.remove(c.splat); c.splat = null; }
		const m = c.model;
		m.root.visible = true;
		m.ring.visible = true;
		m.lean.rotation.set(0, 0, 0);
		m.head.rotation.set(0, 0, 0);
	}

	// Where the player stands, in the hall.
	function follow(c) {
		const lim = S - 0.35;
		c.pos.x = Math.max(-lim, Math.min(lim, (2 * c.px - 1) * S));
		c.pos.z = Math.max(-lim, Math.min(lim, (2 * c.pz - 1) * S));
		c.pos.y = onCarousel(c) ? PLATFORM : 0;
	}

	const onCarousel = (c) => Math.hypot(c.pos.x, c.pos.z) < CAROUSEL - 0.1;

	// How far a contestant is from each wall (left, front, right), metres.
	const distances = (c) => [c.pos.x + S, c.pos.z + S, S - c.pos.x];

	// The wall a contestant is closest to (of the three).
	function nearestWall(c) {
		const t = distances(c);
		return t.indexOf(Math.min(...t));
	}

	// How much a contestant should show on wall w: fully within reach of its
	// doors, not at all out in the middle. Anyone being shot shows everywhere.
	function visTarget(c, w) {
		if (c.fall || c.shotAt !== undefined) return 1;
		return 1 - smooth(between(distances(c)[w], SEE[0], SEE[1]));
	}

	// The open door a contestant is standing at, if any.
	function doorAt(c) {
		let best = null;
		let bestT = Infinity;
		for (const mod of modules) {
			if (mod.wall < 0 || mod.barred || mod.locked || mod.target < 1) continue;
			const { a, t } = wallCoords(mod.wall, c.pos.x, c.pos.z);
			if (Math.abs(a - mod.a) < DOOR_W / 2 + ZONE_PAD && t < ZONE && t < bestT) {
				best = mod;
				bestT = t;
			}
		}
		return best;
	}

	/* ---------- the game's state ---------- */

	const sound = createSound();

	let round = -1;
	let settings = settingsFor(0);
	let phase = 'idle';        // idle, practice, rush (also in practice), board, spin, stopping, call, closing, verdict, over
	let phaseT = 0;
	let phaseDur = 0;
	let clock = 0;             // runs in every beat, for bobbing and lights
	let t = 0;                 // play time, for the replay
	let number = 0;            // the group size called this round
	let lastNumber = 0;
	let speed = 0;             // the ring's speed, m/s (signed)
	let stop = null;           // { from, to, dur, t, done } while the ring slows to a stop
	let reverseAt = -1;
	let lit = 1;               // the carousel's bulbs chasing (0 or 1)
	let bulbs = 1;             // how many of them are on, 0..1
	let lastCount = -1;
	let lastShot = -1;
	let survivors = 0;
	let verdictRound = 0;
	let completed = false;
	const pops = [];           // words that float up: { text, colour, x, y, age }

	function setPhase(p, dur = 0) {
		phase = p;
		phaseT = 0;
		phaseDur = dur;
	}

	const rand = (range) => range[0] + Math.random() * (range[1] - range[0]);

	function pop(text, colour, x, y) {
		pops.push({ text, colour, x, y, age: 0 });
	}

	// Over a contestant, on the wall they're nearest.
	function popOver(c, text, colour) {
		const w = nearestWall(c);
		const at = toScreen(w, c.pos.x, 2.4, c.pos.z);
		pop(text, colour, at.x, at.y);
	}

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'mingle',
		seconds: GAME_SECONDS,
		players: () => contestants.length,
		scores: () => contestants.map((c) => c.score),
		drawAvatar: (ctx, n, x, y, scale, pose) => art.with(ctx, { x, y, scale: scale * 0.88 }, (c) => contestantFront(c, n, pose)),
		theme: {
			accent: '#ff4f9a', accent2: '#7a3db8', gold: '#f7d774', ink: '#2a0f33',
			sky: ['#1e0a2c', '#5a1f63'], panel: 'rgba(42,15,51,0.86)', floor: 'rgba(20,6,30,0.6)', glow: 'rgba(255,79,154,0.32)',
		},
		backdrop: drawDoors,
		rivals: ['Room For Two', 'Odd One Out', 'The Lockouts', 'Carousel Crew', 'Doorway Dashers', 'Perfect Pairs',
			'Groups Of Three', 'Merry-Go-Round', 'Slam Squad', 'Last Room Left', 'Waltz Walkers', 'Head Count'],
		farewell: 'WELL PLAYED, CONTESTANTS!',
		sounds: { tutorial: ['assets/shared/music-tutorial.mp3', 0.2, true] },
	});

	// Pastel numbered doors drifting slowly up the results backdrop.
	const PASTEL = ['#f4a7c3', '#9fe0c9', '#f7d774', '#b9a5ee', '#9fd0f5', '#f8b98f'];
	function drawDoors(c, time) {
		for (let i = 0; i < 8; i++) {
			const x = (i * 211 + 100) % W;
			const y = H + 160 - ((time * (20 + (i % 3) * 8) + i * 290) % (H + 320));
			art.with(c, { x, y, rotate: Math.sin(time * 0.6 + i) * 8, alpha: 0.2, scale: 0.8 + (i % 3) * 0.2 }, function (c2) {
				art.roundRect(c2, -60, -100, 120, 200, [60, 60, 6, 6], { fill: PASTEL[i % PASTEL.length] });
				art.text(c2, String(i * 3 % 12 + 1).padStart(2, '0'), 0, -20, { size: 46, font: 'Paytone One', weight: 400, fill: '#2a0f33' });
			});
		}
	}

	/* ---------- the flow of a game ---------- */

	function initGame(count) {
		players = count;
		sound.resume();
		contestants = [];
		for (let i = 0; i < count; i++) contestants.push(Contestant(i));
		for (const c of contestants) follow(c);
		show.go('title');
	}

	// Into the rounds.
	function begin() {
		t = 0;
		for (const c of contestants) c.score = 0;
		startRound(0);
	}

	// Everyone back on their feet, doors shut, onto the carousel.
	function startRound(r) {
		round = r;
		settings = settingsFor(r);
		for (const c of contestants) revive(c);
		shutDoors();
		speed = 0;
		lit = 1;
		bulbs = 1;
		number = pickNumber(r);
		show.sfx.drum();
		setPhase('board', ROUND_GAP.board);
	}

	// The size of group to call. The first round is gentle; after that any
	// size from one to everyone, never the same twice running.
	function pickNumber(r) {
		if (players === 1) return 1;
		if (r === 0) return players % 2 === 0 ? 2 : players === 3 ? 1 : 2;
		const options = [];
		for (let n = 1; n <= Math.min(players, 6); n++) if (n !== lastNumber) options.push(n);
		return options[Math.floor(Math.random() * options.length)];
	}

	function startSpin() {
		speed = settings.speed * (Math.random() < 0.5 ? 1 : -1);
		const dur = rand(settings.spin);
		reverseAt = settings.reverse && Math.random() < 0.5 ? dur * (0.35 + Math.random() * 0.3) : -1;
		sound.music(true, settings.tempo);
		setPhase('spin', dur);
	}

	// The ring slows and settles with three doors square on each wall.
	function beginStop() {
		const dir = Math.sign(speed) || 1;
		const v = Math.max(0.5, Math.abs(speed));
		const coast = v * 1.1;                          // roughly where it would come to rest
		let to = ring + dir * coast;
		to = Math.round((to - MOD_W / 2) / MOD_W) * MOD_W + MOD_W / 2;
		if ((to - ring) * dir < MOD_W * 0.3) to += dir * MOD_W;
		const dist = Math.abs(to - ring);
		stop = { from: ring, to, dur: Math.max(0.8, 2 * dist / v), t: 0, done: false };
		speed = 0;
	}

	// The music stops; the ring comes to rest.
	function startStop() {
		sound.music(false);
		sound.windDown();
		beginStop();
		setPhase('stopping');
	}

	// The doors in reach open, barring a few (keeping enough open for
	// everyone and one spare).
	function openDoors(barCount) {
		ring = stop ? stop.to : ring;
		stop = null;
		settleModules();
		const reachable = modules.filter((m) => m.wall >= 0);
		const needed = Math.ceil(players / number) + 1;
		const bars = Math.max(0, Math.min(barCount, reachable.length - needed));
		const shuffled = reachable.slice().sort(() => Math.random() - 0.5);
		for (let i = 0; i < bars; i++) {
			shuffled[i].barred = true;
			shuffled[i].setBarred(true);
		}
		for (const mod of reachable) {
			mod.setLamp(mod.barred ? 0xe0283c : 0x3ddc84);
			if (!mod.barred) mod.target = 1;
		}
		sound.doors();
		sound.say(`${WORDS[number] || number}!`);
		lastCount = -1;
	}

	function callNumber() {
		openDoors(settings.bars);
		lastNumber = number;
		setPhase('call', 1.1);
	}

	// Into the room: they walk through the doorway and the door shuts behind them.
	function saveGroup(mod, locked) {
		const scoring = show.beat === 'play';
		mod.occupants.forEach(function (c, i) {
			c.saved = true;
			if (scoring) c.score += POINTS.room + (locked ? POINTS.lock : 0);
			c.inside = { door: mod, slot: mod.occupants.length > 1 ? i / (mod.occupants.length - 1) - 0.5 : 0, t: 0, from: c.pos.clone() };
			c.model.ring.visible = false;
		});
		mod.locked = true;
		mod.setLamp(0x4aa3ff);
		stage.timeout(function () {
			mod.target = 0;
			sound.slam();
		}, 900);
		sound.ding();
	}

	// Time's up: the right-sized groups get in, every other door slams, and
	// everyone left out in the hall is shot.
	function closeDoors() {
		let slams = 0;
		for (const mod of modules) {
			if (mod.wall < 0 || mod.barred || mod.locked || mod.target === 0) continue;
			if (mod.occupants.length === number) {
				saveGroup(mod, false);
			} else {
				mod.target = 0;
				mod.setLamp(0xe0283c);
				sound.slam(0.05 * slams++);
			}
		}
		stage.timeout(function () {
			if (show.beat !== 'play') return;
			for (const c of contestants) if (c.alive && !c.saved) eliminate(c);
		}, 1100);
		setPhase('closing', 2.2);
	}

	function verdict() {
		survivors = contestants.filter((c) => c.saved).length;
		verdictRound = round;
		if (survivors) {
			show.mark(t);
			show.sfx.sting(0.2);
			show.play('cheer');
		} else {
			show.sfx.boom(0.7);
		}
		setPhase('verdict', ROUND_GAP.verdict);
	}

	/* ---------- eliminations ---------- */

	// Several at once are shot one after another, a volley rather than one bang.
	function eliminate(c) {
		if (!c.alive) return;
		c.alive = false;
		lastShot = Math.max(clock + 0.05, lastShot + 0.16 + Math.random() * 0.22);
		c.shotAt = lastShot;
	}

	function shoot(c) {
		c.shotAt = undefined;
		c.fall = { t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
		c.model.ring.visible = false;
		c.markerOn = false;
		sound.gunshot();
		show.flash = Math.max(show.flash, 0.3);
		show.shake = Math.max(show.shake, 0.15);
	}

	/* ---------- touch: lock a door ---------- */

	stage.$el.on('click', function (e) {
		if (phase !== 'rush') return;
		const at = IGB.toWorld(e);
		const w = Math.floor(at.x / W);
		if (w < 0 || w > 2 || at.y < TOP) return;
		const a = ((at.x - w * W) / W) * 2 * S;
		const mod = modules.find((m) => m.wall === w && !m.barred && !m.locked && m.target === 1 && Math.abs(m.a - a) < DOOR_W / 2 + 0.3);
		if (!mod) return;
		const top = toScreen(w, ...doorPoint(mod, DOOR_H + 0.3, 0));
		if (at.y < top.y) return;
		const where = toScreen(w, ...doorPoint(mod, DOOR_H * 0.75, 0));
		if (mod.occupants.length === number) {
			saveGroup(mod, true);
			pop('LOCKED!', '#4aa3ff', where.x, where.y);
		} else {
			mod.pop = 1;
			sound.buzz();
			pop(`NEED ${number}`, '#ff3a5c', where.x, where.y);
		}
	});

	// A point at a door, `t` out from the wall (negative is inside the room).
	function doorPoint(mod, y, t) {
		const wall = WALLS[mod.wall];
		const p = wall.origin.clone().addScaledVector(wall.along, mod.a).addScaledVector(wall.inward, t);
		return [p.x, y, p.z];
	}

	/* ---------- every frame: the rounds ---------- */

	function stepRound(dt) {
		phaseT += dt;
		switch (phase) {
		case 'board':
			if ((phaseT > 2.4 && contestants.every(onCarousel)) || phaseT >= phaseDur) startSpin();
			break;

		case 'spin':
			if (reverseAt > 0 && phaseT >= reverseAt) {
				reverseAt = -1;
				speed = -speed;
				pop('REVERSE!', '#ffffff', W * 1.5, TOP + 120);
			}
			for (const c of contestants) {
				if (!c.alive) continue;
				if (onCarousel(c)) c.off = 0;
				else {
					c.off += dt;
					if (c.off > OFF_LIMIT && round > 0) eliminate(c);   // the first round only warns
				}
			}
			if (phaseT >= phaseDur) startStop();
			break;

		case 'stopping':
			if (stop && stop.done) callNumber();
			break;

		case 'call':
			if (phaseT >= phaseDur) setPhase('rush', settings.rush);
			break;

		case 'rush': {
			const left = Math.ceil(phaseDur - phaseT);
			if (left !== lastCount && left > 0) {
				lastCount = left;
				sound.count(left <= 3);
			}
			if (phaseT >= phaseDur) closeDoors();
			// everyone safely in early ends it early
			else if (contestants.every((c) => !c.alive || c.saved) && phaseT > 0.5) closeDoors();
			break;
		}

		case 'closing':
			if (phaseT >= phaseDur) verdict();
			break;

		case 'verdict':
			// nobody made it: the same round again; otherwise on to the next
			if (phaseT >= phaseDur) startRound(survivors ? round + 1 : round);
			break;
		}
	}

	/* ---------- every frame: the world, in every beat ---------- */

	function stepWorld(dt) {
		clock += dt;
		for (const c of contestants) if (c.shotAt !== undefined && clock >= c.shotAt) shoot(c);

		// the ring: rolling, or slowing to a stop
		let ringV = speed;
		if (stop && !stop.done) {
			stop.t += dt;
			const f = Math.min(1, stop.t / stop.dur);
			ring = stop.from + (stop.to - stop.from) * (1 - (1 - f) * (1 - f));
			ringV = (stop.to - stop.from) / stop.dur * 2 * (1 - f);
			if (f >= 1) stop.done = true;
		} else if (!stop) ring += speed * dt;

		// who's at which door
		for (const mod of modules) mod.occupants = [];
		for (const c of contestants) {
			if (c.alive && !c.saved && !c.inside) follow(c);
			c.door = null;
			if (phase === 'rush' && c.alive && !c.saved) {
				c.door = doorAt(c);
				if (c.door) c.door.occupants.push(c);
			}
		}
		// keep the groups that walked in on their door's list (for the badges)
		for (const c of contestants) if (c.inside && !c.inside.door.occupants.includes(c)) c.inside.door.occupants.push(c);

		const counting = phase === 'call' || phase === 'rush';
		for (const mod of modules) {
			const n = mod.occupants.length;
			if (!counting || mod.wall < 0 || mod.barred || mod.locked || mod.target < 1) mod.setMat(null);
			else mod.setMat(n === number ? 0x2bbf6a : n > number ? 0xff3a5c : n > 0 ? 0xf0a020 : 0xffffff);
			mod.open += Math.sign(mod.target - mod.open) * Math.min(Math.abs(mod.target - mod.open), dt * 2.2);
			mod.setOpen(mod.open);
			mod.pop = Math.max(0, mod.pop - dt * 2);
		}

		carousel.spin.rotation.y -= ringV * dt / S;
		const chasing = lit && (phase === 'idle' || phase === 'practice' || phase === 'board' || phase === 'spin' || phase === 'stopping');
		carousel.lights(clock, chasing ? 1 : 0, bulbs);

		for (const g of guards) {
			g.pop += ((guardsUp && g.root.visible ? 1 : 0) - g.pop) * Math.min(1, dt * 12);
			g.root.scale.setScalar(Math.max(0.001, g.pop));
			if (!guardsUp && g.pop < 0.02) g.root.visible = false;
		}

		for (const c of contestants) {
			pose(c, dt);
			for (let w = 0; w < 3; w++) {
				const want = visTarget(c, w);
				c.vis[w] += clamp(want - c.vis[w], -dt * FADE, dt * FADE);
			}
			// the ring, pulsing a little while they can't be seen anywhere
			const hidden = 1 - Math.max(...c.vis);
			c.model.ring.scale.setScalar(1 + hidden * (0.18 + 0.1 * Math.sin(clock * 5 + c.n)));
		}

		for (let i = pops.length - 1; i >= 0; i--) {
			pops[i].age += dt;
			if (pops[i].age > 1.4) pops.splice(i, 1);
		}
	}

	function walkPose(model, phase, amount) {
		const swing = Math.sin(phase) * 0.55 * amount;
		model.legs[0].rotation.x = swing;
		model.legs[1].rotation.x = -swing;
		model.arms[0].rotation.x = -swing * 0.8;
		model.arms[1].rotation.x = swing * 0.8;
	}

	const YAWS = [Math.PI / 2, 0, -Math.PI / 2];   // facing the left, front and right walls

	function pose(c, dt) {
		const m = c.model;

		if (c.inside) {
			// walking through the doorway, side by side
			const ins = c.inside;
			ins.t = Math.min(1, ins.t + dt / 0.8);
			const [x, , z] = doorPoint(ins.door, 0, -0.45);
			const wall = WALLS[ins.door.wall];
			const side = ins.slot * (DOOR_W - 0.5);
			c.pos.set(x + wall.along.x * side, 0, z + wall.along.z * side).lerp(ins.from, 1 - ins.t);
			c.yaw = YAWS[ins.door.wall];
		}

		m.root.position.copy(c.pos);

		if (c.fall) {
			c.fall.t += dt;
			const f = Math.min(1, c.fall.t / 0.45);
			m.lean.rotation.x = f * f * Math.PI / 2 * 0.98;
			m.lean.rotation.z = c.fall.dir * f * 0.4;
			walkPose(m, 0, 0);
			if (!c.splat && c.fall.t > 0.25) {
				c.splat = buildSplat();
				const back = new THREE.Vector3(0, 0, 0.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw);
				c.splat.position.set(c.pos.x + back.x, c.pos.y + 0.025, c.pos.z + back.z);
				scene.add(c.splat);
			}
			if (c.splat) c.splat.grow(Math.min(1, (c.fall.t - 0.25) / 0.35));
			return;
		}

		const speedNow = c.pos.distanceTo(c.last) / Math.max(dt, 1e-3);
		c.last.copy(c.pos);
		c.walk += speedNow * dt * 2.6;
		walkPose(m, c.walk, Math.min(1, speedNow / 1.2));

		// Face the wall they're nearest, so each wall mostly sees their back
		// (and their number).
		if (!c.inside) c.yaw += angleTo(c.yaw, YAWS[nearestWall(c)]) * Math.min(1, dt * 6);
		m.root.rotation.y = c.yaw;

		// off the carousel while it turns: wobble, as a warning
		const warn = phase === 'spin' && c.alive && c.off > 0;
		m.lean.rotation.z = warn ? Math.sin(clock * 18) * 0.12 : 0;
		m.marker.position.y = 2.25 + Math.sin(clock * 3 + c.n) * 0.05;
	}

	const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

	/* ---------- drawing ---------- */

	// Each contestant as wall w should show them: faded by how near they
	// are to it, gone altogether when far (shadow and all).
	function applyVis(w) {
		for (const c of contestants) {
			const v = c.vis[w];
			const m = c.model;
			m.lean.visible = v > 0.01;
			m.marker.visible = v > 0.01 && c.markerOn;
			for (const mat of c.mats) mat.opacity = v;
		}
	}

	// The three walls' views, through the show's camera: each wall's
	// viewport is moved and scaled just as the 2D canvas is, so a zoom
	// takes the hall and its overlays in together.
	function render() {
		const v = show.camera.view();
		renderer.setScissorTest(false);
		renderer.clear();
		renderer.setScissorTest(true);
		renderer.shadowMap.needsUpdate = true;
		zoomViews();
		cams.forEach(function (cam, w) {
			const x = (w * W - v.x) * v.z + WIDTH / 2;
			const y = (TOP - v.y) * v.z + H / 2;
			const ww = W * v.z;
			const hh = (H - TOP) * v.z;
			if (x + ww <= 0 || x >= WIDTH || y >= H || y + hh <= 0) return;
			placeModules(w);
			applyVis(w);
			viewport(x, y, ww, hh);
			renderer.render(scene, cam);
		});
	}

	// The world, as the show's camera sees it: the hall (three.js, under the
	// 2D canvas), then the marquee over each wall, the doors' head counts,
	// warnings and floating words.
	let drew = false;
	function drawWorld(ctx) {
		drew = true;
		render();
		art.eachWall(ctx, (c) => marquee(c));

		if (phase === 'rush' || phase === 'call' || phase === 'closing') {
			for (const mod of modules) if (mod.wall >= 0) doorBadge(ctx, mod);
		}

		// Off the carousel while it turns: get back on!
		if (phase === 'spin') {
			for (const c of contestants) {
				if (!c.alive || c.off <= 0) continue;
				const w = nearestWall(c);
				const at = toScreen(w, c.pos.x, 2.6, c.pos.z);
				const left = Math.max(0, OFF_LIMIT - c.off);
				art.with(ctx, { x: at.x, y: at.y }, function (g) {
					art.roundRect(g, -150, -46, 300, 92, 46, { fill: '#ff3a5c', stroke: 'white', lineWidth: 6 });
					show.text(g, round > 0 ? `GET ON! ${left.toFixed(1)}` : 'GET ON!', 0, 0, 40, {});
				});
			}
		}

		for (const p of pops) {
			show.text(ctx, p.text, p.x, p.y - p.age * 120, 56, { fill: p.colour, alpha: Math.min(1, 2 * (1.4 - p.age)) });
		}
	}

	const SIGN = { font: 'Paytone One', weight: 400, fill: 'white', outline: '#1a0d22', outlineWidth: 6 };
	const LEFT = 360;          // the marquee's two halves, either side of the show's clock
	const RIGHT = 1240;

	// A line of the marquee, shrunk to fit its half.
	function sign(c, text, x, size, fill = 'white') {
		c.save();
		c.font = `400 ${size}px "Paytone One", sans-serif`;
		const wide = c.measureText(text).width;
		c.restore();
		if (wide > 560) size *= 560 / wide;
		art.text(c, text, x, TOP / 2 - 4, Object.assign({}, SIGN, { size, fill }));
	}

	// A dot for each player, in their colour: filled when `state(c)` is
	// 'on', hollow when 'off', crossed out when 'dead'.
	function dots(c, x, state) {
		const n = contestants.length;
		const gap = Math.min(84, 520 / Math.max(1, n));
		contestants.forEach(function (p, i) {
			const cx = x + (i - (n - 1) / 2) * gap;
			const cy = TOP / 2 - 4;
			const s = state(p);
			if (s === 'on') art.circle(c, cx, cy, 30, { fill: PLAYER_COLORS[p.n], stroke: 'white', lineWidth: 5 });
			else art.circle(c, cx, cy, 26, { fill: 'rgba(0,0,0,0.35)', stroke: PLAYER_COLORS[p.n], lineWidth: 6 });
			if (s === 'dead') art.line(c, [[cx - 18, cy - 18], [cx + 18, cy + 18]], { stroke: '#ff3a5c', lineWidth: 8, lineCap: 'round' });
		});
	}

	// The strip of lights across the top of every wall says what's going
	// on; the show's clock sits in the middle of it.
	function marquee(c) {
		const grad = c.createLinearGradient(0, 0, 0, TOP);
		grad.addColorStop(0, '#5a1f63');
		grad.addColorStop(1, '#3a1546');
		art.rect(c, 0, 0, W, TOP, { fill: grad });
		// chasing bulbs along the bottom edge
		const chase = phase === 'spin' || phase === 'board' || phase === 'idle' || phase === 'practice';
		for (let i = 0; i < 40; i++) {
			const on = chase ? (Math.floor(clock * 8) + i) % 3 !== 0 : phase === 'rush';
			art.circle(c, 20 + i * 40, TOP - 10, 7, { fill: on ? '#fff2b0' : '#7a5a80' });
		}

		const aboard = (p) => (onCarousel(p) ? 'on' : 'off');
		switch (phase) {
		case 'idle':
		case 'practice':
			sign(c, 'MINGLE', LEFT, 80, LIGHT_PINK);
			if (contestants.length && show.beat === 'controls') dots(c, RIGHT, aboard);
			else sign(c, '○ △ □', RIGHT, 70, LIGHT_PINK);
			break;
		case 'board':
			sign(c, 'ALL ABOARD!', LEFT, 64);
			dots(c, RIGHT, aboard);
			break;
		case 'spin':
			sign(c, '♪  MINGLE  ♪', LEFT + Math.sin(clock * 3) * 30, 66, LIGHT_PINK);
			dots(c, RIGHT, (p) => (!p.alive ? 'dead' : aboard(p)));
			break;
		case 'stopping':
			sign(c, '...', LEFT, 70);
			dots(c, RIGHT, (p) => (!p.alive ? 'dead' : aboard(p)));
			break;
		case 'call':
		case 'rush': {
			sign(c, 'GROUPS OF', LEFT - 70, 56);
			const throb = 1 + 0.08 * Math.sin(clock * 10);
			art.with(c, { x: LEFT + 200, y: TOP / 2 - 6, scale: throb }, function (g) {
				art.circle(g, 0, 0, 56, { fill: PINK, stroke: 'white', lineWidth: 6 });
				art.text(g, String(number), 0, 4, Object.assign({}, SIGN, { size: 80 }));
			});
			if (show.beat !== 'play') {
				sign(c, 'PRACTICE', RIGHT, 60, '#9fe0c9');
				break;
			}
			// the time left, as a bar that runs down
			const left = phase === 'rush' ? Math.max(0, phaseDur - phaseT) : settings.rush;
			const bw = 400;
			const bx = RIGHT - bw / 2 - 40;
			const frac = Math.max(0, left / settings.rush);
			art.roundRect(c, bx, TOP / 2 - 26, bw, 44, 22, { fill: 'rgba(0,0,0,0.4)' });
			art.roundRect(c, bx, TOP / 2 - 26, Math.max(44, bw * frac), 44, 22, { fill: left <= 3 ? '#ff3a5c' : '#3ddc84' });
			art.text(c, Math.ceil(left) + 's', bx + bw + 60, TOP / 2 - 4, Object.assign({}, SIGN, { size: 50 }));
			break;
		}
		case 'closing':
			sign(c, 'DOORS CLOSING', LEFT, 62, '#ff3a5c');
			dots(c, RIGHT, (p) => (p.saved ? 'on' : !p.alive ? 'dead' : 'off'));
			break;
		case 'verdict': {
			const text = survivors === contestants.length ? 'EVERYONE SURVIVED' : survivors ? `${survivors} SURVIVED` : 'NOBODY SURVIVED';
			sign(c, text, LEFT, 60);
			dots(c, RIGHT, (p) => (p.saved ? 'on' : 'dead'));
			break;
		}
		case 'over':
			sign(c, 'MINGLE', LEFT, 80, LIGHT_PINK);
			sign(c, 'TIME!', RIGHT, 80, '#ff3a5c');
			break;
		}
	}

	// Over each door: how many are at it, against how many it needs.
	function doorBadge(ctx, mod) {
		const at = toScreen(mod.wall, ...doorPoint(mod, DOOR_H * 0.62, 0));
		if (mod.barred) return;
		const n = mod.occupants.length;
		let fill = 'rgba(30, 20, 45, 0.75)';
		let label = `${n}/${number}`;
		if (mod.locked) { fill = '#4aa3ff'; label = n ? `IN ${n}` : 'SHUT'; }
		else if (mod.target === 0 && phase === 'closing') return;
		else if (n === number) fill = '#2bbf6a';
		else if (n > number) fill = '#ff3a5c';
		else if (n > 0) fill = '#f0a020';
		art.with(ctx, { x: at.x, y: at.y }, function (g) {
			art.roundRect(g, -88, -44, 176, 88, 44, { fill, stroke: 'white', lineWidth: 5 });
			art.text(g, label, 0, 2, { size: 50, font: 'Paytone One', weight: 400, fill: 'white' });
			if (!mod.locked && n === number && phase === 'rush') {
				show.text(g, 'TAP TO LOCK', 0, 78, 28, { alpha: 0.6 + 0.4 * Math.sin(clock * 8) });
			}
		});
	}

	// A contestant facing the room, for the results: the chibi in the green
	// tracksuit from Red Light Green Light, their number on the chest, their
	// colour round their feet. Feet at the origin, about 136 tall. Pose
	// 'stand', 'cheer' (arms up) or 'win' (arms up, waving, a big grin).
	function contestantFront(c, n, pose) {
		const TEAL = '#1f8a6e';
		const PANTS = '#17705a';
		const SLEEVE = '#176f5b';
		const SKIN = '#f2c9a8';
		const up = pose === 'cheer' || pose === 'win';
		const wave = pose === 'win' ? Math.sin(clock * 9 + n) * 0.35 : 0;
		art.ellipse(c, 0, 0, 44, 14, { fill: PLAYER_COLORS[n] || 'white' });
		art.ellipse(c, 0, 0, 28, 8, { fill: 'rgba(0,0,0,0.3)' });
		// legs, white stripes down the outsides, white trainers
		for (const side of [-1, 1]) {
			art.roundRect(c, side * 8.5 - 6.5, -44, 13, 38, 4, { fill: PANTS });
			art.rect(c, side * 13 - 1.25, -42, 2.5, 32, { fill: 'white' });
			art.roundRect(c, side * 8.5 - 8, -10, 16, 10, 4, { fill: '#f6f6f2' });
		}
		// arms: hanging, or flung up (waving, to win)
		for (const side of [-1, 1]) {
			const a = up ? side * (2.5 + wave * side) : side * 0.12;   // radians out from hanging down
			const sx = side * 22;
			const sy = -84;
			const hx = sx + Math.sin(a) * 40;
			const hy = sy + Math.cos(a) * 40;
			art.line(c, [[sx, sy], [hx, hy]], { stroke: SLEEVE, lineWidth: 12, lineCap: 'round' });
			art.circle(c, hx + Math.sin(a) * 4, hy + Math.cos(a) * 4, 6.5, { fill: SKIN });
		}
		// the jacket, its zip and collar, and the number on the chest
		art.roundRect(c, -22, -90, 44, 50, [13, 13, 7, 7], { fill: TEAL });
		art.rect(c, -1, -86, 2, 44, { fill: 'rgba(255,255,255,0.55)' });
		art.poly(c, [[-13, -90], [0, -80], [13, -90]], { fill: 'white' });
		art.roundRect(c, -19, -74, 17, 13, 2, { fill: 'white' });
		art.text(c, NUMBERS[n] || String(n + 1).padStart(3, '0'), -10.5, -67.5, { size: 10, font: 'Rubik', weight: 800, fill: INK });
		// the head: black hair, a round face, a fringe
		art.rect(c, -6, -98, 12, 9, { fill: SKIN });
		art.circle(c, 0, -116, 23, { fill: '#1a1612' });
		for (const side of [-1, 1]) art.ellipse(c, side * 21, -110, 4.5, 6.5, { fill: SKIN });
		art.circle(c, 0, -110, 18.5, { fill: SKIN });
		art.ellipse(c, 0, -125, 21, 8.5, { fill: '#1a1612' });
		for (const side of [-1, 1]) {
			art.ellipse(c, side * 7, -110, 2.8, up ? 2 : 3.6, { fill: '#1a1612' });
			art.ellipse(c, side * 11.5, -103, 3.6, 2.2, { fill: '#ff8fa8', alpha: 0.75 });
		}
		if (up) art.ellipse(c, 0, -100, pose === 'win' ? 5.5 : 4.5, pose === 'win' ? 4.5 : 3.5, { fill: '#8a2a34' });
		else art.rect(c, -3.5, -101, 7, 1.8, { fill: '#8a2a34' });
	}

	// A flat circle, triangle or square, r across, centred.
	function shape(c, kind, r, fill) {
		if (kind === 'circle') art.circle(c, 0, 0, r, { stroke: fill, lineWidth: r * 0.28 });
		else if (kind === 'triangle') art.poly(c, [[0, -r * 1.1], [r * 1.05, r * 0.7], [-r * 1.05, r * 0.7]], { stroke: fill, lineWidth: r * 0.28, lineJoin: 'round' });
		else art.rect(c, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, { stroke: fill, lineWidth: r * 0.28 });
	}
	const SHAPES = ['circle', 'triangle', 'square'];

	/* ---------- the controls intro ---------- */

	// The step through the controls: one at a time, each with its caption,
	// played live in the hall. A step moves on once the players have done it
	// (and it has had its minimum time), or when its time runs out. Nobody
	// is shot in practice.
	const practice = { i: 0, age: 0, done: false, doneAge: 0 };
	const stepsDone = [];      // the steps the players did (rather than timed out of), for tests

	function enterStep(i) {
		Object.assign(practice, { i, age: 0, done: false, doneAge: 0 });
		const step = CONTROLS.steps[i];
		if (!step) return;
		show.play('woosh');
		show.sfx.hit(0.35);
		for (const c of contestants) c.seen = false;
		if (step.id === 'carousel') {
			speed = CONTROLS.roll;
			sound.music(true, 2.2);
			setPhase('practice');
		}
		if (step.id === 'room') {
			// the music stops, the doors come to rest and open: rooms for one
			sound.music(false);
			sound.windDown();
			beginStop();
			number = CONTROLS.number;
			setPhase('practice');
		}
	}

	function achieved(step) {
		switch (step.id) {
			case 'carousel': return contestants.every(onCarousel);
			case 'reveal': return contestants.every((c) => c.seen);
			case 'room': return phase === 'rush' && contestants.every((c) => c.saved || (c.door && c.door.occupants.length === number));
			case 'lock': return contestants.every((c) => c.saved);
		}
		return false;
	}

	function stepControls(dt) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		practice.age += dt;
		phaseT += dt;
		if (step.id === 'room' && phase === 'practice' && stop && stop.done) {
			openDoors(0);
			setPhase('rush', Infinity);
		}
		// there you are! the first time each player sees themselves on a wall
		if (step.id === 'reveal') {
			for (const c of contestants) {
				if (c.seen || Math.max(...c.vis) < 0.9) continue;
				c.seen = true;
				popOver(c, 'THERE YOU ARE!', PLAYER_COLORS[c.n]);
				show.play('coin');
			}
		}
		if (!practice.done && practice.age >= step.min && achieved(step)) {
			practice.done = true;
			stepsDone.push(step.id);
			sound.ding();
			show.play('correct');
			show.sfx.sting(0.15);
		}
		if (practice.done) practice.doneAge += dt;
		if ((practice.done && practice.doneAge >= CONTROLS.nice) || practice.age >= step.max) enterStep(practice.i + 1);
	}

	// Back to an empty hall after the practice: everyone up, doors shut.
	function finishPractice() {
		for (const c of contestants) revive(c);
		shutDoors();
		stop = null;
		number = 0;
		lastNumber = 0;
		setPhase('idle');
	}

	/* ---------- the beats ---------- */

	// The running order. Each beat has its length and its own update and
	// draw; the generic ones come from shared/showtime.js. The hall runs on
	// behind every beat that shows it.
	show.sequence([
		// 1. how many players, over the dim hall, the doors drifting round
		{
			id: 'squad',
			length: Infinity,
			enter() { speed = IDLE_ROLL; },
			update(dt) { show.blackout = 0.45; stepWorld(dt); },
		},

		// 1b. the title, crashing in letter by letter
		show.beats.titleDrop({
			lines: [{ text: 'MINGLE', fill: LIGHT_PINK, glow: PINK }],
			tagline: 'FIND YOUR GROUP',
			enter() { speed = IDLE_ROLL; },
			update(dt) { stepWorld(dt); },
		}),

		// 2. the ten-minute clock; it starts a moment after it lands, and runs
		// through everything after
		show.beats.clockIntro({
			update(dt) { stepWorld(dt); },
		}),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors({
			update(dt) { stepWorld(dt); },
		}),

		// 3. the controls, one at a time, live in the hall
		{
			id: 'controls',
			length: CONTROLS.steps.reduce((a, s) => a + s.max + CONTROLS.nice, 0),   // a safety net: each step has its own limit
			done: () => practice.i >= CONTROLS.steps.length,
			enter() {
				show.camera.wide(0.4);
				show.play('tutorial');
				enterStep(0);
			},
			update(dt) {
				stepControls(dt);
				stepWorld(dt);
			},
			draw(ctx) {
				const step = CONTROLS.steps[practice.i];
				if (!step) return;
				show.onWalls(ctx, function (c) {
					show.slam(c, step.caption, W / 2, 560, step.caption.length > 24 ? 80 : 96, practice.age, { fill: 'white' });
					// which step this is, as pips
					CONTROLS.steps.forEach(function (s, i) {
						const x = W / 2 + (i - (CONTROLS.steps.length - 1) / 2) * 50;
						art.circle(c, x, 650, i === practice.i ? 13 : 9, { fill: i < practice.i || (i === practice.i && practice.done) ? '#f7d774' : i === practice.i ? 'white' : 'rgba(255,255,255,0.45)' });
					});
					if (practice.done) show.slam(c, 'NICE!', W / 2, 800, 140, practice.doneAge, { fill: '#7dff9e', glow: '#2bbf6a', rotate: -0.06 });
				});
			},
		},

		// 4. the host's hall: dark, the camera tight on the carousel; its bulbs
		// come on one by one, three masked guards pop up on it, THE MINGLE,
		// the music, the carousel turns and the doors roll, the camera pulls
		// back to the whole hall; the guards go, and ROUND 1
		{
			id: 'host',
			length: HOST.length,
			enter() {
				show.stop('tutorial');
				finishPractice();
				sound.music(false);
				speed = 0;
				lit = 0;
				bulbs = 0;
				carousel.spin.rotation.y = 0;
				show.camera.wide();
				hallZoom = HOST.zoom;
				show.play('rumble');
				show.sfx.riser(HOST.name);
			},
			update(dt, bt) {
				const E = HOST;
				stepWorld(dt);
				show.blackout = 0.85 * (1 - between(bt, E.bulbs[0], E.bulbs[1] + 0.4));
				bulbs = between(bt, E.bulbs[0], E.bulbs[1]);
				for (let i = 0; i < 6; i++) if (show.cue(E.bulbs[0] + i * (E.bulbs[1] - E.bulbs[0]) / 6)) show.sfx.hit(0.2);
				guards.forEach(function (g, i) {
					if (show.cue(E.guards + i * 0.22)) {
						guardsUp = true;
						g.root.visible = true;
						show.sfx.drum(0.6);
						show.shake = Math.max(show.shake, 0.2);
					}
				});
				if (show.cue(E.name)) {
					show.stop('rumble');
					show.play('explode');
					show.sfx.boom(1);
					show.shake = 0.9;
					show.flash = 0.5;
					lit = 1;
					sound.say('Mingle. Mingle.');
					sound.music(true, 2.6);
				}
				if (bt > E.name && bt < E.leave) speed = E.speed * between(bt, E.name, E.name + 1.5);
				if (show.cue(E.pull)) show.play('wooshLong');
				hallZoom = Math.exp(Math.log(E.zoom) * (1 - show.ease(between(bt, E.pull, E.pull + E.pullFor))));
				if (show.cue(E.rule)) { show.sfx.drum(); show.shake = 0.3; }
				if (show.cue(E.leave)) {
					guardsUp = false;
					show.play('woosh');
					sound.music(false);
					sound.windDown();
					beginStop();
				}
				if (show.cue(E.go)) { show.sfx.boom(1); show.play('reveal'); show.shake = 0.5; show.flash = 0.3; }
			},
			draw(ctx, bt) {
				const E = HOST;
				const out = 1 - between(bt, E.pull, E.pull + 0.4);
				const ruleOut = 1 - between(bt, E.leave - 0.3, E.leave + 0.1);
				show.onWalls(ctx, function (c) {
					// ○ △ □, one for each guard
					SHAPES.forEach(function (kind, i) {
						const age = bt - E.guards - i * 0.22;
						if (age < 0) return;
						const s = age < 0.2 ? 2.2 - 1.2 * (age / 0.2) : 1;
						art.with(c, { x: W / 2 + (i - 1) * 130, y: 230, scale: s, alpha: out * Math.min(1, age * 6) }, (c2) => shape(c2, kind, 40, i === 1 ? 'white' : LIGHT_PINK));
					});
					show.slam(c, 'THE MINGLE', W / 2, 800, 200, bt - E.name, { fill: LIGHT_PINK, glow: PINK, alpha: out });
					show.slam(c, 'WHEN THE MUSIC STOPS...', W / 2, 930, 56, bt - E.name - 0.5, { fill: 'white', alpha: out });
					show.slam(c, 'FIND YOUR GROUP', W / 2, 430, 150, bt - E.rule, { fill: '#f7d774', glow: '#ff7a3d', alpha: ruleOut });
					show.slam(c, 'OR BE LEFT OUT', W / 2, 580, 90, bt - E.rule - 0.6, { fill: '#ff3a5c', glow: '#ff3a5c', alpha: ruleOut });
					const go = 1 - between(bt, E.length - 0.4, E.length);
					show.slam(c, 'ROUND 1', W / 2, 480, 160, bt - E.go, { fill: LIGHT_PINK, glow: PINK, rotate: -0.05, alpha: go });
				});
			},
		},

		// 5. the rounds, until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				guardsUp = false;
				hallZoom = 1;
				show.camera.wide(0.4);
				if (round < 0) {
					// (also straight here from the skip button, mid-intro)
					show.stop('tutorial');
					finishPractice();
					sound.music(false);
					begin();
				}
				show.label('ROUND ' + (round + 1));
			},
			update(dt) {
				// t is play time, for the replay; the ten-minute clock is the
				// show's, and it calls TIME! itself.
				t += dt;
				show.label('ROUND ' + (round + 1));
				show.record(t, contestants.map((c) => ({ px: c.px, pz: 1 - c.pz })));   // the show counts pz from the back
				stepRound(dt);
				stepWorld(dt);
			},
			draw(ctx) {
				show.onWalls(ctx, function (c) {
					if (phase === 'board' && phaseT < 2.6) {
						const fade = 1 - between(phaseT, 2.1, 2.6);
						show.slam(c, 'ROUND ' + (round + 1), W / 2, 450, 170, phaseT - 0.1, { fill: LIGHT_PINK, glow: PINK, alpha: fade });
						show.slam(c, 'STAND ON THE CAROUSEL', W / 2, 590, 70, phaseT - 0.4, { fill: 'white', alpha: fade });
					}
					if (phase === 'call' || (phase === 'rush' && phaseT < 0.6)) {
						const age = phase === 'call' ? phaseT : 1.1 + phaseT;
						const fade = 1 - between(age, 1.2, 1.7);
						show.slam(c, 'GROUPS OF', W / 2, 540, 90, age, { fill: 'white', alpha: fade });
						show.slam(c, String(number), W / 2, 760, 280, age - 0.1, { fill: '#f7d774', glow: PINK, alpha: fade });
					}
					if (phase === 'verdict') {
						const fade = 1 - between(phaseT, phaseDur - 0.4, phaseDur);
						if (survivors) {
							show.slam(c, 'ROUND ' + (verdictRound + 1) + ' CLEAR!', W / 2, 430, 150, phaseT - 0.1, { fill: '#f7d774', glow: '#ff7a3d', alpha: fade });
							show.slam(c, survivors + ' SURVIVED', W / 2, 580, 80, phaseT - 0.5, { fill: 'white', alpha: fade });
						} else {
							show.slam(c, 'NOBODY SURVIVED', W / 2, 430, 140, phaseT - 0.1, { fill: '#ff3a5c', glow: '#ff3a5c', alpha: fade });
							show.slam(c, 'ROUND ' + (verdictRound + 1) + ' AGAIN!', W / 2, 580, 80, phaseT - 0.5, { fill: 'white', alpha: fade });
						}
					}
				});
			},
		},

		// 6. TIME!: the world slows and stops, the music dies
		show.beats.timeUp({
			enter() {
				sound.music(false);
				setPhase('over');
				speed = 0;
			},
			update(dt) { stepWorld(dt * show.timeScale); },
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		// how was it? five faces to tap, sad to happy
		show.beats.rate(),

		show.beats.end({
			enter() {
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(contestants.map((c) => c.score)));
			},
		}),
	]);

	let last;
	let glShown = true;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		drew = false;
		show.frame(ctx, dt, drawWorld);
		// the results draw on their own backdrop: hide the hall under them
		if (drew !== glShown) {
			glShown = drew;
			$gl.css({ visibility: drew ? 'visible' : 'hidden' });
		}
		sound.tick();
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		contestants.forEach(function (c, i) {
			if (!p[i]) return;
			c.px = Math.max(0, Math.min(1, p[i].px));
			c.pz = Math.max(0, Math.min(1, p[i].pz === undefined ? 0.5 : 1 - p[i].pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	// For tests and the console: where the show and the game are up to.
	self.state = function () {
		return Object.assign(show.state(), {
			phase, round, number, ring, t, timeLeft: show.timeLeft(),
			step: CONTROLS.steps[practice.i] ? CONTROLS.steps[practice.i].id : null, stepAge: practice.age, stepDone: practice.done, stepsDone: stepsDone.slice(),
			glVisible: glShown,
			guards: guards.filter((g) => g.root.visible).length,
			doors: modules.filter((m) => m.wall >= 0).map((m) => ({
				number: m.number, wall: m.wall, a: m.a, barred: m.barred, locked: m.locked, open: m.target === 1,
				occupants: m.occupants.map((c) => c.n),
				// where to stand to be at it, as px / pz
				spot: spotFor(m),
				// where to tap to lock it, in world pixels
				tap: toScreen(m.wall, ...doorPoint(m, DOOR_H * 0.5, 0)),
			})),
			contestants: contestants.map((c) => ({
				n: c.n, x: c.pos.x, z: c.pos.z, alive: c.alive, saved: c.saved, off: c.off, score: c.score,
				onCarousel: onCarousel(c), vis: c.vis.slice(), seen: c.seen,
			})),
		});
	};

	function spotFor(mod) {
		const [x, , z] = doorPoint(mod, 0, 1);
		return { px: (x / S + 1) / 2, pz: (z / S + 1) / 2 };
	}

	// Test hooks: jump to any beat (skipping the intros), wind the clock on.
	const INTROS = ['squad', 'title', 'clock', 'visors', 'controls', 'host'];
	self.test = {
		skipTo(id) {
			if (!contestants.length) initGame(playersMeta ? playersMeta.length : 3);
			if (INTROS.indexOf(id) < 0) {
				show.camera.wide();
				if (round < 0) {
					finishPractice();
					sound.music(false);
					begin();
				}
			}
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
	};

	self.fini = function () {
		sound.close();
		show.fini();
		unlisten();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	show.go('squad');

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
