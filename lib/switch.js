// lib/switch.js  (updated)
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk')

const { decryptAndDecompress } = require('./utils/crypto');
const { applyPatch } = require('./utils/diff');
const { reconstructDirectory } = require('./utils/fs-utils');

function readMeta(apiverRoot) {
  const metaPath = path.join(apiverRoot, 'meta.json');
  if (!fs.existsSync(metaPath)) return { versions: {}, hotfixes: {} };
  return fs.readJsonSync(metaPath);
}

/**
 * Reconstructs a version from nearest full snapshot + patches.
 * Files are reconstructed directly in their original paths like Git.
 */
module.exports = function switchVersion(versionName, outputDir = null) {
  // Commander passes its Command object as the last arg when called from CLI.
  if (outputDir && typeof outputDir !== 'string') {
    outputDir = null;              // ignore non-string values coming from commander
  }
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');
  const snapshotsRoot = path.join(apiverRoot, 'snapshots');
  const patchesRoot = path.join(apiverRoot, 'patches');
  const activeDir = outputDir || cwd; // Reconstruct directly in project root

  if (!fs.existsSync(apiverRoot)) {
    console.error(chalk.red('No .apiver folder found. Run init first.'));
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
    const candidateFull = path.join(snapshotsRoot, `${candidate}.full.apiver`); // Changed from versionsDir
    if (fs.existsSync(candidateFull)) {
      fullIndex = i;
      break;
    }
  }

  if (fullIndex === -1) {
    console.error(chalk.red('No full snapshot found in chain; cannot reconstruct.'));
    process.exit(1);
  }

  // Clean up existing source files (but preserve .apiver and node_modules)
  if (!outputDir) {
    const entries = fs.readdirSync(cwd);
    for (const entry of entries) {
      if (entry !== '.apiver' && entry !== 'node_modules' && entry !== '.git' && entry !== 'package.json' && entry !== 'package-lock.json') {
        fs.removeSync(path.join(cwd, entry));
      }
    }
  } else {
    fs.emptyDirSync(activeDir);
  }

  // Extract full snapshot
  const fullName = chain[fullIndex];
  const fullFile = path.join(snapshotsRoot, `${fullName}.full.apiver`); // Changed from versionsDir
  const encFull = fs.readFileSync(fullFile);
  const zipBuffer = decryptAndDecompress(encFull);
  // const zip = new AdmZip(zipBuffer);
  // zip.extractAllTo(activeDir, true);
  const snapshotData = JSON.parse(zipBuffer.toString('utf8')); // Parse JSON
  reconstructDirectory(activeDir, snapshotData); // Reconstruct directory

  // Apply patches in order after fullIndex
  for (let i = fullIndex + 1; i < chain.length; i++) {
    const ver = chain[i];
    const patchFile = path.join(patchesRoot, `${ver}.patch.apiver`); // Changed from versionsDir

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
      const hfPath = path.join(apiverRoot, 'hotfixes', hfFilename);
      if (!fs.existsSync(hfPath)) {
        console.warn(chalk.yellow(`Hotfix ${hfFilename} not found, skipping`));
        continue;
      }
      try {
        const enc = fs.readFileSync(hfPath);
        const buf = decryptAndDecompress(enc);
        const patchObj = JSON.parse(buf.toString('utf8'));
        // Remap patchObj changes to use full relative path if needed
        if (patchObj.changes && patchObj.changes.length) {
          // No remapping; use file path as in patchObj
          // patchObj.changes already has correct file path
        }
        console.log(chalk.cyan(`Applying hotfix ${hfFilename} ...`));
        applyPatch(activeDir, patchObj);
      } catch (err) {
        console.warn(chalk.yellow(`Failed to apply hotfix ${hfFilename}: ${err.message}`));
      }
    }

  }

  // Create .version file in .apiver directory to track current version
  fs.outputFileSync(path.join(apiverRoot, 'current-version'), versionName, 'utf8');

  if (!outputDir) {
    console.log(chalk.green(`Switched to version: ${versionName}`));
    console.log(chalk.cyan(`Files reconstructed in project root`));
  }
};
