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

## Step 2: Add Keys to .env File

**IMPORTANT:** API keys are stored in a `.env` file (not committed to git) for security.

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your API keys:**
   ```bash
   # Google Maps API Keys
   GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
   GOOGLE_MAPS_IOS_API_KEY=YOUR_IOS_GOOGLE_MAPS_API_KEY_HERE
   GOOGLE_MAPS_ANDROID_API_KEY=YOUR_ANDROID_GOOGLE_MAPS_API_KEY_HERE
   ```

3. **The app.config.js file will automatically read from `.env`** - no need to edit app.json or app.config.js directly.

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

1. **Create `.env` file** with your API keys (see Step 2)
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
- Verify API keys are correct in `.env` file
- Check that Maps SDK APIs are enabled in Google Cloud Console
- Ensure API key restrictions allow your app (if restrictions are set)
- Check Expo logs for API key errors

### "API key not valid" Error
- Verify the key is copied correctly (no extra spaces)
- Check that the correct APIs are enabled
- Ensure key restrictions match your app's bundle ID/package name

### iOS Build Issues
- Make sure the iOS API key is set in `.env` as `GOOGLE_MAPS_IOS_API_KEY`
- Verify bundle identifier matches: `com.rvingwithbikes.app`

### Android Build Issues
- Make sure the Android API key is set in `.env` as `GOOGLE_MAPS_ANDROID_API_KEY`
- Verify package name matches: `com.rvingwithbikes.app`

## Security Best Practices

1. **Use separate keys for iOS and Android** (easier to manage restrictions)
2. **Restrict keys by application** (iOS bundle ID, Android package name)
3. **Restrict keys by API** (only enable Maps SDK APIs)
4. **Never commit API keys to public repositories**
5. **Use environment variables for production** (consider using EAS Secrets)

## Using EAS Secrets (For Production Builds)

For production builds with EAS, you can also use EAS Secrets:

```bash
# Set secrets
eas secret:create --scope project --name GOOGLE_MAPS_IOS_API_KEY --value "your-ios-key"
eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value "your-android-key"
```

The `app.config.js` file will automatically use these secrets during EAS builds.

## Current Configuration

API keys are stored in `.env` file (not committed to git):
- Copy `.env.example` to `.env`
- Add your actual API keys from Google Cloud Console
- The `.env` file is already in `.gitignore` for security

---

**Need Help?**
- Google Maps Platform Documentation: https://developers.google.com/maps/documentation
- Expo Maps Documentation: https://docs.expo.dev/versions/latest/sdk/map-view/

