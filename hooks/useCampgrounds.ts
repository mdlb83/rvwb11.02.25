import { useState, useEffect, useMemo } from 'react';
import { CampgroundEntry } from '../types/campground';
import { loadCampgrounds, filterCampgrounds, getUniqueStates } from '../utils/dataLoader';

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

  // Filter campgrounds directly - no useMemo to ensure it always recalculates
  // Extract filter values
  const hookupType = filters?.hookupType ?? 'all';
  const searchQuery = filters?.searchQuery ?? '';
  const state = filters?.state ?? '';
  const bookmarked = filters?.bookmarked ?? false;
  const bookmarkedIds = filters?.bookmarkedIds ?? [];
  
  // Create stable keys
  const bookmarkedIdsKey = Array.isArray(bookmarkedIds) ? bookmarkedIds.join(',') : '';
  const searchQueryKey = searchQuery && searchQuery.trim().length >= 2 ? searchQuery.trim() : '';
  
  // Check if we have any active filters
  const hasHookup = hookupType && hookupType !== 'all';
  const hasSearch = searchQueryKey && searchQueryKey.length >= 2;
  const hasState = state && state.trim().length > 0;
  const hasBookmarked = bookmarked && bookmarkedIdsKey && bookmarkedIdsKey.length > 0;
  const hasAnyFilters = hasHookup || hasSearch || hasState || hasBookmarked;
  
  // Filter directly - always recalculate
  let filteredCampgrounds: CampgroundEntry[] = [];
  
  if (!Array.isArray(campgrounds) || campgrounds.length === 0) {
    filteredCampgrounds = [];
  } else if (!hasAnyFilters) {
    // No filters - return all campgrounds (new array reference)
    filteredCampgrounds = [...campgrounds];
  } else {
    // Build filter params
    const filterParams: {
      state?: string;
      hookupType?: 'full' | 'partial' | 'none' | 'all';
      searchQuery?: string;
      bookmarked?: boolean;
      bookmarkedIds?: string[];
    } = {};

    if (hookupType && hookupType !== 'all') {
      filterParams.hookupType = hookupType;
    }
    
    if (searchQueryKey && searchQueryKey.length >= 2) {
      filterParams.searchQuery = searchQueryKey;
    }
    
    if (state && state.trim().length > 0) {
      filterParams.state = state.trim();
    }
    
    if (bookmarked && Array.isArray(bookmarkedIds) && bookmarkedIds.length > 0) {
      filterParams.bookmarked = true;
      filterParams.bookmarkedIds = [...bookmarkedIds];
    }

    // Apply filters
    try {
      const filtered = filterCampgrounds(campgrounds, filterParams);
      filteredCampgrounds = Array.isArray(filtered) ? [...filtered] : [...campgrounds];
    } catch (err) {
      console.error('Error filtering campgrounds:', err);
      filteredCampgrounds = [...campgrounds];
    }
  }

  const states = useMemo(() => getUniqueStates(campgrounds), [campgrounds]);

  return {
    campgrounds: filteredCampgrounds,
    allCampgrounds: campgrounds,
    loading,
    error,
    states,
  };
}

