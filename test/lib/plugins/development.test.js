const fs = require('fs');
const path = require('path');
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

    it('should ignore assets', async () => {
      mm(app.logger, 'info', msg => {
        if (msg.match(/status /)) {
          throw new Error('should not log status');
        }
      });

      await app.httpRequest()
        .get('/foo.js')
        .expect(200);

      await app.httpRequest()
        .get('/public/hello')
        .expect(404);

      await app.httpRequest()
        .get('/assets/hello')
        .expect(404);

      await app.httpRequest()
        .get('/__koa_mock_scene_toolbox/hello')
        .expect(404);
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
