const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const cliPath = path.join(__dirname, '..', 'bin', 'apiver.js');
const testWorkspace = path.join(__dirname, 'integration-test');

// Set environment variables for all tests
process.env.APIVER_KEY = '12345678901234567890123456789012';

describe('Integration Tests', () => {
  beforeEach(async () => {
    await fs.ensureDir(testWorkspace);
    process.chdir(testWorkspace);
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

  test('should handle complete workflow', () => {
    execSync(`node ${cliPath} init v1`);
    fs.writeFileSync('versions/active/api.js', `
      module.exports = (req, res) => {
        res.json({ version: 'v1', message: 'Hello World' });
      };
    `);
    execSync(`node ${cliPath} commit -m "Initial v1 API"`);

    execSync(`node ${cliPath} new v2 from v1`);
    fs.writeFileSync('versions/active/api.js', `
      module.exports = (req, res) => {
        res.json({ version: 'v2', message: 'Hello World Updated' });
      };
    `);
    execSync(`node ${cliPath} commit -m "Updated v2 API"`);

    const switchOutput = execSync(`node ${cliPath} switch v1`, { encoding: 'utf8' });
    expect(switchOutput).toContain('Switched to version: v1');
  });

  test('should handle hotfixes', () => {
    execSync(`node ${cliPath} init v1`);
    fs.writeFileSync('versions/active/config.js', 'const API_URL = "http://localhost:3000";');
    execSync(`node ${cliPath} commit -m "Initial config"`);

    const hotfixOutput = execSync(`node ${cliPath} hotfix critical-fix from v1`, { encoding: 'utf8' });
    expect(hotfixOutput).toContain('Created hotfix: critical-fix');
  });
});