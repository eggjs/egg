import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';

import { createApp, MockApplication } from '../../utils.ts';

describe('test/lib/plugins/session.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = createApp('apps/koa-session');
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(mm.restore);

  it('should work when userId change', async () => {
    app.mockContext({
      userId: 's1',
    });
    let res = await app
      .httpRequest()
      .get('/?uid=1')
      .expect({
        userId: 's1',
        sessionUid: '1',
        uid: '1',
      })
      .expect(200);

    assert(res.headers['set-cookie']);
    const cookie = (res.headers['set-cookie'] as any).join(';');
    assert(/EGG_SESS=[\w-]+/.test(cookie));

    // userId 不变，还是读取到上次的 session 值
    app.mockContext({
      userId: 's1',
    });
    res = await app
      .httpRequest()
      .get('/?uid=2&userId=s1')
      .set('Cookie', cookie)
      .expect({
        userId: 's1',
        sessionUid: '1',
        uid: '2',
      })
      .expect(200);
    assert(!res.headers['set-cookie']);

    // userId change, session still not change
    app.mockContext({
      userId: 's2',
    });
    await app
      .httpRequest()
      .get('/?uid=2')
      .set('Cookie', cookie)
      .expect({
        userId: 's2',
        sessionUid: '1',
        uid: '2',
      })
      .expect(res => {
        assert(!res.headers['set-cookie']);
      })
      .expect(200);

    await app
      .httpRequest()
      .get('/clear')
      .set('Cookie', cookie)
      .expect('set-cookie', /EGG_SESS=;/);
  });
});
