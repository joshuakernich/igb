/*
 * The home screen's backdrop: a vast, empty office floor drawn as a
 * blueprint, in 3D, wrapping round all three walls. White linework on
 * blueprint blue, fading into the distance, drawn in from the nearest lines
 * outward each time the menu appears, with the view swaying gently.
 *
 * One camera rig stands in the middle of the floor; each wall gets
 * its own camera turned 90 degrees from the next, so the three views meet
 * seamlessly at the corners. It only renders while the menu is showing.
 */
import * as THREE from '../lib/three/three.module.min.js';

const W = 1600;                 // a wall, in world units
const H = 1000;
const BLUE = 0x0f3a78;          // the paper
const INK = 0xdcefff;           // the lines
const EYE = 1.6;                // camera height, metres
const DRAW_IN = 2.6;            // seconds to draw the plan in
const SWAY = { yaw: 0.07, period: 46, drift: 0.6 };   // radians, seconds, metres

$(function () {
	const $igb = $('igb');
	const $world = $('igb-world');

	const $bg = $('<igb-home-bg>').prependTo($world);
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setClearColor(BLUE);
	$bg.append(renderer.domElement);
	for (let wall = 0; wall < 3; wall++) $("<igb-sheet>").css({ left: wall * W + 28 }).appendTo($bg);
	$bg.append(titleBlock());

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog(BLUE, 8, 75);

	const ink = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85, fog: true });
	const faint = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.22, fog: true });
	const plan = build();
	const lines = new THREE.LineSegments(plan.ink, ink);
	const grid = new THREE.LineSegments(plan.faint, faint);
	scene.add(lines, grid);

	// One camera per wall: left looks along -x, front along -z, right along +x.
	const rig = new THREE.Object3D();
	rig.position.set(0, EYE, 2);
	scene.add(rig);
	const fov = 2 * Math.atan(Math.tan(Math.PI / 4) / (W / H)) * 180 / Math.PI;   // 90 degrees across
	const cams = [Math.PI / 2, 0, -Math.PI / 2].map((yaw) => {
		const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
		cam.rotation.y = yaw;
		rig.add(cam);
		return cam;
	});

	function resize() {
		// as sharp as the screen shows it, and no sharper
		const k = Math.max(0.3, Math.min(1, window.innerWidth / (3 * W) * (window.devicePixelRatio || 1)));
		renderer.setPixelRatio(k);
		renderer.setSize(3 * W, H);   // world units; the launcher scales the world
	}
	$(window).on('resize', resize);
	resize();

	let frame = 0;
	let shownAt = 0;
	function render(now) {
		frame = requestAnimationFrame(render);
		const t = (now - shownAt) / 1000;
		// drawn in, nearest lines first
		const k = Math.min(1, t / DRAW_IN);
		const e = 1 - Math.pow(1 - k, 3);
		lines.geometry.setDrawRange(0, Math.floor(plan.inkCount * e) * 2);
		grid.geometry.setDrawRange(0, Math.floor(plan.faintCount * e) * 2);
		const phase = (now / 1000) / SWAY.period * Math.PI * 2;
		rig.rotation.y = Math.sin(phase) * SWAY.yaw;
		rig.position.z = 2 + Math.sin(phase * 0.5) * SWAY.drift;
		renderer.setScissorTest(true);
		cams.forEach((cam, wall) => {
			renderer.setViewport(wall * W, 0, W, H);
			renderer.setScissor(wall * W, 0, W, H);
			renderer.render(scene, cam);
		});
	}

	// Only while the menu is up.
	function sync() {
		const home = $igb.hasClass('home');
		if (home && !frame) {
			shownAt = performance.now();
			frame = requestAnimationFrame(render);
		} else if (!home && frame) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	}
	new MutationObserver(sync).observe($igb[0], { attributes: true, attributeFilter: ['class'] });
	sync();
});

/* ---------- the plan ---------- */

// Line segments for the whole floor: grids, the shell and its windows, sorted nearest first so drawing in
// spreads outward from the viewer. Units are metres; y is up, the front
// wall is toward -z.
function build() {
	const ink = [];
	const faint = [];
	const seg = (out, a, b) => out.push([a, b]);

	// a box, turned `yaw` about its vertical axis, standing on y0
	function box(cx, y0, cz, w, h, d, yaw = 0, out = ink) {
		const c = Math.cos(yaw);
		const s = Math.sin(yaw);
		const corner = (sx, sy, sz) => {
			const x = sx * w / 2;
			const z = sz * d / 2;
			return [cx + x * c + z * s, y0 + (sy > 0 ? h : 0), cz - x * s + z * c];
		};
		const v = [];
		for (const sy of [-1, 1]) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) v.push(corner(sx, sy, sz));
		for (let i = 0; i < 4; i++) {
			seg(out, v[i], v[(i + 1) % 4]);
			seg(out, v[4 + i], v[4 + (i + 1) % 4]);
			seg(out, v[i], v[4 + i]);
		}
	}

	const X = 60;      // half the floor, across
	const Z = 60;      // half the floor, deep
	const TALL = 6;

	// floor and ceiling grids
	for (let i = -X; i <= X; i++) seg(i % 5 ? faint : ink, [i, 0, -Z], [i, 0, Z]);
	for (let j = -Z; j <= Z; j++) seg(j % 5 ? faint : ink, [-X, 0, j], [X, 0, j]);
	for (let i = -X; i <= X; i += 1.2) seg(faint, [i, TALL, -Z], [i, TALL, Z]);
	for (let j = -Z; j <= Z; j += 1.2) seg(faint, [-X, TALL, j], [X, TALL, j]);

	// the shell
	box(0, 0, 0, 2 * X, TALL, 2 * Z);

	// windows along the front and the sides: sill, head, mullions
	const glazing = (from, to, fixed, along) => {
		for (const y of [1.0, 5.2]) seg(ink, along(from, y, fixed), along(to, y, fixed));
		for (let u = from; u <= to + 1e-6; u += 3) seg(ink, along(u, 1.0, fixed), along(u, 5.2, fixed));
	};
	glazing(-X + 2, X - 2, -Z, (u, y, f) => [u, y, f]);
	glazing(-Z + 2, Z - 2, -X, (u, y, f) => [f, y, u]);
	glazing(-Z + 2, Z - 2, X, (u, y, f) => [f, y, u]);

	// nearest first, from where the camera stands
	const eye = new THREE.Vector3(0, EYE, 2);
	const near = (s) => Math.min(eye.distanceToSquared(new THREE.Vector3(...s[0])), eye.distanceToSquared(new THREE.Vector3(...s[1])));
	const pack = (list) => {
		list.sort((a, b) => near(a) - near(b));
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap((s) => [...s[0], ...s[1]]), 3));
		return g;
	};
	return { ink: pack(ink), inkCount: ink.length, faint: pack(faint), faintCount: faint.length };
}

// The drawing's title block, in the right wall's bottom corner.
function titleBlock() {
	return $('<igb-title-block>').html(
		'<b>IMMERSIVE GAMEBOX</b>' +
		'<span>OPEN FLOOR &middot; LEVEL 1</span>' +
		'<span><i>SCALE</i> 1:500</span><span><i>SHEET</i> A-101</span>'
	);
}
