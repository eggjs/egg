import fs from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';

import { beforeAll, afterAll, it, describe } from 'vitest';
import { request } from '@eggjs/supertest';
import { mm } from '@eggjs/mock';
import { start, Application } from 'egg';
import { getFilepath } from './utils.ts';

describe('test/process_mode_single.test.ts', () => {
  let app: Application;
  beforeAll(async () => {
    app = await start({
      env: 'local',
      baseDir: getFilepath('development-process_mode_single'),
      plugins: {
        development: {
          enable: true,
          path: getFilepath('../..'),
        },
      },
    } as any);
  });
  afterAll(() => app.close());

  it('should not reload', async () => {
    let warn = false;
    mm(app.agent!.logger, 'warn', (msg: string) => {
      if (msg.includes('reload worker')) {
        warn = true;
      }
    });
    await request(app.callback()).get('/foo').expect(200).expect('foo');
    const filepath = getFilepath(
      'development-process_mode_single/app/service/a.js'
    );
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);

    await request(app.callback()).get('/foo').expect(200).expect('foo');

    await fs.rm(filepath, { force: true });

    await request(app.callback()).get('/foo').expect(200).expect('foo');

    assert.equal(warn, false);
  });
});
