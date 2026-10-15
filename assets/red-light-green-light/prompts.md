# Red Light Green Light: asset prompts

Image prompts for ChatGPT, for the cel-shaded look. Each prompt repeats the
shared style so the set stays consistent. Generate each one as its own
message in a single chat, and save the result here under the filename given.
The game loads these files if they're present and falls back to drawing
everything itself if they're not.

## Shared style (part of every prompt)

> Cel-shaded game sprite in a bold, clean cartoon style: flat colours, two or three hard-edged tones per surface (no
> soft gradients), a confident black ink outline of even weight, lit from the
> upper left. Seen from slightly above (three-quarter top-down view), centred,
> filling most of the frame. Transparent background (PNG with alpha), no
> ground, no cast shadow, no text, no border.

## boulder-1.png

> A big round boulder of warm sandstone, slightly flattened sphere, a few
> chunky facets and two cracks, small pebbly chips. Colours: base #b9875a, shadow
> #7a5434, highlight #e6c08e. Square 1024x1024. [shared style]

## boulder-2.png

> A big round grey granite boulder, lumpy but rolling-round, a moss patch on
> top, one deep crack. Colours: base #9a9a94, shadow #5f605c, highlight #d2d2c8,
> moss #6aa84f. Square 1024x1024. [shared style]

## boulder-3.png

> A big round reddish-brown rock boulder, rough and blocky but still round
> enough to roll, layered sediment stripes, a chipped edge. Colours: base
> #a8613e, shadow #6c3a24, highlight #e0936a. Square 1024x1024. [shared style]

## dust.png

> A puff of dust kicked up by a running foot: a cluster of five or six round
> billowing cloud lobes, sandy beige, base #e8d2a6, shadow #bfa274, highlight
> #fff4dc. Square 1024x1024. [shared style]

## impact.png

> A comic-book impact burst: a jagged spiky star explosion shape, bright
> yellow core #ffe14a, orange ring #ff8a1c, red outer spikes #ff3d4a, with a
> few small flying debris chips. Square 1024x1024. [shared style]

## tree.png

> A lone gnarled, leafless old tree, as in a children's playground game
> arena: a thick twisting trunk splitting into bare spreading branches, warm
> brown bark with hard-edged shading. Seen from the front, standing upright
> (not top-down). Portrait 1024x1536. [shared style]

## The rest of the set

These were sent in the same chat after the six above. Each ended with the
shared style (worded "same cel-shaded style as the sprites above ...,
genuinely transparent background (real PNG alpha, no checkerboard)").

- **contestant-back.png** (sheet, 4 in a row): one contestant from behind and
  slightly above, teal-green tracksuit #1f8a6e / #17705a / #3fb08f, white
  stripes and plimsolls, short dark hair, a blank white patch on the back.
  Poses: standing, running left foot forward, running right foot forward,
  frozen with arms stuck out at about 55 degrees. Landscape.
- **contestant-front.png** (sheet, 4 in a row): the same contestant from the
  front, blank patch on the chest. Poses: standing, cheering fists up,
  jumping for joy, flat on their back knocked out. Landscape.
- **guards.png** (sheet, 3 in a row): hot-pink hooded jumpsuits #e5287a /
  #a8185a / #ff6aa8, black belts and boots, black masks with a white circle,
  triangle, square; rifle across the body, side view facing right. Landscape.
- **doll-body.png**: the giant doll's body without a head, from the front:
  orange pinafore #f07b1f over a yellow blouse #f7c934, white knee socks,
  black shoes, arms at her sides, a flat collar for the head. Portrait.
- **doll-heads.png** (sheet, 2): her head from the front (pale round face,
  small beady eyes, rosy cheeks, black bob with fringe, two pigtails with
  orange bobbles) and from the back (hair and pigtails only). Landscape.
- **items.png** (sheet, 2x2): a wad of green banknotes with a cream band; a
  red horseshoe magnet with silver tips; a tan money sack with a brown ₩; a
  big glass marble with a colour swirl. Square.
- **jump-pad.png**: a glowing round pad from directly above, dark metal ring,
  cyan #7df9ff glowing disc, white chevrons pointing outwards. Square.
- **blocks.png** (sheet, 3 in a row): chunky soft-play cubes in three-quarter
  view: pink #f05a8d with a white circle, teal #23a39a with a triangle,
  mustard #f2b134 with a square. Landscape.
- **piggy.png**: a giant clear glass piggy bank as a perfect sphere, small
  snout and ears, on a gold chain, empty, hard white glass reflections, pale
  blue tint, and NO black outlines (the game shows the piggy without ink).
- **sky.png** (opaque): a wide cel-shaded sky, #4fb4ff at the top to #bfe6ff at
  the horizon, big puffy inked clouds thicker toward the bottom, no sun,
  edges tiling. Landscape.
- **ground.png** (opaque): a seamless top-down sandy arena floor #e3c08a /
  #c9a26a / #f2d6a6 with pebbles and footprints, edges tiling. Square.
- **wall.png**: a strip of the distant arena wall: a pale wall with a sky and
  cloud mural, hedges and small trees along its base. ChatGPT painted a fake
  checkerboard above the wall instead of transparency, so only the band from
  58% of the image's height down is the wall (rows 247-426 of the 1280x426
  file).

Notes:
- The tree also came back with a painted checkerboard the first time; asking
  again for "genuinely transparent background (real PNG alpha, no
  checkerboard)" fixed it.
- Everything was downscaled with sips afterwards: single sprites to 512 px,
  the tree and doll body to 900 px tall, sheets and backdrops to 1280 px wide.

# Character sprite sheets

Animation sheets for every character, laid out as an even grid (2 rows of 4
cells, each frame centred in its cell, the same scale throughout) so the game
can cut them up by cell. Shared style for these, matching the game's current
look rather than the cel-shaded set above:

> Clean 2D game sprite sheet in a flat cartoon vector style: bold simple
> shapes, flat colours with one soft shadow tone, a thin dark outline. 8
> frames in a grid of 2 rows by 4 columns, each frame centred in its own
> equal cell with the feet on the same baseline, the same character at the
> same scale in every frame. Genuinely transparent background (real PNG
> alpha, no checkerboard), no ground, no cast shadows, no text, no grid
> lines, no frame numbers. Landscape 1536x1024.

- **sheet-contestant-run.png**: a contestant in a loose teal-green tracksuit
  (#1f8a6e, shadow #17705a) with white side stripes, white plimsolls, short
  dark hair and a plain white rectangle patch on the back (no number), seen
  from BEHIND and slightly above, running away from us: a smooth 8-frame run
  cycle (contact, down, pass, up, for each leg).
- **sheet-contestant-actions.png**: the same contestant from behind and
  slightly above: 1) standing still, 2) frozen stiff with arms stuck out
  sideways at 55 degrees, 3) frozen but wobbling, leaning left, 4) wobbling
  leaning right, 5) jumping up, 6) landing in a crouch, 7) shot, falling
  backward with arms flung up, 8) lying face down on the ground.
- **sheet-contestant-front.png**: the same contestant from the FRONT,
  friendly simple face, blank white chest patch: 1) standing, 2) waving, 3)
  cheering with both fists up, 4) jumping for joy, 5) victory pose pointing
  up, 6) disappointed slump, 7) knocked out flat on their back, 8) running
  toward us.
- **sheet-guard-circle.png**: an arena guard in a hot-pink hooded jumpsuit (#e5287a,
  shadow #a8185a), black belt and boots, a smooth black mask with a white
  circle symbol, holding a black rifle, seen from the side facing RIGHT: 1-4)
  a 4-frame walk cycle with the rifle held across the body, 5) standing at
  attention, 6) raising the rifle to aim, 7) firing with a small muzzle flash,
  8) lowering the rifle after the shot.
- **sheet-doll-head.png**: the giant playground doll's head (round pale face,
  small beady black eyes, rosy cheeks, black bob with straight fringe, two
  short pigtails with orange bobbles), turning on the spot from facing fully
  AWAY (only hair) to facing us, in 8 even steps of the turn: 1) back of the
  head, 2-7) turning by quarter-steps through the side view, 8) face on.
- **sheet-guard-triangle.png** and **sheet-guard-square.png**: the same guard
  sheet again with a white triangle, then a white square, on the mask.

Notes: generated 2026-10-16 in one ChatGPT chat, then shrunk to 1280x853
with sips. Each sheet is an even 2x4 grid, so frame n (0-7) is the cell at
column n % 4, row floor(n / 4). The doll's turn bunches up: frames 4-7 are all
nearly face-on. They aren't used by the game yet.

## Chibi versions (these replaced the sheets above, same file names)

Regenerated the same day with CHIBI proportions, the same seven sheets and
layouts. The shared style gained: "with CHIBI proportions: a big round head
about as tall as the whole body below it (the head is roughly 45% of the
total height), a short compact body, short stubby arms and legs, small hands
and feet". Each character prompt says "a chibi ..." too. The doll's head
asked for 8 EVEN steps (back, back three-quarter, nearly side-on from behind,
exact profile, side just showing the face, front three-quarter, nearly face
on, face on), which fixed the bunching, so the game uses all eight.
