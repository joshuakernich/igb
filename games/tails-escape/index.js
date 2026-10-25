/*
 * Tails Escape
 *
 * Tails is flying out of Robotnik's factory, upstream along a conveyor belt
 * that runs right round the room: in from the back of the right wall, along
 * it, round the corner, across the front wall, round again and off down the
 * left wall. The belt carries Robotnik's machines along it, straight at the
 * foxes: everyone has their own Tails in their own colour, flying over the
 * belt, and dodges them by moving and by flying high and low.
 *
 *   - Step left and right in the room and your Tails flies along the belt to
 *     match: standing by the left wall puts him down the left wall, and so on
 *     (the whole belt, left wall to right wall).
 *   - Stand as normal and he flies at the middle height. Jump (or stretch up
 *     tall) and he flies up high for a moment; squat and he dives down low,
 *     just over the belt, for as long as you stay down.
 *   - The machines: presses (a heavy ram slamming down on the belt: slip
 *     under it while it's up, its lamp flashes before it drops), swinging
 *     robot arms (duck under the claw, or slip past while it swings away),
 *     fire jets (a burner that glows, then roars: pass while it's off),
 *     buzzsaws (fly over them), laser gates (beams at one or two heights,
 *     blinking: fly through the gap, or while they're off) and crates (a red
 *     target on the belt, then a crate drops from the dark above and rides
 *     on: fly over it).
 *   - Slip past a machine without a scratch for bonus rings; grab the gold
 *     rings riding the belt (in rows and arcs that show a way through). Get
 *     hit and you drop some of your rings, tumble back down the belt, and
 *     blink, safe, for a moment. Nobody's ever out.
 *   - The belt speeds up, the machines come thicker and faster and new kinds
 *     join in as the escape goes on (FASTER!).
 *   - Robotnik hovers in his egg pod at the back of the hall over the front
 *     wall, watching.
 *
 * The score: each player's rings. The metres of belt escaped are the team's:
 * added to the team total as a bonus in the show's team beat.
 *
 * The show is Showtime's standard running order: the squad picker, the
 * title drop, the clock intro, the visor check (the foxes hovering while the
 * machines go by), the tutorial (steer, fly high, dive low, grab rings), the
 * machines' entrance (WATCH OUT!, Robotnik laughing), the escape itself until
 * the clock runs out, TIME!, scores, rank, team, leaderboard, replay, rating
 * and the end (IGB.complete there).
 *
 * Drawn with three.js, with gentle bloom and ACES tone mapping over all
 * three walls (lib/three/walls.js): three cameras on one rig at the middle
 * of the room, one per wall (createWallRig), level, with the same fixed
 * 90-degree field of view across (64 down), so the walls meet seamlessly.
 * The belt's path is a square round the room with rounded corners, so
 * whatever rides it turns smoothly from one wall onto the next.
 *
 * Input: px (left to right across the room: along the belt, left wall to
 * right wall), py (height: jump to fly high, squat to dive low, against each
 * player's own standing height). pz isn't used (only for the replay). At a
 * desk: Space jumps, hold the down arrow to duck, for whichever player the
 * mouse moves (keys 1-6).
 * An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, toScreen } from '../../lib/three/walls.js';
import { buildFlyer, buildConveyor, buildFactory, buildPress, buildArm, buildJet, buildSaw, buildLaser, buildCrate, buildTarget, buildRing, buildEggPod, sparkleTexture } from './models.js';
import { createSound } from './sound.js';

IGB.register('tails-escape', function TailsEscapeGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;                       // the show's clock (the intros and tutorial come out of it too)
	const ROOM = { depth: 9, corner: 2 };           // metres from the middle of the room to the belt's middle line, and the radius of its rounded corners
	const BELT = { y: -2.4, width: 2.6, floor: -5.2 };   // the belt's top (metres below the eye: about three quarters of the way down each wall), its width, and the factory floor
	const FAR = 21;                                 // metres out to the hall's walls
	const FOV = 64;                                 // vertical, degrees: 90 across each 16:10 wall, so the walls meet
	const EDGE = 0.06;                              // the share of the room at each side that's past the end of the belt (px)
	const ENDS = 2.6;                               // metres in from either end of the belt that the foxes reach
	const FOX = { scale: 0.88, middle: 0.6, r: 0.42, turn: 0.45 };   // his size (about 1.2 m tall), the height of his middle in the model, his reach (what touches things), how far he turns toward the room
	const LEVEL = { low: 0.6, mid: 1.85, high: 3.2 };   // the heights he flies at (metres over the belt, his middle): diving, as normal, and up high
	const FLY = { rise: 7, dive: 11, hop: 1.0 };    // how quickly he climbs and dives (per second), and how long a jump keeps him up high (seconds)
	const STEER = { glide: 9, max: 30 };            // how quickly a fox follows its player (per second), and its top speed (metres a second)
	const BODY = { jump: 0.06, duck: 0.11, release: 0.07, adapt: 0.4 };   // py above standing to jump, below to duck (and to stand up again), how fast standing height adapts
	const SPEED = { idle: 1.6, tutorial: 2.4, start: 3.2, end: 7.2 };   // the belt (metres a second): behind the show, in the tutorial, at the start of the escape and at its hardest
	const HARD_AT = 360;                            // seconds into the escape at which it's as hard as it gets
	const GAP = { start: 15, end: 7, wobble: 2 };   // metres of belt between machines, at the start and at the hardest, and a little randomness
	const UNLOCK = { press: 0, saw: 0, arm: 0.06, jet: 0.16, laser: 0.28 };   // how hard it has to be (0..1) before each machine turns up
	const CRATES = { from: 0.4, start: 9, end: 4.5, warn: 1.1, drop: 8 };   // crates: from how hard, seconds between drops (then and at the hardest), seconds of warning, metres they drop from
	const CYCLE = { slow: 1, fast: 0.72 };          // the machines' timings, scaled (at the start, at the hardest)
	const FASTER_EVERY = 60;                        // seconds between FASTER!s
	const HURT = { time: 0.8, knock: 7, safe: 1.7, lose: 0.3 };   // a hit: seconds tumbling, metres a second knocked back down the belt, seconds safe after, the share of rings dropped
	const CLEAR = 2;                                // rings for slipping past a machine unhurt
	const GRACE = 0.12;                             // metres of benefit of the doubt on every touch
	const RINGS = { r: 0.36, row: 5, every: 7 };    // a ring's reach, rings in a row, metres of belt between rows in the tutorial
	const SPAWN = 4;                                // metres past the end of the belt that things come in and go out (out of sight round the back)
	const WARN = { title: 0.4, a: 1.6, b: 2.6, c: 3.6, length: 7 };   // the machines' entrance: WATCH OUT!, then its three lines, and the end
	const POD = { x: 0, y: 4.6, z: -16.5, scale: 1.7, bob: 0.3 };    // Robotnik's pod: where it hovers over the front wall
	const FONT = 'Paytone One';                     // the game's own words (pops, the distance)

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let postfx = null;   // bloom and tone mapping over all three walls (made once the scene is)
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, 1);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (postfx) postfx.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(0x140e0a, 26, 90);
	const aniso = renderer.capabilities.getMaxAnisotropy();
	const factory = buildFactory(renderer, scene, { far: FAR, floor: BELT.floor, aniso });
	// Bloom, gently: rings, lamps, flames, lasers, the furnace windows.
	postfx = createWallComposer(renderer, scene, { strength: 0.3, radius: 0.5, threshold: 0.9 });

	scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x5a3018, 0.9));
	const key = new THREE.DirectionalLight(0xfff0e0, 2.6);
	key.position.set(0, 30, 7);
	key.target.position.set(0, BELT.y, -1);
	key.castShadow = true;
	key.shadow.mapSize.set(2048, 2048);
	Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
	key.shadow.camera.updateProjectionMatrix();
	key.shadow.bias = -0.0004;
	key.shadow.normalBias = 0.03;
	scene.add(key, key.target);
	const furnace = new THREE.DirectionalLight(0xff8a3a, 1.1);   // (the furnaces' glow, from low down all round)
	furnace.position.set(0, -4, 10);
	scene.add(furnace);

	// One eye in the middle of the room: the three cameras on one rig, level,
	// with the same fixed field of view (90 degrees across), so they're the
	// sides of one box and the walls meet seamlessly. Never tilt or zoom one alone.
	const walls = createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 2000 });   // left, front, right
	const rig = walls.rig;
	scene.add(rig);
	const cams = walls.cameras;

	/* ---------- the belt's path ---------- */

	// A square round the room with rounded corners: up the left wall from
	// the back, across the front, down the right wall to the back. s is
	// metres along it (0 at the back of the left wall); past either end it
	// carries straight on (out of sight). at(s): the point, the way along
	// (tx, tz) and the way out toward the walls (nx, nz).
	const path = (function () {
		const D = ROOM.depth, R = ROOM.corner, Q = D - R;
		const segs = [
			{ line: true, x: -D, z: D, dx: 0, dz: -1, len: D + Q },
			{ arc: true, cx: -Q, cz: -Q, a: Math.PI, len: Math.PI / 2 * R },
			{ line: true, x: -Q, z: -D, dx: 1, dz: 0, len: 2 * Q },
			{ arc: true, cx: Q, cz: -Q, a: Math.PI * 1.5, len: Math.PI / 2 * R },
			{ line: true, x: D, z: -Q, dx: 0, dz: 1, len: D + Q },
		];
		let total = 0;
		for (const g of segs) { g.s0 = total; total += g.len; }
		function at(s) {
			let g = segs[0];
			for (const k of segs) if (s >= k.s0) g = k;
			const u = s - g.s0;
			let x, z, tx, tz;
			if (g.line) { x = g.x + g.dx * u; z = g.z + g.dz * u; tx = g.dx; tz = g.dz; }
			else {
				const a = g.a + u / R;
				x = g.cx + Math.cos(a) * R; z = g.cz + Math.sin(a) * R;
				tx = -Math.sin(a); tz = Math.cos(a);
			}
			return { x, z, tx, tz, nx: tz, nz: -tx };
		}
		return { at, length: total };
	})();
	const L = path.length;

	// Things on the belt: s along it, y up (world), off out toward the wall;
	// turned so their +x runs along the belt and their +z faces the room.
	function place(obj, s, y, off = 0) {
		const p = path.at(s);
		obj.position.set(p.x + p.nx * off, y, p.z + p.nz * off);
		obj.rotation.y = Math.atan2(-p.tz, p.tx);
	}
	const S_MIN = ENDS, S_MAX = L - ENDS;
	const sFor = (px) => S_MIN + clamp((px - EDGE) / (1 - 2 * EDGE), 0, 1) * (S_MAX - S_MIN);
	const pan = (s) => clamp(s / L * 2 - 1, -1, 1) * 0.85;

	const conveyor = buildConveyor(path, { y: BELT.y, width: BELT.width, s0: -SPAWN - 4, s1: L + SPAWN + 4, floor: BELT.floor, aniso });
	scene.add(conveyor.group);

	// Robotnik, hovering in his pod at the back of the hall, over the front wall
	const pod = buildEggPod();
	pod.scale.setScalar(POD.scale);
	pod.position.set(POD.x, POD.y + 12, POD.z);   // (off the top until the machines' entrance)
	scene.add(pod);
	const podAim = new THREE.Vector3(POD.x, POD.y + 12, POD.z);

	/* ---------- helpers ---------- */

	const rand = (a, b) => a + Math.random() * (b - a);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const v3 = () => new THREE.Vector3();
	const pick = (list) => list[Math.floor(Math.random() * list.length)];

	function dispose(obj) {
		scene.remove(obj);
		obj.traverse(function (o) {
			if (!o.isMesh) return;
			if (!o.geometry.userData.shared) o.geometry.dispose();
			const m = o.material;
			if (m.userData.shared) return;
			if (m.map && !m.map.userData.shared) m.map.dispose();
			m.dispose();
		});
	}

	/* ---------- the machines and the rings ---------- */

	let machines = [];   // { type, s, sWas, mesh, age, ph, decor, hit: Set, cleared: Set, ... }
	let rings = [];      // { s, h, mesh, taken, spin }
	let sinceSpawn = 0;  // metres of belt since the last machine came in
	let nextGap = GAP.start;
	let lastType = null;
	let crateClock = 0;

	function addRing(s, h) {
		const mesh = buildRing();
		scene.add(mesh);
		const r = { s, h, mesh, taken: false, spin: Math.random() * TAU };
		place(mesh, s, BELT.y + h, -0.3);
		rings.push(r);
		return r;
	}
	// A row of rings at a height, or an arc (heights along it), centred on s.
	function ringRow(s, h, n = RINGS.row, gap = 0.95) {
		for (let i = 0; i < n; i++) addRing(s + (i - (n - 1) / 2) * gap, h);
	}
	function ringArc(s, heights, gap = 0.9) {
		heights.forEach((h, i) => addRing(s + (i - (heights.length - 1) / 2) * gap, h));
	}

	const cycleScale = () => lerp(CYCLE.slow, CYCLE.fast, heat());

	function addMachine(type, s, decor = false) {
		const m = { type, s, sWas: s, age: 0, ph: Math.random(), decor, hit: new Set(), cleared: new Set(), on: false, was: false };
		const k = cycleScale();
		if (type === 'press') { m.mesh = buildPress(); m.period = 2.6 * k; }
		else if (type === 'arm') { m.mesh = buildArm(); m.period = 3.0 * k; m.amp = lerp(0.9, 1.15, heat()); m.ph = Math.random() * TAU; }
		else if (type === 'jet') { m.mesh = buildJet(); m.period = 3.2 * k; }
		else if (type === 'saw') { m.mesh = buildSaw(); m.bob = heat() > 0.5 && Math.random() < 0.4; }
		else if (type === 'laser') {
			m.heights = pick([[LEVEL.mid], [LEVEL.low, LEVEL.mid], [LEVEL.mid, LEVEL.high]]);
			m.mesh = buildLaser(m.heights);
			m.period = 2.8 * k;
		} else if (type === 'crate') {
			m.mesh = buildCrate();
			m.target = buildTarget();
			scene.add(m.target);
			m.y = CRATES.drop;
			m.vy = 0;
			m.landed = false;
		}
		scene.add(m.mesh);
		place(m.mesh, s, BELT.y);
		machines.push(m);
		if (decor) return m;
		// rings showing a way through
		if (type === 'saw') ringArc(s, [2.2, 2.9, 3.3, 2.9, 2.2]);
		else if (type === 'arm' && Math.random() < 0.6) ringRow(s, LEVEL.low, 4);
		else if (type === 'press' && Math.random() < 0.5) ringRow(s, LEVEL.mid, 3);
		else if (type === 'laser') {
			const free = [LEVEL.low, LEVEL.mid, LEVEL.high].filter((h) => !m.heights.includes(h));
			ringRow(s, pick(free), 3);
		}
		return m;
	}

	function spawnMachine(decor) {
		const d = heat();
		const open = Object.keys(UNLOCK).filter((t) => decor || d >= UNLOCK[t]);
		const choices = open.length > 1 ? open.filter((t) => t !== lastType) : open;
		const type = pick(choices);
		lastType = type;
		addMachine(type, L + SPAWN, decor);
		// a free row of rings in the gap after it, now and then
		if (!decor && Math.random() < 0.45) ringRow(L + SPAWN + nextGap * 0.5, pick([LEVEL.low, LEVEL.mid, LEVEL.high]));
	}

	// A crate: dropped onto the belt somewhere along it, a little ahead of a fox.
	function dropCrate() {
		const live = foxes.filter((f) => f.state === 'fly');
		const f = live.length ? pick(live) : null;
		const s = clamp(f ? f.s + rand(4, 9) : rand(L * 0.3, L * 0.8), 6, L - 4);
		if (machines.some((m) => Math.abs(m.s - s) < 3)) return;   // (never on top of another machine)
		addMachine('crate', s);
	}

	// What can hurt a fox, this frame, as shapes in (s, h): { box: [s0, s1, h0, h1] } or { circle: [s, h, r] } or { stick: [s0, h0, s1, h1, r] }.
	function dangers(m) {
		const u = m.mesh.userData;
		if (m.type === 'press') {
			const b = u.ram.position.y;
			return [{ box: [m.s - 1.05, m.s + 1.05, b, b + 1.3] }, { box: [m.s - 0.2, m.s + 0.2, b + 1.3, u.top] }];
		}
		if (m.type === 'arm') {
			const a = u.swing.rotation.z;
			const cs = m.s + Math.sin(a) * u.reach, ch = u.pivot - Math.cos(a) * u.reach;
			return [{ stick: [m.s, u.pivot, cs, ch, 0.3] }, { circle: [cs, ch, 0.55] }];
		}
		if (m.type === 'jet') return m.on ? [{ box: [m.s - 0.55, m.s + 0.55, 0, u.height * u.flame.scale.y] }] : [];
		if (m.type === 'saw') return [{ circle: [m.s, u.disc.position.y, u.radius] }];
		if (m.type === 'laser') return m.on ? m.heights.map((h) => ({ box: [m.s - u.half + 0.2, m.s + u.half - 0.2, h - 0.08, h + 0.08] })) : [];
		if (m.type === 'crate') return m.y < CRATES.drop - 0.5 ? [{ box: [m.s - 0.8, m.s + 0.8, m.y, m.y + u.size] }] : [];
		return [];
	}

	function touches(shape, s, h, r) {
		r -= GRACE;
		if (shape.box) {
			const [s0, s1, h0, h1] = shape.box;
			const ds = Math.max(s0 - s, 0, s - s1), dh = Math.max(h0 - h, 0, h - h1);
			return ds * ds + dh * dh < r * r;
		}
		if (shape.circle) {
			const [cs, ch, cr] = shape.circle;
			return (cs - s) ** 2 + (ch - h) ** 2 < (cr + r) ** 2;
		}
		const [s0, h0, s1, h1, sr] = shape.stick;
		const ds = s1 - s0, dh = h1 - h0;
		const q = clamp(((s - s0) * ds + (h - h0) * dh) / (ds * ds + dh * dh || 1), 0, 1);
		return (s0 + ds * q - s) ** 2 + (h0 + dh * q - h) ** 2 < (sr + r) ** 2;
	}

	// The machines working, every frame.
	function workMachine(m, dt, loud) {
		const u = m.mesh.userData;
		const cyc = m.period ? ((m.age / m.period + m.ph) % 1) : 0;
		const p = pan(m.s);
		if (m.type === 'press') {
			// up, the lamp flashing, a slam, held down, back up
			const UP = 4.1;
			let b = UP;
			if (cyc >= 0.68 && cyc < 0.73) b = UP * (1 - Math.pow((cyc - 0.68) / 0.05, 2));
			else if (cyc >= 0.73 && cyc < 0.83) b = 0;
			else if (cyc >= 0.83) b = UP * (1 - Math.cos((cyc - 0.83) / 0.17 * Math.PI)) / 2;
			const warn = cyc >= 0.5 && cyc < 0.73;
			u.ram.position.set(warn ? (Math.random() - 0.5) * 0.05 : 0, b, 0);
			const len = Math.max(0.05, u.top - b - 1.3);
			u.piston.scale.y = len;
			u.piston.position.y = b + 1.3 + len / 2;
			u.lamp.color.setRGB(...(warn ? (Math.floor(m.age * 10) % 2 ? [4, 0.4, 0.1] : [0.4, 0.04, 0.02]) : [0.6, 0.08, 0.03]));
			m.on = b < 0.2;
			if (m.on && !m.was && loud) sound.slam(p, 0.5);
		} else if (m.type === 'arm') {
			u.swing.rotation.z = m.amp * Math.sin(m.age * TAU / m.period + m.ph);
			u.eye.color.setRGB(3 + Math.sin(m.age * 8) * 1.5, 0.3, 0.2);
		} else if (m.type === 'jet') {
			// off, the ring heating and a sputter, then roaring
			const warm = clamp((cyc - 0.4) / 0.25, 0, 1);
			u.ring.color.setRGB(0.25 + warm * 3.5, 0.06 + warm * 1.1, 0.03 + warm * 0.1);
			const on = cyc >= 0.65;
			const target = on ? 1 : cyc >= 0.5 ? 0.08 + Math.random() * 0.06 : 0.001;
			u.flame.scale.y += (target - u.flame.scale.y) * Math.min(1, dt * (on ? 16 : 10));
			const flick = 0.9 + Math.random() * 0.2;
			u.flame.scale.x = u.flame.scale.z = flick;
			u.flame.visible = u.flame.scale.y > 0.01;
			m.on = on && u.flame.scale.y > 0.5;
			if (on && !m.was && loud) sound.whoosh(p, 0.6);
			m.was = on;
			return;
		} else if (m.type === 'saw') {
			u.disc.rotation.z += dt * 14;
			if (m.bob) u.disc.position.y = 0.1 - (Math.sin(m.age * 1.6 + m.ph * TAU) * 0.5 + 0.5) * 1.6;
		} else if (m.type === 'laser') {
			// on, then off, flickering just before it's back
			const on = cyc < 0.6;
			const flicker = cyc > 0.85 && Math.floor(m.age * 16) % 2;
			for (const b of u.beams) b.visible = on || flicker;
			u.glow.opacity = on ? 0.5 : 0.25;
			m.on = on;
			if (on && !m.was && loud) sound.zap(p, 0.5);
		} else if (m.type === 'crate') {
			if (m.age < CRATES.warn) {
				m.target.visible = Math.floor(m.age * 8) % 2 === 0;
			} else if (!m.landed) {
				m.vy -= 30 * dt;
				m.y += m.vy * dt;
				if (m.y <= 0) {
					m.y = 0;
					m.landed = true;
					m.target.visible = false;
					if (loud) sound.thud(p);
					shake = Math.max(shake, 0.08);
				}
			}
			m.mesh.position.y = BELT.y + m.y;
			m.mesh.visible = m.age >= CRATES.warn;
			place(m.target, m.s, BELT.y);
		}
		m.was = m.on;
	}

	/* ---------- foxes ---------- */

	let foxes = [];

	function Fox(n) {
		const colour = PLAYER_COLORS[n];
		const model = buildFlyer(colour, FOX.middle);
		model.root.scale.setScalar(FOX.scale);
		scene.add(model.root);
		return {
			n, colour, model,
			px: 0.5, pz: 0.5, py: 0.5, seen: false,
			s: 0, sWas: 0, vs: 0, knock: 0,
			h: LEVEL.mid, level: 'mid', hop: 0,
			state: 'fly',            // fly, or hurt (tumbling back down the belt)
			t: 0, safe: 0, turn: 1, face: 1,
			rings: 0, hits: 0, cleared: 0,
			body: { stand: null, up: false, duck: false },
			reach: { min: 0.5, max: 0.5 },
			hopped: false, ducked: false,
			off: -0.25 - (n % 3) * 0.28,   // (a little apart in depth, so they don't all sit in one another)
		};
	}

	function setUp(count) {
		sound.resume();
		for (const f of foxes) scene.remove(f.model.root);
		foxes = [];
		for (let i = 0; i < count; i++) {
			const f = Fox(i);
			f.px = (i + 0.5) / count;
			f.s = f.sWas = sFor(f.px);
			foxes.push(f);
		}
	}

	/* ---------- effects ---------- */

	const sparkTex = sparkleTexture();
	const sparks = [];       // { sprite, age, life, size }
	const flung = [];        // rings thrown out: { mesh, vel, age }
	const pops = [];         // words: { text, colour, at, age, size }
	let shake = 0;
	let flashRed = 0;

	function sparkle(at, colour = 0xffffff, size = 1.4) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: new THREE.Color(colour).multiplyScalar(2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));   // (past white: it blooms)
		s.position.copy(at);
		s.scale.setScalar(size);
		scene.add(s);
		sparks.push({ sprite: s, age: 0, life: 0.4, size });
	}
	function pop(text, colour, at, size = 70) {
		pops.push({ text, colour, at: at.clone(), age: 0, size });
	}
	const foxAt = (f) => f.model.root.position.clone();

	function fling(f, n) {
		const at = foxAt(f);
		const p = path.at(f.s);
		for (let i = 0; i < Math.min(n, 12); i++) {
			const mesh = buildRing();
			mesh.position.copy(at);
			const a = i / Math.min(n, 12) * TAU;
			const vel = v3().set(p.tx * Math.cos(a) * 5 - p.nx * 2, 6 + Math.sin(a) * 3, p.tz * Math.cos(a) * 5 - p.nz * 2);
			scene.add(mesh);
			flung.push({ mesh, vel, age: 0 });
		}
	}

	/* ---------- the flow ---------- */

	const sound = createSound();
	const show = new Showtime(stage, {
		id: 'tails-escape',
		seconds: GAME_SECONDS,
		players: () => foxes.length,
		scores: () => foxes.map((f) => f.rings),
		bonus: () => Math.round(escaped),
		bonusLabel: 'METRES ESCAPED',
		music: false,
		theme: { accent: '#ff9a2b', accent2: '#ffd23f', gold: '#ffe14a', ink: '#15161c', sky: ['#1c1f27', '#6a2e10'], glow: 'rgba(255,140,40,0.35)' },
		rivals: ['Rotor Runners', 'Belt Busters', 'Twin Tails', 'Gear Dodgers', 'The Escapees', 'Press Gang',
			'Spark Plugs', 'Saw Dodgers', 'Egg Breakers', 'Conveyor Crew'],
	});

	let phase = 'idle';      // idle (behind the show's opening), run (the tutorial on), finish (TIME! and after)
	let machinesOn = 'decor';   // decor (going by behind the opening, harmless), off (the tutorial), live
	let clock = 0;
	let playT = 0;           // seconds into the escape proper
	let escaped = 0;         // metres of belt escaped (the escape proper)
	let speed = SPEED.idle;
	let fasterShow = null;   // { age }: FASTER!, over the walls
	let nextFaster = FASTER_EVERY;
	let podIn = false;
	const heat = () => (show.beat === 'play' || show.beat === 'timeup' ? clamp(playT / HARD_AT, 0, 1) : 0);

	function initGame(count) {
		setUp(count);
		show.go('title');
	}

	function run() {
		if (phase === 'run') return;
		phase = 'run';
		sound.music(true);
	}

	function finish() {
		if (phase === 'finish') return;
		phase = 'finish';
		sound.finish();
		sound.music(false);
		sound.rotor(0);
	}

	/* ---------- the tutorial ---------- */

	const everyone = (fn) => foxes.length > 0 && foxes.filter((f) => f.seen).every(fn);
	const TUTORIAL = [
		{ caption: 'STEP LEFT AND RIGHT TO FLY', min: 2, max: 10, did: () => everyone((f) => f.reach.max - f.reach.min >= 0.3) },
		{ caption: 'JUMP TO FLY UP HIGH', min: 2, max: 10, did: () => everyone((f) => f.hopped) },
		{ caption: 'SQUAT TO DIVE DOWN LOW', min: 2, max: 10, did: () => everyone((f) => f.ducked) },
		{ caption: 'GRAB THE GOLD RINGS', min: 2, max: 14, did: () => everyone((f) => f.rings >= 3) },
	];

	/* ---------- the beats ---------- */

	const SCENE = ['squad', 'title', 'clock', 'visors', 'controls', 'warn', 'play', 'timeup'];   // the beats the factory shows behind

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		// the tutorial: the machines go off down the belt, rings come instead
		show.beats.tutorial({
			steps: TUTORIAL,
			enterStep(i) {
				for (const f of foxes) {
					f.reach = { min: f.px, max: f.px };
					if (i === 1) f.hopped = false;
					if (i === 2) f.ducked = false;
				}
			},
			enter() { run(); machinesOn = 'off'; sound.go(); },
		}),
		// the machines' entrance: WATCH OUT!, Robotnik swooping in laughing, and
		// what's coming (the machines start down the belt from now on)
		{
			id: 'warn',
			length: WARN.length,
			enter() {
				run();
				machinesOn = 'live';
				sinceSpawn = nextGap = GAP.start;   // (one straight in)
				podIn = true;
				show.fx('villainReveal');
				stage.timeout(() => sound.laugh(), 500);
				for (const f of foxes) f.rings = 0;   // (the practice's rings don't count)
			},
			update(dt, bt) {
				show.blackout = 0.35 * Math.min(1, bt * 2);
				if (show.cue(WARN.title)) { show.fx('stomp'); show.shake = 0.5; }
				for (const at of [WARN.a, WARN.b, WARN.c]) if (show.cue(at)) show.fx('beat');
			},
			draw(ctx, bt) {
				show.onWalls(ctx, function (c) {
					show.slam(c, 'WATCH OUT!', W / 2, 230, 120, bt - WARN.title, { fill: '#ff3d4a' });
					if (bt > WARN.a) show.text(c, "ROBOTNIK'S MACHINES ARE COMING DOWN THE BELT", W / 2, 360, 50, { fill: 'white', alpha: Math.min(1, (bt - WARN.a) * 3) });
					if (bt > WARN.b) show.text(c, 'JUMP OVER SAWS AND CRATES · DUCK UNDER ROBOT ARMS', W / 2, 440, 50, { fill: 'white', alpha: Math.min(1, (bt - WARN.b) * 3) });
					if (bt > WARN.c) show.text(c, "SLIP PAST PRESSES, FIRE AND LASERS WHILE THEY'RE OFF!", W / 2, 520, 50, { fill: '#ffd23f', alpha: Math.min(1, (bt - WARN.c) * 3) });
				});
			},
		},
		// the escape, until the clock's out
		{
			id: 'play',
			length: Infinity,
			enter() {
				run();
				machinesOn = 'live';
				podIn = true;
				playT = 0;
				escaped = 0;
				nextFaster = FASTER_EVERY;
				sound.go();
				for (const f of foxes) { f.rings = 0; f.hits = 0; f.cleared = 0; }
			},
			update(dt) {
				playT += dt;
				show.record(playT, foxes.map((f) => (f.seen ? { px: f.px, pz: f.pz } : null)));
			},
			draw(ctx, bt) {
				if (bt < 1.4) show.onWalls(ctx, (c) => show.slam(c, 'ESCAPE!', W / 2, 300, 140, bt, { fill: '#3cdc7a', alpha: 1 - clamp((bt - 1) / 0.4, 0, 1) }));
			},
		},
		show.beats.timeUp({
			enter() { finish(); },
		}),
		show.beats.scores(),
		show.beats.rank(),
		show.beats.team(),
		show.beats.board(),
		show.beats.replay(),
		show.beats.rate(),
		show.beats.end({
			enter() { IGB.complete(scoresToRewards(foxes.map((f) => f.rings))); },
		}),
	]);

	/* ---------- every frame ---------- */

	const tmp = v3();

	function simulate(dt) {
		clock += dt;
		const playing = show.beat === 'play';
		const touchy = phase === 'run';

		// the belt
		const target = phase === 'idle' ? SPEED.idle : show.beat === 'controls' ? SPEED.tutorial : machinesOn === 'live' ? lerp(SPEED.start, SPEED.end, heat()) : SPEED.tutorial;
		speed += (target - speed) * Math.min(1, dt * 1.5);
		const slide = speed * dt;
		conveyor.belt.offset.x = (conveyor.belt.offset.x + slide) % 1;
		if (playing) {
			escaped += slide;
			if (playT >= nextFaster) {
				nextFaster += FASTER_EVERY;
				fasterShow = { age: 0 };
				sound.faster();
			}
		}
		if (fasterShow && (fasterShow.age += dt) > 2.4) fasterShow = null;

		// new machines (and rings) in at the far end
		sinceSpawn += slide;
		if (machinesOn !== 'off' && sinceSpawn >= nextGap) {
			spawnMachine(machinesOn === 'decor');
			sinceSpawn = 0;
			nextGap = lerp(GAP.start, GAP.end, heat()) + rand(-GAP.wobble, GAP.wobble);
		}
		if (machinesOn === 'off' && sinceSpawn >= RINGS.every) {
			sinceSpawn = 0;
			const r = Math.random();
			if (r < 0.4) ringRow(L + SPAWN, pick([LEVEL.low, LEVEL.mid, LEVEL.high]));
			else if (r < 0.7) ringArc(L + SPAWN, [LEVEL.mid, 2.6, LEVEL.high, 2.6, LEVEL.mid]);
			else ringArc(L + SPAWN, [LEVEL.mid, 1.2, LEVEL.low, 1.2, LEVEL.mid]);
		}
		if (machinesOn === 'live' && heat() >= CRATES.from) {
			crateClock += dt;
			if (crateClock >= lerp(CRATES.start, CRATES.end, (heat() - CRATES.from) / (1 - CRATES.from))) { crateClock = 0; dropCrate(); }
		}

		// everything on the belt rides it
		for (const m of machines) {
			m.sWas = m.s;
			m.s -= slide;
			m.age += dt;
			place(m.mesh, m.s, BELT.y);
			workMachine(m, dt, m.s > -1 && m.s < L + 1 && phase !== 'finish');
		}
		for (const m of machines.filter((m) => m.s < -SPAWN)) {
			dispose(m.mesh);
			if (m.target) dispose(m.target);
			machines.splice(machines.indexOf(m), 1);
		}
		for (const r of rings) {
			r.s -= slide;
			r.spin += dt * 3;
			r.mesh.userData.spin.rotation.y = r.spin;
			place(r.mesh, r.s, BELT.y + r.h + Math.sin(clock * 3 + r.s) * 0.06, -0.3);
		}
		for (const r of rings.filter((r) => r.s < -SPAWN || r.taken)) {
			scene.remove(r.mesh);
			rings.splice(rings.indexOf(r), 1);
		}

		for (const f of foxes) stepFox(f, dt, playing, touchy);

		// Robotnik, hovering and watching the foxes
		const live = foxes.filter((f) => f.seen);
		const meanS = live.length ? live.reduce((a, f) => a + f.s, 0) / live.length : L / 2;
		podAim.set(POD.x + clamp((meanS - L / 2) * 0.25, -6, 6), POD.y + (podIn ? 0 : 12), POD.z);
		pod.position.x += (podAim.x - pod.position.x) * Math.min(1, dt * 0.8);
		pod.position.y += (podAim.y + Math.sin(clock * 1.7) * POD.bob - pod.position.y) * Math.min(1, dt * 1.5);
		pod.rotation.z = Math.sin(clock * 1.3) * 0.05;
		pod.rotation.y = clamp((meanS - L / 2) * -0.02, -0.4, 0.4);
		const pu = pod.userData;
		pu.robotnik.animate(dt, 'idle', 0, 0, clock);
		pu.jetMesh.scale.y = 0.85 + Math.random() * 0.3;

		// sparkles, flung rings, words
		for (const s of sparks) {
			s.age += dt;
			const q = s.age / s.life;
			s.sprite.scale.setScalar(s.size * (0.6 + q * 1.2));
			s.sprite.material.opacity = 1 - q;
			s.sprite.material.rotation += dt * 4;
		}
		for (const s of sparks.filter((s) => s.age >= s.life)) {
			scene.remove(s.sprite);
			s.sprite.material.dispose();
			sparks.splice(sparks.indexOf(s), 1);
		}
		for (const f of flung) {
			f.age += dt;
			f.vel.y -= 18 * dt;
			f.mesh.position.addScaledVector(f.vel, dt);
			f.mesh.rotation.y += dt * 8;
			if (f.age > 1) f.mesh.scale.multiplyScalar(Math.exp(-dt * 6));
		}
		for (const f of flung.filter((f) => f.age > 1.6)) {
			scene.remove(f.mesh);
			flung.splice(flung.indexOf(f), 1);
		}
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.1) pops.splice(i, 1);
		shake *= Math.exp(-dt * 6);
		flashRed *= Math.exp(-dt * 4);

		// the eye
		rig.position.set(0, 0, 0);
		if (shake > 0.01) rig.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
		factory.update(clock, heat());

		sound.rotor(phase === 'run' && foxes.length ? 1 : 0);
		sound.tick();
	}

	function stepFox(f, dt, counts, touchy) {
		f.t += dt;
		f.safe = Math.max(0, f.safe - dt);
		f.hop = Math.max(0, f.hop - dt);
		f.sWas = f.s;

		// the body: high or low
		const b = f.body;
		const wasLevel = f.level;
		if (f.state === 'hurt') f.level = 'mid';
		else if (b.duck) f.level = 'low';
		else if (b.up || f.hop > 0) f.level = 'high';
		else f.level = 'mid';
		if (touchy && f.level !== wasLevel && f.state === 'fly') {
			if (f.level === 'high') { f.hopped = true; sound.hop(pan(f.s)); }
			if (f.level === 'low') { f.ducked = true; sound.dive(pan(f.s)); }
		}
		const aim = LEVEL[f.level];
		f.h += (aim - f.h) * Math.min(1, dt * (aim < f.h ? FLY.dive : FLY.rise));

		// steering: along the belt after its player (knocked back down it when hit)
		if (f.state === 'hurt') {
			f.s += f.knock * dt;
			f.knock *= Math.exp(-dt * 3);
			if (f.t >= HURT.time) { f.state = 'fly'; f.t = 0; f.safe = HURT.safe; }
		} else {
			const most = STEER.max * dt;
			f.s += clamp((sFor(f.px) - f.s) * Math.min(1, dt * STEER.glide), -most, most);
		}
		f.s = clamp(f.s, S_MIN - 1, S_MAX + 1);
		f.vs = dt > 0 ? (f.s - f.sWas) / dt : 0;

		if (touchy && f.state === 'fly') touch(f, counts);

		// in the air over the belt
		const m = f.model;
		place(m.root, f.s, BELT.y + f.h, f.off);
		if (f.vs < -3) f.face = -1;
		else if (f.vs > 1.5) f.face = 1;   // (heading upstream, the way out, unless he's going back)
		f.turn += (f.face - f.turn) * Math.min(1, dt * 7);
		m.pose(dt, {
			mode: f.level,
			rising: clamp((aim - f.h) / 1.3, 0, 1),
			hurt: f.state === 'hurt',
			lean: -clamp(f.vs * 0.012, -0.35, 0.35),
			turn: f.turn * (Math.PI / 2 - FOX.turn),
		});
		m.root.visible = !(f.safe > 0 && Math.floor(clock * 14) % 2);
	}

	// Touching rings and machines.
	function touch(f, counts) {
		for (const r of rings) {
			if (r.taken || (r.s - f.s) ** 2 + (r.h - f.h) ** 2 > (RINGS.r + FOX.r) ** 2) continue;
			r.taken = true;
			f.rings++;
			sparkle(r.mesh.position, 0xfff2a0);
			sound.ring(pan(r.s));
		}
		if (machinesOn !== 'live') return;
		for (const m of machines) {
			if (m.decor) continue;
			if (f.safe <= 0 && !m.hit.has(f.n) && dangers(m).some((d) => touches(d, f.s, f.h, FOX.r))) {
				m.hit.add(f.n);
				hurt(f, counts);
				return;
			}
			// slipped past it (it's gone by him, or he's gone by it), unhurt
			if (m.sWas - f.sWas > 0 && m.s - f.s <= 0 && !m.hit.has(f.n) && !m.cleared.has(f.n)) {
				m.cleared.add(f.n);
				if (!counts) continue;
				f.rings += CLEAR;
				f.cleared++;
				sound.clear(pan(f.s));
				pop('+' + CLEAR, '#ffe14a', foxAt(f), 56);
			}
		}
	}

	// Hit: rings fly, and Tails tumbles back down the belt.
	function hurt(f, counts) {
		const lose = counts ? Math.ceil(f.rings * HURT.lose) : 0;
		f.rings -= lose;
		f.hits++;
		fling(f, lose);
		f.state = 'hurt';
		f.t = 0;
		f.knock = -HURT.knock;
		f.hop = 0;
		sound.hit(pan(f.s));
		shake = Math.max(shake, 0.3);
		flashRed = Math.max(flashRed, 0.4);
		pop(lose ? '−' + lose : 'OUCH!', '#ff3d4a', foxAt(f), 84);
		sparkle(foxAt(f), 0xffffff, 3);
	}

	function render() {
		// (one shadow pass, then all three walls into one HDR frame, then bloom and tone mapping)
		postfx.render(walls.views(renderer.domElement.width, renderer.domElement.height));
	}

	/* ---------- the 2D layer: words, the distance ---------- */

	function onWall(v, wall) {
		const p = toScreen(v, cams[wall], wall * W, 0, W, H);
		if (!p || Math.abs(p.ndc.x) > 1 || Math.abs(p.ndc.y) > 1.3) return null;
		return p;
	}
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			const p = onWall(v, w);
			if (p) return p;
		}
		return null;
	}

	function overlay(ctx) {
		if (flashRed > 0.01) {
			for (let w = 0; w < 3; w++) {
				const g = ctx.createRadialGradient(W * (w + 0.5), H / 2, H * 0.3, W * (w + 0.5), H / 2, W * 0.75);
				g.addColorStop(0, 'rgba(255,40,60,0)');
				g.addColorStop(1, `rgba(255,40,60,${flashRed * 0.6})`);
				ctx.fillStyle = g;
				ctx.fillRect(W * w, 0, W, H);
			}
		}

		// words over the foxes
		for (const p of pops) {
			const at = onAnyWall(tmp.copy(p.at).add(v3().set(0, 1.1, 0)));
			if (!at) continue;
			const q = p.age / 1.1;
			art.text(ctx, p.text, at.x, at.y - q * 90, { size: p.size * (q < 0.15 ? q / 0.15 : 1), font: FONT, fill: p.colour, outline: '#15161c', outlineWidth: 7, alpha: 1 - Math.max(0, q - 0.6) / 0.4 });
		}

		if (!['play', 'timeup'].includes(show.beat)) return;

		// the distance, top right of the front wall
		art.text(ctx, Math.floor(escaped) + ' M', 2 * W - 70, 84, { size: 76, font: FONT, fill: '#ffffff', outline: '#15161c', outlineWidth: 8, align: 'right' });
		art.text(ctx, 'ESCAPED', 2 * W - 70, 128, { size: 30, font: FONT, fill: '#ffd23f', outline: '#15161c', outlineWidth: 5, align: 'right' });

		if (fasterShow) {
			const a = 1 - clamp((fasterShow.age - 1.9) / 0.5, 0, 1);
			show.onWalls(ctx, (c) => show.slam(c, 'FASTER!', W / 2, 420, 120, fasterShow.age, { fill: '#ff9a2b', alpha: a }));
		}
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		readKeys();
		simulate(show.paused ? 0 : dt * show.timeScale);   // (still while paused; slowing to a stop with TIME!)
		if (SCENE.includes(show.beat)) render();   // (the results are on the show's own backdrop)
		show.frame(ctx, dt, overlay);
	};

	/* ---------- input ---------- */

	// The body: jumping and ducking against each player's own standing height.
	function readBody(f, py, dt) {
		const b = f.body;
		if (b.stand === null) b.stand = py;
		const rise = b.stand - py;         // (py is 0 high, 1 low: standing taller is a smaller py)
		const wasUp = b.up;
		if (!b.up && rise > BODY.jump) b.up = true;
		else if (b.up && rise < BODY.jump * 0.5) b.up = false;
		if (!b.duck && -rise > BODY.duck) b.duck = true;
		else if (b.duck && -rise < BODY.release) b.duck = false;
		if (b.up && !wasUp) f.hop = FLY.hop;
		// standing height drifts with them while they're neither jumping nor ducking
		if (!b.up && !b.duck && Math.abs(rise) < BODY.jump * 0.8) b.stand += (py - b.stand) * Math.min(1, dt * BODY.adapt);
	}

	let lastInput = performance.now();
	self.setPlayers = function (p) {
		const t = performance.now();
		const dt = Math.min(0.2, (t - lastInput) / 1000);
		lastInput = t;
		foxes.forEach(function (f, i) {
			if (!p[i]) return;
			if (p[i].px !== undefined) {
				f.px = clamp(p[i].px, 0, 1);
				f.seen = true;
				f.reach.min = Math.min(f.reach.min, f.px);
				f.reach.max = Math.max(f.reach.max, f.px);
			}
			if (p[i].pz !== undefined) f.pz = clamp(p[i].pz, 0, 1);   // (1 at the front wall, 0 at the back: only for the replay)
			if (p[i].py !== undefined && !keys.any) readBody(f, p[i].py, dt);
		});
	};

	// At a desk: Space jumps, hold the down arrow to duck (whoever the mouse moves).
	const keys = { jump: false, duck: false, jumpEdge: false, any: false };
	const deskPlayer = () => (IGB.players && IGB.players.selected) || 0;
	function onKey(e) {
		if (e.target && e.target.tagName === 'INPUT') return;
		const down = e.type === 'keydown';
		if (e.code === 'Space') {
			if (down && !keys.jump) keys.jumpEdge = true;
			keys.jump = down;
			keys.any = true;
			e.preventDefault();
		}
		if (e.code === 'ArrowDown') { keys.duck = down; keys.any = true; e.preventDefault(); }
	}
	function readKeys() {
		if (!keys.any) return;
		const f = foxes[deskPlayer()];
		if (!f) return;
		if (keys.jumpEdge) f.hop = FLY.hop;
		keys.jumpEdge = false;
		f.body.duck = keys.duck;
		f.body.up = false;
	}
	document.addEventListener('keydown', onKey);
	document.addEventListener('keyup', onKey);

	// For tests and the console: where the game is up to.
	self.state = function () {
		return Object.assign(show.state(), {
			phase, machinesOn, speed, escaped, heat: heat(),
			foxes: foxes.map((f) => ({ n: f.n, s: f.s, h: f.h, level: f.level, state: f.state, rings: f.rings, hits: f.hits, cleared: f.cleared })),
			machines: machines.map((m) => ({ type: m.type, s: m.s, on: m.on })),
			rings: rings.length,
		});
	};

	self.test = {
		// jump to any beat (past the squad, a squad is needed: three, unless one's been given)
		jump(id) {
			$('showtime-picker').remove();
			if (!foxes.length) setUp(playersMeta ? playersMeta.length : 3);
			show.go(id);
		},
		timeLeft(s) { show.setTimeLeft(s); },
		heat(k) { playT = k * HARD_AT; },   // (straight to a difficulty, 0..1)
		machine(type, s = L - 4) { return addMachine(type, s); },
	};

	self.fini = function () {
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('keyup', onKey);
		sound.close();
		unlisten();
		show.fini();
		factory.dispose();
		conveyor.belt.dispose();
		sparkTex.dispose();
		postfx.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	// (a few machines already on their way down the belt, behind the squad picker)
	for (let s = L * 0.2; s < L; s += GAP.start) addMachine(pick(['press', 'saw', 'arm', 'jet', 'laser']), s, true);
	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
