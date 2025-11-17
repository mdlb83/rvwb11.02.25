# Changelog

## [Unreleased]

### Added
- **Logo Button**: Added a circular button with the Chambers on the Road scrapbook logo that links to chambersontheroad.com
  - Positioned below the settings icon on the right side of the map screen
  - Uses the scrapbook image ("Betty & Dan Chambers ON THE ROAD") as the button fill
  - Opens chambersontheroad.com in the default browser when tapped
  - Image uses `cover` resize mode to fill the entire circular button

### Changed
- **Button Spacing**: Increased spacing between buttons for better visual hierarchy
  - Settings and logo buttons: Increased gap from 8px to 16px
  - Zoom buttons (plus/minus): Increased gap from 8px to 16px

### Removed
- **Photo Loading from Markers**: Removed all photo loading logic from map markers to improve app stability
  - Removed viewport-based photo loading
  - Removed zoom-based marker photo overlays
  - Simplified markers to use standard colored pins with callouts only
  - This resolves marker disappearing issues and improves overall app stability

### Fixed
- **Marker Stability**: Fixed issues where markers would disappear at certain zoom levels
- **App Stability**: Improved app stability by removing complex photo loading logic from markers

## Previous Changes

### Photo Viewer Improvements
- Fixed photo viewer swipe reset issue
- Added tap-to-toggle fill/fit functionality
- Added pinch-to-zoom (1x-5x) and pan gestures
- Fixed horizontal swiping between photos
- Added orientation toggle button

### Google Maps Integration
- Added Google Places API integration with editorial summaries, ratings, reviews, photos, hours, and contact info
- Implemented dynamic photo loading with horizontal scroll view and full-screen viewer
- Enhanced open hours display with dynamic 'Open Now' calculation
- Created custom toilet icon for full hookup filter
- Completed full sync of all 384 campgrounds with Google Maps data

### UI Enhancements
- Added bookmark filter button that only shows when user has bookmarks
- Removed bookmark filtering from general filter modal
- Updated filter button icons: toilet for full hookup, flash for partial hookup
- Filter button now shows only icon (no text) when hookup type filter is active

