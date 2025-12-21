/**
 * Script to increment the iOS build number and Android versionCode in app.config.js
 * Both values are synchronized to match the same number
 * Run this before building for production: node scripts/increment-build-number.js
 */

const fs = require('fs');
const path = require('path');

const appConfigPath = path.join(__dirname, '../app.config.js');
let appConfigContent = fs.readFileSync(appConfigPath, 'utf8');

// Find iOS buildNumber
const buildNumberRegex = /buildNumber:\s*["'](\d+)["']/;
const buildNumberMatch = appConfigContent.match(buildNumberRegex);

if (!buildNumberMatch) {
  console.error('❌ Could not find buildNumber in app.config.js');
  process.exit(1);
}

const currentBuildNumber = parseInt(buildNumberMatch[1], 10);

// Find Android versionCode
const versionCodeRegex = /versionCode:\s*(\d+)/;
const versionCodeMatch = appConfigContent.match(versionCodeRegex);

if (!versionCodeMatch) {
  console.error('❌ Could not find versionCode in app.config.js');
  process.exit(1);
}

const currentVersionCode = parseInt(versionCodeMatch[1], 10);

// Use the maximum of the two values, then increment by 1
// This ensures both iOS and Android versions stay synchronized
const maxCurrentValue = Math.max(currentBuildNumber, currentVersionCode);
const newSynchronizedValue = maxCurrentValue + 1;

// Update both iOS buildNumber and Android versionCode to the same value
appConfigContent = appConfigContent.replace(
  buildNumberRegex,
  `buildNumber: "${newSynchronizedValue}"`
);

appConfigContent = appConfigContent.replace(
  versionCodeRegex,
  `versionCode: ${newSynchronizedValue}`
);

fs.writeFileSync(appConfigPath, appConfigContent, 'utf8');

console.log(`✅ Synchronized iOS build number from ${currentBuildNumber} to ${newSynchronizedValue}`);
console.log(`✅ Synchronized Android versionCode from ${currentVersionCode} to ${newSynchronizedValue}`);

