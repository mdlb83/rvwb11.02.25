#!/bin/bash
# Script to clear all active EAS builds
# Run this before starting a new build to ensure queue is clear

cd "/Users/michaellinneman/Documents/Cursor projects/RVwithBikesNov2025v2"

echo "🔍 Checking for active builds..."

# Function to cancel builds by status
cancel_builds_by_status() {
  local status=$1
  echo "Checking for '$status' builds..."
  
  # Get build IDs (try multiple methods to parse)
  local builds=$(eas build:list --status "$status" --limit 20 2>/dev/null | grep -E "^ID" | awk '{print $2}')
  
  if [ ! -z "$builds" ]; then
    echo "Found $status builds, canceling..."
    for build_id in $builds; do
      if [ ! -z "$build_id" ] && [ "$build_id" != "null" ]; then
        echo "  Canceling: $build_id"
        eas build:cancel "$build_id" 2>/dev/null
      fi
    done
    return 0
  else
    echo "  No '$status' builds found"
    return 1
  fi
}

# Cancel all active statuses
cancel_builds_by_status "new"
cancel_builds_by_status "in-progress"
cancel_builds_by_status "in-queue"
cancel_builds_by_status "pending-cancel"

# Wait a moment for cancellations to process
sleep 3

# Final check
echo ""
echo "📊 Final status:"
eas build:list --limit 5

echo ""
echo "✅ Done! Queue should be clear now."


