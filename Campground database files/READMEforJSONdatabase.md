# RVing with Bikes Database

## Overview
Complete database of **385 RV campgrounds** across the United States with easy access to paved bike trails. Data extracted from the "RVing with Bikes" PDF guide with clickable HTML links embedded directly in the text.

## Database Statistics

- **Total Campground Entries**: 385
  - Regular entries: 382 (97.4% of 392 in main PDF)
  - Appendix 1 (exceptions): 3
- **Full Hookup Campgrounds**: 265 (68.8%)
- **Partial Hookup Campgrounds**: 120 (31.2%)
- **Entries with Contributors**: 20 (community-submitted locations)
- **HTML Links Embedded**: 652
  - Campground links: 381
  - Trail links: 266
  - Blog post links: 5

## JSON Structure

```json
{
  "entries": [
    {
      "city": "City Name",
      "state": "ST",
      "hookup_type": "full" or "partial",
      "campground": {
        "name": "Campground Name",
        "type": "Type (RV Park, State Park, etc.)",
        "info": "Description with <a href='URL'>embedded links</a>",
        "notes": "Additional information"
      },
      "trails": [
        {
          "description": "Trail info with <a href='URL'>embedded links</a>",
          "name": "Primary trail name",
          "distance": "Distance",
          "surface": "paved, asphalt, or crushed stone"
        }
      ],
      "blog_post": "<a href='URL'>Blog Title</a>" or null,
      "contributor": {
        "name": "Contributor Name",
        "location": "City, State" or null
      } or null,
      "exception": "Exception note (only for Appendix 1 entries)"
    }
  ]
}
```

## Field Descriptions

### Entry Object
- **city**: City name
- **state**: Two-letter state abbreviation
- **hookup_type**: 
  - `"full"` - Full hookups (water, electric, sewer)
  - `"partial"` - Partial hookups (typically water & electric only)
- **campground**: Campground object with details
- **trails**: Array of trail objects accessible from campground
- **blog_post**: Related blog post link (if available)
- **contributor**: Person who submitted this location to the guide (if applicable)
- **exception**: Note about why this entry is an exception (only present in Appendix 1 entries)

### Campground Object
- **name**: Campground name
- **type**: Facility type (RV Park, State Park, National Park, County Park, City Park, etc.)
- **info**: Full description with HTML links embedded
- **notes**: Additional details (capacity, restrictions, phone numbers, etc.)

### Trail Object
- **description**: Full trail description with HTML links embedded for all mentioned trails
- **name**: Primary trail name
- **distance**: Trail length or distance from campground
- **surface**: Surface type (paved, asphalt, crushed stone, various)

### Contributor Object
- **name**: Name of person who submitted this campground/trail location
- **location**: Their city/state or other identifying location (may be null)

### Blog Post
- String with embedded HTML link to related blog post, or `null` if none

## Community Contributors

20 entries were contributed by community members who emailed or posted their favorite RV-accessible bike trails:

- **Tony** (Huntsville, AL) - 1 location
- **Tony C.** (Detroit, Michigan) - 1 location  
- **Jim Black** (Pennsylvania) - 4 locations
- **Julia Tousignant** - 3 locations
- **Julia** (RetirementRVDream.com) - 1 location
- **Patrick S** (Arizona) - 1 location
- **Reagan Terrill** - 2 locations
- **Ken and Martha Wiseman** (rvnavigator.com) - 3 locations
- **Vickie M.** (Bradenton, Florida) - 1 location
- **John W.** - 3 locations

These contributors are acknowledged in the database with a `contributor` field on their submitted entries.

## Appendix 1 - Exceptions to the Rules

The database includes 3 special campgrounds from Appendix 1 that don't strictly meet the main criteria:

1. **Tucson, AZ** - Rincon Country West RV Resort (55+ community) - *Contributed by Ken and Martha Wiseman*
2. **Lincoln City, IN** - Lincoln State Park (no paved trail, but bike-friendly roads in park)
3. **Gatlinburg, TN** - Greenbrier Campground (no paved trail, but scenic park roads)

These entries include an `exception` field explaining why they're special cases.

## Usage in Your App

The HTML links are embedded directly in text fields, ready to render:

**React**:
```jsx
<div dangerouslySetInnerHTML={{ __html: entry.campground.info }} />
<div dangerouslySetInnerHTML={{ __html: trail.description }} />

{/* Show contributor badge */}
{entry.contributor && (
  <div className="contributor-badge">
    📍 Submitted by {entry.contributor.name}
    {entry.contributor.location && ` from ${entry.contributor.location}`}
  </div>
)}
```

**Vue**:
```vue
<div v-html="entry.campground.info"></div>
<div v-html="trail.description"></div>

<!-- Show contributor badge -->
<div v-if="entry.contributor" class="contributor-badge">
  📍 Submitted by {{ entry.contributor.name }}
  <span v-if="entry.contributor.location">from {{ entry.contributor.location }}</span>
</div>
```

**JavaScript**:
```javascript
element.innerHTML = entry.campground.info;

// Show contributor
if (entry.contributor) {
  const badge = document.createElement('div');
  badge.className = 'contributor-badge';
  badge.textContent = `📍 Submitted by ${entry.contributor.name}`;
  if (entry.contributor.location) {
    badge.textContent += ` from ${entry.contributor.location}`;
  }
  element.appendChild(badge);
}
```

## Hookup Type Distribution

The database is organized into sections based on hookup availability:

- **Part 1 (Pages 16-114)**: Full hookups - 263 campgrounds
- **Part 2 (Pages 115+)**: Partial hookups - 119 campgrounds  
- **Appendix 1 (Pages 164-165)**: Exceptions - 3 campgrounds (2 full, 1 partial)

Letters in parentheses (A, B, C, etc.) that appear in the original PDF are simply identifiers for multiple campgrounds in the same city and do not indicate hookup type.

## Link Coverage

Out of approximately 840 total links in the PDF:
- **652 links embedded (77.6%)**
- ~188 links not captured

The majority of campgrounds and trails have their primary links embedded. Missing links are typically:
- Secondary trail references
- Links that didn't match our automated matching algorithm
- Duplicate links in the PDF

## Data Source

**Source**: "RVing with Bikes - A Guide to Campgrounds with Full and Partial Hook Ups with Easy Access to Paved Bike Trails"  
**Author**: Betty Chambers  
**Copyright**: © 2022 www.RVingwithBikes.com  
**Processed**: October 25, 2025

## Top 10 States by Campgrounds

1. Iowa: 50+ campgrounds
2. Florida: 24+ campgrounds
3. Michigan: 21+ campgrounds
4. Minnesota: 20+ campgrounds
5. California: 18+ campgrounds
6. Missouri: 14+ campgrounds
7. Colorado: 13+ campgrounds
8. South Dakota: 13+ campgrounds
9. New York: 12+ campgrounds
10. Wisconsin: 12+ campgrounds

## File Information

- **Filename**: rving_bikes_database.json
- **Format**: JSON
- **Encoding**: UTF-8
- **Size**: ~640KB (uncompressed)
- **Entries**: 385 campground locations

## Known Limitations

1. **7 missing entries** (1.8% of 392 main entries) - Some campgrounds weren't captured due to formatting variations
2. **Link coverage**: 77.6% - Some secondary trail links may not be embedded
3. **City duplicates**: Same city may appear multiple times (different campgrounds with different hookup types)

## Example Queries

**Find all full hookup campgrounds in Colorado**:
```javascript
const coloFullHookups = entries.filter(e => 
  e.state === 'CO' && e.hookup_type === 'full'
);
```

**Find campgrounds with paved trails**:
```javascript
const pavedTrails = entries.filter(e => 
  e.trails.some(t => t.surface === 'paved')
);
```

**Get all campgrounds in a city**:
```javascript
const tucsonCampgrounds = entries.filter(e => 
  e.city === 'Tucson' && e.state === 'AZ'
);
```

**Filter out exception entries**:
```javascript
const regularOnly = entries.filter(e => !e.exception);
```

**Find community-contributed entries**:
```javascript
const communitySubmissions = entries.filter(e => e.contributor);

// Group by contributor
const byContributor = communitySubmissions.reduce((acc, entry) => {
  const name = entry.contributor.name;
  if (!acc[name]) acc[name] = [];
  acc[name].push(entry);
  return acc;
}, {});
```

**Find entries from a specific contributor**:
```javascript
const jimBlackLocations = entries.filter(e => 
  e.contributor && e.contributor.name === 'Jim Black'
);
```

**Show contributor leaderboard**:
```javascript
const contributorCounts = {};
entries.forEach(e => {
  if (e.contributor) {
    const name = e.contributor.name;
    contributorCounts[name] = (contributorCounts[name] || 0) + 1;
  }
});

// Sort by count
const leaderboard = Object.entries(contributorCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => ({ name, count }));
```
