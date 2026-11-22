const { ArcRotateCamera, Color3, Color4, DirectionalLight, DynamicTexture, Engine, GlowLayer, HemisphericLight, Mesh, MeshBuilder, PointLight, Scene, ShadowGenerator, StandardMaterial, Texture, TransformNode, Vector3 } = BABYLON;
const SAVE_KEY = 'legends-of-etheria-demo-save-v2';
const DB_NAME = 'LegendsOfEtheriaSaves';
const DB_STORE = 'game';
const $ = (id) => {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing required interface element: #${id}`);
    return element;
};
const canvas = $('game-canvas');
const engine = new Engine(canvas, true, { antialias: true, stencil: true, preserveDrawingBuffer: false }, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.09, 0.075, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.0048;
scene.fogColor = new Color3(0.17, 0.27, 0.21);
const camera = new ArcRotateCamera('adventure-camera', Math.PI / 2, 1.05, 12, new Vector3(80, 1.2, 72), scene);
camera.lowerRadiusLimit = 7;
camera.upperRadiusLimit = 18;
camera.lowerBetaLimit = 0.48;
camera.upperBetaLimit = 1.42;
camera.wheelPrecision = 42;
camera.panningSensibility = 0;
camera.inertia = 0.78;
camera.attachControl(canvas, true);
if (camera.inputs.attached.pointers)
    camera.inputs.attached.pointers.buttons = [0, 1]; // left-drag or middle-drag rotates; a short left click casts the default ability
const ambient = new HemisphericLight('forest-ambient', new Vector3(0, 1, 0), scene);
ambient.intensity = 0.78;
ambient.groundColor = new Color3(0.16, 0.22, 0.16);
const sunlight = new DirectionalLight('world-sun', new Vector3(-0.5, -1, 0.28), scene);
sunlight.position = new Vector3(35, 45, -25);
sunlight.intensity = 1.2;
const shadows = new ShadowGenerator(2048, sunlight);
shadows.usePercentageCloserFiltering = true;
shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
shadows.setDarkness(0.24);
shadows.bias = 0.00045;
const glowLayer = new GlowLayer('ether-glow', scene, { blurKernelSize: 48 });
glowLayer.intensity = 0.72;
function addShadow(mesh) { mesh.receiveShadows = true; shadows.addShadowCaster(mesh); return mesh; }
const glowLight = new PointLight('base-lantern-light', new Vector3(80, 5, 80), scene);
glowLight.diffuse = new Color3(0.86, 0.72, 0.43);
glowLight.intensity = 0.28;
glowLight.range = 18;
const fireflies = [];
const mat = (name, color, emissive = new Color3(0, 0, 0), alpha = 1) => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = color;
    material.emissiveColor = emissive;
    material.alpha = alpha;
    material.specularColor = new Color3(0.16, 0.18, 0.14);
    material.specularPower = 48;
    return material;
};
// Procedural hand-painted textures: no external image downloads or asset licensing surprises.
function makeSurfaceTexture(name, kind, base) {
    const texture = new DynamicTexture(name, { width: 512, height: 512 }, scene, false);
    const ctx = texture.getContext();
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    if (kind === 'grass') {
        for (let i = 0; i < 2600; i++) {
            const x = Math.random() * 512, y = Math.random() * 512;
            const r = 2 + Math.random() * 13;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(112,145,72,0.16)' : 'rgba(8,34,17,0.17)';
            ctx.beginPath();
            ctx.ellipse(x, y, r, r * (0.35 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
            if (i % 3 === 0) {
                ctx.strokeStyle = 'rgba(171,184,111,0.18)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - .5) * 9, y - 4 - Math.random() * 9);
                ctx.stroke();
            }
        }
    }
    else if (kind === 'bark') {
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 512;
            ctx.strokeStyle = Math.random() > .5 ? 'rgba(12,8,5,0.25)' : 'rgba(188,139,83,0.18)';
            ctx.lineWidth = 1 + Math.random() * 4;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.bezierCurveTo(x - 14, 150, x + 12, 320, x + (Math.random() - .5) * 12, 512);
            ctx.stroke();
        }
    }
    else if (kind === 'stone' || kind === 'roof') {
        for (let i = 0; i < 1800; i++) {
            const x = Math.random() * 512, y = Math.random() * 512;
            ctx.fillStyle = Math.random() > .5 ? 'rgba(235,226,190,0.12)' : 'rgba(18,23,20,0.16)';
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        if (kind === 'roof') {
            ctx.strokeStyle = 'rgba(12,25,21,0.38)';
            ctx.lineWidth = 5;
            for (let y = 25; y < 512; y += 55) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y + 10);
                ctx.stroke();
            }
        }
    }
    texture.update();
    texture.uScale = kind === 'bark' ? 2.2 : 7;
    texture.vScale = kind === 'bark' ? 1.2 : 7;
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    return texture;
}
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
    heal: mat('healing magic', new Color3(0.55, 0.94, 0.64), new Color3(0.18, 0.65, 0.32)),
    window: mat('warm window light', new Color3(1, 0.72, 0.36), new Color3(0.95, 0.43, 0.12)),
    leafDeep: mat('leaf shadow', new Color3(0.055, 0.17, 0.105)),
    leafBright: mat('leaf highlights', new Color3(0.28, 0.46, 0.23)),
    fern: mat('fern fronds', new Color3(0.12, 0.32, 0.16)),
    flower: mat('wildflower petals', new Color3(0.88, 0.72, 0.44), new Color3(0.12, 0.07, 0.02)),
    water: mat('forest pool water', new Color3(0.11, 0.34, 0.34), new Color3(0.02, 0.11, 0.13), 0.82),
    emberGround: mat('Emberfall volcanic earth', new Color3(0.28, 0.12, 0.09)),
    emberGlow: mat('Emberfall molten seams', new Color3(0.95, 0.27, 0.07), new Color3(0.85, 0.12, 0.015)),
    frostGround: mat('Frostveil snowfield', new Color3(0.61, 0.76, 0.81), new Color3(0.07, 0.13, 0.18)),
    frostCrystal: mat('Frostveil blue ice', new Color3(0.38, 0.76, 0.9), new Color3(0.18, 0.46, 0.68)),
    mireGround: mat('Sunken Mire peat', new Color3(0.12, 0.23, 0.17)),
    mireGlow: mat('Sunken Mire toxic lights', new Color3(0.34, 0.69, 0.28), new Color3(0.13, 0.32, 0.08)),
    starGround: mat('Starfall golden sand', new Color3(0.56, 0.43, 0.25)),
    starCrystal: mat('Starfall sunstone', new Color3(0.9, 0.68, 0.27), new Color3(0.46, 0.24, 0.04))
};
const grassTexture = makeSurfaceTexture('moss-texture', 'grass', '#29492e');
const barkTexture = makeSurfaceTexture('bark-texture', 'bark', '#5b3d27');
const stoneTexture = makeSurfaceTexture('stone-texture', 'stone', '#62665a');
const roofTexture = makeSurfaceTexture('roof-texture', 'roof', '#354b42');
materials.grass.diffuseTexture = grassTexture;
materials.grassLight.diffuseTexture = grassTexture;
materials.bark.diffuseTexture = barkTexture;
materials.stone.diffuseTexture = stoneTexture;
materials.paleStone.diffuseTexture = stoneTexture;
materials.path.diffuseTexture = stoneTexture;
materials.roof.diffuseTexture = roofTexture;
// A painted sky dome gives both the base and forest a real horizon, rather than a flat clear colour.
const skyTexture = new DynamicTexture('etheria-sky-painting', { width: 1024, height: 512 }, scene, false);
const skyCtx = skyTexture.getContext();
const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
skyGradient.addColorStop(0, '#162c35');
skyGradient.addColorStop(0.45, '#55766d');
skyGradient.addColorStop(0.78, '#b9a77b');
skyGradient.addColorStop(1, '#6b7960');
skyCtx.fillStyle = skyGradient;
skyCtx.fillRect(0, 0, 1024, 512);
for (let i = 0; i < 30; i++) {
    const x = Math.random() * 1024, y = 90 + Math.random() * 210;
    const cloud = skyCtx.createRadialGradient(x, y, 3, x, y, 80 + Math.random() * 95);
    cloud.addColorStop(0, 'rgba(227,224,195,0.16)');
    cloud.addColorStop(1, 'rgba(227,224,195,0)');
    skyCtx.fillStyle = cloud;
    skyCtx.fillRect(x - 180, y - 110, 360, 220);
}
skyTexture.update();
skyTexture.wrapU = Texture.WRAP_ADDRESSMODE;
const skyMaterial = new StandardMaterial('painted fantasy sky', scene);
skyMaterial.backFaceCulling = false;
skyMaterial.disableLighting = true;
skyMaterial.emissiveTexture = skyTexture;
skyMaterial.emissiveColor = new Color3(1, 1, 1);
skyMaterial.diffuseColor = new Color3(0.9, 0.95, 0.86);
const skyDome = MeshBuilder.CreateSphere('wide forest sky dome', { diameter: 520, segments: 32 }, scene);
skyDome.position.set(40, 16, 40);
skyDome.material = skyMaterial;
skyDome.isPickable = false;
skyDome.infiniteDistance = true;
skyDome.renderingGroupId = 0;
scene.imageProcessingConfiguration.exposure = 1.12;
scene.imageProcessingConfiguration.contrast = 1.12;
function makeTree(x, z, scale = 1, variant = 0) {
    const trunkHeight = (3.3 + (variant % 3) * 0.35) * scale;
    const trunk = MeshBuilder.CreateCylinder('ancient forest trunk', { height: trunkHeight, diameterTop: 0.34 * scale, diameterBottom: 0.9 * scale, tessellation: 12 }, scene);
    trunk.position.set(x, trunkHeight * 0.5, z);
    trunk.rotation.z = Math.sin(x * 0.41 + z) * 0.075;
    trunk.material = materials.bark;
    addShadow(trunk);
    // Buttress roots break up the trunk silhouette and make each tree feel planted in the soil.
    for (let r = 0; r < 5; r++) {
        const angle = (Math.PI * 2 * r) / 5 + variant * 0.37;
        const root = MeshBuilder.CreateCylinder('tree buttress root', { height: 1.5 * scale, diameterTop: 0.08 * scale, diameterBottom: 0.34 * scale, tessellation: 7 }, scene);
        root.position.set(x + Math.cos(angle) * 0.43 * scale, 0.32 * scale, z + Math.sin(angle) * 0.43 * scale);
        root.rotation.z = Math.cos(angle) * 0.78;
        root.rotation.x = -Math.sin(angle) * 0.78;
        root.material = materials.bark;
    }
        // Branches reach into the canopy instead of ending at a bare pole.
    for (let b = 0; b < 4; b++) {
        const angle = b * Math.PI * 0.5 + variant * 0.55;
        const branch = MeshBuilder.CreateCylinder('tree branch', { height: 1.65 * scale, diameterTop: 0.11 * scale, diameterBottom: 0.23 * scale, tessellation: 8 }, scene);
        branch.position.set(x + Math.cos(angle) * 0.67 * scale, 2.7 * scale, z + Math.sin(angle) * 0.67 * scale);
        branch.rotation.z = Math.cos(angle) * 0.82;
        branch.rotation.x = -Math.sin(angle) * 0.82;
        branch.material = materials.bark;
    }
    const clusters = [
        [0, 3.8, 0, 2.6], [-0.95, 3.55, 0.28, 2.0], [0.92, 3.5, -0.32, 2.05],
        [-0.5, 4.55, -0.42, 2.1], [0.55, 4.6, 0.35, 2.15], [0.05, 5.15, 0, 1.85],
        [1.2, 4.05, 0.3, 1.5]
    ];
    clusters.forEach((c, i) => {
        const crown = MeshBuilder.CreateSphere('layered emerald canopy', { diameter: c[3] * scale, segments: 16 }, scene);
        crown.position.set(x + c[0] * scale, c[1] * scale, z + c[2] * scale);
        crown.scaling.set(1.18, 0.78 + (i % 3) * 0.12, 1.0);
        crown.material = i % 4 === 0 ? materials.leafBright : materials.leaves[(variant + i) % 3];
        if (i < 3)
            addShadow(crown);
    });
    // Small sunlit leaf clusters around the crown give the canopy a soft, irregular edge.
    for (let i = 0; i < 9; i++) {
        const angle = i * 2.399 + variant;
        const tuft = MeshBuilder.CreateSphere('outer leaf tuft', { diameter: 0.8 * scale, segments: 10 }, scene);
        tuft.position.set(x + Math.cos(angle) * (1.45 + (i % 2) * 0.18) * scale, (3.75 + (i % 4) * 0.33) * scale, z + Math.sin(angle) * 1.35 * scale);
        tuft.scaling.set(1.3, 0.72, 1.05);
        tuft.material = i % 3 === 0 ? materials.leafBright : materials.leaves[(i + variant) % 3];
    }
}
function makeRock(x, z, size) {
    const rock = MeshBuilder.CreatePolyhedron('forest boulder', { type: 1, size }, scene);
    rock.position.set(x, size * 0.38, z);
    rock.scaling.y = 0.68;
    rock.rotation.y = x * 0.19;
    rock.material = materials.stone;
    addShadow(rock);
    return rock;
}
function makeCrystalMesh(x, z, size = 1) {
    const crystal = MeshBuilder.CreatePolyhedron('ether crystal cluster', { type: 1, size }, scene);
    crystal.position.set(x, size * 0.82, z);
    crystal.scaling.set(0.55, 1.42, 0.55);
    crystal.rotation.y = x * 0.1;
    crystal.material = materials.crystal;
    addShadow(crystal);
    glowLayer.addIncludedOnlyMesh(crystal);
    const light = new PointLight('ether crystal glow', new Vector3(x, 1.5 * size, z), scene);
    light.diffuse = new Color3(0.17, 0.78, 0.78);
    light.intensity = 0.5;
    light.range = 6;
    return crystal;
}
function makeBuilding(name, x, z, width, depth, height, roofColor = materials.roof) {
    const building = MeshBuilder.CreateBox(`${name} timber hall`, { width, height, depth }, scene);
    building.position.set(x, height / 2, z);
    building.material = materials.house;
    addShadow(building);
    // Stone foundation and a broad, steep roof create a readable fantasy outpost silhouette.
    const foundation = MeshBuilder.CreateBox(`${name} stone foundation`, { width: width + 0.45, height: 0.5, depth: depth + 0.45 }, scene);
    foundation.position.set(x, 0.25, z);
    foundation.material = materials.stone;
    addShadow(foundation);
    const roof = MeshBuilder.CreateCylinder(`${name} peaked roof`, { height: Math.max(width, depth) * 0.88, diameter: Math.max(width, depth) * 1.24, tessellation: 4 }, scene);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(x, height + Math.max(width, depth) * 0.31, z);
    roof.material = roofColor;
    addShadow(roof);
    const front = z - depth / 2 - 0.09;
    const door = MeshBuilder.CreateBox(`${name} carved door`, { width: 0.95, height: 1.85, depth: 0.16 }, scene);
    door.position.set(x, 0.98, front);
    door.material = materials.bark;
    addShadow(door);
    const doorFrame = mat(`${name} door frame`, new Color3(0.5, 0.34, 0.19));
    for (const dx of [-0.56, 0.56]) {
        const post = MeshBuilder.CreateBox(`${name} door frame post`, { width: 0.12, height: 2.0, depth: 0.22 }, scene);
        post.position.set(x + dx, 1.0, front - 0.035);
        post.material = doorFrame;
    }
    const lintel = MeshBuilder.CreateBox(`${name} door lintel`, { width: 1.25, height: 0.16, depth: 0.24 }, scene);
    lintel.position.set(x, 1.98, front - 0.04);
    lintel.material = doorFrame;
    const step = MeshBuilder.CreateBox(`${name} entrance step`, { width: 1.45, height: 0.18, depth: 0.65 }, scene);
    step.position.set(x, 0.09, front - 0.34);
    step.material = materials.paleStone;
    // Warm windows and heavy corner timbers make the buildings read as lived-in spaces.
    for (const side of [-1, 1]) {
        const win = MeshBuilder.CreateBox(`${name} glowing window`, { width: 0.68, height: 0.82, depth: 0.09 }, scene);
        win.position.set(x + side * width * 0.31, height * 0.58, front - 0.01);
        win.material = materials.window;
        const sill = MeshBuilder.CreateBox(`${name} window sill`, { width: 0.88, height: 0.12, depth: 0.18 }, scene);
        sill.position.set(x + side * width * 0.31, height * 0.58 - 0.48, front - 0.06);
        sill.material = materials.bark;
        const mullion = MeshBuilder.CreateBox(`${name} window mullion`, { width: 0.07, height: 0.83, depth: 0.12 }, scene);
        mullion.position.set(x + side * width * 0.31, height * 0.58, front - 0.07);
        mullion.material = materials.bark;
        const corner = MeshBuilder.CreateBox(`${name} corner support`, { width: 0.2, height: height + 0.18, depth: 0.22 }, scene);
        corner.position.set(x + side * (width / 2 - 0.12), height / 2, z - depth / 2 - 0.07);
        corner.material = materials.bark;
    }
    const sign = MeshBuilder.CreateBox(`${name} signboard`, { width: 1.3, height: 0.55, depth: 0.09 }, scene);
    sign.position.set(x, height - 0.42, front - 0.16);
    sign.material = materials.paleStone;
    const signTrim = MeshBuilder.CreateBox(`${name} sign lettering plate`, { width: 1.08, height: 0.36, depth: 0.04 }, scene);
    signTrim.position.set(x, height - 0.42, front - 0.22);
    signTrim.material = roofColor;
    return building;
}
function makeCharacter(name, outfit, weaponMaterial = materials.gold, size = 1, role = 'warrior') {
    const root = new TransformNode(`${name}-root`, scene);
    const darkCloth = mat(`${name} shadow cloth`, new Color3(0.09, 0.16, 0.13));
    const metal = mat(`${name} crafted armour`, new Color3(0.43, 0.48, 0.43), new Color3(0.025, 0.03, 0.025));
    metal.specularColor = new Color3(0.55, 0.59, 0.49);
    metal.specularPower = 96;
    const body = MeshBuilder.CreateCapsule(`${name}-body`, { height: 1.34 * size, radius: 0.39 * size, tessellation: 16 }, scene);
    body.parent = root;
    body.position.y = 1.02 * size;
    body.material = outfit;
    addShadow(body);
    const chest = MeshBuilder.CreateCylinder(`${name}-chest cuirass`, { height: 0.8 * size, diameterTop: 0.68 * size, diameterBottom: 0.86 * size, tessellation: 12 }, scene);
    chest.parent = root;
    chest.position.y = 1.25 * size;
    chest.material = metal;
    addShadow(chest);
    const collar = MeshBuilder.CreateTorus(`${name}-collar`, { diameter: 0.62 * size, thickness: 0.09 * size, tessellation: 16 }, scene);
    collar.parent = root;
    collar.position.y = 1.69 * size;
    collar.material = weaponMaterial;
    const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.55 * size, segments: 18 }, scene);
    head.parent = root;
    head.position.y = 2.0 * size;
    head.material = materials.skin;
    addShadow(head);
    const hood = MeshBuilder.CreateSphere(`${name}-hood`, { diameter: 0.68 * size, segments: 16 }, scene);
    hood.parent = root;
    hood.position.set(0, 2.12 * size, -0.13 * size);
    hood.scaling.set(1.0, 0.93, 0.92);
    hood.material = outfit;
    // The face remains visible while the hood frames the head.
    const faceShade = MeshBuilder.CreateBox(`${name}-face brow`, { width: 0.38 * size, height: 0.07 * size, depth: 0.08 * size }, scene);
    faceShade.parent = root;
    faceShade.position.set(0, 2.12 * size, 0.25 * size);
    faceShade.material = darkCloth;
    const eyeMaterial = mat(`${name} eyes`, new Color3(0.12, 0.085, 0.06));
    for (const side of [-1, 1]) {
        const eye = MeshBuilder.CreateSphere(`${name}-eye`, { diameter: 0.055 * size, segments: 8 }, scene);
        eye.parent = root;
        eye.position.set(side * 0.105 * size, 2.0 * size, 0.266 * size);
        eye.material = eyeMaterial;
    }
    const nose = MeshBuilder.CreateSphere(`${name}-nose`, { diameter: 0.075 * size, segments: 8 }, scene);
    nose.parent = root;
    nose.position.set(0, 1.94 * size, 0.27 * size);
    nose.material = materials.skin;
    const cloak = MeshBuilder.CreateCylinder(`${name}-travel cloak`, { height: 1.3 * size, diameterTop: 0.22 * size, diameterBottom: 1.12 * size, tessellation: 16 }, scene);
    cloak.parent = root;
    cloak.position.set(0, 0.86 * size, -0.27 * size);
    cloak.rotation.x = -0.06;
    cloak.material = outfit;
    addShadow(cloak);
    const belt = MeshBuilder.CreateTorus(`${name}-belt`, { diameter: 0.76 * size, thickness: 0.075 * size, tessellation: 18 }, scene);
    belt.parent = root;
    belt.position.y = 0.88 * size;
    belt.scaling.z = 0.86;
    belt.material = materials.gold;
    const emblem = MeshBuilder.CreatePolyhedron(`${name}-chest crest`, { type: 1, size: 0.16 * size }, scene);
    emblem.parent = root;
    emblem.position.set(0, 1.34 * size, 0.39 * size);
    emblem.material = weaponMaterial;
    // Arms, articulated-looking gloves and shoulder guards.
    const arms = [];
    const legs = [];
    const gloves = [];
    for (const side of [-1, 1]) {
        const shoulder = MeshBuilder.CreateSphere(`${name}-pauldron`, { diameter: 0.5 * size, segments: 12 }, scene);
        shoulder.parent = root;
        shoulder.position.set(side * 0.46 * size, 1.48 * size, 0);
        shoulder.scaling.set(1.25, 0.78, 1.0);
        shoulder.material = metal;
        const arm = MeshBuilder.CreateCylinder(`${name}-arm`, { height: 0.78 * size, diameterTop: 0.2 * size, diameterBottom: 0.27 * size, tessellation: 10 }, scene);
        arm.parent = root;
        arm.position.set(side * 0.51 * size, 1.03 * size, 0.03 * size);
        arm.rotation.z = side * -0.14;
        arm.material = outfit;
        arms.push(arm);
        const glove = MeshBuilder.CreateSphere(`${name}-glove`, { diameter: 0.25 * size, segments: 10 }, scene);
        glove.parent = root;
        glove.position.set(side * 0.55 * size, 0.65 * size, 0.08 * size);
        glove.material = darkCloth;
        gloves.push(glove);
        const leg = MeshBuilder.CreateCylinder(`${name}-leg`, { height: 0.72 * size, diameterTop: 0.26 * size, diameterBottom: 0.22 * size, tessellation: 10 }, scene);
        leg.parent = root;
        leg.position.set(side * 0.2 * size, 0.38 * size, 0.02 * size);
        leg.material = darkCloth;
        legs.push(leg);
        const boot = MeshBuilder.CreateBox(`${name}-boot`, { width: 0.33 * size, height: 0.2 * size, depth: 0.52 * size }, scene);
        boot.parent = root;
        boot.position.set(side * 0.2 * size, 0.12 * size, 0.12 * size);
        boot.material = materials.bark;
    }
    // Detailed hand-held blade: grip, crossguard, pommel and bright steel edge.
    const weaponRoot = new TransformNode(`${name}-weapon-pivot`, scene);
    weaponRoot.parent = root;
    weaponRoot.position.set(0.56 * size, 1.02 * size, 0.11 * size);
    weaponRoot.rotation.z = -0.25;
    const weapon = MeshBuilder.CreateBox(`${name}-weapon`, { width: 0.11 * size, height: 0.91 * size, depth: 0.055 * size }, scene);
    weapon.parent = weaponRoot;
    weapon.position.y = 0.5 * size;
    weapon.material = weaponMaterial;
    addShadow(weapon);
    const grip = MeshBuilder.CreateCylinder(`${name}-weapon grip`, { height: 0.29 * size, diameter: 0.105 * size, tessellation: 8 }, scene);
    grip.parent = weaponRoot;
    grip.position.y = -0.07 * size;
    grip.material = darkCloth;
    const guard = MeshBuilder.CreateBox(`${name}-weapon guard`, { width: 0.42 * size, height: 0.075 * size, depth: 0.11 * size }, scene);
    guard.parent = weaponRoot;
    guard.position.y = 0.12 * size;
    guard.material = materials.gold;
    const pommel = MeshBuilder.CreateSphere(`${name}-weapon pommel`, { diameter: 0.14 * size, segments: 8 }, scene);
    pommel.parent = weaponRoot;
    pommel.position.y = -0.23 * size;
    pommel.material = materials.gold;

    // Each role gets a recognisable silhouette and its own weapon instead of everyone carrying a sword.
    const staffRoot = new TransformNode(`${name}-staff-pivot`, scene);
    staffRoot.parent = root;
    staffRoot.position.set(0.55 * size, 0.8 * size, 0.12 * size);
    const staffPole = MeshBuilder.CreateCylinder(`${name}-staff-shaft`, { height: 2.15 * size, diameterTop: 0.075 * size, diameterBottom: 0.12 * size, tessellation: 10 }, scene);
    staffPole.parent = staffRoot;
    staffPole.position.y = 0.55 * size;
    staffPole.material = materials.bark;
    const staffCrystal = MeshBuilder.CreatePolyhedron(`${name}-staff-crystal`, { type: 1, size: 0.28 * size }, scene);
    staffCrystal.parent = staffRoot;
    staffCrystal.position.y = 1.72 * size;
    staffCrystal.scaling.set(0.72, 1.2, 0.72);
    staffCrystal.material = weaponMaterial;
    glowLayer.addIncludedOnlyMesh(staffCrystal);

    const bowRoot = new TransformNode(`${name}-bow-pivot`, scene);
    bowRoot.parent = root;
    bowRoot.position.set(0.58 * size, 1.05 * size, 0.12 * size);
    const bow = MeshBuilder.CreateTorus(`${name}-curved-bow`, { diameter: 1.08 * size, thickness: 0.085 * size, tessellation: 24 }, scene);
    bow.parent = bowRoot;
    bow.scaling.x = 0.58;
    bow.rotation.z = Math.PI / 2;
    bow.material = materials.bark;
        const bowString = MeshBuilder.CreateCylinder(`${name}-bow-string`, { height: 0.96 * size, diameter: 0.018 * size, tessellation: 6 }, scene);
    bowString.parent = bowRoot;
    bowString.rotation.z = Math.PI / 2;
    bowString.material = materials.gold;
    const quiver = MeshBuilder.CreateCylinder(`${name}-arrow-quiver`, { height: 0.88 * size, diameter: 0.25 * size, tessellation: 8 }, scene);
    quiver.parent = root;
    quiver.position.set(-0.42 * size, 1.12 * size, -0.25 * size);
    quiver.rotation.z = -0.22;
    quiver.material = materials.bark;
    const arrowFletching = MeshBuilder.CreateBox(`${name}-quiver-fletching`, { width: 0.34 * size, height: 0.12 * size, depth: 0.3 * size }, scene);
    arrowFletching.parent = quiver;
    arrowFletching.position.y = 0.48 * size;
    arrowFletching.material = materials.gold;

    const shield = MeshBuilder.CreateCylinder(`${name}-knight-shield`, { height: 0.16 * size, diameter: 0.95 * size, tessellation: 6 }, scene);
    shield.parent = root;
    shield.position.set(-0.63 * size, 1.0 * size, 0.24 * size);
    shield.rotation.z = Math.PI / 2;
    shield.scaling.y = 0.82;
    shield.material = materials.paleStone;
    const shieldBoss = MeshBuilder.CreateSphere(`${name}-shield-boss`, { diameter: 0.23 * size, segments: 8 }, scene);
    shieldBoss.parent = shield;
    shieldBoss.position.z = 0.11 * size;
    shieldBoss.material = materials.gold;

    const roleCrest = MeshBuilder.CreateCylinder(`${name}-role-crest`, { height: 0.08 * size, diameter: 0.42 * size, tessellation: 6 }, scene);
    roleCrest.parent = root;
    roleCrest.position.set(0, 2.43 * size, -0.02 * size);
    roleCrest.material = weaponMaterial;
    const model = { root, body, head, weapon, weaponRoot, staffRoot, staffCrystal, bowRoot, shield, arms, gloves, legs, cloak, role, roleCrest };
    setCharacterRole(model, role);
    return model;
}
function setCharacterRole(model, role) {
    model.role = role || 'warrior';
    const usesStaff = model.role === 'mage' || model.role === 'healer' || model.role === 'summoner';
    model.weaponRoot.setEnabled(!usesStaff && model.role !== 'ranger');
    model.staffRoot.setEnabled(usesStaff);
    model.bowRoot.setEnabled(model.role === 'ranger');
    model.shield.setEnabled(model.role === 'knight');
    model.roleCrest.setEnabled(model.role === 'mage' || model.role === 'healer' || model.role === 'summoner');
    model.activeWeaponRoot = usesStaff ? model.staffRoot : model.role === 'ranger' ? model.bowRoot : model.weaponRoot;
    if (model.role === 'mage') {
        model.staffCrystal.material = materials.crystal;
        model.cloak.scaling.y = 1.18;
    } else if (model.role === 'healer') {
        model.staffCrystal.material = materials.heal;
        model.cloak.scaling.y = 1.32;
    } else if (model.role === 'summoner') {
        model.staffCrystal.material = materials.mireGlow;
        model.cloak.scaling.y = 1.22;
    } else if (model.role === 'ranger') {
        model.cloak.scaling.y = 0.9;
    } else {
        model.cloak.scaling.y = 1;
    }
}
function animateCharacterAttack(model) {
    if (!model || !model.activeWeaponRoot || !model.root) return;
    if (model._attackRaf) cancelAnimationFrame(model._attackRaf);

    const role = String(model.role || 'warrior').toLowerCase();
    const pivot = model.activeWeaponRoot;
    const baseRotation = pivot.rotation.clone();
    const baseRootRotation = model.root.rotation.clone();
    const armBases = (model.arms || []).map(arm => arm.rotation.clone());
    const startedAt = performance.now();
    const duration = role === 'ranger' || role === 'archer' ? 540 :
        role === 'mage' || role === 'healer' ? 650 : 470;

    const frame = now => {
        const p = Math.min(1, (now - startedAt) / duration);
        const pulse = Math.sin(Math.PI * p);
        const arm0 = model.arms && model.arms[0];
        const arm1 = model.arms && model.arms[1];

        if (role === 'ranger' || role === 'archer') {
            // Draw the bow, hold the string, then release. The arrow is launched by the attack logic.
            const draw = p < 0.48 ? Math.sin((p / 0.48) * Math.PI / 2) :
                p < 0.62 ? 1 - (p - 0.48) / 0.14 : 0;
            pivot.rotation.x = baseRotation.x - draw * 0.28;
            pivot.rotation.z = baseRotation.z + draw * 0.42;
            if (arm0) arm0.rotation.x = armBases[0].x - draw * 0.82;
            if (arm1) arm1.rotation.x = armBases[1].x + draw * 0.28;
        } else if (role === 'mage' || role === 'healer') {
            // Wand/staff traces a smooth circle in the air before the spell is released.
            const circle = p * Math.PI * 2;
            pivot.rotation.x = baseRotation.x + Math.cos(circle) * 0.34;
            pivot.rotation.z = baseRotation.z + Math.sin(circle) * 0.48;
            if (arm0) {
                arm0.rotation.x = armBases[0].x - Math.sin(circle) * 0.34;
                arm0.rotation.z = armBases[0].z + Math.cos(circle) * 0.18;
            }
            model.root.rotation.x = -pulse * 0.035;
        } else {
            // Knight and warrior: pull the blade back, then tilt and sweep it across the target.
            const windup = p < 0.28 ? p / 0.28 : 0;
            const slash = p >= 0.28 && p <= 0.78 ? Math.sin(((p - 0.28) / 0.50) * Math.PI) : 0;
            pivot.rotation.x = baseRotation.x - windup * 0.58 - slash * 1.12;
            pivot.rotation.z = baseRotation.z - windup * 0.36 + slash * 1.22;
            if (arm0) {
                arm0.rotation.x = armBases[0].x - windup * 0.28 - slash * 0.72;
                arm0.rotation.z = armBases[0].z - windup * 0.18 + slash * 0.48;
            }
            model.root.rotation.x = -slash * 0.075;
        }

        if (p < 1) {
            model._attackRaf = requestAnimationFrame(frame);
        } else {
            pivot.rotation.copyFrom(baseRotation);
            model.root.rotation.copyFrom(baseRootRotation);
            (model.arms || []).forEach((arm, i) => arm.rotation.copyFrom(armBases[i]));
            model._attackRaf = 0;
        }
    };
    model._attackRaf = requestAnimationFrame(frame);
}

function animateCharacterGuard(model, guarding, dt = 0.16) {
    if (!model || !model.shield || !model.shield.isEnabled()) return;
    if (!model._shieldBase) {
        model._shieldBase = {
            position: model.shield.position.clone(),
            rotation: model.shield.rotation.clone()
        };
    }
    const base = model._shieldBase;
    const alpha = Math.min(1, dt * 10);
    const targetPosition = guarding
        ? base.position.add(new Vector3(0.02, 0.16, 0.34))
        : base.position;
    const targetRotation = guarding
        ? base.rotation.add(new Vector3(-0.22, 0, -0.12))
        : base.rotation;
    model.shield.position = Vector3.Lerp(model.shield.position, targetPosition, alpha);
    model.shield.rotation = Vector3.Lerp(model.shield.rotation, targetRotation, alpha);
}

// SIMPLE MAGIC-GLYPH SIZE CONTROLS:
// Change MAGIC_GLYPH_SIZE_MULTIPLIER to resize every circle AND its star.
// 1 = previous size, 2 = twice as large, 1.5 = 50% larger, etc.
const MAGIC_GLYPH_SIZE_MULTIPLIER = 2;
// Frost Nova's floor glyph has a radius equal to 2x the target's visible radius.
const FROST_GLYPH_TARGET_RADIUS_MULTIPLIER = 2;

function getTargetVisualRadius(target) {
    if (!target || !target.root || target.root.isDisposed()) return 0.9;
    try {
        const bounds = target.root.getHierarchyBoundingVectors(true);
        const width = bounds.max.x - bounds.min.x;
        const depth = bounds.max.z - bounds.min.z;
        return Math.max(width, depth) * 0.5;
    } catch (error) {
        return 0.9;
    }
}

function drawMagicGlyph(position, color, options = {}, onComplete = null) {
    const size = (options.size || 0.72) * MAGIC_GLYPH_SIZE_MULTIPLIER;
    const floor = !!options.floor;
    const yaw = options.yaw || 0;
    const duration = options.duration || 760;
    const root = new TransformNode('self-drawing magic glyph', scene);
    root.position.copyFrom(position);
    if (!floor) root.rotation.y = yaw;

    const circlePoints = [];
    for (let i = 0; i <= 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        circlePoints.push(floor
            ? new Vector3(Math.cos(angle) * size, 0, Math.sin(angle) * size)
            : new Vector3(Math.cos(angle) * size, Math.sin(angle) * size, 0));
    }

    const starPoints = [];
    for (let i = 0; i <= 5; i++) {
        const vertex = (i * 2) % 5;
        const angle = -Math.PI / 2 + vertex * Math.PI * 2 / 5;
        const radius = size * 0.73;
        starPoints.push(floor
            ? new Vector3(Math.cos(angle) * radius, 0.014, Math.sin(angle) * radius)
            : new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.014));
    }

    let circle = null;
    let star = null;
    let lastCircleCount = 0;
    let lastStarCount = 0;
    const drawLine = (previous, name, points, progress, lastCount) => {
        const count = Math.max(2, Math.min(points.length, Math.floor((points.length - 1) * progress) + 1));
        if (count === lastCount) return { mesh: previous, count: lastCount };
        if (previous && !previous.isDisposed()) previous.dispose();
        const line = MeshBuilder.CreateLines(name, { points: points.slice(0, count) }, scene);
        line.parent = root;
        line.color = color.clone();
        line.alpha = 0.98;
        line.isPickable = false;
        return { mesh: line, count };
    };

    const start = performance.now();
    const frame = now => {
        if (root.isDisposed()) return;
        const p = Math.min(1, (now - start) / duration);
        const circleProgress = Math.min(1, p / 0.54);
        const starProgress = Math.max(0, Math.min(1, (p - 0.54) / 0.46));
        const circleUpdate = drawLine(circle, 'magic circle being drawn', circlePoints, circleProgress, lastCircleCount);
        circle = circleUpdate.mesh;
        lastCircleCount = circleUpdate.count;
        if (starProgress > 0) {
            const starUpdate = drawLine(star, 'magic star being drawn', starPoints, starProgress, lastStarCount);
            star = starUpdate.mesh;
            lastStarCount = starUpdate.count;
        }
        if (p < 1) {
            requestAnimationFrame(frame);
        } else {
            root.dispose();
            if (typeof onComplete === 'function') onComplete();
        }
    };
    requestAnimationFrame(frame);
}

function createRisingMagicBeam(position, color, height = 2.15, diameter = 0.62, duration = 520, onComplete = null) {
    const beamMaterial = new StandardMaterial('temporary rising magic beam material', scene);
    beamMaterial.diffuseColor = color.clone();
    beamMaterial.emissiveColor = color.scale(0.75);
    beamMaterial.alpha = 0.44;
    beamMaterial.backFaceCulling = false;

    const beam = MeshBuilder.CreateCylinder('rising vertical spell beam', {
        height: 1, diameter, tessellation: 18
    }, scene);
    beam.position.set(position.x, 0.08, position.z);
    beam.scaling.y = 0.02;
    beam.material = beamMaterial;
    beam.isPickable = false;

    const rim = MeshBuilder.CreateTorus('magic beam ground halo', {
        diameter: diameter * 1.55, thickness: 0.035, tessellation: 24
    }, scene);
    rim.position.set(position.x, 0.09, position.z);
    rim.rotation.x = Math.PI / 2;
    rim.material = beamMaterial;
    rim.isPickable = false;

    const start = performance.now();
    const frame = now => {
        const p = Math.min(1, (now - start) / duration);
        const rise = Math.min(1, p / 0.68);
        beam.scaling.y = Math.max(0.02, height * rise);
        beam.position.y = 0.08 + beam.scaling.y / 2;
        beamMaterial.alpha = 0.44 * (1 - Math.max(0, (p - 0.68) / 0.32));
        rim.scaling.setAll(0.85 + p * 0.45);
        rim.visibility = 1 - p;
        if (p < 1) requestAnimationFrame(frame);
        else {
            beam.dispose();
            rim.dispose();
            beamMaterial.dispose();
            if (typeof onComplete === 'function') onComplete();
        }
    };
    requestAnimationFrame(frame);
}

function playHealingEffect(root) {
    if (!root || root.isDisposed()) return;
    const groundPosition = root.position.add(new Vector3(0, 0.045, 0));
    const green = new Color3(0.28, 1, 0.48);
    drawMagicGlyph(groundPosition, green, { floor: true, size: 0.66, duration: 720 }, () => {
        if (!root.isDisposed()) {
            createRisingMagicBeam(root.position, green, 2.48, 0.56, 620);
        }
    });
}

function restoreFrozenEnemy(enemy) {
    if (!enemy || !enemy.frozenMeshes) return;
    for (const item of enemy.frozenMeshes) {
        if (item.mesh && !item.mesh.isDisposed()) item.mesh.material = item.material;
    }
    enemy.frozenMeshes = null;
    enemy.frozenTimer = 0;
}

function freezeEnemy(enemy, seconds = 2.6) {
    if (!enemy || enemy.dead || !enemy.root || enemy.root.isDisposed()) return;
    if (!enemy.frozenMeshes) {
        const meshes = [enemy.body, ...enemy.root.getChildMeshes()];
        const unique = Array.from(new Set(meshes.filter(mesh => mesh && !mesh.isDisposed())));
        enemy.frozenMeshes = unique.map(mesh => ({ mesh, material: mesh.material }));
    }
    for (const item of enemy.frozenMeshes) {
        if (item.mesh && !item.mesh.isDisposed()) item.mesh.material = materials.ice;
    }
    enemy.frozenTimer = Math.max(enemy.frozenTimer || 0, seconds);
}
function animateCharacterMovement(model, moving, time) {
    if (!model || !model.legs) return;
    const amount = moving ? 0.48 : 0;
    const phase = time * 9;
    model.legs[0].rotation.x = Math.sin(phase) * amount;
    model.legs[1].rotation.x = -Math.sin(phase) * amount;
    if (!model._attackRaf && model.arms && model.arms.length >= 2) {
        model.arms[0].rotation.x = -Math.sin(phase) * amount * 0.72;
        model.arms[1].rotation.x = Math.sin(phase) * amount * 0.72;
    }
}
function makeInteractableMarker(position, color) {
    const marker = MeshBuilder.CreateTorus('interaction marker', { diameter: 1.05, thickness: 0.055, tessellation: 24 }, scene);
    marker.position.copyFrom(position);
    marker.position.y = 0.07;
    marker.rotation.x = Math.PI / 2;
    marker.material = color;
    return marker;
}
// The forest is the next physical area north of camp. These offsets move its environment,
// lights and ambient particles as one continuous location, while leaving the headquarters in place.
const FOREST_OFFSET = new Vector3(80, 0, 35);
// The world remains one continuous map. The four new regions sit on the four routes
// leading out from the Emerald Forest and the southern road from headquarters.
const REGION_ORDER = ['forest', 'emberfall', 'frostveil', 'starfall', 'mire'];
const REGION_DATA = {
    forest: {
        id: 'forest', name: 'Emerald Forest', bossName: 'Grove Guardian', enemyName: 'Forest Wolf', difficulty: 1,
        requiredKills: 8, center: new Vector3(80, 0, -93), entryPosition: new Vector3(80, 0, 48),
        bounds: { minX: 18, maxX: 162, minZ: -240, maxZ: 54 },
        bossPosition: new Vector3(80, 0, -214), cagePosition: new Vector3(80, 4.8, -228),
        dungeonPosition: new Vector3(108, 0, -92), dungeonRoomPosition: new Vector3(140, 0, -92),
        entryDirection: new Vector3(0, 0, 1), enemyMaterial: materials.enemy, bossMaterial: materials.bark,
        crystalMaterial: materials.crystal, companionId: 'aurelia', rewardGold: 250, rewardXP: 300,
        mobPositions: [
            new Vector3(-10,0,2), new Vector3(11,0,-28), new Vector3(-13,0,-58), new Vector3(12,0,-88),
            new Vector3(-11,0,-120), new Vector3(13,0,-151), new Vector3(-8,0,-181), new Vector3(3,0,-202)
        ]
    },
    emberfall: {
        id: 'emberfall', name: 'Emberfall Highlands', bossName: 'The Cinderheart Colossus', enemyName: 'Ashfang', difficulty: 1.6,
        requiredKills: 8, center: new Vector3(80, 0, -380), entryPosition: new Vector3(80,0,-248),
        bounds: { minX: 18, maxX: 162, minZ: -520, maxZ: -241 },
        bossPosition: new Vector3(80, 0, -494), cagePosition: new Vector3(80, 4.8, -508),
        dungeonPosition: new Vector3(108,0,-380), dungeonRoomPosition: new Vector3(140,0,-380),
        entryDirection: new Vector3(0, 0, 1), enemyMaterial: materials.emberGlow, bossMaterial: materials.emberGround,
        crystalMaterial: materials.emberGlow, companionId: 'darian', rewardGold: 360, rewardXP: 440,
        mobPositions: Array.from({length:8},(_,i)=>new Vector3(80 + [-11,12,-14,13,-12,14,-9,2][i],0,-272-i*25))
    },
    frostveil: {
        id: 'frostveil', name: 'Frostveil Tundra', bossName: 'The Pale Glacier Wyrm', enemyName: 'Rime Stalker', difficulty: 2.25,
        requiredKills: 8, center: new Vector3(80, 0, -660), entryPosition: new Vector3(80,0,-528),
        bounds: { minX: 18, maxX: 162, minZ: -800, maxZ: -521 },
        bossPosition: new Vector3(80, 0, -774), cagePosition: new Vector3(80, 4.8, -788),
        dungeonPosition: new Vector3(108,0,-660), dungeonRoomPosition: new Vector3(140,0,-660),
        entryDirection: new Vector3(0, 0, 1), enemyMaterial: materials.frostCrystal, bossMaterial: materials.frostGround,
        crystalMaterial: materials.frostCrystal, companionId: 'nyra', rewardGold: 420, rewardXP: 520,
        mobPositions: Array.from({length:8},(_,i)=>new Vector3(80 + [-11,12,-14,13,-12,14,-9,2][i],0,-552-i*25))
    },
    starfall: {
        id: 'starfall', name: 'Starfall Expanse', bossName: 'The Sunken Star Sentinel', enemyName: 'Dune Wraith', difficulty: 2.9,
        requiredKills: 8, center: new Vector3(80, 0, -940), entryPosition: new Vector3(80,0,-808),
        bounds: { minX: 18, maxX: 162, minZ: -1080, maxZ: -801 },
        bossPosition: new Vector3(80, 0, -1054), cagePosition: new Vector3(80, 4.8, -1068),
        dungeonPosition: new Vector3(108,0,-940), dungeonRoomPosition: new Vector3(140,0,-940),
        entryDirection: new Vector3(0, 0, 1), enemyMaterial: materials.starCrystal, bossMaterial: materials.starGround,
        crystalMaterial: materials.starCrystal, companionId: 'seren', rewardGold: 560, rewardXP: 700,
        mobPositions: Array.from({length:8},(_,i)=>new Vector3(80 + [-11,12,-14,13,-12,14,-9,2][i],0,-832-i*25))
    },
    mire: {
        id: 'mire', name: 'Sunken Mire', bossName: 'The Hollowfen Behemoth', enemyName: 'Mirebound', difficulty: 3.55,
        requiredKills: 8, center: new Vector3(80, 0, -1220), entryPosition: new Vector3(80,0,-1088),
        bounds: { minX: 18, maxX: 162, minZ: -1360, maxZ: -1081 },
        bossPosition: new Vector3(80, 0, -1334), cagePosition: new Vector3(80, 4.8, -1348),
        dungeonPosition: new Vector3(108,0,-1220), dungeonRoomPosition: new Vector3(140,0,-1220),
        entryDirection: new Vector3(0, 0, 1), enemyMaterial: materials.mireGlow, bossMaterial: materials.mireGround,
        crystalMaterial: materials.mireGlow, companionId: 'rowan', rewardGold: 640, rewardXP: 820,
        mobPositions: Array.from({length:8},(_,i)=>new Vector3(80 + [-11,12,-14,13,-12,14,-9,2][i],0,-1112-i*25))
    }
};
function freshRegionProgress() {
    return Object.fromEntries(Object.keys(REGION_DATA).map(id => [id, { kills: 0, elapsed: 0, ambushesTriggered: 0, bossUnlocked: false, bossDefeated: false, rescued: false, dungeonCleared: false }]));
}
const regionHazards = [];
const dungeonLandmarks = [];
const forestMeshStart = scene.meshes.length;
const forestTransformStart = scene.transformNodes.length;
const forestLightStart = scene.lights.length;

// Two physical areas are laid out in the same 3D world: the home base and one forest region.
const forestGround = MeshBuilder.CreateGround('emerald forest floor', { width: 132, height: 300, subdivisions: 4 }, scene);
forestGround.material = materials.grass;
forestGround.position.set(0, 0.015, -137);
forestGround.scaling.z = 1;
forestGround.receiveShadows = true;
const forestPath = MeshBuilder.CreateGround('forest stone path', { width: 7.2, height: 286, subdivisions: 3 }, scene);
forestPath.position.set(0, 0.025, -137);
forestPath.rotation.y = -0.12;
forestPath.material = materials.path;
forestPath.receiveShadows = true;
for (let i = 0; i < 40; i++) {
    const angle = i * 2.399;
    const radius = 13 + (i % 7) * 2.55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 3;
    if (Math.abs(x) < 5.5 && z > -28 && z < 20)
        continue;
    makeTree(x, z, 0.72 + (i % 5) * 0.12, i % 3);
}
for (let i = 0; i < 28; i++)
    makeRock(Math.sin(i * 7.2) * (5 + (i % 4) * 2.4), Math.cos(i * 3.4) * (8 + (i % 3) * 3) - 2, 0.42 + (i % 4) * 0.16);
// More woodland along the long trail so the first region feels like an expedition, not a small arena.
for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1;
    const localZ = -18 - Math.floor(i / 2) * 13.2;
    const x = side * (10.5 + (i % 4) * 2.3);
    makeTree(x, localZ, 0.78 + (i % 4) * 0.1, i % 3);
    if (i % 3 === 0) makeRock(x * 0.72, localZ - 4.5, 0.42 + (i % 3) * 0.12);
}
const forestCrystalMeshes = [makeCrystalMesh(-7.8, 4.5, 0.9), makeCrystalMesh(9.1, 1.8, 1.0), makeCrystalMesh(-10.5, -15.8, 0.75)];
for (let i = 0; i < 4; i++) {
    const stone = MeshBuilder.CreateBox('ancient forest marker', { width: 0.65, height: 2.2 + i * 0.12, depth: 0.7 }, scene);
    stone.position.set(6.3 + i * 0.88, 1.1, 13 + (i % 2) * 0.4);
    stone.rotation.z = (i - 1.5) * 0.06;
    stone.material = materials.paleStone;
}
const fallenLog = MeshBuilder.CreateCylinder('fallen forest log', { height: 5.8, diameter: 0.65, tessellation: 8 }, scene);
fallenLog.position.set(-9, 0.43, 8);
fallenLog.rotation.z = Math.PI / 2.15;
fallenLog.material = materials.bark;
// Rich environmental dressing: stepping stones, ferns, wildflowers, mushrooms, water and ancient ruins.
for (let i = 0; i < 21; i++) {
    const z = 17 - i * 2.15;
    const x = Math.sin(i * 1.7) * 0.72;
    const slab = MeshBuilder.CreateBox('worn path flagstone', { width: 3.5 + (i % 3) * 0.35, height: 0.16, depth: 1.55 + (i % 2) * 0.2 }, scene);
    slab.position.set(x, 0.13, z - 3);
    slab.rotation.y = Math.sin(i * 3.1) * 0.08;
    slab.rotation.x = 0.015 * Math.cos(i);
    slab.material = materials.paleStone;
    addShadow(slab);
}
for (let i = 0; i < 48; i++) {
    const angle = i * 2.399;
    const radius = 6.2 + (i % 5) * 2.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 3;
    if (Math.abs(x) < 4.2 && z > -27 && z < 18)
        continue;
    const fernRoot = new TransformNode('fern cluster', scene);
    fernRoot.position.set(x, 0, z);
    fernRoot.rotation.y = angle;
    for (let f = 0; f < 7; f++) {
        const a = f * Math.PI * 2 / 7;
        const frond = MeshBuilder.CreateSphere('fern frond', { diameter: 0.78 + (f % 3) * 0.12, segments: 8 }, scene);
        frond.parent = fernRoot;
        frond.position.set(Math.cos(a) * 0.38, 0.32 + (f % 2) * 0.08, Math.sin(a) * 0.38);
        frond.scaling.set(0.25, 0.075, 0.72);
        frond.rotation.y = -a;
        frond.rotation.x = -0.25;
        frond.material = f % 3 === 0 ? materials.leafBright : materials.fern;
    }
    const fernHeart = MeshBuilder.CreateSphere('fern crown', { diameter: 0.3, segments: 8 }, scene);
    fernHeart.parent = fernRoot;
    fernHeart.position.y = 0.24;
    fernHeart.material = materials.leafBright;
}
for (let i = 0; i < 35; i++) {
    const angle = i * 2.17;
    const radius = 6 + (i % 6) * 2.05;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius - 3;
    if (Math.abs(x) < 4.8 && z > -24 && z < 16)
        continue;
    const stem = MeshBuilder.CreateCylinder('wildflower stem', { height: 0.38, diameter: 0.035, tessellation: 5 }, scene);
    stem.position.set(x, 0.19, z);
    stem.material = materials.fern;
    for (let petal = 0; petal < 5; petal++) {
        const bloom = MeshBuilder.CreateSphere('forest wildflower bloom', { diameter: 0.16, segments: 8 }, scene);
        const a = petal * Math.PI * 2 / 5;
        bloom.position.set(x + Math.cos(a) * 0.12, 0.43, z + Math.sin(a) * 0.12);
        bloom.scaling.set(1.0, 0.55, 0.72);
        bloom.material = petal % 2 ? materials.flower : materials.gold;
    }
}
for (let i = 0; i < 13; i++) {
    const x = -18 + (i * 3.17) % 35, z = 16 - (i * 5.7) % 34;
    const stalk = MeshBuilder.CreateCylinder('mushroom stem', { height: 0.4, diameter: 0.16, tessellation: 8 }, scene);
    stalk.position.set(x, 0.2, z);
    stalk.material = materials.paleStone;
    const cap = MeshBuilder.CreateSphere('mushroom cap', { diameter: 0.56, segments: 10 }, scene);
    cap.position.set(x, 0.43, z);
    cap.scaling.y = 0.48;
    cap.material = i % 3 === 0 ? materials.gold : materials.cloth;
    if (i % 4 === 0)
        glowLayer.addIncludedOnlyMesh(cap);
}
// A still pool with layered shoreline stones and a softly luminous surface.
const pool = MeshBuilder.CreateCylinder('hidden forest pool', { height: 0.09, diameter: 10, tessellation: 48 }, scene);
pool.position.set(18, 0.06, 5);
pool.scaling.set(1.22, 1, 0.78);
pool.material = materials.water;
const poolRim = MeshBuilder.CreateTorus('pool shoreline', { diameter: 10.2, thickness: 0.36, tessellation: 48 }, scene);
poolRim.position.set(18, 0.12, 5);
poolRim.rotation.x = Math.PI / 2;
poolRim.scaling.set(1.22, 0.78, 1);
poolRim.material = materials.stone;
for (let i = 0; i < 22; i++) {
    const a = i * Math.PI * 2 / 22;
    const r = 5.4 + Math.sin(i * 7) * 0.25;
    makeRock(18 + Math.cos(a) * r * 1.2, 5 + Math.sin(a) * r * 0.78, 0.24 + (i % 3) * 0.12);
}

function makeWorldRoad(from, to, width = 5.2) {
    const dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    const road = MeshBuilder.CreateGround('connecting regional stone road', { width, height: length + 3, subdivisions: 2 }, scene);
    road.position.set((from.x + to.x) / 2, 0.04, (from.z + to.z) / 2);
    road.rotation.y = Math.atan2(dx, dz);
    road.material = materials.path;
    road.receiveShadows = true;
    road.isPickable = false;
    return road;
}

function buildAdditionalRegions() {
    const configs = [REGION_DATA.emberfall, REGION_DATA.frostveil, REGION_DATA.mire, REGION_DATA.starfall];
    for (const region of configs) {
        const ground = MeshBuilder.CreateGround(`${region.name} terrain`, { width: 144, height: 286, subdivisions: 4 }, scene);
        ground.position.copyFrom(region.center);
        ground.position.y = 0.012;
        ground.material = region.id === 'emberfall' ? materials.emberGround : region.id === 'frostveil' ? materials.frostGround : region.id === 'mire' ? materials.mireGround : materials.starGround;
        ground.receiveShadows = true;
        const path = MeshBuilder.CreateGround(`${region.name} inner trail`, { width: 7.2, height: 268, subdivisions: 3 }, scene);
        path.position.copyFrom(region.center);
        path.position.y = 0.045;
        path.rotation.y = 0;
        path.material = region.id === 'frostveil' ? materials.frostCrystal : region.id === 'starfall' ? materials.paleStone : materials.path;
        path.receiveShadows = true;

        for (let i = 0; i < 22; i++) {
            const a = i * 2.399;
            const r = 17 + (i % 5) * 2.4;
            const x = region.center.x + Math.cos(a) * r;
            const z = region.center.z + Math.sin(a) * r;
            if (region.id === 'emberfall') {
                const basalt = MeshBuilder.CreatePolyhedron('Emberfall basalt spire', { type: 1, size: 1.25 + (i % 4) * 0.35 }, scene);
                basalt.position.set(x, 0.9 + (i % 3) * 0.35, z);
                basalt.scaling.set(0.9, 1.7 + (i % 3) * 0.35, 0.95);
                basalt.material = materials.bark;
                if (i % 4 === 0) {
                    const lava = MeshBuilder.CreateTorus('glowing lava vent', { diameter: 1.35, thickness: 0.09, tessellation: 20 }, scene);
                    lava.position.set(x, 0.12, z);
                    lava.rotation.x = Math.PI / 2;
                    lava.material = materials.emberGlow;
                }
            } else if (region.id === 'frostveil') {
                const pine = MeshBuilder.CreateCylinder('Frostveil ice pine', { height: 4.2 + (i % 3) * 0.7, diameterTop: 0, diameterBottom: 2.0, tessellation: 6 }, scene);
                pine.position.set(x, 2.1 + (i % 3) * 0.35, z);
                pine.material = materials.frostCrystal;
                const ice = MeshBuilder.CreatePolyhedron('blue ice outcrop', { type: 1, size: 0.7 + (i % 3) * 0.2 }, scene);
                ice.position.set(x + 1.3, 0.85, z - 0.8);
                ice.scaling.set(0.55, 1.65, 0.6);
                ice.material = materials.frostCrystal;
            } else if (region.id === 'mire') {
                const stump = MeshBuilder.CreateCylinder('Sunken Mire ancient stump', { height: 3.6 + (i % 3) * 0.45, diameterTop: 0.45, diameterBottom: 1.1, tessellation: 8 }, scene);
                stump.position.set(x, 1.8, z);
                stump.rotation.z = Math.sin(a) * 0.14;
                stump.material = materials.bark;
                const bogLight = MeshBuilder.CreateSphere('mire will-o-wisp', { diameter: 0.24, segments: 8 }, scene);
                bogLight.position.set(x + 1.1, 1.2 + (i % 3) * 0.25, z + 0.7);
                bogLight.material = materials.mireGlow;
                glowLayer.addIncludedOnlyMesh(bogLight);
            } else {
                const dune = MeshBuilder.CreatePolyhedron('Starfall sandstone ruin', { type: 1, size: 1.1 + (i % 3) * 0.3 }, scene);
                dune.position.set(x, 0.8, z);
                dune.scaling.set(1.0, 1.6, 0.8);
                dune.material = materials.paleStone;
                if (i % 3 === 0) {
                    const obelisk = MeshBuilder.CreateCylinder('Starfall fallen obelisk', { height: 4.8, diameterTop: 0.12, diameterBottom: 0.85, tessellation: 4 }, scene);
                    obelisk.position.set(x + 1.5, 2.2, z - 1.1);
                    obelisk.rotation.z = 0.12;
                    obelisk.material = materials.starCrystal;
                }
            }
        }
        // Scattered landmarks continue along the full trail, rather than clustering around the entry.
        for (let trailIndex = 0; trailIndex < 16; trailIndex++) {
            const trailZ = region.bounds.maxZ - 18 - trailIndex * 16.2;
            const side = trailIndex % 2 ? 1 : -1;
            const trailX = region.center.x + side * (13 + (trailIndex % 4) * 4.2);
            if (region.id === 'emberfall') {
                const basalt = MeshBuilder.CreatePolyhedron('Emberfall trail basalt', { type: 1, size: 0.9 + (trailIndex % 3) * 0.25 }, scene);
                basalt.position.set(trailX, 0.8, trailZ); basalt.scaling.set(0.9, 1.8, 0.9); basalt.material = materials.bark;
                if (trailIndex % 2 === 0) {
                    const vent = MeshBuilder.CreateTorus('Emberfall hot ground vent', { diameter: 2.1, thickness: 0.12, tessellation: 24 }, scene);
                    vent.position.set(trailX + side * 2.3, 0.12, trailZ - 3.5); vent.rotation.x = Math.PI / 2; vent.material = materials.emberGlow;
                    regionHazards.push({ regionId: 'emberfall', position: new Vector3(trailX + side * 2.3,0,trailZ - 3.5), radius: 1.7, damagePerSecond: 5 });
                }
            } else if (region.id === 'frostveil') {
                const shard = MeshBuilder.CreatePolyhedron('Frostveil trail ice spire', { type: 1, size: 0.8 + (trailIndex % 3) * 0.25 }, scene);
                shard.position.set(trailX, 1.3, trailZ); shard.scaling.set(0.6, 2.0, 0.7); shard.material = materials.frostCrystal;
            } else if (region.id === 'starfall') {
                const ruin = MeshBuilder.CreateBox('Starfall trail ruin', { width: 1.2, height: 2.7 + (trailIndex % 3) * 0.55, depth: 1.0 }, scene);
                ruin.position.set(trailX, ruin.scaling.y || 1.35, trailZ); ruin.rotation.z = side * 0.13; ruin.material = materials.paleStone;
                if (trailIndex % 3 === 0) {
                    const gem = MeshBuilder.CreatePolyhedron('Starfall trail sunstone', { type: 1, size: 0.5 }, scene);
                    gem.position.set(trailX + side * 1.3, 1.4, trailZ); gem.material = materials.starCrystal; glowLayer.addIncludedOnlyMesh(gem);
                }
            } else {
                const stump = MeshBuilder.CreateCylinder('Mire trail drowned stump', { height: 2.8, diameterTop: 0.38, diameterBottom: 0.9, tessellation: 8 }, scene);
                stump.position.set(trailX, 1.4, trailZ); stump.material = materials.bark;
                const wisp = MeshBuilder.CreateSphere('Mire trail wandering wisp', { diameter: 0.22, segments: 8 }, scene);
                wisp.position.set(trailX + side * 1.2, 1.25, trailZ + 0.8); wisp.material = materials.mireGlow; glowLayer.addIncludedOnlyMesh(wisp);
            }
        }

        // An optional side dungeon branches off the main road in every region.
        const dungeonArchMaterial = region.crystalMaterial;
        const dungeonX = region.dungeonPosition.x;
        const dungeonZ = region.dungeonPosition.z;
        for (const side of [-1, 1]) {
            const pillar = MeshBuilder.CreateBox(`${region.name} dungeon gate pillar`, { width: 1.2, height: 4.2, depth: 1.2 }, scene);
            pillar.position.set(dungeonX + side * 2.3, 2.1, dungeonZ); pillar.material = materials.stone; addShadow(pillar);
            const rune = MeshBuilder.CreateTorus(`${region.name} dungeon gate rune`, { diameter: 0.8, thickness: 0.08, tessellation: 20 }, scene);
            rune.position.set(dungeonX + side * 2.3, 2.3, dungeonZ + 0.68); rune.material = dungeonArchMaterial;
        }
        const dungeonLintel = MeshBuilder.CreateBox(`${region.name} dungeon lintel`, { width: 5.6, height: 0.75, depth: 1.0 }, scene);
        dungeonLintel.position.set(dungeonX, 4.25, dungeonZ); dungeonLintel.material = materials.stone;
        const dungeonPortal = MeshBuilder.CreateTorus(`${region.name} dungeon portal`, { diameter: 3.1, thickness: 0.16, tessellation: 32 }, scene);
        dungeonPortal.position.set(dungeonX, 1.8, dungeonZ + 0.35); dungeonPortal.material = dungeonArchMaterial;
        const dungeonRoom = MeshBuilder.CreateGround(`${region.name} dungeon chamber floor`, { width: 28, height: 28, subdivisions: 2 }, scene);
        dungeonRoom.position.copyFrom(region.dungeonRoomPosition); dungeonRoom.position.y = 0.015; dungeonRoom.material = region.id === 'emberfall' ? materials.emberGround : region.id === 'frostveil' ? materials.frostGround : region.id === 'starfall' ? materials.starGround : materials.mireGround;
        const roomMeshes = [dungeonRoom];
        const wallMaterial = region.id === 'emberfall' ? materials.bark : region.id === 'frostveil' ? materials.frostCrystal : region.id === 'starfall' ? materials.paleStone : materials.mireGround;
        for (const side of [-1,1]) {
            const wall=MeshBuilder.CreateBox(`${region.name} dungeon chamber wall`,{width:0.7,height:6,depth:28},scene);
            wall.position.set(region.dungeonRoomPosition.x+side*14,3,region.dungeonRoomPosition.z);wall.material=wallMaterial;roomMeshes.push(wall);
            const endWall=MeshBuilder.CreateBox(`${region.name} dungeon rear wall`,{width:28,height:6,depth:0.7},scene);
            endWall.position.set(region.dungeonRoomPosition.x,3,region.dungeonRoomPosition.z-side*14);endWall.material=wallMaterial;roomMeshes.push(endWall);
        }
        roomMeshes.forEach(mesh=>mesh.setEnabled(false));
        dungeonLandmarks.push({ regionId: region.id, portal: dungeonPortal, room: dungeonRoom, roomMeshes, roomPosition: region.dungeonRoomPosition.clone() });
        // A recognisable landmark marks the entrance to each region.
        const archMat = region.id === 'emberfall' ? materials.emberGlow : region.id === 'frostveil' ? materials.frostCrystal : region.id === 'mire' ? materials.mireGlow : materials.starCrystal;
        for (const side of [-1, 1]) {
            const pillar = MeshBuilder.CreateBox(`${region.name} entrance marker`, { width: 0.65, height: 4.2, depth: 0.7 }, scene);
            pillar.position.set(region.center.x + (region.id === 'frostveil' || region.id === 'mire' ? 0 : side * 3.3), 2.1, region.center.z + (region.id === 'frostveil' || region.id === 'mire' ? side * 3.3 : 25));
            pillar.material = archMat;
        }
    }
    // One connected expedition route: Forest -> Emberfall -> Frostveil -> Starfall -> Mire.
    for (const z of [-240, -520, -800, -1080]) makeWorldRoad(new Vector3(80,0,z+1), new Vector3(80,0,z-1), 7.2);
}
// The ancient grove gate frames the final encounter beyond the old path.
for (const side of [-1, 1]) {
    const pillar = MeshBuilder.CreateBox('ancient grove gate pillar', { width: 1.0, height: 5.4, depth: 1.1 }, scene);
    pillar.position.set(side * 4.1, 2.7, -217);
    pillar.material = materials.paleStone;
    addShadow(pillar);
    const capital = MeshBuilder.CreateCylinder('ancient gate capital', { height: 1.3, diameter: 1.55, tessellation: 6 }, scene);
    capital.position.set(side * 4.1, 5.35, -217);
    capital.rotation.y = Math.PI / 6;
    capital.material = materials.stone;
    const rune = MeshBuilder.CreateBox('gate rune', { width: 0.12, height: 1.8, depth: 0.04 }, scene);
    rune.position.set(side * 4.1, 2.9, -216.42);
    rune.material = materials.crystal;
    glowLayer.addIncludedOnlyMesh(rune);
}
const gateLintel = MeshBuilder.CreateBox('ancient grove gate lintel', { width: 9.2, height: 0.8, depth: 1.2 }, scene);
gateLintel.position.set(0, 5.55, -217);
gateLintel.material = materials.stone;
const groveRune = MeshBuilder.CreateTorus('grove guardian rune', { diameter: 2.0, thickness: 0.1, tessellation: 32 }, scene);
groveRune.position.set(0, 4.35, -216.35);
groveRune.material = materials.crystal;
glowLayer.addIncludedOnlyMesh(groveRune);
const fireflyMaterial = mat('soft green firefly light', new Color3(0.56, 0.94, 0.52), new Color3(0.3, 0.95, 0.35));
for (let i = 0; i < 40; i++) {
    const a = i * 2.399, r = 5 + (i % 8) * 2.65;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 3, y = 0.65 + (i % 5) * 0.48;
    const mote = MeshBuilder.CreateSphere('wandering forest firefly', { diameter: 0.105, segments: 8 }, scene);
    mote.position.set(x, y, z);
    mote.material = fireflyMaterial;
    mote.isPickable = false;
    glowLayer.addIncludedOnlyMesh(mote);
    mote.setEnabled(false);
    fireflies.push({ mesh: mote, x, y, z, phase: i * 1.71, speed: 0.55 + (i % 5) * 0.13 });
}
// Shift only top-level forest objects; child meshes and fern clusters follow their parents.
for (const mesh of scene.meshes.slice(forestMeshStart)) {
    if (!mesh.parent) mesh.position.addInPlace(FOREST_OFFSET);
}
for (const node of scene.transformNodes.slice(forestTransformStart)) {
    if (!node.parent) node.position.addInPlace(FOREST_OFFSET);
}
for (const light of scene.lights.slice(forestLightStart)) {
    if (light.position) light.position.addInPlace(FOREST_OFFSET);
}
for (const mote of fireflies) {
    mote.x += FOREST_OFFSET.x;
    mote.z += FOREST_OFFSET.z;
}
// Build the other four regions after the forest-only offset pass so their world coordinates stay exact.
buildAdditionalRegions();
// Home base: a small but explorable headquarters with distinct places to use.
const baseCenter = new Vector3(80, 0, 80);
const baseGround = MeshBuilder.CreateGround('headquarters grounds', { width: 48, height: 48, subdivisions: 2 }, scene);
baseGround.position.copyFrom(baseCenter);
baseGround.material = materials.grassLight;
baseGround.receiveShadows = true;
const baseCourtyard = MeshBuilder.CreateGround('base courtyard', { width: 15, height: 15 }, scene);
baseCourtyard.position.set(80, 0.03, 79);
baseCourtyard.material = materials.path;
baseCourtyard.receiveShadows = true;
for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI * 2 / 16;
    const radius = 20 + (i % 3) * 1.2;
    makeTree(80 + Math.cos(angle) * radius, 80 + Math.sin(angle) * radius, 0.82 + (i % 4) * 0.08, i % 3);
}
// Main approach, stone well, supply crates and a training target make the headquarters feel inhabited.
const baseApproach = MeshBuilder.CreateGround('base approach road', { width: 5.8, height: 23 }, scene);
// A continuous stone road links the headquarters courtyard to the Emerald Forest clearing.
const forestRoad = MeshBuilder.CreateGround('road to emerald forest', { width: 7.2, height: 42, subdivisions: 2 }, scene);
forestRoad.position.set(80, 0.035, 57);
forestRoad.rotation.y = 0;
forestRoad.material = materials.path;
forestRoad.receiveShadows = true;
for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const x = 80 + Math.sin(t * Math.PI) * 0.65;
    const z = 75 - t * 25;
    const stone = MeshBuilder.CreateBox('roadside worn paving stone', { width: 1.05 + (i % 3) * 0.18, height: 0.13, depth: 0.72 }, scene);
    stone.position.set(x + Math.sin(i * 1.9) * 3.4, 0.12, z + Math.cos(i * 1.3) * 2.0);
    stone.rotation.y = Math.sin(i) * 0.12;
    stone.material = i % 2 ? materials.paleStone : materials.stone;
}

baseApproach.position.set(80, 0.035, 66);
baseApproach.material = materials.path;
const wellRim = MeshBuilder.CreateCylinder('courtyard stone well', { height: 0.75, diameter: 2.2, tessellation: 16 }, scene);
wellRim.position.set(86, 0.38, 73);
wellRim.material = materials.paleStone;
const wellWater = MeshBuilder.CreateCylinder('well water', { height: 0.04, diameter: 1.7, tessellation: 24 }, scene);
wellWater.position.set(86, 0.78, 73);
wellWater.material = materials.water;
for (const [x, z] of [[74, 71], [75.2, 71.2], [94, 76]]) {
    const crate = MeshBuilder.CreateBox('supply crate', { width: 0.9, height: 0.8, depth: 0.85 }, scene);
    crate.position.set(x, 0.4, z);
    crate.rotation.y = x * 0.11;
    crate.material = materials.bark;
    const brace = MeshBuilder.CreateBox('crate brace', { width: 0.95, height: 0.09, depth: 0.1 }, scene);
    brace.parent = crate;
    brace.position.set(0, 0, 0.43);
    brace.material = materials.gold;
}
const trainingPost = MeshBuilder.CreateCylinder('training post', { height: 2.2, diameter: 0.25, tessellation: 10 }, scene);
trainingPost.position.set(94, 1.1, 70);
trainingPost.material = materials.bark;
const trainingTarget = MeshBuilder.CreateCylinder('training target', { height: 1.2, diameter: 0.75, tessellation: 12 }, scene);
trainingTarget.position.set(94, 1.65, 70.5);
trainingTarget.rotation.x = Math.PI / 2;
trainingTarget.material = materials.cloth;
makeBuilding('Headquarters', 80, 89, 8, 6, 4.2);
makeBuilding('Hospital', 68, 84, 5, 5, 3.2);
makeBuilding('Blacksmith', 92, 84, 5.5, 5, 3.3, materials.cloth);
makeBuilding('Barracks', 68, 70, 5.5, 5.5, 3.2);
makeBuilding('Library', 92, 70, 5, 5.5, 3.5);
// Lanterns and flags make the camp readable at night.
for (const [x, z] of [[73, 78], [87, 78], [73, 91], [87, 91], [80, 69]]) {
    const pole = MeshBuilder.CreateCylinder('camp lantern pole', { height: 3, diameter: 0.12 }, scene);
    pole.position.set(x, 1.5, z);
    pole.material = materials.bark;
    const lamp = MeshBuilder.CreateSphere('camp lantern', { diameter: 0.34, segments: 8 }, scene);
    lamp.position.set(x, 3.05, z);
    lamp.material = materials.gold;
    const light = new PointLight('camp lantern glow', new Vector3(x, 3, z), scene);
    light.diffuse = new Color3(1, 0.72, 0.35);
    light.intensity = 0.35;
    light.range = 7;
}
const planningTable = MeshBuilder.CreateBox('planning table', { width: 2.7, height: 0.32, depth: 1.7 }, scene);
planningTable.position.set(80, 1.05, 78);
planningTable.material = materials.house;
for (const [x, z] of [[78.9, 77.5], [81.1, 77.5], [78.9, 78.5], [81.1, 78.5]]) {
    const leg = MeshBuilder.CreateCylinder('planning table leg', { height: 1.0, diameter: 0.16 }, scene);
    leg.position.set(x, 0.5, z);
    leg.material = materials.bark;
}
const mapBoard = MeshBuilder.CreateBox('planning map board', { width: 1.65, height: 0.045, depth: 0.95 }, scene);
mapBoard.position.set(80, 1.25, 78);
mapBoard.material = materials.grassLight;
const planningMarker = makeInteractableMarker(new Vector3(80, 0.08, 78), materials.gold);
const bedBase = MeshBuilder.CreateBox('healing bed', { width: 2.1, height: 0.45, depth: 1.1 }, scene);
bedBase.position.set(80, 0.45, 91);
bedBase.material = materials.paleStone;
const bedCover = MeshBuilder.CreateBox('healing bed blanket', { width: 2.0, height: 0.12, depth: 0.95 }, scene);
bedCover.position.set(80, 0.75, 91);
bedCover.material = materials.cloth;
// Characters and companion roster.
let playerName = 'Wayfarer';
let playerClass = 'warrior';
let appearance = 'emerald';
const playerOutfit = mat('player outfit', new Color3(0.18, 0.36, 0.28));
const player = makeCharacter('player', playerOutfit, materials.gold, 1, 'warrior');
player.root.position.set(80, 0, 73);
const reaphel = makeCharacter('Reaphel', mat('Reaphel knight armour', new Color3(0.34, 0.42, 0.48)), materials.gold, 1.02, 'knight');
reaphel.root.position.set(78, 0, 72);
const sylva = makeCharacter('Sylva', mat('Sylva ranger cloak', new Color3(0.34, 0.42, 0.24)), materials.bark, 0.98, 'ranger');
sylva.root.position.set(82, 0, 72);
const aureliaModel = makeCharacter('Aurelia', mat('Aurelia healer robes', new Color3(0.42, 0.49, 0.34)), materials.crystal, 1, 'healer');
aureliaModel.root.position.set(3.5 + FOREST_OFFSET.x, 0, -3.8 + FOREST_OFFSET.z);
aureliaModel.root.setEnabled(false);
// Additional rescue characters are placeholders until their exact roles and abilities
// are planned with the player. Their recruitment is always gated behind their region boss.
const darianModel = makeCharacter('Darian', mat('Darian emberguard armour', new Color3(0.52, 0.23, 0.15)), materials.emberGlow, 1.04, 'warrior');
const nyraModel = makeCharacter('Nyra', mat('Nyra frostweave robes', new Color3(0.38, 0.57, 0.69)), materials.frostCrystal, 1, 'mage');
const rowanModel = makeCharacter('Rowan', mat('Rowan mire summoner robes', new Color3(0.22, 0.34, 0.22)), materials.mireGlow, 1, 'summoner');
const serenModel = makeCharacter('Seren', mat('Seren starfall robes', new Color3(0.57, 0.43, 0.24)), materials.starCrystal, 1, 'healer');
[darianModel, nyraModel, rowanModel, serenModel].forEach(model => model.root.setEnabled(false));
const guardianNPC = makeCharacter('Forest Guardian', mat('forest guardian cloak', new Color3(0.42, 0.48, 0.30)), materials.crystal, 1.02, 'mage');
guardianNPC.root.position.set(4.5 + FOREST_OFFSET.x, 0, -3.5 + FOREST_OFFSET.z);
const guardianStaffCrystal = MeshBuilder.CreateSphere('guardian staff crystal', { diameter: 0.35, segments: 8 }, scene);
guardianStaffCrystal.parent = guardianNPC.root;
guardianStaffCrystal.position.set(0.56, 2.05, 0);
guardianStaffCrystal.material = materials.crystal;
const guardianMarker = MeshBuilder.CreateTorus('guardian recruit marker', { diameter: 1.15, thickness: 0.045 }, scene);
guardianMarker.parent = guardianNPC.root;
guardianMarker.position.y = 2.75;
guardianMarker.rotation.x = Math.PI / 2;
guardianMarker.material = materials.gold;
guardianNPC.root.setEnabled(false);
guardianMarker.setEnabled(false);
const companions = [
    { id: 'reaphel', name: 'Reaphel', role: 'Knight', model: reaphel, active: true, recruited: true, hp: 135, maxHp: 135, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 },
    { id: 'sylva', name: 'Sylva', role: 'Archer', model: sylva, active: true, recruited: true, hp: 90, maxHp: 90, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 },
    { id: 'aurelia', name: 'Aurelia', role: 'Healer', model: aureliaModel, active: false, recruited: false, hp: 95, maxHp: 95, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 },
    { id: 'darian', name: 'Darian', role: 'Warrior', model: darianModel, active: false, recruited: false, hp: 125, maxHp: 125, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 },
    { id: 'nyra', name: 'Nyra', role: 'Mage', model: nyraModel, active: false, recruited: false, hp: 88, maxHp: 88, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 },
    { id: 'rowan', name: 'Rowan', role: 'Summoner', model: rowanModel, active: false, recruited: false, hp: 112, maxHp: 112, attackTimer: 0, healTimer: 0, summonTimer: 20, specialCooldown: 0, upgradeLevel: 0, recovering: false, recoverTimer: 0 },
    { id: 'seren', name: 'Seren', role: 'Healer', model: serenModel, active: false, recruited: false, hp: 105, maxHp: 105, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0, upgradeLevel: 0, summonTimer: 20, specialCooldown: 0 }
];
for (const companion of companions) companion.model.root.metadata = { ...(companion.model.root.metadata || {}), companionId: companion.id };
let selectedCompanion = null;
// Runtime state.
const state = {
    zone: 'base', started: false, paused: true, level: 1, xp: 0, hp: 120, mana: 80,
    gold: 100, crystals: 0, tokens: 0, weaponLevel: 1, wolfKills: 0, bossUnlocked: false, bossDefeated: false,
    aureliaRecruited: false, formation: 'balanced', strategy: 'protect', command: 'follow',
    worldMinutes: 9 * 60, weatherIndex: 0, combatTimer: 0, attackCooldown: 0, defend: false,
    defaultAbility: 'arcane', abilityCooldowns: { arcane: 0, heal: 0, nova: 0, barrier: 0, antiMagic: 0, deathBeam: 0 },
    abilityLevels: { arcane: 1, heal: 1, nova: 1, barrier: 1, antiMagic: 1, deathBeam: 1 }, manaUpgradeLevel: 0, companionUpgradeLevels: {}, playerFrozenTimer: 0, dungeonState: null,
    crystalsCollected: new Set(), questComplete: false, nightSpawned: false, randomEventTimer: 0,
    regionProgress: freshRegionProgress(), cutsceneActive: false,
    playerDamageFlash: 0, stepTime: 0, protectionTimer: 0, lastSaveTime: 0
};
const weatherNames = ['CLEAR', 'RAIN', 'MIST'];
let weatherTimer = 0;
let toastTimer = 0;
let companionChatterTimer = 11;
let nearby = null;
let planningFromPaused = false;
let inventoryFromPaused = false;
let settingsFromPaused = false;
let currentTarget = null;
let enemies = [];
let summonedAllies = [];
let activeBarriers = [];
let interactables = [];
let projectiles = [];
let enemyId = 0;
const keys = new Set();
const prisonerCages = {};
let activeRescueCutscene = null;
let rescueCutsceneOverlay = null;
const companionById = Object.fromEntries(companions.map(companion => [companion.id, companion]));
for (const companion of companions) companion._baseMaxHp = companion.maxHp;

function ensureRescueOverlay() {
    if (rescueCutsceneOverlay) return rescueCutsceneOverlay;
    const style = document.createElement('style');
    style.textContent = `#rescue-cutscene-overlay{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;padding:28px;box-sizing:border-box;background:linear-gradient(180deg,rgba(5,12,15,.02) 35%,rgba(3,8,11,.72));color:#f3f1df;font-family:Georgia,serif;text-align:center;cursor:pointer;user-select:none}#rescue-cutscene-overlay .rescue-caption{max-width:760px;padding:16px 24px;border:1px solid rgba(214,231,220,.28);border-radius:14px;background:rgba(8,19,18,.72);backdrop-filter:blur(8px);box-shadow:0 10px 36px rgba(0,0,0,.24)}#rescue-cutscene-overlay h2{margin:0 0 8px;font-size:clamp(22px,3vw,34px);letter-spacing:.04em}#rescue-cutscene-overlay p{margin:0 0 8px;color:#d5e2da;font:14px/1.5 system-ui,sans-serif}#rescue-cutscene-overlay small{color:#d7c999;font:11px system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}`;
    document.head.appendChild(style);
    rescueCutsceneOverlay = document.createElement('div');
    rescueCutsceneOverlay.id = 'rescue-cutscene-overlay';
    rescueCutsceneOverlay.innerHTML = '<div class="rescue-caption"><h2></h2><p></p><small>Click anywhere to skip</small></div>';
    rescueCutsceneOverlay.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); finishRescueCutscene(true); });
    document.body.appendChild(rescueCutsceneOverlay);
    return rescueCutsceneOverlay;
}

function createPrisonCrystal(regionId) {
    const region = REGION_DATA[regionId];
    const companion = companionById[region.companionId];
    if (!region || !companion) return null;
    const root = new TransformNode(`${regionId} floating rescue crystal`, scene);
    root.position.copyFrom(region.cagePosition);
    const crystalMaterial = new StandardMaterial(`${regionId} prison crystal material`, scene);
    crystalMaterial.diffuseColor = region.crystalMaterial.diffuseColor.clone();
    crystalMaterial.emissiveColor = region.crystalMaterial.emissiveColor.clone();
    crystalMaterial.alpha = 0.34;
    crystalMaterial.specularColor = new Color3(0.9, 0.98, 1);
    crystalMaterial.specularPower = 110;
    const crystal = MeshBuilder.CreatePolyhedron(`${regionId} sealed prisoner crystal`, { type: 1, size: 1.45 }, scene);
    crystal.parent = root;
    crystal.position.y = 0.1;
    crystal.scaling.set(1.25, 2.35, 1.15);
    crystal.material = crystalMaterial;
    glowLayer.addIncludedOnlyMesh(crystal);
    const ring = MeshBuilder.CreateTorus(`${regionId} prison seal ring`, { diameter: 2.65, thickness: 0.07, tessellation: 32 }, scene);
    ring.parent = root;
    ring.position.y = -1.85;
    ring.rotation.x = Math.PI / 2;
    ring.material = region.crystalMaterial;
    const halo = MeshBuilder.CreateTorus(`${regionId} prison halo`, { diameter: 2.25, thickness: 0.055, tessellation: 32 }, scene);
    halo.parent = root;
    halo.position.y = 1.6;
    halo.rotation.x = Math.PI / 2;
    halo.material = region.crystalMaterial;
    const rune = MeshBuilder.CreatePolyhedron(`${regionId} prison rune`, { type: 1, size: 0.34 }, scene);
    rune.parent = root;
    rune.position.y = 2.55;
    rune.material = region.crystalMaterial;
    const crackPaths = [
        [new Vector3(-0.1,-1.75,1.02),new Vector3(0.12,-1.15,1.1),new Vector3(-0.02,-0.55,1.17),new Vector3(0.22,0.05,1.17),new Vector3(0.04,0.65,1.12),new Vector3(0.22,1.48,0.88)],
        [new Vector3(-0.02,-0.55,1.17),new Vector3(-0.55,-0.25,1.03),new Vector3(-0.82,0.15,0.9)],
        [new Vector3(0.22,0.05,1.17),new Vector3(0.68,0.35,1.02),new Vector3(0.82,0.82,0.86)],
        [new Vector3(0.04,0.65,1.12),new Vector3(-0.38,0.98,0.99),new Vector3(-0.48,1.38,0.86)]
    ];
    const cracks = crackPaths.map((points, index) => {
        const line = MeshBuilder.CreateLines(`${regionId} crystal fracture ${index}`, { points }, scene);
        line.parent = root;
        line.color = new Color3(0.92, 0.99, 1);
        line.isPickable = false;
        line.setEnabled(false);
        return line;
    });
    companion.model.root.position.set(region.cagePosition.x, region.cagePosition.y - 1.35, region.cagePosition.z);
    companion.model.root.rotation.y = Math.atan2(region.entryDirection.x, region.entryDirection.z);
    companion.model.root.setEnabled(true);
    return { regionId, root, crystal, ring, halo, rune, cracks, companion, material: crystalMaterial, shards: [], opened: false };
}

function createAllPrisonCrystals() {
    for (const regionId of Object.keys(REGION_DATA)) prisonerCages[regionId] = createPrisonCrystal(regionId);
    updatePrisonCrystalVisibility();
}

function updatePrisonCrystalVisibility() {
    for (const [regionId, prison] of Object.entries(prisonerCages)) {
        const progress = state.regionProgress[regionId];
        const locked = !progress?.rescued;
        if (locked) {
            // Re-enable an intact prison when loading an older save or starting a fresh run.
            prison.opened = false;
            prison.crystal.setEnabled(true);
            prison.ring.setEnabled(true);
            prison.halo.setEnabled(true);
            prison.rune.setEnabled(true);
            prison.cracks.forEach(line => line.setEnabled(false));
            prison.root.setEnabled(true);
            prison.companion.model.root.position.set(prison.root.position.x, prison.root.position.y - 1.35, prison.root.position.z);
            prison.companion.model.root.setEnabled(true);
        } else {
            prison.root.setEnabled(false);
            prison.companion.model.root.setEnabled(!!prison.companion.active);
        }
    }
}

function setRescueCaption(regionId, title, text) {
    const overlay = ensureRescueOverlay();
    overlay.querySelector('h2').textContent = title;
    overlay.querySelector('p').textContent = text;
    overlay.style.display = 'flex';
}

function finishRescueCutscene(skipped = false) {
    const cutscene = activeRescueCutscene;
    if (!cutscene) return;
    activeRescueCutscene = null;
    const { regionId, prison, cameraSnapshot, previousPaused } = cutscene;
    if (cutscene.frameHandle) cancelAnimationFrame(cutscene.frameHandle);
    if (cutscene.hand && !cutscene.hand.isDisposed()) cutscene.hand.dispose();
    if (cutscene.touchSpark && !cutscene.touchSpark.isDisposed()) cutscene.touchSpark.dispose();
    for (const shard of prison.shards || []) if (shard && !shard.isDisposed()) shard.dispose();
    prison.shards = [];
    prison.root.setEnabled(false);
    prison.opened = true;
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    const companion = prison.companion;
    progress.rescued = true;
    companion.recruited = true;
    companion.recovering = false;
    companion.hp = companion.maxHp;
    if (regionId === 'forest') state.aureliaRecruited = true;
    // The first rescue joins automatically. Later recruits become available in the planning table.
    companion.active = regionId === 'forest' || activeCompanions().length < 3;
    companion.model.root.setEnabled(companion.active);
    if (companion.active) {
        companion.model.root.position.copyFrom(player.root.position.add(new Vector3(2 + (activeCompanions().length % 2), 0, 1.5)));
    }
    camera.alpha = cameraSnapshot.alpha;
    camera.beta = cameraSnapshot.beta;
    camera.radius = cameraSnapshot.radius;
    camera.target.copyFrom(player.root.position.add(new Vector3(0, 1.2, 0)));
    camera.inertia = cameraSnapshot.inertia;
    if (cutscene.heroRotation !== undefined) player.root.rotation.y = cutscene.heroRotation;
    if (cutscene.heroOriginalY !== undefined) player.root.position.y = cutscene.heroOriginalY;
    if (player.arms && cutscene.armRotations) player.arms.forEach((arm, index) => {
        const saved = cutscene.armRotations[index];
        if (saved?.rotation) arm.rotation.copyFrom(saved.rotation);
        if (saved?.position) arm.position.copyFrom(saved.position);
    });
    if (player.gloves && cutscene.handPositions) player.gloves.forEach((glove, index) => {
        if (cutscene.handPositions[index]) glove.position.copyFrom(cutscene.handPositions[index]);
    });
    camera.attachControl(canvas, true);
    if (camera.inputs.attached.pointers) camera.inputs.attached.pointers.buttons = cameraSnapshot.pointerButtons || [0, 1];
    if (rescueCutsceneOverlay) rescueCutsceneOverlay.style.display = 'none';
    state.cutsceneActive = false;
    state.paused = previousPaused;
    state.defend = false;
    keys.clear();
    nearby = null;
    updatePrisonCrystalVisibility();
    updateZoneFromPosition();
    updateHUD();
    const unlockMessages = {
        emberfall: 'NEW ABILITY UNLOCKED: BARRIER',
        frostveil: 'NEW ABILITY UNLOCKED: ANTI-MAGIC BARRIER',
        starfall: 'NEW ABILITY UNLOCKED: DEATH BEAM',
        mire: 'NEW COMPANION UNLOCKED: ROWAN THE SUMMONER'
    };
    if (regionId === 'starfall') {
        setObjective('Beyond the Starfall Expanse', `${companion.name} is free. The road now leads into the Sunken Mire—and further lands remain beyond it.`);
    } else if (regionId === 'mire') {
        setObjective('The Mire is not the end', `${companion.name} is free. New routes are appearing beyond the known regions.`);
    } else {
        setObjective(`${companion.name} rescued`, `${companion.name} has been freed from the ${region.name} crystal prison. The next region is now open.`);
    }
    showToast(`${companion.name} rescued! ${unlockMessages[regionId] || 'New region unlocked.'}`, 5.5);
    void saveGame(true);
}

function createPrisonShards(prison) {
    const center = prison.root.getAbsolutePosition();
    for (let i = 0; i < 10; i++) {
        const shard = MeshBuilder.CreatePolyhedron('shattered rescue crystal fragment', { type: 1, size: 0.24 + (i % 3) * 0.08 }, scene);
        shard.position.set(center.x + (Math.random() - 0.5) * 1.6, center.y + (Math.random() - 0.5) * 2.5, center.z + (Math.random() - 0.5) * 1.2);
        shard.material = prison.material;
        shard.isPickable = false;
        prison.shards.push(shard);
    }
    prison.crystal.setEnabled(false);
    prison.ring.setEnabled(false);
    prison.halo.setEnabled(false);
    prison.rune.setEnabled(false);
}

function beginRescueCutscene(regionId) {
    if (activeRescueCutscene) return;
    const region = REGION_DATA[regionId];
    const prison = prisonerCages[regionId];
    if (!region || !prison || prison.opened) {
        finishRegionBossProgress(regionId);
        return;
    }
    const cameraSnapshot = {
        alpha: camera.alpha, beta: camera.beta, radius: camera.radius,
        target: camera.target.clone(), inertia: camera.inertia,
        pointerButtons: camera.inputs.attached.pointers?.buttons?.slice() || [0, 1]
    };
    const previousPaused = state.paused;
    const walkStart = player.root.position.clone();
    const walkStartRotation = player.root.rotation.y;
    const heroRotation = player.root.rotation.y;
    const heroOriginalY = player.root.position.y;
    const armRotations = player.arms ? player.arms.map(arm => ({ rotation: arm.rotation.clone(), position: arm.position.clone() })) : [];
    const handPositions = player.gloves ? player.gloves.map(glove => glove.position.clone()) : [];
    const stand = prison.root.position.add(region.entryDirection.scale(2.65));
    stand.y = 0;
    const facing = prison.root.position.subtract(stand);
    facing.y = 0;
    const desiredRotation = Math.atan2(facing.x, facing.z);
    camera.detachControl();
    state.paused = true;
    state.cutsceneActive = true;
    state.defend = false;
    keys.clear();
    prison.cracks.forEach(line => line.setEnabled(false));
    setRescueCaption(regionId, `${companionById[region.companionId].name} is still trapped`, 'The crystal prison hums with ancient magic.');
    const hand = MeshBuilder.CreateSphere('rescue magic gathered in hero hand', { diameter: 0.19, segments: 16 }, scene);
    hand.material = region.crystalMaterial;
    hand.isPickable = false;
    glowLayer.addIncludedOnlyMesh(hand);
    const touchSpark = MeshBuilder.CreateSphere('crystal touch point', { diameter: 0.12, segments: 12 }, scene);
    touchSpark.material = region.crystalMaterial;
    touchSpark.isPickable = false;
    glowLayer.addIncludedOnlyMesh(touchSpark);
    activeRescueCutscene = {
        regionId, prison, cameraSnapshot, previousPaused, walkStart, walkStartRotation,
        heroRotation, armRotations, handPositions, heroOriginalY, stand, desiredRotation,
        startTime: performance.now(), hand, touchSpark, shardsCreated: false, frameHandle: 0
    };
    const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
    const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
    const tick = now => {
        const c = activeRescueCutscene;
        if (!c) return;
        const elapsed = now - c.startTime;
        // 0–5.5s: walk slowly into position. No supernatural jump; the hand reaches upward.
        const walkT = smooth(elapsed / 5500);
        player.root.position.copyFrom(Vector3.Lerp(c.walkStart, c.stand, walkT));
        player.root.position.y = c.heroOriginalY;
        player.root.rotation.y = lerpAngle(c.walkStartRotation, c.desiredRotation, smooth(elapsed / 4300));
        animateCharacterMovement(player, elapsed < 5200, elapsed / 1000);
        player.root.computeWorldMatrix(true);
        const handWorld = Vector3.TransformCoordinates(new Vector3(0.55, 1.72, 0.94), player.root.getWorldMatrix());
        const crystalWorld = prison.crystal.getAbsolutePosition();
        const touchPoint = Vector3.Lerp(handWorld, crystalWorld, 0.28);
        c.hand.position.copyFrom(touchPoint);
        c.touchSpark.position.copyFrom(touchPoint);
        const heroTarget = player.root.position.add(new Vector3(0, 1.35, 0));
        const handTarget = Vector3.Lerp(touchPoint, crystalWorld, 0.22);

        if (elapsed < 5500) {
            camera.alpha = lerpAngle(cameraSnapshot.alpha, c.desiredRotation + Math.PI, smooth(elapsed / 3600));
            camera.beta = cameraSnapshot.beta + (1.16 - cameraSnapshot.beta) * smooth(elapsed / 4200);
            camera.radius = cameraSnapshot.radius + (6.6 - cameraSnapshot.radius) * smooth(elapsed / 4200);
            camera.target = Vector3.Lerp(cameraSnapshot.target, heroTarget, smooth(elapsed / 4500));
            if (elapsed > 2800) setRescueCaption(regionId, 'The hero approaches', 'The crystal pulses as you draw near.');
        } else if (elapsed < 8200) {
            const t = smooth((elapsed - 5500) / 2700);
            camera.alpha = lerpAngle(camera.alpha, c.desiredRotation + Math.PI, 0.12);
            camera.beta += (1.23 - camera.beta) * 0.10;
            camera.radius += (4.15 - camera.radius) * 0.085;
            camera.target = Vector3.Lerp(camera.target, handTarget, 0.10);
            if (player.arms?.[1]) {
                player.arms[1].position.set(0.51, 1.03 + 0.58 * t, 0.03 + 0.42 * t);
                player.arms[1].rotation.x = -0.25 - 0.72 * t;
                player.arms[1].rotation.z = 0.18 + 0.10 * t;
            }
            if (player.gloves?.[1]) player.gloves[1].position.set(0.55, 0.65 + 1.58 * t, 0.08 + 1.22 * t);
            c.hand.scaling.setAll(0.65 + t * 0.5);
            setRescueCaption(regionId, 'A hand against the crystal', 'Magic gathers where the hero touches the prison.');
        } else if (elapsed < 11800) {
            // Hold the close-up on the touching hand. The crystal remains completely intact.
            camera.alpha = lerpAngle(camera.alpha, c.desiredRotation + Math.PI, 0.075);
            camera.beta += (1.26 - camera.beta) * 0.06;
            camera.radius += (2.25 - camera.radius) * 0.055;
            camera.target = Vector3.Lerp(camera.target, handTarget, 0.07);
            if (player.arms?.[1]) player.arms[1].position.set(0.51, 1.61, 0.45);
            if (player.gloves?.[1]) player.gloves[1].position.set(0.55, 2.23, 1.30);
            c.hand.scaling.setAll(1.05 + Math.sin(elapsed * 0.004) * 0.07);
            c.touchSpark.scaling.setAll(1 + Math.sin(elapsed * 0.006) * 0.18);
            setRescueCaption(regionId, 'The seal answers', 'A quiet pulse spreads from the hero’s hand.');
        } else if (elapsed < 17700) {
            // Only now does the first fracture begin to form, slowly spreading line by line.
            const t = smooth((elapsed - 11800) / 5900);
            camera.radius += (2.55 - camera.radius) * 0.035;
            camera.target = Vector3.Lerp(camera.target, prison.root.getAbsolutePosition(), 0.045);
            const count = Math.min(prison.cracks.length, Math.floor(t * (prison.cracks.length + 0.99)));
            prison.cracks.forEach((line, index) => line.setEnabled(index < count));
            c.hand.scaling.setAll(1.0 + Math.sin(elapsed * 0.003) * 0.05);
            setRescueCaption(regionId, 'A fracture appears', 'A thin crack crawls through the crystal.');
        } else if (elapsed < 20500) {
            // Hold on the fully cracked prison for suspense before the break.
            prison.cracks.forEach(line => line.setEnabled(true));
            camera.radius += (2.75 - camera.radius) * 0.025;
            camera.target = Vector3.Lerp(camera.target, prison.root.getAbsolutePosition(), 0.035);
            setRescueCaption(regionId, 'The crystal is covered in cracks', 'The prison shudders. One final pulse remains.');
        } else if (elapsed < 24500) {
            if (!c.shardsCreated) { createPrisonShards(prison); c.shardsCreated = true; }
            const t = smooth((elapsed - 20500) / 4000);
            for (let i = 0; i < prison.shards.length; i++) {
                const shard = prison.shards[i];
                const a = i * 2.399;
                shard.position.x += Math.cos(a) * (0.018 + (i % 3) * 0.007);
                shard.position.y -= 0.012 + (i % 4) * 0.003;
                shard.position.z += Math.sin(a) * (0.018 + (i % 3) * 0.007);
                shard.rotation.x += 0.018;
                shard.rotation.y += 0.014;
                shard.visibility = 1 - t;
            }
            c.hand.visibility = 1 - t;
            c.touchSpark.visibility = 1 - t;
            setRescueCaption(regionId, `${companionById[region.companionId].name} is free`, 'The crystal finally bursts into falling shards.');
        } else {
            const t = smooth((elapsed - 24500) / 3000);
            camera.alpha = lerpAngle(camera.alpha, cameraSnapshot.alpha, 0.065);
            camera.beta += (cameraSnapshot.beta - camera.beta) * 0.065;
            camera.radius += (cameraSnapshot.radius - camera.radius) * 0.065;
            camera.target = Vector3.Lerp(camera.target, player.root.position.add(new Vector3(0, 1.2, 0)), 0.065);
            if (t >= 0.995 || elapsed > 27600) { finishRescueCutscene(false); return; }
        }
        c.frameHandle = requestAnimationFrame(tick);
    };
    activeRescueCutscene.frameHandle = requestAnimationFrame(tick);
}


function finishRegionBossProgress(regionId) {
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    if (!region || !progress) return;
    progress.bossDefeated = true;
    progress.bossUnlocked = true;
    // This fallback is only for a missing prison object. Normal boss defeats
    // must finish the visible rescue cutscene before the next region unlocks.
    progress.rescued = true;
    const companion = companionById[region.companionId];
    if (companion) { companion.recruited = true; companion.active = regionId === 'forest' || activeCompanions().length < 3; }
    if (regionId === 'forest') { state.bossDefeated = true; state.questComplete = true; state.aureliaRecruited = true; }
    updatePrisonCrystalVisibility();
    updateHUD();
    void saveGame(true);
}

function createInteractables() {
    interactables = [
        { kind: 'planning', label: 'Use planning table', position: new Vector3(80, 0, 78), mesh: planningTable },
        { kind: 'bed', label: 'Sleep until morning', position: new Vector3(80, 0, 91), mesh: bedBase },
        { kind: 'hospital', label: 'Visit the hospital', position: new Vector3(68, 0, 84), mesh: baseGround },
        { kind: 'blacksmith', label: 'Visit the blacksmith', position: new Vector3(92, 0, 84), mesh: baseGround },
        { kind: 'barracks', label: 'Manage your party', position: new Vector3(68, 0, 70), mesh: baseGround },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-7.8, 0, 4.5).add(FOREST_OFFSET), mesh: forestCrystalMeshes[0] },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(9.1, 0, 1.8).add(FOREST_OFFSET), mesh: forestCrystalMeshes[1] },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-10.5, 0, -15.8).add(FOREST_OFFSET), mesh: forestCrystalMeshes[2] }
    ];
    for (const landmark of dungeonLandmarks) {
        interactables.push({ kind: 'dungeon', regionId: landmark.regionId, label: `Enter ${REGION_DATA[landmark.regionId].name} Dungeon`, position: REGION_DATA[landmark.regionId].dungeonPosition.clone(), mesh: landmark.portal });
    }
}
function addWolf(position, stronger = false) {
    const root = new TransformNode(`wolf-${++enemyId}`, scene);
    root.position.copyFrom(position.add(FOREST_OFFSET));
    const body = MeshBuilder.CreateSphere('forest wolf body', { diameter: stronger ? 1.75 : 1.38, segments: 8 }, scene);
    body.parent = root;
    body.position.y = 0.82;
    body.scaling.set(1.2, 0.72, 0.72);
    body.material = stronger ? materials.enemyDark : materials.enemy;
    addShadow(body);
    const head = MeshBuilder.CreateSphere('forest wolf head', { diameter: 0.66, segments: 8 }, scene);
    head.parent = root;
    head.position.set(0, 1.08, 0.72);
    head.material = body.material;
    for (const side of [-1, 1]) {
        const ear = MeshBuilder.CreateCylinder('wolf ear', { height: 0.36, diameterTop: 0, diameterBottom: 0.23, tessellation: 5 }, scene);
        ear.parent = root;
        ear.position.set(side * 0.21, 1.42, 0.68);
        ear.material = body.material;
        const eye = MeshBuilder.CreateSphere('wolf eye', { diameter: 0.085 }, scene);
        eye.parent = root;
        eye.position.set(side * 0.18, 1.1, 1.02);
        eye.material = materials.enemyEye;
    }
    const muzzle = MeshBuilder.CreateSphere('wolf tapered muzzle', { diameter: 0.34, segments: 10 }, scene);
    muzzle.parent = root;
    muzzle.position.set(0, 0.96, 1.02);
    muzzle.scaling.set(0.86, 0.58, 0.82);
    muzzle.material = materials.enemyDark;
    const nose = MeshBuilder.CreateSphere('wolf nose', { diameter: 0.12, segments: 8 }, scene);
    nose.parent = root;
    nose.position.set(0, 0.99, 1.25);
    nose.material = materials.enemyEye;
    for (const x of [-0.4, 0.4])
        for (const z of [-0.32, 0.35]) {
            const leg = MeshBuilder.CreateCylinder('wolf muscular leg', { height: 0.62, diameter: 0.2, tessellation: 10 }, scene);
            leg.parent = root;
            leg.position.set(x, 0.34, z);
            leg.material = body.material;
            const paw = MeshBuilder.CreateSphere('wolf paw', { diameter: 0.28, segments: 8 }, scene);
            paw.parent = root;
            paw.position.set(x, 0.1, z + 0.08);
            paw.scaling.z = 1.25;
            paw.material = materials.enemyDark;
        }

    const tail = MeshBuilder.CreateCylinder('wolf raised tail', {
    height: 0.95,
    diameterTop: 0.06,
    diameterBottom: 0.25,
    tessellation: 8
}, scene);
tail.parent = root;
tail.position.set(0, 1.18, -0.78);
tail.rotation.x = -0.78;
tail.material = body.material;
    for (let i = 0; i < 5; i++) {
        const ruff = MeshBuilder.CreateSphere('wolf shoulder ruff', { diameter: 0.4, segments: 8 }, scene);
        ruff.parent = root;
        ruff.position.set((i - 2) * 0.18, 1.18 + Math.abs(i - 2) * 0.035, 0.08);
        ruff.scaling.set(0.8, 1.1, 0.9);
        ruff.material = i % 2 ? body.material : materials.enemyDark;
    }
    const ring = MeshBuilder.CreateTorus('wolf target ring', { diameter: 1.45, thickness: 0.035 }, scene);
    ring.parent = root;
    ring.position.y = 0.06;
    ring.rotation.x = Math.PI / 2;
    ring.material = mat('wolf hostile ring', new Color3(0.75, 0.27, 0.18), new Color3(0.25, 0.05, 0.02));
    const enemy = { id: enemyId, kind: 'wolf', regionId: 'forest', displayName: stronger ? 'Grove Stalker' : 'Forest Wolf', root, body, hp: stronger ? 155 : 112, maxHp: stronger ? 155 : 112, speed: stronger ? 2.25 : 1.85, damage: stronger ? 17 : 13, attackTimer: 1.15, specialTimer: 0, dead: false, sightRadius: stronger ? 40 : 34, detectionRange: stronger ? 23 : 20, aggro: stronger ? 23 : 20, frozenTimer: 0, frozenMeshes: null };
    enemies.push(enemy);
    return enemy;
}
function addBoss() {
    const root = new TransformNode('grove guardian boss', scene);
    root.position.copyFrom(REGION_DATA.forest.bossPosition);
    const body = MeshBuilder.CreateSphere('grove guardian body', { diameter: 3.2, segments: 10 }, scene);
    body.parent = root;
    body.position.y = 1.45;
    body.scaling.set(1.25, 0.9, 1.05);
    body.material = mat('grove guardian bark hide', new Color3(0.25, 0.35, 0.25));
    addShadow(body);
    const head = MeshBuilder.CreateSphere('grove guardian head', { diameter: 1.45, segments: 10 }, scene);
    head.parent = root;
    head.position.set(0, 2.3, 1.2);
    head.material = materials.enemyDark;
    for (const side of [-1, 1]) {
        const horn = MeshBuilder.CreateCylinder('guardian antler', { height: 1.7, diameterTop: 0, diameterBottom: 0.35, tessellation: 6 }, scene);
        horn.parent = root;
        horn.position.set(side * 0.8, 3.2, 1.05);
        horn.rotation.z = side * -0.4;
        horn.material = materials.paleStone;
        const eye = MeshBuilder.CreateSphere('guardian ember eye', { diameter: 0.2 }, scene);
        eye.parent = root;
        eye.position.set(side * 0.35, 2.4, 1.78);
        eye.material = materials.enemyEye;
    }
    for (const x of [-0.95, 0.95])
        for (const z of [-0.55, 0.8]) {
            const leg = MeshBuilder.CreateCylinder('guardian root leg', { height: 1.1, diameter: 0.42, tessellation: 10 }, scene);
            leg.parent = root;
            leg.position.set(x, 0.58, z);
            leg.material = materials.enemyDark;
                const claw = MeshBuilder.CreateSphere('guardian root claw', { diameter: 0.48, segments: 8 }, scene);
            claw.parent = root;
            claw.position.set(x, 0.12, z + 0.12);
            claw.material = materials.bark;
        }
    for (const side of [-1, 1]) {
        const shoulderPlate = MeshBuilder.CreateSphere('guardian bark shoulder plate', { diameter: 1.2, segments: 10 }, scene);
        shoulderPlate.parent = root;
        shoulderPlate.position.set(side * 1.12, 1.82, 0.22);
        shoulderPlate.scaling.set(1.1, 0.85, 0.9);
        shoulderPlate.material = materials.bark;
        const rootSpike = MeshBuilder.CreateCylinder('guardian thorn', { height: 1.35, diameterTop: 0.02, diameterBottom: 0.27, tessellation: 7 }, scene);
        rootSpike.parent = root;
        rootSpike.position.set(side * 1.18, 2.65, -0.15);
        rootSpike.rotation.z = side * -0.55;
        rootSpike.material = materials.paleStone;
    }
    const heart = MeshBuilder.CreateSphere('guardian corrupted heart', { diameter: 0.68, segments: 12 }, scene);
    heart.parent = root;
    heart.position.set(0, 1.55, 1.13);
    heart.material = materials.enemyEye;
    glowLayer.addIncludedOnlyMesh(heart);
    const aura = MeshBuilder.CreateTorus('guardian boss aura', { diameter: 4.7, thickness: 0.1 }, scene);
    aura.parent = root;
    aura.position.y = 0.12;
    aura.rotation.x = Math.PI / 2;
    aura.material = mat('boss aura', new Color3(0.61, 0.24, 0.15), new Color3(0.25, 0.04, 0.02));
    const boss = { id: ++enemyId, kind: 'boss', regionId: 'forest', displayName: REGION_DATA.forest.bossName, root, body, hp: 980, maxHp: 980, speed: 1.58, damage: 25, attackTimer: 1.65, specialTimer: 15, dead: false, sightRadius: 58, detectionRange: 34, aggro: 34, frozenTimer: 0, frozenMeshes: null };
    enemies.push(boss);
    showToast('The Grove Guardian has awakened. Prepare for a boss battle!');
    setObjective('Defeat the Grove Guardian', 'The forest guardian is corrupted. Coordinate your party and use your abilities.');
    return boss;
}

function addRegionalEnemy(regionId, position, index = 0, dungeonOnly = false) {
    const region = REGION_DATA[regionId];
    const root = new TransformNode(`${regionId} enemy ${++enemyId}`, scene);
    root.position.copyFrom(position);
    const body = MeshBuilder.CreateSphere(`${region.enemyName} body`, { diameter: 1.65 + (index % 2) * 0.16, segments: 10 }, scene);
    body.parent = root;
    body.position.y = 0.9;
    body.scaling.set(1.1, 0.9, 1.05);
    body.material = region.enemyMaterial;
    addShadow(body);
    const head = MeshBuilder.CreateSphere(`${region.enemyName} head`, { diameter: 0.78, segments: 10 }, scene);
    head.parent = root;
    head.position.set(0, 1.4, 0.58);
    head.material = region.enemyMaterial;
    for (const side of [-1, 1]) {
        const horn = MeshBuilder.CreateCylinder(`${region.enemyName} crest`, { height: 0.75 + (index % 2) * 0.2, diameterTop: 0.02, diameterBottom: 0.25, tessellation: 6 }, scene);
        horn.parent = root;
        horn.position.set(side * 0.29, 1.9, 0.48);
        horn.rotation.z = side * -0.32;
        horn.material = region.crystalMaterial;
        const eye = MeshBuilder.CreateSphere(`${region.enemyName} eye`, { diameter: 0.12, segments: 8 }, scene);
        eye.parent = root;
        eye.position.set(side * 0.2, 1.42, 0.94);
        eye.material = materials.enemyEye;
    }
    for (const x of [-0.48, 0.48]) for (const z of [-0.35, 0.38]) {
        const leg = MeshBuilder.CreateCylinder(`${region.enemyName} limb`, { height: 0.72, diameter: 0.22, tessellation: 8 }, scene);
        leg.parent = root;
        leg.position.set(x, 0.36, z);
        leg.material = region.enemyMaterial;
    }
    const targetRing = MeshBuilder.CreateTorus(`${region.enemyName} target ring`, { diameter: 1.55, thickness: 0.04, tessellation: 24 }, scene);
    targetRing.parent = root;
    targetRing.position.y = 0.07;
    targetRing.rotation.x = Math.PI / 2;
    targetRing.material = materials.enemyEye;
    const difficulty = region.difficulty || 1;
    const enemyHP = Math.round(165 + difficulty * 52 + index * 12);
    const enemy = { id: enemyId, kind: 'regional', regionId, displayName: region.enemyName, root, body, hp: enemyHP, maxHp: enemyHP, speed: 1.82 + Math.min(0.7, difficulty * 0.12) + (index % 2) * 0.12, damage: Math.round(17 + difficulty * 5 + index * 0.8), attackTimer: 1.1, specialTimer: 0, dead: false, sightRadius: 38 + difficulty * 2, detectionRange: 22 + difficulty * 1.5, aggro: 22 + difficulty * 1.5, frozenTimer: 0, frozenMeshes: null, dungeonOnly };
    enemies.push(enemy);
    return enemy;
}

function addRegionalBoss(regionId) {
    const region = REGION_DATA[regionId];
    const root = new TransformNode(`${regionId} region boss root`, scene);
    root.position.copyFrom(region.bossPosition);
    const body = MeshBuilder.CreateSphere(`${region.bossName} core body`, { diameter: 3.8, segments: 14 }, scene);
    body.parent = root;
    body.position.y = 1.8;
    body.scaling.set(1.25, 1.05, 1.2);
    body.material = region.bossMaterial;
    addShadow(body);
    const head = MeshBuilder.CreateSphere(`${region.bossName} head`, { diameter: 1.55, segments: 12 }, scene);
    head.parent = root;
    head.position.set(0, 2.85, 1.25);
    head.material = region.enemyMaterial;
    for (const side of [-1, 1]) {
        const crown = MeshBuilder.CreateCylinder(`${region.bossName} crown spike`, { height: 1.85, diameterTop: 0, diameterBottom: 0.42, tessellation: 7 }, scene);
        crown.parent = root;
        crown.position.set(side * 0.95, 3.7, 0.9);
        crown.rotation.z = side * -0.42;
        crown.material = region.crystalMaterial;
        const eye = MeshBuilder.CreateSphere(`${region.bossName} eye`, { diameter: 0.25, segments: 10 }, scene);
        eye.parent = root;
        eye.position.set(side * 0.42, 2.9, 1.94);
        eye.material = materials.enemyEye;
    }
    for (const side of [-1, 1]) {
        const shoulder = MeshBuilder.CreateSphere(`${region.bossName} shoulder`, { diameter: 1.5, segments: 10 }, scene);
        shoulder.parent = root;
        shoulder.position.set(side * 1.55, 2.05, 0.25);
        shoulder.material = region.bossMaterial;
    }
    const heart = MeshBuilder.CreatePolyhedron(`${region.bossName} exposed heart`, { type: 1, size: 0.62 }, scene);
    heart.parent = root;
    heart.position.set(0, 1.85, 1.78);
    heart.material = region.crystalMaterial;
    glowLayer.addIncludedOnlyMesh(heart);
    const aura = MeshBuilder.CreateTorus(`${region.bossName} ground aura`, { diameter: 5.2, thickness: 0.12, tessellation: 32 }, scene);
    aura.parent = root;
    aura.position.y = 0.14;
    aura.rotation.x = Math.PI / 2;
    aura.material = region.crystalMaterial;
    const difficulty = region.difficulty || 1;
    const bossHP = Math.round(1000 + difficulty * 480);
    const boss = { id: ++enemyId, kind: 'boss', regionId, displayName: region.bossName, root, body, hp: bossHP, maxHp: bossHP, speed: 1.48 + difficulty * 0.08, damage: Math.round(25 + difficulty * 6), attackTimer: 1.55, specialTimer: 15, dead: false, sightRadius: 58, detectionRange: 34, aggro: 34, frozenTimer: 0, frozenMeshes: null };
    enemies.push(boss);
    showToast(`${region.bossName} has awakened!`, 4);
    setObjective(`Defeat ${region.bossName}`, `The boss of ${region.name} guards a crystal prison. Defeat it to free the trapped companion.`);
    return boss;
}

const spawnedRegions = new Set();
function ensureRegionEncounter(regionId, rebuild = false) {
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    if (!region || !progress || progress.bossDefeated) return;
    if (rebuild) spawnedRegions.delete(regionId);
    if (spawnedRegions.has(regionId)) return;
    spawnedRegions.add(regionId);
    const remaining = Math.max(0, getRequiredKills(regionId) - progress.kills);
    for (let i = 0; i < remaining; i++) {
        if (regionId === 'forest') addWolf(region.mobPositions[i] || region.mobPositions[0]);
        else addRegionalEnemy(regionId, region.mobPositions[i] || region.center, i);
    }
    if (progress.bossUnlocked && !progress.bossDefeated) {
        if (regionId === 'forest') addBoss();
        else addRegionalBoss(regionId);
    }
}

function isRegionUnlocked(regionId) {
    const index = REGION_ORDER.indexOf(regionId);
    if (index < 0) return regionId === 'base';
    if (index === 0) return true;
    const previous = REGION_ORDER[index - 1];
    return !!state.regionProgress[previous]?.rescued;
}
function getMaxMana() { return 80 + (state.level - 1) * 8 + (state.manaUpgradeLevel || 0) * 20; }

function applyEnvironmentalHazards(dt) {
    if (state.zone !== 'emberfall' || !regionHazards.length) return;
    const damageTarget = (root, companion = null) => {
        const hazard = regionHazards.find(h => h.regionId === 'emberfall' && distance(root.position, h.position) <= h.radius + 0.35);
        if (!hazard || hasActiveBarrierFor(root, false)) return;
        const amount = hazard.damagePerSecond * dt; // Fire vents deal only 5 HP per second.
        if (companion) {
            companion.hp = Math.max(0, companion.hp - amount);
            if (companion.hp <= 0 && !companion.recovering) {
                companion.recovering = true; companion.recoverTimer = 7;
                companion.model.root.setEnabled(false);
                showToast(`${companion.name} was burned and needs time to recover.`);
            }
        } else {
            state.hp = Math.max(0, state.hp - amount);
            state.playerDamageFlash = Math.max(state.playerDamageFlash, 0.06);
            if (state.hp <= 0) playerDefeated();
        }
    };
    damageTarget(player.root);
    for (const c of activeCompanions()) damageTarget(c.model.root, c);
}

function hasActiveBarrierFor(root, antiMagicOnly = false) {
    return activeBarriers.find(field => !field.broken && field.timeLeft > 0 &&
        (!antiMagicOnly || field.antiMagic) && distance(root.position, player.root.position) <= field.radius + 1.05) || null;
}

function updateBarrierCracks(field) {
    const ratio = field.hp / field.maxHp;
    field.cracks.forEach((crack, index) => crack.setEnabled(ratio <= 0.5 && (ratio > 0.25 ? index < 3 : true)));
    if (field.shellMaterial) {
        field.shellMaterial.alpha = ratio <= 0.25 ? 0.08 : ratio <= 0.5 ? 0.13 : 0.2;
        field.shellMaterial.emissiveColor = ratio <= 0.25 ? new Color3(0.1,0.25,0.62) : new Color3(0.08,0.38,0.78);
    }
}

function breakBarrier(field) {
    if (!field || field.broken) return;
    field.broken = true;
    const center = player.root.position.clone();
    for (let i = 0; i < 18; i++) {
        const shard = MeshBuilder.CreatePolyhedron('barrier shattered blue shard', { type: 1, size: 0.16 + (i % 4) * 0.045 }, scene);
        const angle = i * 2.399;
        shard.position.set(center.x + Math.cos(angle) * (2 + (i % 4) * 1.3), 0.5 + (i % 5) * 0.35, center.z + Math.sin(angle) * (2 + (i % 4) * 1.3));
        shard.material = field.shardMaterial;
        field.shards.push({ mesh: shard, velocity: new Vector3(Math.cos(angle)*1.8, 1.8 + (i%3)*0.45, Math.sin(angle)*1.8) });
    }
    if (field.root && !field.root.isDisposed()) field.root.dispose();
    showToast(field.antiMagic ? 'Anti-Magic Barrier shattered!' : 'Barrier shattered! Its blue shards rain down.', 3.5);
}

function createProtectionField(antiMagic = false) {
    const id = antiMagic ? 'antiMagic' : 'barrier';
    if (!isAbilityUnlocked(id)) { showToast('This ability has not been unlocked yet.'); return; }
    const level = Math.max(1, Number(state.abilityLevels[id]) || 1);
    for (let i=activeBarriers.length-1;i>=0;i--) {
        const previous=activeBarriers[i];
        if(previous.id===id&&!previous.broken){if(previous.root&&!previous.root.isDisposed())previous.root.dispose();if(previous.shellMaterial)previous.shellMaterial.dispose();if(previous.shardMaterial)previous.shardMaterial.dispose();activeBarriers.splice(i,1);}
    }
    const maxHp = antiMagic ? 50 + (level - 1) * 8 : 100 + (level - 1) * 12;
    const duration = antiMagic ? Math.min(25, 15 + (level - 1) * 1.1) : Math.min(30, 20 + (level - 1) * 1.2);
    const radius = antiMagic ? 15 : 10;
    const cost = antiMagic ? 88 : 58;
    if (state.mana < cost) { showToast(`This barrier requires ${cost} MP.`); return; }
    state.mana -= cost;
    const root = new TransformNode(antiMagic ? 'anti-magic shield field' : 'protective barrier field', scene);
    root.parent = player.root;
    root.position.set(0, 0, 0);
    const color = antiMagic ? new Color3(0.25,0.56,1) : new Color3(0.1,0.58,1);
    const shellMaterial = new StandardMaterial(`${id} field shell material`, scene);
    shellMaterial.diffuseColor = color.clone(); shellMaterial.emissiveColor = color.scale(0.35);
    shellMaterial.alpha = 0.2; shellMaterial.backFaceCulling = false; shellMaterial.wireframe = false;
    const shell = MeshBuilder.CreateSphere(`${id} translucent spherical shield`, { diameter: radius * 2, segments: 32 }, scene);
    shell.parent = root; shell.position.y = radius * 0.48; shell.scaling.y = 0.88; shell.material = shellMaterial; shell.isPickable = false;
    const ring = MeshBuilder.CreateTorus(`${id} perimeter ring`, { diameter: radius * 2, thickness: 0.085, tessellation: 64 }, scene);
    ring.parent = root; ring.position.y = 0.08; ring.rotation.x = Math.PI / 2; ring.material = shellMaterial; ring.isPickable = false;
    const shardMaterial = new StandardMaterial(`${id} crystal shard material`, scene);
    shardMaterial.diffuseColor = color.clone(); shardMaterial.emissiveColor = color.scale(0.8);
    const cracks=[];
    for(let i=0;i<8;i++){
        const angle=i*Math.PI/4;
        const points=[new Vector3(0,radius*0.22, radius*0.91),new Vector3(Math.cos(angle)*0.6,radius*0.42, radius*0.72),new Vector3(Math.cos(angle)*1.35,radius*0.5, radius*0.46)];
        const line=MeshBuilder.CreateLines(`${id} barrier crack ${i}`,{points},scene);line.parent=root;line.color=new Color3(0.8,0.95,1);line.isPickable=false;line.setEnabled(false);cracks.push(line);
    }
    const beams=[];
    for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const beam=MeshBuilder.CreateCylinder(`${id} blue boundary beam`,{height:radius*1.05,diameter:0.12,tessellation:8},scene);
        beam.parent=root;beam.position.set(Math.cos(a)*radius, radius*0.52, Math.sin(a)*radius);beam.material=shellMaterial;beam.isPickable=false;beams.push(beam);
    }
    const field={id,antiMagic,root,shell,ring,shellMaterial,cracks,beams,shardMaterial,shards:[],maxHp,hp:maxHp,radius,duration,timeLeft:duration,broken:false};
    activeBarriers.push(field);
    drawMagicGlyph(player.root.position.add(new Vector3(0,0.06,0)),color,{floor:true,size:radius*0.72,duration:1100});
    showToast(antiMagic ? 'Anti-Magic Barrier raised! Enemy magic is suppressed while it holds.' : 'Barrier raised! Stay inside the blue field.',4);
    state.abilityCooldowns[id]=antiMagic?22:18;
    updateHUD();
}

function updateBarrierFields(dt) {
    for(let i=activeBarriers.length-1;i>=0;i--){
        const field=activeBarriers[i];
        if(field.broken){
            for(let j=field.shards.length-1;j>=0;j--){const sh=field.shards[j];sh.mesh.position.addInPlace(sh.velocity.scale(dt));sh.velocity.y-=9.8*dt;sh.mesh.rotation.x+=dt*3;sh.mesh.rotation.z+=dt*2;if(sh.mesh.position.y<=0){sh.mesh.dispose();field.shards.splice(j,1);}}
            if(!field.shards.length){field.shardMaterial.dispose();activeBarriers.splice(i,1);}continue;
        }
        field.timeLeft-=dt;
        if(field.timeLeft<=0||field.hp<=0){breakBarrier(field);continue;}
        field.root.position.set(0,0,0);
        const t=performance.now()*0.001;
        field.beams.forEach((b,j)=>{b.scaling.y=1+Math.sin(t*2+j)*0.035;});
        updateBarrierCracks(field);
        // Hostile creatures are pushed against the shield edge and damage its integrity.
        for(const enemy of enemies){
            if(enemy.dead||!enemy.root.isEnabled()||distance(enemy.root.position,player.root.position)>field.radius+1.1)continue;
            const delta=enemy.root.position.subtract(player.root.position);delta.y=0;
            if(delta.lengthSquared()<0.01)delta.x=1;
            delta.normalize();
            enemy.root.position.copyFrom(player.root.position.add(delta.scale(field.radius+1.25)));
            field.hp=Math.max(0,field.hp-(enemy.kind==='boss'?5:2.5)*dt);
        }
    }
}

function triggerBossSpecial(enemy) {
    const regionId=enemy.regionId||'forest';
    const region=REGION_DATA[regionId];
    if(!region)return;
    const protectedHero=hasActiveBarrierFor(player.root,true);
    if(protectedHero){protectedHero.hp=Math.max(0,protectedHero.hp-16);updateBarrierCracks(protectedHero);showToast('Anti-Magic Barrier absorbs the boss spell!');if(protectedHero.hp<=0)breakBarrier(protectedHero);return;}
    if(regionId==='frostveil'){
        state.playerFrozenTimer=Math.max(state.playerFrozenTimer||0,2.4);
        for(const c of activeCompanions())if(distance(c.model.root.position,player.root.position)<15){c.frozenTimer=Math.max(c.frozenTimer||0,2.4);c._preFreezeMaterial=c.model.body.material;c.model.body.material=materials.ice;}
        burstEffect(player.root.position,materials.ice,5.5);
        showToast('The Pale Glacier Wyrm freezes the party!');
    }else if(regionId==='starfall'){
        for(let i=0;i<2;i++){
            const a=i*Math.PI+Math.random()*0.4;
            const pos=enemy.root.position.add(new Vector3(Math.cos(a)*4,0,Math.sin(a)*4));
            addRegionalEnemy('starfall',pos,6+i);
        }
        burstEffect(enemy.root.position,materials.starCrystal,3.8);
        showToast('The Sunken Star Sentinel summons two Dune Wraiths!');
    }else if(regionId==='emberfall'){
        burstEffect(enemy.root.position,materials.fire,4.8);
        for(const c of activeCompanions())if(distance(c.model.root.position,enemy.root.position)<6)c.hp=Math.max(0,c.hp-18);
        if(distance(player.root.position,enemy.root.position)<6)state.hp=Math.max(0,state.hp-18);
        showToast('The Cinderheart Colossus unleashes a fire pulse!');
    }else if(regionId==='mire'){
        burstEffect(enemy.root.position,materials.mireGlow,5.2);
        if(distance(player.root.position,enemy.root.position)<8)state.hp=Math.max(0,state.hp-24);
        for(const c of activeCompanions())if(distance(c.model.root.position,enemy.root.position)<8)c.hp=Math.max(0,c.hp-24);
        showToast('The Hollowfen Behemoth releases a toxic bog wave!');
    }else{
        burstEffect(enemy.root.position,materials.crystal,4.8);
        if(distance(player.root.position,enemy.root.position)<7)state.hp=Math.max(0,state.hp-20);
        for(const c of activeCompanions())if(distance(c.model.root.position,enemy.root.position)<7)c.hp=Math.max(0,c.hp-20);
        showToast('The Grove Guardian unleashes a root shockwave!');
    }
    if(state.hp<=0)playerDefeated();
}

function spawnSummonedAlly(owner, hp=50) {
    const root=new TransformNode('summoned ether guardian',scene);
    const material=new StandardMaterial('summoned guardian glow',scene);
    material.diffuseColor=new Color3(0.25,0.75,0.56);material.emissiveColor=new Color3(0.06,0.32,0.22);material.alpha=0.9;
    const body=MeshBuilder.CreateCapsule('summoned guardian body',{height:1.45,radius:0.4,tessellation:12},scene);body.parent=root;body.position.y=0.95;body.material=material;
    const core=MeshBuilder.CreateSphere('summoned guardian core',{diameter:0.42,segments:10},scene);core.parent=root;core.position.y=1.55;core.material=materials.mireGlow;glowLayer.addIncludedOnlyMesh(core);
    const ownerRoot=owner?.model?.root||player.root;
    root.position.copyFrom(ownerRoot.position.add(new Vector3((Math.random()-.5)*2,0,(Math.random()-.5)*2)));
    const summon={root,body,hp,maxHp:hp,attackTimer:0.6,ownerId:owner?.id||'player',owner,material,lifeTimer:240};
    summonedAllies.push(summon);return summon;
}

function updateSummonedAllies(dt) {
    for(let i=summonedAllies.length-1;i>=0;i--){
        const ally=summonedAllies[i];
        if(ally.hp<=0||ally.lifeTimer<=0||ally.root.isDisposed()){if(!ally.root.isDisposed())ally.root.dispose();ally.material.dispose();summonedAllies.splice(i,1);continue;}
        ally.lifeTimer-=dt;ally.attackTimer=Math.max(0,ally.attackTimer-dt);
        const target=nearestEnemyFrom(ally.root.position,24);
        if(target){const d=distance(ally.root.position,target.root.position);if(d>2.4)moveToward(ally.root,target.root.position,3.7,dt);else if(ally.attackTimer<=0){dealDamage(target,16+state.level+(ally.owner?.upgradeLevel||0)*2,ally.root);ally.attackTimer=1.8;}}
        else if(ally.owner?.model?.root){const d=distance(ally.root.position,ally.owner.model.root.position);if(d>9)moveToward(ally.root,ally.owner.model.root.position,3.2,dt);}
    }
}
function getRequiredKills(regionId) { return REGION_DATA[regionId]?.requiredKills || 8; }
function isAbilityUnlocked(id) {
    if (id === 'barrier') return !!state.regionProgress.emberfall?.rescued;
    if (id === 'antiMagic') return !!state.regionProgress.frostveil?.rescued;
    if (id === 'deathBeam') return !!state.regionProgress.starfall?.rescued;
    return ['arcane','heal','nova'].includes(id);
}
function spawnRegionBoss(regionId) {
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    if (!region || !progress || progress.bossUnlocked || progress.bossDefeated || progress.kills < getRequiredKills(regionId) || progress.elapsed < 60) return;
    progress.bossUnlocked = true;
    if (regionId === 'forest') addBoss(); else addRegionalBoss(regionId);
    setObjective(`Defeat ${region.bossName}`, `${region.name} has been explored and its guardians defeated. The boss is waiting at the end of the trail.`);
    showToast(`${region.bossName} has appeared at the end of the trail!`, 4.5);
    updateHUD();
    void saveGame(true);
}
function updateRegionExploration(dt) {
    if (state.zone === 'base' || state.dungeonState) return;
    const regionId = state.zone;
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    if (!region || !progress || progress.bossDefeated) return;
    progress.elapsed = (progress.elapsed || 0) + dt;
    // Two staggered ambushes create surprises along the trail without endlessly spawning enemies.
    const ambushTimes = [21, 43];
    while (progress.ambushesTriggered < ambushTimes.length && progress.elapsed >= ambushTimes[progress.ambushesTriggered]) {
        const wave = progress.ambushesTriggered++;
        for (let i = 0; i < 2; i++) {
            const angle = (wave * 2 + i) * Math.PI * 0.82;
            const pos = player.root.position.add(new Vector3(Math.cos(angle) * (7 + i * 2), 0, Math.sin(angle) * (7 + i * 2)));
            if (regionId === 'forest') addWolf(new Vector3(pos.x - FOREST_OFFSET.x,0,pos.z - FOREST_OFFSET.z), true);
            else addRegionalEnemy(regionId, pos, 4 + wave * 2 + i);
        }
        showToast(`Ambush! ${region.enemyName} have surrounded the trail.`, 3.6);
    }
    if (progress.elapsed >= 60 && progress.kills >= getRequiredKills(regionId) && !progress.bossUnlocked) spawnRegionBoss(regionId);
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function nearestEnemyFrom(position, maxDistance = Number.POSITIVE_INFINITY) {
    let best = null;
    let bestDistance = maxDistance;
    for (const enemy of enemies) {
        if (enemy.dead || !enemy.root.isEnabled())
            continue;
        const d = distance(position, enemy.root.position);
        if (d < bestDistance) {
            bestDistance = d;
            best = enemy;
        }
    }
    return best;
}
function nearestEnemy(maxDistance = Number.POSITIVE_INFINITY) { return nearestEnemyFrom(player.root.position, maxDistance); }
function activeCompanions() { return companions.filter(c => c.active && c.recruited && !c.recovering); }
function setObjective(title, detail) { $('objective-title').textContent = title; $('objective-detail').textContent = detail; }
function showToast(message, seconds = 3.2) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastTimer = seconds;
}
function showCompanionDialogue(companion, message) {
    if (!companion || !companion.model || !companion.model.root || companion.model.root.isDisposed()) return;
    const texture = new DynamicTexture(`dialogue-${companion.id}-${Date.now()}`, { width: 512, height: 128 }, scene, true);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(12, 25, 22, 0.92)';
    ctx.strokeStyle = 'rgba(210, 190, 130, 0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 112, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f3ecd7';
    ctx.font = 'bold 27px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, 256, 64, 460);
    texture.update();
    texture.hasAlpha = true;

    const bubbleMaterial = new StandardMaterial(`dialogue-material-${companion.id}`, scene);
    bubbleMaterial.diffuseTexture = texture;
    bubbleMaterial.opacityTexture = texture;
    bubbleMaterial.emissiveColor = new Color3(1, 1, 1);
    bubbleMaterial.disableLighting = true;
    bubbleMaterial.backFaceCulling = false;
    bubbleMaterial.useAlphaFromDiffuseTexture = true;

    const bubble = MeshBuilder.CreatePlane(`companion dialogue bubble`, { width: 2.55, height: 0.64 }, scene);
    bubble.parent = companion.model.root;
    bubble.position.set(0, 3.05, 0);
    bubble.billboardMode = Mesh.BILLBOARDMODE_ALL;
    bubble.material = bubbleMaterial;
    bubble.isPickable = false;
    window.setTimeout(() => {
        if (!bubble.isDisposed()) bubble.dispose();
        bubbleMaterial.dispose();
        texture.dispose();
    }, 2350);
}

function startCompanionConversation(active) {
    if (!active || active.length < 2 || state.combatTimer > 0) return false;
    let pair = null;
    let closest = Infinity;
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            const d = distance(active[i].model.root.position, active[j].model.root.position);
            if (d < 11 && d < closest) {
                closest = d;
                pair = [active[i], active[j]];
            }
        }
    }
    if (!pair) return false;

    const first = pair[0], second = pair[1];
    const conversations = [
        [`${first.name}: Keep an eye on the trees.`, `${second.name}: I am. Nothing gets past me.`],
        [`${first.name}: This path feels unusually quiet.`, `${second.name}: Then let's not make too much noise.`],
        [`${first.name}: How far do you think it goes?`, `${second.name}: Farther than our map shows.`],
        [`${first.name}: Are you ready to continue?`, `${second.name}: Always. Let's move.`],
        [`${first.name}: I can sense old magic nearby.`, `${second.name}: Stay close, just in case.`]
    ];
    const lines = conversations[Math.floor(Math.random() * conversations.length)];
    showCompanionDialogue(first, lines[0].replace(`${first.name}: `, ''));
    window.setTimeout(() => {
        if (second.active && second.recruited && !second.recovering) {
            showCompanionDialogue(second, lines[1].replace(`${second.name}: `, ''));
        }
    }, 1500);
    return true;
}

function updateQuestProgress() {
    const regionId = state.zone !== 'base' && REGION_DATA[state.zone] ? state.zone : 'forest';
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    const required = getRequiredKills(regionId);
    const pct = progress.bossDefeated ? 100 : progress.bossUnlocked ? 84 : progress.kills / required * 68;
    $('quest-progress-bar').style.width = `${pct}%`;
    $('quest-progress-text').textContent = progress.bossDefeated
        ? `${region.name} cleared · ${companionById[region.companionId].name} rescued`
        : progress.bossUnlocked ? `${region.bossName} is waiting` : `${region.name}: ${progress.kills} / ${required} threats defeated · ${Math.min(60, Math.floor(progress.elapsed || 0))}/60 sec`;
}

function updateHUD() {
    const maxHp = 120 + (state.level - 1) * 14;
    const maxMana = getMaxMana();
    $('hero-name').textContent = playerName.toUpperCase();
    $('hero-class').textContent = playerClass.toUpperCase();
    $('level-label').textContent = `LV ${state.level}`;
    $('hp-value').textContent = `${Math.ceil(state.hp)} / ${maxHp}`;
    $('mana-value').textContent = `${Math.ceil(state.mana)} / ${maxMana}`;
    $('xp-value').textContent = `${state.xp} / ${state.level * 100}`;
    $('hp-bar').style.width = `${Math.max(0, state.hp / maxHp * 100)}%`;
    $('mana-bar').style.width = `${Math.max(0, state.mana / maxMana * 100)}%`;
    $('xp-bar').style.width = `${state.xp / (state.level * 100) * 100}%`;
    $('gold-value').textContent = String(state.gold);
    $('crystal-value').textContent = String(state.crystals);
    $('inventory-crystals').textContent = String(state.crystals);
    $('inventory-gold').textContent = String(state.gold);
    $('inventory-tokens').textContent = String(state.tokens);
    $('weapon-level').textContent = `Level ${state.weaponLevel}`;
    $('weapon-name').textContent = state.weaponLevel > 1 ? `Ether-forged blade +${state.weaponLevel - 1}` : 'Forest-forged blade';
    $('armour-name').textContent = `Wayfarer ${state.level >= 3 ? 'reinforced ' : ''}leathers`;
    const partyList = $('party-list');
    partyList.innerHTML = '';
    const selected = activeCompanions();
    if (selected.length === 0)
        partyList.innerHTML = '<div class="party-empty">No companions currently active.</div>';
    for (const c of selected) {
        const member = document.createElement('div');
        member.className = 'party-member';
        const pct = Math.max(0, c.hp / c.maxHp * 100);
        member.innerHTML = `<div class="party-avatar">${c.name.charAt(0)}</div><div><b>${c.name}</b><small>${c.role}${c.recovering ? ' · recovering' : ''}</small></div><div class="party-health"><i style="width:${pct}%"></i></div>`;
        partyList.appendChild(member);
    }
    $('default-ability-button').textContent = `DEFAULT: ${state.defaultAbility === 'arcane' ? 'ARCANE BOLT' : state.defaultAbility === 'heal' ? 'HEALING WAVE' : state.defaultAbility === 'nova' ? 'FROST NOVA' : state.defaultAbility === 'barrier' ? 'BARRIER' : state.defaultAbility === 'antiMagic' ? 'ANTI-MAGIC BARRIER' : 'DEATH BEAM'}`;
    document.querySelectorAll('[data-ability]').forEach(button => { button.classList.toggle('hidden', !isAbilityUnlocked(button.dataset.ability)); button.disabled = !isAbilityUnlocked(button.dataset.ability); });
    const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(18);
    const enemyCard = $('enemy-card');
    if (state.zone !== 'base' && target) {
        enemyCard.classList.remove('hidden');
        $('enemy-name').textContent = target.displayName || (target.kind === 'boss' ? 'Grove Guardian' : 'Forest Wolf');
        $('enemy-hp-value').textContent = `${Math.ceil(target.hp)} / ${target.maxHp}`;
        $('enemy-hp-bar').style.width = `${Math.max(0, target.hp / target.maxHp * 100)}%`;
    }
    else
        enemyCard.classList.add('hidden');
    updateQuestProgress();
    updateUpgradePanel();
}
// -----------------------------------------------------------------------------
// Save data: IndexedDB with a localStorage fallback and portable JSON backup.
// -----------------------------------------------------------------------------
function openSaveDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB is unavailable'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(DB_STORE))
            db.createObjectStore(DB_STORE); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Could not open save database'));
    });
}
function makeSaveData() {
    const active = {};
    for (const c of companions)
        active[c.id] = c.active;
    return {
        version: 4, worldLayoutVersion: 4, playerName, playerClass, appearance, level: state.level, xp: state.xp, hp: state.hp, mana: state.mana,
        gold: state.gold, crystals: state.crystals, tokens: state.tokens, weaponLevel: state.weaponLevel,
        wolfKills: state.wolfKills, bossDefeated: state.bossDefeated, aureliaRecruited: state.aureliaRecruited,
        regionProgress: state.regionProgress, abilityLevels: state.abilityLevels, manaUpgradeLevel: state.manaUpgradeLevel, companionUpgradeLevels: state.companionUpgradeLevels, partyActive: active, formation: state.formation, strategy: state.strategy, command: state.command,
        zone: state.zone, playerX: player.root.position.x, playerZ: player.root.position.z,
        worldMinutes: state.worldMinutes, weatherIndex: state.weatherIndex, collectedCrystalIds: Array.from(state.crystalsCollected)
    };
}
async function saveGame(silent = false) {
    const data = makeSaveData();
    const json = JSON.stringify(data);
    try {
        localStorage.setItem(SAVE_KEY, json);
        const db = await openSaveDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put(data, 'current');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
        });
        db.close();
        if (!silent)
            showToast('Adventure saved successfully.');
    }
    catch (error) {
        console.warn('IndexedDB save fallback:', error);
        try {
            localStorage.setItem(SAVE_KEY, json);
            if (!silent)
                showToast('Saved in this browser using the local fallback.');
        }
        catch {
            showToast('Save failed. Export a backup or check browser storage permissions.');
        }
    }
}
async function readSaveData() {
    try {
        const db = await openSaveDB();
        const data = await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const request = tx.objectStore(DB_STORE).get('current');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        db.close();
        if (data)
            return data;
    }
    catch (error) {
        console.warn('IndexedDB read fallback:', error);
    }
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
async function hasSave() { return (await readSaveData()) !== null; }
function applySave(data) {
    playerName = typeof data.playerName === 'string' ? data.playerName : 'Wayfarer';
    playerClass = typeof data.playerClass === 'string' ? data.playerClass : 'warrior';
    appearance = typeof data.appearance === 'string' ? data.appearance : 'emerald';
    state.level = Math.max(1, Number(data.level) || 1);
    state.xp = Math.max(0, Number(data.xp) || 0);
    state.hp = Math.max(1, Math.min(120 + (state.level - 1) * 14, Number(data.hp) || 120));
    state.mana = Math.max(0, Math.min(getMaxMana(), Number(data.mana) || 80));
    state.gold = Math.max(0, Number(data.gold) || 0);
    state.crystals = Math.max(0, Number(data.crystals) || 0);
    state.tokens = Math.max(0, Number(data.tokens) || 0);
    state.weaponLevel = Math.max(1, Number(data.weaponLevel) || 1);
    state.manaUpgradeLevel = Math.max(0, Math.min(10, Number(data.manaUpgradeLevel) || 0));
    state.mana = Math.max(0, Math.min(getMaxMana(), Number(data.mana) || 80));
    state.abilityLevels = { ...state.abilityLevels, ...(data.abilityLevels || {}) };
    for (const key of Object.keys(state.abilityLevels)) state.abilityLevels[key] = Math.max(1, Math.min(10, Number(state.abilityLevels[key]) || 1));
    state.companionUpgradeLevels = data.companionUpgradeLevels && typeof data.companionUpgradeLevels === 'object' ? data.companionUpgradeLevels : {};
    state.regionProgress = freshRegionProgress();
    if (data.regionProgress && typeof data.regionProgress === 'object') {
        for (const id of Object.keys(REGION_DATA)) {
            const saved = data.regionProgress[id];
            if (saved) state.regionProgress[id] = {
                kills: Math.max(0, Math.min(getRequiredKills(id), Number(saved.kills) || 0)),
                elapsed: Math.max(0, Number(saved.elapsed) || 0),
                ambushesTriggered: Math.max(0, Math.min(2, Number(saved.ambushesTriggered) || 0)),
                dungeonCleared: !!saved.dungeonCleared,
                bossUnlocked: !!saved.bossUnlocked,
                bossDefeated: !!saved.bossDefeated,
                // A saved recruit flag is never accepted unless that region's boss was beaten.
                rescued: !!saved.rescued && !!saved.bossDefeated
            };
        }
    }
    // Migrate the former single-region save format without resetting the forest.
    state.wolfKills = Math.max(0, Number(data.wolfKills) || 0);
    state.regionProgress.forest.kills = Math.max(state.regionProgress.forest.kills, Math.min(getRequiredKills('forest'), state.wolfKills));
    state.regionProgress.forest.bossDefeated = state.regionProgress.forest.bossDefeated || !!data.bossDefeated;
    state.regionProgress.forest.bossUnlocked = state.regionProgress.forest.bossUnlocked || state.regionProgress.forest.kills >= getRequiredKills('forest') || state.regionProgress.forest.bossDefeated;
    state.regionProgress.forest.rescued = state.regionProgress.forest.rescued || (Number(data.version || 0) < 3 && state.regionProgress.forest.bossDefeated);
    state.bossDefeated = state.regionProgress.forest.bossDefeated;
    state.bossUnlocked = state.regionProgress.forest.bossUnlocked;
    state.aureliaRecruited = state.regionProgress.forest.rescued;
    state.formation = data.formation || 'balanced';
    state.strategy = data.strategy || 'protect';
    state.command = data.command || 'follow';
    state.zone = data.zone === 'base' || REGION_DATA[data.zone] ? data.zone : 'base';
    if (state.zone !== 'base' && !isRegionUnlocked(state.zone)) state.zone = 'base';
    state.worldMinutes = Number(data.worldMinutes) || 9 * 60;
    state.weatherIndex = Number(data.weatherIndex) || 0;
    state.crystalsCollected.clear();
    for (const id of data.collectedCrystalIds ?? []) state.crystalsCollected.add(id);
    interactables.filter(item => item.kind === 'crystal').forEach((item, index) => {
        const collected = state.crystalsCollected.has(`crystal-${index}`);
        item.collected = collected;
        item.mesh.setEnabled(!collected);
    });
    for (const c of companions) {
        const region = Object.values(REGION_DATA).find(r => r.companionId === c.id);
        c.recruited = region ? !!state.regionProgress[region.id].rescued : (c.id === 'reaphel' || c.id === 'sylva');
        c.upgradeLevel = Math.max(0, Math.min(10, Number(state.companionUpgradeLevels[c.id]) || 0));
        c.maxHp = c._baseMaxHp || c.maxHp;
        c.maxHp += c.upgradeLevel * 20;
        c.hp = Math.min(c.maxHp, c.hp);
        c.active = c.recruited && (data.partyActive ? !!data.partyActive[c.id] : c.id === 'reaphel' || c.id === 'sylva');
    }
    // A legacy save may have unlocked Aurelia before the boss requirement existed.
    if (!state.regionProgress.forest.bossDefeated) {
        state.aureliaRecruited = false;
        companions[2].recruited = false;
        companions[2].active = false;
        state.regionProgress.forest.rescued = false;
    }
    let savedX = Number(data.playerX);
    let savedZ = Number(data.playerZ);
    if (!Number.isFinite(savedX)) savedX = state.zone === 'base' ? 80 : REGION_DATA[state.zone]?.center.x ?? 80;
    if (!Number.isFinite(savedZ)) savedZ = state.zone === 'base' ? 73 : REGION_DATA[state.zone]?.center.z ?? 52;
    if ((data.worldLayoutVersion || 0) < 2 && state.zone === 'forest') {
        const wasInsideOldForest = savedX >= -37 && savedX <= 37 && savedZ >= -40 && savedZ <= 34;
        if (wasInsideOldForest) { savedX += FOREST_OFFSET.x; savedZ += FOREST_OFFSET.z; }
        else { savedX = 80; savedZ = 52; }
    }
    if (savedX > 125 && state.zone !== 'base') {
        savedX = REGION_DATA[state.zone].entryPosition.x;
        savedZ = REGION_DATA[state.zone].entryPosition.z;
    }
    player.root.position.set(savedX, 0, savedZ);
    if (state.zone === 'base') {
        setObjective('Headquarters', 'Visit the planning table, hospital or blacksmith, then choose your next expedition.');
    } else {
        const loadedRegion = REGION_DATA[state.zone];
        const loadedProgress = state.regionProgress[state.zone];
        if (loadedProgress.bossDefeated) {
            setObjective(`Explore ${loadedRegion.name}`, `The ${loadedRegion.bossName} has been defeated. Its rescued companion is available at the planning table.`);
        } else if (loadedProgress.bossUnlocked) {
            setObjective(`Defeat ${loadedRegion.bossName}`, `The ${loadedRegion.bossName} guards a crystal prison behind its lair.`);
        } else {
            setObjective(`Explore ${loadedRegion.name}`, `Defeat three ${loadedRegion.enemyName} to reveal ${loadedRegion.bossName}.`);
        }
    }
    applyAppearance();
    updatePrisonCrystalVisibility();
    positionCompanions();
    updateZoneVisuals();
    enemies.forEach(enemy => enemy.root.dispose());
    enemies = [];
    spawnedRegions.clear();
    currentTarget = null;
    for (const id of Object.keys(REGION_DATA)) {
        const progress = state.regionProgress[id];
        if (!progress.bossDefeated) ensureRegionEncounter(id, true);
    }
    $('weather-label').textContent = weatherNames[state.weatherIndex % weatherNames.length];
    $('weather-overlay').className = `weather-overlay ${state.weatherIndex === 1 ? 'rain' : state.weatherIndex === 2 ? 'mist' : ''}`;
    updateHUD();
}

function applyAppearance() {
    playerOutfit.diffuseColor = appearance === 'midnight' ? new Color3(0.14, 0.18, 0.28) : appearance === 'sunrise' ? new Color3(0.42, 0.25, 0.16) : new Color3(0.18, 0.36, 0.28);
    setCharacterRole(player, playerClass);
    player.weapon.material = playerClass === 'mage' ? materials.crystal : playerClass === 'ranger' ? materials.bark : materials.gold;
    if (playerClass === 'mage') player.staffCrystal.material = materials.crystal;
        if (playerClass === 'healer') player.staffCrystal.material = materials.heal;
}
function positionCompanions() {
    const active = activeCompanions();
    active.forEach((c, index) => {
        c.model.root.setEnabled(true);
        const offset = formationOffset(index);
        c.model.root.position.set(player.root.position.x + offset.x, 0, player.root.position.z + offset.z);
    });
    for (const c of companions) {
        const region = Object.values(REGION_DATA).find(r => r.companionId === c.id);
        const isPrisoner = !!region && !state.regionProgress[region.id].rescued;
        c.model.root.setEnabled(isPrisoner || (c.active && c.recruited && !c.recovering));
    }
}
function exportSave() {
    const data = makeSaveData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'legends-of-etheria-save.json';
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Save backup exported. Keep the JSON file somewhere safe.');
}
// -----------------------------------------------------------------------------
// Progression, combat, companions and abilities.
// -----------------------------------------------------------------------------
function gainXP(amount) {
    state.xp += amount;
    while (state.xp >= state.level * 100) {
        state.xp -= state.level * 100;
        state.level++;
        state.hp = 120 + (state.level - 1) * 14;
        state.mana = getMaxMana();
        showToast(`Level ${state.level}! Your health, mana and combat stats increased.`, 4);
    }
    updateHUD();
}
function dealDamage(enemy, amount, attacker = player.root) {
    if (!enemy || enemy.dead) return;
    if (attacker && attacker.position) { enemy.aggroTarget = attacker; enemy.aggroTimer = 14; enemy.lastAttackedBy = attacker.name || 'player'; }
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (!enemy.hitAnimating) {
        enemy.hitAnimating = true;
        const original = enemy.root.scaling.clone();
        const startedAt = performance.now();
        const hitFrame = now => {
            const p = Math.min(1, (now - startedAt) / 190);
            const pulse = Math.sin(p * Math.PI);
            enemy.root.scaling.copyFrom(original.scale(1 + pulse * 0.07));
            if (p < 1 && !enemy.dead) requestAnimationFrame(hitFrame);
            else { enemy.root.scaling.copyFrom(original); enemy.hitAnimating = false; }
        };
        requestAnimationFrame(hitFrame);
    }
    if (enemy.hp <= 0) defeatEnemy(enemy);
}
function defeatEnemy(enemy) {
    if (enemy.dead) return;
    restoreFrozenEnemy(enemy);
    enemy.dead = true;
    enemy.root.setEnabled(false);
    const regionId = enemy.regionId || (enemy.kind === 'wolf' ? 'forest' : null);
    const region = REGION_DATA[regionId];
    const progress = state.regionProgress[regionId];
    if (enemy.kind !== 'boss' && region && progress) {
        if (enemy.dungeonOnly) {
            state.gold += 45;
            gainXP(85);
            if (state.dungeonState) {
                state.dungeonState.remaining = Math.max(0, state.dungeonState.remaining - 1);
                if (state.dungeonState.remaining === 0) {
                    progress.dungeonCleared = true;
                    showToast(`Dungeon cleared! +45 gold and experience.`, 4);
                    void saveGame(true);
                }
            }
        } else {
            progress.kills = Math.min(getRequiredKills(regionId), progress.kills + 1);
            if (regionId === 'forest') state.wolfKills = progress.kills;
            state.gold += regionId === 'forest' ? 18 : 30;
            gainXP(regionId === 'forest' ? 55 : 72 + Math.round(region.difficulty * 8));
            showToast(`${enemy.displayName || region.enemyName} defeated · +XP · Gold gained`);
            if (progress.kills >= getRequiredKills(regionId) && !progress.bossUnlocked && !progress.bossDefeated) {
                if ((progress.elapsed || 0) >= 60) spawnRegionBoss(regionId);
                else showToast(`The trail is still opening. Keep exploring for ${Math.ceil(60 - progress.elapsed)} more seconds.`);
            } else if (!progress.bossUnlocked) {
                setObjective(`Hunt the ${region.enemyName}`, `${region.name}: ${progress.kills} of ${getRequiredKills(regionId)} threats defeated.`);
            }
        }
    } else if (enemy.kind === 'boss' && region && progress) {
        progress.bossDefeated = true;
        progress.bossUnlocked = true;
        if (regionId === 'forest') {
            state.bossDefeated = true;
            state.questComplete = true;
            state.bossUnlocked = true;
        }
        state.gold += region.rewardGold;
        state.tokens += 1;
        gainXP(region.rewardXP);
        state.combatTimer = 0;
        setObjective(`${region.bossName} defeated`, `A crystal prison behind the boss contains ${companionById[region.companionId].name}.`);
        updateHUD();
        void saveGame(true);
        beginRescueCutscene(regionId);
    }
    updateHUD();
    void saveGame(true);
}

function attack() {
    if (state.paused || !state.started || state.attackCooldown > 0) return;

    const melee = playerClass === 'knight' || playerClass === 'warrior';
    const range = melee ? 3.8 : 22;
    const target = currentTarget && !currentTarget.dead &&
        distance(player.root.position, currentTarget.root.position) <= range
        ? currentTarget : nearestEnemy(range);

    if (!target) {
        showToast(melee ? 'Move closer for a sword attack.' : 'No enemy is within attack range.', 1.3);
        return;
    }

    const manaCosts = { knight: 0, warrior: 2, ranger: 2, mage: 5, healer: 3 };
    const cost = manaCosts[playerClass] ?? 2;
    if (state.mana < cost) {
        state.attackCooldown = 0.5;
        showToast(`Your basic attack needs ${cost} MP.`, 1.2);
        return;
    }

    state.attackCooldown = 0.5; // Hidden anti-spam delay; no visible cooldown bar.
    state.mana = Math.max(0, state.mana - cost);
    currentTarget = target;

    if (playerClass === 'knight' || playerClass === 'warrior') {
        animateCharacterAttack(player);
        const strikeDamage = (playerClass === 'knight' ? 31 : 28) + state.weaponLevel * 5 + state.level * 2;
        window.setTimeout(() => { if (!target.dead) dealDamage(target, strikeDamage, player.root); }, 190);
        createSwordSlash(player);
    } else if (playerClass === 'ranger') {
        animateCharacterAttack(player);
        window.setTimeout(() => {
            if (state.started && !target.dead) {
                spawnArrowProjectile(player.root.position.add(new Vector3(0, 1.42, 0.15)), target,
                    23 + state.weaponLevel * 3 + state.level * 2, materials.gold, 23, player.root);
            }
        }, 275);
    } else {
        animateCharacterAttack(player);
        const direction = target.root.position.subtract(player.root.position);
        direction.y = 0;
        direction.normalize();
        const glyphPosition = player.root.position.add(direction.scale(1.05)).add(new Vector3(0, 1.45, 0));
        drawMagicGlyph(glyphPosition, playerClass === 'healer' ? new Color3(0.34, 1, 0.56) : new Color3(0.32, 0.88, 1),
            { floor: false, yaw: Math.atan2(direction.x, direction.z), size: 0.48, duration: 530 }, () => {
                if (!target.dead) spawnProjectile(glyphPosition.clone(), target,
                    22 + state.weaponLevel * 3 + state.level * 2,
                    playerClass === 'healer' ? materials.heal : materials.crystal, 19);
            });
    }
    updateHUD();
}

function createSwordSlash(model) {
    if (!model || !model.root) return;
    const slash = MeshBuilder.CreateTorus('close-range sword slash arc', {
        diameter: 1.65, thickness: 0.055, tessellation: 32
    }, scene);
    slash.parent = model.root;
    slash.position.set(0.1, 1.18, 0.75);
    slash.rotation.x = Math.PI / 2;
    slash.material = materials.paleStone;
    slash.isPickable = false;
    const startedAt = performance.now();
    const frame = now => {
        const p = Math.min(1, (now - startedAt) / 270);
        slash.scaling.set(0.35 + p * 0.9, 0.5 + p * 0.85, 1);
        slash.rotation.z = -0.9 + p * 1.8;
        slash.visibility = 1 - p;
        if (p < 1) requestAnimationFrame(frame);
        else slash.dispose();
    };
    requestAnimationFrame(frame);
}

function spawnProjectile(from, target, damage, color, speed = 17, source = player.root) {
    const orb = MeshBuilder.CreateSphere('magic projectile', { diameter: 0.32, segments: 10 }, scene);
    orb.position.copyFrom(from);
    orb.material = color;
    projectiles.push({
        mesh: orb, from: from.clone(),
        to: target.root.position.add(new Vector3(0, target.kind === 'boss' ? 1.5 : 1, 0)),
        age: 0, duration: Math.max(0.18, distance(from, target.root.position) / speed), damage, target, source
    });
}

function spawnArrowProjectile(from, target, damage, color = materials.gold, speed = 23, source = player.root) {
    const arrow = new TransformNode('flying ranger arrow', scene);
    const shaft = MeshBuilder.CreateCylinder('arrow shaft', { height: 0.88, diameter: 0.035, tessellation: 6 }, scene);
    shaft.parent = arrow;
    shaft.rotation.x = Math.PI / 2;
    shaft.material = color;
    const tip = MeshBuilder.CreateCylinder('arrowhead', { height: 0.2, diameterTop: 0, diameterBottom: 0.12, tessellation: 6 }, scene);
    tip.parent = arrow;
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.48;
    tip.material = materials.paleStone;
    const feather = MeshBuilder.CreateBox('arrow fletching', { width: 0.13, height: 0.035, depth: 0.18 }, scene);
    feather.parent = arrow;
    feather.position.z = -0.38;
    feather.material = materials.cloth;

    const destination = target.root.position.add(new Vector3(0, target.kind === 'boss' ? 1.5 : 1, 0));
    const direction = destination.subtract(from);
    direction.normalize();
    arrow.position.copyFrom(from);
    arrow.rotation.y = Math.atan2(direction.x, direction.z);
    projectiles.push({
        mesh: arrow, from: from.clone(), to: destination.clone(), age: 0,
        duration: Math.max(0.16, distance(from, target.root.position) / speed), damage, target, source
    });
}

function castAbility(id) {
    if (!state.started || state.paused) return;
    if (!isAbilityUnlocked(id)) { showToast('Defeat the region boss and rescue its prisoner to unlock this ability.'); return; }
    if (state.abilityCooldowns[id] > 0) { showToast('That ability is still recharging.',1.2); return; }
    if (id === 'barrier' || id === 'antiMagic') { createProtectionField(id === 'antiMagic'); return; }
    if (id === 'deathBeam') {
        const cost=70;if(state.mana<cost){showToast(`Death Beam requires ${cost} MP.`);return;}
        state.mana-=cost;state.abilityCooldowns.deathBeam=18;animateCharacterAttack(player);
        const forward=camera.getDirection(new Vector3(0,0,1));forward.y=0;forward.normalize();
        const back=player.root.position.subtract(forward.scale(2.2));
        const yaw=Math.atan2(forward.x,forward.z);
        drawMagicGlyph(back.add(new Vector3(0,0.065,0)),new Color3(1,0.12,0.12),{floor:true,size:2.0,duration:1050},()=>{
            const length=27;
            const beamMat=new StandardMaterial('death beam red light',scene);beamMat.diffuseColor=new Color3(1,0.04,0.03);beamMat.emissiveColor=new Color3(0.9,0.015,0.015);beamMat.alpha=0.72;beamMat.backFaceCulling=false;
            const beam=MeshBuilder.CreateCylinder('wide red death beam',{height:1,diameter:2.3,tessellation:24},scene);
            beam.position.copyFrom(player.root.position.add(forward.scale(length*0.5)).add(new Vector3(0,1.45,0)));
            beam.rotation.set(Math.PI/2,yaw,0);beam.scaling.set(3.2,length,3.2);beam.material=beamMat;beam.isPickable=false;
            const level=state.abilityLevels.deathBeam||1;
            let hits=0;
            for(const enemy of enemies){if(enemy.dead)continue;const rel=enemy.root.position.subtract(player.root.position);rel.y=0;const along=Vector3.Dot(rel,forward);if(along>0&&along<length){const closest=player.root.position.add(forward.scale(along));if(distance(enemy.root.position,closest)<4.7){dealDamage(enemy,135+level*22,player.root);hits++;}}}
            const start=performance.now();const fade=now=>{const t=Math.min(1,(now-start)/1050);beamMat.alpha=0.72*(1-t);if(t<1)requestAnimationFrame(fade);else{beam.dispose();beamMat.dispose();}};requestAnimationFrame(fade);
            showToast(`Death Beam tears through the path! ${hits} enemies struck.`,3.5);
        });
        updateHUD();return;
    }
    const costs={arcane:12,heal:18,nova:24};
    if(!(id in costs))return;
    const level=state.abilityLevels[id]||1;
    let target=null;
    if(id==='arcane'||id==='nova'){
        target=currentTarget&&!currentTarget.dead&&distance(player.root.position,currentTarget.root.position)<=20?currentTarget:nearestEnemy(20);
        if(!target){showToast(id==='arcane'?'No target is close enough for Arcane Bolt.':'No target is close enough for Frost Nova.',1.4);return;}
    }
    if(state.mana<costs[id]){showToast('Not enough mana. Wait for it to recover.',1.5);return;}
    state.mana-=costs[id];animateCharacterAttack(player);
    if(id==='arcane'){
        state.abilityCooldowns.arcane=1.3;
        const direction=target.root.position.subtract(player.root.position);direction.y=0;direction.normalize();
        const glyphPosition=player.root.position.add(direction.scale(1.28)).add(new Vector3(0,1.52,0));
        drawMagicGlyph(glyphPosition,new Color3(0.28,0.9,1),{floor:false,yaw:Math.atan2(direction.x,direction.z),size:0.66,duration:790},()=>{
            if(!target.dead)spawnProjectile(glyphPosition.clone(),target,48*level+state.level*4+state.weaponLevel*2,materials.crystal,20,player.root);
        });
        showToast('Arcane Bolt!');
    }else if(id==='heal'){
        state.abilityCooldowns.heal=8;
        const heal=36+(level-1)*8;
        state.hp=Math.min(120+(state.level-1)*14,state.hp+heal);playHealingEffect(player.root);
        for(const c of activeCompanions()){c.hp=Math.min(c.maxHp,c.hp+heal);playHealingEffect(c.model.root);}
        showToast('Healing Wave restores health to your party.');
    }else{
        state.abilityCooldowns.nova=12;target.telegraphTimer=1.4;
        const freezePosition=target.root.position.clone();
        const frostGlyphRadius=getTargetVisualRadius(target)*FROST_GLYPH_TARGET_RADIUS_MULTIPLIER;
        drawMagicGlyph(freezePosition.add(new Vector3(0,0.055,0)),new Color3(0.36,0.88,1),{floor:true,size:frostGlyphRadius/MAGIC_GLYPH_SIZE_MULTIPLIER,duration:730},()=>{
            if(target.dead)return;
            createRisingMagicBeam(target.root.position,new Color3(0.36,0.88,1),2.65,0.88,620,()=>{
                if(!target.dead){freezeEnemy(target,2.8+(level-1)*0.25);dealDamage(target,62*level+state.level*4,player.root);}
            });
        });
        showToast('Frost Nova freezes the targeted enemy!');
    }
    updateHUD();
}


function burstEffect(position, material, size) {
    const effect = MeshBuilder.CreateTorus('spell burst', { diameter: 1.3, thickness: 0.12, tessellation: 32 }, scene);
    effect.position.set(position.x, 0.12, position.z);
    effect.rotation.x = Math.PI / 2;
    effect.material = material;
    const begin = performance.now();
    const animate = () => {
        const pct = Math.min(1, (performance.now() - begin) / 430);
        effect.scaling.setAll(1 + pct * size / 2);
        effect.visibility = 1 - pct;
        if (pct < 1)
            requestAnimationFrame(animate);
        else
            effect.dispose();
    };
    animate();
}
function companionAttack(companion, enemy) {
    if (!companion || !enemy || enemy.dead) return;
    const model = companion.model;
    const role = String(model.role || companion.role || '').toLowerCase();
    animateCharacterAttack(model);

    if (companion.role === 'Knight' || role === 'knight' || role === 'warrior') {
        if (distance(model.root.position, enemy.root.position) <= 3.0) {
            const strikeDamage = 19 + state.level * 2 + (companion.upgradeLevel || 0) * 4;
            window.setTimeout(() => { if (!enemy.dead) dealDamage(enemy, strikeDamage, model.root); }, 190);
            createSwordSlash(model);
        }
    } else if (role === 'ranger' || role === 'archer' || companion.role === 'Archer') {
        window.setTimeout(() => {
            if (!enemy.dead && model.root.isEnabled()) {
                spawnArrowProjectile(model.root.position.add(new Vector3(0, 1.42, 0.15)), enemy,
                    22 + state.level * 2 + (companion.upgradeLevel || 0) * 4, materials.gold, 21, model.root);
            }
        }, 275);
    } else {
        const direction = enemy.root.position.subtract(model.root.position);
        direction.y = 0;
        direction.normalize();
        const glyphPosition = model.root.position.add(direction.scale(0.95)).add(new Vector3(0, 1.42, 0));
        drawMagicGlyph(glyphPosition, role === 'healer' || companion.role === 'Healer'
            ? new Color3(0.34, 1, 0.56) : new Color3(0.3, 0.86, 1),
            { floor: false, yaw: Math.atan2(direction.x, direction.z), size: 0.43, duration: 500 }, () => {
                if (!enemy.dead) spawnProjectile(glyphPosition.clone(), enemy,
                    companion.role === 'Healer' ? 13 + (companion.upgradeLevel || 0) * 3 : 21 + state.level * 2 + (companion.upgradeLevel || 0) * 4,
                    companion.role === 'Healer' ? materials.heal : materials.crystal, 17, model.root);
            });
    }
}
function issueCommand(command) {
    state.command = command;
    for (const companion of companions) companion.command = null;
    if (command === 'attack')
        currentTarget = nearestEnemy(30);
    if (command === 'hold')
        for (const c of activeCompanions())
            c.model.root.metadata = { ...(c.model.root.metadata || {}), holdX: c.model.root.position.x, holdZ: c.model.root.position.z };
    showToast(`Party command: ${command === 'follow' ? 'Follow me' : command === 'attack' ? 'Attack nearest enemy' : command === 'hold' ? 'Hold position' : command === 'defend' ? 'Defend the hero' : 'Advance'}.`);
    $('command-overlay').classList.add('hidden');
}
function findCompanionFromPick(mesh) {
    let node = mesh;
    while (node) {
        const id = node.metadata?.companionId;
        if (id) return companions.find(c => c.id === id) || null;
        node = node.parent;
    }
    return null;
}
function openCompanionCommands(companion) {
    selectedCompanion = companion;
    $('command-menu-title').textContent = `${companion.name} · ${companion.role}`;
    $('command-menu-subtitle').textContent = 'This order applies to this companion only.';
    $('party-command-section').classList.add('hidden');
    $('companion-command-section').classList.remove('hidden');
    $('command-overlay').classList.remove('hidden');
}
function openPartyCommands() {
    selectedCompanion = null;
    $('command-menu-title').textContent = 'Give an order';
    $('command-menu-subtitle').textContent = 'Choose an order for your active party.';
    $('companion-command-section').classList.add('hidden');
    $('party-command-section').classList.remove('hidden');
    $('command-overlay').classList.remove('hidden');
}
function issueCompanionCommand(command) {
    if (!selectedCompanion) return;
    const c = selectedCompanion;
    if (command === 'follow') {
        c.command = 'follow';
        showToast(`${c.name} will return to the party formation.`);
    } else if (command === 'hold') {
        c.command = 'hold';
        c.model.root.metadata = { ...(c.model.root.metadata || {}), holdX: c.model.root.position.x, holdZ: c.model.root.position.z };
        showToast(`${c.name} will hold this position.`);
    } else if (command === 'attack') {
        c.command = 'attack';
        currentTarget = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(30);
        showToast(`${c.name} is targeting the selected enemy.`);
    } else if (command === 'protect') {
        c.command = 'defend';
        state.protectionTimer = Math.max(state.protectionTimer, 5);
        showToast(`${c.name} is protecting you for a short time.`);
    }
    $('command-overlay').classList.add('hidden');
}
function useCompanionAbility() {
    const c = selectedCompanion;
    if (!c || !c.active || !c.recruited || c.recovering) {
        showToast('That companion is not currently active.');
        return;
    }
    const now = performance.now();
    if (c.specialCooldown > 0) {
        showToast(`${c.name}'s special ability recharges in ${Math.ceil(c.specialCooldown)} seconds.`);
        return;
    }
    animateCharacterAttack(c.model);
    if (c.role === 'Healer') {
        const candidates = [{ hp: state.hp, maxHp: 120 + (state.level - 1) * 14, root: player.root, player: true }, ...companions.filter(x => x.recruited && !x.recovering).map(x => ({ hp: x.hp, maxHp: x.maxHp, root: x.model.root, companion: x }))];
        candidates.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const target = candidates[0];
        if (target.player) state.hp = Math.min(target.maxHp, state.hp + 42);
        else target.companion.hp = Math.min(target.maxHp, target.companion.hp + 42);
        playHealingEffect(target.root);
        showToast(`${c.name} casts Healing Light on ${target.player ? playerName : target.companion.name}.`);
        c.specialCooldown = 15;
    } else if (c.role === 'Archer') {
        const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(22);
        if (!target) { showToast(`${c.name} has no target in range.`); return; }
        spawnArrowProjectile(c.model.root.position.add(new Vector3(0, 1.5, 0)), target, 48 + state.level * 3, materials.gold, 20, c.model.root);
        showToast(`${c.name} fires a Piercing Shot.`);
        c.specialCooldown = 15;
    } else if (c.role === 'Summoner') {
        const amount = 4; // Special call brings four additional spirits; passive summons retain their own five-ally cap.
        for (let i = 0; i < amount; i++) spawnSummonedAlly(c, 65);
        const center = player.root.position.clone();
        let hits = 0;
        for (const enemy of enemies) {
            if (!enemy.dead && distance(enemy.root.position, center) <= 9) {
                dealDamage(enemy, 52 + state.level * 5, c.model.root);
                hits++;
            }
        }
        burstEffect(center, materials.mireGlow, 6.5);
        showToast(`${c.name} summons ${amount} spirits and releases a mire burst (${hits} enemies hit).`, 4);
        c.specialCooldown = 15;
    } else {
        state.protectionTimer = Math.max(state.protectionTimer, 7);
        c.command = 'defend';
        burstEffect(player.root.position, materials.gold, 2.2);
        showToast(`${c.name} raises a Guardian Ward. Incoming damage is reduced briefly.`);
        c.specialCooldown = 15;
    }
    $('command-overlay').classList.add('hidden');
    updateHUD();
}


function formationOffset(index) {
    if (state.formation === 'defensive')
        return [new Vector3(-1.8, 0, 2), new Vector3(1.8, 0, 2), new Vector3(0, 0, 3.2)][index] ?? Vector3.Zero();
    if (state.formation === 'offensive')
        return [new Vector3(-1.1, 0, -2), new Vector3(1.1, 0, -2), new Vector3(0, 0, 2)][index] ?? Vector3.Zero();
    return [new Vector3(-1.6, 0, 1.5), new Vector3(1.6, 0, 1.5), new Vector3(0, 0, 3)][index] ?? Vector3.Zero();
}
function moveToward(root, destination, speed, dt) {
    const delta = destination.subtract(root.position);
    delta.y = 0;
    const length = delta.length();
    if (length > 0.12) {
        const direction = delta.scale(1 / length);
        root.position.addInPlace(direction.scale(Math.min(length, speed * dt)));
        root.rotation.y = Math.atan2(direction.x, direction.z);
    }
}
// -----------------------------------------------------------------------------
// Base, travel, planning and interaction actions.
// -----------------------------------------------------------------------------
function regionAtPosition(x, z) {
    if (x >= 55 && x <= 105 && z >= 55 && z <= 105) return 'base';
    for (const id of REGION_ORDER) {
        const b = REGION_DATA[id].bounds;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return id;
    }
    // The narrow connector gaps inherit the area the player is approaching.
    if (Math.abs(x - 80) < 5.5) {
        if (z < 55 && z > -246) return 'forest';
        if (z <= -240 && z > -526) return 'emberfall';
        if (z <= -520 && z > -806) return 'frostveil';
        if (z <= -800 && z > -1086) return 'starfall';
        if (z <= -1080 && z > -1362) return 'mire';
    }
    return null;
}
function updateZoneFromPosition() {
    const x = player.root.position.x, z = player.root.position.z;
    const nextZone = regionAtPosition(x, z) || state.zone || 'base';
    if (nextZone !== 'base' && nextZone !== state.zone && !isRegionUnlocked(nextZone)) {
        const nextRegionIndex = REGION_ORDER.indexOf(nextZone);
        const previousRegion = REGION_DATA[REGION_ORDER[Math.max(0, nextRegionIndex - 1)]];
        player.root.position.copyFrom(previousRegion?.bossPosition || new Vector3(80, 0, 48));
        showToast(`The way to ${REGION_DATA[nextZone].name} is sealed. Rescue the previous region's prisoner first.`, 4);
        return;
    }
    if (nextZone !== state.zone) {
        state.zone = nextZone;
        updateZoneVisuals();
        if (nextZone !== 'base') {
            ensureRegionEncounter(nextZone);
            const region = REGION_DATA[nextZone];
            const progress = state.regionProgress[nextZone];
            if (progress.bossDefeated) setObjective(`Explore ${region.name}`, `The ${region.bossName} has been defeated. Its rescued companion is available at the planning table.`);
            else if (progress.bossUnlocked) setObjective(`Defeat ${region.bossName}`, `The boss is guarding a crystal prison behind its lair.`);
            else setObjective(`Explore ${region.name}`, `Defeat three ${region.enemyName} to reveal the region boss.`);
        } else {
            setObjective('Headquarters', 'Visit the planning table, hospital or blacksmith, then choose your next expedition.');
        }
        showToast(nextZone === 'base' ? 'You have arrived at headquarters.' : `You have entered ${REGION_DATA[nextZone].name}.`);
        updateHUD();
    }
}
function setZone(zone) {
    if (state.dungeonState && zone !== state.zone) exitDungeon();
    if (zone !== 'base' && !REGION_DATA[zone]) zone = 'base';
    if (zone !== 'base' && !isRegionUnlocked(zone)) {
        showToast(`That region is still sealed. Free the prisoner in the previous region first.`, 3.5);
        return;
    }
    state.zone = zone;
    updateZoneVisuals();
    if (zone === 'base') {
        player.root.position.set(80, 0, 73);
        positionCompanions();
        setObjective('Headquarters', 'Visit the planning table, rest at the hospital and upgrade your equipment before setting out.');
    } else {
        const region = REGION_DATA[zone];
        const entry = region.entryPosition.clone();
        player.root.position.copyFrom(entry);
        ensureRegionEncounter(zone);
        positionCompanions();
        const progress = state.regionProgress[zone];
        setObjective(progress.bossDefeated ? `Explore ${region.name}` : progress.bossUnlocked ? `Defeat ${region.bossName}` : `Explore ${region.name}`, progress.bossDefeated ? 'The area has been cleared. Continue exploring and look for the road to the next region.' : `Defeat three ${region.enemyName} to draw out ${region.bossName}.`);
    }
    camera.target = player.root.position.add(new Vector3(0, 1.2, 0));
    nearby = null;
    updateHUD();
}

function updateZoneVisuals() {
    if (state.zone === 'base') {
        scene.fogDensity = 0.0045;
        scene.fogColor = new Color3(0.21, 0.29, 0.23);
        return;
    }
    const fogColors = {
        forest: new Color3(0.16, 0.27, 0.20), emberfall: new Color3(0.29, 0.13, 0.10),
        frostveil: new Color3(0.52, 0.68, 0.77), mire: new Color3(0.11, 0.22, 0.17),
        starfall: new Color3(0.48, 0.37, 0.24)
    };
    scene.fogDensity = state.weatherIndex === 2 ? 0.014 : 0.0065;
    scene.fogColor = fogColors[state.zone] || fogColors.forest;
}

function canReturnToBase() {
    return state.zone !== 'base';
}
function returnToBase() {
    if (state.zone === 'base') {
        showToast('You are already at your headquarters.');
        return;
    }
    if (!canReturnToBase()) {
        showToast('You are in combat. Create some distance and escape the enemies before returning to base.');
        return;
    }
    setZone('base');
    showToast('You returned safely to headquarters. Your expedition can resume whenever you are ready.');
    void saveGame(true);
}
function departForForest() {
    applyPlanningSelections();
    $('planning-overlay').classList.add('hidden');
    $('pause-overlay').classList.add('hidden');
    state.paused = false;
    showToast('Expedition ready. Follow the stone road out of camp to reach the Emerald Forest.');
    if (!state.bossDefeated)
        setObjective(state.bossUnlocked ? 'Defeat the Grove Guardian' : 'Clear the forest path', state.bossUnlocked ? 'Travel north to the ancient grove and defeat the guardian.' : 'Collect Ether crystals and defeat three wolves to reveal the Grove Guardian.');
}
function openPause() {
    if (!state.started || $('start-overlay').classList.contains('hidden') === false)
        return;
    state.paused = true;
    $('pause-overlay').classList.remove('hidden');
    $('planning-overlay').classList.add('hidden');
    $('inventory-overlay').classList.add('hidden');
    $('settings-overlay').classList.add('hidden');
}
function closePause() { $('pause-overlay').classList.add('hidden'); state.paused = false; }
function ensureCompanionPlanningControls() {
    const section = document.querySelector('#planning-overlay .planning-section');
    if (!section) return;
    let list = section.querySelector('.extra-companion-options');
    if (!list) {
        list = document.createElement('div');
        list.className = 'extra-companion-options';
        section.appendChild(list);
    }
    list.innerHTML = '';
    for (const c of companions.slice(3)) {
        const label = document.createElement('label');
        label.className = 'check-row';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `party-${c.id}`;
        input.checked = c.active;
        input.disabled = !c.recruited;
        const span = document.createElement('span');
        const title = document.createElement('b'); title.textContent = c.name;
        const subtitle = document.createElement('small'); subtitle.textContent = c.recruited ? `${c.role} · Rescued` : `${c.role} · Trapped in ${Object.values(REGION_DATA).find(r => r.companionId === c.id)?.name || 'a region'}`;
        span.append(title, subtitle); label.append(input, span); list.appendChild(label);
    }
}
function openPlanning(fromPause) {
    planningFromPaused = fromPause || state.paused;
    state.paused = true;
    $('pause-overlay').classList.add('hidden');
    $('planning-overlay').classList.remove('hidden');
    ensureCompanionPlanningControls();
    companions.forEach(c => {
        const input = document.getElementById(`party-${c.id}`);
        if (input) { input.checked = c.active; input.disabled = !c.recruited; }
    });
    $('formation-select').value = state.formation;
    $('strategy-select').value = state.strategy;
}
function applyPlanningSelections() {
    const chosen = companions.filter(c => {
        const input = document.getElementById(`party-${c.id}`);
        return c.recruited && !!input?.checked;
    });
    if (chosen.length > 3) {
        chosen.slice(3).forEach(c => {
            const input = document.getElementById(`party-${c.id}`);
            if (input) input.checked = false;
        });
        showToast('Your expedition can include up to three companions.');
    }
    const allowed = new Set(chosen.slice(0, 3).map(c => c.id));
    companions.forEach(c => { c.active = c.recruited && allowed.has(c.id); });
    state.formation = $('formation-select').value;
    state.strategy = $('strategy-select').value;
    if (activeCompanions().length === 0) companions[0].active = true;
    positionCompanions();
    updateHUD();
}

function closePlanning() {
    applyPlanningSelections();
    $('planning-overlay').classList.add('hidden');
    if (planningFromPaused) {
        state.paused = true;
        $('pause-overlay').classList.remove('hidden');
    }
    else
        state.paused = false;
    void saveGame(true);
}
function ensureUpgradePanel() {
    const overlay=$('inventory-overlay');
    let panel=overlay.querySelector('#etheria-upgrade-panel');
    if(panel)return panel;
    panel=document.createElement('section');panel.id='etheria-upgrade-panel';
    panel.style.cssText='margin-top:18px;padding:16px;border:1px solid rgba(205,190,145,.24);border-radius:14px;background:rgba(12,24,20,.58);color:#e9e5d6;';
    const actions=overlay.querySelector('.modal-actions');
    if(actions)actions.before(panel);else overlay.querySelector('.modal')?.appendChild(panel);
    panel.addEventListener('click',event=>{
        const button=event.target.closest('[data-upgrade-kind]');if(!button||button.disabled)return;
        purchaseUpgrade(button.dataset.upgradeKind,button.dataset.upgradeId||'');
    });
    return panel;
}
function upgradePrice(kind,id='') {
    if(kind==='mana')return 160*(state.manaUpgradeLevel+1);
    if(kind==='ability')return 125*(state.abilityLevels[id]||1);
    const companion=companionById[id];return companion?110*((companion.upgradeLevel||0)+1):Infinity;
}
function purchaseUpgrade(kind,id='') {
    let cost=upgradePrice(kind,id);
    if(!Number.isFinite(cost)){showToast('That upgrade is unavailable.');return;}
    if(kind==='mana'&&state.manaUpgradeLevel>=10){showToast('Mana capacity is fully upgraded.');return;}
    if(kind==='ability'&&(state.abilityLevels[id]||1)>=10){showToast('That ability is fully upgraded.');return;}
    const companion=companionById[id];
    if(kind==='companion'&&(!companion||!companion.recruited)){showToast('Rescue this companion before upgrading them.');return;}
    if(kind==='companion'&&(companion.upgradeLevel||0)>=10){showToast(`${companion.name} is fully upgraded.`);return;}
    if(state.gold<cost){showToast(`You need ${cost} gold for this upgrade. You have ${state.gold}.`);return;}
    state.gold-=cost;
    if(kind==='mana'){
        state.manaUpgradeLevel++;state.mana=Math.min(getMaxMana(),state.mana+20);
        showToast(`Mana capacity upgraded to ${getMaxMana()} MP.`);
    }else if(kind==='ability'){
        state.abilityLevels[id]=(state.abilityLevels[id]||1)+1;
        showToast(`${id==='antiMagic'?'Anti-Magic Barrier':id==='deathBeam'?'Death Beam':id[0].toUpperCase()+id.slice(1)} upgraded to level ${state.abilityLevels[id]}.`);
    }else{
        companion.upgradeLevel=(companion.upgradeLevel||0)+1;
        companion.maxHp=(companion._baseMaxHp||companion.maxHp)+companion.upgradeLevel*20;
        companion.hp=Math.min(companion.maxHp,companion.hp+20);
        state.companionUpgradeLevels[id]=companion.upgradeLevel;
        showToast(`${companion.name} upgraded to level ${companion.upgradeLevel}: +20 maximum HP and stronger attacks.`);
    }
    updateHUD();updateUpgradePanel();void saveGame(true);
}
function updateUpgradePanel() {
    const panel=document.getElementById('etheria-upgrade-panel');if(!panel)return;
    const money=state.gold;
    const button=(kind,id,title,detail,cost,level,max=10)=>{
        const capped=level>=max;
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(220,220,205,.12)"><div style="min-width:0"><b>${title}</b><div style="font:12px/1.4 system-ui;color:#b9c9bf">${detail} · Level ${level}/${max}</div></div><button data-upgrade-kind="${kind}" data-upgrade-id="${id}" ${capped||money<cost?'disabled':''} style="min-width:110px;padding:8px 10px;border:1px solid rgba(207,189,128,.45);border-radius:9px;background:${capped?'#39443d':'#283f36'};color:#f2e8c8;cursor:pointer;opacity:${capped||money<cost?'.55':'1'}">${capped?'MAX':`${cost} gold`}</button></div>`;
    };
    const manaLevel=state.manaUpgradeLevel||0;
    let html=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3 style="margin:0;font:600 16px Georgia,serif">Upgrades & Training</h3><b style="color:#e3c97e">${money} gold</b></div><p style="margin:6px 0 10px;font:12px system-ui;color:#bac9be">Upgrade costs increase automatically with each level. Spend gold to strengthen spells, mana and teammates.</p>`;
    html+=button('mana','mana','Mana Capacity',`+20 maximum MP · Current ${getMaxMana()} MP`,upgradePrice('mana'),manaLevel,10);
    for(const id of ['arcane','heal','nova','barrier','antiMagic','deathBeam'])if(isAbilityUnlocked(id)){
        const titles={arcane:'Arcane Bolt',heal:'Healing Wave',nova:'Frost Nova',barrier:'Barrier',antiMagic:'Anti-Magic Barrier',deathBeam:'Death Beam'};
        const details={arcane:'Stronger projectile',heal:'More healing',nova:'More damage and freeze time',barrier:'More shield HP and duration',antiMagic:'More anti-magic HP and duration',deathBeam:'More beam damage'};
        const level=state.abilityLevels[id]||1;
        html+=button('ability',id,titles[id],details[id],upgradePrice('ability',id),level,10);
    }
    const recruited=companions.filter(c=>c.recruited);
    if(recruited.length){html+='<h4 style="margin:18px 0 2px;font:600 14px Georgia,serif;color:#e8d9ac">Companion Training</h4>';
        for(const c of recruited)html+=button('companion',c.id,c.name,`+20 maximum HP and stronger attacks · HP ${c.maxHp}`,upgradePrice('companion',c.id),c.upgradeLevel||0,10);
    }
    panel.innerHTML=html;
}

function openInventory(fromPause = false) {
    inventoryFromPaused = fromPause || state.paused;
    state.paused = true;
    $('pause-overlay').classList.add('hidden');
    $('inventory-overlay').classList.remove('hidden');
    ensureUpgradePanel();
    updateHUD();
    updateUpgradePanel();
}
function closeInventory() {
    $('inventory-overlay').classList.add('hidden');
    state.paused = inventoryFromPaused;
    if (inventoryFromPaused)
        $('pause-overlay').classList.remove('hidden');
}
function sleepUntilMorning() {
    state.worldMinutes = 8 * 60;
    state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 60);
    state.mana = getMaxMana();
    for (const c of companions)
        if (c.recruited) {
            c.hp = c.maxHp;
            c.recovering = false;
            c.model.root.setEnabled(c.active);
        }
    showToast('You rested until morning. Your party has recovered.');
    updateHUD();
    void saveGame(true);
}
function useHospital() {
    state.hp = 120 + (state.level - 1) * 14;
    state.mana = getMaxMana();
    for (const c of companions)
        if (c.recruited) {
            c.hp = c.maxHp;
            c.recovering = false;
            c.model.root.setEnabled(c.active);
        }
    showToast('The hospital has fully restored your party.');
    updateHUD();
    void saveGame(true);
}
function upgradeWeapon() {
    const cost = 75 * state.weaponLevel;
    if (state.gold < cost) {
        showToast(`You need ${cost} gold for the next weapon upgrade.`);
        return;
    }
    state.gold -= cost;
    state.weaponLevel++;
    showToast(`Weapon upgraded to level ${state.weaponLevel}. Your attacks are stronger.`);
    updateHUD();
    void saveGame(true);
}
function enterDungeon(regionId) {
    const progress=state.regionProgress[regionId], region=REGION_DATA[regionId];
    const landmark=dungeonLandmarks.find(x=>x.regionId===regionId);
    if(!region||!landmark||!isRegionUnlocked(regionId)){showToast('This dungeon is still sealed.');return;}
    if(progress.dungeonCleared){showToast('This dungeon has already been cleared.');return;}
    if(state.dungeonState){showToast('You are already inside a dungeon.');return;}
    state.dungeonState={regionId,returnPosition:player.root.position.clone(),remaining:3};
    landmark.roomMeshes.forEach(mesh=>mesh.setEnabled(true));
    player.root.position.set(region.dungeonRoomPosition.x,0,region.dungeonRoomPosition.z+8);
    positionCompanions();
    for(let i=0;i<3;i++) addRegionalEnemy(regionId,new Vector3(region.dungeonRoomPosition.x+(i-1)*7,0,region.dungeonRoomPosition.z-5-(i%2)*5),i,true);
    interactables.push({kind:'dungeonExit',regionId,label:'Leave the dungeon',position:new Vector3(region.dungeonRoomPosition.x,0,region.dungeonRoomPosition.z+11),mesh:landmark.room});
    nearby=null;showToast(`Dungeon entered: ${region.name}. Defeat the three guardians to clear it.`,4);
    updateHUD();
}
function exitDungeon() {
    const dungeon=state.dungeonState;if(!dungeon)return;
    const landmark=dungeonLandmarks.find(x=>x.regionId===dungeon.regionId);
    if(landmark)landmark.roomMeshes.forEach(mesh=>mesh.setEnabled(false));
    enemies.filter(e=>e.dungeonOnly&&e.regionId===dungeon.regionId&&!e.dead).forEach(e=>{e.dead=true;e.root.dispose();});
    enemies=enemies.filter(e=>!e.dead);
    interactables=interactables.filter(item=>item.kind!=='dungeonExit');
    const returnPosition=dungeon.returnPosition;
    state.dungeonState=null;
    if(returnPosition)player.root.position.copyFrom(returnPosition);
    positionCompanions();nearby=null;updateZoneFromPosition();
    showToast('You leave the dungeon and return to the main trail.');updateHUD();void saveGame(true);
}

function interact() {
    if (state.paused || !nearby)
        return;
    switch (nearby.kind) {
        case 'planning':
            openPlanning(false);
            break;
        case 'bed':
            sleepUntilMorning();
            break;
        case 'hospital':
            useHospital();
            break;
        case 'blacksmith':
            openInventory(false);
            showToast('The blacksmith can improve your weapon in Inventory & Equipment.');
            break;
        case 'barracks':
            openPlanning(false);
            break;
        case 'dungeon':
            enterDungeon(nearby.regionId);
            break;
        case 'dungeonExit':
            exitDungeon();
            break;
        case 'crystal': {
            const crystalIndex = interactables.filter(item => item.kind === 'crystal').indexOf(nearby);
            const key = `crystal-${crystalIndex}`;
            if (!state.crystalsCollected.has(key)) {
                state.crystalsCollected.add(key);
                state.crystals++;
                state.gold += 5;
                nearby.mesh.setEnabled(false);
                nearby.collected = true;
                showToast('Ether crystal collected · +1 crystal · +5 gold');
                updateHUD();
                void saveGame(true);
            }
            break;
        }
    }
}
function updateNearby() {
    nearby = null;
    let best = 3.1;
    for (const item of interactables) {
        if (item.kind === 'crystal' && item.collected)
            continue;
        if ((item.kind === 'planning' || item.kind === 'bed' || item.kind === 'hospital' || item.kind === 'blacksmith' || item.kind === 'barracks') && state.zone !== 'base')
            continue;
        if (item.kind === 'crystal' && state.zone !== 'forest') continue;
        if (item.kind === 'dungeon' && (item.regionId !== state.zone || state.dungeonState || state.regionProgress[item.regionId]?.dungeonCleared)) continue;
        if (item.kind === 'dungeonExit' && !state.dungeonState) continue;
        if (state.dungeonState && item.kind !== 'dungeonExit') continue;
        const d = distance(player.root.position, item.position);
        if (d < best) {
            best = d;
            nearby = item;
        }
    }
    const prompt = $('interaction-prompt');
    prompt.classList.toggle('hidden', !nearby);
    if (nearby)
        $('interaction-text').textContent = nearby.label;
}
// -----------------------------------------------------------------------------
// Character creation and starting the adventure.
// -----------------------------------------------------------------------------
function startNewGame() {
    playerName = ($('character-name-input').value.trim() || 'Wayfarer').slice(0, 18);
    playerClass = $('class-select').value;
    appearance = $('appearance-select').value;
    state.level = 1; state.xp = 0; state.hp = 120; state.mana = 80;
    state.gold = 100; state.crystals = 0; state.tokens = 0; state.weaponLevel = 1;
    state.wolfKills = 0; state.bossUnlocked = false; state.bossDefeated = false;
    state.questComplete = false; state.aureliaRecruited = false; state.regionProgress = freshRegionProgress();
    state.abilityLevels = { arcane:1, heal:1, nova:1, barrier:1, antiMagic:1, deathBeam:1 }; state.manaUpgradeLevel = 0; state.companionUpgradeLevels = {}; state.playerFrozenTimer = 0; state.dungeonState = null;
    summonedAllies.forEach(a=>{if(a.root&&!a.root.isDisposed())a.root.dispose();if(a.material)a.material.dispose();}); summonedAllies=[];
    activeBarriers.forEach(f=>{
        if(f.root&&!f.root.isDisposed())f.root.dispose();
        if(f.shellMaterial)f.shellMaterial.dispose();
        if(f.shardMaterial)f.shardMaterial.dispose();
        (f.shards||[]).forEach(sh=>{const mesh=sh.mesh||sh;if(mesh&&!mesh.isDisposed())mesh.dispose();});
    }); activeBarriers=[];
    dungeonLandmarks.forEach(landmark=>landmark.roomMeshes.forEach(mesh=>mesh.setEnabled(false)));
    interactables = interactables.filter(item=>item.kind!=='dungeonExit');
    state.combatTimer = 0; state.attackCooldown = 0; state.nightSpawned = false; state.randomEventTimer = 0;
    state.command = 'follow'; state.formation = 'balanced'; state.strategy = 'protect';
    state.defaultAbility = 'arcane'; Object.keys(state.abilityCooldowns).forEach(id=>state.abilityCooldowns[id]=0);
    state.cutsceneActive = false; state.crystalsCollected.clear();
    for (const item of interactables) if (item.kind === 'crystal') { item.collected = false; item.mesh.setEnabled(true); }
    state.worldMinutes = 9 * 60; state.weatherIndex = 0; state.zone = 'base';
    companions.forEach((c, index) => {
        c.upgradeLevel = 0; c.maxHp = c._baseMaxHp || c.maxHp; c.hp = c.maxHp;
        c.summonTimer = 20; c.specialCooldown = 0; c.active = index < 2; c.recruited = index < 2;
        c.recovering = false; c.recoverTimer = 0; c.command = null; c.ambientState = null;
        c.model.root.setEnabled(false);
    });
    companions[0].active = true; companions[1].active = true;
    guardianNPC.root.setEnabled(false); guardianMarker.setEnabled(false);
    updatePrisonCrystalVisibility();
    $('weather-label').textContent = 'CLEAR'; $('weather-overlay').className = 'weather-overlay';
    currentTarget = null;
    enemies.forEach(e => e.root.dispose()); enemies = []; spawnedRegions.clear();
    projectiles.forEach(p => p.mesh.dispose()); projectiles = [];
    for (const id of Object.keys(REGION_DATA)) if (id !== 'forest') state.regionProgress[id].kills = 0;
    ensureRegionEncounter('forest', true);
    player.root.position.set(80, 0, 73);
    applyAppearance(); positionCompanions();
    state.started = true; state.paused = false;
    $('start-overlay').classList.add('hidden');
    updateZoneVisuals();
    setObjective('Prepare your first expedition', 'Use the planning table in the courtyard, then follow the stone road to the Emerald Forest.');
    updateHUD(); showToast(`Welcome, ${playerName}. Your adventure begins at headquarters.`);
    void saveGame(true);
}

async function continueGame() {
    const data = await readSaveData();
    if (!data) {
        showToast('No saved adventure was found.');
        return;
    }
    applySave(data);
    state.started = true;
    state.paused = false;
    $('start-overlay').classList.add('hidden');
    showToast('Welcome back to Etheria.');
    updateHUD();
    const pendingRescue = Object.keys(REGION_DATA).find(id => state.regionProgress[id].bossDefeated && !state.regionProgress[id].rescued);
    if (pendingRescue) beginRescueCutscene(pendingRescue);
}
// -----------------------------------------------------------------------------
// Day/night, weather and runtime updates.
// -----------------------------------------------------------------------------
function updateWorldClock(dt) {
    state.worldMinutes = (state.worldMinutes + dt * 1.0) % (24 * 60);
    const hours = Math.floor(state.worldMinutes / 60);
    const minutes = Math.floor(state.worldMinutes % 60);
    const phase = hours >= 20 || hours < 5 ? 'NIGHT' : hours >= 17 ? 'EVENING' : hours >= 12 ? 'AFTERNOON' : 'MORNING';
    $('world-clock').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · ${phase}`;
    const night = phase === 'NIGHT';
    const daylight = night ? 0.22 : phase === 'EVENING' ? 0.58 : phase === 'MORNING' ? 0.9 : 1.0;
    sunlight.intensity = daylight * (state.weatherIndex === 1 ? 0.72 : state.weatherIndex === 2 ? 0.58 : 1.2);
    ambient.intensity = night ? 0.35 : state.weatherIndex === 2 ? 0.55 : 0.78;
    skyMaterial.emissiveColor = night ? new Color3(0.42, 0.5, 0.68) : phase === 'EVENING' ? new Color3(0.95, 0.72, 0.48) : new Color3(0.92, 1.0, 0.9);
    glowLayer.intensity = night ? 1.05 : 0.72;
    if (night && !state.nightSpawned && state.zone === 'forest' && !state.bossDefeated) {
        state.nightSpawned = true;
        addWolf(new Vector3(-14, 0, -20), true);
        addWolf(new Vector3(14, 0, -22), true);
        showToast('Night has fallen. Stronger wolves have entered the forest.');
    }
    if (!night)
        state.nightSpawned = false;
    weatherTimer += dt;
    if (weatherTimer > 145) {
        weatherTimer = 0;
        state.weatherIndex = (state.weatherIndex + 1) % weatherNames.length;
        $('weather-label').textContent = weatherNames[state.weatherIndex];
        const overlay = $('weather-overlay');
        overlay.className = `weather-overlay ${state.weatherIndex === 1 ? 'rain' : state.weatherIndex === 2 ? 'mist' : ''}`;
        updateZoneVisuals();
        showToast(`The weather changed: ${weatherNames[state.weatherIndex].toLowerCase()}.`, 2.2);
    }
}
function updateEnemies(dt) {
    for (const enemy of enemies) {
        if (enemy.dead || !enemy.root.isEnabled()) continue;
        if (enemy.frozenTimer > 0) {
            enemy.frozenTimer = Math.max(0, enemy.frozenTimer - dt);
            if (enemy.frozenTimer <= 0) restoreFrozenEnemy(enemy);
            continue;
        }
        if (enemy.telegraphTimer > 0) {
            enemy.telegraphTimer = Math.max(0, enemy.telegraphTimer - dt);
            continue;
        }
        enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
        enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
        enemy.aggroTimer = Math.max(0, (enemy.aggroTimer || 0) - dt);
        let targetRoot = null, targetCompanion = null, targetSummon = null;
        // If someone damages a creature, it remembers and pursues that attacker rather than
        // continuing to chase a random nearby character.
        if (enemy.aggroTimer > 0 && enemy.aggroTarget && !enemy.aggroTarget.isDisposed?.() && enemy.aggroTarget.isEnabled?.() !== false) {
            targetRoot = enemy.aggroTarget;
            targetCompanion = activeCompanions().find(c => c.model.root === targetRoot) || null;
            targetSummon = summonedAllies.find(a => a.root === targetRoot) || null;
        }
        if (!targetRoot) {
            targetRoot = player.root;
            let best = distance(enemy.root.position, player.root.position);
            for (const companion of activeCompanions()) {
                const d = distance(enemy.root.position, companion.model.root.position);
                if (d < best) { best=d; targetRoot=companion.model.root; targetCompanion=companion; targetSummon=null; }
            }
            for (const summon of summonedAllies) {
                if (summon.hp <= 0) continue;
                const d = distance(enemy.root.position, summon.root.position);
                if (d < best) { best=d; targetRoot=summon.root; targetSummon=summon; targetCompanion=null; }
            }
        }
        let d = distance(enemy.root.position, targetRoot.position);
        const detectionRange = Math.min(enemy.detectionRange || enemy.aggro || 22, (enemy.sightRadius || 30) - 0.1);
        if (d > detectionRange && !(enemy.aggroTimer > 0)) continue;
        state.combatTimer = 6;
        const attackRange = enemy.kind === 'boss' ? 3.6 : targetSummon ? 2.2 : 1.9;
        const barrier = hasActiveBarrierFor(targetRoot, false);
        if (barrier && targetRoot === player.root || barrier && targetCompanion) {
            const offset = targetRoot.position.subtract(player.root.position); offset.y=0;
            if (offset.lengthSquared() < 0.01) offset.x=1;
            offset.normalize();
            const edge = player.root.position.add(offset.scale(barrier.radius + 1.1));
            if (d < barrier.radius + 1.2) {
                moveToward(enemy.root, edge, enemy.speed * 0.8, dt);
                barrier.hp = Math.max(0, barrier.hp - Math.max(2, enemy.damage * 0.42) * dt);
                updateBarrierCracks(barrier);
                if (barrier.hp <= 0) breakBarrier(barrier);
                continue;
            }
        }
        enemy.root.rotation.y = Math.atan2(targetRoot.position.x - enemy.root.position.x, targetRoot.position.z - enemy.root.position.z);
        if (d > attackRange) moveToward(enemy.root, targetRoot.position, enemy.speed * (state.worldMinutes / 60 >= 20 ? 1.22 : 1), dt);
        else if (enemy.attackTimer <= 0) {
            const damage = enemy.damage * (state.worldMinutes / 60 >= 20 ? 1.2 : 1);
            const normalBarrier = hasActiveBarrierFor(targetRoot, false);
            if (normalBarrier && (targetRoot === player.root || targetCompanion)) {
                normalBarrier.hp = Math.max(0, normalBarrier.hp - damage);
                updateBarrierCracks(normalBarrier);
                if (normalBarrier.hp <= 0) breakBarrier(normalBarrier);
            } else if (targetSummon) {
                targetSummon.hp = Math.max(0, targetSummon.hp - damage);
            } else if (targetCompanion) {
                targetCompanion.hp = Math.max(0, targetCompanion.hp - damage);
                if (targetCompanion.hp <= 0) {
                    targetCompanion.recovering = true; targetCompanion.recoverTimer = 7;
                    targetCompanion.model.root.setEnabled(false);
                    showToast(`${targetCompanion.name} was overwhelmed and needs to recover at the base hospital.`);
                }
            } else {
                state.hp = Math.max(0, state.hp - damage * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.35 : state.protectionTimer > 0 ? 0.65 : 1));
                state.playerDamageFlash = 0.22;
                if (state.hp <= 0) playerDefeated();
            }
            enemy.attackTimer = enemy.kind === 'boss' ? 1.75 : 1.45;
        }
        // Boss skills run on their own fifteen-second timer, not only after a melee strike.
        if (enemy.kind === 'boss' && enemy.specialTimer <= 0) {
            enemy.specialTimer = 15;
            triggerBossSpecial(enemy);
        }
    }
    state.combatTimer = Math.max(0, state.combatTimer - dt);
    for (const c of companions) {
        if (c.frozenTimer > 0) { c.frozenTimer = Math.max(0, c.frozenTimer - dt); if (c.frozenTimer <= 0 && c._preFreezeMaterial) { c.model.body.material = c._preFreezeMaterial; c._preFreezeMaterial = null; } }
        if (c.recovering && state.combatTimer <= 0) {
            c.recoverTimer = Math.max(0, c.recoverTimer - dt);
            if (c.recoverTimer <= 0) {
                c.recovering = false; c.hp = Math.max(25, Math.round(c.maxHp * 0.35));
                c.model.root.setEnabled(c.active);
                c.model.root.position.copyFrom(player.root.position.add(new Vector3(1.5,0,1.5)));
                showToast(`${c.name} has recovered enough to rejoin the party.`);
            }
        }
    }
}


function updateCompanions(dt) {
    const selected = activeCompanions();
    selected.forEach((c, index) => {
        const root = c.model.root;
        if (!root.isEnabled() || c.recovering) return;

        c.attackTimer = Math.max(0, c.attackTimer - dt);
        c.healTimer = Math.max(0, c.healTimer - dt);
        c.specialCooldown = Math.max(0, (c.specialCooldown || 0) - dt);
        if (c.frozenTimer > 0) return;
        if (c.role === 'Summoner') {
            c.summonTimer = Math.max(0, (c.summonTimer ?? 20) - dt);
            const ownedSummons = summonedAllies.filter(a => a.ownerId === c.id && a.hp > 0).length;
            if (c.summonTimer <= 0) {
                if (ownedSummons < 5) {
                    spawnSummonedAlly(c, 50);
                    showToast(`${c.name} calls a 50-HP spirit to the party. (${ownedSummons + 1}/5)`);
                }
                c.summonTimer = 20;
            }
        }

        // Aurelia's automatic support now uses the same drawn rune and rising green beam.
        if (c.role === 'Healer' && c.healTimer <= 0) {
            const injured = companions.find(other => other.active && other.recruited && !other.recovering && other.hp < other.maxHp * 0.72);
            if (injured) {
                injured.hp = Math.min(injured.maxHp, injured.hp + 24);
                c.healTimer = 5.5;
                animateCharacterAttack(c.model);
                playHealingEffect(injured.model.root);
            } else if (state.hp < (120 + (state.level - 1) * 14) * 0.72) {
                state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 20);
                c.healTimer = 5.5;
                animateCharacterAttack(c.model);
                playHealingEffect(player.root);
            }
        }

        const companionCommand = c.command || state.command;
        const playerDistance = distance(root.position, player.root.position);
        let desired = root.position.clone();
        let canMove = companionCommand !== 'hold';

        if (companionCommand === 'hold') {
            const saved = root.metadata;
            if (saved?.holdX !== undefined && saved.holdZ !== undefined)
                desired = new Vector3(saved.holdX, 0, saved.holdZ);
        } else if (companionCommand === 'advance') {
            desired = player.root.position.add(new Vector3(index % 2 === 0 ? -1 : 1, 0, -3));
        } else if (companionCommand === 'defend') {
            desired = player.root.position.add(new Vector3(index % 2 === 0 ? -1.8 : 1.8, 0, 1.2));
        } else if (companionCommand === 'attack') {
            desired = root.position.clone();
        } else {
            // Follow is deliberately loose: companions scout and wander instead of mirroring every player step.
            if (!c.ambientState) {
                c.ambientState = { mode: 'idle', timer: 1 + Math.random() * 2, target: null };
            }
            const ambient = c.ambientState;
            if (playerDistance > 17) {
                ambient.mode = 'return';
                ambient.target = player.root.position.add(formationOffset(index));
                ambient.timer = 0;
            } else {
                if (ambient.mode === 'return' || (ambient.mode === 'wander' &&
                    ambient.target && distance(root.position, ambient.target) < 0.65)) {
                    ambient.mode = 'idle';
                    ambient.target = null;
                    ambient.timer = 2 + Math.random() * 3;
                }
                ambient.timer -= dt;
                if (ambient.mode !== 'wander' && ambient.timer <= 0) {
                    if (Math.random() < 0.68) {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 3.5 + Math.random() * 5.5;
                        ambient.target = new Vector3(
                            player.root.position.x + Math.cos(angle) * radius,
                            0,
                            player.root.position.z + Math.sin(angle) * radius
                        );
                        ambient.mode = 'wander';
                        ambient.timer = 5 + Math.random() * 4;
                    } else {
                        ambient.mode = 'idle';
                        ambient.target = null;
                        ambient.timer = 2.5 + Math.random() * 3;
                    }
                }
                if (ambient.mode === 'wander' && ambient.target) {
                    desired = ambient.target;
                    if (ambient.timer <= 0) {
                        ambient.mode = 'idle';
                        ambient.target = null;
                        ambient.timer = 2 + Math.random() * 3;
                        desired = root.position.clone();
                    }
                }
            }
            if (ambient.mode === 'return' && ambient.target) {
                desired = ambient.target;
                if (playerDistance < 8) {
                    ambient.mode = 'idle';
                    ambient.target = null;
                    ambient.timer = 2 + Math.random() * 3;
                    desired = root.position.clone();
                }
            }
        }

        let companionMoving = false;
        if (canMove && distance(root.position, desired) > 0.58) {
            const returnSpeed = c.ambientState && c.ambientState.mode === 'return' ? 5.5 : 3.25;
            moveToward(root, desired, companionCommand === 'defend' ? 4.2 : returnSpeed, dt);
            companionMoving = true;
        }

        const nearbyThreat = nearestEnemyFrom(root.position, 5.2);
        animateCharacterGuard(c.model, c.role === 'Knight' &&
            (companionCommand === 'defend' || !!nearbyThreat), dt);

        const targetRange = companionCommand === 'hold' ? 4.5 :
            companionCommand === 'defend' ? 10 :
            companionCommand === 'advance' ? 20 : 15;
        const focusedTarget = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemyFrom(root.position, targetRange);
        const target = companionCommand === 'attack' || state.strategy === 'focus'
            ? focusedTarget : nearestEnemyFrom(root.position, targetRange);

        if (target) {
            if (c.role === 'Knight' && distance(root.position, target.root.position) > 2.8) {
                moveToward(root, target.root.position, 4.0, dt);
                companionMoving = true;
            }
            const attackRange = c.role === 'Knight' ? 3.0 : targetRange;
            if (c.attackTimer <= 0 && distance(root.position, target.root.position) <= attackRange) {
                companionAttack(c, target);
                c.attackTimer = c.role === 'Knight' ? 1.25 : c.role === 'Healer' ? 2.7 : 1.65;
            }
        }

        animateCharacterMovement(c.model, companionMoving, performance.now() * 0.001 + index);
    });

    companionChatterTimer -= dt;
    if (companionChatterTimer <= 0 && state.combatTimer <= 0 && selected.length >= 2) {
        if (startCompanionConversation(selected)) companionChatterTimer = 22 + Math.random() * 18;
        else companionChatterTimer = 5;
    }
}
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.age += dt;
        const t = Math.min(1, p.age / p.duration);
        p.mesh.position = Vector3.Lerp(p.from, p.to, t);
        p.mesh.position.y += Math.sin(t * Math.PI) * 0.6;
        if (p.mesh instanceof TransformNode && p.mesh.name === 'flying ranger arrow') {
            const direction = p.to.subtract(p.from);
            direction.y = 0;
            if (direction.lengthSquared() > 0) {
                direction.normalize();
                p.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
        if (t >= 1) {
            if (p.target && !p.target.dead)
                dealDamage(p.target, p.damage, p.source || player.root);
            p.mesh.dispose();
            projectiles.splice(i, 1);
        }
    }
}
function updateMovement(dt) {
    const positionBeforeMove = player.root.position.clone();
    if (state.playerFrozenTimer > 0) { state.playerFrozenTimer = Math.max(0, state.playerFrozenTimer - dt); animateCharacterMovement(player, false, state.stepTime / 9); return; }
    let movement = Vector3.Zero();
    // Ask Babylon for the camera's real world-space axes so alpha, inertia and camera rotation
    // cannot cause W/S to reverse or drift when the view angle changes.
    const forward = camera.getDirection(new Vector3(0, 0, 1));
    forward.y = 0;
    if (forward.lengthSquared() > 0) forward.normalize();
    const right = camera.getDirection(new Vector3(1, 0, 0));
    right.y = 0;
    if (right.lengthSquared() > 0) right.normalize();
    if (keys.has('KeyW'))
        movement.addInPlace(forward);
    if (keys.has('KeyS'))
        movement.subtractInPlace(forward);
    if (keys.has('KeyD'))
        movement.addInPlace(right);
    if (keys.has('KeyA'))
        movement.subtractInPlace(right);
    if (movement.lengthSquared() > 0) {
        movement.normalize();
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.6 : 4.7;
        player.root.position.addInPlace(movement.scale(speed * dt));
        player.root.rotation.y = Math.atan2(movement.x, movement.z);
        state.stepTime += dt * 9;
        player.root.position.y = Math.abs(Math.sin(state.stepTime)) * 0.055;
        animateCharacterMovement(player, true, state.stepTime / 9);
    }
    else {
        player.root.position.y += (0 - player.root.position.y) * Math.min(1, dt * 10);
        animateCharacterMovement(player, false, state.stepTime / 9);
    }
    // Expanded continuous world bounds: headquarters, the original forest and all four new regions.
    player.root.position.x = Math.max(12, Math.min(174, player.root.position.x));
    player.root.position.z = Math.max(-1390, Math.min(112, player.root.position.z));
    const candidateZone = regionAtPosition(player.root.position.x, player.root.position.z);
    if (candidateZone && candidateZone !== 'base' && candidateZone !== state.zone && !isRegionUnlocked(candidateZone)) {
        player.root.position.copyFrom(positionBeforeMove);
        const nextRegion = REGION_DATA[candidateZone];
        if (!state._lastLockedNotice || performance.now() - state._lastLockedNotice > 3500) {
            showToast(`${nextRegion.name} is sealed. Defeat the previous boss and free its prisoner to continue.`);
            state._lastLockedNotice = performance.now();
        }
    }
    updateZoneFromPosition();
    camera.target = Vector3.Lerp(camera.target, player.root.position.add(new Vector3(0, 1.25, 0)), 1 - Math.pow(0.001, dt));
    animateCharacterGuard(player, (keys.has('ShiftLeft') || keys.has('ShiftRight')) && playerClass === 'knight', dt);
}
function playerDefeated() {
    state.hp = 42;
    state.mana = Math.max(20, state.mana);
    state.gold = Math.max(0, state.gold - 15);
    state.zone = 'base';
    state.combatTimer = 0;
    player.root.position.set(80, 0, 73);
    positionCompanions();
    updateZoneVisuals();
    showToast('Your party retreated to headquarters. The hospital can restore everyone. (15 gold lost)');
    setObjective('Recover at headquarters', 'Visit the hospital, regroup and prepare before returning to the forest.');
    updateHUD();
    void saveGame(true);
}
// -----------------------------------------------------------------------------
// UI and input wiring.
// -----------------------------------------------------------------------------
function ensureUnlockedAbilityButtons() {
    const bar=document.querySelector('.ability-bar');if(!bar)return;
    const specs=[
        {id:'barrier',key:'3',name:'Barrier',mp:'58 MP'},
        {id:'antiMagic',key:'4',name:'Anti-Magic Barrier',mp:'88 MP'},
        {id:'deathBeam',key:'5',name:'Death Beam',mp:'70 MP'}
    ];
    for(const spec of specs){
        if(bar.querySelector(`[data-ability="${spec.id}"]`))continue;
        const button=document.createElement('button');button.className='ability-button';button.dataset.ability=spec.id;
        button.title=`${spec.key} · ${spec.name}`;
        button.innerHTML=`<kbd>${spec.key}</kbd><strong>${spec.name}</strong><small>${spec.mp}</small>`;
        bar.insertBefore(button,bar.querySelector('.ability-default'));
    }
}

function bindButton(id, callback) { $(id).addEventListener('click', callback); }
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
bindButton('pause-base-button', () => { $('pause-overlay').classList.add('hidden'); if (canReturnToBase()) {
    returnToBase();
    state.paused = false;
}
else if (state.zone === 'base') {
    state.paused = false;
}
else {
    state.paused = true;
    $('pause-overlay').classList.remove('hidden');
    showToast('Escape combat before returning to base.');
} });
bindButton('inventory-button', () => openInventory(false));
bindButton('pause-inventory-button', () => openInventory(true));
bindButton('inventory-close-button', closeInventory);
bindButton('upgrade-weapon-button', upgradeWeapon);
bindButton('pause-settings-button', () => { settingsFromPaused = true; $('pause-overlay').classList.add('hidden'); $('settings-overlay').classList.remove('hidden'); state.paused = true; });
bindButton('settings-close-button', () => { $('settings-overlay').classList.add('hidden'); if (settingsFromPaused) {
    $('pause-overlay').classList.remove('hidden');
    state.paused = true;
}
else {
    state.paused = false;
} });
bindButton('party-command-button', () => { if ($('command-overlay').classList.contains('hidden')) openPartyCommands(); else $('command-overlay').classList.add('hidden'); });
bindButton('command-close-button', () => $('command-overlay').classList.add('hidden'));
bindButton('main-menu-button', () => { $('pause-overlay').classList.add('hidden'); $('start-overlay').classList.remove('hidden'); state.paused = true; state.started = false; void saveGame(true); });
bindButton('export-save-button', exportSave);
ensureUnlockedAbilityButtons();
bindButton('victory-return-button', () => { $('victory-overlay').classList.add('hidden'); state.paused = false; setZone('base'); showToast('The forest relic has been secured. The region is now cleared.'); void saveGame(true); });
for (const button of Array.from(document.querySelectorAll('[data-ability]'))) {
    button.addEventListener('click', () => castAbility(button.dataset.ability));
}
$('default-ability-button').addEventListener('click', () => {
    const ids = ['arcane', 'heal', 'nova', 'barrier', 'antiMagic', 'deathBeam'].filter(isAbilityUnlocked);
    const current = ids.indexOf(state.defaultAbility);
    state.defaultAbility = ids[(current + 1) % ids.length];
    updateHUD();
    showToast(`Default left-click ability: ${state.defaultAbility}.`);
});
for (const button of Array.from(document.querySelectorAll('[data-command]'))) {
    button.addEventListener('click', () => issueCommand(button.dataset.command));
}
for (const button of Array.from(document.querySelectorAll('[data-companion-command]'))) {
    button.addEventListener('click', () => issueCompanionCommand(button.dataset.companionCommand));
}
bindButton('companion-ability-button', useCompanionAbility);
$('camera-distance').addEventListener('input', event => { camera.radius = Number(event.target.value); });
$('camera-sensitivity').addEventListener('input', event => { camera.angularSensibilityX = 1200 / Number(event.target.value); camera.angularSensibilityY = camera.angularSensibilityX; });
$('graphics-quality').addEventListener('change', event => {
    const value = event.target.value;
    engine.setHardwareScalingLevel(value === 'high' ? 1 : value === 'medium' ? 1.25 : 1.6);
    scene.skipPointerMovePicking = value === 'low';
    showToast(`Graphics preset set to ${value}.`);
});
$('import-save-input').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(String(reader.result));
            if (![2, 3, 4].includes(data.version))
                throw new Error('Unsupported save version');
            applySave(data);
            void saveGame(true);
            showToast('Save backup imported. Choose Continue saved game from the main menu.');
        }
        catch {
            showToast('That file is not a valid Legends of Etheria save backup.');
        }
    };
    reader.onerror = () => showToast('Could not read the selected save file.');
    reader.readAsText(file);
});
window.addEventListener('keydown', event => {
    if (activeRescueCutscene) {
        if (event.code === 'Escape' || event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault(); finishRescueCutscene(true);
        }
        return;
    }
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code))
        event.preventDefault();
    if (event.code === 'Escape' && state.started) {
        if (!$('planning-overlay').classList.contains('hidden'))
            closePlanning();
        else if (!$('inventory-overlay').classList.contains('hidden'))
            closeInventory();
        else if (!$('settings-overlay').classList.contains('hidden')) {
            $('settings-overlay').classList.add('hidden');
            if (settingsFromPaused)
                $('pause-overlay').classList.remove('hidden');
            else
                state.paused = false;
        }
        else if (!$('command-overlay').classList.contains('hidden'))
            $('command-overlay').classList.add('hidden');
        else if (!$('pause-overlay').classList.contains('hidden'))
            closePause();
        else
            openPause();
        return;
    }
    if (!state.started || state.paused)
        return;
    keys.add(event.code);
    if (!event.repeat) {
        const typing = event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
        if (!typing) {
            const commandShortcuts = {
                KeyF: 'follow',
                KeyT: 'attack',
                KeyH: 'hold',
                KeyG: 'defend',
                KeyV: 'advance'
            };
            if (commandShortcuts[event.code]) {
                event.preventDefault();
                issueCommand(commandShortcuts[event.code]);
                return;
            }
        }
        if (event.code === 'Space')
            attack();
        if (event.code === 'KeyE')
            interact();
        if (event.code === 'Digit1')
            castAbility('arcane');
        if (event.code === 'KeyQ')
            castAbility('heal');
        if (event.code === 'Digit2') castAbility('nova');
        if (event.code === 'Digit3') castAbility('barrier');
        if (event.code === 'Digit4') castAbility('antiMagic');
        if (event.code === 'Digit5') castAbility('deathBeam');
        if (event.code === 'Tab') {
            const targets = enemies.filter(enemy => !enemy.dead && enemy.root.isEnabled());
            if (targets.length) {
                const currentIndex = currentTarget ? targets.findIndex(enemy => enemy.id === currentTarget?.id) : -1;
                currentTarget = targets[(currentIndex + 1) % targets.length];
                showToast(`Target selected: ${currentTarget.displayName || (currentTarget.kind === 'boss' ? 'Boss' : 'Enemy')}.`, 1.4);
                updateHUD();
            }
        }
    }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
let leftPointerStart = null;
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
    if (!state.started || state.paused) return;
    if (event.button === 0) leftPointerStart = { x: event.clientX, y: event.clientY, moved: false };
    if (event.button === 2) {
        event.preventDefault();
        const pick = scene.pick(event.clientX, event.clientY, mesh => mesh.isPickable !== false);
        const companion = pick?.hit ? findCompanionFromPick(pick.pickedMesh) : null;
        if (companion && companion.active && companion.recruited) openCompanionCommands(companion);
        else openPartyCommands();
    }
    });
canvas.addEventListener('pointermove', event => {
    if (!leftPointerStart) return;
    if (Math.hypot(event.clientX - leftPointerStart.x, event.clientY - leftPointerStart.y) > 7) leftPointerStart.moved = true;
});
window.addEventListener('pointerup', event => {
    if (event.button !== 0 || !leftPointerStart) return;
    const wasClick = !leftPointerStart.moved;
    leftPointerStart = null;
    if (wasClick && state.started && !state.paused) castAbility(state.defaultAbility);
});
const controlsHint = document.querySelector('.controls-hint');
if (controlsHint && !controlsHint.dataset.commandShortcutsAdded) {
    controlsHint.dataset.commandShortcutsAdded = 'true';
    controlsHint.insertAdjacentHTML('beforeend',
        ' <span>·</span><kbd>F</kbd> Follow <span>·</span><kbd>T</kbd> Attack <span>·</span><kbd>H</kbd> Hold <span>·</span><kbd>G</kbd> Defend <span>·</span><kbd>V</kbd> Advance <span>·</span><kbd>3–5</kbd> New abilities');
}
window.addEventListener('resize', () => engine.resize());
// The planning menu is also reachable by pressing P while paused.
window.addEventListener('keydown', event => {
    if (event.code === 'KeyP' && state.started && state.paused && $('pause-overlay').classList.contains('hidden') === false)
        openPlanning(true);
});
// -----------------------------------------------------------------------------
// Initial enemy/interactable setup and main render loop.
// -----------------------------------------------------------------------------
createInteractables();
createAllPrisonCrystals();
ensureRegionEncounter('forest', true);
updateHUD();
void hasSave().then(found => { $('continue-button').disabled = !found; });
let previousFrame = performance.now();
window.addEventListener('pointerdown', event => {
    if (!activeRescueCutscene) return;
    event.preventDefault(); event.stopPropagation();
    finishRescueCutscene(true);
}, true);
engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - previousFrame) / 1000, 0.05);
    previousFrame = now;
    if (state.started && !state.paused) {
        updateWorldClock(dt);
        state.protectionTimer = Math.max(0, state.protectionTimer - dt);
        updateMovement(dt);
        updateRegionExploration(dt);
        applyEnvironmentalHazards(dt);
        updateBarrierFields(dt);
        updateSummonedAllies(dt);
        state.attackCooldown = Math.max(0, state.attackCooldown - dt);
        const repeatAttackRange = playerClass === 'knight' || playerClass === 'warrior' ? 3.8 : 22;
        const repeatAttackCost = playerClass === 'knight' ? 0 :
            playerClass === 'mage' ? 5 : playerClass === 'healer' ? 3 : 2;
        if (keys.has('Space') && state.attackCooldown <= 0 &&
            state.mana >= repeatAttackCost && nearestEnemy(repeatAttackRange)) {
            attack();
        }
        for (const id of ['arcane', 'heal', 'nova', 'barrier', 'antiMagic', 'deathBeam'])
            state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
        if (state.mana < getMaxMana())
            state.mana = Math.min(getMaxMana(), state.mana + dt * 3.2);
        if (state.combatTimer <= 0)
            state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + dt * 0.45);
        updateEnemies(dt);
        updateCompanions(dt);
        updateProjectiles(dt);
        updateNearby();
        if (toastTimer > 0) {
            toastTimer -= dt;
            if (toastTimer <= 0)
                $('toast').classList.remove('visible');
        }
        state.playerDamageFlash = Math.max(0, state.playerDamageFlash - dt);
        if (state.playerFrozenTimer > 0) player.body.material = materials.ice;
        else if (state.playerDamageFlash > 0) player.body.material = materials.enemyEye;
        else player.body.material = playerOutfit;
        if (now - state.lastSaveTime > 45000) {
            state.lastSaveTime = now;
            void saveGame(true);
        }
        if (state.zone === 'forest' && state.bossDefeated && !state.randomEventTimer)
            state.randomEventTimer = 60;
        if (state.zone === 'forest' && state.bossDefeated) {
            state.randomEventTimer -= dt;
            if (state.randomEventTimer <= 0) {
                state.randomEventTimer = 85 + Math.random() * 55;
                const rareEnemyAlive = enemies.some(enemy => !enemy.dead && enemy.kind === 'wolf' && enemy.maxHp > 70);
                if (!rareEnemyAlive) {
                    addWolf(new Vector3(13, 0, -19), true);
                    showToast('Random encounter: a stronger Grove Stalker has appeared in the cleared region.');
                }
                else {
                    state.gold += 20;
                    state.tokens += 1;
                    showToast('Random discovery: a hidden resource cache was found near the old stones. +20 gold and +1 token.');
                    updateHUD();
                }
                void saveGame(true);
            }
        }
        if (Math.floor(now / 1000) !== Math.floor((now - dt * 1000) / 1000))
            updateHUD();
    }
    else if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0)
            $('toast').classList.remove('visible');
    }
    const time = now * 0.001;
    guardianMarker.rotation.z = time * 0.7;
    guardianStaffCrystal.scaling.setAll(1 + Math.sin(time * 2.4) * 0.08);
    planningMarker.rotation.z = time * 0.35;
    const nightGlow = state.worldMinutes >= 20 * 60 || state.worldMinutes < 5 * 60 || state.worldMinutes >= 18 * 60;
    for (const mote of fireflies) {
        mote.mesh.setEnabled(state.zone === 'forest' && nightGlow);
        mote.mesh.position.set(mote.x + Math.sin(time * mote.speed + mote.phase) * 0.34, mote.y + Math.sin(time * 1.4 + mote.phase) * 0.24, mote.z + Math.cos(time * mote.speed * 0.8 + mote.phase) * 0.28);
    }
    pool.position.y = 0.06 + Math.sin(time * 1.1) * 0.012;
    scene.render();
});
// Keep UI and scene setup resilient if the browser tab changes size or loses focus.
window.addEventListener('beforeunload', () => { keys.clear(); });