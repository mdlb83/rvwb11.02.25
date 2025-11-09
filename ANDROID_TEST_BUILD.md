# Android Test Build Guide

This guide will help you create an Android build for testing on physical devices.

## Quick Steps

1. **Create the build**:
   ```bash
   eas build --platform android --profile preview
   ```

2. **Wait for build to complete** (10-20 minutes)

3. **Download the APK** from the EAS dashboard or link provided

4. **Share with your tester**:
   - Send them the APK file
   - Or share the download link from EAS

5. **Installation on Android device**:
   - Enable "Install from unknown sources" in Android settings
   - Open the APK file
   - Follow installation prompts

## Detailed Instructions

### Step 1: Create Android Preview Build

Run this command:
```bash
eas build --platform android --profile preview
```

This will:
- Create an APK file (Android Package)
- Generate a download link
- Take about 10-20 minutes

### Step 2: Get the Download Link

After the build completes, you'll get:
- A link in the terminal
- Or check the EAS dashboard at [expo.dev](https://expo.dev)

### Step 3: Share with Your Tester

**Option A: Direct Download Link**
- Share the EAS download link
- They can download directly on their Android phone

**Option B: Download and Share APK**
- Download the APK file to your computer
- Share via email, messaging, or file sharing service
- They download and install on their phone

### Step 4: Installation Instructions for Tester

Your tester needs to:

1. **Enable Unknown Sources** (if not already):
   - Go to Settings → Security (or Apps → Special Access)
   - Enable "Install unknown apps" or "Unknown sources"
   - Select the app they'll use to install (Chrome, Files, etc.)

2. **Download the APK**:
   - Open the download link on their Android phone
   - Or transfer the APK file to their phone

3. **Install**:
   - Tap the APK file
   - Tap "Install" when prompted
   - Wait for installation to complete

4. **Open the app**:
   - Find "RVing with Bikes" in their app drawer
   - Launch and test!

## What's Included in the Build

- ✅ Your custom app icon
- ✅ Splash screen
- ✅ Google Maps API key (configured in EAS)
- ✅ All app features and functionality

## Testing Checklist

Have your tester check:
- [ ] App icon appears correctly
- [ ] Splash screen displays on launch
- [ ] Map loads with campground markers
- [ ] Search functionality works
- [ ] Filters work (Full/Partial hookup)
- [ ] Tapping a marker opens the bottom sheet
- [ ] Bottom sheet displays campground info
- [ ] "Get Directions" button works
- [ ] "Open in Maps" button works
- [ ] Location button works (if they grant permission)

## Troubleshooting

### "App not installed" Error
- Make sure "Install from unknown sources" is enabled
- Try downloading the APK again
- Check if device has enough storage space

### Maps Not Loading
- Verify internet connection
- Check if Google Play Services is up to date
- API key should be automatically included (verify in EAS secrets)

### App Crashes
- Check Android version (should be Android 6.0+)
- Ensure device has enough RAM
- Check build logs in EAS dashboard for errors

## Build Status

Check build status:
```bash
eas build:list
```

View build logs:
```bash
eas build:view [BUILD_ID]
```

## Next Steps After Testing

Once testing is complete:
1. Gather feedback
2. Fix any issues found
3. Create production build when ready:
   ```bash
   eas build --platform android --profile production
   ```

---

**Note**: Preview builds are perfect for testing. They don't require Google Play Store submission and can be installed directly on any Android device.

