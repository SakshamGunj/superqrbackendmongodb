// js/state.js

// --- Initial State Definition ---
const initialState = {
    // Authentication State (managed by Firebase listener via setAuthState)
    isAuthenticated: false,
    firebaseUser: null, // Holds the raw Firebase User object (read-only here)
    idToken: null,      // Holds the current JWT ID Token (read-only here)
    authLoading: true,  // True until the first auth state check completes

    // *** NEW: Persisted User Profile (Name, WhatsApp) ***
    userProfile: null, // Format: { name: string, whatsapp: string }

    // *** DailySpins removed from initial state, now loaded from localStorage on demand ***
    currentRestaurant: null, // Config of the currently viewed restaurant
    currentRoute: { path: '', params: {} }, // Current router state
    isLoading: false, // General loading state for non-auth async operations (like API calls)
    spinResult: null, // Stores the Offer object from the last winning spin temporarily
    claimNavigationState: null, // Format: { spinResult?, restaurantId?, restaurantName?, claimApiResponse? }
    // *** NEW: State to hold fetched dashboard data ***
    dashboardData: null, // Holds the full parsed dashboard API response
    dashboardLoading: false, // Specific loading state for dashboard fetch
};

// --- Application State Variable ---
let appState = { ...initialState };

// --- Local/Session Storage Keys & Helpers ---
const STORAGE_KEYS = {
    DAILY_SPINS: 'spinAppDailySpins',
    CLAIM_NAV_STATE: 'spinAppClaimNavState',
    USER_PROFILE: 'spinAppUserProfile',
    DASHBOARD_DATA: 'spinAppDashboardData' // Key for cached dashboard data
};

function saveToStorage(key, data, storage = localStorage) {
    try {
        if (data !== null && data !== undefined) {
            storage.setItem(key, JSON.stringify(data));
        } else {
            storage.removeItem(key);
        }
    } catch (e) { console.error(`Error saving ${key} to storage:`, e); }
}

function loadFromStorage(key, defaultValue = null, storage = localStorage) {
    try {
        const item = storage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) { console.error(`Error loading ${key} from storage:`, e); return defaultValue; }
}

// --- State Modifier Functions ---

// General loading state for API calls, etc.
export function setLoading(isLoading) {
    if (appState.isLoading !== isLoading) {
        appState.isLoading = isLoading;
        console.log(`State: Setting isLoading to ${isLoading}`);
        document.dispatchEvent(new CustomEvent('statechange', { detail: { isLoading } }));
    }
}

// Sets the active restaurant config
export function setCurrentRestaurant(config) {
    if (appState.currentRestaurant?.id !== config?.id) {
        appState.currentRestaurant = config;
        console.log(`State: Setting currentRestaurant to ${config?.name || 'null'}`);
        document.dispatchEvent(new CustomEvent('statechange', { detail: { currentRestaurant: config } }));
    }
}

// Updates the current route info
export function setCurrentRoute(route) {
    appState.currentRoute = route;
}

// Stores the winning spin offer temporarily
export function setSpinResult(offer) {
    appState.spinResult = offer;
}

// Stores data needed across navigation during the claim process
export function setClaimNavigationState(state) {
    console.log("State: Setting claimNavigationState:", state);
    appState.claimNavigationState = state;
    saveToStorage(STORAGE_KEYS.CLAIM_NAV_STATE, state, sessionStorage);
}

// Clears the temporary claim navigation state
export function clearClaimNavigationState() {
    console.log("State: Clearing claimNavigationState.");
    appState.claimNavigationState = null;
    sessionStorage.removeItem(STORAGE_KEYS.CLAIM_NAV_STATE);
}

// Updates authentication status (called by auth.js listener)
export function setAuthState(isAuthenticated, firebaseUser, idToken, authLoading) {
    const changed = {};
    if (appState.isAuthenticated !== isAuthenticated) { changed.isAuthenticated = isAuthenticated; appState.isAuthenticated = isAuthenticated; }
    if (appState.firebaseUser?.uid !== firebaseUser?.uid) { changed.firebaseUser = firebaseUser; appState.firebaseUser = firebaseUser; }
    if (appState.idToken !== idToken) { changed.idToken = idToken; appState.idToken = idToken; }
    if (appState.authLoading !== authLoading) { changed.authLoading = authLoading; appState.authLoading = authLoading; }

    if (isAuthenticated) {
        const loadedProfile = loadFromStorage(STORAGE_KEYS.USER_PROFILE);
        if (appState.userProfile?.whatsapp !== loadedProfile?.whatsapp || appState.userProfile?.name !== loadedProfile?.name) {
            appState.userProfile = loadedProfile;
            changed.userProfile = appState.userProfile;
            console.log("State: Loaded user profile from storage:", appState.userProfile);
        }
        const cachedDashboard = loadFromStorage(STORAGE_KEYS.DASHBOARD_DATA);
        if (cachedDashboard) {
            appState.dashboardData = cachedDashboard;
            changed.dashboardData = appState.dashboardData;
            console.log("State: Loaded cached dashboard data on auth change.");
        }
    } else {
        if (appState.userProfile !== null) {
            appState.userProfile = null;
            changed.userProfile = null;
            localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
            console.log("State: Cleared user profile on logout.");
        }
        if (appState.dashboardData !== null) {
            appState.dashboardData = null;
            changed.dashboardData = null;
            localStorage.removeItem(STORAGE_KEYS.DASHBOARD_DATA);
            console.log("State: Cleared dashboard data on logout.");
        }
    }

    if (Object.keys(changed).length > 0) {
        console.log("State: Auth state changed:", changed);
        document.dispatchEvent(new CustomEvent('statechange', { detail: changed }));
    }
}

// *** NEW: Function to update and save user profile ***
export function updateUserProfileState(name, whatsapp) {
    const newProfile = { name: name.trim(), whatsapp: whatsapp.trim() };
    appState.userProfile = newProfile;
    saveToStorage(STORAGE_KEYS.USER_PROFILE, newProfile);
    console.log("State: Updated and saved user profile:", newProfile);
    document.dispatchEvent(new CustomEvent('statechange', { detail: { userProfile: newProfile } }));
}

// *** Updated: Store fetched dashboard data in state AND cache ***
export function setDashboardData(data) {
    appState.dashboardData = data;
    saveToStorage(STORAGE_KEYS.DASHBOARD_DATA, data);
    console.log("State: Updated and cached dashboard data.");
    document.dispatchEvent(new CustomEvent('statechange', { detail: { dashboardData: data } }));
}

// *** NEW: Set dashboard loading state ***
export function setDashboardLoading(isLoading) {
    if (appState.dashboardLoading !== isLoading) {
        appState.dashboardLoading = isLoading;
        console.log(`State: Setting dashboardLoading to ${isLoading}`);
        document.dispatchEvent(new CustomEvent('statechange', { detail: { dashboardLoading: isLoading } }));
    }
}

// --- Daily Spin Limit Logic ---
const MAX_DAILY_SPINS = 3;

function getCurrentDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Reads directly from localStorage and cleans up old entries
function getDailySpinsData() {
    const storedData = loadFromStorage(STORAGE_KEYS.DAILY_SPINS, {});
    const today = getCurrentDateString();
    const validData = {};
    let changed = false;

    for (const restId in storedData) {
        if (storedData[restId]?.date === today) {
            validData[restId] = storedData[restId];
        } else {
            changed = true;
        }
    }

    if (changed) {
        console.log("State: Cleaning outdated daily spin records from storage.");
        saveToStorage(STORAGE_KEYS.DAILY_SPINS, validData);
    }
    return validData;
}

// Checks if the user can spin
export function canSpin(restaurantId) {
    if (!restaurantId) return false;
    const dailySpins = getDailySpinsData();
    const spinRecord = dailySpins[restaurantId];
    const spinsToday = spinRecord?.count || 0;
    console.log(`State: canSpin check for ${restaurantId}: ${spinsToday} / ${MAX_DAILY_SPINS} spins used today.`);
    return spinsToday < MAX_DAILY_SPINS;
}

// Records a spin attempt for today
export function recordSpin(restaurantId) {
    if (!restaurantId) return;
    const today = getCurrentDateString();
    const dailySpins = getDailySpinsData();
    const currentCount = dailySpins[restaurantId]?.count || 0;

    if (currentCount >= MAX_DAILY_SPINS) {
        console.warn(`State: Attempted to record spin beyond limit for ${restaurantId} on ${today}`);
        return;
    }

    const updatedSpinData = {
        ...dailySpins,
        [restaurantId]: {
            date: today,
            count: currentCount + 1
        }
    };

    saveToStorage(STORAGE_KEYS.DAILY_SPINS, updatedSpinData);
    console.log(`State: Recorded spin ${currentCount + 1}/${MAX_DAILY_SPINS} for ${restaurantId} on ${today} (Saved to storage).`);
    document.dispatchEvent(new CustomEvent('statechange', { detail: { dailySpinsUpdated: true, restaurantId } }));
}

// Gets the number of spins remaining today
export function getRemainingSpins(restaurantId) {
    if (!restaurantId) return 0;
    const dailySpins = getDailySpinsData();
    const spinsToday = dailySpins[restaurantId]?.count || 0;
    return Math.max(0, MAX_DAILY_SPINS - spinsToday);
}

// --- State Getter ---
export function getState() {
    return { ...appState };
}

// --- Initialization ---
export function initializeState() {
    appState.authLoading = true;
    appState.userProfile = loadFromStorage(STORAGE_KEYS.USER_PROFILE);
    appState.claimNavigationState = loadFromStorage(STORAGE_KEYS.CLAIM_NAV_STATE, null, sessionStorage);
    appState.dashboardData = loadFromStorage(STORAGE_KEYS.DASHBOARD_DATA);

    document.dispatchEvent(new CustomEvent('statechange', { detail: { ...appState } }));
    console.log("State: Initialized client-side state (Profile/ClaimNav/Dashboard Cache loaded).");
    setLoading(false);
}