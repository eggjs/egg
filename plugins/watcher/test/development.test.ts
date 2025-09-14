import { describe, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { mm, type MockApplication } from '@eggjs/mock';
import { getFilePath } from './utils.js';

const file_path1 = getFilePath('apps/watcher-development-app/tmp.txt');
const file_path2 = getFilePath('apps/watcher-development-app/tmp/tmp.txt');
const file_path3 = getFilePath(
  'apps/watcher-development-app/tmp/t1/t2/t3/t4/tmp.txt'
);
const file_path4 = getFilePath(
  'apps/watcher-development-app/tmp/t1/t2/t3/t4/tmp'
);
const file_path1_agent = getFilePath(
  'apps/watcher-development-app/tmp-agent.txt'
);

describe('test/development.test.ts', () => {
  let app: MockApplication;

  beforeEach(() => {
    app = mm.app({
      // plugin: 'watcher',
      baseDir: getFilePath('apps/watcher-development-app'),
    });
    return app.ready();
  });

  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should app watcher work', async () => {
    let count = 0;

    await app
      .httpRequest()
      .get('/app-watch')
      .expect(200)
      .expect('app watch success');

    await scheduler.wait(100);
    fs.writeFileSync(file_path1, 'aaa');
    await scheduler.wait(100);

    let res = await app.httpRequest().get('/app-msg').expect(200);

    let lastCount = count;
    count = parseInt(res.text);
    assert(count > lastCount, `count: ${count}, lastCount: ${lastCount}`);

    fs.writeFileSync(file_path2, 'aaa');
    fs.writeFileSync(file_path3, 'aaa');
    fs.mkdirSync(file_path4, { recursive: true });
    fs.rmdirSync(file_path4);
    fs.rmSync(file_path4, { force: true });
    await scheduler.wait(100);

    res = await app.httpRequest().get('/app-msg').expect(200);

    lastCount = count;
    count = parseInt(res.text);
    assert(count > lastCount, `count: ${count}, lastCount: ${lastCount}`);

    await app
      .httpRequest()
      .get('/app-hasDir')
      .expect(200)
      .expect({
        // work on windows
        hasDir: process.platform === 'win32',
      });

    /*
    // TODO wait unsubscribe implementation of cluster-client
    await request(server)
      .get('/app-unwatch')
      .expect(200)
      .expect('app unwatch success');

    await scheduler.wait(100);
    fs.writeFileSync(file_path2, 'aaa');
    fs.writeFileSync(file_path1, 'aaa');
    await scheduler.wait(100);

    res = await request(server)
      .get('/app-msg')
      .expect(200);

    lastCount = count;
    count = parseInt(res.text);
    assert(count === lastCount);
    */
  });

  // not work on cluster message
  it.skip('should agent watcher work', async () => {
    let count = 0;

    await app
      .httpRequest()
      .get('/agent-watch')
      .expect(200)
      .expect('agent watch success');

    await scheduler.wait(100);
    fs.writeFileSync(file_path1_agent, 'bbb');
    await scheduler.wait(100);

    const res = await app.httpRequest().get('/agent-msg').expect(200);

    const lastCount = count;
    count = parseInt(res.text);
    assert(count > lastCount, `count: ${count}, lastCount: ${lastCount}`);

    /*
    // TODO wait unsubscribe implementation of cluster-client
    await request(app.callback())
      .get('/agent-unwatch')
      .expect(200)
      .expect('agent unwatch success');

    await sleep(100);
    fs.writeFileSync(file_path1_agent, 'bbb');
    await sleep(100);

    res = await request(app.callback())
      .get('/agent-msg')
      .expect(200);

    lastCount = count;
    count = parseInt(res.text);
    assert(count === lastCount);
    */
  });
});
