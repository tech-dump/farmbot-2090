# Testing

These results are from 2026-11-23 and apply to the Babylon.js build with the
campaign, mission board and save systems. The earlier Three.js Stage 1
results are superseded; that build is preserved on the
`backup/threejs-stage1` branch.

## Environment

- The Qoder in-app preview browser has WebGL disabled, so the game cannot
  render there. This is an environment limitation, not a game bug. Use a
  normal browser tab.
- Automated checks ran in headless Google Chrome (new headless mode) at
  1440 x 980 with software rendering, driven over the DevTools protocol.
- A headed Chrome window that is covered by another window throttled the
  render loop to about 1.8 fps in one run, so time-based checks (holding E,
  mission countdowns) could not complete. The suite now runs headless,
  where it measured 51-60 fps, and calls
  `Emulation.setFocusEmulationEnabled` and `Page.bringToFront`.
- Screenshots were captured only after the scene reported ready, and the
  run fails loudly on uncaught errors.

## Automated checks

`npm run build` (type check plus Vite production build) passes. The
campaign QA suite ran 72 checks; all 72 passed with zero console errors.

| Group | Checks | Result |
| --- | --- | --- |
| Start screen and no-save state | 2 | Pass |
| Campaign setup: six moods, four difficulties, selection summaries, BEGIN | 5 | Pass |
| Campaign start: HUD mood chip, credits, save written | 4 | Pass |
| Fresh campaign reset (no active mission) | 1 | Pass |
| Mission board: J opens, six heroic contracts, mood/difficulty note, LOCKED prerequisite, activation | 6 | Pass |
| Activation effects: board closes, HUD track and GPS target | 2 | Pass |
| Prologue: three E interactions, completion, credit and trust rewards | 6 | Pass |
| Tractor delivery: unlock, activation, enter vehicle, drive delivery, Juma hand-off, rewards | 8 | Pass |
| Hold interaction: prompt progress, completion, rewards | 5 | Pass |
| Seed Run: timer display and countdown, cargo loading, vehicle delivery, rewards, exit | 8 | Pass |
| Map/board exclusivity: M, J switches, Esc closes | 3 | Pass |
| Save/load: active mission and partial hold saved, new campaign wipe, restore of mood, standing, mission, position and HUD, finishing restored hold | 8 | Pass |
| Replay: 25% credits, no trust | 2 | Pass |
| Failure: timer expiry, one trust lost, failed HUD message | 4 | Pass |
| Autosave and clear | 2 | Pass |
| Difficulty timer scaling (420 s story vs 195 s survival) | 2 | Pass |
| Mood mission filters (mystery and survival) | 4 | Pass |

Earlier world/map/vehicle checks (walking, mouse look, driving, dusk and
night lighting, frame rate) were not re-run in full on this build. The
campaign suite did exercise vehicle entry and delivery driving through the
test API, map open/close and the HUD, with no runtime errors. The earlier
passed results for walking, dusk, night and frame rate came from the same
engine foundation before the campaign systems were added, so re-check them
with the manual script below.

## Screenshots

Captured from the real running build (in the separate `farmbot-2090-test`
QA folder, not committed to the game repository):

- `qa-camp-01-start.png` - title screen with NEW CAMPAIGN
- `qa-camp-02-setup.png` - campaign screen with six moods and four difficulties
- `qa-camp-03-selected.png` - mystery and hard selected, summary updated
- `qa-camp-04-begun.png` - campaign started with the mystery palette
- `qa-camp-05-board.png` - mission board with LOCKED tractor contract
- `qa-camp-06-mission-hud.png` - quest card, timer slot, compass and prompt
- `qa-camp-07-prologue-complete.png` - prologue rewarded
- `qa-camp-08-tractor-complete.png` - truck-delivered keys to Juma
- `qa-camp-09-hold.png` - pump coupling hold with percentage progress
- `qa-camp-10-delivery-complete.png` - seed crates delivered by tractor
- `qa-camp-11-loaded.png` - continued save with restored relay objective
- `qa-camp-12-failed.png` - contract failed after the timer ran out

## Could not be automated

- Real pointer-lock mouse capture in the QA browser (headless blocks the
  lock). Mouse look was verified through the test-mode synthetic look path.
- Pause via Escape and resume via the pause screen in a real window.
- Sprint field-of-view change and head bob feel.
- Collision behaviour at walls, the doorway and the fence.
- Jump arc.
- Audio, because the game has none yet.

The `?test=1` query parameter starts the simulation without pointer lock
and exposes `window.__farmbot` for automation. It is a development hook,
not gameplay.

## Manual test script

1. `npm run dev`, open `http://localhost:5173` in Chrome, Edge or Firefox.
2. Click **NEW CAMPAIGN**, choose a mood and difficulty, click **BEGIN**;
   confirm the pointer is captured and the HUD shows the mood.
3. Follow the objective; press **J** and accept the prologue contract.
4. Walk with WASD, sprint with Shift, jump with Space.
5. Walk to the tractor and press **E**; drive with WASD, brake with Space,
   and press **E** again to exit.
6. Complete the prologue, then accept the tractor and hold contracts;
   confirm only unlocked contracts are shown as available.
7. Press **M**; confirm the survey map opens without pausing, click a
   location, and follow the waypoint and GPS beacon.
8. Drive the Seed Run; confirm the timer counts down and the crates load
   before the delivery advances.
9. Reload the page and click **CONTINUE**; confirm campaign, mission,
   hold progress and position are restored.
10. Press **T** twice; confirm dusk and night lighting and headlights.
11. Press **Esc**; confirm pause, then **RESUME**.
12. Resize the window; confirm the canvas and HUD adapt.
13. Watch the console for errors during all of the above.
14. Run `npm run build` and `npm run preview`; repeat steps 2-12.

## Known limitations

- The environment is procedural placeholder geometry; no external models,
  textures, images or audio.
- Scripted dialogue and cutscenes, NPC schedules, inventory and equipment,
  world events, weather and audio are not implemented. Mission interactions
  are marker-based with prompt text, not conversations.
- Campaign progress is a single save slot with autosave only; there are no
  manual save slots, settings or journal.
- Collision boxes ignore height, so collidable objects act as full-height
  walls; slopes and stairs are not supported.
- The Babylon.js bundle exceeds Vite's 500 kB warning threshold. This
  affects download size, not correctness.
- FPS was measured under software rendering, not on a real GPU.
- The campaign QA run requires a focused or headless browser; an occluded
  window throttles the render loop and breaks time-based checks.

## Next milestone tests

When dialogue, NPC schedules, inventory, world events, weather and audio
exist, add tests for dialogue flow and choices, NPC schedules, item pickup
and use, event triggers and consequences, weather transitions and audio
playback. Record every result here rather than assuming a compile proves
behaviour.
