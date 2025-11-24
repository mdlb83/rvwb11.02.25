import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CampgroundEntry } from '../../types/campground';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import { getMapAppUrl, getMapAppName, MapApp, getDontShowInstructionsPreference } from '../../utils/mapAppPreferences';
import { isBookmarked, toggleBookmark } from '../../utils/bookmarks';
import { getGoogleMapsDataForEntry } from '../../utils/googleMapsDataLoader';
import { GoogleMapsData, GoogleMapsPhoto } from '../../types/googleMapsData';
import MapAppPickerModal from '../settings/MapAppPickerModal';
import MapReturnInstructionsModal from './MapReturnInstructionsModal';
import PhotoViewerModal from './PhotoViewerModal';
import { useTheme } from '../../contexts/ThemeContext';

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
}

export default function CampgroundBottomSheet({ campground, onClose }: CampgroundBottomSheetProps) {
  const { theme, resolvedThemeMode } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const contentBeforeSeparatorRef = useRef<View>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  
  // Calculate snap points dynamically based on content height
  // Default snap points: 30% peek, calculated default (to show separator just below), 90% expanded
  const snapPoints = useMemo(() => {
    if (contentHeight && campground) {
      const screenHeight = Dimensions.get('window').height;
      // Calculate percentage to show content up to separator (add small buffer)
      const percentage = Math.min(90, Math.max(50, (contentHeight / screenHeight) * 100 + 2));
      return ['30%', `${percentage}%`, '90%'];
    }
    // Fallback to default snap points
    return ['30%', '65%', '90%'];
  }, [contentHeight, campground]);
  const { preference, loading, savePreference } = useMapAppPreference();
  const [showPicker, setShowPicker] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [pendingAction, setPendingAction] = useState<'directions' | 'search' | null>(null);
  const [pendingMapApp, setPendingMapApp] = useState<MapApp | null>(null);
  const [dontShowInstructions, setDontShowInstructions] = useState(false);
  const [isBookmarkedState, setIsBookmarkedState] = useState(false);
  const [googleMapsData, setGoogleMapsData] = useState<GoogleMapsData | undefined>(undefined);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [additionalPhotos, setAdditionalPhotos] = useState<GoogleMapsPhoto[]>([]);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [hasLoadedMorePhotos, setHasLoadedMorePhotos] = useState(false); // Track if Load More has been clicked
  // Use a ref to track additional photos count to avoid stale closure issues
  const additionalPhotosRef = useRef<GoogleMapsPhoto[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    additionalPhotosRef.current = additionalPhotos;
  }, [additionalPhotos]);
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
    
    if (!apiKey || !placeId) {
      console.warn('⚠️ getPhotoUrl returning null:', {
        noApiKey: !apiKey,
        noPlaceId: !placeId
      });
      return null;
    }
    
    // Places API (New) photo URL format
    const photoUrl = `https://places.googleapis.com/v1/places/${placeId}/photos/${photoReference}/media?maxWidthPx=400&maxHeightPx=400&key=${apiKey}`;
    console.log('✅ Generated photo URL:', photoUrl.substring(0, 100) + '...');
    return photoUrl;
  }, []);

  // Fetch additional photos from Google Places API
  // Helper function to normalize photo references for comparison
  const normalizePhotoRef = useCallback((photoRef: string | undefined | null): string => {
    if (!photoRef) return '';
    // Remove any whitespace and convert to string
    const normalized = String(photoRef).trim();
    // If it contains /photos/, extract just the reference part
    if (normalized.includes('/photos/')) {
      return normalized.split('/photos/')[1];
    }
    // If it's a full path, get the last segment
    if (normalized.includes('/')) {
      return normalized.split('/').pop() || normalized;
    }
    // Otherwise return as-is
    return normalized;
  }, []);

  const loadMorePhotos = useCallback(async () => {
    if (!googleMapsData?.placeId || loadingMorePhotos) return;

    const apiKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey || 
                   Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
                   Constants.expoConfig?.extra?.googleMapsApiKey || '';
    
    console.log('🔑 API Key check:', {
      iosKey: !!Constants.expoConfig?.ios?.config?.googleMapsApiKey,
      androidKey: !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey,
      extraKey: !!Constants.expoConfig?.extra?.googleMapsApiKey,
      hasApiKey: !!apiKey,
      placeId: googleMapsData.placeId
    });
    
    if (!apiKey) {
      Alert.alert('Error', 'API key not configured. Please ensure GOOGLE_MAPS_IOS_API_KEY or GOOGLE_MAPS_ANDROID_API_KEY is set as an EAS secret.');
      return;
    }

    setLoadingMorePhotos(true);
    try {
      // Request all photos - the API should return all available photos
      const url = `https://places.googleapis.com/v1/places/${googleMapsData.placeId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'photos' // This should return all photos
        }
      });
      
      console.log('🔍 API Request:', {
        url,
        placeId: googleMapsData.placeId,
        fieldMask: 'photos'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response received:', {
        hasPhotos: !!data.photos,
        photosCount: data.photos?.length || 0
      });
      
      // Use ref to get the latest count (avoids stale closure)
      const currentAdditionalCount = additionalPhotosRef.current.length;
      
      console.log('🔍 Full API response structure:', {
        hasPhotos: !!data.photos,
        photosIsArray: Array.isArray(data.photos),
        photosLength: data.photos?.length,
        additionalPhotosLength: currentAdditionalCount,
        additionalPhotosLengthFromState: additionalPhotos.length,
        hasNextPageToken: !!data.nextPageToken,
        responseKeys: Object.keys(data)
      });
      
      // Check if there's pagination (though Places API New might not support it for photos)
      if (data.nextPageToken) {
        console.log('📄 Found nextPageToken - pagination available:', data.nextPageToken);
      }
      
      if (data.photos && Array.isArray(data.photos)) {
        const totalPhotosFromAPI = data.photos.length;
        console.log(`📸 API returned ${totalPhotosFromAPI} total photos`);
        console.log(`📸 Current additionalPhotos.length (from ref): ${currentAdditionalCount}`);
        console.log(`📸 Current additionalPhotos.length (from state): ${additionalPhotos.length}`);
        
        // NOTE: Google Places API (New) may limit photos returned per request
        // If totalPhotosFromAPI is 10, that's likely the API limit, not the actual total
        if (totalPhotosFromAPI === 10) {
          console.log(`⚠️ API returned exactly 10 photos - this may be the API limit, not the actual total`);
        }
        
        // Calculate how many photos we've already loaded
        // First 4 are synced, then we have additionalPhotos.length already loaded
        // Use ref to avoid stale closure issues
        const alreadyLoadedCount = 4 + currentAdditionalCount;
        console.log(`📸 Already loaded: ${alreadyLoadedCount} photos (4 synced + ${currentAdditionalCount} additional)`);
        console.log(`📸 Will start from index ${alreadyLoadedCount} (photo #${alreadyLoadedCount + 1})`);
        
        // Check if we've loaded all available photos from this API response
        if (alreadyLoadedCount >= totalPhotosFromAPI) {
          console.log(`⚠️ All photos from API response loaded! (${alreadyLoadedCount} >= ${totalPhotosFromAPI})`);
          if (totalPhotosFromAPI === 10) {
            Alert.alert(
              'Info', 
              `Loaded all available photos (${totalPhotosFromAPI} shown). The Google Places API may limit results to 10 photos per place.`
            );
          } else {
            Alert.alert('Info', `All available photos have been loaded (${totalPhotosFromAPI} total)`);
          }
          return;
        }
        
        // Skip photos we've already seen and start from the next one
        // Load all remaining photos (not just a batch) to avoid hitting limits
        const startIndex = alreadyLoadedCount;
        const photosToProcess = data.photos.slice(startIndex);
        
        console.log(`📸 Processing photos starting from index ${startIndex} (${photosToProcess.length} photos remaining)`);
        console.log(`📸 Total photos from API: ${totalPhotosFromAPI}, Already loaded: ${alreadyLoadedCount}, Remaining: ${photosToProcess.length}`);
        
        if (photosToProcess.length === 0) {
          console.log(`⚠️ No photos to process! startIndex=${startIndex}, total=${totalPhotosFromAPI}, alreadyLoaded=${alreadyLoadedCount}`);
          Alert.alert('Info', `All available photos have been loaded (${totalPhotosFromAPI} total)`);
          return;
        }
        
        // Extract photo references from the API response
        // Photo name format: "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AW..."
        const newPhotos: GoogleMapsPhoto[] = photosToProcess.map((photo: any, index: number) => {
          const photoName = photo.name || '';
          const photoRef = normalizePhotoRef(photoName);
          console.log(`  📷 Photo ${startIndex + index + 1}: ${photoRef.substring(0, 30)}...`);
          
          return {
            photoReference: photoRef,
            width: photo.widthPx,
            height: photo.heightPx,
            attribution: photo.authorAttributions?.[0]?.displayName
          };
        });

        console.log(`✅ Extracted ${newPhotos.length} new photos`);
        
        if (newPhotos.length > 0) {
          setAdditionalPhotos(prev => {
            const updated = [...prev, ...newPhotos];
            console.log(`✅ Updated additionalPhotos from ${prev.length} to ${updated.length}`);
            return updated;
          });
          
          // Mark that we've loaded more photos (hide button after first load)
          setHasLoadedMorePhotos(true);
          
          // Check if there are more photos available after this batch
          const remainingPhotos = totalPhotosFromAPI - (alreadyLoadedCount + newPhotos.length);
          console.log(`📸 ${remainingPhotos} more photos available after this batch`);
        } else {
          console.log(`⚠️ No new photos extracted!`);
          Alert.alert('Info', 'No additional photos available');
        }
      } else {
        console.log('⚠️ No photos array in API response:', data);
        Alert.alert('Info', 'No photos found in API response');
      }
    } catch (error) {
      console.error('❌ Error loading more photos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Full error details:', {
        message: errorMessage,
        error: error,
        placeId: googleMapsData?.placeId
      });
      Alert.alert(
        'Error Loading Photos', 
        `Failed to load more photos: ${errorMessage}\n\nPlease check:\n1. API key has Places API (New) enabled\n2. API key has photo access permissions\n3. Check console logs for details`
      );
    } finally {
      setLoadingMorePhotos(false);
    }
  }, [googleMapsData, additionalPhotos, loadingMorePhotos, normalizePhotoRef]);

  // Combine synced photos with additional photos
  const allPhotos = useMemo(() => {
    return [...(googleMapsData?.photos || []), ...additionalPhotos];
  }, [googleMapsData?.photos, additionalPhotos]);

  // Reset additional photos and Load More state when campground changes
  useEffect(() => {
    setAdditionalPhotos([]);
    setHasLoadedMorePhotos(false);
  }, [campground]);

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
        });
        console.log('Opening directions URL:', url);
        await Linking.openURL(url);
      } else if (actionToUse === 'search') {
        const campgroundName = campgroundToUse.campground?.name || `${campgroundToUse.city}, ${campgroundToUse.state}`;
        const url = getMapAppUrl(mapAppToUse, 'search', {
          query: campgroundName,
          campgroundId: campgroundId,
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

  const handleBookmark = async () => {
    if (!campgroundId) return;
    
    const newBookmarkState = await toggleBookmark(campgroundId);
    setIsBookmarkedState(newBookmarkState);
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
              <View
                style={[
                  styles.badge,
                  styles.badgeTopRight,
                  { backgroundColor: campground.hookup_type === 'full' ? theme.primary : theme.warning },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.buttonText }]}>
                  {campground.hookup_type === 'full' ? 'Full Hookup' : 'Partial Hookup'}
                </Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>{campground.campground?.name || `${campground.city}, ${campground.state}`}</Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {campground.city}, {campground.state}
            </Text>
            {campground.contributor && (
              <Text style={[styles.contributorTextInline, { color: theme.textSecondary }]}>
                📍 Submitted by {campground.contributor.name}
                {campground.contributor.location && ` from ${campground.contributor.location}`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.reportButton,
              { borderColor: theme.error }
            ]} 
            onPress={handleReportProblem}
          >
            <Ionicons name="warning-outline" size={16} color={theme.error} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.bookmarkButton,
              { borderColor: theme.text },
              isBookmarkedState && { 
                backgroundColor: theme.primary,
                borderColor: theme.primary 
              }
            ]} 
            onPress={handleBookmark}
          >
            <Ionicons 
              name={isBookmarkedState ? "bookmark" : "bookmark-outline"} 
              size={16} 
              color={isBookmarkedState ? theme.buttonText : theme.text} 
            />
          </TouchableOpacity>
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

        {campground.campground && (
          <View style={[styles.section, styles.firstSection]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Campground Info</Text>
            <View style={styles.infoText}>
              {renderHtmlContent(campground.campground.info || 'No information available.')}
            </View>
          </View>
        )}

        {campground.trails.length > 0 && (
          <View style={[styles.section, styles.trailsSection]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Bike Trails</Text>
            {campground.trails.map((trail, index) => (
              <View key={index} style={[styles.trailCard, { backgroundColor: theme.surfaceSecondary }]}>
                {trail.name && <Text style={[styles.trailName, { color: theme.text }]}>{trail.name}</Text>}
                <Text style={[styles.trailInfo, { color: theme.textSecondary }]}>
                  {trail.distance} • {trail.surface}
                </Text>
                {renderHtmlContent(trail.description)}
              </View>
            ))}
          </View>
        )}

        {campground.blog_post && (() => {
          // Extract URL and link text from blog_post HTML
          const urlMatch = campground.blog_post.match(/<a\s+href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/i);
          const blogPostUrl = urlMatch ? urlMatch[1] : null;
          const blogPostTitle = urlMatch ? urlMatch[2].replace(/<[^>]*>/g, '').trim() : null;
          
          if (!blogPostUrl) return null;
          
          return (
            <TouchableOpacity 
              style={[styles.blogPostButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
              onPress={() => {
                Linking.openURL(blogPostUrl).catch(err => {
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
                {blogPostTitle || 'Related Blog Post'}
              </Text>
            </TouchableOpacity>
          );
        })()}
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
                              const photoUrl = getPhotoUrl(stackPhoto.photoReference, googleMapsData.placeId);
                              const actualIndex = index + stackIndex;
                              
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
                                  {photoUrl ? (
                                    <Image 
                                      source={{ uri: photoUrl }} 
                                      style={styles.stackPhotoImage}
                                      resizeMode="cover"
                                      onError={(error) => {
                                        console.error('❌ Stack image load error:', {
                                          photoUrl: photoUrl.substring(0, 100),
                                          error: error.nativeEvent?.error
                                        });
                                      }}
                                      onLoad={() => {
                                        console.log('✅ Stack image loaded successfully');
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
                    const photoUrl = getPhotoUrl(photo.photoReference, googleMapsData.placeId);
                    
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
                        {photoUrl ? (
                          <Image 
                            source={{ uri: photoUrl }} 
                            style={styles.featuredPhotoImage}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error('❌ Image load error:', {
                                photoUrl: photoUrl.substring(0, 100),
                                error: error.nativeEvent?.error
                              });
                            }}
                            onLoad={() => {
                              console.log('✅ Image loaded successfully');
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
                  
                    {/* Load More button column on the right - only show if we haven't loaded more photos yet */}
                    {googleMapsData.placeId && !hasLoadedMorePhotos && (
                      <View style={styles.loadMoreColumn}>
                        <TouchableOpacity
                          style={styles.loadMorePhoto}
                          activeOpacity={0.9}
                          onPress={loadMorePhotos}
                          disabled={loadingMorePhotos}
                        >
                          {loadingMorePhotos ? (
                            <View style={styles.loadMoreContent}>
                              <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading...</Text>
                            </View>
                          ) : (
                            <View style={styles.loadMoreContent}>
                              <Ionicons name="add-circle-outline" size={32} color={theme.primary} />
                              <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Load More</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
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

            {/* Contact Links */}
            {(googleMapsData.websiteUri || googleMapsData.nationalPhoneNumber) && (
              <View style={styles.contactContainer}>
                {googleMapsData.websiteUri && (
                  <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: theme.surfaceSecondary }]}
                    onPress={() => Linking.openURL(googleMapsData.websiteUri!).catch(() => Alert.alert('Error', 'Could not open website'))}
                  >
                    <Ionicons name="globe-outline" size={18} color={theme.primary} />
                    <Text style={[styles.contactButtonText, { color: theme.primary }]}>Website</Text>
                  </TouchableOpacity>
                )}
                {googleMapsData.nationalPhoneNumber && (
                  <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: theme.surfaceSecondary }]}
                    onPress={() => Linking.openURL(`tel:${googleMapsData.nationalPhoneNumber}`).catch(() => Alert.alert('Error', 'Could not make phone call'))}
                  >
                    <Ionicons name="call-outline" size={18} color={theme.primary} />
                    <Text style={[styles.contactButtonText, { color: theme.primary }]}>{googleMapsData.nationalPhoneNumber}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          </>
        )}
        {/* ============================================
            END GOOGLE MAPS DATA SECTION
            ============================================ */}
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
          onClose={() => setPhotoViewerVisible(false)}
          onLoadMorePhotos={loadMorePhotos}
          hasLoadedMorePhotos={hasLoadedMorePhotos}
        />
      )}
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
    marginBottom: 12,
    position: 'relative',
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    marginRight: 120,
    flexWrap: 'wrap',
    flexShrink: 1,
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 0,
    marginBottom: 0,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
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

