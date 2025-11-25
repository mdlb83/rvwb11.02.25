import { useState, useEffect, useCallback } from 'react';
import { getMapAppPreference, setMapAppPreference, MapApp } from '../utils/mapAppPreferences';

export function useMapAppPreference() {
  const [preference, setPreference] = useState<MapApp | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreference = useCallback(async () => {
    try {
      const value = await getMapAppPreference();
      setPreference(value);
    } catch (error) {
      console.error('Error loading map app preference:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  const savePreference = useCallback(async (app: MapApp) => {
    try {
      await setMapAppPreference(app);
      setPreference(app);
    } catch (error) {
      console.error('Error saving map app preference:', error);
    }
  }, []);

  return {
    preference,
    loading,
    savePreference,
    reload: loadPreference,
  };
}

