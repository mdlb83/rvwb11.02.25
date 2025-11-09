# App Store Preparation Guide

This guide will help you prepare your RVing with Bikes app for submission to the iOS App Store and Google Play Store.

## Prerequisites

1. **EAS Account**: Sign up at [expo.dev](https://expo.dev) if you haven't already
2. **Apple Developer Account**: Required for iOS ($99/year)
3. **Google Play Developer Account**: Required for Android ($25 one-time)

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

## Step 2: Create App Icons and Splash Screens

### Option A: Use Expo's Icon Generator (Recommended)

1. Create your icon image (1024x1024px PNG, square)
2. Place it in `./assets/icon-source.png`
3. Run:
```bash
npx expo install @expo/image-utils
npx expo prebuild --clean
```

### Option B: Manual Creation

You need to create:

**iOS Icon:**
- `./assets/icon.png` - 1024x1024px PNG

**Android Adaptive Icon:**
- `./assets/adaptive-icon.png` - 1024x1024px PNG (foreground only, transparent background)
- Background color is set in `app.config.js` (currently `#4CAF50`)

**Splash Screen:**
- `./assets/splash.png` - 1242x2436px PNG (or use a tool like [Expo Splash Screen Generator](https://www.figma.com/community/plugin/1002979463322314962/Expo-Splash-Screen))

### Quick Icon Creation Tips

- Use a simple, recognizable design
- Ensure it looks good at small sizes
- Test on both light and dark backgrounds (for Android adaptive icon)
- Consider using an RV or bike-related icon

## Step 3: Update EAS Configuration

Edit `eas.json` and update the submit section with your actual credentials:

**For iOS:**
```json
"ios": {
  "appleId": "your-apple-id@example.com",
  "ascAppId": "your-app-store-connect-app-id",
  "appleTeamId": "your-apple-team-id"
}
```

**For Android:**
```json
"android": {
  "serviceAccountKeyPath": "./google-service-account-key.json",
  "track": "internal"
}
```

### Getting Android Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google Play Android Developer API
4. Create a Service Account
5. Download the JSON key file
6. In Google Play Console, go to Setup > API access
7. Link the service account and grant permissions

## Step 4: Create App Store Listings

### iOS App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app
3. Fill in:
   - **Name**: RVing with Bikes
   - **Primary Language**: English
   - **Bundle ID**: com.rvingwithbikes.app
   - **SKU**: rving-with-bikes-001

**App Description:**
```
Find the perfect RV campground with easy access to paved bike trails!

RVing with Bikes helps you discover 385+ campgrounds across the United States that offer both RV hookups and nearby bike trail access. Whether you're looking for full or partial hookups, our comprehensive database makes it easy to plan your next adventure.

Features:
• Interactive map with 385+ campground locations
• Filter by hookup type (Full or Partial)
• Search by location or campground name
• Detailed information about each campground
• Nearby bike trail information with distances and surfaces
• Get directions to any campground
• Choose your preferred map app (Google Maps, Apple Maps, Waze)

Perfect for RVers who love to bike! Find your next destination today.
```

**Keywords**: RV, campground, bike trails, camping, RVing, bicycle, trails, full hookup, partial hookup

**Support URL**: (Your support website or email)
**Marketing URL**: (Optional - your website)

### Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Fill in:
   - **App name**: RVing with Bikes
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

**Short description** (80 characters max):
```
Find RV campgrounds with bike trail access. 385+ locations nationwide.
```

**Full description**:
```
Find the perfect RV campground with easy access to paved bike trails!

RVing with Bikes helps you discover 385+ campgrounds across the United States that offer both RV hookups and nearby bike trail access. Whether you're looking for full or partial hookups, our comprehensive database makes it easy to plan your next adventure.

Features:
• Interactive map with 385+ campground locations
• Filter by hookup type (Full or Partial)
• Search by location or campground name
• Detailed information about each campground
• Nearby bike trail information with distances and surfaces
• Get directions to any campground
• Choose your preferred map app (Google Maps, Apple Maps, Waze)

Perfect for RVers who love to bike! Find your next destination today.
```

## Step 5: Build for Production

### iOS Build

```bash
eas build --platform ios --profile production
```

This will:
- Create an iOS build
- Auto-increment the build number
- Upload to App Store Connect (if configured)

### Android Build

```bash
eas build --platform android --profile production
```

This will:
- Create an Android App Bundle (AAB)
- Auto-increment the version code
- Upload to Google Play Console (if configured)

## Step 6: Submit to App Stores

### iOS Submission

1. After build completes, go to App Store Connect
2. Select your app
3. Go to the version you want to submit
4. Fill in all required information:
   - Screenshots (required for iPhone and iPad)
   - App preview videos (optional but recommended)
   - Privacy policy URL
   - App review information
5. Submit for review

**Required Screenshots:**
- iPhone 6.7" (iPhone 14 Pro Max): 1290 x 2796 pixels
- iPhone 6.5" (iPhone 11 Pro Max): 1242 x 2688 pixels
- iPad Pro 12.9": 2048 x 2732 pixels

### Android Submission

1. After build completes, go to Google Play Console
2. Select your app
3. Go to Production (or Internal Testing)
4. Create a new release
5. Upload the AAB file
6. Fill in release notes
7. Submit for review

**Required Screenshots:**
- Phone: At least 2 screenshots (1080 x 1920 or higher)
- Tablet: At least 2 screenshots (optional but recommended)
- Feature graphic: 1024 x 500 pixels

## Step 7: Testing Before Submission

### Test on Physical Devices

1. Build a preview version:
```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

2. Install on physical devices using:
   - iOS: TestFlight (after first production build)
   - Android: Download APK directly

3. Test all features:
   - Map loading and markers
   - Search and filters
   - Bottom sheet interactions
   - Directions and map app integration
   - Location services

## Step 8: Privacy Policy

Both stores require a privacy policy. You'll need to:

1. Create a privacy policy page (can be a simple GitHub Pages site)
2. Include information about:
   - Data collection (location data)
   - Third-party services (Google Maps)
   - How data is used
   - User rights

Example privacy policy URL: `https://yourusername.github.io/rving-with-bikes/privacy`

## Step 9: App Store Assets Checklist

### iOS App Store Connect
- [ ] App icon (1024x1024)
- [ ] Screenshots for all required device sizes
- [ ] App preview video (optional)
- [ ] App description
- [ ] Keywords
- [ ] Support URL
- [ ] Privacy policy URL
- [ ] App review contact information
- [ ] Age rating questionnaire completed

### Google Play Console
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (at least 2)
- [ ] Tablet screenshots (optional)
- [ ] Short description
- [ ] Full description
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed

## Step 10: Version Management

The app is configured with auto-increment for builds. To manually update:

**Version (User-facing):**
- Update `version` in `app.config.js` (e.g., "1.0.1")

**Build Numbers:**
- iOS: `buildNumber` in `app.config.js` (auto-incremented by EAS)
- Android: `versionCode` in `app.config.js` (auto-incremented by EAS)

## Troubleshooting

### Build Fails
- Check EAS build logs: `eas build:list`
- Ensure all environment variables are set
- Verify API keys are correct

### Submission Rejected
- Review App Store/Play Store guidelines
- Check for missing permissions explanations
- Ensure privacy policy is accessible
- Test on physical devices before resubmitting

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Expo App Icons Guide](https://docs.expo.dev/guides/app-icons/)

## Next Steps After Launch

1. Monitor crash reports (Sentry integration recommended)
2. Collect user feedback
3. Plan feature updates
4. Monitor app store reviews
5. Update app regularly with improvements

---

**Last Updated**: November 9, 2025

