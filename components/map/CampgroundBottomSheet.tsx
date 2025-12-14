import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, Image, ScrollView, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Asset } from 'expo-asset';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { CampgroundEntry } from '../../types/campground';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import { getMapAppUrl, getMapAppName, MapApp, getDontShowInstructionsPreference } from '../../utils/mapAppPreferences';
import { isBookmarked, toggleBookmark } from '../../utils/bookmarks';
import { getGoogleMapsDataForEntry } from '../../utils/googleMapsDataLoader';
import { GoogleMapsData } from '../../types/googleMapsData';
import MapAppPickerModal from '../settings/MapAppPickerModal';
import MapReturnInstructionsModal from './MapReturnInstructionsModal';
import PhotoViewerModal from './PhotoViewerModal';
import { useTheme } from '../../contexts/ThemeContext';
import { getPhotoUri, preloadCampgroundPhotos } from '../../utils/photoCache';
import { getBundledPhotoSource, hasBundledAsset } from '../../utils/bundledPhotoAssets';
import SubscriptionBlur from '../subscription/SubscriptionBlur';
import PaywallModal from '../subscription/PaywallModal';
import { useSubscription } from '../../hooks/useSubscription';
import { getViewCount } from '../../utils/campgroundViews';
import { SUBSCRIPTION_CONFIG } from '../../utils/subscriptionConfig';

/**
 * Calculate if a place is currently open based on weekdayText hours
 * 
 * NOTE: This function uses the device's local timezone and does NOT account for
 * timezone differences between the device and the place. For accurate results,
 * prefer using Google Places API's `openNow` value which is calculated server-side
 * and accounts for timezones correctly.
 * 
 * This is only used as a fallback when the API's `openNow` value is unavailable.
 */
function calculateOpenNow(weekdayText: string[]): boolean | undefined {
  if (!weekdayText || weekdayText.length === 0) {
    return undefined;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  // Map day names to day numbers (Sunday = 0)
  const dayNameMap: { [key: string]: number } = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
  };

  // Find today's hours
  const todayEntry = weekdayText.find(entry => {
    const dayName = entry.split(':')[0]?.trim().toLowerCase() || '';
    const dayNumber = dayNameMap[dayName];
    return dayNumber === currentDay;
  });

  if (!todayEntry) {
    return undefined; // No hours listed for today
  }

  // Parse hours (format: "Monday: 8:00 AM – 6:00 PM" or "Monday: Closed")
  const parts = todayEntry.split(':');
  if (parts.length < 2) {
    return undefined;
  }

  const hoursStr = parts.slice(1).join(':').trim();
  
  // Check if closed
  if (hoursStr.toLowerCase().includes('closed')) {
    return false;
  }

  // Parse time range (e.g., "8:00 AM – 6:00 PM")
  const timeRangeMatch = hoursStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeRangeMatch) {
    return undefined; // Can't parse format
  }

  const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeRangeMatch;

  // Convert to 24-hour format
  const parseTime = (hour: string, min: string, period: string): number => {
    let h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    
    if (period.toUpperCase() === 'PM' && h !== 12) {
      h += 12;
    } else if (period.toUpperCase() === 'AM' && h === 12) {
      h = 0;
    }
    
    return h * 60 + m;
  };

  const openTime = parseTime(openHour, openMin, openPeriod);
  const closeTime = parseTime(closeHour, closeMin, closePeriod);

  // Handle overnight hours (e.g., 10 PM – 2 AM)
  if (closeTime < openTime) {
    // Overnight: open until next day
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Same day: open between openTime and closeTime
    return currentTime >= openTime && currentTime <= closeTime;
  }
}

interface PendingMapAction {
  app: MapApp;
  action: 'directions' | 'search';
  campground: CampgroundEntry;
}

interface CampgroundBottomSheetProps {
  campground: CampgroundEntry | null;
  onClose: () => void;
  onBookmarkChange?: () => void; // Callback when bookmark is toggled
}

export default function CampgroundBottomSheet({ campground, onClose, onBookmarkChange }: CampgroundBottomSheetProps) {
  const { theme, resolvedThemeMode } = useTheme();
  const { isPremium, checkSubscription, syncPurchases } = useSubscription();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const contentBeforeSeparatorRef = useRef<View>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [remainingViews, setRemainingViews] = useState<number | null>(null);
  const [shouldShowBlur, setShouldShowBlur] = useState(false);


  // Refresh subscription status when paywall closes (in case purchase completed)
  useEffect(() => {
    if (!showPaywall) {
      // Retry logic to ensure subscription status is updated after purchase
      let retries = 3;
      const checkWithRetry = async () => {
        await checkSubscription();
        retries--;
        if (retries > 0) {
          setTimeout(checkWithRetry, 1000);
        }
      };
      // Initial delay to allow purchase to complete, then retry
      const timer = setTimeout(() => {
        checkWithRetry();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showPaywall, checkSubscription]);
  
  // Calculate snap points dynamically based on content height
  // Default snap points: 30% peek, calculated default (max 60% to prevent taking too much space), 90% expanded
  const snapPoints = useMemo(() => {
    if (contentHeight && campground) {
      const screenHeight = Dimensions.get('window').height;
      // Calculate percentage to show content up to separator (add small buffer)
      // Cap at 60% maximum to prevent taking too much space, especially on devices with large text
      const percentage = Math.min(60, Math.max(50, (contentHeight / screenHeight) * 100 + 2));
      return ['30%', `${percentage}%`, '90%'];
    }
    // Fallback to default snap points - capped at 60% for initial open
    return ['30%', '60%', '90%'];
  }, [contentHeight, campground]);
  const { preference, loading, savePreference, reload: reloadPreference } = useMapAppPreference();
  const [showPicker, setShowPicker] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [pendingAction, setPendingAction] = useState<'directions' | 'search' | null>(null);
  const [pendingMapApp, setPendingMapApp] = useState<MapApp | null>(null);
  const [dontShowInstructions, setDontShowInstructions] = useState(false);
  const [isBookmarkedState, setIsBookmarkedState] = useState(false);
  const [googleMapsData, setGoogleMapsData] = useState<GoogleMapsData | undefined>(undefined);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const isInteractingWithPhotosRef = useRef(false);
  // Use ref to store pending action immediately, avoiding React state update delays
  const pendingActionRef = useRef<PendingMapAction | null>(null);
  
  // Get Google Places API key for photo URLs
  const getPhotoUrl = useCallback((photoReference: string, placeId?: string) => {
    // Use Places API (New) photo endpoint
    // Format: places/{place_id}/photos/{photo_reference}/media
    const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
    const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
    const extraKey = Constants.expoConfig?.extra?.googleMapsApiKey;
    const apiKey = iosKey || androidKey || extraKey || '';
    
    console.log('🖼️ getPhotoUrl called:', {
      photoReference: photoReference?.substring(0, 30) + '...',
      placeId,
      hasIosKey: !!iosKey,
      hasAndroidKey: !!androidKey,
      hasExtraKey: !!extraKey,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length
    });
    
    if (!apiKey) {
      console.warn('⚠️ getPhotoUrl returning null: no API key');
      return null;
    }
    
    // Handle both old format (just photo ID) and new format (full path starting with "places/")
    let photoUrl: string;
    if (photoReference.startsWith('places/')) {
      // New format: photoReference already contains full path
      photoUrl = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&maxHeightPx=400&key=${apiKey}`;
    } else if (placeId) {
      // Old format: need to construct full path
      photoUrl = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoReference}/media?maxWidthPx=400&maxHeightPx=400&key=${apiKey}`;
    } else {
      console.warn('⚠️ getPhotoUrl returning null: no placeId for old format');
      return null;
    }
    
    console.log('✅ Generated photo URL:', photoUrl.substring(0, 100) + '...');
    return photoUrl;
  }, []);

  // Get photos from Google Maps data
  const allPhotos = useMemo(() => {
    return googleMapsData?.photos || [];
  }, [googleMapsData?.photos]);

  // State to track photo URIs (cached paths, URLs, or bundled require() results)
  const [photoUris, setPhotoUris] = useState<{ [index: number]: string | any }>({});

  // Preload photos when bottom sheet opens or campground changes
  useEffect(() => {
    if (!campgroundId || !googleMapsData?.photos || allPhotos.length === 0) {
      setPhotoUris({});
      return;
    }

    const loadPhotoUris = async () => {
      const uris: { [index: number]: string | any } = {};
      
      // Load URIs for all photos
      const uriPromises = allPhotos.map(async (photo, index) => {
        if (!photo.photoReference) return;
        
        // Try bundled asset first if localPath exists
        if (photo.localPath && hasBundledAsset(photo.localPath)) {
          try {
            const bundledSource = getBundledPhotoSource(photo.localPath);
            if (bundledSource) {
              uris[index] = bundledSource; // Store the require() result directly
              console.log('✅ Using bundled asset:', photo.localPath);
              return;
            }
          } catch (error) {
            console.warn('⚠️ Failed to load bundled asset, falling back to API:', photo.localPath, error);
            // Fall through to API
          }
        }
        
        // Fallback to API/cached photos
        const photoUrl = getPhotoUrl(photo.photoReference, googleMapsData.placeId);
        if (!photoUrl) return;
        
        const uri = await getPhotoUri(photoUrl, campgroundId, index, true);
        uris[index] = uri;
      });

      await Promise.allSettled(uriPromises);
      setPhotoUris(uris);
    };

    loadPhotoUris();
  }, [campgroundId, allPhotos, googleMapsData?.placeId]);


  // Load the "don't show instructions" preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      const dontShow = await getDontShowInstructionsPreference();
      setDontShowInstructions(dontShow);
    };
    loadPreference();
  }, []);

  // Generate a unique ID for the campground for deep linking
  const campgroundId = useMemo(() => {
    if (!campground) return '';
    const name = campground.campground?.name || '';
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const sanitizedCity = campground.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${sanitizedCity}-${campground.state.toLowerCase()}-${sanitizedName}`;
  }, [campground]);

  // Load bookmark state when campground changes
  useEffect(() => {
    const loadBookmarkState = async () => {
      if (campgroundId) {
        const bookmarked = await isBookmarked(campgroundId);
        setIsBookmarkedState(bookmarked);
      } else {
        setIsBookmarkedState(false);
      }
    };
    loadBookmarkState();
  }, [campgroundId]);

  // Update remaining views and blur state when campground changes
  // Note: View tracking happens in handleCampgroundSelect, not here
  useEffect(() => {
    const updateRemainingViews = async () => {
      if (!campground || isPremium) {
        setRemainingViews(null);
        setShouldShowBlur(false);
        return;
      }

      // Check current view count (views are tracked in handleCampgroundSelect)
      const viewCount = await getViewCount();
      const remaining = Math.max(0, SUBSCRIPTION_CONFIG.maxCampgroundViews - viewCount);
      setRemainingViews(remaining);
      
      // Show blur if limit reached (after viewing maxCampgroundViews, user has used all free views)
      setShouldShowBlur(viewCount >= SUBSCRIPTION_CONFIG.maxCampgroundViews);
    };

    // Only run when campground changes
    if (campground) {
      updateRemainingViews();
    }
  }, [campground, isPremium]);

  // Load Google Maps data when campground changes
  useEffect(() => {
    const loadGoogleMapsData = async () => {
      if (campground) {
        const data = await getGoogleMapsDataForEntry(campground);
        setGoogleMapsData(data);
      } else {
        setGoogleMapsData(undefined);
      }
    };
    loadGoogleMapsData();
  }, [campground]);

  // Reload map app preference when campground changes (bottom sheet opens)
  // This ensures we pick up any changes made in Settings
  useEffect(() => {
    if (campground) {
      reloadPreference();
    }
  }, [campground, reloadPreference]);

  // Determine initial snap index to position separator just below screen
  // Always use index 1 (the middle snap point) which will be calculated dynamically
  const initialSnapIndex = useMemo(() => {
    if (!campground) return -1;
    // Always open at index 1 (middle snap point) which positions the separator just below the visible area
    return 1;
  }, [campground]);

  // Update bottom sheet position when content height is measured
  useEffect(() => {
    if (contentHeight && campground && bottomSheetRef.current) {
      // Small delay to ensure snap points have updated
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(1);
      }, 100);
    }
  }, [contentHeight, campground]);

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
    
    // Show instructions for all map apps unless user has opted out
    if (!dontShowInstructions) {
      // Store in ref immediately (synchronous) to avoid React state update delays
      pendingActionRef.current = {
        app: mapApp,
        action: 'directions',
        campground: campground,
      };
      setPendingMapApp(actualApp);
      setPendingAction('directions');
      setShowInstructions(true);
      return;
    }

    // User has opted out of seeing instructions, open directly
    const url = getMapAppUrl(mapApp, 'directions', {
      latitude: campground.latitude,
      longitude: campground.longitude,
      campgroundId: campgroundId,
      placeId: googleMapsData?.placeId,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open maps:', err);
      // Fallback to web-based Google Maps
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${campground.latitude},${campground.longitude}`
      );
    });
  };

  const handleOpenMapAfterInstructions = async () => {
    console.log('handleOpenMapAfterInstructions called', { 
      pendingMapApp, 
      pendingAction, 
      campground: !!campground,
      pendingActionRef: pendingActionRef.current 
    });
    
    // Use ref first (immediately available), fallback to state
    const pending = pendingActionRef.current;
    const mapAppToUse = pending?.app || pendingMapApp;
    const actionToUse = pending?.action || pendingAction;
    const campgroundToUse = pending?.campground || campground;
    
    if (!campgroundToUse || !mapAppToUse || !actionToUse) {
      console.error('Missing required values:', { 
        campground: !!campgroundToUse, 
        mapApp: mapAppToUse, 
        action: actionToUse,
        pendingMapApp,
        pendingAction,
        pendingRef: pendingActionRef.current
      });
      setShowInstructions(false);
      return;
    }

    console.log('Opening map app:', { mapApp: mapAppToUse, action: actionToUse });
    setShowInstructions(false);
    
    // Reload preference in case user checked "don't show again"
    const updatedPreference = await getDontShowInstructionsPreference();
    setDontShowInstructions(updatedPreference);
    
    try {
      if (actionToUse === 'directions') {
        const url = getMapAppUrl(mapAppToUse, 'directions', {
          latitude: campgroundToUse.latitude,
          longitude: campgroundToUse.longitude,
          campgroundId: campgroundId,
          placeId: googleMapsData?.placeId,
        });
        console.log('Opening directions URL:', url);
        await Linking.openURL(url);
      } else if (actionToUse === 'search') {
        // Include city and state for better search accuracy
        const baseName = campgroundToUse.campground?.name || campgroundToUse.city;
        const campgroundName = `${baseName}, ${campgroundToUse.city}, ${campgroundToUse.state}`;
        const url = getMapAppUrl(mapAppToUse, 'search', {
          query: campgroundName,
          campgroundId: campgroundId,
          placeId: googleMapsData?.placeId,
        });
        console.log('Opening search URL:', url);
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Failed to open maps:', err);
    }

    // Clear state and ref after opening map
    setPendingMapApp(null);
    setPendingAction(null);
    pendingActionRef.current = null;
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
    
    // Show instructions for all map apps unless user has opted out
    if (!dontShowInstructions) {
      // Store in ref immediately (synchronous) to avoid React state update delays
      pendingActionRef.current = {
        app: mapApp,
        action: 'search',
        campground: campground,
      };
      setPendingMapApp(actualApp);
      setPendingAction('search');
      setShowInstructions(true);
      return;
    }

    // User has opted out of seeing instructions, open directly
    // Include city and state for better search accuracy
    const baseName = campground.campground?.name || campground.city;
    const campgroundName = `${baseName}, ${campground.city}, ${campground.state}`;
    const url = getMapAppUrl(mapApp, 'search', {
      query: campgroundName,
      campgroundId: campgroundId,
      placeId: googleMapsData?.placeId,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open maps:', err);
      // Fallback to web-based Google Maps with placeId if available
      if (googleMapsData?.placeId) {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campgroundName)}&query_place_id=${googleMapsData.placeId}`);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campgroundName)}`);
      }
    });
  };

  const handleMapAppSelected = async (app: MapApp) => {
    await savePreference(app);

    // Execute the pending action if there was one
    if (pendingAction && campground) {
      const actualApp = app === 'default' ? (require('react-native').Platform.OS === 'ios' ? 'apple' : 'google') : app;
      
      // Load the preference synchronously here to avoid race conditions
      const dontShow = await getDontShowInstructionsPreference();
      
      // Show instructions for all map apps unless user has opted out
      if (!dontShow) {
        // Store in ref immediately (synchronous) to avoid React state update delays
        pendingActionRef.current = {
          app: app,
          action: pendingAction,
          campground: campground,
        };
        // Also update state for display purposes
        setPendingMapApp(app);
        setShowPicker(false);
        // Show instructions modal immediately - ref ensures values are available
        setShowInstructions(true);
        return;
      }

      // User has opted out of seeing instructions, open directly
      if (pendingAction === 'directions') {
        const url = getMapAppUrl(app, 'directions', {
          latitude: campground.latitude,
          longitude: campground.longitude,
          campgroundId: campgroundId,
          placeId: googleMapsData?.placeId,
        });
        Linking.openURL(url).catch((err) => {
          console.error('Failed to open maps:', err);
        });
      } else if (pendingAction === 'search') {
        // Include city and state for better search accuracy
        const baseName = campground.campground?.name || campground.city;
        const campgroundName = `${baseName}, ${campground.city}, ${campground.state}`;
        const url = getMapAppUrl(app, 'search', {
          query: campgroundName,
          campgroundId: campgroundId,
          placeId: googleMapsData?.placeId,
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

  const handleBookmark = async () => {
    if (!campgroundId) return;
    
    const newBookmarkState = await toggleBookmark(campgroundId);
    setIsBookmarkedState(newBookmarkState);
    // Notify parent component that bookmarks have changed
    onBookmarkChange?.();
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
      return <Text style={[styles.htmlText, { color: theme.text }]}>{html.replace(/<[^>]*>/g, '')}</Text>;
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
      return <Text style={[styles.htmlText, { color: theme.text }]}>{html.replace(/<[^>]*>/g, '')}</Text>;
    }

    return (
      <Text style={[styles.htmlText, { color: theme.text }]}>
        {finalElements.map((item, index) => {
          if (typeof item === 'string') {
            return item;
          }
          return (
            <Text
              key={index}
              style={[styles.link, { color: theme.primary }]}
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
      activeOffsetY={[-1, 1]}
      failOffsetX={[-5, 5]}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: theme.bottomSheetHandle }]}
      backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: theme.bottomSheetBackground }]}
    >
      <BottomSheetScrollView 
        contentContainerStyle={styles.contentContainer}
        style={styles.scrollView}
      >
        {campground ? (
          (() => {
            // Compute hasSecondPill once for use in multiple places
            const knownPrefixes = ['RV Park', 'City Park', 'County Park', 'State Park', 'National Park'];
            let hasSecondPill = false;
            let secondPillText: string | null = null;
            
            // Check cg_notes first for National Forest, National Preserve, or State Forest
            if (campground.cg_notes) {
              const cgNotesLower = campground.cg_notes.toLowerCase();
              
              if (cgNotesLower.startsWith('national forest')) {
                hasSecondPill = true;
                secondPillText = 'National Forest';
              } else if (cgNotesLower.startsWith('national preserve')) {
                hasSecondPill = true;
                secondPillText = 'National Preserve';
              } else if (cgNotesLower.startsWith('state forest')) {
                hasSecondPill = true;
                secondPillText = 'State Forest';
              }
            }
            
            // If no forest/preserve pill found, check cg_notes for other known prefixes
            if (!hasSecondPill && campground.cg_notes) {
              for (const prefix of knownPrefixes) {
                if (campground.cg_notes.startsWith(prefix)) {
                  const afterPrefix = campground.cg_notes.slice(prefix.length).trim();
                  if (afterPrefix.length === 0 || afterPrefix.startsWith('.') || afterPrefix.startsWith(',')) {
                    hasSecondPill = true;
                    secondPillText = prefix;
                  }
                  break;
                }
              }
              if (!hasSecondPill && campground.cg_notes.length <= 40) {
                hasSecondPill = true;
                secondPillText = campground.cg_notes;
              }
            }
            
            return (
          <>
            <View 
              ref={contentBeforeSeparatorRef}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                if (height > 0 && campground) {
                  setContentHeight(height);
                }
              }}
              collapsable={false}
            >
              <View style={styles.header}>
              {/* Top-right badge stack: hookup type + campground info pill */}
              <View style={styles.badgeStackTopRight}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: campground.hookup_type === 'full' ? theme.primary : campground.hookup_type === 'partial' ? theme.warning : theme.textSecondary },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.buttonText }]}>
                    {campground.hookup_type === 'full' ? 'Full Hookup' : campground.hookup_type === 'partial' ? 'Partial Hookup' : 'No Hookups'}
                  </Text>
                </View>
                {hasSecondPill && secondPillText && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, borderWidth: 1, marginTop: 6 },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      {secondPillText}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.title, { color: theme.text }]}>{campground.campground?.name || `${campground.city}, ${campground.state}`}</Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {campground.city}, {campground.state}
            </Text>
            {campground.contributor && (
              <Text style={[styles.contributorTextInline, { color: theme.textSecondary }]}>
                🙏 {campground.contributor}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.buttonContainer, hasSecondPill && { marginTop: 12 }]}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.openMapsButton,
              { backgroundColor: theme.surface, borderColor: theme.primary }
            ]} 
            onPress={handleOpenInMaps}
          >
            <Ionicons name="map" size={18} color={theme.primary} style={styles.buttonIcon} />
            <Text style={[styles.openMapsButtonText, { color: theme.primary }]}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.secondaryButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.secondaryButton, 
              { borderColor: theme.border, backgroundColor: theme.surface }
            ]} 
            onPress={handleReportProblem}
          >
            <Ionicons name="warning-outline" size={18} color={theme.error} />
            <Text style={[styles.secondaryButtonText, { color: theme.error }]}>Report Problem</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.secondaryButton,
              { borderColor: theme.border, backgroundColor: theme.surface },
              isBookmarkedState && { 
                backgroundColor: theme.primary,
                borderColor: theme.primary 
              }
            ]} 
            onPress={handleBookmark}
          >
            <Ionicons 
              name={isBookmarkedState ? "bookmark" : "bookmark-outline"} 
              size={18} 
              color={isBookmarkedState ? theme.buttonText : theme.text} 
            />
            <Text style={[
              styles.secondaryButtonText, 
              { color: isBookmarkedState ? theme.buttonText : theme.text }
            ]}>
              {isBookmarkedState ? 'Bookmarked' : 'Bookmark'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Campground Info section - show remaining notes (after prefix pill) or website link */}
        {(() => {
          // Calculate remaining text for campground info section
          let remainingText: string | null = null;
          
          if (campground.cg_notes) {
            const knownPrefixes = ['RV Park', 'City Park', 'County Park', 'State Park', 'National Park'];
            const forestPreservePrefixes = ['National Forest', 'National Preserve', 'State Forest'];
            let foundPrefix = false;
            
            // First check for forest/preserve prefixes (case-insensitive)
            const cgNotesLower = campground.cg_notes.toLowerCase();
            for (const prefix of forestPreservePrefixes) {
              if (cgNotesLower.startsWith(prefix.toLowerCase())) {
                const afterPrefix = campground.cg_notes.slice(prefix.length).trim();
                if (afterPrefix.length > 0 && (afterPrefix.startsWith('.') || afterPrefix.startsWith(','))) {
                  // Has prefix with additional text - show the additional text
                  remainingText = afterPrefix.replace(/^[.,]\s*/, '').trim();
                  if (remainingText.length === 0) remainingText = null;
                }
                foundPrefix = true;
                break;
              }
            }
            
            // Then check for other known prefixes
            if (!foundPrefix) {
              for (const prefix of knownPrefixes) {
                if (campground.cg_notes.startsWith(prefix)) {
                  const afterPrefix = campground.cg_notes.slice(prefix.length).trim();
                  if (afterPrefix.length > 0 && (afterPrefix.startsWith('.') || afterPrefix.startsWith(','))) {
                    // Has prefix with additional text - show the additional text
                    remainingText = afterPrefix.replace(/^[.,]\s*/, '').trim();
                    if (remainingText.length === 0) remainingText = null;
                  }
                  foundPrefix = true;
                  break;
                }
              }
            }
            
            // If no prefix found and text is long (>40), show it all in the section
            if (!foundPrefix && campground.cg_notes.length > 40) {
              remainingText = campground.cg_notes;
            }
          }
          
          // Helper function to extract domain from URL for comparison
          const getDomain = (url: string): string => {
            try {
              const urlObj = new URL(url);
              // Remove www and convert to lowercase
              return urlObj.hostname.replace(/^www\./i, '').toLowerCase();
            } catch {
              // If URL parsing fails, try to extract domain from string
              const match = url.toLowerCase().match(/https?:\/\/(?:www\.)?([^\/]+)/);
              return match ? match[1] : url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./i, '').split('/')[0];
            }
          };

          // Check if Google Maps website is significantly different from existing link
          const shouldShowGoogleMapsWebsite = (): boolean => {
            if (!googleMapsData?.websiteUri) return false;
            if (!campground.campground?.link) return true; // Show if no existing link
            
            const existingDomain = getDomain(campground.campground.link);
            const googleDomain = getDomain(googleMapsData.websiteUri);
            
            // Hide Google Maps link if domains match
            return existingDomain !== googleDomain;
          };

          const showGoogleMapsWebsite = shouldShowGoogleMapsWebsite();
          const showPhoneNumber = !!googleMapsData?.nationalPhoneNumber;
          
          // Only show section if there's remaining text, website link, phone number, or Google Maps website
          if (!remainingText && !campground.campground?.link && !showPhoneNumber && !showGoogleMapsWebsite) return null;
          
          return (
            <View style={[styles.section, styles.firstSection]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Campground Info</Text>
              {remainingText && (
                <View style={styles.infoText}>
                  <Text style={[styles.htmlText, { color: theme.text }]}>
                    {remainingText}
                  </Text>
                </View>
              )}
              {campground.campground?.link && (
                <TouchableOpacity 
                  style={[styles.websiteButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.primary }]}
                  onPress={() => Linking.openURL(campground.campground.link!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={18} color={theme.primary} />
                  <Text style={[styles.websiteButtonText, { color: theme.primary }]}>Visit Campground Website</Text>
                  <Ionicons name="open-outline" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
              {showGoogleMapsWebsite && (
                <TouchableOpacity 
                  style={[styles.websiteButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.primary, marginTop: campground.campground?.link ? 8 : 0 }]}
                  onPress={() => Linking.openURL(googleMapsData!.websiteUri!).catch(() => Alert.alert('Error', 'Could not open website'))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={18} color={theme.primary} />
                  <Text style={[styles.websiteButtonText, { color: theme.primary }]}>Visit Website (Google Maps)</Text>
                  <Ionicons name="open-outline" size={16} color={theme.primary} />
                </TouchableOpacity>
              )}
              {showPhoneNumber && (
                <TouchableOpacity 
                  style={[styles.websiteButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.primary, marginTop: (campground.campground?.link || showGoogleMapsWebsite) ? 8 : 0 }]}
                  onPress={() => Linking.openURL(`tel:${googleMapsData!.nationalPhoneNumber}`).catch(() => Alert.alert('Error', 'Could not make phone call'))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={18} color={theme.primary} />
                  <Text style={[styles.websiteButtonText, { color: theme.primary }]}>{googleMapsData!.nationalPhoneNumber}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {(() => {
          // Combine single trail and trails array, deduplicating by name
          const rawTrails = [
            ...(campground.trail ? [campground.trail] : []),
            ...(campground.trails || [])
          ].filter(t => t && t.name);
          
          // Deduplicate trails by name (case-insensitive)
          const seenNames = new Set<string>();
          const allTrails = rawTrails.filter(t => {
            const normalizedName = t.name.toLowerCase().trim();
            if (seenNames.has(normalizedName)) return false;
            seenNames.add(normalizedName);
            return true;
          });
          
          if (allTrails.length === 0 && !campground.trail_notes) return null;
          
          return (
            <View style={[styles.section, styles.trailsSection]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Bike Trails</Text>
              {campground.trail_notes && (
                <View style={[styles.trailNotesCard, { backgroundColor: theme.surfaceSecondary }]}>
                  <Text style={[styles.trailNotesText, { color: theme.textSecondary }]}>{campground.trail_notes}</Text>
                </View>
              )}
              {allTrails.map((trail, index) => (
                trail.link ? (
                  <TouchableOpacity 
                    key={index}
                    style={[styles.trailButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.primary }]}
                    onPress={() => Linking.openURL(trail.link!)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bicycle" size={20} color={theme.primary} style={styles.trailButtonIcon} />
                    <Text style={[styles.trailButtonText, { color: theme.primary }]} numberOfLines={2}>{trail.name}</Text>
                    <Ionicons name="open-outline" size={16} color={theme.primary} />
                  </TouchableOpacity>
                ) : (
                  <View key={index} style={[styles.trailButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Ionicons name="bicycle" size={20} color={theme.text} style={styles.trailButtonIcon} />
                    <Text style={[styles.trailButtonText, { color: theme.text }]} numberOfLines={2}>{trail.name}</Text>
                  </View>
                )
              ))}
            </View>
          );
        })()}

        {campground.blog_post_link && (
          <TouchableOpacity 
            style={[styles.blogPostButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
            onPress={() => {
              Linking.openURL(campground.blog_post_link!).catch(err => {
                console.error('Failed to open blog post URL:', err);
                Alert.alert('Error', 'Could not open the blog post link.');
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={24} color={theme.buttonText} style={styles.blogPostButtonIcon} />
            <Text style={[styles.blogPostButtonLabel, { color: theme.buttonText }]}>Read blog post</Text>
            <View style={[styles.blogPostButtonDivider, { backgroundColor: 'rgba(255, 255, 255, 0.5)' }]} />
            <Text style={[styles.blogPostButtonText, { color: theme.buttonText }]} numberOfLines={2}>
              {campground.blog_post || 'Related Blog Post'}
            </Text>
          </TouchableOpacity>
        )}
            </View>

        {/* ============================================
            GOOGLE MAPS DATA SECTION
            Easy to remove: Delete this entire block
            ============================================ */}
        {googleMapsData && googleMapsData.syncStatus === 'success' && (
          <>
            <View style={[styles.googleMapsSeparator, { backgroundColor: theme.border }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Google Maps Information</Text>
            
            {/* Editorial Summary */}
            {googleMapsData.editorialSummary && (
              <Text style={[styles.editorialSummaryText, { color: theme.textSecondary }]}>{googleMapsData.editorialSummary}</Text>
            )}

            {/* Rating Card */}
            {(googleMapsData.rating || googleMapsData.userRatingCount) && (
              <View style={[styles.ratingCard, { backgroundColor: theme.surfaceSecondary }]}>
                {googleMapsData.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={20} color="#FFA500" />
                    <Text style={[styles.ratingText, { color: theme.text }]}>{googleMapsData.rating.toFixed(1)}</Text>
                  </View>
                )}
                {googleMapsData.userRatingCount && (
                  <Text style={[styles.reviewCountText, { color: theme.textSecondary }]}>
                    {googleMapsData.userRatingCount.toLocaleString()} reviews
                  </Text>
                )}
              </View>
            )}

            {/* Amenities */}
            {(googleMapsData.goodForChildren !== undefined || 
              googleMapsData.allowsDogs !== undefined || 
              googleMapsData.restroom !== undefined ||
              googleMapsData.accessibilityOptions ||
              googleMapsData.parkingOptions ||
              googleMapsData.paymentOptions) && (
              <View style={styles.amenitiesGrid}>
                {googleMapsData.goodForChildren === true && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="happy-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Good for kids</Text>
                  </View>
                )}
                {googleMapsData.allowsDogs === true && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="paw-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Dogs allowed</Text>
                  </View>
                )}
                {googleMapsData.restroom === true && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="water-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Restrooms</Text>
                  </View>
                )}
                {googleMapsData.accessibilityOptions?.wheelchairAccessibleEntrance && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="accessibility-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Wheelchair accessible</Text>
                  </View>
                )}
                {googleMapsData.parkingOptions?.freeParkingLot && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="car-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Free parking</Text>
                  </View>
                )}
                {googleMapsData.paymentOptions?.acceptsCreditCards && (
                  <View style={[styles.amenityItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="card-outline" size={18} color={theme.primary} />
                    <Text style={[styles.amenityText, { color: theme.text }]}>Credit cards</Text>
                  </View>
                )}
              </View>
            )}

            {/* Photos */}
            {googleMapsData.photos && googleMapsData.photos.length > 0 && (
              <View style={styles.photosContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosScrollContent}
                  style={styles.photosScrollView}
                  snapToInterval={0}
                  decelerationRate="fast"
                  nestedScrollEnabled={Platform.OS === 'android'}
                  scrollEventThrottle={16}
                  directionalLockEnabled={true}
                  bounces={false}
                  removeClippedSubviews={false}
                  onStartShouldSetResponder={() => {
                    isInteractingWithPhotosRef.current = true;
                    return true;
                  }}
                  onMoveShouldSetResponder={(evt, gestureState) => {
                    // Claim responder for horizontal movements
                    const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
                    if (isHorizontal) {
                      isInteractingWithPhotosRef.current = true;
                      return true;
                    }
                    return false;
                  }}
                  onResponderRelease={() => {
                    setTimeout(() => {
                      isInteractingWithPhotosRef.current = false;
                    }, 100);
                  }}
                  onScrollBeginDrag={() => {
                    isInteractingWithPhotosRef.current = true;
                  }}
                  onScrollEndDrag={() => {
                    setTimeout(() => {
                      isInteractingWithPhotosRef.current = false;
                    }, 100);
                  }}
                  onMomentumScrollEnd={() => {
                    setTimeout(() => {
                      isInteractingWithPhotosRef.current = false;
                    }, 100);
                  }}
                >
                  <View style={styles.photosLayout}>
                  {/* Pattern: Large, Stack(2 small), Large, Stack(2 small), ... */}
                  {allPhotos.map((photo, index) => {
                    if (!photo.photoReference) return null;
                    
                    // Pattern repeats every 3 photos: 0 (large), 1-2 (stack), 3 (large), 4-5 (stack), etc.
                    const positionInPattern = index % 3;
                    
                    // If position is 1 or 2, it's part of a stack - handle separately
                    if (positionInPattern === 1 || positionInPattern === 2) {
                      // Only render the first photo of the stack (position 1)
                      // Position 2 will be rendered within the same stack
                      if (positionInPattern === 1) {
                        const stackPhotos = allPhotos.slice(index, index + 2).filter(p => p.photoReference);
                        if (stackPhotos.length === 0) return null;
                        
                        return (
                          <View key={`stack-${index}`} style={styles.photosStack}>
                            {stackPhotos.map((stackPhoto, stackIndex) => {
                              const actualIndex = index + stackIndex;
                              // Use cached URI if available, otherwise fallback to URL
                              const photoUri = photoUris[actualIndex] || getPhotoUrl(stackPhoto.photoReference, googleMapsData.placeId);
                              const isBundledAsset = photoUri && typeof photoUri !== 'string';
                              const imageSource = typeof photoUri === 'string' ? { uri: photoUri } : photoUri;
                              
                              return (
                                <TouchableOpacity
                                  key={actualIndex}
                                  style={styles.stackPhoto}
                                  activeOpacity={0.9}
                                  onPress={() => {
                                    setSelectedPhotoIndex(actualIndex);
                                    setPhotoViewerVisible(true);
                                  }}
                                >
                                  {photoUri ? (
                                    <Image 
                                      key={`photo-${actualIndex}-${isBundledAsset ? 'bundled' : 'uri'}`}
                                      source={imageSource}
                                      style={styles.stackPhotoImage}
                                      resizeMode="cover"
                                      onError={(error) => {
                                        console.error('❌ Stack image load error:', {
                                          actualIndex,
                                          photoUri: photoUri ? (typeof photoUri === 'string' ? photoUri.substring(0, 100) : 'bundled asset') : 'null',
                                          error: error.nativeEvent?.error
                                        });
                                        // If bundled asset failed, fallback to API URL
                                        if (isBundledAsset) {
                                          const apiUrl = getPhotoUrl(stackPhoto.photoReference, googleMapsData.placeId);
                                          if (apiUrl) {
                                            setPhotoUris(prev => ({ ...prev, [actualIndex]: apiUrl }));
                                          }
                                        }
                                      }}
                                    />
                                  ) : (
                                    <View style={styles.photoPlaceholderContainer}>
                                      <Ionicons name="image-outline" size={20} color={theme.textTertiary} />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      }
                      // Skip position 2 as it's rendered in the stack above
                      return null;
                    }
                    
                    // Position 0 or 3, 6, 9... (multiples of 3) - large photo
                    // Use cached URI if available, otherwise fallback to URL
                    const photoUri = photoUris[index] || getPhotoUrl(photo.photoReference, googleMapsData.placeId);
                    const isBundledAsset = photoUri && typeof photoUri !== 'string';
                    const imageSource = typeof photoUri === 'string' ? { uri: photoUri } : photoUri;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.featuredPhoto}
                        activeOpacity={0.9}
                        onPress={() => {
                          setSelectedPhotoIndex(index);
                          setPhotoViewerVisible(true);
                        }}
                      >
                        {photoUri ? (
                          <Image 
                            key={`photo-${index}-${isBundledAsset ? 'bundled' : 'uri'}`}
                            source={imageSource}
                            style={styles.featuredPhotoImage}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error('❌ Image load error:', {
                                index,
                                photoUri: photoUri ? (typeof photoUri === 'string' ? photoUri.substring(0, 100) : 'bundled asset') : 'null',
                                error: error.nativeEvent?.error
                              });
                              // If bundled asset failed, fallback to API URL
                              if (isBundledAsset) {
                                const apiUrl = getPhotoUrl(photo.photoReference, googleMapsData.placeId);
                                if (apiUrl) {
                                  setPhotoUris(prev => ({ ...prev, [index]: apiUrl }));
                                }
                              }
                            }}
                          />
                        ) : (
                          <View style={styles.photoPlaceholderContainer}>
                            <Ionicons name="image-outline" size={40} color={theme.textTertiary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Review Topics */}
            {googleMapsData.reviewTopics && googleMapsData.reviewTopics.length > 0 && (
              <View style={styles.topicsContainer}>
                <View style={styles.topicsGrid}>
                  {googleMapsData.reviewTopics.map((topic, index) => (
                    <View key={index} style={[styles.topicTag, { backgroundColor: theme.surfaceSecondary }]}>
                      <Text style={[styles.topicText, { color: theme.text }]}>{topic}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Review Summary */}
            {googleMapsData.reviewSummary?.text && (
              <View style={[styles.reviewSummaryCard, { backgroundColor: theme.surfaceSecondary }]}>
                <Text style={[styles.reviewSummaryLabel, { color: theme.text }]}>What People Say</Text>
                <Text style={[styles.reviewSummaryText, { color: theme.textSecondary }]}>{googleMapsData.reviewSummary.text}</Text>
              </View>
            )}

            {/* Opening Hours Card */}
            {googleMapsData.openingHours && googleMapsData.openingHours.weekdayText && googleMapsData.openingHours.weekdayText.length > 0 && (() => {
              // Prefer Google's timezone-aware openNow value (calculated server-side)
              // Only use our local calculation as fallback if API value is unavailable
              // Note: Our calculation uses device local time and doesn't account for timezone differences
              const calculatedOpenNow = calculateOpenNow(googleMapsData.openingHours.weekdayText);
              const isOpenNow = googleMapsData.openingHours.openNow !== undefined 
                ? googleMapsData.openingHours.openNow 
                : calculatedOpenNow;
              
              return (
                <View style={[
                  styles.hoursCard,
                  { backgroundColor: theme.surfaceSecondary },
                  isOpenNow === true && {
                    backgroundColor: resolvedThemeMode === 'dark' 
                      ? 'rgba(102, 187, 106, 0.15)' 
                      : 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    borderColor: theme.success,
                  }
                ]}>
                  <View style={styles.hoursHeader}>
                    <Ionicons 
                      name={isOpenNow ? "checkmark-circle" : "time-outline"} 
                      size={20} 
                      color={isOpenNow ? theme.primary : theme.icon} 
                    />
                    <Text style={[styles.hoursLabel, { color: theme.text }]}>Open Hours</Text>
                    {isOpenNow !== undefined && (
                      <View style={[
                        styles.openNowBadge, 
                        { 
                          backgroundColor: isOpenNow ? theme.primary : theme.error,
                          borderWidth: isOpenNow ? 2 : 0,
                          borderColor: isOpenNow ? theme.primaryDark : 'transparent',
                        }
                      ]}>
                        <Ionicons 
                          name={isOpenNow ? "checkmark-circle" : "close-circle"} 
                          size={16} 
                          color={theme.buttonText} 
                          style={styles.openNowIcon}
                        />
                        <Text style={[styles.openNowText, { color: theme.buttonText }]}>
                          {isOpenNow ? 'Open Now' : 'Currently Closed'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.hoursList}>
                    {googleMapsData.openingHours.weekdayText.map((day, index) => {
                      // Split day and hours (format is usually "Monday: 8:00 AM – 6:00 PM")
                      const parts = day.split(':');
                      const dayName = parts[0]?.trim() || '';
                      const hours = parts.slice(1).join(':').trim();
                      
                      return (
                        <Text key={index} style={[styles.hoursText, { color: theme.textSecondary }]}>
                          <Text style={[styles.hoursDayText, { color: theme.text }]}>{dayName}</Text>
                          {hours && <Text> {hours}</Text>}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

          </View>
          </>
        )}
        {/* ============================================
            END GOOGLE MAPS DATA SECTION
            ============================================ */}
          </>
            );
          })()
        ) : null}
        
        {/* Subscription Blur Overlay - shows when not subscribed and view limit reached */}
        {/* Key prop forces React to unmount/remount when isPremium changes */}
        {campground && !isPremium && shouldShowBlur && (
          <SubscriptionBlur 
            key={`blur-${isPremium}`} 
            onPress={() => setShowPaywall(true)}
            remainingViews={remainingViews}
          />
        )}
        
      </BottomSheetScrollView>
      <MapAppPickerModal
        visible={showPicker}
        currentApp={preference}
        onSelect={handleMapAppSelected}
        onClose={() => {
          setShowPicker(false);
          setPendingAction(null);
          pendingActionRef.current = null;
        }}
      />
      <MapReturnInstructionsModal
        visible={showInstructions}
        mapAppName={pendingMapApp ? getMapAppName(pendingMapApp) : ''}
        onClose={handleOpenMapAfterInstructions}
      />
      {googleMapsData && allPhotos.length > 0 && (
        <PhotoViewerModal
          visible={photoViewerVisible}
          photos={allPhotos}
          initialIndex={selectedPhotoIndex}
          placeId={googleMapsData.placeId}
          getPhotoUrl={getPhotoUrl}
          photoUris={photoUris}
          onPhotoError={(index, photoReference) => {
            // Fallback to API URL when bundled asset fails
            const apiUrl = getPhotoUrl(photoReference, googleMapsData.placeId);
            if (apiUrl) {
              setPhotoUris(prev => ({ ...prev, [index]: apiUrl }));
            }
          }}
          onClose={() => setPhotoViewerVisible(false)}
        />
      )}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={async () => {
          setShowPaywall(false);
          // Explicitly refresh subscription status immediately after purchase
          // This ensures the bottom sheet updates even if the listener hasn't fired yet
          // Use syncPurchases first if available, then checkSubscription
          try {
            if (syncPurchases) {
              console.log('🔄 CampgroundBottomSheet: Syncing purchases...');
              await syncPurchases();
            }
          } catch (error) {
            console.warn('⚠️ Error syncing purchases:', error);
          }
          
          await checkSubscription();
          // Also retry a couple times to handle sandbox delays (longer delays for sandbox)
          setTimeout(async () => {
            await checkSubscription();
          }, 2000);
          setTimeout(async () => {
            await checkSubscription();
          }, 4000);
        }}
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
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    // Color set dynamically
  },
  header: {
    marginBottom: 8,
    position: 'relative',
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    marginRight: 120,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    flexWrap: 'wrap',
    gap: 8,
  },
  subtitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  badgeTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  badgeStackTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'flex-end',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 14,
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  section: {
    marginBottom: 20,
    width: '100%',
  },
  firstSection: {
    marginTop: 16,
  },
  trailsSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
    flexWrap: 'wrap',
  },
  htmlText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
    width: '100%',
    maxWidth: '100%',
  },
  notesText: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  trailCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  trailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    width: '100%',
  },
  trailButtonIcon: {
    marginRight: 12,
  },
  trailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  trailNotesCard: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  trailNotesText: {
    fontSize: 14,
    lineHeight: 21,
  },
  trailName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  trailInfo: {
    fontSize: 13,
    marginBottom: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  link: {
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  blogPostButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  blogPostButtonIcon: {
    marginRight: 10,
  },
  blogPostButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginRight: 12,
  },
  blogPostButtonDivider: {
    width: 1,
    height: 20,
    marginRight: 12,
  },
  blogPostButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
    flexWrap: 'wrap',
  },
  contributorText: {
    fontSize: 13,
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  contributorTextInline: {
    fontSize: 12,
    fontStyle: 'italic',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 0,
    alignItems: 'center',
  },
  secondaryButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 4,
    gap: 8,
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reportButton: {
    flex: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderWidth: 2,
    shadowOpacity: 0,
    elevation: 0,
  },
  bookmarkButton: {
    flex: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderWidth: 2,
    shadowOpacity: 0,
    elevation: 0,
  },
  bookmarkButtonFilled: {
    // Background color set dynamically
  },
  buttonIcon: {
    marginRight: 6,
  },
  openMapsButton: {
    borderWidth: 2,
  },
  openMapsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  googleMapsSeparator: {
    height: 1,
    marginTop: 0,
    marginBottom: 16,
    marginHorizontal: 0,
  },
  feedbackSection: {
    marginTop: 12,
    marginBottom: 0,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
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
    alignItems: 'center',
    borderWidth: 1,
  },
  feedbackButtonText: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Google Maps Data Styles - Easy to remove: Delete all styles below
  ratingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '700',
  },
  reviewCountText: {
    fontSize: 14,
  },
  editorialSummaryText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  photosContainer: {
    marginBottom: 16,
  },
  photosLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photosScrollView: {
    marginLeft: -16, // Extend to left edge
    marginRight: -16 - (Dimensions.get('window').width * 0.2), // Extend beyond right edge by 20% of screen width
  },
  photosScrollContent: {
    paddingLeft: 16,
    paddingRight: 16 + (Dimensions.get('window').width * 0.2), // Extra padding on right
  },
  photosLayout: {
    flexDirection: 'row',
    gap: 8,
    height: 200,
  },
  featuredPhoto: {
    width: 160 + (Dimensions.get('window').width * 0.1), // 10% wider
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  featuredPhotoImage: {
    width: '100%',
    height: '100%',
  },
  middlePhoto: {
    width: 80 + (Dimensions.get('window').width * 0.05), // 5% wider
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  middlePhotoImage: {
    width: '100%',
    height: '100%',
  },
  photosStack: {
    width: 80 + (Dimensions.get('window').width * 0.05), // 5% wider
    flexDirection: 'column',
    gap: 8,
  },
  loadMoreColumn: {
    width: 80 + (Dimensions.get('window').width * 0.05), // 5% wider
    flexDirection: 'column',
  },
  stackPhoto: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stackPhotoImage: {
    width: '100%',
    height: '100%',
  },
  gridPhotoAttribution: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    fontSize: 7,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 2,
    textAlign: 'center',
  },
  seeMorePhoto: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadMorePhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BBDEFB',
    borderStyle: 'dashed',
  },
  loadMoreContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  photoPlaceholder: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  photoAttribution: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    fontSize: 8,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    textAlign: 'center',
  },
  topicsContainer: {
    marginBottom: 16,
  },
  topicsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  topicText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  reviewSummaryCard: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  reviewSummaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reviewSummaryText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 13,
    color: '#333',
  },
  hoursCard: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  hoursCardOpen: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  hoursLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  openNowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  openNowIcon: {
    marginRight: 0,
  },
  openNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  hoursList: {
    gap: 4,
  },
  hoursText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    lineHeight: 20,
  },
  hoursDayText: {
    color: '#4CAF50',
    fontWeight: '500',
    fontSize: 14,
  },
  contactContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  contactButtonText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  // End Google Maps Data Styles
});

