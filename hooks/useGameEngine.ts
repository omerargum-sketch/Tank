import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Keys, Tank, Bullet, Explosion, Country, GameEntity, PowerUp, MuzzleFlash, SmokeParticle, AbilityType, ExperienceOrb, KamikazeDrone, Mine, Upgrade, UpgradeType, TireTrackPoint, Particle, WeatherState, WeatherType, FloatingText, TankCustomization, ArtilleryTarget, MartyrsBeacon, SolarFlareWarning, BlackHole, ScorchMark, EMPBlast, Asteroid, CustomWeatherSettings, SpaceDebris, Building, Rubble, UiState } from '../types';
import { GameStatus } from '../types';
import { COUNTRIES, MS_PER_FRAME } from '../constants';
import { TANK_DESIGNS, COUNTRY_TANK_MAP, ABILITY_MAP, createDesign, BOSS_DESIGN } from './tankDesigns';
import { useTranslation } from '../i18n';

const SHIELD_COST = 5000;
const MARTYRS_BEACON_COST = 5000;
const BACKUP_COST = 7500;
const XP_PER_LEVEL = 100;
const KILL_STREAK_RESET_TIME = 180; // 3 seconds
const HEALTH_REGEN_DELAY = 300; // 5 seconds
const HEALTH_REGEN_INTERVAL = 60; // 1 second
const BOSS_WAVE_DIFFICULTY = 5;
const MAX_ADRENALINE = 100;
const MULTI_KILL_INTERVAL = 150; // 2.5 seconds for announcer

const seedLeaderboard = () => {
    const scores = [];
    for (let i = 0; i < 50; i++) {
        const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        scores.push({
            flag: country.flag,
            code: country.code,
            score: Math.floor(Math.random() * 20000) * (50 - i) + 1000,
        });
    }
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tankHighScores', JSON.stringify(scores));
    return scores;
};


const getHighScores = (): { flag: string; code: string; score: number }[] => {
    try {
        const scores = localStorage.getItem('tankHighScores');
        if (scores) {
            return JSON.parse(scores);
        }
        return seedLeaderboard();
    } catch {
        return [];
    }
};

const saveHighScore = (score: number, country: Country) => {
    if (score === 0) return;
    try {
        const scores = getHighScores();
        scores.push({ score, flag: country.flag, code: country.code });
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem('tankHighScores', JSON.stringify(scores.slice(0, 50)));
    } catch (error) {
        console.error("Failed to save high score", error);
    }
};

const getShields = (): number => {
    try {
        const shields = localStorage.getItem('tankShields');
        return shields ? parseInt(shields, 10) : 0;
    } catch {
        return 0;
    }
}

const saveShields = (count: number) => {
    try {
        localStorage.setItem('tankShields', count.toString());
    } catch (e) {
        console.error("Failed to save shields", e);
    }
}

const createTank = (isPlayer: boolean, country: Country, canvasWidth: number, canvasHeight: number, isChampion: boolean = false, isElite: boolean = false, difficulty: number = 1, isHardMode: boolean = false, customization?: TankCustomization, isAlly: boolean = false, isBoss: boolean = false, variant: 'default' | 'artillery' | 'spawner' | 'swarmer' = 'default'): Tank => {
    const tankId = `tank_${Date.now()}_${Math.random()}`;
    let design;
    if (isBoss) {
        design = BOSS_DESIGN;
    } else {
        const designKey = (COUNTRY_TANK_MAP[country.code] || 'DEFAULT');
        design = TANK_DESIGNS[designKey];
        if ((isPlayer || isAlly) && customization) {
            design = createDesign(customization.baseColor, customization.turretColor);
        }
    }
    
    const abilityType = ABILITY_MAP[country.code] || 'none';

    let health = 100;
    if(isBoss) health = 7000 + (difficulty * 700);
    else if (isChampion) health = 1000;
    else if (isElite) health = 250 + (difficulty * 10);
    else if (variant === 'spawner') health = 400 + difficulty * 20;
    else if (variant === 'swarmer') health = 20 + difficulty * 2;
    else health = 100 + (difficulty * 5);
    
    if (variant === 'artillery') health *= 1.5;
    if (isHardMode && !isPlayer && !isAlly) health *= 1.5;

    let abilityCooldown = 1800; // 30s
    if (abilityType === 'quick_repair') abilityCooldown = 1200; // 20s
    if (abilityType === 'overdrive') abilityCooldown = 2400; // 40s

    const speed = isPlayer || isAlly ? 4.0 : isBoss ? 0.7 : (variant === 'artillery' ? 0.5 : (variant === 'spawner' ? 0.4 : (variant === 'swarmer' ? 2.8 : 1.4 + (difficulty / 15) + Math.random() * 0.4))) * (isHardMode ? 1.2 : 1);
    const maxCooldown = isPlayer || isAlly ? 18 : isBoss ? 60 : (variant === 'artillery' ? 480 : (variant === 'spawner' ? 0 : (variant === 'swarmer' ? 120 : 70 - difficulty))) * (isHardMode ? 0.8 : 1);

    return {
        id: tankId,
        type: 'tank',
        x: Math.random() * (canvasWidth - (isBoss ? 100: 50)),
        y: isPlayer ? canvasHeight - 60 : isAlly ? canvasHeight - 120 : isBoss ? 50 : Math.random() * (canvasHeight - 200),
        width: isBoss ? 96 : (variant === 'swarmer' ? 24 : 48),
        height: isBoss ? 72 : (variant === 'swarmer' ? 18 : 36),
        baseColor: design.base,
        turretColor: design.turret,
        design,
        health,
        maxHealth: health,
        isPlayer,
        speed,
        fireCooldown: 0,
        maxCooldown,
        country,
        targetId: null,
        lastDamageTime: 0,
        isInvincible: false,
        invincibilityTimer: 0,
        isChampion,
        isElite,
        abilityCooldown: 0,
        maxAbilityCooldown: abilityCooldown,
        abilityType: isAlly ? 'none' : abilityType,
        abilityActive: false,
        abilityTimer: 0,
        level: 1,
        experience: 0,
        damage: isPlayer ? 30 : isBoss ? 50 : (variant === 'artillery' ? 100 : (variant === 'swarmer' ? 5 : 18 + difficulty)),
        piercing: false,
        strafeDirection: Math.random() > 0.5 ? 1 : -1,
        spawnAnimProgress: 0,
        healthRegenRate: isPlayer ? 2 : 0,
        healthRegenTimer: HEALTH_REGEN_INTERVAL,
        isAlly,
        isBoss,
        variant,
        spawnCooldown: variant === 'spawner' ? 300 : undefined,
        motionBlurTrail: isPlayer ? [] : undefined,
        isStunned: false,
        stunTimer: 0,
        adrenaline: 0,
        maxAdrenaline: MAX_ADRENALINE,
        isAdrenalineActive: false,
        adrenalineTimer: 0,
        consecutiveHits: 0,
    };
};

const createAsteroid = (canvasWidth: number, canvasHeight: number): Asteroid => {
    const size = 25 + Math.random() * 20;
    const shape = [];
    const points = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radius = size/2 * (0.8 + Math.random() * 0.4);
        shape.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return {
        id: `asteroid_${Date.now()}_${Math.random()}`,
        type: 'asteroid',
        x: Math.random() * (canvasWidth - size),
        y: Math.random() * (canvasHeight - size),
        width: size,
        height: size,
        health: size * 5,
        maxHealth: size * 5,
        shape
    }
};

const createSpaceDebris = (canvasWidth: number, canvasHeight: number): SpaceDebris => {
    const size = 50 + Math.random() * 50;
    const shape = [];
    const points = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < points; i++) {
        const angle = (i/points) * Math.PI * 2;
        const radius = size/2 * (0.6 + Math.random() * 0.8);
        shape.push({x: Math.cos(angle) * radius, y: Math.sin(angle) * radius});
    }
    return {
        id: `debris_${Date.now()}_${Math.random()}`,
        type: 'space_debris',
        x: Math.random() * (canvasWidth - size),
        y: Math.random() * (canvasHeight - size - 100), // Avoid player spawn area
        width: size,
        height: size,
        shape,
    }
}

const ALL_UPGRADES: Upgrade[] = [
    {
        id: 'maxHealth',
        title: 'maxHealth',
        description: 'maxHealthDesc',
        apply: (tank: Tank): Tank => {
            const newMaxHealth = tank.maxHealth * 1.2;
            const healthIncrease = newMaxHealth - tank.maxHealth;
            return {
                ...tank,
                maxHealth: newMaxHealth,
                health: tank.health + healthIncrease,
            };
        },
    },
    {
        id: 'speed',
        title: 'speed',
        description: 'speedDesc',
        apply: (tank: Tank): Tank => ({ ...tank, speed: tank.speed * 1.15 }),
    },
    {
        id: 'damage',
        title: 'damage',
        description: 'damageDesc',
        apply: (tank: Tank): Tank => ({ ...tank, damage: (tank.damage || 25) * 1.15 }),
    },
    {
        id: 'fireRate',
        title: 'fireRate',
        description: 'fireRateDesc',
        apply: (tank: Tank): Tank => ({ ...tank, maxCooldown: tank.maxCooldown * 0.8 }),
    },
    {
        id: 'piercing',
        title: 'piercing',
        description: 'piercingDesc',
        apply: (tank: Tank): Tank => ({ ...tank, piercing: true }),
    },
];

const createInitialState = (playerCountry: Country, canvasWidth: number, canvasHeight: number, customization?: TankCustomization, mods: string[] = [], weatherSettings?: CustomWeatherSettings): GameState => {
    const isHardMode = mods.includes('hard_mode');
    const hasAllySupport = mods.includes('ally_support');
    const isGlassCannon = mods.includes('glass_cannon');
    const isUrbanMode = mods.includes('urban_warfare');

    const player = createTank(true, playerCountry, canvasWidth, canvasHeight, false, false, 1, isHardMode, customization);
    if (isGlassCannon) {
        player.maxHealth /= 2;
        player.health /= 2;
        player.damage = (player.damage || 25) * 2;
    }

    const allies: Tank[] = [];
    if(hasAllySupport) {
        allies.push(createTank(false, playerCountry, canvasWidth, canvasHeight, false, false, 1, false, customization, true));
    }

    const buildings: Building[] = [];
    if (isUrbanMode) {
        const numBuildings = 5 + Math.floor(Math.random() * 4);
        const minSize = 80, maxSize = 150;
        for (let i = 0; i < numBuildings; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 20) {
                const width = minSize + Math.random() * (maxSize - minSize);
                const height = minSize + Math.random() * (maxSize - minSize);
                const x = Math.random() * (canvasWidth - width);
                const y = Math.random() * (canvasHeight - height - 150);

                const newBuilding: Building = {
                    id: `building_${i}_${Date.now()}`,
                    type: 'building',
                    x, y, width, height,
                    health: 1000,
                    maxHealth: 1000,
                    damageState: 0,
                };
                
                let overlap = false;
                for (const b of buildings) {
                    if (newBuilding.x < b.x + b.width && newBuilding.x + newBuilding.width > b.x &&
                        newBuilding.y < b.y + b.height && newBuilding.y + newBuilding.height > b.y) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    buildings.push(newBuilding);
                    placed = true;
                }
                attempts++;
            }
        }
    }

    const starfield: Particle[] = [];
    for (let i = 0; i < 300; i++) {
        const isDebris = Math.random() < 0.05;
        starfield.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            size: isDebris ? Math.random() * 3 + 1 : Math.random() * 1.5 + 0.5,
            speed: isDebris ? Math.random() * 0.2 + 0.05 : Math.random() * 0.4 + 0.1,
            vx: 0, vy: 0, color: '',
            alpha: isDebris ? Math.random() * 0.4 + 0.2 : Math.random() * 0.5 + 0.2,
            isDebris
        });
    }

    const initialWeather: WeatherState = {
        type: weatherSettings ? weatherSettings.type : 'none',
        intensity: 0,
        timer: weatherSettings ? weatherSettings.duration * 60 : 600,
        particles: []
    };
    
    const spaceDebris: SpaceDebris[] = [];

    return {
        status: GameStatus.START,
        player,
        enemies: [],
        bullets: [],
        explosions: [],
        powerUps: [],
        score: 0,
        time: 0,
        difficulty: 1,
        enemySpawnTimer: 180,
        powerUpSpawnTimer: 300,
        message: null,
        leaderboard: getHighScores(),
        shields: getShields(),
        muzzleFlashes: [],
        smokeParticles: [],
        screenShake: { magnitude: 0, duration: 0 },
        killCount: 0,
        allies,
        boss: null,
        isHardMode,
        experienceOrbs: [],
        drones: [],
        mines: [],
        droneSpawnTimer: 900,
        killStreak: 0,
        scoreMultiplier: 1.0,
        killStreakTimer: 0,
        upgrades: ALL_UPGRADES,
        isLevelUpModalOpen: false,
        upgradeChoices: [],
        tireTracks: [],
        mineSpawnTimer: 900,
        sparks: [],
        shellCasings: [],
        weather: initialWeather,
        floatingTexts: [],
        lowHealthPowerupCooldown: 0,
        starfield,
        artilleryTargets: [],
        martyrsBeacon: null,
        martyrsBeaconPurchased: false,
        solarFlares: [],
        blackHoles: [],
        hasBlackHole: false,
        scorchMarks: [],
        empBlasts: [],
        canvasWidth,
        canvasHeight,
        asteroids: [],
        asteroidSpawnTimer: 120,
        customWeather: weatherSettings,
        lightTone: weatherSettings ? weatherSettings.tone : '#ffffff',
        exhaustParticles: [],
        spaceDebris,
        lastKillTimestamp: 0,
        recentKillCount: 0,
        isUrbanMode,
        buildings,
        rubble: [],
    };
};

const createInitialUiState = (gameState: GameState): UiState => ({
    status: gameState.status,
    playerHealth: gameState.player?.health ?? 0,
    playerMaxHealth: gameState.player?.maxHealth ?? 100,
    playerAdrenaline: gameState.player?.adrenaline ?? 0,
    playerMaxAdrenaline: gameState.player?.maxAdrenaline ?? 100,
    score: gameState.score,
    time: gameState.time,
    difficulty: gameState.difficulty,
    shields: gameState.shields,
    boss: gameState.boss ? { health: gameState.boss.health, maxHealth: gameState.boss.maxHealth } : null,
    isLevelUpModalOpen: gameState.isLevelUpModalOpen,
    upgradeChoices: gameState.upgradeChoices,
    hasBlackHole: gameState.hasBlackHole,
    killStreak: gameState.killStreak,
    scoreMultiplier: gameState.scoreMultiplier,
    allyCount: gameState.allies.length,
});


export const useGameEngine = (playerCountry: Country | null, keys: React.MutableRefObject<Keys>, canvasSize: {width: number, height: number}) => {
    const { t } = useTranslation();
    const initialGameState = useRef(createInitialState(playerCountry || COUNTRIES[0], canvasSize.width, canvasSize.height));
    const [uiState, setUiState] = useState<UiState>(() => createInitialUiState(initialGameState.current));
    const gameStateRef = useRef<GameState>(initialGameState.current);

    const gameLoopRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const lastUiUpdateTimeRef = useRef<number>(0);

    const gameModsRef = useRef<string[]>([]);
    
    // FIX: Add comprehensive audio engine to handle sound effects and fix TS errors
    const audioUnlocked = useRef(false);
    const audioPools = useRef<{ [key: string]: { elements: HTMLAudioElement[], index: number } }>({});
    const ambientSounds = useRef<{ [key: string]: HTMLAudioElement }>({});

    useEffect(() => {
        const sounds: { [key: string]: { url: string, volume: number, type: 'pool' | 'single' | 'ambient', poolSize?: number } } = {
            shoot: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/laser-shoot.wav', volume: 0.2, type: 'pool', poolSize: 8 },
            explosion: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/explosion.wav', volume: 0.3, type: 'pool', poolSize: 6 },
            damage: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/hit-damage.wav', volume: 0.4, type: 'pool', poolSize: 4 },
            rock_destroy: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/rock_destroy.wav', volume: 0.5, type: 'pool', poolSize: 3 },
            levelUp: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/level-up.wav', volume: 0.5, type: 'single' },
            orb: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/collect-orb.wav', volume: 0.5, type: 'single' },
            combo: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/combo.wav', volume: 0.4, type: 'single' },
            shield_buy: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/shield_buy.wav', volume: 0.6, type: 'single' },
            cheat: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/cheat_activated.wav', volume: 0.7, type: 'single' },
            aegis_shield: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/aegis_shield.wav', volume: 0.5, type: 'single' },
            overdrive: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/overdrive.wav', volume: 0.5, type: 'single' },
            emp_blast: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/emp_blast.wav', volume: 0.6, type: 'single' },
            golden_bullet: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/golden_bullet.wav', volume: 0.6, type: 'single' },
            quick_repair: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/quick_repair.wav', volume: 0.5, type: 'single' },
            boss_spawn: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/boss_spawn_warning.wav', volume: 0.8, type: 'single' },
            black_hole: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/black_hole_effect.wav', volume: 0.7, type: 'single' },
            adrenaline: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/adrenaline_rush.wav', volume: 0.8, type: 'single' },
            rain: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/rain.mp3', volume: 0.3, type: 'ambient' },
            snow: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/snow_wind.mp3', volume: 0.4, type: 'ambient' },
            fog: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/fog_ambient.mp3', volume: 0.5, type: 'ambient' },
            low_health: { url: 'https://storage.googleapis.com/proud-star-423616-g6-public/low_health_heartbeat.mp3', volume: 0.6, type: 'ambient' },
        };
        
        Object.entries(sounds).forEach(([key, config]) => {
            if (config.type === 'pool') {
                audioPools.current[key] = { elements: [], index: 0 };
                for (let i = 0; i < (config.poolSize || 4); i++) {
                    const audio = new Audio(config.url);
                    audio.volume = config.volume;
                    audio.preload = 'auto';
                    audioPools.current[key].elements.push(audio);
                }
            } else {
                const audio = new Audio(config.url);
                audio.volume = config.volume;
                audio.preload = 'auto';
                if (config.type === 'ambient') {
                    audio.loop = true;
                    ambientSounds.current[key] = audio;
                } else { // 'single'
                     audioPools.current[key] = { elements: [audio], index: 0 };
                }
            }
        });
    }, []);

    const playSound = useCallback((sound: string) => {
        if (!audioUnlocked.current) return;
        
        const pool = audioPools.current[sound];
        if (pool) {
            const audio = pool.elements[pool.index];
            if (audio.paused) {
                audio.play().catch(e => console.error(`Sound ${sound} failed to play:`, e));
            } else {
                // If it's not paused, clone it for overlap. This is a fallback.
                const newAudio = audio.cloneNode() as HTMLAudioElement;
                newAudio.play().catch(e => console.error(`Cloned sound ${sound} failed to play:`, e));
            }
            pool.index = (pool.index + 1) % pool.elements.length;
        }
    }, []);

    const manageAmbientSounds = useCallback(() => {
        if (!audioUnlocked.current) return;
        const state = gameStateRef.current;
        const player = state.player;

        const shouldPlay: { [key: string]: boolean } = {
            low_health: state.status === GameStatus.PLAYING && !!player && player.health < player.maxHealth * 0.25,
            rain: state.status === GameStatus.PLAYING && state.weather.type === 'rain',
            snow: state.status === GameStatus.PLAYING && state.weather.type === 'snow',
            fog: state.status === GameStatus.PLAYING && state.weather.type === 'fog',
        };

        Object.entries(ambientSounds.current).forEach(([key, audio]) => {
            if (shouldPlay[key]) {
                if (audio.paused) {
                    audio.play().catch(e => console.error(`Ambient sound ${key} failed to start:`, e));
                }
            } else {
                if (!audio.paused) {
                    audio.pause();
                }
            }
        });
    }, []);
    
    const forceUiUpdate = useCallback(() => {
        const state = gameStateRef.current;
        setUiState({
            status: state.status,
            playerHealth: state.player?.health ?? 0,
            playerMaxHealth: state.player?.maxHealth ?? 100,
            playerAdrenaline: state.player?.adrenaline ?? 0,
            playerMaxAdrenaline: state.player?.maxAdrenaline ?? 100,
            score: state.score,
            time: state.time,
            difficulty: state.difficulty,
            shields: state.shields,
            boss: state.boss ? { health: state.boss.health, maxHealth: state.boss.maxHealth } : null,
            isLevelUpModalOpen: state.isLevelUpModalOpen,
            upgradeChoices: state.upgradeChoices,
            hasBlackHole: state.hasBlackHole,
            killStreak: state.killStreak,
            scoreMultiplier: state.scoreMultiplier,
            allyCount: state.allies.length,
        });
    }, []);

    const startGame = useCallback((customization?: TankCustomization, mods: string[] = [], weatherSettings?: CustomWeatherSettings) => {
        if (!playerCountry) return;

        // Unlock audio on first user interaction
        if (!audioUnlocked.current) {
            Object.values(audioPools.current).forEach(pool => {
                pool.elements.forEach(audio => {
                    const playPromise = audio.play();
                    if(playPromise !== undefined) {
                        playPromise.then(() => audio.pause()).catch(() => {});
                    }
                });
            });
             Object.values(ambientSounds.current).forEach(audio => {
                const playPromise = audio.play();
                if(playPromise !== undefined) {
                    playPromise.then(() => audio.pause()).catch(() => {});
                }
            });
            audioUnlocked.current = true;
        }

        gameModsRef.current = mods;
        const newState = createInitialState(playerCountry, canvasSize.width, canvasSize.height, customization, mods, weatherSettings);
        newState.status = GameStatus.PLAYING;
        gameStateRef.current = newState;
        forceUiUpdate();
    }, [playerCountry, canvasSize, forceUiUpdate]);

    const returnToMenu = useCallback(() => {
        if (!playerCountry) return;
        const newState = createInitialState(playerCountry, canvasSize.width, canvasSize.height);
        gameStateRef.current = newState;
        forceUiUpdate();
    }, [playerCountry, canvasSize, forceUiUpdate]);


    const buyShield = () => {
        const state = gameStateRef.current;
        if (state.score >= SHIELD_COST && state.status === GameStatus.PLAYING) {
            state.shields += 1;
            saveShields(state.shields);
            state.score -= SHIELD_COST;
            playSound('shield_buy');
        }
    };

    const buyMartyrsBeacon = () => {
        const state = gameStateRef.current;
        if (state.score >= MARTYRS_BEACON_COST && !state.martyrsBeaconPurchased && state.status === GameStatus.PLAYING) {
            state.score -= MARTYRS_BEACON_COST;
            state.martyrsBeaconPurchased = true;
            playSound('shield_buy');
        }
    }

    const buyBackup = () => {
        const state = gameStateRef.current;
        if (!playerCountry || state.score < BACKUP_COST || state.status !== GameStatus.PLAYING) return;

        const maxAllies = gameModsRef.current.includes('ally_support') ? 3 : 2;
        if (state.allies.length >= maxAllies) return;

        const newAlly = createTank(false, playerCountry, state.canvasWidth, state.canvasHeight, false, false, state.difficulty, false, state.player ? { baseColor: state.player.baseColor, turretColor: state.player.turretColor } : undefined, true);
        newAlly.x = state.player?.x || state.canvasWidth / 2;
        newAlly.y = state.player?.y || state.canvasHeight / 2;
        
        state.score -= BACKUP_COST;
        state.allies.push(newAlly);
        playSound('shield_buy');
    };
    
    const applyCheat = (code: string): { success: boolean; feature?: string } => {
        const state = gameStateRef.current;
        if (!state.player) return { success: false };
        let cheatApplied = false;
        let unlockedFeature: string | undefined = undefined;
        let cheatText = '';

        if (code === '12alillat') {
            const player = state.player;
            player.damage = (player.damage || 25) * 2;
            player.speed *= 1.5;
            player.maxCooldown *= 0.5;
            state.score += 100000;
            cheatApplied = true;
            cheatText = t('cheats.qualityBoost');
        } else if (code === 'gdmn100') {
            state.score += 25000;
            state.shields += 5;
            saveShields(state.shields);
            cheatApplied = true;
            cheatText = t('cheats.reinforcements');
        } else if (code === 'argumex') {
            try {
                localStorage.setItem('weatherControlUnlocked', 'true');
                cheatApplied = true;
                cheatText = t('cheats.weatherUnlocked');
                unlockedFeature = 'weather';
            } catch(e) { console.error("Could not save to localStorage", e); }
        } else if (code === 'ekrn') {
            try {
                localStorage.setItem('recordingUnlocked', 'true');
                cheatApplied = true;
                cheatText = t('cheats.recordingUnlocked');
                unlockedFeature = 'recording';
            } catch(e) { console.error("Could not save to localStorage", e); }
        }

        if (cheatApplied) {
            playSound('cheat');
            state.floatingTexts.push({ id: `ft_${Date.now()}`, text: cheatText, x: state.player.x, y: state.player.y - 20, life: 120, color: '#00FF00' });
        }
        return { success: cheatApplied, feature: unlockedFeature };
    };

    const applyAbilityToPlayer = useCallback(() => {
        const state = gameStateRef.current;
        const player = state.player;
        if (!player) return;

        if (state.hasBlackHole) {
            playSound('black_hole');
            const target = [...state.enemies, state.boss, ...state.drones].find(t => t?.id === player.targetId);
            const blackHole: BlackHole = {
                id: `bh_${Date.now()}`, type: 'black_hole',
                x: target ? target.x : player.x + 100,
                y: target ? target.y : player.y,
                width: 20, height: 20,
                life: 300, maxLife: 300, pullRadius: 250, rotation: 0
            };
            state.hasBlackHole = false;
            state.blackHoles.push(blackHole);
            return;
        }
    
        if (player.abilityCooldown > 0 || player.abilityActive) return;
    
        playSound(player.abilityType);
    
        player.abilityActive = true;
        player.abilityCooldown = player.maxAbilityCooldown;
        
        switch(player.abilityType) {
            case 'aegis_shield':
                player.abilityTimer = 300; // 5s
                player.isInvincible = true;
                break;
            case 'overdrive':
                player.abilityTimer = 420; // 7s
                player.originalSpeed = player.speed;
                player.originalMaxCooldown = player.maxCooldown;
                player.speed *= 1.5;
                player.maxCooldown /= 2;
                break;
            case 'emp_blast':
                 const empBlast: EMPBlast = {
                    id: `emp_${Date.now()}`, type: 'emp_blast',
                    x: player.x + player.width / 2,
                    y: player.y + player.height / 2,
                    width: 0, height: 0,
                    radius: 0, maxRadius: 400,
                    life: 60, maxLife: 60,
                    hitEnemies: [],
                };
                player.abilityActive = false; // instant
                state.empBlasts.push(empBlast);
                break;
            case 'golden_bullet':
                player.abilityTimer = 1; // one shot
                break;
            case 'quick_repair':
                player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.4); // Heal 40%
                player.abilityActive = false; // instant
                break;
        }
    }, [playSound]);
    
    const activateAbility = useCallback(() => {
        applyAbilityToPlayer();
    }, [applyAbilityToPlayer]);

    const activateAdrenaline = useCallback(() => {
        const state = gameStateRef.current;
        const player = state.player;
        if (!player || player.adrenaline < player.maxAdrenaline) return;

        playSound('adrenaline');
        
        player.isAdrenalineActive = true;
        player.adrenalineTimer = 480; // 8 seconds
        player.adrenaline = 0;
        player.consecutiveHits = 0; // Reset consecutive hits
        
        player.originalMaxCooldown = player.maxCooldown;
        
        player.maxCooldown *= 0.3; // 70% faster fire rate
        player.piercing = true; // All shots pierce
    }, [playSound]);

    const selectUpgrade = useCallback((upgrade: Upgrade) => {
        const state = gameStateRef.current;
        if (!state.player) return;
        state.player = upgrade.apply(state.player);
        state.isLevelUpModalOpen = false;
        state.status = GameStatus.PLAYING;
        forceUiUpdate();
    }, [forceUiUpdate]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key in keys.current) keys.current[key as keyof Keys] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key in keys.current) keys.current[key as keyof Keys] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [keys]);

    const createExplosion = useCallback((x: number, y: number, size: number, isShrapnel: boolean = false, isRockDebris: boolean = false): { explosion: Explosion, scorchMark: ScorchMark } => {
        const particles: Particle[] = [];
        const smokeParticles: SmokeParticle[] = [];
        const particleCount = isRockDebris ? 60 : (isShrapnel ? 50 : 30);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (isRockDebris ? 6 : (isShrapnel ? 8 : 5)) + 1;
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: Math.random() * (isRockDebris ? 6 : 3) + 1,
                color: isRockDebris ? ['#8B4513', '#A0522D', '#696969'][Math.floor(Math.random() * 3)] : ['#FFA500', '#FF4500', '#FF6347', '#FFD700'][Math.floor(Math.random() * 4)],
            });
        }
        for (let i = 0; i < 15; i++) {
            smokeParticles.push({
                x: x + (Math.random() - 0.5) * size * 0.5, y: y + (Math.random() - 0.5) * size * 0.5,
                vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * (size/5) + (size/10),
                color: '', life: 60, maxLife: 60
            });
        }
        playSound(isRockDebris ? 'rock_destroy' : 'explosion');
        const explosion: Explosion = { type: 'explosion', id: `exp_${Date.now()}`, x, y, width:size, height:size, particles, smokeParticles, life: 30, duration: 30, isShrapnel, isRockDebris, shockwave: { radius: 0, maxRadius: size * 1.5, alpha: 1 } };
        const scorchMark: ScorchMark = { type: 'scorch_mark', id: `scorch_${Date.now()}`, x, y, width: 0, height: 0, radius: size/2, life: 1800, maxLife: 1800 }; // Lasts 30 seconds
        return { explosion, scorchMark };
    }, [playSound]);

    const createSparks = (x: number, y: number, count: number) => {
        const sparks: Particle[] = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            sparks.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 2 + 1,
                color: '#FFD700',
                life: Math.floor(Math.random() * 10 + 5)
            });
        }
        return sparks;
    }
    
    const createShellCasing = (x: number, y: number, angle: number): Particle => {
        const ejectAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        return {
            x, y,
            vx: Math.cos(ejectAngle) * 2,
            vy: Math.sin(ejectAngle) * 2 - 2,
            size: 1,
            color: '#DAA520',
            life: 60,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.5,
        }
    }

    const gameLoop = useCallback((timestamp: number) => {
        if (lastFrameTimeRef.current === 0) {
            lastFrameTimeRef.current = timestamp;
        }
        let deltaTime = (timestamp - lastFrameTimeRef.current) / MS_PER_FRAME;
        lastFrameTimeRef.current = timestamp;
        
        deltaTime = Math.min(deltaTime, 3);

        const state = gameStateRef.current;
        
        if (state.status === GameStatus.DEATH_ANIMATION) {
            if (state.martyrsBeacon) {
                state.martyrsBeacon.timer -= deltaTime;
                if (state.martyrsBeacon.timer <= 0) {
                    const beacon = state.martyrsBeacon;
                    const { explosion, scorchMark } = createExplosion(beacon.x, beacon.y, 300, true);
                    state.explosions.push(explosion);
                    state.scorchMarks.push(scorchMark);
                    state.screenShake = { magnitude: 20, duration: 30 };
                    [...state.enemies, state.boss].forEach(enemy => {
                        if(enemy) {
                            const dx = enemy.x - beacon.x;
                            const dy = enemy.y - beacon.y;
                            if(Math.hypot(dx, dy) < 150) {
                                enemy.health -= 500;
                            }
                        }
                    });
                    state.martyrsBeacon = null;
                    state.status = GameStatus.GAME_OVER;
                    forceUiUpdate();
                }
            } else {
                 state.status = GameStatus.GAME_OVER;
                 forceUiUpdate();
            }
            return;
        }

        if (state.status !== GameStatus.PLAYING) return;

        const { canvasWidth, canvasHeight } = state;
        
        state.time = state.time + deltaTime / 60;
        
        const oldDifficulty = state.difficulty;
        const timeInSeconds = state.time;
        const gracePeriod = 15;
        if (timeInSeconds < gracePeriod) {
            state.difficulty = 1;
        } else {
            const effectiveTime = timeInSeconds - gracePeriod;
            state.difficulty = 1 + Math.floor(Math.pow(effectiveTime / 30, 1.5));
        }


        if (state.killStreakTimer > 0) state.killStreakTimer -= deltaTime; else {
            state.killStreak = 0;
            state.scoreMultiplier = 1.0;
        }
        if (state.lowHealthPowerupCooldown > 0) state.lowHealthPowerupCooldown -= deltaTime;

        if (state.player && state.player.health <= 0) {
            if (state.shields > 0) {
                state.player.health = state.player.maxHealth;
                state.player.isInvincible = true;
                state.player.invincibilityTimer = 180; // 3 seconds
                state.shields -= 1;
                saveShields(state.shields);
            } else {
                saveHighScore(state.score, state.player.country);
                const { explosion, scorchMark } = createExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, state.player.width * 2);
                state.explosions.push(explosion);
                state.scorchMarks.push(scorchMark);
                state.screenShake = { magnitude: 20, duration: 30 };
        
                if (state.martyrsBeaconPurchased) {
                    state.martyrsBeacon = { id: `mb_${Date.now()}`, type: 'martyrs_beacon', x: state.player.x, y: state.player.y, width: 20, height: 20, timer: 120, maxTimer: 120 };
                    state.status = GameStatus.DEATH_ANIMATION;
                } else {
                    state.status = GameStatus.GAME_OVER;
                }
        
                state.player = null;
                forceUiUpdate();
                return;
            }
        }

        let player = state.player;
        if (player) {
            if (player.spawnAnimProgress < 1) {
                player.spawnAnimProgress = Math.min(1, player.spawnAnimProgress + (1.5 - player.spawnAnimProgress) * 0.03 * deltaTime);
            }
            const allTargets = [...state.enemies, ...state.drones, ...(state.boss ? [state.boss] : [])];
            let closestTarget: GameEntity | null = null;
            let minDistance = Infinity;
            allTargets.forEach(target => {
                const dx = target.x - player.x;
                const dy = target.y - player.y;
                const distance = Math.hypot(dx, dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = target;
                }
            });
            player.targetId = closestTarget ? closestTarget.id : null;

            let moveX = 0;
            let moveY = 0;
            if (keys.current.w) moveY -= 1;
            if (keys.current.s) moveY += 1;
            if (keys.current.a) moveX -= 1;
            if (keys.current.d) moveX += 1;

            if (moveX !== 0 || moveY !== 0) {
                const moveSpeed = player.speed * deltaTime * (player.isAdrenalineActive ? 1.2 : 1);
                const magnitude = Math.hypot(moveX, moveY);
                let nextX = player.x + (moveX / magnitude) * moveSpeed;
                let nextY = player.y + (moveY / magnitude) * moveSpeed;

                let collision = false;
                for (const debris of state.spaceDebris) {
                    if (nextX < debris.x + debris.width && nextX + player.width > debris.x &&
                        nextY < debris.y + debris.height && nextY + player.height > debris.y) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    player.x = nextX;
                    player.y = nextY;
                }

                
                state.tireTracks.push({x: player.x + player.width/2, y: player.y + player.height/2, life: 1});
                if(state.tireTracks.length > 200) state.tireTracks.shift();
                
                if (Math.random() < 0.2) {
                    state.exhaustParticles.push({
                        x: player.x + player.width/2 - (moveX/magnitude) * player.width/2,
                        y: player.y + player.height/2 - (moveY/magnitude) * player.height/2,
                        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
                        size: Math.random() * 4 + 2,
                        color: '', life: 30, maxLife: 30
                    });
                }
            }

            player.x = Math.max(0, Math.min(canvasWidth - player.width, player.x));
            player.y = Math.max(0, Math.min(canvasHeight - player.height, player.y));

            if (player.lastDamageTime > HEALTH_REGEN_DELAY) {
                player.healthRegenTimer -= deltaTime;
                if (player.healthRegenTimer <= 0) {
                    const regenAmount = player.healthRegenRate * (player.isAdrenalineActive ? 2 : 1);
                    player.health = Math.min(player.maxHealth, player.health + regenAmount);
                    player.healthRegenTimer = HEALTH_REGEN_INTERVAL;
                }
            } else {
                player.lastDamageTime += deltaTime;
            }

            if (player.fireCooldown > 0) player.fireCooldown -= deltaTime;
            if (keys.current[' '] && player.fireCooldown <= 0 && player.targetId) {
                const target = allTargets.find(e => e.id === player.targetId);
                if (target) {
                    player.fireCooldown = player.maxCooldown;
                    const isGolden = player.abilityActive && player.abilityType === 'golden_bullet';
                    const dx = target.x + target.width / 2 - (player.x + player.width / 2);
                    const dy = target.y + target.height / 2 - (player.y + player.height / 2);
                    const dist = Math.hypot(dx, dy);
                    
                    if (dist > 0) {
                        const bulletSpeed = 14;
                        let bulletVx = (dx / dist) * bulletSpeed;
                        let bulletVy = (dy / dist) * bulletSpeed;
                        let angle = Math.atan2(bulletVy, bulletVx);

                        if (state.weather.type === 'rain') {
                            const inaccuracy = 0.12; 
                            const newAngle = angle + (Math.random() - 0.5) * inaccuracy;
                            const speed = Math.hypot(bulletVx, bulletVy) * 0.9; 
                            bulletVx = Math.cos(newAngle) * speed;
                            bulletVy = Math.sin(newAngle) * speed;
                            angle = newAngle;
                        }
                        
                        const barrelLength = player.width * 0.4;
                        const bulletX = player.x + player.width / 2 - 5 + Math.cos(angle) * barrelLength;
                        const bulletY = player.y + player.height / 2 - 5 + Math.sin(angle) * barrelLength;

                        state.bullets.push({
                            id: `bullet_${Date.now()}`, type: 'bullet',
                            x: bulletX, y: bulletY,
                            width: isGolden ? 15 : 10, height: isGolden ? 15 : 10,
                            vx: bulletVx, vy: bulletVy, damage: (player.damage || 25) * (isGolden ? 5 : 1) * (player.isAdrenalineActive ? 1.2 : 1),
                            isPlayerBullet: true, color: isGolden ? '#FFD700' : '#00FFFF',
                            piercing: player.piercing,
                            trail: [{x: bulletX, y: bulletY}]
                        });

                        state.muzzleFlashes.push({
                            id: `mf_${Date.now()}`, type: 'muzzle_flash',
                            x: player.x + player.width/2 + Math.cos(angle) * (player.width * 0.5),
                            y: player.y + player.height/2 + Math.sin(angle) * (player.width * 0.5),
                            width: 30, height: 30,
                            life: 5, duration: 5,
                            angle: angle
                        });
                        state.shellCasings.push(createShellCasing(bulletX, bulletY, angle));

                        playSound('shoot');
                    }

                    if (isGolden) {
                        player.abilityActive = false;
                        player.abilityTimer = 0;
                    }
                }
            }
            
            if (player.abilityCooldown > 0) player.abilityCooldown -= deltaTime; else player.abilityCooldown = 0;
            if (player.abilityActive) {
                if (player.abilityTimer > 0) player.abilityTimer -= deltaTime; else {
                    player.abilityActive = false;
                    if (player.abilityType === 'overdrive') {
                        player.speed = player.originalSpeed || player.speed;
                        player.maxCooldown = player.originalMaxCooldown || player.maxCooldown;
                    }
                    if (player.abilityType === 'aegis_shield') {
                        player.isInvincible = false;
                    }
                }
            }
             if (player.isAdrenalineActive) {
                if (player.adrenalineTimer > 0) player.adrenalineTimer -= deltaTime; else {
                    player.isAdrenalineActive = false;
                    player.maxCooldown = player.originalMaxCooldown || player.maxCooldown;
                    if (!state.upgrades.find(u => u.id === 'piercing')) {
                       player.piercing = false;
                    }
                }
            }
            if (keys.current.q) {
                applyAbilityToPlayer();
            }
            if (keys.current.e) {
                activateAdrenaline();
            }
            if (player.damageFlashTimer && player.damageFlashTimer > 0) player.damageFlashTimer -= deltaTime;
            
            if (player.abilityActive && player.abilityType === 'overdrive' && player.motionBlurTrail) {
                player.motionBlurTrail.push({ x: player.x + player.width/2, y: player.y + player.height/2, life: 10 });
                if(player.motionBlurTrail.length > 10) player.motionBlurTrail.shift();
            }
            if (player.motionBlurTrail) {
                player.motionBlurTrail.forEach(t => t.life -= deltaTime);
                player.motionBlurTrail = player.motionBlurTrail.filter(t => t.life > 0);
            }

            if (player.health < player.maxHealth * 0.20 && state.lowHealthPowerupCooldown <= 0) {
                state.powerUps.push({
                    id: `pup_${Date.now()}`,
                    type: 'powerup',
                    powerUpType: 'rapid_fire',
                    x: player.x + (Math.random() * 100 - 50),
                    y: player.y + (Math.random() * 100 - 50),
                    width: 20,
                    height: 20,
                    life: 600, // 10 seconds
                    duration: 300, // 5 seconds effect
                });
                state.lowHealthPowerupCooldown = 1800; // 30 second cooldown
            }
        }

        state.allies.forEach(ally => {
            let closestEnemy: GameEntity | null = null;
            let minDistance = Infinity;
            const potentialTargets: GameEntity[] = [...state.enemies, ...(state.boss ? [state.boss] : [])];
            potentialTargets.forEach(enemy => {
                const dx = enemy.x - ally.x;
                const dy = enemy.y - ally.y;
                const distance = Math.hypot(dx, dy);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            });
            ally.targetId = closestEnemy ? closestEnemy.id : null;

            if (player) {
                const dxToPlayer = (player.x - 60) - ally.x;
                const dyToPlayer = player.y - ally.y;
                const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);
                if (distToPlayer > 80) { // Stay near player
                    ally.x += (dxToPlayer / distToPlayer) * ally.speed * deltaTime * 0.8;
                    ally.y += (dyToPlayer / distToPlayer) * ally.speed * deltaTime * 0.8;
                }
            }
            
            if (ally.fireCooldown > 0) ally.fireCooldown -= deltaTime;
            else if (closestEnemy) {
                ally.fireCooldown = ally.maxCooldown;
                const dx = closestEnemy.x + closestEnemy.width / 2 - (ally.x + ally.width / 2);
                const dy = closestEnemy.y + closestEnemy.height / 2 - (ally.y + ally.height / 2);
                const dist = Math.hypot(dx, dy);
                if(dist > 0) {
                    const bulletSpeed = 14;
                    const bulletVx = (dx / dist) * bulletSpeed;
                    const bulletVy = (dy / dist) * bulletSpeed;
                    const angle = Math.atan2(bulletVy, bulletVx);
                    const barrelLength = ally.width * 0.4;
                    const bulletX = ally.x + ally.width / 2 - 5 + Math.cos(angle) * barrelLength;
                    const bulletY = ally.y + ally.height / 2 - 5 + Math.sin(angle) * barrelLength;
                    state.bullets.push({
                        id: `bullet_${Date.now()}`, type: 'bullet',
                        x: bulletX, y: bulletY,
                        width: 10, height: 10, vx: bulletVx, vy: bulletVy, damage: (ally.damage || 25),
                        isPlayerBullet: true, color: '#90EE90', piercing: ally.piercing,
                        trail: [{x: bulletX, y: bulletY}]
                    });
                }
            }
        });

        if (player) {
            state.powerUps = state.powerUps.filter(p => {
                const dx = (player.x + player.width / 2) - (p.x + p.width / 2);
                const dy = (player.y + player.height / 2) - (p.y + p.height / 2);
                if (Math.hypot(dx, dy) < 30) {
                    if (p.powerUpType === 'rapid_fire') {
                        player.maxCooldown /= 2;
                        setTimeout(() => {
                           const latestState = gameStateRef.current;
                           if(latestState.player) {
                               latestState.player.maxCooldown *= 2;
                           }
                        }, p.duration * (1000/60));
                    } else if (p.powerUpType === 'black_hole') {
                        state.hasBlackHole = true;
                    }
                    return false;
                }
                p.life -= deltaTime;
                return p.life > 0;
            });
        }

        state.weather.timer -= deltaTime;
        if (state.weather.timer <= 0) {
            let newType: WeatherType;
            if(state.customWeather) {
                newType = state.customWeather.nextType;
                state.weather.timer = state.customWeather.duration * 60;
            } else {
                const weatherTypes: WeatherType[] = ['none', 'rain', 'snow', 'fog', 'solar_flare'];
                newType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
                state.weather.timer = 1200 + Math.random() * 1200; // 20-40 seconds
            }
            
            state.weather.type = newType;
            state.weather.particles = [];
            state.weather.intensity = 0.2 + Math.random() * 0.2;
            if(newType === 'rain') {
                for(let i = 0; i < 100; i++) state.weather.particles.push({ x: Math.random() * canvasWidth, y: Math.random() * canvasHeight, vx: -2, vy: 10, size: 2, color: '' });
            } else if(newType === 'snow') {
                for(let i = 0; i < 150; i++) state.weather.particles.push({ x: Math.random() * canvasWidth, y: Math.random() * canvasHeight, vx: Math.random() - 0.5, vy: 1 + Math.random(), size: 1 + Math.random() * 2, color: '' });
            } else if(newType === 'solar_flare') {
                for(let i=0; i < state.difficulty; i++) {
                     state.solarFlares.push({id: `sf_${Date.now()}_${i}`, type: 'solar_flare_warning', x: Math.random() * canvasWidth, y: Math.random() * canvasHeight, width: 100, height: 100, radius: 50 + Math.random() * 50, timer: 180, maxTimer: 180 });
                }
            }
        }
        if(state.weather.type === 'rain' || state.weather.type === 'snow') {
            state.weather.particles.forEach(p => {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                if(p.y > canvasHeight) { p.y = 0; p.x = Math.random() * canvasWidth; }
                if(p.x > canvasWidth) p.x = 0; else if(p.x < 0) p.x = canvasWidth;
            });
        }

        state.starfield.forEach(star => {
            star.y += (star.speed || 0.2) * deltaTime;
            if (star.y > canvasHeight) {
                star.y = 0;
                star.x = Math.random() * canvasWidth;
            }
            if (Math.random() < 0.001 && !star.isDebris) {
                star.alpha = Math.random() * 0.7 + 0.3;
            }
        });

        state.solarFlares = state.solarFlares.filter(flare => {
            flare.timer -= deltaTime;
            if (flare.timer <= 0) {
                const { explosion, scorchMark } = createExplosion(flare.x, flare.y, flare.radius * 2, false);
                state.explosions.push(explosion);
                state.scorchMarks.push(scorchMark);
                [player, ...state.allies, ...state.enemies, state.boss].forEach(tank => {
                    if (tank && !tank.isInvincible) {
                        const dx = (tank.x + tank.width/2) - flare.x;
                        const dy = (tank.y + tank.height/2) - flare.y;
                        if (Math.hypot(dx, dy) < flare.radius) {
                            tank.health -= 50;
                            tank.damageFlashTimer = 10;
                        }
                    }
                })
                return false;
            }
            return true;
        });
        
        state.blackHoles = state.blackHoles.filter(hole => {
            hole.life -= deltaTime;
            hole.rotation += 0.05 * deltaTime;
            if (hole.life > 0) {
                const allPullable = [...state.enemies, ...state.bullets.filter(b => !b.isPlayerBullet), ...state.drones];
                allPullable.forEach(entity => {
                    const dx = hole.x - entity.x;
                    const dy = hole.y - entity.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < hole.pullRadius && dist > 20) {
                        const pullForce = (1 - dist / hole.pullRadius) * 0.5 * deltaTime;
                        if (entity.type === 'bullet') {
                            entity.vx += (dx / dist) * pullForce * 5;
                            entity.vy += (dy / dist) * pullForce * 5;
                        } else {
                            entity.x += (dx / dist) * pullForce * 3;
                            entity.y += (dy / dist) * pullForce * 3;
                        }
                    } else if (dist <= 20) {
                        if (entity.type !== 'bullet') entity.health -= 5 * deltaTime;
                    }
                });
                return true;
            } else {
                const { explosion, scorchMark } = createExplosion(hole.x, hole.y, hole.pullRadius, true);
                state.explosions.push(explosion);
                state.scorchMarks.push(scorchMark);
                state.screenShake = { magnitude: 15, duration: 25 };
                return false;
            }
        });

        state.empBlasts = state.empBlasts.filter(blast => {
            blast.life -= deltaTime;
            if (blast.life <= 0) return false;

            blast.radius = (1 - (blast.life / blast.maxLife)) * blast.maxRadius;

            const targets = [...state.enemies, state.boss].filter(Boolean) as Tank[];
            targets.forEach(enemy => {
                if (!blast.hitEnemies.includes(enemy.id)) {
                    const dx = enemy.x + enemy.width / 2 - blast.x;
                    const dy = enemy.y + enemy.height / 2 - blast.y;
                    if (Math.hypot(dx, dy) < blast.radius) {
                        enemy.isStunned = true;
                        enemy.stunTimer = 180; // 3 seconds
                        blast.hitEnemies.push(enemy.id);
                    }
                }
            });
            return true;
        });

        state.drones.forEach(drone => {
            if (player) {
                const dx = (player.x + player.width / 2) - (drone.x + drone.width / 2);
                const dy = (player.y + player.height / 2) - (drone.y + drone.height / 2);
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    drone.x += (dx / dist) * drone.speed * deltaTime;
                    drone.y += (dy / dist) * drone.speed * deltaTime;
                }
            }
        });

        if (state.boss && player) {
            const boss = state.boss;
             if (boss.spawnAnimProgress < 1) {
                boss.spawnAnimProgress = Math.min(1, boss.spawnAnimProgress + (1.5 - boss.spawnAnimProgress) * 0.02 * deltaTime);
            }
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 300) {
                 boss.x += (dx/dist) * boss.speed * deltaTime;
                 boss.y += (dy/dist) * boss.speed * deltaTime;
            }
            boss.targetId = player.id;
            
            if (boss.fireCooldown > 0) boss.fireCooldown -= deltaTime;
            else {
                boss.fireCooldown = boss.maxCooldown + Math.random() * 30;
                for(let i=0; i<8; i++){
                    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
                    const speed = 5 + Math.random() * 2;
                    const bulletX = boss.x + boss.width/2 - 4;
                    const bulletY = boss.y + boss.height/2 - 4;
                    state.bullets.push({
                        id: `bullet_${Date.now()}_${i}`, type: 'bullet',
                        x: bulletX, y: bulletY,
                        width: 10, height: 10, 
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, 
                        damage: boss.damage || 40, isPlayerBullet: false, color: '#FF1493',
                        trail: [{x: bulletX, y: bulletY}]
                    })
                }
            }
        }

        state.enemies.forEach(enemy => {
            if (enemy.isStunned && enemy.stunTimer > 0) {
                enemy.stunTimer -= deltaTime;
                return;
            }
            enemy.isStunned = false;

            if (enemy.spawnAnimProgress < 1) {
                enemy.spawnAnimProgress = Math.min(1, enemy.spawnAnimProgress + (1.5 - enemy.spawnAnimProgress) * 0.03 * deltaTime);
            }

            if (player) {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.hypot(dx, dy);
                const safeDistance = enemy.variant === 'artillery' ? 400 : enemy.variant === 'swarmer' ? 0 : 150;
                
                let enemyMoveSpeed = enemy.speed * deltaTime;
                if(state.weather.type === 'snow') enemyMoveSpeed *= 0.8;

                let moveX = 0, moveY = 0;
                if (dist > 0 && enemy.variant !== 'artillery' && enemy.variant !== 'spawner') {
                    if (dist > safeDistance) {
                       moveX = (dx / dist) * enemyMoveSpeed;
                       moveY = (dy / dist) * enemyMoveSpeed;
                    } else {
                        moveX = -(dx / dist) * enemyMoveSpeed * 0.5;
                        moveY = -(dy / dist) * enemyMoveSpeed * 0.5;
                        const perpDx = -dy / dist;
                        const perpDy = dx / dist;
                        moveX += perpDx * enemyMoveSpeed * 0.8 * enemy.strafeDirection;
                        moveY += perpDy * enemyMoveSpeed * 0.8 * enemy.strafeDirection;
                    }
                }
                
                let nextX = enemy.x + moveX;
                let nextY = enemy.y + moveY;

                let collision = false;
                for (const debris of state.spaceDebris) {
                     if (nextX < debris.x + debris.width && nextX + enemy.width > debris.x &&
                        nextY < debris.y + debris.height && nextY + enemy.height > debris.y) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    enemy.x = nextX;
                    enemy.y = nextY;
                }


                if (enemy.variant !== 'spawner') enemy.targetId = player.id;
            }
            
            if (enemy.spawnCooldown && enemy.spawnCooldown > 0) enemy.spawnCooldown -= deltaTime;
            else if (enemy.variant === 'spawner' && enemy.spawnCooldown <= 0) {
                enemy.spawnCooldown = 480; // 8 seconds
                for(let i=0; i<2; i++) {
                    const swarmer = createTank(false, enemy.country, canvasWidth, canvasHeight, false, false, state.difficulty, state.isHardMode, undefined, false, false, 'swarmer');
                    swarmer.x = enemy.x + (Math.random() - 0.5) * 20;
                    swarmer.y = enemy.y + (Math.random() - 0.5) * 20;
                    state.enemies.push(swarmer);
                }
            }

            if (enemy.fireCooldown > 0) enemy.fireCooldown -= deltaTime;
            else if (player) {
                if (enemy.variant === 'artillery') {
                    enemy.fireCooldown = enemy.maxCooldown;
                    state.artilleryTargets.push({ id: `at_${Date.now()}`, type: 'artillery_target', x: player.x + player.width/2, y: player.y + player.height/2, width: 0, height: 0, radius: 80, timer: 240, maxTimer: 240, state: 'sweeping' });
                } else if (enemy.variant !== 'spawner') {
                    const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
                    const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
                    const dist = Math.hypot(dx, dy);
                    const detectionRange = state.weather.type === 'fog' ? 200 : 500;
                    if (dist > 0 && dist < detectionRange) {
                        enemy.fireCooldown = enemy.maxCooldown;
                        const bulletSpeed = enemy.variant === 'swarmer' ? 4 : 7;
                        let bulletVx = (dx / dist) * bulletSpeed;
                        let bulletVy = (dy / dist) * bulletSpeed;
                        let angle = Math.atan2(bulletVy, bulletVx);
                        
                        if (state.weather.type === 'rain') {
                            const inaccuracy = 0.12;
                            const newAngle = angle + (Math.random() - 0.5) * inaccuracy;
                            const speed = Math.hypot(bulletVx, bulletVy) * 0.9;
                            bulletVx = Math.cos(newAngle) * speed;
                            bulletVy = Math.sin(newAngle) * speed;
                            angle = newAngle;
                        }

                        const barrelLength = enemy.width * 0.4;
                        const bulletX = enemy.x + enemy.width / 2 - 4 + Math.cos(angle) * barrelLength;
                        const bulletY = enemy.y + enemy.height / 2 - 4 + Math.sin(angle) * barrelLength;
                        
                        state.bullets.push({
                             id: `bullet_${Date.now()}`, type: 'bullet',
                            x: bulletX, y: bulletY,
                            width: 8, height: 8, vx: bulletVx, vy: bulletVy, damage: enemy.damage || 10,
                            isPlayerBullet: false, color: '#FF4500',
                            trail: [{x: bulletX, y: bulletY}]
                        });

                        state.muzzleFlashes.push({
                            id: `mf_${Date.now()}`, type: 'muzzle_flash',
                            x: enemy.x + enemy.width/2 + Math.cos(angle) * (enemy.width * 0.5),
                            y: enemy.y + enemy.height/2 + Math.sin(angle) * (enemy.width * 0.5),
                            width: 30, height: 30,
                            life: 5, duration: 5,
                            angle: angle
                        });
                    }
                }
            }
            if (enemy.damageFlashTimer && enemy.damageFlashTimer > 0) enemy.damageFlashTimer -= deltaTime;
        });

        state.artilleryTargets = state.artilleryTargets.filter(target => {
            target.timer -= deltaTime;
            if(target.state === 'sweeping' && target.timer < target.maxTimer / 2) {
                target.state = 'locking';
            }
            if (target.timer <= 0) {
                const { explosion, scorchMark } = createExplosion(target.x, target.y, 160, true);
                state.explosions.push(explosion);
                state.scorchMarks.push(scorchMark);
                for(let i=0; i<12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const speed = 7;
                    const bulletX = target.x;
                    const bulletY = target.y;
                    state.bullets.push({ id: `shrapnel_${Date.now()}_${i}`, type: 'bullet', x: bulletX, y: bulletY, width: 6, height: 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: 20, isPlayerBullet: false, color: '#FFA500', trail: [{x: bulletX, y: bulletY}]});
                }
                return false;
            }
            return true;
        });

        state.bullets.forEach(b => {
            if(b.trail) {
                b.trail.push({x: b.x, y: b.y});
                if (b.trail.length > 3) b.trail.shift();
            }
            b.x += b.vx * deltaTime;
            b.y += b.vy * deltaTime;
        });

        if (player) {
            state.mines = state.mines.filter(mine => {
                if (!mine.isArmed) {
                    mine.armTimer -= deltaTime;
                    if (mine.armTimer <= 0) mine.isArmed = true;
                }
                if (mine.isArmed && !player.isInvincible) {
                    const dx = (player.x + player.width / 2) - (mine.x + mine.width / 2);
                    const dy = (player.y + player.height / 2) - (mine.y + mine.height / 2);
                    if (Math.hypot(dx, dy) < (player.width/2 + mine.width/2)) {
                        player.health -= 50;
                        player.damageFlashTimer = 10;
                        player.lastDamageTime = 0;
                        const { explosion, scorchMark } = createExplosion(mine.x, mine.y, 60);
                        state.explosions.push(explosion);
                        state.scorchMarks.push(scorchMark);
                        playSound('damage');
                        return false;
                    }
                }
                mine.life -= deltaTime;
                return mine.life > 0;
            });
        }

        const isBossWave = state.boss !== null;
        if (!isBossWave) {
             if(state.difficulty > oldDifficulty && state.difficulty % BOSS_WAVE_DIFFICULTY === 0) {
                playSound('boss_spawn');
                state.floatingTexts.push({ id: `ft_boss_${Date.now()}`, text: t('boss.name') + "!", x: canvasWidth/2, y: canvasHeight/2, life: 180, color: '#FF0000' });
                state.enemies = []; // Clear enemies for boss
                state.boss = createTank(false, COUNTRIES[0], canvasWidth, canvasHeight, false, false, state.difficulty, state.isHardMode, undefined, false, true);
            } else {
                state.enemySpawnTimer -= deltaTime;
                if (state.enemySpawnTimer <= 0) {
                    const isChampionRush = gameModsRef.current.includes('champion_rush');
                    state.enemySpawnTimer = Math.max(25, (isChampionRush ? 240 : 160) - state.difficulty * 8);
                    const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
                    
                    const formationRoll = Math.random();
                    if (formationRoll < 0.15) {
                         const formationType = Math.random();
                         if (formationType < 0.6) {
                             for(let i=0; i<3; i++) {
                                 const swarmer = createTank(false, randomCountry, canvasWidth, canvasHeight, false, false, state.difficulty, state.isHardMode, undefined, false, false, 'swarmer');
                                 swarmer.x = canvasWidth / 2 + (i-1) * 40;
                                 swarmer.y = -30;
                                 state.enemies.push(swarmer);
                             }
                         } else if (state.difficulty >= 4) {
                            for(let i=0; i<2; i++) {
                                 const artillery = createTank(false, randomCountry, canvasWidth, canvasHeight, false, false, state.difficulty, state.isHardMode, undefined, false, false, 'artillery');
                                 artillery.x = (canvasWidth / 3) * (i + 1);
                                 artillery.y = -30;
                                 state.enemies.push(artillery);
                             }
                         }
                    } else {
                        let variant: 'default' | 'artillery' | 'spawner' | 'swarmer' = 'default';
                        const rand = Math.random();
                        if (state.difficulty >= 8 && rand < 0.2) variant = 'spawner';
                        else if (state.difficulty >= 4 && rand < 0.4) variant = 'artillery';
                        else if (state.difficulty >= 2 && rand < 0.7) variant = 'swarmer';
                        
                        state.enemies.push(createTank(false, randomCountry, canvasWidth, canvasHeight, isChampionRush, !isChampionRush && Math.random() < 0.1, state.difficulty, state.isHardMode, undefined, false, false, variant));
                    }
                }
            }
        }

        if (state.difficulty >= 7) {
            state.asteroidSpawnTimer -= deltaTime;
            if (state.asteroidSpawnTimer <= 0) {
                const maxAsteroids = Math.floor(canvasWidth * canvasHeight / 60000);
                if (state.asteroids.length < maxAsteroids) {
                    state.asteroids.push(createAsteroid(canvasWidth, canvasHeight));
                }
                state.asteroidSpawnTimer = Math.max(30, 180 - state.difficulty * 5);
            }
        }

        state.mineSpawnTimer -= deltaTime;
        if(state.mineSpawnTimer <= 0) {
            state.mineSpawnTimer = 1200 + Math.random() * 600; // Every 20-30s
            state.mines.push({
                id: `mine_${Date.now()}`, type: 'mine',
                x: Math.random() * (canvasWidth - 20), y: Math.random() * (canvasHeight - 20),
                width: 12, height: 12, isArmed: false, armTimer: 120, life: 1800,
            });
        }

        state.droneSpawnTimer -= deltaTime;
        if (state.droneSpawnTimer <= 0) {
            state.droneSpawnTimer = 600 + Math.random() * 300;
            if (player && state.drones.length < 5) {
                state.drones.push({
                    id: `drone_${Date.now()}`,
                    type: 'kamikaze_drone',
                    x: Math.random() > 0.5 ? -20 : canvasWidth + 20,
                    y: Math.random() * canvasHeight,
                    width: 15,
                    height: 15,
                    health: 20 + (5 * state.difficulty),
                    speed: 1.8 + state.difficulty * 0.2,
                    targetId: player.id,
                });
            }
        }

        const newBullets: Bullet[] = [];
        const newExperienceOrbs: ExperienceOrb[] = [];
        const newFloatingTexts: FloatingText[] = [];

        for (const b of state.bullets) {
            let bulletAlive = true;

            if (b.x < 0 || b.x > canvasWidth || b.y < 0 || b.y > canvasHeight) {
                bulletAlive = false;
            }

            for (const debris of state.spaceDebris) {
                if (b.x < debris.x + debris.width && b.x + b.width > debris.x &&
                    b.y < debris.y + debris.height && b.y + b.height > debris.y) {
                    bulletAlive = false;
                    state.sparks.push(...createSparks(b.x, b.y, 5));
                    break;
                }
            }
            if (!bulletAlive) continue;


            if (b.isPlayerBullet) {
                const targets: (Tank | Asteroid | KamikazeDrone)[] = [...state.enemies, ...(state.boss ? [state.boss] : []), ...state.drones, ...state.asteroids];
                for (const target of targets) {
                    if (b.x < target.x + target.width && b.x + b.width > target.x &&
                        b.y < target.y + target.height && b.y + b.height > target.y) {
                        
                        target.health -= b.damage;
                        
                        if (target.type === 'tank') {
                            target.damageFlashTimer = 10;
                            if (player) {
                                player.consecutiveHits++;
                                const adrenalineGain = 2 + (player.consecutiveHits * 0.2);
                                player.adrenaline = Math.min(player.maxAdrenaline, player.adrenaline + adrenalineGain);
                                if(player.consecutiveHits > 5 && player.consecutiveHits % 5 === 0) {
                                    newFloatingTexts.push({ id: `ft_combo_${Date.now()}`, text: `${player.consecutiveHits} HITS!`, x: target.x, y: target.y - 10, life: 60, color: '#FFA500' });
                                }
                            }
                        }

                        state.sparks.push(...createSparks(b.x, b.y, 5));
                        
                        if (target.health <= 0) {
                            const { explosion, scorchMark } = createExplosion(target.x + target.width / 2, target.y + target.height / 2, target.width, false, target.type === 'asteroid');
                            state.explosions.push(explosion);
                            state.scorchMarks.push(scorchMark);
                            state.screenShake = { magnitude: target.width / 4, duration: 15 };

                            if (target.type === 'tank') {
                                state.killCount++;
                                const scoreGain = (target.isChampion ? 500 : target.isElite ? 100 : 25) * state.scoreMultiplier * (target.isBoss ? 20 : 1);
                                state.score += scoreGain;
                                
                                const orbValue = target.isChampion ? 50 : target.isElite ? 20 : 5;
                                newExperienceOrbs.push({ type: 'experience_orb', id: `orb_${Date.now()}`, x: target.x, y: target.y, width: 10, height: 10, value: orbValue, life: 600 });
                                
                                state.killStreak++;
                                state.killStreakTimer = KILL_STREAK_RESET_TIME;
                                state.scoreMultiplier = Math.min(5.0, 1.0 + Math.floor(state.killStreak / 5) * 0.5);
                                if (state.killStreak > 1 && state.killStreak % 5 === 0) {
                                    playSound('combo');
                                }

                                const now = timestamp;
                                if(now - state.lastKillTimestamp < MULTI_KILL_INTERVAL) {
                                    state.recentKillCount++;
                                } else {
                                    state.recentKillCount = 1;
                                }
                                state.lastKillTimestamp = now;

                                let announcerKey = '';
                                switch(state.recentKillCount) {
                                    case 2: announcerKey = 'announcer.doubleKill'; break;
                                    case 3: announcerKey = 'announcer.tripleKill'; break;
                                    case 4: announcerKey = 'announcer.ultraKill'; break;
                                    case 5: announcerKey = 'announcer.rampage'; break;
                                }
                                if(announcerKey) {
                                     newFloatingTexts.push({ id: `ft_announce_${Date.now()}`, text: t(announcerKey), x: canvasWidth/2, y: canvasHeight/2 - 100, life: 90, color: '#FFD700' });
                                }

                                if(target.isBoss) {
                                    state.boss = null;
                                }
                            }
                            if (target.type === 'tank') state.enemies = state.enemies.filter(e => e.id !== target.id);
                            if (target.type === 'kamikaze_drone') state.drones = state.drones.filter(d => d.id !== target.id);
                            if (target.type === 'asteroid') state.asteroids = state.asteroids.filter(a => a.id !== target.id);
                        }

                        if (!b.piercing) {
                            bulletAlive = false;
                            break; 
                        }
                    }
                }
            } else {
                const targets: Tank[] = [...(player ? [player] : []), ...state.allies];
                for (const target of targets) {
                     if (!target.isInvincible && 
                        b.x < target.x + target.width && b.x + b.width > target.x &&
                        b.y < target.y + target.height && b.y + b.height > target.y) {
                        
                        target.health -= b.damage;
                        target.damageFlashTimer = 10;
                        if (target.isPlayer) {
                            playSound('damage');
                            state.screenShake = { magnitude: 5, duration: 10 };
                            target.lastDamageTime = 0;
                            target.consecutiveHits = 0;
                        }
                        
                        state.sparks.push(...createSparks(b.x, b.y, 5));

                        if (target.health <= 0) {
                            if (target.isPlayer) {
                            } else {
                                const { explosion, scorchMark } = createExplosion(target.x + target.width / 2, target.y + target.height / 2, target.width);
                                state.explosions.push(explosion);
                                state.scorchMarks.push(scorchMark);
                                state.allies = state.allies.filter(a => a.id !== target.id);
                            }
                        }
                        bulletAlive = false;
                        break; 
                    }
                }
            }

            if (bulletAlive) {
                newBullets.push(b);
            }
        }
        state.bullets = newBullets;
        state.experienceOrbs.push(...newExperienceOrbs);
        state.floatingTexts.push(...newFloatingTexts);

        if(player) {
            state.experienceOrbs = state.experienceOrbs.filter(orb => {
                const dx = (player.x + player.width / 2) - orb.x;
                const dy = (player.y + player.height / 2) - orb.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 80) {
                     orb.x += (dx / dist) * 4 * deltaTime;
                     orb.y += (dy / dist) * 4 * deltaTime;
                }
                 if (dist < 20) {
                    player.experience = (player.experience || 0) + orb.value;
                    player.health = Math.min(player.maxHealth, player.health + 5);
                    
                    if (player.experience >= (XP_PER_LEVEL * (player.level || 1))) {
                        player.level = (player.level || 1) + 1;
                        player.experience = 0;
                        
                        playSound('levelUp');
                        state.status = GameStatus.LEVEL_UP_PAUSE;
                        state.isLevelUpModalOpen = true;

                        const availableUpgrades = [...state.upgrades].filter(u => u.id !== 'piercing' || !player.piercing);
                        const choices: Upgrade[] = [];
                        while(choices.length < 3 && availableUpgrades.length > 0) {
                            const index = Math.floor(Math.random() * availableUpgrades.length);
                            choices.push(availableUpgrades[index]);
                            availableUpgrades.splice(index, 1);
                        }
                        state.upgradeChoices = choices;
                        forceUiUpdate();
                    }
                    playSound('orb');
                    return false;
                }

                orb.life -= deltaTime;
                return orb.life > 0;
            });
        }
        
        if(player) {
            const playerAndAllies: Tank[] = [player, ...state.allies];
            state.drones = state.drones.filter(drone => {
                for(const target of playerAndAllies) {
                    if (!target.isInvincible && 
                        drone.x < target.x + target.width && drone.x + drone.width > target.x &&
                        drone.y < target.y + target.height && drone.y + drone.height > target.y) {
                        
                        target.health -= 35;
                        target.damageFlashTimer = 10;
                         if (target.isPlayer) {
                            playSound('damage');
                            target.lastDamageTime = 0;
                        }
                        const { explosion, scorchMark } = createExplosion(drone.x, drone.y, 40);
                        state.explosions.push(explosion);
                        state.scorchMarks.push(scorchMark);
                        return false;
                    }
                }
                return true;
            });
        }

        state.explosions = state.explosions.filter(e => {
            e.life -= deltaTime;
            if (e.shockwave) {
                e.shockwave.radius += 4 * deltaTime;
                e.shockwave.alpha = e.life / e.duration;
            }
            e.particles.forEach(p => { p.x += p.vx * deltaTime; p.y += p.vy * deltaTime; });
            e.smokeParticles.forEach(p => {
                p.x += p.vx * deltaTime; p.y += p.vy * deltaTime;
                p.life -= deltaTime;
            });
            return e.life > 0;
        });

        state.muzzleFlashes = state.muzzleFlashes.filter(f => { f.life -= deltaTime; return f.life > 0; });
        state.smokeParticles = state.smokeParticles.filter(p => { p.life -= deltaTime; return p.life > 0; });
        state.exhaustParticles = state.exhaustParticles.filter(p => { p.life -= deltaTime; return p.life > 0; });
        state.sparks = state.sparks.filter(s => {
            s.life = (s.life || 10) - deltaTime;
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            return s.life > 0;
        });
         state.shellCasings = state.shellCasings.filter(s => {
            s.life = (s.life || 60) - deltaTime;
            s.x += s.vx * deltaTime;
            s.y += s.vy * deltaTime;
            s.vy += 0.1 * deltaTime; // gravity
            s.rotation = (s.rotation || 0) + (s.rotationSpeed || 0) * deltaTime;
            return s.life > 0;
        });
        state.tireTracks.forEach(t => t.life = Math.max(0, t.life - 0.005 * deltaTime));
        state.tireTracks = state.tireTracks.filter(t => t.life > 0);
        state.floatingTexts = state.floatingTexts.filter(t => {
            t.y -= 0.5 * deltaTime;
            t.life -= deltaTime;
            return t.life > 0;
        });
        state.scorchMarks = state.scorchMarks.filter(m => {
            m.life -= deltaTime;
            return m.life > 0;
        });
        
        if (state.screenShake.duration > 0) state.screenShake.duration -= deltaTime; else state.screenShake.magnitude = 0;
    
        if (timestamp - lastUiUpdateTimeRef.current > 100) {
            forceUiUpdate();
            lastUiUpdateTimeRef.current = timestamp;
        }

        manageAmbientSounds();
    }, [createExplosion, playSound, keys, activateAbility, activateAdrenaline, t, forceUiUpdate, manageAmbientSounds]);

    const runGameLoop = useCallback((timestamp: number) => {
        gameLoop(timestamp);
        gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }, [gameLoop]);

    useEffect(() => {
        if (uiState.status === GameStatus.PLAYING) {
            lastFrameTimeRef.current = performance.now();
            gameLoopRef.current = requestAnimationFrame(runGameLoop);
        } else {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
                gameLoopRef.current = null;
            }
            manageAmbientSounds(); // Ensure ambient sounds are stopped
            const state = gameStateRef.current;
            if (uiState.status === GameStatus.GAME_OVER && state.player) {
                saveHighScore(state.score, state.player.country);
            }
        }

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [uiState.status, runGameLoop, manageAmbientSounds]);
    
    useEffect(() => {
        gameStateRef.current.canvasWidth = canvasSize.width;
        gameStateRef.current.canvasHeight = canvasSize.height;
    }, [canvasSize]);

    return { gameStateRef, uiState, startGame, buyShield, activateAbility, selectUpgrade, applyCheat, buyMartyrsBeacon, buyBackup, activateAdrenaline, returnToMenu };
};