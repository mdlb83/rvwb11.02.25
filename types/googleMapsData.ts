/**
 * Google Maps Places API (New) supplementary data for campgrounds
 * This data is stored separately from the main campground data
 */

export interface GoogleMapsPhoto {
  photoReference: string; // Google Places photo reference ID
  localPath?: string; // Local file path if downloaded
  width?: number;
  height?: number;
  attribution?: string; // Photo attribution text
}

export interface GoogleMapsData {
  campgroundId: string; // Matches generateCampgroundIdFromEntry
  placeId?: string; // Google Places ID for future API calls
  editorialSummary?: string; // AI-generated listing summary
  rating?: number; // Star rating (0-5)
  userRatingCount?: number; // Number of ratings
  reviewSummary?: {
    text: string; // AI-generated review summary text
  };
  reviewTopics?: string[]; // Review topic tags (e.g., "Great for families", "Pet-friendly")
  photos?: GoogleMapsPhoto[]; // First 4 photos (downloaded locally)
  openingHours?: {
    weekdayText: string[]; // Array of day-hour strings (e.g., "Monday: 8:00 AM – 6:00 PM")
    openNow?: boolean; // Current open/closed status
  };
  websiteUri?: string; // Website URL
  nationalPhoneNumber?: string; // Phone number in national format
  lastUpdated: string; // ISO timestamp of last sync
  syncStatus: 'pending' | 'success' | 'failed' | 'not_found';
  syncError?: string; // Error message if sync failed
}

export interface GoogleMapsDataDatabase {
  entries: {
    [campgroundId: string]: GoogleMapsData;
  };
  metadata?: {
    lastFullSync?: string; // ISO timestamp of last full sync
    totalEntries?: number;
    syncVersion?: string; // Version of sync script used
  };
}

