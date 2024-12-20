const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { scheduler } = require('node:timers/promises');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p));
}

module.exports = app => {
  const baseDir = app.config.baseDir;
  let json;

  app.config.dynamic = 1;
  app.beforeStart(async function() {
    // dumpConfig() dynamically
    json = readJSON(path.join(baseDir, 'run/application_config.json'));
    assert(json.config.dynamic === 1, 'should dump in config');
    json = readJSON(path.join(baseDir, 'run/agent_config.json'));
    assert(json.config.dynamic === 0, 'should dump in config');

    await scheduler.wait(2000);
    app.config.dynamic = 2;
  });
};
