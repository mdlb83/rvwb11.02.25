import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { ENTITLEMENT_ID } from '../../constants/revenuecat';

interface SubscriptionBlurProps {
  onPress: () => void;
  remainingViews?: number | null;
  forceShow?: boolean; // For testing: force show blur even if premium
}

export default function SubscriptionBlur({ onPress, remainingViews, forceShow = false }: SubscriptionBlurProps) {
  const { isPremium } = useSubscription();
  const { theme, resolvedThemeMode } = useTheme();

  // Don't show blur if subscribed (unless forced for testing)
  if (isPremium && !forceShow) {
    return null;
  }

  // Match blur tint to theme mode
  const blurTint = resolvedThemeMode === 'dark' ? 'dark' : 'light';

  const OverlayContent = (
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
  );

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={onPress}
    >
      {Platform.OS === 'ios' ? (
        // iOS: Use BlurView for native blur effect (unchanged)
        <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFill}>
          {OverlayContent}
        </BlurView>
      ) : (
        // Android: Use BlurView with experimental method and higher intensity
        // experimentalBlurMethod is required to enable blur on Android
        // blurReductionFactor defaults to 4, so intensity needs to be higher (or set to 1)
        <BlurView 
          intensity={5} 
          blurReductionFactor={1}
          experimentalBlurMethod="dimezisBlurView"
          tint={blurTint} 
          style={StyleSheet.absoluteFill}
        >
          {OverlayContent}
        </BlurView>
      )}
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

