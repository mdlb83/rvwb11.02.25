import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampgrounds, CampgroundFilters } from '../hooks/useCampgrounds';
import { CampgroundEntry } from '../types/campground';
import CampgroundMap from '../components/map/CampgroundMap';
import CampgroundBottomSheet from '../components/map/CampgroundBottomSheet';
import SearchBar from '../components/filters/SearchBar';
import FilterButton from '../components/filters/FilterButton';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHookupType, setSelectedHookupType] = useState<'full' | 'partial' | 'all'>('all');
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);

  const filters: CampgroundFilters = {
    hookupType: selectedHookupType,
    searchQuery: searchQuery.trim() || undefined,
  };

  const { campgrounds, loading } = useCampgrounds(filters);

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

  return (
    <View style={styles.container}>
      <View style={[styles.filtersContainer, { paddingTop: insets.top }]}>
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
      <CampgroundMap
        campgrounds={campgrounds}
        onMarkerPress={setSelectedCampground}
      />
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
  filtersContainer: {
    backgroundColor: '#fff',
    zIndex: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
});

