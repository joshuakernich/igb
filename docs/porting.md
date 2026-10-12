# Porting a prototype from the old platform

**Status (9 Oct 2026): done.** Every game in the old menu is ported, each
by one agent and then checked by a second, adversarial one against the
original (`tools/port-workflow.js`, specs in `tools/port-units.json`). What
stays in the old platform: the Batman prototypes, Pong, Tiny Tennis,
Adventure, the unlisted experiments and the old versions (headers-old,
final-frenzy-old, goalie, claw-chaos 2D, claw-game). This guide is how to
bring any of them across.

The old platform (`~/Documents/igb/igb-proto`) built every game out of DOM
elements styled by CSS strings injected from JavaScript, and loaded every game
at once. Here each game is one file that loads on demand, draws its art on a
canvas, and leans on shared components. This guide is how an old game comes
across without changing how it plays.

**The reference port is `games/coconut-climbers.js`.** Read it next to the
original (`proto/js/party/coconut-climbers.js` in the old platform) before
starting: it shows every rule below applied.

## What must not change

Gameplay. Keep every constant, round structure, timing, score rule, random
choice, sound cue and HUD call as it was. The tick logic (the `step` run by the
interval) should read almost line for line like the original. Fix only clear
bugs (a typo that throws, an unclosed `<style>`), and list each fix in your
report. Add nothing.

How it looks, as far as possible. The canvas art should match the old CSS art
closely enough that the two screenshots are hard to tell apart.

## The game file

```js
/*
 * <Name>
 *
 * <Two or three sentences: what players do, and how the walls are used.>
 *
 * Input: <which player fields drive it, e.g. px (lean), py (squat)>.
 */
IGB.register('<id>', function <Name>Game(stage, playersMeta) {
	// constants, audio, entity constructors, game flow, then:
	self.draw = function (ctx) { ... };        // every animation frame
	self.setPlayers = function (players) { ... };
	self.fini = function () { ... };
});
```

Everything lives inside the `register` callback, so nothing leaks into the
global scope (two games each declaring `const W` would collide when Box Party
loads both). Helper constructors that the old file hung on `window` become
local `const`s.

`playersMeta` is the player list when Box Party launches the game; undefined
when it runs on its own (then the HUD asks for the squad size, as before).

## Mechanical changes

| Old | New |
| --- | --- |
| `self.$el = $('<igb>')`, `$game` sized `W*3 x H`, `resize()` scaling it every tick | Gone. The stage is the root and the launcher scales the world. Delete `resize`, `scale`, `$(document).innerWidth()`. |
| `$game.append(...)` for DOM that stays DOM | `stage.$ui` (above the canvas) or `stage.$bg` (below it) |
| `setTimeout(fn, ms)`, `setInterval(fn, ms)` | `stage.timeout(fn, ms)`, `stage.interval(fn, ms)`. Same arguments; `clearTimeout` / `clearInterval` still work. |
| `new AudioPlayer()` inside the game | `stage.audio()` |
| `'./proto/audio/party/x.mp3'`, `'./proto/img/...'` | the new path from your asset map (`assets/<id>/...` or `assets/shared/...`) |
| `window.doPartyGameComplete(x)` | `IGB.complete(rewards)`: always the coin rewards the podium shows (`scoresToRewards(scores)`), even where the old game passed its raw scores. Box Party adds the value straight onto players' coins. A game whose scores already are coins passes those. |
| `new PartyHUD(c)`, `hud.$el.appendTo($game)` | `new HUD(c)`, `hud.$el.appendTo(stage.$ui)`. Every method is unchanged. |
| `new PartyMeep(n)` (DOM) | `new Meep(n)` (canvas; see below) or, inside DOM / CSS 3D scenes, `new MeepView(n)` |
| `new PartyMeepHead(n)` | `new MeepHead(n)` in DOM, `Meep.drawHead(ctx, n, x, y, scale)` on canvas |
| `new PartyMeepScore(s)` / `meep.doScore(s)` | `meep.doScore(s)` |
| `new PartyTally(players)` | `new Tally(players)` |
| `PartyCube3D`, `BoxPartyCube` | `Cube3D`, `BoxCube` (shared/cube.js) |
| `GAMES['Coconut Climbers']` (game-library) | `IGB.find('coconut-climbers')`; its Box Party skin is `.box` |
| `$('<blurlayer>')` | `art.glass(ctx)`, drawn after the background, before the players |
| `var(--n0)` … `var(--n5)` | `PLAYER_COLORS[n]` on canvas, `var(--player-n)` in CSS |
| `$("head").append('<style>…')` | Mostly gone: the art is canvas now. CSS that must stay goes in `games/<id>.css`, every selector scoped under `igb-stage[game="<id>"]`. |

## From DOM elements to canvas entities

A DOM element becomes a plain object holding the numbers its CSS used to hold,
and the game's `draw(ctx)` paints it.

- **Position and tweens.** `$el.css({ left: x })` becomes `entity.left = x`.
  `$el.animate({ left: x }, 500)` becomes `$(entity).animate({ left: x }, 500)`:
  jQuery animates plain objects with the same durations, easings, `delay`,
  queues, `stop` and callbacks, so timings carry over exactly. Keep the CSS
  property names as field names where that keeps the port obvious
  (`bottom`, `top`, `left`, `opacity`).
- **Visibility.** `.show()` / `.hide()` become a `visible` flag; `.remove()`
  removes the object from whatever list is drawn.
- **Paint order** is the old DOM paint order. Within a stacking context:
  non-positioned content in tree order, then positioned elements with
  `z-index: auto` / `0` in tree order, then positive `z-index` in order.
  `transform` and `opacity < 1` create stacking contexts. Draw in that order.
- **Coordinates.** Work out where each element really was. Percentages are of
  the containing block; `bottom: b` in a container of height h means `y = h - b`.
  A zero-sized absolutely positioned element sits exactly at its `left` / `top`
  (or `bottom`) point. `transform-origin` defaults to the centre of the
  element's own box, so for a zero-sized element it is that point.
  `translate(-50%, -50%)` is relative to the element's own size. Transform
  functions apply left to right (`rotate(45deg) translate(20px)` rotates, then
  moves along the rotated axis). Use `ctx.save()`, `translate`, `rotate`,
  `scale`, `restore()` to mirror nested transformed containers.

### CSS to canvas

| CSS | Canvas |
| --- | --- |
| `border-radius` (px, %, elliptical, per corner) | `art.roundRect(ctx, x, y, w, h, radii, style)`; radii `[tl, tr, br, bl]`, each a number or `{x, y}`; oversized radii shrink like CSS |
| `border: 15px solid` on a rounded box | `art.border(ctx, x, y, w, h, radii, 15, { fill })` |
| `box-shadow` | `style.shadow: { color, blur, x, y }` (it follows the transform, like CSS) |
| `box-shadow: inset` | `art.inset(ctx, path, { color, blur, x, y })` |
| `linear-gradient(to bottom, a, b)` | `art.linear(ctx, x, top, x, bottom, [a, b])`; use an rgba with zero alpha rather than `transparent` |
| `radial-gradient(...)` | `art.radial(ctx, cx, cy, r0, r1, stops)` (CSS defaults to an ellipse reaching the farthest corner) |
| `background-image` + `background-size: cover / contain / 100%` | `art.cover`, `art.contain`, `art.tile` / `art.image` |
| `opacity` | `style.alpha`, or `ctx.globalAlpha *=` |
| text, `text-shadow`, `-webkit-text-stroke` | `art.text(ctx, str, x, y, { size, font, weight, fill, outline, outlineWidth, drop, shadow })` |
| `filter: blur(n)` | `ctx.filter = \`blur(${art.px(ctx, n)}px)\`` |
| `mix-blend-mode` | `ctx.globalCompositeOperation` |
| inline SVG paths | `art.path(ctx, d, x, y, scale, style)` or `new Path2D(d)` |
| `clip-path`, `overflow: hidden` | `ctx.clip()` |

Fonts (Rubik, Knewave, Paytone One, Playwrite DK Loopet) load in index.html;
name them in `art.text`. The canvas redraws every frame, so text appears in
the right font as soon as it has loaded.

## The Meep on canvas

`new Meep(n)` draws the same avatar the CSS meep did. Place it with `meep.x`,
`meep.y` (the point between its feet, where the CSS meep's 0x0 element sat),
`scale`, `scaleX`, `scaleY`, `rotate` (degrees), `opacity`, `visible`, and call
`meep.draw(ctx)` in your draw. Parts are objects of numbers, in the same px the
CSS used, measured from the top-left of the 100-wide avatar box whose left edge
is on `x` (so `meep.$handLeft.css({ left: -50, top: 220 })` becomes
`meep.handLeft.x = -50; meep.handLeft.y = 220`). See the header of
`shared/meep.js` for every part. `'40%'` style values become `0.4 * meep.h`.
When the old code moved a part out of the meep (Coconut Climbers moves the
hands to the tree), hide it on the meep (`visible = false`) and draw it
yourself (`Meep.drawHand`).

## Lessons from the first ports

- **Ported examples to copy from**, besides Coconut Climbers:
  `games/heads.js` (two games from one file, meep layering),
  `games/find-my-meep.js` (tapping canvas meeps, a curtain, depth sorting),
  `games/the-claw.js` (a CSS 3D tilted floor replaced by projecting points
  onto the canvas by hand, with `stage.surface` as an offscreen buffer).
- **Hands on top.** The CSS meep's hands had `z-index: 1`, so they painted
  over balls, score text and anything else in the same stacking context.
  Draw every meep with `meep.draw(ctx, 'body')`, then the other art, then
  every meep with `meep.draw(ctx, 'hands')`.
- **CSS transitions** port as `$(obj).animate(props, { duration, easing: 'ease' })`:
  `ease`, `ease-in`, `ease-out` and `ease-in-out` are registered with jQuery
  (shared/util.js), as is `cubicBezier(x1, y1, x2, y2)` for custom curves.
- **NaN from the tracker.** Before the tracker reports, player fields can be
  undefined; jQuery's `.css()` ignored the resulting NaN and left elements
  where they were. Guard positions the same way rather than drawing NaN.
- **Old and new load at different speeds** (the old page loads every game
  first), so plain `--shots` times don't line up between them. For exact
  comparisons, a scratch Playwright script in `tools/out/<id>/` can click the
  squad button itself and time shots from that click; `IGB.current` is the
  running game in the new page.

## Things that stay DOM

- **The HUD and the tally.** Shared, DOM, unchanged API.
- **Interactive controls** (buttons, an on-screen keyboard). Put them in
  `stage.$ui` and give them `pointer-events: auto` (the UI layer lets clicks
  through by default). To click canvas art instead, listen on `stage.$el` and
  hit-test `IGB.toWorld(e)`.
- **Animated GIFs and video.** A canvas only shows a GIF's first frame. Put them
  in `stage.$bg` (or `$ui` if they must cover the art).
- **Real 3D scenes.** Where the old game built a scene with `perspective` and
  `preserve-3d`, either keep the DOM structure for the 3D placement and paint
  the surfaces as canvases (`stage.surface(w, h)` gives a sharp one), or, when
  the 3D is simple (a tilted floor, things scaling with depth), project the
  points yourself and draw flat. Pick whichever keeps the look with the least
  machinery; put the remaining CSS in `games/<id>.css`.

## Checking your port

Run everything from `tools/` with Node 24
(`bash -c '. "$HOME/.nvm/nvm.sh" && nvm use --silent 24 && <command>'`).

1. `node --check ../games/<file>.js`
2. Same moments, old and new:
   `node smoke.mjs <id> --seconds=14 --shots=3,8,13` and the same with `--old`.
   Look at the screenshots in `tools/out/<id>/` side by side. For detail, shoot
   at `--width=4800` and crop with
   `sips -c <h> <w> --cropOffset <y> <x> in.png --out crop.png`.
   `node imgdiff.mjs old.png new.png diff.png` measures how far apart two
   still frames are.
3. A whole game, fast: `node smoke.mjs <id> --speed=8 --motion=wiggle --seconds=90 --shots=10,30,50,70,88`,
   old and new. It should reach the final scores and complete. Raise
   `--seconds` for long games.
4. The new report must have no problems. Problems the old version also has
   (a missing asset, say) are fine; list them.
