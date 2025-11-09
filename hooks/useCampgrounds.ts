import { useState, useEffect, useMemo } from 'react';
import { CampgroundEntry } from '../types/campground';
import { loadCampgrounds, filterCampgrounds, getUniqueStates } from '../utils/dataLoader';

export interface CampgroundFilters {
  state?: string;
  hookupType?: 'full' | 'partial' | 'all';
  searchQuery?: string;
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

  const filteredCampgrounds = useMemo(() => {
    if (!filters) {
      return campgrounds;
    }
    return filterCampgrounds(campgrounds, filters);
  }, [campgrounds, filters]);

  const states = useMemo(() => getUniqueStates(campgrounds), [campgrounds]);

  return {
    campgrounds: filteredCampgrounds,
    allCampgrounds: campgrounds,
    loading,
    error,
    states,
  };
}

