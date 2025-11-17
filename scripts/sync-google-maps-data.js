#!/usr/bin/env node

/**
 * Sync script to fetch Google Places API (New) data for campgrounds
 * 
 * Usage:
 *   node scripts/sync-google-maps-data.js              # Sync new/changed campgrounds
 *   node scripts/sync-google-maps-data.js --dry-run    # Preview changes without writing
 *   node scripts/sync-google-maps-data.js --force       # Re-sync all campgrounds
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';
const DELAY_BETWEEN_REQUESTS = 100; // ms - adjust based on rate limits
const MAX_PHOTOS_TO_DOWNLOAD = 4;

// File paths
const CAMPGROUNDS_FILE = path.join(__dirname, '../data/campgrounds.json');
const GOOGLE_MAPS_DATA_FILE = path.join(__dirname, '../data/google-maps-data.json');
const PHOTOS_DIR = path.join(__dirname, '../assets/google-maps-photos');

// Check for API key - try Places API key first, then fall back to existing Google Maps keys
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || 
                process.env.GOOGLE_MAPS_API_KEY || 
                process.env.GOOGLE_MAPS_ANDROID_API_KEY || 
                process.env.GOOGLE_MAPS_IOS_API_KEY;
if (!API_KEY) {
  console.error('❌ Error: Google Places API key not found in .env file');
  console.error('   Please add one of the following:');
  console.error('   - GOOGLE_PLACES_API_KEY=your_api_key_here (recommended)');
  console.error('   - GOOGLE_MAPS_API_KEY=your_api_key_here');
  console.error('   - GOOGLE_MAPS_ANDROID_API_KEY=your_api_key_here');
  console.error('   - GOOGLE_MAPS_IOS_API_KEY=your_api_key_here');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

/**
 * Find a place using coordinates and name
 */
async function findPlace(latitude, longitude, name) {
  try {
    // Use Text Search (New) to find the place
    const url = `${PLACES_API_BASE_URL}/places:searchText`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location'
      },
      body: JSON.stringify({
        textQuery: name,
        locationBias: {
          circle: {
            center: {
              latitude,
              longitude
            },
            radius: 5000 // 5km radius
          }
        },
        maxResultCount: 5
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      // Return the first result (closest match)
      return data.places[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding place for "${name}":`, error.message);
    return null;
  }
}

/**
 * Fetch place details
 */
async function fetchPlaceDetails(placeId) {
  try {
    const url = `${PLACES_API_BASE_URL}/places/${placeId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': [
          'id',
          'editorialSummary',
          'rating',
          'userRatingCount',
          'reviews',
          'photos',
          'currentOpeningHours',
          'websiteUri',
          'nationalPhoneNumber'
        ].join(',')
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error.message);
    return null;
  }
}

/**
 * Download a photo from Google Places
 * @param {string} photoName - Full photo name from API (e.g., "places/ChIJ.../photos/AW...")
 */
async function downloadPhoto(photoName, campgroundId, photoIndex) {
  try {
    // Places API (New) photo endpoint format: places/{place_id}/photos/{photo_reference}/media
    const url = `${PLACES_API_BASE_URL}/${photoName}/media?maxWidthPx=800&maxHeightPx=800&key=${API_KEY}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Photo download failed: ${response.status} - ${errorText}`);
    }

    const photoDir = path.join(PHOTOS_DIR, campgroundId);
    await fs.ensureDir(photoDir);
    
    const photoPath = path.join(photoDir, `photo-${photoIndex}.jpg`);
    const buffer = await response.buffer();
    await fs.writeFile(photoPath, buffer);
    
    console.log(`      ✓ Downloaded photo ${photoIndex + 1}`);
    return photoPath;
  } catch (error) {
    console.error(`      ✗ Error downloading photo ${photoIndex} for ${campgroundId}:`, error.message);
    return null;
  }
}

/**
 * Process a single campground
 */
async function processCampground(entry, campgroundId, existingData) {
  const existing = existingData.entries[campgroundId];
  
  // Skip if already synced and not forcing
  if (existing && existing.syncStatus === 'success' && !isForce) {
    return { skipped: true, campgroundId };
  }

  // Validate entry data
  if (!entry.campground || !entry.campground.name) {
    console.log(`\n⚠️  Skipping: Invalid campground data (${entry.city}, ${entry.state})`);
    return {
      campgroundId,
      syncStatus: 'failed',
      syncError: 'Invalid campground data - missing name',
      lastUpdated: new Date().toISOString()
    };
  }

  console.log(`\n📍 Processing: ${entry.campground.name} (${entry.city}, ${entry.state})`);

  // Find the place
  const place = await findPlace(entry.latitude, entry.longitude, entry.campground.name);
  
  if (!place || !place.id) {
    console.log(`   ⚠️  Place not found`);
    return {
      campgroundId,
      syncStatus: 'not_found',
      lastUpdated: new Date().toISOString()
    };
  }

  const placeId = place.id;
  console.log(`   ✓ Found place: ${placeId}`);

  // Fetch place details
  const details = await fetchPlaceDetails(placeId);
  
  if (!details) {
    return {
      campgroundId,
      placeId,
      syncStatus: 'failed',
      syncError: 'Failed to fetch place details',
      lastUpdated: new Date().toISOString()
    };
  }

  // Download photos
  const photos = [];
  if (details.photos && Array.isArray(details.photos) && details.photos.length > 0) {
    const photosToDownload = Math.min(MAX_PHOTOS_TO_DOWNLOAD, details.photos.length);
    console.log(`   📸 Downloading ${photosToDownload} photos...`);
    
    for (let i = 0; i < photosToDownload; i++) {
      const photo = details.photos[i];
      
      // Skip if photo is null or doesn't have a name
      if (!photo || !photo.name) {
        console.log(`      ⚠️  Skipping photo ${i + 1} - missing data`);
        continue;
      }
      
      // Photo name format: "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AW..."
      // Extract the photo reference (last part after /photos/)
      const photoName = photo.name || '';
      const photoRef = photoName.includes('/photos/') 
        ? photoName.split('/photos/')[1] 
        : photoName.split('/').pop();
      
      const localPath = await downloadPhoto(photoName, campgroundId, i);
      
      photos.push({
        photoReference: photoRef,
        localPath: localPath ? path.relative(path.join(__dirname, '..'), localPath) : undefined,
        width: photo.widthPx,
        height: photo.heightPx,
        attribution: photo.authorAttributions?.[0]?.displayName
      });
      
      // Small delay between photo downloads
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }

  // Extract review summary and topics from reviews
  let reviewSummary = null;
  const reviewTopics = new Set();
  
  if (details.reviews && details.reviews.length > 0) {
    // Use the first review's text as summary (or could use AI summary if available)
    const firstReview = details.reviews[0];
    reviewSummary = {
      text: firstReview.text?.text || ''
    };
    
    // Extract topics from review text (simplified - could be enhanced)
    // For now, we'll store common keywords
    details.reviews.forEach(review => {
      const text = review.text?.text?.toLowerCase() || '';
      if (text.includes('family') || text.includes('kids')) reviewTopics.add('Great for families');
      if (text.includes('pet') || text.includes('dog')) reviewTopics.add('Pet-friendly');
      if (text.includes('quiet') || text.includes('peaceful')) reviewTopics.add('Quiet');
      if (text.includes('clean') || text.includes('well-maintained')) reviewTopics.add('Clean');
    });
  }

  const googleMapsData = {
    campgroundId,
    placeId,
    editorialSummary: details.editorialSummary?.overview || undefined,
    rating: details.rating || undefined,
    userRatingCount: details.userRatingCount || undefined,
    reviewSummary: reviewSummary || undefined,
    reviewTopics: Array.from(reviewTopics),
    photos: photos.length > 0 ? photos : undefined,
    openingHours: details.currentOpeningHours ? {
      weekdayText: details.currentOpeningHours.weekdayDescriptions || [],
      openNow: details.currentOpeningHours.openNow
    } : undefined,
    websiteUri: details.websiteUri || undefined,
    nationalPhoneNumber: details.nationalPhoneNumber || undefined,
    lastUpdated: new Date().toISOString(),
    syncStatus: 'success'
  };

  return googleMapsData;
}

/**
 * Main sync function
 */
async function syncGoogleMapsData() {
  console.log('🚀 Starting Google Maps data sync...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be saved\n');
  }

  // Load campground data
  console.log('📖 Loading campground data...');
  const campgroundsData = await fs.readJson(CAMPGROUNDS_FILE);
  const campgrounds = campgroundsData.entries;
  console.log(`   Found ${campgrounds.length} campgrounds\n`);

  // Load existing Google Maps data
  let googleMapsData = { entries: {}, metadata: { syncVersion: '1.0.0' } };
  if (await fs.pathExists(GOOGLE_MAPS_DATA_FILE)) {
    try {
      googleMapsData = await fs.readJson(GOOGLE_MAPS_DATA_FILE);
      console.log(`📊 Existing Google Maps data: ${Object.keys(googleMapsData.entries).length} entries\n`);
    } catch (error) {
      console.log(`⚠️  Error reading existing data file, starting fresh: ${error.message}\n`);
      googleMapsData = { entries: {}, metadata: { syncVersion: '1.0.0' } };
    }
  }

  // Ensure photos directory exists
  await fs.ensureDir(PHOTOS_DIR);

  // Find campgrounds to process
  const toProcess = [];
  const toRemove = [];

  // Check for new/changed campgrounds
  campgrounds.forEach((entry, index) => {
    const campgroundId = `${entry.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${entry.state.toLowerCase()}-${(entry.campground?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    
    if (!googleMapsData.entries[campgroundId] || isForce) {
      toProcess.push({ entry, campgroundId, index });
    }
  });

  // Check for removed campgrounds
  Object.keys(googleMapsData.entries).forEach(campgroundId => {
    const exists = campgrounds.some((entry, index) => {
      const id = `${entry.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${entry.state.toLowerCase()}-${(entry.campground?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      return id === campgroundId;
    });
    if (!exists) {
      toRemove.push(campgroundId);
    }
  });

  console.log(`📋 Summary:`);
  console.log(`   New/Changed: ${toProcess.length}`);
  console.log(`   To Remove: ${toRemove.length}`);
  console.log(`   Already Synced: ${Object.keys(googleMapsData.entries).length - toProcess.length}\n`);

  if (toProcess.length === 0 && toRemove.length === 0) {
    console.log('✅ All campgrounds are up to date!');
    return;
  }

  // Process campgrounds
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const SAVE_INTERVAL = 10; // Save every 10 campgrounds

  for (const { entry, campgroundId } of toProcess) {
    const result = await processCampground(entry, campgroundId, googleMapsData);
    
    if (result.skipped) {
      skipped++;
      continue;
    }

    googleMapsData.entries[campgroundId] = result;
    processed++;

    if (result.syncStatus === 'success') {
      succeeded++;
    } else {
      failed++;
    }

    // Save incrementally every SAVE_INTERVAL campgrounds or at the end
    if (!isDryRun && (processed % SAVE_INTERVAL === 0 || processed === toProcess.length)) {
      // Update metadata
      googleMapsData.metadata = {
        lastFullSync: new Date().toISOString(),
        totalEntries: Object.keys(googleMapsData.entries).length,
        syncVersion: '1.0.0'
      };
      
      await fs.writeJson(GOOGLE_MAPS_DATA_FILE, googleMapsData, { spaces: 2 });
      console.log(`   💾 Saved progress (${processed}/${toProcess.length} processed)`);
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    
    // Progress update
    if (processed % 10 === 0) {
      console.log(`\n📊 Progress: ${processed}/${toProcess.length} processed (${succeeded} succeeded, ${failed} failed)`);
    }
  }

  // Remove deleted campgrounds
  toRemove.forEach(campgroundId => {
    delete googleMapsData.entries[campgroundId];
    console.log(`🗑️  Removed: ${campgroundId}`);
  });

  // Final save (if not already saved at the end of processing loop)
  if (!isDryRun) {
    // Update metadata
    googleMapsData.metadata = {
      lastFullSync: new Date().toISOString(),
      totalEntries: Object.keys(googleMapsData.entries).length,
      syncVersion: '1.0.0'
    };
    
    await fs.writeJson(GOOGLE_MAPS_DATA_FILE, googleMapsData, { spaces: 2 });
    console.log(`\n💾 Final save to ${GOOGLE_MAPS_DATA_FILE}`);
  } else {
    console.log(`\n🔍 DRY RUN - Would save ${Object.keys(googleMapsData.entries).length} entries`);
  }

  // Final summary
  console.log(`\n✅ Sync complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Succeeded: ${succeeded}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Removed: ${toRemove.length}`);
  console.log(`   Total entries: ${Object.keys(googleMapsData.entries).length}`);
}

// Run the sync
syncGoogleMapsData().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

