const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { applyPatch } = require('./utils/diff');
const { decryptAndDecompress } = require('./utils/crypto');

module.exports = function inspectFile(version, filePath, opts) {
  const metaPath = path.join('.apiver', 'meta.json');
  if (!fs.existsSync(metaPath)) {
    console.error('❌ No .APIver meta found. Did you run `apiver init`?');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!meta.versions[version]) {
    console.error(`❌ Version ${version} not found.`);
    process.exit(1);
  }

  let fileContent = reconstructFile(version, filePath, meta);

  if (opts.open) {
    const tmpPath = path.join('.apiver', 'tmp_inspect_' + path.basename(filePath));
    fs.writeFileSync(tmpPath, fileContent, 'utf8');
    let editor = process.env.EDITOR;
    if (!editor) {
      editor = process.platform === 'win32' ? 'notepad' : 'nano';
    }
    try {
      spawnSync(editor, [tmpPath], { stdio: 'inherit' });
    } finally {
      fs.unlinkSync(tmpPath);
    }
  } else {
    console.log(fileContent);
  }
};

function reconstructFile(version, filePath, meta) {
  const cwd = process.cwd();
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
