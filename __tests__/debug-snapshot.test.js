// __tests__/debug-snapshot.test.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('Debug Snapshot Structure', () => {
  let testDir;
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-debug-test-'));
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

  test('should debug what gets captured in snapshot with directories', () => {
    // Create API structure like the failing test
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });

    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v1', users: ['alice', 'bob'] });
  }
};
`);

    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ version: 'v1', userDetails: { id: 1, name: 'John' } });
  }
};
`);
    
    // Initialize
    execSync(`${cli} init v1`);
    
    // Check what's in the snapshot by loading it
    const { loadVersion } = require('../runtimeLoader');
    const v1Code = loadVersion('v1');
    
    console.log('Snapshot contents:', Object.keys(v1Code));
    
    // Should have the correct structure
    expect(v1Code['routes/users.js']).toBeDefined();
    expect(v1Code['controllers/userController.js']).toBeDefined();
    
    // Create v2 and see what happens
    execSync(`${cli} new v2 from v1`);
    
    // Check current directory structure
    console.log('Current directory after new v2:', fs.readdirSync('.', { withFileTypes: true }).map(d => d.name));
    console.log('Routes directory exists:', fs.existsSync('routes'));
    console.log('Controllers directory exists:', fs.existsSync('controllers'));
    
    if (fs.existsSync('routes')) {
      console.log('Routes contents:', fs.readdirSync('routes'));
    }
    if (fs.existsSync('controllers')) {
      console.log('Controllers contents:', fs.readdirSync('controllers'));
    }
  });
});