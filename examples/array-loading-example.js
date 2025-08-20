const express = require('express');
const { loadVersion, versionMiddleware } = require('../index');

const app = express();

// Load multiple versions at startup using array syntax
console.log('Loading multiple versions...');
const versions = loadVersion(['v1', 'v2']); // NEW: Array support
console.log('Loaded versions:', Object.keys(versions));

// Alternative: Load single version
const v1Code = loadVersion('v1'); // Single version
console.log('v1 files:', Object.keys(v1Code || {}));

// Use smart middleware with multiple versions
app.use('/api/:version', versionMiddleware(['v1', 'v2'], (req, res) => {
  res.json({
    message: 'API response',
    version: req.apiVersion,
    availableFiles: Object.keys(req.versionedCode || {})
  });
}));

// Example routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    loadedVersions: Object.keys(versions),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Array Loading Example Server running on port ${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET /health - Server health check`);
  console.log(`   GET /api/v1 - Version 1 API`);
  console.log(`   GET /api/v2 - Version 2 API`);
  console.log(`\n💡 Usage examples:`);
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log(`   curl http://localhost:${PORT}/api/v1`);
  console.log(`   curl http://localhost:${PORT}/api/v2`);
  console.log(`   curl -H "x-api-version: v1" http://localhost:${PORT}/api/any`);
});

module.exports = app;