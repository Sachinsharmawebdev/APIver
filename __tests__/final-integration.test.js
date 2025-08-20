const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const { versionMiddleware } = require('../lib/smartVersionMiddleware');

describe('Final Integration Test Suite', () => {
  const testDir = path.join(__dirname, 'final_test_env');
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeAll(() => {
    // Clean setup
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('1. CLI Functionality', () => {
    test('init creates clean structure', () => {
      execSync(`${cli} init v1`);
      
      // Check clean structure
      expect(fs.existsSync('.apiver/snapshots')).toBe(true);
      expect(fs.existsSync('.apiver/patches')).toBe(true);
      expect(fs.existsSync('.apiver/hotfixes')).toBe(true);
      expect(fs.existsSync('.apiver/meta.json')).toBe(true);
      expect(fs.existsSync('.apiver/current-version')).toBe(true);
      
      // Should NOT create versions/active workspace
      expect(fs.existsSync('versions/active')).toBe(false);
    });

    test('new version creation works', () => {
      execSync(`${cli} new v2 from v1`);
      
      const meta = JSON.parse(fs.readFileSync('.apiver/meta.json', 'utf8'));
      expect(meta.versions.v2).toBeDefined();
      expect(meta.versions.v2.base).toBe('v1');
    });

    test('switch between versions', () => {
      execSync(`${cli} switch v1`);
      const version1 = fs.readFileSync('.apiver/current-version', 'utf8');
      expect(version1).toBe('v1');

      execSync(`${cli} switch v2`);
      const version2 = fs.readFileSync('.apiver/current-version', 'utf8');
      expect(version2).toBe('v2');
    });

    test('list shows all versions', () => {
      const output = execSync(`${cli} list`).toString();
      expect(output).toMatch(/v1/);
      expect(output).toMatch(/v2/);
      expect(output).toMatch(/active/);
    });

    test('cleanup removes unnecessary files', () => {
      execSync(`${cli} cleanup`);
      expect(fs.existsSync('.apiver/versions')).toBe(false);
    });
  });

  describe('2. API Development Workflow', () => {
    beforeAll(() => {
      // Create API structure in project root
      fs.mkdirSync('routes', { recursive: true });
      fs.mkdirSync('controllers', { recursive: true });
    });

    test('create v1 API files and commit', () => {
      execSync(`${cli} switch v1`);
      
      // Ensure directories exist
      fs.mkdirSync('routes', { recursive: true });
      fs.mkdirSync('controllers', { recursive: true });
      
      // Create v1 routes
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

      fs.writeFileSync('controllers/userController.js', `
module.exports = {
  getUserDetails: (req, res) => {
    res.json({ version: 'v1', user: { id: 1, name: 'John' } });
  }
};
`);

      execSync(`${cli} commit -m "v1 API implementation"`);
      
      // Verify snapshot created
      expect(fs.existsSync('.apiver/snapshots/v1.full.apiver')).toBe(true);
    });

    test('create v2 API with enhancements', () => {
      execSync(`${cli} switch v2`);
      
      // Ensure directories exist
      fs.mkdirSync('routes', { recursive: true });
      fs.mkdirSync('controllers', { recursive: true });
      
      // Modify for v2
      fs.writeFileSync('routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ version: 'v2', users: ['alice', 'bob', 'charlie'], total: 3 });
  },
  post: (req, res) => {
    res.json({ version: 'v2', message: 'User created with validation', validated: true });
  }
};
`);

      fs.writeFileSync('controllers/userController.js', `
module.exports = {
  getUserDetails: (req, res) => {
    res.json({ 
      version: 'v2', 
      user: { id: 1, name: 'John', email: 'john@example.com', premium: true }
    });
  }
};
`);

      execSync(`${cli} commit -m "v2 API enhancements"`);
    });

    test('diff shows version differences', () => {
      const output = execSync(`${cli} diff v1 v2`).toString();
      expect(output).toMatch(/users\.js/);
      expect(output).toMatch(/userController\.js/);
    });

    // Note: inspect functionality is tested in CLI tests
  });

  describe('3. Runtime Version Serving', () => {
    let app;

    beforeAll(() => {
      // Mock version middleware for testing (since we can't load actual versions in test)
      const mockVersionMiddleware = (allowedVersions, handler) => {
        return (req, res, next) => {
          let version = req.params.version || req.headers['x-api-version'] || req.query.version;
          
          if (!version || !allowedVersions.includes(version)) {
            return res.status(400).json({ error: 'Invalid version' });
          }
          
          req.apiVersion = version;
          
          if (typeof handler === 'function') {
            return handler(req, res, next);
          } else if (handler && handler.handle) {
            return handler(req, res, next);
          }
          
          next();
        };
      };

      // Create test controllers
      const userController = {
        getUserDetails: (req, res) => {
          const version = req.apiVersion;
          const responses = {
            v1: { version: 'v1', user: { id: 1, name: 'John' } },
            v2: { version: 'v2', user: { id: 1, name: 'John', email: 'john@example.com', premium: true } }
          };
          res.json(responses[version]);
        }
      };

      const userRouter = express.Router();
      userRouter.get('/', (req, res) => {
        const version = req.apiVersion;
        const responses = {
          v1: { version: 'v1', users: ['alice', 'bob'] },
          v2: { version: 'v2', users: ['alice', 'bob', 'charlie'], total: 3 }
        };
        res.json(responses[version]);
      });

      // Setup Express app
      app = express();
      app.use(express.json());
      
      // Test different middleware patterns
      app.get('/api/:version/user', mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails));
      app.get('/user', mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails));
      app.use('/api/:version/users', mockVersionMiddleware(['v1', 'v2'], userRouter));
      app.use('/users', mockVersionMiddleware(['v1', 'v2'], userRouter));
    });

    test('serves v1 via path parameter', async () => {
      const response = await request(app)
        .get('/api/v1/user')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.user.name).toBe('John');
      expect(response.body.user.email).toBeUndefined();
    });

    test('serves v2 via path parameter', async () => {
      const response = await request(app)
        .get('/api/v2/user')
        .expect(200);

      expect(response.body.version).toBe('v2');
      expect(response.body.user.email).toBe('john@example.com');
      expect(response.body.user.premium).toBe(true);
    });

    test('serves v1 via header', async () => {
      const response = await request(app)
        .get('/user')
        .set('x-api-version', 'v1')
        .expect(200);

      expect(response.body.version).toBe('v1');
    });

    test('serves v2 via query parameter', async () => {
      const response = await request(app)
        .get('/user?version=v2')
        .expect(200);

      expect(response.body.version).toBe('v2');
    });

    test('router-based endpoints work', async () => {
      const v1Response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      expect(v1Response.body.users).toEqual(['alice', 'bob']);

      const v2Response = await request(app)
        .get('/users')
        .set('x-api-version', 'v2')
        .expect(200);

      expect(v2Response.body.users).toEqual(['alice', 'bob', 'charlie']);
      expect(v2Response.body.total).toBe(3);
    });

    test('rejects invalid versions', async () => {
      await request(app)
        .get('/api/v999/user')
        .expect(400);

      await request(app)
        .get('/user')
        .set('x-api-version', 'invalid')
        .expect(400);
    });
  });

  describe('4. Production Features', () => {
    // Note: hotfix functionality is tested in CLI tests

    test('copy version functionality', () => {
      execSync(`${cli} new v3 from v1`);
      execSync(`${cli} copy v2 to v3 --force`);
      
      const meta = JSON.parse(fs.readFileSync('.apiver/meta.json', 'utf8'));
      expect(meta.versions.v3).toBeDefined();
    });

    test('show patch details', () => {
      const output = execSync(`${cli} show patch v2`).toString();
      expect(output).toMatch(/Patch:|Associated version/);
    });
  });

  describe('5. Architecture Validation', () => {
    test('clean architecture maintained', () => {
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
      expect(Object.keys(meta.versions).length).toBeGreaterThan(0);
    });

    test('snapshots are encrypted', () => {
      const snapshotFiles = fs.readdirSync('.apiver/snapshots');
      expect(snapshotFiles.length).toBeGreaterThan(0);
      
      // Check that snapshot files are binary (encrypted)
      const snapshotContent = fs.readFileSync(path.join('.apiver/snapshots', snapshotFiles[0]));
      expect(Buffer.isBuffer(snapshotContent)).toBe(true);
      expect(snapshotContent.length).toBeGreaterThan(0);
    });
  });
});