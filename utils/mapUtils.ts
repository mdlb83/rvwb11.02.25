import { CampgroundEntry } from '../types/campground';

/**
 * Extracts coordinates from campground entries for use with fitToCoordinates
 */
export function getCampgroundCoordinates(campgrounds: CampgroundEntry[]): Array<{ latitude: number; longitude: number }> {
  return campgrounds
    .filter((campground) => 
      campground.campground && 
      campground.latitude && 
      campground.longitude &&
      !isNaN(campground.latitude) &&
      !isNaN(campground.longitude)
    )
    .map((campground) => ({
      latitude: campground.latitude,
      longitude: campground.longitude,
    }));
}

