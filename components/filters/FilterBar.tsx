import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface FilterBarProps {
  selectedHookupType?: 'full' | 'partial' | 'all';
  onHookupTypeChange: (type: 'full' | 'partial' | 'all') => void;
}

export default function FilterBar({
  selectedHookupType = 'all',
  onHookupTypeChange,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterGroup}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedHookupType === 'all' && styles.filterChipActive,
          ]}
          onPress={() => onHookupTypeChange('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedHookupType === 'all' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedHookupType === 'full' && styles.filterChipActive,
          ]}
          onPress={() => onHookupTypeChange('full')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedHookupType === 'full' && styles.filterChipTextActive,
            ]}
          >
            Full Hookup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedHookupType === 'partial' && styles.filterChipActive,
          ]}
          onPress={() => onHookupTypeChange('partial')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedHookupType === 'partial' && styles.filterChipTextActive,
            ]}
          >
            Partial Hookup
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

