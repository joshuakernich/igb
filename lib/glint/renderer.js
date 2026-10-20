/*
 * Glint: the renderer. WebGL2, linear HDR all the way through:
 *
 *   shadow map (one directional light, soft PCF, texel-snapped so it
 *   doesn't shimmer as it follows the action)
 *   → every view (camera + viewport) into one multisampled HDR target
 *   → bloom (thresholded, a six-level down/up chain)
 *   → ACES filmic tone mapping, a colour grade, vignette, dithering → canvas.
 *
 * Image-based lighting: an environment is a prefiltered radiance cube (one
 * mip per roughness) and an irradiance cube, made from a GLSL function of
 * direction (cheap: remake it as a sky changes) or from a whole scene.
 *
 *   const renderer = new Renderer();
 *   renderer.setSize(w, h);
 *   scene.environment = renderer.environmentFromShader(`vec3 envColor(vec3 d) { ... }`);
 *   renderer.render(scene, camera);                                   // the whole canvas
 *   renderer.render(scene, [{ camera, x, y, width, height }, ...]);   // several views (pixels, y up)
 */
import { Vector3, Matrix4, Frustum, Sphere, Quaternion, Color } from './math.js';
import { Mesh, PerspectiveCamera, Scene, FrontSide, BackSide, DoubleSide, NormalBlending, AdditiveBlending, MultiplyBlending, NoBlending, RepeatWrapping, MirroredRepeatWrapping, NearestFilter, LinearFilter, SRGBColorSpace } from './core.js';
import { standardSource, spriteSource, depthSource, customSource, FULLSCREEN_VS, MAX_DIR, MAX_POINT } from './shaders.js';

const _m = new Matrix4(), _m2 = new Matrix4(), _v = new Vector3(), _v2 = new Vector3(), _frustum = new Frustum();
const _projView = new Matrix4();
const _modelView = new Matrix4();
const _nm = new Float32Array(9);
const _uvt = new Float32Array(9);
const IDENTITY3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
// (not .length: vectors have a length() method)
const isArr = (v) => Array.isArray(v) || ArrayBuffer.isView(v);

// feature bits for the mesh shader
const F = {
	UNLIT: 1, MAP: 2, NORMALMAP: 4, EMISSIVEMAP: 8, ROUGHMAP: 16, METALMAP: 32, VCOLOR: 64, INSTANCED: 128, ICOLOR: 256,
	FLAT: 512, DOUBLE: 1024, ALPHATEST: 2048, FOG: 4096, SHADOW: 8192, ENVMAP: 16384, CLEARCOAT: 32768, SHEEN: 65536,
	IRIDESCENCE: 131072, TRANSMISSION: 262144, LOGDEPTH: 524288, NOTONEMAP: 1048576,
};
const FNAMES = Object.keys(F);
const definesOf = (bits) => { const d = {}; for (const n of FNAMES) if (bits & F[n]) d[n] = true; return d; };

export class Renderer {
	constructor(opts = {}) {
		const canvas = opts.canvas || document.createElement('canvas');
		this.domElement = canvas;
		const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer, powerPreference: opts.powerPreference || 'high-performance' });
		if (!gl) throw new Error('Glint needs WebGL2');
		this.gl = gl;
		this.floatTargets = !!gl.getExtension('EXT_color_buffer_float');
		gl.getExtension('OES_texture_float_linear');
		this.anisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
		this.maxAniso = this.anisoExt ? gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
		this.capabilities = { getMaxAnisotropy: () => this.maxAniso, floatTargets: this.floatTargets };
		this.samples = opts.antialias === false ? 0 : Math.min(opts.samples || 4, gl.getParameter(gl.MAX_SAMPLES));
		this.logarithmicDepth = !!(opts.logarithmicDepthBuffer || opts.logarithmicDepth);

		this.pixelRatio = 1;
		this.width = canvas.width || 300;
		this.height = canvas.height || 150;
		this.toneMappingExposure = 1;
		this.bloom = { enabled: true, strength: 0.5, radius: 0.65, threshold: 1.0, knee: 0.6 };
		this.grade = { saturation: 1.05, contrast: 1.04, vignette: 0.18, lift: 0, tint: new Color(0xffffff) };
		this.shadowsEnabled = true;
		this.info = { calls: 0, triangles: 0, programs: 0 };

		this._programs = new Map();
		this._geo = new WeakMap();        // geometry → { buffers, index, vao, sig }
		this._inst = new WeakMap();       // instanced mesh → { vao, buf, cbuf, ... }
		this._tex = new WeakMap();        // texture → { tex, version }
		this._targets = null;
		this._shadow = null;
		this._frame = 0;
		this._state = {};

		// constants for attributes a geometry doesn't have
		gl.vertexAttrib4f(1, 0, 1, 0, 0);
		gl.vertexAttrib4f(2, 0, 0, 0, 0);
		gl.vertexAttrib4f(3, 1, 1, 1, 1);
		gl.vertexAttrib4f(8, 1, 1, 1, 1);

		// a white pixel for textures still loading
		this._white = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._white);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
		// a black cube, for an environment that hasn't arrived
		this._emptyVao = gl.createVertexArray();

		// the sprite's quad
		this._spriteGeo = (() => {
			const vao = gl.createVertexArray();
			gl.bindVertexArray(vao);
			const pb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, pb);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), gl.STATIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
			const ub = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, ub);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
			gl.enableVertexAttribArray(2);
			gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
			const ib = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
			gl.bindVertexArray(null);
			return vao;
		})();

		this._post = this._makePostPrograms();
	}

	/* ---------- size ---------- */

	setPixelRatio(r) { this.pixelRatio = r; this.setSize(this._cssW || this.width, this._cssH || this.height, false); }
	setSize(w, h, updateStyle = true) {
		this._cssW = w;
		this._cssH = h;
		this.width = Math.max(1, Math.floor(w * this.pixelRatio));
		this.height = Math.max(1, Math.floor(h * this.pixelRatio));
		this.domElement.width = this.width;
		this.domElement.height = this.height;
		if (updateStyle) { this.domElement.style.width = w + 'px'; this.domElement.style.height = h + 'px'; }
	}
	getSize() { return { width: this.width, height: this.height }; }

	/* ---------- GL state, cached ---------- */

	_set(key, value, apply) {
		if (this._state[key] === value) return;
		this._state[key] = value;
		apply(value);
	}
	_enable(cap, on) { const gl = this.gl; this._set('cap' + cap, on, (v) => (v ? gl.enable(cap) : gl.disable(cap))); }
	_materialState(m, forShadow = false) {
		const gl = this.gl;
		this._enable(gl.DEPTH_TEST, m.depthTest !== false);
		this._set('depthMask', forShadow ? true : m.depthWrite !== false, (v) => gl.depthMask(v));
		this._set('colorMask', forShadow ? false : m.colorWrite !== false, (v) => gl.colorMask(v, v, v, v));
		const side = m.side;
		if (side === DoubleSide) this._enable(gl.CULL_FACE, false);
		else {
			this._enable(gl.CULL_FACE, true);
			this._set('cull', side === BackSide ? gl.FRONT : gl.BACK, (v) => gl.cullFace(v));
		}
		this._enable(gl.POLYGON_OFFSET_FILL, !!m.polygonOffset);
		if (m.polygonOffset) this._set('poly', m.polygonOffsetFactor + ',' + m.polygonOffsetUnits, () => gl.polygonOffset(m.polygonOffsetFactor, m.polygonOffsetUnits));
		const blended = !forShadow && (m.transparent || m.blending === AdditiveBlending || m.blending === MultiplyBlending || m.transmission > 0);
		this._enable(gl.BLEND, blended && m.blending !== NoBlending);
		if (blended) {
			const mode = m.transmission > 0 ? 'premul' : m.blending === AdditiveBlending ? 'add' : m.blending === MultiplyBlending ? 'mul' : 'normal';
			this._set('blendFunc', mode, (v) => {
				if (v === 'add') gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
				else if (v === 'mul') gl.blendFuncSeparate(gl.DST_COLOR, gl.ZERO, gl.ZERO, gl.ONE);
				else if (v === 'premul') gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
				else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			});
		}
	}
	_resetState() { this._state = {}; }

	/* ---------- programs ---------- */

	_compile(vsSrc, fsSrc, label) {
		const gl = this.gl;
		const sh = (type, src) => {
			const s = gl.createShader(type);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				const log = gl.getShaderInfoLog(s);
				const lines = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
				console.error('Glint: ' + label + ' ' + (type === gl.VERTEX_SHADER ? 'vertex' : 'fragment') + ' shader failed\n' + log + '\n' + lines);
				throw new Error('Glint shader compile failed (' + label + '): ' + log);
			}
			return s;
		};
		const vs = sh(gl.VERTEX_SHADER, vsSrc), fs = sh(gl.FRAGMENT_SHADER, fsSrc);
		const p = gl.createProgram();
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Glint program link failed (' + label + '): ' + gl.getProgramInfoLog(p));
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		const uniforms = new Map();
		const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
		for (let i = 0; i < n; i++) {
			const info = gl.getActiveUniform(p, i);
			const name = info.name.replace(/\[0\]$/, '');
			uniforms.set(name, { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size });
		}
		this.info.programs++;
		return { program: p, uniforms, frame: -1, units: 0, label };
	}
	_program(key, make) {
		let p = this._programs.get(key);
		if (!p) { const { vs, fs } = make(); p = this._compile(vs, fs, key); this._programs.set(key, p); }
		return p;
	}
	_use(p) {
		if (this._current !== p) { this.gl.useProgram(p.program); this._current = p; this._currentMat = null; }
		p.units = p.baseUnits || 0;
	}
	// Set a uniform from a number, vector, colour, matrix, typed array or texture.
	_u(p, name, value) {
		const u = p.uniforms.get(name);
		if (!u || value === undefined || value === null) return;
		const gl = this.gl, loc = u.loc;
		switch (u.type) {
			case gl.FLOAT:
				if (u.size > 1 || isArr(value)) gl.uniform1fv(loc, value); else gl.uniform1f(loc, value);
				break;
			case gl.FLOAT_VEC2:
				if (isArr(value)) gl.uniform2fv(loc, value); else gl.uniform2f(loc, value.x, value.y);
				break;
			case gl.FLOAT_VEC3:
				if (isArr(value)) gl.uniform3fv(loc, value);
				else if (value.isColor) gl.uniform3f(loc, value.r, value.g, value.b);
				else gl.uniform3f(loc, value.x, value.y, value.z);
				break;
			case gl.FLOAT_VEC4:
				if (isArr(value)) gl.uniform4fv(loc, value);
				else if (value.isColor) gl.uniform4f(loc, value.r, value.g, value.b, 1);
				else gl.uniform4f(loc, value.x, value.y, value.z, value.w);
				break;
			case gl.INT: case gl.BOOL:
				if (isArr(value)) gl.uniform1iv(loc, value); else gl.uniform1i(loc, value === true ? 1 : value === false ? 0 : value);
				break;
			case gl.FLOAT_MAT3:
				gl.uniformMatrix3fv(loc, false, value.elements ? mat3From4(value.elements) : value);
				break;
			case gl.FLOAT_MAT4:
				gl.uniformMatrix4fv(loc, false, value.elements || value);
				break;
			case gl.SAMPLER_2D: case gl.SAMPLER_2D_SHADOW: case gl.SAMPLER_CUBE: {
				const unit = p.units++;
				gl.activeTexture(gl.TEXTURE0 + unit);
				if (u.type === gl.SAMPLER_CUBE) gl.bindTexture(gl.TEXTURE_CUBE_MAP, value.glTexture || value);
				else gl.bindTexture(gl.TEXTURE_2D, value.isTexture ? this._texture(value) : value.glTexture || value);
				gl.uniform1i(loc, unit);
				break;
			}
		}
	}

	/* ---------- textures ---------- */

	_texture(t) {
		const gl = this.gl;
		let rec = this._tex.get(t);
		if (!rec) {
			rec = { tex: gl.createTexture(), version: -1 };
			this._tex.set(t, rec);
			t.addEventListener('dispose', () => { gl.deleteTexture(rec.tex); this._tex.delete(t); });
		}
		if (rec.version !== t.version) {
			const img = t.image;
			const ready = img && (img.data || (img.complete === undefined ? true : img.complete && img.naturalWidth > 0)) && (img.readyState === undefined || img.readyState >= 2);
			if (!ready) return rec.version === -1 ? this._white : rec.tex;
			gl.bindTexture(gl.TEXTURE_2D, rec.tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !!t.flipY);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			const srgb = t.colorSpace === SRGBColorSpace;
			if (img.data) {
				const float = img.data instanceof Float32Array;
				gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
				gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, img.width, img.height, 0, gl.RGBA, float ? gl.FLOAT : gl.UNSIGNED_BYTE, img.data);
				gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
			} else gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
			const wrap = (w) => (w === RepeatWrapping ? gl.REPEAT : w === MirroredRepeatWrapping ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap(t.wrapS));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap(t.wrapT));
			const mips = t.generateMipmaps && t.minFilter !== LinearFilter && t.minFilter !== NearestFilter;
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, t.magFilter === NearestFilter ? gl.NEAREST : gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : t.minFilter === NearestFilter ? gl.NEAREST : gl.LINEAR);
			if (mips) gl.generateMipmap(gl.TEXTURE_2D);
			if (this.anisoExt && mips) gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, Math.max(1, Math.min(t.anisotropy || 1, this.maxAniso)));
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			rec.version = t.version;
		}
		return rec.tex;
	}

	/* ---------- geometry ---------- */

	_buffer(rec, name, attr, target) {
		const gl = this.gl;
		let b = rec.buffers[name];
		if (!b) { b = rec.buffers[name] = { buf: gl.createBuffer(), version: -1 }; }
		if (b.version !== attr.version) {
			gl.bindBuffer(target, b.buf);
			gl.bufferData(target, attr.array, attr.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
			b.version = attr.version;
		}
		return b.buf;
	}
	_geometry(g) {
		const gl = this.gl;
		gl.bindVertexArray(null);
		let rec = this._geo.get(g);
		if (!rec) {
			rec = { buffers: {}, vao: null, sig: '' };
			this._geo.set(g, rec);
			g.addEventListener('dispose', () => {
				for (const b of Object.values(rec.buffers)) gl.deleteBuffer(b.buf);
				if (rec.vao) gl.deleteVertexArray(rec.vao);
				this._geo.delete(g);
			});
		}
		const sig = Object.keys(g.attributes).join(',') + (g.index ? '|i' : '');
		// (bring buffers up to date; rebuild the VAO when the set of attributes changes)
		if (rec.sig !== sig || !rec.vao) {
			if (rec.vao) gl.deleteVertexArray(rec.vao);
			rec.vao = gl.createVertexArray();
			gl.bindVertexArray(rec.vao);
			this._bindAttributes(rec, g);
			gl.bindVertexArray(null);
			rec.sig = sig;
		} else {
			for (const [name, a] of Object.entries(g.attributes)) this._buffer(rec, name, a, gl.ARRAY_BUFFER);
			if (g.index) this._buffer(rec, '__index', g.index, gl.ELEMENT_ARRAY_BUFFER);
		}
		return rec;
	}
	_bindAttributes(rec, g) {
		const gl = this.gl;
		const locs = { position: 0, normal: 1, uv: 2, color: 3 };
		for (const [name, a] of Object.entries(g.attributes)) {
			const loc = locs[name];
			const buf = this._buffer(rec, name, a, gl.ARRAY_BUFFER);
			if (loc === undefined) continue;
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(loc);
			const type = a.array instanceof Float32Array ? gl.FLOAT : a.array instanceof Uint8Array ? gl.UNSIGNED_BYTE : a.array instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.FLOAT;
			gl.vertexAttribPointer(loc, a.itemSize, type, a.normalized || type !== gl.FLOAT, 0, 0);
		}
		if (g.index) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffer(rec, '__index', g.index, gl.ELEMENT_ARRAY_BUFFER));
	}
	// An instanced mesh's own VAO: the geometry's attributes plus its matrices (and colours).
	_instanced(mesh) {
		const gl = this.gl;
		const geoRec = this._geometry(mesh.geometry);
		let rec = this._inst.get(mesh);
		const sig = geoRec.sig + (mesh.instanceColor ? '|c' : '') + '|' + mesh.geometry.id;
		if (!rec || rec.sig !== sig) {
			if (rec) gl.deleteVertexArray(rec.vao);
			rec = rec || { buffers: {}, sig: '' };
			rec.vao = gl.createVertexArray();
			gl.bindVertexArray(rec.vao);
			this._bindAttributes(geoRec, mesh.geometry);
			const mb = this._buffer(rec, 'm', mesh.instanceMatrix, gl.ARRAY_BUFFER);
			gl.bindBuffer(gl.ARRAY_BUFFER, mb);
			for (let i = 0; i < 4; i++) {
				gl.enableVertexAttribArray(4 + i);
				gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, 64, i * 16);
				gl.vertexAttribDivisor(4 + i, 1);
			}
			if (mesh.instanceColor) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer(rec, 'c', mesh.instanceColor, gl.ARRAY_BUFFER));
				gl.enableVertexAttribArray(8);
				gl.vertexAttribPointer(8, 3, gl.FLOAT, false, 0, 0);
				gl.vertexAttribDivisor(8, 1);
			}
			gl.bindVertexArray(null);
			rec.sig = sig;
			this._inst.set(mesh, rec);
		} else {
			this._buffer(rec, 'm', mesh.instanceMatrix, gl.ARRAY_BUFFER);
			if (mesh.instanceColor) this._buffer(rec, 'c', mesh.instanceColor, gl.ARRAY_BUFFER);
		}
		return { vao: rec.vao, geo: geoRec };
	}

	/* ---------- render targets ---------- */

	_ensureTargets() {
		const gl = this.gl, w = this.width, h = this.height;
		const t = this._targets;
		if (t && t.w === w && t.h === h) return t;
		if (t) this._freeTargets(t);
		const fmt = this.floatTargets ? gl.RGBA16F : gl.RGBA8;
		const depthFmt = this.logarithmicDepth ? gl.DEPTH_COMPONENT32F : gl.DEPTH_COMPONENT24;
		const out = { w, h, fmt };
		out.hdr = makeTex(gl, w, h, fmt);
		out.resolve = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, out.resolve);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, out.hdr, 0);
		if (this.samples > 0) {
			out.ms = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, out.ms);
			out.msColor = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, out.msColor);
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, fmt, w, h);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, out.msColor);
			out.msDepth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, out.msDepth);
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, depthFmt, w, h);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, out.msDepth);
			out.draw = out.ms;
		} else {
			out.depth = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, out.depth);
			gl.renderbufferStorage(gl.RENDERBUFFER, depthFmt, w, h);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, out.depth);
			out.draw = out.resolve;
		}
		// the bloom chain: halving each level
		out.bloom = [];
		let bw = w, bh = h;
		for (let i = 0; i < 6; i++) {
			bw = Math.max(1, bw >> 1);
			bh = Math.max(1, bh >> 1);
			const tex = makeTex(gl, bw, bh, fmt);
			const fb = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
			out.bloom.push({ tex, fb, w: bw, h: bh });
			if (bw <= 4 || bh <= 4) break;
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this._targets = out;
		return out;
	}
	_freeTargets(t) {
		const gl = this.gl;
		gl.deleteTexture(t.hdr);
		gl.deleteFramebuffer(t.resolve);
		if (t.ms) { gl.deleteFramebuffer(t.ms); gl.deleteRenderbuffer(t.msColor); gl.deleteRenderbuffer(t.msDepth); }
		if (t.depth) gl.deleteRenderbuffer(t.depth);
		for (const b of t.bloom) { gl.deleteTexture(b.tex); gl.deleteFramebuffer(b.fb); }
	}

	/* ---------- the frame ---------- */

	// views: a camera (the whole canvas) or [{ camera, x, y, width, height }] in pixels, y from the bottom.
	render(scene, views) {
		const gl = this.gl;
		if (!Array.isArray(views)) views = [{ camera: views, x: 0, y: 0, width: this.width, height: this.height }];
		this._lastViews = views;
		this.info.calls = 0;
		this.info.triangles = 0;
		this._frame++;
		this._resetState();
		this._current = null;

		const frame = this._collect(scene);
		this._shadowPass(scene, frame);

		const t = this._ensureTargets();
		gl.bindFramebuffer(gl.FRAMEBUFFER, t.draw);
		gl.viewport(0, 0, t.w, t.h);
		gl.disable(gl.SCISSOR_TEST);
		const bg = scene.background && scene.background.isColor ? scene.background : null;
		gl.clearColor(bg ? bg.r : 0, bg ? bg.g : 0, bg ? bg.b : 0, 1);
		gl.depthMask(true);
		gl.colorMask(true, true, true, true);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this._resetState();
		gl.enable(gl.SCISSOR_TEST);
		for (const v of views) {
			gl.viewport(v.x, v.y, v.width, v.height);
			gl.scissor(v.x, v.y, v.width, v.height);
			this._renderView(scene, frame, v.camera);
		}
		gl.disable(gl.SCISSOR_TEST);
		gl.bindVertexArray(null);

		if (t.ms) {
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, t.ms);
			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, t.resolve);
			gl.blitFramebuffer(0, 0, t.w, t.h, 0, 0, t.w, t.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
		}
		this._postPass(t);
	}

	// Bring matrices up to date and gather what's visible, the lights, and each thing's bounds.
	_collect(scene) {
		const meshes = [], sprites = [], dirs = [], points = [];
		const ambient = [0, 0, 0], hemiSky = [0, 0, 0], hemiGround = [0, 0, 0];
		const visit = (o, parentWorld) => {
			if (o.matrixAutoUpdate) o.updateMatrix();
			if (parentWorld) o.matrixWorld.multiplyMatrices(parentWorld, o.matrix); else o.matrixWorld.copy(o.matrix);
			o._afterMatrixWorld();
			if (!o.visible) return;
			if (o.isMesh) { if (o.geometry && o.material) meshes.push(o); }
			else if (o.isSprite) { if (o.material) sprites.push(o); }
			else if (o.isLight) {
				const c = o.color, k = o.intensity;
				if (o.isAmbientLight) { ambient[0] += c.r * k; ambient[1] += c.g * k; ambient[2] += c.b * k; }
				else if (o.isHemisphereLight) {
					hemiSky[0] += c.r * k; hemiSky[1] += c.g * k; hemiSky[2] += c.b * k;
					hemiGround[0] += o.groundColor.r * k; hemiGround[1] += o.groundColor.g * k; hemiGround[2] += o.groundColor.b * k;
				} else if (o.isDirectionalLight) dirs.push(o);
				else if (o.isPointLight) points.push(o);
			}
			for (const c of o.children) visit(c, o.matrixWorld);
		};
		visit(scene, null);
		// the light that casts shadows goes first
		dirs.sort((a, b) => (b.castShadow ? 1 : 0) - (a.castShadow ? 1 : 0));
		for (const d of dirs) if (d.target.parent === null) d.target.updateMatrixWorld();
		const dirColor = new Float32Array(MAX_DIR * 3), dirDirection = new Float32Array(MAX_DIR * 3);
		const nDir = Math.min(MAX_DIR, dirs.length);
		for (let i = 0; i < nDir; i++) {
			const d = dirs[i];
			_v.setFromMatrixPosition(d.matrixWorld).sub(_v2.setFromMatrixPosition(d.target.matrixWorld)).normalize();
			dirDirection.set([_v.x, _v.y, _v.z], i * 3);
			dirColor.set([d.color.r * d.intensity, d.color.g * d.intensity, d.color.b * d.intensity], i * 3);
		}
		const pointColor = new Float32Array(MAX_POINT * 3), pointPosition = new Float32Array(MAX_POINT * 3), pointFalloff = new Float32Array(MAX_POINT * 2);
		const lit = points.filter((p) => p.intensity > 0);
		const nPoint = Math.min(MAX_POINT, lit.length);
		for (let i = 0; i < nPoint; i++) {
			const p = lit[i];
			_v.setFromMatrixPosition(p.matrixWorld);
			pointPosition.set([_v.x, _v.y, _v.z], i * 3);
			pointColor.set([p.color.r * p.intensity, p.color.g * p.intensity, p.color.b * p.intensity], i * 3);
			pointFalloff.set([p.distance, p.decay], i * 2);
		}
		// world bounds, once a frame
		for (const m of meshes) {
			const g = m.geometry;
			if (!g.boundingSphere) g.computeBoundingSphere();
			const s = m._bounds || (m._bounds = new Sphere());
			s.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
		}
		for (const s of sprites) {
			const b = s._bounds || (s._bounds = new Sphere());
			b.center.setFromMatrixPosition(s.matrixWorld);
			b.radius = s.matrixWorld.maxScale() * 0.75;
		}
		const shadowLight = dirs.find((d) => d.castShadow) || null;
		return {
			meshes, sprites, shadowLight,
			lights: {
				ambientColor: new Float32Array(ambient), hemiSky: new Float32Array(hemiSky), hemiGround: new Float32Array(hemiGround),
				numDir: nDir, dirColor, dirDirection, numPoint: nPoint, pointColor, pointPosition, pointFalloff,
			},
		};
	}

	_shadowPass(scene, frame) {
		const gl = this.gl;
		const light = frame.shadowLight;
		frame.shadowOn = false;
		if (!light || !this.shadowsEnabled) return;
		const sh = light.shadow;
		const size = Math.max(sh.mapSize.x, sh.mapSize.y);
		let s = this._shadow;
		if (!s || s.size !== size) {
			if (s) { gl.deleteTexture(s.tex); gl.deleteFramebuffer(s.fb); }
			s = this._shadow = { size, tex: gl.createTexture(), fb: gl.createFramebuffer(), matrix: new Matrix4() };
			gl.bindTexture(gl.TEXTURE_2D, s.tex);
			gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
			gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, s.tex, 0);
			gl.drawBuffers([gl.NONE]);
			gl.readBuffer(gl.NONE);
		}
		frame.shadowOn = true;
		frame.shadow = s;
		frame.shadowParams = sh;
		if (sh.autoUpdate === false && !sh.needsUpdate && s.done) return;
		sh.needsUpdate = false;
		s.done = true;

		// the light's camera: at the light, looking at its target, texel-snapped
		const cam = sh.camera;
		cam.updateProjectionMatrix();
		const lp = _v.setFromMatrixPosition(light.matrixWorld);
		const tp = _v2.setFromMatrixPosition(light.target.matrixWorld);
		_m.identity().lookAt(lp, tp, Math.abs(lp.x - tp.x) + Math.abs(lp.z - tp.z) < 1e-6 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0));
		_m.setPosition(lp);
		const view = _m2.copy(_m).invert();
		const texel = (cam.right - cam.left) / size, texelY = (cam.top - cam.bottom) / size;
		view.elements[12] = Math.round(view.elements[12] / texel) * texel;
		view.elements[13] = Math.round(view.elements[13] / texelY) * texelY;
		const projView = new Matrix4().multiplyMatrices(cam.projectionMatrix, view);
		// (to 0..1 texture space)
		const bias = new Matrix4();
		bias.elements.set([0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0.5, 0, 0.5, 0.5, 0.5, 1]);
		s.matrix.multiplyMatrices(bias, projView);
		_frustum.setFromMatrix(projView);

		gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb);
		gl.viewport(0, 0, size, size);
		gl.disable(gl.SCISSOR_TEST);
		gl.depthMask(true);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		this._resetState();
		for (const m of frame.meshes) {
			if (!m.castShadow) continue;
			if (m.frustumCulled && !_frustum.intersectsSphere(m._bounds)) continue;
			const mats = Array.isArray(m.material) ? m.material : [m.material];
			const mat = mats[0];
			if (!mat.visible || mat.isShaderMaterial) continue;
			let bits = 0;
			if (m.isInstancedMesh) bits |= F.INSTANCED;
			const alpha = mat.alphaTest > 0;
			if (alpha) bits |= F.ALPHATEST | (mat.map ? F.MAP : 0);
			const p = this._program('depth' + bits, () => depthSource(definesOf(bits)));
			this._use(p);
			this._u(p, 'viewMatrix', view);
			this._u(p, 'projectionMatrix', cam.projectionMatrix);
			this._u(p, 'modelMatrix', m.matrixWorld);
			if (alpha) {
				this._u(p, 'opacity', mat.opacity);
				this._u(p, 'alphaTest', mat.alphaTest);
				if (mat.map) { this._u(p, 'map', mat.map); this._u(p, 'uvTransform', uvTransform(mat.map)); }
			}
			this._materialState(mat, true);
			this._draw(m, null);
		}
		this._resetState();
	}

	_renderView(scene, frame, camera) {
		camera.updateWorldMatrix(true, false);
		_projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		_frustum.setFromMatrix(_projView);
		const camPos = new Vector3().setFromMatrixPosition(camera.matrixWorld);
		this._view = { camera, camPos, scene, frame, stamp: ++this._frame };
		const opaque = [], transparent = [];
		const viewZ = (o) => { const e = camera.matrixWorldInverse.elements, c = o._bounds.center; return e[2] * c.x + e[6] * c.y + e[10] * c.z + e[14]; };
		const push = (o, mat, group) => {
			if (!mat || !mat.visible) return;
			const item = { o, mat, group, z: viewZ(o), order: o.renderOrder || 0 };
			if (mat.transparent || mat.transmission > 0) transparent.push(item); else opaque.push(item);
		};
		for (const m of frame.meshes) {
			if (m.frustumCulled && !_frustum.intersectsSphere(m._bounds)) continue;
			if (Array.isArray(m.material)) {
				const groups = m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
				for (const g of groups) push(m, m.material[g.materialIndex], g);
			} else push(m, m.material, null);
		}
		for (const s of frame.sprites) {
			if (s.frustumCulled && !_frustum.intersectsSphere(s._bounds)) continue;
			push(s, s.material, null);
		}
		opaque.sort((a, b) => a.order - b.order || a.mat.id - b.mat.id || b.z - a.z);
		transparent.sort((a, b) => a.order - b.order || a.z - b.z);
		for (const it of opaque) this._drawItem(it);
		for (const it of transparent) this._drawItem(it);
	}

	// Choose (or build) the program for a thing and its material.
	_programFor(o, mat) {
		const view = this._view;
		const scene = view.scene;
		if (o.isSprite) {
			let bits = 0;
			if (mat.map) bits |= F.MAP;
			if (scene.fog && mat.fog) bits |= F.FOG;
			if (!mat.toneMapped) bits |= F.NOTONEMAP;
			if (mat.alphaTest > 0) bits |= F.ALPHATEST;
			if (this.logarithmicDepth) bits |= F.LOGDEPTH;
			return this._program('sprite' + bits, () => spriteSource(definesOf(bits)));
		}
		if (mat.isShaderMaterial) {
			let bits = 0;
			if (o.isInstancedMesh) bits |= F.INSTANCED;
			if (this.logarithmicDepth) bits |= F.LOGDEPTH;
			const key = 'custom' + mat.id + '.' + mat.version + '.' + bits;
			return this._program(key, () => customSource(mat, definesOf(bits)));
		}
		const g = o.geometry;
		let bits = 0;
		const unlit = !!mat.isMeshBasicMaterial;
		if (unlit) bits |= F.UNLIT;
		if (mat.map) bits |= F.MAP;
		if (mat.vertexColors && g.attributes.color) bits |= F.VCOLOR;
		if (o.isInstancedMesh) { bits |= F.INSTANCED; if (o.instanceColor) bits |= F.ICOLOR; }
		if (mat.alphaTest > 0) bits |= F.ALPHATEST;
		if (scene.fog && mat.fog) bits |= F.FOG;
		if (this.logarithmicDepth) bits |= F.LOGDEPTH;
		if (!mat.toneMapped) bits |= F.NOTONEMAP;
		if (!unlit) {
			if (mat.normalMap) bits |= F.NORMALMAP;
			if (mat.emissiveMap) bits |= F.EMISSIVEMAP;
			if (mat.roughnessMap) bits |= F.ROUGHMAP;
			if (mat.metalnessMap) bits |= F.METALMAP;
			if (mat.flatShading) bits |= F.FLAT;
			if (mat.side !== FrontSide) bits |= F.DOUBLE;
			if (o.receiveShadow && view.frame.shadowOn) bits |= F.SHADOW;
			if (scene.environment) bits |= F.ENVMAP;
			if (mat.clearcoat > 0) bits |= F.CLEARCOAT;
			if (mat.sheen > 0) bits |= F.SHEEN;
			if (mat.iridescence > 0) bits |= F.IRIDESCENCE;
			if (mat.transmission > 0) bits |= F.TRANSMISSION;
		}
		return this._program('std' + bits, () => standardSource(definesOf(bits)));
	}

	// Per-view uniforms: camera, lights, fog, environment, shadows.
	_viewUniforms(p) {
		const v = this._view, cam = v.camera, scene = v.scene, fr = v.frame;
		this._u(p, 'viewMatrix', cam.matrixWorldInverse);
		this._u(p, 'projectionMatrix', cam.projectionMatrix);
		this._u(p, 'cameraPosition', v.camPos);
		this._u(p, 'exposure', this.toneMappingExposure);
		if (this.logarithmicDepth) this._u(p, 'logDepthFC', 2 / Math.log2((cam.far || 1000) + 1));
		if (scene.fog) {
			this._u(p, 'fogColor', scene.fog.color);
			this._u(p, 'fogParams', scene.fog.isFogExp2 ? [0, 0, scene.fog.density] : [scene.fog.near, scene.fog.far, 0]);
		}
		const L = fr.lights;
		for (const k in L) this._u(p, k, L[k]);
		if (fr.shadowOn && p.uniforms.has('shadowMatrix')) {
			this._u(p, 'shadowMatrix', fr.shadow.matrix);
			this._u(p, 'shadowTexel', [1 / fr.shadow.size, 1 / fr.shadow.size]);
			this._u(p, 'shadowRadius', fr.shadowParams.radius === undefined ? 1.5 : fr.shadowParams.radius);
			this._u(p, 'shadowBias', fr.shadowParams.bias || 0);
			this._u(p, 'shadowNormalBias', fr.shadowParams.normalBias || 0);
		}
		const env = scene.environment;
		if (env && env.radiance && p.uniforms.has('envMaxLod')) {
			this._u(p, 'envMaxLod', env.maxLod);
			this._u(p, 'envIntensity', scene.environmentIntensity === undefined ? 1 : scene.environmentIntensity);
		}
		this._bindViewTextures(p);
		p.frame = v.stamp;
	}

	// Texture units are shared by every program, so the view's own textures
	// (environment, shadow map) are bound again whenever the program changes.
	_bindViewTextures(p) {
		const v = this._view, scene = v.scene, fr = v.frame;
		p.units = 0;
		const env = scene.environment;
		if (env && env.radiance && p.uniforms.has('envRadiance')) {
			this._u(p, 'envRadiance', env.radiance);
			this._u(p, 'envIrradiance', env.irradiance);
		}
		if (fr.shadowOn && p.uniforms.has('shadowMap')) this._u(p, 'shadowMap', fr.shadow.tex);
		p.baseUnits = p.units;
	}

	// Per-material uniforms.
	_materialUniforms(p, mat) {
		p.units = p.baseUnits || 0;
		if (mat.isShaderMaterial) {
			for (const [name, u] of Object.entries(mat.uniforms)) this._u(p, name, u.value);
			return;
		}
		this._u(p, 'diffuse', mat.color);
		this._u(p, 'opacity', mat.opacity);
		this._u(p, 'alphaTest', mat.alphaTest);
		const tmap = mat.map || mat.normalMap || mat.emissiveMap || mat.roughnessMap;
		this._u(p, 'uvTransform', tmap ? uvTransform(tmap) : IDENTITY3);
		if (mat.map) this._u(p, 'map', mat.map);
		if (mat.isSpriteMaterial) {
			this._u(p, 'rotation', mat.rotation);
			this._u(p, 'sizeAttenuation', mat.sizeAttenuation ? 1 : 0);
			return;
		}
		if (mat.isMeshBasicMaterial) return;
		this._u(p, 'roughness', mat.roughness);
		this._u(p, 'metalness', mat.metalness);
		const e = mat.emissive, k = mat.emissiveIntensity;
		this._u(p, 'emissive', [e.r * k, e.g * k, e.b * k]);
		this._u(p, 'envMapIntensity', mat.envMapIntensity);
		if (mat.normalMap) { this._u(p, 'normalMap', mat.normalMap); this._u(p, 'normalScale', mat.normalScale); }
		if (mat.emissiveMap) this._u(p, 'emissiveMap', mat.emissiveMap);
		if (mat.roughnessMap) this._u(p, 'roughnessMap', mat.roughnessMap);
		if (mat.metalnessMap) this._u(p, 'metalnessMap', mat.metalnessMap);
		if (mat.clearcoat > 0) { this._u(p, 'clearcoat', mat.clearcoat); this._u(p, 'clearcoatRoughness', mat.clearcoatRoughness); }
		if (mat.sheen > 0) { this._u(p, 'sheen', mat.sheen); this._u(p, 'sheenColor', mat.sheenColor); this._u(p, 'sheenRoughness', mat.sheenRoughness); }
		if (mat.iridescence > 0) { this._u(p, 'iridescence', mat.iridescence); this._u(p, 'iridescenceThickness', mat.iridescenceThickness); }
		if (mat.transmission > 0) this._u(p, 'transmission', mat.transmission);
	}

	_drawItem(it) {
		const { o, mat } = it;
		const p = this._programFor(o, mat);
		const switched = this._current !== p;
		this._use(p);
		if (p.frame !== this._view.stamp) this._viewUniforms(p);
		else if (switched) this._bindViewTextures(p);
		if (switched) this._currentMat = null;
		if (this._currentMat !== mat) { this._materialUniforms(p, mat); this._currentMat = mat; }
		this._u(p, 'modelMatrix', o.matrixWorld);
		if (o.isSprite) {
			this._u(p, 'center', o.center);
			this._materialState(mat);
			const gl = this.gl;
			gl.bindVertexArray(this._spriteGeo);
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
			this.info.calls++;
			return;
		}
		if (p.uniforms.has('normalMatrix')) this._u(p, 'normalMatrix', normalMatrixOf(o.matrixWorld));
		if (mat.isShaderMaterial && p.uniforms.has('modelViewMatrix')) this._u(p, 'modelViewMatrix', _modelView.multiplyMatrices(this._view.camera.matrixWorldInverse, o.matrixWorld));
		this._materialState(mat);
		this._draw(o, it.group);
	}

	_draw(o, group) {
		const gl = this.gl;
		const g = o.geometry;
		let vao, rec;
		if (o.isInstancedMesh) { const r = this._instanced(o); vao = r.vao; rec = r.geo; }
		else { rec = this._geometry(g); vao = rec.vao; }
		gl.bindVertexArray(vao);
		const total = g.index ? g.index.count : g.attributes.position.count;
		let start = Math.max(0, g.drawRange.start), count = Math.min(total - start, g.drawRange.count);
		if (group) {
			const s = Math.max(start, group.start);
			const e = Math.min(start + count, group.start + group.count);
			start = s;
			count = e - s;
		}
		if (count <= 0) return;
		const inst = o.isInstancedMesh ? o.count : 0;
		if (o.isInstancedMesh && inst <= 0) return;
		if (g.index) {
			const type = g.index.array instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			const size = type === gl.UNSIGNED_INT ? 4 : 2;
			if (inst) gl.drawElementsInstanced(gl.TRIANGLES, count, type, start * size, inst);
			else gl.drawElements(gl.TRIANGLES, count, type, start * size);
		} else if (inst) gl.drawArraysInstanced(gl.TRIANGLES, start, count, inst);
		else gl.drawArrays(gl.TRIANGLES, start, count);
		this.info.calls++;
		this.info.triangles += (count / 3) * (inst || 1);
	}

	/* ---------- post: bloom, tone mapping, grade ---------- */

	_makePostPrograms() {
		const head = '#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 fragColor;\nuniform sampler2D src;\nuniform vec2 texel;\n';
		// 13 taps (Jimenez), with a soft threshold on the first pass
		const down = this._compile(FULLSCREEN_VS, head + `
uniform float threshold;
uniform float knee;
uniform int first;
vec3 tap(vec2 o) { return texture(src, vUv + o * texel).rgb; }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// (on the first pass each group is weighted down by its brightness, so one
// blazing pixel can't throw a flickering blob of bloom: a Karis average)
float wsum;
vec3 kar(vec3 a, vec3 b, vec3 c, vec3 d, float weight) {
	vec3 s = (a + b + c + d) * 0.25;
	float w = weight * (first == 1 ? 1.0 / (1.0 + luma(s)) : 1.0);
	wsum += w;
	return s * w;
}
void main() {
	vec3 a = tap(vec2(-2.0, 2.0)), b = tap(vec2(0.0, 2.0)), c = tap(vec2(2.0, 2.0));
	vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0, 0.0)), f = tap(vec2(2.0, 0.0));
	vec3 g = tap(vec2(-2.0, -2.0)), h = tap(vec2(0.0, -2.0)), i = tap(vec2(2.0, -2.0));
	vec3 j = tap(vec2(-1.0, 1.0)), k = tap(vec2(1.0, 1.0)), l = tap(vec2(-1.0, -1.0)), m = tap(vec2(1.0, -1.0));
	wsum = 0.0;
	vec3 col = kar(j, k, l, m, 0.5) + kar(a, b, d, e, 0.125) + kar(b, c, e, f, 0.125) + kar(d, e, g, h, 0.125) + kar(e, f, h, i, 0.125);
	col /= max(wsum, 1e-4);
	if (first == 1) {
		float br = max(col.r, max(col.g, col.b));
		float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee);
		soft = soft * soft / (4.0 * knee + 1e-4);
		col *= max(soft, br - threshold) / max(br, 1e-4);
		col = min(col, vec3(64.0));
	}
	fragColor = vec4(col, 1.0);
}
`, 'bloom-down');
		// a 3x3 tent, added onto the level above
		const up = this._compile(FULLSCREEN_VS, head + `
uniform float radius;
void main() {
	vec2 r = texel * radius;
	vec3 c = texture(src, vUv).rgb * 4.0;
	c += (texture(src, vUv + vec2(-r.x, 0.0)).rgb + texture(src, vUv + vec2(r.x, 0.0)).rgb + texture(src, vUv + vec2(0.0, -r.y)).rgb + texture(src, vUv + vec2(0.0, r.y)).rgb) * 2.0;
	c += texture(src, vUv - r).rgb + texture(src, vUv + r).rgb + texture(src, vUv + vec2(-r.x, r.y)).rgb + texture(src, vUv + vec2(r.x, -r.y)).rgb;
	fragColor = vec4(c / 16.0, 1.0);
}
`, 'bloom-up');
		const comp = this._compile(FULLSCREEN_VS, head + `
uniform sampler2D bloomTex;
uniform float bloomStrength;
uniform float exposure;
uniform float saturation;
uniform float contrast;
uniform float vignette;
uniform float lift;
uniform vec3 tint;
uniform vec2 size;
uniform vec4 views[8];
uniform int numViews;
vec3 RRTAndODTFit(vec3 v) {
	vec3 a = v * (v + 0.0245786) - 0.000090537;
	vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
	return a / b;
}
vec3 aces(vec3 c) {
	const mat3 ACES_IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
	const mat3 ACES_OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
	c *= exposure / 0.6;
	c = ACES_OUT * RRTAndODTFit(ACES_IN * c);
	return clamp(c, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
	vec3 hdr = texture(src, vUv).rgb + texture(bloomTex, vUv).rgb * bloomStrength;
	vec3 c = aces(hdr * tint);
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	c = mix(vec3(l), c, saturation);
	c = clamp((c - 0.5) * contrast + 0.5 + lift, 0.0, 1.0);
	// the vignette, round each view on its own
	vec2 px = vUv * size;
	vec4 r = vec4(0.0, 0.0, size);
	for (int i = 0; i < 8; i++) {
		if (i >= numViews) break;
		vec4 vw = views[i];
		if (px.x >= vw.x && px.x < vw.x + vw.z && px.y >= vw.y && px.y < vw.y + vw.w) { r = vw; break; }
	}
	vec2 q = (px - r.xy) / r.zw - 0.5;
	c *= 1.0 - vignette * smoothstep(0.3, 0.85, length(q * vec2(1.0, 0.9)));
	c = toSRGB(c);
	// a whisper of noise so smooth gradients don't band
	float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
	c += (n - 0.5) / 255.0;
	fragColor = vec4(c, 1.0);
}
`, 'composite');
		return { down, up, comp };
	}

	_fullscreen() {
		const gl = this.gl;
		gl.bindVertexArray(this._emptyVao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	_postPass(t) {
		const gl = this.gl, P = this._post;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.BLEND);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.depthMask(false);
		gl.colorMask(true, true, true, true);
		const B = this.bloom;
		const useBloom = B.enabled && B.strength > 0 && t.bloom.length > 0;
		if (useBloom) {
			// down
			let src = t.hdr, sw = t.w, sh = t.h;
			t.bloom.forEach((lvl, i) => {
				gl.bindFramebuffer(gl.FRAMEBUFFER, lvl.fb);
				gl.viewport(0, 0, lvl.w, lvl.h);
				this._use(P.down);
				this._u(P.down, 'src', src);
				this._u(P.down, 'texel', [1 / sw, 1 / sh]);
				this._u(P.down, 'first', i === 0 ? 1 : 0);
				this._u(P.down, 'threshold', B.threshold);
				this._u(P.down, 'knee', Math.max(1e-3, B.knee * B.threshold));
				this._fullscreen();
				src = lvl.tex; sw = lvl.w; sh = lvl.h;
			});
			// up, adding each level onto the one above
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE);
			for (let i = t.bloom.length - 1; i > 0; i--) {
				const from = t.bloom[i], to = t.bloom[i - 1];
				gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb);
				gl.viewport(0, 0, to.w, to.h);
				this._use(P.up);
				this._u(P.up, 'src', from.tex);
				this._u(P.up, 'texel', [1 / from.w, 1 / from.h]);
				this._u(P.up, 'radius', 0.5 + B.radius * 1.5);
				this._fullscreen();
			}
			gl.disable(gl.BLEND);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.width, this.height);
		this._use(P.comp);
		this._u(P.comp, 'src', t.hdr);
		this._u(P.comp, 'bloomTex', useBloom ? t.bloom[0].tex : this._white);
		this._u(P.comp, 'bloomStrength', useBloom ? B.strength / t.bloom.length * 2 : 0);
		this._u(P.comp, 'exposure', this.toneMappingExposure);
		const G = this.grade;
		this._u(P.comp, 'saturation', G.saturation);
		this._u(P.comp, 'contrast', G.contrast);
		this._u(P.comp, 'vignette', G.vignette);
		this._u(P.comp, 'lift', G.lift || 0);
		this._u(P.comp, 'tint', G.tint || [1, 1, 1]);
		this._u(P.comp, 'size', [this.width, this.height]);
		const vr = new Float32Array(32);
		const vs = this._lastViews || [];
		vs.slice(0, 8).forEach((v, i) => vr.set([v.x, v.y, v.width, v.height], i * 4));
		this._u(P.comp, 'views', vr);
		this._u(P.comp, 'numViews', Math.min(8, vs.length));
		this._fullscreen();
		gl.bindVertexArray(null);
		this._resetState();
		this._current = null;
	}

	/* ---------- environments (image-based lighting) ---------- */

	// From GLSL: source must define `vec3 envColor(vec3 dir)` returning linear
	// HDR radiance. uniforms are passed to it. Pass an existing environment as
	// `into` to refill it (cheap enough to do as a sky changes).
	environmentFromShader(source, { size = 128, uniforms = {}, into = null } = {}) {
		const env = into || this._makeEnvironment(size);
		const key = 'envsrc:' + source;
		const p = this._program(key, () => ({
			vs: FULLSCREEN_VS,
			fs: '#version 300 es\nprecision highp float;\nin vec2 vUv;\nout vec4 fragColor;\nuniform int face;\n' + source + `
vec3 faceDir(int f, vec2 uv) {
	vec2 s = uv * 2.0 - 1.0;
	if (f == 0) return vec3(1.0, -s.y, -s.x);
	if (f == 1) return vec3(-1.0, -s.y, s.x);
	if (f == 2) return vec3(s.x, 1.0, s.y);
	if (f == 3) return vec3(s.x, -1.0, -s.y);
	if (f == 4) return vec3(s.x, -s.y, 1.0);
	return vec3(-s.x, -s.y, -1.0);
}
void main() { fragColor = vec4(max(envColor(normalize(faceDir(face, vUv))), 0.0), 1.0); }
`,
		}));
		const gl = this.gl;
		this._use(p);
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.viewport(0, 0, env.size, env.size);
		gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
		gl.colorMask(true, true, true, true);
		for (let f = 0; f < 6; f++) {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, env.source, 0);
			p.units = 0;
			for (const [n, u] of Object.entries(uniforms)) this._u(p, n, u && u.value !== undefined ? u.value : u);
			this._u(p, 'face', f);
			this._fullscreen();
		}
		gl.deleteFramebuffer(fb);
		this._prefilter(env);
		return env;
	}

	// From a whole scene, seen from `position` (an environment lit by the scene's own lights and emissives).
	environmentFromScene(scene, { size = 128, position = new Vector3(), near = 0.1, far = 1000, into = null } = {}) {
		const env = into || this._makeEnvironment(size);
		const gl = this.gl;
		const fb = gl.createFramebuffer();
		const depth = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, env.size, env.size);
		const cam = new PerspectiveCamera(90, 1, near, far);
		// each face: forward, right, up (so the picture lands the way cube maps read it)
		const faces = [[1, 0, 0, 0, 0, -1, 0, -1, 0], [-1, 0, 0, 0, 0, 1, 0, -1, 0], [0, 1, 0, 1, 0, 0, 0, 0, 1], [0, -1, 0, 1, 0, 0, 0, 0, -1], [0, 0, 1, 1, 0, 0, 0, -1, 0], [0, 0, -1, -1, 0, 0, 0, -1, 0]];
		const saveLog = this.logarithmicDepth;
		this.logarithmicDepth = false;
		const frame = this._collect(scene);
		this._shadowPass(scene, frame);
		for (let f = 0; f < 6; f++) {
			const [fx, fy, fz, rx, ry, rz, ux, uy, uz] = faces[f];
			const m = new Matrix4();
			m.elements.set([rx, ry, rz, 0, ux, uy, uz, 0, -fx, -fy, -fz, 0, position.x, position.y, position.z, 1]);
			cam.quaternion.setFromRotationMatrix(m);
			cam.position.copy(position);
			cam.updateMatrixWorld();
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, env.source, 0);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
			gl.viewport(0, 0, env.size, env.size);
			gl.disable(gl.SCISSOR_TEST);
			const bg = scene.background && scene.background.isColor ? scene.background : null;
			gl.clearColor(bg ? bg.r : 0, bg ? bg.g : 0, bg ? bg.b : 0, 1);
			gl.depthMask(true);
			gl.colorMask(true, true, true, true);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			this._resetState();
			this._current = null;
			this._renderView(scene, frame, cam);
		}
		this.logarithmicDepth = saveLog;
		gl.bindVertexArray(null);
		gl.deleteFramebuffer(fb);
		gl.deleteRenderbuffer(depth);
		this._resetState();
		this._current = null;
		this._prefilter(env);
		return env;
	}

	_makeEnvironment(size) {
		const gl = this.gl;
		const fmt = this.floatTargets ? gl.RGBA16F : gl.RGBA8;
		const levels = Math.max(1, Math.floor(Math.log2(size)) + 1);
		const cube = (s, mips) => {
			const t = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
			gl.texStorage2D(gl.TEXTURE_CUBE_MAP, mips, fmt, s, s);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, mips > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_CUBE_MAP, w, gl.CLAMP_TO_EDGE);
			return t;
		};
		// radiance: one mip per roughness step, down to 8 pixels a side
		const radLevels = Math.max(1, Math.floor(Math.log2(size)) - 2);
		const env = {
			isEnvironment: true,
			size,
			source: cube(size, levels),
			sourceLevels: levels,
			radiance: { glTexture: cube(size, radLevels) },
			irradiance: { glTexture: cube(32, 1) },
			maxLod: radLevels - 1,
			radLevels,
		};
		env.dispose = () => {
			gl.deleteTexture(env.source);
			gl.deleteTexture(env.radiance.glTexture);
			gl.deleteTexture(env.irradiance.glTexture);
		};
		return env;
	}

	// GGX-filtered radiance per roughness, and cosine-weighted irradiance.
	_prefilter(env) {
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, env.source);
		gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		const common = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform samplerCube src;
uniform int face;
uniform float roughness;
uniform float srcSize;
uniform float srcLevels;
#define PI 3.141592653589793
vec3 faceDir(int f, vec2 uv) {
	vec2 s = uv * 2.0 - 1.0;
	if (f == 0) return vec3(1.0, -s.y, -s.x);
	if (f == 1) return vec3(-1.0, -s.y, s.x);
	if (f == 2) return vec3(s.x, 1.0, s.y);
	if (f == 3) return vec3(s.x, -1.0, -s.y);
	if (f == 4) return vec3(s.x, -s.y, 1.0);
	return vec3(-s.x, -s.y, -1.0);
}
vec2 hammersley(uint i, uint n) {
	uint b = i;
	b = (b << 16u) | (b >> 16u);
	b = ((b & 0x55555555u) << 1u) | ((b & 0xAAAAAAAAu) >> 1u);
	b = ((b & 0x33333333u) << 2u) | ((b & 0xCCCCCCCCu) >> 2u);
	b = ((b & 0x0F0F0F0Fu) << 4u) | ((b & 0xF0F0F0F0u) >> 4u);
	b = ((b & 0x00FF00FFu) << 8u) | ((b & 0xFF00FF00u) >> 8u);
	return vec2(float(i) / float(n), float(b) * 2.3283064365386963e-10);
}
mat3 basis(vec3 N) {
	vec3 up = abs(N.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
	vec3 T = normalize(cross(up, N));
	return mat3(T, cross(N, T), N);
}
`;
		const radiance = this._program('env-radiance', () => ({ vs: FULLSCREEN_VS, fs: common + `
void main() {
	vec3 N = normalize(faceDir(face, vUv));
	if (roughness < 0.001) { fragColor = vec4(textureLod(src, N, 0.0).rgb, 1.0); return; }
	mat3 B = basis(N);
	float a = roughness * roughness;
	vec3 sum = vec3(0.0);
	float w = 0.0;
	const uint COUNT = 96u;
	float texelSA = 4.0 * PI / (6.0 * srcSize * srcSize);
	for (uint i = 0u; i < COUNT; i++) {
		vec2 xi = hammersley(i, COUNT);
		float phi = 2.0 * PI * xi.x;
		float cosT = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
		float sinT = sqrt(1.0 - cosT * cosT);
		vec3 H = B * vec3(sinT * cos(phi), sinT * sin(phi), cosT);
		vec3 L = 2.0 * dot(N, H) * H - N;
		float NoL = dot(N, L);
		if (NoL > 0.0) {
			// pick a blurrier source mip for samples that stand for more of the sphere
			float NoH = cosT;
			float d = NoH * NoH * (a * a - 1.0) + 1.0;
			float D = a * a / (PI * d * d);
			float pdf = D / 4.0 + 1e-4;
			float sampleSA = 1.0 / (float(COUNT) * pdf);
			float lod = clamp(0.5 * log2(sampleSA / texelSA) + 1.0, 0.0, srcLevels - 1.0);
			sum += textureLod(src, L, lod).rgb * NoL;
			w += NoL;
		}
	}
	fragColor = vec4(sum / max(w, 1e-4), 1.0);
}
` }));
		const irradiance = this._program('env-irradiance', () => ({ vs: FULLSCREEN_VS, fs: common + `
void main() {
	vec3 N = normalize(faceDir(face, vUv));
	mat3 B = basis(N);
	vec3 sum = vec3(0.0);
	const uint COUNT = 128u;
	float lod = max(srcLevels - 4.0, 0.0);
	for (uint i = 0u; i < COUNT; i++) {
		vec2 xi = hammersley(i, COUNT);
		float phi = 2.0 * PI * xi.x;
		float cosT = sqrt(1.0 - xi.y);
		float sinT = sqrt(xi.y);
		sum += textureLod(src, B * vec3(sinT * cos(phi), sinT * sin(phi), cosT), lod).rgb;
	}
	fragColor = vec4(sum / float(COUNT), 1.0);
}
` }));
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
		gl.colorMask(true, true, true, true);
		this._current = null;
		this._use(radiance);
		for (let lvl = 0; lvl < env.radLevels; lvl++) {
			const s = Math.max(1, env.size >> lvl);
			gl.viewport(0, 0, s, s);
			for (let f = 0; f < 6; f++) {
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, env.radiance.glTexture, lvl);
				radiance.units = 0;
				this._u(radiance, 'src', { glTexture: env.source });
				this._u(radiance, 'face', f);
				this._u(radiance, 'roughness', env.radLevels > 1 ? lvl / (env.radLevels - 1) : 0);
				this._u(radiance, 'srcSize', env.size);
				this._u(radiance, 'srcLevels', env.sourceLevels);
				this._fullscreen();
			}
		}
		this._use(irradiance);
		gl.viewport(0, 0, 32, 32);
		for (let f = 0; f < 6; f++) {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, env.irradiance.glTexture, 0);
			irradiance.units = 0;
			this._u(irradiance, 'src', { glTexture: env.source });
			this._u(irradiance, 'face', f);
			this._u(irradiance, 'srcLevels', env.sourceLevels);
			this._fullscreen();
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fb);
		gl.bindVertexArray(null);
		this._current = null;
		this._resetState();
	}

	/* ---------- the end ---------- */

	// Compile the programs a scene will need now, so nothing hitches later.
	compile(scene, camera) {
		const frame = this._collect(scene);
		this._view = { camera, camPos: new Vector3(), scene, frame, stamp: -1 };
		frame.shadowOn = !!frame.shadowLight && this.shadowsEnabled;
		for (const m of frame.meshes) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) if (mat) this._programFor(m, mat);
		for (const s of frame.sprites) this._programFor(s, s.material);
	}

	dispose() {
		const gl = this.gl;
		for (const p of this._programs.values()) gl.deleteProgram(p.program);
		this._programs.clear();
		if (this._targets) this._freeTargets(this._targets);
		this._targets = null;
		if (this._shadow) { gl.deleteTexture(this._shadow.tex); gl.deleteFramebuffer(this._shadow.fb); this._shadow = null; }
	}
	forceContextLoss() {
		const ext = this.gl.getExtension('WEBGL_lose_context');
		if (ext) ext.loseContext();
	}
}

/* ---------- helpers ---------- */

function makeTex(gl, w, h, fmt) {
	const t = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, t);
	gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return t;
}

// The normal matrix: the inverse transpose of a world matrix's 3x3.
function normalMatrixOf(m) {
	const e = m.elements;
	const a = e[0], b = e[1], c = e[2], d = e[4], f = e[5], g = e[6], h = e[8], i = e[9], j = e[10];
	const A = f * j - g * i, B = -(d * j - g * h), C = d * i - f * h;
	let det = a * A + b * B + c * C;
	det = det === 0 ? 0 : 1 / det;
	// inverse, transposed (column-major)
	_nm[0] = A * det; _nm[1] = B * det; _nm[2] = C * det;
	_nm[3] = -(b * j - c * i) * det; _nm[4] = (a * j - c * h) * det; _nm[5] = -(a * i - b * h) * det;
	_nm[6] = (b * g - c * f) * det; _nm[7] = -(a * g - c * d) * det; _nm[8] = (a * f - b * d) * det;
	return _nm;
}

function mat3From4(e) {
	const out = new Float32Array(9);
	out[0] = e[0]; out[1] = e[1]; out[2] = e[2];
	out[3] = e[4]; out[4] = e[5]; out[5] = e[6];
	out[6] = e[8]; out[7] = e[9]; out[8] = e[10];
	return out;
}

function uvTransform(t) {
	_uvt[0] = t.repeat.x; _uvt[1] = 0; _uvt[2] = 0;
	_uvt[3] = 0; _uvt[4] = t.repeat.y; _uvt[5] = 0;
	_uvt[6] = t.offset.x; _uvt[7] = t.offset.y; _uvt[8] = 1;
	return _uvt;
}
