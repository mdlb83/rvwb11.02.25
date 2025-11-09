import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import * as mapAppPreferences from '../../utils/mapAppPreferences';

// Mock the map app preferences module
jest.mock('../../utils/mapAppPreferences', () => ({
  getMapAppPreference: jest.fn(),
  setMapAppPreference: jest.fn(),
}));

describe('useMapAppPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load preference on mount', async () => {
    (mapAppPreferences.getMapAppPreference as jest.Mock).mockResolvedValue('google');

    const { result } = renderHook(() => useMapAppPreference());

    expect(result.current.loading).toBe(true);
    expect(result.current.preference).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preference).toBe('google');
    expect(mapAppPreferences.getMapAppPreference).toHaveBeenCalledTimes(1);
  });

  it('should handle null preference', async () => {
    (mapAppPreferences.getMapAppPreference as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMapAppPreference());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preference).toBeNull();
  });

  it('should handle loading errors', async () => {
    const error = new Error('Failed to load');
    (mapAppPreferences.getMapAppPreference as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useMapAppPreference());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preference).toBeNull();
  });

  it('should save preference', async () => {
    (mapAppPreferences.getMapAppPreference as jest.Mock).mockResolvedValue(null);
    (mapAppPreferences.setMapAppPreference as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMapAppPreference());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.savePreference('google');
    });

    expect(mapAppPreferences.setMapAppPreference).toHaveBeenCalledWith('google');
    expect(result.current.preference).toBe('google');
  });

  it('should handle save errors gracefully', async () => {
    (mapAppPreferences.getMapAppPreference as jest.Mock).mockResolvedValue(null);
    (mapAppPreferences.setMapAppPreference as jest.Mock).mockRejectedValue(
      new Error('Failed to save')
    );

    const { result } = renderHook(() => useMapAppPreference());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await expect(result.current.savePreference('google')).resolves.not.toThrow();
    });
  });

  it('should reload preference', async () => {
    (mapAppPreferences.getMapAppPreference as jest.Mock)
      .mockResolvedValueOnce('google')
      .mockResolvedValueOnce('apple');

    const { result } = renderHook(() => useMapAppPreference());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preference).toBe('google');

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.preference).toBe('apple');
    });

    expect(mapAppPreferences.getMapAppPreference).toHaveBeenCalledTimes(2);
  });
});

