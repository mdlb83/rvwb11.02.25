// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: "RVing with Bikes",
    slug: "rving-with-bikes",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rvingwithbikes.app",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.rvingwithbikes.app",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow RVing with Bikes to use your location to show nearby campgrounds."
        }
      ],
      [
        "expo-router"
      ]
    ],
    scheme: "rvingwithbikes",
    extra: {
      router: {},
      eas: {
        projectId: "50d44783-aa41-470d-ba07-94e784f0272a"
      }
    },
    owner: "mikemakesapps"
  }
};

