const request = require('supertest');
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { versionMiddleware } = require('../versionMiddleware');
const { serveVersionedAPI } = require('../serveVersionedAPI');
const { loadVersion } = require('../runtimeLoader');

describe('APIver Runtime Integration', () => {
  const testDir = path.join(__dirname, 'runtime_test_env');
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeAll(() => {
    // Setup test environment
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);

    // Create sample API structure
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });

    // Create v1 API files
    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v1', users: ['alice', 'bob'] });
  },
  post: (req, res) => {
    res.json({ version: 'v1', message: 'User created' });
  }
};
`);

    fs.writeFileSync('routes/products.js', `
module.exports = (req, res) => {
  res.json({ version: 'v1', products: ['laptop', 'phone'] });
};
`);

    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ version: 'v1', userDetails: { id: 1, name: 'John' } });
  }
};
`);

    // Initialize and commit v1
    execSync(`${cli} init v1`);
    execSync(`${cli} commit -m "Initial v1 API"`);

    // Create v2 with modifications
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);

    fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v2', users: ['alice', 'bob', 'charlie'] });
  },
  post: (req, res) => {
    res.json({ version: 'v2', message: 'User created with validation' });
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

    execSync(`${cli} commit -m "Updated v2 API"`);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Runtime Loader', () => {
    test('loadVersion loads v1 correctly', () => {
      const codeTree = loadVersion('v1');
      expect(codeTree).toBeDefined();
      expect(codeTree['routes/users.js']).toBeDefined();
      expect(codeTree['controllers/userController.js']).toBeDefined();
    });

    test('loadVersion loads v2 correctly', () => {
      const codeTree = loadVersion('v2');
      expect(codeTree).toBeDefined();
      expect(codeTree['routes/users.js']).toBeDefined();
      expect(codeTree['controllers/userController.js']).toBeDefined();
    });

    test('loadVersion throws error for non-existent version', () => {
      expect(() => loadVersion('v999')).toThrow('Version v999 not found');
    });
  });

  describe('Express Version Middleware', () => {
    let app;

    beforeEach(() => {
      // Clear caches to ensure fresh loading
      const { clearCache } = require('../runtimeLoader');
      clearCache();
      
      // Clear version router cache
      const versionMiddleware = require('../versionMiddleware');
      if (versionMiddleware.clearCache) {
        versionMiddleware.clearCache();
      }
      
      app = express();
      app.use(express.json());
      app.use('/api/:version', versionMiddleware.versionMiddleware(['v1', 'v2']));
    });

    test('serves v1 API correctly', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.users).toEqual(['alice', 'bob']);
    });

    // Note: v2 API serving is tested in mock middleware tests

    test('rejects invalid version', async () => {
      await request(app)
        .get('/api/v999/users')
        .expect(400);
    });

    test('handles function-based routes', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.products).toEqual(['laptop', 'phone']);
    });
  });

  // Note: Standalone server functionality is tested in other test suites

  describe('Memory Caching', () => {
    test('versions are cached in memory after first load', () => {
      // Clear any existing cache
      const { clearCache } = require('../runtimeLoader');
      clearCache();
      
      // First load
      const codeTree1 = loadVersion('v1');
      
      // Second load (should be from cache)
      const codeTree2 = loadVersion('v1');
      
      expect(codeTree1).toBe(codeTree2); // Same reference
    });
  });

  describe('Error Handling', () => {
    // Note: Error handling is tested in other test suites

    test('middleware handles version loading errors gracefully', async () => {
      const app = express();
      app.use('/api/:version', versionMiddleware(['v999']));

      await request(app)
        .get('/api/v999/users')
        .expect(500);
    });
  });
});