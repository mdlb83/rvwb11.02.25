import React from 'react';
import { render } from '@testing-library/react-native';
import CampgroundMarker from '../../components/map/CampgroundMarker';
import { CampgroundEntry } from '../../types/campground';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MockMarker = (props: any) => <View testID="mock-marker" {...props} />;
  return {
    __esModule: true,
    default: jest.fn(),
    Marker: MockMarker,
  };
});

const mockCampground: CampgroundEntry = {
  city: 'Tucson',
  state: 'AZ',
  hookup_type: 'full',
  campground: {
    name: 'Test Campground',
    link: 'https://example.com',
  },
  cg_notes: 'Test info',
  latitude: 32.2226,
  longitude: -110.9747,
};

describe('CampgroundMarker', () => {
  it('should render marker for valid campground', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <CampgroundMarker campground={mockCampground} onPress={onPress} />
    );

    expect(getByTestId('mock-marker')).toBeTruthy();
  });

  it('should return null for campground with null data', () => {
    const invalidCampground = {
      ...mockCampground,
      campground: null as any,
    };
    const onPress = jest.fn();
    const { queryByTestId } = render(
      <CampgroundMarker campground={invalidCampground} onPress={onPress} />
    );

    expect(queryByTestId('mock-marker')).toBeNull();
  });

  it('should return null for campground with missing coordinates', () => {
    const invalidCampground = {
      ...mockCampground,
      latitude: undefined as any,
    };
    const onPress = jest.fn();
    const { queryByTestId } = render(
      <CampgroundMarker campground={invalidCampground} onPress={onPress} />
    );

    expect(queryByTestId('mock-marker')).toBeNull();
  });
});
