import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';
import { getFilepath } from './utils.js';

describe('test/absolute.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    await fs.rm(getFilepath('absolute/lib'), { force: true, recursive: true });

    // FIXME: ONLY WATCH EXIST DIR
    const filepath = getFilepath('absolute/lib/a/b.js');
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, '');

    mm.env('local');
    app = mm.cluster({
      baseDir: 'absolute',
      // debug: true,
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);
  // for debounce
  afterEach(() => scheduler.wait(500));

  it('should reload at absolute path', async () => {
    const filepath = getFilepath('absolute/lib/a/b.js');
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    console.log(`write file to ${filepath}`);
    await fs.writeFile(filepath, 'console.log(1);');
    await scheduler.wait(1000);
    await fs.unlink(filepath);
    await scheduler.wait(5000);
    app.expect('stdout', /reload worker because .*?b\.js/);
  });
});
