import assert from 'node:assert';

import { describe, it } from 'vitest';

import { MetadataUtil } from '../../src/index.js';

class Parent {}

class Child extends Parent {}

describe('test/util/MetadataUtil.test.ts', () => {
  describe('initOwnArrayMetaData', () => {
    it('class extends should work', () => {
      const TEST_KEY = 'test_array_key';
      const parentVal: string[] = MetadataUtil.initOwnArrayMetaData(TEST_KEY, Parent, []);
      parentVal.push('parent_data');
      const childVal: string[] = MetadataUtil.initOwnArrayMetaData(TEST_KEY, Child, []);
      assert.deepStrictEqual(childVal, ['parent_data']);
    });
  });

  describe('initOwnMapMetaData', () => {
    it('class extends should work', () => {
      const TEST_KEY = 'test_map_key';
      const parentVal: Map<string, string> = MetadataUtil.initOwnMapMetaData(TEST_KEY, Parent, new Map());
      parentVal.set('parent_data_key', 'parent_data_key');
      const childVal: Map<string, string> = MetadataUtil.initOwnMapMetaData(TEST_KEY, Child, new Map());
      assert(childVal.get('parent_data_key') === 'parent_data_key');
    });
  });
});
