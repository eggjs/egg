'use strict';

const utils = require('../utils');
const assert = require('assert');
const path = require('path');

describe('test/lib/start.test.js', () => {
  describe('start', () => {
    const baseDir = utils.getFilepath('apps/demo');
    let app;
    before(async () => {
      app = await utils.singleProcessApp('apps/demo');
    });
    after(() => app.close());

    it('should dump config and plugins', () => {
      let json = require(path.join(baseDir, 'run/agent_config.json'));
      assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
      assert(json.config.name === 'demo');
      assert(json.config.tips === 'hello egg');
      json = require(path.join(baseDir, 'run/application_config.json'));
      checkApp(json);

      const dumpped = app.dumpConfigToObject();
      checkApp(dumpped.config);

      function checkApp(json) {
        assert(/\d+\.\d+\.\d+/.test(json.plugins.onerror.version));
        assert(json.config.name === 'demo');
        // should dump dynamic config
        assert(json.config.tips === 'hello egg started');
      }
    });

    it('should request work', async () => {
      await app.httpRequest().get('/protocol')
        .expect(200)
        .expect('http');

      await app.httpRequest().get('/class-controller')
        .expect(200)
        .expect('this is bar!');
    });
  });
});
