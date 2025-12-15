import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapApp, getAvailableMapApps } from '../../utils/mapAppPreferences';
import { useMapAppPreference } from '../../hooks/useMapAppPreference';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../hooks/useSubscription';
import Confetti from '../common/Confetti';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { preference, loading, savePreference } = useMapAppPreference();
  const { isPremium } = useSubscription();
  const availableApps = getAvailableMapApps();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleAppSelect = async (app: MapApp) => {
    await savePreference(app);
  };

  const handleOpenPrivacyPolicy = async () => {
    const url = 'https://mdlb83.github.io/rving-with-bikes-privacy/index.html';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Don't know how to open URI: " + url);
    }
  };

  const handleOpenTermsOfUse = async () => {
    const url = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Don't know how to open URI: " + url);
    }
  };

  const handlePremiumStatusPress = () => {
    if (isPremium) {
      setShowConfetti(true);
    }
  };

  const handleSuggestFeature = async () => {
    const subject = encodeURIComponent('Feature Suggestion');
    const body = encodeURIComponent(
      `I'd like to suggest the following feature:\n\n` +
      `Feature Description:\n` +
      `\n` +
      `Why this would be helpful:\n` +
      `\n` +
      `Additional Notes:\n\n`
    );
    const emailUrl = `mailto:dcbc3705@gmail.com?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        console.error("Don't know how to open URI: " + emailUrl);
      }
    } catch (err) {
      console.error('Failed to open email:', err);
    }
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

              <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
              >
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

                {isPremium && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Premium Status</Text>
                    <Text style={[styles.sectionDescription, { color: theme.textSecondary, marginBottom: 8 }]}>
                      Thank you for supporting the app!
                    </Text>
                    <Text style={[styles.premiumMessage, { color: theme.textSecondary, marginTop: 0 }]}>
                      Your membership enables us to add more campgrounds and features to this app throughout the year.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.premiumStatusCard,
                        { 
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        }
                      ]}
                      onPress={handlePremiumStatusPress}
                      activeOpacity={0.8}
                    >
                      <View style={styles.premiumStatusContent}>
                        <Ionicons name="star" size={24} color="#FFD700" />
                        <View style={styles.premiumStatusTextContainer}>
                          <Text style={[styles.premiumStatusTitle, { color: theme.buttonText }]}>
                            Premium Member
                          </Text>
                          <Text style={[styles.premiumStatusSubtitle, { color: theme.buttonText }]}>
                            Tap to celebrate! 🎉
                          </Text>
                        </View>
                        <Ionicons name="trophy" size={20} color="#FFD700" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.suggestFeatureButton,
                        { 
                          backgroundColor: theme.surfaceSecondary,
                          borderColor: theme.border,
                        }
                      ]}
                      onPress={handleSuggestFeature}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="bulb-outline" size={20} color={theme.primary} />
                      <Text style={[styles.suggestFeatureButtonText, { color: theme.text }]}>
                        Suggest a Feature
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Legal</Text>
                  <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                    View our privacy policy and terms
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { backgroundColor: theme.surfaceSecondary },
                    ]}
                    onPress={handleOpenPrivacyPolicy}
                  >
                    <View style={styles.optionContent}>
                      <Ionicons 
                        name="document-text-outline" 
                        size={20} 
                        color={theme.iconSecondary} 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                        Privacy Policy
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color={theme.iconSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.option,
                      { backgroundColor: theme.surfaceSecondary },
                    ]}
                    onPress={handleOpenTermsOfUse}
                  >
                    <View style={styles.optionContent}>
                      <Ionicons 
                        name="document-text-outline" 
                        size={20} 
                        color={theme.iconSecondary} 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                        Terms of Use
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color={theme.iconSecondary} />
                  </TouchableOpacity>
                </View>
                {/* Spacer View to ensure empty areas are scrollable */}
                <View style={{ flex: 1, minHeight: 200 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <Confetti 
        visible={showConfetti} 
        onComplete={() => setShowConfetti(false)}
        color="#FFD700"
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
    paddingBottom: 40,
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
  premiumStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumStatusTextContainer: {
    flex: 1,
  },
  premiumStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumStatusSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  premiumMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    fontStyle: 'italic',
  },
  suggestFeatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  suggestFeatureButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

