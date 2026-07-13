import assert from 'node:assert/strict';
import path from 'node:path';

import { INNER_OBJECT_LOAD_UNIT_TYPE } from '@eggjs/tegg-runtime';
import { describe, it } from 'vitest';

import { CoreTestHelper } from '../src/CoreTestHelper.ts';
import { LoaderUtil } from '../src/LoaderUtil.ts';
import { TestLifecycleHook } from './fixtures/inner-lifecycle/TestLifecycleHook.ts';

describe('core/test-util/test/CoreTestHelper.test.ts', () => {
  it('should instantiate inner lifecycle protos and keep them through business teardown', async () => {
    TestLifecycleHook.events.length = 0;
    const modules = await CoreTestHelper.prepareModules([path.join(import.meta.dirname, 'fixtures/inner-lifecycle')]);
    assert.deepEqual(TestLifecycleHook.events, ['build:graph', 'create:business']);
    assert.equal(modules.at(-1)?.loadUnit.type, INNER_OBJECT_LOAD_UNIT_TYPE);

    await CoreTestHelper.destroyModules(modules);

    assert.deepEqual(TestLifecycleHook.events, ['build:graph', 'create:business', 'destroy:business', 'destroy:inner']);
  });

  it('should reject implicit reuse of an existing inner load unit', async () => {
    const modulePath = path.join(import.meta.dirname, 'fixtures/inner-lifecycle');
    const modules = await CoreTestHelper.prepareModules([modulePath]);
    try {
      await assert.rejects(() => LoaderUtil.buildGlobalGraph([modulePath]), /inner object load unit already exists/);
    } finally {
      await CoreTestHelper.destroyModules(modules);
    }
  });
});
