const { serveVersionedAPI } = require('../serveVersionedAPI');

// Router factory that creates handlers for each version
const routerFactory = (codeTree) => {
  return (req, res) => {
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Route to appropriate handler based on path
    if (pathname.startsWith('/users')) {
      const userRoute = codeTree['routes/users.js'];
      if (userRoute) {
        const method = req.method.toLowerCase();
        if (typeof userRoute === 'object' && userRoute[method]) {
          return userRoute[method](req, res);
        } else if (typeof userRoute === 'function') {
          return userRoute(req, res);
        }
      }
    }

    if (pathname.startsWith('/products')) {
      const productRoute = codeTree['routes/products.js'];
      if (productRoute && typeof productRoute === 'function') {
        return productRoute(req, res);
      }
    }

    // 404 handler
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Route not found' }));
  };
};

// Start the versioned API server
const server = serveVersionedAPI(routerFactory, {
  port: 3001,
  allowedVersions: ['v1', 'v2']
});

console.log('🚀 APIver Standalone server running on port 3001');
console.log('📋 Allowed versions: v1, v2');
console.log('🔗 Examples:');
console.log('   curl -H "x-api-version: v1" http://localhost:3001/users');
console.log('   curl http://localhost:3001/users?version=v2');
console.log('   curl http://localhost:3001/v1/products');

module.exports = server;