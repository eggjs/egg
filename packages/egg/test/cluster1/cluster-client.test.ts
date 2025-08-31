import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { mm } from '@eggjs/mock';
import { MockApplication, createApp, singleProcessApp } from '../utils.js';

const innerClient = Symbol.for('ClusterClient#innerClient');

describe('test/cluster1/cluster-client.test.ts', () => {
  let app: MockApplication;
  describe('common mode', () => {
    before(async () => {
      mm.consoleLevel('NONE');
      app = createApp('apps/cluster_mod_app');
      await app.ready();
    });
    after(async () => {
      await app.close();
      const agentInnerClient = app.agent.registryClient[innerClient];
      assert.equal(agentInnerClient._realClient.closed, true);
      await mm.restore();
    });

    it('should publish & subscribe', async () => {
      await app.httpRequest()
        .post('/publish')
        .send({ value: 'www.testme.com' })
        .expect('ok')
        .expect(200);
      await scheduler.wait(500);
      await app.httpRequest()
        .get('/getHosts')
        .expect('www.testme.com:20880')
        .expect(200);
    });

    it('should get default cluster response timeout', async () => {
      const res = await app.httpRequest()
        .get('/getDefaultTimeout')
        .expect(200);
      assert.equal(res.text, '60000');
    });

    it('should get overwrite cluster response timeout', async () => {
      const res = await app.httpRequest()
        .get('/getOverwriteTimeout')
        .expect(200);
      assert.equal(res.text, '1000');
    });
  });

  describe('single process mode', () => {
    before(async () => {
      mm.consoleLevel('NONE');
      app = await singleProcessApp('apps/cluster_mod_app');
    });
    after(async () => {
      await app.close();
      const agentInnerClient = app.agent.registryClient[innerClient];
      assert.equal(agentInnerClient._realClient.closed, true);
      mm.restore();
    });

    it('should publish & subscribe', async () => {
      await app.httpRequest()
        .post('/publish')
        .send({ value: 'www.testme.com' })
        .expect('ok')
        .expect(200);
      await scheduler.wait(500);
      await app.httpRequest()
        .get('/getHosts')
        .expect('www.testme.com:20880')
        .expect(200);
    });

    it('should get default cluster response timeout', async () => {
      const res = await app.httpRequest()
        .get('/getDefaultTimeout')
        .expect(200);
      assert.equal(res.text, '60000');
    });

    it('should get overwrite cluster response timeout', async () => {
      const res = await app.httpRequest()
        .get('/getOverwriteTimeout')
        .expect(200);
      assert.equal(res.text, '1000');
    });
  });
});
