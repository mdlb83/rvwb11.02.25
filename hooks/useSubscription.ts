import { useSubscription as useSubscriptionContext } from '../contexts/SubscriptionContext';
import { ENTITLEMENT_ID } from '../constants/revenuecat';

/**
 * Hook to check if user has premium entitlement
 */
export function useSubscription() {
  const context = useSubscriptionContext();
  
  return {
    ...context,
    isPremium: context.hasEntitlement(ENTITLEMENT_ID),
  };
}

