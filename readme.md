# APIver - Advanced API Versioning Without Duplication

APIver is a **Git-like API versioning tool** that allows you to manage multiple API versions inside a **single codebase** without duplication. It stores **changes as compressed + encrypted patches** in a `.APIver` folder and can **load any version entirely in memory** in production for high performance.

---

## 🚀 Features

- **Single Codebase** – No messy code duplication for multiple versions.
- **Compressed + Encrypted Storage** – Protects code patches from tampering.
- **Git-like CLI** – Easy to learn for developers familiar with Git.
- **In-Memory Prod Loader** – Versions are preloaded in memory for zero impact on performance.
- **Built-in Tracing** – Trace production errors directly to their version & patch.
- **Hotfix Mode** – Apply fixes directly to a version in production.

---

## 📦 Installation

```bash
npm install -g apiver
```

---

## 🛠 CLI Commands

| Command | Description |
| ------- | ----------- |
| `npx apiver init v1` | Initialize APIver with first version |
| `npx apiver new v2 from v1` | Create new version based on another |
| `npx apiver switch v3` | Switch working copy to a specific version |
| `npx apiver diff v1 v3` | Compare differences between two versions |
| `npx apiver inspect v2 routes/users.js` | Inspect a file in a specific version |
| `npx apiver hotfix v2 routes/users.js` | Apply a hotfix to a version |
| `npx apiver copy v2 to v1` | Apply changes to v1 from v2 |
| `npx apiver delete v2` | Delete a specific version |


---

## 📂 Folder Structure

```
my-project/
 ├── src/                # Main source code
 ├── .APIver/            # Encrypted & compressed version patches
 ├── versions/active/    # Current active version
 ├── package.json
 └── README.md
```

---

## 🔄 Development Workflow

1. **Initialize First Version**
   ```bash
   npx apiver init v1
   ```

2. **Create a New Version**
   ```bash
   npx apiver new v2 from v1
   ```

3. **Switch Versions**
   ```bash
   npx apiver switch v3
   ```

4. **Edit Code**  
   Work only inside `versions/active/`.

5. **Commit Changes**
   ```bash
   npx apiver commit -m "Updated user route for v2"
   ```
6. **Copy Version**
   ```bash
   npx apiver copy <source_version> to <target_version>
   ```
7. **Delete Version**
   ```bash
   npx apiver delete <target_version>
   ```
---

## 🏭 Production Workflow

- APIver loads **only allowed versions** in memory.
- All API routes are served from memory for minimal latency.
- Error logs automatically tag the **version & patch ID**.

---

## 🐞 Tracing Issues in Production

Example error log:
```
[ERROR] v2/routes/users.js (patch p23d91)
```
Trace the patch:
```bash
npx apiver show patch p23d91
```

---

## 🔥 Hotfix in Production

```bash
npx apiver hotfix v2 routes/users.js
```
This applies the fix **without restarting the server**.

---

## 🎯 Use Cases

- Maintain multiple versions without duplication.
- Instantly switch between versions.
- Reduce production memory footprint.
- Secure patches without exposing raw source.

---

## 🌐 Documentation Website

The full documentation and workflow diagrams are available in the hosted HTML version.  
You can open `index.html` from this repo locally or host it on GitHub Pages / Vercel.

---

## 📜 License

MIT License – Use freely with attribution.

---