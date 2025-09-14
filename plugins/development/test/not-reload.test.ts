import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';
import { escape, getFilepath, DELAY } from './utils.js';

describe('test/not-reload.test.ts', () => {
  let app: MockApplication;
  before(() => {
    mm.env('local');
    mm(process.env, 'EGG_DEBUG', true);
    app = mm.cluster({
      baseDir: 'not-reload',
      opt: {
        execArgv: ['--inspect'],
      },
    });
    return app.ready();
  });
  after(() => app.close());
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
