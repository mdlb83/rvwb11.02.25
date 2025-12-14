import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Keyboard, Alert, TouchableOpacity, AppState, Image, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useCampgrounds, CampgroundFilters } from '../hooks/useCampgrounds';
import { CampgroundEntry } from '../types/campground';
import CampgroundMap from '../components/map/CampgroundMap';
import CampgroundBottomSheet from '../components/map/CampgroundBottomSheet';
import SearchBar from '../components/filters/SearchBar';
import FilterButton from '../components/filters/FilterButton';
import LocationButton from '../components/map/LocationButton';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import ResultCountBadge from '../components/map/ResultCountBadge';
import { getCampgroundCoordinates } from '../utils/mapUtils';
import { getBookmarks } from '../utils/bookmarks';
import SettingsModal from '../components/settings/SettingsModal';
import { useTheme } from '../contexts/ThemeContext';
import { addViewedCampground, getRemainingViews, resetViewCount } from '../utils/campgroundViews';
import { generateCampgroundIdFromEntry } from '../utils/dataLoader';
import PaywallModal from '../components/subscription/PaywallModal';
import { useSubscription } from '../hooks/useSubscription';
import Constants from 'expo-constants';

export default function MapScreen() {
  const { theme, toggleTheme, resolvedThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  // Search input state - filtering happens in real-time as user types
  const [searchInput, setSearchInput] = useState('');
  const [selectedHookupType, setSelectedHookupType] = useState<'full' | 'partial' | 'none' | 'all'>('all');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [hasBookmarks, setHasBookmarks] = useState(false);
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium } = useSubscription();
  const [remainingViews, setRemainingViews] = useState<number | null>(null);
  
  // Calculate button spacing - add extra space on Android for better spacing from search bar
  const buttonSpacing = useMemo(() => {
    const baseSpacing = 80;
    const androidExtraSpacing = 35; // Extra spacing on Android to prevent buttons from being too close to search bar
    return Platform.OS === 'android' ? baseSpacing + androidExtraSpacing : baseSpacing;
  }, []);
  
  // Check if user has any bookmarks on mount and when app comes to foreground
  useEffect(() => {
    const checkBookmarks = async () => {
      const bookmarks = await getBookmarks();
      setHasBookmarks(bookmarks.length > 0);
      if (showBookmarked && bookmarks.length > 0) {
        setBookmarkedIds(bookmarks);
      } else if (showBookmarked && bookmarks.length === 0) {
        // If filtering by bookmarks but no bookmarks exist, turn off the filter
        setShowBookmarked(false);
        setBookmarkedIds([]);
      }
    };
    checkBookmarks();
  }, []);

  // Load bookmarked IDs when showBookmarked changes
  useEffect(() => {
    const loadBookmarks = async () => {
      if (showBookmarked) {
        const bookmarks = await getBookmarks();
        console.log('Loaded bookmarks:', bookmarks);
        setBookmarkedIds(bookmarks);
        setHasBookmarks(bookmarks.length > 0);
      } else {
        setBookmarkedIds([]);
      }
    };
    loadBookmarks();
  }, [showBookmarked]);

  // Function to refresh bookmarks state - can be called from anywhere
  const refreshBookmarks = useCallback(async () => {
    const bookmarks = await getBookmarks();
    setHasBookmarks(bookmarks.length > 0);
    if (showBookmarked) {
      setBookmarkedIds(bookmarks);
      // If filtering by bookmarks but no bookmarks exist, turn off the filter
      if (bookmarks.length === 0) {
        setShowBookmarked(false);
      }
    }
  }, [showBookmarked]);

  // Refresh bookmarks when app comes back to focus (e.g., after bookmarking)
  useEffect(() => {
    // Refresh immediately and also set up a focus listener
    refreshBookmarks();
    
    // Listen for app state changes to refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active') {
        refreshBookmarks();
      }
    });
    
    return () => {
      subscription?.remove();
    };
  }, [refreshBookmarks]);

  // Create stable key for bookmarkedIds to prevent unnecessary filter recalculations
  const bookmarkedIdsKey = useMemo(() => {
    return Array.isArray(bookmarkedIds) ? bookmarkedIds.join(',') : '';
  }, [bookmarkedIds]);
  
  // Memoize filters object - always create a new object to ensure reference changes
  // Use searchInput for real-time filtering as user types
  const filters: CampgroundFilters = useMemo(() => {
    // Always create a new object to ensure React detects changes
    const filterObj: CampgroundFilters = {};
    
    // Only add hookupType if it's not 'all'
    if (selectedHookupType && selectedHookupType !== 'all') {
      filterObj.hookupType = selectedHookupType;
    }
    
    // Filter by search in real-time if query is at least 2 characters
    const trimmedQuery = searchInput.trim();
    if (trimmedQuery && trimmedQuery.length >= 2) {
      filterObj.searchQuery = trimmedQuery;
    }
    
    // Only add bookmark filter if enabled and has bookmarked IDs
    if (showBookmarked && bookmarkedIdsKey && Array.isArray(bookmarkedIds) && bookmarkedIds.length > 0) {
      filterObj.bookmarked = true;
      // Create a new array reference to ensure change detection
      filterObj.bookmarkedIds = [...bookmarkedIds];
    }
    
    return filterObj;
  }, [selectedHookupType, searchInput, showBookmarked, bookmarkedIdsKey, bookmarkedIds]);

  const [retryKey, setRetryKey] = useState(0);
  const { campgrounds, loading, error, allCampgrounds } = useCampgrounds(filters, retryKey);
  
  // Debug logging for crashes
  useEffect(() => {
    if (error) {
      console.error('Campgrounds error:', error);
    }
    if (!Array.isArray(campgrounds)) {
      console.error('Campgrounds is not an array:', typeof campgrounds, campgrounds);
    }
  }, [campgrounds, error]);
  const [splashHidden, setSplashHidden] = useState(false);
  
  // Track the last filter state to avoid unnecessary zooms
  const lastFilterStateRef = useRef<string>('');
  // Track if we're currently processing a zoom to prevent race conditions
  const isZoomingRef = useRef<boolean>(false);
  // Track previous hookup type to detect transitions to "all"
  // Initialize with current value to avoid false positives on mount
  const previousHookupTypeRef = useRef<'full' | 'partial' | 'none' | 'all'>(selectedHookupType);
  // Track last keyboard height to detect significant changes
  const lastKeyboardHeightRef = useRef<number>(0);
  // Track current map region to preserve zoom level
  // Initialize with reasonable defaults to avoid zoom changes on first selection
  const currentRegionRef = useRef<{ latitudeDelta: number; longitudeDelta: number } | null>({
    latitudeDelta: 0.5,
    longitudeDelta: 0.75,
  });
  // Track if we're auto-selecting from a single search result to skip the selectedCampground effect
  const isAutoSelectingRef = useRef<boolean>(false);
  
  // Check if we have active filters based on searchInput (real-time filtering)
  const hasActiveFilters = selectedHookupType !== 'all' || searchInput.trim().length >= 2 || showBookmarked;
  const hasNoResults = !loading && !error && hasActiveFilters && campgrounds.length === 0;

  // Hide splash screen once data is loaded (or error occurs)
  useEffect(() => {
    async function hideSplash() {
      if (!loading && !splashHidden) {
        // Data has finished loading (successfully or with error)
        // Small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
        setSplashHidden(true);
      }
    }
    hideSplash();
  }, [loading, splashHidden]);

  // Brute force Android-only: zoom when "all" is selected (simple approach, no complex state tracking)
  useEffect(() => {
    if (Platform.OS === 'android' && 
        selectedHookupType === 'all' && 
        previousHookupTypeRef.current !== 'all' &&
        !loading && 
        !error && 
        allCampgrounds.length > 0 &&
        !searchInput.trim() &&
        !showBookmarked) {
      
      // Update ref immediately to prevent duplicate zooms
      previousHookupTypeRef.current = selectedHookupType;
      
      // Longer delay on Android to ensure everything is settled (campgrounds updated, etc.)
      const timeoutId = setTimeout(() => {
        if (!mapRef.current) {
          return;
        }
        
        // Simply always zoom - brute force, no complex checks
        try {
          const coordinates = getCampgroundCoordinates(allCampgrounds);
          if (coordinates.length > 0) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: {
                top: 100,
                right: 50,
                bottom: 200,
                left: 50,
              },
              animated: true,
            });
          }
        } catch (err) {
          console.error('Error zooming to all campgrounds (Android):', err);
        }
      }, 500); // Longer delay for Android to ensure state is fully settled
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [selectedHookupType, loading, error, allCampgrounds.length, searchInput, showBookmarked]);

  // iOS and fallback: zoom out when switching to "all" hookup type with no other filters
  // Wait for campgrounds to update to match allCampgrounds before zooming
  useEffect(() => {
    // Skip on Android - handled by brute force effect above
    if (Platform.OS === 'android') {
      previousHookupTypeRef.current = selectedHookupType;
      return;
    }
    
    // Capture the previous value BEFORE checking conditions
    const previousType = previousHookupTypeRef.current;
    const justSwitchedToAll = selectedHookupType === 'all' && previousType !== 'all';
    
    // Only trigger when switching to "all" from a filtered state, with no other active filters
    if (justSwitchedToAll && 
        !loading && 
        !error && 
        allCampgrounds.length > 0 &&
        !searchInput.trim() &&
        !showBookmarked) {
      
      // Wait for campgrounds to actually update to match allCampgrounds
      // This ensures the filtered data has been updated before we zoom
      if (campgrounds.length !== allCampgrounds.length) {
        // campgrounds haven't updated yet, wait for next render
        return;
      }
      
      // Small delay to ensure state is settled
      const timeoutId = setTimeout(() => {
        if (isZoomingRef.current || !mapRef.current) {
          return;
        }
        
        // Double-check campgrounds still match allCampgrounds
        if (campgrounds.length !== allCampgrounds.length) {
          return;
        }
        
        isZoomingRef.current = true;
        try {
          const coordinates = getCampgroundCoordinates(allCampgrounds);
          if (coordinates.length > 0) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: {
                top: 100,
                right: 50,
                bottom: 200,
                left: 50,
              },
              animated: true,
            });
          }
        } catch (err) {
          console.error('Error zooming to all campgrounds:', err);
        } finally {
          setTimeout(() => {
            isZoomingRef.current = false;
          }, 100);
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
    
    // Update the ref AFTER we've processed the zoom logic
    previousHookupTypeRef.current = selectedHookupType;
    
    return undefined;
  }, [selectedHookupType, loading, error, allCampgrounds.length, campgrounds.length, searchInput, showBookmarked]);

  // Zoom to search/filter results when they change
  useEffect(() => {
    // If filters are cleared, zoom out to show all campgrounds (fallback for other cases)
    if (!hasActiveFilters && !loading && !error && allCampgrounds.length > 0) {
      const currentFilterState = 'no-filters';
      
      // Only skip if we've already zoomed to show all
      if (lastFilterStateRef.current === currentFilterState && !isZoomingRef.current) {
        return; // Already zoomed to show all
      }
      
      // Debounce to prevent rapid zoom changes
      const timeoutId = setTimeout(() => {
        if (isZoomingRef.current) {
          return;
        }
        
        // Re-check hasActiveFilters using current selectedHookupType
        const currentHasActiveFilters = selectedHookupType !== 'all' || searchInput.trim().length >= 2 || showBookmarked;
        if (currentHasActiveFilters) {
          return; // Filters became active during debounce
        }
        
        isZoomingRef.current = true;
        lastFilterStateRef.current = currentFilterState;
        
        try {
          const coordinates = getCampgroundCoordinates(allCampgrounds);
          if (coordinates.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: {
                top: 100,
                right: 50,
                bottom: 200,
                left: 50,
              },
              animated: true,
            });
          }
        } catch (err) {
          console.error('Error zooming to all campgrounds:', err);
        } finally {
          setTimeout(() => {
            isZoomingRef.current = false;
          }, 100);
        }
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
    
    // Only zoom if filters are active, we have results, and the filter state has changed
    if (!hasActiveFilters || campgrounds.length === 0 || loading || error) {
      return;
    }

    // Use searchInput for zoom (real-time filtering)
    const trimmedSearch = searchInput.trim();
    const currentFilterState = `${selectedHookupType}-${trimmedSearch}-${showBookmarked ? 'bookmarked' : 'all'}`;
    
    // Skip if we've already zoomed for this filter state
    if (lastFilterStateRef.current === currentFilterState) {
      return;
    }

    // Debounce zoom to prevent rapid changes while typing
    const timeoutId = setTimeout(() => {
      // Prevent multiple simultaneous zoom operations
      if (isZoomingRef.current) {
        return;
      }

      // Double-check filter state hasn't changed during debounce
      const latestTrimmedSearch = searchInput.trim();
      const latestFilterState = `${selectedHookupType}-${latestTrimmedSearch}-${showBookmarked ? 'bookmarked' : 'all'}`;
      if (lastFilterStateRef.current === latestFilterState) {
        return;
      }

      // Set zooming flag
      isZoomingRef.current = true;

      // Update the ref to track this filter state
      lastFilterStateRef.current = latestFilterState;

      // Use current campgrounds from the closure, but also validate it's still valid
      // Get fresh campgrounds from the current state to avoid stale closure issues
      try {
        // Get coordinates for filtered campgrounds - use current campgrounds array
        const currentCampgrounds = campgrounds; // This will be captured, but we validate below
        if (!currentCampgrounds || !Array.isArray(currentCampgrounds) || currentCampgrounds.length === 0) {
          isZoomingRef.current = false;
          return;
        }

        const coordinates = getCampgroundCoordinates(currentCampgrounds);
        
        if (coordinates.length > 0 && mapRef.current) {
          // Wrap in try-catch to prevent crashes during rapid typing
          try {
            // Special handling for single result: zoom out more, position in top third, and auto-select
            if (coordinates.length === 1 && currentCampgrounds.length === 1) {
              const singleCampground = currentCampgrounds[0];
              
              // Calculate offset to position in top third (25% offset like selectedCampground)
              const latitudeDelta = 2.0; // More zoomed out (was ~0.5-1.0 with fitToCoordinates)
              const longitudeDelta = 2.0;
              const latitudeOffset = latitudeDelta * 0.25;
              
              // Update region ref immediately with the deltas we're about to use
              // This ensures the selectedCampground effect uses the correct values
              currentRegionRef.current = {
                latitudeDelta: latitudeDelta,
                longitudeDelta: longitudeDelta,
              };
              
              // Mark that we're auto-selecting to skip the selectedCampground effect
              isAutoSelectingRef.current = true;
              
              // Use animateToRegion with larger deltas for more zoomed-out view
              // Position in top third by subtracting latitude offset
              mapRef.current.animateToRegion({
                latitude: coordinates[0].latitude - latitudeOffset,
                longitude: coordinates[0].longitude,
                latitudeDelta: latitudeDelta,
                longitudeDelta: longitudeDelta,
              }, 500);
              
              // Auto-select the single campground after zoom animation completes
              // Reset the auto-selecting flag after a delay to allow selectedCampground effect to skip
              setTimeout(() => {
                handleCampgroundSelect(singleCampground);
                // Reset flag after selectedCampground effect has had a chance to check it
                setTimeout(() => {
                  isAutoSelectingRef.current = false;
                }, 100);
              }, 600); // Wait for zoom animation to complete
            } else {
              // Multiple results: use fitToCoordinates as before
              const filtersContainerHeight = 60;
              const extraBottomPadding = 20;
              const bottomPadding = keyboardHeight > 0 
                ? keyboardHeight + filtersContainerHeight + extraBottomPadding 
                : 200;
              
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: {
                  top: 100,
                  right: 50,
                  bottom: bottomPadding,
                  left: 50,
                },
                animated: true,
              });
            }
          } catch (err) {
            console.error('Error fitting to coordinates:', err);
          } finally {
            // Reset zooming flag after a short delay to allow animation to start
            setTimeout(() => {
              isZoomingRef.current = false;
            }, 100);
          }
        } else {
          isZoomingRef.current = false;
        }
      } catch (err) {
        console.error('Error in zoom effect:', err);
        isZoomingRef.current = false;
      }
    }, 500); // Increased to 500ms debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [campgrounds, hasActiveFilters, selectedHookupType, searchInput, showBookmarked, loading, error, keyboardHeight, allCampgrounds]);

  // Handle deep links to restore campground when user returns from map app
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url);
      
      if (path === 'campground' && queryParams) {
        const lat = parseFloat(queryParams.lat as string);
        const lng = parseFloat(queryParams.lng as string);
        const id = queryParams.id as string;

        if (lat && lng && allCampgrounds.length > 0) {
          // Find campground by ID or coordinates
          let campground: CampgroundEntry | null = null;
          
          if (id) {
            // Try to find by ID (city-state-name combination)
            campground = allCampgrounds.find(cg => {
              const cgId = `${cg.city}-${cg.state}-${cg.campground?.name || ''}`.toLowerCase().replace(/\s+/g, '-');
              return cgId === id.toLowerCase();
            }) || null;
          }
          
          // Fallback to finding by coordinates if ID not found
          if (!campground) {
            campground = allCampgrounds.find(cg => 
              Math.abs(cg.latitude - lat) < 0.001 && Math.abs(cg.longitude - lng) < 0.001
            ) || null;
          }

          if (campground) {
            handleCampgroundSelect(campground);
            // Optionally center map on campground
            mapRef.current?.animateToRegion({
              latitude: campground.latitude,
              longitude: campground.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }, 500);
          }
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [allCampgrounds]);

  useEffect(() => {
    // Android keyboard suggestion bar height (typically 40-50px)
    const ANDROID_SUGGESTION_BAR_HEIGHT = 45;
    
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      // On Android, add extra height for the suggestion bar above the keyboard
      const baseHeight = e.endCoordinates.height;
      const adjustedHeight = Platform.OS === 'android' 
        ? baseHeight + ANDROID_SUGGESTION_BAR_HEIGHT
        : baseHeight;
      setKeyboardHeight(adjustedHeight);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Re-zoom to results when keyboard appears/disappears if we have active filters
  useEffect(() => {
    // Only re-zoom if keyboard height actually changed and we have active filters
    if (!hasActiveFilters || campgrounds.length === 0 || loading || error) {
      lastKeyboardHeightRef.current = keyboardHeight;
      return;
    }

    // Only re-zoom if keyboard height changed significantly (more than 50px difference)
    const keyboardHeightChanged = Math.abs(keyboardHeight - lastKeyboardHeightRef.current) > 50;
    if (!keyboardHeightChanged) {
      return;
    }

    lastKeyboardHeightRef.current = keyboardHeight;

    // Small delay to ensure keyboard animation completes
    const timeoutId = setTimeout(() => {
      if (mapRef.current && campgrounds.length > 0) {
        try {
          const coordinates = getCampgroundCoordinates(campgrounds);
          if (coordinates.length > 0) {
                 // Special handling for single result: zoom out more and position in top third
                 if (coordinates.length === 1 && campgrounds.length === 1) {
                   const latitudeDelta = 2.0;
                   const longitudeDelta = 2.0;
                   const latitudeOffset = latitudeDelta * 0.25;
                   
                   mapRef.current.animateToRegion({
                     latitude: coordinates[0].latitude - latitudeOffset,
                     longitude: coordinates[0].longitude,
                     latitudeDelta: latitudeDelta,
                     longitudeDelta: longitudeDelta,
                   }, 500);
                 } else {
              // Multiple results: use fitToCoordinates
              const filtersContainerHeight = 60;
              const extraBottomPadding = 20;
              const bottomPadding = keyboardHeight > 0 
                ? keyboardHeight + filtersContainerHeight + extraBottomPadding 
                : 200;
              
              mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: {
                  top: 100,
                  right: 50,
                  bottom: bottomPadding,
                  left: 50,
                },
                animated: true,
              });
            }
          }
        } catch (err) {
          console.error('Error re-zooming on keyboard change:', err);
        }
      }
    }, 300); // Wait for keyboard animation

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyboardHeight, hasActiveFilters, campgrounds.length, loading, error]);

  // Center selected campground in top third of map without changing zoom
  useEffect(() => {
    if (!selectedCampground || !mapRef.current) {
      return;
    }

    // Skip this effect if we're auto-selecting from a single search result
    // The search zoom effect already positioned it correctly
    if (isAutoSelectingRef.current) {
      return;
    }

    // Small delay to ensure map is ready and region ref is updated
    const timeoutId = setTimeout(() => {
      if (mapRef.current && selectedCampground) {
        try {
          // Get current region deltas - use ref value which should be updated from onRegionChangeComplete
          // The ref is initialized with defaults, but will be updated as user interacts with map
          if (!currentRegionRef.current) {
            return; // Should not happen since we initialize it, but TypeScript safety check
          }
          const latitudeDelta = currentRegionRef.current.latitudeDelta;
          const longitudeDelta = currentRegionRef.current.longitudeDelta;
          
          // To position campground in top third (33% from top of visible area):
          // Map center Y, visible top = Y + latitudeDelta/2, visible bottom = Y - latitudeDelta/2
          // We want campground at X to appear at 33% from top: X = Y + latitudeDelta/2 - latitudeDelta*0.33
          // Solving for Y: Y = X - latitudeDelta*(0.5 - 0.33) = X - latitudeDelta*0.17
          // Subtracting moves center south, which positions campground higher on screen
          // Using a larger offset (0.25 instead of 0.17) to ensure it's clearly in the top third
          const latitudeOffset = latitudeDelta * 0.25;
          
          mapRef.current.animateToRegion({
            latitude: selectedCampground.latitude - latitudeOffset,
            longitude: selectedCampground.longitude,
            latitudeDelta: latitudeDelta,
            longitudeDelta: longitudeDelta,
          }, 500);
        } catch (err) {
          console.error('Error centering campground:', err);
        }
      }
    }, 200); // Delay to ensure region ref might be updated from any recent map movements

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedCampground]);

  // Handle search input changes (user typing - doesn't trigger filtering)
  const handleSearchChange = useCallback((text: string) => {
    try {
      const safeText = typeof text === 'string' ? text : '';
      setSearchInput(safeText);
    } catch (err) {
      console.error('Error in handleSearchChange:', err, { text });
      setSearchInput('');
    }
  }, []);

  // Handle search submission (user hits enter - just dismiss keyboard since filtering is real-time)
  const handleSearchSubmit = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Handle clearing search (clears input - filtering happens in real-time)
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    // Reset filter state ref so zoom can happen again if filters are re-applied
    lastFilterStateRef.current = '';
  }, []);

  // Handle hookup type changes - reset filter state ref when switching to "all" to ensure zoom works
  const handleHookupTypeChange = useCallback((type: 'full' | 'partial' | 'none' | 'all') => {
    // Don't update previousHookupTypeRef here - let the effect handle it to avoid race conditions
    setSelectedHookupType(type);
    // Always reset filter state ref when switching to "all" so zoom logic can properly detect the change
    // This ensures we zoom out when clearing the hookup filter
    if (type === 'all' && selectedHookupType !== 'all') {
      lastFilterStateRef.current = '';
    }
  }, [selectedHookupType]);

  // Handle campground selection with view tracking
  const handleCampgroundSelect = useCallback(async (campground: CampgroundEntry) => {
    setSelectedCampground(campground);
    
    // Only track views if not premium (for analytics, but don't auto-show paywall)
    if (!isPremium) {
      // Track view
      const campgroundId = generateCampgroundIdFromEntry(campground);
      await addViewedCampground(campgroundId);
      // Update remaining views count
      const remaining = await getRemainingViews();
      setRemainingViews(remaining);
      // Don't automatically show paywall - user must click "Unlock Premium" button
    } else {
      setRemainingViews(null);
    }
  }, [isPremium]);

  // Update remaining views on mount and when premium status changes
  useEffect(() => {
    const updateRemainingViews = async () => {
      if (isPremium) {
        setRemainingViews(null);
      } else {
        const remaining = await getRemainingViews();
        setRemainingViews(remaining);
      }
    };
    updateRemainingViews();
  }, [isPremium]);

  // Handle reset view count (dev only)
  const handleResetViews = useCallback(async () => {
    // Only allow reset in Expo Go (storeClient) - not in standalone builds (preview/production)
    // Standalone builds include both preview and production, and preview builds may have __DEV__ enabled
    const isStandalone = Constants.executionEnvironment === 'standalone';
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    
    // Only allow reset in Expo Go, not in standalone builds (preview/production)
    if (isStandalone) {
      return; // Don't allow reset in preview/production builds
    }
    
    // Only allow reset in Expo Go
    if (!isExpoGo) {
      return;
    }
    
    await resetViewCount();
    const remaining = await getRemainingViews();
    setRemainingViews(remaining);
    Alert.alert('Reset', 'View count has been reset');
  }, []);

  const handleMapPress = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Show loading state (MUST be after all hooks)
  if (loading) {
    return <LoadingState />;
  }

  // Show error state (MUST be after all hooks)
  if (error) {
    return (
      <ErrorState
        message={error.message || 'Failed to load campground data. Please check your connection and try again.'}
        onRetry={() => {
          // Trigger retry by updating key
          setRetryKey(prev => prev + 1);
        }}
      />
    );
  }

  const handleSuggestCampground = () => {
    const subject = encodeURIComponent('Suggest a New Campground');
    const body = encodeURIComponent(
      `I'd like to suggest adding the following campground:\n\n` +
      `Campground Name:\n` +
      `Location (City, State):\n` +
      `Hookup Type (Full/Partial):\n` +
      `Campground Website/Info:\n` +
      `Nearby Bike Trails:\n` +
      `Additional Notes:\n\n`
    );
    const emailUrl = `mailto:dcbc3705@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(emailUrl).catch((err) => {
      console.error('Failed to open email:', err);
    });
  };

  const handleZoomIn = () => {
    if (mapRef.current && currentRegionRef.current) {
      const newLatitudeDelta = currentRegionRef.current.latitudeDelta * 0.5;
      const newLongitudeDelta = currentRegionRef.current.longitudeDelta * 0.5;
      
      mapRef.current.getCamera().then((camera) => {
        if (camera.center) {
          mapRef.current?.animateToRegion({
            latitude: camera.center.latitude,
            longitude: camera.center.longitude,
            latitudeDelta: newLatitudeDelta,
            longitudeDelta: newLongitudeDelta,
          }, 300);
        }
      }).catch(() => {
        // Fallback: use current region if getCamera fails
        if (currentRegionRef.current) {
          mapRef.current?.getCamera().then((camera) => {
            if (camera.center) {
              mapRef.current?.animateToRegion({
                latitude: camera.center.latitude,
                longitude: camera.center.longitude,
                latitudeDelta: newLatitudeDelta,
                longitudeDelta: newLongitudeDelta,
              }, 300);
            }
          });
        }
      });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current && currentRegionRef.current) {
      const newLatitudeDelta = currentRegionRef.current.latitudeDelta * 2;
      const newLongitudeDelta = currentRegionRef.current.longitudeDelta * 2;
      
      mapRef.current.getCamera().then((camera) => {
        if (camera.center) {
          mapRef.current?.animateToRegion({
            latitude: camera.center.latitude,
            longitude: camera.center.longitude,
            latitudeDelta: newLatitudeDelta,
            longitudeDelta: newLongitudeDelta,
          }, 300);
        }
      }).catch(() => {
        // Fallback: use current region if getCamera fails
        if (currentRegionRef.current) {
          mapRef.current?.getCamera().then((camera) => {
            if (camera.center) {
              mapRef.current?.animateToRegion({
                latitude: camera.center.latitude,
                longitude: camera.center.longitude,
                latitudeDelta: newLatitudeDelta,
                longitudeDelta: newLongitudeDelta,
              }, 300);
            }
          });
        }
      });
    }
  };

  // Show empty state when filters return no results
  if (hasNoResults) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateWrapper}>
          <EmptyState
            title="No campgrounds found"
            message={
              showBookmarked
                ? 'No bookmarked campgrounds found. Bookmark campgrounds to see them here.'
                : searchInput.trim().length >= 2
                ? `No campgrounds match "${searchInput.trim()}". Try adjusting your search or filters.`
                : `No ${selectedHookupType === 'full' ? 'full hookup' : selectedHookupType === 'partial' ? 'partial hookup' : selectedHookupType === 'none' ? 'no hookup' : ''} campgrounds found. Try adjusting your filters.`
            }
            icon="map-outline"
          />
        </View>
        <View 
          style={[
            styles.filtersContainer, 
            { 
              paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
              bottom: keyboardHeight > 0 ? keyboardHeight : 0,
              backgroundColor: theme.filterBarBackground,
              borderTopColor: theme.filterBarBorder,
              shadowColor: theme.primary,
            }
          ]}
          pointerEvents="box-none"
          onStartShouldSetResponder={() => false}
        >
          <View style={styles.searchRow}>
            <FilterButton
              selectedHookupType={selectedHookupType}
              onHookupTypeChange={handleHookupTypeChange}
              showBookmarked={false}
              onBookmarkedChange={() => {}}
            />
            <SearchBar
              value={searchInput}
              onChangeText={handleSearchChange}
              onSubmit={handleSearchSubmit}
              onClear={handleClearSearch}
              autoFocus={searchInput.length > 0}
            />
          </View>
        </View>
      </View>
    );
  }

  const handleLocationPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 2,
          longitudeDelta: 2,
        },
        1000
      );
    } catch (error) {
      Alert.alert('Error', 'Unable to get your location.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper} pointerEvents="box-none">
        <CampgroundMap
          key={`map-${campgrounds.length}-${searchInput.trim()}-${selectedHookupType}-${showBookmarked}`}
          campgrounds={Array.isArray(campgrounds) ? campgrounds : []}
          onMarkerPress={handleCampgroundSelect}
          onMapPress={handleMapPress}
          mapRef={mapRef}
          onRegionChangeComplete={(region) => {
            // Track current region to preserve zoom level when centering campgrounds
            currentRegionRef.current = {
              latitudeDelta: region.latitudeDelta,
              longitudeDelta: region.longitudeDelta,
            };
          }}
        />
        {!selectedCampground && (
          <>
            <TouchableOpacity
              style={[
                styles.suggestButton,
                {
                  top: insets.top + 16,
                  left: 16,
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={handleSuggestCampground}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.mapControlIcon} />
              <Text style={[styles.suggestButtonText, { color: theme.mapControlIcon }]}>
                Suggest a campground
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeButton, 
                { 
                  top: insets.top + 16,
                  right: 16 + 48 + 12,
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={resolvedThemeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} 
                size={24} 
                color={theme.mapControlIcon} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.settingsButton, 
                { 
                  top: insets.top + 16,
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={() => setShowSettings(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color={theme.mapControlIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.logoButton, 
                { 
                  top: insets.top + 16 + 48 + 16, 
                  right: 16,
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={() => Linking.openURL('https://chambersontheroad.com').catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the website.');
              })}
              activeOpacity={0.7}
            >
              <Image
                source={require('../assets/chambers-logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Failed to load chambers logo:', error);
                  // Fallback to icon if logo fails to load
                }}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
      {!selectedCampground && (
        <>
          {/* GPS, Zoom, and Bookmark buttons - always in same position */}
          <View
            style={[
              styles.locationButtonContainer,
              {
                bottom: keyboardHeight > 0 
                  ? keyboardHeight + buttonSpacing 
                  : (insets.bottom + buttonSpacing),
              },
            ]}
            pointerEvents="box-none"
            collapsable={false}
            removeClippedSubviews={false}
          >
            {/* Remaining Views Badge - above GPS button */}
            {!isPremium && remainingViews !== null && (
              <TouchableOpacity
                style={[
                  styles.remainingViewsBadge,
                  {
                    backgroundColor: theme.primary,
                    marginBottom: 24,
                  }
                ]}
                onPress={handleResetViews}
                activeOpacity={0.7}
                disabled={Constants.executionEnvironment === 'standalone'}
              >
                <Ionicons name="eye-outline" size={16} color={theme.buttonText} style={styles.remainingViewsIcon} />
                <Text style={[styles.remainingViewsText, { color: theme.buttonText }]}>
                  {remainingViews} free {remainingViews === 1 ? 'campground' : 'campgrounds'} left
                </Text>
              </TouchableOpacity>
            )}
            <LocationButton onPress={handleLocationPress} />
          </View>
          <View
            style={[
              styles.zoomButtonsContainer,
              {
                bottom: keyboardHeight > 0 
                  ? keyboardHeight + buttonSpacing 
                  : (insets.bottom + buttonSpacing),
              },
            ]}
            pointerEvents="box-none"
            collapsable={false}
            removeClippedSubviews={false}
          >
            <TouchableOpacity
              style={[
                styles.zoomButton,
                {
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.mapControlIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.zoomButton,
                {
                  backgroundColor: theme.mapControlBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color={theme.mapControlIcon} />
            </TouchableOpacity>
          </View>
          {hasBookmarks && (
            <View
              style={[
                styles.bookmarkButtonContainer,
                {
                  bottom: keyboardHeight > 0 
                    ? keyboardHeight + buttonSpacing 
                    : (insets.bottom + buttonSpacing),
                },
              ]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={[
                  styles.bookmarkMapButton,
                  {
                    backgroundColor: showBookmarked ? theme.primary : theme.mapControlBackground,
                    shadowColor: theme.shadow,
                  }
                ]}
                onPress={() => setShowBookmarked(!showBookmarked)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color={showBookmarked ? theme.buttonText : theme.mapControlIcon} 
                />
              </TouchableOpacity>
            </View>
          )}
          {/* Result count badge - only shown when filters active */}
          {hasActiveFilters && campgrounds.length > 0 && (
            <ResultCountBadge 
              count={campgrounds.length} 
              total={allCampgrounds.length}
              gpsButtonBottom={
                keyboardHeight > 0 
                  ? keyboardHeight + buttonSpacing 
                  : insets.bottom + buttonSpacing
              }
            />
          )}
          <View
            style={[
              styles.filtersContainer,
              {
                paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                backgroundColor: theme.filterBarBackground,
                borderTopColor: theme.filterBarBorder,
                shadowColor: theme.primary,
              },
            ]}
            pointerEvents="box-none"
            onStartShouldSetResponder={() => false}
          >
            <View style={styles.searchRow}>
              <FilterButton
                selectedHookupType={selectedHookupType}
                onHookupTypeChange={setSelectedHookupType}
                showBookmarked={false}
                onBookmarkedChange={() => {}}
              />
              <SearchBar
                value={searchInput}
                onChangeText={handleSearchChange}
                onSubmit={handleSearchSubmit}
                onClear={handleClearSearch}
              />
            </View>
          </View>
        </>
      )}
      <CampgroundBottomSheet
        campground={selectedCampground}
        onClose={() => setSelectedCampground(null)}
        onBookmarkChange={refreshBookmarks}
      />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
          // Subscription status will update automatically via listener
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    // Allow touches to pass through to map, but children can still receive touches
  },
  emptyStateWrapper: {
    flex: 1,
    paddingBottom: 80, // Leave space for search bar at bottom
  },
  filtersContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2, // Reduced from 5 to minimize Android 12 touch target expansion
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookmarkFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 44,
  },
  locationButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
    // Ensure container doesn't create touch-blocking area on Android 12
    backgroundColor: 'transparent',
  },
  zoomButtonsContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    flexDirection: 'column',
    gap: 16,
    alignItems: 'flex-end',
  },
  bookmarkButtonContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
  bookmarkMapButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoButton: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  themeButton: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestButton: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  remainingViewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  remainingViewsIcon: {
    marginRight: 6,
  },
  remainingViewsText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

