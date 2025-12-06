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
    const premium = context.hasEntitlement(ENTITLEMENT_ID);
    console.log('💰 useSubscription - Calculating isPremium:', premium, {
      hasCustomerInfo: !!context.customerInfo,
      customerInfoEntitlements: context.customerInfo ? Object.keys(context.customerInfo.entitlements.active) : [],
      hasPremiumEntitlement: context.customerInfo ? !!context.customerInfo.entitlements.active[ENTITLEMENT_ID] : false
    });
    return premium;
  }, [context.hasEntitlement, context.customerInfo]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('💰 useSubscription hook - isPremium changed:', isPremium);
    console.log('💰 useSubscription hook - customerInfo:', context.customerInfo ? {
      entitlements: Object.keys(context.customerInfo.entitlements.active),
      hasPremium: !!context.customerInfo.entitlements.active[ENTITLEMENT_ID]
    } : 'null');
  }, [isPremium, context.customerInfo]);
  
  return {
    ...context,
    isPremium,
  };
}

