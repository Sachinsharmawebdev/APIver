const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');

const cliPath = path.join(__dirname, '..', 'bin', 'apiver.js');
const testWorkspace = path.join(__dirname, 'production-test');

// Set environment variables for all tests
process.env.APIVER_KEY = '12345678901234567890123456789012';
process.env.APIVER_SECRET = '12345678901234567890123456789012';

describe('Production Tests', () => {
  beforeEach(async () => {
    await fs.ensureDir(testWorkspace);
    process.chdir(testWorkspace);
    
    // Initialize test version
    execSync(`node ${cliPath} init v1`);
    fs.ensureDirSync('versions/active/routes');
    fs.writeFileSync('versions/active/routes/test.js', 'module.exports = (req, res) => res.json({ version: "v1" });');
    execSync(`node ${cliPath} commit -m "v1 test"`);
  });

  afterEach(async () => {
    process.chdir(__dirname);
    try {
      await fs.remove(testWorkspace);
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await fs.remove(testWorkspace);
    }
  });

  test('should serve versioned APIs', async () => {
    // Require middleware after directory change
    const { versionMiddleware } = require('apiver');
    const app = express();
    app.use('/api/:version', versionMiddleware(['v1']));
    
    const response = await request(app).get('/api/v1/test');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ version: 'v1' });
  });

  test('should handle non-existent versions', async () => {
    // Require middleware after directory change
    const { versionMiddleware } = require('apiver');
    const app = express();
    app.use('/api/:version', versionMiddleware(['v1']));
    
    const response = await request(app).get('/api/nonexistent/test');
    expect(response.status).toBe(400);
  });
});