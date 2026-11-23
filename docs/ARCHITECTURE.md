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
  renders the scene. It also drives the character, alien and corrupted-robot
  actors every simulated frame. While a dialogue or cinematic is open, the
  loop switches to a presentation update: the world keeps animating and the
  camera orbits the player, but player movement and missions are frozen.
- Counts rendered frames (`frames` in the test state) so automated QA can
  gate input on real simulation frames instead of wall-clock sleeps; shader
  compilation can stall the first seconds at 0.4-1 fps.
- Campaign flow: NEW CAMPAIGN opens the campaign screen (six moods, four
  difficulty levels); BEGIN applies the chosen mood palette, resets the
  hour, vehicles and discovered locations, starts the prologue objective
  and saves. CONTINUE restores the last autosave. Both paths start the
  soundtrack; the pause screen toggles it on or off.
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

Movement controller with a first-person and a third-person camera, no
physics engine.

- Third-person by default: the camera sits 5.2 m behind Amani, uses the
  same yaw/pitch, targets 1.55 m above the player and clamps above the
  terrain. V toggles back to first-person and hides the body mesh.
- The third-person body (Amani) is a `HumanoidRig` posed each frame from
  ground speed and sprint state.
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
  waterworks, TerraNova towers and props for all eleven locations, plus
  animated turbine hubs and collider generation.
- `collision.ts` - shared rotated-AABB colliders and circle push-out.
- `world.ts` - builds the terrain mesh with vertex colours, road ribbons,
  the lake disc, mountain silhouettes, thin-instanced trees/rocks/shrubs
  and farm crops; exposes colliders, shadow casters and per-frame animated
  part updates.

All geometry is procedural placeholder geometry. No external models,
textures or images are used. The only external asset is the licensed
soundtrack described under Audio below.

### Characters and creatures - `src/characters/`

- `humanoid.ts` - deterministic humanoid builder from boxes and a sphere
  (skin, shirt, trousers, shoes, hair, hat, scarf, backpack), a billboard
  nameplate, and a pose driver for walk, sprint, idle breathing and an
  airborne pose. Materials are cached per scene. Amani and all five NPCs
  use this rig.
- `characters.ts` - places the five story characters at their locations and
  exposes them for proximity prompts; characters idle-animate and labels
  stay visible.
- `aliens.ts` - builds the Veyari crash scar (ring, shard, dust), the envoy
  Iri (hovering cone body, ring, tendrils), and a short cinematic trigger
  when the player first comes within 34 m. Iri turns to face the player
  within 12 m.
- `robots.ts` - six corrupted machines across five silhouettes (security,
  harvester, scout, heavy, hover), each with a waypoint route, waiting
  pauses, a per-robot red visor material, detection radius, alert state
  (turn, accelerate, pulse red) and a return to patrol beyond 1.8x the
  detection range. Exposes `nearest`, `reset` and per-frame updates.

### Navigation - `src/nav/`

- `locations.ts` - the eleven location definitions (positions, radii, copy),
  including the Veyari crash site.
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
- `flags` is a validated `Record<string, boolean>` that stores story state
  (`intro-seen`, `crash-seen`, `iri-met`, `iri-explained`, `iri-alliance`,
  `root-hint`, `ledger-hint`, `root-question`, `director-confronted`). Flags
  are saved, cleared by a new campaign and unlock extra dialogue lines.

### Dialogue and cinematics - `src/story/dialogue.ts`

- `DialogueDef` per character: speaker, role, intro lines and choices.
  Choices can carry trust, credits, a flag and a mission id; mission offers
  are filtered at open time against the current mood, prerequisites and
  board status.
- Conversation flow is intro lines, then choices, then a reply per choice,
  all advanced with E/Space/Enter or by clicking a choice. Movement and
  missions pause; the camera orbits the player.
- `INTRO_LINES` and `CRASH_LINES` are skippable cinematic scripts played
  with letterbox bars; the intro also shows an "Act I - Back to Kijani"
  chapter card. Esc skips a skippable cinematic.

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
- The story chain is prologue, tractor, water, `descend` (shaft mouth,
  5 s hold, core-tap interact), `crash-site` (cross the scar, speak at the
  wreck; sets `crash-seen`), `iri-first-contact` and `machine-census`
  (survey the solar yard, harvest field and waterworks). The three main
  story missions are no longer mood-locked; the census is offered from
  Iri's dialogue.

### Save data - `src/core/game.ts`

- Versioned `SaveData` (v1) under the `farmbot2090.save.v1` localStorage
  key: campaign state, mission progress (including hold progress), player
  or vehicle pose, hour and discovered locations.
- Loading is defensive: unknown versions or malformed payloads are
  discarded rather than half-applied.

### Audio - `src/audio/music.ts`

- `MusicPlayer` owns one looping `HTMLAudioElement` for
  `public/audio/stand-up.mp3`, the CC BY 4.0 track by Pipe Choir
  (attribution in `docs/ASSETS_AND_CREDITS.md` and on the start screen).
- Playback starts when a campaign begins or a save is continued, so the
  browser receives it inside a click gesture; if the browser still refuses
  autoplay, the next start attempt retries.
- The pause screen has a MUSIC: ON/OFF toggle; muting uses the element's
  `muted` flag and keeps the loop position. There is no volume slider and
  no sound effects.
- The track is served from `public/audio/`, so it must sit beside the
  built `index.html` for static hosts. The build copies it to
  `dist/audio/stand-up.mp3`.

### UI - `src/ui/`

- `hud.ts` - start/pause screens, quest card, compass, interaction prompt,
  speedometer, campaign chip (mood + standing), toasts, the minimap canvas,
  the dialogue panel with clickable choices, the cinematic letterbox card
  and the chapter card. Interface copy only; no gameplay state is stored
  in the DOM layer.
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
| Simulation | Farming and restoration actions, inventory and equipment, world events and long-term consequences |
| Characters | NPC schedules and roaming, combat or hacking interactions with corrupted units, mission approaches (stealth, negotiation, sabotage) |
| Atmosphere | Sound effects and voice, weather and dust storms, higher-detail character models |
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
- **One licensed soundtrack, no audio engine.** A single looping
  `HTMLAudioElement` keeps the bundle light and avoids an audio middleware
  dependency; positional sound and mixing would need a real audio engine
  later.
