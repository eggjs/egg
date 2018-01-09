'use strict';

const fs = require('fs');
const path = require('path');
const pedding = require('pedding');
const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/plugins/development.test.js', () => {
  afterEach(mm.restore);

  describe('development app', () => {
    let app;
    before(() => {
      mm.env('local');
      mm(process.env, 'EGG_LOG', 'none');
      app = utils.app('apps/development');
      return app.ready();
    });
    after(() => app.close());

    it('should ignore assets', done => {
      done = pedding(4, done);
      mm(app.logger, 'info', msg => {
        if (msg.match(/status /)) {
          throw new Error('should not log status');
        }
      });

      app.httpRequest()
        .get('/foo.js')
        .expect(200)
        .end(done);

      app.httpRequest()
        .get('/public/hello')
        .expect(404, done);

      app.httpRequest()
        .get('/assets/hello')
        .expect(404, done);

      app.httpRequest()
        .get('/__koa_mock_scene_toolbox/hello')
        .expect(404, done);
    });
  });

  describe('reload workers', () => {
    let app;
    const baseDir = utils.getFilepath('apps/reload-worker');
    const filepath = path.join(baseDir, 'app/controller/home.js');
    const body = fs.readFileSync(filepath);

    before(() => {
      mm.env('local');
      app = utils.cluster('apps/reload-worker');
      app.debug();
      app.coverage(false);
      return app.ready();
    });
    after(() => app.close());
    after(() => {
      fs.writeFileSync(filepath, body);
    });
  });
});
