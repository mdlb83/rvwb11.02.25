import React from 'react';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';
import { CampgroundEntry } from '../../types/campground';

interface CampgroundMarkerProps {
  campground: CampgroundEntry;
  onPress: () => void;
}

export default function CampgroundMarker({ campground, onPress }: CampgroundMarkerProps) {
  const getMarkerColor = () => {
    return campground.hookup_type === 'full' ? '#4CAF50' : '#FF9800';
  };

  // Handle null campground data
  if (!campground.campground || !campground.latitude || !campground.longitude) {
    return null;
  }

  return (
    <Marker
      coordinate={{
        latitude: campground.latitude,
        longitude: campground.longitude,
      }}
      pinColor={getMarkerColor()}
      onPress={onPress}
    >
      <Callout tooltip>
        <View style={styles.calloutWrapper}>
          <View style={styles.calloutContainer}>
            <Text style={styles.calloutTitle}>
              {campground.campground.name || `${campground.city}, ${campground.state}`}
            </Text>
            <Text style={styles.calloutDescription}>
              {campground.city}, {campground.state}
            </Text>
          </View>
          <View style={styles.calloutPointer} />
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  calloutWrapper: {
    alignItems: 'center',
  },
  calloutContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 0,
    borderLeftWidth: 8,
    borderTopColor: '#fff',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    marginTop: -1, // Overlap slightly with container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

