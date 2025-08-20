const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');
const { encryptAndCompress } = require('./utils/crypto');
const { createDirectorySnapshot } = require('./utils/fs-utils');

module.exports = function init(version) {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');
  
  // Create only essential directories (NO versions/active workspace)
  const snapshotsDir = path.join(apiverRoot, 'snapshots');
  const patchesDir = path.join(apiverRoot, 'patches');
  const hotfixesDir = path.join(apiverRoot, 'hotfixes');
  
  fs.ensureDirSync(snapshotsDir);
  fs.ensureDirSync(patchesDir);
  fs.ensureDirSync(hotfixesDir);

  // Check if version already exists in meta
  const metaPath = path.join(apiverRoot, 'meta.json');
  let meta = { versions: {}, hotfixes: {} };
  if (fs.existsSync(metaPath)) {
    meta = fs.readJsonSync(metaPath);
    if (meta.versions[version]) {
      console.log(chalk.red(`Version ${version} already exists.`));
      process.exit(1);
    }
  }

  // Create snapshot from current project files (excluding .apiver, node_modules, etc.)
  const snapshotData = createDirectorySnapshot(cwd, ['.apiver', 'node_modules', '.git', 'package-lock.json']);
  
  // Track current version
  fs.writeFileSync(path.join(apiverRoot, 'current-version'), version, 'utf-8');
  
  const snapshotFile = path.join(snapshotsDir, `${version}.full.apiver`);
  const encrypted = encryptAndCompress(Buffer.from(JSON.stringify(snapshotData)));
  fs.writeFileSync(snapshotFile, encrypted);

  // Update meta.json
  meta.versions[version] = { type: 'full', snapshot: `${version}.full.apiver` };
  meta.hotfixes[version] = [];
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });

  console.log(chalk.green(`✅ Initialized APIver with version ${version}`));
  console.log(chalk.cyan(`📁 Snapshot created from project files`));
  console.log(chalk.yellow(`💡 Edit files directly in project root, then commit changes`));
};