/*
 * Glint: materials.
 *
 *   StandardMaterial   physically based: colour, roughness, metalness, maps,
 *                      emissive, normal map, lit by lights and the environment.
 *   PhysicalMaterial   all that plus clearcoat (the glossy toy look), sheen
 *                      (velvet), iridescence (soap bubbles), transmission (glass).
 *   BasicMaterial      unlit: colour times map.
 *   SpriteMaterial     for Sprites.
 *   ShaderMaterial     your own GLSL (see the README for what's provided).
 *
 * Every material: side, transparent, opacity, depthWrite, depthTest,
 * blending, alphaTest, fog, toneMapped (false: shows its colour exactly as
 * given, bright enough to bloom), polygonOffset, vertexColors, flatShading.
 * The Mesh* names are aliases, so familiar code reads as it always has.
 */
import { Color, Vector2 } from './math.js';
import { EventDispatcher, FrontSide, NormalBlending } from './core.js';

let matId = 0;

export class Material extends EventDispatcher {
	constructor() {
		super();
		this.id = matId++;
		this.name = '';
		this.type = 'Material';
		this.side = FrontSide;
		this.transparent = false;
		this.opacity = 1;
		this.depthWrite = true;
		this.depthTest = true;
		this.colorWrite = true;
		this.blending = NormalBlending;
		this.alphaTest = 0;
		this.fog = true;
		this.toneMapped = true;
		this.polygonOffset = false;
		this.polygonOffsetFactor = 0;
		this.polygonOffsetUnits = 0;
		this.vertexColors = false;
		this.flatShading = false;
		this.visible = true;
		this.userData = {};
		this.version = 0;
	}
	get isMaterial() { return true; }
	set needsUpdate(v) { if (v) this.version++; }
	setValues(values) {
		if (!values) return this;
		for (const [k, v] of Object.entries(values)) {
			if (v === undefined) continue;
			const cur = this[k];
			if (cur && cur.isColor) cur.set(v);
			else if (cur && cur instanceof Vector2 && v instanceof Vector2) cur.copy(v);
			else this[k] = v;
		}
		return this;
	}
	clone() {
		const m = new this.constructor();
		for (const k of Object.keys(this)) {
			if (k === 'id' || k === '_listeners') continue;
			const v = this[k];
			if (v && (v.isColor || v instanceof Vector2)) m[k] = v.clone();
			else if (k === 'uniforms') m[k] = Object.fromEntries(Object.entries(v).map(([n, u]) => [n, { value: u.value && u.value.clone ? u.value.clone() : u.value }]));
			else m[k] = v;
		}
		return m;
	}
	dispose() { this.dispatchEvent({ type: 'dispose' }); }
}

export class StandardMaterial extends Material {
	constructor(values) {
		super();
		this.type = 'StandardMaterial';
		this.color = new Color(0xffffff);
		this.map = null;
		this.roughness = 1;
		this.metalness = 0;
		this.roughnessMap = null;       // green channel
		this.metalnessMap = null;       // blue channel
		this.emissive = new Color(0x000000);
		this.emissiveIntensity = 1;
		this.emissiveMap = null;
		this.normalMap = null;
		this.normalScale = new Vector2(1, 1);
		this.envMapIntensity = 1;
		this.setValues(values);
	}
	get isMeshStandardMaterial() { return true; }
}

export class PhysicalMaterial extends StandardMaterial {
	constructor(values) {
		super();
		this.type = 'PhysicalMaterial';
		this.clearcoat = 0;
		this.clearcoatRoughness = 0;
		this.sheen = 0;
		this.sheenColor = new Color(0xffffff);
		this.sheenRoughness = 0.5;
		this.iridescence = 0;
		this.iridescenceThickness = 1;  // shifts the bands of colour
		this.transmission = 0;          // glass: see-through, with reflections on top
		this.setValues(values);
	}
	get isMeshPhysicalMaterial() { return true; }
}

export class BasicMaterial extends Material {
	constructor(values) {
		super();
		this.type = 'BasicMaterial';
		this.color = new Color(0xffffff);
		this.map = null;
		this.setValues(values);
	}
	get isMeshBasicMaterial() { return true; }
}

export class SpriteMaterial extends Material {
	constructor(values) {
		super();
		this.type = 'SpriteMaterial';
		this.color = new Color(0xffffff);
		this.map = null;
		this.rotation = 0;
		this.sizeAttenuation = true;
		this.transparent = true;
		this.setValues(values);
	}
	get isSpriteMaterial() { return true; }
}

// Your own shaders. uniforms: { name: { value } } (numbers, Vector2/3,
// Color, Matrix4, Texture, or a cube environment's .radiance).
export class ShaderMaterial extends Material {
	constructor(values) {
		super();
		this.type = 'ShaderMaterial';
		this.uniforms = {};
		this.defines = {};
		this.vertexShader = '';
		this.fragmentShader = '';
		this.fog = false;
		this.setValues(values);
	}
	get isShaderMaterial() { return true; }
}

export const MeshStandardMaterial = StandardMaterial;
export const MeshPhysicalMaterial = PhysicalMaterial;
export const MeshBasicMaterial = BasicMaterial;
