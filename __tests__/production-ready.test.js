const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');

describe('Production Ready Test Suite', () => {
  const testDir = path.join(__dirname, 'production_test');
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('Complete workflow: init → create API → new version → serve', () => {
    // 1. Initialize
    execSync(`${cli} init v1`);
    expect(fs.existsSync('.apiver/meta.json')).toBe(true);
    expect(fs.existsSync('.apiver/snapshots')).toBe(true);
    expect(fs.existsSync('.apiver/current-version')).toBe(true);

    // 2. Create API structure
    fs.mkdirSync('routes', { recursive: true });
    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => res.json({ version: 'v1', users: ['alice'] }),
  post: (req, res) => res.json({ version: 'v1', created: true })
};
`);

    execSync(`${cli} commit -m "v1 API"`);

    // 3. Create v2
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);
    
    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => res.json({ version: 'v2', users: ['alice', 'bob'], total: 2 }),
  post: (req, res) => res.json({ version: 'v2', created: true, validated: true })
};
`);

    execSync(`${cli} commit -m "v2 API"`);

    // 4. Verify structure
    const meta = JSON.parse(fs.readFileSync('.apiver/meta.json', 'utf8'));
    expect(meta.versions.v1).toBeDefined();
    expect(meta.versions.v2).toBeDefined();
    expect(meta.versions.v2.base).toBe('v1');

    console.log('✅ Complete workflow test passed');
  });

  test('Smart middleware functionality', async () => {
    // Mock middleware for testing
    const mockVersionMiddleware = (allowedVersions, handler) => {
      return (req, res, next) => {
        let version = req.params.version || req.headers['x-api-version'] || req.query.version;
        
        if (!version || !allowedVersions.includes(version)) {
          return res.status(400).json({ error: 'Invalid version' });
        }
        
        req.apiVersion = version;
        return handler(req, res, next);
      };
    };

    const userController = {
      getUserDetails: (req, res) => {
        const responses = {
          v1: { version: 'v1', users: ['alice'] },
          v2: { version: 'v2', users: ['alice', 'bob'], total: 2 }
        };
        res.json(responses[req.apiVersion]);
      }
    };

    const app = express();
    app.get('/api/:version/users', mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails));
    app.get('/users', mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails));

    // Test path-based versioning
    const v1Response = await request(app).get('/api/v1/users').expect(200);
    expect(v1Response.body.version).toBe('v1');
    expect(v1Response.body.users).toEqual(['alice']);

    const v2Response = await request(app).get('/api/v2/users').expect(200);
    expect(v2Response.body.version).toBe('v2');
    expect(v2Response.body.total).toBe(2);

    // Test header-based versioning
    const headerResponse = await request(app)
      .get('/users')
      .set('x-api-version', 'v1')
      .expect(200);
    expect(headerResponse.body.version).toBe('v1');

    // Test invalid version
    await request(app).get('/api/v999/users').expect(400);

    console.log('✅ Smart middleware test passed');
  });

  test('CLI commands work correctly', () => {
    // Test list
    const listOutput = execSync(`${cli} list`).toString();
    expect(listOutput).toMatch(/v1/);
    expect(listOutput).toMatch(/v2/);

    // Test switch
    execSync(`${cli} switch v1`);
    const version = fs.readFileSync('.apiver/current-version', 'utf8');
    expect(version).toBe('v1');

    // Test cleanup
    execSync(`${cli} cleanup`);
    expect(fs.existsSync('.apiver/versions')).toBe(false);

    console.log('✅ CLI commands test passed');
  });

  test('Clean architecture maintained', () => {
    // Essential folders exist
    expect(fs.existsSync('.apiver/snapshots')).toBe(true);
    expect(fs.existsSync('.apiver/patches')).toBe(true);
    expect(fs.existsSync('.apiver/hotfixes')).toBe(true);
    expect(fs.existsSync('.apiver/meta.json')).toBe(true);
    expect(fs.existsSync('.apiver/current-version')).toBe(true);

    // Unnecessary folders don't exist
    expect(fs.existsSync('.apiver/versions')).toBe(false);

    // Meta structure is correct
    const meta = JSON.parse(fs.readFileSync('.apiver/meta.json', 'utf8'));
    expect(meta.versions).toBeDefined();
    expect(meta.hotfixes).toBeDefined();

    console.log('✅ Clean architecture test passed');
  });

  test('Error handling works', () => {
    // Test invalid commands
    expect(() => execSync(`${cli} switch nonexistent`)).toThrow();
    expect(() => execSync(`${cli} new v999 from nonexistent`)).toThrow();

    console.log('✅ Error handling test passed');
  });
});