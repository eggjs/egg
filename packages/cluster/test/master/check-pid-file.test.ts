import path from 'node:path';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { rm } from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { describe, it, afterEach, beforeEach } from 'vitest';
import { mm, MockApplication } from '@eggjs/mock';

import { cluster, getFilepath } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe.skipIf(process.platform === 'win32').sequential('pid file', () => {
  const runDir = getFilepath('apps/master-worker-started/run');
  const pidFile = path.join(runDir, './pid');

  beforeEach(() => rm(runDir, { force: true, recursive: true }));
  afterEach(() => app.close());

  it('master should write pid file and delete', async () => {
    app = cluster('apps/master-worker-started', { pidFile } as any);
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    assert(fs.existsSync(pidFile));
    const pid = fs.readFileSync(pidFile, 'utf-8');
    assert(pid === String(app.process.pid));

    app.proc.kill('SIGTERM');
    await scheduler.wait(6000);
    app.expect('stdout', /\[master\] exit with code:0/);
    assert(!fs.existsSync(pidFile));
  });

  it.skip('master should ignore fail when delete pid file ', async () => {
    app = cluster('apps/master-worker-started', { pidFile } as any);
    // app.debug();

    await app
      .expect('stdout', /egg start/)
      // .expect('stdout', /egg started/)
      .expect('code', 0)
      .end();

    assert(fs.existsSync(pidFile));
    const pid = fs.readFileSync(pidFile, 'utf-8');
    assert(pid === String(app.process.pid));

    // delete
    fs.unlinkSync(pidFile);

    app.proc.kill('SIGTERM');
    await scheduler.wait(6000);
    app.expect('stdout', /\[master\] exit with code:0/);
    assert(!fs.existsSync(pidFile));
  });
});
