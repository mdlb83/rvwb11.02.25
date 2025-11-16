import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ResultCountBadgeProps {
  count: number;
  total: number;
}

export default function ResultCountBadge({ count, total }: ResultCountBadgeProps) {
  const insets = useSafeAreaInsets();
  
  if (count === total) {
    return null; // Don't show badge when all results are visible
  }

  return (
    <View style={[styles.container, { top: insets.top + 16 }]} pointerEvents="none">
      <Text style={styles.text}>
        {count} {count === 1 ? 'campground' : 'campgrounds'}
        {count < total && ` of ${total}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 80, // Leave space for settings icon (48px + 16px margin + 16px padding)
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

