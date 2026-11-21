# Legends of Etheria asset pipeline

This directory is reserved for original production assets. The current prototype scene is procedurally generated in Babylon.js; this revision does not claim to contain artwork authored in the desktop art tools yet.

- **Blender:** build hero, companion, wolf, boss, tree and building models. Export models as `.glb` into `models/`. The Babylon glTF loader is included in `index.html`; `src/core/assetLoader.js` provides `E.assets.loadGLB(id, url)`.
- **Krita:** paint seamless terrain, bark, stone, cloth and UI textures as `.png` files in `textures/`.
- **Aseprite / LibreSprite:** create 2D sprite sheets for UI portraits, icons, spell indicators and particles in `sprites/`. Export a PNG atlas plus its JSON metadata.
- **Tiled:** author orthogonal or isometric region-layout data and export Tiled JSON into `maps/`. Phaser 3 has built-in support for Tiled JSON tilemaps. For the fully 3D environment, map markers and collision/encounter metadata can be translated into 3D scene positions.
- **VS Code:** edit the JavaScript systems and the asset integration code.

The `.js` source files intentionally mirror the agreed subsystem folders. They are browser-native JavaScript rather than `.ts` because direct browser execution avoids the TypeScript build/compile step and avoids requiring a terminal.
