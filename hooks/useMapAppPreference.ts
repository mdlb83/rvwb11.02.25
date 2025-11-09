import { useState, useEffect } from 'react';
import { getMapAppPreference, setMapAppPreference, MapApp } from '../utils/mapAppPreferences';

export function useMapAppPreference() {
  const [preference, setPreference] = useState<MapApp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      const value = await getMapAppPreference();
      setPreference(value);
    } catch (error) {
      console.error('Error loading map app preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async (app: MapApp) => {
    try {
      await setMapAppPreference(app);
      setPreference(app);
    } catch (error) {
      console.error('Error saving map app preference:', error);
    }
  };

  return {
    preference,
    loading,
    savePreference,
    reload: loadPreference,
  };
}

