export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceSecondary: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Primary colors (green theme)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Status colors
  error: string;
  success: string;
  warning: string;
  
  // Overlay and modal
  overlay: string;
  modalBackground: string;
  
  // Interactive elements
  buttonBackground: string;
  buttonText: string;
  buttonActive: string;
  
  // Special colors
  shadow: string;
  icon: string;
  iconSecondary: string;
  
  // Filter/search bar
  filterBarBackground: string;
  filterBarBorder: string;
  
  // Bottom sheet
  bottomSheetBackground: string;
  bottomSheetHandle: string;
  
  // Map controls
  mapControlBackground: string;
  mapControlIcon: string;
}

export const lightTheme: ThemeColors = {
  background: '#fff',
  surface: '#fff',
  surfaceSecondary: '#f5f5f5',
  
  text: '#333',
  textSecondary: '#666',
  textTertiary: '#999',
  
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  primaryLight: '#81C784',
  
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  
  error: '#f44336',
  success: '#4CAF50',
  warning: '#ff9800',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#fff',
  
  buttonBackground: '#4CAF50',
  buttonText: '#fff',
  buttonActive: '#388E3C',
  
  shadow: '#000',
  icon: '#333',
  iconSecondary: '#666',
  
  filterBarBackground: 'rgba(240, 255, 242, 0.7)',
  filterBarBorder: 'rgba(76, 175, 80, 0.2)',
  
  bottomSheetBackground: '#fff',
  bottomSheetHandle: '#ccc',
  
  mapControlBackground: '#fff',
  mapControlIcon: '#333',
};

export const darkTheme: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: '#2a2a2a',
  
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#808080',
  
  primary: '#66BB6A',
  primaryDark: '#4CAF50',
  primaryLight: '#81C784',
  
  border: '#333333',
  borderLight: '#2a2a2a',
  
  error: '#ef5350',
  success: '#66BB6A',
  warning: '#ffa726',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: '#1e1e1e',
  
  buttonBackground: '#66BB6A',
  buttonText: '#ffffff',
  buttonActive: '#4CAF50',
  
  shadow: '#000',
  icon: '#ffffff',
  iconSecondary: '#b0b0b0',
  
  filterBarBackground: 'rgba(30, 30, 30, 0.95)',
  filterBarBorder: 'rgba(102, 187, 106, 0.3)',
  
  bottomSheetBackground: '#1e1e1e',
  bottomSheetHandle: '#666',
  
  mapControlBackground: '#1e1e1e',
  mapControlIcon: '#ffffff',
};

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

