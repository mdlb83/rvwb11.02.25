import React, { useRef, useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { CampgroundEntry } from '../../types/campground';
import CampgroundMarker from './CampgroundMarker';
import { useTheme } from '../../contexts/ThemeContext';
import { darkMapStyle, lightMapStyle } from '../../utils/mapStyles';
import { generateCampgroundIdFromEntry } from '../../utils/dataLoader';

interface CampgroundMapProps {
  campgrounds: CampgroundEntry[];
  onMarkerPress: (campground: CampgroundEntry) => void;
  onMapPress?: () => void;
  mapRef?: React.RefObject<MapView | null>;
  onRegionChangeComplete?: (region: Region) => void;
}

function CampgroundMap({ campgrounds, onMarkerPress, onMapPress, mapRef, onRegionChangeComplete }: CampgroundMapProps) {
  const { resolvedThemeMode, theme } = useTheme();
  const internalMapRef = useRef<MapView>(null);
  const mapRefToUse = mapRef || internalMapRef;
  const [isOffline, setIsOffline] = useState(false);

  const initialRegion: Region = {
    latitude: 39.8283, // Center of US
    longitude: -98.5795,
    latitudeDelta: 30,
    longitudeDelta: 40,
  };

  // Use dark map style when dark mode is enabled
  const mapStyle = resolvedThemeMode === 'dark' ? darkMapStyle : lightMapStyle;

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
    });

    // Check initial network state
    NetInfo.fetch().then(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Memoize valid campgrounds to prevent recalculation on every render
  // This helps prevent crashes during rapid filtering
  const validCampgrounds = useMemo(() => {
    if (!Array.isArray(campgrounds)) {
      return [];
    }
    
    return campgrounds.filter((campground) => {
      try {
        return (
          campground &&
          campground.campground && 
          typeof campground.latitude === 'number' &&
          typeof campground.longitude === 'number' &&
          !isNaN(campground.latitude) &&
          !isNaN(campground.longitude)
        );
      } catch (err) {
        console.error('Error validating campground:', err, campground);
        return false;
      }
    });
  }, [campgrounds]);

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
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={mapStyle}
        // Ensure all markers are rendered, not just those in visible region
        // This is important when showing all campgrounds after clearing filters
        removeClippedSubviews={false}
        // Android-specific optimizations for touch handling
        {...(Platform.OS === 'android' && {
          mapPadding: { top: 0, right: 0, bottom: 0, left: 0 },
          scrollEnabled: true,
          zoomEnabled: true,
          pitchEnabled: true,
          rotateEnabled: true,
        })}
      >
        {validCampgrounds.map((campground, index) => {
          try {
            // Validate campground before rendering
            if (!campground || !campground.campground || 
                typeof campground.latitude !== 'number' || 
                typeof campground.longitude !== 'number' ||
                isNaN(campground.latitude) || isNaN(campground.longitude)) {
              return null;
            }
            
            // Use generateCampgroundIdFromEntry for stable, unique keys
            // Fallback to index if ID generation fails
            let stableKey: string;
            try {
              stableKey = generateCampgroundIdFromEntry(campground);
              if (!stableKey) {
                stableKey = `marker-${index}-${campground.latitude}-${campground.longitude}`;
              }
            } catch (err) {
              stableKey = `marker-${index}-${campground.latitude}-${campground.longitude}`;
            }
            
            return (
              <CampgroundMarker
                key={stableKey}
                campground={campground}
                onPress={() => onMarkerPress(campground)}
              />
            );
          } catch (err) {
            console.error('Error rendering marker:', err, campground);
            return null;
          }
        })}
      </MapView>
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.warning }]}>
          <Text style={[styles.offlineText, { color: theme.text }]}>
            ⚠️ Offline - Using cached map data. Markers may not update.
          </Text>
        </View>
      )}
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
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingTop: Platform.OS === 'ios' ? 40 : 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Export directly without memoization to ensure re-renders when campgrounds change
export default CampgroundMap;

