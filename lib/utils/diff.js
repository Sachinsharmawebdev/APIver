// utils/diff.js
const fs = require('fs-extra');
const path = require('path');
const diff = require('diff');

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
