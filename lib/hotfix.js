const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generatePatch } = require('../utils/diff');
const { compressAndEncrypt } = require('../utils/crypto');

module.exports = function hotfixFile(version, filePath) {
  const metaPath = path.join('.APIver', 'meta.json');
  if (!fs.existsSync(metaPath)) {
    console.error('❌ No .APIver meta found. Did you run `apiver init`?');
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (!meta.versions[version]) {
    console.error(`❌ Version ${version} not found.`);
    process.exit(1);
  }

  const tmpPath = path.join('.APIver', 'tmp_hotfix_' + path.basename(filePath));
  const originalContent = reconstructFile(version, filePath, meta);
  fs.writeFileSync(tmpPath, originalContent, 'utf8');

  const editor = process.env.EDITOR || 'nano';
  spawnSync(editor, [tmpPath], { stdio: 'inherit' });

  const updatedContent = fs.readFileSync(tmpPath, 'utf8');
  fs.unlinkSync(tmpPath);

  if (updatedContent !== originalContent) {
    const diff = generatePatch(originalContent, updatedContent);
    const patchFileName = `patch_${Date.now()}.dat`;
    const compressedPatch = compressAndEncrypt({
      filePath,
      diff
    });
    fs.writeFileSync(path.join('.APIver', patchFileName), compressedPatch);
    meta.versions[version].patches.push(patchFileName);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`✅ Hotfix applied to ${version} for ${filePath}`);
  } else {
    console.log(`ℹ No changes made to ${filePath}`);
  }
};

function reconstructFile(version, filePath, meta) {
  let baseVersion = meta.versions[version].base;
  let patches = meta.versions[version].patches;
  let content = fs.readFileSync(path.join('versions', baseVersion, filePath), 'utf8');

  for (const patchFile of patches) {
    const compressedPatch = fs.readFileSync(path.join('.APIver', patchFile));
    const patch = require('../utils/crypto').decompressAndDecrypt(compressedPatch);
    if (patch.filePath === filePath) {
      content = require('../utils/diff').applyPatch(content, patch.diff);
    }
  }
  return content;
}
