
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const switchVersion = require('./switch');
const commit = require('./commit');

module.exports = function copyVersion(sourceVersion, targetVersion, opts = {}) {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');
  const metaPath = path.join(apiverRoot, 'meta.json');
  
  if (!fs.existsSync(metaPath)) {
    console.error('❌ meta.json not found. Run init first.');
    process.exit(1);
  }
  
  const meta = fs.readJsonSync(metaPath);
  if (!meta.versions[sourceVersion]) {
    console.error(`❌ Source version "${sourceVersion}" does not exist.`);
    process.exit(1);
  }
  if (!meta.versions[targetVersion]) {
    console.error(`❌ Target version "${targetVersion}" does not exist.`);
    process.exit(1);
  }

  // Git-like architecture: Switch to source version in project root
  switchVersion(sourceVersion);
  
  // Create new snapshot from current project root (which now has source version)
  const { createDirectorySnapshot } = require('./utils/fs-utils');
  const { encryptAndCompress } = require('./utils/crypto');
  
  const snapshotData = createDirectorySnapshot(cwd, ['.apiver', 'node_modules', '.git', 'package-lock.json']);
  const snapshotFile = path.join(apiverRoot, 'snapshots', `${targetVersion}.full.apiver`);
  const encrypted = encryptAndCompress(Buffer.from(JSON.stringify(snapshotData)));
  fs.writeFileSync(snapshotFile, encrypted);

  // Update meta.json to replace target version with copied content
  meta.versions[targetVersion] = { type: 'full', snapshot: `${targetVersion}.full.apiver` };
  if (!meta.hotfixes[targetVersion]) meta.hotfixes[targetVersion] = [];
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });

  // Switch to target version to show the copied content
  switchVersion(targetVersion);
  
  console.log(`✅ Copied code from ${sourceVersion} to ${targetVersion}`);
};
