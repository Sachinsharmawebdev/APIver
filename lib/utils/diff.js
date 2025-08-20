// utils/diff.js
const fs = require('fs-extra');
const path = require('path');
const diff = require('diff');
const chalk = require('chalk');

/**
 * Recursively list files in dir returning relative paths
 */
function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(full).map(p => path.join(entry.name, p));
    } else {
      return [entry.name];
    }
  });
}

/**
 * Walk dir producing all file relative paths (handles nested directories)
 * @param {string} dir - Directory to walk
 * @param {string} base - Base directory for relative paths
 * @param {Array} excludePatterns - Array of patterns to exclude
 */
function walkRelative(dir, base = dir, excludePatterns = []) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(e => {
    // Skip excluded patterns
    if (excludePatterns.includes(e.name)) return;
    
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkRelative(full, base, excludePatterns).forEach(sub => results.push(sub));
    } else {
      results.push(path.relative(base, full));
    }
  });
  return results;
}

/**
 * Compare two directories and return differences
 * @param {string} dir1 - First directory
 * @param {string} dir2 - Second directory
 * @returns {Array} Array of differences
 */
function compareDirectories(dir1, dir2) {
  const files1 = walkRelative(dir1);
  const files2 = walkRelative(dir2);
  
  const differences = [];
  
  // Find files in dir1 that are not in dir2 or are modified
  files1.forEach(file => {
    const path1 = path.join(dir1, file);
    const path2 = path.join(dir2, file);
    
    if (!fs.existsSync(path2)) {
      differences.push({ type: 'removed', path: file });
    } else {
      const content1 = fs.readFileSync(path1, 'utf8');
      const content2 = fs.readFileSync(path2, 'utf8');
      
      if (content1 !== content2) {
        const diffResult = diff.diffLines(content1, content2);
        let additions = 0;
        let deletions = 0;
        
        diffResult.forEach(part => {
          if (part.added) additions += part.count;
          if (part.removed) deletions += part.count;
        });
        
        differences.push({
          type: 'modified',
          path: file,
          changes: { additions, deletions }
        });
      }
    }
  });
  
  // Find files in dir2 that are not in dir1
  files2.forEach(file => {
    const path1 = path.join(dir1, file);
    
    if (!fs.existsSync(path1)) {
      differences.push({ type: 'added', path: file });
    }
  });
  
  return differences;
}

// Export all utility functions
module.exports = {
  listFilesRecursive,
  walkRelative,
  compareDirectories,
  generatePatch,
  applyPatch
};

/**
 * Generate patch object comparing baseDir -> newDir
 * @param {string} baseDir - Base directory path
 * @param {string} newDir - New directory path
 * @param {Array} excludePatterns - Array of patterns to exclude
 * @returns {object} Patch object with changes and deletes
 */
function generatePatch(baseDir, newDir, excludePatterns = []) {
  const patch = { changes: [], deletes: [] };

  // if baseDir doesn't exist, treat as empty
  const baseFiles = fs.existsSync(baseDir) ? walkRelative(baseDir, baseDir, excludePatterns) : [];
  const newFiles = fs.existsSync(newDir) ? walkRelative(newDir, newDir, excludePatterns) : [];
  


  // detect deletes, ignore .version
  baseFiles.forEach(f => {
    if (f === '.version') return;
    if (!newFiles.includes(f)) patch.deletes.push(f);
  });

  // detect new or changed files, ignore .version
  newFiles.forEach(f => {
    if (f === '.version') return;
    const newFilePath = path.join(newDir, f);
    const baseFilePath = path.join(baseDir, f);

    const newContent = fs.readFileSync(newFilePath, 'utf8');
    const oldContent = fs.existsSync(baseFilePath) ? fs.readFileSync(baseFilePath, 'utf8') : '';

    if (oldContent !== newContent) {
      // create a unified diff
      const patchText = diff.createTwoFilesPatch(f, f, oldContent, newContent, '', '');
      patch.changes.push({ file: f, diff: patchText });
    }
  });

  return patch;
}

/**
 * Apply patch object into baseDir in-place
 */

function applyPatch(baseDir, patchObj) {
  // apply deletes first, ignore .version
  (patchObj.deletes || []).forEach(rel => {
    if (rel === '.version') return;
    const p = path.join(baseDir, rel);
    if (fs.existsSync(p)) fs.removeSync(p);
  });

  // apply changes, ignore .version
        (patchObj.changes || []).forEach(change => {
    if (change.file === '.version') return;
            const target = path.join(baseDir, change.file);
            const oldContent = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
            const patched = diff.applyPatch(oldContent, change.diff, { filename: change.file });
            if (patched === false) {
              throw new Error(`Failed to apply patch for file ${change.file}`);
            }
            fs.ensureDirSync(path.dirname(target));
            fs.writeFileSync(target, patched, 'utf8');
  });
}

module.exports = {
  listFilesRecursive,
  walkRelative,
  compareDirectories,
  generatePatch,
  applyPatch
};
