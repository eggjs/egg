import assert from 'node:assert';
import { Server } from 'node:http';
import httpRequest from 'supertest';
import { ServiceWorkerApp } from '../../src/ServiceWorkerApp.ts';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';
import { TestUtils } from '../Utils.ts';
import { httpAdviceExecutionLog } from '../fixtures/http/HttpTestAdvice.ts';

describe('standalone/service-worker/test/http/router.test.ts', () => {
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

  it('should get work', async () => {
    await httpRequest(server)
      .get('/hello')
      .expect(200, 'hello');
  });

  it('should post work', async () => {
    await httpRequest(server)
      .post('/echo')
      .send({ name: 'tegg' })
      .expect(200, {
        success: true,
        data: { name: 'tegg' },
      });
  });

  it('should return 404 with invalid path', async () => {
    await httpRequest(server)
      .get('/invalid-path')
      .expect(404);
  });

  it('should execute AOP middleware for HTTP controller', async () => {
    httpAdviceExecutionLog.length = 0;

    await httpRequest(server)
      .get('/middleware/aop')
      .expect(200, { msg: 'hello' });

    assert(httpAdviceExecutionLog.length > 0, 'middleware should have been executed');
    assert(httpAdviceExecutionLog.includes('before'), 'middleware before should have been called');
    assert(httpAdviceExecutionLog.includes('after'), 'middleware after should have been called');
  });
});
