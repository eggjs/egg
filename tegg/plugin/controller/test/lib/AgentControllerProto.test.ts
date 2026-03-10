import assert from 'node:assert/strict';

import { EggPrototypeCreatorFactory } from '@eggjs/metadata';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-types';
import { DEFAULT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import { describe, it, beforeAll, afterAll } from 'vitest';

import { AgentControllerProto } from '../../src/lib/AgentControllerProto.ts';

function createMockDelegate(): EggPrototype {
  const sym1 = Symbol('qualifier1');
  const sym2 = Symbol('qualifier2');

  const delegate = {
    id: 'mock-id',
    name: 'mockProto',
    initType: 'SINGLETON',
    accessLevel: 'PUBLIC',
    loadUnitId: 'load-unit-1',
    injectObjects: [{ refName: 'dep1' }],
    injectType: 'PROPERTY',
    className: 'MockClass',
    multiInstanceConstructorIndex: undefined,
    multiInstanceConstructorAttributes: undefined,

    getMetaData(key: string) {
      if (key === 'testKey') return 'testValue';
      return undefined;
    },
    verifyQualifier(q: { attribute: string }) {
      return q.attribute === 'valid';
    },
    verifyQualifiers(qs: Array<{ attribute: string }>) {
      return qs.every((q) => q.attribute === 'valid');
    },
    getQualifier(attr: string) {
      if (attr === 'env') return 'prod';
      return undefined;
    },
    constructEggObject(...args: any[]) {
      return { constructed: true, args };
    },
  } as unknown as EggPrototype;

  // Add symbol-keyed properties to test symbol copying
  Object.defineProperty(delegate, sym1, { value: 'value1', enumerable: false });
  Object.defineProperty(delegate, sym2, { value: 'value2', enumerable: false });

  return delegate;
}

describe('plugin/controller/test/lib/AgentControllerProto.test.ts', () => {
  describe('constructor delegation', () => {
    it('should be an instance of AgentControllerProto', () => {
      const delegate = createMockDelegate();
      const proto = new AgentControllerProto(delegate);
      assert(proto instanceof AgentControllerProto);
    });

    it('should copy symbol-keyed properties from delegate', () => {
      const delegate = createMockDelegate();
      const symbols = Object.getOwnPropertySymbols(delegate);
      assert(symbols.length >= 2, 'delegate should have symbol properties');

      const proto = new AgentControllerProto(delegate);
      for (const sym of symbols) {
        assert.strictEqual((proto as any)[sym], (delegate as any)[sym]);
      }
    });
  });

  describe('getter delegation', () => {
    const delegate = createMockDelegate();
    const proto = new AgentControllerProto(delegate);

    it('should delegate id', () => {
      assert.strictEqual(proto.id, 'mock-id');
    });

    it('should delegate name', () => {
      assert.strictEqual(proto.name, 'mockProto');
    });

    it('should delegate initType', () => {
      assert.strictEqual(proto.initType, 'SINGLETON');
    });

    it('should delegate accessLevel', () => {
      assert.strictEqual(proto.accessLevel, 'PUBLIC');
    });

    it('should delegate loadUnitId', () => {
      assert.strictEqual(proto.loadUnitId, 'load-unit-1');
    });

    it('should delegate injectObjects', () => {
      assert.deepStrictEqual(proto.injectObjects, [{ refName: 'dep1' }]);
    });

    it('should delegate injectType', () => {
      assert.strictEqual(proto.injectType, 'PROPERTY');
    });

    it('should delegate className', () => {
      assert.strictEqual(proto.className, 'MockClass');
    });

    it('should delegate multiInstanceConstructorIndex', () => {
      assert.strictEqual(proto.multiInstanceConstructorIndex, undefined);
    });

    it('should delegate multiInstanceConstructorAttributes', () => {
      assert.strictEqual(proto.multiInstanceConstructorAttributes, undefined);
    });
  });

  describe('method delegation', () => {
    const delegate = createMockDelegate();
    const proto = new AgentControllerProto(delegate);

    it('should delegate getMetaData', () => {
      assert.strictEqual(proto.getMetaData('testKey'), 'testValue');
      assert.strictEqual(proto.getMetaData('unknown'), undefined);
    });

    it('should delegate verifyQualifier', () => {
      assert.strictEqual(proto.verifyQualifier({ attribute: 'valid' } as any), true);
      assert.strictEqual(proto.verifyQualifier({ attribute: 'invalid' } as any), false);
    });

    it('should delegate verifyQualifiers', () => {
      assert.strictEqual(proto.verifyQualifiers([{ attribute: 'valid' }] as any), true);
      assert.strictEqual(proto.verifyQualifiers([{ attribute: 'invalid' }] as any), false);
    });

    it('should delegate getQualifier', () => {
      assert.strictEqual(proto.getQualifier('env'), 'prod');
      assert.strictEqual(proto.getQualifier('missing'), undefined);
    });

    it('should delegate constructEggObject', () => {
      const result = proto.constructEggObject('a', 'b');
      assert.deepStrictEqual(result, { constructed: true, args: ['a', 'b'] });
    });
  });

  describe('static createProto', () => {
    const mockDelegate = createMockDelegate();
    let originalCreator: ReturnType<typeof EggPrototypeCreatorFactory.getPrototypeCreator>;

    beforeAll(() => {
      originalCreator = EggPrototypeCreatorFactory.getPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE);
      EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, () => mockDelegate);
    });

    afterAll(() => {
      if (originalCreator) {
        EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, originalCreator);
      }
    });

    it('should create an AgentControllerProto wrapping the default creator result', () => {
      const ctx = {} as EggPrototypeLifecycleContext;
      const proto = AgentControllerProto.createProto(ctx);
      assert(proto instanceof AgentControllerProto);
      assert.strictEqual(proto.id, mockDelegate.id);
      assert.strictEqual(proto.name, mockDelegate.name);
    });

    it('should throw when default creator is not registered', () => {
      // Temporarily remove the creator
      const saved = EggPrototypeCreatorFactory.getPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE);
      EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, undefined as any);
      // Force the map entry to be deleted so getPrototypeCreator returns undefined
      (EggPrototypeCreatorFactory as any).creatorMap.delete(DEFAULT_PROTO_IMPL_TYPE);

      try {
        assert.throws(
          () => AgentControllerProto.createProto({} as EggPrototypeLifecycleContext),
          /Default prototype creator.*not registered/,
        );
      } finally {
        // Restore
        if (saved) {
          EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, saved);
        }
      }
    });
  });
});
