// Server URL configuration
// For development: use your local IP or localhost
// For production: use your deployed server URL
//
// When deploying to a cloud service (Railway, Render, Fly.io, etc.),
// update PRODUCTION_SERVER_URL with your actual server URL.

const DEV_SERVER_URL = 'http://localhost:3000';
const PRODUCTION_SERVER_URL = 'https://country-city-server.up.railway.app'; // Update with your actual URL

const isDev = __DEV__;

export const CONFIG = {
  SERVER_URL: isDev ? DEV_SERVER_URL : PRODUCTION_SERVER_URL,
  API_BASE_URL: isDev ? DEV_SERVER_URL : PRODUCTION_SERVER_URL,

  // Ad unit IDs (using test IDs for development)
  ADS: {
    BANNER_ID: isDev
      ? 'ca-app-pub-3940256099942544/6300978111' // Test banner
      : 'ca-app-pub-XXXX/XXXX', // Replace with production banner ID
    INTERSTITIAL_ID: isDev
      ? 'ca-app-pub-3940256099942544/1033173712' // Test interstitial
      : 'ca-app-pub-XXXX/XXXX', // Replace with production interstitial ID
  },

  // In-app purchase
  IAP: {
    REMOVE_ADS_PRODUCT_ID: 'remove_ads_forever',
    REMOVE_ADS_PRICE: '$9.99',
  },
} as const;
