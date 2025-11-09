import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';

export type MapApp = 'apple' | 'google' | 'waze' | 'default';

const MAP_APP_PREFERENCE_KEY = '@rving_with_bikes:map_app_preference';

export async function getMapAppPreference(): Promise<MapApp | null> {
  try {
    const value = await AsyncStorage.getItem(MAP_APP_PREFERENCE_KEY);
    return value as MapApp | null;
  } catch (error) {
    console.error('Error getting map app preference:', error);
    return null;
  }
}

export async function setMapAppPreference(app: MapApp): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_APP_PREFERENCE_KEY, app);
  } catch (error) {
    console.error('Error setting map app preference:', error);
  }
}

export function getMapAppUrl(
  app: MapApp,
  type: 'directions' | 'search',
  params: {
    latitude?: number;
    longitude?: number;
    query?: string;
  }
): string {
  const { latitude, longitude, query } = params;

  if (app === 'default') {
    // Use platform default
    if (Platform.OS === 'ios') {
      app = 'apple';
    } else {
      app = 'google';
    }
  }

  if (type === 'directions' && latitude !== undefined && longitude !== undefined) {
    // Directions URLs
    switch (app) {
      case 'apple':
        return `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
      case 'google':
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      case 'waze':
        return `waze://?navigate=yes&ll=${latitude},${longitude}`;
      default:
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
  } else if (type === 'search' && query) {
    // Search URLs
    const encodedQuery = encodeURIComponent(query);
    switch (app) {
      case 'apple':
        return `http://maps.apple.com/?q=${encodedQuery}`;
      case 'google':
        return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
      case 'waze':
        return `waze://?q=${encodedQuery}`;
      default:
        return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    }
  }

  // Fallback
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || '')}`;
}

export function getMapAppName(app: MapApp): string {
  switch (app) {
    case 'apple':
      return 'Apple Maps';
    case 'google':
      return 'Google Maps';
    case 'waze':
      return 'Waze';
    case 'default':
      return Platform.OS === 'ios' ? 'Apple Maps (Default)' : 'Google Maps (Default)';
  }
}

export function getAvailableMapApps(): Array<{ value: MapApp; label: string }> {
  const apps: Array<{ value: MapApp; label: string }> = [
    { value: 'default', label: getMapAppName('default') },
    { value: 'google', label: 'Google Maps' },
  ];

  if (Platform.OS === 'ios') {
    apps.push({ value: 'apple', label: 'Apple Maps' });
  }

  apps.push({ value: 'waze', label: 'Waze' });

  return apps;
}

