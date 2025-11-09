# App Icon Setup Instructions

To use your custom icon image (the retro RV with bikes design) for the app:

## Quick Setup Steps

1. **Save your icon image** as a 1024x1024px PNG file
2. **Replace the placeholder**:
   - Copy your image to: `./assets/icon.png`
   - This will be used for iOS and as the base for Android

3. **For Android Adaptive Icon** (optional, can use same image):
   - If your icon has a transparent background, use it as-is
   - Save as: `./assets/adaptive-icon.png`
   - The background color is set to `#4CAF50` (green) in `app.config.js`

## Image Requirements

- **Size**: 1024x1024 pixels (square)
- **Format**: PNG
- **Background**: 
  - iOS: Can have background (your yellow background is fine)
  - Android: If using adaptive icon, foreground should have transparent background

## Your Icon Description

Based on your description, your icon features:
- Retro RV with American flag design
- Two bicycles (red and blue)
- Red border with yellow background
- "RVING WITH BIKES" text

This design is perfect for the app! Just make sure it's saved as a 1024x1024px PNG.

## After Saving

Once you've saved the image to `./assets/icon.png`, the app will automatically use it. No code changes needed - the configuration in `app.config.js` already points to this file.

## Testing

After replacing the icon, you can test it by:
1. Running the app: `npm start`
2. Or building a preview: `eas build --platform ios --profile preview`
