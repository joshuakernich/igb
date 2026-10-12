export const meta = {
  name: 'port-igb-games-wave',
  description: 'Port the remaining 29 old IGB prototypes to the canvas platform (port, then adversarial review and repair), Box Party last',
  phases: [
    { title: 'Port', detail: 'one agent per game: rewrite to canvas, self-verify against the old version' },
    { title: 'Review', detail: 'independent reviewer hunts fidelity regressions and fixes confirmed ones' },
    { title: 'Box Party', detail: 'the metagame, once every game it launches exists' },
  ],
}

const NEW = '/Users/josh/Documents/igb-proto'
const OLD = '/Users/josh/Documents/igb/igb-proto'
const UNITS = `${NEW}/tools/port-units.json`
const NODE = `bash -c '. "$HOME/.nvm/nvm.sh" && nvm use --silent 24 && cd ${NEW}/tools && node smoke.mjs ...'`

const PORT_SCHEMA = {
  type: 'object',
  properties: {
    stem: { type: 'string' },
    filesWritten: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'What the game is and how the port is structured' },
    renderApproach: { type: 'string', description: 'What is canvas, what stayed DOM and why' },
    bugFixes: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'array', items: { type: 'string' } },
    preExistingIssues: { type: 'array', items: { type: 'string' } },
    sharedRequests: { type: 'array', items: { type: 'string' } },
    needsCss: { type: 'boolean', description: 'true if games/<id>.css was written and the manifest must load it' },
    verification: {
      type: 'object',
      properties: {
        syntaxOk: { type: 'boolean' },
        newProblems: { type: 'array', items: { type: 'string' } },
        oldProblems: { type: 'array', items: { type: 'string' } },
        reachedFinalScores: { type: 'boolean' },
        visualComparison: { type: 'string' },
      },
      required: ['syntaxOk', 'newProblems', 'oldProblems', 'reachedFinalScores', 'visualComparison'],
    },
  },
  required: ['stem', 'filesWritten', 'summary', 'renderApproach', 'bugFixes', 'deviations', 'preExistingIssues', 'sharedRequests', 'needsCss', 'verification'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    stem: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'pass-after-fixes', 'fail'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          area: { type: 'string', enum: ['gameplay', 'timing', 'input', 'visual', 'audio', 'conventions', 'robustness'] },
          description: { type: 'string' },
          fixed: { type: 'boolean' },
        },
        required: ['severity', 'area', 'description', 'fixed'],
      },
    },
    verification: { type: 'string' },
    remainingConcerns: { type: 'array', items: { type: 'string' } },
    sharedRequests: { type: 'array', items: { type: 'string' } },
    needsCss: { type: 'boolean', description: 'true if the game ends up with a games/<id>.css the manifest must load' },
  },
  required: ['stem', 'verdict', 'issues', 'verification', 'remainingConcerns', 'sharedRequests', 'needsCss'],
}

function portPrompt(stem) {
  return `You are porting one game from the old Immersive Gamebox (IGB) prototype platform to the new one. Several other agents are porting other games at the same time; stay inside your own files.

Old platform (READ ONLY, never write anything there): ${OLD}
New platform: ${NEW}

Your unit is the entry with "stem": "${stem}" in ${UNITS}. Read it first: it lists the menu id(s), the old source files (relative to ${OLD}/proto/js/), the asset map (old path as written in the old code -> new path relative to the new index.html) and notes for this game.
Write: ${NEW}/games/${stem}.js (and ${NEW}/games/<id>.css only if some DOM styling is unavoidable).

Read, in this order:
1. ${NEW}/docs/porting.md: the rules for a port, including "Lessons from the first ports". Follow them.
2. ${NEW}/games/coconut-climbers.js next to ${OLD}/proto/js/party/coconut-climbers.js: the reference port. Glance at the other finished ports the guide lists when they match your game's problems.
3. The header comments of ${NEW}/core/stage.js, core/art.js, shared/meep.js, shared/hud.js, plus shared/tally.js or shared/cube.js if your game uses them. Read the code of anything you call.
4. Your old source, every line.

Rules:
- Create or change only your own game file(s). Do not edit core/, shared/, games/manifest.js, index.html, tools/ (apart from scratch files in ${NEW}/tools/out/<id>/) or any other game. If the shared code lacks something, work around it inside your file and describe the change you would want under sharedRequests.
- Never write inside ${OLD}. Never run git.
- Gameplay must not change: every constant, round structure, timing, score rule, random choice, sound cue and HUD call stays as it was. Fix only clear bugs, and list them. IGB.complete always receives the coin rewards (see the guide's table).
- Game art moves to the canvas (draw(ctx)); DOM stays only for the HUD, interactive controls, animated GIF/video, and genuine CSS 3D scenes, as the guide explains.
- Drop stray debug console.log lines.

Verify, as in the guide's "Checking your port", working briskly: the user wants all the ports done quickly, so aim for one careful same-moment comparison and one accelerated whole game in each version, not exhaustive sweeps. Commands look like:
  ${NODE}
1. node --check on your file.
2. Same moments old and new; open the PNGs from ${NEW}/tools/out/<id>/ with the Read tool and compare; crop at --width=4800 with sips for detail; iterate until they match.
3. A whole game accelerated in both: --speed=8 --motion=wiggle, enough --seconds to reach the final podium.
4. The new report must list no problems.
If your unit has more than one id, check each.

Return the structured report.`
}

function reviewPrompt(stem, port) {
  return `You are an adversarial reviewer of a game port from the old IGB prototype platform to the new canvas platform. Assume the port has subtle regressions until you have proven otherwise, and fix the ones you confirm. Other agents are working on other games at the same time; stay inside this game's files.

Old platform (READ ONLY): ${OLD}
New platform: ${NEW}
The unit: the entry with "stem": "${stem}" in ${UNITS} (old source files under ${OLD}/proto/js/, asset map, notes).
New file: ${NEW}/games/${stem}.js (and any games/<id>.css it wrote).
The rules the port had to follow: ${NEW}/docs/porting.md. The reference port: ${NEW}/games/coconut-climbers.js.

The porter's report:
${JSON.stringify(port, null, 1)}

Check, in this order:
1. Gameplay fidelity, line by line. Walk every function in the old source and find its counterpart. Every constant, structure table, timing (timeout and interval ms, animate durations, delays, easings, queue order), branch, condition, score formula, random call, audio cue (ids, files, volumes, loop, restart, speed) and HUD call must match. Hunt for dropped lines, changed operators, off-by-one indexes, for...in loops rewritten with different index behaviour, and logic that used to read DOM state (positions, visibility) now reading something else. The one sanctioned change: IGB.complete gets the coin rewards even if the old game passed raw scores.
2. Input: setPlayers reads the same fields with the same transforms.
3. Visuals: run old and new at matching moments with ${NODE} and compare the PNGs from ${NEW}/tools/out/<id>/ with Read (paint order, positions, sizes, colours, shadows, text); then --speed=8 --motion=wiggle to the final podium in the new version.
4. Conventions from the guide: stage.timeout/interval and stage.audio; nothing global; no resize or self-scaling; fini clears what it should; every asset path in the file exists on disk; canvas shadows and filters through the art helpers.
5. Robustness: the new smoke report lists no problems; the game reaches its end; draw() never throws.

Fix every confirmed regression directly in this game's file(s), then re-run the checks. Do not change things that are not regressions. Never write in ${OLD}; never run git. Work briskly: the user wants the ports done quickly.

Return the structured verdict.`
}

function portAndReview(stem, phaseName) {
  return agent(portPrompt(stem), { label: `port:${stem}`, phase: phaseName || 'Port', schema: PORT_SCHEMA })
    .then((port) => port
      ? agent(reviewPrompt(stem, port), { label: `review:${stem}`, phase: phaseName || 'Review', schema: REVIEW_SCHEMA }).then((review) => ({ stem, port, review }))
      : { stem, port: null, review: null })
}

log(`Porting ${args.stems.length} games, then ${args.last.join(', ')}`)

const results = await pipeline(
  args.stems,
  (stem) => agent(portPrompt(stem), { label: `port:${stem}`, phase: 'Port', schema: PORT_SCHEMA }),
  (port, stem) => port
    ? agent(reviewPrompt(stem, port), { label: `review:${stem}`, phase: 'Review', schema: REVIEW_SCHEMA }).then((review) => ({ stem, port, review }))
    : { stem, port: null, review: null },
)

log(`Ported ${results.filter((r) => r && r.port).length}/${args.stems.length}; now ${args.last.join(', ')}`)

// Box Party launches the other games, so it goes once they all exist.
const last = []
for (const stem of args.last) last.push(await portAndReview(stem, 'Box Party'))

return results.concat(last)
