'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const pedding = require('pedding');
const mm = require('egg-mock');
const utils = require('../../utils');

describe.skip('test/lib/plugins/development.test.js', () => {
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

    it('should log status', done => {
      done = pedding(3, done);
      request(app.callback())
      .get('/foo')
      .expect(200, done);

      request(app.callback())
      .get('/not_exist')
      .expect(404, done);

      setTimeout(() => {
        const content = fs.readFileSync(
          utils.getFilepath('apps/development/logs/development/development-web.log'), 'utf8');
        content.should.containEql('GET /foo] status 200');
        content.should.containEql('GET /not_exist] status 404');
        done();
      }, 1000);
    });

    it('should ignore assets', done => {
      done = pedding(4, done);
      mm(app.logger, 'info', msg => {
        if (msg.match(/status /)) {
          throw new Error('should not log status');
        }
      });

      request(app.callback())
      .get('/foo.js')
      .expect(200)
      .end(done);

      request(app.callback())
      .get('/public/hello')
      .expect(404, done);

      request(app.callback())
      .get('/assets/hello')
      .expect(404, done);

      request(app.callback())
      .get('/__koa_mock_scene_toolbox/hello')
      .expect(404, done);
    });
  });

  describe('reload workers', () => {
    let app;
    const baseDir = utils.getFilepath('apps/reload-worker');
    const filepath = path.join(baseDir, 'app/controller/home.js');
    const body = fs.readFileSync(filepath);

    before(done => {
      mm.env('local');
      mm(process.env, 'EGG_LOG', 'none');
      app = utils.cluster('apps/reload-worker');
      app.debug();
      app.ready(done);
    });
    after(() => {
      fs.writeFileSync(filepath, body);
      app.close();
    });

    it('should reload when file changed', done => {
      fs.writeFileSync(filepath, 'module.exports = function*() { this.body = \'change\'; };');
      // 等待 app worker 重启
      setTimeout(() => {
        request(app.callback())
        .get('/')
        .expect('change', err => {
          app.expect('stdout', /App Worker#2:\d+ started/);
          done(err);
        });
      }, 10000);
    });
  });
});
