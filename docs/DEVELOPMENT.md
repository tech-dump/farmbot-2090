# Development

## Prerequisites

- Node.js 20+ (tested with Node 24/26)
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
│   ├── core/              input handling and the main game loop
│   ├── player/            first-person controller
│   ├── world/             environment construction and interactables
│   ├── ui/                DOM HUD and overlays
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
3. Click **ENGAGE** and allow pointer lock.
4. Move with WASD, look with the mouse, sprint with Shift, jump with Space.
5. Walk to the research facility, the seed chamber, the irrigation pump and
   the soil stake; press **E** when a prompt appears.
6. Press **Esc** to pause, then **RESUME** to continue.
7. Resize the window and confirm the view fills the canvas.
8. Open the browser console and confirm there are no errors.
9. Run `npm run build` and `npm run preview` to verify the production build.

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
lock. This is a development-only hook for automated rendering and movement
checks; pointer lock and mouse look still need a normal browser test.

## Notes

- Pointer lock requires a user gesture. If the browser blocks the first
  request, click the game view again.
- The game currently has no audio, so no autoplay handling is needed yet.
  When licensed or owner-created audio is added, initialise the audio context
  on the first user gesture.
- The scene is deliberately dependency-light. Three.js is the only runtime
  dependency.
