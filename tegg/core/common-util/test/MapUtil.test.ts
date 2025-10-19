import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { MapUtil } from '../src/index.js';

describe('test/MapUtil.test.ts', () => {
  it('should set value if key not exists', () => {
    const map = new Map();
    const key = 'test_key';
    const val = 'test_val';
    const getVal = MapUtil.getOrStore(map, key, val);
    assert(getVal === val);
    assert(map.has(key));
  });

  it('should not set value if key exits', () => {
    const map = new Map();
    const key = 'test_key';
    const val = 'test_val';
    map.set(key, val);
    const initVal = 'test_val2333';
    const getVal = MapUtil.getOrStore(map, key, initVal);
    assert(initVal !== getVal);
    assert(getVal === val);
  });
});
