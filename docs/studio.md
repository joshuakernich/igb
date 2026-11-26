# IGB Studio

A Unity-style editor for the 3D (three.js) games. Artists build and light
scenes, import models and frame the three walls. Games load the result with
one call. Open `studio.html` (or press the cube button in the hub, beside
Debug).

- Locally: `python3 tools/serve.py`, then <http://localhost:4300/studio.html>
- Online: <https://joshuakernich.github.io/igb/studio.html>
- To open a scene directly: `studio.html?scene=assets/<game>/scenes/<name>.json` or `studio.html?game=<id>`

Use Chrome or Edge: they can save into a folder on your computer.

## The workflow

1. **Connect folder** (top right). Pick your checkout of this repo (the folder
   with `games/manifest.js` in it). The browser remembers it and asks again with
   one click next time. Save and Import then write real files into the
   project, ready to commit like any other change:
   - `assets/<game>/scenes/<name>.json`: scenes (plus `index.json`, the list of them)
   - `assets/<game>/models/<name>.glb` (plus `<name>.glb.js`, the same bytes for hosts that won't serve .glb)
   - `assets/<game>/models/source/`: the original files you imported
   - `assets/<game>/textures/`
   Without a folder you can still look around and edit, but Save downloads the JSON instead.
2. **Import.** Drop files anywhere, or use Import… under the viewport.
   - **Models:** `.glb`, `.gltf` (drop its `.bin` and textures with it), `.fbx`, `.obj`.
     Everything is stored as a single `.glb`, so games only ever load glTF.
     Animations come along. An FBX in centimetres (anything over 40 units across) is
     scaled to metres.
   - **Textures:** `.png`, `.jpg`, `.webp`.
3. **Build.** Use **+ Add** (or right-click the Hierarchy) to add:
   - shapes and empties;
   - **markers**: invisible points the code uses for spawns, targets and doors;
   - lights;
   - the games' own **code-built characters** (speedster family, Robotnik, Knuckles), with colour, kind and animation.

   To place a model, drag it from Assets into the scene or onto an object in the Hierarchy.
4. **Light and grade** it in **⚙ Scene Settings**:
   - tone mapping and exposure;
   - environment light (studio, day, sunset, night, neon);
   - background (a colour, or the environment as a sky);
   - fog;
   - bloom (strength, radius, threshold, cap);
   - shadows.
5. **Frame** it with **🎥 Wall Cameras**: the rig of three cameras, one for each wall.
   - It stands where the players' eyes are, in the middle of the room.
   - Move and turn it with the gizmo, or type values.
   - Keep the field of view at 64°: that is 90° across a 16:10 wall, so the walls meet seamlessly.
6. **Check** the strip under the scene view. It shows the three walls exactly as the
   game draws them: the same cameras, bloom and tone mapping. The toolbar's
   Scene / Split / Game buttons choose which views show.
7. **Play in hub** opens the game in another tab. While both are open, every
   edit shows in the running game straight away. **Save** (Ctrl+S) when
   it's right.

### Objects

| Type | What it is |
| --- | --- |
| Empty | A group: everything under it moves with it. |
| Marker | An invisible point for code: `scene.marker('Spawn')`. A marker's scale can mean a size (the demo's Room). |
| Shape | Box, sphere, cylinder, cone, plane, disc, torus, ring (a thin hoop) or capsule, each with a material: colour, metalness, roughness, clearcoat, emissive (and its power), opacity, texture, normal map and tiling. **Unlit** with Glow above 1 makes neon that blooms. |
| Model | An imported `.glb`. Pick its animation clip, speed and loop. Tint it, or override any of its materials by name (colour, metalness, roughness, emissive). |
| Character | A code-built game character. Its shape lives in code; here you place, colour and pose it. |
| Light | Sun (shines the way it faces; its position is the middle of its shadow area), point, spot, sky (hemisphere) or ambient, with shadows. |

Every object has a **name** (code finds it by name) and an optional **tag**
(code finds all of a kind by tag). It can also be ticked as a **template**:
templates aren't shown in the game, and code makes copies of them, for
example one per player.

### Keys

- W / E / R: move / rotate / scale. X: local or world space. Hold Ctrl while dragging to snap.
- F, or double-click: focus. Ctrl+D: duplicate. Delete: delete.
- Ctrl+Z / Shift+Ctrl+Z: undo / redo. Ctrl+S: save. P: pause animations.
- Drag a field's label (or its X/Y/Z tab) sideways to scrub the number; hold Shift for 10× steps.
- Orbit: left drag. Pan: right drag. Zoom: wheel.
- Click a wall in the Game strip to select what's there.

## In a game

`lib/three/igb-scene.js` builds the scene, in the Studio and in the game, so
the two always match.

```js
import * as THREE from '../../lib/three/three.module.min.js';
import { createWallComposer, createWallRig } from '../../lib/three/walls.js';
import { loadScene } from '../../lib/three/igb-scene.js';

const scene = new THREE.Scene();
const walls = createWallRig();
scene.add(walls.rig);
const post = createWallComposer(renderer, scene);

const s = await loadScene('assets/my-game/scenes/main.json', { renderer, live: true });
scene.add(s.root);
s.applyRender(scene, post);   // tone mapping, exposure, sky, fog, bloom, shadows
s.applyRig(walls);            // the wall cameras

const door = s.find('Door');                     // by name
const coins = s.findAll('coin');                 // by tag
const spawn = s.marker('Spawn');                 // a Vector3
const p1 = s.instantiate('Player', (n) => { n.model.tint = '#ff0000'; });   // a copy of a template
s.root.add(p1);
s.play(p1, 'Walk_Loop', { fade: 0.25 });         // a model's clip
s.setMode(s.find('Speedster'), 'run');           // a code-built character's animation

// every frame
s.update(dt);
post.render(walls.views(renderer.domElement.width, renderer.domElement.height));

// live: true rebuilds the scene whenever the Studio edits it, so find things again:
s.onReload(() => { /* re-find, re-instantiate */ });
```

`games/scene-demo` (**Studio Scene**, in the New folder) is a complete example:
- it loads its scene;
- it puts every player on the stage as a tinted copy of the Player template,
  walking with idle, walk, jog and crouch clips;
- it spins anything tagged `spin` and floats anything tagged `bob`.

### Adding a code-built character to the Studio

Add an entry to `PREFABS` in `lib/three/igb-scene.js`:
- `load`: the module's dynamic import;
- `params`: what artists can set, as colours or `{ value, options }`;
- `modes`: its animations;
- `make(module, params)`: returns `{ root, step(dt, time, mode) }`.

## The scene file

Plain JSON, easy to diff and merge:

```json
{
  "igbScene": 1, "name": "Scene Demo",
  "render": { "toneMapping": "ACES", "exposure": 1, "environment": { "preset": "studio", "intensity": 1 }, "background": { "type": "color", "color": "#141826" }, "fog": { ... }, "bloom": { ... }, "shadows": { ... } },
  "rig": { "position": [0, 1.35, 0], "pitch": -6, "yaw": 0, "fov": 64 },
  "objects": [ { "id": "…", "type": "mesh|model|prefab|light|marker|group", "name": "…", "tag": "…",
                 "position": [x, y, z], "rotation": [degrees], "scale": [x, y, z], "children": [ … ], … } ]
}
```

Units are metres. Rotations are in degrees, applied X, then Y, then Z.

## Hosting notes

- The claude.ai hub artifact can't serve `.glb`. The loader falls back to
  `<file>.glb.js`, which the Studio writes on every import.
- The hub artifact holds at most 511 files, so the Studio itself isn't in it;
  the hub's Studio button opens the GitHub Pages copy.
