import { expect, test } from '@voidzero-dev/vite-plus/test';

import {
  AbstractEggContext,
  LoadUnitInstanceLifecycleUtil,
  LoaderUtil,
  ModuleConfigUtil,
  LoadUnitLifecycleUtil,
} from '../src/helper.ts';
import * as exports from '../src/helper.ts';

test('should helper exports work', async () => {
  expect(AbstractEggContext).toBeDefined();
  expect(LoadUnitInstanceLifecycleUtil).toBeDefined();
  expect(LoaderUtil).toBeDefined();
  expect(ModuleConfigUtil).toBeDefined();
  expect(LoadUnitLifecycleUtil).toBeDefined();
});

test('should helper exports stable', async () => {
  expect(exports).toMatchSnapshot();
});
