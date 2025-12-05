import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PurchasesUI from 'react-native-purchases-ui';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export default function PaywallModal({ visible, onClose, onPurchaseComplete }: PaywallModalProps) {
  const { theme } = useTheme();
  const { 
    isLoading,
    checkSubscription,
    getOfferings
  } = useSubscription();
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedRef = useRef(false);
  const isPresentingRef = useRef(false);

  const attemptPresentPaywall = async () => {
    // Prevent multiple simultaneous attempts
    if (isPresentingRef.current) {
      console.log('Paywall presentation already in progress, skipping...');
      return;
    }
    // Wait for offerings to load if still loading
    if (isLoading) {
      console.log('Waiting for offerings to load...');
      return;
    }

    // Check if PurchasesUI is available first
    if (!PurchasesUI || typeof PurchasesUI.presentPaywall !== 'function') {
      setError('Subscription features require a development build. RevenueCat SDK is not available.');
      console.error('PurchasesUI.presentPaywall not available');
      return;
    }

    try {
      isPresentingRef.current = true;
      setIsPresentingPaywall(true);
      setError(null);
      
      // Refresh offerings to ensure we have the latest
      console.log('Fetching offerings from RevenueCat...');
      const offering = await getOfferings();
      
      if (!offering) {
        setError('No subscription packages available. Please check your RevenueCat configuration:\n\n1. Verify offerings are configured in RevenueCat dashboard\n2. Ensure at least one offering is set as "current"\n3. Check that products are linked to the offering\n4. Verify API key is correct');
        console.error('No offering available after fetch');
        setIsPresentingPaywall(false);
        return;
      }

      console.log('Presenting RevenueCat paywall with offering:', offering.identifier);
      
      // Present RevenueCat's built-in paywall
      const result = await PurchasesUI.presentPaywall({
        offering: offering,
      });

      console.log('Paywall result:', result);

      if (result === 'PURCHASED' || result === 'RESTORED') {
        await checkSubscription();
        Alert.alert('Success!', 'Your subscription is now active.');
        onPurchaseComplete?.();
        onClose();
      } else if (result === 'CANCELLED') {
        // User cancelled, just close the modal
        onClose();
      }
    } catch (error: any) {
      console.error('Error presenting paywall:', error);
      if (error.userCancelled) {
        // User cancelled, just close
        onClose();
      } else {
        const errorMessage = error?.message || 'Unknown error';
        setError(`Failed to load subscription options: ${errorMessage}\n\nPlease check:\n1. RevenueCat dashboard configuration\n2. Network connection\n3. API key validity`);
      }
    } finally {
      isPresentingRef.current = false;
      setIsPresentingPaywall(false);
    }
  };

  // Automatically present RevenueCat paywall when modal opens
  useEffect(() => {
    if (!visible) {
      // Reset when modal closes
      setError(null);
      setIsPresentingPaywall(false);
      hasAttemptedRef.current = false;
      isPresentingRef.current = false;
      return;
    }

    // Only attempt once when modal becomes visible
    if (!hasAttemptedRef.current && !isLoading) {
      hasAttemptedRef.current = true;
      attemptPresentPaywall();
    } else if (isLoading) {
      // Reset attempt flag if still loading, so we can try again when loading completes
      hasAttemptedRef.current = false;
    }
  }, [visible, isLoading]); // Only depend on visible and isLoading


  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill}>
        <View style={[styles.container, { backgroundColor: theme.modalBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.content}>
            {isPresentingPaywall || isLoading ? (
              <>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.description, { color: theme.textSecondary, marginTop: 24 }]}>
                  Loading subscription options...
                </Text>
              </>
            ) : error ? (
              <>
                <Ionicons name="alert-circle" size={64} color={theme.error || theme.primary} />
                <Text style={[styles.title, { color: theme.text }]}>
                  Unable to Load Subscriptions
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary, marginTop: 16 }]}>
                  {error}
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 24 }]}
                    onPress={attemptPresentPaywall}
                    disabled={isPresentingPaywall}
                  >
                    <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>
                      {isPresentingPaywall ? 'Retrying...' : 'Retry'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.surfaceSecondary, marginTop: 12 }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.retryButtonText, { color: theme.text }]}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Ionicons name="star" size={64} color={theme.primary} />
                <Text style={[styles.title, { color: theme.text }]}>
                  Unlock Premium Features
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Preparing subscription options...
                </Text>
              </>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});

