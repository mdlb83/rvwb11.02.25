import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';

const VIEWED_CAMPGROUNDS_KEY = '@campground_views';
const FIRST_VIEW_DATE_KEY = '@first_view_date';
const REVENUECAT_VIEWED_CAMPGROUNDS_KEY = 'viewed_campgrounds';
const REVENUECAT_FIRST_VIEW_DATE_KEY = 'first_view_date';

export async function syncFromRevenueCat(): Promise<void> {
  try {
    // Try to get attributes from RevenueCat
    if (Purchases && typeof Purchases.getCustomerInfo === 'function') {
      const customerInfo = await Purchases.getCustomerInfo();
      const attributes = customerInfo.attributes;
      
      // Sync viewed campgrounds from RevenueCat
      if (attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY]?.value) {
        try {
          const viewedCampgrounds = JSON.parse(attributes[REVENUECAT_VIEWED_CAMPGROUNDS_KEY].value);
          await AsyncStorage.setItem(VIEWED_CAMPGROUNDS_KEY, JSON.stringify(viewedCampgrounds));
          console.log('✅ Synced viewed campgrounds from RevenueCat:', viewedCampgrounds.length);
        } catch (parseError) {
          console.warn('Error parsing viewed campgrounds from RevenueCat:', parseError);
        }
      }
      
      // Sync first view date from RevenueCat
      if (attributes[REVENUECAT_FIRST_VIEW_DATE_KEY]?.value) {
        await AsyncStorage.setItem(FIRST_VIEW_DATE_KEY, attributes[REVENUECAT_FIRST_VIEW_DATE_KEY].value);
        console.log('✅ Synced first view date from RevenueCat');
      }
    }
  } catch (error) {
    console.warn('Error syncing from RevenueCat (non-fatal):', error);
  }
}

async function syncToRevenueCat(viewedCampgrounds: string[], firstViewDate?: string): Promise<void> {
  try {
    // Sync to RevenueCat attributes
    if (Purchases && typeof Purchases.setAttributes === 'function') {
      const attributes: { [key: string]: string } = {
        [REVENUECAT_VIEWED_CAMPGROUNDS_KEY]: JSON.stringify(viewedCampgrounds),
      };
      
      if (firstViewDate) {
        attributes[REVENUECAT_FIRST_VIEW_DATE_KEY] = firstViewDate;
      }
      
      await Purchases.setAttributes(attributes);
      console.log('✅ Synced view data to RevenueCat');
    }
  } catch (error) {
    console.warn('Error syncing to RevenueCat (non-fatal):', error);
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

