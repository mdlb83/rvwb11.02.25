// RevenueCat API Key
// Load from environment variables for production, fallback to test key for development
import Constants from 'expo-constants';

// Detect if running in Expo Go
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Test mode flag - set to true to simulate premium subscription in Expo Go (for UI testing only)
export const EXPO_GO_TEST_MODE = isExpoGo && __DEV__;

// Test API key (for sandbox/testing)
const TEST_API_KEY = 'test_yaRuLvxTUeNPPARrILZCqxOERQJ';

// Get production API key from environment variable or expo config extra
// Set REVENUECAT_API_KEY in your .env file or EAS Secrets for preview/production builds
const PRODUCTION_API_KEY = process.env.REVENUECAT_API_KEY || Constants.expoConfig?.extra?.revenuecatApiKey || '';

// Determine which API key to use:
// - Always use test key in Expo Go (RevenueCat doesn't work in Expo Go anyway)
// - Preview and production builds MUST use production API key (set via EAS Secrets)
// - Development builds can fallback to test key if production key not available
export const REVENUECAT_API_KEY = 
  isExpoGo
    ? TEST_API_KEY // Always use test key in Expo Go
    : (PRODUCTION_API_KEY || TEST_API_KEY); // Use production key if available, otherwise test key

// Warn if production key is missing in non-Expo Go builds (preview/production should have it)
if (!isExpoGo && !PRODUCTION_API_KEY) {
  console.warn('⚠️ WARNING: Production RevenueCat API key not found. Preview and production builds require REVENUECAT_API_KEY to be set in EAS Secrets.');
}

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

