# IGB Prototypes

A platform for building and testing games for the Immersive Gamebox: three
projected walls (left, front, right), players tracked as they move around the
room. Each prototype is one JavaScript file that draws on a canvas spanning
all three walls and uses a shared kit of parts: the Meep avatar, the HUD, the
coin tally, audio.

## Running it

Open `index.html` in a browser (straight from disk works), or serve the folder:

```bash
python3 -m http.server 4300
```

then visit <http://localhost:4300>. The menu sits on the front wall; click a
prototype, or go straight to one with `index.html?coconut-climbers`. Old links
by display name (`?Coconut%20Climbers`) still work.

At a desk, the little gamebox under the stage stands in for the tracking
system: move the mouse over a wall or the floor to move the selected player,
click a wall to touch it, press 1–6 to choose which player the mouse moves,
and "Random move" scatters everyone. Inside the gamebox, Vuplex delivers real
tracking and the simulator hides itself.

⌂ returns to the menu and ↺ restarts the game. Each game loads on its own,
so a restart is a clean slate.

## Layout

```
index.html            the page: fonts, stylesheets, core, shared parts, manifest
core/
  igb.js              the IGB namespace: registry, on-demand loading, start/stop, completion
  stage.js            IGB.Stage: one running game's canvas, DOM layers, timers and audio
  art.js              IGB.art: canvas drawing helpers
  players.js          IGB.players: tracking input and the desk simulator
  launcher.js         the menu and the frame games run in
  launcher.css        the launcher's own look
  stage.css           the stage, player colours
shared/               parts any game can use
  meep.js / .css      Meep (canvas), MeepHead and MeepView (DOM)
  hud.js / .css       HUD: squad picker, timer, scores, banners, tutorials, podium
  tally.js / .css     Tally: Box Party's coin standings
  cube.js / .css      Cube3D and BoxCube: Box Party's CSS 3D boxes
  audio.js            AudioPlayer
  util.js             PLAYER_COLORS, shuffleArray, scoresToRewards, clamp, lerp
  shapes.js           outlines for Cookie Cutter and Cardboard Cutout
games/
  manifest.js         every prototype, by menu folder
  _template.js        a small working game to start new ones from
  <id>.js             one file per prototype (plus <id>.css, rarely)
  red-light-green-light/   a 3D game: an ES module with its own models and sound
assets/
  shared/             sounds and images used by shared parts or several games
  <id>/               assets used by one game
  icons/              menu icons
lib/                  jQuery, jQuery UI, three.js (lib/three/), and optional Matter / Quaternion
docs/porting.md       how an old-platform game was brought across
tools/                headless checks (see below)
```

## Writing a prototype

1. Copy `games/_template.js` to `games/<id>.js` and change the id it registers.
2. Add `{ id: '<id>', name: '<Name>' }` to a folder in `games/manifest.js`
   (the "New" folder is at the top of the menu).
3. Open `index.html?<id>`.

A game is a constructor registered under its id:

```js
IGB.register('my-game', function MyGame(stage, playersMeta) {
	const self = this;
	const { W, H } = IGB;          // one wall is W x H = 1600 x 1000
	const art = IGB.art;
	const audio = stage.audio();

	const hud = new HUD('#7538D4');
	hud.$el.appendTo(stage.$ui);

	self.draw = function (ctx) { ... };            // every animation frame
	self.setPlayers = function (players) { ... };  // every tracking update
	self.fini = function () { ... };               // when it stops

	stage.interval(step, 1000 / 50);               // game logic at 50 ticks a second
});
```

Everything the game declares stays inside that function, so games never
collide with each other.

### The world

The three walls sit side by side in one **4800 x 1000 world**: the left wall
is x 0–1600, the front wall 1600–3200, the right wall 3200–4800. The launcher
scales the world to the window, so games always work in world units.

### The stage

Every running game gets a stage:

| | |
| --- | --- |
| `stage.ctx` / `stage.canvas` | the world canvas. It is cleared before each frame, then `draw(ctx)` paints it. |
| `stage.$bg` | DOM behind the canvas: animated GIFs, video, CSS 3D scenes |
| `stage.$ui` | DOM in front of the canvas: the HUD, banners, buttons. It lets clicks through; give clickable things `pointer-events: auto`. |
| `stage.timeout(fn, ms)`, `stage.interval(fn, ms)` | like setTimeout / setInterval, but they stop when the game stops |
| `stage.audio()` | a new AudioPlayer that falls silent when the game stops |
| `stage.surface(w, h)` | a sharp canvas element for art that has to live in the DOM |

Use the stage's timers and audio rather than the browser's own: when Box
Party skips a minigame or you head back to the menu, everything the game
started stops with it.

### Drawing

Game art is drawn on the canvas, mostly with `IGB.art`:

```js
art.rect(ctx, x, y, w, h, { fill: 'white' });
art.roundRect(ctx, x, y, w, h, 20, { fill: art.linear(ctx, x, y, x, y + h, ['#fff', '#ccc']) });
art.circle(ctx, x, y, r, { fill: 'gold', shadow: { color: 'rgba(0,0,0,.4)', blur: 10, y: 6 } });
art.text(ctx, 'GO!', 2400, 500, { size: 200, font: 'Knewave', fill: 'white', outline: '#333', outlineWidth: 6 });
art.image(ctx, 'assets/my-game/thing.png', x, y, w, h);
art.cover(ctx, 'assets/my-game/bg.jpg', 1600, 0, 1600, 1000);
art.eachWall(ctx, (ctx, n) => { ... });         // (0, 0) is each wall's top-left in turn
art.with(ctx, { x, y, rotate: 15, scale: 0.5 }, () => { ... });
```

Each shape helper takes a style (`fill`, `stroke`, `lineWidth`, `alpha`,
`shadow`) and leaves the context as it found it. Shadows follow the canvas
transform, so they look the same at any scale. Also there: `art.border`,
`art.inset` (inner shadows), `art.ellipse`, `art.poly`, `art.line`,
`art.path` (SVG path strings), `art.tile`, `art.contain`, `art.radial`,
`art.glass` (the frosted tutorial overlay) and `art.px`.

Fonts loaded for every game: Rubik, Knewave, Paytone One, Playwrite DK Loopet.

Images can be used directly by path; `IGB.preload([...])` waits for them if
you need them ready before starting.

Tween anything with jQuery, plain objects included, which is the easiest
way to animate canvas art:

```js
$(ball).animate({ y: 800 }, 500).delay(200).animate({ opacity: 0 }, 300);
```

### Players

`setPlayers(players)` receives the tracked players (index = player number),
each with:

| field | meaning |
| --- | --- |
| `px` | left (0) to right (1) across the front wall |
| `py` | height: 0 is high, 1 is low (stand tall, squat) |
| `pz` | distance from the front wall: 0 at the wall, 1 at the back |
| `x`, `y`, `z` / `X`, `Y`, `Z` | the same, -1..1 (`y` up is positive) |
| `walls[n]` | the position seen from wall n (0 left, 1 front, 2 right): `px`, `py`, `pz`, and `dist` from that wall |
| `wall`, `wallChange` | the last wall touched |

### Meeps

```js
const meep = new Meep(n);       // hat colour from PLAYER_COLORS[n]
meep.x = 2400; meep.y = 900;    // the point between its feet
meep.scale = 0.6; meep.rotate = 10;
meep.draw(ctx);
meep.doScore(1);                // "+1" floats up with a note
meep.toRagdoll(); meep.toSkydiver(); meep.toFlyer(); meep.toIdle();
meep.setHeight(500);            // longer legs
meep.handLeft.y = 100;          // parts are numbers you can set or tween
```

`MeepHead(n)` and `MeepView(n)` are DOM versions (just the head, or a whole
meep) for HTML and CSS 3D scenes. The header of `shared/meep.js` lists every
part.

### Starting and finishing: Showtime's screens (the default)

Every new prototype asks how many are playing and shows the scores with
Showtime (`shared/showtime.js`): "HOW MANY PLAYERS?" on the front wall, and
at the end everyone's score counting up, then a ranking onto the podium.
`games/_template.js` is wired this way; copy it.

```js
const show = new Showtime(stage, {
	id: 'my-game', seconds: 60,
	players: () => count, scores: () => scores, music: false,
	theme: { accent, accent2, gold, ink, sky: [top, bottom], glow },   // optional
});
show.sequence([
	{ id: 'squad', length: Infinity },
	{ id: 'play', length: Infinity },                  // the game
	show.beats.scores(), show.beats.rank(),
	{ id: 'done', length: Infinity, world: false, enter() { IGB.complete(scoresToRewards(scores)); } },
]);
self.draw = (ctx, time) => show.frame(ctx, dt, drawWorld);   // dt from time
show.go('squad');
if (playersMeta) initGame(playersMeta.length); else show.pickPlayers(initGame);
// initGame: show.go('play'); at the end: show.go('scores')
```

Games that want the whole show (clock intro, team total, leaderboard,
replay, rating, carousel) add more of `show.beats`; see the header of
`shared/showtime.js`.

### The HUD

```js
const hud = new HUD(colour);
hud.$el.appendTo(stage.$ui);
hud.initPlayerCount(count => ...);           // the old picker (new games use show.pickPlayers)
hud.initPlayers(meeps);  hud.updatePlayers(meeps);
hud.initTimer(seconds, onDone);  hud.finiTimer();
hud.initRound(n, max);  hud.initBanner(text);  hud.finiBanner();
hud.summonPlayers([0, 2]);  hud.swapPlayers(a, b);
hud.initTutorial(name, { x, y, msg, icon }, ...);  hud.finiTutorial();
hud.flashMessage(x, y, text, size);
hud.showFinalScores(scores, rewards);        // the old podium (new games use show.beats.scores / rank)
```

Positions given to the HUD are in walls: x 0–3 across the three walls, y 0–1
down.

### Finishing

When a game ends, turn scores into Box Party coins and report them:

```js
const rewards = scoresToRewards(scores);    // higher score, more coins
IGB.complete(rewards);                      // after Showtime's scores and rank (see above)
```

On its own this just logs. Inside Box Party it hands the coins back and
moves on to the next box.

### Assets and styles

Put a game's files in `assets/<id>/`; things several games use go in
`assets/shared/`. Paths are relative to `index.html`.

Most games need no CSS at all. When a game keeps some DOM of its own, its
styles go in `games/<id>.css` (set `css: true` in its manifest entry), with
every selector scoped under `igb-stage[game="<id>"]`. Player colours are
available as `var(--player-0)` … `var(--player-5)`, and as `var(--player)`
on anything with a `player="n"` attribute.

### 3D games

A game can be an ES module (`module: true` in its manifest entry) and import
three.js:

```js
import * as THREE from '../lib/three/three.module.min.js';   // from games/<id>.js
IGB.register('my-3d-game', function (stage, playersMeta) { ... });
```

Put a WebGL renderer's canvas in `stage.$bg` and render it from your
`draw()`; the 2D canvas above it is still there for overlays, and the HUD
above that. `games/red-light-green-light/` shows the whole pattern: one
camera per wall from a shared eye so the arena wraps around the room, an
inset viewport, shadows, and resizing with the world.

Module games need the page served over http (`python3 -m http.server`);
everything else also runs straight from disk.

While a game runs, `IGB.current` in the browser console is the game
instance.

### Options in the manifest

| field | |
| --- | --- |
| `id`, `name` | file id and menu label |
| `icon` | menu icon |
| `file` | when the file isn't `games/<id>.js` (two ids sharing a file, or a game in its own folder) |
| `module` | `true` for an ES module game, which can `import` (three.js, its own helper modules) |
| `css` | load `games/<id>.css` |
| `libs` | `['matter']` or `['quaternion']` for those libraries |
| `box` | the game's mystery box in Box Party: `{ color, bg, note, name }` |

## Tools

Headless checks run in Google Chrome through Playwright. Set up once:

```bash
cd tools && npm install
```

Then, from `tools/` (Node 22 or newer):

```bash
node smoke.mjs coconut-climbers
```

That runs a game, picks a squad size, moves the simulated players, takes
screenshots and reports errors, failed requests and 404s. Screenshots go to
`tools/out/<id>/`. Useful options: `all` for every game,
`--speed=8 --motion=wiggle --seconds=90` to play a whole game fast with
everyone moving, `--shots=2,6,12`, `--width=4800` for full-size screenshots,
and `--old` to run the same game in the old platform for comparison.

`node imgdiff.mjs a.png b.png diff.png` measures how different two
screenshots are. `node rlgl-red-light.mjs` checks Red Light Green Light's
freeze rule: a small drift on red light bends a contestant, a big one gets
them shot. `node rlgl-ddakji.mjs` checks its side-wall ddakji: slapping a
tile gives the nearest player an extra life, which saves them from the next
shot. `tools/pages/` has test pages for the meep's poses and the
HUD's states.
