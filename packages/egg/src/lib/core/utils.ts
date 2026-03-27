import util from 'node:util';

import { isSymbol, isRegExp, isPrimitive, isClass, isFunction, isGeneratorFunction, isAsyncFunction } from 'is-type-of';

export function convertObject(obj: any, ignore: string | RegExp | (string | RegExp)[] = []): any {
  if (!Array.isArray(ignore)) {
    ignore = [ignore];
  }
  for (const key of Object.keys(obj)) {
    obj[key] = convertValue(key, obj[key], ignore);
  }
  return obj;
}

function convertValue(key: string, value: any, ignore: (string | RegExp)[]) {
  if (value === null || value === undefined) {
    return value;
  }

  let hit = false;
  for (const matchKey of ignore) {
    if (typeof matchKey === 'string' && matchKey === key) {
      hit = true;
      break;
    } else if (isRegExp(matchKey) && matchKey.test(key)) {
      hit = true;
      break;
    }
  }
  if (!hit) {
    if (isSymbol(value) || isRegExp(value) || value instanceof URL) {
      return value.toString();
    }
    if (isPrimitive(value) || Array.isArray(value)) {
      return value;
    }
  }

  // only convert recursively when it's a plain object,
  // o = {}
  if (Object.getPrototypeOf(value) === Object.prototype) {
    return convertObject(value, ignore);
  }

  // support class
  const name = value.name || 'anonymous';
  if (isClass(value)) {
    return `<Class ${name}>`;
  }

  // support generator function
  if (isFunction(value)) {
    if (isGeneratorFunction(value)) return `<GeneratorFunction ${name}>`;
    if (isAsyncFunction(value)) return `<AsyncFunction ${name}>`;
    return `<Function ${name}>`;
  }

  const typeName = value.constructor.name;
  if (typeName) {
    if (Buffer.isBuffer(value) || typeof value === 'string') {
      return `<${typeName} len: ${value.length}>`;
    }
    return `<${typeName}>`;
  }

  return util.format(value);
}

export function safeParseURL(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export interface CreateTransparentProxyOptions<T> {
  /**
   * Factory function to lazily create the real object.
   * Called at most once, on first property access.
   */
  createReal: () => T;
  /**
   * Whether to bind functions from the real object to the real instance.
   * Defaults to true.
   */
  bindFunctions?: boolean;
}

/**
 * Create a Proxy that behaves like the real object, but remains transparent to
 * monkeypatch libraries (e.g. defineProperty-based overrides like egg-mock's `mm()`).
 *
 * - Lazily creates the real object on first access.
 * - Allows overriding properties on the proxy target (overlay) — e.g. via `Object.defineProperty`.
 * - Delegates everything else to the real object.
 *
 * This is used to defer HttpClient construction so plugins can modify
 * `config.httpclient.lookup` after the first access to `app.httpClient` but
 * before any actual HTTP request is made.
 */
export function createTransparentProxy<T extends object>(options: CreateTransparentProxyOptions<T>): T {
  const { createReal, bindFunctions = true } = options;
  if (typeof createReal !== 'function') {
    throw new TypeError('createReal must be a function');
  }

  let real: T | undefined;
  let cachedError: unknown;
  const boundFnCache = new WeakMap<Function, Function>();

  const getReal = (): T => {
    if (real) return real;
    if (cachedError) throw cachedError;
    try {
      return (real = createReal());
    } catch (err) {
      cachedError = err;
      throw err;
    }
  };

  const hasOwn = (obj: object, prop: PropertyKey) => Reflect.getOwnPropertyDescriptor(obj, prop) !== undefined;

  // The overlay target stores defineProperty-based overrides (e.g. from egg-mock's mm()).
  // Mocks live here so mm.restore() can delete them and reveal the real object underneath.
  const overlay = {} as T;

  return new Proxy(overlay, {
    get(target, prop, receiver) {
      const r = getReal();
      // Overlay (defineProperty-based overrides) takes precedence
      if (hasOwn(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const value = Reflect.get(r, prop);
      if (bindFunctions && typeof value === 'function') {
        let bound = boundFnCache.get(value);
        if (!bound) {
          bound = value.bind(r) as Function;
          boundFnCache.set(value, bound);
        }
        return bound;
      }
      return value;
    },

    set(target, prop, value) {
      const r = getReal();
      if (hasOwn(target, prop)) {
        return Reflect.set(target, prop, value);
      }
      return Reflect.set(r, prop, value);
    },

    has(target, prop) {
      return Reflect.has(target, prop) || Reflect.has(getReal(), prop);
    },

    ownKeys(target) {
      return [...new Set([...Reflect.ownKeys(getReal()), ...Reflect.ownKeys(target)])];
    },

    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop) ?? Reflect.getOwnPropertyDescriptor(getReal(), prop);
    },

    deleteProperty(target, prop) {
      if (hasOwn(target, prop)) return Reflect.deleteProperty(target, prop);
      return Reflect.deleteProperty(getReal(), prop);
    },

    getPrototypeOf() {
      return Reflect.getPrototypeOf(getReal());
    },

    defineProperty(target, prop, descriptor) {
      return Reflect.defineProperty(target, prop, descriptor);
    },
  });
}
