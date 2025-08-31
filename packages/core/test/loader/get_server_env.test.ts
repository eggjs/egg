import assert from 'node:assert/strict';

import { mm } from 'mm';

import { createApp, type Application } from '../helper.js';

describe('test/loader/get_server_env.test.ts', () => {
  let app: Application;
  afterEach(mm.restore);
  afterEach(() => app.close());

  it('should get from env EGG_SERVER_ENV', () => {
    mm(process.env, 'EGG_SERVER_ENV', 'prod');
    app = createApp('serverenv');
    assert.equal(app.loader.serverEnv, 'prod');
  });
  it('should use test when EGG_SERVER_ENV = "test "', () => {
    mm(process.env, 'EGG_SERVER_ENV', 'test ');
    app = createApp('serverenv');
    assert.equal(app.loader.serverEnv, 'test');
  });
  it('should use unittest when NODE_ENV = test', () => {
    mm(process.env, 'NODE_ENV', 'test');
    app = createApp('serverenv');
    assert.equal(app.loader.serverEnv, 'unittest');
  });

  it('should use prod when NODE_ENV = production', () => {
    mm(process.env, 'NODE_ENV', 'production');
    app = createApp('serverenv');
    assert.equal(app.loader.serverEnv, 'prod');
  });

  it('should use local when NODE_ENV is other', () => {
    mm(process.env, 'NODE_ENV', 'development');
    app = createApp('serverenv');
    assert.equal(app.loader.serverEnv, 'local');
  });

  it('should get from config/env', () => {
    mm(process.env, 'NODE_ENV', 'production');
    mm(process.env, 'EGG_SERVER_ENV', 'test');
    app = createApp('serverenv-file');
    assert.equal(app.loader.serverEnv, 'prod');
  });

  it('should get from options.env', () => {
    app = createApp('serverenv', { env: 'prod' });
    assert.equal(app.loader.serverEnv, 'prod');
  });

  it('should use options.env first', () => {
    mm(process.env, 'EGG_SERVER_ENV', 'test');
    app = createApp('serverenv-file', { env: 'development' });
    assert.equal(app.loader.serverEnv, 'development');
  });
});
