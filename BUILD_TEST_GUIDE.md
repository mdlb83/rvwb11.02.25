# Build Test Guide

This guide will help you test the build process before submitting to app stores.

## Prerequisites

1. **EAS Account**: Make sure you're logged in
   ```bash
   eas login
   ```

2. **Verify Configuration**: Check that your app config is correct
   - `app.config.js` has all required fields
   - Icons and splash screens are in `./assets/`
   - Google Maps API keys are in `.env`

## Testing Builds

### Option 1: Preview Build (Recommended for Testing)

Preview builds are perfect for testing on physical devices without going through app store review.

#### iOS Preview Build

```bash
eas build --platform ios --profile preview
```

This will:
- Create an iOS build
- Generate a download link
- Allow installation via TestFlight or direct download

#### Android Preview Build

```bash
eas build --platform android --profile preview
```

This will:
- Create an APK file
- Generate a download link
- Allow direct installation on Android devices

### Option 2: Development Build

For testing during development:

```bash
# iOS
eas build --platform ios --profile development

# Android
eas build --platform android --profile development
```

### What to Check During Build

1. **Build Logs**: Watch for any errors or warnings
2. **Icon Display**: Verify icon appears correctly
3. **Splash Screen**: Check splash screen shows on launch
4. **App Functionality**: Test all features work correctly

## After Build Completes

1. **Download the build** from the EAS dashboard or link provided
2. **Install on device**:
   - iOS: Use TestFlight or direct install
   - Android: Install APK directly
3. **Test thoroughly**:
   - App icon appears correctly
   - Splash screen displays
   - Map loads with markers
   - Search and filters work
   - Bottom sheet functions properly
   - Directions and map app integration work

## Troubleshooting

### Build Fails

- Check EAS build logs: `eas build:list`
- Verify all environment variables are set in `.env`
- Ensure Google Maps API keys are correct
- Check that icons are proper size and format

### Icon Not Showing

- Verify icon is 1024x1024px PNG
- Check `app.config.js` points to correct path
- Clear build cache: `eas build --clear-cache`

### Splash Screen Issues

- Verify splash is proper size (1242x2436px recommended)
- Check background color matches design
- Ensure image is PNG format

## Next Steps After Successful Build

1. Test on multiple devices (different screen sizes)
2. Test all features thoroughly
3. Fix any issues found
4. Create production build when ready
5. Submit to app stores

## Production Build Commands

When ready for app store submission:

```bash
# iOS Production
eas build --platform ios --profile production

# Android Production
eas build --platform android --profile production
```

---

**Note**: Preview builds are perfect for testing. Only create production builds when you're ready to submit to app stores.

