// js/location.js

let isRequestingLocation = false;

export function requestLocation() {
    if (!("geolocation" in navigator)) {
        console.log("Location: Geolocation is not supported by this browser.");
        return;
    }
    if (isRequestingLocation) {
         console.log("Location: Request already in progress.");
         return;
    }

    isRequestingLocation = true;
    console.log("Location: Requesting permission...");

    const options = {
        enableHighAccuracy: false, // Lower accuracy is often faster and uses less power
        timeout: 10000, // Time (ms) before erroring out
        maximumAge: 0 // Don't use a cached position
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            isRequestingLocation = false;
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log("Location: Permission granted and position obtained:");
            console.log(`  Latitude: ${lat}`);
            console.log(`  Longitude: ${lon}`);
            console.log(`  Accuracy: ${position.coords.accuracy} meters`);
            // TODO: Send this location data to your backend or use it client-side
        },
        (error) => {
            isRequestingLocation = false;
            console.error("Location: Error getting position:", error.message);
            // Handle different errors (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    console.warn("Location: User denied the request for Geolocation.");
                    // Maybe update UI to explain why location is useful
                    break;
                case error.POSITION_UNAVAILABLE:
                    console.warn("Location: Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    console.warn("Location: The request to get user location timed out.");
                    break;
                default:
                     console.warn("Location: An unknown error occurred.");
                     break;
            }
        },
        options
    );
}

/**
 * Regarding your question: Is it possible to access the user’s location
 * without asking for permission?
 *
 * NO. Absolutely not for web browsers. Accessing geolocation data requires
 * explicit user consent via the permission prompt for privacy reasons.
 * Any attempt to bypass this would be blocked by the browser and is
 * considered unethical. Always request permission.
 */