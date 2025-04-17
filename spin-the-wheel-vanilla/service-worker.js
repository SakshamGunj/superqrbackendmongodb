// service-worker.js

console.log('Service Worker: Loading...');

// Listener for the 'push' event triggered by the push server
self.addEventListener('push', event => {
    console.log('Service Worker: Push event received.');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json(); // Assuming server sends JSON payload
        } catch (e) {
            console.error('Service Worker: Error parsing push data:', e);
            data = { title: 'New Notification', message: event.data.text() }; // Fallback
        }
    } else {
        console.log('Service Worker: Push event had no data.');
        // You might have predefined notifications based on the push itself
        data = { title: 'Update', message: 'Something new happened!' };
    }


    const title = data.title || 'Spin & Win Update';
    const options = {
        body: data.message || 'Check the app for details.',
        icon: data.icon || '/assets/icons/icon-192x192.png', // Provide an icon path
        badge: data.badge || '/assets/icons/badge-72x72.png', // Small badge icon
        tag: data.tag || 'general-notification', // Optional tag
        data: data.url || '/', // Optional: URL to open on click
        actions: data.actions || [] // Optional: Buttons like [{action: 'explore', title: 'Open App'}]
        // Add other options as needed: image, renotify, silent, etc.
    };

    console.log(`Service Worker: Showing notification - Title: ${title}, Options:`, options);

    // Keep the service worker alive until the notification is shown
    const notificationPromise = self.registration.showNotification(title, options);
    event.waitUntil(notificationPromise);
});

// Listener for notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked.');
    const notification = event.notification;
    const action = event.action; // Identifier for clicked action button (if any)
    const notificationData = notification.data; // Data passed in options

    notification.close(); // Close the notification

    // Example action: Open the app or a specific URL
    const urlToOpen = notificationData || '/'; // Default to root if no URL provided

    if (action === 'close') {
         // If you add a 'close' action button
        console.log('Service Worker: Close action clicked.');
    } else {
        console.log(`Service Worker: Opening URL: ${urlToOpen}`);
         // This attempts to focus an existing window/tab or open a new one
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                // Check if a window/tab matching the URL is already open
                const matchingClient = windowClients.find(wc => wc.url === urlToOpen);
                if (matchingClient) {
                    console.log('Service Worker: Found matching client, focusing.');
                    return matchingClient.focus();
                } else {
                    console.log('Service Worker: No matching client, opening new window.');
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Optional: Add install, activate, fetch event listeners if needed
self.addEventListener('install', event => {
    console.log('Service Worker: Installed.');
    // event.waitUntil(self.skipWaiting()); // Activate immediately (optional)
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activated.');
    // event.waitUntil(self.clients.claim()); // Take control immediately (optional)
});