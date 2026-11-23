# Assets and credits

## Current assets

The current open-world prototype contains **no external art, model,
texture or font assets**, and **one licensed music track**.

The environment is built at runtime from Babylon.js primitives (boxes,
cylinders, spheres, ribbons, discs, grounds) and canvas-drawn sign textures
generated in code. These are temporary placeholders and are intended to be
replaced or supplemented with owner-created or properly licensed assets
before the final submission. No AI-generated artwork, models, textures,
music or sound effects are used.

Interface typography uses fonts already installed on the player's system
("Segoe UI" and a Cascadia Mono/Consolas fallback). No font files are
bundled.

The game has one soundtrack loop: "Stand Up" by Pipe Choir, a human-made
track released under Creative Commons Attribution 4.0 (CC BY 4.0). It is
the only audio asset; there are no sound effects, voice lines or AI-made
music. The track file is unmodified; the game only loops it and sets the
playback volume. Attribution appears on the start screen and below.

## Third-party libraries

| Library | Licence | Use |
| --- | --- | --- |
| @babylonjs/core | Apache-2.0 | 3D rendering |
| vite | MIT | Development server and build |
| typescript | Apache-2.0 | Type checking and compilation |

These libraries are installed through npm and are not copied into the
repository.

## Rules for adding assets

Before integrating any external asset:

1. Identify the creator.
2. Verify the licence permits distribution in a game, including on itch.io.
3. Record the source URL, creator, licence name and any attribution
   requirements below.
4. Do not use assets from commercial games.
5. Do not use AI-generated assets.
6. Do not describe third-party assets as original work.

## Asset register

| Asset | Type | Creator | Source | Licence | Attribution required |
| --- | --- | --- | --- | --- | --- |
| "Stand Up" (`public/audio/stand-up.mp3`) | Music | Pipe Choir | [Free Music Archive](https://freemusicarchive.org/music/Pipe_Choir/SGONS_1764/Pipe_Stand_Up) | CC BY 4.0 | Yes |

### "Stand Up" attribution

- Title: "Stand Up"
- Artist: Pipe Choir
- Source: Free Music Archive,
  <https://freemusicarchive.org/music/Pipe_Choir/SGONS_1764/Pipe_Stand_Up>
  (licence record also on Wikimedia Commons:
  <https://commons.wikimedia.org/wiki/File:Pipe_Choir_-_11_-_Stand_Up.ogg>)
- Licence: Creative Commons Attribution 4.0 International (CC BY 4.0),
  <https://creativecommons.org/licenses/by/4.0/>
- Length: 6:11; added to the Free Music Archive on 23 November 2017
- File used: the original MP3 download from the Free Music Archive
  (8,899,846 bytes), saved as `public/audio/stand-up.mp3`
- Changes: none to the audio itself. The game loops the track and plays it
  at a reduced volume (0.35). Attribution is shown on the start screen.

Attribution text: "Stand Up" by Pipe Choir is licensed under CC BY 4.0.
Source: Free Music Archive (link above).

## Licence scope

The MIT licence in the repository root covers the original project code
only. It does not relicense third-party libraries or assets.
