/**
 * Script to automatically increment build number, version number, and run production build
 * Usage: node scripts/build-production.js [--platform ios|android] [--skip-version]
 * 
 * This script will:
 * 1. Increment the version number (patch version) in app.config.js and package.json
 * 2. Increment the build number in app.config.js
 * 3. Commit the changes to git
 * 4. Run the EAS production build
 * 
 * Use --skip-version flag to skip version incrementing (only increment build number)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get platform and flags from command line args
const args = process.argv.slice(2);
const platformArg = args.find(arg => arg.startsWith('--platform'));
const platform = platformArg ? platformArg.split('=')[1] || 'ios' : 'ios';
const shouldSkipVersion = args.includes('--skip-version');

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

// Increment version number (always, unless --skip-version flag is used)
let newVersion = null;
if (!shouldSkipVersion) {
  console.log('📦 Incrementing version number...');
  const appConfigPath = path.join(__dirname, '../app.config.js');
  const packageJsonPath = path.join(__dirname, '../package.json');
  
  // Read current version
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const versionMatch = appConfigContent.match(/version:\s*["']([\d.]+)["']/);
  if (!versionMatch) {
    console.error('❌ Could not find version in app.config.js');
    process.exit(1);
  }
  
  const currentVersion = versionMatch[1];
  const versionParts = currentVersion.split('.');
  const patchVersion = parseInt(versionParts[2] || '0', 10);
  const newPatchVersion = patchVersion + 1;
  newVersion = `${versionParts[0]}.${versionParts[1]}.${newPatchVersion}`;
  
  // Update app.config.js
  const updatedAppConfig = appConfigContent.replace(
    /version:\s*["'][\d.]+["']/,
    `version: "${newVersion}"`
  );
  fs.writeFileSync(appConfigPath, updatedAppConfig, 'utf8');
  
  // Update package.json
  packageJsonContent.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2) + '\n', 'utf8');
  
  console.log(`✅ Incremented version from ${currentVersion} to ${newVersion}`);
}

// Increment build number
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

// Commit the changes
console.log('💾 Committing changes...');
try {
  const filesToAdd = ['app.config.js'];
  if (!shouldSkipVersion) {
    filesToAdd.push('package.json');
  }
  execSync(`git add ${filesToAdd.join(' ')}`, { stdio: 'inherit' });
  
  let commitMessage = `Increment build number to ${newBuildNumber} for production build`;
  if (!shouldSkipVersion) {
    commitMessage = `Increment version to ${newVersion} and build number to ${newBuildNumber} for production build`;
  }
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Warning: Failed to commit changes. You may need to commit manually.');
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
if (!shouldSkipVersion) {
  console.log(`📱 Version ${newVersion} has been committed to git.`);
}

