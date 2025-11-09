import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchBar from '../../components/filters/SearchBar';

describe('SearchBar', () => {
  const mockOnChangeText = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default placeholder', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} />
    );

    expect(getByPlaceholderText('Search campgrounds...')).toBeTruthy();
  });

  it('should render with custom placeholder', () => {
    const { getByPlaceholderText } = render(
      <SearchBar
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Custom placeholder"
      />
    );

    expect(getByPlaceholderText('Custom placeholder')).toBeTruthy();
  });

  it('should display the value', () => {
    const { getByDisplayValue } = render(
      <SearchBar value="test search" onChangeText={mockOnChangeText} />
    );

    expect(getByDisplayValue('test search')).toBeTruthy();
  });

  it('should call onChangeText when text is entered', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} />
    );

    const input = getByPlaceholderText('Search campgrounds...');
    fireEvent.changeText(input, 'new text');

    expect(mockOnChangeText).toHaveBeenCalledWith('new text');
  });

  it('should show clear button when value has length', () => {
    const { getByTestId } = render(
      <SearchBar value="test" onChangeText={mockOnChangeText} onClear={mockOnClear} />
    );

    // The clear button should be visible
    const clearButton = getByTestId('clear-button');
    expect(clearButton).toBeTruthy();
  });

  it('should not show clear button when value is empty', () => {
    const { queryByTestId } = render(
      <SearchBar value="" onChangeText={mockOnChangeText} onClear={mockOnClear} />
    );

    const clearButton = queryByTestId('clear-button');
    expect(clearButton).toBeNull();
  });

  it('should call onClear when clear button is pressed', () => {
    const { getByTestId } = render(
      <SearchBar value="test" onChangeText={mockOnChangeText} onClear={mockOnClear} />
    );

    const clearButton = getByTestId('clear-button');
    fireEvent.press(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});

