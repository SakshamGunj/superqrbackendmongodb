// js/api.js

// IMPORTANT: Replace with your actual backend API base URL
const API_BASE_URL = 'http://localhost:8000'; // Or https://api.tenversemedia.com

/**
 * Helper function for making authenticated API requests.
 * Handles adding the Authorization header and basic error checking.
 */
async function fetchWithAuth(url, token, options = {}) {
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
    };

    // Add Content-Type if body exists and not already set
    if (options.body && !headers['Content-Type']) {
        // Defaulting to JSON here, adjust if needed (like for claim)
        // headers['Content-Type'] = 'application/json';
    }

    console.log(`API: Requesting ${options.method || 'GET'} ${url}`);
    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorDetail = `HTTP error! status: ${response.status}`;
            try {
                // Try to parse backend error message
                const errorJson = await response.json();
                errorDetail = errorJson.detail || JSON.stringify(errorJson);
                console.error(`API Error Response Body: ${errorDetail}`);
            } catch (e) {
                // If parsing fails, use status text
                 errorDetail = `${response.status} ${response.statusText}`;
                 console.error(`API Error Response: ${errorDetail}`);
            }
            throw new Error(errorDetail);
        }

        // Check if response has content before trying to parse JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json(); // Parse JSON response
        } else {
            return await response.text(); // Return text for non-JSON responses if needed
        }
    } catch (error) {
        console.error(`API Fetch Error (${url}):`, error);
        // Re-throw the specific error message captured above or the generic fetch error
        throw new Error(error.message || 'Network request failed');
    }
}

/**
 * Claims a reward via the backend API.
 * Uses 'application/x-www-form-urlencoded' as specified.
 */
export async function claimReward(token, claimData) {
    const url = `${API_BASE_URL}/api/claim-reward?restaurant_id=${claimData.restaurantId}`;

    // Encode data as x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('name', claimData.name); // Assuming name comes from Firebase user or form
    formData.append('whatsapp', claimData.whatsapp); // Needs to be collected
    formData.append('reward', claimData.reward); // The description/value of the won reward
    if (claimData.email) {
        formData.append('email', claimData.email);
    }
    // Add spend_amount if available, otherwise backend default (0) should apply
    if (typeof claimData.spendAmount === 'number') {
        formData.append('spend_amount', claimData.spendAmount.toString());
    }

    const options = {
        method: 'POST',
        headers: {
            // Let fetchWithAuth add Authorization
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    };

    return await fetchWithAuth(url, token, options);
}

/**
 * Fetches the user's dashboard data from the backend API.
 */
export async function fetchDashboardData(token) {
    const url = `${API_BASE_URL}/api/user-dashboard`;
    return await fetchWithAuth(url, token); // GET request by default
}