import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface LocationButtonProps {
  onPress: () => void;
}

export default function LocationButton({ onPress }: LocationButtonProps) {
  const { theme } = useTheme();
  
  return (
    <TouchableOpacity
      testID="location-button"
      style={[
        styles.button,
        {
          backgroundColor: theme.mapControlBackground,
          ...Platform.select({
            ios: {
              shadowColor: theme.shadow,
            },
            android: {},
          }),
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="navigate" size={22} color={theme.mapControlIcon} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

