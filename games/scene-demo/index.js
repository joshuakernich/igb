/*
 * Studio Scene
 *
 * The working example of a game built on a scene made in the IGB Studio
 * (studio.html). Everything you see comes from assets/scene-demo/scenes/main.json:
 * the stage, the characters, the lights, the sky, the fog, the bloom and where
 * the wall cameras stand. The code only adds behaviour:
 *
 *   - every player is a copy of the scene's Player template (the mannequin),
 *     in their colour, on the stage: the Room marker is the box mapped onto the
 *     scene (its scale is how big), so they walk round it as they walk round the box
 *     (idle / walk / jog by how fast they go, a crouch when they squat)
 *   - anything tagged 'spin' turns; anything tagged 'bob' floats
 *
 * Open the Studio with this game playing in another tab and every edit there
 * shows here at once (loadScene's live: true).
 * An ES module (manifest: module: true).
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig } from '../../lib/three/walls.js';
import { loadScene } from '../../lib/three/igb-scene.js';

const SCENE = 'assets/scene-demo/scenes/main.json';

IGB.register('scene-demo', function SceneDemo(stage) {

	const self = this;
	const { W, H, WIDTH } = IGB;
	const art = IGB.art;

	/* ---------- renderer and walls (the scene sets how they look) ---------- */

	const renderer = new THREE.WebGLRenderer({ antialias: false });
	$(renderer.domElement).css({ position: 'absolute', left: 0, top: 0, width: WIDTH + 'px', height: H + 'px' }).appendTo(stage.$bg);
	const scene = new THREE.Scene();
	const walls = createWallRig({ fov: 64, aspect: W / H, near: 0.05, far: 2000 });
	scene.add(walls.rig);
	let post = null;
	function resize() {
		const k = Math.min(IGB.scale * IGB.pixelRatio, IGB.maxK);
		renderer.setPixelRatio(1);
		renderer.setSize(Math.round(WIDTH * k), Math.round(H * k), false);
		if (post) post.setSize();
	}
	const unlisten = IGB.onResize(resize);
	resize();
	post = createWallComposer(renderer, scene);

	/* ---------- the scene ---------- */

	let s = null, failed = '', gone = false;
	let room = null, spinners = [], bobbers = [];
	const figures = [];   // one per player: { obj, x, z, speed, face, clip }

	loadScene(SCENE, { renderer, live: true }).then((loaded) => {
		if (gone) { loaded.dispose(); return; }
		s = loaded;
		scene.add(s.root);
		setup();
		s.onReload(setup);   // (the Studio changed it: the old objects are gone, find them again)
	}).catch((e) => { failed = String(e.message || e); console.error(e); });

	function setup() {
		s.applyRender(scene, post);
		s.applyRig(walls);
		room = s.find('Room');
		spinners = s.findAll('spin');
		bobbers = s.findAll('bob').map((o) => ({ o, y: o.position.y, phase: Math.random() * 6 }));
		for (const f of figures) if (f && f.obj.parent) f.obj.parent.remove(f.obj);
		figures.length = 0;
	}

	// tracking (px left→right, pz back→front, py high→low) to a spot in the Room marker
	function roomSpot(p) {
		const c = room ? room.position : new THREE.Vector3();
		const sx = room ? room.scale.x : 3.6, sz = room ? room.scale.z : 3.6;
		return { x: c.x + (p.px - 0.5) * sx, z: c.z + (0.5 - p.pz) * sz, y: c.y };
	}

	function figure(i) {
		if (figures[i] || !s) return figures[i];
		const colour = '#' + new THREE.Color(PLAYER_COLORS[i % PLAYER_COLORS.length]).getHexString();
		const obj = s.instantiate('Player', (n) => { if (n.model) n.model.tint = colour; });
		if (!obj) return null;
		s.root.add(obj);
		return (figures[i] = { obj, x: 0, z: 0, speed: 0, face: 0, clip: '', placed: false });
	}

	let latest = [];
	// (the tracker's last entry can be the wand, not a person: it has no 'look')
	self.setPlayers = function (players) {
		latest = (players || []).filter((p, i, all) => p && !(i === all.length - 1 && i > 0 && p.look === undefined && all[0].look !== undefined));
	};

	/* ---------- every frame ---------- */

	let last, clock = 0;
	self.draw = function (ctx, time) {
		const now = (time || performance.now()) / 1000;
		const dt = last === undefined ? 0 : Math.min(0.05, Math.max(0, now - last));
		last = now;
		clock += dt;

		if (s) {
			s.update(dt);
			for (const o of spinners) o.rotation.y += dt * 0.8;
			for (const b of bobbers) b.o.position.y = b.y + Math.sin(clock * 1.6 + b.phase) * 0.12;
			latest.forEach((p, i) => {
				if (!p) return;
				const f = figure(i);
				if (!f) return;
				const to = roomSpot(p);
				if (!f.placed) { f.x = to.x; f.z = to.z; f.placed = true; }
				const dx = to.x - f.x, dz = to.z - f.z;
				const k = Math.min(1, dt * 10);
				f.x += dx * k; f.z += dz * k;
				const v = dt > 0 ? Math.hypot(dx * k, dz * k) / dt : 0;
				f.speed += (v - f.speed) * Math.min(1, dt * 6);
				if (f.speed > 0.3) f.face = Math.atan2(dx, dz);
				f.obj.position.set(f.x, to.y, f.z);
				let d = f.face - f.obj.rotation.y;
				d = Math.atan2(Math.sin(d), Math.cos(d));
				f.obj.rotation.y += d * Math.min(1, dt * 8);
				const clip = p.py > 0.62 ? 'Crouch_Idle_Loop' : f.speed > 2.2 ? 'Jog_Fwd_Loop' : f.speed > 0.25 ? 'Walk_Loop' : 'Idle_Loop';
				if (clip !== f.clip && s.play(f.obj, clip, { fade: 0.25 })) f.clip = clip;
			});
		}
		post.render(walls.views(renderer.domElement.width, renderer.domElement.height));

		ctx.clearRect(0, 0, WIDTH, H);
		if (failed) art.text(ctx, 'COULD NOT LOAD THE SCENE: ' + failed, W * 1.5, H / 2, { size: 34, font: 'Paytone One', weight: 400, fill: '#ff6b6b' });
		else if (!s) art.text(ctx, 'LOADING…', W * 1.5, H / 2, { size: 40, font: 'Paytone One', weight: 400, fill: 'white' });
		art.text(ctx, 'MADE IN IGB STUDIO  ·  studio.html?scene=' + SCENE, W * 1.5, 960, { size: 24, font: 'Paytone One', weight: 400, fill: 'rgba(255,255,255,0.55)' });
	};

	self.state = () => ({ loaded: !!s, failed, players: figures.filter(Boolean).length, objects: s ? s.byId.size : 0 });

	self.fini = function () {
		gone = true;
		unlisten();
		if (s) s.dispose();
		post.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	};
});
