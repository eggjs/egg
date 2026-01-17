import assert from 'node:assert/strict';

import { describe, it } from 'vite-plus/test';

import { AttributeMetaBuilder, AttributeMeta } from '../../src/index.js';
import { AttributeModel } from '../fixtures/AttributeModel.js';
import { DefaultAttributeModel } from '../fixtures/DefaultAttributeModel.js';

describe('test/builder/AttributeMetaBuilder.test.ts', () => {
  describe('default value', () => {
    it('should set default value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(DefaultAttributeModel);
      const attributes = attributeMetaBuilder.build();
      assert.deepStrictEqual(attributes, [new AttributeMeta('varchar', 'foo', 'foo', true, false, false, false)]);
    });
  });

  describe('not default value', () => {
    it('should use decorator value', () => {
      const attributeMetaBuilder = new AttributeMetaBuilder(AttributeModel);
      const attributes = attributeMetaBuilder.build();
      assert.deepStrictEqual(attributes, [new AttributeMeta('varchar', 'foo', 'foo_field', false, false, true, true)]);
    });
  });
});
