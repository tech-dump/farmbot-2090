# Testing

All results below are from 2026-11-22 and apply to the Stage 1 build. Tests
that could not be run automatically are listed with manual steps; they are
not claimed as passing.

## Automated checks

| Check | Method | Result |
| --- | --- | --- |
| Dependency install | `npm install` | Pass |
| Type check | `tsc --noEmit` (part of `npm run build`) | Pass, no errors |
| Production build | `npm run build` | Pass, `dist/` generated |
| Relative asset paths | Inspected `dist/index.html` | Pass (`./assets/...`) |
| Bundle size | Vite report | 504.61 kB JS / 128.95 kB gzip. Vite warns that the chunk exceeds 500 kB because Three.js is bundled. Not a failure. |
| Runtime console | Headless Chrome, after start and 7.5 s of movement | 0 errors, 0 warnings |
| Scene renders | Headless Chrome screenshots at spawn, after 3 s and 7.5 s of forward movement | Pass, three distinct frames captured |
| Movement updates view | Held W via DevTools protocol | Pass, camera advanced toward the facility |
| Production preview | `npm run preview` at `localhost:4173`, headless Chrome | Pass, WebGL 2 context, scene rendered, 0 console errors |
| WebGL fallback | In-app preview browser with WebGL disabled | Fallback screen shown instead of a blank page |

### Environment note

The Qoder in-app preview browser has WebGL disabled, so the game could not
render there. This is an environment limitation, not a game bug. Headless
Google Chrome 1280 x 720 with SwiftShader was used for the rendering and
movement checks.

## Could not be automated

Headless Chrome blocked pointer lock even for a synthetic click, so the
following flows were not verified automatically:

- Mouse look after pointer lock.
- Pause via Escape and resume via the pause menu.
- Interaction prompt and the **E** inspect action.
- Sprint field-of-view change and head bob feel.
- Collision behaviour at walls, the doorway and the fence.
- Jump arc.

The `?test=1` query parameter starts the simulation without pointer lock.
It exists only to support headless rendering and movement checks.

## Manual test script

1. `npm run dev`, open `http://localhost:5173` in Chrome, Edge or Firefox.
2. Click **ENGAGE**; confirm the mouse is captured and the HUD appears.
3. Look around with the mouse; confirm movement is smooth and the pitch
   stops before flipping.
4. Walk with WASD, sprint with Shift, jump with Space.
5. Walk into the facility wall and the fence; confirm the player is stopped
   and does not pass through.
6. Walk through the doorway; press **E** at the service console and the
   preservation chamber; confirm the prompt appears and a message is shown.
7. Walk to the irrigation pump and the soil stake; confirm the same.
8. Press **Esc**; confirm the mouse is released and the pause screen opens.
9. Click **RESUME**; confirm the pointer is captured and the game continues.
10. Resize the window; confirm the canvas and HUD adapt.
11. Watch the console for errors during all of the above.
12. Run `npm run build` and `npm run preview`; repeat steps 2-10.

## Known limitations

- The environment is placeholder geometry; no textures, models or audio.
- Collision boxes ignore height, so all collidable objects act as full-height
  walls. Sloped ground, stairs and standing on crates are not supported.
- Jumping always lands on the flat ground plane.
- Pointer lock and mouse look are untested by automation in this
  environment; manual verification is required.
- The Three.js bundle exceeds Vite's 500 kB warning threshold. This affects
  download size, not correctness.

## Next milestone tests

When farming interactions exist, add tests for tilling, planting, watering,
growth stages, irrigation repair, mission completion and save/load. Record
every result here rather than assuming a compile proves behaviour.
