

import type { Country } from './types';

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

export const CUSTOMIZATION_COLORS = [
    // NATO
    '#556B2F', '#6B8E23', '#808000', 
    // Desert
    '#C19A6B', '#D2B48C', '#BDB76B',
    // Forest
    '#228B22', '#008000', '#3d4d2d',
    // Snow
    '#F5F5F5', '#DCDCDC', '#A9A9A9',
    // Urban
    '#696969', '#4a4a4a', '#363636',
    // Accent
    '#B31942', '#0A3161', '#CE1126',
];