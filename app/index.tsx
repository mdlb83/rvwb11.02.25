import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
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

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHookupType, setSelectedHookupType] = useState<'full' | 'partial' | 'all'>('all');
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const filters: CampgroundFilters = {
    hookupType: selectedHookupType,
    searchQuery: searchQuery.trim() || undefined,
  };

  const [retryKey, setRetryKey] = useState(0);
  const { campgrounds, loading, error, allCampgrounds } = useCampgrounds(filters, retryKey);
  
  // Check if we have active filters
  const hasActiveFilters = selectedHookupType !== 'all' || searchQuery.trim().length > 0;
  const hasNoResults = !loading && !error && hasActiveFilters && campgrounds.length === 0;

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

  // Show empty state when filters return no results
  if (hasNoResults) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No campgrounds found"
          message={
            searchQuery.trim().length > 0
              ? `No campgrounds match "${searchQuery}". Try adjusting your search or filters.`
              : `No ${selectedHookupType === 'full' ? 'full hookup' : 'partial hookup'} campgrounds found. Try adjusting your filters.`
          }
          icon="map-outline"
        />
        <View style={[styles.filtersContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.searchRow}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={handleClearSearch}
            />
            <FilterButton
              selectedHookupType={selectedHookupType}
              onHookupTypeChange={setSelectedHookupType}
            />
          </View>
        </View>
      </View>
    );
  }

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleMapPress = () => {
    Keyboard.dismiss();
  };

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
      <TouchableWithoutFeedback onPress={handleMapPress}>
        <View style={styles.mapWrapper}>
          <CampgroundMap
            campgrounds={campgrounds}
            onMarkerPress={setSelectedCampground}
            onMapPress={handleMapPress}
            mapRef={mapRef}
          />
          {hasActiveFilters && campgrounds.length > 0 && (
            <ResultCountBadge count={campgrounds.length} total={allCampgrounds.length} />
          )}
        </View>
      </TouchableWithoutFeedback>
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
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={handleClearSearch}
              />
              <FilterButton
                selectedHookupType={selectedHookupType}
                onHookupTypeChange={setSelectedHookupType}
              />
            </View>
          </View>
        </>
      )}
      <CampgroundBottomSheet
        campground={selectedCampground}
        onClose={() => setSelectedCampground(null)}
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
  locationButtonContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
});

