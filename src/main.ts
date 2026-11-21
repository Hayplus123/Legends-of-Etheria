import './style.css';
import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  Mesh, MeshBuilder, PointLight, Scene, ShadowGenerator, StandardMaterial, TransformNode, Vector3
} from '@babylonjs/core';

// -----------------------------------------------------------------------------
// Legends of Etheria — Emerald Forest Complete Demo
// -----------------------------------------------------------------------------

type Zone = 'base' | 'forest';
type Role = 'Knight' | 'Archer' | 'Healer';
type PartyCommand = 'follow' | 'attack' | 'hold' | 'defend' | 'advance';
type AbilityId = 'arcane' | 'heal' | 'nova';
type EnemyKind = 'wolf' | 'boss';
type InteractableKind = 'planning' | 'bed' | 'hospital' | 'blacksmith' | 'barracks' | 'guardian' | 'crystal';

interface CharacterModel { root: TransformNode; body: Mesh; head: Mesh; weapon: Mesh; }
interface Companion {
  id: string; name: string; role: Role; model: CharacterModel; active: boolean; recruited: boolean;
  hp: number; maxHp: number; attackTimer: number; healTimer: number; recovering: boolean; recoverTimer: number;
}
interface Enemy {
  id: number; kind: EnemyKind; root: TransformNode; body: Mesh; hp: number; maxHp: number;
  speed: number; damage: number; attackTimer: number; specialTimer: number; dead: boolean; aggro: number;
}
interface Interactable { kind: InteractableKind; label: string; position: Vector3; mesh: Mesh | TransformNode; collected?: boolean; }
interface Projectile { mesh: Mesh; from: Vector3; to: Vector3; age: number; duration: number; damage: number; target: Enemy | null; }
interface SaveData {
  version: number; playerName: string; playerClass: string; appearance: string; level: number; xp: number; hp: number; mana: number;
  gold: number; crystals: number; tokens: number; weaponLevel: number; wolfKills: number; bossDefeated: boolean;
  aureliaRecruited: boolean; partyActive: Record<string, boolean>; formation: string; strategy: string; command: PartyCommand;
  zone: Zone; playerX: number; playerZ: number; worldMinutes: number; weatherIndex: number; collectedCrystalIds: string[];
}

const SAVE_KEY = 'legends-of-etheria-demo-save-v2';
const DB_NAME = 'LegendsOfEtheriaSaves';
const DB_STORE = 'game';
const $ = (id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required interface element: #${id}`);
  return element;
};
const canvas = $('game-canvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { antialias: true, stencil: true, preserveDrawingBuffer: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.09, 0.075, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.0065;
scene.fogColor = new Color3(0.17, 0.27, 0.21);

const camera = new ArcRotateCamera('adventure-camera', -Math.PI / 2, 1.05, 12, new Vector3(80, 1.2, 72), scene);
camera.lowerRadiusLimit = 7;
camera.upperRadiusLimit = 18;
camera.lowerBetaLimit = 0.48;
camera.upperBetaLimit = 1.42;
camera.wheelPrecision = 42;
camera.panningSensibility = 0;
camera.inertia = 0.78;
camera.attachControl(canvas, true);
if (camera.inputs.attached.pointers) camera.inputs.attached.pointers.buttons = [1]; // middle mouse rotates; left/right are game actions

const ambient = new HemisphericLight('forest-ambient', new Vector3(0, 1, 0), scene);
ambient.intensity = 0.78;
ambient.groundColor = new Color3(0.16, 0.22, 0.16);
const sunlight = new DirectionalLight('world-sun', new Vector3(-0.5, -1, 0.28), scene);
sunlight.position = new Vector3(35, 45, -25);
sunlight.intensity = 1.2;
const shadows = new ShadowGenerator(1024, sunlight);
shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 22; shadows.setDarkness(0.32);
function addShadow(mesh: Mesh): Mesh { mesh.receiveShadows = true; shadows.addShadowCaster(mesh); return mesh; }
const glowLight = new PointLight('base-lantern-light', new Vector3(80, 5, 80), scene);
glowLight.diffuse = new Color3(0.86, 0.72, 0.43);
glowLight.intensity = 0.28;
glowLight.range = 18;

const mat = (name: string, color: Color3, emissive = new Color3(0, 0, 0), alpha = 1): StandardMaterial => {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color; material.emissiveColor = emissive; material.alpha = alpha;
  return material;
};
const materials = {
  grass: mat('moss and grass', new Color3(0.17, 0.29, 0.19)),
  grassLight: mat('sunlit moss', new Color3(0.25, 0.36, 0.22)),
  path: mat('old stone path', new Color3(0.36, 0.36, 0.29)),
  bark: mat('warm bark', new Color3(0.25, 0.16, 0.10)),
  leaves: [mat('deep forest leaves', new Color3(0.08, 0.22, 0.15)), mat('emerald leaves', new Color3(0.12, 0.34, 0.21)), mat('sunlit leaves', new Color3(0.22, 0.39, 0.24))],
  stone: mat('weathered stone', new Color3(0.35, 0.39, 0.35)),
  paleStone: mat('pale old stone', new Color3(0.49, 0.49, 0.39)),
  crystal: mat('ether crystal', new Color3(0.28, 0.83, 0.82), new Color3(0.10, 0.52, 0.54)),
  gold: mat('old gold', new Color3(0.78, 0.65, 0.34), new Color3(0.16, 0.09, 0.02)),
  skin: mat('character skin', new Color3(0.72, 0.53, 0.39)),
  enemy: mat('wolf fur', new Color3(0.29, 0.32, 0.29)),
  enemyDark: mat('wolf dark fur', new Color3(0.15, 0.19, 0.17)),
  enemyEye: mat('wolf amber eyes', new Color3(0.96, 0.52, 0.12), new Color3(0.56, 0.19, 0.02)),
  house: mat('base timber', new Color3(0.33, 0.23, 0.15)),
  roof: mat('roof slate', new Color3(0.18, 0.26, 0.22)),
  cloth: mat('banner cloth', new Color3(0.47, 0.18, 0.16)),
  fire: mat('warm magic', new Color3(1, 0.56, 0.19), new Color3(0.8, 0.23, 0.04)),
  ice: mat('frost magic', new Color3(0.42, 0.88, 1), new Color3(0.15, 0.55, 0.85)),
  heal: mat('healing magic', new Color3(0.55, 0.94, 0.64), new Color3(0.18, 0.65, 0.32))
};

function makeTree(x: number, z: number, scale = 1, variant = 0): void {
  const trunk = MeshBuilder.CreateCylinder('tree trunk', { height: 2.7 * scale, diameterTop: 0.28 * scale, diameterBottom: 0.62 * scale, tessellation: 7 }, scene);
  trunk.position.set(x, 1.35 * scale, z); trunk.material = materials.bark; addShadow(trunk);
  const lower = MeshBuilder.CreateSphere('canopy lower', { diameter: 2.65 * scale, segments: 7 }, scene);
  lower.position.set(x, 3.05 * scale, z); lower.scaling.y = 1.08; lower.material = materials.leaves[variant % 3]; addShadow(lower);
  const upper = MeshBuilder.CreateSphere('canopy upper', { diameter: 1.9 * scale, segments: 7 }, scene);
  upper.position.set(x + 0.16 * scale, 4.1 * scale, z - 0.1 * scale); upper.material = materials.leaves[(variant + 1) % 3]; addShadow(upper);
}
function makeRock(x: number, z: number, size: number): Mesh {
  const rock = MeshBuilder.CreatePolyhedron('forest boulder', { type: 1, size }, scene);
  rock.position.set(x, size * 0.38, z); rock.scaling.y = 0.68; rock.rotation.y = x * 0.19; rock.material = materials.stone; addShadow(rock);
  return rock;
}
function makeCrystalMesh(x: number, z: number, size = 1): Mesh {
  const crystal = MeshBuilder.CreatePolyhedron('ether crystal cluster', { type: 1, size }, scene);
  crystal.position.set(x, size * 0.82, z); crystal.scaling.set(0.55, 1.42, 0.55); crystal.rotation.y = x * 0.1;
  crystal.material = materials.crystal; addShadow(crystal);
  const light = new PointLight('ether crystal glow', new Vector3(x, 1.5 * size, z), scene);
  light.diffuse = new Color3(0.17, 0.78, 0.78); light.intensity = 0.5; light.range = 6;
  return crystal;
}
function makeBuilding(name: string, x: number, z: number, width: number, depth: number, height: number, roofColor = materials.roof): Mesh {
  const building = MeshBuilder.CreateBox(`${name} building`, { width, height, depth }, scene);
  building.position.set(x, height / 2, z); building.material = materials.house; addShadow(building);
  const roof = MeshBuilder.CreateCylinder(`${name} roof`, { height: Math.max(width, depth) * 0.82, diameter: Math.max(width, depth) * 1.16, tessellation: 4 }, scene);
  roof.rotation.y = Math.PI / 4; roof.position.set(x, height + Math.max(width, depth) * 0.29, z); roof.material = roofColor; addShadow(roof);
  const door = MeshBuilder.CreateBox(`${name} door`, { width: 0.9, height: 1.8, depth: 0.12 }, scene);
  door.position.set(x, 0.9, z - depth / 2 - 0.07); door.material = materials.bark; addShadow(door);
  return building;
}
function makeCharacter(name: string, outfit: StandardMaterial, weaponMaterial = materials.gold, size = 1): CharacterModel {
  const root = new TransformNode(`${name}-root`, scene);
  const body = MeshBuilder.CreateCapsule(`${name}-body`, { height: 1.55 * size, radius: 0.4 * size, tessellation: 9 }, scene);
  body.parent = root; body.position.y = 0.98 * size; body.material = outfit; addShadow(body);
  const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.56 * size, segments: 10 }, scene);
  head.parent = root; head.position.y = 1.95 * size; head.material = materials.skin; addShadow(head);
  const shoulder = MeshBuilder.CreateSphere(`${name}-shoulder-cloak`, { diameter: 0.85 * size, segments: 8 }, scene);
  shoulder.parent = root; shoulder.position.set(0, 1.4 * size, -0.13 * size); shoulder.scaling.set(1, 0.55, 0.72); shoulder.material = outfit; addShadow(shoulder);
  const weapon = MeshBuilder.CreateBox(`${name}-weapon`, { width: 0.12 * size, height: 0.95 * size, depth: 0.13 * size }, scene);
  weapon.parent = root; weapon.position.set(0.52 * size, 1.08 * size, 0.05); weapon.rotation.z = -0.25; weapon.material = weaponMaterial; addShadow(weapon);
  const feet = MeshBuilder.CreateBox(`${name}-boots`, { width: 0.58 * size, height: 0.22 * size, depth: 0.45 * size }, scene);
  feet.parent = root; feet.position.set(0, 0.14 * size, 0.02); feet.material = materials.bark; addShadow(feet);
  return { root, body, head, weapon };
}
function makeInteractableMarker(position: Vector3, color: StandardMaterial): Mesh {
  const marker = MeshBuilder.CreateTorus('interaction marker', { diameter: 1.05, thickness: 0.055, tessellation: 24 }, scene);
  marker.position.copyFrom(position); marker.position.y = 0.07; marker.rotation.x = Math.PI / 2; marker.material = color;
  return marker;
}

// Two physical areas are laid out in the same 3D world: the home base and one forest region.
const forestGround = MeshBuilder.CreateGround('emerald forest floor', { width: 74, height: 74, subdivisions: 3 }, scene);
forestGround.material = materials.grass; forestGround.position.set(0, 0, -3); forestGround.receiveShadows = true;
const forestPath = MeshBuilder.CreateGround('forest stone path', { width: 5.5, height: 48 }, scene);
forestPath.position.set(0, 0.025, -5); forestPath.rotation.y = -0.12; forestPath.material = materials.path; forestPath.receiveShadows = true;
for (let i = 0; i < 70; i++) {
  const angle = i * 2.399;
  const radius = 13 + (i % 7) * 2.55;
  const x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius - 3;
  if (Math.abs(x) < 5.5 && z > -28 && z < 20) continue;
  makeTree(x, z, 0.72 + (i % 5) * 0.12, i % 3);
}
for (let i = 0; i < 28; i++) makeRock(Math.sin(i * 7.2) * (5 + (i % 4) * 2.4), Math.cos(i * 3.4) * (8 + (i % 3) * 3) - 2, 0.42 + (i % 4) * 0.16);
const forestCrystalMeshes = [makeCrystalMesh(-7.8, 4.5, 0.9), makeCrystalMesh(9.1, 1.8, 1.0), makeCrystalMesh(-10.5, -15.8, 0.75)];
for (let i = 0; i < 4; i++) {
  const stone = MeshBuilder.CreateBox('ancient forest marker', { width: 0.65, height: 2.2 + i * 0.12, depth: 0.7 }, scene);
  stone.position.set(6.3 + i * 0.88, 1.1, 13 + (i % 2) * 0.4); stone.rotation.z = (i - 1.5) * 0.06; stone.material = materials.paleStone;
}
const fallenLog = MeshBuilder.CreateCylinder('fallen forest log', { height: 5.8, diameter: 0.65, tessellation: 8 }, scene);
fallenLog.position.set(-9, 0.43, 8); fallenLog.rotation.z = Math.PI / 2.15; fallenLog.material = materials.bark;

// Home base: a small but explorable headquarters with distinct places to use.
const baseCenter = new Vector3(80, 0, 80);
const baseGround = MeshBuilder.CreateGround('headquarters grounds', { width: 48, height: 48, subdivisions: 2 }, scene);
baseGround.position.copyFrom(baseCenter); baseGround.material = materials.grassLight; baseGround.receiveShadows = true;
const baseCourtyard = MeshBuilder.CreateGround('base courtyard', { width: 15, height: 15 }, scene);
baseCourtyard.position.set(80, 0.03, 79); baseCourtyard.material = materials.path; baseCourtyard.receiveShadows = true;
makeBuilding('Headquarters', 80, 89, 8, 6, 4.2);
makeBuilding('Hospital', 68, 84, 5, 5, 3.2);
makeBuilding('Blacksmith', 92, 84, 5.5, 5, 3.3, materials.cloth);
makeBuilding('Barracks', 68, 70, 5.5, 5.5, 3.2);
makeBuilding('Library', 92, 70, 5, 5.5, 3.5);
// Lanterns and flags make the camp readable at night.
for (const [x, z] of [[73, 78], [87, 78], [73, 91], [87, 91], [80, 69]] as number[][]) {
  const pole = MeshBuilder.CreateCylinder('camp lantern pole', { height: 3, diameter: 0.12 }, scene);
  pole.position.set(x, 1.5, z); pole.material = materials.bark;
  const lamp = MeshBuilder.CreateSphere('camp lantern', { diameter: 0.34, segments: 8 }, scene);
  lamp.position.set(x, 3.05, z); lamp.material = materials.gold;
  const light = new PointLight('camp lantern glow', new Vector3(x, 3, z), scene);
  light.diffuse = new Color3(1, 0.72, 0.35); light.intensity = 0.35; light.range = 7;
}
const planningTable = MeshBuilder.CreateBox('planning table', { width: 2.7, height: 0.32, depth: 1.7 }, scene);
planningTable.position.set(80, 1.05, 78); planningTable.material = materials.house;
for (const [x, z] of [[78.9, 77.5], [81.1, 77.5], [78.9, 78.5], [81.1, 78.5]] as number[][]) {
  const leg = MeshBuilder.CreateCylinder('planning table leg', { height: 1.0, diameter: 0.16 }, scene);
  leg.position.set(x, 0.5, z); leg.material = materials.bark;
}
const mapBoard = MeshBuilder.CreateBox('planning map board', { width: 1.65, height: 0.045, depth: 0.95 }, scene);
mapBoard.position.set(80, 1.25, 78); mapBoard.material = materials.grassLight;
const planningMarker = makeInteractableMarker(new Vector3(80, 0.08, 78), materials.gold);
const bedBase = MeshBuilder.CreateBox('healing bed', { width: 2.1, height: 0.45, depth: 1.1 }, scene);
bedBase.position.set(80, 0.45, 91); bedBase.material = materials.paleStone;
const bedCover = MeshBuilder.CreateBox('healing bed blanket', { width: 2.0, height: 0.12, depth: 0.95 }, scene);
bedCover.position.set(80, 0.75, 91); bedCover.material = materials.cloth;

// Characters and companion roster.
let playerName = 'Wayfarer';
let playerClass = 'warrior';
let appearance = 'emerald';
const playerOutfit = mat('player outfit', new Color3(0.18, 0.36, 0.28));
const player = makeCharacter('player', playerOutfit, materials.gold, 1);
player.root.position.set(80, 0, 73);
const reaphel = makeCharacter('Reaphel', mat('Reaphel knight armour', new Color3(0.34, 0.42, 0.48)), materials.gold, 1.02);
reaphel.root.position.set(78, 0, 72);
const sylva = makeCharacter('Sylva', mat('Sylva ranger cloak', new Color3(0.34, 0.42, 0.24)), materials.bark, 0.98);
sylva.root.position.set(82, 0, 72);
const aureliaModel = makeCharacter('Aurelia', mat('Aurelia healer robes', new Color3(0.42, 0.49, 0.34)), materials.crystal, 1);
aureliaModel.root.position.set(3.5, 0, -3.8); aureliaModel.root.setEnabled(false);
const guardianNPC = makeCharacter('Forest Guardian', mat('forest guardian cloak', new Color3(0.42, 0.48, 0.30)), materials.crystal, 1.02);
guardianNPC.root.position.set(4.5, 0, -3.5);
const guardianStaffCrystal = MeshBuilder.CreateSphere('guardian staff crystal', { diameter: 0.35, segments: 8 }, scene);
guardianStaffCrystal.parent = guardianNPC.root; guardianStaffCrystal.position.set(0.56, 2.05, 0); guardianStaffCrystal.material = materials.crystal;
const guardianMarker = MeshBuilder.CreateTorus('guardian recruit marker', { diameter: 1.15, thickness: 0.045 }, scene);
guardianMarker.parent = guardianNPC.root; guardianMarker.position.y = 2.75; guardianMarker.rotation.x = Math.PI / 2; guardianMarker.material = materials.gold;

const companions: Companion[] = [
  { id: 'reaphel', name: 'Reaphel', role: 'Knight', model: reaphel, active: true, recruited: true, hp: 135, maxHp: 135, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 },
  { id: 'sylva', name: 'Sylva', role: 'Archer', model: sylva, active: true, recruited: true, hp: 90, maxHp: 90, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 },
  { id: 'aurelia', name: 'Aurelia', role: 'Healer', model: aureliaModel, active: false, recruited: false, hp: 95, maxHp: 95, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 }
];

// Runtime state.
const state = {
  zone: 'base' as Zone, started: false, paused: true, level: 1, xp: 0, hp: 120, mana: 80,
  gold: 100, crystals: 0, tokens: 0, weaponLevel: 1, wolfKills: 0, bossUnlocked: false, bossDefeated: false,
  aureliaRecruited: false, formation: 'balanced', strategy: 'protect', command: 'follow' as PartyCommand,
  worldMinutes: 9 * 60, weatherIndex: 0, combatTimer: 0, attackCooldown: 0, defend: false,
  defaultAbility: 'arcane' as AbilityId, abilityCooldowns: { arcane: 0, heal: 0, nova: 0 },
  crystalsCollected: new Set<string>(), questComplete: false, nightSpawned: false, randomEventTimer: 0,
  playerDamageFlash: 0, stepTime: 0, lastSaveTime: 0
};
const weatherNames = ['CLEAR', 'RAIN', 'MIST'];
let weatherTimer = 0;
let toastTimer = 0;
let nearby: Interactable | null = null;
let planningFromPaused = false;
let inventoryFromPaused = false;
let settingsFromPaused = false;
let currentTarget: Enemy | null = null;
let enemies: Enemy[] = [];
let interactables: Interactable[] = [];
let projectiles: Projectile[] = [];
let enemyId = 0;
const keys = new Set<string>();

function createInteractables(): void {
  interactables = [
    { kind: 'planning', label: 'Use planning table', position: new Vector3(80, 0, 78), mesh: planningTable },
    { kind: 'bed', label: 'Sleep until morning', position: new Vector3(80, 0, 91), mesh: bedBase },
    { kind: 'hospital', label: 'Visit the hospital', position: new Vector3(68, 0, 84), mesh: baseGround },
    { kind: 'blacksmith', label: 'Visit the blacksmith', position: new Vector3(92, 0, 84), mesh: baseGround },
    { kind: 'barracks', label: 'Manage your party', position: new Vector3(68, 0, 70), mesh: baseGround },
    { kind: 'guardian', label: 'Speak with Aurelia', position: new Vector3(4.5, 0, -3.5), mesh: guardianNPC.root },
    { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-7.8, 0, 4.5), mesh: forestCrystalMeshes[0] },
    { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(9.1, 0, 1.8), mesh: forestCrystalMeshes[1] },
    { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-10.5, 0, -15.8), mesh: forestCrystalMeshes[2] }
  ];
}

function addWolf(position: Vector3, stronger = false): Enemy {
  const root = new TransformNode(`wolf-${++enemyId}`, scene); root.position.copyFrom(position);
  const body = MeshBuilder.CreateSphere('forest wolf body', { diameter: stronger ? 1.75 : 1.38, segments: 8 }, scene);
  body.parent = root; body.position.y = 0.82; body.scaling.set(1.2, 0.72, 0.72); body.material = stronger ? materials.enemyDark : materials.enemy; addShadow(body);
  const head = MeshBuilder.CreateSphere('forest wolf head', { diameter: 0.66, segments: 8 }, scene);
  head.parent = root; head.position.set(0, 1.08, 0.72); head.material = body.material;
  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCylinder('wolf ear', { height: 0.36, diameterTop: 0, diameterBottom: 0.23, tessellation: 5 }, scene);
    ear.parent = root; ear.position.set(side * 0.21, 1.42, 0.68); ear.material = body.material;
    const eye = MeshBuilder.CreateSphere('wolf eye', { diameter: 0.085 }, scene);
    eye.parent = root; eye.position.set(side * 0.18, 1.1, 1.02); eye.material = materials.enemyEye;
  }
  for (const x of [-0.4, 0.4]) for (const z of [-0.32, 0.35]) {
    const leg = MeshBuilder.CreateCylinder('wolf leg', { height: 0.62, diameter: 0.18 }, scene);
    leg.parent = root; leg.position.set(x, 0.34, z); leg.material = body.material;
  }
  const ring = MeshBuilder.CreateTorus('wolf target ring', { diameter: 1.45, thickness: 0.035 }, scene);
  ring.parent = root; ring.position.y = 0.06; ring.rotation.x = Math.PI / 2; ring.material = mat('wolf hostile ring', new Color3(0.75, 0.27, 0.18), new Color3(0.25, 0.05, 0.02));
  const enemy: Enemy = { id: enemyId, kind: 'wolf', root, body, hp: stronger ? 95 : 70, maxHp: stronger ? 95 : 70, speed: stronger ? 2.0 : 1.65, damage: stronger ? 13 : 9, attackTimer: 1.2, specialTimer: 0, dead: false, aggro: 10 };
  enemies.push(enemy); return enemy;
}
function addBoss(): Enemy {
  const root = new TransformNode('grove guardian boss', scene); root.position.set(0, 0, -24);
  const body = MeshBuilder.CreateSphere('grove guardian body', { diameter: 3.2, segments: 10 }, scene);
  body.parent = root; body.position.y = 1.45; body.scaling.set(1.25, 0.9, 1.05); body.material = mat('grove guardian bark hide', new Color3(0.25, 0.35, 0.25)); addShadow(body);
  const head = MeshBuilder.CreateSphere('grove guardian head', { diameter: 1.45, segments: 10 }, scene);
  head.parent = root; head.position.set(0, 2.3, 1.2); head.material = materials.enemyDark;
  for (const side of [-1, 1]) {
    const horn = MeshBuilder.CreateCylinder('guardian antler', { height: 1.7, diameterTop: 0, diameterBottom: 0.35, tessellation: 6 }, scene);
    horn.parent = root; horn.position.set(side * 0.8, 3.2, 1.05); horn.rotation.z = side * -0.4; horn.material = materials.paleStone;
    const eye = MeshBuilder.CreateSphere('guardian ember eye', { diameter: 0.2 }, scene);
    eye.parent = root; eye.position.set(side * 0.35, 2.4, 1.78); eye.material = materials.enemyEye;
  }
  for (const x of [-0.95, 0.95]) for (const z of [-0.55, 0.8]) {
    const leg = MeshBuilder.CreateCylinder('guardian root leg', { height: 1.1, diameter: 0.42 }, scene);
    leg.parent = root; leg.position.set(x, 0.58, z); leg.material = materials.enemyDark;
  }
  const aura = MeshBuilder.CreateTorus('guardian boss aura', { diameter: 4.7, thickness: 0.1 }, scene);
  aura.parent = root; aura.position.y = 0.12; aura.rotation.x = Math.PI / 2; aura.material = mat('boss aura', new Color3(0.61, 0.24, 0.15), new Color3(0.25, 0.04, 0.02));
  const boss: Enemy = { id: ++enemyId, kind: 'boss', root, body, hp: 520, maxHp: 520, speed: 1.35, damage: 17, attackTimer: 1.8, specialTimer: 5, dead: false, aggro: 17 };
  enemies.push(boss); showToast('The Grove Guardian has awakened. Prepare for a boss battle!');
  setObjective('Defeat the Grove Guardian', 'The forest guardian is corrupted. Coordinate your party and use your abilities.');
  return boss;
}
function distance(a: Vector3, b: Vector3): number { return Math.hypot(a.x - b.x, a.z - b.z); }
function nearestEnemyFrom(position: Vector3, maxDistance = Number.POSITIVE_INFINITY): Enemy | null {
  let best: Enemy | null = null; let bestDistance = maxDistance;
  for (const enemy of enemies) {
    if (enemy.dead || !enemy.root.isEnabled()) continue;
    const d = distance(position, enemy.root.position);
    if (d < bestDistance) { bestDistance = d; best = enemy; }
  }
  return best;
}
function nearestEnemy(maxDistance = Number.POSITIVE_INFINITY): Enemy | null { return nearestEnemyFrom(player.root.position, maxDistance); }
function activeCompanions(): Companion[] { return companions.filter(c => c.active && c.recruited && !c.recovering); }
function setObjective(title: string, detail: string): void { $('objective-title').textContent = title; $('objective-detail').textContent = detail; }
function showToast(message: string, seconds = 3.2): void {
  $('toast').textContent = message; $('toast').classList.add('visible'); toastTimer = seconds;
}
function updateQuestProgress(): void {
  const progress = state.bossDefeated ? 100 : state.wolfKills >= 3 ? 75 : state.wolfKills / 3 * 55;
  ($('quest-progress-bar') as HTMLElement).style.width = `${progress}%`;
  $('quest-progress-text').textContent = state.bossDefeated ? 'Forest cleared · Return to base' : state.bossUnlocked ? 'Boss encounter available' : `Forest threats defeated: ${Math.min(state.wolfKills, 3)} / 3`;
}
function updateHUD(): void {
  const maxHp = 120 + (state.level - 1) * 14; const maxMana = 80 + (state.level - 1) * 8;
  $('hero-name').textContent = playerName.toUpperCase(); $('hero-class').textContent = playerClass.toUpperCase(); $('level-label').textContent = `LV ${state.level}`;
  $('hp-value').textContent = `${Math.ceil(state.hp)} / ${maxHp}`; $('mana-value').textContent = `${Math.ceil(state.mana)} / ${maxMana}`;
  $('xp-value').textContent = `${state.xp} / ${state.level * 100}`;
  ($('hp-bar') as HTMLElement).style.width = `${Math.max(0, state.hp / maxHp * 100)}%`;
  ($('mana-bar') as HTMLElement).style.width = `${Math.max(0, state.mana / maxMana * 100)}%`;
  ($('xp-bar') as HTMLElement).style.width = `${state.xp / (state.level * 100) * 100}%`;
  $('gold-value').textContent = String(state.gold); $('crystal-value').textContent = String(state.crystals);
  $('inventory-crystals').textContent = String(state.crystals); $('inventory-gold').textContent = String(state.gold); $('inventory-tokens').textContent = String(state.tokens);
  $('weapon-level').textContent = `Level ${state.weaponLevel}`; $('weapon-name').textContent = state.weaponLevel > 1 ? `Ether-forged blade +${state.weaponLevel - 1}` : 'Forest-forged blade';
  $('armour-name').textContent = `Wayfarer ${state.level >= 3 ? 'reinforced ' : ''}leathers`;
  const partyList = $('party-list'); partyList.innerHTML = '';
  const selected = activeCompanions();
  if (selected.length === 0) partyList.innerHTML = '<div class="party-empty">No companions currently active.</div>';
  for (const c of selected) {
    const member = document.createElement('div'); member.className = 'party-member';
    const pct = Math.max(0, c.hp / c.maxHp * 100);
    member.innerHTML = `<div class="party-avatar">${c.name.charAt(0)}</div><div><b>${c.name}</b><small>${c.role}${c.recovering ? ' · recovering' : ''}</small></div><div class="party-health"><i style="width:${pct}%"></i></div>`;
    partyList.appendChild(member);
  }
  $('default-ability-button').textContent = `DEFAULT: ${state.defaultAbility === 'arcane' ? 'ARCANE BOLT' : state.defaultAbility === 'heal' ? 'HEALING WAVE' : 'FROST NOVA'}`;
  const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(18);
  const enemyCard = $('enemy-card');
  if (state.zone === 'forest' && target) {
    enemyCard.classList.remove('hidden'); $('enemy-name').textContent = target.kind === 'boss' ? 'Grove Guardian' : 'Forest Wolf';
    $('enemy-hp-value').textContent = `${Math.ceil(target.hp)} / ${target.maxHp}`;
    ($('enemy-hp-bar') as HTMLElement).style.width = `${Math.max(0, target.hp / target.maxHp * 100)}%`;
  } else enemyCard.classList.add('hidden');
  updateQuestProgress();
}

// -----------------------------------------------------------------------------
// Save data: IndexedDB with a localStorage fallback and portable JSON backup.
// -----------------------------------------------------------------------------
function openSaveDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB is unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error('Could not open save database'));
  });
}
function makeSaveData(): SaveData {
  const active: Record<string, boolean> = {}; for (const c of companions) active[c.id] = c.active;
  return {
    version: 2, playerName, playerClass, appearance, level: state.level, xp: state.xp, hp: state.hp, mana: state.mana,
    gold: state.gold, crystals: state.crystals, tokens: state.tokens, weaponLevel: state.weaponLevel,
    wolfKills: state.wolfKills, bossDefeated: state.bossDefeated, aureliaRecruited: state.aureliaRecruited,
    partyActive: active, formation: state.formation, strategy: state.strategy, command: state.command,
    zone: state.zone, playerX: player.root.position.x, playerZ: player.root.position.z,
    worldMinutes: state.worldMinutes, weatherIndex: state.weatherIndex, collectedCrystalIds: Array.from(state.crystalsCollected)
  };
}
async function saveGame(silent = false): Promise<void> {
  const data = makeSaveData(); const json = JSON.stringify(data);
  try {
    localStorage.setItem(SAVE_KEY, json);
    const db = await openSaveDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(data, 'current');
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
    });
    db.close();
    if (!silent) showToast('Adventure saved successfully.');
  } catch (error) {
    console.warn('IndexedDB save fallback:', error);
    try { localStorage.setItem(SAVE_KEY, json); if (!silent) showToast('Saved in this browser using the local fallback.'); }
    catch { showToast('Save failed. Export a backup or check browser storage permissions.'); }
  }
}
async function readSaveData(): Promise<SaveData | null> {
  try {
    const db = await openSaveDB();
    const data = await new Promise<SaveData | undefined>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly'); const request = tx.objectStore(DB_STORE).get('current');
      request.onsuccess = () => resolve(request.result as SaveData | undefined); request.onerror = () => reject(request.error);
    });
    db.close(); if (data) return data;
  } catch (error) { console.warn('IndexedDB read fallback:', error); }
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) as SaveData : null; }
  catch { return null; }
}
async function hasSave(): Promise<boolean> { return (await readSaveData()) !== null; }
function applySave(data: SaveData): void {
  playerName = typeof data.playerName === 'string' ? data.playerName : 'Wayfarer';
  playerClass = typeof data.playerClass === 'string' ? data.playerClass : 'warrior';
  appearance = typeof data.appearance === 'string' ? data.appearance : 'emerald';
  state.level = Math.max(1, Number(data.level) || 1); state.xp = Math.max(0, Number(data.xp) || 0);
  state.hp = Math.max(1, Math.min(120 + (state.level - 1) * 14, Number(data.hp) || 120));
  state.mana = Math.max(0, Math.min(80 + (state.level - 1) * 8, Number(data.mana) || 80));
  state.gold = Math.max(0, Number(data.gold) || 0); state.crystals = Math.max(0, Number(data.crystals) || 0);
  state.tokens = Math.max(0, Number(data.tokens) || 0); state.weaponLevel = Math.max(1, Number(data.weaponLevel) || 1);
  state.wolfKills = Math.max(0, Number(data.wolfKills) || 0); state.bossDefeated = Boolean(data.bossDefeated);
  state.bossUnlocked = state.wolfKills >= 3; state.aureliaRecruited = Boolean(data.aureliaRecruited);
  state.formation = data.formation || 'balanced'; state.strategy = data.strategy || 'protect'; state.command = data.command || 'follow';
  state.zone = data.zone === 'forest' ? 'forest' : 'base'; state.worldMinutes = Number(data.worldMinutes) || 9 * 60;
  state.weatherIndex = Number(data.weatherIndex) || 0;
  state.crystalsCollected.clear(); for (const id of data.collectedCrystalIds ?? []) state.crystalsCollected.add(id);
  interactables.filter(item => item.kind === 'crystal').forEach((item, index) => { const collected = state.crystalsCollected.has(`crystal-${index}`); item.collected = collected; (item.mesh as Mesh).setEnabled(!collected); });
  for (const c of companions) c.active = Boolean(data.partyActive?.[c.id]);
  companions[2].recruited = state.aureliaRecruited; companions[2].active = state.aureliaRecruited && Boolean(data.partyActive?.aurelia);
  guardianNPC.root.setEnabled(!state.aureliaRecruited); guardianMarker.setEnabled(!state.aureliaRecruited);
  player.root.position.set(Number(data.playerX) || (state.zone === 'base' ? 80 : 0), 0, Number(data.playerZ) || (state.zone === 'base' ? 73 : 5));
  if (state.bossDefeated) { state.questComplete = true; setObjective('The Emerald Forest is cleared', 'The Grove Guardian has fallen. Random encounters can now appear in this region.'); }
  else if (state.bossUnlocked) setObjective('Defeat the Grove Guardian', 'The corrupted guardian has awakened in the northern grove.');
  else setObjective('Clear the forest path', 'Defeat three forest wolves, then investigate the ancient grove.');
  applyAppearance(); positionCompanions(); updateZoneVisuals();
  enemies.forEach(enemy => enemy.root.dispose()); enemies = []; currentTarget = null;
  if (!state.bossDefeated) {
    for (let i = 0; i < Math.max(0, 3 - state.wolfKills); i++) addWolf([new Vector3(-8, 0, -8), new Vector3(1, 0, -14), new Vector3(10, 0, -11)][i]);
    if (state.bossUnlocked) addBoss();
  }
  $('weather-label').textContent = weatherNames[state.weatherIndex % weatherNames.length];
  ($('weather-overlay') as HTMLElement).className = `weather-overlay ${state.weatherIndex === 1 ? 'rain' : state.weatherIndex === 2 ? 'mist' : ''}`;
  updateHUD();
}
function applyAppearance(): void {
  playerOutfit.diffuseColor = appearance === 'midnight' ? new Color3(0.14, 0.18, 0.28) : appearance === 'sunrise' ? new Color3(0.42, 0.25, 0.16) : new Color3(0.18, 0.36, 0.28);
  if (playerClass === 'mage') player.weapon.material = materials.crystal;
  else if (playerClass === 'ranger') player.weapon.material = materials.bark;
  else player.weapon.material = materials.gold;
}
function positionCompanions(): void {
  const active = activeCompanions();
  active.forEach((c, index) => {
    c.model.root.setEnabled(true);
    const offset = formationOffset(index);
    c.model.root.position.set(player.root.position.x + offset.x, 0, player.root.position.z + offset.z);
  });
  for (const c of companions) if (!c.active || !c.recruited || c.recovering) c.model.root.setEnabled(false);
}
function exportSave(): void {
  const data = makeSaveData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'legends-of-etheria-save.json'; anchor.click(); URL.revokeObjectURL(url);
  showToast('Save backup exported. Keep the JSON file somewhere safe.');
}

// -----------------------------------------------------------------------------
// Progression, combat, companions and abilities.
// -----------------------------------------------------------------------------
function gainXP(amount: number): void {
  state.xp += amount;
  while (state.xp >= state.level * 100) {
    state.xp -= state.level * 100; state.level++;
    state.hp = 120 + (state.level - 1) * 14; state.mana = 80 + (state.level - 1) * 8;
    showToast(`Level ${state.level}! Your health, mana and combat stats increased.`, 4);
  }
  updateHUD();
}
function dealDamage(enemy: Enemy, amount: number): void {
  if (enemy.dead) return;
  enemy.hp = Math.max(0, enemy.hp - amount);
  if (enemy.hp <= 0) defeatEnemy(enemy);
}
function defeatEnemy(enemy: Enemy): void {
  if (enemy.dead) return; enemy.dead = true; enemy.root.setEnabled(false);
  if (enemy.kind === 'wolf') {
    state.wolfKills++; state.gold += 15; gainXP(42);
    showToast('Forest wolf defeated · +42 XP · +15 gold');
    if (state.wolfKills >= 3 && !state.bossDefeated && !state.bossUnlocked) {
      state.bossUnlocked = true; addBoss();
      setObjective('Defeat the Grove Guardian', 'Three wolves have been defeated. The corruption is gathering at the ancient grove.');
    } else if (!state.bossUnlocked) setObjective('Clear the forest path', `Defeat three forest wolves. ${Math.min(state.wolfKills, 3)} of 3 defeated.`);
  } else {
    state.bossDefeated = true; state.questComplete = true; state.gold += 250; state.tokens += 1; gainXP(300);
    state.combatTimer = 0; setObjective('The Emerald Forest is cleared', 'The Grove Guardian has fallen. Return to base to claim your reward and prepare for the next region.');
    updateHUD(); void saveGame(true); $('victory-overlay').classList.remove('hidden'); state.paused = true;
  }
  updateHUD(); void saveGame(true);
}
function attack(): void {
  if (state.paused || !state.started || state.attackCooldown > 0) return;
  state.attackCooldown = 0.55;
  const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(3.4);
  if (!target || distance(player.root.position, target.root.position) > 3.7) { swingPlayerWeapon(); showToast('No enemy is close enough for a basic attack.', 1.5); return; }
  currentTarget = target;
  const damage = (playerClass === 'warrior' || playerClass === 'knight' ? 29 : 22) + state.weaponLevel * 5 + state.level * 2;
  dealDamage(target, damage); swingPlayerWeapon();
}
function swingPlayerWeapon(): void {
  player.weapon.rotation.x = -1.1; window.setTimeout(() => { player.weapon.rotation.x = 0; }, 180);
}
function spawnProjectile(from: Vector3, target: Enemy, damage: number, color: StandardMaterial, speed = 17): void {
  const orb = MeshBuilder.CreateSphere('magic projectile', { diameter: 0.32, segments: 8 }, scene);
  orb.position.copyFrom(from); orb.material = color;
  projectiles.push({ mesh: orb, from: from.clone(), to: target.root.position.add(new Vector3(0, target.kind === 'boss' ? 1.5 : 1, 0)), age: 0, duration: Math.max(0.18, distance(from, target.root.position) / speed), damage, target });
}
function castAbility(id: AbilityId): void {
  if (!state.started || state.paused) return;
  if (state.abilityCooldowns[id] > 0) { showToast('That ability is still recharging.', 1.2); return; }
  const costs: Record<AbilityId, number> = { arcane: 12, heal: 18, nova: 24 };
  if (state.mana < costs[id]) { showToast('Not enough mana. Wait for it to recover.', 1.5); return; }
  state.mana -= costs[id];
  if (id === 'arcane') {
    const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(18);
    if (!target) { state.mana += costs[id]; showToast('No target is close enough for Arcane Bolt.', 1.5); return; }
    state.abilityCooldowns.arcane = 1.3; spawnProjectile(player.root.position.add(new Vector3(0, 1.3, 0)), target, 42 + state.level * 4 + state.weaponLevel * 2, materials.crystal);
    showToast('Arcane Bolt!');
  } else if (id === 'heal') {
    state.abilityCooldowns.heal = 8; state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 36);
    for (const c of companions) if (c.recruited && !c.recovering) c.hp = Math.min(c.maxHp, c.hp + 36);
    burstEffect(player.root.position, materials.heal, 2.7); showToast('Healing Wave restores health to your party.');
  } else {
    state.abilityCooldowns.nova = 12; let hits = 0;
    for (const enemy of enemies) if (!enemy.dead && distance(player.root.position, enemy.root.position) <= 6.7) { dealDamage(enemy, 58 + state.level * 4); hits++; }
    burstEffect(player.root.position, materials.ice, 5.8); showToast(`Frost Nova! ${hits} ${hits === 1 ? 'enemy hit' : 'enemies hit'}.`);
  }
  updateHUD();
}
function burstEffect(position: Vector3, material: StandardMaterial, size: number): void {
  const effect = MeshBuilder.CreateTorus('spell burst', { diameter: 1.3, thickness: 0.12, tessellation: 32 }, scene);
  effect.position.set(position.x, 0.12, position.z); effect.rotation.x = Math.PI / 2; effect.material = material;
  const begin = performance.now(); const animate = () => {
    const pct = Math.min(1, (performance.now() - begin) / 430); effect.scaling.setAll(1 + pct * size / 2); effect.visibility = 1 - pct;
    if (pct < 1) requestAnimationFrame(animate); else effect.dispose();
  }; animate();
}
function companionAttack(companion: Companion, enemy: Enemy): void {
  if (companion.role === 'Knight') {
    if (distance(companion.model.root.position, enemy.root.position) <= 2.5) {
      dealDamage(enemy, 17 + state.level * 2); companion.model.weapon.rotation.x = -0.8;
      window.setTimeout(() => { companion.model.weapon.rotation.x = 0; }, 150);
    }
  } else {
    spawnProjectile(companion.model.root.position.add(new Vector3(0, 1.45, 0)), enemy, companion.role === 'Healer' ? 12 : 20 + state.level, companion.role === 'Healer' ? materials.heal : materials.gold, 13);
  }
}
function issueCommand(command: PartyCommand): void {
  state.command = command;
  if (command === 'attack') currentTarget = nearestEnemy(30);
  if (command === 'hold') for (const c of activeCompanions()) c.model.root.metadata = { holdX: c.model.root.position.x, holdZ: c.model.root.position.z };
  showToast(`Party command: ${command === 'follow' ? 'Follow me' : command === 'attack' ? 'Attack nearest enemy' : command === 'hold' ? 'Hold position' : command === 'defend' ? 'Defend the hero' : 'Advance'}.`);
  $('command-overlay').classList.add('hidden');
}
function formationOffset(index: number): Vector3 {
  if (state.formation === 'defensive') return [new Vector3(-1.8, 0, 2), new Vector3(1.8, 0, 2), new Vector3(0, 0, 3.2)][index] ?? Vector3.Zero();
  if (state.formation === 'offensive') return [new Vector3(-1.1, 0, -2), new Vector3(1.1, 0, -2), new Vector3(0, 0, 2)][index] ?? Vector3.Zero();
  return [new Vector3(-1.6, 0, 1.5), new Vector3(1.6, 0, 1.5), new Vector3(0, 0, 3)][index] ?? Vector3.Zero();
}
function moveToward(root: TransformNode, destination: Vector3, speed: number, dt: number): void {
  const delta = destination.subtract(root.position); delta.y = 0;
  const length = delta.length();
  if (length > 0.12) {
    const direction = delta.scale(1 / length); root.position.addInPlace(direction.scale(Math.min(length, speed * dt)));
    root.rotation.y = Math.atan2(direction.x, direction.z);
  }
}

// -----------------------------------------------------------------------------
// Base, travel, planning and interaction actions.
// -----------------------------------------------------------------------------
function setZone(zone: Zone): void {
  state.zone = zone; updateZoneVisuals();
  if (zone === 'base') {
    player.root.position.set(80, 0, 73); positionCompanions();
    setObjective(state.bossDefeated ? 'The Emerald Forest is cleared' : 'Prepare your next expedition', state.bossDefeated ? 'The forest is safe for now. Visit the planning table to review your party.' : 'Use the planning table to prepare, rest at the hospital and upgrade your weapon.');
  } else {
    player.root.position.set(0, 0, 5); positionCompanions();
    if (state.bossDefeated) setObjective('Explore the cleared forest', 'This region is cleared. Look for occasional rare encounters and hidden discoveries.');
    else if (state.bossUnlocked) setObjective('Defeat the Grove Guardian', 'The corrupted guardian awaits at the ancient grove to the north.');
    else setObjective('Clear the forest path', 'Find Aurelia, gather Ether crystals and defeat three forest wolves.');
  }
  camera.target = player.root.position.add(new Vector3(0, 1.2, 0));
  nearby = null; updateHUD();
}
function updateZoneVisuals(): void {
  // The zones share one scene, but the environment fog keeps the active area focused.
  if (state.zone === 'base') { scene.fogDensity = 0.0045; scene.fogColor = new Color3(0.21, 0.29, 0.23); }
  else { scene.fogDensity = state.weatherIndex === 2 ? 0.014 : 0.0065; scene.fogColor = new Color3(0.16, 0.27, 0.20); }
}
function canReturnToBase(): boolean {
  if (state.zone !== 'forest') return false;
  const nearbyThreat = enemies.some(e => !e.dead && distance(player.root.position, e.root.position) < e.aggro + 1);
  return state.combatTimer <= 0 && !nearbyThreat;
}
function returnToBase(): void {
  if (state.zone === 'base') { showToast('You are already at your headquarters.'); return; }
  if (!canReturnToBase()) { showToast('You are in combat. Create some distance and escape the enemies before returning to base.'); return; }
  setZone('base'); showToast('You returned safely to headquarters. Your expedition can resume whenever you are ready.'); void saveGame(true);
}
function departForForest(): void {
  applyPlanningSelections();
  $('planning-overlay').classList.add('hidden'); $('pause-overlay').classList.add('hidden');
  if (state.zone !== 'forest') setZone('forest');
  state.paused = false; showToast('Expedition started. The Emerald Forest awaits.');
  if (!state.bossDefeated) setObjective(state.bossUnlocked ? 'Defeat the Grove Guardian' : 'Clear the forest path', state.bossUnlocked ? 'Travel north to the ancient grove and defeat the guardian.' : 'Recruit Aurelia, collect Ether crystals and defeat three wolves.');
}
function openPause(): void {
  if (!state.started || $('start-overlay').classList.contains('hidden') === false) return;
  state.paused = true; $('pause-overlay').classList.remove('hidden'); $('planning-overlay').classList.add('hidden'); $('inventory-overlay').classList.add('hidden'); $('settings-overlay').classList.add('hidden');
}
function closePause(): void { $('pause-overlay').classList.add('hidden'); state.paused = false; }
function openPlanning(fromPause: boolean): void {
  planningFromPaused = fromPause || state.paused;
  state.paused = true; $('pause-overlay').classList.add('hidden'); $('planning-overlay').classList.remove('hidden');
  ($('party-reaphel') as HTMLInputElement).checked = companions[0].active;
  ($('party-sylva') as HTMLInputElement).checked = companions[1].active;
  ($('party-aurelia') as HTMLInputElement).checked = companions[2].active;
  ($('party-aurelia') as HTMLInputElement).disabled = !state.aureliaRecruited;
  ($('formation-select') as HTMLSelectElement).value = state.formation;
  ($('strategy-select') as HTMLSelectElement).value = state.strategy;
}
function applyPlanningSelections(): void {
  companions[0].active = ($('party-reaphel') as HTMLInputElement).checked;
  companions[1].active = ($('party-sylva') as HTMLInputElement).checked;
  companions[2].active = state.aureliaRecruited && ($('party-aurelia') as HTMLInputElement).checked;
  state.formation = ($('formation-select') as HTMLSelectElement).value;
  state.strategy = ($('strategy-select') as HTMLSelectElement).value;
  if (activeCompanions().length === 0) companions[0].active = true;
  positionCompanions(); updateHUD();
}
function closePlanning(): void {
  applyPlanningSelections(); $('planning-overlay').classList.add('hidden');
  if (planningFromPaused) { state.paused = true; $('pause-overlay').classList.remove('hidden'); }
  else state.paused = false;
  void saveGame(true);
}
function openInventory(fromPause = false): void {
  inventoryFromPaused = fromPause || state.paused;
  state.paused = true; $('pause-overlay').classList.add('hidden'); $('inventory-overlay').classList.remove('hidden'); updateHUD();
}
function closeInventory(): void {
  $('inventory-overlay').classList.add('hidden'); state.paused = inventoryFromPaused;
  if (inventoryFromPaused) $('pause-overlay').classList.remove('hidden');
}
function sleepUntilMorning(): void {
  state.worldMinutes = 8 * 60; state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 60);
  state.mana = 80 + (state.level - 1) * 8;
  for (const c of companions) if (c.recruited) { c.hp = c.maxHp; c.recovering = false; c.model.root.setEnabled(c.active); }
  showToast('You rested until morning. Your party has recovered.'); updateHUD(); void saveGame(true);
}
function useHospital(): void {
  state.hp = 120 + (state.level - 1) * 14; state.mana = 80 + (state.level - 1) * 8;
  for (const c of companions) if (c.recruited) { c.hp = c.maxHp; c.recovering = false; c.model.root.setEnabled(c.active); }
  showToast('The hospital has fully restored your party.'); updateHUD(); void saveGame(true);
}
function upgradeWeapon(): void {
  const cost = 75 * state.weaponLevel;
  if (state.gold < cost) { showToast(`You need ${cost} gold for the next weapon upgrade.`); return; }
  state.gold -= cost; state.weaponLevel++; showToast(`Weapon upgraded to level ${state.weaponLevel}. Your attacks are stronger.`); updateHUD(); void saveGame(true);
}
function interact(): void {
  if (state.paused || !nearby) return;
  switch (nearby.kind) {
    case 'planning': openPlanning(false); break;
    case 'bed': sleepUntilMorning(); break;
    case 'hospital': useHospital(); break;
    case 'blacksmith': openInventory(false); showToast('The blacksmith can improve your weapon in Inventory & Equipment.'); break;
    case 'barracks': openPlanning(false); break;
    case 'guardian':
      if (!state.aureliaRecruited) {
        state.aureliaRecruited = true; companions[2].recruited = true; companions[2].active = true;
        guardianNPC.root.setEnabled(false); guardianMarker.setEnabled(false); companions[2].model.root.setEnabled(true);
        companions[2].model.root.position.copyFrom(player.root.position.add(new Vector3(2, 0, 1)));
        showToast('Aurelia has joined your party! She can heal companions during combat.');
        updateHUD(); void saveGame(true);
      } else showToast('Aurelia: “The old roots whisper of a guardian deeper in the grove.”');
      break;
    case 'crystal': {
      const crystalIndex = interactables.filter(item => item.kind === 'crystal').indexOf(nearby);
      const key = `crystal-${crystalIndex}`;
      if (!state.crystalsCollected.has(key)) {
        state.crystalsCollected.add(key); state.crystals++; state.gold += 5;
        (nearby.mesh as Mesh).setEnabled(false); nearby.collected = true; showToast('Ether crystal collected · +1 crystal · +5 gold'); updateHUD(); void saveGame(true);
      }
      break;
    }
  }
}
function updateNearby(): void {
  nearby = null; let best = 3.1;
  for (const item of interactables) {
    if (item.kind === 'guardian' && state.aureliaRecruited) continue;
    if (item.kind === 'crystal' && item.collected) continue;
    if ((item.kind === 'planning' || item.kind === 'bed' || item.kind === 'hospital' || item.kind === 'blacksmith' || item.kind === 'barracks') && state.zone !== 'base') continue;
    if ((item.kind === 'guardian' || item.kind === 'crystal') && state.zone !== 'forest') continue;
    const d = distance(player.root.position, item.position);
    if (d < best) { best = d; nearby = item; }
  }
  const prompt = $('interaction-prompt');
  prompt.classList.toggle('hidden', !nearby);
  if (nearby) $('interaction-text').textContent = nearby.label;
}

// -----------------------------------------------------------------------------
// Character creation and starting the adventure.
// -----------------------------------------------------------------------------
function startNewGame(): void {
  playerName = (($('character-name-input') as HTMLInputElement).value.trim() || 'Wayfarer').slice(0, 18);
  playerClass = ($('class-select') as HTMLSelectElement).value; appearance = ($('appearance-select') as HTMLSelectElement).value;
  state.level = 1; state.xp = 0; state.hp = 120; state.mana = 80; state.gold = 100; state.crystals = 0; state.tokens = 0;
  state.weaponLevel = 1; state.wolfKills = 0; state.bossUnlocked = false; state.bossDefeated = false; state.questComplete = false;
  state.aureliaRecruited = false; state.combatTimer = 0; state.attackCooldown = 0; state.nightSpawned = false; state.randomEventTimer = 0;
  state.command = 'follow'; state.formation = 'balanced'; state.strategy = 'protect'; state.defaultAbility = 'arcane';
  state.abilityCooldowns.arcane = 0; state.abilityCooldowns.heal = 0; state.abilityCooldowns.nova = 0;
  state.aureliaRecruited = false; state.crystalsCollected.clear();
  for (const item of interactables) if (item.kind === 'crystal') { item.collected = false; (item.mesh as Mesh).setEnabled(true); } state.worldMinutes = 9 * 60; state.weatherIndex = 0; state.zone = 'base';
  companions[0].active = true; companions[1].active = true; companions[2].active = false; companions[2].recruited = false;
  companions.forEach(c => { c.hp = c.maxHp; c.recovering = false; c.recoverTimer = 0; });
  guardianNPC.root.setEnabled(true); guardianMarker.setEnabled(true); aureliaModel.root.setEnabled(false);
  $('weather-label').textContent = 'CLEAR'; ($('weather-overlay') as HTMLElement).className = 'weather-overlay';
  currentTarget = null;
  enemies.forEach(e => e.root.dispose()); enemies = []; projectiles.forEach(p => p.mesh.dispose()); projectiles = [];
  for (let i = 0; i < 3; i++) addWolf([new Vector3(-8, 0, -8), new Vector3(1, 0, -14), new Vector3(10, 0, -11)][i]);
  state.bossUnlocked = false; player.root.position.set(80, 0, 73); applyAppearance(); positionCompanions();
  state.started = true; state.paused = false; $('start-overlay').classList.add('hidden'); updateZoneVisuals();
  setObjective('Prepare your first expedition', 'Use the planning table in the courtyard, then depart for the Emerald Forest.');
  updateHUD(); showToast(`Welcome, ${playerName}. Your adventure begins at headquarters.`); void saveGame(true);
}
async function continueGame(): Promise<void> {
  const data = await readSaveData();
  if (!data) { showToast('No saved adventure was found.'); return; }
  applySave(data);
  state.started = true; state.paused = false; $('start-overlay').classList.add('hidden'); showToast('Welcome back to Etheria.'); updateHUD();
}

// -----------------------------------------------------------------------------
// Day/night, weather and runtime updates.
// -----------------------------------------------------------------------------
function updateWorldClock(dt: number): void {
  state.worldMinutes = (state.worldMinutes + dt * 1.0) % (24 * 60);
  const hours = Math.floor(state.worldMinutes / 60); const minutes = Math.floor(state.worldMinutes % 60);
  const phase = hours >= 20 || hours < 5 ? 'NIGHT' : hours >= 17 ? 'EVENING' : hours >= 12 ? 'AFTERNOON' : 'MORNING';
  $('world-clock').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · ${phase}`;
  const night = phase === 'NIGHT';
  const daylight = night ? 0.22 : phase === 'EVENING' ? 0.58 : phase === 'MORNING' ? 0.9 : 1.0;
  sunlight.intensity = daylight * (state.weatherIndex === 1 ? 0.72 : state.weatherIndex === 2 ? 0.58 : 1.2);
  ambient.intensity = night ? 0.35 : state.weatherIndex === 2 ? 0.55 : 0.78;
  if (night && !state.nightSpawned && state.zone === 'forest' && !state.bossDefeated) {
    state.nightSpawned = true;
    addWolf(new Vector3(-14, 0, -20), true); addWolf(new Vector3(14, 0, -22), true);
    showToast('Night has fallen. Stronger wolves have entered the forest.');
  }
  if (!night) state.nightSpawned = false;
  weatherTimer += dt;
  if (weatherTimer > 145) {
    weatherTimer = 0; state.weatherIndex = (state.weatherIndex + 1) % weatherNames.length;
    $('weather-label').textContent = weatherNames[state.weatherIndex];
    const overlay = $('weather-overlay'); overlay.className = `weather-overlay ${state.weatherIndex === 1 ? 'rain' : state.weatherIndex === 2 ? 'mist' : ''}`;
    updateZoneVisuals(); showToast(`The weather changed: ${weatherNames[state.weatherIndex].toLowerCase()}.`, 2.2);
  }
}
function updateEnemies(dt: number): void {
  for (const enemy of enemies) {
    if (enemy.dead || !enemy.root.isEnabled()) continue;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
    let targetRoot = player.root;
    let targetCompanion: Companion | null = null;
    let d = distance(enemy.root.position, player.root.position);
    for (const companion of activeCompanions()) {
      const companionDistance = distance(enemy.root.position, companion.model.root.position);
      if (companionDistance < d - 0.25) { d = companionDistance; targetRoot = companion.model.root; targetCompanion = companion; }
    }
    if (d < enemy.aggro) {
      state.combatTimer = 6;
      const attackRange = enemy.kind === 'boss' ? 3.4 : 1.75;
      if (d > attackRange) moveToward(enemy.root, targetRoot.position, enemy.speed * (state.worldMinutes / 60 >= 20 ? 1.22 : 1), dt);
      else if (enemy.attackTimer <= 0) {
        const damage = enemy.damage * (state.worldMinutes / 60 >= 20 ? 1.2 : 1);
        if (targetCompanion) {
          targetCompanion.hp = Math.max(0, targetCompanion.hp - damage);
          if (targetCompanion.hp <= 0) {
            targetCompanion.recovering = true; targetCompanion.recoverTimer = 7; targetCompanion.model.root.setEnabled(false);
            showToast(`${targetCompanion.name} was overwhelmed and has been sent to the base hospital to recover.`);
          }
        } else {
          state.hp = Math.max(0, state.hp - damage * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.35 : 1));
          state.playerDamageFlash = 0.22;
          if (state.hp <= 0) playerDefeated();
        }
        enemy.attackTimer = enemy.kind === 'boss' ? 2.0 : 1.8;
        if (enemy.kind === 'boss' && enemy.specialTimer <= 0) {
          enemy.specialTimer = 6; burstEffect(enemy.root.position, materials.fire, 5.1);
          if (distance(player.root.position, enemy.root.position) < 6) state.hp = Math.max(0, state.hp - 12);
          for (const companion of activeCompanions()) if (distance(companion.model.root.position, enemy.root.position) < 6) companion.hp = Math.max(0, companion.hp - 12);
          showToast('The Grove Guardian unleashes a root shockwave!');
          if (state.hp <= 0) playerDefeated();
        }
      }
    }
  }
  state.combatTimer = Math.max(0, state.combatTimer - dt);
  for (const c of companions) {
    if (c.recovering && state.combatTimer <= 0) {
      c.recoverTimer = Math.max(0, c.recoverTimer - dt);
      if (c.recoverTimer <= 0) {
        c.recovering = false; c.hp = Math.max(25, Math.round(c.maxHp * 0.35));
        c.model.root.setEnabled(c.active); c.model.root.position.copyFrom(player.root.position.add(new Vector3(1.5, 0, 1.5)));
        showToast(`${c.name} has recovered enough to rejoin the party.`);
      }
    }
  }
}
function updateCompanions(dt: number): void {
  const selected = activeCompanions();
  selected.forEach((c, index) => {
    const root = c.model.root; if (!root.isEnabled() || c.recovering) return;
    c.attackTimer = Math.max(0, c.attackTimer - dt); c.healTimer = Math.max(0, c.healTimer - dt);
    if (c.role === 'Healer' && c.healTimer <= 0) {
      const injured = companions.find(other => other.recruited && !other.recovering && other.hp < other.maxHp * 0.72);
      if (injured) { injured.hp = Math.min(injured.maxHp, injured.hp + 24); c.healTimer = 5.5; burstEffect(injured.model.root.position, materials.heal, 1.3); }
      else if (state.hp < (120 + (state.level - 1) * 14) * 0.72) { state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 20); c.healTimer = 5.5; burstEffect(player.root.position, materials.heal, 1.3); }
    }
    let desired = root.position.clone();
    if (state.command === 'hold') {
      const saved = root.metadata as { holdX?: number; holdZ?: number } | null;
      if (saved?.holdX !== undefined && saved.holdZ !== undefined) desired = new Vector3(saved.holdX, 0, saved.holdZ);
    } else if (state.command === 'advance') desired = player.root.position.add(new Vector3(index % 2 === 0 ? -1 : 1, 0, -3));
    else if (state.command === 'defend') desired = player.root.position.add(new Vector3(index % 2 === 0 ? -1.8 : 1.8, 0, 1.2));
    else desired = player.root.position.add(formationOffset(index));
    if (distance(root.position, desired) > 0.65 && state.command !== 'hold') moveToward(root, desired, c.role === 'Healer' ? 4.4 : 4.0, dt);
    const targetRange = state.command === 'hold' ? 4.5 : state.command === 'defend' ? 8 : state.command === 'advance' ? 18 : 14;
    const focusedTarget = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemyFrom(root.position, targetRange);
    const target = state.command === 'attack' || state.strategy === 'focus' ? focusedTarget : nearestEnemyFrom(root.position, targetRange);
    if (target) {
      if (c.role === 'Knight' && distance(root.position, target.root.position) > 2.8) moveToward(root, target.root.position, 4.2, dt);
      if (c.attackTimer <= 0 && (c.role !== 'Knight' || distance(root.position, target.root.position) <= 2.9)) {
        companionAttack(c, target); c.attackTimer = c.role === 'Knight' ? 1.35 : c.role === 'Healer' ? 2.7 : 1.8;
      }
    }
  });
}
function updateProjectiles(dt: number): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.age += dt; const t = Math.min(1, p.age / p.duration);
    p.mesh.position = Vector3.Lerp(p.from, p.to, t); p.mesh.position.y += Math.sin(t * Math.PI) * 0.6;
    if (t >= 1) {
      if (p.target && !p.target.dead) dealDamage(p.target, p.damage);
      p.mesh.dispose(); projectiles.splice(i, 1);
    }
  }
}
function updateMovement(dt: number): void {
  let movement = Vector3.Zero();
  const forward = new Vector3(Math.sin(camera.alpha), 0, Math.cos(camera.alpha));
  const right = new Vector3(forward.z, 0, -forward.x);
  if (keys.has('KeyW')) movement.addInPlace(forward);
  if (keys.has('KeyS')) movement.subtractInPlace(forward);
  if (keys.has('KeyD')) movement.addInPlace(right);
  if (keys.has('KeyA')) movement.subtractInPlace(right);
  if (movement.lengthSquared() > 0) {
    movement.normalize(); const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.6 : 4.7;
    player.root.position.addInPlace(movement.scale(speed * dt)); player.root.rotation.y = Math.atan2(movement.x, movement.z);
    state.stepTime += dt * 9; player.root.position.y = Math.abs(Math.sin(state.stepTime)) * 0.055;
  } else player.root.position.y += (0 - player.root.position.y) * Math.min(1, dt * 10);
  if (state.zone === 'forest') {
    player.root.position.x = Math.max(-33, Math.min(33, player.root.position.x));
    player.root.position.z = Math.max(-35, Math.min(28, player.root.position.z));
  } else {
    player.root.position.x = Math.max(59, Math.min(101, player.root.position.x));
    player.root.position.z = Math.max(58, Math.min(102, player.root.position.z));
  }
  camera.target = Vector3.Lerp(camera.target, player.root.position.add(new Vector3(0, 1.25, 0)), 1 - Math.pow(0.001, dt));
}
function playerDefeated(): void {
  state.hp = 42; state.mana = Math.max(20, state.mana); state.gold = Math.max(0, state.gold - 15);
  state.zone = 'base'; state.combatTimer = 0; player.root.position.set(80, 0, 73); positionCompanions(); updateZoneVisuals();
  showToast('Your party retreated to headquarters. The hospital can restore everyone. (15 gold lost)');
  setObjective('Recover at headquarters', 'Visit the hospital, regroup and prepare before returning to the forest.');
  updateHUD(); void saveGame(true);
}

// -----------------------------------------------------------------------------
// UI and input wiring.
// -----------------------------------------------------------------------------
function bindButton(id: string, callback: () => void): void { $(id).addEventListener('click', callback); }
bindButton('new-game-button', startNewGame);
bindButton('continue-button', () => { void continueGame(); });
bindButton('pause-button', openPause);
bindButton('resume-button', closePause);
bindButton('pause-planning-button', () => openPlanning(true));
bindButton('planning-close-button', closePlanning);
bindButton('depart-button', departForForest);
bindButton('save-button', () => { void saveGame(); });
bindButton('pause-save-button', () => { void saveGame(); });
bindButton('return-base-button', returnToBase);
bindButton('pause-base-button', () => { $('pause-overlay').classList.add('hidden'); if (canReturnToBase()) { returnToBase(); state.paused = false; } else if (state.zone === 'base') { state.paused = false; } else { state.paused = true; $('pause-overlay').classList.remove('hidden'); showToast('Escape combat before returning to base.'); } });
bindButton('inventory-button', () => openInventory(false));
bindButton('pause-inventory-button', () => openInventory(true));
bindButton('inventory-close-button', closeInventory);
bindButton('upgrade-weapon-button', upgradeWeapon);
bindButton('pause-settings-button', () => { settingsFromPaused = true; $('pause-overlay').classList.add('hidden'); $('settings-overlay').classList.remove('hidden'); state.paused = true; });
bindButton('settings-close-button', () => { $('settings-overlay').classList.add('hidden'); if (settingsFromPaused) { $('pause-overlay').classList.remove('hidden'); state.paused = true; } else { state.paused = false; } });
bindButton('party-command-button', () => $('command-overlay').classList.toggle('hidden'));
bindButton('command-close-button', () => $('command-overlay').classList.add('hidden'));
bindButton('main-menu-button', () => { $('pause-overlay').classList.add('hidden'); $('start-overlay').classList.remove('hidden'); state.paused = true; state.started = false; void saveGame(true); });
bindButton('export-save-button', exportSave);
bindButton('victory-return-button', () => { $('victory-overlay').classList.add('hidden'); state.paused = false; setZone('base'); showToast('The forest relic has been secured. The region is now cleared.'); void saveGame(true); });

for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ability]'))) {
  button.addEventListener('click', () => castAbility(button.dataset.ability as AbilityId));
}
$('default-ability-button').addEventListener('click', () => {
  const ids: AbilityId[] = ['arcane', 'heal', 'nova']; const current = ids.indexOf(state.defaultAbility);
  state.defaultAbility = ids[(current + 1) % ids.length]; updateHUD(); showToast(`Default left-click ability: ${state.defaultAbility}.`);
});
for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-command]'))) {
  button.addEventListener('click', () => issueCommand(button.dataset.command as PartyCommand));
}
$('camera-distance').addEventListener('input', event => { camera.radius = Number((event.target as HTMLInputElement).value); });
$('camera-sensitivity').addEventListener('input', event => { camera.angularSensibilityX = 1200 / Number((event.target as HTMLInputElement).value); camera.angularSensibilityY = camera.angularSensibilityX; });
$('graphics-quality').addEventListener('change', event => {
  const value = (event.target as HTMLSelectElement).value;
  engine.setHardwareScalingLevel(value === 'high' ? 1 : value === 'medium' ? 1.25 : 1.6);
  scene.skipPointerMovePicking = value === 'low'; showToast(`Graphics preset set to ${value}.`);
});
$('import-save-input').addEventListener('change', event => {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as SaveData;
      if (data.version !== 2) throw new Error('Unsupported save version');
      applySave(data); void saveGame(true); showToast('Save backup imported. Choose Continue saved game from the main menu.');
    } catch { showToast('That file is not a valid Legends of Etheria save backup.'); }
  }; reader.onerror = () => showToast('Could not read the selected save file.'); reader.readAsText(file);
});

window.addEventListener('keydown', event => {
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && state.started) {
    if (!$('planning-overlay').classList.contains('hidden')) closePlanning();
    else if (!$('inventory-overlay').classList.contains('hidden')) closeInventory();
    else if (!$('settings-overlay').classList.contains('hidden')) { $('settings-overlay').classList.add('hidden'); if (settingsFromPaused) $('pause-overlay').classList.remove('hidden'); else state.paused = false; }
    else if (!$('command-overlay').classList.contains('hidden')) $('command-overlay').classList.add('hidden');
    else if (!$('pause-overlay').classList.contains('hidden')) closePause(); else openPause();
    return;
  }
  if (!state.started || state.paused) return;
  keys.add(event.code);
  if (!event.repeat) {
    if (event.code === 'Space') attack();
    if (event.code === 'KeyE') interact();
    if (event.code === 'Digit1') castAbility('arcane');
    if (event.code === 'KeyQ') castAbility('heal');
    if (event.code === 'Digit2') castAbility('nova');
    if (event.code === 'Tab') {
      const targets = enemies.filter(enemy => !enemy.dead && enemy.root.isEnabled());
      if (targets.length) {
        const currentIndex = currentTarget ? targets.findIndex(enemy => enemy.id === currentTarget?.id) : -1;
        currentTarget = targets[(currentIndex + 1) % targets.length];
        showToast(`Target selected: ${currentTarget.kind === 'boss' ? 'Grove Guardian' : 'Forest Wolf'}.`, 1.4); updateHUD();
      }
    }
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (!state.started || state.paused) return;
  if (event.button === 0) castAbility(state.defaultAbility);
  if (event.button === 2) { $('command-overlay').classList.remove('hidden'); }
});
window.addEventListener('resize', () => engine.resize());

// The planning menu is also reachable by pressing P while paused.
window.addEventListener('keydown', event => {
  if (event.code === 'KeyP' && state.started && state.paused && $('pause-overlay').classList.contains('hidden') === false) openPlanning(true);
});

// -----------------------------------------------------------------------------
// Initial enemy/interactable setup and main render loop.
// -----------------------------------------------------------------------------
createInteractables();
for (let i = 0; i < 3; i++) addWolf([new Vector3(-8, 0, -8), new Vector3(1, 0, -14), new Vector3(10, 0, -11)][i]);
updateHUD();
void hasSave().then(found => { ($('continue-button') as HTMLButtonElement).disabled = !found; });

let previousFrame = performance.now();
engine.runRenderLoop(() => {
  const now = performance.now(); const dt = Math.min((now - previousFrame) / 1000, 0.05); previousFrame = now;
  if (state.started && !state.paused) {
    updateWorldClock(dt); updateMovement(dt);
    state.attackCooldown = Math.max(0, state.attackCooldown - dt);
    for (const id of ['arcane', 'heal', 'nova'] as AbilityId[]) state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
    if (state.mana < 80 + (state.level - 1) * 8) state.mana = Math.min(80 + (state.level - 1) * 8, state.mana + dt * 3.2);
    if (state.combatTimer <= 0) state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + dt * 0.45);
    updateEnemies(dt); updateCompanions(dt); updateProjectiles(dt); updateNearby();
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('visible'); }
    state.playerDamageFlash = Math.max(0, state.playerDamageFlash - dt);
    if (state.playerDamageFlash > 0) player.body.material = materials.enemyEye; else player.body.material = playerOutfit;
    if (now - state.lastSaveTime > 45000) { state.lastSaveTime = now; void saveGame(true); }
    if (state.zone === 'forest' && state.bossDefeated && !state.randomEventTimer) state.randomEventTimer = 60;
    if (state.zone === 'forest' && state.bossDefeated) {
      state.randomEventTimer -= dt;
      if (state.randomEventTimer <= 0) {
        state.randomEventTimer = 85 + Math.random() * 55;
        const rareEnemyAlive = enemies.some(enemy => !enemy.dead && enemy.kind === 'wolf' && enemy.maxHp > 70);
        if (!rareEnemyAlive) {
          addWolf(new Vector3(13, 0, -19), true);
          showToast('Random encounter: a stronger Grove Stalker has appeared in the cleared region.');
        } else {
          state.gold += 20; state.tokens += 1;
          showToast('Random discovery: a hidden resource cache was found near the old stones. +20 gold and +1 token.');
          updateHUD();
        }
        void saveGame(true);
      }
    }
    if (Math.floor(now / 1000) !== Math.floor((now - dt * 1000) / 1000)) updateHUD();
  } else if (toastTimer > 0) {
    toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('visible');
  }
  const time = now * 0.001;
  guardianMarker.rotation.z = time * 0.7; guardianStaffCrystal.scaling.setAll(1 + Math.sin(time * 2.4) * 0.08);
  planningMarker.rotation.z = time * 0.35;
  scene.render();
});

// Keep UI and scene setup resilient if the browser tab changes size or loses focus.
window.addEventListener('beforeunload', () => { keys.clear(); });
