#!/usr/bin/env node

'use strict';

const fs = require('mz/fs');
const co = require('co');
const rimraf = require('rimraf');
const runscript = require('runscript');
const ghpages = require('gh-pages');

// The branch that pushing document
const BRANCH = 'gh-pages';
const DOC_PUBLISHER_NAME = 'Auto Doc Publisher';
const DOC_PUBLISHER_EMAIL = 'docs@eggjs.org';
process.env.PATH += `:${process.cwd()}/docs/node_modules/.bin`;

const command = process.argv[2];

co(function* () {
  const exists = yield fs.exists('node_modules');
  if (!exists) {
    throw new Error('should run `npm install` first');
  }

  console.log('Copying CONTRIBUTING.md');
  yield copyContributing('CONTRIBUTING.md', 'docs/source/en/contributing.md');
  yield copyContributing('CONTRIBUTING.zh-CN.md', 'docs/source/zh-cn/contributing.md');

  yield rm('docs/public');
  yield runscript('npminstall', { cwd: 'docs' });

  switch (command) {
    case 'server':
      yield runscript('hexo --cwd docs server -l');
      break;
    case 'build':
      yield runscript('hexo --cwd docs generate --force');
      break;
    case 'deploy':
      yield runscript('hexo --cwd docs generate --force');
      yield deploy();
      break;
    default:
  }
}).catch(err => {
  console.error(err.stack);
  process.exit(1);
});

function* deploy() {
  console.log('Pushing to %s', BRANCH);
  let repo = yield runscript('git config remote.origin.url', { stdio: 'pipe' });
  repo = repo.stdout.toString().slice(0, -1);
  if (/^http/.test(repo)) {
    repo = repo.replace('https://github.com/', 'git@github.com:');
  }
  yield publish('docs/public', {
    logger(message) { console.log(message); },
    user: {
      name: DOC_PUBLISHER_NAME,
      email: DOC_PUBLISHER_EMAIL,
    },
    branch: BRANCH,
    repo,
  });
}

function* copyContributing(src, target) {
  let content = yield fs.readFile(src, 'utf8');
  content = content.replace(/^#\s*(.*?)\n/, 'title: $1\n---\n');
  yield fs.writeFile(target, content);
}

function rm(dir) {
  return done => rimraf(dir, done);
}

function publish(basePath, options) {
  return done => ghpages.publish(basePath, options, done);
}
