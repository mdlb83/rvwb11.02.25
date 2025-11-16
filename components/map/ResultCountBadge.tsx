import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ResultCountBadgeProps {
  count: number;
  total: number;
  gpsButtonBottom: number;
}

export default function ResultCountBadge({ count, total, gpsButtonBottom }: ResultCountBadgeProps) {
  if (count === total) {
    return null; // Don't show badge when all results are visible
  }

  // GPS button is 44px tall, so its center is at gpsButtonBottom + 22
  // We want the badge center to align with GPS button center
  // Badge approximate height: paddingVertical (6*2) + text (~20) = ~32px
  // So badge center is at badgeBottom + 16
  // To align centers: badgeBottom + 16 = gpsButtonBottom + 22
  // Therefore: badgeBottom = gpsButtonBottom + 22 - 16 = gpsButtonBottom + 6
  const gpsButtonCenter = gpsButtonBottom + 22; // GPS button height is 44, so center is at +22
  const badgeApproxHeight = 32; // Approximate badge height (padding + text)
  const badgeBottom = gpsButtonCenter - (badgeApproxHeight / 2);

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
      <View style={styles.container}>
        <Text style={styles.text}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

