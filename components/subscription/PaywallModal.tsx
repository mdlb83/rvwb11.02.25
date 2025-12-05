import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PurchasesUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { REVENUECAT_API_KEY, PRODUCT_IDS } from '../../constants/revenuecat';

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
    checkSubscription,
    getOfferings
  } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Debug logging and refresh offerings when modal opens
  React.useEffect(() => {
    if (visible) {
      console.log('=== PaywallModal Opened ===');
      console.log('currentOffering:', currentOffering ? {
        identifier: currentOffering.identifier,
        packages: currentOffering.availablePackages.map(p => ({
          identifier: p.identifier,
          productId: p.product.identifier,
          price: p.product.priceString
        }))
      } : 'null');
      console.log('isLoading:', isLoading);
      
      // Always try to refresh offerings when modal opens to ensure we have the latest
      console.log('Refreshing offerings...');
      getOfferings()
        .then((offering) => {
          if (offering) {
            console.log('✅ Offerings refreshed successfully:', {
              identifier: offering.identifier,
              packages: offering.availablePackages.map(p => ({
                identifier: p.identifier,
                productId: p.product.identifier,
                price: p.product.priceString
              }))
            });
          } else {
            console.warn('⚠️ No offering returned from refresh');
          }
        })
        .catch((error) => {
          console.error('❌ Error refreshing offerings:', error);
          if (error instanceof Error) {
            console.error('Error details:', error.message);
          }
        });
    }
  }, [visible, getOfferings]);

  // Show RevenueCat Paywall UI
  // Note: This doesn't work in Preview API mode (test keys), so we'll use manual buttons instead
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

      // Check if we're using a test key (Preview API mode)
      // Test keys start with 'test_', production keys start with 'appl_' or 'goog_'
      const isTestMode = REVENUECAT_API_KEY.startsWith('test_');
      
      if (isTestMode) {
        // In Preview/Test mode, RevenueCat UI paywall doesn't work
        // Show manual purchase buttons instead (they're already visible below)
        console.log('Preview API mode detected - using manual purchase buttons instead of RevenueCat UI');
        return;
      }

      // Present RevenueCat's built-in paywall (only works with production keys)
      const result = await PurchasesUI.presentPaywall({
        offering: currentOffering,
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
      const customerInfo = await purchasePackage(pkg);
      console.log('Purchase completed in PaywallModal, customerInfo:', {
        entitlements: Object.keys(customerInfo.entitlements.active),
        hasPremium: !!customerInfo.entitlements.active.premium
      });
      
      // Explicitly check subscription status after purchase to ensure UI updates
      await checkSubscription();
      
      // Double-check by fetching fresh customer info
      const freshInfo = await Purchases.getCustomerInfo();
      console.log('Fresh customerInfo after purchase:', {
        entitlements: Object.keys(freshInfo.entitlements.active),
        hasPremium: !!freshInfo.entitlements.active.premium
      });
      
      Alert.alert('Success!', 'Your subscription is now active.');
      onPurchaseComplete?.();
      // Small delay to ensure state updates propagate before closing
      setTimeout(() => {
        onClose();
      }, 300);
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
      // Explicitly check subscription status after restore to ensure UI updates
      await checkSubscription();
      Alert.alert('Success', 'Purchases restored successfully.');
      onPurchaseComplete?.();
      // Small delay to ensure state updates propagate before closing
      setTimeout(() => {
        onClose();
      }, 100);
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

  // Get package by identifier (case-insensitive)
  const getPackageById = (identifier: string) => {
    if (!currentOffering) return undefined;
    // Try exact match first
    let pkg = currentOffering.availablePackages.find(pkg => pkg.identifier === identifier);
    if (pkg) return pkg;
    // Try case-insensitive match
    pkg = currentOffering.availablePackages.find(pkg => 
      pkg.identifier.toLowerCase() === identifier.toLowerCase()
    );
    return pkg;
  };

  // Get package by product ID (fallback if identifier doesn't match)
  const getPackageByProductId = (productId: string) => {
    return currentOffering?.availablePackages.find(pkg => pkg.product.identifier === productId);
  };

  // Try to find packages - first by identifier (case-insensitive), then by product ID
  // getPackageById handles case-insensitive matching internally, so 'yearly' will match 'yearly', 'Yearly', 'YEARLY', etc.
  const yearlyPackage = getPackageById('yearly') || getPackageByProductId(PRODUCT_IDS.YEARLY);
  const lifetimePackage = getPackageById('lifetime') || getPackageByProductId(PRODUCT_IDS.LIFETIME);

  // Log all available packages for debugging
  React.useEffect(() => {
    if (visible && currentOffering) {
      console.log('=== Available Packages ===');
      currentOffering.availablePackages.forEach((pkg, index) => {
        console.log(`Package ${index + 1}:`, {
          identifier: pkg.identifier,
          productId: pkg.product.identifier,
          price: pkg.product.priceString,
          title: pkg.product.title
        });
      });
      console.log('Looking for packages:');
      console.log('- yearlyPackage found:', !!yearlyPackage, yearlyPackage ? {
        identifier: yearlyPackage.identifier,
        productId: yearlyPackage.product.identifier
      } : 'not found');
      console.log('- lifetimePackage found:', !!lifetimePackage, lifetimePackage ? {
        identifier: lifetimePackage.identifier,
        productId: lifetimePackage.product.identifier
      } : 'not found');
    }
  }, [visible, currentOffering, yearlyPackage, lifetimePackage]);

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
            <Ionicons name="star" size={64} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Unlock Premium Features
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Get unlimited access to all campground details, photos, and premium features.
            </Text>

            {/* RevenueCat Paywall Button (Only show in production mode) */}
            {(() => {
              const isTestMode = REVENUECAT_API_KEY.startsWith('test_');
              
              // Only show RevenueCat UI button in production mode
              // In Preview/Test mode, RevenueCat UI paywall doesn't work, so we hide this button
              if (!isTestMode && currentOffering) {
                return (
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
                );
              }
              return null;
            })()}

            {/* Manual Package Selection - Show buttons even if offering not loaded yet */}
            <View style={styles.packagesContainer}>
              {/* Show all available packages if expected ones aren't found (for debugging) */}
              {currentOffering && !yearlyPackage && !lifetimePackage && currentOffering.availablePackages.length > 0 ? (
                <>
                  {currentOffering.availablePackages.map((pkg, index) => (
                    <TouchableOpacity
                      key={pkg.identifier || index}
                      style={[
                        styles.packageButton,
                        { 
                          backgroundColor: theme.surfaceSecondary,
                          borderColor: theme.border,
                        }
                      ]}
                      onPress={() => handlePurchase(pkg)}
                      disabled={isPurchasing}
                    >
                      <View style={styles.packageContent}>
                        <Text style={[styles.packageTitle, { color: theme.text }]}>
                          {pkg.product.title || pkg.identifier || `Package ${index + 1}`}
                        </Text>
                        <Text style={[styles.packagePrice, { color: theme.primary }]}>
                          {formatPrice(pkg)}
                        </Text>
                      </View>
                      <Text style={[styles.packageDebug, { color: theme.textSecondary, fontSize: 10 }]}>
                        ID: {pkg.identifier} | Product: {pkg.product.identifier}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
              {currentOffering && yearlyPackage ? (
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
              ) : (
                <TouchableOpacity
                  style={[
                    styles.packageButton,
                    { 
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: theme.border,
                      opacity: 0.6,
                    }
                  ]}
                  disabled
                >
                  <View style={styles.packageContent}>
                    <Text style={[styles.packageTitle, { color: theme.textSecondary }]}>
                      Yearly
                    </Text>
                    <Text style={[styles.packagePrice, { color: theme.textSecondary }]}>
                      {isLoading ? 'Loading...' : '$9.99/year'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {currentOffering && lifetimePackage ? (
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
              ) : (
                <TouchableOpacity
                  style={[
                    styles.packageButton,
                    { 
                      backgroundColor: theme.surfaceSecondary,
                      borderColor: theme.border,
                      opacity: 0.6,
                    }
                  ]}
                  disabled
                >
                  <View style={styles.packageContent}>
                    <Text style={[styles.packageTitle, { color: theme.textSecondary }]}>
                      Lifetime
                    </Text>
                    <Text style={[styles.packagePrice, { color: theme.textSecondary }]}>
                      {isLoading ? 'Loading...' : 'One-time purchase'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
                </>
              )}
            </View>

            {!currentOffering && !isLoading && (
              <View style={styles.errorContainer}>
                <Text style={[styles.description, { color: theme.textSecondary, marginTop: 16, fontSize: 14 }]}>
                  Subscription options will appear once products are configured.
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary, marginTop: 8, fontSize: 12 }]}>
                  Check console logs for details. Make sure offerings are configured in RevenueCat dashboard.
                </Text>
                <Text style={[styles.description, { color: theme.textSecondary, marginTop: 8, fontSize: 12 }]}>
                  Test Mode: {REVENUECAT_API_KEY.startsWith('test_') ? 'Enabled' : 'Disabled'}
                </Text>
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
  packageDebug: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  restoreButton: {
    padding: 12,
  },
  restoreText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});

