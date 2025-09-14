import fs from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe, afterEach } from 'vitest';

import { escape, getFilepath, DELAY } from './utils.ts';

describe('test/development.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    mm.env('local');
    app = mm.cluster({
      baseDir: getFilepath('development'),
    });
    return app.ready();
  });
  afterAll(() => app.close());
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should reload when change service', async () => {
    const filepath = getFilepath('development/app/service/a.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);
    await fs.rm(filepath, { force: true });
    await scheduler.wait(5000);
    app.expect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath}`))
    );
  });

  it('should not reload when change assets', async () => {
    const filepath = getFilepath('development/app/assets/b.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);
    await fs.rm(filepath, { force: true });
    await scheduler.wait(5000);
    app.notExpect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath}`))
    );
  });

  it('should reload once when 2 file change', async () => {
    if (process.env.CI) {
      return;
    }
    const filepath = getFilepath('development/app/service/c.js');
    const filepath1 = getFilepath('development/app/service/d.js');
    await fs.writeFile(filepath, '');
    // set a timeout for watcher's interval
    await scheduler.wait(DELAY / 2);
    await fs.writeFile(filepath1, '');

    await scheduler.wait(DELAY / 2);
    await fs.rm(filepath, { force: true });
    await fs.rm(filepath1, { force: true });

    assert(count(app.stdout, 'reload worker') >= 3);
  });
});

function count(str: string, match: string) {
  const m = str.match(new RegExp(match, 'g'));
  return m ? m.length : 0;
}
