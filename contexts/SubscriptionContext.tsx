import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  PurchasesError
} from 'react-native-purchases';
import { REVENUECAT_API_KEY, ENTITLEMENT_ID, EXPO_GO_TEST_MODE } from '../constants/revenuecat';

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
    } catch (error) {
      console.error('Error checking subscription:', error);
      const purchasesError = error as PurchasesError;
      
      // Handle specific error codes
      if (purchasesError.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
        console.warn('Network error checking subscription, will retry');
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
      console.log('Loading offerings from RevenueCat...');
      const offerings = await Purchases.getOfferings();
      console.log('Offerings response:', {
        current: offerings.current ? {
          identifier: offerings.current.identifier,
          serverDescription: offerings.current.serverDescription,
          packages: offerings.current.availablePackages.map(pkg => ({
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            priceString: pkg.product.priceString
          }))
        } : 'null',
        all: Object.keys(offerings.all),
        count: Object.keys(offerings.all).length
      });
      
      if (offerings.current !== null) {
        console.log('Setting current offering:', offerings.current.identifier);
        console.log('Available packages:', offerings.current.availablePackages.map(p => p.identifier));
        setCurrentOffering(offerings.current);
      } else {
        console.warn('No current offering available. Available offerings:', Object.keys(offerings.all));
        // Try to use the first available offering if no current
        const offeringKeys = Object.keys(offerings.all);
        if (offeringKeys.length > 0) {
          console.log('Using first available offering:', offeringKeys[0]);
          const firstOffering = offerings.all[offeringKeys[0]];
          console.log('First offering packages:', firstOffering.availablePackages.map(p => p.identifier));
          setCurrentOffering(firstOffering);
        } else {
          console.error('No offerings available at all. Make sure offerings are configured in RevenueCat dashboard.');
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
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

      // Configure RevenueCat
      console.log('Configuring RevenueCat with API key:', apiKey.substring(0, 10) + '...');
      console.log('Using test/sandbox store:', apiKey.startsWith('test_'));
      
      // Configure RevenueCat - test keys automatically use sandbox/test store
      await Purchases.configure({ apiKey });
      console.log('RevenueCat configured successfully');
      
      // Log store type (will be 'APP_STORE' for production, 'APP_STORE' for sandbox with test keys)
      try {
        const appUserID = await Purchases.getAppUserID();
        console.log('RevenueCat App User ID:', appUserID);
      } catch (e) {
        console.warn('Could not get App User ID:', e);
      }
      
      // Set user attributes (optional but recommended)
      // Note: Some reserved attributes like $appVersion may not be settable
      // Wrap in try-catch to prevent errors from blocking initialization
      try {
        // Only set non-reserved attributes if needed
        // Reserved attributes ($appVersion, $appUserId, etc.) are managed by RevenueCat
      } catch (attrError) {
        // Attribute setting is optional, don't block initialization if it fails
        console.warn('Could not set RevenueCat attributes:', attrError);
      }

      // Load initial customer info and offerings
      console.log('Loading customer info and offerings...');
      await Promise.all([
        checkSubscription(),
        loadOfferings(),
      ]);

      console.log('RevenueCat initialization complete');
      console.log('Final state - currentOffering:', currentOffering ? currentOffering.identifier : 'null');
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
      console.log('Purchase completed - customerInfo:', {
        entitlements: Object.keys(customerInfo.entitlements.active),
        hasPremium: !!customerInfo.entitlements.active[ENTITLEMENT_ID],
        premiumEntitlement: customerInfo.entitlements.active[ENTITLEMENT_ID]
      });
      setCustomerInfo(customerInfo);
      updateSubscriptionStatus(customerInfo);
      console.log('Purchase completed - subscription status updated, isSubscribed:', customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
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
      console.log('Manually fetching offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('Fetched offerings:', {
        current: offerings.current ? offerings.current.identifier : 'null',
        all: Object.keys(offerings.all),
        count: Object.keys(offerings.all).length
      });
      
      if (offerings.current !== null) {
        setCurrentOffering(offerings.current);
        return offerings.current;
      } else {
        // Try to use the first available offering if no current
        const offeringKeys = Object.keys(offerings.all);
        if (offeringKeys.length > 0) {
          console.log('No current offering, using first available:', offeringKeys[0]);
          const firstOffering = offerings.all[offeringKeys[0]];
          setCurrentOffering(firstOffering);
          return firstOffering;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting offerings:', error);
      return null;
    }
  };

  const hasEntitlement = useCallback((entitlementId: string): boolean => {
    // Test mode: simulate premium in Expo Go
    if (EXPO_GO_TEST_MODE && expoGoTestPremium && entitlementId === ENTITLEMENT_ID) {
      return true;
    }
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  }, [customerInfo, expoGoTestPremium]);

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

