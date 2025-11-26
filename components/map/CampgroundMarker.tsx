import React, { memo } from 'react';
import { Marker, Callout } from 'react-native-maps';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CampgroundEntry } from '../../types/campground';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import { generateCampgroundIdFromEntry } from '../../utils/dataLoader';

interface CampgroundMarkerProps {
  campground: CampgroundEntry;
  onPress: () => void;
}

function CampgroundMarker({ campground, onPress }: CampgroundMarkerProps) {
  const { theme } = useTheme();
  const { isPremium } = useSubscription();
  
  const getMarkerColor = () => {
    return campground.hookup_type === 'full' ? theme.primary : theme.warning;
  };

  // Handle null campground data
  if (!campground.campground || !campground.latitude || !campground.longitude) {
    return null;
  }

  const campgroundName = campground.campground.name || `${campground.city}, ${campground.state}`;
  const locationText = `${campground.city}, ${campground.state}`;

  // On Android, use default callout so title shows, then auto-open bottom sheet
  // Only show title/description if premium
  if (Platform.OS === 'android') {
    return (
      <Marker
        coordinate={{
          latitude: campground.latitude,
          longitude: campground.longitude,
        }}
        pinColor={getMarkerColor()}
        title={isPremium ? campgroundName : undefined}
        description={isPremium ? locationText : undefined}
        onPress={onPress}
      />
    );
  }

  // On iOS, use custom callout (only show if premium)
  return (
    <Marker
      coordinate={{
        latitude: campground.latitude,
        longitude: campground.longitude,
      }}
      pinColor={getMarkerColor()}
      title={isPremium ? campgroundName : undefined}
      description={isPremium ? locationText : undefined}
      onPress={onPress}
    >
      {isPremium && (
        <Callout tooltip>
          <View style={styles.calloutWrapper}>
            <View style={[
              styles.calloutContainer,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
              }
            ]}>
              <Text style={[styles.calloutTitle, { color: theme.text }]}>
                {campground.campground.name || `${campground.city}, ${campground.state}`}
              </Text>
              <Text style={[styles.calloutDescription, { color: theme.textSecondary }]}>
                {campground.city}, {campground.state}
              </Text>
            </View>
            <View style={[
              styles.calloutPointer,
              {
                borderTopColor: theme.surface,
                shadowColor: theme.shadow,
              }
            ]} />
          </View>
        </Callout>
      )}
    </Marker>
  );
}

const styles = StyleSheet.create({
  calloutWrapper: {
    alignItems: 'center',
  },
  calloutContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    alignItems: 'center',
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
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    marginTop: -1, // Overlap slightly with container
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  calloutDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
});

// Memoize to prevent unnecessary re-renders
// Only re-render if campground ID changes (campground moved or data changed)
export default memo(CampgroundMarker, (prevProps, nextProps) => {
  const prevId = generateCampgroundIdFromEntry(prevProps.campground);
  const nextId = generateCampgroundIdFromEntry(nextProps.campground);
  // Return true if props are equal (skip re-render), false if different (re-render)
  return prevId === nextId && prevProps.onPress === nextProps.onPress;
});

