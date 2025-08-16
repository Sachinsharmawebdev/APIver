const fs = require('fs-extra');
const path = require('path');
const switchVersion = require('./switch');
const commit = require('./commit');

module.exports = function copyVersion(sourceVersion, targetVersion) {
  const cwd = process.cwd();
  const activeDir = path.join(cwd, 'versions', 'active');

  // Load meta
  const metaPath = path.join(cwd, '.APIver', 'meta.json');
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

  // Switch sourceVersion into active
  switchVersion(sourceVersion, activeDir);

  // Set active as targetVersion
  fs.writeFileSync(path.join(activeDir, '.version'), targetVersion, 'utf8');

  // Commit targetVersion with sourceVersion content
  commit(`Updated ${targetVersion} from ${sourceVersion}`);

  console.log(`✅ Copied code from ${sourceVersion} to ${targetVersion}`);
};
