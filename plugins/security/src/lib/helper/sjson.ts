import sjs from './sjs.js';

/**
 * escape json
 * for output json in script
 */

function sanitizeKey(obj: any) {
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;
  if (obj === null) return null;
  if (typeof obj === 'boolean') return obj;
  if (typeof obj === 'number') return obj;
  if (Buffer.isBuffer(obj)) return obj.toString();

  for (const k in obj) {
    const escapedK = sjs(k);
    if (escapedK !== k) {
      obj[escapedK] = sanitizeKey(obj[k]);
      obj[k] = undefined;
    } else {
      obj[k] = sanitizeKey(obj[k]);
    }
  }
  return obj;
}

export default function jsonEscape(obj: any) {
  return JSON.stringify(sanitizeKey(obj), (_k, v) => {
    if (typeof v === 'string') {
      return sjs(v);
    }
    return v;
  });
}
