const request = require('supertest');
const express = require('express');

// Mock version middleware without APIver dependencies
function mockVersionMiddleware(allowedVersions, handler, options = {}) {
  const { 
    priority = ['path', 'header', 'query'],
    headerName = 'x-api-version',
    queryParam = 'version',
    defaultVersion = null
  } = options;

  return (req, res, next) => {
    let detectedVersion = null;

    // Detect version based on priority
    for (const method of priority) {
      if (method === 'path' && req.params.version) {
        detectedVersion = req.params.version;
        break;
      }
      if (method === 'header' && req.headers[headerName]) {
        detectedVersion = req.headers[headerName];
        break;
      }
      if (method === 'query' && req.query[queryParam]) {
        detectedVersion = req.query[queryParam];
        break;
      }
    }

    // Use default version if none detected
    if (!detectedVersion && defaultVersion) {
      detectedVersion = defaultVersion;
    }

    // Validate version
    if (!detectedVersion || !allowedVersions.includes(detectedVersion)) {
      return res.status(400).json({
        error: 'Invalid or missing API version',
        allowedVersions,
        detectedVersion
      });
    }

    // Add version info to request (mock)
    req.apiVersion = detectedVersion;
    req.versionedCode = { mock: true };

    // Handle different handler types
    if (typeof handler === 'function') {
      return handler(req, res, next);
    } else if (handler && typeof handler === 'object' && handler.handle) {
      return handler(req, res, next);
    }

    next();
  };
}

describe('Smart Version Middleware (Mock Tests)', () => {
  let app;
  
  // Mock controllers
  const userController = {
    getUserDetails: (req, res) => {
      const version = req.apiVersion;
      const userData = {
        v1: { id: 1, name: 'John' },
        v2: { id: 1, name: 'John', email: 'john@example.com' }
      };
      res.json({ version, user: userData[version] });
    }
  };

  // Mock router
  const userRouter = express.Router();
  userRouter.get('/profile', (req, res) => {
    res.json({ version: req.apiVersion, profile: 'user profile' });
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Version Detection', () => {
    beforeEach(() => {
      app.get('/api/:version/user', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails)
      );
      app.get('/user', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails)
      );
    });

    test('detects version from path parameter', async () => {
      const response = await request(app)
        .get('/api/v1/user')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.user.name).toBe('John');
    });

    test('detects version from header', async () => {
      const response = await request(app)
        .get('/user')
        .set('x-api-version', 'v2')
        .expect(200);

      expect(response.body.version).toBe('v2');
      expect(response.body.user.email).toBe('john@example.com');
    });

    test('detects version from query parameter', async () => {
      const response = await request(app)
        .get('/user?version=v1')
        .expect(200);

      expect(response.body.version).toBe('v1');
      expect(response.body.user.name).toBe('John');
    });

    test('rejects invalid version', async () => {
      const response = await request(app)
        .get('/api/v999/user')
        .expect(400);

      expect(response.body.error).toContain('Invalid or missing API version');
    });

    test('rejects missing version', async () => {
      await request(app)
        .get('/user')
        .expect(400);
    });
  });

  describe('Handler Types', () => {
    test('works with direct controller function', async () => {
      app.get('/controller', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails)
      );

      const response = await request(app)
        .get('/controller')
        .set('x-api-version', 'v1')
        .expect(200);

      expect(response.body.version).toBe('v1');
    });

    test('works with Express router', async () => {
      app.use('/router', 
        mockVersionMiddleware(['v1', 'v2'], userRouter)
      );

      const response = await request(app)
        .get('/router/profile')
        .set('x-api-version', 'v2')
        .expect(200);

      expect(response.body.version).toBe('v2');
      expect(response.body.profile).toBe('user profile');
    });
  });

  describe('Priority Order', () => {
    beforeEach(() => {
      app.get('/api/:version/priority', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails)
      );
    });

    test('path takes priority over header', async () => {
      const response = await request(app)
        .get('/api/v1/priority')
        .set('x-api-version', 'v2')
        .expect(200);

      expect(response.body.version).toBe('v1'); // Path wins
    });

    test('path takes priority over query', async () => {
      const response = await request(app)
        .get('/api/v2/priority?version=v1')
        .expect(200);

      expect(response.body.version).toBe('v2'); // Path wins
    });
  });

  describe('Request Enhancement', () => {
    test('adds apiVersion to request object', async () => {
      const testController = (req, res) => {
        expect(req.apiVersion).toBe('v1');
        res.json({ success: true });
      };

      app.get('/test', mockVersionMiddleware(['v1', 'v2'], testController));

      await request(app)
        .get('/test')
        .set('x-api-version', 'v1')
        .expect(200);
    });

    test('adds versionedCode to request object', async () => {
      const testController = (req, res) => {
        expect(req.versionedCode).toBeDefined();
        res.json({ success: true });
      };

      app.get('/test', mockVersionMiddleware(['v1', 'v2'], testController));

      await request(app)
        .get('/test')
        .set('x-api-version', 'v1')
        .expect(200);
    });
  });

  describe('Custom Options', () => {
    test('uses custom header name', async () => {
      app.get('/custom', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails, {
          headerName: 'api-version'
        })
      );

      const response = await request(app)
        .get('/custom')
        .set('api-version', 'v1')
        .expect(200);

      expect(response.body.version).toBe('v1');
    });

    test('uses custom query parameter', async () => {
      app.get('/custom', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails, {
          queryParam: 'ver'
        })
      );

      const response = await request(app)
        .get('/custom?ver=v2')
        .expect(200);

      expect(response.body.version).toBe('v2');
    });

    test('uses default version when none provided', async () => {
      app.get('/default', 
        mockVersionMiddleware(['v1', 'v2'], userController.getUserDetails, {
          defaultVersion: 'v1'
        })
      );

      const response = await request(app)
        .get('/default')
        .expect(200);

      expect(response.body.version).toBe('v1');
    });
  });
});