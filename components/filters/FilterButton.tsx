import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterButtonProps {
  selectedHookupType: 'full' | 'partial' | 'all';
  onHookupTypeChange: (type: 'full' | 'partial' | 'all') => void;
}

export default function FilterButton({
  selectedHookupType,
  onHookupTypeChange,
}: FilterButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const getFilterLabel = () => {
    switch (selectedHookupType) {
      case 'full':
        return 'Full';
      case 'partial':
        return 'Partial';
      default:
        return 'All';
    }
  };

  const handleSelect = (type: 'full' | 'partial' | 'all') => {
    onHookupTypeChange(type);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedHookupType !== 'all' && styles.filterButtonActive,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name="filter"
          size={20}
          color={selectedHookupType !== 'all' ? '#fff' : '#666'}
        />
        {selectedHookupType !== 'all' && (
          <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Hookup Type</Text>
            
            <TouchableOpacity
              style={[
                styles.option,
                selectedHookupType === 'all' && styles.optionActive,
              ]}
              onPress={() => handleSelect('all')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedHookupType === 'all' && styles.optionTextActive,
                ]}
              >
                All
              </Text>
              {selectedHookupType === 'all' && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedHookupType === 'full' && styles.optionActive,
              ]}
              onPress={() => handleSelect('full')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedHookupType === 'full' && styles.optionTextActive,
                ]}
              >
                Full Hookup
              </Text>
              {selectedHookupType === 'full' && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedHookupType === 'partial' && styles.optionActive,
              ]}
              onPress={() => handleSelect('partial')}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedHookupType === 'partial' && styles.optionTextActive,
                ]}
              >
                Partial Hookup
              </Text>
              {selectedHookupType === 'partial' && (
                <Ionicons name="checkmark" size={20} color="#4CAF50" />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  optionActive: {
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});

