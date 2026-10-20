/*
 * Glint: the maths. Vectors, quaternions, Euler angles, 4x4 matrices,
 * colours, planes and frustums. Matrices are column-major, as GL wants them.
 * The shapes and names follow the conventions most 3D code already uses
 * (set, copy, clone, add, applyQuaternion...), so game code reads familiarly.
 */

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- Vector2 ---------- */

export class Vector2 {
	constructor(x = 0, y = 0) { this.x = x; this.y = y; }
	set(x, y) { this.x = x; this.y = y; return this; }
	copy(v) { this.x = v.x; this.y = v.y; return this; }
	clone() { return new Vector2(this.x, this.y); }
	add(v) { this.x += v.x; this.y += v.y; return this; }
	sub(v) { this.x -= v.x; this.y -= v.y; return this; }
	multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
	length() { return Math.hypot(this.x, this.y); }
	normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; return this; }
	dot(v) { return this.x * v.x + this.y * v.y; }
}

/* ---------- Vector3 ---------- */

export class Vector3 {
	constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
	get isVector3() { return true; }
	set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
	setScalar(s) { this.x = this.y = this.z = s; return this; }
	setX(x) { this.x = x; return this; }
	setY(y) { this.y = y; return this; }
	setZ(z) { this.z = z; return this; }
	copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
	clone() { return new Vector3(this.x, this.y, this.z); }
	fromArray(a, o = 0) { this.x = a[o]; this.y = a[o + 1]; this.z = a[o + 2]; return this; }
	toArray(a = [], o = 0) { a[o] = this.x; a[o + 1] = this.y; a[o + 2] = this.z; return a; }
	add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
	addVectors(a, b) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this; }
	addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
	sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
	subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
	multiply(v) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this; }
	multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
	divideScalar(s) { return this.multiplyScalar(1 / s); }
	negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
	dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
	cross(v) { return this.crossVectors(this, v); }
	crossVectors(a, b) {
		const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x;
		this.x = x; this.y = y; this.z = z; return this;
	}
	lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
	length() { return Math.sqrt(this.lengthSq()); }
	normalize() { return this.divideScalar(this.length() || 1); }
	setLength(l) { return this.normalize().multiplyScalar(l); }
	distanceTo(v) { return Math.sqrt(this.distanceToSquared(v)); }
	distanceToSquared(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return dx * dx + dy * dy + dz * dz; }
	lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
	lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this; }
	min(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; }
	max(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; }
	equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
	applyQuaternion(q) {
		const x = this.x, y = this.y, z = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
		const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
		this.x = x + qw * tx + qy * tz - qz * ty;
		this.y = y + qw * ty + qz * tx - qx * tz;
		this.z = z + qw * tz + qx * ty - qy * tx;
		return this;
	}
	applyAxisAngle(axis, a) { return this.applyQuaternion(_q.setFromAxisAngle(axis, a)); }
	applyMatrix4(m) {
		const e = m.elements, x = this.x, y = this.y, z = this.z;
		const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
		this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
		this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
		this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
		return this;
	}
	transformDirection(m) {
		const e = m.elements, x = this.x, y = this.y, z = this.z;
		this.x = e[0] * x + e[4] * y + e[8] * z;
		this.y = e[1] * x + e[5] * y + e[9] * z;
		this.z = e[2] * x + e[6] * y + e[10] * z;
		return this.normalize();
	}
	setFromMatrixPosition(m) { const e = m.elements; return this.set(e[12], e[13], e[14]); }
	setFromMatrixColumn(m, i) { return this.fromArray(m.elements, i * 4); }
	// To normalised device coordinates for a camera (x, y in -1..1 on screen; z > 1 behind).
	project(camera) {
		this.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
		return this;
	}
	unproject(camera) {
		this.applyMatrix4(_m.copy(camera.projectionMatrix).invert()).applyMatrix4(camera.matrixWorld);
		return this;
	}
}

/* ---------- Quaternion ---------- */

// Its components are properties with setters so a node's Euler rotation can
// follow when the quaternion changes (and the other way round).
export class Quaternion {
	constructor(x = 0, y = 0, z = 0, w = 1) { this._x = x; this._y = y; this._z = z; this._w = w; this._cb = null; }
	get x() { return this._x; } set x(v) { this._x = v; this._changed(); }
	get y() { return this._y; } set y(v) { this._y = v; this._changed(); }
	get z() { return this._z; } set z(v) { this._z = v; this._changed(); }
	get w() { return this._w; } set w(v) { this._w = v; this._changed(); }
	_changed() { if (this._cb) this._cb(); }
	_onChange(fn) { this._cb = fn; return this; }
	set(x, y, z, w) { this._x = x; this._y = y; this._z = z; this._w = w; this._changed(); return this; }
	identity() { return this.set(0, 0, 0, 1); }
	copy(q) { return this.set(q.x, q.y, q.z, q.w); }
	clone() { return new Quaternion(this._x, this._y, this._z, this._w); }
	setFromAxisAngle(axis, a) {
		const s = Math.sin(a / 2);
		return this.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(a / 2));
	}
	setFromEuler(e, update = true) {
		const c1 = Math.cos(e._x / 2), c2 = Math.cos(e._y / 2), c3 = Math.cos(e._z / 2);
		const s1 = Math.sin(e._x / 2), s2 = Math.sin(e._y / 2), s3 = Math.sin(e._z / 2);
		let x, y, z, w;
		switch (e._order) {
			case 'XYZ': x = s1 * c2 * c3 + c1 * s2 * s3; y = c1 * s2 * c3 - s1 * c2 * s3; z = c1 * c2 * s3 + s1 * s2 * c3; w = c1 * c2 * c3 - s1 * s2 * s3; break;
			case 'YXZ': x = s1 * c2 * c3 + c1 * s2 * s3; y = c1 * s2 * c3 - s1 * c2 * s3; z = c1 * c2 * s3 - s1 * s2 * c3; w = c1 * c2 * c3 + s1 * s2 * s3; break;
			case 'ZXY': x = s1 * c2 * c3 - c1 * s2 * s3; y = c1 * s2 * c3 + s1 * c2 * s3; z = c1 * c2 * s3 + s1 * s2 * c3; w = c1 * c2 * c3 - s1 * s2 * s3; break;
			case 'ZYX': x = s1 * c2 * c3 - c1 * s2 * s3; y = c1 * s2 * c3 + s1 * c2 * s3; z = c1 * c2 * s3 - s1 * s2 * c3; w = c1 * c2 * c3 + s1 * s2 * s3; break;
			case 'YZX': x = s1 * c2 * c3 + c1 * s2 * s3; y = c1 * s2 * c3 + s1 * c2 * s3; z = c1 * c2 * s3 - s1 * s2 * c3; w = c1 * c2 * c3 - s1 * s2 * s3; break;
			default: /* XZY */ x = s1 * c2 * c3 - c1 * s2 * s3; y = c1 * s2 * c3 - s1 * c2 * s3; z = c1 * c2 * s3 + s1 * s2 * c3; w = c1 * c2 * c3 + s1 * s2 * s3;
		}
		this._x = x; this._y = y; this._z = z; this._w = w;
		if (update) this._changed();
		return this;
	}
	setFromRotationMatrix(m) {
		const e = m.elements;
		const m11 = e[0], m12 = e[4], m13 = e[8], m21 = e[1], m22 = e[5], m23 = e[9], m31 = e[2], m32 = e[6], m33 = e[10];
		const tr = m11 + m22 + m33;
		let x, y, z, w;
		if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); w = 0.25 / s; x = (m32 - m23) * s; y = (m13 - m31) * s; z = (m21 - m12) * s; }
		else if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); w = (m32 - m23) / s; x = 0.25 * s; y = (m12 + m21) / s; z = (m13 + m31) / s; }
		else if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); w = (m13 - m31) / s; x = (m12 + m21) / s; y = 0.25 * s; z = (m23 + m32) / s; }
		else { const s = 2 * Math.sqrt(1 + m33 - m11 - m22); w = (m21 - m12) / s; x = (m13 + m31) / s; y = (m23 + m32) / s; z = 0.25 * s; }
		return this.set(x, y, z, w);
	}
	// The turn that takes unit vector a onto unit vector b.
	setFromUnitVectors(a, b) {
		let r = a.dot(b) + 1, x, y, z, w;
		if (r < 1e-8) {
			r = 0;
			if (Math.abs(a.x) > Math.abs(a.z)) { x = -a.y; y = a.x; z = 0; w = r; } else { x = 0; y = -a.z; z = a.y; w = r; }
		} else { x = a.y * b.z - a.z * b.y; y = a.z * b.x - a.x * b.z; z = a.x * b.y - a.y * b.x; w = r; }
		this._x = x; this._y = y; this._z = z; this._w = w;
		return this.normalize();
	}
	length() { return Math.hypot(this._x, this._y, this._z, this._w); }
	normalize() {
		let l = this.length();
		if (l === 0) return this.set(0, 0, 0, 1);
		l = 1 / l;
		return this.set(this._x * l, this._y * l, this._z * l, this._w * l);
	}
	invert() { return this.set(-this._x, -this._y, -this._z, this._w); }
	conjugate() { return this.invert(); }
	dot(q) { return this._x * q._x + this._y * q._y + this._z * q._z + this._w * q._w; }
	multiply(q) { return this.multiplyQuaternions(this, q); }
	premultiply(q) { return this.multiplyQuaternions(q, this); }
	multiplyQuaternions(a, b) {
		const ax = a._x, ay = a._y, az = a._z, aw = a._w, bx = b._x, by = b._y, bz = b._z, bw = b._w;
		return this.set(
			ax * bw + aw * bx + ay * bz - az * by,
			ay * bw + aw * by + az * bx - ax * bz,
			az * bw + aw * bz + ax * by - ay * bx,
			aw * bw - ax * bx - ay * by - az * bz);
	}
	slerp(qb, t) {
		if (t === 0) return this;
		if (t === 1) return this.copy(qb);
		const x = this._x, y = this._y, z = this._z, w = this._w;
		let cos = w * qb._w + x * qb._x + y * qb._y + z * qb._z;
		let bx = qb._x, by = qb._y, bz = qb._z, bw = qb._w;
		if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
		if (cos > 0.9995) {
			this._x = x + (bx - x) * t; this._y = y + (by - y) * t; this._z = z + (bz - z) * t; this._w = w + (bw - w) * t;
			return this.normalize();
		}
		const sin = Math.sqrt(1 - cos * cos);
		const a = Math.atan2(sin, cos);
		const ra = Math.sin((1 - t) * a) / sin, rb = Math.sin(t * a) / sin;
		return this.set(x * ra + bx * rb, y * ra + by * rb, z * ra + bz * rb, w * ra + bw * rb);
	}
	slerpQuaternions(a, b, t) { return this.copy(a).slerp(b, t); }
	angleTo(q) { return 2 * Math.acos(Math.abs(clamp(this.dot(q), -1, 1))); }
	equals(q) { return q._x === this._x && q._y === this._y && q._z === this._z && q._w === this._w; }
}

/* ---------- Euler ---------- */

export class Euler {
	constructor(x = 0, y = 0, z = 0, order = 'XYZ') { this._x = x; this._y = y; this._z = z; this._order = order; this._cb = null; }
	get x() { return this._x; } set x(v) { this._x = v; this._changed(); }
	get y() { return this._y; } set y(v) { this._y = v; this._changed(); }
	get z() { return this._z; } set z(v) { this._z = v; this._changed(); }
	get order() { return this._order; } set order(v) { this._order = v; this._changed(); }
	_changed() { if (this._cb) this._cb(); }
	_onChange(fn) { this._cb = fn; return this; }
	set(x, y, z, order = this._order) { this._x = x; this._y = y; this._z = z; this._order = order; this._changed(); return this; }
	copy(e) { return this.set(e._x, e._y, e._z, e._order); }
	clone() { return new Euler(this._x, this._y, this._z, this._order); }
	setFromRotationMatrix(m, order = this._order, update = true) {
		const e = m.elements;
		const m11 = e[0], m12 = e[4], m13 = e[8], m21 = e[1], m22 = e[5], m23 = e[9], m31 = e[2], m32 = e[6], m33 = e[10];
		switch (order) {
			case 'XYZ':
				this._y = Math.asin(clamp(m13, -1, 1));
				if (Math.abs(m13) < 0.9999999) { this._x = Math.atan2(-m23, m33); this._z = Math.atan2(-m12, m11); }
				else { this._x = Math.atan2(m32, m22); this._z = 0; }
				break;
			case 'YXZ':
				this._x = Math.asin(-clamp(m23, -1, 1));
				if (Math.abs(m23) < 0.9999999) { this._y = Math.atan2(m13, m33); this._z = Math.atan2(m21, m22); }
				else { this._y = Math.atan2(-m31, m11); this._z = 0; }
				break;
			case 'ZXY':
				this._x = Math.asin(clamp(m32, -1, 1));
				if (Math.abs(m32) < 0.9999999) { this._y = Math.atan2(-m31, m33); this._z = Math.atan2(-m12, m22); }
				else { this._y = 0; this._z = Math.atan2(m21, m11); }
				break;
			case 'ZYX':
				this._y = Math.asin(-clamp(m31, -1, 1));
				if (Math.abs(m31) < 0.9999999) { this._x = Math.atan2(m32, m33); this._z = Math.atan2(m21, m11); }
				else { this._x = 0; this._z = Math.atan2(-m12, m22); }
				break;
			case 'YZX':
				this._z = Math.asin(clamp(m21, -1, 1));
				if (Math.abs(m21) < 0.9999999) { this._x = Math.atan2(-m23, m22); this._y = Math.atan2(-m31, m11); }
				else { this._x = 0; this._y = Math.atan2(m13, m33); }
				break;
			default: // XZY
				this._z = Math.asin(-clamp(m12, -1, 1));
				if (Math.abs(m12) < 0.9999999) { this._x = Math.atan2(m32, m22); this._y = Math.atan2(m13, m11); }
				else { this._x = Math.atan2(-m23, m33); this._y = 0; }
		}
		this._order = order;
		if (update) this._changed();
		return this;
	}
	setFromQuaternion(q, order, update) { return this.setFromRotationMatrix(_m.makeRotationFromQuaternion(q), order, update); }
}

/* ---------- Matrix4 ---------- */

export class Matrix4 {
	constructor() { this.elements = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
	identity() { this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); return this; }
	copy(m) { this.elements.set(m.elements); return this; }
	clone() { return new Matrix4().copy(this); }
	fromArray(a, o = 0) { for (let i = 0; i < 16; i++) this.elements[i] = a[i + o]; return this; }
	multiply(m) { return this.multiplyMatrices(this, m); }
	premultiply(m) { return this.multiplyMatrices(m, this); }
	multiplyMatrices(a, b) {
		const ae = a.elements, be = b.elements, te = this.elements;
		const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
		const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
		const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
		const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
		const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
		const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
		const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
		const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
		te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
		te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
		te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
		te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
		te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
		te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
		te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
		te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
		te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
		te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
		te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
		te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
		te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
		te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
		te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
		te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
		return this;
	}
	compose(p, q, s) {
		const te = this.elements;
		const x = q.x, y = q.y, z = q.z, w = q.w;
		const x2 = x + x, y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;
		const sx = s.x, sy = s.y, sz = s.z;
		te[0] = (1 - (yy + zz)) * sx; te[1] = (xy + wz) * sx; te[2] = (xz - wy) * sx; te[3] = 0;
		te[4] = (xy - wz) * sy; te[5] = (1 - (xx + zz)) * sy; te[6] = (yz + wx) * sy; te[7] = 0;
		te[8] = (xz + wy) * sz; te[9] = (yz - wx) * sz; te[10] = (1 - (xx + yy)) * sz; te[11] = 0;
		te[12] = p.x; te[13] = p.y; te[14] = p.z; te[15] = 1;
		return this;
	}
	decompose(p, q, s) {
		const te = this.elements;
		let sx = Math.hypot(te[0], te[1], te[2]);
		const sy = Math.hypot(te[4], te[5], te[6]);
		const sz = Math.hypot(te[8], te[9], te[10]);
		if (this.determinant() < 0) sx = -sx;
		p.set(te[12], te[13], te[14]);
		_m.copy(this);
		const e = _m.elements;
		e[0] /= sx; e[1] /= sx; e[2] /= sx;
		e[4] /= sy; e[5] /= sy; e[6] /= sy;
		e[8] /= sz; e[9] /= sz; e[10] /= sz;
		q.setFromRotationMatrix(_m);
		s.set(sx, sy, sz);
		return this;
	}
	makeRotationFromQuaternion(q) { return this.compose(_zero, q, _one); }
	makeTranslation(x, y, z) { this.identity(); this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
	makeScale(x, y, z) { this.identity(); this.elements[0] = x; this.elements[5] = y; this.elements[10] = z; return this; }
	setPosition(x, y, z) { if (x.isVector3) { y = x.y; z = x.z; x = x.x; } this.elements[12] = x; this.elements[13] = y; this.elements[14] = z; return this; }
	// A rotation that looks from eye toward target (its -z down the line).
	lookAt(eye, target, up) {
		const z = _v1.subVectors(eye, target);
		if (z.lengthSq() === 0) z.z = 1;
		z.normalize();
		const x = _v2.crossVectors(up, z);
		if (x.lengthSq() === 0) { z.z += Math.abs(up.z) === 1 ? 0.0001 : 0; z.x += 0.0001; z.normalize(); x.crossVectors(up, z); }
		x.normalize();
		const y = _v3.crossVectors(z, x);
		const te = this.elements;
		te[0] = x.x; te[4] = y.x; te[8] = z.x;
		te[1] = x.y; te[5] = y.y; te[9] = z.y;
		te[2] = x.z; te[6] = y.z; te[10] = z.z;
		return this;
	}
	determinant() {
		const te = this.elements;
		const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
		const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
		const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
		const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
		return n41 * (n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34)
			+ n42 * (n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31)
			+ n43 * (n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31)
			+ n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
	}
	invert() {
		const te = this.elements;
		const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
		const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
		const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
		const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];
		const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
		const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
		const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
		const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
		if (det === 0) return this.identity();
		const d = 1 / det;
		te[0] = t11 * d;
		te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * d;
		te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * d;
		te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * d;
		te[4] = t12 * d;
		te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * d;
		te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * d;
		te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * d;
		te[8] = t13 * d;
		te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * d;
		te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * d;
		te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * d;
		te[12] = t14 * d;
		te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * d;
		te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * d;
		te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * d;
		return this;
	}
	maxScale() {
		const te = this.elements;
		return Math.sqrt(Math.max(te[0] * te[0] + te[1] * te[1] + te[2] * te[2], te[4] * te[4] + te[5] * te[5] + te[6] * te[6], te[8] * te[8] + te[9] * te[9] + te[10] * te[10]));
	}
	makePerspective(fovY, aspect, near, far) {
		const f = 1 / Math.tan(fovY * DEG / 2);
		const te = this.elements;
		te.fill(0);
		te[0] = f / aspect; te[5] = f;
		te[10] = -(far + near) / (far - near); te[11] = -1;
		te[14] = -2 * far * near / (far - near);
		return this;
	}
	makeOrthographic(left, right, top, bottom, near, far) {
		const te = this.elements;
		te.fill(0);
		te[0] = 2 / (right - left); te[5] = 2 / (top - bottom); te[10] = -2 / (far - near);
		te[12] = -(right + left) / (right - left); te[13] = -(top + bottom) / (top - bottom); te[14] = -(far + near) / (far - near);
		te[15] = 1;
		return this;
	}
}

/* ---------- Color ---------- */

// Colours are kept linear (what lighting wants). Hex numbers and CSS strings
// are taken as sRGB and converted.
const toLinear = (c) => (c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4));
const toSRGB = (c) => (c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055);
let _ctx2d = null;

export class Color {
	constructor(r, g, b) {
		this.r = 1; this.g = 1; this.b = 1;
		if (r !== undefined) { if (g === undefined) this.set(r); else this.setRGB(r, g, b); }
	}
	get isColor() { return true; }
	set(v) {
		if (v && v.isColor) return this.copy(v);
		if (typeof v === 'number') return this.setHex(v);
		if (typeof v === 'string') return this.setStyle(v);
		return this;
	}
	setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }   // linear
	setHex(hex) {
		hex = Math.floor(hex);
		this.r = toLinear((hex >> 16 & 255) / 255);
		this.g = toLinear((hex >> 8 & 255) / 255);
		this.b = toLinear((hex & 255) / 255);
		return this;
	}
	setStyle(s) {
		let m;
		if ((m = /^#([0-9a-f]{6})$/i.exec(s))) return this.setHex(parseInt(m[1], 16));
		if ((m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s))) return this.setHex(parseInt(m[1] + m[1] + m[2] + m[2] + m[3] + m[3], 16));
		if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s))) {
			this.r = toLinear(+m[1] / 255); this.g = toLinear(+m[2] / 255); this.b = toLinear(+m[3] / 255);
			return this;
		}
		// a named colour: let the browser resolve it
		_ctx2d = _ctx2d || document.createElement('canvas').getContext('2d');
		_ctx2d.fillStyle = '#000';
		_ctx2d.fillStyle = s;
		const r = _ctx2d.fillStyle;
		return r.startsWith('#') ? this.setHex(parseInt(r.slice(1), 16)) : this.setStyle(r);
	}
	setHSL(h, s, l) {   // sRGB-space hsl
		h = ((h % 1) + 1) % 1;
		const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
		this.r = toLinear(f(0)); this.g = toLinear(f(8)); this.b = toLinear(f(4));
		return this;
	}
	getHex() {
		const c = (v) => clamp(Math.round(toSRGB(v) * 255), 0, 255);
		return (c(this.r) << 16) | (c(this.g) << 8) | c(this.b);
	}
	getStyle() { return '#' + this.getHex().toString(16).padStart(6, '0'); }
	copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
	clone() { return new Color().copy(this); }
	lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
	lerpColors(a, b, t) { return this.copy(a).lerp(b, t); }
	multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
	multiply(c) { this.r *= c.r; this.g *= c.g; this.b *= c.b; return this; }
	add(c) { this.r += c.r; this.g += c.g; this.b += c.b; return this; }
	offsetHSL(dh, ds, dl) {   // a rough nudge in sRGB space
		const r = toSRGB(this.r), g = toSRGB(this.g), b = toSRGB(this.b);
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h = 0, s = 0;
		const l = (max + min) / 2;
		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
			h /= 6;
		}
		return this.setHSL(h + dh, clamp(s + ds, 0, 1), clamp(l + dl, 0, 1));
	}
}

/* ---------- Plane, Sphere, Frustum ---------- */

export class Plane {
	constructor(normal = new Vector3(0, 1, 0), constant = 0) { this.normal = normal; this.constant = constant; }
	setComponents(x, y, z, w) {
		const l = Math.hypot(x, y, z) || 1;
		this.normal.set(x / l, y / l, z / l);
		this.constant = w / l;
		return this;
	}
	distanceToPoint(p) { return this.normal.dot(p) + this.constant; }
}

export class Sphere {
	constructor(center = new Vector3(), radius = -1) { this.center = center; this.radius = radius; }
	copy(s) { this.center.copy(s.center); this.radius = s.radius; return this; }
	applyMatrix4(m) { this.center.applyMatrix4(m); this.radius *= m.maxScale(); return this; }
}

export class Frustum {
	constructor() { this.planes = [0, 1, 2, 3, 4, 5].map(() => new Plane()); }
	// From a projection times view matrix.
	setFromMatrix(m) {
		const e = m.elements, p = this.planes;
		p[0].setComponents(e[3] - e[0], e[7] - e[4], e[11] - e[8], e[15] - e[12]);
		p[1].setComponents(e[3] + e[0], e[7] + e[4], e[11] + e[8], e[15] + e[12]);
		p[2].setComponents(e[3] + e[1], e[7] + e[5], e[11] + e[9], e[15] + e[13]);
		p[3].setComponents(e[3] - e[1], e[7] - e[5], e[11] - e[9], e[15] - e[13]);
		p[4].setComponents(e[3] - e[2], e[7] - e[6], e[11] - e[10], e[15] - e[14]);
		p[5].setComponents(e[3] + e[2], e[7] + e[6], e[11] + e[10], e[15] + e[14]);
		return this;
	}
	intersectsSphere(s) {
		for (const p of this.planes) if (p.distanceToPoint(s.center) < -s.radius) return false;
		return true;
	}
}

/* ---------- curves ---------- */

// A smooth curve through points (centripetal-free, plain Catmull-Rom).
export class CatmullRomCurve3 {
	constructor(points = [], closed = false) { this.points = points; this.closed = closed; }
	getPoint(t, out = new Vector3()) {
		const pts = this.points, n = pts.length;
		const p = (n - (this.closed ? 0 : 1)) * t;
		let i = Math.floor(p);
		let w = p - i;
		if (this.closed) i += i > 0 ? 0 : (Math.floor(Math.abs(i) / n) + 1) * n;
		else if (w === 0 && i === n - 1) { i = n - 2; w = 1; }
		const at = (k) => (this.closed ? pts[((k % n) + n) % n] : pts[clamp(k, 0, n - 1)]);
		const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
		const cr = (a, b, c, d) => {
			const v0 = (c - a) * 0.5, v1 = (d - b) * 0.5, t2 = w * w, t3 = w * t2;
			return (2 * b - 2 * c + v0 + v1) * t3 + (-3 * b + 3 * c - 2 * v0 - v1) * t2 + v0 * w + b;
		};
		return out.set(cr(p0.x, p1.x, p2.x, p3.x), cr(p0.y, p1.y, p2.y, p3.y), cr(p0.z, p1.z, p2.z, p3.z));
	}
	getTangent(t, out = new Vector3()) {
		const d = 0.0001;
		const a = this.getPoint(Math.max(0, t - d)), b = this.getPoint(Math.min(1, t + d));
		return out.subVectors(b, a).normalize();
	}
}


/* ---------- rays and lines ---------- */

export class Ray {
	constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) { this.origin = origin; this.direction = direction; }
	set(o, d) { this.origin.copy(o); this.direction.copy(d); return this; }
	at(t, out = new Vector3()) { return out.copy(this.origin).addScaledVector(this.direction, t); }
	// From a camera through a point in normalised device coordinates (-1..1).
	setFromCamera(ndc, camera) {
		camera.updateMatrixWorld();
		this.origin.setFromMatrixPosition(camera.matrixWorld);
		this.direction.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(this.origin).normalize();
		return this;
	}
	// Distance along the ray to a plane (null if it never gets there).
	intersectPlane(plane, out = new Vector3()) {
		const d = plane.normal.dot(this.direction);
		if (Math.abs(d) < 1e-9) return null;
		const t = -(this.origin.dot(plane.normal) + plane.constant) / d;
		return t < 0 ? null : this.at(t, out);
	}
	// Distance along the ray to a sphere's surface (null on a miss).
	intersectSphere(center, radius) {
		const oc = _v1.subVectors(this.origin, center);
		const b = oc.dot(this.direction);
		const c = oc.lengthSq() - radius * radius;
		const h = b * b - c;
		if (h < 0) return null;
		const t = -b - Math.sqrt(h);
		return t >= 0 ? t : (-b + Math.sqrt(h) >= 0 ? 0 : null);
	}
	distanceSqToPoint(p) {
		const t = Math.max(0, _v1.subVectors(p, this.origin).dot(this.direction));
		return this.at(t, _v2).distanceToSquared(p);
	}
}

export class Line3 {
	constructor(start = new Vector3(), end = new Vector3()) { this.start = start; this.end = end; }
	set(a, b) { this.start.copy(a); this.end.copy(b); return this; }
	closestPointToPointParameter(p, clampToLine = true) {
		const d = _v1.subVectors(this.end, this.start);
		const l2 = d.lengthSq();
		let t = l2 > 0 ? _v2.subVectors(p, this.start).dot(d) / l2 : 0;
		if (clampToLine) t = clamp(t, 0, 1);
		return t;
	}
	closestPointToPoint(p, clampToLine, out = new Vector3()) {
		const t = this.closestPointToPointParameter(p, clampToLine);
		return out.copy(this.start).lerp(this.end, t);
	}
}

// Ray casting against nodes: meshes are tested by their bounding spheres, then
// triangle by triangle. Results nearest first: { distance, point, object, face }.
export class Raycaster {
	constructor() { this.ray = new Ray(); this.near = 0; this.far = Infinity; }
	setFromCamera(ndc, camera) { this.ray.setFromCamera(ndc, camera); return this; }
	set(origin, direction) { this.ray.set(origin, direction); return this; }
	intersectObject(object, recursive = true, out = []) {
		const visit = (o) => {
			if (!o.visible) return;
			if (o.raycast) o.raycast(this, out);
			if (recursive) for (const c of o.children) visit(c);
		};
		visit(object);
		return out.sort((a, b) => a.distance - b.distance);
	}
	intersectObjects(list, recursive = true) {
		const out = [];
		for (const o of list) this.intersectObject(o, recursive, out);
		return out.sort((a, b) => a.distance - b.distance);
	}
}

const _q = new Quaternion();
const _m = new Matrix4();
const _v1 = new Vector3(), _v2 = new Vector3(), _v3 = new Vector3();
const _zero = new Vector3(0, 0, 0), _one = new Vector3(1, 1, 1);
