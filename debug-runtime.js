const { loadVersion } = require('./runtimeLoader');

console.log('=== Debug Runtime Loading ===');

try {
  console.log('Loading v1...');
  const v1 = loadVersion('v1');
  console.log('v1 routes/users.js:', v1['routes/users.js']);
  
  console.log('\nLoading v2...');
  const v2 = loadVersion('v2');
  console.log('v2 routes/users.js:', v2['routes/users.js']);
  
  // Test the actual functions
  console.log('\n=== Testing v1 function ===');
  if (v1['routes/users.js'] && v1['routes/users.js'].get) {
    const mockReq = {};
    const mockRes = {
      json: (data) => console.log('v1 response:', data)
    };
    v1['routes/users.js'].get(mockReq, mockRes);
  }
  
  console.log('\n=== Testing v2 function ===');
  if (v2['routes/users.js'] && v2['routes/users.js'].get) {
    const mockReq = {};
    const mockRes = {
      json: (data) => console.log('v2 response:', data)
    };
    v2['routes/users.js'].get(mockReq, mockRes);
  }
  
} catch (error) {
  console.error('Error:', error.message);
}