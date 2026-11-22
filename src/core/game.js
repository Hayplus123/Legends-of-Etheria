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
    water: mat('forest pool water', new Color3(0.11, 0.34, 0.34), new Color3(0.02, 0.11, 0.13), 0.82)
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
    const model = { root, body, head, weapon, weaponRoot, staffRoot, staffCrystal, bowRoot, shield, arms, legs, cloak, role, roleCrest };
    setCharacterRole(model, role);
    return model;
}
function setCharacterRole(model, role) {
    model.role = role || 'warrior';
    const usesStaff = model.role === 'mage' || model.role === 'healer';
    model.weaponRoot.setEnabled(!usesStaff && model.role !== 'ranger');
    model.staffRoot.setEnabled(usesStaff);
    model.bowRoot.setEnabled(model.role === 'ranger');
    model.shield.setEnabled(model.role === 'knight');
    model.roleCrest.setEnabled(model.role === 'mage' || model.role === 'healer');
    model.activeWeaponRoot = usesStaff ? model.staffRoot : model.role === 'ranger' ? model.bowRoot : model.weaponRoot;
    if (model.role === 'mage') {
        model.staffCrystal.material = materials.crystal;
        model.cloak.scaling.y = 1.18;
    } else if (model.role === 'healer') {
        model.staffCrystal.material = materials.heal;
        model.cloak.scaling.y = 1.32;
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

function drawMagicGlyph(position, color, options = {}, onComplete = null) {
    const size = options.size || 0.72;
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
const forestMeshStart = scene.meshes.length;
const forestTransformStart = scene.transformNodes.length;
const forestLightStart = scene.lights.length;

// Two physical areas are laid out in the same 3D world: the home base and one forest region.
const forestGround = MeshBuilder.CreateGround('emerald forest floor', { width: 74, height: 74, subdivisions: 3 }, scene);
forestGround.material = materials.grass;
forestGround.position.set(0, 0.015, -3);
forestGround.scaling.z = 0.78;
forestGround.receiveShadows = true;
const forestPath = MeshBuilder.CreateGround('forest stone path', { width: 5.5, height: 48 }, scene);
forestPath.position.set(0, 0.025, -5);
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
// The ancient grove gate frames the final encounter beyond the old path.
for (const side of [-1, 1]) {
    const pillar = MeshBuilder.CreateBox('ancient grove gate pillar', { width: 1.0, height: 5.4, depth: 1.1 }, scene);
    pillar.position.set(side * 4.1, 2.7, -23);
    pillar.material = materials.paleStone;
    addShadow(pillar);
    const capital = MeshBuilder.CreateCylinder('ancient gate capital', { height: 1.3, diameter: 1.55, tessellation: 6 }, scene);
    capital.position.set(side * 4.1, 5.35, -23);
    capital.rotation.y = Math.PI / 6;
    capital.material = materials.stone;
    const rune = MeshBuilder.CreateBox('gate rune', { width: 0.12, height: 1.8, depth: 0.04 }, scene);
    rune.position.set(side * 4.1, 2.9, -22.42);
    rune.material = materials.crystal;
    glowLayer.addIncludedOnlyMesh(rune);
}
const gateLintel = MeshBuilder.CreateBox('ancient grove gate lintel', { width: 9.2, height: 0.8, depth: 1.2 }, scene);
gateLintel.position.set(0, 5.55, -23);
gateLintel.material = materials.stone;
const groveRune = MeshBuilder.CreateTorus('grove guardian rune', { diameter: 2.0, thickness: 0.1, tessellation: 32 }, scene);
groveRune.position.set(0, 4.35, -22.35);
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
const forestRoad = MeshBuilder.CreateGround('road to emerald forest', { width: 6.2, height: 108, subdivisions: 2 }, scene);
forestRoad.position.set(80, 0.035, 55);
forestRoad.rotation.y = 0;
forestRoad.scaling.z = 0.36;
forestRoad.material = materials.path;
forestRoad.receiveShadows = true;
for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const x = 80 + Math.sin(t * Math.PI) * 0.65;
    const z = 74 - t * 39;
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
const companions = [
    { id: 'reaphel', name: 'Reaphel', role: 'Knight', model: reaphel, active: true, recruited: true, hp: 135, maxHp: 135, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 },
    { id: 'sylva', name: 'Sylva', role: 'Archer', model: sylva, active: true, recruited: true, hp: 90, maxHp: 90, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 },
    { id: 'aurelia', name: 'Aurelia', role: 'Healer', model: aureliaModel, active: false, recruited: false, hp: 95, maxHp: 95, attackTimer: 0, healTimer: 0, recovering: false, recoverTimer: 0 }
];
for (const companion of companions) companion.model.root.metadata = { ...(companion.model.root.metadata || {}), companionId: companion.id };
let selectedCompanion = null;
// Runtime state.
const state = {
    zone: 'base', started: false, paused: true, level: 1, xp: 0, hp: 120, mana: 80,
    gold: 100, crystals: 0, tokens: 0, weaponLevel: 1, wolfKills: 0, bossUnlocked: false, bossDefeated: false,
    aureliaRecruited: false, formation: 'balanced', strategy: 'protect', command: 'follow',
    worldMinutes: 9 * 60, weatherIndex: 0, combatTimer: 0, attackCooldown: 0, defend: false,
    defaultAbility: 'arcane', abilityCooldowns: { arcane: 0, heal: 0, nova: 0 },
    crystalsCollected: new Set(), questComplete: false, nightSpawned: false, randomEventTimer: 0,
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
let interactables = [];
let projectiles = [];
let enemyId = 0;
const keys = new Set();
function createInteractables() {
    interactables = [
        { kind: 'planning', label: 'Use planning table', position: new Vector3(80, 0, 78), mesh: planningTable },
        { kind: 'bed', label: 'Sleep until morning', position: new Vector3(80, 0, 91), mesh: bedBase },
        { kind: 'hospital', label: 'Visit the hospital', position: new Vector3(68, 0, 84), mesh: baseGround },
        { kind: 'blacksmith', label: 'Visit the blacksmith', position: new Vector3(92, 0, 84), mesh: baseGround },
        { kind: 'barracks', label: 'Manage your party', position: new Vector3(68, 0, 70), mesh: baseGround },
        { kind: 'guardian', label: 'Speak with Aurelia', position: new Vector3(4.5, 0, -3.5).add(FOREST_OFFSET), mesh: guardianNPC.root },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-7.8, 0, 4.5).add(FOREST_OFFSET), mesh: forestCrystalMeshes[0] },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(9.1, 0, 1.8).add(FOREST_OFFSET), mesh: forestCrystalMeshes[1] },
        { kind: 'crystal', label: 'Collect Ether crystal', position: new Vector3(-10.5, 0, -15.8).add(FOREST_OFFSET), mesh: forestCrystalMeshes[2] }
    ];
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
    const enemy = { id: enemyId, kind: 'wolf', root, body, hp: stronger ? 95 : 70, maxHp: stronger ? 95 : 70, speed: stronger ? 2.0 : 1.65, damage: stronger ? 13 : 9, attackTimer: 1.2, specialTimer: 0, dead: false, sightRadius: stronger ? 30 : 24, detectionRange: stronger ? 16 : 14, aggro: stronger ? 16 : 14, frozenTimer: 0, frozenMeshes: null };
    enemies.push(enemy);
    return enemy;
}
function addBoss() {
    const root = new TransformNode('grove guardian boss', scene);
    root.position.copyFrom(new Vector3(0, 0, -24).add(FOREST_OFFSET));
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
    const boss = { id: ++enemyId, kind: 'boss', root, body, hp: 520, maxHp: 520, speed: 1.35, damage: 17, attackTimer: 1.8, specialTimer: 5, dead: false, sightRadius: 40, detectionRange: 22, aggro: 22, frozenTimer: 0, frozenMeshes: null };
    enemies.push(boss);
    showToast('The Grove Guardian has awakened. Prepare for a boss battle!');
    setObjective('Defeat the Grove Guardian', 'The forest guardian is corrupted. Coordinate your party and use your abilities.');
    return boss;
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
    const progress = state.bossDefeated ? 100 : state.wolfKills >= 3 ? 75 : state.wolfKills / 3 * 55;
    $('quest-progress-bar').style.width = `${progress}%`;
    $('quest-progress-text').textContent = state.bossDefeated ? 'Forest cleared · Return to base' : state.bossUnlocked ? 'Boss encounter available' : `Forest threats defeated: ${Math.min(state.wolfKills, 3)} / 3`;
}
function updateHUD() {
    const maxHp = 120 + (state.level - 1) * 14;
    const maxMana = 80 + (state.level - 1) * 8;
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
    $('default-ability-button').textContent = `DEFAULT: ${state.defaultAbility === 'arcane' ? 'ARCANE BOLT' : state.defaultAbility === 'heal' ? 'HEALING WAVE' : 'FROST NOVA'}`;
    const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(18);
    const enemyCard = $('enemy-card');
    if (state.zone === 'forest' && target) {
        enemyCard.classList.remove('hidden');
        $('enemy-name').textContent = target.kind === 'boss' ? 'Grove Guardian' : 'Forest Wolf';
        $('enemy-hp-value').textContent = `${Math.ceil(target.hp)} / ${target.maxHp}`;
        $('enemy-hp-bar').style.width = `${Math.max(0, target.hp / target.maxHp * 100)}%`;
    }
    else
        enemyCard.classList.add('hidden');
    updateQuestProgress();
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
        version: 2, worldLayoutVersion: 2, playerName, playerClass, appearance, level: state.level, xp: state.xp, hp: state.hp, mana: state.mana,
        gold: state.gold, crystals: state.crystals, tokens: state.tokens, weaponLevel: state.weaponLevel,
        wolfKills: state.wolfKills, bossDefeated: state.bossDefeated, aureliaRecruited: state.aureliaRecruited,
        partyActive: active, formation: state.formation, strategy: state.strategy, command: state.command,
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
    state.mana = Math.max(0, Math.min(80 + (state.level - 1) * 8, Number(data.mana) || 80));
    state.gold = Math.max(0, Number(data.gold) || 0);
    state.crystals = Math.max(0, Number(data.crystals) || 0);
    state.tokens = Math.max(0, Number(data.tokens) || 0);
    state.weaponLevel = Math.max(1, Number(data.weaponLevel) || 1);
    state.wolfKills = Math.max(0, Number(data.wolfKills) || 0);
    state.bossDefeated = Boolean(data.bossDefeated);
    state.bossUnlocked = state.wolfKills >= 3;
    state.aureliaRecruited = Boolean(data.aureliaRecruited);
    state.formation = data.formation || 'balanced';
    state.strategy = data.strategy || 'protect';
    state.command = data.command || 'follow';
    state.zone = data.zone === 'forest' ? 'forest' : 'base';
    state.worldMinutes = Number(data.worldMinutes) || 9 * 60;
    state.weatherIndex = Number(data.weatherIndex) || 0;
    state.crystalsCollected.clear();
    for (const id of data.collectedCrystalIds ?? [])
        state.crystalsCollected.add(id);
    interactables.filter(item => item.kind === 'crystal').forEach((item, index) => { const collected = state.crystalsCollected.has(`crystal-${index}`); item.collected = collected; item.mesh.setEnabled(!collected); });
    for (const c of companions)
        c.active = Boolean(data.partyActive?.[c.id]);
    companions[2].recruited = state.aureliaRecruited;
    companions[2].active = state.aureliaRecruited && Boolean(data.partyActive?.aurelia);
    guardianNPC.root.setEnabled(!state.aureliaRecruited);
    guardianMarker.setEnabled(!state.aureliaRecruited);
    let savedX = Number(data.playerX);
    let savedZ = Number(data.playerZ);
    if (!Number.isFinite(savedX)) savedX = state.zone === 'base' ? 80 : 80;
    if (!Number.isFinite(savedZ)) savedZ = state.zone === 'base' ? 73 : 52;

    // Older saves stored the forest around the origin. Move those coordinates to the
    // new forest beside camp; old connector-road positions are safely placed at its entrance.
    if (data.worldLayoutVersion !== 2 && state.zone === 'forest') {
        const wasInsideOldForest = savedX >= -37 && savedX <= 37 && savedZ >= -40 && savedZ <= 34;
        if (wasInsideOldForest) {
            savedX += FOREST_OFFSET.x;
            savedZ += FOREST_OFFSET.z;
            savedX = Math.max(44, Math.min(116, savedX));
            savedZ = Math.max(6, Math.min(54, savedZ));
        } else {
            savedX = 80;
            savedZ = 52;
        }
    }
    player.root.position.set(savedX, 0, savedZ);
    if (state.bossDefeated) {
        state.questComplete = true;
        setObjective('The Emerald Forest is cleared', 'The Grove Guardian has fallen. Random encounters can now appear in this region.');
    }
    else if (state.bossUnlocked)
        setObjective('Defeat the Grove Guardian', 'The corrupted guardian has awakened in the northern grove.');
    else
        setObjective('Clear the forest path', 'Defeat three forest wolves, then investigate the ancient grove.');
    applyAppearance();
    positionCompanions();
    updateZoneVisuals();
    enemies.forEach(enemy => enemy.root.dispose());
    enemies = [];
    currentTarget = null;
    if (!state.bossDefeated) {
        for (let i = 0; i < Math.max(0, 3 - state.wolfKills); i++)
            addWolf([new Vector3(-5, 0, 8), new Vector3(0, 0, 3), new Vector3(6, 0, -3)][i]);
        if (state.bossUnlocked)
            addBoss();
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
    for (const c of companions)
        if (!c.active || !c.recruited || c.recovering)
            c.model.root.setEnabled(false);
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
        state.mana = 80 + (state.level - 1) * 8;
        showToast(`Level ${state.level}! Your health, mana and combat stats increased.`, 4);
    }
    updateHUD();
}
function dealDamage(enemy, amount) {
    if (enemy.dead) return;
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
    if (enemy.dead)
        return;
    restoreFrozenEnemy(enemy);
    enemy.dead = true;
    enemy.root.setEnabled(false);
    if (enemy.kind === 'wolf') {
        state.wolfKills++;
        state.gold += 15;
        gainXP(42);
        showToast('Forest wolf defeated · +42 XP · +15 gold');
        if (state.wolfKills >= 3 && !state.bossDefeated && !state.bossUnlocked) {
            state.bossUnlocked = true;
            addBoss();
            setObjective('Defeat the Grove Guardian', 'Three wolves have been defeated. The corruption is gathering at the ancient grove.');
        }
        else if (!state.bossUnlocked)
            setObjective('Clear the forest path', `Defeat three forest wolves. ${Math.min(state.wolfKills, 3)} of 3 defeated.`);
    }
    else {
        state.bossDefeated = true;
        state.questComplete = true;
        state.gold += 250;
        state.tokens += 1;
        gainXP(300);
        state.combatTimer = 0;
        setObjective('The Emerald Forest is cleared', 'The Grove Guardian has fallen. Return to base to claim your reward and prepare for the next region.');
        updateHUD();
        void saveGame(true);
        $('victory-overlay').classList.remove('hidden');
        state.paused = true;
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
        window.setTimeout(() => { if (!target.dead) dealDamage(target, strikeDamage); }, 190);
        createSwordSlash(player);
    } else if (playerClass === 'ranger') {
        animateCharacterAttack(player);
        window.setTimeout(() => {
            if (state.started && !target.dead) {
                spawnArrowProjectile(player.root.position.add(new Vector3(0, 1.42, 0.15)), target,
                    23 + state.weaponLevel * 3 + state.level * 2, materials.gold, 23);
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

function spawnProjectile(from, target, damage, color, speed = 17) {
    const orb = MeshBuilder.CreateSphere('magic projectile', { diameter: 0.32, segments: 10 }, scene);
    orb.position.copyFrom(from);
    orb.material = color;
    projectiles.push({
        mesh: orb, from: from.clone(),
        to: target.root.position.add(new Vector3(0, target.kind === 'boss' ? 1.5 : 1, 0)),
        age: 0, duration: Math.max(0.18, distance(from, target.root.position) / speed), damage, target
    });
}

function spawnArrowProjectile(from, target, damage, color = materials.gold, speed = 23) {
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
        duration: Math.max(0.16, distance(from, target.root.position) / speed), damage, target
    });
}

function castAbility(id) {
    if (!state.started || state.paused) return;
    if (state.abilityCooldowns[id] > 0) {
        showToast('That ability is still recharging.', 1.2);
        return;
    }

    const costs = { arcane: 12, heal: 18, nova: 24 };
    if (!(id in costs)) return;

    let target = null;
    if (id === 'arcane' || id === 'nova') {
        target = currentTarget && !currentTarget.dead && distance(player.root.position, currentTarget.root.position) <= 20
            ? currentTarget : nearestEnemy(20);
        if (!target) {
            showToast(id === 'arcane' ? 'No target is close enough for Arcane Bolt.' : 'No target is close enough for Frost Nova.', 1.4);
            return;
        }
    }
    if (state.mana < costs[id]) {
        showToast('Not enough mana. Wait for it to recover.', 1.5);
        return;
    }

    state.mana -= costs[id];
    animateCharacterAttack(player);

    if (id === 'arcane') {
        state.abilityCooldowns.arcane = 1.3;
        const direction = target.root.position.subtract(player.root.position);
        direction.y = 0;
        direction.normalize();
        const glyphPosition = player.root.position.add(direction.scale(1.28)).add(new Vector3(0, 1.52, 0));
        drawMagicGlyph(glyphPosition, new Color3(0.28, 0.9, 1),
            { floor: false, yaw: Math.atan2(direction.x, direction.z), size: 0.66, duration: 790 }, () => {
                if (!target.dead) {
                    spawnProjectile(glyphPosition.clone(), target,
                        48 + state.level * 4 + state.weaponLevel * 2, materials.crystal, 20);
                }
            });
        showToast('Arcane Bolt!');
    } else if (id === 'heal') {
        state.abilityCooldowns.heal = 8;
        state.hp = Math.min(120 + (state.level - 1) * 14, state.hp + 36);
        playHealingEffect(player.root);
        for (const c of activeCompanions()) {
            c.hp = Math.min(c.maxHp, c.hp + 36);
            playHealingEffect(c.model.root);
        }
        showToast('Healing Wave restores health to your party.');
    } else {
        state.abilityCooldowns.nova = 12;
        // Hold the marked target still while its floor rune is drawn and the ice column rises.
        target.telegraphTimer = 1.4;
        const freezePosition = target.root.position.clone();
        drawMagicGlyph(freezePosition.add(new Vector3(0, 0.055, 0)), new Color3(0.36, 0.88, 1),
            { floor: true, size: 0.92, duration: 730 }, () => {
                if (target.dead) return;
                createRisingMagicBeam(target.root.position, new Color3(0.36, 0.88, 1), 2.65, 0.88, 620, () => {
                    if (!target.dead) {
                        freezeEnemy(target, 2.8);
                        dealDamage(target, 62 + state.level * 4);
                    }
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
            const strikeDamage = 19 + state.level * 2;
            window.setTimeout(() => { if (!enemy.dead) dealDamage(enemy, strikeDamage); }, 190);
            createSwordSlash(model);
        }
    } else if (role === 'ranger' || role === 'archer' || companion.role === 'Archer') {
        window.setTimeout(() => {
            if (!enemy.dead && model.root.isEnabled()) {
                spawnArrowProjectile(model.root.position.add(new Vector3(0, 1.42, 0.15)), enemy,
                    22 + state.level * 2, materials.gold, 21);
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
                    companion.role === 'Healer' ? 13 : 21 + state.level * 2,
                    companion.role === 'Healer' ? materials.heal : materials.crystal, 17);
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
    animateCharacterAttack(c.model);
    if (c.role === 'Healer') {
        const candidates = [{ hp: state.hp, maxHp: 120 + (state.level - 1) * 14, root: player.root, player: true }, ...companions.filter(x => x.recruited && !x.recovering).map(x => ({ hp: x.hp, maxHp: x.maxHp, root: x.model.root, companion: x }))];
        candidates.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        const target = candidates[0];
        if (target.player) state.hp = Math.min(target.maxHp, state.hp + 42);
        else target.companion.hp = Math.min(target.maxHp, target.companion.hp + 42);
        burstEffect(target.root.position, materials.heal, 2.0);
        showToast(`Aurelia casts Healing Light on ${target.player ? playerName : target.companion.name}.`);
    } else if (c.role === 'Archer') {
        const target = currentTarget && !currentTarget.dead ? currentTarget : nearestEnemy(22);
        if (!target) { showToast(`${c.name} has no target in range.`); return; }
        spawnProjectile(c.model.root.position.add(new Vector3(0, 1.5, 0)), target, 48 + state.level * 3, materials.gold, 20);
        showToast(`${c.name} fires a Piercing Shot.`);
    } else {
        state.protectionTimer = Math.max(state.protectionTimer, 7);
        c.command = 'defend';
        burstEffect(player.root.position, materials.gold, 2.2);
        showToast(`${c.name} raises a Guardian Ward. Incoming damage is reduced briefly.`);
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
function updateZoneFromPosition() {
    const x = player.root.position.x, z = player.root.position.z;
    const inBase = x >= 55 && x <= 105 && z >= 55 && z <= 105;
    const nextZone = inBase ? 'base' : 'forest';
    if (nextZone !== state.zone) {
        state.zone = nextZone;
        updateZoneVisuals();
        if (nextZone === 'base') setObjective(state.bossDefeated ? 'Headquarters · Forest cleared' : 'Back at headquarters', 'Visit the planning table, hospital or blacksmith, then walk the stone road when you are ready.');
        else setObjective(state.bossDefeated ? 'Explore the cleared forest' : state.bossUnlocked ? 'Defeat the Grove Guardian' : 'Clear the forest path', state.bossDefeated ? 'The region is cleared. Rare encounters and discoveries may still appear.' : 'Explore the forest, gather Ether crystals and face the Grove Guardian.');
        showToast(nextZone === 'base' ? 'You have arrived at headquarters.' : 'You have entered the Emerald Forest.');
        updateHUD();
    }
}
function setZone(zone) {
    state.zone = zone;
    updateZoneVisuals();
    if (zone === 'base') {
        player.root.position.set(80, 0, 73);
        positionCompanions();
        setObjective(state.bossDefeated ? 'The Emerald Forest is cleared' : 'Prepare your next expedition', state.bossDefeated ? 'The forest is safe for now. Visit the planning table to review your party.' : 'Use the planning table to prepare, rest at the hospital and upgrade your weapon.');
    }
    else {
        // The forest now sits north of headquarters instead of around the world origin.
        player.root.position.set(80, 0, 52);
        positionCompanions();
        if (state.bossDefeated)
            setObjective('Explore the cleared forest', 'This region is cleared. Look for occasional rare encounters and hidden discoveries.');
        else if (state.bossUnlocked)
            setObjective('Defeat the Grove Guardian', 'The corrupted guardian awaits at the ancient grove to the north.');
        else
            setObjective('Clear the forest path', 'Find Aurelia, gather Ether crystals and defeat three forest wolves.');
    }
    camera.target = player.root.position.add(new Vector3(0, 1.2, 0));
    nearby = null;
    updateHUD();
}
function updateZoneVisuals() {
    // The zones share one scene, but the environment fog keeps the active area focused.
    if (state.zone === 'base') {
        scene.fogDensity = 0.0045;
        scene.fogColor = new Color3(0.21, 0.29, 0.23);
    }
    else {
        scene.fogDensity = state.weatherIndex === 2 ? 0.014 : 0.0065;
        scene.fogColor = new Color3(0.16, 0.27, 0.20);
    }
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
        setObjective(state.bossUnlocked ? 'Defeat the Grove Guardian' : 'Clear the forest path', state.bossUnlocked ? 'Travel north to the ancient grove and defeat the guardian.' : 'Recruit Aurelia, collect Ether crystals and defeat three wolves.');
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
function openPlanning(fromPause) {
    planningFromPaused = fromPause || state.paused;
    state.paused = true;
    $('pause-overlay').classList.add('hidden');
    $('planning-overlay').classList.remove('hidden');
    $('party-reaphel').checked = companions[0].active;
    $('party-sylva').checked = companions[1].active;
    $('party-aurelia').checked = companions[2].active;
    $('party-aurelia').disabled = !state.aureliaRecruited;
    $('formation-select').value = state.formation;
    $('strategy-select').value = state.strategy;
}
function applyPlanningSelections() {
    companions[0].active = $('party-reaphel').checked;
    companions[1].active = $('party-sylva').checked;
    companions[2].active = state.aureliaRecruited && $('party-aurelia').checked;
    state.formation = $('formation-select').value;
    state.strategy = $('strategy-select').value;
    if (activeCompanions().length === 0)
        companions[0].active = true;
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
function openInventory(fromPause = false) {
    inventoryFromPaused = fromPause || state.paused;
    state.paused = true;
    $('pause-overlay').classList.add('hidden');
    $('inventory-overlay').classList.remove('hidden');
    updateHUD();
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
    state.mana = 80 + (state.level - 1) * 8;
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
    state.mana = 80 + (state.level - 1) * 8;
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
        case 'guardian':
            if (!state.aureliaRecruited) {
                state.aureliaRecruited = true;
                companions[2].recruited = true;
                                companions[2].active = true;
                guardianNPC.root.setEnabled(false);
                guardianMarker.setEnabled(false);
                companions[2].model.root.setEnabled(true);
                companions[2].model.root.position.copyFrom(player.root.position.add(new Vector3(2, 0, 1)));
                showToast('Aurelia has joined your party! She can heal companions during combat.');
                updateHUD();
                void saveGame(true);
            }
            else
                showToast('Aurelia: “The old roots whisper of a guardian deeper in the grove.”');
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
        if (item.kind === 'guardian' && state.aureliaRecruited)
            continue;
        if (item.kind === 'crystal' && item.collected)
            continue;
        if ((item.kind === 'planning' || item.kind === 'bed' || item.kind === 'hospital' || item.kind === 'blacksmith' || item.kind === 'barracks') && state.zone !== 'base')
            continue;
        if ((item.kind === 'guardian' || item.kind === 'crystal') && state.zone !== 'forest')
            continue;
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
    state.level = 1;
    state.xp = 0;
    state.hp = 120;
    state.mana = 80;
    state.gold = 100;
    state.crystals = 0;
    state.tokens = 0;
    state.weaponLevel = 1;
    state.wolfKills = 0;
    state.bossUnlocked = false;
    state.bossDefeated = false;
    state.questComplete = false;
    state.aureliaRecruited = false;
    state.combatTimer = 0;
    state.attackCooldown = 0;
    state.nightSpawned = false;
    state.randomEventTimer = 0;
    state.command = 'follow';
    state.formation = 'balanced';
    state.strategy = 'protect';
    state.defaultAbility = 'arcane';
    state.abilityCooldowns.arcane = 0;
    state.abilityCooldowns.heal = 0;
    state.abilityCooldowns.nova = 0;
    state.aureliaRecruited = false;
    state.crystalsCollected.clear();
    for (const item of interactables)
        if (item.kind === 'crystal') {
            item.collected = false;
            item.mesh.setEnabled(true);
        }
    state.worldMinutes = 9 * 60;
    state.weatherIndex = 0;
    state.zone = 'base';
    companions[0].active = true;
    companions[1].active = true;
    companions[2].active = false;
    companions[2].recruited = false;
    companions.forEach(c => { c.hp = c.maxHp; c.recovering = false; c.recoverTimer = 0; c.command = null; });
    guardianNPC.root.setEnabled(true);
    guardianMarker.setEnabled(true);
    aureliaModel.root.setEnabled(false);
    $('weather-label').textContent = 'CLEAR';
    $('weather-overlay').className = 'weather-overlay';
    currentTarget = null;
    enemies.forEach(e => e.root.dispose());
    enemies = [];
    projectiles.forEach(p => p.mesh.dispose());
    projectiles = [];
    for (let i = 0; i < 3; i++)
        addWolf([new Vector3(-5, 0, 8), new Vector3(0, 0, 3), new Vector3(6, 0, -3)][i]);
    state.bossUnlocked = false;
    player.root.position.set(80, 0, 73);
    applyAppearance();
    positionCompanions();
    state.started = true;
    state.paused = false;
    $('start-overlay').classList.add('hidden');
    updateZoneVisuals();
    setObjective('Prepare your first expedition', 'Use the planning table in the courtyard, then depart for the Emerald Forest.');
    updateHUD();
    showToast(`Welcome, ${playerName}. Your adventure begins at headquarters.`);
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
        if (enemy.dead || !enemy.root.isEnabled())
            continue;
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
        let targetRoot = player.root;
        let targetCompanion = null;
        let d = distance(enemy.root.position, player.root.position);
        for (const companion of activeCompanions()) {
            const companionDistance = distance(enemy.root.position, companion.model.root.position);
            if (companionDistance < d - 0.25) {
                d = companionDistance;
                targetRoot = companion.model.root;
                targetCompanion = companion;
            }
        }
        const detectionRange = Math.min(enemy.detectionRange || enemy.aggro, (enemy.sightRadius || 24) - 0.1);
        if (d <= detectionRange) {
            state.combatTimer = 6;
            const attackRange = enemy.kind === 'boss' ? 3.4 : 1.75;
            if (d > attackRange)
                moveToward(enemy.root, targetRoot.position, enemy.speed * (state.worldMinutes / 60 >= 20 ? 1.22 : 1), dt);
            else if (enemy.attackTimer <= 0) {
                const damage = enemy.damage * (state.worldMinutes / 60 >= 20 ? 1.2 : 1);
                if (targetCompanion) {
                    targetCompanion.hp = Math.max(0, targetCompanion.hp - damage);
                    if (targetCompanion.hp <= 0) {
                        targetCompanion.recovering = true;
                        targetCompanion.recoverTimer = 7;
                        targetCompanion.model.root.setEnabled(false);
                        showToast(`${targetCompanion.name} was overwhelmed and has been sent to the base hospital to recover.`);
                    }
                }
                else {
                    state.hp = Math.max(0, state.hp - damage * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 0.35 : state.protectionTimer > 0 ? 0.65 : 1));
                    state.playerDamageFlash = 0.22;
                    if (state.hp <= 0)
                        playerDefeated();
                }
                enemy.attackTimer = enemy.kind === 'boss' ? 2.0 : 1.8;
                if (enemy.kind === 'boss' && enemy.specialTimer <= 0) {
                    enemy.specialTimer = 6;
                    burstEffect(enemy.root.position, materials.fire, 5.1);
                    if (distance(player.root.position, enemy.root.position) < 6)
                        state.hp = Math.max(0, state.hp - 12);
                    for (const companion of activeCompanions())
                        if (distance(companion.model.root.position, enemy.root.position) < 6)
                            companion.hp = Math.max(0, companion.hp - 12);
                    showToast('The Grove Guardian unleashes a root shockwave!');
                    if (state.hp <= 0)
                        playerDefeated();
                }
            }
        }
    }
    state.combatTimer = Math.max(0, state.combatTimer - dt);
    for (const c of companions) {
        if (c.recovering && state.combatTimer <= 0) {
            c.recoverTimer = Math.max(0, c.recoverTimer - dt);
            if (c.recoverTimer <= 0) {
                c.recovering = false;
                c.hp = Math.max(25, Math.round(c.maxHp * 0.35));
                c.model.root.setEnabled(c.active);
                c.model.root.position.copyFrom(player.root.position.add(new Vector3(1.5, 0, 1.5)));
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
                dealDamage(p.target, p.damage);
            p.mesh.dispose();
            projectiles.splice(i, 1);
        }
    }
}
function updateMovement(dt) {
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
    // The camp and forest are one continuous map; the connecting road is walkable in both directions.
    player.root.position.x = Math.max(44, Math.min(116, player.root.position.x));
    player.root.position.z = Math.max(3, Math.min(104, player.root.position.z));
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
bindButton('victory-return-button', () => { $('victory-overlay').classList.add('hidden'); state.paused = false; setZone('base'); showToast('The forest relic has been secured. The region is now cleared.'); void saveGame(true); });
for (const button of Array.from(document.querySelectorAll('[data-ability]'))) {
    button.addEventListener('click', () => castAbility(button.dataset.ability));
}
$('default-ability-button').addEventListener('click', () => {
    const ids = ['arcane', 'heal', 'nova'];
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
            if (data.version !== 2)
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
        if (event.code === 'Digit2')
            castAbility('nova');
        if (event.code === 'Tab') {
            const targets = enemies.filter(enemy => !enemy.dead && enemy.root.isEnabled());
            if (targets.length) {
                const currentIndex = currentTarget ? targets.findIndex(enemy => enemy.id === currentTarget?.id) : -1;
                currentTarget = targets[(currentIndex + 1) % targets.length];
                showToast(`Target selected: ${currentTarget.kind === 'boss' ? 'Grove Guardian' : 'Forest Wolf'}.`, 1.4);
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
        ' <span>·</span><kbd>F</kbd> Follow <span>·</span><kbd>T</kbd> Attack <span>·</span><kbd>H</kbd> Hold <span>·</span><kbd>G</kbd> Defend <span>·</span><kbd>V</kbd> Advance');
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
for (let i = 0; i < 3; i++)
    addWolf([new Vector3(-5, 0, 8), new Vector3(0, 0, 3), new Vector3(6, 0, -3)][i]);
updateHUD();
void hasSave().then(found => { $('continue-button').disabled = !found; });
let previousFrame = performance.now();
engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - previousFrame) / 1000, 0.05);
    previousFrame = now;
    if (state.started && !state.paused) {
        updateWorldClock(dt);
        state.protectionTimer = Math.max(0, state.protectionTimer - dt);
        updateMovement(dt);
        state.attackCooldown = Math.max(0, state.attackCooldown - dt);
        const repeatAttackRange = playerClass === 'knight' || playerClass === 'warrior' ? 3.8 : 22;
        const repeatAttackCost = playerClass === 'knight' ? 0 :
            playerClass === 'mage' ? 5 : playerClass === 'healer' ? 3 : 2;
        if (keys.has('Space') && state.attackCooldown <= 0 &&
            state.mana >= repeatAttackCost && nearestEnemy(repeatAttackRange)) {
            attack();
        }
        for (const id of ['arcane', 'heal', 'nova'])
            state.abilityCooldowns[id] = Math.max(0, state.abilityCooldowns[id] - dt);
        if (state.mana < 80 + (state.level - 1) * 8)
            state.mana = Math.min(80 + (state.level - 1) * 8, state.mana + dt * 3.2);
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
        if (state.playerDamageFlash > 0)
            player.body.material = materials.enemyEye;
        else
            player.body.material = playerOutfit;
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