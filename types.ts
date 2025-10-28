import type { TankDesign } from './hooks/tankDesigns';

export type AbilityType = 'none' | 'aegis_shield' | 'overdrive' | 'emp_blast' | 'golden_bullet' | 'quick_repair';

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
    variant?: 'default' | 'artillery' | 'spawner' | 'swarmer' | 'medic' | 'sniper';
    // Spawner property
    spawnCooldown?: number;
    // Medic property
    healingAuraTimer?: number;

    // Motion blur for overdrive
    motionBlurTrail?: { x: number; y: number; life: number }[];

    // EMP Blast property
    isStunned?: boolean;
    stunTimer?: number;

    // Adrenaline Rush
    adrenaline: number;
    maxAdrenaline: number;
    isAdrenalineActive: boolean;
    adrenalineTimer: number;
    consecutiveHits: number;
}

export interface Bullet extends GameObject {
    type: 'bullet';
    vx: number;
    vy: number;
    damage: number;
    isPlayerBullet: boolean;
    color: string;
    piercing?: boolean;
    trail?: {x: number, y: number}[];
    isHealing?: boolean;
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
    alpha?: number;
    isDebris?: boolean;
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
    smokeParticles: SmokeParticle[];
    life: number;
    duration: number;
    isShrapnel?: boolean;
    isRockDebris?: boolean;
    shockwave?: { radius: number; maxRadius: number; alpha: number; };
}

export interface PowerUp extends GameObject {
    type: 'powerup';
    powerUpType: 'rapid_fire' | 'black_hole';
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
    width: number;
    height: number;
    timer: number;
    maxTimer: number;
}

export interface SolarFlareWarning extends GameObject {
    type: 'solar_flare_warning';
    timer: number;
    maxTimer: number;
    radius: number;
}

export interface BlackHole extends GameObject {
    type: 'black_hole';
    life: number;
    maxLife: number;
    pullRadius: number;
    rotation: number;
}

export interface ScorchMark extends GameObject {
    type: 'scorch_mark';
    life: number;
    maxLife: number;
    radius: number;
}

export interface EMPBlast extends GameObject {
    type: 'emp_blast';
    radius: number;
    maxRadius: number;
    life: number;
    maxLife: number;
    hitEnemies: string[]; // Keep track of enemies already hit by this blast
}

export interface Asteroid extends GameObject {
    type: 'asteroid';
    health: number;
    maxHealth: number;
    shape: {x: number, y: number}[];
}

export interface SpaceDebris extends GameObject {
    type: 'space_debris';
    shape: {x: number, y: number}[];
}

export interface Building extends GameObject {
    type: 'building';
    health: number;
    maxHealth: number;
    damageState: number; // 0, 1, 2 for cracks
}

export interface Rubble extends GameObject {
    type: 'rubble';
    life: number;
    maxLife: number;
}


export type GameEntity = Tank | Bullet | Explosion | PowerUp | ExperienceOrb | KamikazeDrone | Mine | ArtilleryTarget | MartyrsBeacon | SolarFlareWarning | BlackHole | ScorchMark | EMPBlast | Asteroid | SpaceDebris | Building | Rubble;

export interface TireTrackPoint {
    x: number;
    y: number;
    life: number;
}

export type WeatherType = 'none' | 'rain' | 'snow' | 'fog' | 'solar_flare';

export interface WeatherState {
    type: WeatherType;
    intensity: number;
    timer: number;
    particles: Particle[];
}

export interface CustomWeatherSettings {
    type: WeatherType;
    duration: number;
    nextType: WeatherType;
    tone: string;
}

export interface SessionStats {
    score: number;
    time: number;
    kills: number;
    shotsFired: number;
    shotsHit: number;
    bossesDefeated: number;
    highestKillStreak: number;
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
    // More new features
    solarFlares: SolarFlareWarning[];
    blackHoles: BlackHole[];
    hasBlackHole: boolean;
    scorchMarks: ScorchMark[];
    empBlasts: EMPBlast[];
    canvasWidth: number;
    canvasHeight: number;
    asteroids: Asteroid[];
    asteroidSpawnTimer: number;
    // Custom weather
    customWeather?: CustomWeatherSettings;
    lightTone: string;
    // New in V2
    exhaustParticles: SmokeParticle[];
    spaceDebris: SpaceDebris[];
    lastKillTimestamp: number;
    recentKillCount: number;
    // Urban Warfare mode
    isUrbanMode: boolean;
    buildings: Building[];
    rubble: Rubble[];
    // Session stats for game over screen
    sessionStats: SessionStats;
}

export interface UiState {
    status: GameStatus;
    playerHealth: number;
    playerMaxHealth: number;
    playerAdrenaline: number;
    playerMaxAdrenaline: number;
    score: number;
    time: number;
    difficulty: number;
    shields: number;
    boss: { health: number; maxHealth: number; } | null;
    isLevelUpModalOpen: boolean;
    upgradeChoices: Upgrade[];
    hasBlackHole: boolean;
    killStreak: number;
    scoreMultiplier: number;
    allyCount: number;
    sessionStats: SessionStats;
}

export interface Keys {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    ' ': boolean;
    q: boolean;
    e: boolean; // For Adrenaline Rush
}

// Achievements
export interface PlayerStats {
    totalKills: number;
    highScore: number;
    gamesPlayed: number;
    timePlayed: number; // in seconds
    bossesDefeated: number;
    modsUsed: string[];
}

export interface Achievement {
    id: string;
    titleKey: string;
    descKey: string;
    unlocks?: { type: 'color', value: string, name: string };
    isUnlocked: (stats: PlayerStats) => boolean;
}
