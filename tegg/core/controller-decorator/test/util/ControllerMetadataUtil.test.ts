import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'vitest';
import { MetadataUtil } from '@eggjs/core-decorator';
import { CONTROLLER_META_DATA } from '@eggjs/tegg-types';
import { FooController, ParentController, ChildController } from '../fixtures/HTTPFooController.js';
import { ControllerMetadataUtil } from '../../src/index.js';

describe('test/util/ControllerMetadataUtil.test.ts', () => {
  describe('get metadata', () => {
    beforeEach(() => {
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, FooController);
    });

    it('should work', () => {
      const metadata = ControllerMetadataUtil.getControllerMetadata(FooController)!;
      assert.ok(metadata);
      assert.equal(metadata.controllerName, 'FooController');
    });
  });

  describe('inherit case', () => {
    beforeEach(() => {
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, ParentController);
      MetadataUtil.deleteMetaData(CONTROLLER_META_DATA, ChildController);
    });

    it('should work', () => {
      const parentMetadata = ControllerMetadataUtil.getControllerMetadata(ParentController)!;
      assert.ok(parentMetadata);
      assert.equal(parentMetadata.controllerName, 'ParentController');

      const childMetadata = ControllerMetadataUtil.getControllerMetadata(ChildController)!;
      assert.ok(childMetadata);
      assert.equal(childMetadata.controllerName, 'ChildController');
    });
  });
});
