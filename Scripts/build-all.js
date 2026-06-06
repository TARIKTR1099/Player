#!/usr/bin/env node
/**
 * Cross-platform build orchestrator.
 *
 * Builds Electron app packages for the platform the user is currently on.
 * For platforms that require special toolchains (macOS dmg, Linux AppImage,
 * Android APK, iOS IPA) it generates configuration and CI instructions
 * but cannot produce the binary from Windows.
 *
 * Usage:
 *   node Scripts/build-all.js                    # build for current platform
 *   node Scripts/build-all.js --platform=win    # Windows (NSIS, portable, zip)
 *   node Scripts/build-all.js --platform=mac    # macOS DMG (needs macOS)
 *   node Scripts/build-all.js --platform=linux  # Linux AppImage (needs Linux)
 *   node Scripts/build-all.js --platform=android # Android APK (needs Android SDK)
 *   node Scripts/build-all.js --platform=ios     # iOS (needs Xcode)
 *   node Scripts/build-all.js --platform=all    # all that can be built here
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const args = process.argv.slice(2);
const flag = args.find(a => a.startsWith('--platform='));
const requested = flag ? flag.split('=')[1] : os.platform();
const dryRun = args.includes('--dry-run');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  if (dryRun) { console.log('  (dry-run, skipping)'); return { status: 0 }; }
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, ...opts });
  return r;
}

function buildWeb() {
  console.log('\n=== Building web assets (Vite) ===');
  return run('npm run build-web');
}

function ensureOutdir() {
  const dist = path.join(ROOT, 'dist');
  const distWeb = path.join(ROOT, 'dist-web');
  if (!fs.existsSync(distWeb)) fs.mkdirSync(distWeb, { recursive: true });
  return { dist, distWeb };
}

function buildWindows() {
  console.log('\n=== Building Windows installers ===');
  console.log('Targets: NSIS installer, portable, zip');
  const r = run('bunx electron-builder --win nsis portable zip --x64', { timeout: 600000 });
  return r.status === 0;
}

function buildMac() {
  console.log('\n=== Building macOS DMG ===');
  if (!isMac) {
    console.log('  ✗ macOS builds require running on macOS (need codesign, hdiutil)');
    console.log('  → On a Mac, run:');
    console.log('     npm run build-web');
    console.log('     bunx electron-builder --mac dmg zip --x64 --arm64');
    return false;
  }
  const r = run('bunx electron-builder --mac dmg zip --x64 --arm64', { timeout: 900000 });
  return r.status === 0;
}

function buildLinux() {
  console.log('\n=== Building Linux packages ===');
  if (isWindows) {
    console.log('  ✗ Linux AppImage requires mksquashfs (not available on Windows)');
    console.log('  → On Linux or WSL, run:');
    console.log('     npm run build-web');
    console.log('     bunx electron-builder --linux AppImage deb rpm --x64 --arm64');
    return false;
  }
  const r = run('bunx electron-builder --linux AppImage deb rpm --x64 --arm64', { timeout: 900000 });
  return r.status === 0;
}

function buildAndroid() {
  console.log('\n=== Building Android (Capacitor) ===');
  console.log('  Capacitor wraps dist-web/ into a native Android app.');
  console.log('  Requires: Java 17, Android SDK, Gradle');
  if (!fs.existsSync(path.join(ROOT, 'Code/mobile'))) {
    console.log('  ✗ Code/mobile/ not found');
    return false;
  }
  // Sync web build to capacitor
  run('npx cap sync android', { cwd: path.join(ROOT, 'Code/mobile'), timeout: 300000 });
  console.log('\n  → Open Code/mobile/android in Android Studio, or run:');
  console.log('     cd Code/mobile/android && ./gradlew assembleRelease');
  return true;
}

function buildIOS() {
  console.log('\n=== Building iOS (Capacitor) ===');
  console.log('  Requires: macOS, Xcode 15+, CocoaPods');
  if (!isMac) {
    console.log('  ✗ iOS builds require macOS (Xcode only runs on Mac)');
    console.log('  → On a Mac, run:');
    console.log('     npm run build-web');
    console.log('     cd Code/mobile && npx cap sync ios && npx cap open ios');
    return false;
  }
  run('npx cap sync ios', { cwd: path.join(ROOT, 'Code/mobile'), timeout: 300000 });
  console.log('\n  → Open Code/mobile/ios/App/App.xcworkspace in Xcode and archive.');
  return true;
}

function summary(results) {
  console.log('\n=== Build summary ===');
  for (const [platform, ok] of Object.entries(results)) {
    console.log(`  ${ok ? '✓' : '✗'} ${platform}`);
  }
  console.log('\nArtifacts in dist/:');
  if (fs.existsSync(path.join(ROOT, 'dist'))) {
    for (const f of fs.readdirSync(path.join(ROOT, 'dist'))) {
      const full = path.join(ROOT, 'dist', f);
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        const mb = (stat.size / 1024 / 1024).toFixed(1);
        console.log(`  ${f} (${mb} MB)`);
      }
    }
  }
}

function main() {
  console.log('========================================');
  console.log(' Player — Cross-Platform Build');
  console.log('========================================');
  console.log(`Host: ${os.platform()} ${os.arch()}`);
  console.log(`Node: ${process.version}`);
  console.log(`Requested target: ${requested}`);

  buildWeb();
  ensureOutdir();

  const results = {};
  switch (requested) {
    case 'win':
    case 'windows':
      results.windows = buildWindows(); break;
    case 'mac':
    case 'darwin':
      results.macos = buildMac(); break;
    case 'linux':
      results.linux = buildLinux(); break;
    case 'android':
      results.android = buildAndroid(); break;
    case 'ios':
      results.ios = buildIOS(); break;
    case 'all':
      results.windows = isWindows ? buildWindows() : (console.log('(skipping Windows — not host)'), null);
      results.macos = isMac ? buildMac() : (console.log('(skipping macOS — not host)'), null);
      results.linux = isLinux ? buildLinux() : (console.log('(skipping Linux — not host)'), null);
      results.android = isWindows ? buildAndroid() : (console.log('(skipping Android — Windows not supported for native build)'), null);
      results.ios = false;
      break;
    default:
      console.log(`Unknown platform: ${requested}`);
      process.exit(1);
  }
  summary(results);
}

main();
