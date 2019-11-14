'use strict';

const assert = require('assert');
const utils = require('../../../lib/core/utils');

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
      utils.convertObject(obj);
      assert(obj.string$ === 'string');
      assert(obj.number$ === 1);
      assert(obj.null$ === null);
      assert(obj.undefined$ === undefined);
      assert(obj.boolean$ === true);
      assert(obj.symbol$ === 'Symbol(symbol)');
    });

    it('should convert regexp', () => {
      const obj = {
        regexp$: /^a$/g,
      };
      utils.convertObject(obj);
      assert(obj.regexp$ === '/^a$/g');
    });

    it('should convert date', () => {
      const obj = {
        date$: new Date(),
      };
      utils.convertObject(obj);
      assert(obj.date$ === '<Date>');
    });

    it('should convert function', () => {
      const obj = {
        function$: function a() { console.log(a); },
        arrowFunction$: a => { console.log(a); },
        /* eslint object-shorthand: 0 */
        anonymousFunction$: function(a) { console.log(a); },
        generatorFunction$: function* a(a) { console.log(a); },
        asyncFunction$: async function a(a) { console.log(a); },
      };
      utils.convertObject(obj);
      assert(obj.function$ === '<Function a>');
      assert(obj.arrowFunction$ === '<Function arrowFunction$>');
      assert(obj.anonymousFunction$ === '<Function anonymousFunction$>');
      assert(obj.generatorFunction$ === '<GeneratorFunction a>');
      assert(obj.asyncFunction$ === '<AsyncFunction a>');
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
      assert(obj.errorClass$ === '<Function Error>');
      assert(obj.errorClassExtend$ === '<Class TestError>');
      assert(obj.error$ === '<Error>');
      assert(obj.errorExtend$ === '<TestError>');
    });

    it('should convert class', () => {
      class BaseClass { }
      class Class extends BaseClass { }
      const obj = {
        class$: BaseClass,
        classExtend$: Class,
      };
      utils.convertObject(obj);
      assert(obj.class$ === '<Class BaseClass>');
      assert(obj.classExtend$ === '<Class Class>');
    });

    it('should convert buffer', () => {
      class SlowBuffer extends Buffer { }
      const obj = {
        bufferClass$: Buffer,
        bufferClassExtend$: SlowBuffer,
        buffer$: Buffer.from('123'),
        bufferExtend$: new SlowBuffer('123'),
      };
      utils.convertObject(obj);
      assert(obj.bufferClass$ === '<Function Buffer>');
      assert(obj.bufferClassExtend$ === '<Class SlowBuffer>');
      assert(obj.buffer$ === '<Buffer len: 3>');
      assert(obj.bufferExtend$ === '<Buffer len: 3>');
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
      assert(obj.string$ === '<String len: 6>');
      assert(obj.number$ === '<Number>');
      assert(obj.null$ === null);
      assert(obj.undefined$ === undefined);
      assert(obj.boolean$ === '<Boolean>');
      assert(obj.symbol$ === '<Symbol>');
    });
  });

  describe('safeParseURL()', () => {
    it('should return null if url invalid', () => {
      assert(utils.safeParseURL('https://eggjs.org%0a.com') === null);
      assert(utils.safeParseURL('/path/for') === null);
    });

    it('should return parsed url', () => {
      assert(utils.safeParseURL('https://eggjs.org').hostname === 'eggjs.org');
      assert(utils.safeParseURL('https://eggjs.org!.foo.com').hostname === 'eggjs.org!.foo.com');
    });
  });
});
