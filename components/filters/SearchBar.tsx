import React, { memo, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search campgrounds...',
  onClear,
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  
  // Safely ensure value is always a string
  const safeValue = typeof value === 'string' ? value : '';
  
  // Keep focus when component remounts (e.g., when empty state appears)
  // This prevents the keyboard from dismissing when the empty state shows
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure component is fully mounted and keyboard stays visible
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus]);
  
  // Safely wrap onChangeText to prevent crashes
  const handleChangeText = (text: string) => {
    try {
      if (typeof onChangeText === 'function') {
        onChangeText(text || '');
      }
    } catch (err) {
      console.error('Error in SearchBar onChangeText:', err, { text });
    }
  };
  
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={safeValue}
        onChangeText={handleChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        editable={true}
      />
      {safeValue.length > 0 && onClear && (
        <TouchableOpacity
          testID="clear-button"
          onPress={onClear}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

// Memoize to prevent unnecessary re-renders
export default memo(SearchBar);

