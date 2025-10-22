// hooks/tankDesigns.ts
import type { AbilityType } from '../types';

const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  
    
    R = Math.max(0, R);
    G = Math.max(0, G);
    B = Math.max(0, B);

    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

export interface TankDesign {
    base: string;
    turret: string;
    shadow: string;
    highlight: string;
    track: string;
}

export const createDesign = (base: string, turret: string): TankDesign => ({
    base,
    turret,
    shadow: shadeColor(base, -30),
    highlight: shadeColor(base, 20),
    track: '#363636'
});

export const TANK_DESIGNS: Record<string, TankDesign> = {
    DEFAULT: createDesign('#BDB76B', '#F0E68C'),
    NATO_GREEN: createDesign('#556B2F', '#6B8E23'),
    NATO_CAMO: createDesign('#6B8E23', '#808000'),
    DESERT: createDesign('#C19A6B', '#D2B48C'),
    FOREST_CAMO: createDesign('#228B22', '#008000'),
    SNOW: createDesign('#F5F5F5', '#DCDCDC'),
    URBAN: createDesign('#696969', '#A9A9A9'),
    RUSSIAN_GREEN: createDesign('#3d4d2d', '#4e5b42'),
    ASIAN_CAMO: createDesign('#556B2F', '#667d33'),
};

export const BOSS_DESIGN = createDesign('#2C001E', '#8A2BE2');

export const COUNTRY_TANK_MAP: Record<string, keyof typeof TANK_DESIGNS> = {
    "US": "NATO_GREEN", "TR": "NATO_CAMO", "DE": "FOREST_CAMO", "RU": "RUSSIAN_GREEN",
    "JP": "ASIAN_CAMO", "IN": "DESERT", "CN": "ASIAN_CAMO", "FR": "NATO_CAMO",
    "GB": "NATO_GREEN", "BR": "FOREST_CAMO", "CA": "SNOW", "IT": "NATO_CAMO",
    "AU": "DESERT", "KR": "ASIAN_CAMO", "MX": "DESERT", "ES": "NATO_CAMO",
    "SA": "DESERT", "AR": "FOREST_CAMO", "NL": "NATO_CAMO", "SE": "SNOW",
    "CH": "SNOW", "PL": "FOREST_CAMO", "BE": "NATO_CAMO", "ID": "FOREST_CAMO",
    "NG": "DESERT", "ZA": "DESERT", "EG": "DESERT", "PK": "DESERT",
    "BD": "FOREST_CAMO", "VN": "ASIAN_CAMO", "PH": "FOREST_CAMO", "GR": "NATO_CAMO",
    "TH": "ASIAN_CAMO", "CL": "DESERT", "PE": "FOREST_CAMO", "CO": "FOREST_CAMO",
    "IR": "DESERT", "IQ": "DESERT", "UA": "FOREST_CAMO", "CZ": "FOREST_CAMO",
    "HU": "FOREST_CAMO", "RO": "FOREST_CAMO", "PT": "NATO_CAMO", "IE": "FOREST_CAMO",
    "NZ": "FOREST_CAMO", "SG": "URBAN", "DK": "SNOW", "NO": "SNOW",
    "AT": "SNOW", "FI": "SNOW",
};

export const ABILITY_MAP: Record<string, AbilityType> = {
    "US": "overdrive", "TR": "aegis_shield", "DE": "golden_bullet", "RU": "emp_blast",
    "JP": "overdrive", "IN": "quick_repair", "CN": "golden_bullet", "FR": "aegis_shield",
    "GB": "aegis_shield", "BR": "overdrive", "CA": "quick_repair", "IT": "aegis_shield",
    "AU": "overdrive", "KR": "golden_bullet", "MX": "overdrive", "ES": "aegis_shield",
    "SA": "quick_repair", "AR": "overdrive", "NL": "aegis_shield", "SE": "quick_repair",
    "CH": "quick_repair", "PL": "aegis_shield", "BE": "aegis_shield", "ID": "overdrive",
    "NG": "overdrive", "ZA": "quick_repair", "EG": "quick_repair", "PK": "quick_repair",
    "BD": "overdrive", "VN": "golden_bullet", "PH": "overdrive", "GR": "aegis_shield",
    "TH": "golden_bullet", "CL": "overdrive", "PE": "overdrive", "CO": "overdrive",
    "IR": "emp_blast", "IQ": "emp_blast", "UA": "emp_blast", "CZ": "aegis_shield",
    "HU": "aegis_shield", "RO": "aegis_shield", "PT": "aegis_shield", "IE": "overdrive",
    "NZ": "overdrive", "SG": "golden_bullet", "DK": "quick_repair", "NO": "quick_repair",
    "AT": "aegis_shield", "FI": "quick_repair",
};