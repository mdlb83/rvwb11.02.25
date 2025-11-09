import {
  filterCampgrounds,
  getUniqueStates,
  findCampgroundById,
  generateCampgroundId,
} from '../../utils/dataLoader';
import { CampgroundEntry } from '../../types/campground';

// Mock campground data for testing
const mockCampgrounds: CampgroundEntry[] = [
  {
    city: 'Tucson',
    state: 'AZ',
    hookup_type: 'full',
    campground: {
      name: 'Test Campground 1',
      type: 'RV Park',
      info: 'Test info',
      notes: 'Test notes',
    },
    trails: [],
    blog_post: null,
    contributor: null,
    latitude: 32.2226,
    longitude: -110.9747,
  },
  {
    city: 'Phoenix',
    state: 'AZ',
    hookup_type: 'partial',
    campground: {
      name: 'Test Campground 2',
      type: 'State Park',
      info: 'Test info 2',
      notes: '',
    },
    trails: [],
    blog_post: null,
    contributor: null,
    latitude: 33.4484,
    longitude: -112.074,
  },
  {
    city: 'Denver',
    state: 'CO',
    hookup_type: 'full',
    campground: {
      name: 'Test Campground 3',
      type: 'RV Park',
      info: 'Test info 3',
      notes: '',
    },
    trails: [],
    blog_post: null,
    contributor: null,
    latitude: 39.7392,
    longitude: -104.9903,
  },
];

describe('dataLoader utilities', () => {
  describe('filterCampgrounds', () => {
    it('should return all campgrounds when no filters are provided', () => {
      const result = filterCampgrounds(mockCampgrounds, {});
      expect(result).toHaveLength(3);
    });

    it('should filter by state', () => {
      const result = filterCampgrounds(mockCampgrounds, { state: 'AZ' });
      expect(result).toHaveLength(2);
      expect(result.every(c => c.state === 'AZ')).toBe(true);
    });

    it('should filter by hookup type', () => {
      const result = filterCampgrounds(mockCampgrounds, { hookupType: 'full' });
      expect(result).toHaveLength(2);
      expect(result.every(c => c.hookup_type === 'full')).toBe(true);
    });

    it('should filter by hookup type "all"', () => {
      const result = filterCampgrounds(mockCampgrounds, { hookupType: 'all' });
      expect(result).toHaveLength(3);
    });

    it('should filter by search query matching name', () => {
      const result = filterCampgrounds(mockCampgrounds, { searchQuery: 'Test Campground 1' });
      expect(result).toHaveLength(1);
      expect(result[0].campground.name).toBe('Test Campground 1');
    });

    it('should filter out entries with null campground data', () => {
      const campgroundsWithNull = [
        ...mockCampgrounds,
        {
          city: 'Test',
          state: 'TX',
          hookup_type: 'full' as const,
          campground: null as any,
          trails: [],
          blog_post: null,
          contributor: null,
          latitude: 0,
          longitude: 0,
        },
      ];
      const result = filterCampgrounds(campgroundsWithNull, {});
      expect(result).toHaveLength(3);
      expect(result.every(c => c.campground !== null)).toBe(true);
    });

    it('should filter by search query matching city', () => {
      const result = filterCampgrounds(mockCampgrounds, { searchQuery: 'Tucson' });
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Tucson');
    });

    it('should filter by search query matching state', () => {
      const result = filterCampgrounds(mockCampgrounds, { searchQuery: 'CO' });
      expect(result).toHaveLength(1);
      expect(result[0].state).toBe('CO');
    });

    it('should filter by multiple criteria', () => {
      const result = filterCampgrounds(mockCampgrounds, {
        state: 'AZ',
        hookupType: 'full',
      });
      expect(result).toHaveLength(1);
      expect(result[0].state).toBe('AZ');
      expect(result[0].hookup_type).toBe('full');
    });

    it('should be case insensitive for search query', () => {
      const result = filterCampgrounds(mockCampgrounds, { searchQuery: 'tucson' });
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Tucson');
    });
  });

  describe('getUniqueStates', () => {
    it('should return unique states sorted alphabetically', () => {
      const result = getUniqueStates(mockCampgrounds);
      expect(result).toEqual(['AZ', 'CO']);
    });

    it('should return empty array for empty input', () => {
      const result = getUniqueStates([]);
      expect(result).toEqual([]);
    });
  });

  describe('generateCampgroundId', () => {
    it('should generate a valid ID from campground entry', () => {
      const id = generateCampgroundId(mockCampgrounds[0], 0);
      expect(id).toBe('tucson-az-0');
    });

    it('should handle city names with spaces', () => {
      const entry = { ...mockCampgrounds[0], city: 'New York' };
      const id = generateCampgroundId(entry, 0);
      expect(id).toBe('new-york-az-0');
    });
  });

  describe('findCampgroundById', () => {
    it('should find campground by valid index', () => {
      const result = findCampgroundById(mockCampgrounds, '0');
      expect(result).toEqual(mockCampgrounds[0]);
    });

    it('should return undefined for invalid index', () => {
      const result = findCampgroundById(mockCampgrounds, '999');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-numeric ID', () => {
      const result = findCampgroundById(mockCampgrounds, 'invalid');
      expect(result).toBeUndefined();
    });
  });
});

