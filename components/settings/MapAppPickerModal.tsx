import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { MapApp, getAvailableMapApps, getMapAppName } from '../../utils/mapAppPreferences';

interface MapAppPickerModalProps {
  visible: boolean;
  currentApp: MapApp | null;
  onSelect: (app: MapApp) => void;
  onClose: () => void;
}

export default function MapAppPickerModal({
  visible,
  currentApp,
  onSelect,
  onClose,
}: MapAppPickerModalProps) {
  const availableApps = getAvailableMapApps();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>Choose Map App</Text>
              <Text style={styles.subtitle}>
                Select your preferred map app for directions and searches
              </Text>

              {availableApps.map((app) => (
                <TouchableOpacity
                  key={app.value}
                  style={[
                    styles.option,
                    currentApp === app.value && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onSelect(app.value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      currentApp === app.value && styles.selectedOptionText,
                    ]}
                  >
                    {app.label}
                  </Text>
                  {currentApp === app.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

