import { describe, it, afterAll, beforeAll, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from './utils.ts';

describe('plugin/config/test/DuplicateOptionalModule.test.ts', () => {
  let app: MockApplication;
  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/duplicate-optional-module'),
    });
    await app.ready();
  });

  it('should work', async () => {
    console.log(app.moduleReferences);
    console.log(app.moduleConfigs);
    expect(app.moduleReferences.length).toBe(2);
    expect(Object.keys(app.moduleConfigs).length).toBe(2);
  });
});
