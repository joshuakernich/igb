/*
 * IGB Studio: edit a game's 3D scenes the way you would in Unity.
 *
 *   Hierarchy (left)   every object; drag to re-parent, double-click to rename,
 *                      the eye hides; Scene Settings and Wall Cameras at the top
 *   Viewport (middle)  the scene view (orbit: left drag, pan: right drag, zoom:
 *                      wheel; W/E/R move, rotate, scale) and, under it, the
 *                      game's three walls exactly as the game draws them
 *                      (same cameras, bloom and tone mapping)
 *   Inspector (right)  the selected object's transform and components
 *   Assets (bottom)    the game's models and textures; drag one into the
 *                      scene; drop files anywhere to import them
 *
 * A scene is assets/<game>/scenes/<name>.json; lib/three/igb-scene.js builds
 * it, here and in the game, so they always match. Every edit is sent to any
 * open hub tab running the game (BroadcastChannel 'igb-studio'), so a running
 * game updates as you work.
 */
import * as THREE from '../../lib/three/three.module.min.js';
import { OrbitControls } from '../../lib/three/addons/controls/OrbitControls.js';
import { TransformControls } from '../../lib/three/addons/controls/TransformControls.js';
import { createWallComposer, createWallRig } from '../../lib/three/walls.js';
import {
	IGBScene, emptyScene, normalize, walk, newId, applyTransform, setContent, buildNode, editorShowsTemplates,
	ENVIRONMENTS, TONE_MAPPINGS, SHAPES, PREFABS, prefabParams, loadGLTF, forget,
} from '../../lib/three/igb-scene.js';
import { store, importFiles, isModel, isTexture } from './store.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const DEG = Math.PI / 180;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const r2 = (v) => Math.round(v * 100) / 100;
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

editorShowsTemplates(true);

/* ---------- state ---------- */

const S = {
	project: 'scene-demo',
	path: '',              // the scene file (project-relative)
	doc: emptyScene(),
	live: null,            // the IGBScene built from doc
	sel: null,             // a node id, or '#render' / '#rig'
	dirty: false,
	undo: [], redo: [], lastTouch: 0,
	tool: 'translate', space: 'local', snap: false, animate: true, view: 'split',
	expanded: new Set(),
	assets: [],            // [{ path, kind }]
	selAsset: null,
	errors: 0,
};

/* ---------- console ---------- */

function log(msg, level = 'info') {
	const d = document.createElement('div');
	d.className = level;
	d.textContent = new Date().toLocaleTimeString() + '  ' + msg;
	const c = $('#console');
	c.appendChild(d);
	c.scrollTop = c.scrollHeight;
	if (level === 'error') { S.errors++; $('#errCount').textContent = S.errors; }
	(level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)('[studio]', msg);
}
window.addEventListener('error', (e) => log(e.message, 'error'));
window.addEventListener('unhandledrejection', (e) => log(String(e.reason && e.reason.message || e.reason), 'error'));

/* ---------- renderer, editor camera, the wall rig ---------- */

const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
const editorCam = new THREE.PerspectiveCamera(50, 1, 0.05, 2000);
editorCam.position.set(7, 6, 9);
const sceneHit = $('#sceneHit'), gameHit = $('#gameHit');
const orbit = new OrbitControls(editorCam, sceneHit);
orbit.target.set(0, 1, -2);
orbit.enableDamping = true;
orbit.dampingFactor = 0.15;
orbit.update();

const post = createWallComposer(renderer, scene, { strength: 0.5, radius: 0.5, threshold: 0.9 });
const walls = createWallRig({ fov: 64, aspect: 1.6, near: 0.05, far: 2000 });
scene.add(walls.rig);

// editor-only things: hidden while the game's walls are drawn
const editorOnly = new THREE.Group();
scene.add(editorOnly);
const grid = new THREE.GridHelper(40, 40, 0x4a5368, 0x2a2f3a);
grid.material.transparent = true;
grid.material.opacity = 0.6;
editorOnly.add(grid);
const selBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffb02e);
selBox.visible = false;
editorOnly.add(selBox);

const gizmo = new TransformControls(editorCam, sceneHit);
const gizmoHelper = gizmo.getHelper();
scene.add(gizmoHelper);
gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; if (e.value) touch(true); else { refreshInspectorTransform(); sendLive(); } });
gizmo.addEventListener('objectChange', onGizmoChange);

// the wall cameras, drawn as three frustums you can move and turn like an object
const rigGizmo = new THREE.Group();
rigGizmo.name = 'Wall Cameras';
rigGizmo.rotation.order = 'YXZ';
editorOnly.add(rigGizmo);
function drawRigGizmo() {
	for (const c of [...rigGizmo.children]) { rigGizmo.remove(c); c.geometry.dispose(); }
	const fov = S.doc.rig.fov * DEG, d = 1.6, h = Math.tan(fov / 2) * d, w = h * 1.6;
	const colours = [0x3ad1ff, 0xffd23f, 0xff5fd0];
	[90, 0, -90].forEach((yaw, i) => {
		const pts = [], c = [[-w, -h], [w, -h], [w, h], [-w, h]];
		for (const [x, y] of c) pts.push(0, 0, 0, x, y, -d);
		for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; pts.push(a[0], a[1], -d, b[0], b[1], -d); }
		pts.push(-w * 0.3, h * 1.05, -d, 0, h * 1.35, -d, 0, h * 1.35, -d, w * 0.3, h * 1.05, -d);   // (which way is up)
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
		const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: colours[i] }));
		l.rotation.y = yaw * DEG;
		rigGizmo.add(l);
	});
	const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
	ball.userData.pickId = '#rig';
	rigGizmo.add(ball);
}
function placeRigGizmo() {
	const g = S.doc.rig;
	rigGizmo.position.fromArray(g.position);
	rigGizmo.rotation.set(g.pitch * DEG, g.yaw * DEG, 0, 'YXZ');
}

// little icons for things with nothing to see (lights, markers, empties)
const iconTex = new Map();
function iconTexture(ch, colour) {
	const key = ch + colour;
	if (iconTex.has(key)) return iconTex.get(key);
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const g = c.getContext('2d');
	g.fillStyle = 'rgba(20,24,32,0.85)';
	g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
	g.strokeStyle = colour; g.lineWidth = 4; g.stroke();
	g.fillStyle = colour; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
	g.fillText(ch, 32, 34);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	iconTex.set(key, t);
	return t;
}
const ICONS = { light: ['☀', '#ffd23f'], marker: ['◆', '#5ad1ff'], group: ['▣', '#9aa4b8'], prefab: ['☺', '#b9a6ff'], model: ['◇', '#ff9a2b'] };
const icons = new Map();   // node id → sprite
function syncIcons() {
	for (const s of icons.values()) editorOnly.remove(s);
	icons.clear();
	walk(S.doc.objects, (n) => {
		if (!['light', 'marker', 'group'].includes(n.type)) return;
		const [ch, col] = n.type === 'light' && n.light && n.light.kind === 'point' ? ['●', '#ffd23f'] : ICONS[n.type];
		const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(ch, col), depthTest: false, sizeAttenuation: false }));
		sp.scale.setScalar(0.035);
		sp.renderOrder = 999;
		sp.userData.pickId = n.id;
		icons.set(n.id, sp);
		editorOnly.add(sp);
	});
}
const _v = new THREE.Vector3();
function placeIcons() {
	for (const [id, sp] of icons) {
		const o = S.live.byId.get(id);
		if (!o) { sp.visible = false; continue; }
		sp.visible = true;
		o.getWorldPosition(sp.position);
	}
}
// a sun's direction, drawn from its icon
const sunLine = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 2, 0xffd23f, 0.3, 0.15);
sunLine.visible = false;
editorOnly.add(sunLine);

/* ---------- the scene ---------- */

async function preloadUrls(doc) {
	const paths = new Set();
	walk(doc.objects, (n) => {
		if (n.model && n.model.src) paths.add(n.model.src);
		if (n.material) { if (n.material.map) paths.add(n.material.map); if (n.material.normalMap) paths.add(n.material.normalMap); }
	});
	await Promise.all([...paths].map((p) => store.ensureUrl(p)));
}

async function rebuild() {
	await preloadUrls(S.doc);
	if (S.live) { scene.remove(S.live.root); S.live.dispose(); }
	S.live = new IGBScene(S.doc, {
		renderer, editor: true, resolve: store.resolve,
		onReady: (holder) => { if (holder.userData.igbId === S.sel) renderInspector(); },
		onError: (holder, src, e) => log('Could not load ' + src + ' (' + (e && e.message || e) + ')', 'error'),
	});
	S.doc = S.live.json;   // (normalized: every node has an id)
	scene.add(S.live.root);
	S.live.applyRender(scene, post);
	S.live.applyRig(walls);
	drawRigGizmo();
	placeRigGizmo();
	syncIcons();
	select(S.sel && (S.sel[0] === '#' || find(S.sel)) ? S.sel : null);
	renderTree();
}

function find(id) {
	let hit = null;
	const look = (list, parent) => list.forEach((n, i) => { if (hit) return; if (n.id === id) hit = { node: n, list, index: i, parent }; else if (n.children) look(n.children, n); });
	look(S.doc.objects, null);
	return hit;
}
const holderOf = (id) => S.live && S.live.byId.get(id);

/* ---------- undo, dirty, live link ---------- */

function touch(force) {
	const now = performance.now();
	if (force ? now - S.lastTouch > 40 : now - S.lastTouch > 600) {
		S.undo.push(JSON.stringify(S.doc));
		if (S.undo.length > 120) S.undo.shift();
		S.redo.length = 0;
	}
	S.lastTouch = now;
	setDirty(true);
}
function setDirty(v) { S.dirty = v; $('#dirty').classList.toggle('on', v); document.title = (v ? '● ' : '') + 'IGB Studio — ' + (S.doc.name || ''); }
async function undo(back = true) {
	const from = back ? S.undo : S.redo, to = back ? S.redo : S.undo;
	if (!from.length) return;
	to.push(JSON.stringify(S.doc));
	S.doc = JSON.parse(from.pop());
	setDirty(true);
	await rebuild();
	sendLive();
}

const channel = 'BroadcastChannel' in window ? new BroadcastChannel('igb-studio') : null;
let liveTimer = 0;
function sendLive() {
	if (!channel || !S.path) return;
	clearTimeout(liveTimer);
	liveTimer = setTimeout(() => channel.postMessage({ type: 'edit', path: S.path, json: S.doc }), 120);
}

/* ---------- selection ---------- */

function select(id) {
	S.sel = id;
	gizmo.detach();
	if (id === '#rig') gizmo.attach(rigGizmo);
	else if (id && id[0] !== '#') { const o = holderOf(id); if (o) gizmo.attach(o); }
	gizmo.setMode(S.tool);
	gizmo.setSpace(S.space);
	if (id && id[0] !== '#') { let f = find(id); while (f && f.parent) { S.expanded.add(f.parent.id); f = find(f.parent.id); } }
	renderTree();
	renderInspector();
}

function onGizmoChange() {
	if (S.sel === '#rig') {
		const g = S.doc.rig;
		g.position = rigGizmo.position.toArray().map(r4);
		const e = new THREE.Euler().setFromQuaternion(rigGizmo.quaternion, 'YXZ');
		g.pitch = r2(e.x / DEG); g.yaw = r2(e.y / DEG);
		placeRigGizmo();
		S.live.applyRig(walls);
	} else {
		const o = holderOf(S.sel), f = find(S.sel);
		if (!o || !f) return;
		f.node.position = o.position.toArray().map(r4);
		f.node.rotation = [o.rotation.x, o.rotation.y, o.rotation.z].map((a) => r2(a / DEG));
		f.node.scale = o.scale.toArray().map(r4);
	}
	setDirty(true);
	refreshInspectorTransform();
	sendLive();
}

/* ---------- editing objects ---------- */

const NEW = {
	empty: () => ({ type: 'group', name: 'Empty' }),
	marker: () => ({ type: 'marker', name: 'Marker' }),
	sun: () => ({ type: 'light', name: 'Sun', position: [0, 0, -3], rotation: [-50, 30, 0], light: { kind: 'directional', color: '#fff1dc', intensity: 2.5, castShadow: true, shadowArea: 24 } }),
	point: () => ({ type: 'light', name: 'Point Light', position: [0, 2.5, -3], light: { kind: 'point', color: '#ffffff', intensity: 15, distance: 0 } }),
	spot: () => ({ type: 'light', name: 'Spot Light', position: [0, 4, -3], rotation: [-90, 0, 0], light: { kind: 'spot', color: '#ffffff', intensity: 40, angle: 30, penumbra: 0.3, castShadow: true } }),
	hemisphere: () => ({ type: 'light', name: 'Sky Light', light: { kind: 'hemisphere', color: '#dfe8ff', groundColor: '#2a2430', intensity: 0.6 } }),
	ambient: () => ({ type: 'light', name: 'Ambient Light', light: { kind: 'ambient', color: '#ffffff', intensity: 0.3 } }),
};
for (const shape of Object.keys(SHAPES)) {
	NEW[shape] = () => ({ type: 'mesh', name: shape[0].toUpperCase() + shape.slice(1), position: [0, shape === 'plane' || shape === 'disc' || shape === 'ring' ? 0.01 : 0.5, 0], scale: shape === 'plane' ? [10, 1, 10] : shape === 'ring' ? [2, 2, 2] : undefined, mesh: { shape }, material: { color: '#c8ccd6', roughness: 0.6, metalness: 0 } });
}
for (const kind of Object.keys(PREFABS)) {
	NEW['prefab:' + kind] = () => ({ type: 'prefab', name: PREFABS[kind].label, prefab: { kind, params: prefabParams(kind), mode: PREFABS[kind].modes[0] } });
}

// somewhere in front of the editor camera, on the floor
function spawnPoint() {
	const dir = editorCam.getWorldDirection(new THREE.Vector3());
	const p = orbit.target.clone();
	if (Math.abs(dir.y) > 0.05) { const t = -editorCam.position.y / dir.y; if (t > 0 && t < 40) p.copy(editorCam.position).addScaledVector(dir, t); }
	p.y = 0;
	return p.toArray().map(r2);
}

function addNode(n, { at, parent } = {}) {
	touch(true);
	n.id = newId();
	walk(n.children || [], (c) => { c.id = newId(); });
	if (!n.position) n.position = [0, 0, 0];
	if (at) n.position = [at[0], at[1] + (n.position[1] || 0), at[2]];
	const list = parent ? (parent.children = parent.children || []) : S.doc.objects;
	list.push(n);
	const holder = buildNode(n, S.live.ctx);
	(parent ? holderOf(parent.id) : S.live.root).add(holder);
	syncIcons();
	select(n.id);
	sendLive();
	return n;
}
function addModel(path, at) {
	const name = path.split('/').pop().replace(/\.glb$/i, '');
	return addNode({ type: 'model', name, model: { src: path } }, { at: at || spawnPoint() });
}
function removeNode(id) {
	const f = find(id);
	if (!f) return;
	touch(true);
	f.list.splice(f.index, 1);
	const o = holderOf(id);
	if (o && o.parent) o.parent.remove(o);
	syncIcons();
	select(null);
	sendLive();
}
function duplicate(id) {
	const f = find(id);
	if (!f) return;
	touch(true);
	const copy = clone(f.node);
	walk([copy], (c) => { c.id = newId(); });
	copy.name = (f.node.name || '').replace(/ \(\d+\)$/, '') + ' (' + (f.list.filter((n) => (n.name || '').startsWith((f.node.name || '').replace(/ \(\d+\)$/, ''))).length) + ')';
	f.list.splice(f.index + 1, 0, copy);
	const holder = buildNode(copy, S.live.ctx);
	(f.parent ? holderOf(f.parent.id) : S.live.root).add(holder);
	syncIcons();
	select(copy.id);
	sendLive();
}
// move a node under a new parent (null: the top level), keeping where it is in the world
function reparent(id, parentId, beforeId) {
	if (id === parentId) return;
	const f = find(id);
	if (!f) return;
	if (parentId) { let p = find(parentId); while (p) { if (p.node.id === id) return; p = p.parent && find(p.parent.id); } }
	touch(true);
	const o = holderOf(id);
	const world = o.matrixWorld.clone();
	f.list.splice(f.index, 1);
	const parent = parentId ? find(parentId).node : null;
	const list = parent ? (parent.children = parent.children || []) : S.doc.objects;
	const bi = beforeId ? list.findIndex((n) => n.id === beforeId) : -1;
	if (bi >= 0) list.splice(bi, 0, f.node); else list.push(f.node);
	const newParent = parent ? holderOf(parent.id) : S.live.root;
	newParent.updateMatrixWorld(true);
	const local = new THREE.Matrix4().copy(newParent.matrixWorld).invert().multiply(world);
	const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
	local.decompose(p, q, s);
	const e = new THREE.Euler().setFromQuaternion(q);
	f.node.position = p.toArray().map(r4);
	f.node.rotation = [e.x, e.y, e.z].map((a) => r2(a / DEG));
	f.node.scale = s.toArray().map(r4);
	newParent.add(o);
	applyTransform(o, f.node);
	// (keep the three.js children in the JSON's order)
	const kids = list.map((n) => holderOf(n.id)).filter(Boolean);
	for (const k of kids) { newParent.remove(k); newParent.add(k); }
	if (parent) S.expanded.add(parent.id);
	renderTree();
	sendLive();
}

// after a component changed: rebuild just that object's content
function changed(node, what = 'content') {
	touch();
	const o = holderOf(node.id);
	if (o) {
		if (what === 'transform') applyTransform(o, node);
		else { setContent(o, node, S.live.ctx); applyTransform(o, node); }
	}
	if (what === 'name' || what === 'visible' || what === 'template') renderTree();
	if (what === 'content' && node.type === 'light') syncIcons();
	sendLive();
}
function renderChanged() { touch(); S.live.applyRender(scene, post); sendLive(); }
function rigChanged() { touch(); S.live.applyRig(walls); placeRigGizmo(); drawRigGizmo(); sendLive(); }

function focus(id) {
	const o = id === '#rig' ? rigGizmo : holderOf(id);
	if (!o) return;
	const box = new THREE.Box3().setFromObject(o);
	const c = box.isEmpty() ? o.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
	const size = box.isEmpty() ? 2 : Math.max(0.5, box.getSize(new THREE.Vector3()).length());
	const dir = editorCam.position.clone().sub(orbit.target).normalize();
	orbit.target.copy(c);
	editorCam.position.copy(c).addScaledVector(dir, size * 1.4);
	orbit.update();
}

/* ---------- hierarchy ---------- */

const TYPE_ICON = { group: '▣', marker: '◆', mesh: '■', model: '◇', prefab: '☺', light: '☀' };

function renderTree() {
	const tree = $('#tree');
	const rows = [];
	rows.push(`<div class="row special ${S.sel === '#render' ? 'sel' : ''}" data-id="#render"><span class="tw"></span><span class="ic">⚙</span><span class="nm">Scene Settings</span></div>`);
	rows.push(`<div class="row special ${S.sel === '#rig' ? 'sel' : ''}" data-id="#rig"><span class="tw"></span><span class="ic">🎥</span><span class="nm">Wall Cameras</span></div>`);
	rows.push('<div class="treegap"></div>');
	const add = (list, depth) => {
		for (const n of list) {
			const kids = n.children && n.children.length;
			const open = S.expanded.has(n.id);
			const cls = ['row', S.sel === n.id ? 'sel' : '', n.visible === false ? 'hidden' : '', n.template ? 'template' : ''].join(' ');
			rows.push(`<div class="${cls}" data-id="${n.id}" draggable="true" style="padding-left:${4 + depth * 14}px">
				<span class="tw" data-tw>${kids ? (open ? '▾' : '▸') : ''}</span><span class="ic">${TYPE_ICON[n.type] || '•'}</span>
				<span class="nm" title="${esc(n.tag ? 'tag: ' + n.tag : '')}">${esc(n.name || '(unnamed)')}${n.template ? ' ⟨template⟩' : ''}</span>
				<span class="eye ${n.visible === false ? 'off' : ''}" data-eye title="Show / hide">${n.visible === false ? '◌' : '◉'}</span></div>`);
			if (kids && open) add(n.children, depth + 1);
		}
	};
	add(S.doc.objects, 0);
	if (!S.doc.objects.length) rows.push('<div class="empty">Empty scene.<br>+ Add, or drag a model in from Assets.</div>');
	tree.innerHTML = rows.join('');
}

$('#tree').addEventListener('click', (e) => {
	if (e.target.tagName === 'INPUT') return;
	const row = e.target.closest('.row');
	if (!row) { select(null); return; }
	const id = row.dataset.id;
	if (e.target.closest('[data-tw]')) { S.expanded.has(id) ? S.expanded.delete(id) : S.expanded.add(id); renderTree(); return; }
	if (e.target.closest('[data-eye]')) { const f = find(id); f.node.visible = f.node.visible === false; changed(f.node, 'visible'); renderInspector(); return; }
	select(id);
});
$('#tree').addEventListener('dblclick', (e) => {
	const row = e.target.closest('.row');
	if (!row || row.dataset.id[0] === '#') { if (row) focus(row.dataset.id); return; }
	const f = find(row.dataset.id);
	const nm = $('.nm', row);
	nm.innerHTML = `<input type="text" value="${esc(f.node.name)}">`;
	const inp = $('input', nm);
	inp.focus(); inp.select();
	const done = () => { if (inp.value !== f.node.name) { touch(true); f.node.name = inp.value; changed(f.node, 'name'); renderInspector(); } else renderTree(); };
	inp.addEventListener('blur', done);
	inp.addEventListener('keydown', (k) => { if (k.key === 'Enter') inp.blur(); if (k.key === 'Escape') { inp.value = f.node.name; inp.blur(); } });
});
let dragId = null;
$('#tree').addEventListener('dragstart', (e) => { const row = e.target.closest('.row'); dragId = row && row.dataset.id; e.dataTransfer.setData('text/igb-node', dragId); e.dataTransfer.effectAllowed = 'move'; });
function dropZone(e, row) { const r = row.getBoundingClientRect(), y = (e.clientY - r.top) / r.height; return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'in'; }
$('#tree').addEventListener('dragover', (e) => {
	const types = e.dataTransfer.types;
	if (!types.includes('text/igb-node') && !types.includes('text/igb-asset')) return;
	e.preventDefault();
	$$('.row', $('#tree')).forEach((r) => r.classList.remove('drop-in', 'drop-before', 'drop-after'));
	const row = e.target.closest('.row');
	if (row && row.dataset.id[0] !== '#') row.classList.add('drop-' + (types.includes('text/igb-asset') ? 'in' : dropZone(e, row)));
});
$('#tree').addEventListener('dragleave', () => $$('.row', $('#tree')).forEach((r) => r.classList.remove('drop-in', 'drop-before', 'drop-after')));
$('#tree').addEventListener('dragend', () => { dragId = null; });
$('#tree').addEventListener('drop', (e) => {
	if (e.dataTransfer.files.length) return;
	e.preventDefault();
	e.stopPropagation();
	$$('.row', $('#tree')).forEach((r) => r.classList.remove('drop-in', 'drop-before', 'drop-after'));
	const row = e.target.closest('.row');
	const asset = e.dataTransfer.getData('text/igb-asset');
	if (asset) {
		const parent = row && row.dataset.id[0] !== '#' ? find(row.dataset.id).node : null;
		if (isModel(asset)) addNode({ type: 'model', name: asset.split('/').pop().replace(/\.glb$/i, ''), model: { src: asset } }, { parent });
		return;
	}
	const id = e.dataTransfer.getData('text/igb-node') || dragId;
	if (!id) return;
	if (!row || row.dataset.id[0] === '#') { reparent(id, null, null); return; }
	const target = find(row.dataset.id);
	const zone = dropZone(e, row);
	if (zone === 'in') reparent(id, target.node.id, null);
	else {
		const sib = zone === 'before' ? target.node.id : (target.list[target.index + 1] || {}).id;
		reparent(id, target.parent ? target.parent.id : null, sib === id ? null : sib);
	}
});

/* ---------- add menu ---------- */

function showMenu(x, y, items) {
	const m = $('#menu');
	m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.head ? `<div class="mh">${esc(it.head)}</div>` : `<div data-i="${i}">${esc(it.label)}</div>`).join('');
	m.hidden = false;
	const r = m.getBoundingClientRect();
	m.style.left = Math.min(x, innerWidth - r.width - 4) + 'px';
	m.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
	m.onclick = (e) => { const d = e.target.closest('[data-i]'); if (!d) return; m.hidden = true; items[+d.dataset.i].run(); };
}
addEventListener('pointerdown', (e) => { if (!e.target.closest('#menu')) $('#menu').hidden = true; }, true);

function addMenuItems() {
	const at = spawnPoint();
	const item = (label, key, opts) => ({ label, run: () => addNode(NEW[key](), Object.assign({ at }, opts)) });
	const items = [
		{ head: 'Objects' }, item('Empty', 'empty'), item('Marker (spawn point, target…)', 'marker'),
		{ head: 'Shapes' }, ...Object.keys(SHAPES).map((k) => item(k[0].toUpperCase() + k.slice(1), k)),
		{ head: 'Lights' }, item('Sun (directional)', 'sun', { at: null }), item('Point light', 'point'), item('Spot light', 'spot'), item('Sky light (hemisphere)', 'hemisphere', { at: null }), item('Ambient light', 'ambient', { at: null }),
		{ head: 'Game characters (code-built)' }, ...Object.keys(PREFABS).map((k) => item(PREFABS[k].label, 'prefab:' + k)),
	];
	const models = S.assets.filter((a) => a.kind === 'model');
	if (models.length) items.push({ head: 'Models' }, ...models.map((a) => ({ label: a.path.split('/').pop(), run: () => addModel(a.path, at) })));
	return items;
}
$('#addBtn').addEventListener('click', (e) => { const r = e.target.getBoundingClientRect(); showMenu(r.left, r.bottom + 2, addMenuItems()); });
$('#tree').addEventListener('contextmenu', (e) => {
	e.preventDefault();
	const row = e.target.closest('.row');
	if (row && row.dataset.id[0] !== '#') {
		const id = row.dataset.id;
		select(id);
		showMenu(e.clientX, e.clientY, [
			{ label: 'Rename', run: () => row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })) },
			{ label: 'Duplicate  (Ctrl+D)', run: () => duplicate(id) },
			{ label: 'Focus  (F)', run: () => focus(id) },
			{ label: 'Unparent', run: () => reparent(id, null, null) },
			'-', { label: 'Delete', run: () => removeNode(id) },
		]);
	} else showMenu(e.clientX, e.clientY, addMenuItems());
});

/* ---------- inspector ---------- */

// small field builders; each calls set(value) on input
function fRow(label, inner, scrub) { return `<div class="f"><label${scrub ? ' class="scrub" data-scrub' : ''} title="${esc(label)}">${esc(label)}</label><div class="v">${inner}</div></div>`; }
let fieldId = 0;
const handlers = new Map();
function bind(fn) { const id = 'h' + (++fieldId); handlers.set(id, fn); return id; }

const F = {
	text(label, value, set) { return fRow(label, `<input type="text" value="${esc(value)}" data-h="${bind((el) => set(el.value))}" data-ev="change">`); },
	num(label, value, set, { step = 0.1, min, max } = {}) {
		return fRow(label, `<input type="number" step="${step}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} value="${value ?? 0}" data-h="${bind((el) => set(+el.value))}" data-step="${step}">`, true);
	},
	range(label, value, set, { min = 0, max = 1, step = 0.01 } = {}) {
		const h = bind((el) => { const v = +el.value; set(v); const sib = el.type === 'range' ? el.nextElementSibling : el.previousElementSibling; sib.value = v; });
		return fRow(label, `<input type="range" min="${min}" max="${max}" step="${step}" value="${value ?? 0}" data-h="${h}"><input type="number" step="${step}" value="${value ?? 0}" data-h="${h}">`);
	},
	check(label, value, set) { return fRow(label, `<input type="checkbox" ${value ? 'checked' : ''} data-h="${bind((el) => set(el.checked))}">`); },
	color(label, value, set) {
		const h = bind((el) => { set(el.value); const t = el.type === 'color' ? el.nextElementSibling : el.previousElementSibling; t.value = el.value; });
		return fRow(label, `<input type="color" value="${esc(value || '#ffffff')}" data-h="${h}"><input type="text" value="${esc(value || '#ffffff')}" data-h="${h}" data-ev="change">`);
	},
	select(label, value, options, set) {
		return fRow(label, `<select data-h="${bind((el) => set(el.value))}">${options.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`);
	},
	vec(label, value, set, step = 0.1, key) {
		const h = bind((el) => { const inputs = $$('input', el.closest('.vec')); set(inputs.map((i) => +i.value)); });
		return fRow(label, `<div class="vec" data-vec="${key || ''}">${['X', 'Y', 'Z'].map((a, i) => `<div class="ax"><b data-scrub data-step="${step}">${a}</b><input type="number" step="${step}" value="${r4(value[i])}" data-h="${h}"></div>`).join('')}</div>`);
	},
	asset(label, value, kind, set) {
		const list = S.assets.filter((a) => a.kind === kind).map((a) => a.path);
		if (value && !list.includes(value)) list.unshift(value);
		return F.select(label, value || '', [['', '(none)'], ...list.map((p) => [p, p.split('/').pop()])], (v) => set(v || undefined));
	},
};
function section(title, body, key) {
	const closed = sectionsClosed.has(key || title);
	return `<div class="sec ${closed ? 'closed' : ''}" data-sec="${esc(key || title)}"><h4>${title}</h4><div class="fields">${body}</div></div>`;
}
const sectionsClosed = new Set();

function renderInspector() {
	handlers.clear();
	const el = $('#inspector');
	let html = '';
	if (S.sel === '#render') html = renderSettings();
	else if (S.sel === '#rig') html = rigSettings();
	else if (S.sel) { const f = find(S.sel); html = f ? nodeSettings(f.node) : ''; }
	else if (S.selAsset) html = assetSettings(S.selAsset);
	else html = '<div class="empty">Select something in the Hierarchy or the scene.<br><br>⚙ Scene Settings holds the lighting, sky, fog and bloom; 🎥 Wall Cameras is what the game\'s three walls see.</div>';
	el.innerHTML = html;
}

function renderSettings() {
	const r = S.doc.render;
	const set = (fn) => (v) => { fn(v); renderChanged(); };
	let h = section('Rendering',
		F.select('Tone mapping', r.toneMapping, Object.keys(TONE_MAPPINGS), set((v) => { r.toneMapping = v; }))
		+ F.range('Exposure', r.exposure, set((v) => { r.exposure = v; }), { min: 0, max: 3 })
		+ F.check('Shadows', r.shadows.enabled, set((v) => { r.shadows.enabled = v; }))
		+ F.check('Soft shadows', r.shadows.soft, set((v) => { r.shadows.soft = v; })));
	h += section('Environment light',
		F.select('Preset', r.environment.preset, [...Object.keys(ENVIRONMENTS), 'none'], set((v) => { r.environment.preset = v; }))
		+ F.range('Intensity', r.environment.intensity, set((v) => { r.environment.intensity = v; }), { min: 0, max: 3 })
		+ '<div class="note">Lights every surface softly and gives shiny ones something to reflect.</div>');
	h += section('Background',
		F.select('Type', r.background.type, [['color', 'Colour'], ['environment', 'Environment (sky)'], ['none', 'None']], (v) => { r.background.type = v; renderChanged(); renderInspector(); })
		+ (r.background.type === 'color' ? F.color('Colour', r.background.color, set((v) => { r.background.color = v; })) : '')
		+ (r.background.type === 'environment' ? F.range('Blur', r.background.blur ?? 0, set((v) => { r.background.blur = v; }), { min: 0, max: 1 }) + F.range('Brightness', r.background.intensity ?? 1, set((v) => { r.background.intensity = v; }), { min: 0, max: 3 }) : ''));
	h += section('Fog',
		F.check('Fog', r.fog.enabled, (v) => { r.fog.enabled = v; renderChanged(); renderInspector(); })
		+ (r.fog.enabled ? F.color('Colour', r.fog.color, set((v) => { r.fog.color = v; })) + F.num('Starts', r.fog.near, set((v) => { r.fog.near = v; }), { step: 0.5 }) + F.num('Thick by', r.fog.far, set((v) => { r.fog.far = v; }), { step: 0.5 }) : ''));
	h += section('Bloom (glow)',
		F.range('Strength', r.bloom.strength, set((v) => { r.bloom.strength = v; }), { min: 0, max: 3 })
		+ F.range('Radius', r.bloom.radius, set((v) => { r.bloom.radius = v; }), { min: 0, max: 1 })
		+ F.range('Threshold', r.bloom.threshold, set((v) => { r.bloom.threshold = v; }), { min: 0, max: 3 })
		+ F.range('Cap', r.bloom.cap, set((v) => { r.bloom.cap = v; }), { min: 0.5, max: 10, step: 0.1 })
		+ '<div class="note">Anything brighter than the threshold glows: emissive intensity above 1, or unlit colours with glow above 1. Only the Game view shows bloom.</div>');
	h += section('Scene', F.text('Name', S.doc.name, (v) => { touch(true); S.doc.name = v; setDirty(true); sendLive(); }) + `<div class="note">${esc(S.path || 'not saved yet')}</div>`);
	return h;
}

function rigSettings() {
	const g = S.doc.rig;
	const set = (fn) => (v) => { fn(v); rigChanged(); };
	return section('Wall Cameras',
		F.vec('Position', g.position, set((v) => { g.position = v; }), 0.1, 'rigpos')
		+ F.num('Pitch (tilt)', g.pitch, set((v) => { g.pitch = v; }), { step: 1 })
		+ F.num('Yaw (turn)', g.yaw, set((v) => { g.yaw = v; }), { step: 1 })
		+ F.num('Field of view', g.fov, set((v) => { g.fov = v; }), { step: 1, min: 10, max: 120 })
		+ '<div class="note">Three cameras on one rig, one for each wall (left, front, right). The players stand in the middle of the room, so this is where their eyes are. Keep the field of view at 64° (90° across a 16:10 wall) and the walls meet seamlessly. Move and turn the rig with the gizmo too.</div>');
}

function nodeSettings(n) {
	const set = (fn, what) => (v) => { fn(v); changed(n, what); };
	const transform = (key, fn) => (v) => { fn(v); changed(n, 'transform'); };
	let h = section('Object',
		F.text('Name', n.name, (v) => { touch(true); n.name = v; changed(n, 'name'); })
		+ F.text('Tag', n.tag || '', (v) => { touch(true); n.tag = v || undefined; changed(n, 'name'); })
		+ F.check('Visible', n.visible !== false, set((v) => { n.visible = v; }, 'visible'))
		+ F.check('Template', !!n.template, set((v) => { n.template = v || undefined; }, 'template'))
		+ (n.type !== 'light' && n.type !== 'group' && n.type !== 'marker' ? F.check('Casts shadow', n.castShadow !== false, set((v) => { n.castShadow = v; })) + F.check('Gets shadows', n.receiveShadow !== false, set((v) => { n.receiveShadow = v; })) : ''));
	h += section('Transform',
		F.vec('Position', n.position || [0, 0, 0], transform('p', (v) => { n.position = v; }), 0.1, 'pos')
		+ F.vec('Rotation', n.rotation || [0, 0, 0], transform('r', (v) => { n.rotation = v; }), 1, 'rot')
		+ F.vec('Scale', n.scale || [1, 1, 1], transform('s', (v) => { n.scale = v; }), 0.05, 'scl'));

	if (n.type === 'mesh') {
		const m = n.material = n.material || {};
		const ms = (fn) => set(fn);
		h += section('Shape', F.select('Shape', n.mesh.shape, Object.keys(SHAPES), set((v) => { n.mesh.shape = v; })));
		h += section('Material',
			F.color('Colour', m.color || '#cccccc', ms((v) => { m.color = v; }))
			+ F.check('Unlit (flat colour)', !!m.unlit, (v) => { m.unlit = v || undefined; changed(n); renderInspector(); })
			+ (m.unlit
				? F.range('Glow', m.glow ?? 1, ms((v) => { m.glow = v; }), { min: 0, max: 6, step: 0.05 })
				: F.range('Metalness', m.metalness ?? 0, ms((v) => { m.metalness = v; }))
				+ F.range('Roughness', m.roughness ?? 0.6, ms((v) => { m.roughness = v; }))
				+ F.range('Clearcoat', m.clearcoat ?? 0, ms((v) => { m.clearcoat = v; }))
				+ F.color('Emissive', m.emissive || '#000000', ms((v) => { m.emissive = v; }))
				+ F.range('Emissive power', m.emissiveIntensity ?? 1, ms((v) => { m.emissiveIntensity = v; }), { min: 0, max: 10, step: 0.05 })
				+ F.check('Flat shaded', !!m.flat, ms((v) => { m.flat = v || undefined; })))
			+ F.range('Opacity', m.opacity ?? 1, ms((v) => { m.opacity = v; }))
			+ F.check('Double sided', m.side === 'double', ms((v) => { m.side = v ? 'double' : undefined; }))
			+ F.asset('Texture', m.map, 'texture', ms((v) => { m.map = v; }))
			+ (m.unlit ? '' : F.asset('Normal map', m.normalMap, 'texture', ms((v) => { m.normalMap = v; })))
			+ (m.map || m.normalMap ? fRow('Tiling', `<div class="vec" style="grid-template-columns:1fr 1fr">${[0, 1].map((i) => `<div class="ax"><b data-scrub data-step="0.1">${'UV'[i]}</b><input type="number" step="0.1" value="${(m.repeat || [1, 1])[i]}" data-h="${bind((el) => { const ins = $$('input', el.closest('.vec')); m.repeat = ins.map((x) => +x.value); changed(n); })}"></div>`).join('')}</div>`) : ''));
	}

	if (n.type === 'model') {
		const md = n.model;
		const anim = S.live.ctx.anims.get(n.id);
		const clips = anim && anim.kind === 'mixer' ? anim.clips.map((c) => c.name) : [];
		h += section('Model',
			F.asset('Source', md.src, 'model', set((v) => { md.src = v; }))
			+ F.check('Tint', !!md.tint, (v) => { md.tint = v ? '#ffffff' : undefined; changed(n); renderInspector(); })
			+ (md.tint ? F.color('Tint colour', md.tint, set((v) => { md.tint = v; })) : '')
			+ (anim ? '' : '<div class="note">Loading…</div>'));
		if (clips.length) {
			const a = md.anim = md.anim || {};
			h += section('Animation',
				F.select('Clip', a.clip || '', [['', '(none: bind pose)'], ...clips], set((v) => { a.clip = v || undefined; }))
				+ F.range('Speed', a.speed ?? 1, set((v) => { a.speed = v; }), { min: 0, max: 3, step: 0.05 })
				+ F.check('Loop', a.loop !== false, set((v) => { a.loop = v; }))
				+ `<div class="note">${clips.length} clips. Games play others with <span class="code">scene.play(obj, 'Clip')</span>.</div>`);
		}
		if (anim && anim.root) {
			const mats = new Map();
			anim.root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (!mats.has(m.name || '(unnamed)')) mats.set(m.name || '(unnamed)', m); });
			let mh = '';
			md.materials = md.materials || {};
			for (const [name, mat] of mats) {
				const o = md.materials[name];
				const hex = (c) => '#' + (c ? c.getHexString() : 'ffffff');
				const setM = (k) => (v) => { md.materials[name] = Object.assign(md.materials[name] || {}, { [k]: v }); changed(n); };
				mh += `<div class="mat"><div class="mh">${esc(name)}<span class="grow"></span>${o ? `<button data-h="${bind(() => { touch(true); delete md.materials[name]; changed(n); setTimeout(renderInspector, 50); })}" data-ev="click">Reset</button>` : '<span class="note">as imported</span>'}</div>`
					+ F.color('Colour', o && o.color || hex(mat.color), setM('color'))
					+ ('metalness' in mat ? F.range('Metalness', o && o.metalness !== undefined ? o.metalness : mat.metalness, setM('metalness')) : '')
					+ ('roughness' in mat ? F.range('Roughness', o && o.roughness !== undefined ? o.roughness : mat.roughness, setM('roughness')) : '')
					+ (mat.emissive ? F.color('Emissive', o && o.emissive || hex(mat.emissive), setM('emissive')) + F.range('Emissive power', o && o.emissiveIntensity !== undefined ? o.emissiveIntensity : mat.emissiveIntensity, setM('emissiveIntensity'), { min: 0, max: 10, step: 0.05 }) : '')
					+ '</div>';
			}
			if (!Object.keys(md.materials).length) delete md.materials;
			h += section('Materials', mh || '<div class="note">No materials.</div>');
		}
	}

	if (n.type === 'prefab') {
		const P = PREFABS[n.prefab.kind];
		const pr = n.prefab;
		let ph = F.select('Character', pr.kind, Object.keys(PREFABS).map((k) => [k, PREFABS[k].label]), (v) => { touch(true); pr.kind = v; pr.params = prefabParams(v); pr.mode = PREFABS[v].modes[0]; changed(n); renderInspector(); });
		for (const [k, def] of Object.entries(P.params)) {
			const val = prefabParams(pr.kind, pr.params)[k];
			const setP = (v) => { pr.params = Object.assign(prefabParams(pr.kind, pr.params), { [k]: v }); changed(n); };
			ph += def && typeof def === 'object' ? F.select(k, val, def.options, setP) : (/^#/.test(def) ? F.color(k, val, setP) : F.text(k, val, setP));
		}
		ph += F.select('Animation', pr.mode, P.modes, (v) => { touch(); pr.mode = v; S.live.setMode(holderOf(n.id), v); sendLive(); });
		ph += `<div class="note">Built in code (${esc(P.from)}), so its shape is changed there; place, scale, colour and pose it here. Games change its animation with <span class="code">scene.setMode(obj, 'run')</span>.</div>`;
		h += section('Character', ph);
	}

	if (n.type === 'light') {
		const L = n.light;
		const set2 = (fn) => (v) => { fn(v); changed(n); };
		let lh = F.select('Type', L.kind || 'directional', [['directional', 'Sun (directional)'], ['point', 'Point'], ['spot', 'Spot'], ['hemisphere', 'Sky (hemisphere)'], ['ambient', 'Ambient']], (v) => { touch(true); L.kind = v; changed(n); renderInspector(); })
			+ F.color(L.kind === 'hemisphere' ? 'Sky colour' : 'Colour', L.color || '#ffffff', set2((v) => { L.color = v; }))
			+ F.range('Intensity', L.intensity ?? 1, set2((v) => { L.intensity = v; }), { min: 0, max: L.kind === 'point' || L.kind === 'spot' ? 200 : 10, step: 0.05 });
		if (L.kind === 'hemisphere') lh += F.color('Ground colour', L.groundColor || '#2a2430', set2((v) => { L.groundColor = v; }));
		if (L.kind === 'point' || L.kind === 'spot') lh += F.num('Range (0 = ∞)', L.distance ?? 0, set2((v) => { L.distance = v; }), { step: 0.5, min: 0 }) + F.range('Falloff', L.decay ?? 2, set2((v) => { L.decay = v; }), { min: 0, max: 3 });
		if (L.kind === 'spot') lh += F.range('Cone angle', L.angle ?? 30, set2((v) => { L.angle = v; }), { min: 1, max: 89, step: 1 }) + F.range('Soft edge', L.penumbra ?? 0.3, set2((v) => { L.penumbra = v; }));
		if (L.kind !== 'hemisphere' && L.kind !== 'ambient') {
			lh += F.check('Casts shadows', !!L.castShadow, (v) => { L.castShadow = v; changed(n); renderInspector(); });
			if (L.castShadow) {
				if (!L.kind || L.kind === 'directional') lh += F.num('Shadow area (m)', L.shadowArea ?? 24, set2((v) => { L.shadowArea = v; }), { step: 1, min: 1 });
				lh += F.select('Shadow detail', L.shadowSize || 2048, [512, 1024, 2048, 4096], set2((v) => { L.shadowSize = +v; }));
			}
		}
		if (!L.kind || L.kind === 'directional') lh += '<div class="note">A sun shines the way the object faces (its blue −Z arrow): turn it with the rotate tool. Its position is the middle of the area its shadows cover.</div>';
		h += section('Light', lh);
	}

	if (n.type === 'marker') h += section('Marker', '<div class="note">An invisible point for game code: where players spawn, where a door is, where the camera goes. Its children move with it.</div>');

	const q = n.template ? `scene.instantiate('${n.name}')` : n.type === 'marker' ? `scene.marker('${n.name}')` : n.tag ? `scene.findAll('${n.tag}')` : `scene.find('${n.name}')`;
	h += section('For the game code', `<div class="code" data-copy title="Click to copy">${esc(q)}</div>`, 'code');
	return h;
}

function assetSettings(a) {
	let h = section('Asset', `<div class="note">${esc(a.path)}</div>` + (a.kind === 'texture' ? `<img src="${esc(store.resolve(a.path))}" style="max-width:100%;border-radius:4px;margin-top:6px">` : ''));
	if (a.kind === 'model') {
		h += section('Model', '<div class="note" id="assetInfo">Loading…</div>' + `<div class="btnrow"><button data-h="${bind(() => addModel(a.path))}" data-ev="click">Add to scene</button><button data-h="${bind(() => reloadAsset(a.path))}" data-ev="click">Reload from disk</button></div>`);
		loadGLTF(a.path, store.resolve).then((g) => {
			const el = $('#assetInfo');
			if (!el) return;
			let meshes = 0, tris = 0, bones = 0;
			const mats = new Set();
			g.scene.traverse((o) => {
				if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; [].concat(o.material).forEach((m) => mats.add(m.name)); }
				if (o.isBone) bones++;
			});
			const size = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3());
			el.innerHTML = `${meshes} meshes · ${Math.round(tris).toLocaleString()} triangles · ${mats.size} materials${bones ? ' · ' + bones + ' bones' : ''}<br>Size ${size.toArray().map((v) => v.toFixed(2)).join(' × ')} m`
				+ (g.animations.length ? '<br>Clips: ' + g.animations.map((c) => esc(c.name)).join(', ') : '');
		}).catch((e) => { const el = $('#assetInfo'); if (el) el.textContent = 'Could not load: ' + e.message; });
	}
	return h;
}
async function reloadAsset(path) {
	forget(path, store.resolve);
	if (store.urls.has(path)) { URL.revokeObjectURL(store.urls.get(path)); store.urls.delete(path); }
	await store.ensureUrl(path);
	walk(S.doc.objects, (n) => { if (n.model && n.model.src === path) { const o = holderOf(n.id); if (o) setContent(o, n, S.live.ctx); } });
	log('Reloaded ' + path, 'ok');
	renderInspector();
}

// inspector events: every field runs its handler; transform fields refresh from the live object
$('#inspector').addEventListener('input', (e) => { const h = handlers.get(e.target.dataset.h); if (h && e.target.dataset.ev !== 'change') { touch(); h(e.target); } });
$('#inspector').addEventListener('change', (e) => { const h = handlers.get(e.target.dataset.h); if (h && e.target.dataset.ev === 'change') { touch(); h(e.target); } });
$('#inspector').addEventListener('click', (e) => {
	const t = e.target;
	if (t.dataset.ev === 'click') { const h = handlers.get(t.dataset.h); if (h) { touch(true); h(t); } }
	const sec = t.closest('.sec > h4');
	if (sec) { const s = sec.parentElement; s.classList.toggle('closed'); s.classList.contains('closed') ? sectionsClosed.add(s.dataset.sec) : sectionsClosed.delete(s.dataset.sec); }
	if (t.dataset.copy !== undefined) { navigator.clipboard && navigator.clipboard.writeText(t.textContent); log('Copied ' + t.textContent, 'ok'); }
});
// drag a label (or an X/Y/Z tab) sideways to scrub its number, as in Unity
$('#inspector').addEventListener('pointerdown', (e) => {
	const lab = e.target.closest('[data-scrub]');
	if (!lab) return;
	const input = lab.tagName === 'B' ? lab.nextElementSibling : $('input[type=number]', lab.parentElement);
	if (!input) return;
	e.preventDefault();
	const step = +(input.step || lab.dataset.step || 0.1);
	const start = +input.value, x0 = e.clientX;
	lab.setPointerCapture(e.pointerId);
	touch(true);
	const move = (m) => {
		const v = start + Math.round((m.clientX - x0) / 4) * step * (m.shiftKey ? 10 : 1);
		input.value = r4(v);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	};
	const up = () => { lab.removeEventListener('pointermove', move); lab.removeEventListener('pointerup', up); };
	lab.addEventListener('pointermove', move);
	lab.addEventListener('pointerup', up);
});
function refreshInspectorTransform() {
	if (!S.sel) return;
	if (S.sel === '#rig') {
		const g = S.doc.rig;
		const v = $('[data-vec=rigpos]');
		if (v) $$('input', v).forEach((i, k) => { i.value = r4(g.position[k]); });
		const nums = $$('#inspector input[type=number]');
		if (nums[3]) nums[3].value = g.pitch;
		if (nums[4]) nums[4].value = g.yaw;
		return;
	}
	const f = find(S.sel);
	if (!f) return;
	for (const [key, val] of [['pos', f.node.position], ['rot', f.node.rotation], ['scl', f.node.scale]]) {
		const v = $(`[data-vec=${key}]`);
		if (v && val) $$('input', v).forEach((i, k) => { if (document.activeElement !== i) i.value = r4(val[k]); });
	}
}

/* ---------- assets ---------- */

async function loadAssets() {
	const found = new Map();
	const addDir = async (dir, kind) => {
		const items = await store.list(dir);
		if (!items) return;
		for (const it of items) {
			if (it.dir) continue;
			const p = dir + '/' + it.name;
			if (kind === 'model' ? /\.glb$/i.test(it.name) : isTexture(it.name)) found.set(p, { path: p, kind, group: dir.split('/')[1] });
		}
	};
	await addDir(`assets/${S.project}/models`, 'model');
	await addDir(`assets/${S.project}/textures`, 'texture');
	await addDir('assets/shared', 'model');
	// (not connected: what the scene uses, and the shared mannequin)
	if (!store.connected) found.set('assets/shared/mannequin.glb', { path: 'assets/shared/mannequin.glb', kind: 'model', group: 'shared' });
	walk(S.doc.objects, (n) => {
		if (n.model && n.model.src && !found.has(n.model.src)) found.set(n.model.src, { path: n.model.src, kind: 'model', group: n.model.src.split('/')[1] });
		for (const k of ['map', 'normalMap']) if (n.material && n.material[k] && !found.has(n.material[k])) found.set(n.material[k], { path: n.material[k], kind: 'texture', group: n.material[k].split('/')[1] });
	});
	for (const p of store.urls.keys()) if (!found.has(p) && p.startsWith('assets/')) found.set(p, { path: p, kind: isTexture(p) ? 'texture' : 'model', group: p.split('/')[1] });
	S.assets = [...found.values()];
	renderAssets();
}
function renderAssets() {
	const el = $('#assets');
	const groups = {};
	for (const a of S.assets) (groups[a.group] = groups[a.group] || []).push(a);
	let h = '';
	for (const [g, list] of Object.entries(groups).sort(([a], [b]) => (a === S.project ? -1 : b === S.project ? 1 : a.localeCompare(b)))) {
		h += `<div class="agroup">assets/${esc(g)}</div>`;
		for (const a of list) {
			const th = a.kind === 'texture' ? `<img src="${esc(store.resolve(a.path))}" loading="lazy">` : '🧊';
			h += `<div class="asset ${S.selAsset && S.selAsset.path === a.path ? 'sel' : ''}" draggable="true" data-path="${esc(a.path)}" title="${esc(a.path)}"><div class="th">${th}</div><div class="an">${esc(a.path.split('/').pop())}</div></div>`;
		}
	}
	if (!store.connected) h += `<div class="agroup">${store.supported ? 'Connect your igb-proto folder (top right) to import models and save.' : 'This browser can\'t write to folders (use Chrome or Edge); Save downloads the scene instead.'}</div>`;
	el.innerHTML = h || '<div class="empty">No assets yet: drop .glb, .fbx, .obj or images here.</div>';
}
$('#assets').addEventListener('click', (e) => {
	const a = e.target.closest('.asset');
	S.selAsset = a ? S.assets.find((x) => x.path === a.dataset.path) : null;
	if (S.selAsset) { S.sel = null; gizmo.detach(); renderTree(); }
	renderAssets();
	renderInspector();
});
$('#assets').addEventListener('dblclick', (e) => { const a = e.target.closest('.asset'); if (a && isModel(a.dataset.path)) addModel(a.dataset.path); });
$('#assets').addEventListener('dragstart', (e) => { const a = e.target.closest('.asset'); if (a) { e.dataTransfer.setData('text/igb-asset', a.dataset.path); e.dataTransfer.effectAllowed = 'copy'; } });

// models dragged from Assets into the scene land where the mouse points
sceneHit.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/igb-asset')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
sceneHit.addEventListener('drop', (e) => {
	const path = e.dataTransfer.getData('text/igb-asset');
	if (!path) return;
	e.preventDefault();
	e.stopPropagation();
	const hit = pickAt(e, sceneHit, editorCam, true);
	const at = hit ? hit.point.toArray().map(r2) : spawnPoint();
	if (isModel(path)) addModel(path, at);
	else if (isTexture(path) && hit && hit.id) { const f = find(hit.id); if (f && f.node.type === 'mesh') { touch(true); f.node.material.map = path; changed(f.node); select(f.node.id); } }
});

// files dropped anywhere: import
let dragDepth = 0;
addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { dragDepth++; $('#dropTo').textContent = 'assets/' + S.project; $('#drop').hidden = false; } });
addEventListener('dragleave', (e) => { if (e.dataTransfer.types.includes('Files') && --dragDepth <= 0) { dragDepth = 0; $('#drop').hidden = true; } });
addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
addEventListener('drop', (e) => {
	if (!e.dataTransfer.files.length) return;
	e.preventDefault();
	dragDepth = 0;
	$('#drop').hidden = true;
	doImport([...e.dataTransfer.files]);
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => { doImport([...e.target.files]); e.target.value = ''; });
async function doImport(files) {
	if (!store.connected) log('Not connected to the project folder: imports last until you close the tab. Connect folder (top right) to keep them.', 'warn');
	const done = await importFiles(files, S.project, log);
	await loadAssets();
	const models = done.filter((d) => d.kind === 'model');
	if (models.length === 1) addModel(models[0].path);
}

/* ---------- picking in the viewport ---------- */

const ray = new THREE.Raycaster();
function pickAt(e, el, camera, wantPoint) {
	const r = el.getBoundingClientRect();
	const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
	ray.setFromCamera(ndc, camera);
	const targets = [S.live.root, ...icons.values()];
	if (camera === editorCam) targets.push(rigGizmo);
	const hits = ray.intersectObjects(targets, true);
	for (const h of hits) {
		let o = h.object, vis = true;
		for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
		if (!vis) continue;
		if (o.isLine || o.isLineSegments) continue;
		if (o.userData.pickId) return { id: o.userData.pickId, point: h.point };
		while (o && !o.userData.igbId) o = o.parent;
		if (o) return { id: o.userData.igbId, point: h.point };
	}
	if (wantPoint) {
		const p = new THREE.Vector3();
		if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return { id: null, point: p };
	}
	return null;
}
let downAt = null;
sceneHit.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, b: e.button }; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
sceneHit.addEventListener('pointerup', (e) => {
	if (!downAt || downAt.b !== 0 || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4 || gizmo.dragging || gizmo.axis) { downAt = null; return; }
	downAt = null;
	const hit = pickAt(e, sceneHit, editorCam);
	select(hit ? hit.id : null);
});
sceneHit.addEventListener('dblclick', () => S.sel && focus(S.sel));
// clicking a wall in the Game view selects what's there, too
gameHit.addEventListener('click', (e) => {
	const r = gameHit.getBoundingClientRect();
	const wall = Math.min(2, Math.floor((e.clientX - r.left) / (r.width / 3)));
	const sub = { getBoundingClientRect: () => ({ left: r.left + wall * r.width / 3, top: r.top, width: r.width / 3, height: r.height }) };
	walls.rig.updateMatrixWorld(true);
	const hit = pickAt(e, sub, walls.cameras[wall]);
	select(hit ? hit.id : null);
});

/* ---------- toolbar ---------- */

function setTool(t) { S.tool = t; gizmo.setMode(t); $$('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t)); }
$('#tools').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTool(b.dataset.tool); });
function setSpace(s) { S.space = s; gizmo.setSpace(s); $('#space').textContent = s === 'local' ? 'Local' : 'World'; }
$('#space').addEventListener('click', () => setSpace(S.space === 'local' ? 'world' : 'local'));
function setSnap(on) { S.snap = on; $('#snap').classList.toggle('on', on); gizmo.setTranslationSnap(on ? 0.25 : null); gizmo.setRotationSnap(on ? 15 * DEG : null); gizmo.setScaleSnap(on ? 0.1 : null); }
$('#snap').addEventListener('click', () => setSnap(!S.snap));
function setAnimate(on) { S.animate = on; $('#animate').classList.toggle('on', on); $('#animate').textContent = on ? '▶ Animate' : '❚❚ Paused'; }
$('#animate').addEventListener('click', () => setAnimate(!S.animate));
function setView(v) { S.view = v; $$('#views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v)); }
$('#views').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });
$$('#bottom .tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
	$$('#bottom .tabs [data-tab]').forEach((x) => x.classList.toggle('on', x === b));
	$$('#bottom .tab').forEach((t) => t.classList.toggle('on', t.id === b.dataset.tab));
	if (b.dataset.tab === 'console') { S.errors = 0; $('#errCount').textContent = ''; }
}));
$('#playHub').addEventListener('click', () => window.open('index.html?' + encodeURIComponent(S.project), 'igb-hub'));
$('#help').addEventListener('click', showHelp);

addEventListener('keydown', (e) => {
	const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
	const mod = e.ctrlKey || e.metaKey;
	if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
	if (typing) return;
	if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(!e.shiftKey); return; }
	if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); undo(false); return; }
	if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (S.sel && S.sel[0] !== '#') duplicate(S.sel); return; }
	if (mod) return;
	const k = e.key.toLowerCase();
	if (k === 'w') setTool('translate');
	else if (k === 'e') setTool('rotate');
	else if (k === 'r') setTool('scale');
	else if (k === 'x') setSpace(S.space === 'local' ? 'world' : 'local');
	else if (k === 'p') setAnimate(!S.animate);
	else if (k === 'f' && S.sel) focus(S.sel);
	else if ((k === 'delete' || k === 'backspace') && S.sel && S.sel[0] !== '#') { e.preventDefault(); removeNode(S.sel); }
	else if (k === 'escape') select(null);
	else if (k === '?') showHelp();
});
addEventListener('keydown', (e) => { if (e.key === 'Control' && !e.repeat) gizmo.setTranslationSnap(S.snap ? null : 0.25); });
addEventListener('keyup', (e) => { if (e.key === 'Control') setSnap(S.snap); });

/* ---------- projects, scenes, saving ---------- */

async function loadProjects() {
	window.IGB = window.IGB || {};
	await new Promise((res) => { const s = document.createElement('script'); s.src = 'games/manifest.js'; s.onload = res; s.onerror = res; document.head.appendChild(s); });
	const games = [];
	for (const f of window.IGB.manifest || []) for (const g of f.games || []) if (g.module) games.push(g);
	const sel = $('#project');
	sel.innerHTML = games.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
	return games;
}
async function listScenes() {
	const dir = `assets/${S.project}/scenes`;
	let names = (await store.list(dir) || []).filter((x) => !x.dir && /\.json$/.test(x.name) && x.name !== 'index.json').map((x) => x.name);
	if (!store.connected) { try { names = JSON.parse(await store.readText(dir + '/index.json')); } catch (e) { names = []; } }
	return names.map((n) => dir + '/' + n);
}
async function refreshSceneList() {
	const scenes = await listScenes();
	if (S.path && !scenes.includes(S.path)) scenes.push(S.path);
	$('#sceneSel').innerHTML = scenes.length ? scenes.map((p) => `<option value="${esc(p)}" ${p === S.path ? 'selected' : ''}>${esc(p.split('/').pop().replace(/\.json$/, ''))}</option>`).join('') : '<option value="">(no scenes yet)</option>';
	return scenes;
}
async function openScene(path) {
	if (S.dirty && !confirm('Discard unsaved changes to ' + (S.doc.name || 'this scene') + '?')) { $('#sceneSel').value = S.path; return; }
	try {
		S.doc = normalize(JSON.parse(await store.readText(path)));
		S.path = path;
		log('Opened ' + path, 'ok');
	} catch (e) { log('Could not open ' + path + ': ' + e.message, 'error'); return; }
	S.undo = []; S.redo = [];
	S.sel = null;
	setDirty(false);
	await rebuild();
	history.replaceState(null, '', '?scene=' + encodeURIComponent(path));
	$('#viewInfo').textContent = path;
}
async function openProject(id, scenePath) {
	if (S.dirty && !confirm('Discard unsaved changes?')) { $('#project').value = S.project; return; }
	S.dirty = false;
	S.project = id;
	$('#project').value = id;
	const scenes = await listScenes();
	const path = scenePath || scenes[0];
	if (path) { S.path = path; await refreshSceneList(); await openScene(path); }
	else { await newScene('main', true); }
	await loadAssets();
}
$('#project').addEventListener('change', (e) => openProject(e.target.value));
$('#sceneSel').addEventListener('change', (e) => e.target.value && openScene(e.target.value));

function starterScene(name) {
	const d = emptyScene(name);
	d.objects = [
		{ id: newId(), type: 'light', name: 'Sun', position: [0, 0, -3], rotation: [-50, 30, 0], light: { kind: 'directional', color: '#fff1dc', intensity: 2.5, castShadow: true, shadowArea: 24 } },
		{ id: newId(), type: 'light', name: 'Sky Light', light: { kind: 'hemisphere', color: '#dfe8ff', groundColor: '#2a2430', intensity: 0.5 } },
		{ id: newId(), type: 'mesh', name: 'Floor', mesh: { shape: 'disc' }, scale: [28, 1, 28], material: { color: '#2a3042', roughness: 0.6, metalness: 0.1 }, castShadow: false },
		{ id: newId(), type: 'marker', name: 'Room', position: [0, 0, 0], scale: [3.6, 1, 3.6] },
	];
	return d;
}
async function newScene(name, silent) {
	if (!silent) {
		if (S.dirty && !confirm('Discard unsaved changes?')) return;
		name = prompt('Name for the new scene (in assets/' + S.project + '/scenes/):', 'main');
		if (!name) return;
	}
	const file = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'scene';
	S.path = `assets/${S.project}/scenes/${file}.json`;
	S.doc = starterScene(name);
	S.undo = []; S.redo = []; S.sel = null;
	setDirty(true);
	await rebuild();
	await refreshSceneList();
	$('#viewInfo').textContent = S.path + ' (new)';
	log('New scene ' + S.path + ': save to create the file', 'ok');
}
$('#newScene').addEventListener('click', () => newScene());

async function save() {
	if (!S.path) return;
	const text = JSON.stringify(S.doc, null, '\t') + '\n';
	if (!store.connected) {
		if (store.supported) {
			try { await connectFolder(); } catch (e) { /* fall through to a download */ }
		}
	}
	if (!store.connected) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
		a.download = S.path.split('/').pop();
		a.click();
		log('Downloaded ' + a.download + ': put it in ' + S.path.replace(/[^/]+$/, ''), 'warn');
		setDirty(false);
		return;
	}
	try {
		await store.write(S.path, text);
		// keep the scene list for hosts that can't list folders
		const dir = S.path.replace(/\/[^/]+$/, '');
		const names = (await store.list(dir)).filter((x) => !x.dir && /\.json$/.test(x.name) && x.name !== 'index.json').map((x) => x.name);
		await store.write(dir + '/index.json', JSON.stringify(names) + '\n');
		setDirty(false);
		channel && channel.postMessage({ type: 'saved', path: S.path, json: S.doc });
		log('Saved ' + S.path, 'ok');
		$('#viewInfo').textContent = S.path;
		await refreshSceneList();
	} catch (e) { log('Save failed: ' + e.message, 'error'); }
}
$('#save').addEventListener('click', save);
addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

function folderButton() {
	const b = $('#folder');
	b.classList.toggle('ok', store.connected);
	b.textContent = store.connected ? '📁 ' + store.name : store.saved ? 'Reconnect ' + store.name : 'Connect folder';
	b.title = store.connected ? 'Saving into ' + store.name + '/ (click to pick another folder)' : 'Connect your igb-proto folder so Save and Import write into the project';
	if (!store.supported) { b.disabled = true; b.textContent = 'Read only'; b.title = 'Use Chrome or Edge to save into the project folder'; }
}
async function connectFolder() {
	if (store.connected) store.saved = null;
	await store.connect();
	folderButton();
	log('Connected to ' + store.name + '/', 'ok');
	await loadAssets();
	await refreshSceneList();
}
$('#folder').addEventListener('click', () => connectFolder().catch((e) => { if (e.name !== 'AbortError') log(e.message, 'error'); }));

/* ---------- help ---------- */

function showHelp() {
	const m = $('#modal');
	m.innerHTML = `<div class="box"><h2>IGB Studio</h2>
	<h3>Workflow</h3><ol>
	<li><b>Connect folder</b> (top right): pick your igb-proto folder once. Save and Import then write straight into it (assets/&lt;game&gt;/scenes, /models, /textures), ready to commit.</li>
	<li><b>Import</b> models by dropping .glb, .gltf (with its .bin and textures), .fbx or .obj anywhere. Everything is stored as one .glb (FBX in centimetres is scaled to metres). Textures: .png .jpg .webp.</li>
	<li>Build the scene: <b>+ Add</b> shapes, lights, markers and the games' own characters; drag models in from Assets. Templates (ticked in the Inspector) aren't shown in the game; code copies them, e.g. one per player.</li>
	<li>Light and grade it in <b>⚙ Scene Settings</b>; frame it with <b>🎥 Wall Cameras</b>. The strip under the scene is exactly what the game draws on the three walls.</li>
	<li><b>Play in hub</b> opens the game; with both open, every edit shows in the running game straight away. <b>Save</b> (Ctrl+S) when it's right.</li></ol>
	<h3>Keys</h3><table>
	<tr><td><kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd></td><td>move, rotate, scale</td><td><kbd>X</kbd></td><td>local / world</td></tr>
	<tr><td><kbd>F</kbd> or double-click</td><td>focus the selection</td><td><kbd>Ctrl</kbd> while dragging</td><td>snap</td></tr>
	<tr><td><kbd>Ctrl+D</kbd></td><td>duplicate</td><td><kbd>Delete</kbd></td><td>delete</td></tr>
	<tr><td><kbd>Ctrl+Z</kbd> / <kbd>Shift+Ctrl+Z</kbd></td><td>undo / redo</td><td><kbd>Ctrl+S</kbd></td><td>save</td></tr>
	<tr><td><kbd>P</kbd></td><td>pause animations</td><td>drag a label</td><td>scrub its number (Shift ×10)</td></tr>
	<tr><td>left drag</td><td>orbit</td><td>right drag / wheel</td><td>pan / zoom</td></tr></table>
	<h3>In the game's code</h3>
	<div class="code">import { loadScene } from '../../lib/three/igb-scene.js';
const s = await loadScene('assets/my-game/scenes/main.json', { renderer, live: true });
scene.add(s.root); s.applyRender(scene, post); s.applyRig(walls);
s.find('Door'); s.marker('Spawn'); s.instantiate('Player'); s.play(obj, 'Walk_Loop');
// every frame: s.update(dt)</div>
	<p class="note">See docs/studio.md, and games/scene-demo for a working example.</p>
	<div class="btnrow"><button onclick="document.getElementById('modal').hidden=true">Close</button></div></div>`;
	m.hidden = false;
	m.onclick = (e) => { if (e.target === m) m.hidden = true; };
}

/* ---------- every frame ---------- */

const clock = new THREE.Clock();
let lastGame = '';
function layout() {
	const v = $('#view');
	const W = v.clientWidth, H = v.clientHeight;
	let scene = null, game = null;
	const stripH = Math.round(W / 4.8);
	if (S.view === 'scene') scene = { x: 0, y: 0, w: W, h: H };
	else if (S.view === 'game') { const gw = Math.min(W, H * 4.8), gh = Math.round(gw / 4.8); game = { x: Math.round((W - gw) / 2), y: Math.round((H - gh) / 2), w: Math.round(gw), h: gh }; }
	else { const gh = Math.min(stripH, Math.round(H * 0.45)), gw = Math.round(gh * 4.8); game = { x: Math.round((W - gw) / 2), y: H - gh, w: gw, h: gh }; scene = { x: 0, y: 0, w: W, h: H - gh - 2 }; }
	return { W, H, scene, game };
}
function place(el, r) { if (!r) { el.style.display = 'none'; return; } Object.assign(el.style, { display: '', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); }

function frame() {
	requestAnimationFrame(frame);
	if (!S.live) return;
	const dt = Math.min(0.05, clock.getDelta());
	const L = layout();
	const pr = renderer.getPixelRatio();
	const size = renderer.getSize(new THREE.Vector2());
	if (size.x !== L.W || size.y !== L.H) renderer.setSize(L.W, L.H, false);
	place(sceneHit, L.scene);
	place(gameHit, L.game);
	place($('#gameLabels'), L.game && { x: L.game.x, y: L.game.y, w: L.game.w, h: 18 });
	$('#viewInfo').style.display = L.scene ? '' : 'none';

	if (S.animate) S.live.update(dt);
	orbit.update();
	placeIcons();
	const selObj = S.sel && S.sel[0] !== '#' ? holderOf(S.sel) : null;
	selBox.visible = !!selObj;
	if (selObj) { selBox.setFromObject(selObj); if (selBox.geometry.boundingSphere === null) selBox.geometry.computeBoundingSphere(); }
	// a sun shows which way it shines
	const selNode = selObj && find(S.sel).node;
	sunLine.visible = !!(selNode && selNode.type === 'light' && (!selNode.light.kind || selNode.light.kind === 'directional' || selNode.light.kind === 'spot'));
	if (sunLine.visible) { selObj.getWorldPosition(sunLine.position); sunLine.setDirection(new THREE.Vector3(0, 0, -1).applyQuaternion(selObj.getWorldQuaternion(new THREE.Quaternion()))); }

	renderer.setScissorTest(true);
	const toGL = (r) => [r.x, L.H - r.y - r.h, r.w, r.h];
	if (L.scene) {
		editorCam.aspect = L.scene.w / L.scene.h;
		editorCam.updateProjectionMatrix();
		renderer.setViewport(...toGL(L.scene));
		renderer.setScissor(...toGL(L.scene));
		editorOnly.visible = true;
		gizmoHelper.visible = !!gizmo.object;
		renderer.shadowMap.needsUpdate = true;
		renderer.render(scene, editorCam);
	}
	if (L.game) {
		editorOnly.visible = false;
		gizmoHelper.visible = false;
		const templates = [];
		walk(S.doc.objects, (n) => { if (n.template) { const o = holderOf(n.id); if (o && o.visible) { o.visible = false; templates.push(o); } } });
		const key = L.game.w + 'x' + L.game.h + '@' + pr;
		if (key !== lastGame) { post.composer.setPixelRatio(pr); post.composer.setSize(L.game.w, L.game.h); lastGame = key; }
		for (const c of walls.cameras) { c.aspect = 1.6; c.updateProjectionMatrix(); }
		renderer.setViewport(...toGL(L.game));
		renderer.setScissor(...toGL(L.game));
		renderer.shadowMap.needsUpdate = true;
		post.render(walls.views(Math.round(L.game.w * pr), Math.round(L.game.h * pr)));
		for (const o of templates) o.visible = true;
		editorOnly.visible = true;
	}
	renderer.setScissorTest(false);
}

/* ---------- start ---------- */

(async function start() {
	await store.restore();
	folderButton();
	await loadProjects();
	const q = new URLSearchParams(location.search);
	const scenePath = q.get('scene');
	const project = scenePath ? scenePath.split('/')[1] : (q.get('game') || 'scene-demo');
	if (![...$('#project').options].some((o) => o.value === project)) $('#project').insertAdjacentHTML('afterbegin', `<option value="${esc(project)}">${esc(project)}</option>`);
	await openProject(project, scenePath);
	setTool('translate');
	requestAnimationFrame(frame);
	if (!localStorage.getItem('igb-studio-helped')) { localStorage.setItem('igb-studio-helped', '1'); showHelp(); }
	window.studio = { S, scene, renderer, store, select, save, rebuild };
})();
