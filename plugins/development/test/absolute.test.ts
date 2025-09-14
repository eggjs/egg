import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe } from 'vitest';

import { getFilepath } from './utils.ts';

describe('test/absolute.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    await fs.rm(getFilepath('absolute/lib'), { force: true, recursive: true });

    // FIXME: ONLY WATCH EXIST DIR
    const filepath = getFilepath('absolute/lib/a/b.js');
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, '');

    mm.env('local');
    app = mm.cluster({
      baseDir: getFilepath('absolute'),
      // debug: true,
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should reload at absolute path', async () => {
    const filepath = getFilepath('absolute/lib/a/b.js');
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    console.log(`write file to ${filepath}`);
    await fs.writeFile(filepath, 'console.log(1);');
    await scheduler.wait(1000);
    await fs.rm(filepath, { force: true });
    await scheduler.wait(5000);
    app.expect('stdout', /reload worker because .*?b\.js/);
  });
});
