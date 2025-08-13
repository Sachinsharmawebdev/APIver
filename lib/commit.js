// lib/commit.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const AdmZip = require('adm-zip');

const { encryptAndCompress } = require('./utils/crypto');
const { generatePatch } = require('./utils/diff');
const switchVersion = require('./switch');

const FULL_SNAPSHOT_INTERVAL = 5; // tweak as needed

function readMeta(apiverRoot) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  if (!fs.existsSync(metaPath)) return { versions: {} };
  return fs.readJsonSync(metaPath);
}
function writeMeta(apiverRoot, meta) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  fs.writeJsonSync(metaPath, meta, { spaces: 2 });
}

module.exports = function commitCmd(message = '') {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.APIver');
  const versionsDir = path.join(apiverRoot, 'versions');
  const activeDir = path.join(cwd, 'versions', 'active');

  if (!fs.existsSync(activeDir)) {
    console.error(chalk.red('No active working copy found. Use apiver switch or init.'));
    process.exit(1);
  }

  const versionMetaFile = path.join(activeDir, '.version');
  if (!fs.existsSync(versionMetaFile)) {
    console.error(chalk.red('Active working copy missing .version metadata.'));
    process.exit(1);
  }

  const versionName = fs.readFileSync(versionMetaFile, 'utf8').trim();
  if (!versionName) {
    console.error(chalk.red('.version file is empty.'));
    process.exit(1);
  }

  fs.ensureDirSync(versionsDir);
  fs.ensureDirSync(apiverRoot);

  const meta = readMeta(apiverRoot);
  if (!meta.versions) meta.versions = {};

  // Determine base (if present)
  const allVersions = Object.keys(meta.versions);
  const lastVersion = allVersions.length ? allVersions[allVersions.length - 1] : null;

  // If this version already exists in meta, use that info, otherwise assume user created it via 'new'
  const existing = meta.versions[versionName];

  const versionIndex = allVersions.length + 1; // naive index for interval decisions
  const shouldFull = !existing ? (versionIndex % FULL_SNAPSHOT_INTERVAL === 0) : (meta.versions[versionName].type === 'full');

  if (!existing) {
    // If new version not present, set base=lastVersion (if any)
    meta.versions[versionName] = lastVersion ? { base: lastVersion, type: shouldFull ? 'full' : 'patch' } : { type: 'full' };
  }

  // Create a full snapshot
  if (shouldFull) {
    const zip = new AdmZip();
    zip.addLocalFolder(activeDir);
    const buffer = zip.toBuffer();
    const enc = encryptAndCompress(buffer);
    const outFile = path.join(versionsDir, `${versionName}.full.apiver`);
    fs.writeFileSync(outFile, enc);
    meta.versions[versionName].type = 'full';
    console.log(chalk.green(`Created full snapshot for ${versionName}`));
  } else {
    // create patch by reconstructing its base version into a temp dir
    const baseVersion = meta.versions[versionName].base || lastVersion;
    if (!baseVersion) {
      // no base -> fallback to full
      const zip = new AdmZip();
      zip.addLocalFolder(activeDir);
      const buffer = zip.toBuffer();
      const enc = encryptAndCompress(buffer);
      const outFile = path.join(versionsDir, `${versionName}.full.apiver`);
      fs.writeFileSync(outFile, enc);
      meta.versions[versionName].type = 'full';
      console.log(chalk.green(`No base found, created full snapshot for ${versionName}`));
    } else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `apiver-${versionName}-`));
      try {
        // reconstruct base into tmp using switch (outputDir param)
        switchVersion(baseVersion, tmp);

        // generate patch between tmp (base) and activeDir
        const patchObj = generatePatch(tmp, activeDir);
        const patchBuffer = Buffer.from(JSON.stringify(patchObj), 'utf8');
        const encPatch = encryptAndCompress(patchBuffer);
        fs.writeFileSync(path.join(versionsDir, `${versionName}.patch.apiver`), encPatch);

        meta.versions[versionName].type = 'patch';
        meta.versions[versionName].base = baseVersion;

        console.log(chalk.green(`Created patch for ${versionName} (base: ${baseVersion})`));
      } finally {
        try { fs.removeSync(tmp); } catch (e) { /* ignore */ }
      }
    }
  }

  writeMeta(apiverRoot, meta);
  // NEW generic notice required by tests
  console.log(chalk.green('Committed changes'));
  // Existing detailed notice retained
  console.log(chalk.blue(`Committed ${versionName}${message ? ` — ${message}` : ''}`));
};
