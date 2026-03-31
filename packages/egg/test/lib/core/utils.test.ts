import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import * as utils from '../../../src/lib/core/utils.ts';

describe('test/lib/core/utils.test.js', () => {
  describe('convertObject()', () => {
    it('should convert primitive', () => {
      const s = Symbol('symbol');
      const obj = {
        string$: 'string',
        number$: 1,
        null$: null,
        undefined$: undefined,
        boolean$: true,
        symbol$: s,
      };
      utils.convertObject(obj, []);
      assert(obj.string$ === 'string');
      assert(obj.number$ === 1);
      assert(obj.null$ === null);
      assert(obj.undefined$ === undefined);
      assert(obj.boolean$ === true);
      assert.equal(obj.symbol$, 'Symbol(symbol)');
    });

    it('should convert regexp', () => {
      const obj = {
        regexp$: /^a$/g,
      };
      utils.convertObject(obj, []);
      assert.equal(obj.regexp$, '/^a$/g');
    });

    it('should convert date', () => {
      const obj = {
        date$: new Date(),
      };
      utils.convertObject(obj, []);
      assert.equal(obj.date$, '<Date>');
    });

    it('should convert function', () => {
      const obj = {
        function$: function a() {
          console.log(a);
        },
        arrowFunction$: (a: any) => {
          console.log(a);
        },
        anonymousFunction$: function (a: any) {
          console.log(a);
        },
        // oxlint-disable-next-line require-yield
        generatorFunction$: function* a(a: any) {
          console.log(a);
        },
        asyncFunction$: async function a(a: any) {
          console.log(a);
        },
      };
      utils.convertObject(obj);
      assert.equal(obj.function$, '<Function a>');
      assert.equal(obj.arrowFunction$, '<Function arrowFunction$>');
      assert.equal(obj.anonymousFunction$, '<Function anonymousFunction$>');
      assert.equal(obj.generatorFunction$, '<GeneratorFunction a>');
      assert.equal(obj.asyncFunction$, '<AsyncFunction a>');
    });

    it('should convert error', () => {
      class TestError extends Error {}
      const obj = {
        errorClass$: Error,
        errorClassExtend$: TestError,
        error$: new Error('a'),
        errorExtend$: new TestError('a'),
      };
      utils.convertObject(obj);
      assert.equal(obj.errorClass$, '<Function Error>');
      assert.equal(obj.errorClassExtend$, '<Class TestError>');
      assert.equal(obj.error$, '<Error>');
      assert.equal(obj.errorExtend$, '<TestError>');
    });

    it('should convert class', () => {
      class BaseClass {}
      class Class extends BaseClass {}
      const obj = {
        class$: BaseClass,
        classExtend$: Class,
      };
      utils.convertObject(obj);
      assert.equal(obj.class$, '<Class BaseClass>');
      assert.equal(obj.classExtend$, '<Class Class>');
    });

    it('should convert buffer', () => {
      class SlowBuffer extends Buffer {}
      const obj = {
        bufferClass$: Buffer,
        bufferClassExtend$: SlowBuffer,
        buffer$: Buffer.from('123'),
        bufferExtend$: SlowBuffer.from('123'),
      };
      utils.convertObject(obj);
      assert.equal(obj.bufferClass$, '<Function Buffer>');
      assert.equal(obj.bufferClassExtend$, '<Class SlowBuffer>');
      assert.equal(obj.buffer$, '<Buffer len: 3>');
      assert.equal(obj.bufferExtend$, '<Buffer len: 3>');
    });

    it('should convert ignore', () => {
      const s = Symbol('symbol');
      const obj = {
        string$: 'string',
        number$: 1,
        null$: null,
        undefined$: undefined,
        boolean$: true,
        symbol$: s,
        regexp$: /^a$/g,
      };
      utils.convertObject(obj, ['string$', 'number$', 'null$', 'undefined$', 'boolean$', 'symbol$', 'regexp$']);
      assert.equal(obj.string$, '<String len: 6>');
      assert.equal(obj.number$, '<Number>');
      assert.equal(obj.null$, null);
      assert.equal(obj.undefined$, undefined);
      assert.equal(obj.boolean$, '<Boolean>');
      assert.equal(obj.symbol$, '<Symbol>');
      assert.equal(obj.regexp$, '<RegExp>');
    });

    it('should convert a plain recursive object', () => {
      const obj = {
        plainObj: 'Plain',
        Id: 1,
        recurisiveObj: {
          value1: 'string',
          value2: 1,
          ignoreValue: /^[a-z]/,
        },
      };
      utils.convertObject(obj, ['ignoreValue']);
      assert.equal(obj.recurisiveObj.value1, 'string');
      assert.equal(obj.recurisiveObj.value2, 1);
      assert.equal(obj.recurisiveObj.ignoreValue, '<RegExp>');
      assert.equal(obj.plainObj, 'Plain');
      assert.equal(obj.Id, 1);
    });

    it('should convert an anonymous class', () => {
      const obj = {
        anonymousClassWithPropName: class {},
        '': class {},
      };
      utils.convertObject(obj);
      assert.equal(obj.anonymousClassWithPropName, '<Class anonymousClassWithPropName>');
      assert.equal(obj[''], '<Class anonymous>');
    });
  });

  describe('safeParseURL()', () => {
    it('should return null if url invalid', () => {
      assert.equal(utils.safeParseURL('https://eggjs.org%0a.com'), null);
      assert.equal(utils.safeParseURL('/path/for'), null);
    });

    it('should return parsed url', () => {
      assert.equal(utils.safeParseURL('https://eggjs.org')!.hostname, 'eggjs.org');
      assert.equal(utils.safeParseURL('https://eggjs.org!.foo.com')!.hostname, 'eggjs.org!.foo.com');
    });
  });

  describe('createTransparentProxy()', () => {
    it('should throw if createReal is not a function', () => {
      assert.throws(() => {
        utils.createTransparentProxy({ createReal: null as any });
      }, /createReal must be a function/);
    });

    it('should lazily create the real object', () => {
      let created = false;
      const proxy = utils.createTransparentProxy({
        createReal() {
          created = true;
          return { foo: 'bar' };
        },
      });
      assert.equal(created, false);
      assert.equal((proxy as any).foo, 'bar');
      assert.equal(created, true);
    });

    it('should only call createReal once', () => {
      let callCount = 0;
      const proxy = utils.createTransparentProxy({
        createReal() {
          callCount++;
          return { value: 42 };
        },
      });
      (proxy as any).value;
      (proxy as any).value;
      (proxy as any).value;
      assert.equal(callCount, 1);
    });

    it('should cache createReal errors', () => {
      let callCount = 0;
      const proxy = utils.createTransparentProxy({
        createReal() {
          callCount++;
          throw new Error('init failed');
        },
      });
      assert.throws(() => (proxy as any).foo, /init failed/);
      assert.throws(() => (proxy as any).foo, /init failed/);
      assert.equal(callCount, 1);
    });

    it('should support get/set/has/ownKeys/delete/getPrototypeOf', () => {
      class MyClass {
        name = 'test';
        count = 0;
        greet() {
          return `hello ${this.name}`;
        }
      }
      const proxy = utils.createTransparentProxy<MyClass>({
        createReal: () => new MyClass(),
      });

      // get
      assert.equal(proxy.name, 'test');
      assert.equal(proxy.greet(), 'hello test');

      // set
      proxy.count = 5;
      assert.equal(proxy.count, 5);

      // has
      assert('name' in proxy);
      assert('greet' in proxy);

      // ownKeys
      const keys = Object.keys(proxy);
      assert(keys.includes('name'));
      assert(keys.includes('count'));

      // getPrototypeOf / instanceof
      assert(Object.getPrototypeOf(proxy) === MyClass.prototype);
      // Note: instanceof won't work with Proxy by default since the target is {},
      // but getPrototypeOf returns the correct prototype

      // delete
      assert.equal(delete (proxy as any).count, true);
      assert.equal(proxy.count, undefined);
    });

    it('should be transparent to defineProperty-based monkeypatch (egg-mock mm)', () => {
      const real = {
        request(url: string) {
          return `real:${url}`;
        },
      };
      const proxy = utils.createTransparentProxy({
        createReal: () => real,
      });

      // Before mock
      assert.equal((proxy as any).request('/api'), 'real:/api');

      // Simulate mm() — uses Object.defineProperty to override
      const originalDescriptor = Object.getOwnPropertyDescriptor(proxy, 'request');
      Object.defineProperty(proxy, 'request', {
        value: (url: string) => `mock:${url}`,
        configurable: true,
        writable: true,
      });
      assert.equal((proxy as any).request('/api'), 'mock:/api');

      // Simulate mm.restore() — deletes the overlay property
      if (originalDescriptor) {
        Object.defineProperty(proxy, 'request', originalDescriptor);
      } else {
        delete (proxy as any).request;
      }
      assert.equal((proxy as any).request('/api'), 'real:/api');
    });

    it('should bind real methods to real instance by default', () => {
      class Counter {
        #count = 0;
        increment() {
          this.#count++;
        }
        getCount() {
          return this.#count;
        }
      }
      const proxy = utils.createTransparentProxy<Counter>({
        createReal: () => new Counter(),
      });

      // Methods should be bound to the real object, so private fields work
      const { increment, getCount } = proxy;
      increment();
      increment();
      assert.equal(getCount(), 2);
    });

    it('should not bind functions when bindFunctions=false', () => {
      const obj = {
        getValue() {
          return this;
        },
      };
      const proxy = utils.createTransparentProxy({
        createReal: () => obj,
        bindFunctions: false,
      });

      // Without binding, `this` won't be the real object when destructured
      const fn = (proxy as any).getValue;
      assert.notEqual(fn(), obj);
    });

    it('should support Symbol properties', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'symbol-value', normal: 'value' };
      const proxy = utils.createTransparentProxy({
        createReal: () => obj,
      });

      assert.equal((proxy as any)[sym], 'symbol-value');
      assert(sym in proxy);
    });

    it('should merge ownKeys from overlay and real object', () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ a: 1, b: 2 }),
      });

      // Add an overlay property
      Object.defineProperty(proxy, 'c', {
        value: 3,
        configurable: true,
        enumerable: true,
      });

      const keys = Object.keys(proxy);
      assert(keys.includes('a'));
      assert(keys.includes('b'));
      assert(keys.includes('c'));
    });

    it('should return stable function references via boundFnCache', () => {
      class Svc {
        run() {
          return 'ok';
        }
      }
      const proxy = utils.createTransparentProxy<Svc>({
        createReal: () => new Svc(),
      });

      const ref1 = proxy.run;
      const ref2 = proxy.run;
      assert.equal(ref1, ref2, 'bound function reference should be stable');
      assert.equal(ref1(), 'ok');
    });

    it('should support property descriptor with getter/setter', () => {
      let _value = 10;
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ plain: 'hello' }),
      });

      // Define a property with getter/setter on overlay
      Object.defineProperty(proxy, 'computed', {
        get: () => _value * 2,
        set: (v) => {
          _value = v;
        },
        configurable: true,
        enumerable: true,
      });

      assert.equal((proxy as any).computed, 20);
      (proxy as any).computed = 5;
      assert.equal((proxy as any).computed, 10);
    });

    it('should work with array as real object', () => {
      const proxy = utils.createTransparentProxy<number[]>({
        createReal: () => [1, 2, 3],
      });

      assert.equal(proxy.length, 3);
      assert.equal(proxy[0], 1);
      proxy.push(4);
      assert.equal(proxy.length, 4);
      assert.deepEqual(Array.from(proxy), [1, 2, 3, 4]);
    });

    it('should support complex inheritance chain', () => {
      class Base {
        baseMethod() {
          return 'base';
        }
      }
      class Child extends Base {
        childMethod() {
          return 'child';
        }
      }
      const proxy = utils.createTransparentProxy<Child>({
        createReal: () => new Child(),
      });

      assert.equal(proxy.baseMethod(), 'base');
      assert.equal(proxy.childMethod(), 'child');
      assert.equal(Object.getPrototypeOf(proxy), Child.prototype);
    });

    it('should delete overlay property before real property', () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ key: 'real' }),
      });

      // Define overlay
      Object.defineProperty(proxy, 'key', {
        value: 'overlay',
        configurable: true,
        writable: true,
      });
      assert.equal((proxy as any).key, 'overlay');

      // Delete overlay — should reveal real
      delete (proxy as any).key;
      assert.equal((proxy as any).key, 'real');
    });
  });
});
