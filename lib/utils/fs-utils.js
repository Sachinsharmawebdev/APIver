const fs = require('fs');
const path = require('path');

/**
 * Recursively reads a directory and returns a JSON object representing its contents.
 * Files are stored as base64 encoded strings.
 * @param {string} dirPath - The path to the directory to read.
 * @param {Array} excludePatterns - Array of patterns to exclude (e.g., ['.apiver', 'node_modules'])
 * @returns {object} A JSON object representing the directory structure and file contents.
 */
function generateCodeTree(dirPath, excludePatterns = []) {
  const tree = {};
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    // Skip excluded patterns
    if (excludePatterns.includes(file)) return;
    // Ignore system files/folders (0, 1, 2)
    if (["0", "1", "2"].includes(file)) return;
    
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      tree[file] = generateCodeTree(filePath, excludePatterns);
    } else {
      // Read file content and encode to base64
      const content = fs.readFileSync(filePath);
      tree[file] = content.toString('base64');
    }
  });

  return tree;
}

/**
 * Creates a directory snapshot (alias for generateCodeTree)
 */
function createDirectorySnapshot(dirPath, excludePatterns = []) {
  return generateCodeTree(dirPath, excludePatterns);
}

/**
 * Recursively reconstructs a directory from a JSON object representing its contents.
 * Files are decoded from base64 encoded strings.
 * @param {string} outputDir - The path to the directory where the content should be reconstructed.
 * @param {object} codeTree - A JSON object representing the directory structure and file contents.
 */
function reconstructDirectory(outputDir, codeTree) {
  for (const key in codeTree) {
    const itemPath = path.join(outputDir, key);
    const value = codeTree[key];

    if (typeof value === 'object') {
      // It's a directory
      fs.mkdirSync(itemPath, { recursive: true });
      reconstructDirectory(itemPath, value);
    } else {
      // It's a file, decode from base64 and write
      fs.writeFileSync(itemPath, Buffer.from(value, 'base64'));
    }
  }
}

module.exports = {
  generateCodeTree,
  createDirectorySnapshot,
  reconstructDirectory,
};