// js/router.js

// --- Imports ---
import {
    getState,
    setCurrentRestaurant,
    setLoading,
    setCurrentRoute,
    clearClaimNavigationState,
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
    showMessage, // Keep for errors
    hideMessage
} from './ui.js';
import { fetchRestaurantConfigById, getDefaultRestaurantId } from './config.js';
// Removed spinWheel import
import { handleSpinEnd, triggerDashboardRefresh } from './app.js'; // Import app functions
import { getCurrentUserIdToken } from './auth.js';
// Removed fetchDashboardData as it's called via app.js trigger

// --- Routes Definition ---
const routes = {
    '/:restaurantId': 'showLandingPage',
    '/:restaurantId/spin': 'showSpinPage',
    '/:restaurantId/coupon': 'showCouponDisplayPage',
    '/dashboard': 'showDashboardPage',
    '/auth': 'showAuthPage',
};

// --- Helper Function ---
// Applies theme based on restaurant ID
async function applyThemeBasedOnRestaurant(restaurantId) {
    try {
        let config = getState().currentRestaurant;
        if (!config || config.id !== restaurantId) {
            console.log(`Router: Fetching config for theme for ${restaurantId}`);
            config = await fetchRestaurantConfigById(restaurantId);
        }
        applyTheme(config?.theme); // Pass theme object or undefined (applyTheme handles default)
    } catch (error) {
        console.error("Router: Error applying theme:", error);
        applyTheme(); // Fallback
    }
}

// --- Route Parsing ---
async function parseHash() {
    const hash = window.location.hash.slice(1) || '/';
    console.log("Router: Parsing hash:", hash);
    let foundRouteInfo = null;

    // 1. Check exact matches
    if (routes[hash]) {
        console.log("Router: Found exact match:", hash);
        foundRouteInfo = { path: hash, handlerName: routes[hash], params: {}, fullHash: hash };
    }
    // 2. Check dynamic routes
    else {
        for (const routePattern in routes) {
            if (!routePattern.includes(':')) continue;
            const paramNames = [];
            const regexPattern = '^' + routePattern.replace(/:([^/]+)/g, (_, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            }) + '$';
            const regex = new RegExp(regexPattern);
            const match = hash.match(regex);
            if (match) {
                console.log("Router: Found dynamic match:", routePattern, "for hash:", hash);
                const params = {};
                paramNames.forEach((name, index) => params[name] = decodeURIComponent(match[index + 1]));
                foundRouteInfo = { path: routePattern, handlerName: routes[routePattern], params: params, fullHash: hash };
                break;
            }
        }
    }

    // 3. Handle default route redirect
    if (hash === '/' && !foundRouteInfo) {
        console.log("Router: Hash is '/', fetching default restaurant ID...");
        const defaultId = await getDefaultRestaurantId();
        if (defaultId) {
            console.log("Router: Redirecting to default:", defaultId);
            window.location.hash = `#/${defaultId}`;
        } else {
            console.error("Router: No default restaurant found! Cannot redirect.");
            foundRouteInfo = { path: '/error', handlerName: 'showConfigErrorPage', params: {}, fullHash: hash };
        }
        return null; // Stop processing if redirecting or error
    }

    // 4. Determine final result
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
        setLoading(true); showPage('page-loading');
        const config = await fetchRestaurantConfigById(params.restaurantId);
        if (config) {
            setCurrentRestaurant(config); renderLandingPage(config); showPage('page-landing'); success = true;
        } else { console.log("Handler: Config not found for", params.restaurantId); showNotFoundPage(); }
    } catch (error) { console.error("Error in showLandingPage:", error); showConfigErrorPage(); }
    finally { console.log(`Handler: showLandingPage finished. Success: ${success}`); setLoading(false); }
}

async function showSpinPage(params) {
    let success = false;
    try {
        console.log(`Handler: showSpinPage(${params.restaurantId}) started.`);
        setLoading(true); showPage('page-loading');
        const config = await fetchRestaurantConfigById(params.restaurantId);
        if (config) {
            setCurrentRestaurant(config);
            await applyThemeBasedOnRestaurant(params.restaurantId);
            // Data needed for UI rendering is handled within renderSpinPageUI now
            renderSpinPageUI(); // Populate rewards preview, initial slots, button state
            showPage('page-spin');
            success = true;
        } else { console.log("Handler: Config not found for spin page", params.restaurantId); showNotFoundPage(); }
    } catch (error) { console.error("Error in showSpinPage:", error); showConfigErrorPage(); }
    finally { console.log(`Handler: showSpinPage finished. Success: ${success}`); setLoading(false); }
}

function showAuthPage() {
    console.log("Handler: showAuthPage started");
    const { isAuthenticated, claimNavigationState } = getState();
    if (isAuthenticated && !claimNavigationState) {
        console.log("Handler: Already authenticated & not claiming, redirecting to dashboard.");
        window.location.hash = '#/dashboard'; return;
    }
    applyTheme(); // Use default theme
    renderAuthPage(claimNavigationState); // Pass claim info if available
    showPage('page-auth');
}

async function showCouponDisplayPage(params) {
    console.log("Handler: showCouponDisplayPage started");
    const { claimNavigationState } = getState();
    const apiResponse = claimNavigationState?.claimApiResponse;
    if (!apiResponse) {
        console.error("Handler: Cannot show Coupon page: API response missing from state.");
        const fallbackId = params.restaurantId || getState().currentRestaurant?.id || await getDefaultRestaurantId() || 'healthy-bowl';
        window.location.hash = `#/${fallbackId}/spin`; return;
    }
    await applyThemeBasedOnRestaurant(params.restaurantId);
    renderCouponDisplayPage(apiResponse, params.restaurantId); // Render UI
    showPage('page-coupon-display');
    clearClaimNavigationState(); // Clear state AFTER rendering
    console.log("Handler: Cleared claimNavigationState.");
}

async function showDashboardPage() {
    console.log("Handler: showDashboardPage started");
    const { isAuthenticated, authLoading, dashboardData, dashboardLoading } = getState();
    if (authLoading) { console.log("Handler: Auth state still loading..."); showPage('page-loading'); return; }
    if (!isAuthenticated) { console.log("Handler: Dashboard access denied: Not authenticated."); clearClaimNavigationState(); window.location.hash = '#/auth'; return; }

    applyTheme(); // Use default/dashboard theme
    showPage('page-dashboard');

    if (dashboardData) {
        console.log("Handler: Rendering dashboard with cached data.");
        renderDashboard(dashboardData);
    } else {
        console.log("Handler: No cached dashboard data, showing loading message.");
        const noDataElement = document.getElementById('dashboard-no-data');
        if (noDataElement) { noDataElement.textContent = "Loading dashboard data..."; noDataElement.classList.remove('hidden'); }
        // Hide other sections
        document.getElementById('dashboard-summary')?.classList.add('hidden');
        document.getElementById('dashboard-global-timeline')?.classList.add('hidden');
        document.getElementById('dashboard-tabs')?.classList.add('hidden');
        document.getElementById('dashboard-tab-content')?.classList.add('hidden');
        document.getElementById('dashboard-restaurant-header')?.classList.add('hidden');
    }

    if (!dashboardLoading) {
        console.log("Handler: Triggering background dashboard data refresh.");
        triggerDashboardRefresh();
    } else {
        console.log("Handler: Dashboard refresh already in progress.");
    }
}

function showNotFoundPage() { console.log("Handler: showNotFoundPage executing"); applyTheme(); showPage('page-not-found'); }
function showConfigErrorPage() { console.error("Handler: showConfigErrorPage executing"); applyTheme(); showPage('page-not-found'); /* ... modify content ... */ }

// --- Router Initialization and Execution ---
export async function handleRouteChange() {
    const routeInfo = await parseHash();
    if (!routeInfo) return;
    console.log(`Router: Matched Route - Handler: ${routeInfo.handlerName}, Params:`, routeInfo.params);
    setCurrentRoute({ path: routeInfo.path, params: routeInfo.params });
    const handlers = { showLandingPage, showSpinPage, showCouponDisplayPage, showDashboardPage, showAuthPage, showNotFoundPage, showConfigErrorPage };
    const handler = handlers[routeInfo.handlerName] || handlers.showNotFoundPage;
    console.log("Router: Dispatching routematch event for:", routeInfo.handlerName);
    document.dispatchEvent(new CustomEvent('routematch', { detail: { routeInfo } }));
    try {
        await handler(routeInfo.params);
        console.log(`Router: Handler '${routeInfo.handlerName}' executed successfully.`);
    } catch (error) {
        console.error(`Router: Error executing route handler '${routeInfo.handlerName}':`, error);
        showConfigErrorPage();
    }
}

export function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange().catch(err => { console.error("Router: Error during initial route handling:", err); showConfigErrorPage(); });
    console.log("Router: Initialized and first route handled.");
}