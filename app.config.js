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
      backgroundColor: "#FFD700"
    },
    description: "Find RV campgrounds with easy access to paved bike trails across the United States. Discover 385+ campground locations with full and partial hookups, detailed trail information, and directions.",
    keywords: ["RV", "campground", "bike trails", "camping", "RVing", "bicycle", "trails", "full hookup", "partial hookup"],
    privacy: "public",
    githubUrl: "https://github.com/mdlb83/rvwb11.02.25",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rvingwithbikes.app",
      buildNumber: "1",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Allow RVing with Bikes to use your location to show nearby campgrounds on the map.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Allow RVing with Bikes to use your location to show nearby campgrounds on the map.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#4CAF50"
      },
      package: "com.rvingwithbikes.app",
      versionCode: 1,
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

