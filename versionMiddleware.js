import { loadVersion } from "./runtimeLoader";
import express from "express";

const versionRouterCache = {};

// Supported HTTP verbs
const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "all"];

/**
 * Middleware to dynamically serve versioned APIs from memory.
 * Auto-mounts routes from each version's `routes/` folder with method detection.
 */
export function versionMiddleware(allowedVersions) {
  return (req, res, next) => {
    const match = /^\/(v[0-9]+)(\/.*)?$/.exec(req.path);
    if (!match) return res.status(400).send("Missing API version in path");

    const version = match[1];
    if (!allowedVersions.includes(version)) {
      return res.status(400).send("Invalid API version");
    }

    // Strip the /vX prefix from the path
    req.url = req.url.replace(`/${version}`, "") || "/";

    if (!versionRouterCache[version]) {
      try {
        const codeTree = loadVersion(version); // Load code from patches
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
        return res.status(500).send(`Failed to load ${version}: ${err.message}`);
      }
    }

    return versionRouterCache[version](req, res, next);
  };
}
