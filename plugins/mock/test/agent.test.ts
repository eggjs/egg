import { strict as assert } from 'node:assert';

import { describe, it, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

const baseDir = getFixtures('agent');

describe('test/agent.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('mock agent ok', async () => {
    app = mm.app({
      baseDir,
    });

    await app.ready();
  });

  it('mock agent again ok', async () => {
    app = mm.app({
      baseDir,
    });
    await app.ready();
  });

  it('should agent work ok after ready', async () => {
    app = mm.app({ baseDir });
    await app.ready();
    assert.equal(app._agent.type, 'agent');
  });

  it.skip('should FrameworkErrorformater work during agent boot (configWillLoad)', async () => {
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

    assert.equal(catchErr.code, 'customPlugin_99');
    // console.log(logMsg);
    // assert(/framework\.CustomError\: mock error \[ https\:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/.test(logMsg));
  });

  it('should FrameworkErrorformater work during agent boot ready (didLoad)', async () => {
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

    assert.equal(catchErr.code, 'customPlugin_99');
    assert.match(logMsg, /framework\.CustomError: mock error \[ https:\/\/eggjs\.org\/zh-cn\/faq\/customPlugin_99 \]/);
  });
});
