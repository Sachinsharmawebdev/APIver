const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('APIver CLI', () => {
  const cli = `node ${path.resolve(__dirname, '../bin/apiver.js')}`;
  const testDir = path.join(__dirname, 'apiver_test_env');
  const versionsDir = path.join(testDir, 'versions');
  const apiverDir = path.join(testDir, '.apiver');

  beforeAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('init command creates first version', () => {
    execSync(`${cli} init v1`);
    expect(fs.existsSync(path.join(apiverDir, 'snapshots'))).toBe(true);
    expect(fs.existsSync(path.join(apiverDir, 'current-version'))).toBe(true);
    expect(fs.readFileSync(path.join(apiverDir, 'current-version'), 'utf8')).toBe('v1');
    expect(fs.existsSync(path.join(apiverDir, 'meta.json'))).toBe(true);
  });

  test('new command creates new version from base', () => {
    execSync(`${cli} new v2 from v1`);
    const meta = JSON.parse(fs.readFileSync(path.join(apiverDir, 'meta.json'), 'utf8'));
    expect(meta.versions.v2).toBeDefined();
    expect(fs.readFileSync(path.join(apiverDir, 'current-version'), 'utf8')).toBe('v2');
  });

  test('switch command activates a version', () => {
    execSync(`${cli} switch v2`);
    const activeVersion = fs.readFileSync(path.join(apiverDir, 'current-version'), 'utf8');
    expect(activeVersion).toBe('v2');
  });

  test('commit command works', () => {
    execSync(`${cli} commit -m "Test commit"`);
    // Check for patch or snapshot file existence
    const patchesDir = path.join(apiverDir, 'patches');
    const files = fs.readdirSync(patchesDir);
    expect(files.some(f => f.endsWith('.patch.apiver')) || files.some(f => f.endsWith('.full.apiver'))).toBe(true);
  });

  test('delete command removes a version', () => {
    execSync(`${cli} init v3`);
    execSync(`${cli} delete v3`);
    const meta = JSON.parse(fs.readFileSync(path.join(apiverDir, 'meta.json'), 'utf8'));
    expect(meta.versions.v3).toBeUndefined();
    expect(fs.existsSync(path.join(apiverDir, 'snapshots', 'v3.snapshot.apiver'))).toBe(false);
  });

  test('list command shows all versions and highlights active', () => {
    execSync(`${cli} init v10`);
    execSync(`${cli} new v20 from v10`);
    execSync(`${cli} switch v20`);
    const output = execSync(`${cli} list`).toString();
    expect(output).toMatch(/Available API Versions:/);
    expect(output).toMatch(/v10/);
    expect(output).toMatch(/v20/);
    expect(output).toMatch(/\* v20 \(active\)/);
  });

  test('copy command copies code from one version to another', () => {
    execSync(`${cli} init v100`);
    execSync(`${cli} switch v100`);
    // Create a file in project root (which is v100)
    const activeFileV100 = path.join(testDir, 'test.txt');
    fs.writeFileSync(activeFileV100, 'hello world');
    // Commit the file to v100 so it is included in the snapshot
    execSync(`${cli} commit -m "Add test.txt to v100"`);
    // Create target version v300
    execSync(`${cli} new v300 from v100`);
    // Copy v100 to v300 with --force
    execSync(`${cli} copy v100 to v300 --force`);
    // After copy, switch to v300 and check activeDir
    execSync(`${cli} switch v300`);
    // Check for the copied file in project root after switching to v300
    const activeFileV300 = path.join(testDir, 'test.txt');
    expect(fs.existsSync(activeFileV300)).toBe(true);
    const copiedContent = fs.readFileSync(activeFileV300, 'utf8');
    expect(copiedContent).toBe('hello world');
  });

  test('diff command shows differences between two versions', () => {
    execSync(`${cli} init vA`);
    execSync(`${cli} switch vA`);
    const fileA = path.join(testDir, 'foo.txt');
    fs.writeFileSync(fileA, 'hello from vA');
    execSync(`${cli} commit -m "Add foo.txt to vA"`);
    execSync(`${cli} new vB from vA`);
    execSync(`${cli} switch vB`);
    const fileB = path.join(testDir, 'foo.txt');
    fs.writeFileSync(fileB, 'hello from vB');
    execSync(`${cli} commit -m "Change foo.txt in vB"`);
    const output = execSync(`${cli} diff vA vB`).toString();
    expect(output).toMatch(/foo.txt/);
    expect(output).toMatch(/hello from vA/);
    expect(output).toMatch(/hello from vB/);
  });

  test('inspect command shows file content for a specific version', () => {
    execSync(`${cli} init vX`);
    execSync(`${cli} switch vX`);
    const fileX = path.join(testDir, 'bar.txt');
    fs.writeFileSync(fileX, 'content for vX');
    execSync(`${cli} commit -m "Add bar.txt to vX"`);
    execSync(`${cli} new vY from vX`);
    execSync(`${cli} switch vY`);
    const fileY = path.join(testDir, 'bar.txt');
    fs.writeFileSync(fileY, 'content for vY');
    execSync(`${cli} commit -m "Change bar.txt in vY"`);
    const outputX = execSync(`${cli} inspect vX bar.txt`).toString();
    expect(outputX).toMatch(/content for vX/);
    const outputY = execSync(`${cli} inspect vY bar.txt`).toString();
    expect(outputY).toMatch(/content for vY/);
  });

  test('hotfix command applies a hotfix to a version', () => {
    execSync(`${cli} init vH`);
    execSync(`${cli} switch vH`);
    const fileH = path.join(testDir, 'fixme.txt');
    fs.writeFileSync(fileH, 'original content');
    execSync(`${cli} commit -m "Add fixme.txt to vH"`);
    
    // Create hotfix by modifying the file and using legacy syntax
    fs.writeFileSync(fileH, 'hotfix content');
    
    // Use legacy syntax: hotfix <version> <file>
    execSync(`${cli} hotfix vH fixme.txt`);
    
    // Verify hotfix was recorded in meta.json
    const metaPath = path.join(testDir, '.apiver', 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.hotfixes.vH).toBeDefined();
    expect(meta.hotfixes.vH.length).toBeGreaterThan(0);
    
    // Switch away and back to vH to ensure hotfix is applied
    execSync(`${cli} new vH2 from vH`);
    execSync(`${cli} switch vH2`);
    execSync(`${cli} switch vH`);
    
    const hotfixedFile = path.join(testDir, 'fixme.txt');
    const content = fs.readFileSync(hotfixedFile, 'utf8');
    expect(content).toBe('hotfix content');
  });

  test('show patch command displays patch details', () => {
    // Use an existing patch from previous tests
    const output = execSync(`${cli} show patch v2`).toString();
    expect(output).toMatch(/Patch:|Associated version/);
    expect(output).toMatch(/v2/);
  });

  test('error handling - init without version name', () => {
    expect(() => execSync(`${cli} init`)).toThrow();
  });

  test('error handling - switch to non-existent version', () => {
    expect(() => execSync(`${cli} switch nonexistent`)).toThrow();
  });

  test('error handling - delete non-existent version', () => {
    expect(() => execSync(`${cli} delete nonexistent`)).toThrow();
  });

  test('error handling - inspect non-existent version', () => {
    expect(() => execSync(`${cli} inspect nonexistent file.txt`)).toThrow();
  });

  test('error handling - diff with non-existent versions', () => {
    expect(() => execSync(`${cli} diff nonexistent1 nonexistent2`)).toThrow();
  });

  test('copy command with force flag overwrites existing version', () => {
    execSync(`${cli} init vCopy1`);
    execSync(`${cli} switch vCopy1`);
    const file1 = path.join(testDir, 'copy-test.txt');
    fs.writeFileSync(file1, 'content from vCopy1');
    execSync(`${cli} commit -m "Add copy-test.txt to vCopy1"`);
    
    execSync(`${cli} new vCopy2 from vCopy1`);
    execSync(`${cli} switch vCopy2`);
    const file2 = path.join(testDir, 'copy-test.txt');
    fs.writeFileSync(file2, 'content from vCopy2');
    execSync(`${cli} commit -m "Modify copy-test.txt in vCopy2"`);
    
    // Copy vCopy1 to vCopy2 with force
    execSync(`${cli} copy vCopy1 to vCopy2 --force`);
    
    // Switch to vCopy2 and verify content
    execSync(`${cli} switch vCopy2`);
    const content = fs.readFileSync(file2, 'utf8');
    expect(content).toBe('content from vCopy1');
  });

  test('list command works with no versions', () => {
    // Create a fresh test environment
    const emptyTestDir = path.join(__dirname, 'empty_test_env');
    fs.rmSync(emptyTestDir, { recursive: true, force: true });
    fs.mkdirSync(emptyTestDir);
    const originalCwd = process.cwd();
    
    try {
      process.chdir(emptyTestDir);
      // Expect this to throw since no .apiver exists
      expect(() => execSync(`${cli} list`)).toThrow();
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(emptyTestDir, { recursive: true, force: true });
    }
  });

  test('commit command without message uses default', () => {
    execSync(`${cli} init vCommit`);
    execSync(`${cli} switch vCommit`);
    const file = path.join(testDir, 'commit-test.txt');
    fs.writeFileSync(file, 'test content');
    
    // Commit without -m flag should work
    execSync(`${cli} commit`);
    
    // Verify patch was created
    const patchesDir = path.join(testDir, '.apiver', 'patches');
    const files = fs.readdirSync(patchesDir);
    expect(files.some(f => f.endsWith('.patch.apiver') || f.endsWith('.full.apiver'))).toBe(true);
  });

  test('multiple hotfixes can be applied to same version', () => {
    execSync(`${cli} init vMultiHotfix`);
    execSync(`${cli} switch vMultiHotfix`);
    
    // Create two files
    const file1 = path.join(testDir, 'hotfix1.txt');
    const file2 = path.join(testDir, 'hotfix2.txt');
    fs.writeFileSync(file1, 'original content 1');
    fs.writeFileSync(file2, 'original content 2');
    execSync(`${cli} commit -m "Add hotfix files"`);
    
    // Apply first hotfix
    fs.writeFileSync(file1, 'hotfixed content 1');
    execSync(`${cli} hotfix vMultiHotfix hotfix1.txt`);
    
    // Apply second hotfix
    fs.writeFileSync(file2, 'hotfixed content 2');
    execSync(`${cli} hotfix vMultiHotfix hotfix2.txt`);
    
    // Verify both hotfixes are recorded
    const metaPath = path.join(testDir, '.apiver', 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.hotfixes.vMultiHotfix.length).toBe(2);
    
    // Switch away and back to verify both hotfixes are applied
    execSync(`${cli} new vTemp from vMultiHotfix`);
    execSync(`${cli} switch vTemp`);
    execSync(`${cli} switch vMultiHotfix`);
    
    const content1 = fs.readFileSync(file1, 'utf8');
    const content2 = fs.readFileSync(file2, 'utf8');
    expect(content1).toBe('hotfixed content 1');
    expect(content2).toBe('hotfixed content 2');
  });
});
