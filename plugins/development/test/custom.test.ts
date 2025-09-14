import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';
import { getFilepath, DELAY } from './utils.js';

describe('test/custom.test.ts', () => {
  let app: MockApplication;
  before(() => {
    mm.env('local');
    app = mm.cluster({
      baseDir: 'custom',
    });
    app.debug();
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should reload with custom detect', async () => {
    if (process.env.CI) {
      return;
    }
    let filepath;
    filepath = getFilepath('custom/app/service/a.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(DELAY);

    await fs.unlink(filepath);
    app.expect('stdout', /a\.js/);

    filepath = getFilepath('custom/app/service/b.ts');
    await fs.writeFile(filepath, '');
    await scheduler.wait(DELAY);

    await fs.unlink(filepath);
    app.notExpect('stdout', /b\.ts/);
  });
});
