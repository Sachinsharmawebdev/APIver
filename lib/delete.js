const fs = require('fs-extra');
const path = require('path');

module.exports = function deleteVersion(version) {
  const cwd = process.cwd();
  const metaPath = path.join(cwd, '.apiver', 'meta.json');
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
  const versionDir = path.join(cwd, '.apiver', 'versions', version);
  if (fs.existsSync(versionDir)) fs.removeSync(versionDir);

  // Delete snapshot
  const snapFile = path.join(cwd, '.apiver', 'snapshots', `${version}.full.apiver`);
  if (fs.existsSync(snapFile)) fs.removeSync(snapFile);

  // Delete all patch files for this version
  const patchesDir = path.join(cwd, '.apiver', 'patches');
  if (fs.existsSync(patchesDir)) {
    fs.readdirSync(patchesDir).forEach(file => {
      if (file.startsWith(version) || file.includes(`${version}.patch`)) {
        fs.removeSync(path.join(patchesDir, file));
      }
    });
  }

  // Delete hotfixes for this version
  if (meta.hotfixes && meta.hotfixes[version]) {
    meta.hotfixes[version].forEach(hotfixFile => {
      const hotfixPath = path.join(patchesDir, hotfixFile);
      if (fs.existsSync(hotfixPath)) fs.removeSync(hotfixPath);
    });
    delete meta.hotfixes[version];
  }

  // Remove from meta
  delete meta.versions[version];
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });

  console.log(`✅ Version "${version}" deleted successfully.`);
};
