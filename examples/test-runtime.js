const express = require('express');
const { setupDemo } = require('./demo-setup');
const { versionMiddleware } = require('../versionMiddleware');
const path = require('path');

async function testRuntime() {
  console.log('🔧 Setting up demo environment...');
  const demoDir = setupDemo();
  
  // Change to demo directory
  const originalCwd = process.cwd();
  process.chdir(demoDir);
  
  try {
    console.log('🚀 Starting Express server with version middleware...');
    
    const app = express();
    app.use(express.json());
    
    // Add version middleware
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));
    
    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', versions: ['v1', 'v2'] });
    });
    
    const server = app.listen(3000, () => {
      console.log('✅ Server running on http://localhost:3000');
      console.log('');
      console.log('🧪 Test endpoints:');
      console.log('   GET  http://localhost:3000/api/v1/users');
      console.log('   GET  http://localhost:3000/api/v2/users');
      console.log('   POST http://localhost:3000/api/v1/users');
      console.log('   POST http://localhost:3000/api/v2/users');
      console.log('   GET  http://localhost:3000/api/v1/products');
      console.log('   GET  http://localhost:3000/health');
      console.log('');
      console.log('💡 Notice how v1 and v2 return different responses!');
      console.log('   Press Ctrl+C to stop the server');
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down server...');
      server.close(() => {
        process.chdir(originalCwd);
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.chdir(originalCwd);
    process.exit(1);
  }
}

if (require.main === module) {
  testRuntime();
}

module.exports = { testRuntime };