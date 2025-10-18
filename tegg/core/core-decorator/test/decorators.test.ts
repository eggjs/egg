import assert from 'node:assert/strict';

import {
  AccessLevel,
  ObjectInitType,
  LoadUnitNameQualifierAttribute,
  InitTypeQualifierAttribute,
  DEFAULT_PROTO_IMPL_TYPE,
  MultiInstanceType,
  InjectType,
} from '@eggjs/tegg-types';
import type { EggPrototypeInfo, EggMultiInstancePrototypeInfo, InjectObjectInfo } from '@eggjs/tegg-types';
import { describe, it, expect } from 'vitest';

import { PrototypeUtil, QualifierUtil } from '../src/index.ts';

import CacheService from './fixtures/decators/CacheService.ts';
import ContextCache from './fixtures/decators/ContextCache.ts';
import SingletonCache from './fixtures/decators/SingletonCache.ts';
import QualifierCacheService from './fixtures/decators/QualifierCacheService.ts';
import { FOO_ATTRIBUTE, FooLogger } from './fixtures/decators/FooLogger.ts';
import { ConstructorObject, ConstructorQualifierObject } from './fixtures/decators/ConstructorObject.ts';
import {
  ChildDynamicMultiInstanceProto,
  ChildSingletonProto,
  ChildStaticMultiInstanceProto,
  ParentDynamicMultiInstanceProto,
  ParentSingletonProto,
  ParentStaticMultiInstanceProto,
} from './fixtures/decators/ChildService.ts';

describe('test/decorators.test.ts', () => {
  describe('ContextProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(ContextCache));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'cache',
        initType: ObjectInitType.CONTEXT,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: DEFAULT_PROTO_IMPL_TYPE,
        className: 'ContextCache',
      };
      assert.deepStrictEqual(PrototypeUtil.getProperty(ContextCache), expectObjectProperty);
    });
  });

  describe('SingletonProto', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(SingletonCache));
      const expectObjectProperty: EggPrototypeInfo = {
        name: 'cache',
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: DEFAULT_PROTO_IMPL_TYPE,
        className: 'SingletonCache',
      };
      assert.deepStrictEqual(PrototypeUtil.getProperty(SingletonCache), expectObjectProperty);
    });
  });

  describe('Inject', () => {
    it('property should work', () => {
      assert(PrototypeUtil.isEggPrototype(CacheService));
      const injectType = PrototypeUtil.getInjectType(CacheService);
      expect(injectType).toBe(InjectType.PROPERTY);

      const expectInjectInfo: InjectObjectInfo[] = [
        {
          refName: 'cache',
          objName: 'fooCache',
        },
        {
          refName: 'testService',
          objName: 'testService',
        },
        {
          refName: 'testService2',
          objName: 'abcabc',
        },
        {
          refName: 'otherService',
          objName: 'testService3',
        },
        {
          objName: 'testService4',
          refName: 'testService4',
        },
        {
          objName: 'optionalService1',
          refName: 'optionalService1',
          optional: true,
        },
        {
          objName: 'optionalService2',
          refName: 'optionalService2',
          optional: true,
        },
      ];
      expect(PrototypeUtil.getInjectObjects(CacheService)).toStrictEqual(expectInjectInfo);
    });

    it('constructor should work', () => {
      const injectType = PrototypeUtil.getInjectType(ConstructorObject);
      expect(injectType).toBe(InjectType.CONSTRUCTOR);

      const injectConstructors = PrototypeUtil.getInjectObjects(ConstructorObject);
      expect(injectConstructors).toStrictEqual([
        { refIndex: 0, refName: 'xCache', objName: 'fooCache' },
        { refIndex: 1, refName: 'cache', objName: 'cache' },
        { refIndex: 2, refName: 'otherCache', objName: 'cacheService' },
        { refIndex: 3, refName: 'optional1', objName: 'optional1', optional: true },
        { refIndex: 4, refName: 'optional2', objName: 'optional2', optional: true },
      ]);
    });
  });

  describe('Qualifier', () => {
    it('should work', () => {
      assert(PrototypeUtil.isEggPrototype(QualifierCacheService));
      const property = 'cache';
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, LoadUnitNameQualifierAttribute) === 'foo'
      );
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, InitTypeQualifierAttribute) ===
          ObjectInitType.SINGLETON
      );
    });

    it('should set default initType in inject', () => {
      const properties = [
        { property: 'interfaceService', expected: undefined },
        { property: 'testContextService', expected: ObjectInitType.CONTEXT },
        { property: 'testSingletonService', expected: ObjectInitType.SINGLETON },
        { property: 'customNameService', expected: undefined },
        { property: 'customQualifierService1', expected: ObjectInitType.CONTEXT },
        { property: 'customQualifierService2', expected: ObjectInitType.CONTEXT },
      ];

      for (const { property, expected } of properties) {
        const qualifier = QualifierUtil.getProperQualifier(QualifierCacheService, property, InitTypeQualifierAttribute);
        assert.strictEqual(qualifier, expected, `expect initType for ${property} to be ${expected}`);
      }
    });

    it('should work use Symbol.for', () => {
      assert(PrototypeUtil.isEggPrototype(QualifierCacheService));
      const property = 'cache';
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, Symbol.for('Qualifier.LoadUnitName')) ===
          'foo'
      );
      assert(
        QualifierUtil.getProperQualifier(QualifierCacheService, property, Symbol.for('Qualifier.InitType')) ===
          ObjectInitType.SINGLETON
      );
    });

    it('constructor should work', () => {
      const constructorQualifiers = QualifierUtil.getProperQualifiers(ConstructorObject, 'xCache');
      const constructorQualifiers2 = QualifierUtil.getProperQualifiers(ConstructorObject, 'cache');
      assert.deepStrictEqual(constructorQualifiers, [
        { attribute: Symbol.for('Qualifier.LoadUnitName'), value: 'foo' },
        { attribute: Symbol.for('Qualifier.InitType'), value: ObjectInitType.SINGLETON },
      ]);
      assert.deepStrictEqual(constructorQualifiers2, []);
    });

    it('should set default initType in constructor inject', () => {
      const properties = [
        // { property: 'xCache', expected: undefined },
        { property: 'cache', expected: ObjectInitType.SINGLETON },
        { property: 'ContextCache', expected: ObjectInitType.CONTEXT },
        { property: 'customNameCache', expected: undefined },
        { property: 'customQualifierCache1', expected: ObjectInitType.CONTEXT },
        { property: 'customQualifierCache2', expected: ObjectInitType.CONTEXT },
      ];

      for (const { property, expected } of properties) {
        const qualifier = QualifierUtil.getProperQualifier(
          ConstructorQualifierObject,
          property,
          InitTypeQualifierAttribute
        );
        assert.equal(qualifier, expected, `expect initType for ${property} to be ${expected}`);
      }
    });
  });

  describe('MultiInstanceProto', () => {
    it('should work', async () => {
      assert(PrototypeUtil.isEggMultiInstancePrototype(FooLogger));
      const expectObjectProperty: EggMultiInstancePrototypeInfo = {
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: 'foo',
        objects: [
          {
            name: 'foo',
            qualifiers: [
              {
                attribute: FOO_ATTRIBUTE,
                value: 'foo1',
              },
            ],
          },
          {
            name: 'foo',
            qualifiers: [
              {
                attribute: FOO_ATTRIBUTE,
                value: 'foo2',
              },
            ],
          },
        ],
        className: 'FooLogger',
      };
      assert.deepStrictEqual(
        await PrototypeUtil.getMultiInstanceProperty(FooLogger, {
          unitPath: 'foo',
          moduleName: '',
        }),
        expectObjectProperty
      );
    });
  });

  it('should get the right file path', () => {
    console.warn(CacheService.fileName);
    console.warn(PrototypeUtil.getFilePath(CacheService));
    assert.equal(PrototypeUtil.getFilePath(CacheService), CacheService.fileName);
  });

  describe('inherited', () => {
    const fakeCtx = {
      unitPath: 'foo',
      moduleName: '',
    };

    it('Prototype should not be inherited', () => {
      assert(PrototypeUtil.isEggPrototype(ParentSingletonProto));
      assert(PrototypeUtil.getProperty(ParentSingletonProto));
      assert(PrototypeUtil.getFilePath(ParentSingletonProto));

      assert.strictEqual(PrototypeUtil.isEggPrototype(ChildSingletonProto), false);
      assert.strictEqual(PrototypeUtil.getProperty(ChildSingletonProto), undefined);
      assert.strictEqual(PrototypeUtil.getFilePath(ChildSingletonProto), undefined);
    });

    it('static multiInstanceProto should not be inherited', async () => {
      assert(PrototypeUtil.isEggMultiInstancePrototype(ParentStaticMultiInstanceProto));
      assert.strictEqual(
        PrototypeUtil.getEggMultiInstancePrototypeType(ParentStaticMultiInstanceProto),
        MultiInstanceType.STATIC
      );
      assert(PrototypeUtil.getStaticMultiInstanceProperty(ParentStaticMultiInstanceProto));
      assert(await PrototypeUtil.getMultiInstanceProperty(ParentStaticMultiInstanceProto, fakeCtx));
      assert(PrototypeUtil.getFilePath(ParentStaticMultiInstanceProto));

      assert.strictEqual(PrototypeUtil.isEggMultiInstancePrototype(ChildStaticMultiInstanceProto), false);
      assert.strictEqual(PrototypeUtil.getEggMultiInstancePrototypeType(ChildStaticMultiInstanceProto), undefined);
      assert.strictEqual(PrototypeUtil.getStaticMultiInstanceProperty(ChildStaticMultiInstanceProto), undefined);
      assert.strictEqual(
        await PrototypeUtil.getMultiInstanceProperty(ChildStaticMultiInstanceProto, fakeCtx),
        undefined
      );
      assert.strictEqual(PrototypeUtil.getFilePath(ChildStaticMultiInstanceProto), undefined);
    });

    it('dynamic multipleInstanceProto should not be inherited', async () => {
      assert.strictEqual(
        PrototypeUtil.getEggMultiInstancePrototypeType(ParentDynamicMultiInstanceProto),
        MultiInstanceType.DYNAMIC
      );
      assert(await PrototypeUtil.getDynamicMultiInstanceProperty(ParentDynamicMultiInstanceProto, fakeCtx));
      assert(await PrototypeUtil.getMultiInstanceProperty(ParentDynamicMultiInstanceProto, fakeCtx));

      assert.strictEqual(PrototypeUtil.getEggMultiInstancePrototypeType(ChildDynamicMultiInstanceProto), undefined);
      assert.strictEqual(
        await PrototypeUtil.getDynamicMultiInstanceProperty(ChildDynamicMultiInstanceProto, fakeCtx),
        undefined
      );
      assert.strictEqual(
        await PrototypeUtil.getMultiInstanceProperty(ChildDynamicMultiInstanceProto, fakeCtx),
        undefined
      );
    });
  });
});
