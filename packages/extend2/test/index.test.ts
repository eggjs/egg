import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';
import extend from '../src/index.js';

const str = 'me a test';
const integer = 10;
const arr = [1, 'what', new Date(81, 8, 4)];
const date = new Date(81, 4, 13);

class Foo {}

const obj = {
  str,
  integer,
  arr,
  date,
  constructor: 'fake',
  isPrototypeOf: 'not a function',
  foo: new Foo(),
};

const deep = {
  ori: obj,
  layer: {
    integer: 10,
    str: 'str',
    date: new Date(84, 5, 12),
    arr: [101, 'dude', new Date(82, 10, 4)],
    deep: {
      str: obj.str,
      integer,
      arr: obj.arr,
      date: new Date(81, 7, 4),
    },
  },
};

describe('test/index.test.ts', () => {
  it('missing arguments', () => {
    assert.deepEqual(extend(undefined, { a: 1 }), { a: 1 }, 'missing first argument is second argument');
    assert.deepEqual(extend({ a: 1 }), { a: 1 }, 'missing second argument is first argument');
    assert.deepEqual(extend(true, undefined, { a: 1 }), { a: 1 }, 'deep: missing first argument is second argument');
    assert.deepEqual(extend(true, { a: 1 }), { a: 1 }, 'deep: missing second argument is first argument');
    assert.deepEqual(extend(), {}, 'no arguments is object');
  });

  it('merge string with string', () => {
    const ori = 'what u gonna say';
    const target = extend(ori, str);
    const expectedTarget = {
      0: 'm',
      1: 'e',
      2: ' ',
      3: 'a',
      4: ' ',
      5: 't',
      6: 'e',
      7: 's',
      8: 't',
    };

    assert.equal(ori, 'what u gonna say', 'original string 1 is unchanged');
    assert.equal(str, 'me a test', 'original string 2 is unchanged');
    assert.deepEqual(target, expectedTarget, 'string + string is merged object form of string');
  });

  it('merge string with number', () => {
    const ori = 'what u gonna say';
    const target = extend(ori, 10);

    assert.equal(ori, 'what u gonna say', 'original string is unchanged');
    assert.deepEqual(target, {}, 'string + number is empty object');
  });

  it('merge string with array', () => {
    const ori = 'what u gonna say';
    const target = extend(ori, arr);

    assert.equal(ori, 'what u gonna say', 'original string is unchanged');
    assert.deepEqual(arr, [1, 'what', new Date(81, 8, 4)], 'array is unchanged');
    assert.deepEqual(
      target,
      {
        0: 1,
        1: 'what',
        2: new Date(81, 8, 4),
      },
      'string + array is array'
    );
  });

  it('merge string with date', () => {
    const ori = 'what u gonna say';
    const target = extend(ori, date);

    const testDate = new Date(81, 4, 13);
    assert.equal(ori, 'what u gonna say', 'original string is unchanged');
    assert.deepEqual(date, testDate, 'date is unchanged');
    assert.equal(target instanceof Date, false);
    assert.deepEqual(target, {}, 'string + date is object');
  });

  it('merge string with obj', () => {
    const ori = 'what u gonna say';
    const target = extend(ori, obj);

    assert.equal(ori, 'what u gonna say', 'original string is unchanged');
    const testObj = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', new Date(81, 8, 4)],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };
    assert.deepEqual(obj, testObj, 'original obj is unchanged');
    assert.deepEqual(target, testObj, 'string + obj is obj');
  });

  it('merge number with string', () => {
    const ori = 20;
    const target = extend(ori, str);

    assert.equal(ori, 20, 'number is unchanged');
    assert.equal(str, 'me a test', 'string is unchanged');
    assert.deepEqual(
      target,
      {
        0: 'm',
        1: 'e',
        2: ' ',
        3: 'a',
        4: ' ',
        5: 't',
        6: 'e',
        7: 's',
        8: 't',
      },
      'number + string is object form of string'
    );
  });

  it('merge number with number', () => {
    assert.deepEqual(extend(20, 10), {}, 'number + number is empty object');
  });

  it('merge number with array', () => {
    const target = extend(20, arr);

    assert.deepEqual(arr, [1, 'what', new Date(81, 8, 4)], 'array is unchanged');
    assert.deepEqual(
      target,
      {
        0: 1,
        1: 'what',
        2: new Date(81, 8, 4),
      },
      'number + arr is object with array contents'
    );
  });

  it('merge number with date', () => {
    const target = extend(20, date);
    const testDate = new Date(81, 4, 13);

    assert.deepEqual(date, testDate, 'original date is unchanged');
    assert.deepEqual(target, {}, 'number + date is object');
  });

  it('merge number with object', () => {
    const target = extend(20, obj);
    const testObj = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', new Date(81, 8, 4)],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };

    assert.deepEqual(obj, testObj, 'obj is unchanged');
    assert.deepEqual(target, testObj, 'number + obj is obj');
  });

  it('merge array with string', () => {
    const ori = [1, 2, 3, 4, 5, 6];
    const target = extend(ori, str);

    assert.deepEqual(ori, str.split(''), 'array is changed to be an array of string chars');
    assert.equal(str, 'me a test', 'string is unchanged');
    assert.equal(target[0], 'm');
    assert.equal(target['0'], 'm');
    assert(Array.isArray(target));
    assert.deepEqual(target, ['m', 'e', ' ', 'a', ' ', 't', 'e', 's', 't']);
  });

  it('merge array with number', () => {
    const ori = [1, 2, 3, 4, 5, 6];
    const target = extend(ori, 10);

    assert.deepEqual(ori, [1, 2, 3, 4, 5, 6], 'array is unchanged');
    assert.deepEqual(target, ori, 'array + number is array');
  });

  it('merge array with array', () => {
    const ori = [1, 2, 3, 4, 5, 6];
    const target = extend(ori, arr);
    const testDate = new Date(81, 8, 4);
    const expectedTarget = [1, 'what', testDate, 4, 5, 6];

    assert.deepEqual(ori, expectedTarget, 'array + array merges arrays; changes first array');
    assert.deepEqual(arr, [1, 'what', testDate], 'second array is unchanged');
    assert.deepEqual(target, expectedTarget, 'array + array is merged array');
  });

  it('merge array with date', () => {
    const ori = [1, 2, 3, 4, 5, 6];
    const target = extend(ori, date);
    const testDate = new Date(81, 4, 13);
    const testArray = [1, 2, 3, 4, 5, 6];

    assert.deepEqual(ori, testArray, 'array is unchanged');
    assert.deepEqual(date, testDate, 'date is unchanged');
    assert.deepEqual(target, testArray, 'array + date is array');
  });

  it('merge array with object', () => {
    const ori: any = [1, 2, 3, 4, 5, 6];
    const target = extend(ori, obj);
    const testObject: any = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', new Date(81, 8, 4)],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };

    assert.deepEqual(obj, testObject, 'obj is unchanged');
    assert.equal(ori.length, 6, 'array has proper length');
    assert.equal(ori.str, obj.str, 'array has obj.str property');
    assert.equal(ori.integer, obj.integer, 'array has obj.integer property');
    assert.deepEqual(ori.arr, obj.arr, 'array has obj.arr property');
    assert.equal(ori.date, obj.date, 'array has obj.date property');

    assert.equal(target.length, 6, 'target has proper length');
    assert.equal(target.str, obj.str, 'target has obj.str property');
    assert.equal(target.integer, obj.integer, 'target has obj.integer property');
    assert.deepEqual(target.arr, obj.arr, 'target has obj.arr property');
    assert.equal(target.date, obj.date, 'target has obj.date property');
  });

  it('merge date with string', () => {
    const ori = new Date(81, 9, 20);
    const target = extend(ori, str);

    assert(ori instanceof Date);
    assert.equal(Reflect.get(ori, '0'), 'm');
    assert.equal(str, 'me a test', 'string is unchanged');
    assert.deepEqual(Reflect.get(target, '0'), 'm');
    assert.equal(target, ori);
  });

  it('merge date with number', () => {
    const ori = new Date(81, 9, 20);
    const target = extend(ori, 10);

    assert(ori instanceof Date);
    assert.equal(target, ori);
  });

  it('merge date with array', () => {
    const ori = new Date(81, 9, 20);
    const target = extend(ori, arr);
    const testDate = new Date(81, 9, 20);
    const testArray = [1, 'what', new Date(81, 8, 4)];

    assert.equal(ori.getTime(), testDate.getTime());
    assert.equal(Reflect.get(ori, '1'), 'what');
    assert.deepEqual(arr, testArray, 'array is unchanged');
    assert.equal(target, ori);
  });

  it('merge date with date', () => {
    const ori = new Date(81, 9, 20);
    const target = extend(ori, date);

    assert.equal(ori, target);
  });

  it('merge date with object', () => {
    const ori = new Date(81, 9, 20);
    const target = extend(ori, obj);
    const testDate = new Date(81, 8, 4);
    const testObject = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', testDate],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };

    assert.deepEqual(obj, testObject, 'original object is unchanged');
    assert.deepEqual(ori, target);
    assert.equal(target.getTime(), ori.getTime());
    assert.equal(Reflect.get(ori, 'str'), 'me a test');
    assert.equal(Reflect.get(target, 'constructor'), 'fake');
  });

  it('merge object with string', () => {
    const testDate = new Date(81, 7, 26);
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: testDate,
    };
    const target = extend(ori, str);
    const testObj = {
      0: 'm',
      1: 'e',
      2: ' ',
      3: 'a',
      4: ' ',
      5: 't',
      6: 'e',
      7: 's',
      8: 't',
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: testDate,
    };

    assert.deepEqual(ori, testObj, 'original object updated');
    assert.equal(str, 'me a test', 'string is unchanged');
    assert.deepEqual(target, testObj, 'object + string is object + object form of string');
  });

  it('merge object with number', () => {
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };
    const testObject = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };
    const target = extend(ori, 10);
    assert.deepEqual(ori, testObject, 'object is unchanged');
    assert.deepEqual(target, testObject, 'object + number is object');
  });

  it('merge object with array', () => {
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };
    const target = extend(ori, arr);
    const testObject = {
      0: 1,
      1: 'what',
      2: new Date(81, 8, 4),
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };

    assert.deepEqual(ori, testObject, 'original object is merged');
    assert.deepEqual(arr, [1, 'what', testObject[2]], 'array is unchanged');
    assert.deepEqual(target, testObject, 'object + array is merged object');
  });

  it('merge object with date', () => {
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };
    const target = extend(ori, date);
    const testObject = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
    };

    assert.deepEqual(ori, testObject, 'original object is unchanged');
    assert.deepEqual(date, new Date(81, 4, 13), 'date is unchanged');
    assert.deepEqual(target, testObject, 'object + date is object');
  });

  it('merge object with object', () => {
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
      foo: 'bar',
    };
    const target = extend(ori, obj);
    const expectedObj = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', new Date(81, 8, 4)],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };
    const expectedTarget = {
      str: 'me a test',
      integer: 10,
      arr: [1, 'what', new Date(81, 8, 4)],
      date: new Date(81, 4, 13),
      constructor: 'fake',
      isPrototypeOf: 'not a function',
      foo: new Foo(),
    };

    assert.deepEqual(obj, expectedObj, 'obj is unchanged');
    assert.deepEqual(ori, expectedTarget, 'original has been merged');
    assert.deepEqual(target, expectedTarget, 'object + object is merged object');
  });

  it('deep clone', () => {
    const ori = {
      str: 'no shit',
      integer: 76,
      arr: [1, 2, 3, 4],
      date: new Date(81, 7, 26),
      layer: { deep: { integer: 42 } },
    };
    const target = extend(true, ori, deep);

    assert.deepEqual(
      ori,
      {
        str: 'no shit',
        integer: 76,
        arr: [1, 2, 3, 4],
        date: new Date(81, 7, 26),
        ori: {
          str: 'me a test',
          integer: 10,
          arr: [1, 'what', new Date(81, 8, 4)],
          date: new Date(81, 4, 13),
          constructor: 'fake',
          isPrototypeOf: 'not a function',
          foo: new Foo(),
        },
        layer: {
          integer: 10,
          str: 'str',
          date: new Date(84, 5, 12),
          arr: [101, 'dude', new Date(82, 10, 4)],
          deep: {
            str: 'me a test',
            integer: 10,
            arr: [1, 'what', new Date(81, 8, 4)],
            date: new Date(81, 7, 4),
          },
        },
      },
      'original object is merged'
    );
    assert.deepEqual(
      deep,
      {
        ori: {
          str: 'me a test',
          integer: 10,
          arr: [1, 'what', new Date(81, 8, 4)],
          date: new Date(81, 4, 13),
          constructor: 'fake',
          isPrototypeOf: 'not a function',
          foo: new Foo(),
        },
        layer: {
          integer: 10,
          str: 'str',
          date: new Date(84, 5, 12),
          arr: [101, 'dude', new Date(82, 10, 4)],
          deep: {
            str: 'me a test',
            integer: 10,
            arr: [1, 'what', new Date(81, 8, 4)],
            date: new Date(81, 7, 4),
          },
        },
      },
      'deep is unchanged'
    );
    assert.deepEqual(
      target,
      {
        str: 'no shit',
        integer: 76,
        arr: [1, 2, 3, 4],
        date: new Date(81, 7, 26),
        ori: {
          str: 'me a test',
          integer: 10,
          arr: [1, 'what', new Date(81, 8, 4)],
          date: new Date(81, 4, 13),
          constructor: 'fake',
          isPrototypeOf: 'not a function',
          foo: new Foo(),
        },
        layer: {
          integer: 10,
          str: 'str',
          date: new Date(84, 5, 12),
          arr: [101, 'dude', new Date(82, 10, 4)],
          deep: {
            str: 'me a test',
            integer: 10,
            arr: [1, 'what', new Date(81, 8, 4)],
            date: new Date(81, 7, 4),
          },
        },
      },
      'deep + object + object is deeply merged object'
    );

    (target.layer as any).deep = 339;
    assert.deepEqual(
      deep,
      {
        ori: {
          str: 'me a test',
          integer: 10,
          arr: [1, 'what', new Date(81, 8, 4)],
          date: new Date(81, 4, 13),
          constructor: 'fake',
          isPrototypeOf: 'not a function',
          foo: new Foo(),
        },
        layer: {
          integer: 10,
          str: 'str',
          date: new Date(84, 5, 12),
          arr: [101, 'dude', new Date(82, 10, 4)],
          deep: {
            str: 'me a test',
            integer: 10,
            arr: [1, 'what', new Date(81, 8, 4)],
            date: new Date(81, 7, 4),
          },
        },
      },
      'deep is unchanged after setting target property'
    );
    // ----- NEVER USE EXTEND WITH THE ABOVE SITUATION ------------------------------
  });

  it('deep clone; arrays are override', () => {
    const defaults = { arr: [1, 2, 3] };
    const override = { arr: ['x'] };
    const expectedTarget = { arr: ['x'] };

    const target = extend(true, defaults, override);

    assert.deepEqual(target, expectedTarget, 'arrays are merged');
  });

  it('deep clone === false; objects merged normally', () => {
    const defaults = { a: 1 };
    const override = { a: 2 };
    const target = extend(false, defaults, override);
    assert.deepEqual(target, override, 'deep === false handled normally');
  });

  it('pass in null; should create a valid object', () => {
    const override = { a: 1 };
    const target = extend(null, override);
    assert.deepEqual(target, override, 'null object handled normally');
  });

  it('works without Array.isArray', () => {
    const savedIsArray = Array.isArray;
    (Array as any).isArray = false; // don't delete, to preserve enumerability
    const target: any[] = [];
    const source = [1, [2], { 3: true }];
    assert.deepEqual(extend(true, target, source), [1, [2], { 3: true }], 'It works without Array.isArray');
    Array.isArray = savedIsArray;
  });

  it('fix __proto__ copy', () => {
    const r = extend(true, {}, JSON.parse('{"__proto__": {"polluted": "yes"}}'));
    assert.deepEqual(JSON.stringify(r), '{}', 'It should not copy __proto__');
    assert.deepEqual(('' as any).polluted, undefined, 'It should not affect object prototype');
  });
});
