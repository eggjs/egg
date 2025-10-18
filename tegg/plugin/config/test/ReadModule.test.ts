import { describe, it, afterAll, beforeAll, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from './utils.ts';

describe('plugin/config/test/ReadModule.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/app-with-modules'),
    });
    await app.ready();
  });

  it('should work', () => {
    expect(app.moduleConfigs).toEqual({
      moduleA: {
        config: {},
        name: 'moduleA',
        reference: {
          optional: undefined,
          name: 'moduleA',
          path: getFixtures('apps/app-with-modules/app/module-a'),
        },
      },
    });
    expect(app.moduleReferences).toEqual([
      {
        optional: undefined,
        name: 'moduleA',
        path: getFixtures('apps/app-with-modules/app/module-a'),
      },
    ]);
  });

  it('should type defines work', () => {
    expect(app.moduleConfigs).toBeDefined();
    expect(app.moduleReferences).toBeDefined();
  });
});
