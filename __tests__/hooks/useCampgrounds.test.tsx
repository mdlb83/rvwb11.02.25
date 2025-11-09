import { renderHook, waitFor } from '@testing-library/react-native';
import { useCampgrounds } from '../../hooks/useCampgrounds';
import * as dataLoader from '../../utils/dataLoader';

// Mock the data loader
jest.mock('../../utils/dataLoader', () => ({
  loadCampgrounds: jest.fn(),
  filterCampgrounds: jest.fn((entries, filters) => entries),
  getUniqueStates: jest.fn((entries) => ['AZ', 'CO']),
}));

const mockCampgrounds = [
  {
    city: 'Tucson',
    state: 'AZ',
    hookup_type: 'full' as const,
    campground: {
      name: 'Test Campground',
      type: 'RV Park',
      info: 'Test info',
      notes: '',
    },
    trails: [],
    blog_post: null,
    contributor: null,
    latitude: 32.2226,
    longitude: -110.9747,
  },
];

describe('useCampgrounds hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dataLoader.loadCampgrounds as jest.Mock).mockResolvedValue(mockCampgrounds);
  });

  it('should load campgrounds on mount', async () => {
    const { result } = renderHook(() => useCampgrounds());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.campgrounds).toEqual(mockCampgrounds);
    expect(result.current.allCampgrounds).toEqual(mockCampgrounds);
  });

  it('should return unique states', async () => {
    const { result } = renderHook(() => useCampgrounds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.states).toEqual(['AZ', 'CO']);
  });

  it('should apply filters when provided', async () => {
    const filters = { state: 'AZ', hookupType: 'full' as const };
    const { result } = renderHook(() => useCampgrounds(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(dataLoader.filterCampgrounds).toHaveBeenCalledWith(mockCampgrounds, filters);
  });

  it('should handle loading state', () => {
    (dataLoader.loadCampgrounds as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useCampgrounds());

    expect(result.current.loading).toBe(true);
    expect(result.current.campgrounds).toEqual([]);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to load');
    (dataLoader.loadCampgrounds as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCampgrounds());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.campgrounds).toEqual([]);
  });
});

