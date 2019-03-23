'use strict';

const utils = require('../utils');
const assert = require('assert');
const path = require('path');

let app;

describe('test/lib/start.test.js', () => {
  afterEach(() => app.close());

  describe('start', () => {
    it('should dump config and plugins', async () => {
      app = await utils.singleProcessApp('apps/demo');
      const baseDir = utils.getFilepath('apps/demo');
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
      app = await utils.singleProcessApp('apps/demo');
      await app.httpRequest().get('/protocol')
        .expect(200)
        .expect('http');

      await app.httpRequest().get('/class-controller')
        .expect(200)
        .expect('this is bar!');
    });

    it('should env work', async () => {
      app = await utils.singleProcessApp('apps/demo', { env: 'prod' });
      assert(app.config.env === 'prod');
    });

    it('should ignoreWarng work', async () => {
      app = await utils.singleProcessApp('apps/demo', { ignoreWaring: true });
    });
  });

  describe('custom framework work', () => {
    it('should work with options.framework', async () => {
      app = await utils.singleProcessApp('apps/demo', { framework: path.join(__dirname, '../fixtures/custom-egg') });
      assert(app.customEgg);

      await app.httpRequest().get('/protocol')
        .expect(200)
        .expect('http');

      await app.httpRequest().get('/class-controller')
        .expect(200)
        .expect('this is bar!');
    });

    it('should work with package.egg.framework', async () => {
      app = await utils.singleProcessApp('apps/custom-framework-demo');
      assert(app.customEgg);

      await app.httpRequest().get('/protocol')
        .expect(200)
        .expect('http');

      await app.httpRequest().get('/class-controller')
        .expect(200)
        .expect('this is bar!');
    });
  });
});
