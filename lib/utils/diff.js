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
 */
function walkRelative(dir, base = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkRelative(full, base).forEach(sub => results.push(path.join(e.name, sub)));
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

module.exports = {
  listFilesRecursive,
  walkRelative,
  compareDirectories,
  generatePatch,
  applyPatch
};

/**
 * Generate patch object comparing baseDir -> newDir
 * returns { changes: [ { file: 'path', diff: 'unified-diff-text' } ], deletes: ['path'] }
 */
function generatePatch(baseDir, newDir) {
  const patch = { changes: [], deletes: [] };

  // if baseDir doesn't exist, treat as empty
  const baseFiles = fs.existsSync(baseDir) ? walkRelative(baseDir) : [];
  const newFiles = fs.existsSync(newDir) ? walkRelative(newDir) : [];

  // detect deletes
  baseFiles.forEach(f => {
    if (!newFiles.includes(f)) patch.deletes.push(f);
  });

  // detect new or changed files
  newFiles.forEach(f => {
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
  // apply deletes first
  (patchObj.deletes || []).forEach(rel => {
    const p = path.join(baseDir, rel);
    if (fs.existsSync(p)) fs.removeSync(p);
  });

  // apply changes
  (patchObj.changes || []).forEach(change => {
    const target = path.join(baseDir, change.file);
    const oldContent = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    // parse patch and apply (diff.applyPatch expects patch text, but returns new string)
    const applied = diff.applyPatch(oldContent, change.diff);
    // if applyPatch returns false -> the patch failed
    if (applied === false) {
      throw new Error(`Failed to apply patch for file ${change.file}`);
    }
    fs.ensureDirSync(path.dirname(target));
    fs.writeFileSync(target, applied, 'utf8');
  });
}

module.exports = { generatePatch, applyPatch };
