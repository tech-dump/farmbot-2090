# Testing

These results are from 2026-11-23 and apply to the Babylon.js build with the
campaign, mission board, save, story-character, dialogue, corrupted-robot and
soundtrack systems. The earlier Three.js Stage 1 results are superseded; that
build is preserved on the `backup/threejs-stage1` branch.

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
- First-frame shader compilation in new headless Chrome stalls the render
  loop at 0.4-1 fps for roughly 10-30 s before it settles near 60 fps. Early
  runs failed when key presses and camera reads landed inside those stalls.
  The suite now (a) exposes a rendered-frame counter (`state().frames`) and
  gates key presses, camera reads and warm-up on real frames, and (b) the
  test API applies the camera immediately on a mode switch. Two QA Chrome
  instances must not overlap; they compete for CPU and each stalls.
- Screenshots were captured only after the scene reported ready, and the
  run fails loudly on uncaught errors.
- The music suite serves the production `dist/` through a small static
  server that sends correct `Content-Type`, `Content-Length` and range
  headers. The in-repo `vite preview` used for the earlier suites sends
  `.mp3` as `application/octet-stream` with chunked encoding and no
  length, which hides the track duration; that is a preview-server quirk,
  not a game behaviour. Audio playback and metadata decode correctly on
  the standards-compliant server.
- On a busy machine the headless scene ran at about 18 fps for the
  re-runs below (the earlier runs measured 51-60 fps). Key presses,
  mission checks and hold windows in the QA scripts are now gated on
  rendered frames or on a state predicate instead of wall-clock sleeps, so
  the suites still pass at that frame rate. Low-fps wall-clock input was
  the cause of earlier red runs, not a gameplay regression.

## Automated checks

`npm run build` (type check plus Vite production build) passes. The
campaign QA suite ran 72 checks; all 72 passed with zero console errors.
The story/character QA suite ran 54 checks; all 54 passed with zero console
errors, including a full story playthrough paid at 1,750 credits and 77
trust. After the soundtrack was added, all three suites were re-run against
the built `dist/`: campaign 72/72, story 54/54 and the new audio suite
21/21, with no console errors.

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

Audio suite (21 checks, new):

| Group | Checks | Result |
| --- | --- | --- |
| Track served with MPEG type and full length | 3 | Pass |
| Idle before campaign, source points at the track | 2 | Pass |
| Campaign start begins playback, no error, volume 0.35 | 4 | Pass |
| Metadata decode: readyState 4 and 6:11 duration | 2 | Pass |
| Playback clock advances | 1 | Pass |
| API mute, pause-screen button label and unmute | 4 | Pass |
| Muted playback keeps running and the clock advances | 2 | Pass |
| Start-screen Pipe Choir / CC BY 4.0 credit | 1 | Pass |
| No uncaught exceptions | 1 | Pass |

The audio checks were run with Chrome's autoplay policy relaxed so an API
call could start playback; in normal play the click on BEGIN or CONTINUE
supplies the gesture. Headless Chrome has no audio output device, so this
verifies decoding, playback state, the clock and the mute path, not
audible quality.

Story/character suite (54 checks):

| Group | Checks | Result |
| --- | --- | --- |
| Cast and props: five characters, nameplates, Amani body, third-person default, six robots, Iri | 7 | Pass |
| Camera: third-person distance, first-person hidden body and eye position | 3 | Pass |
| Wanjiku dialogue: E opens, movement blocked, three lines to choices, mystery filters one, choice starts Seed Run and raises trust, reply and close | 9 | Pass |
| Seed Run through dialogue: crates load at the barn, delivery to Greenline | 2 | Pass |
| Sifa dialogue: three mystery choices, ROOT flag | 2 | Pass |
| Robots: patrol movement, alert in detection range, return to patrol | 3 | Pass |
| Story chain: prologue, tractor, water hold, descent reach/hold/tap, crash cinematic, `crash-seen`, discovery, envoy mission | 11 | Pass |
| Iri: conversation opens, three choices, alliance flag and mission, census completion | 5 | Pass |
| Rewards: 1,750 credits and 77 trust after the chain | 3 | Pass |
| Persistence: save flags/completions, new campaign wipes, load restores both | 5 | Pass |
| Intro: chapter card (Act I), cinematic, skip records `intro-seen`, overlay closes | 4 | Pass |

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

Story/character suite:

- `qa-story-01-third-person.png` - Amani in third person beside the tractor
- `qa-story-02-first-person.png` - V toggle to first person, body hidden
- `qa-story-03-dialogue.png` - Wanjiku dialogue panel and nameplate
- `qa-story-04-choices.png` - two mystery-filtered dialogue choices
- `qa-story-05-crash-cinematic.png` - letterboxed crash-site cinematic
- `qa-story-06-iri-dialogue.png` - Iri at the wreck with three choices
- `qa-story-07-story-complete.png` - census complete, 1,750 CR, TRUST 77
- `qa-story-08-intro.png` - Act I chapter card over the intro cinematic

Audio suite:

- `qa-audio-01-start.png` - title screen with the Pipe Choir CC BY credit

## Could not be automated

- Real pointer-lock mouse capture in the QA browser (headless blocks the
  lock). Mouse look was verified through the test-mode synthetic look path.
- Pause via Escape and resume via the pause screen in a real window.
- Sprint field-of-view change and head bob feel.
- Collision behaviour at walls, the doorway and the fence.
- Jump arc.
- Audible music quality or loudness on real speakers. Headless Chrome has
  no output device; the suite verifies decode, playback state, the clock
  and mute instead. A real browser run is still the only way to judge the
  mix.
- Third-person camera feel and wall clipping in a real window; dialogue
  readability at different resolutions; whether the procedural characters
  read clearly at gameplay distance. These were checked only through
  screenshots in headless Chrome.

The `?test=1` query parameter starts the simulation without pointer lock
and exposes `window.__farmbot` for automation. It is a development hook,
not gameplay.

## Manual test script

1. `npm run dev`, open `http://localhost:5173` in Chrome, Edge or Firefox.
2. Click **NEW CAMPAIGN**, choose a mood and difficulty, click **BEGIN**;
   confirm the pointer is captured, the HUD shows the mood and the
   soundtrack starts. The start screen credit must read "Stand Up by Pipe
   Choir · CC BY 4.0".
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
11. Press **Esc**; confirm pause. Toggle **MUSIC: OFF** and back to
    **MUSIC: ON**, then **RESUME**.
12. Resize the window; confirm the canvas and HUD adapt.
13. Watch the console for errors during all of the above.
14. Run `npm run build` and `npm run preview`; repeat steps 2-12.
15. Press **V**; confirm the camera pulls back behind Amani, that walking
    and sprinting animate the body, and that pressing **V** again returns
    to the eyes and hides the body.
16. Walk to Wanjiku at Greenline Market and press **E**; confirm three
    lines, then choices, then number-key and mouse selection, trust and a
    new contract.
17. Accept Iri's chain after the descent, drive or walk east to the crash
    scar, confirm the cinematic and `crash-seen` behaviour, then talk to
    Iri and complete the machine census. Confirm the intro chapter card
    plays on a fresh campaign and skips with Esc.
18. Approach the solar yard and confirm a corrupted unit patrols, turns
    red alert when close and resumes patrol after leaving.

## Known limitations

- The environment is procedural placeholder geometry; no external models,
  textures or images. The one external asset is the credited soundtrack.
- Dialogue is a DOM panel with typed text, not voiced audio; NPCs do not
  walk schedules or follow the player. Mission interactions are still
  marker-based, and dialogue is a separate system from mission objectives.
- Corrupted robots patrol and alert, but there is no combat, hacking or
  damage; alerting one only turns it red and slows it.
- The third-person camera clamps above the terrain but does not raycast
  against buildings, so it can clip through walls.
- Weather, inventory and equipment, and alternative mission approaches
  (stealth, negotiation, sabotage) are not implemented. Map filters and a
  settings screen are not implemented.
- Audio is one looping music track with an on/off toggle: no sound
  effects, no voice, no volume slider and no positional audio. Browsers
  that block programmatic playback would need the player to click BEGIN or
  CONTINUE again.
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

When NPC schedules, inventory, world events, weather, sound effects and
voice exist, add tests for NPC schedules, item pickup and use, event
triggers and consequences, weather transitions and non-music audio
playback. Music playback is already covered by the audio suite above.
Record every result here rather than assuming a compile proves behaviour.
