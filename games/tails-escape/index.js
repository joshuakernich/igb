/*
 * Tails Escape
 *
 * Tails is flying out of Robotnik's factory through a maze of tunnels, and
 * every surface of every tunnel is a conveyor belt running at him. Seen from
 * just behind him (third person), on whichever wall he's flying into.
 * Everyone has their own Tails in their own colour, all flying the maze
 * together.
 *
 *   - Step left and right along the wall Tails is on and your Tails moves
 *     across the tunnel to match. Stand as normal and he flies at the middle
 *     height; jump (or stretch up tall) and he flies up high for a moment;
 *     squat and he dives down low for as long as you stay down.
 *   - The machines in the tunnels: laser grids (fly through a gap), crates
 *     riding the floor (over or round them), buzzsaws standing up out of the
 *     floor (over or round, and later on they slide across), crushers
 *     slamming down from the ceiling (keep out of their lanes), robot arms
 *     swinging across the tunnel (duck under), and fire jets roaring across
 *     at one or two heights (over or under). Gold rings show a way through.
 *   - Slip past a machine without a scratch for bonus rings. Get hit and you
 *     drop some of your rings, tumble, and blink, safe, for a moment.
 *     Nobody's ever out.
 *   - Junctions: the tunnel comes to a room where it branches: ahead, left
 *     and right, or two of them. The tunnels only ever run toward the left,
 *     front or right wall (never back toward the room), so each branch is
 *     seen down the wall it runs into: from the front wall all three can
 *     open, from a side wall just ahead and back toward the front. TAP HERE
 *     shows on each branch's wall as a junction comes up: tap the wall you
 *     want (touch it, or walk right up to it) and the most taps win (no taps:
 *     ahead, if it's open). Tails turns into that tunnel, and so onto that
 *     wall: everyone turns to face it and carries on.
 *   - Every branch is lit in its own colour: blue is plain, gold is a ring
 *     tunnel (fewer machines, more rings), red is danger (more machines,
 *     double bonus for slipping past them).
 *   - It all speeds up as the escape goes on (FASTER!), the tunnels get
 *     shorter, the machines come thicker and new kinds join in.
 *
 * The score: each player's rings. The metres flown are the team's: added
 * to the team total as a bonus in the show's team beat.
 *
 * The show is Showtime's standard running order: the squad picker, the
 * title drop, the clock intro, the visor check (the tunnels flying by), the
 * tutorial (steer, fly high, dive low, tap a wall at a junction), the
 * machines' entrance (WATCH OUT!, Robotnik ahead in his pod, laughing, then
 * away), the escape until the clock runs out, TIME!, scores, rank, team,
 * leaderboard, replay, rating and the end (IGB.complete there).
 *
 * Drawn with three.js, with gentle bloom and ACES tone mapping over all
 * three walls (lib/three/walls.js): three cameras on one rig, one per wall
 * (createWallRig), level, with the same fixed 90-degree field of view
 * across (64 down), so the walls meet seamlessly. The rig never turns: it
 * follows the foxes along the maze a few metres behind them, rounding each
 * corner, so whichever way they fly is straight into one of the walls.
 *
 * Input: each player's position along Tails' wall (the left wall: pz; the
 * front: px; the right: 1 - pz), py (height: jump to fly high, squat to
 * dive low, against each player's own standing height), and wall taps
 * (wallChange, or coming within TOUCH of a wall). At a desk: Space jumps,
 * hold the down arrow to duck, click a wall to tap it, for whichever player
 * the mouse moves (keys 1-6).
 * An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig, toScreen, environmentFromShader } from '../../lib/three/walls.js';
import { buildFlyer, buildBlob, beltTexture, buildTunnel, buildCap, buildJunction, buildGrid, buildCrates, buildSaw, buildCrusher, buildArm, buildJets, buildRing, buildEggPod, sparkleTexture, KIND_COLOURS } from './models.js';
import { createSound } from './sound.js';

IGB.register('tails-escape', function TailsEscapeGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const GAME_SECONDS = 600;                       // the show's clock (the intros and tutorial come out of it too)
	const T = { half: 4.1, height: 6.6, stub: 24, rib: 6, tile: 2 };   // the tunnels: half their width, their height, how far a branch not yet taken is built (metres), metres between ribs, metres of belt a tile
	const LANES = [-2.6, 0, 2.6];                   // the middles of the three lanes across a tunnel
	const LEVELS = [1.3, 3.0, 4.7];                 // and of its three levels: low (diving), the middle (as normal) and high (a jump)
	const B = { u: [-T.half, -1.3, 1.3, T.half], v: [0, 2.15, 3.85, T.height] };   // the cells' edges across and up (three by three)
	const CHASE = 6;                                // metres the eye follows behind the foxes
	const EYE = 3.9;                                // the eye's height in the tunnel
	const FOV = 64;                                 // vertical, degrees: 90 across each 16:10 wall, so the walls meet
	const EDGE = 0.1;                               // the share of each wall at either end that's past the edge of the tunnel
	const FOX = { scale: 0.88, middle: 0.6, r: 0.5, stagger: 0.4 };   // his size (about 1.2 m tall), the height of his middle in the model, his reach (what touches things), how far behind one another the foxes fly
	const FLY = { rise: 7, dive: 11, hop: 1.0 };    // how quickly he climbs and dives (per second), and how long a jump keeps him up high (seconds)
	const STEER = { glide: 8, max: 16 };            // how quickly a fox follows its player across (per second), and its top speed (metres a second)
	const BODY = { jump: 0.06, duck: 0.11, release: 0.07, adapt: 0.4 };   // py above standing to jump, below to duck (and to stand up again), how fast standing height adapts
	const SPEED = { idle: 8, tutorial: 8.5, start: 10, end: 19 };   // metres a second: behind the show, in the tutorial, at the start of the escape and at its hardest
	const HARD_AT = 360;                            // seconds into the escape at which it's as hard as it gets
	const LEG = { start: 8.5, end: 6.6, wobble: 0.8, min: 60 };   // seconds of flying from one junction to the next (then and at the hardest, give or take), and the fewest metres
	const BUSY = 0.5;                               // the share of each tunnel (from its start) that has machines in it: the rest is for choosing
	const FIRST = 16;                               // metres into a tunnel before its first machine
	const DECIDE = 3.6;                             // seconds before a junction that TAP HERE shows
	const GAP = { start: 24, end: 13, wobble: 2.5 };   // metres between machines (then and at the hardest)
	const UNLOCK = { crates: 0, grid: 0, saw: 0.05, crusher: 0.12, arm: 0.2, jets: 0.3 };   // how hard it has to be (0..1) before each machine turns up
	const KIND = {                                  // the tunnels' kinds: metres between machines (scaled), the chance of a trail of rings before each, the bonus for slipping past one (scaled)
		plain: { gap: 1, rings: 0.5, clear: 1, label: '' },
		rings: { gap: 1.6, rings: 1, clear: 1, label: 'RING TUNNEL' },
		danger: { gap: 0.7, rings: 0.6, clear: 2, label: 'DANGER · DOUBLE BONUS' },
	};
	const CYCLE = { slow: 1, fast: 0.72 };          // the machines' timings, scaled (at the start, at the hardest)
	const FASTER_EVERY = 60;                        // seconds between FASTER!s
	const HURT = { time: 0.8, safe: 1.6, lose: 0.3 };   // a hit: seconds tumbling, seconds safe after, the share of rings dropped
	const CLEAR = 2;                                // rings for slipping past a machine unhurt
	const DEPTH = 0.8;                              // metres either side of a machine along the tunnel that it can touch you
	const GRACE = 0.12;                             // metres of benefit of the doubt on every touch
	const RINGS = { r: 0.4, gap: 2.3 };             // a ring's reach, and metres between rings in a trail
	const TOUCH = 0.06;                             // how close to a wall (0..1 of the room) counts as touching it
	const BEHIND = 90;                              // metres of tunnel kept behind the eye
	const WARN = { title: 0.4, a: 1.6, b: 2.6, c: 3.6, length: 7 };   // the machines' entrance: WATCH OUT!, then its three lines, and the end
	const POD = { from: 16, to: 70, scale: 1.4 };   // Robotnik in the entrance: how far ahead he starts and where he's off to (metres)
	const FONT = 'Paytone One';                     // the game's own words (pops, the distance, the choices)

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });   // (the composer multisamples)
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
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
	scene.background = new THREE.Color(0x07080c);
	scene.fog = new THREE.Fog(0x07080c, 34, 95);
	// (steel's reflections: a dark hall, cold light overhead, the furnaces' orange low down)
	const envTex = environmentFromShader(renderer, `vec3 envColor(vec3 d) {
		return mix(vec3(0.05, 0.04, 0.035), vec3(0.2, 0.26, 0.34), smoothstep(-0.2, 0.8, d.y)) + vec3(0.9, 0.35, 0.08) * 0.4 * exp(-abs(d.y + 0.1) * 6.0);
	}`);
	scene.environment = envTex;
	// Bloom, gently: rings, strip lights, lasers, flames.
	postfx = createWallComposer(renderer, scene, { strength: 0.3, radius: 0.5, threshold: 0.9 });

	scene.add(new THREE.HemisphereLight(0xa8bcd8, 0x4a2a18, 1.1));
	const glowFox = new THREE.PointLight(0xfff0e0, 40, 22, 2);     // (round the foxes)
	const glowAhead = new THREE.PointLight(0xd8e8ff, 60, 30, 2);   // (on what's coming)
	scene.add(glowFox, glowAhead);

	// One eye, a few metres behind the foxes: the three cameras on one rig,
	// never turned, level, with the same fixed field of view (90 degrees
	// across), so they're the sides of one box and the walls meet seamlessly.
	const walls = createWallRig({ fov: FOV, aspect: W / H, near: 0.1, far: 400 });   // left, front, right
	const rig = walls.rig;
	scene.add(rig);
	const cams = walls.cameras;

	const aniso = renderer.capabilities.getMaxAnisotropy();
	const beltTex = beltTexture(aniso);
	const beltMat = new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide });
	beltMat.userData.shared = true;
	beltTex.userData.shared = true;

	/* ---------- helpers ---------- */

	const rand = (a, b) => a + Math.random() * (b - a);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const v3 = () => new THREE.Vector3();
	const pick = (list) => list[Math.floor(Math.random() * list.length)];
	const shuffle = (list) => { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };
	const css = (c) => '#' + new THREE.Color(c).getHexString();

	function dispose(obj) {
		if (obj.parent) obj.parent.remove(obj);
		obj.traverse(function (o) {
			if (o.isInstancedMesh) o.dispose();
			if (!o.isMesh) return;
			if (!o.geometry.userData.shared) o.geometry.dispose();
			const m = o.material;
			if (m.userData.shared) return;
			if (m.map && !m.map.userData.shared) m.map.dispose();
			m.dispose();
		});
	}

	/* ---------- the maze's directions ---------- */

	// The tunnels only run three ways: W (into the left wall), N (the front)
	// and E (the right). Each has a wall, a turn (the camera's yaw, and a
	// tunnel's), and what's to its left and right (never back toward the room).
	const D = { W: { x: -1, z: 0 }, N: { x: 0, z: -1 }, E: { x: 1, z: 0 } };
	const WALL = { W: 0, N: 1, E: 2 };
	const YAW = { W: Math.PI / 2, N: 0, E: -Math.PI / 2 };
	const LEFT = { W: null, N: 'W', E: 'N' };
	const RIGHT = { W: 'N', N: 'E', E: null };
	const RC = T.half;   // (the foxes round a junction's corner on this radius)
	const wallPan = (w) => [-0.8, 0, 0.8][w];

	/* ---------- the route: where the foxes fly ---------- */

	// The way flown, as pieces: straight lines and quarter turns through the
	// junctions. s is metres along it. The last piece is always a straight
	// line running on ahead (until a turn is chosen at the next junction).
	let pieces = [];
	function routeAt(s) {
		let p = pieces[0];
		for (let i = pieces.length - 1; i >= 0; i--) if (s >= pieces[i].s0) { p = pieces[i]; break; }
		const u = s - p.s0, d = D[p.d];
		if (p.line) return { x: p.x + d.x * u, z: p.z + d.z * u, tx: d.x, tz: d.z, rx: -d.z, rz: d.x };
		// a quarter turn from A (p.x, p.z) heading d, round to heading d2
		const d2 = D[p.d2];
		const th = clamp(u / RC, 0, Math.PI / 2), c = Math.cos(th), sn = Math.sin(th);
		const cx = p.x + d2.x * RC, cz = p.z + d2.z * RC;
		const tx = d.x * c + d2.x * sn, tz = d.z * c + d2.z * sn;
		return { x: cx - d2.x * RC * c + d.x * RC * sn, z: cz - d2.z * RC * c + d.z * RC * sn, tx, tz, rx: -tz, rz: tx };
	}
	// The wall a heading flies into.
	const wallOf = (r) => (Math.abs(r.tx) > Math.abs(r.tz) ? (r.tx < 0 ? 0 : 2) : 1);

	/* ---------- the tunnels, and what's in them ---------- */

	let branches = [];   // every tunnel built: { x, z, dir, kind, len, group, cap, built, nextA, sB, junction, chosen, gone }
	let rooms = [];      // the junctions' rooms: { group, sJ }
	let items = [];      // machines: { type, b, a, s, mesh, decor, hit: Set, cleared: Set, age, ph, ... }
	let rings = [];      // { b, a, s, u, v, mesh, taken, spin }
	let junction = null; // the next junction: { x, z, d, sJ, branches, votes: Map, prompting }
	let machinesOn = 'decor';   // decor (behind the show's opening, harmless), off (the tutorial), live
	let lastType = null;

	const cycleScale = () => lerp(CYCLE.slow, CYCLE.fast, heat());
	const sOf = (b, a) => b.sB + (a - RC);   // (route metres of a point a metres down a tunnel taken)
	const legLength = () => Math.max(LEG.min, speedFor() * (lerp(LEG.start, LEG.end, heat()) + rand(-LEG.wobble, LEG.wobble)));

	function Branch(x, z, dir, kind, len) {
		const group = new THREE.Group();
		group.position.set(x, 0, z);
		group.rotation.y = YAW[dir];
		scene.add(group);
		const b = { x, z, dir, kind, len, group, cap: null, built: T.half, nextA: FIRST, sB: null, junction: null, chosen: false, gone: false };
		branches.push(b);
		return b;
	}

	// Build a tunnel on out to aTo metres (and fill it).
	function extend(b, aTo) {
		if (aTo > b.built) {
			b.group.add(buildTunnel(b.built, aTo, b.kind, T, beltMat));
			b.built = aTo;
		}
		fill(b, Math.min(aTo - 2, b.len * BUSY));
	}

	// What's in a tunnel, out to aTo: a machine every so often (or, in the
	// tutorial, just rings), each with a trail of rings before it through a
	// way past it now and then.
	function fill(b, aTo) {
		const k = KIND[b.kind];
		while (b.nextA < aTo) {
			const a = b.nextA;
			let open = null;
			if (machinesOn !== 'off') open = addMachine(b, pickType(), a);
			const way = open ? pick(open) : [Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)];
			if (!open || Math.random() < k.rings) {
				const n = b.kind === 'rings' ? 6 : 4;
				for (let i = 0; i < n; i++) {
					const at = a - 2 - (n - 1 - i) * RINGS.gap;
					if (at > T.half + 3) addRing(b, at, way[0], way[1]);   // (never back in the junction)
				}
				if (open) addRing(b, a, way[0], way[1]);   // (and one right through the gap)
			}
			b.nextA += (open ? lerp(GAP.start, GAP.end, heat()) * k.gap : 12) + rand(-GAP.wobble, GAP.wobble);
		}
	}

	function pickType() {
		const d = heat();
		const open = Object.keys(UNLOCK).filter((t) => machinesOn === 'decor' || d >= UNLOCK[t]);
		const choices = open.length > 1 ? open.filter((t) => t !== lastType) : open;
		return (lastType = pick(choices));
	}

	function addRing(b, a, lane, level) {
		const mesh = buildRing();
		mesh.position.set(LANES[lane], LEVELS[level], -a);
		b.group.add(mesh);
		rings.push({ b, a, s: b.sB === null ? null : sOf(b, a), u: LANES[lane], v: LEVELS[level], mesh, taken: false, spin: Math.random() * TAU });
	}

	const ALL = [];
	for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ALL.push([i, j]);
	const without = (cells) => ALL.filter(([i, j]) => !cells.some(([a, c]) => a === i && c === j));

	// A machine a metres down tunnel b. Returns the cells it leaves open.
	function addMachine(b, type, a) {
		const d = heat(), k = cycleScale();
		const m = { type, b, a, s: b.sB === null ? null : sOf(b, a), decor: machinesOn === 'decor', hit: new Set(), cleared: new Set(), age: 0, ph: Math.random(), on: false, was: false };
		let open;
		if (type === 'grid') {
			const n = d < 0.3 ? 3 : d < 0.65 ? 2 : 1;
			const gaps = shuffle(ALL.slice()).slice(0, n);
			m.blocked = without(gaps);
			m.mesh = buildGrid(m.blocked, B);
			open = gaps;
		} else if (type === 'crates') {
			const lanes = shuffle([0, 1, 2]).slice(0, Math.random() < 0.5 ? 1 : 2);
			m.blocked = lanes.map((l) => [l, 0]);
			if (Math.random() < 0.4) m.blocked.push([lanes[0], 1]);
			m.mesh = buildCrates(m.blocked, B);
			open = without(m.blocked);
		} else if (type === 'saw') {
			m.lanes = shuffle([0, 1, 2]).slice(0, d > 0.5 && Math.random() < 0.5 ? 2 : 1);
			m.slide = m.lanes.length === 1 && d > 0.4 && Math.random() < 0.5;
			m.mesh = new THREE.Group();
			m.saws = m.lanes.map(function (l) {
				const saw = buildSaw();
				saw.userData.disc.position.x = LANES[l];
				m.mesh.add(saw);
				return saw.userData;
			});
			open = m.slide ? ALL.filter(([, j]) => j === 2) : without(m.lanes.flatMap((l) => [[l, 0], [l, 1]]));
		} else if (type === 'crusher') {
			m.lanes = shuffle([0, 1, 2]).slice(0, d > 0.4 && Math.random() < 0.5 ? 2 : 1);
			m.mesh = buildCrusher(m.lanes, B);
			m.period = 1.8 * k;
			open = ALL.filter(([i]) => !m.lanes.includes(i));
		} else if (type === 'arm') {
			m.mesh = buildArm(B);
			m.period = 2.4 * k;
			m.amp = lerp(0.85, 1.05, d);
			m.ph = Math.random() * TAU;
			open = ALL.filter(([, j]) => j === 0);
		} else {
			m.type = 'jets';
			m.levels = shuffle([0, 1, 2]).slice(0, d > 0.5 && Math.random() < 0.5 ? 2 : 1);
			m.mesh = buildJets(m.levels, B);
			m.period = 2.6 * k;
			open = ALL.filter(([, j]) => !m.levels.includes(j));
		}
		m.mesh.position.z = -a;
		b.group.add(m.mesh);
		items.push(m);
		return open;
	}

	// The cells' boxes: [u0, u1, v0, v1].
	const cellBox = ([lane, level]) => ({ box: [B.u[lane], B.u[lane + 1], B.v[level], B.v[level + 1]] });

	// What can hurt a fox in a machine, this frame, as shapes across the
	// tunnel (u, v): { box: [u0, u1, v0, v1] } or { circle: [u, v, r] } or
	// { stick: [u0, v0, u1, v1, r] }.
	function dangers(m) {
		const u = m.mesh.userData;
		if (m.type === 'grid' || m.type === 'crates') return m.blocked.map(cellBox);
		if (m.type === 'saw') return m.saws.map((sw) => ({ circle: [sw.disc.position.x, sw.centre, sw.radius] }));
		if (m.type === 'crusher') return u.rams.map((r) => ({ box: [B.u[r.lane], B.u[r.lane + 1], r.ram.position.y, T.height] }));
		if (m.type === 'arm') {
			const a = u.swing.rotation.z;
			const cu = Math.sin(a) * u.reach, cv = u.pivot - Math.cos(a) * u.reach;
			return [{ stick: [0, u.pivot, cu, cv, 0.3] }, { circle: [cu, cv, 0.6] }];
		}
		return u.rows.filter((r) => r.flame.scale.x > 0.5).map((r) => ({ box: [-T.half, T.half, B.v[r.level], B.v[r.level + 1]] }));
	}

	function touches(shape, u, v, r) {
		r -= GRACE;
		if (shape.box) {
			const [u0, u1, v0, v1] = shape.box;
			const du = Math.max(u0 - u, 0, u - u1), dv = Math.max(v0 - v, 0, v - v1);
			return du * du + dv * dv < r * r;
		}
		if (shape.circle) {
			const [cu, cv, cr] = shape.circle;
			return (cu - u) ** 2 + (cv - v) ** 2 < (cr + r) ** 2;
		}
		const [u0, v0, u1, v1, sr] = shape.stick;
		const du = u1 - u0, dv = v1 - v0;
		const q = clamp(((u - u0) * du + (v - v0) * dv) / (du * du + dv * dv || 1), 0, 1);
		return (u0 + du * q - u) ** 2 + (v0 + dv * q - v) ** 2 < (sr + r) ** 2;
	}

	// The machines working, every frame.
	function work(m, dt, loud) {
		const u = m.mesh.userData;
		const cyc = m.period ? ((m.age / m.period + m.ph) % 1) : 0;
		const p = wallPan(wallNow);
		if (m.type === 'grid') {
			u.glow.opacity = 0.3 + Math.sin(m.age * 9 + m.ph * TAU) * 0.08;
		} else if (m.type === 'saw') {
			for (const sw of m.saws) {
				sw.disc.rotation.z += dt * 14;
				if (m.slide) sw.disc.position.x = LANES[2] * Math.sin(m.age * 1.4 + m.ph * TAU);
			}
		} else if (m.type === 'crusher') {
			// up, the lamp flashing, a slam, held down, back up
			let bottom = u.top;
			if (cyc >= 0.62 && cyc < 0.68) bottom = u.top * (1 - Math.pow((cyc - 0.62) / 0.06, 2));
			else if (cyc >= 0.68 && cyc < 0.8) bottom = 0;
			else if (cyc >= 0.8) bottom = u.top * (1 - Math.cos((cyc - 0.8) / 0.2 * Math.PI)) / 2;
			const warn = cyc >= 0.42 && cyc < 0.68;
			for (const r of u.rams) {
				r.ram.position.y = bottom;
				const len = Math.max(0.05, T.height - 0.4 - bottom - 0.85);
				r.piston.scale.y = len;
				r.piston.position.y = bottom + 0.85 + len / 2;
				r.lamp.color.setRGB(...(warn ? (Math.floor(m.age * 10) % 2 ? [4, 0.4, 0.1] : [0.4, 0.04, 0.02]) : [0.6, 0.08, 0.03]));
			}
			m.on = bottom < 0.3;
			if (m.on && !m.was && loud) sound.slam(p, 0.5);
		} else if (m.type === 'arm') {
			u.swing.rotation.z = m.amp * Math.sin(m.age * TAU / m.period + m.ph);
			u.eye.color.setRGB(3 + Math.sin(m.age * 8) * 1.5, 0.3, 0.2);
		} else if (m.type === 'jets') {
			// off, the rings heating, then roaring right across
			const warm = clamp((cyc - 0.4) / 0.2, 0, 1);
			const on = cyc >= 0.6;
			for (const r of u.rows) {
				r.rings.color.setRGB(0.25 + warm * 3.5, 0.06 + warm * 1.1, 0.03 + warm * 0.1);
				const target = on ? 1 : 0.001;
				r.flame.scale.x += (target - r.flame.scale.x) * Math.min(1, dt * (on ? 14 : 10));
				const flick = 0.85 + Math.random() * 0.3;
				r.flame.scale.y = r.flame.scale.z = flick;
				r.flame.visible = r.flame.scale.x > 0.02;
			}
			m.on = on;
			if (on && !m.was && loud) sound.whoosh(p, 0.5);
		}
		m.was = m.on;
	}

	/* ---------- junctions ---------- */

	// A junction at (x, z), coming in heading d, sJ metres along the route:
	// two or three ways on, each a short stub of tunnel (dark at its end)
	// until it's chosen, each in its own colour.
	function newJunction(x, z, d, sJ) {
		const ways = [d, LEFT[d], RIGHT[d]].filter(Boolean);
		if (ways.length === 3 && Math.random() < 0.45) ways.splice(Math.floor(Math.random() * 3), 1);
		const kinds = shuffle(['plain', 'rings', 'danger']);
		const open = { ahead: ways.includes(d), left: ways.includes(LEFT[d]), right: ways.includes(RIGHT[d]) };
		const room = buildJunction(open, T);
		room.position.set(x, 0, z);
		room.rotation.y = YAW[d];
		scene.add(room);
		rooms.push({ group: room, sJ });
		const j = { x, z, d, sJ, branches: [], votes: new Map(), prompting: false };
		j.branches = ways.map(function (dir, i) {
			const b = Branch(x, z, dir, kinds[i], legLength());
			b.junction = j;
			extend(b, T.half + T.stub);
			b.cap = buildCap(T.half + T.stub, T);
			b.group.add(b.cap);
			return b;
		});
		return j;
	}

	// The way on is chosen: the route turns (or carries straight on) into
	// it, its tunnel is built out to the next junction, and that's built.
	function commit(j, dir) {
		const b = j.branches.find((b) => b.dir === dir);
		if (dir !== j.d) {
			const d = D[j.d], d2 = D[dir];
			const s0 = j.sJ - RC;
			pieces.push({ arc: true, x: j.x - d.x * RC, z: j.z - d.z * RC, d: j.d, d2: dir, s0 });
			b.sB = s0 + RC * Math.PI / 2;
			pieces.push({ line: true, x: j.x + d2.x * RC, z: j.z + d2.z * RC, d: dir, s0: b.sB });
		} else b.sB = j.sJ + RC;
		b.chosen = true;
		for (const m of items) if (m.b === b) m.s = sOf(b, m.a);
		for (const r of rings) if (r.b === b) r.s = sOf(b, r.a);
		dispose(b.cap);
		b.cap = null;
		extend(b, b.len - T.half);
		const d2 = D[dir];
		junction = newJunction(j.x + d2.x * b.len, j.z + d2.z * b.len, dir, sOf(b, b.len));
	}

	// The most taps win (a tie: whichever was tapped first); no taps: ahead,
	// if it's open (behind the show's opening: anywhere).
	function decide(j) {
		const tally = new Map();
		for (const v of j.votes.values()) {
			const t = tally.get(v.dir) || { n: 0, first: Infinity };
			t.n++;
			t.first = Math.min(t.first, v.t);
			tally.set(v.dir, t);
		}
		let best = null;
		for (const [dir, t] of tally) if (!best || t.n > best.n || (t.n === best.n && t.first < best.first)) best = Object.assign({ dir }, t);
		const ahead = j.branches.some((b) => b.dir === j.d);
		const dir = best ? best.dir : phase === 'run' && ahead ? j.d : pick(j.branches).dir;
		const from = wallNow;
		commit(j, dir);
		if (phase === 'run') {
			turned = { from, to: WALL[dir], age: 0, straight: dir === j.d };
			sound.turn(wallPan(WALL[dir]));
		}
	}

	// A tap on a wall: a vote for the way into it, while a choice is showing
	// (the same again changes nothing).
	function tap(f, w) {
		const j = junction;
		if (!j || !j.prompting) return;
		const b = j.branches.find((b) => WALL[b.dir] === w);
		if (!b) return;
		const was = j.votes.get(f.n);
		if (was && was.dir === b.dir) return;
		j.votes.set(f.n, { dir: b.dir, t: clock });
		f.voted = true;
		sound.vote(wallPan(w));
	}

	// Clear away what's well behind the eye.
	function tidy() {
		const gone = (b) => (b.chosen ? sOf(b, b.len) : b.junction ? b.junction.sJ : 0) + BEHIND < eyeS;
		for (const b of branches) if (gone(b)) { b.gone = true; dispose(b.group); }
		branches = branches.filter((b) => !b.gone);
		items = items.filter((m) => !m.b.gone);
		rings = rings.filter((r) => !r.b.gone && !r.taken);
		for (const r of rooms.filter((r) => r.sJ + BEHIND < eyeS)) dispose(r.group);
		rooms = rooms.filter((r) => r.sJ + BEHIND >= eyeS);
	}

	// The maze from the start: a straight tunnel north from the middle of the
	// room, to the first junction.
	function startMaze() {
		for (const b of branches) dispose(b.group);
		for (const r of rooms) dispose(r.group);
		branches = []; rooms = []; items = []; rings = [];
		pieces = [{ line: true, x: 0, z: 0, d: 'N', s0: 0 }];
		const b = Branch(0, 0, 'N', 'plain', legLength());
		b.built = -20;
		b.sB = RC;   // (so a point a metres up it is a metres along the route)
		b.chosen = true;
		extend(b, b.len - T.half);
		junction = newJunction(0, -b.len, 'N', b.len);
	}

	/* ---------- foxes ---------- */

	let foxes = [];

	function Fox(n) {
		const colour = PLAYER_COLORS[n];
		const model = buildFlyer(colour, FOX.middle);
		model.root.scale.setScalar(FOX.scale);
		scene.add(model.root);
		const blob = buildBlob();
		scene.add(blob);
		return {
			n, colour, model, blob,
			along: [0.5, 0.5, 0.5], px: 0.5, pz: 0.5, seen: false, near: -1,
			s: 0, sWas: 0, u: 0, vu: 0, v: LEVELS[1], level: 'mid', hop: 0,
			state: 'fly',            // fly, or hurt (tumbling)
			t: 0, safe: 0,
			rings: 0, hits: 0, cleared: 0,
			body: { stand: null, up: false, duck: false },
			reach: { min: 0.5, max: 0.5 },
			hopped: false, ducked: false, voted: false,
		};
	}

	function setUp(count) {
		sound.resume();
		for (const f of foxes) { scene.remove(f.model.root); dispose(f.blob); }
		foxes = [];
		for (let i = 0; i < count; i++) {
			const f = Fox(i);
			f.u = LANES[0] + (LANES[2] - LANES[0]) * (count > 1 ? i / (count - 1) : 0.5);
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
		for (let i = 0; i < Math.min(n, 12); i++) {
			const mesh = buildRing();
			mesh.position.copy(at);
			const a = i / Math.min(n, 12) * TAU;
			scene.add(mesh);
			flung.push({ mesh, vel: v3().set(Math.cos(a) * 5, 4 + Math.sin(a) * 3, Math.sin(a) * 5), age: 0 });
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
			'Spark Plugs', 'Saw Dodgers', 'Maze Runners', 'Tunnel Crew'],
	});

	let phase = 'idle';      // idle (behind the show's opening), run (the tutorial on), finish (TIME! and after)
	let clock = 0;
	let playT = 0;           // seconds into the escape proper
	let escaped = 0;         // metres flown (the escape proper)
	let speed = SPEED.idle;
	let sT = 0;              // metres along the route of the lead fox
	let eyeS = -CHASE;       // and of the eye
	let wallNow = 1;         // the wall the foxes are flying into
	let turned = null;       // { from, to, age, straight }: the way just taken, over the walls
	let fasterShow = null;   // { age }: FASTER!, over the walls
	let nextFaster = FASTER_EVERY;
	let podOn = null;        // { age }: Robotnik ahead, in the entrance
	const taps = [];         // [{ f, wall }], since the last frame
	const heat = () => (show.beat === 'play' || show.beat === 'timeup' ? clamp(playT / HARD_AT, 0, 1) : 0);
	const speedFor = () => (phase === 'idle' ? SPEED.idle : show.beat === 'controls' ? SPEED.tutorial : machinesOn === 'live' ? lerp(SPEED.start, SPEED.end, heat()) : SPEED.tutorial);

	const pod = buildEggPod();
	pod.scale.setScalar(POD.scale);
	pod.visible = false;
	scene.add(pod);

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
		{ caption: 'STEP LEFT AND RIGHT TO FLY ACROSS', min: 2, max: 10, did: () => everyone((f) => f.reach.max - f.reach.min >= 0.3) },
		{ caption: 'JUMP TO FLY UP HIGH', min: 2, max: 10, did: () => everyone((f) => f.hopped) },
		{ caption: 'SQUAT TO DIVE DOWN LOW', min: 2, max: 10, did: () => everyone((f) => f.ducked) },
		{ caption: 'TAP A WALL TO PICK A TUNNEL', min: 2, max: 24, did: () => everyone((f) => f.voted) },
	];

	/* ---------- the beats ---------- */

	const SCENE = ['squad', 'title', 'clock', 'visors', 'controls', 'warn', 'play', 'timeup'];   // the beats the maze shows behind

	show.sequence([
		{ id: 'squad', length: Infinity },
		show.beats.titleDrop(),
		show.beats.clockIntro(),
		show.beats.visors(),
		// the tutorial: the machines cleared out of the tunnels ahead, rings instead
		show.beats.tutorial({
			steps: TUTORIAL,
			enterStep(i) {
				for (const f of foxes) {
					f.reach = { min: f.along[wallNow], max: f.along[wallNow] };
					if (i === 1) f.hopped = false;
					if (i === 2) f.ducked = false;
					if (i === 3) f.voted = false;
				}
			},
			enter() {
				run();
				machinesOn = 'off';
				for (const m of items.filter((m) => m.decor)) dispose(m.mesh);
				items = items.filter((m) => !m.decor);
				sound.go();
			},
		}),
		// the machines' entrance: WATCH OUT!, Robotnik ahead in his pod, laughing,
		// then away (the machines are in the tunnels from now on)
		{
			id: 'warn',
			length: WARN.length,
			enter() {
				run();
				machinesOn = 'live';
				podOn = { age: 0 };
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
					if (bt > WARN.a) show.text(c, "ROBOTNIK'S MACHINES ARE IN THE TUNNELS", W / 2, 360, 50, { fill: 'white', alpha: Math.min(1, (bt - WARN.a) * 3) });
					if (bt > WARN.b) show.text(c, 'FLY THROUGH THE GAPS · JUMP HIGH, SQUAT LOW', W / 2, 440, 50, { fill: 'white', alpha: Math.min(1, (bt - WARN.b) * 3) });
					if (bt > WARN.c) show.text(c, 'GOLD TUNNELS FOR RINGS · RED FOR DANGER AND DOUBLE BONUS', W / 2, 520, 46, { fill: '#ffd23f', alpha: Math.min(1, (bt - WARN.c) * 3) });
				});
			},
			exit() { podOn = null; pod.visible = false; },
		},
		// the escape, until the clock's out
		{
			id: 'play',
			length: Infinity,
			enter() {
				run();
				machinesOn = 'live';
				podOn = null;
				pod.visible = false;
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

	function simulate(dt) {
		clock += dt;
		const playing = show.beat === 'play';
		const touchy = phase === 'run';

		// on along the maze
		speed += (speedFor() - speed) * Math.min(1, dt * 1.5);
		const step = speed * dt;
		sT += step;
		beltTex.offset.x = (beltTex.offset.x + step * 0.6 / T.tile) % 1;   // (the belts run at you, a little slower than you fly)
		if (playing) {
			escaped += step;
			if (playT >= nextFaster) {
				nextFaster += FASTER_EVERY;
				fasterShow = { age: 0 };
				sound.faster();
			}
		}
		if (fasterShow && (fasterShow.age += dt) > 2.4) fasterShow = null;
		if (turned && (turned.age += dt) > 2.6) turned = null;

		// the junction ahead: TAP HERE, the taps, and the choice
		const j = junction;
		const toJ = j.sJ - RC - sT;
		const prompting = phase === 'run' && toJ < speed * DECIDE;
		if (prompting && !j.prompting) sound.prompt();
		j.prompting = prompting;
		for (const t of taps.splice(0)) tap(t.f, t.wall);
		for (const f of foxes) if (f.near >= 0) tap(f, f.near);   // (standing right up against a wall counts as touching it)
		if (toJ <= 0.3) decide(j);

		const lead = routeAt(sT);
		wallNow = wallOf(lead);

		// the machines and the rings
		for (const m of items) {
			m.age += dt;
			work(m, dt, m.s !== null && Math.abs(m.s - sT) < 40 && phase !== 'finish');
		}
		for (const r of rings) {
			r.spin += dt * 3;
			r.mesh.userData.spin.rotation.y = r.spin;
		}

		for (const f of foxes) stepFox(f, dt, playing, touchy);

		// Robotnik, ahead in the entrance, then away down the tunnel
		if (podOn) {
			podOn.age += dt;
			const ps = Math.min(sT + lerp(POD.from, POD.to, clamp((podOn.age - 3) / 3.5, 0, 1) ** 2), junction.sJ - 1.5);
			const r = routeAt(ps);
			pod.visible = true;
			pod.position.set(r.x, 3.2 + Math.sin(clock * 1.7) * 0.25, r.z);
			pod.rotation.y = Math.atan2(r.tx, r.tz) + Math.PI;   // (facing the foxes)
			pod.rotation.z = Math.sin(clock * 1.3) * 0.06;
			pod.userData.robotnik.animate(dt, 'idle', 0, 0, clock);
			pod.userData.jetMesh.scale.y = 0.85 + Math.random() * 0.3;
		}

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
			f.vel.y -= 14 * dt;
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

		// the eye, behind the foxes, and the lights with them
		eyeS = sT - CHASE;
		const e = routeAt(eyeS);
		rig.position.set(e.x, EYE, e.z);
		if (shake > 0.01) rig.position.add(v3().set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
		glowFox.position.set(lead.x, LEVELS[1] + 1, lead.z);
		const ahead = routeAt(sT + 12);
		glowAhead.position.set(ahead.x, T.height - 1.2, ahead.z);
		tidy();

		sound.rotor(phase === 'run' && foxes.length ? 1 : 0);
		sound.tick();
	}

	function stepFox(f, dt, counts, touchy) {
		f.t += dt;
		f.safe = Math.max(0, f.safe - dt);
		f.hop = Math.max(0, f.hop - dt);
		f.sWas = f.s;
		f.s = sT - f.n * FOX.stagger;

		// the body: high or low
		const b = f.body;
		const wasLevel = f.level;
		if (f.state === 'hurt') f.level = 'mid';
		else if (b.duck) f.level = 'low';
		else if (b.up || f.hop > 0) f.level = 'high';
		else f.level = 'mid';
		if (touchy && f.level !== wasLevel && f.state === 'fly') {
			if (f.level === 'high') { f.hopped = true; sound.hop(wallPan(wallNow)); }
			if (f.level === 'low') { f.ducked = true; sound.dive(wallPan(wallNow)); }
		}
		const aim = LEVELS[f.level === 'low' ? 0 : f.level === 'high' ? 2 : 1];
		f.v += (aim - f.v) * Math.min(1, dt * (aim < f.v ? FLY.dive : FLY.rise));

		// across the tunnel, after their player along Tails' wall
		const target = LANES[0] + clamp((f.along[wallNow] - EDGE) / (1 - 2 * EDGE), 0, 1) * (LANES[2] - LANES[0]);
		const uWas = f.u;
		if (f.seen) f.u += clamp((target - f.u) * Math.min(1, dt * STEER.glide), -STEER.max * dt, STEER.max * dt);
		f.vu = dt > 0 ? (f.u - uWas) / dt : 0;
		if (f.state === 'hurt' && f.t >= HURT.time) { f.state = 'fly'; f.t = 0; f.safe = HURT.safe; }

		if (touchy && f.state === 'fly') touch(f, counts);

		// in the tunnel
		const r = routeAt(f.s);
		const m = f.model;
		const x = r.x + r.rx * f.u, z = r.z + r.rz * f.u;
		m.root.position.set(x, f.v, z);
		m.root.rotation.y = Math.atan2(r.tx, r.tz);
		m.pose(dt, {
			mode: f.level,
			rising: clamp((aim - f.v) / 1.7, 0, 1),
			hurt: f.state === 'hurt',
			lean: clamp(f.vu * 0.04, -0.45, 0.45),
			turn: -clamp(f.vu * 0.03, -0.35, 0.35),
		});
		m.root.visible = !(f.safe > 0 && Math.floor(clock * 14) % 2);
		f.blob.position.set(x, 0.03, z);
		f.blob.scale.setScalar(1.2 - f.v * 0.1);
		f.blob.material.opacity = 1.1 - f.v * 0.15;
	}

	// Touching rings and machines.
	function touch(f, counts) {
		for (const r of rings) {
			if (r.taken || r.s === null || Math.abs(r.s - f.s) > 0.8) continue;
			if ((r.u - f.u) ** 2 + (r.v - f.v) ** 2 > (RINGS.r + FOX.r) ** 2) continue;
			r.taken = true;
			f.rings++;
			sparkle(r.mesh.getWorldPosition(v3()), 0xfff2a0);
			r.mesh.visible = false;
			sound.ring(wallPan(wallNow));
		}
		for (const m of items) {
			if (m.decor || m.s === null) continue;
			if (f.safe <= 0 && !m.hit.has(f.n) && Math.abs(m.s - f.s) < DEPTH && dangers(m).some((d) => touches(d, f.u, f.v, FOX.r))) {
				m.hit.add(f.n);
				hurt(f, counts);
				return;
			}
			// slipped past it, unhurt
			if (m.s - f.sWas > 0 && m.s - f.s <= 0 && !m.hit.has(f.n) && !m.cleared.has(f.n)) {
				m.cleared.add(f.n);
				if (!counts) continue;
				const bonus = CLEAR * KIND[m.b.kind].clear;
				f.rings += bonus;
				f.cleared++;
				sound.clear(wallPan(wallNow));
				pop('+' + bonus, '#ffe14a', foxAt(f), 56);
			}
		}
	}

	// Hit: rings fly, and Tails tumbles.
	function hurt(f, counts) {
		const lose = counts ? Math.ceil(f.rings * HURT.lose) : 0;
		f.rings -= lose;
		f.hits++;
		fling(f, lose);
		f.state = 'hurt';
		f.t = 0;
		f.hop = 0;
		sound.hit(wallPan(wallNow));
		shake = Math.max(shake, 0.3);
		flashRed = Math.max(flashRed, 0.4);
		pop(lose ? '−' + lose : 'OUCH!', '#ff3d4a', foxAt(f), 84);
		sparkle(foxAt(f), 0xffffff, 3);
	}

	function render() {
		// (all three walls into one HDR frame, then bloom and tone mapping)
		postfx.render(walls.views(renderer.domElement.width, renderer.domElement.height));
	}

	/* ---------- the 2D layer: the choices, words, the distance ---------- */

	function onWall(v, wall) {
		const p = toScreen(v, cams[wall], wall * W, 0, W, H);
		if (!p || Math.abs(p.ndc.x) > 1 || Math.abs(p.ndc.y) > 1.3) return null;
		return p;
	}
	function onAnyWall(v) {
		for (const w of [wallNow, 0, 1, 2]) {
			const p = onWall(v, w);
			if (p) return p;
		}
		return null;
	}

	// A big arrow, pointing up (into the wall), or turned (radians).
	function arrow(ctx, x, y, size, fill, alpha, turn = 0) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(turn);
		ctx.globalAlpha = alpha;
		ctx.beginPath();
		const s = size / 2;
		ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(s * 0.42, 0); ctx.lineTo(s * 0.42, s);
		ctx.lineTo(-s * 0.42, s); ctx.lineTo(-s * 0.42, 0); ctx.lineTo(-s, 0); ctx.closePath();
		ctx.fillStyle = fill;
		ctx.shadowColor = fill;
		ctx.shadowBlur = 30;
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.lineWidth = 8;
		ctx.strokeStyle = '#15161c';
		ctx.stroke();
		ctx.restore();
	}

	const WALL_NAMES = ['THE LEFT WALL', 'THE FRONT WALL', 'THE RIGHT WALL'];

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
			const at = onAnyWall(v3().copy(p.at).add(v3().set(0, 1.1, 0)));
			if (!at) continue;
			const q = p.age / 1.1;
			art.text(ctx, p.text, at.x, at.y - q * 90, { size: p.size * (q < 0.15 ? q / 0.15 : 1), font: FONT, fill: p.colour, outline: '#15161c', outlineWidth: 7, alpha: 1 - Math.max(0, q - 0.6) / 0.4 });
		}

		if (!['controls', 'warn', 'play', 'timeup'].includes(show.beat)) return;

		// the junction coming up: TAP HERE on every way on, its taps under it
		const j = junction;
		if (j && j.prompting) {
			const left = clamp((j.sJ - RC - sT) / (speed * DECIDE), 0, 1);
			const pulse = 0.75 + Math.sin(clock * 10) * 0.25;
			for (const b of j.branches) {
				const w = WALL[b.dir], cx = w * W + W / 2;
				const colour = css(KIND_COLOURS[b.kind]);
				const votes = [...j.votes.entries()].filter(([, v]) => v.dir === b.dir).map(([n]) => n);
				// (big, in the middle of a side wall; smaller, low down, on Tails' own wall, so he's not hidden)
				const L = w === wallNow ? { arrow: [0.7, 110], text: [0.81, 56], label: 0.86, votes: 0.91, bar: 0.95 } : { arrow: [0.48, 170], text: [0.66, 72], label: 0.73, votes: 0.81, bar: 0.87 };
				arrow(ctx, cx, H * L.arrow[0], L.arrow[1], colour, pulse);
				art.text(ctx, b.dir === j.d ? 'TAP HERE: AHEAD' : 'TAP HERE: TURN', cx, H * L.text[0], { size: L.text[1], font: FONT, fill: '#ffffff', outline: '#15161c', outlineWidth: 9 });
				if (KIND[b.kind].label) art.text(ctx, KIND[b.kind].label, cx, H * L.label, { size: 38, font: FONT, fill: colour, outline: '#15161c', outlineWidth: 6 });
				votes.forEach((n, k) => art.circle(ctx, cx + (k - (votes.length - 1) / 2) * 64, H * L.votes, 22, { fill: PLAYER_COLORS[n], stroke: '#15161c', lineWidth: 5 }));
				ctx.fillStyle = 'rgba(255,255,255,0.85)';
				ctx.fillRect(cx - W * 0.2 * left, H * L.bar, W * 0.4 * left, 12);
			}
		}

		// the way just taken: THIS WAY! on its wall, and a pointer from the old wall to it
		if (turned) {
			const a = 1 - clamp((turned.age - 2.1) / 0.5, 0, 1);
			const cx = turned.to * W + W / 2;
			ctx.save();
			ctx.beginPath();
			ctx.rect(turned.to * W, 0, W, H);
			ctx.clip();
			show.slam(ctx, turned.straight ? 'AHEAD!' : 'THIS WAY!', cx, 430, 120, turned.age, { fill: '#3cdc7a', alpha: a });
			ctx.restore();
			if (turned.from !== turned.to) {
				const fx = turned.from * W + W / 2, dir = turned.to > turned.from ? 1 : -1;
				arrow(ctx, fx + dir * Math.sin(clock * 8) * 30, H * 0.45, 220, '#3cdc7a', a, dir * Math.PI / 2);
				art.text(ctx, 'TURN TO ' + WALL_NAMES[turned.to], fx, H * 0.66, { size: 64, font: FONT, fill: '#ffffff', outline: '#15161c', outlineWidth: 8, alpha: a });
			}
		}

		if (!['play', 'timeup'].includes(show.beat)) return;

		// the distance, top right of Tails' wall
		art.text(ctx, Math.floor(escaped) + ' M', (wallNow + 1) * W - 70, 84, { size: 76, font: FONT, fill: '#ffffff', outline: '#15161c', outlineWidth: 8, align: 'right' });
		art.text(ctx, 'ESCAPED', (wallNow + 1) * W - 70, 128, { size: 30, font: FONT, fill: '#ffd23f', outline: '#15161c', outlineWidth: 5, align: 'right' });

		if (fasterShow) {
			const a = 1 - clamp((fasterShow.age - 1.9) / 0.5, 0, 1);
			show.onWalls(ctx, (c) => show.slam(c, 'FASTER!', W / 2, 330, 110, fasterShow.age, { fill: '#ff9a2b', alpha: a }));
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
			const q = p[i];
			if (!q || q.px === undefined) return;
			f.seen = true;
			f.px = clamp(q.px, 0, 1);
			if (q.pz !== undefined) f.pz = clamp(q.pz, 0, 1);   // (1 at the front wall, 0 at the back)
			// along each wall, left to right as you face it
			f.along = [f.pz, f.px, 1 - f.pz];
			f.reach.min = Math.min(f.reach.min, f.along[wallNow]);
			f.reach.max = Math.max(f.reach.max, f.along[wallNow]);
			if (q.py !== undefined && !keys.any) readBody(f, q.py, dt);
			// a tap: a touch (wallChange), or coming right up to a wall
			if (q.wallChange !== undefined && q.wallChange !== null) {
				if (q.wallChange >= 0 && q.wallChange <= 2) taps.push({ f, wall: q.wallChange });
				q.wallChange = undefined;
			}
			const dist = [f.px, 1 - f.pz, 1 - f.px];
			let near = -1;
			for (let w = 0; w < 3; w++) if (dist[w] < TOUCH && (near < 0 || dist[w] < dist[near])) near = w;
			f.near = near;
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
			phase, machinesOn, speed, escaped, heat: heat(), sT, wall: wallNow,
			junction: junction && { sJ: junction.sJ, ways: junction.branches.map((b) => b.dir + ':' + b.kind), prompting: junction.prompting, votes: [...junction.votes.values()].map((v) => v.dir) },
			foxes: foxes.map((f) => ({ n: f.n, u: f.u, v: f.v, level: f.level, state: f.state, rings: f.rings, hits: f.hits, cleared: f.cleared })),
			machines: items.filter((m) => m.s !== null && m.s > sT).map((m) => ({ type: m.type, ahead: m.s - sT })),
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
		tap(n, wall) { if (foxes[n]) taps.push({ f: foxes[n], wall }); },
	};

	self.fini = function () {
		document.removeEventListener('keydown', onKey);
		document.removeEventListener('keyup', onKey);
		sound.close();
		unlisten();
		show.fini();
		envTex.dispose();
		beltTex.dispose();
		sparkTex.dispose();
		postfx.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	startMaze();   // (flying on behind the squad picker, machines and all)
	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
