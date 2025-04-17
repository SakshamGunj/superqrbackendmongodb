// js/notifications.js

// *** FIX: Replace with your actual VAPID PUBLIC key from .env ***
const VAPID_PUBLIC_KEY = 'BMTGAuVIAPwwK0XsN3f2Hkki4VF1oXbbKb9Vao--cVgFhASgoltvDCuszHZ4vqz4KpRut5tEjkO7qI47FbVjWJM';

let notificationConfig = { conditions: [], alreadyShownTags: [] };
let permissionGranted = Notification.permission === 'granted'; // Check initial permission

// Function to convert VAPID key for the Push API
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    // The replace calls are essential for URL-safe variant
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Subscribe user to push notifications
async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator)) return null;

    try {
        const registration = await navigator.serviceWorker.ready; // Wait for SW to be active
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
            console.log('Notifications: User is already subscribed:', existingSubscription);
            return existingSubscription;
        }

        // Subscribe user
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Required - means notifications must be shown
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) // Your VAPID public key
        });

        console.log('Notifications: User subscribed successfully:', subscription);
        return subscription;

    } catch (error) {
        console.error('Notifications: Failed to subscribe user:', error);
        if (Notification.permission === 'denied') {
            console.warn('Notifications: Subscription failed because permission was denied.');
            // Maybe update UI to guide user to re-enable permissions in browser settings
        }
        return null;
    }
}

// *** FIX: Implement sending to backend ***
async function sendSubscriptionToServer(subscription) {
    if (!subscription) return;

    // ** Make sure your backend server is running and accessible **
    const backendUrl = 'http://localhost:8000/api/subscribe'; // Adjust port if needed

    console.log(`Notifications: Sending subscription to backend at ${backendUrl}...`);

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            body: JSON.stringify(subscription), // Browser PushSubscription is already JSON-serializable
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Try to get error message from backend response body
            let errorBody = 'Unknown server error';
            try {
                 errorBody = await response.text(); // or response.json() if backend sends JSON errors
            } catch (e) {/* ignore */}
            throw new Error(`Server error: ${response.status} - ${errorBody}`);
        }

        const result = await response.json(); // Expecting { message: "..." }
        console.log("Notifications: Subscription sent successfully.", result);

    } catch (error) {
        console.error("Notifications: Failed to send subscription to server:", error);
        // Optional: Show UI error to user? Retry logic?
    }
}

// Load notification conditions from JSON
async function loadNotificationConfig() {
    try {
        const response = await fetch('./notifications.json'); // Relative to index.html
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        notificationConfig = await response.json();
        console.log("Notifications: Config loaded", notificationConfig);
        // Optional: Load alreadyShownTags from localStorage if you want persistence across sessions
        // notificationConfig.alreadyShownTags = JSON.parse(localStorage.getItem('spinAppShownNotifications') || '[]');

    } catch (error) {
        console.error("Notifications: Failed to load config:", error);
        notificationConfig = { conditions: [], alreadyShownTags: [] }; // Use default on error
    }
}

// Request Permission and Subscribe
export async function requestNotificationPermission() {
    if (permissionGranted) {
        console.log("Notifications: Permission already granted. Checking subscription...");
        const sub = await subscribeUserToPush();
        if (sub) await sendSubscriptionToServer(sub); // Send if already permitted but not subscribed/sent
        return true;
    }
    if (!("Notification" in window)) {
        console.log("Notifications: This browser does not support desktop notification");
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        permissionGranted = permission === 'granted';
        if (permissionGranted) {
            console.log("Notifications: Permission granted by user. Subscribing...");
            const subscription = await subscribeUserToPush(); // Subscribe now
            if (subscription) {
                await sendSubscriptionToServer(subscription); // Send to backend
            }
        } else {
            console.log("Notifications: Permission denied by user.");
        }
        return permissionGranted;
    } catch (error) {
        console.error("Notifications: Error requesting permission:", error);
        return false;
    }
}

// Show a notification
function showNotification(title, message, tag = undefined) {
    if (!permissionGranted) {
        console.log("Notifications: Cannot show notification, permission not granted.");
        return;
    }

    const options = {
        body: message,
        // icon: '/path/to/icon.png', // Optional icon
        tag: tag, // Optional: Tag to prevent multiple identical notifications
        renotify: !!tag, // Optional: If tag exists, renotify even if previous one is visible
    };

    try {
        // Ensure service worker is ready if needed for more complex notifications (not required for basic ones)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
                console.log(`Notifications: Shown notification with tag '${tag}' via ServiceWorker`);
            });
        } else {
            // Fallback for browsers without active SW controller or simple cases
            const notification = new Notification(title, options);
            console.log(`Notifications: Shown notification with tag '${tag}' via Notification API`);
            // Optional: Handle click/close events on 'notification' object
            notification.onclick = () => {
                console.log(`Notification clicked: ${tag}`);
                // Example: Focus the window/tab
                window.parent.focus();
                notification.close();
            };
        }

    } catch (error) {
        console.error("Notifications: Error showing notification:", error);
    }
}

// Check conditions and request notification display
export function checkAndRequestNotifications(currentPoints) {
    if (!permissionGranted) {
        console.log("Notifications: Check skipped, permission denied.");
        // Maybe prompt user for permission here if desired?
        // requestNotificationPermission();
        return;
    }
    if (notificationConfig.conditions.length === 0) {
        console.log("Notifications: No conditions loaded to check.");
        return; // No conditions loaded
    }

    console.log(`Notifications: Checking conditions for points: ${currentPoints}`);

    notificationConfig.conditions.forEach(condition => {
        // Check if this tag was already shown (optional persistence)
        if (notificationConfig.alreadyShownTags.includes(condition.tag)) {
            // console.log(`Notifications: Skipping already shown tag: ${condition.tag}`);
            return; // Skip if already shown in this session/storage
        }

        let trigger = false;
        if (condition.type === 'spin_points') {
            if (currentPoints >= condition.threshold) {
                trigger = true;
            }
        }
        // Add other condition types ('loyalty_bonus_earned', etc.) later

        if (trigger) {
            console.log(`Notifications: Condition met for tag: ${condition.tag}`);
            const message = condition.message.replace('{points}', currentPoints); // Replace placeholder
            showNotification(condition.title, message, condition.tag);
            // Mark as shown for this session/storage
            notificationConfig.alreadyShownTags.push(condition.tag);
            // Optional: Save alreadyShownTags to localStorage
            // localStorage.setItem('spinAppShownNotifications', JSON.stringify(notificationConfig.alreadyShownTags));
        }
    });
}

// Load config on script initialization
loadNotificationConfig();