import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setDontShowInstructionsPreference } from '../../utils/mapAppPreferences';

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
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="map-outline" size={48} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>Opening {mapAppName}</Text>
          
          <Text style={styles.instructionText}>
            {instructions}
          </Text>

          {isIOS && (
            <View style={styles.hintContainer}>
              <Ionicons name="arrow-up" size={20} color="#666" />
              <Text style={styles.hintText}>Swipe up from bottom</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setDontShowAgain(!dontShowAgain)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
              {dontShowAgain && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>Don't show this message again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
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
    borderColor: '#666',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});

