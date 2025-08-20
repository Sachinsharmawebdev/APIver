const express = require('express');
const request = require('supertest');
const { versionMiddleware } = require('../versionMiddleware');
const { loadVersion } = require('../runtimeLoader');
const path = require('path');
const fs = require('fs');

async function testRuntimeDetailed() {
  const demoDir = path.join(__dirname, 'demo');
  const originalCwd = process.cwd();
  
  if (!fs.existsSync(demoDir)) {
    console.log('❌ Demo directory not found. Run demo-setup.js first.');
    return;
  }
  
  process.chdir(demoDir);
  
  try {
    console.log('🧪 Testing detailed runtime functionality...');
    
    // Test direct loading
    console.log('\\n📦 Testing direct version loading...');
    const v1Code = loadVersion('v1');
    const v2Code = loadVersion('v2');
    
    console.log('✅ v1 files:', Object.keys(v1Code));
    console.log('✅ v2 files:', Object.keys(v2Code));
    
    // Test Express middleware
    console.log('\\n🚀 Testing Express middleware...');
    const app = express();
    app.use(express.json());
    app.use('/api/:version', versionMiddleware(['v1', 'v2']));
    
    // Test v1 endpoint
    console.log('\\n🧪 Testing v1 /users endpoint...');
    try {
      const v1Response = await request(app)
        .get('/api/v1/users')
        .expect(200);
      
      console.log('✅ v1 response:', JSON.stringify(v1Response.body, null, 2));
    } catch (error) {
      console.log('❌ v1 test failed:', error.message);
    }
    
    // Test v2 endpoint
    console.log('\\n🧪 Testing v2 /users endpoint...');
    try {
      const v2Response = await request(app)
        .get('/api/v2/users')
        .expect(200);
      
      console.log('✅ v2 response:', JSON.stringify(v2Response.body, null, 2));
    } catch (error) {
      console.log('❌ v2 test failed:', error.message);
    }
    
    // Test POST endpoints
    console.log('\\n🧪 Testing POST endpoints...');
    try {
      const v1PostResponse = await request(app)
        .post('/api/v1/users')
        .send({ name: 'Test User' })
        .expect(200);
      
      console.log('✅ v1 POST response:', JSON.stringify(v1PostResponse.body, null, 2));
    } catch (error) {
      console.log('❌ v1 POST test failed:', error.message);
    }
    
    try {
      const v2PostResponse = await request(app)
        .post('/api/v2/users')
        .send({ name: 'Test User' })
        .expect(200);
      
      console.log('✅ v2 POST response:', JSON.stringify(v2PostResponse.body, null, 2));
    } catch (error) {
      console.log('❌ v2 POST test failed:', error.message);
    }
    
    // Test invalid version
    console.log('\\n🧪 Testing invalid version...');
    try {
      await request(app)
        .get('/api/v999/users')
        .expect(400);
      
      console.log('✅ Invalid version correctly rejected');
    } catch (error) {
      console.log('❌ Invalid version test failed:', error.message);
    }
    
    console.log('\\n✅ All runtime tests completed!');
    
  } catch (error) {
    console.error('❌ Runtime test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.chdir(originalCwd);
  }
}

if (require.main === module) {
  testRuntimeDetailed();
}

module.exports = { testRuntimeDetailed };