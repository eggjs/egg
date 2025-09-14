import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';
import { createApp, type MockApplication } from '../../utils.js';

describe('test/lib/plugins/security.test.ts', () => {
  afterEach(mm.restore);

  describe('security.csrf = false', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = createApp('apps/csrf-disable');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should not check csrf', async () => {
      await app
        .httpRequest()
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user',
          name: 'fengmk2',
        });
    });
  });

  describe('security.csrf = true', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = createApp('apps/csrf-enable');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should check csrf', async () => {
      await app
        .httpRequest()
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(403)
        .expect(/missing csrf token/);
    });
  });

  describe('security.csrfIgnore', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = createApp('apps/csrf-ignore');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should not check csrf on /api/*', async () => {
      await app
        .httpRequest()
        .post('/api/user')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user',
          name: 'fengmk2',
        });
    });

    it('should not check csrf on /api/*.json', async () => {
      await app
        .httpRequest()
        .post('/api/user.json')
        .send({ name: 'fengmk2' })
        .expect(200)
        .expect({
          url: '/api/user.json',
          name: 'fengmk2',
        });
    });

    it('should check csrf on other.json', async () => {
      // use prod env to ignore extends properties like frames
      mm(app.config, 'env', 'prod');
      await app
        .httpRequest()
        .post('/apiuser.json')
        .set('accept', 'application/json')
        .send({ name: 'fengmk2' })
        .expect({
          message: 'missing csrf token',
        })
        .expect(403);
    });

    it('should check csrf on other', async () => {
      await app
        .httpRequest()
        .post('/apiuser')
        .send({ name: 'fengmk2' })
        .expect(/missing csrf token/)
        .expect(403);
    });
  });
});
