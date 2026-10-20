# Glint

Immersive Gamebox's own 3D engine: plain WebGL2, no dependencies. It renders physically based materials in linear HDR, then applies bloom, ACES filmic tone mapping and a colour grade. It is built for the gamebox's three walls. The Sonic-family games (Loop Island, Iron Stride, Twin Tail Tower, Quill Relay) use it instead of three.js.

```js
import * as G from '../../lib/glint/glint.js';
```

The API deliberately uses the shapes most 3D code already knows: `Vector3`, `Quaternion`, `Euler`, `Matrix4`, `Color`, nodes with `position`, `rotation`, `quaternion` and `scale`, `Mesh(geometry, material)` and so on. Porting from three.js is therefore mostly renaming `THREE.` to `G.`. The differences are listed in [Porting from three.js](#porting-from-threejs).

## What it draws

- **Lit materials**
  - GGX specular with Smith visibility, Schlick Fresnel and Lambert diffuse.
  - Multiple-scattering energy compensation, so rough metals don't go dark.
  - Geometric specular anti-aliasing, so small shiny things don't sparkle.
- **Image-based lighting**
  - A radiance cube prefiltered by GGX importance sampling (one mip per roughness), plus an irradiance cube.
  - Made from a GLSL function of direction (a sky) or from a whole scene.
- **PhysicalMaterial extras**
  - `clearcoat` (a second specular lobe: the glossy toy look);
  - `sheen` (velvet and fabric);
  - `iridescence` (soap bubbles);
  - `transmission` (glass: reflections over a see-through body).
- **Shadows**
  - One directional light, with soft PCF: 16 Poisson taps, rotated per pixel.
  - Texel-snapped, so the shadow box can follow the action without shimmering.
  - It fades out at the box's edges.
- **Lights**
  - Ambient, hemisphere, up to 2 directional and up to 8 point lights. Intensities follow the physically based convention three.js uses, so the same numbers look the same.
- **Post-processing**
  - A multisampled HDR target (4×).
  - Bloom: a soft threshold, a 6-level 13-tap down / tent-up chain, and a Karis average so single pixels can't flicker.
  - ACES filmic tone mapping, then saturation, contrast and lift.
  - A vignette applied to each view on its own.
  - Dithering, so sky gradients never band.
- **Unlit materials with `toneMapped: false`** show their colour exactly as given, and bloom: glows, lamps, neon edges.
- **Also supported:** fog (linear or exponential squared), sprites, instancing, canvas textures, normal, roughness, metalness and emissive maps, vertex colours, flat shading, and logarithmic depth for huge views.

## The renderer

```js
const renderer = new G.Renderer({ logarithmicDepthBuffer: true });   // also: antialias (default true), samples (4)
renderer.setPixelRatio(1);
renderer.setSize(width, height, false);     // canvas pixels; false = leave the CSS size alone
stage.$bg.append(renderer.domElement);

renderer.toneMappingExposure = 1.05;
Object.assign(renderer.bloom, { strength: 0.5, radius: 0.65, threshold: 1.0, knee: 0.6, enabled: true });
Object.assign(renderer.grade, { saturation: 1.05, contrast: 1.04, vignette: 0.18, lift: 0 });
renderer.grade.tint = new G.Color(0xffffff);   // white balance
renderer.shadowsEnabled = true;

renderer.render(scene, camera);                                  // the whole canvas
renderer.render(scene, [{ camera, x, y, width, height }, ...]);  // several views; pixels, y from the bottom
renderer.compile(scene, camera);   // optional: build every shader now so nothing hitches later
renderer.dispose(); renderer.forceContextLoss();
renderer.info;   // { calls, triangles, programs }
```

One `render` call does one shadow pass, draws every view into one HDR frame, then runs post once. Always render the three walls in a single call.

## The three walls

```js
const walls = G.createWallRig({ fov: 64, aspect: 1.6, near: 0.1, far: 2000 });   // left, front, right
scene.add(walls.rig);
walls.rig.position.copy(eye);
walls.rig.quaternion.copy(eyeQ).multiply(PITCH);      // tilt the RIG, never one camera
renderer.render(scene, walls.views(renderer.width, renderer.height));
```

All three cameras share one orientation and one fixed 64° vertical field of view (90° across a 16:10 wall), so the walls meet seamlessly. Never pitch, roll or zoom one camera on its own.

**Overlays.** `G.toScreen(worldPos, camera, x, y, w, h)` gives `{ x, y, inside, depth }` in the view's own units (y down), or `null` behind the camera. For wall `i` of the 4800×1000 world, use `x = i * 1600, y = 0, w = 1600, h = 1000`. `vector.project(camera)` works as usual too.

**Taps to rays.** `new G.Raycaster().setFromCamera({ x: ndcX, y: ndcY }, camera)`, then `.ray` (with `.at(t)`, `.intersectPlane(plane)`, `.intersectSphere(c, r)`) or `.intersectObjects(list)` (meshes by triangle; instanced meshes by bounding sphere). For a tap at wall pixel (px, py), ndc = `((px / 1600) * 2 - 1, 1 - (py / 1000) * 2)`.

## Scene graph

`Node` (alias-free; `Group` and `Scene` extend it):
- `position`, `rotation` (Euler, any order), `quaternion` (kept in step with `rotation`) and `scale`;
- `visible`, `castShadow`, `receiveShadow`, `frustumCulled`, `renderOrder` and `userData`;
- `add`, `remove`, `removeFromParent`, `clear`, `traverse` and `getObjectByName`;
- `getWorldPosition`, `getWorldQuaternion` and `getWorldDirection`;
- `localToWorld`, `worldToLocal`, `lookAt` (+z toward the target; cameras and lights −z);
- `rotateX/Y/Z` and `translateX/Y/Z`, `updateMatrixWorld()`.

The other node types:
- `Scene`:
  - `fog` (`new G.Fog(color, near, far)` or `new G.FogExp2(color, density)`);
  - `background` (a Color);
  - `environment`;
  - `environmentIntensity`.
- `Mesh(geometry, material)`, where `material` may be an array, one per geometry group (BoxGeometry has groups for +x, −x, +y, −y, +z and −z).
- `InstancedMesh(geometry, material, count)`:
  - `setMatrixAt(i, m)` then `instanceMatrix.needsUpdate = true`;
  - `setColorAt(i, color)` then `instanceColor.needsUpdate = true`;
  - `count` can be lowered to draw fewer.
- `Sprite(SpriteMaterial)`, sized by `scale.x` and `scale.y`, with `center`. It always faces the camera.
- `PerspectiveCamera(fov, aspect, near, far)` and `OrthographicCamera(l, r, t, b, near, far)`. Call `updateProjectionMatrix()` after changing them.
- Lights:
  - `AmbientLight(color, i)` and `HemisphereLight(sky, ground, i)`.
  - `DirectionalLight(color, i)` shines from `position` toward `target` (add the target to the scene to move it). Its `shadow` has:
    - `mapSize`;
    - `camera` (an ortho box in light space, e.g. ±16, near 1, far 160);
    - `bias`, `normalBias` (world units) and `radius` (softness in texels);
    - `autoUpdate = false` with `needsUpdate = true` to refresh it rarely.

    Only the first shadow-casting directional light gets a shadow map. Move the light and its target with the action, and the box follows.
  - `PointLight(color, intensity, distance, decay)` (max 8 lit at once). Pool them for explosions and set `intensity = 0` when unused.

## Geometry

Builders, with the usual axes and UVs:
- `BoxGeometry(w, h, d)` and `PlaneGeometry(w, h, ws, hs)` (faces +z);
- `CircleGeometry(r, seg)` and `RingGeometry(inner, outer, seg)` (both face +z);
- `SphereGeometry(r, ws, hs, phiStart, phiLength, thetaStart, thetaLength)`;
- `CylinderGeometry(rTop, rBottom, h, seg, hSeg, openEnded)` (along y), `ConeGeometry(r, h, seg)` (points up) and `CapsuleGeometry(r, length, capSeg, radialSeg)`;
- `TorusGeometry(r, tube, radialSeg, tubularSeg, arc)` (in the xy plane);
- `IcosahedronGeometry(r, detail)`;
- `LatheGeometry(points: Vector2[], seg)` (about y, smooth seam);
- `TubeGeometry(curve, tubularSeg, r, radialSeg)` along a `CatmullRomCurve3(points)` or anything with `getPoint(t, out)`.

Your own: `new G.BufferGeometry()`, then `setAttribute('position' | 'normal' | 'uv' | 'color', new G.Float32BufferAttribute(array, itemSize))` and `setIndex(array)`. Or use `G.geometryFrom({ position, uv, color }, index)`, which computes normals for you.

The usual geometry methods all work:
- `translate`, `rotateX/Y/Z`, `scale`, `applyMatrix4`, `center`;
- `computeVertexNormals`, `computeBoundingSphere`, `toNonIndexed`, `clone`, `addGroup`, `setDrawRange`;
- `G.mergeGeometries(list, useGroups)`.

After editing an attribute's array, set `attribute.needsUpdate = true`. `dispose()` frees the GPU buffers; mark shared geometry (`userData.shared`) and don't dispose it.

## Materials

Every material has these settings:
- `side` (`G.FrontSide`, `G.BackSide`, `G.DoubleSide`);
- `transparent`, `opacity`, `alphaTest`, `depthWrite`, `depthTest`;
- `blending` (`G.NormalBlending`, `G.AdditiveBlending`, `G.MultiplyBlending`);
- `fog`, `toneMapped`, `polygonOffset` (+ `Factor` / `Units`);
- `vertexColors`, `flatShading`, `visible`.

The material types:
- `StandardMaterial` (alias `MeshStandardMaterial`):
  - `color`, `map`, `roughness`, `metalness`;
  - `roughnessMap` (G channel), `metalnessMap` (B channel);
  - `emissive`, `emissiveIntensity`, `emissiveMap`;
  - `normalMap`, `normalScale`, `envMapIntensity`.
- `PhysicalMaterial` (alias `MeshPhysicalMaterial`) adds:
  - `clearcoat`, `clearcoatRoughness`;
  - `sheen`, `sheenColor`, `sheenRoughness`;
  - `iridescence`, `iridescenceThickness`;
  - `transmission`.
- `BasicMaterial` (alias `MeshBasicMaterial`): unlit, `color` × `map` × vertex colour. With `toneMapped: false` it shows exactly its colour and blooms.
- `SpriteMaterial`: `color`, `map`, `opacity`, `rotation`, `sizeAttenuation`.
- `ShaderMaterial({ uniforms: { name: { value } }, vertexShader, fragmentShader, defines })`: your own GLSL. See [Your own shaders](#your-own-shaders).

Colours (`G.Color`) are kept linear. Hex numbers and CSS strings are read as sRGB, so `0xff8800` means what it says.

**Textures.**
- `G.canvasTexture(w, h, (ctx, w, h) => { ...paint... })` makes an sRGB colour texture. Alternatively, use `new G.CanvasTexture(canvas)` and set `colorSpace = G.SRGBColorSpace` yourself for colour maps.
- `G.loadTexture(url)` loads an image file.
- `new G.DataTexture(Uint8Array | Float32Array, w, h)` takes raw pixels.
- Settings: `wrapS` / `wrapT` (`G.RepeatWrapping`, …), `repeat`, `offset` (scroll it), `anisotropy` (`renderer.capabilities.getMaxAnisotropy()`), `flipY`, `generateMipmaps`.
- After repainting, set `texture.needsUpdate = true`. `dispose()` frees it.

## Light from all round: environments

```js
// A sky: GLSL defining vec3 skyColor(vec3 dir), linear HDR. Its uniforms are shared.
const sky = new G.SkyDome(`
	uniform vec3 sunDir;
	uniform vec3 zenith, horizon;
	vec3 skyColor(vec3 d) {
		vec3 c = mix(horizon, zenith, pow(clamp(d.y, 0.0, 1.0), 0.5));
		c += vec3(1.0, 0.85, 0.6) * pow(max(dot(d, sunDir), 0.0), 8.0) * 0.4;
		return c;
	}
	#define SKY_EXTRA
	vec3 skyExtra(vec3 d) { return vec3(30.0) * smoothstep(0.9993, 0.9997, dot(d, sunDir)); }   // the disc: seen, not reflected
`, { sunDir: { value: SUN }, zenith: { value: new G.Color(0x1a66e0) }, horizon: { value: new G.Color(0xa9d6f6) } }, 3000);
scene.add(sky);
scene.environment = sky.environment(renderer);    // call again after changing the uniforms (it refills the same cubes)
// every frame:
sky.follow(eye);
```

The other ways to make an environment:
- **From any GLSL:** `renderer.environmentFromShader('...vec3 envColor(vec3 d) {...}', { size: 128, uniforms, into: env })`.
- **From a scene:** `renderer.environmentFromScene(scene, { position, size, near, far })`.
- **Indoors:** `renderer.environmentFromScene(G.roomEnvironment())` gives a soft studio light, like the train game's.

Remaking an environment from a shader at size 128 is cheap. Doing it every few seconds as a sky changes is fine, but not every frame. `env.dispose()` frees it.

## Your own shaders

`ShaderMaterial` takes GLSL the way most WebGL code writes it (`varying`, `attribute`, `texture2D`, `gl_FragColor`). The engine provides:
- **Vertex attributes:** `position`, `normal`, `uv`, `color` (vec4), and `instanceMatrix` when instanced.
- **Vertex uniforms:** `modelMatrix`, `viewMatrix`, `projectionMatrix`, `modelViewMatrix`, `normalMatrix` and `cameraPosition`.
- **Fragment uniforms:** `viewMatrix` and `cameraPosition`, plus `untonemap(vec3)` to output an exact display colour.

Don't redeclare these. Output linear HDR colour: the engine tone maps, so drop any `#include <tonemapping_fragment>` (includes are stripped anyway). To keep a dome at the far plane, set `gl_Position.z = gl_Position.w * 0.99999`, with `depthWrite: false` and a very low `renderOrder`. Set `material.needsUpdate = true` after changing the source.

## Porting from three.js

| three.js | Glint |
|---|---|
| `new THREE.WebGLRenderer({...})`, `toneMapping`, `shadowMap.*` | `new G.Renderer({ logarithmicDepthBuffer })`. ACES tone mapping and PCF soft shadows are always on; `renderer.shadowsEnabled` switches shadows. |
| `setViewport` / `setScissor` / `render` per wall | one `renderer.render(scene, views)` (see `createWallRig().views`) |
| `PMREMGenerator.fromScene(...)`, `scene.environment = env.texture` | `scene.environment = renderer.environmentFromShader(glsl)` / `environmentFromScene(scene)` / `sky.environment(renderer)` |
| `RoomEnvironment` | `G.roomEnvironment()` |
| `EffectComposer` + `UnrealBloomPass` + `OutputPass` | built in: `renderer.bloom`, `renderer.grade` |
| `#include <tonemapping_fragment>` in ShaderMaterials | not needed (stripped) |
| `Raycaster`, `Vector3.project`, `Line3`, `Matrix4.lookAt`, `Object3D.lookAt` | the same |
| `OutlinePass`, `SkinnedMesh`, `Points`, `Line`, loaders (GLTF etc.) | not yet: ask the Sonic Dash / Loop Island session |

Loop Island (`games/loop-island`) is the worked example. It has a chase rig with three wall cameras, a procedural swept road, a sky and ocean as `ShaderMaterial`s, an environment from the sky's GLSL, clearcoat toys, chrome, unlit glows that bloom, additive sprites, shadows following the pack, and log depth for a 6 km view.
