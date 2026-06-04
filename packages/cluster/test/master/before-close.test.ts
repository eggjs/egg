import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import { cluster } from '../utils.ts';

let app: MockApplication;

afterEach(mm.restore);

describe.skipIf(process.platform === 'win32')('beforeClose', () => {
  it('should wait app close', async () => {
    mm.env('local');
    app = cluster('apps/before-close');
    // app.debug();
    await app.ready();

    await app.close();
    await scheduler.wait(5000);

    app.expect('stdout', /app closing/);
    app.expect('stdout', /app closed/);
    app.expect('stdout', /agent closing/);
    app.expect('stdout', /agent closed/);
  });
});
