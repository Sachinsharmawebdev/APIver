// Simple example showing how to load versions and use routes

const express = require('express');
const { loadVersion } = require('../runtimeLoader');

// Step 1: Load versions into cache at startup
console.log('🚀 Loading versions into cache...');

const versionCache = {};
try {
  versionCache.v1 = loadVersion('v1');
  versionCache.v2 = loadVersion('v2');
  console.log('✅ Versions loaded:', Object.keys(versionCache));
} catch (error) {
  console.error('❌ Failed to load versions:', error.message);
  console.log('💡 Run these commands first:');
  console.log('   npx apiver init v1');
  console.log('   npx apiver new v2 from v1');
  process.exit(1);
}

// Step 2: Create Express app
const app = express();
app.use(express.json());

// Step 3: Use cached routes
app.get('/v1/users', (req, res) => {
  const userRoute = versionCache.v1['routes/users.js'];
  if (userRoute && userRoute.get) {
    return userRoute.get(req, res);
  }
  res.status(404).json({ error: 'Route not found' });
});

app.get('/v2/users', (req, res) => {
  const userRoute = versionCache.v2['routes/users.js'];
  if (userRoute && userRoute.get) {
    return userRoute.get(req, res);
  }
  res.status(404).json({ error: 'Route not found' });
});

// Step 4: Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   GET http://localhost:3000/v1/users');
  console.log('   GET http://localhost:3000/v2/users');
  console.log('\n💡 Test with: curl http://localhost:3000/v1/users');
});