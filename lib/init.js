const fs = require('fs-extra');
const chalk = require('chalk');
const path = require('path');

module.exports = function init(version) {
  const apiverDir = path.join(process.cwd(), '.APIver', 'versions');
  const activePath = path.join(process.cwd(), 'versions', 'active');

  fs.ensureDirSync(apiverDir);
  fs.ensureDirSync(activePath);

  const versionDir = path.join(apiverDir, version);
  if (fs.existsSync(versionDir)) {
    console.log(chalk.red(`Version ${version} already exists.`));
    process.exit(1);
  }

  fs.ensureDirSync(versionDir);

  // Create empty active version with .version metadata
  fs.writeFileSync(path.join(activePath, '.version'), version, 'utf-8');
  fs.copySync(activePath, versionDir);

  console.log(chalk.green(`Initialized APIver with version ${version}`));
};
