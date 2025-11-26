# Complete App Store Connect Setup Guide

Follow these steps to finish setting up your app in App Store Connect.

## Step 1: App Information

1. Go to your app in App Store Connect
2. Click on **"App Information"** in the left sidebar
3. Fill in the following:

   **General Information:**
   - **Name**: `RVing with Bikes`
   - **Subtitle**: `Find RV campgrounds near bike trails` (optional but recommended)
   - **Primary Language**: `English (U.S.)`
   - **Bundle ID**: `com.rvingwithbikes.app` (should already be set)
   - **SKU**: `rving-with-bikes-app` (or what you chose)

   **App Category:**
   - **Primary Category**: `Travel` or `Navigation`
   - **Secondary Category**: `Lifestyle` (optional)

   **App Privacy:**
   - Click **"Edit"** next to App Privacy
   - You'll need to answer questions about data collection
   - Based on your app:
     - **Location Data**: Yes (used for showing nearby campgrounds)
     - **User Content**: No (unless you collect user reviews/ratings)
     - **Identifiers**: Yes (for RevenueCat subscription tracking)
     - **Other Data Types**: No (unless you collect analytics)

## Step 2: Pricing and Availability

1. Click **"Pricing and Availability"** in the left sidebar
2. Configure:

   **Price:**
   - **Price Schedule**: `Free` (app is free, subscriptions are separate)
   - This is correct since you're using in-app purchases for subscriptions

   **Availability:**
   - **Make this app available in**: Select all countries or specific ones
   - **Available for pre-order**: No (unless you want to do a pre-order)

## Step 3: App Store Listing (Version 1.0)

1. Click **"1.0 Prepare for Submission"** (or create a new version)
2. Fill in the **App Store** tab:

   **What's New in This Version:**
   ```
   Initial release of RVing with Bikes! Find RV campgrounds with easy access to paved bike trails across the United States.
   
   Features:
   • Discover 385+ campground locations
   • Filter by hookup type (full, partial, or no hookups)
   • View detailed campground information and photos
   • Get directions to campgrounds
   • Bookmark your favorite locations
   • Premium subscription for full access to all features
   ```

   **Description:**
   ```
   Find RV campgrounds with easy access to paved bike trails across the United States. Discover 430+ campground locations with full and partial hookups, detailed trail information, and directions. 
   
   No bike rack loading needed!

   KEY FEATURES:
   • Exclusive and ONLY campground database with these 430+ locations
   • Filter by hookup type (full hookups, partial hookups, or no hookups)
   • Interactive map with detailed campground markers
   • High-quality photos of each campground
   • Detailed information including ratings, reviews, amenities, websites, and contact details
   • Get directions using your preferred map app
   • Bookmark your favorite campgrounds for quick access
   • Search by campground name or location
   • Dark mode support

   PREMIUM SUBSCRIPTION:
   Unlock full access to all campground details, photos, and premium features with a yearly subscription or lifetime purchase.

   Perfect for RVers who love cycling and want to find the perfect campground near bike trails!
   ```

   **Keywords:**
   ```
   RV, campground, bike trails, camping, RVing, bicycle, trails, full hookup, partial hookup, RV parks, cycling, bike paths, RV camping, campground finder
   ```
   (100 characters max, comma-separated)

   **Support URL:**
   - Your website or support email
   - Example: `https://yourwebsite.com/support` or `mailto:support@yourwebsite.com`

   **Marketing URL:** (Optional)
   - Your website or landing page

   **Promotional Text:** (Optional)
   ```
   Discover the perfect RV campground near your favorite bike trails!
   ```

   **Copyright:**
   ```
   © 2025 Your Name or Company
   ```

## Step 4: App Store Review Information

1. Still in the version page, scroll to **"App Store Review Information"**

   **Contact Information:**
   - **First Name**: Your first name
   - **Last Name**: Your last name
   - **Phone Number**: Your phone number
   - **Email**: Your email address

   **Demo Account Information:**
   - **Sign-in required**: No (unless you have user accounts)
   - If you have test accounts, provide credentials here

   **Notes:**
   ```
   This app uses RevenueCat for subscription management. Test purchases can be made using sandbox accounts.
   
   The app requires location permissions to show nearby campgrounds on the map.
   
   Subscriptions are managed through RevenueCat and App Store subscriptions.
   ```

   **Attachments:** (Optional)
   - Screenshots or videos showing how to use the app
   - Any additional information for reviewers

## Step 5: Version Information

1. In the same version page, find **"Version Information"**

   **Version:**
   - **Version**: `1.0.0` (matches your app.config.js)

   **Build:**
   - You'll select a build after you upload one via EAS Build
   - For now, leave this empty until you have a build

## Step 6: Screenshots (Required)

You'll need screenshots for different device sizes. Minimum requirements:

**iPhone 6.7" Display (iPhone 14 Pro Max, etc.):**
- 1290 x 2796 pixels
- At least 1 screenshot required

**iPhone 6.5" Display (iPhone 11 Pro Max, etc.):**
- 1242 x 2688 pixels
- At least 1 screenshot required

**iPad Pro (12.9-inch):**
- 2048 x 2732 pixels
- At least 1 screenshot required (if supporting iPad)

**What to include in screenshots:**
1. Main map view with campgrounds
2. Campground detail view (bottom sheet)
3. Filter/search functionality
4. Premium features (if showing paywall)

**Tips:**
- Use actual device screenshots, not mockups
- Show the app's key features
- Make sure text is readable
- Use the best-looking screenshots first

## Step 7: App Preview (Optional but Recommended)

- Video previews can help with conversions
- 15-30 seconds showing key features
- Same size requirements as screenshots

## Step 8: Age Rating

1. Click **"App Information"** → **"Age Rating"**
2. Answer the questionnaire:

   Based on your app:
   - **Unrestricted Web Access**: No
   - **Cartoon or Fantasy Violence**: No
   - **Realistic Violence**: No
   - **Profanity or Crude Humor**: No
   - **Sexual Content or Nudity**: No
   - **Alcohol, Tobacco, or Drug Use**: No
   - **Gambling**: No
   - **Contests**: No
   - **Horror/Fear Themes**: No
   - **Mature/Suggestive Themes**: No
   - **Medical/Treatment Information**: No
   - **Unrestricted Web Access**: No

   This should result in a **4+** rating (suitable for all ages).

## Step 9: App Store Connect API (Optional)

If you plan to use automation or CI/CD:
1. Go to **"Users and Access"** → **"Keys"**
2. Create an API key if needed
3. Download and securely store the key

## Step 10: Content Rights

1. In **"App Information"**, check **"Content Rights"**
2. Confirm you have rights to all content in your app
3. If using third-party content, ensure you have proper licenses

## Step 11: Export Compliance

1. In your version page, find **"Export Compliance"**
2. Answer the questions:

   **Does your app use encryption?**
   - Based on your app.config.js: `ITSAppUsesNonExemptEncryption: false`
   - Answer: **No** (standard HTTPS doesn't count)
   - If you use custom encryption, you may need to provide documentation

## Step 12: Advertising Identifier (IDFA)

1. In your version page, find **"Advertising Identifier"**
2. If you're not using advertising or tracking:
   - Select **"No, this app does not use the Advertising Identifier (IDFA)"**

## Step 13: Review Submission Checklist

Before submitting for review, ensure:

- [ ] All required screenshots uploaded
- [ ] App description and keywords filled in
- [ ] Support URL provided
- [ ] Age rating completed
- [ ] App Store Review Information filled in
- [ ] Export compliance answered
- [ ] Privacy policy URL (if collecting data)
- [ ] Build uploaded and selected
- [ ] Subscriptions created and linked (from previous guide)
- [ ] RevenueCat products configured

## Step 14: Submit for Review

Once everything is complete:

1. Make sure you've selected a build in the version
2. Click **"Submit for Review"** button
3. Answer any final questions
4. Submit!

**Review Timeline:**
- Usually takes 24-48 hours
- Can take up to a week during busy periods
- You'll receive email notifications about status changes

## Important Notes

- **Privacy Policy**: If your app collects any user data (including through RevenueCat), you may need a privacy policy URL
- **TestFlight**: You can test your app with TestFlight before submitting to the App Store
- **Sandbox Testing**: Test subscriptions with sandbox accounts before going live
- **Build Requirements**: You need to upload a build via EAS Build before you can submit

## Next Steps After Setup

1. Create and upload an iOS build via EAS Build
2. Test the build with TestFlight
3. Test subscriptions with sandbox accounts
4. Once everything works, submit for App Store review

## Need Help?

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

