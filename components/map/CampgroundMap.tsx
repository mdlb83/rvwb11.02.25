import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { CampgroundEntry } from '../../types/campground';
import CampgroundMarker from './CampgroundMarker';

interface CampgroundMapProps {
  campgrounds: CampgroundEntry[];
  onMarkerPress: (campground: CampgroundEntry) => void;
}

export default function CampgroundMap({ campgrounds, onMarkerPress }: CampgroundMapProps) {
  const mapRef = useRef<MapView>(null);

  const initialRegion: Region = {
    latitude: 39.8283, // Center of US
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 40,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {campgrounds.map((campground, index) => (
          <CampgroundMarker
            key={`${campground.city}-${campground.state}-${index}`}
            campground={campground}
            onPress={() => onMarkerPress(campground)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

