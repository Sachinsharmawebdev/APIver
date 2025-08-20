const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadVersion } = require('../lib/runtimeLoader');

describe('Array Loading Functionality', () => {
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;
  const testDir = path.join(__dirname, 'array_test_env');
  const versionsDir = path.join(testDir, 'versions');
  const apiverDir = path.join(testDir, '.apiver');

  beforeAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);
    
    // Initialize and create test versions
    execSync(`${cli} init v1`);
    
    // Create test files for v1 in project root
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });
    fs.writeFileSync('routes/users.js', 
      'module.exports = { get: (req, res) => res.json({ version: "v1", users: ["alice"] }) };');
    fs.writeFileSync('controllers/userController.js', 
      'module.exports = { getUser: (req, res) => res.json({ version: "v1", user: "alice" }) };');
    
    execSync(`${cli} commit -m "v1 implementation"`);
    
    // Create v2
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);
    
    // Modify files for v2 in project root
    fs.writeFileSync('routes/users.js', 
      'module.exports = { get: (req, res) => res.json({ version: "v2", users: ["alice", "bob"] }) };');
    fs.writeFileSync('controllers/userController.js', 
      'module.exports = { getUser: (req, res) => res.json({ version: "v2", user: "bob" }) };');
    
    execSync(`${cli} commit -m "v2 implementation"`);
    
    // Verify meta.json has both versions
    const metaPath = path.join(testDir, '.apiver', 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!meta.versions.v1) {
      throw new Error('v1 not found in meta');
    }
    if (!meta.versions.v2) {
      throw new Error('v2 not found in meta');
    }
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('loadVersion with single version string', () => {
    const v1Code = loadVersion('v1');
    expect(v1Code).toBeDefined();
    expect(v1Code['routes/users.js']).toBeDefined();
    expect(v1Code['controllers/userController.js']).toBeDefined();
  });

  test('loadVersion with array of versions', () => {
    const versions = loadVersion(['v1', 'v2']);
    expect(versions).toBeDefined();
    expect(versions.v1).toBeDefined();
    expect(versions.v2).toBeDefined();
    expect(versions.v1['routes/users.js']).toBeDefined();
    expect(versions.v2['routes/users.js']).toBeDefined();
    expect(versions.v1['controllers/userController.js']).toBeDefined();
    expect(versions.v2['controllers/userController.js']).toBeDefined();
  });

  test('loadVersion array returns different content for different versions', () => {
    const versions = loadVersion(['v1', 'v2']);
    
    // Check that we get different JavaScript objects for different versions
    expect(versions.v1['routes/users.js']).toBeDefined();
    expect(versions.v2['routes/users.js']).toBeDefined();
    expect(typeof versions.v1['routes/users.js']).toBe('object');
    expect(typeof versions.v2['routes/users.js']).toBe('object');
    
    // The objects should be different (different versions)
    expect(versions.v1['routes/users.js']).not.toBe(versions.v2['routes/users.js']);
  });

  test('loadVersion caches results correctly', () => {
    const versions1 = loadVersion(['v1', 'v2']);
    const versions2 = loadVersion(['v1', 'v2']);
    
    // Should return same cached references
    expect(versions1.v1).toBe(versions2.v1); // Same reference
    expect(versions1.v2).toBe(versions2.v2); // Same reference
  });

  test('loadVersion throws error for non-existent version in array', () => {
    expect(() => loadVersion(['v1', 'nonexistent'])).toThrow('Version "nonexistent" not found');
  });

  test('loadVersion mixed single and array calls work correctly', () => {
    const singleV1 = loadVersion('v1');
    const arrayResult = loadVersion(['v1', 'v2']);
    
    expect(singleV1).toBe(arrayResult.v1); // Should be same cached reference
    expect(arrayResult.v2).toBeDefined();
  });
});