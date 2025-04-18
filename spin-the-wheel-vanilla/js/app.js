// js/app.js

// --- State Management Imports ---
// Imports functions to manage the application's state (like user login status,
// current restaurant, daily spin counts, etc.) and interact with localStorage/sessionStorage.
import {
    initializeState, // Loads initial state from storage
    getState, // Gets the current state object
    setSpinResult, // Stores the result of the last spin temporarily
    setClaimNavigationState, // Stores data needed between spin win and claim completion
    clearClaimNavigationState, // Clears the temporary claim data
    canSpin, // Checks if the user has daily spins left for a restaurant
    recordSpin, // Records a spin attempt, updating the daily count in localStorage
    setLoading, // Sets the general loading state (for API calls etc.)
    updateUserProfileState, // Updates user's name/whatsapp in state & localStorage
    setDashboardData, // Updates dashboard data in state & localStorage cache
    setDashboardLoading // Sets the specific loading state for dashboard fetches
} from './state.js';

// --- Routing Imports ---
// Imports functions to handle client-side navigation using URL hashes (#).
import { initRouter } from './router.js';

// --- UI Imports ---
// Imports functions that manipulate the DOM (show/hide pages, update text,
// render components like modals, dashboard sections, slot machine animation).
import {
    showModal,
    hideModal,
    showMessage,
    hideMessage,
    elements, // Cached object containing references to important DOM elements
    showAuthTab, // Function to switch between Login/Sign Up tabs
    renderSpinPageUI, // Function to update the Spin Page UI (spins left, offers)
    renderDashboard, // Function to render the entire Dashboard UI from API data
    startSlotAnimation, // Function to start the slot machine visual animation
    stopSlotAnimation   // Function to stop the slot machine visual animation on a result
} from './ui.js';

// --- Authentication Imports ---
// Imports functions for interacting with the Firebase Authentication service.
import {
    signUpUser, // Creates a new user account
    signInUser, // Logs in an existing user
    signOutUser, // Logs out the current user
    monitorAuthState, // Sets up a listener for Firebase auth changes (login/logout)
    getCurrentFirebaseUser, // Gets the current Firebase user object
    getCurrentUserIdToken // Gets the current user's JWT ID token for API calls
} from './auth.js';

// --- API Imports ---
// Imports functions that make network requests to the backend API.
import { claimReward, fetchDashboardData } from './api.js';

// --- Audio Imports ---
// Imports functions for playing sound effects.
import { playSound, preloadSounds } from './audio.js';

// --- Constants ---
const SLOT_ANIMATION_DURATION = 2800; // Duration of the slot animation in milliseconds

// --- Core Application Logic ---

/**
 * Initiates the spin process when the main spin button (#spin-action-button) is clicked.
 * 1. Checks if the user can spin (daily limit, not already spinning/loading).
 * 2. Plays start sound and updates button UI to "Spinning...".
 * 3. Starts the visual slot machine animation (ui.js).
 * 4. Records the spin attempt immediately (state.js -> localStorage).
 * 5. Sets a timeout to determine the *actual* winning prize after the animation duration.
 * 6. Inside the timeout, randomly selects a winning offer and calls handleSpinEnd.
 */
function initiateSpin() {
    console.log("App: Initiate Spin Clicked!");
    const { currentRestaurant, isLoading, dashboardLoading } = getState(); // Get needed state

    // 1. Check if spin is allowed
    if (!currentRestaurant || !canSpin(currentRestaurant.id)) {
        console.warn("App: Spin initiation blocked - cannot spin (limit reached or no restaurant).");
        playSound('click'); // Feedback click even if blocked
        // Trigger visual shake on button
        elements.spinButtonElement?.classList.add('shake');
        setTimeout(() => elements.spinButtonElement?.classList.remove('shake'), 300);
        return;
    }
    if (isLoading || dashboardLoading) { // Prevent spinning during other loading states
       console.warn("App: Spin initiation blocked - App is busy loading.");
       return;
    };

    // 3. Start Spin - UI Feedback & Sound
    playSound('spin-start');
    const spinButton = elements.spinButtonElement; // Get button reference
    if (spinButton) {
        spinButton.setAttribute('disabled', 'true'); // Disable button
        spinButton.classList.add('spinning'); // Add class for potential CSS animation
        const textSpan = spinButton.querySelector('span');
        if (textSpan) textSpan.textContent = 'Spinning...'; // Update text
    }
    startSlotAnimation(); // Start visual animation (ui.js)

    // 4. Record Spin Attempt Immediately in background
    try {
        recordSpin(currentRestaurant.id); // Update daily count in localStorage
        renderSpinPageUI(); // Update the "Spins left today" display immediately
    } catch (error) {
        console.error("App: Failed to record spin attempt immediately:", error);
        // Continue animation but log error
    }

    // 5. Determine Winner Logically after animation time
    setTimeout(() => {
        console.log("App: Spin duration ended. Determining winner...");
        // Ensure currentRestaurant is still valid (user might navigate away quickly)
        const latestState = getState();
        if (!latestState.currentRestaurant || latestState.currentRestaurant.id !== currentRestaurant.id) {
             console.warn("App: Restaurant context changed during spin duration. Aborting result processing.");
             // Optionally try to stop animation gracefully if needed
             // stopSlotAnimation({ label: 'Cancelled', value: 'CANCELLED' }); // Stop visually
             return;
        }

        // Get offers from the current restaurant config
        const offers = latestState.currentRestaurant.spinOffers || latestState.currentRestaurant.offers || [];
        const validOffers = Array.isArray(offers) ? offers : [];

        // Filter out non-object offers and 'TRY_AGAIN' for winner selection
        const winnableOffers = validOffers.filter(o => typeof o === 'object' && o.value !== 'TRY_AGAIN');

        let winner;
        if (winnableOffers.length > 0) {
             // Simple random selection from winnable offers
             const randomIndex = Math.floor(Math.random() * winnableOffers.length);
             winner = winnableOffers[randomIndex];
        } else {
            // Fallback if only "Try Again" or invalid offers exist
            console.warn("App: No winnable offers found, defaulting to Try Again or Error.");
            winner = validOffers.find(o => o.value === 'TRY_AGAIN') || { label: 'No Prizes Available', value: 'TRY_AGAIN' };
        }
        handleSpinEnd(winner); // Process the determined result

    }, SLOT_ANIMATION_DURATION);
}


/**
 * Handles the logical result determination *after* slot animation duration ends.
 * Stops the visual animation, plays sounds, updates state, and shows results/modals.
 * @param {object} winningSector - The randomly determined winning offer object.
 */
export async function handleSpinEnd(winningSector) {
    console.log("App: Spin logic ended. Actual Prize:", winningSector);
    const { currentRestaurant } = getState(); // Get fresh state

    // Ensure restaurant context still exists
    if (!currentRestaurant) {
        console.error("App: handleSpinEnd called but no current restaurant context.");
        stopSlotAnimation({ label: 'Error', value: 'ERROR' }); // Stop visually
        return;
    }

    // Stop the visual slot animation, landing on the determined winner
    stopSlotAnimation(winningSector);

    // Store the determined result in state temporarily
    setSpinResult(winningSector);

    // Process based on whether it was a win or "Try Again" / Error
    if (winningSector.value !== 'TRY_AGAIN' && winningSector.value !== 'ERROR') {
        // --- WIN ---
        playSound('spin-win');
        console.log("App: Processing WIN.");
        // Prepare data needed for the claim process
        const claimInfo = {
            spinResult: winningSector,
            restaurantId: currentRestaurant.id,
            restaurantName: currentRestaurant.name
        };
        setClaimNavigationState(claimInfo); // Store in sessionStorage via state.js
        console.log("App: Stored claim navigation state for win:", claimInfo);
        // Show the confirmation modal
        showModal('modal-reward-won', { description: winningSector.label });

    } else {
        // --- TRY AGAIN or ERROR ---
        if (winningSector.value !== 'ERROR') {
            playSound('spin-try-again');
            console.log("App: Processing TRY AGAIN.");
        } else {
             console.error("App: Processing ERROR result from spin determination.");
        }
        // Show appropriate message to the user
        if (elements.spinMessageDisplay) {
            const messageType = winningSector.value === 'ERROR' ? 'error' : 'info';
            showMessage(elements.spinMessageDisplay, winningSector.label || 'Better luck next time!', messageType);
            // Optionally clear message after a delay
            setTimeout(() => hideMessage(elements.spinMessageDisplay), 3500);
        }
    }

    // Re-enable the spin button and reset its text via UI function
    // (This also ensures the spins left counter is accurate)
    renderSpinPageUI();
}


/**
 * Handles the user clicking "Claim Reward" in the win confirmation modal.
 * Checks authentication and profile state, then proceeds to API call or shows profile edit modal.
 */
async function handleClaimFromModal() {
    playSound('click');
    hideModal('modal-reward-won'); // Close the confirmation modal
    const { isAuthenticated, userProfile, claimNavigationState } = getState();
    const user = getCurrentFirebaseUser(); // Get Firebase user object

    // Validate that necessary claim info exists from the spin result
    if (!claimNavigationState?.restaurantId || !claimNavigationState?.spinResult) {
        console.error("App: Claim button clicked, but claimNavigationState missing info.");
        showModal('modal-message', {title: 'Error', text: 'Claim information lost. Please spin again.'});
        return;
    }

    if (isAuthenticated && user) {
        // --- User is Logged In ---
        console.log("App: User authenticated, checking stored userProfile for claim:", userProfile);
        // Check if Name and WhatsApp are present in our persisted profile state
        const needsName = !userProfile?.name;
        const needsWhatsapp = !userProfile?.whatsapp;

        if (!needsName && !needsWhatsapp) {
            // Profile complete - call the backend API
            console.log("App: Required info found in userProfile state. Triggering claim API.");
            triggerClaimRewardAPI(claimNavigationState, userProfile.name, userProfile.whatsapp);
        } else {
            // Profile incomplete - show the Edit Profile modal to collect missing data
            console.log("App: Required info missing from userProfile state. Showing Edit Profile Modal.");
            showModal('modal-edit-profile', {
                name: userProfile?.name || user.displayName || user.email || '', // Pre-fill options
                whatsapp: userProfile?.whatsapp || user.phoneNumber || '' // Pre-fill options
            });
            // claimNavigationState persists until the Edit Profile modal is submitted/canceled
        }
    } else {
        // --- User Not Logged In ---
        console.log("App: User not authenticated, navigating to Auth page.");
        // Navigate to auth page; claimNavigationState (with spinResult) persists in sessionStorage
        window.location.hash = '#/auth';
    }
}

/**
 * Handles the actual API call to claim the reward.
 * Called after authentication and profile checks pass.
 * Triggers dashboard refresh on successful claim.
 * @param {object} claimInfo - Base claim info { spinResult, restaurantId, restaurantName }
 * @param {string} name - The user's name (verified/collected).
 * @param {string} whatsapp - The user's WhatsApp number (verified/collected).
 */
export async function triggerClaimRewardAPI(claimInfo, name, whatsapp) {
    console.log("App: Triggering claim API.", { claimInfo, name, whatsapp });
    setLoading(true); // Show general loading indicator
    hideModal('modal-edit-profile'); // Ensure edit profile modal is closed if open
    let apiResponse = null;

    try {
        const token = await getCurrentUserIdToken();
        const user = getCurrentFirebaseUser();

        // Validation
        if (!token || !user) throw new Error("User not properly authenticated.");
        if (!claimInfo?.spinResult || !claimInfo?.restaurantId) throw new Error("Missing base claim information.");
        if (!name) throw new Error("User name is required.");
        if (!whatsapp) throw new Error("User WhatsApp number is required.");

        // Prepare data matching backend expectation (x-www-form-urlencoded handled by api.js)
        const apiData = {
            restaurantId: claimInfo.restaurantId,
            name: name,
            whatsapp: whatsapp,
            reward: claimInfo.spinResult.label, // Or use .value if backend expects that
            email: user.email || undefined,
            spendAmount: 0 // Default spend amount
        };

        console.log("App: Calling claimReward API with data:", apiData);
        apiResponse = await claimReward(token, apiData); // Make the API call via api.js
        console.log("App: Claim API successful:", apiResponse);

        // Store the successful API response temporarily for the coupon page display
        setClaimNavigationState({ claimApiResponse: apiResponse, restaurantId: claimInfo.restaurantId });

        // Navigate to the coupon display page
        window.location.hash = `#/${claimInfo.restaurantId}/coupon`;
        // claimNavigationState will be cleared by the coupon page route handler after rendering

        // Trigger dashboard refresh in the background AFTER successful claim
        console.log("App: Claim successful, triggering dashboard refresh.");
        triggerDashboardRefresh(); // Fetch fresh data non-blockingly

    } catch (error) {
        console.error("App: Claim API failed:", error);
        showModal('modal-message', { title: 'Claim Failed', text: `Could not claim reward: ${error.message || 'Please try again.'}` });
        clearClaimNavigationState(); // Clear the state as the claim failed
    } finally {
        setLoading(false); // Hide general loading indicator
    }
}


/**
 * Handles submission of either the Login or Sign Up form.
 * Authenticates the user and then checks if a claim needs to be processed.
 * @param {Event} event - The form submission event.
 */
async function handleAuthFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    playSound('click');
    console.log("App: Auth form submitted.");
    const form = event.target;
    const isLoginForm = form.id === 'auth-login-form';

    // Get elements and values safely
    const emailInput = isLoginForm ? elements.authEmailLogin : elements.authEmailSignup;
    const passwordInput = isLoginForm ? elements.authPasswordLogin : elements.authPasswordSignup;
    const messageElement = isLoginForm ? elements.authLoginMessage : elements.authSignupMessage;
    const buttonElement = isLoginForm ? elements.authLoginButton : elements.authSignupButton;

    if (!emailInput || !passwordInput || !messageElement || !buttonElement) {
        console.error("App: Critical Auth form elements missing from DOM cache!");
        alert("An unexpected error occurred (UI elements missing). Please refresh.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic client-side validation
    if (!email || !password) { showMessage(messageElement, "Please enter both email and password.", 'error'); return; }

    let signupName = null, signupWhatsapp = null;
    if (!isLoginForm) {
        if (!elements.authNameSignup || !elements.authWhatsappSignup) {
             console.error("App: Signup Name/WhatsApp input elements missing!");
             showMessage(messageElement, "An error occurred (UI elements missing). Please refresh.", 'error'); return;
        }
        signupName = elements.authNameSignup.value.trim();
        signupWhatsapp = elements.authWhatsappSignup.value.trim();
        if (!signupName || !signupWhatsapp) { showMessage(messageElement, "Name and WhatsApp number are required for sign up.", 'error'); return; }
        if (password.length < 6) { showMessage(messageElement, "Password must be at least 6 characters.", 'error'); return; }
    }

    // Update UI for processing
    hideMessage(messageElement);
    buttonElement.disabled = true;
    buttonElement.textContent = 'Processing...';
    setLoading(true);

    try {
        let user; // Firebase user object
        console.log(`App: Attempting Firebase ${isLoginForm ? 'Login' : 'Sign Up'}...`);
        if (isLoginForm) {
            user = await signInUser(email, password);
        } else {
            // Pass signup details; signUpUser now saves profile via updateUserProfileState
            user = await signUpUser(email, password, signupName, signupWhatsapp);
        }
        console.log(`App: Firebase ${isLoginForm ? 'Login' : 'Sign Up'} successful for ${user.email}`);

        // Use setTimeout to allow onAuthStateChanged listener to fire and update state (incl. userProfile)
        setTimeout(async () => {
            console.log("App: Running post-auth check...");
            try {
                // Get the latest state *after* auth change might have loaded profile
                const { claimNavigationState, userProfile } = getState();

                // Check if there's a pending reward claim
                if (claimNavigationState?.spinResult) {
                    console.log("App: Post-auth claim detected. Checking profile:", userProfile);
                    const finalName = userProfile?.name;
                    const finalWhatsapp = userProfile?.whatsapp;

                    if (finalName && finalWhatsapp) {
                        // Profile complete, trigger the claim API call
                        console.log("App: Profile complete post-auth. Triggering claim API.");
                        triggerClaimRewardAPI(claimNavigationState, finalName, finalWhatsapp);
                    } else {
                        // Profile still incomplete, show the edit modal
                        console.log("App: Profile incomplete post-auth. Showing Edit Profile Modal.");
                        const fbUser = getCurrentFirebaseUser();
                        showModal('modal-edit-profile', {
                            name: finalName || fbUser?.displayName || fbUser?.email || '', // Pre-fill with best available name
                            whatsapp: finalWhatsapp || fbUser?.phoneNumber || '' // Pre-fill with best available number
                        });
                        // Claim state remains until edit modal is submitted
                    }
                } else {
                    // Just a regular login/signup without a pending claim
                    console.log("App: Authentication successful (no pending claim), navigating to dashboard.");
                    window.location.hash = '#/dashboard'; // Navigate to dashboard
                }
            } catch (postAuthError) {
                 console.error("App: Error during post-authentication claim check:", postAuthError);
                 showModal('modal-message', { title: 'Error', text: `An error occurred after authentication: ${postAuthError.message}`});
                 window.location.hash = '#/dashboard'; // Navigate somewhere safe on error
            } finally {
                setLoading(false); // Turn off loading indicator set before setTimeout
            }
        }, 200); // Delay allows state propagation

    } catch (error) { // Catch errors directly from signInUser/signUpUser
        console.error(`App: ${isLoginForm ? 'Login' : 'Sign Up'} error:`, error);
        showMessage(messageElement, error.message || 'Authentication failed.', 'error');
        buttonElement.disabled = false; // Re-enable button on error
        buttonElement.textContent = isLoginForm ? 'Login' : 'Sign Up';
        setLoading(false); // Turn off loading on immediate auth error
    }
}


/**
 * Handles submission of the Edit Profile modal form.
 * Updates the user profile state/storage and triggers claim API if needed.
 */
async function handleProfileUpdateSubmit(event) {
    event.preventDefault(); playSound('click');
    // Ensure elements exist
    if (!elements.editNameInput || !elements.editPhoneInput || !elements.editProfileMessage || !event.target) return;
    const name = elements.editNameInput.value.trim();
    const whatsapp = elements.editPhoneInput.value.trim();
    const messageElement = elements.editProfileMessage;
    const buttonElement = event.target.querySelector('button[type="submit"]');

    hideMessage(messageElement);
    if (!name || !whatsapp) { showMessage(messageElement, "Name and WhatsApp number are required.", 'error'); return; }
    // TODO: Add robust WhatsApp validation if needed

    if(buttonElement) buttonElement.disabled = true;
    if(buttonElement) buttonElement.textContent = 'Saving...';
    let profileUpdated = false;

    try {
        // Update state and localStorage via state function
        updateUserProfileState(name, whatsapp);
        profileUpdated = true;

        // Optional: Update Firebase profile (async, non-blocking)
        const user = getCurrentFirebaseUser();
        if (user?.updateProfile && name !== user.displayName) {
             user.updateProfile({ displayName: name })
                .then(() => console.log("App: Firebase display name updated."))
                .catch(err => console.warn("App: Failed to update Firebase display name:", err));
        }

        hideModal('modal-edit-profile'); // Close modal on success

        // Check if we were editing profile as part of a claim flow
        setTimeout(() => { // Use timeout to allow state update propagation
            const { claimNavigationState, userProfile } = getState(); // Get latest state
            if (claimNavigationState?.spinResult) {
                console.log("App: Profile updated during claim flow. Checking profile and triggering API.");
                // Verify state reflects the update before calling API
                if (userProfile?.name === name && userProfile?.whatsapp === whatsapp) {
                    triggerClaimRewardAPI(claimNavigationState, name, whatsapp);
                } else {
                     console.error("App: Profile state mismatch after update. Cannot trigger claim reliably.", { expected: { name, whatsapp }, actual: userProfile });
                     showModal('modal-message', { title: 'Error', text: 'Could not verify profile update. Please try claiming again.' });
                     clearClaimNavigationState(); // Clear state as we can't proceed
                }
            } else {
                console.log("App: Profile updated (not during claim flow).");
                // Dashboard UI should update automatically via its state listener
            }
        }, 100); // Small delay

    } catch (error) {
         console.error("App: Failed to update profile state:", error);
         showMessage(messageElement, `Error saving profile: ${error.message}`, 'error');
         profileUpdated = false; // Mark as failed
    } finally {
         // Re-enable button
         if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = 'Save Changes';
         }
         // Clear claim state ONLY if profile save itself failed, otherwise let claim proceed/fail
         if (!profileUpdated) {
             clearClaimNavigationState();
         }
    }
}

/**
 * Function to fetch fresh dashboard data from the backend and update state/cache.
 * Called by router on dashboard load and after successful claims.
 */
export async function triggerDashboardRefresh() {
    const token = await getCurrentUserIdToken();
    if (!token) { console.log("App: Skipping dashboard refresh, user not authenticated."); setDashboardLoading(false); return; }

    console.log("App: Initiating dashboard data refresh...");
    setDashboardLoading(true); // Set dashboard-specific loading flag

    try {
        const freshDashboardData = await fetchDashboardData(token); // Call the API
        console.log("App: Dashboard refresh successful.");
        setDashboardData(freshDashboardData); // Update state and cache in localStorage

    } catch (error) {
        console.error("App: Failed to refresh dashboard data:", error);
        // Keep existing cached data (if any) and maybe show a non-blocking error
        // For example, using a temporary toast message library (not implemented here)
        // showToast(`Error updating dashboard: ${error.message}`, 'error');
    } finally {
        setDashboardLoading(false); // Clear dashboard-specific loading flag
    }
}


// --- Global Event Listeners Setup ---
function setupEventListeners() {
    console.log("App: Setting up event listeners...");

    // Back Button
    elements.backButton?.addEventListener('click', () => { playSound('click'); window.history.back(); });

    // Modal Close Logic
    elements.modalOverlay?.addEventListener('click', (event) => { const target = event.target; const isCloseButton = target.classList.contains('modal-close-button'); const modalIdToClose = isCloseButton ? target.getAttribute('data-modal-id') : null; const closestModal = target.closest('.modal'); if (target === elements.modalOverlay || isCloseButton) { playSound('click'); const idToClose = modalIdToClose || closestModal?.id; if (idToClose) hideModal(idToClose); else if (target === elements.modalOverlay) { elements.modalOverlay.classList.add('hidden'); elements.modalOverlay.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); } } });

    // Specific Modal Buttons
    elements.modalClaimButton?.addEventListener('click', handleClaimFromModal);
    elements.modalSpinAgainButton?.addEventListener('click', () => { playSound('click'); hideModal('modal-reward-won'); });

    // Auth Form Submissions
    if (elements.authLoginForm) elements.authLoginForm.addEventListener('submit', handleAuthFormSubmit);
    else console.warn("App: Login form not found for listener.");
    if(elements.authSignupForm) elements.authSignupForm.addEventListener('submit', handleAuthFormSubmit);
    else console.warn("App: Signup form not found for listener.");

    // Auth Tab Switching
    elements.authLoginTab?.addEventListener('click', () => { playSound('click'); showAuthTab('login'); });
    elements.authSignupTab?.addEventListener('click', () => { playSound('click'); showAuthTab('signup'); });

    // Edit Profile Modal Submission
    elements.editProfileForm?.addEventListener('submit', handleProfileUpdateSubmit);

    // Edit Profile Button on Dashboard
    elements.dashboardEditProfileButton?.addEventListener('click', () => { playSound('click'); const { userProfile } = getState(); const u = getCurrentFirebaseUser(); showModal('modal-edit-profile', { name: userProfile?.name || u?.displayName || u?.email || '', whatsapp: userProfile?.whatsapp || u?.phoneNumber || '' }); });

    // *** External Spin Button Listener ***
    if (elements.spinButtonElement) elements.spinButtonElement.addEventListener('click', initiateSpin);
    else console.error("App: CRITICAL - Spin Action Button (#spin-action-button) not found!");

    // Sounds for other major navigation links
    elements.dashboardLink?.addEventListener('click', () => playSound('click'));
    elements.headerLoginLink?.addEventListener('click', () => playSound('click'));
    elements.couponViewRewardsButton?.addEventListener('click', () => playSound('click'));
    elements.couponSpinAgainButton?.addEventListener('click', () => playSound('click'));
    elements.landingSpinButton?.addEventListener('click', () => playSound('click'));

    // Route Change Listener (for clearing messages etc.)
    document.addEventListener('routematch', (event) => { const { routeInfo } = event.detail; console.log("App: Route matched:", routeInfo?.handlerName); hideMessage(elements.spinMessageDisplay); });

    console.log("App: Global event listeners setup complete.");
}


// --- Initialization Sequence ---
function initApp() {
    console.log("Initializing App...");
    preloadSounds(); // Optional: Load sounds early
    monitorAuthState(); // Setup Firebase listener FIRST - crucial for initial state
    initializeState(); // Load non-auth state (daily spins, cached dashboard, profile)
    initRouter();      // Setup routing and handle initial route (relies on initial state)
    setupEventListeners(); // Attach listeners AFTER elements should be available in DOM
    console.log("App Initialized.");

    // Trigger initial dashboard refresh after app loads if user is logged in
    // Use setTimeout to allow initial rendering from cache first
    setTimeout(() => {
        const { isAuthenticated, dashboardLoading } = getState();
        if (isAuthenticated && !dashboardLoading) {
             console.log("App: Triggering initial dashboard refresh after load.");
             triggerDashboardRefresh();
        } else if (isAuthenticated) {
             console.log("App: Dashboard refresh likely already in progress or data cached.");
        }
    }, 500); // Delay (ms)
}

// --- Start Application ---
document.addEventListener('DOMContentLoaded', initApp);

// --- Global State Change Listener (Minimal - for app-level reactions) ---
// Most UI updates should be handled within ui.js's own listener
document.addEventListener('statechange', (event) => {
    const changedState = event.detail;
    // Example: Toggle body class for dashboard loading state
    if (changedState.hasOwnProperty('dashboardLoading')) {
        console.log("App State Listener: Dashboard Loading changed to", changedState.dashboardLoading);
        document.body.classList.toggle('dashboard-loading', changedState.dashboardLoading);
    }
});