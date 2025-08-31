import assert from 'node:assert/strict';

import { mm } from 'mm';

import { createApp, getFilepath, type Application } from '../helper.js';

describe('test/loader/load_file.test.ts', () => {
  let app: Application;
  afterEach(mm.restore);
  afterEach(() => app.close());

  it('should load file', async () => {
    app = createApp('load_file');
    const exports = await app.loader.loadFile(getFilepath('load_file/obj.js'));
    assert.deepEqual(exports, { a: 1 });
    const exports2 = await app.loader.loadFile(getFilepath('load_file/obj'));
    assert.deepEqual(exports2, { a: 1 });
  });

  it('should load file when exports is function', async () => {
    app = createApp('load_file');
    const exports = await app.loader.loadFile(
      getFilepath('load_file/function.js'),
      1,
      2
    );
    assert.deepEqual(exports, [1, 2]);
  });

  it('should throw with filepath when file syntax error', async () => {
    await assert.rejects(async () => {
      app = createApp('syntaxerror');
      await app.loader.loadCustomApp();
    }, /error: Unexpected end of input/);
  });

  it('should load custom file', async () => {
    app = createApp('load_file');
    const buf = await app.loader.loadFile(getFilepath('load_file/no-js.yml'));
    let result = buf.toString();
    if (process.platform === 'win32') {
      result = result.replaceAll('\r\n', '\n');
    }
    assert.equal(result, '---\nmap:\n  a: 1\n  b: 2\n');
  });

  it('should load cjs module file which returns function returning a promise', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(
      getFilepath('load_file/promise_function.js')
    );
    assert.deepEqual(result, { clients: 'Test Config' });
  });

  it('should load cjs module file which returns async function', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(getFilepath('load_file/async.js'));
    assert.deepEqual(result, { clients: 'Test Config' });
  });

  it('should load compiled es module file', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(
      getFilepath('load_file/es-module-default.js')
    );
    assert(result.fn);
  });

  it('should load compiled es module file which default = null', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(
      getFilepath('load_file/es-module-default-null.js')
    );
    assert.equal(result, null);
  });

  it('should load compiled es module file which default = function returning a promise', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(
      getFilepath('load_file/es-module-default-promise.js')
    );
    assert.deepEqual(result, { clients: 'Test Config' });
  });

  it('should load compiled es module file which default = async function', async () => {
    app = createApp('load_file');
    const result = await app.loader.loadFile(
      getFilepath('load_file/es-module-default-async.js')
    );
    assert.deepEqual(result, { clients: 'Test Config' });
  });
});
