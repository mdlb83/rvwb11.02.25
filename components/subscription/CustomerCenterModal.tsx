import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import PurchasesUI from 'react-native-purchases-ui';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';

interface CustomerCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomerCenterModal({ visible, onClose }: CustomerCenterModalProps) {
  const { theme } = useTheme();
  const { customerInfo, checkSubscription } = useSubscription();

  const handleOpenCustomerCenter = async () => {
    try {
      // Check if PurchasesUI is available
      if (!PurchasesUI || typeof PurchasesUI.presentCustomerCenter !== 'function') {
        Alert.alert('Error', 'Subscription features require a development build. Please build the app to manage subscriptions.');
        return;
      }

      // Present RevenueCat's Customer Center
      await PurchasesUI.presentCustomerCenter();
      
      // Refresh subscription status after user returns
      await checkSubscription();
    } catch (error) {
      console.error('Error opening customer center:', error);
      Alert.alert('Error', 'Unable to open customer center. Please try again.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill}>
        <View style={[styles.container, { backgroundColor: theme.modalBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Subscription</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {customerInfo?.entitlements.active.premium ? (
              <View style={styles.subscriptionInfo}>
                <Ionicons name="checkmark-circle" size={48} color={theme.primary} />
                <Text style={[styles.statusText, { color: theme.text }]}>
                  Premium Active
                </Text>
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                  Expires: {formatDate(customerInfo.entitlements.active.premium.expirationDate)}
                </Text>
              </View>
            ) : (
              <View style={styles.subscriptionInfo}>
                <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
                <Text style={[styles.statusText, { color: theme.text }]}>
                  No Active Subscription
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.customerCenterButton, { backgroundColor: theme.primary }]}
              onPress={handleOpenCustomerCenter}
            >
              <Ionicons name="settings" size={20} color={theme.buttonText} />
              <Text style={[styles.customerCenterButtonText, { color: theme.buttonText }]}>
                Manage Subscription
              </Text>
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              Manage your subscription, restore purchases, or contact support
            </Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  subscriptionInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  detailText: {
    fontSize: 14,
    marginTop: 8,
  },
  customerCenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 250,
    justifyContent: 'center',
  },
  customerCenterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});

