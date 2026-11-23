# Architecture

This document describes what exists today. Planned systems are listed
separately so the documentation does not claim features that are not
implemented.

The engine was migrated from Three.js to Babylon.js on 2026-11-23 for the
open-world overhaul. The previous Three.js build is preserved on the
`backup/threejs-stage1` branch.

## Current systems

### Entry point - `src/main.ts`

Finds `#app`, probes for a WebGL 2 context, creates one `Game` instance and
shows a readable failure screen if the browser cannot render the game.

### Game loop - `src/core/game.ts`

Owns the Babylon engine, scene, camera, lights, shadow generator, player,
vehicles, GPS, HUD and maps, plus the campaign state, mission manager and
save/load wiring.

- Creates the engine with `preserveDrawingBuffer` enabled so automated
  screenshot QA works, and caps the hardware scaling level at a pixel ratio
  of 2.
- Scene: ACES tone mapping, exponential fog tied to the sky colour,
  hemispheric fill light and a directional sun with a 2048 px blurred
  shadow map that follows the active camera target.
- Day/night: the sun direction, colour, intensity, fog density, sky colour,
  moonlight and night point lights are recomputed from the in-game hour.
  A cool directional moon and a warm dusk ambient keep the night and sunset
  readable; the active vehicle switches on a spot headlight after dark.
  Standard materials allow six simultaneous lights, so the moon, headlight
  and settlement point lights bind alongside the sun and fill light. `T`
  advances two hours; time also advances slowly by itself.
- Simulation loop clamps delta time to 50 ms, updates either the player or
  the occupied vehicle, GPS and discovery state, redraws the minimap and
  renders the scene.
- Campaign flow: NEW CAMPAIGN opens the campaign screen (six moods, four
  difficulty levels); BEGIN applies the chosen mood palette, resets the
  hour, vehicles and discovered locations, starts the prologue objective
  and saves. CONTINUE restores the last autosave.
- Mission flow: J opens the mission board (pausing and releasing the
  pointer); accepting a contract sets the GPS waypoint, HUD track and
  countdown. Fits, interactions, holds and deliveries are evaluated every
  frame by the mission manager; completion or failure updates credits,
  trust, HUD and the save.
- Mood palette: each mood tints the sky, scales fog density and sets tone
  mapping exposure; the effect is recomputed every frame from the shared
  day/night lighting.
- Autosave: progress (campaign, mission, position, hour, discovered
  locations, driving state) is written every 10 s and on mission events,
  tab hide and unload.
- Pause flow: pointer lock is the source of truth. Releasing the pointer
  pauses and shows the pause screen; RESUME re-requests the lock. Opening
  the map releases the pointer without pausing, and closing it restores the
  lock. The mission board and campaign screen pause the render loop's
  simulation while open.
- `?test=1` starts the simulation without pointer lock and exposes
  `window.__farmbot` with state, teleport, waypoint, discovery and vehicle
  helpers for automated QA. This is a development hook, not gameplay.
- Handles window resizing.

### Input - `src/core/input.ts`

- Tracks held keys by `KeyboardEvent.code` and one-frame presses
  (`consumePress`).
- Accumulates mouse movement only while the pointer is locked (or in test
  mode), consumed and reset by the player each frame.
- Owns pointer-lock requests and reports success/failure to the game;
  clears held keys on blur or unlock.
- Emits a one-shot key hook for map/time keys.

### Player - `src/player/player.ts`

First-person controller with no physics engine.

- Yaw/pitch look (pitch clamped), camera rotation set as pitch/yaw with no
  roll.
- Accelerated movement toward walk or sprint speed, sprint only while
  moving forward.
- Jump with gravity; the player follows the terrain heightfield.
- 2D circle-vs-AABB collision (`src/world/collision.ts`) against building
  colliders, with a speed penalty on contact.
- Subtle head bob and a damped FOV increase while sprinting.

### Vehicles - `src/vehicles/vehicles.ts`

Procedural tractor and pickup, both drivable.

- Throttle/brake/reverse, speed-sensitive steering, grip scaling and a
  handbrake (Space).
- Terrain pitch/roll sampled at front, rear and lateral offsets, with
  damped orientation; collisions reuse the same circle-vs-AABB resolver.
- Damped chase camera with ground clamping and a per-vehicle FOV.
- `VehicleManager` exposes the nearest unoccupied vehicle within range for
  the E prompt.

### World - `src/world/`

- `landscape.ts` - deterministic basin heightfield with location pads, road
  flattening, a lake depression and a rim of hills; `heightAt`, `normalAt`
  and terrain colour sampling.
- `roads.ts` - road network and segment data used for terrain flattening,
  routing and map drawing.
- `structures.ts` - procedural buildings, signs, fields, solar arrays,
  waterworks, TerraNova towers and props for all nine locations, plus
  animated turbine hubs and collider generation.
- `collision.ts` - shared rotated-AABB colliders and circle push-out.
- `world.ts` - builds the terrain mesh with vertex colours, road ribbons,
  the lake disc, mountain silhouettes, thin-instanced trees/rocks/shrubs
  and farm crops; exposes colliders, shadow casters and per-frame animated
  part updates.

All geometry is procedural placeholder geometry. No external models,
textures, images or audio are used.

### Navigation - `src/nav/`

- `locations.ts` - the nine location definitions (positions, radii, copy).
- `routing.ts` - Dijkstra over the road graph, with a direct-line fallback.
- `gps.ts` - waypoint state, route refresh when the player moves, and the
  in-world beacon (beam and pulsing ring).

### Story and campaign - `src/story/campaign.ts`

- `CampaignState` holds the chosen mood, difficulty, credits, trust,
  completed/failed mission counts and briefing flags, created by
  `createCampaign(mood, difficulty)`.
- `MoodDef` (accent colour, sky tint, fog scale, exposure, briefing line,
  mission filter) and `DifficultyDef` (reward, trust and repair scales,
  timer scale, guidance) drive the palette and mission rules.
- `moodOf` / `difficultyOf` resolve saved ids back to definitions.

### Missions - `src/missions/`

- `missions.ts` - mission definitions (giver, act, mood tags, location,
  objectives, rewards, prerequisites, replay behaviour). Objective kinds:
  `reach`, `interact`, `hold` (hold E) and `deliver` (drive in range, only
  when an objective loads cargo).
- `missionManager.ts` - tracks the active mission, evaluates objectives
  each frame against a small context (`x`, `z`, `driving`, `holding`,
  `dt`), scales timers by difficulty, pays rewards (replays pay 25% and no
  trust), applies the failure penalty, serialises/restores state for the
  save system and exposes the board view model with locked/available/
  completed status.
- The board only offers missions matching the current mood, with
  prerequisites satisfied.

### Save data - `src/core/game.ts`

- Versioned `SaveData` (v1) under the `farmbot2090.save.v1` localStorage
  key: campaign state, mission progress (including hold progress), player
  or vehicle pose, hour and discovered locations.
- Loading is defensive: unknown versions or malformed payloads are
  discarded rather than half-applied.

### UI - `src/ui/`

- `hud.ts` - start/pause screens, quest card, compass, interaction prompt,
  speedometer, campaign chip (mood + standing), toasts and the minimap
  canvas.
- `campaignScreen.ts` - mood and difficulty picker with a live summary.
- `missionBoard.ts` - contract list with status, rewards, prerequisites and
  accept/postpone actions.
- `minimap.ts` - north-up circular minimap (150 m range) with roads, lake,
  route, discovered locations, vehicles, waypoint and player heading.
- `worldmap.ts` - full-screen survey map with location markers,
  undiscovered sites, roads, route, vehicles, compass rose and scale bar;
  clicking sets a snapped or custom waypoint. Closing is handled by the
  game.
- `mapTypes.ts` - shared map draw state and location colours.

### Shared core

- `constants.ts` - world, player and time tuning.
- `math.ts` - clamp, smoothstep, lerp, damp and approach helpers.

## Planned systems (not implemented)

| Stage | Systems |
| --- | --- |
| Story | Story dialogue, choices and cutscenes around the existing mission arcs |
| Characters | NPC schedules and dialogue for Mama Zuri, Juma, Dr. Sifa, Wanjiku and the TerraNova director |
| Simulation | Farming and restoration actions, inventory and equipment, world events and long-term consequences |
| Atmosphere | Licensed or owner-created audio, weather and dust storms, enhanced character models |
| Persistence | Settings, journal and mission log beyond the existing save/load |
| Delivery | Full playthrough QA, performance pass, itch.io HTML5 build |

## Key technical decisions

- **Babylon.js 8.** Chosen by the owner for the overhaul; imports are
  tree-shaken from `@babylonjs/core`.
- **One shared heightfield.** Player, vehicles, buildings, roads, lake,
  vegetation and map all derive positions from `heightAt`, so systems agree
  on the world.
- **Procedural placeholder world.** Primitives keep the repository small
  and make it easy to replace the environment with owner-created or
  licensed assets later.
- **No physics engine.** Walking, jumping and vehicle motion are custom
  arcade models; collisions are 2D AABBs, sufficient for the current
  layout. A full engine would be added only if climbing, ramps or stacking
  become requirements.
- **Relative build paths.** `base: './'` in `vite.config.ts` keeps the
  build portable to any static host, including itch.io.
- **Local-only state.** No backend; the save system uses a versioned
  `localStorage` payload and is written at checkpoints rather than every
  frame.
- **Pointer lock as pause.** Browsers release the pointer on Esc, so the
  pause menu follows the lock state instead of fighting the browser.
