import { scheduler } from 'node:timers/promises';
import mm, { MockOption } from '@eggjs/mock';
import { request } from '@eggjs/supertest';

describe('example-ts-cluster/test/index.test.ts', () => {
  let app: any;
  before(async () => {
    app = mm.cluster({
      opt: {
        execArgv: ['--require', 'ts-node/register'],
      },
    } as MockOption);
    app.debug();
    await app.ready();
    await scheduler.wait(1000);
  });

  after(() => app.close());
  it('should work', async () => {
    const url = `http://127.0.0.1:${app.port}`;
    console.log('request %s', url);
    await request(url).get('/').expect('hi, egg').expect(200);
  });
});
