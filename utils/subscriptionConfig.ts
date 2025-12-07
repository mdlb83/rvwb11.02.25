// Configurable subscription limits
export const SUBSCRIPTION_CONFIG = {
  // Paywall trigger: 'campgrounds' or 'days'
  triggerType: 'campgrounds' as 'campgrounds' | 'days',
  
  // If triggerType is 'campgrounds', show paywall after this many views
  maxCampgroundViews: 3,
  
  // If triggerType is 'days', show paywall after this many days
  maxDays: 7,
  
  // Subscription product ID (set in App Store Connect)
  subscriptionProductId: 'com.rvingwithbikes.premium.yearly',
  
  // Subscription price (for display)
  subscriptionPrice: '$9.99/year',
};

