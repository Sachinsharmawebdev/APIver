const fs = require('fs');
const path = require('path');
const { decryptAndDecompress } = require('./utils/crypto');

// Memory cache for loaded versions
const versionCache = new Map();

/**
 * Convert nested snapshot data to flat code tree
 * @param {Object} snapshotData - Nested directory structure
 * @param {string} basePath - Current path prefix
 * @returns {Object} - Flat code tree
 */
function flattenSnapshotToCodeTree(snapshotData, basePath = '') {
  const codeTree = {};
  
  for (const [name, content] of Object.entries(snapshotData)) {
    const currentPath = basePath ? `${basePath}/${name}` : name;
    
    if (typeof content === 'string') {
      // This is a file - decode from base64
      const fileContent = Buffer.from(content, 'base64').toString('utf8');
      
      // Execute as Node.js module
      try {
        const module = { exports: {} };
        const exports = module.exports;
        const require = global.require;
        const __filename = currentPath;
        const __dirname = path.dirname(currentPath);
        
        // Create function and execute
        const moduleFunction = new Function('module', 'exports', 'require', '__filename', '__dirname', fileContent);
        moduleFunction(module, exports, require, __filename, __dirname);
        
        codeTree[currentPath] = module.exports;
      } catch (error) {
        // If execution fails, store as raw content
        codeTree[currentPath] = fileContent;
      }
    } else if (typeof content === 'object' && content !== null) {
      // This is a directory - recurse
      Object.assign(codeTree, flattenSnapshotToCodeTree(content, currentPath));
    }
  }
  
  return codeTree;
}

/**
 * Load version(s) from encrypted snapshots
 * @param {string|string[]} versions - Single version or array of versions to load
 * @returns {Object|Object[]} - Code tree(s) for the version(s)
 */
function loadVersion(versions) {
  // Handle array input
  if (Array.isArray(versions)) {
    // Handle empty array
    if (versions.length === 0) {
      return {};
    }
    
    const results = {};
    for (const version of versions) {
      results[version] = loadSingleVersion(version);
    }
    return results;
  }
  
  // Handle single version input
  return loadSingleVersion(versions);
}

/**
 * Load a single version from encrypted snapshot
 * @param {string} versionName - Version to load
 * @returns {Object} - Code tree for the version
 */
function loadSingleVersion(versionName) {
  // Check cache first
  if (versionCache.has(versionName)) {
    return versionCache.get(versionName);
  }

  const apiverDir = path.join(process.cwd(), '.apiver');
  const metaPath = path.join(apiverDir, 'meta.json');
  
  // Check if .apiver exists
  if (!fs.existsSync(metaPath)) {
    throw new Error('apiver meta not found. Run "npx apiver init" first.');
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  
  // Check if version exists
  if (!meta.versions || !meta.versions[versionName]) {
    throw new Error(`Version "${versionName}" not found.`);
  }

  try {
    // Reconstruct version using same logic as switch command
    const snapshotData = reconstructVersionData(versionName, meta, apiverDir);
    
    // Convert snapshot data to flat code tree
    const codeTree = flattenSnapshotToCodeTree(snapshotData);
    
    // Apply hotfixes if any
    const hotfixes = meta.hotfixes && meta.hotfixes[versionName] ? meta.hotfixes[versionName] : [];
    let finalCodeTree = { ...codeTree };
    
    for (const hotfixId of hotfixes) {
      const hotfixPath = path.join(apiverDir, 'hotfixes', `${hotfixId}.hotfix.apiver`);
      if (fs.existsSync(hotfixPath)) {
        const hotfixData = decryptAndDecompress(fs.readFileSync(hotfixPath));
        const hotfixPatch = JSON.parse(hotfixData);
        
        // Apply hotfix patch to code tree
        for (const [filePath, content] of Object.entries(hotfixPatch)) {
          finalCodeTree[filePath] = content;
        }
      }
    }
    
    // Cache the result
    versionCache.set(versionName, finalCodeTree);
    
    return finalCodeTree;
  } catch (error) {
    throw new Error(`Failed to load version "${versionName}": ${error.message}`);
  }
}

/**
 * Clear version cache (useful for testing)
 */
function clearCache() {
  versionCache.clear();
}

/**
 * Get cached version names
 */
function getCachedVersions() {
  return Array.from(versionCache.keys());
}

/**
 * Reconstruct version data from snapshots and patches (like switch command)
 * @param {string} versionName - Version to reconstruct
 * @param {Object} meta - Metadata object
 * @param {string} apiverDir - .apiver directory path
 * @returns {Object} - Reconstructed snapshot data
 */
function reconstructVersionData(versionName, meta, apiverDir) {
  const snapshotsRoot = path.join(apiverDir, 'snapshots');
  const patchesRoot = path.join(apiverDir, 'patches');
  
  // Build chain from the version backwards to its nearest full snapshot
  const chain = [];
  let cur = versionName;
  while (cur) {
    const entry = meta.versions[cur];
    if (!entry) {
      throw new Error(`Meta entry missing for "${cur}" — corrupt meta.json`);
    }
    chain.unshift(cur); // we'll have earliest -> ... -> version
    if (entry.type === 'full') break;
    cur = entry.base;
  }

  if (!chain.length) {
    throw new Error('Failed to construct reconstruction chain.');
  }

  // Find the first (earliest) chain entry that is a full snapshot
  let fullIndex = -1;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const candidateFull = path.join(snapshotsRoot, `${candidate}.full.apiver`);
    if (fs.existsSync(candidateFull)) {
      fullIndex = i;
      break;
    }
  }

  if (fullIndex === -1) {
    throw new Error('No full snapshot found in chain; cannot reconstruct.');
  }

  // Load full snapshot
  const fullName = chain[fullIndex];
  const fullFile = path.join(snapshotsRoot, `${fullName}.full.apiver`);
  const encFull = fs.readFileSync(fullFile);
  const zipBuffer = decryptAndDecompress(encFull);
  let snapshotData = JSON.parse(zipBuffer.toString('utf8'));

  // Apply patches in order after fullIndex using temporary directory
  for (let i = fullIndex + 1; i < chain.length; i++) {
    const ver = chain[i];
    const patchFile = path.join(patchesRoot, `${ver}.patch.apiver`);
    if (!fs.existsSync(patchFile)) {
      continue; // Skip missing patches
    }
    
    const encPatch = fs.readFileSync(patchFile);
    const patchBuf = decryptAndDecompress(encPatch);
    const patchObj = JSON.parse(patchBuf.toString('utf8'));

    // Apply patch using temporary directory approach
    snapshotData = applyPatchToSnapshotData(snapshotData, patchObj);
  }
  
  return snapshotData;
}

/**
 * Apply patch object to snapshot data structure
 * @param {Object} snapshotData - Current snapshot data
 * @param {Object} patchObj - Patch object with changes
 * @returns {Object} - Updated snapshot data
 */
function applyPatchToSnapshotData(snapshotData, patchObj) {
  const os = require('os');
  const { reconstructDirectory } = require('./utils/fs-utils');
  const { applyPatch } = require('./utils/diff');
  const { generateCodeTree } = require('./utils/fs-utils');
  
  // Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-patch-'));
  
  try {
    // Reconstruct snapshot data to temporary directory
    reconstructDirectory(tempDir, snapshotData);
    
    // Apply patch using existing applyPatch function
    applyPatch(tempDir, patchObj);
    
    // Convert back to snapshot data structure
    const updatedSnapshotData = generateCodeTree(tempDir, []);
    
    return updatedSnapshotData;
  } finally {
    // Clean up temporary directory
    try {
      fs.removeSync(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

module.exports = {
  loadVersion,
  clearCache,
  getCachedVersions
};