const express = require('express');
const { loadVersion } = require('../runtimeLoader');

// Example: How to load versions in cache and use routes

console.log('🔧 APIver Route Caching Guide\n');

// Method 1: Direct Version Loading (Manual Cache Management)
console.log('📦 Method 1: Direct Version Loading');
console.log('=====================================');

function loadVersionsManually() {
  const cache = {};
  
  // Load versions into cache
  console.log('Loading v1 into cache...');
  cache.v1 = loadVersion('v1');
  
  console.log('Loading v2 into cache...');
  cache.v2 = loadVersion('v2');
  
  console.log('✅ Versions cached:', Object.keys(cache));
  
  // Access routes from cache
  const v1UserRoute = cache.v1['routes/users.js'];
  const v2UserRoute = cache.v2['routes/users.js'];
  
  console.log('📋 v1 routes available:', Object.keys(cache.v1).filter(k => k.startsWith('routes/')));
  console.log('📋 v2 routes available:', Object.keys(cache.v2).filter(k => k.startsWith('routes/')));
  
  return cache;
}

// Method 2: Express Middleware (Automatic Cache Management)
console.log('\n📦 Method 2: Express Middleware');
console.log('===============================');

function createExpressApp() {
  const app = express();
  app.use(express.json());
  
  // The middleware automatically handles caching
  const { versionMiddleware } = require('../versionMiddleware');
  app.use('/api/:version', versionMiddleware(['v1', 'v2']));
  
  console.log('✅ Express app created with automatic version caching');
  return app;
}

// Method 3: Custom Route Registration
console.log('\n📦 Method 3: Custom Route Registration');
console.log('======================================');

function registerRoutesManually() {
  const app = express();
  app.use(express.json());
  
  // Load versions once at startup
  const versions = {
    v1: loadVersion('v1'),
    v2: loadVersion('v2')
  };
  
  // Register routes for each version
  Object.entries(versions).forEach(([version, codeTree]) => {
    console.log(`Registering routes for ${version}...`);
    
    // Find all route files
    const routeFiles = Object.keys(codeTree).filter(file => 
      file.startsWith('routes/') && file.endsWith('.js')
    );
    
    routeFiles.forEach(routeFile => {
      const routeName = routeFile.replace('routes/', '').replace('.js', '');
      const routeHandler = codeTree[routeFile];
      
      console.log(`  - /${version}/${routeName}`);
      
      if (typeof routeHandler === 'object') {
        // Handle method-based exports (get, post, put, delete)
        if (routeHandler.get) {
          app.get(`/${version}/${routeName}`, routeHandler.get);
        }
        if (routeHandler.post) {
          app.post(`/${version}/${routeName}`, routeHandler.post);
        }
        if (routeHandler.put) {
          app.put(`/${version}/${routeName}`, routeHandler.put);
        }
        if (routeHandler.delete) {
          app.delete(`/${version}/${routeName}`, routeHandler.delete);
        }
      } else if (typeof routeHandler === 'function') {
        // Handle function exports (default GET)
        app.get(`/${version}/${routeName}`, routeHandler);
      }
    });
  });
  
  console.log('✅ All routes registered manually');
  return app;
}

// Method 4: Lazy Loading with Cache
console.log('\n📦 Method 4: Lazy Loading with Cache');
console.log('====================================');

function createLazyLoadingApp() {
  const app = express();
  app.use(express.json());
  const versionCache = {};
  
  app.use('/api/:version/*', (req, res, next) => {
    const version = req.params.version;
    const routePath = req.params[0];
    
    // Load version if not cached
    if (!versionCache[version]) {
      console.log(`Loading ${version} into cache...`);
      try {
        versionCache[version] = loadVersion(version);
      } catch (error) {
        return res.status(404).json({ error: `Version ${version} not found` });
      }
    }
    
    // Find route handler
    const routeFile = `routes/${routePath}.js`;
    const routeHandler = versionCache[version][routeFile];
    
    if (!routeHandler) {
      return res.status(404).json({ error: `Route ${routePath} not found in ${version}` });
    }
    
    // Execute route handler
    const method = req.method.toLowerCase();
    if (typeof routeHandler === 'object' && routeHandler[method]) {
      return routeHandler[method](req, res, next);
    } else if (typeof routeHandler === 'function' && method === 'get') {
      return routeHandler(req, res, next);
    }
    
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  });
  
  console.log('✅ Lazy loading app created');
  return app;
}

// Demonstration
async function demonstrate() {
  console.log('\n🧪 Running Demonstrations...\n');
  
  try {
    // Demo 1: Manual loading
    const manualCache = loadVersionsManually();
    
    // Demo 2: Express middleware
    const expressApp = createExpressApp();
    
    // Demo 3: Custom registration
    const customApp = registerRoutesManually();
    
    // Demo 4: Lazy loading
    const lazyApp = createLazyLoadingApp();
    
    console.log('\n✅ All methods demonstrated successfully!');
    console.log('\n💡 Usage Summary:');
    console.log('  Method 1: Full control, manual cache management');
    console.log('  Method 2: Easiest, automatic everything');
    console.log('  Method 3: Custom routing, startup loading');
    console.log('  Method 4: Memory efficient, load on demand');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n💡 Make sure you have created versions first:');
    console.log('   npx apiver init v1');
    console.log('   npx apiver new v2 from v1');
  }
}

if (require.main === module) {
  demonstrate();
}

module.exports = {
  loadVersionsManually,
  createExpressApp,
  registerRoutesManually,
  createLazyLoadingApp
};