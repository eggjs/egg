import { strict as assert } from 'node:assert';

import { app } from 'egg-mock/bootstrap';

describe('test/app/module/bar/controller/user.test.ts', () => {
  it('should GET /bar/user status 200', async () => {
    const res = await app
      .httpRequest()
      .get('/bar/user')
      .query({ userId: '20170901' });
    assert.equal(res.status, 200);
    assert.equal(res.text, 'hello, 20170901');
  });
});
