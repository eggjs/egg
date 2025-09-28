import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/wrong-mode.test.ts', () => {
  let app: MockApplication;
  afterEach(async () => {
    await app.close();
  });

  it('should start fail when mode=foo', async () => {
    app = mm.app({
      baseDir: 'apps/wrong-mode',
    });
    await assert.rejects(async () => {
      await app.ready();
    }, /Expect mode to be 'stream' or 'file', but got 'foo'/);
  });

  it('should start fail when using options.fileModeMatch on file mode', async () => {
    app = mm.app({
      baseDir: 'apps/wrong-fileModeMatch',
    });
    await assert.rejects(async () => {
      await app.ready();
    }, /`fileModeMatch` options only work on stream mode, please remove it/);
  });
});
