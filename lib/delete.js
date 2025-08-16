const fs = require('fs-extra');
const path = require('path');

module.exports = function deleteVersion(version) {
  const cwd = process.cwd();
  const metaPath = path.join(cwd, '.APIver', 'meta.json');
  if (!fs.existsSync(metaPath)) {
    console.error('❌ meta.json not found.');
    process.exit(1);
  }

  const meta = fs.readJsonSync(metaPath);

  if (!meta.versions[version]) {
    console.error(`❌ Version "${version}" does not exist.`);
    process.exit(1);
  }

  // Check if version is used as base
  const inUse = Object.values(meta.versions).some(v => v.base === version);
  if (inUse) {
    console.error('❌ Deletion not allowed, this version is in use as a base.');
    process.exit(1);
  }

  // Delete version folder
  const versionDir = path.join(cwd, '.APIver', 'versions', version);
  if (fs.existsSync(versionDir)) fs.removeSync(versionDir);

  // Delete snapshots/patches
  const snapFile = path.join(cwd, '.APIver', 'snapshots', `${version}.full.apiver`);
  if (fs.existsSync(snapFile)) fs.removeSync(snapFile);

  const patchFile = path.join(cwd, '.APIver', 'patches', `${version}.patch.apiver`);
  if (fs.existsSync(patchFile)) fs.removeSync(patchFile);

  // Remove from meta
  delete meta.versions[version];
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });

  console.log(`✅ Version "${version}" deleted successfully.`);
};
