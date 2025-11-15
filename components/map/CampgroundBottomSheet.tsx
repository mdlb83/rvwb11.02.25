import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CampgroundEntry } from '../../types/campground';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import { getMapAppUrl, getMapAppName, MapApp } from '../../utils/mapAppPreferences';
import MapAppPickerModal from '../settings/MapAppPickerModal';
import MapReturnInstructionsModal from './MapReturnInstructionsModal';

interface CampgroundBottomSheetProps {
  campground: CampgroundEntry | null;
  onClose: () => void;
}

export default function CampgroundBottomSheet({ campground, onClose }: CampgroundBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  // Adjusted snap points to ensure buttons are visible: 30% peek, 65% default (shows buttons), 90% expanded
  const snapPoints = useMemo(() => ['30%', '65%', '90%'], []);
  const { preference, loading, savePreference } = useMapAppPreference();
  const [showPicker, setShowPicker] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [pendingAction, setPendingAction] = useState<'directions' | 'search' | null>(null);
  const [pendingMapApp, setPendingMapApp] = useState<MapApp | null>(null);

  // Generate a unique ID for the campground for deep linking
  const campgroundId = useMemo(() => {
    if (!campground) return '';
    const name = campground.campground?.name || '';
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const sanitizedCity = campground.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${sanitizedCity}-${campground.state.toLowerCase()}-${sanitizedName}`;
  }, [campground]);

  // Determine initial snap index based on content
  // If campground has blog post, open at index 2 (90%) to show all content including buttons
  // Otherwise open at index 1 (65%) which should show buttons for most content
  const initialSnapIndex = useMemo(() => {
    if (!campground) return -1;
    // If there's a blog post, open at 90% to ensure buttons are visible
    if (campground.blog_post) {
      return 2; // 90%
    }
    return 1; // 65% - should show buttons for most content
  }, [campground]);

  // Determine if bottom sheet should be visible (index -1 = closed)
  const sheetIndex = useMemo(() => (campground ? initialSnapIndex : -1), [campground, initialSnapIndex]);

  // Update bottom sheet position when campground changes
  useEffect(() => {
    if (campground) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(initialSnapIndex);
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [campground, initialSnapIndex]);

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

  const handleGetDirections = async () => {
    if (!campground) return;

    // If no preference is set, show picker
    if (!preference && !loading) {
      setPendingAction('directions');
      setShowPicker(true);
      return;
    }

    const mapApp = preference || 'default';
    const actualApp = mapApp === 'default' ? (Platform.OS === 'ios' ? 'apple' : 'google') : mapApp;
    
    // Show instructions for Apple Maps and Waze (they don't support callback URLs)
    if (actualApp === 'apple' || actualApp === 'waze') {
      setPendingMapApp(actualApp);
      setPendingAction('directions');
      setShowInstructions(true);
      return;
    }

    // For Google Maps, add callback URL for easy return
    const url = getMapAppUrl(mapApp, 'directions', {
      latitude: campground.latitude,
      longitude: campground.longitude,
      campgroundId: campgroundId,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open maps:', err);
      // Fallback to web-based Google Maps
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`
      );
    });
  };

  const handleOpenMapAfterInstructions = () => {
    if (!campground || !pendingMapApp || !pendingAction) return;

    setShowInstructions(false);
    
    if (pendingAction === 'directions') {
      const url = getMapAppUrl(pendingMapApp, 'directions', {
        latitude: campground.latitude,
        longitude: campground.longitude,
        campgroundId: campgroundId,
      });
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open maps:', err);
      });
    } else if (pendingAction === 'search') {
      const campgroundName = campground.campground?.name || `${campground.city}, ${campground.state}`;
      const url = getMapAppUrl(pendingMapApp, 'search', {
        query: campgroundName,
        campgroundId: campgroundId,
      });
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open maps:', err);
      });
    }

    setPendingMapApp(null);
    setPendingAction(null);
  };

  const handleOpenInMaps = async () => {
    if (!campground) return;

    // If no preference is set, show picker
    if (!preference && !loading) {
      setPendingAction('search');
      setShowPicker(true);
      return;
    }

    const mapApp = preference || 'default';
    const actualApp = mapApp === 'default' ? (Platform.OS === 'ios' ? 'apple' : 'google') : mapApp;
    
    // Show instructions for Apple Maps and Waze (they don't support callback URLs)
    if (actualApp === 'apple' || actualApp === 'waze') {
      setPendingMapApp(actualApp);
      setPendingAction('search');
      setShowInstructions(true);
      return;
    }

    // For Google Maps, add callback URL for easy return
    const campgroundName = campground.campground?.name || `${campground.city}, ${campground.state}`;
    const url = getMapAppUrl(mapApp, 'search', {
      query: campgroundName,
      campgroundId: campgroundId,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open maps:', err);
      // Fallback to web-based Google Maps
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campgroundName)}`);
    });
  };

  const handleMapAppSelected = async (app: MapApp) => {
    await savePreference(app);

    // Execute the pending action if there was one
    if (pendingAction && campground) {
      const actualApp = app === 'default' ? (require('react-native').Platform.OS === 'ios' ? 'apple' : 'google') : app;
      
      // Show instructions for Apple Maps and Waze
      if (actualApp === 'apple' || actualApp === 'waze') {
        setPendingMapApp(actualApp);
        setShowPicker(false);
        setShowInstructions(true);
        return;
      }

      // For Google Maps, open directly with callback URL
      if (pendingAction === 'directions') {
        const url = getMapAppUrl(app, 'directions', {
          latitude: campground.latitude,
          longitude: campground.longitude,
          campgroundId: campgroundId,
        });
        Linking.openURL(url).catch((err) => {
          console.error('Failed to open maps:', err);
        });
      } else if (pendingAction === 'search') {
        const campgroundName = campground.campground?.name || `${campground.city}, ${campground.state}`;
        const url = getMapAppUrl(app, 'search', {
          query: campgroundName,
          campgroundId: campgroundId,
        });
        Linking.openURL(url).catch((err) => {
          console.error('Failed to open maps:', err);
        });
      }
      setPendingAction(null);
    } else {
      setShowPicker(false);
    }
  };

  const handleReportProblem = () => {
    if (!campground) return;
    const campgroundName = campground.campground?.name || `${campground.city}, ${campground.state}`;
    const subject = encodeURIComponent(`Problem Report: ${campgroundName}`);
    const body = encodeURIComponent(
      `I'm reporting a problem with the following campground:\n\n` +
      `Campground: ${campgroundName}\n` +
      `Location: ${campground.city}, ${campground.state}\n\n` +
      `Problem details:\n\n`
    );
    const emailUrl = `mailto:dcbc3705@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(emailUrl).catch((err) => {
      console.error('Failed to open email:', err);
    });
  };

  const handleSuggestCampground = () => {
    const subject = encodeURIComponent('Suggest a New Campground');
    const body = encodeURIComponent(
      `I'd like to suggest adding the following campground:\n\n` +
      `Campground Name:\n` +
      `Location (City, State):\n` +
      `Hookup Type (Full/Partial):\n` +
      `Campground Website/Info:\n` +
      `Nearby Bike Trails:\n` +
      `Additional Notes:\n\n`
    );
    const emailUrl = `mailto:dcbc3705@gmail.com?subject=${subject}&body=${body}`;
    Linking.openURL(emailUrl).catch((err) => {
      console.error('Failed to open email:', err);
    });
  };

  const renderHtmlContent = (html: string) => {
    // Handle nested links by parsing with a stack to track nesting depth
    interface LinkTag {
      url: string;
      startIndex: number;
      endIndex: number;
      depth: number;
    }

    const linkStack: LinkTag[] = [];
    const elements: (string | { text: string; url: string })[] = [];
    
    // Find all opening and closing <a> tags
    const openTagRegex = /<a\s+href=['"]([^'"]+)['"][^>]*>/gi;
    const closeTagRegex = /<\/a>/gi;
    
    // Collect all tag positions
    const tags: Array<{ type: 'open' | 'close'; index: number; url?: string }> = [];
    
    let match;
    while ((match = openTagRegex.exec(html)) !== null) {
      tags.push({ type: 'open', index: match.index, url: match[1] });
    }
    
    while ((match = closeTagRegex.exec(html)) !== null) {
      tags.push({ type: 'close', index: match.index });
    }
    
    // Sort tags by position
    tags.sort((a, b) => a.index - b.index);
    
    // Process tags to build link hierarchy
    let lastIndex = 0;
    let currentDepth = 0;
    const linkRanges: Array<{ url: string; start: number; end: number; depth: number }> = [];
    
    for (const tag of tags) {
      if (tag.type === 'open' && tag.url) {
        // Add text before this tag if any
        if (tag.index > lastIndex) {
          const textBefore = html.substring(lastIndex, tag.index);
          if (textBefore.trim()) {
            elements.push(textBefore);
          }
        }
        
        linkStack.push({
          url: tag.url,
          startIndex: tag.index,
          endIndex: -1,
          depth: currentDepth,
        });
        currentDepth++;
        lastIndex = tag.index + html.substring(tag.index).match(/<a\s+href=['"]([^'"]+)['"][^>]*>/)![0].length;
      } else if (tag.type === 'close') {
        if (linkStack.length > 0) {
          const link = linkStack.pop()!;
          link.endIndex = tag.index;
          linkRanges.push({
            url: link.url,
            start: link.startIndex,
            end: tag.index + 4, // +4 for </a>
            depth: link.depth,
          });
          currentDepth--;
          lastIndex = tag.index + 4;
        }
      }
    }
    
    // Add remaining text after last tag
    if (lastIndex < html.length) {
      const textAfter = html.substring(lastIndex);
      if (textAfter.trim()) {
        elements.push(textAfter);
      }
    }
    
    // Now build the final elements using only outermost links
    if (linkRanges.length === 0) {
      // No links found, return plain text
      return <Text style={styles.htmlText}>{html.replace(/<[^>]*>/g, '')}</Text>;
    }
    
    // Sort ranges by start position and filter to only outermost (depth 0)
    const outermostLinks = linkRanges
      .filter(link => link.depth === 0)
      .sort((a, b) => a.start - b.start);
    
    // Rebuild the content using outermost links only
    const finalElements: (string | { text: string; url: string })[] = [];
    let currentPos = 0;
    
    for (const link of outermostLinks) {
      // Add text before this link
      if (link.start > currentPos) {
        const textBefore = html.substring(currentPos, link.start);
        // Remove any inner <a> tags from this text
        const cleanedText = textBefore.replace(/<a\s+href=['"]([^'"]+)['"][^>]*>/gi, '').replace(/<\/a>/gi, '');
        if (cleanedText.trim()) {
          finalElements.push(cleanedText);
        }
      }
      
      // Extract link text (removing inner <a> tags)
      const linkContent = html.substring(link.start, link.end);
      const linkText = linkContent
        .replace(/<a\s+href=['"]([^'"]+)['"][^>]*>/gi, '')
        .replace(/<\/a>/gi, '')
        .trim();
      
      if (linkText) {
        finalElements.push({ text: linkText, url: link.url });
      }
      
      currentPos = link.end;
    }
    
    // Add remaining text
    if (currentPos < html.length) {
      const remainingText = html.substring(currentPos).replace(/<a\s+href=['"]([^'"]+)['"][^>]*>/gi, '').replace(/<\/a>/gi, '');
      if (remainingText.trim()) {
        finalElements.push(remainingText);
      }
    }
    
    // If no links were processed, fall back to stripping all HTML
    if (finalElements.length === 0) {
      return <Text style={styles.htmlText}>{html.replace(/<[^>]*>/g, '')}</Text>;
    }

    return (
      <Text style={styles.htmlText}>
        {finalElements.map((item, index) => {
          if (typeof item === 'string') {
            return item;
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
        })}
      </Text>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={sheetIndex}
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
      <BottomSheetScrollView 
        contentContainerStyle={styles.contentContainer}
        style={styles.scrollView}
      >
        {campground ? (
          <>
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
                {renderHtmlContent(trail.description)}
              </View>
            ))}
          </View>
        )}

        {campground.blog_post && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Blog Post</Text>
            <View style={styles.blogPostContainer}>
              {renderHtmlContent(campground.blog_post)}
            </View>
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.actionButton, styles.directionsButton]} onPress={handleGetDirections}>
                <Text style={styles.actionButtonText}>Get Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.openMapsButton]} onPress={handleOpenInMaps}>
                <Text style={styles.actionButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.settingsButtonText}>⚙️ Change Map App</Text>
            </TouchableOpacity>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>Help Improve This App</Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={handleReportProblem}
                >
                  <Text style={styles.feedbackButtonText}>📧 Report a Problem</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feedbackButton}
                  onPress={handleSuggestCampground}
                >
                  <Text style={styles.feedbackButtonText}>➕ Suggest a Campground</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}
      </BottomSheetScrollView>
      <MapAppPickerModal
        visible={showPicker}
        currentApp={preference}
        onSelect={handleMapAppSelected}
        onClose={() => {
          setShowPicker(false);
          setPendingAction(null);
        }}
      />
      <MapReturnInstructionsModal
        visible={showInstructions}
        mapAppName={pendingMapApp ? getMapAppName(pendingMapApp) : ''}
        onClose={handleOpenMapAfterInstructions}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    width: '100%',
    maxWidth: '100%',
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
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    flexWrap: 'wrap',
    flexShrink: 1,
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
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  section: {
    marginBottom: 20,
    width: '100%',
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
    width: '100%',
    flexWrap: 'wrap',
  },
  htmlText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
    width: '100%',
    maxWidth: '100%',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  trailCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  trailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  trailInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  link: {
    color: '#2196F3',
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  blogPostContainer: {
    marginTop: 4,
  },
  contributorText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionsButton: {
    backgroundColor: '#2196F3',
  },
  openMapsButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 14,
    color: '#666',
  },
  feedbackSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  feedbackButtonText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
});

