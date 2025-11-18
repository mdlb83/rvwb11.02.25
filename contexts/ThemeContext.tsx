import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors, getTheme } from '../utils/theme';

const THEME_STORAGE_KEY = '@rving_with_bikes:theme_mode';

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  resolvedThemeMode: 'light' | 'dark'; // The actual theme being used (resolves 'system')
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorSchemeHook = useColorScheme();
  // Use Appearance API directly for more reliable detection
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark' | null>(
    () => Appearance.getColorScheme()
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and listen for system appearance changes
  useEffect(() => {
    // Get initial value - prefer hook, fallback to Appearance API
    const initialScheme = systemColorSchemeHook || Appearance.getColorScheme();
    console.log('Initializing system color scheme:', { 
      hook: systemColorSchemeHook, 
      appearance: Appearance.getColorScheme(),
      using: initialScheme 
    });
    
    if (initialScheme) {
      setSystemColorScheme(initialScheme);
    }

    // Listen for changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('System appearance changed:', colorScheme);
      setSystemColorScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, [systemColorSchemeHook]);

  // Load theme preference from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        console.log('Loaded theme from storage:', savedTheme);
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
          setThemeModeState(savedTheme as ThemeMode);
        } else {
          // Default to system if nothing saved
          setThemeModeState('system');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference to storage
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    // Cycle through: system -> light -> dark -> system
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  // Resolve 'system' mode to actual light/dark based on system setting
  const resolvedThemeMode = useMemo(() => {
    if (themeMode === 'system') {
      // Handle null case - useColorScheme can return null on some platforms
      // Default to 'light' if null, otherwise use the system setting
      const effectiveScheme = systemColorScheme || systemColorSchemeHook;
      if (effectiveScheme === null || effectiveScheme === undefined) {
        console.log('System color scheme is null/undefined, defaulting to light');
        return 'light';
      }
      const resolved = effectiveScheme === 'dark' ? 'dark' : 'light';
      console.log('Resolved theme mode:', { 
        themeMode, 
        systemColorScheme, 
        systemColorSchemeHook,
        effectiveScheme,
        resolved 
      });
      return resolved;
    }
    return themeMode;
  }, [themeMode, systemColorScheme, systemColorSchemeHook]);

  const theme = getTheme(resolvedThemeMode);

  // Don't render children until theme is loaded to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, resolvedThemeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

