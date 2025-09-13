const hasOwn = Object.prototype.hasOwnProperty;
const toStr = Object.prototype.toString;

function isPlainObject(obj: unknown) {
  if (!obj || toStr.call(obj) !== '[object Object]') {
    return false;
  }

  const hasOwnConstructor = hasOwn.call(obj, 'constructor');
  const hasIsPrototypeOf =
    obj.constructor &&
    obj.constructor.prototype &&
    hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
  // Not own constructor property must be Object
  if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    return false;
  }

  // Own properties are enumerated firstly, so to speed up,
  // if last one is own, then all properties are own.
  let key: string | undefined;
  for (key in obj) {
    /**/
  }

  return typeof key === 'undefined' || hasOwn.call(obj, key);
}

export function extend<T = Record<string, any>>(
  deepOrTarget?: unknown,
  ...objects: unknown[]
): T {
  // extend(deep, target, obj1, obj2, ...)
  // extend(target, obj1, obj2, ...)
  let target = deepOrTarget as any;
  let i = 0;
  const length = objects.length;
  let deep = false;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
    // extend(deep, target, obj1, obj2, ...)
    deep = target;
    target = objects[0] || {};
    // skip the boolean and the target
    i = 1;
  } else if (
    (typeof target !== 'object' && typeof target !== 'function') ||
    target == null
  ) {
    // extend(null, obj1, obj2, ...)
    target = {};
  }

  for (; i < length; ++i) {
    const options = objects[i] as any;
    // Only deal with non-null/undefined values
    if (options === null || options === undefined) continue;

    // Extend the base object
    for (const name in options) {
      if (name === '__proto__') continue;

      const src = target[name];
      const copy = options[name];

      // Prevent never-ending loop
      if (target === copy) continue;

      // Recurse if we're merging plain objects
      if (deep && copy && isPlainObject(copy)) {
        const clone = src && isPlainObject(src) ? src : {};
        // Never move original objects, clone them
        target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
      } else if (typeof copy !== 'undefined') {
        target[name] = copy;
      }
    }
  }

  // Return the modified object
  return target as T;
}

export default extend;
