import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

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
    expect(app.moduleConfigs.moduleA).toEqual({
      config: {},
      name: 'moduleA',
      reference: {
        optional: undefined,
        name: 'moduleA',
        path: getFixtures('apps/app-with-modules/app/module-a'),
      },
    });
    const appRefs = app.moduleReferences.filter((t) => !t.optional);
    expect(appRefs).toEqual([
      {
        optional: undefined,
        name: 'moduleA',
        path: getFixtures('apps/app-with-modules/app/module-a'),
      },
    ]);
    // The runtime framework's eggModule-declaring dependencies join as
    // OPTIONAL modules (promoted only when their plugin is enabled) — the
    // same shape a production app with `egg.framework` always saw.
    for (const ref of app.moduleReferences) {
      if (ref.name === 'moduleA') continue;
      expect(ref.optional).toBe(true);
    }
  });

  it('should type defines work', () => {
    expect(app.moduleConfigs).toBeDefined();
    expect(app.moduleReferences).toBeDefined();
  });
});
