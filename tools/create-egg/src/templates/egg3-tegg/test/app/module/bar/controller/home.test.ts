import { strict as assert } from 'node:assert';

import { app } from 'egg-mock/bootstrap';

describe('test/app/module/bar/controller/home.test.ts', () => {
  it('should GET / status 200', async () => {
    const res = await app.httpRequest().get('/');
    assert.equal(res.status, 200);
    assert.equal(res.text, 'hello egg');
  });
});
