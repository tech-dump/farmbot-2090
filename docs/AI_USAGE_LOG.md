# AI usage log

Project: FARM BOT 2090: THE LAST SEED
Owner: Maxwell Muthuri
Competition: Hack Club Harvest 2026

## Rules being respected

- AI assistance is limited to a minority of the project. The official limit
  is one third; this project uses a conservative internal target of 20%.
- No AI-generated art, textures, models, music, sound effects or voice.
- The owner writes the final itch.io game description. No AI draft of it
  exists in this repository.
- The owner is the creator. AI tools are assistants, not authors.
- Estimates in this file are conservative and are not an official
  interpretation of the competition rules.

## Estimation method

AI-authored source is counted with `wc -l` over files that an AI assistant
wrote or substantially rewrote. Empty lines and comments are included, which
overstates the AI share rather than understating it. The count is compared
with the whole codebase at the time of the entry. Documentation is tracked
separately from code.

## Entries

### 2026-11-22 - Stage 1 foundation

Tool: Qoder desktop AI coding agent, acting on the owner's instruction to
execute the master prompt.

Assistance provided:

- Created the Vite + TypeScript + Three.js project configuration.
- Wrote the Stage 1 first-person controller, input handling, world
  construction and HUD.
- Drafted the technical documentation in `docs/` and the README skeleton.
- Did not create any artwork, textures, models, music or sound effects.
- Did not draft the game description; the README leaves it blank for the
  owner.
- Added a WebGL-unavailable fallback screen and a development-only
  `?test=1` QA hook after testing showed the in-app preview browser cannot
  create a WebGL context and headless Chrome blocks pointer lock.

Files substantially written by AI:

| File | Lines |
| --- | --- |
| `src/main.ts` | 31 |
| `src/style.css` | 441 |
| `src/core/game.ts` | 165 |
| `src/core/input.ts` | 102 |
| `src/player/player.ts` | 178 |
| `src/world/world.ts` | 577 |
| `src/ui/hud.ts` | 146 |
| **Total code** | **1,640** |

Configuration, documentation and licence files (also AI-drafted): about 600
lines, tracked separately from game code.

Owner-authored code at this point: 0 lines.

AI share of the current codebase: 100% (1,640 of 1,640 lines). This is
expected at the foundation milestone but it is a large block of the AI
budget.

Conservative outlook: to keep the overall AI share below the 20% internal
target, the owner should personally write the large majority of the
remaining systems. For example, if the owner writes about 6,500 lines of
farming, restoration, mission, save and polish code, the AI share of an
approximately 8,200-line project would be roughly 20%. If the AI continues
to write most systems, the project will exceed the internal target and may
approach the official limit.

Next milestone guidance: the owner should implement the Stage 2 farming
interaction loop with review and debugging help from the AI, and record the
work here. The AI should avoid further large code generation unless the
owner explicitly accepts the budget impact.

### 2026-11-23 - Open-world overhaul, Babylon.js migration

Tool: Qoder desktop AI coding agent.

Owner decisions recorded on this date:

- Migrate rendering and gameplay from Three.js to Babylon.js (the previous
  build is preserved on the `backup/threejs-stage1` branch).
- Lift the conservative 20% internal AI target for this overhaul. This was
  an explicit owner instruction. The competition's one-third limit still
  applies, and lifting the internal target does not make the project
  compliant by itself.
- Build the world, map and vehicles first, using procedural placeholder
  assets.
- The owner remains the creator; the AI is an assistant. No AI artwork,
  textures, models, music or sound effects were created, and no game
  description was drafted.

Assistance provided:

- Rewrote the three.js foundation for Babylon.js 8: engine, scene, camera,
  lighting, shadows, tone mapping and fog.
- Added the 1.2 km x 1.2 km Kijani Basin heightfield, lake, hills, roads,
  nine locations, procedural buildings and vegetation.
- Added the minimap, full survey map with click-to-set waypoints, road-graph
  routing and the in-world GPS beacon.
- Added the drivable tractor and pickup with chase cameras and arcade
  terrain handling.
- Added day/night lighting, moonlight, vehicle headlights and the
  six-light material cap.
- Rewrote automated QA scripts (kept outside this repository) and captured
  screenshots from the running build.
- Updated the README, architecture, testing and development documentation.

AI-authored code in the current source tree (`wc -l`, comments and blank
lines included, which overstates the share):

| File | Lines |
| --- | --- |
| `src/core/constants.ts` | 15 |
| `src/core/math.ts` | 23 |
| `src/core/input.ts` | 122 |
| `src/core/game.ts` | 641 |
| `src/main.ts` | 43 |
| `src/player/player.ts` | 132 |
| `src/vehicles/vehicles.ts` | 376 |
| `src/world/landscape.ts` | 196 |
| `src/world/roads.ts` | 160 |
| `src/world/structures.ts` | 866 |
| `src/world/collision.ts` | 62 |
| `src/world/world.ts` | 389 |
| `src/nav/locations.ts` | 150 |
| `src/nav/routing.ts` | 132 |
| `src/nav/gps.ts` | 113 |
| `src/ui/hud.ts` | 223 |
| `src/ui/minimap.ts` | 168 |
| `src/ui/worldmap.ts` | 342 |
| `src/ui/mapTypes.ts` | 28 |
| `src/style.css` | 752 |
| **Total code** | **4,933** |

Documentation and configuration (also AI-drafted): `README.md`,
`docs/`, `index.html`, `vite.config.ts`, `tsconfig.json` - 684 lines
including this log, tracked separately from game code.

Owner-authored code at this point: 0 lines.

AI share of the current codebase: 100% (4,933 of 4,933 lines). This is far
above both the 20% internal target (now lifted by the owner for this
overhaul) and the official one-third limit. It must be corrected before
submission: the owner has to personally write the large majority of the
remaining story, mission, NPC, audio, weather, farming and persistence
systems, and may also want to take ownership of parts of the existing
foundation. The current state means the project cannot yet be described as
within the AI limit.

Next milestone guidance: the owner should personally implement the mission
and story content, dialogue, save/load and the remaining gameplay systems,
with the AI limited to review, debugging and small fixes unless the owner
explicitly decides otherwise and records the budget impact here.

### 2026-11-23 - Campaign, mission board and save systems

Tool: Qoder desktop AI coding agent, working from the owner-supplied
gameplay-expansion brief.

Assistance provided:

- Added `src/story/campaign.ts`: campaign state, six story moods with sky
  tint, fog, exposure and briefing data, four difficulty levels with
  reward, trust, repair and timer scales, and defensive save parsing.
- Added `src/missions/missions.ts` and `missionManager.ts`: mission data,
  mission board view model, travel, interact, hold and cargo-delivery
  objectives, timers, replay rewards, failure penalty and save/restore.
- Added `src/ui/campaignScreen.ts` (mood/difficulty picker) and
  `src/ui/missionBoard.ts` (contract list), and extended the HUD with a
  campaign chip, mission timer, hold progress and standing.
- Wired the systems into `game.ts`: campaign start/continue, J board,
  mission tracking, mood palette, autosave every 10 s and on events,
  and new test-mode helpers for automated QA.
- Fixed a delivery bug found in testing (cargo was required even for
  missions that never load cargo) and a mission-board status bug (locked
  contracts displayed as available).
- Ran the campaign QA suite in headless Chrome (72 checks) and captured
  screenshots; results are recorded in `docs/TESTING.md`.
- Did not create any artwork, textures, models, music, sound effects or
  voice, and did not draft the game description.

AI-authored code (`wc -l`, comments and blank lines included, which
overstates the share):

| File | Lines |
| --- | --- |
| `src/story/campaign.ts` | 318 |
| `src/missions/missions.ts` | 332 |
| `src/missions/missionManager.ts` | 336 |
| `src/ui/campaignScreen.ts` | 140 |
| `src/ui/missionBoard.ts` | 256 |
| `src/core/game.ts` | 1,101 |
| `src/ui/hud.ts` | 333 |
| `src/vehicles/vehicles.ts` | 397 |
| `src/style.css` | 1,275 |
| **Total code (all referenced files)** | **4,488** |

Lines added in this stage across new and changed files: 2,496 of the
project's 7,429 source lines. Whole-project total:

| Metric | Lines |
| --- | --- |
| Total source (all files) | 7,429 |
| Written by AI | 7,429 |
| Written by the owner | 0 |

AI share of the current codebase: 100%. This is above the official
one-third limit and must be corrected before submission: the owner needs
to personally write the large majority of the code, including at minimum
the remaining systems listed below.

Still not implemented: scripted dialogue and cutscenes, NPC schedules,
inventory and equipment, world events, weather, farming/restoration
actions, audio, settings and journal.

Next milestone guidance: the owner should personally write the dialogue,
NPC and farming systems, and should also consider rewriting enough of the
existing AI-authored modules to bring the project within the limit. The
AI should be limited to review, debugging and small fixes unless the owner
records a different decision here.

### 2026-11-23 - Story characters, Veyari and Corrupted machines

Tool: Qoder desktop AI coding agent, working from the two owner-supplied
master prompts for the story/character/enemy/open-world expansion and the
gameplay expansion.

Assistance provided:

- Added procedural humanoids with articulated limbs, clothing options,
  nameplates and a walk/sprint/idle/airborne pose driver; Amani uses the
  same rig, and the camera now defaults to third person with a V toggle.
- Placed the five story characters (Mama Zuri, Juma, Wanjiku, Dr. Sifa,
  TerraNova Director) and a branching dialogue system with choices that
  grant trust, credits, story flags and missions.
- Added the Veyari crash site, the envoy Iri, a first-contact conversation
  and the crash-reveal cinematic.
- Added six Corrupted machine patrols across five silhouettes with
  waypoint patrols, detection, an alert state and a return to patrol.
- Extended the mission chain with `descend`, `crash-site`,
  `iri-first-contact` and `machine-census`, added story flags to the save
  format, the Act I intro card, the intro cinematic and the cinematic
  skip behaviour.
- Fixed issues found in testing: a nameplate canvas context type error, a
  lost-input problem caused by shader-compile stalls (QA now gates input on
  rendered frames) and a camera that only applied on the next update (the
  test hook now applies it immediately).
- Wrote and ran a 54-check headless story QA suite (outside this
  repository) and re-ran the 72-check campaign suite; both pass. Results
  and screenshots are listed in `docs/TESTING.md`.
- Did not create any artwork, textures, models, music, sound effects or
  voice; the crash scar, ship, Iri, robots and humans are code-built
  primitives. Did not draft the game description.

Code counted as AI-authored in this stage (`wc -l`, comments and blank
lines included, which overstates the share):

| File | Lines |
| --- | --- |
| `src/characters/humanoid.ts` (new) | 327 |
| `src/characters/characters.ts` (new) | 176 |
| `src/characters/aliens.ts` (new) | 339 |
| `src/characters/robots.ts` (new) | 326 |
| `src/story/dialogue.ts` (new) | 208 |
| `src/core/game.ts` (added lines) | 496 |
| `src/missions/missions.ts` (added lines) | 142 |
| `src/ui/hud.ts` (added lines) | 111 |
| `src/style.css` (added lines) | 161 |
| `src/player/player.ts` (added lines) | 21 |
| `src/story/campaign.ts` (added lines) | 16 |
| `src/nav/locations.ts` (added lines) | 13 |
| `src/ui/mapTypes.ts` (added line) | 1 |
| **Lines added this stage** | **2,337** |

Whole-project total at this point:

| Metric | Lines |
| --- | --- |
| Total source (all files under `src/`) | 9,744 |
| Written by AI | 9,744 |
| Written by the owner | 0 |

AI share of the current codebase: 100%. This exceeds the official
one-third limit by a wide margin. Lifting the internal 20% target for
this overhaul did not change that. The project cannot be submitted as
compliant in this state: the owner must personally write at least about
6,500 lines (two thirds of 9,744) and should expect the total to grow,
which raises the threshold. Replacing AI-authored modules with
owner-authored code is the only reliable way to correct this.

Still not implemented after this stage: audio, inventory and equipment,
weather, NPC schedules and roaming, combat or hacking with corrupted
units, alternative mission approaches, map filters, settings and journal,
and higher-detail assets. Characters, aliens and machines are procedural
placeholders.

Next milestone guidance: stop expanding features with AI-written code. The
owner should take ownership of the story, dialogue and character code
first, since it is the most visible part of the game, then work through
the foundation modules. The AI should be limited to review, debugging and
small fixes unless the owner records a different decision here.

### 2026-11-23 - Campaign soundtrack (licensed audio)

Tool: Qoder desktop AI coding agent, working from the owner's instruction
to add the song "Stand Up", and the owner's choice to use a royalty-free
track when that exact recording was not available in a licensable form.

Owner decisions recorded on this date:

- Add a soundtrack to the game, starting with the campaign.
- Use a properly licensed royalty-free track rather than an unlicensed
  commercial song. The owner selected this option when asked.

Assistance provided:

- Sourced and licence-checked a human-made track: "Stand Up" by Pipe
  Choir, released under CC BY 4.0. The licence and creator were verified
  on the Free Music Archive and the Wikimedia Commons licence record. A
  CC BY-NC candidate was rejected because non-commercial terms do not fit
  a submitted game.
- Downloaded the original MP3 from the Free Music Archive (8,899,846
  bytes) into `public/audio/stand-up.mp3`. This is third-party human-made
  music, not AI-generated audio; no AI music, sound effects or voice were
  created.
- Added `src/audio/music.ts` (a looping `HTMLAudioElement` that starts
  inside the BEGIN/CONTINUE click, exposes mute and state for QA), wired
  it into `game.ts`, and added the pause-menu MUSIC toggle and start-screen
  attribution in `hud.ts`.
- Updated the README, architecture, testing, development and asset-credit
  documentation, including the full CC BY 4.0 attribution.
- Wrote and ran a 21-check headless audio suite (passes) and re-ran the
  72-check campaign suite (72/72) and 54-check story suite (54/54) on the
  production build. The suites are kept outside this repository.
- Did not create any artwork, textures, models, music, sound effects or
  voice, and did not draft the game description.

AI-authored code added in this stage (`wc -l` for the new file; insertions
from `git diff --numstat` for changed files; comments and blank lines
included, which overstates the share):

| File | Lines added |
| --- | --- |
| `src/audio/music.ts` (new) | 68 |
| `src/core/game.ts` (added lines) | 18 |
| `src/ui/hud.ts` (12 added, 1 replaced) | 12 |
| **Lines added this stage** | **98** |

The 8.9 MB audio file is a third-party asset, not code, and is not counted
in the source totals. Documentation and configuration changes are tracked
separately from game code.

Whole-project total at this point:

| Metric | Lines |
| --- | --- |
| Total source (all files under `src/`, including CSS) | 9,841 |
| Written by AI | 9,841 |
| Written by the owner | 0 |

AI share of the current codebase: 100%. Adding a licensed third-party
track does not change the code-authorship position: this still exceeds the
official one-third limit and must be corrected before submission. The
owner must personally write at least about 6,561 lines (two thirds of
9,841) and should expect the total to grow, which raises the threshold.

Still not implemented after this stage: sound effects, voice, NPC
schedules and roaming, inventory and equipment, weather, combat or hacking
with corrupted units, alternative mission approaches, map filters,
settings and journal.

Next milestone guidance: no further AI-written features. The owner should
write the next systems personally, starting with the story, dialogue and
character code, and record the work here. The AI should be limited to
review, debugging and small fixes unless the owner records a different
decision here.
