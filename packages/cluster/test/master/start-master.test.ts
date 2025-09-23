import { strict as assert } from 'node:assert';

import { describe, it, afterEach } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe('start master', () => {
  afterEach(() => app && app.close());

  it.skip('start success in local env', async () => {
    mm.env('local');
    app = cluster('apps/master-worker-started');
    await app.ready();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .notExpect('stdout', /\[master\] agent_worker#1:\d+ start with clusterPort:\d+/)
      .expect('code', 0)
      .end();
  });

  it.skip('start success in prod env', async () => {
    mm.env('prod');
    app = cluster('apps/mock-production-app').debug(false);
    await app.ready();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end((err: unknown) => {
        assert.ifError(err);
        console.log(app.stdout);
        console.log(app.stderr);
      });
  });

  it.skip('should print process.on.HOST while egg started', async () => {
    mm.env('prod');
    mm(process.env, 'HOST', 'xxx.com');
    app = cluster('apps/mock-production-app').debug(false);
    await app.ready();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started on http:\/\/xxx\.com:/)
      .expect('code', 0)
      .end((err: unknown) => {
        assert.ifError(err);
        console.log(app.stdout);
        console.log(app.stderr);
      });
  });

  it.skip('should not print process.on.HOST if it equals 0.0.0.0', async () => {
    mm.env('prod');
    mm(process.env, 'HOST', '0.0.0.0');
    app = cluster('apps/mock-production-app').debug(false);
    await app.ready();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:/)
      .expect('code', 0)
      .end((err: unknown) => {
        assert.ifError(err);
        console.log(app.stdout);
        console.log(app.stderr);
      });
  });
});
