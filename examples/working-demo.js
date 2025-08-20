const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { versionMiddleware } = require('../versionMiddleware');

async function createWorkingDemo() {
  const demoDir = path.join(__dirname, 'working-demo');
  
  // Clean and create demo directory
  if (fs.existsSync(demoDir)) {
    fs.rmSync(demoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(demoDir, { recursive: true });
  
  const originalCwd = process.cwd();
  process.chdir(demoDir);
  
  try {
    console.log('🔧 Creating working demo with correct workflow...');
    
    const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;
    
    // Initialize APIver
    execSync(`${cli} init v1`);
    
    // Create v1 API files in versions/active directory
    fs.mkdirSync('versions/active/routes', { recursive: true });
    fs.mkdirSync('versions/active/controllers', { recursive: true });
    
    fs.writeFileSync('versions/active/routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v1', 
      users: ['alice', 'bob'],
      timestamp: new Date().toISOString()
    });
  },
  post: (req, res) => {
    res.json({ 
      version: 'v1', 
      message: 'User created',
      data: req.body 
    });
  }
};
`);

    fs.writeFileSync('versions/active/routes/products.js', `
module.exports = (req, res) => {
  res.json({ 
    version: 'v1', 
    products: ['laptop', 'phone'],
    count: 2
  });
};
`);

    // Commit v1
    execSync(`${cli} commit -m "Initial v1 API with routes"`);
    console.log('✅ v1 committed with API routes');
    
    // Create v2
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);
    
    // Modify v2 files
    fs.writeFileSync('versions/active/routes/users.js', `
module.exports = {
  get: (req, res) => {
    res.json({ 
      version: 'v2', 
      users: ['alice', 'bob', 'charlie'],
      total: 3,
      timestamp: new Date().toISOString()
    });
  },
  post: (req, res) => {
    res.json({ 
      version: 'v2', 
      message: 'User created with enhanced validation',
      data: req.body,
      validated: true
    });
  }
};
`);

    // Commit v2
    execSync(`${cli} commit -m "Enhanced v2 API"`);
    console.log('✅ v2 committed with enhanced API');
    
    // Test the runtime functionality
    console.log('\\n🧪 Testing runtime functionality...');
    
    const app = express();
    app.use(express.json());
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));
    
    // Test v1
    console.log('🔍 Testing v1 API...');
    const v1Response = await request(app)
      .get('/api/v1/users')
      .expect(200);
    
    console.log('✅ v1 GET /users:', JSON.stringify(v1Response.body, null, 2));
    
    const v1PostResponse = await request(app)
      .post('/api/v1/users')
      .send({ name: 'Test User' })
      .expect(200);
    
    console.log('✅ v1 POST /users:', JSON.stringify(v1PostResponse.body, null, 2));
    
    // Test v2
    console.log('\\n🔍 Testing v2 API...');
    const v2Response = await request(app)
      .get('/api/v2/users')
      .expect(200);
    
    console.log('✅ v2 GET /users:', JSON.stringify(v2Response.body, null, 2));
    
    const v2PostResponse = await request(app)
      .post('/api/v2/users')
      .send({ name: 'Test User' })
      .expect(200);
    
    console.log('✅ v2 POST /users:', JSON.stringify(v2PostResponse.body, null, 2));
    
    // Test products endpoint
    const v1ProductsResponse = await request(app)
      .get('/api/v1/products')
      .expect(200);
    
    console.log('✅ v1 GET /products:', JSON.stringify(v1ProductsResponse.body, null, 2));
    
    console.log('\\n🎉 Working demo completed successfully!');
    console.log('📁 Demo directory:', demoDir);
    console.log('\\n💡 Key learnings:');
    console.log('   1. API files must be in versions/active/ directory');
    console.log('   2. Commit after creating/modifying files');
    console.log('   3. Use versionMiddleware in Express apps');
    console.log('   4. Access via /api/v1/endpoint or /api/v2/endpoint');
    
    return demoDir;
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    throw error;
  } finally {
    process.chdir(originalCwd);
  }
}

if (require.main === module) {
  createWorkingDemo().catch(console.error);
}

module.exports = { createWorkingDemo };