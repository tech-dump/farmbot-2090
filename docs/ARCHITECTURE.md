# Architecture

This document describes what exists today (Stage 1). Planned systems are
listed separately so the documentation does not claim features that are not
implemented.

## Current systems

### Entry point - `src/main.ts`

Finds the `#app` element, creates one `Game` instance and starts the loop.

### Game loop - `src/core/game.ts`

Owns the WebGL renderer, scene, camera, clock and pause state.

- Creates the renderer (ACES tone mapping, soft shadows, pixel ratio capped
  at 2) and appends its canvas to `#app`.
- Creates the scene background and exponential fog.
- Builds the world and the player.
- Runs `requestAnimationFrame` with the delta clamped to 50 ms so a stalled
  tab cannot throw the player through walls.
- Raycasts from the centre of the screen each frame against interactable
  objects (range 3.8 m) and shows an **E** prompt.
- Pause flow: pointer lock is the source of truth. Locking hides the
  overlays and resumes simulation; releasing the pointer (Esc) pauses and
  shows the pause screen.
- Handles window resizing.

### Input - `src/core/input.ts`

- Tracks held keys by `KeyboardEvent.code`.
- Tracks key presses for one frame (`consumePress`) so actions fire once.
- Accumulates mouse movement only while the pointer is locked; the player
  consumes and resets the delta each frame.
- Owns pointer-lock requests and reports success/failure to the game.
- Clears held keys on blur and on unlock.

### Player - `src/player/player.ts`

First-person controller with no physics engine.

- Yaw/pitch look with pitch clamped to +/- 1.45 rad.
- Camera rotation order is `YXZ` so yaw and pitch do not roll the view.
- Movement is accelerated with frame-rate independent damping
  (`THREE.MathUtils.damp`) toward a walk or sprint target speed.
- Jump uses simple gravity and a flat ground plane at eye height 1.7 m.
- Collision is 2D: the player is a circle of radius 0.38 m tested against
  axis-aligned wall boxes and pushed out along the smallest penetration axis.
  Colliders ignore height, so all colliding meshes are treated as full-height
  obstacles. This is sufficient for the Stage 1 layout and keeps the model
  simple. Areas that need climbing or stairs would need a height-aware
  solution.
- Subtle head bob and a small FOV increase while sprinting.

### World - `src/world/world.ts`

Builds **THE FORGOTTEN FARM** from primitive meshes and exposes:

- `colliders` - AABBs used by the player.
- `interactables` - id, HUD label and placeholder message.
- `interactableRoots` - meshes tagged with an `interactId` for raycasting.
- `update(dt)` - drifting dust and the pulsing seed chamber light.

Contents: dusty ground with darker patches, the abandoned research facility
(walls, doorway, roof, consoles, crates), the Last Seed preservation chamber,
the fenced farm plot with depleted soil strips, a broken irrigation line and
pump, dead trees, instanced rocks, distant silo silhouettes, fog and dust
motes. The layout is deterministic through a seeded random generator.

All geometry is placeholder. No external models, textures, images or audio
are used.

### HUD - `src/ui/hud.ts`

Builds the interface DOM: start screen, pause screen, objective card,
crosshair, interaction prompt, toast messages, hint banner and control
legend. Interface copy only; final narrative and dialogue will be written by
the project owner.

## Planned systems (not implemented)

| Stage | Systems |
| --- | --- |
| 2 | Facility activation sequence, seed discovery flow, SPROUT companion, till/plant interactions |
| 3 | Growth stages, watering, irrigation repair, restoration state, resources, missions, save/load |
| 4 | Licensed or owner-created audio, music layers tied to restoration, visual polish, settings |
| 5 | Full playthrough testing, performance pass, itch.io HTML5 build |

## Key technical decisions

- **No physics engine.** Walking, jumping and wall collision are handled
  directly. A physics dependency is not justified by the current scope.
- **Procedural placeholder world.** Primitives keep the repository small and
  make it easy to replace the environment with owner-created or licensed
  assets later.
- **Relative build paths.** `base: './'` in `vite.config.ts` keeps the build
  portable to any static host, including itch.io.
- **Local-only state.** No backend. The save system will use `localStorage`
  with a versioned payload.
- **Pointer lock as pause.** Browsers release the pointer on Esc, so the
  pause menu follows the lock state instead of fighting the browser.
