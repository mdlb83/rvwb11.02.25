import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@rving_with_bikes:first_launch';

/**
 * Check if this is the first launch of the app
 */
export async function isFirstLaunch(): Promise<boolean> {
  try {
    const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    return hasLaunched === null;
  } catch (error) {
    console.error('Error checking first launch:', error);
    // If we can't check, assume it's not first launch to avoid blocking
    return false;
  }
}

/**
 * Mark that the app has been launched (call after first launch)
 */
export async function setHasLaunched(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
  } catch (error) {
    console.error('Error setting has launched flag:', error);
  }
}

