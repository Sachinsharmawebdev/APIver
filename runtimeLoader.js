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
 * @returns {object} code tree
 */
function loadVersion(versionName) {
    if (memoryCache[versionName]) {
        return memoryCache[versionName];
    }

    const metaPath = path.join('.APIver', 'meta.json');
    if (!fs.existsSync(metaPath)) {
        throw new Error('APIver meta not found. Did you run `apiver init`?');
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const versionInfo = meta.versions[versionName];
    if (!versionInfo) {
        throw new Error(`Version ${versionName} not found`);
    }

    // Step 1: Load nearest snapshot
    let codeTree = {};
    if (versionInfo.snapshot) {
        const snapFile = path.join('.APIver', 'snapshots', versionInfo.snapshot);
        if (!fs.existsSync(snapFile)) {
            throw new Error(`Snapshot file not found: ${versionInfo.snapshot}`);
        }
        const decryptedSnapshot = readDecryptedFile(snapFile);
        codeTree = JSON.parse(decryptedSnapshot);
    } else {
        throw new Error(`No snapshot found for version ${versionName}`);
    }

    // Step 2: Apply patches after snapshot
    const patchesToApply = versionInfo.patchesAfterSnapshot || [];
    patchesToApply.forEach(patchId => {
        const patchFile = path.join('.APIver', 'patches', patchId);
        if (!fs.existsSync(patchFile)) {
            throw new Error(`Patch file not found: ${patchId}`);
        }
        const patchData = readDecryptedFile(patchFile);
        codeTree = applyPatch(codeTree, JSON.parse(patchData));
    });

    // Step 3: Cache in memory
    memoryCache[versionName] = codeTree;
    return codeTree;
}

module.exports = { loadVersion };