/*
 * The home screen's backdrop: an open-plan office drawn as a blueprint, in
 * 3D, wrapping round all three walls. White linework on blueprint blue,
 * fading into the distance, drawn in from the nearest lines outward each
 * time the menu appears, with the view swaying gently.
 *
 * One camera rig stands in the middle of the office floor; each wall gets
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
	scene.fog = new THREE.Fog(BLUE, 5, 30);

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
		const cam = new THREE.PerspectiveCamera(fov, W / H, 0.1, 60);
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

// Line segments for the whole office, sorted nearest first so drawing in
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

	// a cylinder: rings top and bottom, a few uprights
	function cyl(cx, y0, cz, r, h, n = 16, ups = 4, out = ink) {
		const ring = (y) => {
			for (let i = 0; i < n; i++) {
				const a = i / n * Math.PI * 2;
				const b = (i + 1) / n * Math.PI * 2;
				seg(out, [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r], [cx + Math.cos(b) * r, y, cz + Math.sin(b) * r]);
			}
		};
		ring(y0);
		ring(y0 + h);
		for (let i = 0; i < ups; i++) {
			const a = i / ups * Math.PI * 2;
			seg(out, [cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r], [cx + Math.cos(a) * r, y0 + h, cz + Math.sin(a) * r]);
		}
	}

	const turn = (cx, cz, yaw) => (x, z) => [cx + x * Math.cos(yaw) + z * Math.sin(yaw), cz - x * Math.sin(yaw) + z * Math.cos(yaw)];

	// a desk with its monitor and chair, the sitter facing +z before turning
	function desk(cx, cz, yaw) {
		const at = turn(cx, cz, yaw);
		const [tx, tz] = at(0, 0);
		box(tx, 0.72, tz, 1.5, 0.04, 0.75, yaw);
		for (const [lx, lz] of [[-0.7, -0.33], [0.7, -0.33], [-0.7, 0.33], [0.7, 0.33]]) {
			const [x, z] = at(lx, lz);
			seg(ink, [x, 0, z], [x, 0.72, z]);
		}
		const [mx, mz] = at(0, -0.2);
		box(mx, 0.98, mz, 0.6, 0.36, 0.03, yaw);
		seg(ink, [mx, 0.76, mz], [mx, 0.98, mz]);
		const [kx, kz] = at(0, 0.1);
		box(kx, 0.76, kz, 0.45, 0.02, 0.15, yaw);
		// the chair, pulled out a little
		const [cx2, cz2] = at(0.05, 0.75);
		box(cx2, 0.45, cz2, 0.5, 0.06, 0.48, yaw);
		const [bx, bz] = at(0.05, 0.98);
		box(bx, 0.55, bz, 0.46, 0.5, 0.05, yaw);
		seg(ink, [cx2, 0.08, cz2], [cx2, 0.45, cz2]);
		for (let i = 0; i < 5; i++) {
			const a = i / 5 * Math.PI * 2;
			seg(ink, [cx2, 0.08, cz2], [cx2 + Math.cos(a) * 0.3, 0.03, cz2 + Math.sin(a) * 0.3]);
		}
	}

	// a bank of desks, two facing rows with a low screen between
	function bank(cx, cz, n, yaw = 0) {
		const at = turn(cx, cz, yaw);
		for (let i = 0; i < n; i++) {
			const x = (i - (n - 1) / 2) * 1.6;
			const [ax, az] = at(x, 0.42);
			desk(ax, az, yaw);
			const [bx, bz] = at(x, -0.42);
			desk(bx, bz, yaw + Math.PI);
		}
		const [sx, sz] = at(0, 0);
		box(sx, 0.72, sz, n * 1.6, 0.45, 0.04, yaw);
	}

	function plant(x, z, h = 1.1) {
		cyl(x, 0, z, 0.22, 0.4, 12, 4);
		const leaves = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.42, 1));
		const p = leaves.attributes.position.array;
		for (let i = 0; i < p.length; i += 6) {
			seg(ink, [x + p[i], 0.4 + h * 0.5 + p[i + 1] * 1.2, z + p[i + 2]], [x + p[i + 3], 0.4 + h * 0.5 + p[i + 4] * 1.2, z + p[i + 5]]);
		}
	}

	const X = 16;      // half the floor, across
	const Z = 15;      // half the floor, deep
	const TALL = 3.2;

	// floor and ceiling grids
	for (let i = -X; i <= X; i++) seg(i % 5 ? faint : ink, [i, 0, -Z], [i, 0, Z]);
	for (let j = -Z; j <= Z; j++) seg(j % 5 ? faint : ink, [-X, 0, j], [X, 0, j]);
	for (let i = -X; i <= X; i += 1.2) seg(faint, [i, TALL, -Z], [i, TALL, Z]);
	for (let j = -Z; j <= Z; j += 1.2) seg(faint, [-X, TALL, j], [X, TALL, j]);

	// the shell
	box(0, 0, 0, 2 * X, TALL, 2 * Z);

	// windows along the front and the sides: sill, head, mullions
	const glazing = (from, to, fixed, along) => {
		for (const y of [0.9, 2.7]) seg(ink, along(from, y, fixed), along(to, y, fixed));
		for (let u = from; u <= to + 1e-6; u += 1.5) seg(ink, along(u, 0.9, fixed), along(u, 2.7, fixed));
	};
	glazing(-X + 1, X - 1, -Z, (u, y, f) => [u, y, f]);
	glazing(-Z + 1, Z - 6, -X, (u, y, f) => [f, y, u]);
	glazing(-Z + 1, Z - 6, X, (u, y, f) => [f, y, u]);

	// structural columns
	for (const x of [-8, 0, 8]) for (const z of [-7.5, 0, 7.5]) if (!(x === 0 && z === 0)) box(x, 0, z, 0.5, TALL, 0.5);

	// ceiling light panels
	for (let x = -12; x <= 12; x += 4) for (let z = -12; z <= 12; z += 4) box(x, TALL - 0.04, z, 1.2, 0.04, 0.6);

	// desk banks
	bank(-4, -4, 3);
	bank(4, -4, 3);
	bank(-4, 4, 3);
	bank(4, 4, 3);
	bank(12, -10, 2, Math.PI / 2);
	bank(12, 2, 2, Math.PI / 2);

	// the meeting room on the left: glass walls, a door gap, a table and chairs
	const mr = { x: -11.5, z: -6, w: 7, d: 6 };
	box(mr.x, 0, mr.z, mr.w, TALL, mr.d);
	for (let u = -mr.d / 2; u <= mr.d / 2; u += 1) seg(faint, [mr.x + mr.w / 2, 0, mr.z + u], [mr.x + mr.w / 2, TALL, mr.z + u]);
	box(mr.x, 0.72, mr.z, 3.6, 0.05, 1.4);
	for (const sx of [-1.2, 0, 1.2]) for (const sz of [-1, 1]) {
		box(mr.x + sx, 0.45, mr.z + sz * 1.1, 0.48, 0.06, 0.48);
		box(mr.x + sx, 0.5, mr.z + sz * 1.33, 0.46, 0.45, 0.05);
	}
	box(mr.x - mr.w / 2 + 0.05, 1.0, mr.z, 0.05, 1.1, 2.0);   // the screen on its wall

	// the kitchen on the right: counter, island, stools, fridge
	box(X - 0.35, 0, 9, 0.7, 0.9, 6);
	box(X - 0.35, 1.5, 9, 0.4, 0.7, 6);
	box(11, 0, 10, 2.6, 0.95, 1.1);
	for (let i = 0; i < 3; i++) cyl(10.1 + i * 0.9, 0, 11.1, 0.18, 0.7, 10, 3);
	box(X - 0.45, 0, 13.4, 0.9, 2.0, 0.8);

	// the back: lift lobby doors and storage
	for (const x of [-3, 3]) {
		box(x, 0, Z - 0.05, 1.8, 2.4, 0.1);
		seg(ink, [x, 0, Z - 0.1], [x, 2.4, Z - 0.1]);
	}
	for (let i = 0; i < 5; i++) box(-12 + i * 1.0, 0, Z - 0.4, 0.9, 1.3, 0.6);

	// a breakout corner: sofa, coffee table, rug
	box(-11, 0, 8, 3, 0.45, 1, 0);
	box(-11, 0.45, 8.45, 3, 0.4, 0.15);
	box(-11, 0, 6.6, 1.4, 0.38, 0.7);
	box(-11, 0.005, 7.3, 4, 0.01, 3, 0, faint);
	for (const [x, z] of [[-14.8, -13.8], [14.8, -13.8], [-6.5, 9.5], [0, -9], [7.2, 9.5], [-14.8, 2]]) plant(x, z);

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
		'<span>OPEN-PLAN OFFICE &middot; LEVEL 1</span>' +
		'<span><i>SCALE</i> 1:50</span><span><i>SHEET</i> A-101</span>'
	);
}
