// js/ui.js

// --- Imports ---
import { getState, getRemainingSpins, updateUserProfileState } from './state.js';
// Config import might only be needed for theme fallback if API fails
// import { fetchRestaurantConfigById } from './config.js';
import { formatDate } from './utils.js';
import { getCurrentFirebaseUser, signOutUser } from './auth.js';


// --- Define Global Spin Point Milestones (Optional - Not Used in Current Dashboard Render) ---
const GLOBAL_SPIN_MILESTONES = [
    { points: 50, reward: "Bonus Sparkle", icon: "✨" },
    { points: 150, reward: "Coffee Treat", icon: "☕" },
    { points: 300, reward: "Sweet Discount", icon: "🏷️" },
    { points: 500, reward: "Snack Time", icon: "🍟" },
    { points: 1000, reward: "₹500 Voucher", icon: "💰" },
    { points: 2000, reward: "VIP Status", icon: "⭐" },
];


// --- Element Getters Cache (Ensure IDs match index.html) ---
export const elements = {
    // App Container
    appContainer: document.getElementById('app-container'),
    mainContent: document.getElementById('main-content'),
    // Header
    header: document.getElementById('app-header'),
    headerTitle: document.getElementById('header-title'),
    backButton: document.getElementById('back-button'),
    headerAuthSection: document.getElementById('header-auth-section'),
    headerLoginLink: document.getElementById('header-login-link'),
    headerUserSection: document.getElementById('header-user-section'),
    headerUserName: document.getElementById('header-user-name'),
    dashboardLink: document.getElementById('dashboard-link'),
    headerLogoutButton: document.getElementById('header-logout-button'),
    headerPlaceholderRight: document.getElementById('header-placeholder-right'),
    // Pages
    pageLoading: document.getElementById('page-loading'),
    pageLanding: document.getElementById('page-landing'),
    pageSpin: document.getElementById('page-spin'),
    pageAuth: document.getElementById('page-auth'),
    pageCouponDisplay: document.getElementById('page-coupon-display'),
    pageDashboard: document.getElementById('page-dashboard'),
    pageNotFound: document.getElementById('page-not-found'),
    // Landing Page Elements
    landingRestaurantName: document.getElementById('landing-restaurant-name'),
    landingRestaurantDescription: document.getElementById('landing-restaurant-description'),
    landingSpinButton: document.getElementById('landing-spin-button'),
    landingRestaurantLogo: document.getElementById('landing-restaurant-logo'),
    // Spin Page Elements
    spinMessageDisplay: document.getElementById('spin-message-display'),
    spinButtonElement: document.getElementById('spin-action-button'), // External spin button
    spinPageRemainingSpins: document.getElementById('spin-remaining-spins'),
    spinRewardsPreview: document.getElementById('spin-rewards-preview'),
    spinRewardsPreviewContainer: document.getElementById('spin-rewards-preview-container'),
    // Slot Machine Elements
    slotReel1: document.getElementById('reel1'),
    // Auth Page Elements
    authTabs: document.getElementById('auth-tabs'),
    authLoginTab: document.getElementById('auth-login-tab'),
    authSignupTab: document.getElementById('auth-signup-tab'),
    authLoginForm: document.getElementById('auth-login-form'),
    authSignupForm: document.getElementById('auth-signup-form'),
    authLoginMessage: document.getElementById('auth-login-message'),
    authSignupMessage: document.getElementById('auth-signup-message'),
    authEmailLogin: document.getElementById('auth-email-login'),
    authPasswordLogin: document.getElementById('auth-password-login'),
    authEmailSignup: document.getElementById('auth-email-signup'),
    authPasswordSignup: document.getElementById('auth-password-signup'),
    authNameSignup: document.getElementById('auth-name-signup'),
    authWhatsappSignup: document.getElementById('auth-whatsapp-signup'),
    authLoginButton: document.getElementById('auth-login-button'),
    authSignupButton: document.getElementById('auth-signup-button'),
    authClaimInfo: document.getElementById('auth-claim-info'),
    authClaimDescription: document.getElementById('auth-claim-description'),
    // Coupon Display Elements
    couponBonusMessage: document.getElementById('coupon-bonus-message'),
    couponDescription: document.getElementById('coupon-description'),
    couponCode: document.getElementById('coupon-code'),
    couponValidity: document.getElementById('coupon-validity'),
    couponViewRewardsButton: document.getElementById('coupon-view-rewards-button'),
    couponSpinAgainButton: document.getElementById('coupon-spin-again-button'),
    // Dashboard Elements
    dashboardProfileSection: document.getElementById('dashboard-profile'),
    dashboardWelcome: document.getElementById('dashboard-welcome'),
    dashboardEmail: document.getElementById('dashboard-email'),
    dashboardPhone: document.getElementById('dashboard-phone'),
    dashboardEditProfileButton: document.getElementById('dashboard-edit-profile-button'),
    dashboardSummary: document.getElementById('dashboard-summary'),
    dashboardGlobalTimeline: document.getElementById('dashboard-global-timeline'), // Keep if using global timeline
    dashboardTabsContainer: document.getElementById('dashboard-tabs'),
    dashboardTabContentContainer: document.getElementById('dashboard-tab-content'),
    dashboardNoData: document.getElementById('dashboard-no-data'),
    // Modals
    modalOverlay: document.getElementById('modal-overlay'),
    modalRewardWon: document.getElementById('modal-reward-won'),
    modalRewardDescription: document.getElementById('modal-reward-description'),
    modalClaimButton: document.getElementById('modal-claim-button'),
    modalSpinAgainButton: document.getElementById('modal-spin-again-button'),
    modalEditProfile: document.getElementById('modal-edit-profile'),
    editProfileForm: document.getElementById('edit-profile-form'),
    editProfileMessage: document.getElementById('edit-profile-message'),
    editNameInput: document.getElementById('edit-name'),
    editPhoneInput: document.getElementById('edit-phone'),
    modalMessage: document.getElementById('modal-message'),
    modalMessageTitle: document.getElementById('modal-message-title'),
    modalMessageText: document.getElementById('modal-message-text'),
};


// --- Page Visibility ---
export function showPage(pageId) {
    console.log(`UI: Attempting to show page: ${pageId}`);
    const mainContent = elements.mainContent;
    if (!mainContent) { console.error("UI: Main content container not found!"); return; }

    elements.pageLoading?.classList.remove('loading-visible');
    let foundPage = false;

    const pages = mainContent.querySelectorAll(':scope > .page');
    pages.forEach(page => { if (page.id !== 'page-loading') page.classList.remove('active'); });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        elements.header?.classList.remove('on-dark'); // Reset header style
        document.body.classList.remove('dark-theme-explicit'); // Reset body theme

        if (targetPage.classList.contains('dark-theme')) {
            elements.header?.classList.add('on-dark');
            document.body.classList.add('dark-theme-explicit');
        }

        if (pageId === 'page-loading') { elements.pageLoading?.classList.add('loading-visible'); console.log(`UI: Activated loading page.`); }
        else { targetPage.classList.add('active'); console.log(`UI: Activated content page: ${pageId}`); mainContent.scrollTop = 0; }
        foundPage = true;
    } else {
        console.warn(`UI: Page with ID ${pageId} not found. Showing 404.`);
        elements.pageNotFound?.classList.add('active');
        elements.header?.classList.remove('on-dark');
        document.body.classList.remove('dark-theme-explicit');
    }
    updateHeaderUI();
}

// --- Theming ---
export function applyTheme(theme) {
    const root = document.documentElement;
    const defaultTheme = { primary: '#8a2be2', secondary: '#ff69b4', accent: '#f1c40f', primaryRgb: '138, 43, 226', secondaryRgb: '255, 105, 180', accentRgb: '241, 196, 15'};
    const currentTheme = (theme && typeof theme === 'object' && theme.primary) ? theme : defaultTheme;
    const safeTheme = { ...defaultTheme, ...currentTheme };

    const hexToRgb = (hex) => { let r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : null; };
    safeTheme.primaryRgb = safeTheme.primaryRgb || hexToRgb(safeTheme.primary) || defaultTheme.primaryRgb;
    safeTheme.secondaryRgb = safeTheme.secondaryRgb || hexToRgb(safeTheme.secondary) || defaultTheme.secondaryRgb;
    safeTheme.accentRgb = safeTheme.accentRgb || hexToRgb(safeTheme.accent) || defaultTheme.accentRgb;

    root.style.setProperty('--theme-primary', safeTheme.primary);
    root.style.setProperty('--theme-secondary', safeTheme.secondary);
    root.style.setProperty('--theme-accent', safeTheme.accent);
    root.style.setProperty('--theme-primary-rgb', safeTheme.primaryRgb);
    root.style.setProperty('--theme-secondary-rgb', safeTheme.secondaryRgb);
    root.style.setProperty('--theme-accent-rgb', safeTheme.accentRgb);
}

// --- Header Update ---
function updateHeaderUI() {
    if (!elements.headerTitle || !elements.backButton || !elements.headerAuthSection) { return; }
    const { isAuthenticated, firebaseUser, currentRestaurant, currentRoute, userProfile } = getState();
    const path = currentRoute?.path || '';
    let title = 'Spin & Win';
    if (path === '/dashboard') title = 'Dashboard';
    else if (path === '/auth') title = 'Login / Sign Up';
    else if (currentRestaurant) title = currentRestaurant.name;
    elements.headerTitle.textContent = title;
    const showBack = path !== '/dashboard' && path !== '/auth' && !path.match(/^\/[^/]+\/?$/);
    elements.backButton.classList.toggle('hidden', !showBack);
    const loginLink = elements.headerLoginLink; const userSection = elements.headerUserSection;
    const userNameDisplay = elements.headerUserName; const logoutButton = elements.headerLogoutButton;
    const dashboardLink = elements.dashboardLink; const placeholderRight = elements.headerPlaceholderRight;

    if (isAuthenticated && firebaseUser) {
        loginLink?.classList.add('hidden'); userSection?.classList.remove('hidden');
        dashboardLink?.classList.remove('hidden'); placeholderRight?.classList.add('hidden');
        if (userNameDisplay) userNameDisplay.textContent = userProfile?.name || firebaseUser.displayName || firebaseUser.email || 'User';
        if (logoutButton) logoutButton.onclick = signOutUser;
    } else {
        loginLink?.classList.remove('hidden'); userSection?.classList.add('hidden');
        dashboardLink?.classList.add('hidden'); placeholderRight?.classList.remove('hidden');
        if (loginLink) loginLink.href = '#/auth';
    }
}

// --- Loading State ---
export function showLoading(show) {
    console.log(`UI: Setting generic loading state (page shown by router): ${show}`);
    // Can control a global spinner here if needed
}

// --- Message Display ---
export function showMessage(element, text, type = 'info') {
    if (!element) { console.warn(`UI: showMessage called with null element for text: ${text}`); return; }
    if (!text) { hideMessage(element); return; };
    element.textContent = text;
    element.className = `message-display ${type}-message`;
    element.classList.remove('hidden');
}
export function hideMessage(element) {
    if (!element) return;
    element.classList.add('hidden');
    element.textContent = '';
}

// --- Modal Controls ---
export function showModal(modalId, content = {}) {
    const modalElement = document.getElementById(modalId);
    const overlay = elements.modalOverlay;
    if (!modalElement || !overlay) { console.error(`UI: Cannot show modal - Element not found for ID: ${modalId}`); return; }
    if (modalId === 'modal-reward-won' && elements.modalRewardDescription) elements.modalRewardDescription.textContent = content.description ?? 'Unknown Reward';
    if (modalId === 'modal-edit-profile') {
        const currentProfile = getState().userProfile;
        if(elements.editNameInput) elements.editNameInput.value = content.name ?? currentProfile?.name ?? '';
        if(elements.editPhoneInput) elements.editPhoneInput.value = content.whatsapp ?? currentProfile?.whatsapp ?? '';
        hideMessage(elements.editProfileMessage);
    }
    if (modalId === 'modal-message' && elements.modalMessageTitle && elements.modalMessageText) {
        elements.modalMessageTitle.textContent = content.title ?? 'Message';
        elements.modalMessageText.textContent = content.text ?? '';
    }
    overlay.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    modalElement.classList.remove('hidden');
    overlay.classList.remove('hidden');
}
export function hideModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) modalElement.classList.add('hidden');
    const anyModalVisible = elements.modalOverlay?.querySelector('.modal:not(.hidden)');
    if (!anyModalVisible) {
        elements.modalOverlay?.classList.add('hidden');
    }
}

// --- Render Specific Pages ---

export function renderLandingPage(config) {
    if (!config || !elements.landingRestaurantName || !elements.landingRestaurantDescription || !elements.landingSpinButton) return;
    applyTheme(config?.theme); // Use restaurant theme if available
    elements.landingRestaurantName.textContent = config.name;
    elements.landingRestaurantDescription.textContent = config.description || 'Spin for exclusive rewards!';
    if (elements.landingRestaurantLogo) {
        if (config.logoUrl) { elements.landingRestaurantLogo.src = config.logoUrl; elements.landingRestaurantLogo.alt = `${config.name} Logo`; elements.landingRestaurantLogo.classList.remove('hidden'); }
        else { elements.landingRestaurantLogo.src = '/assets/icons/gift-box.png'; elements.landingRestaurantLogo.alt = 'Spin and Win'; elements.landingRestaurantLogo.classList.remove('hidden'); }
    }
    elements.landingSpinButton.onclick = () => window.location.hash = `#/${config.id}/spin`;
}

// Helper to get an emoji icon based on offer label/value
function getOfferIcon(offer) {
    if (!offer || !offer.label) return '🎁';
    const labelLower = offer.label.toLowerCase();
    const valueLower = offer.value ? offer.value.toLowerCase() : '';
    if (labelLower.includes('coffee')) return '☕';
    if (labelLower.includes('drink') || labelLower.includes('smoothie')) return '🥤';
    if (labelLower.includes('pizza')) return '🍕';
    if (labelLower.includes('% off') || valueLower.includes('_percent_off') || labelLower.includes('discount')) return '🏷️';
    if (labelLower.includes('$ off') || valueLower.includes('_dollar_off') || labelLower.includes('voucher') || labelLower.includes('₹')) return '💰';
    if (labelLower.includes('food') || labelLower.includes('meal')) return '🍔';
    if (labelLower.includes('appetizer') || labelLower.includes('knots') || labelLower.includes('soup') || labelLower.includes('salad')) return '🥗';
    if (labelLower.includes('topping')) return '🍓';
    if (labelLower.includes('dessert')) return '🍰';
    if (labelLower.includes('bonus')) return '⭐';
    if (labelLower.includes('try again') || valueLower.includes('try_again')) return '🔄';
    return '🎁';
}

// Creates HTML for a rewards preview tag
function createRewardTagHTML(offer, index) {
    const tag = document.createElement('div');
    tag.className = `reward-tag reward-tag-${(index % 6) + 1}`;
    tag.textContent = offer.label;
    return tag;
}

// Creates HTML for a single item inside a slot reel
function createSlotItemHTML(offer) {
    const item = document.createElement('div');
    item.className = 'slot-item';
    const icon = getOfferIcon(offer);
    item.dataset.value = offer.value;
    item.innerHTML = `<span class="icon">${icon}</span><span>${offer.label}</span>`;
    return item;
}

// Populate single reel helper function
function populateReel(reelElement, offers) {
    const reelContainer = reelElement.querySelector('.slot-reel-container') || reelElement;
    if (!reelContainer || !offers || offers.length === 0) {
        console.warn("UI: Cannot populate reel, container or offers missing/empty.");
        reelContainer.innerHTML = '<div class="slot-item"><span class="icon">❓</span><span>No Prizes</span></div>';
        return;
    };
    reelContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const requiredItems = Math.max(15, offers.length * 5); // Ensure enough items
    for (let i = 0; i < requiredItems; i++) {
        const offer = offers[i % offers.length]; // Cycle through offers
        fragment.appendChild(createSlotItemHTML(offer));
    }
    reelContainer.appendChild(fragment);
    reelContainer.style.transition = 'none';
    const reelHeight = reelElement.clientHeight || 100; // Use default if height not available
    const itemHeight = reelContainer.querySelector('.slot-item')?.clientHeight || REEL_ITEM_HEIGHT;
    const initialOffset = (reelHeight / 2) - (itemHeight / 2);
    reelContainer.style.transform = `translateY(${initialOffset}px)`;
    reelContainer.offsetHeight;
    reelContainer.style.transition = '';
}

// Render Spin Page UI (including Offers Preview and Initial Slot State)
export function renderSpinPageUI() {
    const { currentRestaurant } = getState();
    if (!currentRestaurant || !elements.spinPageRemainingSpins || !elements.spinButtonElement) {
        console.warn("UI: Cannot render spin page UI - missing elements or restaurant context.");
        elements.spinRewardsPreview?.classList.add('hidden');
        return;
    }
    applyTheme(currentRestaurant.theme); // Apply theme

    // Render remaining spins
    const remainingSpins = getRemainingSpins(currentRestaurant.id);
    if (elements.spinPageRemainingSpins) {
        elements.spinPageRemainingSpins.textContent = `Spins left: ${remainingSpins}`;
        elements.spinPageRemainingSpins.classList.remove('hidden');
    } else { console.warn("UI: spinPageRemainingSpins element not found."); }

    // Render Rewards Preview Tags
    const rewardsPreviewContainer = elements.spinRewardsPreviewContainer;
    const rewardsPreviewSection = elements.spinRewardsPreview;
    const allOffersRaw = currentRestaurant.spinOffers || currentRestaurant.offers || [];
    const allOffers = allOffersRaw.map(o => typeof o === 'string' ? { label: o, value: o } : o).filter(o => typeof o === 'object' && o !== null);
    const displayableOffers = allOffers.filter(offer => offer.value !== 'TRY_AGAIN');

    if (rewardsPreviewContainer && rewardsPreviewSection) {
        rewardsPreviewContainer.innerHTML = '';
        if (displayableOffers.length > 0) {
            displayableOffers.slice(0, 6).forEach((offer, index) => rewardsPreviewContainer.appendChild(createRewardTagHTML(offer, index)));
            rewardsPreviewSection.classList.remove('hidden');
        } else { rewardsPreviewSection.classList.add('hidden'); }
    } else { console.warn("UI: Spin rewards preview container or section not found."); }

    // Populate Initial Slot Reel State
    const reelElement = elements.slotReel1;
    if (reelElement) {
        if (displayableOffers.length > 0) {
            populateReel(reelElement, displayableOffers);
        } else {
             const reelContainer = reelElement.querySelector('.slot-reel-container') || reelElement;
             reelContainer.innerHTML = '<div class="slot-item"><span class="icon">🚫</span><span>No Prizes Available</span></div>';
        }
    } else { console.error("UI: Slot reel element 'reel1' not found!"); }

    // Update Spin Button State
    const spinButton = elements.spinButtonElement;
    if (spinButton) {
        const textSpan = spinButton.querySelector('span');
        const isSpinning = spinButton.classList.contains('spinning'); // Check class state
        if (remainingSpins <= 0) {
            if (textSpan) textSpan.textContent = 'No Spins Left';
            spinButton.setAttribute('disabled', 'true');
            spinButton.classList.add('disabled');
        } else {
            spinButton.removeAttribute('disabled');
            spinButton.classList.remove('disabled');
            if (textSpan && !isSpinning) { textSpan.textContent = 'Spin Now'; }
        }
    } else { console.error("UI: Spin action button element not found!"); }
}


// --- Slot Animation Control ---
const REEL_ITEM_HEIGHT = 100; // *** MUST MATCH CSS height for .slot-item ***
const SPIN_INTERVAL = 40; // Interval speed (ms) for blur effect
const SPIN_BLUR_SPEED = 100; // Pixels per interval scroll
let reelIntervals = [null]; // Only one interval needed

// Starts the spinning animation for the single reel
export function startSlotAnimation() {
    // Get valid displayable offers for animation
    const allOffersRaw = getState().currentRestaurant?.spinOffers || getState().currentRestaurant?.offers || [];
    const offers = allOffersRaw.map(o => typeof o === 'string' ? { label: o, value: o } : o)
                               .filter(o => typeof o === 'object' && o !== null && o.value !== 'TRY_AGAIN');

    if (offers.length === 0) { console.warn("UI: No valid offers to animate reel."); return; }

    const reelElement = elements.slotReel1;
    const reelContainer = reelElement?.querySelector('.slot-reel-container') || reelElement;
    if (!reelContainer) { console.error("UI: Cannot start slot animation - reel container not found."); return; }

    // Ensure sufficient items for looping illusion
    if (reelContainer.children.length < offers.length * 5) { // Need enough items
         console.log("UI: Repopulating reel for animation.");
         populateReel(reelContainer, offers); // Use only displayable offers
    }

    reelContainer.classList.add('spinning');
    reelContainer.style.transition = `transform ${SPIN_INTERVAL / 1000}s linear`; // Fast transition for blur

    let position = parseFloat(reelContainer.style.transform?.replace(/[^0-9.-]/g, '') || '0');
    const totalHeight = reelContainer.scrollHeight;
    const visibleHeight = reelElement.clientHeight || REEL_ITEM_HEIGHT; // Use default if needed

    if (reelIntervals[0]) clearInterval(reelIntervals[0]); // Clear previous interval

    console.log("UI: Starting slot animation interval.");
    reelIntervals[0] = setInterval(() => {
        position -= SPIN_BLUR_SPEED; // Move upwards fast
        // Wrap around logic
        if (Math.abs(position) >= (totalHeight - visibleHeight)) {
            const offset = (visibleHeight / 2) - (REEL_ITEM_HEIGHT / 2); // Center offset
            const overScroll = Math.abs(position) % totalHeight; // How much scrolled past the full list
            position = offset - overScroll; // Reset near top based on overshoot

            reelContainer.style.transition = 'none'; // No transition during reset jump
            reelContainer.style.transform = `translateY(${position}px)`;
            reelContainer.offsetHeight; // Force reflow
            reelContainer.style.transition = `transform ${SPIN_INTERVAL / 1000}s linear`; // Re-enable
        } else {
            reelContainer.style.transform = `translateY(${position}px)`;
        }
    }, SPIN_INTERVAL);
}

// Stops the spinning animation and smoothly lands on the result
export function stopSlotAnimation(resultOffer) {
    console.log("UI: Stopping slot animation to land on:", resultOffer?.label);
    const reelElement = elements.slotReel1;
    const reelContainer = reelElement?.querySelector('.slot-reel-container') || reelElement;
    if (!reelContainer) { console.error("UI: Cannot stop animation, reel container not found."); return; }

    // Clear the spinning interval
    if (reelIntervals[0]) { clearInterval(reelIntervals[0]); reelIntervals[0] = null; }

    // Find target index for the result visually
    let targetIndex = -1;
    const items = reelContainer.querySelectorAll('.slot-item');
    const offersInReel = Array.from(items).map(item => item.querySelector('span:last-child')?.textContent || '');

    // Try find instance in middle third first for smoother visual stop
    const searchStart = Math.floor(items.length / 3);
    const searchEnd = Math.floor(items.length * 2 / 3);
    for (let i = searchStart; i <= searchEnd; i++) { if (items[i]?.textContent.includes(resultOffer.label)) { targetIndex = i; break; } }
    // Fallback: search from beginning
    if (targetIndex === -1) { for (let i = 0; i < items.length; i++) { if (items[i]?.textContent.includes(resultOffer.label)) { targetIndex = i; break; } } }
    // Absolute fallback
    if (targetIndex === -1) { targetIndex = Math.floor(items.length / 2); console.warn(`UI: Could not find "${resultOffer.label}" in reel visually, stopping near middle.`); }

    // Calculate final position to center the target item
    const windowHeight = reelElement.clientHeight || 100;
    const finalPosition = (windowHeight / 2) - (REEL_ITEM_HEIGHT / 2) - (targetIndex * REEL_ITEM_HEIGHT);

    // Apply smooth 'ease-out' style transition to the final position
    reelContainer.style.transition = 'transform 1.5s cubic-bezier(0.23, 1, 0.32, 1)'; // Slow down smoothly
    reelContainer.style.transform = `translateY(${finalPosition}px)`;
    reelContainer.classList.remove('spinning');
    console.log(`UI: Animating reel stop to position: ${finalPosition}px (index: ${targetIndex})`);
}


// --- Auth Page Rendering ---
export function renderAuthPage(claimInfo = null) {
     if (!elements.authLoginForm || !elements.authSignupForm || !elements.authLoginMessage || !elements.authSignupMessage || !elements.authClaimInfo || !elements.authClaimDescription) {
          console.error("UI: Auth page elements missing."); return;
     }
     elements.authLoginForm.reset(); elements.authSignupForm.reset();
     hideMessage(elements.authLoginMessage); hideMessage(elements.authSignupMessage);
     showAuthTab('login');
     if (claimInfo && claimInfo.spinResult) {
         elements.authClaimDescription.textContent = claimInfo.spinResult.label;
         elements.authClaimInfo.classList.remove('hidden');
     } else {
         elements.authClaimInfo.classList.add('hidden');
     }
}
export function showAuthTab(tabName) {
     const loginTab = elements.authLoginTab; const signupTab = elements.authSignupTab;
     const loginForm = elements.authLoginForm; const signupForm = elements.authSignupForm;
     if (!loginTab || !signupTab || !loginForm || !signupForm) { console.warn("UI: Auth tab elements missing."); return; };
     const isLogin = tabName === 'login';
     loginTab.classList.toggle('active', isLogin); signupTab.classList.toggle('active', !isLogin);
     loginForm.classList.toggle('hidden', !isLogin); signupForm.classList.toggle('hidden', isLogin);
}

// --- Coupon Page Rendering ---
export function renderCouponDisplayPage(claimApiResponse, restaurantId) {
     if (!elements.couponDescription || !elements.couponCode || !elements.couponValidity || !elements.couponBonusMessage || !elements.couponViewRewardsButton || !elements.couponSpinAgainButton) {
          console.error("UI: Coupon display page elements missing."); return;
     }
     if (!claimApiResponse || !claimApiResponse.coupon_code) {
         console.error("UI: Invalid data passed to renderCouponDisplayPage");
         elements.couponDescription.textContent = "Error displaying coupon."; elements.couponCode.textContent = "N/A";
         elements.couponValidity.textContent = "Please try again."; elements.couponBonusMessage.classList.add('hidden');
         return;
     };
     elements.couponDescription.textContent = claimApiResponse.message || "Reward Claimed!";
     elements.couponCode.textContent = claimApiResponse.coupon_code;
     elements.couponValidity.textContent = `Expires: ${formatDate(claimApiResponse.expiry_date)}. Show code to redeem.`;
     let bonusMsg = null;
     if (claimApiResponse.achieved_rewards?.length > 0) { // Basic check if bonuses were achieved
          bonusMsg = `🎉 Bonus Unlocked! Check your dashboard for details.`; // Generic bonus message
     }
     if(bonusMsg) { elements.couponBonusMessage.textContent = bonusMsg; elements.couponBonusMessage.classList.remove('hidden'); }
     else { elements.couponBonusMessage.classList.add('hidden'); }
     elements.couponViewRewardsButton.onclick = () => window.location.hash = '#/dashboard';
     elements.couponSpinAgainButton.onclick = () => window.location.hash = `#/${restaurantId}/spin`;
}


// --- Dashboard Rendering Helpers ---
function handleTabClick(event) {
    const clickedTab = event.target;
    const targetId = clickedTab.getAttribute('data-tab-target');
    if (!targetId || !elements.dashboardTabsContainer || !elements.dashboardTabContentContainer) {
         console.warn("UI: Tab click handler cannot find target or containers."); return;
    }
    elements.dashboardTabsContainer.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
    elements.dashboardTabContentContainer.querySelectorAll('.dashboard-tab-content').forEach(pane => pane.classList.remove('active'));
    clickedTab.classList.add('active');
    const targetPane = document.getElementById(targetId);
    if (targetPane) targetPane.classList.add('active');
    else console.warn(`UI: Target tab content pane not found: ${targetId}`);
}
function createClaimHistoryItemHTML(claim) {
    const item = document.createElement('div');
    item.className = 'history-item';
    const offer = claim?.offer ?? 'N/A'; const code = claim?.coupon_code ?? 'N/A';
    const date = formatDate(claim?.claimed_at); const status = claim?.status ?? 'unknown';
    item.innerHTML = `<div class="history-offer-code"><span class="history-offer">${offer}</span><span class="history-code">${code}</span></div><div class="history-status-date"><span class="history-status status-${status}">${status}</span><span class="history-date">${date || ''}</span></div>`;
    return item;
}
function createRewardGoalItemHTML(rewardName, points, type = 'unlocked') {
    const item = document.createElement('li');
    const icon = type === 'unlocked' ? '✓' : '⏳';
    const iconClass = type === 'unlocked' ? 'icon-success' : 'icon-upcoming';
    item.innerHTML = `<span class="icon ${iconClass}">${icon}</span><span class="reward-name">${rewardName ?? 'Unknown Reward'}</span><span class="reward-points">(${points} pts)</span>`;
    return item;
}
function toggleRewardHistory(event) {
    const button = event.target; const targetId = button.getAttribute('data-target');
    const historyList = document.getElementById(targetId); if (!historyList) return;
    const isVisible = !historyList.classList.contains('hidden');
    if (isVisible) {
        historyList.style.maxHeight = historyList.scrollHeight + "px";
        requestAnimationFrame(() => { historyList.style.maxHeight = '0px'; historyList.style.opacity = '0'; historyList.style.marginTop = '0'; button.textContent = button.textContent.replace('▲', '▼').replace('Hide', 'View'); });
        historyList.addEventListener('transitionend', () => { historyList.classList.add('hidden'); }, { once: true });
    } else {
        historyList.classList.remove('hidden'); const scrollHeight = historyList.scrollHeight;
        historyList.style.maxHeight = '0px'; historyList.style.opacity = '0'; historyList.style.marginTop = '0';
        requestAnimationFrame(() => { historyList.style.maxHeight = scrollHeight + "px"; historyList.style.opacity = '1'; historyList.style.marginTop = '1rem'; button.textContent = button.textContent.replace('▼', '▲').replace('View', 'Hide'); });
        historyList.addEventListener('transitionend', () => { if (!historyList.classList.contains('hidden')) historyList.style.maxHeight = ''; }, { once: true });
    }
}

// --- Render Dashboard (Main Function - Uses Corrected API Structure) ---
export function renderDashboard(dashboardApiResponse) {
    // --- Basic Element Checks & Get State ---
    if (!elements.dashboardProfileSection || !elements.dashboardSummary || !elements.dashboardTabsContainer || !elements.dashboardTabContentContainer || !elements.dashboardNoData) {
        console.error("UI: Essential dashboard elements missing, cannot render."); showPage('page-not-found'); return;
    }
    const { isAuthenticated, userProfile } = getState(); const currentUser = getCurrentFirebaseUser();

    // --- Render Profile Section ---
    if (isAuthenticated && currentUser && elements.dashboardWelcome && elements.dashboardEmail && elements.dashboardPhone) {
        elements.dashboardWelcome.textContent = `Welcome, ${userProfile?.name || currentUser.displayName || currentUser.email || 'User'}!`;
        elements.dashboardEmail.textContent = currentUser.email || 'N/A';
        elements.dashboardPhone.textContent = userProfile?.whatsapp || 'Not Provided';
        elements.dashboardProfileSection.classList.remove('hidden');
    } else { elements.dashboardProfileSection.classList.add('hidden'); }

    // --- Get Containers ---
    const summaryContainer = elements.dashboardSummary; const tabsContainer = elements.dashboardTabsContainer;
    const contentContainer = elements.dashboardTabContentContainer; const noDataElement = elements.dashboardNoData;
    const restaurantHeader = document.getElementById('dashboard-restaurant-header');

    // --- Clear Previous Content / Hide Sections ---
    summaryContainer.innerHTML = ''; tabsContainer.innerHTML = ''; contentContainer.innerHTML = '';
    noDataElement.classList.add('hidden'); summaryContainer.classList.add('hidden');
    tabsContainer.classList.add('hidden'); contentContainer.classList.add('hidden');
    restaurantHeader?.classList.add('hidden');

    // --- Check for Valid Data ---
    if (!dashboardApiResponse || dashboardApiResponse.status !== 'success' || !dashboardApiResponse.dashboard) {
        console.warn("UI: Invalid or unsuccessful dashboard API response.", dashboardApiResponse);
        noDataElement.textContent = dashboardApiResponse?.detail || "Could not load dashboard data.";
        noDataElement.classList.remove('hidden'); contentContainer.classList.remove('hidden'); return;
    }

    const dashboard = dashboardApiResponse.dashboard; const restaurantIds = Object.keys(dashboard);

    // --- Calculate and Render Overall Summary ---
    let calculatedTotalSpinPoints = 0;
    restaurantIds.forEach(id => { const info = dashboard[id]?.restaurant_info; const history = dashboard[id]?.user_data?.claim_history; if (info && history) calculatedTotalSpinPoints += (history.length * (info.spin_points_per_spin ?? 10)); });
    summaryContainer.innerHTML = `<span>Total Spin Points (Est.): <strong>${calculatedTotalSpinPoints}</strong></span>`;
    summaryContainer.classList.remove('hidden');

    // --- Prepare and Render Restaurant Tabs ---
    if (restaurantIds.length === 0) {
        noDataElement.textContent = "Spin at a restaurant to see your activity here!";
        noDataElement.classList.remove('hidden'); contentContainer.classList.remove('hidden');
    } else {
        restaurantHeader?.classList.remove('hidden'); tabsContainer.classList.remove('hidden');
        contentContainer.classList.remove('hidden'); noDataElement.classList.add('hidden');
        const tabData = restaurantIds.map(id => ({id, name: dashboard[id]?.restaurant_info?.restaurant_name || `Rest...${id.slice(-4)}`, data: dashboard[id]})).sort((a, b) => a.name.localeCompare(b.name));

        // --- Create Tabs and Content Panes ---
        tabData.forEach(({ id, name, data }, index) => {
            const restaurant_info = data?.restaurant_info || {}; const user_data = data?.user_data || {};
            const claim_history = user_data?.claim_history || []; const loyalty_settings = restaurant_info?.loyalty_settings?.current?.reward_thresholds || {};
            const spin_thresholds_obj = loyalty_settings.spin_points || {}; const spin_points_per_spin = restaurant_info?.spin_points_per_spin ?? 10;
            const current_spin_points = claim_history.length * spin_points_per_spin;

            // Create Tab Button
            const tabButton = document.createElement('button'); tabButton.className = 'dashboard-tab'; tabButton.textContent = name;
            const tabContentId = `tab-content-${id}`; tabButton.setAttribute('data-tab-target', tabContentId);
            if (index === 0) tabButton.classList.add('active'); tabButton.onclick = handleTabClick; tabsContainer.appendChild(tabButton);

            // Create Tab Content Pane
            const contentPane = document.createElement('div'); contentPane.className = 'dashboard-tab-content'; contentPane.id = tabContentId;
            if (index === 0) contentPane.classList.add('active');

            // --- Populate Content Pane with Card ---
            const detailsCard = document.createElement('div'); detailsCard.className = 'restaurant-details-card';
            // 1. Spin Points Summary
            const pointsSection = document.createElement('div'); pointsSection.className = 'tab-section-card spin-points-summary';
            pointsSection.innerHTML = `<h4>Spin Points</h4><p>Earned Here: <strong>${current_spin_points}</strong></p>`; detailsCard.appendChild(pointsSection);
            // 2. Reward Thresholds
            const thresholdsSection = document.createElement('div'); thresholdsSection.className = 'tab-section-card spin-rewards-section';
            thresholdsSection.innerHTML = `<h4>Spin Rewards Progress</h4>`;
            const unlockedList = document.createElement('ul'); unlockedList.className = 'rewards-list unlocked-rewards';
            const upcomingList = document.createElement('ul'); upcomingList.className = 'rewards-list upcoming-rewards';
            let unlockedCount = 0, upcomingCount = 0;
            const sortedThresholdKeys = Object.keys(spin_thresholds_obj).map(Number).sort((a, b) => a - b);
            sortedThresholdKeys.forEach(points => { const rewardName = spin_thresholds_obj[points.toString()]; const goalItem = createRewardGoalItemHTML(rewardName, points, current_spin_points >= points ? 'unlocked' : 'upcoming'); if (current_spin_points >= points) { unlockedList.appendChild(goalItem); unlockedCount++; } else { upcomingList.appendChild(goalItem); upcomingCount++; } });
            if (unlockedCount > 0) { thresholdsSection.innerHTML += '<h5>Unlocked:</h5>'; thresholdsSection.appendChild(unlockedList); }
            if (upcomingCount > 0) { thresholdsSection.innerHTML += '<h5 class="mt-1">Upcoming:</h5>'; thresholdsSection.appendChild(upcomingList); }
            if (unlockedCount === 0 && upcomingCount === 0) { thresholdsSection.innerHTML += '<p class="info-message">No spin rewards defined.</p>'; }
            detailsCard.appendChild(thresholdsSection);
            // 3. Claim History
            if (claim_history.length > 0) {
                const historyContainer = document.createElement('div'); historyContainer.className = 'tab-section-card claim-history-section';
                const historyListId = `history-list-${id}`;
                historyContainer.innerHTML = `<h4>Claim History (${claim_history.length}) <button class="toggle-history-btn" data-target="${historyListId}">View ▼</button></h4><div class="history-list hidden" id="${historyListId}"></div>`;
                const historyList = historyContainer.querySelector('.history-list');
                claim_history.sort((a,b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()).forEach(claim => { const item = createClaimHistoryItemHTML(claim); if(item) historyList.appendChild(item); });
                historyContainer.addEventListener('click', (e) => { if (e.target.classList.contains('toggle-history-btn')) { toggleRewardHistory(e); e.target.textContent = historyList.classList.contains('hidden') ? `View (${claim_history.length}) ▼` : `Hide ▲`; } });
                detailsCard.appendChild(historyContainer);
            }
            // 4. Spin Again Button
            const spinAgainContainer = document.createElement('div'); spinAgainContainer.className = 'spin-again-section';
            const spinAgainBtn = document.createElement('button'); spinAgainBtn.className = 'button button-primary button-fullWidth dashboard-spin-again-button'; spinAgainBtn.textContent = `Spin Again at ${name}`;
            spinAgainBtn.onclick = () => { window.location.hash = `#/${id}/spin`; };
            spinAgainContainer.appendChild(spinAgainBtn); detailsCard.appendChild(spinAgainContainer);
            // Add Card to Pane
            contentPane.appendChild(detailsCard);
            contentContainer.appendChild(contentPane);
        });
    }
}


// --- Global UI Update Trigger ---
document.addEventListener('statechange', (event) => {
     const changedState = event.detail;
     const spinPageActive = document.getElementById('page-spin')?.classList.contains('active');
     const dashboardPageActive = document.getElementById('page-dashboard')?.classList.contains('active');

     // Update header
     if (changedState.hasOwnProperty('isAuthenticated') || changedState.hasOwnProperty('currentRestaurant') || changedState.hasOwnProperty('firebaseUser') || changedState.hasOwnProperty('userProfile') ) {
         updateHeaderUI();
     }
     // Update spin page UI
     if (spinPageActive && (changedState.hasOwnProperty('dailySpinsUpdated') || changedState.hasOwnProperty('currentRestaurant'))) {
         renderSpinPageUI();
     }

     // Update dashboard profile section
     if (dashboardPageActive && changedState.hasOwnProperty('userProfile')) {
         const currentUser = getCurrentFirebaseUser(); const currentProfile = changedState.userProfile;
          if (currentUser && elements.dashboardProfileSection && elements.dashboardWelcome && elements.dashboardEmail && elements.dashboardPhone) {
             elements.dashboardWelcome.textContent = `Welcome, ${currentProfile?.name || currentUser.displayName || currentUser.email}!`;
             elements.dashboardEmail.textContent = currentUser.email || 'N/A';
             elements.dashboardPhone.textContent = currentProfile?.whatsapp || 'Not Provided';
          }
     }

      // Re-render the *entire* dashboard content if new dashboard data arrives
      if (dashboardPageActive && changedState.hasOwnProperty('dashboardData') && !changedState.hasOwnProperty('userProfile')) {
           console.log("UI State Listener: Re-rendering dashboard content due to new dashboardData state.");
           renderDashboard(changedState.dashboardData);
      }

      // Handle dashboard loading state display
      if (dashboardPageActive && changedState.hasOwnProperty('dashboardLoading')) {
          const dashboardLoader = document.getElementById('dashboard-content-loader'); // Example loader ID
          if(dashboardLoader) dashboardLoader.classList.toggle('hidden', !changedState.dashboardLoading);
          elements.dashboardTabsContainer?.classList.toggle('loading', changedState.dashboardLoading); // Example: Dim tabs
      }
});