const fs = require('fs-extra');
const path = require('path');

// Set required environment variables
// Set required environment variables with longer length (exactly 32 chars)
process.env.APIVER_KEY = '12345678901234567890123456789012';
process.env.APIVER_SECRET = '12345678901234567890123456789012';

beforeAll(() => {
  // Ensure environment variables are set before any tests run
  if (!process.env.APIVER_KEY || !process.env.APIVER_SECRET) {
    console.error('Environment variables not set properly!');
    process.exit(1);
  }
});

beforeEach(async () => {
  const testDirs = [
    'test-workspace',
    'integration-test',
    'production-test'
  ];
  
  for (const dir of testDirs) {
    const testPath = path.join(__dirname, dir);
    if (await fs.pathExists(testPath)) {
      try {
        await fs.remove(testPath);
      } catch (error) {
        // Handle EBUSY errors by waiting and retrying
        await new Promise(resolve => setTimeout(resolve, 200));
        await fs.remove(testPath);
      }
    }
  }
});

// Add more robust file cleanup function
async function safeRemoveDir(dirPath, retries = 3, delay = 300) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fs.remove(dirPath);
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

afterEach(async () => {
  // Add longer delay to prevent EBUSY errors
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const testDirs = [
    'test-workspace',
    'integration-test',
    'production-test'
  ];
  
  for (const dir of testDirs) {
    const testPath = path.join(__dirname, dir);
    if (await fs.pathExists(testPath)) {
      await safeRemoveDir(testPath);
    }
  }
});

// Ensure Jest runs in test mode
process.env.NODE_ENV = 'test';