import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { isExpoGo } from '../constants/revenuecat';

const VIEWED_CAMPGROUNDS_KEY = '@campground_views';
const FIRST_VIEW_DATE_KEY = '@first_view_date';
const REVENUECAT_VIEWED_CAMPGROUNDS_KEY = 'viewed_campgrounds';
const REVENUECAT_FIRST_VIEW_DATE_KEY = 'first_view_date';

export async function syncFromRevenueCat(): Promise<void> {
  try {
    console.log('🔄 syncFromRevenueCat: Starting sync from RevenueCat...');
    
    // Try to get attributes from RevenueCat
    if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
      console.log('⚠️ syncFromRevenueCat: Purchases SDK not available');
      return;
    }
    
    // Get app user ID for logging
    try {
      const appUserID = await Purchases.getAppUserID();
      console.log('📱 syncFromRevenueCat: RevenueCat App User ID:', appUserID);
    } catch (e) {
      if (!isExpoGo) {
        console.warn('⚠️ syncFromRevenueCat: Could not get App User ID:', e);
      }
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    const attributes = customerInfo.attributes;
    
    console.log('📊 syncFromRevenueCat: Customer attributes:', {
      attributeKeys: Object.keys(attributes),
      viewedCampgroundsAttr: attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY] ? {
        exists: true,
        value: attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY].value?.substring(0, 100) + '...',
        valueLength: attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY].value?.length
      } : { exists: false },
      firstViewDateAttr: attributes[REVENUECAT_FIRST_VIEW_DATE_KEY] ? {
        exists: true,
        value: attributes[REVENUECAT_FIRST_VIEW_DATE_KEY].value
      } : { exists: false }
    });
    
    // Check local storage before syncing
    const localViewed = await AsyncStorage.getItem(VIEWED_CAMPGROUNDS_KEY);
    const localViewedCount = localViewed ? JSON.parse(localViewed).length : 0;
    console.log('📊 syncFromRevenueCat: Local storage before sync:', {
      localViewedCount,
      hasLocalData: !!localViewed
    });
    
    // Sync viewed campgrounds from RevenueCat
    if (attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY]?.value) {
      try {
        const viewedCampgrounds = JSON.parse(attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY].value);
        await AsyncStorage.setItem(VIEWED_CAMPGROUNDS_KEY, JSON.stringify(viewedCampgrounds));
        console.log('✅ syncFromRevenueCat: Synced viewed campgrounds from RevenueCat:', {
          count: viewedCampgrounds.length,
          campgrounds: viewedCampgrounds
        });
      } catch (parseError) {
        if (!isExpoGo) {
          console.error('❌ syncFromRevenueCat: Error parsing viewed campgrounds from RevenueCat:', parseError);
        }
      }
    } else {
      console.log('ℹ️ syncFromRevenueCat: No viewed campgrounds attribute found in RevenueCat');
    }
    
    // Sync first view date from RevenueCat
    if (attributes[REVENUECAT_FIRST_VIEW_DATE_KEY]?.value) {
      await AsyncStorage.setItem(FIRST_VIEW_DATE_KEY, attributes[REVENUECAT_FIRST_VIEW_DATE_KEY].value);
      console.log('✅ syncFromRevenueCat: Synced first view date from RevenueCat:', attributes[REVENUECAT_FIRST_VIEW_DATE_KEY].value);
    } else {
      console.log('ℹ️ syncFromRevenueCat: No first view date attribute found in RevenueCat');
    }
    
    // Check local storage after syncing
    const localViewedAfter = await AsyncStorage.getItem(VIEWED_CAMPGROUNDS_KEY);
    const localViewedCountAfter = localViewedAfter ? JSON.parse(localViewedAfter).length : 0;
    console.log('📊 syncFromRevenueCat: Local storage after sync:', {
      localViewedCountAfter,
      hasLocalData: !!localViewedAfter
    });
  } catch (error) {
    if (!isExpoGo) {
      console.error('❌ syncFromRevenueCat: Error syncing from RevenueCat:', error);
    }
  }
}

async function syncToRevenueCat(viewedCampgrounds: string[], firstViewDate?: string): Promise<void> {
  try {
    console.log('🔄 syncToRevenueCat: Starting sync to RevenueCat...', {
      viewedCampgroundsCount: viewedCampgrounds.length,
      hasFirstViewDate: !!firstViewDate
    });
    
    // Sync to RevenueCat attributes
    if (!Purchases || typeof Purchases.setAttributes !== 'function') {
      console.log('⚠️ syncToRevenueCat: Purchases SDK not available');
      return;
    }
    
    const attributes: { [key: string]: string } = {
      [REVENUECAT_VIEWED_CAMPGROUNDS_KEY]: JSON.stringify(viewedCampgrounds),
    };
    
    if (firstViewDate) {
      attributes[REVENUECAT_FIRST_VIEW_DATE_KEY] = firstViewDate;
    }
    
    console.log('📤 syncToRevenueCat: Setting attributes:', {
      viewedCampgroundsKey: REVENUECAT_VIEWED_CAMPGROUNDS_KEY,
      viewedCampgroundsValue: JSON.stringify(viewedCampgrounds),
      firstViewDateKey: firstViewDate ? REVENUECAT_FIRST_VIEW_DATE_KEY : undefined,
      firstViewDateValue: firstViewDate
    });
    
    await Purchases.setAttributes(attributes);
    console.log('✅ syncToRevenueCat: Successfully synced view data to RevenueCat');
    
    // Verify the sync by reading back
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const syncedAttributes = customerInfo.attributes;
      console.log('✅ syncToRevenueCat: Verified sync - attributes now in RevenueCat:', {
        viewedCampgroundsExists: !!syncedAttributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY],
        firstViewDateExists: !!syncedAttributes[REVENUECAT_FIRST_VIEW_DATE_KEY]
      });
    } catch (verifyError) {
      if (!isExpoGo) {
        console.warn('⚠️ syncToRevenueCat: Could not verify sync:', verifyError);
      }
    }
  } catch (error) {
    if (!isExpoGo) {
      console.error('❌ syncToRevenueCat: Error syncing to RevenueCat:', error);
    }
  }
}

export async function getViewedCampgrounds(): Promise<string[]> {
  try {
    // First try to sync from RevenueCat (in case of reinstall)
    await syncFromRevenueCat();
    
    // Then get from local storage
    const data = await AsyncStorage.getItem(VIEWED_CAMPGROUNDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting viewed campgrounds:', error);
    return [];
  }
}

export async function addViewedCampground(campgroundId: string): Promise<void> {
  try {
    const viewed = await getViewedCampgrounds();
    if (!viewed.includes(campgroundId)) {
      viewed.push(campgroundId);
      await AsyncStorage.setItem(VIEWED_CAMPGROUNDS_KEY, JSON.stringify(viewed));
      
      // Track first view date if not set
      let firstViewDate = await AsyncStorage.getItem(FIRST_VIEW_DATE_KEY);
      if (!firstViewDate) {
        firstViewDate = new Date().toISOString();
        await AsyncStorage.setItem(FIRST_VIEW_DATE_KEY, firstViewDate);
      }
      
      // Sync to RevenueCat attributes (persists across reinstalls)
      await syncToRevenueCat(viewed, firstViewDate);
    }
  } catch (error) {
    console.error('Error adding viewed campground:', error);
  }
}

export async function getViewCount(): Promise<number> {
  const viewed = await getViewedCampgrounds();
  return viewed.length;
}

export async function getRemainingViews(): Promise<number | null> {
  try {
    const { SUBSCRIPTION_CONFIG } = await import('./subscriptionConfig');
    const viewCount = await getViewCount();
    const remaining = Math.max(0, SUBSCRIPTION_CONFIG.maxCampgroundViews - viewCount);
    return remaining;
  } catch (error) {
    console.error('Error getting remaining views:', error);
    return null;
  }
}

export async function getDaysSinceFirstView(): Promise<number> {
  try {
    const firstViewDate = await AsyncStorage.getItem(FIRST_VIEW_DATE_KEY);
    if (!firstViewDate) return 0;
    
    const firstDate = new Date(firstViewDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - firstDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.error('Error calculating days since first view:', error);
    return 0;
  }
}

export async function shouldShowPaywall(): Promise<boolean> {
  const { SUBSCRIPTION_CONFIG } = await import('./subscriptionConfig');
  
  if (SUBSCRIPTION_CONFIG.triggerType === 'campgrounds') {
    const viewCount = await getViewCount();
    return viewCount >= SUBSCRIPTION_CONFIG.maxCampgroundViews;
  } else {
    const days = await getDaysSinceFirstView();
    return days >= SUBSCRIPTION_CONFIG.maxDays;
  }
}

export async function resetViewCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VIEWED_CAMPGROUNDS_KEY);
    await AsyncStorage.removeItem(FIRST_VIEW_DATE_KEY);
    
    // Also reset RevenueCat attributes
    await syncToRevenueCat([], undefined);
  } catch (error) {
    console.error('Error resetting view count:', error);
  }
}

