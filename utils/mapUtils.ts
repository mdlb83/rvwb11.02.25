import { CampgroundEntry } from '../types/campground';

/**
 * Extracts coordinates from campground entries for use with fitToCoordinates
 */
export function getCampgroundCoordinates(campgrounds: CampgroundEntry[]): Array<{ latitude: number; longitude: number }> {
  if (!Array.isArray(campgrounds)) {
    return [];
  }
  
  try {
    return campgrounds
      .filter((campground) => 
        campground &&
        campground.campground && 
        typeof campground.latitude === 'number' &&
        typeof campground.longitude === 'number' &&
        !isNaN(campground.latitude) &&
        !isNaN(campground.longitude)
      )
      .map((campground) => ({
        latitude: campground.latitude,
        longitude: campground.longitude,
      }));
  } catch (err) {
    console.error('Error getting campground coordinates:', err);
    return [];
  }
}

