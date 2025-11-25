import { Paths, File, Directory } from 'expo-file-system';

// Use document directory for persistent storage (survives app updates)
const PHOTO_CACHE_DIR = new Directory(Paths.document, 'google-maps-photos');

/**
 * Get the local file path for a cached photo
 */
export function getCachedPhotoPath(campgroundId: string, photoIndex: number): File {
  return new File(PHOTO_CACHE_DIR, campgroundId, `photo-${photoIndex}.jpg`);
}

/**
 * Check if a photo is cached locally
 */
export async function isPhotoCached(campgroundId: string, photoIndex: number): Promise<boolean> {
  try {
    const file = getCachedPhotoPath(campgroundId, photoIndex);
    const info = await Paths.info(file.uri);
    return info.exists;
  } catch (error) {
    console.error('Error checking photo cache:', error);
    return false;
  }
}

/**
 * Download and cache a photo from Google Places API
 */
export async function downloadAndCachePhoto(
  photoUrl: string,
  campgroundId: string,
  photoIndex: number
): Promise<string | null> {
  try {
    // Ensure directory exists
    const campgroundDir = new Directory(PHOTO_CACHE_DIR, campgroundId);
    const dirInfo = await Paths.info(campgroundDir.uri);
    if (!dirInfo.exists) {
      campgroundDir.create({ intermediates: true, idempotent: true });
    }

    // Download photo
    const file = getCachedPhotoPath(campgroundId, photoIndex);
    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.error('Failed to download photo:', response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    // Create file if it doesn't exist, then write
    if (!file.exists) {
      file.create({ overwrite: true });
    }
    file.write(uint8Array);

    return file.uri;
  } catch (error) {
    console.error('Error downloading photo:', error);
    return null;
  }
}

/**
 * Get photo URI - returns cached path if available, otherwise returns the URL
 * Optionally downloads in background if not cached
 */
export async function getPhotoUri(
  photoUrl: string,
  campgroundId: string,
  photoIndex: number,
  downloadIfMissing: boolean = true
): Promise<string> {
  // Check if cached
  const cached = await isPhotoCached(campgroundId, photoIndex);
  
  if (cached) {
    const file = getCachedPhotoPath(campgroundId, photoIndex);
    return file.uri;
  }

  // If not cached and downloadIfMissing is true, download in background
  if (downloadIfMissing) {
    // Download in background (don't wait)
    downloadAndCachePhoto(photoUrl, campgroundId, photoIndex).catch(err => {
      console.error('Background photo download failed:', err);
    });
  }

  // Return the URL for now (will use cached version on next load)
  return photoUrl;
}

/**
 * Pre-download photos for a campground (useful for preloading)
 */
export async function preloadCampgroundPhotos(
  photos: Array<{ photoReference: string; localPath?: string }>,
  campgroundId: string,
  placeId: string,
  getPhotoUrl: (photoReference: string, placeId?: string) => string | null
): Promise<void> {
  const downloadPromises = photos.map(async (photo, index) => {
    if (!photo.photoReference) return;
    
    const isCached = await isPhotoCached(campgroundId, index);
    if (isCached) return; // Already cached, skip

    const photoUrl = getPhotoUrl(photo.photoReference, placeId);
    if (!photoUrl) return;

    await downloadAndCachePhoto(photoUrl, campgroundId, index);
  });

  await Promise.allSettled(downloadPromises);
}

/**
 * Clear all cached photos (useful for debugging or storage management)
 */
export async function clearPhotoCache(): Promise<void> {
  try {
    const dirInfo = await Paths.info(PHOTO_CACHE_DIR.uri);
    if (dirInfo.exists) {
      await PHOTO_CACHE_DIR.delete();
    }
  } catch (error) {
    console.error('Error clearing photo cache:', error);
  }
}

/**
 * Get cache size (for storage management)
 */
export async function getCacheSize(): Promise<number> {
  try {
    const dirInfo = await Paths.info(PHOTO_CACHE_DIR.uri);
    if (dirInfo.exists && dirInfo.isDirectory) {
      // Note: Would need to recursively check all files to get total size
      // For now, return 0 as a placeholder
      return 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
}

