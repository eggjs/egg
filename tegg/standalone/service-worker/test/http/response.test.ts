import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp.ts';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils.ts';

describe('standalone/service-worker/test/http/response.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('http'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should return Response work', async () => {
    await httpRequest(server)
      .get('/api/response')
      .expect(500, 'full response')
      .expect('Content-Type', 'text/plain')
      .expect('x-custom-header', 'custom-value');
  });

  it('should return 204 with no content', async () => {
    await httpRequest(server)
      .get('/api/null-body')
      .expect(204, '');

    await httpRequest(server)
      .get('/api/null-body?nil=1')
      .expect(204, '');
  });
});
