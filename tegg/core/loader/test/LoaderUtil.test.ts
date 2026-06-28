import assert from 'node:assert/strict';

import { afterEach, beforeEach, describe, it } from 'vitest';

import { LoaderUtil } from '../src/index.ts';

const nodeMajorVersion = parseInt(process.versions.node.split('.', 1)[0], 10);

describe('core/loader/test/LoaderUtil.test.ts', () => {
  let originalVitest: string | undefined;
  let originalTsEnable: string | undefined;

  beforeEach(() => {
    originalVitest = process.env.VITEST;
    originalTsEnable = process.env.EGG_TS_ENABLE;
  });

  afterEach(() => {
    restore('VITEST', originalVitest);
    restore('EGG_TS_ENABLE', originalTsEnable);
  });

  function restore(key: string, value: string | undefined) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  describe('supportExtensions()', () => {
    it('should not include TypeScript extensions when EGG_TS_ENABLE=false', () => {
      process.env.EGG_TS_ENABLE = 'false';
      const extensions = LoaderUtil.supportExtensions();
      assert(!extensions.includes('.ts'));
      assert(!extensions.includes('.mts'));
      assert(!extensions.includes('.cts'));
    });

    it.skipIf(nodeMajorVersion < 22)('should include .ts/.mts/.cts by default on Node >= 22', () => {
      // Clear the explicit enable flags so the result depends on Node version.
      delete process.env.VITEST;
      delete process.env.EGG_TS_ENABLE;
      const extensions = LoaderUtil.supportExtensions();
      assert(extensions.includes('.ts'));
      assert(extensions.includes('.mts'));
      assert(extensions.includes('.cts'));
    });
  });
});
