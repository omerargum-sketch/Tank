import type { TankDesign } from './hooks/tankDesigns';

export enum GameStatus {
    START,
    PLAYING,
    PAUSED,
    GAME_OVER,
    LEVEL_UP_PAUSE,
    DEATH_ANIMATION,
}

export interface TankCustomization {
    baseColor: string;
    turretColor: string;
}

export interface Country {
    code: string;
    name: string;
    flag: string;
}

export interface GameObject {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type AbilityType = 'none' | 'aegis_shield' | 'overdrive' | 'emp_blast' | 'golden_bullet' | 'quick_repair';

export interface Tank extends GameObject {
    type: 'tank';
    baseColor: string;
    turretColor: string;
    health: number;
    maxHealth: number;
    isPlayer: boolean;
    speed: number;
    fireCooldown: number;
    maxCooldown: number;
    country: Country;
    targetId: string | null;
    lastDamageTime: number;
    isInvincible: boolean;
    invincibilityTimer: number;

    // New properties
    isChampion?: boolean;
    isElite?: boolean;
    abilityCooldown: number;
    maxAbilityCooldown: number;
    abilityType: AbilityType;
    abilityActive: boolean;
    abilityTimer: number;

    // Ally and Boss properties
    isAlly?: boolean;
    isBoss?: boolean;
    originalSpeed?: number;
    originalMaxCooldown?: number;
    
    // Leveling system for player
    level?: number;
    experience?: number;
    damage?: number; // Base damage
    piercing: boolean;
    // Graphics enhancements
    design: TankDesign;
    damageFlashTimer?: number;

    // New AI and animation properties
    strafeDirection: -1 | 1;
    spawnAnimProgress: number;

    // Health Regen
    healthRegenRate: number;
    healthRegenTimer: number;

    // New enemy variant
    variant?: 'default' | 'artillery';
}

export interface Bullet extends GameObject {
    type: 'bullet';
    vx: number;
    vy: number;
    damage: number;
    isPlayerBullet: boolean;
    color: string;
    piercing?: boolean;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life?: number; // for sparks and shells
    rotation?: number;
    rotationSpeed?: number;
    // For starfield
    speed?: number;
}

export interface SmokeParticle extends Particle {
    life: number;
    maxLife: number;
}


export interface MuzzleFlash extends GameObject {
    type: 'muzzle_flash';
    life: number;
    duration: number;
    angle: number;
}

export interface Explosion extends GameObject {
    type: 'explosion';
    particles: Particle[];
    life: number;
    duration: number;
    isShrapnel?: boolean;
}

export interface PowerUp extends GameObject {
    type: 'powerup';
    powerUpType: 'rapid_fire';
    life: number;
    duration: number;
}

export interface ExperienceOrb extends GameObject {
    type: 'experience_orb';
    value: number;
    life: number;
}

export interface KamikazeDrone extends GameObject {
    type: 'kamikaze_drone';
    health: number;
    speed: number;
    targetId: string;
}

export interface Mine extends GameObject {
    type: 'mine';
    isArmed: boolean;
    armTimer: number;
    life: number;
}

export type UpgradeType = 'maxHealth' | 'speed' | 'damage' | 'fireRate' | 'piercing';
export interface Upgrade {
    id: UpgradeType;
    title: string;
    description: string;
    apply: (tank: Tank) => Tank;
}

export interface FloatingText {
    id: string;
    text: string;
    x: number;
    y: number;
    life: number;
    color: string;
}

export interface ArtilleryTarget {
    id: string;
    type: 'artillery_target';
    x: number;
    y: number;
// FIX: Add width and height to make ArtilleryTarget compatible with other GameEntity types that have dimensions.
    width: number;
    height: number;
    radius: number;
    timer: number;
    maxTimer: number;
    state: 'sweeping' | 'locking';
}

export interface MartyrsBeacon {
    id: string;
    type: 'martyrs_beacon';
    x: number;
    y: number;
// FIX: Add width and height to make MartyrsBeacon compatible with other GameEntity types.
    width: number;
    height: number;
    timer: number;
    maxTimer: number;
}

export type GameEntity = Tank | Bullet | Explosion | PowerUp | ExperienceOrb | KamikazeDrone | Mine | ArtilleryTarget | MartyrsBeacon;

export interface TireTrackPoint {
    x: number;
    y: number;
    life: number;
}

export type WeatherType = 'none' | 'rain' | 'snow' | 'fog';

export interface WeatherState {
    type: WeatherType;
    intensity: number;
    timer: number;
    particles: Particle[];
}

export interface GameState {
    status: GameStatus;
    player: Tank | null;
    enemies: Tank[];
    bullets: Bullet[];
    explosions: Explosion[];
    powerUps: PowerUp[];
    score: number;
    time: number;
    difficulty: number;
    enemySpawnTimer: number;
    powerUpSpawnTimer: number;
    message: { text: string; color: string } | null;
    leaderboard: { flag: string; code: string; score: number }[];
    shields: number;
    // New properties
    muzzleFlashes: MuzzleFlash[];
    smokeParticles: SmokeParticle[];
    screenShake: { magnitude: number; duration: number };
    // Ally and Boss properties
    killCount: number;
    allies: Tank[];
    boss: Tank | null;
    // New hard mode property
    isHardMode: boolean;
    // New features state
    experienceOrbs: ExperienceOrb[];
    drones: KamikazeDrone[];
    mines: Mine[];
    killStreak: number;
    scoreMultiplier: number;
    killStreakTimer: number;
    upgrades: Upgrade[];
    isLevelUpModalOpen: boolean;
    upgradeChoices: Upgrade[];
    tireTracks: TireTrackPoint[];
    mineSpawnTimer: number;
    droneSpawnTimer: number;
    // Graphics enhancements
    sparks: Particle[];
    shellCasings: Particle[];
    // New Features
    weather: WeatherState;
    floatingTexts: FloatingText[];
    lowHealthPowerupCooldown: number;
    starfield: Particle[];
    artilleryTargets: ArtilleryTarget[];
    martyrsBeacon: MartyrsBeacon | null;
    martyrsBeaconPurchased: boolean;
}

export interface Keys {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    ' ': boolean;
    q: boolean;
}
