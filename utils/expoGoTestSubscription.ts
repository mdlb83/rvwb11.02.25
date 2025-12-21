import AsyncStorage from '@react-native-async-storage/async-storage';
import { isExpoGo } from '../constants/revenuecat';

const EXPO_GO_TEST_SUBSCRIPTION_KEY = '@rving_with_bikes:expo_go_test_subscription';

/**
 * Get the test subscription status for Expo Go
 * Only works in Expo Go, returns false for production builds
 */
export async function getExpoGoTestSubscription(): Promise<boolean> {
  if (!isExpoGo) {
    return false; // Not in Expo Go, return false
  }
  
  try {
    const value = await AsyncStorage.getItem(EXPO_GO_TEST_SUBSCRIPTION_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error getting Expo Go test subscription:', error);
    return false;
  }
}

/**
 * Set the test subscription status for Expo Go
 * Only works in Expo Go, does nothing in production builds
 */
export async function setExpoGoTestSubscription(isPremium: boolean): Promise<void> {
  if (!isExpoGo) {
    console.warn('setExpoGoTestSubscription: Not in Expo Go, ignoring');
    return;
  }
  
  try {
    await AsyncStorage.setItem(EXPO_GO_TEST_SUBSCRIPTION_KEY, isPremium ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting Expo Go test subscription:', error);
  }
}

