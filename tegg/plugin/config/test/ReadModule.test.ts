import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import AppBootHook from '../src/app.ts';
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

  it('should restore manifest module references against runtime baseDir', async () => {
    const baseDir = getFixtures('apps/app-with-modules');
    const fakeApp = {
      baseDir,
      config: {
        tegg: {
          readModuleOptions: {},
        },
      },
      loader: {
        getTypeFiles() {
          return ['module'];
        },
        manifest: {
          getExtension() {
            return {
              moduleReferences: [
                {
                  optional: undefined,
                  name: 'moduleA',
                  path: 'app/module-a',
                },
              ],
              moduleDescriptors: [
                {
                  name: 'moduleA',
                  unitPath: 'app/module-a',
                  decoratedFiles: [],
                },
              ],
            };
          },
        },
      },
    };

    await new AppBootHook(fakeApp as any).loadMetadata();

    const modulePath = path.join(baseDir, 'app/module-a');
    expect((fakeApp as any).moduleReferences).toEqual([
      {
        optional: undefined,
        name: 'moduleA',
        path: modulePath,
      },
    ]);
    expect((fakeApp as any).moduleConfigs.moduleA.reference.path).toBe(modulePath);
  });
});
