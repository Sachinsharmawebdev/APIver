// lib/new.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const switchVersion = require('./switch');

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
  // commander style: args arrive as (version, 'from', baseVersion)
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.APIver');
  const versionsDir = path.join(apiverRoot, 'versions');
  const activeDir = path.join(cwd, 'versions', 'active');

  if (!baseVersion) {
    console.error(chalk.red('Usage: npx apiver new <version> from <baseVersion>'));
    process.exit(1);
  }

  fs.ensureDirSync(apiverRoot);
  fs.ensureDirSync(versionsDir);
  fs.ensureDirSync(activeDir);

  const meta = readMeta(apiverRoot);
  if (!meta.versions) meta.versions = {};
  if (!meta.hotfixes) meta.hotfixes = {};

  // Ensure base exists in meta (or as a file)
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
  // hotfixes array empty
  meta.hotfixes[versionName] = [];

  writeMeta(apiverRoot, meta);

  // Reconstruct base into active, then set .version to new version
  try {
    // switch will extract base into versions/active
    switchVersion(baseVersion, activeDir);
  } catch (err) {
    console.error(chalk.red(`Failed to reconstruct base ${baseVersion}:`), err);
    process.exit(1);
  }

  // set .version so developer can edit active as new version
  fs.writeFileSync(path.join(activeDir, '.version'), versionName, 'utf8');
  // Adjusted message to include the exact substring the tests look for (colon, no quotes)
  console.log(chalk.green(`Created new version: ${versionName} from ${baseVersion}. Active working copy is ready.`));
};
