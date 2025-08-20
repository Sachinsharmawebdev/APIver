const { loadVersion } = require('../runtimeLoader');
const path = require('path');
const fs = require('fs');

// Test basic runtime loading
function testBasicRuntime() {
  const demoDir = path.join(__dirname, 'demo');
  const originalCwd = process.cwd();
  
  if (!fs.existsSync(demoDir)) {
    console.log('❌ Demo directory not found. Run demo-setup.js first.');
    return;
  }
  
  process.chdir(demoDir);
  
  try {
    console.log('🧪 Testing runtime loader...');
    
    // Test loading v1
    console.log('📦 Loading v1...');
    const v1Code = loadVersion('v1');
    console.log('✅ v1 loaded successfully');
    console.log('📋 v1 files:', Object.keys(v1Code));
    
    // Test loading v2
    console.log('📦 Loading v2...');
    const v2Code = loadVersion('v2');
    console.log('✅ v2 loaded successfully');
    console.log('📋 v2 files:', Object.keys(v2Code));
    
    // Test that modules are executable
    if (v1Code['routes/users.js'] && typeof v1Code['routes/users.js'] === 'object') {
      console.log('✅ v1 users route is executable object');
      console.log('📋 v1 users methods:', Object.keys(v1Code['routes/users.js']));
    }
    
    if (v2Code['routes/users.js'] && typeof v2Code['routes/users.js'] === 'object') {
      console.log('✅ v2 users route is executable object');
      console.log('📋 v2 users methods:', Object.keys(v2Code['routes/users.js']));
    }
    
    // Test mock request/response
    console.log('🧪 Testing mock execution...');
    const mockReq = { params: {}, body: {} };
    const mockRes = {
      json: (data) => {
        console.log('📤 v1 response:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    };
    
    if (v1Code['routes/users.js'] && v1Code['routes/users.js'].get) {
      console.log('🚀 Executing v1 users.get...');
      v1Code['routes/users.js'].get(mockReq, mockRes);
    }
    
    const mockRes2 = {
      json: (data) => {
        console.log('📤 v2 response:', JSON.stringify(data, null, 2));
        return mockRes2;
      }
    };
    
    if (v2Code['routes/users.js'] && v2Code['routes/users.js'].get) {
      console.log('🚀 Executing v2 users.get...');
      v2Code['routes/users.js'].get(mockReq, mockRes2);
    }
    
    console.log('✅ Runtime test completed successfully!');
    
  } catch (error) {
    console.error('❌ Runtime test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.chdir(originalCwd);
  }
}

if (require.main === module) {
  testBasicRuntime();
}

module.exports = { testBasicRuntime };