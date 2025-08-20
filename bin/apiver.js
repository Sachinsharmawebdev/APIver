#!/usr/bin/env node
const { program } = require('commander');
const init = require('../lib/init');
const commit = require('../lib/commit');
const createNewVersion = require('../lib/new');
const inspectFile = require('../lib/inspect');
const hotfixFile = require('../lib/hotfix');
const switchVersion = require('../lib/switch');
const copyVersion = require('../lib/copy');
const deleteVersion = require('../lib/delete');
const diffVersions = require('../lib/diff');
const showPatch = require('../lib/show');
const listVersions = require('../lib/list');
const { cleanup, setupAutoCleanup } = require('../lib/cleanup');

// Setup auto cleanup
setupAutoCleanup();

program
  .name('apiver')
  .description('APIver CLI - Advanced API Versioning Without Duplication')
  .version('1.0.0');

program
  .command('init <version>')
  .description('Initialize APIver with the first version')
  .action(init);

program
  .command('new <version> from <baseVersion>')
  .description('Create new version based on another')
  .action(createNewVersion);

program
  .command('switch <version>')
  .description('Switch working copy to a specific version')
  .action(switchVersion);

program
  .command('commit')
  .description('Commit changes to current version')
  .option('-m, --message <msg>', 'Commit message')
  .action((opts) => commit(opts.message));

program
  .command('inspect <version> <filePath>')
  .description('Inspect a file in a specific version')
  .option('--open', 'Open file in $EDITOR instead of printing')
  .action(inspectFile);

program
  .command('hotfix <arg1> [arg2] [arg3]')
  .description('Create a hotfix for a version (supports both legacy and new syntax)')
  .action((arg1, arg2, arg3, opts) => {
    console.log('DEBUG: CLI hotfix args:', arg1, arg2, arg3);
    return hotfixFile(arg1, arg2, arg3, opts);
  });

program
  .command('copy <sourceVersion> to <targetVersion>')
  .description('Copy code from one version to another')
  .option('--force', 'Overwrite target version if it exists')
  .action((sourceVersion, _, targetVersion, opts) => copyVersion(sourceVersion, targetVersion, opts));

program
  .command('delete <version>')
  .description('Delete a version if no other version depends on it')
  .action(deleteVersion);

program
  .command('diff <version1> <version2>')
  .description('Compare differences between two versions')
  .action(diffVersions);

program
  .command('show patch <patchId>')
  .description('Show details of a specific patch')
  .action(showPatch);

program
  .command('list')
  .description('List all available API versions')
  .action(listVersions);

program
  .command('cleanup')
  .description('Clean up unnecessary files and folders')
  .action(cleanup);

program.parse(process.argv);
