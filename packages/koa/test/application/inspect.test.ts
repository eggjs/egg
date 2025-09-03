import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import util from 'node:util';

import Koa from '../../src/index.ts';

describe('app.inspect()', () => {
  process.env.NODE_ENV = 'test';
  const app = new Koa();

  it('should work', () => {
    const str = util.inspect(app);
    assert.strictEqual(
      "{ subdomainOffset: 2, proxy: false, env: 'test' }",
      str
    );
  });

  it('should return a json representation', () => {
    assert.deepStrictEqual(
      { subdomainOffset: 2, proxy: false, env: 'test' },
      app.inspect()
    );
  });
});
