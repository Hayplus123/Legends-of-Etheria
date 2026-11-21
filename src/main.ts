import './style.css';
import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  Mesh, MeshBuilder, ParticleSystem, PointLight, Scene, ShadowGenerator,
  StandardMaterial, Texture, Vector3, Animation, EasingFunction, CubicEase
} from '@babylonjs/core';

type SaveData = {
  level: number; xp: number; hp: number; mana: number;
  companionRecruited: boolean; wolfDefeated: boolean;
  playerX: number; playerZ: number;
};

const SAVE_KEY = 'etheria-prototype-save-v1';
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.09, 0.085, 1);
scene.fogMode = Scene.FOGMODE_EXP;
scene.fogDensity = 0.009;
scene.fogColor = new Color3(0.19, 0.29, 0.25);
scene.collisionsEnabled = true;
scene.gravity = new Vector3(0, -0.25, 0);

const camera = new ArcRotateCamera('adventure-camera', -Math.PI / 2, 1.08, 10, new Vector3(0, 1.4, 0), scene);
camera.lowerRadiusLimit = 6;
camera.upperRadiusLimit = 15;
camera.lowerBetaLimit = 0.65;
camera.upperBetaLimit = 1.35;
camera.wheelPrecision = 45;
camera.panningSensibility = 0;
camera.attachControl(canvas, true);
camera.inputs.attached.pointers && (camera.inputs.attached.pointers.buttons = [0, 1]);
camera.inertia = 0.82;

const hemi = new HemisphericLight('forest-ambient', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.72;
hemi.groundColor = new Color3(0.19, 0.23, 0.17);
const sun = new DirectionalLight('sunlight', new Vector3(-0.45, -1, 0.3), scene);
sun.position = new Vector3(20, 35, -10);
sun.intensity = 1.25;
const shadows = new ShadowGenerator(1024, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 24;
shadows.setDarkness(0.28);

function material(name: string, diffuse: Color3, emissive = new Color3(0, 0, 0), alpha = 1): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = diffuse;
  m.emissiveColor = emissive;
  m.alpha = alpha;
  return m;
}
const grassMat = material('mossy earth', new Color3(0.19, 0.29, 0.20));
const pathMat = material('old stone path', new Color3(0.34, 0.34, 0.27));
const trunkMat = material('bark', new Color3(0.22, 0.15, 0.10));
const leafMats = [
  material('deep canopy', new Color3(0.10, 0.25, 0.17)),
  material('emerald canopy', new Color3(0.14, 0.34, 0.22)),
  material('sunlit canopy', new Color3(0.23, 0.39, 0.24))
];
const stoneMat = material('weathered stone', new Color3(0.31, 0.36, 0.32));
const crystalMat = material('ether crystal', new Color3(0.28, 0.78, 0.76), new Color3(0.10, 0.55, 0.56));
const goldMat = material('warm gold', new Color3(0.72, 0.57, 0.28), new Color3(0.18, 0.10, 0.02));
const playerMat = material('traveller cloak', new Color3(0.20, 0.32, 0.29));
const playerTrim = material('traveller trim', new Color3(0.78, 0.68, 0.42));
const skinMat = material('skin', new Color3(0.72, 0.52, 0.37));
const npcMat = material('guardian robes', new Color3(0.42, 0.49, 0.31));
const wolfMat = material('wolf fur', new Color3(0.26, 0.30, 0.28));
const eyeMat = material('eyes', new Color3(0.9, 0.55, 0.18), new Color3(0.6, 0.22, 0.02));

function addShadow(mesh: Mesh): Mesh {
  mesh.receiveShadows = true;
  shadows.addShadowCaster(mesh);
  return mesh;
}
function makeTree(x: number, z: number, scale = 1, variant = 0): void {
  const trunk = MeshBuilder.CreateCylinder('tree trunk', { height: 2.6 * scale, diameterTop: 0.34 * scale, diameterBottom: 0.62 * scale, tessellation: 7 }, scene);
  trunk.position.set(x, 1.3 * scale, z);
  trunk.material = trunkMat;
  addShadow(trunk);
  const canopy1 = MeshBuilder.CreateSphere('leaf canopy', { diameter: 2.5 * scale, segments: 6 }, scene);
  canopy1.scaling.y = 1.05;
  canopy1.position.set(x, 3.0 * scale, z);
  canopy1.material = leafMats[variant % leafMats.length];
  addShadow(canopy1);
  const canopy2 = MeshBuilder.CreateSphere('upper canopy', { diameter: 1.75 * scale, segments: 6 }, scene);
  canopy2.position.set(x + 0.18 * scale, 4.0 * scale, z - 0.12 * scale);
  canopy2.material = leafMats[(variant + 1) % leafMats.length];
  addShadow(canopy2);
}
function makeRock(x: number, z: number, scale: number): void {
  const rock = MeshBuilder.CreatePolyhedron('forest boulder', { type: 1, size: scale }, scene);
  rock.position.set(x, scale * 0.38, z);
  rock.scaling.y = 0.7;
  rock.rotation.y = x * 0.17;
  rock.material = stoneMat;
  addShadow(rock);
}
function makeCrystal(x: number, z: number, scale = 1): void {
  const c = MeshBuilder.CreatePolyhedron('ether crystal', { type: 1, size: scale }, scene);
  c.position.set(x, scale * 0.8, z);
  c.scaling.set(0.55, 1.45, 0.55);
  c.rotation.y = 0.4;
  c.material = crystalMat;
  addShadow(c);
  const glow = new PointLight('crystal glow', new Vector3(x, 1.5 * scale, z), scene);
  glow.diffuse = new Color3(0.20, 0.75, 0.72);
  glow.intensity = 0.55;
  glow.range = 6;
}

// Ground and winding stone path.
const ground = MeshBuilder.CreateGround('forest floor', { width: 90, height: 90, subdivisions: 2 }, scene);
ground.material = grassMat;
ground.checkCollisions = true;
ground.receiveShadows = true;
const path = MeshBuilder.CreateGround('winding path', { width: 5.2, height: 52, subdivisions: 1 }, scene);
path.position.set(0, 0.025, -3);
path.rotation.y = -0.13;
path.material = pathMat;
path.receiveShadows = true;

// Small patches of grass, stones and foliage give the clearing depth.
for (let i = 0; i < 54; i++) {
  const angle = i * 2.399;
  const radius = 12 + (i % 7) * 2.3;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (Math.abs(x) < 4.5 && z > -27 && z < 23) continue;
  makeTree(x, z, 0.75 + (i % 5) * 0.11, i % 3);
}
for (let i = 0; i < 24; i++) {
  const x = Math.sin(i * 7.2) * (5 + (i % 4) * 2.5);
  const z = Math.cos(i * 3.4) * (7 + (i % 3) * 3);
  makeRock(x, z, 0.45 + (i % 4) * 0.18);
}
makeCrystal(-6.8, 3.8, 0.9);
makeCrystal(7.3, -5.5, 1.1);
makeCrystal(-10, -12, 0.65);

// Fallen log and old standing stones.
const log = MeshBuilder.CreateCylinder('fallen log', { height: 5.5, diameter: 0.65, tessellation: 8 }, scene);
log.rotation.z = Math.PI / 2.2;
log.position.set(-8, 0.45, 9);
log.material = trunkMat;
addShadow(log);
for (let i = 0; i < 3; i++) {
  const pillar = MeshBuilder.CreateBox('ancient marker', { width: 0.65, height: 2.4 + i * 0.25, depth: 0.7 }, scene);
  pillar.position.set(5.8 + i * 0.85, 1.1 + i * 0.12, 13 + (i % 2) * 0.4);
  pillar.rotation.z = (i - 1) * 0.08;
  pillar.material = stoneMat;
  addShadow(pillar);
}

// Player character: a deliberately readable, modular placeholder adventurer.
const player = new Mesh('player-root', scene);
player.position.set(0, 0, 4);
const body = MeshBuilder.CreateCapsule('traveller body', { height: 1.55, radius: 0.42, tessellation: 8 }, scene);
body.parent = player;
body.position.y = 1.03;
body.material = playerMat;
addShadow(body);
const head = MeshBuilder.CreateSphere('traveller head', { diameter: 0.62, segments: 10 }, scene);
head.parent = player;
head.position.y = 2.0;
head.material = skinMat;
addShadow(head);
const hood = MeshBuilder.CreateSphere('traveller hood', { diameter: 0.72, segments: 8 }, scene);
hood.parent = player;
hood.position.set(0, 2.13, -0.12);
hood.scaling.set(1, 0.75, 0.9);
hood.material = playerTrim;
addShadow(hood);
const sword = MeshBuilder.CreateBox('traveller sword', { width: 0.12, height: 1.0, depth: 0.13 }, scene);
sword.parent = player;
sword.position.set(0.53, 1.15, 0.12);
sword.rotation.z = -0.25;
sword.material = goldMat;
addShadow(sword);
const playerLight = new PointLight('traveller glow', new Vector3(0, 2, 0), scene);
playerLight.parent = player;
playerLight.intensity = 0.18;
playerLight.range = 4;

// Wandering guardian NPC.
const guardian = new Mesh('guardian-root', scene);
guardian.position.set(4.2, 0, -2.4);
const npcBody = MeshBuilder.CreateCapsule('guardian body', { height: 1.65, radius: 0.43, tessellation: 8 }, scene);
npcBody.parent = guardian; npcBody.position.y = 1.05; npcBody.material = npcMat; addShadow(npcBody);
const npcHead = MeshBuilder.CreateSphere('guardian head', { diameter: 0.58, segments: 10 }, scene);
npcHead.parent = guardian; npcHead.position.y = 2.05; npcHead.material = skinMat; addShadow(npcHead);
const npcStaff = MeshBuilder.CreateCylinder('guardian staff', { height: 2.4, diameter: 0.09 }, scene);
npcStaff.parent = guardian; npcStaff.position.set(0.58, 1.1, 0); npcStaff.material = trunkMat; addShadow(npcStaff);
const staffCrystal = MeshBuilder.CreateSphere('staff crystal', { diameter: 0.35, segments: 8 }, scene);
staffCrystal.parent = guardian; staffCrystal.position.set(0.58, 2.35, 0); staffCrystal.material = crystalMat; addShadow(staffCrystal);
const npcHalo = MeshBuilder.CreateTorus('guardian marker', { diameter: 1.2, thickness: 0.045 }, scene);
npcHalo.parent = guardian; npcHalo.position.y = 2.8; npcHalo.rotation.x = Math.PI / 2; npcHalo.material = goldMat;

// Forest wolf enemy.
const wolf = new Mesh('wolf-root', scene);
wolf.position.set(-4.8, 0, -8);
const wolfBody = MeshBuilder.CreateSphere('wolf body', { diameter: 1.45, segments: 8 }, scene);
wolfBody.parent = wolf; wolfBody.position.y = 0.82; wolfBody.scaling.set(1.25, 0.72, 0.7); wolfBody.material = wolfMat; addShadow(wolfBody);
const wolfHead = MeshBuilder.CreateSphere('wolf head', { diameter: 0.72, segments: 8 }, scene);
wolfHead.parent = wolf; wolfHead.position.set(0, 1.05, 0.72); wolfHead.material = wolfMat; addShadow(wolfHead);
for (const side of [-1, 1]) {
  const ear = MeshBuilder.CreateCylinder('wolf ear', { height: 0.38, diameterTop: 0, diameterBottom: 0.24, tessellation: 5 }, scene);
  ear.parent = wolf; ear.position.set(side * 0.22, 1.47, 0.67); ear.rotation.z = side * -0.18; ear.material = wolfMat;
  const eye = MeshBuilder.CreateSphere('wolf eye', { diameter: 0.09 }, scene);
  eye.parent = wolf; eye.position.set(side * 0.2, 1.12, 1.02); eye.material = eyeMat;
}
for (const x of [-0.42, 0.42]) for (const z of [-0.35, 0.38]) {
  const leg = MeshBuilder.CreateCylinder('wolf leg', { height: 0.65, diameter: 0.19 }, scene);
  leg.parent = wolf; leg.position.set(x, 0.34, z); leg.material = wolfMat; addShadow(leg);
}
const wolfRing = MeshBuilder.CreateTorus('wolf target ring', { diameter: 1.6, thickness: 0.035 }, scene);
wolfRing.parent = wolf; wolfRing.position.y = 0.06; wolfRing.rotation.x = Math.PI / 2;
wolfRing.material = material('enemy marker', new Color3(0.72, 0.28, 0.19), new Color3(0.24, 0.04, 0.02));

const playerShadow = MeshBuilder.CreateDisc('player ground marker', { radius: 0.65, tessellation: 32 }, scene);
playerShadow.parent = player; playerShadow.position.y = 0.04; playerShadow.rotation.x = Math.PI / 2;
playerShadow.material = material('player ground glow', new Color3(0.55, 0.72, 0.49), new Color3(0.12, 0.2, 0.08), 0.25);

// Subtle floating motes.
const motes = new ParticleSystem('forest motes', 180, scene);
motes.particleTexture = new Texture('https://assets.babylonjs.com/textures/flare.png', scene);
motes.emitter = new Vector3(0, 1.2, 0);
motes.minEmitBox = new Vector3(-24, 0, -24);
motes.maxEmitBox = new Vector3(24, 8, 24);
motes.color1 = new Color4(0.75, 0.88, 0.58, 0.45);
motes.color2 = new Color4(0.35, 0.75, 0.68, 0.25);
motes.colorDead = new Color4(0.2, 0.35, 0.3, 0);
motes.minSize = 0.025; motes.maxSize = 0.075;
motes.minLifeTime = 3; motes.maxLifeTime = 8;
motes.emitRate = 22;
motes.minEmitPower = 0.08; motes.maxEmitPower = 0.22;
motes.updateSpeed = 0.01;
motes.start();

type RuntimeState = {
  level: number; xp: number; hp: number; mana: number;
  companionRecruited: boolean; wolfDefeated: boolean;
  attackCooldown: number; playerHitCooldown: number;
};
const state: RuntimeState = {
  level: 1, xp: 0, hp: 100, mana: 60,
  companionRecruited: false, wolfDefeated: false,
  attackCooldown: 0, playerHitCooldown: 0
};
let paused = true;
let started = false;
let worldSeconds = 0;
let toastTimer = 0;
let attackFlash = 0;
const keys = new Set<string>();
let nearby: 'guardian' | 'wolf' | null = null;
let companion: Mesh | null = null;
let companionBody: Mesh | null = null;

const $ = (id: string) => document.getElementById(id)!;
const prompt = $('interaction-prompt');
const toast = $('toast');
function showToast(message: string, duration = 3): void {
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = duration;
}
function updateObjective(title: string, detail: string): void {
  $('objective-title').textContent = title;
  $('objective-detail').textContent = detail;
}
function saveGame(): void {
  const data: SaveData = {
    level: state.level, xp: state.xp, hp: state.hp, mana: state.mana,
    companionRecruited: state.companionRecruited, wolfDefeated: state.wolfDefeated,
    playerX: player.position.x, playerZ: player.position.z
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  showToast('Adventure saved in this browser.');
}
function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<SaveData>;
    state.level = Math.max(1, Number(data.level) || 1);
    state.xp = Math.max(0, Number(data.xp) || 0);
    state.hp = Math.min(100 + (state.level - 1) * 12, Math.max(1, Number(data.hp) || 100));
    state.mana = Math.min(60 + (state.level - 1) * 5, Math.max(0, Number(data.mana) || 60));
    state.companionRecruited = Boolean(data.companionRecruited);
    state.wolfDefeated = Boolean(data.wolfDefeated);
    player.position.x = Number(data.playerX) || 0;
    player.position.z = Number(data.playerZ) || 4;
    if (state.companionRecruited) recruitGuardian(false);
    if (state.wolfDefeated) wolf.setEnabled(false);
    refreshHUD();
  } catch {
    showToast('The saved data could not be read. A fresh adventure is ready.');
  }
}
function refreshHUD(): void {
  const maxHp = 100 + (state.level - 1) * 12;
  const maxMana = 60 + (state.level - 1) * 5;
  $('level-label').textContent = `LV ${state.level}`;
  $('hp-value').textContent = `${Math.ceil(state.hp)} / ${maxHp}`;
  $('mana-value').textContent = `${Math.ceil(state.mana)} / ${maxMana}`;
  $('xp-value').textContent = `${state.xp} / ${state.level * 100}`;
  ($('hp-bar') as HTMLElement).style.width = `${Math.max(0, state.hp / maxHp * 100)}%`;
  ($('mana-bar') as HTMLElement).style.width = `${Math.max(0, state.mana / maxMana * 100)}%`;
  ($('xp-bar') as HTMLElement).style.width = `${state.xp / (state.level * 100) * 100}%`;
  $('companion-status').textContent = state.companionRecruited ? 'COMPANION: GUARDIAN' : 'COMPANION: NONE';
  $('enemy-status').textContent = state.wolfDefeated ? 'FOREST WOLF: DEFEATED' : 'FOREST WOLF: ' + (distance(player.position, wolf.position) < 9 ? 'ALERT' : 'CALM');
}
function distance(a: Vector3, b: Vector3): number {
  return Math.sqrt((a.x-b.x)**2 + (a.z-b.z)**2);
}
function recruitGuardian(showMessage = true): void {
  if (state.companionRecruited && companion) return;
  state.companionRecruited = true;
  guardian.setEnabled(false);
  companion = new Mesh('guardian-companion-root', scene);
  companion.position.copyFrom(player.position.add(new Vector3(1.5, 0, 1.5)));
  companionBody = MeshBuilder.CreateCapsule('guardian companion body', { height: 1.65, radius: 0.43, tessellation: 8 }, scene);
  companionBody.parent = companion; companionBody.position.y = 1.05; companionBody.material = npcMat; addShadow(companionBody);
  const cHead = MeshBuilder.CreateSphere('guardian companion head', { diameter: 0.58, segments: 10 }, scene);
  cHead.parent = companion; cHead.position.y = 2.05; cHead.material = skinMat; addShadow(cHead);
  const cStaff = MeshBuilder.CreateCylinder('guardian companion staff', { height: 2.2, diameter: 0.09 }, scene);
  cStaff.parent = companion; cStaff.position.set(0.58, 1.1, 0); cStaff.material = trunkMat;
  if (showMessage) {
    showToast('The guardian joins your journey. Companion recruited!');
    updateObjective('Your first ally', 'The guardian has joined you. Find the forest wolf and test your blade.');
  }
  refreshHUD();
}
function gainXP(amount: number): void {
  state.xp += amount;
  while (state.xp >= state.level * 100) {
    state.xp -= state.level * 100;
    state.level++;
    state.hp = 100 + (state.level - 1) * 12;
    state.mana = 60 + (state.level - 1) * 5;
    $('level-up-label').textContent = `Level ${state.level}`;
    $('level-up').classList.remove('hidden');
    window.setTimeout(() => $('level-up').classList.add('hidden'), 2400);
    showToast(`You reached level ${state.level}. Your health and mana increased!`, 3);
  }
  refreshHUD();
}
function attack(): void {
  if (paused || !started || state.attackCooldown > 0) return;
  state.attackCooldown = 0.58;
  attackFlash = 0.22;
  const targetDistance = distance(player.position, wolf.position);
  if (!state.wolfDefeated && targetDistance < 3.1) {
    wolf.setEnabled(false);
    state.wolfDefeated = true;
    gainXP(65);
    showToast('Forest wolf defeated · +65 XP');
    updateObjective('The clearing is safe', 'You defeated the forest wolf. Explore the clearing or save your progress.');
    saveQuietly();
    refreshHUD();
  } else {
    // A short visible swing even when no enemy is in range.
    sword.rotation.x = -0.9;
    window.setTimeout(() => { sword.rotation.x = 0; }, 180);
  }
}
function saveQuietly(): void {
  const data: SaveData = {
    level: state.level, xp: state.xp, hp: state.hp, mana: state.mana,
    companionRecruited: state.companionRecruited, wolfDefeated: state.wolfDefeated,
    playerX: player.position.x, playerZ: player.position.z
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function interact(): void {
  if (paused || !started || !nearby) return;
  if (nearby === 'guardian') {
    if (!state.companionRecruited) {
      recruitGuardian(true);
    } else {
      showToast('Guardian: “The forest remembers every footstep. Stay alert.”');
    }
  } else if (nearby === 'wolf' && !state.wolfDefeated) {
    showToast('A forest wolf blocks the path. Get close and press SPACE to attack.');
  }
}
function resetGame(): void {
  localStorage.removeItem(SAVE_KEY);
  state.level = 1; state.xp = 0; state.hp = 100; state.mana = 60;
  state.companionRecruited = false; state.wolfDefeated = false;
  player.position.set(0, 0, 4);
  guardian.setEnabled(true);
  if (companion) { companion.dispose(); companion = null; companionBody = null; }
  wolf.setEnabled(true);
  updateObjective('A quiet forest… for now.', 'Explore the clearing and meet the wandering guardian.');
  refreshHUD();
  $('pause-overlay').classList.add('hidden');
  paused = false;
  showToast('A new adventure begins.');
}
function startGame(): void {
  started = true; paused = false;
  $('start-overlay').classList.add('hidden');
  canvas.focus();
  showToast('Welcome to Etheria. The forest awaits.');
}
function setPaused(value: boolean): void {
  paused = value;
  $('pause-overlay').classList.toggle('hidden', !value);
}
$('start-button').addEventListener('click', startGame);
$('pause-button').addEventListener('click', () => setPaused(!paused));
$('resume-button').addEventListener('click', () => setPaused(false));
$('save-button').addEventListener('click', saveGame);
$('reset-button').addEventListener('click', resetGame);
window.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && started) { setPaused(!paused); return; }
  if (paused) return;
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat) attack();
  if (event.code === 'KeyE' && !event.repeat) interact();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => engine.resize());

loadGame();
camera.target = player.position.add(new Vector3(0, 1.25, 0));

let lastTime = performance.now();
engine.runRenderLoop(() => {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!paused && started) {
    worldSeconds += dt;
    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    state.playerHitCooldown = Math.max(0, state.playerHitCooldown - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toast.classList.remove('visible');
    }

    const forward = new Vector3(Math.sin(camera.alpha), 0, Math.cos(camera.alpha));
    const right = new Vector3(forward.z, 0, -forward.x);
    let move = Vector3.Zero();
    if (keys.has('KeyW')) move.addInPlace(forward);
    if (keys.has('KeyS')) move.subtractInPlace(forward);
    if (keys.has('KeyD')) move.addInPlace(right);
    if (keys.has('KeyA')) move.subtractInPlace(right);
    if (move.lengthSquared() > 0) {
      move.normalize();
      player.position.addInPlace(move.scale(5.0 * dt));
      player.rotation.y = Math.atan2(move.x, move.z);
    }
    player.position.x = Math.max(-37, Math.min(37, player.position.x));
    player.position.z = Math.max(-37, Math.min(37, player.position.z));

    // Camera follows the player while retaining mouse orbit control.
    camera.target = Vector3.Lerp(camera.target, player.position.add(new Vector3(0, 1.25, 0)), 1 - Math.pow(0.001, dt));
    if (companion) {
      const followSpot = player.position.add(new Vector3(-1.3, 0, 1.3));
      const delta = followSpot.subtract(companion.position);
      if (delta.length() > 0.2) {
        companion.position.addInPlace(delta.normalize().scale(Math.min(delta.length(), 3.8 * dt)));
        companion.rotation.y = Math.atan2(player.position.x - companion.position.x, player.position.z - companion.position.z);
      }
    }

    // Enemy approaches only after the player enters its territory.
    if (!state.wolfDefeated) {
      const d = distance(player.position, wolf.position);
      if (d < 7 && d > 1.45) {
        const direction = player.position.subtract(wolf.position); direction.y = 0; direction.normalize();
        wolf.position.addInPlace(direction.scale(1.45 * dt));
        wolf.rotation.y = Math.atan2(direction.x, direction.z);
      }
      if (d < 1.55 && state.playerHitCooldown <= 0) {
        state.hp = Math.max(0, state.hp - 7);
        state.playerHitCooldown = 1.25;
        showToast('The wolf struck you. Defeat it or move away!', 1.5);
        if (state.hp <= 0) {
          state.hp = 55;
          player.position.set(0, 0, 4);
          showToast('You were overwhelmed and returned to the forest entrance. (Prototype recovery)');
        }
        refreshHUD();
      }
    }

    nearby = null;
    let nearest = 3.0;
    if (!state.companionRecruited) {
      const d = distance(player.position, guardian.position);
      if (d < nearest) { nearest = d; nearby = 'guardian'; }
    }
    if (!state.wolfDefeated) {
      const d = distance(player.position, wolf.position);
      if (d < nearest) { nearest = d; nearby = 'wolf'; }
    }
    prompt.classList.toggle('hidden', nearby === null);
    prompt.textContent = nearby === 'guardian' ? 'E · Speak with the guardian' : 'E · Inspect the forest wolf';

    const phase = Math.floor(worldSeconds / 90) % 4;
    const labels = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
    $('world-clock').textContent = labels[phase];
    const night = phase === 3;
    sun.intensity += ((night ? 0.35 : phase === 2 ? 0.75 : 1.25) - sun.intensity) * dt * 0.15;
    hemi.intensity += ((night ? 0.28 : 0.72) - hemi.intensity) * dt * 0.1;
    scene.fogColor = night ? new Color3(0.055, 0.09, 0.13) : new Color3(0.19, 0.29, 0.25);
    scene.clearColor = night ? new Color4(0.025, 0.045, 0.075, 1) : new Color4(0.055, 0.09, 0.085, 1);

    // A light, readable attack animation.
    if (attackFlash > 0) {
      attackFlash -= dt;
      sword.rotation.x = -Math.sin((attackFlash / 0.22) * Math.PI) * 1.25;
    } else {
      sword.rotation.x += (0 - sword.rotation.x) * Math.min(1, dt * 12);
    }
    refreshHUD();
  }
  scene.render();
});

scene.onBeforeRenderObservable.add(() => {
  const t = performance.now() * 0.001;
  npcHalo.rotation.z = t * 0.65;
  staffCrystal.scaling.setAll(1 + Math.sin(t * 2.2) * 0.08);
  if (wolf.isEnabled()) wolfBody.scaling.y = 0.72 + Math.sin(t * 3) * 0.025;
});

// Prevent the browser's context menu from interrupting camera control.
canvas.addEventListener('contextmenu', event => event.preventDefault());
