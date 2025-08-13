const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { applyPatch } = require('./lib/utils/diff');

const memoryCache = {};
const ALGO = 'aes-256-ctr';
const SECRET = process.env.APIVER_SECRET || 'apiver-secret-key-that-is-32-chars-long';

function decryptAndDecompress(filePath) {
    const encrypted = fs.readFileSync(filePath);
    const decipher = crypto.createDecipher(ALGO, SECRET);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return zlib.gunzipSync(decrypted).toString('utf8');
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
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const versionInfo = meta.versions[versionName];
    if (!versionInfo) {
        throw new Error(`Version ${versionName} not found`);
    }

    // Step 1: Load nearest snapshot
    let codeTree = {};
    if (versionInfo.snapshot) {
        const snapFile = path.join('.APIver', 'snapshots', versionInfo.snapshot);
        codeTree = JSON.parse(decryptAndDecompress(snapFile));
    } else {
        throw new Error(`No snapshot found for version ${versionName}`);
    }

    // Step 2: Apply patches after snapshot
    const patchesToApply = versionInfo.patchesAfterSnapshot || [];
    patchesToApply.forEach(patchId => {
        const patchFile = path.join('.APIver', 'patches', patchId);
        const patchData = decryptAndDecompress(patchFile);
        codeTree = applyPatch(codeTree, JSON.parse(patchData));
    });

    // Step 3: Cache in memory
    memoryCache[versionName] = codeTree;
    return codeTree;
}

module.exports = { loadVersion };