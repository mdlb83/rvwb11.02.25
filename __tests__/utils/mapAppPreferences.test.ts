import {
  getMapAppPreference,
  setMapAppPreference,
  getMapAppUrl,
  getMapAppName,
  getAvailableMapApps,
  MapApp,
} from '../../utils/mapAppPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock Platform before importing
const mockPlatform = {
  OS: 'ios',
  select: jest.fn((dict: any) => dict.ios),
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: mockPlatform,
  };
});

describe('mapAppPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMapAppPreference', () => {
    it('should return stored preference', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('google');

      const result = await getMapAppPreference();

      expect(result).toBe('google');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        '@rving_with_bikes:map_app_preference'
      );
    });

    it('should return null if no preference is stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getMapAppPreference();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await getMapAppPreference();

      expect(result).toBeNull();
    });
  });

  describe('setMapAppPreference', () => {
    it('should save preference to AsyncStorage', async () => {
      await setMapAppPreference('google');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@rving_with_bikes:map_app_preference',
        'google'
      );
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(setMapAppPreference('google')).resolves.not.toThrow();
    });
  });

  describe('getMapAppUrl', () => {
    describe('directions', () => {
      it('should return Apple Maps URL for directions on iOS', () => {
        const url = getMapAppUrl('apple', 'directions', {
          latitude: 32.2226,
          longitude: -110.9747,
        });

        expect(url).toBe('http://maps.apple.com/?daddr=32.2226,-110.9747&dirflg=d');
      });

      it('should return Google Maps URL for directions', () => {
        const url = getMapAppUrl('google', 'directions', {
          latitude: 32.2226,
          longitude: -110.9747,
        });

        expect(url).toBe(
          'https://www.google.com/maps/dir/?api=1&destination=32.2226,-110.9747'
        );
      });

      it('should return Waze URL for directions', () => {
        const url = getMapAppUrl('waze', 'directions', {
          latitude: 32.2226,
          longitude: -110.9747,
        });

        expect(url).toBe('waze://?navigate=yes&ll=32.2226,-110.9747');
      });

      it('should use platform default for default app', () => {
        const url = getMapAppUrl('default', 'directions', {
          latitude: 32.2226,
          longitude: -110.9747,
        });

        // On iOS, default should be Apple Maps
        expect(url).toBe('http://maps.apple.com/?daddr=32.2226,-110.9747&dirflg=d');
      });
    });

    describe('search', () => {
      it('should return Apple Maps URL for search on iOS', () => {
        const url = getMapAppUrl('apple', 'search', {
          query: 'Test Campground',
        });

        expect(url).toBe('http://maps.apple.com/?q=Test%20Campground');
      });

      it('should return Google Maps URL for search', () => {
        const url = getMapAppUrl('google', 'search', {
          query: 'Test Campground',
        });

        expect(url).toBe(
          'https://www.google.com/maps/search/?api=1&query=Test%20Campground'
        );
      });

      it('should return Waze URL for search', () => {
        const url = getMapAppUrl('waze', 'search', {
          query: 'Test Campground',
        });

        expect(url).toBe('waze://?q=Test%20Campground');
      });

      it('should encode query parameters', () => {
        const url = getMapAppUrl('google', 'search', {
          query: 'Campground & RV Park',
        });

        expect(url).toContain('Campground%20%26%20RV%20Park');
      });
    });
  });

  describe('getMapAppName', () => {
    it('should return correct name for each app', () => {
      expect(getMapAppName('apple')).toBe('Apple Maps');
      expect(getMapAppName('google')).toBe('Google Maps');
      expect(getMapAppName('waze')).toBe('Waze');
    });

    it('should return platform-specific default name', () => {
      const defaultName = getMapAppName('default');
      // On iOS, should return Apple Maps (Default)
      expect(defaultName).toBe('Apple Maps (Default)');
    });
  });

  describe('getAvailableMapApps', () => {
    it('should return available apps for iOS', () => {
      const apps = getAvailableMapApps();

      expect(apps).toHaveLength(4);
      expect(apps.find((a) => a.value === 'default')).toBeTruthy();
      expect(apps.find((a) => a.value === 'google')).toBeTruthy();
      expect(apps.find((a) => a.value === 'apple')).toBeTruthy();
      expect(apps.find((a) => a.value === 'waze')).toBeTruthy();
    });
  });
});

