// RevenueCat API Key
// Load from environment variables for production, fallback to test key for development
import Constants from 'expo-constants';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// TEST MODE: Set to true to force test API key and sandbox store
// When true, uses test API key regardless of environment variables
export const USE_TEST_STORE = true; // Set to false for production

// Test API key (for sandbox/testing)
const TEST_API_KEY = 'test_yaRuLvxTUeNPPARrILZCqxOERQJ';

// Get API key from environment variable (set in .env file) or expo config extra
// For production builds, set REVENUECAT_API_KEY in your .env file
// For Expo Go, always use test key (RevenueCat doesn't work in Expo Go anyway, but this prevents errors)
// For development builds, you can use the test key as fallback
export const REVENUECAT_API_KEY = 
  USE_TEST_STORE || isExpoGo
    ? TEST_API_KEY // Force test key when USE_TEST_STORE is true or in Expo Go
    : (process.env.REVENUECAT_API_KEY || 
       Constants.expoConfig?.extra?.revenuecatApiKey || 
       TEST_API_KEY); // Fallback to test key for development

// Log which mode we're using
console.log('RevenueCat Configuration:', {
  useTestStore: USE_TEST_STORE || isExpoGo,
  apiKeyPrefix: REVENUECAT_API_KEY.substring(0, 10) + '...',
  isExpoGo
});

// Entitlement ID (matches what you set up in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'premium';

// Product identifiers (must match App Store Connect / Google Play Console)
// Format: bundleId.productId
export const PRODUCT_IDS = {
  YEARLY: 'com.rvingwithbikes.app.yearly',
  LIFETIME: 'com.rvingwithbikes.app.lifetime',
} as const;

