/**
 * macOS notarization script.
 * Called by electron-builder after signing.
 *
 * Prerequisites:
 *   - Apple Developer account
 *   - APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD env vars
 *   - Xcode installed
 *
 * Usage:
 *   export APPLE_ID="your@email.com"
 *   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
 *   npm run build:mac
 */

const { notarize } = require('@electron/notarize');

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS builds
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;

  // Skip if credentials not configured
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('[Notarize] Skipping — APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set');
    return;
  }

  console.log(`[Notarize] Notarizing ${appName}...`);

  try {
    await notarize({
      appBundleId: 'com.player.media',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID || undefined,
    });
    console.log('[Notarize] ✓ Notarization complete');
  } catch (error) {
    console.error('[Notarize] ✗ Notarization failed:', error.message);
    throw error;
  }
};
