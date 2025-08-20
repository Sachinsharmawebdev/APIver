const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const diffUtils = require('./utils/diff');

/**
 * Compare differences between two versions
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 */
function diffVersions(version1, version2) {
  const cwd = process.cwd();
  const metaPath = path.join(cwd, '.apiver', 'meta.json');
  
  if (!fs.existsSync(metaPath)) {
    console.error('❌ meta.json not found. Run init first.');
    process.exit(1);
  }

  const meta = fs.readJsonSync(metaPath);
  
  // Check if versions exist
  if (!meta.versions[version1]) {
    console.error(`❌ Version "${version1}" does not exist.`);
    process.exit(1);
  }
  
  if (!meta.versions[version2]) {
    console.error(`❌ Version "${version2}" does not exist.`);
    process.exit(1);
  }

  // Create temporary directories for both versions
  const tempDir1 = path.join(cwd, '.apiver', 'temp', version1);
  const tempDir2 = path.join(cwd, '.apiver', 'temp', version2);
  
  // Ensure temp directories exist and are empty
  fs.emptyDirSync(tempDir1);
  fs.emptyDirSync(tempDir2);

  try {
    // Load both versions into temp directories
    console.log(`📊 Loading ${version1}...`);
  require('./switch')(version1, tempDir1);
    
    console.log(`📊 Loading ${version2}...`);
  require('./switch')(version2, tempDir2);
    
    // Compare directories
    console.log(`\n📋 Comparing ${version1} with ${version2}:\n`);
    const differences = diffUtils.compareDirectories(tempDir1, tempDir2);
    
    if (differences.length === 0) {
      console.log(chalk.green('✓ No differences found between versions'));
    } else {
      differences.forEach(diff => {
        if (diff.type === 'added') {
          console.log(chalk.green(`+ Added: ${diff.path}`));
        } else if (diff.type === 'removed') {
          console.log(chalk.red(`- Removed: ${diff.path}`));
        } else if (diff.type === 'modified') {
          console.log(chalk.yellow(`~ Modified: ${diff.path}`));
          if (diff.changes) {
            console.log(chalk.gray(`  ${diff.changes.additions} additions, ${diff.changes.deletions} deletions`));
          }
          // Print unified diff for modified files
          const file1 = path.join(tempDir1, diff.path);
          const file2 = path.join(tempDir2, diff.path);
          const content1 = fs.existsSync(file1) ? fs.readFileSync(file1, 'utf8') : '';
          const content2 = fs.existsSync(file2) ? fs.readFileSync(file2, 'utf8') : '';
          const patchText = require('diff').createTwoFilesPatch(diff.path, diff.path, content1, content2, version1, version2);
          console.log(patchText);
        }
      });
    }
  } finally {
    // Clean up temp directories
  fs.removeSync(path.join(cwd, '.apiver', 'temp'));
  }
}

module.exports = diffVersions;