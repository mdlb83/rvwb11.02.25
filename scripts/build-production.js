/**
 * Script to automatically increment build number and run production build
 * Usage: node scripts/build-production.js [--platform ios|android]
 * 
 * This script will:
 * 1. Increment the build number in app.config.js
 * 2. Commit the change to git
 * 3. Run the EAS production build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get platform from command line args
const args = process.argv.slice(2);
const platformArg = args.find(arg => arg.startsWith('--platform'));
const platform = platformArg ? platformArg.split('=')[1] || 'ios' : 'ios';

// Validate platform
if (!['ios', 'android'].includes(platform)) {
  console.error('❌ Invalid platform. Use "ios" or "android"');
  process.exit(1);
}

// Check if git repo is clean (no uncommitted changes)
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.warn('⚠️  Warning: You have uncommitted changes. Consider committing them first.');
    console.log('   The build number increment will be committed automatically.');
  }
} catch (error) {
  console.warn('⚠️  Warning: Could not check git status. Make sure you are in a git repository.');
}

// Increment build number first
console.log('📦 Incrementing build number...');
try {
  execSync('npm run increment-build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to increment build number:', error.message);
  process.exit(1);
}

// Read the new build number to include in commit message
const appConfigPath = path.join(__dirname, '../app.config.js');
const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
const buildNumberMatch = appConfigContent.match(/buildNumber:\s*["'](\d+)["']/);
const newBuildNumber = buildNumberMatch ? buildNumberMatch[1] : 'unknown';

// Commit the build number change
console.log('💾 Committing build number change...');
try {
  execSync(`git add app.config.js`, { stdio: 'inherit' });
  execSync(`git commit -m "Increment build number to ${newBuildNumber} for production build"`, { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Warning: Failed to commit build number change. You may need to commit manually.');
  console.warn('   Error:', error.message);
}

// Run EAS build with production profile
console.log(`🚀 Starting production build for ${platform}...`);
try {
  const command = `eas build --platform ${platform} --profile production`;
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('✅ Production build completed!');
console.log(`📱 Build number ${newBuildNumber} has been committed to git.`);

