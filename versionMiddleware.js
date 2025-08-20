const { loadVersion, getCachedVersions } = require("./lib/runtimeLoader");
const express = require("express");

const versionRouterCache = {};

// Supported HTTP verbs
const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "all"];

/**
 * Middleware to dynamically serve versioned APIs from memory.
 * Can auto-mount routes or use custom handler (controller function or router).
 */
function versionMiddleware(allowedVersions, handler = null) {
  // Check if versions are pre-loaded at startup
  const cachedVersions = getCachedVersions();
  const missingVersions = allowedVersions.filter(v => !cachedVersions.includes(v));
  
  if (missingVersions.length > 0) {
    console.warn(`[APIver] Versions not pre-loaded: ${missingVersions.join(', ')}. Call loadVersion(['${allowedVersions.join("', '")}']) at startup for better performance.`);
  }
  
  return (req, res, next) => {
    // Prefer Express route param when mounted as /api/:version
    let version = req.params && req.params.version;

    // Fallback: extract from path when not mounted that way
    if (!version) {
      const match = /^\/(v[0-9])(\/.*)?$/.exec(req.path);
      if (!match) return res.status(400).send('Missing API version in path');
      version = match[1];
      // Strip the /vX prefix only in this scenario
      req.url = req.url.replace(`/${version}`, '') || '/';
    }

     if (!allowedVersions.includes(version)) {
       return res.status(400).send('Invalid API version');
     }
    
    // Get cached version data
    let versionedCode;
    try {
      versionedCode = loadVersion(version); // This will use cache if available
    } catch (err) {
      return res.status(500).send(`Failed to load ${version}: ${err.message}`);
    }
    
    // If custom handler provided, use it directly
    if (handler) {
      req.apiVersion = version;
      req.versionedCode = versionedCode;
      
      if (typeof handler === 'function') {
        // Controller function
        return handler(req, res, next);
      } else if (handler && typeof handler === 'object') {
        // Express Router
        return handler(req, res, next);
      }
    }

    // Auto-mount from routes/ folder
    if (!versionRouterCache[version]) {
      try {
        const codeTree = versionedCode; // Use already loaded data
        const router = express.Router();

        Object.keys(codeTree).forEach(filePath => {
          if (filePath.startsWith("routes/") && filePath.endsWith(".js")) {
            const routePath = "/" + filePath.replace(/^routes\//, "").replace(/\.js$/, "");
            const routeModule = codeTree[filePath];

            if (typeof routeModule === "function") {
              // Default GET handler
              router.get(routePath, routeModule);
            } else if (typeof routeModule === "object" && routeModule !== null) {
              // Method-based export detection
              HTTP_METHODS.forEach(method => {
                if (typeof routeModule[method] === "function") {
                  router[method](routePath, routeModule[method]);
                }
              });

              // Optional custom registration
              if (typeof routeModule.register === "function") {
                routeModule.register(router, routePath);
              }
            }
          }
        });

        versionRouterCache[version] = router;
      } catch (err) {
        return res.status(500).send(`Failed to create router for ${version}: ${err.message}`);
      }
    }

    return versionRouterCache[version](req, res, next);
  };
}

/**
 * Clear version router cache (useful for testing)
 */
function clearCache() {
  Object.keys(versionRouterCache).forEach(key => {
    delete versionRouterCache[key];
  });
}

module.exports = { versionMiddleware, clearCache };
