import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapAppPickerModal from '../../components/settings/MapAppPickerModal';
import { MapApp } from '../../utils/mapAppPreferences';

// Mock mapAppPreferences to control available apps
jest.mock('../../utils/mapAppPreferences', () => {
  const actual = jest.requireActual('../../utils/mapAppPreferences');
  return {
    ...actual,
    getAvailableMapApps: jest.fn(() => [
      { value: 'default', label: 'Apple Maps (Default)' },
      { value: 'google', label: 'Google Maps' },
      { value: 'apple', label: 'Apple Maps' },
      { value: 'waze', label: 'Waze' },
    ]),
  };
});

describe('MapAppPickerModal', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <MapAppPickerModal
        visible={false}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    expect(queryByText('Choose Map App')).toBeNull();
  });

  it('should render when visible is true', () => {
    const { getByText } = render(
      <MapAppPickerModal
        visible={true}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Choose Map App')).toBeTruthy();
    expect(getByText('Select your preferred map app for directions and searches')).toBeTruthy();
  });

  it('should display available map apps', () => {
    const { getByText } = render(
      <MapAppPickerModal
        visible={true}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    // Should show default, Google Maps, Apple Maps (iOS), and Waze
    expect(getByText(/Apple Maps \(Default\)|Google Maps \(Default\)/)).toBeTruthy();
    expect(getByText('Google Maps')).toBeTruthy();
    expect(getByText('Apple Maps')).toBeTruthy();
    expect(getByText('Waze')).toBeTruthy();
  });

  it('should highlight current app', () => {
    const { getByText } = render(
      <MapAppPickerModal
        visible={true}
        currentApp="google"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    const googleOption = getByText('Google Maps');
    expect(googleOption).toBeTruthy();
    // The selected option should have a checkmark
    expect(getByText('✓')).toBeTruthy();
  });

  it('should call onSelect when an option is pressed', () => {
    const { getByText } = render(
      <MapAppPickerModal
        visible={true}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    const googleOption = getByText('Google Maps');
    fireEvent.press(googleOption);

    expect(mockOnSelect).toHaveBeenCalledWith('google');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is pressed', () => {
    const { getByText } = render(
      <MapAppPickerModal
        visible={true}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should call onClose when overlay is pressed', () => {
    const { getByTestId } = render(
      <MapAppPickerModal
        visible={true}
        currentApp={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    const overlay = getByTestId('modal-overlay');
    fireEvent.press(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

