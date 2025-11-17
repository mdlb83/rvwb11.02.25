import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Keyboard, Alert, TouchableOpacity, AppState } from 'react-native';
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

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHookupType, setSelectedHookupType] = useState<'full' | 'partial' | 'all'>('all');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [hasBookmarks, setHasBookmarks] = useState(false);
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Safely ensure searchQuery is always a string
  const safeSearchQuery = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  
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

  // Refresh bookmarks when app comes back to focus (e.g., after bookmarking)
  useEffect(() => {
    const refreshBookmarks = async () => {
      const bookmarks = await getBookmarks();
      setHasBookmarks(bookmarks.length > 0);
      if (showBookmarked) {
        setBookmarkedIds(bookmarks);
        // If filtering by bookmarks but no bookmarks exist, turn off the filter
        if (bookmarks.length === 0) {
          setShowBookmarked(false);
        }
      }
    };
    
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
  }, [showBookmarked]);

  // Memoize filters object to prevent unnecessary recalculations in useCampgrounds
  // Only create new object if values actually changed
  // Only apply search filter if query is at least 2 characters to reduce rapid recalculations
  const filters: CampgroundFilters = useMemo(() => {
    const filterObj: CampgroundFilters = {
      hookupType: selectedHookupType,
    };
    // Only filter by search if query is at least 2 characters
    // This prevents rapid recalculations when typing single characters
    if (safeSearchQuery.length >= 2) {
      filterObj.searchQuery = safeSearchQuery;
    }
    if (showBookmarked && bookmarkedIds.length > 0) {
      filterObj.bookmarked = true;
      filterObj.bookmarkedIds = bookmarkedIds;
      console.log('Filtering with bookmarkedIds:', bookmarkedIds, 'count:', bookmarkedIds.length);
    } else if (showBookmarked && bookmarkedIds.length === 0) {
      // Don't apply bookmark filter if we don't have any bookmarked IDs yet
      // This prevents filtering out everything while bookmarks are loading
      console.log('Bookmark filter enabled but no bookmarked IDs loaded yet');
    }
    return filterObj;
  }, [selectedHookupType, safeSearchQuery, showBookmarked, bookmarkedIds]);

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
  
  // Check if we have active filters
  const safeSearchQueryForFilter = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  const hasActiveFilters = selectedHookupType !== 'all' || safeSearchQueryForFilter.length > 0 || showBookmarked;
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

  // Zoom to search/filter results when they change
  useEffect(() => {
    // If filters are cleared, zoom out to show all campgrounds
    if (!hasActiveFilters && !loading && !error && allCampgrounds.length > 0) {
      const currentFilterState = 'no-filters';
      if (lastFilterStateRef.current === currentFilterState) {
        return; // Already zoomed to show all
      }
      
      // Debounce to prevent rapid zoom changes
      const timeoutId = setTimeout(() => {
        if (isZoomingRef.current) {
          return;
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

    const safeSearchQueryForZoom = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    const currentFilterState = `${selectedHookupType}-${safeSearchQueryForZoom}-${showBookmarked ? 'bookmarked' : 'all'}`;
    
    // Skip if we've already zoomed for this filter state
    if (lastFilterStateRef.current === currentFilterState) {
      return;
    }

    // Debounce zoom during rapid typing to prevent crashes
    // Increased debounce time to 500ms to better handle rapid typing
    const timeoutId = setTimeout(() => {
      // Prevent multiple simultaneous zoom operations
      if (isZoomingRef.current) {
        return;
      }

      // Double-check filter state hasn't changed during debounce
      const latestSafeSearchQuery = typeof searchQuery === 'string' ? searchQuery.trim() : '';
      const latestFilterState = `${selectedHookupType}-${latestSafeSearchQuery}-${showBookmarked ? 'bookmarked' : 'all'}`;
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
                setSelectedCampground(singleCampground);
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
  }, [campgrounds, hasActiveFilters, selectedHookupType, searchQuery, showBookmarked, loading, error, keyboardHeight, allCampgrounds]);

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
            setSelectedCampground(campground);
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
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
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

  // Show loading state
  if (loading) {
    return <LoadingState />;
  }

  // Show error state
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

  const handleClearSearch = () => {
    setSearchQuery('');
    // Reset filter state ref so zoom can happen again if filters are re-applied
    lastFilterStateRef.current = '';
  };

  // Safely handle search query changes - ensure it's always a string
  const handleSearchChange = (text: string) => {
    try {
      // Ensure text is always a string, default to empty string if not
      const safeText = typeof text === 'string' ? text : '';
      setSearchQuery(safeText);
    } catch (err) {
      console.error('Error in handleSearchChange:', err, { text });
      // Set to empty string on error to prevent crash
      setSearchQuery('');
    }
  };

  const handleMapPress = () => {
    Keyboard.dismiss();
  };

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
    // Safely get search query for display
    const safeSearchQuery = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateWrapper}>
          <EmptyState
            title="No campgrounds found"
            message={
              showBookmarked
                ? 'No bookmarked campgrounds found. Bookmark campgrounds to see them here.'
                : safeSearchQuery.length > 0
                ? `No campgrounds match "${safeSearchQuery}". Try adjusting your search or filters.`
                : `No ${selectedHookupType === 'full' ? 'full hookup' : 'partial hookup'} campgrounds found. Try adjusting your filters.`
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
              backgroundColor: 'rgba(240, 255, 242, 0.7)', // Frosted glass with subtle green tint - more transparent
            }
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
            {hasBookmarks && (
              <TouchableOpacity
                style={[
                  styles.bookmarkFilterButton,
                  showBookmarked && styles.bookmarkFilterButtonActive,
                ]}
                onPress={() => setShowBookmarked(!showBookmarked)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showBookmarked ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={showBookmarked ? '#fff' : '#666'}
                />
              </TouchableOpacity>
            )}
            <SearchBar
              value={typeof searchQuery === 'string' ? searchQuery : ''}
              onChangeText={handleSearchChange}
              onClear={handleClearSearch}
              autoFocus={safeSearchQuery.length > 0}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleSuggestCampground}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
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
          latitudeDelta: 8,
          longitudeDelta: 8,
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
          campgrounds={Array.isArray(campgrounds) ? campgrounds : []}
          onMarkerPress={setSelectedCampground}
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
          <TouchableOpacity
            style={[styles.settingsButton, { top: insets.top + 16 }]}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>
      {!selectedCampground && (
        <>
          {hasActiveFilters && campgrounds.length > 0 && (
            <>
              <View
                style={[
                  styles.locationButtonContainer,
                  {
                    // Badge bottom = filtersBottom + 60 + 12
                    // Badge top = badgeBottom - 32 = filtersBottom + 60 + 12 - 32 = filtersBottom + 40
                    // GPS button bottom = badgeTop + 12 = filtersBottom + 40 + 12 = filtersBottom + 52
                    bottom: (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + 52,
                  },
                ]}
                pointerEvents="box-none"
                collapsable={false}
                removeClippedSubviews={false}
              >
                <LocationButton onPress={handleLocationPress} />
              </View>
              <View
                style={[
                  styles.zoomButtonsContainer,
                  {
                    // Position minus button at same height as GPS button
                    // GPS button bottom = filtersBottom + 52
                    // Minus button center should align with GPS button center
                    // GPS button is 44px tall, so center is at bottom - 22
                    // Minus button is 44px tall, so bottom should be at GPS center + 22 = GPS bottom
                    bottom: (keyboardHeight > 0 ? keyboardHeight : insets.bottom) + 52,
                  },
                ]}
                pointerEvents="box-none"
                collapsable={false}
                removeClippedSubviews={false}
              >
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomIn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomOut}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color="#333" />
                </TouchableOpacity>
              </View>
              <ResultCountBadge 
                count={campgrounds.length} 
                total={allCampgrounds.length}
                gpsButtonBottom={
                  keyboardHeight > 0 
                    ? keyboardHeight 
                    : insets.bottom
                }
              />
            </>
          )}
          {(!hasActiveFilters || campgrounds.length === 0) && (
            <>
              <View
                style={[
                  styles.locationButtonContainer,
                  {
                    bottom: keyboardHeight > 0 
                      ? keyboardHeight + 80 
                      : (insets.bottom + 80),
                  },
                ]}
                pointerEvents="box-none"
                collapsable={false}
                removeClippedSubviews={false}
              >
                <LocationButton onPress={handleLocationPress} />
              </View>
              <View
                style={[
                  styles.zoomButtonsContainer,
                  {
                    bottom: keyboardHeight > 0 
                      ? keyboardHeight + 80 
                      : (insets.bottom + 80),
                  },
                ]}
                pointerEvents="box-none"
                collapsable={false}
                removeClippedSubviews={false}
              >
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomIn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomOut}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </>
          )}
          <View
            style={[
              styles.filtersContainer,
              {
                paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
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
              {hasBookmarks && (
                <TouchableOpacity
                  style={[
                    styles.bookmarkFilterButton,
                    showBookmarked && styles.bookmarkFilterButtonActive,
                  ]}
                  onPress={() => setShowBookmarked(!showBookmarked)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showBookmarked ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={showBookmarked ? '#fff' : '#666'}
                  />
                </TouchableOpacity>
              )}
              <SearchBar
                value={typeof searchQuery === 'string' ? searchQuery : ''}
                onChangeText={handleSearchChange}
                onClear={handleClearSearch}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSuggestCampground}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
      <CampgroundBottomSheet
        campground={selectedCampground}
        onClose={() => setSelectedCampground(null)}
      />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
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
    backgroundColor: 'rgba(240, 255, 242, 0.7)', // Frosted glass with subtle green tint - more transparent
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.2)', // Subtle green border at top
    shadowColor: '#4CAF50', // Green shadow to match app theme
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 44,
  },
  bookmarkFilterButtonActive: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#4CAF50',
    minWidth: 44, // Match filter button minimum width
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
    gap: 8,
    alignItems: 'flex-end',
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

