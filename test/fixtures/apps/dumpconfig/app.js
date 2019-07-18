const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sleep = require('mz-modules/sleep');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p));
}

module.exports = app => {
  const baseDir = app.config.baseDir;
  let json;

  app.config.dynamic = 1;
  app.beforeStart(function*() {
    // dumpConfig() dynamically
    json = readJson(path.join(baseDir, 'run/application_config.json'));
    assert(json.config.dynamic === 1, 'should dump in config');
    json = readJson(path.join(baseDir, 'run/agent_config.json'));
    assert(json.config.dynamic === 0, 'should dump in config');

    yield sleep(2000);
    app.config.dynamic = 2;
  });
};
