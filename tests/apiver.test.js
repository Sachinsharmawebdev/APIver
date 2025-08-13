const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const cliPath = path.join(__dirname, '..', 'bin', 'apiver.js');
const testWorkspace = path.join(__dirname, 'test-workspace');

// Set environment variables for all tests
process.env.APIVER_KEY = '12345678901234567890123456789012';

describe('APIver CLI Tests', () => {
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

  test('should initialize a new version', () => {
    const output = execSync(`node ${cliPath} init v1`, { encoding: 'utf8' });
    expect(output).toContain('Initialized APIver with version v1');
    expect(fs.existsSync('.APIver')).toBe(true);
  });

  test('should create new version from existing', () => {
    execSync(`node ${cliPath} init v1`);
    fs.writeFileSync('versions/active/test.js', 'console.log("v1");');
    execSync(`node ${cliPath} commit -m "v1 commit"`);
    
    const output = execSync(`node ${cliPath} new v2 from v1`, { encoding: 'utf8' });
    expect(output).toContain('Created new version: v2');
  });

  test('should commit changes', () => {
    execSync(`node ${cliPath} init v1`);
    fs.writeFileSync('versions/active/test.js', 'console.log("updated");');
    
    const output = execSync(`node ${cliPath} commit -m "Updated test"`, { encoding: 'utf8' });
    expect(output).toContain('Committed changes');
  });

  test('should switch between versions', () => {
    execSync(`node ${cliPath} init v1`);
    fs.writeFileSync('versions/active/test.js', 'console.log("v1");');
    execSync(`node ${cliPath} commit -m "v1 commit"`);
    
    execSync(`node ${cliPath} new v2 from v1`);
    fs.writeFileSync('versions/active/test.js', 'console.log("v2");');
    execSync(`node ${cliPath} commit -m "v2 commit"`);
    
    const output = execSync(`node ${cliPath} switch v1`, { encoding: 'utf8' });
    expect(output).toContain('Switched to version: v1');
  });
});