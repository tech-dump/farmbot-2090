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
| `src/main.ts` | 23 |
| `src/style.css` | 423 |
| `src/core/game.ts` | 165 |
| `src/core/input.ts` | 102 |
| `src/player/player.ts` | 178 |
| `src/world/world.ts` | 577 |
| `src/ui/hud.ts` | 146 |
| **Total code** | **1,614** |

Configuration, documentation and licence files (also AI-drafted): about 600
lines, tracked separately from game code.

Owner-authored code at this point: 0 lines.

AI share of the current codebase: 100% (1,614 of 1,614 lines). This is
expected at the foundation milestone but it is a large block of the AI
budget.

Conservative outlook: to keep the overall AI share below the 20% internal
target, the owner should personally write the large majority of the
remaining systems. For example, if the owner writes about 6,500 lines of
farming, restoration, mission, save and polish code, the AI share of an
approximately 8,100-line project would be roughly 20%. If the AI continues
to write most systems, the project will exceed the internal target and may
approach the official limit.

Next milestone guidance: the owner should implement the Stage 2 farming
interaction loop with review and debugging help from the AI, and record the
work here. The AI should avoid further large code generation unless the
owner explicitly accepts the budget impact.
