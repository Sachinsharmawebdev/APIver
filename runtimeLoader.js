const fs = require('fs');
const path = require('path');
const { applyPatch } = require('./lib/utils/diff');
const { decryptAndDecompress } = require('./lib/utils/crypto');

const memoryCache = {};

/**
 * Read a file from disk, decrypt and decompress it into string
 * @param {string} filePath
 * @returns {string} decrypted file content
 */
function readDecryptedFile(filePath) {
    const encrypted = fs.readFileSync(filePath);
    return decryptAndDecompress(encrypted).toString('utf8');
}

/**
 * Load a version entirely into memory
 * @param {string} versionName - version ID (e.g., v1, v2)
 * @returns {object} code tree with executable modules
 */
function loadVersion(versionName) {
    if (memoryCache[versionName]) {
        return memoryCache[versionName];
    }

    const metaPath = path.join('.apiver', 'meta.json');
    if (!fs.existsSync(metaPath)) {
        throw new Error('apiver meta not found. Did you run `apiver init`?');
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const versionInfo = meta.versions[versionName];
    if (!versionInfo) {
        throw new Error(`Version ${versionName} not found`);
    }

    // Step 1: Find and load nearest snapshot by traversing the version chain
    let rawCodeTree = {};
    let currentVersion = versionName;
    let snapshotFound = false;
    
    // Build chain from current version back to a version with a snapshot
    const versionChain = [];
    while (currentVersion && !snapshotFound) {
        const currentInfo = meta.versions[currentVersion];
        if (!currentInfo) {
            throw new Error(`Version info not found for ${currentVersion}`);
        }
        
        versionChain.unshift(currentVersion);
        
        if (currentInfo.snapshot) {
            const snapFile = path.join('.apiver', 'snapshots', currentInfo.snapshot);
            if (fs.existsSync(snapFile)) {
                const decryptedSnapshot = readDecryptedFile(snapFile);
                rawCodeTree = JSON.parse(decryptedSnapshot);
                snapshotFound = true;
                break;
            }
        }
        
        currentVersion = currentInfo.base;
    }
    
    if (!snapshotFound) {
        throw new Error(`No snapshot found in version chain for ${versionName}`);
    }

    // Step 2: Apply patches for each version in the chain after the snapshot
    const snapshotVersionIndex = versionChain.findIndex(v => meta.versions[v].snapshot);
    
    for (let i = snapshotVersionIndex; i < versionChain.length; i++) {
        const version = versionChain[i];
        const versionInfo = meta.versions[version];
        const patchesToApply = versionInfo.patchesAfterSnapshot || [];
        
        patchesToApply.forEach(patchId => {
            const patchFile = path.join('.apiver', 'patches', patchId);
            if (!fs.existsSync(patchFile)) {
                console.warn(`Patch file not found: ${patchId}`);
                return;
            }
            const patchData = readDecryptedFile(patchFile);
            const patchObj = JSON.parse(patchData);
            
            // Apply patches to raw code tree
            (patchObj.changes || []).forEach(change => {
                if (change.file && change.diff) {
                    const oldContent = rawCodeTree[change.file] ? 
                        Buffer.from(rawCodeTree[change.file], 'base64').toString('utf8') : '';
                    const diff = require('diff');
                    const newContent = diff.applyPatch(oldContent, change.diff);
                    if (newContent !== false) {
                        rawCodeTree[change.file] = Buffer.from(newContent, 'utf8').toString('base64');
                    }
                }
            });
            
            (patchObj.deletes || []).forEach(filePath => {
                delete rawCodeTree[filePath];
            });
        });
    }

    // Step 3: Flatten nested directory structure and convert to executable modules
    const executableCodeTree = {};
    
    function flattenCodeTree(obj, basePath = '') {
        Object.keys(obj).forEach(key => {
            const fullPath = basePath ? `${basePath}/${key}` : key;
            const value = obj[key];
            
            if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
                // It's a directory, recurse
                flattenCodeTree(value, fullPath);
            } else {
                // It's a file (base64 encoded)
                if (fullPath.endsWith('.js')) {
                    const code = Buffer.from(value, 'base64').toString('utf8');
                    try {
                        // Create a module context and evaluate the code
                        const moduleExports = {};
                        const moduleObj = { exports: moduleExports };
                        const func = new Function('module', 'exports', 'require', code);
                        func(moduleObj, moduleExports, require);
                        executableCodeTree[fullPath] = moduleObj.exports;
                    } catch (err) {
                        console.warn(`Failed to load module ${fullPath}:`, err.message);
                        executableCodeTree[fullPath] = null;
                    }
                } else {
                    executableCodeTree[fullPath] = Buffer.from(value, 'base64').toString('utf8');
                }
            }
        });
    }
    
    flattenCodeTree(rawCodeTree);

    // Step 4: Cache in memory
    memoryCache[versionName] = executableCodeTree;
    return executableCodeTree;
}

/**
 * Clear memory cache (useful for testing)
 */
function clearCache() {
  Object.keys(memoryCache).forEach(key => {
    delete memoryCache[key];
  });
}

module.exports = { loadVersion, clearCache };