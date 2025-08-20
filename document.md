# APIver Package Documentation

## Overview
APIver is a Git-like API versioning tool for managing multiple API versions in a single codebase. It uses encrypted patches and memory-based serving for production performance.

## Installation
```bash
npm install apiver
```

## Quick Setup (2 lines)
```javascript
const { loadVersion, versionMiddleware } = require('apiver');

loadVersion(['v1', 'v2']); // 1. Load versions into memory
app.use('/api/:version', versionMiddleware(['v1', 'v2'])); // 2. Serve via middleware
```

## CLI Workflow

### Initialize Project
```bash
npx apiver init v1
```

### Create API Files
```javascript
// routes/users.js
module.exports = {
  get: (req, res) => res.json({ version: 'v1', users: ['alice'] })
};
```

### Commit Version
```bash
npx apiver commit -m "Initial v1 API"
```

### Create New Version
```bash
npx apiver new v2 from v1
# Edit files for v2
npx apiver commit -m "Enhanced v2 API"
```

## Express Integration Options

### Auto-serve from routes/ folder
```javascript
app.use('/api/:version', versionMiddleware(['v1', 'v2']));
```

### With Controller Function
```javascript
const userController = (req, res) => {
  const handler = req.versionedCode['routes/users.js'];
  handler.get(req, res);
};

app.use('/user/:version', versionMiddleware(['v1', 'v2'], userController));
```

### With Express Router
```javascript
const router = express.Router();
// Define your routes...

app.use('/api/:version', versionMiddleware(['v1', 'v2'], router));
```

## API Reference

### loadVersion(versions)
Loads version(s) into memory cache.

**Parameters:**
- `versions` (string|array): Single version or array of versions

**Returns:**
- Object: Code tree for single version
- Object: `{v1: codeTree, v2: codeTree}` for array input

### versionMiddleware(allowedVersions, handler?)
Express middleware for serving versioned APIs.

**Parameters:**
- `allowedVersions` (array): Allowed version identifiers
- `handler` (function|router, optional): Custom handler or router

**Request Enhancement:**
- `req.apiVersion`: Detected version
- `req.versionedCode`: Loaded version code tree

## CLI Commands

| Command | Description |
|---------|-------------|
| `init v1` | Initialize with first version |
| `new v2 from v1` | Create new version |
| `switch v2` | Switch to version |
| `commit -m "msg"` | Commit changes |
| `list` | Show all versions |
| `diff v1 v2` | Compare versions |
| `inspect v1 file.js` | View file in version |
| `hotfix v1 file.js` | Apply hotfix |
| `copy v1 to v2` | Copy version |
| `delete v1` | Delete version |

## Architecture

### File Structure
```
project/
├── routes/users.js      # Edit directly (Git-like)
├── controllers/         # Your code
├── .apiver/
│   ├── snapshots/       # Encrypted versions
│   ├── patches/         # Incremental changes
│   └── meta.json        # Version metadata
└── package.json
```

### Memory Serving
1. Versions loaded into memory at startup
2. Zero disk I/O during requests
3. Encrypted storage at rest
4. Patch-based incremental changes

## Production Features

### Zero-Latency Serving
```javascript
// All versions cached in memory
const versions = loadVersion(['v1', 'v2', 'v3']);

// Instant response from memory
app.use('/api/:version', versionMiddleware(['v1', 'v2', 'v3']));
```

### Error Tracing
```javascript
// Automatic version tagging in logs
console.error(`Error in ${req.apiVersion}: ${error.message}`);
```

### Hotfixes
```bash
# Apply fix without restart
npx apiver hotfix v2 routes/users.js
```

## Testing

```bash
npm test  # 84/84 tests passing
```

**Test Coverage:**
- CLI commands (19 tests)
- Runtime loading (12 tests) 
- Express integration (22 tests)
- Array loading (10 tests)
- Integration workflows (18 tests)
- Debug utilities (3 tests)

## Best Practices

1. **Load at Startup**: Call `loadVersion()` once at application start
2. **Version Naming**: Use consistent naming (v1, v2, v3)
3. **Memory Management**: Monitor memory with many versions
4. **Error Handling**: Use `req.apiVersion` for error context
5. **Testing**: Test each version before production deployment