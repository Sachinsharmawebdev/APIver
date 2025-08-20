// lib/new.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const switchVersion = require('./switch');
const { generateCodeTree } = require('./utils/fs-utils');
const { encryptAndCompress } = require('./utils/crypto');

function readMeta(apiverRoot) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  if (!fs.existsSync(metaPath)) return { versions: {}, hotfixes: {} };
  return fs.readJsonSync(metaPath);
}

function writeMeta(apiverRoot, meta) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });
}

/**
 * new <version> from <baseVersion>
 */
module.exports = function newVersion(versionName, fromKeyword, baseVersion) {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');

  if (!baseVersion) {
    console.error(chalk.red('Usage: npx apiver new <version> from <baseVersion>'));
    process.exit(1);
  }

  // Create only essential directories (NO versions/active workspace)
  const snapshotsDir = path.join(apiverRoot, 'snapshots');
  const patchesDir = path.join(apiverRoot, 'patches');
  const hotfixesDir = path.join(apiverRoot, 'hotfixes');
  
  fs.ensureDirSync(snapshotsDir);
  fs.ensureDirSync(patchesDir);
  fs.ensureDirSync(hotfixesDir);

  const meta = readMeta(apiverRoot);
  if (!meta.versions) meta.versions = {};
  if (!meta.hotfixes) meta.hotfixes = {};

  // Ensure base exists in meta
  if (meta.versions[baseVersion] === undefined) {
    console.error(chalk.red(`Base version "${baseVersion}" not found in meta. Create it first.`));
    process.exit(1);
  }

  if (meta.versions[versionName]) {
    console.error(chalk.red(`Version "${versionName}" already exists.`));
    process.exit(1);
  }

  // Add version entry to meta (patch by default)
  meta.versions[versionName] = { base: baseVersion, type: 'patch' };
  meta.hotfixes[versionName] = [];

  writeMeta(apiverRoot, meta);

  // Switch to base version (reconstruct files in project root)
  try {
    switchVersion(baseVersion);
  } catch (err) {
    console.error(chalk.red(`Failed to reconstruct base ${baseVersion}:`), err);
    process.exit(1);
  }

  // Set current version to new version
  fs.writeFileSync(path.join(apiverRoot, 'current-version'), versionName, 'utf8');

  console.log(chalk.green(`Created new version: ${versionName} from ${baseVersion}`));
  console.log(chalk.cyan(`Files from ${baseVersion} are now in project root - edit them directly and commit changes`));
};