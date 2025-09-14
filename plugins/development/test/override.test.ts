import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe } from 'vitest';
import { escape, getFilepath } from './utils.ts';

describe('test/override.test.ts', () => {
  describe('overrideDefault', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('local');
      app = mm.cluster({
        baseDir: getFilepath('override'),
      });
      app.debug();
      return app.ready();
    });
    afterAll(() => app.close());

    it('should reload', async () => {
      const filepath = getFilepath('override/app/service/a.js');
      await fs.writeFile(filepath, '');
      await scheduler.wait(1000);
      await fs.unlink(filepath);
      await scheduler.wait(5000);
      app.expect('stdout', /a\.js/);
    });

    it('should not reload', async () => {
      app.debug();
      const filepath = getFilepath('override/app/no-trigger/index.js');
      await fs.writeFile(filepath, '');
      await scheduler.wait(1000);
      await fs.unlink(filepath);
      await scheduler.wait(5000);
      app.notExpect('stdout', /index\.js/);
    });
  });

  describe('overrideIgnore', () => {
    let app: MockApplication;
    beforeAll(() => {
      mm.env('local');
      app = mm.cluster({
        baseDir: getFilepath('override-ignore'),
      });
      app.debug();
      return app.ready();
    });
    afterAll(() => app.close());

    it('should reload', async () => {
      const filepath = getFilepath('override-ignore/app/web/a.js');
      await fs.writeFile(filepath, '');
      await scheduler.wait(1000);
      await fs.unlink(filepath);
      await scheduler.wait(5000);
      app.expect(
        'stdout',
        new RegExp(escape(`reload worker because ${filepath}`))
      );
    });

    it('should not reload', async () => {
      app.debug();
      const filepath = getFilepath('override-ignore/app/public/index.js');
      await fs.writeFile(filepath, '');
      await scheduler.wait(1000);
      await fs.unlink(filepath);
      await scheduler.wait(5000);
      app.notExpect(
        'stdout',
        new RegExp(escape(`reload worker because ${filepath} change`))
      );
    });
  });
});
