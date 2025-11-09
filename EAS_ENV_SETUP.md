# EAS Environment Variables Setup

Your Google Maps API keys are stored in `.env` locally, but EAS Build needs them configured as environment variables.

## ✅ Already Configured

Your API keys have been set up in EAS! The following secrets are configured:
- `GOOGLE_MAPS_API_KEY` - General API key (fallback)
- `GOOGLE_MAPS_IOS_API_KEY` - iOS-specific key
- `GOOGLE_MAPS_ANDROID_API_KEY` - Android-specific key

## Verify Secrets

To check your configured secrets:
```bash
eas secret:list
```

## How It Works

The `app.config.js` file reads from environment variables:

```javascript
// iOS
googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""

// Android  
apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
```

EAS Build automatically injects these secrets as environment variables during the build process, so your API keys will be available in the built app.

## Step-by-Step Instructions

### Option 1: Using EAS CLI (Recommended)

1. **Get your API keys** from your `.env` file:
   ```bash
   cat .env | grep GOOGLE_MAPS
   ```

2. **Set the secrets** in EAS:
   ```bash
   # For iOS
   eas secret:create --scope project --name GOOGLE_MAPS_IOS_API_KEY --value "your-actual-ios-key"
   
   # For Android
   eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value "your-actual-android-key"
   ```

3. **Verify secrets are set**:
   ```bash
   eas secret:list
   ```

### Option 2: Using EAS Dashboard

1. Go to [expo.dev](https://expo.dev)
2. Select your project
3. Go to **Secrets** in the left sidebar
4. Click **Create Secret**
5. Add:
   - Name: `GOOGLE_MAPS_IOS_API_KEY`
   - Value: Your iOS API key
   - Visibility: Select appropriate (usually "Sensitive")
6. Repeat for `GOOGLE_MAPS_ANDROID_API_KEY`

## How It Works

The `app.config.js` file already reads from environment variables:

```javascript
googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
```

EAS Build will automatically inject these secrets as environment variables during the build process.

## Environment Visibility

When creating secrets, you can set visibility:
- **Plain text**: Visible in build logs (not recommended for API keys)
- **Sensitive**: Hidden in build logs (recommended for API keys)

## Verify Configuration

After setting secrets, your next build will automatically use them. The build logs won't show the actual key values if marked as "Sensitive".

## Troubleshooting

If maps still don't work after setting secrets:

1. **Verify secrets are set**:
   ```bash
   eas secret:list
   ```

2. **Check build logs** for environment variable errors

3. **Ensure API keys are enabled** in Google Cloud Console:
   - Maps SDK for iOS
   - Maps SDK for Android

4. **Check API key restrictions** - make sure they allow your app's bundle ID/package name

---

**Important**: Never commit your actual API keys to git. Always use EAS secrets for builds.

