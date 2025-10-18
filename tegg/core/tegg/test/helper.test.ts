import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  AbstractEggContext,
  LoadUnitInstanceLifecycleUtil,
  LoaderUtil,
  ModuleConfigUtil,
  LoadUnitLifecycleUtil,
} from '../src/helper.ts';

test('should helper exports work', async () => {
  assert(AbstractEggContext);
  assert(LoadUnitInstanceLifecycleUtil);
  assert(LoaderUtil);
  assert(ModuleConfigUtil);
  assert(LoadUnitLifecycleUtil);
});
