import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe, afterEach } from 'vitest';
import { escape, getFilepath, DELAY } from './utils.ts';

describe('test/not-reload.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    mm.env('local');
    mm(process.env, 'EGG_DEBUG', true);
    app = mm.cluster({
      baseDir: getFilepath('not-reload'),
      opt: {
        execArgv: ['--inspect'],
      },
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should not reload', async () => {
    const filepath = getFilepath('not-reload/app/service/a.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(DELAY);

    await fs.unlink(filepath);
    app.notExpect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath} change`))
    );
  });
});
