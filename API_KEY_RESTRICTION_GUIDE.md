# How to Restrict Your Google Maps API Key

## Why Restrict Your API Key?
Restricting your API key prevents unauthorized usage and protects you from unexpected charges. It ensures only your app can use the key.

## Step-by-Step Guide

### Step 1: Open Your API Key in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your API key (the one ending in `...whOgOvg`)
4. Click on the API key name to edit it

### Step 2: Restrict by Application (iOS)

1. Under **"Application restrictions"**, select **"iOS apps"**
2. Click **"Add an item"**
3. Enter your bundle identifier: `com.rvingwithbikes.app`
4. Click **"Done"**

**Note:** For iOS, you can add multiple bundle IDs if you have different app variants (dev, staging, production).

### Step 3: Restrict by Application (Android)

1. Under **"Application restrictions"**, select **"Android apps"**
2. Click **"Add an item"**
3. Enter your package name: `com.rvingwithbikes.app`
4. For **SHA-1 certificate fingerprint**, you have two options:

   **Option A: For Development (Expo Go)**
   - This is less restrictive but works for testing
   - You can leave it blank or get the SHA-1 from:
     ```bash
     expo credentials:manager
     ```

   **Option B: For Production**
   - Get the SHA-1 when you create your production build:
     ```bash
     eas build --platform android --profile production
     ```
   - EAS will show you the SHA-1 fingerprint
   - Add it to the restriction

5. Click **"Done"**

### Step 4: Restrict by API

1. Under **"API restrictions"**, select **"Restrict key"**
2. Check only these APIs:
   - ✅ **Maps SDK for iOS** (if restricting for iOS)
   - ✅ **Maps SDK for Android** (if restricting for Android)
   - ❌ Uncheck any other APIs you don't need
3. Click **"Save"**

### Step 5: Verify Restrictions

After saving, your key should show:
- **Application restrictions:** iOS apps / Android apps (with your bundle/package)
- **API restrictions:** Maps SDK for iOS / Maps SDK for Android

## Important Notes

### For Development vs Production

**Development (Expo Go):**
- You can use a less restrictive key or no restrictions for testing
- Or create a separate "development" key with fewer restrictions

**Production:**
- **Always restrict production keys**
- Use separate keys for iOS and Android if possible
- Add SHA-1 fingerprints for Android production builds

### Getting SHA-1 Fingerprints

**For Expo Development:**
```bash
expo credentials:manager
# Look for "SHA-1 certificate fingerprint"
```

**For EAS Production Build:**
```bash
eas build --platform android --profile production
# EAS will display the SHA-1 during the build process
```

**For Local Android Keystore:**
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
# Look for "SHA1:" in the output
```

### Multiple Apps / Environments

If you have multiple environments (dev, staging, production), you can:
1. Create separate API keys for each environment
2. Or add multiple bundle IDs/package names to one key
3. Or use different keys in different `app.json` configurations

## Troubleshooting

### "This API key is not authorized"
- Check that the bundle ID matches exactly: `com.rvingwithbikes.app`
- Verify the package name matches: `com.rvingwithbikes.app`
- Ensure the correct APIs are enabled and checked in restrictions
- Wait a few minutes after saving - changes can take time to propagate

### "API key not valid for this platform"
- Make sure you selected the correct platform (iOS vs Android)
- Verify the bundle ID/package name is correct
- Check that Maps SDK for the correct platform is enabled

### Key Works in Development but Not Production
- Production builds use different certificates
- Get the production SHA-1 fingerprint from your build
- Add it to the Android app restrictions

## Best Practices

1. **Separate Keys:** Use different keys for iOS and Android (easier to manage)
2. **Environment Keys:** Use different keys for dev/staging/production
3. **Monitor Usage:** Check API usage in Google Cloud Console regularly
4. **Set Budget Alerts:** Set up billing alerts to avoid surprise charges
5. **Rotate Keys:** Periodically rotate keys for security

## Current App Configuration

Your app uses:
- **Bundle ID (iOS):** `com.rvingwithbikes.app`
- **Package Name (Android):** `com.rvingwithbikes.app`
- **API Key:** `YOUR_GOOGLE_MAPS_API_KEY_HERE`

Make sure these match exactly in your Google Cloud Console restrictions!

---

**Need Help?**
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Maps Platform Documentation](https://developers.google.com/maps/documentation)

