const fs = require('fs');
const path = require('path');
const { encryptAndCompress } = require('./utils/crypto');

module.exports = function hotfixFile(version, filePath) {
  const cwd = process.cwd();
  const metaPath = path.join(cwd, '.apiver', 'meta.json');
  
  if (!fs.existsSync(metaPath)) {
    console.error('❌ No .apiver meta found. Did you run `apiver init`?');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!meta.versions[version]) {
    console.error(`❌ Version ${version} not found.`);
    process.exit(1);
  }

  // Get original content from version
  const originalContent = reconstructFile(version, filePath, meta);
  
  // Get updated content from current project root
  const currentFilePath = path.join(cwd, filePath);
  if (!fs.existsSync(currentFilePath)) {
    console.error(`❌ File ${filePath} not found in project root.`);
    process.exit(1);
  }
  
  const updatedContent = fs.readFileSync(currentFilePath, 'utf8');

  if (updatedContent !== originalContent) {
    const hotfixDir = path.join(cwd, '.apiver', 'hotfixes');
    fs.mkdirSync(hotfixDir, { recursive: true });
    
    const patchFileName = `hotfix_${Date.now()}.patch.apiver`;
    const diffLib = require('diff');
    const unifiedDiff = diffLib.createTwoFilesPatch(filePath, filePath, originalContent, updatedContent, '', '');
    const patchObj = { changes: [{ file: filePath, diff: unifiedDiff }], deletes: [] };
    const compressedPatch = encryptAndCompress(Buffer.from(JSON.stringify(patchObj)));
    fs.writeFileSync(path.join(hotfixDir, patchFileName), compressedPatch);
    
    if (!meta.hotfixes) meta.hotfixes = {};
    if (!meta.hotfixes[version]) meta.hotfixes[version] = [];
    meta.hotfixes[version].push(patchFileName);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    
    console.log(`✅ Hotfix applied to ${version} for ${filePath}`);
  } else {
    console.log(`ℹ No changes made to ${filePath}`);
  }
};

function reconstructFile(version, filePath, meta) {
  const cwd = process.cwd();
  const { decryptAndDecompress } = require('./utils/crypto');
  
  // Find the chain from the version back to its nearest full snapshot
  const chain = [];
  let cur = version;
  while (cur) {
    const entry = meta.versions[cur];
    if (!entry) break;
    chain.unshift(cur);
    if (entry.type === 'full') break;
    cur = entry.base;
  }
  if (!chain.length) throw new Error('Failed to construct version chain');

  // Extract full snapshot
  const fullName = chain[0];
  const fullFile = path.join(cwd, '.apiver', 'snapshots', `${fullName}.full.apiver`);
  if (!fs.existsSync(fullFile)) throw new Error('Full snapshot not found');
  const encFull = fs.readFileSync(fullFile);
  const zipBuffer = decryptAndDecompress(encFull);
  const snapshotData = JSON.parse(zipBuffer.toString('utf8'));

  // Traverse snapshotData to get file content
  const parts = filePath.split(path.sep);
  let node = snapshotData;
  for (const part of parts) {
    if (!node[part]) throw new Error(`File ${filePath} not found in snapshot`);
    node = node[part];
  }
  let content = Buffer.from(node, 'base64').toString('utf8');

  // Apply patches in order after full snapshot
  for (let i = 1; i < chain.length; i++) {
    const ver = chain[i];
    const patchFile = path.join(cwd, '.apiver', 'patches', `${ver}.patch.apiver`);
    if (!fs.existsSync(patchFile)) continue;
    const encPatch = fs.readFileSync(patchFile);
    const patchBuf = decryptAndDecompress(encPatch);
    const patchObj = JSON.parse(patchBuf.toString('utf8'));
    // Only apply patch if file is modified
    const filePatch = (patchObj.changes || []).find(change => change.file === filePath);
    if (filePatch) {
      const diff = require('diff');
      const applied = diff.applyPatch(content, filePatch.diff);
      if (applied !== false) content = applied;
    }
  }
  return content;
}