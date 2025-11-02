import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CampgroundEntry } from '../../types/campground';

interface CampgroundBottomSheetProps {
  campground: CampgroundEntry;
  onClose: () => void;
}

export default function CampgroundBottomSheet({ campground, onClose }: CampgroundBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

  useEffect(() => {
    // Small delay to ensure bottom sheet is mounted before expanding
    const timer = setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 100);
    return () => clearTimeout(timer);
  }, [campground]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={handleClose}
      />
    ),
    [handleClose]
  );

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`;
    Linking.openURL(url);
  };

  const renderHtmlContent = (html: string) => {
    // Simple HTML link extraction - in production, use a proper HTML renderer
    const linkRegex = /<a\s+href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/gi;
    let lastIndex = 0;
    const elements: (string | { text: string; url: string })[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        elements.push(html.substring(lastIndex, match.index));
      }
      elements.push({ text: match[2], url: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < html.length) {
      elements.push(html.substring(lastIndex));
    }

    return elements.map((item, index) => {
      if (typeof item === 'string') {
        return <Text key={index}>{item}</Text>;
      }
      return (
        <Text
          key={index}
          style={styles.link}
          onPress={() => Linking.openURL(item.url)}
        >
          {item.text}
        </Text>
      );
    });
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{campground.campground?.name || `${campground.city}, ${campground.state}`}</Text>
          <Text style={styles.subtitle}>
            {campground.city}, {campground.state}
          </Text>
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.badge,
                { backgroundColor: campground.hookup_type === 'full' ? '#4CAF50' : '#FF9800' },
              ]}
            >
              <Text style={styles.badgeText}>
                {campground.hookup_type === 'full' ? 'Full Hookup' : 'Partial Hookup'}
              </Text>
            </View>
            {campground.campground?.type && (
              <Text style={styles.typeText}>{campground.campground.type}</Text>
            )}
          </View>
        </View>

        {campground.campground && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campground Info</Text>
            <View style={styles.infoText}>
              {renderHtmlContent(campground.campground.info || 'No information available.')}
            </View>
            {campground.campground.notes && (
              <Text style={styles.notesText}>{campground.campground.notes}</Text>
            )}
          </View>
        )}

        {campground.trails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bike Trails</Text>
            {campground.trails.map((trail, index) => (
              <View key={index} style={styles.trailCard}>
                {trail.name && <Text style={styles.trailName}>{trail.name}</Text>}
                <Text style={styles.trailInfo}>
                  {trail.distance} • {trail.surface}
                </Text>
                <View style={styles.trailDescription}>
                  {renderHtmlContent(trail.description)}
                </View>
              </View>
            ))}
          </View>
        )}

        {campground.contributor && (
          <View style={styles.section}>
            <Text style={styles.contributorText}>
              📍 Submitted by {campground.contributor.name}
              {campground.contributor.location && ` from ${campground.contributor.location}`}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  handleIndicator: {
    backgroundColor: '#999',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  trailCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  trailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  trailInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  trailDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  link: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  contributorText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  directionsButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

