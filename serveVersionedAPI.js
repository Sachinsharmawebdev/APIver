const http = require('http');
const url = require('url');
const { loadVersion } = require('./runtimeLoader');

/**
 * Start a server that serves API versions dynamically.
 * 
 * @param {Function} routerFactory - A function that receives the version code tree
 *                                   and returns a request handler for that version.
 *                                   Example: codeTree => (req, res) => { ... }
 * @param {object} opts - Options
 * @param {number} opts.port - Port to listen on
 * @param {string[]} opts.allowedVersions - List of allowed versions
 */
function serveVersionedAPI(routerFactory, opts = {}) {
    const { port = 3000, allowedVersions = [] } = opts;
    const cache = {};

    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        // 1. Detect version
        let version = req.headers['x-api-version'] || parsedUrl.query.version;
        if (!version) {
            // Optional: allow /v1/... path
            const match = /^\/(v[0-9]+)\//.exec(parsedUrl.pathname);
            if (match) version = match[1];
        }

        if (!version || !allowedVersions.includes(version)) {
            res.statusCode = 400;
            return res.end(`Invalid or missing API version`);
        }

        // 2. Load or retrieve from cache
        if (!cache[version]) {
            try {
                const codeTree = loadVersion(version);
                cache[version] = routerFactory(codeTree);
            } catch (err) {
                res.statusCode = 500;
                return res.end(`Error loading version ${version}: ${err.message}`);
            }
        }

        // 3. Delegate request
        return cache[version](req, res);
    });

    server.listen(port, () => {
        console.log(`Versioned API server running on port ${port}`);
    });

    return server;
}

module.exports = { serveVersionedAPI };
