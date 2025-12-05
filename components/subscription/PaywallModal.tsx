import React, { useState, useEffect } from 'react';
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
    currentOffering, 
    isLoading,
    checkSubscription,
    getOfferings
  } = useSubscription();
  const [isPresentingPaywall, setIsPresentingPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically present RevenueCat paywall when modal opens and offering is available
  useEffect(() => {
    if (!visible) {
      setError(null);
      setIsPresentingPaywall(false);
      return;
    }

    const presentPaywall = async () => {
      // Wait for offerings to load if still loading
      if (isLoading) {
        console.log('Waiting for offerings to load...');
        return;
      }

      // Refresh offerings to ensure we have the latest
      const offering = await getOfferings();
      
      if (!offering) {
        setError('No subscription packages available. Please check your RevenueCat configuration.');
        console.error('No offering available');
        return;
      }

      // Check if PurchasesUI is available
      if (!PurchasesUI || typeof PurchasesUI.presentPaywall !== 'function') {
        setError('Subscription features require a development build. RevenueCat SDK is not available.');
        console.error('PurchasesUI.presentPaywall not available');
        return;
      }

      try {
        setIsPresentingPaywall(true);
        setError(null);
        
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
          setError('Failed to load subscription options. Please try again.');
        }
      } finally {
        setIsPresentingPaywall(false);
      }
    };

    presentPaywall();
  }, [visible, isLoading, currentOffering, getOfferings, checkSubscription, onPurchaseComplete, onClose]);


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
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 24 }]}
                  onPress={onClose}
                >
                  <Text style={[styles.retryButtonText, { color: theme.buttonText }]}>
                    Close
                  </Text>
                </TouchableOpacity>
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
});

