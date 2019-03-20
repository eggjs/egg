'use strict';

const assert = require('assert');
const request = require('supertest');
const mm = require('egg-mock');
const coffee = require('coffee');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mz-modules/mkdirp');
const rimraf = require('mz-modules/rimraf');
const utils = require('../utils');
const baseDir = path.join(__dirname, '../fixtures/apps/app-ts');

describe('test/ts/index.test.js', () => {
  before(async () => {
    await coffee.fork(
      require.resolve('typescript/bin/tsc'),
      [ '-p', path.resolve(__dirname, '../fixtures/apps/app-ts/tsconfig.json') ]
    )
      // .debug()
      .expect('code', 0)
      .end();

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
        'configWillLoad',
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

    it('controller of app.router run ok', done => {
      request(app.callback())
        .get('/test')
        .expect(200)
        .expect({ env: 'unittest' })
        .end(done);
    });

    it('should compile with esModuleInterop without error', async () => {
      await coffee.fork(
        require.resolve('typescript/bin/tsc'),
        [ '-p', path.resolve(__dirname, '../fixtures/apps/app-ts-esm/tsconfig.json') ]
      )
        // .debug()
        .expect('code', 0)
        .end();
    });
  });

  describe('type check', () => {
    it('should compile type-check ts without error', async () => {
      await coffee.fork(
        require.resolve('typescript/bin/tsc'),
        [ '-p', path.resolve(__dirname, '../fixtures/apps/app-ts-type-check/tsconfig.json') ]
      )
        // .debug()
        .expect('code', 0)
        .end();
    });

    it('should throw error with type-check-error ts', async () => {
      await coffee.fork(
        require.resolve('typescript/bin/tsc'),
        [ '-p', path.resolve(__dirname, '../fixtures/apps/app-ts-type-check/tsconfig-error.json') ]
      )
        // .debug()
        .expect('stdout', /Property 'ctx' is protected/)
        .expect('stdout', /Property 'localsCheckAny' does not exist on type 'string'/)
        .expect('stdout', /Property 'configKeysCheckAny' does not exist on type 'string'/)
        .expect('stdout', /Property 'appCheckAny' does not exist on type 'Application'/)
        .expect('stdout', /Property 'serviceLocalCheckAny' does not exist on type 'string'/)
        .expect('stdout', /Property 'serviceConfigCheckAny' does not exist on type 'string'/)
        .expect('stdout', /Property 'serviceAppCheckAny' does not exist on type 'Application'/)
        .notExpect('stdout', /Cannot find module 'yadan'/)
        .expect('stdout', /Expected 1 arguments, but got 0\./)
        .expect('stdout', /Expected 0-1 arguments, but got 2\./)
        .expect('code', 2)
        .end();
    });
  });
});
