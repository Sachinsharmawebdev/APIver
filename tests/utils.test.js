const { encryptAndCompress, decryptAndDecompress } = require('../lib/utils/crypto');
const { generatePatch, applyPatch } = require('../lib/utils/diff');
const fs = require('fs-extra');
const path = require('path');

describe('Utility Tests', () => {
  beforeAll(() => {
    process.env.APIVER_KEY = 'test-key-12345678901234567890123456789012';
  });

  describe('Crypto Utils', () => {
    test('should encrypt and decrypt data correctly', () => {
      const original = Buffer.from('Hello, APIver!');
      const encrypted = encryptAndCompress(original);
      const decrypted = decryptAndDecompress(encrypted);
      
      expect(decrypted.toString()).toBe('Hello, APIver!');
    });

    test('should handle large data', () => {
      const largeData = Buffer.alloc(10000, 'A');
      const encrypted = encryptAndCompress(largeData);
      const decrypted = decryptAndDecompress(encrypted);
      
      expect(decrypted.length).toBe(10000);
      expect(decrypted.toString()).toBe(largeData.toString());
    });
  });

  describe('Diff Utils', () => {
    const testDir = path.join(__dirname, 'diff-test');

    beforeEach(async () => {
      await fs.ensureDir(testDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    test('should generate and apply patches correctly', () => {
      const baseDir = path.join(testDir, 'base');
      const newDir = path.join(testDir, 'new');
      
      fs.ensureDirSync(baseDir);
      fs.ensureDirSync(newDir);
      
      fs.writeFileSync(path.join(baseDir, 'test.txt'), 'Hello\nWorld');
      fs.writeFileSync(path.join(newDir, 'test.txt'), 'Hello\nAPIver\nWorld');
      
      const patch = generatePatch(baseDir, newDir);
      expect(patch.changes).toHaveLength(1);
      expect(patch.changes[0].file).toBe('test.txt');
      
      const targetDir = path.join(testDir, 'target');
      fs.copySync(baseDir, targetDir);
      
      applyPatch(targetDir, patch);
      
      const result = fs.readFileSync(path.join(targetDir, 'test.txt'), 'utf8');
      expect(result).toContain('APIver');
    });

    test('should handle file deletions', () => {
      const baseDir = path.join(testDir, 'base');
      const newDir = path.join(testDir, 'new');
      
      fs.ensureDirSync(baseDir);
      fs.ensureDirSync(newDir);
      
      fs.writeFileSync(path.join(baseDir, 'delete-me.txt'), 'to be deleted');
      
      const patch = generatePatch(baseDir, newDir);
      expect(patch.deletes).toHaveLength(1);
      expect(patch.deletes[0]).toBe('delete-me.txt');
    });
  });
});