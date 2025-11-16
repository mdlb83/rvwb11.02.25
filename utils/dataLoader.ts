import { CampgroundEntry, CampgroundDatabase } from '../types/campground';

/**
 * Generate a unique ID for a campground entry (same logic as in CampgroundBottomSheet)
 */
export function generateCampgroundIdFromEntry(entry: CampgroundEntry): string {
  if (!entry) return '';
  const name = entry.campground?.name || '';
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sanitizedCity = entry.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${sanitizedCity}-${entry.state.toLowerCase()}-${sanitizedName}`;
}

let cachedData: CampgroundEntry[] | null = null;

export async function loadCampgrounds(): Promise<CampgroundEntry[]> {
  if (cachedData) {
    return cachedData;
  }

  try {
    // In Expo, use require for bundled JSON files
    const data = require('../data/campgrounds.json') as CampgroundDatabase;
    cachedData = data.entries;
    return cachedData;
  } catch (error) {
    console.error('Error loading campgrounds:', error);
    return [];
  }
}

export function getUniqueStates(entries: CampgroundEntry[]): string[] {
  const states = new Set(entries.map(entry => entry.state));
  return Array.from(states).sort();
}

export function filterCampgrounds(
  entries: CampgroundEntry[],
  filters: {
    state?: string;
    hookupType?: 'full' | 'partial' | 'all';
    searchQuery?: string;
    bookmarked?: boolean;
    bookmarkedIds?: string[]; // Array of bookmarked campground IDs
  }
): CampgroundEntry[] {
  try {
    return entries.filter(entry => {
      try {
        // Filter out entries with null campground data
        if (!entry.campground) {
          return false;
        }

        if (filters.state && entry.state !== filters.state) {
          return false;
        }
        if (filters.hookupType && filters.hookupType !== 'all' && entry.hookup_type !== filters.hookupType) {
          return false;
        }
        if (filters.searchQuery && typeof filters.searchQuery === 'string') {
          const query = filters.searchQuery.trim().toLowerCase();
          // Skip empty queries
          if (query.length === 0) {
            return true;
          }
          
          // Safely check name, city, and state - ensure they're strings before calling toLowerCase
          const name = typeof entry.campground?.name === 'string' ? entry.campground.name.toLowerCase() : '';
          const city = typeof entry.city === 'string' ? entry.city.toLowerCase() : '';
          const state = typeof entry.state === 'string' ? entry.state.toLowerCase() : '';
          
          const matchesName = name.includes(query);
          const matchesCity = city.includes(query);
          const matchesState = state.includes(query);
          
          if (!matchesName && !matchesCity && !matchesState) {
            return false;
          }
        }
        if (filters.bookmarked && filters.bookmarkedIds && filters.bookmarkedIds.length > 0) {
          const campgroundId = generateCampgroundIdFromEntry(entry);
          const isBookmarked = filters.bookmarkedIds.includes(campgroundId);
          if (!isBookmarked) {
            return false;
          }
          console.log('Found bookmarked campground:', campgroundId, entry.campground?.name);
        }
        return true;
      } catch (err) {
        // Log error for debugging but don't crash - skip this entry
        console.error('Error filtering campground entry:', err, entry);
        return false;
      }
    });
  } catch (err) {
    // If filtering completely fails, return empty array instead of crashing
    console.error('Error in filterCampgrounds:', err);
    return [];
  }
}

export function findCampgroundById(
  entries: CampgroundEntry[],
  id: string
): CampgroundEntry | undefined {
  // ID is constructed as city-state-index or similar
  // For now, we'll use index-based lookup
  const index = parseInt(id, 10);
  if (!isNaN(index) && index >= 0 && index < entries.length) {
    return entries[index];
  }
  return undefined;
}

export function generateCampgroundId(entry: CampgroundEntry, index: number): string {
  // Create a unique ID from city, state, and index
  const sanitizedCity = entry.city.toLowerCase().replace(/\s+/g, '-');
  return `${sanitizedCity}-${entry.state.toLowerCase()}-${index}`;
}

