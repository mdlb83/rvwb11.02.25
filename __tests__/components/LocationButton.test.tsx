import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LocationButton from '../../components/map/LocationButton';

describe('LocationButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location button', () => {
    const { getByTestId } = render(<LocationButton onPress={mockOnPress} />);

    expect(getByTestId('location-button')).toBeTruthy();
  });

  it('should call onPress when button is pressed', () => {
    const { getByTestId } = render(<LocationButton onPress={mockOnPress} />);

    const button = getByTestId('location-button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});

