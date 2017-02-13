#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const fs = require('mz/fs');
const { existsSync } = require('fs');
const mkdirp = require('mz-modules/mkdirp');
const runscript = require('runscript');
const debug = require('debug')('jsdoc');

const cwd = process.cwd();
const tmp = path.join(os.tmpdir(), 'jsdoc');

module.exports = function* (target) {
  const config = yield getConfig();
  yield runscript(`jsdoc -c ${config} -d ${target}`);
};

class Source extends Set {
  constructor() {
    super();

    for (const unit of this.getLoadUnits()) {
      this.add(path.join(unit.path, 'app'));
      this.add(path.join(unit.path, 'config'));
      this.add(path.join(unit.path, 'app.js'));
      this.add(path.join(unit.path, 'agent.js'));
      try {
        const entry = require.resolve(unit.path);
        this.add(entry);
      } catch (_) {
        // nothing
      }
    }
  }

  getLoadUnits() {
    const EGG_LOADER = Symbol.for('egg#loader');
    const EGG_PATH = Symbol.for('egg#eggPath');
    const Application = require(cwd).Application;
    const AppWorkerLoader = require(cwd).AppWorkerLoader;

    class JsdocLoader extends AppWorkerLoader {
      // only load plugin
      // loadConfig() { this.loadPlugin(); }
      // do nothing
      load() {}
    }

    class JsdocApplication extends Application {
      get [EGG_LOADER]() {
        return JsdocLoader;
      }
      get [EGG_PATH]() {
        return cwd;
      }
    }

    const app = new JsdocApplication({
      baseDir: tmp,
    });
    const loadUnits = app.loader.getLoadUnits();
    app.close();
    return loadUnits;
  }

  add(file) {
    if (existsSync(file)) {
      debug('add %s', file);
      super.add(file);
    }
  }
}

function* getConfig() {
  yield mkdirp(tmp);

  const configPath = path.join(tmp, 'jsdoc.json');
  const packagePath = path.join(tmp, 'package.json');
  yield fs.writeFile(packagePath, '{"name": "jsdoc"}');

  const source = new Source();
  const config = {
    plugins: [ 'plugins/markdown' ],
    markdown: {
      tags: [ '@example' ],
    },
    source: {
      include: [ ...source ],
      // excludePattern: 'node_modules',
    },
    opts: {
      recurse: true,
      template: path.join(__dirname, 'template'),
    },
    templates: {
      default: {
        outputSourceFiles: true,
      },
    },
  };
  yield fs.writeFile(configPath, JSON.stringify(config));
  return configPath;
}
