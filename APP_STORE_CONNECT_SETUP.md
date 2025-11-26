# App Store Connect Subscription Setup Guide

## Prerequisites
- Apple Developer account with App Store Connect access
- App created in App Store Connect (Bundle ID: `com.rvingwithbikes.app`)
- RevenueCat account with API key configured

## Step-by-Step Setup

### 1. Create Subscription Group

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app "RVing with Bikes"
3. Navigate to **Subscriptions** in the left sidebar
4. Click **"+"** to create a new subscription group
5. Name: **"RVing with Bikes Premium"**
6. Click **"Create"**

### 2. Create Yearly Subscription

1. In the subscription group, click **"Create Subscription"**
2. Fill in:
   - **Reference Name**: `Yearly Premium`
   - **Product ID**: `com.rvingwithbikes.app.yearly` ⚠️ Must match exactly
   - **Subscription Duration**: `1 Year`
3. Click **"Create"**
4. Configure subscription details:
   - **Display Name**: `Yearly Premium`
   - **Description**: `Unlock full access to all campground details, photos, and premium features`
   - **Subscription Price**: `$9.99/year` (or your chosen price)
   - **Localization**: Add localized names/descriptions if needed
5. Add **Review Information** (screenshots, description)
6. Click **"Save"**

### 3. Create Lifetime Purchase (Non-Consumable)

1. In App Store Connect, go to **In-App Purchases** (not Subscriptions)
2. Click **"+"** button
3. Select **"Non-Consumable"**
4. Fill in:
   - **Reference Name**: `Lifetime Premium`
   - **Product ID**: `com.rvingwithbikes.app.lifetime` ⚠️ Must match exactly
5. Click **"Create"**
6. Configure purchase details:
   - **Display Name**: `Lifetime Premium`
   - **Description**: `One-time purchase for lifetime access to all premium features`
   - **Price**: Set your lifetime price (e.g., `$29.99`)
   - **Localization**: Add localized names/descriptions if needed
7. Add **Review Information** (screenshots, description)
8. Click **"Save"**

### 4. Submit for Review

**For Subscription:**
1. In your subscription group, ensure all details are complete
2. Click **"Submit for Review"**
3. Status will show "Waiting for Review"

**For Non-Consumable:**
1. In In-App Purchases, ensure all details are complete
2. Click **"Submit for Review"**
3. Status will show "Waiting for Review"

**Note**: You can test with sandbox accounts even while "Waiting for Review"

### 5. Link Products to RevenueCat

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project
3. Navigate to **Products** → **Products**
4. Click **"Create Product"** for each:

   **Yearly Subscription:**
   - **Product ID**: `com.rvingwithbikes.app.yearly`
   - **Store**: `App Store`
   - **Type**: `SUBSCRIPTION`
   - Click **"Create"**

   **Lifetime Purchase:**
   - **Product ID**: `com.rvingwithbikes.app.lifetime`
   - **Store**: `App Store`
   - **Type**: `NON_SUBSCRIPTION`
   - Click **"Create"**

5. Navigate to **Entitlements** → **Entitlements**
6. Ensure you have an entitlement named **"premium"** (matches `ENTITLEMENT_ID` in code)
7. Link both products to the "premium" entitlement:
   - Click on "premium" entitlement
   - Under "Products", add both products

8. Navigate to **Offerings** → **Offerings**
9. Create or edit your default offering:
   - Create a package for yearly subscription:
     - **Package Identifier**: `yearly` ⚠️ Must match exactly (this is what the code looks for)
     - **Product**: Select `com.rvingwithbikes.app.yearly`
   - Create a package for lifetime purchase:
     - **Package Identifier**: `lifetime` ⚠️ Must match exactly (this is what the code looks for)
     - **Product**: Select `com.rvingwithbikes.app.lifetime`
   - Add both packages to the offering
   - Set one as the default (usually yearly)

### 6. Test with Sandbox Accounts

1. In App Store Connect, go to **Users and Access** → **Sandbox Testers**
2. Create test accounts (use real email addresses that you can access)
3. Sign out of App Store on your test device
4. In your app, attempt to purchase
5. Sign in with sandbox account when prompted
6. Test both yearly and lifetime purchases

## Product IDs Reference

Make sure these match exactly in:
- App Store Connect
- RevenueCat Dashboard
- Your code (`constants/revenuecat.ts`)

```
Yearly:   com.rvingwithbikes.app.yearly
Lifetime: com.rvingwithbikes.app.lifetime
```

## Important Notes

- ⚠️ Product IDs are case-sensitive and must match exactly
- ⚠️ Subscriptions require App Review approval before going live
- ⚠️ Non-consumables also require App Review approval
- ✅ You can test with sandbox accounts even while "Waiting for Review"
- ✅ Sandbox purchases are free and don't charge real money
- ✅ After approval, you can test with real purchases in TestFlight

## Troubleshooting

**Products not showing in RevenueCat:**
- Verify Product IDs match exactly (case-sensitive)
- Ensure products are created in App Store Connect first
- Check that you've linked products to the entitlement

**Sandbox purchases not working:**
- Ensure you're signed out of your regular Apple ID
- Use a sandbox test account
- Products must be created in App Store Connect (even if pending review)

**RevenueCat not detecting purchases:**
- Verify API key is correct
- Check that products are linked to the entitlement
- Ensure the offering includes the products

