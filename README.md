# FARM BOT 2090: THE LAST SEED

A browser-based 3D farming, exploration and environmental restoration game
built for **Hack Club Harvest 2026** under the theme **BOUNCE BACK!**

**Creator and owner:** Maxwell Muthuri

## Status

Stage 1 prototype: first-person movement, the abandoned farm environment,
pointer-lock camera control, collision, and placeholder interaction prompts.
All 3D geometry is procedural placeholder geometry built from primitives.
Farming, restoration, SPROUT, missions, saving and audio are not implemented
yet and arrive in later stages.

## Technology

- TypeScript
- Three.js
- Vite
- HTML / CSS
- WebGL 2 in modern desktop browsers

No backend and no paid services are required.

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
| W / A / S / D | Move |
| Mouse | Look (after clicking ENGAGE) |
| Shift | Sprint |
| Space | Jump |
| E | Inspect the highlighted object |
| Escape | Release the mouse and pause |

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
