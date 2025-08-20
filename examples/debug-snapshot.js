const fs = require('fs');
const path = require('path');
const { decryptAndDecompress } = require('../lib/utils/crypto');

function debugSnapshot() {
  const demoDir = path.join(__dirname, 'demo');
  const originalCwd = process.cwd();
  
  if (!fs.existsSync(demoDir)) {
    console.log('❌ Demo directory not found. Run demo-setup.js first.');
    return;
  }
  
  process.chdir(demoDir);
  
  try {
    console.log('🔍 Debugging snapshot contents...');
    
    // Check v1 snapshot
    const v1SnapFile = path.join('.apiver', 'snapshots', 'v1.full.apiver');
    if (fs.existsSync(v1SnapFile)) {
      console.log('\\n📦 v1 snapshot exists');
      const encrypted = fs.readFileSync(v1SnapFile);
      const decrypted = decryptAndDecompress(encrypted);
      const data = JSON.parse(decrypted.toString('utf8'));
      
      console.log('📋 v1 snapshot contents:');
      Object.keys(data).forEach(key => {
        console.log(`  - ${key}`);
        if (key.endsWith('.js')) {
          const content = Buffer.from(data[key], 'base64').toString('utf8');
          console.log(`    Content preview: ${content.substring(0, 100)}...`);
        }
      });
    }
    
    // Check v2 patch
    const v2PatchFile = path.join('.apiver', 'patches', 'v2.patch.apiver');
    if (fs.existsSync(v2PatchFile)) {
      console.log('\\n📦 v2 patch exists');
      const encrypted = fs.readFileSync(v2PatchFile);
      const decrypted = decryptAndDecompress(encrypted);
      const patchData = JSON.parse(decrypted.toString('utf8'));
      
      console.log('📋 v2 patch contents:');
      console.log('  Changes:', patchData.changes?.length || 0);
      console.log('  Deletes:', patchData.deletes?.length || 0);
      
      if (patchData.changes) {
        patchData.changes.forEach((change, i) => {
          console.log(`  Change ${i + 1}: ${change.file}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  } finally {
    process.chdir(originalCwd);
  }
}

if (require.main === module) {
  debugSnapshot();
}

module.exports = { debugSnapshot };