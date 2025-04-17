import { showMessage, hideMessage, elements } from './ui.js';
import { setAuthState, updateUserProfileState } from './state.js'; // Added updateUserProfileState
// Import state variable and setter from router

export function handleClaimSubmit(event) {
    event.preventDefault();
    const { currentRestaurant } = getState(); // Get restaurant ID
    const restaurantId = currentRestaurant?.id;

    if (!restaurantId) {
        showMessage(elements.claimMessageDisplay, 'Could not identify restaurant.', 'error');
        return;
    }

    const name = elements.claimNameInput.value.trim();
    const phone = elements.claimPhoneInput.value.trim();
    const email = elements.claimEmailInput.value.trim().toLowerCase();

    if (!name || !phone || !email) {
        showMessage(elements.claimMessageDisplay, 'Please fill in all fields.', 'error');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showMessage(elements.claimMessageDisplay, 'Please enter a valid email address.', 'error');
        return;
    }

    hideMessage(elements.claimMessageDisplay);
    elements.claimSubmitButton.disabled = true;
    elements.claimSubmitButton.textContent = 'Saving...';

    try {
        const newUser = { name, phone, email, passwordSet: false };
        loginUser(newUser); // Save user and update state

        // Retrieve from the imported router variable
        const { primaryReward, bonusReward } = couponNavigationState || {};

        if (!primaryReward) {
            // It's possible state was lost (e.g., full page refresh), although unlikely with hash routing
            console.error("Claim submit: couponNavigationState missing reward details.");
            throw new Error("Reward details not found after claim submission.");
        }

        // Set the state AGAIN for the next navigation (to coupon page)
        setCouponNavState({ primaryReward, bonusReward });
        console.log("Re-Stored nav state before navigating to coupon:", { primaryReward, bonusReward });

        // Navigate to coupon display page
        window.location.hash = `#/${restaurantId}/coupon`;

    } catch (error) {
        console.error("Claim submission error:", error);
        showMessage(elements.claimMessageDisplay, 'An error occurred saving your details. Please try again.', 'error');
        elements.claimSubmitButton.disabled = false;
        elements.claimSubmitButton.textContent = 'Claim & View Coupon';
    }
}

export function handlePasswordSetupSubmit(event) {
    event.preventDefault();
    const password = elements.passwordNewInput.value;
    const confirm = elements.passwordConfirmInput.value;

    if (password.length < 6) {
        showMessage(elements.passwordMessageDisplay, 'Password must be at least 6 characters.', 'error');
        return;
    }
    if (password !== confirm) {
        showMessage(elements.passwordMessageDisplay, 'Passwords do not match.', 'error');
        return;
    }

    hideMessage(elements.passwordMessageDisplay);
    elements.passwordSubmitButton.disabled = true;
    elements.passwordSubmitButton.textContent = 'Saving...';

    try {
        setUserPasswordFlag(); // Update state and localStorage
        // Navigate to dashboard
        window.location.hash = '#/dashboard';
    } catch (error) {
        console.error("Password setup error:", error);
        showMessage(elements.passwordMessageDisplay, 'An error occurred saving password status.', 'error');
        elements.passwordSubmitButton.disabled = false;
        elements.passwordSubmitButton.textContent = 'Set Password & Continue';
    }

}

export function handleProfileUpdateSubmit(event) {
    event.preventDefault();
    const name = elements.editNameInput.value.trim();
    const phone = elements.editPhoneInput.value.trim();

    if (!name || !phone) {
        showMessage(elements.editProfileMessage, 'Name and phone cannot be empty.', 'error');
        return;
    }

    hideMessage(elements.editProfileMessage);

    try {
        updateUserProfile(name, phone);
        // Close modal (handled by modal close button logic or explicitly call ui.hideModal)
        document.getElementById('modal-edit-profile').classList.add('hidden'); // Quick hide
        // Check if overlay needs hiding too
        if (!document.querySelector('.modal:not(.hidden)')) {
            document.getElementById('modal-overlay').classList.add('hidden');
        }

    } catch (error) {
        console.error("Profile update error:", error);
        showMessage(elements.editProfileMessage, 'Failed to update profile.', 'error');
    }
}

export function handleLogout() {
    logoutUser();
    // Navigate to default landing page
    window.location.hash = '#/healthy-bowl';
}

// --- Firebase Configuration ---
// WARNING: Storing config directly in code is not recommended for production.
// Consider environment variables or a server-side config endpoint.
// PASTE YOUR FIREBASE CONFIG OBJECT HERE:

const firebaseConfig = {
    apiKey: "AIzaSyALZiqfQXlCGqRCI_NN3127oZhIkFd6unk",
    authDomain: "spinthewheel-e14a6.firebaseapp.com",
    projectId: "spinthewheel-e14a6",
    storageBucket: "spinthewheel-e14a6.appspot.com",
    messagingSenderId: "186691676465",
    appId: "1:186691676465:web:a67ad5afc60424d586e810",
    measurementId: "G-SC1JQLBXHY"
};

// --- Initialize Firebase ---
let firebaseApp;
let firebaseAuth;
try {
    // Use compat libraries with window.firebase
    firebaseApp = window.firebase.initializeApp(firebaseConfig);
    firebaseAuth = window.firebase.auth();
    console.log("Auth: Firebase Initialized Successfully.");
} catch (error) {
    console.error("Auth: Firebase Initialization Failed:", error);
    // Handle initialization error appropriately (e.g., show error message to user)
}

// --- Authentication Functions ---

/**
 * Signs up a new user with email and password.
 * Returns the user object on success, throws error on failure.
 */
export async function signUpUser(email, password, name, whatsapp) { // Accept name/whatsapp
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized.");
    console.log(`Auth: Attempting sign up for ${email}`);
    try {
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("Auth: Sign up successful:", user?.uid);

        // *** NEW: Save profile info immediately to state/localStorage ***
        updateUserProfileState(name, whatsapp);

        // Optional: Update Firebase profile display name (async, don't block)
        if (user && name) {
            user.updateProfile({ displayName: name }).then(() => {
                console.log("Auth: Firebase profile display name updated.");
            }).catch(err => {
                 console.warn("Auth: Could not update Firebase display name:", err);
            });
        }

        return user; // Return firebase user object
    } catch (error) {
        console.error("Auth: Sign up error:", error.code, error.message);
        throw error; // Re-throw for the caller to handle
    }
}

/**
 * Signs in an existing user with email and password.
 * Returns the user object on success, throws error on failure.
 */
export async function signInUser(email, password) {
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized.");
    console.log(`Auth: Attempting sign in for ${email}`);
    try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        console.log("Auth: Sign in successful:", userCredential.user?.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Auth: Sign in error:", error.code, error.message);
        throw error; // Re-throw
    }
}

/**
 * Signs out the current user.
 */
export async function signOutUser() {
    if (!firebaseAuth) return;
    try {
        await firebaseAuth.signOut();
        console.log("Auth: Sign out successful.");
        // *** NEW: Clear cached data on sign out ***
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.DASHBOARD_DATA);
    } catch (error) {
        console.error("Auth: Sign out error:", error);
    }
}

/**
 * Gets the current user's ID token.
 * Returns the token string or null if not authenticated or error occurs.
 * Handles token refresh automatically if needed (Firebase SDK does this).
 */
export async function getCurrentUserIdToken() {
    if (!firebaseAuth?.currentUser) {
        // console.log("Auth: No current user for getIdToken.");
        return null;
    }
    try {
        // Pass true to force refresh if needed, otherwise SDK handles caching
        const token = await firebaseAuth.currentUser.getIdToken(false);
        // console.log("Auth: Got ID token.");
        return token;
    } catch (error) {
        console.error("Auth: Error getting ID token:", error);
        return null;
    }
}

/**
 * Listens for changes in the user's authentication state and updates global state.
 */
export function monitorAuthState() {
    if (!firebaseAuth) return;

    firebaseAuth.onAuthStateChanged(async (user) => {
        console.log("Auth: Auth state changed. User:", user ? user.uid : null);
        if (user) {
            // User is signed in
            const token = await getCurrentUserIdToken(); // Get token immediately
            // Update global state (defined in state.js)
            setAuthState(true, user, token, false); // isAuthenticated, firebaseUser, idToken, authLoading
        } else {
            // User is signed out
            setAuthState(false, null, null, false);
        }
    });
}

/**
 * Gets the currently authenticated Firebase user object.
 * Returns the user object or null.
 */
export function getCurrentFirebaseUser() {
    return firebaseAuth?.currentUser;
}

// Add storage keys definition if not already present
const STORAGE_KEYS = {
    USER_PROFILE: 'spinAppUserProfile',
    DASHBOARD_DATA: 'spinAppDashboardData'
};