// __tests__/git-like-architecture.test.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const init = require('../lib/init');
const newVersion = require('../lib/new');
const switchVersion = require('../lib/switch');
const commit = require('../lib/commit');

describe('Git-like Architecture', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-git-test-'));
    process.chdir(testDir);
  });

  afterEach((done) => {
    if (testDir && fs.existsSync(testDir)) {
      // Delay cleanup on Windows to avoid file locking issues
      setTimeout(() => {
        try {
          fs.removeSync(testDir);
        } catch (e) {
          // Ignore cleanup errors in tests
        }
        done();
      }, 100);
    } else {
      done();
    }
  });

  test('should work like Git - edit files directly in project root', () => {
    // Create initial files in project root
    fs.writeFileSync('app.js', 'console.log("v1");');
    fs.writeFileSync('package.json', '{"name": "test", "version": "1.0.0"}');

    // Initialize with v1
    init('v1');

    // Verify .apiver structure (no versions/active)
    expect(fs.existsSync('.apiver')).toBe(true);
    expect(fs.existsSync('.apiver/snapshots')).toBe(true);
    expect(fs.existsSync('.apiver/patches')).toBe(true);
    expect(fs.existsSync('.apiver/hotfixes')).toBe(true);
    expect(fs.existsSync('versions')).toBe(false); // No versions workspace

    // Verify current version tracking
    expect(fs.readFileSync('.apiver/current-version', 'utf8')).toBe('v1');

    // Create new version from v1
    newVersion('v2', 'from', 'v1');

    // Verify we're now on v2
    expect(fs.readFileSync('.apiver/current-version', 'utf8')).toBe('v2');

    // Edit files directly in project root (like Git)
    fs.writeFileSync('app.js', 'console.log("v2 - updated");');
    fs.writeFileSync('routes.js', 'module.exports = {};');

    // Commit changes
    commit('Updated app.js and added routes.js');

    // Switch back to v1
    switchVersion('v1');

    // Verify files are reconstructed correctly
    expect(fs.readFileSync('app.js', 'utf8')).toBe('console.log("v1");');
    expect(fs.existsSync('routes.js')).toBe(false);
    expect(fs.readFileSync('.apiver/current-version', 'utf8')).toBe('v1');

    // Switch to v2
    switchVersion('v2');

    // Verify v2 files are reconstructed
    expect(fs.readFileSync('app.js', 'utf8')).toBe('console.log("v2 - updated");');
    expect(fs.readFileSync('routes.js', 'utf8')).toBe('module.exports = {};');
    expect(fs.readFileSync('.apiver/current-version', 'utf8')).toBe('v2');
  });

  test('should exclude .apiver and node_modules from snapshots', () => {
    // Create files including ones that should be excluded
    fs.writeFileSync('app.js', 'console.log("test");');
    fs.ensureDirSync('node_modules/test');
    fs.writeFileSync('node_modules/test/index.js', 'module.exports = {};');

    // Initialize
    init('v1');

    // Create new version to test exclusion
    newVersion('v2', 'from', 'v1');

    // Add a file to node_modules
    fs.writeFileSync('node_modules/new-package.js', 'test');

    // Commit - should not include node_modules changes
    commit('Test commit');

    // Switch back to v1 and verify node_modules is preserved
    switchVersion('v1');
    expect(fs.existsSync('node_modules/new-package.js')).toBe(true); // Should still exist
  });
});