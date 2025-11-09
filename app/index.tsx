import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
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

  const { campgrounds, loading } = useCampgrounds(filters);

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

