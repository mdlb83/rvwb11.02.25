import React, { useMemo } from 'react';
import { useSubscription as useSubscriptionContext } from '../contexts/SubscriptionContext';
import { ENTITLEMENT_ID } from '../constants/revenuecat';

/**
 * Hook to check if user has premium entitlement
 */
export function useSubscription() {
  const context = useSubscriptionContext();
  
  // Use useMemo to ensure isPremium recalculates when customerInfo or hasEntitlement changes
  const isPremium = useMemo(() => {
    return context.hasEntitlement(ENTITLEMENT_ID);
  }, [context.hasEntitlement, context.customerInfo]);
  
  return {
    ...context,
    isPremium,
  };
}

