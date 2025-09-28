import { describe, it, afterEach, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';
import { getFixtures } from './utils.ts';

describe('test/wrong-mode.test.ts', () => {
  let app: MockApplication;
  afterEach(async () => {
    await app.close();
  });

  it('should start fail when mode=foo', async () => {
    app = mm.app({
      baseDir: getFixtures('apps/wrong-mode'),
    });
    await expect(async () => {
      await app.ready();
    }).rejects.toThrow(/Expect mode to be 'stream' or 'file', but got 'foo'/);
  });

  it('should start fail when using options.fileModeMatch on file mode', async () => {
    app = mm.app({
      baseDir: getFixtures('apps/wrong-fileModeMatch'),
    });
    await expect(async () => {
      await app.ready();
    }).rejects.toThrow(/`fileModeMatch` options only work on stream mode, please remove it/);
  });
});
