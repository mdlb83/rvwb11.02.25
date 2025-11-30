// RevenueCat API Key
// Load from environment variables for production, fallback to test key for development
import Constants from 'expo-constants';

// Detect if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Get API key from environment variable (set in .env file) or expo config extra
// For production builds, set REVENUECAT_API_KEY in your .env file
// For Expo Go, always use test key (RevenueCat doesn't work in Expo Go anyway, but this prevents errors)
// For development builds, you can use the test key as fallback
export const REVENUECAT_API_KEY = 
  isExpoGo 
    ? 'test_yaRuLvxTUeNPPARrILZCqxOERQJ' // Always use test key in Expo Go
    : (process.env.REVENUECAT_API_KEY || 
       Constants.expoConfig?.extra?.revenuecatApiKey || 
       'test_yaRuLvxTUeNPPARrILZCqxOERQJ'); // Fallback to test key for development

// Entitlement ID (matches what you set up in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'premium';

// Product identifiers (must match App Store Connect / Google Play Console)
// Format: bundleId.productId
export const PRODUCT_IDS = {
  YEARLY: 'com.rvingwithbikes.app.yearly',
  LIFETIME: 'com.rvingwithbikes.app.lifetime',
} as const;

