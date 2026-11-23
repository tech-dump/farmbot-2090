# Development

## Prerequisites

- Node.js 20+ (tested with Node 24)
- npm 10+
- A modern desktop browser with WebGL 2 (Chrome, Edge, Firefox, Safari 16+)

## Setup

```bash
cd farmbot-2090
npm install
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check with `tsc --noEmit`, then build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Project layout

```text
farmbot-2090/
├── docs/                  development, architecture, testing, assets, AI log
├── public/assets/         reserved for models, textures, audio, fonts
├── src/
│   ├── core/              constants, math, input and the main game loop
│   ├── player/            first-person controller
│   ├── vehicles/          drivable tractor and pickup
│   ├── world/             heightfield, roads, structures, collision, scene
│   ├── nav/               locations, route graph and GPS
│   ├── story/             campaign state, moods and difficulties
│   ├── missions/          mission definitions and mission manager
│   ├── ui/                HUD, campaign setup, mission board and maps
│   ├── main.ts            entry point
│   └── style.css          interface styling
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Create new modules only when a stage needs them. Avoid empty placeholder
folders.

## Manual testing

1. Run `npm run dev`.
2. Open `http://localhost:5173`.
3. Click **NEW CAMPAIGN**, pick a mood and difficulty, then **BEGIN**;
   allow pointer lock and confirm the HUD shows the mood and standing.
4. Move with WASD, look with the mouse, sprint with Shift, jump with Space.
5. Walk to the Kijani Tractor on the farm pad and press **E** to drive.
6. Drive with WASD, test Space as a handbrake, and press **E** to exit.
7. Press **J**, accept the prologue contract and follow the GPS; hold **E**
   at the marker to fill the progress ring.
8. Press **M** to open the survey map, click a location to set a waypoint,
   confirm the route and beacon, then close with **M** or **Esc**.
9. Follow the compass and minimap to the waypoint and confirm arrival.
10. Accept and complete a vehicle delivery contract; confirm credits and
    trust change and the mission leaves the board.
11. Press **T** twice to check dusk and night lighting.
12. Press **Esc** to pause, then **RESUME** to continue. Reload the page and
    click **CONTINUE**; confirm the campaign, mission and position restore.
13. Resize the window and confirm the view fills the canvas.
14. Open the browser console and confirm there are no errors.
15. Run `npm run build` and `npm run preview` to verify the production build.

Record results in [TESTING.md](TESTING.md).

## Building for itch.io

1. Run `npm run build`.
2. Zip the **contents** of `dist/` (not the `dist` folder itself) so that
   `index.html` sits at the root of the zip.
3. On itch.io create a new project, set the kind to **HTML**, and upload the
   zip.
4. Enable "This file will be played in the browser".
5. Set the viewport size (for example 1280 x 720) and test in itch.io's
   preview before publishing.

Do not publish or submit until the owner has approved the build and written
the final game description.

## Headless QA

Append `?test=1` to the dev URL to start the simulation without pointer
lock and skip the start screen. This is a development-only hook for
automated checks. It exposes `window.__farmbot`:

| Method | Purpose |
| --- | --- |
| `state()` | Position, yaw, speed, pause/map/board/setup flags, waypoint, route length, discovered locations, hour, driving id, mood, difficulty, credits, trust, completed/failed counts, active mission and objective index, mission timer, save presence |
| `teleport(x, z)` | Move the player or occupied vehicle |
| `setWaypoint(x, z, label?)` | Set a GPS waypoint |
| `setWaypointToLocation(id)` | Waypoint at a named location (`farm`, `village`, `service`, `market`, `research`, `hq`, `highway`, `water`, `solar`, `plains`) |
| `discoverAll()` | Mark all locations discovered |
| `openMap()` / `closeMap()` | Toggle the survey map |
| `enterNearest()` | Enter the nearest vehicle within 12 m |
| `campaign()` | Current campaign state object |
| `missions()` | Mission board view model |
| `newCampaign(mood, difficulty)` | Start a campaign without the UI |
| `activateMission(id)` | Accept a contract |
| `mission()` | Active mission summary (`id`, `title`, `objectiveIndex`, `objective`, `timer`, `cargo`, `track`) |
| `expireMission()` | Shorten the active mission timer to force a failure |
| `interact()` | Trigger the E interaction once |
| `save()` / `load()` | Write the autosave / continue from it |
| `clearSave()` | Remove the save and hide CONTINUE |
| `openBoard()` / `closeBoard()` | Toggle the mission board |

Headless QA must call `Emulation.setFocusEmulationEnabled` (or keep the
window focused); an unfocused window stalls the Babylon render loop and
freezes the simulation.

Mouse look in test mode still requires a real browser; headless automation
can drive movement and verify state and rendering.

## Notes

- Pointer lock requires a user gesture. If the browser blocks the first
  request, click the game view or RESUME.
- The game currently has no audio, so no autoplay handling is needed yet.
  When licensed or owner-created audio is added, initialise the audio context
  on the first user gesture.
- `@babylonjs/core` is the only runtime dependency. It is imported as
  individual tree-shakeable modules.
- The in-app preview browser may disable WebGL. If the game shows the
  "VISUAL FEED OFFLINE" screen, open the printed URL in a normal browser tab.
