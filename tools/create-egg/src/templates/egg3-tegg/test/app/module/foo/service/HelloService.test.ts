import { strict as assert } from 'node:assert';

import { app } from 'egg-mock/bootstrap';

import { HelloService } from '@/module/foo/service/HelloService';

describe('test/app/module/foo/service/HelloService.test.ts', () => {
  it('should hello() work', async () => {
    // @ts-expect-error getEggObject no type defination
    const helloService = await app.getEggObject(HelloService);
    const msg = await helloService.hello('123456');
    assert.equal(msg, 'hello, 123456');
  });
});
