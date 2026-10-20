/*
 * Glint: the scene graph. Nodes with a position, rotation (an Euler angle and
 * a quaternion kept in step) and scale; groups, meshes, instanced meshes,
 * sprites; cameras; lights; fog; textures.
 */
import { Vector2, Vector3, Quaternion, Euler, Matrix4, Color, Sphere } from './math.js';

export const FrontSide = 0, BackSide = 1, DoubleSide = 2;
export const NormalBlending = 1, AdditiveBlending = 2, MultiplyBlending = 3, NoBlending = 0;
export const RepeatWrapping = 1000, ClampToEdgeWrapping = 1001, MirroredRepeatWrapping = 1002;
export const NearestFilter = 1003, LinearFilter = 1006, LinearMipmapLinearFilter = 1008;
export const SRGBColorSpace = 'srgb', LinearSRGBColorSpace = 'srgb-linear', NoColorSpace = '';

/* ---------- events (for dispose) ---------- */

export class EventDispatcher {
	addEventListener(type, fn) {
		const l = this._listeners || (this._listeners = {});
		(l[type] || (l[type] = [])).push(fn);
	}
	removeEventListener(type, fn) {
		const a = this._listeners && this._listeners[type];
		if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
	}
	dispatchEvent(e) {
		const a = this._listeners && this._listeners[e.type];
		if (a) for (const fn of a.slice()) fn.call(this, e);
	}
}

/* ---------- Node ---------- */

let nodeId = 0;
const _v = new Vector3(), _q = new Quaternion(), _s = new Vector3(), _m = new Matrix4(), _up = new Vector3();

export class Node extends EventDispatcher {
	constructor() {
		super();
		this.id = nodeId++;
		this.name = '';
		this.type = 'Node';
		this.parent = null;
		this.children = [];
		this.position = new Vector3();
		this.rotation = new Euler();
		this.quaternion = new Quaternion();
		this.scale = new Vector3(1, 1, 1);
		this.up = new Vector3(0, 1, 0);
		this.rotation._onChange(() => this.quaternion.setFromEuler(this.rotation, false));
		this.quaternion._onChange(() => this.rotation.setFromQuaternion(this.quaternion, undefined, false));
		this.matrix = new Matrix4();
		this.matrixWorld = new Matrix4();
		this.matrixAutoUpdate = true;
		this.visible = true;
		this.castShadow = false;
		this.receiveShadow = false;
		this.frustumCulled = true;
		this.renderOrder = 0;
		this.userData = {};
	}
	get isObject3D() { return true; }
	add(...objs) {
		for (const o of objs) {
			if (o === this || !o) continue;
			if (o.parent) o.parent.remove(o);
			o.parent = this;
			this.children.push(o);
		}
		return this;
	}
	remove(...objs) {
		for (const o of objs) {
			const i = this.children.indexOf(o);
			if (i >= 0) { this.children.splice(i, 1); o.parent = null; }
		}
		return this;
	}
	removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
	clear() { for (const c of this.children.slice()) this.remove(c); return this; }
	traverse(fn) { fn(this); for (const c of this.children.slice()) c.traverse(fn); }
	traverseVisible(fn) { if (!this.visible) return; fn(this); for (const c of this.children) c.traverseVisible(fn); }
	getObjectByName(name) {
		if (this.name === name) return this;
		for (const c of this.children) { const o = c.getObjectByName(name); if (o) return o; }
		return undefined;
	}
	updateMatrix() { this.matrix.compose(this.position, this.quaternion, this.scale); }
	// Bring this node's (and its children's) world matrices up to date.
	updateMatrixWorld() {
		if (this.matrixAutoUpdate) this.updateMatrix();
		if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
		else this.matrixWorld.copy(this.matrix);
		this._afterMatrixWorld();
		for (const c of this.children) c.updateMatrixWorld();
	}
	_afterMatrixWorld() {}
	// Update this node from the root down (when its parents may have moved).
	updateWorldMatrix(parents = true, children = false) {
		if (parents && this.parent) this.parent.updateWorldMatrix(true, false);
		if (this.matrixAutoUpdate) this.updateMatrix();
		if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
		else this.matrixWorld.copy(this.matrix);
		this._afterMatrixWorld();
		if (children) for (const c of this.children) c.updateWorldMatrix(false, true);
	}
	getWorldPosition(out = new Vector3()) { this.updateWorldMatrix(true, false); return out.setFromMatrixPosition(this.matrixWorld); }
	getWorldQuaternion(out = new Quaternion()) { this.updateWorldMatrix(true, false); this.matrixWorld.decompose(_v, out, _s); return out; }
	getWorldScale(out = new Vector3()) { this.updateWorldMatrix(true, false); this.matrixWorld.decompose(_v, _q, out); return out; }
	// The way this node faces in the world (+z for things, -z for cameras and lights).
	getWorldDirection(out = new Vector3()) {
		this.updateWorldMatrix(true, false);
		const e = this.matrixWorld.elements;
		const s = this._looksDownMinusZ ? -1 : 1;
		return out.set(e[8] * s, e[9] * s, e[10] * s).normalize();
	}
	localToWorld(v) { this.updateWorldMatrix(true, false); return v.applyMatrix4(this.matrixWorld); }
	worldToLocal(v) { this.updateWorldMatrix(true, false); return v.applyMatrix4(_m.copy(this.matrixWorld).invert()); }
	// Turn to face a point in the world: +z toward it (cameras and lights: -z).
	lookAt(x, y, z) {
		const target = x.isVector3 ? _up.copy(x) : _up.set(x, y, z);
		const pos = this.getWorldPosition(new Vector3());
		if (this._looksDownMinusZ) _m.lookAt(pos, target, this.up);
		else _m.lookAt(target, pos, this.up);
		this.quaternion.setFromRotationMatrix(_m);
		if (this.parent) {
			this.parent.getWorldQuaternion(_q);
			this.quaternion.premultiply(_q.invert());
		}
		return this;
	}
	rotateOnAxis(axis, a) { this.quaternion.multiply(_q.setFromAxisAngle(axis, a)); return this; }
	rotateX(a) { return this.rotateOnAxis(_v.set(1, 0, 0), a); }
	rotateY(a) { return this.rotateOnAxis(_v.set(0, 1, 0), a); }
	rotateZ(a) { return this.rotateOnAxis(_v.set(0, 0, 1), a); }
	translateOnAxis(axis, d) { this.position.addScaledVector(_v.copy(axis).applyQuaternion(this.quaternion), d); return this; }
	translateX(d) { return this.translateOnAxis(new Vector3(1, 0, 0), d); }
	translateY(d) { return this.translateOnAxis(new Vector3(0, 1, 0), d); }
	translateZ(d) { return this.translateOnAxis(new Vector3(0, 0, 1), d); }
}

export class Group extends Node {
	constructor() { super(); this.type = 'Group'; }
	get isGroup() { return true; }
}

export class Scene extends Node {
	constructor() {
		super();
		this.type = 'Scene';
		this.background = null;           // a Color, or null for black
		this.environment = null;          // an environment from renderer.environmentFrom...()
		this.environmentIntensity = 1;
		this.fog = null;
	}
	get isScene() { return true; }
}

export class Fog {
	constructor(color, near = 1, far = 1000) { this.color = new Color(color); this.near = near; this.far = far; }
	get isFog() { return true; }
}
export class FogExp2 {
	constructor(color, density = 0.00025) { this.color = new Color(color); this.density = density; }
	get isFogExp2() { return true; }
}

/* ---------- meshes and sprites ---------- */

const _inv = new Matrix4(), _sphere = new Sphere();
const _a = new Vector3(), _b = new Vector3(), _c = new Vector3(), _e1 = new Vector3(), _e2 = new Vector3(), _p = new Vector3(), _tv = new Vector3(), _qv = new Vector3();

export class Mesh extends Node {
	constructor(geometry, material) {
		super();
		this.type = 'Mesh';
		this.geometry = geometry;
		this.material = material;   // or an array, one per geometry group
	}
	get isMesh() { return true; }
	// Ray against the bounding sphere, then each triangle (in the mesh's own space).
	raycast(raycaster, out) {
		const g = this.geometry;
		if (!g || !g.attributes.position) return;
		if (!g.boundingSphere) g.computeBoundingSphere();
		this.updateWorldMatrix(true, false);
		_sphere.copy(g.boundingSphere).applyMatrix4(this.matrixWorld);
		if (raycaster.ray.intersectSphere(_sphere.center, _sphere.radius) === null) return;
		_inv.copy(this.matrixWorld).invert();
		const o = _a.copy(raycaster.ray.origin).applyMatrix4(_inv);
		const d = _b.copy(raycaster.ray.direction).transformDirection(_inv);
		const pos = g.attributes.position, idx = g.index;
		const n = idx ? idx.count : pos.count;
		let best = Infinity, bestFace = -1;
		const A = new Vector3(), B = new Vector3(), C = new Vector3();
		for (let i = 0; i < n; i += 3) {
			const i0 = idx ? idx.array[i] : i, i1 = idx ? idx.array[i + 1] : i + 1, i2 = idx ? idx.array[i + 2] : i + 2;
			A.fromArray(pos.array, i0 * 3); B.fromArray(pos.array, i1 * 3); C.fromArray(pos.array, i2 * 3);
			// Möller–Trumbore, both faces
			_e1.subVectors(B, A); _e2.subVectors(C, A);
			_p.crossVectors(d, _e2);
			const det = _e1.dot(_p);
			if (Math.abs(det) < 1e-12) continue;
			const inv = 1 / det;
			_tv.subVectors(o, A);
			const u = _tv.dot(_p) * inv;
			if (u < 0 || u > 1) continue;
			_qv.crossVectors(_tv, _e1);
			const v = d.dot(_qv) * inv;
			if (v < 0 || u + v > 1) continue;
			const t = _e2.dot(_qv) * inv;
			if (t > 0 && t < best) { best = t; bestFace = i / 3; }
		}
		if (bestFace < 0) return;
		const point = _c.copy(o).addScaledVector(d, best).applyMatrix4(this.matrixWorld).clone();
		const distance = point.distanceTo(raycaster.ray.origin);
		if (distance < raycaster.near || distance > raycaster.far) return;
		out.push({ distance, point, object: this, faceIndex: bestFace });
	}
}

// Many copies of one mesh in one draw: a matrix (and optionally a colour) each.
export class InstancedMesh extends Mesh {
	constructor(geometry, material, count) {
		super(geometry, material);
		this.type = 'InstancedMesh';
		this.count = count;
		this.instanceMatrix = { array: new Float32Array(count * 16), itemSize: 16, count, version: 0, set needsUpdate(v) { if (v) this.version++; } };
		for (let i = 0; i < count; i++) this.instanceMatrix.array.set(_m.identity().elements, i * 16);
		this.instanceColor = null;
		this.frustumCulled = false;
	}
	get isInstancedMesh() { return true; }
	setMatrixAt(i, m) { this.instanceMatrix.array.set(m.elements, i * 16); }
	getMatrixAt(i, m) { return m.fromArray(this.instanceMatrix.array, i * 16); }
	setColorAt(i, c) {
		if (!this.instanceColor) {
			const a = new Float32Array(this.count * 3).fill(1);
			this.instanceColor = { array: a, itemSize: 3, count: this.count, version: 0, set needsUpdate(v) { if (v) this.version++; } };
		}
		this.instanceColor.array[i * 3] = c.r; this.instanceColor.array[i * 3 + 1] = c.g; this.instanceColor.array[i * 3 + 2] = c.b;
	}
	raycast(raycaster, out) {
		// each instance against the mesh, by its bounding sphere only
		const g = this.geometry;
		if (!g.boundingSphere) g.computeBoundingSphere();
		this.updateWorldMatrix(true, false);
		for (let i = 0; i < this.count; i++) {
			_m.fromArray(this.instanceMatrix.array, i * 16).premultiply(this.matrixWorld);
			_sphere.copy(g.boundingSphere).applyMatrix4(_m);
			const t = raycaster.ray.intersectSphere(_sphere.center, _sphere.radius);
			if (t !== null && t >= raycaster.near && t <= raycaster.far) out.push({ distance: t, point: raycaster.ray.at(t), object: this, instanceId: i });
		}
	}
}

// A flat picture always facing the camera, scale.x by scale.y wide.
export class Sprite extends Node {
	constructor(material) {
		super();
		this.type = 'Sprite';
		this.material = material;
		this.center = new Vector2(0.5, 0.5);
	}
	get isSprite() { return true; }
}

/* ---------- cameras ---------- */

export class Camera extends Node {
	constructor() {
		super();
		this.type = 'Camera';
		this.projectionMatrix = new Matrix4();
		this.matrixWorldInverse = new Matrix4();
		this._looksDownMinusZ = true;
	}
	get isCamera() { return true; }
	_afterMatrixWorld() { this.matrixWorldInverse.copy(this.matrixWorld).invert(); }
}

export class PerspectiveCamera extends Camera {
	constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
		super();
		this.type = 'PerspectiveCamera';
		this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; this.zoom = 1;
		this.updateProjectionMatrix();
	}
	get isPerspectiveCamera() { return true; }
	updateProjectionMatrix() {
		const fov = 2 * Math.atan(Math.tan(this.fov * Math.PI / 360) / this.zoom) * 180 / Math.PI;
		this.projectionMatrix.makePerspective(fov, this.aspect, this.near, this.far);
	}
}

export class OrthographicCamera extends Camera {
	constructor(left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000) {
		super();
		this.type = 'OrthographicCamera';
		Object.assign(this, { left, right, top, bottom, near, far });
		this.updateProjectionMatrix();
	}
	get isOrthographicCamera() { return true; }
	updateProjectionMatrix() { this.projectionMatrix.makeOrthographic(this.left, this.right, this.top, this.bottom, this.near, this.far); }
}

/* ---------- lights ---------- */

// Intensities follow the usual physically based convention: a white
// surface square to a directional light of intensity π shows white.
export class Light extends Node {
	constructor(color = 0xffffff, intensity = 1) {
		super();
		this.type = 'Light';
		this.color = new Color(color);
		this.intensity = intensity;
		this._looksDownMinusZ = true;
	}
	get isLight() { return true; }
}

export class AmbientLight extends Light {
	constructor(color, intensity) { super(color, intensity); this.type = 'AmbientLight'; }
	get isAmbientLight() { return true; }
}

export class HemisphereLight extends Light {
	constructor(sky = 0xffffff, ground = 0x444444, intensity = 1) {
		super(sky, intensity);
		this.type = 'HemisphereLight';
		this.groundColor = new Color(ground);
	}
	get isHemisphereLight() { return true; }
}

// Shines from its position toward its target (add the target to the scene,
// or leave it at the origin). The first directional light that casts shadows
// gets a shadow map; shadow.camera's box (in light space) sets what it covers.
export class DirectionalLight extends Light {
	constructor(color, intensity) {
		super(color, intensity);
		this.type = 'DirectionalLight';
		this.position.set(0, 1, 0);
		this.target = new Node();
		this.shadow = {
			mapSize: new Vector2(2048, 2048),
			camera: new OrthographicCamera(-20, 20, 20, -20, 0.5, 200),
			bias: -0.0005,
			normalBias: 0.02,
			radius: 1.5,      // softness, in shadow map texels
			needsUpdate: true,
		};
	}
	get isDirectionalLight() { return true; }
}

// Light from a point, fading with distance (0 distance: never cut off).
export class PointLight extends Light {
	constructor(color, intensity = 1, distance = 0, decay = 2) {
		super(color, intensity);
		this.type = 'PointLight';
		this.distance = distance;
		this.decay = decay;
	}
	get isPointLight() { return true; }
}

/* ---------- textures ---------- */

let texId = 0;
export class Texture extends EventDispatcher {
	constructor(image = null) {
		super();
		this.id = texId++;
		this.image = image;
		this.wrapS = ClampToEdgeWrapping;
		this.wrapT = ClampToEdgeWrapping;
		this.magFilter = LinearFilter;
		this.minFilter = LinearMipmapLinearFilter;
		this.generateMipmaps = true;
		this.anisotropy = 1;
		this.colorSpace = NoColorSpace;
		this.flipY = true;
		this.offset = new Vector2(0, 0);
		this.repeat = new Vector2(1, 1);
		this.version = 0;
		this.userData = {};
	}
	get isTexture() { return true; }
	set needsUpdate(v) { if (v) this.version++; }
	clone() {
		const t = new this.constructor(this.image);
		for (const k of ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'generateMipmaps', 'anisotropy', 'colorSpace', 'flipY']) t[k] = this[k];
		t.offset.copy(this.offset); t.repeat.copy(this.repeat);
		t.version = 1;
		return t;
	}
	dispose() { this.dispatchEvent({ type: 'dispose' }); }
}

// A texture painted on a canvas (it uploads once; set needsUpdate after repainting).
export class CanvasTexture extends Texture {
	constructor(canvas) { super(canvas); this.version = 1; }
}

// Raw pixels: data is a Uint8Array (RGBA) or Float32Array (RGBA, linear HDR).
export class DataTexture extends Texture {
	constructor(data, width, height) {
		super({ data, width, height });
		this.version = 1;
		this.flipY = false;
		this.generateMipmaps = false;
		this.minFilter = LinearFilter;
	}
	get isDataTexture() { return true; }
}

// A texture from an image file; it uploads when the image arrives.
export function loadTexture(url, onLoad) {
	const t = new Texture();
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = () => { t.image = img; t.needsUpdate = true; if (onLoad) onLoad(t); };
	img.src = url;
	return t;
}

// Paint a canvas and make it a colour texture: canvasTexture(w, h, (ctx, w, h) => {...}).
export function canvasTexture(w, h, paint, srgb = true) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new CanvasTexture(c);
	if (srgb) t.colorSpace = SRGBColorSpace;
	return t;
}
