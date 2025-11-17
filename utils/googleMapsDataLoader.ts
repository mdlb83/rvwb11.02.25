import { GoogleMapsData, GoogleMapsDataDatabase } from '../types/googleMapsData';
import { CampgroundEntry } from '../types/campground';
import { generateCampgroundIdFromEntry } from './dataLoader';

let cachedGoogleMapsData: GoogleMapsDataDatabase | null = null;

/**
 * Load Google Maps data from JSON file
 */
export async function loadGoogleMapsData(): Promise<GoogleMapsDataDatabase> {
  if (cachedGoogleMapsData) {
    return cachedGoogleMapsData;
  }

  try {
    // In Expo, use require for bundled JSON files
    const data = require('../data/google-maps-data.json') as GoogleMapsDataDatabase;
    cachedGoogleMapsData = data;
    return data;
  } catch (error) {
    console.error('Error loading Google Maps data:', error);
    // Return empty structure if file doesn't exist
    return {
      entries: {},
      metadata: {
        syncVersion: '1.0.0'
      }
    };
  }
}

/**
 * Get Google Maps data for a specific campground
 */
export async function getGoogleMapsData(campgroundId: string): Promise<GoogleMapsData | undefined> {
  const data = await loadGoogleMapsData();
  return data.entries[campgroundId];
}

/**
 * Get Google Maps data for a campground entry
 */
export async function getGoogleMapsDataForEntry(entry: CampgroundEntry): Promise<GoogleMapsData | undefined> {
  const campgroundId = generateCampgroundIdFromEntry(entry);
  return getGoogleMapsData(campgroundId);
}

/**
 * Merge campground entry with Google Maps data
 * Returns a new object with combined data
 */
export function mergeCampgroundWithGoogleMaps(
  entry: CampgroundEntry,
  googleData?: GoogleMapsData
): CampgroundEntry & { googleMapsData?: GoogleMapsData } {
  return {
    ...entry,
    googleMapsData
  };
}

/**
 * Clear the cache (useful after syncing new data)
 */
export function clearGoogleMapsDataCache(): void {
  cachedGoogleMapsData = null;
}

