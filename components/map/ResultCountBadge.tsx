import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ResultCountBadgeProps {
  count: number;
  total: number;
  gpsButtonBottom: number;
}

export default function ResultCountBadge({ count, total, gpsButtonBottom }: ResultCountBadgeProps) {
  const { theme } = useTheme();
  
  if (count === total) {
    return null; // Don't show badge when all results are visible
  }

  // Position badge 12px above the filters container
  // filtersContainer bottom is at gpsButtonBottom (which represents the container bottom)
  // filtersContainer approximate height: ~60px (padding + button height)
  // To position badge 12px above filters container top: badgeBottom = gpsButtonBottom + containerHeight + 12
  const filtersContainerHeight = 60; // Approximate height of filters container
  const badgeBottom = gpsButtonBottom + filtersContainerHeight + 12;

  return (
    <View 
      style={[
        styles.wrapper,
        { 
          bottom: badgeBottom,
        }
      ]} 
      pointerEvents="none"
    >
      <View style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
        }
      ]}>
        <Text style={[styles.text, { color: theme.text }]}>
          {count} {count === 1 ? 'campground' : 'campgrounds'}
          {count < total && ` of ${total}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

