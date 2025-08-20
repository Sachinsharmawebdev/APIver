# Technical Implementation Details

## Core Architecture

### Snapshot System
- **Full Snapshots**: Complete version state stored as encrypted JSON
- **Patch Files**: Incremental changes using unified diff format
- **Reconstruction Chain**: Builds from nearest full snapshot + patches
- **Encryption**: All storage encrypted using crypto utilities

### Runtime Loading Process
1. **Chain Building**: Traces version back to nearest full snapshot
2. **Base Loading**: Loads full snapshot into memory
3. **Patch Application**: Applies patches sequentially using temporary directories
4. **Code Tree Generation**: Converts to executable JavaScript objects
5. **Memory Caching**: Stores result for zero-latency serving

### Version Middleware Logic
```javascript
// Auto-detection from path: /api/v1/users
// Controller function: versionMiddleware(['v1', 'v2'], controllerFn)
// Router object: versionMiddleware(['v1', 'v2'], routerObj)
// Auto-serve: versionMiddleware(['v1', 'v2'])
```

## Key Algorithms

### Patch Reconstruction (Fixed in Phase 4)
```javascript
// Problem: Direct object manipulation failed
// Solution: Temporary directory approach
1. Reconstruct snapshot to temp directory
2. Apply patches using existing applyPatch function
3. Convert back to code tree structure
4. Cache result in memory
```

### Path Resolution (Fixed in Phase 2)
```javascript
// Problem: walkRelative caused path doubling
// Before: controllers/controllers/userController.js
// After: controllers/userController.js
// Fix: Removed nested path.join in diff.js
```

### Version Detection
```javascript
// Priority: path > header > query
// Path: /api/:version/route
// Header: x-api-version: v1
// Query: /route?version=v1
```

## Critical Bug Fixes

### 1. Runtime Loader Patch Application
**Issue**: Patches not applied correctly to snapshot data
**Root Cause**: Direct object manipulation vs unified diff format
**Solution**: Use temporary directory + existing applyPatch function

### 2. Version Middleware Import Path
**Issue**: `require("./runtimeLoader")` vs `require("./lib/runtimeLoader")`
**Impact**: 500 errors in production middleware
**Solution**: Fixed import path in versionMiddleware.js

### 3. Test Environment Isolation
**Issue**: Tests interfering due to shared .apiver directories
**Solution**: Each test uses isolated temporary directories

### 4. Array Loading Empty Case
**Issue**: Runtime loader didn't handle empty arrays
**Solution**: Added early return for empty array input

## Performance Optimizations

### Memory Caching
- Versions cached after first load
- Zero disk I/O during requests
- Shared cache across middleware instances

### Patch Efficiency
- Only stores changes, not full copies
- Compressed + encrypted storage
- Lazy loading on demand

### Express Integration
- Router caching per version
- Method-based route detection
- Custom registration support

## Security Features

### Encryption
- All snapshots encrypted at rest
- Patches encrypted before storage
- Crypto utilities handle key management

### Validation
- Version existence checks
- Allowed version validation
- Error handling for invalid requests

## Testing Strategy

### Test Categories
1. **CLI Tests** (19): All command functionality
2. **Runtime Tests** (12): Memory loading and serving
3. **Integration Tests** (18): End-to-end workflows
4. **Array Loading Tests** (10): Multiple version handling
5. **Middleware Tests** (22): Express integration
6. **Debug Tests** (3): Internal verification

### Test Environment
- Isolated temporary directories
- Mock Express applications
- Encrypted test snapshots
- Cache clearing between tests

## Production Deployment

### Startup Process
```javascript
// 1. Load versions into memory cache
const versions = loadVersion(['v1', 'v2', 'v3']);

// 2. Setup middleware
app.use('/api/:version', versionMiddleware(['v1', 'v2', 'v3']));

// 3. Zero-latency serving from memory
```

### Error Handling
- Version not found: 400 Bad Request
- Loading errors: 500 Internal Server Error
- Route not found: 404 Not Found
- Graceful degradation for missing patches