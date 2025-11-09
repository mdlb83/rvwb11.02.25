import { CampgroundEntry, CampgroundDatabase } from '../types/campground';

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
  }
): CampgroundEntry[] {
  return entries.filter(entry => {
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
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = entry.campground?.name?.toLowerCase().includes(query) || false;
      const matchesCity = entry.city?.toLowerCase().includes(query) || false;
      const matchesState = entry.state?.toLowerCase().includes(query) || false;
      if (!matchesName && !matchesCity && !matchesState) {
        return false;
      }
    }
    return true;
  });
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

