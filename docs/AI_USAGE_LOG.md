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
