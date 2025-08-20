const { loadVersion, clearCache } = require('../lib/runtimeLoader');
const fs = require('fs');
const path = require('path');

describe('Simple Array Loading Test', () => {
  const testDir = path.join(__dirname, 'simple_array_test');
  const originalCwd = process.cwd();
  
  beforeEach(() => {
    clearCache(); // Clear cache before each test
    
    // Create clean test directory without .apiver
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir);
    process.chdir(testDir);
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('loadVersion function exists and handles arrays', () => {
    expect(typeof loadVersion).toBe('function');
    
    // Test that it doesn't crash with array input (will fail due to no .apiver)
    expect(() => loadVersion(['v1', 'v2'])).toThrow('apiver meta not found');
    expect(() => loadVersion('v1')).toThrow('apiver meta not found');
  });

  test('loadVersion array vs single parameter behavior', () => {
    // Both should throw the same error when no .apiver exists
    let arrayError, singleError;
    
    try {
      loadVersion(['v1']);
    } catch (e) {
      arrayError = e.message;
    }
    
    try {
      loadVersion('v1');
    } catch (e) {
      singleError = e.message;
    }
    
    expect(arrayError).toBe(singleError);
    expect(arrayError).toContain('apiver meta not found');
  });

  test('loadVersion handles empty array', () => {
    const result = loadVersion([]);
    expect(result).toEqual({});
  });

  test('clearCache function works', () => {
    expect(typeof clearCache).toBe('function');
    clearCache(); // Should not throw
  });
});