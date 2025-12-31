/**
 * VEDIC ENGINE CONSTANTS
 * Includes: Zodiac, Nakshatras, Dignities, Hoda Cakra, and D60 Deities
 */

// 1. Basic Zodiac & Astronomy
const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", 
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", 
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", 
    "Moola", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", 
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const PLANET_LIST = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
const MALEFICS = ["Sun", "Mars", "Saturn", "Rahu", "Ketu"];

// 2. Lordship & Dignity (0-indexed to PLANET_LIST)
// Aries->Mars(2), Taurus->Venus(5), Gemini->Mercury(3), Cancer->Moon(1), Leo->Sun(0)...
const SIGN_LORDS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];

const EXALT = { "Sun": 1, "Moon": 2, "Mars": 10, "Mercury": 6, "Jupiter": 4, "Venus": 12, "Saturn": 7 };
const DEBIL = { "Sun": 7, "Moon": 8, "Mars": 4, "Mercury": 12, "Jupiter": 10, "Venus": 6, "Saturn": 1 };
const OWNED = { 
    "Sun": [5], "Moon": [4], "Mars": [1, 8], "Mercury": [3, 6], 
    "Jupiter": [9, 12], "Venus": [2, 7], "Saturn": [10, 11],
    "Rahu": [11], "Ketu": [8] // Traditional co-lordships
};

// 3. Elements & Veda Murti (For D60 Rectification)
const TATTVA = {
    "Jupiter": "Akasha", 
    "Mercury": "Prithvi", 
    "Venus": "Jala", "Moon": "Jala", 
    "Mars": "Agni", "Sun": "Agni", 
    "Saturn": "Vayu", "Rahu": "Vayu", "Ketu": "Agni"
};

const VEDA_MURTI = {
    "Akasha": "Veda Vyasa", 
    "Prithvi": "Valmiki", 
    "Jala": "Manu", 
    "Agni": "Parashara", 
    "Vayu": "Vasistha"
};

// 4. Hoda Cakra (Phonetic mapping to Sign Index)
// Used for Test 2: Name-Sound link to D60
const HODA_CAKRA = {
    "chu": 0, "che": 0, "cho": 0, "la": 0, "li": 0,                  // Aries
    "lu": 1, "le": 1, "lo": 1, "vi": 1, "vu": 1, "ve": 1, "vo": 1,  // Taurus
    "ka": 2, "ki": 2, "ku": 2, "gh": 2, "cha": 2, "ke": 2, "ko": 2, // Gemini
    "hi": 3, "hu": 3, "he": 3, "ho": 3, "da": 3, "di": 3,           // Cancer
    "ma": 4, "mi": 4, "mu": 4, "me": 4, "mo": 4, "ta": 4,           // Leo
    "pa": 5, "pi": 5, "pu": 5, "sha": 5, "na": 5, "tha": 5,         // Virgo
    "ra": 6, "ri": 6, "ru": 6, "re": 6, "ro": 6, "ta": 6,           // Libra
    "to": 7, "na": 7, "ni": 7, "nu": 7, "ne": 7, "ya": 7, "yi": 7,  // Scorpio
    "ye": 8, "yo": 8, "bha": 8, "bhi": 8, "bhu": 8, "dha": 8,       // Sagittarius
    "bho": 9, "ja": 9, "ji": 9, "khi": 9, "khu": 9, "khe": 9,       // Capricorn
    "gu": 10, "ge": 10, "go": 10, "sa": 10, "si": 10, "su": 10,     // Aquarius
    "di": 11, "du": 11, "tha": 11, "jha": 11, "de": 11, "do": 11    // Pisces
};

// 5. Continental Geography (For Past Life Analysis)
const CONTINENT_MAP = {
    "Mars": "South America / Africa",
    "Ketu": "South America / Isolated Islands",
    "Jupiter": "Indian Subcontinent / Holy Lands",
    "Saturn": "Western Europe / North America",
    "Mercury": "Middle East / Trade Hubs",
    "Venus": "Southeast Asia / Islands",
    "Moon": "North Pole / Cold Coastal Regions",
    "Sun": "Central Africa / Deserts",
    "Rahu": "Far East / High Tech Cities"
};

// 6. D60 Deities (The 60 Shashtiamsha Deities)
const D60_DEITIES = [
    "Ghora", "Rakshasa", "Deva", "Kubera", "Yaksha", "Kindara", "Bhrashta", "Kulaghna",
    "Garala", "Vahni", "Maya", "Purishaka", "Apampati", "Marutwan", "Kaala", "Sarpa",
    "Amrita", "Indu", "Mridu", "Komala", "Heramba", "Brahma", "Vishnu", "Maheshwara",
    "Deva", "Arudra", "Kalinasana", "Kshitishwara", "Kamalakara", "Gulika", "Mrityu", "Kaala",
    "Davagni", "Ghora", "Adhama", "Kantaka", "Vishadagdha", "Amrita", "Poornachandra", "Vishadagdha",
    "Kulanasa", "Vamshakshaya", "Utpata", "Kaala", "Saumya", "Komala", "Sheetala", "Karaladamshtra",
    "Chandramukhi", "Praveena", "Kaalagni", "Dandayudha", "Nirmala", "Saumya", "Crura", "Atisheetala",
    "Amrita", "Payodhi", "Bhramana", "Chandrarekha"
];

// 7. Marriage Significators (Based on User Gender)
const KARAKAS = {
    "Male": "Venus",
    "Female": "Jupiter", // Can also be Mars in some traditions
    "General": "Venus"
};