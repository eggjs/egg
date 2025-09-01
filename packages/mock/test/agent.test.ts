import fs from 'node:fs';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { rimraf } from '../src/lib/utils.js';
import { getFixtures } from './helper.js';

const baseDir = getFixtures('agent');

describe('test/agent.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('mock agent ok', async () => {
    const filepath = path.join(baseDir, 'run/test.txt');
    await rimraf(filepath);

    app = mm.app({
      baseDir,
    });

    await app.ready();
    assert(fs.readFileSync(filepath, 'utf8') === '123');
  });

  it('mock agent again ok', done => {
    app = mm.app({
      baseDir,
    });
    app.ready(done);
  });

  it('should cluster-client work', done => {
    app = mm.app({ baseDir });
    app.ready(() => {
      app._agent.client.subscribe('agent sub', (data: string) => {
        assert(data === 'agent sub');

        app.client.subscribe('app sub', (data: string) => {
          assert(data === 'app sub');
          done();
        });
      });
    });
  });

  it('should agent work ok after ready', async function() {
    app = mm.app({ baseDir });
    await app.ready();
    assert(app._agent.type === 'agent');
  });

  it.skip('should FrameworkErrorformater work during agent boot (configWillLoad)', async function() {
    // let logMsg = '';
    let catchErr: any;
    // mm(process.stderr, 'write', (msg: string) => {
    //   logMsg = msg;
    // });
    try {
      app = mm.app({ baseDir: getFixtures('agent-boot-error') });
      await app.ready();
    } catch (err) {
      catchErr = err;
    }

    assert(catchErr.code === 'customPlugin_99');
    // console.log(logMsg);
    // assert(/framework\.CustomError\: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/.test(logMsg));
  });

  it('should FrameworkErrorformater work during agent boot ready (didLoad)', async function() {
    let logMsg = '';
    let catchErr: any;
    mm(process.stderr, 'write', (msg: string) => {
      logMsg = msg;
    });
    app = mm.app({ baseDir: getFixtures('agent-boot-ready-error') });
    try {
      await app.ready();
    } catch (err) {
      catchErr = err;
    }

    assert(catchErr.code === 'customPlugin_99');
    assert(/framework\.CustomError\: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/.test(logMsg));
  });
});
