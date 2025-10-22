import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState, Keys, Tank, Bullet, Explosion, Country, GameEntity, PowerUp, MuzzleFlash, SmokeParticle, AbilityType, ExperienceOrb, KamikazeDrone, Mine, Upgrade, UpgradeType, TireTrackPoint, Particle, WeatherState, WeatherType, FloatingText, TankCustomization, ArtilleryTarget, MartyrsBeacon } from '../types';
import { GameStatus } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COUNTRIES, MS_PER_FRAME } from '../constants';
import { TANK_DESIGNS, COUNTRY_TANK_MAP, ABILITY_MAP, createDesign, BOSS_DESIGN } from './tankDesigns';

const SHIELD_COST = 5000;
const MARTYRS_BEACON_COST = 5000;
const XP_PER_LEVEL = 100;
const KILL_STREAK_RESET_TIME = 180; // 3 seconds
const HEALTH_REGEN_DELAY = 300; // 5 seconds
const HEALTH_REGEN_INTERVAL = 60; // 1 second
const BOSS_WAVE_DIFFICULTY = 5;

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


const getHighScores = (): { flag: string, code: string, score: number }[] => {
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

const createTank = (isPlayer: boolean, country: Country, isChampion: boolean = false, isElite: boolean = false, difficulty: number = 1, isHardMode: boolean = false, customization?: TankCustomization, isAlly: boolean = false, isBoss: boolean = false, variant: 'default' | 'artillery' = 'default'): Tank => {
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
    if(isBoss) health = 10000 + (difficulty * 1000);
    else if (isChampion) health = 1000;
    else if (isElite) health = 250 + (difficulty * 10);
    else health = 100 + (difficulty * 5);
    
    if (variant === 'artillery') health *= 1.5;
    if (isHardMode && !isPlayer && !isAlly) health *= 1.5;

    let abilityCooldown = 1800; // 30s
    if (abilityType === 'quick_repair') abilityCooldown = 1200; // 20s
    if (abilityType === 'overdrive') abilityCooldown = 2400; // 40s

    const speed = isPlayer || isAlly ? 3.0 : isBoss ? 0.8 : (variant === 'artillery' ? 0.5 : 1.2 + (difficulty / 15) + Math.random() * 0.4) * (isHardMode ? 1.2 : 1);
    const maxCooldown = isPlayer || isAlly ? 25 : isBoss ? 40 : (variant === 'artillery' ? 480 : 70 - difficulty) * (isHardMode ? 0.8 : 1);

    return {
        id: tankId,
        type: 'tank',
        x: Math.random() * (CANVAS_WIDTH - (isBoss ? 100: 50)),
        y: isPlayer ? CANVAS_HEIGHT - 60 : isAlly ? CANVAS_HEIGHT - 120 : isBoss ? 50 : Math.random() * (CANVAS_HEIGHT - 200),
        width: isBoss ? 96 : 48,
        height: isBoss ? 72 : 36,
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
        abilityType: isAlly ? 'none' : abilityType, // Allies don't use abilities for now
        abilityActive: false,
        abilityTimer: 0,
        level: 1,
        experience: 0,
        damage: isPlayer ? 30 : isBoss ? 50 : (variant === 'artillery' ? 100 : 18 + difficulty),
        piercing: false,
        strafeDirection: Math.random() > 0.5 ? 1 : -1,
        spawnAnimProgress: 0,
        healthRegenRate: isPlayer ? 2 : 0, // Player regens 2 hp/sec
        healthRegenTimer: HEALTH_REGEN_INTERVAL,
        isAlly,
        isBoss,
        variant,
    };
};

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

const createInitialState = (playerCountry: Country, customization?: TankCustomization, mods: string[] = []): GameState => {
    const isHardMode = mods.includes('hard_mode');
    const hasAllySupport = mods.includes('ally_support');
    const isGlassCannon = mods.includes('glass_cannon');

    const player = createTank(true, playerCountry, false, false, 1, isHardMode, customization);
    if (isGlassCannon) {
        player.maxHealth /= 2;
        player.health /= 2;
        player.damage = (player.damage || 25) * 2;
    }

    const allies: Tank[] = [];
    if(hasAllySupport) {
        allies.push(createTank(false, playerCountry, false, false, 1, false, customization, true));
    }

    const starfield: Particle[] = [];
    for (let i = 0; i < 200; i++) {
        starfield.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.2 + 0.1,
            vx: 0, vy: 0, color: ''
        });
    }

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
        enemySpawnTimer: 0,
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
        droneSpawnTimer: 900, // Every 15s initially
        killStreak: 0,
        scoreMultiplier: 1.0,
        killStreakTimer: 0,
        upgrades: ALL_UPGRADES,
        isLevelUpModalOpen: false,
        upgradeChoices: [],
        tireTracks: [],
        mineSpawnTimer: 900, // increased from 600
        sparks: [],
        shellCasings: [],
        weather: { type: 'none', intensity: 0, timer: 600, particles: [] },
        floatingTexts: [],
        lowHealthPowerupCooldown: 0,
        starfield,
        artilleryTargets: [],
        martyrsBeacon: null,
        martyrsBeaconPurchased: false,
    }
};

export const useGameEngine = (playerCountry: Country | null, keys: React.MutableRefObject<Keys>) => {
    const [gameState, setGameState] = useState<GameState>(() => createInitialState(playerCountry || COUNTRIES[0]));
    const gameLoopRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const gameModsRef = useRef<string[]>([]);

    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

    useEffect(() => {
        const sounds: { [key: string]: string } = {
            shoot: 'https://storage.googleapis.com/proud-star-423616-g6-public/laser-shoot.wav',
            explosion: 'https://storage.googleapis.com/proud-star-423616-g6-public/explosion.wav',
            damage: 'https://storage.googleapis.com/proud-star-423616-g6-public/hit-damage.wav',
            levelUp: 'https://storage.googleapis.com/proud-star-423616-g6-public/level-up.wav',
            orb: 'https://storage.googleapis.com/proud-star-423616-g6-public/collect-orb.wav',
            combo: 'https://storage.googleapis.com/proud-star-423616-g6-public/combo.wav',
            shield_buy: 'https://storage.googleapis.com/proud-star-423616-g6-public/shield_buy.wav',
            cheat: 'https://storage.googleapis.com/proud-star-423616-g6-public/cheat_activated.wav',
            'aegis_shield': 'https://storage.googleapis.com/proud-star-423616-g6-public/aegis_shield.wav',
            'overdrive': 'https://storage.googleapis.com/proud-star-423616-g6-public/overdrive.wav',
            'emp_blast': 'https://storage.googleapis.com/proud-star-423616-g6-public/emp_blast.wav',
            'golden_bullet': 'https://storage.googleapis.com/proud-star-423616-g6-public/golden_bullet.wav',
            'quick_repair': 'https://storage.googleapis.com/proud-star-423616-g6-public/quick_repair.wav',
            boss_spawn: 'https://storage.googleapis.com/proud-star-423616-g6-public/boss_spawn_warning.wav',
        };
        const volumes: { [key: string]: number } = {
            shoot: 0.2, explosion: 0.3, damage: 0.4, levelUp: 0.5, orb: 0.5, combo: 0.4,
            shield_buy: 0.6, cheat: 0.7, boss_spawn: 0.8,
            'aegis_shield': 0.5,
            'overdrive': 0.5,
            'emp_blast': 0.6,
            'golden_bullet': 0.6,
            'quick_repair': 0.5,
        };
        
        Object.keys(sounds).forEach(key => {
            const audio = new Audio(sounds[key]);
            audio.volume = volumes[key] || 0.5;
            audio.preload = 'auto';
            audioRefs.current[key] = audio;
        });

    }, []);

    const playSound = useCallback((sound: string) => {
        const audio = audioRefs.current[sound];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error(`Sound ${sound} failed to play:`, e));
        }
    }, []);
    
    const startGame = useCallback((customization?: TankCustomization, mods: string[] = []) => {
        if (!playerCountry) return;
        gameModsRef.current = mods;
        const newState = createInitialState(playerCountry, customization, mods);
        setGameState(prevState => ({
            ...newState,
            leaderboard: prevState.leaderboard,
            shields: prevState.shields,
            status: GameStatus.PLAYING,
        }));
    }, [playerCountry]);

    const buyShield = () => {
        setGameState(prevState => {
            if (prevState.score >= SHIELD_COST && prevState.status === GameStatus.PLAYING) {
                const newShields = prevState.shields + 1;
                saveShields(newShields);
                playSound('shield_buy');
                return { ...prevState, score: prevState.score - SHIELD_COST, shields: newShields };
            }
            return prevState;
        });
    };

    const buyMartyrsBeacon = () => {
        setGameState(prevState => {
            if (prevState.score >= MARTYRS_BEACON_COST && !prevState.martyrsBeaconPurchased && prevState.status === GameStatus.PLAYING) {
                playSound('shield_buy');
                return { ...prevState, score: prevState.score - MARTYRS_BEACON_COST, martyrsBeaconPurchased: true };
            }
            return prevState;
        });
    }
    
    const applyCheat = (code: string) => {
        setGameState(prevState => {
            if (!prevState.player) return prevState;
            let newState = { ...prevState };
            let cheatApplied = false;
            let cheatText = '';
    
            if (code === '12alillat') {
                const newPlayer = { ...newState.player, 
                    damage: (newState.player.damage || 25) * 2,
                    speed: newState.player.speed * 1.5,
                    maxCooldown: newState.player.maxCooldown * 0.5,
                };
                newState.player = newPlayer;
                newState.score += 100000;
                cheatApplied = true;
                cheatText = 'QUALITY BOOST!';
            } else if (code === 'gdmn100') {
                newState.score += 25000;
                const newShields = (newState.shields || 0) + 5;
                newState.shields = newShields;
                saveShields(newShields);
                cheatApplied = true;
                cheatText = 'REINFORCEMENTS!';
            }
    
            if (cheatApplied) {
                playSound('cheat');
                newState.floatingTexts.push({ id: `ft_${Date.now()}`, text: cheatText, x: newState.player.x, y: newState.player.y - 20, life: 120, color: '#00FF00' });
            }
            return newState;
        });
    };

    const applyAbilityToPlayer = useCallback((player: Tank): Tank => {
        if (!player || player.abilityCooldown > 0 || player.abilityActive) {
            return player;
        }
    
        playSound(player.abilityType);
    
        const newPlayer = { ...player, abilityActive: true, abilityCooldown: player.maxAbilityCooldown };
        
        switch(newPlayer.abilityType) {
            case 'aegis_shield':
                newPlayer.abilityTimer = 300; // 5s
                newPlayer.isInvincible = true;
                break;
            case 'overdrive':
                newPlayer.abilityTimer = 420; // 7s
                newPlayer.originalSpeed = newPlayer.speed;
                newPlayer.originalMaxCooldown = newPlayer.maxCooldown;
                newPlayer.speed *= 1.5;
                newPlayer.maxCooldown /= 2;
                break;
            case 'emp_blast':
                // handled in game loop
                break;
            case 'golden_bullet':
                newPlayer.abilityTimer = 1; // one shot
                break;
            case 'quick_repair':
                newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + newPlayer.maxHealth * 0.4); // Heal 40%
                newPlayer.abilityActive = false; // instant
                break;
        }
    
        return newPlayer;
    }, [playSound]);
    
    const activateAbility = useCallback(() => {
        setGameState(prevState => {
            if (!prevState.player) {
                return prevState;
            }
            const newPlayer = applyAbilityToPlayer(prevState.player);
            return { ...prevState, player: newPlayer };
        });
    }, [applyAbilityToPlayer]);

    const selectUpgrade = useCallback((upgrade: Upgrade) => {
        setGameState(prevState => {
            if (!prevState.player) return prevState;
            const newPlayer = upgrade.apply(prevState.player);
            return {
                ...prevState,
                player: newPlayer,
                isLevelUpModalOpen: false,
                status: GameStatus.PLAYING
            };
        });
    }, []);
    
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

    const createExplosion = (x: number, y: number, size: number, isShrapnel: boolean = false): Explosion => {
        const particles: Particle[] = [];
        const particleCount = isShrapnel ? 50 : 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (isShrapnel ? 8 : 5) + 1;
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                color: ['#FFA500', '#FF4500', '#FF6347', '#FFD700'][Math.floor(Math.random() * 4)],
            });
        }
        playSound('explosion');
        return { type: 'explosion', id: `exp_${Date.now()}`, x, y, width:size, height:size, particles, life: 30, duration: 30, isShrapnel };
    };

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

        // Clamp deltaTime to avoid physics bugs after long pauses
        if (deltaTime > 3) deltaTime = 3;

        setGameState(prevState => {
            if (prevState.status !== GameStatus.PLAYING && prevState.status !== GameStatus.DEATH_ANIMATION) return prevState;

            let state = { ...prevState };

            if (state.status === GameStatus.DEATH_ANIMATION) {
                if (state.martyrsBeacon) {
                    state.martyrsBeacon.timer -= deltaTime;
                    if (state.martyrsBeacon.timer <= 0) {
                        const beacon = state.martyrsBeacon;
                        state.explosions.push(createExplosion(beacon.x, beacon.y, 300, true));
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
                        state.leaderboard = getHighScores();
                    }
                } else {
                     state.status = GameStatus.GAME_OVER;
                }
                return state;
            }

            // --- Regular Game Loop (Status === PLAYING) ---
            
            // Update timers
            state.time = state.time + deltaTime / 60;
            const oldDifficulty = state.difficulty;
            state.difficulty = 1 + Math.floor(state.time / 45);

            if (state.killStreakTimer > 0) state.killStreakTimer -= deltaTime; else {
                state.killStreak = 0;
                state.scoreMultiplier = 1.0;
            }
            if (state.lowHealthPowerupCooldown > 0) state.lowHealthPowerupCooldown -= deltaTime;

            // Player Update
            let player = state.player;
            if (player) {
                const lastPlayerPos = { x: player.x, y: player.y };
                if (player.spawnAnimProgress < 1) {
                    player.spawnAnimProgress = Math.min(1, player.spawnAnimProgress + 0.02 * deltaTime);
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

                let moveSpeed = player.speed * deltaTime;
                if (state.weather.type === 'snow') {
                    moveSpeed *= 0.8; // Increased slowdown
                }
                if (keys.current.w) player.y -= moveSpeed;
                if (keys.current.s) player.y += moveSpeed;
                if (keys.current.a) player.x -= moveSpeed;
                if (keys.current.d) player.x += moveSpeed;
                
                player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
                player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));
                
                const movedX = player.x - lastPlayerPos.x;
                const movedY = player.y - lastPlayerPos.y;

                if(keys.current.w || keys.current.s || keys.current.a || keys.current.d) {
                    state.tireTracks.push({x: player.x + player.width/2, y: player.y + player.height/2, life: 1});
                    if(state.tireTracks.length > 200) state.tireTracks.shift();
                }

                // Starfield Parallax
                state.starfield.forEach(star => {
                    star.x -= movedX * (star.speed || 0.5);
                    star.y -= movedY * (star.speed || 0.5);
                    if (star.x < 0) star.x += CANVAS_WIDTH;
                    if (star.x > CANVAS_WIDTH) star.x -= CANVAS_WIDTH;
                    if (star.y < 0) star.y += CANVAS_HEIGHT;
                    if (star.y > CANVAS_HEIGHT) star.y -= CANVAS_HEIGHT;
                });

                 // Health Regeneration
                if (player.lastDamageTime > HEALTH_REGEN_DELAY) {
                    player.healthRegenTimer -= deltaTime;
                    if (player.healthRegenTimer <= 0) {
                        player.health = Math.min(player.maxHealth, player.health + player.healthRegenRate);
                        player.healthRegenTimer = HEALTH_REGEN_INTERVAL;
                    }
                } else {
                    player.lastDamageTime += deltaTime;
                }


                if (player.fireCooldown > 0) player.fireCooldown -= deltaTime;
                if (keys.current[' '] && player.fireCooldown <= 0 && player.targetId) {
                    const target = allTargets.find(e => e.id === player.targetId);
// FIX: Added a type guard to ensure the target has width and height properties before calculating bullet trajectory.
                    if (target && 'width' in target && 'height' in target) {
                        player.fireCooldown = player.maxCooldown;
                        const isGolden = player.abilityActive && player.abilityType === 'golden_bullet';
                        const dx = target.x + target.width / 2 - (player.x + player.width / 2);
                        const dy = target.y + target.height / 2 - (player.y + player.height / 2);
                        const dist = Math.hypot(dx, dy);
                        
                        if (dist > 0) {
                            const bulletSpeed = 12;
                            let bulletVx = (dx / dist) * bulletSpeed;
                            let bulletVy = (dy / dist) * bulletSpeed;
                            let angle = Math.atan2(bulletVy, bulletVx);

                            if (state.weather.type === 'rain') {
                                const inaccuracy = 0.12; // Increased inaccuracy
                                const newAngle = angle + (Math.random() - 0.5) * inaccuracy;
                                const speed = Math.hypot(bulletVx, bulletVy) * 0.9; // slightly slower
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
                                vx: bulletVx, vy: bulletVy, damage: (player.damage || 25) * (isGolden ? 5 : 1),
                                isPlayerBullet: true, color: isGolden ? '#FFD700' : '#00FFFF',
                                piercing: player.piercing
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
                if (keys.current.q) {
                    state.player = applyAbilityToPlayer(player);
                    player = state.player;
                }
                if (player.damageFlashTimer && player.damageFlashTimer > 0) player.damageFlashTimer -= deltaTime;

                 // Low health power-up spawn
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

            // Allies Update
            state.allies.forEach(ally => {
                // Find closest enemy
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

                // Simple AI: Move towards player's side and shoot
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
                        const bulletSpeed = 12;
                        const bulletVx = (dx / dist) * bulletSpeed;
                        const bulletVy = (dy / dist) * bulletSpeed;
                        const angle = Math.atan2(bulletVy, bulletVx);
                        const barrelLength = ally.width * 0.4;
                        state.bullets.push({
                            id: `bullet_${Date.now()}`, type: 'bullet',
                            x: ally.x + ally.width / 2 - 5 + Math.cos(angle) * barrelLength,
                            y: ally.y + ally.height / 2 - 5 + Math.sin(angle) * barrelLength,
                            width: 10, height: 10, vx: bulletVx, vy: bulletVy, damage: (ally.damage || 25),
                            isPlayerBullet: true, color: '#90EE90', piercing: ally.piercing,
                        });
                    }
                }
            });

             // Handle power-up collection
            if (player) {
                state.powerUps = state.powerUps.filter(p => {
                    const dx = (player.x + player.width / 2) - (p.x + p.width / 2);
                    const dy = (player.y + player.height / 2) - (p.y + p.height / 2);
                    if (Math.hypot(dx, dy) < 30) {
                        player.maxCooldown /= 2;
                        setTimeout(() => {
                           setGameState(g => g.player ? {...g, player: {...g.player, maxCooldown: g.player.maxCooldown * 2}} : g);
                        }, p.duration * (1000/60));
                        return false;
                    }
                    p.life -= deltaTime;
                    return p.life > 0;
                });
            }

            // Weather Update
            state.weather.timer -= deltaTime;
            if (state.weather.timer <= 0) {
                const weatherTypes: WeatherType[] = ['none', 'rain', 'snow', 'fog'];
                const newType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
                state.weather.type = newType;
                state.weather.timer = 1200 + Math.random() * 1200; // 20-40 seconds
                state.weather.particles = [];
                state.weather.intensity = 0.2 + Math.random() * 0.2;
                if(newType === 'rain') {
                    for(let i = 0; i < 100; i++) state.weather.particles.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, vx: -2, vy: 10, size: 2, color: '' });
                } else if(newType === 'snow') {
                    for(let i = 0; i < 150; i++) state.weather.particles.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, vx: Math.random() - 0.5, vy: 1 + Math.random(), size: 1 + Math.random() * 2, color: '' });
                }
            }
            if(state.weather.type === 'rain' || state.weather.type === 'snow') {
                state.weather.particles.forEach(p => {
                    p.x += p.vx * deltaTime;
                    p.y += p.vy * deltaTime;
                    if(p.y > CANVAS_HEIGHT) { p.y = 0; p.x = Math.random() * CANVAS_WIDTH; }
                    if(p.x > CANVAS_WIDTH) p.x = 0; else if(p.x < 0) p.x = CANVAS_WIDTH;
                });
            }

            // Drones Update
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

            // Boss Update
            if (state.boss && player) {
                const boss = state.boss;
                 if (boss.spawnAnimProgress < 1) {
                    boss.spawnAnimProgress = Math.min(1, boss.spawnAnimProgress + 0.01 * deltaTime);
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
                     // shotgun blast
                    for(let i=0; i<8; i++){
                        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
                        const speed = 5 + Math.random() * 2;
                        state.bullets.push({
                            id: `bullet_${Date.now()}_${i}`, type: 'bullet',
                            x: boss.x + boss.width/2 - 4, y: boss.y + boss.height/2 - 4,
                            width: 10, height: 10, 
                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, 
                            damage: boss.damage || 40, isPlayerBullet: false, color: '#FF1493'
                        })
                    }
                }
            }

            // Enemies Update
            state.enemies.forEach(enemy => {
                if (enemy.spawnAnimProgress < 1) {
                    enemy.spawnAnimProgress = Math.min(1, enemy.spawnAnimProgress + 0.02 * deltaTime);
                }

                if (player) {
                    const dx = player.x - enemy.x;
                    const dy = player.y - enemy.y;
                    const dist = Math.hypot(dx, dy);
                    const safeDistance = enemy.variant === 'artillery' ? 400 : 150;
                    
                    let enemyMoveSpeed = enemy.speed * deltaTime;
                    if(state.weather.type === 'snow') enemyMoveSpeed *= 0.8;

                    if (dist > 0 && enemy.variant !== 'artillery') {
                        if (dist > safeDistance) { // Move towards player
                            enemy.x += (dx / dist) * enemyMoveSpeed;
                            enemy.y += (dy / dist) * enemyMoveSpeed;
                        } else { // Too close, back up and strafe
                            enemy.x -= (dx / dist) * enemyMoveSpeed * 0.5;
                            enemy.y -= (dy / dist) * enemyMoveSpeed * 0.5;
                            const perpDx = -dy / dist;
                            const perpDy = dx / dist;
                            enemy.x += perpDx * enemyMoveSpeed * 0.8 * enemy.strafeDirection;
                            enemy.y += perpDy * enemyMoveSpeed * 0.8 * enemy.strafeDirection;
                        }
                    }
                    enemy.targetId = player.id;
                }

                if (enemy.fireCooldown > 0) enemy.fireCooldown -= deltaTime;
                else if (player) {
                    if (enemy.variant === 'artillery') {
                        enemy.fireCooldown = enemy.maxCooldown;
                        state.artilleryTargets.push({ id: `at_${Date.now()}`, type: 'artillery_target', x: player.x + player.width/2, y: player.y + player.height/2, width: 0, height: 0, radius: 80, timer: 240, maxTimer: 240, state: 'sweeping' });
                    } else {
                        const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
                        const dy = player.y + player.height / 2 - (enemy.y + enemy.height / 2);
                        const dist = Math.hypot(dx, dy);
                        const detectionRange = state.weather.type === 'fog' ? 200 : 500;
                        if (dist > 0 && dist < detectionRange) {
                            enemy.fireCooldown = enemy.maxCooldown;
                            const bulletSpeed = 6;
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
                            
                            state.bullets.push({
                                 id: `bullet_${Date.now()}`, type: 'bullet',
                                x: enemy.x + enemy.width / 2 - 4 + Math.cos(angle) * barrelLength,
                                y: enemy.y + enemy.height / 2 - 4 + Math.sin(angle) * barrelLength,
                                width: 8, height: 8, vx: bulletVx, vy: bulletVy, damage: enemy.damage || 10,
                                isPlayerBullet: false, color: '#FF4500',
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

            // Artillery Target Update
            state.artilleryTargets = state.artilleryTargets.filter(target => {
                target.timer -= deltaTime;
                if(target.state === 'sweeping' && target.timer < target.maxTimer / 2) {
                    target.state = 'locking';
                }
                if (target.timer <= 0) {
                    state.explosions.push(createExplosion(target.x, target.y, 160, true));
                    // Shrapnel
                    for(let i=0; i<12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const speed = 7;
                        state.bullets.push({ id: `shrapnel_${Date.now()}_${i}`, type: 'bullet', x: target.x, y: target.y, width: 6, height: 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: 20, isPlayerBullet: false, color: '#FFA500'});
                    }
                    return false;
                }
                return true;
            });

            // Bullets Update
            state.bullets.forEach(b => {
                b.x += b.vx * deltaTime;
                b.y += b.vy * deltaTime;
            });

             // Mine update
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
                            state.explosions.push(createExplosion(mine.x, mine.y, 60));
                            playSound('damage');
                            return false;
                        }
                    }
                    mine.life -= deltaTime;
                    return mine.life > 0;
                });
            }


            // Spawning
            const isBossWave = state.boss !== null;
            if (!isBossWave) {
                 if(state.difficulty > oldDifficulty && state.difficulty % BOSS_WAVE_DIFFICULTY === 0) {
                    playSound('boss_spawn');
                    state.floatingTexts.push({ id: `ft_boss_${Date.now()}`, text: `WARNING: BOSS APPROACHING!`, x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2, life: 180, color: '#FF0000' });
                    state.enemies = []; // Clear enemies for boss
                    state.boss = createTank(false, COUNTRIES[0], false, false, state.difficulty, state.isHardMode, undefined, false, true);
                } else {
                    state.enemySpawnTimer -= deltaTime;
                    if (state.enemySpawnTimer <= 0) {
                        const isChampionRush = gameModsRef.current.includes('champion_rush');
                        state.enemySpawnTimer = Math.max(30, (isChampionRush ? 600 : 240) - state.difficulty * 8);
                        const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
                        const variant = Math.random() < 0.2 ? 'artillery' : 'default';
                        state.enemies.push(createTank(false, randomCountry, isChampionRush, !isChampionRush && Math.random() < 0.1, state.difficulty, state.isHardMode, undefined, false, false, variant));
                    }
                }
            }

            state.mineSpawnTimer -= deltaTime;
            if(state.mineSpawnTimer <= 0) {
                state.mineSpawnTimer = 1200 + Math.random() * 600; // Every 20-30s
                state.mines.push({
                    id: `mine_${Date.now()}`, type: 'mine',
                    x: Math.random() * (CANVAS_WIDTH - 20), y: Math.random() * (CANVAS_HEIGHT - 20),
                    width: 12, height: 12, isArmed: false, armTimer: 120, life: 1800, // Arm in 2s, last 30s
                });
            }

            state.droneSpawnTimer -= deltaTime;
            if (state.droneSpawnTimer <= 0) {
                state.droneSpawnTimer = 600 + Math.random() * 300;
                if (player && state.drones.length < 5) {
                    state.drones.push({
                        id: `drone_${Date.now()}`,
                        type: 'kamikaze_drone',
                        x: Math.random() > 0.5 ? -20 : CANVAS_WIDTH + 20,
                        y: Math.random() * CANVAS_HEIGHT,
                        width: 15,
                        height: 15,
                        health: 20 + (5 * state.difficulty),
                        speed: 1.8 + state.difficulty * 0.2,
                        targetId: player.id,
                    });
                }
            }


            // Collisions
            const newBullets = [];
            for (const bullet of state.bullets) {
                let hit = false;
                if (bullet.isPlayerBullet) { // Includes player and ally bullets
                    const targets: (Tank|KamikazeDrone)[] = [...state.enemies, ...state.drones];
                    if(state.boss) targets.push(state.boss);

                    for (const target of targets) {
                         if (target.type === 'tank' && target.isInvincible) continue;
                         if (bullet.x < target.x + target.width && bullet.x + bullet.width > target.x &&
                            bullet.y < target.y + target.height && bullet.y + bullet.height > target.y) {
                            hit = true;
                            target.health -= bullet.damage;
                            if(target.type === 'tank') target.damageFlashTimer = 10;
                            state.sparks.push(...createSparks(bullet.x, bullet.y, 10));
                            if (!bullet.piercing) break;
                        }
                    }
                } else { // Enemy bullets
                    const targets = [player, ...state.allies].filter(Boolean) as Tank[];
                    for (const target of targets) {
                         if (!target.isInvincible && bullet.x < target.x + target.width && bullet.x + bullet.width > target.x &&
                            bullet.y < target.y + target.height && bullet.y + bullet.height > target.y) {
                            hit = true;
                            target.health -= bullet.damage;
                            target.damageFlashTimer = 10;
                            if(target.isPlayer) {
                                target.lastDamageTime = 0; // Reset regen timer on hit
                                playSound('damage');
                            }
                            state.sparks.push(...createSparks(bullet.x, bullet.y, 5));
                            break; // Bullet hits one target
                        }
                    }
                }
                if (!hit) newBullets.push(bullet);
            }
            state.bullets = newBullets.filter(b => b.x > -10 && b.x < CANVAS_WIDTH + 10 && b.y > -10 && b.y < CANVAS_HEIGHT + 10);

            // Enemy death
            const newEnemies = [];
            for(const enemy of state.enemies) {
                if(enemy.health <= 0) {
                    state.explosions.push(createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 50));
                    const scoreMultiplier = state.scoreMultiplier * (state.isHardMode ? 1.5 : 1);
                    const scoreValue = Math.floor((enemy.isChampion ? 500 : (enemy.variant === 'artillery' ? 250 : 100)) * scoreMultiplier);
                    state.score += scoreValue;
                    state.floatingTexts.push({ id: `ft_${Date.now()}`, text: `+${scoreValue}`, x: enemy.x, y: enemy.y, life: 60, color: '#FFD700' });
                    state.experienceOrbs.push({ id: `orb_${Date.now()}`, type: 'experience_orb', x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, width: 10, height: 10, value: 20, life: 600 });
                    
                    if (enemy.isElite) {
                         state.screenShake = { magnitude: 8, duration: 20 };
                    }

                    const oldStreakTier = Math.floor(state.killStreak / 5);
                    state.killStreak++;
                    const newStreakTier = Math.floor(state.killStreak / 5);
                    
                    if (newStreakTier > oldStreakTier) {
                        playSound('combo');
                        const newMultiplier = 1 + newStreakTier * 0.1;
                        if (player) {
                            state.floatingTexts.push({
                                id: `ft_streak_${Date.now()}`, text: `x${newMultiplier.toFixed(1)} MULTIPLIER!`,
                                x: player.x, y: player.y - 40, life: 120, color: '#FF8C00'
                            });
                        }
                    }

                    state.killStreakTimer = KILL_STREAK_RESET_TIME;
                    state.scoreMultiplier = 1 + newStreakTier * 0.1;
                } else {
                    newEnemies.push(enemy);
                }
            }
            state.enemies = newEnemies;

            // Boss Death
            if (state.boss && state.boss.health <= 0) {
                state.explosions.push(createExplosion(state.boss.x + state.boss.width / 2, state.boss.y + state.boss.height / 2, 200));
                const scoreValue = 10000 * state.difficulty;
                state.score += scoreValue;
                state.floatingTexts.push({ id: `ft_boss_death_${Date.now()}`, text: `+${scoreValue}`, x: state.boss.x, y: state.boss.y, life: 180, color: '#FF00FF' });
                // XP orb shower
                for(let i=0; i<50; i++) {
                    state.experienceOrbs.push({ id: `orb_boss_${Date.now()}_${i}`, type: 'experience_orb', x: state.boss.x + Math.random() * state.boss.width, y: state.boss.y + Math.random() * state.boss.height, width: 15, height: 15, value: 50, life: 900 });
                }
                state.boss = null;
                state.enemySpawnTimer = 180; // Resume spawning after 3 seconds
            }

            // Ally death
            state.allies = state.allies.filter(ally => {
                if (ally.health <= 0) {
                    state.explosions.push(createExplosion(ally.x + ally.width / 2, ally.y + ally.height / 2, 40));
                    return false;
                }
                return true;
            });

            // XP Orbs update
            if (player) {
                const attractionRadius = 100;
                state.experienceOrbs.forEach(orb => {
                    const dx = (player.x + player.width / 2) - orb.x;
                    const dy = (player.y + player.height / 2) - orb.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < attractionRadius) {
                        orb.x += (dx / dist) * 3 * deltaTime;
                        orb.y += (dy / dist) * 3 * deltaTime;
                    }

                    if (dist < player.width / 2) {
                        player.experience += orb.value;
                        orb.life = 0; // mark for removal
                        playSound('orb');
                    }
                });
            }
            state.experienceOrbs = state.experienceOrbs.filter(orb => {
                orb.life -= deltaTime;
                return orb.life > 0;
            });
            
            // Drone death (from bullets)
            const newDrones = [];
            for (const drone of state.drones) {
                if (drone.health <= 0) {
                    state.explosions.push(createExplosion(drone.x + drone.width / 2, drone.y + drone.height / 2, 30));
                    state.score += (50 * state.scoreMultiplier);
                    if (player) player.experience += 5;
                } else {
                    newDrones.push(drone);
                }
            }
            state.drones = newDrones;

            // Kamikaze drone collision with player
            if (player && !player.isInvincible) {
                state.drones = state.drones.filter(drone => {
                    const dx = (player.x + player.width / 2) - (drone.x + drone.width / 2);
                    const dy = (player.y + player.height / 2) - (drone.y + drone.height / 2);
                    if (Math.hypot(dx, dy) < (player.width / 2 + drone.width / 2)) {
                        player.health -= 30;
                        player.damageFlashTimer = 10;
                        player.lastDamageTime = 0;
                        state.explosions.push(createExplosion(drone.x, drone.y, 30));
                        playSound('damage');
                        return false; // remove drone
                    }
                    return true;
                });
            }

            // Leveling up
            if (player && player.experience >= XP_PER_LEVEL * player.level) {
                player.experience -= XP_PER_LEVEL * player.level;
                player.level++;
                player.health = player.maxHealth; // Full heal on level up
                playSound('levelUp');
                state.floatingTexts.push({ id: `ft_${Date.now()}`, text: `LEVEL UP!`, x: player.x, y: player.y - 20, life: 120, color: '#00FF00' });
                
                const availableUpgrades = state.upgrades.filter(u => u.id !== 'piercing' || !player.piercing);
                const choices: Upgrade[] = [];
                const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
                for(let i=0; i<Math.min(3, shuffled.length); i++) {
                    choices.push(shuffled[i]);
                }

                state.upgradeChoices = choices;
                state.isLevelUpModalOpen = true;
                state.status = GameStatus.LEVEL_UP_PAUSE;
                return state;
            }

            // Screen Shake Update
            if (state.screenShake.duration > 0) {
                state.screenShake.duration -= deltaTime;
            } else {
                state.screenShake.magnitude = 0;
            }

            // Update other effects
            state.muzzleFlashes = state.muzzleFlashes.filter(f => { f.life -= deltaTime; return f.life > 0; });
            
            state.explosions.forEach(e => {
                e.particles.forEach(p => {
                    p.x += p.vx * deltaTime;
                    p.y += p.vy * deltaTime;
                    p.vy += 0.1 * deltaTime; // Gravity
                    p.size = Math.max(0, p.size - 0.05 * deltaTime);
                });
            });
            state.explosions = state.explosions.filter(e => { e.life -= deltaTime; return e.life > 0; });
            
            state.smokeParticles.forEach(p => { p.life -= deltaTime; p.x += p.vx; p.y += p.vy; });
            state.smokeParticles = state.smokeParticles.filter(p => p.life > 0);
            state.sparks = state.sparks.filter(s => { s.life -= deltaTime; s.x += s.vx; s.y += s.vy; return s.life > 0; });
            state.shellCasings.forEach(s => { s.life -= deltaTime; s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.rotation += s.rotationSpeed;});
            state.shellCasings = state.shellCasings.filter(s => s.life > 0);
            state.tireTracks.forEach(t => t.life -= 0.005 * deltaTime);
            state.tireTracks = state.tireTracks.filter(t => t.life > 0);
            state.floatingTexts = state.floatingTexts.filter(ft => { ft.y -= 0.5 * deltaTime; ft.life -= deltaTime; return ft.life > 0; });

            // Game Over
            if (player && player.health <= 0) {
                if (state.shields > 0) {
                    player.health = player.maxHealth * 0.5;
                    player.isInvincible = true;
                    player.invincibilityTimer = 180; // 3 seconds
                    state.shields--;
                    saveShields(state.shields);
                } else if(state.martyrsBeaconPurchased) {
                    state.status = GameStatus.DEATH_ANIMATION;
                    state.martyrsBeacon = { id: `mb_${Date.now()}`, type: 'martyrs_beacon', x: player.x + player.width/2, y: player.y + player.height/2, width: 0, height: 0, timer: 180, maxTimer: 180};
                    state.player = null; // Remove player from game
                } else {
                    if (player.country) {
                        saveHighScore(state.score, player.country);
                    }
                    state.status = GameStatus.GAME_OVER;
                    state.leaderboard = getHighScores();
                }
            }

            return state;
        });

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [applyAbilityToPlayer, playSound, keys]);

    useEffect(() => {
        if (gameState.status === GameStatus.PLAYING || gameState.status === GameStatus.DEATH_ANIMATION) {
            if (!gameLoopRef.current) {
                lastFrameTimeRef.current = performance.now();
                gameLoopRef.current = requestAnimationFrame(gameLoop);
            }
        } else {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
                gameLoopRef.current = null;
            }
        }
        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameState.status, gameLoop]);

    return { gameState, startGame, buyShield, activateAbility, selectUpgrade, applyCheat, buyMartyrsBeacon };
};
