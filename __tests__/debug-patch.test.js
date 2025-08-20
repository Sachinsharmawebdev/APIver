// __tests__/debug-patch.test.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('Debug Patch Generation', () => {
  let testDir;
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-patch-debug-'));
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

  test('should debug patch generation process', () => {
    // Create API structure
    fs.mkdirSync('controllers', { recursive: true });
    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ version: 'v1', userDetails: { id: 1, name: 'John' } });
  }
};
`);

    // Initialize with v1
    execSync(`${cli} init v1`);
    execSync(`${cli} commit -m "Initial v1 API"`);

    // Create v2 from v1
    execSync(`${cli} new v2 from v1`);

    console.log('After new v2, current directory structure:');
    console.log('Root files:', fs.readdirSync('.'));
    if (fs.existsSync('controllers')) {
      console.log('Controllers:', fs.readdirSync('controllers'));
    }

    // Modify file for v2
    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ version: 'v2', userDetails: { id: 1, name: 'John', email: 'john@example.com' } });
  }
};
`);

    console.log('Modified file, about to commit...');
    
    // This should fail with the nested path error
    try {
      execSync(`${cli} commit -m "Updated v2 API"`);
      console.log('Commit succeeded');
    } catch (error) {
      console.log('Commit failed with error:', error.message);
      console.log('Error contains nested path:', error.message.includes('controllers/controllers'));
    }
  });
});