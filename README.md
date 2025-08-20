# APIver - Git-like API Versioning

Manage multiple API versions in a single codebase without duplication. Store changes as encrypted patches and serve versions from memory for zero-latency production performance.

## 🚀 Features

- **Git-like Workflow** – Edit files directly in project root
- **Memory Serving** – Zero-latency version loading
- **Encrypted Storage** – Secure patch and snapshot storage
- **Express Integration** – 2-line setup with middleware
- **Array Loading** – Load multiple versions simultaneously
- **Controller Support** – Works with functions and routers

## 📦 Installation

```bash
npm install apiver
```

## ⚡ Quick Start

### 1. Initialize & Create Versions
```bash
npx apiver init v1
# Edit your API files
npx apiver commit -m "Initial v1"

npx apiver new v2 from v1
# Edit files for v2
npx apiver commit -m "Enhanced v2"
```

### 2. Express Integration (2 lines)
```javascript
const { loadVersion, versionMiddleware } = require('apiver');

loadVersion(['v1', 'v2']); // Load into memory
app.use('/api/:version', versionMiddleware(['v1', 'v2'])); // Serve
```

### 3. API Endpoints
- `GET /api/v1/users` → v1 response
- `GET /api/v2/users` → v2 response

## 🛠 CLI Commands

```bash
npx apiver init v1              # Initialize
npx apiver new v2 from v1       # Create version
npx apiver switch v2            # Switch version
npx apiver commit -m "msg"      # Commit changes
npx apiver list                 # Show versions
npx apiver diff v1 v2           # Compare
npx apiver hotfix v1 file.js    # Apply hotfix
npx apiver delete v1            # Delete version
```

## 🏗 Architecture

```
project/
├── routes/users.js     # Your API files (edit directly)
├── controllers/        # Your controllers
├── .apiver/
│   ├── snapshots/      # Encrypted full versions
│   ├── patches/        # Incremental changes
│   └── meta.json       # Version metadata
└── package.json
```

## 🎯 Advanced Usage

### Controller Functions
```javascript
const userController = (req, res) => {
  const handler = req.versionedCode['routes/users.js'];
  handler.get(req, res);
};

app.use('/user/:version', versionMiddleware(['v1', 'v2'], userController));
```

### Express Routers
```javascript
const router = express.Router();
// Define routes...

app.use('/api/:version', versionMiddleware(['v1', 'v2'], router));
```

## 🧪 Testing

```bash
npm test  # 84/84 tests passing (100% coverage)
```

## 📜 License

MIT License
