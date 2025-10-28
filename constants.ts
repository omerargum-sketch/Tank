import type { Country, Achievement, PlayerStats } from './types';

export const FPS = 60;
export const MS_PER_FRAME = 1000 / FPS;

export const COUNTRIES: Country[] = [
    { code: "US", name: "USA", flag: "🇺🇸" }, { code: "TR", name: "Turkey", flag: "🇹🇷" },
    { code: "DE", name: "Germany", flag: "🇩🇪" }, { code: "RU", name: "Russia", flag: "🇷🇺" },
    { code: "JP", name: "Japan", flag: "🇯🇵" }, { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "CN", name: "China", flag: "🇨🇳" }, { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "GB", name: "UK", flag: "🇬🇧" }, { code: "BR", name: "Brazil", flag: "🇧🇷" },
    { code: "CA", name: "Canada", flag: "🇨🇦" }, { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "AU", name: "Australia", flag: "🇦🇺" }, { code: "KR", name: "S. Korea", flag: "🇰🇷" },
    { code: "MX", name: "Mexico", flag: "🇲🇽" }, { code: "ES", name: "Spain", flag: "🇪🇸" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" }, { code: "AR", name: "Argentina", flag: "🇦🇷" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱" }, { code: "SE", name: "Sweden", flag: "🇸🇪" },
    { code: "CH", name: "Switzerland", flag: "🇨🇭" }, { code: "PL", name: "Poland", flag: "🇵🇱" },
    { code: "BE", name: "Belgium", flag: "🇧🇪" }, { code: "ID", name: "Indonesia", flag: "🇮🇩" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬" }, { code: "ZA", name: "S. Africa", flag: "🇿🇦" },
    { code: "EG", name: "Egypt", flag: "🇪🇬" }, { code: "PK", name: "Pakistan", flag: "🇵🇰" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩" }, { code: "VN", name: "Vietnam", flag: "🇻🇳" },
    { code: "PH", name: "Philippines", flag: "🇵🇭" }, { code: "GR", name: "Greece", flag: "🇬🇷" },
    { code: "TH", name: "Thailand", flag: "🇹🇭" }, { code: "CL", name: "Chile", flag: "🇨🇱" },
    { code: "PE", name: "Peru", flag: "🇵🇪" }, { code: "CO", name: "Colombia", flag: "🇨🇴" },
    { code: "IR", name: "Iran", flag: "🇮🇷" }, { code: "IQ", name: "Iraq", flag: "🇮🇶" },
    { code: "UA", name: "Ukraine", flag: "🇺🇦" }, { code: "CZ", name: "Czechia", flag: "🇨🇿" },
    { code: "HU", name: "Hungary", flag: "🇭🇺" }, { code: "RO", name: "Romania", flag: "🇷🇴" },
    { code: "PT", name: "Portugal", flag: "🇵🇹" }, { code: "IE", name: "Ireland", flag: "🇮🇪" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿" }, { code: "SG", name: "Singapore", flag: "🇸🇬" },
    { code: "DK", name: "Denmark", flag: "🇩🇰" }, { code: "NO", name: "Norway", flag: "🇳🇴" },
    { code: "AT", name: "Austria", flag: "🇦🇹" }, { code: "FI", name: "Finland", flag: "🇫🇮" },
];

export const CUSTOMIZATION_COLORS: { nameKey: string; color: string; unlockedByDefault: boolean; achievementId?: string }[] = [
    // Default Unlocked
    { nameKey: 'colors.nato_green', color: '#556B2F', unlockedByDefault: true },
    { nameKey: 'colors.nato_camo', color: '#6B8E23', unlockedByDefault: true },
    { nameKey: 'colors.olive', color: '#808000', unlockedByDefault: true },
    { nameKey: 'colors.desert_sand', color: '#C19A6B', unlockedByDefault: true },
    { nameKey: 'colors.tan', color: '#D2B48C', unlockedByDefault: true },
    { nameKey: 'colors.khaki', color: '#BDB76B', unlockedByDefault: true },
    { nameKey: 'colors.forest_green', color: '#228B22', unlockedByDefault: true },
    { nameKey: 'colors.dark_forest', color: '#3d4d2d', unlockedByDefault: true },

    // Unlockables
    { nameKey: 'colors.winter_white', color: '#F5F5F5', unlockedByDefault: false, achievementId: 'survivor_5m' },
    { nameKey: 'colors.light_gray', color: '#DCDCDC', unlockedByDefault: false, achievementId: 'survivor_5m' },
    { nameKey: 'colors.urban_gray', color: '#696969', unlockedByDefault: false, achievementId: 'urban_warrior' },
    { nameKey: 'colors.dark_gray', color: '#4a4a4a', unlockedByDefault: false, achievementId: 'urban_warrior' },
    { nameKey: 'colors.blood_red', color: '#B31942', unlockedByDefault: false, achievementId: 'centurion' },
    { nameKey: 'colors.navy_blue', color: '#0A3161', unlockedByDefault: false, achievementId: 'high_scorer' },
    { nameKey: 'colors.crimson', color: '#CE1126', unlockedByDefault: false, achievementId: 'boss_slayer' },
    { nameKey: 'colors.charcoal', color: '#363636', unlockedByDefault: false, achievementId: 'mod_enthusiast' },
];

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_blood',
        titleKey: 'achievements.first_blood.title',
        descKey: 'achievements.first_blood.desc',
        isUnlocked: (stats: PlayerStats) => stats.gamesPlayed >= 1,
    },
    {
        id: 'survivor_5m',
        titleKey: 'achievements.survivor_5m.title',
        descKey: 'achievements.survivor_5m.desc',
        unlocks: { type: 'color', value: '#F5F5F5', name: 'Winter White' },
        isUnlocked: (stats: PlayerStats) => stats.timePlayed >= 300,
    },
    {
        id: 'centurion',
        titleKey: 'achievements.centurion.title',
        descKey: 'achievements.centurion.desc',
        unlocks: { type: 'color', value: '#B31942', name: 'Blood Red' },
        isUnlocked: (stats: PlayerStats) => stats.totalKills >= 1000,
    },
    {
        id: 'high_scorer',
        titleKey: 'achievements.high_scorer.title',
        descKey: 'achievements.high_scorer.desc',
        unlocks: { type: 'color', value: '#0A3161', name: 'Navy Blue' },
        isUnlocked: (stats: PlayerStats) => stats.highScore >= 50000,
    },
    {
        id: 'boss_slayer',
        titleKey: 'achievements.boss_slayer.title',
        descKey: 'achievements.boss_slayer.desc',
        unlocks: { type: 'color', value: '#CE1126', name: 'Crimson' },
        isUnlocked: (stats: PlayerStats) => stats.bossesDefeated >= 1,
    },
    {
        id: 'mod_enthusiast',
        titleKey: 'achievements.mod_enthusiast.title',
        descKey: 'achievements.mod_enthusiast.desc',
        unlocks: { type: 'color', value: '#363636', name: 'Charcoal' },
        isUnlocked: (stats: PlayerStats) => stats.modsUsed.length > 0,
    },
    {
        id: 'urban_warrior',
        titleKey: 'achievements.urban_warrior.title',
        descKey: 'achievements.urban_warrior.desc',
        unlocks: { type: 'color', value: '#696969', name: 'Urban Gray' },
        isUnlocked: (stats: PlayerStats) => stats.modsUsed.includes('urban_warfare'),
    },
];
