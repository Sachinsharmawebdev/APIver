const express = require('express');
const { versionMiddleware } = require('../versionMiddleware');

const app = express();
app.use(express.json());

// Load versions in memory for allowed versions
const allowedVersions = ['v1', 'v2'];

// Mount versioned API routes
app.use('/api/:version', versionMiddleware(allowedVersions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 APIver Express server running on port ${PORT}`);
  console.log(`📋 Allowed versions: ${allowedVersions.join(', ')}`);
  console.log(`🔗 Example: http://localhost:${PORT}/api/v1/users`);
});

module.exports = app;