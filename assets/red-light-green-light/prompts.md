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

## Parts sheets (characters assembled from head, torso and legs)

One chat, 2026-10-16. The shared style for these: a PARTS sheet for a
cut-out (paper-doll) rig, chibi proportions, each part drawn on its own:
heads end in a short neck stub, torsos are cut flat at the neck and the
waist with their arms attached, legs start with the hips cut flat at the
waist, everything at the same scale, 2 rows by 4 cells, transparent.

- **parts-contestant-back.png**: from behind: head; torso arms down; torso
  arms out sideways; torso arms swinging (running); legs standing; legs
  striding left foot forward; right foot forward; legs crouched.
- **parts-contestant-front.png**: from the front: head smiling; head grinning
  with closed happy eyes; head sad; torso arms down; torso both fists up;
  torso one arm waving; legs standing; legs tucked mid-jump.
- **parts-guard.png**: side view facing right: hooded head with a circle,
  triangle, square on the mask; torso with the rifle across the body; torso
  aiming; legs standing; two walking strides.
- **doll-body-chibi.png**: the doll's body without a head, short and stocky,
  from behind and from the front side by side (not a grid).

## v2: lineless, richly shaded, more frames (what the game uses now)

Generated in one ChatGPT chat on 2026-10-16. The shared look: chibi, LINELESS
(no outlines or ink lines at all), richly shaded like a painted toy (three or
four soft-edged tones per surface, warm key light from the upper left, cool
shadows, ambient occlusion where parts meet, a soft rim light, fabric folds),
transparent. The parts sheets are 4x4 grids, one part per cell, cut flat at
the neck and waist, all at one scale.

- **v2-contestant-back.png**: from behind. Row 1: head; torso arms down; torso
  arms out (frozen); torso arms flung up. Row 2: four running arm swings (left
  arm forward, passing, right arm forward, passing back). Rows 3-4: legs
  standing; a six-step run (left foot reaching, down, pushing off; right foot
  reaching, down, pushing off); legs crouched.
- **v2-contestant-front.png**: from the front. Heads: smiling, grinning, sad,
  surprised. Torsos: arms down, cheering, waving right, waving left, pointing
  up, shrugging, clapping, arms crossed. Legs: standing, jumping, stepping
  toward us, crouched.
- **v2-guard.png**: side view facing right. Heads: circle, triangle, square,
  circle tipped down. Torsos: rifle across, aiming, firing (with a muzzle
  flash), rifle upright. Legs: standing, a six-step walk, a braced stance.
- **v2-doll-head.png**: her head turning from the back to face on in 16 even
  steps, 4x4.
- **v2-doll-body.png**: her body without a head, from behind and from the
  front, side by side.
- **v2-items.png**: 2x2: cash wad, magnet, money sack (₩), glass marble.
- **v2-tree.png**: the gnarled tree with a few leaf clumps, portrait.

## v3 (2026-10-16): stricter layout for the parts, and the back wall

The three parts sheets again, same look as v2, with LAYOUT RULES so the parts
line up: an exact 4x4 grid of 256 px cells; every part of a kind the same
size and in the same place in its cell "as if traced from the same template";
heads centred with the neck stub 24 px above the cell's bottom; torsos the
same width and height, the waist hem centred 24 px above the cell's bottom;
legs the same size, the waistband centred 24 px below the cell's top and as
wide as the torsos' waist; only the pose changes. Files: v3-contestant-back,
v3-contestant-front, v3-guard (same parts in the same order as v2).

- **v3-back-wall.png**: the arena's back wall, front on, filling the image:
  a weathered painted mural of a bright naive blue sky with big soft cumulus
  clouds, faint vertical panel seams, a pale sandy skirting band at the
  bottom; edges tile.

The lettering is Game of Squids (GameOfSquids.ttf, Darrell Flood, free for
all use; see GameOfSquids-license.txt).
- **v3-boulder.png**: a sprite sheet, 4x2, of one round sandstone boulder rolling toward the viewer, an eighth of a turn a frame (its cracks, chips and moss travelling down its face, frame 8 leading back into frame 1), the same size and place in every cell, lineless and richly shaded, transparent.

## v4 (2026-10-17): more arm frames; no sweater underside

- **v4-contestant-arms.png**: 16 running torsos from behind, a smooth arm-swing cycle (left arm fully forward at 1, passing at 5, right arm forward at 9, passing at 13), same layout rules; asked again so the sweater is seen exactly level, the bottom a clean flat horizontal cut with no underside or bulging hem showing.
- **v4-contestant-back.png**: the back-view parts sheet again with the same fix to every torso (and a flat-cut waistband on the legs).

The run is now twelve steps: the legs' six drawings two steps each, the arms through these sixteen.
