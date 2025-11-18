import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setDontShowInstructionsPreference } from '../../utils/mapAppPreferences';
import { useTheme } from '../../contexts/ThemeContext';

interface MapReturnInstructionsModalProps {
  visible: boolean;
  mapAppName: string;
  onClose: () => void;
}

export default function MapReturnInstructionsModal({
  visible,
  mapAppName,
  onClose,
}: MapReturnInstructionsModalProps) {
  const { theme } = useTheme();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const isIOS = Platform.OS === 'ios';
  const instructions = isIOS
    ? 'Swipe up from the bottom edge of your screen to return to this app.'
    : 'Use the back button or app switcher to return to this app.';

  // Reset checkbox when modal becomes visible
  useEffect(() => {
    if (visible) {
      setDontShowAgain(false);
    }
  }, [visible]);

  const handleClose = async () => {
    if (dontShowAgain) {
      await setDontShowInstructionsPreference(true);
    }
    setDontShowAgain(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.modalBackground }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="map-outline" size={48} color={theme.primary} />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>Opening {mapAppName}</Text>
          
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {instructions}
          </Text>

          {isIOS && (
            <View style={[styles.hintContainer, { backgroundColor: theme.surfaceSecondary }]}>
              <Ionicons name="arrow-up" size={20} color={theme.iconSecondary} />
              <Text style={[styles.hintText, { color: theme.textSecondary }]}>Swipe up from bottom</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setDontShowAgain(!dontShowAgain)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              {
                borderColor: theme.border,
                backgroundColor: dontShowAgain ? theme.primary : theme.surface,
              },
              dontShowAgain && { borderColor: theme.primary }
            ]}>
              {dontShowAgain && (
                <Ionicons name="checkmark" size={16} color={theme.buttonText} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.textSecondary }]}>Don't show this message again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]} 
            onPress={handleClose}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  hintText: {
    fontSize: 14,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
});

