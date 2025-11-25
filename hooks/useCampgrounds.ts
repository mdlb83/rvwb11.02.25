import { useState, useEffect, useMemo } from 'react';
import { CampgroundEntry } from '../types/campground';
import { loadCampgrounds, filterCampgrounds, getUniqueStates } from '../utils/dataLoader';
import { getBookmarks } from '../utils/bookmarks';

export interface CampgroundFilters {
  state?: string;
  hookupType?: 'full' | 'partial' | 'none' | 'all';
  searchQuery?: string;
  bookmarked?: boolean;
  bookmarkedIds?: string[];
}

export function useCampgrounds(filters?: CampgroundFilters, retryKey?: number) {
  const [campgrounds, setCampgrounds] = useState<CampgroundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadCampgrounds()
      .then(data => {
        setCampgrounds(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [retryKey]);

  // Use individual filter values as dependencies instead of the filters object
  // This prevents unnecessary recalculations when the object reference changes
  const filterState = filters ? `${filters.hookupType || 'all'}-${filters.searchQuery || ''}-${filters.state || ''}-${filters.bookmarked ? 'bookmarked' : 'all'}` : 'none';
  
  const filteredCampgrounds = useMemo(() => {
    try {
      if (!filters) {
        return campgrounds;
      }
      
      // Validate inputs before filtering
      if (!Array.isArray(campgrounds)) {
        console.error('useCampgrounds: campgrounds is not an array', campgrounds);
        return [];
      }
      
      // Additional validation
      if (!campgrounds || campgrounds.length === 0) {
        return [];
      }
      
      // If bookmark filter is active, we need to load bookmarks asynchronously
      // For now, we'll handle this synchronously by passing bookmarkedIds
      // This will be handled by the component that calls useCampgrounds
      const filterParams = { ...filters };
      
      return filterCampgrounds(campgrounds, filterParams);
    } catch (err) {
      console.error('useCampgrounds: Error in filteredCampgrounds useMemo', err, { 
        filters, 
        campgroundsLength: campgrounds?.length,
        filterState 
      });
      // Return empty array on error to prevent crash
      return [];
    }
  }, [campgrounds, filterState]);

  const states = useMemo(() => getUniqueStates(campgrounds), [campgrounds]);

  return {
    campgrounds: filteredCampgrounds,
    allCampgrounds: campgrounds,
    loading,
    error,
    states,
  };
}

