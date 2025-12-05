import React from 'react';
import { useSubscription as useSubscriptionContext } from '../contexts/SubscriptionContext';
import { ENTITLEMENT_ID } from '../constants/revenuecat';

/**
 * Hook to check if user has premium entitlement
 */
export function useSubscription() {
  const context = useSubscriptionContext();
  
  const isPremium = context.hasEntitlement(ENTITLEMENT_ID);
  
  // Debug logging
  React.useEffect(() => {
    console.log('useSubscription hook - isPremium:', isPremium);
    console.log('useSubscription hook - customerInfo:', context.customerInfo ? {
      entitlements: Object.keys(context.customerInfo.entitlements.active),
      hasPremium: !!context.customerInfo.entitlements.active[ENTITLEMENT_ID]
    } : 'null');
  }, [isPremium, context.customerInfo]);
  
  return {
    ...context,
    isPremium,
  };
}

