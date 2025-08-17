````
# APIver

**APIver** is a lightweight CLI tool for managing multiple API versions in Node.js projects. It allows you to create, serve, and cache different API versions dynamically, ensuring backward compatibility and isolated version execution.

---

## 🚀 Features

- Manage multiple API versions via CLI.
- Serve specific versions dynamically in Express routes.
- Cache old versions for temporary use.
- Apply hotfixes, inspect files, check diffs.
- Copy, delete, and list versions.
- Fully isolated version execution.

---

## 💻 Installation

```bash
npm install apiver
````

---

## ⚡ CLI Commands

| Command                                                | Description                                      | Example                                 |
| ------------------------------------------------------ | ------------------------------------------------ | --------------------------------------- |
| `npx apiver init <version>`                            | Snapshot current working code as first version   | `npx apiver init v1`                    |
| `npx apiver new <new_version> from <existing_version>` | Create new version from existing                 | `npx apiver new v2 from v1`             |
| `npx apiver switch <version>`                          | Switch active version for local editing          | `npx apiver switch v2`                  |
| `npx apiver diff <v1> <v2>`                            | Show diff between versions                       | `npx apiver diff v1 v3`                 |
| `npx apiver inspect <version> <file>`                  | Inspect file in production                       | `npx apiver inspect v2 routes/users.js` |
| `npx apiver hotfix <version> <file>`                   | Apply hotfix to running version                  | `npx apiver hotfix v2 routes/users.js`  |
| `npx apiver copy <source> to <target>`                 | Copy source version to target                    | `npx apiver copy v2 to v1`              |
| `npx apiver delete <version>`                          | Delete a version                                 | `npx apiver delete v1`                  |
| `npx apiver list`                                      | Show all versions (current highlighted in green) | `npx apiver list`                       |

---

## 🧩 Express Integration

### server.js

```javascript
const express = require('express');
const { loadVersionsInMemory } = require('apiver');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
app.use(loadVersionsInMemory(['v1','v2']));
app.use('/api/:version', apiRoutes);
app.listen(3000, () => console.log('Server running on port 3000'));
```

### apiRoutes.js

```javascript
const express = require('express');
const route = express.Router();
const userController = require('../controllers/userController');
const { versionMiddleware } = require('apiver');

route.get('/userDetails/:version', versionMiddleware(["v1","v2"]), userController.userDetailsAccess);
module.exports = route;
```

**Behavior:**

* Latest code executes until middleware triggers version execution.
* `/api/v1/userDetails` → executes v1 cached snapshot.
* `/api/v2/userDetails` → executes v2 latest code (then cached).
* Middleware controls allowed versions.

---

## 📁 Folder Structure

```
project-root/
├─ .apiver/
│  ├─ v1/                  # Snapshot of v1
│  ├─ v2/                  # Snapshot of v2
│  └─ meta.json            # Version metadata
├─ routes/
│  └─ apiRoutes.js
├─ controllers/
│  └─ userController.js
├─ server.js
├─ package.json
```

---

## 🗂 Version Metadata (meta.json)

```json
{
  "versions": {
    "v1": { "type": "full", "snapshot": "v1.full.apiver" },
    "v2": { "base": "v1", "type": "patch", "patchesAfterSnapshot": ["v2.patch.apiver"] }
  },
  "hotfixes": { "v1": [], "v2": [] }
}
```

---

## 🔄 Workflow Diagram (ASCII)

```
Developer Code Changes
        │
        ▼
   apiver CLI Commands
(init/new/switch/hotfix/copy/delete)
        │
        ▼
   .apiver Folder (Snapshots & Metadata)
        │
        ▼
Express App Loads Versions
(loadVersionsInMemory → cache ready)
        │
        ▼
Route Request
        │
        ▼
+-------------------------------+
| versionMiddleware checks      |
| requested version             |
+-------------------------------+
        │
        ▼
+-------------------------------+
| Allowed version?              |
|   Yes -> Execute cached code  |
|   No  -> Error: Access Denied |
+-------------------------------+
        │
        ▼
Controller Execution
- /api/v1/... → v1 snapshot
- /api/v2/... → v2 latest (then cached)
```

---

## 🖥 Cache Execution Flow (ASCII)

```
Compressed/Binary Snapshot in .apiver
        │
        ▼
 loadVersionsInMemory()
        │  (constructs full snapshot in memory)
        ▼
 Memory Cache
  { v1: {controllers/functions},
    v2: {controllers/functions} }
        │
        ▼
 Incoming Request (/api/v1/userDetails)
        │
        ▼
 versionMiddleware selects v1
        │
        ▼
 Execute cache['v1']['routes/userController.js'].userDetails(req,res)
```

* Cache me code **pre-compiled executable objects** ban jaate hain.
* Execution tabhi hota hai jab middleware route ke through request pass karta hai.

---

## ✅ Benefits

* Maintain backward compatibility.
* Reduce code duplication.
* Multiple versions run simultaneously.
* Hotfixes, copy, delete, and list versions easily.
* Easy cleanup of outdated versions.

---

## 📄 License

MIT License – Use freely with attribution.