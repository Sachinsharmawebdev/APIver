const fs = require('fs');
const path = require('path');

/**
 * Recursively reads a directory and returns a JSON object representing its contents.
 * Files are stored as base64 encoded strings.
 * @param {string} dirPath - The path to the directory to read.
 * @returns {object} A JSON object representing the directory structure and file contents.
 */
function generateCodeTree(dirPath) {
  const tree = {};
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      tree[file] = generateCodeTree(filePath);
    } else {
      // Read file content and encode to base64
      const content = fs.readFileSync(filePath);
      tree[file] = content.toString('base64');
    }
  });

  return tree;
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
  reconstructDirectory,
};