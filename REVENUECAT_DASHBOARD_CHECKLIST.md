# RevenueCat Dashboard Verification Checklist

Follow these steps to verify your RevenueCat setup is correct.

## Step 1: Verify Products Exist

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project
3. Navigate to **Products** → **Products** (left sidebar)
4. You should see two products:

   **Product 1:**
   - **Product ID**: `com.rvingwithbikes.app.yearly` ⚠️ Must match exactly
   - **Store**: `App Store`
   - **Type**: `SUBSCRIPTION`
   - **Status**: Should show as active/configured

   **Product 2:**
   - **Product ID**: `com.rvingwithbikes.app.lifetime` ⚠️ Must match exactly
   - **Store**: `App Store`
   - **Type**: `NON_SUBSCRIPTION`
   - **Status**: Should show as active/configured

**If products are missing:**
- Click **"Create Product"**
- Enter the Product ID exactly as shown above
- Select the correct Store and Type
- Click **"Create"**

---

## Step 2: Verify Entitlement Exists

1. Navigate to **Entitlements** → **Entitlements** (left sidebar)
2. You should see an entitlement named: **`premium`** ⚠️ Must match exactly
3. Click on the `premium` entitlement
4. Under **"Products"** section, verify:
   - `com.rvingwithbikes.app.yearly` is listed
   - `com.rvingwithbikes.app.lifetime` is listed
   - Both are linked to this entitlement

**If entitlement is missing:**
- Click **"Create Entitlement"**
- Name: `premium` (exactly, case-sensitive)
- Click **"Create"**
- Then add both products to this entitlement

**If products aren't linked:**
- Click on the `premium` entitlement
- Click **"Add Product"** or **"Link Product"**
- Select both products
- Save

---

## Step 3: Verify Offering Exists and is Configured

1. Navigate to **Offerings** → **Offerings** (left sidebar)
2. You should see at least one offering (usually named "default" or similar)
3. Click on the offering
4. Under **"Packages"** section, verify you have:

   **Package 1:**
   - **Package Identifier**: `yearly` ⚠️ Must match exactly (this is what the code looks for)
   - **Product**: `com.rvingwithbikes.app.yearly`
   - Should be linked/selected

   **Package 2:**
   - **Package Identifier**: `lifetime` ⚠️ Must match exactly (this is what the code looks for)
   - **Product**: `com.rvingwithbikes.app.lifetime`
   - Should be linked/selected

5. Check if this offering is marked as **"Default"** or **"Current"**
   - There should be a star icon or "Default" label
   - This is what `offerings.current` returns

**If offering is missing:**
- Click **"Create Offering"**
- Name it (e.g., "default")
- Click **"Create"**

**If packages are missing:**
- Click on your offering
- Click **"Add Package"** or **"Create Package"**
- For each package:
  - **Package Identifier**: Enter `yearly` (exactly, for the first one)
  - **Product**: Select `com.rvingwithbikes.app.yearly`
  - Click **"Save"**
  - Repeat for `lifetime` package

**If offering isn't set as default:**
- Click on the offering
- Look for a **"Set as Default"** or star icon
- Click it to make this the default offering

---

## Step 4: Verify App Configuration

1. Navigate to **Project Settings** → **Apps** (left sidebar)
2. Verify you have an app configured:
   - **Bundle ID**: `com.rvingwithbikes.app` ⚠️ Must match exactly
   - **Platform**: iOS
   - **Status**: Should be active/configured

**If app is missing or wrong:**
- Click **"Add App"** or **"Create App"**
- Enter Bundle ID: `com.rvingwithbikes.app`
- Select Platform: iOS
- Save

---

## Step 5: Verify API Key

1. Navigate to **Project Settings** → **API Keys** (left sidebar)
2. Verify you have an API key:
   - Should start with `appl_` for iOS
   - Should match what's in your `.env` file: `appl_pOvsdaqQBtmeKsZRdttCZgqQyzb`

**If API key doesn't match:**
- Copy the correct production API key
- Update your `.env` file
- Update EAS Secrets

---

## Common Issues and Fixes

### Issue: "No current offering available"
**Fix:**
- Ensure you have an offering created
- Mark it as "Default" or "Current"
- Ensure it has packages configured

### Issue: "Products not found"
**Fix:**
- Verify Product IDs match exactly (case-sensitive)
- Ensure products are created in RevenueCat
- Ensure products are linked to the entitlement

### Issue: "Packages not found"
**Fix:**
- Verify Package Identifiers are exactly `yearly` and `lifetime` (lowercase)
- Ensure packages are linked to the correct products
- Ensure packages are added to the offering

### Issue: "API key invalid"
**Fix:**
- Verify API key in RevenueCat matches your `.env` file
- Ensure you're using the production API key (starts with `appl_`)
- Check that the API key is for the correct project

---

## Quick Verification Summary

✅ Products exist: `com.rvingwithbikes.app.yearly` and `com.rvingwithbikes.app.lifetime`  
✅ Entitlement exists: `premium`  
✅ Products linked to entitlement  
✅ Offering exists and is set as default  
✅ Packages exist: `yearly` and `lifetime`  
✅ Packages linked to correct products  
✅ App configured: `com.rvingwithbikes.app`  
✅ API key matches

---

## After Making Changes

1. Wait 1-2 minutes for changes to propagate
2. Restart your app
3. Check console logs for:
   - "Loading offerings from RevenueCat..."
   - "Offerings response:" with details
   - "Setting current offering" or "Using first available offering"

If you see "Available offerings: []" (empty), the offering still isn't configured correctly.

