import assert from 'node:assert/strict';

import type { EggPrototypeInfo } from '@eggjs/tegg-types';
import { AccessLevel, EGG_INNER_OBJECT_PROTO_IMPL_TYPE, ObjectInitType } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import type { EggProtoImplClass } from '../src/index.ts';
import {
  EggContextLifecycleProto,
  EggLifecycleProto,
  EggObjectLifecycleProto,
  EggPrototypeLifecycleProto,
  InnerObjectProto,
  LoadUnitInstanceLifecycleProto,
  LoadUnitLifecycleProto,
  PrototypeUtil,
} from '../src/index.ts';

@InnerObjectProto()
class Router {}

@InnerObjectProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'customRouter',
})
class OtherRouter {}

@LoadUnitLifecycleProto()
class ControllerLoadUnitLifecycle {}

@LoadUnitInstanceLifecycleProto()
class ControllerLoadUnitInstanceLifecycle {}

@EggObjectLifecycleProto()
class ControllerObjectLifecycle {}

@EggPrototypeLifecycleProto()
class ControllerPrototypeLifecycle {}

@EggContextLifecycleProto()
class ControllerContextLifecycle {}

@EggLifecycleProto({
  type: 'EggObject',
  name: 'customName',
  accessLevel: AccessLevel.PUBLIC,
})
class CustomNamedLifecycle {}

describe('core/core-decorator/test/inner-object-decorators.test.ts', () => {
  describe('InnerObjectProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(Router));
      assert(PrototypeUtil.isEggInnerObject(Router));
      assert(!PrototypeUtil.isEggLifecyclePrototype(Router));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'router',
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PRIVATE,
        protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
        className: 'Router',
      };
      assert.deepEqual(PrototypeUtil.getProperty(Router), expectObjectProperty);
    });

    it('should params work', () => {
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'customRouter',
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
        className: 'OtherRouter',
      };
      assert.deepEqual(PrototypeUtil.getProperty(OtherRouter), expectObjectProperty);
    });

    it('should not mark plain prototypes', () => {
      assert(!PrototypeUtil.isEggInnerObject(class Foo {}));
    });
  });

  describe('EggLifecycleProto', () => {
    const assertLifecycleProtoMetadata = (clazz: EggProtoImplClass, type: string) => {
      assert(PrototypeUtil.isEggPrototype(clazz));
      assert(PrototypeUtil.isEggInnerObject(clazz));
      assert(PrototypeUtil.isEggLifecyclePrototype(clazz));
      const expectObjectProperty: EggPrototypeInfo = {
        name: clazz.name.replace(/^./, (c) => c.toLowerCase()),
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PRIVATE,
        protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
        className: clazz.name,
      };
      assert.deepEqual(PrototypeUtil.getProperty(clazz), expectObjectProperty);
      assert.deepEqual(PrototypeUtil.getEggLifecyclePrototypeMetadata(clazz), { type });
    };

    it('should work for the five lifecycle protos', () => {
      assertLifecycleProtoMetadata(ControllerLoadUnitLifecycle, 'LoadUnit');
      assertLifecycleProtoMetadata(ControllerLoadUnitInstanceLifecycle, 'LoadUnitInstance');
      assertLifecycleProtoMetadata(ControllerObjectLifecycle, 'EggObject');
      assertLifecycleProtoMetadata(ControllerPrototypeLifecycle, 'EggPrototype');
      assertLifecycleProtoMetadata(ControllerContextLifecycle, 'EggContext');
    });

    it('should params work with explicit supported lifecycle type', () => {
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'customName',
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
        className: 'CustomNamedLifecycle',
      };
      assert.deepEqual(PrototypeUtil.getProperty(CustomNamedLifecycle), expectObjectProperty);
      assert.deepEqual(PrototypeUtil.getEggLifecyclePrototypeMetadata(CustomNamedLifecycle), {
        type: 'EggObject',
      });
    });

    it('should throw without type', () => {
      assert.throws(() => {
        EggLifecycleProto({} as any)(class Foo {});
      }, /EggLifecycle decorator should have type property/);
    });

    it('should return undefined metadata for non lifecycle proto', () => {
      assert.equal(PrototypeUtil.getEggLifecyclePrototypeMetadata(Router), undefined);
    });
  });
});
