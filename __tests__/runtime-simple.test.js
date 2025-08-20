const request = require('supertest');
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { versionMiddleware } = require('../versionMiddleware');
const { clearCache } = require('../lib/runtimeLoader');

describe('APIver Runtime Simple Tests', () => {
  const testDir = path.join(__dirname, 'runtime_simple_test');
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeAll(() => {
    // Setup test environment
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);

    // Create simple API structure
    fs.mkdirSync('routes', { recursive: true });

    // Create v1 API
    fs.writeFileSync('routes/test.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v1', message: 'Hello from v1' });
  }
};
`);

    // Initialize v1
    execSync(`${cli} init v1`);
    execSync(`${cli} commit -m "Initial v1"`);

    // Create v2
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);

    fs.writeFileSync('routes/test.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v2', message: 'Hello from v2' });
  }
};
`);

    execSync(`${cli} commit -m "Updated v2"`);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('Express middleware serves different versions', async () => {
    // Clear cache to ensure fresh load
    clearCache();
    
    const app = express();
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));

    // Test v1
    const v1Response = await request(app)
      .get('/api/v1/test')
      .expect(200);

    expect(v1Response.body.version).toBe('v1');
    expect(v1Response.body.message).toBe('Hello from v1');

    // Test v2
    const v2Response = await request(app)
      .get('/api/v2/test')
      .expect(200);

    expect(v2Response.body.version).toBe('v2');
    expect(v2Response.body.message).toBe('Hello from v2');
  });

  test('Middleware rejects invalid versions', async () => {
    const app = express();
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));

    await request(app)
      .get('/api/v999/test')
      .expect(400);
  });

  test('Middleware handles missing routes', async () => {
    const app = express();
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));

    await request(app)
      .get('/api/v1/nonexistent')
      .expect(404);
  });
});