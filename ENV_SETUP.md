# Environment Variables Setup

This app uses environment variables for sensitive API keys. Follow these steps to set up your `.env` file.

## Step 1: Create `.env` file

Create a `.env` file in the root directory of the project (same level as `package.json`).

## Step 2: Add your API keys

Copy the template below and fill in your actual API keys:

```env
# Google Maps API Keys
# Get these from: https://console.cloud.google.com/
GOOGLE_MAPS_IOS_API_KEY=your_ios_api_key_here
GOOGLE_MAPS_ANDROID_API_KEY=your_android_api_key_here
# Or use a single key for both platforms
GOOGLE_MAPS_API_KEY=your_universal_api_key_here

# RevenueCat API Key
# Get this from: https://app.revenuecat.com → Project Settings → API Keys
# For production: Use your production API key (starts with 'appl_' for iOS or 'goog_' for Android)
# For development: You can use the test key (starts with 'test_')
REVENUECAT_API_KEY=appl_YOUR_PRODUCTION_KEY_HERE
```

## Step 3: Get your RevenueCat Production API Key

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project
3. Navigate to **Project Settings** → **API Keys**
4. Copy your **Production API Key**:
   - **iOS**: Starts with `appl_`
   - **Android**: Starts with `goog_`
5. Paste it in your `.env` file as `REVENUECAT_API_KEY`

## Step 4: For EAS Builds (Production)

For production builds via EAS, you need to set environment variables in EAS:

### Option A: Set in EAS Dashboard (Recommended)

1. Go to [Expo Dashboard](https://expo.dev)
2. Select your project
3. Go to **Settings** → **Secrets**
4. Add secret:
   - **Name**: `REVENUECAT_API_KEY`
   - **Value**: Your production API key
   - **Scope**: Select `production` (and `preview` if you want)

### Option B: Set via EAS CLI

```bash
eas secret:create --scope production --name REVENUECAT_API_KEY --value appl_YOUR_PRODUCTION_KEY_HERE
```

### Option C: Use `eas.json` environment variables

You can also configure environment variables per build profile in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "REVENUECAT_API_KEY": "appl_YOUR_PRODUCTION_KEY_HERE"
      }
    }
  }
}
```

**Note**: Option A (EAS Dashboard) is recommended as it keeps secrets out of your code repository.

## Development vs Production

- **Development**: The code will fallback to the test key if `REVENUECAT_API_KEY` is not set
- **Production**: Set `REVENUECAT_API_KEY` in your `.env` file or EAS secrets

## Security Notes

- ✅ The `.env` file is already in `.gitignore` - it won't be committed to git
- ✅ Never commit API keys to your repository
- ✅ Use EAS Secrets for production builds
- ✅ Test keys are safe to use in development

## Verification

After setting up, verify your setup:

1. Check that `.env` file exists and contains your keys
2. For local development: Restart your Expo dev server
3. For EAS builds: Check that secrets are set in EAS Dashboard

## Troubleshooting

**API key not working:**
- Make sure you're using the correct key (production vs test)
- Verify the key is set in `.env` for local development
- Verify the key is set in EAS Secrets for production builds
- Check that the key matches your platform (iOS uses `appl_`, Android uses `goog_`)

**Environment variable not loading:**
- Restart your Expo dev server after creating/updating `.env`
- Make sure `.env` is in the root directory
- Check that `dotenv` is installed (it should be if you're using Expo)

