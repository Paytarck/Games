/* game.js - Tank Battle with Safe Zones, Aliens, Territory & Balanced Sudden Death */
(function () {
    'use strict';

    // ============================================================
    //  CONFIGURATION
    // ============================================================
    const CONFIG = {
        TANK_SIZE: 38,
        TANK_SPEED: 3.2,
        BULLET_SPEED: 8,
        BULLET_RADIUS: 4,
        MAX_HITS: 4,
        CANVAS_W: 1200,
        CANVAS_H: 700,
        RELOAD_TIME: 14,
        BULLET_LIFE: 120,
        TANK_ROTATION_SPEED: 0.08,
        MOBILE_TURRET_SPEED: 0.035,   // auto anti-clockwise gun spin (rad/frame) on mobile
        MOBILE_AIM_FREEZE: 40,        // frames the gun stays locked after a shot on mobile
        MUD_SLOW_FACTOR: 0.4,
        MUD_STOP_CHANCE: 0.5,
        LAVA_DAMAGE_INTERVAL: 40,
        BROKEN_FLOOR_TRIGGER_INTERVAL: 90,
        BROKEN_FLOOR_WARN_DURATION: 60,
        GIANT_TANK_MIN_DELAY: 600,
        GIANT_TANK_MAX_DELAY: 1200,
        GIANT_TANK_SPEED: 1.6,
        GIANT_TANK_DANGER_RADIUS: 85,
        POWERUP_DURATION: 720,
        SHIELD_HITS: 3,
        HEALTH_POWERUP_AMOUNT: 2,
        LARGE_MISSILE_SIZE: 3.5,
        LARGE_MISSILE_DAMAGE: 2,
        POWERUP_TYPES: ['shield', 'missile3', 'missile8', 'largeMissile', 'health'],

        TIME_OPTIONS: [30, 60, 120, 180, 240, 420],
        SUDDEN_DEATH_THRESHOLD: 0.3,
        SUDDEN_DEATH_DAMAGE_INTERVAL: 300,
        SUDDEN_DEATH_SPEED_FACTOR: 0.65,
        SUDDEN_DEATH_HAZARD_INTERVAL: 120,
        SUDDEN_DEATH_WARNING_TICK: 90,

        TEAM_COLORS: [
            { name: 'Blue Team', color: '#2980b9', light: '#3498db', dark: '#1a4f7a' },
            { name: 'Red Team',  color: '#c0392b', light: '#e74c3c', dark: '#7a1f15' },
        ],

        FLAG_RADIUS: 14,
        FLAG_BASE_SIZE: 130,
        FLAG_TEAM_BASE_W: 200,
        BASE_THREAT_RANGE: 160,     // enemies this close to a base (or inside it) can shoot into it
        FLAG_TEAM_BASE_H: 280,
        FLAG_CAPTURE_RADIUS: 22,
        RESPAWN_TIME: 180,
        CTF_PICKUP_COOLDOWN: 60,

        ALIEN_SPAWN_MIN: 300,
        ALIEN_SPAWN_MAX: 600,
        ALIEN_SPEED: 1.4,
        ALIEN_SIZE: 30,
        ALIEN_HP: 2,
        ALIEN_CAPTURE_RADIUS: 30,
        ALIEN_TARGET_SWITCH_TIME: 180,

        TERRITORY_GAME_TIME: 85,
        TERRITORY_CAPTURE_TIME: 90,
        TERRITORY_POINT_RADIUS: 48,
    };

    const STORAGE_KEYS = {
        CONFIGS: 'tankBattle_playerConfigs',
        PLAYER_COUNT: 'tankBattle_playerCount',
        LAST_WINNER: 'tankBattle_lastWinner',
        TIME_MODE: 'tankBattle_timeMode',
        TIME_DURATION: 'tankBattle_timeDuration',
        SUDDEN_DEATH: 'tankBattle_suddenDeath',
        TEAM_MODE: 'tankBattle_teamMode',
        TEAM_ASSIGNMENTS: 'tankBattle_teamAssignments',
        CTF_MODE: 'tankBattle_ctfMode',
        MAP_SELECTION: 'tankBattle_mapSelection',
        RANDOM_MAPS: 'tankBattle_randomMaps',
        GIANT_TANK_ENABLED: 'tankBattle_giantTankEnabled',
    };

    const DEFAULT_NAMES = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
    const COLOR_PALETTE = [
        { name: 'Crimson',    color: '#c0392b', light: '#e74c3c', dark: '#7a1f15' },
        { name: 'Ocean',      color: '#2980b9', light: '#3498db', dark: '#1a4f7a' },
        { name: 'Forest',     color: '#27ae60', light: '#2ecc71', dark: '#1a5c34' },
        { name: 'Gold',       color: '#f39c12', light: '#f1c40f', dark: '#a06008' },
        { name: 'Violet',     color: '#8e44ad', light: '#9b59b6', dark: '#4a1f5c' },
        { name: 'Cyan',       color: '#17a2b8', light: '#22d3ee', dark: '#0a5a66' },
        { name: 'Rose',       color: '#e84393', light: '#fd79a8', dark: '#8a1e5a' },
        { name: 'Slate',      color: '#576574', light: '#8395a7', dark: '#2c3a47' },
        { name: 'Coral',      color: '#e17055', light: '#fab1a0', dark: '#8a3520' },
        { name: 'Mint',       color: '#00b894', light: '#55efc4', dark: '#00695c' },
    ];

    const ACTIONS = [
        { key: 'up',      label: 'Move Up' },
        { key: 'down',    label: 'Move Down' },
        { key: 'left',    label: 'Move Left' },
        { key: 'right',   label: 'Move Right' },
        { key: 'shoot',   label: 'Shoot' },
        { key: 'rotateL', label: 'Turret ◀' },
        { key: 'rotateR', label: 'Turret ▶' },
    ];

    // ============================================================
    //  MAP DEFINITIONS
    // ============================================================
    const MAPS = [
        { name: 'Open Field', desc: 'Balanced arena with scattered crates', theme: 'field',
          obstacles: [
              { x: 340, y: 160, w: 75, h: 65 }, { x: 720, y: 130, w: 60, h: 80 },
              { x: 230, y: 430, w: 70, h: 55 }, { x: 830, y: 450, w: 75, h: 70 },
              { x: 520, y: 300, w: 60, h: 60 }, { x: 140, y: 250, w: 55, h: 75 },
              { x: 950, y: 270, w: 65, h: 55 }, { x: 430, y: 540, w: 75, h: 50 },
              { x: 660, y: 560, w: 55, h: 65 }, { x: 540, y: 90, w: 70, h: 50 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Fortress', desc: 'Central stronghold with four corner covers', theme: 'field',
          obstacles: [
              { x: 520, y: 270, w: 160, h: 160 },
              { x: 140, y: 120, w: 80, h: 80 }, { x: 980, y: 120, w: 80, h: 80 },
              { x: 140, y: 500, w: 80, h: 80 }, { x: 980, y: 500, w: 80, h: 80 },
              { x: 480, y: 60, w: 60, h: 60 }, { x: 480, y: 580, w: 60, h: 60 },
              { x: 60, y: 300, w: 60, h: 60 }, { x: 1080, y: 300, w: 60, h: 60 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Maze Runner', desc: 'Narrow corridors and hidden paths', theme: 'field',
          obstacles: [
              { x: 200, y: 100, w: 40, h: 200 }, { x: 200, y: 400, w: 40, h: 200 },
              { x: 400, y: 200, w: 40, h: 300 }, { x: 600, y: 100, w: 40, h: 200 },
              { x: 600, y: 400, w: 40, h: 200 }, { x: 800, y: 200, w: 40, h: 300 },
              { x: 1000, y: 100, w: 40, h: 200 }, { x: 1000, y: 400, w: 40, h: 200 },
              { x: 300, y: 320, w: 100, h: 40 }, { x: 700, y: 320, w: 100, h: 40 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Pillars', desc: 'Classic columns for tactical cover', theme: 'field',
          obstacles: [
              { x: 200, y: 150, w: 55, h: 55 }, { x: 400, y: 150, w: 55, h: 55 },
              { x: 600, y: 150, w: 55, h: 55 }, { x: 800, y: 150, w: 55, h: 55 },
              { x: 1000, y: 150, w: 55, h: 55 }, { x: 200, y: 350, w: 55, h: 55 },
              { x: 600, y: 350, w: 55, h: 55 }, { x: 1000, y: 350, w: 55, h: 55 },
              { x: 200, y: 550, w: 55, h: 55 }, { x: 400, y: 550, w: 55, h: 55 },
              { x: 600, y: 550, w: 55, h: 55 }, { x: 800, y: 550, w: 55, h: 55 },
              { x: 1000, y: 550, w: 55, h: 55 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Crossroads', desc: 'Diagonal cover and central crossroads', theme: 'field',
          obstacles: [
              { x: 100, y: 100, w: 100, h: 100 }, { x: 1000, y: 100, w: 100, h: 100 },
              { x: 100, y: 500, w: 100, h: 100 }, { x: 1000, y: 500, w: 100, h: 100 },
              { x: 500, y: 200, w: 200, h: 60 }, { x: 500, y: 440, w: 200, h: 60 },
              { x: 350, y: 300, w: 60, h: 100 }, { x: 790, y: 300, w: 60, h: 100 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Twin Peaks', desc: 'Two large fortifications dominate the field', theme: 'field',
          obstacles: [
              { x: 250, y: 200, w: 150, h: 300 }, { x: 800, y: 200, w: 150, h: 300 },
              { x: 550, y: 80, w: 100, h: 60 }, { x: 550, y: 560, w: 100, h: 60 },
              { x: 550, y: 320, w: 100, h: 60 },
          ], mud: [], lava: [], brokenFloor: false },
        { name: 'Mud Swamp', desc: '⚠ Deep mud slows and stops your tank!', theme: 'mud',
          obstacles: [
              { x: 150, y: 100, w: 70, h: 70 }, { x: 980, y: 100, w: 70, h: 70 },
              { x: 150, y: 530, w: 70, h: 70 }, { x: 980, y: 530, w: 70, h: 70 },
              { x: 530, y: 80, w: 60, h: 60 }, { x: 610, y: 560, w: 60, h: 60 },
          ], mud: [
              { x: 300, y: 200, w: 200, h: 150, deep: false },
              { x: 700, y: 350, w: 200, h: 150, deep: false },
              { x: 450, y: 500, w: 250, h: 120, deep: false },
              { x: 500, y: 300, w: 200, h: 150, deep: true },
              { x: 250, y: 400, w: 120, h: 100, deep: true },
              { x: 830, y: 180, w: 120, h: 100, deep: true },
          ], lava: [], brokenFloor: false },
        { name: 'Lava Fields', desc: '🔥 Step on lava and your tank burns!', theme: 'lava',
          obstacles: [
              { x: 200, y: 100, w: 70, h: 70 }, { x: 930, y: 100, w: 70, h: 70 },
              { x: 200, y: 530, w: 70, h: 70 }, { x: 930, y: 530, w: 70, h: 70 },
              { x: 540, y: 320, w: 120, h: 80 },
          ], mud: [], brokenFloor: false,
          lava: [
              { x: 380, y: 180, w: 140, h: 100 }, { x: 680, y: 180, w: 140, h: 100 },
              { x: 380, y: 420, w: 140, h: 100 }, { x: 680, y: 420, w: 140, h: 100 },
              { x: 540, y: 100, w: 120, h: 70 }, { x: 540, y: 530, w: 120, h: 70 },
              { x: 100, y: 320, w: 100, h: 60 }, { x: 1000, y: 320, w: 100, h: 60 },
          ] },
        { name: 'Broken Floor', desc: '⚠ The floor crumbles — fall and you are OUT!', theme: 'broken',
          obstacles: [
              { x: 250, y: 180, w: 60, h: 60 }, { x: 890, y: 180, w: 60, h: 60 },
              { x: 250, y: 460, w: 60, h: 60 }, { x: 890, y: 460, w: 60, h: 60 },
          ], mud: [], lava: [], brokenFloor: true },
        { name: 'Alien Invasion', desc: '👽 Aliens abduct tanks! Destroy them all!', theme: 'alien',
          obstacles: [
              { x: 200, y: 150, w: 70, h: 70 }, { x: 930, y: 150, w: 70, h: 70 },
              { x: 200, y: 480, w: 70, h: 70 }, { x: 930, y: 480, w: 70, h: 70 },
              { x: 540, y: 200, w: 120, h: 60 }, { x: 540, y: 440, w: 120, h: 60 },
              { x: 100, y: 320, w: 90, h: 60 }, { x: 1010, y: 320, w: 90, h: 60 },
          ], mud: [], lava: [], brokenFloor: false, alienMap: true },
        { name: 'Territory War', desc: '🚩 Hold all 5 flag rings! Enemies inside a ring CONTEST it', theme: 'territory',
          obstacles: [
              // centre ring cover (kept well clear of the ring)
              { x: 440, y: 225, w: 60, h: 60 }, { x: 700, y: 225, w: 60, h: 60 },
              { x: 440, y: 415, w: 60, h: 60 }, { x: 700, y: 415, w: 60, h: 60 },
              // side rings: flanking walls
              { x: 350, y: 225, w: 50, h: 80 }, { x: 350, y: 395, w: 50, h: 80 },
              { x: 800, y: 225, w: 50, h: 80 }, { x: 800, y: 395, w: 50, h: 80 },
              // top / bottom rings: shoulder cover
              { x: 420, y: 150, w: 80, h: 40 }, { x: 700, y: 150, w: 80, h: 40 },
              { x: 420, y: 510, w: 80, h: 40 }, { x: 700, y: 510, w: 80, h: 40 },
          ], mud: [], lava: [], brokenFloor: false, territoryMap: true },
    ];

    // ============================================================
    //  DOM REFERENCES
    // ============================================================
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const winModal = document.getElementById('winModal');
    const playerSelectModal = document.getElementById('playerSelectModal');
    const settingsModal = document.getElementById('settingsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const controlsPanel = document.getElementById('controlsPanel');
    const settingsTabs = document.getElementById('settingsTabs');
    const settingsBody = document.getElementById('settingsBody');
    const settingsError = document.getElementById('settingsError');
    const hudElements = [
        document.getElementById('hudP0'),
        document.getElementById('hudP1'),
        document.getElementById('hudP2'),
        document.getElementById('hudP3'),
    ];

    // ============================================================
    //  GAME STATE
    // ============================================================
    let players = [];
    let bullets = [];
    let missiles = [];
    let particles = [];
    let tracks = [];
    let obstacles = [];
    let mudZones = [];
    let lavaZones = [];
    let explosions = [];
    let mudSplashes = [];
    let lavaBubbles = [];
    let currentMap = null;
    let currentMapIndex = 0;
    let gameActive = false;
    let gamePaused = false;
    let winnerIndex = -1;
    let playerCount = 2;
    let frameCount = 0;
    let keysPressed = {};
    let screenShake = 0;
    let playerConfigs = [];
    let lastWinnerName = null;
    let settingsActiveTab = 0;
    let pendingConfigs = null;
    let listeningAction = null;

    // Mobile / touch mode: each player gets a MOVE and a SHOOT button.
    // The gun auto-rotates anti-clockwise; SHOOT fires and freezes it briefly.
    // Re-checked on every resize / rotation, so shrinking a desktop browser window
    // (or DevTools device mode) switches to the touch layout too.
    //   ?mobile=1 forces touch layout, ?mobile=0 forces desktop layout.
    function detectMobileMode() {
        try {
            const q = new URLSearchParams(location.search).get('mobile');
            if (q === '1') return true;
            if (q === '0') return false;
            const touchDevice = window.matchMedia('(pointer: coarse)').matches &&
                                (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
            const smallScreen = window.matchMedia(
                '(max-width: 900px), (max-height: 500px) and (max-width: 1000px)').matches;
            return touchDevice || smallScreen;
        } catch (e) { return false; }
    }
    let mobileMode = detectMobileMode();
    // Portrait phones: the arena is rotated 90° so it fills the tall screen (controls are remapped to match)
    const isPortraitNow = () => window.innerHeight > window.innerWidth;
    let rotateView = mobileMode && isPortraitNow();
    let touchStick = [null, null, null, null];   // joystick direction per player: {x, y} unit vector or null
    // ---- Custom touch-control layout (saved per orientation in localStorage) ----
    const LAYOUT_KEY = 'tankBattleControlLayout';
    const clampScale = (v) => Math.min(1.5, Math.max(0.6, parseFloat(v) || 1));
    function loadControlLayout() {
        try {
            const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
            if (v && typeof v === 'object') {
                return { scale: clampScale(v.scale), landscape: v.landscape || {}, portrait: v.portrait || {} };
            }
        } catch (e) {}
        return { scale: 1, landscape: {}, portrait: {} };
    }
    let controlLayout = loadControlLayout();
    let layoutEditMode = false;
    function saveControlLayout() {
        try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(controlLayout)); } catch (e) {}
    }
    let touchAim = [null, null, null, null];     // angle (rad) while a player drags their aim pad, else null
    // Per-player choice: 'manual' = you aim the gun yourself, 'auto' = gun spins on its own
    const mobileAimMode = (function () {
        const def = ['manual', 'manual', 'manual', 'manual'];
        try {
            const v = JSON.parse(localStorage.getItem('tankBattleMobileAim') || 'null');
            if (Array.isArray(v)) return def.map((d, i) => (v[i] === 'auto' ? 'auto' : d));
        } catch (e) {}
        return def;
    })();
    function saveMobileAimMode() {
        try { localStorage.setItem('tankBattleMobileAim', JSON.stringify(mobileAimMode)); } catch (e) {}
    }
    let settingsPausedGame = false;   // true when opening Settings paused a running game

    let floorTiles = [];
    let brokenFloorActive = false;
    let powerupDrops = [];
    let giantTank = null;
    let giantTankTimer = 0;
    let giantTankNextDelay = 0;
    let giantTankGiftDropped = false;
    let giantTankEnabled = true;

    let timeModeEnabled = false;
    let timeDuration = 60;
    let suddenDeathEnabled = false;
    let timeRemainingFrames = 0;
    let suddenDeathActive = false;
    let suddenDeathDamageTimer = 0;
    let suddenDeathHazardTimer = 0;
    let extraObstacles = [];

    let teamModeEnabled = false;
    let teamAssignments = [0, 0, 1, 1];
    let pendingTeamAssignments = [0, 0, 1, 1];

    let ctfModeEnabled = false;
    let ctfBases = [];
    let ctfFlags = [];
    let ctfCaptured = [];

    let selectedMapIndex = 0;
    let randomMapsEnabled = true;

    let alienMapActive = false;
    let aliens = [];
    let alienSpawnTimer = 0;
    let alienNextSpawn = 0;

    let territoryMapActive = false;
    let territories = [];
    let territoryScores = [0, 0, 0, 0];
    let territoryPlayerArea = [];

    // ============================================================
    //  STORAGE
    // ============================================================
    function loadFromStorage() {
        try {
            const cfgStr = localStorage.getItem(STORAGE_KEYS.CONFIGS);
            if (cfgStr) {
                const parsed = JSON.parse(cfgStr);
                if (Array.isArray(parsed) && parsed.length >= 2) {
                    playerConfigs = parsed;
                    for (const cfg of playerConfigs) {
                        if (!cfg.keys || !cfg.name || cfg.colorIndex === undefined) {
                            playerConfigs = getDefaultConfigs();
                            break;
                        }
                    }
                } else playerConfigs = getDefaultConfigs();
            } else playerConfigs = getDefaultConfigs();

            const pcStr = localStorage.getItem(STORAGE_KEYS.PLAYER_COUNT);
            if (pcStr) {
                const pc = parseInt(pcStr);
                if ([2, 3, 4].includes(pc)) playerCount = pc;
            }
            const lwStr = localStorage.getItem(STORAGE_KEYS.LAST_WINNER);
            if (lwStr) lastWinnerName = lwStr;

            if (localStorage.getItem(STORAGE_KEYS.TIME_MODE) === 'true') timeModeEnabled = true;

            const tdStr = localStorage.getItem(STORAGE_KEYS.TIME_DURATION);
            if (tdStr) {
                const td = parseInt(tdStr);
                if (CONFIG.TIME_OPTIONS.includes(td)) timeDuration = td;
            }

            if (localStorage.getItem(STORAGE_KEYS.SUDDEN_DEATH) === 'true') suddenDeathEnabled = true;
            if (localStorage.getItem(STORAGE_KEYS.TEAM_MODE) === 'true') teamModeEnabled = true;

            const taStr = localStorage.getItem(STORAGE_KEYS.TEAM_ASSIGNMENTS);
            if (taStr) {
                const parsed = JSON.parse(taStr);
                if (Array.isArray(parsed) && parsed.length === 4) {
                    teamAssignments = parsed;
                    pendingTeamAssignments = [...parsed];
                }
            }

            if (localStorage.getItem(STORAGE_KEYS.CTF_MODE) === 'true') ctfModeEnabled = true;

            const msStr = localStorage.getItem(STORAGE_KEYS.MAP_SELECTION);
            if (msStr) {
                const ms = parseInt(msStr);
                if (ms >= 0 && ms < MAPS.length) selectedMapIndex = ms;
            }
            const rmStr = localStorage.getItem(STORAGE_KEYS.RANDOM_MAPS);
            if (rmStr !== null) randomMapsEnabled = (rmStr === 'true');

            const gtStr = localStorage.getItem(STORAGE_KEYS.GIANT_TANK_ENABLED);
            if (gtStr !== null) giantTankEnabled = (gtStr === 'true');
        } catch (e) {
            playerConfigs = getDefaultConfigs();
        }
    }

    function saveConfigsToStorage() {
        try { localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(playerConfigs)); } catch (e) {}
    }
    function savePlayerCountToStorage() {
        try { localStorage.setItem(STORAGE_KEYS.PLAYER_COUNT, String(playerCount)); } catch (e) {}
    }
    function saveLastWinnerToStorage(name) {
        try {
            lastWinnerName = name;
            if (name) localStorage.setItem(STORAGE_KEYS.LAST_WINNER, name);
            else localStorage.removeItem(STORAGE_KEYS.LAST_WINNER);
        } catch (e) {}
    }
    function saveTimeSettingsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.TIME_MODE, String(timeModeEnabled));
            localStorage.setItem(STORAGE_KEYS.TIME_DURATION, String(timeDuration));
            localStorage.setItem(STORAGE_KEYS.SUDDEN_DEATH, String(suddenDeathEnabled));
        } catch (e) {}
    }
    function saveTeamSettingsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.TEAM_MODE, String(teamModeEnabled));
            localStorage.setItem(STORAGE_KEYS.TEAM_ASSIGNMENTS, JSON.stringify(teamAssignments));
        } catch (e) {}
    }
    function saveCtfSettingsToStorage() {
        try { localStorage.setItem(STORAGE_KEYS.CTF_MODE, String(ctfModeEnabled)); } catch (e) {}
    }
    function saveMapSettingsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.MAP_SELECTION, String(selectedMapIndex));
            localStorage.setItem(STORAGE_KEYS.RANDOM_MAPS, String(randomMapsEnabled));
        } catch (e) {}
    }
    function saveGiantTankSettingToStorage() {
        try { localStorage.setItem(STORAGE_KEYS.GIANT_TANK_ENABLED, String(giantTankEnabled)); } catch (e) {}
    }

    function getDefaultConfigs() {
        return [
            { name: DEFAULT_NAMES[0], colorIndex: 0, keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', shoot: 'KeyF', rotateL: 'KeyQ', rotateR: 'KeyE' } },
            { name: DEFAULT_NAMES[1], colorIndex: 1, keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Slash', rotateL: 'Comma', rotateR: 'Period' } },
            { name: DEFAULT_NAMES[2], colorIndex: 2, keys: { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', shoot: 'KeyO', rotateL: 'KeyU', rotateR: 'KeyP' } },
            { name: DEFAULT_NAMES[3], colorIndex: 3, keys: { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', shoot: 'Numpad0', rotateL: 'Numpad7', rotateR: 'Numpad9' } },
        ];
    }

    function deepCloneConfigs(configs) { return JSON.parse(JSON.stringify(configs)); }

    // ============================================================
    //  AUDIO ENGINE
    // ============================================================
    let audioCtx = null;
    let masterGain = null;

    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = audioCtx.createGain();
                masterGain.gain.value = 0.9;
                masterGain.connect(audioCtx.destination);
            } catch (e) {}
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type, opts) {
        if (ONLINE.active && ONLINE.role === 'host') netRecordSound(type);
        if (!audioCtx) return;
        opts = opts || {};
        try {
            const now = audioCtx.currentTime;
            const gain = audioCtx.createGain();
            gain.connect(masterGain || audioCtx.destination);

            switch (type) {
                case 'shoot': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(240, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.14);
                    gain.gain.setValueAtTime(0.14, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.18);
                    const click = audioCtx.createOscillator();
                    click.type = 'sine';
                    click.frequency.setValueAtTime(1200, now);
                    const cg = audioCtx.createGain();
                    cg.gain.setValueAtTime(0.05, now);
                    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                    click.connect(cg); cg.connect(masterGain || audioCtx.destination);
                    click.start(now); click.stop(now + 0.03);
                    break;
                }
                case 'missile': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(500, now);
                    osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.35);
                    break;
                }
                case 'bigMissile': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
                    gain.gain.setValueAtTime(0.28, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.6);
                    break;
                }
                case 'hit': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
                    gain.gain.setValueAtTime(0.22, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.25);
                    const clang = audioCtx.createOscillator();
                    clang.type = 'triangle';
                    clang.frequency.setValueAtTime(1800, now);
                    clang.frequency.exponentialRampToValueAtTime(600, now + 0.08);
                    const cg = audioCtx.createGain();
                    cg.gain.setValueAtTime(0.08, now);
                    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    clang.connect(cg); cg.connect(masterGain || audioCtx.destination);
                    clang.start(now); clang.stop(now + 0.1);
                    break;
                }
                case 'explosion': {
                    const bufferSize = audioCtx.sampleRate * 0.5;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
                    const noise = audioCtx.createBufferSource();
                    noise.buffer = buffer;
                    const ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.35, now);
                    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    noise.connect(ng); ng.connect(masterGain || audioCtx.destination);
                    noise.start(now);
                    const sub = audioCtx.createOscillator();
                    sub.type = 'sine';
                    sub.frequency.setValueAtTime(80, now);
                    sub.frequency.exponentialRampToValueAtTime(25, now + 0.5);
                    const sg = audioCtx.createGain();
                    sg.gain.setValueAtTime(0.4, now);
                    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    sub.connect(sg); sg.connect(masterGain || audioCtx.destination);
                    sub.start(now); sub.stop(now + 0.5);
                    break;
                }
                case 'win': {
                    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
                    notes.forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.13);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0, now + i * 0.13);
                        g.gain.linearRampToValueAtTime(0.22, now + i * 0.13 + 0.03);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.5);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.13); osc.stop(now + i * 0.13 + 0.55);
                    });
                    const shimmer = audioCtx.createOscillator();
                    shimmer.type = 'sine';
                    shimmer.frequency.setValueAtTime(2000, now + 0.6);
                    shimmer.frequency.linearRampToValueAtTime(3000, now + 1.2);
                    const shg = audioCtx.createGain();
                    shg.gain.setValueAtTime(0, now + 0.6);
                    shg.gain.linearRampToValueAtTime(0.08, now + 0.7);
                    shg.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
                    shimmer.connect(shg); shg.connect(masterGain || audioCtx.destination);
                    shimmer.start(now + 0.6); shimmer.stop(now + 1.5);
                    break;
                }
                case 'teamWin': {
                    const notes = [392, 523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'square';
                        osc.frequency.setValueAtTime(freq, now + i * 0.15);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0, now + i * 0.15);
                        g.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.03);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.55);
                    });
                    break;
                }
                case 'draw': {
                    [440, 440].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.3);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.15, now + i * 0.3);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.25);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.3); osc.stop(now + i * 0.3 + 0.3);
                    });
                    break;
                }
                case 'engine': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(55 + rand(-5, 5), now);
                    osc.frequency.linearRampToValueAtTime(75, now + 0.08);
                    const g = audioCtx.createGain();
                    g.gain.setValueAtTime(0.03, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.connect(g); g.connect(masterGain || audioCtx.destination);
                    osc.start(now); osc.stop(now + 0.1);
                    break;
                }
                case 'mud': {
                    const bufferSize = audioCtx.sampleRate * 0.25;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3) * 0.6;
                    const noise = audioCtx.createBufferSource();
                    noise.buffer = buffer;
                    const ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.15, now);
                    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    noise.connect(ng); ng.connect(masterGain || audioCtx.destination);
                    noise.start(now);
                    break;
                }
                case 'lava': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(90, now);
                    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.3);
                    const bub = audioCtx.createOscillator();
                    bub.type = 'sine';
                    bub.frequency.setValueAtTime(200 + rand(-50, 50), now + 0.1);
                    bub.frequency.exponentialRampToValueAtTime(80, now + 0.2);
                    const bg = audioCtx.createGain();
                    bg.gain.setValueAtTime(0.06, now + 0.1);
                    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                    bub.connect(bg); bg.connect(masterGain || audioCtx.destination);
                    bub.start(now + 0.1); bub.stop(now + 0.25);
                    break;
                }
                case 'crack': {
                    const bufferSize = audioCtx.sampleRate * 0.3;
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2) * (1 + Math.sin(i * 0.05) * 0.5);
                    const noise = audioCtx.createBufferSource();
                    noise.buffer = buffer;
                    const ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.22, now);
                    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    noise.connect(ng); ng.connect(masterGain || audioCtx.destination);
                    noise.start(now);
                    const snap = audioCtx.createOscillator();
                    snap.type = 'square';
                    snap.frequency.setValueAtTime(400, now);
                    snap.frequency.exponentialRampToValueAtTime(80, now + 0.05);
                    const sg = audioCtx.createGain();
                    sg.gain.setValueAtTime(0.1, now);
                    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
                    snap.connect(sg); sg.connect(masterGain || audioCtx.destination);
                    snap.start(now); snap.stop(now + 0.07);
                    break;
                }
                case 'giant': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(45, now);
                    osc.frequency.linearRampToValueAtTime(85, now + 1.0);
                    osc.frequency.linearRampToValueAtTime(40, now + 2.2);
                    const g = audioCtx.createGain();
                    g.gain.setValueAtTime(0.05, now);
                    g.gain.linearRampToValueAtTime(0.18, now + 0.6);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
                    osc.connect(g); g.connect(masterGain || audioCtx.destination);
                    osc.start(now); osc.stop(now + 2.2);
                    const sub = audioCtx.createOscillator();
                    sub.type = 'triangle';
                    sub.frequency.setValueAtTime(28, now);
                    sub.frequency.linearRampToValueAtTime(20, now + 2.0);
                    const sg = audioCtx.createGain();
                    sg.gain.setValueAtTime(0.15, now);
                    sg.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
                    sub.connect(sg); sg.connect(masterGain || audioCtx.destination);
                    sub.start(now); sub.stop(now + 2.2);
                    break;
                }
                case 'powerup': {
                    const notes = [659.25, 783.99, 1046.50, 1318.51];
                    notes.forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.07);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0, now + i * 0.07);
                        g.gain.linearRampToValueAtTime(0.18, now + i * 0.07 + 0.02);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.3);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.35);
                    });
                    break;
                }
                case 'warning': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(330, now + 0.15);
                    osc.frequency.setValueAtTime(440, now + 0.3);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.45);
                    break;
                }
                case 'suddenDeath': {
                    [80, 120, 160, 200].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(freq, now + i * 0.05);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.08, now + i * 0.05);
                        g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.05); osc.stop(now + 1.8);
                    });
                    break;
                }
                case 'tick': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.05);
                    break;
                }
                case 'flagPickup': {
                    [523.25, 783.99, 1046.50].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.06);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.2, now + i * 0.06);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.2);
                    });
                    break;
                }
                case 'flagCapture': {
                    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.09);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0, now + i * 0.09);
                        g.gain.linearRampToValueAtTime(0.22, now + i * 0.09 + 0.02);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.4);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.45);
                    });
                    break;
                }
                case 'flagLost': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.4);
                    break;
                }
                case 'respawn': {
                    [392, 587.33, 880].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + i * 0.08);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.15, now + i * 0.08);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.4);
                    });
                    break;
                }
                case 'pause': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.15);
                    break;
                }
                case 'unpause': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.15);
                    break;
                }
                case 'click': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.08);
                    break;
                }
                case 'toggle': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.08);
                    break;
                }
                case 'mapSelect': {
                    [880, 1174.66].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + i * 0.06);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.12, now + i * 0.06);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.06); osc.stop(now + i * 0.06 + 0.2);
                    });
                    break;
                }
                case 'shieldHit': {
                    [1200, 1800].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + i * 0.04);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.15, now + i * 0.04);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.04); osc.stop(now + i * 0.04 + 0.25);
                    });
                    break;
                }
                case 'alienAppear': {
                    [300, 450, 600].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + i * 0.05);
                        osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 1.5);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0, now + i * 0.05);
                        g.gain.linearRampToValueAtTime(0.05, now + i * 0.05 + 0.2);
                        g.gain.linearRampToValueAtTime(0, now + 1.5);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.05); osc.stop(now + 1.6);
                    });
                    break;
                }
                case 'alienBeam': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
                    const g = audioCtx.createGain();
                    g.gain.setValueAtTime(0.15, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.connect(g); g.connect(masterGain || audioCtx.destination);
                    osc.start(now); osc.stop(now + 0.4);
                    break;
                }
                case 'alienDeath': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
                    const g = audioCtx.createGain();
                    g.gain.setValueAtTime(0.18, now);
                    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                    osc.connect(g); g.connect(masterGain || audioCtx.destination);
                    osc.start(now); osc.stop(now + 0.5);
                    break;
                }
                case 'capturePoint': {
                    [523.25, 1046.50].forEach((freq, i) => {
                        const osc = audioCtx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.setValueAtTime(freq, now + i * 0.15);
                        const g = audioCtx.createGain();
                        g.gain.setValueAtTime(0.18, now + i * 0.15);
                        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
                        osc.connect(g); g.connect(masterGain || audioCtx.destination);
                        osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.35);
                    });
                    break;
                }
                case 'territoryTick': {
                    const osc = audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(660, now);
                    gain.gain.setValueAtTime(0.05, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain); osc.start(now); osc.stop(now + 0.08);
                    break;
                }
            }
        } catch (e) {}
    }

    // ============================================================
    //  HELPERS
    // ============================================================
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

    function rectCollide(a, b) {
        return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
    }
    function circleRectCollide(cx, cy, r, rect) {
        const nearX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const nearY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        return dist(cx, cy, nearX, nearY) < r;
    }
    function pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
    }
    function circleInCircle(x1, y1, r1, x2, y2, r2) {
        return dist(x1, y1, x2, y2) < r1 + r2;
    }

    function tankInAnySafeBase(tank) {
        if (!ctfModeEnabled) return false;
        const cx = tank.x + CONFIG.TANK_SIZE / 2;
        const cy = tank.y + CONFIG.TANK_SIZE / 2;
        for (const base of ctfBases) {
            if (pointInRect(cx, cy, base)) return base;
        }
        return null;
    }

    // ---- Base protection: a base only shields against shooters who are FAR away ----
    function isNearBase(tank, base, range) {
        const cx = tank.x + CONFIG.TANK_SIZE / 2;
        const cy = tank.y + CONFIG.TANK_SIZE / 2;
        const nx = Math.max(base.x, Math.min(cx, base.x + base.w));
        const ny = Math.max(base.y, Math.min(cy, base.y + base.h));
        return dist(cx, cy, nx, ny) <= range;       // 0 when the tank is inside
    }
    // true when this shooter is inside / close to the base, so their shots go through
    function baseOpenToShooter(base, ownerIdx) {
        const o = players[ownerIdx];
        if (!o || !o.alive) return false;
        return isNearBase(o, base, CONFIG.BASE_THREAT_RANGE);
    }
    function baseBelongsTo(base, p) {
        return base.isTeam ? teamAssignments[p.index] === base.teamId : p.index === base.owner;
    }
    function baseUnderThreat(base) {
        for (const p of players) {
            if (p.alive && !baseBelongsTo(base, p) && isNearBase(p, base, CONFIG.BASE_THREAT_RANGE)) return true;
        }
        return false;
    }

    function tankInMud(tank) {
        const cx = tank.x + CONFIG.TANK_SIZE / 2;
        const cy = tank.y + CONFIG.TANK_SIZE / 2;
        for (const mud of mudZones) if (pointInRect(cx, cy, mud)) return mud;
        return null;
    }
    function tankInLava(tank) {
        const cx = tank.x + CONFIG.TANK_SIZE / 2;
        const cy = tank.y + CONFIG.TANK_SIZE / 2;
        for (const lava of lavaZones) if (pointInRect(cx, cy, lava)) return lava;
        return null;
    }
    function tankOverHole(tank) {
        if (!brokenFloorActive) return false;
        const cx = tank.x + CONFIG.TANK_SIZE / 2;
        const cy = tank.y + CONFIG.TANK_SIZE / 2;
        for (const tile of floorTiles) {
            if (tile.state === 'hole' && pointInRect(cx, cy, tile)) return true;
        }
        return false;
    }
    function tankInGiantDanger(tank) {
        if (!giantTank) return false;
        const tx = tank.x + CONFIG.TANK_SIZE / 2;
        const ty = tank.y + CONFIG.TANK_SIZE / 2;
        return dist(tx, ty, giantTank.x, giantTank.y) < CONFIG.GIANT_TANK_DANGER_RADIUS;
    }
    function isSameTeam(p1, p2) {
        if (!teamModeEnabled) return false;
        return teamAssignments[p1.index] === teamAssignments[p2.index];
    }
    function getTeamColor(teamId) {
        return CONFIG.TEAM_COLORS[teamId] || CONFIG.TEAM_COLORS[0];
    }

    function formatKeyName(code) {
        if (!code) return '—';
        const map = {
            'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
            'Space': 'SPACE', 'Slash': '/', 'Comma': ',', 'Period': '.',
            'Semicolon': ';', 'Quote': "'", 'BracketLeft': '[', 'BracketRight': ']',
            'Backslash': '\\', 'Minus': '-', 'Equal': '=', 'Backquote': '`',
            'Enter': 'ENTER', 'Tab': 'TAB', 'ShiftLeft': 'L-SHIFT', 'ShiftRight': 'R-SHIFT',
            'ControlLeft': 'L-CTRL', 'ControlRight': 'R-CTRL', 'AltLeft': 'L-ALT', 'AltRight': 'R-ALT',
            'Backspace': 'BKSP', 'CapsLock': 'CAPS',
        };
        if (map[code]) return map[code];
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) {
            const n = code.slice(6);
            const nm = { 'Add': '+', 'Subtract': '-', 'Multiply': '*', 'Divide': '/', 'Decimal': '.', 'Enter': 'ENTER' };
            return nm[n] || ('NUM' + n);
        }
        return code.toUpperCase();
    }
    function isModifierKey(code) {
        return ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab', 'Escape'].includes(code);
    }
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function getPowerupInfo(type) {
        switch (type) {
            case 'shield':      return { icon: '🛡️', name: 'Shield', color: '34, 211, 238', duration: CONFIG.POWERUP_DURATION };
            case 'missile3':    return { icon: '🚀', name: '3 Missiles', color: '255, 107, 58', duration: CONFIG.POWERUP_DURATION };
            case 'missile8':    return { icon: '💥', name: '8 Missiles', color: '255, 200, 0', duration: CONFIG.POWERUP_DURATION };
            case 'largeMissile':return { icon: '🎯', name: 'Large Missile', color: '200, 100, 255', duration: CONFIG.POWERUP_DURATION };
            case 'health':      return { icon: '❤️', name: 'Health', color: '255, 80, 80', duration: -1 };
        }
        return { icon: '?', name: 'Unknown', color: '150,150,150', duration: 0 };
    }

    // ============================================================
    //  MAP LOADING
    // ============================================================
    let forcedMapIndex = -1;      // set while restoring a saved game so the same map is loaded
    function pickMap() {
        if (forcedMapIndex >= 0 && forcedMapIndex < MAPS.length) {
            currentMapIndex = forcedMapIndex;
            forcedMapIndex = -1;
            return MAPS[currentMapIndex];
        }
        if (randomMapsEnabled) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * MAPS.length);
            } while (MAPS.length > 1 && newIndex === currentMapIndex);
            currentMapIndex = newIndex;
            return MAPS[newIndex];
        } else {
            currentMapIndex = selectedMapIndex;
            return MAPS[selectedMapIndex];
        }
    }

    function loadMap(map) {
        currentMap = map;
        obstacles = [];
        mudZones = [];
        lavaZones = [];
        floorTiles = [];
        extraObstacles = [];
        aliens = [];
        territories = [];
        alienMapActive = !!map.alienMap;
        territoryMapActive = !!map.territoryMap;
        brokenFloorActive = !!map.brokenFloor;

        for (const o of map.obstacles) {
            const obs = {
                x: o.x + rand(-8, 8), y: o.y + rand(-8, 8),
                w: o.w + rand(-5, 5), h: o.h + rand(-5, 5),
            };
            obs.x = Math.max(40, Math.min(CONFIG.CANVAS_W - obs.w - 40, obs.x));
            obs.y = Math.max(40, Math.min(CONFIG.CANVAS_H - obs.h - 40, obs.y));
            obstacles.push(obs);
        }
        for (const m of map.mud) mudZones.push({ x: m.x, y: m.y, w: m.w, h: m.h, deep: m.deep });
        for (const l of (map.lava || [])) lavaZones.push({ x: l.x, y: l.y, w: l.w, h: l.h, phase: rand(0, Math.PI * 2) });

        if (brokenFloorActive) {
            const tileW = 100, tileH = 100;
            const cols = Math.ceil(CONFIG.CANVAS_W / tileW);
            const rows = Math.ceil(CONFIG.CANVAS_H / tileH);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    floorTiles.push({
                        x: c * tileW, y: r * tileH,
                        w: tileW, h: tileH,
                        state: 'solid', timer: 0,
                    });
                }
            }
        }

        if (territoryMapActive) {
            const R = CONFIG.TERRITORY_POINT_RADIUS;
            const mk = (x, y, r) => ({ x, y, radius: r, owner: -1, progress: 0, capturer: -1, contested: false });
            territories = [
                mk(CONFIG.CANVAS_W / 2, 130, R),
                mk(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, R + 14),     // centre ring is the big prize
                mk(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H - 130, R),
                mk(260, CONFIG.CANVAS_H / 2, R),
                mk(CONFIG.CANVAS_W - 260, CONFIG.CANVAS_H / 2, R),
            ];
            // safety net: no crate may ever sit on (or squeeze) a capture ring
            obstacles = obstacles.filter(o =>
                !territories.some(t => circleRectCollide(t.x, t.y, t.radius + CONFIG.TANK_SIZE / 2 + 10, o)));
        }

        if (alienMapActive) {
            alienSpawnTimer = 0;
            alienNextSpawn = Math.floor(rand(CONFIG.ALIEN_SPAWN_MIN, CONFIG.ALIEN_SPAWN_MAX));
        }
    }

    // ============================================================
    //  CTF BASE CREATION
    // ============================================================
    function createCtfBases(count) {
        ctfBases = [];
        ctfFlags = [];
        ctfCaptured = [];
        for (let i = 0; i < count; i++) ctfCaptured.push([]);

        if (teamModeEnabled) {
            const baseW = CONFIG.FLAG_TEAM_BASE_W;
            const baseH = CONFIG.FLAG_TEAM_BASE_H;
            const baseY = (CONFIG.CANVAS_H - baseH) / 2;

            ctfBases.push({
                teamId: 0,
                x: 0, y: baseY,
                w: baseW, h: baseH,
                entryTop: { x: baseW - 10, y: baseY + 40, w: 10, h: 40 },
                entryBot: { x: baseW - 10, y: baseY + baseH - 80, w: 10, h: 40 },
                isTeam: true,
            });
            ctfBases.push({
                teamId: 1,
                x: CONFIG.CANVAS_W - baseW, y: baseY,
                w: baseW, h: baseH,
                entryTop: { x: CONFIG.CANVAS_W - baseW, y: baseY + 40, w: 10, h: 40 },
                entryBot: { x: CONFIG.CANVAS_W - baseW, y: baseY + baseH - 80, w: 10, h: 40 },
                isTeam: true,
            });

            for (let t = 0; t < 2; t++) {
                const base = ctfBases[t];
                ctfFlags.push({
                    owner: -1,
                    teamOwner: t,
                    x: base.x + base.w / 2,
                    y: base.y + base.h / 2,
                    homeX: base.x + base.w / 2,
                    homeY: base.y + base.h / 2,
                    carrier: null,
                    dropped: false,
                    pickupCooldown: 0,
                    color: getTeamColor(t),
                    teamFlag: true,
                });
            }
        } else {
            const baseSize = CONFIG.FLAG_BASE_SIZE;
            const pad = 15;
            const corners = [
                { x: pad, y: pad },
                { x: CONFIG.CANVAS_W - baseSize - pad, y: pad },
                { x: pad, y: CONFIG.CANVAS_H - baseSize - pad },
                { x: CONFIG.CANVAS_W - baseSize - pad, y: CONFIG.CANVAS_H - baseSize - pad },
            ];

            for (let i = 0; i < count; i++) {
                const c = corners[i];
                const pal = COLOR_PALETTE[playerConfigs[i].colorIndex] || COLOR_PALETTE[i];
                ctfBases.push({
                    owner: i,
                    x: c.x, y: c.y,
                    w: baseSize, h: baseSize,
                    isTeam: false,
                });
                ctfFlags.push({
                    owner: i,
                    teamOwner: null,
                    x: c.x + baseSize / 2,
                    y: c.y + baseSize / 2,
                    homeX: c.x + baseSize / 2,
                    homeY: c.y + baseSize / 2,
                    carrier: null,
                    dropped: false,
                    pickupCooldown: 0,
                    color: { color: pal.color, light: pal.light, dark: pal.dark },
                    teamFlag: false,
                });
            }
        }
    }

    // ============================================================
    //  PLAYER SPAWNING
    // ============================================================
    function spawnPlayers(count) {
        const positions = [
            { x: 80, y: 80 },
            { x: CONFIG.CANVAS_W - CONFIG.TANK_SIZE - 80, y: 80 },
            { x: 80, y: CONFIG.CANVAS_H - CONFIG.TANK_SIZE - 80 },
            { x: CONFIG.CANVAS_W - CONFIG.TANK_SIZE - 80, y: CONFIG.CANVAS_H - CONFIG.TANK_SIZE - 80 },
        ];

        if (ctfModeEnabled) {
            for (let i = 0; i < count; i++) {
                if (teamModeEnabled) {
                    const team = teamAssignments[i];
                    const base = ctfBases[team];
                    positions[i] = {
                        x: base.x + 20 + rand(0, base.w - CONFIG.TANK_SIZE - 40),
                        y: base.y + 20 + rand(0, base.h - CONFIG.TANK_SIZE - 40),
                    };
                } else {
                    const base = ctfBases[i];
                    positions[i] = {
                        x: base.x + base.w / 2 - CONFIG.TANK_SIZE / 2,
                        y: base.y + base.h / 2 - CONFIG.TANK_SIZE / 2,
                    };
                }
            }
        } else if (teamModeEnabled) {
            const team0Players = [];
            const team1Players = [];
            for (let i = 0; i < count; i++) {
                if (teamAssignments[i] === 0) team0Players.push(i);
                else team1Players.push(i);
            }
            const assignSpawn = (list, baseX, baseY, spread) => {
                for (let k = 0; k < list.length; k++) {
                    const idx = list[k];
                    positions[idx] = {
                        x: baseX + (k % 2) * spread,
                        y: baseY + Math.floor(k / 2) * spread,
                    };
                }
            };
            assignSpawn(team0Players, 80, CONFIG.CANVAS_H / 2 - 60, 80);
            assignSpawn(team1Players, CONFIG.CANVAS_W - CONFIG.TANK_SIZE - 80, CONFIG.CANVAS_H / 2 - 60, 80);
        } else if (territoryMapActive) {
            const half = Math.floor(count / 2);
            for (let i = 0; i < count; i++) {
                const isLeft = i < half;
                positions[i] = {
                    x: isLeft ? 80 : CONFIG.CANVAS_W - CONFIG.TANK_SIZE - 80,
                    y: 100 + i * 90,
                };
            }
        }

        const result = [];
        for (let i = 0; i < count; i++) {
            let sx = positions[i].x;
            let sy = positions[i].y;

            let attempts = 0;
            while (attempts < 200) {
                const rect = { x: sx, y: sy, w: CONFIG.TANK_SIZE, h: CONFIG.TANK_SIZE };
                let blocked = false;
                for (const obs of obstacles) if (rectCollide(rect, obs)) { blocked = true; break; }
                if (!blocked) for (const m of mudZones) if (rectCollide(rect, m)) { blocked = true; break; }
                if (!blocked) for (const l of lavaZones) if (rectCollide(rect, l)) { blocked = true; break; }
                if (!blocked) for (const t of floorTiles) if (t.state === 'hole' && rectCollide(rect, t)) { blocked = true; break; }
                if (!blocked) {
                    for (const other of result) {
                        if (rectCollide(rect, { x: other.x, y: other.y, w: CONFIG.TANK_SIZE, h: CONFIG.TANK_SIZE })) {
                            blocked = true; break;
                        }
                    }
                }
                if (!blocked) break;
                sx += rand(-30, 30);
                sy += rand(-30, 30);
                sx = Math.max(20, Math.min(CONFIG.CANVAS_W - CONFIG.TANK_SIZE - 20, sx));
                sy = Math.max(20, Math.min(CONFIG.CANVAS_H - CONFIG.TANK_SIZE - 20, sy));
                attempts++;
            }

            const cfg = playerConfigs[i];
            const pal = COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[i % COLOR_PALETTE.length];

            let color, lightColor, darkColor;
            if (teamModeEnabled) {
                const teamCol = getTeamColor(teamAssignments[i]);
                color = teamCol.color;
                lightColor = teamCol.light;
                darkColor = teamCol.dark;
            } else {
                color = pal.color;
                lightColor = pal.light;
                darkColor = pal.dark;
            }

            result.push({
                index: i,
                x: sx, y: sy,
                bodyAngle: i === 0 ? 0.25 : i === 1 ? Math.PI - 0.25 : i === 2 ? -0.25 : Math.PI + 0.25,
                turretAngle: i === 0 ? 0.25 : i === 1 ? Math.PI - 0.25 : i === 2 ? -0.25 : Math.PI + 0.25,
                hits: 0,
                alive: true,
                reload: 0,
                color: color,
                lightColor: lightColor,
                darkColor: darkColor,
                name: cfg.name,
                keys: cfg.keys,
                moveSoundTimer: 0,
                stuckTimer: 0,
                lavaDamageTimer: 0,
                shield: 0,
                missilePower: null,
                hasPowerup: false,
                team: teamAssignments[i],
                respawnTimer: 0,
                capturedFlags: [],
                beingAbducted: false,
                abductTimer: 0,
                aimLock: 0,
            });
        }
        return result;
    }

    // ============================================================
    //  RESET / START
    // ============================================================
    function resetGame(count) {
        if (isOnlineGuest()) return;
        if (ONLINE.active && ONLINE.role === 'host' && ONLINE.count >= 2) count = ONLINE.count;
        playerCount = count;
        const map = pickMap();
        loadMap(map);

        if (ctfModeEnabled) {
            createCtfBases(count);
        } else {
            ctfBases = [];
            ctfFlags = [];
            ctfCaptured = [];
        }

        players = spawnPlayers(count);
        bullets = [];
        missiles = [];
        particles = [];
        tracks = [];
        explosions = [];
        mudSplashes = [];
        lavaBubbles = [];
        powerupDrops = [];
        giantTank = null;
        giantTankTimer = 0;
        giantTankNextDelay = Math.floor(rand(CONFIG.GIANT_TANK_MIN_DELAY, CONFIG.GIANT_TANK_MAX_DELAY));
        giantTankGiftDropped = false;
        winnerIndex = -1;
        gameActive = true;
        gamePaused = false;
        frameCount = 0;
        screenShake = 0;

        territoryScores = [0, 0, 0, 0];
        territoryPlayerArea = [];

        aliens = [];
        alienSpawnTimer = 0;
        alienNextSpawn = Math.floor(rand(CONFIG.ALIEN_SPAWN_MIN, CONFIG.ALIEN_SPAWN_MAX));

        suddenDeathActive = false;
        suddenDeathDamageTimer = 0;
        suddenDeathHazardTimer = 0;
        extraObstacles = [];

        if (territoryMapActive) {
            timeModeEnabled = true;
            timeDuration = CONFIG.TERRITORY_GAME_TIME;
            suddenDeathEnabled = false;
            timeRemainingFrames = timeDuration * 60;
        } else if (timeModeEnabled) {
            timeRemainingFrames = timeDuration * 60;
        } else {
            timeRemainingFrames = 0;
        }

        winModal.classList.remove('active');
        playerSelectModal.classList.remove('active');
        settingsModal.classList.remove('active');

        updateControlsPanel();
        updateHUD();
        updateMapBadge();
        updatePauseButton();
        savePlayerCountToStorage();
        touchStick = [null, null, null, null];
        touchAim = [null, null, null, null];
        buildTouchControls();
        canvas.focus();
        if (ONLINE.active && ONLINE.role === 'host' && !ONLINE.lobby) onlineHostNewRound();
    }

    function updateMapBadge() {
        let badge = document.getElementById('mapBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mapBadge';
            badge.className = 'map-badge';
            document.querySelector('.canvas-container').appendChild(badge);
        }
        let themeClass = '';
        if (currentMap.theme === 'lava') themeClass = 'lava-theme';
        else if (currentMap.theme === 'broken') themeClass = 'broken-theme';
        else if (currentMap.theme === 'mud') themeClass = 'mud-theme';
        else if (currentMap.theme === 'alien') themeClass = 'alien-theme';
        else if (currentMap.theme === 'territory') themeClass = 'territory-theme';
        badge.className = `map-badge ${themeClass}`;
        const randLabel = randomMapsEnabled ? ' <span class="rand-tag">🎲</span>' : '';
        badge.innerHTML = `<span class="map-name">${escapeHtml(currentMap.name)}${randLabel}</span><span class="map-desc">${escapeHtml(currentMap.desc)}</span>`;

        let teamBadge = document.getElementById('teamBadge');
        if (teamModeEnabled) {
            if (!teamBadge) {
                teamBadge = document.createElement('div');
                teamBadge.id = 'teamBadge';
                teamBadge.className = 'team-badge';
                document.querySelector('.canvas-container').appendChild(teamBadge);
            }
            const t0count = teamAssignments.slice(0, playerCount).filter(t => t === 0).length;
            const t1count = teamAssignments.slice(0, playerCount).filter(t => t === 1).length;
            teamBadge.innerHTML = `
                <div class="team-badge-row">
                    <span class="team-dot" style="background:${CONFIG.TEAM_COLORS[0].color}"></span>
                    <span class="team-name">BLUE</span>
                    <span class="team-count">×${t0count}</span>
                </div>
                <div class="team-badge-row">
                    <span class="team-dot" style="background:${CONFIG.TEAM_COLORS[1].color}"></span>
                    <span class="team-name">RED</span>
                    <span class="team-count">×${t1count}</span>
                </div>
            `;
            teamBadge.style.display = 'flex';
        } else if (teamBadge) {
            teamBadge.style.display = 'none';
        }

        let timeBadge = document.getElementById('timeBadge');
        if (timeModeEnabled || territoryMapActive) {
            if (!timeBadge) {
                timeBadge = document.createElement('div');
                timeBadge.id = 'timeBadge';
                timeBadge.className = 'time-badge';
                document.querySelector('.canvas-container').appendChild(timeBadge);
            }
            timeBadge.style.display = 'flex';
        } else if (timeBadge) {
            timeBadge.style.display = 'none';
        }
    }

    function updateTimeBadge() {
        if (!timeModeEnabled && !territoryMapActive) return;
        const timeBadge = document.getElementById('timeBadge');
        if (!timeBadge) return;

        const secs = Math.max(0, Math.ceil(timeRemainingFrames / 60));
        const pct = timeRemainingFrames / (timeDuration * 60);

        let cls = 'time-badge';
        if (territoryMapActive) cls += ' territory';
        if (suddenDeathActive) cls += ' sudden-death';
        else if (pct < 0.3) cls += ' danger';
        else if (pct < 0.5) cls += ' warning';

        timeBadge.className = cls;
        timeBadge.innerHTML = `
            <div class="time-icon">${territoryMapActive ? '🚩' : (suddenDeathActive ? '💀' : (pct < 0.3 ? '⚠️' : '⏱️'))}</div>
            <div class="time-display">${formatTime(secs)}</div>
            ${territoryMapActive ? '<div class="sudden-death-label">TERRITORY WAR</div>' : (suddenDeathActive ? '<div class="sudden-death-label">SUDDEN DEATH</div>' : '')}
        `;
    }

    // ============================================================
    //  PAUSE
    // ============================================================
    function togglePause() {
        if (!gameActive || isOnlineGuest()) return;
        gamePaused = !gamePaused;
        playSound(gamePaused ? 'pause' : 'unpause');
        updatePauseButton();
        updatePauseOverlay();
    }

    function updatePauseButton() {
        const btn = document.getElementById('pauseButton');
        if (!btn) return;
        if (gamePaused) {
            btn.classList.add('paused');
            btn.innerHTML = '<span>▶</span> RESUME';
        } else {
            btn.classList.remove('paused');
            btn.innerHTML = '<span>⏸</span> PAUSE';
        }
        btn.style.display = gameActive ? 'flex' : 'none';
    }

    function updatePauseOverlay() {
        let overlay = document.getElementById('pauseOverlay');
        if (gamePaused) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'pauseOverlay';
                overlay.className = 'pause-overlay';
                document.querySelector('.canvas-container').appendChild(overlay);
            }
            overlay.innerHTML = `
                <div class="pause-content">
                    <div class="pause-icon">⏸</div>
                    <div class="pause-text">PAUSED</div>
                    <div class="pause-hint">Press ESC or click RESUME button to continue</div>
                </div>
            `;
            overlay.style.display = 'flex';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // ============================================================
    //  CONTROLS PANEL & HUD
    // ============================================================
    function updateControlsPanel() {
        let html = '';
        for (let i = 0; i < playerCount; i++) {
            if (ONLINE.active && i !== ONLINE.mySlot) continue;
            const p = players[i];
            const k = ONLINE.active ? playerConfigs[0].keys : p.keys;
            const isLastWinner = !teamModeEnabled && lastWinnerName && p.name === lastWinnerName;
            const crown = isLastWinner ? '<span class="crown-icon">👑</span>' : '';

            let teamIcon = '';
            if (teamModeEnabled) {
                const teamCol = getTeamColor(teamAssignments[i]);
                teamIcon = `<span class="team-chip" style="background:${teamCol.color}">${teamAssignments[i] === 0 ? 'BLUE' : 'RED'}</span>`;
            }

            let ctfInfo = '';
            if (ctfModeEnabled && p.capturedFlags) {
                ctfInfo = `<span class="ctf-chip">🏴 ${p.capturedFlags.length}</span>`;
            }

            let terrInfo = '';
            if (territoryMapActive) {
                const score = teamModeEnabled ? territoryScores[teamAssignments[i]] : territoryScores[i];
                terrInfo = `<span class="terr-chip">🚩 ${score}</span>`;
            }

            html += `<div class="control-item" id="ctrl-${i}">
                <span class="player-dot" style="background:${p.color};color:${p.color}"></span>
                ${teamIcon}
                ${ctfInfo}
                ${terrInfo}
                <strong style="color:${p.lightColor}">${crown}${escapeHtml(p.name)}</strong>
                <span class="control-key">${formatKeyName(k.up)}</span>
                <span class="control-key">${formatKeyName(k.left)}</span>
                <span class="control-key">${formatKeyName(k.down)}</span>
                <span class="control-key">${formatKeyName(k.right)}</span>
                <span style="opacity:0.4">·</span>
                <span class="control-key">${formatKeyName(k.shoot)}</span>
                <span style="opacity:0.4">·</span>
                <span class="control-key">${formatKeyName(k.rotateL)}</span>
                <span class="control-key">${formatKeyName(k.rotateR)}</span>
            </div>`;
        }
        controlsPanel.innerHTML = html;
    }

    function updateHUD() {
        for (let i = 0; i < 4; i++) {
            const el = hudElements[i];
            if (i >= playerCount) { el.classList.remove('visible'); continue; }
            const p = players[i];
            el.classList.add('visible');
            el.style.borderLeftColor = p.color;

            let heartsHtml = '';
            for (let h = 0; h < CONFIG.MAX_HITS; h++) {
                heartsHtml += `<div class="hud-heart ${h < p.hits ? 'lost' : ''}"></div>`;
            }
            const isLastWinner = !teamModeEnabled && lastWinnerName && p.name === lastWinnerName;
            const crownIcon = isLastWinner ? '<span class="crown-icon">👑</span>' : '';

            let teamChip = '';
            if (teamModeEnabled) {
                const teamCol = getTeamColor(teamAssignments[i]);
                teamChip = `<span class="hud-team-chip" style="background:${teamCol.color}">${teamAssignments[i] === 0 ? 'BLUE' : 'RED'}</span>`;
            }

            let ctfChip = '';
            if (ctfModeEnabled && p.capturedFlags) {
                ctfChip = `<span class="hud-ctf-chip">🏴 ${p.capturedFlags.length}</span>`;
            }

            let terrChip = '';
            if (territoryMapActive) {
                const score = teamModeEnabled ? territoryScores[teamAssignments[i]] : territoryScores[i];
                terrChip = `<span class="hud-terr-chip">🚩 ${score}</span>`;
            }

            let powerHtml = '';
            if (p.shield > 0) powerHtml += `<span class="hud-powerup shield-icon" title="Shield">🛡️${p.shield}</span>`;
            if (p.missilePower && p.missilePower.timer > 0) {
                const sec = Math.ceil(p.missilePower.timer / 60);
                const info = getPowerupInfo(p.missilePower.type);
                powerHtml += `<span class="hud-powerup missile-icon" style="background:rgba(${info.color},0.25);color:rgb(${info.color});border-color:rgba(${info.color},0.6)" title="${info.name}">${info.icon}${sec}s</span>`;
            }

            const respawnInfo = (!p.alive && p.respawnTimer > 0) ? `<span class="hud-respawn">⏳${Math.ceil(p.respawnTimer / 60)}</span>` : '';
            const abductInfo = p.beingAbducted ? `<span class="hud-abduct">👽</span>` : '';

            el.innerHTML = `${crownIcon}${teamChip}${ctfChip}${terrChip}<span class="hud-name" style="color:${p.lightColor}">${escapeHtml(p.name)}</span>${respawnInfo}${abductInfo}${powerHtml}<div class="hud-hearts">${heartsHtml}</div>`;
            el.style.opacity = p.alive ? '1' : '0.4';
        }
    }

    // ============================================================
    //  INPUT HANDLING
    // ============================================================
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' && gameActive && !settingsModal.classList.contains('active') && !onlineModalOpen()) {
            e.preventDefault();
            togglePause();
            return;
        }

        if (listeningAction) {
            e.preventDefault();
            e.stopPropagation();
            const code = e.code;
            if (isModifierKey(code)) return;
            if (code === 'Escape') {
                listeningAction = null;
                renderSettingsBody();
                return;
            }
            const { playerIndex, actionKey } = listeningAction;
            const conflict = findKeyConflict(playerIndex, actionKey, code);
            if (conflict) {
                settingsError.textContent = `⚠ "${formatKeyName(code)}" is already used by ${conflict}`;
                playSound('click');
                return;
            }
            pendingConfigs[playerIndex].keys[actionKey] = code;
            listeningAction = null;
            settingsError.textContent = '';
            playSound('click');
            renderSettingsBody();
            return;
        }

        if (settingsModal.classList.contains('active') || onlineModalOpen()) return;

        const blockedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Comma', 'Period', 'Backspace', 'Tab'];
        if (blockedKeys.includes(e.code)) e.preventDefault();
        if (e.code.startsWith('Numpad')) e.preventDefault();

        if (gamePaused) return;

        if (!keysPressed[e.code]) {
            keysPressed[e.code] = true;
            if (isOnlineGuest()) {
                if (gameActive && e.code === playerConfigs[0].keys.shoot) guestFire();
            } else if (gameActive) {
                for (let i = 0; i < players.length; i++) {
                    const p = players[i];
                    if (isRemoteSlot(i)) continue;
                    if (p.alive && p.keys && e.code === p.keys.shoot && p.reload <= 0) {
                        shootBullet(p);
                    }
                }
            }
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        keysPressed[e.code] = false;
        const blockedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Comma', 'Period'];
        if (blockedKeys.includes(e.code)) e.preventDefault();
        if (e.code.startsWith('Numpad')) e.preventDefault();
    });

    // ============================================================
    //  SHOOTING
    // ============================================================
    // ============================================================
    //  MOBILE TOUCH CONTROLS
    // ============================================================
    function mobileShoot(i) {
        if (isOnlineGuest()) { if (gameActive && !gamePaused) guestFire(); return; }
        if (!gameActive || gamePaused) return;
        const p = players[i];
        if (!p || !p.alive || p.beingAbducted || p.reload > 0) return;
        shootBullet(p);                         // fire at the angle the gun is at right now
        if (mobileAimMode[i] === 'auto') p.aimLock = CONFIG.MOBILE_AIM_FREEZE;   // auto mode: hold the gun still for a moment
    }

    // ---------- custom layout helpers ----------
    function layoutKey() { return rotateView ? 'portrait' : 'landscape'; }

    function getControlSize() {
        const vh = window.innerHeight, vw = window.innerWidth;
        const base = rotateView
            ? Math.min(Math.min(Math.max(76, 0.27 * vh), 132), 0.25 * vw)
            : Math.min(Math.max(66, 0.21 * vh), 104);
        return base * controlLayout.scale;
    }

    // Default spot of each control (as fractions of the screen) = the stacked layout
    function defaultControlPositions(i, W, H, js) {
        const pad = js * 0.7, m = 12, gap = 6, modeH = 22;
        const left = (i % 2 === 0), top = i >= 2;
        const sx = left ? m + js / 2 : W - m - js / 2;
        const sy = top ? m + js / 2 : H - m - js / 2;
        const dir = top ? 1 : -1;
        const fy = sy + dir * (js / 2 + gap + pad / 2);
        const my = fy + dir * (pad / 2 + gap + modeH / 2);
        return {
            stick: { x: sx / W, y: sy / H },
            fire:  { x: sx / W, y: fy / H },
            mode:  { x: sx / W, y: my / H }
        };
    }

    const controlPart = (el) => el.classList.contains('tc-stick') ? 'stick'
                              : el.classList.contains('tc-fire') ? 'fire' : 'mode';

    function applyControlLayout() {
        const box = document.getElementById('touchControls');
        if (!box || !mobileMode) return;
        const r = box.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const js = getControlSize();
        box.style.setProperty('--js-size', js + 'px');
        const bucket = controlLayout[layoutKey()] || {};
        const defs = {};
        box.querySelectorAll('.tc-stick, .tc-fire, .tc-mode').forEach(el => {
            const i = parseInt(el.dataset.player);
            const part = controlPart(el);
            if (!defs[i]) defs[i] = defaultControlPositions(i, r.width, r.height, js);
            const saved = bucket['p' + i] && bucket['p' + i][part];
            const pos = saved || defs[i][part];
            el.style.left = (pos.x * 100) + '%';
            el.style.top = (pos.y * 100) + '%';
            el.dataset.label = 'P' + (i + 1) + (part === 'stick' ? ' MOVE' : part === 'fire' ? ' AIM' : '');
        });
    }

    function moveControlTo(el, cx, cy) {
        const box = document.getElementById('touchControls');
        const br = box.getBoundingClientRect();
        const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
        const x = Math.min(Math.max(cx - br.left, hw), br.width - hw);
        const y = Math.min(Math.max(cy - br.top, hh), br.height - hh);
        const fx = x / br.width, fy = y / br.height;
        el.style.left = (fx * 100) + '%';
        el.style.top = (fy * 100) + '%';
        const key = layoutKey();
        const pk = 'p' + parseInt(el.dataset.player);
        controlLayout[key] = controlLayout[key] || {};
        controlLayout[key][pk] = controlLayout[key][pk] || {};
        controlLayout[key][pk][controlPart(el)] = { x: +fx.toFixed(4), y: +fy.toFixed(4) };
    }

    function buildTouchControls() {
        if (!mobileMode) return;
        const container = document.querySelector('.canvas-container');
        let box = document.getElementById('touchControls');
        if (!box) {
            box = document.createElement('div');
            box.id = 'touchControls';
            box.className = 'touch-controls';
            container.appendChild(box);

            const releaseStick = (stick) => {
                const knob = stick.querySelector('.tc-knob');
                if (knob) knob.style.transform = 'translate(-50%, -50%)';
                stick.classList.remove('active');
                touchStick[parseInt(stick.dataset.player)] = null;
            };

            const moveStick = (stick, e) => {
                const i = parseInt(stick.dataset.player);
                const r = stick.getBoundingClientRect();
                const maxR = r.width * 0.29;               // how far the knob can travel
                let dx = e.clientX - (r.left + r.width / 2);
                let dy = e.clientY - (r.top + r.height / 2);
                const dist = Math.hypot(dx, dy);
                if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
                const knob = stick.querySelector('.tc-knob');
                knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                const d = Math.hypot(dx, dy);
                // screen -> world: when the arena is rotated 90° clockwise, world (x,y) = screen (dy, -dx)
                touchStick[i] = (d / maxR < 0.25) ? null
                    : (rotateView ? { x: dy / d, y: -dx / d } : { x: dx / d, y: dy / d });   // small dead zone
            };

            // ---- aim pad: drag = point the gun, release = fire ----
            const aimFromPointer = (pad, e) => {
                const i = parseInt(pad.dataset.player);
                const r = pad.getBoundingClientRect();
                const maxR = r.width * 0.3;
                let dx = e.clientX - (r.left + r.width / 2);
                let dy = e.clientY - (r.top + r.height / 2);
                const raw = Math.hypot(dx, dy);
                if (raw > maxR) { dx = dx / raw * maxR; dy = dy / raw * maxR; }
                const knob = pad.querySelector('.tc-knob');
                knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                if (raw / maxR > 0.3) {                       // small dead zone
                    pad._dragged = true;
                    touchAim[i] = rotateView ? Math.atan2(-dx, dy) : Math.atan2(dy, dx);
                    const tp = players[ONLINE.active ? ONLINE.mySlot : i];
                    if (tp) tp.turretAngle = touchAim[i];
                }
            };
            const releaseFire = (pad, doFire) => {
                const i = parseInt(pad.dataset.player);
                const knob = pad.querySelector('.tc-knob');
                if (knob) knob.style.transform = 'translate(-50%, -50%)';
                pad.classList.remove('active', 'pressed');
                const wasDown = pad._down;
                pad._down = false; pad._dragged = false;
                if (wasDown && doFire) mobileShoot(i);        // fires along the aimed direction
                touchAim[i] = null;
            };

            box.addEventListener('pointerdown', (e) => {
                if (layoutEditMode) return;
                const stick = e.target.closest('.tc-stick');
                const pad = e.target.closest('.tc-fire');
                if (!stick && !pad) return;
                e.preventDefault();
                initAudio();
                if (stick) {
                    try { stick.setPointerCapture(e.pointerId); } catch (err) {}
                    stick.classList.add('active');
                    moveStick(stick, e);
                } else {
                    try { pad.setPointerCapture(e.pointerId); } catch (err) {}
                    pad._down = true; pad._dragged = false;
                    pad.classList.add('active', 'pressed');
                    aimFromPointer(pad, e);
                }
            });
            box.addEventListener('pointermove', (e) => {
                if (layoutEditMode) return;
                const stick = e.target.closest('.tc-stick');
                if (stick && stick.hasPointerCapture && stick.hasPointerCapture(e.pointerId)) { moveStick(stick, e); return; }
                const pad = e.target.closest('.tc-fire');
                if (pad && pad._down && pad.hasPointerCapture && pad.hasPointerCapture(e.pointerId)) aimFromPointer(pad, e);
            });
            const onUp = (e) => {
                if (layoutEditMode) return;
                const stick = e.target.closest && e.target.closest('.tc-stick');
                const pad = e.target.closest && e.target.closest('.tc-fire');
                if (stick) releaseStick(stick);
                if (pad) releaseFire(pad, e.type === 'pointerup');
            };
            box.addEventListener('pointerup', onUp);
            box.addEventListener('pointercancel', onUp);
            box.addEventListener('lostpointercapture', onUp);

            // AUTO / MANUAL aim toggle
            box.addEventListener('click', (e) => {
                if (layoutEditMode) return;
                const btn = e.target.closest('.tc-mode');
                if (!btn) return;
                const i = parseInt(btn.dataset.player);
                mobileAimMode[i] = mobileAimMode[i] === 'auto' ? 'manual' : 'auto';
                if (players[i]) players[i].aimLock = 0;
                btn.textContent = mobileAimMode[i] === 'auto' ? '🔄 AUTO' : '🎯 MANUAL';
                saveMobileAimMode();
            });
            // ---- layout edit mode: drag any control anywhere ----
            let dragEl = null, dragOff = null;
            box.addEventListener('pointerdown', (e) => {
                if (!layoutEditMode) return;
                const el = e.target.closest('.tc-stick, .tc-fire, .tc-mode');
                if (!el) return;
                e.preventDefault();
                const r = el.getBoundingClientRect();
                dragEl = el;
                dragOff = { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
                try { el.setPointerCapture(e.pointerId); } catch (err) {}
                el.classList.add('dragging');
            });
            box.addEventListener('pointermove', (e) => {
                if (!layoutEditMode || !dragEl) return;
                moveControlTo(dragEl, e.clientX - dragOff.x, e.clientY - dragOff.y);
            });
            const endDrag = () => {
                if (!dragEl) return;
                dragEl.classList.remove('dragging');
                dragEl = null;
                saveControlLayout();
            };
            box.addEventListener('pointerup', endDrag);
            box.addEventListener('pointercancel', endDrag);

            box.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        let html = '';
        const nCtl = ONLINE.active ? 1 : playerCount;
        for (let i = 0; i < nCtl; i++) {
            const p = players[ONLINE.active ? ONLINE.mySlot : i];
            if (!p) continue;
            html += `<div class="tc-group tc-p${i}" style="--pc:${p.color};--pcl:${p.lightColor}">
                <div class="tc-name">${escapeHtml(p.name)}</div>
                <button type="button" class="tc-mode" data-player="${i}" aria-label="Toggle aim mode">${mobileAimMode[i] === 'auto' ? '🔄 AUTO' : '🎯 MANUAL'}</button>
                <div class="tc-stick" data-player="${i}"><div class="tc-knob"></div></div>
                <div class="tc-fire" data-player="${i}" aria-label="Aim and fire"><div class="tc-knob">💥</div></div>
            </div>`;
        }
        box.innerHTML = html;
        applyControlLayout();
    }

    function shootBullet(player) {
        if (!gameActive || !player.alive || player.reload > 0) return;
        player.reload = CONFIG.RELOAD_TIME;

        const cx = player.x + CONFIG.TANK_SIZE / 2;
        const cy = player.y + CONFIG.TANK_SIZE / 2;
        const barrelLen = 26;

        if (player.missilePower && player.missilePower.timer > 0) {
            const type = player.missilePower.type;

            if (type === 'missile3') {
                const angles = [player.turretAngle - 0.25, player.turretAngle, player.turretAngle + 0.25];
                for (const ang of angles) {
                    const sx = cx + Math.cos(ang) * barrelLen;
                    const sy = cy + Math.sin(ang) * barrelLen;
                    missiles.push({
                        x: sx, y: sy,
                        vx: Math.cos(ang) * CONFIG.BULLET_SPEED * 1.15,
                        vy: Math.sin(ang) * CONFIG.BULLET_SPEED * 1.15,
                        owner: player.index, life: CONFIG.BULLET_LIFE,
                        damage: 1, size: 1.0, trail: [], color: '#ff8a4a',
                    });
                }
                playSound('missile');
                screenShake = Math.max(screenShake, 6);
                return;
            }

            if (type === 'missile8') {
                for (let k = 0; k < 8; k++) {
                    const ang = (k / 8) * Math.PI * 2;
                    const sx = cx + Math.cos(ang) * (barrelLen - 4);
                    const sy = cy + Math.sin(ang) * (barrelLen - 4);
                    missiles.push({
                        x: sx, y: sy,
                        vx: Math.cos(ang) * CONFIG.BULLET_SPEED * 1.05,
                        vy: Math.sin(ang) * CONFIG.BULLET_SPEED * 1.05,
                        owner: player.index, life: CONFIG.BULLET_LIFE,
                        damage: 1, size: 1.0, trail: [], color: '#ffd700',
                    });
                }
                playSound('missile');
                screenShake = Math.max(screenShake, 10);
                return;
            }

            if (type === 'largeMissile') {
                const sx = cx + Math.cos(player.turretAngle) * barrelLen;
                const sy = cy + Math.sin(player.turretAngle) * barrelLen;
                missiles.push({
                    x: sx, y: sy,
                    vx: Math.cos(player.turretAngle) * CONFIG.BULLET_SPEED * 0.85,
                    vy: Math.sin(player.turretAngle) * CONFIG.BULLET_SPEED * 0.85,
                    owner: player.index, life: CONFIG.BULLET_LIFE + 30,
                    damage: CONFIG.LARGE_MISSILE_DAMAGE,
                    size: CONFIG.LARGE_MISSILE_SIZE, trail: [], color: '#c864ff',
                });
                playSound('bigMissile');
                screenShake = Math.max(screenShake, 12);
                return;
            }
        }

        const startX = cx + Math.cos(player.turretAngle) * barrelLen;
        const startY = cy + Math.sin(player.turretAngle) * barrelLen;

        bullets.push({
            x: startX, y: startY,
            vx: Math.cos(player.turretAngle) * CONFIG.BULLET_SPEED,
            vy: Math.sin(player.turretAngle) * CONFIG.BULLET_SPEED,
            owner: player.index, life: CONFIG.BULLET_LIFE, color: player.lightColor,
        });

        for (let i = 0; i < 8; i++) {
            const angle = player.turretAngle + rand(-0.4, 0.4);
            const speed = rand(1, 4);
            particles.push({
                x: startX, y: startY,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: rand(8, 18), maxLife: 18,
                size: rand(2, 5), color: '#ffdd44', type: 'spark'
            });
        }
        screenShake = Math.max(screenShake, 4);
        playSound('shoot');
    }

    function createExplosion(x, y, count, big) {
        if (ONLINE.active && ONLINE.role === 'host') netRecordExplosion(x, y, count, big);
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(1, big ? 7 : 4);
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: rand(20, big ? 50 : 35), maxLife: big ? 50 : 35,
                size: rand(2, big ? 8 : 5),
                color: ['#ff6600', '#ffaa00', '#ff3300', '#ffff00'][Math.floor(rand(0, 4))],
                type: 'fire'
            });
        }
        explosions.push({
            x, y, radius: big ? 20 : 10,
            maxRadius: big ? 70 : 40,
            life: big ? 30 : 20, maxLife: big ? 30 : 20,
        });
        screenShake = Math.max(screenShake, big ? 14 : 7);
    }

    function createMudSplash(x, y) {
        for (let i = 0; i < 6; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(0.5, 2);
            mudSplashes.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: rand(15, 30), maxLife: 30, size: rand(2, 5),
            });
        }
    }

    function createLavaBubble(x, y) {
        lavaBubbles.push({ x, y, r: rand(2, 5), life: rand(20, 40), maxLife: 40, vy: -rand(0.3, 0.8) });
    }

    function damagePlayer(p, amount, cause) {
        if (!p.alive) return;

        const inBase = tankInAnySafeBase(p);
        if (inBase && (cause === 'lava' || cause === 'hole' || cause === 'giant')) {
            return;
        }

        if (p.shield > 0 && cause !== 'suddenDeath' && cause !== 'alien') {
            p.shield--;
            createExplosion(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, 8, false);
            playSound('shieldHit');
            if (p.shield === 0) {
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    particles.push({
                        x: p.x + CONFIG.TANK_SIZE / 2, y: p.y + CONFIG.TANK_SIZE / 2,
                        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
                        life: 30, maxLife: 30, size: 4,
                        color: '#22d3ee', type: 'spark'
                    });
                }
            }
            return;
        }
        p.hits += amount;
        if (p.hits >= CONFIG.MAX_HITS) {
            killPlayer(p, cause);
        } else {
            createExplosion(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, 8, false);
            playSound('hit');
            screenShake = Math.max(screenShake, 6);
        }
        updateHUD();
    }

    function killPlayer(p, cause) {
        p.alive = false;
        p.beingAbducted = false;
        createExplosion(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, 40, true);
        playSound('explosion');
        screenShake = Math.max(screenShake, 18);

        if (ctfModeEnabled && p.capturedFlags && p.capturedFlags.length > 0) {
            for (const flagIdx of p.capturedFlags) {
                const flag = ctfFlags[flagIdx];
                if (flag && flag.carrier === p.index) {
                    flag.carrier = null;
                    flag.dropped = true;
                    flag.x = p.x + CONFIG.TANK_SIZE / 2;
                    flag.y = p.y + CONFIG.TANK_SIZE / 2;
                    flag.pickupCooldown = CONFIG.CTF_PICKUP_COOLDOWN;
                    flag.homeX = flag.teamFlag ? ctfBases[flag.teamOwner].x + ctfBases[flag.teamOwner].w / 2 : ctfBases[flag.owner].x + ctfBases[flag.owner].w / 2;
                    flag.homeY = flag.teamFlag ? ctfBases[flag.teamOwner].y + ctfBases[flag.teamOwner].h / 2 : ctfBases[flag.owner].y + ctfBases[flag.owner].h / 2;
                }
            }
            p.capturedFlags = [];
            playSound('flagLost');
        }

        if (ctfModeEnabled) {
            p.respawnTimer = CONFIG.RESPAWN_TIME;
        }
    }

    // ============================================================
    //  ALIENS
    // ============================================================
    function spawnAlien() {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        if (edge === 0) { x = rand(50, CONFIG.CANVAS_W - 50); y = -40; }
        else if (edge === 1) { x = CONFIG.CANVAS_W + 40; y = rand(50, CONFIG.CANVAS_H - 50); }
        else if (edge === 2) { x = rand(50, CONFIG.CANVAS_W - 50); y = CONFIG.CANVAS_H + 40; }
        else { x = -40; y = rand(50, CONFIG.CANVAS_H - 50); }

        aliens.push({
            x, y,
            vx: 0, vy: 0,
            hp: CONFIG.ALIEN_HP,
            size: CONFIG.ALIEN_SIZE,
            target: -1,
            targetSwitchTimer: 0,
            bobPhase: rand(0, Math.PI * 2),
            beamActive: false,
        });
        playSound('alienAppear');
    }

    function updateAliens() {
        if (!alienMapActive || !gameActive) return;

        alienSpawnTimer++;
        if (alienSpawnTimer >= alienNextSpawn && aliens.length < 4) {
            spawnAlien();
            alienSpawnTimer = 0;
            alienNextSpawn = Math.floor(rand(CONFIG.ALIEN_SPAWN_MIN, CONFIG.ALIEN_SPAWN_MAX));
        }

        for (let i = aliens.length - 1; i >= 0; i--) {
            const a = aliens[i];

            let bestTarget = null;
            let bestDist = Infinity;
            for (const p of players) {
                if (!p.alive || p.beingAbducted) continue;
                if (tankInAnySafeBase(p)) continue;
                const d = dist(a.x, a.y, p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2);
                if (d < bestDist) {
                    bestDist = d;
                    bestTarget = p;
                }
            }

            if (bestTarget) {
                a.target = bestTarget.index;
                const tx = bestTarget.x + CONFIG.TANK_SIZE / 2;
                const ty = bestTarget.y + CONFIG.TANK_SIZE / 2;
                const angle = Math.atan2(ty - a.y, tx - a.x);
                a.vx = Math.cos(angle) * CONFIG.ALIEN_SPEED;
                a.vy = Math.sin(angle) * CONFIG.ALIEN_SPEED;
            } else {
                a.vx *= 0.95;
                a.vy *= 0.95;
            }

            a.x += a.vx;
            a.y += a.vy;

            if (a.target >= 0) {
                const p = players[a.target];
                if (p && p.alive) {
                    const d = dist(a.x, a.y, p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2);
                    if (d < CONFIG.TANK_SIZE / 2 + CONFIG.ALIEN_CAPTURE_RADIUS) {
                        p.beingAbducted = true;
                        a.beamActive = true;

                        if (p.beingAbducted) {
                            p.abductTimer = (p.abductTimer || 0) + 1;
                            p.x += (a.x - p.x - CONFIG.TANK_SIZE / 2) * 0.15;
                            p.y += (a.y - p.y - CONFIG.TANK_SIZE / 2) * 0.15;
                            a.y -= 0.5;

                            if (p.abductTimer > 90) {
                                p.alive = false;
                                p.beingAbducted = false;
                                p.abductTimer = 0;
                                createExplosion(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, 25, true);
                                playSound('alienBeam');
                                if (ctfModeEnabled) p.respawnTimer = CONFIG.RESPAWN_TIME;
                                updateHUD();
                            }
                        }
                    } else {
                        a.beamActive = false;
                    }
                }
            }

            if (a.x < -200 || a.x > CONFIG.CANVAS_W + 200 || a.y < -200 || a.y > CONFIG.CANVAS_H + 200) {
                aliens.splice(i, 1);
                continue;
            }
        }
    }

    function damageAlien(a, amount) {
        a.hp -= amount;
        if (a.hp <= 0) {
            createExplosion(a.x, a.y, 30, true);
            playSound('alienDeath');
            if (Math.random() < 0.4) {
                const type = CONFIG.POWERUP_TYPES[Math.floor(Math.random() * CONFIG.POWERUP_TYPES.length)];
                powerupDrops.push({
                    x: a.x, y: a.y, type: type, life: 900, bob: rand(0, Math.PI * 2),
                });
            }
            const idx = aliens.indexOf(a);
            if (idx >= 0) aliens.splice(idx, 1);
        } else {
            createExplosion(a.x, a.y, 6, false);
            playSound('hit');
        }
    }

    // ============================================================
    //  TERRITORY
    // ============================================================
    function updateTerritory() {
        if (!territoryMapActive || !gameActive) return;

        for (const terr of territories) {
            // who is standing in this ring? (grouped by team / player)
            const inside = {};
            for (const p of players) {
                if (!p.alive) continue;
                const pcx = p.x + CONFIG.TANK_SIZE / 2;
                const pcy = p.y + CONFIG.TANK_SIZE / 2;
                if (dist(pcx, pcy, terr.x, terr.y) < terr.radius) {
                    const side = teamModeEnabled ? teamAssignments[p.index] : p.index;
                    inside[side] = (inside[side] || 0) + 1;
                }
            }
            const sides = Object.keys(inside).map(Number);

            // two different sides in the ring = CONTESTED, nobody makes progress
            terr.contested = sides.length > 1;
            if (terr.contested) continue;

            if (sides.length === 1) {
                const scoreIdx = sides[0];
                const count = inside[scoreIdx];
                if (terr.owner === scoreIdx) {
                    terr.progress = 0;
                    terr.capturer = -1;
                    continue;
                }
                if (terr.capturer !== scoreIdx) {
                    terr.capturer = scoreIdx;
                    terr.progress = 1;
                } else {
                    terr.progress += Math.min(2, 1 + 0.5 * (count - 1));     // teammates capture faster
                }
                if (terr.progress >= CONFIG.TERRITORY_CAPTURE_TIME) {
                    terr.owner = scoreIdx;
                    terr.progress = 0;
                    terr.capturer = -1;
                    territoryScores[scoreIdx] = (territoryScores[scoreIdx] || 0) + 1;
                    playSound('capturePoint');
                    // reward: capturers standing in the ring get a free shield hit (max 2)
                    for (const p of players) {
                        if (!p.alive) continue;
                        const side = teamModeEnabled ? teamAssignments[p.index] : p.index;
                        if (side !== scoreIdx) continue;
                        if (dist(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, terr.x, terr.y) < terr.radius) {
                            p.shield = Math.min(2, (p.shield || 0) + 1);
                        }
                    }
                    for (let k = 0; k < 36; k++) {
                        const angle = (k / 36) * Math.PI * 2;
                        const speed = rand(2, 6);
                        particles.push({
                            x: terr.x, y: terr.y,
                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                            life: 45, maxLife: 45, size: rand(3, 6),
                            color: k % 2 ? '#ffdd44' : '#ffffff', type: 'spark'
                        });
                    }
                    screenShake = Math.max(screenShake, 4);
                    updateHUD();
                    updateControlsPanel();
                }
            } else if (terr.progress > 0) {
                terr.progress -= 1.5;                                      // empty ring: progress slowly drains
                if (terr.progress <= 0) { terr.progress = 0; terr.capturer = -1; }
            }
        }
    }

    function checkTerritoryWin() {
        if (!territoryMapActive || !gameActive) return;
        const owners = new Set(territories.map(t => t.owner));
        owners.delete(-1);
        if (owners.size === 1 && territories.every(t => t.owner !== -1)) {
            const winner = owners.values().next().value;
            gameActive = false;
            if (teamModeEnabled) {
                const teamSurvivors = players.filter(p => teamAssignments[p.index] === winner && p.alive);
                showTeamWinModal(winner, teamSurvivors.length > 0 ? teamSurvivors : players.filter(p => teamAssignments[p.index] === winner));
            } else {
                const winnerPlayer = players[winner];
                if (winnerPlayer) {
                    saveLastWinnerToStorage(winnerPlayer.name);
                    modalTitle.textContent = `${winnerPlayer.name} WINS!`;
                    modalTitle.style.color = winnerPlayer.lightColor;
                    modalTitle.style.textShadow = `0 0 30px ${winnerPlayer.color}, 2px 2px 0 #1e2b16`;
                    modalSubtitle.textContent = `Captured all territories! 🚩 🏆`;
                    winModal.classList.add('active');
                    playSound('win');
                }
            }
        }
    }

    // ============================================================
    //  TIME MODE
    // ============================================================
    function checkSuddenDeathTrigger() {
        if (!timeModeEnabled || !suddenDeathEnabled) return;
        if (territoryMapActive) return;
        if (suddenDeathActive) return;
        if (timeRemainingFrames <= timeDuration * 60 * CONFIG.SUDDEN_DEATH_THRESHOLD) {
            activateSuddenDeath();
        }
    }

    function activateSuddenDeath() {
        suddenDeathActive = true;
        playSound('suddenDeath');
        screenShake = Math.max(screenShake, 30);

        // Dramatic red burst
        for (let i = 0; i < 60; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(3, 10);
            particles.push({
                x: CONFIG.CANVAS_W / 2,
                y: CONFIG.CANVAS_H / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 60, maxLife: 60,
                size: rand(4, 8),
                color: '#ff0000', type: 'fire'
            });
        }

        // Warning burst over each player
        for (const p of players) {
            if (!p.alive) continue;
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                particles.push({
                    x: p.x + CONFIG.TANK_SIZE / 2,
                    y: p.y + CONFIG.TANK_SIZE / 2,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    life: 45, maxLife: 45,
                    size: 5,
                    color: '#ff4444', type: 'spark'
                });
            }
        }

        updateTimeBadge();
    }

    function spawnSuddenDeathHazard() {
        const w = rand(50, 90);
        const h = rand(50, 90);
        let attempts = 0;
        let placed = false;

        while (attempts < 30 && !placed) {
            const x = rand(80, CONFIG.CANVAS_W - 80 - w);
            const y = rand(80, CONFIG.CANVAS_H - 80 - h);
            const newObs = { x, y, w, h };

            let blocked = false;
            for (const obs of obstacles) if (rectCollide(newObs, obs)) { blocked = true; break; }
            if (!blocked) for (const obs of extraObstacles) if (rectCollide(newObs, obs)) { blocked = true; break; }
            if (!blocked) for (const p of players) {
                if (!p.alive) continue;
                if (rectCollide(newObs, { x: p.x, y: p.y, w: CONFIG.TANK_SIZE + 60, h: CONFIG.TANK_SIZE + 60 })) {
                    blocked = true; break;
                }
            }
            if (!blocked && ctfModeEnabled) {
                for (const base of ctfBases) {
                    if (rectCollide(newObs, base)) { blocked = true; break; }
                }
            }
            if (!blocked && territoryMapActive) {
                for (const t of territories) {
                    if (circleRectCollide(t.x, t.y, t.radius + CONFIG.TANK_SIZE / 2 + 25, newObs)) { blocked = true; break; }
                }
            }

            if (!blocked) {
                extraObstacles.push(newObs);
                placed = true;

                for (let i = 0; i < 15; i++) {
                    const angle = rand(0, Math.PI * 2);
                    const speed = rand(2, 6);
                    particles.push({
                        x: x + w / 2, y: y + h / 2,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 40, maxLife: 40, size: rand(4, 7),
                        color: i % 2 === 0 ? '#ff4444' : '#ffaa00',
                        type: 'spark'
                    });
                }
                playSound('warning');
                screenShake = Math.max(screenShake, 5);
            }
            attempts++;
        }
    }

    // ============================================================
    //  CTF LOGIC
    // ============================================================
    function updateCtfLogic() {
        if (!ctfModeEnabled) return;

        for (let fi = 0; fi < ctfFlags.length; fi++) {
            const flag = ctfFlags[fi];
            if (flag.pickupCooldown > 0) flag.pickupCooldown--;

            if (flag.carrier !== null) {
                const carrier = players[flag.carrier];
                if (!carrier || !carrier.alive) {
                    flag.carrier = null;
                    flag.dropped = true;
                    flag.pickupCooldown = CONFIG.CTF_PICKUP_COOLDOWN;
                    continue;
                }
                flag.x = carrier.x + CONFIG.TANK_SIZE / 2;
                flag.y = carrier.y + CONFIG.TANK_SIZE / 2;
                continue;
            }

            for (const p of players) {
                if (!p.alive) continue;
                const pcx = p.x + CONFIG.TANK_SIZE / 2;
                const pcy = p.y + CONFIG.TANK_SIZE / 2;
                const d = dist(pcx, pcy, flag.x, flag.y);

                if (d < CONFIG.TANK_SIZE / 2 + CONFIG.FLAG_CAPTURE_RADIUS) {
                    if (flag.pickupCooldown > 0) continue;

                    const flagBelongsToPlayer = !flag.teamFlag && flag.owner === p.index;
                    const flagBelongsToTeam = flag.teamFlag && teamModeEnabled && teamAssignments[p.index] === flag.teamOwner;
                    const atHome = dist(flag.x, flag.y, flag.homeX, flag.homeY) < 5;

                    if (atHome && (flagBelongsToPlayer || flagBelongsToTeam)) continue;

                    flag.carrier = p.index;
                    flag.dropped = false;
                    if (!p.capturedFlags) p.capturedFlags = [];
                    if (!p.capturedFlags.includes(fi)) p.capturedFlags.push(fi);

                    playSound('flagPickup');
                    for (let k = 0; k < 10; k++) {
                        const angle = rand(0, Math.PI * 2);
                        const speed = rand(2, 5);
                        particles.push({
                            x: flag.x, y: flag.y,
                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                            life: 30, maxLife: 30, size: rand(3, 6),
                            color: '#ffdd44', type: 'spark'
                        });
                    }
                    updateHUD();
                    updateControlsPanel();
                    break;
                }
            }
        }

        for (const p of players) {
            if (!p.alive || !p.capturedFlags || p.capturedFlags.length === 0) continue;
            if (flagInHomeBase(p)) {
                let allCaptured = true;
                const requiredFlags = [];

                if (teamModeEnabled) {
                    const myTeam = teamAssignments[p.index];
                    for (let fi = 0; fi < ctfFlags.length; fi++) {
                        const f = ctfFlags[fi];
                        if (f.teamFlag && f.teamOwner !== myTeam) requiredFlags.push(fi);
                    }
                } else {
                    for (let fi = 0; fi < ctfFlags.length; fi++) {
                        const f = ctfFlags[fi];
                        if (!f.teamFlag && f.owner !== p.index) requiredFlags.push(fi);
                    }
                }

                for (const requiredIdx of requiredFlags) {
                    if (!p.capturedFlags.includes(requiredIdx)) {
                        allCaptured = false;
                        break;
                    }
                }

                if (allCaptured && requiredFlags.length > 0) {
                    gameActive = false;
                    showCtfWinModal(p);
                    return;
                }
            }
        }
    }

    function flagInHomeBase(p) {
        if (!ctfModeEnabled) return false;
        let myBase = null;
        if (teamModeEnabled) myBase = ctfBases[teamAssignments[p.index]];
        else myBase = ctfBases[p.index];
        if (!myBase) return false;
        const pcx = p.x + CONFIG.TANK_SIZE / 2;
        const pcy = p.y + CONFIG.TANK_SIZE / 2;
        return pointInRect(pcx, pcy, myBase);
    }

    function showCtfWinModal(winner) {
        saveLastWinnerToStorage(winner.name);
        updateControlsPanel();
        updateHUD();

        if (teamModeEnabled) {
            const teamId = teamAssignments[winner.index];
            const teamCol = getTeamColor(teamId);
            const teamName = teamId === 0 ? 'BLUE TEAM' : 'RED TEAM';
            modalTitle.textContent = `${teamName} WINS!`;
            modalTitle.style.color = teamCol.light;
            modalTitle.style.textShadow = `0 0 30px ${teamCol.color}, 2px 2px 0 #1e2b16`;
            modalSubtitle.textContent = `${winner.name} captured the enemy flag! 🏴`;
        } else {
            modalTitle.textContent = `${winner.name} WINS!`;
            modalTitle.style.color = winner.lightColor;
            modalTitle.style.textShadow = `0 0 30px ${winner.color}, 2px 2px 0 #1e2b16`;
            modalSubtitle.textContent = `All flags captured! 🏴 🏆`;
        }
        winModal.classList.add('active');
        playSound('flagCapture');
    }

    // ============================================================
    //  RESPAWN
    // ============================================================
    function respawnPlayer(p) {
        p.alive = true;
        p.hits = 0;
        p.shield = 0;
        p.missilePower = null;
        p.reload = 0;
        p.capturedFlags = [];
        p.respawnTimer = 0;
        p.beingAbducted = false;
        p.abductTimer = 0;
        p.aimLock = 0;

        let spawnX, spawnY;
        if (teamModeEnabled) {
            const base = ctfBases[teamAssignments[p.index]];
            spawnX = base.x + base.w / 2 - CONFIG.TANK_SIZE / 2;
            spawnY = base.y + base.h / 2 - CONFIG.TANK_SIZE / 2;
        } else {
            const base = ctfBases[p.index];
            spawnX = base.x + base.w / 2 - CONFIG.TANK_SIZE / 2;
            spawnY = base.y + base.h / 2 - CONFIG.TANK_SIZE / 2;
        }

        let attempts = 0;
        while (attempts < 100) {
            const rect = { x: spawnX, y: spawnY, w: CONFIG.TANK_SIZE, h: CONFIG.TANK_SIZE };
            let blocked = false;
            for (const obs of obstacles) if (rectCollide(rect, obs)) { blocked = true; break; }
            if (!blocked) break;
            spawnX += rand(-20, 20);
            spawnY += rand(-20, 20);
            attempts++;
        }

        p.x = spawnX;
        p.y = spawnY;

        for (let i = 0; i < 25; i++) {
            const angle = (i / 25) * Math.PI * 2;
            const speed = rand(2, 6);
            particles.push({
                x: p.x + CONFIG.TANK_SIZE / 2, y: p.y + CONFIG.TANK_SIZE / 2,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: 40, maxLife: 40, size: rand(3, 6),
                color: p.lightColor, type: 'spark'
            });
        }
        playSound('respawn');
        updateHUD();
    }

    // ============================================================
    //  UPDATE
    // ============================================================
    function update() {
        if (gamePaused || ONLINE.lobby) return;

        frameCount++;

        // TIME MODE
        if ((timeModeEnabled || territoryMapActive) && gameActive) {
            timeRemainingFrames--;

            if (territoryMapActive && timeRemainingFrames % 60 === 0) {
                playSound('territoryTick');
            }

            if (timeRemainingFrames <= 0) {
                timeRemainingFrames = 0;
                gameActive = false;
                if (territoryMapActive) {
                    showTerritoryTimeUpModal();
                } else {
                    showTimeUpModal();
                }
                return;
            }

            checkSuddenDeathTrigger();

            if (suddenDeathActive && !territoryMapActive) {
                if (frameCount % CONFIG.SUDDEN_DEATH_WARNING_TICK === 0) {
                    playSound('tick');
                }

                suddenDeathDamageTimer++;
                if (suddenDeathDamageTimer >= CONFIG.SUDDEN_DEATH_DAMAGE_INTERVAL) {
                    suddenDeathDamageTimer = 0;
                    for (const p of players) {
                        if (!p.alive) continue;
                        if (p.shield > 0) {
                            for (let i = 0; i < 15; i++) {
                                const angle = (i / 15) * Math.PI * 2;
                                particles.push({
                                    x: p.x + CONFIG.TANK_SIZE / 2, y: p.y + CONFIG.TANK_SIZE / 2,
                                    vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                                    life: 35, maxLife: 35, size: 5,
                                    color: '#22d3ee', type: 'spark'
                                });
                            }
                            p.shield = 0;
                        }
                        p.hits++;
                        for (let i = 0; i < 8; i++) {
                            particles.push({
                                x: p.x + CONFIG.TANK_SIZE / 2 + rand(-20, 20),
                                y: p.y + CONFIG.TANK_SIZE / 2 + rand(-20, 20),
                                vx: rand(-1.5, 1.5),
                                vy: rand(-3, -0.5),
                                life: 55, maxLife: 55,
                                size: rand(3, 5),
                                color: '#ff2222', type: 'fire'
                            });
                        }
                        screenShake = Math.max(screenShake, 6);
                        playSound('lava');
                        for (let i = 0; i < 3; i++) {
                            particles.push({
                                x: p.x + CONFIG.TANK_SIZE / 2 + rand(-25, 25),
                                y: p.y + CONFIG.TANK_SIZE / 2 + rand(-25, 25),
                                vx: 0, vy: -1.5,
                                life: 50, maxLife: 50,
                                size: rand(4, 7),
                                color: '#ff4444', type: 'spark'
                            });
                        }
                        if (p.hits >= CONFIG.MAX_HITS) {
                            killPlayer(p, 'suddenDeath');
                            for (let k = 0; k < 30; k++) {
                                const angle = rand(0, Math.PI * 2);
                                const speed = rand(4, 10);
                                particles.push({
                                    x: p.x + CONFIG.TANK_SIZE / 2,
                                    y: p.y + CONFIG.TANK_SIZE / 2,
                                    vx: Math.cos(angle) * speed,
                                    vy: Math.sin(angle) * speed,
                                    life: 60, maxLife: 60,
                                    size: rand(4, 8),
                                    color: '#ff0000', type: 'fire'
                                });
                            }
                        }
                        updateHUD();
                    }
                }

                suddenDeathHazardTimer++;
                if (suddenDeathHazardTimer >= CONFIG.SUDDEN_DEATH_HAZARD_INTERVAL) {
                    suddenDeathHazardTimer = 0;
                    spawnSuddenDeathHazard();
                }
            }

            updateTimeBadge();

            if (!territoryMapActive && timeRemainingFrames > 0 && timeRemainingFrames <= 600 && timeRemainingFrames % 60 === 0) {
                if (timeRemainingFrames <= 300) playSound('tick');
            }
        }

        // BROKEN FLOOR
        if (brokenFloorActive) {
            const triggerInterval = suddenDeathActive ? Math.floor(CONFIG.BROKEN_FLOOR_TRIGGER_INTERVAL * 0.5) : CONFIG.BROKEN_FLOOR_TRIGGER_INTERVAL;
            if (frameCount % triggerInterval === 0) {
                const candidates = floorTiles.filter(t => t.state === 'solid');
                const safe = candidates.filter(t => {
                    for (const p of players) {
                        if (!p.alive) continue;
                        const pcx = p.x + CONFIG.TANK_SIZE / 2;
                        const pcy = p.y + CONFIG.TANK_SIZE / 2;
                        if (pointInRect(pcx, pcy, t)) return false;
                    }
                    return true;
                });
                const pool = safe.length > 0 ? safe : candidates;
                if (pool.length > 0) {
                    const tile = pool[Math.floor(Math.random() * pool.length)];
                    tile.state = 'warn';
                    tile.timer = CONFIG.BROKEN_FLOOR_WARN_DURATION;
                    playSound('crack');
                }
            }

            for (const tile of floorTiles) {
                if (tile.state === 'warn') {
                    tile.timer--;
                    if (tile.timer <= 0) {
                        tile.state = 'falling';
                        tile.timer = 20;
                        playSound('crack');
                        for (let i = 0; i < 10; i++) {
                            const angle = rand(0, Math.PI * 2);
                            const speed = rand(1, 3);
                            particles.push({
                                x: tile.x + tile.w / 2, y: tile.y + tile.h / 2,
                                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                life: 30, maxLife: 30, size: rand(2, 5),
                                color: '#8b7355', type: 'spark'
                            });
                        }
                    }
                } else if (tile.state === 'falling') {
                    tile.timer--;
                    if (tile.timer <= 0) { tile.state = 'hole'; tile.timer = 0; }
                }
            }
        }

        // PLAYER UPDATE
        const speedFactor = suddenDeathActive ? CONFIG.SUDDEN_DEATH_SPEED_FACTOR : 1.0;

        for (let i = 0; i < players.length; i++) {
            const p = players[i];

            if (!p.alive && ctfModeEnabled && p.respawnTimer > 0) {
                p.respawnTimer--;
                if (p.respawnTimer <= 0) {
                    respawnPlayer(p);
                }
                continue;
            }

            if (!p.alive) continue;
            if (p.beingAbducted) continue;

            if (p.reload > 0) p.reload--;
            if (p.moveSoundTimer > 0) p.moveSoundTimer--;
            if (p.stuckTimer > 0) p.stuckTimer--;
            if (p.lavaDamageTimer > 0) p.lavaDamageTimer--;

            if (p.missilePower && p.missilePower.timer > 0) {
                p.missilePower.timer--;
                if (p.missilePower.timer === 0) {
                    p.missilePower = null;
                    p.hasPowerup = false;
                    updateHUD();
                }
            }

            const km = isRemoteSlot(i) ? {} : p.keys;
            let moveX = 0, moveY = 0;
            let rotatingTurret = false;

            if (keysPressed[km.up]) moveY -= 1;
            if (keysPressed[km.down]) moveY += 1;
            if (keysPressed[km.left]) moveX -= 1;
            if (keysPressed[km.right]) moveX += 1;
            if (keysPressed[km.rotateL]) { p.turretAngle -= CONFIG.TANK_ROTATION_SPEED; rotatingTurret = true; }
            if (keysPressed[km.rotateR]) { p.turretAngle += CONFIG.TANK_ROTATION_SPEED; rotatingTurret = true; }

            if (mobileMode && !isRemoteSlot(i)) {
                if (touchAim[i] !== null && touchAim[i] !== undefined) {
                    p.turretAngle = touchAim[i];              // player is aiming by hand
                } else if (mobileAimMode[i] === 'auto') {
                    // Auto mode: gun spins anti-clockwise on its own, unless locked after a shot
                    if (p.aimLock > 0) p.aimLock--;
                    else p.turretAngle -= CONFIG.MOBILE_TURRET_SPEED;
                } else {
                    p.aimLock = 0;                            // manual mode: gun stays where you left it
                }
                // Joystick drives the tank in the direction it is pushed
                if (touchStick[i]) {
                    moveX = touchStick[i].x;
                    moveY = touchStick[i].y;
                }
            }

            if (isRemoteSlot(i)) {
                const inp = ONLINE.inputs[i];
                if (inp) {
                    moveX = +inp.x || 0;
                    moveY = +inp.y || 0;
                    if (typeof inp.a === 'number' && isFinite(inp.a)) p.turretAngle = inp.a;
                    if (ONLINE.lastFire[i] === undefined) ONLINE.lastFire[i] = inp.f;
                    else if (inp.f !== ONLINE.lastFire[i]) {
                        ONLINE.lastFire[i] = inp.f;
                        if (p.reload <= 0) shootBullet(p);
                    }
                }
            }

            const inSafeBase = tankInAnySafeBase(p);

            if (moveX !== 0 || moveY !== 0) {
                const len = Math.hypot(moveX, moveY);
                moveX /= len; moveY /= len;

                const targetAngle = Math.atan2(moveY, moveX);
                let diff = targetAngle - p.bodyAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                p.bodyAngle += diff * 0.15;

                const mud = !inSafeBase ? tankInMud(p) : null;
                let speedMult = speedFactor;
                if (mud) {
                    if (mud.deep) {
                        if (Math.random() < CONFIG.MUD_STOP_CHANCE) {
                            p.stuckTimer = 5;
                            if (frameCount % 12 === 0) {
                                createMudSplash(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2);
                                playSound('mud');
                            }
                            continue;
                        }
                        speedMult = CONFIG.MUD_SLOW_FACTOR * speedFactor;
                    } else {
                        speedMult = CONFIG.MUD_SLOW_FACTOR * speedFactor;
                    }
                    if (frameCount % 8 === 0) {
                        createMudSplash(p.x + CONFIG.TANK_SIZE / 2 + rand(-10, 10), p.y + CONFIG.TANK_SIZE / 2 + rand(-10, 10));
                    }
                }

                const dx = moveX * CONFIG.TANK_SPEED * speedMult;
                const dy = moveY * CONFIG.TANK_SPEED * speedMult;

                const oldX = p.x;
                p.x += dx;
                p.x = Math.max(0, Math.min(CONFIG.CANVAS_W - CONFIG.TANK_SIZE, p.x));
                if (tankCollides(p, i)) p.x = oldX;

                const oldY = p.y;
                p.y += dy;
                p.y = Math.max(0, Math.min(CONFIG.CANVAS_H - CONFIG.TANK_SIZE, p.y));
                if (tankCollides(p, i)) p.y = oldY;

                if (frameCount % 3 === 0) {
                    tracks.push({
                        x: p.x + CONFIG.TANK_SIZE / 2 + rand(-8, 8),
                        y: p.y + CONFIG.TANK_SIZE / 2 + rand(-8, 8),
                        angle: p.bodyAngle, life: 180, alpha: 0.25, mud: !!mud,
                    });
                }

                if (p.moveSoundTimer <= 0) {
                    playSound(mud ? 'mud' : 'engine');
                    p.moveSoundTimer = mud ? 12 : 8;
                }
            }

            if (!inSafeBase) {
                const lava = tankInLava(p);
                if (lava) {
                    if (p.lavaDamageTimer <= 0) {
                        damagePlayer(p, 1, 'lava');
                        p.lavaDamageTimer = CONFIG.LAVA_DAMAGE_INTERVAL;
                        playSound('lava');
                    }
                    if (frameCount % 6 === 0) {
                        createLavaBubble(p.x + CONFIG.TANK_SIZE / 2 + rand(-15, 15), p.y + CONFIG.TANK_SIZE / 2 + rand(-15, 15));
                    }
                }

                if (tankOverHole(p)) {
                    killPlayer(p, 'hole');
                    updateHUD();
                    continue;
                }

                if (giantTankEnabled && tankInGiantDanger(p)) {
                    p.alive = false;
                    p.hits = CONFIG.MAX_HITS;
                    createExplosion(p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2, 50, true);
                    playSound('explosion');
                    screenShake = Math.max(screenShake, 22);
                    updateHUD();
                    continue;
                }
            }

            const pcx = p.x + CONFIG.TANK_SIZE / 2;
            const pcy = p.y + CONFIG.TANK_SIZE / 2;
            for (let di = powerupDrops.length - 1; di >= 0; di--) {
                const drop = powerupDrops[di];
                if (dist(pcx, pcy, drop.x, drop.y) < CONFIG.TANK_SIZE / 2 + 14) {
                    applyPowerup(p, drop.type);
                    playSound('powerup');
                    const info = getPowerupInfo(drop.type);
                    for (let k = 0; k < 15; k++) {
                        const angle = rand(0, Math.PI * 2);
                        const speed = rand(2, 5);
                        particles.push({
                            x: drop.x, y: drop.y,
                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                            life: 30, maxLife: 30, size: rand(3, 6),
                            color: `rgb(${info.color})`, type: 'spark'
                        });
                    }
                    powerupDrops.splice(di, 1);
                    updateHUD();
                }
            }
        }

        if (ctfModeEnabled && gameActive) {
            updateCtfLogic();
        }

        if (alienMapActive && gameActive) {
            updateAliens();
        }

        if (territoryMapActive && gameActive) {
            updateTerritory();
            checkTerritoryWin();
        }

        // GIANT TANK
        if (giantTankEnabled && !suddenDeathActive && !ctfModeEnabled && !territoryMapActive) {
            if (!giantTank) {
                giantTankTimer++;
                if (giantTankTimer >= giantTankNextDelay && gameActive) {
                    const fromLeft = Math.random() < 0.5;
                    const y = rand(120, CONFIG.CANVAS_H - 120);
                    giantTank = {
                        x: fromLeft ? -150 : CONFIG.CANVAS_W + 150,
                        y: y,
                        vx: fromLeft ? CONFIG.GIANT_TANK_SPEED : -CONFIG.GIANT_TANK_SPEED,
                        vy: 0, size: 90, hasDropped: false,
                        angle: fromLeft ? 0 : Math.PI,
                    };
                    giantTankTimer = 0;
                    giantTankGiftDropped = false;
                    playSound('giant');
                }
            } else {
                giantTank.x += giantTank.vx;
                giantTank.y += giantTank.vy;

                if (!giantTank.hasDropped && !giantTankGiftDropped && Math.abs(giantTank.x - CONFIG.CANVAS_W / 2) < 80) {
                    giantTank.hasDropped = true;
                    giantTankGiftDropped = true;
                    const type = CONFIG.POWERUP_TYPES[Math.floor(Math.random() * CONFIG.POWERUP_TYPES.length)];
                    let dropX = CONFIG.CANVAS_W / 2 + rand(-80, 80);
                    let dropY = giantTank.y + 60;
                    dropX = Math.max(60, Math.min(CONFIG.CANVAS_W - 60, dropX));
                    dropY = Math.max(60, Math.min(CONFIG.CANVAS_H - 60, dropY));
                    powerupDrops.push({ x: dropX, y: dropY, type: type, life: 900, bob: rand(0, Math.PI * 2) });
                }

                if (giantTank.x < -250 || giantTank.x > CONFIG.CANVAS_W + 250) {
                    giantTank = null;
                    giantTankTimer = 0;
                    giantTankNextDelay = Math.floor(rand(CONFIG.GIANT_TANK_MIN_DELAY, CONFIG.GIANT_TANK_MAX_DELAY));
                }
            }
        } else if (giantTank) {
            giantTank = null;
        }

        for (let i = powerupDrops.length - 1; i >= 0; i--) {
            const d = powerupDrops[i];
            d.life--;
            d.bob += 0.08;
            if (d.life <= 0) powerupDrops.splice(i, 1);
        }

        // BULLETS
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            b.x += b.vx; b.y += b.vy; b.life--;

            if (frameCount % 2 === 0) {
                particles.push({
                    x: b.x, y: b.y, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
                    life: 10, maxLife: 10, size: rand(1, 3), color: '#ffcc00', type: 'trail'
                });
            }

            if (b.x < -30 || b.x > CONFIG.CANVAS_W + 30 || b.y < -30 || b.y > CONFIG.CANVAS_H + 30 || b.life <= 0) {
                bullets.splice(bi, 1); continue;
            }

            let hitObs = false;
            for (const obs of obstacles) {
                if (circleRectCollide(b.x, b.y, CONFIG.BULLET_RADIUS, obs)) {
                    createExplosion(b.x, b.y, 6, false);
                    playSound('hit');
                    hitObs = true; break;
                }
            }
            if (!hitObs) {
                for (const obs of extraObstacles) {
                    if (circleRectCollide(b.x, b.y, CONFIG.BULLET_RADIUS, obs)) {
                        createExplosion(b.x, b.y, 6, false);
                        playSound('hit');
                        hitObs = true; break;
                    }
                }
            }
            if (hitObs) { bullets.splice(bi, 1); continue; }

            let inSafeBase = false;
            for (const base of ctfBases) {
                if (circleRectCollide(b.x, b.y, CONFIG.BULLET_RADIUS, base) && !baseOpenToShooter(base, b.owner)) { inSafeBase = true; break; }
            }
            if (inSafeBase) { bullets.splice(bi, 1); continue; }

            let hitAlien = false;
            if (alienMapActive) {
                for (let ai = aliens.length - 1; ai >= 0; ai--) {
                    const a = aliens[ai];
                    if (dist(b.x, b.y, a.x, a.y) < a.size / 2 + CONFIG.BULLET_RADIUS) {
                        damageAlien(a, 1);
                        bullets.splice(bi, 1);
                        hitAlien = true;
                        break;
                    }
                }
            }
            if (hitAlien) continue;

            let hitTank = false;
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (!p.alive || i === b.owner) continue;
                if (teamModeEnabled && isSameTeam(players[b.owner], p)) continue;
                { const pb = tankInAnySafeBase(p); if (pb && !baseOpenToShooter(pb, b.owner)) continue; }
                const cx = p.x + CONFIG.TANK_SIZE / 2;
                const cy = p.y + CONFIG.TANK_SIZE / 2;
                if (dist(b.x, b.y, cx, cy) < CONFIG.TANK_SIZE / 2) {
                    damagePlayer(p, 1, 'bullet');
                    bullets.splice(bi, 1);
                    hitTank = true; break;
                }
            }
            if (hitTank) continue;
        }

        // MISSILES
        for (let mi = missiles.length - 1; mi >= 0; mi--) {
            const m = missiles[mi];
            const homingStrength = m.size >= CONFIG.LARGE_MISSILE_SIZE ? 0.09 : 0.05;
            let closest = null;
            let closestDist = 380;

            for (const p of players) {
                if (!p.alive || p.index === m.owner) continue;
                if (teamModeEnabled && isSameTeam(players[m.owner], p)) continue;
                { const pb = tankInAnySafeBase(p); if (pb && !baseOpenToShooter(pb, m.owner)) continue; }
                const d = dist(m.x, m.y, p.x + CONFIG.TANK_SIZE / 2, p.y + CONFIG.TANK_SIZE / 2);
                if (d < closestDist) { closestDist = d; closest = { x: p.x + CONFIG.TANK_SIZE / 2, y: p.y + CONFIG.TANK_SIZE / 2, type: 'player', ref: p }; }
            }
            if (alienMapActive) {
                for (const a of aliens) {
                    const d = dist(m.x, m.y, a.x, a.y);
                    if (d < closestDist) { closestDist = d; closest = { x: a.x, y: a.y, type: 'alien', ref: a }; }
                }
            }
            if (closest) {
                const targetAngle = Math.atan2(closest.y - m.y, closest.x - m.x);
                const speed = Math.hypot(m.vx, m.vy);
                const currentAngle = Math.atan2(m.vy, m.vx);
                let diff = targetAngle - currentAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const newAngle = currentAngle + diff * homingStrength;
                m.vx = Math.cos(newAngle) * speed;
                m.vy = Math.sin(newAngle) * speed;
            }

            m.x += m.vx; m.y += m.vy; m.life--;

            m.trail.push({ x: m.x, y: m.y, life: 15 });
            if (m.trail.length > 12) m.trail.shift();
            for (const t of m.trail) t.life--;

            if (frameCount % 2 === 0) {
                particles.push({
                    x: m.x, y: m.y,
                    vx: rand(-0.8, 0.8), vy: rand(-0.8, 0.8),
                    life: 15, maxLife: 15, size: rand(3 * m.size, 5 * m.size),
                    color: m.color || '#ff6b3a', type: 'fire'
                });
            }

            if (m.x < -30 || m.x > CONFIG.CANVAS_W + 30 || m.y < -30 || m.y > CONFIG.CANVAS_H + 30 || m.life <= 0) {
                missiles.splice(mi, 1); continue;
            }

            const missileRadius = 6 * m.size;
            let hitObs = false;
            for (const obs of obstacles) {
                if (circleRectCollide(m.x, m.y, missileRadius, obs)) {
                    createExplosion(m.x, m.y, m.size >= CONFIG.LARGE_MISSILE_SIZE ? 15 : 8, m.size >= CONFIG.LARGE_MISSILE_SIZE);
                    playSound('hit');
                    hitObs = true; break;
                }
            }
            if (!hitObs) {
                for (const obs of extraObstacles) {
                    if (circleRectCollide(m.x, m.y, missileRadius, obs)) {
                        createExplosion(m.x, m.y, m.size >= CONFIG.LARGE_MISSILE_SIZE ? 15 : 8, m.size >= CONFIG.LARGE_MISSILE_SIZE);
                        playSound('hit');
                        hitObs = true; break;
                    }
                }
            }
            if (hitObs) { missiles.splice(mi, 1); continue; }

            let inSafeBase = false;
            for (const base of ctfBases) {
                if (circleRectCollide(m.x, m.y, missileRadius, base) && !baseOpenToShooter(base, m.owner)) { inSafeBase = true; break; }
            }
            if (inSafeBase) {
                createExplosion(m.x, m.y, 8, false);
                missiles.splice(mi, 1);
                continue;
            }

            let hitAlien = false;
            if (alienMapActive) {
                for (let ai = aliens.length - 1; ai >= 0; ai--) {
                    const a = aliens[ai];
                    if (dist(m.x, m.y, a.x, a.y) < a.size / 2 + missileRadius) {
                        damageAlien(a, m.damage || 1);
                        missiles.splice(mi, 1);
                        hitAlien = true;
                        break;
                    }
                }
            }
            if (hitAlien) continue;

            let hitTank = false;
            for (let i = 0; i < players.length; i++) {
                const p = players[i];
                if (!p.alive || i === m.owner) continue;
                if (teamModeEnabled && isSameTeam(players[m.owner], p)) continue;
                if (tankInAnySafeBase(p)) continue;
                const cx = p.x + CONFIG.TANK_SIZE / 2;
                const cy = p.y + CONFIG.TANK_SIZE / 2;
                if (dist(m.x, m.y, cx, cy) < CONFIG.TANK_SIZE / 2 + missileRadius) {
                    damagePlayer(p, m.damage || 1, 'missile');
                    if (m.size >= CONFIG.LARGE_MISSILE_SIZE) {
                        createExplosion(m.x, m.y, 25, true);
                        playSound('explosion');
                    }
                    missiles.splice(mi, 1);
                    hitTank = true; break;
                }
            }
            if (hitTank) continue;
        }

        updateCosmetics();

        // WIN CHECK
        if (gameActive && !ctfModeEnabled && !territoryMapActive) {
            const alive = players.filter(p => p.alive);
            if (teamModeEnabled) {
                const aliveTeams = new Set(alive.map(p => teamAssignments[p.index]));
                if (aliveTeams.size === 1 && alive.length > 0) {
                    gameActive = false;
                    const winningTeam = alive[0].team;
                    showTeamWinModal(winningTeam, alive);
                } else if (alive.length === 0) {
                    gameActive = false;
                    showDrawModal();
                }
            } else {
                if (alive.length === 1) {
                    gameActive = false;
                    winnerIndex = alive[0].index;
                    showWinModal(alive[0]);
                } else if (alive.length === 0 && players.length > 0) {
                    gameActive = false;
                    showDrawModal();
                }
            }
        }
    }

    // particles / explosions / splashes / tracks / screen-shake (shared by local play and online guests)
    function updateCosmetics() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx; pt.y += pt.vy;
            pt.vx *= 0.96; pt.vy *= 0.96;
            pt.life--;
            if (pt.life <= 0) particles.splice(i, 1);
        }
        for (let i = explosions.length - 1; i >= 0; i--) {
            const ex = explosions[i];
            ex.radius += (ex.maxRadius - ex.radius) * 0.18;
            ex.life--;
            if (ex.life <= 0) explosions.splice(i, 1);
        }
        for (let i = mudSplashes.length - 1; i >= 0; i--) {
            const ms = mudSplashes[i];
            ms.x += ms.vx; ms.y += ms.vy;
            ms.vx *= 0.9; ms.vy *= 0.9; ms.vy += 0.1;
            ms.life--;
            if (ms.life <= 0) mudSplashes.splice(i, 1);
        }
        for (let i = lavaBubbles.length - 1; i >= 0; i--) {
            const lb = lavaBubbles[i];
            lb.y += lb.vy;
            lb.life--;
            if (lb.life <= 0) lavaBubbles.splice(i, 1);
        }
        for (let i = tracks.length - 1; i >= 0; i--) {
            tracks[i].life--;
            tracks[i].alpha = (tracks[i].life / 180) * 0.25;
            if (tracks[i].life <= 0) tracks.splice(i, 1);
        }

        if (screenShake > 0) screenShake *= 0.88;
        if (screenShake < 0.3) screenShake = 0;
    }

    function applyPowerup(p, type) {
        switch (type) {
            case 'shield': p.shield = CONFIG.SHIELD_HITS; break;
            case 'health': p.hits = Math.max(0, p.hits - CONFIG.HEALTH_POWERUP_AMOUNT); break;
            case 'missile3':
            case 'missile8':
            case 'largeMissile':
                p.missilePower = { type, timer: CONFIG.POWERUP_DURATION };
                p.hasPowerup = true;
                break;
        }
    }

    function tankCollides(tank, ignoreIndex) {
        const tr = { x: tank.x, y: tank.y, w: CONFIG.TANK_SIZE, h: CONFIG.TANK_SIZE };
        for (const obs of obstacles) if (rectCollide(tr, obs)) return true;
        for (const obs of extraObstacles) if (rectCollide(tr, obs)) return true;
        for (let i = 0; i < players.length; i++) {
            if (i === ignoreIndex) continue;
            const o = players[i];
            if (!o.alive) continue;
            if (rectCollide(tr, { x: o.x, y: o.y, w: CONFIG.TANK_SIZE, h: CONFIG.TANK_SIZE })) return true;
        }
        return false;
    }

    // ============================================================
    //  MODALS
    // ============================================================
    function showWinModal(winner) {
        saveLastWinnerToStorage(winner.name);
        updateControlsPanel();
        updateHUD();

        modalTitle.textContent = `${winner.name} WINS!`;
        modalTitle.style.color = winner.lightColor;
        modalTitle.style.textShadow = `0 0 30px ${winner.color}, 2px 2px 0 #1e2b16`;
        modalSubtitle.textContent = `Congratulations ${winner.name}, you dominated the arena! 👑`;
        winModal.classList.add('active');
        playSound('win');
    }

    function showTeamWinModal(teamId, survivors) {
        const teamCol = getTeamColor(teamId);
        const teamName = teamId === 0 ? 'BLUE TEAM' : 'RED TEAM';

        if (survivors.length > 0) {
            saveLastWinnerToStorage(survivors[0].name);
        }
        updateControlsPanel();
        updateHUD();

        modalTitle.textContent = `${teamName} WINS!`;
        modalTitle.style.color = teamCol.light;
        modalTitle.style.textShadow = `0 0 30px ${teamCol.color}, 2px 2px 0 #1e2b16`;

        const survivorNames = survivors.map(s => s.name).join(' & ');
        modalSubtitle.textContent = `Victory for ${teamName}! Survivors: ${survivorNames} 🏆`;
        winModal.classList.add('active');
        playSound('teamWin');
    }

    function showDrawModal() {
        modalTitle.textContent = `DRAW!`;
        modalTitle.style.color = '#e8d44d';
        modalTitle.style.textShadow = `0 0 30px rgba(232, 212, 77, 0.5), 2px 2px 0 #1e2b16`;
        modalSubtitle.textContent = `All tanks destroyed. Nobody survived.`;
        winModal.classList.add('active');
        playSound('draw');
    }

    function showTimeUpModal() {
        modalTitle.textContent = `TIME'S UP!`;
        modalTitle.style.color = '#e8d44d';
        modalTitle.style.textShadow = `0 0 30px rgba(232, 212, 77, 0.6), 2px 2px 0 #1e2b16`;

        const alive = players.filter(p => p.alive);
        if (ctfModeEnabled) {
            modalSubtitle.textContent = `⏰ Time ran out — nobody captured all the flags. It's a TIE!`;
        } else if (teamModeEnabled) {
            const aliveTeams = new Set(alive.map(p => teamAssignments[p.index]));
            if (aliveTeams.size === 1 && alive.length > 0) {
                const teamId = alive[0].team;
                const teamName = teamId === 0 ? 'BLUE TEAM' : 'RED TEAM';
                modalSubtitle.textContent = `⏰ Time ran out. ${teamName} was ahead — but it's a TIE!`;
            } else {
                modalSubtitle.textContent = `⏰ Time ran out with ${aliveTeams.size} teams still fighting. It's a TIE!`;
            }
        } else {
            if (alive.length === 0) {
                modalSubtitle.textContent = `Nobody survived the battle. It's a TIE!`;
            } else {
                modalSubtitle.textContent = `${alive.length} tank${alive.length > 1 ? 's' : ''} still standing. It's a TIE!`;
            }
        }
        winModal.classList.add('active');
        playSound('draw');
    }

    function showTerritoryTimeUpModal() {
        modalTitle.textContent = `TIME'S UP!`;
        modalTitle.style.color = '#e8d44d';
        modalTitle.style.textShadow = `0 0 30px rgba(232, 212, 77, 0.6), 2px 2px 0 #1e2b16`;

        let winnerIdx = -1;
        let maxScore = -1;
        let tie = false;
        if (teamModeEnabled) {
            const t0 = territoryScores[0] || 0;
            const t1 = territoryScores[1] || 0;
            if (t0 > t1) { winnerIdx = 0; maxScore = t0; }
            else if (t1 > t0) { winnerIdx = 1; maxScore = t1; }
            else { tie = true; }
        } else {
            for (let i = 0; i < playerCount; i++) {
                const s = territoryScores[i] || 0;
                if (s > maxScore) { maxScore = s; winnerIdx = i; tie = false; }
                else if (s === maxScore) { tie = true; }
            }
        }

        if (tie || winnerIdx < 0) {
            modalSubtitle.textContent = `⏰ Time ran out — it's a TIE! Nobody captured more territory.`;
        } else if (teamModeEnabled) {
            const teamCol = getTeamColor(winnerIdx);
            const teamName = winnerIdx === 0 ? 'BLUE TEAM' : 'RED TEAM';
            modalTitle.textContent = `${teamName} WINS!`;
            modalTitle.style.color = teamCol.light;
            modalTitle.style.textShadow = `0 0 30px ${teamCol.color}, 2px 2px 0 #1e2b16`;
            modalSubtitle.textContent = `Captured ${maxScore} territories! 🚩 🏆`;
            playSound('teamWin');
            winModal.classList.add('active');
            return;
        } else {
            const wp = players[winnerIdx];
            if (wp) {
                saveLastWinnerToStorage(wp.name);
                modalTitle.textContent = `${wp.name} WINS!`;
                modalTitle.style.color = wp.lightColor;
                modalTitle.style.textShadow = `0 0 30px ${wp.color}, 2px 2px 0 #1e2b16`;
                modalSubtitle.textContent = `Captured ${maxScore} territories! 🚩 🏆`;
                playSound('win');
                winModal.classList.add('active');
                return;
            }
        }
        winModal.classList.add('active');
        playSound('draw');
    }

    // ============================================================
    //  SETTINGS MODAL
    // ============================================================
    function openSettings() {
        initAudio();
        if (gameActive && !gamePaused) {
            gamePaused = true;
            settingsPausedGame = true;
            updatePauseButton();
        }
        pendingConfigs = deepCloneConfigs(playerConfigs);
        pendingTeamAssignments = [...teamAssignments];
        settingsActiveTab = 0;
        listeningAction = null;
        settingsError.textContent = '';
        renderSettingsTabs();
        renderSettingsBody();
        settingsModal.classList.add('active');
    }

    function renderSettingsTabs() {
        let html = '';
        for (let i = 0; i < playerCount; i++) {
            const cfg = pendingConfigs[i];
            const pal = COLOR_PALETTE[cfg.colorIndex];
            const cls = `settings-tab ${i === settingsActiveTab ? 'active' : ''}`;
            html += `<button class="${cls}" data-tab="${i}">
                <span class="tab-color-dot" style="background:${pal.color};color:${pal.color}"></span>
                P${i + 1}: ${escapeHtml(cfg.name || DEFAULT_NAMES[i])}
            </button>`;
        }
        const isGameTab = settingsActiveTab === 'game';
        const isControlsTab = settingsActiveTab === 'controls';
        const isMapTab = settingsActiveTab === 'maps';
        html += `<button class="settings-tab controls-tab ${isControlsTab ? 'active' : ''}" data-tab="controls">
            <span style="font-size:0.9rem">🎮</span> CONTROLS
        </button>`;
        html += `<button class="settings-tab game-tab ${isGameTab ? 'active' : ''}" data-tab="game">
            <span style="font-size:0.9rem">⚙️</span> GAME MODE
        </button>`;
        html += `<button class="settings-tab maps-tab ${isMapTab ? 'active' : ''}" data-tab="maps">
            <span style="font-size:0.9rem">🗺️</span> MAPS
        </button>`;
        settingsTabs.innerHTML = html;

        settingsTabs.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const val = tab.dataset.tab;
                if (val === 'game' || val === 'maps' || val === 'controls') settingsActiveTab = val;
                else settingsActiveTab = parseInt(val);
                listeningAction = null;
                settingsError.textContent = '';
                renderSettingsTabs();
                renderSettingsBody();
                playSound('click');
            });
        });
    }

    function renderControlsOverview() {
        let html = '<div class="setting-section"><h3>🎮 Controls</h3>';
        if (mobileMode) {
            html += `<div class="layout-card"><h3 style="margin-top:0">📐 Touch control layout</h3>
                <div class="instructions-note">
                    Place <strong>every control</strong> (move joystick, aim pad and MANUAL/AUTO button) of <strong>every player</strong>
                    anywhere on the screen. Your layout is saved on this device (separately for portrait and landscape).
                </div>
                <div class="modal-buttons" style="justify-content:flex-start;margin-top:10px">
                    <button class="modal-btn play-again" id="editLayoutBtn">✋ EDIT LAYOUT</button>
                    <button class="modal-btn change-players" id="resetLayoutBtn">↺ RESET ALL</button>
                </div></div>`;
            html += `<div class="instructions-note">
                📱 <strong>Touch mode:</strong> the <strong>left joystick</strong> drives your tank. The <strong>💥 aim pad</strong> controls the gun —
                drag it to point the gun in any direction, then <strong>release to fire</strong> (a quick tap fires the way the gun already points).
                The small <strong>MANUAL / AUTO</strong> button above your controls lets you choose: MANUAL = you aim, AUTO = the gun spins by itself and a tap fires.
            </div>`;
        } else {
            html += `<div class="instructions-note">Keys for every player. To change them, open that player's tab.</div>`;
        }
        html += '<div class="ctrl-list">';
        for (let i = 0; i < playerCount; i++) {
            const cfg = pendingConfigs[i];
            const col = teamModeEnabled ? getTeamColor(pendingTeamAssignments[i]).color : (COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[0]).color;
            const k = cfg.keys;
            const key = (c) => `<span class="control-key">${formatKeyName(c)}</span>`;
            html += `<div class="ctrl-card" style="border-left-color:${col}">
                <div class="ctrl-card-name"><span class="player-dot" style="background:${col};color:${col}"></span>${escapeHtml(cfg.name || DEFAULT_NAMES[i])}</div>`;
            if (!mobileMode) {
                html += `<div class="ctrl-card-keys">
                    <div class="ctrl-group"><span class="ctrl-label">Move</span>${key(k.up)}${key(k.left)}${key(k.down)}${key(k.right)}</div>
                    <div class="ctrl-group"><span class="ctrl-label">Shoot</span>${key(k.shoot)}</div>
                    <div class="ctrl-group"><span class="ctrl-label">Turret ◀ ▶</span>${key(k.rotateL)}${key(k.rotateR)}</div>
                </div>`;
            }
            html += `</div>`;
        }
        html += '</div>';
        html += '</div>';
        settingsBody.innerHTML = html;
        if (mobileMode) {
            document.getElementById('editLayoutBtn').addEventListener('click', () => { playSound('click'); enterLayoutEdit(); });
            document.getElementById('resetLayoutBtn').addEventListener('click', (e) => {
                controlLayout = { scale: 1, landscape: {}, portrait: {} };
                saveControlLayout();
                applyControlLayout();
                e.target.textContent = '✓ RESET DONE';
                playSound('click');
            });
        }
    }

    function enterLayoutEdit() {
        listeningAction = null;
        settingsModal.classList.remove('active');
        layoutEditMode = true;
        document.body.classList.add('layout-edit');
        const bar = document.getElementById('layoutEditBar');
        bar.style.left = ''; bar.style.top = ''; bar.style.transform = '';
        bar.classList.add('active');
        document.getElementById('layoutScale').value = Math.round(controlLayout.scale * 100);
        if (gameActive && !gamePaused) {
            gamePaused = true;
            settingsPausedGame = true;
            updatePauseButton();
        }
        touchStick = [null, null, null, null];
        touchAim = [null, null, null, null];
        applyControlLayout();
    }

    function exitLayoutEdit() {
        layoutEditMode = false;
        document.body.classList.remove('layout-edit');
        document.getElementById('layoutEditBar').classList.remove('active');
        saveControlLayout();
        if (settingsPausedGame) {
            settingsPausedGame = false;
            gamePaused = false;
            updatePauseButton();
            updatePauseOverlay();
            canvas.focus();
        }
    }

    function renderSettingsBody() {
        if (settingsActiveTab === 'controls') {
            renderControlsOverview();
            return;
        }
        if (settingsActiveTab === 'game') {
            renderGameModeSettings();
            return;
        }
        if (settingsActiveTab === 'maps') {
            renderMapSettings();
            return;
        }
        const i = settingsActiveTab;
        const cfg = pendingConfigs[i];
        const pal = COLOR_PALETTE[cfg.colorIndex];
        let html = '';

        html += `<div class="setting-section">
            <h3>Player ${i + 1} — Identity</h3>
            <div class="setting-row">
                <label>Display Name</label>
                <input type="text" class="setting-input" id="nameInput" maxlength="12" value="${escapeHtml(cfg.name)}" placeholder="Enter name...">
            </div>
        </div>`;

        if (teamModeEnabled) {
            html += `<div class="setting-section">
                <h3>Tank Color</h3>
                <div class="instructions-note" style="border-left-color:#6a8ab5;background:rgba(40,60,90,0.4);">
                    🛡️ <strong>Team Mode is ON</strong> — colors are assigned by team automatically.
                </div>
            </div>`;
        } else {
            html += `<div class="setting-section">
                <h3>Tank Color</h3>
                <div class="color-swatches" id="colorSwatches">`;
            for (let ci = 0; ci < COLOR_PALETTE.length; ci++) {
                const c = COLOR_PALETTE[ci];
                let takenBy = -1;
                for (let j = 0; j < playerCount; j++) {
                    if (j !== i && pendingConfigs[j].colorIndex === ci) { takenBy = j; break; }
                }
                const isSelected = cfg.colorIndex === ci;
                const isTaken = takenBy !== -1;
                const classes = `color-swatch ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`;
                html += `<div class="${classes}" data-color="${ci}" style="background:${c.color}" title="${c.name}${isTaken ? ' — taken by P' + (takenBy + 1) : ''}"></div>`;
            }
            html += `</div></div>`;
        }

        html += `<div class="setting-section">
            <h3>Key Bindings</h3>
            <div class="instructions-note">
                Click a key button below, then press the desired key. Press <strong>ESC</strong> to cancel. Each key can only be used once across all players.
            </div>
            <div class="key-binding-grid">`;

        for (const action of ACTIONS) {
            const keyCode = cfg.keys[action.key];
            const isListening = listeningAction && listeningAction.playerIndex === i && listeningAction.actionKey === action.key;
            const conflict = keyCode && hasAnyConflict(i, action.key, keyCode);
            const btnClass = `key-binding-btn ${isListening ? 'listening' : ''} ${conflict ? 'conflict' : ''}`;
            const btnLabel = isListening ? '...' : formatKeyName(keyCode);
            html += `<div class="key-binding-item">
                <span class="key-label">${action.label}</span>
                <button class="${btnClass}" data-action="${action.key}">${btnLabel}</button>
            </div>`;
        }

        html += `</div></div>`;

        settingsBody.innerHTML = html;

        const nameInput = document.getElementById('nameInput');
        nameInput.addEventListener('input', (e) => {
            pendingConfigs[i].name = e.target.value.substring(0, 12) || DEFAULT_NAMES[i];
            const tab = settingsTabs.querySelector(`[data-tab="${i}"]`);
            if (tab) {
                tab.innerHTML = `<span class="tab-color-dot" style="background:${pal.color};color:${pal.color}"></span>P${i + 1}: ${escapeHtml(pendingConfigs[i].name)}`;
            }
        });

        if (!teamModeEnabled) {
            document.getElementById('colorSwatches').querySelectorAll('.color-swatch').forEach(sw => {
                sw.addEventListener('click', () => {
                    const ci = parseInt(sw.dataset.color);
                    let taken = false;
                    for (let j = 0; j < playerCount; j++) {
                        if (j !== i && pendingConfigs[j].colorIndex === ci) { taken = true; break; }
                    }
                    if (taken) {
                        settingsError.textContent = `⚠ That color is already in use by another player.`;
                        playSound('click');
                        return;
                    }
                    pendingConfigs[i].colorIndex = ci;
                    settingsError.textContent = '';
                    playSound('click');
                    renderSettingsTabs();
                    renderSettingsBody();
                });
            });
        }

        settingsBody.querySelectorAll('.key-binding-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionKey = btn.dataset.action;
                if (listeningAction && listeningAction.playerIndex === i && listeningAction.actionKey === actionKey) {
                    listeningAction = null;
                } else {
                    listeningAction = { playerIndex: i, actionKey };
                }
                settingsError.textContent = '';
                playSound('click');
                renderSettingsBody();
            });
        });
    }

    function renderMapSettings() {
        let html = '';

        html += `<div class="setting-section">
            <h3>🎲 Map Selection</h3>
            <div class="instructions-note">
                Choose a specific map, or let the game <strong>randomly pick</strong> a new map for every match.
            </div>
            <div class="setting-row">
                <label>Random Maps Each Game</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="randomMapsToggle" ${randomMapsEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        html += `<div class="setting-section ${randomMapsEnabled ? 'disabled-section' : ''}" id="mapSelectSection">
            <h3>🗺️ Choose Map</h3>
            <div class="instructions-note">
                ${randomMapsEnabled ? '⚠ Disable <strong>Random Maps</strong> above to pick a specific map.' : 'Click a map to select it.'}
            </div>
            <div class="map-grid">`;

        for (let i = 0; i < MAPS.length; i++) {
            const m = MAPS[i];
            const sel = (!randomMapsEnabled && i === selectedMapIndex) ? 'selected' : '';
            const themeIcon = m.theme === 'lava' ? '🔥' : m.theme === 'mud' ? '💧' : m.theme === 'broken' ? '🕳️' :
                              m.theme === 'alien' ? '👽' : m.theme === 'territory' ? '🚩' : '🌿';
            const preview = renderMapPreview(m);
            html += `<div class="map-card ${sel}" data-map="${i}">
                <div class="map-preview">${preview}</div>
                <div class="map-info">
                    <div class="map-name">${themeIcon} ${escapeHtml(m.name)}</div>
                    <div class="map-desc">${escapeHtml(m.desc)}</div>
                </div>
            </div>`;
        }
        html += `</div></div>`;

        settingsBody.innerHTML = html;

        document.getElementById('randomMapsToggle').addEventListener('change', (e) => {
            randomMapsEnabled = e.target.checked;
            playSound('toggle');
            renderMapSettings();
        });

        if (!randomMapsEnabled) {
            settingsBody.querySelectorAll('.map-card').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = parseInt(card.dataset.map);
                    selectedMapIndex = idx;
                    playSound('mapSelect');
                    renderMapSettings();
                });
            });
        }
    }

    function renderMapPreview(map) {
        const w = 140, h = 60;
        let svg = `<svg viewBox="0 0 ${CONFIG.CANVAS_W} ${CONFIG.CANVAS_H}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet">`;

        let bg = '#3a5a2a';
        if (map.theme === 'lava') bg = '#2a1a10';
        else if (map.theme === 'mud') bg = '#3a4a2a';
        else if (map.theme === 'broken') bg = '#3a3a3a';
        else if (map.theme === 'alien') bg = '#1a0a2a';
        else if (map.theme === 'territory') bg = '#2a2a1a';
        svg += `<rect width="${CONFIG.CANVAS_W}" height="${CONFIG.CANVAS_H}" fill="${bg}"/>`;

        for (const l of (map.lava || [])) {
            svg += `<ellipse cx="${l.x + l.w/2}" cy="${l.y + l.h/2}" rx="${l.w/2}" ry="${l.h/2}" fill="#ff6600" opacity="0.75"/>`;
        }
        for (const m of map.mud) {
            const op = m.deep ? 0.85 : 0.5;
            svg += `<ellipse cx="${m.x + m.w/2}" cy="${m.y + m.h/2}" rx="${m.w/2}" ry="${m.h/2}" fill="#4a3018" opacity="${op}"/>`;
        }
        for (const o of map.obstacles) {
            svg += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#5a4530" stroke="#2a1a0a" stroke-width="4"/>`;
        }
        if (map.alienMap) {
            svg += `<circle cx="${CONFIG.CANVAS_W/2}" cy="200" r="30" fill="#66ff66" opacity="0.5"/>`;
            svg += `<circle cx="${CONFIG.CANVAS_W/2}" cy="${CONFIG.CANVAS_H-200}" r="30" fill="#66ff66" opacity="0.5"/>`;
        }
        if (map.territoryMap) {
            svg += `<circle cx="${CONFIG.CANVAS_W/2}" cy="130" r="40" fill="#ffee33" opacity="0.5"/>`;
            svg += `<circle cx="${CONFIG.CANVAS_W/2}" cy="${CONFIG.CANVAS_H/2}" r="40" fill="#ffee33" opacity="0.5"/>`;
            svg += `<circle cx="${CONFIG.CANVAS_W/2}" cy="${CONFIG.CANVAS_H-130}" r="40" fill="#ffee33" opacity="0.5"/>`;
        }
        svg += `</svg>`;
        return svg;
    }

    function renderGameModeSettings() {
        let html = '';

        html += `<div class="setting-section">
            <h3>⚠️ Giant Tank Event</h3>
            <div class="instructions-note">
                When enabled, a giant hostile tank periodically crosses the arena, dropping a power-up. Its red danger zone kills instantly.
            </div>
            <div class="setting-row">
                <label>Enable Giant Tank</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="giantTankToggle" ${giantTankEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        html += `<div class="setting-section">
            <h3>🏴 Capture The Flag</h3>
            <div class="instructions-note">
                Each player (or team) has a <strong>safe base</strong> in the corner — hazards cannot enter.
                Grab enemy flags and bring them back to win.
                <br><strong>Respawn:</strong> Destroyed tanks come back after 3 seconds.
            </div>
            <div class="setting-row">
                <label>Enable Capture The Flag</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="ctfModeToggle" ${ctfModeEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        html += `<div class="setting-section">
            <h3>🛡️ Team Mode</h3>
            <div class="instructions-note">
                When enabled, players are divided into <strong>Blue</strong> and <strong>Red</strong> teams. Teammates can't damage each other.
            </div>
            <div class="setting-row">
                <label>Enable Team Mode</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="teamModeToggle" ${teamModeEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        if (teamModeEnabled) {
            html += `<div class="setting-section">
                <h3>👥 Team Assignments</h3>
                <div class="instructions-note">Click a player to toggle their team.</div>
                <div class="team-assign-grid">`;

            for (let i = 0; i < playerCount; i++) {
                const team = pendingTeamAssignments[i];
                const teamCol = CONFIG.TEAM_COLORS[team];
                const cfg = pendingConfigs[i];
                const pal = COLOR_PALETTE[cfg.colorIndex];
                html += `<div class="team-assign-card team-${team}" data-player="${i}">
                    <div class="team-assign-player">
                        <span class="team-assign-dot" style="background:${pal.color}"></span>
                        <span class="team-assign-name">${escapeHtml(cfg.name || DEFAULT_NAMES[i])}</span>
                    </div>
                    <div class="team-assign-badge" style="background:${teamCol.color}">${team === 0 ? 'BLUE' : 'RED'}</div>
                </div>`;
            }
            html += `</div>`;

            const t0count = pendingTeamAssignments.slice(0, playerCount).filter(t => t === 0).length;
            const t1count = pendingTeamAssignments.slice(0, playerCount).filter(t => t === 1).length;
            if (t0count === 0 || t1count === 0) {
                html += `<div class="team-warning">⚠ Each team must have at least one player!</div>`;
            } else if (Math.abs(t0count - t1count) > 1) {
                html += `<div class="team-warning">⚠ Teams are unbalanced (${t0count} vs ${t1count})</div>`;
            }
            html += `</div>`;
        }

        html += `<div class="setting-section">
            <h3>⏱️ Time Mode</h3>
            <div class="instructions-note">
                When enabled, the game ends when the timer runs out.
            </div>
            <div class="setting-row">
                <label>Enable Time Limit</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="timeModeToggle" ${timeModeEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        html += `<div class="setting-section ${timeModeEnabled ? '' : 'disabled-section'}" id="timeDurationSection">
            <h3>⏳ Round Duration</h3>
            <div class="time-options-grid" id="timeOptionsGrid">`;

        const timeLabels = { 30: '30 sec', 60: '1 min', 120: '2 min', 180: '3 min', 240: '4 min', 420: '7 min' };
        for (const opt of CONFIG.TIME_OPTIONS) {
            const isSelected = timeDuration === opt;
            html += `<button class="time-option ${isSelected ? 'selected' : ''}" data-time="${opt}">${timeLabels[opt]}</button>`;
        }
        html += `</div></div>`;

        html += `<div class="setting-section ${timeModeEnabled ? '' : 'disabled-section'}" id="suddenDeathSection">
            <h3>💀 Sudden Death</h3>
            <div class="instructions-note">
                When the timer reaches <strong>30% remaining</strong>, sudden death activates. Tanks take damage every 5 seconds, hazards spawn faster, and the arena becomes increasingly deadly.
            </div>
            <div class="setting-row">
                <label>Enable Sudden Death</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="suddenDeathToggle" ${suddenDeathEnabled ? 'checked' : ''} ${timeModeEnabled ? '' : 'disabled'}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>`;

        settingsBody.innerHTML = html;

        document.getElementById('giantTankToggle').addEventListener('change', (e) => {
            giantTankEnabled = e.target.checked;
            playSound('toggle');
        });

        document.getElementById('ctfModeToggle').addEventListener('change', (e) => {
            ctfModeEnabled = e.target.checked;
            playSound('toggle');
            renderGameModeSettings();
        });

        document.getElementById('teamModeToggle').addEventListener('change', (e) => {
            teamModeEnabled = e.target.checked;
            playSound('toggle');
            renderGameModeSettings();
        });

        if (teamModeEnabled) {
            settingsBody.querySelectorAll('.team-assign-card').forEach(card => {
                card.addEventListener('click', () => {
                    const pi = parseInt(card.dataset.player);
                    pendingTeamAssignments[pi] = pendingTeamAssignments[pi] === 0 ? 1 : 0;
                    playSound('toggle');
                    renderGameModeSettings();
                });
            });
        }

        document.getElementById('timeModeToggle').addEventListener('change', (e) => {
            timeModeEnabled = e.target.checked;
            playSound('toggle');
            renderGameModeSettings();
        });

        const sdToggle = document.getElementById('suddenDeathToggle');
        if (sdToggle) {
            sdToggle.addEventListener('change', (e) => {
                if (e.target.disabled) return;
                suddenDeathEnabled = e.target.checked;
                playSound('toggle');
            });
        }

        document.querySelectorAll('.time-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!timeModeEnabled) {
                    settingsError.textContent = `⚠ Enable Time Limit first.`;
                    playSound('click');
                    return;
                }
                timeDuration = parseInt(btn.dataset.time);
                settingsError.textContent = '';
                playSound('mapSelect');
                document.querySelectorAll('.time-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    function hasAnyConflict(playerIndex, actionKey, keyCode) {
        const cfg = pendingConfigs[playerIndex];
        for (const action of ACTIONS) {
            if (action.key === actionKey) continue;
            if (cfg.keys[action.key] === keyCode) return true;
        }
        for (let j = 0; j < playerCount; j++) {
            if (j === playerIndex) continue;
            for (const action of ACTIONS) {
                if (pendingConfigs[j].keys[action.key] === keyCode) return true;
            }
        }
        return false;
    }

    function findKeyConflict(playerIndex, actionKey, keyCode) {
        const cfg = pendingConfigs[playerIndex];
        for (const action of ACTIONS) {
            if (action.key === actionKey) continue;
            if (cfg.keys[action.key] === keyCode) return `your own "${action.label}"`;
        }
        for (let j = 0; j < playerCount; j++) {
            if (j === playerIndex) continue;
            for (const action of ACTIONS) {
                if (pendingConfigs[j].keys[action.key] === keyCode) {
                    return `Player ${j + 1} (${pendingConfigs[j].name}) — "${action.label}"`;
                }
            }
        }
        return null;
    }

    function validateConfigs() {
        const usedKeys = new Map();
        for (let i = 0; i < playerCount; i++) {
            const cfg = pendingConfigs[i];
            for (const action of ACTIONS) {
                const code = cfg.keys[action.key];
                if (!code) return `Player ${i + 1} — "${action.label}" has no key assigned.`;
                if (usedKeys.has(code)) {
                    return `Key "${formatKeyName(code)}" is assigned to ${usedKeys.get(code)} and Player ${i + 1} (${action.label}).`;
                }
                usedKeys.set(code, `Player ${i + 1} (${action.label})`);
            }
        }
        for (let i = 0; i < playerCount; i++) {
            if (!pendingConfigs[i].name || pendingConfigs[i].name.trim() === '') {
                pendingConfigs[i].name = DEFAULT_NAMES[i];
            }
        }
        if (!teamModeEnabled) {
            const colors = new Set();
            for (let i = 0; i < playerCount; i++) {
                if (colors.has(pendingConfigs[i].colorIndex)) return `Color conflict detected.`;
                colors.add(pendingConfigs[i].colorIndex);
            }
        } else {
            const t0 = pendingTeamAssignments.slice(0, playerCount).filter(t => t === 0).length;
            const t1 = pendingTeamAssignments.slice(0, playerCount).filter(t => t === 1).length;
            if (t0 === 0) return `Blue Team needs at least one player.`;
            if (t1 === 0) return `Red Team needs at least one player.`;
        }
        return null;
    }

    // ============================================================
    //  DRAWING
    // ============================================================
    function draw() {
        const shakeX = screenShake > 0 ? rand(-screenShake, screenShake) : 0;
        const shakeY = screenShake > 0 ? rand(-screenShake, screenShake) : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        drawGround();
        for (const m of mudZones) drawMud(m);
        for (const l of lavaZones) drawLava(l);
        if (brokenFloorActive) for (const t of floorTiles) drawFloorTile(t);

        if (ctfModeEnabled) {
            for (const base of ctfBases) { drawCtfBase(base); drawBaseBreachWarning(base); }
        }

        if (territoryMapActive) {
            for (const t of territories) drawTerritoryPoint(t);
        }

        for (const t of tracks) {
            ctx.save();
            ctx.globalAlpha = t.alpha;
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.fillStyle = t.mud ? '#2a1a0a' : '#1a1a0f';
            ctx.fillRect(-2, -6, 4, 12);
            ctx.restore();
        }

        for (const obs of obstacles) drawObstacle(obs);
        for (const obs of extraObstacles) drawObstacle(obs, true);

        for (const ms of mudSplashes) {
            const alpha = ms.life / ms.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#3a2510';
            ctx.beginPath();
            ctx.arc(ms.x, ms.y, ms.size, 0, Math.PI * 2);
            ctx.fill();
        }
        for (const lb of lavaBubbles) {
            const alpha = lb.life / lb.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffcc33';
            ctx.beginPath();
            ctx.arc(lb.x, lb.y, lb.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const d of powerupDrops) drawPowerupDrop(d);

        if (ctfModeEnabled) {
            for (const flag of ctfFlags) {
                if (flag.carrier === null) drawFlag(flag);
            }
        }

        for (const b of bullets) {
            const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 16);
            grd.addColorStop(0, 'rgba(255, 220, 80, 0.9)');
            grd.addColorStop(0.5, 'rgba(255, 150, 0, 0.4)');
            grd.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff8d0';
            ctx.beginPath();
            ctx.arc(b.x, b.y, CONFIG.BULLET_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const m of missiles) {
            for (let ti = 0; ti < m.trail.length; ti++) {
                const t = m.trail[ti];
                const alpha = (t.life / 15) * (ti / m.trail.length) * 0.6;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = m.color || '#ff6b3a';
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3 * m.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            const radius = 18 * m.size;
            const grd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, radius);
            grd.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
            grd.addColorStop(0.5, 'rgba(255, 100, 50, 0.5)');
            grd.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(m.x, m.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = m.color || '#ffcc33';
            ctx.beginPath();
            ctx.arc(m.x, m.y, 5 * m.size, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const p of players) if (p.alive) drawTank(p);

        for (const a of aliens) drawAlien(a);

        if (ctfModeEnabled) {
            for (const flag of ctfFlags) {
                if (flag.carrier !== null) drawFlag(flag, true);
            }
        }

        for (const pt of particles) {
            const alpha = pt.life / pt.maxLife;
            ctx.globalAlpha = alpha;
            if (pt.type === 'fire') {
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            } else if (pt.type === 'spark') {
                ctx.fillStyle = pt.color;
                ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
            } else {
                ctx.fillStyle = pt.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        for (const ex of explosions) {
            const alpha = ex.life / ex.maxLife;
            const grd = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius);
            grd.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.9})`);
            grd.addColorStop(0.4, `rgba(255, 180, 50, ${alpha * 0.7})`);
            grd.addColorStop(0.7, `rgba(255, 80, 0, ${alpha * 0.4})`);
            grd.addColorStop(1, `rgba(100, 20, 0, 0)`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const p of players) if (!p.alive && (!ctfModeEnabled || p.respawnTimer <= 0)) drawWreck(p);

        if (giantTank) drawGiantTank();

        ctx.restore();

        if (suddenDeathActive) {
            const pulse = 0.5 + Math.sin(frameCount * 0.08) * 0.15;
            ctx.fillStyle = `rgba(120, 0, 0, ${pulse * 0.18})`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

            const redVg = ctx.createRadialGradient(
                CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.2,
                CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.85
            );
            redVg.addColorStop(0, 'rgba(180, 0, 0, 0)');
            redVg.addColorStop(0.6, `rgba(180, 0, 0, ${0.1 + pulse * 0.1})`);
            redVg.addColorStop(1, `rgba(120, 0, 0, ${0.35 + pulse * 0.15})`);
            ctx.fillStyle = redVg;
            ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        }

        if (alienMapActive) {
            ctx.fillStyle = 'rgba(60, 200, 60, 0.05)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        }

        const vg = ctx.createRadialGradient(
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.35,
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * 0.85
        );
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        if (currentMap && currentMap.theme === 'lava') {
            ctx.fillStyle = 'rgba(255, 60, 0, 0.06)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        }
    }

    function drawAlien(a) {
        const bob = Math.sin(frameCount * 0.15 + a.bobPhase) * 6;

        if (a.beamActive) {
            const pulse = 0.5 + Math.sin(frameCount * 0.4) * 0.3;
            const targetPlayer = a.target >= 0 ? players[a.target] : null;
            if (targetPlayer && targetPlayer.alive) {
                const tx = targetPlayer.x + CONFIG.TANK_SIZE / 2;
                const ty = targetPlayer.y + CONFIG.TANK_SIZE / 2;
                const beamGrd = ctx.createLinearGradient(a.x, a.y, tx, ty);
                beamGrd.addColorStop(0, `rgba(150, 255, 150, ${0.6 * pulse})`);
                beamGrd.addColorStop(1, `rgba(150, 255, 150, 0)`);
                ctx.fillStyle = beamGrd;
                ctx.beginPath();
                ctx.moveTo(a.x - 8, a.y);
                ctx.lineTo(tx - 10, ty);
                ctx.lineTo(tx + 10, ty);
                ctx.lineTo(a.x + 8, a.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.save();
        ctx.translate(a.x, a.y + bob);

        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, a.size * 1.5);
        glow.addColorStop(0, 'rgba(120, 255, 120, 0.5)');
        glow.addColorStop(1, 'rgba(120, 255, 120, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, a.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2a2a3a';
        ctx.beginPath();
        ctx.ellipse(0, 0, a.size, a.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#88ff88';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(150, 255, 150, 0.7)';
        ctx.beginPath();
        ctx.arc(0, -a.size * 0.3, a.size * 0.5, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#ccffcc';
        ctx.stroke();

        const numLights = 5;
        for (let i = 0; i < numLights; i++) {
            const angle = (i / numLights) * Math.PI * 2 + frameCount * 0.05;
            const lx = Math.cos(angle) * a.size * 0.7;
            const ly = Math.sin(angle) * a.size * 0.35;
            const lit = (Math.floor(frameCount / 10) + i) % numLights === 0;
            ctx.fillStyle = lit ? '#ffff88' : '#ff66ff';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = lit ? 15 : 6;
            ctx.beginPath();
            ctx.arc(lx, ly, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        if (a.hp < CONFIG.ALIEN_HP) {
            const barW = a.size;
            const barH = 4;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-barW / 2 - 1, -a.size - 15, barW + 2, barH + 2);
            const hpPct = a.hp / CONFIG.ALIEN_HP;
            ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : '#f44336';
            ctx.fillRect(-barW / 2, -a.size - 14, barW * hpPct, barH);
        }

        ctx.restore();
    }

    function drawTerritoryPoint(t) {
        const time = frameCount * 0.03;
        let color, lightColor;
        if (t.owner >= 0) {
            if (teamModeEnabled) {
                const tc = getTeamColor(t.owner);
                color = tc.color;
                lightColor = tc.light;
            } else {
                const cfg = playerConfigs[t.owner];
                const pal = COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[0];
                color = pal.color;
                lightColor = pal.light;
            }
        } else {
            color = '#cccccc';
            lightColor = '#ffffff';
        }
        if (t.contested) { color = '#ff5544'; lightColor = '#ffd0c8'; }

        ctx.save();
        // soft glow
        const glow = ctx.createRadialGradient(t.x, t.y, t.radius * 0.4, t.x, t.y, t.radius * 1.8);
        glow.addColorStop(0, `${color}55`);
        glow.addColorStop(1, `${color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // floor disc
        ctx.fillStyle = `${color}30`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();

        // outer rotating dashed ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -time * 8;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // inner counter-rotating ring
        ctx.strokeStyle = `${lightColor}99`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 10]);
        ctx.lineDashOffset = time * 10;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // capture progress arc
        if (t.progress > 0 && t.capturer >= 0) {
            let captColor;
            if (teamModeEnabled) captColor = getTeamColor(t.capturer).light;
            else {
                const cfg = playerConfigs[t.capturer];
                captColor = (COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[0]).light;
            }
            const pct = Math.min(1, t.progress / CONFIG.TERRITORY_CAPTURE_TIME);
            ctx.strokeStyle = captColor;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.shadowColor = captColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius - 9, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.lineCap = 'butt';
            ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(Math.floor(pct * 100) + '%', t.x, t.y + t.radius * 0.5);
            ctx.shadowBlur = 0;
        }

        // contested: pulsing red alert
        if (t.contested) {
            const f = 0.5 + 0.5 * Math.sin(frameCount * 0.35);
            ctx.strokeStyle = `rgba(255, 80, 60, ${0.5 + 0.5 * f})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius + 5 + f * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd0c8';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText('⚔ CONTESTED', t.x, t.y - t.radius - 14);
            ctx.shadowBlur = 0;
        }

        // flag (bigger on owned rings)
        ctx.font = `bold ${t.radius > 52 ? 34 : 28}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = lightColor;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('🚩', t.x, t.y + 2);
        ctx.restore();
    }

    function drawBaseBreachWarning(base) {
        if (!baseUnderThreat(base)) return;
        const f = 0.5 + 0.5 * Math.sin(frameCount * 0.3);
        ctx.save();
        ctx.fillStyle = `rgba(255, 40, 40, ${0.06 + 0.08 * f})`;
        ctx.fillRect(base.x, base.y, base.w, base.h);
        ctx.strokeStyle = `rgba(255, 70, 70, ${0.45 + 0.4 * f})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([14, 8]);
        ctx.lineDashOffset = -frameCount * 0.6;
        ctx.strokeRect(base.x - 6, base.y - 6, base.w + 12, base.h + 12);
        ctx.setLineDash([]);
        ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffc0b0';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText('⚠ SHIELD DOWN', base.x + base.w / 2, base.y + 14);
        ctx.restore();
    }

    function drawCtfBase(base) {
        const time = frameCount * 0.03;
        let color, lightColor;
        if (base.isTeam) {
            const tc = getTeamColor(base.teamId);
            color = tc.color;
            lightColor = tc.light;
        } else {
            const cfg = playerConfigs[base.owner];
            const pal = COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[0];
            color = pal.color;
            lightColor = pal.light;
        }

        ctx.fillStyle = `${color}25`;
        ctx.fillRect(base.x, base.y, base.w, base.h);

        const pulse = 0.6 + Math.sin(frameCount * 0.05) * 0.15;
        ctx.strokeStyle = `rgba(120, 200, 255, ${0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.strokeRect(base.x - 2, base.y - 2, base.w + 4, base.h + 4);
        ctx.setLineDash([]);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -time * 5;
        ctx.strokeRect(base.x, base.y, base.w, base.h);
        ctx.setLineDash([]);

        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 4;
        const cs = 20;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y + cs); ctx.lineTo(base.x, base.y); ctx.lineTo(base.x + cs, base.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(base.x + base.w - cs, base.y); ctx.lineTo(base.x + base.w, base.y); ctx.lineTo(base.x + base.w, base.y + cs);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(base.x, base.y + base.h - cs); ctx.lineTo(base.x, base.y + base.h); ctx.lineTo(base.x + cs, base.y + base.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(base.x + base.w - cs, base.y + base.h); ctx.lineTo(base.x + base.w, base.y + base.h); ctx.lineTo(base.x + base.w, base.y + base.h - cs);
        ctx.stroke();

        ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = lightColor;
        ctx.globalAlpha = 0.6;
        ctx.fillText('🛡️ SAFE', base.x + base.w / 2, base.y + 6);
        ctx.globalAlpha = 1;

        if (base.isTeam) {
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.fillText(base.teamId === 0 ? 'BLUE' : 'RED', base.x + base.w / 2, base.y + base.h / 2 + 20);
            ctx.globalAlpha = 1;
        }
    }

    function drawFlag(flag, carried) {
        const time = frameCount * 0.05;
        const bob = carried ? 0 : Math.sin(time) * 3;

        ctx.save();
        ctx.translate(flag.x, flag.y + bob);

        const glowColor = typeof flag.color === 'object' ? flag.color.color : flag.color;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#8b6b47';
        ctx.fillRect(-2, -22, 4, 30);
        ctx.shadowBlur = 0;

        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.moveTo(2, -22);
        ctx.lineTo(20, -18);
        ctx.lineTo(20, -8);
        ctx.lineTo(2, -12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText('★', 11, -15);

        if (!carried) {
            ctx.beginPath();
            ctx.arc(0, 8, 6, 0, Math.PI * 2);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawGround() {
        const theme = currentMap ? currentMap.theme : 'field';

        if (territoryMapActive) {
            const halfW = CONFIG.CANVAS_W / 2;
            if (teamModeEnabled) {
                const tc = getTeamColor(0);
                const grdL = ctx.createLinearGradient(0, 0, halfW, 0);
                grdL.addColorStop(0, `${tc.color}55`);
                grdL.addColorStop(1, `${tc.color}25`);
                ctx.fillStyle = grdL;
                ctx.fillRect(0, 0, halfW, CONFIG.CANVAS_H);

                const tc1 = getTeamColor(1);
                const grdR = ctx.createLinearGradient(halfW, 0, CONFIG.CANVAS_W, 0);
                grdR.addColorStop(0, `${tc1.color}25`);
                grdR.addColorStop(1, `${tc1.color}55`);
                ctx.fillStyle = grdR;
                ctx.fillRect(halfW, 0, halfW, CONFIG.CANVAS_H);
            } else {
                const grdL = ctx.createLinearGradient(0, 0, halfW, 0);
                grdL.addColorStop(0, 'rgba(192, 57, 43, 0.25)');
                grdL.addColorStop(1, 'rgba(192, 57, 43, 0.08)');
                ctx.fillStyle = grdL;
                ctx.fillRect(0, 0, halfW, CONFIG.CANVAS_H);

                const grdR = ctx.createLinearGradient(halfW, 0, CONFIG.CANVAS_W, 0);
                grdR.addColorStop(0, 'rgba(41, 128, 185, 0.08)');
                grdR.addColorStop(1, 'rgba(41, 128, 185, 0.25)');
                ctx.fillStyle = grdR;
                ctx.fillRect(halfW, 0, halfW, CONFIG.CANVAS_H);
            }

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 10]);
            ctx.beginPath();
            ctx.moveTo(halfW, 0);
            ctx.lineTo(halfW, CONFIG.CANVAS_H);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.1;
            for (let i = 0; i < 40; i++) {
                const x = (i * 137.5) % CONFIG.CANVAS_W;
                const y = (i * 219.3) % CONFIG.CANVAS_H;
                const r = 20 + (i % 5) * 15;
                ctx.fillStyle = '#3a4a2a';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            return;
        }

        const grd = ctx.createRadialGradient(
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, 150,
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_W * 0.7
        );
        if (suddenDeathActive) {
            grd.addColorStop(0, '#3a1a1a'); grd.addColorStop(0.5, '#2a1010'); grd.addColorStop(1, '#1a0808');
        } else if (theme === 'mud') {
            grd.addColorStop(0, '#4a5a35'); grd.addColorStop(0.5, '#3a4a2a'); grd.addColorStop(1, '#2a3518');
        } else if (theme === 'lava') {
            grd.addColorStop(0, '#3a2a1a'); grd.addColorStop(0.5, '#2a1a10'); grd.addColorStop(1, '#1a0f08');
        } else if (theme === 'broken') {
            grd.addColorStop(0, '#4a4a4a'); grd.addColorStop(0.5, '#3a3a3a'); grd.addColorStop(1, '#2a2a2a');
        } else if (theme === 'alien') {
            grd.addColorStop(0, '#1a2a1a'); grd.addColorStop(0.5, '#0f1f0f'); grd.addColorStop(1, '#050f05');
        } else {
            grd.addColorStop(0, '#4a6b3a'); grd.addColorStop(0.5, '#3a5a2a'); grd.addColorStop(1, '#2a4020');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 40; i++) {
            const x = (i * 137.5) % CONFIG.CANVAS_W;
            const y = (i * 219.3) % CONFIG.CANVAS_H;
            const r = 20 + (i % 5) * 15;
            if (suddenDeathActive) ctx.fillStyle = i % 2 === 0 ? '#5a2020' : '#3a1010';
            else if (theme === 'lava') ctx.fillStyle = i % 2 === 0 ? '#5a2a15' : '#3a1a10';
            else if (theme === 'broken') ctx.fillStyle = i % 2 === 0 ? '#5a5a5a' : '#4a4a4a';
            else if (theme === 'alien') ctx.fillStyle = i % 2 === 0 ? '#2a4a2a' : '#1a3a1a';
            else ctx.fillStyle = i % 2 === 0 ? '#5a4a2a' : '#3a4a2a';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (theme === 'alien') {
            ctx.fillStyle = 'rgba(200, 255, 200, 0.4)';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 173.7) % CONFIG.CANVAS_W;
                const sy = (i * 293.1) % CONFIG.CANVAS_H;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.strokeStyle = suddenDeathActive ? 'rgba(120, 20, 20, 0.5)' :
                          theme === 'lava' ? 'rgba(90, 40, 20, 0.4)' :
                          theme === 'broken' ? 'rgba(80, 80, 80, 0.4)' :
                          theme === 'alien' ? 'rgba(80, 180, 80, 0.3)' :
                          'rgba(60, 90, 50, 0.3)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CONFIG.CANVAS_W; x += 60) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.CANVAS_H); ctx.stroke();
        }
        for (let y = 0; y < CONFIG.CANVAS_H; y += 60) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_W, y); ctx.stroke();
        }
    }

    function drawMud(mud) {
        const grd = ctx.createRadialGradient(
            mud.x + mud.w / 2, mud.y + mud.h / 2, 10,
            mud.x + mud.w / 2, mud.y + mud.h / 2, Math.max(mud.w, mud.h) / 1.5
        );
        if (mud.deep) {
            grd.addColorStop(0, 'rgba(45, 30, 15, 0.95)');
            grd.addColorStop(0.6, 'rgba(55, 38, 20, 0.85)');
            grd.addColorStop(1, 'rgba(70, 50, 30, 0.2)');
        } else {
            grd.addColorStop(0, 'rgba(75, 55, 30, 0.7)');
            grd.addColorStop(0.6, 'rgba(85, 62, 35, 0.55)');
            grd.addColorStop(1, 'rgba(90, 70, 40, 0.1)');
        }
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(mud.x + mud.w / 2, mud.y + mud.h / 2, mud.w / 2, mud.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = mud.deep ? 'rgba(30, 20, 10, 0.7)' : 'rgba(60, 40, 20, 0.5)';
        const seed = mud.x + mud.y;
        for (let i = 0; i < 12; i++) {
            const bx = mud.x + ((seed * (i + 1) * 37) % mud.w);
            const by = mud.y + ((seed * (i + 1) * 53) % mud.h);
            const br = 2 + ((seed * i) % 4);
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();
        }

        if (mud.deep) {
            ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.ellipse(mud.x + mud.w / 2, mud.y + mud.h / 2, mud.w / 2 - 4, mud.h / 2 - 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawLava(lava) {
        const t = frameCount * 0.03 + lava.phase;
        const grd = ctx.createRadialGradient(
            lava.x + lava.w / 2, lava.y + lava.h / 2, 8,
            lava.x + lava.w / 2, lava.y + lava.h / 2, Math.max(lava.w, lava.h) / 1.6
        );
        const pulse = 0.5 + Math.sin(t) * 0.1;
        grd.addColorStop(0, `rgba(255, 240, 100, ${0.95})`);
        grd.addColorStop(0.3, `rgba(255, 160, 30, ${0.9})`);
        grd.addColorStop(0.6, `rgba(230, 70, 10, ${0.85})`);
        grd.addColorStop(1, `rgba(120, 20, 5, ${0.3})`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(lava.x + lava.w / 2, lava.y + lava.h / 2, lava.w / 2, lava.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 220, 80, ${pulse})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const ly = lava.y + (i + 0.5) * (lava.h / 4) + Math.sin(t + i) * 4;
            ctx.beginPath();
            ctx.moveTo(lava.x + 8, ly);
            for (let x = lava.x + 8; x < lava.x + lava.w - 8; x += 12) {
                const wy = ly + Math.sin(t * 2 + x * 0.05 + i) * 3;
                ctx.lineTo(x, wy);
            }
            ctx.stroke();
        }

        ctx.strokeStyle = `rgba(255, 100, 20, ${0.3 + Math.sin(t * 1.5) * 0.15})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(lava.x + lava.w / 2, lava.y + lava.h / 2, lava.w / 2 + 4, lava.h / 2 + 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawFloorTile(tile) {
        if (tile.state === 'solid') return;
        if (tile.state === 'warn') {
            const pulse = 0.4 + Math.sin(frameCount * 0.4) * 0.3;
            ctx.fillStyle = `rgba(255, 200, 50, ${pulse * 0.4})`;
            ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
            ctx.strokeStyle = `rgba(80, 50, 20, ${pulse + 0.3})`;
            ctx.lineWidth = 3;
            const cx = tile.x + tile.w / 2;
            const cy = tile.y + tile.h / 2;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(
                    cx + Math.cos(angle) * tile.w * 0.4 + rand(-5, 5),
                    cy + Math.sin(angle) * tile.h * 0.4 + rand(-5, 5)
                );
                ctx.stroke();
            }
            ctx.strokeStyle = `rgba(255, 200, 50, ${pulse + 0.3})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4);
        } else if (tile.state === 'falling') {
            const shake = tile.timer > 0 ? rand(-3, 3) : 0;
            ctx.globalAlpha = tile.timer / 20;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(tile.x + shake, tile.y + shake, tile.w, tile.h);
            ctx.globalAlpha = 1;
        } else if (tile.state === 'hole') {
            const grd = ctx.createRadialGradient(
                tile.x + tile.w / 2, tile.y + tile.h / 2, 5,
                tile.x + tile.w / 2, tile.y + tile.h / 2, tile.w / 1.5
            );
            grd.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
            grd.addColorStop(0.7, 'rgba(10, 5, 0, 0.95)');
            grd.addColorStop(1, 'rgba(20, 10, 5, 0.7)');
            ctx.fillStyle = grd;
            ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
            ctx.strokeStyle = 'rgba(60, 40, 20, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeRect(tile.x + 1, tile.y + 1, tile.w - 2, tile.h - 2);
        }
    }

    function drawPowerupDrop(d) {
        const bobY = Math.sin(d.bob) * 6;
        const pulse = 0.8 + Math.sin(frameCount * 0.15) * 0.2;
        const info = getPowerupInfo(d.type);
        const color = info.color;

        const glow = ctx.createRadialGradient(d.x, d.y + bobY, 0, d.x, d.y + bobY, 40 * pulse);
        glow.addColorStop(0, `rgba(${color}, 0.7)`);
        glow.addColorStop(0.5, `rgba(${color}, 0.3)`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(d.x, d.y + bobY, 40 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(d.x, d.y + bobY);
        ctx.rotate(Math.sin(frameCount * 0.05) * 0.15);
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-16, -16, 32, 32, 6);
        ctx.fill();
        ctx.strokeStyle = `rgb(${color})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-16, -16, 32, 32, 6);
        ctx.stroke();
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(info.icon, 0, 2);
        ctx.restore();

        if (d.life < 180 && frameCount % 20 < 10) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(d.x, d.y + bobY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGiantTank() {
        const g = giantTank;
        const S = g.size;

        const dangerPulse = 0.6 + Math.sin(frameCount * 0.12) * 0.4;
        const dangerGrd = ctx.createRadialGradient(g.x, g.y, S / 2, g.x, g.y, CONFIG.GIANT_TANK_DANGER_RADIUS);
        dangerGrd.addColorStop(0, `rgba(255, 0, 0, ${0.15 * dangerPulse})`);
        dangerGrd.addColorStop(0.6, `rgba(255, 0, 0, ${0.08 * dangerPulse})`);
        dangerGrd.addColorStop(1, `rgba(255, 0, 0, 0)`);
        ctx.fillStyle = dangerGrd;
        ctx.beginPath();
        ctx.arc(g.x, g.y, CONFIG.GIANT_TANK_DANGER_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 40, 40, ${0.7 * dangerPulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -frameCount * 0.8;
        ctx.beginPath();
        ctx.arc(g.x, g.y, CONFIG.GIANT_TANK_DANGER_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        ctx.strokeStyle = `rgba(255, 100, 100, ${0.4 * dangerPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.x, g.y, CONFIG.GIANT_TANK_DANGER_RADIUS + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.translate(g.x, g.y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(8, 12, S * 0.65, S * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-S / 2 - 8, -S / 2 - 4, S + 16, 16);
        ctx.fillRect(-S / 2 - 8, S / 2 - 12, S + 16, 16);

        ctx.fillStyle = '#1a1a1a';
        for (let i = -S / 2; i < S / 2; i += 12) {
            ctx.fillRect(i, -S / 2 - 4, 5, 16);
            ctx.fillRect(i, S / 2 - 12, 5, 16);
        }

        const grd = ctx.createLinearGradient(-S / 2, -S / 2, S / 2, S / 2);
        grd.addColorStop(0, '#4a4a4a');
        grd.addColorStop(0.5, '#2a2a2a');
        grd.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 6, -S / 2 + 6, S - 12, S - 12, 10);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 6, -S / 2 + 6, S - 12, S - 12, 10);
        ctx.stroke();

        ctx.save();
        ctx.rotate(g.angle);
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(0, 0, S / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(S / 3 - 5, -10, S / 2, 20);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(S / 3 - 5, -10, S / 2, 20);
        ctx.restore();

        ctx.fillStyle = '#ff2020';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-10, -5, 5, 0, Math.PI * 2);
        ctx.arc(10, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(-S / 2 + 10 + i * 15, S / 2 - 8, 8, 4);
        }
        ctx.restore();

        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('⚠ GIANT TANK ⚠', g.x, g.y - S / 2 - 20);
        ctx.shadowBlur = 0;
    }

    function drawObstacle(obs, isSuddenDeath) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.w / 2 + 4, obs.y + obs.h + 4, obs.w * 0.55, obs.h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        const grd = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.w, obs.y + obs.h);
        if (isSuddenDeath) {
            grd.addColorStop(0, '#6b2020');
            grd.addColorStop(0.5, '#4a1515');
            grd.addColorStop(1, '#2a0808');
        } else {
            grd.addColorStop(0, '#7a6040');
            grd.addColorStop(0.5, '#5a4530');
            grd.addColorStop(1, '#3a2a1a');
        }
        ctx.fillStyle = grd;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        ctx.fillStyle = isSuddenDeath ? 'rgba(255, 150, 150, 0.2)' : 'rgba(255, 230, 180, 0.2)';
        ctx.fillRect(obs.x, obs.y, obs.w, 4);

        ctx.strokeStyle = isSuddenDeath ? '#5a1010' : '#2a1a0a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);

        ctx.strokeStyle = 'rgba(30, 20, 10, 0.4)';
        ctx.lineWidth = 1.5;
        if (obs.w > obs.h) {
            ctx.beginPath();
            ctx.moveTo(obs.x + 4, obs.y + obs.h / 2);
            ctx.lineTo(obs.x + obs.w - 4, obs.y + obs.h / 2);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.w / 2, obs.y + 4);
            ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h - 4);
            ctx.stroke();
        }

        ctx.fillStyle = isSuddenDeath ? '#ff4444' : '#2a1a0a';
        if (isSuddenDeath) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 6;
        }
        const rivets = [
            [obs.x + 6, obs.y + 6], [obs.x + obs.w - 6, obs.y + 6],
            [obs.x + 6, obs.y + obs.h - 6], [obs.x + obs.w - 6, obs.y + obs.h - 6],
        ];
        for (const [rx, ry] of rivets) {
            ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    function drawTank(p) {
        const cx = p.x + CONFIG.TANK_SIZE / 2;
        const cy = p.y + CONFIG.TANK_SIZE / 2;
        const S = CONFIG.TANK_SIZE;

        ctx.save();
        ctx.translate(cx, cy);

        if (p.beingAbducted) {
            const pulse = 0.6 + Math.sin(frameCount * 0.4) * 0.4;
            const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 2);
            grd.addColorStop(0, `rgba(150, 255, 150, ${0.6 * pulse})`);
            grd.addColorStop(1, `rgba(150, 255, 150, 0)`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, S * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (p.shield > 0) {
            const pulse = 0.7 + Math.sin(frameCount * 0.15) * 0.3;
            const shieldGrd = ctx.createRadialGradient(0, 0, S / 2, 0, 0, S / 2 + 14);
            shieldGrd.addColorStop(0, 'rgba(34, 211, 238, 0)');
            shieldGrd.addColorStop(0.6, `rgba(34, 211, 238, ${0.35 * pulse})`);
            shieldGrd.addColorStop(1, `rgba(34, 211, 238, ${0.7 * pulse})`);
            ctx.fillStyle = shieldGrd;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.8 * pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 14, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (p.missilePower && p.missilePower.timer > 0) {
            const info = getPowerupInfo(p.missilePower.type);
            const pulse = 0.6 + Math.sin(frameCount * 0.25) * 0.4;
            ctx.strokeStyle = `rgba(${info.color}, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -frameCount * 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }

        if (suddenDeathActive) {
            const pulse = 0.4 + Math.sin(frameCount * 0.2) * 0.3;
            ctx.strokeStyle = `rgba(255, 60, 20, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 24, 0, Math.PI * 2);
            ctx.stroke();

            const auraGrd = ctx.createRadialGradient(0, 0, S / 2, 0, 0, S / 2 + 30);
            auraGrd.addColorStop(0, `rgba(255, 40, 20, 0)`);
            auraGrd.addColorStop(0.7, `rgba(255, 40, 20, ${0.15 * pulse})`);
            auraGrd.addColorStop(1, `rgba(255, 40, 20, ${0.35 * pulse})`);
            ctx.fillStyle = auraGrd;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 30, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(3, 5, S * 0.55, S * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(p.bodyAngle);

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-S / 2 - 2, -S / 2 - 1, S + 4, 7);
        ctx.fillRect(-S / 2 - 2, S / 2 - 6, S + 4, 7);

        ctx.fillStyle = '#2a2a2a';
        for (let i = -S / 2; i < S / 2; i += 6) {
            ctx.fillRect(i, -S / 2 - 1, 3, 7);
            ctx.fillRect(i, S / 2 - 6, 3, 7);
        }

        const hullGrd = ctx.createLinearGradient(-S / 2, -S / 2, S / 2, S / 2);
        hullGrd.addColorStop(0, p.lightColor);
        hullGrd.addColorStop(0.5, p.color);
        hullGrd.addColorStop(1, p.darkColor);
        ctx.fillStyle = hullGrd;
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 3, -S / 2 + 5, S - 6, S - 10, 5);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 5, -S / 2 + 7, S - 10, 5, 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 3, -S / 2 + 5, S - 6, S - 10, 5);
        ctx.stroke();

        ctx.fillStyle = p.darkColor;
        ctx.beginPath();
        ctx.moveTo(S / 2 - 4, -S / 2 + 8);
        ctx.lineTo(S / 2 + 2, -S / 2 + 14);
        ctx.lineTo(S / 2 + 2, S / 2 - 14);
        ctx.lineTo(S / 2 - 4, S / 2 - 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(-S / 2 + 12, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.save();
        ctx.rotate(p.turretAngle);

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(S / 2 - 4, -4, 26, 8);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(S / 2 + 18, -5, 6, 10);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(S / 2 - 4, -4, 26, 3);

        if (mobileMode) {
            // Aim guide: faint while spinning, red while locked on a shot
            const locked = p.aimLock > 0;
            ctx.save();
            ctx.setLineDash([6, 6]);
            ctx.strokeStyle = locked ? 'rgba(255, 80, 80, 0.9)' : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = locked ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.moveTo(S / 2 + 24, 0);
            ctx.lineTo(S / 2 + 24 + 160, 0);
            ctx.stroke();
            ctx.restore();
        }

        const turretGrd = ctx.createRadialGradient(-3, -3, 2, 0, 0, S / 2.5);
        turretGrd.addColorStop(0, p.lightColor);
        turretGrd.addColorStop(0.7, p.color);
        turretGrd.addColorStop(1, p.darkColor);
        ctx.fillStyle = turretGrd;
        ctx.beginPath();
        ctx.arc(0, 0, S / 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, S / 2.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-4, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (p.reload > 0) {
            const reloadPct = 1 - (p.reload / CONFIG.RELOAD_TIME);
            let reloadColor = 'rgba(255, 255, 255, 0.7)';
            if (p.missilePower && p.missilePower.timer > 0) {
                const info = getPowerupInfo(p.missilePower.type);
                reloadColor = `rgba(${info.color}, 0.9)`;
            }
            ctx.strokeStyle = reloadColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, S / 2 + 6, -Math.PI / 2, -Math.PI / 2 + reloadPct * Math.PI * 2);
            ctx.stroke();
        }

        const barW = S + 10;
        const barH = 5;
        const barX = -barW / 2;
        const barY = -S / 2 - 20;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        const hpPct = 1 - p.hits / CONFIG.MAX_HITS;
        const hpColor = hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ff9800' : '#f44336';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.font = 'bold 12px "Segoe UI", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isWinner = !teamModeEnabled && lastWinnerName && p.name === lastWinnerName;
        const nameY = barY - 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        const nameW = ctx.measureText(p.name).width + 16;
        ctx.beginPath();
        ctx.roundRect(-nameW / 2, nameY - 9, nameW, 16, 6);
        ctx.fill();

        ctx.fillStyle = p.lightColor;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(p.name, 0, nameY);
        ctx.shadowBlur = 0;

        if (isWinner) {
            ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ff9500';
            ctx.shadowBlur = 12;
            ctx.fillText('👑', 0, nameY - 20);
            ctx.shadowBlur = 0;
        }

        if (teamModeEnabled) {
            const teamCol = getTeamColor(p.team);
            ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = teamCol.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(p.team === 0 ? 'BLUE' : 'RED', 0, nameY - (isWinner ? 36 : 20));
            ctx.fillText(p.team === 0 ? 'BLUE' : 'RED', 0, nameY - (isWinner ? 36 : 20));
        }

        if (suddenDeathActive) {
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(255, 60, 60, ${0.7 + Math.sin(frameCount * 0.15) * 0.3})`;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 6;
            ctx.fillText('💀', 0, -S / 2 - 40);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    function drawWreck(p) {
        const cx = p.x + CONFIG.TANK_SIZE / 2;
        const cy = p.y + CONFIG.TANK_SIZE / 2;
        const S = CONFIG.TANK_SIZE;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(p.bodyAngle);

        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(-S / 2 + 3, -S / 2 + 5, S - 6, S - 10, 5);
        ctx.fill();

        ctx.fillStyle = 'rgba(40, 30, 20, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, S / 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#444';
        const t = frameCount * 0.02;
        for (let i = 0; i < 3; i++) {
            const sx = Math.sin(t + i * 2) * 8;
            const sy = -20 - i * 8 + Math.cos(t + i) * 4;
            ctx.beginPath();
            ctx.arc(sx, sy, 6 + i * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.strokeStyle = 'rgba(200, 50, 50, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy + 10);
        ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx - 10, cy + 10);
        ctx.stroke();
    }

    // ============================================================
    //  GAME LOOP
    // ============================================================
    function gameLoop() {
        if (isOnlineGuest()) guestFrame();
        else {
            update();
            if (ONLINE.active && ONLINE.role === 'host') hostNetTick();
        }
        draw();
        requestAnimationFrame(gameLoop);
    }

    // ============================================================
    //  EVENT LISTENERS
    // ============================================================
    document.querySelectorAll('.player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            initAudio();
            const count = parseInt(btn.dataset.count);
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            while (playerConfigs.length < count) playerConfigs.push(getDefaultConfigs()[playerConfigs.length]);
            resetGame(count);
        });
    });

    document.getElementById('resetButton').addEventListener('click', () => {
        initAudio(); resetGame(playerCount);
    });
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        initAudio(); resetGame(playerCount);
    });
    document.getElementById('changePlayersBtn').addEventListener('click', () => {
        if (ONLINE.active) { leaveOnline(); return; }
        winModal.classList.remove('active');
        playerSelectModal.classList.add('active');
    });

    document.querySelectorAll('#playerSelectModal .play-again').forEach(btn => {
        btn.addEventListener('click', () => {
            initAudio();
            const count = parseInt(btn.dataset.players);
            playerSelectModal.classList.remove('active');
            document.querySelectorAll('.player-btn').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.count) === count);
            });
            while (playerConfigs.length < count) playerConfigs.push(getDefaultConfigs()[playerConfigs.length]);
            resetGame(count);
        });
    });

    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsCancelBtn').addEventListener('click', () => {
        listeningAction = null;
        settingsModal.classList.remove('active');
        if (settingsPausedGame) {
            settingsPausedGame = false;
            gamePaused = false;
            updatePauseButton();
            updatePauseOverlay();
            canvas.focus();
        }
        playSound('click');
    });

    document.getElementById('settingsSaveBtn').addEventListener('click', () => {
        const err = validateConfigs();
        if (err) {
            settingsError.textContent = `⚠ ${err}`;
            playSound('click');
            return;
        }
        settingsPausedGame = false;
        playerConfigs = deepCloneConfigs(pendingConfigs);
        teamAssignments = [...pendingTeamAssignments];
        saveConfigsToStorage();
        saveTimeSettingsToStorage();
        saveTeamSettingsToStorage();
        saveCtfSettingsToStorage();
        saveMapSettingsToStorage();
        saveGiantTankSettingToStorage();
        settingsModal.classList.remove('active');
        resetGame(playerCount);
    });

    const pauseBtn = document.getElementById('pauseButton');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    [winModal, playerSelectModal].forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('active');
        });
    });

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    // ============================================================
    //  SAVE / RESTORE  (refreshing the page does NOT restart the game)
    // ============================================================
    const SAVED_GAME_KEY = 'tankBattle_savedGame_v1';
    const SAVED_GAME_MAX_AGE_MS = 12 * 60 * 60 * 1000;      // ignore saves older than 12 hours

    function snapshotGame() {
        return {
            v: 1,
            savedAt: Date.now(),
            playerCount, currentMapIndex, frameCount, winnerIndex, screenShake: 0,
            // settings the running round was started with
            teamModeEnabled, teamAssignments, ctfModeEnabled,
            timeModeEnabled, timeDuration, suddenDeathEnabled, giantTankEnabled,
            // world state (cosmetic stuff like particles / tracks is not saved)
            players, bullets, missiles, obstacles, extraObstacles, mudZones, lavaZones,
            floorTiles, brokenFloorActive, powerupDrops,
            giantTank, giantTankTimer, giantTankNextDelay, giantTankGiftDropped,
            timeRemainingFrames, suddenDeathActive, suddenDeathDamageTimer, suddenDeathHazardTimer,
            ctfBases, ctfFlags, ctfCaptured,
            alienMapActive, aliens, alienSpawnTimer, alienNextSpawn,
            territoryMapActive, territories, territoryScores,
        };
    }

    function saveGameState() {
        if (ONLINE.active) return;
        try {
            if (!gameActive || !players.length) {          // finished / not started: nothing to resume
                localStorage.removeItem(SAVED_GAME_KEY);
                return;
            }
            localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(snapshotGame()));
        } catch (e) {}
    }

    function clearSavedGame() {
        try { localStorage.removeItem(SAVED_GAME_KEY); } catch (e) {}
    }

    // returns true if a running game was restored
    function restoreGameState() {
        let snap = null;
        try {
            const raw = localStorage.getItem(SAVED_GAME_KEY);
            if (!raw) return false;
            snap = JSON.parse(raw);
        } catch (e) { return false; }
        try {
            if (!snap || snap.v !== 1 || !Array.isArray(snap.players) || snap.players.length < 2) return false;
            if (Date.now() - (snap.savedAt || 0) > SAVED_GAME_MAX_AGE_MS) { clearSavedGame(); return false; }

            // 1) rebuild the round exactly like a normal start (UI, map, controls...) on the SAME map & settings
            teamModeEnabled = !!snap.teamModeEnabled;
            if (Array.isArray(snap.teamAssignments)) teamAssignments = snap.teamAssignments;
            ctfModeEnabled = !!snap.ctfModeEnabled;
            timeModeEnabled = !!snap.timeModeEnabled;
            if (snap.timeDuration) timeDuration = snap.timeDuration;
            suddenDeathEnabled = !!snap.suddenDeathEnabled;
            giantTankEnabled = snap.giantTankEnabled !== false;
            while (playerConfigs.length < snap.playerCount) {
                playerConfigs.push(getDefaultConfigs()[playerConfigs.length]);
            }
            forcedMapIndex = snap.currentMapIndex;
            resetGame(snap.playerCount);

            // 2) overwrite the fresh world with the saved one
            players = snap.players;
            bullets = snap.bullets || [];
            missiles = snap.missiles || [];
            obstacles = snap.obstacles || [];
            extraObstacles = snap.extraObstacles || [];
            mudZones = snap.mudZones || [];
            lavaZones = snap.lavaZones || [];
            floorTiles = snap.floorTiles || [];
            brokenFloorActive = !!snap.brokenFloorActive;
            powerupDrops = snap.powerupDrops || [];
            giantTank = snap.giantTank || null;
            giantTankTimer = snap.giantTankTimer || 0;
            giantTankNextDelay = snap.giantTankNextDelay || giantTankNextDelay;
            giantTankGiftDropped = !!snap.giantTankGiftDropped;
            timeRemainingFrames = snap.timeRemainingFrames || 0;
            suddenDeathActive = !!snap.suddenDeathActive;
            suddenDeathDamageTimer = snap.suddenDeathDamageTimer || 0;
            suddenDeathHazardTimer = snap.suddenDeathHazardTimer || 0;
            ctfBases = snap.ctfBases || [];
            ctfFlags = snap.ctfFlags || [];
            ctfCaptured = snap.ctfCaptured || [];
            alienMapActive = !!snap.alienMapActive;
            aliens = snap.aliens || [];
            alienSpawnTimer = snap.alienSpawnTimer || 0;
            alienNextSpawn = snap.alienNextSpawn || alienNextSpawn;
            territoryMapActive = !!snap.territoryMapActive;
            territories = snap.territories || [];
            territoryScores = snap.territoryScores || [0, 0, 0, 0];
            frameCount = snap.frameCount || 0;
            winnerIndex = -1;
            particles = []; tracks = []; explosions = []; mudSplashes = []; lavaBubbles = [];

            // 3) come back PAUSED so the player is never surprised; one tap on Resume continues
            gameActive = true;
            gamePaused = true;
            keysPressed = {};
            touchStick = [null, null, null, null];
            touchAim = [null, null, null, null];
            updateControlsPanel();
            updateHUD();
            updateMapBadge();
            updatePauseButton();
            updatePauseOverlay();
            return true;
        } catch (e) {
            console.error('Could not restore saved game:', e);
            clearSavedGame();
            return false;
        }
    }

    // ============================================================
    //  ONLINE MULTIPLAYER  (Firebase Realtime Database, see online.js)
    //
    //  The room creator's device is the HOST: it runs the real game
    //  (physics, damage, power-ups, win checks...) exactly like local play.
    //  Friends are GUESTS: they send only their controls and draw the
    //  snapshots the host streams ~20 times a second.
    //  Each device controls ONE tank (the host = slot 0).
    // ============================================================
    const ONLINE = {
        active: false, role: null, code: '', lobby: false,
        mySlot: 0, count: 0, prevCount: 2, myName: '',
        names: [], slotUids: [], playersMap: {}, left: {},
        inputs: {}, lastFire: {}, round: 0, events: [], lastEv: {},
        lastStateT: 0,
        // guest side
        worldRound: -1, pendingState: null, stateT: 0, hudSig: '', timeSig: '', modalKey: '',
        fireSeq: 0, localAim: 0, aimInit: false, aimLock: 0,
        lastInputKey: '', lastInputT: 0,
    };
    const STATE_SEND_MS = 50;                       // 20 snapshots per second
    const isRemoteSlot = (i) => ONLINE.active && ONLINE.role === 'host' && i !== 0;
    const isOnlineGuest = () => ONLINE.active && ONLINE.role === 'guest';
    const byId = (id) => document.getElementById(id);
    const r2 = (v) => Math.round(v * 100) / 100;
    const numRound = (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

    function lerpAngle(a, b, t) {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    }

    // ------------------------------------------------------------
    //  HOST: world (once per round) + snapshots (continuously)
    // ------------------------------------------------------------
    function buildWorld() {
        return JSON.stringify({
            r: ONLINE.round, map: currentMapIndex, n: playerCount,
            tm: teamModeEnabled, ta: teamAssignments.slice(0, 4), ctf: ctfModeEnabled,
            tme: timeModeEnabled, td: timeDuration, sd: suddenDeathEnabled, gt: giantTankEnabled,
            am: alienMapActive, tmap: territoryMapActive, bf: brokenFloorActive,
            ob: obstacles, mud: mudZones, lava: lavaZones, bases: ctfBases,
            pl: players.map(p => ({
                index: p.index, name: p.name, color: p.color, lightColor: p.lightColor,
                darkColor: p.darkColor, team: p.team,
            })),
            slots: ONLINE.slotUids,
        }, numRound);
    }

    const FLOOR_CODE = { solid: 's', warn: 'w', falling: 'f', hole: 'h' };
    function buildState() {
        const modal = winModal.classList.contains('active')
            ? { t: modalTitle.textContent, s: modalSubtitle.textContent,
                c: modalTitle.style.color, sh: modalTitle.style.textShadow }
            : null;
        const st = {
            r: ONLINE.round, f: frameCount, a: gameActive ? 1 : 0, gp: gamePaused ? 1 : 0,
            tr: timeRemainingFrames, sdm: suddenDeathActive ? 1 : 0, sk: Math.round(screenShake),
            p: players.map(p => ({
                x: p.x, y: p.y, bodyAngle: p.bodyAngle, turretAngle: p.turretAngle,
                hits: p.hits, alive: p.alive, reload: p.reload, shield: p.shield,
                missilePower: p.missilePower, hasPowerup: p.hasPowerup, respawnTimer: p.respawnTimer,
                capturedFlags: p.capturedFlags, beingAbducted: p.beingAbducted,
                abductTimer: p.abductTimer, aimLock: p.aimLock, stuckTimer: p.stuckTimer,
            })),
            b: bullets,
            m: missiles.map(m => ({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, owner: m.owner, life: m.life,
                                    damage: m.damage, size: m.size, color: m.color })),
            pu: powerupDrops, gt: giantTank, al: aliens, fl: ctfFlags, cc: ctfCaptured,
            te: territories, ts: territoryScores, eo: extraObstacles,
            ft: brokenFloorActive ? floorTiles.map(t => FLOOR_CODE[t.state] || 's').join('') : '',
            mo: modal, ev: ONLINE.events,
        };
        return JSON.stringify(st, numRound);
    }

    function hostNetTick() {
        if (ONLINE.lobby || !ONLINE.round) return;
        const now = performance.now();
        const idle = gamePaused || !gameActive;
        const changed = idle !== ONLINE.lastIdle;                      // pause / resume / game over: tell everyone right away
        ONLINE.lastIdle = idle;
        const gap = idle ? 250 : STATE_SEND_MS;                        // idle screens need fewer updates
        if (!changed && now - ONLINE.lastStateT < gap) return;
        ONLINE.lastStateT = now;
        const json = buildState();
        ONLINE.events = [];
        TankNet.sendState(json);
    }

    // sound / explosion events are recorded on the host and replayed on the guests
    function netRecordSound(type) {
        if (type === 'click') return;
        if (ONLINE.events.length >= 40) return;
        const gap = (type === 'engine' || type === 'mud') ? 8 : 0;
        if (gap && frameCount - (ONLINE.lastEv[type] || -99) < gap) return;
        ONLINE.lastEv[type] = frameCount;
        if (ONLINE.events.some(e => e[0] === 's' && e[1] === type)) return;
        ONLINE.events.push(['s', type]);
    }
    function netRecordExplosion(x, y, count, big) {
        if (ONLINE.events.length >= 40) return;
        ONLINE.events.push(['x', Math.round(x), Math.round(y), count, big ? 1 : 0]);
    }

    // a friend left mid-game: their tank is removed so the match can still finish
    function markLeft(slot) {
        ONLINE.left[slot] = true;
        const p = players[slot];
        if (!p) return;
        if (p.alive) { p.hits = CONFIG.MAX_HITS; killPlayer(p, 'left'); }
        p.respawnTimer = 0;
        updateHUD();
    }

    // called at the end of every resetGame() while hosting
    function onlineHostNewRound() {
        ONLINE.round++;
        ONLINE.inputs = {};
        ONLINE.lastFire = {};
        players.forEach((p, i) => { if (ONLINE.names[i]) p.name = ONLINE.names[i]; });
        for (const s in ONLINE.left) markLeft(+s);
        updateControlsPanel();
        updateHUD();
        buildTouchControls();
        TankNet.setWorld(ONLINE.round, buildWorld());
        ONLINE.lastStateT = 0;
    }

    // ------------------------------------------------------------
    //  GUEST: apply world / snapshots, smooth, send controls
    // ------------------------------------------------------------
    function onWorld(round, json) {
        if (round === ONLINE.worldRound) return;
        let w;
        try { w = JSON.parse(json); } catch (e) { return; }
        const slot = (w.slots || []).indexOf(TankNet.uid());
        if (slot < 0) { leaveOnline('You are not part of this game (it started without you).'); return; }

        ONLINE.worldRound = round;
        ONLINE.round = round;
        ONLINE.mySlot = slot;
        ONLINE.count = w.n;
        ONLINE.lobby = false;
        ONLINE.aimInit = false;
        ONLINE.hudSig = ''; ONLINE.timeSig = ''; ONLINE.modalKey = '';
        ONLINE.pendingState = null;

        currentMapIndex = w.map;
        currentMap = MAPS[w.map] || MAPS[0];
        playerCount = w.n;
        teamModeEnabled = !!w.tm;
        teamAssignments = w.ta || [0, 0, 1, 1];
        ctfModeEnabled = !!w.ctf;
        timeModeEnabled = !!w.tme;
        timeDuration = w.td || 60;
        suddenDeathEnabled = !!w.sd;
        giantTankEnabled = w.gt !== false;
        alienMapActive = !!w.am;
        territoryMapActive = !!w.tmap;
        brokenFloorActive = !!w.bf;
        obstacles = w.ob || [];
        mudZones = w.mud || [];
        lavaZones = w.lava || [];
        ctfBases = w.bases || [];
        extraObstacles = [];

        floorTiles = [];
        if (brokenFloorActive) {
            const tw = 100, th = 100;
            const cols = Math.ceil(CONFIG.CANVAS_W / tw), rows = Math.ceil(CONFIG.CANVAS_H / th);
            for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
                floorTiles.push({ x: c * tw, y: rr * th, w: tw, h: th, state: 'solid', timer: 0 });
            }
        }

        players = (w.pl || []).map(sp => Object.assign({
            x: 0, y: 0, bodyAngle: 0, turretAngle: 0, hits: 0, alive: true, reload: 0, shield: 0,
            missilePower: null, hasPowerup: false, respawnTimer: 0, capturedFlags: [],
            beingAbducted: false, abductTimer: 0, aimLock: 0, stuckTimer: 0,
            moveSoundTimer: 0, lavaDamageTimer: 0, keys: playerConfigs[0].keys,
        }, sp));

        bullets = []; missiles = []; particles = []; tracks = []; explosions = [];
        mudSplashes = []; lavaBubbles = []; powerupDrops = []; giantTank = null;
        aliens = []; territories = []; ctfFlags = []; ctfCaptured = [];
        territoryScores = [0, 0, 0, 0];
        winnerIndex = -1; gameActive = true; gamePaused = false;
        frameCount = 0; screenShake = 0;
        suddenDeathActive = false;
        timeRemainingFrames = timeModeEnabled || territoryMapActive ? timeDuration * 60 : 0;

        winModal.classList.remove('active');
        byId('onlineModal').classList.remove('active');
        touchStick = [null, null, null, null];
        touchAim = [null, null, null, null];
        updateControlsPanel();
        updateHUD();
        updateMapBadge();
        updateTimeBadge();
        updatePauseButton();
        updatePauseOverlay();
        updateRoomBadge();
        buildTouchControls();
    }

    function applyState(s) {
        if (!s || s.r !== ONLINE.worldRound || !players.length) return;
        ONLINE.stateT = performance.now();

        gameActive = !!s.a;
        const wasPaused = gamePaused;
        gamePaused = !!s.gp;
        if (wasPaused !== gamePaused) updatePauseOverlay();
        timeRemainingFrames = s.tr || 0;
        suddenDeathActive = !!s.sdm;
        if (s.sk > screenShake) screenShake = s.sk;

        (s.p || []).forEach((d, i) => {
            const p = players[i];
            if (!p) return;
            const fresh = p.tx === undefined;
            p.tx = d.x; p.ty = d.y; p.tb = d.bodyAngle; p.tt = d.turretAngle;
            if (fresh) { p.x = d.x; p.y = d.y; p.bodyAngle = d.bodyAngle; p.turretAngle = d.turretAngle; }
            p.hits = d.hits; p.alive = d.alive; p.reload = d.reload; p.shield = d.shield;
            p.missilePower = d.missilePower || null; p.hasPowerup = !!d.hasPowerup;
            p.respawnTimer = d.respawnTimer || 0; p.capturedFlags = d.capturedFlags || [];
            p.beingAbducted = !!d.beingAbducted; p.abductTimer = d.abductTimer || 0;
            p.stuckTimer = d.stuckTimer || 0;
            if (i !== ONLINE.mySlot) p.aimLock = d.aimLock || 0;
        });
        const me = players[ONLINE.mySlot];
        if (me && !ONLINE.aimInit) { ONLINE.localAim = me.tt !== undefined ? me.tt : me.turretAngle; ONLINE.aimInit = true; }

        bullets = s.b || [];
        for (const b of bullets) { b.bx = b.x; b.by = b.y; }
        missiles = (s.m || []);
        for (const m of missiles) { m.bx = m.x; m.by = m.y; m.trail = []; }
        powerupDrops = s.pu || [];
        giantTank = s.gt || null;
        if (giantTank) { giantTank.bx = giantTank.x; giantTank.by = giantTank.y; }
        aliens = s.al || [];
        ctfFlags = s.fl || [];
        ctfCaptured = s.cc || [];
        territories = s.te || [];
        territoryScores = s.ts || [0, 0, 0, 0];
        extraObstacles = s.eo || [];

        if (brokenFloorActive && s.ft && s.ft.length === floorTiles.length) {
            const NAMES = { s: 'solid', w: 'warn', f: 'falling', h: 'hole' };
            const TIMERS = { warn: CONFIG.BROKEN_FLOOR_WARN_DURATION, falling: 20 };
            for (let i = 0; i < floorTiles.length; i++) {
                const st = NAMES[s.ft[i]] || 'solid';
                if (floorTiles[i].state !== st) { floorTiles[i].state = st; floorTiles[i].timer = TIMERS[st] || 0; }
            }
        }

        // sounds + explosions that happened on the host since the last snapshot
        for (const ev of (s.ev || [])) {
            if (ev[0] === 's') playSound(ev[1]);
            else if (ev[0] === 'x') createExplosion(ev[1], ev[2], ev[3], !!ev[4]);
        }

        // HUD only when something visible changed (it rebuilds DOM)
        const sig = players.map(p => [p.hits, p.alive ? 1 : 0, p.shield,
            p.missilePower ? Math.ceil(p.missilePower.timer / 60) : 0, Math.ceil(p.respawnTimer / 60),
            p.capturedFlags ? p.capturedFlags.length : 0, p.beingAbducted ? 1 : 0].join(',')).join('|')
            + '#' + territoryScores.join(',');
        if (sig !== ONLINE.hudSig) { ONLINE.hudSig = sig; updateHUD(); updateControlsPanel(); }

        const tsig = Math.ceil(timeRemainingFrames / 60) + ':' + (suddenDeathActive ? 1 : 0);
        if (tsig !== ONLINE.timeSig) { ONLINE.timeSig = tsig; updateTimeBadge(); }

        // win / draw / time-up popup mirrors the host's
        if (s.mo) {
            const key = s.mo.t + '|' + s.mo.s;
            if (key !== ONLINE.modalKey) {
                ONLINE.modalKey = key;
                modalTitle.textContent = s.mo.t;
                modalTitle.style.color = s.mo.c;
                modalTitle.style.textShadow = s.mo.sh;
                modalSubtitle.textContent = s.mo.s;
                winModal.classList.add('active');
            }
        } else if (ONLINE.modalKey) {
            ONLINE.modalKey = '';
            winModal.classList.remove('active');
        }
    }

    function guestFire() {
        ONLINE.fireSeq++;
        if (mobileAimMode[0] === 'auto') ONLINE.aimLock = CONFIG.MOBILE_AIM_FREEZE;
        guestSendInput(true);
    }

    function guestComputeInput() {
        const me = players[ONLINE.mySlot];
        if (!me) return { x: 0, y: 0, a: 0, f: ONLINE.fireSeq };
        const k = playerConfigs[0].keys;
        let mx = 0, my = 0;
        if (gameActive && !gamePaused && me.alive) {
            if (keysPressed[k.up]) my -= 1;
            if (keysPressed[k.down]) my += 1;
            if (keysPressed[k.left]) mx -= 1;
            if (keysPressed[k.right]) mx += 1;
            if (keysPressed[k.rotateL]) ONLINE.localAim -= CONFIG.TANK_ROTATION_SPEED;
            if (keysPressed[k.rotateR]) ONLINE.localAim += CONFIG.TANK_ROTATION_SPEED;
            if (mobileMode) {
                if (touchAim[0] !== null && touchAim[0] !== undefined) {
                    ONLINE.localAim = touchAim[0];
                } else if (mobileAimMode[0] === 'auto') {
                    if (ONLINE.aimLock > 0) ONLINE.aimLock--;
                    else ONLINE.localAim -= CONFIG.MOBILE_TURRET_SPEED;
                } else {
                    ONLINE.aimLock = 0;
                }
                if (touchStick[0]) { mx = touchStick[0].x; my = touchStick[0].y; }
            }
        }
        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        while (ONLINE.localAim > Math.PI) ONLINE.localAim -= Math.PI * 2;
        while (ONLINE.localAim < -Math.PI) ONLINE.localAim += Math.PI * 2;
        me.turretAngle = ONLINE.localAim;          // your own gun reacts instantly
        me.aimLock = ONLINE.aimLock;
        return { x: r2(mx), y: r2(my), a: Math.round(ONLINE.localAim * 1000) / 1000, f: ONLINE.fireSeq };
    }

    function guestSendInput(force) {
        const inp = guestComputeInput();
        const key = inp.x + ',' + inp.y + ',' + inp.a + ',' + inp.f;
        const now = performance.now();
        const since = now - ONLINE.lastInputT;
        if (force || (key !== ONLINE.lastInputKey && since >= 45) || since > 1000) {
            ONLINE.lastInputKey = key;
            ONLINE.lastInputT = now;
            TankNet.sendInput(inp);
        }
    }

    function guestFrame() {
        if (ONLINE.lobby || !players.length) return;
        if (ONLINE.pendingState) {
            const j = ONLINE.pendingState;
            ONLINE.pendingState = null;
            try { applyState(JSON.parse(j)); } catch (e) { console.warn('bad snapshot', e); }
        }
        frameCount++;

        // smooth the 20 Hz snapshots into 60 fps motion
        for (const p of players) {
            if (p.tx === undefined) continue;
            const dx = p.tx - p.x, dy = p.ty - p.y;
            if (Math.abs(dx) + Math.abs(dy) > 140) { p.x = p.tx; p.y = p.ty; }
            else { p.x += dx * 0.35; p.y += dy * 0.35; }
            p.bodyAngle = lerpAngle(p.bodyAngle, p.tb, 0.35);
            if (p.index !== ONLINE.mySlot) p.turretAngle = lerpAngle(p.turretAngle, p.tt, 0.45);
        }

        if (!gamePaused) {
            const k = Math.min(4, (performance.now() - ONLINE.stateT) / 16.667);
            for (const b of bullets) { b.x = b.bx + b.vx * k; b.y = b.by + b.vy * k; }
            for (const m of missiles) {
                m.x = m.bx + m.vx * k; m.y = m.by + m.vy * k;
                m.trail = [];
                for (let i = 0; i < 12; i++) {
                    const back = 11 - i;
                    m.trail.push({ x: m.x - m.vx * back, y: m.y - m.vy * back, life: 14 - back });
                }
            }
            if (giantTank) { giantTank.x = giantTank.bx + giantTank.vx * k; giantTank.y = giantTank.by + giantTank.vy * k; }
            for (const d of powerupDrops) d.bob += 0.08;
            for (const t of floorTiles) if ((t.state === 'warn' || t.state === 'falling') && t.timer > 0) t.timer--;

            if (frameCount % 2 === 0) {
                for (const b of bullets) particles.push({
                    x: b.x, y: b.y, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
                    life: 10, maxLife: 10, size: rand(1, 3), color: '#ffcc00', type: 'trail' });
                for (const m of missiles) particles.push({
                    x: m.x, y: m.y, vx: rand(-0.8, 0.8), vy: rand(-0.8, 0.8),
                    life: 15, maxLife: 15, size: rand(3 * m.size, 5 * m.size),
                    color: m.color || '#ff6b3a', type: 'fire' });
            }
            updateCosmetics();
        }
        guestSendInput(false);
    }

    // ------------------------------------------------------------
    //  LOBBY / ROOM UI
    // ------------------------------------------------------------
    function onlineModalOpen() {
        const m = byId('onlineModal');
        return !!(m && m.classList.contains('active'));
    }
    const cleanName = (s) => String(s || '').replace(/[<>]/g, '').trim().slice(0, 12);

    function setOnlineMsg(text, isError) {
        for (const id of ['onlineMsg', 'onlineLobbyMsg']) {
            const el = byId(id);
            if (!el) continue;
            el.textContent = text || '';
            el.classList.toggle('error', !!isError);
        }
    }

    function showOnlineScreen(which) {
        byId('onlineMenu').style.display = which === 'menu' ? '' : 'none';
        byId('onlineLobby').style.display = which === 'lobby' ? '' : 'none';
        byId('onlineTitle').textContent = which === 'lobby' ? 'WAITING ROOM' : 'PLAY ONLINE';
        byId('onlineSubtitle').textContent = which === 'lobby'
            ? 'Share the room code with your friends'
            : 'Play with friends, each on their own phone';
    }

    function openOnlineModal(prefillCode, message) {
        initAudio();
        if (ONLINE.active && !ONLINE.lobby) {
            if (window.confirm('Leave the online game?')) leaveOnline();
            return;
        }
        const nameEl = byId('onlineName');
        if (!nameEl.value) {
            try { nameEl.value = localStorage.getItem('tankBattle_onlineName') || ''; } catch (e) {}
        }
        if (prefillCode) byId('onlineCode').value = String(prefillCode).toUpperCase().slice(0, 5);
        showOnlineScreen(ONLINE.active ? 'lobby' : 'menu');
        setOnlineMsg(message || (TankNet.configured() ? '' : 'Firebase is not set up yet - open firebase-config.js and paste your project settings.'), !!message || !TankNet.configured());
        byId('onlineModal').classList.add('active');
    }

    function readName() {
        let n = cleanName(byId('onlineName').value);
        if (!n) n = 'Player' + Math.floor(Math.random() * 90 + 10);
        byId('onlineName').value = n;
        try { localStorage.setItem('tankBattle_onlineName', n); } catch (e) {}
        return n;
    }

    function setOnlineBusy(b) {
        for (const id of ['onlineCreateBtn', 'onlineJoinBtn']) byId(id).disabled = !!b;
    }

    function beginOnline(role, code, name) {
        ONLINE.active = true;
        ONLINE.role = role;
        ONLINE.code = code;
        ONLINE.lobby = true;
        ONLINE.myName = name;
        ONLINE.prevCount = playerCount;
        ONLINE.mySlot = 0; ONLINE.count = 0; ONLINE.round = 0; ONLINE.worldRound = -1;
        ONLINE.names = []; ONLINE.slotUids = []; ONLINE.playersMap = {}; ONLINE.left = {};
        ONLINE.inputs = {}; ONLINE.lastFire = {}; ONLINE.events = []; ONLINE.pendingState = null;
        ONLINE.fireSeq = 0; ONLINE.aimInit = false; ONLINE.aimLock = 0;
        document.body.classList.add('online-active', 'online-' + role);
        byId('changePlayersBtn').textContent = 'LEAVE ROOM';

        TankNet.onPlayers(onLobbyPlayers);
        if (role === 'host') {
            TankNet.onInput((uid, val) => {
                const slot = ONLINE.slotUids.indexOf(uid);
                if (slot > 0 && val) ONLINE.inputs[slot] = val;
            });
        } else {
            TankNet.onRoomGone(() => { if (ONLINE.active) leaveOnline('The host closed the room.'); });
            TankNet.onWorld(onWorld);
            TankNet.onState((j) => { ONLINE.pendingState = j; });
        }
        byId('onlineRoomCode').textContent = code;
        showOnlineScreen('lobby');
        setOnlineMsg('');
        updateRoomBadge();
        renderLobby();
    }

    async function onlineCreate() {
        const name = readName();
        setOnlineBusy(true); setOnlineMsg('Creating room...');
        try {
            const code = await TankNet.createRoom(name);
            beginOnline('host', code, name);
        } catch (e) {
            setOnlineMsg(e && e.message ? e.message : 'Could not create the room.', true);
        } finally { setOnlineBusy(false); }
    }

    async function onlineJoin() {
        const name = readName();
        const code = byId('onlineCode').value.trim().toUpperCase();
        if (!code) { setOnlineMsg('Type the room code your friend sent you.', true); return; }
        setOnlineBusy(true); setOnlineMsg('Joining...');
        try {
            await TankNet.joinRoom(code, name);
            beginOnline('guest', code, name);
        } catch (e) {
            setOnlineMsg(e && e.message ? e.message : 'Could not join the room.', true);
        } finally { setOnlineBusy(false); }
    }

    function sortedPlayerUids() {
        const map = ONLINE.playersMap || {};
        const hostUid = ONLINE.role === 'host' ? TankNet.uid() : null;
        return Object.keys(map).sort((a, b) => {
            const ja = map[a].joinedAt || 0, jb = map[b].joinedAt || 0;
            if (ja !== jb) return ja - jb;                 // host has joinedAt 0 -> always first
            return a < b ? -1 : 1;
        }).sort((a, b) => (a === hostUid ? -1 : b === hostUid ? 1 : 0));
    }

    function renderLobby() {
        const box = byId('onlinePlayers');
        if (!box) return;
        const uids = sortedPlayerUids();
        let html = '';
        for (let i = 0; i < 4; i++) {
            const cfg = playerConfigs[i] || getDefaultConfigs()[i];
            const pal = COLOR_PALETTE[cfg.colorIndex] || COLOR_PALETTE[i];
            const u = uids[i];
            const info = u ? ONLINE.playersMap[u] : null;
            const isMe = u && u === TankNet.uid();
            html += `<div class="online-player ${info ? '' : 'empty'}">
                <span class="player-dot" style="background:${pal.color};color:${pal.color}"></span>
                <span class="op-name">${info ? escapeHtml(cleanName(info.name)) : 'waiting for friend...'}</span>
                ${i === 0 ? '<span class="op-tag">HOST</span>' : ''}${isMe ? '<span class="op-tag you">YOU</span>' : ''}
            </div>`;
        }
        box.innerHTML = html;
        const startBtn = byId('onlineStartBtn');
        const n = uids.length;
        startBtn.disabled = n < 2;
        startBtn.textContent = n < 2 ? 'NEED 2+ PLAYERS' : `START GAME (${n})`;
        if (ONLINE.role === 'guest') setOnlineMsg('Waiting for the host to start the game...');
    }

    function onLobbyPlayers(map) {
        ONLINE.playersMap = map || {};
        if (ONLINE.lobby) { renderLobby(); return; }
        // game already running: if a friend dropped out, remove their tank (host only)
        if (ONLINE.role === 'host') {
            for (let i = 1; i < ONLINE.slotUids.length; i++) {
                if (!ONLINE.playersMap[ONLINE.slotUids[i]] && !ONLINE.left[i]) markLeft(i);
            }
        }
    }

    function startOnlineGame() {
        if (ONLINE.role !== 'host' || !ONLINE.lobby) return;
        const map = ONLINE.playersMap || {};
        const hostUid = TankNet.uid();
        const guests = Object.keys(map).filter(u => u !== hostUid)
            .sort((a, b) => (map[a].joinedAt || 0) - (map[b].joinedAt || 0)).slice(0, 3);
        if (!guests.length) { setOnlineMsg('Wait for at least one friend to join.', true); return; }

        ONLINE.slotUids = [hostUid, ...guests];
        const seen = {};
        ONLINE.names = ONLINE.slotUids.map(u => {
            let n = cleanName(map[u] && map[u].name) || 'Player';
            seen[n] = (seen[n] || 0) + 1;
            return seen[n] > 1 ? `${n} ${seen[n]}` : n;
        });
        ONLINE.count = ONLINE.slotUids.length;
        while (playerConfigs.length < ONLINE.count) playerConfigs.push(getDefaultConfigs()[playerConfigs.length]);

        ONLINE.lobby = false;
        ONLINE.left = {};
        TankNet.lockRoom();
        byId('onlineModal').classList.remove('active');
        document.querySelectorAll('.player-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.count) === ONLINE.count);
        });
        resetGame(ONLINE.count);          // -> onlineHostNewRound() publishes the world to everyone
    }

    function updateRoomBadge() {
        let badge = byId('roomBadge');
        if (!ONLINE.active) { if (badge) badge.remove(); return; }
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'roomBadge';
            badge.className = 'room-badge';
            document.querySelector('.canvas-container').appendChild(badge);
        }
        badge.innerHTML = `<span class="rb-label">ROOM</span><span class="rb-code">${escapeHtml(ONLINE.code)}</span>`;
    }

    function leaveOnline(message) {
        if (!ONLINE.active) return;
        TankNet.leave();
        ONLINE.active = false; ONLINE.role = null; ONLINE.lobby = false;
        ONLINE.pendingState = null; ONLINE.round = 0; ONLINE.inputs = {};
        document.body.classList.remove('online-active', 'online-host', 'online-guest');
        byId('changePlayersBtn').textContent = 'CHANGE PLAYERS';
        winModal.classList.remove('active');
        byId('onlineModal').classList.remove('active');
        updateRoomBadge();

        const n = [2, 3, 4].includes(ONLINE.prevCount) ? ONLINE.prevCount : 2;
        document.querySelectorAll('.player-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.count) === n);
        });
        resetGame(n);                      // back to a normal local game
        if (message) openOnlineModal(null, message);
    }

    // ---- wiring ----
    (function wireOnlineUI() {
        byId('onlineBtn').addEventListener('click', () => openOnlineModal());
        byId('onlineCreateBtn').addEventListener('click', onlineCreate);
        byId('onlineJoinBtn').addEventListener('click', onlineJoin);
        byId('onlineCloseBtn').addEventListener('click', () => byId('onlineModal').classList.remove('active'));
        byId('onlineLeaveBtn').addEventListener('click', () => leaveOnline());
        byId('onlineStartBtn').addEventListener('click', () => { initAudio(); startOnlineGame(); });
        byId('onlineCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
        byId('onlineCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') onlineJoin(); });
        byId('onlineCopyBtn').addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(ONLINE.code); setOnlineMsg('Room code copied!'); }
            catch (e) { setOnlineMsg('Room code: ' + ONLINE.code); }
        });
        byId('onlineShareBtn').addEventListener('click', async () => {
            const url = location.origin + location.pathname + '?room=' + ONLINE.code;
            const text = `Join my Tank Battle room! Code: ${ONLINE.code}`;
            try {
                if (navigator.share) await navigator.share({ title: 'Tank Battle', text, url });
                else { await navigator.clipboard.writeText(`${text}\n${url}`); setOnlineMsg('Invite link copied!'); }
            } catch (e) { /* share dialog dismissed */ }
        });
    })();

    // ============================================================
    //  BOOT
    // ============================================================
    loadFromStorage();

    document.querySelectorAll('.player-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.count) === playerCount);
    });

    while (playerConfigs.length < playerCount) {
        playerConfigs.push(getDefaultConfigs()[playerConfigs.length]);
    }

    document.body.classList.toggle('mobile-mode', mobileMode);
    document.body.classList.toggle('rotate-view', rotateView);

    // Switch layout live when the window size / orientation changes
    function refreshMobileMode() {
        const next = detectMobileMode();
        const nextRot = next && isPortraitNow();
        if (next === mobileMode && nextRot === rotateView) return;
        mobileMode = next;
        rotateView = nextRot;
        document.body.classList.toggle('mobile-mode', mobileMode);
        document.body.classList.toggle('rotate-view', rotateView);
        touchStick = [null, null, null, null];
        touchAim = [null, null, null, null];
        const hdr = document.getElementById('gameHeader');
        if (hdr) hdr.classList.remove('menu-open');
        if (mobileMode) buildTouchControls();
    }
    let resizeTimer = null;
    const onViewportChange = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { refreshMobileMode(); applyControlLayout(); }, 120);
    };
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);

    // Compact menu (mobile) + fullscreen button
    const gameHeaderEl = document.getElementById('gameHeader');
    const menuToggleBtn = document.getElementById('menuToggle');
    if (gameHeaderEl && menuToggleBtn) {
        menuToggleBtn.addEventListener('click', () => {
            const open = gameHeaderEl.classList.toggle('menu-open');
            menuToggleBtn.innerHTML = open ? '<span>✕</span>' : '<span>☰</span>';
        });
        gameHeaderEl.addEventListener('click', (e) => {
            if (e.target.closest('.player-btn, .settings-btn, .reset-btn, .online-btn')) {
                gameHeaderEl.classList.remove('menu-open');
                menuToggleBtn.innerHTML = '<span>☰</span>';
            }
        });
    }
    // Layout edit bar (size slider / reset / done / draggable title)
    (function () {
        const bar = document.getElementById('layoutEditBar');
        if (!bar) return;
        document.getElementById('layoutScale').addEventListener('input', (e) => {
            controlLayout.scale = clampScale(e.target.value / 100);
            applyControlLayout();
            saveControlLayout();
        });
        document.getElementById('layoutResetBtn').addEventListener('click', () => {
            controlLayout[layoutKey()] = {};
            controlLayout.scale = 1;
            document.getElementById('layoutScale').value = 100;
            applyControlLayout();
            saveControlLayout();
        });
        document.getElementById('layoutDoneBtn').addEventListener('click', exitLayoutEdit);
        const title = document.getElementById('lebTitle');
        let bd = null;
        title.addEventListener('pointerdown', (e) => {
            const r = bar.getBoundingClientRect();
            bd = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            bar.style.transform = 'none';
            bar.style.left = r.left + 'px';
            bar.style.top = r.top + 'px';
            try { title.setPointerCapture(e.pointerId); } catch (err) {}
        });
        title.addEventListener('pointermove', (e) => {
            if (!bd) return;
            bar.style.left = Math.max(0, Math.min(window.innerWidth - bar.offsetWidth, e.clientX - bd.dx)) + 'px';
            bar.style.top = Math.max(0, Math.min(window.innerHeight - bar.offsetHeight, e.clientY - bd.dy)) + 'px';
        });
        title.addEventListener('pointerup', () => { bd = null; });
    })();

    const fsBtn = document.getElementById('fullscreenBtn');
    if (fsBtn) {
        const de = document.documentElement;
        const canFs = !!(de.requestFullscreen || de.webkitRequestFullscreen);
        if (!canFs) fsBtn.style.display = 'none';
        fsBtn.addEventListener('click', () => {
            try {
                const inFs = document.fullscreenElement || document.webkitFullscreenElement;
                if (inFs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                else (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
            } catch (err) {}
            canvas.focus();
        });
    }

    if (!restoreGameState()) resetGame(playerCount);

    // autosave: every second, and whenever the page is hidden / refreshed / closed
    setInterval(() => { if (!layoutEditMode) saveGameState(); }, 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGameState(); });
    window.addEventListener('pagehide', saveGameState);
    window.addEventListener('beforeunload', saveGameState);

    gameLoop();

    // invite links look like  tank_battle.html?room=ABCDE
    (function () {
        try {
            const q = new URLSearchParams(location.search).get('room');
            if (q) openOnlineModal(q);
        } catch (e) {}
    })();

})();