# Google Places API (New) Setup Guide

This guide will help you set up a Google Places API (New) key for syncing campground data.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "RVing with Bikes")
5. Click "Create"

## Step 2: Enable the Places API (New)

1. In your Google Cloud project, go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Places API (New)"
3. Click on "Places API (New)" (make sure it's the "New" version)
4. Click "Enable"

## Step 3: Create an API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Copy the API key that's generated
4. (Recommended) Click "Restrict Key" to secure it:
   - Under "API restrictions", select "Restrict key"
   - Choose "Places API (New)" from the list
   - Click "Save"

## Step 4: Set Up Billing

⚠️ **Important**: The Places API (New) requires a billing account, but Google provides $200 in free credits per month.

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Click "Link a billing account" or "Create billing account"
3. Follow the prompts to set up billing
4. Your account will have $200/month in free credits

## Step 5: Add API Key to Your Project

1. Open your `.env` file in the project root
2. Add the following line:
   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with the API key you copied
4. **Important**: Make sure `.env` is in your `.gitignore` file (it should already be)

## Step 6: Verify Setup

Run the sync script in dry-run mode to test:

```bash
npm run sync:google-maps:dry-run
```

If you see the script running without API key errors, you're all set!

## API Costs & Rate Limits

### Places API (New) Pricing (as of 2024):
- **Text Search**: $32 per 1,000 requests
- **Place Details**: $17 per 1,000 requests  
- **Photo**: $7 per 1,000 requests

### For 385 Campgrounds:
- Initial sync: ~385 Text Searches + 385 Place Details + ~1,540 Photos (4 per campground)
- Estimated cost: ~$0.12 per campground = ~$46 total for initial sync
- With $200/month free credits, this is well within budget

### Rate Limits:
- Default quota: 1,000 requests per 100 seconds per user
- The sync script includes delays to respect rate limits

## Troubleshooting

### "API key not valid" error
- Make sure you've enabled "Places API (New)" (not the old Places API)
- Check that your API key is correctly set in `.env`
- Verify the API key restrictions allow "Places API (New)"

### "Billing not enabled" error
- You need to set up billing in Google Cloud Console
- The $200/month free credits should cover all usage

### Rate limit errors
- The script includes delays, but if you hit limits, wait a few minutes and try again
- You can increase `DELAY_BETWEEN_REQUESTS` in the sync script if needed

## Security Best Practices

1. **Restrict your API key** to only the Places API (New)
2. **Add IP restrictions** if running from a specific server
3. **Never commit** your `.env` file to git
4. **Rotate keys** periodically for security

## Next Steps

Once your API key is set up:
1. Test with dry-run: `npm run sync:google-maps:dry-run`
2. Sync a few campgrounds to test: The script will only sync new/changed ones
3. Run full sync when ready: `npm run sync:google-maps`

