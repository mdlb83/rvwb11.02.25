// RevenueCat API Key
// Load from environment variables for production, fallback to test key for development
import Constants from 'expo-constants';

// Get API key from environment variable (set in .env file) or expo config extra
// For production builds, set REVENUECAT_API_KEY in your .env file
// For development, you can use the test key as fallback
export const REVENUECAT_API_KEY = 
  process.env.REVENUECAT_API_KEY || 
  Constants.expoConfig?.extra?.revenuecatApiKey || 
  'test_yaRuLvxTUeNPPARrILZCqxOERQJ'; // Fallback to test key for development

// Entitlement ID (matches what you set up in RevenueCat dashboard)
export const ENTITLEMENT_ID = 'premium';

// Product identifiers (must match App Store Connect / Google Play Console)
// Format: bundleId.productId
export const PRODUCT_IDS = {
  YEARLY: 'com.rvingwithbikes.app.yearly',
  LIFETIME: 'com.rvingwithbikes.app.lifetime',
} as const;

