# Subscription Setup Verification Checklist

## ✅ 1. RevenueCat API Key Configuration

### Local Development (.env file)
- [x] API key added to `.env` file: `appl_pOvsdaqQBtmeKsZRdttCZgqQyzb`
- [x] Code configured to read from environment variables
- [x] Fallback to test key for development

### EAS Build Secrets
- [ ] **ACTION NEEDED**: Set in EAS Dashboard
  - Go to: https://expo.dev → Your Project → Settings → Secrets
  - Add: `REVENUECAT_API_KEY` = `appl_pOvsdaqQBtmeKsZRdttCZgqQyzb`
  - Scope: `preview` and `production`

**Status**: ⚠️ Local is set, but EAS Secret needs to be configured

---

## ✅ 2. Code Configuration

### Product IDs
- [x] Yearly: `com.rvingwithbikes.app.yearly`
- [x] Lifetime: `com.rvingwithbikes.app.lifetime`
- [x] Entitlement ID: `premium`

**Status**: ✅ All configured correctly

---

## ⚠️ 3. App Store Connect - Subscription Products

### Yearly Subscription
- [ ] Subscription group created: "RVing with Bikes Premium"
- [ ] Product created with ID: `com.rvingwithbikes.app.yearly`
- [ ] Price set: $9.99/year
- [ ] Status: Created / Waiting for Review / Approved

### Lifetime Purchase (Non-Consumable)
- [ ] Product created with ID: `com.rvingwithbikes.app.lifetime`
- [ ] Price set: $XX.XX (one-time)
- [ ] Status: Created / Waiting for Review / Approved

**Status**: ⚠️ Need to verify in App Store Connect

---

## ⚠️ 4. RevenueCat Dashboard Configuration

### Products
- [ ] Product added: `com.rvingwithbikes.app.yearly`
  - Store: App Store
  - Type: SUBSCRIPTION
- [ ] Product added: `com.rvingwithbikes.app.lifetime`
  - Store: App Store
  - Type: NON_SUBSCRIPTION

### Entitlement
- [ ] Entitlement exists: `premium`
- [ ] Both products linked to `premium` entitlement

### Offering
- [ ] Default offering created/updated
- [ ] Package with identifier `yearly` linked to `com.rvingwithbikes.app.yearly`
- [ ] Package with identifier `lifetime` linked to `com.rvingwithbikes.app.lifetime`
- [ ] Both packages added to offering

**Status**: ⚠️ Need to verify in RevenueCat Dashboard

---

## ⚠️ 5. Sandbox Test Accounts

### App Store Connect
- [ ] Sandbox testers created
- [ ] Test accounts use real email addresses you can access
- [ ] At least 2-3 test accounts created

**Status**: ⚠️ Need to verify/create

---

## Summary

- ✅ Code configuration: Complete
- ✅ Local API key: Set
- ⚠️ EAS Secret: Needs to be set
- ⚠️ App Store Connect: Need to verify products exist
- ⚠️ RevenueCat Dashboard: Need to verify configuration
- ⚠️ Sandbox accounts: Need to verify/create

