import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Koa from '../../src/index.ts';

describe('app.toJSON()', () => {
  it('should work', () => {
    process.env.NODE_ENV = 'test';

    const app = new Koa();
    const obj = app.toJSON();

    assert.deepStrictEqual(
      {
        subdomainOffset: 2,
        proxy: false,
        env: 'test',
      },
      obj
    );
  });
});
