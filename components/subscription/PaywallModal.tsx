import React, { useState } from 'react';
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
    purchasePackage, 
    restorePurchases, 
    isLoading,
    checkSubscription 
  } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Show RevenueCat Paywall UI
  const handleShowRevenueCatPaywall = async () => {
    try {
      if (!currentOffering) {
        Alert.alert('Error', 'No subscription packages available. Please try again later.');
        return;
      }

      // Check if PurchasesUI is available
      if (!PurchasesUI || typeof PurchasesUI.presentPaywall !== 'function') {
        Alert.alert('Error', 'Subscription features require a development build. Please build the app to test subscriptions.');
        return;
      }

      // Present RevenueCat's built-in paywall
      const result = await PurchasesUI.presentPaywall({
        offering: currentOffering,
        mode: 'normal', // or 'condensed'
      });

      if (result === 'PURCHASED' || result === 'RESTORED') {
        await checkSubscription();
        Alert.alert('Success!', 'Your subscription is now active.');
        onPurchaseComplete?.();
        onClose();
      }
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, do nothing
      } else {
        console.error('Error showing paywall:', error);
        Alert.alert('Error', 'Failed to load subscription options. Please try again.');
      }
    }
  };

  // Manual purchase (if you want custom UI)
  const handlePurchase = async (pkg: any) => {
    try {
      setIsPurchasing(true);
      await purchasePackage(pkg);
      Alert.alert('Success!', 'Your subscription is now active.');
      onPurchaseComplete?.();
      onClose();
    } catch (error: any) {
      if (error.message === 'Purchase cancelled') {
        // User cancelled, do nothing
      } else if (error.message === 'Payment pending') {
        Alert.alert('Payment Pending', 'Your payment is being processed. Your subscription will activate once payment is complete.');
      } else {
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsPurchasing(true);
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully.');
      onPurchaseComplete?.();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'No purchases found to restore.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Format price for display
  const formatPrice = (pkg: any) => {
    if (!pkg?.product?.priceString) return '';
    return pkg.product.priceString;
  };

  // Get package by identifier
  const getPackageById = (identifier: string) => {
    return currentOffering?.availablePackages.find(pkg => pkg.identifier === identifier);
  };

  const yearlyPackage = getPackageById('yearly');
  const lifetimePackage = getPackageById('lifetime');

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
            <Ionicons name="star" size={64} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Unlock Premium Features
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Get unlimited access to all campground details, photos, and premium features.
            </Text>

            {/* RevenueCat Paywall Button (Recommended) */}
            <TouchableOpacity
              style={[styles.revenueCatButton, { backgroundColor: theme.primary }]}
              onPress={handleShowRevenueCatPaywall}
              disabled={isLoading || !currentOffering}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <Text style={[styles.revenueCatButtonText, { color: theme.buttonText }]}>
                  View Subscription Options
                </Text>
              )}
            </TouchableOpacity>

            {/* Manual Package Selection (Alternative) */}
            {currentOffering && (
              <View style={styles.packagesContainer}>
                {yearlyPackage && (
                  <TouchableOpacity
                    style={[
                      styles.packageButton,
                      { 
                        backgroundColor: theme.surfaceSecondary,
                        borderColor: theme.border,
                      }
                    ]}
                    onPress={() => handlePurchase(yearlyPackage)}
                    disabled={isPurchasing}
                  >
                    <View style={styles.packageContent}>
                      <Text style={[styles.packageTitle, { color: theme.text }]}>
                        Yearly
                      </Text>
                      <Text style={[styles.packagePrice, { color: theme.primary }]}>
                        {formatPrice(yearlyPackage)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {lifetimePackage && (
                  <TouchableOpacity
                    style={[
                      styles.packageButton,
                      { 
                        backgroundColor: theme.surfaceSecondary,
                        borderColor: theme.border,
                      }
                    ]}
                    onPress={() => handlePurchase(lifetimePackage)}
                    disabled={isPurchasing}
                  >
                    <View style={styles.packageContent}>
                      <Text style={[styles.packageTitle, { color: theme.text }]}>
                        Lifetime
                      </Text>
                      <Text style={[styles.packagePrice, { color: theme.primary }]}>
                        {formatPrice(lifetimePackage)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity 
              onPress={handleRestore} 
              disabled={isPurchasing}
              style={styles.restoreButton}
            >
              <Text style={[styles.restoreText, { color: theme.textSecondary }]}>
                Restore Purchases
              </Text>
            </TouchableOpacity>
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
  revenueCatButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 250,
    alignItems: 'center',
  },
  revenueCatButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  packagesContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  packageButton: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  packageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    padding: 12,
  },
  restoreText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

