/**
 * Script to increment the iOS build number in app.config.js
 * Run this before building for production: node scripts/increment-build-number.js
 */

const fs = require('fs');
const path = require('path');

const appConfigPath = path.join(__dirname, '../app.config.js');
const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');

// Find the buildNumber line and increment it
const buildNumberRegex = /buildNumber:\s*["'](\d+)["']/;
const match = appConfigContent.match(buildNumberRegex);

if (!match) {
  console.error('❌ Could not find buildNumber in app.config.js');
  process.exit(1);
}

const currentBuildNumber = parseInt(match[1], 10);
const newBuildNumber = currentBuildNumber + 1;

const updatedContent = appConfigContent.replace(
  buildNumberRegex,
  `buildNumber: "${newBuildNumber}"`
);

fs.writeFileSync(appConfigPath, updatedContent, 'utf8');

console.log(`✅ Incremented build number from ${currentBuildNumber} to ${newBuildNumber}`);

