import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FilterButton from '../../components/filters/FilterButton';

describe('FilterButton', () => {
  const mockOnHookupTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter button', () => {
    const { getByTestId } = render(
      <FilterButton
        selectedHookupType="all"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    expect(getByTestId('filter-button')).toBeTruthy();
  });

  it('should show "All" label when all is selected', () => {
    const { queryByText } = render(
      <FilterButton
        selectedHookupType="all"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    // When "all" is selected, no label should be shown (only icon)
    expect(queryByText('All')).toBeNull();
  });

  it('should show "Full" label when full is selected', () => {
    const { getByText } = render(
      <FilterButton
        selectedHookupType="full"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    expect(getByText('Full')).toBeTruthy();
  });

  it('should show "Partial" label when partial is selected', () => {
    const { getByText } = render(
      <FilterButton
        selectedHookupType="partial"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    expect(getByText('Partial')).toBeTruthy();
  });

  it('should open modal when button is pressed', async () => {
    const { getByTestId, getByText } = render(
      <FilterButton
        selectedHookupType="all"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    const button = getByTestId('filter-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Filter by Hookup Type')).toBeTruthy();
    });
  });

  it('should call onHookupTypeChange when option is selected', async () => {
    const { getByTestId, getByText } = render(
      <FilterButton
        selectedHookupType="all"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    const button = getByTestId('filter-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Full Hookup')).toBeTruthy();
    });

    const fullOption = getByText('Full Hookup');
    fireEvent.press(fullOption);

    await waitFor(() => {
      expect(mockOnHookupTypeChange).toHaveBeenCalledWith('full');
    });
  });

  it('should close modal after selecting an option', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <FilterButton
        selectedHookupType="all"
        onHookupTypeChange={mockOnHookupTypeChange}
      />
    );

    const button = getByTestId('filter-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Filter by Hookup Type')).toBeTruthy();
    });

    const partialOption = getByText('Partial Hookup');
    fireEvent.press(partialOption);

    await waitFor(() => {
      expect(queryByText('Filter by Hookup Type')).toBeNull();
    });
  });
});

