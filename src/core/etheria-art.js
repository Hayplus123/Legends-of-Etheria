/* Legends of Etheria — separate character art + radial world layout.
   Load after Babylon.js and before game.js. */
(function (global) {
    'use strict';

    const B = global.BABYLON;
    if (!B) throw new Error('Etheria art requires Babylon.js to load first.');

    const materialCache = new WeakMap();

    function c3(hex) {
        return B.Color3.FromHexString(hex);
    }

    function material(scene, key, hex, emissive = null, power = 90) {
        let cache = materialCache.get(scene);
        if (!cache) {
            cache = new Map();
            materialCache.set(scene, cache);
        }
        if (cache.has(key)) return cache.get(key);

        const m = new B.StandardMaterial('etheria-art-' + key, scene);
        m.diffuseColor = c3(hex);
        m.specularColor = new B.Color3(0.68, 0.72, 0.74);
        m.specularPower = power;
        if (emissive) m.emissiveColor = c3(emissive);
        cache.set(key, m);
        return m;
    }

    function box(scene, parent, name, pos, size, mat, rot = [0, 0, 0]) {
        const mesh = B.MeshBuilder.CreateBox(name, {
            width: size[0], height: size[1], depth: size[2]
        }, scene);
        mesh.parent = parent;
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        return mesh;
    }

    function sphere(scene, parent, name, pos, scale, mat, diameter = 1) {
        const mesh = B.MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, scene);
        mesh.parent = parent;
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.scaling.set(scale[0], scale[1], scale[2]);
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        return mesh;
    }

    function cylinder(scene, parent, name, pos, height, top, bottom, mat, rot = [0, 0, 0]) {
        const mesh = B.MeshBuilder.CreateCylinder(name, {
            height, diameterTop: top, diameterBottom: bottom, tessellation: 12
        }, scene);
        mesh.parent = parent;
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        return mesh;
    }

    function torus(scene, parent, name, pos, diameter, thickness, mat, rot = [0, 0, 0]) {
        const mesh = B.MeshBuilder.CreateTorus(name, {
            diameter, thickness, tessellation: 32
        }, scene);
        mesh.parent = parent;
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        mesh.material = mat;
        mesh.isPickable = false;
        return mesh;
    }

    function glow(layer, mesh) {
        if (layer && mesh) layer.addIncludedOnlyMesh(mesh);
    }

    function hair(scene, root, name, s, hairMat) {
        sphere(scene, root, name + ' layered back hair',
            [0, 2.04 * s, -0.16 * s], [0.38, 0.45, 0.30], hairMat, 0.98 * s);
        sphere(scene, root, name + ' left hair lock',
            [-0.25 * s, 1.98 * s, 0.035 * s], [0.13, 0.38, 0.16], hairMat, 0.56 * s);
        sphere(scene, root, name + ' right hair lock',
            [0.25 * s, 1.98 * s, 0.035 * s], [0.13, 0.38, 0.16], hairMat, 0.56 * s);
        sphere(scene, root, name + ' swept fringe',
            [0, 2.22 * s, 0.16 * s], [0.34, 0.15, 0.19], hairMat, 0.72 * s);
    }

    function knight(scene, model, name, s, m) {
        const root = model.artRoot;

        const cape = cylinder(scene, root, name + ' royal blue cape',
            [0, 0.90 * s, -0.34 * s], 1.62 * s, 0.16 * s, 1.26 * s, m.blue, [-0.08, 0, 0]);
        cape.scaling.z = 0.72;

        box(scene, root, name + ' blue cuirass panel',
            [0, 1.31 * s, 0.414 * s], [0.75 * s, 0.57 * s, 0.12 * s], m.blue);
        box(scene, root, name + ' silver chest centre',
            [0, 1.33 * s, 0.483 * s], [0.18 * s, 0.48 * s, 0.025 * s], m.silver);
        box(scene, root, name + ' gold chest band',
            [0, 1.38 * s, 0.505 * s], [0.60 * s, 0.045 * s, 0.03 * s], m.gold);
        sphere(scene, root, name + ' sapphire breast jewel',
            [0, 1.41 * s, 0.535 * s], [0.09, 0.14, 0.06], m.gem, 0.48 * s);

        for (const side of [-1, 1]) {
            sphere(scene, root, name + ' silver layered pauldron',
                [side * 0.48 * s, 1.51 * s, 0.025 * s], [0.60, 0.40, 0.48], m.silver, 0.88 * s);
            torus(scene, root, name + ' gold pauldron rim',
                [side * 0.48 * s, 1.51 * s, 0.025 * s],
                0.55 * s, 0.045 * s, m.gold, [Math.PI / 2, 0, 0]);
            box(scene, root, name + ' engraved forearm plate',
                [side * 0.52 * s, 0.79 * s, 0.13 * s],
                [0.30 * s, 0.22 * s, 0.20 * s], m.silver);
        }

        // Recolour the existing shield so there is only one shield mesh.
        model.shield.material = m.blue;
        torus(scene, root, name + ' shield gilded rim',
            [-0.63 * s, 1.0 * s, 0.34 * s], 0.95 * s, 0.055 * s, m.gold,
            [Math.PI / 2, 0, 0]);
        sphere(scene, root, name + ' shield lion crest',
            [-0.63 * s, 1.0 * s, 0.41 * s], [0.22, 0.27, 0.08], m.gold, 0.55 * s);
        sphere(scene, root, name + ' shield sapphire',
            [-0.63 * s, 1.0 * s, 0.48 * s], [0.08, 0.12, 0.05], m.gem, 0.46 * s);

        hair(scene, root, name, s, m.darkHair);

        if (model.activeWeaponRoot) {
            const detail = new B.TransformNode(name + ' sword detail pivot', scene);
            detail.parent = model.activeWeaponRoot;
            model.artWeaponRoot = detail;
            box(scene, detail, name + ' bright sword fuller',
                [0, 0.52 * s, 0.035 * s], [0.025 * s, 0.73 * s, 0.018 * s], m.gem);
            sphere(scene, detail, name + ' sword pommel jewel',
                [0, -0.22 * s, 0.02 * s], [0.08, 0.08, 0.08], m.gem, 0.52 * s);
        }
    }

    function ranger(scene, model, name, s, m) {
        const root = model.artRoot;

        const mantle = cylinder(scene, root, name + ' forest-green travel mantle',
            [0, 0.88 * s, -0.34 * s], 1.52 * s, 0.14 * s, 1.12 * s, m.green, [-0.05, 0, 0]);
        mantle.scaling.z = 0.70;

        hair(scene, root, name, s, m.darkHair);

        // Pointed elven ears.
        for (const side of [-1, 1]) {
            cylinder(scene, root, name + ' pointed elf ear',
                [side * 0.34 * s, 2.02 * s, 0.025 * s],
                0.34 * s, 0.012 * s, 0.18 * s, m.skin,
                [0, 0, side * -0.70]);
        }

        box(scene, root, name + ' ranger chest leather',
            [0, 1.30 * s, 0.41 * s], [0.66 * s, 0.47 * s, 0.105 * s], m.green);
        box(scene, root, name + ' ranger gold seam',
            [0, 1.33 * s, 0.47 * s], [0.045 * s, 0.42 * s, 0.025 * s], m.gold);
        sphere(scene, root, name + ' emerald clasp',
            [0, 1.40 * s, 0.49 * s], [0.085, 0.13, 0.06], m.leaf, 0.5 * s);

        // Layered leaf-shaped shoulder mantles.
        for (let i = 0; i < 5; i++) {
            const side = i % 2 ? 1 : -1;
            const leaf = sphere(scene, root, name + ' shoulder leaf ' + i,
                [side * (0.40 + i * 0.025) * s, (1.51 - i * 0.065) * s, 0.12 * s],
                [0.11, 0.045, 0.28], i % 2 ? m.leaf : m.green, 0.72 * s);
            leaf.rotation.y = side * (0.25 + i * 0.08);
            leaf.rotation.x = -0.32;
        }

        // Quiver shafts and bright arrowheads.
        for (let i = 0; i < 3; i++) {
            const x = (-0.50 + i * 0.12) * s;
            cylinder(scene, root, name + ' quiver arrow shaft ' + i,
                [x, 1.62 * s, -0.29 * s], 0.76 * s, 0.025 * s, 0.025 * s, m.gold);
            cylinder(scene, root, name + ' quiver arrowhead ' + i,
                [x, 2.03 * s, -0.29 * s], 0.16 * s, 0, 0.10 * s, m.silver);
        }

        if (model.activeWeaponRoot) {
            const detail = new B.TransformNode(name + ' bow detail pivot', scene);
            detail.parent = model.activeWeaponRoot;
            model.artWeaponRoot = detail;

            for (let i = 0; i < 5; i++) {
                const leaf = sphere(scene, detail, name + ' bow leaf ' + i,
                    [0.035 * s, (-0.38 + i * 0.19) * s, 0.02 * s],
                    [0.06, 0.04, 0.16], i % 2 ? m.leaf : m.green, 0.60 * s);
                leaf.rotation.y = (i - 2) * 0.16;
            }

            sphere(scene, detail, name + ' bow emerald',
                [0, 0, 0.08 * s], [0.08, 0.12, 0.06], m.gem, 0.48 * s);
        }
    }

    function healer(scene, model, name, s, m, glowLayer) {
        const root = model.artRoot;

        const robe = cylinder(scene, root, name + ' ivory outer robe',
            [0, 0.83 * s, -0.015 * s], 1.72 * s, 0.40 * s, 1.18 * s, m.ivory);
        robe.scaling.z = 0.73;

        box(scene, root, name + ' teal robe front panel',
            [0, 0.90 * s, 0.40 * s], [0.37 * s, 1.38 * s, 0.04 * s], m.teal);
        box(scene, root, name + ' gold robe embroidery left',
            [-0.25 * s, 0.91 * s, 0.424 * s], [0.035 * s, 1.34 * s, 0.025 * s], m.gold);
        box(scene, root, name + ' gold robe embroidery right',
            [0.25 * s, 0.91 * s, 0.424 * s], [0.035 * s, 1.34 * s, 0.025 * s], m.gold);

        sphere(scene, root, name + ' healer left mantle',
            [-0.41 * s, 1.48 * s, 0.02 * s], [0.50, 0.29, 0.43], m.ivory, 0.92 * s);
        sphere(scene, root, name + ' healer right mantle',
            [0.41 * s, 1.48 * s, 0.02 * s], [0.50, 0.29, 0.43], m.ivory, 0.92 * s);
        torus(scene, root, name + ' gold collar',
            [0, 1.67 * s, 0.03 * s], 0.62 * s, 0.045 * s, m.gold);

        sphere(scene, root, name + ' chest healing crystal',
            [0, 1.39 * s, 0.49 * s], [0.10, 0.16, 0.06], m.gem, 0.60 * s);

        hair(scene, root, name, s, m.blonde);
        torus(scene, root, name + ' healer circlet',
            [0, 2.25 * s, 0.025 * s], 0.52 * s, 0.035 * s, m.gold);

        // A soft aura follows her in-world model.
        const orb = sphere(scene, root, name + ' healing hand light',
            [0.72 * s, 1.06 * s, 0.34 * s], [0.20, 0.20, 0.20], m.heal, 0.36 * s);
        glow(glowLayer, orb);
        torus(scene, root, name + ' healing hand halo',
            [0.72 * s, 1.06 * s, 0.34 * s],
            0.62 * s, 0.025 * s, m.heal, [Math.PI / 2, 0.25, 0]);

        if (model.activeWeaponRoot) {
            const detail = new B.TransformNode(name + ' staff detail pivot', scene);
            detail.parent = model.activeWeaponRoot;
            model.artWeaponRoot = detail;
            torus(scene, detail, name + ' staff lower gold ring',
                [0, 0.45 * s, 0], 0.20 * s, 0.035 * s, m.gold);
            torus(scene, detail, name + ' staff upper gold ring',
                [0, 1.58 * s, 0], 0.43 * s, 0.045 * s, m.gold);
            const crystal = sphere(scene, detail, name + ' staff sapphire',
                [0, 1.72 * s, 0], [0.54, 1.05, 0.54], m.gem, 0.38 * s);
            glow(glowLayer, crystal);
        }
    }

    function decorateCharacter(model, options) {
        if (!model || !model.root || !options || !options.scene) return;

        if (model.artRoot) model.artRoot.dispose();
        if (model.artWeaponRoot) model.artWeaponRoot.dispose();

        const scene = options.scene;
        const name = options.name || model.name || 'Etheria hero';
        const role = String(options.role || model.role || 'warrior').toLowerCase();
        const s = Number(options.size || model.size || 1);
        const glowLayer = options.glowLayer;

        model.artRoot = new B.TransformNode(name + ' detailed art layer', scene);
        model.artRoot.parent = model.root;
        model.artWeaponRoot = null;

        const m = {
            blue: material(scene, 'royal-blue', '#18395e'),
            silver: material(scene, 'bright-silver', '#a9c5d1'),
            gold: material(scene, 'royal-gold', '#c9953f', null, 120),
            gem: material(scene, 'ether-sapphire', '#42c8ee', '#12649d', 120),
            green: material(scene, 'ranger-green', '#28533a'),
            leaf: material(scene, 'leaf-green', '#75a95e'),
            darkHair: material(scene, 'dark-hair', '#302326'),
            blonde: material(scene, 'blonde-hair', '#d9b16d'),
            skin: material(scene, 'warm-skin', '#c88d6c'),
            ivory: material(scene, 'healer-ivory', '#e9e7d8'),
            teal: material(scene, 'healer-teal', '#167d83'),
            heal: material(scene, 'healing-aura', '#8fffd2', '#35ccae', 120)
        };

        if (role === 'knight' || name.toLowerCase() === 'reaphel') {
            knight(scene, model, name, s, m);
        } else if (role === 'ranger' || role === 'archer' || name.toLowerCase() === 'sylva') {
            ranger(scene, model, name, s, m);
        } else if (role === 'healer' || name.toLowerCase() === 'aurelia') {
            healer(scene, model, name, s, m, glowLayer);
        } else {
            const accent = role === 'mage' || role === 'summoner' ? m.gem : m.gold;
            box(scene, model.artRoot, name + ' class chest detail',
                [0, 1.32 * s, 0.43 * s], [0.64 * s, 0.43 * s, 0.08 * s], m.blue);
            torus(scene, model.artRoot, name + ' class belt detail',
                [0, 0.88 * s, 0], 0.78 * s, 0.045 * s, accent);
            sphere(scene, model.artRoot, name + ' class crest',
                [0, 1.39 * s, 0.49 * s], [0.09, 0.12, 0.06], accent, 0.50 * s);
        }

        model.artRole = role;
    }

    // ------------------------------------------------------------------
    // True shared-world layout: five full regions around headquarters.
    // The transformation updates all world positions and their collision data.
    // ------------------------------------------------------------------
    function placeRegionsAroundHeadquarters(options) {
        const base = options.baseCenter.clone();
        const regions = options.regionData;
        const order = options.regionOrder;
        const visuals = options.regionVisuals;
        const hazards = options.hazards || [];
        const landmarks = options.dungeonLandmarks || [];
        const fireflies = options.fireflies || [];
        const radius = Number(options.radius || 270);

        const angles = {
            forest: 0,
            emberfall: 72,
            frostveil: 144,
            starfall: 216,
            mire: 288
        };

        const layouts = {};
        const routes = {};

        function transformPoint(point, layout) {
            const dx = point.x - layout.origin.x;
            const dz = point.z - layout.origin.z;
            const c = Math.cos(layout.yaw);
            const s = Math.sin(layout.yaw);
            return new B.Vector3(
                layout.target.x + dx * c + dz * s,
                point.y,
                layout.target.z - dx * s + dz * c
            );
        }

        function rotateVector(vector, yaw) {
            const c = Math.cos(yaw);
            const s = Math.sin(yaw);
            return new B.Vector3(
                vector.x * c + vector.z * s,
                vector.y,
                -vector.x * s + vector.z * c
            );
        }

        function moveObject(item, layout) {
            if (!item || item.parent || !item.position) return;

            item.position.copyFrom(transformPoint(item.position, layout));

            if (item.rotationQuaternion) {
                const rotation = B.Quaternion.RotationAxis(B.Axis.Y, layout.yaw);
                item.rotationQuaternion = rotation.multiply(item.rotationQuaternion);
            } else if (item.rotation) {
                item.rotation.y += layout.yaw;
            }
        }

        for (const id of order) {
            const region = regions[id];
            if (!region) continue;

            const origin = region.center.clone();
            const angle = (angles[id] || 0) * Math.PI / 180;
            const direction = new B.Vector3(Math.sin(angle), 0, -Math.cos(angle));
            const yaw = -angle;
            const target = base.add(direction.scale(radius));

            const localBounds = {
                minX: region.bounds.minX - origin.x,
                maxX: region.bounds.maxX - origin.x,
                minZ: region.bounds.minZ - origin.z,
                maxZ: region.bounds.maxZ - origin.z
            };

            const layout = { origin, target, yaw, direction, localBounds };
            layouts[id] = layout;

            const bundle = visuals[id] || {};
            for (const mesh of bundle.meshes || []) moveObject(mesh, layout);
            for (const node of bundle.transforms || []) moveObject(node, layout);
            for (const light of bundle.lights || []) {
                if (light && !light.parent && light.position) {
                    light.position.copyFrom(transformPoint(light.position, layout));
                }
            }

            for (const obstacle of bundle.obstacles || []) {
                const point = transformPoint(
                    new B.Vector3(obstacle.x, 0, obstacle.z), layout
                );
                obstacle.x = point.x;
                obstacle.z = point.z;
            }

            for (const key of [
                'entryPosition', 'bossPosition', 'cagePosition',
                'dungeonPosition', 'dungeonRoomPosition'
            ]) {
                if (region[key]) region[key].copyFrom(transformPoint(region[key], layout));
            }

            if (Array.isArray(region.mobPositions)) {
                region.mobPositions = region.mobPositions.map(point =>
                    transformPoint(point, layout)
                );
            }

            if (region.entryDirection) {
                region.entryDirection.copyFrom(rotateVector(region.entryDirection, yaw));
            }

            region.center.copyFrom(target);

            const corners = [
                new B.Vector3(origin.x + localBounds.minX, 0, origin.z + localBounds.minZ),
                new B.Vector3(origin.x + localBounds.maxX, 0, origin.z + localBounds.minZ),
                new B.Vector3(origin.x + localBounds.minX, 0, origin.z + localBounds.maxZ),
                new B.Vector3(origin.x + localBounds.maxX, 0, origin.z + localBounds.maxZ)
            ].map(point => transformPoint(point, layout));

            region.bounds = {
                minX: Math.min(...corners.map(point => point.x)),
                maxX: Math.max(...corners.map(point => point.x)),
                minZ: Math.min(...corners.map(point => point.z)),
                maxZ: Math.max(...corners.map(point => point.z))
            };

            for (const hazard of hazards) {
                if (hazard.regionId === id && hazard.position) {
                    hazard.position.copyFrom(transformPoint(hazard.position, layout));
                }
            }

            for (const landmark of landmarks) {
                if (landmark.regionId === id && landmark.roomPosition) {
                    landmark.roomPosition.copyFrom(transformPoint(landmark.roomPosition, layout));
                }
            }

            if (id === 'forest') {
                for (const mote of fireflies) {
                    const point = transformPoint(
                        new B.Vector3(mote.x, mote.y, mote.z), layout
                    );
                    mote.x = point.x;
                    mote.y = point.y;
                    mote.z = point.z;
                }
            }

            const routeFrom = base.add(direction.scale(23));
            const routeTo = region.entryPosition.add(direction.scale(20));
            routes[id] = { from: routeFrom, to: routeTo };
        }

        function contains(id, x, z) {
            const layout = layouts[id];
            if (!layout) return false;

            const dx = x - layout.target.x;
            const dz = z - layout.target.z;
            const c = Math.cos(layout.yaw);
            const s = Math.sin(layout.yaw);
            const localX = dx * c - dz * s;
            const localZ = dx * s + dz * c;
            const b = layout.localBounds;

            return localX >= b.minX && localX <= b.maxX &&
                   localZ >= b.minZ && localZ <= b.maxZ;
        }

        function onRoute(id, x, z) {
            const route = routes[id];
            if (!route) return false;

            const ax = route.from.x;
            const az = route.from.z;
            const dx = route.to.x - ax;
            const dz = route.to.z - az;
            const lengthSquared = dx * dx + dz * dz;
            if (lengthSquared < 0.001) return false;

            const px = x - ax;
            const pz = z - az;
            const t = (px * dx + pz * dz) / lengthSquared;
            if (t < 0 || t > 1) return false;

            const crossDistance = Math.abs(px * dz - pz * dx) /
                Math.sqrt(lengthSquared);
            return crossDistance <= 5.5;
        }

        return {
            routes,
            point(id, originalPoint) {
                const layout = layouts[id];
                return layout ? transformPoint(originalPoint, layout) : originalPoint.clone();
            },
            contains,
            onRoute
        };
    }

    global.EtheriaArt = {
        decorateCharacter,
        placeRegionsAroundHeadquarters
    };
})(window);
