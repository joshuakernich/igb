/*
 * Bloom and tone mapping across the gamebox's three walls, for three.js games.
 *
 * Every wall's camera draws into its own third of ONE multisampled HDR frame;
 * then three's UnrealBloomPass glows everything bright, and its OutputPass
 * tone maps (the renderer's toneMapping and toneMappingExposure) and writes
 * sRGB to the canvas. One bloom over the whole frame, so the glow carries
 * across the seams between walls just as the picture does.
 *
 *   import { createWallComposer } from '../../lib/three/walls.js';
 *   renderer.toneMapping = THREE.ACESFilmicToneMapping;
 *   const post = createWallComposer(renderer, scene, { strength: 0.6, radius: 0.5, threshold: 0.85 });
 *   post.setSize();                          // after every renderer.setSize
 *   post.render([{ camera, x, y, width, height }, ...]);   // drawing-buffer pixels, y from the bottom
 *   post.bloom.strength = 1;                 // tune live (also .radius, .threshold)
 *   (opts.bloomScale: the glow's resolution against the frame's; default 0.5)
 *
 * Anything brighter than the threshold blooms: emissive materials with
 * emissiveIntensity above 1, or MeshBasicMaterial colours pushed past white
 * (material.color.setRGB(3, 2, 0.5), or color.multiplyScalar(3)).
 * (toneMapped: false does nothing here: everything goes through the tone mapper.)
 *
 * The bloom's input is capped (opts.cap, default 2.5, also post.cap): the
 * sun's disc can be far brighter than white, and uncapped its glow would
 * swamp the walls whenever you head toward it.
 *
 * Shadows: by default the shadow map is drawn once a frame, before the first
 * wall, not once per wall (opts.shadowsOnce = false to leave it alone).
 */
import * as THREE from './three.module.min.js';
import { EffectComposer } from './addons/postprocessing/EffectComposer.js';
import { Pass } from './addons/postprocessing/Pass.js';
import { UnrealBloomPass } from './addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './addons/postprocessing/OutputPass.js';

// Draws each view's camera into its own part of the frame.
class WallsPass extends Pass {
	constructor(scene, shadowsOnce) {
		super();
		this.scene = scene;
		this.views = [];
		this.shadowsOnce = shadowsOnce;
		this.needsSwap = false;
	}
	render(renderer, writeBuffer, readBuffer) {
		const autoClear = renderer.autoClear;
		renderer.autoClear = false;
		const target = this.renderToScreen ? null : readBuffer;
		const w = target ? target.width : renderer.domElement.width;
		const h = target ? target.height : renderer.domElement.height;
		const set = (x, y, vw, vh, scissor) => {
			if (target) {
				target.viewport.set(x, y, vw, vh);
				target.scissor.set(x, y, vw, vh);
				target.scissorTest = scissor;
				renderer.setRenderTarget(target);
			} else {
				renderer.setRenderTarget(null);
				renderer.setViewport(x, y, vw, vh);
				renderer.setScissor(x, y, vw, vh);
				renderer.setScissorTest(scissor);
			}
		};
		set(0, 0, w, h, false);
		renderer.clear();
		if (this.shadowsOnce) {
			renderer.shadowMap.autoUpdate = false;
			renderer.shadowMap.needsUpdate = true;
		}
		for (const v of this.views) {
			set(v.x, v.y, v.width, v.height, true);
			renderer.render(this.scene, v.camera);
		}
		set(0, 0, w, h, false);
		renderer.autoClear = autoClear;
	}
}

export function createWallComposer(renderer, scene, opts = {}) {
	const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: opts.samples === undefined ? 4 : opts.samples });
	const composer = new EffectComposer(renderer, target);
	const walls = new WallsPass(scene, opts.shadowsOnce !== false);
	const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), opts.strength === undefined ? 0.6 : opts.strength, opts.radius === undefined ? 0.5 : opts.radius, opts.threshold === undefined ? 0.85 : opts.threshold);
	const output = new OutputPass();
	// Cap what feeds the bloom: the sun's disc and its glitter on the sea run
	// tens of times brighter than white and would wash a huge glow over the
	// action; capped, nothing glows harder than a neon edge. (The picture
	// itself is untouched.)
	const hp = bloom.materialHighPassFilter;
	hp.uniforms.maxBright = { value: opts.cap === undefined ? 2.5 : opts.cap };
	hp.fragmentShader = hp.fragmentShader
		.replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\n\t\tuniform float maxBright;')
		.replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv );\n\t\t\ttexel.rgb *= min( 1.0, maxBright / max( max( texel.r, max( texel.g, texel.b ) ), 1e-4 ) );');
	hp.needsUpdate = true;
	// The glow's blur worked at a fraction of the frame's size (opts.bloomScale,
	// default 0.5: half each way, a quarter of the pixels; it's soft anyway).
	// The picture itself stays at full size; only the glow laid over it is coarser.
	const bloomScale = opts.bloomScale === undefined ? 0.5 : opts.bloomScale;
	const bloomSetSize = bloom.setSize.bind(bloom);
	bloom.setSize = (width, height) => bloomSetSize(Math.max(1, Math.round(width * bloomScale)), Math.max(1, Math.round(height * bloomScale)));
	composer.addPass(walls);
	composer.addPass(bloom);
	composer.addPass(output);

	const size = new THREE.Vector2();
	const post = {
		composer, bloom, output,
		// How bright anything can be as it feeds the bloom (default 2.5).
		set cap(v) { hp.uniforms.maxBright.value = v; },
		get cap() { return hp.uniforms.maxBright.value; },
		// Match the renderer's size (call after renderer.setSize).
		setSize() {
			renderer.getSize(size);
			composer.setPixelRatio(renderer.getPixelRatio());
			composer.setSize(size.x, size.y);
		},
		// views: [{ camera, x, y, width, height }] in drawing-buffer pixels, y from the bottom.
		render(views, deltaTime) {
			walls.views = views;
			composer.render(deltaTime);
		},
		dispose() {
			bloom.dispose();
			output.dispose();
			composer.dispose();
		},
	};
	post.setSize();
	return post;
}

/* ---------- the wall rig ---------- */

// Three cameras on one rig, one per wall (left, front, right), sharing one
// orientation and one fixed field of view: 64° vertical on a 16:10 wall is
// 90° across, so the three are the sides of one box and the walls meet
// seamlessly. Tilt or move the rig, never one camera.
export function createWallRig({ fov = 64, aspect = 1.6, near = 0.1, far = 2000, yaws = [90, 0, -90] } = {}) {
	const rig = new THREE.Group();
	const cameras = yaws.map((yaw) => {
		const c = new THREE.PerspectiveCamera(fov, aspect, near, far);
		c.rotation.y = yaw * Math.PI / 180;
		rig.add(c);
		return c;
	});
	return {
		rig,
		cameras,
		// The views for post.render: wall i fills the i-th third of a frame
		// width x height drawing-buffer pixels (renderer.domElement.width/height).
		views(width, height) {
			const n = cameras.length;
			return cameras.map((camera, i) => {
				const x0 = Math.round(i * width / n), x1 = Math.round((i + 1) * width / n);
				return { camera, x: x0, y: 0, width: x1 - x0, height };
			});
		},
	};
}

// Where a world point lands in a view of size w x h whose top-left is at
// (x, y), in the same units (y down). null if it's behind the camera;
// .inside says whether it's within the view.
const _p = new THREE.Vector3();
export function toScreen(v, camera, x = 0, y = 0, w = 1, h = 1) {
	camera.updateWorldMatrix(true, false);
	_p.copy(v).project(camera);
	if (_p.z > 1 || _p.z < -1) return null;
	return {
		x: x + (_p.x + 1) / 2 * w,
		y: y + (1 - _p.y) / 2 * h,
		depth: _p.z,
		inside: Math.abs(_p.x) <= 1 && Math.abs(_p.y) <= 1,
		ndc: { x: _p.x, y: _p.y },
	};
}

// Paint a canvas and make it a texture: canvasTexture(w, h, (ctx, w, h) => {...}).
export function canvasTexture(w, h, paint, srgb = true) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	paint(c.getContext('2d'), w, h);
	const t = new THREE.CanvasTexture(c);
	if (srgb) t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

/* ---------- light from a sky ---------- */

const pmrems = new WeakMap();
function pmremFor(renderer) {
	let p = pmrems.get(renderer);
	if (!p) { p = new THREE.PMREMGenerator(renderer); pmrems.set(renderer, p); }
	return p;
}

// An environment (for scene.environment) from GLSL that defines
// vec3 envColor(vec3 dir), linear HDR, with its uniforms ({ name: { value } }).
// The texture's dispose() frees it all.
export function environmentFromShader(renderer, glsl, { uniforms = {} } = {}) {
	const material = new THREE.ShaderMaterial({
		uniforms,
		side: THREE.BackSide,
		depthWrite: false,
		vertexShader: `
			varying vec3 vDir;
			void main() {
				vec4 w = modelMatrix * vec4(position, 1.0);
				vDir = w.xyz - cameraPosition;
				gl_Position = projectionMatrix * viewMatrix * w;
			}
		`,
		fragmentShader: `
			varying vec3 vDir;
			${glsl}
			void main() { gl_FragColor = vec4(max(envColor(normalize(vDir)), 0.0), 1.0); }
		`,
	});
	const scene = new THREE.Scene();
	const ball = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), material);
	scene.add(ball);
	const target = pmremFor(renderer).fromScene(scene, 0, 0.1, 200);
	ball.geometry.dispose();
	material.dispose();
	const tex = target.texture;
	tex.dispose = () => target.dispose();
	return tex;
}

// A sky from GLSL: it declares any uniforms it needs and defines
// vec3 skyColor(vec3 dir) (linear HDR). Optionally #define SKY_EXTRA and
// vec3 skyExtra(vec3 dir) for things seen in the sky but not reflected (a
// sun's disc, stars). The uniforms are shared, so changing a value and
// calling environment() again relights the scene to match.
export class SkyDome extends THREE.Mesh {
	constructor(glsl, uniforms = {}, radius = 1000) {
		const material = new THREE.ShaderMaterial({
			uniforms,
			side: THREE.BackSide,
			depthWrite: false,
			vertexShader: `
				varying vec3 vDir;
				void main() {
					vec4 w = modelMatrix * vec4(position, 1.0);
					vDir = w.xyz - cameraPosition;
					gl_Position = projectionMatrix * viewMatrix * w;
					gl_Position.z = gl_Position.w * 0.99999;   // always the furthest thing
				}
			`,
			fragmentShader: `
				varying vec3 vDir;
				${glsl}
				void main() {
					vec3 d = normalize(vDir);
					vec3 col = skyColor(d);
					#ifdef SKY_EXTRA
					col += skyExtra(d);
					#endif
					gl_FragColor = vec4(col, 1.0);
				}
			`,
		});
		super(new THREE.SphereGeometry(radius, 48, 24), material);
		this.glsl = glsl;
		this.uniforms = uniforms;
		this.renderOrder = -1000;
		this.frustumCulled = false;
		this.env = null;
	}
	// Keep it round the eye.
	follow(eye) { this.position.copy(eye); }
	// (Re)make the environment that lights the scene from this sky (the old one is freed).
	environment(renderer) {
		if (this.env) this.env.dispose();
		this.env = environmentFromShader(renderer, this.glsl + '\nvec3 envColor(vec3 d) { return skyColor(d); }\n', { uniforms: this.uniforms });
		return this.env;
	}
}
