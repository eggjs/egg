import { strict as assert } from 'node:assert';
import * as utils from '../../../src/lib/core/utils.js';

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
        function$: function a() { console.log(a); },
        arrowFunction$: (a: any) => { console.log(a); },
        /* eslint object-shorthand: 0 */
        anonymousFunction$: function(a: any) { console.log(a); },
        generatorFunction$: function* a(a: any) { console.log(a); },
        asyncFunction$: async function a(a: any) { console.log(a); },
      };
      utils.convertObject(obj);
      assert.equal(obj.function$, '<Function a>');
      assert.equal(obj.arrowFunction$, '<Function arrowFunction$>');
      assert.equal(obj.anonymousFunction$, '<Function anonymousFunction$>');
      assert.equal(obj.generatorFunction$, '<GeneratorFunction a>');
      assert.equal(obj.asyncFunction$, '<AsyncFunction a>');
    });

    it('should convert error', () => {
      class TestError extends Error { }
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
      class BaseClass { }
      class Class extends BaseClass { }
      const obj = {
        class$: BaseClass,
        classExtend$: Class,
      };
      utils.convertObject(obj);
      assert.equal(obj.class$, '<Class BaseClass>');
      assert.equal(obj.classExtend$, '<Class Class>');
    });

    it('should convert buffer', () => {
      class SlowBuffer extends Buffer { }
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
      utils.convertObject(obj, [
        'string$',
        'number$',
        'null$',
        'undefined$',
        'boolean$',
        'symbol$',
        'regexp$',
      ]);
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
      utils.convertObject(obj, [ 'ignoreValue' ]);
      assert.equal(obj.recurisiveObj.value1, 'string');
      assert.equal(obj.recurisiveObj.value2, 1);
      assert.equal(obj.recurisiveObj.ignoreValue, '<RegExp>');
      assert.equal(obj.plainObj, 'Plain');
      assert.equal(obj.Id, 1);
    });

    it('should convert an anonymous class', () => {
      const obj = {
        anonymousClassWithPropName: class { },
        '': class { },
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
});
