import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Keyboard, Alert, TouchableOpacity } from 'react-native';
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
import SettingsModal from '../components/settings/SettingsModal';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHookupType, setSelectedHookupType] = useState<'full' | 'partial' | 'all'>('all');
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Safely ensure searchQuery is always a string
  const safeSearchQuery = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  
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
    return filterObj;
  }, [selectedHookupType, safeSearchQuery]);

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
  
  // Check if we have active filters
  const safeSearchQueryForFilter = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  const hasActiveFilters = selectedHookupType !== 'all' || safeSearchQueryForFilter.length > 0;
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
    // Only zoom if filters are active, we have results, and the filter state has changed
    if (!hasActiveFilters || campgrounds.length === 0 || loading || error) {
      return;
    }

    const safeSearchQueryForZoom = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    const currentFilterState = `${selectedHookupType}-${safeSearchQueryForZoom}`;
    
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
      const latestFilterState = `${selectedHookupType}-${latestSafeSearchQuery}`;
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
          // Use fitToCoordinates to zoom to all results
          // Add padding to ensure markers aren't at the edge
          // Wrap in try-catch to prevent crashes during rapid typing
          try {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: {
                top: 100,
                right: 50,
                bottom: 200,
                left: 50,
              },
              animated: true,
            });
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
  }, [campgrounds, hasActiveFilters, selectedHookupType, searchQuery, loading, error]);

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

  // Show empty state when filters return no results
  if (hasNoResults) {
    // Safely get search query for display
    const safeSearchQuery = typeof searchQuery === 'string' ? searchQuery.trim() : '';
    return (
      <View style={styles.container}>
        <EmptyState
          title="No campgrounds found"
          message={
            safeSearchQuery.length > 0
              ? `No campgrounds match "${safeSearchQuery}". Try adjusting your search or filters.`
              : `No ${selectedHookupType === 'full' ? 'full hookup' : 'partial hookup'} campgrounds found. Try adjusting your filters.`
          }
          icon="map-outline"
        />
        <View style={[styles.filtersContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.searchRow}>
            <FilterButton
              selectedHookupType={selectedHookupType}
              onHookupTypeChange={setSelectedHookupType}
            />
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
              <Ionicons name="add-circle" size={24} color="#4CAF50" />
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
        />
        {hasActiveFilters && campgrounds.length > 0 && (
          <ResultCountBadge count={campgrounds.length} total={allCampgrounds.length} />
        )}
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
          <View
            style={[
              styles.locationButtonContainer,
              {
                bottom: keyboardHeight > 0 
                  ? keyboardHeight + 80 
                  : (insets.bottom + 80),
              },
            ]}
          >
            <LocationButton onPress={handleLocationPress} />
          </View>
          <View
            style={[
              styles.filtersContainer,
              {
                paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
              },
            ]}
          >
            <View style={styles.searchRow}>
              <FilterButton
                selectedHookupType={selectedHookupType}
                onHookupTypeChange={setSelectedHookupType}
              />
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
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
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
  filtersContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButtonContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
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

