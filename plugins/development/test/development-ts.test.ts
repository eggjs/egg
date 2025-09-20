import fs from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeEach, afterEach, it, describe } from 'vitest';

import { escape, getFilepath, DELAY } from './utils.ts';

describe('test/development-ts.test.ts', () => {
  let app: MockApplication;
  beforeEach(async () => {
    mm.env('local');
    app = mm.cluster({
      baseDir: getFilepath('development-ts'),
    });
    app.debug();
    await app.ready();
  });
  afterEach(() => app.close());
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should reload when change service', async () => {
    const filepath = getFilepath('development-ts/app/service/a.ts');
    await fs.writeFile(filepath, 'let a = 1;');
    await fs.writeFile(filepath, 'let a = 2;');
    await scheduler.wait(1000);
    await fs.rm(filepath, { force: true });
    await scheduler.wait(5000);
    app.expect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath}`))
    );
  });

  it('should not reload when change assets', async () => {
    const filepath = getFilepath('development-ts/app/assets/b.js');
    await fs.writeFile(filepath, 'let b = 1;');
    await fs.writeFile(filepath, 'let b = 2;');
    await scheduler.wait(1000);
    await fs.rm(filepath, { force: true });
    await scheduler.wait(5000);
    app.notExpect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath}`))
    );
  });

  it.skip('should reload once when 2 file change', async () => {
    const filepath = getFilepath('development-ts/app/service/c.js');
    const filepath1 = getFilepath('development-ts/app/service/d.js');
    await fs.writeFile(filepath, 'let c = 1;');
    await fs.writeFile(filepath, 'let c = 2;');
    // set a timeout for watcher's interval
    await scheduler.wait(DELAY / 2);
    await fs.writeFile(filepath1, 'let d = 1;');
    await fs.writeFile(filepath1, 'let d = 2;');

    await scheduler.wait(DELAY / 2);
    await fs.rm(filepath, { force: true });
    await fs.rm(filepath1, { force: true });

    assert(count(app.stdout, 'reload worker') >= 1);
  });
});

function count(str: string, match: string) {
  const m = str.match(new RegExp(match, 'g'));
  return m ? m.length : 0;
}
