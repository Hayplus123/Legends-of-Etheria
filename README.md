# Legends of Etheria — Prototype 0.1

A first playable browser prototype of the Emerald Forest, built with **TypeScript, Vite and Babylon.js**.

## What is included

- A real-time 3D forest clearing with a winding path, trees, rocks, ancient markers, glowing Ether crystals, fog, lighting and floating motes.
- A third-person orbit camera. Drag with the mouse to rotate; use the wheel to zoom.
- A controllable adventurer with WASD movement.
- A guardian NPC who can be recruited as a companion.
- A forest wolf that approaches when you enter its territory.
- A basic melee attack, health, mana, XP and level progression.
- A day/evening/night lighting cycle.
- Save and load using this browser's local storage.
- Pause, resume and reset controls.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local address Vite prints (usually `http://localhost:5173`).

## Build for hosting

```bash
npm run build
```

Vite creates the production site in the `dist` folder. For GitHub Pages, publish the contents of `dist` using your preferred Pages workflow. This project uses a relative Vite base path so it can be hosted from a repository subpath.

## Controls

| Input | Action |
|---|---|
| W A S D | Move |
| Mouse drag | Rotate camera |
| Mouse wheel | Zoom |
| Space | Basic sword attack |
| E | Interact with nearby character or enemy |
| Esc | Pause / resume |

## Prototype notes

This is a foundation, not the finished art or full RPG systems. Characters are currently assembled from 3D primitive meshes so that the game is genuinely playable before final GLB character and environment assets are integrated. The guardian is a recruitable follower; advanced party commands, class abilities, full combat AI, quests, dungeons, equipment, and the complete base are planned for later milestones.

The floating forest particle texture is loaded from Babylon.js public sample assets, so an internet connection is required for that one visual effect. The rest of the prototype runs locally after npm dependencies have been installed.
