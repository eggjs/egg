import { describe, it, expect } from 'vitest';
import { ControllerMetadataUtil } from '@eggjs/tegg';

import { EggControllerLoader } from '../../src/lib/EggControllerLoader.ts';
import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/lib/EggModuleLoader.test.ts', () => {
  it('should work', async () => {
    const controllerDir = getFixtures('apps/controller-app/app/controller');
    const loader = new EggControllerLoader(controllerDir);
    const classes = await loader.load();

    expect(classes.length).toBe(7);
    const AppController = classes[0];
    const metadata = ControllerMetadataUtil.getControllerMetadata(AppController);
    expect(metadata).toBeDefined();
  });
});
