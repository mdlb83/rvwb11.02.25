import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = '@rving_with_bikes:bookmarks';

export async function getBookmarks(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (value === null) {
      return [];
    }
    return JSON.parse(value);
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}

export async function isBookmarked(campgroundId: string): Promise<boolean> {
  try {
    const bookmarks = await getBookmarks();
    return bookmarks.includes(campgroundId);
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }
}

export async function toggleBookmark(campgroundId: string): Promise<boolean> {
  try {
    const bookmarks = await getBookmarks();
    const index = bookmarks.indexOf(campgroundId);
    
    if (index > -1) {
      // Remove bookmark
      bookmarks.splice(index, 1);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return false;
    } else {
      // Add bookmark
      bookmarks.push(campgroundId);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return false;
  }
}

