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
