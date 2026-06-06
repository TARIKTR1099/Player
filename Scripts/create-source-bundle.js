#!/usr/bin/env node
/**
 * Source bundle creator (v2 - simplified).
 *
 * Produces Player-1.0.0-source.zip and Player-1.0.0-source.tar.gz in dist/
 * Usage: node Scripts/create-source-bundle.js
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const VERSION = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; }
  catch { return '1.0.0'; }
})();

const STAGE = path.join(os.tmpdir(), `player-source-${VERSION}-${Date.now()}`);
const OUT_DIR = path.join(ROOT, 'dist');

const skipDirs = new Set(['node_modules', '.git', 'dist', 'dist-web', 'build', 'Others', '.opencode', '.claude', '.ai-agents', '__pycache__', '.vscode', '.idea', '.next', 'out']);
const skipFilePatterns = [/\.log$/, /\.tmp$/, /\.swp$/, /^Thumbs\.db$/, /^\.DS_Store$/];

function shouldSkip(p) {
  if (skipDirs.has(p)) return true;
  for (const re of skipFilePatterns) if (re.test(p)) return true;
  return false;
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) {
    for (const e of fs.readdirSync(p)) rmrf(path.join(p, e));
    fs.rmdirSync(p);
  } else fs.unlinkSync(p);
}

function copyFiltered(srcRoot, destRoot) {
  fs.mkdirSync(destRoot, { recursive: true });
  for (const entry of fs.readdirSync(srcRoot)) {
    if (shouldSkip(entry)) continue;
    const s = path.join(srcRoot, entry);
    const d = path.join(destRoot, entry);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyFiltered(s, d);
    else fs.copyFileSync(s, d);
  }
}

try {
  console.log('[stage]', STAGE);
  fs.mkdirSync(STAGE, { recursive: true });
  copyFiltered(ROOT, STAGE);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const base = `Player-${VERSION}-source`;
  const zipPath = path.join(OUT_DIR, `${base}.zip`);
  const tarPath = path.join(OUT_DIR, `${base}.tar.gz`);

  // zip
  if (process.platform === 'win32') {
    const stageParent = path.dirname(STAGE);
    const stageName = path.basename(STAGE);
    const cmd = `Compress-Archive -Path '${STAGE}\\*' -DestinationPath '${zipPath}' -Force`;
    console.log('[zip]', cmd);
    spawnSync('powershell', ['-NoProfile', '-Command', cmd], { stdio: 'inherit' });
  } else {
    spawnSync('zip', ['-r', zipPath, '.'], { cwd: STAGE, stdio: 'inherit' });
  }

  // tar.gz
  console.log('[tar]', tarPath);
  const stageParent = path.dirname(STAGE);
  const stageName = path.basename(STAGE);
  spawnSync('tar', ['-czf', tarPath, '-C', stageParent, stageName], { stdio: 'inherit' });

  // Rename tarball internal folder to Player-${VERSION}
  const tmpDir = path.join(os.tmpdir(), `player-rename-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  spawnSync('tar', ['-xzf', tarPath, '-C', tmpDir], { stdio: 'inherit' });
  const extracted = path.join(tmpDir, stageName);
  const renamed = path.join(tmpDir, `Player-${VERSION}`);
  if (fs.existsSync(renamed)) rmrf(renamed);
  fs.renameSync(extracted, renamed);
  fs.unlinkSync(tarPath);
  spawnSync('tar', ['-czf', tarPath, '-C', tmpDir, `Player-${VERSION}`], { stdio: 'inherit' });
  rmrf(tmpDir);

  // Sizes
  for (const f of [zipPath, tarPath]) {
    if (fs.existsSync(f)) {
      const mb = (fs.statSync(f).size / 1024 / 1024).toFixed(2);
      console.log(`  ${path.basename(f)}  ${mb} MB`);
    }
  }
  console.log('DONE');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  rmrf(STAGE);
}
