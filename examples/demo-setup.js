const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Demo setup script
function setupDemo() {
  const demoDir = path.join(__dirname, 'demo');
  
  // Clean and create demo directory
  if (fs.existsSync(demoDir)) {
    fs.rmSync(demoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(demoDir, { recursive: true });
  
  const originalCwd = process.cwd();
  process.chdir(demoDir);
  
  try {
    // Create API structure
    fs.mkdirSync('routes', { recursive: true });
    fs.mkdirSync('controllers', { recursive: true });

    // Create v1 API files
    fs.writeFileSync('routes/users.js', `
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

    fs.writeFileSync('routes/products.js', `
module.exports = (req, res) => {
  res.json({ 
    version: 'v1', 
    products: ['laptop', 'phone'],
    count: 2
  });
};
`);

    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ 
      version: 'v1', 
      userDetails: { 
        id: parseInt(req.params.id) || 1, 
        name: 'John Doe',
        role: 'user'
      } 
    });
  }
};
`);

    // Initialize v1
    console.log('🔧 Initializing v1...');
    const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;
    execSync(`${cli} init v1`);
    execSync(`${cli} commit -m "Initial v1 API"`);

    // Create v2 with modifications
    console.log('🔧 Creating v2...');
    execSync(`${cli} new v2 from v1`);
    execSync(`${cli} switch v2`);

    // Modify files for v2
    fs.writeFileSync('routes/users.js', `
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

    fs.writeFileSync('controllers/userController.js', `
module.exports = {
  userDetailsAccess: (req, res) => {
    res.json({ 
      version: 'v2', 
      userDetails: { 
        id: parseInt(req.params.id) || 1, 
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        lastLogin: new Date().toISOString()
      } 
    });
  }
};
`);

    execSync(`${cli} commit -m "Enhanced v2 API"`);

    console.log('✅ Demo setup complete!');
    console.log(`📁 Demo directory: ${demoDir}`);
    console.log('🚀 You can now run the Express server or standalone server examples');
    
    return demoDir;
  } finally {
    process.chdir(originalCwd);
  }
}

if (require.main === module) {
  setupDemo();
}

module.exports = { setupDemo };