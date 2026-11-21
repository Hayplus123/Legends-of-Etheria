LEGENDS OF ETHERIA — EMERALD FOREST DEMO (NO-TERMINAL VERSION)

FILES
  index.html       Main game page
  src/main.js      Game logic and 3D scene
  src/style.css    Interface and visual styling

HOW TO OPEN
  1. Keep the folder layout exactly as shown above.
  2. Double-click index.html to open the game in a modern browser.
  3. The first page load needs an internet connection because Babylon.js is
     loaded from its official browser CDN. There is no Node.js, npm, Vite,
     package installation, or terminal command required.

OPTIONAL LOCAL SERVER (NO COMMANDS)
  If your browser restricts local-file storage, install the Live Server
  extension in VS Code. Right-click index.html and choose "Open with Live
  Server". You do not need to open or type anything in a terminal.

CONTROLS
  WASD             Move
  Middle mouse     Rotate camera
  Mouse wheel      Zoom
  Space            Basic attack
  Shift            Defend
  Left click / 1   Default ability / Arcane Bolt
  Q                Healing Wave
  2                Frost Nova
  Right click      Party command panel
  Tab              Cycle enemy targets
  E                Interact
  ESC              Pause
  P while paused   Open planning table

GAMEPLAY LOOP
  Create your character at the headquarters, use the planning table, depart
  for the Emerald Forest, find Aurelia, gather crystals, defeat forest wolves,
  confront the Grove Guardian, collect the rewards and return to base.

PAUSE / BASE RULES
  The planning table can be opened from the pause menu anywhere. You may
  return to base during exploration only after escaping nearby combat.

SAVING
  The demo saves in browser storage and includes save-backup export/import
  from Inventory & Equipment. Browser private mode or clearing site data can
  remove local saves, so export a backup periodically.

GRAPHICS
  The scene uses procedural textures, layered trees, forest plants, stone
  paths, a pool, ancient ruins, detailed base buildings, character gear,
  ambient fog, real-time lighting, shadows, glow and animated fireflies.
  This is a high-detail procedural prototype. Final hand-authored or imported
  character/environment assets and bespoke animation work remain later art
  milestones; this build does not pretend they have already been completed.

NOTE
  The Babylon.js CDN is appropriate for a small learning/prototype build.
  For a public production release, vendor the Babylon.js library locally or
  serve it from a controlled asset host, as the Babylon.js project recommends.
