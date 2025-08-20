const express = require('express');
const { versionMiddleware } = require('../lib/smartVersionMiddleware');

// Demo controllers for different versions
const userController = {
  getUserDetails: (req, res) => {
    const version = req.apiVersion;
    const userData = {
      v1: { id: 1, name: 'John', email: 'john@example.com' },
      v2: { id: 1, name: 'John', email: 'john@example.com', profile: 'premium', lastLogin: new Date() }
    };
    
    res.json({
      version,
      user: userData[version] || userData.v1,
      detectedFrom: req.headers['x-api-version'] ? 'header' : 
                   req.query.version ? 'query' : 'path'
    });
  }
};

// Demo router for different versions
const userRouter = express.Router();
userRouter.get('/profile', (req, res) => {
  const version = req.apiVersion;
  const profiles = {
    v1: { basic: 'profile data' },
    v2: { enhanced: 'profile data', features: ['notifications', 'analytics'] }
  };
  
  res.json({
    version,
    profile: profiles[version] || profiles.v1
  });
});

// Create Express app
const app = express();
app.use(express.json());

console.log('🚀 Smart Version Middleware Demo');
console.log('================================\n');

// Usage 1: Direct controller with path parameter
app.get('/api/:version/user', 
  versionMiddleware(['v1', 'v2'], userController.getUserDetails)
);

// Usage 2: Direct controller with header/query detection
app.get('/user', 
  versionMiddleware(['v1', 'v2'], userController.getUserDetails)
);

// Usage 3: Router forwarding with path parameter
app.use('/api/:version/profile', 
  versionMiddleware(['v1', 'v2'], userRouter)
);

// Usage 4: Router forwarding with header/query detection
app.use('/profile', 
  versionMiddleware(['v1', 'v2'], userRouter)
);

// Usage 5: Load from versioned code (if you have route files)
app.get('/api/:version/products',
  versionMiddleware(['v1', 'v2'], 'routes/products.js')
);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supportedVersions: ['v1', 'v2'],
    detectionMethods: ['path', 'header', 'query']
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}\n`);
  
  console.log('📋 Test Endpoints:');
  console.log('==================');
  
  console.log('\n🔗 Path-based version detection:');
  console.log('  GET http://localhost:3000/api/v1/user');
  console.log('  GET http://localhost:3000/api/v2/user');
  console.log('  GET http://localhost:3000/api/v1/profile/profile');
  
  console.log('\n🔗 Header-based version detection:');
  console.log('  GET http://localhost:3000/user');
  console.log('  Header: x-api-version: v1');
  
  console.log('\n🔗 Query-based version detection:');
  console.log('  GET http://localhost:3000/user?version=v2');
  console.log('  GET http://localhost:3000/profile/profile?version=v1');
  
  console.log('\n🧪 Test Commands:');
  console.log('=================');
  console.log('curl http://localhost:3000/api/v1/user');
  console.log('curl http://localhost:3000/api/v2/user');
  console.log('curl -H "x-api-version: v1" http://localhost:3000/user');
  console.log('curl -H "x-api-version: v2" http://localhost:3000/user');
  console.log('curl "http://localhost:3000/user?version=v1"');
  console.log('curl "http://localhost:3000/user?version=v2"');
});