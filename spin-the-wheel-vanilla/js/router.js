// js/router.js

// --- Imports ---
import {
    getState,
    setCurrentRestaurant,
    setLoading,
    setCurrentRoute,
    clearClaimNavigationState, // Used on coupon page load
    setDashboardData,
    setDashboardLoading
} from './state.js';
import {
    showPage,
    renderLandingPage,
    renderAuthPage,
    renderCouponDisplayPage,
    renderDashboard,
    applyTheme,
    renderSpinPageUI,
    showMessage, // Keep for error handling in API calls within router if any
    hideMessage // Keep for clearing messages on route change potentially
} from './ui.js';
import { fetchRestaurantConfigById, getDefaultRestaurantId } from './config.js';
import { initSpinWheel } from './spinWheel.js'; // Only init needed here
import { handleSpinEnd, triggerDashboardRefresh } from './app.js'; // Import app functions
import { getCurrentUserIdToken } from './auth.js'; // Needed for dashboard auth check

// --- Routes Definition ---
const routes = {
    // Map path patterns to handler function names
    '/:restaurantId': 'showLandingPage',
    '/:restaurantId/spin': 'showSpinPage',
    '/:restaurantId/coupon': 'showCouponDisplayPage', // Shows after successful claim API call
    '/dashboard': 'showDashboardPage',
    '/auth': 'showAuthPage',          // Handles Login/Sign Up
};

// --- Helper Function ---
// Applies theme based on restaurant ID (fetches config if needed)
async function applyThemeBasedOnRestaurant(restaurantId) {
    try {
        let config = getState().currentRestaurant;
        // Fetch only if not already loaded or ID mismatch
        if (!config || config.id !== restaurantId) {
            console.log(`Router: Fetching config for theme for ${restaurantId}`);
            config = await fetchRestaurantConfigById(restaurantId);
        }
        // Apply theme from config or default theme
        applyTheme(config?.theme); // Pass theme object or undefined
    } catch (error) {
        console.error("Router: Error applying theme:", error);
        applyTheme(); // Fallback to default theme on error
    }
}

// --- Route Parsing ---
async function parseHash() {
    const hash = window.location.hash.slice(1) || '/';
    console.log("Router: Parsing hash:", hash);
    let foundRouteInfo = null;

    // 1. Check for exact matches first (e.g., /dashboard, /auth)
    if (routes[hash]) {
        console.log("Router: Found exact match:", hash);
        foundRouteInfo = { path: hash, handlerName: routes[hash], params: {}, fullHash: hash };
    }
    // 2. If no exact match, check dynamic routes (e.g., /:restaurantId/spin)
    else {
        for (const routePattern in routes) {
            if (!routePattern.includes(':')) continue; // Skip non-dynamic routes already checked

            const paramNames = [];
            const regexPattern = '^' + routePattern.replace(/:([^/]+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)'; // Match any character except '/'
            }) + '$';
            const regex = new RegExp(regexPattern);
            const match = hash.match(regex);

            if (match) {
                console.log("Router: Found dynamic match:", routePattern, "for hash:", hash);
                const params = {};
                paramNames.forEach((name, index) => {
                    params[name] = decodeURIComponent(match[index + 1]);
                });
                foundRouteInfo = { path: routePattern, handlerName: routes[routePattern], params: params, fullHash: hash };
                break; // First dynamic match wins
            }
        }
    }

    // 3. Handle default route redirect
    if (hash === '/' && !foundRouteInfo) {
        console.log("Router: Hash is '/', fetching default restaurant ID...");
        const defaultId = await getDefaultRestaurantId(); // Fetch default ID
        if (defaultId) {
            console.log("Router: Redirecting to default:", defaultId);
            window.location.hash = `#/${defaultId}`;
        } else {
            console.error("Router: No default restaurant found in config! Cannot redirect.");
            // Fallback to showing a config error state
            foundRouteInfo = { path: '/error', handlerName: 'showConfigErrorPage', params: {}, fullHash: hash };
        }
        return null; // Stop processing current hash change if redirecting or error handled here
    }

    // 4. Determine final result (found route or 404)
    if (foundRouteInfo) {
        console.log("Router: parseHash final result:", foundRouteInfo);
        return foundRouteInfo;
    } else {
        console.log("Router: No route matched. Returning 404.");
        return { path: '/not-found', handlerName: 'showNotFoundPage', params: {}, fullHash: hash };
    }
}

// --- Route Handlers (Controller Logic) ---

async function showLandingPage(params) {
    let success = false;
    try {
        console.log(`Handler: showLandingPage(${params.restaurantId}) started.`);
        setLoading(true);
        showPage('page-loading'); // Show loading overlay
        const config = await fetchRestaurantConfigById(params.restaurantId);
        if (config) {
            setCurrentRestaurant(config); // Update state with current restaurant config
            renderLandingPage(config);    // Update UI with restaurant details
            showPage('page-landing');     // Activate the landing page view
            success = true;
        } else {
            console.log("Handler: Config not found for", params.restaurantId);
            showNotFoundPage(); // Show 404 page if config invalid/missing
        }
    } catch (error) {
        console.error("Error in showLandingPage:", error);
        showConfigErrorPage(); // Show a generic config error page
    } finally {
        console.log(`Handler: showLandingPage finished. Success: ${success}`);
        setLoading(false); // Hide loading overlay
    }
}

async function showSpinPage(params) {
    let success = false;
    try {
        console.log(`Handler: showSpinPage(${params.restaurantId}) started.`);
        setLoading(true);
        showPage('page-loading');
        const config = await fetchRestaurantConfigById(params.restaurantId);
        if (config) {
            setCurrentRestaurant(config);
            await applyThemeBasedOnRestaurant(params.restaurantId); // Apply specific theme

            // Check if spinOffers is a valid array in the config
            const offers = Array.isArray(config.spinOffers) ? config.spinOffers : (Array.isArray(config.offers) ? config.offers : []);
            if (!Array.isArray(config.spinOffers) && !Array.isArray(config.offers)) {
                console.warn(`Router: Restaurant ${params.restaurantId} config missing or has invalid spinOffers/offers. Using empty array.`);
            }

            initSpinWheel('wheelCanvas', 'spin-action-button', offers, handleSpinEnd); // Initialize wheel
            renderSpinPageUI(); // Render spins left and offers list
            showPage('page-spin'); // Show the spin page
            success = true;
        } else {
            console.log("Handler: Config not found for spin page", params.restaurantId);
            showNotFoundPage();
        }
    } catch (error) {
        console.error("Error in showSpinPage:", error);
        showConfigErrorPage();
    } finally {
        console.log(`Handler: showSpinPage finished. Success: ${success}`);
        setLoading(false);
    }
}

// Handles displaying the Login/Sign Up form page
function showAuthPage() {
    console.log("Handler: showAuthPage started");
    const { isAuthenticated, claimNavigationState } = getState(); // Get current auth and claim state

    // If user is already authenticated AND not in the middle of claiming, redirect to dashboard
    if (isAuthenticated && !claimNavigationState) {
        console.log("Handler: Already authenticated & not claiming, redirecting from /auth to dashboard.");
        window.location.hash = '#/dashboard';
        return;
    }
    // Otherwise, show the auth page
    applyTheme(); // Use default theme for auth page
    renderAuthPage(claimNavigationState); // Pass claim info if available
    showPage('page-auth');
}

// Shows the final coupon after a successful API claim
async function showCouponDisplayPage(params) {
    console.log("Handler: showCouponDisplayPage started");
    const { claimNavigationState } = getState();
    const apiResponse = claimNavigationState?.claimApiResponse; // Get API response stored after claim

    if (!apiResponse) {
        console.error("Handler: Cannot show Coupon page: API response missing from state.");
        const fallbackId = params.restaurantId || getState().currentRestaurant?.id || await getDefaultRestaurantId() || 'healthy-bowl'; // Determine fallback restaurant ID
        window.location.hash = `#/${fallbackId}/spin`; // Go back to spin page
        return;
    }

    await applyThemeBasedOnRestaurant(params.restaurantId); // Apply restaurant theme
    renderCouponDisplayPage(apiResponse, params.restaurantId); // Render UI with API response
    showPage('page-coupon-display'); // Activate the page
    clearClaimNavigationState(); // Important: Clear the temporary state now it has been used
    console.log("Handler: Cleared claimNavigationState.");
}

// Fetches and displays dashboard data for authenticated users
async function showDashboardPage() {
    console.log("Handler: showDashboardPage started");
    const { isAuthenticated, authLoading, dashboardData, dashboardLoading } = getState();

    // 1. Handle Auth Loading/Not Authenticated
    if (authLoading) {
        console.log("Handler: Auth state still loading, showing loading page.");
        showPage('page-loading'); return;
    }
    if (!isAuthenticated) {
        console.log("Handler: Dashboard access denied: Not authenticated. Redirecting to auth.");
        clearClaimNavigationState(); window.location.hash = '#/auth'; return;
    }

    // 2. Show Dashboard Page Structure & Apply Theme
    applyTheme(); // Use default/dashboard theme
    showPage('page-dashboard');

    // 3. Render with Cached Data or Loading Message
    if (dashboardData) {
        console.log("Handler: Rendering dashboard with cached data.");
        renderDashboard(dashboardData); // Render UI immediately
    } else {
        console.log("Handler: No cached dashboard data found, showing loading message.");
        const noDataElement = document.getElementById('dashboard-no-data');
        if (noDataElement) {
            noDataElement.textContent = "Loading dashboard data...";
            noDataElement.classList.remove('hidden');
        }
        // Hide other sections until data loads
        document.getElementById('dashboard-summary')?.classList.add('hidden');
        document.getElementById('dashboard-global-timeline')?.classList.add('hidden');
        document.getElementById('dashboard-tabs')?.classList.add('hidden');
        document.getElementById('dashboard-tab-content')?.classList.add('hidden');
        document.getElementById('dashboard-restaurant-header')?.classList.add('hidden');
    }

    // 4. Trigger Background Refresh (if not already loading)
    if (!dashboardLoading) {
        console.log("Handler: Triggering background dashboard data refresh via app.");
        triggerDashboardRefresh(); // Call function in app.js to fetch fresh data
    } else {
        console.log("Handler: Dashboard refresh already in progress.");
        // Ensure loading message persists if cache was empty
        if (!dashboardData) {
             const noDataElement = document.getElementById('dashboard-no-data');
             if (noDataElement && noDataElement.classList.contains('hidden')) {
                  noDataElement.textContent = "Loading dashboard data...";
                  noDataElement.classList.remove('hidden');
             }
        }
    }
}


// Fallback for routes not found
function showNotFoundPage() {
    console.log("Handler: showNotFoundPage executing");
    applyTheme();
    showPage('page-not-found');
}

// Handler for configuration loading errors
function showConfigErrorPage() {
    console.error("Handler: showConfigErrorPage executing");
    applyTheme();
    showPage('page-not-found'); // Reuse 404 structure
    const content = document.querySelector('#page-not-found .content-wrapper');
    if (content) {
        content.innerHTML = `<h1>Error</h1><h2>Could Not Load Configuration</h2><p>There was a problem loading restaurant data. Please try again later or contact support.</p><a href="#" onclick="window.location.reload(); return false;" class="button button-primary">Reload</a>`;
    }
}

// --- Router Initialization and Execution ---

/**
 * Main routing function called on hash change or initial load.
 */
export async function handleRouteChange() {
    const routeInfo = await parseHash(); // Wait for async parsing
    if (!routeInfo) return; // Redirect or error handled in parseHash

    console.log(`Router: Matched Route - Handler: ${routeInfo.handlerName}, Params:`, routeInfo.params);
    setCurrentRoute({ path: routeInfo.path, params: routeInfo.params }); // Update state with route info

    // Map handler names to functions for cleaner execution
    const handlers = {
        showLandingPage,
        showSpinPage,
        showCouponDisplayPage,
        showDashboardPage,
        showAuthPage,
        showNotFoundPage,
        showConfigErrorPage
    };

    const handler = handlers[routeInfo.handlerName] || handlers.showNotFoundPage;

    // Dispatch event *before* executing handler, allowing listeners to react
    console.log("Router: Dispatching routematch event for:", routeInfo.handlerName);
    document.dispatchEvent(new CustomEvent('routematch', { detail: { routeInfo } }));

    // Execute the handler for the matched route
    try {
        await handler(routeInfo.params); // Await async handlers
        console.log(`Router: Handler '${routeInfo.handlerName}' executed successfully.`);
    } catch (error) {
        console.error(`Router: Error executing route handler '${routeInfo.handlerName}':`, error);
        // Show a generic error page if handler fails unexpectedly
        showConfigErrorPage();
    }
}

/**
 * Initializes the router by adding the hashchange listener and handling the initial route.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange); // Listen for URL hash changes

    // Handle the initial route when the application loads
    handleRouteChange().catch(err => {
        console.error("Router: Error during initial route handling:", err);
        showConfigErrorPage(); // Show error on initial load failure
    });
    console.log("Router: Initialized and first route handled.");
}