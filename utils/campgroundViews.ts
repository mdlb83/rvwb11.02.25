import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEWED_CAMPGROUNDS_KEY = '@campground_views';
const FIRST_VIEW_DATE_KEY = '@first_view_date';

export async function getViewedCampgrounds(): Promise<string[]> {
  try {
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
      const firstViewDate = await AsyncStorage.getItem(FIRST_VIEW_DATE_KEY);
      if (!firstViewDate) {
        await AsyncStorage.setItem(FIRST_VIEW_DATE_KEY, new Date().toISOString());
      }
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
  } catch (error) {
    console.error('Error resetting view count:', error);
  }
}

