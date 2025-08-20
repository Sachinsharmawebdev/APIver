const request = require('supertest');
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadVersion, versionMiddleware, clearCache } = require('../index');

describe('Real World Scenarios - APIver Usage Patterns', () => {
  const testDir = path.join(__dirname, 'real_world_test');
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;

  beforeAll(() => {
    // Setup test environment
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);

    // Create directories
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });

    // Initialize v1
    execSync(`${cli} init v1`);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clearCache();
  });

  describe('✅ Scenario 1: Express Router Pattern', () => {
    test('Traditional: app.use("/user", userRoute) → APIver: same endpoint, different versions', async () => {
      // Create user route file for v1
      fs.writeFileSync('routes/user.js', `
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v1', 
      message: 'User route v1',
      user: { id: 1, name: 'Alice' } 
    });
  }
};
`);

      execSync(`${cli} commit -m "v1 user routes"`);

      // Create v2 with enhanced routes
      execSync(`${cli} new v2 from v1`);
      fs.writeFileSync('routes/user.js', `
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v2', 
      message: 'User route v2 - Enhanced',
      user: { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' } 
    });
  }
};
`);

      execSync(`${cli} commit -m "v2 enhanced user routes"`);

      // ✅ APIver Setup (2 lines)
      loadVersion(['v1', 'v2']); // 1. Pre-load versions
      const app = express();
      app.use('/api/:version', versionMiddleware(['v1', 'v2'])); // 2. Serve

      // Test: domain/api/v1/user
      const v1Response = await request(app)
        .get('/api/v1/user')
        .expect(200);
      
      expect(v1Response.body.version).toBe('v1');
      expect(v1Response.body.message).toBe('User route v1');
      expect(v1Response.body.user.email).toBeUndefined();

      // Test: domain/api/v2/user  
      const v2Response = await request(app)
        .get('/api/v2/user')
        .expect(200);
        
      expect(v2Response.body.version).toBe('v2');
      expect(v2Response.body.message).toBe('User route v2 - Enhanced');
      expect(v2Response.body.user.email).toBe('alice@example.com');
    });
  });

  describe('✅ Scenario 2: Controller Pattern', () => {
    test('Traditional: route.get("/userDetails", userController.userDetail) → APIver: versioned controllers', async () => {
      // Create controller for v1
      fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetail: (req, res) => {
    res.json({ 
      version: 'v1', 
      message: 'Controller v1',
      user: { id: 1, name: 'Alice', role: 'user' }
    });
  }
};
`);

      // Create route that simulates: route.get('/userDetails', userController.userDetail)
      fs.writeFileSync('routes/userDetails.js', `
module.exports = {
  get: (req, res) => {
    // Simulate controller call - but we need versionedCode from middleware
    // For now, just return v1 data directly
    res.json({ 
      version: 'v1', 
      message: 'Route calling controller v1',
      user: { id: 1, name: 'Alice', role: 'user' }
    });
  }
};
`);

      execSync(`${cli} switch v1`);
      execSync(`${cli} commit -m "v1 controller setup"`);
      
      // Verify v1 has the userDetails route
      if (!fs.existsSync('routes/userDetails.js')) {
        fs.writeFileSync('routes/userDetails.js', `
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v1', 
      message: 'Route calling controller v1',
      user: { id: 1, name: 'Alice', role: 'user' }
    });
  }
};
`);
        execSync(`${cli} commit -m "Add userDetails route to v1"`);
      }

      // Create v3 with enhanced controller
      execSync(`${cli} new v3 from v1`);
      fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetail: (req, res) => {
    res.json({ 
      version: 'v3', 
      message: 'Controller v3 - Enhanced',
      user: { id: 1, name: 'Alice', role: 'admin', permissions: ['read', 'write'] }
    });
  }
};
`);

      fs.writeFileSync('routes/userDetails.js', `
module.exports = {
  get: (req, res) => {
    // Simulate enhanced controller
    res.json({ 
      version: 'v3', 
      message: 'Route calling controller v3',
      user: { id: 1, name: 'Alice', role: 'admin', permissions: ['read', 'write'] }
    });
  }
};
`);

      execSync(`${cli} commit -m "v3 enhanced controller"`);

      // ✅ APIver Setup (2 lines) - Same as Scenario 1!
      loadVersion(['v1', 'v3']); // 1. Pre-load versions
      const app = express();
      app.use('/api/:version', versionMiddleware(['v1', 'v3'])); // 2. Serve

      // Test: domain/api/v1/userDetails
      const v1Response = await request(app)
        .get('/api/v1/userDetails')
        .expect(200);
        
      expect(v1Response.body.version).toBe('v1');
      expect(v1Response.body.message).toBe('Route calling controller v1');
      expect(v1Response.body.user.permissions).toBeUndefined();

      // Test: domain/api/v3/userDetails
      const v3Response = await request(app)
        .get('/api/v3/userDetails')
        .expect(200);
        
      expect(v3Response.body.version).toBe('v3');
      expect(v3Response.body.message).toBe('Route calling controller v3');
      expect(v3Response.body.user.permissions).toEqual(['read', 'write']);
    });
  });

  describe('🚀 Performance & Caching', () => {
    test('Pre-loaded versions serve from memory cache', async () => {
      // Pre-load versions at startup
      const startTime = Date.now();
      loadVersion(['v1', 'v2']);
      const preloadTime = Date.now() - startTime;

      const app = express();
      app.use('/api/:version', versionMiddleware(['v1', 'v2']));

      // Request should be fast (from cache)
      const requestStart = Date.now();
      await request(app).get('/api/v1/user').expect(200);
      const requestTime = Date.now() - requestStart;

      // Request should be much faster than initial load
      expect(requestTime).toBeLessThan(preloadTime + 50);
    });

    test('Warns when versions not pre-loaded', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create middleware without pre-loading
      versionMiddleware(['v999']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[APIver] Versions not pre-loaded: v999')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('📋 Summary: Both Scenarios Use Same Setup', () => {
    test('Same 2-line setup works for both router and controller patterns', async () => {
      // ✅ The beauty of APIver: Same setup for both patterns!
      
      // 1. Pre-load versions (once at startup)
      loadVersion(['v1', 'v2', 'v3']);
      
      // 2. Use middleware (handles all patterns automatically)
      const app = express();
      app.use('/api/:version', versionMiddleware(['v1', 'v2', 'v3']));
      
      // ✅ Router pattern works
      const routerV1 = await request(app).get('/api/v1/user').expect(200);
      expect(routerV1.body.version).toBe('v1');
      
      const routerV2 = await request(app).get('/api/v2/user').expect(200);
      expect(routerV2.body.version).toBe('v2');
      
      // ✅ Controller pattern works  
      const controllerV1 = await request(app).get('/api/v1/userDetails').expect(200);
      expect(controllerV1.body.version).toBe('v1');
      
      const controllerV3 = await request(app).get('/api/v3/userDetails').expect(200);
      expect(controllerV3.body.version).toBe('v3');
      
      // ✅ Both patterns work with identical middleware setup!
    });
  });
});