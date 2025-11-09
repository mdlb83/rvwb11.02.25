# Google Maps API Setup Guide

## Overview
This app requires Google Maps API keys for both iOS and Android platforms. Follow these steps to set up your API keys.

## Step 1: Get Your API Keys from Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click on the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give it a name (e.g., "RVing with Bikes")

3. **Enable Required APIs**
   - Go to "APIs & Services" → "Library"
   - Search for and enable these APIs:
     - **Maps SDK for iOS** (required for iOS)
     - **Maps SDK for Android** (required for Android)
     - **Geocoding API** (optional, for address lookups)
     - **Places API** (optional, for place details)

4. **Create API Keys**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - You'll get one API key - you can use the same key for both platforms OR create separate keys

5. **Restrict Your API Keys (Recommended for Security)**
   - Click on your API key to edit it
   - Under "Application restrictions":
     - For iOS: Select "iOS apps" and add your bundle identifier: `com.rvingwithbikes.app`
     - For Android: Select "Android apps" and add your package name: `com.rvingwithbikes.app` and SHA-1 certificate fingerprint
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose only the Maps SDK APIs you enabled

## Step 2: Add Keys to app.json

Once you have your API keys, update `app.json`:

### For iOS:
```json
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_IOS_API_KEY_HERE"
  }
}
```

### For Android:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ANDROID_API_KEY_HERE"
    }
  }
}
```

## Step 3: Get Android SHA-1 Fingerprint (For Key Restriction)

If you want to restrict your Android API key, you'll need the SHA-1 fingerprint:

### For Development (Expo Go):
```bash
# This will show your development keystore SHA-1
expo credentials:manager
```

### For Production:
The SHA-1 will be generated when you create your production build with EAS.

## Step 4: Test Your Setup

1. **Update app.json** with your API keys
2. **Restart Expo server:**
   ```bash
   npm start -- --clear
   ```
3. **Test on device:**
   - The map should load with Google Maps tiles
   - Markers should appear correctly
   - Map interactions should work smoothly

## Troubleshooting

### Map Not Loading
- Verify API keys are correct in `app.json`
- Check that Maps SDK APIs are enabled in Google Cloud Console
- Ensure API key restrictions allow your app (if restrictions are set)
- Check Expo logs for API key errors

### "API key not valid" Error
- Verify the key is copied correctly (no extra spaces)
- Check that the correct APIs are enabled
- Ensure key restrictions match your app's bundle ID/package name

### iOS Build Issues
- Make sure the iOS API key is in `ios.config.googleMapsApiKey`
- Verify bundle identifier matches: `com.rvingwithbikes.app`

### Android Build Issues
- Make sure the Android API key is in `android.config.googleMaps.apiKey`
- Verify package name matches: `com.rvingwithbikes.app`

## Security Best Practices

1. **Use separate keys for iOS and Android** (easier to manage restrictions)
2. **Restrict keys by application** (iOS bundle ID, Android package name)
3. **Restrict keys by API** (only enable Maps SDK APIs)
4. **Never commit API keys to public repositories**
5. **Use environment variables for production** (consider using EAS Secrets)

## Using Environment Variables (Advanced)

For better security, you can use EAS Secrets:

```bash
# Set secrets
eas secret:create --scope project --name GOOGLE_MAPS_IOS_KEY --value "your-ios-key"
eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_KEY --value "your-android-key"
```

Then reference them in `app.json` using `process.env.GOOGLE_MAPS_IOS_KEY` (requires app.json to support env vars or use app.config.js).

## Current Configuration

Your current `app.json` has placeholder values:
- iOS: `YOUR_IOS_GOOGLE_MAPS_API_KEY_HERE`
- Android: `YOUR_ANDROID_GOOGLE_MAPS_API_KEY_HERE`

Replace these with your actual API keys from Google Cloud Console.

---

**Need Help?**
- Google Maps Platform Documentation: https://developers.google.com/maps/documentation
- Expo Maps Documentation: https://docs.expo.dev/versions/latest/sdk/map-view/

