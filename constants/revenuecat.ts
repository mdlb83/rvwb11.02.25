// RevenueCat API Key
// Load from environment variables for production, fallback to test key for development
import Constants from 'expo-constants';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Test API key (for sandbox/testing)
const TEST_API_KEY = 'test_yaRuLvxTUeNPPARrILZCqxOERQJ';

// Get production API key from environment variable or expo config extra
// Set REVENUECAT_API_KEY in your .env file or EAS Secrets for preview/production builds
const PRODUCTION_API_KEY = process.env.REVENUECAT_API_KEY || Constants.expoConfig?.extra?.revenuecatApiKey || '';

// Determine which API key to use:
// - Always use test key in Expo Go (RevenueCat doesn't work in Expo Go anyway)
// - Use production key if available (for preview/production builds)
// - Fallback to test key for development builds
export const REVENUECAT_API_KEY = 
  isExpoGo
    ? TEST_API_KEY // Always use test key in Expo Go
    : (PRODUCTION_API_KEY || TEST_API_KEY); // Use production key if available, otherwise test key

// Determine if we're using test store
export const USE_TEST_STORE = REVENUECAT_API_KEY.startsWith('test_');

// Log which mode we're using
console.log('RevenueCat Configuration:', {
  useTestStore: USE_TEST_STORE,
  apiKeyPrefix: REVENUECAT_API_KEY.substring(0, 10) + '...',
  isExpoGo,
  hasProductionKey: !!PRODUCTION_API_KEY
});

// Entitlement ID (matches what you set up in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'premium';

// Product identifiers (must match App Store Connect / Google Play Console)
// Format: bundleId.productId
export const PRODUCT_IDS = {
  YEARLY: 'com.rvingwithbikes.app.yearly',
  LIFETIME: 'com.rvingwithbikes.app.lifetime',
} as const;

