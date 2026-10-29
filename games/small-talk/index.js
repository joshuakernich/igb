/*
 * Small Talk
 *
 * A comedy-horror spot-the-difference memory game. It's Gary's leaving do,
 * in a hired function room with a carpet nobody chose: round tables, a
 * buffet, the punch, the cake, a banner, balloons, and the guests making
 * small talk in twos and threes, all filmed on somebody's dad's camcorder.
 * Everyone's a little bit dull. Then you blink, and it's a little bit wrong.
 *
 * It runs as a show (shared/showtime.js): the squad picker, the title drop,
 * the ten-minute clock, the controls stepped through live on the first floor
 * (look round all three walls, tap the guest who's started waving at you,
 * wrong taps cost time), then Gary, down the corridor, turning round to see
 * you. Then the rounds, until the clock runs out:
 *
 * The party wraps round all three walls. REMEMBER EVERYONE: the squad has a
 * few seconds to take it in. Then a long blink, and the party's almost the
 * same. WHAT'S WEIRD?: someone floating, someone on the ceiling, a face on
 * the back of a head, twins, a giant, someone turned blue, the banner saying
 * something it shouldn't, someone in the cake... Each find is circled in the
 * colour of whoever stands nearest that wall; a wrong tap scratches the
 * record, makes the lights stutter and costs tape. When the tape runs out,
 * the ones nobody found pulse. If nobody found anything, the tape rewinds and
 * the round goes again; otherwise blink, and it's later: each round less
 * time to look, more weirdness, and the lights a little lower and redder,
 * the faces a little stranger. Then TIME!, the scores, the podium, the team
 * total, the leaderboard and the replay.
 *
 * Under the hood each round is two copies of the room stacked a floor apart
 * (the one to remember, and the one that's changed), and the blink cuts the
 * camera from one to the other. The three walls are one 3D view: a camera
 * per wall, 90 degrees each, all from one eye at standing height in the
 * middle of the room. three.js draws into its own canvas under the world
 * canvas; the show's overlays go on top. The guests are people.js.
 *
 * Input: wall touches (taps). px / pz decide whose tap it was: the player
 * standing nearest the tapped point. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { mergeGeometries } from '../../lib/three/addons/utils/BufferGeometryUtils.js';
import { BUILDERS, buildShell, panelMats, CEIL, wallPoint, wallYaw } from './models.js';
import { generate, mutate, R } from './layout.js';
import { createSound } from './sound.js';
import { drawFace, EXPR, makePerson } from './people.js';
import { CAST, PHASES, VOICES, RADIO } from './vignettes.js';

IGB.register('small-talk', function SmallTalkGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;     // the show's clock: rounds until it runs out
	// Each round: seconds to look, differences to find, seconds of tape to find them.
	// Harder each round; past the fourth it keeps going, a little harder still.
	// (the look is the round's scene, played once through: vignettes.js)
	function levelCfg(L) {
		return { diffs: Math.min(9, 5 + L), tap: Math.max(25, 34 - 2 * L) };
	}
	const READY = 3.4;            // seconds of the round's title card (the time, the phase of the party) before the look
	const LOOP_GAP = 0.7;         // seconds of the tape jumping back between loops of the scene
	const ROUND_SECONDS = 55;     // about how long a round takes, for making sure the night reaches its end
	const DESCENT = 1.0;          // seconds of the blink (a flutter, shut, a flutter) between the room and its changed copy
	const REWIND = 2.4;           // seconds to rewind back up, when a round goes again
	const REVEAL = 5;             // seconds showing what was missed
	const PENALTY = 3;            // seconds of tape lost for a wrong tap
	const DEPTH_BONUS = 5;        // team points for each round finished (staying late)
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
			{ id: 'look', caption: 'LOOK AROUND: THE PARTY WRAPS ALL THREE WALLS', min: 3, max: 6.5 },
			{ id: 'tap', caption: 'TAP ANYTHING WEIRD', min: 2.5, max: 14 },
			{ id: 'wrong', caption: 'WRONG TAPS COST TIME', min: 3.2, max: 6.5 },
		],
		nice: 1.2,            // the NICE! once a step is done
		moved: 0.3,           // how far (room widths, per player) counts as looking round
		change: 1.4,          // the practice guest changes this long into its step
		hint: 5,              // and gets a ring round it if nobody has tapped it by then
		demoEvery: 1.5,       // a demonstration wrong tap, this often
		tape: 40,             // the demonstration tape, in seconds
	};

	// Gary, at the end of the corridor with his back to the party: the
	// lights stutter, the camera creeps down the corridor toward him, the
	// camcorder finds him, he turns his head right round to see you, beaming,
	// the lights die, and when they come back he's gone: GARY.
	const ENTITY = {
		flicker: [0.2, 2.6],  // the lights stutter
		push: [1.0, 7.2],     // the slow push down the corridor
		depth: 3.6,           // metres past the doorway the camera gets to
		far: 7.5,             // where he stands, metres past the doorway
		focus: 4.2,           // the camcorder's focus box finds him
		turn: 5.4,            // and he turns round
		out: 7.2,             // the lights die
		back: 7.8,            // and come back, the camera at the middle again
		title: 8.0,           // GARY
		length: 11,
	};

	// The light at each phase of the night: the work lights while setting up,
	// the function room's flat warm light, lower for the speeches, the party
	// lights for the dancing, then fire, then the grey of the morning after.
	const MOODS = [
		{ sky: 0xf4f6ff, ground: 0x5a5050, hemi: 2.3, lamp: 7.5, fog: 0x80706a, near: 9, far: 38, panel: 0xffffff },
		{ sky: 0xfff3e2, ground: 0x6a4038, hemi: 2.2, lamp: 7, fog: 0x7a5a50, near: 8, far: 36, panel: 0xfff6e6 },
		{ sky: 0xffecd6, ground: 0x64382f, hemi: 2.1, lamp: 6.6, fog: 0x705048, near: 8, far: 34, panel: 0xfff0dc },
		{ sky: 0xffe6c8, ground: 0x60342a, hemi: 2.0, lamp: 6.2, fog: 0x6a4a40, near: 7.5, far: 33, panel: 0xffeacc },
		{ sky: 0xffdcb8, ground: 0x502a22, hemi: 1.6, lamp: 5, fog: 0x5a3a34, near: 7, far: 30, panel: 0xffd8b0 },
		{ sky: 0xc8a8ff, ground: 0x3a2050, hemi: 1.0, lamp: 2.8, fog: 0x2a1a40, near: 5, far: 24, panel: 0xc090ff },
		{ sky: 0xffa8d8, ground: 0x401830, hemi: 0.9, lamp: 2.6, fog: 0x30142a, near: 4.5, far: 22, panel: 0xff90c8 },
		{ sky: 0xffb070, ground: 0x401808, hemi: 1.1, lamp: 3, fog: 0x3a1a0a, near: 3.5, far: 18, panel: 0xffa060 },
		{ sky: 0x8a96a8, ground: 0x1a1a20, hemi: 0.7, lamp: 1.8, fog: 0x1c1c22, near: 3, far: 17, panel: 0x9aa4b0 },
	];
	// The room's sound at each phase: [chatter, music, out of tune], and the fire alarm.
	const PARTY_SOUND = [[0, 0.75, 0], [0.75, 0.6, 0], [0.9, 0.6, 0], [0.8, 0.55, 0], [0.25, 0.45, 0], [0.6, 1, 0], [0.8, 1, 0.7], [0.3, 0.85, 0.25], [0, 0.75, 1]];

	// The show's colours: party-balloon gold and pink on near-black.
	const YELLOW = '#ffd166';
	const PINK = '#ff6fa8';
	const GREEN = '#7ad67a';
	const RED = '#ff5a4a';

	if (!document.querySelector('link[data-small-talk]')) {
		$('<link rel="stylesheet" data-small-talk href="https://fonts.googleapis.com/css2?family=VT323&display=swap">').appendTo('head');
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

	// The party lights, turning, for the dancing; the fire's flicker. (Always
	// there, at nothing when not wanted, so the shaders never recompile.)
	const discoLights = [0xff3ad0, 0x3ad8ff, 0xffe03a].map(function (c) {
		const l = new THREE.PointLight(c, 0, 0, 1.4);
		rig.add(l);
		return l;
	});
	const fireLights = [[-2, -4], [2.5, -3]].map(function ([x, z]) {
		const l = new THREE.PointLight(0xff7a2a, 0, 0, 1.5);
		l.position.set(x, 0.6, z);
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
		if (item.flip) g.rotation.z = Math.PI;      // hanging from the ceiling
		else if (item.lean) g.rotation.z = item.lean;
		if (item.tip) g.rotation.x = item.tip;      // knocked over
		g.userData.itemId = item.id;
		return g;
	}

	function placeItem(f, item) {
		const g = buildItem(item);
		f.group.add(g);
		f.byId.set(item.id, g);
		g.updateMatrixWorld(true);
		if (g.userData.flicker) f.flickers.push(Object.assign({ id: item.id, on: true, until: 0 }, g.userData.flicker));
		// everyone in it who moves (a guest, or someone in the cake), and the scene's cast by name
		g.traverse(function (o) {
			if (!o.userData.actor) return;
			const star = o === g && item.props.star ? item.props.star : null;
			f.actors.push({ actor: o.userData.actor, group: g, star });
			if (star) f.stars[star] = { actor: o.userData.actor, group: g };
		});
	}

	function removeItem(f, id) {
		const g = f.byId.get(id);
		if (!g) return;
		f.group.remove(g);
		f.byId.delete(id);
		f.actors = f.actors.filter((a) => a.group !== g);
		f.flickers = f.flickers.filter((fl) => fl.id !== id);
	}

	function buildFloor(n, layout) {
		const group = new THREE.Group();
		group.position.y = floorY(n);
		scene.add(group);
		group.add(buildShell({ R, openings: layout.openings }));
		group.updateMatrixWorld(true);
		const f = { n, group, layout, byId: new Map(), flickers: [], actors: [], stars: {} };
		for (const it of layout.items) placeItem(f, it);
		floors.set(n, f);
		return f;
	}

	function dropFloor(n) {
		const f = floors.get(n);
		if (!f) return;
		scene.remove(f.group);
		for (const fl of f.flickers) { fl.face.dispose(); if (fl.glow) fl.glow.dispose(); }
		for (const b of f.batches || []) b.geometry.dispose();
		floors.delete(n);
	}

	// Once a floor is settled, bake everything on it that never moves into a
	// few big meshes, one per material: a few dozen draws a wall instead of
	// hundreds. The pieces stay, hidden, for raycasting; the guests (and
	// anything with a mind of its own: flames, smoke, the mirror ball) stay
	// as they are.
	const noop = THREE.Object3D.prototype.onBeforeRender;
	function batch(f) {
		if (f.batches) return;
		f.group.updateMatrixWorld(true);
		const inv = new THREE.Matrix4().copy(f.group.matrixWorld).invert();
		const m = new THREE.Matrix4();
		const sets = new Map();
		const lively = (o) => { for (let p = o; p && p !== f.group; p = p.parent) if (p.userData.actor || p.onBeforeRender !== noop) return true; return false; };
		f.group.traverse(function (o) {
			if (!o.isMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.material.visible || !o.visible || lively(o)) return;
			const g = o.geometry;
			const key = o.material.uuid + '|' + Object.keys(g.attributes).sort().join(',');
			if (!sets.has(key)) sets.set(key, { material: o.material, parts: [], meshes: [] });
			const e = sets.get(key);
			const part = g.index ? g.toNonIndexed() : g.clone();
			part.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
			e.parts.push(part);
			e.meshes.push(o);
		});
		f.batches = [];
		for (const e of sets.values()) {
			const merged = e.parts.length > 1 ? mergeGeometries(e.parts) : e.parts[0];
			for (const p of e.parts) if (p !== merged) p.dispose();
			if (!merged) continue;
			const mesh = new THREE.Mesh(merged, e.material);
			mesh.userData.noOcclude = true;
			mesh.matrixAutoUpdate = false;
			f.group.add(mesh);
			f.batches.push(mesh);
			for (const o of e.meshes) o.visible = false;
		}
	}

	function showFloors(...ns) {
		for (const [n, f] of floors) f.group.visible = ns.includes(n);
	}

	/* ---------- the differences ---------- */

	const raycaster = new THREE.Raycaster();
	raycaster.camera = cams[1];   // (sprites, the flames and smoke, need one to face)
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
		const src = c.gone ? up : down;
		const g = src.byId.get(c.itemId);
		if (!g) return null;
		const box = new THREE.Box3().setFromObject((c.head && g.getObjectByName('headBox')) || g);
		if (box.isEmpty()) return null;
		const centre = box.getCenter(new THREE.Vector3());
		eyeOn(src.n);
		if (!canSee(src, g, centre)) return null;
		if (src === up) box.translate(new THREE.Vector3(0, -FLOOR_H, 0));
		eyeOn(down.n);
		const m = markFor(box);
		if (!m || Math.abs(m.at.nx) > 0.84 || Math.abs(m.at.ny) > 0.86) return null;
		if (kept.some((d) => Math.hypot(d.x - m.x, d.y - m.y) < SPACING)) return null;
		if (m.size < 16 && c.kind !== 'crasher') return null;
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
		const upLayout = generate(seed, partyPhase);
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
		batch(up);
		batch(floors.get(2 * L + 1));
		eyeOn(Math.round(-camY / FLOOR_H));
	}

	/* ---------- the game's state ---------- */

	const sound = createSound();

	let players = 0;
	let people = [];              // { px, pz } per player (pz 0 at the front wall, 1 at the back)
	let scores = [];
	let level = 0;
	let partyPhase = 0;           // how far into the night (vignettes.js PHASES): the set-up, the arrivals... the morning after
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
		id: 'small-talk',
		seconds: GAME_SECONDS,
		players: () => players,
		scores: () => scores,
		bonus: () => levelsDone * DEPTH_BONUS,
		bonusLabel: 'STAYED LATE BONUS',
		drawAvatar: partyGuest,
		theme: {
			accent: YELLOW, accent2: PINK, gold: '#ffe680', ink: '#1a0a10', font: FONT,
			sky: ['#12060c', '#3a1426'], panel: 'rgba(40,14,26,0.86)', floor: 'rgba(14,4,8,0.7)', glow: 'rgba(255,111,168,0.28)',
		},
		backdrop: drawBunting,
		rivals: ['The Plus Ones', 'Canapé Crew', 'Name Tag Gang', 'The Early Leavers', 'Punch Bowl Posse',
			'Gary\'s Old Team', 'Sausage Roll Society', 'The Awkward Silence', 'Open Bar Optimists', 'Second Cousins',
			'Speech Survivors', 'Secret Santa Club', 'Accounts Payable', 'The Last Ones Here'],
	});

	// A player as a guest at the do: a shirt in their colour, a tie, a name
	// badge, and a face (a big grin when winning). Feet at (x, y), about 125
	// tall at scale 1.
	function partyGuest(ctx, n, x, y, scale, pose) {
		const c = PLAYER_COLORS[n] || 'white';
		const ink = '#1a0a10';
		const up = pose === 'cheer' || pose === 'win';
		const o = { stroke: ink, lineWidth: 3.5 };
		ctx.save();
		ctx.translate(x, y + (pose === 'win' ? -8 : 0));
		ctx.scale(scale, scale);
		art.ellipse(ctx, 0, 2, 34, 6, { fill: 'rgba(0,0,0,0.3)' });
		// arms, behind the body when down
		const arm = function (s) {
			const hand = up ? [s * 42, -132] : [s * 31, -46];
			art.line(ctx, [[s * 22, -86], hand], { stroke: ink, lineWidth: 19, lineCap: 'round' });
			art.line(ctx, [[s * 22, -86], hand], { stroke: c, lineWidth: 12, lineCap: 'round' });
			art.circle(ctx, hand[0], hand[1], 7.5, Object.assign({ fill: '#e8b896' }, o));
		};
		arm(-1);
		arm(1);
		// trousers and shoes
		for (const s of [-1, 1]) {
			art.roundRect(ctx, s > 0 ? 2 : -20, -52, 18, 46, 5, Object.assign({ fill: '#2c2f36' }, o));
			art.roundRect(ctx, s > 0 ? 0 : -24, -10, 24, 11, 5, Object.assign({ fill: '#1c1a18' }, o));
		}
		// the shirt, a tie, a name badge
		art.roundRect(ctx, -26, -98, 52, 52, 12, Object.assign({ fill: c }, o));
		art.poly(ctx, [[-5, -96], [5, -96], [7, -62], [0, -54], [-7, -62]], { fill: '#2a1a2a', stroke: ink, lineWidth: 2 });
		art.roundRect(ctx, 8, -88, 15, 10, 2, { fill: 'white', stroke: ink, lineWidth: 2 });
		// the head and its face
		art.circle(ctx, 0, -122, 25, Object.assign({ fill: '#e8b896' }, o));
		drawFace(ctx, up ? EXPR.grin : pose === 'lose' ? EXPR.worried : EXPR.smile, 0, -118, 48, { ink });
		ctx.restore();
	}

	// The results backdrop: strings of bunting swinging across the dark.
	function drawBunting(c, time) {
		const cols = ['#e8445a', '#f29a2e', '#e8c22e', '#3aa86a', '#3a8ad8', '#8a5ad0'];
		for (let k = 0; k < 3; k++) {
			const y0 = 90 + k * 150;
			const sag = 70 + k * 20;
			const at = (u) => [u * W, y0 + Math.sin(u * Math.PI) * sag + Math.sin(time * 0.8 + k) * 6];
			art.line(c, Array.from({ length: 21 }, (_, i) => at(i / 20)), { stroke: 'rgba(255,240,220,0.25)', lineWidth: 2 });
			for (let i = 1; i < 20; i++) {
				const [x, y] = at(i / 20);
				const sw = Math.sin(time * 2 + i + k) * 4;
				art.poly(c, [[x - 18, y], [x + 18, y], [x + sw, y + 40]], { fill: cols[(i + k) % 6], alpha: 0.22 / (1 + k * 0.4) });
			}
		}
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
		const ph = sceneOf().index;
		sound.party(...PARTY_SOUND[ph]);
		radioOn(ph);
		sound.alarm(ph === 7);
		callout = null;
		show.fx('thud', 0.8);
		setPhase('ready', READY);
	}

	// REMEMBER EVERYONE: the scene, played once through.
	function startLook() {
		const len = sceneOf().length;
		say('REMEMBER EVERYONE', len, false);
		lastSceneT = -1;
		setPhase('look', len + 0.2);
	}

	// Blink, and cut to the changed copy of the room (or rewind back to the first).
	function descend(to, kind = 'descend') {
		descent = { from: floorN, to, crossed: [] };
		showFloors(floorN, to);
		callout = null;
		if (kind === 'descend') sound.blink(DESCENT);
		else { sound.crackle(); show.fx('rewind'); }
		setPhase(kind, kind === 'descend' ? DESCENT : REWIND);
	}

	// TAP THE DIFFERENCES.
	function startTap() {
		showFloors(floorN);
		timeLeft = levelCfg(level).tap;
		lastTick = Math.ceil(timeLeft);
		loopT = 0;
		lastSceneT = -1;
		say('WHAT\'S WEIRD?', 3, false);
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
		// on through the night: a phase a round, faster if time's short, so the last round is the morning after
		const roundsLeft = Math.max(1, Math.floor(show.timeLeft() / ROUND_SECONDS));
		partyPhase = Math.min(PHASES.length - 1, Math.max(partyPhase + 1, PHASES.length - roundsLeft));
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

	// The practice guest, on the front wall's side of the room, somewhere
	// clear and in plain view, chatting to nobody.
	function placePractice() {
		removePractice();
		const f = floors.get(0);
		eyeOn(0);
		const low = f.layout.items.filter((it) => it.y < 1 && it.type !== 'stain');
		for (const d of [3.9, 4.4, 3.6, 4.9]) {
			for (const u of [3.7, 4.1, 3.5]) {
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
		practice.spot = wallPoint(1, 3.8, 4.0);
		practice.chair = practiceChair(practice.spot, false);
		f.group.add(practice.chair);
	}

	const practiceGuest = makePerson(() => 0.37, { act: 'drink', expr: EXPR.bored });
	function practiceChair(p, changed) {
		const props = Object.assign({}, practiceGuest, changed ? { act: 'wave', head: -1.1, expr: EXPR.grin, exprLock: true } : {});
		const g = BUILDERS.person(props);
		g.position.set(p.x, changed ? 0.45 : 0, p.z);
		g.rotation.y = wallYaw(1) + 1.1;
		return g;
	}

	// It changes: floating, and waving at you. Its ring and tap volume.
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
		figure = garyAt(false);
		f.group.add(figure);
	}

	// Gary with his back to us, or turned right round to see us.
	function garyAt(turned) {
		const f = floors.get(0);
		const props = Object.assign({}, CAST.gary.looks, { act: 'idle' }, turned ? { head: Math.PI, expr: EXPR.beam, exprLock: true } : { head: 0, expr: EXPR.smile });
		const g = BUILDERS.person(props);
		g.position.set(figureAt.x, 0, figureAt.z);
		g.rotation.y = wallYaw(1) + Math.PI;
		return g;
	}

	function removeFigure() {
		const f = floors.get(0);
		if (f && figure) f.group.remove(figure);
		figure = null;
	}

	// Everything the intros set up, put away (on the way into the rounds).
	function castShown(on) {
		for (const f of floors.values()) for (const k in f.stars) f.stars[k].group.visible = on;
	}

	function cleanIntros() {
		removePractice();
		removeFigure();
		castShown(true);
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
			// the cut happens with the eyes shut (or mid-rewind)
			const from = eyeY(descent.from);
			const to = eyeY(descent.to);
			camY = phaseT < phaseDur / 2 ? from : to;
			if (phaseT >= phaseDur) {
				camY = to;
				floorN = descent.to;
				if (floorN % 2) startTap();
				else startReady();
			}
			break;
		}

		case 'tap':
			loopScene(dt);
			timeLeft -= dt;
			if (timeLeft <= 5 && Math.ceil(timeLeft) < lastTick && timeLeft > 0) sound.tick();
			lastTick = Math.ceil(timeLeft);
			if (timeLeft <= 0) {
				timeLeft = 0;
				startReveal();
			}
			break;

		case 'reveal':
			loopScene(dt);
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

	// The scene going round again: to the end, a moment of the tape jumping, from the top.
	function loopScene(dt) {
		const len = sceneOf().length;
		loopT += dt;
		if (loopT > len && loopT - dt <= len) glitch = LOOP_GAP;
		if (loopT > len + LOOP_GAP) loopT = 0;
	}

	/* ---------- the scene: its clock, its voices, its captions ---------- */

	let loopT = 0;                // the scene's clock while it loops (tap, reveal)
	let lastSceneT = -1;          // where the voices got up to
	let glitch = 0;               // seconds of the tape jumping back to the start
	const voices = { buffer: null, playing: [] };
	const voiceOut = sound.ctx.createGain();
	voiceOut.gain.value = 1.2;
	voiceOut.connect(sound.master);
	const voiceRoom = sound.ctx.createGain();
	voiceRoom.gain.value = 0.12;
	voiceOut.connect(voiceRoom).connect(sound.reverb);
	// The radio: one track a phase, from assets/small-talk/radio.mp3.
	let radioBuffer = null;
	let radioWants = -1;
	let radioPlaying = -1;
	function radioOn(ph) {
		radioWants = ph;
		if (!radioBuffer || ph === radioPlaying) return;
		radioPlaying = ph;
		sound.radio(ph < 0 ? null : radioBuffer, RADIO[ph]);
	}
	fetch(new URL('../../assets/small-talk/radio.mp3', import.meta.url))
		.then((r) => r.arrayBuffer())
		.then((b) => sound.ctx.decodeAudioData(b))
		.then((buf) => { radioBuffer = buf; if (radioWants >= 0) radioOn(radioWants); })
		.catch((e) => console.warn('Small Talk: no radio', e));
	fetch(new URL('../../assets/small-talk/voices.mp3', import.meta.url))
		.then((r) => r.arrayBuffer())
		.then((b) => sound.ctx.decodeAudioData(b))
		.then((buf) => { voices.buffer = buf; })
		.catch((e) => console.warn('Small Talk: no voices', e));

	// The phase of the night on floor n (the one on show by default), with its scene.
	function sceneOf(n = floorN) {
		const f = floors.get(n);
		const i = f ? f.layout.phase || 0 : 0;
		return Object.assign({ index: i }, PHASES[i]);
	}
	// Where the scene's up to. Before the rounds it just plays (silently).
	function sceneT() {
		const V = sceneOf();
		if (show.beat !== 'play') return clock % (V.length + LOOP_GAP);
		if (phase === 'look') return Math.min(phaseT, V.length);
		if (phase === 'tap' || phase === 'reveal') return Math.min(loopT, V.length);
		if (phase === 'descend') return phaseT < phaseDur / 2 ? V.length : 0;
		return 0;
	}
	const lineDur = (V, i) => (VOICES[V.index + '-' + i] || [0, 2])[1];
	// Who's talking at time T.
	function talkers(V, T) {
		const out = new Set();
		V.lines.forEach(function ([t, who], i) { if (T >= t && T < t + lineDur(V, i)) out.add(who); });
		return out;
	}
	function stopVoices() {
		for (const s of voices.playing) { try { s.stop(); } catch (e) { /* (already stopped) */ } }
		voices.playing.length = 0;
	}
	// Start any lines the scene has just reached; cut them off when it jumps back.
	function voicesAt(V, T, live) {
		if (!live || T < lastSceneT - 0.01) stopVoices();
		if (live && voices.buffer) {
			V.lines.forEach(function ([t], i) {
				if (!(t > lastSceneT && t <= T)) return;
				const v = VOICES[V.index + '-' + i];
				if (!v) return;
				const late = T - t;
				if (late > v[1] - 0.1) return;
				const src = sound.ctx.createBufferSource();
				src.buffer = voices.buffer;
				src.connect(voiceOut);
				src.start(0, v[0] + late, v[1] - late);
				voices.playing.push(src);
				src.onended = () => { const k = voices.playing.indexOf(src); if (k >= 0) voices.playing.splice(k, 1); };
			});
		}
		lastSceneT = live ? T : -1;
	}
	const voicesLive = () => show.beat === 'play' && !paused && !show.paused && (phase === 'look' || phase === 'tap' || phase === 'reveal');

	// Everyone moving: each floor on show, at the scene's time, and the intros' extras.
	const headAt = new THREE.Vector3();
	const perf = { tick: 0, render: 0, actors: 0 };   // (for the console: ms per frame)
	function animate(dt) {
		const t0 = performance.now();
		const V = sceneOf();
		const T = sceneT();
		const live = voicesLive();
		voicesAt(V, T, live);
		const talking = live ? talkers(V, T) : new Set();
		for (const f of floors.values()) {
			if (!f.group.visible) continue;
			for (const a of f.actors) a.actor.tick(T, dt, !!a.star && talking.has(a.star));
		}
		for (const g of [figure, practice.chair]) if (g && g.userData.actor) g.userData.actor.tick(clock, dt, false);
		perf.tick = performance.now() - t0;
		perf.actors = [...floors.values()].reduce((a, f) => a + (f.group.visible ? f.actors.length : 0), 0);
	}

	// Each line, over its speaker's head while they say it.
	function wrapText(text, n) {
		const rows = [''];
		for (const word of text.split(' ')) {
			if ((rows[rows.length - 1] + ' ' + word).trim().length > n) rows.push(word);
			else rows[rows.length - 1] = (rows[rows.length - 1] + ' ' + word).trim();
		}
		return rows;
	}
	// Each line in a little pixel-art chat bubble over its speaker's head, in
	// the tape's own lettering: it pops up as they start and fades as they
	// finish. Everything snaps to a grid of fat pixels: notched corners, a
	// stepped tail, a heavy black edge. Their name rides on a tab in their colour.
	const BUBBLE = { font: 34, line: 40, chars: 22, pad: 18, px: 6, lift: 0.3, font2: 'VCRFONT' };
	const NAME_COLOURS = { gary: '#a82a2a', linda: '#2f7a78', dave: '#d0701a', priya: '#7a5ad0', caterer: '#2a2a2a' };
	// a pixel box: a rectangle with one fat pixel bitten out of each corner
	function pixelBox(ctx, x, y, w, h, P, fill) {
		ctx.fillStyle = fill;
		ctx.fillRect(x + P, y, w - 2 * P, h);
		ctx.fillRect(x, y + P, w, h - 2 * P);
	}
	function drawCaptions(ctx) {
		if (!voicesLive()) return;
		const V = sceneOf();
		const T = sceneT();
		const f = floors.get(floorN);
		if (!f) return;
		const B = BUBBLE, P = B.px;
		const snap = (v) => Math.round(v / P) * P;
		V.lines.forEach(function ([t, who, text], i) {
			const d = lineDur(V, i);
			if (T < t || T > t + d + 0.3) return;
			const st = f.stars[who];
			if (!st || !st.actor.ready) return;
			const p = toWalls(headAt.copy(st.actor.head).add(v3.set(0, B.lift, 0)));
			if (!p) return;
			const age = T - t;
			// popping up in steps, as pixel things do: 60%, 115%, 100%
			const pop = age < 0.06 ? 0.6 : age < 0.13 ? 1.15 : 1;
			const alpha = clamp((t + d + 0.3 - T) / 0.25, 0, 1);
			const rows = wrapText(text, B.chars);
			ctx.save();
			ctx.font = `${B.font}px ${B.font2}, monospace`;
			const w = snap(Math.max(...rows.map((r) => ctx.measureText(r).width)) + B.pad * 2);
			const h = snap(rows.length * B.line + B.pad * 1.4);
			const tail = 4 * P;
			const tipX = snap(p.x), tipY = snap(Math.max(260 + h + tail, p.y));
			const bx = snap(clamp(tipX - w / 2, p.wall * W + 20, p.wall * W + W - 20 - w));
			const by = tipY - tail - h;
			ctx.globalAlpha = alpha;
			ctx.translate(tipX, tipY);
			ctx.scale(pop, pop);
			ctx.translate(-tipX, -tipY);
			// the tail: a staircase of fat pixels down to the head
			const tx = snap(clamp(tipX, bx + 4 * P, bx + w - 6 * P));
			const stairs = (grow, fill) => {
				ctx.fillStyle = fill;
				for (let k = 0; k < 4; k++) {
					const sx = tx + (tipX - tx) * (k + 1) / 4;
					ctx.fillRect(snap(sx) - grow, by + h + k * P - grow, (4 - k) * P + 2 * grow, P + 2 * grow);
				}
			};
			// a heavy black edge, then the white
			pixelBox(ctx, bx - P, by - P, w + 2 * P, h + 2 * P, P, '#0c0a0c');
			stairs(P, '#0c0a0c');
			pixelBox(ctx, bx, by, w, h, P, '#fffdf6');
			stairs(0, '#fffdf6');
			// their name on a tab
			ctx.font = `${Math.round(B.font * 0.7)}px ${B.font2}, monospace`;
			const name = CAST[who].name;
			const nw = snap(ctx.measureText(name).width + 4 * P);
			pixelBox(ctx, bx + 2 * P - P, by - 4 * P, nw + 2 * P, 6 * P, P, '#0c0a0c');
			pixelBox(ctx, bx + 2 * P, by - 3 * P, nw, 4 * P, P, NAME_COLOURS[who] || '#333');
			ctx.fillStyle = 'white';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText(name, bx + 4 * P, by - P);
			// the words
			ctx.font = `${B.font}px ${B.font2}, monospace`;
			ctx.fillStyle = '#1a1416';
			ctx.textAlign = 'center';
			rows.forEach((row, k) => ctx.fillText(row, bx + w / 2, by + B.pad * 0.7 + B.line * (k + 0.5) + 4));
			ctx.restore();
		});
	}

	// What runs whatever the beat: the mood, the lights, the floating words.
	function ambient(dt) {
		clock += dt;
		glitch = Math.max(0, glitch - dt);
		mood += (sceneOf().index - mood) * Math.min(1, dt * 0.8);
		stutter = Math.max(0, stutter - dt);
		if (callout) callout.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if ((pops[i].age += dt) > 1.4) pops.splice(i, 1);
		for (let i = wrongs.length - 1; i >= 0; i--) if ((wrongs[i].age += dt) > 0.9) wrongs.splice(i, 1);
	}

	/* ---------- drawing the 3D ---------- */

	const cA = new THREE.Color();
	const cB = new THREE.Color();
	function mix(key, t) {
		const i = Math.min(MOODS.length - 2, Math.floor(t));
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
		animate(dt);
		// the lights: this floor's mood, and stuttering after a wrong tap
		const light = stutter > 0 ? (Math.random() < 0.55 ? 0.2 : 1) : 1;
		const disco = clamp(1 - Math.abs(mood - 5.5) / 1.1, 0, 1);
		discoLights.forEach(function (l, i) {
			const a = clock * 0.9 + i * 2.1;
			l.intensity = 9 * disco * light;
			l.visible = disco > 0;   // (off altogether, not just dark: every light costs every pixel)
			l.position.set(Math.sin(a) * 4, 2.1, -2.5 - Math.cos(a) * 3);
		});
		const burn = clamp(1 - Math.abs(mood - 7) / 0.9, 0, 1) + 0.4 * clamp(mood - 7.4, 0, 1);
		fireLights.forEach(function (l, i) { l.intensity = burn * (5 + 2.5 * Math.sin(clock * (11 + i * 3.7)) + Math.random() * 1.5); l.visible = burn > 0; });
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
		if (phase === 'rewind') {
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
		const r0 = performance.now();
		renderer.info.autoReset = false;
		renderer.info.reset();
		cams.forEach(function (cam, i) {
			viewport(i * W, 0, W, H);
			renderer.render(scene, cam);
		});
		perf.render = performance.now() - r0;
		perf.calls = renderer.info.render.calls;
		perf.tris = renderer.info.render.triangles;
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

	// The time left (the look, or the tape): a line under the prompt, the
	// prompt's size, on every wall; red at the end.
	function timerText(ctx, left, y = 210, alpha = 1) {
		const secs = Math.ceil(left);
		const text = `0:${String(secs).padStart(2, '0')}`;
		for (let wall = 0; wall < 3; wall++) vhsText(ctx, text, wall * W + W / 2, y, 64, { alpha, fill: left < 5 ? RED : '#f6f1dc', flicker: left < 5 });
	}

	// How shut the eyes are through the blink (0 open, 1 shut): a couple of
	// quick flutters, shut through the cut at the middle, a flutter opening.
	const BLINK = [[0, 0], [0.07, 0.6], [0.13, 0.12], [0.2, 0.75], [0.27, 0.3], [0.38, 1], [0.62, 1], [0.7, 0.3], [0.76, 0.7], [0.85, 0.05], [0.91, 0.35], [1, 0]];
	function blinkShut(t) {
		for (let i = 1; i < BLINK.length; i++) {
			const [t1, v1] = BLINK[i];
			const [t0, v0] = BLINK[i - 1];
			if (t <= t1) { const k = (t - t0) / (t1 - t0); return v0 + (v1 - v0) * k * k * (3 - 2 * k); }
		}
		return 0;
	}

	// Drawn as the world, under the show's overlays: the 3D, then what sits
	// on it (marks, crosses, the darkness of the slab).
	function drawWorld(ctx) {
		render(frameDt);
		// the blink: the lids flutter, shut (the cut), and flutter open again
		if (phase === 'descend') {
			const shut = blinkShut(phaseT / phaseDur);
			const lid = shut * H * 0.52;
			for (let wall = 0; wall < 3; wall++) {
				const x = wall * W;
				art.rect(ctx, x, 0, W, lid, { fill: '#0a0306' });
				art.rect(ctx, x, H - lid, W, lid, { fill: '#0a0306' });
				// a soft curve on each lid's edge
				art.ellipse(ctx, x + W / 2, lid, W * 0.6, 60 * (1 - shut) + 4, { fill: '#0a0306' });
				art.ellipse(ctx, x + W / 2, H - lid, W * 0.6, 60 * (1 - shut) + 4, { fill: '#0a0306' });
			}
		}
		if (phase === 'rewind') art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(0,0,0,${0.25 * Math.sin(phaseT / phaseDur * Math.PI)})` });
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

	// The round's big words (REMEMBER EVERYONE, WHAT'S WEIRD?), the
	// look's countdown and the tape while tapping.
	function drawPlay(ctx) {
		if (callout && callout.age < callout.dur) {
			const fadeIn = Math.min(1, callout.age / 0.3);
			const fadeOut = Math.min(1, (callout.dur - callout.age) / 0.4);
			const a = fadeIn * fadeOut;
			// (just under the show's clock, the same size on every wall, nothing behind it)
			for (let wall = 0; wall < 3; wall++) vhsText(ctx, callout.text, wall * W + W / 2, 140, 64, { alpha: a });   // (the clock's size)
		}
		if (phase === 'look') timerText(ctx, Math.max(0, phaseDur - phaseT));
		drawCaptions(ctx);
		if (glitch > 0 && (phase === 'tap' || phase === 'reveal')) {
			art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(0,0,0,${0.5 * Math.sin(glitch / LOOP_GAP * Math.PI)})` });
			for (let wall = 0; wall < 3; wall++) vhsText(ctx, '◀◀', wall * W + W / 2, H / 2, 90, { alpha: Math.sin(glitch / LOOP_GAP * Math.PI) });
		}
		if (phase === 'tap') timerText(ctx, timeLeft);
		if (phase === 'tap' && (!callout || callout.age > 2.6)) {
			// (like the prompts: under the clock, the same size, every wall, nothing behind)
			const a = Math.min(1, callout ? (callout.age - 2.6) / 0.3 : 1);
			for (let wall = 0; wall < 3; wall++) vhsText(ctx, `FOUND ${diffs.filter((d) => d.found).length}/${diffs.length}`, wall * W + W / 2, 140, 64, { alpha: a, flicker: false });
		}
		if (phase === 'descend' || phase === 'rewind') {
			const a = Math.sin(phaseT / phaseDur * Math.PI);
			const text = phase === 'rewind' ? '◀◀ REWIND' : '*BLINK*';
			for (let wall = 0; wall < 3; wall++) vhsText(ctx, text, wall * W + W / 2, H / 2, 76, { alpha: phase === 'rewind' ? a : Math.max(0, a * 2 - 1) });
		}
		// the round's start: how many things are about to go wrong (the time of night is already in the corner)
		if (phase === 'ready') {
			const a = Math.min(1, phaseT / 0.3) * (1 - between(phaseT, phaseDur - 0.4, phaseDur));
			const V = sceneOf();
			const text = retry ? 'AGAIN. REMEMBER HARDER' : diffs.length + ' THINGS WILL GET WEIRD';
			art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(8,2,6,${0.55 * a})` });
			for (let wall = 0; wall < 3; wall++) {
				const x = wall * W + W / 2;
				vhsText(ctx, V.clock, x, 360, 120, { alpha: a, fill: YELLOW });
				vhsText(ctx, V.title, x, 480, 80, { alpha: a });
				vhsText(ctx, text, x, 580, 50, { alpha: a * between(phaseT, 0.8, 1.2), fill: PINK });
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
	// scanlines, grain, tracking, the REC light (or PLAY, or REWIND).
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
		const falling = phase === 'rewind' && show.beat === 'play' ? Math.sin(phaseT / phaseDur * Math.PI) * 1.6 : glitch > 0 ? Math.sin(glitch / LOOP_GAP * Math.PI) * 1.4 : 0;
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
		const deck = show.beat === 'title' ? 'play' : show.beat !== 'play' ? 'rec'
			: phase === 'rewind' || ((phase === 'tap' || phase === 'reveal') && glitch > 0) ? 'rewind'
			: phase === 'look' || phase === 'tap' || phase === 'reveal' ? 'play' : 'rec';
		for (let i = 0; i < 3; i++) {
			const x = i * W;
			// the deck's state: PLAY while the scene plays, REWIND while it goes back, otherwise REC
			if (deck === 'play') art.poly(ctx, [[x + 56, 46], [x + 88, 64], [x + 56, 82]], { fill: '#f6f1dc' });
			else if (deck === 'rewind') for (const dx of [0, 22]) art.poly(ctx, [[x + 76 + dx, 46], [x + 50 + dx, 64], [x + 76 + dx, 82]], { fill: '#f6f1dc' });
			else if (Math.floor(clock * 1.2) % 2 === 0) art.circle(ctx, x + 70, 64, 17, { fill: '#ff2a2a' });
			vhsText(ctx, deck === 'play' ? 'PLAY' : deck === 'rewind' ? 'REWIND' : 'REC', x + (deck === 'rewind' ? 112 : 100), 64, 54, { align: 'left', flicker: false, split: 2 });
			vhsText(ctx, `CAM 0${i + 1}`, x + W - 70, 64, 48, { align: 'right', flicker: false, split: 2 });
		}

	}

	// How badly the tape's playing through the title: torn as it starts,
	// a jolt as the title lands, a hiccup every few seconds after (0..1).
	function tapeGlitch(bt) {
		const start = 1 - between(bt, 0.1, 0.9);
		const land = Math.max(0, 1 - Math.abs(bt - 1.35) / 0.25);
		const hiccup = (bt % 2.7) < 0.14 && bt > 2 ? 0.6 : 0;
		return Math.max(start, land, hiccup);
	}
	// The VHS treatment over the title (drawn after it): bands of the picture
	// torn sideways, a bright tracking line rolling through, colour bleeding.
	function vhsTitle(ctx, bt) {
		const k = tapeGlitch(bt);
		if (k <= 0.02) return;
		const m = ctx.getTransform();
		const src = ctx.canvas;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		const n = Math.round(3 + 9 * k);
		for (let i = 0; i < n; i++) {
			const y = (180 + Math.random() * 640) * m.d + m.f;
			const h = (6 + Math.random() * 40 * k) * m.d;
			const dx = (Math.random() - 0.5) * 140 * k * m.a;
			ctx.drawImage(src, 0, y, src.width, h, dx, y, src.width, h);
		}
		// the colours slipping: the picture again, faintly, a little to each side
		ctx.globalAlpha = 0.18 * k;
		ctx.globalCompositeOperation = 'lighter';
		ctx.drawImage(src, -10 * k * m.a, 0);
		ctx.drawImage(src, 10 * k * m.a, 0);
		ctx.restore();
		// a bright tracking line rolling down
		const ty = (bt * 900) % (H + 200) - 100;
		art.rect(ctx, 0, ty, WIDTH, 10 + 30 * k, { fill: `rgba(255,255,255,${0.12 + 0.25 * k})` });
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
		if (step.id === 'wrong') timerText(ctx, practice.tape, 370);
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

		// 1b. the title, in the tape's own lettering, as the tape starts to play:
		// tearing and rolling, then a glitch as it lands, and the odd hiccup after
		show.beats.titleDrop({
			// (its lines: the manifest's title, in VCRFONT, shared with the end screen's carousel)
			update(dt) {
				if (Math.random() < dt * 0.7) stutter = 0.2 + Math.random() * 0.25;
				if (show.cue(0.05) || show.cue(1.3)) sound.crackle();
			},
			draw(ctx, bt) {
				vhsTitle(ctx, bt);
				camcorder(ctx, { noise: 0.5 * tapeGlitch(bt) });
			},
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
				sound.party(...PARTY_SOUND[0]);
				radioOn(0);
			},
			update(dt) { stepControls(dt); },
			draw(ctx) {
				drawControls(ctx);
				camcorder(ctx);
			},
		},

		// 4. Gary, at the end of the corridor: the lights buzz, the camera
		// creeps toward him, the camcorder finds him, he turns round, beaming,
		// the lights die... GARY
		{
			id: 'entity',
			length: ENTITY.length,
			enter() {
				removePractice();
				placeFigure();
				castShown(false);
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
				if (show.cue(E.turn)) {
					const f = floors.get(0);
					if (figure) f.group.remove(figure);
					figure = garyAt(true);
					f.group.add(figure);
					stutter = 0.25;
					sound.buzz();
				}
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
				if (show.cue(E.title)) { show.fx('villainReveal'); show.shake = 0.8; show.flash = 0.35; sound.say('gary is so glad you came'); }
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
						if (age > 0.6) vhsText(ctx, bt > E.turn ? 'AF  :)' : 'AF  ? ? ?', p.x, p.y + 180, 44, { fill: RED, split: 2 });
					}
				}
				camcorder(ctx, { noise: bt > E.out - 0.4 && bt < E.back + 0.4 ? 0.35 : 0 });
				const out = 1 - between(bt, E.length - 0.5, E.length);
				show.onWalls(ctx, function (c) {
					show.slam(c, 'GARY', W / 2, 450, 260, bt - E.title, { fill: PINK, glow: '#c23a6a', alpha: out });
					show.slam(c, 'IS SO GLAD YOU CAME', W / 2, 620, 70, bt - E.title - 0.6, { fill: 'white', alpha: out });   // (the boss intro's byline)
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
				radioOn(-1);
				stopVoices();
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
			perf: { tick: +perf.tick.toFixed(1), render: +perf.render.toFixed(1), actors: perf.actors, calls: perf.calls, tris: perf.tris, programs: renderer.info.programs.length, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, lights: rig.children.filter((o) => o.isLight && o.visible).length + 1, canvas: renderer.domElement.width + 'x' + renderer.domElement.height },
			phase, level, partyPhase, scene: sceneOf().id, sceneT: sceneT(), floor: floorN, camY, timeLeft, clockLeft: show.timeLeft(), misses, players, retry, levelsDone,
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
		tap(x, y) { tap({ x, y }); },   // a tap on the walls at world pixels x, y (the virtual gamebox's players)
		party(n) {   // straight to a phase of the night (vignettes.js PHASES), from this round's title card
			partyPhase = clamp(n, 0, PHASES.length - 1);
			dropFloor(2 * level);
			dropFloor(2 * level + 1);
			prepareLevel(level);
			startReady();
		},
		findOne() { const d = diffs.find((x) => !x.found); if (phase === 'tap' && d) found(d, { x: d.x, y: d.y }); },   // as if someone tapped it
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
