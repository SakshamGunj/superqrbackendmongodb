// js/config.js

// Inspired Theme colors from image
const THEME_DEFAULT = {
    primary: '#E91E63', // Pink/Red prominent in buttons/highlights
    secondary: '#FF9800', // Orange often seen
    accent: '#FFEB3B',   // Yellow hint
};

// Convert hex to RGB for rgba() usage in CSS
const hexToRgb = (hex) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const addRgbToTheme = (theme) => {
    const primaryRgb = hexToRgb(theme.primary || '#E91E63'); // Add fallbacks
    const secondaryRgb = hexToRgb(theme.secondary || '#FF9800');
    const accentRgb = hexToRgb(theme.accent || '#FFEB3B');
    return {
        primary: theme.primary || '#E91E63',
        secondary: theme.secondary || '#FF9800',
        accent: theme.accent || '#FFEB3B',
        primaryRgb: primaryRgb ? `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}` : '233, 30, 99',
        secondaryRgb: secondaryRgb ? `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}` : '255, 152, 0',
        accentRgb: accentRgb ? `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}` : '255, 235, 59',
    };
};

// --- Configuration Fetching ---
let loadedConfigs = []; // Store fetched configs here
let isFetching = false;
let fetchPromise = null;

// Function to fetch and process the JSON data
async function loadRestaurantConfigs() {
    if (loadedConfigs.length > 0) {
        return loadedConfigs; // Return cached data if already loaded
    }
    if (isFetching) {
        return fetchPromise; // Return existing promise if fetch is in progress
    }

    isFetching = true;
    console.log("Config: Fetching restaurants.json...");
    fetchPromise = fetch('./restaurants.json') // Path relative to index.html
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching restaurants.json`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Config: Successfully fetched and parsed restaurants.json");
            // Process themes to add RGB values (optional but useful for CSS)
            loadedConfigs = data.map(config => ({
                 ...config,
                 theme: addRgbToTheme(config.theme || {}) // Ensure theme exists
            }));
            isFetching = false;
            return loadedConfigs;
        })
        .catch(error => {
            console.error("Config: Failed to load restaurants.json:", error);
            isFetching = false;
            loadedConfigs = []; // Ensure it's empty on error
            // Potentially show a user-facing error or use fallback data
            return []; // Return empty array on error
        });

    return fetchPromise;
}

// --- Exported Functions ---

// Function to get a specific config by ID *after* loading
export async function fetchRestaurantConfigById(id) {
    const configs = await loadRestaurantConfigs(); // Ensure configs are loaded
    console.log(`Config: Searching for ID '${id}' in ${configs.length} loaded configs.`);
    const config = configs.find(r => r.id === id);
    return config || null; // Return null if not found
}

// Function to get all *valid* restaurant configs (those loaded from JSON)
export async function getAllRestaurantConfigs() {
    return await loadRestaurantConfigs();
}

// Function to get a restaurant name by ID (useful for dashboard)
export async function getRestaurantNameById(id) {
    const config = await fetchRestaurantConfigById(id);
    return config ? config.name : 'Unknown Restaurant';
}

// Function to get the ID of the *first* restaurant in the list (for default redirect)
export async function getDefaultRestaurantId() {
    const configs = await loadRestaurantConfigs();
    return configs.length > 0 ? configs[0].id : null; // Return first ID or null if empty
}