"use strict";

const assert = require("node:assert");
const mm = require("egg-mock");
const utils = require("../../../lib/core/utils");

describe("test/lib/core/utils.test.js", () => {
  describe("convertObject()", () => {
    it("should convert primitive", () => {
      const s = Symbol("symbol");
      const obj = {
        string$: "string",
        number$: 1,
        null$: null,
        undefined$: undefined,
        boolean$: true,
        symbol$: s,
      };
      utils.convertObject(obj);
      assert(obj.string$ === "string");
      assert(obj.number$ === 1);
      assert(obj.null$ === null);
      assert(obj.undefined$ === undefined);
      assert(obj.boolean$ === true);
      assert(obj.symbol$ === "Symbol(symbol)");
    });

    it("should convert regexp", () => {
      const obj = {
        regexp$: /^a$/g,
      };
      utils.convertObject(obj);
      assert(obj.regexp$ === "/^a$/g");
    });

    it("should convert date", () => {
      const obj = {
        date$: new Date(),
      };
      utils.convertObject(obj);
      assert(obj.date$ === "<Date>");
    });

    it("should convert function", () => {
      const obj = {
        function$: function a() {
          console.log(a);
        },
        arrowFunction$: (a) => {
          console.log(a);
        },
        /* eslint object-shorthand: 0 */
        anonymousFunction$: function (a) {
          console.log(a);
        },
        generatorFunction$: function* a(a) {
          console.log(a);
        },
        asyncFunction$: async function a(a) {
          console.log(a);
        },
      };
      utils.convertObject(obj);
      assert(obj.function$ === "<Function a>");
      assert(obj.arrowFunction$ === "<Function arrowFunction$>");
      assert(obj.anonymousFunction$ === "<Function anonymousFunction$>");
      assert(obj.generatorFunction$ === "<GeneratorFunction a>");
      assert(obj.asyncFunction$ === "<AsyncFunction a>");
    });

    it("should convert error", () => {
      class TestError extends Error {}
      const obj = {
        errorClass$: Error,
        errorClassExtend$: TestError,
        error$: new Error("a"),
        errorExtend$: new TestError("a"),
      };
      utils.convertObject(obj);
      assert(obj.errorClass$ === "<Function Error>");
      assert(obj.errorClassExtend$ === "<Class TestError>");
      assert(obj.error$ === "<Error>");
      assert(obj.errorExtend$ === "<TestError>");
    });

    it("should convert class", () => {
      class BaseClass {}
      class Class extends BaseClass {}
      const obj = {
        class$: BaseClass,
        classExtend$: Class,
      };
      utils.convertObject(obj);
      assert(obj.class$ === "<Class BaseClass>");
      assert(obj.classExtend$ === "<Class Class>");
    });

    it("should convert buffer", () => {
      class SlowBuffer extends Buffer {}
      const obj = {
        bufferClass$: Buffer,
        bufferClassExtend$: SlowBuffer,
        buffer$: Buffer.from("123"),
        bufferExtend$: new SlowBuffer("123"),
      };
      utils.convertObject(obj);
      assert(obj.bufferClass$ === "<Function Buffer>");
      assert(obj.bufferClassExtend$ === "<Class SlowBuffer>");
      assert(obj.buffer$ === "<Buffer len: 3>");
      assert(obj.bufferExtend$ === "<Buffer len: 3>");
    });

    it("should convert ignore", () => {
      const s = Symbol("symbol");
      const obj = {
        string$: "string",
        number$: 1,
        null$: null,
        undefined$: undefined,
        boolean$: true,
        symbol$: s,
        regexp$: /^a$/g,
      };
      utils.convertObject(obj, [
        "string$",
        "number$",
        "null$",
        "undefined$",
        "boolean$",
        "symbol$",
        "regexp$",
      ]);
      assert(obj.string$ === "<String len: 6>");
      assert(obj.number$ === "<Number>");
      assert(obj.null$ === null);
      assert(obj.undefined$ === undefined);
      assert(obj.boolean$ === "<Boolean>");
      assert(obj.symbol$ === "<Symbol>");
      assert(obj.regexp$ === "<RegExp>");
    });

    it("should convert a plain recursive object", () => {
      const obj = {
        plainObj: "Plain",
        Id: 1,
        recurisiveObj: {
          value1: "string",
          value2: 1,
          ignoreValue: /^[a-z]/,
        },
      };
      utils.convertObject(obj, ["ignoreValue"]);
      assert(obj.recurisiveObj.value1 === "string");
      assert(obj.recurisiveObj.value2 === 1);
      assert(obj.recurisiveObj.ignoreValue === "<RegExp>");
      assert(obj.plainObj === "Plain");
      assert(obj.Id === 1);
    });

    it("should convert an anonymous class", () => {
      const obj = {
        anonymousClassWithPropName: class {},
        "": class {},
      };
      utils.convertObject(obj);
      assert(obj.anonymousClassWithPropName === "<Class anonymousClassWithPropName>");
      assert(obj[""] === "<Class anonymous>");
    });

    it("should support keyPath", () => {
      const obj = {
        plainObj: "Plain",
        Id: 1,
        recursiveObj: {
          value1: "string",
          value2: 1,
          innerObj: {
            key1: true,
          },
        },
        arr: [
          {
            v1: "str",
          },
        ],
      };
      utils.convertObject(obj, [], ["id", "recursiveObj.value2", "recursiveObj.innerObj", "arr"]);
      assert.deepEqual(obj, {
        plainObj: "Plain",
        Id: 1,
        recursiveObj: {
          value1: "string",
          value2: "<Number>",
          innerObj: "<Object>",
        },
        arr: "<Array>",
      });
    });

    it("should hit key and keyPath simultaneously work", () => {
      const obj = {
        recursiveObj: {
          value1: "string",
          value2: 1,
          innerObj: {
            key1: true,
          },
        },
        arr: [
          {
            v1: "str",
          },
        ],
      };
      utils.convertObject(
        obj,
        ["arr", "value2", "innerObj"],
        ["recursiveObj.value2", "recursiveObj.innerObj", "arr"],
      );
      assert.deepEqual(obj, {
        recursiveObj: {
          value1: "string",
          value2: "<Number>",
          innerObj: "<Object>",
        },
        arr: "<Array>",
      });
    });
  });

  describe("safeParseURL()", () => {
    it("should return null if url invalid", () => {
      assert(utils.safeParseURL("https://eggjs.org%0a.com") === null);
      assert(utils.safeParseURL("/path/for") === null);
    });

    it("should return parsed url", () => {
      assert(utils.safeParseURL("https://eggjs.org").hostname === "eggjs.org");
      assert(utils.safeParseURL("https://eggjs.org!.foo.com").hostname === "eggjs.org!.foo.com");
    });
  });

  describe("createTransparentProxy()", () => {
    afterEach(mm.restore);

    it("should be transparent to defineProperty-based monkeypatch (mm)", async () => {
      let created = 0;

      class RealClient {
        async request() {
          return { status: 200 };
        }
      }

      const proxy = utils.createTransparentProxy({
        createReal() {
          created++;
          return new RealClient();
        },
      });

      mm(proxy, "request", async () => ({ status: 500 }));
      const res1 = await proxy.request();
      assert.equal(res1.status, 500);
      assert.equal(created, 1);

      mm.restore();
      const res2 = await proxy.request();
      assert.equal(res2.status, 200);
      assert.equal(created, 1);

      mm.data(proxy, "request", { status: 500 });

      const res3 = await proxy.request();
      assert.equal(res3.status, 500);
      assert.equal(created, 1);
    });

    it("should bind real methods to real instance", () => {
      class RealClient {
        constructor() {
          this._value = 42;
        }
        getValue() {
          return this._value;
        }
      }

      const proxy = utils.createTransparentProxy({
        createReal() {
          return new RealClient();
        },
        bindFunctions: true,
      });
      assert.equal(proxy.getValue(), 42);

      mm(proxy, "value", 100);
      assert.equal(proxy.value, 100);
      assert.equal(proxy.getValue(), 42);
    });

    it("should merge ownKeys / has / getOwnPropertyDescriptor between target and real", () => {
      class RealClient {
        constructor() {
          this.realProp = "real";
        }
      }

      const proxy = utils.createTransparentProxy({
        createReal() {
          return new RealClient();
        },
      });

      // Define property on proxy target via defineProperty (simulates monkeypatch libs).
      Object.defineProperty(proxy, "mockedProp", {
        value: "mock",
        writable: true,
        enumerable: true,
        configurable: true,
      });

      assert("realProp" in proxy);
      assert("mockedProp" in proxy);

      const keys = Reflect.ownKeys(proxy);
      assert(keys.includes("realProp"));
      assert(keys.includes("mockedProp"));

      const desc = Object.getOwnPropertyDescriptor(proxy, "mockedProp");
      assert(desc);
      assert.equal(desc.value, "mock");
    });

    it("should cache createReal errors and not call createReal again", () => {
      let callCount = 0;
      const proxy = utils.createTransparentProxy({
        createReal() {
          callCount++;
          throw new Error("Creation failed");
        },
      });

      assert.throws(() => proxy.foo, /Creation failed/);
      assert.throws(() => proxy.bar, /Creation failed/);
      assert.throws(() => proxy.baz, /Creation failed/);
      assert.equal(callCount, 1, "createReal should only be called once");
    });

    // Note: apply and construct traps are not supported because the proxy target
    // is an empty object, not a function. These traps only work when the target
    // itself is a function. For the current use case (HttpClient), this is not needed.

    it("should support setPrototypeOf", () => {
      const proto = { custom: "customValue" };
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ foo: "bar" }),
      });

      const result = Object.setPrototypeOf(proxy, proto);
      assert.equal(result, proxy);
      assert.equal(proxy.custom, "customValue");
      assert.equal(Object.getPrototypeOf(proxy), proto);
    });

    it("should support isExtensible and preventExtensions", () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ foo: 1 }),
      });

      assert.equal(Object.isExtensible(proxy), true);

      Object.preventExtensions(proxy);
      assert.equal(Object.isExtensible(proxy), false);

      // Should not be able to add new properties after preventExtensions
      let errorThrown = false;
      try {
        ("use strict");
        proxy.bar = 2;
      } catch {
        errorThrown = true;
      }
      assert(
        errorThrown || proxy.bar === undefined,
        "Should not add property after preventExtensions",
      );
    });

    it("should support deleteProperty on real object", () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ foo: 1, bar: 2 }),
      });

      assert.equal(proxy.foo, 1);
      assert.equal(delete proxy.foo, true);
      assert.equal(proxy.foo, undefined);
      assert(!("foo" in proxy));
    });

    it("should support deleteProperty on mocked property", () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ foo: 1 }),
      });

      mm(proxy, "bar", "mocked");
      assert.equal(proxy.bar, "mocked");

      const deleted = delete proxy.bar;
      assert(deleted);
      assert.equal(proxy.bar, undefined);
    });

    it("should handle property descriptor with getter/setter correctly", () => {
      let internalValue = 10;
      const proxy = utils.createTransparentProxy({
        createReal: () => ({
          get computed() {
            return internalValue * 2;
          },
          set computed(val) {
            internalValue = val / 2;
          },
        }),
      });

      assert.equal(proxy.computed, 20);
      proxy.computed = 100;
      assert.equal(proxy.computed, 100);
      assert.equal(internalValue, 50);
    });

    it("should handle set operation with descriptor on target", () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => ({ foo: 1 }),
      });

      // Define a property with getter/setter on proxy target
      let mockedValue = 100;
      Object.defineProperty(proxy, "bar", {
        get() {
          return mockedValue;
        },
        set(val) {
          mockedValue = val * 2;
        },
        enumerable: true,
        configurable: true,
      });

      assert.equal(proxy.bar, 100);
      proxy.bar = 50;
      assert.equal(proxy.bar, 100); // getter returns mockedValue which is now 100 (50*2)
      assert.equal(mockedValue, 100);
    });

    it("should not create real object until first access", () => {
      let created = false;
      const proxy = utils.createTransparentProxy({
        createReal() {
          created = true;
          return { foo: "bar" };
        },
      });

      assert.equal(created, false, "Should not create until access");
      const value = proxy.foo;
      assert.equal(created, true, "Should create on first access");
      assert.equal(value, "bar");
    });

    it("should work with Symbol properties", () => {
      const sym = Symbol("test");
      const proxy = utils.createTransparentProxy({
        createReal: () => ({
          [sym]: "symbol value",
          regular: "regular value",
        }),
      });

      assert.equal(proxy[sym], "symbol value");
      assert.equal(proxy.regular, "regular value");

      const keys = Reflect.ownKeys(proxy);
      assert(keys.includes(sym));
      assert(keys.includes("regular"));
    });

    it("should handle complex inheritance chain", () => {
      class Base {
        baseMethod() {
          return "base";
        }
      }

      class Derived extends Base {
        derivedMethod() {
          return "derived";
        }
      }

      const proxy = utils.createTransparentProxy({
        createReal: () => new Derived(),
      });

      assert.equal(proxy.baseMethod(), "base");
      assert.equal(proxy.derivedMethod(), "derived");
      assert(proxy instanceof Derived);
      assert(proxy instanceof Base);
    });

    it("should handle array as real object", () => {
      const proxy = utils.createTransparentProxy({
        createReal: () => [1, 2, 3],
      });

      assert.equal(proxy.length, 3);
      assert.equal(proxy[0], 1);
      assert.equal(proxy[1], 2);
      proxy.push(4);
      assert.equal(proxy.length, 4);
      assert.equal(proxy[3], 4);
    });

    it("should work with bindFunctions=false", () => {
      class RealClient {
        constructor() {
          this.value = 42;
        }
        getValue() {
          return this.value;
        }
      }

      const proxy = utils.createTransparentProxy({
        createReal: () => new RealClient(),
        bindFunctions: false,
      });

      // When bindFunctions is false, methods are not automatically bound
      let shouldFail = true;
      try {
        const getValue = proxy.getValue;
        getValue();
        shouldFail = false;
      } catch (error) {
        shouldFail = true;
        assert(error instanceof TypeError);
      }
      assert(shouldFail, "Expected TypeError when calling unbound method");
      assert.equal(proxy.getValue(), 42); // Direct call still works
    });
  });
});
