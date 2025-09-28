import { test, expect } from 'vitest';

import { formatLocale } from '../src/utils.ts';

test('formatLocale', () => {
  expect(formatLocale('en_US')).toBe('en-us');
  expect(formatLocale('zh_CN')).toBe('zh-cn');
  expect(formatLocale('zh-CN')).toBe('zh-cn');
  expect(formatLocale('zh_Hans_CN')).toBe('zh-hans-cn');
  expect(formatLocale('zh-Hant-CN')).toBe('zh-hant-cn');
});
