'use strict';

const assert = require('assert');
const request = require('supertest');
const mm = require('egg-mock');
const runscript = require('runscript');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mz-modules/mkdirp');
const rimraf = require('mz-modules/rimraf');
const utils = require('../utils');
const baseDir = path.join(__dirname, '../fixtures/apps/app-ts');

describe('test/ts/index.test.js', () => {
  before(async () => {
    await runscript(`tsc -p ${baseDir}/tsconfig.json`, { cwd: baseDir });
    const dest = path.join(baseDir, 'node_modules/egg');
    await rimraf(dest);
    await mkdirp(path.dirname(dest));
    fs.symlinkSync('../../../../../', dest);
  });

  describe('compiler code', () => {
    afterEach(mm.restore);
    let app;
    before(async () => {
      app = utils.app('apps/app-ts');
      await app.ready();
    });
    after(async () => {
      await app.close();
      assert.deepStrictEqual(app._app.stages, [
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
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
