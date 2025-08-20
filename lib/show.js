const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { decryptAndDecompress } = require('./utils/crypto');

/**
 * Show patch details
 * @param {string} patchId - ID of the patch to show
 */
function showPatch(patchId) {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');
  const patchesRoot = path.join(apiverRoot, 'patches');
  const metaPath = path.join(apiverRoot, 'meta.json');
  
  if (!fs.existsSync(metaPath)) {
    console.error(chalk.red('No .APIver/meta.json found. Run init first.'));
    process.exit(1);
  }

  // Find the patch file
  let patchFile = null;
  const patchFiles = fs.readdirSync(patchesRoot, { withFileTypes: true })
    .filter(entry => !entry.isDirectory() && entry.name.endsWith('.patch.apiver'))
    .map(entry => entry.name);

  // Check if the patchId is a full filename or just an ID
  if (patchFiles.includes(`${patchId}.patch.apiver`)) {
    patchFile = path.join(patchesRoot, `${patchId}.patch.apiver`);
  } else {
    // Look for patch ID in the filename
    for (const file of patchFiles) {
      if (file.includes(patchId)) {
        patchFile = path.join(patchesRoot, file);
        break;
      }
    }
  }

  // Also check hotfixes
  if (!patchFile) {
    const hotfixesDir = path.join(apiverRoot, 'hotfixes');
    if (fs.existsSync(hotfixesDir)) {
      const hotfixFiles = fs.readdirSync(hotfixesDir, { withFileTypes: true })
        .filter(entry => !entry.isDirectory())
        .map(entry => entry.name);
      
      for (const file of hotfixFiles) {
        if (file.includes(patchId)) {
          patchFile = path.join(hotfixesDir, file);
          break;
        }
      }
    }
  }

  if (!patchFile) {
    console.error(chalk.red(`Patch with ID "${patchId}" not found.`));
    process.exit(1);
  }

  try {
    const encPatch = fs.readFileSync(patchFile);
    const patchBuf = decryptAndDecompress(encPatch);
    const patchObj = JSON.parse(patchBuf.toString('utf8'));

    // Find associated versions
    const associatedVersions = [];
    const meta = fs.readJsonSync(metaPath);
    // Check versions
    for (const [ver, info] of Object.entries(meta.versions || {})) {
      if (info.patchesAfterSnapshot && info.patchesAfterSnapshot.includes(path.basename(patchFile))) {
        associatedVersions.push(ver);
      }
      if (info.snapshot && info.snapshot === path.basename(patchFile)) {
        associatedVersions.push(ver);
      }
    }
    // Check hotfixes
    for (const [ver, hotfixArr] of Object.entries(meta.hotfixes || {})) {
      if (hotfixArr && hotfixArr.includes(path.basename(patchFile))) {
        associatedVersions.push(ver + ' (hotfix)');
      }
    }
    console.log(chalk.cyan(`\nPatch: ${path.basename(patchFile)}`));
    if (associatedVersions.length > 0) {
      console.log(chalk.magenta(`Associated version(s): ${associatedVersions.join(', ')}`));
    } else {
      console.log(chalk.magenta('Associated version(s): (none found)'));
    }
    
    // Display changes
    if (patchObj.changes && patchObj.changes.length > 0) {
      console.log(chalk.yellow('Changes:'));
      patchObj.changes.forEach(change => {
        console.log(chalk.green(`  File: ${change.file}`));
        console.log(chalk.white(`  Diff:\n${change.diff}\n`));
      });
    }
    
    // Display deletes
    if (patchObj.deletes && patchObj.deletes.length > 0) {
      console.log(chalk.yellow('Deleted Files:'));
      patchObj.deletes.forEach(file => {
        console.log(chalk.red(`  ${file}`));
      });
    }
    
  } catch (err) {
    console.error(chalk.red(`Error reading patch: ${err.message}`));
    process.exit(1);
  }
}

module.exports = showPatch;