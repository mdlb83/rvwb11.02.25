import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { ENTITLEMENT_ID } from '../../constants/revenuecat';

interface SubscriptionBlurProps {
  onPress: () => void;
  remainingViews?: number | null;
}

export default function SubscriptionBlur({ onPress, remainingViews }: SubscriptionBlurProps) {
  const { isPremium } = useSubscription();
  const { theme, resolvedThemeMode } = useTheme();

  if (isPremium) {
    return null; // Don't show blur if subscribed
  }

  // Match blur tint to theme mode
  const blurTint = resolvedThemeMode === 'dark' ? 'dark' : 'light';

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={onPress}
    >
      <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <Ionicons name="lock-closed" size={48} color={theme.text} />
          <Text style={[styles.text, { color: theme.text }]}>
            Subscribe to view full details
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={onPress}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              Unlock Premium
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

