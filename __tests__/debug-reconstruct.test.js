// __tests__/debug-reconstruct.test.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('Debug Reconstruction', () => {
  let testDir;
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-reconstruct-debug-'));
    process.chdir(testDir);
  });

  afterEach((done) => {
    if (testDir && fs.existsSync(testDir)) {
      setTimeout(() => {
        try {
          fs.removeSync(testDir);
        } catch (e) {
          // Ignore cleanup errors
        }
        done();
      }, 100);
    } else {
      done();
    }
  });

  test('should debug reconstruction process', () => {
    // Create simple structure
    fs.mkdirSync('controllers');
    fs.writeFileSync('controllers/userController.js', 'module.exports = { version: "v1" };');

    // Initialize with v1
    execSync(`${cli} init v1`);

    // Check what's in the snapshot
    const { loadVersion } = require('../runtimeLoader');
    const v1Code = loadVersion('v1');
    console.log('V1 snapshot contents:', Object.keys(v1Code));

    // Now test manual reconstruction
    const switchVersion = require('../lib/switch');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-reconstruct-'));
    
    try {
      console.log('Reconstructing v1 into temp dir:', tmpDir);
      switchVersion('v1', tmpDir);
      
      console.log('Temp dir contents after reconstruction:');
      const walkDir = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(entry => {
          const fullPath = path.join(dir, entry.name);
          const displayPath = prefix + entry.name;
          if (entry.isDirectory()) {
            console.log(`  DIR: ${displayPath}/`);
            walkDir(fullPath, displayPath + '/');
          } else {
            console.log(`  FILE: ${displayPath}`);
          }
        });
      };
      
      walkDir(tmpDir);
      
    } finally {
      fs.removeSync(tmpDir);
    }
  });
});