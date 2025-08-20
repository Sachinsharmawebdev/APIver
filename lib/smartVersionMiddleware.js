const { loadVersion } = require('./runtimeLoader');

/**
 * Smart version middleware that detects version from path/header/query
 * and works with both controllers and routers
 */
function versionMiddleware(allowedVersions, handler, options = {}) {
  const { 
    priority = ['path', 'header', 'query'],
    headerName = 'x-api-version',
    queryParam = 'version',
    defaultVersion = null
  } = options;

  // Cache for loaded versions
  const versionCache = {};

  return (req, res, next) => {
    let detectedVersion = null;

    // Detect version based on priority
    for (const method of priority) {
      if (method === 'path' && req.params.version) {
        detectedVersion = req.params.version;
        break;
      }
      if (method === 'header' && req.headers[headerName]) {
        detectedVersion = req.headers[headerName];
        break;
      }
      if (method === 'query' && req.query[queryParam]) {
        detectedVersion = req.query[queryParam];
        break;
      }
    }

    // Use default version if none detected
    if (!detectedVersion && defaultVersion) {
      detectedVersion = defaultVersion;
    }

    // Validate version
    if (!detectedVersion || !allowedVersions.includes(detectedVersion)) {
      return res.status(400).json({
        error: 'Invalid or missing API version',
        allowedVersions,
        detectedVersion
      });
    }

    // Load version if not cached
    if (!versionCache[detectedVersion]) {
      try {
        versionCache[detectedVersion] = loadVersion(detectedVersion);
      } catch (error) {
        return res.status(500).json({
          error: `Failed to load version ${detectedVersion}`,
          message: error.message
        });
      }
    }

    // Add version info to request
    req.apiVersion = detectedVersion;
    req.versionedCode = versionCache[detectedVersion];

    // Handle different handler types
    if (typeof handler === 'function') {
      // Direct controller function
      return handler(req, res, next);
    } else if (handler && typeof handler === 'object' && handler.handle) {
      // Express Router object
      return handler(req, res, next);
    } else if (typeof handler === 'string') {
      // Route path - load from versioned code
      const routeHandler = versionCache[detectedVersion][handler];
      if (!routeHandler) {
        return res.status(404).json({
          error: `Route ${handler} not found in version ${detectedVersion}`
        });
      }
      
      const method = req.method.toLowerCase();
      if (typeof routeHandler === 'object' && routeHandler[method]) {
        return routeHandler[method](req, res, next);
      } else if (typeof routeHandler === 'function') {
        return routeHandler(req, res, next);
      }
    }

    // If no handler matched, continue to next middleware
    next();
  };
}

module.exports = { versionMiddleware };