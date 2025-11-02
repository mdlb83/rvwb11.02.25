import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useCampgrounds } from '../hooks/useCampgrounds';
import { CampgroundEntry } from '../types/campground';
import CampgroundMap from '../components/map/CampgroundMap';
import CampgroundBottomSheet from '../components/map/CampgroundBottomSheet';

export default function MapScreen() {
  const { campgrounds, loading } = useCampgrounds();
  const [selectedCampground, setSelectedCampground] = useState<CampgroundEntry | null>(null);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CampgroundMap
        campgrounds={campgrounds}
        onMarkerPress={setSelectedCampground}
      />
      {selectedCampground && (
        <CampgroundBottomSheet
          campground={selectedCampground}
          onClose={() => setSelectedCampground(null)}
        />
      )}
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
});

