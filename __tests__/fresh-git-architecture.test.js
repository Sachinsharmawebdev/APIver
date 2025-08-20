// __tests__/fresh-git-architecture.test.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('Fresh Git-like Architecture', () => {
  let testDir;
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apiver-fresh-test-'));
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

  test('should work with runtime loading after Git-like workflow', () => {
    // Create API structure directly in project root
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });

    // Create v1 files
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

    // Initialize with v1
    execSync(`${cli} init v1`);
    execSync(`${cli} commit -m "Initial v1 API"`);

    // Create v2 from v1
    execSync(`${cli} new v2 from v1`);

    // Verify files are in project root
    expect(fs.existsSync('routes/users.js')).toBe(true);
    expect(fs.existsSync('controllers/userController.js')).toBe(true);

    // Modify files for v2
    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v2', users: ['alice', 'bob', 'charlie'] });
  }
};
`);

    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ version: 'v2', userDetails: { id: 1, name: 'John', email: 'john@example.com' } });
  }
};
`);

    // Commit v2
    execSync(`${cli} commit -m "Updated v2 API"`);

    // Test runtime loading
    const { loadVersion } = require('../runtimeLoader');
    
    const v1Code = loadVersion('v1');
    expect(v1Code).toBeDefined();
    expect(v1Code['routes/users.js']).toBeDefined();
    expect(v1Code['controllers/userController.js']).toBeDefined();

    const v2Code = loadVersion('v2');
    expect(v2Code).toBeDefined();
    expect(v2Code['routes/users.js']).toBeDefined();
    expect(v2Code['controllers/userController.js']).toBeDefined();

    // Verify content is different
    expect(v1Code['routes/users.js']).not.toBe(v2Code['routes/users.js']);
  });
});