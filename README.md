# FARM BOT 2090: THE LAST SEED

A browser-based 3D farming, exploration and environmental restoration game
built for **Hack Club Harvest 2026** under the theme **BOUNCE BACK!**

**Creator and owner:** Maxwell Muthuri

## Status

Open-world prototype (world, map and vehicles pass). Implemented:

- A 1.2 km x 1.2 km procedural Kijani Basin with nine named locations,
  roads, a lake, hills, vegetation and a shared heightfield.
- First-person walking, sprinting, jumping and collision.
- A drivable Kijani Tractor and Riftway Pickup with chase cameras and
  arcade terrain physics.
- Circular minimap, full-screen survey map with click-to-set waypoints,
  in-world GPS beacon, route line and compass.
- Day/night cycle (T advances time) with moving sun, moon, shadows, dusk
  ambient light, night point lights and vehicle headlights.
- Start, pause, location discovery and toast UI.

Not implemented yet: story acts and missions, NPCs and dialogue, audio and
weather, farming/restoration gameplay, save/load, settings. The game
currently uses procedural placeholder geometry only.

## Technology

- TypeScript
- Babylon.js 8
- Vite
- HTML / CSS
- WebGL 2 in modern desktop browsers

No backend and no paid services are required. No AI-generated art,
textures, models, music or sound effects are used.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Build

```bash
npm run build
```

The production build is written to `dist/`. Vite is configured with
`base: './'` so asset paths stay relative and the build can be uploaded to
itch.io as an HTML5 game.

Preview the production build with:

```bash
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Move / drive |
| Mouse | Look (after clicking ENGAGE) |
| Shift | Sprint |
| Space | Jump (on foot) / handbrake (vehicle) |
| E | Enter or exit a nearby vehicle |
| M | Open or close the world map |
| T | Advance time by two hours |
| Esc | Release the mouse and pause |
| Click (map) | Set a GPS waypoint |

## Documentation

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - setup, commands, build and upload
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - system responsibilities
- [docs/ASSETS_AND_CREDITS.md](docs/ASSETS_AND_CREDITS.md) - assets and licences
- [docs/TESTING.md](docs/TESTING.md) - test results and known limitations
- [docs/AI_USAGE_LOG.md](docs/AI_USAGE_LOG.md) - AI assistance and estimates

## Game description (owner-written)

> OWNER TODO: Write the final itch.io game description here yourself.
> This space is intentionally left blank. The final description must not be
> drafted or rewritten by an AI assistant.

## Licence

Original project source code is released under the MIT License (see
[LICENSE](LICENSE)). Third-party libraries and any future third-party assets
retain their own licences; see
[docs/ASSETS_AND_CREDITS.md](docs/ASSETS_AND_CREDITS.md). The MIT licence
does not apply to assets that are not explicitly compatible with it.
