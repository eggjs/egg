'use strict';

const util = require('util');
const is = require('is-type-of');

module.exports = {
  convertObject,
};

function convertObject(obj, ignore) {
  if (!is.array(ignore)) ignore = [ ignore ];
  for (const key of Object.keys(obj)) {
    obj[key] = convertValue(key, obj[key], ignore);
  }
  return obj;
}

function convertValue(key, value, ignore) {
  if (is.nullOrUndefined(value)) return value;

  let hit;
  for (const matchKey of ignore) {
    if (is.string(matchKey) && matchKey === key) {
      hit = true;
    } else if (is.regExp(matchKey) && matchKey.test(key)) {
      hit = true;
    }
  }
  if (!hit) {
    if (is.symbol(value) || is.regExp(value)) return value.toString();
    if (is.primitive(value)) return value;
    if (is.array(value)) return value;
  }

  // only convert recursively when it's a plain object,
  // o = {}
  if (Object.getPrototypeOf(value) === Object.prototype) {
    return convertObject(value, ignore);
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
