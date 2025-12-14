import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  PurchasesError
} from 'react-native-purchases';
import { REVENUECAT_API_KEY, ENTITLEMENT_ID, EXPO_GO_TEST_MODE, OFFERING_ID, isExpoGo } from '../constants/revenuecat';

interface SubscriptionContextType {
  // Subscription state
  isSubscribed: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  
  // Methods
  checkSubscription: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<void>;
  syncPurchases: () => Promise<void>;
  getOfferings: () => Promise<PurchasesOffering | null>;
  setCustomerAttributes: (attributes: { [key: string]: string }) => Promise<void>;
  
  // Entitlement checking
  hasEntitlement: (entitlementId: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // Test mode: simulate premium subscription in Expo Go
  const [expoGoTestPremium, setExpoGoTestPremium] = useState(false);

  // Define updateSubscriptionStatus before it's used
  const updateSubscriptionStatus = useCallback((info: CustomerInfo) => {
    const hasEntitlement = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setIsSubscribed(hasEntitlement);
  }, []);

  // Define checkSubscription before it's used
  const checkSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      // Check if Purchases is available before calling
      if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
        setIsLoading(false);
        return;
      }
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      updateSubscriptionStatus(info);
      
      // Sync campground views from RevenueCat attributes (for reinstall persistence)
      try {
        const { syncFromRevenueCat } = await import('../utils/campgroundViews');
        await syncFromRevenueCat();
      } catch (syncError) {
        // Silently handle sync errors - non-fatal
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      const purchasesError = error as PurchasesError;
      
      // Handle specific error codes
      if (purchasesError.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
        // Network errors are expected, don't log
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateSubscriptionStatus]);

  // Define loadOfferings before it's used
  const loadOfferings = useCallback(async () => {
    // Test mode: In Expo Go, RevenueCat SDK is not available, so skip loading
    if (EXPO_GO_TEST_MODE) {
      console.warn('⚠️ EXPO GO TEST MODE: RevenueCat SDK not available in Expo Go. Use a development build to test subscriptions.');
      return;
    }
    
    try {
      if (!Purchases || typeof Purchases.getOfferings !== 'function') {
        console.warn('Purchases.getOfferings not available');
        return;
      }
      const offerings = await Purchases.getOfferings();
      
      // Priority 1: Try to find the specific offering ID if configured
      if (OFFERING_ID && offerings.all[OFFERING_ID]) {
        setCurrentOffering(offerings.all[OFFERING_ID]);
      } else if (offerings.current !== null) {
        // Priority 2: Use current offering if available
        setCurrentOffering(offerings.current);
      } else {
        // Priority 3: Use first available offering
        const offeringKeys = Object.keys(offerings.all);
        if (offeringKeys.length > 0) {
          setCurrentOffering(offerings.all[offeringKeys[0]]);
        } else {
          console.error('No offerings available. Make sure offerings are configured in RevenueCat dashboard.');
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    }
  }, []);

  // Initialize RevenueCat
  const initializeRevenueCat = useCallback(async () => {
    try {
      // Use the test API key
      const apiKey = REVENUECAT_API_KEY;
      
      if (!apiKey) {
        console.error('RevenueCat API key is not configured');
        setIsLoading(false);
        return;
      }

      // Check if Purchases is available (required for development builds, not Expo Go)
      if (!Purchases || typeof Purchases.configure !== 'function') {
        if (EXPO_GO_TEST_MODE) {
          console.warn('⚠️ EXPO GO TEST MODE: RevenueCat SDK not available in Expo Go. Using test mode to simulate subscriptions.');
          console.warn('⚠️ This is for UI testing only. Real subscriptions require a development build.');
          setIsLoading(false);
          setIsInitialized(true);
          return;
        } else {
          console.warn('RevenueCat SDK not available. This requires a development build, not Expo Go.');
          setIsLoading(false);
          return;
        }
      }

      // Configure RevenueCat - test keys automatically use sandbox/test store
      await Purchases.configure({ apiKey });
      
      // Load initial customer info and offerings
      await Promise.all([
        checkSubscription(),
        loadOfferings(),
      ]);

      setIsInitialized(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
      // Don't block app if RevenueCat fails - allow app to continue
      setIsLoading(false);
    }
  }, [checkSubscription, loadOfferings]);

  // Initialize RevenueCat on mount
  useEffect(() => {
    initializeRevenueCat();
    
    // Set up customer info listener (only if Purchases is available)
    let customerInfoUpdateListener: any = null;
    try {
      if (Purchases && typeof Purchases.addCustomerInfoUpdateListener === 'function') {
        customerInfoUpdateListener = Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
          updateSubscriptionStatus(info);
        });
      }
    } catch (error) {
      console.warn('Could not set up RevenueCat listener:', error);
    }

    return () => {
      if (customerInfoUpdateListener && typeof customerInfoUpdateListener.remove === 'function') {
        customerInfoUpdateListener.remove();
      }
    };
  }, [initializeRevenueCat, updateSubscriptionStatus]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
    // Test mode: simulate purchase in Expo Go
    if (EXPO_GO_TEST_MODE) {
      console.log('⚠️ EXPO GO TEST MODE: Simulating purchase (RevenueCat not available in Expo Go)');
      setIsLoading(true);
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setExpoGoTestPremium(true);
      setIsSubscribed(true);
      setIsLoading(false);
      // Return a mock customerInfo
      return {
        entitlements: {
          active: {
            [ENTITLEMENT_ID]: {
              identifier: ENTITLEMENT_ID,
              isActive: true,
              willRenew: false,
              periodType: 'NORMAL',
              latestPurchaseDate: new Date().toISOString(),
              originalPurchaseDate: new Date().toISOString(),
              expirationDate: null,
              store: 'APP_STORE',
              productIdentifier: pkg.product.identifier,
              isSandbox: true,
              unsubscribeDetectedAt: null,
              billingIssuesDetectedAt: null,
            }
          },
          all: {}
        }
      } as CustomerInfo;
    }
    
    try {
      setIsLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(customerInfo);
      updateSubscriptionStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      const purchasesError = error as PurchasesError;
      
      if (purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        // User cancelled, don't show error
        throw new Error('Purchase cancelled');
      } else if (purchasesError.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING) {
        // Payment is pending, subscription will activate when payment completes
        throw new Error('Payment pending');
      } else {
        console.error('Error purchasing package:', purchasesError);
        throw purchasesError;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async () => {
    try {
      setIsLoading(true);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      updateSubscriptionStatus(info);
      return info;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const syncPurchases = async () => {
    try {
      await Purchases.syncPurchases();
      await checkSubscription();
    } catch (error) {
      console.error('Error syncing purchases:', error);
    }
  };

  const getOfferings = async (): Promise<PurchasesOffering | null> => {
    try {
      const offerings = await Purchases.getOfferings();
      
      // Priority 1: Try to find the specific offering ID if configured
      if (OFFERING_ID && offerings.all[OFFERING_ID]) {
        const specificOffering = offerings.all[OFFERING_ID];
        setCurrentOffering(specificOffering);
        return specificOffering;
      }
      
      // Priority 2: Use current offering if available
      if (offerings.current !== null) {
        setCurrentOffering(offerings.current);
        return offerings.current;
      }
      
      // Priority 3: Use first available offering
      const offeringKeys = Object.keys(offerings.all);
      if (offeringKeys.length > 0) {
        const firstOffering = offerings.all[offeringKeys[0]];
        setCurrentOffering(firstOffering);
        return firstOffering;
      }
      
      console.error('No offerings available');
      return null;
    } catch (error) {
      console.error('Error getting offerings:', error);
      return null;
    }
  };

  const hasEntitlement = useCallback((entitlementId: string): boolean => {
    // Always assume premium subscription in Expo Go
    if (isExpoGo && entitlementId === ENTITLEMENT_ID) {
      return true;
    }
    // Test mode: simulate premium in Expo Go (legacy support)
    if (EXPO_GO_TEST_MODE && expoGoTestPremium && entitlementId === ENTITLEMENT_ID) {
      return true;
    }
    if (!customerInfo) {
      return false;
    }
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  }, [customerInfo, expoGoTestPremium]);

  const setCustomerAttributes = useCallback(async (attributes: { [key: string]: string }): Promise<void> => {
    // Test mode: skip setting attributes in Expo Go
    if (EXPO_GO_TEST_MODE) {
      console.log('⚠️ EXPO GO TEST MODE: Skipping setCustomerAttributes');
      return;
    }
    
    try {
      if (!Purchases || typeof Purchases.setAttributes !== 'function') {
        console.warn('Purchases.setAttributes not available');
        return;
      }
      await Purchases.setAttributes(attributes);
      console.log('✅ Customer attributes set:', Object.keys(attributes));
    } catch (error) {
      console.error('Error setting customer attributes:', error);
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        isLoading,
        customerInfo,
        currentOffering,
        checkSubscription,
        purchasePackage,
        restorePurchases,
        syncPurchases,
        getOfferings,
        setCustomerAttributes,
        hasEntitlement,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

