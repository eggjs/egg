import { strict as assert } from 'node:assert';

import { describe, it, beforeAll } from 'vitest';
import { request } from '@eggjs/supertest';

import { getFilepath } from './helper.js';
// @ts-ignore
import { Application } from './fixtures/egg-esm/index.js';

describe('test/support-typescript.test.ts', () => {
  let app: Application;
  beforeAll(async () => {
    app = new Application({
      baseDir: getFilepath('helloworld-ts'),
      type: 'application',
    });
    await app.loader.loadAll();
  });

  it('should ignore *.js when *.ts same file exists', async () => {
    const res = await request(app.callback()).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.text, 'Hello World');
  });
});
