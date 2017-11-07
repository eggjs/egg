'use strict';

const request = require('supertest');
const mm = require('egg-mock');
const runscript = require('runscript');
const path = require('path');
const utils = require('../utils');
const baseDir = path.join(__dirname, '../fixtures/apps/app-ts');
const fs = require('fs');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');

describe('test/ts/index.test.js', () => {
  before(function* () {
    yield runscript('tsc', { cwd: baseDir });
    const dest = path.join(baseDir, 'node_modules/egg');
    rimraf.sync(dest);
    mkdirp.sync(path.dirname(dest));
    fs.symlinkSync('../../../../../', dest);
  });

  describe('compiler code', () => {

    afterEach(mm.restore);
    let app;
    before(function* () {
      app = utils.app('apps/app-ts');
      yield app.ready();
    });
    after(function* () {
      yield app.close();
    });

    it('controller run ok', done => {
      request(app.callback())
        .get('/foo')
        .expect(200)
        .expect({ env: 'unittest' })
        .end(done);
    });
  });

});
