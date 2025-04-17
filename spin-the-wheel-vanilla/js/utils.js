// js/utils.js
export const generateCouponCode = (restaurantId) => {
    const prefix = restaurantId.substring(0, 4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${randomPart}`;
  };
  
  // Helper to format date (adjust locale/options as needed)
  export const formatDate = (isoTimestamp) => {
      if (!isoTimestamp) return '';
      try {
          return new Date(isoTimestamp).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
          });
      } catch (e) {
          console.error("Error formatting date:", e);
          return 'Invalid Date';
      }
  };