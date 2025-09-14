import fs from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';
import { escape, getFilepath, DELAY } from './utils.js';

describe('test/development-ts.test.ts', () => {
  let app: MockApplication;
  beforeEach(() => {
    mm.env('local');
    app = mm.cluster({
      baseDir: 'development-ts',
    });
    return app.ready();
  });
  afterEach(() => app.close());
  afterEach(mm.restore);
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should reload when change service', async () => {
    const filepath = getFilepath('development-ts/app/service/a.ts');
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);
    await fs.unlink(filepath);
    await scheduler.wait(5000);
    app.expect(
      'stdout',
      new RegExp(escape(`reload worker because ${filepath}`))
    );
  });

  it('should not reload when change assets', async () => {
    const filepath = getFilepath('development-ts/app/assets/b.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);
    await fs.unlink(filepath);
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
    const filepath = getFilepath('development-ts/app/service/c.js');
    const filepath1 = getFilepath('development-ts/app/service/d.js');
    await fs.writeFile(filepath, '');
    // set a timeout for watcher's interval
    await scheduler.wait(DELAY / 2);
    await fs.writeFile(filepath1, '');

    await scheduler.wait(DELAY / 2);
    await fs.unlink(filepath);
    await fs.unlink(filepath1);

    assert.equal(count(app.stdout, 'reload worker'), 2);
  });
});

function count(str: string, match: string) {
  const m = str.match(new RegExp(match, 'g'));
  return m ? m.length : 0;
}
