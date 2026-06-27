import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp.ts';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils.ts';

describe('standalone/service-worker/test/http/inject.test.ts', () => {
  let app: ServiceWorkerApp;
  let server: Server;

  before(async function() {
    if (StandaloneTestUtil.skipOnNode()) {
      return this.skip();
    }
    ({ app, server } = await TestUtils.createFetchApp('http-inject'));
  });

  after(async () => {
    server?.close();
    await app?.destroy();
  });

  it('should inject service and list users', async () => {
    await httpRequest(server)
      .get('/api/users/')
      .expect(200, [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
  });

  it('should inject service and find user by id', async () => {
    await httpRequest(server)
      .get('/api/users/42')
      .expect(200, {
        id: '42',
        name: 'user-42',
      });
  });
});
