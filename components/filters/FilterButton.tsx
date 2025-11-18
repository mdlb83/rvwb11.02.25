import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ToiletIcon from '../icons/ToiletIcon';
import { useTheme } from '../../contexts/ThemeContext';

interface FilterButtonProps {
  selectedHookupType: 'full' | 'partial' | 'all';
  onHookupTypeChange: (type: 'full' | 'partial' | 'all') => void;
  showBookmarked?: boolean;
  onBookmarkedChange?: (show: boolean) => void;
}

export default function FilterButton({
  selectedHookupType,
  onHookupTypeChange,
  showBookmarked = false,
  onBookmarkedChange,
}: FilterButtonProps) {
  const { theme } = useTheme();
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

  const hasActiveFilter = selectedHookupType !== 'all';

  const handleSelect = (type: 'full' | 'partial' | 'all') => {
    onHookupTypeChange(type);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        testID="filter-button"
        style={[
          styles.filterButton,
          {
            backgroundColor: hasActiveFilter ? theme.primary : theme.surfaceSecondary,
            borderColor: hasActiveFilter ? theme.primary : theme.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        {selectedHookupType === 'full' ? (
          <ToiletIcon
            size={20}
            color={hasActiveFilter ? theme.buttonText : theme.iconSecondary}
          />
        ) : selectedHookupType === 'partial' ? (
          <Ionicons
            name="flash-outline"
            size={20}
            color={hasActiveFilter ? theme.buttonText : theme.iconSecondary}
          />
        ) : (
          <Ionicons
            name="filter"
            size={20}
            color={hasActiveFilter ? theme.buttonText : theme.iconSecondary}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.modalBackground, shadowColor: theme.shadow }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>
            
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Hookup Type</Text>
            
            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: selectedHookupType === 'all' ? theme.surfaceSecondary : theme.surfaceSecondary,
                },
              ]}
              onPress={() => handleSelect('all')}
            >
              <View style={styles.optionContent}>
                <Ionicons name="filter" size={20} color={selectedHookupType === 'all' ? theme.primary : theme.iconSecondary} />
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedHookupType === 'all' ? theme.primary : theme.text,
                      fontWeight: selectedHookupType === 'all' ? '600' : '400',
                    },
                  ]}
                >
                  All
                </Text>
              </View>
              {selectedHookupType === 'all' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: selectedHookupType === 'full' ? theme.surfaceSecondary : theme.surfaceSecondary,
                },
              ]}
              onPress={() => handleSelect('full')}
            >
              <View style={styles.optionContent}>
                <ToiletIcon size={20} color={selectedHookupType === 'full' ? theme.primary : theme.iconSecondary} />
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedHookupType === 'full' ? theme.primary : theme.text,
                      fontWeight: selectedHookupType === 'full' ? '600' : '400',
                    },
                  ]}
                >
                  Full Hookup
                </Text>
              </View>
              {selectedHookupType === 'full' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                {
                  backgroundColor: selectedHookupType === 'partial' ? theme.surfaceSecondary : theme.surfaceSecondary,
                },
              ]}
              onPress={() => handleSelect('partial')}
            >
              <View style={styles.optionContent}>
                <Ionicons name="flash-outline" size={20} color={selectedHookupType === 'partial' ? theme.primary : theme.iconSecondary} />
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selectedHookupType === 'partial' ? theme.primary : theme.text,
                      fontWeight: selectedHookupType === 'partial' ? '600' : '400',
                    },
                  ]}
                >
                  Partial Hookup
                </Text>
              </View>
              {selectedHookupType === 'partial' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
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
    borderWidth: 1,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitleMargin: {
    marginTop: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionText: {
    fontSize: 16,
  },
});

