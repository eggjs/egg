import { request } from '@eggjs/supertest';
import fs from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { mm } from '@eggjs/mock';
import { start, Application } from 'egg';
import { getFilepath } from './utils.js';

describe('test/process_mode_single.test.ts', () => {
  let app: Application;
  before(async () => {
    app = await start({
      env: 'local',
      baseDir: getFilepath('development'),
      plugins: {
        development: {
          enable: true,
          path: getFilepath('../..'),
        },
      },
    } as any);
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should not reload', async () => {
    let warn = false;
    mm(app.agent!.logger, 'warn', (msg: string) => {
      if (msg.includes('reload worker')) {
        warn = true;
      }
    });
    await request(app.callback()).get('/foo').expect(200).expect('foo');
    const filepath = getFilepath('development/app/service/a.js');
    await fs.writeFile(filepath, '');
    await scheduler.wait(1000);

    await request(app.callback()).get('/foo').expect(200).expect('foo');

    await fs.unlink(filepath);

    await request(app.callback()).get('/foo').expect(200).expect('foo');

    assert.equal(warn, false);
  });
});
