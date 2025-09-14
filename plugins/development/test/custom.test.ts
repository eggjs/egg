import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe } from 'vitest';

import { getFilepath } from './utils.ts';

describe.skip('test/custom.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    mm.env('local');
    app = mm.cluster({
      baseDir: getFilepath('custom'),
    });
    app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it.skipIf(process.env.CI)('should reload with custom detect', async () => {
    let filepath;
    filepath = getFilepath('custom/app/service/a.js');
    await fs.writeFile(filepath, 'let a = 1;');
    await fs.writeFile(filepath, 'let a = 2;');
    await scheduler.wait(10000);

    await fs.rm(filepath, { force: true });
    app.expect('stdout', /a\.js/);

    filepath = getFilepath('custom/app/service/b.ts');
    await fs.writeFile(filepath, 'let b = 1;');
    await fs.writeFile(filepath, 'let b = 2;');
    await scheduler.wait(5000);

    await fs.rm(filepath, { force: true });
    app.notExpect('stdout', /b\.ts/);
  });
});
