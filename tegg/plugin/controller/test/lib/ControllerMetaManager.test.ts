import { describe, it, afterEach, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/lib/ControllerMetaManager.test.ts', () => {
  afterEach(() => {
    return mm.restore();
  });

  describe('controllers have same controller name', () => {
    it('should throw error', async () => {
      let app: MockApplication;
      await expect(async () => {
        app = mm.app({
          baseDir: getFixtures('apps/duplicate-controller-name-app'),
        });
        await app.ready();
      }).rejects.toThrow(/duplicate controller name AppController/);
      await app!.close();
    });
  });

  describe('controllers have same proto name', () => {
    it('should throw error', async () => {
      let app: MockApplication;
      await expect(async () => {
        app = mm.app({
          baseDir: getFixtures('apps/duplicate-proto-name-app'),
        });
        await app.ready();
      }).rejects.toThrow(/duplicate proto name appController/);
      await app!.close();
    });
  });
});
