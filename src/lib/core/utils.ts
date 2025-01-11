import util from 'node:util';
import {
  isSymbol, isRegExp, isPrimitive,
  isClass, isFunction, isGeneratorFunction, isAsyncFunction,
} from 'is-type-of';

export function convertObject(obj: any, ignore: string | RegExp | (string | RegExp)[] = []) {
  if (!Array.isArray(ignore)) {
    ignore = [ ignore ];
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

export function safeParseURL(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
