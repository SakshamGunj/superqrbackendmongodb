// js/app.js

// --- State Management Imports ---
import {
    initializeState,
    getState,
    setSpinResult,
    setClaimNavigationState,
    clearClaimNavigationState,
    canSpin,
    recordSpin, // To record the spin attempt
    setLoading,
    updateUserProfileState, // Import profile update function
    setDashboardData, // Import dashboard data setter
    setDashboardLoading // Import dashboard loading setter
} from './state.js';

// --- Routing Imports ---
import { initRouter } from './router.js';

// --- UI Imports ---
import {
    showModal,
    hideModal,
    showMessage,
    hideMessage,
    elements, // Object containing cached DOM elements
    showAuthTab,
    renderSpinPageUI, // Import UI update function for spin page
    renderDashboard // Import dashboard renderer
} from './ui.js';

// --- Authentication Imports ---
import {
    signUpUser,
    signInUser,
    signOutUser,
    monitorAuthState, // Initializes auth state listening
    getCurrentFirebaseUser,
    getCurrentUserIdToken
} from './auth.js';

// --- API Imports ---
import { claimReward, fetchDashboardData } from './api.js'; // Import API functions

// --- Audio Imports ---
import { playSound, preloadSounds } from './audio.js'; // Import sound functions


// --- Constants ---
// Points are handled by backend

// --- Core Application Logic ---

/**
 * Handles the result after the spin wheel animation finishes.
 * Checks spin limits, records the spin, plays sounds, and proceeds with win/loss logic.
 * @param {object} winningSector - The offer object from the winning segment.
 */
export async function handleSpinEnd(winningSector) {
    console.log("App: Spin animation ended. Result:", winningSector);
    const { currentRestaurant } = getState();

    if (!currentRestaurant) {
        console.error("App: Spin ended but no current restaurant context.");
        if (elements.spinMessageDisplay) showMessage(elements.spinMessageDisplay, "Error processing spin. Please reload.", 'error');
        return;
    }

    // 1. Check if the spin was allowed (Safeguard)
    // Note: spinWheel.js's startSpin should ideally prevent this call if !canSpin
    if (!canSpin(currentRestaurant.id)) {
        console.warn(`App: Spin ended for ${currentRestaurant.id}, but user has no spins left according to canSpin(). Ignoring result.`);
        renderSpinPageUI(); // Ensure UI shows limit
        return;
    }

    // 2. Record the spin attempt *immediately*
    try {
        recordSpin(currentRestaurant.id); // Decrements count and saves to storage
        renderSpinPageUI(); // Update the "Spins left today" display *now*
    } catch (error) {
         console.error("App: Error recording spin:", error);
         if (elements.spinMessageDisplay) showMessage(elements.spinMessageDisplay, "Error recording spin attempt.", 'error');
         return; // Stop if recording fails
    }

    // 3. Process the result (Win or Try Again)
    setSpinResult(winningSector); // Store result temporarily in state

    if (winningSector.value !== 'TRY_AGAIN') {
        // --- WIN ---
        playSound('spin-win'); // Play win sound
        console.log("App: Spin resulted in a WIN.");
        const claimInfo = {
            spinResult: winningSector,
            restaurantId: currentRestaurant.id,
            restaurantName: currentRestaurant.name
        };
        setClaimNavigationState(claimInfo); // Persists to sessionStorage
        console.log("App: Stored claim navigation state for win:", claimInfo);
        // Show confirmation modal - claim logic happens when user clicks modal button
        showModal('modal-reward-won', { description: winningSector.label });

    } else {
        // --- TRY AGAIN ---
        playSound('spin-try-again'); // Play try again sound
        console.log("App: Spin resulted in TRY AGAIN.");
        if (elements.spinMessageDisplay) {
             showMessage(elements.spinMessageDisplay, winningSector.label || 'Better luck next time!', 'info');
             // Clear message after delay (optional)
             setTimeout(() => hideMessage(elements.spinMessageDisplay), 3500);
        }
        // UI (remaining spins) was already updated after recordSpin call.
    }
}

/**
 * Handles the user clicking "Claim Reward" in the win confirmation modal.
 * Checks authentication and persisted user profile state. If profile incomplete, shows edit modal.
 * Otherwise, triggers the claim API call.
 */
async function handleClaimFromModal() {
    playSound('click'); // Play click sound
    hideModal('modal-reward-won');
    const { isAuthenticated, userProfile, claimNavigationState } = getState();
    const user = getCurrentFirebaseUser(); // Get current Firebase user object

    if (!claimNavigationState || !claimNavigationState.restaurantId || !claimNavigationState.spinResult) {
        console.error("App: Claim button clicked, but claimNavigationState is missing required info.");
        // Show error in a generic modal as spin page might not be visible
        showModal('modal-message', {title: 'Error', text: 'Claim information lost. Please spin again.'});
        return;
    }

    if (isAuthenticated && user) {
        // --- User is Logged In - Check our Stored Profile ---
        console.log("App: User authenticated, checking stored userProfile for claim:", userProfile);
        const needsName = !userProfile?.name;
        const needsWhatsapp = !userProfile?.whatsapp;

        if (!needsName && !needsWhatsapp) {
            // Profile complete, proceed to API call using stored info
            console.log("App: Required info found in userProfile state. Triggering claim API.");
            triggerClaimRewardAPI(claimNavigationState, userProfile.name, userProfile.whatsapp); // Pass info from profile state
        } else {
            // Profile incomplete - show the Edit Profile modal
            console.log("App: Required info missing from userProfile state. Showing Edit Profile Modal.");
            showModal('modal-edit-profile', {
                name: userProfile?.name || user.displayName || user.email || '', // Prefill options
                whatsapp: userProfile?.whatsapp || user.phoneNumber || '' // Prefill options
            });
            // claimNavigationState remains set until edit modal is submitted or canceled
        }
    } else {
        // --- User Not Logged In ---
        console.log("App: User not authenticated, navigating to Auth page to complete claim.");
        window.location.hash = '#/auth'; // Router will use claimNavigationState
    }
}

/**
 * Handles the actual API call to claim the reward after auth and profile checks pass.
 * Triggers dashboard refresh on success.
 * @param {object} claimInfo - Base claim info { spinResult, restaurantId, restaurantName }
 * @param {string} name - The user's name (verified/collected).
 * @param {string} whatsapp - The user's WhatsApp number (verified/collected).
 */
export async function triggerClaimRewardAPI(claimInfo, name, whatsapp) {
    console.log("App: Triggering claim API.", { claimInfo, name, whatsapp });
    setLoading(true); // Show general loading indicator
    hideModal('modal-edit-profile'); // Ensure edit profile modal is hidden if it was open
    let apiResponse = null;

    try {
        const token = await getCurrentUserIdToken();
        const user = getCurrentFirebaseUser(); // Get user again just in case

        // Validation
        if (!token || !user) throw new Error("User not properly authenticated.");
        if (!claimInfo?.spinResult || !claimInfo?.restaurantId) throw new Error("Missing base claim information.");
        if (!name) throw new Error("User name is required.");
        if (!whatsapp) throw new Error("User WhatsApp number is required.");

        // Prepare data for the API
        const apiData = {
            restaurantId: claimInfo.restaurantId,
            name: name,
            whatsapp: whatsapp,
            reward: claimInfo.spinResult.label, // Or use value: claimInfo.spinResult.value
            email: user.email || undefined,
            spendAmount: 0 // Default spend amount
        };

        console.log("App: Calling claimReward API with data:", apiData);
        apiResponse = await claimReward(token, apiData); // Make the API call
        console.log("App: Claim API successful:", apiResponse);

        // Store API response temporarily for the coupon page display
        // Pass restaurant ID as well, needed by coupon page renderer
        setClaimNavigationState({ claimApiResponse: apiResponse, restaurantId: claimInfo.restaurantId });

        // Navigate to the coupon display page
        window.location.hash = `#/${claimInfo.restaurantId}/coupon`;
        // The claimNavigationState will be cleared by the coupon page route handler after rendering

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
    event.preventDefault();
    playSound('click'); // Play sound on submit
    const form = event.target;
    const isLoginForm = form.id === 'auth-login-form';

    // Get common elements and values
    const emailInput = isLoginForm ? elements.authEmailLogin : elements.authEmailSignup;
    const passwordInput = isLoginForm ? elements.authPasswordLogin : elements.authPasswordSignup;
    const messageElement = isLoginForm ? elements.authLoginMessage : elements.authSignupMessage;
    const buttonElement = isLoginForm ? elements.authLoginButton : elements.authSignupButton;
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    // Check if elements exist before proceeding
    if (!emailInput || !passwordInput || !messageElement || !buttonElement) {
        console.error("App: Auth form elements missing."); return;
    }

    // Basic validation
    if (!email || !password) { showMessage(messageElement, "Please enter both email and password.", 'error'); return; }
    let signupName = null;
    let signupWhatsapp = null;
    if (!isLoginForm) {
         signupName = elements.authNameSignup?.value.trim();
         signupWhatsapp = elements.authWhatsappSignup?.value.trim();
         if (!signupName || !signupWhatsapp) { showMessage(messageElement, "Name and WhatsApp number are required for sign up.", 'error'); return; }
         if (password.length < 6) { showMessage(messageElement, "Password must be at least 6 characters.", 'error'); return; }
    }

    // UI feedback
    hideMessage(messageElement);
    buttonElement.disabled = true;
    buttonElement.textContent = 'Processing...';
    setLoading(true);

    try {
        let user; // Firebase user object

        if (isLoginForm) {
            user = await signInUser(email, password);
        } else {
            // Sign Up - Pass details to signUpUser which saves them via updateUserProfileState
            user = await signUpUser(email, password, signupName, signupWhatsapp);
        }

        console.log(`App: ${isLoginForm ? 'Login' : 'Sign Up'} successful for ${user.email}`);

        // Allow auth state change listener to process (which loads profile state)
        setTimeout(async () => {
            try {
                const { claimNavigationState, userProfile } = getState(); // Get updated state

                if (claimNavigationState && claimNavigationState.spinResult) {
                    console.log("App: Post-auth claim detected. Checking user profile...");
                    const finalName = userProfile?.name; // Should be populated now
                    const finalWhatsapp = userProfile?.whatsapp; // Should be populated now

                    if (finalName && finalWhatsapp) {
                        console.log("App: Profile complete post-auth. Triggering claim API.");
                        triggerClaimRewardAPI(claimNavigationState, finalName, finalWhatsapp);
                    } else {
                        // Profile still incomplete (unlikely after signup, possible after login if never completed)
                        console.log("App: Profile incomplete post-auth. Showing Edit Profile Modal.");
                        const fbUser = getCurrentFirebaseUser();
                        showModal('modal-edit-profile', {
                            name: finalName || fbUser?.displayName || fbUser?.email || '',
                            whatsapp: finalWhatsapp || fbUser?.phoneNumber || ''
                        });
                    }
                } else {
                    // Just a regular login/signup, navigate to dashboard
                    console.log("App: Authentication successful (no pending claim), navigating to dashboard.");
                    window.location.hash = '#/dashboard';
                }
            } catch (postAuthError) {
                 console.error("App: Error during post-authentication claim check:", postAuthError);
                 showModal('modal-message', { title: 'Error', text: `An error occurred after authentication: ${postAuthError.message}`});
                 window.location.hash = '#/dashboard'; // Navigate somewhere safe
            } finally {
                setLoading(false); // Turn off loading indicator set before setTimeout
            }
        }, 150); // Delay

    } catch (error) { // Catch errors from signInUser/signUpUser
        console.error(`App: ${isLoginForm ? 'Login' : 'Sign Up'} error:`, error);
        showMessage(messageElement, error.message || 'Authentication failed.', 'error');
        buttonElement.disabled = false;
        buttonElement.textContent = isLoginForm ? 'Login' : 'Sign Up';
        setLoading(false); // Turn off loading on immediate auth error
    }
}

/**
 * Handles submission of the Edit Profile modal form.
 * Updates the user profile state and triggers claim API if needed.
 */
async function handleProfileUpdateSubmit(event) {
    event.preventDefault();
    playSound('click');

    if (!elements.editNameInput || !elements.editPhoneInput || !elements.editProfileMessage || !event.target) return;

    const name = elements.editNameInput.value.trim();
    const whatsapp = elements.editPhoneInput.value.trim();
    const messageElement = elements.editProfileMessage;
    const buttonElement = event.target.querySelector('button[type="submit"]');

    hideMessage(messageElement);
    if (!name || !whatsapp) {
        showMessage(messageElement, "Name and WhatsApp number are required.", 'error');
        return;
    }

    if (buttonElement) buttonElement.disabled = true;
    if (buttonElement) buttonElement.textContent = 'Saving...';
    let profileUpdated = false;

    try {
        updateUserProfileState(name, whatsapp); // Update state and localStorage
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
        setTimeout(() => { // Allow state update propagation
            const { claimNavigationState, userProfile } = getState();
            if (claimNavigationState && claimNavigationState.spinResult) {
                console.log("App: Profile updated during claim flow. Checking profile and triggering API.");
                if (userProfile?.name === name && userProfile?.whatsapp === whatsapp) {
                    triggerClaimRewardAPI(claimNavigationState, name, whatsapp);
                } else {
                     console.error("App: Profile state mismatch after update. Cannot trigger claim reliably.", { expected: { name, whatsapp }, actual: userProfile });
                     showModal('modal-message', { title: 'Error', text: 'Could not verify profile update. Please try claiming again.' });
                     clearClaimNavigationState();
                }
            } else {
                console.log("App: Profile updated (not during claim flow).");
            }
        }, 100);

    } catch (error) {
         console.error("App: Failed to update profile state:", error);
         showMessage(messageElement, `Error saving profile: ${error.message}`, 'error');
         profileUpdated = false;
    } finally {
         if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = 'Save Changes';
         }
         if (!profileUpdated) {
             // Don't proceed with claim check if profile save failed
             clearClaimNavigationState();
         }
    }
}

/**
 * Function to fetch fresh dashboard data from the backend and update state/cache.
 * Called by router on dashboard load and after successful claims.
 */
export async function triggerDashboardRefresh() {
    // Check if user is authenticated before fetching
    const token = await getCurrentUserIdToken();
    if (!token) {
        console.log("App: Skipping dashboard refresh, user not authenticated.");
        setDashboardLoading(false); // Ensure loading is off
        // Router should handle redirect if dashboard page is active
        return;
    }

    console.log("App: Initiating dashboard data refresh...");
    setDashboardLoading(true);

    try {
        const freshDashboardData = await fetchDashboardData(token);
        console.log("App: Dashboard refresh successful.");
        setDashboardData(freshDashboardData); // Update state and cache

    } catch (error) {
        console.error("App: Failed to refresh dashboard data:", error);
        // Keep stale data, but maybe show an error?
        // showModal('modal-message', { title: 'Update Failed', text: 'Could not update dashboard data.'});
    } finally {
        setDashboardLoading(false);
    }
}


// --- Global Event Listeners Setup ---
function setupEventListeners() {
    // Back Button
    elements.backButton?.addEventListener('click', () => { playSound('click'); window.history.back(); });

    // Modal Close Buttons (Generic)
    elements.modalOverlay?.addEventListener('click', (event) => {
        const target = event.target;
        const isCloseButton = target.classList.contains('modal-close-button');
        const modalIdToClose = isCloseButton ? target.getAttribute('data-modal-id') : null;
        const closestModal = target.closest('.modal');
        if (target === elements.modalOverlay || isCloseButton) {
            playSound('click');
            const idToClose = modalIdToClose || closestModal?.id;
            if (idToClose) hideModal(idToClose);
            else if (target === elements.modalOverlay) {
                elements.modalOverlay.classList.add('hidden');
                elements.modalOverlay.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            }
        }
    });

    // Specific Modal Actions
    elements.modalClaimButton?.addEventListener('click', handleClaimFromModal);
    elements.modalSpinAgainButton?.addEventListener('click', () => { playSound('click'); hideModal('modal-reward-won'); });

    // Auth Form Submissions
    elements.authLoginForm?.addEventListener('submit', handleAuthFormSubmit);
    elements.authSignupForm?.addEventListener('submit', handleAuthFormSubmit);

    // Auth Tab Switching
    elements.authLoginTab?.addEventListener('click', () => { playSound('click'); showAuthTab('login'); });
    elements.authSignupTab?.addEventListener('click', () => { playSound('click'); showAuthTab('signup'); });

    // Edit Profile Modal Submission
    elements.editProfileForm?.addEventListener('submit', handleProfileUpdateSubmit);

    // Edit Profile Button on Dashboard
    elements.dashboardEditProfileButton?.addEventListener('click', () => {
         playSound('click');
         const { userProfile } = getState();
         const currentUser = getCurrentFirebaseUser();
         showModal('modal-edit-profile', {
             name: userProfile?.name || currentUser?.displayName || currentUser?.email || '',
             whatsapp: userProfile?.whatsapp || currentUser?.phoneNumber || ''
         });
    });

    // External Spin Button Listener
    elements.spinButtonElement?.addEventListener('click', () => { // Use the correct ID (spin-action-button from HTML)
        // Optional: Add brief visual feedback on click before spin starts
        elements.spinButtonElement.classList.add('active-click');
        setTimeout(() => elements.spinButtonElement?.classList.remove('active-click'), 150);
        startSpin(); // Call the imported startSpin function
    });


    // Sounds for other major navigation links
     elements.dashboardLink?.addEventListener('click', () => playSound('click'));
     elements.headerLoginLink?.addEventListener('click', () => playSound('click'));
     elements.couponViewRewardsButton?.addEventListener('click', () => playSound('click'));
     elements.couponSpinAgainButton?.addEventListener('click', () => playSound('click'));
     elements.landingSpinButton?.addEventListener('click', () => playSound('click'));


    // Listen for custom route event (optional)
    document.addEventListener('routematch', (event) => {
        const { routeInfo } = event.detail;
        console.log("App: Detected route match event in app.js:", routeInfo?.handlerName);
        hideMessage(elements.spinMessageDisplay); // Clear spin message on route change
    });

    console.log("App: Global event listeners attached.");
}


// --- Initialization Sequence ---
function initApp() {
    console.log("Initializing App...");
    preloadSounds(); // Optional: Preload sounds
    monitorAuthState(); // Setup Firebase auth listener FIRST
    initializeState(); // Load client-side state (non-auth)
    initRouter();      // Setup routing and handle initial route
    setupEventListeners(); // Attach listeners AFTER elements exist
    console.log("App Initialized.");

    // Trigger initial dashboard refresh after app loads if user is logged in
    setTimeout(() => {
        const { isAuthenticated, dashboardLoading } = getState();
        if (isAuthenticated && !dashboardLoading) {
             console.log("App: Triggering initial dashboard refresh after load.");
             triggerDashboardRefresh();
        } else if (isAuthenticated) {
             console.log("App: Dashboard refresh likely already in progress from state change.");
        }
    }, 500); // Delay
}

// --- Start Application ---
document.addEventListener('DOMContentLoaded', initApp);

// --- Global State Change Listener (for dashboard loading indicator) ---
// This listener is now primarily within ui.js to keep UI updates together
// document.addEventListener('statechange', (event) => { ... }); // Remove duplicate listener if present here