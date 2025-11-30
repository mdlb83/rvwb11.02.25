# App Store Connect Preparation Checklist

## Pre-Build Checklist

### 1. App Configuration ✅

**Current Settings:**
- **Bundle ID**: `com.rvingwithbikes.app` ✅
- **Version**: `1.0.0` ✅
- **Build Number**: `1` (will auto-increment in production) ✅
- **Name**: "RVing with Bikes" ✅
- **Platform**: iPhone (supportsTablet: true means it also works on iPad, but optimized for iPhone) ✅

### 2. iOS-Specific Settings ✅

**Current Configuration:**
- ✅ Location permissions configured
- ✅ Motion permissions configured
- ✅ Encryption compliance set (ITSAppUsesNonExemptEncryption: false)
- ✅ Supported orientations configured
- ✅ Google Maps API key configured

### 3. Production Build Configuration

**EAS Build Profile:**
- ✅ Production profile exists in `eas.json`
- ✅ Auto-increment enabled
- ✅ Node version specified (20.18.0)
- ✅ Simulator disabled (correct for App Store)

### 4. RevenueCat Configuration

**Verify:**
- ✅ Production API key set in EAS Secrets
- ✅ Products configured in RevenueCat dashboard
- ✅ Offerings configured and set as default
- ✅ Products linked to entitlement

### 5. App Store Connect Setup

**Required:**
- [ ] App created in App Store Connect
- [ ] Bundle ID matches: `com.rvingwithbikes.app`
- [ ] Subscription products created:
  - [ ] `com.rvingwithbikes.app.yearly` (Subscription)
  - [ ] `com.rvingwithbikes.app.lifetime` (Non-Consumable)
- [ ] App Store listing information completed
- [ ] Screenshots uploaded (required for iPhone)
- [ ] Privacy policy URL added
- [ ] Age rating completed
- [ ] App Review information filled in

## Build Steps

### Step 1: Create Production Build

```bash
eas build --platform ios --profile production
```

This will:
- Create an App Store-ready build
- Auto-increment build number
- Use production RevenueCat API key from EAS Secrets
- Generate an `.ipa` file for App Store submission

### Step 2: Submit to App Store

After the build completes:

```bash
eas submit --platform ios --profile production
```

Or submit manually through App Store Connect:
1. Go to App Store Connect
2. Select your app
3. Go to the version you want to submit
4. Select the build from the dropdown
5. Submit for review

## Important Notes

### iPhone-Only Considerations

Your app is configured with `supportsTablet: true`, which means:
- ✅ App works on both iPhone and iPad
- ✅ Optimized for iPhone
- ✅ Can be submitted as Universal app (iPhone + iPad)

If you want **iPhone-only**:
- Change `supportsTablet: false` in `app.config.js`
- This will make it iPhone-only in the App Store

### Version Management

- **Version** (`1.0.0`): User-facing version (increment for major updates)
- **Build Number** (`1`): Internal build number (auto-increments in production)
- EAS will manage build numbers automatically

### Before Building

1. **Test thoroughly** with preview build first
2. **Verify subscriptions** work with sandbox accounts
3. **Check all features** work correctly
4. **Review App Store listing** information
5. **Ensure screenshots** are ready

## Build Command

When ready, run:

```bash
eas build --platform ios --profile production
```

This will create a production build ready for App Store submission.
