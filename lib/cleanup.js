const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Clean up unnecessary files and folders created by APIver
 */
function cleanup() {
  const cwd = process.cwd();
  const apiverRoot = path.join(cwd, '.apiver');
  
  // Remove unnecessary .apiver/versions folder if it exists
  const versionsDir = path.join(apiverRoot, 'versions');
  if (fs.existsSync(versionsDir)) {
    console.log(chalk.yellow('🧹 Cleaning up unnecessary .apiver/versions folder...'));
    fs.removeSync(versionsDir);
    console.log(chalk.green('✅ Removed .apiver/versions folder'));
  }
  
  // Clean up any temporary files
  const tempFiles = [
    path.join(apiverRoot, 'tmp_hotfix_*'),
    path.join(cwd, 'versions', 'tmp_*')
  ];
  
  tempFiles.forEach(pattern => {
    const dir = path.dirname(pattern);
    const filename = path.basename(pattern);
    
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.startsWith(filename.replace('*', ''))) {
          const filePath = path.join(dir, file);
          fs.removeSync(filePath);
          console.log(chalk.green(`✅ Removed temporary file: ${filePath}`));
        }
      });
    }
  });
  
  console.log(chalk.green('🎉 Cleanup completed!'));
}

/**
 * Auto cleanup on process exit
 */
function setupAutoCleanup() {
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

module.exports = { cleanup, setupAutoCleanup };