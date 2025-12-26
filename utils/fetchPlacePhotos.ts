import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import { downloadAndCachePhoto, getCachedPhotoPath } from './photoCache';

// TEMPORARY: Hardcoded API key for testing - REMOVE BEFORE COMMITTING
const TEMP_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual Google Maps API key

/**
 * Fetch fresh photos from Google Places API for a given placeId
 * Returns array of photo names (full paths) starting from startIndex
 */
export async function fetchPlacePhotos(
  placeId: string,
  startIndex: number = 2,
  maxPhotos: number = 10
): Promise<string[]> {
  try {
    const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
    const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
    const extraKey = Constants.expoConfig?.extra?.googleMapsApiKey;
    // TEMPORARY: Use hardcoded key if config keys are not available (for Expo Go testing)
    const apiKey = iosKey || androidKey || extraKey || TEMP_API_KEY;

    console.log('🔑 API Key check:', {
      hasIosKey: !!iosKey,
      hasAndroidKey: !!androidKey,
      hasExtraKey: !!extraKey,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      placeId: placeId
    });

    if (!apiKey) {
      console.warn('⚠️ No API key available for fetching photos');
      return [];
    }

    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    console.log('📡 Fetching photos from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'photos'
      }
    });

    console.log('📡 API Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch photos for placeId ${placeId}:`, response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('📡 API Response data:', {
      hasPhotos: !!data.photos,
      photoCount: data.photos?.length || 0,
      totalPhotos: data.photos?.length || 0
    });

    if (!data.photos || !Array.isArray(data.photos)) {
      console.warn('⚠️ No photos array in response');
      return [];
    }

    // Get photos starting from startIndex
    const photosToFetch = data.photos.slice(startIndex, startIndex + maxPhotos);
    const photoNames = photosToFetch
      .map((photo: any) => photo.name)
      .filter((name: string | undefined) => !!name);
    
    console.log(`✅ Fetched ${photoNames.length} photo names (starting from index ${startIndex})`);
    return photoNames;
  } catch (error) {
    console.error('❌ Error fetching place photos:', error);
    return [];
  }
}

/**
 * Download and cache photos from Google Places API
 * Downloads photos in parallel for faster loading
 * Returns array of cached photo URIs
 */
export async function downloadAndCachePlacePhotos(
  photoNames: string[],
  campgroundId: string,
  startIndex: number,
  onPhotoCached?: (index: number, uri: string) => void // Callback when each photo is cached
): Promise<{ [index: number]: string }> {
  const cachedPhotos: { [index: number]: string } = {};

  // Download all photos in parallel for faster loading
  const downloadPromises = photoNames.map(async (photoName, i) => {
    const photoIndex = startIndex + i;
    
    // Check if already cached
    const cachedPath = getCachedPhotoPath(campgroundId, photoIndex);
    const cachedInfo = await Paths.info(cachedPath.uri);
    
    if (cachedInfo.exists) {
      console.log(`✅ Photo ${photoIndex} already cached:`, cachedPath.uri);
      cachedPhotos[photoIndex] = cachedPath.uri;
      if (onPhotoCached) {
        onPhotoCached(photoIndex, cachedPath.uri);
      }
      return { index: photoIndex, uri: cachedPath.uri };
    }

    // Download photo
    const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
    const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
    const extraKey = Constants.expoConfig?.extra?.googleMapsApiKey;
    // TEMPORARY: Use hardcoded key if config keys are not available (for Expo Go testing)
    const apiKey = iosKey || androidKey || extraKey || TEMP_API_KEY;

    if (!apiKey) {
      return null;
    }

    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&maxHeightPx=800&key=${apiKey}`;
    console.log(`⬇️ Downloading photo ${photoIndex}...`);
    const cachedUri = await downloadAndCachePhoto(photoUrl, campgroundId, photoIndex);
    
    if (cachedUri) {
      console.log(`✅ Photo ${photoIndex} cached successfully:`, cachedUri);
      cachedPhotos[photoIndex] = cachedUri;
      if (onPhotoCached) {
        onPhotoCached(photoIndex, cachedUri);
      }
      return { index: photoIndex, uri: cachedUri };
    } else {
      console.warn(`⚠️ Failed to cache photo ${photoIndex}`);
      return null;
    }
  });

  // Wait for all downloads to complete (in parallel)
  await Promise.allSettled(downloadPromises);

  return cachedPhotos;
}

