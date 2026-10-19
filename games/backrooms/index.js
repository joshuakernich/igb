/*
 * Backrooms
 *
 * A spot-the-difference memory game, shot on an old camcorder in an empty
 * office that goes on for ever: yellowed wallpaper, damp carpet, buzzing
 * fluorescent panels in a drop ceiling, cubicles nobody sits in.
 *
 * It runs as a show (shared/showtime.js): the squad picker, the title drop,
 * the ten-minute clock, the controls stepped through live on the first floor
 * (look round all three walls, tap the chair that changed, wrong taps cost
 * time), then something at the end of a corridor and LEVEL 0. Then the
 * rounds, until the clock runs out:
 *
 * The office wraps round all three walls. REMEMBER EVERYTHING: the squad
 * has a few seconds to take it in. Then the camera sinks through the carpet
 * and the slab and drops out of the ceiling of the floor below, which is
 * almost the same. TAP THE DIFFERENCES: a chair turned to the wall, a door
 * standing open, a dead light, a monitor on, a new damp patch... Each find
 * is circled in the colour of whoever stands nearest that wall; a wrong tap
 * buzzes, makes the lights stutter and costs tape. When the tape runs out,
 * the ones nobody found pulse. If nobody found anything, the tape rewinds
 * and the round goes again; otherwise down again, to a new floor, each with
 * less time to look, more differences and subtler ones, and the lights a
 * little dimmer and greener. Something may be standing at the end of a
 * corridor. Then TIME!, the scores, the podium, the team total, the
 * leaderboard and the replay.
 *
 * The three walls are one 3D view: a camera per wall, 90 degrees each, all
 * from one eye at standing height in the middle of the room. three.js draws
 * into its own canvas under the world canvas; the show's overlays go on top.
 *
 * Input: wall touches (taps). px / pz decide whose tap it was: the player
 * standing nearest the tapped point. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { BUILDERS, buildShell, panelMats, CEIL, wallPoint, wallYaw } from './models.js';
import { generate, mutate, R } from './layout.js';
import { createSound } from './sound.js';

IGB.register('backrooms', function BackroomsGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;     // the show's clock: rounds until it runs out
	// Each round: seconds to look, differences to find, seconds of tape to find them.
	// Harder each round; past the fourth it keeps going, a little harder still.
	function levelCfg(L) {
		return { look: Math.max(7, 15 - 2 * L), diffs: Math.min(9, 5 + L), tap: Math.max(30, 40 - 2 * Math.floor(L / 2)) };
	}
	const READY = 2.6;            // seconds of ROUND n before the look
	const DESCENT = 4.6;          // seconds to sink to the floor below
	const REWIND = 2.4;           // seconds to rewind back up, when a round goes again
	const REVEAL = 5;             // seconds showing what was missed
	const PENALTY = 3;            // seconds of tape lost for a wrong tap
	const DEPTH_BONUS = 5;        // team points for each round finished
	const EYE = 1.6;              // camera height above the carpet
	const FLOOR_H = CEIL + 1.2;   // floor to floor: room, plenum and slab
	const SPACING = 200;          // world pixels kept between differences on a wall
	const MIN_HIT = 0.75;         // metres: a difference's tap volume is at least this big...
	const HIT_PAD = 0.25;         // ...plus this much all round
	const FONT = 'VT323';         // the camcorder's on-screen lettering

	// The controls, stepped through live on the first floor. A step moves on
	// once the players have done it (and it has had its minimum), or at its max.
	const CONTROLS = {
		steps: [
			{ id: 'look', caption: 'LOOK AROUND: THE ROOM WRAPS ALL THREE WALLS', min: 3, max: 6.5 },
			{ id: 'tap', caption: 'TAP ANYTHING THAT\'S CHANGED', min: 2.5, max: 14 },
			{ id: 'wrong', caption: 'WRONG TAPS COST TIME', min: 3.2, max: 6.5 },
		],
		nice: 1.2,            // the NICE! once a step is done
		moved: 0.3,           // how far (room widths, per player) counts as looking round
		change: 1.4,          // the practice chair changes this long into its step
		hint: 5,              // and gets a ring round it if nobody has tapped it by then
		demoEvery: 1.5,       // a demonstration wrong tap, this often
		tape: 40,             // the demonstration tape, in seconds
	};

	// Something at the end of the corridor: the lights buzz and stutter, the
	// camera creeps down the front corridor toward it, the camcorder finds it,
	// the lights die, and when they come back it's gone: LEVEL 0.
	const ENTITY = {
		flicker: [0.2, 2.6],  // the lights stutter
		push: [1.0, 7.2],     // the slow push down the corridor
		depth: 3.2,           // metres past the doorway the camera gets to
		far: 12.5,            // where it stands, metres past the doorway
		focus: 4.2,           // the camcorder's focus box finds it
		out: 7.2,             // the lights die
		back: 7.8,            // and come back, the camera at the middle again
		title: 8.0,           // LEVEL 0
		length: 11,
	};

	// The mood of each floor: lights dimmer and greener, the haze closer.
	const MOODS = [
		{ sky: 0xfff0b4, ground: 0x6d5a2c, hemi: 2.1, lamp: 7, fog: 0xb19d52, near: 7, far: 34, panel: 0xfff6d2 },
		{ sky: 0xf2eea0, ground: 0x5f5828, hemi: 1.7, lamp: 5.5, fog: 0x9a9446, near: 6, far: 29, panel: 0xf6f6c0 },
		{ sky: 0xdbe89a, ground: 0x4a5224, hemi: 1.25, lamp: 4, fog: 0x77803f, near: 4.5, far: 24, panel: 0xe6f5b8 },
		{ sky: 0xc4de90, ground: 0x343f1c, hemi: 0.85, lamp: 2.6, fog: 0x4f5a2c, near: 3, far: 19, panel: 0xcfeeaa },
	];

	// The show's colours: nicotine yellow and a sickly green on near-black.
	const YELLOW = '#f2dc5d';
	const GREEN = '#9fc24a';
	const RED = '#ff5a4a';

	if (!document.querySelector('link[data-backrooms]')) {
		$('<link rel="stylesheet" data-backrooms href="https://fonts.googleapis.com/css2?family=VT323&display=swap">').appendTo('head');
	}

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	// Work in the canvas's own pixels, so the walls' viewports can be rounded
	// to meet exactly (scaled CSS pixels leave hairline gaps at the corners).
	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 6000 / WIDTH);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
	}
	// A rectangle in world pixels (y down) as a viewport in canvas pixels (y up).
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
	scene.background = new THREE.Color(MOODS[0].fog);
	scene.fog = new THREE.Fog(MOODS[0].fog, MOODS[0].near, MOODS[0].far);
	const hemi = new THREE.HemisphereLight(MOODS[0].sky, MOODS[0].ground, MOODS[0].hemi);
	scene.add(hemi);

	// One camera per wall, all at the same eye, each exactly 90 degrees wide
	// and level, so the office runs on round the corners without a seam.
	const rig = new THREE.Group();
	scene.add(rig);
	const VFOV = 2 * Math.atan(H / W) * 180 / Math.PI;
	const cams = [Math.PI / 2, 0, -Math.PI / 2].map(function (yaw) {
		const cam = new THREE.PerspectiveCamera(VFOV, W / H, 0.05, 90);
		cam.rotation.y = yaw;
		rig.add(cam);
		return cam;
	});
	// Lamps that travel with the eye, standing in for the panels overhead.
	const lamps = [[0, -4.6], [-4.6, 0], [4.6, 0], [-3, -3], [3, -3]].map(function ([x, z]) {
		const l = new THREE.PointLight(0xfff0c0, MOODS[0].lamp, 0, 1.6);
		l.position.set(x, 0.9, z);
		rig.add(l);
		return l;
	});

	/* ---------- floors ---------- */

	const floors = new Map();     // n (0 at the top, counting down) -> floor
	const floorY = (n) => -n * FLOOR_H;
	const eyeY = (n) => floorY(n) + EYE;

	function buildItem(item) {
		const g = BUILDERS[item.type](item.props);
		g.position.set(item.x, item.y, item.z);
		g.rotation.y = item.rot;
		g.userData.itemId = item.id;
		return g;
	}

	function placeItem(f, item) {
		const g = buildItem(item);
		f.group.add(g);
		f.byId.set(item.id, g);
		g.updateMatrixWorld(true);
		if (g.userData.flicker) f.flickers.push(Object.assign({ id: item.id, on: true, until: 0 }, g.userData.flicker));
	}

	function removeItem(f, id) {
		const g = f.byId.get(id);
		if (!g) return;
		f.group.remove(g);
		f.byId.delete(id);
		f.flickers = f.flickers.filter((fl) => fl.id !== id);
	}

	function buildFloor(n, layout) {
		const group = new THREE.Group();
		group.position.y = floorY(n);
		scene.add(group);
		group.add(buildShell({ R, openings: layout.openings }));
		group.updateMatrixWorld(true);
		const f = { n, group, layout, byId: new Map(), flickers: [] };
		for (const it of layout.items) placeItem(f, it);
		floors.set(n, f);
		return f;
	}

	function dropFloor(n) {
		const f = floors.get(n);
		if (!f) return;
		scene.remove(f.group);
		for (const fl of f.flickers) { fl.face.dispose(); if (fl.glow) fl.glow.dispose(); }
		floors.delete(n);
	}

	function showFloors(...ns) {
		for (const [n, f] of floors) f.group.visible = ns.includes(n);
	}

	/* ---------- the differences ---------- */

	const raycaster = new THREE.Raycaster();
	const v3 = new THREE.Vector3();
	let diffs = [];               // this level's: { id, kind, label, wall, x, y, r, hit, found, by, foundAt }

	// Put the eye on floor n, for projecting and raycasting.
	function eyeOn(n) {
		rig.position.set(0, eyeY(n), 0);
		rig.rotation.set(0, 0, 0);
		rig.updateMatrixWorld(true);
	}

	// A world-space point on the walls: { wall, x, y } in world pixels, or null.
	function toWalls(p) {
		for (let i = 0; i < 3; i++) {
			v3.copy(p).project(cams[i]);
			if (v3.z > -1 && v3.z < 1 && Math.abs(v3.x) <= 1 && Math.abs(v3.y) <= 1) {
				return { wall: i, x: i * W + (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, nx: v3.x, ny: v3.y };
			}
		}
		return null;
	}

	// Can the eye on floor f see group g (whose centre is `target`)?
	function canSee(f, g, target) {
		const eye = new THREE.Vector3(0, eyeY(f.n), 0);
		const dir = target.clone().sub(eye);
		const dist = dir.length();
		raycaster.set(eye, dir.normalize());
		raycaster.far = dist + 0.5;
		for (const h of raycaster.intersectObject(f.group, true)) {
			if (h.object.userData.noOcclude) continue;
			for (let o = h.object; o; o = o.parent) if (o === g) return true;
			return h.distance > dist - 0.15;
		}
		return true;
	}

	// A box in the room (with the eye already placed) as a mark on the walls:
	// where it is, how big a ring it needs, and the volume a tap should hit.
	function markFor(box) {
		const at = toWalls(box.getCenter(new THREE.Vector3()));
		if (!at) return null;
		// how big it looks: the spread of its corners on the wall
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
		for (let i = 0; i < 8; i++) {
			v3.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cams[at.wall]);
			const x = (v3.x + 1) / 2 * W;
			const y = (1 - v3.y) / 2 * H;
			x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
		}
		const size = Math.max(x1 - x0, y1 - y0);
		const hit = box.clone();
		const s = hit.getSize(new THREE.Vector3());
		hit.expandByVector(new THREE.Vector3(Math.max(0, MIN_HIT - s.x) / 2 + HIT_PAD, Math.max(0, MIN_HIT - s.y) / 2 + HIT_PAD, Math.max(0, MIN_HIT - s.z) / 2 + HIT_PAD));
		return { at, size, wall: at.wall, x: at.x, y: at.y, r: Math.max(55, Math.min(190, size * 0.62 + 18)), hit };
	}

	// A candidate difference, if it's clearly visible and not crowding
	// another: its tap point, marker size and hit volume on the floor below.
	function judge(c, up, down, kept) {
		const src = c.kind === 'missing' ? up : down;
		const g = src.byId.get(c.itemId);
		if (!g) return null;
		const box = new THREE.Box3().setFromObject(g);
		if (box.isEmpty()) return null;
		const centre = box.getCenter(new THREE.Vector3());
		eyeOn(src.n);
		if (!canSee(src, g, centre)) return null;
		if (src === up) box.translate(new THREE.Vector3(0, -FLOOR_H, 0));
		eyeOn(down.n);
		const m = markFor(box);
		if (!m || Math.abs(m.at.nx) > 0.84 || Math.abs(m.at.ny) > 0.86) return null;
		if (kept.some((d) => Math.hypot(d.x - m.x, d.y - m.y) < SPACING)) return null;
		if (m.size < 16 && c.kind !== 'figure') return null;
		return {
			kind: c.kind, label: c.label, wall: m.wall, x: m.x, y: m.y, r: m.r,
			hit: m.hit, found: false, by: -1, foundAt: 0,
		};
	}

	// Build a floor and its near-copy below, and keep the differences that
	// can really be seen; any others are put back as they were.
	function prepareLevel(L) {
		const cfg = levelCfg(L);
		const seed = Math.floor(Math.random() * 1e9);
		const upLayout = generate(seed);
		const up = buildFloor(2 * L, upLayout);
		const original = new Map(upLayout.items.map((it) => [it.id, it]));
		// A few goes, in case too many candidates hide behind things.
		for (let attempt = 0; attempt < 4; attempt++) {
			const { layout: downLayout, diffs: candidates } = mutate(upLayout, cfg.diffs * 3, Math.min(L, 3), seed + 1 + attempt);
			const down = buildFloor(2 * L + 1, downLayout);
			const kept = [];
			for (const c of candidates) {
				const d = kept.length < cfg.diffs ? judge(c, up, down, kept) : null;
				if (d) { kept.push(d); continue; }
				removeItem(down, c.itemId);
				if (!c.added && original.has(c.itemId)) placeItem(down, original.get(c.itemId));
			}
			if (kept.length >= cfg.diffs || attempt === 3) {
				diffs = kept.map((d, i) => Object.assign(d, { id: i }));
				break;
			}
			dropFloor(2 * L + 1);
		}
		eyeOn(Math.round(-camY / FLOOR_H));
	}

	/* ---------- the game's state ---------- */

	const sound = createSound();

	let players = 0;
	let people = [];              // { px, pz } per player (pz 0 at the front wall, 1 at the back)
	let scores = [];
	let level = 0;
	let begun = false;            // the rounds have started
	let retry = false;            // this round is going again (nobody found anything)
	let outcome = null;           // how the last round went: { found, total }
	let levelsDone = 0;           // rounds finished, for the team's depth bonus
	let phase = 'waiting';        // waiting, ready, look, descend, tap, reveal, rewind, over
	let phaseT = 0;
	let phaseDur = 0;
	let floorN = 0;               // the floor the camera is on (or leaving)
	let camY = eyeY(0);
	let descent = null;           // { from, to, crossed: [] }
	let timeLeft = 0;             // this round's tape
	let misses = 0;
	let clock = 0;
	let t = 0;                    // play time, for the replay
	let stutter = 0;              // seconds of stuttering lights left
	let lastWrong = -1;
	let lastTick = 0;
	let mood = 0;                 // eases toward the level, 0..3
	let callout = null;           // { text, age, dur }
	let nextSteps = 8;
	let paused = false;           // test hook: the clock stands still
	let completed = false;
	let frameDt = 0;
	const push = { x: 0, z: 0 };  // the camera crept off the middle (the entity's corridor)
	let zoom3d = 1;               // the cameras pushed in (TIME!)
	let darkSides = 0;            // the side walls darkened, 0..1 (the corridor push)
	const pops = [];              // floating words: { text, colour, x, y, age }
	const wrongs = [];            // red crosses: { x, y, age }

	function setPhase(p, dur = 0) {
		phase = p;
		phaseT = 0;
		phaseDur = dur;
	}

	const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
	const lerp = (a, b, t) => a + (b - a) * t;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const between = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

	function say(text, dur, voice = true) {
		callout = { text, age: 0, dur };
		if (voice) sound.say(text.toLowerCase());
	}

	/* ---------- the show ---------- */

	const show = new Showtime(stage, {
		id: 'backrooms',
		seconds: GAME_SECONDS,
		players: () => players,
		scores: () => scores,
		bonus: () => levelsDone * DEPTH_BONUS,
		bonusLabel: 'DEPTH BONUS',
		drawAvatar: hazmat,
		theme: {
			accent: YELLOW, accent2: '#7d8f2a', gold: '#ffe680', ink: '#141004', font: FONT,
			sky: ['#0f0d05', '#3a3311'], panel: 'rgba(34,30,10,0.86)', floor: 'rgba(10,8,2,0.7)', glow: 'rgba(242,220,93,0.28)',
		},
		backdrop: drawCeiling,
		rivals: ['Level 0 Wanderers', 'The No-Clippers', 'Almond Water Club', 'Fluorescent Hum', 'Damp Carpet Society',
			'Exit Sign Seekers', 'Liminal Crew', 'Wallpaper Watchers', 'Buzzing Lights', 'Mono-Yellow',
			'Ceiling Tile Counters', 'Lost Signal', 'Wrong Turn Again', 'Endless Hallway'],
	});

	// A player in a hazmat suit in their colour: hood, dark visor, respirator,
	// boots and gloves. Feet at (x, y), about 125 tall at scale 1.
	function hazmat(ctx, n, x, y, scale, pose) {
		const c = PLAYER_COLORS[n] || 'white';
		const ink = '#141004';
		const up = pose === 'cheer' || pose === 'win';
		const o = { stroke: ink, lineWidth: 3.5 };
		ctx.save();
		ctx.translate(x, y + (pose === 'win' ? -8 : 0));
		ctx.scale(scale, scale);
		art.ellipse(ctx, 0, 2, 34, 6, { fill: 'rgba(0,0,0,0.3)' });
		// arms, behind the body when down
		const arm = function (s) {
			const hand = up ? [s * 42, -132] : [s * 33, -44];
			art.line(ctx, [[s * 22, -86], hand], { stroke: ink, lineWidth: 21, lineCap: 'round' });
			art.line(ctx, [[s * 22, -86], hand], { stroke: c, lineWidth: 14, lineCap: 'round' });
			art.circle(ctx, hand[0], hand[1], 8.5, Object.assign({ fill: '#2a2a26' }, o));
		};
		arm(-1);
		arm(1);
		// legs and boots
		for (const s of [-1, 1]) {
			art.roundRect(ctx, s > 0 ? 2 : -22, -52, 20, 44, 7, Object.assign({ fill: c }, o));
			art.roundRect(ctx, s > 0 ? 0 : -25, -14, 25, 15, 5, Object.assign({ fill: '#2a2a26' }, o));
		}
		// the suit, its taped belt and zip
		art.roundRect(ctx, -27, -98, 54, 56, 15, Object.assign({ fill: c }, o));
		art.rect(ctx, -26, -60, 52, 7, { fill: 'rgba(0,0,0,0.28)' });
		art.line(ctx, [[0, -88], [0, -46]], { stroke: 'rgba(0,0,0,0.3)', lineWidth: 3 });
		art.roundRect(ctx, -24, -96, 14, 26, 6, { fill: 'rgba(255,255,255,0.18)' });
		// the hood, the visor with its glare, the respirator's filters
		art.roundRect(ctx, -24, -134, 48, 44, 19, Object.assign({ fill: c }, o));
		art.roundRect(ctx, -17, -126, 34, 21, 9, { fill: '#1b2629', stroke: ink, lineWidth: 2.5 });
		art.line(ctx, [[-11, -112], [-4, -122]], { stroke: 'rgba(220,255,240,0.65)', lineWidth: 3.5, lineCap: 'round' });
		for (const s of [-1, 1]) art.circle(ctx, s * 10, -98, 6.5, { fill: '#4a4a44', stroke: ink, lineWidth: 2.5 });
		ctx.restore();
	}

	// The results backdrop: a drop ceiling going on for ever, a few panels lit.
	function drawCeiling(c, time) {
		const hz = 400;
		const P = (u, z) => [W / 2 + u * 700 / z, hz - 520 / z];
		for (let j = 0; j < 10; j++) {
			const z0 = 1 + j * 0.9;
			const z1 = z0 + 0.9;
			for (let i = -6; i < 6; i++) {
				if ((i * 7 + j * 3) % 5 !== 0) continue;
				const on = Math.sin(time * 9 + i * 3 + j * 5) > -0.97;
				art.poly(c, [P(i, z0), P(i + 1, z0), P(i + 1, z1), P(i, z1)], { fill: 'rgba(255,240,180,1)', alpha: on ? 0.13 / (1 + j * 0.25) : 0.03 });
			}
		}
		for (let i = -6; i <= 6; i++) art.line(c, [P(i, 1), P(i, 10)], { stroke: 'rgba(255,240,180,0.07)', lineWidth: 2 });
		for (let j = 0; j <= 10; j++) art.line(c, [P(-6, 1 + j * 0.9), P(6, 1 + j * 0.9)], { stroke: 'rgba(255,240,180,0.07)', lineWidth: 2 });
	}

	/* ---------- the flow of a game ---------- */

	function setUp(count) {
		players = count;
		people = [];
		for (let i = 0; i < count; i++) people.push({ px: (i + 1) / (count + 1), pz: 0.5 });
		scores = people.map(() => 0);
	}

	function initGame(count) {
		setUp(count);
		sound.resume();
		sound.hum(0);
		show.go('title');
	}

	// Into the rounds, from the top floor.
	function begin() {
		begun = true;
		level = 0;
		t = 0;
		scores = people.map(() => 0);
		startReady();
	}

	// ROUND n, on the floor upstairs.
	function startReady() {
		floorN = 2 * level;
		for (const n of [...floors.keys()]) if (n < floorN) dropFloor(n);
		showFloors(floorN);
		camY = eyeY(floorN);
		sound.hum(Math.min(level, 3) / 3);
		callout = null;
		show.fx('thud', 0.8);
		setPhase('ready', READY);
	}

	// REMEMBER EVERYTHING: the floor upstairs, for a few seconds.
	function startLook() {
		say('REMEMBER EVERYTHING', levelCfg(level).look);
		setPhase('look', levelCfg(level).look);
	}

	// Sink through the floor to the next one down (or rewind back up).
	function descend(to, kind = 'descend') {
		descent = { from: floorN, to, crossed: [] };
		showFloors(floorN, to);
		callout = null;
		if (kind === 'descend') sound.rumble(DESCENT);
		else { sound.crackle(); show.fx('rewind'); }
		setPhase(kind, kind === 'descend' ? DESCENT : REWIND);
	}

	// TAP THE DIFFERENCES.
	function startTap() {
		showFloors(floorN);
		timeLeft = levelCfg(level).tap;
		lastTick = Math.ceil(timeLeft);
		say('TAP THE DIFFERENCES', 3);
		setPhase('tap');
	}

	function startReveal() {
		const found = diffs.filter((d) => d.found).length;
		outcome = { found, total: diffs.length };
		callout = null;
		if (found === diffs.length) {
			show.mark(t);
			show.fx('roundClear');
		} else if (!found) {
			sound.crackle();
			show.fx('roundFail');
			show.shake = 0.4;
		} else {
			sound.crackle();
		}
		setPhase('reveal', REVEAL);
	}

	// After the reveal: nobody found anything, so rewind and go again;
	// otherwise down to a new floor.
	function afterReveal() {
		if (!outcome.found) {
			retry = true;
			for (const d of diffs) Object.assign(d, { found: false, by: -1 });
			descend(2 * level, 'rewind');
			return;
		}
		retry = false;
		levelsDone++;
		level++;
		prepareLevel(level);
		descend(2 * level);
	}

	/* ---------- taps ---------- */

	// The player standing nearest a point on the walls.
	function nearest(at) {
		const wall = Math.floor(at.x / W);
		const f = (at.x - wall * W) / W;
		const p = wall === 0 ? { px: 0, pz: 1 - f } : wall === 1 ? { px: f, pz: 0 } : { px: 1, pz: f };
		let best = 0;
		let bestD = Infinity;
		people.forEach(function (q, i) {
			const d = Math.hypot(q.px - p.px, q.pz - p.pz);
			if (d < bestD) { bestD = d; best = i; }
		});
		return best;
	}

	// Does a tap at `at` hit difference-like d ({ wall, x, y, r, hit })?
	function hits(d, at) {
		const wall = Math.floor(at.x / W);
		if (d.wall !== wall) return false;
		raycaster.setFromCamera(new THREE.Vector2((at.x - wall * W) / W * 2 - 1, 1 - at.y / H * 2), cams[wall]);
		raycaster.far = Infinity;
		return raycaster.ray.intersectsBox(d.hit) || Math.hypot(d.x - at.x, d.y - at.y) < d.r;
	}

	function tap(at) {
		if (!players) return;
		const wall = Math.floor(at.x / W);
		if (wall < 0 || wall > 2) return;
		if (show.beat === 'controls') return practiceTap(at);
		if (show.beat !== 'play' || phase !== 'tap') return;
		eyeOn(floorN);
		let best = null;
		let bestD = Infinity;
		let hitFound = false;
		for (const d of diffs) {
			if (!hits(d, at)) continue;
			if (d.found) { hitFound = true; continue; }
			const sd = Math.hypot(d.x - at.x, d.y - at.y);
			if (sd < bestD) { bestD = sd; best = d; }
		}
		if (best) found(best, at);
		else if (!hitFound) wrong(at);
	}

	function found(d, at) {
		d.found = true;
		d.by = nearest(at);
		d.foundAt = clock;
		scores[d.by]++;
		sound.chime();
		pops.push({ text: '+1', colour: PLAYER_COLORS[d.by], x: d.x, y: d.y - d.r - 30, age: 0 });
		if (diffs.every((x) => x.found)) {
			timeLeft = Math.max(timeLeft, 0.01);
			stage.timeout(() => { if (phase === 'tap') startReveal(); }, 900);
		}
	}

	// A red cross, a buzz and the lights stuttering.
	function wrongMark(at) {
		if (clock - lastWrong < 0.35) return false;
		lastWrong = clock;
		stutter = 0.75;
		sound.buzz();
		sound.duck(0.8);
		wrongs.push({ x: at.x, y: at.y, age: 0 });
		return true;
	}

	function wrong(at) {
		if (!wrongMark(at)) return;
		misses++;
		timeLeft = Math.max(0, timeLeft - PENALTY);
	}

	stage.$el.on('click', function (e) {
		tap(IGB.toWorld(e));
	});

	/* ---------- the controls intro ---------- */

	const practice = { i: 0, age: 0, done: false, doneAge: 0, moved: 0, chair: null, spot: null, target: null, changed: false, wronged: false, tape: CONTROLS.tape, nextDemo: 0, demoN: 0 };

	function enterStep(i) {
		Object.assign(practice, { i, age: 0, done: false, doneAge: 0, moved: 0, wronged: false, tape: CONTROLS.tape, nextDemo: 0.6, demoN: 0 });
		if (CONTROLS.steps[i]) show.fx('stepIn');
	}

	// The practice chair, on the front wall's side of the room, somewhere
	// clear and in plain view.
	function placePractice() {
		removePractice();
		const f = floors.get(0);
		eyeOn(0);
		const low = f.layout.items.filter((it) => it.y < 1 && it.type !== 'stain');
		for (const d of [3.2, 3.8, 2.8, 4.4]) {
			for (const u of [-1.6, 1.6, -0.8, 0.8, -2.4, 2.4, 0]) {
				const p = wallPoint(1, u, d);
				if (!low.every((it) => Math.hypot(it.x - p.x, it.z - p.z) > (it.r || 0.3) + 0.55)) continue;
				const g = practiceChair(p, false);
				f.group.add(g);
				g.updateMatrixWorld(true);
				const box = new THREE.Box3().setFromObject(g);
				if (canSee(f, g, box.getCenter(new THREE.Vector3()))) {
					practice.chair = g;
					practice.spot = p;
					return;
				}
				f.group.remove(g);
			}
		}
		// nowhere clear: put it right in front anyway
		practice.spot = wallPoint(1, -1.2, 2.6);
		practice.chair = practiceChair(practice.spot, false);
		f.group.add(practice.chair);
	}

	function practiceChair(p, changed) {
		const g = BUILDERS.chair({ color: changed ? 0xb3241c : 0x4a4b55 });
		g.position.set(p.x, 0, p.z);
		g.rotation.y = wallYaw(1) + (changed ? Math.PI + 0.25 : 0.35);
		return g;
	}

	// It changes: red, and turned to the wall. Its ring and tap volume.
	function changePractice() {
		const f = floors.get(0);
		if (practice.chair) f.group.remove(practice.chair);
		practice.chair = practiceChair(practice.spot, true);
		f.group.add(practice.chair);
		practice.chair.updateMatrixWorld(true);
		practice.changed = true;
		eyeOn(0);
		const m = markFor(new THREE.Box3().setFromObject(practice.chair));
		practice.target = m ? { wall: m.wall, x: m.x, y: m.y, r: Math.max(80, m.r), hit: m.hit, found: false, by: -1, foundAt: 0 } : null;
		stutter = 0.35;
		sound.crackle();
		show.flash = 0.15;
	}

	function removePractice() {
		const f = floors.get(0);
		if (f && practice.chair) f.group.remove(practice.chair);
		practice.chair = null;
		practice.target = null;
		practice.changed = false;
	}

	function practiceTap(at) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		eyeOn(0);
		const tg = practice.target;
		if (step.id === 'tap' && tg && !tg.found && hits(tg, at)) {
			tg.found = true;
			tg.by = nearest(at);
			tg.foundAt = clock;
			sound.chime();
			pops.push({ text: '+1', colour: PLAYER_COLORS[tg.by], x: tg.x, y: tg.y - tg.r - 30, age: 0 });
		} else if (step.id === 'wrong' || (step.id === 'tap' && !(tg && hits(tg, at)))) {
			if (wrongMark(at) && step.id === 'wrong') {
				practice.wronged = true;
				practice.tape = Math.max(0, practice.tape - PENALTY);
			}
		}
	}

	function achieved(step) {
		switch (step.id) {
			case 'look': return practice.moved > CONTROLS.moved * Math.max(1, players);
			case 'tap': return !!(practice.target && practice.target.found);
			case 'wrong': return practice.wronged;
		}
		return false;
	}

	// Where the demonstration's wrong taps land: high on the walls, on nothing.
	const DEMO_TAPS = [{ x: W * 0.5 + 260, y: 560 }, { x: W * 1.5 - 420, y: 600 }, { x: W * 2.5 - 240, y: 580 }, { x: W * 1.5 + 380, y: 540 }];

	function stepControls(dt) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		practice.age += dt;
		if (step.id === 'tap' && !practice.changed && practice.age >= CONTROLS.change) changePractice();
		if (step.id === 'wrong') {
			practice.nextDemo -= dt;
			if (practice.nextDemo <= 0) {
				practice.nextDemo = CONTROLS.demoEvery;
				lastWrong = -1;
				// (never on the practice chair: that one was right)
				const tg = practice.target;
				const spots = DEMO_TAPS.filter((p) => !tg || Math.hypot(p.x - tg.x, p.y - tg.y) > tg.r + 160);
				if (wrongMark(spots[practice.demoN++ % spots.length])) practice.tape = Math.max(0, practice.tape - PENALTY);
			}
		}
		if (!practice.done && practice.age >= step.min && achieved(step)) {
			practice.done = true;
			show.fx('nice');
		}
		if (practice.done) practice.doneAge += dt;
		if ((practice.done && practice.doneAge >= CONTROLS.nice) || practice.age >= step.max) enterStep(practice.i + 1);
	}

	/* ---------- the entity ---------- */

	let figure = null;            // the shape at the end of the corridor (the intro's)
	let figureAt = null;

	function placeFigure() {
		removeFigure();
		const f = floors.get(0);
		const o = f.layout.openings[1][0];
		figureAt = wallPoint(1, o.u, R + ENTITY.far);
		figure = BUILDERS.figure({});
		figure.position.set(figureAt.x, 0, figureAt.z);
		figure.rotation.y = wallYaw(1);
		f.group.add(figure);
	}

	function removeFigure() {
		const f = floors.get(0);
		if (f && figure) f.group.remove(figure);
		figure = null;
	}

	// Everything the intros set up, put away (on the way into the rounds).
	function cleanIntros() {
		removePractice();
		removeFigure();
		push.x = push.z = 0;
		darkSides = 0;
		zoom3d = 1;
		callout = null;
		wrongs.length = 0;
		pops.length = 0;
	}

	/* ---------- every frame ---------- */

	function simulate(dt) {
		phaseT += dt;

		switch (phase) {
		case 'ready':
			if (phaseT >= phaseDur) startLook();
			break;

		case 'look':
			if (phaseT >= phaseDur) descend(floorN + 1);
			break;

		case 'descend':
		case 'rewind': {
			const from = eyeY(descent.from);
			const to = eyeY(descent.to);
			camY = lerp(from, to, ease(Math.min(1, phaseT / phaseDur)));
			// through the carpet, out of the ceiling tiles, onto the floor
			if (phase === 'descend') {
				const marks = [[floorY(descent.from), 0.9], [floorY(descent.to) + CEIL, 0.55]];
				marks.forEach(function ([y, s], i) {
					if (!descent.crossed[i] && camY < y) {
						descent.crossed[i] = true;
						sound.thud(s);
						if (i === 1) sound.crackle();
					}
				});
			}
			if (phaseT >= phaseDur) {
				camY = to;
				floorN = descent.to;
				sound.thud(0.35);
				if (floorN % 2) startTap();
				else startReady();
			}
			break;
		}

		case 'tap':
			timeLeft -= dt;
			if (timeLeft <= 5 && Math.ceil(timeLeft) < lastTick && timeLeft > 0) sound.tick();
			lastTick = Math.ceil(timeLeft);
			if (timeLeft <= 0) {
				timeLeft = 0;
				startReveal();
			}
			break;

		case 'reveal':
			if (phaseT >= phaseDur) afterReveal();
			break;
		}

		// footsteps somewhere, more often and nearer on lower floors
		if (level > 0) {
			nextSteps -= dt;
			if (nextSteps <= 0) {
				const L = Math.min(level, 3);
				nextSteps = 9 - L * 1.5 + Math.random() * 6;
				const n = 3 + Math.floor(Math.random() * 4);
				const gain = 0.04 + 0.05 * L;
				for (let i = 0; i < n; i++) stage.timeout(() => sound.step(gain * (0.7 + 0.3 * i / n)), i * 560);
			}
		}
	}

	// What runs whatever the beat: the mood, the lights, the floating words.
	function ambient(dt) {
		clock += dt;
		mood += (Math.min(level, 3) - mood) * Math.min(1, dt * 0.6);
		stutter = Math.max(0, stutter - dt);
		if (callout) callout.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].age += dt) > 1.4) pops.splice(i, 1);
		for (let i = wrongs.length - 1; i >= 0; i--) if ((wrongs[i].age += dt) > 0.9) wrongs.splice(i, 1);
	}

	/* ---------- drawing the 3D ---------- */

	const cA = new THREE.Color();
	const cB = new THREE.Color();
	function mix(key, t) {
		const i = Math.min(2, Math.floor(t));
		const f = t - i;
		const a = MOODS[i][key];
		const b = MOODS[i + 1][key];
		if (typeof a === 'number' && key !== 'sky' && key !== 'ground' && key !== 'fog' && key !== 'panel') return lerp(a, b, f);
		return cA.set(a).lerp(cB.set(b), f);
	}

	// A tube's flicker: mostly on, with bursts of stutter.
	function flicker(fl, dt) {
		fl.until -= dt;
		if (fl.until <= 0) {
			fl.on = !fl.on;
			fl.until = fl.on ? (Math.random() < 0.3 ? 0.04 + Math.random() * 0.1 : 0.3 + Math.random() * 1.8) : 0.03 + Math.random() * 0.12;
			if (!fl.on && Math.random() < 0.2) sound.crackle();
		}
		return fl.on ? 1 : 0.18;
	}

	function render(dt) {
		// the lights: this floor's mood, and stuttering after a wrong tap
		const light = stutter > 0 ? (Math.random() < 0.55 ? 0.2 : 1) : 1;
		hemi.color.copy(mix('sky', mood));
		hemi.groundColor.copy(mix('ground', mood));
		hemi.intensity = mix('hemi', mood) * (0.35 + 0.65 * light);
		for (const l of lamps) l.intensity = mix('lamp', mood) * light;
		const fog = mix('fog', mood);
		scene.fog.color.copy(fog);
		scene.background.copy(fog);
		scene.fog.near = mix('near', mood);
		scene.fog.far = mix('far', mood);
		const panel = mix('panel', mood);
		panelMats.on.color.copy(panel).multiplyScalar(light);
		panelMats.glow.opacity = 0.5 * light;
		for (const f of floors.values()) {
			if (!f.group.visible) continue;
			for (const fl of f.flickers) {
				const b = flicker(fl, dt) * light;
				fl.face.color.copy(panel).multiplyScalar(b);
				if (fl.glow) fl.glow.opacity = 0.5 * b;
			}
		}

		rig.position.set(push.x, camY, push.z);
		if (phase === 'descend' || phase === 'rewind') {
			const t = phaseT / phaseDur;
			const shake = Math.sin(t * Math.PI) * (phase === 'rewind' ? 0.05 : 0.02);
			rig.position.x += (Math.random() - 0.5) * shake;
			rig.rotation.z = Math.sin(clock * 2.1) * 0.012 * Math.sin(t * Math.PI);
		} else {
			rig.rotation.z = 0;
		}
		// the show's slams shake the camera too
		if (show.shake > 0.01) {
			rig.position.x += (Math.random() - 0.5) * 0.06 * show.shake;
			rig.position.y += (Math.random() - 0.5) * 0.04 * show.shake;
		}
		for (const cam of cams) {
			if (cam.zoom !== zoom3d) { cam.zoom = zoom3d; cam.updateProjectionMatrix(); }
		}

		renderer.setScissorTest(true);
		cams.forEach(function (cam, i) {
			viewport(i * W, 0, W, H);
			renderer.render(scene, cam);
		});
	}

	/* ---------- the camcorder layer ---------- */

	let scanlines = null;
	const grain = document.createElement('canvas');
	grain.width = 200;
	grain.height = 125;
	const grainCtx = grain.getContext('2d');
	const grainData = grainCtx.createImageData(grain.width, grain.height);
	let grainAge = 0;

	function refreshGrain() {
		const d = grainData.data;
		for (let i = 0; i < d.length; i += 4) {
			const v = Math.random() * 255;
			d[i] = d[i + 1] = d[i + 2] = v;
			d[i + 3] = 255;
		}
		grainCtx.putImageData(grainData, 0, 0);
	}

	// Words in the camcorder's lettering, with the colours slipping apart
	// and the odd dropout.
	function vhsText(ctx, str, x, y, size, opts = {}) {
		let alpha = opts.alpha === undefined ? 1 : opts.alpha;
		if (opts.flicker !== false) {
			alpha *= 0.8 + Math.random() * 0.2;
			if (Math.random() < 0.04) alpha *= 0.25;
		}
		if (alpha <= 0.01) return;
		const jitter = opts.flicker !== false && Math.random() < 0.06 ? (Math.random() - 0.5) * size * 0.15 : 0;
		const split = opts.split === undefined ? size * 0.035 : opts.split;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.font = `${size}px ${FONT}, "Courier New", monospace`;
		ctx.textAlign = opts.align || 'center';
		ctx.textBaseline = 'middle';
		if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.06)}px`;
		ctx.shadowColor = 'rgba(0,0,0,0.9)';
		ctx.shadowBlur = size * 0.25;
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillText(str, x + jitter, y + size * 0.04);
		ctx.shadowColor = 'transparent';
		if (split) {
			ctx.fillStyle = 'rgba(255,30,70,0.7)';
			ctx.fillText(str, x + jitter - split, y);
			ctx.fillStyle = 'rgba(30,220,255,0.7)';
			ctx.fillText(str, x + jitter + split, y);
		}
		ctx.fillStyle = opts.fill || '#f6f1dc';
		ctx.fillText(str, x + jitter, y);
		ctx.restore();
	}

	// A dark band behind big words, so they read against the yellow.
	function band(ctx, x, y, w, h, alpha) {
		const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
		g.addColorStop(0, 'rgba(10,8,2,0)');
		g.addColorStop(0.25, `rgba(10,8,2,${alpha})`);
		g.addColorStop(0.75, `rgba(10,8,2,${alpha})`);
		g.addColorStop(1, 'rgba(10,8,2,0)');
		ctx.fillStyle = g;
		ctx.fillRect(x, y - h / 2, w, h);
	}

	function stamp() {
		const t = 3 * 3600 + 14 * 60 + 7 + clock;
		const hh = Math.floor(t / 3600) % 12 || 12;
		const mm = String(Math.floor(t / 60) % 60).padStart(2, '0');
		const ss = String(Math.floor(t) % 60).padStart(2, '0');
		return `OCT 11 1996  ${hh}:${mm}:${ss} AM`;
	}

	// A hand-drawn ring round something found.
	function ring(ctx, x, y, r, colour, width, wobble) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(wobble);
		ctx.beginPath();
		for (let i = 0; i <= 48; i++) {
			const a = -0.4 + i / 48 * (Math.PI * 2 + 0.55);
			const rr = r * (1 + 0.05 * Math.sin(a * 3 + wobble * 10)) * (1 + i / 48 * 0.06);
			const px = Math.cos(a) * rr * 1.08;
			const py = Math.sin(a) * rr * 0.92;
			if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
		}
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = 'rgba(0,0,0,0.65)';
		ctx.lineWidth = width + 10;
		ctx.stroke();
		ctx.strokeStyle = colour;
		ctx.lineWidth = width;
		ctx.stroke();
		ctx.restore();
	}

	// A pulsing dashed ring: something still to find.
	function hintRing(ctx, x, y, r, age) {
		const pulse = 0.5 + 0.5 * Math.sin(age * 7);
		ctx.save();
		ctx.setLineDash([26, 18]);
		ctx.lineDashOffset = -age * 60;
		art.circle(ctx, x, y, r * (1.05 + 0.1 * pulse), { stroke: 'rgba(0,0,0,0.6)', lineWidth: 20 });
		art.circle(ctx, x, y, r * (1.05 + 0.1 * pulse), { stroke: `rgba(255,${200 + 55 * pulse},${120 + 135 * pulse},1)`, lineWidth: 10 });
		ctx.restore();
	}

	// A camcorder's focus box: four corner brackets.
	function focusBox(ctx, x, y, w, h, colour, alpha = 1) {
		const l = Math.min(w, h) * 0.28;
		for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
			const cx = x + sx * w / 2;
			const cy = y + sy * h / 2;
			const pts = [[cx - sx * l, cy], [cx, cy], [cx, cy - sy * l]];
			art.line(ctx, pts, { stroke: 'rgba(0,0,0,0.6)', lineWidth: 14, alpha, lineCap: 'round', lineJoin: 'round' });
			art.line(ctx, pts, { stroke: colour, lineWidth: 7, alpha, lineCap: 'round', lineJoin: 'round' });
		}
	}

	// The tape left this round: a bar across the top of the front wall.
	function tapeBar(ctx, left, max, y) {
		const bw = 700;
		const k = clamp(left / max, 0, 1);
		const urgent = left < 10;
		art.roundRect(ctx, W * 1.5 - bw / 2 - 6, y - 17, bw + 12, 34, 17, { fill: 'rgba(10,8,2,0.6)' });
		art.roundRect(ctx, W * 1.5 - bw / 2, y - 11, Math.max(22, bw * k), 22, 11, { fill: urgent ? RED : YELLOW });
		vhsText(ctx, 'TAPE', W * 1.5 - bw / 2 - 30, y, 46, { align: 'right', flicker: false, split: 2 });
		vhsText(ctx, String(Math.ceil(left)), W * 1.5 + bw / 2 + 30, y, 50, { align: 'left', fill: urgent ? RED : '#f6f1dc', flicker: urgent, split: 2 });
	}

	// Drawn as the world, under the show's overlays: the 3D, then what sits
	// on it (marks, crosses, the darkness of the slab).
	function drawWorld(ctx) {
		render(frameDt);
		// darkness while inside the slab
		if (phase === 'descend' || phase === 'rewind') {
			const t = phaseT / phaseDur;
			const hi = Math.min(descent.from, descent.to);
			const inSlab = camY < floorY(hi) + 0.25 && camY > floorY(hi + 1) + CEIL - 0.25;
			if (inSlab) art.rect(ctx, 0, 0, WIDTH, H, { fill: 'rgba(0,0,0,0.35)' });
			art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(0,0,0,${0.25 * Math.sin(t * Math.PI)})` });
		}
		if (stutter > 0 && Math.random() < 0.5) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(0,0,0,${0.25 + Math.random() * 0.35})` });
		// the side walls fall away while the camera creeps down the corridor
		if (darkSides > 0) {
			for (const wall of [0, 2]) art.rect(ctx, wall * W, 0, W, H, { fill: '#050402', alpha: darkSides });
		}

		// markers: found (stay), missed (pulse at the end)
		if (show.beat === 'play' && (phase === 'tap' || phase === 'reveal')) {
			for (const d of diffs) {
				if (d.found) {
					const pop = Math.max(0, 1 - (clock - d.foundAt) / 0.25);
					ring(ctx, d.x, d.y, d.r * (1 + pop * 0.5), PLAYER_COLORS[d.by], 12, d.id * 1.7);
				} else if (phase === 'reveal') {
					hintRing(ctx, d.x, d.y, d.r, phaseT);
					vhsText(ctx, d.label, d.x, d.y + d.r + 40, 46, { fill: '#ffe680', split: 2 });
				}
			}
		}
		// the practice chair: ringed once found, hinted if nobody has
		const tg = practice.target;
		if (show.beat === 'controls' && tg) {
			if (tg.found) ring(ctx, tg.x, tg.y, tg.r * (1 + Math.max(0, 1 - (clock - tg.foundAt) / 0.25) * 0.5), PLAYER_COLORS[tg.by], 12, 0.4);
			else if (practice.age > CONTROLS.hint && CONTROLS.steps[practice.i].id === 'tap') hintRing(ctx, tg.x, tg.y, tg.r, practice.age);
		}
		// wrong taps: a fading cross and the time lost
		for (const w of wrongs) {
			const a = 1 - w.age / 0.9;
			const s = 40;
			for (const [c, lw] of [[`rgba(0,0,0,${a * 0.6})`, 22], [`rgba(255,50,40,${a})`, 12]]) {
				art.line(ctx, [[w.x - s, w.y - s], [w.x + s, w.y + s]], { stroke: c, lineWidth: lw, lineCap: 'round' });
				art.line(ctx, [[w.x + s, w.y - s], [w.x - s, w.y + s]], { stroke: c, lineWidth: lw, lineCap: 'round' });
			}
			vhsText(ctx, `-${PENALTY}s`, w.x, w.y - 80 - w.age * 60, 56, { fill: RED, alpha: a, flicker: false });
		}
		for (const p of pops) {
			vhsText(ctx, p.text, p.x, p.y - p.age * 90, 72, { fill: p.colour, alpha: Math.min(1, 2 * (1.4 - p.age)), flicker: false, split: 3 });
		}
	}

	// The round's big words (REMEMBER EVERYTHING, TAP THE DIFFERENCES), the
	// look's countdown and the tape while tapping.
	function drawPlay(ctx) {
		if (callout && callout.age < callout.dur) {
			const fadeIn = Math.min(1, callout.age / 0.3);
			const fadeOut = Math.min(1, (callout.dur - callout.age) / 0.4);
			const a = fadeIn * fadeOut;
			band(ctx, W, 260, W, 230, 0.55 * a);
			vhsText(ctx, callout.text, W * 1.5, 250, 150, { alpha: a });
			for (const wall of [0, 2]) {
				band(ctx, wall * W, 240, W, 150, 0.45 * a);
				vhsText(ctx, callout.text, wall * W + W / 2, 235, 92, { alpha: a * 0.85 });
			}
			if (phase === 'look') {
				const left = Math.max(0, phaseDur - phaseT);
				vhsText(ctx, `00:${String(Math.ceil(left)).padStart(2, '0')}`, W * 1.5, 360, 80, { alpha: a, fill: left < 4 ? RED : '#f6f1dc' });
			}
		}
		if (phase === 'tap' && (!callout || callout.age > 2.6)) {
			band(ctx, W * 1.2, 215, W * 0.6, 150, 0.4);
			vhsText(ctx, `FOUND ${diffs.filter((d) => d.found).length}/${diffs.length}`, W * 1.5, 190, 60, { flicker: false, split: 2 });
			tapeBar(ctx, timeLeft, levelCfg(level).tap, 250);
		}
		if (phase === 'descend' || phase === 'rewind') {
			const a = Math.sin(phaseT / phaseDur * Math.PI);
			const text = phase === 'rewind' ? '◀◀ REWIND' : `▼ LEVEL ${descent.to}`;
			vhsText(ctx, text, W * 1.5, H / 2, 96, { alpha: a });
			if (phase === 'rewind') for (const wall of [0, 2]) vhsText(ctx, text, wall * W + W / 2, H / 2, 80, { alpha: a * 0.8 });
		}
		// the round's start: what's below, on the tape (its LEVEL is already in the corner: no ROUND n over it)
		if (phase === 'ready') {
			const a = Math.min(1, phaseT / 0.3) * (1 - between(phaseT, phaseDur - 0.4, phaseDur));
			const text = retry ? 'AGAIN. REMEMBER HARDER' : diffs.length + ' DIFFERENCES BELOW';
			band(ctx, W, 260, W, 230, 0.55 * a);
			vhsText(ctx, text, W * 1.5, 250, 110, { alpha: a });
			for (const wall of [0, 2]) {
				band(ctx, wall * W, 240, W, 150, 0.45 * a);
				vhsText(ctx, text, wall * W + W / 2, 235, 72, { alpha: a * 0.85 });
			}
		}
		show.onWalls(ctx, function (c) {
			if (phase === 'reveal' && outcome) {
				const fade = 1 - between(phaseT, 2.6, 3.1);
				if (outcome.found === outcome.total) {
					show.slam(c, 'ALL FOUND!', W / 2, 470, 170, phaseT - 0.1, { fill: '#ffe680', glow: YELLOW, rotate: -0.05, alpha: fade });
				} else if (!outcome.found) {
					show.slam(c, 'NOTHING FOUND', W / 2, 430, 150, phaseT - 0.1, { fill: RED, glow: RED, alpha: fade });
				} else {
					show.slam(c, outcome.found + ' OF ' + outcome.total + ' FOUND', W / 2, 470, 130, phaseT - 0.1, { fill: 'white', alpha: fade });
				}
			}
		});
	}

	// The camcorder's own layer, over everything in the world beats:
	// scanlines, grain, tracking, the REC light and the date.
	function camcorder(ctx, opts = {}) {
		const dt = frameDt;
		if (!scanlines) {
			const c = document.createElement('canvas');
			c.width = 8;
			c.height = 6;
			const g = c.getContext('2d');
			g.fillStyle = 'rgba(0,0,0,0.2)';
			g.fillRect(0, 4, 8, 2);
			scanlines = ctx.createPattern(c, 'repeat');
		}
		ctx.save();
		ctx.fillStyle = scanlines;
		ctx.fillRect(0, 0, WIDTH, H);
		ctx.restore();

		grainAge += dt;
		if (grainAge > 0.06) { grainAge = 0; refreshGrain(); }
		const moving = phase === 'descend' || phase === 'rewind';
		const falling = moving && show.beat === 'play' ? Math.sin(phaseT / phaseDur * Math.PI) * (phase === 'rewind' ? 1.6 : 1) : 0;
		const noisy = 0.05 + 0.18 * falling + (stutter > 0 ? 0.12 : 0) + (opts.noise || 0);
		ctx.save();
		ctx.imageSmoothingEnabled = false;
		ctx.globalAlpha = Math.min(0.6, noisy);
		ctx.globalCompositeOperation = 'overlay';
		for (let i = 0; i < 3; i++) ctx.drawImage(grain, i * W, 0, W, H);
		ctx.restore();

		// a tracking band rolling down, worse while falling
		const by = ((clock * 140) % (H + 300)) - 150;
		const bh = 50 + 120 * falling;
		ctx.save();
		ctx.globalAlpha = Math.min(0.5, 0.05 + 0.14 * falling);
		ctx.globalCompositeOperation = 'screen';
		ctx.drawImage(grain, 0, 0, grain.width, 10, 0, by, WIDTH, bh);
		ctx.restore();

		if (opts.lite) return;

		// a dark edge round each wall
		art.eachWall(ctx, function (c) {
			const g = art.radial(c, W / 2, H / 2, H * 0.55, W * 0.62, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.42)']);
			art.rect(c, 0, 0, W, H, { fill: g });
		});

		// the on-screen display
		for (let i = 0; i < 3; i++) {
			const x = i * W;
			if (Math.floor(clock * 1.2) % 2 === 0) art.circle(ctx, x + 70, 64, 17, { fill: '#ff2a2a' });
			vhsText(ctx, 'REC', x + 100, 64, 54, { align: 'left', flicker: false, split: 2 });
			vhsText(ctx, `CAM 0${i + 1}`, x + W - 70, 64, 48, { align: 'right', flicker: false, split: 2 });
			vhsText(ctx, stamp(), x + 70, H - 60, 44, { align: 'left', flicker: false, split: 2 });
		}
		vhsText(ctx, `LEVEL ${floorN}`, W + W - 70, 118, 44, { align: 'right', flicker: false, split: 2 });

	}

	// The controls' captions, step pips and live aids.
	function drawControls(ctx) {
		const step = CONTROLS.steps[practice.i];
		if (!step) return;
		if (step.id === 'look') {
			// a focus box sweeping round all three walls, for the eyes to follow
			const x = (practice.age * 1500) % WIDTH;
			focusBox(ctx, x, 560, 420, 300, YELLOW, 0.9);
			for (const wall of [0, 1, 2]) {
				const pulse = 0.5 + 0.5 * Math.sin(clock * 6);
				for (const s of [-1, 1]) {
					const ax = wall * W + W / 2 + s * (560 + 20 * pulse);
					art.poly(ctx, [[ax, 500], [ax + s * 60, 560], [ax, 620]], { fill: YELLOW, stroke: 'rgba(0,0,0,0.6)', lineWidth: 5, alpha: 0.85 });
				}
			}
		}
		if (step.id === 'wrong') tapeBar(ctx, practice.tape, CONTROLS.tape, 380);
		show.onWalls(ctx, function (c) {
			show.slam(c, step.caption, W / 2, 210, step.caption.length > 30 ? 84 : 104, practice.age, { fill: '#ffd23f' });   // (tutorial captions: yellow)
			show.pips(c, CONTROLS.steps.length, practice.i, practice.done, W / 2, 290);   // (the standard step pips)
			if (practice.done) show.slam(c, 'NICE!', W / 2, 760, 140, practice.doneAge, { fill: GREEN, glow: GREEN, rotate: -0.06 });
		});
	}

	/* ---------- the beats ---------- */

	const INTROS = ['squad', 'title', 'clock', 'visors', 'controls', 'entity'];

	show.sequence([
		// 1. how many players: the office, dimmed, and the picker; nothing else
		{
			id: 'squad',
			length: Infinity,
			update() { show.blackout = 0.35; },
			draw(ctx) { camcorder(ctx); },
		},

		// 1b. the title, crashing in over the buzzing office
		show.beats.titleDrop({
			// (its lines: the manifest's title, shared with the end screen's carousel)
			update(dt) { if (Math.random() < dt * 0.7) stutter = 0.2 + Math.random() * 0.25; },
			draw(ctx) { camcorder(ctx); },
		}),

		// 2. the ten-minute clock; it starts counting a moment after it lands
		show.beats.clockIntro({
			draw(ctx) { camcorder(ctx); },
		}),

		// the visors on, in the right colours, and a wiggle in the middle of the room
		show.beats.visors({
			draw(ctx) { camcorder(ctx); },
		}),

		// 3. the controls, one at a time, on the first floor
		{
			id: 'controls',
			length: CONTROLS.steps.reduce((a, s) => a + s.max + CONTROLS.nice, 0),   // a safety net: each step has its own limit
			done: () => practice.i >= CONTROLS.steps.length,
			enter() {
				floorN = 0;
				camY = eyeY(0);
				showFloors(0);
				placePractice();
				enterStep(0);
			},
			update(dt) { stepControls(dt); },
			draw(ctx) {
				drawControls(ctx);
				camcorder(ctx);
			},
		},

		// 4. something at the end of the corridor: the lights buzz, the
		// camera creeps toward it, the camcorder finds it, the lights die...
		// LEVEL 0
		{
			id: 'entity',
			length: ENTITY.length,
			enter() {
				removePractice();
				placeFigure();
				floorN = 0;
				camY = eyeY(0);
				showFloors(0);
				sound.hum(0.8);
				show.fx('riser', 0.4, 1, ENTITY.focus);
			},
			update(dt, bt) {
				const E = ENTITY;
				if (bt > E.flicker[0] && bt < E.flicker[1] && Math.random() < dt * 5) stutter = 0.12 + Math.random() * 0.2;
				if (show.cue(E.flicker[0])) { sound.buzz(); sound.crackle(); }
				if (show.cue(E.push[0])) sound.rumble(E.push[1] - E.push[0]);
				if (bt < E.out) {
					// across to line up with the doorway first, then on down it
					const k = between(bt, E.push[0], E.push[1]);
					const o = floors.get(0).layout.openings[1][0];
					push.x = o.u * ease(Math.min(1, k * 2.2));
					push.z = -(R + E.depth) * ease(k);
					darkSides = 0.85 * between(bt, E.push[0], E.push[0] + 1.5);
				}
				if (show.cue(E.focus)) { show.fx('glint', 0.5, 0.7); sound.crackle(); }
				if (show.cue(E.out)) { removeFigure(); sound.duck(1); sound.thud(0.8); show.fx('thud', 0.7); }
				if (bt >= E.out && bt < E.back) show.blackout = 0.94;
				if (show.cue(E.back)) {
					show.blackout = 0;
					push.x = push.z = 0;
					darkSides = 0;
					stutter = 0.4;
					sound.hum(0);
					sound.crackle();
				}
				if (show.cue(E.title)) { show.fx('villainReveal'); show.shake = 0.8; show.flash = 0.35; sound.say('level zero'); }
			},
			draw(ctx, bt) {
				const E = ENTITY;
				// the camcorder hunts for focus, and finds it
				if (figure && bt > E.focus && bt < E.out) {
					const p = toWalls(new THREE.Vector3(figureAt.x, eyeY(0) - EYE + 1.3, figureAt.z));
					if (p) {
						const age = bt - E.focus;
						const s = 1 + 1.4 * Math.max(0, 1 - age / 0.5);
						const blink = age < 0.5 || Math.floor(age * 3) % 2 === 0;
						if (blink) focusBox(ctx, p.x, p.y, 160 * s, 260 * s, age < 0.5 ? 'white' : RED);
						if (age > 0.6) vhsText(ctx, 'AF  ? ? ?', p.x, p.y + 180, 44, { fill: RED, split: 2 });
					}
				}
				camcorder(ctx, { noise: bt > E.out - 0.4 && bt < E.back + 0.4 ? 0.35 : 0 });
				const out = 1 - between(bt, E.length - 0.5, E.length);
				show.onWalls(ctx, function (c) {
					show.slam(c, 'LEVEL 0', W / 2, 450, 260, bt - E.title, { fill: YELLOW, glow: '#c9a227', alpha: out });
					show.slam(c, 'YOU ARE NOT ALONE', W / 2, 620, 70, bt - E.title - 0.6, { fill: 'white', alpha: out });   // (the boss intro's byline)
				});
			},
		},

		// 5. the rounds, until the clock runs out
		{
			id: 'play',
			length: Infinity,
			enter() {
				cleanIntros();
				if (!begun) begin();
				show.label('ROUND ' + (level + 1));
			},
			update(dt) {
				t += dt;
				show.label('ROUND ' + (level + 1));
				show.record(t, people.map((q) => ({ px: q.px, pz: 1 - q.pz })));
				simulate(dt);
			},
			draw(ctx) {
				drawPlay(ctx);
				camcorder(ctx);
			},
		},

		// 6. TIME!: the lights stutter, the cameras push in
		show.beats.timeUp({
			enter() {
				show.camera.wide();   // (the show's zoom would slide the overlays off the 3D; the cameras zoom instead)
				setPhase('over');
				callout = null;
				stutter = 1.2;
				sound.buzz();
			},
			update(dt, bt) { zoom3d = 1 + 0.15 * ease(between(bt, 0, 2.4)); },
			draw(ctx) { camcorder(ctx); },
		}),

		// 7–11. the scores, the ranking, the team total, the leaderboard, the replay
		show.beats.scores({ draw: tape }),
		show.beats.rank({ draw: tape }),
		show.beats.team({ draw: tape }),
		show.beats.board({ draw: tape }),
		show.beats.replay({ draw: tape }),
		// how was it? five faces to tap, sad to happy
		show.beats.rate({ draw: tape }),

		show.beats.end({
			enter() {
				sound.hum(0);
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(scores));
			},
			draw: tape,
		}),
	]);

	// Over the results: just the tape's scanlines and grain.
	function tape(ctx) {
		camcorder(ctx, { lite: true });
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		frameDt = paused ? 0 : dt;
		ambient(frameDt);
		show.frame(ctx, frameDt, drawWorld);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		people.forEach(function (q, i) {
			if (!p[i]) return;
			const px = Math.max(0, Math.min(1, p[i].px));
			const pz = Math.max(0, Math.min(1, p[i].pz === undefined ? 0.5 : 1 - p[i].pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
			if (show.beat === 'controls') practice.moved += Math.abs(px - q.px) + Math.abs(pz - q.pz);
			q.px = px;
			q.pz = pz;
		});
	};

	// For tests and the console: where the show and the game are up to. Each
	// difference's x, y is its centre on the walls, in world pixels.
	self.state = function () {
		const tg = practice.target;
		return Object.assign(show.state(), {
			phase, level, floor: floorN, camY, timeLeft, clockLeft: show.timeLeft(), misses, players, retry, levelsDone,
			scores: scores.slice(),
			step: CONTROLS.steps[practice.i] ? CONTROLS.steps[practice.i].id : null, stepAge: practice.age, stepDone: practice.done,
			practice: tg ? { wall: tg.wall, x: Math.round(tg.x), y: Math.round(tg.y), r: Math.round(tg.r), found: tg.found, by: tg.by } : null,
			figure: !!figure,
			differences: diffs.map((d) => ({ id: d.id, kind: d.kind, label: d.label, wall: d.wall, found: d.found, by: d.by, x: Math.round(d.x), y: Math.round(d.y), r: Math.round(d.r) })),
		});
	};

	// Test hooks: freeze the game's clock (for screenshots on a slow
	// machine), and cut the look short.
	self.pause = function (on) {
		paused = !!on;
	};
	self.skipLook = function () {
		if (phase === 'look') phaseT = phaseDur;
	};
	self.test = {
		// jump to any beat (skipping the intros)
		skipTo(id) {
			if (!players) { setUp(playersMeta ? playersMeta.length : 3); sound.resume(); }
			if (INTROS.indexOf(id) < 0) cleanIntros();
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },   // the show's clock
		tapLeft(s) { if (phase === 'tap') timeLeft = s; },   // this round's tape
	};

	self.fini = function () {
		sound.close();
		show.fini();
		unlisten();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	prepareLevel(0);
	showFloors(0);
	eyeOn(0);
	show.go('squad');

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
