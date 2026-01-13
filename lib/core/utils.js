'use strict';

const util = require('util');
const is = require('is-type-of');
const URL = require('url').URL;

module.exports = {
  convertObject,
  safeParseURL,
  createTransparentProxy,
};

function convertObject(obj, ignore, ignoreKeyPaths) {
  if (!is.array(ignore)) {
    ignore = [ ignore ];
  }
  if (!is.array(ignoreKeyPaths)) {
    ignoreKeyPaths = ignoreKeyPaths ? [ ignoreKeyPaths ] : [];
  }
  _convertObject(obj, ignore, ignoreKeyPaths, '');
}

function _convertObject(obj, ignore, ignoreKeyPaths, keyPath) {
  for (const key of Object.keys(obj)) {
    obj[key] = convertValue(key, obj[key], ignore, ignoreKeyPaths, keyPath ? `${keyPath}.${key}` : key);
  }
  return obj;
}

function convertValue(key, value, ignore, ignoreKeyPaths, keyPath) {
  if (is.nullOrUndefined(value)) return value;

  let hit = false;
  let hitKeyPath = false;
  for (const matchKey of ignore) {
    if (is.string(matchKey) && matchKey === key) {
      hit = true;
      break;
    } else if (is.regExp(matchKey) && matchKey.test(key)) {
      hit = true;
      break;
    }
  }
  for (const matchKeyPath of ignoreKeyPaths) {
    if (is.string(matchKeyPath) && keyPath === matchKeyPath) {
      hitKeyPath = true;
      break;
    }
  }
  if (!hit && !hitKeyPath) {
    if (is.symbol(value) || is.regExp(value)) return value.toString();
    if (is.primitive(value) || is.array(value)) return value;
  }

  // only convert recursively when it's a plain object,
  // o = {}
  if (Object.getPrototypeOf(value) === Object.prototype) {
    if (hitKeyPath) {
      return '<Object>';
    }
    return _convertObject(value, ignore, ignoreKeyPaths, keyPath);
  }

  // support class
  const name = value.name || 'anonymous';
  if (is.class(value)) {
    return `<Class ${name}>`;
  }

  // support generator function
  if (is.function(value)) {
    if (is.generatorFunction(value)) return `<GeneratorFunction ${name}>`;
    if (is.asyncFunction(value)) return `<AsyncFunction ${name}>`;
    return `<Function ${name}>`;
  }

  const typeName = value.constructor.name;
  if (typeName) {
    if (is.buffer(value) || is.string(value)) return `<${typeName} len: ${value.length}>`;
    return `<${typeName}>`;
  }

  /* istanbul ignore next */
  return util.format(value);
}

function safeParseURL(url) {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
}

/**
 * Create a Proxy that behaves like the real object, but remains transparent to
 * monkeypatch libraries (e.g. defineProperty-based overrides).
 *
 * - Lazily creates the real object on first access.
 * - Allows overriding properties on the proxy target (overlay) to take effect.
 * - Delegates everything else to the real object.
 *
 * @param {Object} options
 * @param {Function} options.createReal Create the real object (lazy)
 * @param {boolean} [options.bindFunctions=true] Bind real methods to the real object
 * @return {Proxy}
 */
function createTransparentProxy({ createReal, bindFunctions = true }) {
  if (typeof createReal !== 'function') {
    throw new TypeError('createReal must be a function');
  }

  let real = null;
  let error = null;
  let initialized = false;

  const init = () => {
    if (initialized) {
      if (error) throw error;
      return;
    }
    initialized = true;
    try {
      real = createReal();
    } catch (err) {
      error = err;
      throw err;
    }
  };

  return new Proxy({}, {
    get(target, prop, receiver) {
      init();
      // Check if property is defined on proxy target (monkeypatch overlay)
      if (Object.getOwnPropertyDescriptor(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const value = real[prop];
      if (bindFunctions && typeof value === 'function') {
        return value.bind(real);
      }
      return value;
    },

    set(target, prop, value, receiver) {
      init();
      if (Object.getOwnPropertyDescriptor(target, prop)) {
        return Reflect.set(target, prop, value, receiver);
      }
      return Reflect.set(real, prop, value);
    },

    has(target, prop) {
      init();
      return prop in target || prop in real;
    },

    ownKeys(target) {
      init();
      const keys = new Set([ ...Reflect.ownKeys(real), ...Reflect.ownKeys(target) ]);
      return Array.from(keys);
    },

    getOwnPropertyDescriptor(target, prop) {
      init();
      return Object.getOwnPropertyDescriptor(target, prop)
        || Object.getOwnPropertyDescriptor(real, prop);
    },

    deleteProperty(target, prop) {
      init();
      if (Object.getOwnPropertyDescriptor(target, prop)) {
        return delete target[prop];
      }
      return delete real[prop];
    },

    getPrototypeOf() {
      init();
      return Object.getPrototypeOf(real);
    },

    setPrototypeOf(_target, proto) {
      init();
      return Reflect.setPrototypeOf(real, proto);
    },

    isExtensible() {
      init();
      return Reflect.isExtensible(real);
    },

    preventExtensions(target) {
      init();
      // Must also prevent extensions on target to satisfy Proxy invariants
      const result = Reflect.preventExtensions(real);
      if (result) {
        Reflect.preventExtensions(target);
      }
      return result;
    },

    defineProperty(target, prop, descriptor) {
      // Used by monkeypatch libs: keep overrides on proxy target (overlay layer).
      return Reflect.defineProperty(target, prop, descriptor);
    },
  });
}
