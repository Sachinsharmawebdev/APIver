const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

module.exports = function listVersions() {
  const apiverRoot = path.join(process.cwd(), '.apiver');
  const metaPath = path.join(apiverRoot, 'meta.json');
  const currentVersionFile = path.join(apiverRoot, 'current-version');

  if (!fs.existsSync(metaPath)) {
    console.error(chalk.red('No .apiver/meta.json found. Run init first.'));
    process.exit(1);
  }

  const meta = fs.readJsonSync(metaPath);
  const versions = Object.keys(meta.versions || {});
  let activeVersion = null;
  if (fs.existsSync(currentVersionFile)) {
    activeVersion = fs.readFileSync(currentVersionFile, 'utf8').trim();
  }

  if (versions.length === 0) {
    console.log(chalk.yellow('No versions found.'));
    return;
  }

  console.log(chalk.bold('Available API Versions:'));
  versions.forEach(ver => {
    if (ver === activeVersion) {
      console.log(chalk.green(`* ${ver} (active)`));
    } else {
      console.log(`  ${ver}`);
    }
  });
};
