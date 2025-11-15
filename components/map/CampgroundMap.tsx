import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { CampgroundEntry } from '../../types/campground';
import CampgroundMarker from './CampgroundMarker';

interface CampgroundMapProps {
  campgrounds: CampgroundEntry[];
  onMarkerPress: (campground: CampgroundEntry) => void;
  onMapPress?: () => void;
  mapRef?: React.RefObject<MapView | null>;
}

export default function CampgroundMap({ campgrounds, onMarkerPress, onMapPress, mapRef }: CampgroundMapProps) {
  const internalMapRef = useRef<MapView>(null);
  const mapRefToUse = mapRef || internalMapRef;

  const initialRegion: Region = {
    latitude: 39.8283, // Center of US
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 40,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRefToUse}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={onMapPress}
      >
        {campgrounds
          .filter((campground) => 
            campground.campground && 
            campground.latitude && 
            campground.longitude
          )
          .map((campground, index) => (
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

