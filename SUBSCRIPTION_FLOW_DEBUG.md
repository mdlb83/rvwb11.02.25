# Subscription Status Flow - Step by Step Debug Guide

## Current Flow (Step by Step)

### 1. User Completes Purchase
**Location:** `PaywallModal.tsx` line 67-69
- RevenueCat paywall presents purchase options
- User completes purchase
- `PurchasesUI.presentPaywall()` returns `'PURCHASED'` or `'RESTORED'`

### 2. PaywallModal Detects Purchase
**Location:** `PaywallModal.tsx` line 73-114
- Checks if result is `'PURCHASED'` or `'RESTORED'`
- Calls `checkSubscription()` with retry logic (up to 3 attempts)
- Each retry:
  - Calls `checkSubscription()` from context
  - Waits 500ms
  - Checks `Purchases.getCustomerInfo()` directly
  - Verifies entitlement `ENTITLEMENT_ID` ('premium') is active
  - If not active, retries up to 3 times with 1s delays

### 3. SubscriptionContext.checkSubscription()
**Location:** `SubscriptionContext.tsx` line 48-70
- Fetches customer info: `await Purchases.getCustomerInfo()`
- Calls `setCustomerInfo(info)` - **Updates React state**
- Calls `updateSubscriptionStatus(info)` - **Updates isSubscribed state**

### 4. SubscriptionContext.updateSubscriptionStatus()
**Location:** `SubscriptionContext.tsx` line 42-45
- Checks: `info.entitlements.active[ENTITLEMENT_ID] !== undefined`
- Sets: `setIsSubscribed(hasEntitlement)`
- **Note:** This updates `isSubscribed`, but `isPremium` uses `hasEntitlement()` which checks `customerInfo`

### 5. SubscriptionContext.hasEntitlement()
**Location:** `SubscriptionContext.tsx` line 361-368
- Checks if `customerInfo` exists
- Returns: `customerInfo.entitlements.active[entitlementId] !== undefined`
- **Dependencies:** `[customerInfo, expoGoTestPremium]`
- **This is what determines `isPremium`**

### 6. useSubscription Hook
**Location:** `hooks/useSubscription.ts` line 8-26
- Calls `context.hasEntitlement(ENTITLEMENT_ID)` 
- Uses `useMemo` to recalculate when `customerInfo` or `hasEntitlement` changes
- Returns `isPremium` value

### 7. CampgroundBottomSheet Uses isPremium
**Location:** `CampgroundBottomSheet.tsx` line 124
- Gets `isPremium` from `useSubscription()` hook
- Line 1382: Conditionally renders `SubscriptionBlur` when `!isPremium && campground`

### 8. SubscriptionBlur Component
**Location:** `SubscriptionBlur.tsx` line 12-27
- Gets `isPremium` from `useSubscription()` hook
- Line 25: Returns `null` if `isPremium` is `true` (no blur overlay)
- Line 32-54: Renders blur overlay if `isPremium` is `false`

## Potential Breaking Points

### Issue 1: CustomerInfo Not Updated Immediately
**Problem:** RevenueCat might not have processed the purchase immediately after `presentPaywall()` returns.
**Current Fix:** Retry logic in PaywallModal (3 attempts with delays)
**Debug:** Check logs for `🔍 checkSubscription` to see if customerInfo has entitlement

### Issue 2: React State Not Propagating
**Problem:** `setCustomerInfo(info)` might not trigger re-render in all components
**Current Fix:** `useMemo` in `useSubscription` hook ensures recalculation
**Debug:** Check logs for `💰 useSubscription` to see if isPremium recalculates

### Issue 3: hasEntitlement Not Recalculating
**Problem:** `hasEntitlement` callback might not be called when `customerInfo` changes
**Current Fix:** `hasEntitlement` has `customerInfo` in dependencies, should update
**Debug:** Check logs for `🔍 hasEntitlement` to see if it's being called with correct values

### Issue 4: ENTITLEMENT_ID Mismatch
**Problem:** The entitlement ID in code ('premium') might not match RevenueCat dashboard
**Debug:** Check logs to see what entitlements are actually in `customerInfo.entitlements.active`

### Issue 5: Component Not Re-rendering
**Problem:** CampgroundBottomSheet or SubscriptionBlur might not re-render when `isPremium` changes
**Current Fix:** Both components use `isPremium` directly, should trigger re-render
**Debug:** Check logs for `📋 CampgroundBottomSheet` and `🔒 SubscriptionBlur` to see render decisions

## Debug Checklist

When testing, check console logs for:

1. **After Purchase:**
   - `🔍 checkSubscription: Customer info received` - Should show `hasPremiumEntitlement: true`
   - `🔄 updateSubscriptionStatus` - Should show `hasEntitlement: true`
   - `🔍 hasEntitlement` - Should show `hasEntitlement: true`
   - `💰 useSubscription - Calculating isPremium` - Should show `true`
   - `📋 CampgroundBottomSheet - isPremium changed` - Should show `true`
   - `🔒 SubscriptionBlur - Will render blur overlay` - Should show `false`
   - `✅ SubscriptionBlur - Returning null` - Should appear (blur removed)

2. **If Still Showing Blur:**
   - Check if `hasPremiumEntitlement` is `false` in logs
   - Check if `activeEntitlements` array includes 'premium'
   - Check if `customerInfo` is `null` or `undefined`
   - Check if `ENTITLEMENT_ID` constant matches RevenueCat dashboard

## Next Steps for Testing

1. Test purchase flow and watch console logs
2. Identify which step is failing based on logs
3. Check RevenueCat dashboard to verify entitlement ID matches
4. Verify customer info actually has the entitlement after purchase

