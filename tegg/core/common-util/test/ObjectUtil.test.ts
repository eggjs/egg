import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import { ObjectUtils } from '../src/index.js';

export function InitTypeQualifier() {
  return function (_target: any, _propertyKey?: PropertyKey, _parameterIndex?: number): void {
    console.log(_target, _propertyKey, _parameterIndex);
    // ...
  };
}

export function ModuleQualifier(_foo: string) {
  return function (_target: any, _propertyKey?: PropertyKey, _parameterIndex?: number): void {
    console.log(_target, _propertyKey, _parameterIndex, _foo);
    // ...
  };
}

export function Inject(_arg?: any) {
  return function (_target: any, _propertyKey?: PropertyKey, _parameterIndex?: number): void {
    console.log(_target, _propertyKey, _parameterIndex, _arg);
    // ...
  };
}

describe('test/ObjectUtil.test.ts', () => {
  it('should work', () => {
    function mockFunction(/* test */ ctx: object, foo: string, bar = '233') {
      // test
      console.log(ctx, foo, bar);
    }

    const argNames = ObjectUtils.getFunctionArgNameList(mockFunction);
    assert.deepStrictEqual(argNames, ['ctx', 'foo', 'bar']);
  });

  it('getConstructorArgNameList should work', () => {
    class ConstructorObject {
      constructor(
        // @ts-expect-error: readonly property in constructor
        @InitTypeQualifier()
        @ModuleQualifier('foo')
        @Inject({ name: 'fooCache' })
        readonly xCache: any, // fpp...
        // @ts-expect-error: readonly property in constructor
        /* test */ @Inject() readonly cache: unknown,
        // @ts-expect-error: readonly property in constructor
        readonly v233 = 666,
      ) {}
    }

    const argNames = ObjectUtils.getConstructorArgNameList(ConstructorObject);
    assert.deepStrictEqual(argNames, ['xCache', 'cache', 'v233']);
  });
});
