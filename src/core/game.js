
(function(E) {
'use strict';

const $ = id => document.getElementById(id);
const S = E.state;
const keys = {};

let toastTimer = 0;
let nearby = null;
let clockSave = 0;

E.ui = {
    toast(text) {
        $('toast').textContent = text;
        $('toast').classList.add('visible');
        toastTimer = 3.2;
    },

    quest(title, detail) {
        $('questTitle').textContent = title;
        $('questDetail').textContent = detail;
    },

    update() {
        const hpMax = E.progress.maxHP();
        const mpMax = E.progress.maxMana();

        $('heroName').textContent = (S.name || 'Wayfarer').toUpperCase();
        $('heroClass').textContent = (S.heroClass || 'warrior').toUpperCase();
        $('levelLabel').textContent = 'LV ' + S.level;

        $('hpText').textContent = Math.ceil(S.hp) + ' / ' + hpMax;
        $('manaText').textContent = Math.ceil(S.mana) + ' / ' + mpMax;
        $('xpText').textContent = S.xp + ' / ' + S.level * 100;

        $('hpBar').style.width = (100 * S.hp / hpMax) + '%';
        $('manaBar').style.width = (100 * S.mana / mpMax) + '%';
        $('xpBar').style.width = (100 * S.xp / (S.level * 100)) + '%';

        $('goldText').textContent = S.gold;
        $('crystalText').textContent = S.crystals;
        $('inventoryGold').textContent = S.gold;
        $('inventoryCrystals').textContent = S.crystals;

        $('weaponLevelText').textContent =
            E.progress.equipment.weaponName() + ' · Lv ' + S.weaponLevel;

        const list = $('partyMembers');
        list.innerHTML = '';

        E.team.active().forEach(c => {
            const row = document.createElement('div');
            row.className = 'party-member';
            row.innerHTML =
                '<div class="party-avatar">' + c.name[0] + '</div>' +
                '<div><b>' + c.name + '</b><small>' + c.role + '</small></div>' +
                '<div class="party-health"><i style="width:' +
                Math.max(0, c.hp / c.maxHp * 100) + '%"></i></div>';

            list.appendChild(row);
        });

        const target = E.targeting.current || E.targeting.nearest(18);

        if (S.zone === 'forest' && target) {
            $('targetPanel').classList.remove('hidden');
            $('targetName').textContent = target.name;
            $('targetHpText').textContent =
                Math.ceil(target.hp) + ' / ' + target.maxHp;
            $('targetHpBar').style.width =
                (100 * target.hp / target.maxHp) + '%';
        } else {
            $('targetPanel').classList.add('hidden');
        }

        $('questProgress').textContent =
            S.bossDefeated ? 'Forest cleared' :
            S.bossUnlocked ? 'Guardian encounter available' :
            'Wolves defeated: ' + S.wolfKills + ' / 3';

        $('questBar').style.width = E.quests.progress() + '%';
        $('continueAdventure').disabled = !E.save.read();
    }
};

E.ui.nearby = function() {
    nearby = null;
    let best = 3.0;

    E.world.interactables.forEach(item => {
        if (item.zone !== S.zone) return;
        if (item.id === 'recruit' && S.aurelia) return;
        if (item.id.startsWith('crystal') &&
            E.world.collected.has(item.id)) return;

        const p = E.player.hero.root.position;
        const d = Math.hypot(p.x - item.pos.x, p.z - item.pos.z);

        if (d < best) {
            best = d;
            nearby = item;
        }
    });

    $('interactPrompt').classList.toggle('hidden', !nearby);

    if (nearby) {
        $('interactText').textContent = nearby.label;
    }
};

E.game = {
    start() {
        S.name = ($('nameInput').value.trim() || 'Wayfarer').slice(0, 18);
        S.heroClass = $('classInput').value;
        S.look = $('lookInput').value;

        Object.assign(S, {
            started: true,
            paused: false,
            zone: 'base',
            level: 1,
            xp: 0,
            hp: 120,
            mana: 80,
            gold: 100,
            crystals: 0,
            wolfKills: 0,
            bossUnlocked: false,
            bossDefeated: false,
            aurelia: false,
            weaponLevel: 1,
            formation: 'balanced',
            strategy: 'protect',
            command: 'follow',
            minutes: 9 * 60,
            weather: 0,
            combat: 0,
            attackTimer: 0
        });

        E.world.collected.clear();
        E.world.crystalMeshes.forEach(m => m.setEnabled(true));

        E.entities.enemies.forEach(e => e.root.dispose());
        E.entities.enemies = [];

        E.team.members.forEach(c => {
            c.active = c.id !== 'aurelia';
            c.recruited = c.id !== 'aurelia';
            c.down = false;
            c.hp = c.maxHp;
            c.model.root.setEnabled(c.active);
        });

        E.world.setZone('base');
        E.player.hero.root.setEnabled(true);
        E.player.hero.root.position.set(0, 0, 0);
        E.player.setAppearance();

        E.combat.addWolf(-8, -9);
        E.combat.addWolf(2, -14);
        E.combat.addWolf(10, -10);

        $('startScreen').classList.add('hidden');

        this.resume();

        E.ui.quest(
            'Prepare your first expedition',
            'Use the planning table in the courtyard. You can also open it from the pause menu at any time.'
        );

        E.ui.update();
        E.save.write();
    },

    resume() {
        S.started = true;
        S.paused = false;

        $('pauseScreen').classList.add('hidden');
        $('planningScreen').classList.add('hidden');
        $('inventoryScreen').classList.add('hidden');
        $('settingsScreen').classList.add('hidden');
    },

    pause() {
        if (!S.started) return;

        S.paused = true;
        $('pauseScreen').classList.remove('hidden');
    },

    planning(fromPause = false) {
        if (!S.started) return;

        this.wasPaused = !!fromPause;
        S.paused = true;

        $('pauseScreen').classList.add('hidden');
        $('planningScreen').classList.remove('hidden');

        $('useReaphel').checked = E.team.members[0].active;
        $('useSylva').checked = E.team.members[1].active;
        $('useAurelia').checked = E.team.members[2].active;
        $('useAurelia').disabled = !S.aurelia;

        $('formationInput').value = S.formation;
        $('strategyInput').value = S.strategy;
    },

    applyPlanning() {
        E.team.members[0].active = $('useReaphel').checked;
        E.team.members[1].active = $('useSylva').checked;
        E.team.members[2].active =
            S.aurelia && $('useAurelia').checked;

        if (!E.team.active().length) {
            E.team.members[0].active = true;
        }

        S.formation = $('formationInput').value;
        S.strategy = $('strategyInput').value;

        E.team.active().forEach(c => c.model.root.setEnabled(true));
        E.team.members.filter(c => !c.active)
            .forEach(c => c.model.root.setEnabled(false));

        E.ui.update();
        E.save.write();
    },

    closePlanning() {
        this.applyPlanning();
        $('planningScreen').classList.add('hidden');

        if (this.wasPaused) {
            $('pauseScreen').classList.remove('hidden');
            S.paused = true;
        } else {
            this.resume();
        }
    },

    depart() {
        this.applyPlanning();
        $('planningScreen').classList.add('hidden');

        E.world.setZone('forest');
        E.player.hero.root.position.set(0, 0, 7);

        E.team.active().forEach((c, i) => {
            c.model.root.position.copyFrom(
                E.player.hero.root.position.add(E.team.offset(i))
            );
        });

        S.paused = false;
        S.zone = 'forest';

        E.ui.quest(
            S.bossUnlocked ? 'Defeat the Grove Guardian' : 'Explore the Emerald Forest',
            'Find Aurelia, gather three Ether crystals and defeat three wolves to reveal the ancient grove.'
        );

        E.ui.toast('Your expedition begins.');
        E.save.write();
    },

    base() {
        if (S.zone === 'base') {
            return E.ui.toast('You are already at headquarters.');
        }

        const danger = E.entities.enemies.some(e =>
            !e.dead &&
            Math.hypot(
                e.root.position.x - E.player.hero.root.position.x,
                e.root.position.z - E.player.hero.root.position.z
            ) < e.aggro + 1
        );

        if (S.combat > 0 || danger) {
            return E.ui.toast('Escape combat before returning to base.');
        }

        E.world.setZone('base');
        E.player.hero.root.position.set(0, 0, 0);

        E.team.active().forEach((c, i) => {
            c.model.root.position.copyFrom(
                E.player.hero.root.position.add(E.team.offset(i))
            );
        });

        E.ui.quest(
            S.bossDefeated ? 'The forest is cleared' : 'Prepare your next expedition',
            'Use the planning table to prepare another trip.'
        );

        E.ui.toast('Returned safely to headquarters.');
        E.save.write();
    },

    interact() {
        if (!nearby) return;

        switch (nearby.id) {
            case 'planning':
                this.planning(false);
                break;

            case 'bed':
                S.minutes = 8 * 60;
                E.player.reviveAtBase();
                E.ui.toast('You slept until morning.');
                break;

            case 'hospital':
                E.player.reviveAtBase();
                break;

            case 'smith':
                $('inventoryScreen').classList.remove('hidden');
                S.paused = true;
                break;

            case 'recruit':
                E.team.recruitAurelia();
                E.quests.set(
                    'Clear the forest path',
                    'Aurelia has joined. Collect the Ether crystals and defeat three wolves.'
                );
                break;

            default:
                if (nearby.id.startsWith('crystal')) {
                    E.world.collected.add(nearby.id);

                    const n = Number(nearby.id.replace('crystal', ''));
                    E.world.crystalMeshes[n].setEnabled(false);

                    S.crystals++;
                    S.gold += 5;

                    E.ui.toast('Ether crystal collected.');
                    E.save.write();
                }
        }

        E.ui.update();
    },

    update(dt) {
        if (!S.started || S.paused) return;

        S.combat = Math.max(0, S.combat - dt);
        S.attackTimer = Math.max(0, S.attackTimer - dt);

        Object.keys(S.cooldowns).forEach(k => {
            S.cooldowns[k] = Math.max(0, S.cooldowns[k] - dt);
        });

        S.mana = Math.min(E.progress.maxMana(), S.mana + dt * 3);

        if (S.combat <= 0) {
            S.hp = Math.min(E.progress.maxHP(), S.hp + dt * 0.25);
        }

        E.player.updateMovement(dt, keys);
        E.combat.updateEnemies(dt);
        E.team.updateAI(dt);
        E.ui.nearby();
        E.worldRespawn.update(dt);
        E.world.updateTime(dt);

        if (toastTimer > 0 && (toastTimer -= dt) <= 0) {
            $('toast').classList.remove('visible');
        }

        if ((clockSave += dt) > 45) {
            clockSave = 0;
            E.save.write();
        }

        if (Math.floor(performance.now() / 500) !== this.lastHud) {
            this.lastHud = Math.floor(performance.now() / 500);
            E.ui.update();
        }
    }
};

function interactWith() {
    E.game.interact();
}

function setPauseBase() {
    if (S.zone === 'base') {
        S.paused = false;
        $('pauseScreen').classList.add('hidden');
        return;
    }

    const danger = E.entities.enemies.some(e =>
        !e.dead &&
        Math.hypot(
            e.root.position.x - E.player.hero.root.position.x,
            e.root.position.z - E.player.hero.root.position.z
        ) < e.aggro + 1
    );

    if (danger || S.combat > 0) {
        E.ui.toast('Escape combat before returning to base.');
        return;
    }

    E.game.base();
    S.paused = false;
    $('pauseScreen').classList.add('hidden');
}

function bind(id, fn) {
    const el = $(id);
    if (el) el.addEventListener('click', fn);
}

// Load the extra GLB models from the assets/models folder.
// If one is missing, the rest of the game can still run.
function loadStarterModels() {
    if (!E.assets || typeof E.assets.loadGLB !== 'function') return;

    const placements = [
        {
            id: 'starter-oak',
            file: 'ancient_oak.glb',
            zone: 'forest',
            position: [-24, 0, -18],
            scale: 0.86,
            rotation: 0.35
        },
        {
            id: 'starter-fern',
            file: 'fern_cluster.glb',
            zone: 'forest',
            position: [10, 0, 9],
            scale: 2.1,
            rotation: 1.1
        },
        {
            id: 'starter-side-gate',
            file: 'ancient_forest_gate.glb',
            zone: 'forest',
            position: [21, 0, -22],
            scale: 0.62,
            rotation: 0
        },
        {
            id: 'starter-lantern',
            file: 'camp_lantern.glb',
            zone: 'base',
            position: [7, 0, -5],
            scale: 0.9,
            rotation: 0.2
        },
        {
            id: 'starter-boulder',
            file: 'mossy_boulder.glb',
            zone: 'forest',
            position: [21, 0, 8],
            scale: 1.05,
            rotation: 0.5
        },
        {
            id: 'starter-crystal',
            file: 'ether_crystal_cluster.glb',
            zone: 'forest',
            position: [-17, 0, -17],
            scale: 0.78,
            rotation: 0.35
        }
    ];

    placements.forEach(item => {
        E.assets.loadGLB(
            item.id,
            './assets/models/' + item.file
        ).then(result => {
            const root =
                result.meshes.find(mesh => mesh.name === '__root__') ||
                result.meshes[0];

            if (!root) return;

            root.parent = item.zone === 'base'
                ? E.world.baseRoot
                : E.world.forestRoot;

            root.position.set(
                item.position[0],
                item.position[1],
                item.position[2]
            );

            root.scaling.setAll(item.scale);
            root.rotation.y = item.rotation;
        }).catch(error => {
            console.warn('Optional model could not be loaded: ' + item.file, error);
        });
    });
}

// Initialize the 3D engine, textures and game world.
try {
    E.init3D();

    if (typeof E.applyAssetTextures === 'function') {
        try {
            E.applyAssetTextures();
        } catch (assetError) {
            console.warn('Optional material textures could not be applied:', assetError);
        }
    }

    E.world.build();
    E.player.create();
    E.team.create();
    E.entities.enemies = [];

    loadStarterModels();

} catch (err) {
    console.error(err);
    $('errorBanner').textContent =
        'The 3D engine could not start: ' + err.message;
    $('errorBanner').classList.remove('hidden');
    throw err;
}

// Phaser handles the game update clock and ambient particles.
// Babylon handles the actual 3D world.
try {
    if (!window.Phaser) {
        throw new Error('Phaser 3 did not load');
    }

    const PhaserScene = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function() {
            Phaser.Scene.call(this, {
                key: 'EtheriaRuntime'
            });
        },

        create: function() {
            const g = this.add.graphics();

            g.fillStyle(0xdde9a8, 1);
            g.fillCircle(5, 5, 4);
            g.generateTexture('leaf-glow', 10, 10);
            g.destroy();

            this.add.particles(0, 0, 'leaf-glow', {
                x: {
                    min: 0,
                    max: this.scale.width
                },
                y: {
                    min: -20,
                    max: this.scale.height * 0.8
                },
                speedX: {
                    min: -9,
                    max: 9
                },
                speedY: {
                    min: 10,
                    max: 25
                },
                scale: {
                    start: 0.4,
                    end: 0
                },
                alpha: {
                    start: 0.18,
                    end: 0
                },
                lifespan: 7000,
                frequency: 550,
                blendMode: 'ADD'
            });
        },

        update: function(t, delta) {
            E.game.update(Math.min(delta / 1000, 0.05));
        }
    });

    E.phaser = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: 'phaser-fx',
        width: window.innerWidth,
        height: window.innerHeight,
        transparent: true,
        backgroundColor: 'rgba(0,0,0,0)',
        scene: [PhaserScene],
        render: {
            transparent: true,
            antialias: true
        },
        audio: {
            noAudio: true
        }
    });

    window.addEventListener('resize', () => {
        E.phaser.scale.resize(window.innerWidth, window.innerHeight);
    });

} catch (err) {
    console.error('Phaser runtime fallback:', err);

    let last = performance.now();

    setInterval(() => {
        const now = performance.now();
        E.game.update(Math.min((now - last) / 1000, 0.05));
        last = now;
    }, 16);
}

// Connect interface buttons after all game systems are initialized.
bind('beginAdventure', () => {
    try {
        E.game.start();
    } catch (err) {
        console.error('Could not begin adventure:', err);
        $('errorBanner').textContent =
            'The adventure could not start: ' + err.message;
        $('errorBanner').classList.remove('hidden');
    }
});

bind('continueAdventure', () => {
    if (E.save.load()) {
        S.started = true;
        S.paused = false;
        $('startScreen').classList.add('hidden');
        E.ui.update();
        E.ui.toast('Welcome back to Etheria.');
    }
});

bind('pauseBtn', () => E.game.pause());
bind('resumeBtn', () => E.game.resume());
bind('pausePlanningBtn', () => E.game.planning(true));
bind('departBtn', () => E.game.depart());
bind('closePlanningBtn', () => E.game.closePlanning());
bind('returnBaseBtn', () => E.game.base());
bind('pauseBaseBtn', setPauseBase);

bind('saveBtn', () => {
    E.save.write();
    E.ui.toast('Adventure saved.');
});

bind('pauseSaveBtn', () => {
    E.save.write();
    E.ui.toast('Adventure saved.');
});

bind('commandsBtn', () => {
    $('commandScreen').classList.toggle('hidden');
});

bind('closeCommandsBtn', () => {
    $('commandScreen').classList.add('hidden');
});

let inventoryFromPause = false;

bind('inventoryBtn', () => {
    inventoryFromPause = !$('pauseScreen').classList.contains('hidden');
    $('pauseScreen').classList.add('hidden');
    $('inventoryScreen').classList.remove('hidden');
    S.paused = true;
});

bind('closeInventoryBtn', () => {
    $('inventoryScreen').classList.add('hidden');

    if (inventoryFromPause) {
        $('pauseScreen').classList.remove('hidden');
        S.paused = true;
    } else {
        S.paused = false;
    }
});

bind('upgradeWeaponBtn', () => E.progress.upgradeWeapon());

let settingsFromPause = false;

bind('settingsBtn', () => {
    settingsFromPause = !$('pauseScreen').classList.contains('hidden');
    $('pauseScreen').classList.add('hidden');
    $('settingsScreen').classList.remove('hidden');
    S.paused = true;
});

bind('closeSettingsBtn', () => {
    $('settingsScreen').classList.add('hidden');

    if (settingsFromPause) {
        $('pauseScreen').classList.remove('hidden');
        S.paused = true;
    } else {
        S.paused = false;
    }
});

bind('exportSaveBtn', () => E.save.export());

bind('victoryReturnBtn', () => {
    $('victoryScreen').classList.add('hidden');
    S.combat = 0;
    S.paused = false;
    E.game.base();
});

bind('defaultSpellBtn', () => {
    const spells = ['bolt', 'heal', 'nova'];
    S.defaultSpell =
        spells[(spells.indexOf(S.defaultSpell) + 1) % spells.length];

    $('defaultSpellBtn').textContent =
        'DEFAULT: ' + S.defaultSpell.toUpperCase();
});

document.querySelectorAll('[data-spell]').forEach(button => {
    button.addEventListener('click', () => {
        E.combat.cast(button.dataset.spell);
    });
});

document.querySelectorAll('[data-command]').forEach(button => {
    button.addEventListener('click', () => {
        E.team.command(button.dataset.command);
    });
});

$('cameraDistance').addEventListener('input', event => {
    E.camera.radius = Number(event.target.value);
});

$('cameraSensitivity').addEventListener('input', event => {
    E.camera.angularSensibilityX = 1200 / Number(event.target.value);
    E.camera.angularSensibilityY = E.camera.angularSensibilityX;
});

$('qualityInput').addEventListener('change', () => {
    E.settings.apply();
});

$('importSaveInput').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            localStorage.setItem(
                'etheria-v1-browser-save',
                JSON.stringify(data)
            );

            if (E.save.load()) {
                E.ui.toast('Save backup imported.');
            }

        } catch {
            E.ui.toast('That save file is not valid.');
        }
    };

    reader.readAsText(file);
});

window.addEventListener('keydown', event => {
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'Escape' && S.started) {
        if (!$('planningScreen').classList.contains('hidden')) {
            E.game.wasPaused = true;
            E.game.closePlanning();
        } else if (!$('inventoryScreen').classList.contains('hidden')) {
            $('inventoryScreen').classList.add('hidden');
            S.paused = inventoryFromPause;

            if (inventoryFromPause) {
                $('pauseScreen').classList.remove('hidden');
            }

        } else if (!$('settingsScreen').classList.contains('hidden')) {
            $('settingsScreen').classList.add('hidden');
            S.paused = settingsFromPause;

            if (settingsFromPause) {
                $('pauseScreen').classList.remove('hidden');
            }

        } else if (!$('commandScreen').classList.contains('hidden')) {
            $('commandScreen').classList.add('hidden');
        } else if (!$('pauseScreen').classList.contains('hidden')) {
            E.game.resume();
        } else {
            E.game.pause();
        }

        return;
    }

    if (
        event.code === 'KeyP' &&
        S.started &&
        S.paused &&
        !$('pauseScreen').classList.contains('hidden')
    ) {
        E.game.wasPaused = true;
        E.game.planning();
        return;
    }

    if (!S.started || S.paused) return;

    keys[
        event.code === 'KeyW' ? 'W' :
        event.code === 'KeyA' ? 'A' :
        event.code === 'KeyS' ? 'S' :
        event.code === 'KeyD' ? 'D' :
        event.code
    ] = true;

    if (!event.repeat) {
        if (event.code === 'Space') E.combat.attack();
        if (event.code === 'KeyE') interactWith();
        if (event.code === 'Digit1') E.combat.cast('bolt');
        if (event.code === 'KeyQ') E.combat.cast('heal');
        if (event.code === 'Digit2') E.combat.cast('nova');
        if (event.code === 'Tab') E.targeting.cycle();
    }
});

window.addEventListener('keyup', event => {
    delete keys[
        event.code === 'KeyW' ? 'W' :
        event.code === 'KeyA' ? 'A' :
        event.code === 'KeyS' ? 'S' :
        event.code === 'KeyD' ? 'D' :
        event.code
    ];
});

window.addEventListener('blur', () => {
    Object.keys(keys).forEach(key => delete keys[key]);
});

$('worldCanvas').addEventListener('contextmenu', event => {
    event.preventDefault();
});

$('worldCanvas').addEventListener('pointerdown', event => {
    if (!S.started || S.paused) return;

    if (event.button === 0) {
        E.combat.cast(S.defaultSpell);
    }

    if (event.button === 2) {
        $('commandScreen').classList.remove('hidden');
    }
});

E.ui.update();
$('continueAdventure').disabled = !E.save.read();

E.world.setZone('base');
E.player.hero.root.setEnabled(false);
E.team.members.forEach(c => c.model.root.setEnabled(false));

})(window.Etheria = window.Etheria || {});
