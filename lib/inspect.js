const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { applyPatch } = require('../utils/diff');
const { decompressAndDecrypt } = require('../utils/crypto');

module.exports = function inspectFile(version, filePath, opts) {
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

  let fileContent = reconstructFile(version, filePath, meta);

  if (opts.open) {
    const tmpPath = path.join('.APIver', 'tmp_inspect_' + path.basename(filePath));
    fs.writeFileSync(tmpPath, fileContent, 'utf8');
    const editor = process.env.EDITOR || 'nano';
    spawnSync(editor, [tmpPath], { stdio: 'inherit' });
    fs.unlinkSync(tmpPath);
  } else {
    console.log(fileContent);
  }
};

function reconstructFile(version, filePath, meta) {
  let baseVersion = meta.versions[version].base;
  let patches = meta.versions[version].patches;
  let content = fs.readFileSync(path.join('versions', baseVersion, filePath), 'utf8');

  for (const patchFile of patches) {
    const compressedPatch = fs.readFileSync(path.join('.APIver', patchFile));
    const patch = decompressAndDecrypt(compressedPatch);
    if (patch.filePath === filePath) {
      content = applyPatch(content, patch.diff);
    }
  }
  return content;
}
