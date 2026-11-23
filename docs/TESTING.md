# Testing

The results below are from 2026-11-23 and apply to the Babylon.js open-world
prototype (world, map, GPS and vehicles pass). The earlier Three.js Stage 1
results are superseded; that build is preserved on the
`backup/threejs-stage1` branch.

## Environment

- The Qoder in-app preview browser has WebGL disabled, so the game cannot
  render there. This is an environment limitation, not a game bug. Use a
  normal browser tab.
- Automated checks ran in headless Google Chrome at 1280 x 720 with
  SwiftShader software rendering, driven over the DevTools protocol.
- Headless Chrome throttles occluded windows, which froze the simulation.
  The QA browser was launched with background throttling and occlusion
  detection disabled, and each session called `Page.bringToFront`.
- Screenshots were captured only after `scene.isReady()` and at least one
  active mesh, after an earlier run proved screenshots taken too early can
  show an empty view.

## Automated checks

| Check | Method | Result |
| --- | --- | --- |
| Dependency install | `npm install` (Babylon.js 8.56.2) | Pass |
| Type check | `tsc --noEmit` (part of `npm run build`) | Pass, no errors |
| Production build | `npm run build` | Pass, `dist/` generated |
| Relative asset paths | Inspected `dist/index.html` | Pass (`./assets/...`) |
| Bundle size | Built output | 1,312 kB main JS chunk, about 317 kB gzipped. Vite warns the chunk exceeds 500 kB because Babylon.js is bundled. Not a failure. |
| Start screen | Headless Chrome | Title "FARM BOT 2090", ENGAGE button, canvas present, no fatal screen |
| Scene renders | Headless Chrome | 457 meshes, 40 active meshes at spawn; terrain heightfield with 40,401 vertices and vertex colours |
| Runtime console | Whole session incl. driving, map and night | 0 errors, 0 warnings |
| Movement updates view | Held W via DevTools protocol for 1 s | Pass, player moved about 8.9 m |
| Mouse look | Synthetic mouse movement | Pass, yaw changed by 0.704 rad |
| Enter vehicle | `E` near the farm tractor | Pass, state reports `driving: "Kijani Tractor"` |
| Drive vehicle | Held W for 1 s | Pass, top speed 10.35 m/s measured |
| Exit vehicle | `E` while driving | Pass, returns to on-foot state and exits at the tractor side |
| World map | `M` | Pass, map opens with the game not paused; clicking a location sets waypoint "Agricultural Research Centre" |
| GPS route | After map click | Pass, route length 498 m over the road graph |
| Dusk lighting | `T` advanced to 17.95 | Pass, warm sunset, terrain and buildings readable |
| Night lighting | `T` advanced to 19.97 | Pass, moonlit terrain, lit windows, visible GPS beacon |
| Night driving | Entered the tractor after dark | Pass, headlight and driving state verified |
| Frame rate | 90-frame probe in headless SwiftShader | 35.9 fps (software renderer; real GPU hardware will be faster) |
| Screenshots | 15 captures from the running build | `qb-01-start` through `qb-12-night-driving` |

## Screenshots

Captured from the real running build (in the separate `farmbot-2090-test`
QA folder, not committed to the game repository):

- `qb-01-start.png` - title screen, creator and AI-disclosure lines
- `qb-02-spawn.png` - spawn view at the family farm
- `qb-02b-look-down.png` - terrain close-up under the camera
- `qb-02c-nofog.png` - diagnostic fog comparison
- `qb-03-walk.png` - after walking forward
- `qb-04-vehicle.png` - tractor with readable "KIJANI FAMILY FARM" sign
- `qb-05-driving.png` - driving view with chase camera
- `qb-05b-exited.png` - on foot among the crop rows
- `qb-06-map.png` - full world map
- `qb-07-map-discovered.png` - all locations revealed
- `qb-08-map-route.png` - waypoint banner and route line
- `qb-09-gps-beacon.png` - in-world GPS beacon
- `qb-10-dusk.png` - sunset lighting
- `qb-11-night.png` - night lighting with lit windows
- `qb-12-night-driving.png` - driving at night with headlights

## Could not be automated

- Real pointer-lock mouse capture (headless Chrome blocks the lock even for
  a synthetic click). Mouse look was verified through the test-mode
  synthetic look path instead.
- Pause via Escape and resume via the pause screen.
- The interaction prompt and contextual messaging.
- Sprint field-of-view change and head bob feel.
- Collision behaviour at walls, the doorway and the fence.
- Jump arc.

The `?test=1` query parameter starts the simulation without pointer lock
and exposes `window.__farmbot` for automation. It is a development hook,
not gameplay.

## Manual test script

1. `npm run dev`, open `http://localhost:5173` in Chrome, Edge or Firefox.
2. Click **ENGAGE**; confirm the mouse is captured and the HUD appears.
3. Look around; confirm movement is smooth and the pitch stops before
   flipping.
4. Walk with WASD, sprint with Shift, jump with Space.
5. Walk to the tractor and press **E**; confirm the chase camera and
   speedometer appear. Drive with WASD, brake with Space.
6. Press **E** again; confirm you exit beside the vehicle.
7. Press **M**; confirm the survey map opens without pausing the game.
8. Click a location; confirm a waypoint, route line and top GPS banner
   appear. Close the map; follow the compass, minimap and beacon.
9. Press **T** twice; confirm dusk and night lighting, then drive at night
   and confirm the headlights.
10. Press **Esc**; confirm the pause screen opens and the pointer is
    released. Click **RESUME**; confirm the game continues.
11. Resize the window; confirm the canvas and HUD adapt.
12. Watch the console for errors during all of the above.
13. Run `npm run build` and `npm run preview`; repeat steps 2-11.

## Known limitations

- The environment is procedural placeholder geometry; no external models,
  textures, images or audio.
- Story acts, missions, NPCs, dialogue, weather, audio, farming and
  restoration gameplay, and save/load are not implemented yet. The current
  build is the world/map/vehicles foundation.
- Collision boxes ignore height, so collidable objects act as full-height
  walls; slopes and stairs are not supported.
- Mouse look and pause/resume still need manual verification in a normal
  browser.
- The Babylon.js bundle exceeds Vite's 500 kB warning threshold. This
  affects download size, not correctness.
- FPS was measured under software rendering, not on a real GPU.

## Next milestone tests

When story missions, farming interactions, NPCs, weather, audio and
save/load exist, add tests for mission start/completion, dialogue flow,
tilling, planting, watering, growth stages, weather transitions, save and
reload, and audio playback. Record every result here rather than assuming a
compile proves behaviour.
