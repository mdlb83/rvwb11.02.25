import React from 'react';
import { Marker } from 'react-native-maps';
import { CampgroundEntry } from '../../types/campground';

interface CampgroundMarkerProps {
  campground: CampgroundEntry;
  onPress: () => void;
}

export default function CampgroundMarker({ campground, onPress }: CampgroundMarkerProps) {
  const getMarkerColor = () => {
    return campground.hookup_type === 'full' ? '#4CAF50' : '#FF9800';
  };

  return (
    <Marker
      coordinate={{
        latitude: campground.latitude,
        longitude: campground.longitude,
      }}
      title={campground.campground.name}
      description={`${campground.city}, ${campground.state}`}
      pinColor={getMarkerColor()}
      onPress={onPress}
    />
  );
}

