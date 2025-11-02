# RVing with Bikes Mobile App

A React Native mobile app for finding RV campgrounds with easy access to paved bike trails across the United States.

## Features

- Interactive map showing 385+ campground locations
- Bottom sheet drawer that slides up when selecting a campground marker
- Detailed campground information including hookup type, trails, and links
- Get directions to any campground
- Full and partial hookup filtering

## Tech Stack

- React Native with Expo
- TypeScript
- Google Maps (react-native-maps)
- Bottom Sheet (@gorhom/bottom-sheet)
- Expo Router for navigation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Google Maps API keys:
   - Get API keys from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Update `app.json`:
     - iOS: `ios.config.googleMapsApiKey`
     - Android: `android.config.googleMaps.apiKey`

3. Start the development server:
```bash
npm start
```

4. Run on device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Testing

```bash
npm test
```

## Building for Production

### iOS
```bash
eas build --platform ios --profile production
```

### Android
```bash
eas build --platform android --profile production
```

## Project Structure

```
app/              # Expo Router screens
components/       # Reusable components
  map/           # Map-related components
  campground/    # Campground display components
hooks/           # Custom React hooks
types/           # TypeScript type definitions
utils/           # Utility functions
data/            # Campground database JSON
```

## Data Source

Campground data is from "RVing with Bikes - A Guide to Campgrounds with Full and Partial Hook Ups with Easy Access to Paved Bike Trails" by Betty Chambers.

