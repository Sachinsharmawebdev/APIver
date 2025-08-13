// lib/switch.js  (updated)
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const AdmZip = require('adm-zip');

const { decryptAndDecompress } = require('./utils/crypto');
const { applyPatch } = require('./utils/diff');

function readMeta(apiverRoot) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  if (!fs.existsSync(metaPath)) return { versions: {}, hotfixes: {} };
  return fs.readJsonSync(metaPath);
}

/**
 * Reconstructs a version from nearest full snapshot + patches.
 * If outputDir is provided we extract into it, otherwise into versions/active.
 */
module.exports = function switchVersion(versionName, outputDir = null) {
  // Commander passes its Command object as the last arg when called from CLI.
  if (outputDir && typeof outputDir !== 'string') {
    outputDir = null;              // ignore non-string values coming from commander
  }
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.APIver');
  const versionsDir = path.join(apiverRoot, 'versions');
  const activeDir = outputDir || path.join(cwd, 'versions', 'active');

  if (!fs.existsSync(versionsDir)) {
    console.error(chalk.red('No .APIver/versions folder found. Run init first.'));
    process.exit(1);
  }

  const meta = readMeta(apiverRoot);
  if (!meta.versions || !meta.versions[versionName]) {
    console.error(chalk.red(`Version "${versionName}" not found in meta.`));
    process.exit(1);
  }

  // Build chain from the version backwards to its nearest full snapshot
  const chain = [];
  let cur = versionName;
  while (cur) {
    const entry = meta.versions[cur];
    if (!entry) {
      console.error(chalk.red(`Meta entry missing for "${cur}" — corrupt meta.json`));
      process.exit(1);
    }
    chain.unshift(cur); // we'll have earliest -> ... -> version
    if (entry.type === 'full') break;
    cur = entry.base;
  }

  if (!chain.length) {
    console.error(chalk.red('Failed to construct reconstruction chain.'));
    process.exit(1);
  }

  // find the first (earliest) chain entry that is a full snapshot
  let fullIndex = -1;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const candidateFull = path.join(versionsDir, `${candidate}.full.apiver`);
    if (fs.existsSync(candidateFull)) {
      fullIndex = i;
      break;
    }
  }

  if (fullIndex === -1) {
    console.error(chalk.red('No full snapshot found in chain; cannot reconstruct.'));
    process.exit(1);
  }

  // Prepare output dir
  fs.emptyDirSync(activeDir);

  // Extract full snapshot
  const fullName = chain[fullIndex];
  const fullFile = path.join(versionsDir, `${fullName}.full.apiver`);
  const encFull = fs.readFileSync(fullFile);
  const zipBuffer = decryptAndDecompress(encFull);
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(activeDir, true);

  // Apply patches in order after fullIndex
  for (let i = fullIndex + 1; i < chain.length; i++) {
    const ver = chain[i];
    const patchFile = path.join(versionsDir, `${ver}.patch.apiver`);
    if (!fs.existsSync(patchFile)) {
      console.warn(chalk.yellow(`Patch file for ${ver} missing, skipping`));
      continue;
    }
    const encPatch = fs.readFileSync(patchFile);
    const patchBuf = decryptAndDecompress(encPatch);
    const patchObj = JSON.parse(patchBuf.toString('utf8'));
    applyPatch(activeDir, patchObj);
  }

  // Apply any hotfixes listed in meta.hotfixes[versionName]
  if (meta.hotfixes && Array.isArray(meta.hotfixes[versionName])) {
    for (const hfFilename of meta.hotfixes[versionName]) {
      const hfPath = path.join(versionsDir, 'hotfixes', hfFilename);
      if (!fs.existsSync(hfPath)) {
        console.warn(chalk.yellow(`Hotfix ${hfFilename} not found, skipping`));
        continue;
      }
      try {
        const enc = fs.readFileSync(hfPath);
        const buf = decryptAndDecompress(enc);
        const patchObj = JSON.parse(buf.toString('utf8'));
        console.log(chalk.cyan(`Applying hotfix ${hfFilename} ...`));
        applyPatch(activeDir, patchObj);
      } catch (err) {
        console.warn(chalk.yellow(`Failed to apply hotfix ${hfFilename}: ${err.message}`));
      }
    }
  }

  // ensure .version file exists in reconstructed tree
  fs.outputFileSync(path.join(activeDir, '.version'), versionName, 'utf8');

  if (!outputDir) {
    // Updated wording for test match
    console.log(chalk.green(`Switched to version: ${versionName}`));
  }
};
