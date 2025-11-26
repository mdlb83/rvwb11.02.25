import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapApp, getAvailableMapApps } from '../../utils/mapAppPreferences';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import CustomerCenterModal from '../subscription/CustomerCenterModal';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onShowPaywall?: () => void;
}

export default function SettingsModal({ visible, onClose, onShowPaywall }: SettingsModalProps) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { preference, loading, savePreference } = useMapAppPreference();
  const { isPremium } = useSubscription();
  const availableApps = getAvailableMapApps();
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);

  const handleAppSelect = async (app: MapApp) => {
    await savePreference(app);
  };

  const themeOptions = [
    { value: 'system' as const, label: 'System', icon: 'phone-portrait-outline' },
    { value: 'light' as const, label: 'Light', icon: 'sunny' },
    { value: 'dark' as const, label: 'Dark', icon: 'moon' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor: theme.modalBackground }]}>
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.icon} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
                  <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                    Choose your preferred theme
                  </Text>
                  
                  {themeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.option,
                        { backgroundColor: theme.surfaceSecondary },
                        themeMode === option.value && {
                          backgroundColor: theme.surfaceSecondary,
                          borderWidth: 2,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => setThemeMode(option.value)}
                    >
                      <View style={styles.optionContent}>
                        <Ionicons 
                          name={option.icon as any} 
                          size={20} 
                          color={themeMode === option.value ? theme.primary : theme.iconSecondary} 
                        />
                        <Text style={[
                          styles.optionText,
                          { color: theme.text },
                          themeMode === option.value && {
                            color: theme.primary,
                            fontWeight: '600',
                          },
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                      {themeMode === option.value && (
                        <Ionicons name="checkmark" size={20} color={theme.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Map App Preference</Text>
                  <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                    Choose your preferred map app for directions and searches
                  </Text>

                  {loading ? (
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
                  ) : (
                    availableApps.map((app) => (
                      <TouchableOpacity
                        key={app.value}
                        style={[
                          styles.option,
                          { backgroundColor: theme.surfaceSecondary },
                          (preference || 'default') === app.value && {
                            backgroundColor: theme.surfaceSecondary,
                            borderWidth: 2,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => handleAppSelect(app.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            { color: theme.text },
                            (preference || 'default') === app.value && {
                              color: theme.primary,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {app.label}
                        </Text>
                        {(preference || 'default') === app.value && (
                          <Ionicons name="checkmark" size={20} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Subscription</Text>
                  <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                    {isPremium ? 'You have an active premium subscription' : 'Upgrade to premium for full access'}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { backgroundColor: theme.surfaceSecondary },
                    ]}
                    onPress={() => {
                      console.log('Subscription button pressed, isPremium:', isPremium);
                      if (isPremium) {
                        console.log('Opening Customer Center');
                        setShowCustomerCenter(true);
                      } else {
                        console.log('Opening Paywall Modal');
                        // Close settings modal first, then show paywall
                        onClose();
                        // Small delay to ensure settings modal closes first
                        setTimeout(() => {
                          onShowPaywall?.();
                        }, 300);
                      }
                    }}
                  >
                    <View style={styles.optionContent}>
                      <Ionicons 
                        name={isPremium ? "checkmark-circle" : "lock-closed"} 
                        size={20} 
                        color={isPremium ? theme.primary : theme.iconSecondary} 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                        {isPremium ? 'Manage Subscription' : 'View Subscription Options'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.iconSecondary} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <CustomerCenterModal
        visible={showCustomerCenter}
        onClose={() => setShowCustomerCenter(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
  },
});

