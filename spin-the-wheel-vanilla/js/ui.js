// js/ui.js

// --- Imports ---
import { getState, getRemainingSpins, updateUserProfileState } from './state.js';
// Config import might only be needed for theme fallback if API fails
// import { fetchRestaurantConfigById } from './config.js'; // Not strictly needed if API provides names/themes
import { formatDate } from './utils.js';
import { getCurrentFirebaseUser, signOutUser } from './auth.js';

// --- Define Global Spin Point Milestones ---
// Used for the overall progress timeline on the dashboard
const GLOBAL_SPIN_MILESTONES = [
    { points: 50, reward: "Bonus Sparkle", icon: "✨" },
    { points: 150, reward: "Coffee Treat", icon: "☕" },
    { points: 300, reward: "Sweet Discount", icon: "🏷️" },
    { points: 500, reward: "Snack Time", icon: "🍟" },
    { points: 1000, reward: "₹500 Voucher", icon: "💰" },
    { points: 2000, reward: "VIP Status", icon: "⭐" },
];

// --- Element Getters (Ensure IDs match index.html) ---
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
    spinButtonElement: document.getElementById('spin-action-button'), // *** UPDATED: Use the external button ID ***
    spinPageRemainingSpins: document.getElementById('spin-remaining-spins'),
    spinOffersSection: document.getElementById('spin-offers-section'),
    spinOffersContainer: document.getElementById('spin-offers-container'),
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
    dashboardGlobalTimeline: document.getElementById('dashboard-global-timeline'),
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
    editPhoneInput: document.getElementById('edit-phone'), // Used for WhatsApp
    modalMessage: document.getElementById('modal-message'),
    modalMessageTitle: document.getElementById('modal-message-title'),
    modalMessageText: document.getElementById('modal-message-text'),
};


// --- Page Visibility ---
export function showPage(pageId) {
    console.log(`UI: Attempting to show page: ${pageId}`);
    const mainContent = elements.mainContent;
    if (!mainContent) {
        console.error("UI: Main content container not found!");
        return;
    }

    elements.pageLoading?.classList.remove('loading-visible');
    let foundPage = false;

    // Hide all pages except the loading overlay initially
    const pages = mainContent.querySelectorAll(':scope > .page');
    pages.forEach(page => {
        if (page.id !== 'page-loading') {
            page.classList.remove('active');
        }
    });

    // Show the target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        // Special handling for dark theme pages to adjust header style
        if (targetPage.classList.contains('dark-theme')) {
            elements.header?.classList.add('on-dark');
        } else {
            elements.header?.classList.remove('on-dark');
        }

        if (pageId === 'page-loading') {
            elements.pageLoading?.classList.add('loading-visible');
            console.log(`UI: Activated loading page.`);
        } else {
            targetPage.classList.add('active');
            console.log(`UI: Activated content page: ${pageId}`);
            mainContent.scrollTop = 0; // Scroll to top
        }
        foundPage = true;
    } else {
        console.warn(`UI: Page with ID ${pageId} not found. Showing 404.`);
        elements.pageNotFound?.classList.add('active'); // Fallback
        elements.header?.classList.remove('on-dark'); // Ensure header is not transparent on 404
    }
    // Update header AFTER page visibility and theme class are set
    updateHeaderUI();
}

// --- Theming ---
export function applyTheme(theme) {
    const root = document.documentElement;
    const defaultTheme = { primary: '#E53988', secondary: '#ffc107', accent: '#00bcd4', primaryRgb: '229, 57, 136', secondaryRgb: '255, 193, 7', accentRgb: '0, 188, 212'};
    const currentTheme = (theme && typeof theme === 'object' && theme.primary) ? theme : defaultTheme;
    const safeTheme = { ...defaultTheme, ...currentTheme };

    safeTheme.primaryRgb = safeTheme.primaryRgb || defaultTheme.primaryRgb;
    safeTheme.secondaryRgb = safeTheme.secondaryRgb || defaultTheme.secondaryRgb;
    safeTheme.accentRgb = safeTheme.accentRgb || defaultTheme.accentRgb;

    root.style.setProperty('--theme-primary', safeTheme.primary);
    root.style.setProperty('--theme-secondary', safeTheme.secondary);
    root.style.setProperty('--theme-accent', safeTheme.accent);
    root.style.setProperty('--theme-primary-rgb', safeTheme.primaryRgb);
    root.style.setProperty('--theme-secondary-rgb', safeTheme.secondaryRgb);
    root.style.setProperty('--theme-accent-rgb', safeTheme.accentRgb);
}

// --- Header Update ---
export function updateHeaderUI() {
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
    const loginLink = elements.headerLoginLink;
    const userSection = elements.headerUserSection;
    const userNameDisplay = elements.headerUserName;
    const logoutButton = elements.headerLogoutButton;
    const dashboardLink = elements.dashboardLink;
    const placeholderRight = elements.headerPlaceholderRight;

    if (isAuthenticated && firebaseUser) {
        loginLink?.classList.add('hidden');
        userSection?.classList.remove('hidden');
        dashboardLink?.classList.remove('hidden');
        placeholderRight?.classList.add('hidden');
        if (userNameDisplay) userNameDisplay.textContent = userProfile?.name || firebaseUser.displayName || firebaseUser.email || 'User';
        if (logoutButton) logoutButton.onclick = signOutUser;
    } else {
        loginLink?.classList.remove('hidden');
        userSection?.classList.add('hidden');
        dashboardLink?.classList.add('hidden');
        placeholderRight?.classList.remove('hidden');
        if (loginLink) loginLink.href = '#/auth';
    }
}

// --- Loading State ---
export function showLoading(show) {
    console.log(`UI: Setting generic loading state (page shown by router): ${show}`);
    // Optional: control a global overlay spinner if needed, distinct from page-loading
    // const globalSpinner = document.getElementById('global-spinner-overlay');
    // globalSpinner?.classList.toggle('visible', show);
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
    // Apply theme first for dark/light adaptation
    applyTheme(config.theme); // Assuming theme might be in config now
    elements.landingRestaurantName.textContent = config.name;
    elements.landingRestaurantDescription.textContent = config.description || 'Get ready for exciting rewards!';
    // Handle Logo
    if (elements.landingRestaurantLogo) {
        if (config.logoUrl) {
            elements.landingRestaurantLogo.src = config.logoUrl;
            elements.landingRestaurantLogo.alt = `${config.name} Logo`;
            elements.landingRestaurantLogo.classList.remove('hidden');
        } else {
            // Use a default or hide if no logo
             elements.landingRestaurantLogo.src = '/assets/icons/gift-box.png'; // Default gift
             elements.landingRestaurantLogo.alt = 'Spin and Win';
             elements.landingRestaurantLogo.classList.remove('hidden');
           // elements.landingRestaurantLogo.classList.add('hidden');
        }
    }
    elements.landingSpinButton.onclick = () => window.location.hash = `#/${config.id}/spin`;
}

// Helper to get an emoji icon based on offer label/value
export function getOfferIcon(offer) {
    if (!offer || !offer.label) return '🎁';
    const labelLower = offer.label.toLowerCase();
    const valueLower = offer.value ? offer.value.toLowerCase() : '';
    if (labelLower.includes('coffee') || valueLower.includes('coffee')) return '☕';
    if (labelLower.includes('drink') || valueLower.includes('drink') || valueLower.includes('smoothie')) return '🥤';
    if (labelLower.includes('pizza') || valueLower.includes('pizza')) return '🍕';
    if (labelLower.includes('% off') || valueLower.includes('_percent_off') || labelLower.includes('discount')) return '🏷️';
    if (labelLower.includes('dollar off') || valueLower.includes('_dollar_off') || labelLower.includes('voucher') || labelLower.includes('₹')) return '💰';
    if (labelLower.includes('food') || valueLower.includes('food') || valueLower.includes('meal')) return '🍔';
    if (labelLower.includes('appetizer') || valueLower.includes('appetizer') || labelLower.includes('knots') || labelLower.includes('soup') || labelLower.includes('salad')) return '🥗';
    if (labelLower.includes('topping') || valueLower.includes('topping')) return '🍓';
    if (labelLower.includes('bonus') || valueLower.includes('bonus')) return '⭐';
    if (labelLower.includes('try again') || valueLower.includes('try_again')) return '🔄';
    return '🎁';
}

// Render Spin Page UI (including Offers)
export function renderSpinPageUI() {
    const { currentRestaurant } = getState();
    if (!currentRestaurant || !elements.spinPageRemainingSpins || !elements.spinButtonElement) {
        console.warn("UI: Cannot render spin page UI - missing elements or restaurant context.");
        elements.spinOffersSection?.classList.add('hidden');
        return;
    }
    // Render remaining spins display
    const remainingSpins = getRemainingSpins(currentRestaurant.id);
    if (elements.spinPageRemainingSpins) {
        elements.spinPageRemainingSpins.textContent = `Spins left: ${remainingSpins}`;
        elements.spinPageRemainingSpins.classList.remove('hidden');
    }
    // Render Offers Section
    const offersContainer = elements.spinOffersContainer;
    const offersSection = elements.spinOffersSection;
    // Ensure config.offers from restaurant data is used if currentRestaurant.spinOffers isn't the source
    const offers = currentRestaurant.spinOffers || currentRestaurant.offers || [];

    if (offersContainer && offersSection) {
        offersContainer.innerHTML = '';
        if (offers.length > 0) {
            // Filter out internal values if needed, or just display labels
            const displayOffers = offers.filter(offer => typeof offer === 'string' || (offer.value !== 'TRY_AGAIN'));

            if (displayOffers.length > 0) {
                displayOffers.forEach(offerInput => {
                    const card = document.createElement('div');
                    card.className = 'offer-card';
                    // Handle both string offers and object offers
                    const isStringOffer = typeof offerInput === 'string';
                    const offer = isStringOffer ? { label: offerInput, value: offerInput } : offerInput;
                    const icon = getOfferIcon(offer);
                    card.innerHTML = `
                        <span class="offer-icon">${icon}</span>
                        <span class="offer-label">${offer.label}</span>
                    `;
                    offersContainer.appendChild(card);
                });
                offersSection.classList.remove('hidden');
            } else {
                offersSection.classList.add('hidden');
            }
        } else {
            offersSection.classList.add('hidden');
        }
    } else { console.warn("UI: Spin page offers container not found."); }

    // Update Spin Button State
    const spinButton = elements.spinButtonElement; // Now the external button
    if (spinButton) {
        const textSpan = spinButton.querySelector('span');
        if (remainingSpins <= 0) {
            if(textSpan) textSpan.textContent = 'No Spins Left';
            spinButton.setAttribute('disabled', 'true');
        } else {
            if (spinButton.hasAttribute('disabled')) spinButton.removeAttribute('disabled');
            // Only reset text if not currently spinning
            if (textSpan && !getState().isLoading) { // Check general loading instead? Or add spinning state?
                 textSpan.textContent = 'Spin Now';
            }
        }
    }
}


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
     let bonusMsg = null; // Logic to determine bonus message based on achieved_rewards
     if (claimApiResponse.achieved_rewards && claimApiResponse.achieved_rewards.length > 0) {
          const lastBonus = claimApiResponse.achieved_rewards[claimApiResponse.achieved_rewards.length - 1];
          bonusMsg = `🎉 Bonus: You also achieved "${lastBonus.reward}" (${lastBonus.type})!`;
     }
     if(bonusMsg) { elements.couponBonusMessage.textContent = bonusMsg; elements.couponBonusMessage.classList.remove('hidden'); }
     else { elements.couponBonusMessage.classList.add('hidden'); }
     elements.couponViewRewardsButton.onclick = () => window.location.hash = '#/dashboard';
     elements.couponSpinAgainButton.onclick = () => window.location.hash = `#/${restaurantId}/spin`;
}


// --- Dashboard Rendering Helpers ---

// Tab Click Handler
export function handleTabClick(event) {
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

// Creates HTML for a Claim History item
export function createClaimHistoryItemHTML(claim) {
    const item = document.createElement('div');
    item.className = 'history-item';
    const offer = claim?.offer ?? 'N/A';
    const code = claim?.coupon_code ?? 'N/A';
    const date = formatDate(claim?.claimed_at);
    const status = claim?.status ?? 'unknown';
    item.innerHTML = `
        <div class="history-offer-code">
            <span class="history-offer">${offer}</span>
            <span class="history-code">${code}</span>
        </div>
        <div class="history-status-date">
            <span class="history-status status-${status}">${status}</span>
            <span class="history-date">${date || ''}</span>
        </div>`;
    return item;
}

// Creates HTML for an Unlocked or Upcoming Reward goal item
export function createRewardGoalItemHTML(rewardName, points, type = 'unlocked') {
    const item = document.createElement('li');
    const icon = type === 'unlocked' ? '✓' : '⏳';
    const iconClass = type === 'unlocked' ? 'icon-success' : 'icon-upcoming';
    item.innerHTML = `
        <span class="icon ${iconClass}">${icon}</span>
        <span class="reward-name">${rewardName ?? 'Unknown Reward'}</span>
        <span class="reward-points">(${points} pts)</span>`;
    return item;
}

// Toggles visibility of reward history list
export function toggleRewardHistory(event) {
    const button = event.target;
    const targetId = button.getAttribute('data-target');
    const historyList = document.getElementById(targetId);
    if (!historyList) return;
    const isVisible = !historyList.classList.contains('hidden');
    if (isVisible) {
        historyList.style.maxHeight = historyList.scrollHeight + "px";
        requestAnimationFrame(() => {
            historyList.style.maxHeight = '0px'; historyList.style.opacity = '0'; historyList.style.marginTop = '0';
            button.textContent = button.textContent.replace('▲', '▼').replace('Hide', 'View'); });
        historyList.addEventListener('transitionend', () => { historyList.classList.add('hidden'); }, { once: true });
    } else {
        historyList.classList.remove('hidden');
        const scrollHeight = historyList.scrollHeight;
        historyList.style.maxHeight = '0px'; historyList.style.opacity = '0'; historyList.style.marginTop = '0';
        requestAnimationFrame(() => {
            historyList.style.maxHeight = scrollHeight + "px"; historyList.style.opacity = '1'; historyList.style.marginTop = '1rem';
            button.textContent = button.textContent.replace('▼', '▲').replace('View', 'Hide'); });
        historyList.addEventListener('transitionend', () => { if (!historyList.classList.contains('hidden')) historyList.style.maxHeight = ''; }, { once: true });
    }
}

// --- Render Global Spin Points Timeline ---
export function renderGlobalTimeline(currentUserPoints) {
    const timelineSection = elements.dashboardGlobalTimeline;
    const timelineContainer = timelineSection?.querySelector('.timeline-container');
    if (!timelineContainer) { console.warn("UI: Global timeline container not found."); timelineSection?.classList.add('hidden'); return; }

    timelineContainer.innerHTML = ''; // Clear previous
    const milestones = GLOBAL_SPIN_MILESTONES.sort((a, b) => a.points - b.points);
    if (milestones.length === 0) { timelineSection?.classList.add('hidden'); return; }
    const lastMilestonePoints = milestones[milestones.length - 1].points;
    const maxPoints = Math.max(lastMilestonePoints, currentUserPoints || 0) * 1.15;
    if (maxPoints <= 0) { timelineContainer.innerHTML = '<p class="info-message">Spin to start your journey!</p>'; timelineSection.classList.remove('hidden'); return; }

    const progressPercent = Math.min(100, Math.max(0, (currentUserPoints / maxPoints) * 100));
    const progressBar = document.createElement('div'); progressBar.className = 'timeline-progress'; progressBar.style.width = `${progressPercent}%`; timelineContainer.appendChild(progressBar);
    const userMarker = document.createElement('div'); userMarker.className = 'user-position-marker'; userMarker.style.left = `${progressPercent}%`; timelineContainer.appendChild(userMarker);
    const milestonesWrapper = document.createElement('div'); milestonesWrapper.className = 'timeline-milestones';
    let nextMilestoneFound = false;
    milestones.forEach(milestone => {
        const milestoneEl = document.createElement('div'); milestoneEl.className = 'milestone';
        const isAchieved = currentUserPoints >= milestone.points; let isNext = false;
        if (!isAchieved && !nextMilestoneFound) { isNext = true; nextMilestoneFound = true; }
        milestoneEl.classList.toggle('achieved', isAchieved); milestoneEl.classList.toggle('next', isNext);
        milestoneEl.innerHTML = `<div class="milestone-marker"></div><div class="milestone-points">${milestone.points} pts</div><div class="milestone-reward">${milestone.icon ? `<span class="milestone-icon">${milestone.icon}</span>` : ''}${milestone.reward}</div>`;
        milestonesWrapper.appendChild(milestoneEl);
    });
    timelineContainer.appendChild(milestonesWrapper);
    timelineSection.classList.remove('hidden');
}


// *** Render Dashboard (Main Function - Using Corrected API Structure) ***
export function renderDashboard(dashboardApiResponse) {
    // --- Basic Element Checks & Get State ---
    if (!elements.dashboardProfileSection || !elements.dashboardSummary || !elements.dashboardTabsContainer || !elements.dashboardTabContentContainer || !elements.dashboardNoData || !elements.dashboardGlobalTimeline) {
        console.error("UI: Essential dashboard elements missing, cannot render."); showPage('page-not-found'); return;
    }
    const { isAuthenticated, userProfile } = getState();
    const currentUser = getCurrentFirebaseUser();

    // --- Render Profile Section ---
    if (isAuthenticated && currentUser && elements.dashboardWelcome && elements.dashboardEmail && elements.dashboardPhone) { /* ... Render profile as before ... */ }
    else { elements.dashboardProfileSection.classList.add('hidden'); }

    // --- Get Containers ---
    const summaryContainer = elements.dashboardSummary;
    const globalTimelineSection = elements.dashboardGlobalTimeline;
    const tabsContainer = elements.dashboardTabsContainer;
    const contentContainer = elements.dashboardTabContentContainer;
    const noDataElement = elements.dashboardNoData;
    const restaurantHeader = document.getElementById('dashboard-restaurant-header');

    // --- Clear Previous Content / Hide Sections ---
    summaryContainer.innerHTML = ''; tabsContainer.innerHTML = ''; contentContainer.innerHTML = '';
    noDataElement.classList.add('hidden'); summaryContainer.classList.add('hidden');
    globalTimelineSection?.classList.add('hidden');
    const timelineContainer = globalTimelineSection?.querySelector('.timeline-container');
    if(timelineContainer) timelineContainer.innerHTML = '';
    tabsContainer.classList.add('hidden'); contentContainer.classList.add('hidden');
    restaurantHeader?.classList.add('hidden');

    // --- Check for Valid Data ---
    if (!dashboardApiResponse || dashboardApiResponse.status !== 'success' || !dashboardApiResponse.dashboard) {
        console.warn("UI: Invalid or unsuccessful dashboard API response.", dashboardApiResponse);
        noDataElement.textContent = dashboardApiResponse?.detail || "Could not load dashboard data.";
        noDataElement.classList.remove('hidden'); contentContainer.classList.remove('hidden'); return;
    }

    const dashboard = dashboardApiResponse.dashboard;
    const restaurantIds = Object.keys(dashboard);

    // --- Calculate and Render Overall Summary ---
    let calculatedTotalSpinPoints = 0;
    restaurantIds.forEach(id => { const info = dashboard[id]?.restaurant_info; const history = dashboard[id]?.user_data?.claim_history; if (info && history) calculatedTotalSpinPoints += (history.length * (info.spin_points_per_spin ?? 10)); });
    summaryContainer.innerHTML = `<span>Total Spin Points (Est.): <strong>${calculatedTotalSpinPoints}</strong></span>`; // Removed Tier/Punches for now
    summaryContainer.classList.remove('hidden');

    // --- Render Global Timeline ---
    renderGlobalTimeline(calculatedTotalSpinPoints);

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
            const restaurant_info = data?.restaurant_info || {};
            const user_data = data?.user_data || {};
            const claim_history = user_data?.claim_history || [];
            const loyalty_settings = restaurant_info?.loyalty_settings?.current?.reward_thresholds || {};
            const spin_thresholds_obj = loyalty_settings.spin_points || {};
            const spin_points_per_spin = restaurant_info?.spin_points_per_spin ?? 10;
            const current_spin_points = claim_history.length * spin_points_per_spin;

            // Create Tab Button
            const tabButton = document.createElement('button'); tabButton.className = 'dashboard-tab'; tabButton.textContent = name;
            const tabContentId = `tab-content-${id}`; tabButton.setAttribute('data-tab-target', tabContentId);
            if (index === 0) tabButton.classList.add('active'); tabButton.onclick = handleTabClick; tabsContainer.appendChild(tabButton);

            // Create Tab Content Pane
            const contentPane = document.createElement('div'); contentPane.className = 'dashboard-tab-content'; contentPane.id = tabContentId;
            if (index === 0) contentPane.classList.add('active');

            // --- Populate Content Pane ---
            // Card for all content for this restaurant
            const detailsCard = document.createElement('div'); detailsCard.className = 'restaurant-details-card';

            // 1. Spin Points Summary
            const pointsSection = document.createElement('div'); pointsSection.className = 'tab-section-card spin-points-summary';
            pointsSection.innerHTML = `<h4>Spin Points</h4><p>Earned Here: <strong>${current_spin_points}</strong></p>`;
            detailsCard.appendChild(pointsSection);

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
    const dashboardPageActive = document.getElementById('page-dashboard')?.classList.contains('active');

    // Update header if relevant state changes
    if (changedState.hasOwnProperty('isAuthenticated') || changedState.hasOwnProperty('currentRestaurant') || changedState.hasOwnProperty('firebaseUser') || changedState.hasOwnProperty('userProfile') ) {
        updateHeaderUI();
    }
    // Update spin page UI if relevant state changes AND page is active
    if (document.getElementById('page-spin')?.classList.contains('active') &&
       (changedState.hasOwnProperty('dailySpinsUpdated') || changedState.hasOwnProperty('currentRestaurant'))) {
        renderSpinPageUI();
    }

    // Update dashboard profile section only if profile changed AND page is active
    if (dashboardPageActive && changedState.hasOwnProperty('userProfile')) {
        const currentUser = getCurrentFirebaseUser();
        const currentProfile = changedState.userProfile;
         if (currentUser && elements.dashboardProfileSection && elements.dashboardWelcome && elements.dashboardEmail && elements.dashboardPhone) {
            elements.dashboardWelcome.textContent = `Welcome, ${currentProfile?.name || currentUser.displayName || currentUser.email}!`;
            elements.dashboardEmail.textContent = currentUser.email || 'N/A';
            elements.dashboardPhone.textContent = currentProfile?.whatsapp || 'Not Provided';
         }
    }

     // Re-render the *entire* dashboard content if new dashboard data arrives
     // Avoid re-render just for profile change if handled above
     if (dashboardPageActive && changedState.hasOwnProperty('dashboardData') && !changedState.hasOwnProperty('userProfile')) {
          console.log("UI: Re-rendering dashboard content due to new dashboardData state.");
          renderDashboard(changedState.dashboardData);
     }
});