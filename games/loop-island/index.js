/*
 * Loop Island
 *
 * Barrel along a twisting ribbon of road high over a tropical sea at
 * hundreds of kilometres an hour: through loop-the-loops, corkscrews,
 * banked turns and helixes, past islands of sand and palms. Everyone runs
 * together as a pack of glossy, spiky little speedsters, one in each
 * player's colour, across a wide road. Step left or right in the room and
 * your runner glides across the road to match. Grab the gold rings; dodge the spiked
 * barriers and mines (a spill throws half your rings away); hit a boost pad
 * to curl up into a ball and smash through anything. 90 seconds; the most
 * rings wins.
 *
 * The three walls are one view from just behind the pack: the front wall
 * looks down the road, the side walls look out to sea either side.
 *
 * Input: px (left to right across the room: left to right across the road).
 * The squad picker and the scores and rankings are Showtime's.
 * An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createTrack, sweep, STEP, HALF, LANES } from './track.js';
import { createSky, SUN, HORIZON } from './sky.js';
import { buildRunner, buildRing, buildBarrier, buildMine, buildPad, buildIsland, roadTexture, checkTexture, boostTexture, sparkleTexture, glossy, chrome } from './models.js';
import { createSound } from './sound.js';

IGB.register('loop-island', function LoopIslandGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;
	const TAU = Math.PI * 2;

	/* ---------- tuning ---------- */

	const DURATION = 90;                                 // seconds of running
	const SPEED = { start: 40, top: 68, ramp: 55 };      // metres a second: at the off, flat out, and seconds to get there
	const SURGE = { boost: 22, decay: 0.7 };             // a boost pad's extra speed, and how fast it fades
	const CAM = { back: 9.5, up: 2.9, pitch: 7, look: 16, follow: 0.35, kick: 3 };   // metres behind and above the pack, degrees down, metres it looks ahead, how far it follows the pack across, metres it drops back on a boost
	const FOV = 64;                                      // vertical, degrees: 90 across each 16:10 wall, so the walls meet
	const READY = 4.2;                                   // seconds of the swoop and countdown
	const START_S = 40;                                  // where the pack starts
	const CHUNK = 120;                                   // metres of track built at a time
	const AHEAD = 1000;                                  // metres built ahead of the eye
	const BEHIND = 450;                                  // and kept behind it
	const HIT = { tumble: 0.9, safe: 2.2 };              // seconds tumbling after a spill, and seconds safe after
	const BOOST = 1.6;                                   // seconds curled up in a ball
	const REACH = { ring: 1.3, hazard: 1.35 };           // metres across that count as touching
	const SLOT = 2.4;                                    // metres apart, one behind another, for runners side by side
	const SPAN = HALF - 0.7;                             // how far either side of the middle a runner can go
	const GLIDE = 9;                                     // how quickly a runner follows its player across (per second)

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.shadowMap.autoUpdate = false;
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

	let k = 1;
	function resize() {
		k = Math.min(IGB.scale * IGB.pixelRatio, 1);
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
	scene.fog = new THREE.Fog(HORIZON, 260, 2000);
	const world = createSky(renderer, scene);
	world.ocean.renderOrder = -5;
	world.ocean.material.depthWrite = false;

	scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x2a7a8a, 0.7));
	const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 160 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.03;
	scene.add(sun, sun.target);

	// One eye riding behind the pack: the front camera down the road, the
	// side cameras square to it, out to sea. All three share one tilt and one
	// field of view (90 degrees across), so they're the sides of one box and
	// the walls meet seamlessly.
	const rig = new THREE.Group();
	scene.add(rig);
	const PITCH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -CAM.pitch * Math.PI / 180);
	const frontCam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 6000);
	rig.add(frontCam);
	const sideCams = [Math.PI / 2, -Math.PI / 2].map(function (yaw) {
		const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 6000);
		cam.rotation.y = yaw;
		rig.add(cam);
		return cam;
	});
	const cams = [sideCams[0], frontCam, sideCams[1]];

	/* ---------- the track ---------- */

	const track = createTrack();
	const aniso = renderer.capabilities.getMaxAnisotropy();
	const MAT = {
		road: new THREE.MeshPhysicalMaterial({ map: roadTexture(aniso), roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }),
		check: new THREE.MeshStandardMaterial({ map: checkTexture(aniso), roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }),
		glow: new THREE.MeshBasicMaterial({ color: 0x7ff8ff, toneMapped: false, side: THREE.DoubleSide }),
		glass: new THREE.MeshPhysicalMaterial({ color: 0xc8f2ff, transparent: true, opacity: 0.2, roughness: 0.03, metalness: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2 }),
		rail: chrome(),
		pylon: new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.3, metalness: 0.35 }),
	};
	const padTex = boostTexture();
	const PYLON = new THREE.CylinderGeometry(0.42, 0.62, 1, 14).translate(0, 0.5, 0);
	PYLON.userData.shared = true;

	const DECK = 0.9;    // the road's depth
	const SHAPES = {
		top: [[-HALF, 0, HALF, 0, 0, 1]],
		body: [[HALF, 0, HALF, -DECK, 0, 0.5], [HALF, -DECK, -HALF, -DECK, 0, 2 * HALF / 1.8], [-HALF, -DECK, -HALF, 0, 0, 0.5]],
		glow: [[HALF + 0.015, 0.08, HALF + 0.015, -0.16, 0, 1], [-HALF - 0.015, -0.16, -HALF - 0.015, 0.08, 0, 1]],
		glass: [[HALF, 0, HALF, 0.8, 0, 1], [-HALF, 0.8, -HALF, 0, 0, 1]],
		rail: [-1, 1].flatMap((side) => {
			const x = side * HALF;
			return [[x - 0.06, 0.8, x + 0.06, 0.8, 0, 1], [x + 0.06, 0.8, x + 0.06, 0.92, 0, 1], [x + 0.06, 0.92, x - 0.06, 0.92, 0, 1], [x - 0.06, 0.92, x - 0.06, 0.8, 0, 1]];
		}),
	};

	const chunks = new Map();    // index → { group, from, to }
	let things = [];             // on the road: { type, s, x, y, mesh, taken, chunk }
	let lastHazard = 0;

	const rand = (a, b) => a + Math.random() * (b - a);
	const v3 = () => new THREE.Vector3();
	const P = v3();
	const Q = new THREE.Quaternion();

	function place(obj, s, x, y) {
		track.frame(s, P, Q);
		obj.quaternion.copy(Q);
		obj.position.set(x, y, 0).applyQuaternion(Q).add(P);
	}

	function buildChunk(c) {
		const i0 = Math.round(c * CHUNK / STEP);
		const i1 = Math.round((c + 1) * CHUNK / STEP);
		track.ensure(i1 * STEP + STEP * 2);
		const S = track.samples;
		const group = new THREE.Group();
		const add = (geo, mat, shadow) => {
			const m = new THREE.Mesh(geo, mat);
			m.receiveShadow = !!shadow;
			group.add(m);
			return m;
		};
		add(sweep(S, i0, i1, SHAPES.top, 16), MAT.road, true);
		add(sweep(S, i0, i1, SHAPES.body, 1.8), MAT.check, true);
		add(sweep(S, i0, i1, SHAPES.glow, 4), MAT.glow);
		add(sweep(S, i0, i1, SHAPES.rail, 4), MAT.rail);
		const glass = add(sweep(S, i0, i1, SHAPES.glass, 4), MAT.glass);
		glass.renderOrder = 2;

		// pylons down to the sea, where the road runs level enough
		for (let i = i0 + 12; i < i1; i += 26) {
			const s = S[i];
			if (s.up.y < 0.85 || s.pos.y < 4 || s.kind === 'helix') continue;   // (under a helix, it would spear the road below)
			const p = new THREE.Mesh(PYLON, MAT.pylon);
			p.position.set(s.pos.x, -1, s.pos.z).addScaledVector(s.up, 0);
			p.scale.set(1, s.pos.y - DECK + 1, 1);
			p.castShadow = true;
			group.add(p);
		}

		// islands off to either side, now and then a big one further out, and clouds
		for (let i = i0 + Math.floor(rand(0, 60)); i < i1; i += Math.floor(rand(70, 130))) {
			const s = S[i];
			const f = new THREE.Vector3(s.fwd.x, 0, s.fwd.z);
			if (f.lengthSq() < 0.01) continue;
			f.normalize();
			const across = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
			const r = rand(14, 40);
			const d = r + rand(16, 90);
			const isle = buildIsland(r, rand(4, Math.min(11, r * 0.35)));
			isle.position.copy(s.pos).addScaledVector(across, d).setY(0);
			isle.rotation.y = Math.random() * TAU;
			group.add(isle);
		}
		if (Math.random() < 0.45) {
			const s = S[Math.floor((i0 + i1) / 2)];
			const f = new THREE.Vector3(s.fwd.x, 0, s.fwd.z);
			if (f.lengthSq() > 0.01) {
				f.normalize();
				const across = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
				const r = rand(80, 150);
				const big = buildIsland(r, rand(45, 95), false);
				big.position.copy(s.pos).addScaledVector(across, r + rand(120, 260)).setY(0);
				group.add(big);
			}
		}
		for (let n = Math.floor(rand(0, 3)); n > 0; n--) {
			const s = S[Math.floor(rand(i0, i1))];
			const a = Math.random() * TAU;
			const d = rand(40, 220);
			group.add(world.cloud(s.pos.x + Math.cos(a) * d, rand(55, 140), s.pos.z + Math.sin(a) * d, rand(60, 150)));
		}

		if (c === 0) group.add(arch('START', START_S + 4));

		scene.add(group);
		chunks.set(c, { group, from: c * CHUNK, to: (c + 1) * CHUNK });
		layThings(c, c * CHUNK, (c + 1) * CHUNK, group);
	}

	function dropChunk(c) {
		const chunk = chunks.get(c);
		scene.remove(chunk.group);
		chunk.group.traverse(function (o) {
			if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
			if (o.material && o.material.map === world.cloudTex) o.material.dispose();
		});
		things = things.filter((t) => t.chunk !== c);
		chunks.delete(c);
	}

	// Keep the track built from just behind the eye to well ahead of it.
	function keepBuilt(sEye) {
		const first = Math.max(0, Math.floor((sEye - BEHIND) / CHUNK));
		const last = Math.floor((sEye + AHEAD) / CHUNK);
		for (const c of [...chunks.keys()]) if (c < first) dropChunk(c);
		for (let c = first; c <= last; c++) if (!chunks.has(c)) buildChunk(c);
	}

	/* ---------- rings, hazards, boost pads ---------- */

	const BIG = ['loop', 'corkscrew', 'helix'];
	const isBig = (s) => BIG.includes(track.kindAt(s));

	function thing(type, s, x, y, mesh, group, c) {
		place(mesh, s, x, y);
		group.add(mesh);
		const t = { type, s, x, y, mesh, taken: false, chunk: c, age: 0 };
		if (type === 'ring') {
			// (spun about the road's up: keep its resting turn)
			t.base = mesh.quaternion.clone();
			t.spin = Math.random() * TAU;
		}
		things.push(t);
		return t;
	}

	function ringLine(s, from, to, n, gap, group, c) {
		for (let i = 0; i < n; i++) {
			const k = n > 1 ? i / (n - 1) : 0;
			const x = LANES[from] + (LANES[to] - LANES[from]) * (k * k * (3 - 2 * k));
			thing('ring', s + i * gap, x, 1.0, buildRing(), group, c);
		}
		return s + (n - 1) * gap;
	}

	function layThings(c, from, to, group) {
		let s = Math.max(from, START_S + 180) + rand(5, 25);
		while (s < to) {
			const lane = Math.floor(Math.random() * 3);
			if (isBig(s) || isBig(s + 30)) {
				// through the big pieces: a long line of rings, nothing to hit
				s = ringLine(s, lane, lane, 10, 3.5, group, c) + rand(30, 50);
				continue;
			}
			const r = Math.random();
			if (r < 0.32) {
				const other = Math.random() < 0.5 ? lane : (lane + 1 + Math.floor(Math.random() * 2)) % 3;
				s = ringLine(s, lane, other, 8, 4, group, c) + rand(40, 70);
			} else if (r < 0.7 && s - lastHazard > 95 && !isBig(s + 15)) {
				// a hazard across one or two lanes, rings through the gap
				const blocked = Math.random() < 0.55 ? [lane, (lane + 1 + Math.floor(Math.random() * 2)) % 3] : [lane];
				const open = [0, 1, 2].filter((l) => !blocked.includes(l));
				const mine = Math.random() < 0.4;
				for (const l of blocked) {
					const t = thing(mine ? 'mine' : 'barrier', s, LANES[l], 0, mine ? buildMine() : buildBarrier(), group, c);
					t.phase = Math.random() * TAU;
				}
				const gapLane = open[Math.floor(Math.random() * open.length)];
				ringLine(s - 6, gapLane, gapLane, 4, 4, group, c);
				lastHazard = s;
				s += rand(55, 80);
			} else if (r < 0.86) {
				thing('pad', s, LANES[lane], 0, buildPad(padTex), group, c);
				s = ringLine(s + 10, lane, lane, 6, 4.5, group, c) + rand(45, 70);
			} else {
				// a sweep of rings right across the road
				const dir = Math.random() < 0.5 ? 1 : -1;
				s = ringLine(s, dir > 0 ? 0 : 2, dir > 0 ? 2 : 0, 9, 3.5, group, c) + rand(45, 70);
			}
		}
	}

	// An arch over the road with a banner: the start, and the goal.
	function arch(text, s) {
		const g = new THREE.Group();
		const tex = (function () {
			const c = document.createElement('canvas');
			c.width = 1024;
			c.height = 160;
			const x = c.getContext('2d');
			for (let i = 0; i < 64; i++) for (let j = 0; j < 2; j++) {
				x.fillStyle = (i + j) % 2 ? '#111' : '#fff';
				x.fillRect(i * 16, j * 16, 16, 16);
				x.fillRect(i * 16, 128 + j * 16, 16, 16);
			}
			x.fillStyle = '#ff3d6e';
			x.fillRect(0, 32, 1024, 96);
			x.font = '84px "Knewave", "Paytone One", sans-serif';
			x.textAlign = 'center';
			x.textBaseline = 'middle';
			x.lineWidth = 12;
			x.strokeStyle = '#1a0b2e';
			x.strokeText(text, 512, 84);
			x.fillStyle = '#ffe14a';
			x.fillText(text, 512, 84);
			const t = new THREE.CanvasTexture(c);
			t.colorSpace = THREE.SRGBColorSpace;
			return t;
		})();
		const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 1.6, 1.5, 0.3), [glossy(0x1a0b2e), glossy(0x1a0b2e), glossy(0x1a0b2e), glossy(0x1a0b2e), glossy(0xffffff, { map: tex }), glossy(0xffffff, { map: tex })]);
		banner.position.y = 6.2;
		g.add(banner);
		for (const side of [-1, 1]) {
			const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 7, 16), chrome());
			post.position.set(side * (HALF + 0.6), 3.0, 0);
			g.add(post);
		}
		g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
		place(g, s, 0, 0);
		return g;
	}

	/* ---------- runners ---------- */

	let runners = [];

	function Runner(n) {
		const colour = PLAYER_COLORS[n];
		const model = buildRunner(colour);
		scene.add(model.root);
		// a streak of light behind them
		const TRAIL = 16;
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 2 * 3), 3));
		geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL * 2 * 3), 3));
		const idx = [];
		for (let i = 0; i < TRAIL - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
		geo.setIndex(idx);
		const trail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
		trail.frustumCulled = false;
		scene.add(trail);
		return {
			n, colour, model, trail, TRAIL, history: [],
			tint: new THREE.Color(colour),
			px: 0.5, x: 0, xWas: 0,
			off: 0, s: START_S, sWas: START_S,
			rings: 0, bump: 0,
			tumble: 0, safe: 0, boost: 0,
		};
	}

	// Where their player is across the room, across the road.
	const xFor = (r) => (r.px * 2 - 1) * SPAN;

	// Runners side by side line up one behind another, so they never overlap.
	function formation() {
		runners.forEach(function (r, i) {
			let rank = 0;
			for (let j = 0; j < i; j++) if (Math.abs(runners[j].x - r.x) < 1.1) rank++;
			r.offWant = -rank * SLOT;
		});
	}

	/* ---------- effects ---------- */

	const sparkTex = sparkleTexture();
	const sparks = [];       // { sprite, age, life }
	const flung = [];        // rings thrown out in a spill: { mesh, vel, spin, age }
	const smashed = [];      // hazards smashed by a ball: { mesh, vel, spin, age }
	const pops = [];         // words: { text, colour, at (world), age, size }

	function sparkle(at, colour = 0xffffff, size = 2.2) {
		const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
		s.position.copy(at);
		s.scale.setScalar(size);
		scene.add(s);
		sparks.push({ sprite: s, age: 0, life: 0.4, size });
	}

	function pop(text, colour, at, size = 70) {
		pops.push({ text, colour, at: at.clone(), age: 0, size });
	}

	/* ---------- the flow ---------- */

	const sound = createSound();
	const show = new Showtime(stage, {
		id: 'loop-island',
		seconds: DURATION,
		players: () => runners.length,
		scores: () => runners.map((r) => r.rings),
		music: false,
		theme: { accent: '#2f7cf0', accent2: '#3cd6ff', gold: '#ffe14a', ink: '#0a1a3a', sky: ['#04163a', '#0b4f8a'], glow: 'rgba(60,214,255,0.35)' },
	});
	let completed = false;

	let phase = 'waiting';       // waiting, ready, run, finish, over
	let phaseT = 0;
	let clock = 0;
	let runT = 0;
	let sPack = START_S;
	let speed = 0;
	let surge = 0;
	let kick = 0;                // the boost's punch on the eye, fading
	let shake = 0;
	let flash = { red: 0, white: 0 };
	let beeped = 0;
	let goal = null;             // { s, mesh }
	let finishAt = 0;

	function setPhase(p) {
		phase = p;
		phaseT = 0;
	}

	function initGame(count) {
		sound.resume();
		runners = [];
		for (let i = 0; i < count; i++) {
			const r = Runner(i);
			r.px = (i + 0.5) / count;
			r.x = xFor(r);
			runners.push(r);
		}
		formation();
		for (const r of runners) r.off = r.offWant;
		setPhase('ready');
		show.go('play');
	}

	function go() {
		setPhase('run');
		sound.music(true);
	}

	function finish() {
		setPhase('finish');
		sound.finish();
		sound.music(false);
	}

	// Showtime's scores, then its ranking onto the podium, then done.
	function results() {
		setPhase('over');
		show.go('scores');
	}

	show.sequence([
		{ id: 'squad', length: Infinity },
		{ id: 'play', length: Infinity },
		show.beats.scores(),
		show.beats.rank(),
		{
			id: 'done',
			length: Infinity,
			world: false,
			enter() {
				if (completed) return;
				completed = true;
				IGB.complete(scoresToRewards(runners.map((r) => r.rings)));
			},
		},
	]);

	/* ---------- every frame ---------- */

	const eye = v3();
	const eyeQ = new THREE.Quaternion();
	const qa = new THREE.Quaternion();
	const qb = new THREE.Quaternion();
	const up = v3();
	const right = v3();
	const tmp = v3();
	const back = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.97);
	let eyeReady = false;

	function simulate(dt) {
		clock += dt;
		phaseT += dt;

		// how fast the pack goes
		if (phase === 'run') {
			runT += dt;
			const t = Math.min(1, runT / SPEED.ramp);
			speed = SPEED.start + (SPEED.top - SPEED.start) * t * t * (3 - 2 * t) + surge;
			surge *= Math.exp(-dt * SURGE.decay);
			if (!goal && runT > DURATION - 4) {
				// the goal arch, just where they'll be when time's up
				const left = DURATION - runT;
				const sGoal = sPack + speed * left + 8;
				goal = { s: sGoal, mesh: arch('GOAL!', sGoal) };
				scene.add(goal.mesh);
			}
			if (goal && sPack + runners.reduce((m, r) => Math.max(m, r.off), -99) >= goal.s) finish();
			else if (runT > DURATION + 1.5) finish();
		} else if (phase === 'finish' || phase === 'over') {
			speed *= Math.exp(-dt * 1.4);
			if (phase === 'finish' && phaseT > 2.6) results();
		} else speed = 0;
		kick *= Math.exp(-dt * 2.5);
		shake *= Math.exp(-dt * 6);
		flash.red *= Math.exp(-dt * 4);
		flash.white *= Math.exp(-dt * 5);

		sPack += speed * dt;

		if (phase === 'ready') {
			const beat = Math.floor(phaseT - (READY - 3));
			if (phaseT > READY - 3 && beat >= beeped && beeped < 3) {
				sound.beep(false);
				beeped++;
			}
			if (phaseT >= READY) {
				sound.beep(true);
				go();
			}
		}

		// the runners
		const pace = Math.min(1, speed / SPEED.top);
		formation();
		for (const r of runners) {
			r.off += (r.offWant - r.off) * Math.min(1, dt * 4);
			r.sWas = r.s;
			r.s = sPack + r.off;
			r.xWas = r.x;
			if (phase === 'run') r.x += (xFor(r) - r.x) * Math.min(1, dt * GLIDE);
			r.tumble = Math.max(0, r.tumble - dt);
			r.safe = Math.max(0, r.safe - dt);
			r.boost = Math.max(0, r.boost - dt);
			r.bump = Math.max(0, r.bump - dt * 4);

			const m = r.model;
			place(m.root, r.s, r.x, 0);
			if (phase === 'waiting' || phase === 'ready') m.idle(clock + r.n);
			else m.pose(dt, pace, r.boost > 0);
			m.lean.rotation.z = -Math.max(-0.5, Math.min(0.5, (r.x - r.xWas) / Math.max(dt, 0.001) * 0.035));
			if (r.tumble > 0) {
				const k = 1 - r.tumble / HIT.tumble;
				m.lean.rotation.x = -k * TAU;
				m.lean.position.y = Math.sin(Math.PI * k) * 1.6;
			} else {
				m.lean.rotation.x = 0;
				m.lean.position.y = 0;
			}
			m.root.visible = !(r.safe > 0 && r.tumble <= 0 && r.boost <= 0 && Math.floor(clock * 16) % 2);
			trail(r, dt, pace);
		}

		if (phase === 'run') touch();

		// things on the road come alive
		for (const t of things) {
			if (t.taken) continue;
			if (t.type === 'ring') {
				t.spin += dt * 3.2;
				t.mesh.quaternion.copy(t.base).multiply(qa.setFromAxisAngle(tmp.set(0, 1, 0), t.spin));
			} else if (t.type === 'mine') {
				const spin = t.mesh.userData.spin;
				spin.rotation.y += dt * 2;
				spin.rotation.x += dt * 1.3;
				spin.position.y = 1.0 + Math.sin(clock * 3 + t.phase) * 0.18;
			} else if (t.type === 'barrier') {
				t.mesh.userData.lamp.visible = Math.floor(clock * 4 + t.phase) % 2 === 0;
			}
		}
		padTex.offset.y = -clock * 2.2;

		// sparkles, flung rings, smashed hazards, words
		for (const s of sparks) {
			s.age += dt;
			const k = s.age / s.life;
			s.sprite.scale.setScalar(s.size * (0.6 + k * 1.2));
			s.sprite.material.opacity = 1 - k;
			s.sprite.material.rotation += dt * 4;
		}
		for (const s of sparks.filter((s) => s.age >= s.life)) {
			scene.remove(s.sprite);
			s.sprite.material.dispose();
			sparks.splice(sparks.indexOf(s), 1);
		}
		for (const list of [flung, smashed]) {
			for (const f of list) {
				f.age += dt;
				f.vel.y -= 22 * dt;
				f.mesh.position.addScaledVector(f.vel, dt);
				f.mesh.rotation.x += f.spin * dt;
				f.mesh.rotation.y += f.spin * 0.7 * dt;
				if (f.age > 1.0) f.mesh.scale.multiplyScalar(Math.exp(-dt * 6));
			}
			for (const f of list.filter((f) => f.age > 1.6)) {
				f.mesh.parent && f.mesh.parent.remove(f.mesh);
				list.splice(list.indexOf(f), 1);
			}
		}
		for (const p of pops) p.age += dt;
		for (let i = pops.length - 1; i >= 0; i--) if (pops[i].age > 1.1) pops.splice(i, 1);

		// the eye
		const centre = runners.length ? runners.reduce((a, r) => a + r.x, 0) / runners.length : 0;
		const sEye = sPack - CAM.back;
		track.frame(sEye, P, qa);
		track.frame(sEye + CAM.look, null, qb);
		qa.slerp(qb, 0.5);
		up.set(0, 1, 0).applyQuaternion(qa);
		right.set(1, 0, 0).applyQuaternion(qa);
		const chasePos = tmp.copy(P).addScaledVector(up, CAM.up).addScaledVector(right, centre * CAM.follow)
			.addScaledVector(v3().set(0, 0, 1).applyQuaternion(qa), kick * CAM.kick);   // (a boost leaves the eye behind for a moment)
		if (phase === 'waiting' || phase === 'ready') {
			// the swoop: from in front of the pack, looking back at them, round behind
			const k = phase === 'waiting' ? 0 : Math.max(0, Math.min(1, (phaseT - 0.4) / 2.6));
			const e = k * k * (3 - 2 * k);
			const front = track.frame(sPack + 8, eye, qb);
			const fUp = v3().set(0, 1, 0).applyQuaternion(front);
			const fRight = v3().set(1, 0, 0).applyQuaternion(front);
			eye.addScaledVector(fUp, 1.7).addScaledVector(fRight, Math.sin(clock * 0.3) * 1.2 * (1 - e));
			const qFront = front.clone().multiply(back);
			eye.lerp(chasePos, e).addScaledVector(up, Math.sin(Math.PI * e) * 3.5);
			eyeQ.slerpQuaternions(qFront, qa, e);
			eyeReady = true;
		} else {
			eye.copy(chasePos);
			if (!eyeReady) eyeQ.copy(qa);
			eyeQ.slerp(qa, 1 - Math.exp(-dt * 9));
			eyeReady = true;
		}
		rig.position.copy(eye);
		rig.quaternion.copy(eyeQ).multiply(PITCH);
		if (shake > 0.01) rig.position.add(tmp.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0).applyQuaternion(eyeQ));

		keepBuilt(sEye);

		// the sun, and its shadows round the pack
		track.at(sPack - 2, centre, 0, tmp);
		sun.target.position.copy(tmp);
		sun.position.copy(tmp).addScaledVector(SUN, 80);

		world.update(clock, eye);
		sound.wind(phase === 'waiting' ? 0.1 : pace);
		sound.tick();
	}

	// Did anyone run into anything?
	function touch() {
		for (const r of runners) {
			for (const t of things) {
				if (t.taken || t.s <= r.sWas || t.s > r.s) continue;
				if (t.type === 'ring') {
					if (Math.abs(t.x - r.x) > REACH.ring || r.tumble > 0) continue;
					t.taken = true;
					t.mesh.visible = false;
					r.rings++;
					r.bump = 1;
					sparkle(t.mesh.getWorldPosition(v3()), 0xfff2a0);
					sound.ring(r.x / HALF);
				} else if (t.type === 'pad') {
					if (Math.abs(t.x - r.x) > REACH.hazard || r.tumble > 0) continue;
					if (r.boost < 0.4) {
						r.boost = BOOST;
						r.safe = Math.max(r.safe, BOOST);
						surge = Math.max(surge, SURGE.boost);
						kick = 1;
						flash.white = Math.max(flash.white, 0.35);
						sound.boost();
						pop('BOOST!', r.colour, r.model.root.position, 80);
					}
				} else {
					if (Math.abs(t.x - r.x) > REACH.hazard) continue;
					if (r.boost > 0) {
						// straight through it
						t.taken = true;
						const at = t.mesh.getWorldPosition(v3());
						smashed.push({ mesh: t.mesh, vel: v3().set((Math.random() - 0.5) * 16, 14, 0).applyQuaternion(t.mesh.quaternion).addScaledVector(v3().set(0, 0, -1).applyQuaternion(t.mesh.quaternion), speed * 0.6), spin: 12, age: 0 });
						sparkle(at, 0xffffff, 5);
						sound.smash();
						shake = Math.max(shake, 0.25);
						pop('SMASH!', r.colour, at, 80);
					} else if (r.safe <= 0 && r.tumble <= 0) spill(r);
				}
			}
		}
	}

	// A spill: tumble, and throw half your rings away.
	function spill(r) {
		const lose = Math.ceil(r.rings / 2);
		r.rings -= lose;
		r.tumble = HIT.tumble;
		r.safe = HIT.safe;
		sound.hit();
		shake = Math.max(shake, 0.6);
		flash.red = Math.max(flash.red, 0.5);
		const at = r.model.root.position;
		pop(lose ? '−' + lose : 'OUCH!', '#ff3d4a', at, 90);
		track.frame(r.s, P, Q);
		const fwd = v3().set(0, 0, -1).applyQuaternion(Q);
		const upv = v3().set(0, 1, 0).applyQuaternion(Q);
		const rt = v3().set(1, 0, 0).applyQuaternion(Q);
		for (let i = 0; i < Math.min(lose, 14); i++) {
			const ring = buildRing();
			ring.position.copy(at).addScaledVector(upv, 1.2);
			const a = i / Math.min(lose, 14) * TAU;
			const vel = v3().copy(fwd).multiplyScalar(speed * 0.82).addScaledVector(rt, Math.cos(a) * 7).addScaledVector(upv, 8 + Math.sin(a) * 4);
			scene.add(ring);
			flung.push({ mesh: ring, vel, spin: 8, age: 0 });
		}
	}

	// A runner's streak of light: the last few places they've been.
	function trail(r, dt, pace) {
		const h = r.history;
		const m = r.model.root;
		const upv = v3().set(0, 1, 0).applyQuaternion(m.quaternion);
		const rt = v3().set(1, 0, 0).applyQuaternion(m.quaternion);
		h.unshift({ p: m.position.clone().addScaledVector(upv, r.boost > 0 ? 0.62 : 0.55), rt, up: upv });
		if (h.length > r.TRAIL) h.length = r.TRAIL;
		const pos = r.trail.geometry.attributes.position;
		const col = r.trail.geometry.attributes.color;
		const width = r.boost > 0 ? 0.75 : 0.3;
		const bright = phase === 'run' || phase === 'finish' ? (r.boost > 0 ? 1.4 : 0.55 * pace) : 0;
		for (let i = 0; i < r.TRAIL; i++) {
			const e = h[Math.min(i, h.length - 1)];
			const f = 1 - i / (r.TRAIL - 1);
			const w = width * (0.3 + 0.7 * f);
			// a ribbon standing up, so it reads from behind and from the side
			pos.setXYZ(i * 2, e.p.x + e.up.x * w, e.p.y + e.up.y * w, e.p.z + e.up.z * w);
			pos.setXYZ(i * 2 + 1, e.p.x - e.up.x * w, e.p.y - e.up.y * w, e.p.z - e.up.z * w);
			const b = bright * f * f;
			col.setXYZ(i * 2, r.tint.r * b, r.tint.g * b, r.tint.b * b);
			col.setXYZ(i * 2 + 1, r.tint.r * b, r.tint.g * b, r.tint.b * b);
		}
		pos.needsUpdate = true;
		col.needsUpdate = true;
	}

	function render() {
		renderer.setScissorTest(true);
		renderer.shadowMap.needsUpdate = true;
		cams.forEach(function (cam, w) {
			viewport(w * W, 0, W, H);
			renderer.render(scene, cam);
		});
	}

	/* ---------- the 2D layer: speed lines, the sun's flare, scores ---------- */

	// Where a point shows, on whichever wall it's on.
	const pv = v3();
	function onWall(v, wall) {
		pv.copy(v).project(cams[wall]);
		if (pv.z > 1 || Math.abs(pv.x) > 1.3 || Math.abs(pv.y) > 1.3) return null;
		return { x: wall * W + (pv.x + 1) / 2 * W, y: (1 - pv.y) / 2 * H, in: Math.abs(pv.x) <= 1 && Math.abs(pv.y) <= 1 };
	}
	function onAnyWall(v) {
		for (const w of [1, 0, 2]) {
			const p = onWall(v, w);
			if (p && p.in) return p;
		}
		return null;
	}

	const streaks = { front: [], side: [] };
	for (let i = 0; i < 90; i++) streaks.front.push({ a: Math.random() * TAU, r: Math.random() * 1000, len: rand(40, 160), f: rand(0.6, 1.4), w: rand(1.5, 4) });
	for (let i = 0; i < 70; i++) streaks.side.push({ wall: i % 2 ? 2 : 0, y: Math.random() * H, x: Math.random(), len: rand(0.06, 0.25), f: rand(0.6, 1.5), w: rand(1.5, 4) });

	function speedLines(ctx, dt) {
		const pace = Math.min(1.4, speed / SPEED.top);
		const on = Math.max(0, (pace - 0.35) / 0.65) + kick * 0.8;
		if (on <= 0.01) return;
		const boosting = runners.some((r) => r.boost > 0);
		// the front: rushing out from far down the road
		const vp = onWall(track.at(sPack + 90, 0, 1, v3()), 1) || { x: W * 1.5, y: H * 0.42 };
		ctx.save();
		ctx.beginPath();
		ctx.rect(W, 0, W, H);
		ctx.clip();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		for (const s of streaks.front) {
			s.r += dt * (250 + s.r * 3.2) * pace * s.f;
			if (s.r > 1300) {
				s.r = rand(60, 260);
				s.a = Math.random() * TAU;
			}
			if (s.r < 150) continue;
			const dx = Math.cos(s.a);
			const dy = Math.sin(s.a);
			const len = s.len * (1 + s.r / 350) * pace;
			const a = Math.min(1, (s.r - 150) / 200) * 0.22 * on * (boosting ? 1.6 : 1);
			ctx.strokeStyle = `rgba(255,255,255,${a})`;
			ctx.lineWidth = s.w * (0.6 + s.r / 600);
			ctx.beginPath();
			ctx.moveTo(vp.x + dx * s.r, vp.y + dy * s.r);
			ctx.lineTo(vp.x + dx * (s.r + len), vp.y + dy * (s.r + len));
			ctx.stroke();
		}
		ctx.restore();
		// the sides: streaking past, from the front corner to the back
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'round';
		for (const s of streaks.side) {
			s.x += dt * pace * s.f * 1.9;
			if (s.x > 1.2) {
				s.x = -s.len;
				s.y = Math.random() * H;
			}
			const x0 = s.x * W;
			const x1 = (s.x + s.len * (0.6 + pace)) * W;
			const a = 0.2 * on * (boosting ? 1.6 : 1);
			ctx.strokeStyle = `rgba(255,255,255,${a})`;
			ctx.lineWidth = s.w;
			ctx.beginPath();
			if (s.wall === 0) {
				ctx.moveTo(W - x0, s.y);
				ctx.lineTo(W - x1, s.y);
			} else {
				ctx.moveTo(2 * W + x0, s.y);
				ctx.lineTo(2 * W + x1, s.y);
			}
			ctx.stroke();
		}
		ctx.restore();
	}

	// The sun: a hot bloom, an anamorphic streak, and ghosts across the front.
	function flare(ctx) {
		const sunAt = v3().copy(eye).addScaledVector(SUN, 1000);
		for (const w of [0, 1, 2]) {
			const p = onWall(sunAt, w);
			if (!p) continue;
			ctx.save();
			ctx.beginPath();
			ctx.rect(w * W, 0, W, H);
			ctx.clip();
			ctx.globalCompositeOperation = 'lighter';
			const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 420);
			glow.addColorStop(0, 'rgba(255,250,230,0.85)');
			glow.addColorStop(0.08, 'rgba(255,236,190,0.5)');
			glow.addColorStop(0.35, 'rgba(255,200,120,0.12)');
			glow.addColorStop(1, 'rgba(255,180,90,0)');
			ctx.fillStyle = glow;
			ctx.fillRect(p.x - 420, p.y - 420, 840, 840);
			const streak = ctx.createLinearGradient(p.x - 900, 0, p.x + 900, 0);
			streak.addColorStop(0, 'rgba(160,210,255,0)');
			streak.addColorStop(0.5, 'rgba(220,240,255,0.45)');
			streak.addColorStop(1, 'rgba(160,210,255,0)');
			ctx.fillStyle = streak;
			ctx.fillRect(p.x - 900, p.y - 3, 1800, 6);
			if (w === 1) {
				const cx = W * 1.5;
				const cy = H / 2;
				const ghosts = [[0.35, 30, '255,210,140', 0.14], [0.6, 80, '140,210,255', 0.07], [0.9, 18, '255,255,255', 0.16], [1.25, 130, '180,140,255', 0.05], [1.55, 55, '255,190,120', 0.08], [1.9, 200, '120,220,200', 0.035]];
				for (const [t, r, c, a] of ghosts) {
					const x = p.x + (cx - p.x) * t;
					const y = p.y + (cy - p.y) * t;
					const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
					g.addColorStop(0, `rgba(${c},${a * 0.4})`);
					g.addColorStop(0.85, `rgba(${c},${a})`);
					g.addColorStop(1, `rgba(${c},0)`);
					ctx.fillStyle = g;
					ctx.beginPath();
					ctx.arc(x, y, r, 0, TAU);
					ctx.fill();
				}
			}
			ctx.restore();
		}
	}

	function ringIcon(ctx, x, y, r) {
		ctx.save();
		ctx.lineWidth = r * 0.36;
		ctx.strokeStyle = '#b8860b';
		ctx.beginPath();
		ctx.ellipse(x, y + r * 0.08, r, r * 0.92, 0, 0, TAU);
		ctx.stroke();
		ctx.lineWidth = r * 0.26;
		ctx.strokeStyle = '#ffd23a';
		ctx.beginPath();
		ctx.ellipse(x, y, r, r * 0.92, 0, 0, TAU);
		ctx.stroke();
		ctx.restore();
	}

	function overlay(ctx, dt) {
		flare(ctx);
		speedLines(ctx, dt);

		// a flash: white for a boost, red for a spill
		if (flash.white > 0.01) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,255,255,${flash.white * 0.5})` });
		if (flash.red > 0.01) {
			const g = ctx.createRadialGradient(W * 1.5, H / 2, H * 0.3, W * 1.5, H / 2, W * 0.75);
			g.addColorStop(0, 'rgba(255,40,60,0)');
			g.addColorStop(1, `rgba(255,40,60,${flash.red})`);
			ctx.fillStyle = g;
			ctx.fillRect(W, 0, W, H);
		}

		// words over the runners
		for (const p of pops) {
			const at = onAnyWall(tmp.copy(p.at).add(v3().set(0, 2.4, 0)));
			if (!at) continue;
			const k = p.age / 1.1;
			art.text(ctx, p.text, at.x, at.y - k * 90, { size: p.size * (k < 0.15 ? k / 0.15 : 1), font: 'Knewave', fill: p.colour, outline: '#1a0b2e', outlineWidth: 7, alpha: 1 - Math.max(0, k - 0.6) / 0.4 });
		}

		if (phase === 'waiting') {
			art.text(ctx, 'LOOP ISLAND', W * 1.5, 150, { size: 170, font: 'Knewave', fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 12, drop: 'rgba(0,0,0,0.35)' });
			return;
		}

		// the countdown
		if (phase === 'ready' || (phase === 'run' && phaseT < 0.9)) {
			const n = phase === 'run' ? 0 : Math.ceil(READY - phaseT);
			if (n <= 3) {
				const t = phase === 'run' ? phaseT : 1 - ((READY - phaseT) % 1);
				const text = n === 0 ? 'GO!' : String(n);
				const s = 1 + Math.max(0, 0.25 - t) * 2.4;
				art.text(ctx, text, W * 1.5, 430, { size: (n === 0 ? 260 : 300) * s, font: 'Knewave', fill: n === 0 ? '#3cff8a' : '#ffe14a', outline: '#1a0b2e', outlineWidth: 14, alpha: n === 0 ? 1 - Math.max(0, phaseT - 0.5) / 0.4 : 1 });
			} else {
				art.text(ctx, 'LOOP ISLAND', W * 1.5, 300, { size: 170, font: 'Knewave', fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 12, alpha: Math.max(0, 1 - phaseT) });
			}
		}

		// the clock, the speed, everyone's rings
		if (phase === 'run' || phase === 'finish') {
			const left = Math.max(0, Math.ceil(DURATION - runT));
			const label = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
			art.roundRect(ctx, W * 1.5 - 130, -30, 260, 120, 34, { fill: 'rgba(16,10,40,0.78)', stroke: left <= 10 ? '#ff3d6e' : '#ffffff', lineWidth: 5 });
			art.text(ctx, label, W * 1.5, 45, { size: 66, font: 'Paytone One', weight: 400, fill: left <= 10 && Math.floor(clock * 4) % 2 ? '#ff3d6e' : '#ffffff' });
			const kmh = Math.round(speed * 3.6);
			art.text(ctx, String(kmh), 2 * W - 150, 72, { size: 84, font: 'Knewave', fill: '#ffffff', outline: '#1a0b2e', outlineWidth: 8, align: 'right', italic: true });
			art.text(ctx, 'KM/H', 2 * W - 140, 92, { size: 34, font: 'Paytone One', weight: 400, fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 5, align: 'left' });
		}
		if (phase !== 'waiting') {
			const n = runners.length;
			const w = 168;
			const x0 = W * 1.5 - (n * w + (n - 1) * 14) / 2;
			runners.forEach(function (r, i) {
				const x = x0 + i * (w + 14);
				const y = phase === 'over' ? -200 : 120;
				const s = 1 + r.bump * 0.25;
				art.with(ctx, { x: x + w / 2, y: y + 36, scale: s }, function (c) {
					art.roundRect(c, -w / 2, -34, w, 68, 34, { fill: r.colour, stroke: '#ffffff', lineWidth: 4, shadow: { color: 'rgba(0,0,0,0.35)', blur: 8, y: 4 } });
					ringIcon(c, -w / 2 + 38, 0, 19);
					art.text(c, String(r.rings), 22, 2, { size: 46, font: 'Paytone One', weight: 400, fill: '#ffffff', outline: 'rgba(0,0,0,0.35)', outlineWidth: 4 });
				});
			});
		}
		if (phase === 'finish') art.text(ctx, 'FINISH!', W * 1.5, 420, { size: 220 * (1 + Math.max(0, 0.3 - phaseT)), font: 'Knewave', fill: '#ffe14a', outline: '#1a0b2e', outlineWidth: 14 });
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		simulate(dt);
		if (show.beat === 'squad' || show.beat === 'play') render();
		show.frame(ctx, dt, (c) => overlay(c, dt));
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		runners.forEach(function (r, i) {
			if (p[i] && p[i].px !== undefined) r.px = Math.max(0, Math.min(1, p[i].px));
		});
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		return {
			phase, phaseT, runT, sPack, speed,
			runners: runners.map((r) => ({ n: r.n, x: r.x, s: r.s, rings: r.rings, boost: r.boost, tumble: r.tumble })),
			ahead: things.filter((t) => !t.taken && t.s > sPack).slice(0, 12).map((t) => ({ type: t.type, s: t.s, x: t.x })),
			chunks: [...chunks.keys()],
		};
	};

	self.fini = function () {
		sound.close();
		unlisten();
		show.fini();
		world.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	show.go('squad');
	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else show.pickPlayers(initGame);
});
