/*
 * Glass Bridge
 *
 * A long bridge of glass hangs high over a dark void. Every row has two
 * panes, left and right: one is tempered and holds, the other shatters.
 * Contestants cross one at a time, in turn. Whoever is up strafes to pick a
 * side (they lean that way and the pane they're eyeing glows in their
 * colour), then steps toward the front wall to jump. A pane that holds stays
 * lit for everyone behind; one that shatters drops them into the void, and
 * the next in line walks up the lit panes to take over. Dither too long and
 * a guard fires. Everyone waiting points the way: their left/right spot puts
 * a hand in their colour over the pane they'd pick. Now and then a glint
 * runs across a pane: usually, not always, the tempered one. Reach the far
 * platform to survive. If there's time, a second bridge with everyone back.
 *
 * The three walls are one view from just behind the contestant on the
 * glass: the front wall looks down the bridge; the side walls look out
 * across the void at the hall, the VIP gallery (left) and the countdown
 * clock (right).
 *
 * Input: px (left / right: the side to jump to, or the side to point at),
 * pz (step toward the front wall to jump). Touch: tap the front wall's left
 * or right half to jump that way. An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { buildContestant, buildGuard, NUMBERS, buildBridge, buildShards, buildPlatform, buildHall, buildClock } from './models.js';
import { createSound } from './sound.js';

IGB.register('glass-bridge', function GlassBridgeGame(stage, playersMeta) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- tuning ---------- */

	const MAX_ROWS = 18;
	const rowsFor = (players) => Math.min(MAX_ROWS, 6 + 2 * players);
	const JUMP_SECONDS = [12, 10];    // to make each jump, on the first and second bridge
	const SECOND_BRIDGE_BEFORE = 170; // play a second bridge if the first ended before this many seconds
	const ROW_POINTS = 1;             // for each new row you prove
	const SURVIVE_POINTS = 5;         // for reaching the far platform
	const GLINT_TRUTH = 0.75;         // how often a glint is on the tempered pane
	const GLINT_EVERY = [2.2, 4.2];   // seconds between glints

	const COMMIT_Z = 0.3;             // step this close to the front wall to jump
	const ARM_Z = 0.42;               // and back past this before the next
	const STEP_DZ = 0.14;             // or a quick step this far forward...
	const STEP_WINDOW = 0.6;          // ...within this many seconds
	const MIN_DWELL = 0.7;            // seconds on a pane before you can jump again
	const SIDE_DEAD = 0.05;           // px either side of the middle that keeps the current side
	const ADVICE_DEAD = 0.08;         // px either side of the middle that points nowhere

	const GAP = 1.8;                  // metres between rows
	const PANE_W = 1.3;
	const PANE_D = 1.35;
	const PANE_X = 0.78;              // each pane's centre either side of the middle
	const HALF = 1.5;                 // the outer rails
	const WALK_RATE = 3.5;            // rows a second, walking up the lit panes
	const JUMP_TIME = 0.55;
	const HALL = 11;                  // the hall's walls either side of the bridge
	const GALLERY = { y0: -0.8, y1: 4.6 };

	const EYE = 5.2;                  // camera height over the glass
	const BACK = 6;                   // and how far behind the contestant on the glass
	const PITCH = 28;                 // degrees the front camera looks down
	const FRONT_FOV = 60;             // the front view's width, degrees: narrow, so the bridge is big
	const SIDE_PITCH = 20;            // and the side cameras, out over the void

	const rowZ = (i) => -(i + 1) * GAP;   // row -1 is the front of the start platform

	/* ---------- renderer, scene, cameras ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setClearColor(0x06070c);
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);

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
	scene.background = new THREE.Color(0x06070c);
	scene.fog = new THREE.Fog(0x06070c, 26, 95);
	scene.add(new THREE.HemisphereLight(0xa8bce0, 0x1a1420, 1.1));
	const key = new THREE.DirectionalLight(0xe8eeff, 1.5);
	scene.add(key, key.target);
	const spot = new THREE.SpotLight(0xfff2dc, 4, 0, 0.32, 0.6, 0);
	scene.add(spot, spot.target);

	// One camera per wall from the same eye, riding behind whoever is on the
	// glass. The front camera looks down the bridge, narrower than the wall
	// is wide so the glass reads big; the side cameras are 90 degrees wide
	// and level, looking out across the void at the hall.
	const rig = new THREE.Group();
	scene.add(rig);
	const frontCam = new THREE.PerspectiveCamera(2 * Math.atan(Math.tan(FRONT_FOV / 2 * Math.PI / 180) * H / W) * 180 / Math.PI, W / H, 0.1, 300);
	frontCam.rotation.order = 'YXZ';
	frontCam.rotation.x = -PITCH * Math.PI / 180;
	rig.add(frontCam);
	const sideCams = [Math.PI / 2, -Math.PI / 2].map(function (yaw) {
		const cam = new THREE.PerspectiveCamera();
		cam.rotation.order = 'YXZ';
		cam.rotation.y = yaw;
		cam.rotation.x = -SIDE_PITCH * Math.PI / 180;
		const n = 0.1;
		const f = 300;
		const h = n * 2 / (W / H);
		cam.near = n;
		cam.far = f;
		cam.projectionMatrix.makePerspective(-n, n, h / 2, -h / 2, n, f);
		cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
		rig.add(cam);
		return cam;
	});
	const cams = [sideCams[0], frontCam, sideCams[1]];
	let camZ = 0;

	// Where a point shows on the front wall, in world pixels.
	const tmp = new THREE.Vector3();
	function onFront(x, y, z) {
		tmp.set(x, y, z).project(frontCam);
		return { x: W + (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H, ok: tmp.z < 1 };
	}

	/* ---------- the hall ---------- */

	const hall = buildHall({ half: HALL, zFrom: 40, zTo: -rowsFor(6) * GAP - 60, gallery: GALLERY });
	scene.add(hall.group);
	const clock3d = buildClock();
	clock3d.group.rotation.y = -Math.PI / 2;
	clock3d.group.scale.setScalar(1.15);
	scene.add(clock3d.group);

	const startPlatform = buildPlatform(6, 14, 0x3ddc84);
	startPlatform.position.z = -0.3;
	scene.add(startPlatform);
	const finishPlatform = buildPlatform(7, 14, 0xf7d774);
	finishPlatform.rotation.y = Math.PI;
	scene.add(finishPlatform);

	// Pink guards on the far platform, rifles on the bridge.
	const guards = ['circle', 'triangle'].map(function (shape) {
		const g = buildGuard(shape, true);
		g.root.rotation.y = Math.PI;
		scene.add(g.root);
		return g;
	});

	/* ---------- the bridge (rebuilt for each crossing) ---------- */

	let rows = 0;
	let bridge = null;         // { group, panes[row][side] }
	let safe = [];             // the tempered side of each row: 0 left, 1 right
	let finishEdge = 0;
	const falling = [];        // shards tumbling away

	function buildCrossing() {
		if (bridge) scene.remove(bridge.group);
		for (const s of falling) scene.remove(s);
		falling.length = 0;
		const length = rows * GAP + 0.6;
		bridge = buildBridge({ rows, rowZ, gap: GAP, paneW: PANE_W, paneD: PANE_D, paneX: PANE_X, half: HALF, length, z0: -0.3 });
		scene.add(bridge.group);
		for (const row of bridge.panes) for (const p of row) Object.assign(p, { broken: false, proven: false });
		safe = [];
		for (let i = 0; i < rows; i++) safe.push(Math.random() < 0.5 ? 0 : 1);
		finishEdge = rowZ(rows - 1) - GAP / 2 - 0.2;
		finishPlatform.position.z = finishEdge;
		guards[0].root.position.set(-2.4, 0, finishEdge - 1.2);
		guards[1].root.position.set(2.4, 0, finishEdge - 1.2);
	}

	/* ---------- contestants ---------- */

	let contestants = [];
	let players = 0;

	function Contestant(n) {
		const model = buildContestant(n, PLAYER_COLORS[n]);
		scene.add(model.root);
		return {
			n, model,
			score: 0,
			px: (n + 1) / (players + 1),
			pz: 0.6,
			alive: true,
			crossed: false,
			s: -1,              // where they are along the bridge, in rows (negative: on the start platform)
			target: -1,
			slot: 0,            // their place on the far platform
			pos: new THREE.Vector3(),
			side: 0,            // the side they're eyeing, while it's their turn
			sway: 0,            // -1..1, leaning toward it
			advice: -1,         // waiting: the side they point at (-1 none)
			armed: false,
			hist: [],           // recent pz, to spot a quick step
			jump: null,
			fall: null,
		};
	}

	function revive(c) {
		c.alive = true;
		c.crossed = false;
		c.jump = null;
		c.fall = null;
		c.advice = -1;
		const m = c.model;
		m.root.visible = true;
		m.ring.visible = true;
		m.marker.visible = true;
		m.lean.rotation.set(0, 0, 0);
		m.root.rotation.set(0, 0, 0);
	}

	// A spot to stand on: row j's tempered pane, a place on the start
	// platform (j < 0) or a place on the far one (j >= rows).
	function spotAt(c, j) {
		if (j >= rows) {
			const x = ((c.slot % 3) - 1) * 1.0;
			return new THREE.Vector3(x, 0, finishEdge - 1.4 - Math.floor(c.slot / 3) * 1.2);
		}
		if (j >= 0) return new THREE.Vector3(safe[j] ? PANE_X : -PANE_X, 0, rowZ(j));
		const x = [0, -0.55, 0.55][(-j - 1) % 3];
		return new THREE.Vector3(x, 0, rowZ(j));
	}

	// Part way between spots, with a little hop from pane to pane.
	function spotAlong(c, s) {
		const j0 = Math.floor(s);
		const f = s - j0;
		const p = spotAt(c, j0).lerp(spotAt(c, Math.min(j0 + 1, rows)), f);
		if (f > 0) p.y = 0.3 * Math.sin(Math.PI * f);
		return p;
	}

	const inPlay = (c) => c.alive && !c.crossed;

	/* ---------- the game's state ---------- */

	const sound = createSound();
	const hud = new HUD('#e5287a');
	hud.$el.appendTo(stage.$ui);

	let phase = 'waiting';     // waiting, intro, walk, choose, jump, fall, cross, verdict, over
	let phaseT = 0;
	let phaseDur = 0;
	let clock = 0;
	let playTime = 0;
	let crossing = -1;         // which bridge, 0 or 1
	let order = [];            // the turn order, by contestant
	let active = null;         // whose turn it is
	let frontier = -1;         // the furthest row proven safe
	let jumpLimit = JUMP_SECONDS[0];
	let lastBeep = -1;
	let glint = null;          // { row, side, t }
	let nextGlint = 0;
	let flash = 0;
	let excite = 0;            // the gallery stirs when someone falls
	let survivors = 0;
	let why = '';              // why the last one fell
	const pops = [];           // words that float up: { text, colour, x, y, age }

	function setPhase(p, dur = 0) {
		phase = p;
		phaseT = 0;
		phaseDur = dur;
	}

	function pop(text, colour, at) {
		const s = onFront(at.x, (at.y || 0) + 2.3, at.z);
		pops.push({ text, colour, x: s.x, y: s.y, age: 0 });
	}

	/* ---------- the flow of a game ---------- */

	function initGame(count) {
		players = count;
		rows = rowsFor(count);
		sound.resume();
		sound.drone(true);
		contestants = [];
		for (let i = 0; i < count; i++) contestants.push(Contestant(i));
		sound.say('Glass bridge');
		startCrossing(0);
		camZ = rowZ(rows / 2);
		setPhase('intro', 4);
	}

	// A fresh bridge, everyone on the start platform in turn order.
	function startCrossing(b) {
		crossing = b;
		jumpLimit = JUMP_SECONDS[Math.min(b, JUMP_SECONDS.length - 1)];
		buildCrossing();
		frontier = -1;
		survivors = 0;
		order = contestants.map((c) => c.n);
		if (b % 2 === 1) order.reverse();   // the last to go goes first
		order.forEach(function (n, i) {
			const c = contestants[n];
			revive(c);
			c.s = c.target = -1 - i;
			c.pos.copy(spotAt(c, c.s));
		});
		active = null;
	}

	// The next contestant still on the bridge walks up the lit panes to the
	// last safe one, and the line behind shuffles up.
	function nextTurn() {
		active = order.map((n) => contestants[n]).find(inPlay) || null;
		glint = null;
		if (!active) return endCrossing();
		setTargets();
		setPhase('walk');
	}

	function setTargets() {
		let k = 0;
		for (const n of order) {
			const c = contestants[n];
			if (!inPlay(c) || c === active) continue;
			c.target = frontier - ++k;
		}
		if (active && !active.jump) active.target = frontier;
	}

	function startChoose() {
		const c = active;
		c.side = c.px < 0.5 ? 0 : 1;
		c.armed = c.pz > ARM_Z;
		c.hist = [];
		lastBeep = -1;
		nextGlint = 1.2 + Math.random() * 1.2;
		setPhase('choose', jumpLimit);
	}

	// The side they must jump to, if the next row has only one pane left.
	function forcedSide() {
		const row = bridge.panes[frontier + 1];
		if (!row) return -1;
		if (row[0].broken) return 1;
		if (row[1].broken) return 0;
		return -1;
	}

	function jump(side) {
		const c = active;
		const row = frontier + 1;
		const forced = forcedSide();
		if (forced >= 0) side = forced;
		c.side = side;
		const pane = bridge.panes[row][side];
		c.jump = { row, side, t: 0, from: c.pos.clone(), to: new THREE.Vector3(pane.x, 0, pane.z) };
		glint = null;
		setPhase('jump', JUMP_TIME);
	}

	function land() {
		const c = active;
		const { row, side } = c.jump;
		const pane = bridge.panes[row][side];
		c.jump = null;
		if (side === safe[row]) {
			if (!pane.proven) {
				c.score += ROW_POINTS;
				pop('SAFE', '#7dffd9', pane);
			}
			pane.proven = true;
			frontier = row;
			c.s = c.target = row;
			sound.clink();
			setTargets();
			if (frontier >= rows - 1) startCross();
			else startChoose();
		} else {
			shatter(pane);
			// the pane beside it must be the tempered one
			bridge.panes[row][1 - side].proven = true;
			drop(c, 0);
			setPhase('fall', 2.6);
		}
	}

	// Last row cleared: on to the far platform.
	function startCross() {
		active.slot = survivors++;
		active.target = rows;
		setPhase('cross');
	}

	function crossed() {
		const c = active;
		c.crossed = true;
		c.score += SURVIVE_POINTS;
		sound.ding();
		pop('SURVIVED', '#f7d774', c.pos);
		nextTurn();
	}

	function endCrossing() {
		sound.say(survivors ? `${survivors} survived` : 'Nobody survived');
		setPhase('verdict', 4.5);
	}

	function finiGame() {
		setPhase('over');
		sound.drone(false);
		const scores = contestants.map((c) => c.score);
		stage.timeout(() => IGB.complete(scoresToRewards(scores)), 5000);
	}

	/* ---------- falling ---------- */

	function shatter(pane) {
		pane.broken = true;
		pane.group.visible = false;
		const shards = buildShards(PANE_W, PANE_D);
		shards.position.set(pane.x, 0, pane.z);
		shards.age = 0;
		scene.add(shards);
		falling.push(shards);
		sound.shatter();
	}

	// Into the void. dir pushes them off sideways (when shot).
	function drop(c, dir) {
		c.alive = false;
		why = dir ? 'TIME UP' : 'SHATTERED';
		c.fall = { t: 0, v: new THREE.Vector3(dir * 1.8, dir ? 1.5 : 0.5, 0), spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2) };
		c.model.ring.visible = false;
		c.model.marker.visible = false;
		sound.fall(dir ? 2.1 : 1.8);
		excite = 1;
		setTargets();
	}

	// Out of time: the nearest guard fires.
	function shoot(c) {
		const g = c.pos.x < 0 ? guards[0] : guards[1];
		g.flashT = 0.15;
		sound.gunshot();
		flash = 0.3;
		drop(c, c.pos.x < 0 ? -1 : 1);
		setPhase('fall', 2.6);
	}

	/* ---------- touch: tap a side of the front wall to jump ---------- */

	stage.$el.on('click', function (e) {
		if (phase !== 'choose' || phaseT < MIN_DWELL * 0.5) return;
		const at = IGB.toWorld(e);
		if (at.x < W || at.x >= 2 * W) return;
		jump(at.x < W * 1.5 ? 0 : 1);
	});

	/* ---------- every frame ---------- */

	function simulate(dt) {
		phaseT += dt;
		clock += dt;
		if (phase !== 'waiting' && phase !== 'over' && phase !== 'intro') playTime += dt;

		switch (phase) {
		case 'intro':
			if (phaseT >= phaseDur) nextTurn();
			break;

		case 'walk':
			if (Math.abs(active.s - active.target) < 1e-3) {
				if (frontier >= rows - 1) startCross();
				else startChoose();
			}
			break;

		case 'choose':
			choose(active, dt);
			break;

		case 'jump': {
			const j = active.jump;
			j.t = Math.min(1, phaseT / phaseDur);
			if (j.t >= 1) land();
			break;
		}

		case 'fall':
			if (phaseT >= phaseDur) nextTurn();
			break;

		case 'cross':
			if (active.s >= rows - 1e-3) crossed();
			break;

		case 'verdict':
			if (phaseT >= phaseDur) {
				if (crossing === 0 && playTime < SECOND_BRIDGE_BEFORE) {
					startCrossing(1);
					sound.say('Again');
					setPhase('intro', 2.5);
				} else finiGame();
			}
			break;
		}

		// Everyone still on the bridge walks toward their spot.
		for (const c of contestants) {
			if (c.fall || c.jump || (!c.alive && !c.fall)) continue;
			if (c.s !== c.target) {
				const d = c.target - c.s;
				c.s += Math.sign(d) * Math.min(Math.abs(d), WALK_RATE * dt);
			}
			c.pos.copy(spotAlong(c, c.s));
		}

		// The ones waiting point the way.
		for (const c of contestants) {
			if (!inPlay(c) || c === active) { c.advice = -1; continue; }
			c.advice = c.px < 0.5 - ADVICE_DEAD ? 0 : c.px > 0.5 + ADVICE_DEAD ? 1 : -1;
		}

		for (const c of contestants) pose(c, dt);
		for (const g of guards) {
			g.flashT = Math.max(0, (g.flashT || 0) - dt);
			g.flash.visible = g.flashT > 0;
		}
		for (let i = falling.length - 1; i >= 0; i--) {
			const s = falling[i];
			s.age += dt;
			for (const m of s.shards) {
				m.userData.v.y -= 12 * dt;
				m.position.addScaledVector(m.userData.v, dt);
				m.rotation.x += m.userData.spin.x * dt;
				m.rotation.y += m.userData.spin.y * dt;
				m.rotation.z += m.userData.spin.z * dt;
			}
			if (s.age > 4) {
				scene.remove(s);
				falling.splice(i, 1);
			}
		}

		// the eye follows whoever is on the glass
		let z = camZ;
		if (phase === 'intro') z = rowZ(-1) + BACK;
		else if (active && active.alive) z = active.pos.z + BACK;
		else if (active) z = spotAt(active, frontier).z + BACK;
		camZ += (z - camZ) * Math.min(1, dt * (phase === 'intro' ? 1.1 : 3));

		paintPanes();
		flash = Math.max(0, flash - dt * 1.6);
		excite = Math.max(0, excite - dt * 0.4);
		for (let i = pops.length - 1; i >= 0; i--) {
			pops[i].age += dt;
			if (pops[i].age > 1.4) pops.splice(i, 1);
		}
	}

	// Their turn: lean to a side, then step forward (or tap) to jump.
	function choose(c, dt) {
		if (c.px < 0.5 - SIDE_DEAD) c.side = 0;
		else if (c.px > 0.5 + SIDE_DEAD) c.side = 1;
		const forced = forcedSide();
		if (forced >= 0) c.side = forced;

		c.hist.push({ t: clock, pz: c.pz });
		while (c.hist.length && c.hist[0].t < clock - STEP_WINDOW) c.hist.shift();
		if (c.pz > ARM_Z) c.armed = true;
		const back = Math.max(...c.hist.map((h) => h.pz));
		if (phaseT > MIN_DWELL && ((c.armed && c.pz < COMMIT_Z) || back - c.pz > STEP_DZ)) {
			jump(c.side);
			return;
		}

		// the clock runs down, beeping at the end
		const left = Math.ceil(phaseDur - phaseT);
		if (left <= 5 && left !== lastBeep && left > 0) {
			lastBeep = left;
			sound.beep(left <= 3);
		}
		if (phaseT >= phaseDur) {
			shoot(c);
			return;
		}

		// a glint runs over one of the next row's panes, usually the tempered one
		nextGlint -= dt;
		if (nextGlint <= 0 && forced < 0) {
			const truth = safe[frontier + 1];
			glint = { row: frontier + 1, side: Math.random() < GLINT_TRUTH ? truth : 1 - truth, t: 0 };
			nextGlint = GLINT_EVERY[0] + Math.random() * (GLINT_EVERY[1] - GLINT_EVERY[0]);
			sound.glint();
		}
		if (glint) {
			glint.t += dt;
			if (glint.t > 0.8) glint = null;
		}
	}

	// Lit panes: proven ones glow white-teal; the one the player on the glass
	// is eyeing glows in their colour.
	const colour = new THREE.Color();
	function paintPanes() {
		if (!bridge) return;
		const eyeing = phase === 'choose' && active ? active : null;
		for (const row of bridge.panes) {
			for (const p of row) {
				if (p.broken) continue;
				const next = p.row === frontier + 1 && (phase === 'choose' || phase === 'walk');
				if (eyeing && next && p.side === eyeing.side) {
					const pulse = 0.55 + 0.35 * Math.sin(clock * 9);
					colour.set(PLAYER_COLORS[eyeing.n]);
					p.glassMat.emissive.copy(colour);
					p.glassMat.emissiveIntensity = pulse;
					p.glassMat.opacity = 0.6;
					p.edgeMat.color.copy(colour);
					p.edgeMat.opacity = 1;
				} else if (p.proven) {
					p.glassMat.emissive.setHex(0x5ee8cf);
					p.glassMat.emissiveIntensity = 0.75 + 0.1 * Math.sin(clock * 2 + p.row);
					p.glassMat.opacity = 0.62;
					p.edgeMat.color.setHex(0xe8fffa);
					p.edgeMat.opacity = 1;
				} else {
					p.glassMat.emissive.setHex(0x0d2a36);
					p.glassMat.emissiveIntensity = next ? 2.2 : 1;
					p.glassMat.opacity = next ? 0.45 : 0.36;
					p.edgeMat.color.setHex(0x8fe4ff);
					p.edgeMat.opacity = next ? 0.95 : 0.6;
				}
			}
		}
	}

	function walkPose(model, phase, amount) {
		const swing = Math.sin(phase) * 0.55 * amount;
		model.legs[0].rotation.x = swing;
		model.legs[1].rotation.x = -swing;
		model.arms[0].rotation.x = -swing * 0.8;
		model.arms[1].rotation.x = swing * 0.8;
		model.arms[0].rotation.z = 0;
		model.arms[1].rotation.z = 0;
	}

	function pose(c, dt) {
		const m = c.model;

		if (c.fall) {
			const f = c.fall;
			f.t += dt;
			f.v.y -= 12 * dt;
			c.pos.addScaledVector(f.v, dt);
			m.root.position.copy(c.pos);
			m.lean.rotation.x += f.spin * dt * 0.6;
			m.lean.rotation.z += f.spin * dt * 0.3;
			// arms up as they go
			m.arms[0].rotation.z = -2.6;
			m.arms[1].rotation.z = 2.6;
			if (f.t > 3.5) m.root.visible = false;
			return;
		}
		if (!c.alive) return;

		if (c.jump) {
			const j = c.jump;
			const t = j.t;
			c.pos.lerpVectors(j.from, j.to, t);
			c.pos.y = 0.9 * Math.sin(Math.PI * t);
			m.legs[0].rotation.x = m.legs[1].rotation.x = -0.6 * Math.sin(Math.PI * t);
			m.arms[0].rotation.x = m.arms[1].rotation.x = -1.6 * Math.sin(Math.PI * t);
			m.root.position.copy(c.pos);
			m.lean.rotation.z = 0;
			return;
		}

		const walking = Math.abs(c.target - c.s) > 1e-3;
		walkPose(m, clock * 9, walking ? 1 : 0);

		// Their turn: lean toward the side they're eyeing, arm out that way.
		const s = c === active && phase === 'choose' ? (c.side ? 1 : -1) : c.advice >= 0 ? (c.advice ? 1 : -1) * 0.5 : 0;
		c.sway += (s - c.sway) * Math.min(1, dt * 8);
		m.root.position.copy(c.pos);
		if (c === active && phase === 'choose') m.root.position.x += c.sway * 0.28;
		m.lean.rotation.z = -c.sway * 0.2;
		m.root.rotation.y = 0;
		// pointing: the arm on the side they favour reaches forward and out
		if (c.advice >= 0 || (c === active && phase === 'choose')) {
			const arm = m.arms[c.sway < 0 ? 0 : 1];
			arm.rotation.x = 1.3;
			arm.rotation.z = (c.sway < 0 ? -0.4 : 0.4);
		}
		m.marker.position.y = 2.25 + Math.sin(clock * 3 + c.n) * 0.05;
		m.marker.visible = c === active || phase === 'over' || phase === 'verdict';
	}

	/* ---------- drawing ---------- */

	function render() {
		rig.position.set(0, EYE, camZ);
		rig.updateMatrixWorld(true);

		key.position.set(-4, 14, camZ + 4);
		key.target.position.set(0, 0, camZ - 10);
		key.target.updateMatrixWorld();
		const lit = active && active.alive ? active.pos : new THREE.Vector3(0, 0, camZ - BACK);
		spot.position.set(lit.x * 0.5, 10, lit.z + 1.5);
		spot.target.position.set(lit.x, 0, lit.z);
		spot.target.updateMatrixWorld();

		// the clock on the right wall, opposite the eye
		clock3d.group.position.set(HALL - 0.3, 3.6, camZ);
		const timing = phase === 'choose';
		const left = timing ? Math.max(0, Math.ceil(phaseDur - phaseT)) : phase === 'walk' ? jumpLimit : 0;
		clock3d.set(Math.floor(left / 60), left % 60, timing && left <= 3, !(timing || phase === 'walk'));

		// the gallery watches, and stirs when someone falls
		for (const v of hall.vips) {
			v.head.position.y = 1.1 + Math.sin(clock * 1.5 + v.phase) * 0.02 + excite * 0.06 * Math.sin(clock * 12 + v.phase);
			v.body.rotation.x = -0.15 - excite * 0.25;
		}

		renderer.setScissorTest(true);
		cams.forEach(function (cam, w) {
			viewport(w * W, 0, W, H);
			renderer.render(scene, cam);
		});
	}

	// The 2D layer: who's up and what to do, the waiting players' pointing
	// hands, glints, and the flash of a shot.
	function overlay(ctx) {
		if (phase === 'choose' || phase === 'walk') {
			const row = frontier + 1;
			if (bridge && row < rows) {
				// the pane they're eyeing, outlined in their colour over everything
				// (their own body would hide it otherwise)
				if (phase === 'choose') {
					const p = bridge.panes[row][active.side];
					const col = PLAYER_COLORS[active.n];
					const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => onFront(p.x + u * PANE_W / 2, 0.03, p.z + v * PANE_D / 2));
					art.poly(ctx, corners, { fill: col, alpha: 0.18 + 0.1 * Math.sin(clock * 9) });
					art.poly(ctx, corners, { stroke: col, lineWidth: 7, lineJoin: 'round' });
					const far = onFront(p.x, 0.05, p.z - PANE_D / 2);
					chevron(ctx, far.x, far.y - 10 + Math.sin(clock * 7) * 8, col);
				}
				// the waiting players' hands, beside the pane each would pick,
				// pointing in at it
				for (const side of [0, 1]) {
					const p = bridge.panes[row][side];
					if (p.broken) continue;
					const hands = contestants.filter((c) => c.advice === side);
					const sgn = side ? 1 : -1;
					const at = onFront(p.x + sgn * (PANE_W / 2), 0.05, p.z);
					hands.forEach(function (c, i) {
						const x = at.x + sgn * (48 + i * 56) + Math.sin(clock * 5 + c.n) * 4 * sgn;
						hand(ctx, x, at.y, PLAYER_COLORS[c.n], sgn * 90);
					});
				}
			}
		}

		if (glint && bridge) {
			const p = bridge.panes[glint.row][glint.side];
			const f = glint.t / 0.8;
			const a = onFront(p.x - PANE_W / 2 + PANE_W * f, 0.05, p.z + PANE_D * (0.3 - 0.6 * f));
			sparkle(ctx, a.x, a.y, 40 * Math.sin(Math.PI * f));
		}

		art.eachWall(ctx, function (c, w) {
			if (w === 1) banner(c);
			else {
				// the side walls fall away into the dark
				const g = c.createLinearGradient(0, H * 0.62, 0, H);
				g.addColorStop(0, 'rgba(4,5,9,0)');
				g.addColorStop(1, 'rgba(4,5,9,0.92)');
				art.rect(c, 0, H * 0.62, W, H * 0.38, { fill: g });
			}
			if (w === 2) roster(c);
		});

		for (const p of pops) {
			if (!p.text) continue;
			art.text(ctx, p.text, p.x, p.y - p.age * 110, {
				size: 64, font: 'Paytone One', weight: 400, fill: p.colour, alpha: Math.min(1, 2 * (1.4 - p.age)),
				outline: '#0a0a12', outlineWidth: 7,
			});
		}

		if (flash > 0) art.rect(ctx, 0, 0, WIDTH, H, { fill: `rgba(255,255,255,${flash})` });
	}

	// A small pointing hand in a player's colour, its finger turned by `rotate` degrees from straight down.
	function hand(ctx, x, y, fill, rotate) {
		art.with(ctx, { x, y, rotate }, function (g) {
			art.roundRect(g, -9, -8, 18, 34, 9, { fill, stroke: 'white', lineWidth: 4 });
			art.roundRect(g, -22, -44, 44, 42, 14, { fill, stroke: 'white', lineWidth: 4 });
			art.roundRect(g, -9, -8, 18, 34, 9, { fill });
		});
	}

	function chevron(ctx, x, y, fill) {
		art.poly(ctx, [[x - 46, y - 52], [x, y], [x + 46, y - 52], [x + 22, y - 52], [x, y - 28], [x - 22, y - 52]], { fill, stroke: 'white', lineWidth: 5 });
	}

	function sparkle(ctx, x, y, r) {
		if (r <= 1) return;
		art.poly(ctx, [[x, y - r], [x + r * 0.18, y - r * 0.18], [x + r, y], [x + r * 0.18, y + r * 0.18], [x, y + r], [x - r * 0.18, y + r * 0.18], [x - r, y], [x - r * 0.18, y - r * 0.18]],
			{ fill: 'rgba(255,255,255,0.95)', shadow: { color: '#bff4ff', blur: 24 } });
	}

	// Under the clock: every contestant's number, lit while they're in, gold
	// once across, dark once fallen, in turn order.
	function roster(c) {
		if (!order.length) return;
		const y = 580;
		const step = Math.min(220, 1300 / order.length);
		order.forEach(function (n, i) {
			const p = contestants[n];
			const x = W / 2 + (i - (order.length - 1) / 2) * step;
			const up = p === active && inPlay(p);
			const fill = p.crossed ? '#f7d774' : p.alive ? PLAYER_COLORS[n] : '#2a2d36';
			art.with(c, { x, y, scale: up ? 1.15 + 0.05 * Math.sin(clock * 6) : 1 }, function (g) {
				art.roundRect(g, -90, -46, 180, 92, 20, { fill, stroke: up ? 'white' : 'rgba(255,255,255,0.35)', lineWidth: up ? 7 : 3 });
				art.text(g, NUMBERS[n], 0, 3, { size: 54, font: 'Paytone One', weight: 400, fill: p.alive || p.crossed ? 'white' : '#555a66', outline: '#0a0a12', outlineWidth: 4 });
				if (!p.alive && !p.crossed) art.line(g, [[-70, 30], [70, -30]], { stroke: '#ff3a5c', lineWidth: 8 });
			});
		});
	}

	// Across the top of the front wall: whose turn, and what to do.
	function banner(c) {
		const big = { font: 'Paytone One', weight: 400, fill: 'white', outline: '#05060a', outlineWidth: 7 };
		const y = 74;
		switch (phase) {
		case 'waiting':
		case 'intro':
			art.text(c, crossing > 0 ? 'BRIDGE 2' : 'GLASS BRIDGE', W / 2, y + 10, Object.assign({}, big, { size: 92, fill: '#bff4ff' }));
			break;
		case 'walk':
		case 'choose':
		case 'jump': {
			const col = PLAYER_COLORS[active.n];
			art.roundRect(c, W / 2 - 330, y - 50, 660, 100, 50, { fill: 'rgba(6,8,14,0.72)', stroke: col, lineWidth: 6 });
			art.circle(c, W / 2 - 280, y, 40, { fill: col, stroke: 'white', lineWidth: 4 });
			art.text(c, NUMBERS[active.n], W / 2 - 280, y + 2, Object.assign({}, big, { size: 30, outlineWidth: 4 }));
			const text = phase === 'choose' ? (forcedSide() >= 0 ? 'STEP TO JUMP' : 'LEFT OR RIGHT?') : phase === 'jump' ? '...' : 'YOUR TURN';
			art.text(c, text, W / 2 + 30, y + 2, Object.assign({}, big, { size: 54 }));
			if (phase === 'choose') {
				const frac = Math.max(0, 1 - phaseT / phaseDur);
				art.roundRect(c, W / 2 - 230, y + 62, 460, 14, 7, { fill: 'rgba(255,255,255,0.18)' });
				art.roundRect(c, W / 2 - 230, y + 62, Math.max(14, 460 * frac), 14, 7, { fill: frac < 0.3 ? '#ff3a5c' : col });
				if (phaseT > 2.5 && forcedSide() < 0) {
					art.text(c, 'STEP FORWARD TO JUMP', W / 2, y + 118, Object.assign({}, big, { size: 40, alpha: 0.6 + 0.4 * Math.sin(clock * 5) }));
				}
			}
			break;
		}
		case 'fall':
			art.text(c, why, W / 2, y, Object.assign({}, big, { size: 80, fill: '#ff3a5c' }));
			break;
		case 'cross':
			art.text(c, 'ACROSS!', W / 2, y, Object.assign({}, big, { size: 80, fill: '#f7d774' }));
			break;
		case 'verdict': {
			const text = survivors === contestants.length ? 'EVERYONE SURVIVED' : survivors ? `${survivors} SURVIVED` : 'NOBODY SURVIVED';
			art.text(c, text, W / 2, y, Object.assign({}, big, { size: 80, fill: '#f7d774' }));
			break;
		}
		case 'over': {
			art.text(c, 'GAME OVER', W / 2, y, Object.assign({}, big, { size: 80 }));
			contestants.forEach(function (p, i) {
				const x = W / 2 + (i - (contestants.length - 1) / 2) * 130;
				art.circle(c, x, y + 120, 50, { fill: PLAYER_COLORS[p.n], stroke: 'white', lineWidth: 5 });
				art.text(c, String(p.score), x, y + 122, Object.assign({}, big, { size: 48 }));
			});
			break;
		}
		}
	}

	let last;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		if (phase !== 'waiting') simulate(dt);
		sound.tick();
		render();
		overlay(ctx);
	};

	/* ---------- input ---------- */

	self.setPlayers = function (p) {
		contestants.forEach(function (c, i) {
			if (!p[i]) return;
			c.px = Math.max(0, Math.min(1, p[i].px));
			c.pz = Math.max(0, Math.min(1, p[i].pz === undefined ? 0.6 : 1 - p[i].pz));   // pz arrives 1 at the front wall, 0 at the back; this game counts from the front
		});
	};

	// For tests and the console: where the game is up to.
	self.state = function () {
		return {
			phase, phaseT, crossing, rows, frontier, playTime, jumpLimit,
			active: active ? active.n : -1,
			order: order.slice(),
			safe: safe.slice(),
			broken: bridge ? bridge.panes.map((r) => r.map((p) => p.broken)) : [],
			proven: bridge ? bridge.panes.map((r) => r.map((p) => p.proven)) : [],
			glint: glint ? { row: glint.row, side: glint.side } : null,
			contestants: contestants.map((c) => ({
				n: c.n, alive: c.alive, crossed: c.crossed, s: c.s, side: c.side, advice: c.advice, score: c.score,
				x: c.pos.x, y: c.pos.y, z: c.pos.z,
			})),
		};
	};

	self.fini = function () {
		sound.drone(false);
		sound.close();
		unlisten();
		renderer.dispose();
		renderer.forceContextLoss();
	};

	/* ---------- go ---------- */

	if (playersMeta) stage.timeout(() => initGame(playersMeta.length));
	else hud.initPlayerCount(function (count) {
		initGame(count);
		stage.timeout(() => hud.$el.remove(), 1500);   // the squad picker is the only HUD
	});
});
