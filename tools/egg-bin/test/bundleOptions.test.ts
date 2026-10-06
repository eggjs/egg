import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getBundleFrameworkSpecifier, getBundleMode, parsePackAliases } from '../src/bundleOptions.ts';
import { getFixtures } from './helper.ts';

describe('test/bundleOptions.test.ts', () => {
  describe('getBundleMode', () => {
    it('accepts production and development', () => {
      expect(getBundleMode('production')).toBe('production');
      expect(getBundleMode('development')).toBe('development');
    });

    it('throws on an unsupported mode', () => {
      expect(() => getBundleMode('staging')).toThrow('Unsupported bundle mode: staging');
    });
  });

  describe('parsePackAliases', () => {
    it('returns undefined for an empty list', () => {
      expect(parsePackAliases([], '/base')).toBeUndefined();
    });

    it('resolves dot-relative targets from baseDir and keeps bare specifiers', () => {
      expect(parsePackAliases(['a=./x/y.js', 'b=pkg'], '/base')).toEqual({
        a: path.resolve('/base', './x/y.js'),
        b: 'pkg',
      });
    });

    it('throws on a malformed alias', () => {
      expect(() => parsePackAliases(['noequals'], '/base')).toThrow('Invalid --pack-alias value: noequals');
      expect(() => parsePackAliases(['=missingspec'], '/base')).toThrow('Invalid --pack-alias value');
      expect(() => parsePackAliases(['trailing='], '/base')).toThrow('Invalid --pack-alias value');
    });
  });

  describe('getBundleFrameworkSpecifier', () => {
    it('returns the explicit framework as-is', async () => {
      await expect(getBundleFrameworkSpecifier('/base', '@my-org/framework')).resolves.toBe('@my-org/framework');
    });

    it('reads egg.framework from package.json when no explicit value is given', async () => {
      const baseDir = getFixtures('demo-app');
      await expect(getBundleFrameworkSpecifier(baseDir)).resolves.toBe('aliyun-egg');
    });
  });
});
