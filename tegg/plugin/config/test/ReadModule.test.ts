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
    // The app's own module, exactly as scanned.
    expect(app.moduleConfigs.moduleA).toEqual({
      config: {},
      name: 'moduleA',
      reference: {
        optional: undefined,
        name: 'moduleA',
        package: 'module-a',
        path: getFixtures('apps/app-with-modules/app/module-a'),
        loaderType: undefined,
      },
    });
    expect(app.moduleReferences).toContainEqual({
      optional: undefined,
      name: 'moduleA',
      package: 'module-a',
      path: getFixtures('apps/app-with-modules/app/module-a'),
    });
    // Framework module plugins are discovered through the default framework
    // (`egg`) scan even when the app declares no pkg.egg.framework — the
    // cnpmcore shape. They join as OPTIONAL references until plugin
    // promotion.
    const teggConfigRef = app.moduleReferences.find((ref) => ref.name === 'teggConfig');
    expect(teggConfigRef?.optional).toBe(true);
  });

  it('should type defines work', () => {
    expect(app.moduleConfigs).toBeDefined();
    expect(app.moduleReferences).toBeDefined();
  });
});
